"""
TraceNet - End-to-End System Test Suite
Verifies core graph propagation rules, ML feature extraction, and synthetic simulation.
"""
import time
from graph_engine import TransactionGraph, Transaction, Account
from ml_engine.anomaly_scorer import compute_features, score_account, classify, explain_score
from simulate import build_demo_graph
from dispatcher import AlertDispatcher

def test_timestamp_filtered_propagation():
    """
    CRITICAL SPEC REFINEMENT TEST:
    Verify that tag propagation ONLY follows transactions occurring AFTER tainted money arrived.
    """
    g = TransactionGraph()
    t0 = time.time() - 3600  # 1 hr ago

    g.add_account("VICTIM", "BankA")
    g.add_account("MULE1", "BankB")
    g.add_account("INNOCENT_PAST", "BankC")
    g.add_account("DOWNSTREAM_FUTURE", "BankD")

    # Past unrelated transaction (BEFORE fraud) from MULE1 -> INNOCENT_PAST
    g.record_transaction(Transaction("TX_PAST", "MULE1", "INNOCENT_PAST", 500.0, t0 - 500))

    # Tainted stolen funds arriving at MULE1 at t0
    g.record_transaction(Transaction("TX_FRAUD_1", "VICTIM", "MULE1", 50000.0, t0))

    # Future transaction (AFTER fraud) from MULE1 -> DOWNSTREAM_FUTURE
    g.record_transaction(Transaction("TX_FUTURE", "MULE1", "DOWNSTREAM_FUTURE", 45000.0, t0 + 100))

    # Report fraud at VICTIM
    frozen_chain = g.report_fraud("VICTIM", reported_at=t0)

    print("Frozen chain result:", frozen_chain)
    assert "VICTIM" in frozen_chain, "VICTIM should be frozen"
    assert "MULE1" in frozen_chain, "MULE1 should be frozen"
    assert "DOWNSTREAM_FUTURE" in frozen_chain, "DOWNSTREAM_FUTURE should be frozen"
    assert "INNOCENT_PAST" not in frozen_chain, "FAILED: Unrelated past transaction recipient was falsely flagged!"
    print("[SUCCESS] Timestamp-filtered propagation test PASSED!")

def test_ml_scoring_and_explainability():
    graph, _ = build_demo_graph()
    feats = compute_features(graph, "MULE1")
    score = score_account(feats)
    category = classify(score)
    explanation = explain_score(feats)

    assert "contributions" in explanation, "Explanation missing contributions"
    assert "raw_features" in explanation, "Explanation missing raw_features"
    print(f"MULE1 ML Risk Score: {score} ({category})")
    print("[SUCCESS] ML scoring and explainability test PASSED!")

def test_demo_graph_simulation():
    graph, fraud_chain = build_demo_graph(num_normal_accounts=40, chain_length=5)
    assert len(graph.accounts) >= 45, "Graph count insufficient"
    assert len(fraud_chain) == 5, "Fraud chain length mismatch"

    frozen = graph.report_fraud("VICTIM")
    assert len(frozen) == 5, f"Expected 5 frozen nodes, got {len(frozen)}"
    assert frozen == fraud_chain, f"Frozen chain {frozen} does not match injected chain {fraud_chain}"
    print("[SUCCESS] Synthetic demo graph simulation test PASSED!")

if __name__ == "__main__":
    print("--- RUNNING TRACENET SYSTEM VERIFICATION TESTS ---")
    test_timestamp_filtered_propagation()
    test_ml_scoring_and_explainability()
    test_demo_graph_simulation()
    print("--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---")

