/* ============================================================
   ui.js — кнопки, тумблеры, вентили, ползунки, панели
   ============================================================ */
(function (global) {
  'use strict';

  const PAL = {
    ink: '#1d2a24',
    paper: '#f3f7f2',
    mint: '#3fbf8f',
    mintDark: '#248f68',
    red: '#e2574c',
    redDark: '#b03a32',
    blue: '#4aa3e0',
    blueDark: '#2b6f9e',
    amber: '#f0a92e',
    amberDark: '#c07c10',
    violet: '#8b5cd6',
    slate: '#546b63',
    glass: 'rgba(255,255,255,0.14)'
  };

  class Btn {
    constructor(o) {
      Object.assign(this, {
        x: 0, y: 0, w: 200, h: 62, label: '', sub: '', icon: null,
        color: PAL.mint, dark: PAL.mintDark, textColor: '#fff',
        radius: 16, font: 22, enabled: true, visible: true, onClick: null,
        hover: 0, press: 0, pulse: false, tag: null
      }, o);
    }
    hit(p) {
      return this.visible && p && p.x >= this.x && p.x <= this.x + this.w &&
        p.y >= this.y && p.y <= this.y + this.h;
    }
    update(dt, p, pressed) {
      const h = this.enabled && this.hit(p) ? 1 : 0;
      this.hover += (h - this.hover) * Math.min(1, dt * 14);
      const pr = h && pressed ? 1 : 0;
      this.press += (pr - this.press) * Math.min(1, dt * 22);
    }
    draw(ctx, t) {
      if (!this.visible) return;
      const lift = this.hover * 3 - this.press * 5;
      const x = this.x, y = this.y - lift, w = this.w, h = this.h;
      ctx.save();
      if (!this.enabled) ctx.globalAlpha = 0.45;
      // тень
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      U.roundRect(ctx, x + 2, y + 6 + this.press * 2, w - 4, h, this.radius);
      ctx.fill();
      // «подошва»
      ctx.fillStyle = this.dark;
      U.roundRect(ctx, x, y + 6, w, h, this.radius);
      ctx.fill();
      // верх
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, this.color);
      g.addColorStop(1, this.dark);
      ctx.fillStyle = g;
      U.roundRect(ctx, x, y, w, h, this.radius);
      ctx.fill();
      // блик
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      U.roundRect(ctx, x + 6, y + 5, w - 12, h * 0.4, this.radius * 0.7);
      ctx.fill();
      if (this.pulse && this.enabled) {
        const a = 0.35 + 0.35 * Math.sin(t * 5);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 3;
        U.roundRect(ctx, x + 2, y + 2, w - 4, h - 4, this.radius - 2);
        ctx.stroke();
      }
      const cy = y + h / 2 + (this.sub ? -8 : 0);
      let tx = x + w / 2;
      if (this.icon) {
        U.text(ctx, this.icon, x + 22, y + h / 2, { size: this.font * 1.1, align: 'left', color: this.textColor });
        tx += 12;
      }
      U.text(ctx, this.label, tx, cy, {
        size: this.font, color: this.textColor, weight: 800,
        stroke: 'rgba(0,0,0,0.18)', strokeW: 3, maxWidth: w - 26
      });
      if (this.sub) {
        U.text(ctx, this.sub, tx, y + h / 2 + 14, {
          size: this.font * 0.62, color: 'rgba(255,255,255,0.85)', weight: 700, maxWidth: w - 26
        });
      }
      ctx.restore();
    }
  }

  /** Панель-подсказка «что делать дальше» */
  function hintBar(ctx, text, x, y, w, t, tone = PAL.mint) {
    ctx.save();
    const h = 56;
    ctx.fillStyle = 'rgba(16,26,22,0.82)';
    U.roundRect(ctx, x - w / 2, y, w, h, 14); ctx.fill();
    ctx.fillStyle = tone;
    U.roundRect(ctx, x - w / 2, y, 8, h, 4); ctx.fill();
    const pulse = 0.75 + 0.25 * Math.sin(t * 3);
    U.text(ctx, text, x + 6, y + h / 2, {
      size: 21, color: `rgba(255,255,255,${pulse})`, weight: 700, maxWidth: w - 40
    });
    ctx.restore();
  }

  function panel(ctx, x, y, w, h, r = 20, fill = 'rgba(255,255,255,0.92)', shadow = true) {
    ctx.save();
    if (shadow) { U.shadowOn(ctx, 28, 'rgba(0,0,0,0.28)', 0, 10); }
    ctx.fillStyle = fill;
    U.roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  }

  function progress(ctx, x, y, w, h, v, col = PAL.mint, label = '', bg = 'rgba(0,0,0,0.35)') {
    ctx.save();
    ctx.fillStyle = bg;
    U.roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    const vv = U.clamp(v, 0, 1);
    if (vv > 0.004) {
      ctx.save();
      U.roundRect(ctx, x, y, w, h, h / 2); ctx.clip();
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, col);
      g.addColorStop(1, '#ffffff');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.95;
      U.roundRect(ctx, x, y, w * vv, h, h / 2); ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
    U.roundRect(ctx, x, y, w, h, h / 2); ctx.stroke();
    if (label) U.text(ctx, label, x + w / 2, y + h / 2, { size: h * 0.62, color: '#fff', stroke: 'rgba(0,0,0,0.4)', strokeW: 3 });
    ctx.restore();
  }

  /** Круглая ручка-вентиль. value 0..1, возвращает угол */
  function knob(ctx, x, y, r, value, t, col = '#cfd8d3', hot = false) {
    ctx.save();
    U.shadowOn(ctx, 16, 'rgba(0,0,0,0.35)', 0, 6);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, col);
    g.addColorStop(1, '#8b968f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.fill();
    U.shadowOff(ctx);
    // насечки
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * U.TAU;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82);
      ctx.lineTo(x + Math.cos(a) * r * 0.96, y + Math.sin(a) * r * 0.96);
      ctx.stroke();
    }
    // указатель
    const ang = -Math.PI * 0.75 + value * Math.PI * 1.5;
    ctx.strokeStyle = hot ? '#e2574c' : '#2b3a33';
    ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * r * 0.15, y + Math.sin(ang) * r * 0.15);
    ctx.lineTo(x + Math.cos(ang) * r * 0.72, y + Math.sin(ang) * r * 0.72);
    ctx.stroke();
    ctx.restore();
    return ang;
  }

  /** Рычаг: вертикальный слайдер */
  function lever(ctx, x, yTop, yBot, value, label) {
    ctx.save();
    ctx.strokeStyle = '#4a5a52'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yBot); ctx.stroke();
    ctx.strokeStyle = '#7d8d85'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yBot); ctx.stroke();
    const y = U.lerp(yTop, yBot, value);
    U.shadowOn(ctx, 12, 'rgba(0,0,0,0.4)', 0, 4);
    const g = ctx.createLinearGradient(x - 34, y - 18, x + 34, y + 18);
    g.addColorStop(0, '#e8524a'); g.addColorStop(1, '#a32f28');
    ctx.fillStyle = g;
    U.roundRect(ctx, x - 34, y - 18, 68, 36, 12); ctx.fill();
    U.shadowOff(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    U.roundRect(ctx, x - 28, y - 13, 56, 12, 6); ctx.fill();
    if (label) U.text(ctx, label, x, y, { size: 15, color: '#fff', weight: 800 });
    ctx.restore();
  }

  function chip(ctx, x, y, label, color, size = 16) {
    ctx.save();
    ctx.font = `700 ${size}px ${U.FONT}`;
    const w = ctx.measureText(label).width + size + 8;
    const h = size + 12;
    ctx.fillStyle = color;
    U.roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    U.roundRect(ctx, x + 3, y + 2, w - 6, h * 0.38, 5); ctx.fill();
    U.text(ctx, label, x + w / 2, y + h / 2, { size, color: '#fff', weight: 800, stroke: 'rgba(0,0,0,0.25)', strokeW: 2.5 });
    ctx.restore();
    return w;
  }

  global.UI = { Btn, PAL, hintBar, panel, progress, knob, lever, chip };
})(window);
