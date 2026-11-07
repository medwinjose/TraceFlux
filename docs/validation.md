# Test and validation output

Verbatim output of the test, validation and API-check scripts.

- Commit: `e35ebcb` (engine code identical to `37b3362`).
- Date: 2026-11-07, 07:43:40 to 07:43:44 UTC.
- Hardware: Intel Xeon @ 2.10 GHz, 4 vCPU. Linux 6.18.44. Python 3.13.18.
- `validation.py` seeds `random` with 42 and builds its own 45-account graph (40 background, 5 chain). It asserts that every chain account scores `WATCH` or `HIGH_RISK` and that at least 85% of background accounts score `CLEAN`.

## Reproduce

```bash
cd backend && python -m pytest test_system.py && python test_system.py && python validation.py && cd .. && python verify_live_stack.py
```

## Raw output

The benchmark section of this run is superseded by the 5-run set in [benchmarks.md](benchmarks.md).

```text
## Evidence run
start: 2026-11-07 07:43:40 UTC
commit: e35ebcb3521a55fd6c8999a8d9a3e588ee20f08a (recorded as b6afe08 before message rewrite; tree identical; code unchanged since 37b3362)
python: Python 3.13.18
cpu: Intel(R) Xeon(R) Processor @ 2.10GHz, 4 vCPU
os: Linux 6.18.44-fc-v310

$ cd backend && python -m pytest test_system.py

============================== 4 passed in 0.02s ===============================

$ cd backend && python test_system.py
--- RUNNING TRACEFLUX SYSTEM VERIFICATION TESTS ---
Frozen chain result: ['VICTIM', 'MULE1', 'DOWNSTREAM_FUTURE']
[SUCCESS] Timestamp-filtered propagation test PASSED!
MULE1 ML Risk Score: 0.513 (WATCH)
[SUCCESS] ML scoring and explainability test PASSED!
[SUCCESS] Reset and error resilience test PASSED!
--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---

$ cd backend && python validation.py
====================================================
TraceFlux ML Engine Validation Test Suite
====================================================

Generated graph with 45 accounts.
Injected fraud chain: VICTIM -> MULE1 -> MULE2 -> MULE3 -> MULE4

--- SCORING RESULTS ---

Fraud Chain Scoring Details:
  VICTIM   | Score: 0.550 | Class: WATCH     | Expl: {'fan_out_ratio': 0.35, 'velocity': 0.0, 'dormant_reactivation': 0.2, 'structuring_score': 0.0, 'hold_time_inverse': 0.0}
  MULE1    | Score: 0.775 | Class: HIGH_RISK | Expl: {'fan_out_ratio': 0.35, 'velocity': 0.0, 'dormant_reactivation': 0.2, 'structuring_score': 0.0, 'hold_time_inverse': 0.225}
  MULE2    | Score: 0.775 | Class: HIGH_RISK | Expl: {'fan_out_ratio': 0.35, 'velocity': 0.0, 'dormant_reactivation': 0.2, 'structuring_score': 0.0, 'hold_time_inverse': 0.225}
  MULE3    | Score: 0.775 | Class: HIGH_RISK | Expl: {'fan_out_ratio': 0.35, 'velocity': 0.0, 'dormant_reactivation': 0.2, 'structuring_score': 0.0, 'hold_time_inverse': 0.225}
  MULE4    | Score: 0.500 | Class: WATCH     | Expl: {'fan_out_ratio': 0.0, 'velocity': 0.0, 'dormant_reactivation': 0.2, 'structuring_score': 0.0, 'hold_time_inverse': 0.3}

Normal Accounts Summary:
  Total Normal Accounts: 40
  CLEAN:      40 (100.0%)
  WATCH:      0 (0.0%)
  HIGH_RISK:  0 (0.0%)

[SUCCESS] All fraud chain accounts were flagged (WATCH or HIGH_RISK)!
[SUCCESS] Normal background accounts are mostly CLEAN (clean ratio: 100.0%)

====================================================
ALL TESTS PASSED SUCCESSFULLY!
====================================================

$ python verify_live_stack.py
[PASS 1/4] GET /graph_data: 49 accounts, 159 transactions.
[PASS 2/4] GET /accounts/MULE1/explain: {'fan_out_ratio': 0.35, 'velocity': 0.002, 'dormant_reactivation': 0.0, 'structuring_score': 0.062, 'hold_time_inverse': 0.099}
[PASS 3/4] POST /report_fraud/VICTIM: Frozen chain -> ['VICTIM', 'MULE1', 'MULE2a', 'MULE2b', 'MULE3a', 'MULE3b', 'MULE3c']
[PASS 4/4] GET /alerts: 7 interdiction alerts dispatched.

====================================================
  ALL STACK INTEGRATION CHECKS PASSED SUCCESSFULLY!
====================================================

$ python backend/benchmark.py
=================================================================
TraceFlux Micro-Benchmarks (200 iterations, 10 warmups)
=================================================================

--- EMPIRICAL LATENCY RESULTS (p50 / p99) ---
Causal BFS Traversal (49 nodes, 159 edges):      p50 =   6.57 µs | p99 =  22.94 µs
Causal BFS Traversal (509 nodes, 1,539 edges):   p50 =   6.89 µs | p99 =  28.93 µs
Behavioral Scoring (single vertex):              p50 =   8.68 µs | p99 =  48.86 µs
Full-Graph Scoring Pass (49 nodes):              p50 =   0.40 ms | p99 =   0.45 ms
Full-Graph Scoring Pass (509 nodes):             p50 =   2.25 ms | p99 =   2.47 ms
HMAC Evidence Log Append (per record):           p50 =   5.54 µs | p99 =  35.86 µs
HMAC Evidence Chain Verify (10 records):         p50 =  34.91 µs | p99 =  66.38 µs
HMAC Evidence Chain Verify (100 records):        p50 = 341.15 µs | p99 = 384.20 µs
end: 2026-11-07 07:43:44 UTC
```
