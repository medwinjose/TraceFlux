import React, { useState, useEffect } from 'react';

const FEAT_LABELS = {
  fan_out_ratio:       'Fan-Out Ratio',
  velocity:            'Tx Velocity',
  dormant_reactivation:'Dormant Reactivation',
  structuring_score:   'Structuring Activity',
  hold_time_inverse:   'Short Hold Time',
};
const FEAT_DESC = {
  fan_out_ratio:        'Split & forward of incoming funds to unique recipients.',
  velocity:             'Frequency of transactions in a recent time window.',
  dormant_reactivation: 'Sudden reactivation after 30+ days of dormancy.',
  structuring_score:    'Transactions kept deliberately under reporting thresholds.',
  hold_time_inverse:    'Funds are instantly forwarded after receipt.',
};

function scoreColor(score) {
  if (score >= 0.75) return 'var(--red)';
  if (score >= 0.45) return 'var(--amber)';
  return 'var(--cyan)';
}
function scoreGradient(score) {
  if (score >= 0.75) return 'linear-gradient(90deg,#7f1d1d,#ef4444)';
  if (score >= 0.45) return 'linear-gradient(90deg,#78350f,#f59e0b)';
  return 'linear-gradient(90deg,#0c4a6e,#06b6d4)';
}

export default function RiskPanel({ selectedNodeId, nodes = [] }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('ALL');
  const [sort,   setSort]             = useState('SCORE_DESC');

  /* Fetch explanation when a node is selected */
  useEffect(() => {
    if (!selectedNodeId) { setExplanation(null); return; }
    setLoading(true);
    Promise.all([
      fetch(`/api/accounts/${selectedNodeId}/explain`).then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ]).then(([contribs, accounts]) => {
      const acc = accounts.find(a => a.account_id === selectedNodeId);
      if (acc) {
        const features = Object.entries(contribs)
          .map(([k, v]) => ({ key: k, val: v }))
          .sort((a, b) => b.val - a.val);
        setExplanation({ ...acc, features });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedNodeId]);

  /* Account list derived from nodes prop */
  const accounts = nodes
    .filter(n => {
      if (filter !== 'ALL' && n.classification !== filter) return false;
      if (search && !n.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'SCORE_DESC') return (b.risk_score || 0) - (a.risk_score || 0);
      if (sort === 'SCORE_ASC')  return (a.risk_score || 0) - (b.risk_score || 0);
      return a.id.localeCompare(b.id);
    });

  /* ─── Selected node inspector ─────────────────────────────────── */
  if (selectedNodeId) {
    if (loading) return (
      <div className="explain-panel loading fade-in">
        <div style={{ width:24, height:24, border:'2px solid var(--cyan)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>Fetching ML data…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

    if (!explanation) return (
      <div className="explain-panel loading">
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>No data for {selectedNodeId}</div>
      </div>
    );

    const classLo = (explanation.classification || 'CLEAN').toLowerCase().replace('_','');
    return (
      <div className="explain-panel fade-in">
        {/* Header */}
        <div className="explain-header">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div className="explain-id">{explanation.account_id}</div>
              <div className="explain-sub">{explanation.bank_id}</div>
            </div>
            <span className={`risk-class ${classLo}`} style={{ alignSelf:'center' }}>
              {(explanation.classification || 'CLEAN').replace('_',' ')}
            </span>
          </div>

          {/* Score meter */}
          <div className="score-meter" style={{ marginTop:12 }}>
            <div className="score-row">
              <span className="score-label">Anomaly Risk Score</span>
              <span className="score-val" style={{ color: scoreColor(explanation.risk_score) }}>
                {Math.round((explanation.risk_score || 0) * 100)}%
              </span>
            </div>
            <div className="score-track">
              <div
                className="score-fill"
                style={{
                  width:`${(explanation.risk_score || 0) * 100}%`,
                  background: scoreGradient(explanation.risk_score),
                }}
              />
            </div>
          </div>
        </div>

        {/* Explainability */}
        <div className="feat-title" style={{ marginTop:4 }}>ML Feature Contributions</div>
        {(explanation.features || []).map(({ key, val }) => (
          <div key={key} className="feat-row">
            <div className="feat-meta">
              <span className="feat-name">{FEAT_LABELS[key] || key}</span>
              <span className="feat-val" style={{ color: val >= 0.2 ? 'var(--red)' : val >= 0.1 ? 'var(--amber)' : 'var(--cyan)' }}>
                +{val.toFixed(3)}
              </span>
            </div>
            <div className="feat-track">
              <div
                className="feat-fill"
                style={{
                  width:`${Math.min(val * 280, 100)}%`,
                  background: val >= 0.2 ? 'var(--red)' : val >= 0.1 ? 'var(--amber)' : 'var(--cyan)',
                }}
              />
            </div>
            <div style={{ fontSize:9, color:'var(--text-muted)', lineHeight:1.4 }}>{FEAT_DESC[key]}</div>
          </div>
        ))}

        {/* Freeze status */}
        {explanation.freeze_status === 'frozen' && (
          <div style={{
            background:'var(--red-lo)', border:'1px solid rgba(239,68,68,0.2)',
            borderRadius:7, padding:'8px 12px', marginTop:4,
            fontSize:11, color:'var(--red)', fontWeight:600,
          }}>
            ⚠ Account is currently FROZEN via tag propagation
          </div>
        )}
      </div>
    );
  }

  /* ─── Account list ────────────────────────────────────────────── */
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Filter controls */}
      <div style={{ padding:'8px', borderBottom:'1px solid var(--border)', display:'flex', gap:6 }}>
        <input
          style={{
            flex:1, background:'var(--bg-surface)', border:'1px solid var(--border)',
            borderRadius:6, padding:'5px 8px', fontSize:11, color:'var(--text-primary)',
            outline:'none', fontFamily:'inherit',
          }}
          placeholder="Search account ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          value={sort} onChange={e => setSort(e.target.value)}
          style={{
            background:'var(--bg-surface)', border:'1px solid var(--border)',
            borderRadius:6, padding:'5px 8px', fontSize:10, color:'var(--text-secondary)',
            outline:'none', cursor:'pointer',
          }}
        >
          <option value="SCORE_DESC">High → Low</option>
          <option value="SCORE_ASC">Low → High</option>
          <option value="ID_ASC">A → Z</option>
        </select>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)' }}>
        {['ALL','HIGH_RISK','WATCH','CLEAN'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex:1, padding:'6px 4px', fontSize:9, fontWeight:700,
              textTransform:'uppercase', letterSpacing:0.5,
              background: filter === f ? 'var(--bg-elevated)' : 'transparent',
              border:'none', borderBottom: filter === f ? '2px solid var(--cyan)' : '2px solid transparent',
              color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor:'pointer', transition:'all 0.15s',
            }}
          >{f === 'HIGH_RISK' ? 'HIGH' : f}</button>
        ))}
      </div>

      <div className="risk-list">
        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <div className="empty-title">No accounts found</div>
          </div>
        ) : (
          accounts.map(n => {
            const cls = (n.classification || 'CLEAN').toLowerCase().replace('_','');
            const sc  = Math.round((n.risk_score || 0) * 100);
            const col = n.classification === 'HIGH_RISK' ? 'var(--red)'
                      : n.classification === 'WATCH'     ? 'var(--amber)' : 'var(--cyan)';
            return (
              <div
                key={n.id}
                className={`risk-row ${cls} ${selectedNodeId === n.id ? 'selected' : ''}`}
                onClick={() => {}}
              >
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="risk-id" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {n.id}
                  </div>
                  <div style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>
                    {n.bank_id || '—'}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                  <div className="risk-score" style={{ color: col }}>{sc}%</div>
                  <span className={`risk-class ${cls}`}>{(n.classification || 'CLEAN').replace('_',' ')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
