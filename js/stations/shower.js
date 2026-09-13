/* ============================================================
   stations/shower.js — прибор №4
   Шаги: посадить слизня в ванну → открыть вентиль → выбрать температуру
   ============================================================ */
(function (global) {
  'use strict';

  const TUB = { x: 760, y: 700, w: 520, h: 170 };
  const HOME = { x: 280, y: 740, s: 0.5 };
  const IN = { x: TUB.x, y: 616, s: 0.5 };

  StationImpl.shower = function () {
    let t = 0;
    let inTub = false;
    let valve = 0;            // 0..1 напор
    let valveDrag = false;
    let temp = 0.45;          // 0 холодная .. 1 горячая
    let tempDrag = false;
    let water = 0;            // уровень воды в ванне
    let soap = 0;             // пена
    const parts = new FX.Particles(600);
    const tw = new Room.Tw(HOME.x, HOME.y, HOME.s);
    const drag = new global.DragSlug(tw, 150);
    let btns = {};
    const KNOB = { x: 1230, y: 330, r: 66 };
    const SLIDER = { x: 1120, y: 470, w: 300, h: 26 };

    function build() {
      btns = {
        soap: new UI.Btn({
          x: 1120, y: 540, w: 300, h: 62, label: 'Налить мыло', icon: '🧼', font: 20,
          color: '#5fb6d8', dark: '#2f7fa2',
          onClick: () => {
            soap = U.clamp(soap + 0.5, 0, 1);
            Sfx.pop(1.4); App.toast('Пена!', '#d8f4ff');
          }
        }),
        out: new UI.Btn({
          x: 1120, y: 614, w: 300, h: 62, label: 'Вынуть слизня', font: 20,
          color: '#4d8ec9', dark: '#2c5f8f', visible: false,
          onClick: () => {
            inTub = false; drag.enabled = true; btns.out.visible = false;
            tw.to(HOME.x, HOME.y, HOME.s, 0.7, U.easeOutBack);
            App.toast('Теперь это ' + SlugModel.title(App.slug).toLowerCase(), '#9fdcff');
          }
        })
      };
    }

    function putIn() {
      inTub = true; drag.enabled = false;
      tw.to(IN.x, IN.y, IN.s, 0.5);
      btns.out.visible = true;
      Sfx.squish(0.9);
    }

    function hint() {
      if (!inTub) return 'Посади слизня в ванну';
      if (valve < 0.05) return 'Крути вентиль (тяни вверх/вниз), чтобы пошла вода';
      if (temp > 0.75) return 'Горячо! Идёт пар. Слизень становится мокрым';
      if (temp < 0.25) return 'Ледяная вода. Отличная подготовка к заморозке!';
      return 'Тёплая вода: смывает копоть и поднимает настроение';
    }

    return {
      enter() { build(); t = 0; tw.set(HOME.x, HOME.y, HOME.s); },
      exit() { Sfx.loop('water', false); },

      update(dt) {
        t += dt; tw.update(dt); parts.update(dt);

        if (valve > 0.03) {
          Sfx.loop('water', true, valve);
          water = U.clamp(water + dt * valve * 0.2, 0, 0.8);
          // капли из лейки
          parts.emit(Math.round(valve * 6), () => ({
            kind: 'drop', x: TUB.x + U.rand(-110, 110), y: 300,
            vy: U.rand(420, 780), vx: U.rand(-16, 16), grav: 900,
            life: U.rand(0.35, 0.6), size: U.rand(3, 7),
            col: temp > 0.7 ? 'rgba(255,205,190,0.75)' : 'rgba(160,220,250,0.8)'
          }));
          if (temp > 0.65 && Math.random() < dt * 26) {
            parts.add({
              kind: 'steam', x: TUB.x + U.rand(-200, 200), y: TUB.y - 40,
              vx: U.rand(-30, 30), vy: U.rand(-90, -40), life: U.rand(1.6, 3),
              size: U.rand(16, 34), alpha: 0.7
            });
          }
          if (inTub) {
            SlugModel.apply(App.slug, 'shower', dt * valve * 0.5, { hot: temp > 0.65 });
            if (temp > 0.8) App.slug.mood = U.clamp(App.slug.mood - dt * 0.1, 0, 1);
            if (soap > 0) soap = U.clamp(soap - dt * 0.05, 0, 1);
          }
        } else {
          Sfx.loop('water', false);
          water = U.clamp(water - dt * 0.05, 0, 1);
        }

        // пена
        if (soap > 0.02 && Math.random() < dt * 30 * soap) {
          parts.add({
            kind: 'bubble', x: TUB.x + U.rand(-220, 220), y: TUB.y + 40 - water * 60,
            vy: U.rand(-40, -8), vx: U.rand(-20, 20), life: U.rand(1.4, 3),
            size: U.rand(5, 20), col: 'rgba(255,255,255,0.9)', alpha: 0.9
          });
        }

        Object.values(btns).forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },

      draw(ctx) {
        // ванная комната
        const g = ctx.createLinearGradient(0, 0, 0, App.VH);
        g.addColorStop(0, '#cfe6ea'); g.addColorStop(0.6, '#a8cdd6'); g.addColorStop(1, '#8fb3bd');
        ctx.fillStyle = g; ctx.fillRect(0, 0, App.VW, App.VH);
        // плитка
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
        for (let x = 0; x <= App.VW; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 860); ctx.stroke(); }
        for (let y = 0; y <= 860; y += 96) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(App.VW, y); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = '#7fa2ab'; ctx.fillRect(0, 860, App.VW, App.VH - 860);

        // труба и лейка
        ctx.save();
        ctx.strokeStyle = '#b7c5c7'; ctx.lineWidth = 18; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(TUB.x, 60); ctx.lineTo(TUB.x, 250); ctx.stroke();
        ctx.strokeStyle = '#dbe6e8'; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(TUB.x, 60); ctx.lineTo(TUB.x, 250); ctx.stroke();
        U.shadowOn(ctx, 16, 'rgba(0,0,0,0.3)', 0, 8);
        const hg = ctx.createLinearGradient(0, 250, 0, 300);
        hg.addColorStop(0, '#eef4f5'); hg.addColorStop(1, '#a9b8ba');
        ctx.fillStyle = hg;
        U.roundRect(ctx, TUB.x - 130, 252, 260, 46, 20); ctx.fill();
        U.shadowOff(ctx);
        ctx.fillStyle = '#6f8084';
        for (let i = 0; i < 11; i++) {
          ctx.beginPath(); ctx.arc(TUB.x - 110 + i * 22, 296, 4, 0, U.TAU); ctx.fill();
        }
        ctx.restore();

        // струя
        if (valve > 0.03) {
          const alpha = 0.35 + valve * 0.5;
          FX.drawWaterStream(ctx, TUB.x, 298, TUB.y - 20 - water * 40, 230 * (0.5 + valve * 0.6), t, alpha, 3);
          if (temp > 0.65) {
            ctx.save(); ctx.globalAlpha = (temp - 0.65) * 0.6;
            ctx.fillStyle = 'rgba(255,180,160,0.25)';
            ctx.fillRect(TUB.x - 130, 298, 260, TUB.y - 320); ctx.restore();
          }
        }

        // ванна — задняя часть
        ctx.save();
        U.shadowOn(ctx, 26, 'rgba(0,0,0,0.3)', 0, 14);
        ctx.fillStyle = '#e9f1f2';
        U.roundRect(ctx, TUB.x - TUB.w / 2, TUB.y - 60, TUB.w, TUB.h + 60, 90); ctx.fill();
        U.shadowOff(ctx);
        ctx.restore();

        // содержимое ванны
        ctx.save();
        U.roundRect(ctx, TUB.x - TUB.w / 2 + 16, TUB.y - 44, TUB.w - 32, TUB.h + 28, 76);
        ctx.clip();
        // внутренняя чаша
        const inner = ctx.createLinearGradient(0, TUB.y - 44, 0, TUB.y + TUB.h);
        inner.addColorStop(0, '#cfdee1');
        inner.addColorStop(0.45, '#eef5f6');
        inner.addColorStop(1, '#b9cdd1');
        ctx.fillStyle = inner;
        ctx.fillRect(TUB.x - TUB.w / 2, TUB.y - 60, TUB.w, TUB.h + 80);
        // сливное отверстие
        ctx.fillStyle = '#9fb2b6';
        ctx.beginPath(); ctx.ellipse(TUB.x, TUB.y + TUB.h - 34, 26, 10, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#7d9195';
        ctx.beginPath(); ctx.ellipse(TUB.x, TUB.y + TUB.h - 34, 15, 6, 0, 0, U.TAU); ctx.fill();
        if (inTub) drawSlugHere(ctx);
        if (water > 0.01) {
          const wy = TUB.y + 90 - water * 130;
          const c1 = temp > 0.65 ? 'rgba(160,215,230,0.5)' : 'rgba(120,205,238,0.5)';
          FX.drawLiquidSurface(ctx, TUB.x, wy, TUB.w, t, c1, 'rgba(30,120,160,0.6)', 5, 0.03);
        }
        parts.draw(ctx);
        ctx.restore();

        // борт ванны
        ctx.save();
        ctx.strokeStyle = '#f7fbfb'; ctx.lineWidth = 16;
        U.roundRect(ctx, TUB.x - TUB.w / 2, TUB.y - 60, TUB.w, TUB.h + 60, 90); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,180,190,0.6)'; ctx.lineWidth = 3;
        U.roundRect(ctx, TUB.x - TUB.w / 2 + 8, TUB.y - 52, TUB.w - 16, TUB.h + 44, 82); ctx.stroke();
        // ножки
        ctx.fillStyle = '#c9d6d8';
        U.roundRect(ctx, TUB.x - TUB.w / 2 + 40, TUB.y + TUB.h, 40, 46, 12); ctx.fill();
        U.roundRect(ctx, TUB.x + TUB.w / 2 - 80, TUB.y + TUB.h, 40, 46, 12); ctx.fill();
        ctx.restore();

        if (!inTub) drawSlugHere(ctx);

        // панель управления
        UI.panel(ctx, 1080, 250, 380, 400, 22, 'rgba(20,40,48,0.72)');
        U.text(ctx, 'ВЕНТИЛЬ', KNOB.x, 268, { size: 18, color: '#d8f2ff', weight: 800 });
        UI.knob(ctx, KNOB.x, KNOB.y, KNOB.r, valve, t, '#dfe9ea', temp > 0.7);
        U.text(ctx, Math.round(valve * 100) + '%', KNOB.x, KNOB.y + KNOB.r + 22, { size: 18, color: '#cfe9f5', weight: 800 });

        // температура
        U.text(ctx, 'ТЕМПЕРАТУРА', SLIDER.x + SLIDER.w / 2, SLIDER.y - 18, { size: 16, color: '#d8f2ff', weight: 800 });
        ctx.save();
        const tg = ctx.createLinearGradient(SLIDER.x, 0, SLIDER.x + SLIDER.w, 0);
        tg.addColorStop(0, '#4ab8f0'); tg.addColorStop(1, '#f05a3c');
        ctx.fillStyle = tg;
        U.roundRect(ctx, SLIDER.x, SLIDER.y, SLIDER.w, SLIDER.h, 13); ctx.fill();
        const hx = SLIDER.x + SLIDER.w * temp;
        U.shadowOn(ctx, 10, 'rgba(0,0,0,0.4)', 0, 4);
        ctx.fillStyle = '#fff';
        U.roundRect(ctx, hx - 13, SLIDER.y - 8, 26, SLIDER.h + 16, 10); ctx.fill();
        U.shadowOff(ctx);
        ctx.restore();
        U.text(ctx, temp > 0.75 ? 'ГОРЯЧАЯ' : temp < 0.25 ? 'ЛЕДЯНАЯ' : 'ТЁПЛАЯ',
          SLIDER.x + SLIDER.w / 2, SLIDER.y + 48, { size: 17, color: '#eafaff', weight: 800 });

        Object.values(btns).forEach((b) => b.draw(ctx, t));
        UI.hintBar(ctx, hint(), 990, 852, 700, t, '#3fb0d8');
        Room.stepBadge(ctx, !inTub ? 1 : valve < 0.05 ? 2 : 3, 3, 1120, 180);
      },

      onDown(p) {
        for (const b of Object.values(btns)) if (b.visible && b.hit(p)) { Sfx.click(); b.onClick(); return; }
        if (U.dist(p.x, p.y, KNOB.x, KNOB.y) < KNOB.r + 20) { valveDrag = true; Sfx.switchSnap(); return; }
        if (p.x > SLIDER.x - 20 && p.x < SLIDER.x + SLIDER.w + 20 &&
            p.y > SLIDER.y - 22 && p.y < SLIDER.y + SLIDER.h + 22) {
          tempDrag = true; temp = U.clamp(U.inv(SLIDER.x, SLIDER.x + SLIDER.w, p.x), 0, 1); return;
        }
        if (!inTub) {
          if (drag.tryGrab(p)) return;
          if (Math.abs(p.x - TUB.x) < TUB.w / 2 && p.y > TUB.y - 80 && p.y < TUB.y + TUB.h) putIn();
        }
      },
      onMove(p) {
        if (valveDrag) {
          const dy = (KNOB.y + KNOB.r) - p.y;
          valve = U.clamp(dy / (KNOB.r * 2.4), 0, 1);
        }
        if (tempDrag) temp = U.clamp(U.inv(SLIDER.x, SLIDER.x + SLIDER.w, p.x), 0, 1);
        drag.move(p);
      },
      onUp() {
        valveDrag = false; tempDrag = false;
        if (drag.drop()) {
          if (Math.abs(tw.x - TUB.x) < TUB.w / 2 + 60 && tw.y > 480) putIn();
          else tw.to(HOME.x, HOME.y, HOME.s, 0.5);
        }
      }
    };

    function drawSlugHere(ctx) {
      const washing = inTub && valve > 0.05;
      SlugArt.draw(ctx, App.slug, {
        x: tw.x, y: tw.y, scale: tw.s, t,
        squash: 1 + Math.sin(t * (washing ? 5 : 1.7)) * 0.04,
        state: washing && temp > 0.85 ? 'pain' : 'idle',
        look: { x: U.clamp((App.pointer.x - tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - tw.y) / 400, -1, 1) },
        shadow: !inTub
      });
    }
  };
})(window);
