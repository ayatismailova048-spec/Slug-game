/* ============================================================
   stations/pills.js — просто таблетки: берёшь и суёшь слизню
   ============================================================ */
(function (global) {
  'use strict';

  const GROUND = 830;
  const HOME = { x: 520, y: 700, s: 0.95 };
  const ORDER = ['violet', 'yellow', 'blue', 'cyan', 'red', 'orange', 'pink', 'green'];

  StationImpl.pills = function () {
    let t = 0, held = null, hx = 0, hy = 0;
    let swallow = 0, swallowKey = null, flash = 0, flashCol = null;
    const parts = new FX.Particles(400);
    const hold = new global.Holder(HOME);
    let tray = [];

    function build() {
      const POS = [
        [980, 730], [1165, 712], [1345, 735], [1505, 710],
        [1010, 858], [1195, 886], [1375, 852], [1515, 882]
      ];
      tray = ORDER.map((k, i) => ({
        key: k, p: SlugModel.PILLS[k],
        x: POS[i][0], y: POS[i][1], taken: false
      }));
    }

    function feed(key) {
      swallowKey = key; swallow = 1; held = null;
      Sfx.swallow(0.9 + Math.random() * 0.25);
      const col = SlugModel.PILLS[key].col;
      flash = 1; flashCol = col;
      parts.emit(24, () => ({
        kind: 'spark', x: hold.tw.x, y: hold.tw.y - 10,
        vx: U.rand(-200, 200), vy: U.rand(-260, -40), grav: 420,
        life: U.rand(0.5, 1), size: U.rand(2, 6), col: U.colStr(col)
      }));
      setTimeout(() => {
        SlugModel.apply(App.slug, 'pill', 1, { pill: key });
      }, 380);
    }

    function capsule(ctx, x, y, key, s = 1, rot = 0) {
      const p = SlugModel.PILLS[key];
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      U.shadowOn(ctx, 14, 'rgba(0,0,0,0.28)', 0, 8);
      ctx.fillStyle = U.colStr(U.shade(p.col, -8));
      U.roundRect(ctx, -52, -27, 104, 54, 27); ctx.fill();
      U.shadowOff(ctx);
      ctx.save();
      U.roundRect(ctx, -52, -27, 104, 54, 27); ctx.clip();
      ctx.fillStyle = U.colStr(U.shade(p.col, 26));
      U.roundRect(ctx, -52, -27, 52, 54, 27); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      U.roundRect(ctx, -42, -20, 72, 13, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      U.roundRect(ctx, -52, 12, 104, 15, 8); ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    return {
      enter() { build(); t = 0; hold.reset(); },

      update(dt) {
        t += dt; hold.tw.update(dt); parts.update(dt);
        flash = Math.max(0, flash - dt * 1.8);
        if (swallow > 0) swallow = Math.max(0, swallow - dt * 2.6);
        if (held) { hx = U.lerp(hx, App.pointer.x, Math.min(1, dt * 22)); hy = U.lerp(hy, App.pointer.y, Math.min(1, dt * 22)); }
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#4a4266', wall2: '#2a2542', floor1: '#9a92b0', floor2: '#655d7d', horizon: 700 });

        // таблетки просто лежат
        tray.forEach((s, i) => {
          if (held === s.key) return;
          const bob = Math.sin(t * 2 + i) * 3;
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.10)';
          ctx.beginPath(); ctx.ellipse(s.x, s.y + 44, 54, 13, 0, 0, U.TAU); ctx.fill();
          ctx.restore();
          capsule(ctx, s.x, s.y + bob, s.key, 1.0, -0.4 + (i % 4) * 0.22);
        });

        const eating = swallow > 0.05;
        SlugArt.draw(ctx, App.slug, {
          x: hold.tw.x, y: hold.tw.y, scale: hold.tw.s, t,
          squash: 1 + Math.sin(t * (eating ? 14 : 1.6)) * (eating ? 0.09 : 0.03),
          state: eating ? 'scream' : 'idle',
          look: held ? { x: U.clamp((hx - hold.tw.x) / 300, -1, 1), y: U.clamp((hy - hold.tw.y) / 300, -1, 1) }
                     : { x: U.clamp((App.pointer.x - hold.tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - hold.tw.y) / 400, -1, 1) }
        });

        if (flash > 0.01 && flashCol) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const gg = ctx.createRadialGradient(hold.tw.x, hold.tw.y, 10, hold.tw.x, hold.tw.y, 340);
          gg.addColorStop(0, U.colStr(U.shade(flashCol, 25), flash * 0.5));
          gg.addColorStop(1, U.colStr(flashCol, 0));
          ctx.fillStyle = gg;
          ctx.fillRect(hold.tw.x - 380, hold.tw.y - 380, 760, 760);
          ctx.restore();
        }
        parts.draw(ctx);

        if (swallow > 0.05 && swallowKey) {
          const u = 1 - swallow;
          capsule(ctx, U.lerp(hx, hold.tw.x, u), U.lerp(hy, hold.tw.y + 10, u), swallowKey, 1 - u * 0.85, u * 3);
        }
        if (held) capsule(ctx, hx, hy, held, 1.2, Math.sin(t * 5) * 0.12);
      },

      onDown(p) {
        for (const s of tray) {
          if (U.dist(p.x, p.y, s.x, s.y) < 72) { held = s.key; hx = p.x; hy = p.y; Sfx.click(1.2); return; }
        }
        hold.grab(p);
      },
      onMove(p) { hold.move(p); },
      onUp(p) {
        if (held) {
          if (U.dist(p.x, p.y, hold.tw.x, hold.tw.y) < 240) feed(held);
          else held = null;
          return;
        }
        hold.release(() => false);
      }
    };
  };
})(window);
