"use client";

import { useEffect, useRef } from "react";

export default function HeroOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let nodes: { x: number; y: number; vx: number; vy: number; r: number; pulse: number; active: boolean }[] = [];

    function resize() {
      canvas!.width = canvas!.offsetWidth * 2;
      canvas!.height = canvas!.offsetHeight * 2;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 1.5,
        pulse: Math.random() * Math.PI * 2,
        active: Math.random() > 0.7,
      });
    }

    let tick = 0;
    function draw() {
      tick++;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        node.pulse += 0.02;
        if (node.x < 0 || node.x > canvas!.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas!.height) node.vy *= -1;
        if (tick % 200 === 0) node.active = Math.random() > 0.6;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const alpha = (1 - dist / 200) * 0.15;
            const isActive = nodes[i].active && nodes[j].active;
            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.strokeStyle = isActive
              ? `rgba(230, 106, 45, ${alpha * 2.5})`
              : `rgba(255, 255, 255, ${alpha})`;
            ctx!.lineWidth = isActive ? 1.5 : 0.5;
            ctx!.stroke();
          }
        }
      }

      for (const node of nodes) {
        const glow = Math.sin(node.pulse) * 0.3 + 0.7;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, node.r * (node.active ? 2 : 1), 0, Math.PI * 2);
        ctx!.fillStyle = node.active
          ? `rgba(230, 106, 45, ${glow})`
          : `rgba(255, 255, 255, ${glow * 0.4})`;
        ctx!.fill();

        if (node.active) {
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, node.r * 4, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(230, 106, 45, ${glow * 0.1})`;
          ctx!.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 0.6 }}
    />
  );
}
