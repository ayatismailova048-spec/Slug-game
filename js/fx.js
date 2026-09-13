/* ============================================================
   fx.js — частицы и процедурные стихии: огонь, вода, пар,
   пузыри, искры, дым, капли.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------- система частиц ---------------- */
  class Particles {
    constructor(max = 900) { this.list = []; this.max = max; }
    clear() { this.list.length = 0; }
    add(p) {
      if (this.list.length >= this.max) this.list.shift();
      this.list.push(Object.assign({
        x: 0, y: 0, vx: 0, vy: 0, life: 1, age: 0, size: 6,
        grav: 0, drag: 0.99, kind: 'spark', rot: 0, vr: 0,
        col: '#fff', alpha: 1, wind: 0
      }, p));
    }
    emit(n, fn) { for (let i = 0; i < n; i++) this.add(fn(i)); }
    update(dt) {
      const l = this.list;
      for (let i = l.length - 1; i >= 0; i--) {
        const p = l[i];
        p.age += dt;
        if (p.age >= p.life) { l.splice(i, 1); continue; }
        p.vy += p.grav * dt;
        p.vx += (p.wind || 0) * dt;
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
    }
    draw(ctx) {
      for (const p of this.list) {
        const u = p.age / p.life;        // 0..1
        ctx.save();
        switch (p.kind) {
          case 'flame': {
            ctx.globalCompositeOperation = 'lighter';
            const r = p.size * (1 + u * 0.7);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            const a = (1 - u) * p.alpha;
            g.addColorStop(0, `rgba(255,244,200,${a * 0.95})`);
            g.addColorStop(0.35, `rgba(255,170,50,${a * 0.7})`);
            g.addColorStop(0.72, `rgba(216,74,20,${a * 0.35})`);
            g.addColorStop(1, 'rgba(120,20,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, U.TAU); ctx.fill();
            break;
          }
          case 'ember': {
            ctx.globalCompositeOperation = 'lighter';
            const a = (1 - u) * p.alpha;
            const r = p.size * (1 - u * 0.4);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
            g.addColorStop(0, `rgba(255,220,150,${a})`);
            g.addColorStop(0.4, `rgba(255,130,30,${a * 0.5})`);
            g.addColorStop(1, 'rgba(255,80,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, r * 3, 0, U.TAU); ctx.fill();
            ctx.fillStyle = `rgba(255,238,190,${a})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.55, 0, U.TAU); ctx.fill();
            break;
          }
          case 'smoke': {
            const a = Math.sin(u * Math.PI) * p.alpha * 0.55;
            const r = p.size * (0.5 + u * 2.4);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, `rgba(90,90,92,${a})`);
            g.addColorStop(1, 'rgba(90,90,92,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, U.TAU); ctx.fill();
            break;
          }
          case 'steam': {
            const a = Math.sin(u * Math.PI) * p.alpha * 0.5;
            const r = p.size * (0.6 + u * 2.6);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, `rgba(245,250,255,${a})`);
            g.addColorStop(1, 'rgba(235,245,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, U.TAU); ctx.fill();
            break;
          }
          case 'drop': {
            const a = (1 - u * 0.3) * p.alpha;
            ctx.fillStyle = p.col || `rgba(150,215,245,${a})`;
            ctx.globalAlpha = a;
            const stretch = U.clamp(Math.abs(p.vy) / 320, 1, 3.4);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.size * 0.55, p.size * stretch, 0, 0, U.TAU);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.ellipse(p.x - p.size * 0.18, p.y - p.size * 0.3, p.size * 0.16, p.size * 0.3, 0, 0, U.TAU);
            ctx.fill();
            break;
          }
          case 'goo': {
            ctx.globalAlpha = (1 - u) * p.alpha;
            ctx.fillStyle = p.col;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.size, p.size * 1.25, p.rot, 0, U.TAU);
            ctx.fill();
            break;
          }
          case 'bubble': {
            const a = (1 - u) * p.alpha;
            ctx.globalAlpha = a;
            ctx.strokeStyle = p.col || 'rgba(210,255,170,0.9)';
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.arc(p.x - p.size * 0.32, p.y - p.size * 0.32, p.size * 0.22, 0, U.TAU); ctx.fill();
            break;
          }
          case 'frost': {
            const a = (1 - u) * p.alpha;
            ctx.globalAlpha = a;
            ctx.strokeStyle = 'rgba(230,250,255,0.95)';
            ctx.lineWidth = 2;
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            for (let i = 0; i < 3; i++) {
              ctx.rotate(Math.PI / 3);
              ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0); ctx.stroke();
            }
            break;
          }
          case 'crumb': {
            ctx.globalAlpha = (1 - u) * p.alpha;
            ctx.fillStyle = p.col || '#b4671f';
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            U.roundRect(ctx, -p.size / 2, -p.size / 2, p.size, p.size * 0.7, 2);
            ctx.fill();
            break;
          }
          default: { // spark
            ctx.globalAlpha = (1 - u) * p.alpha;
            ctx.fillStyle = p.col;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - u * 0.5), 0, U.TAU); ctx.fill();
          }
        }
        ctx.restore();
      }
    }
  }

  /* ---------------- процедурный огонь ---------------- */
  /**
   * Рисует живой костёр: языки пламени + свечение.
   * intensity 0..1, w — ширина очага, h — высота пламени
   */
  function drawFire(ctx, x, y, w, h, t, intensity = 1, seed = 3, solid = false) {
    if (intensity <= 0.01) return;
    const rnd = U.mulberry32(seed);
    ctx.save();
    if (!solid) ctx.globalCompositeOperation = 'lighter';

    // общее свечение
    const flick = 0.85 + 0.15 * Math.sin(t * 7.3);
    const glow = ctx.createRadialGradient(x, y - h * 0.25, 4, x, y - h * 0.25, w * 1.9);
    if (solid) {
      glow.addColorStop(0, `rgba(255,186,88,${0.22 * intensity * flick})`);
      glow.addColorStop(0.55, `rgba(255,150,50,${0.1 * intensity})`);
      glow.addColorStop(1, 'rgba(255,140,40,0)');
    } else {
      const gp = 0.30 * intensity * flick;
      glow.addColorStop(0, `rgba(255,170,60,${gp})`);
      glow.addColorStop(0.5, `rgba(255,110,20,${gp * 0.35})`);
      glow.addColorStop(1, 'rgba(255,80,0,0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.ellipse(x, y - h * 0.25, w * 1.9, h * 1.1, 0, 0, U.TAU); ctx.fill();

    const tongues = 9;
    for (let i = 0; i < tongues; i++) {
      const ph = rnd() * 10;
      const sp = 0.9 + rnd() * 1.5;
      const ox = (rnd() * 2 - 1) * w * 0.52;
      const fl = Math.sin(t * sp * 3 + ph);
      const fl2 = Math.sin(t * sp * 5.7 + ph * 2);
      const hh = h * (0.45 + rnd() * 0.75) * intensity * (0.82 + 0.18 * fl);
      const ww = w * (0.16 + rnd() * 0.26) * (0.85 + 0.15 * fl2);
      const lean = fl * w * 0.14 + fl2 * w * 0.05;

      ctx.beginPath();
      ctx.moveTo(x + ox - ww, y);
      ctx.bezierCurveTo(
        x + ox - ww * 1.1, y - hh * 0.45,
        x + ox - ww * 0.35 + lean, y - hh * 0.75,
        x + ox + lean * 1.4, y - hh
      );
      ctx.bezierCurveTo(
        x + ox + ww * 0.35 + lean, y - hh * 0.75,
        x + ox + ww * 1.1, y - hh * 0.45,
        x + ox + ww, y
      );
      ctx.closePath();
      const fg = ctx.createLinearGradient(x + ox, y, x + ox, y - hh);
      if (solid) {
        fg.addColorStop(0, `rgba(255,232,150,${0.95 * intensity})`);
        fg.addColorStop(0.24, `rgba(255,186,52,${0.88 * intensity})`);
        fg.addColorStop(0.62, `rgba(236,110,26,${0.62 * intensity})`);
        fg.addColorStop(1, 'rgba(214,66,14,0)');
      } else {
        fg.addColorStop(0, `rgba(255,226,150,${0.34 * intensity})`);
        fg.addColorStop(0.25, `rgba(255,168,48,${0.34 * intensity})`);
        fg.addColorStop(0.65, `rgba(226,90,22,${0.26 * intensity})`);
        fg.addColorStop(1, 'rgba(180,40,10,0)');
      }
      ctx.fillStyle = fg;
      ctx.fill();

      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(x + ox - ww * 0.42, y);
        ctx.quadraticCurveTo(x + ox + lean * 0.5, y - hh * 0.52, x + ox + lean * 0.8, y - hh * 0.62);
        ctx.quadraticCurveTo(x + ox + ww * 0.3 + lean * 0.5, y - hh * 0.5, x + ox + ww * 0.42, y);
        ctx.closePath();
        const cg = ctx.createLinearGradient(x + ox, y, x + ox, y - hh * 0.62);
        cg.addColorStop(0, solid ? `rgba(255,250,225,${0.85 * intensity})` : `rgba(255,250,215,${0.30 * intensity})`);
        cg.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = cg;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Струя воды сверху вниз */
  function drawWaterStream(ctx, x, yTop, yBot, w, t, alpha = 1, seed = 11) {
    const rnd = U.mulberry32(seed);
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, 'rgba(150,215,245,0.06)');
    g.addColorStop(0.35, 'rgba(180,230,252,0.34)');
    g.addColorStop(0.65, 'rgba(210,242,255,0.42)');
    g.addColorStop(1, 'rgba(150,215,245,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, yTop, w, yBot - yTop);

    ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const px = x + (rnd() * 2 - 1) * w * 0.47;
      const speed = 420 + rnd() * 620;
      const len = 26 + rnd() * 80;
      const off = ((t * speed + rnd() * 1200) % (yBot - yTop + len));
      const py = yTop + off - len;
      ctx.strokeStyle = `rgba(255,255,255,${0.22 + rnd() * 0.4})`;
      ctx.lineWidth = 1.4 + rnd() * 3;
      ctx.beginPath();
      ctx.moveTo(px, Math.max(yTop, py));
      ctx.lineTo(px + 1.5, Math.min(yBot, py + len));
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Поверхность жидкости с волной */
  function drawLiquidSurface(ctx, x, y, w, t, col1, col2, amp = 5, freq = 0.02) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + 400);
    ctx.lineTo(x - w / 2, y);
    for (let px = -w / 2; px <= w / 2; px += 6) {
      const yy = y + Math.sin(px * freq + t * 2.2) * amp + Math.sin(px * freq * 2.7 - t * 3.1) * amp * 0.4;
      ctx.lineTo(x + px, yy);
    }
    ctx.lineTo(x + w / 2, y + 400);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - 20, 0, y + 300);
    g.addColorStop(0, col1);
    g.addColorStop(1, col2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  global.FX = { Particles, drawFire, drawWaterStream, drawLiquidSurface };
})(window);
