import React from 'react';

export default function AlertFeed({ alerts = [] }) {
  return (
    <div className="w-80 h-full border-l border-slate-800 bg-[#0B0F17] flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          <h3 className="font-bold text-sm text-white">Live Interdiction Feed</h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
          {alerts.length} ALERTS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <p className="text-2xl mb-2">🛡️</p>
            <p>No active interdictions yet.</p>
            <p className="mt-1 text-[11px]">Click "TRIGGER FRAUD REPORT" to test tag propagation.</p>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const isTagProp = alert.reason === 'PROPAGATED_TAG';
            return (
              <div
                key={alert.alert_id || index}
                className="glass-panel p-3 rounded-xl border-l-4 border-l-rose-500 text-xs transition-all hover:bg-slate-800/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-rose-400">
                    {alert.account_id}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {alert.bank_id}
                  </span>
                </div>

                <p className="text-[11px] text-slate-200 font-medium mb-1.5 leading-snug">
                  {alert.message}
                </p>

                {alert.traced_path && alert.traced_path.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Traced Money Flow:
                    </p>
                    <div className="flex items-center flex-wrap gap-1 font-mono text-[10px] text-cyan-400 bg-slate-900/80 p-1.5 rounded">
                      {alert.traced_path.map((node, i) => (
                        <React.Fragment key={i}>
                          <span className={i === alert.traced_path.length - 1 ? "text-rose-400 font-bold" : ""}>
                            {node}
                          </span>
                          {i < alert.traced_path.length - 1 && <span className="text-slate-600">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">
                    {isTagProp ? 'REACTIVETAG' : 'ANOMALY_ML'}
                  </span>
                  <span>{new Date(alert.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
