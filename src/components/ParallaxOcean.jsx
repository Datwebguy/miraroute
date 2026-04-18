// ParallaxOcean.jsx — animated canvas background with mouse parallax
// Three layers: back streaks, grid lines, teal floating dots

import { useEffect, useRef, useState } from "react";

function useMouseParallax() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let raf = 0;
    const target = { x: 0, y: 0 };
    const onMove  = (e) => { target.x = (e.clientX / window.innerWidth) * 2 - 1; target.y = (e.clientY / window.innerHeight) * 2 - 1; };
    const onLeave = () => { target.x = 0; target.y = 0; };
    const tick = () => {
      setPos(prev => ({ x: prev.x + (target.x - prev.x) * 0.08, y: prev.y + (target.y - prev.y) * 0.08 }));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf); };
  }, []);
  return pos;
}

function CanvasLayer({ drawFn, speed = 1, parallax = { x: 0, y: 0 }, intensity = 20, zIndex = 0 }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cv  = canvasRef.current;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
      cv.style.width = window.innerWidth + 'px'; cv.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const loop = () => {
      tRef.current += speed * 0.016;
      ctx.clearRect(0, 0, cv.width, cv.height);
      drawFn(ctx, tRef.current, window.innerWidth, window.innerHeight);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current); };
  }, [drawFn, speed]);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex, transform: `translate3d(${-parallax.x * intensity}px, ${-parallax.y * intensity}px, 0)`, transition: 'transform 0.1s linear', willChange: 'transform' }}>
      <canvas ref={canvasRef}/>
    </div>
  );
}

const drawBack = (ctx, t, w, h) => {
  const cols = 12, rows = 8;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = (i / cols) * w + (t * 40) % (w / cols) - w / cols;
      const y = (j / rows) * h + Math.sin(t * 0.3 + i * 0.5) * 8;
      const size = 60 + Math.sin(t * 0.2 + i + j) * 20;
      ctx.save(); ctx.translate(x + (w / cols) / 2, y + (h / rows) / 2);
      ctx.rotate(t * 0.05 + i * 0.1 + j * 0.2);
      ctx.globalAlpha = 0.06 + (Math.sin(t * 0.5 + i + j) + 1) * 0.015;
      ctx.fillStyle = '#1A2E44'; ctx.fillRect(-size / 2, -size / 2, size, 1.5);
      ctx.restore();
    }
  }
};

const drawGrid = (ctx, t, w, h) => {
  const spacing = 80, drift = (t * 22) % spacing;
  for (let x = -spacing + drift; x < w + spacing; x += spacing) {
    const alpha = 0.04 + Math.sin(t * 0.4 + x * 0.01) * 0.02;
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, alpha)})`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += spacing) {
    const d = Math.abs(y - h / 2) / (h / 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - d * 0.6)})`; ctx.lineWidth = 0.6;
    const wobble = Math.sin(t * 0.5 + y * 0.01) * 3;
    ctx.beginPath(); ctx.moveTo(0, y + wobble); ctx.lineTo(w, y + wobble); ctx.stroke();
  }
  for (let x = -spacing + drift; x < w + spacing; x += spacing) {
    for (let y = 0; y < h; y += spacing) {
      const twinkle = (Math.sin(t * 0.8 + x * 0.02 + y * 0.03) + 1) / 2;
      if (twinkle > 0.75) {
        ctx.fillStyle = `rgba(255,255,255,${(twinkle - 0.75) * 0.5})`;
        ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
};

let _dots = null;
const drawDots = (ctx, t, w, h) => {
  if (!_dots || _dots._w !== w || _dots._h !== h) {
    _dots = Array.from({ length: 38 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: 1.5 + Math.random() * 3.5, speed: 0.15 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2, bright: 0.4 + Math.random() * 0.6,
    }));
    _dots._w = w; _dots._h = h;
  }
  for (const d of _dots) {
    d.x += d.speed;
    if (d.x > w + 20) d.x = -20;
    const by = d.y + Math.sin(t * 0.4 + d.phase) * 12;
    const pulse = (Math.sin(t * 0.6 + d.phase) + 1) / 2;
    const alpha = 0.15 + pulse * 0.35 * d.bright;
    const grad = ctx.createRadialGradient(d.x, by, 0, d.x, by, d.r * 6);
    grad.addColorStop(0, `rgba(45,212,191,${alpha})`);
    grad.addColorStop(0.4, `rgba(45,212,191,${alpha * 0.3})`);
    grad.addColorStop(1, 'rgba(45,212,191,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(d.x, by, d.r * 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(94,234,212,${0.5 + pulse * 0.4})`; ctx.beginPath(); ctx.arc(d.x, by, d.r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < _dots.length; i++) {
    const a = _dots[i];
    for (let j = i + 1; j < _dots.length; j++) {
      const b = _dots[j];
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (dist < 140) {
        ctx.strokeStyle = `rgba(45,212,191,${(1 - dist / 140) * 0.08})`; ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y + Math.sin(t * 0.4 + a.phase) * 12);
        ctx.lineTo(b.x, b.y + Math.sin(t * 0.4 + b.phase) * 12);
        ctx.stroke();
      }
    }
  }
};

export default function ParallaxOcean() {
  const mouse = useMouseParallax();
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(1200px 600px at 80% -10%, rgba(45,212,191,.12), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(94,234,212,.06), transparent 60%), #0D1B2A` }}/>
      <CanvasLayer drawFn={drawBack} speed={1.6} parallax={mouse} intensity={8}  zIndex={1}/>
      <CanvasLayer drawFn={drawGrid} speed={1.0} parallax={mouse} intensity={18} zIndex={2}/>
      <CanvasLayer drawFn={drawDots} speed={0.7} parallax={mouse} intensity={34} zIndex={3}/>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(7,15,26,.55) 100%)' }}/>
    </div>
  );
}
