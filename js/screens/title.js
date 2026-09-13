/* ============================================================
   screens/title.js — заставка
   ============================================================ */
(function (global) {
  'use strict';

  App.register('title', function () {
    let t = 0;
    const parts = new FX.Particles(200);
    const slug = SlugModel.makeSlug({ seed: 777 });
    let btns = [];

    return {
      enter() {
        t = 0;
        btns = [
          new UI.Btn({
            x: App.VW / 2 - 180, y: 660, w: 360, h: 84, label: 'ИГРАТЬ', font: 30,
            color: UI.PAL.mint, dark: UI.PAL.mintDark, pulse: true,
            onClick: () => { Sfx.init(); Sfx.chime(true); App.go('hub'); }
          }),
          new UI.Btn({
            x: App.VW / 2 - 180, y: 762, w: 172, h: 62, label: 'Сохранения', font: 19,
            color: '#63776e', dark: '#3d4c46',
            onClick: () => { Sfx.init(); App.go('saves'); }
          }),
          new UI.Btn({
            x: App.VW / 2 + 8, y: 762, w: 172, h: 62, label: 'Карта', font: 19,
            color: '#63776e', dark: '#3d4c46',
            onClick: () => { Sfx.init(); App.go('map'); }
          })
        ];
      },
      update(dt) {
        t += dt;
        parts.update(dt);
        if (Math.random() < dt * 6) {
          parts.add({
            kind: 'bubble', x: U.rand(0, App.VW), y: App.VH + 20,
            vy: U.rand(-60, -22), vx: U.rand(-12, 12),
            life: U.rand(4, 8), size: U.rand(5, 18),
            col: 'rgba(150,230,140,0.6)', alpha: 0.6
          });
        }
        btns.forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },
      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, App.VH);
        g.addColorStop(0, '#16302a'); g.addColorStop(0.6, '#1e4239'); g.addColorStop(1, '#0e211c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, App.VW, App.VH);
        parts.draw(ctx);

        // круг света
        const lg = ctx.createRadialGradient(App.VW / 2, 430, 20, App.VW / 2, 430, 520);
        lg.addColorStop(0, 'rgba(120,255,190,0.16)');
        lg.addColorStop(1, 'rgba(120,255,190,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, App.VW, App.VH);

        SlugArt.draw(ctx, slug, {
          x: App.VW / 2, y: 452, scale: 1.2, t,
          look: { x: U.clamp((App.pointer.x - App.VW / 2) / 500, -1, 1), y: U.clamp((App.pointer.y - 400) / 400, -1, 1) },
          squash: 1 + Math.sin(t * 1.6) * 0.03
        });

        U.text(ctx, 'ЛАБОРАТОРИЯ', App.VW / 2, 130, {
          size: 78, color: '#eaffe9', weight: 900, stroke: 'rgba(6,20,14,0.85)', strokeW: 12
        });
        U.text(ctx, 'СЛИЗНЯ', App.VW / 2, 214, {
          size: 96, color: '#8ce06a', weight: 900, stroke: 'rgba(6,20,14,0.85)', strokeW: 12
        });
        U.text(ctx, 'блендер · костёр · кислота · душ · таблетки · сковорода · лёд',
          App.VW / 2, 624, { size: 22, color: '#b9d8c8', weight: 700 });

        btns.forEach((b) => b.draw(ctx, t));
        U.text(ctx, 'ESC — назад в лабораторию · M — звук', App.VW / 2, 952, { size: 16, color: '#7e9a8c', weight: 700 });
      },
      onDown(p) {
        for (const b of btns) if (b.hit(p) && b.enabled) { Sfx.click(); b.onClick(); return; }
      }
    };
  });
})(window);
