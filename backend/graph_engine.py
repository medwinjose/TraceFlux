"""
TraceFlux - Core Transaction Graph & Tag Propagation Engine
Owner: Systems/Backend
"""
from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional
from collections import defaultdict, deque
import time

@dataclass
class Account:
    account_id: str
    bank_id: str
    is_flagged: bool = False
    flagged_at: Optional[float] = None
    freeze_status: str = "active"  # active | under_review | frozen
    risk_score: float = 0.0
    created_at: float = field(default_factory=time.time)

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
        self.incoming: Dict[str, List[Transaction]] = defaultdict(list)
        self.transactions: Dict[str, Transaction] = {}

    def add_account(self, account_id: str, bank_id: str, created_at: Optional[float] = None) -> Account:
        ct = created_at if created_at is not None else time.time()
        acc = Account(account_id=account_id, bank_id=bank_id, created_at=ct)
        self.accounts[account_id] = acc
        return acc

    def record_transaction(self, tx: Transaction):
        self.transactions[tx.tx_id] = tx
        self.outgoing[tx.src_account].append(tx)
        self.incoming[tx.dst_account].append(tx)

    def report_fraud(self, account_id: str, reported_at: Optional[float] = None, max_hops: int = 5) -> List[str]:
        """
        Entry point: a victim or bank reports an account as the source
        of fraud. Propagates a trace tag forward through the graph,
        hop by hop, freezing accounts as the tag reaches them.

        IMPORTANT: only follows transactions that happened AFTER the
        tainted money arrived at each account -- this prevents flagging
        a mule account's unrelated PAST transactions as fraudulent.
        """
        if account_id not in self.accounts:
            return []

        reported_at = reported_at or time.time()
        origin = self.accounts[account_id]
        origin.is_flagged = True
        origin.flagged_at = reported_at
        origin.freeze_status = "frozen"

        visited: Set[str] = {account_id}
        frozen_chain = [account_id]

        # For origin node, allow outgoing transfers (earliest_ts = 0 or reported_at if specified)
        origin_earliest_ts = 0 if reported_at == origin.flagged_at else reported_at
        queue = deque([(account_id, origin_earliest_ts, 0)])

        while queue:
            current_id, earliest_ts, depth = queue.popleft()
            if depth >= max_hops:
                continue

            for tx in self.outgoing.get(current_id, []):
                # Only follow transactions AFTER tainted funds arrived
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

    def get_events(self) -> List[dict]:
        """Utility method to inspect state for UI/debug"""
        return [
            {
                "account_id": acc.account_id,
                "bank_id": acc.bank_id,
                "is_flagged": acc.is_flagged,
                "freeze_status": acc.freeze_status,
                "risk_score": acc.risk_score,
            }
            for acc in self.accounts.values()
        ]
