import React, { useState } from 'react';

export default function Header({ wsConnected, onReportFraud, onReset, isReporting, onSearch }) {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    setQuery(e.target.value);
    onSearch && onSearch(e.target.value);
  };

  return (
    <header className="topbar">
      {/* Brand */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24, color: 'var(--text-primary)' }}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
        <div>
          <div className="topbar-title">TraceNet</div>
          <div className="topbar-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
          <span className="system-status">
            <span className="status-dot pulse" />
            System Status: <strong>Nominal</strong>
          </span>
        </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>⌕</span>
        <input
          placeholder="Trace account, asset or entity..."
          value={query}
          onChange={handleSearch}
        />
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        {/* WS status */}
        <div className={`ws-badge ${wsConnected ? 'on' : 'off'}`}>
          <span className="ws-dot" />
          {wsConnected ? 'WS Live' : 'Reconnecting'}
        </div>

        {/* Fraud trigger */}
        <button
          className="btn-fraud"
          disabled={isReporting}
          onClick={() => onReportFraud('VICTIM')}
        >
          {isReporting
            ? <span className="fraud-pulse">●</span>
            : <span>⚠</span>
          }
          {isReporting ? 'Propagating...' : 'Trigger Fraud Report'}
        </button>

        {/* Reset */}
        <button className="btn-reset" onClick={onReset}>
          ↺ Reset
        </button>
      </div>
    </header>
  );
}
