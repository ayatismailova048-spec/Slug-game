/* ============================================================
   slugArt.js — отрисовка слизня со всеми слоями эффектов.
   Тело рисуется в offscreen-буфер, чтобы «дыры» от кислоты
   вырезались из самого слизня, а не из фона.
   ============================================================ */
(function (global) {
  'use strict';

  const BOX = 560;          // логический размер буфера
  const CX = BOX / 2, CY = BOX * 0.60;
  const RX = 150, RY = 102; // базовые радиусы тела

  let buf = null, bctx = null, bufScale = 0;

  function ensureBuf(scale) {
    // квантуем масштаб буфера, чтобы не пересоздавать холст каждый кадр
    const s = U.clamp(Math.ceil(scale / 0.5) * 0.5, 1, 3);
    if (!buf) { buf = document.createElement('canvas'); bctx = buf.getContext('2d'); }
    if (Math.abs(s - bufScale) > 0.001) {
      bufScale = s;
      buf.width = Math.ceil(BOX * s);
      buf.height = Math.ceil(BOX * s);
    }
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, buf.width, buf.height);
    bctx.scale(bufScale, bufScale);
    return bctx;
  }

  /* ---------- цвет тела с учётом эффектов ---------- */
  function bodyColor(slug) {
    const f = slug.fx;
    let c = { ...slug.color };
    if (f.fried > 0) c = U.mixHsl(c, { h: 26, s: 64, l: 40 }, U.clamp(f.fried * 0.75, 0, 0.8));
    if (f.burns > 0) c = U.mixHsl(c, { h: 20, s: 30, l: 20 }, U.clamp(f.burns * 0.55, 0, 0.7));
    if (f.soot > 0) c = U.mixHsl(c, { h: 30, s: 8, l: 18 }, U.clamp(f.soot * 0.35, 0, 0.45));
    if (f.frozen > 0) c = U.mixHsl(c, { h: 196, s: 46, l: 68 }, U.clamp(f.frozen * 0.55, 0, 0.6));
    if (f.melt > 0) c = U.mixHsl(c, { h: 88, s: 70, l: 46 }, U.clamp(f.melt * 0.4, 0, 0.45));
    if (!slug.alive) c = U.mixHsl(c, { h: 100, s: 10, l: 42 }, 0.45);
    return c;
  }

  /* ---------- силуэт ---------- */
  function bodyPts(slug, t, squash) {
    const f = slug.fx;
    const harm = U.makeHarmonics(slug.seed, 4, 0.035 + f.blended * 0.13 + f.melt * 0.05);
    const rx = RX * (1 + f.blended * 0.10) * (1 / squash);
    const ry = RY * squash * (1 - f.melt * 0.16);
    return U.blobPoints(0, 0, rx, ry, harm, t, 84, 0.86);
  }

  /* ---------- слои ---------- */

  function layerBase(g, slug, t, pts) {
    const c = bodyColor(slug);
    const f = slug.fx;

    // основная заливка — мягкий градиент «сверху свет»
    const grad = g.createRadialGradient(-RX * 0.35, -RY * 0.75, RY * 0.1, 0, 0, RX * 1.25);
    grad.addColorStop(0, U.colStr(U.shade(c, 22, -6)));
    grad.addColorStop(0.45, U.colStr(c));
    grad.addColorStop(1, U.colStr(U.shade(c, -20, 6)));
    g.fillStyle = grad;
    U.smoothPath(g, pts);
    g.fill();

    // подповерхностное свечение (желе)
    g.save();
    g.globalCompositeOperation = 'lighter';
    const sub = g.createRadialGradient(RX * 0.2, RY * 0.35, 6, RX * 0.1, RY * 0.2, RX * 0.95);
    sub.addColorStop(0, U.colStr(U.shade(c, 26, 10), 0.40));
    sub.addColorStop(1, U.colStr(c, 0));
    g.fillStyle = sub;
    g.fillRect(-RX * 1.4, -RY * 1.6, RX * 2.8, RY * 3.2);
    g.restore();

    // глянцевый ободок по краю (виден только внутренний край)
    U.smoothPath(g, pts);
    g.strokeStyle = `rgba(255,255,255,${0.16 + f.wet * 0.2})`;
    g.lineWidth = 11;
    g.stroke();

    // светлая «нога» вдоль низа
    const foot = g.createLinearGradient(0, RY * 0.34, 0, RY * 0.95);
    foot.addColorStop(0, U.colStr(U.shade(c, 16, -12), 0));
    foot.addColorStop(1, U.colStr(U.shade(c, 16, -12), 0.55));
    g.fillStyle = foot;
    g.fillRect(-RX * 1.4, -RY * 1.4, RX * 2.8, RY * 2.8);

    // внутренняя тень по нижнему краю
    const sh = g.createLinearGradient(0, RY * 0.1, 0, RY * 1.0);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.30)');
    g.fillStyle = sh;
    g.fillRect(-RX * 1.4, -RY * 1.4, RX * 2.8, RY * 2.8);

    // крапинки-текстура
    const rnd = U.mulberry32(slug.seed + 7);
    g.globalAlpha = 0.16 * (1 - f.fried * 0.6);
    for (let i = 0; i < 46; i++) {
      const a = rnd() * U.TAU, r = Math.sqrt(rnd()) * 0.92;
      const x = Math.cos(a) * RX * r, y = Math.sin(a) * RY * r * 0.9;
      const rr = 2 + rnd() * 5;
      g.fillStyle = U.colStr(U.shade(c, -16, 8));
      g.beginPath(); g.ellipse(x, y, rr, rr * 0.8, rnd() * 3, 0, U.TAU); g.fill();
    }
    g.globalAlpha = 1;

    // блик сверху
    g.save();
    const hl = g.createRadialGradient(-RX * 0.30, -RY * 0.62, 2, -RX * 0.30, -RY * 0.62, RX * 0.62);
    hl.addColorStop(0, `rgba(255,255,255,${0.42 + f.wet * 0.35 - f.fried * 0.15})`);
    hl.addColorStop(0.55, 'rgba(255,255,255,0.09)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    g.beginPath(); g.ellipse(-RX * 0.30, -RY * 0.60, RX * 0.52, RY * 0.42, -0.25, 0, U.TAU); g.fill();
    g.restore();
  }

  function layerPills(g, slug, t) {
    if (!slug.pills.length) return;
    const rnd = U.mulberry32(slug.seed + 31);
    slug.pills.forEach((key, idx) => {
      const p = SlugModel.PILLS[key];
      const col = p.col;
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + idx * 1.3);
      const n = 7;
      g.save();
      g.globalAlpha = 0.85;
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = (i / n) * U.TAU + idx * 0.7 + rnd() * 0.4;
        const len = 0.55 + rnd() * 0.45;
        g.beginPath();
        g.moveTo(Math.cos(a) * 8, Math.sin(a) * 6);
        const steps = 4;
        let px = 0, py = 0;
        for (let s = 1; s <= steps; s++) {
          const rr = (s / steps) * len;
          const wob = Math.sin(t * 1.6 + s + i) * 0.16;
          px = Math.cos(a + wob) * RX * rr;
          py = Math.sin(a + wob) * RY * rr * 0.92;
          g.lineTo(px, py);
        }
        g.lineWidth = 7 - i * 0.3;
        g.strokeStyle = U.colStr(U.shade(col, -6), 0.55);
        g.stroke();
        g.lineWidth = 3.2;
        g.strokeStyle = U.colStr(U.shade(col, 16), 0.9 * pulse);
        g.stroke();
      }
      // мягкое свечение из центра
      const gl = g.createRadialGradient(0, 0, 4, 0, 0, RX * 0.7);
      gl.addColorStop(0, U.colStr(U.shade(col, 20), 0.30 * pulse));
      gl.addColorStop(1, U.colStr(col, 0));
      g.fillStyle = gl;
      g.fillRect(-RX * 1.3, -RY * 1.5, RX * 2.6, RY * 3);
      g.restore();
    });
  }

  function layerFried(g, slug, t) {
    const f = slug.fx;
    if (f.fried <= 0.02) return;
    const a = U.clamp(f.fried, 0, 1);
    // жареная корочка снизу
    const gr = g.createLinearGradient(0, -RY * 0.2, 0, RY);
    gr.addColorStop(0, 'rgba(190,92,26,0)');
    gr.addColorStop(0.5, `rgba(176,84,24,${0.35 * a})`);
    gr.addColorStop(1, `rgba(92,44,12,${0.78 * a})`);
    g.fillStyle = gr;
    g.fillRect(-RX * 1.4, -RY * 1.4, RX * 2.8, RY * 2.8);

    // полосы от решётки / сковороды
    if (f.crust > 0.15) {
      g.save();
      g.globalAlpha = U.clamp(f.crust, 0, 1) * 0.75;
      g.strokeStyle = '#4b2409';
      g.lineCap = 'round';
      const rnd = U.mulberry32(slug.seed + 55);
      for (let i = 0; i < 6; i++) {
        const x = -RX * 0.75 + i * (RX * 0.3) + rnd() * 8;
        g.lineWidth = 8 + rnd() * 5;
        g.beginPath();
        g.moveTo(x, -RY * 0.55 + rnd() * 10);
        g.quadraticCurveTo(x + 6, 0, x - 4, RY * 0.72);
        g.stroke();
      }
      g.restore();
      // хрустящие искорки
      g.save();
      g.globalAlpha = 0.5 * a;
      const rnd2 = U.mulberry32(slug.seed + 91);
      for (let i = 0; i < 28; i++) {
        const x = (rnd2() * 2 - 1) * RX * 0.85, y = (rnd2() * 2 - 1) * RY * 0.8;
        g.fillStyle = rnd2() > 0.5 ? '#efb972' : '#d99247';
        g.beginPath(); g.arc(x, y, 1.6 + rnd2() * 2.4, 0, U.TAU); g.fill();
      }
      g.restore();
    }
  }

  function layerBurns(g, slug, t) {
    const f = slug.fx;
    if (f.burns <= 0.02) return;
    const rnd = U.mulberry32(slug.seed + 13);
    const n = Math.round(3 + f.burns * 9);
    g.save();
    for (let i = 0; i < n; i++) {
      const a = rnd() * U.TAU, r = Math.sqrt(rnd()) * 0.85;
      const x = Math.cos(a) * RX * r, y = Math.sin(a) * RY * r * 0.95;
      const sz = (14 + rnd() * 30) * (0.5 + f.burns * 0.8);
      // обугленное пятно
      const harm = U.makeHarmonics((slug.seed + i * 17) | 0, 3, 0.3);
      const pts = U.blobPoints(x, y, sz, sz * 0.78, harm, i, 26, 1);
      U.smoothPath(g, pts);
      const cg = g.createRadialGradient(x, y, 2, x, y, sz * 1.1);
      cg.addColorStop(0, `rgba(24,16,10,${0.85 * f.burns})`);
      cg.addColorStop(0.62, `rgba(58,30,12,${0.7 * f.burns})`);
      cg.addColorStop(1, `rgba(150,60,14,0)`);
      g.fillStyle = cg;
      g.fill();
      // раскалённый край
      g.globalAlpha = 0.45 * f.burns * (0.6 + 0.4 * Math.sin(t * 3 + i));
      g.strokeStyle = '#ff8a2b'; g.lineWidth = 2.4;
      g.stroke();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  function layerBlisters(g, slug, t) {
    const f = slug.fx;
    if (f.blisters <= 0.05) return;
    const rnd = U.mulberry32(slug.seed + 23);
    const n = Math.round(2 + f.blisters * 10);
    for (let i = 0; i < n; i++) {
      const a = rnd() * U.TAU, r = Math.sqrt(rnd()) * 0.82;
      const x = Math.cos(a) * RX * r, y = Math.sin(a) * RY * r * 0.9;
      const breathe = 1 + 0.07 * Math.sin(t * 2.4 + i * 1.7);
      const rr = (7 + rnd() * 13) * breathe;
      const bg = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, 1, x, y, rr);
      bg.addColorStop(0, 'rgba(255,238,226,0.95)');
      bg.addColorStop(0.6, 'rgba(240,196,170,0.85)');
      bg.addColorStop(1, 'rgba(206,140,110,0.75)');
      g.fillStyle = bg;
      g.beginPath(); g.ellipse(x, y, rr, rr * 0.82, 0, 0, U.TAU); g.fill();
      g.strokeStyle = 'rgba(150,70,46,0.5)'; g.lineWidth = 1.4; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.ellipse(x - rr * 0.28, y - rr * 0.34, rr * 0.24, rr * 0.16, -0.5, 0, U.TAU); g.fill();
    }
  }

  function layerWounds(g, slug, t) {
    const f = slug.fx;
    if (f.wounds <= 0.03) return;
    const rnd = U.mulberry32(slug.seed + 41);
    const n = Math.round(3 + f.wounds * 14);
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = rnd() * U.TAU, r = Math.sqrt(rnd()) * 0.86;
      const x = Math.cos(a) * RX * r, y = Math.sin(a) * RY * r * 0.92;
      const ang = rnd() * U.TAU;
      const len = 12 + rnd() * 34;
      const dx = Math.cos(ang) * len * 0.5, dy = Math.sin(ang) * len * 0.5;
      // тёмный разрез
      g.lineWidth = 7 + rnd() * 4;
      g.strokeStyle = 'rgba(96,10,14,0.9)';
      g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x + dx, y + dy); g.stroke();
      // яркая кровь
      g.lineWidth = 3.4;
      g.strokeStyle = '#e23b32';
      g.beginPath(); g.moveTo(x - dx * 0.9, y - dy * 0.9); g.lineTo(x + dx * 0.9, y + dy * 0.9); g.stroke();
      // «швы» крест-накрест
      if (rnd() > 0.55) {
        g.lineWidth = 2.4; g.strokeStyle = 'rgba(240,120,110,0.9)';
        for (let s = -1; s <= 1; s++) {
          const px = x + dx * s * 0.55, py = y + dy * s * 0.55;
          const nx = -Math.sin(ang) * 7, ny = Math.cos(ang) * 7;
          g.beginPath(); g.moveTo(px - nx, py - ny); g.lineTo(px + nx, py + ny); g.stroke();
        }
      }
      // подтёк вниз
      if (rnd() > 0.45) {
        const dl = 10 + rnd() * 34 * f.wounds;
        const drip = 0.5 + 0.5 * Math.sin(t * 1.1 + i);
        g.strokeStyle = 'rgba(178,22,24,0.8)';
        g.lineWidth = 3 + rnd() * 2;
        g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + 3, y + dl * 0.6, x + 1, y + dl * drip);
        g.stroke();
      }
    }
    g.restore();
  }

  /** дыры от кислоты — вырезаются из буфера */
  function layerAcidHoles(g, slug, t) {
    const f = slug.fx;
    if (f.melt <= 0.05) return;
    const rnd = U.mulberry32(slug.seed + 67);
    const n = Math.round(2 + f.melt * 7);
    g.save();
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < n; i++) {
      const a = rnd() * U.TAU, r = Math.sqrt(rnd()) * 0.7;
      const x = Math.cos(a) * RX * r, y = Math.sin(a) * RY * r * 0.85;
      const sz = (10 + rnd() * 26) * f.melt;
      const harm = U.makeHarmonics((slug.seed + i * 29) | 0, 3, 0.35);
      const pts = U.blobPoints(x, y, sz, sz * 0.85, harm, t * 0.6 + i, 22, 1);
      U.smoothPath(g, pts);
      g.fillStyle = '#000';
      g.fill();
    }
    // проеденный нижний край
    if (f.melt > 0.5) {
      for (let i = 0; i < 7; i++) {
        const x = -RX + rnd() * RX * 2;
        const sz = 8 + rnd() * 22;
        g.beginPath(); g.arc(x, RY * 0.82 + rnd() * 8, sz, 0, U.TAU); g.fill();
      }
    }
    g.restore();
  }

  /** свечение краёв дыр и кости — рисуется после вырезания, поверх */
  function layerAcidGlow(g, slug, t) {
    const f = slug.fx;
    if (f.melt <= 0.05) return;
    const rnd = U.mulberry32(slug.seed + 67);
    const n = Math.round(2 + f.melt * 7);
    g.save();
    for (let i = 0; i < n; i++) {
      const a = rnd() * U.TAU, r = Math.sqrt(rnd()) * 0.7;
      const x = Math.cos(a) * RX * r, y = Math.sin(a) * RY * r * 0.85;
      const sz = (10 + rnd() * 26) * f.melt;
      const harm = U.makeHarmonics((slug.seed + i * 29) | 0, 3, 0.35);
      const pts = U.blobPoints(x, y, sz * 1.06, sz * 0.9, harm, t * 0.6 + i, 22, 1);
      U.smoothPath(g, pts);
      g.strokeStyle = `rgba(150,255,60,${0.5 + 0.3 * Math.sin(t * 4 + i)})`;
      g.lineWidth = 3.5; g.stroke();
      g.strokeStyle = 'rgba(70,140,20,0.6)'; g.lineWidth = 1.2; g.stroke();
    }
    g.restore();
  }

  function layerBones(g, slug, t) {
    const f = slug.fx;
    if (f.bones <= 0.12) return;
    const al = U.clamp((f.bones - 0.12) * 1.6, 0, 1);
    g.save();
    g.globalAlpha = al;
    g.fillStyle = '#f2e9d8';
    g.strokeStyle = 'rgba(120,105,80,0.65)';
    g.lineWidth = 1.6;
    // позвоночник
    const sx = -RX * 0.55, sy = RY * 0.05;
    for (let i = 0; i < 7; i++) {
      const x = sx + i * (RX * 0.19);
      const y = sy + Math.sin(i * 0.7) * 7;
      U.roundRect(g, x - 9, y - 7, 18, 14, 5); g.fill(); g.stroke();
    }
    // рёбра
    for (let i = 0; i < 4; i++) {
      const x = sx + 14 + i * (RX * 0.22);
      g.lineWidth = 5.5; g.strokeStyle = '#f2e9d8';
      g.beginPath(); g.moveTo(x, sy - 4);
      g.quadraticCurveTo(x + 16, sy - 34, x + 34, sy - 22); g.stroke();
      g.beginPath(); g.moveTo(x, sy + 4);
      g.quadraticCurveTo(x + 16, sy + 34, x + 34, sy + 22); g.stroke();
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(120,105,80,0.5)';
    }
    g.restore();
  }

  function layerWet(g, slug, t) {
    const f = slug.fx;
    if (f.wet <= 0.05) return;
    const rnd = U.mulberry32(slug.seed + 83);
    const a = U.clamp(f.wet, 0, 1);
    // общий мокрый блеск
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gl = g.createLinearGradient(-RX, -RY, RX, RY);
    gl.addColorStop(0, `rgba(190,235,255,${0.16 * a})`);
    gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    gl.addColorStop(1, `rgba(160,215,255,${0.10 * a})`);
    g.fillStyle = gl;
    g.fillRect(-RX * 1.4, -RY * 1.5, RX * 2.8, RY * 3);
    g.restore();
    // капли
    const n = Math.round(8 + a * 26);
    for (let i = 0; i < n; i++) {
      const px = (rnd() * 2 - 1) * RX * 0.9;
      const base = (rnd() * 2 - 1) * RY * 0.85;
      const slide = ((t * (12 + rnd() * 26) + i * 40) % (RY * 1.6));
      const py = U.clamp(base + slide * 0.25, -RY * 0.9, RY * 0.88);
      const rr = 2.6 + rnd() * 5.2;
      g.fillStyle = 'rgba(175,225,250,0.55)';
      g.beginPath(); g.ellipse(px, py, rr * 0.72, rr, 0, 0, U.TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath(); g.ellipse(px - rr * 0.24, py - rr * 0.32, rr * 0.2, rr * 0.26, 0, 0, U.TAU); g.fill();
    }
  }

  function layerFrost(g, slug, t) {
    const f = slug.fx;
    if (f.frozen <= 0.05) return;
    const a = U.clamp(f.frozen, 0, 1);
    g.save();
    g.globalAlpha = a * 0.5;
    const gl = g.createLinearGradient(0, -RY, 0, RY);
    gl.addColorStop(0, 'rgba(225,248,255,0.8)');
    gl.addColorStop(1, 'rgba(150,210,240,0.55)');
    g.fillStyle = gl;
    g.fillRect(-RX * 1.4, -RY * 1.5, RX * 2.8, RY * 3);
    g.restore();
    // иней — белые штрихи
    const rnd = U.mulberry32(slug.seed + 97);
    g.save();
    g.lineCap = 'round';
    const n = Math.round(10 + a * 34);
    for (let i = 0; i < n; i++) {
      const x = (rnd() * 2 - 1) * RX * 0.92, y = (rnd() * 2 - 1) * RY * 0.88;
      const ang = rnd() * U.TAU, len = 5 + rnd() * 16;
      g.strokeStyle = rnd() > 0.45 ? 'rgba(255,255,255,0.92)' : 'rgba(190,232,250,0.85)';
      g.lineWidth = 2 + rnd() * 2.6;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.stroke();
    }
    g.restore();
  }

  /* ---------- глаза ---------- */
  function drawEye(g, x, y, r, look, slug, t, state, idx) {
    const f = slug.fx;
    const c = bodyColor(slug);
    // белок
    g.save();
    U.shadowOn(g, 10, 'rgba(0,0,0,0.25)', 0, 3);
    g.fillStyle = '#fbfbf8';
    g.beginPath(); g.ellipse(x, y, r, r * 1.02, 0, 0, U.TAU); g.fill();
    U.shadowOff(g);
    // лёгкая тень сверху на белке
    const sg = g.createLinearGradient(x, y - r, x, y + r);
    sg.addColorStop(0, 'rgba(140,150,140,0.35)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = sg;
    g.beginPath(); g.ellipse(x, y, r, r * 1.02, 0, 0, U.TAU); g.fill();
    g.restore();

    const px = x + look.x * r * 0.34;
    const py = y + look.y * r * 0.34;

    if (state === 'dead') {
      g.strokeStyle = '#2a2a2a'; g.lineWidth = r * 0.24; g.lineCap = 'round';
      const s = r * 0.5;
      g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s);
      g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke();
    } else {
      // радужка
      const irisR = r * 0.52;
      const ig = g.createRadialGradient(px - irisR * 0.3, py - irisR * 0.3, 1, px, py, irisR);
      const ic = U.shade(c, -18, 18);
      ig.addColorStop(0, U.colStr(U.shade(ic, 20)));
      ig.addColorStop(1, U.colStr(U.shade(ic, -18)));
      g.fillStyle = ig;
      g.beginPath(); g.arc(px, py, irisR, 0, U.TAU); g.fill();
      // зрачок — расширяется от боли/страха
      const dil = 1 + (1 - slug.mood) * 0.55 - (f.frozen * 0.2);
      g.fillStyle = '#14100f';
      g.beginPath(); g.arc(px, py, irisR * 0.52 * dil, 0, U.TAU); g.fill();
      // блики
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath(); g.arc(px - irisR * 0.4, py - irisR * 0.45, r * 0.17, 0, U.TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.arc(px + irisR * 0.35, py + irisR * 0.4, r * 0.09, 0, U.TAU); g.fill();
    }

    // веко — моргание / зажмуривание от боли
    let lid = 0;
    const blink = Math.sin(t * 0.9 + (slug.seed % 10));
    if (blink > 0.985) lid = 1;
    if (state === 'scream' || state === 'pain') lid = 0.55 + 0.25 * Math.sin(t * 9 + idx);
    if (state === 'frozen') lid = 0.45;
    if (lid > 0.01) {
      g.save();
      g.beginPath(); g.ellipse(x, y, r + 1, r * 1.04, 0, 0, U.TAU); g.clip();
      g.fillStyle = U.colStr(U.shade(c, -6));
      g.fillRect(x - r - 2, y - r - 2, r * 2 + 4, (r * 2 + 4) * lid * 0.55);
      g.fillRect(x - r - 2, y + r + 2 - (r * 2 + 4) * lid * 0.55, r * 2 + 4, (r * 2 + 4) * lid * 0.55);
      if (lid > 0.6) {
        g.strokeStyle = U.colStr(U.shade(c, -30), 0.9);
        g.lineWidth = r * 0.13; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - r * 0.78, y);
        g.quadraticCurveTo(x, y + r * 0.22, x + r * 0.78, y);
        g.stroke();
      }
      g.restore();
    }

    // контур глаза
    g.strokeStyle = U.colStr(U.shade(c, -26), 0.85);
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, r, r * 1.02, 0, 0, U.TAU); g.stroke();

    // слёзы при боли
    if ((state === 'scream' || state === 'pain') && slug.alive) {
      const tearPhase = (t * 1.6 + idx * 0.5) % 1;
      g.fillStyle = 'rgba(150,215,245,0.85)';
      g.beginPath();
      g.ellipse(x - r * 0.55, y + r * 0.7 + tearPhase * r * 1.6, r * 0.16, r * 0.24, 0, 0, U.TAU);
      g.fill();
    }
  }

  /** позиции стебельков/глаз */
  function stalkData(slug, t, look) {
    const f = slug.fx;
    const sway = Math.sin(t * 1.4) * 6;
    const sway2 = Math.sin(t * 1.4 + 1.1) * 5;
    const droop = (1 - slug.mood) * 20 + f.melt * 22;
    return [
      { bx: -52, by: -16, ex: -96 + look.x * 10 + sway, ey: -178 + droop + look.y * 8, r: 34, w: 30 },
      { bx: 6, by: -26, ex: -2 + look.x * 12 + sway2, ey: -208 + droop + look.y * 9, r: 30, w: 26 }
    ];
  }

  /** стебельки рисуются ПОД телом — так они естественно вырастают из спины */
  function drawStalks(g, slug, t, look) {
    const c = bodyColor(slug);
    const stalks = stalkData(slug, t, look);
    stalks.forEach((s, i) => {
      const steps = 18;
      const left = [], right = [];
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const bend = Math.sin(u * Math.PI) * (14 + Math.sin(t * 1.7 + i * 2) * 9);
        const x = U.lerp(s.bx, s.ex, U.easeOutCubic(u)) + bend * 0.45;
        const y = U.lerp(s.by, s.ey, u * u * 0.35 + u * 0.65);
        const w = U.lerp(s.w, s.r * 0.44, U.smooth(u));
        left.push([x - w, y]); right.push([x + w, y]);
      }
      g.save();
      g.beginPath();
      g.moveTo(left[0][0], left[0][1]);
      for (let k = 1; k <= steps; k++) g.lineTo(left[k][0], left[k][1]);
      for (let k = steps; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
      g.closePath();
      const sg = g.createLinearGradient(s.ex - s.r, 0, s.ex + s.r, 0);
      sg.addColorStop(0, U.colStr(U.shade(c, -14)));
      sg.addColorStop(0.35, U.colStr(U.shade(c, 10)));
      sg.addColorStop(1, U.colStr(U.shade(c, -22)));
      g.fillStyle = sg;
      g.fill();
      g.strokeStyle = U.colStr(U.shade(c, -26), 0.6);
      g.lineWidth = 2.5; g.stroke();
      // продольный блик
      g.strokeStyle = 'rgba(255,255,255,0.30)';
      g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath();
      for (let k = 2; k <= steps - 1; k++) {
        const p = left[k];
        if (k === 2) g.moveTo(p[0] + 9, p[1]); else g.lineTo(p[0] + 9, p[1]);
      }
      g.stroke();
      g.restore();
    });
  }

  function drawEyeballs(g, slug, t, look, state) {
    const stalks = stalkData(slug, t, look);
    stalks.forEach((s, i) => drawEye(g, s.ex, s.ey, s.r, look, slug, t, state, i));
  }

  function drawMouth(g, slug, t, state) {
    const c = bodyColor(slug);
    const x = -26, y = 34;
    g.save();
    if (state === 'scream') {
      const open = 14 + Math.sin(t * 12) * 6;
      g.fillStyle = 'rgba(40,10,14,0.92)';
      g.beginPath(); g.ellipse(x, y, 20, open + 14, 0.1, 0, U.TAU); g.fill();
      g.fillStyle = '#c2564f';
      g.beginPath(); g.ellipse(x, y + open * 0.5, 11, open * 0.42, 0, 0, U.TAU); g.fill();
      g.strokeStyle = U.colStr(U.shade(c, -28)); g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, y, 20, open + 14, 0.1, 0, U.TAU); g.stroke();
    } else if (state === 'dead') {
      g.strokeStyle = 'rgba(40,20,20,0.8)'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 16, y + 8); g.quadraticCurveTo(x, y - 8, x + 16, y + 8); g.stroke();
    } else if (slug.mood > 0.65) {
      g.strokeStyle = 'rgba(30,40,20,0.7)'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 16, y - 4); g.quadraticCurveTo(x, y + 14, x + 16, y - 4); g.stroke();
    } else {
      g.strokeStyle = 'rgba(30,40,20,0.7)'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 15, y + 6); g.quadraticCurveTo(x, y - 6, x + 15, y + 6); g.stroke();
    }
    g.restore();
  }

  function drawIceBlock(g, slug, t) {
    const f = slug.fx;
    if (f.iceBlock <= 0.08) return;
    const a = U.clamp(f.iceBlock, 0, 1);
    const w = RX * 2.25, h = RY * 3.4;
    g.save();
    g.globalAlpha = 0.62 * a;
    const gr = g.createLinearGradient(-w / 2, -h * 0.62, w / 2, h * 0.4);
    gr.addColorStop(0, 'rgba(220,248,255,0.85)');
    gr.addColorStop(0.45, 'rgba(150,210,240,0.45)');
    gr.addColorStop(1, 'rgba(200,240,255,0.8)');
    g.fillStyle = gr;
    U.roundRect(g, -w / 2, -h * 0.62, w, h, 26);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; g.stroke();
    // грани и блики
    g.globalAlpha = 0.55 * a;
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 5; g.lineCap = 'round';
    const rnd = U.mulberry32(slug.seed + 5);
    for (let i = 0; i < 8; i++) {
      const x1 = -w / 2 + rnd() * w, y1 = -h * 0.62 + rnd() * h;
      g.beginPath(); g.moveTo(x1, y1);
      g.lineTo(x1 + (rnd() * 60 - 30), y1 + (rnd() * 80 - 40)); g.stroke();
    }
    g.restore();
  }

  /* ---------- главный вызов ---------- */
  /**
   * opts: {x,y,scale,t,look:{x,y},state,squash,rot,alpha,shadow}
   * state: 'idle' | 'scream' | 'pain' | 'dead' | 'frozen'
   */
  function draw(ctx, slug, opts = {}) {
    const {
      x = 0, y = 0, scale = 1, t = 0, look = { x: 0, y: 0 },
      squash = 1, rot = 0, alpha = 1, shadow = true
    } = opts;
    let state = opts.state || 'idle';
    if (!slug.alive) state = 'dead';
    else if (slug.fx.frozen > 0.5 && state === 'idle') state = 'frozen';

    const sizeMul = slug.size || 1;
    const g = ensureBuf(scale * sizeMul * (global.App ? App.dpr : 1));
    g.save();
    g.translate(CX, CY);

    const pts = bodyPts(slug, t, squash);

    // стебельки глаз — под телом
    drawStalks(g, slug, t, look);

    // тело + слои, обрезанные силуэтом
    g.save();
    U.smoothPath(g, pts); g.clip();
    layerBase(g, slug, t, pts);
    layerPills(g, slug, t);
    layerFried(g, slug, t);
    layerBurns(g, slug, t);
    layerWounds(g, slug, t);
    layerBlisters(g, slug, t);
    layerBones(g, slug, t);
    layerWet(g, slug, t);
    layerFrost(g, slug, t);
    g.restore();

    // контур
    g.save();
    U.smoothPath(g, pts);
    g.strokeStyle = U.colStr(U.shade(bodyColor(slug), -22, 6), 0.75);
    g.lineWidth = 3;
    g.stroke();
    g.restore();

    layerAcidHoles(g, slug, t);
    layerAcidGlow(g, slug, t);

    drawEyeballs(g, slug, t, look, state);
    drawMouth(g, slug, t, state);
    drawIceBlock(g, slug, t);

    g.restore();

    // блит на основной холст
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    const drawScale = scale * sizeMul;
    if (shadow) {
      ctx.save();
      const sw = RX * drawScale * 1.05, sh = RY * drawScale * 0.34;
      const sg = ctx.createRadialGradient(0, RY * drawScale * 0.92, 2, 0, RY * drawScale * 0.92, sw);
      sg.addColorStop(0, 'rgba(0,0,0,0.35)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(0, RY * drawScale * 0.92, sw, sh, 0, 0, U.TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.drawImage(buf, -CX * drawScale, -CY * drawScale, BOX * drawScale, BOX * drawScale);
    ctx.restore();
  }

  /** Миниатюра для слотов сохранения */
  function thumbnail(slug, size = 190) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const g = c.getContext('2d');
    g.clearRect(0, 0, size, size);
    const sc = size / (BOX * 0.62);
    draw(g, slug, { x: size / 2, y: size * 0.62, scale: sc, t: 0.4, shadow: false });
    return c.toDataURL('image/png');
  }

  global.SlugArt = { draw, thumbnail, BOX, RX, RY, bodyColor };
})(window);
