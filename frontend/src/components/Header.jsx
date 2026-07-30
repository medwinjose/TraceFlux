import React from 'react';

export default function Header({ wsConnected, onReportFraud, onReset, isReporting, victimId = "VICTIM" }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 text-xl">
          ⚡
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-lg text-white tracking-tight">TraceNet</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-medium">
              SYSTEMS ENGINE v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">Real-Time Cross-Institution Fraud Tracing & Interdiction Rail</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Switch integration status */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>NPCI / UPI Switch Rail: <strong className="text-emerald-400">ACTIVE SIMULATION</strong></span>
        </div>

        {/* WebSocket Connection Badge */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
          wsConnected 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
          <span>{wsConnected ? 'WS CONNECTED' : 'WS RECONNECTING'}</span>
        </div>

        {/* Action Controls */}
        <button
          onClick={() => onReportFraud(victimId)}
          disabled={isReporting}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-semibold text-xs tracking-wide shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          <span>🚨</span>
          <span>{isReporting ? 'PROPAGATING TRACE...' : 'TRIGGER FRAUD REPORT'}</span>
        </button>

        <button
          onClick={onReset}
          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
        >
          🔄 Reset Demo
        </button>
      </div>
    </header>
  );
}
