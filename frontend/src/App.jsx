import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import NetworkGraph from './components/NetworkGraph';
import AlertFeed from './components/AlertFeed';
import RiskPanel from './components/RiskPanel';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTracePath, setActiveTracePath] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const wsRef = useRef(null);

  // Load Graph Network & Accounts Data from FastAPI Backend
  const fetchGraphData = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/graph_data');
      if (!res.ok) return;
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);

      const alertsRes = await fetch('http://127.0.0.1:8000/alerts');
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }
    } catch (err) {
      console.error("Backend offline or connection error:", err);
    }
  };

  useEffect(() => {
    fetchGraphData();

    // Setup WebSocket Connection to Backend Real-Time Switch
    const connectWS = () => {
      const socket = new WebSocket('ws://127.0.0.1:8000/ws');

      socket.onopen = () => {
        setWsConnected(true);
        console.log("Connected to TraceNet WebSocket Switch Layer");
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { event: evtType, data } = payload;

          if (evtType === 'TAG_PROPAGATED') {
            // Live node animation step
            const { account_id, traced_path } = data;
            setActiveTracePath(traced_path || []);

            setNodes((prevNodes) =>
              prevNodes.map((node) =>
                node.id === account_id
                  ? { ...node, freeze_status: 'frozen', is_flagged: true }
                  : node
              )
            );

            // Append live alert if new
            setAlerts((prev) => [
              {
                alert_id: `ALT-LIVE-${Date.now()}`,
                account_id: account_id,
                bank_id: data.bank_id,
                reason: 'PROPAGATED_TAG',
                timestamp: Date.now() / 1000,
                traced_path: traced_path,
                message: `AUTOFREEZE: Account ${account_id} locked via Tag Propagation [Hop ${data.hop}]`,
              },
              ...prev,
            ]);
          } else if (evtType === 'DEMO_RESET') {
            setActiveTracePath([]);
            setSelectedNodeId(null);
            fetchGraphData();
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        // Reconnect attempt after 3s
        setTimeout(connectWS, 3000);
      };

      wsRef.current = socket;
    };

    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Action: Trigger Fraud Report
  const handleReportFraud = async (account_id = 'VICTIM') => {
    setIsReporting(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/report_fraud/${account_id}`, {
        method: 'POST',
      });
      const data = await res.json();
      console.log("Fraud report triggered:", data);
      if (data.frozen_chain) {
        setActiveTracePath(data.frozen_chain);
      }
    } catch (err) {
      console.error("Failed to trigger fraud report:", err);
    } finally {
      setIsReporting(false);
    }
  };

  // Action: Reset Demo
  const handleResetDemo = async () => {
    try {
      await fetch('http://127.0.0.1:8000/reset', { method: 'POST' });
      setActiveTracePath([]);
      setAlerts([]);
      setSelectedNodeId(null);
      fetchGraphData();
    } catch (err) {
      console.error("Failed to reset demo:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#06090E] text-slate-100 overflow-hidden">
      <Header
        wsConnected={wsConnected}
        onReportFraud={handleReportFraud}
        onReset={handleResetDemo}
        isReporting={isReporting}
      />

      <StatsBar nodes={nodes} alerts={alerts} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Graph Area */}
        <div className="flex-1 relative h-full flex flex-col">
          <NetworkGraph
            nodes={nodes}
            edges={edges}
            activeTracePath={activeTracePath}
            selectedNode={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>

        {/* Right Inspection & Alert Drawer */}
        <div className="w-96 border-l border-slate-800 flex flex-col h-full bg-[#080C14]">
          <div className="h-1/2 border-b border-slate-800">
            <RiskPanel selectedNodeId={selectedNodeId} />
          </div>
          <div className="h-1/2">
            <AlertFeed alerts={alerts} />
          </div>
        </div>
      </div>
    </div>
  );
}
