import React, { useRef, useEffect, useState } from 'react';

export default function NetworkGraph({ nodes = [], edges = [], activeTracePath = [], selectedNode, onSelectNode }) {
  const canvasRef = useRef(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const nodesPosRef = useRef({});
  const animFrameRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Initialize node physics positions in canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    nodes.forEach((node, idx) => {
      if (!nodesPosRef.current[node.id]) {
        // Position in circle / force grid layout
        const angle = (idx / nodes.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.35 + (Math.random() * 50 - 25);
        nodesPosRef.current[node.id] = {
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle),
          vx: 0,
          vy: 0,
        };
      }
    });
  }, [nodes]);

  // Main Canvas Render Loop with Force Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let pulseStep = 0;

    const render = () => {
      pulseStep = (pulseStep + 0.05) % (Math.PI * 2);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(transformRef.current.x, transformRef.current.y);
      ctx.scale(transformRef.current.scale, transformRef.current.scale);

      // Force Layout Physics Iteration
      const nodeKeys = Object.keys(nodesPosRef.current);
      const width = canvas.width;
      const height = canvas.height;

      // 1. Repulsion between all node pairs
      for (let i = 0; i < nodeKeys.length; i++) {
        for (let j = i + 1; j < nodeKeys.length; j++) {
          const idA = nodeKeys[i];
          const idB = nodeKeys[j];
          const posA = nodesPosRef.current[idA];
          const posB = nodesPosRef.current[idB];

          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          if (dist < 180) {
            const force = (180 - dist) / dist * 0.08;
            posA.vx -= dx * force;
            posA.vy -= dy * force;
            posB.vx += dx * force;
            posB.vy += dy * force;
          }
        }
      }

      // 2. Spring attraction along edges
      edges.forEach((edge) => {
        const posA = nodesPosRef.current[edge.source];
        const posB = nodesPosRef.current[edge.target];
        if (posA && posB) {
          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const force = (dist - 120) * 0.005;

          posA.vx += dx * force;
          posA.vy += dy * force;
          posB.vx -= dx * force;
          posB.vy -= dy * force;
        }
      });

      // 3. Center gravity force & update positions
      nodeKeys.forEach((id) => {
        const pos = nodesPosRef.current[id];
        if (pos && dragNodeRef.current !== id) {
          const gravityX = (width / 2 - pos.x) * 0.0005;
          const gravityY = (height / 2 - pos.y) * 0.0005;
          pos.vx = (pos.vx + gravityX) * 0.85; // Damping
          pos.vy = (pos.vy + gravityY) * 0.85;
          pos.x += pos.vx;
          pos.y += pos.vy;
        }
      });

      // Render Edges
      edges.forEach((edge) => {
        const posA = nodesPosRef.current[edge.source];
        const posB = nodesPosRef.current[edge.target];
        if (!posA || !posB) return;

        const isTagged = edge.trace_tag || (activeTracePath.includes(edge.source) && activeTracePath.includes(edge.target));

        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.lineTo(posB.x, posB.y);

        if (isTagged) {
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 12;
        } else {
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw animated energy particle on tagged edges
        if (isTagged) {
          const progress = (pulseStep * 2) % 1;
          const px = posA.x + (posB.x - posA.x) * progress;
          const py = posA.y + (posB.y - posA.y) * progress;

          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#FF2D55';
          ctx.shadowColor = '#FF2D55';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Render Nodes
      nodes.forEach((node) => {
        const pos = nodesPosRef.current[node.id];
        if (!pos) return;

        const isFrozen = node.freeze_status === 'frozen';
        const isWatch = node.classification === 'WATCH';
        const isSelected = selectedNode === node.id;
        const isVictim = node.id === 'VICTIM';

        // Outer pulsing ring for frozen/interdicted nodes
        if (isFrozen) {
          const shockRadius = 24 + Math.sin(pulseStep * 2) * 6;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, shockRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Node Circle Base
        ctx.beginPath();
        const radius = isVictim ? 18 : 14;
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

        if (isFrozen) {
          ctx.fillStyle = '#EF4444';
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 18;
        } else if (isWatch) {
          ctx.fillStyle = '#F59E0B';
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 12;
        } else if (isVictim) {
          ctx.fillStyle = '#EC4899';
          ctx.shadowColor = '#EC4899';
          ctx.shadowBlur = 15;
        } else {
          ctx.fillStyle = '#06B6D4';
          ctx.shadowColor = '#06B6D4';
          ctx.shadowBlur = 6;
        }

        ctx.fill();
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = isFrozen ? '#FCA5A5' : isWatch ? '#FDE68A' : '#E2E8F0';
        ctx.textAlign = 'center';
        ctx.fillText(node.id, pos.x, pos.y + radius + 14);

        if (node.bank_id) {
          ctx.font = '400 9px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
          ctx.fillText(node.bank_id, pos.x, pos.y + radius + 25);
        }
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nodes, edges, activeTracePath, selectedNode]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Interaction (Click & Drag Nodes / Pan Graph)
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.scale;
    const mouseY = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.scale;

    // Check if clicked on a node
    let clickedId = null;
    nodes.forEach((node) => {
      const pos = nodesPosRef.current[node.id];
      if (pos) {
        const dx = pos.x - mouseX;
        const dy = pos.y - mouseY;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          clickedId = node.id;
        }
      }
    });

    if (clickedId) {
      dragNodeRef.current = clickedId;
      onSelectNode(clickedId);
    } else {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e) => {
    if (dragNodeRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.scale;
      const mouseY = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.scale;

      const pos = nodesPosRef.current[dragNodeRef.current];
      if (pos) {
        pos.x = mouseX;
        pos.y = mouseY;
        pos.vx = 0;
        pos.vy = 0;
      }
    } else if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
    isDraggingRef.current = false;
  };

  return (
    <div className="relative w-full h-full bg-[#070A10] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />
      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 glass-panel p-3 rounded-xl text-xs space-y-1.5 pointer-events-none">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Graph Legend</p>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500"></span>
          <span className="text-rose-300 font-medium">Frozen Account (Tag Propagated)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-amber-300 font-medium">Watchlist Mule (ML Flagged)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
          <span className="text-slate-300">Clean Active Account</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-pink-500"></span>
          <span className="text-pink-300 font-medium">Victim Account (Origin)</span>
        </div>
      </div>
    </div>
  );
}
