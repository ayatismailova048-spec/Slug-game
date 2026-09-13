/* ============================================================
   stations/pills.js — прибор №5
   Шаги: взять таблетку из лотка → поднести к слизню → он глотает
   ============================================================ */
(function (global) {
  'use strict';

  const HOME = { x: 600, y: 654, s: 0.66 };
  const ORDER = ['violet', 'yellow', 'blue', 'cyan'];

  StationImpl.pills = function () {
    let t = 0;
    let held = null;          // ключ таблетки в «руке»
    let hx = 0, hy = 0;
    let swallow = 0;          // анимация глотания
    let swallowKey = null;
    let flash = 0, flashCol = null;
    const parts = new FX.Particles(400);
    const tw = new Room.Tw(HOME.x, HOME.y, HOME.s);
    let slots = [];

    function build() {
      slots = ORDER.map((k, i) => ({
        key: k, p: SlugModel.PILLS[k],
        x: 1090, y: 190 + i * 122, w: 400, h: 104, hov: 0
      }));
    }

    function feed(key) {
      swallowKey = key; swallow = 1;
      held = null;
      Sfx.gulp();
      const col = SlugModel.PILLS[key].col;
      flash = 1; flashCol = col;
      parts.emit(24, () => ({
        kind: 'spark', x: tw.x + 60, y: tw.y - 10,
        vx: U.rand(-200, 200), vy: U.rand(-260, -40), grav: 420,
        life: U.rand(0.5, 1), size: U.rand(2, 6), col: U.colStr(col)
      }));
      setTimeout(() => {
        SlugModel.apply(App.slug, 'pill', 1, { pill: key });
        App.toast(SlugModel.PILLS[key].effect, U.colStr(col, 1));
        Sfx.chime(key === 'cyan');
      }, 380);
    }

    function drawCapsule(ctx, x, y, key, s = 1, rot = 0) {
      const p = SlugModel.PILLS[key];
      const c1 = U.colStr(U.shade(p.col, -8));
      const c2 = U.colStr(U.shade(p.col, 26));
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      U.shadowOn(ctx, 12, 'rgba(0,0,0,0.35)', 0, 6);
      ctx.fillStyle = c1;
      U.roundRect(ctx, -42, -22, 84, 44, 22); ctx.fill();
      U.shadowOff(ctx);
      ctx.save();
      U.roundRect(ctx, -42, -22, 84, 44, 22); ctx.clip();
      ctx.fillStyle = c2;
      U.roundRect(ctx, -42, -22, 42, 44, 22); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      U.roundRect(ctx, -34, -16, 58, 11, 6); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      U.roundRect(ctx, -42, 10, 84, 12, 6); ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    return {
      enter() { build(); t = 0; tw.set(HOME.x, HOME.y, HOME.s); },

      update(dt) {
        t += dt; tw.update(dt); parts.update(dt);
        flash = Math.max(0, flash - dt * 1.8);
        if (swallow > 0) swallow = Math.max(0, swallow - dt * 2.6);
        for (const s of slots) {
          const h = App.pointer.x > s.x && App.pointer.x < s.x + s.w &&
                    App.pointer.y > s.y && App.pointer.y < s.y + s.h;
          s.hov += ((h ? 1 : 0) - s.hov) * Math.min(1, dt * 12);
        }
        if (held) { hx = U.lerp(hx, App.pointer.x, Math.min(1, dt * 22)); hy = U.lerp(hy, App.pointer.y, Math.min(1, dt * 22)); }
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#4a4266', wall2: '#2a2542', floor1: '#9a92b0', floor2: '#655d7d', horizon: 620 });
        Room.drawCounter(ctx, 120, 720, 780, 56, '#d6cfe4');

        // полка с лотком
        UI.panel(ctx, 1050, 140, 480, 560, 24, 'rgba(24,20,40,0.72)');
        U.text(ctx, 'АПТЕЧКА', 1290, 168, { size: 22, color: '#e2d7ff', weight: 900 });

        for (const s of slots) {
          ctx.save();
          const lift = s.hov * 4;
          ctx.globalAlpha = held === s.key ? 0.35 : 1;
          const g = ctx.createLinearGradient(0, s.y - lift, 0, s.y + s.h);
          g.addColorStop(0, 'rgba(255,255,255,0.16)');
          g.addColorStop(1, 'rgba(255,255,255,0.06)');
          ctx.fillStyle = g;
          U.roundRect(ctx, s.x, s.y - lift, s.w, s.h, 16); ctx.fill();
          if (s.hov > 0.02) {
            ctx.strokeStyle = U.colStr(s.p.col, s.hov); ctx.lineWidth = 3;
            U.roundRect(ctx, s.x + 1, s.y - lift + 1, s.w - 2, s.h - 2, 15); ctx.stroke();
          }
          drawCapsule(ctx, s.x + 62, s.y + s.h / 2 - lift, s.key, 0.9, -0.35 + Math.sin(t * 2 + s.y) * 0.05);
          U.text(ctx, s.p.name, s.x + 124, s.y + 36 - lift, { size: 22, color: '#fff', align: 'left', weight: 900 });
          U.text(ctx, s.p.effect, s.x + 124, s.y + 68 - lift, { size: 15, color: '#c7bbe6', align: 'left', weight: 700, maxWidth: s.w - 140 });
          ctx.restore();
        }

        // стакан воды
        ctx.save();
        ctx.fillStyle = 'rgba(220,240,255,0.35)';
        U.roundRect(ctx, 200, 560, 110, 160, 14); ctx.fill();
        ctx.save();
        U.roundRect(ctx, 202, 562, 106, 156, 13); ctx.clip();
        FX.drawLiquidSurface(ctx, 255, 620, 106, t, 'rgba(150,220,255,0.7)', 'rgba(60,150,200,0.8)', 3, 0.08);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4;
        U.roundRect(ctx, 200, 560, 110, 160, 14); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        U.roundRect(ctx, 214, 574, 18, 120, 9); ctx.fill();
        ctx.restore();

        // слизень
        const eating = swallow > 0.05;
        SlugArt.draw(ctx, App.slug, {
          x: tw.x, y: tw.y, scale: tw.s, t,
          squash: 1 + Math.sin(t * (eating ? 14 : 1.6)) * (eating ? 0.09 : 0.03),
          state: eating ? 'scream' : 'idle',
          look: held ? { x: U.clamp((hx - tw.x) / 300, -1, 1), y: U.clamp((hy - tw.y) / 300, -1, 1) }
                     : { x: U.clamp((App.pointer.x - tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - tw.y) / 400, -1, 1) }
        });

        // вспышка цвета при проглатывании
        if (flash > 0.01 && flashCol) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const gg = ctx.createRadialGradient(tw.x, tw.y, 10, tw.x, tw.y, 320);
          gg.addColorStop(0, U.colStr(U.shade(flashCol, 25), flash * 0.5));
          gg.addColorStop(1, U.colStr(flashCol, 0));
          ctx.fillStyle = gg;
          ctx.fillRect(tw.x - 360, tw.y - 360, 720, 720);
          ctx.restore();
        }
        parts.draw(ctx);

        // проглатываемая таблетка
        if (swallow > 0.05 && swallowKey) {
          const u = 1 - swallow;
          drawCapsule(ctx, U.lerp(hx, tw.x + 58, u), U.lerp(hy, tw.y + 12, u), swallowKey, 1 - u * 0.85, u * 3);
        }

        // таблетка в руке
        if (held) {
          drawCapsule(ctx, hx, hy, held, 1.05, Math.sin(t * 5) * 0.12);
          ctx.save();
          ctx.setLineDash([10, 10]);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tw.x + 50, tw.y + 10); ctx.stroke();
          ctx.restore();
        }

        // список съеденного
        if (App.slug.pills.length) {
          U.text(ctx, 'Съедено: ' + App.slug.pills.length, 1290, 668, { size: 18, color: '#c7bbe6', weight: 800 });
        }

        UI.hintBar(ctx, held ? 'Поднеси таблетку ко рту слизня и отпусти' : 'Выбери таблетку в аптечке',
          990, 852, 700, t, '#9a63dd');
        Room.stepBadge(ctx, held ? 2 : 1, 2, 1050, 716);
      },

      onDown(p) {
        for (const s of slots) {
          if (p.x > s.x && p.x < s.x + s.w && p.y > s.y && p.y < s.y + s.h) {
            held = s.key; hx = p.x; hy = p.y; Sfx.click(1.2);
            return;
          }
        }
        if (!held && U.dist(p.x, p.y, tw.x, tw.y) < 170) {
          Sfx.squish(1.1); App.slug.mood = U.clamp(App.slug.mood + 0.04, 0, 1);
        }
      },
      onMove(p) { if (held) { /* позиция берётся в update */ } },
      onUp(p) {
        if (held) {
          if (U.dist(p.x, p.y, tw.x + 50, tw.y) < 230) feed(held);
          else { App.toast('Мимо рта'); held = null; }
        }
      }
    };
  };
})(window);
