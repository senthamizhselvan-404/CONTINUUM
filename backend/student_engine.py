"""Longitudinal analytics computed from RAW reviewer-supplied academic records.

Given a student's academic_records (per-assignment rows with grades, submission
timing and optional writing samples), rebuild every analytics field the UI
consumes and (re)generate explainable behavioral signals. This is the live path
used when a reviewer adds / imports / updates student data.
"""
from __future__ import annotations
import re
import statistics
from datetime import datetime, timezone

import analytics_engine as ae

SEM_TERMS = {1: "Fall 2024", 2: "Spring 2025", 3: "Fall 2025", 4: "Spring 2026", 5: "Fall 2026"}
WRITING_UNITS = {
    "Avg sentence length": "words", "Vocabulary richness": "TTR",
    "Readability (Flesch)": "score", "Punctuation density": "/100w",
    "Structural consistency": "%", "Stylistic consistency": "%",
}


def sem_num(label) -> int:
    if label is None:
        return 1
    m = re.search(r"(\d+)", str(label))
    return int(m.group(1)) if m else 1


def sem_label(n: int) -> str:
    return f"Semester {n}"


def _count_syllables(word: str) -> int:
    word = word.lower()
    groups = re.findall(r"[aeiouy]+", word)
    return max(1, len(groups))


def extract_features(text: str) -> dict:
    text = (text or "").strip()
    if not text:
        return {}
    words = re.findall(r"[A-Za-z']+", text)
    n = len(words) or 1
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()] or [text]
    ns = len(sentences) or 1
    unique = len(set(w.lower() for w in words))
    punct = len(re.findall(r"[,;:\-()\"']", text))
    syll = sum(_count_syllables(w) for w in words)
    flesch = 206.835 - 1.015 * (n / ns) - 84.6 * (syll / n)
    sent_lens = [len(re.findall(r"[A-Za-z']+", s)) for s in sentences] or [n]
    struct = 100 - min(100, (statistics.pstdev(sent_lens) if len(sent_lens) > 1 else 0) * 6)
    return {
        "Avg sentence length": round(n / ns, 1),
        "Vocabulary richness": round(unique / n * 100, 1),
        "Readability (Flesch)": round(max(0, min(100, flesch)), 1),
        "Punctuation density": round(punct / n * 100, 1),
        "Structural consistency": round(max(0, min(100, struct)), 1),
        "Stylistic consistency": round(max(0, min(100, 100 - abs(50 - unique / n * 100))), 1),
    }


def _hours_before(sub, dl):
    if not sub or not dl:
        return None
    return round((dl - sub).total_seconds() / 3600, 1)


def _describe_hours(h):
    if h is None:
        return "unknown timing"
    if h < 1:
        return "within the final hour before the deadline"
    if h < 6:
        return "a few hours before the deadline"
    if h < 24:
        return "within a day of the deadline"
    return "well ahead of the deadline"


def recompute(student: dict, records: list, thresholds: dict) -> dict:
    """Return analytics fields + a list of generated signal payloads."""
    th = thresholds or {"writing_deviation": 40, "performance_deviation": 45, "submission_pattern": 40}

    # ---- group records by semester -------------------------------------
    by_sem = {}
    for r in records:
        n = sem_num(r.get("semester"))
        by_sem.setdefault(n, []).append(r)
    sem_nums = sorted(by_sem.keys())
    if not sem_nums:
        sem_nums = [student.get("current_semester") or 1]
        by_sem = {sem_nums[0]: []}

    # ---- per-semester aggregates ---------------------------------------
    perf_series, sem_summaries = [], []
    sub_hours_by_sem, writing_by_sem = {}, {}
    for n in sem_nums:
        rows = by_sem[n]
        grades = [float(x["grade"]) for x in rows if x.get("grade") not in (None, "")]
        grade_avg = round(statistics.mean(grades)) if grades else (round(float(student.get("current_gpa"))) if student.get("current_gpa") else 75)
        perf_series.append(grade_avg)

        hours = [_hours_before(x.get("_sub_dt"), x.get("_dl_dt")) for x in rows]
        hours = [h for h in hours if h is not None]
        sub_hours_by_sem[n] = hours

        feats = [extract_features(x.get("writing_sample")) for x in rows if x.get("writing_sample")]
        feats = [f for f in feats if f]
        writing_by_sem[n] = feats

        courses = {}
        for x in rows:
            code = x.get("course_code") or "—"
            courses.setdefault(code, {"code": code, "name": x.get("course_name") or code, "grades": []})
            if x.get("grade") not in (None, ""):
                courses[code]["grades"].append(float(x["grade"]))
        course_list = [{"code": c["code"], "name": c["name"],
                        "grade": round(statistics.mean(c["grades"])) if c["grades"] else grade_avg}
                       for c in courses.values()]
        sem_summaries.append({
            "num": n, "id": f"s{n}", "label": sem_label(n), "term": SEM_TERMS.get(n, f"Term {n}"),
            "courses": course_list, "grade_avg": grade_avg, "submissions": len(rows),
        })

    # ---- factor deviations ---------------------------------------------
    # performance
    perf_analysis = ae.analyze_performance_volatility([float(x) for x in perf_series])
    longitudinal = ae.calculate_longitudinal_trend([float(x) for x in perf_series])
    if len(perf_series) > 1:
        hist_mean = statistics.mean(perf_series[:-1])
        perf_dev = min(100, abs(perf_series[-1] - hist_mean) / max(hist_mean, 1) * 100 * 2.4)
    else:
        perf_dev = 0.0

    # submission
    hist_hours = [h for n in sem_nums[:-1] for h in sub_hours_by_sem.get(n, [])]
    recent_hours = sub_hours_by_sem.get(sem_nums[-1], [])
    if hist_hours and recent_hours:
        hm, rm = statistics.mean(hist_hours), statistics.mean(recent_hours)
        sub_dev = min(100, max(0, (hm - rm) / max(hm, 1) * 100))
    else:
        sub_dev = 0.0

    # writing
    hist_feats = [f for n in sem_nums[:-1] for f in writing_by_sem.get(n, [])]
    recent_feats = writing_by_sem.get(sem_nums[-1], [])
    writing_features, writing_devs = [], []
    if hist_feats and recent_feats:
        for name in WRITING_UNITS:
            hv = statistics.mean([f[name] for f in hist_feats])
            cv = statistics.mean([f[name] for f in recent_feats])
            d = abs(cv - hv) / max(abs(hv), 1) * 100
            writing_devs.append(min(100, d))
            writing_features.append({"feature": name, "unit": WRITING_UNITS[name],
                                     "historical": round(hv, 1), "current": round(cv, 1),
                                     "deviation": round(min(100, d))})
        writing_dev = min(100, statistics.mean(writing_devs) * 1.4)
    else:
        base = recent_feats or hist_feats
        for name in WRITING_UNITS:
            v = round(statistics.mean([f[name] for f in base]), 1) if base else 0
            writing_features.append({"feature": name, "unit": WRITING_UNITS[name],
                                     "historical": v, "current": v, "deviation": 0})
        writing_dev = 0.0

    factors = {"writing": round(writing_dev), "submission": round(sub_dev),
               "performance": round(perf_dev), "longitudinal": round(longitudinal)}
    index = ae.deviation_index(writing_dev, sub_dev, perf_dev, longitudinal)
    band = ae.deviation_band(index)

    # ---- baseline & descriptors ----------------------------------------
    baseline = {
        "Writing Consistency": {"historical": "Stable", "current": ae.classify_deviation(writing_dev)},
        "Submission Timing": {"historical": "Stable", "current": ae.classify_deviation(sub_dev)},
        "Academic Performance": {"historical": "Stable", "current": ae.classify_deviation(perf_dev)},
        "Behavioral Stability": {"historical": "Stable", "current": band["label"]},
    }
    for s in sem_summaries:
        recent = s["num"] == sem_nums[-1]
        s["stability"] = "Significant" if (recent and index >= 71) else "Moderate" if (recent and index >= 41) else "Stable"
        s["signals"] = 1 if (recent and index >= 41) else 0
    for s in sem_summaries:
        del s["num"]

    recent_desc = (f"Recent submissions were made {_describe_hours(statistics.mean(recent_hours))}."
                   if recent_hours else "No recent submission-timing data.")
    sub_label = "Meaningful pattern change" if sub_dev >= th["submission_pattern"] else ("Minor pattern change" if sub_dev >= 20 else "Consistent with baseline")
    submission_behavior = {
        "historical": (f"Typically submits ~{round(statistics.mean(hist_hours))}h before deadline." if hist_hours else "Insufficient history."),
        "recent": recent_desc, "label": sub_label, "deviation": round(sub_dev),
        "timeline": (hist_hours[-4:] + recent_hours)[-8:] or [],
    }

    # ---- signal generation ---------------------------------------------
    signals = []
    high = []
    if writing_dev >= th["writing_deviation"]:
        high.append(("writing", "Writing Drift"))
    if sub_dev >= th["submission_pattern"]:
        high.append(("submission", "Submission Pattern Shift"))
    if perf_dev >= th["performance_deviation"]:
        high.append(("performance", "Performance Volatility"))
    if longitudinal >= 45:
        high.append(("longitudinal", "Cross-Semester Drift"))

    if high:
        stype = "Multi-Signal Deviation" if len(high) >= 3 else high[0][1]
        severity = "High" if index > 70 else "Moderate" if index > 40 else "Low"
        last = sem_summaries[-1]
        course = last["courses"][0] if last["courses"] else {"code": "—", "name": "—"}
        signals.append({
            "signal_type": stype, "severity": severity, "status": "New",
            "course_code": course["code"], "course_name": course["name"],
            "semester": last["label"], "semester_term": last["term"],
            "factors": factors, "deviation_index": index, "band": band,
            "explanation": ae.generate_explanation({"factors": factors}),
            "explanation_source": "prototype",
        })

    return {
        "deviation_index": index, "band": band, "status_label": ae.status_label(index),
        "factors": factors, "baseline": baseline, "writing_features": writing_features,
        "performance": perf_analysis, "submission_behavior": submission_behavior,
        "semesters": sem_summaries,
        "trend": "down" if perf_series[-1] < perf_series[0] else "up" if perf_series[-1] > perf_series[0] else "flat",
        "generated_signals": signals,
    }
