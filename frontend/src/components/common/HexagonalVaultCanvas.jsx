import React, { useEffect, useRef } from 'react';

/**
 * Subtle, high-tech Hexagonal Vault background effect
 * Renders faint, drifting geometric hexagons in darker regions
 * Respects prefers-reduced-motion preferences
 */
export default function HexagonalVaultCanvas({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Subtle drifting hexagons
    const HEX_SIZE = 36;
    const hexagons = [];
    const count = Math.min(24, Math.floor((width * height) / 45000));

    for (let i = 0; i < count; i++) {
      hexagons.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.6, // concentrate more in the upper twilight sky
        size: HEX_SIZE * (0.6 + Math.random() * 0.8),
        opacity: 0.03 + Math.random() * 0.05, // very faint so it never obscures photo or text
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.003,
      });
    }

    const drawHexagon = (x, y, r, rot, opacity) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = rot + (i * Math.PI) / 3;
        const hx = x + r * Math.cos(angle);
        const hy = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // subtle vertex dots
      ctx.fillStyle = `rgba(34, 211, 238, ${opacity * 1.5})`;
      for (let i = 0; i < 6; i++) {
        const angle = rot + (i * Math.PI) / 3;
        const hx = x + r * Math.cos(angle);
        const hy = y + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(hx, hy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < hexagons.length; i++) {
        const h = hexagons[i];
        h.x += h.vx;
        h.y += h.vy;
        h.rotation += h.vRot;

        // Wrap around boundaries
        if (h.x < -HEX_SIZE) h.x = width + HEX_SIZE;
        if (h.x > width + HEX_SIZE) h.x = -HEX_SIZE;
        if (h.y < -HEX_SIZE) h.y = height + HEX_SIZE;
        if (h.y > height + HEX_SIZE) h.y = -HEX_SIZE;

        drawHexagon(h.x, h.y, h.size, h.rotation, h.opacity);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      style={{ opacity: 0.8 }}
    />
  );
}
