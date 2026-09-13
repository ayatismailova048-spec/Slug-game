/* ============================================================
   screens/hub.js — лаборатория: выбор прибора, слизень в центре
   ============================================================ */
(function (global) {
  'use strict';

  App.register('hub', function () {
    let t = 0;
    let cards = [];
    let btns = [];
    const parts = new FX.Particles(300);
    let hoverCard = null;
    let bobPhase = 0;

    const CARD_W = 300, CARD_H = 168;
    const layout = [
      { x: 46, y: 132 }, { x: 46, y: 330 }, { x: 46, y: 528 },
      { x: 1254, y: 132 }, { x: 1254, y: 330 }, { x: 1254, y: 528 },
      { x: 650, y: 792 }
    ];

    function buildCards() {
      cards = STATIONS.map((s, i) => ({
        st: s, x: layout[i].x, y: layout[i].y, w: CARD_W, h: CARD_H, hov: 0
      }));
    }

    return {
      enter() {
        t = 0;
        buildCards();
        btns = [
          new UI.Btn({
            x: 1054, y: 792, w: 232, h: 74, label: 'Сохранения', icon: '💾', font: 21,
            color: '#4d8ec9', dark: '#2c5f8f', onClick: () => App.go('saves')
          }),
          new UI.Btn({
            x: 1300, y: 792, w: 232, h: 74, label: 'Карта', icon: '🗺', font: 21,
            color: '#7d5cc9', dark: '#4e358c', onClick: () => App.go('map')
          }),
          new UI.Btn({
            x: 1300, y: 878, w: 232, h: 62, label: 'Новый слизень', font: 17,
            color: '#63776e', dark: '#3d4c46',
            onClick: () => {
              App.slug = SlugModel.makeSlug();
              Sfx.squish(1.2); App.toast('Из бака достали свежего слизня', '#8ce06a');
            }
          })
        ];
      },
      update(dt) {
        t += dt; bobPhase += dt;
        parts.update(dt);
        hoverCard = null;
        for (const c of cards) {
          const h = App.pointer.x >= c.x && App.pointer.x <= c.x + c.w &&
                    App.pointer.y >= c.y && App.pointer.y <= c.y + c.h;
          if (h) hoverCard = c;
          c.hov += ((h ? 1 : 0) - c.hov) * Math.min(1, dt * 12);
        }
        btns.forEach((b) => b.update(dt, App.pointer, App.pointer.down));
        // пузырьки из бака
        if (Math.random() < dt * 3) {
          parts.add({
            kind: 'bubble', x: 800 + U.rand(-120, 120), y: 660,
            vy: U.rand(-40, -16), life: U.rand(2, 4), size: U.rand(3, 9),
            col: 'rgba(190,255,180,0.7)', alpha: 0.7
          });
        }
      },
      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#3d5a51', wall2: '#243b35', horizon: 640 });

        // вывеска
        ctx.save();
        UI.panel(ctx, App.VW / 2 - 330, 24, 660, 84, 22, 'rgba(10,20,16,0.72)');
        U.text(ctx, 'ЛАБОРАТОРИЯ СЛИЗНЯ', App.VW / 2, 66, {
          size: 40, color: '#eafff0', weight: 900, stroke: 'rgba(0,0,0,0.35)', strokeW: 5
        });
        ctx.restore();

        // постамент
        const px = 800, py = 660;
        ctx.save();
        U.shadowOn(ctx, 30, 'rgba(0,0,0,0.4)', 0, 12);
        ctx.fillStyle = '#b9c4bd';
        ctx.beginPath(); ctx.ellipse(px, py, 210, 52, 0, 0, U.TAU); ctx.fill();
        U.shadowOff(ctx);
        ctx.fillStyle = '#8e9b94';
        ctx.beginPath(); ctx.ellipse(px, py + 14, 200, 44, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(px - 40, py - 14, 90, 18, -0.2, 0, U.TAU); ctx.fill();
        ctx.restore();

        parts.draw(ctx);

        // слизень
        const slug = App.slug;
        const look = {
          x: U.clamp((App.pointer.x - px) / 520, -1, 1),
          y: U.clamp((App.pointer.y - 520) / 420, -1, 1)
        };
        SlugArt.draw(ctx, slug, {
          x: px, y: 566 + Math.sin(bobPhase * 1.7) * 6, scale: 0.92, t,
          look, squash: 1 + Math.sin(bobPhase * 1.9) * 0.035
        });

        // имя над слизнем
        ctx.save();
        ctx.font = `800 26px ${U.FONT}`;
        const nm = SlugModel.title(slug);
        const nw = ctx.measureText(nm).width + 48;
        ctx.fillStyle = 'rgba(10,20,16,0.72)';
        U.roundRect(ctx, px - nw / 2, 232, nw, 44, 22); ctx.fill();
        U.text(ctx, nm, px, 254, { size: 24, color: '#d8ffe8', weight: 800 });
        ctx.restore();

        // карточки приборов
        for (const c of cards) drawCard(ctx, c, t);

        // статус
        Room.status(ctx, slug, 46, 786, 480);

        btns.forEach((b) => b.draw(ctx, t));

        // подсказка внизу карточки под курсором
        if (hoverCard) {
          ctx.save();
          ctx.font = `700 19px ${U.FONT}`;
          const w = ctx.measureText(hoverCard.st.desc).width + 40;
          const hx = U.clamp(App.pointer.x, w / 2 + 10, App.VW - w / 2 - 10);
          const hy = U.clamp(App.pointer.y - 52, 40, App.VH - 40);
          ctx.fillStyle = 'rgba(8,16,13,0.92)';
          U.roundRect(ctx, hx - w / 2, hy - 20, w, 40, 20); ctx.fill();
          U.text(ctx, hoverCard.st.desc, hx, hy, { size: 19, color: '#eafff0', weight: 700 });
          ctx.restore();
        }
      },
      onDown(p) {
        for (const b of btns) if (b.hit(p)) { Sfx.click(); b.onClick(); return; }
        for (const c of cards) {
          if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
            Sfx.click(); Sfx.squish(0.9);
            App.go('station', { id: c.st.id });
            return;
          }
        }
        // тычок в слизня
        if (U.dist(p.x, p.y, 800, 540) < 180) {
          Sfx.squish(1.1 + Math.random() * 0.3);
          App.slug.mood = U.clamp(App.slug.mood + 0.05, 0, 1);
          Room.painBurst(parts, 800, 520, 6, '#bff0a0');
        }
      }
    };

    function drawCard(ctx, c, t) {
      const lift = c.hov * 8;
      const x = c.x, y = c.y - lift;
      ctx.save();
      U.shadowOn(ctx, 20 + c.hov * 16, 'rgba(0,0,0,0.45)', 0, 10 + c.hov * 6);
      const g = ctx.createLinearGradient(0, y, 0, y + c.h);
      g.addColorStop(0, 'rgba(250,255,252,0.96)');
      g.addColorStop(1, 'rgba(214,228,220,0.96)');
      ctx.fillStyle = g;
      U.roundRect(ctx, x, y, c.w, c.h, 20); ctx.fill();
      U.shadowOff(ctx);
      // цветная полоса
      ctx.save();
      U.roundRect(ctx, x, y, c.w, c.h, 20); ctx.clip();
      ctx.fillStyle = c.st.color;
      ctx.fillRect(x, y, c.w, 10);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = c.st.color;
      ctx.fillRect(x, y, c.w, c.h);
      ctx.restore();
      // рамка при наведении
      if (c.hov > 0.02) {
        ctx.strokeStyle = c.st.color;
        ctx.lineWidth = 3 + c.hov * 2;
        ctx.globalAlpha = c.hov;
        U.roundRect(ctx, x + 2, y + 2, c.w - 4, c.h - 4, 18); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // номер
      ctx.fillStyle = c.st.dark;
      ctx.beginPath(); ctx.arc(x + 34, y + 42, 22, 0, U.TAU); ctx.fill();
      U.text(ctx, String(c.st.num), x + 34, y + 43, { size: 24, color: '#fff', weight: 900 });
      // иконка
      Icons[c.st.icon](ctx, x + c.w - 86, y + c.h / 2 + 6, 0.78 + c.hov * 0.06, t);
      // название
      U.text(ctx, c.st.name, x + 22, y + 96, {
        size: 28, color: '#1d2a24', align: 'left', weight: 900, maxWidth: c.w - 168
      });
      U.text(ctx, 'войти ›', x + 22, y + 132, { size: 18, color: c.st.dark, align: 'left', weight: 800 });
      ctx.restore();
    }
  });
})(window);
