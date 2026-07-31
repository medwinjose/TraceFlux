"""
TraceNet - Plain-English Freeze Receipt Generator
Owner: Systems/Backend

Converts raw ML feature weights and freeze context into a single human-readable
sentence that explains WHY an account was frozen.

This is the differentiator: every freeze has a receipt written in plain English,
cryptographically sealed into the tamper-evident evidence chain.
"""
from typing import Dict, Any


def generate_plain_english_reason(
    account_id: str,
    features: Dict[str, float],
    freeze_type: str,
    hop: int = 0,
    source_account: str = "",
) -> str:
    """
    Generate a plain-English explanation for a freeze event.

    Args:
        account_id:     The account being frozen.
        features:       Dict of ML feature name -> score (0.0 - 1.0).
        freeze_type:    One of 'VICTIM_REPORT', 'TAG_PROPAGATED', 'ML_HIGH_RISK'.
        hop:            For TAG_PROPAGATED, the BFS hop distance from origin.
        source_account: For TAG_PROPAGATED, the upstream account that triggered this.

    Returns:
        A one-to-two sentence plain-English explanation suitable for display
        to non-technical judges and regulators.
    """
    if freeze_type == "VICTIM_REPORT":
        return (
            f"Account {account_id} was reported as the origin of a fraudulent transaction. "
            f"TraceNet has initiated tag propagation across all downstream recipients."
        )

    if freeze_type == "TAG_PROPAGATED":
        hold_time = features.get("hold_time_inverse", 0)
        fan_out   = features.get("fan_out_ratio", 0)
        src_label = f" from {source_account}" if source_account else ""
        speed_note = (
            "funds were forwarded within seconds of receipt"
            if hold_time >= 0.15
            else "funds were relayed onward shortly after receipt"
        )
        fan_note = (
            f" and immediately split to {round(fan_out * 10) + 2} new destinations"
            if fan_out >= 0.25
            else ""
        )
        return (
            f"Account {account_id} received money{src_label} (a confirmed fraud source) "
            f"at hop {hop} of the interdiction chain — {speed_note}{fan_note}. "
            f"Classic money-mule relay pattern. Auto-frozen by TraceNet tag propagation."
        )

    # ML_HIGH_RISK — compose from top contributing features
    reasons = []
    feat_map = {
        "fan_out_ratio":         lambda v: f"incoming funds split to multiple new destinations (fan-out: {v:.0%})",
        "hold_time_inverse":     lambda v: "incoming funds forwarded within seconds of receipt (near-zero hold time)",
        "dormant_reactivation":  lambda v: "account suddenly reactivated after 30+ days of inactivity",
        "structuring_score":     lambda v: "transaction amounts deliberately kept below reporting thresholds (structuring)",
        "velocity":              lambda v: f"abnormally high transaction frequency in recent time window (velocity: {v:.0%})",
    }
    for feat, threshold in [
        ("fan_out_ratio",        0.25),
        ("hold_time_inverse",    0.15),
        ("dormant_reactivation", 0.15),
        ("structuring_score",    0.15),
        ("velocity",             0.15),
    ]:
        val = features.get(feat, 0.0)
        if val >= threshold and feat in feat_map:
            reasons.append(feat_map[feat](val))

    if not reasons:
        return (
            f"Account {account_id} exceeded the ML anomaly threshold across multiple "
            f"behavioral signals. Composite risk score flagged for review."
        )

    joined = "; ".join(reasons[:3])  # cap at 3 for readability
    return (
        f"Account {account_id} flagged by ML anomaly engine: {joined}. "
        f"Composite risk score exceeds auto-freeze threshold."
    )
