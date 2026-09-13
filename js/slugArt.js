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
    if (f.melt > 0) c = U.mixHsl(c, { h: 100, s: 30, l: 38 }, U.clamp(f.melt * 0.3, 0, 0.3));
    if (!slug.alive) c = U.mixHsl(c, { h: 100, s: 10, l: 42 }, 0.45);
    return c;
  }

  /* ---------- силуэт ---------- */
  function bodyPts(slug, t, squash) {
    const f = slug.fx;
    const harm = U.makeHarmonics(slug.seed, 4, 0.03 + f.blended * 0.12 + f.melt * 0.05);
    const rx = RX * (1 + f.blended * 0.10) * (1 / squash);
    const ry = RY * squash * (1 - f.melt * 0.14);
    return U.blobPoints(0, 0, rx, ry, harm, t, 84, 0.96);
  }

  /** мягкий мазок «кистью»: плотная середина и растушёванный край */
  function stamp(g, x, y, r, col, a, hard = 0.72) {
    const gr = g.createRadialGradient(x, y, r * hard * 0.4, x, y, r);
    gr.addColorStop(0, U.colStr(col, a));
    gr.addColorStop(hard, U.colStr(col, a));
    gr.addColorStop(1, U.colStr(col, 0));
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, U.TAU); g.fill();
  }

  /** не рисуем отметины прямо на глазах, иначе их не видно */
  function nearEye(x, y) {
    return U.dist(x, y, -36, -2) < 34 || U.dist(x, y, 36, -5) < 34;
  }

  /* ---------- слои ---------- */

  /**
   * Тело — мягкое пятно, набитое растушёванными мазками,
   * как будто нарисовано кистью: без чёткого контура и бликов.
   */
  function layerBody(g, slug, t, squash) {
    const c = bodyColor(slug);
    const f = slug.fx;
    const rnd = U.mulberry32(slug.seed + 7);
    const wob = (i) => Math.sin(t * 0.7 + i * 1.7) * 0.03;

    g.save();
    g.scale(1, (RY / RX) * squash * (1 - f.melt * 0.12));
    const R = RX * (1 + f.blended * 0.08);

    // плотная сердцевина
    stamp(g, 0, 0, R * 0.92, c, 0.95, 0.74);

    // мазки по краю — от них край мягкий и чуть неровный
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * U.TAU + rnd() * 0.14;
      const rr = R * (0.52 + rnd() * 0.07 + wob(i) + f.blended * 0.07 * Math.sin(i * 2.3));
      const br = R * (0.40 + rnd() * 0.07);
      stamp(g, Math.cos(a) * rr, Math.sin(a) * rr, br, c, 0.95, 0.66);
    }

    // разводы светлее и темнее — «пятнистость» зелени
    for (let i = 0; i < 9; i++) {
      const a = rnd() * U.TAU, r = Math.sqrt(rnd()) * 0.6;
      const light = rnd() > 0.45;
      stamp(g,
        Math.cos(a) * R * r, Math.sin(a) * R * r,
        R * (0.22 + rnd() * 0.26),
        U.shade(c, light ? 9 : -9, light ? -3 : 3),
        0.26 + rnd() * 0.14, 0.25);
    }

    // лёгкое затемнение снизу, чтобы пятно не было плоским
    stamp(g, 0, R * 0.40, R * 0.66, U.shade(c, -9, 2), 0.18, 0.2);

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
      if (nearEye(x, y)) continue;
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
      if (nearEye(x, y)) continue;
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
    const n = Math.round(3 + f.wounds * 10);
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = rnd() * U.TAU, r = Math.sqrt(rnd()) * 0.86;
      const x = Math.cos(a) * RX * r, y = Math.sin(a) * RY * r * 0.92;
      if (nearEye(x, y)) continue;
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

  /** Набор «проеденных» кислотой дыр — один и тот же для дыр, ободков и костей */
  function acidHoles(slug, t) {
    const f = slug.fx;
    if (f.melt <= 0.05) return [];
    const rnd = U.mulberry32(slug.seed + 67);
    const out = [];
    const total = 5;
    for (let i = 0; i < total; i++) {
      // раскидываем дыры по кругу, чтобы не липли друг к другу
      const a = (i / total) * U.TAU + 0.4 + rnd() * 0.5;
      const rad = 0.40 + rnd() * 0.24;
      let x = Math.cos(a) * RX * rad;
      let y = Math.sin(a) * RY * rad * 0.85;
      if (nearEye(x, y)) y += y >= 0 ? 34 : -34;
      const sz = (22 + rnd() * 12) * (0.7 + f.melt * 0.45);
      const rot = rnd() * U.TAU;
      if (i / total > f.melt * 1.25) continue;
      out.push({ x, y, sz, rot, seed: (slug.seed + i * 29) | 0, i });
    }
    return out;
  }

  function holePath(g, h, t, k = 1) {
    const harm = U.makeHarmonics(h.seed, 3, 0.3);
    U.smoothPath(g, U.blobPoints(h.x, h.y, h.sz * k, h.sz * 0.84 * k, harm, t * 0.4 + h.i, 24, 1));
  }

  /** дыры вырезаются из буфера — сквозь них видно фон */
  function layerAcidHoles(g, slug, t) {
    const holes = acidHoles(slug, t);
    if (!holes.length) return;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    for (const h of holes) { holePath(g, h, t); g.fill(); }
    if (slug.fx.melt > 0.6) {
      const rnd = U.mulberry32(slug.seed + 71);
      for (let i = 0; i < 6; i++) {
        const x = -RX * 0.8 + rnd() * RX * 1.6;
        g.beginPath(); g.arc(x, RY * 0.8 + rnd() * 10, 10 + rnd() * 20, 0, U.TAU); g.fill();
      }
    }
    g.restore();
  }

  /** ярко-зелёный разъеденный ободок и торчащие из дыры кости */
  function layerAcidBones(g, slug, t) {
    const holes = acidHoles(slug, t);
    if (!holes.length) return;
    for (const h of holes) {
      // разъеденный ободок
      g.save();
      holePath(g, h, t, 1.02);
      g.lineWidth = Math.max(5, h.sz * 0.3);
      g.strokeStyle = `rgba(122,222,58,${0.85 + 0.15 * Math.sin(t * 4 + h.i)})`;
      g.stroke();
      g.lineWidth = Math.max(2, h.sz * 0.1);
      g.strokeStyle = 'rgba(70,150,24,0.5)';
      g.stroke();
      g.restore();

      // кости — бледно-розовая «решётка» поперёк дыры, чуть выступает за край
      g.save();
      holePath(g, h, t, 1.34); g.clip();
      g.lineCap = 'round';
      const L = h.sz * 1.7;
      const gap = h.sz * 0.4;
      const bone = (ang, off) => {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const nx = -dy * off, ny = dx * off;
        g.beginPath();
        g.moveTo(h.x + nx - dx * L, h.y + ny - dy * L);
        g.lineTo(h.x + nx + dx * L, h.y + ny + dy * L);
        g.stroke();
      };
      const grid = (w, style) => {
        g.lineWidth = w; g.strokeStyle = style;
        bone(h.rot, -gap); bone(h.rot, gap);
        bone(h.rot + Math.PI / 2, -gap * 0.85); bone(h.rot + Math.PI / 2, gap * 0.85);
      };
      grid(h.sz * 0.34, 'rgba(150,110,95,0.3)');
      grid(h.sz * 0.26, '#f6d6c4');
      g.restore();
    }
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
  /** Два чёрных глаза-точки прямо на теле — как на рисунке */
  function drawEyes(g, slug, t, look, state) {
    const eyes = [
      { x: -36, y: -2, rx: 9.5, ry: 12, seed: slug.seed + 3 },
      { x: 36, y: -5, rx: 10, ry: 12.5, seed: slug.seed + 9 }
    ];
    const ox = look.x * 3.5, oy = look.y * 3;
    const blink = Math.sin(t * 0.9 + (slug.seed % 10)) > 0.985 ? 1 : 0;
    const ink = 'rgba(12,14,10,0.95)';

    eyes.forEach((e, i) => {
      const x = e.x + ox, y = e.y + oy;
      g.save();
      g.fillStyle = ink;
      g.strokeStyle = ink;
      g.lineCap = 'round';

      if (state === 'dead') {
        g.lineWidth = 4.5;
        const s2 = e.rx * 1.1;
        g.beginPath();
        g.moveTo(x - s2, y - s2); g.lineTo(x + s2, y + s2);
        g.moveTo(x + s2, y - s2); g.lineTo(x - s2, y + s2);
        g.stroke();
      } else if (state === 'scream' || state === 'pain') {
        // зажмуренные глаза «^ ^»
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(x - e.rx, y + e.ry * 0.45);
        g.quadraticCurveTo(x, y - e.ry * 0.7, x + e.rx, y + e.ry * 0.45);
        g.stroke();
      } else {
        const k = 1 - blink * 0.9;
        const harm = U.makeHarmonics(e.seed, 3, 0.13);
        U.smoothPath(g, U.blobPoints(x, y, e.rx, Math.max(e.ry * k, 1.2), harm, i * 3, 20, 1));
        g.fill();
      }
      g.restore();
    });
  }

  /** Рот появляется, только когда слизень орёт */
  function drawMouth(g, slug, t, state) {
    if (state !== 'scream') return;
    const open = 7 + Math.abs(Math.sin(t * 11)) * 8;
    g.save();
    g.fillStyle = 'rgba(12,14,10,0.9)';
    g.beginPath();
    g.ellipse(-4, 26, 11, open, 0, 0, U.TAU);
    g.fill();
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

    // мягкое тело
    layerBody(g, slug, t, squash);

    // слои эффектов — внутри силуэта, чуть отступив от мягкого края
    const inner = pts.map((p) => [p[0] * 0.86, p[1] * 0.86]);
    g.save();
    U.smoothPath(g, inner); g.clip();
    layerPills(g, slug, t);
    layerFried(g, slug, t);
    layerBurns(g, slug, t);
    layerWounds(g, slug, t);
    layerBlisters(g, slug, t);
    layerWet(g, slug, t);
    layerFrost(g, slug, t);
    g.restore();

    layerAcidHoles(g, slug, t);
    layerAcidBones(g, slug, t);

    drawEyes(g, slug, t, look, state);
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
      sg.addColorStop(0, 'rgba(0,0,0,0.22)');
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
