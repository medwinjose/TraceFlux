import React from 'react';

export default function AssetsView({ nodes }) {
  // Aggregate funds by bank
  const bankStats = nodes.reduce((acc, n) => {
    const b = n.bank_id || 'Unknown';
    if (!acc[b]) acc[b] = { count: 0, highRisk: 0, watch: 0, clean: 0, accounts: [] };
    acc[b].count += 1;
    acc[b].accounts.push(n);
    if (n.classification === 'HIGH_RISK') acc[b].highRisk += 1;
    else if (n.classification === 'WATCH') acc[b].watch += 1;
    else acc[b].clean += 1;
    return acc;
  }, {});

  // Sort banks by total accounts descending
  const sortedBanks = Object.entries(bankStats).sort((a, b) => b[1].count - a[1].count);

  return (
    <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 32, background: 'var(--bg-void)', overflowY: 'auto' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
        <h2 style={{ fontSize: 20, color: 'var(--text-primary)', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'Playfair Display', serif" }}>
          Institutional Exposure
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
          Distribution of monitored accounts across connected financial institutions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {sortedBanks.map(([bank, stats]) => {
          // Sort accounts within bank: HIGH_RISK -> WATCH -> CLEAN -> VICTIM
          const sortedAccounts = [...stats.accounts].sort((a, b) => {
            const rank = { 'HIGH_RISK': 1, 'WATCH': 2, 'CLEAN': 3, 'VICTIM': 4 };
            return (rank[a.classification] || 99) - (rank[b.classification] || 99);
          });

          return (
            <div key={bank} style={{ 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border)', 
              borderRadius: 8, 
              padding: 24,
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            className="hover-card">
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{bank}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {stats.count} Total Accounts
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {stats.highRisk > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'var(--red-lo)', padding: '4px 8px', borderRadius: 4 }}>
                      {stats.highRisk} CRITICAL
                    </div>
                  )}
                  {stats.highRisk === 0 && stats.watch > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-lo)', padding: '4px 8px', borderRadius: 4 }}>
                      {stats.watch} WATCH
                    </div>
                  )}
                </div>
              </div>

              {/* Waffle Chart */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {sortedAccounts.map((acc) => {
                  let bg = 'var(--green-lo)';
                  let border = 'var(--green)';
                  if (acc.classification === 'HIGH_RISK') { bg = 'var(--red)'; border = 'var(--red)'; }
                  else if (acc.classification === 'WATCH') { bg = 'var(--amber)'; border = 'var(--amber)'; }
                  else if (acc.id === 'VICTIM') { bg = 'var(--cyan)'; border = 'var(--cyan)'; }

                  return (
                    <div 
                      key={acc.id}
                      title={`${acc.id} - ${acc.classification || 'CLEAN'}`}
                      style={{
                        width: 16, 
                        height: 16, 
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>
      <style>{`
        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important;
        }
      `}</style>
    </div>
  );
}
