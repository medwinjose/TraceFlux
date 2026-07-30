import React, { useState } from 'react';

export default function WatchlistView({ nodes }) {
  const [hoveredId, setHoveredId] = useState(null);

  const watchNodes = nodes
    .filter(n => n.classification === 'WATCH' || n.classification === 'HIGH_RISK')
    .sort((a, b) => b.risk_score - a.risk_score);

  // Calculate min and max for dynamic scaling so it doesn't look like a straight line
  const maxScore = watchNodes.length > 0 ? Math.max(...watchNodes.map(n => n.risk_score)) : 1;
  const minScore = watchNodes.length > 0 ? Math.min(...watchNodes.map(n => n.risk_score)) : 0;
  const range = Math.max(maxScore - minScore, 0.1); // Avoid division by zero

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 0 }}>
      <div className="view-header" style={{ flexShrink: 0 }}>
        <h2 className="view-title">Proactive Watchlist</h2>
        <p className="view-subtitle">Accounts exhibiting pre-fraud structuring and anomalous velocity.</p>
      </div>

      {/* Risk Score vs. Tx Velocity Visualization */}
      <div style={{
        height: 200, flexShrink: 0, background: 'var(--bg-base)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '24px 24px 0 24px', display: 'flex', alignItems: 'flex-end', gap: 12,
        overflowX: 'auto', overflowY: 'hidden', position: 'relative',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
      }}>
        {watchNodes.map((n, idx) => {
          // Dynamically scale height between 20% and 95% based on min/max in dataset
          const normalized = (n.risk_score - minScore) / range;
          const height = `${20 + (normalized * 75)}%`;
          const isHovered = hoveredId === n.id;
          
          return (
            <div 
              key={n.id} 
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={`${n.id} - ${Math.round(n.risk_score*100)}%`}
              style={{ 
                flex: 1, 
                minWidth: 40,
                background: isHovered 
                  ? 'linear-gradient(180deg, var(--amber), var(--amber-lo))' 
                  : 'linear-gradient(180deg, var(--amber-hi), var(--amber-lo))', 
                height: height, 
                borderRadius: '6px 6px 0 0', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingTop: 8,
                opacity: hoveredId && !isHovered ? 0.5 : 1,
                transform: isHovered ? 'scaleY(1.02)' : 'none',
                transformOrigin: 'bottom',
                animation: `slide-in-up 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards`,
                animationDelay: `${idx * 0.05}s`
              }} 
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: isHovered ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                {Math.round(n.risk_score*100)}%
              </span>
            </div>
          );
        })}
        {watchNodes.length === 0 && (
          <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center', paddingBottom: 24 }}>
            Not enough data for visualization
          </div>
        )}
      </div>

      <div style={{ 
        flex: 1, minHeight: 0, background: 'var(--bg-base)', border: '1px solid var(--border)', 
        borderRadius: '8px 8px 0 0', overflowY: 'auto', overflowX: 'hidden',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        marginBottom: 32
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Account ID</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Bank</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Risk Score</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {watchNodes.map((n, idx) => {
              const isHovered = hoveredId === n.id;
              return (
                <tr 
                  key={n.id} 
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ 
                    borderBottom: '1px solid var(--border-md)',
                    background: isHovered ? 'var(--bg-hover)' : 'transparent',
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    cursor: 'pointer',
                    animation: `slide-in-right 0.4s ease-out backwards`,
                    animationDelay: `${idx * 0.05}s`
                  }}
                >
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
              );
            })}
            {watchNodes.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No accounts currently on watchlist.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
