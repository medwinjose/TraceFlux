import React, { useState } from 'react';

export default function SupportView() {
  const [openIndex, setOpenIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    { category: "General & Real-World Impact",
      q: "What is TraceNet?", a: "TraceNet is a reactive and proactive graph-based security switch for banking networks, designed to instantly track and freeze stolen funds propagating across multiple banks." },
    { category: "General & Real-World Impact",
      q: "Why was this project built?", a: "With the advent of instant payment systems like UPI, traditional rule-based fraud detection is too slow. Criminals use mule networks to split and move stolen funds in seconds. TraceNet was built to counter this at machine speed." },
    { category: "General & Real-World Impact",
      q: "Who benefits from TraceNet?", a: "Citizens are protected from devastating financial scams. Banks avoid compliance failures and the operational nightmare of manual fraud tracing. National regulators gain unprecedented oversight over systemic risks." },
    { category: "General & Real-World Impact",
      q: "What real-world problems does this solve?", a: "It directly solves the 'Mule Network' problem in instant payments, stopping cyber-fraudsters from cashing out stolen funds through deep chains of intermediary accounts before banks can react." },
    
    { category: "Regulatory & National Integration (NPCI & RBI)",
      q: "What are NPCI and RBI?", a: "NPCI (National Payments Corporation of India) operates retail payments and settlement systems like UPI. RBI (Reserve Bank of India) is India's central bank and primary financial regulatory body." },
    { category: "Regulatory & National Integration (NPCI & RBI)",
      q: "How can NPCI and RBI help or sponsor this project?", a: "NPCI and RBI can adopt TraceNet as a central security layer. By sponsoring this project, they can mandate integration across partner banks to ensure a unified, nation-wide defense against systemic financial fraud." },
    { category: "Regulatory & National Integration (NPCI & RBI)",
      q: "How would national regulators integrate TraceNet into their existing systems?", a: "TraceNet is designed to sit alongside existing national payment switches (like the UPI switch) as a non-blocking asynchronous security oracle, receiving a copy of the transaction ledger in real-time." },
    { category: "Regulatory & National Integration (NPCI & RBI)",
      q: "Where exactly does this get integrated?", a: "It integrates directly at the central clearinghouse or switch level. Alternatively, it can be deployed as a federated node inside individual partner banks that share real-time telemetry." },
    
    { category: "Technical & ML Mechanics",
      q: "How does reactive tag propagation work?", a: "When a victim reports fraud, TraceNet injects a 'trace tag' into the graph. Using Breadth-First Search (BFS) filtered strictly by time, the tag follows the tainted money, instantly issuing auto-freeze commands to all downstream recipient accounts." },
    { category: "Technical & ML Mechanics",
      q: "How does the system avoid flagging innocent past transactions?", a: "TraceNet's algorithm enforces a strict temporal filter: a downstream account is only flagged if the transaction occurred *after* the exact timestamp the tainted money arrived." },
    { category: "Technical & ML Mechanics",
      q: "What is a 'mule account' and how does the ML scorer identify it?", a: "A mule account receives and immediately forwards illicit funds. Our ML scorer identifies them proactively using behavioral features: near-zero hold times, high fan-out ratios, and abnormal transaction velocities." },
    { category: "Technical & ML Mechanics",
      q: "What is 'Structuring' in money laundering?", a: "Structuring (or 'smurfing') involves breaking large sums of illicit money into smaller transactions to evade regulatory reporting thresholds. TraceNet computes a structuring score to catch this pattern automatically." },
    { category: "Technical & ML Mechanics",
      q: "How does the system handle multi-bank fraud chains?", a: "By operating at the central switch level, TraceNet possesses a unified view of the graph. It generates cryptographically signed cross-bank freeze commands, ignoring institutional boundaries that usually slow down investigations." },
    { category: "Technical & ML Mechanics",
      q: "What is the Evidence Chain and why is it tamper-evident?", a: "The Evidence Chain is an append-only ledger of all freeze events. Every record is hash-chained to the previous one and HMAC-signed, ensuring no actor can maliciously alter or erase a freeze record without detection." },
    { category: "Technical & ML Mechanics",
      q: "How does TraceNet explain its ML decisions to human judges?", a: "TraceNet features a Plain-English Translator. Instead of dumping raw ML tensors, it converts feature contributions into clear, legally defensible sentences for compliance officers." },
    { category: "Technical & ML Mechanics",
      q: "How does the system scale to handle billions of transactions?", a: "Graph operations are localized. When tracing fraud, TraceNet only traverses the localized subgraph connected to the origin node, allowing massive horizontal scaling for the wider network." },
    
    { category: "Operations & Handling",
      q: "How does TraceNet handle false positives?", a: "TraceNet uses a multi-tiered approach. Minor anomalies receive a 'WATCH' status for human review, while only extreme, mathematically provable fraud chains breach the >92.5% confidence threshold required for an automatic 'HIGH_RISK' freeze." },
    { category: "Operations & Handling",
      q: "What happens during an automatic freeze?", a: "TraceNet calculates the exact interdiction path, appends the rationale to the Evidence Chain, signs it with an HMAC key, and dispatches a WebSocket command to the partner bank to lock the account instantly." },
    { category: "Operations & Handling",
      q: "Can manual overrides be issued?", a: "Yes. Authorized administrators with the correct cryptographic clearance can append an 'UNFREEZE' record to the Evidence Chain, immediately restoring an account's status." },
    { category: "Operations & Handling",
      q: "Does TraceNet respect user data privacy?", a: "Absolutely. The graph operates on pseudonymized account IDs and bank hashes. PII (Personally Identifiable Information) remains isolated within individual banks and is never exposed to the central TraceNet engine." },
    { category: "Operations & Handling",
      q: "What is the difference between HIGH_RISK and WATCH classifications?", a: "HIGH_RISK accounts trigger immediate, automated defensive actions (like freezes). WATCH accounts are merely flagged on a dashboard for compliance officers to monitor manually, avoiding unnecessary disruption for legitimate users." },
      
    { category: "Extreme Crime & Edge Cases",
      q: "Can TraceNet track ransom money in kidnapping scenarios?", a: "Absolutely. In extortion or kidnapping cases where ransom is paid digitally, criminals immediately disperse funds through a massive web of accounts. TraceNet's machine-speed graph traversal instantly maps and freezes these networks, preventing cash-out and aiding law enforcement in tracking perpetrators." },
    { category: "Extreme Crime & Edge Cases",
      q: "Is this applicable to terror financing or human trafficking networks?", a: "Yes. Both rely on obfuscating the flow of money through deep, multi-layered networks. TraceNet's ability to cross institutional boundaries at the switch level makes it uniquely capable of dismantling these financial structures in real-time." },
    { category: "Extreme Crime & Edge Cases",
      q: "What if criminals use crypto-exchanges to cash out?", a: "TraceNet can integrate with the fiat on/off ramps of crypto-exchanges. If a trace tag hits an exchange's designated bank account, TraceNet dispatches a high-priority freeze command to the exchange's API, halting conversion before it reaches decentralized networks." }
  ];

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {});

  let globalIndex = 0;

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: 0 }}>
      <div className="view-header" style={{ flexShrink: 0 }}>
        <h2 className="view-title">FAQ & Documentation</h2>
        <p className="view-subtitle">Comprehensive answers on TraceNet's architecture, regulatory impact, and integration.</p>
      </div>

      <div style={{
        flex: 1, 
        overflowY: 'auto',
        paddingRight: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        paddingBottom: 40
      }}>
        {Object.entries(groupedFaqs).map(([category, questions], catIdx) => (
          <div key={category} style={{ animation: `slide-in-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards`, animationDelay: `${catIdx * 0.1}s` }}>
            <h3 style={{ 
              fontSize: 14, 
              textTransform: 'uppercase', 
              letterSpacing: 1.5, 
              color: 'var(--text-muted)', 
              marginBottom: 16,
              borderBottom: '1px solid var(--border-lo)',
              paddingBottom: 8
            }}>
              {category}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questions.map((faq) => {
                const currentIndex = globalIndex++;
                const isOpen = openIndex === currentIndex;
                const isHovered = hoveredIndex === currentIndex;
                
                return (
                  <div 
                    key={currentIndex}
                    onClick={() => toggleFaq(currentIndex)}
                    onMouseEnter={() => setHoveredIndex(currentIndex)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      background: isOpen ? 'rgba(255, 255, 255, 0.7)' : (isHovered ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.3)'),
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid',
                      borderColor: isOpen ? 'var(--border-md)' : (isHovered ? 'var(--border-hi)' : 'var(--border-lo)'),
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.05)' : (isHovered ? '0 2px 8px rgba(0,0,0,0.03)' : 'none'),
                      transform: isOpen ? 'scale(1.005)' : (isHovered ? 'scale(1.002) translateX(2px)' : 'scale(1)')
                    }}
                  >
                    <div style={{ 
                      padding: '16px 20px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <span style={{ 
                        fontWeight: 600, 
                        fontSize: 14, 
                        color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}>
                        {faq.q}
                      </span>
                      <span style={{ 
                        color: 'var(--text-muted)', 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.3s ease' 
                      }}>
                        ▼
                      </span>
                    </div>
                    
                    <div style={{
                      maxHeight: isOpen ? 500 : 0,
                      opacity: isOpen ? 1 : 0,
                      transition: 'all 0.3s ease-in-out',
                      padding: isOpen ? '0 20px 20px 20px' : '0 20px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      fontSize: 14
                    }}>
                      <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-lo)' }}>
                        {faq.a}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
