/* ============================================================
   stations/shower.js — просто душ, вода уже льётся
   ============================================================ */
(function (global) {
  'use strict';

  const GROUND = 830;
  const TUB = { x: 820, y: 640, w: 700, h: 230 };
  const HOME = { x: 250, y: 740, s: 0.72 };

  StationImpl.shower = function () {
    let t = 0;
    const parts = new FX.Particles(600);
    const hold = new global.Holder(HOME);

    const inTub = (x, y) => Math.abs(x - TUB.x) < TUB.w / 2 + 30 && y > 420 && y < TUB.y + TUB.h;

    return {
      enter() { t = 0; hold.reset(); Sfx.loop('water', true, 0.9); },
      exit() { Sfx.loop('water', false); },

      update(dt) {
        t += dt; hold.tw.update(dt); parts.update(dt);
        Sfx.loop('water', true, 0.9);
        hold.hold(TUB.x, TUB.y + 6 + Math.sin(t * 1.6) * 5, 0.72);

        parts.emit(5, () => ({
          kind: 'drop', x: TUB.x + U.rand(-150, 150), y: 316,
          vy: U.rand(450, 800), vx: U.rand(-16, 16), grav: 900,
          life: U.rand(0.35, 0.6), size: U.rand(3, 7), col: 'rgba(160,220,250,0.85)'
        }));

        if (hold.inside && !hold.held) {
          SlugModel.apply(App.slug, 'shower', dt * 0.45);
          if (Math.random() < dt * 11) {
            parts.add({
              kind: 'bubble', x: hold.tw.x + U.rand(-110, 110), y: hold.tw.y + U.rand(10, 50),
              vy: U.rand(-55, -18), vx: U.rand(-20, 20), life: U.rand(1, 2.2),
              size: U.rand(4, 11), col: 'rgba(255,255,255,0.85)', alpha: 0.85
            });
          }
        }
      },

      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, App.VH);
        g.addColorStop(0, '#d6ecef'); g.addColorStop(0.6, '#aed3db'); g.addColorStop(1, '#93b7c1');
        ctx.fillStyle = g; ctx.fillRect(0, 0, App.VW, App.VH);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
        for (let x = 0; x <= App.VW; x += 110) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 880); ctx.stroke(); }
        for (let y = 0; y <= 880; y += 110) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(App.VW, y); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = '#85a7b1'; ctx.fillRect(0, 880, App.VW, App.VH - 880);

        // труба и лейка
        ctx.save();
        ctx.strokeStyle = '#c3cfd1'; ctx.lineWidth = 20; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(TUB.x, 20); ctx.lineTo(TUB.x, 250); ctx.stroke();
        ctx.strokeStyle = '#e7eff1'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(TUB.x, 20); ctx.lineTo(TUB.x, 250); ctx.stroke();
        U.shadowOn(ctx, 18, 'rgba(0,0,0,0.2)', 0, 10);
        const hg = ctx.createLinearGradient(0, 252, 0, 308);
        hg.addColorStop(0, '#f4f9fa'); hg.addColorStop(1, '#b3c2c4');
        ctx.fillStyle = hg;
        U.roundRect(ctx, TUB.x - 170, 252, 340, 56, 28); ctx.fill();
        U.shadowOff(ctx);
        ctx.fillStyle = '#7c8d91';
        for (let i = 0; i < 12; i++) {
          ctx.beginPath(); ctx.arc(TUB.x - 143 + i * 26, 306, 5, 0, U.TAU); ctx.fill();
        }
        ctx.restore();

        // струя
        FX.drawWaterStream(ctx, TUB.x, 308, TUB.y - 20, 310, t, 0.85, 3);

        // ванна
        ctx.save();
        U.shadowOn(ctx, 26, 'rgba(0,0,0,0.2)', 0, 14);
        ctx.fillStyle = '#f2f8f9';
        U.roundRect(ctx, TUB.x - TUB.w / 2, TUB.y - 60, TUB.w, TUB.h + 60, 96); ctx.fill();
        U.shadowOff(ctx);
        ctx.restore();

        // внутренняя чаша
        ctx.save();
        U.roundRect(ctx, TUB.x - TUB.w / 2 + 18, TUB.y - 44, TUB.w - 36, TUB.h + 26, 80);
        ctx.clip();
        const inner = ctx.createLinearGradient(0, TUB.y - 44, 0, TUB.y + TUB.h);
        inner.addColorStop(0, '#d7e5e8'); inner.addColorStop(0.45, '#f2f8f9'); inner.addColorStop(1, '#bed2d6');
        ctx.fillStyle = inner;
        ctx.fillRect(TUB.x - TUB.w / 2, TUB.y - 60, TUB.w, TUB.h + 80);
        ctx.fillStyle = '#9fb2b6';
        ctx.beginPath(); ctx.ellipse(TUB.x, TUB.y + TUB.h - 40, 30, 11, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#7d9195';
        ctx.beginPath(); ctx.ellipse(TUB.x, TUB.y + TUB.h - 40, 17, 6, 0, 0, U.TAU); ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 18;
        U.roundRect(ctx, TUB.x - TUB.w / 2, TUB.y - 60, TUB.w, TUB.h + 60, 96); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,180,190,0.5)'; ctx.lineWidth = 3;
        U.roundRect(ctx, TUB.x - TUB.w / 2 + 9, TUB.y - 51, TUB.w - 18, TUB.h + 42, 88); ctx.stroke();
        ctx.fillStyle = '#dbe7e9';
        U.roundRect(ctx, TUB.x - TUB.w / 2 + 46, TUB.y + TUB.h, 44, 50, 14); ctx.fill();
        U.roundRect(ctx, TUB.x + TUB.w / 2 - 90, TUB.y + TUB.h, 44, 50, 14); ctx.fill();
        ctx.restore();

        // слизень — рисуем поверх ванны целиком, чтобы его не обрезало бортом
        drawSlug(ctx);

        // вода спереди: нижняя половина слизня оказывается под водой
        ctx.save();
        U.roundRect(ctx, TUB.x - TUB.w / 2 + 18, TUB.y - 44, TUB.w - 36, TUB.h + 26, 80);
        ctx.clip();
        FX.drawLiquidSurface(ctx, TUB.x, TUB.y + 46, TUB.w, t, 'rgba(120,205,238,0.55)', 'rgba(30,120,160,0.65)', 5, 0.03);
        ctx.restore();

        parts.draw(ctx);
      },

      onDown(p) { hold.grab(p); },
      onMove(p) { hold.move(p); },
      onUp() { hold.release(inTub, () => Sfx.splash()); }
    };

    function drawSlug(ctx) {
      SlugArt.draw(ctx, App.slug, {
        x: hold.tw.x, y: hold.tw.y, scale: hold.tw.s, t,
        squash: 1 + Math.sin(t * (hold.inside ? 5 : 1.7)) * 0.04,
        look: { x: U.clamp((App.pointer.x - hold.tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - hold.tw.y) / 400, -1, 1) },
        shadow: !hold.inside
      });
    }
  };
})(window);
