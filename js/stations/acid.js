/* ============================================================
   stations/acid.js — просто банка с кислотой
   ============================================================ */
(function (global) {
  'use strict';

  const GROUND = 830;
  const JAR = { x: 820, top: 230, bot: 806, w: 520 };
  const HOME = { x: 280, y: 726, s: 0.72 };
  const SURF = JAR.top + 80;

  StationImpl.acid = function () {
    let t = 0, screamT = 0, hissT = 0;
    const parts = new FX.Particles(500);
    const hold = new global.Holder(HOME);

    const inJar = (x, y) => Math.abs(x - JAR.x) < JAR.w / 2 + 40 && y > JAR.top - 60 && y < JAR.bot;

    return {
      enter() { t = 0; hold.reset(); },
      exit() { Sfx.loop('bubbles', false); },

      update(dt) {
        t += dt; hold.tw.update(dt); parts.update(dt);
        hold.hold(JAR.x + Math.sin(t * 0.9) * 12, SURF + 160 + Math.sin(t * 1.3) * 16, 0.66);

        if (hold.inside && !hold.held) {
          SlugModel.apply(App.slug, 'acid', dt * 0.12);
          Sfx.loop('bubbles', true, 1);
          screamT -= dt;
          if (screamT <= 0 && App.slug.alive) { Sfx.scream(0.8, 0.5); screamT = 0.6 + Math.random() * 0.4; }
          hissT -= dt;
          if (hissT <= 0) { Sfx.acidHiss(); hissT = 1.2 + Math.random(); }
          App.shake(dt * 4);
          parts.emit(1, () => ({
            kind: 'bubble', x: hold.tw.x + U.rand(-110, 110), y: hold.tw.y + U.rand(20, 70),
            vy: U.rand(-120, -50), life: U.rand(0.5, 1.2), size: U.rand(3, 11),
            col: 'rgba(230,255,170,0.95)', alpha: 1
          }));
          if (Math.random() < dt * 12) {
            parts.add({
              kind: 'smoke', x: hold.tw.x + U.rand(-90, 90), y: SURF - 10,
              vx: U.rand(-30, 30), vy: U.rand(-90, -40), life: U.rand(1.2, 2.4),
              size: U.rand(12, 26), alpha: 0.3
            });
          }
        } else {
          Sfx.loop('bubbles', false);
        }

        if (Math.random() < dt * 12) {
          parts.add({
            kind: 'bubble', x: JAR.x + U.rand(-JAR.w / 2 + 40, JAR.w / 2 - 40), y: JAR.bot - 30,
            vy: U.rand(-60, -25), life: U.rand(1.2, 2.6), size: U.rand(3, 9),
            col: 'rgba(210,255,150,0.8)', alpha: 0.8
          });
        }
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#41584a', wall2: '#233229', floor1: '#8f9a8d', floor2: '#5f6a5e', horizon: 700 });
        // зелёное свечение от банки
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gl = ctx.createRadialGradient(JAR.x, SURF, 20, JAR.x, SURF, 600);
        gl.addColorStop(0, 'rgba(150,255,60,0.20)');
        gl.addColorStop(1, 'rgba(150,255,60,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, App.VW, App.VH);
        ctx.restore();

        const jarPath = (c, inset = 0) => {
          U.roundRect(c, JAR.x - JAR.w / 2 + inset, JAR.top + inset,
            JAR.w - inset * 2, JAR.bot - JAR.top - inset * 2, 56 - inset);
        };

        ctx.save();
        U.shadowOn(ctx, 30, 'rgba(0,0,0,0.18)', 0, 16);
        ctx.fillStyle = 'rgba(235,245,235,0.6)';
        jarPath(ctx); ctx.fill();
        ctx.restore();

        // содержимое
        ctx.save();
        jarPath(ctx, 9); ctx.clip();
        FX.drawLiquidSurface(ctx, JAR.x, SURF, JAR.w, t, 'rgba(186,244,72,0.95)', 'rgba(74,146,18,0.97)', 7, 0.025);
        if (hold.inside || hold.tw.x > JAR.x - 260) drawSlug(ctx);
        ctx.save();
        ctx.globalAlpha = 0.16;
        FX.drawLiquidSurface(ctx, JAR.x, SURF, JAR.w, t, 'rgba(170,240,60,0.85)', 'rgba(60,140,20,0.7)', 7, 0.025);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(210,255,120,${0.5 + 0.2 * Math.sin(t * 3)})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let px = -JAR.w / 2; px <= JAR.w / 2; px += 6) {
          const yy = SURF + Math.sin(px * 0.025 + t * 2.2) * 7 + Math.sin(px * 0.07 - t * 3.1) * 3;
          if (px === -JAR.w / 2) ctx.moveTo(JAR.x + px, yy); else ctx.lineTo(JAR.x + px, yy);
        }
        ctx.stroke();
        ctx.restore();
        parts.draw(ctx);
        ctx.restore();

        // стекло
        ctx.save();
        const gg = ctx.createLinearGradient(JAR.x - JAR.w / 2, 0, JAR.x + JAR.w / 2, 0);
        gg.addColorStop(0, 'rgba(255,255,255,0.4)');
        gg.addColorStop(0.28, 'rgba(255,255,255,0.06)');
        gg.addColorStop(1, 'rgba(255,255,255,0.3)');
        ctx.fillStyle = gg; jarPath(ctx); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 8;
        jarPath(ctx); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        U.roundRect(ctx, JAR.x - JAR.w / 2 + 40, JAR.top + 60, 28, JAR.bot - JAR.top - 170, 14); ctx.fill();
        // горловина
        ctx.fillStyle = 'rgba(240,250,242,0.75)';
        U.roundRect(ctx, JAR.x - JAR.w / 2 - 18, JAR.top - 28, JAR.w + 36, 46, 23); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 6;
        U.roundRect(ctx, JAR.x - JAR.w / 2 - 18, JAR.top - 28, JAR.w + 36, 46, 23); ctx.stroke();
        ctx.restore();

        if (!hold.inside && hold.tw.x <= JAR.x - 260) drawSlug(ctx);
      },

      onDown(p) { hold.grab(p); },
      onMove(p) { hold.move(p); },
      onUp() {
        hold.release(inJar, () => {
          Sfx.splash(); App.shake(8);
          parts.emit(24, () => ({
            kind: 'bubble', x: JAR.x + U.rand(-130, 130), y: SURF + U.rand(-10, 40),
            vy: U.rand(-190, -60), life: U.rand(0.5, 1.3), size: U.rand(4, 14),
            col: 'rgba(230,255,170,0.95)', alpha: 1
          }));
          parts.emit(12, () => ({
            kind: 'drop', x: JAR.x + U.rand(-100, 100), y: SURF,
            vx: U.rand(-170, 170), vy: U.rand(-330, -120), grav: 900,
            life: U.rand(0.4, 0.8), size: U.rand(3, 8), col: 'rgba(190,245,90,0.9)'
          }));
        });
      }
    };

    function drawSlug(ctx) {
      const sub = hold.inside && !hold.held;
      if (hold.inside) {
        ctx.save();
        const r = 200 * hold.tw.s;
        const g = ctx.createRadialGradient(hold.tw.x, hold.tw.y, r * 0.3, hold.tw.x, hold.tw.y, r);
        g.addColorStop(0, 'rgba(14,46,6,0.7)');
        g.addColorStop(1, 'rgba(14,46,6,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(hold.tw.x, hold.tw.y, r, r * 0.8, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      SlugArt.draw(ctx, App.slug, {
        x: hold.tw.x, y: hold.tw.y, scale: hold.tw.s, t,
        squash: 1 + Math.sin(t * (sub ? 10 : 1.7)) * (sub ? 0.06 : 0.03),
        state: sub ? 'scream' : 'idle',
        rot: hold.inside ? Math.sin(t * 0.8) * 0.1 : 0,
        look: { x: U.clamp((App.pointer.x - hold.tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - hold.tw.y) / 400, -1, 1) },
        shadow: !hold.inside
      });
    }
  };
})(window);
