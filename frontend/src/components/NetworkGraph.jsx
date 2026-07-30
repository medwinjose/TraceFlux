import React, { useRef, useEffect, useCallback, useState } from 'react';

/* ─── Physics Constants ──────────────────────────────────────────────── */
const REPULSION       = 6000;   // Massive repulsion to force nodes apart
const LINK_DIST       = 140;    // Increased distance between connected nodes
const LINK_STRENGTH   = 0.04;   
const ALPHA_DECAY     = 0.02;   // Slower cooling for smoother settling
const ALPHA_MIN       = 0.001;  
const VELOCITY_DECAY  = 0.82;   // Slightly more friction to prevent chaotic bouncing
const VEL_CAP         = 20;     // Higher cap for fluid movement 

/* ─── Colors ─────────────────────────────────────────────────────────── */
const C = {
  frozen:  '#8B1E15', // Oxblood
  watch:   '#9C6A1E', // Bronze
  clean:   '#26492F', // Forest Green
  victim:  '#1E3B4D', // Navy
  edge:    'rgba(0,0,0,0.18)',
  edgeHot: '#8B1E15',
  bg:      '#Fcfcfa',
  grid:    'rgba(0,0,0,0.04)',
  label:   'rgba(0,0,0,0.85)',
  labelFrozen: '#8B1E15',
  labelWatch:  '#9C6A1E',
};

function nodeColor(node) {
  if (node.freeze_status === 'frozen') return C.frozen;
  if (node.id === 'VICTIM')            return C.victim;
  if (node.classification === 'HIGH_RISK') return C.frozen;
  if (node.classification === 'WATCH')     return C.watch;
  return C.clean;
}

function nodeSize(node) {
  if (node.id === 'VICTIM') return 16;
  if (node.freeze_status === 'frozen' || node.classification === 'HIGH_RISK') return 14 + (node.risk_score || 0) * 8;
  if (node.classification === 'WATCH') return 12 + (node.risk_score || 0) * 6;
  return 10;
}

export default function NetworkGraph({
  nodes = [], edges = [],
  activeTracePath = [],
  selectedNode, onSelectNode,
  isSweeping = false,
}) {
  const canvasRef   = useRef(null);
  const posRef      = useRef({});          // { id: { x, y, vx, vy } }
  const alphaRef    = useRef(1.0);
  const rafRef      = useRef(null);
  const dragRef     = useRef(null);        // dragged node id
  const panRef      = useRef({ dragging: false, lx: 0, ly: 0 });
  const xformRef    = useRef({ x: 0, y: 0, scale: 1 });
  const hoverRef    = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { x, y, node }

  /* ── Initialize / reset positions when node list changes ─────────── */
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    const W = canvasRef.current.width  || 800;
    const H = canvasRef.current.height || 600;

    // 1. Build Adjacency List for BFS
    const adj = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
      if (adj[e.source]) adj[e.source].push(e.target);
    });

    // 2. BFS from VICTIM to assign depths
    const depths = {};
    nodes.forEach(n => depths[n.id] = -1); // default
    if (depths['VICTIM'] !== undefined) {
      depths['VICTIM'] = 0;
      const q = ['VICTIM'];
      while (q.length > 0) {
        const cur = q.shift();
        const d = depths[cur];
        (adj[cur] || []).forEach(neighbor => {
          if (depths[neighbor] === -1 || depths[neighbor] > d + 1) {
            depths[neighbor] = d + 1;
            q.push(neighbor);
          }
        });
      }
    }

    // 3. Handle disconnected nodes (assign max depth + 1)
    let maxDepth = 0;
    Object.values(depths).forEach(d => { if (d > maxDepth) maxDepth = d; });
    nodes.forEach(n => {
      if (depths[n.id] === -1) depths[n.id] = maxDepth > 0 ? maxDepth + 1 : 1; 
    });
    
    // 4. Group by depth for Y-spacing
    const depthGroups = {};
    nodes.forEach(n => {
      const d = depths[n.id];
      if (!depthGroups[d]) depthGroups[d] = [];
      depthGroups[d].push(n.id);
    });
    
    // Sort each group so they appear consistently (e.g., high risk at the top)
    Object.keys(depthGroups).forEach(d => {
      depthGroups[d].sort((a, b) => {
        const nodeA = nodes.find(n => n.id === a);
        const nodeB = nodes.find(n => n.id === b);
        return (nodeB.risk_score || 0) - (nodeA.risk_score || 0);
      });
    });

    nodes.forEach((node) => {
      const d = depths[node.id];
      const maxD = Math.max(...Object.keys(depthGroups).map(Number));
      const xProgress = maxD === 0 ? 0.5 : d / maxD;
      
      // Target Coordinates (Soft X column, completely free Y)
      // Add random jitter to targetX so nodes don't pile up on the exact same vertical line
      const targetX = W * 0.15 + xProgress * (W * 0.6) + (Math.random() - 0.5) * 80;
      // Give them a slight random Y spread to start, physics will naturally untangle them
      const targetY = (H / 2) + (Math.random() - 0.5) * H * 0.7;

      if (!posRef.current[node.id]) {
        posRef.current[node.id] = {
          x:  targetX + (Math.random() - 0.5) * 50,
          y:  targetY + (Math.random() - 0.5) * 50,
          targetX, targetY,
          vx: 0, vy: 0,
          scale: 0, // for entrance animation
        };
      } else {
        // Update X target for existing nodes in case topology shifted
        posRef.current[node.id].targetX = targetX;
        // Don't update targetY, let them keep their established vertical position
      }
    });

    // Kick the simulation back to life when data changes
    alphaRef.current = 1.0;
  }, [nodes]);

  /* ── Resize observer ─────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const p = canvas.parentElement;
      if (p && p.clientWidth > 0 && p.clientHeight > 0) {
        canvas.width  = p.clientWidth;
        canvas.height = p.clientHeight;
      }
    };
    resize();
    const obs = new ResizeObserver(resize);
    if (canvas.parentElement) obs.observe(canvas.parentElement);
    window.addEventListener('resize', resize);
    return () => { obs.disconnect(); window.removeEventListener('resize', resize); };
  }, []);

  /* ── Main render + physics loop ──────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let pulse = 0;

    const tick = () => {
      const W = canvas.width;
      const H = canvas.height;
      pulse = (pulse + 0.04) % (Math.PI * 2);

      /* ─ Physics ───────────────────────────────────────────────────── */
      const alpha = alphaRef.current;
      const nodeKeys = Object.keys(posRef.current);

      // Force render if sweeping, even if physics settled
      if (alpha > ALPHA_MIN || isSweeping) {
        // 1. Repulsion (only apply if nodes are close enough, prevents exploding clusters)
        for (let i = 0; i < nodeKeys.length; i++) {
          for (let j = i + 1; j < nodeKeys.length; j++) {
            const a = posRef.current[nodeKeys[i]];
            const b = posRef.current[nodeKeys[j]];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy + 1; // avoid / 0
            
            // Only repel if they are within 280px of each other
            if (distSq < 78400) {
              const dist = Math.sqrt(distSq);
              const force = (REPULSION * alpha) / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              a.vx -= fx; a.vy -= fy;
              b.vx += fx; b.vy += fy;
            }
          }
        }

        // 2. Spring attraction along edges
        edges.forEach((edge) => {
          const a = posRef.current[edge.source];
          const b = posRef.current[edge.target];
          if (!a || !b) return;
          const dx   = b.x - a.x;
          const dy   = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const delta = (dist - LINK_DIST) * LINK_STRENGTH * alpha;
          const fx = (dx / dist) * delta;
          const fy = (dy / dist) * delta;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        });

        // 3. Center gravity + soft layout constraints
        nodeKeys.forEach((id) => {
          const p = posRef.current[id];
          if (dragRef.current === id) return; // don't touch dragged node

          // Pull strictly towards targetX, but extremely gently towards H/2 for Y to allow wide vertical spread
          p.vx += (p.targetX - p.x) * 0.02 * alpha;
          p.vy += ((H / 2) - p.y) * 0.002 * alpha; // Very weak Y gravity so nodes can spread out vertically

          // Smooth Friction
          p.vx *= VELOCITY_DECAY;
          p.vy *= VELOCITY_DECAY;

          // Velocity cap to prevent jumping
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd > VEL_CAP) { p.vx = (p.vx / spd) * VEL_CAP; p.vy = (p.vy / spd) * VEL_CAP; }

          p.x += p.vx;
          p.y += p.vy;

          // Soft boundary — gently push back from edges
          const PAD = 40;
          if (p.x < PAD)     { p.vx += (PAD - p.x) * 0.1; }
          if (p.x > W - PAD) { p.vx -= (p.x - (W - PAD)) * 0.1; }
          if (p.y < PAD)     { p.vy += (PAD - p.y) * 0.1; }
          if (p.y > H - PAD) { p.vy -= (p.y - (H - PAD)) * 0.1; }
        });

        alphaRef.current *= (1 - ALPHA_DECAY);
      }

      /* ─ Render ────────────────────────────────────────────────────── */
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(xformRef.current.x, xformRef.current.y);
      ctx.scale(xformRef.current.scale, xformRef.current.scale);

      // Background grid
      drawGrid(ctx, W, H, xformRef.current);

      // Sweep Radar Animation
      // 5. Draw Edges
      edges.forEach((edge) => {
        const a = posRef.current[edge.source];
        const b = posRef.current[edge.target];
        if (!a || !b) return;

        const hot = edge.trace_tag ||
          (activeTracePath.includes(edge.source) && activeTracePath.includes(edge.target));

        const ax = a.x;
        const ay = a.y;
        const bx = b.x;
        const by = b.y;

        const dx = bx - ax;
        const dy = by - ay;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Don't draw to the exact center of the node, stop at radius
        const targetRadius = 14; 
        const endX = bx - Math.cos(angle) * targetRadius;
        const endY = by - Math.sin(angle) * targetRadius;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(endX, endY);

        if (hot) {
          ctx.strokeStyle = C.edgeHot;
          ctx.lineWidth   = 2.0;
        } else {
          ctx.strokeStyle = C.edge;
          ctx.lineWidth   = 1;
        }
        ctx.stroke();

        // Draw arrow head
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 6 * Math.cos(angle - Math.PI / 6), endY - 6 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - 6 * Math.cos(angle + Math.PI / 6), endY - 6 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = hot ? C.edgeHot : C.edge;
        ctx.fill();
        
        // Subtle moving dash instead of glowing particle
        if (hot) {
          const t  = ((pulse * 0.4) % 1 + 1) % 1;
          const px = ax + (endX - ax) * t;
          const py = ay + (endY - ay) * t;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle   = C.edgeHot;
          ctx.fill();
        }

        // Edge Label (Transaction Amount)
        // Generate a pseudo-random amount safely
        const srcStr = String(edge.source);
        const tgtStr = String(edge.target);
        const hash = (srcStr.charCodeAt(0) + tgtStr.charCodeAt(tgtStr.length > 0 ? tgtStr.length - 1 : 0)) || 1;
        const amt = (hash * 123.45).toFixed(1);
        const midX = ax + (endX - ax) * 0.5;
        const midY = ay + (endY - ay) * 0.5;
        
        ctx.save();
        ctx.translate(midX, midY);
        if (dx < 0) ctx.rotate(angle + Math.PI); // keep text upright
        else ctx.rotate(angle);
        
        // Only show amounts if edge is hot or during sweep to declutter
        if (hot || isSweeping) {
          ctx.font = `500 10px 'Inter', sans-serif`;
          ctx.fillStyle = hot ? C.edgeHot : 'rgba(0,0,0,0.4)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`$${amt}k`, 0, -4);
        }
        ctx.restore();
      });

      // Nodes
      nodes.forEach((node) => {
        const pos = posRef.current[node.id];
        if (!pos) return;
        
        // Entrance scaling
        if (pos.scale < 1) pos.scale += (1 - pos.scale) * 0.1;

        const isFrozen   = node.freeze_status === 'frozen';
        const isVictim   = node.id === 'VICTIM';
        const isSelected = selectedNode === node.id;
        const isHover    = hoverRef.current === node.id;
        const color      = nodeColor(node);
        
        // Size scales heavily with risk score
        const baseR      = isVictim ? 18 : 10;
        const riskBonus  = (node.risk_score || 0) * 12; 
        const r          = (baseR + riskBonus) * pos.scale;
        
        if (r < 0.1) return;

        const renderX = pos.x;
        const renderY = pos.y;

        // Selection / hover ring (sharp, no glow)
        if (isSelected || isHover) {
          ctx.beginPath();
          ctx.arc(renderX, renderY, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth   = 1.5;
          ctx.stroke();
        }

        // Frozen ring (sharp, geometric)
        if (isFrozen) {
          const ring = r + 8 + (Math.floor(pulse * 4) % 2 === 0 ? 2 : 0); // step pulse
          ctx.beginPath();
          ctx.arc(renderX, renderY, ring, 0, Math.PI * 2);
          ctx.strokeStyle = C.frozen;
          ctx.lineWidth   = 1.0;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Node fill - matte solid
        ctx.beginPath();
        ctx.arc(renderX, renderY, r, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.fill();

        // Border - crisp white (surface) to contrast against dark lines and light bg
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        // Label - larger, more elegant
        ctx.font      = `600 11px 'Inter', sans-serif`;
        ctx.fillStyle = C.label;
        ctx.save();
        ctx.translate(renderX, renderY + r + 14);
        const isHovered = hoverRef.current === node.id;
        
        // Declutter: ONLY show labels for Victim, or explicitly hovered nodes
        // This removes the massive unreadable text overlapping in the center
        if (isHovered || isVictim) {
          ctx.font      = `600 11px 'Inter', sans-serif`;
          ctx.fillStyle = C.label;
          if (isFrozen) ctx.fillStyle = C.labelFrozen;
          if (node.classification === 'WATCH') ctx.fillStyle = C.labelWatch;
          ctx.textAlign = 'center';
          ctx.fillText(node.id, 0, 0);
          ctx.font = `500 9px 'Inter', sans-serif`;
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillText(node.bank_id || 'BankX', 0, 12);

          // Risk score below label (compact)
          if (node.risk_score > 0) {
            ctx.font      = `400 9px 'Inter', sans-serif`;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(node.risk_score * 100)}%`, 0, 24);
          }
        }
        ctx.restore();
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };

    // Wake up loop on new data or sweep trigger
    alphaRef.current = 1.0;
    if (!rafRef.current) tick();
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [nodes, edges, activeTracePath, isSweeping, selectedNode]);

  /* ── Hit test helper ─────────────────────────────────────────────── */
  const worldXY = useCallback((e) => {
    const rect  = canvasRef.current.getBoundingClientRect();
    const mx    = (e.clientX - rect.left  - xformRef.current.x) / xformRef.current.scale;
    const my    = (e.clientY - rect.top   - xformRef.current.y) / xformRef.current.scale;
    return [mx, my];
  }, []);

  const hitNode = useCallback(([mx, my]) => {
    for (const node of nodes) {
      const p = posRef.current[node.id];
      if (!p) continue;
      const r = node.id === 'VICTIM' ? 16 : 12;
      const dx = p.x - mx, dy = p.y - my;
      if (Math.sqrt(dx * dx + dy * dy) <= r + 4) return node;
    }
    return null;
  }, [nodes]);

  /* ── Mouse events ────────────────────────────────────────────────── */
  const onMouseDown = useCallback((e) => {
    const xy   = worldXY(e);
    const node = hitNode(xy);
    if (node) {
      dragRef.current = node.id;
      onSelectNode(node.id);
    } else {
      panRef.current = { dragging: true, lx: e.clientX, ly: e.clientY };
    }
  }, [hitNode, worldXY, onSelectNode]);

  const onMouseMove = useCallback((e) => {
    const xy = worldXY(e);

    if (dragRef.current) {
      const p = posRef.current[dragRef.current];
      if (p) { p.x = xy[0]; p.y = xy[1]; p.vx = 0; p.vy = 0; }
      return;
    }
    if (panRef.current.dragging) {
      xformRef.current.x += e.clientX - panRef.current.lx;
      xformRef.current.y += e.clientY - panRef.current.ly;
      panRef.current.lx   = e.clientX;
      panRef.current.ly   = e.clientY;
      return;
    }

    // Hover detection
    const hit = hitNode(xy);
    hoverRef.current = hit ? hit.id : null;

    if (hit) {
      const rect = canvasRef.current.getBoundingClientRect();
      setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10, node: hit });
    } else {
      setTooltip(null);
    }
  }, [hitNode, worldXY]);

  const onMouseUp = useCallback(() => {
    dragRef.current        = null;
    panRef.current.dragging = false;
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    xformRef.current.scale = Math.min(3, Math.max(0.3, xformRef.current.scale * factor));
  }, []);

  const zoomIn  = () => { xformRef.current.scale = Math.min(3,   xformRef.current.scale * 1.2); };
  const zoomOut = () => { xformRef.current.scale = Math.max(0.3, xformRef.current.scale / 1.2); };
  const resetView = () => { xformRef.current = { x: 0, y: 0, scale: 1 }; };

  return (
    <div className="graph-panel">
      {/* Toolbar */}
      <div className="graph-toolbar">
        <div className="graph-title">
          <span className="graph-title-dot" />
          Global Surveillance Topology
        </div>

        <div className="graph-controls">
          <button className="graph-btn" onClick={zoomIn}  title="Zoom In">+</button>
          <button className="graph-btn" onClick={zoomOut} title="Zoom Out">−</button>
          <button className="graph-btn" onClick={resetView} title="Reset View">⊡</button>
        </div>

        <div className="graph-legend">
          <div className="legend-item"><span className="legend-dot" style={{ background: C.frozen }} />Frozen</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: C.watch  }} />Watchlist</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: C.clean  }} />Clean</div>
          <div className="legend-item"><span className="legend-dot" style={{ background: C.victim }} />Victim</div>
        </div>
      </div>

      {/* Canvas */}
      <div className="graph-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="graph-canvas"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        />

        {/* Tooltip */}
        {tooltip && tooltip.node && (
          <div
            className="canvas-node-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="tooltip-id">{tooltip.node.id}</div>
            <div className="tooltip-bank">{tooltip.node.bank_id}</div>
            <div
              className="tooltip-score"
              style={{ color: nodeColor(tooltip.node) }}
            >
              Risk: {Math.round((tooltip.node.risk_score || 0) * 100)}%
              {' '}· {tooltip.node.classification || 'CLEAN'}
            </div>
            {tooltip.node.freeze_status === 'frozen' && (
              <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>⚠ Account Frozen</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
function drawGrid(ctx, W, H, xform) {
  const step = 40;
  ctx.save();
  ctx.strokeStyle = C.grid;
  ctx.lineWidth   = 1;
  const ox = (xform.x % (step * xform.scale)) / xform.scale;
  const oy = (xform.y % (step * xform.scale)) / xform.scale;

  for (let x = ox; x < W / xform.scale; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H / xform.scale); ctx.stroke();
  }
  for (let y = oy; y < H / xform.scale; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W / xform.scale, y); ctx.stroke();
  }
  ctx.restore();
}
