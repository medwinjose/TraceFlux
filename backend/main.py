"""
TraceNet - FastAPI & WebSocket Backend Service
Owner: Systems/Backend
Exposes REST API endpoints and real-time WebSocket connection manager.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dataclasses import asdict
from typing import List, Dict, Any
import asyncio
import json
import time

from graph_engine import TransactionGraph, Transaction, Account
from ml_engine.anomaly_scorer import compute_features, score_account, explain_score, classify
from simulate import build_demo_graph
from dispatcher import AlertDispatcher

app = FastAPI(title="TraceNet API & WebSocket Engine", version="1.0.0")

# CORS middleware for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global In-Memory State
graph: TransactionGraph = None
fraud_chain_demo: List[str] = []
dispatcher = AlertDispatcher()

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

def initialize_graph():
    global graph, fraud_chain_demo, dispatcher
    graph, fraud_chain_demo = build_demo_graph(num_normal_accounts=40, chain_length=5)
    dispatcher = AlertDispatcher()

@app.on_event("startup")
def startup_event():
    initialize_graph()

@app.get("/")
def read_root():
    return {"system": "TraceNet Core Engine", "status": "ONLINE", "version": "1.0.0"}

@app.get("/accounts")
def get_accounts():
    """Returns current state of all accounts with refreshed risk scores"""
    result = []
    for acc in graph.accounts.values():
        feats = compute_features(graph, acc.account_id)
        acc.risk_score = score_account(feats)
        risk_class = classify(acc.risk_score)
        
        acc_dict = asdict(acc)
        acc_dict["classification"] = risk_class
        result.append(acc_dict)
    return result

@app.get("/transactions")
def get_transactions():
    """Returns all transactions recorded in graph"""
    return [asdict(tx) for tx in graph.transactions.values()]

@app.get("/graph_data")
def get_graph_data():
    """Returns combined node and edge network payload for frontend visualization"""
    nodes = []
    for acc in graph.accounts.values():
        feats = compute_features(graph, acc.account_id)
        acc.risk_score = score_account(feats)
        risk_class = classify(acc.risk_score)
        
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

@app.get("/accounts/{account_id}/explain")
def get_account_explanation(account_id: str):
    """Calls ML explain_score and returns feature breakdown for judge explanation panel"""
    if account_id not in graph.accounts:
        raise HTTPException(status_code=404, detail="Account not found")
    
    feats = compute_features(graph, account_id)
    return explain_score(feats)

@app.post("/report_fraud/{account_id}")
async def report_fraud_endpoint(account_id: str, background_tasks: BackgroundTasks):
    """
    Triggers reactive tag propagation BFS, updates freeze status,
    dispatches structured alerts, and broadcasts WS real-time animation events.
    """
    if account_id not in graph.accounts:
        raise HTTPException(status_code=404, detail="Account not found")

    # Run Tag Propagation Engine
    frozen_chain = graph.report_fraud(account_id, max_hops=5)

    dispatched_alerts = []
    for idx, acc_id in enumerate(frozen_chain):
        acc = graph.accounts[acc_id]
        reason = "VICTIM_REPORT_ORIGIN" if idx == 0 else "PROPAGATED_TAG"
        
        alert = dispatcher.dispatch_freeze_alert(
            account_id=acc.account_id,
            bank_id=acc.bank_id,
            reason=reason,
            traced_path=frozen_chain[:idx+1],
            risk_score=acc.risk_score,
            message=f"AUTOFREEZE: Account {acc.account_id} @ {acc.bank_id} locked via Tag Propagation [Hop {idx}]"
        )
        dispatched_alerts.append(asdict(alert))

    # Broadcast WebSocket animation step async
    async def animate_propagation():
        for idx, acc_id in enumerate(frozen_chain):
            acc = graph.accounts[acc_id]
            # Push tag propagation event for node flashing
            await manager.broadcast("TAG_PROPAGATED", {
                "account_id": acc_id,
                "bank_id": acc.bank_id,
                "hop": idx,
                "freeze_status": acc.freeze_status,
                "traced_path": frozen_chain[:idx+1],
            })
            await asyncio.sleep(0.35)  # Visual pacing for demo animation

    background_tasks.add_task(animate_propagation)

    return {
        "status": "SUCCESS",
        "reported_account": account_id,
        "frozen_chain": frozen_chain,
        "total_frozen": len(frozen_chain),
        "alerts": dispatched_alerts,
    }

@app.post("/reset")
async def reset_demo():
    """Resets synthetic graph state"""
    initialize_graph()
    await manager.broadcast("DEMO_RESET", {"message": "Synthetic graph reset to initial state"})
    return {"status": "RESET_COMPLETE", "account_count": len(graph.accounts)}

@app.get("/alerts")
def get_alerts():
    """Returns recent freeze & alert dispatcher records"""
    return dispatcher.get_recent_alerts()

@app.websocket("/ws")
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
