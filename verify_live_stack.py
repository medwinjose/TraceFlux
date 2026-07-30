"""
In-Process Live Stack Verification Script
Uses FastAPI TestClient to test REST API and ML explainability pipelines.
"""
import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app

def verify():
    with TestClient(app) as client:
        # 1. Check GET /graph_data
        res = client.get("/graph_data")
        assert res.status_code == 200, f"GET /graph_data failed: {res.status_code}"
        data = res.json()
        print(f"[PASS 1/4] GET /graph_data: {len(data['nodes'])} accounts, {len(data['edges'])} transactions.")

        # 2. Check GET /accounts/MULE1/explain (Teammate ML explainability endpoint)
        res = client.get("/accounts/MULE1/explain")
        assert res.status_code == 200, f"GET /accounts/MULE1/explain failed: {res.status_code}"
        explain_data = res.json()
        print(f"[PASS 2/4] GET /accounts/MULE1/explain: {explain_data}")

        # 3. Check POST /report_fraud/VICTIM (Reactive Tag Propagation & Interdiction)
        res = client.post("/report_fraud/VICTIM")
        assert res.status_code == 200, f"POST /report_fraud/VICTIM failed: {res.status_code}"
        fraud_res = res.json()
        print(f"[PASS 3/4] POST /report_fraud/VICTIM: Frozen chain -> {fraud_res['frozen_chain']}")

        # 4. Check GET /alerts (Alert Dispatcher output stream)
        res = client.get("/alerts")
        assert res.status_code == 200, f"GET /alerts failed: {res.status_code}"
        alerts_data = res.json()
        print(f"[PASS 4/4] GET /alerts: {len(alerts_data)} interdiction alerts dispatched.")

    print("\n====================================================")
    print("  ALL STACK INTEGRATION CHECKS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    verify()
