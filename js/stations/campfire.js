/* ============================================================
   stations/campfire.js — просто костёр: кинул слизня в огонь
   ============================================================ */
(function (global) {
  'use strict';

  const GROUND = 840;
  const FIRE = { x: 800, y: GROUND };
  const HOME = { x: 300, y: 756, s: 0.72 };

  StationImpl.campfire = function () {
    let t = 0, screamT = 0, emberT = 0, smokeT = 0;
    const parts = new FX.Particles(600);
    const hold = new global.Holder(HOME);

    const inFire = (x, y) => Math.abs(x - FIRE.x) < 230 && y > 420 && y < GROUND + 20;

    return {
      enter() { t = 0; hold.reset(); Sfx.loop('fire', true, 1); },
      exit() { Sfx.loop('fire', false); },

      update(dt) {
        t += dt; hold.tw.update(dt); parts.update(dt);
        Sfx.loop('fire', true, 1);
        hold.hold(FIRE.x + Math.sin(t * 1.6) * 6, GROUND - 220 + Math.sin(t * 2.3) * 8, 0.6);

        emberT -= dt;
        if (emberT <= 0) {
          emberT = 0.045;
          parts.add({
            kind: 'ember', x: FIRE.x + U.rand(-85, 85), y: GROUND - 30,
            vx: U.rand(-40, 40), vy: U.rand(-290, -150),
            grav: 40, drag: 0.985, life: U.rand(0.9, 2.2), size: U.rand(1.6, 3.6), alpha: 1
          });
        }
        smokeT -= dt;
        if (smokeT <= 0) {
          smokeT = 0.09;
          parts.add({
            kind: 'smoke', x: FIRE.x + U.rand(-60, 60), y: GROUND - 280,
            vx: U.rand(-24, 24), vy: U.rand(-95, -55), grav: -6, wind: 12,
            life: U.rand(1.8, 3.4), size: U.rand(18, 36), alpha: 0.45
          });
        }

        if (hold.inside && !hold.held) {
          SlugModel.apply(App.slug, 'burn', dt * 0.15);
          screamT -= dt;
          if (screamT <= 0 && App.slug.alive) { Sfx.scream(0.5 + App.slug.fx.burns * 0.4, 0.55); screamT = 0.7 + Math.random() * 0.5; }
          App.shake(dt * 3);
        }
      },

      draw(ctx) {
        // ночная сцена
        const sky = ctx.createLinearGradient(0, 0, 0, App.VH);
        sky.addColorStop(0, '#141d2e'); sky.addColorStop(0.5, '#223046'); sky.addColorStop(0.82, '#3b3a36');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, App.VW, App.VH);

        // звёзды
        ctx.save();
        const srnd = U.mulberry32(7);
        for (let i = 0; i < 90; i++) {
          const x = srnd() * App.VW, y = srnd() * 560;
          const tw2 = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + srnd() * 1.6) + i));
          ctx.fillStyle = `rgba(255,255,235,${tw2 * 0.9})`;
          ctx.beginPath(); ctx.arc(x, y, srnd() * 1.8 + 0.6, 0, U.TAU); ctx.fill();
        }
        ctx.restore();

        // луна
        ctx.save();
        const mg = ctx.createRadialGradient(280, 150, 10, 280, 150, 190);
        mg.addColorStop(0, 'rgba(235,240,255,0.32)'); mg.addColorStop(1, 'rgba(200,215,255,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(280, 150, 190, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#e8eefb';
        ctx.beginPath(); ctx.arc(280, 150, 58, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(190,200,225,0.5)';
        [[-18, -10, 12], [14, 8, 9], [4, -24, 7]].forEach(([ox, oy, r]) => {
          ctx.beginPath(); ctx.arc(280 + ox, 150 + oy, r, 0, U.TAU); ctx.fill();
        });
        ctx.restore();

        // ёлки
        ctx.save();
        const trnd = U.mulberry32(31);
        for (let i = 0; i < 15; i++) {
          const x = 30 + i * 112 + trnd() * 50;
          const h = 190 + trnd() * 170;
          const w = 58 + trnd() * 34;
          const base = GROUND - 60;
          ctx.fillStyle = i % 2 ? '#1b2a22' : '#21332a';
          ctx.beginPath();
          ctx.moveTo(x, base - h); ctx.lineTo(x + w, base); ctx.lineTo(x - w, base);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, base - h * 1.2); ctx.lineTo(x + w * 0.68, base - h * 0.45);
          ctx.lineTo(x - w * 0.68, base - h * 0.45);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // земля
        ctx.fillStyle = '#463f31';
        ctx.beginPath();
        ctx.moveTo(0, GROUND - 60);
        for (let x = 0; x <= App.VW; x += 40) ctx.lineTo(x, GROUND - 60 + Math.sin(x * 0.01) * 9);
        ctx.lineTo(App.VW, App.VH); ctx.lineTo(0, App.VH); ctx.closePath(); ctx.fill();
        ctx.save();
        const grnd = U.mulberry32(53);
        ctx.strokeStyle = 'rgba(86,96,60,0.7)'; ctx.lineCap = 'round';
        for (let i = 0; i < 130; i++) {
          const x = grnd() * App.VW, y = GROUND - 40 + grnd() * 230;
          const hh = 9 + grnd() * 22;
          ctx.lineWidth = 1.6 + grnd() * 2;
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 5, y - hh * 0.6, x + 10 * (grnd() - 0.5), y - hh); ctx.stroke();
        }
        ctx.restore();

        // зарево костра
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const flick = 0.75 + 0.25 * Math.sin(t * 11) * Math.sin(t * 4.3);
        const lg = ctx.createRadialGradient(FIRE.x, GROUND - 160, 30, FIRE.x, GROUND - 130, 780);
        lg.addColorStop(0, `rgba(255,170,70,${0.26 * flick})`);
        lg.addColorStop(1, 'rgba(255,120,20,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, App.VW, App.VH);
        ctx.restore();

        // камни
        [[-230, 8], [-145, 28], [-50, 36], [50, 36], [145, 28], [230, 8]].forEach(([ox, oy], i) => {
          const sx = FIRE.x + ox, sy = GROUND + oy;
          const sg = ctx.createLinearGradient(sx, sy - 24, sx, sy + 20);
          sg.addColorStop(0, '#b9bdb2'); sg.addColorStop(1, '#767c70');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.ellipse(sx, sy, 36 - (i % 3) * 5, 23 - (i % 2) * 4, i * 0.4, 0, U.TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath(); ctx.ellipse(sx - 8, sy - 8, 15, 7, 0.3, 0, U.TAU); ctx.fill();
        });

        // дрова
        for (let i = 0; i < 3; i++) {
          const ang = -0.55 + i * 0.55;
          ctx.save();
          ctx.translate(FIRE.x, GROUND + 4);
          ctx.rotate(ang);
          ctx.fillStyle = '#5a3a18';
          U.roundRect(ctx, -160, -19, 320, 38, 19); ctx.fill();
          ctx.fillStyle = '#43290f';
          U.roundRect(ctx, -160, 3, 320, 16, 8); ctx.fill();
          ctx.fillStyle = `rgba(255,${130 + Math.sin(t * 7 + i) * 40},50,${0.45 + 0.25 * Math.sin(t * 6 + i * 2)})`;
          for (let k = 0; k < 5; k++) {
            ctx.beginPath(); ctx.ellipse(-120 + k * 60, U.rand(-6, 6), 16, 7, 0, 0, U.TAU); ctx.fill();
          }
          ctx.restore();
        }

        // угли
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cg = ctx.createRadialGradient(FIRE.x, GROUND + 6, 4, FIRE.x, GROUND + 6, 170);
        cg.addColorStop(0, 'rgba(255,140,40,0.55)');
        cg.addColorStop(1, 'rgba(255,80,10,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.ellipse(FIRE.x, GROUND + 6, 170, 44, 0, 0, U.TAU); ctx.fill();
        ctx.restore();

        // тренога
        ctx.save();
        ctx.lineCap = 'round';
        [[-250, 6], [250, 6], [34, -74]].forEach(([ox, oy]) => {
          ctx.strokeStyle = '#5c4526'; ctx.lineWidth = 18;
          ctx.beginPath(); ctx.moveTo(FIRE.x + ox, GROUND + oy); ctx.lineTo(FIRE.x + 6, 250); ctx.stroke();
          ctx.strokeStyle = '#7a5c33'; ctx.lineWidth = 9;
          ctx.beginPath(); ctx.moveTo(FIRE.x + ox, GROUND + oy); ctx.lineTo(FIRE.x + 6, 250); ctx.stroke();
        });
        ctx.strokeStyle = '#c9b68a'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(FIRE.x + 6, 256, 24, 0, U.TAU); ctx.stroke();
        ctx.strokeStyle = '#b9c4bd'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(FIRE.x + 6, 330, 22, Math.PI * 0.15, Math.PI * 1.2); ctx.stroke();
        ctx.restore();

        // задние языки пламени
        FX.drawFire(ctx, FIRE.x, GROUND - 6, 200, 400, t, 1, 5);

        // слизень — прямо в огне
        drawSlug(ctx);

        // передние языки, чтобы слизень был «внутри» костра
        if (hold.inside) FX.drawFire(ctx, FIRE.x, GROUND - 6, 176, 360, t + 3.1, 0.85, 29);
        parts.draw(ctx);
      },

      onDown(p) { hold.grab(p); },
      onMove(p) { hold.move(p); },
      onUp() { hold.release(inFire, () => Sfx.scream(0.7, 0.5)); }
    };

    function drawSlug(ctx) {
      const burning = hold.inside && !hold.held;
      SlugArt.draw(ctx, App.slug, {
        x: hold.tw.x, y: hold.tw.y + (burning ? Math.sin(t * 9) * 4 : 0), scale: hold.tw.s, t,
        rot: burning ? Math.sin(t * 4) * 0.07 : 0,
        squash: 1 + Math.sin(t * (burning ? 12 : 1.7)) * (burning ? 0.07 : 0.03),
        state: burning ? 'scream' : 'idle',
        look: burning ? { x: Math.sin(t * 6), y: -0.6 } : {
          x: U.clamp((App.pointer.x - hold.tw.x) / 400, -1, 1),
          y: U.clamp((App.pointer.y - hold.tw.y) / 400, -1, 1)
        },
        shadow: !hold.inside
      });
    }
  };
})(window);
