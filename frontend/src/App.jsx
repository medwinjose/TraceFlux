import React, { useState, useEffect, useRef } from 'react';
import Sidebar       from './components/Sidebar';
import Header        from './components/Header';
import StatsBar      from './components/StatsBar';
import NetworkGraph  from './components/NetworkGraph';
import RiskPanel     from './components/RiskPanel';
import AlertFeed     from './components/AlertFeed';
import WatchlistView from './components/WatchlistView';
import AssetsView    from './components/AssetsView';
import SettingsView  from './components/SettingsView';
import SupportView   from './components/SupportView';
import EvidenceView  from './components/EvidenceView';

export default function App() {
  const [nodes,          setNodes]          = useState([]);
  const [edges,          setEdges]          = useState([]);
  const [alerts,         setAlerts]         = useState([]);
  const [activeTrace,    setActiveTrace]    = useState([]);
  const [selectedNode,   setSelectedNode]   = useState(null);
  const [wsConnected,    setWsConnected]    = useState(false);
  const [isReporting,    setIsReporting]    = useState(false);
  const [activeView,     setActiveView]     = useState('network');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [isSweeping,     setIsSweeping]     = useState(false);
  const wsRef = useRef(null);

  /* ── Fetch graph + alerts from backend ──────────────────────────── */
  const fetchAll = async () => {
    try {
      const [gd, al] = await Promise.all([
        fetch('/api/graph_data').then(r => r.json()),
        fetch('/api/alerts').then(r => r.json()),
      ]);
      setNodes(gd.nodes  || []);
      setEdges(gd.edges  || []);
      setAlerts(al || []);
    } catch (err) {
      console.warn('Backend fetch failed:', err);
    }
  };

  /* ── WebSocket via Vite proxy (/ws → ws://127.0.0.1:8000/ws) ──── */
  useEffect(() => {
    fetchAll();

    const connect = () => {
      // Use relative path so it goes through the Vite WS proxy
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${location.host}/api/ws`);

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = ({ data }) => {
        try {
          const { event: evt, data: payload } = JSON.parse(data);
          if (evt === 'TAG_PROPAGATED') {
            const { account_id, traced_path, bank_id, hop, reason_plain, signature, event_hash, seq } = payload;
            setActiveTrace(traced_path || []);
            setNodes(prev =>
              prev.map(n =>
                n.id === account_id
                  ? { ...n, freeze_status: 'frozen', is_flagged: true }
                  : n
              )
            );
            setAlerts(prev => [{
              alert_id:    `ALT-LIVE-${Date.now()}`,
              account_id,
              bank_id,
              reason:      'PROPAGATED_TAG',
              timestamp:   Date.now() / 1000,
              traced_path,
              reason_plain: reason_plain || null,
              signature:    signature    || null,
              event_hash:   event_hash   || null,
              seq:          seq          || null,
              message: `AUTOFREEZE: Account ${account_id} @ ${bank_id} locked via Tag Propagation [Hop ${hop}]`,
            }, ...prev]);
          } else if (evt === 'DEMO_RESET') {
            setActiveTrace([]);
            setSelectedNode(null);
            fetchAll();
          }
        } catch (e) { /* ignore malformed */ }
      };

      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  /* ── Actions ────────────────────────────────────────────────────── */
  const handleReportFraud = async (account_id = 'VICTIM') => {
    setIsReporting(true);
    try {
      const res  = await fetch(`/api/report_fraud/${account_id}`, { method: 'POST' });
      const data = await res.json();
      if (data.frozen_chain) setActiveTrace(data.frozen_chain);
    } catch (err) { console.error('Fraud report error:', err); }
    finally { setIsReporting(false); }
  };

  const handleReset = async (nodes = 40) => {
    try {
      await fetch(`/api/reset?nodes=${nodes}`, { method: 'POST' });
      setActiveTrace([]);
      setAlerts([]);
      setSelectedNode(null);
      fetchAll();
    } catch (err) { console.error('Reset error:', err); }
  };

  const handleSweep = () => {
    setIsSweeping(true);
    // Ping backend to re-fetch or clear cache if desired, but visually just sweep
    setTimeout(() => {
      setIsSweeping(false);
      fetchAll();
    }, 2500);
  };

  /* ── Filter nodes by search ─────────────────────────────────────── */
  const visibleNodes = searchQuery
    ? nodes.filter(n => n.id.toLowerCase().includes(searchQuery.toLowerCase()))
    : nodes;

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        alertCount={alerts.length}
        onSweep={handleSweep}
      />

      <div className="main-area">
        <Header
          wsConnected={wsConnected}
          onReportFraud={handleReportFraud}
          onReset={handleReset}
          isReporting={isReporting}
          onSearch={setSearchQuery}
        />

        <StatsBar nodes={nodes} alerts={alerts} />

        <div className="content-grid">
          {activeView === 'network' && (
            <>
              {/* Network graph takes remaining space */}
              <NetworkGraph
                nodes={visibleNodes}
                edges={edges}
                activeTracePath={activeTrace}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                isSweeping={isSweeping}
              />

              {/* Right panel */}
              <div className="right-panel">
                <div className="risk-section">
                  <div className="panel-header">
                    <span className="panel-title">Recent Account Risk</span>
                    <span className="panel-count">{nodes.length} accounts</span>
                  </div>
                  <RiskPanel
                    selectedNodeId={selectedNode}
                    nodes={nodes}
                    onSelectNode={setSelectedNode}
                  />
                </div>
                <AlertFeed alerts={alerts} />
              </div>
            </>
          )}

          {activeView === 'watch'    && <WatchlistView nodes={nodes} />}
          {activeView === 'assets'   && <AssetsView nodes={nodes} />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'support'  && <SupportView />}
          {activeView === 'evidence' && <EvidenceView />}
          {activeView === 'alerts' && (
            <div className="view-container">
              <div className="view-header">
                <h2 className="view-title">Interdiction Log</h2>
                <p className="view-subtitle">Full history of system auto-freezes and tag propagations.</p>
              </div>
              <AlertFeed alerts={alerts} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
