"""
TraceFlux - Master Demo Launcher Script
Launches FastAPI backend (port 8000) and Vite frontend (port 5173).
"""
import subprocess
import sys
import time
import os

def launch():
    print("=================================================================")
    print("  TRACEFLUX -- REAL-TIME FRAUD TRACING & INTERDICTION SYSTEM")
    print("=================================================================")
    print("Starting FastAPI Backend Server on http://127.0.0.1:8000 ...")

    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=os.path.dirname(os.path.abspath(__file__))
    )

    time.sleep(2)

    print("Starting Vite React Dashboard on http://127.0.0.1:5173 ...")
    frontend_cwd = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend"))
    
    frontend = subprocess.Popen(
        ["npx", "vite", "--port", "5173"],
        cwd=frontend_cwd,
        shell=True
    )

    print("\n[SUCCESS] TraceFlux Systems Layer running!")
    print(" - Backend API & WebSocket: http://127.0.0.1:8000")
    print(" - API Docs (Swagger):       http://127.0.0.1:8000/docs")
    print(" - React Fraud Dashboard:   http://127.0.0.1:5173")
    print("-----------------------------------------------------------------")
    print("Press Ctrl+C to terminate both servers.")

    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        print("\nShutting down TraceFlux servers...")
        backend.terminate()
        frontend.terminate()

if __name__ == "__main__":
    launch()
