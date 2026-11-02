"""
TraceFlux - Empirical Performance Benchmarks
Measures execution latency using time.perf_counter() across 200 iterations
with 10 warmup iterations and explicit garbage collection isolation.
Reports Median (p50) and Tail Latency (p99).
"""
import time
import os
import sys
import gc
import statistics
from typing import List

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from graph_engine import TransactionGraph, Transaction
from ml_engine.anomaly_scorer import compute_features, score_account
from simulate import build_demo_graph
from security import EvidenceChain, sign_freeze_command

def p50_p99(samples: List[float]):
    """Returns (p50_median, p99_tail) in appropriate unit."""
    s = sorted(samples)
    p50 = statistics.median(s)
    p99_idx = int(0.99 * len(s))
    p99 = s[min(p99_idx, len(s) - 1)]
    return p50, p99

def reset_graph_fraud_state(graph: TransactionGraph):
    for acc in graph.accounts.values():
        acc.is_flagged = False
        acc.flagged_at = None
        acc.freeze_status = "active"
    for tx in graph.transactions.values():
        tx.trace_tag = None

def run_benchmarks(iterations: int = 200, warmup: int = 10):
    print("=================================================================")
    print(f"TraceFlux Micro-Benchmarks ({iterations} iterations, {warmup} warmups)")
    print("=================================================================")

    # -------------------------------------------------------------------------
    # 1. Causal BFS Taint Propagation
    # -------------------------------------------------------------------------
    # (a) Baseline graph (49 nodes, 159 edges)
    g49, _ = build_demo_graph(num_normal_accounts=40)
    for _ in range(warmup):
        reset_graph_fraud_state(g49)
        g49.report_fraud("VICTIM")

    gc.collect()
    latencies_bfs_49 = []
    for _ in range(iterations):
        reset_graph_fraud_state(g49)
        t_start = time.perf_counter()
        g49.report_fraud("VICTIM")
        t_end = time.perf_counter()
        latencies_bfs_49.append((t_end - t_start) * 1e6)  # µs

    bfs_49_p50, bfs_49_p99 = p50_p99(latencies_bfs_49)

    # (b) Stress graph (509 nodes, 1,539 edges)
    g509, _ = build_demo_graph(num_normal_accounts=500)
    for _ in range(warmup):
        reset_graph_fraud_state(g509)
        g509.report_fraud("VICTIM")

    gc.collect()
    latencies_bfs_509 = []
    for _ in range(iterations):
        reset_graph_fraud_state(g509)
        t_start = time.perf_counter()
        g509.report_fraud("VICTIM")
        t_end = time.perf_counter()
        latencies_bfs_509.append((t_end - t_start) * 1e6)  # µs

    bfs_509_p50, bfs_509_p99 = p50_p99(latencies_bfs_509)

    # -------------------------------------------------------------------------
    # 2. Behavioral Risk Scoring
    # -------------------------------------------------------------------------
    # (a) Single account feature extraction + scoring
    for _ in range(warmup):
        f = compute_features(g49, "MULE1")
        _ = score_account(f)

    gc.collect()
    latencies_score_single = []
    for _ in range(iterations):
        t_start = time.perf_counter()
        f = compute_features(g49, "MULE1")
        _ = score_account(f)
        t_end = time.perf_counter()
        latencies_score_single.append((t_end - t_start) * 1e6)  # µs

    score_single_p50, score_single_p99 = p50_p99(latencies_score_single)

    # (b) Full-graph scoring pass (49 nodes)
    for _ in range(warmup):
        for acc_id in g49.accounts:
            f = compute_features(g49, acc_id)
            _ = score_account(f)

    gc.collect()
    latencies_score_49 = []
    for _ in range(iterations):
        t_start = time.perf_counter()
        for acc_id in g49.accounts:
            f = compute_features(g49, acc_id)
            _ = score_account(f)
        t_end = time.perf_counter()
        latencies_score_49.append((t_end - t_start) * 1e3)  # ms

    score_49_p50, score_49_p99 = p50_p99(latencies_score_49)

    # (c) Full-graph scoring pass (509 nodes)
    for _ in range(warmup):
        for acc_id in g509.accounts:
            f = compute_features(g509, acc_id)
            _ = score_account(f)

    gc.collect()
    latencies_score_509 = []
    for _ in range(iterations):
        t_start = time.perf_counter()
        for acc_id in g509.accounts:
            f = compute_features(g509, acc_id)
            _ = score_account(f)
        t_end = time.perf_counter()
        latencies_score_509.append((t_end - t_start) * 1e3)  # ms

    score_509_p50, score_509_p99 = p50_p99(latencies_score_509)

    # -------------------------------------------------------------------------
    # 3. Cryptographic HMAC Evidence Chain Operations
    # -------------------------------------------------------------------------
    # (a) Append operation (canonical JSON + SHA-256 link + HMAC signature)
    chain_warm = EvidenceChain()
    for i in range(warmup):
        chain_warm.append("TAG_PROPAGATED", f"ACC_{i}", "BankA", "Warmup", {"hop": 1})

    gc.collect()
    chain = EvidenceChain()
    latencies_append = []
    for i in range(iterations):
        t_start = time.perf_counter()
        chain.append(
            event_type="TAG_PROPAGATED",
            account_id=f"MULE_{i}",
            bank_id="BankB",
            reason_plain="Classic money-mule relay pattern.",
            metadata={"hop": 2, "risk_score": 0.775}
        )
        t_end = time.perf_counter()
        latencies_append.append((t_end - t_start) * 1e6)  # µs

    append_p50, append_p99 = p50_p99(latencies_append)

    # (b) Verification of 10-entry hash chain
    chain_10 = EvidenceChain()
    for i in range(10):
        chain_10.append("TAG_PROPAGATED", f"ACC_{i}", "BankA", "Sample rationale", {"hop": i})
    for _ in range(warmup):
        chain_10.verify_chain()

    gc.collect()
    latencies_verify_10 = []
    for _ in range(iterations):
        t_start = time.perf_counter()
        valid, errors = chain_10.verify_chain()
        t_end = time.perf_counter()
        assert valid
        latencies_verify_10.append((t_end - t_start) * 1e6)  # µs

    verify_10_p50, verify_10_p99 = p50_p99(latencies_verify_10)

    # (c) Verification of 100-entry hash chain
    chain_100 = EvidenceChain()
    for i in range(100):
        chain_100.append("TAG_PROPAGATED", f"ACC_{i}", "BankA", "Sample rationale", {"hop": i})
    for _ in range(warmup):
        chain_100.verify_chain()

    gc.collect()
    latencies_verify_100 = []
    for _ in range(iterations):
        t_start = time.perf_counter()
        valid, errors = chain_100.verify_chain()
        t_end = time.perf_counter()
        assert valid
        latencies_verify_100.append((t_end - t_start) * 1e6)  # µs

    verify_100_p50, verify_100_p99 = p50_p99(latencies_verify_100)

    # -------------------------------------------------------------------------
    # Output Summary Table
    # -------------------------------------------------------------------------
    print("\n--- EMPIRICAL LATENCY RESULTS (p50 / p99) ---")
    print(f"Causal BFS Traversal (49 nodes, 159 edges):      p50 = {bfs_49_p50:6.2f} µs | p99 = {bfs_49_p99:6.2f} µs")
    print(f"Causal BFS Traversal (509 nodes, 1,539 edges):   p50 = {bfs_509_p50:6.2f} µs | p99 = {bfs_509_p99:6.2f} µs")
    print(f"Behavioral Scoring (single vertex):              p50 = {score_single_p50:6.2f} µs | p99 = {score_single_p99:6.2f} µs")
    print(f"Full-Graph Scoring Pass (49 nodes):              p50 = {score_49_p50:6.2f} ms | p99 = {score_49_p99:6.2f} ms")
    print(f"Full-Graph Scoring Pass (509 nodes):             p50 = {score_509_p50:6.2f} ms | p99 = {score_509_p99:6.2f} ms")
    print(f"HMAC Evidence Log Append (per record):           p50 = {append_p50:6.2f} µs | p99 = {append_p99:6.2f} µs")
    print(f"HMAC Evidence Chain Verify (10 records):         p50 = {verify_10_p50:6.2f} µs | p99 = {verify_10_p99:6.2f} µs")
    print(f"HMAC Evidence Chain Verify (100 records):        p50 = {verify_100_p50:6.2f} µs | p99 = {verify_100_p99:6.2f} µs")

if __name__ == "__main__":
    run_benchmarks()
