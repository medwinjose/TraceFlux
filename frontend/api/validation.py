"""
TraceFlux - Validation Script
Tests anomaly_scorer.py against a simulated TransactionGraph.
"""
import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from collections import defaultdict, deque

# Import the anomaly scorer functions
from ml_engine.anomaly_scorer import compute_features, score_account, classify, explain_score

# ----------------------------------------------------
# Mock Graph Engine Classes (matching Appendix A & Spec)
# ----------------------------------------------------

@dataclass
class Account:
    account_id: str
    bank_id: str
    is_flagged: bool = False
    flagged_at: Optional[float] = None
    freeze_status: str = "active"  # active | under_review | frozen
    risk_score: float = 0.0
    created_at: float = 0.0        # Assumed to be present in database/graph schema

@dataclass
class Transaction:
    tx_id: str
    src_account: str
    dst_account: str
    amount: float
    timestamp: float
    trace_tag: Optional[str] = None

class TransactionGraph:
    def __init__(self):
        self.accounts: Dict[str, Account] = {}
        self.outgoing: Dict[str, List[Transaction]] = defaultdict(list)
        self.transactions: Dict[str, Transaction] = {}
        
    def add_account(self, account_id: str, bank_id: str, created_at: Optional[float] = None):
        self.accounts[account_id] = Account(
            account_id=account_id,
            bank_id=bank_id,
            created_at=created_at if created_at is not None else time.time()
        )
        
    def record_transaction(self, tx: Transaction):
        self.transactions[tx.tx_id] = tx
        self.outgoing[tx.src_account].append(tx)
        
    def report_fraud(self, account_id: str, reported_at: float = None, max_hops: int = 5) -> List[str]:
        reported_at = reported_at or time.time()
        origin = self.accounts[account_id]
        origin.is_flagged = True
        origin.flagged_at = reported_at
        origin.freeze_status = "frozen"
        
        visited: Set[str] = {account_id}
        frozen_chain = [account_id]
        queue = deque([(account_id, reported_at, 0)])
        
        while queue:
            current_id, earliest_ts, depth = queue.popleft()
            if depth >= max_hops:
                continue
            for tx in self.outgoing.get(current_id, []):
                if tx.timestamp < earliest_ts:
                    continue
                tx.trace_tag = f"TRACE-{account_id}"
                if tx.dst_account not in visited:
                    visited.add(tx.dst_account)
                    dst = self.accounts[tx.dst_account]
                    dst.freeze_status = "frozen"
                    dst.is_flagged = True
                    dst.flagged_at = tx.timestamp
                    frozen_chain.append(tx.dst_account)
                    queue.append((tx.dst_account, tx.timestamp, depth + 1))
        return frozen_chain

# ----------------------------------------------------
# Demo Graph Builder (matching Appendix A / page 21)
# ----------------------------------------------------

def build_demo_graph(num_normal_accounts=40, chain_length=5):
    g = TransactionGraph()
    banks = ["BankA", "BankB", "BankC", "BankD"]
    
    # 1. Create normal background accounts
    # We set their creation time to 2.5 hours before normal transactions start
    # so they do not falsely trigger "dormant reactivation"
    now = time.time()
    normal_creation_time = now - 150 * 60 - 3600
    for i in range(num_normal_accounts):
        g.add_account(f"ACC{i:03d}", random.choice(banks), created_at=normal_creation_time)
        
    # Record 150 random background transactions spread out BEFORE the fraud chain
    for i in range(150):
        src, dst = random.sample(list(g.accounts.keys()), 2)
        g.record_transaction(Transaction(
            tx_id=f"TX{i:04d}",
            src_account=src,
            dst_account=dst,
            amount=random.uniform(200, 5000),
            timestamp=now - 150 * 60 + i * 60
        ))
        
    # 2. Inject Fraud Chain: victim -> mule1 -> mule2 -> mule3 -> cash-out
    # We simulate dormant reactivation for the mules and victim by setting their creation time 35 days ago,
    # but their first transaction happens suddenly today.
    mule_creation_time = now - 35 * 24 * 3600
    chain = ["VICTIM"] + [f"MULE{i}" for i in range(1, chain_length)]
    
    for acc_id in chain:
        g.add_account(acc_id, random.choice(banks), created_at=mule_creation_time)
        
    stolen_amount = 250000.0
    for i in range(len(chain) - 1):
        # Mules forward funds fast (20 seconds apart per simulate.py)
        g.record_transaction(Transaction(
            tx_id=f"FRAUD_TX{i}",
            src_account=chain[i],
            dst_account=chain[i+1],
            amount=round(stolen_amount * (0.97 ** i), 2),
            timestamp=now + 300 + i * 20  # 20 seconds apart
        ))
        
    return g, chain

# ----------------------------------------------------
# Validation Execution
# ----------------------------------------------------

def run_validation():
    print("====================================================")
    print("TraceFlux ML Engine Validation Test Suite")
    print("====================================================\n")
    
    # Set random seed for reproducibility
    random.seed(42)
    
    # Build demo graph
    graph, fraud_chain = build_demo_graph()
    print(f"Generated graph with {len(graph.accounts)} accounts.")
    print(f"Injected fraud chain: {' -> '.join(fraud_chain)}\n")
    
    # Score all accounts
    all_scores = {}
    print("--- SCORING RESULTS ---")
    for acc_id in graph.accounts.keys():
        features = compute_features(graph, acc_id)
        score = score_account(features)
        classification = classify(score)
        all_scores[acc_id] = (score, classification, features)
        
    # Verify Fraud Chain is flagged
    print("\nFraud Chain Scoring Details:")
    fraud_flagged = True
    for acc_id in fraud_chain:
        if acc_id not in all_scores:
            print(f"Error: {acc_id} not found in scores!")
            fraud_flagged = False
            continue
            
        score, classification, features = all_scores[acc_id]
        explanation = explain_score(features)
        print(f"  {acc_id:8} | Score: {score:.3f} | Class: {classification:9} | Expl: {explanation}")
        
        # If it's a mule or victim, it must be WATCH or HIGH_RISK.
        if classification not in ["WATCH", "HIGH_RISK"]:
            print(f"  FAILED: {acc_id} was classified as CLEAN!")
            fraud_flagged = False
                
    # Verify normal accounts are mostly CLEAN
    normal_clean_count = 0
    normal_watch_count = 0
    normal_high_count = 0
    total_normal = 0
    
    for acc_id, (score, classification, _) in all_scores.items():
        if acc_id not in fraud_chain:
            total_normal += 1
            if classification == "CLEAN":
                normal_clean_count += 1
            elif classification == "WATCH":
                normal_watch_count += 1
            elif classification == "HIGH_RISK":
                normal_high_count += 1
                
    print(f"\nNormal Accounts Summary:")
    print(f"  Total Normal Accounts: {total_normal}")
    print(f"  CLEAN:      {normal_clean_count} ({normal_clean_count/total_normal*100:.1f}%)")
    print(f"  WATCH:      {normal_watch_count} ({normal_watch_count/total_normal*100:.1f}%)")
    print(f"  HIGH_RISK:  {normal_high_count} ({normal_high_count/total_normal*100:.1f}%)")
    
    # Assertions
    success = True
    if not fraud_flagged:
        print("\n[FAIL] Some fraud chain accounts were not correctly flagged!")
        success = False
    else:
        print("\n[SUCCESS] All fraud chain accounts were flagged (WATCH or HIGH_RISK)!")
        
    normal_clean_ratio = normal_clean_count / total_normal
    if normal_clean_ratio < 0.85:
        print(f"[FAIL] Too many normal accounts flagged as suspicious! Clean ratio: {normal_clean_ratio:.1f}")
        success = False
    else:
        print(f"[SUCCESS] Normal background accounts are mostly CLEAN (clean ratio: {normal_clean_ratio*100:.1f}%)")
        
    if success:
        print("\n====================================================")
        print("ALL TESTS PASSED SUCCESSFULLY!")
        print("====================================================")
        return 0
    else:
        print("\n====================================================")
        print("VALIDATION SUITE FAILED!")
        print("====================================================")
        return 1

if __name__ == "__main__":
    exit(run_validation())
