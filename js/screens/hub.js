/* ============================================================
   screens/hub.js — приборы вокруг слизня, без единой надписи
   ============================================================ */
(function (global) {
  'use strict';

  App.register('hub', function () {
    let t = 0;
    let spots = [];
    let btns = [];
    const parts = new FX.Particles(200);

    const POS = [
      { x: 240, y: 250 },   // 1 блендер
      { x: 240, y: 580 },   // 2 костёр
      { x: 360, y: 860 },   // 3 кислота
      { x: 1360, y: 250 },  // 4 душ
      { x: 1360, y: 580 },  // 5 таблетки
      { x: 1240, y: 860 },  // 6 сковорода
      { x: 800, y: 180 }    // 7 лёд
    ];
    const SLUG = { x: 800, y: 600 };

    function build() {
      spots = STATIONS.map((s, i) => ({ st: s, x: POS[i].x, y: POS[i].y, hov: 0 }));
      const mk = (x, y, icon, on) => new UI.Btn({
        x, y, w: 74, h: 74, label: icon, font: 32, radius: 37,
        color: '#9aa8a0', dark: '#6a786f', onClick: on
      });
      btns = [
        mk(36, 40, '💾', () => App.go('saves')),
        mk(36, 130, '🗺', () => App.go('map')),
        mk(36, 220, '✨', () => {
          App.slug = SlugModel.makeSlug();
          Sfx.squish(1.2);
          parts.emit(18, () => ({
            kind: 'spark', x: SLUG.x, y: SLUG.y - 40,
            vx: U.rand(-260, 260), vy: U.rand(-320, -60), grav: 500,
            life: U.rand(0.5, 1), size: U.rand(2, 6), col: '#8ce06a'
          }));
        })
      ];
    }

    return {
      enter() { build(); t = 0; },
      update(dt) {
        t += dt;
        parts.update(dt);
        for (const s of spots) {
          const h = U.dist(App.pointer.x, App.pointer.y, s.x, s.y) < 120 ? 1 : 0;
          s.hov += (h - s.hov) * Math.min(1, dt * 12);
        }
        btns.forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },
      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#3d5a51', wall2: '#243b35', horizon: 700 });

        for (const s of spots) {
          const lift = s.hov * 8;
          ctx.save();
          // мягкая подложка
          ctx.fillStyle = `rgba(250,253,250,${0.86 + s.hov * 0.12})`;
          U.shadowOn(ctx, 20 + s.hov * 16, 'rgba(0,0,0,0.4)', 0, 10 + s.hov * 5);
          ctx.beginPath(); ctx.arc(s.x, s.y - lift, 104, 0, U.TAU); ctx.fill();
          U.shadowOff(ctx);
          ctx.restore();
          Icons[s.st.icon](ctx, s.x, s.y - lift, 1.25 + s.hov * 0.12, t);
        }

        parts.draw(ctx);

        SlugArt.draw(ctx, App.slug, {
          x: SLUG.x, y: SLUG.y + Math.sin(t * 1.7) * 7, scale: 1.25, t,
          squash: 1 + Math.sin(t * 1.9) * 0.035,
          look: {
            x: U.clamp((App.pointer.x - SLUG.x) / 520, -1, 1),
            y: U.clamp((App.pointer.y - SLUG.y) / 440, -1, 1)
          }
        });

        btns.forEach((b) => b.draw(ctx, t));
      },
      onDown(p) {
        for (const b of btns) if (b.hit(p)) { Sfx.click(); b.onClick(); return; }
        for (const s of spots) {
          if (U.dist(p.x, p.y, s.x, s.y) < 120) {
            Sfx.click(); Sfx.squish(0.9);
            App.go('station', { id: s.st.id });
            return;
          }
        }
        if (U.dist(p.x, p.y, SLUG.x, SLUG.y) < 200) {
          Sfx.squish(1.1 + Math.random() * 0.3);
          App.slug.mood = U.clamp(App.slug.mood + 0.05, 0, 1);
        }
      }
    };
  });
})(window);
