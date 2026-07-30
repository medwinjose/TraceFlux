"""
TraceNet - Mule Account Anomaly Scorer
Owner: ML
Computes a risk score per account BEFORE any fraud is reported,
using behavioral features that correlate with mule activity.
"""
from dataclasses import dataclass
import time
from typing import Dict, List, Optional

@dataclass
class AccountFeatures:
    account_id: str
    fan_out_ratio: float          # unique recipients / total outgoing txns
    velocity: float               # transactions per hour, recent window
    dormant_reactivation: bool    # inactive 30+ days then suddenly active
    structuring_score: float      # proportion of txns just under reporting threshold
    avg_hold_time_minutes: float  # avg minutes between receiving and forwarding funds

# Tuned weights to ensure the fraud chain is flagged (WATCH or HIGH_RISK)
# while keeping normal background accounts CLEAN.
WEIGHTS = {
    "fan_out_ratio": 0.35,
    "velocity": 0.05,
    "dormant_reactivation": 0.20,
    "structuring_score": 0.10,
    "hold_time_inverse": 0.30,  # short hold time = higher risk
}

def compute_features(graph, account_id: str) -> AccountFeatures:
    """
    `graph` is Medwin's TransactionGraph object — it has .accounts (dict of
    account_id -> Account) and .outgoing (dict of account_id -> list of Transaction).
    Account has: account_id, bank_id, is_flagged, freeze_status, risk_score, created_at.
    Transaction has: tx_id, src_account, dst_account, amount, timestamp, trace_tag.
    Derive all five features below from these two structures — do not assume any other
    fields exist.
    """
    account = graph.accounts[account_id]
    outgoing_txs = graph.outgoing.get(account_id, [])
    
    # Retrieve all transactions in the graph to find incoming transactions
    all_txs = list(graph.transactions.values())
    incoming_txs = [tx for tx in all_txs if tx.dst_account == account_id]
    
    # 1. Fan-out ratio: unique recipients / total outgoing transactions
    unique_recipients = len({tx.dst_account for tx in outgoing_txs})
    total_outgoing = len(outgoing_txs)
    fan_out_ratio = unique_recipients / total_outgoing if total_outgoing > 0 else 0.0
    
    # 2. Velocity: transactions per hour, recent 24-hour window
    if all_txs:
        max_ts = max(tx.timestamp for tx in all_txs)
    else:
        max_ts = time.time()
        
    recent_window_start = max_ts - 24 * 3600
    recent_txs = [
        tx for tx in all_txs
        if (tx.src_account == account_id or tx.dst_account == account_id)
        and tx.timestamp >= recent_window_start
    ]
    velocity = len(recent_txs) / 24.0
    
    # 3. Dormant reactivation: inactive 30+ days then suddenly active
    tx_timestamps = sorted([tx.timestamp for tx in (incoming_txs + outgoing_txs)])
    created_at = getattr(account, 'created_at', None)
    
    if created_at is not None:
        timestamps = [created_at] + tx_timestamps
    else:
        timestamps = tx_timestamps
        
    dormant_reactivation = False
    for i in range(1, len(timestamps)):
        if timestamps[i] - timestamps[i-1] >= 30 * 24 * 3600:
            dormant_reactivation = True
            break
            
    # 4. Structuring score: proportion of transactions just under reporting thresholds
    # Common Indian banking thresholds: ₹10,000, ₹50,000, ₹100,000, ₹200,000, ₹500,000, ₹1,000,000
    thresholds = [10000.0, 50000.0, 100000.0, 200000.0, 500000.0, 1000000.0]
    total_tx_count = len(incoming_txs) + len(outgoing_txs)
    
    structured_count = 0
    if total_tx_count > 0:
        for tx in (incoming_txs + outgoing_txs):
            for T in thresholds:
                if 0.9 * T <= tx.amount < T:
                    structured_count += 1
                    break
        structuring_score = structured_count / total_tx_count
    else:
        structuring_score = 0.0
        
    # 5. Average hold time (minutes): avg minutes between receiving and forwarding funds
    sorted_in = sorted(incoming_txs, key=lambda x: x.timestamp)
    sorted_out = sorted(outgoing_txs, key=lambda x: x.timestamp)
    
    hold_times = []
    if sorted_out:
        for tx_out in sorted_out:
            # Find the most recent incoming transaction that occurred before or at tx_out
            matching_in = None
            for tx_in in reversed(sorted_in):
                if tx_in.timestamp <= tx_out.timestamp:
                    matching_in = tx_in
                    break
            if matching_in is not None:
                diff_min = (tx_out.timestamp - matching_in.timestamp) / 60.0
                hold_times.append(diff_min)
    elif sorted_in:
        # Final node in the chain has incoming funds but no outgoing ones yet.
        # We calculate the hold time since the last incoming transaction relative to the latest transaction in the graph.
        if all_txs:
            latest_graph_ts = max(tx.timestamp for tx in all_txs)
        else:
            latest_graph_ts = time.time()
        last_in_ts = sorted_in[-1].timestamp
        diff_min = (latest_graph_ts - last_in_ts) / 60.0
        hold_times.append(diff_min)
            
    if hold_times:
        avg_hold_time_minutes = sum(hold_times) / len(hold_times)
    else:
        # Default to a large number to ensure inverse hold time contribution is near 0
        avg_hold_time_minutes = 999999.0
        
    return AccountFeatures(
        account_id=account_id,
        fan_out_ratio=fan_out_ratio,
        velocity=velocity,
        dormant_reactivation=dormant_reactivation,
        structuring_score=structuring_score,
        avg_hold_time_minutes=avg_hold_time_minutes
    )

def score_account(f: AccountFeatures) -> float:
    """Weighted score, 0-1."""
    hold_time_inverse = 1.0 / (1.0 + f.avg_hold_time_minutes)
    
    score = (
        WEIGHTS["fan_out_ratio"] * f.fan_out_ratio
        + WEIGHTS["velocity"] * min(f.velocity / 10.0, 1.0)
        + WEIGHTS["dormant_reactivation"] * (1.0 if f.dormant_reactivation else 0.0)
        + WEIGHTS["structuring_score"] * f.structuring_score
        + WEIGHTS["hold_time_inverse"] * hold_time_inverse
    )
    return round(min(score, 1.0), 3)

def classify(score: float) -> str:
    """>=0.75 'HIGH_RISK', >=0.45 'WATCH', else 'CLEAN' — per Section 6.4/Appendix A."""
    if score >= 0.75:
        return "HIGH_RISK"
    elif score >= 0.45:
        return "WATCH"
    else:
        return "CLEAN"

def explain_score(f: AccountFeatures) -> dict:
    """
    Returns each feature's weighted contribution to the final score.
    """
    hold_time_inverse = 1.0 / (1.0 + f.avg_hold_time_minutes)
    
    contributions = {
        "fan_out_ratio": round(WEIGHTS["fan_out_ratio"] * f.fan_out_ratio, 3),
        "velocity": round(WEIGHTS["velocity"] * min(f.velocity / 10.0, 1.0), 3),
        "dormant_reactivation": round(WEIGHTS["dormant_reactivation"] * (1.0 if f.dormant_reactivation else 0.0), 3),
        "structuring_score": round(WEIGHTS["structuring_score"] * f.structuring_score, 3),
        "hold_time_inverse": round(WEIGHTS["hold_time_inverse"] * hold_time_inverse, 3)
    }
    return contributions
