"""
TraceNet - Synthetic Demo Data Generator
Creates a population of normal accounts plus a complex branching mule network
so the live demo has something real for both engines to catch.
"""
import random
import time
from typing import Tuple, List
from graph_engine import TransactionGraph, Transaction
from ml_engine.anomaly_scorer import compute_features, score_account

def build_demo_graph(num_normal_accounts: int = 15, chain_length: int = 5) -> Tuple[TransactionGraph, List[str]]:
    g = TransactionGraph()
    banks = ["BankA", "BankB", "BankC", "BankD", "BankE", "BankF"]

    # 1. Populate normal accounts
    for i in range(num_normal_accounts):
        acc_id = f"ACC{i:03d}"
        g.add_account(acc_id, random.choice(banks))

    now = time.time() - 3600  # Start 1 hour ago

    # 2. Record random background transactions for normal accounts
    acc_keys = list(g.accounts.keys())
    for i in range(80):
        src, dst = random.sample(acc_keys, 2)
        g.record_transaction(Transaction(
            tx_id=f"TX{i:04d}",
            src_account=src,
            dst_account=dst,
            amount=round(random.uniform(100, 8000), 2),
            timestamp=now + (i * 15),
        ))

    # 3. Injected fraud branching network: VICTIM -> MULE1 -> [MULE2a, MULE2b] -> [MULE3a, MULE3b, MULE3c] -> CASH_OUT
    chain = ["VICTIM", "MULE1", "MULE2a", "MULE2b", "MULE3a", "MULE3b", "MULE3c", "CASH_OUT1", "CASH_OUT2"]
    for acc_id in chain:
        g.add_account(acc_id, random.choice(banks))

    # Add suspicious behavioral patterns for MULE accounts (high fan-out & structuring)
    mules = ["MULE1", "MULE2a", "MULE2b", "MULE3a", "MULE3b", "MULE3c"]
    for mule in mules:
        # Outgoing structuring txs to show high risk features
        for k in range(5):
            dst = random.choice(acc_keys)
            g.record_transaction(Transaction(
                tx_id=f"MULE_BG_{mule}_{k}",
                src_account=mule,
                dst_account=dst,
                amount=49500.0,
                timestamp=now + 100 + k * 10,
            ))

    stolen_amount = 500000.0
    fraud_tx_start = time.time() - 600  # 10 minutes ago
    
    # Hop 1: Victim to primary mule
    g.record_transaction(Transaction("F_TX1", "VICTIM", "MULE1", stolen_amount, fraud_tx_start))
    
    # Hop 2: Split to MULE2a, MULE2b
    g.record_transaction(Transaction("F_TX2a", "MULE1", "MULE2a", stolen_amount * 0.6, fraud_tx_start + 120))
    g.record_transaction(Transaction("F_TX2b", "MULE1", "MULE2b", stolen_amount * 0.4, fraud_tx_start + 125))
    
    # Hop 3: Split to MULE3a, MULE3b, MULE3c
    g.record_transaction(Transaction("F_TX3a", "MULE2a", "MULE3a", stolen_amount * 0.3, fraud_tx_start + 240))
    g.record_transaction(Transaction("F_TX3b", "MULE2a", "MULE3b", stolen_amount * 0.28, fraud_tx_start + 245))
    g.record_transaction(Transaction("F_TX3c", "MULE2b", "MULE3c", stolen_amount * 0.38, fraud_tx_start + 250))
    
    # Hop 4: Cash out
    g.record_transaction(Transaction("F_TX4a", "MULE3a", "CASH_OUT1", stolen_amount * 0.29, fraud_tx_start + 360))
    g.record_transaction(Transaction("F_TX4b", "MULE3b", "CASH_OUT1", stolen_amount * 0.27, fraud_tx_start + 365))
    g.record_transaction(Transaction("F_TX4c", "MULE3c", "CASH_OUT2", stolen_amount * 0.37, fraud_tx_start + 370))

    # Calculate initial risk scores for all accounts
    for acc_id in g.accounts:
        feats = compute_features(g, acc_id)
        g.accounts[acc_id].risk_score = score_account(feats)

    # Return graph and the list of accounts involved in the fraud chain (for verification if needed)
    return g, chain

if __name__ == "__main__":
    graph, fraud_chain = build_demo_graph()
    print(f"Generated graph with {len(graph.accounts)} accounts and {len(graph.transactions)} transactions.")
    print(f"Injected fraud network size: {len(fraud_chain)} nodes")

    # Simulate report at VICTIM node
    frozen = graph.report_fraud("VICTIM")
    print(f"Frozen chain after report: {frozen}")
