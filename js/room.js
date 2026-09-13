/* ============================================================
   room.js — общая сцена лаборатории, статус слизня, твины
   ============================================================ */
(function (global) {
  'use strict';

  /** Простая анимация позиции/масштаба */
  class Tw {
    constructor(x, y, s = 1) {
      this.x = x; this.y = y; this.s = s;
      this.fx = x; this.fy = y; this.fs = s;
      this.tx = x; this.ty = y; this.ts = s;
      this.d = 0; this.time = 0; this.ease = U.easeOutCubic;
      this.onDone = null; this.done = true;
    }
    to(x, y, s, dur = 0.6, ease, cb) {
      this.fx = this.x; this.fy = this.y; this.fs = this.s;
      this.tx = x; this.ty = y; this.ts = s === undefined ? this.s : s;
      this.d = dur; this.time = 0; this.ease = ease || U.easeOutCubic;
      this.onDone = cb || null; this.done = dur <= 0;
      if (this.done) { this.x = x; this.y = y; this.s = this.ts; if (cb) cb(); }
      return this;
    }
    set(x, y, s) { this.x = this.tx = this.fx = x; this.y = this.ty = this.fy = y; if (s !== undefined) this.s = this.ts = this.fs = s; this.done = true; return this; }
    update(dt) {
      if (this.done) return;
      this.time += dt;
      const u = U.clamp(this.time / this.d, 0, 1);
      const e = this.ease(u);
      this.x = U.lerp(this.fx, this.tx, e);
      this.y = U.lerp(this.fy, this.ty, e);
      this.s = U.lerp(this.fs, this.ts, e);
      if (u >= 1) { this.done = true; if (this.onDone) { const c = this.onDone; this.onDone = null; c(); } }
    }
  }

  /** Чистый фон без комнаты: мягкий свет и лёгкая тень под прибором */
  function drawPlain(ctx, t, opt = {}) {
    const { glow = null, ground = 830 } = opt;
    const W = App.VW, H = App.VH;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fcfdfb');
    g.addColorStop(0.6, '#f0f3ee');
    g.addColorStop(1, '#dfe4dc');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (glow) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const rg = ctx.createRadialGradient(W / 2, ground - 260, 40, W / 2, ground - 200, 900);
      rg.addColorStop(0, glow);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // мягкая «земля»
    ctx.save();
    const sg = ctx.createLinearGradient(0, ground - 40, 0, H);
    sg.addColorStop(0, 'rgba(160,170,155,0)');
    sg.addColorStop(1, 'rgba(150,162,146,0.35)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, ground - 40, W, H - ground + 40);
    ctx.restore();
  }

  /* ---------- фон лаборатории ---------- */
  function drawLab(ctx, t, opt = {}) {
    const { wall1 = '#3f5c54', wall2 = '#2a403a', floor1 = '#8d9a91', floor2 = '#5d6a63', horizon = 620 } = opt;
    const W = App.VW, H = App.VH;
    // стена
    const wg = ctx.createLinearGradient(0, 0, 0, horizon);
    wg.addColorStop(0, wall1); wg.addColorStop(1, wall2);
    ctx.fillStyle = wg; ctx.fillRect(0, 0, W, horizon);

    // плитка на стене
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 110) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, horizon); ctx.stroke(); }
    for (let y = 0; y <= horizon; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    // виньетка света сверху
    const lg = ctx.createRadialGradient(W / 2, -120, 40, W / 2, horizon * 0.5, W * 0.8);
    lg.addColorStop(0, 'rgba(255,250,225,0.20)');
    lg.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, horizon);

    // трубы вдоль стены
    if (opt.props !== false) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      const pipeY = 118;
      ctx.strokeStyle = '#26362f'; ctx.lineWidth = 26;
      ctx.beginPath(); ctx.moveTo(-20, pipeY); ctx.lineTo(W + 20, pipeY); ctx.stroke();
      ctx.strokeStyle = '#3c5148'; ctx.lineWidth = 18;
      ctx.beginPath(); ctx.moveTo(-20, pipeY); ctx.lineTo(W + 20, pipeY); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-20, pipeY - 5); ctx.lineTo(W + 20, pipeY - 5); ctx.stroke();
      for (let x = 90; x < W; x += 260) {
        ctx.fillStyle = '#2c3e36';
        U.roundRect(ctx, x - 16, pipeY - 20, 32, 40, 6); ctx.fill();
      }
      // подвесные лампы
      for (let i = 0; i < 3; i++) {
        const lx = W * (0.2 + i * 0.3);
        ctx.strokeStyle = '#2a3a33'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(lx, pipeY); ctx.lineTo(lx, 210); ctx.stroke();
        ctx.fillStyle = '#33473f';
        ctx.beginPath();
        ctx.moveTo(lx - 54, 252); ctx.lineTo(lx - 18, 210);
        ctx.lineTo(lx + 18, 210); ctx.lineTo(lx + 54, 252);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,246,205,0.9)';
        ctx.beginPath(); ctx.ellipse(lx, 252, 36, 10, 0, 0, U.TAU); ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cg = ctx.createLinearGradient(0, 252, 0, horizon);
        cg.addColorStop(0, 'rgba(255,240,190,0.16)');
        cg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(lx - 40, 252); ctx.lineTo(lx + 40, 252);
        ctx.lineTo(lx + 190, horizon); ctx.lineTo(lx - 190, horizon);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // плинтус
    ctx.fillStyle = '#22332e';
    ctx.fillRect(0, horizon - 16, W, 22);

    // пол в перспективе
    const fg = ctx.createLinearGradient(0, horizon, 0, H);
    fg.addColorStop(0, floor2); fg.addColorStop(1, floor1);
    ctx.fillStyle = fg; ctx.fillRect(0, horizon, W, H - horizon);
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = '#20302b'; ctx.lineWidth = 2;
    for (let i = -12; i <= 24; i++) {
      const x0 = W / 2 + i * 60;
      ctx.beginPath(); ctx.moveTo(W / 2 + i * 22, horizon); ctx.lineTo(x0 * 1.6 - W * 0.3, H); ctx.stroke();
    }
    let yy = horizon, step = 14;
    while (yy < H) {
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
      step *= 1.28; yy += step;
    }
    ctx.restore();
  }

  /** Стол/тумба, на которой стоит прибор */
  function drawCounter(ctx, x, y, w, h, col = '#c9d2cb') {
    ctx.save();
    // тумба под столешницей
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 26, y + h, w - 52, 210);
    const bg = ctx.createLinearGradient(0, y + h, 0, y + h + 210);
    bg.addColorStop(0, '#6e7a73'); bg.addColorStop(1, '#4a544e');
    ctx.fillStyle = bg;
    ctx.fillRect(x + 26, y + h, w - 52, 210);
    // дверцы
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
    for (let i = 1; i < 5; i++) {
      const dx = x + 26 + ((w - 52) / 5) * i;
      ctx.beginPath(); ctx.moveTo(dx, y + h + 10); ctx.lineTo(dx, y + h + 200); ctx.stroke();
    }
    // столешница
    U.shadowOn(ctx, 26, 'rgba(0,0,0,0.4)', 0, 14);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, col); g.addColorStop(0.55, col); g.addColorStop(1, '#7f8a83');
    ctx.fillStyle = g;
    U.roundRect(ctx, x, y, w, h, 10); ctx.fill();
    U.shadowOff(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    U.roundRect(ctx, x + 8, y + 4, w - 16, 10, 5); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, y + h - 10, w, 10);
    ctx.restore();
  }

  /* ---------- заголовок и кнопка «назад» ---------- */
  function header(ctx, title, num, color = UI.PAL.mint) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,18,15,0.55)';
    U.roundRect(ctx, App.VW / 2 - 260, 20, 520, 62, 18); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(App.VW / 2 - 218, 51, 22, 0, U.TAU); ctx.fill();
    U.text(ctx, String(num), App.VW / 2 - 218, 52, { size: 24, color: '#fff', weight: 900 });
    U.text(ctx, title, App.VW / 2 + 20, 52, { size: 30, color: '#fff', weight: 900 });
    ctx.restore();
  }

  function makeBackBtn() {
    return new UI.Btn({
      x: 26, y: 24, w: 68, h: 68, label: '‹', font: 40,
      color: '#8e9b93', dark: '#5f6d66', radius: 34
    });
  }

  /* ---------- статус слизня ---------- */
  function status(ctx, slug, x, y, w = 470) {
    const h = 176;
    UI.panel(ctx, x, y, w, h, 18, 'rgba(12,20,17,0.78)');
    U.text(ctx, SlugModel.title(slug), x + 18, y + 28, { size: 23, color: '#eafff4', align: 'left', weight: 900, maxWidth: w - 36 });

    UI.progress(ctx, x + 18, y + 46, w - 36, 16, slug.hp / 100, '#e2574c', '');
    U.text(ctx, 'ЗДОРОВЬЕ ' + Math.round(slug.hp), x + 24, y + 54, { size: 12, color: '#fff', align: 'left', weight: 800 });
    UI.progress(ctx, x + 18, y + 68, w - 36, 16, slug.mood, '#4aa3e0', '');
    U.text(ctx, 'НАСТРОЕНИЕ', x + 24, y + 76, { size: 12, color: '#fff', align: 'left', weight: 800 });

    const bs = SlugModel.badges(slug);
    let bx = x + 18, by = y + 94;
    ctx.save();
    for (const b of bs) {
      ctx.font = `700 14px ${U.FONT}`;
      const bw = ctx.measureText(b.label).width + 22;
      if (bx + bw > x + w - 18) { bx = x + 18; by += 30; }
      if (by > y + h - 24) break;
      UI.chip(ctx, bx, by, b.label, b.color, 14);
      bx += bw + 7;
    }
    if (!bs.length) U.text(ctx, 'без эффектов', x + 22, by + 14, { size: 16, color: '#9fb3aa', align: 'left', weight: 700 });
    ctx.restore();
  }

  /** Подпись-шаг, например «Шаг 2 из 3» */
  function stepBadge(ctx, step, total, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    U.roundRect(ctx, x, y, 150, 34, 17); ctx.fill();
    U.text(ctx, `Шаг ${Math.min(step, total)} из ${total}`, x + 75, y + 17, { size: 17, color: '#cfe9dd', weight: 800 });
    ctx.restore();
  }

  /** Слизень «кричит» — вспомогательный эмиттер боли */
  function painBurst(parts, x, y, n = 14, col = '#ffdf6b') {
    parts.emit(n, () => ({
      kind: 'spark', x, y,
      vx: U.rand(-260, 260), vy: U.rand(-320, -60),
      grav: 520, life: U.rand(0.4, 0.9), size: U.rand(2, 5), col
    }));
  }

  global.Room = { Tw, drawPlain, drawLab, drawCounter, header, makeBackBtn, status, stepBadge, painBurst };
})(window);
