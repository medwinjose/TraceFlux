/**
 * ============================================================================
 * TEAMMATE INTEGRATION SLOT: RiskPanel Component
 * ============================================================================
 * THIS IS THE OFFICIALLY DOCUMENTED DROP-IN SPOT FOR YOUR ML TEAMMATE'S COMPONENT.
 * 
 * Her prompt expects props:
 * - account_id: string
 * - risk_score: float (0.0 to 1.0)
 * - classification: "CLEAN" | "WATCH" | "HIGH_RISK"
 * - explanation: { raw_features, contributions }
 * 
 * To merge her RiskPanel component:
 * 1. Drop her file in src/components/RiskPanel.jsx
 * 2. Replace the contents inside RiskPanelSlot or import her component directly here.
 * ============================================================================
 */

import React, { useEffect, useState } from 'react';

export default function RiskPanelSlot({ selectedNodeId }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedNodeId) {
      setExplanation(null);
      return;
    }

    setLoading(true);
    fetch(`http://127.0.0.1:8000/accounts/${selectedNodeId}/explain`)
      .then(res => res.json())
      .then(data => {
        setExplanation(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch ML explanation:", err);
        setLoading(false);
      });
  }, [selectedNodeId]);

  if (!selectedNodeId) {
    return (
      <div className="h-full glass-panel p-4 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
        <p className="text-xl mb-2">🔍</p>
        <p className="font-semibold text-slate-300">Select an Account Node</p>
        <p className="text-[11px] mt-1 max-w-[200px]">Click any node in the graph to inspect its ML Anomaly breakdown & feature weights.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full glass-panel p-4 flex flex-col items-center justify-center text-xs text-slate-400">
        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div>
        <p>Fetching ML Explainability metrics...</p>
      </div>
    );
  }

  if (!explanation) return null;

  const { risk_score, classification, contributions, raw_features } = explanation;

  const getClassBadge = (cls) => {
    if (cls === 'HIGH_RISK') return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    if (cls === 'WATCH') return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  };

  return (
    <div className="h-full glass-panel p-4 flex flex-col overflow-y-auto text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mule Risk Inspector</span>
          <h2 className="font-mono text-base font-extrabold text-white">{selectedNodeId}</h2>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border font-mono ${getClassBadge(classification)}`}>
          {classification}
        </span>
      </div>

      {/* Risk Score Meter */}
      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-semibold text-slate-300">Anomaly Risk Score</span>
          <span className="font-mono font-extrabold text-sm text-cyan-400">{(risk_score * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              risk_score >= 0.75 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
              risk_score >= 0.45 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
              'bg-gradient-to-r from-emerald-500 to-cyan-500'
            }`}
            style={{ width: `${risk_score * 100}%` }}
          />
        </div>
      </div>

      {/* Feature Contributions Chart (Explainability) */}
      <div className="flex-1 space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          ML Feature Weight Contribution
        </p>

        {contributions && Object.entries(contributions).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-300 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="font-mono text-slate-400">+{value.toFixed(3)}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(value * 250, 100)}%` }}
              />
            </div>
          </div>
        ))}

        {/* Raw Feature Values */}
        {raw_features && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Observed Behavioral Signals
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Fan-out Ratio</span>
                <span className="text-slate-200 font-bold">{raw_features.fan_out_ratio}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Tx Velocity</span>
                <span className="text-slate-200 font-bold">{raw_features.velocity} / hr</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Structuring</span>
                <span className="text-slate-200 font-bold">{(raw_features.structuring_score * 100).toFixed(0)}%</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Avg Hold Time</span>
                <span className="text-slate-200 font-bold">{raw_features.avg_hold_time_minutes} min</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
