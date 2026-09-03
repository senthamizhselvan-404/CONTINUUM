"""
CONTINUUM iteration 2 backend tests — Reviewer Data Management flows.
Covers: POST /api/students, import template/preview/commit/demo, add records,
records import, students-stats, longitudinal append, audit integration.
Uses public REACT_APP_BACKEND_URL via demo-auth session cookie.
"""
import io
import os
import csv
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    """Educator session — student data management endpoints are educator-only."""
    s = requests.Session()
    email = f"edu_mgmt_{uuid.uuid4().hex[:10]}@northbridge.test"
    r = s.post(f"{API}/auth/educator/register", json={
        "name": "Dr. Data Mgmt", "email": email, "password": "testpass123",
    }, timeout=30)
    assert r.status_code == 200, r.text
    return s


def _uniq_sid(prefix="STU-TEST"):
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


def _sample_csv(sids):
    """Build a CSV with 3 semesters/records per student. sids: list of student_ids."""
    header = [
        "student_id", "student_name", "email", "department", "program", "year",
        "semester", "course_code", "course_name", "assignment_name",
        "submission_timestamp", "deadline_timestamp", "grade", "writing_sample",
    ]
    rows = []
    for sid in sids:
        rows.append([sid, f"Test {sid}", f"{sid.lower()}@test.edu", "Computer Science",
                     "B.Sc Computer Science", "2", "1", "CS101", "Intro",
                     "A1 Essay", "2025-01-14 18:20", "2025-01-16 23:59", "85",
                     "The algorithm processes data sequentially."])
        rows.append([sid, f"Test {sid}", f"{sid.lower()}@test.edu", "Computer Science",
                     "B.Sc Computer Science", "2", "2", "CS102", "Data Structures",
                     "A2 Report", "2025-05-02 14:05", "2025-05-04 23:59", "82",
                     "Balanced trees maintain logarithmic height."])
        rows.append([sid, f"Test {sid}", f"{sid.lower()}@test.edu", "Computer Science",
                     "B.Sc Computer Science", "2", "3", "CS204", "Algorithms",
                     "Project", "2025-11-10 09:30", "2025-11-12 23:59", "80",
                     "We measured collision rates under varying load factors."])
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue().encode()


# --------- Add Student ---------
class TestAddStudent:
    def test_add_student_success(self, session):
        sid = _uniq_sid()
        payload = {"student_id": sid, "full_name": "TEST_Ada Lovelace",
                   "email": "ada@test.edu", "department": "Computer Science",
                   "program": "B.Sc Computer Science", "year": "2",
                   "current_semester": "3", "current_gpa": "3.6",
                   "advisor": "Dr. Turing"}
        r = session.post(f"{API}/students", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and data["student_id"] == sid
        # GET to verify persistence
        g = session.get(f"{API}/students/{data['id']}", timeout=15)
        assert g.status_code == 200
        sd = g.json()
        assert sd["name"] == "TEST_Ada Lovelace"
        assert sd["student_id"] == sid
        assert "academic_history" in sd and "submissions" in sd and "audit_trail" in sd
        # audit event created
        assert any(a.get("action") == "Student added" for a in sd["audit_trail"])

    def test_add_student_duplicate_409(self, session):
        sid = _uniq_sid()
        p = {"student_id": sid, "full_name": "TEST_Dup User"}
        r1 = session.post(f"{API}/students", json=p, timeout=15)
        assert r1.status_code == 200
        r2 = session.post(f"{API}/students", json=p, timeout=15)
        assert r2.status_code == 409

    def test_add_student_missing_required_400(self, session):
        r = session.post(f"{API}/students", json={"full_name": "no id"}, timeout=15)
        assert r.status_code == 400
        r2 = session.post(f"{API}/students", json={"student_id": "X"}, timeout=15)
        assert r2.status_code == 400


# --------- Import Template ---------
class TestImportTemplate:
    def test_template_csv(self, session):
        r = session.get(f"{API}/students/import/template", timeout=15)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert "attachment" in r.headers.get("content-disposition", "").lower()
        text = r.text
        assert text.startswith("student_id,student_name")
        assert "writing_sample" in text.splitlines()[0]
        assert len(text.splitlines()) >= 2  # header + example rows


# --------- Import Preview + Commit ---------
class TestImportFlow:
    def test_preview_no_persist(self, session):
        sids = [_uniq_sid("STU-IMP"), _uniq_sid("STU-IMP")]
        csv_bytes = _sample_csv(sids)
        files = {"file": ("test.csv", csv_bytes, "text/csv")}
        r = session.post(f"{API}/students/import/preview", files=files, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["summary"]["total_records"] == 6
        assert d["summary"]["students"] == 2
        assert d["summary"]["new_students"] == 2
        assert d["summary"]["existing_students"] == 0
        assert len(d["preview"]) >= 2
        assert all(p["status"] == "New" for p in d["preview"])
        # Ensure not persisted
        for sid in sids:
            g = session.get(f"{API}/students?q={sid}", timeout=15)
            assert not any(s["student_id"] == sid for s in g.json()["students"]), \
                "preview must not persist"

    def test_commit_creates_then_updates(self, session):
        sids = [_uniq_sid("STU-CMT")]
        csv_bytes = _sample_csv(sids)
        # First commit: creates
        r1 = session.post(f"{API}/students/import/commit",
                          files={"file": ("t.csv", csv_bytes, "text/csv")}, timeout=45)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["created"] == 1 and d1["updated"] == 0
        # Second commit: updates (no dup students)
        r2 = session.post(f"{API}/students/import/commit",
                          files={"file": ("t.csv", csv_bytes, "text/csv")}, timeout=45)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["created"] == 0 and d2["updated"] == 1
        # Verify no duplicate student rows for sid
        listr = session.get(f"{API}/students?q={sids[0]}", timeout=15)
        matches = [s for s in listr.json()["students"] if s["student_id"] == sids[0]]
        assert len(matches) == 1

    def test_import_demo(self, session):
        r = session.post(f"{API}/students/import/demo", timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert (d["created"] + d["updated"]) >= 1


# --------- Manual record + records upload ---------
class TestRecords:
    @pytest.fixture(scope="class")
    def new_student_id(self, session):
        sid = _uniq_sid("STU-REC")
        r = session.post(f"{API}/students",
                         json={"student_id": sid, "full_name": "TEST_Records Student",
                               "department": "Computer Science", "year": "2"}, timeout=15)
        assert r.status_code == 200
        return r.json()["id"]

    def test_add_record_and_persist(self, session, new_student_id):
        # Add first semester baseline records
        for i in range(1, 3):
            body = {"semester": str(i), "course_code": f"CS10{i}",
                    "course_name": "Course", "assignment_name": f"HW{i}",
                    "submission_date": "2025-01-10 18:00",
                    "deadline": "2025-01-16 23:59", "grade": "88",
                    "writing_sample": "The algorithm is efficient and processes data linearly."}
            r = session.post(f"{API}/students/{new_student_id}/records",
                             json=body, timeout=30)
            assert r.status_code == 200
            assert r.json()["ok"] is True
        # Now large grade drop + near-deadline + divergent writing sample
        r = session.post(f"{API}/students/{new_student_id}/records",
                         json={"semester": "3", "course_code": "CS204",
                               "course_name": "Project", "assignment_name": "Capstone",
                               "submission_date": "2025-11-12 23:30",
                               "deadline": "2025-11-12 23:59", "grade": "45",
                               "writing_sample": ("Furthermore the intricate paradigmatic "
                                                  "framework elucidates the sophisticated "
                                                  "methodological underpinnings herein.")},
                         timeout=30)
        assert r.status_code == 200
        # Verify longitudinal history has 3 semesters
        g = session.get(f"{API}/students/{new_student_id}", timeout=15)
        assert g.status_code == 200
        sd = g.json()
        assert len(sd["academic_history"]) >= 3
        assert len(sd["submissions"]) >= 3
        # Audit trail should show record-add events
        assert any(a.get("action") == "Academic record added" for a in sd["audit_trail"])

    def test_records_import(self, session, new_student_id):
        csv_bytes = _sample_csv([_uniq_sid("IGNORED")])  # sid ignored; appended anyway
        r = session.post(f"{API}/students/{new_student_id}/records/import",
                         files={"file": ("r.csv", csv_bytes, "text/csv")}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["added"] == 3


# --------- Students stats + audit ---------
class TestStatsAndAudit:
    def test_students_stats(self, session):
        r = session.get(f"{API}/students-stats", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["total", "new_this_month", "active_signals", "require_review",
                  "with_signals", "recent_activity"]:
            assert k in d
        assert isinstance(d["recent_activity"], list)
        assert d["total"] >= 100

    def test_audit_log_reflects_recent(self, session):
        # Trigger a new event
        sid = _uniq_sid("STU-AUD")
        r = session.post(f"{API}/students",
                         json={"student_id": sid, "full_name": "TEST_Audit Trail"},
                         timeout=15)
        assert r.status_code == 200
        log = session.get(f"{API}/audit-log", timeout=15).json()["events"]
        assert any(e.get("action") == "Student added" and sid in e.get("description", "")
                   for e in log)


# --------- Regression: seeded Arjun still renders ---------
class TestRegression:
    def test_arjun_profile_intact(self, session):
        r = session.get(f"{API}/search?q=arjun", timeout=15)
        assert r.status_code == 200
        students = r.json()["students"]
        assert students
        sid = students[0]["id"]
        d = session.get(f"{API}/students/{sid}", timeout=15).json()
        assert "arjun" in d["name"].lower()
        # longitudinal sections present
        for k in ["academic_history", "submissions", "audit_trail", "baseline",
                  "performance", "semesters", "signals"]:
            assert k in d

    def test_signal_llm_explain(self, session):
        sigs = session.get(f"{API}/signals", timeout=15).json()["signals"]
        assert sigs
        sid = sigs[0]["id"]
        r = session.post(f"{API}/signals/{sid}/explain", timeout=60)
        assert r.status_code == 200
        assert r.json().get("explanation")
