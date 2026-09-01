"""
CONTINUUM backend regression suite.
Covers: auth demo/me/logout, data endpoints (overview, students, signals, reviews,
analytics, courses, data-sources, audit-log, settings, search), LLM explain endpoint,
signal status patch, review notes + action workflow, settings thresholds patch, demo reset.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
API = f"{BASE_URL}/api"

ACCUSATORY = ["cheater", "guilty", "ai-generated", "cheating", "plagiarist"]


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/demo", timeout=30)
    assert r.status_code == 200, f"auth/demo failed: {r.status_code} {r.text}"
    return s


# ---------- Auth ----------
class TestAuth:
    def test_demo_login(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/demo", timeout=30)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == "demo@continuum.edu"
        assert u["name"] == "Alex Morgan"
        assert "session_token" in s.cookies

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_authenticated(self, session):
        r = session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == "demo@continuum.edu"

    def test_logout(self):
        s = requests.Session()
        s.post(f"{API}/auth/demo", timeout=15)
        r = s.post(f"{API}/auth/logout", timeout=15)
        assert r.status_code == 200
        # Session token should be invalidated
        r2 = requests.get(f"{API}/auth/me",
                          cookies={"session_token": s.cookies.get("session_token", "")},
                          timeout=15)
        assert r2.status_code == 401


# ---------- Data endpoints ----------
class TestDataEndpoints:
    def test_overview(self, session):
        r = session.get(f"{API}/overview", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "stats" in d and "signals_over_time" in d and "distribution" in d
        assert len(d["signals_over_time"]) >= 1

    def test_students_list_and_filters(self, session):
        r = session.get(f"{API}/students", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 100
        assert len(d["students"]) <= d["page_size"]
        # search
        r2 = session.get(f"{API}/students?q=arjun", timeout=15)
        assert r2.status_code == 200
        names = [s["name"].lower() for s in r2.json()["students"]]
        assert any("arjun" in n for n in names)
        # pagination
        r3 = session.get(f"{API}/students?page=2", timeout=15)
        assert r3.status_code == 200 and r3.json()["page"] == 2

    def test_student_detail_arjun(self, session):
        r = session.get(f"{API}/search?q=arjun", timeout=15)
        assert r.status_code == 200
        students = r.json()["students"]
        assert students, "Arjun not found in search"
        sid = students[0]["id"]
        r2 = session.get(f"{API}/students/{sid}", timeout=15)
        assert r2.status_code == 200
        s = r2.json()
        assert "arjun" in s["name"].lower()
        assert "signals" in s and "baseline" in s

    def test_signals_endpoints(self, session):
        r = session.get(f"{API}/signals", timeout=15)
        assert r.status_code == 200
        sigs = r.json()["signals"]
        assert len(sigs) > 0
        # filters
        r2 = session.get(f"{API}/signals?severity=High", timeout=15)
        assert r2.status_code == 200
        assert all(s["severity"] == "High" for s in r2.json()["signals"])
        # detail
        sid = sigs[0]["id"]
        r3 = session.get(f"{API}/signals/{sid}", timeout=15)
        assert r3.status_code == 200
        assert r3.json()["id"] == sid

    def test_reviews(self, session):
        r = session.get(f"{API}/reviews", timeout=15)
        assert r.status_code == 200
        revs = r.json()["reviews"]
        assert len(revs) >= 1
        rid = revs[0]["id"]
        r2 = session.get(f"{API}/reviews/{rid}", timeout=15)
        assert r2.status_code == 200
        assert "signal" in r2.json() and "student" in r2.json()

    def test_analytics(self, session):
        r = session.get(f"{API}/analytics", timeout=15)
        assert r.status_code == 200
        for k in ["signals_by_semester", "categories", "stability",
                  "course_distribution", "risk_trend", "intervention_outcomes"]:
            assert k in r.json()

    def test_courses(self, session):
        r = session.get(f"{API}/courses", timeout=15)
        assert r.status_code == 200
        courses = r.json()["courses"]
        assert len(courses) >= 5
        code = courses[0]["code"]
        r2 = session.get(f"{API}/courses/{code}", timeout=15)
        assert r2.status_code == 200
        assert "roster" in r2.json() and "signal_list" in r2.json()

    def test_data_sources(self, session):
        r = session.get(f"{API}/data-sources", timeout=15)
        assert r.status_code == 200
        assert len(r.json()["sources"]) >= 1

    def test_audit_log(self, session):
        r = session.get(f"{API}/audit-log", timeout=15)
        assert r.status_code == 200
        assert "events" in r.json()

    def test_settings(self, session):
        r = session.get(f"{API}/settings", timeout=15)
        assert r.status_code == 200
        assert "thresholds" in r.json()

    def test_search_arjun(self, session):
        r = session.get(f"{API}/search?q=arjun", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert any("arjun" in s["name"].lower() for s in d["students"])


# ---------- LLM explain + signal update + review workflow ----------
class TestWorkflows:
    def test_llm_explain_non_accusatory(self, session):
        r = session.get(f"{API}/signals", timeout=15)
        sid = r.json()["signals"][0]["id"]
        r2 = session.post(f"{API}/signals/{sid}/explain", timeout=60)
        assert r2.status_code == 200, r2.text
        data = r2.json()
        text = data["explanation"].lower()
        for bad in ACCUSATORY:
            assert bad not in text, f"Accusatory word found: {bad}"
        # persistence
        r3 = session.get(f"{API}/signals/{sid}", timeout=15)
        assert r3.json().get("explanation")

    def test_signal_status_patch_creates_audit(self, session):
        sigs = session.get(f"{API}/signals", timeout=15).json()["signals"]
        sid = sigs[0]["id"]
        before = len(session.get(f"{API}/audit-log", timeout=15).json()["events"])
        r = session.patch(f"{API}/signals/{sid}", json={"status": "Under Review"}, timeout=15)
        assert r.status_code == 200
        after = len(session.get(f"{API}/audit-log", timeout=15).json()["events"])
        assert after > before
        got = session.get(f"{API}/signals/{sid}", timeout=15).json()
        assert got["status"] == "Under Review"

    def test_review_note_and_action(self, session):
        rid = session.get(f"{API}/reviews", timeout=15).json()["reviews"][0]["id"]
        note_res = session.post(f"{API}/reviews/{rid}/notes",
                                json={"text": "TEST_note from pytest"}, timeout=15)
        assert note_res.status_code == 200
        assert note_res.json()["text"] == "TEST_note from pytest"
        # verify persisted
        rev = session.get(f"{API}/reviews/{rid}", timeout=15).json()
        assert any(n["text"] == "TEST_note from pytest" for n in rev.get("notes", []))
        # action
        act = session.post(f"{API}/reviews/{rid}/action",
                           json={"action": "acknowledge"}, timeout=15)
        assert act.status_code == 200
        j = act.json()
        assert j["review_status"] == "In Progress"
        assert j["signal_status"] == "Under Review"

    def test_review_action_invalid(self, session):
        rid = session.get(f"{API}/reviews", timeout=15).json()["reviews"][0]["id"]
        r = session.post(f"{API}/reviews/{rid}/action",
                         json={"action": "nope"}, timeout=15)
        assert r.status_code == 400


# ---------- Settings & demo reset ----------
class TestSettings:
    def test_thresholds_patch(self, session):
        r = session.patch(f"{API}/settings/thresholds",
                          json={"watch": 21, "meaningful": 41, "high": 71}, timeout=15)
        assert r.status_code == 200
        assert r.json()["thresholds"]["high"] == 71

    def test_demo_reset(self, session):
        r = session.post(f"{API}/demo/reset", timeout=60)
        assert r.status_code == 200
        # ensure data still present after reset
        r2 = session.get(f"{API}/students", timeout=15)
        assert r2.status_code == 200 and r2.json()["total"] >= 100
