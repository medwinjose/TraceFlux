"""
TraceNet - Freeze & Alert Dispatcher
Owner: Systems/Backend
Turns tag propagation events and high risk scores into structured alerts
ready to be dispatched to banks and pushed to the live dashboard WebSocket.
"""
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
import time
import uuid

@dataclass
class FreezeAlert:
    alert_id: str
    account_id: str
    bank_id: str
    reason: str             # "PROPAGATED_TAG" | "HIGH_RISK_ANOMALY"
    timestamp: float
    traced_path: List[str]
    risk_score: float
    message: str

class AlertDispatcher:
    def __init__(self):
        self.alerts: List[FreezeAlert] = []

    def dispatch_freeze_alert(
        self,
        account_id: str,
        bank_id: str,
        reason: str,
        traced_path: List[str],
        risk_score: float,
        message: Optional[str] = None
    ) -> FreezeAlert:
        alert = FreezeAlert(
            alert_id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
            account_id=account_id,
            bank_id=bank_id,
            reason=reason,
            timestamp=time.time(),
            traced_path=traced_path,
            risk_score=risk_score,
            message=message or f"INTERDICTION EXECUTION: Account {account_id} @ {bank_id} auto-frozen. Reason: {reason}"
        )
        self.alerts.append(alert)
        return alert

    def get_recent_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        return [asdict(a) for a in reversed(self.alerts[-limit:])]
