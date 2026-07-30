import React from 'react';

export default function SettingsView() {
  return (
    <div className="view-container">
      <div className="view-header">
        <h2 className="view-title">System Settings</h2>
        <p className="view-subtitle">Manage fraud interdiction parameters and system preferences.</p>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Risk Thresholds</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Auto-Freeze Confidence Score</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Minimum ML confidence required to automatically freeze an account.</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, fontWeight: 600 }}>
            92.5%
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Velocity Propagation Distance</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>How many hops outward a fraud tag spreads.</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, fontWeight: 600 }}>
            3 Hops
          </div>
        </div>
      </div>
    </div>
  );
}
