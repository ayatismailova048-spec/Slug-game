/* ============================================================
   stations/acid.js — прибор №3
   Шаги: налить кислоту → подвесить слизня на крюк → опустить рычагом
   ============================================================ */
(function (global) {
  'use strict';

  const TANK = { x: 760, top: 430, bot: 830, w: 380 };
  const HOME = { x: 300, y: 720, s: 0.5 };
  const HOOK = { x: TANK.x, y: 360 };

  StationImpl.acid = function () {
    let t = 0;
    let level = 0;          // 0..1 кислоты в чане
    let pours = 0;
    let hooked = false;
    let leverV = 0;         // 0 — поднят, 1 — опущен
    let leverDrag = false;
    let dissolving = 0;
    let screamT = 0, hissT = 0;
    const parts = new FX.Particles(500);
    const tw = new Room.Tw(HOME.x, HOME.y, HOME.s);
    const drag = new global.DragSlug(tw, 150);
    let btns = {};

    const LEV = { x: 1440, top: 400, bot: 690 };

    function build() {
      btns = {
        pour: new UI.Btn({
          x: 1020, y: 180, w: 300, h: 70, label: 'Налить кислоту', icon: '🧪', font: 21,
          color: '#7fc22c', dark: '#4c7d10', pulse: true, onClick: pour
        }),
        unhook: new UI.Btn({
          x: 1020, y: 266, w: 300, h: 62, label: 'Снять с крюка', font: 20,
          color: '#4d8ec9', dark: '#2c5f8f', visible: false, onClick: unhook
        })
      };
    }

    function pour() {
      if (level >= 0.99) { App.toast('Чан полон'); return; }
      pours++;
      level = U.clamp(level + 0.34, 0, 1);
      Sfx.splash(); Sfx.acidHiss();
      parts.emit(16, () => ({
        kind: 'bubble', x: TANK.x + U.rand(-140, 140), y: TANK.bot - 300 * level,
        vy: U.rand(-70, -20), life: U.rand(0.6, 1.4), size: U.rand(4, 12),
        col: 'rgba(220,255,150,0.9)', alpha: 0.9
      }));
      if (level >= 0.99) { btns.pour.pulse = false; App.toast('Кислоты достаточно', '#b6f04a'); }
    }

    function hookUp() {
      hooked = true; drag.enabled = false;
      tw.to(HOOK.x, HOOK.y + 80, 0.5, 0.5);
      btns.unhook.visible = true;
      Sfx.click(0.7);
    }
    function unhook() {
      hooked = false; drag.enabled = true; leverV = 0;
      btns.unhook.visible = false;
      Sfx.loop('bubbles', false);
      tw.to(HOME.x, HOME.y, HOME.s, 0.7, U.easeOutBack);
      App.toast('Теперь это ' + SlugModel.title(App.slug).toLowerCase(), '#b6f04a');
    }

    function surfaceY() { return TANK.bot - (TANK.bot - TANK.top - 20) * level; }

    function hint() {
      if (level < 0.99) return 'Налей кислоту в чан — нажимай «Налить кислоту»';
      if (!hooked) return 'Перетащи слизня на крюк крана';
      if (leverV < 0.1) return 'Тяни красный рычаг вниз, чтобы опустить слизня в кислоту';
      return 'Шипит! Подними рычаг, чтобы вытащить слизня';
    }

    return {
      enter() { build(); t = 0; tw.set(HOME.x, HOME.y, HOME.s); },
      exit() { Sfx.loop('bubbles', false); },

      update(dt) {
        t += dt; tw.update(dt); parts.update(dt);

        if (hooked) {
          const topY = HOOK.y + 80;
          const deepY = surfaceY() + 90;
          tw.set(HOOK.x, U.lerp(topY, deepY, leverV), 0.5);
        }

        const submerged = hooked && level > 0.5 && tw.y + 60 > surfaceY();
        if (submerged) {
          dissolving = U.lerp(dissolving, 1, dt * 3);
          SlugModel.apply(App.slug, 'acid', dt * 0.13);
          Sfx.loop('bubbles', true, 1);
          screamT -= dt;
          if (screamT <= 0) { Sfx.scream(0.8, 0.5); screamT = 0.6 + Math.random() * 0.4; }
          hissT -= dt;
          if (hissT <= 0) { Sfx.acidHiss(); hissT = 1.2 + Math.random(); }
          App.shake(dt * 4);
          parts.emit(3, () => ({
            kind: 'bubble', x: tw.x + U.rand(-70, 70), y: tw.y + U.rand(-20, 50),
            vy: U.rand(-120, -50), life: U.rand(0.5, 1.2), size: U.rand(3, 11),
            col: 'rgba(230,255,170,0.95)', alpha: 1
          }));
          if (Math.random() < dt * 14) {
            parts.add({
              kind: 'smoke', x: tw.x + U.rand(-90, 90), y: surfaceY() - 10,
              vx: U.rand(-30, 30), vy: U.rand(-90, -40), life: U.rand(1.2, 2.4),
              size: U.rand(12, 26), alpha: 0.4
            });
          }
        } else {
          dissolving = U.lerp(dissolving, 0, dt * 4);
          Sfx.loop('bubbles', false);
        }

        // пузыри в чане
        if (level > 0.05 && Math.random() < dt * 12) {
          parts.add({
            kind: 'bubble', x: TANK.x + U.rand(-TANK.w / 2 + 20, TANK.w / 2 - 20),
            y: TANK.bot - 10, vy: U.rand(-60, -25), life: U.rand(1.2, 2.6),
            size: U.rand(3, 9), col: 'rgba(210,255,150,0.8)', alpha: 0.8
          });
        }

        Object.values(btns).forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#41584a', wall2: '#233229', floor1: '#8f9a8d', floor2: '#5f6a5e', horizon: 600 });

        // зелёное свечение от чана
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gl = ctx.createRadialGradient(TANK.x, surfaceY(), 20, TANK.x, surfaceY(), 520);
        gl.addColorStop(0, `rgba(150,255,60,${0.10 + level * 0.16})`);
        gl.addColorStop(1, 'rgba(150,255,60,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, App.VW, App.VH);
        ctx.restore();

        // кран-балка
        ctx.save();
        ctx.fillStyle = '#5a6b62';
        U.roundRect(ctx, 300, 190, 960, 34, 10); ctx.fill();
        ctx.fillStyle = '#3f4d46';
        U.roundRect(ctx, 320, 224, 30, 380, 8); ctx.fill();
        U.roundRect(ctx, 1210, 224, 30, 380, 8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        U.roundRect(ctx, 310, 194, 940, 10, 5); ctx.fill();
        // каретка
        ctx.fillStyle = '#76867d';
        U.roundRect(ctx, TANK.x - 50, 214, 100, 46, 10); ctx.fill();
        // трос
        ctx.strokeStyle = '#cdd6d0'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(TANK.x, 258); ctx.lineTo(TANK.x, hooked ? tw.y - 60 : HOOK.y); ctx.stroke();
        // крюк
        const hy = hooked ? tw.y - 60 : HOOK.y;
        ctx.strokeStyle = '#b9c4bd'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(TANK.x, hy + 16, 18, Math.PI * 0.15, Math.PI * 1.2); ctx.stroke();
        ctx.restore();

        // ---- чан ----
        // задняя стенка
        ctx.save();
        ctx.fillStyle = 'rgba(210,230,215,0.14)';
        U.roundRect(ctx, TANK.x - TANK.w / 2, TANK.top, TANK.w, TANK.bot - TANK.top, 18); ctx.fill();
        ctx.restore();

        // жидкость + слизень внутри (обрезаем по чану)
        ctx.save();
        U.roundRect(ctx, TANK.x - TANK.w / 2 + 6, TANK.top + 6, TANK.w - 12, TANK.bot - TANK.top - 12, 14);
        ctx.clip();
        if (level > 0.01) {
          const sy0 = surfaceY();
          FX.drawLiquidSurface(ctx, TANK.x, sy0, TANK.w, t, 'rgba(150,225,50,0.9)', 'rgba(52,116,16,0.95)', 7, 0.025);
        }
        if (hooked) drawSlugHere(ctx);
        if (level > 0.01) {
          const sy = surfaceY();
          // зелёная дымка поверх погружённой части
          ctx.save();
          ctx.globalAlpha = 0.3;
          FX.drawLiquidSurface(ctx, TANK.x, sy, TANK.w, t, 'rgba(170,240,60,0.85)', 'rgba(60,140,20,0.7)', 7, 0.025);
          ctx.restore();
          // светящаяся кромка
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(210,255,120,${0.5 + 0.2 * Math.sin(t * 3)})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          for (let px = -TANK.w / 2; px <= TANK.w / 2; px += 6) {
            const yy = sy + Math.sin(px * 0.025 + t * 2.2) * 7 + Math.sin(px * 0.07 - t * 3.1) * 3;
            if (px === -TANK.w / 2) ctx.moveTo(TANK.x + px, yy); else ctx.lineTo(TANK.x + px, yy);
          }
          ctx.stroke();
          ctx.restore();
        }
        parts.draw(ctx);
        ctx.restore();

        // стекло чана
        ctx.save();
        const gg = ctx.createLinearGradient(TANK.x - TANK.w / 2, 0, TANK.x + TANK.w / 2, 0);
        gg.addColorStop(0, 'rgba(255,255,255,0.26)');
        gg.addColorStop(0.3, 'rgba(255,255,255,0.05)');
        gg.addColorStop(1, 'rgba(255,255,255,0.22)');
        ctx.fillStyle = gg;
        U.roundRect(ctx, TANK.x - TANK.w / 2, TANK.top, TANK.w, TANK.bot - TANK.top, 18); ctx.fill();
        ctx.strokeStyle = 'rgba(240,255,240,0.8)'; ctx.lineWidth = 6;
        U.roundRect(ctx, TANK.x - TANK.w / 2, TANK.top, TANK.w, TANK.bot - TANK.top, 18); ctx.stroke();
        // предупреждающая табличка
        ctx.fillStyle = '#f0c04a';
        ctx.save();
        ctx.translate(TANK.x - TANK.w / 2 + 60, TANK.bot - 50); ctx.rotate(-0.05);
        U.roundRect(ctx, -42, -30, 84, 60, 10); ctx.fill();
        U.text(ctx, '☠', 0, -2, { size: 34, color: '#2a2a1a' });
        ctx.restore();
        ctx.restore();

        // подставка чана
        ctx.fillStyle = '#4b5a51';
        U.roundRect(ctx, TANK.x - TANK.w / 2 - 20, TANK.bot - 6, TANK.w + 40, 40, 10); ctx.fill();

        // слизень снаружи
        if (!hooked) drawSlugHere(ctx);

        // рычаг
        ctx.save();
        ctx.fillStyle = 'rgba(20,30,24,0.6)';
        U.roundRect(ctx, LEV.x - 78, LEV.top - 58, 156, LEV.bot - LEV.top + 112, 18); ctx.fill();
        U.text(ctx, 'КРАН', LEV.x, LEV.top - 30, { size: 18, color: '#cfe9dd', weight: 800 });
        UI.lever(ctx, LEV.x, LEV.top, LEV.bot, leverV, leverV > 0.5 ? 'ВНИЗ' : 'ВВЕРХ');
        ctx.restore();

        UI.progress(ctx, 1020, 350, 300, 26, App.slug.fx.melt, '#8bc93a',
          'РАСТВОРЕНИЕ ' + Math.round(App.slug.fx.melt * 100) + '%');

        Object.values(btns).forEach((b) => b.draw(ctx, t));
        UI.hintBar(ctx, hint(), 990, 852, 700, t, '#8bc93a');
        Room.stepBadge(ctx, level < 0.99 ? 1 : !hooked ? 2 : 3, 3, 1020, 120);
      },

      onDown(p) {
        for (const b of Object.values(btns)) if (b.visible && b.hit(p)) { Sfx.click(); b.onClick(); return; }
        if (Math.abs(p.x - LEV.x) < 60 && p.y > LEV.top - 30 && p.y < LEV.bot + 30) {
          if (!hooked) { App.toast('Сначала подвесь слизня на крюк'); return; }
          leverDrag = true; Sfx.switchSnap();
          leverV = U.clamp(U.inv(LEV.top, LEV.bot, p.y), 0, 1);
          return;
        }
        if (!hooked) drag.tryGrab(p);
      },
      onMove(p) {
        if (leverDrag) leverV = U.clamp(U.inv(LEV.top, LEV.bot, p.y), 0, 1);
        drag.move(p);
      },
      onUp() {
        leverDrag = false;
        if (drag.drop()) {
          if (U.dist(tw.x, tw.y, HOOK.x, HOOK.y + 70) < 220) hookUp();
          else tw.to(HOME.x, HOME.y, HOME.s, 0.5);
        }
      }
    };

    function drawSlugHere(ctx) {
      const sub = dissolving > 0.3;
      SlugArt.draw(ctx, App.slug, {
        x: tw.x, y: tw.y, scale: tw.s, t,
        squash: 1 + Math.sin(t * (sub ? 10 : 1.7)) * (sub ? 0.06 : 0.03),
        state: sub ? 'scream' : 'idle',
        rot: hooked ? Math.sin(t * 1.3) * 0.05 : 0,
        look: { x: U.clamp((App.pointer.x - tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - tw.y) / 400, -1, 1) },
        shadow: !hooked
      });
      if (hooked) {
        ctx.save();
        ctx.strokeStyle = '#cdd6d0'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tw.x - 30, tw.y - 40); ctx.lineTo(tw.x, tw.y - 60);
        ctx.lineTo(tw.x + 30, tw.y - 40); ctx.stroke();
        ctx.restore();
      }
    }
  };
})(window);
