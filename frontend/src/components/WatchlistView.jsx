import React from 'react';

export default function WatchlistView({ nodes }) {
  const watchNodes = nodes
    .filter(n => n.classification === 'WATCH' || n.classification === 'HIGH_RISK')
    .sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--bg-void)', overflowY: 'auto' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <h2 style={{ fontSize: 18, color: 'var(--text-primary)', letterSpacing: 2, textTransform: 'uppercase' }}>Proactive Watchlist</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Accounts exhibiting pre-fraud structuring and anomalous velocity.</p>
      </div>

      {/* Risk Score vs. Tx Velocity Visualization */}
      <div style={{
        height: 160, background: 'var(--bg-base)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '24px 24px 0 24px', display: 'flex', alignItems: 'flex-end', gap: 8,
        overflowX: 'auto', overflowY: 'hidden'
      }}>
        {watchNodes.map(n => {
          const height = `${Math.max(5, n.risk_score * 100)}%`;
          return (
            <div 
              key={n.id} 
              title={`${n.id} - ${Math.round(n.risk_score*100)}%`}
              style={{ 
                flex: 1, 
                minWidth: 20,
                background: 'linear-gradient(180deg, var(--gold-hi), var(--gold-lo))', 
                height: height, 
                borderRadius: '4px 4px 0 0', 
                transition: 'height 0.5s ease',
                cursor: 'pointer'
              }} 
            />
          );
        })}
        {watchNodes.length === 0 && (
          <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center', paddingBottom: 24 }}>
            Not enough data for visualization
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Account ID</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Bank</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Risk Score</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {watchNodes.map(n => (
              <tr key={n.id} style={{ borderBottom: '1px solid var(--border-md)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{n.id}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{n.bank_id}</td>
                <td style={{ padding: '12px 16px', color: 'var(--amber)', fontWeight: 700 }}>{Math.round(n.risk_score * 100)}%</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: 'var(--amber-lo)', color: 'var(--amber)', border: '1px solid rgba(217,119,6,0.2)'
                  }}>FLAGGED</span>
                </td>
              </tr>
            ))}
            {watchNodes.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No accounts currently on watchlist.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
