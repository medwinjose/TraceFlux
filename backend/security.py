"""
TraceNet - Security Module
Owner: Systems/Backend

Provides three security primitives:
  1. HMAC-SHA256 signing of outgoing freeze commands
     -> Banks can verify a freeze instruction genuinely came from TraceNet.
  2. Hash-chained tamper-evident evidence log
     -> Each freeze record is chained to the previous one via sha256(prev_hash || event_bytes).
       Altering any past record breaks every hash that follows.
  3. Replay / idempotency protection
     -> A set of processed report IDs ensures the same fraud report cannot be
       replayed or double-processed.
"""
import hashlib
import hmac as _hmac
import json
import os
import secrets
import time
from typing import Any, Dict, List, Tuple

# -- HMAC Key ------------------------------------------------------------------
_HMAC_KEY: bytes = os.getenv("TRACENET_HMAC_KEY", secrets.token_hex(32)).encode()
HMAC_KEY_FINGERPRINT: str = hashlib.sha256(_HMAC_KEY).hexdigest()[:16]
GENESIS_HASH = "0" * 64


def sign_freeze_command(account_id: str, bank_id: str, frozen_chain: List[str]) -> str:
    payload = json.dumps(
        {"account_id": account_id, "bank_id": bank_id, "frozen_chain": frozen_chain},
        sort_keys=True,
    ).encode()
    return _hmac.new(_HMAC_KEY, payload, hashlib.sha256).hexdigest()


def verify_freeze_signature(account_id: str, bank_id: str, frozen_chain: List[str], signature: str) -> bool:
    expected = sign_freeze_command(account_id, bank_id, frozen_chain)
    return _hmac.compare_digest(expected, signature)


class EvidenceChain:
    """Append-only tamper-evident hash-chained ledger."""

    def __init__(self):
        self.records: List[Dict[str, Any]] = []
        self._prev_hash: str = GENESIS_HASH
        self._processed_ids: set = set()

    def is_duplicate(self, report_id: str) -> bool:
        return report_id in self._processed_ids

    def register(self, report_id: str) -> None:
        self._processed_ids.add(report_id)

    def append(
        self,
        event_type: str,
        account_id: str,
        bank_id: str,
        reason_plain: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        timestamp = time.time()
        event_data: Dict[str, Any] = {
            "event_type":   event_type,
            "account_id":   account_id,
            "bank_id":      bank_id,
            "reason_plain": reason_plain,
            "metadata":     metadata,
            "timestamp":    timestamp,
        }
        event_bytes = json.dumps(event_data, sort_keys=True).encode()
        chain_input = self._prev_hash.encode() + event_bytes
        event_hash  = hashlib.sha256(chain_input).hexdigest()
        signature   = _hmac.new(_HMAC_KEY, event_bytes, hashlib.sha256).hexdigest()
        record: Dict[str, Any] = {
            **event_data,
            "seq":        len(self.records) + 1,
            "prev_hash":  self._prev_hash,
            "event_hash": event_hash,
            "signature":  signature,
        }
        self.records.append(record)
        self._prev_hash = event_hash
        return record

    def verify_chain(self) -> Tuple[bool, List[str]]:
        errors: List[str] = []
        prev = GENESIS_HASH
        for record in self.records:
            event_fields = ["event_type", "account_id", "bank_id",
                            "reason_plain", "metadata", "timestamp"]
            event_data = {k: record[k] for k in event_fields}
            event_bytes = json.dumps(event_data, sort_keys=True).encode()
            chain_input = prev.encode() + event_bytes
            expected_hash = hashlib.sha256(chain_input).hexdigest()
            if record.get("prev_hash") != prev:
                errors.append(f"Record {record['seq']}: prev_hash mismatch (TAMPERING DETECTED)")
            if record.get("event_hash") != expected_hash:
                errors.append(f"Record {record['seq']}: event_hash invalid (TAMPERING DETECTED)")
            prev = record.get("event_hash", "")
        return (len(errors) == 0), errors

    def get_all(self) -> List[Dict[str, Any]]:
        return list(reversed(self.records))

    def reset(self) -> None:
        self.records.clear()
        self._prev_hash = GENESIS_HASH
        self._processed_ids.clear()
