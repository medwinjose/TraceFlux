import React from 'react';

const NAV_ITEMS = [
  { icon: '◈', label: 'Network Map',    id: 'network',  badge: null },
  { icon: '⚠', label: 'Alerts',         id: 'alerts',   badge: null },
  { icon: '🔗', label: 'Evidence Chain', id: 'evidence', badge: null },
  { icon: '◻', label: 'Assets',         id: 'assets',   badge: null },
  { icon: '◉', label: 'Watchlist',      id: 'watch',    badge: null },
];

export default function Sidebar({ activeView, onViewChange, alertCount }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="sidebar-logo-mark" style={{ width: 36, height: 36, padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--text-primary)' }}>
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </div>
        <div>
          <div className="sidebar-brand">TraceNet</div>
          <div className="sidebar-sub">Financial Interdiction</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Surveillance</div>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'alerts' && alertCount > 0 && (
              <span className="nav-badge">{alertCount}</span>
            )}
          </div>
        ))}

        <div className="nav-section-label" style={{ marginTop: 8 }}>System</div>
        <div 
          className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => onViewChange('settings')}
        >
          <span className="nav-icon">⚙</span>
          <span>Settings</span>
        </div>
        <div 
          className={`nav-item ${activeView === 'support' ? 'active' : ''}`}
          onClick={() => onViewChange('support')}
        >
          <span className="nav-icon">?</span>
          <span>Support</span>
        </div>
      </nav>

      {/* Footer controls */}
      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">SA</div>
          <div>
            <div className="user-name">SYS_ADMIN</div>
            <div className="user-role">#10_0822-X</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
