/* ============================================================
   stations/blender.js — просто блендер: бросил слизня — он мелется
   ============================================================ */
(function (global) {
  'use strict';

  const GROUND = 830;
  const JAR = { x: 840, top: 190, bot: 620, wTop: 320, wBot: 232 };
  const HOME = { x: 300, y: 726, s: 0.72 };

  StationImpl.blender = function () {
    let t = 0, spin = 0, spinV = 0, mist = 0, screamT = 0;
    const parts = new FX.Particles(400);
    const hold = new global.Holder(HOME);

    const inJar = (x, y) =>
      Math.abs(x - JAR.x) < JAR.wTop / 2 + 40 && y > JAR.top - 60 && y < JAR.bot + 40;

    return {
      enter() { t = 0; hold.reset(); },
      exit() { Sfx.loop('motor', false); },

      update(dt) {
        t += dt; hold.tw.update(dt); parts.update(dt);
        const on = hold.inside;
        hold.hold(JAR.x, 430, 0.52);

        if (on) {
          spinV = U.lerp(spinV, 26, dt * 5);
          mist = U.clamp(mist + dt * 0.35, 0, 1);
          SlugModel.apply(App.slug, 'blend', dt * 0.22);
          Sfx.loop('motor', true, 0.9);
          App.shake(dt * 9);
          screamT -= dt;
          if (screamT <= 0 && App.slug.alive) { Sfx.scream(0.75, 0.45); screamT = 0.45 + Math.random() * 0.3; }
          parts.emit(2, () => ({
            kind: 'goo', x: JAR.x + U.rand(-80, 80), y: 430 + U.rand(-80, 80),
            vx: U.rand(-190, 190), vy: U.rand(-190, 190), grav: 200,
            life: U.rand(0.3, 0.7), size: U.rand(3, 10),
            col: Math.random() < 0.4 ? 'rgba(200,40,40,0.85)' : U.colStr(App.slug.color, 0.85)
          }));
        } else {
          spinV = U.lerp(spinV, 0, dt * 2.5);
          mist = U.lerp(mist, 0, dt * 0.8);
          Sfx.loop('motor', false);
        }
        spin += spinV * dt;
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#44605d', wall2: '#25403f', horizon: 700 });

        // основание
        ctx.save();
        U.shadowOn(ctx, 30, 'rgba(0,0,0,0.22)', 0, 18);
        const bg = ctx.createLinearGradient(JAR.x - 150, 0, JAR.x + 150, 0);
        bg.addColorStop(0, '#3b4f48'); bg.addColorStop(0.5, '#5a7168'); bg.addColorStop(1, '#2d3e38');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(JAR.x - 178, GROUND - 40); ctx.lineTo(JAR.x - 130, 616);
        ctx.lineTo(JAR.x + 130, 616); ctx.lineTo(JAR.x + 178, GROUND - 40);
        ctx.closePath(); ctx.fill();
        U.shadowOff(ctx);
        ctx.fillStyle = '#22302b';
        U.roundRect(ctx, JAR.x - 190, GROUND - 52, 380, 28, 12); ctx.fill();
        ctx.fillStyle = hold.inside ? '#8ce06a' : '#3c4a44';
        ctx.beginPath(); ctx.arc(JAR.x, GROUND - 104, 15, 0, U.TAU); ctx.fill();
        ctx.restore();

        const jarPath = (c, inset = 0) => {
          c.beginPath();
          c.moveTo(JAR.x - JAR.wTop / 2 + inset, JAR.top + inset);
          c.lineTo(JAR.x - JAR.wBot / 2 + inset, JAR.bot - inset);
          c.lineTo(JAR.x + JAR.wBot / 2 - inset, JAR.bot - inset);
          c.lineTo(JAR.x + JAR.wTop / 2 - inset, JAR.top + inset);
          c.closePath();
        };

        // содержимое
        ctx.save();
        jarPath(ctx, 7); ctx.clip();
        if (hold.inside || hold.tw.x > JAR.x - 200) drawSlug(ctx);
        parts.draw(ctx);
        if (mist > 0.01) {
          ctx.save();
          ctx.globalAlpha = mist * 0.5;
          FX.drawLiquidSurface(ctx, JAR.x, JAR.bot - 320 * mist, JAR.wTop, t,
            'rgba(200,70,55,0.9)', 'rgba(110,20,20,0.95)', 6 + spinV * 0.25, 0.04);
          ctx.restore();
        }
        // ножи
        ctx.save();
        ctx.translate(JAR.x, JAR.bot - 34);
        ctx.rotate(spin);
        ctx.fillStyle = '#b9c6c0';
        U.roundRect(ctx, -82, -7, 164, 14, 7); ctx.fill();
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#98a7a0';
        U.roundRect(ctx, -60, -7, 120, 14, 7); ctx.fill();
        ctx.restore();
        ctx.restore();

        // стекло
        ctx.save();
        jarPath(ctx);
        const gg = ctx.createLinearGradient(JAR.x - 130, 0, JAR.x + 130, 0);
        gg.addColorStop(0, 'rgba(225,245,250,0.42)');
        gg.addColorStop(0.25, 'rgba(255,255,255,0.14)');
        gg.addColorStop(0.55, 'rgba(180,215,225,0.16)');
        gg.addColorStop(1, 'rgba(225,245,250,0.44)');
        ctx.fillStyle = gg; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 6; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(JAR.x - 116, JAR.top + 24); ctx.lineTo(JAR.x - 88, JAR.top + 24);
        ctx.lineTo(JAR.x - 66, JAR.bot - 32); ctx.lineTo(JAR.x - 94, JAR.bot - 32);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        // ручка
        ctx.save();
        ctx.strokeStyle = '#9fada6'; ctx.lineWidth = 18; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(JAR.x + 156, JAR.top + 54);
        ctx.quadraticCurveTo(JAR.x + 268, JAR.top + 200, JAR.x + 136, JAR.bot - 44);
        ctx.stroke();
        ctx.strokeStyle = '#d5ded8'; ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(JAR.x + 156, JAR.top + 54);
        ctx.quadraticCurveTo(JAR.x + 268, JAR.top + 200, JAR.x + 136, JAR.bot - 44);
        ctx.stroke();
        ctx.restore();

        if (!hold.inside && hold.tw.x <= JAR.x - 200) drawSlug(ctx);
      },

      onDown(p) { hold.grab(p); },
      onMove(p) { hold.move(p); },
      onUp() { hold.release(inJar, () => Sfx.squish(0.8)); },
      _hold: hold
    };

    function drawSlug(ctx) {
      const on = hold.inside && !hold.held;
      SlugArt.draw(ctx, App.slug, {
        x: hold.tw.x, y: hold.tw.y, scale: hold.tw.s, t,
        rot: on ? spin * 0.5 : 0,
        squash: on ? 1 + Math.sin(t * 22) * 0.2 : 1 + Math.sin(t * 1.8) * 0.03,
        state: on ? 'scream' : 'idle',
        look: on ? { x: Math.sin(t * 9), y: Math.cos(t * 7) } : {
          x: U.clamp((App.pointer.x - hold.tw.x) / 400, -1, 1),
          y: U.clamp((App.pointer.y - hold.tw.y) / 400, -1, 1)
        },
        shadow: !hold.inside
      });
    }
  };
})(window);
