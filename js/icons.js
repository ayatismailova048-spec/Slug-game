/* ============================================================
   icons.js — миниатюрные иллюстрации приборов для меню
   ============================================================ */
(function (global) {
  'use strict';

  function base(ctx, x, y, s, fn) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); fn(ctx); ctx.restore();
  }

  const I = {};

  I.blender = (ctx, x, y, s, t) => base(ctx, x, y, s, (c) => {
    // основание
    c.fillStyle = '#33463f';
    U.roundRect(c, -34, 20, 68, 34, 8); c.fill();
    c.fillStyle = '#22332e';
    U.roundRect(c, -40, 46, 80, 12, 6); c.fill();
    // кнопка
    c.fillStyle = '#e2574c';
    c.beginPath(); c.arc(0, 37, 6, 0, U.TAU); c.fill();
    // чаша
    c.fillStyle = 'rgba(220,240,245,0.45)';
    c.beginPath();
    c.moveTo(-28, 18); c.lineTo(-22, -42); c.lineTo(22, -42); c.lineTo(28, 18); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2.5; c.stroke();
    // содержимое
    c.fillStyle = 'rgba(120,190,80,0.85)';
    c.beginPath();
    c.moveTo(-26, 18); c.lineTo(-24, -8); c.lineTo(24, -8); c.lineTo(26, 18); c.closePath(); c.fill();
    // ручка
    c.strokeStyle = '#9aa8a1'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(26, -30); c.quadraticCurveTo(46, -14, 26, 4); c.stroke();
    // крышка
    c.fillStyle = '#5d6f67';
    U.roundRect(c, -26, -52, 52, 12, 5); c.fill();
    // ножи
    c.save(); c.translate(0, 12); c.rotate(t * 6);
    c.fillStyle = '#c3ccc7';
    U.roundRect(c, -18, -2, 36, 4, 2); c.fill();
    c.rotate(Math.PI / 2);
    U.roundRect(c, -14, -2, 28, 4, 2); c.fill();
    c.restore();
  });

  I.fire = (ctx, x, y, s, t) => base(ctx, x, y, s, (c) => {
    // камни
    c.fillStyle = '#8d968f';
    [[-42, 34], [42, 34], [-14, 40], [16, 40]].forEach(([px, py], i) => {
      c.beginPath(); c.ellipse(px, py, 15 - i, 10, 0, 0, U.TAU); c.fill();
    });
    // дрова
    c.strokeStyle = '#6b4420'; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-30, 36); c.lineTo(18, 6); c.stroke();
    c.beginPath(); c.moveTo(30, 36); c.lineTo(-18, 6); c.stroke();
    c.strokeStyle = '#4c2f14'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(-26, 32); c.lineTo(14, 8); c.stroke();
    FX.drawFire(c, 0, 18, 30, 62, t, 1, 9);
  });

  I.acid = (ctx, x, y, s, t) => base(ctx, x, y, s, (c) => {
    // бутыль
    c.fillStyle = '#1f6b25';
    U.roundRect(c, 20, -46, 34, 62, 8); c.fill();
    c.fillStyle = '#2e8b34';
    U.roundRect(c, 24, -42, 26, 54, 6); c.fill();
    c.fillStyle = '#1f6b25';
    U.roundRect(c, 31, -58, 12, 16, 4); c.fill();
    c.fillStyle = '#d7ff8a';
    c.beginPath(); c.ellipse(37, -14, 8, 11, 0, 0, U.TAU); c.fill();
    // лужа кислоты
    const harm = U.makeHarmonics(4, 3, 0.07);
    const pts = U.blobPoints(-22, 16, 42, 20, harm, t, 40, 1);
    U.smoothPath(c, pts);
    const g = c.createLinearGradient(0, -6, 0, 40);
    g.addColorStop(0, '#a8f03c'); g.addColorStop(1, '#4c9412');
    c.fillStyle = g; c.fill();
    // пузыри
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.7 + i * 0.31) % 1;
      c.strokeStyle = `rgba(255,255,255,${0.8 - ph * 0.8})`;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(-44 + i * 12, 16 - ph * 26, 3 + i * 0.7, 0, U.TAU); c.stroke();
    }
  });

  I.shower = (ctx, x, y, s, t) => base(ctx, x, y, s, (c) => {
    // труба и лейка
    c.strokeStyle = '#b9c4bd'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -62); c.lineTo(0, -40); c.stroke();
    c.fillStyle = '#cfd8d2';
    U.roundRect(c, -22, -42, 44, 12, 6); c.fill();
    // вода
    FX.drawWaterStream(c, 0, -28, 22, 36, t, 0.9, 5);
    // ванна
    c.fillStyle = '#dfe6e2';
    U.roundRect(c, -46, 18, 92, 30, 15); c.fill();
    c.fillStyle = '#1fb3ae';
    U.roundRect(c, -40, 20, 80, 14, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    U.roundRect(c, -34, 22, 30, 5, 3); c.fill();
  });

  I.pills = (ctx, x, y, s, t) => base(ctx, x, y, s, (c) => {
    const caps = [
      [-30, -20, '#6f2fb8', '#a06ce0', -0.6],
      [12, -26, '#e0a21c', '#f5cd63', 0.5],
      [-22, 20, '#2540c8', '#6f86ea', 0.3],
      [22, 16, '#2aa5d6', '#7fd6f0', -0.4]
    ];
    caps.forEach(([px, py, c1, c2, rot], i) => {
      const bob = Math.sin(t * 2 + i) * 2;
      c.save(); c.translate(px, py + bob); c.rotate(rot);
      c.fillStyle = c1; U.roundRect(c, -20, -11, 40, 22, 11); c.fill();
      c.fillStyle = c2; U.roundRect(c, -20, -11, 20, 22, 11); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)';
      U.roundRect(c, -15, -8, 24, 6, 3); c.fill();
      c.restore();
    });
  });

  I.pan = (ctx, x, y, s, t) => base(ctx, x, y, s, (c) => {
    // масло
    c.fillStyle = '#1f6b25';
    U.roundRect(c, 32, -50, 26, 46, 6); c.fill();
    c.fillStyle = '#8ec63f';
    c.beginPath(); c.ellipse(45, -28, 7, 10, 0, 0, U.TAU); c.fill();
    // сковорода
    c.fillStyle = '#20232a';
    c.beginPath(); c.ellipse(-6, 12, 52, 22, 0, 0, U.TAU); c.fill();
    c.fillStyle = '#3a3f47';
    c.beginPath(); c.ellipse(-6, 8, 46, 18, 0, 0, U.TAU); c.fill();
    c.fillStyle = 'rgba(255,220,150,0.35)';
    c.beginPath(); c.ellipse(-16, 4, 20, 7, -0.3, 0, U.TAU); c.fill();
    // ручка
    c.strokeStyle = '#20232a'; c.lineWidth = 10; c.lineCap = 'round';
    c.beginPath(); c.moveTo(40, 6); c.lineTo(72, -10); c.stroke();
    // огонь конфорки
    FX.drawFire(c, -6, 34, 26, 24, t, 0.7, 17);
  });

  I.ice = (ctx, x, y, s, t) => base(ctx, x, y, s, (c) => {
    const cube = (px, py, sz, rot) => {
      c.save(); c.translate(px, py); c.rotate(rot);
      const g = c.createLinearGradient(-sz, -sz, sz, sz);
      g.addColorStop(0, 'rgba(230,250,255,0.95)');
      g.addColorStop(0.5, 'rgba(150,205,240,0.8)');
      g.addColorStop(1, 'rgba(200,238,255,0.9)');
      c.fillStyle = g;
      U.roundRect(c, -sz, -sz, sz * 2, sz * 2, sz * 0.28); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.4; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-sz * 0.4, -sz * 0.5); c.lineTo(sz * 0.1, sz * 0.2); c.stroke();
      c.restore();
    };
    cube(-26, 8, 24, -0.15);
    cube(18, 18, 20, 0.25);
    cube(6, -24, 22, 0.1);
    // морозный пар
    c.save();
    c.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2);
    c.fillStyle = '#eaffff';
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.35 + i * 0.25) % 1;
      c.beginPath(); c.arc(-30 + i * 20, 34 - ph * 20, 8 * (1 - ph * 0.4), 0, U.TAU); c.fill();
    }
    c.restore();
  });

  global.Icons = I;
})(window);
