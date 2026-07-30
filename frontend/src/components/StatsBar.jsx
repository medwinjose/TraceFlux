import React from 'react';

export default function StatsBar({ nodes = [], alerts = [] }) {
  const total   = nodes.length;
  const frozen  = nodes.filter(n => n.freeze_status === 'frozen').length;
  const watch   = nodes.filter(n => n.classification === 'WATCH').length;
  const hiRisk  = nodes.filter(n => n.classification === 'HIGH_RISK').length;
  const flagged = frozen + hiRisk;
  const alertCt = alerts.length;

  const frozenPct = total ? (frozen / total) * 100 : 0;
  const watchPct  = total ? ((watch + hiRisk) / total) * 100 : 0;

  return (
    <div className="stats-row">
      {/* Card 1 – Monitored */}
      <div className="stat-card">
        <div className="stat-label">Monitored Accounts</div>
        <div className="stat-number cyan">{total}</div>
        <div className="stat-meta">
          <span className="stat-badge cyan">4 Banks Active</span>
          <span>+1.2%</span>
        </div>
        <div className="stat-progress" style={{ width: '100%', background: 'rgba(6,182,212,0.15)' }} />
      </div>

      {/* Card 2 – Frozen */}
      <div className="stat-card">
        <div className="stat-label">Auto-Frozen (Interdicted)</div>
        <div className={`stat-number ${frozen > 0 ? 'red' : ''}`}>{frozen.toString().padStart(2,'0')}</div>
        <div className="stat-meta">
          <span className={`stat-badge ${frozen > 0 ? 'red' : 'cyan'}`}>
            {frozen > 0 ? 'Active Interdiction' : 'Standby'}
          </span>
        </div>
        <div
          className="stat-progress"
          style={{ width: `${frozenPct}%`, background: 'var(--red)' }}
        />
      </div>

      {/* Card 3 – Watchlist */}
      <div className="stat-card">
        <div className="stat-label">Watchlist (Proactive ML)</div>
        <div className={`stat-number ${flagged > 0 ? 'amber' : ''}`}>{(watch + hiRisk).toString().padStart(2,'0')}</div>
        <div className="stat-meta">
          <span className={`stat-badge ${hiRisk > 0 ? 'red' : 'amber'}`}>
            {hiRisk > 0 ? `${hiRisk} High Risk` : 'Flagged Nodes'}
          </span>
        </div>
        <div
          className="stat-progress"
          style={{ width: `${watchPct}%`, background: 'var(--amber)' }}
        />
      </div>

      {/* Card 4 – Alerts */}
      <div className="stat-card">
        <div className="stat-label">Alerts Dispatched</div>
        <div className={`stat-number ${alertCt > 0 ? 'red' : ''}`}>{alertCt.toString().padStart(2,'0')}</div>
        <div className="stat-meta">
          <span className="stat-badge green">WebSocket Live</span>
          <span>Real-time</span>
        </div>
        <div
          className="stat-progress"
          style={{
            width: alertCt > 0 ? '100%' : '0%',
            background: 'var(--red)',
            transition: 'width 1s ease',
          }}
        />
      </div>
    </div>
  );
}
