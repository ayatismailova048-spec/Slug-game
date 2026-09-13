/* ============================================================
   stations/pan.js — просто раскалённая сковорода с маслом
   ============================================================ */
(function (global) {
  'use strict';

  const GROUND = 830;
  const PAN = { x: 820, y: 640 };
  const HOME = { x: 250, y: 726, s: 0.72 };

  StationImpl.pan = function () {
    let t = 0, screamT = 0;
    const parts = new FX.Particles(500);
    const hold = new global.Holder(HOME);

    const inPan = (x, y) => U.dist(x, y, PAN.x, PAN.y - 20) < 270;

    return {
      enter() { t = 0; hold.reset(); Sfx.loop('fire', true, 0.7); Sfx.loop('sizzle', true, 0.6); },
      exit() { Sfx.loop('fire', false); Sfx.loop('sizzle', false); },

      update(dt) {
        t += dt; hold.tw.update(dt); parts.update(dt);
        Sfx.loop('fire', true, 0.7);
        Sfx.loop('sizzle', true, hold.inside ? 1 : 0.55);
        hold.hold(PAN.x, PAN.y - 40, 0.58);

        if (Math.random() < dt * 22) {
          parts.add({
            kind: 'goo', x: PAN.x + U.rand(-130, 130), y: PAN.y - 30,
            vx: U.rand(-70, 70), vy: U.rand(-200, -70), grav: 600,
            life: U.rand(0.3, 0.6), size: U.rand(2, 5), col: 'rgba(250,225,140,0.9)'
          });
        }
        if (Math.random() < dt * 8) {
          parts.add({
            kind: 'steam', x: PAN.x + U.rand(-140, 140), y: PAN.y - 50,
            vx: U.rand(-20, 20), vy: U.rand(-70, -30), life: U.rand(1, 2),
            size: U.rand(10, 22), alpha: 0.35
          });
        }

        if (hold.inside && !hold.held) {
          SlugModel.apply(App.slug, 'fry', dt * 0.11);
          if (App.slug.fx.fried > 0.8) SlugModel.apply(App.slug, 'burn', dt * 0.05);
          screamT -= dt;
          if (screamT <= 0 && App.slug.alive) { Sfx.scream(0.6, 0.5); screamT = 0.8 + Math.random() * 0.5; }
          App.shake(dt * 2);
        }
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#5a4a3c', wall2: '#352a22', floor1: '#a89684', floor2: '#6d5f52', horizon: 700 });


        // конфорка
        ctx.save();
        U.shadowOn(ctx, 26, 'rgba(0,0,0,0.22)', 0, 14);
        ctx.fillStyle = '#2c2f33';
        U.roundRect(ctx, PAN.x - 270, PAN.y + 46, 540, 100, 20); ctx.fill();
        U.shadowOff(ctx);
        ctx.strokeStyle = '#15171a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU;
          ctx.beginPath();
          ctx.moveTo(PAN.x + Math.cos(a) * 40, PAN.y + 76 + Math.sin(a) * 14);
          ctx.lineTo(PAN.x + Math.cos(a) * 140, PAN.y + 76 + Math.sin(a) * 46);
          ctx.stroke();
        }
        ctx.restore();

        // зарево
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(PAN.x, PAN.y + 40, 10, PAN.x, PAN.y + 40, 460);
        g.addColorStop(0, 'rgba(255,176,90,0.28)');
        g.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, App.VW, App.VH);
        ctx.restore();

        // сковорода
        ctx.save();
        U.shadowOn(ctx, 22, 'rgba(0,0,0,0.3)', 0, 12);
        ctx.fillStyle = '#17191d';
        ctx.beginPath(); ctx.ellipse(PAN.x, PAN.y, 290, 110, 0, 0, U.TAU); ctx.fill();
        U.shadowOff(ctx);
        ctx.strokeStyle = '#17191d'; ctx.lineWidth = 30; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(PAN.x + 262, PAN.y - 24); ctx.lineTo(PAN.x + 470, PAN.y - 84); ctx.stroke();
        ctx.strokeStyle = '#2b3036'; ctx.lineWidth = 16;
        ctx.beginPath(); ctx.moveTo(PAN.x + 262, PAN.y - 24); ctx.lineTo(PAN.x + 470, PAN.y - 84); ctx.stroke();
        const ig = ctx.createRadialGradient(PAN.x - 60, PAN.y - 28, 10, PAN.x, PAN.y - 8, 225);
        ig.addColorStop(0, '#4a5057'); ig.addColorStop(1, '#202329');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.ellipse(PAN.x, PAN.y - 12, 262, 92, 0, 0, U.TAU); ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.45;
        const hg = ctx.createRadialGradient(PAN.x, PAN.y - 6, 6, PAN.x, PAN.y - 6, 210);
        hg.addColorStop(0, 'rgba(255,120,40,0.7)');
        hg.addColorStop(1, 'rgba(255,60,10,0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.ellipse(PAN.x, PAN.y - 10, 254, 88, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
        // масло
        ctx.save();
        ctx.globalAlpha = 0.85;
        const og = ctx.createRadialGradient(PAN.x - 34, PAN.y - 8, 6, PAN.x, PAN.y - 6, 190);
        og.addColorStop(0, 'rgba(255,235,150,0.95)');
        og.addColorStop(1, 'rgba(210,170,50,0.35)');
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.ellipse(PAN.x, PAN.y - 8, 208 + Math.sin(t * 3) * 6, 68, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
        ctx.restore();

        drawSlug(ctx);
        parts.draw(ctx);

        // языки пламени вокруг сковороды
        FX.drawFire(ctx, PAN.x - 232, PAN.y + 70, 58, 120, t, 0.9, 23);
        FX.drawFire(ctx, PAN.x + 232, PAN.y + 70, 58, 120, t + 1.7, 0.9, 41);
        FX.drawFire(ctx, PAN.x, PAN.y + 88, 170, 96, t + 0.9, 0.7, 63);
      },

      onDown(p) { hold.grab(p); },
      onMove(p) { hold.move(p); },
      onUp() {
        hold.release(inPan, () => {
          Sfx.squish(0.8);
          parts.emit(14, () => ({
            kind: 'goo', x: PAN.x + U.rand(-80, 80), y: PAN.y - 20,
            vx: U.rand(-150, 150), vy: U.rand(-260, -80), grav: 700,
            life: U.rand(0.4, 0.8), size: U.rand(3, 8), col: 'rgba(250,225,140,0.9)'
          }));
        });
      }
    };

    function drawSlug(ctx) {
      const frying = hold.inside && !hold.held;
      SlugArt.draw(ctx, App.slug, {
        x: hold.tw.x, y: hold.tw.y + (frying ? Math.sin(t * 18) * 2 : 0), scale: hold.tw.s, t,
        squash: hold.inside ? 1.16 + Math.sin(t * 16) * 0.05 : 1 + Math.sin(t * 1.7) * 0.03,
        state: frying ? 'scream' : 'idle',
        look: { x: U.clamp((App.pointer.x - hold.tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - hold.tw.y) / 400, -1, 1) },
        shadow: !hold.inside
      });
    }
  };
})(window);
