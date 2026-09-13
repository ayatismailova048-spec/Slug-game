/* ============================================================
   app.js — каркас: холст, ввод, экраны, переходы, тосты
   ============================================================ */
(function (global) {
  'use strict';

  const App = {
    VW: 1600, VH: 1000,
    canvas: null, ctx: null, dpr: 1,
    view: { scale: 1, ox: 0, oy: 0 },
    pointer: { x: -999, y: -999, down: false, justDown: false, justUp: false, dragging: false },
    screens: {}, screen: null, screenName: '',
    time: 0, slug: null, rot: false,
    toasts: [], shakeAmt: 0, trans: { a: 0, dir: 0, next: null, params: null },
    muted: false, paused: false
  };

  App.register = function (name, factory) { App.screens[name] = factory; };

  App.go = function (name, params) {
    if (App.trans.dir !== 0) return;
    App.trans.dir = 1; App.trans.next = name; App.trans.params = params || {};
  };

  function enterScreen(name, params) {
    if (App.screen && App.screen.exit) App.screen.exit();
    Sfx.stopAllLoops();
    const f = App.screens[name];
    if (!f) { console.error('Нет экрана:', name); return; }
    App.screen = typeof f === 'function' ? f(App) : f;
    App.screenName = name;
    if (App.screen.enter) App.screen.enter(params || {});
  }

  App.toast = function (msg, color) {
    App.toasts.push({ msg, color: color || '#ffffff', life: 2.6, age: 0 });
    if (App.toasts.length > 4) App.toasts.shift();
  };

  App.shake = function (amt) { App.shakeAmt = Math.min(26, App.shakeAmt + amt); };

  /* ---------- ввод ---------- */
  function toVirtual(cx, cy) {
    const r = App.canvas.getBoundingClientRect();
    let px = cx - r.left, py = cy - r.top;
    if (App.rot) { const tmp = px; px = py; py = r.width - tmp; }
    return {
      x: (px - App.view.ox) / App.view.scale,
      y: (py - App.view.oy) / App.view.scale
    };
  }

  function bindInput() {
    const c = App.canvas;
    const down = (e) => {
      Sfx.init();
      const t = e.touches ? e.touches[0] : e;
      const p = toVirtual(t.clientX, t.clientY);
      App.pointer.x = p.x; App.pointer.y = p.y;
      App.pointer.down = true; App.pointer.justDown = true;
      if (App.screen && App.screen.onDown) App.screen.onDown(App.pointer);
      if (e.cancelable) e.preventDefault();
    };
    const move = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const p = toVirtual(t.clientX, t.clientY);
      App.pointer.x = p.x; App.pointer.y = p.y;
      if (App.screen && App.screen.onMove) App.screen.onMove(App.pointer);
      if (e.touches && e.cancelable) e.preventDefault();
    };
    const up = (e) => {
      App.pointer.down = false; App.pointer.justUp = true;
      if (App.screen && App.screen.onUp) App.screen.onUp(App.pointer);
      if (e && e.cancelable) e.preventDefault();
    };
    c.addEventListener('mousedown', down);
    global.addEventListener('mousemove', move);
    global.addEventListener('mouseup', up);
    c.addEventListener('touchstart', down, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    global.addEventListener('touchend', up, { passive: false });
    global.addEventListener('touchcancel', up, { passive: false });
    global.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && App.screenName !== 'hub' && App.screenName !== 'title') App.go('hub');
      if (e.key === 'm' || e.key === 'M') App.toggleMute();
      if (App.screen && App.screen.onKey) App.screen.onKey(e);
    });
    global.addEventListener('blur', () => { Sfx.stopAllLoops(); });
  }

  App.toggleMute = function () {
    App.muted = !App.muted;
    Sfx.setMuted(App.muted);
    App.toast(App.muted ? 'Звук выключен' : 'Звук включён');
  };

  /* ---------- размер ---------- */
  const isTouch = () => {
    try { return global.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  };

  function resize() {
    const c = App.canvas;
    const w = c.clientWidth, h = c.clientHeight;
    App.dpr = Math.min(2, global.devicePixelRatio || 1);
    c.width = Math.round(w * App.dpr);
    c.height = Math.round(h * App.dpr);
    // на телефоне в вертикальном положении разворачиваем игру сами,
    // чтобы не просить пользователя крутить экран
    App.rot = isTouch() && h > w * 1.02;
    const availW = App.rot ? h : w;
    const availH = App.rot ? w : h;
    const s = Math.min(availW / App.VW, availH / App.VH);
    App.view.scale = s;
    App.view.ox = (availW - App.VW * s) / 2;
    App.view.oy = (availH - App.VH * s) / 2;
  }

  /* ---------- цикл ---------- */
  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const now = ts / 1000;
    let dt = last ? now - last : 0.016;
    last = now;
    dt = Math.min(dt, 0.05);
    App.time += dt;

    // переход между экранами
    const tr = App.trans;
    if (tr.dir === 1) {
      tr.a += dt * 4.5;
      if (tr.a >= 1) { tr.a = 1; enterScreen(tr.next, tr.params); tr.dir = -1; }
    } else if (tr.dir === -1) {
      tr.a -= dt * 4.5;
      if (tr.a <= 0) { tr.a = 0; tr.dir = 0; }
    }

    if (App.screen && App.screen.update) App.screen.update(dt);

    App.shakeAmt *= Math.pow(0.0025, dt);
    for (let i = App.toasts.length - 1; i >= 0; i--) {
      const t = App.toasts[i];
      t.age += dt;
      if (t.age > t.life) App.toasts.splice(i, 1);
    }

    render(dt);

    App.pointer.justDown = false;
    App.pointer.justUp = false;
  }

  function render(dt) {
    const ctx = App.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, App.canvas.width, App.canvas.height);
    ctx.fillStyle = '#0d1512';
    ctx.fillRect(0, 0, App.canvas.width, App.canvas.height);

    ctx.save();
    ctx.scale(App.dpr, App.dpr);
    if (App.rot) {
      ctx.translate(App.canvas.clientWidth, 0);
      ctx.rotate(Math.PI / 2);
    }
    ctx.translate(App.view.ox, App.view.oy);
    ctx.scale(App.view.scale, App.view.scale);
    // обрезаем по игровому полю
    ctx.beginPath(); ctx.rect(0, 0, App.VW, App.VH); ctx.clip();

    const sh = App.shakeAmt;
    if (sh > 0.2) ctx.translate((Math.random() * 2 - 1) * sh, (Math.random() * 2 - 1) * sh);

    if (App.screen && App.screen.draw) App.screen.draw(ctx);

    drawToasts(ctx);
    drawMuteBtn(ctx);

    if (App.trans.a > 0.001) {
      ctx.fillStyle = `rgba(8,14,12,${App.trans.a})`;
      ctx.fillRect(-50, -50, App.VW + 100, App.VH + 100);
    }
    ctx.restore();
  }

  function drawToasts(ctx) {
    App.toasts.forEach((t, i) => {
      const k = App.toasts.length - 1 - i;
      const a = U.clamp(Math.min(t.age * 4, (t.life - t.age) * 3), 0, 1);
      const y = App.VH - 60 - k * 52;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `800 22px ${U.FONT}`;
      const w = ctx.measureText(t.msg).width + 46;
      ctx.fillStyle = 'rgba(12,20,17,0.88)';
      U.roundRect(ctx, App.VW / 2 - w / 2, y - 22, w, 44, 22); ctx.fill();
      U.text(ctx, t.msg, App.VW / 2, y, { size: 22, color: t.color, weight: 800 });
      ctx.restore();
    });
  }

  const muteBox = { x: 1600 - 74, y: 18, w: 56, h: 56 };
  function drawMuteBtn(ctx) {
    const p = App.pointer;
    const hov = p.x >= muteBox.x && p.x <= muteBox.x + muteBox.w && p.y >= muteBox.y && p.y <= muteBox.y + muteBox.h;
    ctx.save();
    ctx.globalAlpha = hov ? 1 : 0.72;
    ctx.fillStyle = 'rgba(10,20,16,0.6)';
    U.roundRect(ctx, muteBox.x, muteBox.y, muteBox.w, muteBox.h, 14); ctx.fill();
    U.text(ctx, App.muted ? '🔇' : '🔊', muteBox.x + muteBox.w / 2, muteBox.y + muteBox.h / 2 + 1, { size: 26 });
    ctx.restore();
    if (hov && p.justDown) { App.toggleMute(); p.justDown = false; }
  }

  App.hitMute = function (p) {
    return p.x >= muteBox.x && p.x <= muteBox.x + muteBox.w && p.y >= muteBox.y && p.y <= muteBox.y + muteBox.h;
  };

  App.start = function (canvasId, firstScreen) {
    App.canvas = document.getElementById(canvasId);
    App.ctx = App.canvas.getContext('2d');
    App.slug = SlugModel.makeSlug();
    resize();
    global.addEventListener('resize', resize);
    bindInput();
    enterScreen(firstScreen, {});
    requestAnimationFrame(frame);
  };

  global.App = App;
})(window);
