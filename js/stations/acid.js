/* ============================================================
   stations/acid.js — прибор №3
   Шаги: налить кислоту в банку → бросить туда слизня
   ============================================================ */
(function (global) {
  'use strict';

  const JAR = { x: 750, top: 330, bot: 830, w: 420 };
  const HOME = { x: 270, y: 730, s: 0.52 };
  const BOTTLE = { x: 1090, y: 640 };

  StationImpl.acid = function () {
    let t = 0;
    let level = 0;            // сколько кислоты налито 0..1
    let inside = false;
    let pouring = 0;          // анимация струи из бутыли
    let bottleTilt = 0;
    let sink = 0;             // погружение слизня 0..1
    let screamT = 0, hissT = 0;
    const parts = new FX.Particles(500);
    const tw = new Room.Tw(HOME.x, HOME.y, HOME.s);
    const drag = new global.DragSlug(tw, 150);
    let btns = {};

    function build() {
      btns = {
        pour: new UI.Btn({
          x: 1060, y: 180, w: 340, h: 72, label: 'Налить кислоту', icon: '🧪', font: 21,
          color: '#7fc22c', dark: '#4c7d10', pulse: true, onClick: pour
        }),
        out: new UI.Btn({
          x: 1060, y: 272, w: 340, h: 64, label: 'Достать слизня', font: 20,
          color: '#4d8ec9', dark: '#2c5f8f', visible: false, onClick: takeOut
        })
      };
    }

    function surfaceY() { return JAR.bot - 30 - (JAR.bot - JAR.top - 80) * level; }

    function pour() {
      if (level >= 0.99) { App.toast('Банка полна'); return; }
      level = U.clamp(level + 0.34, 0, 1);
      pouring = 0.9;
      Sfx.splash(); Sfx.acidHiss();
      parts.emit(14, () => ({
        kind: 'bubble', x: JAR.x + U.rand(-150, 150), y: surfaceY(),
        vy: U.rand(-70, -20), life: U.rand(0.6, 1.4), size: U.rand(4, 12),
        col: 'rgba(220,255,150,0.9)', alpha: 0.9
      }));
      if (level >= 0.99) { btns.pour.pulse = false; App.toast('Кислоты достаточно', '#b6f04a'); }
    }

    function dropIn() {
      if (level < 0.5) { App.toast('Сначала налей кислоту'); return false; }
      inside = true; drag.enabled = false;
      btns.out.visible = true;
      // падение в банку
      tw.set(JAR.x, Math.min(tw.y, surfaceY() - 140), 0.5);
      tw.to(JAR.x, surfaceY() + 90, 0.56, 0.45, U.easeInCubic, () => {
        Sfx.splash();
        App.shake(8);
        parts.emit(26, () => ({
          kind: 'bubble', x: JAR.x + U.rand(-120, 120), y: surfaceY() + U.rand(-10, 30),
          vy: U.rand(-190, -60), life: U.rand(0.5, 1.3), size: U.rand(4, 14),
          col: 'rgba(230,255,170,0.95)', alpha: 1
        }));
        parts.emit(14, () => ({
          kind: 'drop', x: JAR.x + U.rand(-90, 90), y: surfaceY(),
          vx: U.rand(-170, 170), vy: U.rand(-330, -120), grav: 900,
          life: U.rand(0.4, 0.8), size: U.rand(3, 8), col: 'rgba(190,245,90,0.9)'
        }));
      });
      return true;
    }

    function takeOut() {
      inside = false; drag.enabled = true;
      btns.out.visible = false;
      Sfx.loop('bubbles', false);
      Sfx.splash();
      tw.to(HOME.x, HOME.y, HOME.s, 0.75, U.easeOutBack);
      App.toast('Теперь это ' + SlugModel.title(App.slug).toLowerCase(), '#b6f04a');
    }

    function hint() {
      if (level < 0.99) return 'Налей кислоту в банку';
      if (!inside) return 'Хватай слизня и бросай его прямо в банку';
      return 'Шипит! Достань слизня, пока не растворился весь';
    }

    return {
      enter() { build(); t = 0; tw.set(HOME.x, HOME.y, HOME.s); },
      exit() { Sfx.loop('bubbles', false); },

      update(dt) {
        t += dt; tw.update(dt); parts.update(dt);
        pouring = Math.max(0, pouring - dt);
        bottleTilt = U.lerp(bottleTilt, pouring > 0 ? 1 : 0, dt * 8);

        if (inside) {
          sink = U.lerp(sink, 1, dt * 3);
          if (tw.done) tw.set(JAR.x + Math.sin(t * 0.9) * 10, surfaceY() + 90 + Math.sin(t * 1.3) * 12, 0.56);
          SlugModel.apply(App.slug, 'acid', dt * 0.12);
          Sfx.loop('bubbles', true, 1);
          screamT -= dt;
          if (screamT <= 0 && App.slug.alive) { Sfx.scream(0.8, 0.5); screamT = 0.6 + Math.random() * 0.4; }
          hissT -= dt;
          if (hissT <= 0) { Sfx.acidHiss(); hissT = 1.2 + Math.random(); }
          App.shake(dt * 4);
          parts.emit(1, () => ({
            kind: 'bubble', x: tw.x + U.rand(-110, 110), y: tw.y + U.rand(30, 70),
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
          sink = U.lerp(sink, 0, dt * 4);
          Sfx.loop('bubbles', false);
        }

        if (level > 0.05 && Math.random() < dt * 12) {
          parts.add({
            kind: 'bubble', x: JAR.x + U.rand(-JAR.w / 2 + 30, JAR.w / 2 - 30),
            y: JAR.bot - 20, vy: U.rand(-60, -25), life: U.rand(1.2, 2.6),
            size: U.rand(3, 9), col: 'rgba(210,255,150,0.8)', alpha: 0.8
          });
        }

        Object.values(btns).forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#41584a', wall2: '#233229', floor1: '#8f9a8d', floor2: '#5f6a5e', horizon: 620 });
        Room.drawCounter(ctx, 480, 836, 740, 44, '#b9c4b6');

        // зелёное свечение от банки
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gl = ctx.createRadialGradient(JAR.x, surfaceY(), 20, JAR.x, surfaceY(), 520);
        gl.addColorStop(0, `rgba(150,255,60,${0.10 + level * 0.16})`);
        gl.addColorStop(1, 'rgba(150,255,60,0)');
        ctx.fillStyle = gl; ctx.fillRect(0, 0, App.VW, App.VH);
        ctx.restore();

        const jarPath = (c, inset = 0) => {
          U.roundRect(c, JAR.x - JAR.w / 2 + inset, JAR.top + inset,
            JAR.w - inset * 2, JAR.bot - JAR.top - inset * 2, 54 - inset);
        };

        // задняя стенка банки
        ctx.save();
        ctx.fillStyle = 'rgba(215,235,220,0.16)';
        jarPath(ctx); ctx.fill();
        ctx.restore();

        // содержимое
        ctx.save();
        jarPath(ctx, 8); ctx.clip();
        if (level > 0.01) {
          FX.drawLiquidSurface(ctx, JAR.x, surfaceY(), JAR.w, t,
            'rgba(186,244,72,0.92)', 'rgba(74,146,18,0.95)', 7, 0.025);
        }
        if (inside || sink > 0.02) drawSlugHere(ctx);
        if (level > 0.01) {
          ctx.save();
          ctx.globalAlpha = 0.16;
          FX.drawLiquidSurface(ctx, JAR.x, surfaceY(), JAR.w, t,
            'rgba(170,240,60,0.85)', 'rgba(60,140,20,0.7)', 7, 0.025);
          ctx.restore();
          // светящаяся кромка
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(210,255,120,${0.5 + 0.2 * Math.sin(t * 3)})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          for (let px = -JAR.w / 2; px <= JAR.w / 2; px += 6) {
            const yy = surfaceY() + Math.sin(px * 0.025 + t * 2.2) * 7 + Math.sin(px * 0.07 - t * 3.1) * 3;
            if (px === -JAR.w / 2) ctx.moveTo(JAR.x + px, yy); else ctx.lineTo(JAR.x + px, yy);
          }
          ctx.stroke();
          ctx.restore();
        }
        parts.draw(ctx);
        ctx.restore();

        // стекло банки
        ctx.save();
        const gg = ctx.createLinearGradient(JAR.x - JAR.w / 2, 0, JAR.x + JAR.w / 2, 0);
        gg.addColorStop(0, 'rgba(255,255,255,0.28)');
        gg.addColorStop(0.28, 'rgba(255,255,255,0.05)');
        gg.addColorStop(1, 'rgba(255,255,255,0.22)');
        ctx.fillStyle = gg; jarPath(ctx); ctx.fill();
        ctx.strokeStyle = 'rgba(240,255,240,0.85)'; ctx.lineWidth = 7;
        jarPath(ctx); ctx.stroke();
        // блик по стеклу
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        U.roundRect(ctx, JAR.x - JAR.w / 2 + 34, JAR.top + 50, 26, JAR.bot - JAR.top - 140, 13); ctx.fill();
        // горловина банки
        ctx.fillStyle = 'rgba(232,245,235,0.6)';
        U.roundRect(ctx, JAR.x - JAR.w / 2 - 16, JAR.top - 26, JAR.w + 32, 44, 22); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5;
        U.roundRect(ctx, JAR.x - JAR.w / 2 - 16, JAR.top - 26, JAR.w + 32, 44, 22); ctx.stroke();
        // наклейка
        ctx.save();
        ctx.translate(JAR.x - JAR.w / 2 + 78, JAR.bot - 92); ctx.rotate(-0.05);
        ctx.fillStyle = '#f0c04a';
        U.roundRect(ctx, -50, -44, 100, 88, 12); ctx.fill();
        U.text(ctx, '☠', 0, -10, { size: 40, color: '#2a2a1a' });
        U.text(ctx, 'КИСЛОТА', 0, 26, { size: 14, color: '#2a2a1a', weight: 900 });
        ctx.restore();
        ctx.restore();

        // бутыль с кислотой
        ctx.save();
        ctx.translate(BOTTLE.x, BOTTLE.y);
        ctx.rotate(-bottleTilt * 1.9);
        ctx.fillStyle = '#1f6b25';
        U.roundRect(ctx, -44, -90, 88, 150, 18); ctx.fill();
        ctx.fillStyle = '#2e8b34';
        U.roundRect(ctx, -36, -82, 72, 134, 14); ctx.fill();
        ctx.fillStyle = '#1f6b25';
        U.roundRect(ctx, -16, -124, 32, 40, 10); ctx.fill();
        ctx.fillStyle = '#d7ff8a';
        ctx.beginPath(); ctx.ellipse(0, -18, 22, 30, 0, 0, U.TAU); ctx.fill();
        U.text(ctx, '☠', 0, -18, { size: 30, color: '#2b4a12' });
        ctx.restore();
        // струя из бутыли
        if (pouring > 0.05) {
          ctx.save();
          ctx.globalAlpha = U.clamp(pouring * 1.4, 0, 1);
          ctx.strokeStyle = '#b6f04a'; ctx.lineWidth = 12; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(BOTTLE.x - 96, BOTTLE.y - 96);
          ctx.quadraticCurveTo(JAR.x + 180, JAR.top - 60, JAR.x + 60, surfaceY());
          ctx.stroke();
          ctx.restore();
        }

        if (!inside && sink < 0.02) drawSlugHere(ctx);

        UI.progress(ctx, 1060, 356, 340, 26, App.slug.fx.melt, '#8bc93a',
          'РАСТВОРЕНИЕ ' + Math.round(App.slug.fx.melt * 100) + '%');
        UI.progress(ctx, 1060, 396, 340, 18, level, '#c8f06a', '');
        U.text(ctx, 'кислоты в банке', 1230, 405, { size: 13, color: '#0d2408', weight: 800 });

        Object.values(btns).forEach((b) => b.draw(ctx, t));
        UI.hintBar(ctx, hint(), 990, 852, 700, t, '#8bc93a');
        Room.stepBadge(ctx, level < 0.99 ? 1 : 2, 2, 1060, 120);
      },

      onDown(p) {
        for (const b of Object.values(btns)) if (b.visible && b.hit(p)) { Sfx.click(); b.onClick(); return; }
        // клик по бутыли тоже наливает
        if (!inside && U.dist(p.x, p.y, BOTTLE.x, BOTTLE.y) < 110) { Sfx.click(); pour(); return; }
        if (!inside) {
          if (drag.tryGrab(p)) return;
          if (Math.abs(p.x - JAR.x) < JAR.w / 2 && p.y > JAR.top - 40 && p.y < JAR.bot) dropIn();
        }
      },
      onMove(p) { drag.move(p); },
      onUp() {
        if (drag.drop()) {
          const overJar = Math.abs(tw.x - JAR.x) < JAR.w / 2 + 60 && tw.y < JAR.bot;
          if (!overJar || !dropIn()) tw.to(HOME.x, HOME.y, HOME.s, 0.5);
        }
      }
    };

    function drawSlugHere(ctx) {
      const sub = inside && sink > 0.4;
      if (inside) {
        // тёмный ореол — иначе зелёный слизень теряется в зелёной кислоте
        ctx.save();
        const r = 190 * tw.s;
        const g = ctx.createRadialGradient(tw.x, tw.y, r * 0.3, tw.x, tw.y, r);
        g.addColorStop(0, 'rgba(14,46,6,0.7)');
        g.addColorStop(1, 'rgba(18,54,8,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(tw.x, tw.y, r, r * 0.8, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      SlugArt.draw(ctx, App.slug, {
        x: tw.x, y: tw.y, scale: tw.s, t,
        squash: 1 + Math.sin(t * (sub ? 10 : 1.7)) * (sub ? 0.06 : 0.03),
        state: sub ? 'scream' : 'idle',
        rot: inside ? Math.sin(t * 0.8) * 0.12 : 0,
        look: { x: U.clamp((App.pointer.x - tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - tw.y) / 400, -1, 1) },
        shadow: !inside
      });
    }
  };
})(window);
