"""CONTINUUM — deterministic synthetic data generator.

Produces an internally consistent institutional dataset:
1 institution, 3 departments, 10 courses, 5 semesters, 110 students, signals,
reviews, audit events, data sources. All data is fictional.
"""
from __future__ import annotations
import random
import uuid
from datetime import datetime, timezone, timedelta

import analytics_engine as ae

RNG = random.Random(1729)  # deterministic

INSTITUTION = {
    "id": "inst_northbridge",
    "name": "Northbridge University",
    "short": "Northbridge",
    "students_monitored": 2481,
}

DEPARTMENTS = [
    {"id": "dep_cs", "name": "Computer Science", "code": "CS"},
    {"id": "dep_math", "name": "Mathematics", "code": "MA"},
    {"id": "dep_sci", "name": "Applied Sciences", "code": "SCI"},
]

COURSES = [
    {"id": "c_cs204", "code": "CS204", "name": "Data Structures", "dept": "Computer Science"},
    {"id": "c_cs301", "code": "CS301", "name": "Machine Learning", "dept": "Computer Science"},
    {"id": "c_cs205", "code": "CS205", "name": "Database Systems", "dept": "Computer Science"},
    {"id": "c_cs210", "code": "CS210", "name": "Algorithms", "dept": "Computer Science"},
    {"id": "c_cs330", "code": "CS330", "name": "Operating Systems", "dept": "Computer Science"},
    {"id": "c_cs340", "code": "CS340", "name": "Computer Networks", "dept": "Computer Science"},
    {"id": "c_ma201", "code": "MA201", "name": "Linear Algebra", "dept": "Mathematics"},
    {"id": "c_ma230", "code": "MA230", "name": "Probability Theory", "dept": "Mathematics"},
    {"id": "c_sci150", "code": "SCI150", "name": "Genetics", "dept": "Applied Sciences"},
    {"id": "c_sci220", "code": "SCI220", "name": "Thermodynamics", "dept": "Applied Sciences"},
]

SEMESTERS = [
    {"id": "s1", "label": "Semester 1", "term": "Fall 2024"},
    {"id": "s2", "label": "Semester 2", "term": "Spring 2025"},
    {"id": "s3", "label": "Semester 3", "term": "Fall 2025"},
    {"id": "s4", "label": "Semester 4", "term": "Spring 2026"},
    {"id": "s5", "label": "Semester 5", "term": "Fall 2026"},
]

WRITING_FEATURE_NAMES = [
    ("Avg sentence length", "words"),
    ("Vocabulary richness", "TTR"),
    ("Readability (Flesch)", "score"),
    ("Punctuation density", "/100w"),
    ("Structural consistency", "%"),
    ("Stylistic consistency", "%"),
]

FIRST = ["Vivek", "Sneha", "Rohan", "Neha", "Aditya", "Kavya", "Sanjay", "Divya",
         "Nikhil", "Pooja", "Varun", "Ishita", "Manish", "Riya", "Akash", "Tara",
         "Suresh", "Lakshmi", "Vijay", "Anjali", "Gaurav", "Shreya", "Rohit", "Nisha",
         "Deepak", "Sakshi", "Harsh", "Aparna", "Kabir", "Trisha", "Yash", "Mitali",
         "Om", "Diya", "Aryan", "Simran", "Dev", "Reema", "Kunal", "Payal"]
LAST = ["Iyer", "Patel", "Reddy", "Gupta", "Verma", "Shah", "Bose", "Chopra",
        "Malhotra", "Kapoor", "Desai", "Pillai", "Mehta", "Sinha", "Banerjee",
        "Nair", "Rao", "Kumar", "Menon", "Khan", "Joseph", "Sharma", "Das", "Roy"]

PROGRAMS = {"Computer Science": "dep_cs", "Mathematics": "dep_math", "Applied Sciences": "dep_sci"}


def _avatar(seed: str) -> str:
    return f"https://api.dicebear.com/7.x/notionists/svg?seed={seed}&backgroundColor=0EA5E9,6366F1,10B981&radius=20"


def _trend(series):
    return "up" if series[-1] > series[0] else "down" if series[-1] < series[0] else "flat"


def _build_analytics(index, primary, perf_override=None, breakdown=None):
    """Return baseline, writing features, performance, submission behavior + factors."""
    if breakdown:
        writing, submission, performance = breakdown
    else:
        base = index
        writing = min(100, base + (25 if primary == "writing" else -12) + RNG.randint(-8, 8))
        submission = min(100, base + (28 if primary == "submission" else -10) + RNG.randint(-8, 8))
        performance = min(100, base + (26 if primary == "performance" else -8) + RNG.randint(-8, 8))
        writing, submission, performance = max(4, writing), max(4, submission), max(4, performance)

    # Performance series across 5 semesters
    if perf_override:
        perf = perf_override
    else:
        start = RNG.randint(72, 86)
        perf = [start + RNG.randint(-3, 3) for _ in range(4)]
        last = perf[-1]
        if primary == "performance" or performance >= 45:
            last = max(52, int(sum(perf) / len(perf)) - RNG.randint(14, 22))
        else:
            last = perf[-1] + RNG.randint(-3, 4)
        perf.append(last)

    longitudinal = ae.calculate_longitudinal_trend([float(x) for x in perf])

    baseline = {
        "Writing Consistency": {"historical": "Stable", "current": ae.classify_deviation(writing)},
        "Submission Timing": {"historical": "Stable", "current": ae.classify_deviation(submission)},
        "Academic Performance": {"historical": "Stable", "current": ae.classify_deviation(performance)},
        "Behavioral Stability": {"historical": "Stable", "current": ae.deviation_band(index)["label"]},
    }

    writing_features = []
    for name, unit in WRITING_FEATURE_NAMES:
        hist = RNG.randint(40, 75)
        dev = int(writing * RNG.uniform(0.5, 1.0))
        cur = max(5, min(100, hist + (dev if RNG.random() > 0.4 else -dev) // 2))
        writing_features.append({
            "feature": name, "unit": unit, "historical": hist, "current": cur,
            "deviation": abs(cur - hist),
        })

    perf_analysis = ae.analyze_performance_volatility([float(x) for x in perf])

    if submission >= 45:
        recent = "Three recent submissions occurred within the final 30 minutes before the deadline."
        sub_label = "Meaningful pattern change"
    elif submission >= 20:
        recent = "Two recent submissions occurred noticeably closer to the deadline than usual."
        sub_label = "Minor pattern change"
    else:
        recent = "Recent submissions remained within the historical timing window."
        sub_label = "Consistent with baseline"

    submission_behavior = {
        "historical": "Typically submits 12–36 hours before deadline.",
        "recent": recent,
        "label": sub_label,
        "deviation": round(submission),
        "timeline": [RNG.randint(12, 36) for _ in range(4)] + [
            (RNG.randint(0, 2) if submission >= 45 else RNG.randint(6, 24))
        ],
    }

    factors = {
        "writing": round(writing), "submission": round(submission),
        "performance": round(performance), "longitudinal": round(longitudinal),
    }
    breakdown, breakdown_total = ae.change_breakdown(factors)
    return baseline, writing_features, perf_analysis, submission_behavior, factors, breakdown, breakdown_total


def _semesters_for(student, perf_series, index, primary):
    out = []
    dept_courses = [c for c in COURSES if c["dept"] == student["program"]] or COURSES
    for i, sem in enumerate(SEMESTERS):
        picks = RNG.sample(dept_courses, k=min(3, len(dept_courses)))
        is_recent = i >= 3
        stability = "Stable"
        sig_count = 0
        if is_recent and index >= 41:
            stability = "Significant" if index >= 71 else "Moderate"
            sig_count = 1 if i == 4 else (1 if index >= 71 else 0)
        out.append({
            "id": sem["id"], "label": sem["label"], "term": sem["term"],
            "courses": [{"code": c["code"], "name": c["name"],
                         "grade": max(48, int(perf_series[i]) + RNG.randint(-4, 4))} for c in picks],
            "grade_avg": int(perf_series[i]),
            "submissions": RNG.randint(6, 12),
            "stability": stability,
            "signals": sig_count,
        })
    return out


# ---- Featured students (curated demo narratives) -------------------------
FEATURED = [
    {"name": "Alex Morgan", "program": "Computer Science", "year": 3, "index": 24,
     "primary": "submission", "perf": [81, 83, 82, 85, 80], "breakdown": (14, 31, 12),
     "case": "Demo student — personal workspace", "sid": "STU-2024-1000"},
    {"name": "Arjun Kumar", "program": "Computer Science", "year": 2, "index": 68,
     "primary": "writing", "perf": [78, 81, 79, 82, 61], "breakdown": (42, 67, 31),
     "case": "Writing-style drift"},
    {"name": "Priya Sharma", "program": "Computer Science", "year": 3, "index": 11,
     "primary": "writing", "perf": [84, 86, 85, 87, 88], "breakdown": (9, 8, 7),
     "case": "Stable student"},
    {"name": "Rahul Menon", "program": "Computer Science", "year": 2, "index": 54,
     "primary": "performance", "perf": [80, 78, 81, 79, 58], "breakdown": (22, 24, 71),
     "case": "Performance volatility"},
    {"name": "Aisha Khan", "program": "Mathematics", "year": 4, "index": 49,
     "primary": "submission", "perf": [77, 79, 78, 80, 74], "breakdown": (26, 63, 19),
     "case": "Submission pattern change"},
    {"name": "Daniel Joseph", "program": "Computer Science", "year": 1, "index": 16,
     "primary": "writing", "perf": [75, 77, 76, 78, 79], "breakdown": (12, 14, 10),
     "case": "Stable student"},
    {"name": "Meera Nair", "program": "Applied Sciences", "year": 3, "index": 79,
     "primary": "multi", "perf": [82, 83, 80, 68, 57], "breakdown": (58, 61, 66),
     "case": "Multiple signals converging"},
    {"name": "Karthik Raj", "program": "Computer Science", "year": 2, "index": 34,
     "primary": "submission", "perf": [76, 78, 77, 75, 72], "breakdown": (28, 39, 22),
     "case": "Early watch"},
    {"name": "Ananya Rao", "program": "Mathematics", "year": 3, "index": 9,
     "primary": "writing", "perf": [88, 89, 87, 90, 91], "breakdown": (6, 7, 5),
     "case": "Stable student"},
]


def build_all():
    students, signals, reviews, audit, used_names = [], [], [], [], set()
    now = datetime(2026, 8, 20, tzinfo=timezone.utc)

    def make_student(name, program, year, index, primary, perf=None, breakdown=None, featured=False, case=None, sid=None):
        sid = sid or f"STU-{2024}-{len(students)+1001}"
        student_id = uuid.uuid4().hex[:10]
        s = {"id": student_id, "student_id": sid, "name": name, "program": program,
             "dept_id": PROGRAMS[program], "year": year, "avatar": _avatar(name),
             "featured": featured, "case": case}
        baseline, wfeat, perf_analysis, sub_beh, factors, chg_breakdown, chg_total = _build_analytics(
            index, primary, perf_override=perf, breakdown=breakdown)
        idx = ae.deviation_index(factors["writing"], factors["submission"],
                                 factors["performance"], factors["longitudinal"])
        idx = index if featured else idx
        observation_count = RNG.randint(9, 22)  # synthetic students all have multi-semester history
        s.update({
            "deviation_index": idx,
            "band": ae.deviation_band(idx),
            "status_label": ae.status_label(idx),
            "factors": factors,
            "baseline": baseline,
            "writing_features": wfeat,
            "performance": perf_analysis,
            "submission_behavior": sub_beh,
            "semesters": _semesters_for(s, perf_analysis["series"], idx, primary),
            "last_activity": (now - timedelta(days=RNG.randint(0, 20))).strftime("%d %b %Y"),
            "trend": _trend(perf_analysis["series"]),
            "baseline_status": ae.baseline_maturity(observation_count),
            "change_breakdown": chg_breakdown,
            "previous_index": max(0, idx - chg_total),
            "index_delta": chg_total,
        })
        s["signal_count"] = 0
        students.append(s)
        return s

    for f in FEATURED:
        make_student(f["name"], f["program"], f["year"], f["index"], f["primary"],
                     perf=f["perf"], breakdown=f["breakdown"], featured=True, case=f["case"],
                     sid=f.get("sid"))
        used_names.add(f["name"])

    # Generic population
    while len(students) < 112:
        name = f"{RNG.choice(FIRST)} {RNG.choice(LAST)}"
        if name in used_names:
            continue
        used_names.add(name)
        program = RNG.choices(list(PROGRAMS.keys()), weights=[6, 3, 2])[0]
        roll = RNG.random()
        if roll < 0.55:
            index = RNG.randint(4, 20)
        elif roll < 0.78:
            index = RNG.randint(21, 40)
        elif roll < 0.93:
            index = RNG.randint(41, 70)
        else:
            index = RNG.randint(71, 96)
        primary = RNG.choice(["writing", "submission", "performance"])
        make_student(name, program, RNG.randint(1, 4), index, primary)

    # ---- Signals -----------------------------------------------------------
    type_map = {"writing": "Writing Drift", "submission": "Submission Pattern Shift",
                "performance": "Performance Volatility", "multi": "Multi-Signal Deviation"}
    statuses = ["New", "Under Review", "Needs Follow-up", "Resolved", "Dismissed"]

    def dominant_type(factors):
        m = max(("writing", "submission", "performance"), key=lambda k: factors[k])
        high = [k for k in ("writing", "submission", "performance") if factors[k] >= 45]
        return "Multi-Signal Deviation" if len(high) >= 3 else type_map[m]

    detected_pool = [now - timedelta(days=d) for d in range(7, 34)]

    def add_signal(student, stype, severity, status, sem, course, det, explanation=None, evidence=None,
                   context=None):
        sig_id = f"SIG-{len(signals)+4001}"
        persistence = RNG.randint(2, 5)
        agreement = ae.multi_signal_agreement(student["factors"])
        confidence = ae.calculate_confidence(student["factors"], evidence_count=persistence + 1, persistence=persistence)
        priority = ae.review_priority(severity, confidence, agreement, persistence)
        signals.append({
            "id": sig_id, "student_id": student["id"], "student_name": student["name"],
            "student_avatar": student["avatar"], "program": student["program"],
            "signal_type": stype, "course_code": course["code"], "course_name": course["name"],
            "semester": sem["label"], "semester_term": sem["term"], "severity": severity,
            "status": status, "detected": det.strftime("%d %b %Y"), "detected_iso": det.isoformat(),
            "factors": student["factors"], "deviation_index": student["deviation_index"],
            "band": student["band"],
            "confidence": confidence, "persistence": persistence,
            "multi_signal_agreement": agreement, "review_priority": priority,
            "explanation": explanation, "explanation_source": "prototype" if explanation else None,
            "evidence": evidence or [
                {"label": "Historical baseline", "value": "Previous 4 semesters"},
                {"label": "Current observation", "value": "Last 3 submissions"},
                {"label": "Writing-style deviation", "value": f"{student['factors']['writing']}%"},
                {"label": "Submission-pattern deviation", "value": f"{student['factors']['submission']}%"},
                {"label": "Performance deviation", "value": f"{student['factors']['performance']}%"},
            ],
            "context": context, "context_requested": False,
        })
        student["signal_count"] += 1
        return signals[-1]

    # Featured curated signals first (deterministic dashboard rows)
    def course_by_code(code):
        return next(c for c in COURSES if c["code"] == code)

    arjun = next(s for s in students if s["name"] == "Arjun Kumar")
    arjun_sig = add_signal(arjun, "Writing Drift", "High", "Needs Follow-up",
                           SEMESTERS[3], course_by_code("CS204"), datetime(2026, 8, 18, tzinfo=timezone.utc),
                           explanation=ae.generate_explanation({"factors": arjun["factors"]}))

    # A small personal signal for the demo student (Alex Morgan) so the
    # Student Demo view has something to show in "My Risk Signals".
    alex = next(s for s in students if s["name"] == "Alex Morgan")
    add_signal(alex, "Submission Pattern Shift", "Low", "Resolved",
               SEMESTERS[4], course_by_code("CS210"), datetime(2026, 8, 12, tzinfo=timezone.utc),
               explanation=ae.generate_explanation({"factors": alex["factors"]}))

    curated = {
        "Meera Nair": ("Multi-Signal Deviation", "High", "Needs Follow-up", "SCI220", 17),
        "Rahul Menon": ("Performance Volatility", "High", "Under Review", "CS301", 16),
        "Aisha Khan": ("Submission Pattern Shift", "Moderate", "New", "MA201", 15),
        "Karthik Raj": ("Submission Pattern Shift", "Moderate", "Under Review", "CS205", 14),
    }
    for name, (stype, sev, status, code, day) in curated.items():
        st = next(s for s in students if s["name"] == name)
        add_signal(st, stype, sev, status, SEMESTERS[4], course_by_code(code),
                   datetime(2026, 8, day, tzinfo=timezone.utc),
                   explanation=ae.generate_explanation({"factors": st["factors"]}))

    # Generic signals for elevated students
    for st in students:
        if st["name"] in curated or st["name"] == "Arjun Kumar":
            continue
        if st["deviation_index"] >= 41:
            n = 2 if st["deviation_index"] >= 71 else 1
            for _ in range(n):
                sev = "High" if st["deviation_index"] > 70 else "Moderate"
                status = RNG.choices(statuses, weights=[3, 3, 2, 2, 1])[0]
                dept_courses = [c for c in COURSES if c["dept"] == st["program"]] or COURSES
                add_signal(st, dominant_type(st["factors"]), sev, status,
                           RNG.choice(SEMESTERS[3:]), RNG.choice(dept_courses),
                           RNG.choice(detected_pool))

    # ---- Reviews -----------------------------------------------------------
    reviewers = ["Dr. Nandini Rao", "Prof. James Okafor", "Dr. Lena Fischer"]
    for sig in signals:
        if sig["student_name"] == "Alex Morgan":
            continue  # the demo student's own signal isn't part of the educator queue
        if sig["status"] in ("Under Review", "Needs Follow-up", "New"):
            rid = f"REV-{len(reviews)+7001}"
            r_status = {"New": "Open", "Under Review": "In Progress",
                        "Needs Follow-up": "Follow-up"}[sig["status"]]
            notes = []
            if sig["student_name"] == "Arjun Kumar":
                notes = [{
                    "id": uuid.uuid4().hex[:8], "reviewer": "Dr. Nandini Rao",
                    "timestamp": "19 Aug 2026, 09:14",
                    "text": "Student explained that the assignment format changed this semester. Requesting prior drafts for context before any determination.",
                }]
            reviews.append({
                "id": rid, "signal_id": sig["id"], "student_id": sig["student_id"],
                "student_name": sig["student_name"], "student_avatar": sig["student_avatar"],
                "signal_type": sig["signal_type"], "severity": sig["severity"],
                "course_code": sig["course_code"], "semester": sig["semester"],
                "assigned_reviewer": RNG.choice(reviewers) if sig["student_name"] != "Arjun Kumar" else "Dr. Nandini Rao",
                "created": sig["detected"], "status": r_status, "notes": notes,
            })

    # ---- Audit events ------------------------------------------------------
    def audit_event(ts, user, action, entity, description):
        audit.append({"id": f"AUD-{len(audit)+9001}", "timestamp": ts, "user": user,
                      "action": action, "entity": entity, "description": description})

    audit_event("18 Aug 2026, 08:02", "System", "Signal generated", "SIG-4001",
                "Writing-style drift signal generated for Arjun Kumar (CS204).")
    audit_event("18 Aug 2026, 10:41", "Dr. Nandini Rao", "Signal opened", "SIG-4001",
                "Reviewer opened signal for Arjun Kumar.")
    audit_event("19 Aug 2026, 09:14", "Dr. Nandini Rao", "Note added", "REV-7001",
                "Reviewer added a note regarding assignment format change.")
    audit_event("19 Aug 2026, 09:20", "Dr. Nandini Rao", "Status changed", "SIG-4001",
                "Signal marked Needs Follow-up.")
    for sig in signals[1:]:
        d = sig["detected"]
        audit_event(f"{d}, {RNG.randint(8,17):02d}:{RNG.randint(0,59):02d}", "System",
                    "Signal generated", sig["id"],
                    f"{sig['signal_type']} signal generated for {sig['student_name']} ({sig['course_code']}).")
    audit.sort(key=lambda e: e["timestamp"], reverse=True)

    # ---- Courses -----------------------------------------------------------
    courses = []
    for c in COURSES:
        c_signals = [s for s in signals if s["course_code"] == c["code"]]
        c_students = RNG.randint(38, 96)
        courses.append({**c, "students": c_students, "signals": len(c_signals),
                        "trend": RNG.choice(["up", "flat", "down"]),
                        "avg_stability": RNG.randint(72, 94),
                        "median_submission_hours": RNG.randint(5, 14)})

    # ---- Data sources ------------------------------------------------------
    data_sources = [
        {"id": "ds_lms", "name": "Learning Management System", "type": "Canvas LMS",
         "status": "Connected", "last_sync": "12 min ago", "records": "182,940"},
        {"id": "ds_grade", "name": "Gradebook", "type": "Northbridge Gradebook API",
         "status": "Connected", "last_sync": "4 min ago", "records": "41,220"},
        {"id": "ds_repo", "name": "Submission Repository", "type": "Turnitin Vault",
         "status": "Syncing", "last_sync": "syncing…", "records": "96,510"},
        {"id": "ds_sis", "name": "Student Information System", "type": "Banner SIS",
         "status": "Not Connected", "last_sync": "—", "records": "—"},
    ]

    stats = {
        "students_monitored": 2481, "active_signals": 37, "needs_review": 12,
        "significant_drift": 8,
    }

    return {
        "institution": {**INSTITUTION, "stats": stats},
        "departments": DEPARTMENTS,
        "courses": courses,
        "semesters": SEMESTERS,
        "students": students,
        "signals": signals,
        "reviews": reviews,
        "audit": audit,
        "data_sources": data_sources,
        "settings": {
            "institution_name": "Northbridge University",
            "thresholds": {
                "writing_deviation": 40,
                "performance_deviation": 45,
                "submission_pattern": 40,
            },
            "privacy": {"data_minimization": True, "retention_months": 24},
        },
    }
