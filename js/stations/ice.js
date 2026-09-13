/* ============================================================
   stations/ice.js — просто ящик со льдом: кинул — замёрз
   ============================================================ */
(function (global) {
  'use strict';

  const GROUND = 830;
  const BOX = { x: 820, top: 340, bot: 812, w: 760 };
  const HOME = { x: 240, y: 726, s: 0.72 };

  StationImpl.ice = function () {
    let t = 0;
    const parts = new FX.Particles(500);
    const hold = new global.Holder(HOME);
    const cubes = [];

    function build() {
      const rnd = U.mulberry32(11);
      cubes.length = 0;
      for (let i = 0; i < 14; i++) {
        cubes.push({
          x: BOX.x - BOX.w / 2 + 60 + rnd() * (BOX.w - 120),
          y: BOX.bot - 50 - rnd() * 150,
          s: 30 + rnd() * 30, r: rnd() * 1.4
        });
      }
    }

    const inBox = (x, y) => Math.abs(x - BOX.x) < BOX.w / 2 && y > BOX.top - 40 && y < BOX.bot;

    return {
      enter() { build(); t = 0; hold.reset(); Sfx.loop('freezer', true, 1); },
      exit() { Sfx.loop('freezer', false); },

      update(dt) {
        t += dt; hold.tw.update(dt); parts.update(dt);
        hold.hold(BOX.x, BOX.bot - 190 + Math.sin(t * 1.2) * 5, 0.62);

        if (Math.random() < dt * 10) {
          parts.add({
            kind: 'steam', x: BOX.x + U.rand(-260, 260), y: BOX.top + 40,
            vx: U.rand(-30, 30), vy: U.rand(20, 60), grav: 26,
            life: U.rand(1.4, 2.6), size: U.rand(16, 34), alpha: 0.4
          });
        }

        if (hold.inside && !hold.held) {
          SlugModel.apply(App.slug, 'freeze', dt * 0.14);
          if (Math.random() < dt * 22) {
            parts.add({
              kind: 'frost', x: hold.tw.x + U.rand(-130, 130), y: hold.tw.y + U.rand(-70, 70),
              vx: U.rand(-14, 14), vy: U.rand(-10, 24), rot: U.rand(0, 6), vr: U.rand(-2, 2),
              life: U.rand(0.8, 2), size: U.rand(4, 12), alpha: 0.9
            });
          }
        }
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#3c5567', wall2: '#1f3140', floor1: '#93a5ae', floor2: '#5d6f78', horizon: 700 });
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cg2 = ctx.createRadialGradient(BOX.x, BOX.bot - 200, 30, BOX.x, BOX.bot - 200, 700);
        cg2.addColorStop(0, 'rgba(120,200,255,0.16)');
        cg2.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = cg2; ctx.fillRect(0, 0, App.VW, App.VH);
        ctx.restore();

        // ящик
        ctx.save();
        U.shadowOn(ctx, 30, 'rgba(0,0,0,0.2)', 0, 16);
        const bg = ctx.createLinearGradient(0, BOX.top, 0, BOX.bot);
        bg.addColorStop(0, '#f2f8fb'); bg.addColorStop(1, '#c3d4dc');
        ctx.fillStyle = bg;
        U.roundRect(ctx, BOX.x - BOX.w / 2, BOX.top, BOX.w, BOX.bot - BOX.top, 34); ctx.fill();
        U.shadowOff(ctx);
        ctx.restore();

        // внутренность
        ctx.save();
        U.roundRect(ctx, BOX.x - BOX.w / 2 + 26, BOX.top + 26, BOX.w - 52, BOX.bot - BOX.top - 52, 24);
        ctx.clip();
        const ing = ctx.createLinearGradient(0, BOX.top, 0, BOX.bot);
        ing.addColorStop(0, '#89a9bb'); ing.addColorStop(1, '#dceaf2');
        ctx.fillStyle = ing;
        ctx.fillRect(BOX.x - BOX.w / 2, BOX.top, BOX.w, BOX.bot - BOX.top);

        // задние кубики льда
        cubes.slice(0, 7).forEach((c) => drawCube(ctx, c));
        if (hold.inside || hold.tw.x > BOX.x - 320) drawSlug(ctx);
        cubes.slice(7).forEach((c) => drawCube(ctx, c));
        parts.draw(ctx);

        // холодная дымка
        ctx.save();
        ctx.globalAlpha = 0.35;
        const fg = ctx.createLinearGradient(0, BOX.bot - 200, 0, BOX.bot);
        fg.addColorStop(0, 'rgba(255,255,255,0)');
        fg.addColorStop(1, 'rgba(240,252,255,0.95)');
        ctx.fillStyle = fg;
        ctx.fillRect(BOX.x - BOX.w / 2, BOX.bot - 200, BOX.w, 200);
        ctx.restore();
        ctx.restore();

        // рамка
        ctx.save();
        ctx.strokeStyle = '#eef6fa'; ctx.lineWidth = 22;
        U.roundRect(ctx, BOX.x - BOX.w / 2 + 12, BOX.top + 12, BOX.w - 24, BOX.bot - BOX.top - 24, 28);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(140,170,185,0.5)'; ctx.lineWidth = 3;
        U.roundRect(ctx, BOX.x - BOX.w / 2 + 26, BOX.top + 26, BOX.w - 52, BOX.bot - BOX.top - 52, 24);
        ctx.stroke();
        ctx.restore();

        if (!hold.inside && hold.tw.x <= BOX.x - 320) drawSlug(ctx);
      },

      onDown(p) { hold.grab(p); },
      onMove(p) { hold.move(p); },
      onUp() { hold.release(inBox, () => { Sfx.freezeZap(); App.shake(5); }); }
    };

    function drawCube(ctx, c) {
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(c.r);
      const g = ctx.createLinearGradient(-c.s, -c.s, c.s, c.s);
      g.addColorStop(0, 'rgba(240,253,255,0.95)');
      g.addColorStop(0.5, 'rgba(168,214,240,0.85)');
      g.addColorStop(1, 'rgba(214,242,255,0.92)');
      ctx.fillStyle = g;
      U.roundRect(ctx, -c.s, -c.s * 0.8, c.s * 2, c.s * 1.6, c.s * 0.3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-c.s * 0.4, -c.s * 0.4); ctx.lineTo(c.s * 0.15, c.s * 0.2); ctx.stroke();
      ctx.restore();
    }

    function drawSlug(ctx) {
      const cold = hold.inside && !hold.held;
      SlugArt.draw(ctx, App.slug, {
        x: hold.tw.x, y: hold.tw.y, scale: hold.tw.s, t,
        squash: 1 + Math.sin(t * (cold ? 9 : 1.7)) * (cold ? 0.05 : 0.03),
        state: cold ? 'pain' : 'idle',
        look: { x: U.clamp((App.pointer.x - hold.tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - hold.tw.y) / 400, -1, 1) },
        shadow: !hold.inside
      });
    }
  };
})(window);
