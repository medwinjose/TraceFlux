"""
TraceNet - FastAPI & WebSocket Backend Service
Owner: Systems/Backend
Exposes REST API endpoints and real-time WebSocket connection manager.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dataclasses import asdict
from typing import List, Dict, Any
import asyncio
import json
import time
import sys
import os

# Fix for Vercel Serverless Function module resolution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from graph_engine import TransactionGraph, Transaction, Account
from ml_engine.anomaly_scorer import compute_features, score_account, explain_score, classify
from simulate import build_demo_graph
from dispatcher import AlertDispatcher
from security import EvidenceChain, sign_freeze_command, HMAC_KEY_FINGERPRINT
from explainer import generate_plain_english_reason

# ── Global In-Memory State ────────────────────────────────────────────────────
graph: TransactionGraph = None
fraud_chain_demo: List[str] = []
dispatcher = AlertDispatcher()
evidence_chain = EvidenceChain()   # tamper-evident hash-chained freeze ledger

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, payload: Dict[str, Any]):
        message = json.dumps({"event": event_type, "timestamp": time.time(), "data": payload})
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Global System Settings
system_settings = {
    "auto_freeze_confidence": 0.925,
    "max_hops": 3
}

def initialize_graph():
    """Builds and stores the synthetic demo graph in global state."""
    global graph, fraud_chain_demo, dispatcher
    graph, fraud_chain_demo = build_demo_graph(num_normal_accounts=40, chain_length=5)
    dispatcher = AlertDispatcher()
    evidence_chain.reset()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes the synthetic transaction graph on startup."""
    initialize_graph()
    yield  # app runs here; add cleanup after yield if needed

app = FastAPI(title="TraceNet API & WebSocket Engine", version="1.0.0", lifespan=lifespan)

# CORS — permissive for hackathon/demo environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/")
def read_root():
    return {
        "system": "TraceNet Core Engine",
        "status": "ONLINE",
        "version": "1.0.0",
        "hmac_key_fingerprint": HMAC_KEY_FINGERPRINT,
        "evidence_chain_length": len(evidence_chain.records),
    }

def _refresh_account_score(acc: Account) -> str:
    """Computes features, updates the account's risk score, and returns classification."""
    feats = compute_features(graph, acc.account_id)
    acc.risk_score = score_account(feats)
    
    # Auto-freeze logic
    if acc.risk_score >= system_settings["auto_freeze_confidence"] and acc.freeze_status != "frozen":
        acc.freeze_status = "frozen"
        # Optional: dispatch alert if we had access to dispatcher here
        
    return classify(acc.risk_score)

@app.get("/api/accounts")
def get_accounts():
    """Returns current state of all accounts with refreshed risk scores"""
    result = []
    for acc in graph.accounts.values():
        risk_class = _refresh_account_score(acc)
        acc_dict = asdict(acc)
        acc_dict["classification"] = risk_class
        result.append(acc_dict)
    return result

@app.get("/api/transactions")
def get_transactions():
    """Returns all transactions recorded in graph"""
    return [asdict(tx) for tx in graph.transactions.values()]

@app.get("/api/graph_data")
def get_graph_data():
    """Returns combined node and edge network payload for frontend visualization"""
    nodes = []
    for acc in graph.accounts.values():
        risk_class = _refresh_account_score(acc)
        nodes.append({
            "id": acc.account_id,
            "label": acc.account_id,
            "bank_id": acc.bank_id,
            "is_flagged": acc.is_flagged,
            "freeze_status": acc.freeze_status,
            "risk_score": acc.risk_score,
            "classification": risk_class,
        })

    edges = []
    for tx in graph.transactions.values():
        edges.append({
            "id": tx.tx_id,
            "source": tx.src_account,
            "target": tx.dst_account,
            "amount": tx.amount,
            "timestamp": tx.timestamp,
            "trace_tag": tx.trace_tag,
        })

    return {"nodes": nodes, "edges": edges, "demo_fraud_chain": fraud_chain_demo}

@app.get("/api/accounts/{account_id}/explain")
def get_account_explanation(account_id: str):
    """Calls ML explain_score and returns feature breakdown for judge explanation panel"""
    if account_id not in graph.accounts:
        raise HTTPException(status_code=404, detail="Account not found")
    
    feats = compute_features(graph, account_id)
    return explain_score(feats)

@app.get("/api/settings")
def get_settings():
    return system_settings

@app.post("/api/settings")
def update_settings(new_settings: dict):
    if "auto_freeze_confidence" in new_settings:
        system_settings["auto_freeze_confidence"] = float(new_settings["auto_freeze_confidence"])
    if "max_hops" in new_settings:
        system_settings["max_hops"] = int(new_settings["max_hops"])
    return system_settings

@app.post("/api/report_fraud/{account_id}")
async def report_fraud_endpoint(account_id: str, background_tasks: BackgroundTasks):
    """
    Triggers reactive tag propagation BFS, updates freeze status,
    dispatches structured alerts, and broadcasts WS real-time animation events.
    - HTTP 404 if account does not exist.
    - HTTP 409 if this exact report_id has already been processed (replay protection).
    - Idempotent on an already-frozen account (returns ALREADY_FROZEN).
    - Every freeze is appended to the tamper-evident evidence chain with HMAC signature.
    """
    if account_id not in graph.accounts:
        raise HTTPException(status_code=404, detail=f"Account '{account_id}' not found in network graph")

    # ── Replay / Idempotency Protection ───────────────────────────────────────
    report_id = f"REPORT-{account_id}"
    if evidence_chain.is_duplicate(report_id):
        raise HTTPException(
            status_code=409,
            detail=f"Report '{report_id}' already processed. Reset the demo to re-trigger."
        )

    acc = graph.accounts[account_id]
    already_frozen = acc.freeze_status == "frozen"

    # ── Tag Propagation Engine ────────────────────────────────────────────────
    frozen_chain = graph.report_fraud(account_id, max_hops=system_settings["max_hops"])

    # Register AFTER successful propagation (prevents replay)
    evidence_chain.register(report_id)

    dispatched_alerts = []
    evidence_records  = []

    if not already_frozen:
        for idx, acc_id in enumerate(frozen_chain):
            a_acc  = graph.accounts[acc_id]
            reason = "VICTIM_REPORT_ORIGIN" if idx == 0 else "PROPAGATED_TAG"
            feats  = compute_features(graph, acc_id)
            feat_contributions = explain_score(feats)
            freeze_type = "VICTIM_REPORT" if idx == 0 else "TAG_PROPAGATED"

            # ── Plain-English Receipt ─────────────────────────────────────────
            reason_plain = generate_plain_english_reason(
                account_id   = acc_id,
                features     = feat_contributions,
                freeze_type  = freeze_type,
                hop          = idx,
                source_account = frozen_chain[idx - 1] if idx > 0 else "",
            )

            # ── Evidence Chain Append ─────────────────────────────────────────
            ev_record = evidence_chain.append(
                event_type   = freeze_type,
                account_id   = acc_id,
                bank_id      = a_acc.bank_id,
                reason_plain = reason_plain,
                metadata     = {
                    "hop":          idx,
                    "traced_path":  frozen_chain[:idx + 1],
                    "risk_score":   round(a_acc.risk_score, 4),
                    "features":     feat_contributions,
                },
            )
            evidence_records.append(ev_record)

            # ── HMAC-Signed Freeze Command ────────────────────────────────────
            freeze_sig = sign_freeze_command(acc_id, a_acc.bank_id, frozen_chain)

            alert = dispatcher.dispatch_freeze_alert(
                account_id  = a_acc.account_id,
                bank_id     = a_acc.bank_id,
                reason      = reason,
                traced_path = frozen_chain[:idx + 1],
                risk_score  = a_acc.risk_score,
                message     = f"AUTOFREEZE: Account {a_acc.account_id} @ {a_acc.bank_id} locked via Tag Propagation [Hop {idx}]"
            )
            alert_dict = asdict(alert)
            alert_dict["reason_plain"] = reason_plain
            alert_dict["signature"]    = freeze_sig[:24] + "..."
            dispatched_alerts.append(alert_dict)

        # ── Broadcast WebSocket Animation Steps ───────────────────────────────
        async def animate_propagation():
            for idx, acc_id in enumerate(frozen_chain):
                a_acc      = graph.accounts[acc_id]
                ev_rec     = evidence_records[idx]
                freeze_sig = sign_freeze_command(acc_id, a_acc.bank_id, frozen_chain)
                await manager.broadcast("TAG_PROPAGATED", {
                    "account_id":   acc_id,
                    "bank_id":      a_acc.bank_id,
                    "hop":          idx,
                    "freeze_status": a_acc.freeze_status,
                    "traced_path":  frozen_chain[:idx + 1],
                    "reason_plain": ev_rec["reason_plain"],
                    "signature":    freeze_sig[:24] + "...",
                    "event_hash":   ev_rec["event_hash"][:16] + "...",
                    "seq":          ev_rec["seq"],
                })
                await asyncio.sleep(0.35)

        background_tasks.add_task(animate_propagation)

    return {
        "status":           "ALREADY_FROZEN" if already_frozen else "SUCCESS",
        "reported_account": account_id,
        "frozen_chain":     frozen_chain,
        "total_frozen":     len(frozen_chain),
        "alerts":           dispatched_alerts if not already_frozen else [],
        "evidence_records": evidence_records  if not already_frozen else [],
        "hmac_key_fingerprint": HMAC_KEY_FINGERPRINT,
        "note": "Account was already frozen prior to this report" if already_frozen else "Tag propagation + evidence chain append completed"
    }

@app.post("/api/reset")
async def reset_demo():
    """Resets synthetic graph state and evidence chain"""
    initialize_graph()  # also calls evidence_chain.reset()
    await manager.broadcast("DEMO_RESET", {"message": "Synthetic graph reset to initial state"})
    return {"status": "RESET_COMPLETE", "account_count": len(graph.accounts)}

@app.get("/api/evidence_chain")
def get_evidence_chain():
    """Returns all tamper-evident evidence records, most recent first."""
    valid, _ = evidence_chain.verify_chain()
    return {
        "chain_valid":    valid,
        "chain_length":   len(evidence_chain.records),
        "genesis_hash":   "0" * 64,
        "latest_hash":    evidence_chain._prev_hash,
        "hmac_fingerprint": HMAC_KEY_FINGERPRINT,
        "records":        evidence_chain.get_all(),
    }

@app.get("/api/evidence_chain/verify")
def verify_evidence_chain():
    """Walks every record and verifies the hash chain has not been tampered with."""
    valid, errors = evidence_chain.verify_chain()
    return {
        "chain_valid":   valid,
        "chain_length":  len(evidence_chain.records),
        "errors":        errors,
        "verdict":       "CHAIN VERIFIED — No tampering detected." if valid else "TAMPERING DETECTED — Chain integrity broken!",
    }

@app.get("/api/alerts")
def get_alerts():
    """Returns recent freeze & alert dispatcher records"""
    return dispatcher.get_recent_alerts()

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial welcome payload
        await websocket.send_text(json.dumps({
            "event": "CONNECTED",
            "timestamp": time.time(),
            "data": {"message": "Connected to TraceNet Real-time Switch Event Bus"}
        }))
        while True:
            # Keep alive and handle incoming client commands if any
            data = await websocket.receive_text()
            payload = json.loads(data)
            if payload.get("action") == "PING":
                await websocket.send_text(json.dumps({"event": "PONG", "timestamp": time.time()}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
