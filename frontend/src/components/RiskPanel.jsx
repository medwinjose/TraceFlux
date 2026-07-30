import React, { useState, useEffect } from 'react';
import './RiskPanel.css';

const RiskPanel = ({ riskAccounts, selectedNodeId, nodes }) => {
  const [localAccounts, setLocalAccounts] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [sortBy, setSortBy] = useState('SCORE_DESC');
  const [expandedAccount, setExpandedAccount] = useState(null);

  // Detect if we are in "selected node mode" (when selectedNodeId is passed or we are in the main dashboard)
  // or "standalone mode" (when riskAccounts prop is provided)
  const isSelectedNodeMode = riskAccounts === undefined;

  // Fetch explanation when selectedNodeId changes
  useEffect(() => {
    if (!isSelectedNodeMode || !selectedNodeId) {
      setExplanation(null);
      return;
    }

    setLoading(true);
    fetch(`http://127.0.0.1:8000/accounts/${selectedNodeId}/explain`)
      .then((res) => {
        if (!res.ok) throw new Error("Account not found");
        return res.json();
      })
      .then((contributions) => {
        fetch(`http://127.0.0.1:8000/accounts`)
          .then((res) => res.json())
          .then((accounts) => {
            const acc = accounts.find((a) => a.account_id === selectedNodeId);
            if (acc) {
              const topFeatures = Object.entries(contributions)
                .map(([feature, contribution]) => ({ feature, contribution }))
                .sort((a, b) => b.contribution - a.contribution);

              setExplanation({
                account_id: selectedNodeId,
                risk_score: acc.risk_score,
                classification: acc.classification,
                top_features: topFeatures,
              });
            }
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error fetching account list:", err);
            setLoading(false);
          });
      })
      .catch((err) => {
        console.error("Failed to fetch ML explanation:", err);
        setLoading(false);
      });
  }, [selectedNodeId, isSelectedNodeMode]);

  // Sync accounts list when in selected node mode but selectedNodeId is null
  useEffect(() => {
    if (!isSelectedNodeMode || selectedNodeId) return;

    if (nodes && nodes.length > 0) {
      setLocalAccounts(
        nodes.map((acc) => ({
          account_id: acc.id || acc.account_id,
          risk_score: acc.risk_score,
          classification: acc.classification,
          top_features: [],
        }))
      );
    } else {
      fetch(`http://127.0.0.1:8000/accounts`)
        .then((res) => res.json())
        .then((accounts) => {
          setLocalAccounts(
            accounts.map((acc) => ({
              account_id: acc.account_id,
              risk_score: acc.risk_score,
              classification: acc.classification,
              top_features: [],
            }))
          );
        })
        .catch((err) => console.error("Error fetching accounts:", err));
    }
  }, [selectedNodeId, isSelectedNodeMode, nodes]);

  // Fetch explanation when an account is expanded in the list
  const fetchLocalExplanation = (accId) => {
    if (expandedAccount === accId) {
      setExpandedAccount(null);
      return;
    }

    setExpandedAccount(accId);
    
    const accIndex = localAccounts.findIndex(a => a.account_id === accId);
    if (accIndex !== -1 && localAccounts[accIndex].top_features && localAccounts[accIndex].top_features.length > 0) {
      return;
    }

    fetch(`http://127.0.0.1:8000/accounts/${accId}/explain`)
      .then(res => res.json())
      .then(contributions => {
        const topFeatures = Object.entries(contributions)
          .map(([feature, contribution]) => ({ feature, contribution }))
          .sort((a, b) => b.contribution - a.contribution);

        setLocalAccounts(prev =>
          prev.map(a =>
            a.account_id === accId ? { ...a, top_features: topFeatures } : a
          )
        );
      })
      .catch(err => console.error("Error fetching local explanation:", err));
  };

  const getFeatureDisplayName = (featureKey) => {
    const mapping = {
      fan_out_ratio: 'Fan-Out Ratio',
      velocity: 'Tx Velocity',
      dormant_reactivation: 'Dormant Reactivation',
      structuring_score: 'Structuring Activity',
      hold_time_inverse: 'Short Hold Time (Inverse)',
    };
    return mapping[featureKey] || featureKey;
  };

  const getFeatureDescription = (featureKey) => {
    const descriptions = {
      fan_out_ratio: 'Split & forward of incoming funds to unique recipients.',
      velocity: 'Frequency of transactions in a recent time frame.',
      dormant_reactivation: 'Sudden reactivation after 30+ days of dormancy.',
      structuring_score: 'Transactions deliberately kept under reporting thresholds.',
      hold_time_inverse: 'Funds are instantly forwarded after reception.',
    };
    return descriptions[featureKey] || 'Calculated behavioral risk feature.';
  };

  // Select active accounts list
  const activeAccounts = isSelectedNodeMode ? localAccounts : riskAccounts;
  const totalMonitored = (activeAccounts || []).length;
  const highRiskCount = (activeAccounts || []).filter(a => a.classification === 'HIGH_RISK').length;
  const watchCount = (activeAccounts || []).filter(a => a.classification === 'WATCH').length;
  
  const avgScore = totalMonitored > 0
    ? ((activeAccounts || []).reduce((acc, a) => acc + a.risk_score, 0) / totalMonitored).toFixed(3)
    : 0.0;

  // Filter and sort accounts
  const filteredAccounts = (activeAccounts || [])
    .filter((acc) => {
      const matchesSearch = acc.account_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = filterClass === 'ALL' || acc.classification === filterClass;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      if (sortBy === 'SCORE_DESC') return b.risk_score - a.risk_score;
      if (sortBy === 'SCORE_ASC') return a.risk_score - b.risk_score;
      if (sortBy === 'ID_ASC') return a.account_id.localeCompare(b.account_id);
      return 0;
    });

  // Render individual explainability bars
  const renderExplainabilityBars = (topFeatures, classification) => {
    return (
      <div className="features-chart">
        {topFeatures && topFeatures.length > 0 ? (
          topFeatures.map((feat) => {
            let barColorClass = 'bar-blue';
            if (feat.contribution >= 0.20) barColorClass = 'bar-red';
            else if (feat.contribution >= 0.10) barColorClass = 'bar-amber';

            return (
              <div key={feat.feature} className="feature-bar-row">
                <div className="feature-meta">
                  <span className="feature-name">{getFeatureDisplayName(feat.feature)}</span>
                  <span className="feature-contribution">+{feat.contribution.toFixed(3)}</span>
                </div>
                <div className="bar-container">
                  <div
                    className={`bar-fill ${barColorClass}`}
                    style={{ width: `${Math.max(feat.contribution * 100, 3)}%` }}
                  ></div>
                </div>
                <p className="feature-desc">{getFeatureDescription(feat.feature)}</p>
              </div>
            );
          })
        ) : (
          <div className="no-features">No significant feature contributions.</div>
        )}
      </div>
    );
  };

  // --- RENDER SELECTED NODE INSPECTION ---
  if (isSelectedNodeMode && selectedNodeId) {
    if (loading) {
      return (
        <div className="h-full glass-panel p-4 flex flex-col items-center justify-center text-xs text-slate-400 bg-[#080c14] border border-slate-800">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p>Fetching ML Explainability metrics...</p>
        </div>
      );
    }

    if (!explanation) return null;

    return (
      <div className="tracenet-selected-inspector bg-[#080c14] border border-slate-850 h-full overflow-y-auto p-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-semibold">Mule Risk Inspector</span>
            <h2 className="font-mono text-base font-extrabold text-white margin-0" style={{ margin: 0 }}>{explanation.account_id}</h2>
          </div>
          <span className={`risk-badge badge-${explanation.classification.toLowerCase()}`}>
            {explanation.classification.replace('_', ' ')}
          </span>
        </div>

        {/* Risk Score Meter */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold text-slate-300">Anomaly Risk Score</span>
            <span className={`font-mono font-extrabold text-sm color-${explanation.classification.toLowerCase()}`}>
              {(explanation.risk_score * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                explanation.risk_score >= 0.75 ? 'bg-gradient-to-r from-rose-500 to-red-600' :
                explanation.risk_score >= 0.45 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                'bg-gradient-to-r from-emerald-500 to-cyan-500'
              }`}
              style={{ width: `${explanation.risk_score * 100}%` }}
            />
          </div>
        </div>

        <div className="explanation-summary mb-3">
          <strong>Explainability Stack Audit:</strong>
          {explanation.classification === 'HIGH_RISK' && (
            <p>This account triggers severe proactive warning flags. Immediate interdiction is highly recommended based on the behavioral stack signature below.</p>
          )}
          {explanation.classification === 'WATCH' && (
            <p>This account shows suspicious activity patterns that deviate significantly from the baseline population. Placed on watchlist monitoring.</p>
          )}
          {explanation.classification === 'CLEAN' && (
            <p>Behavioral signals align with normal consumer patterns. No anomalies detected.</p>
          )}
        </div>

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          ML Feature Weight Contribution
        </p>
        {renderExplainabilityBars(explanation.top_features, explanation.classification)}
      </div>
    );
  }

  // --- RENDER LISTS VIEW (STANDALONE OR NO NODE SELECTED) ---
  return (
    <div className={`tracenet-risk-container ${isSelectedNodeMode ? 'in-sidebar' : ''}`}>
      {/* Header Section */}
      <header className="tracenet-header">
        <div className="logo-section">
          <div className="pulse-dot green"></div>
          <h1>TraceNet Anomaly Engine</h1>
        </div>
        <p className="subtitle">Real-Time Proactive Mule Risk Monitoring</p>
      </header>

      {/* Stats Dashboard Grid (Only show if not in sidebar) */}
      {!isSelectedNodeMode && (
        <section className="stats-dashboard">
          <div className="stat-card glassmorphic">
            <span className="stat-label">Monitored Accounts</span>
            <span className="stat-val text-glow-blue">{totalMonitored}</span>
          </div>
          <div className="stat-card glassmorphic border-glow-red">
            <span className="stat-label text-red">High Risk Flagged</span>
            <span className="stat-val text-glow-red pulse-text">{highRiskCount}</span>
          </div>
          <div className="stat-card glassmorphic border-glow-amber">
            <span className="stat-label text-amber">Under Watch</span>
            <span className="stat-val text-glow-amber">{watchCount}</span>
          </div>
          <div className="stat-card glassmorphic">
            <span className="stat-label">Average Risk Score</span>
            <span className="stat-val text-glow-green">{avgScore}</span>
          </div>
        </section>
      )}

      {/* Filter and Control Bar */}
      <section className="controls-bar glassmorphic">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Search Account ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="select-input">
            <option value="ALL">All Categories</option>
            <option value="HIGH_RISK">High Risk</option>
            <option value="WATCH">Watchlist</option>
            <option value="CLEAN">Clean</option>
          </select>
        </div>

        <div className="filter-group">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select-input">
            <option value="SCORE_DESC">Score: High-Low</option>
            <option value="SCORE_ASC">Score: Low-High</option>
          </select>
        </div>
      </section>

      {/* Main List Section */}
      <section className="accounts-list">
        {filteredAccounts.length === 0 ? (
          <div className="empty-state glassmorphic">
            <p>No risk accounts detected.</p>
          </div>
        ) : (
          filteredAccounts.map(acc => {
            const isExpanded = expandedAccount === acc.account_id;
            const badgeClass = `risk-badge badge-${acc.classification.toLowerCase()}`;
            const cardClass = `account-card glassmorphic border-glow-${acc.classification.toLowerCase()} ${isExpanded ? 'active-card' : ''}`;
            
            return (
              <div 
                key={acc.account_id} 
                className={cardClass} 
                onClick={() => {
                  if (isSelectedNodeMode) {
                    fetchLocalExplanation(acc.account_id);
                  } else {
                    setExpandedAccount(isExpanded ? null : acc.account_id);
                  }
                }}
              >
                <div className="card-header">
                  <div className="account-info">
                    <span className="account-id">{acc.account_id}</span>
                    <span className={badgeClass}>{acc.classification.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="score-area">
                    <span className={`score-value color-${acc.classification.toLowerCase()}`}>
                      {(acc.risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Expandable Explainability Panel */}
                {isExpanded && (
                  <div className="explainability-panel" onClick={(e) => e.stopPropagation()}>
                    <div className="divider"></div>
                    <div className="explanation-summary">
                      <strong>Explainability Stack Audit:</strong>
                      {acc.classification === 'HIGH_RISK' && (
                        <p>This account triggers severe proactive warning flags. Immediate interdiction is highly recommended based on the behavioral stack signature below.</p>
                      )}
                      {acc.classification === 'WATCH' && (
                        <p>This account shows suspicious activity patterns that deviate significantly from the baseline population. Placed on watchlist monitoring.</p>
                      )}
                      {acc.classification === 'CLEAN' && (
                        <p>Behavioral signals align with normal consumer patterns. No anomalies detected.</p>
                      )}
                    </div>
                    {renderExplainabilityBars(acc.top_features, acc.classification)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
};

export default RiskPanel;
