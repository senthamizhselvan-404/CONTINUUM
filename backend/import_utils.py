"""CSV / XLSX parsing + import summary utilities for reviewer student imports."""
from __future__ import annotations
import io
import csv
from datetime import datetime
from dateutil import parser as dtparser

import pandas as pd

TEMPLATE_COLUMNS = [
    "student_id", "student_name", "email", "department", "program", "year",
    "semester", "course_code", "course_name", "assignment_name",
    "submission_timestamp", "deadline_timestamp", "grade", "writing_sample",
]

TEMPLATE_ROWS = [
    ["STU-2024-2001", "Jordan Ellis", "jordan.ellis@northbridge.edu", "Computer Science", "B.Sc Computer Science", "2", "1", "CS101", "Intro to Programming", "A1 Essay", "2025-01-14 18:20", "2025-01-16 23:59", "78", "The algorithm processes each element sequentially, evaluating conditions before proceeding."],
    ["STU-2024-2001", "Jordan Ellis", "jordan.ellis@northbridge.edu", "Computer Science", "B.Sc Computer Science", "2", "2", "CS102", "Data Structures", "A2 Report", "2025-05-02 14:05", "2025-05-04 23:59", "81", "A balanced tree maintains logarithmic height, which keeps lookups efficient across insertions."],
    ["STU-2024-2001", "Jordan Ellis", "jordan.ellis@northbridge.edu", "Computer Science", "B.Sc Computer Science", "2", "3", "CS204", "Data Structures", "Project", "2025-11-10 09:30", "2025-11-12 23:59", "82", "We compared hashing strategies and measured collision rates under varying load factors."],
    ["STU-2024-2002", "Sofia Marchetti", "sofia.m@northbridge.edu", "Mathematics", "B.Sc Mathematics", "3", "1", "MA201", "Linear Algebra", "Problem Set", "2025-01-15 08:10", "2025-01-16 23:59", "88", "The transformation preserves the inner product, hence it is orthogonal by definition."],
]


def build_template_csv() -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(TEMPLATE_COLUMNS)
    w.writerows(TEMPLATE_ROWS)
    return buf.getvalue()


def _parse_dt(v):
    if v in (None, "") or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, datetime):
        return v
    try:
        return dtparser.parse(str(v))
    except Exception:
        return None


def parse_upload(filename: str, content: bytes) -> tuple[list, list]:
    """Return (rows, errors). Each row is a normalized dict."""
    errors = []
    name = (filename or "").lower()
    try:
        if name.endswith(".xlsx") or name.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content), dtype=str)
        else:
            df = pd.read_csv(io.BytesIO(content), dtype=str)
    except Exception as e:
        return [], [f"Could not parse file: {e}"]

    df.columns = [str(c).strip().lower() for c in df.columns]
    missing = [c for c in ["student_id", "student_name"] if c not in df.columns]
    if missing:
        return [], [f"Missing required column(s): {', '.join(missing)}"]

    rows = []
    for i, rec in df.iterrows():
        g = lambda k: (None if k not in df.columns or pd.isna(rec.get(k)) else str(rec.get(k)).strip())
        sid = g("student_id")
        if not sid:
            errors.append(f"Row {i + 2}: missing student_id (skipped)")
            continue
        grade = g("grade")
        try:
            grade = float(grade) if grade not in (None, "") else None
        except Exception:
            grade = None
            errors.append(f"Row {i + 2}: invalid grade (ignored)")
        rows.append({
            "student_id": sid, "student_name": g("student_name"), "email": g("email"),
            "department": g("department"), "program": g("program"), "year": g("year"),
            "semester": g("semester"), "course_code": g("course_code"), "course_name": g("course_name"),
            "assignment_name": g("assignment_name"),
            "submission_timestamp": g("submission_timestamp"), "deadline_timestamp": g("deadline_timestamp"),
            "grade": grade, "writing_sample": g("writing_sample"),
        })
    return rows, errors


def summarize(rows: list, existing_ids: set) -> dict:
    students = {}
    for r in rows:
        students.setdefault(r["student_id"], []).append(r)
    new_ids = [s for s in students if s not in existing_ids]
    existing = [s for s in students if s in existing_ids]
    courses = {r.get("course_code") for r in rows if r.get("course_code")}
    semesters = {r.get("semester") for r in rows if r.get("semester")}
    return {
        "total_records": len(rows),
        "students": len(students),
        "new_students": len(new_ids),
        "existing_students": len(existing),
        "courses": len([c for c in courses if c]),
        "semesters": len([s for s in semesters if s]),
        "new_student_ids": new_ids,
        "existing_student_ids": existing,
    }
