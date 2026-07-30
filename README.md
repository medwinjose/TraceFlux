# TraceNet — Real-Time Cross-Institution Fraud Tracing & Interdiction Rail

> **⚡ 2-MINUTE QUICKSTART FOR JUDGES & TEAMMATES**
>
> 1. **Install Backend Dependencies**:
>    ```bash
>    pip install -r backend/requirements.txt
>    ```
> 2. **Run System Verification Tests**:
>    ```bash
>    python backend/test_system.py
>    python backend/validation.py
>    ```
> 3. **Launch TraceNet Full Stack**:
>    ```bash
>    python backend/run_demo.py
>    ```
>    - **React Fraud Dashboard**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
>    - **FastAPI OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## System Overview

TraceNet is a two-engine interdiction layer operating at the NPCI/UPI central switch rail:
1. **Reactive Tag Propagation Engine (`graph_engine.py`)**: Propagates trace tags forward hop-by-hop upon fraud report. Uses strict timestamp filtering (`tx.timestamp >= earliest_ts`) so a mule's unrelated past transactions are never falsely frozen.
2. **Proactive Anomaly Scoring Engine (`ml_engine/anomaly_scorer.py`)**: Continuously scores accounts on mule-likelihood using 5 behavioral signals (`fan_out_ratio`, `velocity`, `dormant_reactivation`, `structuring_score`, `avg_hold_time_minutes`).
3. **Live Dashboard (`frontend/`)**: HTML5 Canvas force-directed graph with glowing energy trace pulses, dynamic ML explainability risk inspector (`RiskPanel.jsx`), and WebSocket alert feed (`AlertFeed.jsx`).

---

## Component Architecture

```
Team-Nova-Medwin/
├── README.md
├── verify_live_stack.py          # In-process full stack integration check
├── backend/
│   ├── requirements.txt           # Pinned backend dependencies
│   ├── graph_engine.py            # TransactionGraph BFS tag propagation engine
│   ├── dispatcher.py              # FreezeAlert dispatcher
│   ├── main.py                    # FastAPI server & WebSocket hub
│   ├── simulate.py                # Synthetic data generator (40 normal + 9-node fraud chain)
│   ├── run_demo.py                # One-click launcher script
│   ├── test_system.py             # System verification test suite
│   ├── validation.py              # ML scoring validation script
│   └── ml_engine/
│       ├── __init__.py
│       └── anomaly_scorer.py      # Behavioral feature extraction & ML scoring
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.cjs
    └── src/
        ├── App.jsx                # Root state, WebSocket lifecycle, view router
        ├── index.css              # Design tokens (colors, fonts, spacing) & all component styles
        ├── main.jsx
        └── components/
            ├── Sidebar.jsx         # Left nav — view switching, alert badge, user chip
            ├── Header.jsx          # Topbar — search, WS status, fraud-trigger & reset buttons
            ├── StatsBar.jsx        # 4-card KPI row (monitored, frozen, watch, alerts)
            ├── NetworkGraph.jsx    # Canvas force-directed physics graph
            ├── RiskPanel.jsx       # Account list + ML risk inspector & explainability
            ├── AlertFeed.jsx       # WebSocket live alert stream
            ├── WatchlistView.jsx   # Bar chart + table of WATCH/HIGH_RISK accounts
            ├── AssetsView.jsx      # Per-bank institutional exposure grid (waffle chart)
            ├── SettingsView.jsx    # System parameter display
            └── SupportView.jsx     # Contact & documentation links
```

---

## Verification & API Endpoints

- `POST /report_fraud/{account_id}` — Triggers BFS tag propagation, auto-freezes downstream chain, returns frozen chain JSON & dispatches alerts. (Gracefully handles non-existent IDs with HTTP 404, idempotent on duplicate reports).
- `GET /accounts` — Returns state of all accounts with dynamically computed risk scores.
- `GET /accounts/{id}/explain` — Returns feature weight contribution breakdown for judge explainability.
- `POST /reset` — Restores clean initial graph state between live demo runs.
- `WS /ws` — Pushes real-time `TAG_PROPAGATED`, `ACCOUNT_FROZEN`, and `DEMO_RESET` events.
