import React from 'react';

const TAG_LABELS = {
  PROPAGATED_TAG:        { label: 'BLOCKED',     cls: 'blocked' },
  VICTIM_REPORT_ORIGIN:  { label: 'INTERDICTED', cls: 'interdicted' },
  HIGH_RISK_ANOMALY:     { label: 'FLAGGED',     cls: 'propagated' },
};

function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

export default function AlertFeed({ alerts = [] }) {
  return (
    <div className="alert-section">
      <div className="panel-header">
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--red)', display:'inline-block',
            animation: alerts.length > 0 ? 'pulse-red-dot 1s infinite' : 'none' }} />
          <span className="panel-title">Live Interdiction Feed</span>
        </div>
        <span className="panel-count">{alerts.length} Alerts</span>
      </div>

      <div className="alert-list">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛡</div>
            <div className="empty-title">No active interdictions</div>
            <div className="empty-sub">Click "Trigger Fraud Report" to start tag propagation</div>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const tag = TAG_LABELS[alert.reason] || { label: 'FLAGGED', cls: 'propagated' };
            return (
              <div key={alert.alert_id || i} className="alert-card">
                <div className="alert-top">
                  <span className={`alert-tag ${tag.cls}`}>{tag.label}</span>
                  <span className="alert-time">{fmtTime(alert.timestamp)}</span>
                </div>

                <div className="alert-id">{alert.account_id}</div>
                <div className="alert-bank">{alert.bank_id}</div>
                <div className="alert-msg">{alert.message}</div>

                {alert.reason_plain && (
                  <div className="alert-reason">
                    <div className="alert-reason-label">Freeze Reason</div>
                    {alert.reason_plain}
                  </div>
                )}

                {alert.signature && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>HMAC-SIG</span>
                    <span style={{ fontSize: 9, color: 'var(--amber)', fontFamily: 'JetBrains Mono, monospace' }}>{alert.signature}</span>
                  </div>
                )}

                {alert.traced_path && alert.traced_path.length > 0 && (
                  <div className="alert-trace">
                    {alert.traced_path.map((node, j) => (
                      <React.Fragment key={j}>
                        <span className={`trace-node ${j === alert.traced_path.length - 1 ? 'last' : ''}`}>
                          {node}
                        </span>
                        {j < alert.traced_path.length - 1 && <span className="trace-sep">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
