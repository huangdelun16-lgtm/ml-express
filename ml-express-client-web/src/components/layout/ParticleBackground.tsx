import React, { useEffect, useRef } from 'react';

export type ParticleBackgroundProps = {
  /** 粒子数量，小屏会按面积自动下调。默认 100 */
  particleCount?: number;
  /** 连线最大距离（CSS 像素）。默认 120 */
  maxDistance?: number;
  /** 漂移速度倍率。默认 0.45（极缓慢） */
  speed?: number;
  /** 粒子双色：科技蓝 / 品牌橙 */
  particleColors?: [string, string];
  /** 连线基色（未指定则按两端粒子混色） */
  lineColor?: string;
  /** 画布底色；`transparent` 可叠在现有 CSS 渐变上 */
  background?: string;
  /** 鼠标影响半径。默认 150 */
  mouseRadius?: number;
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: 0 | 1;
};

type Packet = {
  a: number;
  b: number;
  t: number;
  speed: number;
  c: 0 | 1;
};

type Rgb = [number, number, number];

const DEFAULT_COLORS: [string, string] = ['#3b82f6', '#f97316'];

/**
 * Market Link Express — 科技感粒子连线背景（纯 Canvas，无第三方库）。
 *
 * 主题：Express（速度）× Link（连接）——点与线隐喻城市物流网络。
 *
 * 用法（CRA / React Router，本仓库首页已通过 DeliveryAmbientBackground 接入）：
 * ```tsx
 * import ParticleBackground from './components/layout/ParticleBackground';
 *
 * <ParticleBackground />
 * <ParticleBackground background="transparent" particleCount={100} maxDistance={120} />
 * ```
 */
const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 100,
  maxDistance = 120,
  speed = 0.45,
  particleColors = DEFAULT_COLORS,
  lineColor,
  background = 'transparent',
  mouseRadius = 150,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const colors: [Rgb, Rgb] = [hexToRgb(particleColors[0]), hexToRgb(particleColors[1])];
    const lineRgb = lineColor ? hexToRgb(lineColor) : null;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;
    const mouse = { x: 0, y: 0, on: false };
    const particles: Particle[] = [];
    const packets: Packet[] = [];
    let resizeTimer = 0;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targetCount = () => {
      const area = Math.max(1, width * height);
      const scale = Math.min(1, area / (1280 * 720));
      return Math.max(36, Math.round(particleCount * scale));
    };

    const seedParticles = (count: number) => {
      particles.length = 0;
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const mag = (0.25 + Math.random() * 0.55) * speed;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag,
          r: 1.1 + Math.random() * 1.1,
          c: Math.random() < 0.72 ? 0 : 1,
        });
      }
      packets.length = 0;
      const n = Math.min(18, Math.max(8, Math.floor(count / 8)));
      for (let i = 0; i < n; i += 1) {
        packets.push({
          a: 0,
          b: 1,
          t: Math.random(),
          speed: 0.004 + Math.random() * 0.006,
          c: Math.random() < 0.65 ? 0 : 1,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const next = targetCount();
      if (particles.length === 0) {
        seedParticles(next);
      } else if (particles.length !== next) {
        seedParticles(next);
      } else {
        for (const p of particles) {
          p.x = Math.min(width, Math.max(0, p.x));
          p.y = Math.min(height, Math.max(0, p.y));
        }
      }
    };

    const pickPacketPair = (pack: Packet) => {
      const n = particles.length;
      if (n < 2) return;
      for (let tries = 0; tries < 12; tries += 1) {
        const a = (Math.random() * n) | 0;
        let b = (Math.random() * n) | 0;
        if (a === b) b = (a + 1) % n;
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        if (dx * dx + dy * dy < maxDistance * maxDistance) {
          pack.a = a;
          pack.b = b;
          pack.t = 0;
          return;
        }
      }
      pack.a = 0;
      pack.b = Math.min(1, n - 1);
      pack.t = 0;
    };

    const draw = () => {
      if (!running) return;

      if (background === 'transparent') {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }

      const n = particles.length;
      const maxD2 = maxDistance * maxDistance;
      const mouseR2 = mouseRadius * mouseRadius;

      for (let i = 0; i < n; i += 1) {
        const p = particles[i];
        if (mouse.on) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const md2 = mdx * mdx + mdy * mdy;
          if (md2 < mouseR2 && md2 > 16) {
            const md = Math.sqrt(md2);
            const pull = (1 - md / mouseRadius) * 0.028;
            p.vx += (mdx / md) * pull;
            p.vy += (mdy / md) * pull;
          }
        }
        p.vx *= 0.995;
        p.vy *= 0.995;
        const sp2 = p.vx * p.vx + p.vy * p.vy;
        const cap = speed * 1.8;
        if (sp2 > cap * cap) {
          const s = Math.sqrt(sp2);
          p.vx = (p.vx / s) * cap;
          p.vy = (p.vy / s) * cap;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -8) p.x = width + 8;
        else if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8;
        else if (p.y > height + 8) p.y = -8;
      }

      ctx.lineWidth = 0.85;
      for (let i = 0; i < n; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < n; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxD2) continue;
          const t = 1 - Math.sqrt(d2) / maxDistance;
          const alpha = 0.1 + t * 0.2;
          const rgb =
            lineRgb ?? mixRgb(colors[a.c], colors[b.c], a.c === b.c ? 0 : 0.5);
          ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        if (mouse.on) {
          const mdx = mouse.x - a.x;
          const mdy = mouse.y - a.y;
          const md2 = mdx * mdx + mdy * mdy;
          if (md2 < mouseR2) {
            const t = 1 - Math.sqrt(md2) / mouseRadius;
            const rgb = colors[a.c];
            ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(0.16 + t * 0.28).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      for (const pack of packets) {
        pack.t += pack.speed;
        if (pack.t > 1) pickPacketPair(pack);
        const a = particles[pack.a];
        const b = particles[pack.b];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * pack.t;
        const y = a.y + (b.y - a.y) * pack.t;
        const rgb = colors[pack.c];
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.22)`;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.9)`;
        ctx.beginPath();
        ctx.arc(x, y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of particles) {
        const rgb = colors[p.c];
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.16)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.88)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) raf = window.requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.on = true;
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) mouse.on = false;
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 160);
    };
    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      if (!reduced && running && raf === 0) raf = window.requestAnimationFrame(draw);
    };

    resize();
    if (reduced) {
      draw();
    } else {
      raf = window.requestAnimationFrame(draw);
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [particleCount, maxDistance, speed, particleColors[0], particleColors[1], lineColor, background, mouseRadius]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
};

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [59, 130, 246];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export default ParticleBackground;
