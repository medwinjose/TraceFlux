# Benchmarks

Latency of the in-process engine, measured with `backend/benchmark.py`.

## Setup

- Commit: `e35ebcb` (engine code identical to `37b3362`).
- Date: 2026-11-07, runs between 07:43:48 and 07:43:53 UTC.
- Hardware: Intel Xeon @ 2.10 GHz, 4 vCPU, shared cloud VM.
- OS: Linux 6.18.44. Python 3.13.18. No build flags (interpreted).
- Method: per operation, 10 warm-up iterations, `gc.collect()`, then 200 timed iterations with `time.perf_counter()`. The script reports the median (p50) and p99 of the 200 samples.
- Runs: 5 back-to-back runs of the whole script.
- Graphs: `simulate.build_demo_graph` with 40 background accounts (49 nodes, 159 edges) and 500 (509 nodes, 1,539 edges). Each BFS run uses `max_hops` 5 and freezes the 9 injected chain accounts.

## Summary (median of the 5 per-run medians, with their range)

| Operation | Median of medians | Range of per-run medians |
| --- | --- | --- |
| BFS freeze, 49 nodes (µs) | 4.09 | 3.16 to 5.58 |
| BFS freeze, 509 nodes (µs) | 4.55 | 3.24 to 5.99 |
| Score one account (µs) | 6.66 | 4.89 to 7.93 |
| Score all accounts, 49 nodes (ms) | 0.28 | 0.21 to 0.35 |
| Score all accounts, 509 nodes (ms) | 2.88 | 2.79 to 2.95 |
| Evidence log append, one record (µs) | 6.71 | 6.65 to 9.85 |
| Hash-chain check, 10 records (µs) | 41.48 | 41.35 to 42.73 |
| Hash-chain check, 100 records (µs) | 427.08 | 412.62 to 441.84 |

p99 values vary up to 2.5x between runs on this VM (BFS, 49 nodes: 13.95 to 35.37 µs) and are not summarised. The hash-chain check recomputes SHA-256 links only; it does not check HMAC signatures.

## Reproduce

```bash
for i in 1 2 3 4 5; do python backend/benchmark.py | grep 'p50 ='; done
```

## Raw output

```text
start: 2026-11-07 07:43:48 UTC, commit e35ebcb
### run 1 (07:43:48)
Causal BFS Traversal (49 nodes, 159 edges):      p50 =   3.16 µs | p99 =  14.80 µs
Causal BFS Traversal (509 nodes, 1,539 edges):   p50 =   3.24 µs | p99 =  15.13 µs
Behavioral Scoring (single vertex):              p50 =   4.89 µs | p99 =  26.11 µs
Full-Graph Scoring Pass (49 nodes):              p50 =   0.21 ms | p99 =   0.29 ms
Full-Graph Scoring Pass (509 nodes):             p50 =   2.95 ms | p99 =   4.59 ms
HMAC Evidence Log Append (per record):           p50 =   9.85 µs | p99 =  53.73 µs
HMAC Evidence Chain Verify (10 records):         p50 =  42.73 µs | p99 = 104.01 µs
HMAC Evidence Chain Verify (100 records):        p50 = 441.84 µs | p99 = 1249.46 µs
### run 2 (07:43:49)
Causal BFS Traversal (49 nodes, 159 edges):      p50 =   4.09 µs | p99 =  35.37 µs
Causal BFS Traversal (509 nodes, 1,539 edges):   p50 =   4.55 µs | p99 =  22.81 µs
Behavioral Scoring (single vertex):              p50 =   6.66 µs | p99 =  38.79 µs
Full-Graph Scoring Pass (49 nodes):              p50 =   0.28 ms | p99 =   0.59 ms
Full-Graph Scoring Pass (509 nodes):             p50 =   2.92 ms | p99 =   4.62 ms
HMAC Evidence Log Append (per record):           p50 =   6.71 µs | p99 =  45.67 µs
HMAC Evidence Chain Verify (10 records):         p50 =  41.35 µs | p99 =  78.93 µs
HMAC Evidence Chain Verify (100 records):        p50 = 412.62 µs | p99 = 498.80 µs
### run 3 (07:43:50)
Causal BFS Traversal (49 nodes, 159 edges):      p50 =   5.44 µs | p99 =  13.95 µs
Causal BFS Traversal (509 nodes, 1,539 edges):   p50 =   5.73 µs | p99 =  22.74 µs
Behavioral Scoring (single vertex):              p50 =   7.82 µs | p99 =  36.31 µs
Full-Graph Scoring Pass (49 nodes):              p50 =   0.35 ms | p99 =   0.42 ms
Full-Graph Scoring Pass (509 nodes):             p50 =   2.79 ms | p99 =   4.89 ms
HMAC Evidence Log Append (per record):           p50 =   7.04 µs | p99 = 162.09 µs
HMAC Evidence Chain Verify (10 records):         p50 =  42.57 µs | p99 =  83.67 µs
HMAC Evidence Chain Verify (100 records):        p50 = 440.85 µs | p99 = 623.28 µs
### run 4 (07:43:51)
Causal BFS Traversal (49 nodes, 159 edges):      p50 =   5.58 µs | p99 =  32.95 µs
Causal BFS Traversal (509 nodes, 1,539 edges):   p50 =   5.99 µs | p99 =  23.27 µs
Behavioral Scoring (single vertex):              p50 =   7.93 µs | p99 =  38.24 µs
Full-Graph Scoring Pass (49 nodes):              p50 =   0.35 ms | p99 =   0.54 ms
Full-Graph Scoring Pass (509 nodes):             p50 =   2.88 ms | p99 =   3.49 ms
HMAC Evidence Log Append (per record):           p50 =   6.67 µs | p99 =  40.88 µs
HMAC Evidence Chain Verify (10 records):         p50 =  41.48 µs | p99 =  86.28 µs
HMAC Evidence Chain Verify (100 records):        p50 = 427.08 µs | p99 = 489.05 µs
### run 5 (07:43:52)
Causal BFS Traversal (49 nodes, 159 edges):      p50 =   3.89 µs | p99 =  16.67 µs
Causal BFS Traversal (509 nodes, 1,539 edges):   p50 =   4.28 µs | p99 =  24.73 µs
Behavioral Scoring (single vertex):              p50 =   6.52 µs | p99 =  55.07 µs
Full-Graph Scoring Pass (49 nodes):              p50 =   0.25 ms | p99 =   0.34 ms
Full-Graph Scoring Pass (509 nodes):             p50 =   2.80 ms | p99 =   3.03 ms
HMAC Evidence Log Append (per record):           p50 =   6.65 µs | p99 =  29.98 µs
HMAC Evidence Chain Verify (10 records):         p50 =  41.41 µs | p99 =  82.77 µs
HMAC Evidence Chain Verify (100 records):        p50 = 415.33 µs | p99 = 599.14 µs
end: 2026-11-07 07:43:53 UTC
```
