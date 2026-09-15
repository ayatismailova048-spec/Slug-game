/* ============================================================
   loader.js — экран загрузки: слизень ползёт по ветке
   и оставляет за собой слизь.
   Грузится первым и рисует сам, без остальных файлов игры.
   ============================================================ */
(function (global) {
  'use strict';

  const cv = document.getElementById('load');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');

  const MIN_MS = 2400;    // сколько минимум показываем ползущего слизня
  const FADE_MS = 500;

  let W = 0, H = 0, dpr = 1;
  const t0 = (global.performance && performance.now) ? performance.now() : Date.now();
  let ready = false;      // игра догрузилась
  let fadeFrom = 0;       // момент начала исчезновения
  let stopped = false;

  function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }

  function resize() {
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    W = cv.clientWidth || global.innerWidth;
    H = cv.clientHeight || global.innerHeight;
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- геометрия ветки ---------- */
  function branchThick() { return Math.max(12, Math.min(W, H) * 0.045); }
  function bx0() { return W * 0.05; }
  function bx1() { return W * 0.95; }
  function branchY(x) {
    const u = (x - bx0()) / Math.max(1, bx1() - bx0());
    const U = Math.min(W, H);
    const base = H * 0.76;
    return base + Math.sin(u * 5.6 + 0.4) * U * 0.020 + Math.sin(u * 13.0) * U * 0.007;
  }

  /* ---------- фон ---------- */
  function drawBack() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16342a');
    g.addColorStop(0.55, '#1b3d31');
    g.addColorStop(1, '#0e2219');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const r = Math.max(W, H) * 0.6;
    const gl = ctx.createRadialGradient(W * 0.5, H * 0.42, r * 0.1, W * 0.5, H * 0.42, r);
    gl.addColorStop(0, 'rgba(58,110,88,.42)');
    gl.addColorStop(1, 'rgba(58,110,88,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);

    // мягкие пятна-облака, как на рисунке
    const blobs = [
      [0.22, 0.30, 0.30], [0.74, 0.26, 0.26], [0.50, 0.62, 0.34],
      [0.12, 0.66, 0.22], [0.88, 0.60, 0.24]
    ];
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      const rr = Math.max(W, H) * b[2] * 0.5;
      const gg = ctx.createRadialGradient(W * b[0], H * b[1], 0, W * b[0], H * b[1], rr);
      gg.addColorStop(0, 'rgba(40,86,66,.30)');
      gg.addColorStop(1, 'rgba(40,86,66,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(W * b[0], H * b[1], rr, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------- ветка с листиками ---------- */
  function branchPath() {
    ctx.beginPath();
    const x0 = bx0(), x1 = bx1();
    ctx.moveTo(x0, branchY(x0));
    for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, branchY(x));
    ctx.lineTo(x1, branchY(x1));
  }

  function drawLeaf(x, y, size, dir, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    // черенок
    ctx.strokeStyle = '#4a7a33';
    ctx.lineWidth = Math.max(1.5, size * 0.09);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dir * size * 0.42, -size * 0.12); ctx.stroke();
    // листик
    ctx.translate(dir * size * 0.42, -size * 0.12);
    const g = ctx.createLinearGradient(0, -size * 0.3, 0, size * 0.3);
    g.addColorStop(0, '#6fbb4f');
    g.addColorStop(1, '#3d7f36');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(dir * size * 0.5, 0, size * 0.52, size * 0.21, dir > 0 ? -0.25 : 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,62,26,.5)';
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(dir * size * 1.0, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawBranch() {
    const thick = branchThick();

    // тень под веткой
    ctx.save();
    ctx.strokeStyle = 'rgba(6,20,14,.45)';
    ctx.lineWidth = thick * 1.25;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.translate(0, thick * 0.35);
    branchPath(); ctx.stroke();
    ctx.restore();

    // само дерево
    const by = branchY(W * 0.5);
    const g = ctx.createLinearGradient(0, by - thick, 0, by + thick);
    g.addColorStop(0, '#a65f36');
    g.addColorStop(0.5, '#8d4c28');
    g.addColorStop(1, '#5e3319');
    ctx.strokeStyle = g;
    ctx.lineWidth = thick;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    branchPath(); ctx.stroke();

    // блик сверху
    ctx.save();
    ctx.strokeStyle = 'rgba(226,160,110,.35)';
    ctx.lineWidth = thick * 0.22;
    ctx.translate(0, -thick * 0.26);
    branchPath(); ctx.stroke();
    ctx.restore();

    // листики
    const leaves = [[0.16, 1, 0.12], [0.38, -1, -0.10], [0.58, 1, 0.16], [0.80, -1, -0.14], [0.92, 1, 0.08]];
    const size = Math.max(14, Math.min(W, H) * 0.05);
    for (let i = 0; i < leaves.length; i++) {
      const L = leaves[i];
      const x = bx0() + (bx1() - bx0()) * L[0];
      drawLeaf(x, branchY(x) + (L[1] > 0 ? thick * 0.1 : -thick * 0.1), size, L[1], L[2]);
    }
  }

  /* ---------- слизь ---------- */
  function drawSlime(toX, time) {
    const thick = branchThick();
    const top = -thick * 0.48;
    const x0 = W * 0.11;
    ctx.save();
    ctx.fillStyle = 'rgba(150, 226, 104, .55)';
    // сплошная дорожка
    if (toX <= x0 + 2) { ctx.restore(); return; }
    ctx.beginPath();
    ctx.moveTo(x0, branchY(x0) + top);
    for (let x = x0; x <= toX; x += 5) {
      const w = 1 + Math.sin(x * 0.08) * 0.5;
      ctx.lineTo(x, branchY(x) + top - w);
    }
    for (let x = toX; x >= x0; x -= 5) {
      ctx.lineTo(x, branchY(x) + top + Math.max(2, thick * 0.16));
    }
    ctx.closePath();
    ctx.fill();

    // капельки-комочки, как на рисунке
    ctx.fillStyle = 'rgba(168, 236, 120, .75)';
    let seed = 1;
    for (let x = x0 + 6; x < toX; x += Math.max(9, W * 0.012)) {
      seed = (seed * 9301 + 49297) % 233280;
      const r = (seed / 233280);
      const rad = Math.max(2.5, thick * (0.10 + r * 0.14));
      const dy = top - rad * (0.2 + r * 1.3) + Math.sin(x * 0.05 + time * 0.002) * 1.5;
      ctx.beginPath();
      ctx.arc(x, branchY(x) + dy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- слизень ---------- */
  function drawSlug(x, y, scale, phase) {
    const sq = 1 + Math.sin(phase) * 0.09;        // ползёт — тельце растягивается
    const w = 30 * scale * sq;
    const h = 22 * scale / sq;

    ctx.save();
    ctx.translate(x, y - h * 0.34);

    // тень на ветке
    ctx.fillStyle = 'rgba(8,24,16,.32)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.15, h * 0.34, w * 1.05, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // тельце: хвостик слева, головка справа
    function body(k) {
      ctx.beginPath();
      ctx.moveTo(-w * 1.22 * k, h * 0.30);
      ctx.bezierCurveTo(-w * 1.02 * k, -h * 0.34 * k, -w * 0.52 * k, -h * 0.94 * k, w * 0.04 * k, -h * 0.92 * k);
      ctx.bezierCurveTo(w * 0.74 * k, -h * 0.90 * k, w * 1.04 * k, -h * 0.26 * k, w * 1.00 * k, h * 0.30);
      ctx.quadraticCurveTo(w * 0.1, h * 0.46, -w * 1.22 * k, h * 0.30);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(120,200,84,.28)'; body(1.14);
    ctx.fillStyle = 'rgba(133,209,92,.60)'; body(1.05);
    ctx.fillStyle = '#7cc853';               body(0.99);

    // блик
    ctx.fillStyle = 'rgba(206,248,176,.38)';
    ctx.beginPath();
    ctx.ellipse(-w * 0.10, -h * 0.52, w * 0.40, h * 0.20, -0.20, 0, Math.PI * 2);
    ctx.fill();

    // глазки — две чёрные точки
    ctx.fillStyle = '#12160f';
    const er = Math.max(1.7, 2.7 * scale);
    ctx.beginPath(); ctx.ellipse(w * 0.34, -h * 0.40, er * 0.8, er * 1.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.66, -h * 0.34, er * 0.8, er * 1.15, 0, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  /* ---------- надпись ---------- */
  function textY() {
    return branchY(W * 0.5) - Math.max(56, Math.min(W, H) * 0.24);
  }
  function drawText(time) {
    const fs = Math.max(18, Math.min(44, Math.min(W, H) * 0.062));
    ctx.save();
    ctx.font = '800 ' + fs + 'px "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const dots = '.'.repeat(1 + (Math.floor(time / 380) % 3));
    ctx.fillStyle = 'rgba(6,20,14,.45)';
    ctx.fillText('Загрузка' + dots, W * 0.5 + 2, textY() + 3);
    ctx.fillStyle = '#f2fff4';
    ctx.fillText('Загрузка' + dots, W * 0.5, textY());
    ctx.restore();
  }

  /* ---------- цикл ---------- */
  function frame() {
    if (stopped) return;
    const time = now() - t0;

    let alpha = 1;
    if (fadeFrom) {
      alpha = 1 - (now() - fadeFrom) / FADE_MS;
      if (alpha <= 0) { finishNow(); return; }
    }
    cv.style.opacity = String(alpha);

    if (W !== (cv.clientWidth || global.innerWidth) || H !== (cv.clientHeight || global.innerHeight)) resize();

    // 0..1 — путь слизня по ветке
    let p = Math.min(1, time / MIN_MS);
    p = p * p * (3 - 2 * p);                       // помягче на старте и в конце

    drawBack();
    const x = W * 0.11 + (W * 0.86 - W * 0.11) * p;
    drawBranch();
    drawSlime(x, time);
    const scale = Math.max(1.0, Math.min(2.2, Math.min(W, H) / 260));
    drawSlug(x, branchY(x) - branchThick() * 0.48, scale, time * 0.012);
    drawText(time);

    if (!fadeFrom && ready && time >= MIN_MS) fadeFrom = now();
    requestAnimationFrame(frame);
  }

  function finishNow() {
    stopped = true;
    cv.style.display = 'none';
    document.documentElement.classList.remove('loading');
  }

  resize();
  global.addEventListener('resize', resize);
  global.addEventListener('orientationchange', resize);
  document.documentElement.classList.add('loading');
  frame();

  global.SlugLoader = {
    done: function () { ready = true; },          // игра готова — можно уходить
    hide: finishNow
  };
})(window);
