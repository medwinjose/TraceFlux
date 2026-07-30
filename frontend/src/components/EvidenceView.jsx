import React, { useState, useEffect } from 'react';

function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}
function fmtDate(ts) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const EV_META = {
  VICTIM_REPORT:  { label: 'ORIGIN',     cls: 'ev-tag-origin' },
  TAG_PROPAGATED: { label: 'PROPAGATED', cls: 'ev-tag-propagated' },
  ML_HIGH_RISK:   { label: 'ML FLAGGED', cls: 'ev-tag-ml' },
};

export default function EvidenceView() {
  const [chainData,    setChainData]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [verifying,    setVerifying]    = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const fetchChain = async () => {
    try {
      const res  = await fetch('/api/evidence_chain');
      const data = await res.json();
      setChainData(data);
    } catch (_) { /* backend not ready */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchChain();
    const id = setInterval(fetchChain, 3000);
    return () => clearInterval(id);
  }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res  = await fetch('/api/evidence_chain/verify');
      const data = await res.json();
      setVerifyResult(data);
    } catch (_) {
      setVerifyResult({ chain_valid: false, chain_length: 0, errors: ['Backend unreachable'], verdict: 'Error connecting to backend.' });
    }
    setVerifying(false);
  };

  if (loading) return (
    <div className="view-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading evidence chain…</div>
    </div>
  );

  const records = chainData?.records || [];
  const chainOk = chainData?.chain_valid !== false;

  return (
    <div className="view-container">
      {/* ── Header ── */}
      <div className="view-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h2 className="view-title">Tamper-Evident Evidence Chain</h2>
            <p className="view-subtitle">
              Every freeze event is cryptographically sealed. Altering any record breaks every hash that follows it.
            </p>
          </div>
          <button className="ev-verify-btn" onClick={handleVerify} disabled={verifying}>
            {verifying ? '⟳ Verifying…' : '⬡ Verify Chain Integrity'}
          </button>
        </div>
      </div>

      {/* ── Verify Result Banner ── */}
      {verifyResult && (
        <div className={`ev-verdict ${verifyResult.chain_valid ? 'valid' : 'invalid'}`}>
          <span className="ev-verdict-icon">{verifyResult.chain_valid ? '✓' : '✗'}</span>
          <div>
            <div className="ev-verdict-title">{verifyResult.verdict}</div>
            <div className="ev-verdict-sub">
              {verifyResult.chain_length} records examined · {verifyResult.errors?.length || 0} integrity errors found
            </div>
          </div>
        </div>
      )}

      {/* ── Chain Stats Row ── */}
      <div className="ev-stats-row">
        <div className="ev-stat">
          <div className="ev-stat-num">{records.length}</div>
          <div className="ev-stat-label">Freeze Events Recorded</div>
        </div>
        <div className="ev-stat">
          <div className="ev-stat-num" style={{ color: chainOk ? 'var(--green)' : 'var(--red)', fontSize: 14 }}>
            {chainOk ? '✓ INTACT' : '✗ BROKEN'}
          </div>
          <div className="ev-stat-label">Chain Integrity</div>
        </div>
        <div className="ev-stat">
          <div className="ev-stat-num" style={{ fontSize: 11, letterSpacing: 0 }}>
            {chainData?.hmac_fingerprint || '—'}
          </div>
          <div className="ev-stat-label">HMAC Key Fingerprint</div>
        </div>
        <div className="ev-stat">
          <div className="ev-stat-num" style={{ fontSize: 10, letterSpacing: 0 }}>
            {chainData?.latest_hash ? chainData.latest_hash.slice(0, 16) + '…' : '—'}
          </div>
          <div className="ev-stat-label">Latest Block Hash</div>
        </div>
      </div>

      {/* ── Empty State ── */}
      {records.length === 0 && (
        <div className="empty-state" style={{ flex: 0, padding: '56px 24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div className="empty-icon">🔗</div>
          <div className="empty-title">No freeze events recorded yet</div>
          <div className="empty-sub">
            Click "Trigger Fraud Report" in the header to generate evidence chain records
          </div>
        </div>
      )}

      {/* ── Chain ── */}
      {records.length > 0 && (
        <div className="ev-chain">
          {/* Genesis block */}
          <div className="ev-genesis">
            <div className="ev-genesis-label">GENESIS BLOCK</div>
            <div className="ev-genesis-hash">{'0'.repeat(64)}</div>
            <div className="ev-genesis-note">Chain foundation — immutable reference point</div>
          </div>

          {/* Evidence Records (oldest → newest, so chain reads top-down) */}
          {[...records].reverse().map((rec) => {
            const meta = EV_META[rec.event_type] || EV_META.TAG_PROPAGATED;
            return (
              <div key={rec.seq} className="ev-card-wrap">
                {/* Connector */}
                <div className="ev-connector">
                  <div className="ev-connector-line" />
                  <div className="ev-connector-dot" />
                </div>

                <div className="ev-card">
                  {/* Top row */}
                  <div className="ev-card-top">
                    <span className="ev-seq">#{String(rec.seq).padStart(3, '0')}</span>
                    <span className={`ev-tag ${meta.cls}`}>{meta.label}</span>
                    <span className="ev-card-time">{fmtDate(rec.timestamp)} · {fmtTime(rec.timestamp)}</span>
                    {rec.metadata?.hop !== undefined && (
                      <span className="ev-hop-badge">Hop {rec.metadata.hop}</span>
                    )}
                  </div>

                  {/* Account + bank */}
                  <div className="ev-account-row">
                    <span className="ev-account-id">{rec.account_id}</span>
                    <span className="ev-account-bank">{rec.bank_id}</span>
                  </div>

                  {/* Plain-English Reason — the differentiator */}
                  <div className="ev-reason">
                    <div className="ev-reason-label">FREEZE REASON</div>
                    <div className="ev-reason-text">&ldquo;{rec.reason_plain}&rdquo;</div>
                  </div>

                  {/* Hash chain visualization */}
                  <div className="ev-hash-chain">
                    <div className="ev-hash-pill prev">
                      <span className="ev-hash-label">PREV</span>
                      <span className="ev-hash-val">{rec.prev_hash.slice(0, 12)}…</span>
                    </div>
                    <div className="ev-hash-arrow">
                      <span className="ev-hash-algo">SHA-256</span>
                      <span className="ev-hash-chev">→</span>
                    </div>
                    <div className="ev-hash-pill current">
                      <span className="ev-hash-label">THIS</span>
                      <span className="ev-hash-val">{rec.event_hash.slice(0, 12)}…</span>
                    </div>
                    <div className="ev-hash-sep" />
                    <div className="ev-hash-pill sig">
                      <span className="ev-hash-label">HMAC-SIG</span>
                      <span className="ev-hash-val">{rec.signature.slice(0, 12)}…</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
