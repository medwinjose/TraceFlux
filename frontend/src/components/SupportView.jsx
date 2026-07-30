import React from 'react';

export default function SupportView() {
  return (
    <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 32, background: 'var(--bg-void)', overflowY: 'auto' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <h2 style={{ fontSize: 24, color: 'var(--text-primary)', fontFamily: '"Playfair Display", serif', fontWeight: 600 }}>Technical Support</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Contact system administrators or view TraceNet documentation.</p>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            📞
          </div>
          <div>
            <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>Emergency Hotline</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>For critical outages or manual override requests.</div>
            <div style={{ fontSize: 14, color: 'var(--cyan)', marginTop: 8, fontWeight: 500 }}>+1 (800) 555-0199</div>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            📖
          </div>
          <div>
            <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>TraceNet Documentation</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Read about ML models, physics engine parameters, and API integration.</div>
            <button style={{ marginTop: 12, padding: '8px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)' }}>
              Open Wiki
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
