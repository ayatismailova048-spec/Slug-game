/* ============================================================
   util.js — математика, шум, цвет, рисование форм
   ============================================================ */
(function (global) {
  'use strict';

  const U = {};

  U.TAU = Math.PI * 2;

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.inv = (a, b, v) => (b - a === 0 ? 0 : (v - a) / (b - a));
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.smoothstep = (a, b, v) => U.smooth(U.clamp(U.inv(a, b, v), 0, 1));
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;

  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeInCubic = (t) => t * t * t;
  U.easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  U.easeOutElastic = (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  };

  /* --- детерминированный генератор --- */
  U.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* --- значение-шум (1D и 2D), сглаженный --- */
  const hash2 = (x, y, s) => {
    let h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
    return h - Math.floor(h);
  };
  U.noise2 = function (x, y, seed = 0) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = U.smooth(x - xi), yf = U.smooth(y - yi);
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
    const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return U.lerp(U.lerp(a, b, xf), U.lerp(c, d, yf), yf === undefined ? 0 : yf);
  };
  U.fbm = function (x, y, seed = 0, oct = 3) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += amp * U.noise2(x * f, y * f, seed + i * 13); f *= 2; amp *= 0.5; }
    return v;
  };

  /* --- цвет --- */
  U.hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  U.rgba = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  U.mixHsl = (c1, c2, t) => ({
    h: U.lerp(c1.h, c2.h, t), s: U.lerp(c1.s, c2.s, t), l: U.lerp(c1.l, c2.l, t)
  });
  U.colStr = (c, a = 1) => U.hsl(c.h, c.s, c.l, a);
  U.shade = (c, dl, ds = 0) => ({ h: c.h, s: U.clamp(c.s + ds, 0, 100), l: U.clamp(c.l + dl, 0, 100) });

  /* --- формы --- */
  U.roundRect = function (ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  /**
   * Гармонический «блоб» — замкнутая волнистая форма.
   * harm: массив {k, amp, phase, speed}
   */
  U.blobPoints = function (cx, cy, rx, ry, harm, t, steps = 72, squashBottom = 1) {
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * U.TAU;
      let r = 1;
      for (const h of harm) r += h.amp * Math.sin(h.k * a + h.phase + h.speed * t);
      let x = Math.cos(a) * rx * r;
      let y = Math.sin(a) * ry * r;
      if (y > 0) y *= squashBottom;
      pts.push([cx + x, cy + y]);
    }
    return pts;
  };

  /** Плавный замкнутый путь через точки (кардинальный сплайн через середины) */
  U.smoothPath = function (ctx, pts) {
    if (pts.length < 3) return;
    ctx.beginPath();
    let p0 = pts[pts.length - 1], p1 = pts[0];
    ctx.moveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    for (let i = 0; i < pts.length; i++) {
      const cur = pts[i], nxt = pts[(i + 1) % pts.length];
      ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
    }
    ctx.closePath();
  };

  U.makeHarmonics = function (seed, count = 4, strength = 0.05) {
    const rnd = U.mulberry32(seed);
    const h = [];
    for (let i = 0; i < count; i++) {
      h.push({
        k: 2 + i,
        amp: strength * (1 - i * 0.16) * (0.5 + rnd()),
        phase: rnd() * U.TAU,
        speed: 0.6 + rnd() * 1.2
      });
    }
    return h;
  };

  /* --- текст --- */
  U.text = function (ctx, str, x, y, opt = {}) {
    const {
      size = 24, weight = 700, align = 'center', base = 'middle',
      color = '#fff', stroke = null, strokeW = 4, font = U.FONT, alpha = 1, maxWidth
    } = opt;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    if (stroke) {
      ctx.lineWidth = strokeW; ctx.strokeStyle = stroke;
      ctx.lineJoin = 'round'; ctx.miterLimit = 2;
      ctx.strokeText(str, x, y, maxWidth);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y, maxWidth);
    ctx.restore();
  };
  U.FONT = '"Nunito","Trebuchet MS","Segoe UI",system-ui,sans-serif';

  U.shadowOn = function (ctx, blur, color, ox = 0, oy = 0) {
    ctx.shadowBlur = blur; ctx.shadowColor = color;
    ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy;
  };
  U.shadowOff = function (ctx) {
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  };

  U.pointInPoly = function (x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  global.U = U;
})(window);
