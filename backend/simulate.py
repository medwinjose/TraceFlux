"""
TraceNet - Synthetic Demo Data Generator
Creates a population of normal accounts plus one injected mule chain
so the live demo has something real for both engines to catch.
"""
import random
import time
from typing import Tuple, List
from graph_engine import TransactionGraph, Transaction
from ml_engine.anomaly_scorer import compute_features, score_account

def build_demo_graph(num_normal_accounts: int = 40, chain_length: int = 5) -> Tuple[TransactionGraph, List[str]]:
    g = TransactionGraph()
    banks = ["BankA", "BankB", "BankC", "BankD"]

    # 1. Populate normal accounts
    for i in range(num_normal_accounts):
        acc_id = f"ACC{i:03d}"
        g.add_account(acc_id, random.choice(banks))

    now = time.time() - 3600  # Start 1 hour ago

    # 2. Record random background transactions for normal accounts
    acc_keys = list(g.accounts.keys())
    for i in range(150):
        src, dst = random.sample(acc_keys, 2)
        g.record_transaction(Transaction(
            tx_id=f"TX{i:04d}",
            src_account=src,
            dst_account=dst,
            amount=round(random.uniform(200, 5000), 2),
            timestamp=now + (i * 20),
        ))

    # 3. Injected fraud chain: VICTIM -> MULE1 -> MULE2 -> MULE3 -> CASH_OUT
    chain = ["VICTIM"] + [f"MULE{i}" for i in range(1, chain_length - 1)] + ["CASH_OUT"]
    for acc_id in chain:
        g.add_account(acc_id, random.choice(banks))

    # Add suspicious behavioral patterns for MULE accounts (high fan-out & structuring)
    for mule in chain[1:-1]:
        # Outgoing structuring txs to show high risk features
        for k in range(4):
            dst = random.choice(acc_keys)
            g.record_transaction(Transaction(
                tx_id=f"MULE_BG_{mule}_{k}",
                src_account=mule,
                dst_account=dst,
                amount=49500.0,
                timestamp=now + 100 + k * 10,
            ))

    stolen_amount = 250000.0
    fraud_tx_start = time.time() - 600  # 10 minutes ago
    for i in range(len(chain) - 1):
        g.record_transaction(Transaction(
            tx_id=f"FRAUD_TX{i}",
            src_account=chain[i],
            dst_account=chain[i + 1],
            amount=round(stolen_amount * (0.97 ** i), 2),
            timestamp=fraud_tx_start + (i * 120),  # 2 minutes apart (fast layering)
        ))

    # Calculate initial risk scores for all accounts
    for acc_id in g.accounts:
        feats = compute_features(g, acc_id)
        g.accounts[acc_id].risk_score = score_account(feats)

    return g, chain

if __name__ == "__main__":
    graph, fraud_chain = build_demo_graph()
    print(f"Generated graph with {len(graph.accounts)} accounts and {len(graph.transactions)} transactions.")
    print(f"Injected fraud chain: {' -> '.join(fraud_chain)}")

    # Simulate report at VICTIM node
    frozen = graph.report_fraud("VICTIM")
    print(f"Frozen chain after report: {frozen}")
