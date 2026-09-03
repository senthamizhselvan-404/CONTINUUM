"""
CONTINUUM — Behavioral Analytics Engine (deterministic synthetic MVP).

This is a deterministic abstraction, NOT a scientifically validated detector.
It is architected so a future ML model / LLM can replace these functions without
changing the API surface consumed by the rest of the application.

Conceptual pipeline:
    ACADEMIC DATA -> NORMALIZATION -> FEATURE EXTRACTION -> BEHAVIORAL BASELINE
    -> LONGITUDINAL ANALYTICS -> DRIFT DETECTION -> RISK SIGNAL -> EXPLANATION
"""
from __future__ import annotations

# Contribution weights for the Prototype Behavioral Deviation Index.
WEIGHTS = {
    "writing": 0.30,
    "submission": 0.35,
    "performance": 0.20,
    "longitudinal": 0.15,
}


def classify_deviation(pct: float) -> str:
    """Map a 0-100 deviation percentage to a non-accusatory descriptor."""
    if pct < 18:
        return "Stable"
    if pct < 45:
        return "Moderate deviation"
    return "Significant deviation"


def deviation_band(score: float) -> dict:
    """Prototype Behavioral Deviation Index bands (0-100)."""
    if score <= 20:
        return {"key": "stable", "label": "Stable", "range": "0–20"}
    if score <= 40:
        return {"key": "watch", "label": "Watch", "range": "21–40"}
    if score <= 70:
        return {"key": "meaningful", "label": "Meaningful deviation", "range": "41–70"}
    return {"key": "high", "label": "High deviation", "range": "71–100"}


def status_label(score: float) -> str:
    if score <= 20:
        return "Baseline stable"
    if score <= 40:
        return "Monitoring"
    if score <= 70:
        return "Recent behavioral deviation"
    return "High deviation"


def build_baseline(historical_metrics: dict) -> dict:
    """buildBaseline() — establish the student's historical behavioral baseline."""
    return {k: {"historical": "Stable", **v} for k, v in historical_metrics.items()}


def analyze_writing_drift(writing_pct: float) -> dict:
    return {
        "deviation": round(writing_pct),
        "classification": classify_deviation(writing_pct),
        "historical": "Low variation",
        "current": classify_deviation(writing_pct),
    }


def analyze_performance_volatility(values: list[float]) -> dict:
    hist = values[:-1] if len(values) > 1 else values
    lo, hi = min(hist), max(hist)
    current = values[-1]
    outside = current < lo - 3 or current > hi + 3
    return {
        "series": values,
        "historical_range": [round(lo), round(hi)],
        "current": round(current),
        "outside_baseline": outside,
    }


def analyze_submission_patterns(submission_pct: float) -> dict:
    return {
        "deviation": round(submission_pct),
        "classification": classify_deviation(submission_pct),
    }


def calculate_longitudinal_trend(series: list[float]) -> float:
    """Normalized magnitude of recent change vs historical mean (0-100)."""
    if len(series) < 2:
        return 0.0
    hist = series[:-1]
    mean = sum(hist) / len(hist)
    if mean == 0:
        return 0.0
    delta = abs(series[-1] - mean) / mean * 100
    return round(min(delta * 2.2, 100), 1)


def deviation_index(writing: float, submission: float, performance: float,
                    longitudinal: float) -> int:
    """generate the Prototype Behavioral Change Index (0-100)."""
    score = (
        writing * WEIGHTS["writing"]
        + submission * WEIGHTS["submission"]
        + performance * WEIGHTS["performance"]
        + longitudinal * WEIGHTS["longitudinal"]
    )
    return int(round(min(max(score, 0), 100)))


def calculate_confidence(factors: dict, evidence_count: int = 3, persistence: int = 1) -> int:
    """Confidence that an observed change is meaningful — independent of severity.

    Severity measures the MAGNITUDE of deviation. Confidence measures how much
    EVIDENCE supports treating that deviation as a real, persistent pattern
    (how many dimensions agree, how many observations it spans, how long it
    has persisted) rather than noise. A large one-off deviation can carry low
    confidence; a moderate but well-evidenced, repeated deviation can carry
    high confidence.
    """
    dims = [factors.get("writing", 0), factors.get("submission", 0), factors.get("performance", 0)]
    agreeing = len([v for v in dims if v >= 30])
    avg_dev = sum(dims) / max(1, len(dims))
    conf = 42 + agreeing * 11 + min(20, avg_dev * 0.22) + min(12, evidence_count * 2.4) + min(10, persistence * 2.5)
    return int(round(min(97, max(32, conf))))


def multi_signal_agreement(factors: dict, threshold: int = 30) -> int:
    """How many independent behavioral dimensions cross the deviation threshold together."""
    dims = [factors.get("writing", 0), factors.get("submission", 0), factors.get("performance", 0)]
    return len([v for v in dims if v >= threshold])


def review_priority(severity: str, confidence: int, agreement: int, persistence: int) -> dict:
    """Internal review-priority label (not a guilt score) explaining why a case ranks where it does."""
    weight = {"High": 3, "Moderate": 2, "Low": 1}.get(severity, 1)
    score = weight * 10 + agreement * 6 + persistence * 2 + (confidence >= 70) * 8
    if score >= 34:
        label = "High"
    elif score >= 22:
        label = "Moderate"
    else:
        label = "Low"
    dims = agreement
    explanation = (
        f"{dims} behavioral dimension{'s' if dims != 1 else ''} changed together across "
        f"{persistence} consecutive observation{'s' if persistence != 1 else ''}, with "
        f"{'strong' if confidence >= 70 else 'moderate' if confidence >= 50 else 'limited'} supporting evidence."
    )
    return {"label": label, "explanation": explanation}


def change_breakdown(factors: dict) -> tuple[list, int]:
    """Decompose the Behavioral Change Index into the contributing factors that moved it,
    e.g. for a 'Why did this change?' breakdown. Returns (breakdown_list, total_points) where
    total_points is exactly the sum of the listed points, so callers can derive a consistent
    'previous period' baseline as current_index - total_points.
    """
    parts = [
        ("Submission timing", "submission"),
        ("Writing characteristics", "writing"),
        ("Grade variation", "performance"),
        ("Course activity", "longitudinal"),
    ]
    breakdown = [{"label": label, "points": round(factors.get(key, 0) * WEIGHTS[key] / 2)} for label, key in parts]
    total = sum(b["points"] for b in breakdown)
    return breakdown, total


def baseline_maturity(observation_count: int) -> dict:
    """How much historical signal exists to compare current behavior against.

    Anomaly detection is weak without history — a new student's first few
    submissions should never read as highly anomalous just because there is
    not yet enough data to know what 'normal' looks like for them.
    """
    if observation_count >= 8:
        return {"key": "established", "label": "Established",
                "detail": f"Baseline established after {observation_count} academic submissions."}
    if observation_count >= 3:
        return {"key": "developing", "label": "Developing",
                "detail": f"{observation_count} submissions observed — baseline still developing."}
    return {"key": "building", "label": "Building",
            "detail": f"{observation_count} submission(s) observed — Continuum needs more history before drawing comparisons."}


def generate_risk_signal(student_name: str, writing: float, submission: float,
                         performance: float, longitudinal: float) -> dict:
    """generateRiskSignal() — assemble an explainable signal payload."""
    index = deviation_index(writing, submission, performance, longitudinal)
    factors = {
        "writing": round(writing),
        "submission": round(submission),
        "performance": round(performance),
        "longitudinal": round(longitudinal),
    }
    dominant = max(factors, key=factors.get)
    type_map = {
        "writing": "Writing Drift",
        "submission": "Submission Pattern Shift",
        "performance": "Performance Volatility",
        "longitudinal": "Cross-Semester Drift",
    }
    high_factors = [k for k, v in factors.items() if v >= 40]
    signal_type = "Multi-Signal Deviation" if len(high_factors) >= 3 else type_map[dominant]
    severity = "High" if index > 70 else "Moderate" if index > 40 else "Low"
    return {
        "index": index,
        "band": deviation_band(index),
        "factors": factors,
        "signal_type": signal_type,
        "severity": severity,
    }


def generate_explanation(signal: dict) -> str:
    """generateExplanation() — deterministic fallback explanation (LLM optional)."""
    f = signal["factors"]
    parts = []
    if f["writing"] >= 40:
        parts.append("recent writing-style features differ meaningfully from the historical profile")
    if f["submission"] >= 40:
        parts.append("submission timing has shifted toward deadline proximity")
    if f["performance"] >= 40:
        parts.append("academic performance moved outside the historical range")
    if f["longitudinal"] >= 40:
        parts.append("the multi-semester trend shows a notable change")
    if not parts:
        parts.append("minor variations were observed within expected bounds")
    body = "; ".join(parts)
    return (
        f"Across the previous semesters this student maintained a stable behavioral baseline. "
        f"In the most recent observation window, {body}. "
        f"This is a behavioral pattern change surfaced for educator review — it is not evidence "
        f"of misconduct and does not determine academic integrity outcomes."
    )
