import React, { useState } from 'react';

export default function Header({ wsConnected, onReportFraud, onReset, isReporting, onSearch }) {
  const [query, setQuery] = useState('');
  const [graphSize, setGraphSize] = useState(40);

  const handleSearch = (e) => {
    setQuery(e.target.value);
    onSearch && onSearch(e.target.value);
  };

  return (
    <header className="topbar">
      {/* Breadcrumb / Useful Info */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Central Switch Node</div>
        <div className="topbar-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span className="system-status">
            <span className="status-dot pulse" />
            Live Sync: <strong style={{ color: 'var(--text-primary)' }}>Nominal</strong>
          </span>
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

        {/* Graph Size */}
        <select 
          value={graphSize}
          onChange={(e) => setGraphSize(Number(e.target.value))}
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '13px'
          }}
        >
          <option value={40}>Demo Graph (49 nodes)</option>
          <option value={500}>Stress Graph (500+ nodes)</option>
        </select>

        {/* Reset */}
        <button className="btn-reset" onClick={() => onReset(graphSize)}>
          ↺ Reset
        </button>
      </div>
    </header>
  );
}
