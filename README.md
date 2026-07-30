# TraceNet — Systems & Backend Engine

Real-Time, Privacy-Preserving Cross-Institution Fraud Tracing & Interdiction System.

## Architecture & Scope Summary

This repository contains the Systems & Backend infrastructure for **TraceNet**:
1. **`graph_engine.py`**: High-performance transaction graph engine (`Account` & `Transaction` dataclasses) implementing BFS reactive tag propagation with timestamp filtering to prevent false-positive tagging of unrelated past transactions.
2. **`ml_engine/anomaly_scorer.py`**: Integration stub matching the ML contract interface (`AccountFeatures`, `compute_features`, `score_account`, `classify`, `explain_score`).
3. **`simulate.py`**: Synthetic demo data generator producing ~40 normal accounts, 150 background transactions, and an injected fast fraud chain (`VICTIM` → `MULE1` → `MULE2` → `MULE3` → `CASH_OUT`).
4. **`dispatcher.py`**: Structured freeze alert dispatcher generating interdiction event notifications.
5. **`main.py`**: FastAPI server exposing REST API endpoints and real-time WebSocket switch hub.
6. **`frontend/`**: React + Vite interactive dashboard featuring HTML5 Canvas force-directed graph animations, pulsing red shockwaves on frozen nodes, live WebSocket alert stream, and a documented drop-in `<RiskPanelSlot />` for teammate integration.

---

## Deliverables Checklist

- [x] `graph_engine.py` — Schema unchanged from Section 6.2; BFS tag propagation with hop limit 5 & strict timestamp filter.
- [x] `ml_engine/anomaly_scorer.py` — Exposes exact function signatures (`compute_features`, `score_account`, `classify`, `explain_score`).
- [x] `simulate.py` — Demo graph generator with normal population + fast injected mule chain.
- [x] `dispatcher.py` — Structured freeze alert formatter.
- [x] `main.py` — FastAPI server + WebSocket real-time event bus (`POST /report_fraud/{id}`, `GET /accounts`, `GET /accounts/{id}/explain`, `WS /ws`).
- [x] `frontend/` — Live animated force-directed graph dashboard with documented ML `<RiskPanelSlot />`.
- [x] `test_system.py` — Verification suite passing all core system rules.

---

## Quick Start & Running locally

### 1. Run Verification Suite
```bash
python test_system.py
```

### 2. Start Backend & Dashboard
```bash
python run_demo.py
```

Or start backend and frontend separately:

**Backend:**
```bash
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Open dashboard at **http://127.0.0.1:5173**.

---

## Teammate ML Component Integration

Your teammate's `ml_engine/anomaly_scorer.py` exposes:
```python
@dataclass
class AccountFeatures:
    account_id: str
    fan_out_ratio: float
    velocity: float
    dormant_reactivation: bool
    structuring_score: float
    avg_hold_time_minutes: float

def compute_features(graph: "TransactionGraph", account_id: str) -> AccountFeatures: ...
def score_account(features: AccountFeatures) -> float: ...
def classify(score: float) -> str: ...  # "CLEAN" | "WATCH" | "HIGH_RISK"
def explain_score(features: AccountFeatures) -> dict: ...
```

In the frontend, her Risk Panel drops directly into [`frontend/src/components/RiskPanelSlot.jsx`](file:///c:/Users/medwi/OneDrive/Documents/Summer%20Code%20Fest/frontend/src/components/RiskPanelSlot.jsx).
