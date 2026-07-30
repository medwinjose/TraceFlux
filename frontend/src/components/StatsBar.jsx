import React from 'react';

export default function StatsBar({ nodes = [], alerts = [] }) {
  const totalAccounts = nodes.length;
  const frozenAccounts = nodes.filter(n => n.freeze_status === 'frozen').length;
  const watchAccounts = nodes.filter(n => n.classification === 'WATCH').length;
  const highRiskAccounts = nodes.filter(n => n.classification === 'HIGH_RISK').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-[#090D16] border-b border-slate-800">
      <div className="glass-card p-3 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monitored Accounts</p>
          <p className="text-xl font-extrabold text-white font-mono mt-0.5">{totalAccounts}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-xs">
          4 Banks
        </div>
      </div>

      <div className="glass-card p-3 rounded-xl flex items-center justify-between border-l-4 border-l-rose-500">
        <div>
          <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Auto-Frozen (Interdicted)</p>
          <p className="text-xl font-extrabold text-rose-400 font-mono mt-0.5">{frozenAccounts}</p>
        </div>
        <div className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
          {frozenAccounts > 0 ? 'ACTIVE INTERDICTION' : 'STANDBY'}
        </div>
      </div>

      <div className="glass-card p-3 rounded-xl flex items-center justify-between border-l-4 border-l-amber-500">
        <div>
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Watchlist (Proactive ML)</p>
          <p className="text-xl font-extrabold text-amber-400 font-mono mt-0.5">{watchAccounts + highRiskAccounts}</p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {highRiskAccounts} High Risk
        </div>
      </div>

      <div className="glass-card p-3 rounded-xl flex items-center justify-between border-l-4 border-l-emerald-500">
        <div>
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Alerts Dispatched</p>
          <p className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">{alerts.length}</p>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          WebSocket Live
        </div>
      </div>
    </div>
  );
}
