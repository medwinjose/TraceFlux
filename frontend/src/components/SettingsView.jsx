import React, { useState, useEffect } from 'react';

export default function SettingsView() {
  const [settings, setSettings] = useState({ auto_freeze_confidence: 0.925, max_hops: 3 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching settings:", err);
        setLoading(false);
      });
  }, []);

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      })
      .catch(err => {
        console.error("Error saving settings:", err);
        setSaving(false);
      });
  };

  const handleConfChange = (e) => {
    setSettings(prev => ({ ...prev, auto_freeze_confidence: parseFloat(e.target.value) / 100 }));
  };

  const handleHopsChange = (e) => {
    setSettings(prev => ({ ...prev, max_hops: parseInt(e.target.value) }));
  };

  if (loading) {
    return <div className="view-container"><div className="view-header"><h2 className="view-title">System Settings</h2></div></div>;
  }

  return (
    <div className="view-container">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="view-title">System Settings</h2>
          <p className="view-subtitle">Manage fraud interdiction parameters and system preferences.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{
            background: saved ? 'var(--cyan)' : 'var(--bg-surface)',
            border: `1px solid ${saved ? 'var(--cyan)' : 'var(--border-hi)'}`,
            color: saved ? '#fff' : 'var(--text-primary)',
            padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h3 style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Risk Thresholds</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Auto-Freeze Confidence Score</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Minimum ML confidence required to automatically freeze an account.</div>
            <input 
              type="range" 
              min="50" max="100" step="0.5" 
              value={Math.round(settings.auto_freeze_confidence * 1000) / 10}
              onChange={handleConfChange}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 16, color: 'var(--amber)', minWidth: 80, textAlign: 'center' }}>
            {Math.round(settings.auto_freeze_confidence * 1000) / 10}%
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Velocity Propagation Distance</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>How many hops outward a fraud tag spreads.</div>
            <input 
              type="range" 
              min="1" max="10" step="1" 
              value={settings.max_hops}
              onChange={handleHopsChange}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 16, color: 'var(--cyan)', minWidth: 80, textAlign: 'center' }}>
            {settings.max_hops} Hops
          </div>
        </div>
      </div>
    </div>
  );
}
