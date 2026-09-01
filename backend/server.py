from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, Query, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import logging
import httpx
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional

import statistics
import seed_data
import llm_service
import analytics_engine as ae
import student_engine
import import_utils

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="CONTINUUM API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("continuum")

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
COOKIE = "session_token"


# ---------------------------------------------------------------- data seed
async def ensure_seed(force: bool = False):
    existing = await db.students.count_documents({})
    if existing > 0 and not force:
        return
    data = seed_data.build_all()
    if force:
        for col in ["institution", "departments", "courses", "semesters", "students",
                    "signals", "reviews", "audit_events", "data_sources", "settings",
                    "student_activity"]:
            await db[col].delete_many({})
    await db.institution.insert_one(data["institution"])
    await db.departments.insert_many(data["departments"])
    await db.courses.insert_many(data["courses"])
    await db.semesters.insert_many(data["semesters"])
    await db.students.insert_many(data["students"])
    await db.signals.insert_many(data["signals"])
    if data["reviews"]:
        await db.reviews.insert_many(data["reviews"])
    await db.audit_events.insert_many(data["audit"])
    await db.data_sources.insert_many(data["data_sources"])
    await db.settings.insert_one({"_key": "global", **data["settings"]})
    logger.info("Seeded CONTINUUM dataset: %d students, %d signals",
                len(data["students"]), len(data["signals"]))


@app.on_event("startup")
async def startup():
    await ensure_seed()


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------------------------------------------------------------- auth
async def _create_session(user_id: str) -> str:
    token = uuid.uuid4().hex + uuid.uuid4().hex
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc),
    })
    return token


def _set_cookie(response: Response, token: str):
    response.set_cookie(key=COOKIE, value=token, httponly=True, secure=True,
                        samesite="none", path="/", max_age=7 * 24 * 3600)


async def _upsert_user(email: str, name: str, picture: str, role: str = "reviewer") -> dict:
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
        return {**existing, "name": name, "picture": picture}
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {"user_id": user_id, "email": email, "name": name, "picture": picture,
           "role": role, "institution": "Northbridge University",
           "created_at": datetime.now(timezone.utc)}
    await db.users.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "created_at"}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "created_at": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@api.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    role = "owner" if data["email"] == "senthamizhsarathy@gmail.com" else "reviewer"
    user = await _upsert_user(data["email"], data.get("name") or data["email"],
                              data.get("picture", ""), role)
    token = await _create_session(user["user_id"])
    _set_cookie(response, token)
    return {"user": user}


@api.post("/auth/demo")
async def auth_demo(response: Response):
    user = await _upsert_user("demo@continuum.edu", "Alex Morgan",
                              seed_data._avatar("Alex Morgan"), "reviewer")
    token = await _create_session(user["user_id"])
    _set_cookie(response, token)
    return {"user": user}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


# ---------------------------------------------------------------- helpers
CLEAN = {"_id": 0}


# ---------------------------------------------------------------- overview
@api.get("/overview")
async def overview(user: dict = Depends(get_current_user)):
    inst = await db.institution.find_one({}, CLEAN)
    semesters = await db.semesters.find({}, CLEAN).to_list(10)
    students = await db.students.find({}, {"_id": 0, "deviation_index": 1, "performance": 1}).to_list(500)
    # Behavioral signals over time (population avg deviation per semester)
    series = []
    for i, sem in enumerate(semesters):
        vals = []
        for s in students:
            perf = (s.get("performance") or {}).get("series") or []
            if i >= len(perf) or perf[i] is None:
                continue
            base = sum(perf[:-1]) / max(1, len(perf) - 1) if len(perf) > 1 else perf[0]
            dev = abs(perf[i] - base) / base * 100 if base else 0
            vals.append(min(dev * 1.4, 100))
        avg = round(sum(vals) / len(vals), 1) if vals else 0
        series.append({"semester": sem["label"], "term": sem["term"],
                       "deviation": avg, "high": round(avg + 12, 1)})
    signals = await db.signals.find({}, CLEAN).to_list(1000)
    recent = sorted([s for s in signals if s["status"] in ("New", "Under Review", "Needs Follow-up")],
                    key=lambda x: x.get("detected_iso", ""), reverse=True)[:5]
    # signal distribution
    dist = {}
    for s in signals:
        dist[s["signal_type"]] = dist.get(s["signal_type"], 0) + 1
    distribution = [{"type": k, "count": v} for k, v in sorted(dist.items(), key=lambda x: -x[1])]
    return {"stats": inst["stats"], "signals_over_time": series,
            "recent_signals": recent, "distribution": distribution}


# ---------------------------------------------------------------- students
@api.get("/students")
async def list_students(user: dict = Depends(get_current_user),
                        q: str = "", status: str = "all", program: str = "all",
                        sort: str = "deviation", order: str = "desc",
                        page: int = 1, page_size: int = 12):
    docs = await db.students.find({}, {"_id": 0, "baseline": 0, "writing_features": 0,
                                       "submission_behavior": 0, "semesters": 0}).to_list(500)
    if q:
        ql = q.lower()
        docs = [d for d in docs if ql in d["name"].lower() or ql in d["student_id"].lower()]
    if program != "all":
        docs = [d for d in docs if d["program"] == program]
    if status != "all":
        docs = [d for d in docs if d["band"]["key"] == status]
    keymap = {"deviation": lambda d: d["deviation_index"], "name": lambda d: d["name"],
              "signals": lambda d: d["signal_count"], "year": lambda d: d["year"]}
    docs.sort(key=keymap.get(sort, keymap["deviation"]), reverse=(order == "desc"))
    total = len(docs)
    start = (page - 1) * page_size
    return {"total": total, "page": page, "page_size": page_size,
            "students": docs[start:start + page_size]}


@api.get("/students-stats")
async def students_stats(user: dict = Depends(get_current_user)):
    total = await db.students.count_documents({})
    month_prefix = datetime.now(timezone.utc).strftime("%Y-%m")
    new_month = await db.students.count_documents({"created_at": {"$regex": f"^{month_prefix}"}})
    active = await db.signals.count_documents({"status": {"$in": ["New", "Under Review", "Needs Follow-up"]}})
    require = await db.signals.count_documents({"status": {"$in": ["New", "Needs Follow-up"]}})
    with_signals = len(await db.signals.distinct("student_id"))
    acts = await db.student_activity.find({}, CLEAN).sort("iso", -1).to_list(8)
    return {"total": total, "new_this_month": new_month, "active_signals": active,
            "require_review": require, "with_signals": with_signals, "recent_activity": acts}


@api.get("/students/{student_id}")
async def get_student(student_id: str, user: dict = Depends(get_current_user)):
    s = await db.students.find_one({"id": student_id}, CLEAN)
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    sigs = await db.signals.find({"student_id": student_id}, CLEAN).to_list(50)
    s["signals"] = sorted(sigs, key=lambda x: x.get("detected_iso", ""), reverse=True)
    hist, subs = _student_history(s)
    s["academic_history"] = hist
    s["submissions"] = subs
    s["audit_trail"] = await db.audit_events.find({"student_id": student_id}, CLEAN).sort("iso", -1).to_list(200)
    return s


# ---------------------------------------------------------------- signals
@api.get("/signals")
async def list_signals(user: dict = Depends(get_current_user),
                       q: str = "", severity: str = "all", signal_type: str = "all",
                       course: str = "all", semester: str = "all", status: str = "all"):
    docs = await db.signals.find({}, CLEAN).to_list(1000)
    if q:
        ql = q.lower()
        docs = [d for d in docs if ql in d["student_name"].lower() or ql in d["course_code"].lower()]
    if severity != "all":
        docs = [d for d in docs if d["severity"] == severity]
    if signal_type != "all":
        docs = [d for d in docs if d["signal_type"] == signal_type]
    if course != "all":
        docs = [d for d in docs if d["course_code"] == course]
    if semester != "all":
        docs = [d for d in docs if d["semester"] == semester]
    if status != "all":
        docs = [d for d in docs if d["status"] == status]
    docs.sort(key=lambda x: x["detected_iso"], reverse=True)
    return {"total": len(docs), "signals": docs}


@api.get("/signals/{signal_id}")
async def get_signal(signal_id: str, user: dict = Depends(get_current_user)):
    s = await db.signals.find_one({"id": signal_id}, CLEAN)
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")
    student = await db.students.find_one({"id": s["student_id"]},
                                         {"_id": 0, "baseline": 1, "performance": 1,
                                          "submission_behavior": 1, "writing_features": 1,
                                          "semesters": 1, "status_label": 1, "year": 1})
    s["student_detail"] = student
    return s


@api.post("/signals/{signal_id}/explain")
async def explain_signal(signal_id: str, user: dict = Depends(get_current_user)):
    s = await db.signals.find_one({"id": signal_id}, CLEAN)
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")
    if s.get("explanation") and s.get("explanation_source") == "llm":
        return {"explanation": s["explanation"], "source": "llm"}
    try:
        text = await llm_service.generate_llm_explanation(s)
        source = "llm"
    except Exception as e:
        logger.warning("LLM explanation failed, using deterministic fallback: %s", e)
        text = ae.generate_explanation(s)
        source = "prototype"
    await db.signals.update_one({"id": signal_id},
                                {"$set": {"explanation": text, "explanation_source": source}})
    await _audit(user, "Explanation generated", signal_id,
                 f"Explainable rationale generated for {s['student_name']} ({s['course_code']}).")
    return {"explanation": text, "source": source}


@api.patch("/signals/{signal_id}")
async def update_signal(signal_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    new_status = body.get("status")
    s = await db.signals.find_one({"id": signal_id}, CLEAN)
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")
    await db.signals.update_one({"id": signal_id}, {"$set": {"status": new_status}})
    await _audit(user, "Status changed", signal_id,
                 f"Signal for {s['student_name']} marked {new_status}.")
    return {"ok": True, "status": new_status}


# ---------------------------------------------------------------- reviews
@api.get("/reviews")
async def list_reviews(user: dict = Depends(get_current_user), status: str = "all"):
    docs = await db.reviews.find({}, CLEAN).to_list(500)
    if status != "all":
        docs = [d for d in docs if d["status"] == status]
    return {"total": len(docs), "reviews": docs}


@api.get("/reviews/{review_id}")
async def get_review(review_id: str, user: dict = Depends(get_current_user)):
    r = await db.reviews.find_one({"id": review_id}, CLEAN)
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    r["signal"] = await db.signals.find_one({"id": r["signal_id"]}, CLEAN)
    r["student"] = await db.students.find_one({"id": r["student_id"]}, CLEAN)
    return r


@api.post("/reviews/{review_id}/notes")
async def add_note(review_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    note = {"id": uuid.uuid4().hex[:8], "reviewer": user["name"],
            "timestamp": datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M"),
            "text": body.get("text", "")}
    r = await db.reviews.find_one({"id": review_id}, CLEAN)
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.reviews.update_one({"id": review_id}, {"$push": {"notes": note}})
    await _audit(user, "Note added", review_id,
                 f"Reviewer note added on {r['student_name']} review.")
    return note


ACTION_STATUS = {
    "acknowledge": ("Under Review", "In Progress", "Acknowledged"),
    "expected": ("Dismissed", "Resolved", "Marked as expected behavior"),
    "request_info": ("Needs Follow-up", "Needs Follow-up", "Requested additional information"),
    "escalate": ("Needs Follow-up", "In Progress", "Escalated"),
    "dismiss": ("Dismissed", "Resolved", "Dismissed"),
}


@api.post("/reviews/{review_id}/action")
async def review_action(review_id: str, request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    action = body.get("action")
    if action not in ACTION_STATUS:
        raise HTTPException(status_code=400, detail="Unknown action")
    sig_status, rev_status, label = ACTION_STATUS[action]
    r = await db.reviews.find_one({"id": review_id}, CLEAN)
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.reviews.update_one({"id": review_id}, {"$set": {"status": rev_status}})
    await db.signals.update_one({"id": r["signal_id"]}, {"$set": {"status": sig_status}})
    await _audit(user, label, review_id,
                 f"{label} — {r['student_name']} ({r['course_code']}).")
    return {"ok": True, "review_status": rev_status, "signal_status": sig_status}


# ---------------------------------------------------------------- analytics
@api.get("/analytics")
async def analytics(user: dict = Depends(get_current_user)):
    signals = await db.signals.find({}, CLEAN).to_list(1000)
    semesters = await db.semesters.find({}, CLEAN).to_list(10)
    courses = await db.courses.find({}, CLEAN).to_list(50)
    students = await db.students.find({}, {"_id": 0, "band": 1, "program": 1}).to_list(500)

    by_sem = {s["label"]: 0 for s in semesters}
    for s in signals:
        if s["semester"] in by_sem:
            by_sem[s["semester"]] += 1
    signals_by_semester = [{"semester": k, "signals": v} for k, v in by_sem.items()]

    cats = {}
    for s in signals:
        cats[s["signal_type"]] = cats.get(s["signal_type"], 0) + 1
    categories = [{"type": k, "count": v} for k, v in sorted(cats.items(), key=lambda x: -x[1])]

    band_dist = {}
    for s in students:
        band_dist[s["band"]["label"]] = band_dist.get(s["band"]["label"], 0) + 1
    stability = [{"band": k, "count": v} for k, v in band_dist.items()]

    course_dist = sorted(
        [{"course": c["code"], "signals": c["signals"], "students": c["students"]} for c in courses],
        key=lambda x: -x["signals"])

    risk_trend = []
    for i, s in enumerate(semesters):
        risk_trend.append({"semester": s["label"],
                           "risk": round(8 + i * 4 + (12 if i == 4 else 0), 1),
                           "resolved": round(4 + i * 3, 1)})

    return {"signals_by_semester": signals_by_semester, "categories": categories,
            "stability": stability, "course_distribution": course_dist,
            "risk_trend": risk_trend,
            "intervention_outcomes": [
                {"outcome": "Explained by context", "count": 21},
                {"outcome": "Expected behavior", "count": 14},
                {"outcome": "Under follow-up", "count": 12},
                {"outcome": "Escalated", "count": 4},
            ]}


# ---------------------------------------------------------------- courses
@api.get("/courses")
async def list_courses(user: dict = Depends(get_current_user)):
    return {"courses": await db.courses.find({}, CLEAN).to_list(50)}


@api.get("/courses/{code}")
async def get_course(code: str, user: dict = Depends(get_current_user)):
    c = await db.courses.find_one({"code": code}, CLEAN)
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    sigs = await db.signals.find({"course_code": code}, CLEAN).to_list(200)
    c["signal_list"] = sorted(sigs, key=lambda x: x["detected_iso"], reverse=True)
    seen, roster = set(), []
    for s in sigs:
        if s["student_id"] not in seen:
            seen.add(s["student_id"])
            roster.append({"id": s["student_id"], "name": s["student_name"],
                           "avatar": s["student_avatar"], "deviation_index": s["deviation_index"],
                           "band": s["band"]})
    c["roster"] = roster
    semesters = await db.semesters.find({}, CLEAN).to_list(10)
    c["semester_trends"] = [{"semester": s["label"],
                             "signals": len([x for x in sigs if x["semester"] == s["label"]]),
                             "performance": 72 + i * 2} for i, s in enumerate(semesters)]
    return c


# ---------------------------------------------------------------- data sources
@api.get("/data-sources")
async def data_sources(user: dict = Depends(get_current_user)):
    return {"sources": await db.data_sources.find({}, CLEAN).to_list(20)}


# ---------------------------------------------------------------- audit
@api.get("/audit-log")
async def audit_log(user: dict = Depends(get_current_user), q: str = ""):
    docs = await db.audit_events.find({}, CLEAN).to_list(500)
    if q:
        ql = q.lower()
        docs = [d for d in docs if ql in d["description"].lower() or ql in d["user"].lower()
                or ql in d["entity"].lower()]
    return {"events": docs}


# ---------------------------------------------------------------- settings
@api.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    s = await db.settings.find_one({"_key": "global"}, {"_id": 0, "_key": 0})
    users = await db.users.find({}, {"_id": 0, "created_at": 0}).to_list(50)
    return {**s, "users": users, "sources": await db.data_sources.find({}, CLEAN).to_list(20)}


@api.patch("/settings/thresholds")
async def update_thresholds(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    await db.settings.update_one({"_key": "global"}, {"$set": {"thresholds": body}})
    await _audit(user, "Settings updated", "settings",
                 "Prototype deviation thresholds updated.")
    return {"ok": True, "thresholds": body}


# ---------------------------------------------------------------- search
@api.get("/search")
async def search(user: dict = Depends(get_current_user), q: str = ""):
    if not q or len(q) < 1:
        return {"students": [], "signals": [], "courses": []}
    ql = q.lower()
    students = await db.students.find(
        {}, {"_id": 0, "id": 1, "name": 1, "student_id": 1, "program": 1,
             "avatar": 1, "band": 1}).to_list(500)
    students = [s for s in students if ql in s["name"].lower() or ql in s["student_id"].lower()][:6]
    signals = await db.signals.find({}, CLEAN).to_list(1000)
    signals = [s for s in signals if ql in s["student_name"].lower()
               or ql in s["course_code"].lower() or ql in s["signal_type"].lower()][:6]
    courses = await db.courses.find({}, CLEAN).to_list(50)
    courses = [c for c in courses if ql in c["code"].lower() or ql in c["name"].lower()][:6]
    return {"students": students, "signals": signals, "courses": courses}


@api.post("/demo/reset")
async def reset_demo(user: dict = Depends(get_current_user)):
    await ensure_seed(force=True)
    return {"ok": True}


# ---------------------------------------------------------------- reviewer data mgmt
def _dept_id(name):
    for d in seed_data.DEPARTMENTS:
        if d["name"].lower() == (name or "").lower():
            return d["id"]
    return "dep_cs"


def _clean_record(r):
    return {k: r.get(k) for k in ["semester", "course_code", "course_name", "assignment_name",
                                   "submission_timestamp", "deadline_timestamp", "grade", "writing_sample"]}


def _prep(recs):
    return [{**r, "_sub_dt": import_utils._parse_dt(r.get("submission_timestamp")),
             "_dl_dt": import_utils._parse_dt(r.get("deadline_timestamp"))} for r in recs]


async def _get_thresholds():
    s = await db.settings.find_one({"_key": "global"}, {"_id": 0})
    return (s or {}).get("thresholds")


def _student_history(s):
    recs = s.get("academic_records")
    hist, subs = [], []
    if recs:
        agg = {}
        for r in recs:
            n = student_engine.sem_num(r.get("semester"))
            code = r.get("course_code") or "—"
            key = (n, code)
            agg.setdefault(key, {"semester": student_engine.sem_label(n), "course_code": code,
                                 "course_name": r.get("course_name") or code, "grades": [], "assignments": 0})
            agg[key]["assignments"] += 1
            if r.get("grade") not in (None, ""):
                agg[key]["grades"].append(float(r["grade"]))
            sub = import_utils._parse_dt(r.get("submission_timestamp"))
            dl = import_utils._parse_dt(r.get("deadline_timestamp"))
            hrs = student_engine._hours_before(sub, dl)
            subs.append({"assignment": r.get("assignment_name") or "—", "course": code,
                         "submitted": r.get("submission_timestamp") or "—",
                         "deadline": r.get("deadline_timestamp") or "—", "hours_before": hrs,
                         "pattern": ("Near deadline" if hrs is not None and hrs < 2 else
                                     "Typical" if hrs is not None else "—")})
        for (n, code), v in sorted(agg.items()):
            avg = round(statistics.mean(v["grades"])) if v["grades"] else None
            hist.append({"semester": v["semester"], "course_code": code, "course_name": v["course_name"],
                         "grade": avg, "assignments": v["assignments"], "avg": avg})
    else:
        for sem in s.get("semesters", []):
            for c in sem.get("courses", []):
                hist.append({"semester": sem["label"], "course_code": c["code"], "course_name": c["name"],
                             "grade": c["grade"], "assignments": "—", "avg": c["grade"]})
    return hist, subs


def _new_student_doc(sid, meta, records):
    name = meta.get("student_name") or sid
    yr = meta.get("year")
    year = int(yr) if yr and str(yr).strip().isdigit() else 1
    return {
        "id": uuid.uuid4().hex[:10], "student_id": sid, "name": name, "email": meta.get("email"),
        "program": meta.get("program") or "Computer Science", "dept_id": _dept_id(meta.get("department")),
        "year": year, "avatar": seed_data._avatar(name), "featured": False, "record_driven": True,
        "academic_records": records, "signal_count": 0,
        "current_semester": max([student_engine.sem_num(r.get("semester")) for r in records] or [1]),
        "current_gpa": None,
        "last_activity": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def _activity(student, text):
    await db.student_activity.insert_one({
        "student_id": student["id"], "student_name": student["name"], "text": text,
        "timestamp": datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M"),
        "iso": datetime.now(timezone.utc).isoformat(),
    })


async def _recompute_and_store(student):
    """Run the analytics pipeline from raw records and persist analytics + signals."""
    thresholds = await _get_thresholds()
    prepared = _prep(student.get("academic_records", []))
    result = student_engine.recompute(student, prepared, thresholds)
    gen = result.pop("generated_signals", [])
    student.update(result)
    student.pop("_id", None)
    await db.students.update_one({"id": student["id"]}, {"$set": student}, upsert=True)
    await db.signals.delete_many({"student_id": student["id"], "source": "engine"})
    now = datetime.now(timezone.utc)
    made = []
    for g in gen:
        sig_id = f"SIG-ENG-{uuid.uuid4().hex[:6]}"
        doc = {"id": sig_id, "student_id": student["id"], "student_name": student["name"],
               "student_avatar": student["avatar"], "program": student["program"],
               "detected": now.strftime("%d %b %Y"), "detected_iso": now.isoformat(), "source": "engine",
               "evidence": [
                   {"label": "Historical baseline", "value": "Prior semesters"},
                   {"label": "Current observation", "value": "Most recent semester"},
                   {"label": "Writing-style deviation", "value": f"{g['factors']['writing']}%"},
                   {"label": "Submission-pattern deviation", "value": f"{g['factors']['submission']}%"},
                   {"label": "Performance deviation", "value": f"{g['factors']['performance']}%"}],
               **g}
        await db.signals.insert_one(doc)
        made.append(sig_id)
    cnt = await db.signals.count_documents({"student_id": student["id"]})
    await db.students.update_one({"id": student["id"]}, {"$set": {"signal_count": cnt}})
    return made


async def _ingest_rows(rows, user):
    groups = {}
    for r in rows:
        groups.setdefault(r["student_id"], []).append(r)
    created = updated = sigs = 0
    for sid, recs in groups.items():
        clean = [_clean_record(r) for r in recs]
        existing = await db.students.find_one({"student_id": sid}, CLEAN)
        if existing:
            existing["academic_records"] = existing.get("academic_records", []) + clean
            existing.setdefault("record_driven", True)
            made = await _recompute_and_store(existing)
            updated += 1
            sigs += len(made)
            await _audit(user, "Student data updated", existing["id"],
                         f"Appended {len(clean)} record(s) to {existing['name']}; behavioral baseline recalculated.",
                         student_id=existing["id"])
            await _activity(existing, f"{len(clean)} academic record(s) added — baseline recalculated")
        else:
            student = _new_student_doc(sid, recs[0], clean)
            await db.students.insert_one(student)
            student.pop("_id", None)
            made = await _recompute_and_store(student)
            created += 1
            sigs += len(made)
            await _audit(user, "Student added", student["id"],
                         f"Imported student {student['name']} ({sid}).", student_id=student["id"])
            await _activity(student, "Student profile created via import")
    return {"created": created, "updated": updated, "signals_generated": sigs, "students": created + updated}


@api.post("/students")
async def add_student(request: Request, user: dict = Depends(get_current_user)):
    b = await request.json()
    sid = (b.get("student_id") or "").strip()
    if not sid or not b.get("full_name"):
        raise HTTPException(status_code=400, detail="student_id and full_name are required")
    if await db.students.find_one({"student_id": sid}):
        raise HTTPException(status_code=409, detail="A student with this Student ID already exists")
    student = {
        "id": uuid.uuid4().hex[:10], "student_id": sid, "name": b["full_name"].strip(),
        "email": b.get("email"), "program": b.get("program") or "Computer Science",
        "dept_id": _dept_id(b.get("department")), "year": int(b.get("year") or 1),
        "avatar": seed_data._avatar(b["full_name"]), "featured": False, "record_driven": True,
        "advisor": b.get("advisor"), "enrollment_date": b.get("enrollment_date"),
        "current_semester": int(b.get("current_semester") or 1),
        "current_gpa": float(b["current_gpa"]) if b.get("current_gpa") else None,
        "academic_records": [], "signal_count": 0,
        "last_activity": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.students.insert_one(student)
    student.pop("_id", None)
    await _recompute_and_store(student)
    await _audit(user, "Student added", student["id"],
                 f"Added student {student['name']} ({sid}).", student_id=student["id"])
    await _activity(student, "Student profile created")
    return {"id": student["id"], "student_id": sid}


@api.get("/students/import/template")
async def import_template(user: dict = Depends(get_current_user)):
    csv_text = import_utils.build_template_csv()
    return Response(content=csv_text, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=continuum_student_template.csv"})


@api.post("/students/import/preview")
async def import_preview(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    rows, errors = import_utils.parse_upload(file.filename, content)
    ex = await db.students.find({}, {"_id": 0, "student_id": 1}).to_list(2000)
    existing = {e["student_id"] for e in ex}
    summary = import_utils.summarize(rows, existing)
    preview = [{"student_id": r["student_id"], "student_name": r["student_name"],
                "course_code": r.get("course_code"), "semester": r.get("semester"),
                "assignment_name": r.get("assignment_name"), "grade": r.get("grade"),
                "submission_timestamp": r.get("submission_timestamp"),
                "status": "Existing" if r["student_id"] in existing else "New"} for r in rows[:50]]
    return {"summary": summary, "errors": errors[:20], "preview": preview}


@api.post("/students/import/commit")
async def import_commit(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    rows, errors = import_utils.parse_upload(file.filename, content)
    if not rows:
        raise HTTPException(status_code=400, detail=(errors[0] if errors else "No valid rows found"))
    result = await _ingest_rows(rows, user)
    result["errors"] = errors[:20]
    return result


@api.post("/students/import/demo")
async def import_demo(user: dict = Depends(get_current_user)):
    rows, _ = import_utils.parse_upload("demo.csv", import_utils.build_template_csv().encode())
    result = await _ingest_rows(rows, user)
    return result


@api.post("/students/{student_id}/records")
async def add_record(student_id: str, request: Request, user: dict = Depends(get_current_user)):
    b = await request.json()
    s = await db.students.find_one({"id": student_id}, CLEAN)
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    rec = {"semester": b.get("semester"), "course_code": b.get("course_code"),
           "course_name": b.get("course_name"), "assignment_name": b.get("assignment_name"),
           "submission_timestamp": b.get("submission_date"), "deadline_timestamp": b.get("deadline"),
           "grade": float(b["grade"]) if b.get("grade") not in (None, "") else None,
           "writing_sample": b.get("writing_sample")}
    s["academic_records"] = s.get("academic_records", []) + [rec]
    s.setdefault("record_driven", True)
    made = await _recompute_and_store(s)
    await _audit(user, "Academic record added", student_id,
                 f"Added {rec.get('assignment_name') or 'record'} ({rec.get('semester')}) to {s['name']}; analytics updated.",
                 student_id=student_id)
    await _activity(s, f"Academic record added ({rec.get('semester')}) — analytics updated")
    return {"ok": True, "signals_generated": len(made)}


@api.post("/students/{student_id}/records/import")
async def import_records(student_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    rows, errors = import_utils.parse_upload(file.filename, content)
    s = await db.students.find_one({"id": student_id}, CLEAN)
    if not s:
        raise HTTPException(status_code=404, detail="Student not found")
    recs = [_clean_record(r) for r in rows]
    s["academic_records"] = s.get("academic_records", []) + recs
    s.setdefault("record_driven", True)
    made = await _recompute_and_store(s)
    await _audit(user, "Student data updated", student_id,
                 f"Uploaded {len(recs)} additional record(s) to {s['name']}; baseline recalculated.",
                 student_id=student_id)
    await _activity(s, f"{len(recs)} record(s) uploaded — baseline recalculated")
    return {"added": len(recs), "signals_generated": len(made), "errors": errors[:20]}


# ---------------------------------------------------------------- audit util
async def _audit(user: dict, action: str, entity: str, description: str, student_id: str = None):
    await db.audit_events.insert_one({
        "id": f"AUD-{uuid.uuid4().hex[:6]}",
        "timestamp": datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M"),
        "iso": datetime.now(timezone.utc).isoformat(),
        "user": user.get("name", "Unknown"), "action": action,
        "entity": entity, "description": description, "student_id": student_id,
    })


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
