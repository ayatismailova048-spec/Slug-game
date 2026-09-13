/* ============================================================
   stations/ice.js — прибор №7
   Шаги: открыть крышку → положить слизня → закрыть → ЗАМОРОЗИТЬ
   ============================================================ */
(function (global) {
  'use strict';

  const FRZ = { x: 800, top: 330, bot: 760, w: 620 };
  const HOME = { x: 270, y: 720, s: 0.5 };
  const IN = { x: FRZ.x, y: 610, s: 0.46 };

  StationImpl.ice = function () {
    let t = 0;
    let lid = 0;              // 0 закрыта .. 1 открыта
    let lidTarget = 0;
    let inside = false;
    let freezing = false;
    let timer = 0;            // секунды заморозки
    const DUR = 7;
    let frost = 0;            // иней на стекле
    let temp = 20;
    const parts = new FX.Particles(500);
    const tw = new Room.Tw(HOME.x, HOME.y, HOME.s);
    const drag = new global.DragSlug(tw, 150);
    let btns = {};

    function build() {
      btns = {
        lid: new UI.Btn({
          x: 1180, y: 190, w: 300, h: 66, label: 'Открыть крышку', icon: '⬆', font: 20,
          color: '#7a8b93', dark: '#4a575e', pulse: true,
          onClick: toggleLid
        }),
        freeze: new UI.Btn({
          x: 1180, y: 276, w: 300, h: 86, label: 'ЗАМОРОЗИТЬ', icon: '❄', font: 24,
          color: '#4aa8e0', dark: '#22608c', visible: false,
          onClick: startFreeze
        }),
        out: new UI.Btn({
          x: 1180, y: 378, w: 300, h: 62, label: 'Достать слизня', font: 20,
          color: '#63776e', dark: '#3d4c46', visible: false,
          onClick: takeOut
        })
      };
    }

    function toggleLid() {
      lidTarget = lidTarget > 0.5 ? 0 : 1;
      Sfx.switchSnap(); Sfx.pop(0.5);
      btns.lid.label = lidTarget > 0.5 ? 'Закрыть крышку' : 'Открыть крышку';
      btns.lid.pulse = false;
      if (lidTarget > 0.5) {
        // холодный туман вываливается
        parts.emit(24, () => ({
          kind: 'steam', x: FRZ.x + U.rand(-280, 280), y: FRZ.top + 40,
          vx: U.rand(-40, 40), vy: U.rand(20, 70), grav: 30,
          life: U.rand(1.4, 2.6), size: U.rand(16, 38), alpha: 0.55
        }));
        if (freezing) stopFreeze();
      }
      updateButtons();
    }

    function updateButtons() {
      btns.freeze.visible = inside && lidTarget < 0.5 && !freezing;
      btns.out.visible = inside && lidTarget > 0.5 && !freezing;
    }

    function startFreeze() {
      freezing = true; timer = 0;
      Sfx.loop('freezer', true, 1);
      Sfx.freezeZap();
      App.toast('Морозильник запущен', '#bfeaff');
      updateButtons();
    }
    function stopFreeze() {
      freezing = false;
      Sfx.loop('freezer', false);
      updateButtons();
    }

    function putIn() {
      if (lidTarget < 0.5) { App.toast('Сначала открой крышку'); return false; }
      inside = true; drag.enabled = false;
      tw.to(IN.x, IN.y, IN.s, 0.55);
      Sfx.squish(0.8);
      updateButtons();
      return true;
    }
    function takeOut() {
      inside = false; drag.enabled = true;
      stopFreeze();
      tw.to(HOME.x, HOME.y, HOME.s, 0.7, U.easeOutBack);
      updateButtons();
      App.toast('Теперь это ' + SlugModel.title(App.slug).toLowerCase(), '#bfeaff');
    }

    function hint() {
      if (!inside) return lidTarget > 0.5 ? 'Клади слизня в морозильник' : 'Открой крышку морозильника';
      if (lidTarget > 0.5 && !freezing) return 'Закрой крышку — иначе холод уйдёт';
      if (!freezing) return 'Жми ЗАМОРОЗИТЬ';
      return 'Морозим... ' + Math.max(0, Math.ceil(DUR - timer)) + ' сек';
    }

    return {
      enter() { build(); t = 0; tw.set(HOME.x, HOME.y, HOME.s); },
      exit() { Sfx.loop('freezer', false); },

      update(dt) {
        t += dt; tw.update(dt); parts.update(dt);
        lid = U.lerp(lid, lidTarget, Math.min(1, dt * 6));

        if (freezing) {
          timer += dt;
          temp = U.lerp(temp, -26, dt * 0.5);
          frost = U.clamp(frost + dt * 0.22, 0, 1);
          SlugModel.apply(App.slug, 'freeze', dt * (1 / DUR) * 0.95);
          if (Math.random() < dt * 24) {
            parts.add({
              kind: 'frost', x: FRZ.x + U.rand(-280, 280), y: FRZ.top + 60 + U.rand(0, 340),
              vx: U.rand(-14, 14), vy: U.rand(-10, 30), rot: U.rand(0, 6), vr: U.rand(-2, 2),
              life: U.rand(0.8, 2), size: U.rand(4, 12), alpha: 0.9
            });
          }
          if (Math.random() < dt * 10) {
            parts.add({
              kind: 'steam', x: FRZ.x + U.rand(-260, 260), y: FRZ.bot - 40,
              vx: U.rand(-20, 20), vy: U.rand(-30, -8), life: U.rand(1.4, 2.6),
              size: U.rand(14, 30), alpha: 0.4
            });
          }
          if (timer >= DUR) {
            stopFreeze();
            Sfx.chime(false);
            App.toast(App.slug.fx.iceBlock > 0.3 ? 'Слизень вмёрз в глыбу льда!' : 'Слизень заморожен', '#bfeaff');
            lidTarget = 1; btns.lid.label = 'Закрыть крышку';
            updateButtons();
          }
        } else {
          temp = U.lerp(temp, lidTarget > 0.5 ? 12 : -4, dt * 0.3);
          frost = U.clamp(frost - dt * 0.05, 0, 1);
        }

        Object.values(btns).forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#3c5567', wall2: '#1f3140', floor1: '#93a5ae', floor2: '#5d6f78', horizon: 620 });

        // холодное свечение
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cg = ctx.createRadialGradient(FRZ.x, 560, 30, FRZ.x, 560, 600);
        cg.addColorStop(0, `rgba(120,200,255,${0.06 + frost * 0.14})`);
        cg.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = cg; ctx.fillRect(0, 0, App.VW, App.VH);
        ctx.restore();

        // корпус морозильника
        ctx.save();
        U.shadowOn(ctx, 34, 'rgba(0,0,0,0.45)', 0, 18);
        const bg = ctx.createLinearGradient(0, FRZ.top, 0, FRZ.bot);
        bg.addColorStop(0, '#e9f1f5'); bg.addColorStop(1, '#b8c7cf');
        ctx.fillStyle = bg;
        U.roundRect(ctx, FRZ.x - FRZ.w / 2, FRZ.top, FRZ.w, FRZ.bot - FRZ.top, 26); ctx.fill();
        U.shadowOff(ctx);
        ctx.restore();

        // внутренность (окно)
        const winX = FRZ.x - FRZ.w / 2 + 40, winY = FRZ.top + 60;
        const winW = FRZ.w - 80, winH = FRZ.bot - FRZ.top - 130;
        ctx.save();
        U.roundRect(ctx, winX, winY, winW, winH, 18); ctx.clip();
        const ing = ctx.createLinearGradient(0, winY, 0, winY + winH);
        ing.addColorStop(0, '#5f7f93'); ing.addColorStop(1, '#2f4658');
        ctx.fillStyle = ing; ctx.fillRect(winX, winY, winW, winH);
        // полки-решётки
        ctx.strokeStyle = 'rgba(220,240,250,0.28)'; ctx.lineWidth = 5;
        for (let i = 0; i < 8; i++) {
          const x = winX + 40 + i * ((winW - 80) / 7);
          ctx.beginPath(); ctx.moveTo(x, winY + winH - 90); ctx.lineTo(x, winY + winH - 20); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(winX + 20, winY + winH - 50); ctx.lineTo(winX + winW - 20, winY + winH - 50); ctx.stroke();
        // слизень внутри
        if (inside) drawSlugHere(ctx);
        parts.draw(ctx);
        // иней на стекле
        if (frost > 0.01) {
          ctx.save();
          ctx.globalAlpha = frost * 0.75;
          const fg = ctx.createRadialGradient(FRZ.x, winY + winH / 2, 40, FRZ.x, winY + winH / 2, winW * 0.7);
          fg.addColorStop(0, 'rgba(235,250,255,0.1)');
          fg.addColorStop(1, 'rgba(225,245,255,0.95)');
          ctx.fillStyle = fg; ctx.fillRect(winX, winY, winW, winH);
          const rnd = U.mulberry32(99);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineCap = 'round';
          for (let i = 0; i < 60 * frost; i++) {
            const x = winX + rnd() * winW, y = winY + rnd() * winH;
            ctx.lineWidth = 1 + rnd() * 2.5;
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.lineTo(x + (rnd() * 34 - 17), y + (rnd() * 34 - 17)); ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();

        // рамка окна
        ctx.save();
        ctx.strokeStyle = '#dfe9ee'; ctx.lineWidth = 12;
        U.roundRect(ctx, winX, winY, winW, winH, 18); ctx.stroke();
        ctx.strokeStyle = 'rgba(120,150,165,0.6)'; ctx.lineWidth = 3;
        U.roundRect(ctx, winX + 7, winY + 7, winW - 14, winH - 14, 14); ctx.stroke();
        ctx.restore();

        // крышка
        ctx.save();
        const ang = -lid * 0.52;
        ctx.translate(FRZ.x - FRZ.w / 2, FRZ.top + 10);
        ctx.rotate(ang);
        U.shadowOn(ctx, 20, 'rgba(0,0,0,0.4)', 0, 10);
        const lg2 = ctx.createLinearGradient(0, -46, 0, 10);
        lg2.addColorStop(0, '#f4f9fb'); lg2.addColorStop(1, '#c2d0d8');
        ctx.fillStyle = lg2;
        U.roundRect(ctx, 0, -46, FRZ.w, 56, 16); ctx.fill();
        U.shadowOff(ctx);
        ctx.fillStyle = '#9fb0b9';
        U.roundRect(ctx, FRZ.w / 2 - 70, -66, 140, 22, 10); ctx.fill();
        U.text(ctx, '❄ FREEZER 3000', FRZ.w / 2, -20, { size: 20, color: '#6a8593', weight: 900 });
        ctx.restore();

        // панель термометра
        ctx.save();
        ctx.fillStyle = '#1b2a33';
        U.roundRect(ctx, FRZ.x - 150, FRZ.bot - 60, 300, 44, 12); ctx.fill();
        U.text(ctx, (temp > 0 ? '+' : '') + Math.round(temp) + ' °C',
          FRZ.x, FRZ.bot - 38, { size: 26, color: temp < -10 ? '#8fd8ff' : '#ffd9a0', weight: 900 });
        // лампочка работы
        ctx.fillStyle = freezing ? '#6be0ff' : '#3a4a52';
        ctx.beginPath(); ctx.arc(FRZ.x + 118, FRZ.bot - 38, 9, 0, U.TAU); ctx.fill();
        ctx.restore();

        if (!inside) drawSlugHere(ctx);

        if (freezing) {
          UI.progress(ctx, 1180, 470, 300, 26, timer / DUR, '#4aa8e0',
            'ЗАМОРОЗКА ' + Math.round((timer / DUR) * 100) + '%');
        }
        UI.progress(ctx, 1180, 510, 300, 22, App.slug.fx.frozen, '#9fd8f2',
          'ЛЁД ' + Math.round(App.slug.fx.frozen * 100) + '%');
        if (App.slug.fx.wet > 0.3 && !freezing) {
          U.text(ctx, 'Слизень мокрый — вмёрзнет в глыбу!', 1330, 556,
            { size: 17, color: '#bfeaff', weight: 800 });
        }

        Object.values(btns).forEach((b) => b.draw(ctx, t));
        UI.hintBar(ctx, hint(), 990, 852, 700, t, '#69b8e8');
        Room.stepBadge(ctx, !inside ? 1 : lidTarget > 0.5 ? 2 : 3, 3, 1180, 130);
      },

      onDown(p) {
        for (const b of Object.values(btns)) if (b.visible && b.hit(p) && b.enabled) { Sfx.click(); b.onClick(); return; }
        if (!inside) {
          if (drag.tryGrab(p)) return;
          if (Math.abs(p.x - FRZ.x) < FRZ.w / 2 && p.y > FRZ.top && p.y < FRZ.bot) putIn();
        }
      },
      onMove(p) { drag.move(p); },
      onUp() {
        if (drag.drop()) {
          if (Math.abs(tw.x - FRZ.x) < FRZ.w / 2 + 40 && tw.y > FRZ.top - 40 && tw.y < FRZ.bot) {
            if (!putIn()) tw.to(HOME.x, HOME.y, HOME.s, 0.5);
          } else tw.to(HOME.x, HOME.y, HOME.s, 0.5);
        }
      }
    };

    function drawSlugHere(ctx) {
      const cold = inside && freezing;
      SlugArt.draw(ctx, App.slug, {
        x: tw.x, y: tw.y, scale: tw.s, t,
        squash: 1 + Math.sin(t * (cold ? 9 : 1.7)) * (cold ? 0.05 : 0.03),
        state: cold ? 'pain' : 'idle',
        look: { x: U.clamp((App.pointer.x - tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - tw.y) / 400, -1, 1) },
        shadow: !inside
      });
      if (cold) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6);
        ctx.strokeStyle = '#cdefff'; ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(tw.x, tw.y, 120 + i * 26 + Math.sin(t * 3 + i) * 8, 0, U.TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  };
})(window);
