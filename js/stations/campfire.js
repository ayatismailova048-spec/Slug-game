/* ============================================================
   stations/campfire.js — прибор №2
   Шаги: подбросить дрова (3) → чиркнуть спичкой → держать слизня над огнём
   ============================================================ */
(function (global) {
  'use strict';

  const GROUND = 790;
  const FIRE = { x: 800, y: GROUND };
  const HOME = { x: 430, y: 700, s: 0.55 };
  const OVER = { x: 800, y: 486, s: 0.48 };

  StationImpl.campfire = function () {
    let t = 0;
    let wood = 0;              // 0..3
    let lit = false;
    let fireLevel = 0;         // 0..1 текущая мощность
    let fuel = 0;              // топливо, убывает
    let over = false;          // слизень над огнём
    let screamT = 0, emberT = 0, smokeT = 0;
    let matchFlash = 0;
    const parts = new FX.Particles(600);
    const tw = new Room.Tw(HOME.x, HOME.y, HOME.s);
    const drag = new global.DragSlug(tw, 150);
    let btns = {};

    function build() {
      btns = {
        wood: new UI.Btn({
          x: 1180, y: 170, w: 300, h: 70, label: 'Подбросить дров', icon: '🪵', font: 21,
          color: '#8b6034', dark: '#5b3c1d', pulse: true,
          onClick: addWood
        }),
        match: new UI.Btn({
          x: 1180, y: 256, w: 300, h: 70, label: 'Чиркнуть спичкой', icon: '🔥', font: 21,
          color: '#d9702f', dark: '#9a4614', enabled: false,
          onClick: ignite
        }),
        take: new UI.Btn({
          x: 1180, y: 342, w: 300, h: 70, label: 'Снять с огня', font: 21,
          color: '#4d8ec9', dark: '#2c5f8f', visible: false,
          onClick: takeOff
        })
      };
    }

    function addWood() {
      if (wood >= 3) { App.toast('Дров уже достаточно'); return; }
      wood++;
      fuel = Math.min(1, fuel + 0.42);
      Sfx.pop(0.5); Sfx.squish(0.5);
      App.shake(3);
      if (wood >= 3) { btns.wood.pulse = false; btns.match.enabled = true; btns.match.pulse = true; }
      if (lit) App.toast('Костёр разгорелся сильнее', '#ffb36b');
    }

    function ignite() {
      if (wood < 3 || lit) return;
      lit = true; matchFlash = 1;
      btns.match.enabled = false; btns.match.pulse = false;
      Sfx.matchStrike();
      setTimeout(() => Sfx.loop('fire', true, 1), 320);
      App.toast('Костёр загорелся!', '#ffb36b');
    }

    function putOver() {
      over = true; drag.enabled = false;
      tw.to(OVER.x, OVER.y, OVER.s, 0.5);
      btns.take.visible = true;
    }
    function takeOff() {
      over = false; drag.enabled = true;
      btns.take.visible = false;
      tw.to(HOME.x, HOME.y, HOME.s, 0.7, U.easeOutBack);
      Sfx.scream(0.4, 0.4);
      App.toast('Теперь это ' + SlugModel.title(App.slug).toLowerCase(), '#ffb36b');
    }

    function hint() {
      if (wood < 3) return 'Подбрось дров в кострище — нужно 3 полена';
      if (!lit) return 'Чиркни спичкой, чтобы разжечь костёр';
      if (!over) return 'Перетащи слизня на вертел над огнём';
      return 'Жарится! Сними с огня, пока не сгорел совсем';
    }

    return {
      enter() { build(); t = 0; tw.set(HOME.x, HOME.y, HOME.s); },
      exit() { Sfx.loop('fire', false); },

      update(dt) {
        t += dt; tw.update(dt); parts.update(dt);
        matchFlash = Math.max(0, matchFlash - dt * 2);

        if (lit) {
          fuel = Math.max(0.12, fuel - dt * 0.012);
          const target = 0.35 + fuel * 0.75;
          fireLevel = U.lerp(fireLevel, Math.min(1.25, target), dt * 1.6);
          Sfx.loop('fire', true, U.clamp(fireLevel, 0.3, 1));

          emberT -= dt;
          if (emberT <= 0) {
            emberT = 0.05 / Math.max(fireLevel, 0.2);
            parts.add({
              kind: 'ember', x: FIRE.x + U.rand(-60, 60) * fireLevel, y: GROUND - 20,
              vx: U.rand(-40, 40), vy: U.rand(-260, -140) * fireLevel,
              grav: 40, drag: 0.985, life: U.rand(0.9, 2.2), size: U.rand(1.6, 3.6), alpha: 1
            });
          }
          smokeT -= dt;
          if (smokeT <= 0) {
            smokeT = 0.09;
            parts.add({
              kind: 'smoke', x: FIRE.x + U.rand(-40, 40), y: GROUND - 150 * fireLevel,
              vx: U.rand(-24, 24), vy: U.rand(-90, -50), grav: -6, wind: 14,
              life: U.rand(1.8, 3.4), size: U.rand(16, 34), alpha: 0.7
            });
          }
          // языки пламени как частицы
          if (Math.random() < dt * 22 * fireLevel) {
            parts.add({
              kind: 'flame', x: FIRE.x + U.rand(-50, 50), y: GROUND - U.rand(0, 40),
              vx: U.rand(-30, 30), vy: U.rand(-190, -90), grav: -30,
              life: U.rand(0.3, 0.7), size: U.rand(10, 22), alpha: 0.45
            });
          }
        }

        if (over && lit) {
          const rate = 0.16 * fireLevel;
          SlugModel.apply(App.slug, 'burn', dt * rate);
          screamT -= dt;
          if (screamT <= 0) { Sfx.scream(0.5 + App.slug.fx.burns * 0.4, 0.55); screamT = 0.7 + Math.random() * 0.5; }
          App.shake(dt * 3);
          if (Math.random() < dt * 18) {
            parts.add({
              kind: 'smoke', x: tw.x + U.rand(-60, 60), y: tw.y,
              vx: U.rand(-20, 20), vy: U.rand(-60, -30), life: U.rand(1, 2),
              size: U.rand(8, 18), alpha: 0.5
            });
          }
          if (App.slug.fx.burns >= 0.995 && App.slug.alive === false) {
            // остаётся на вертеле, но уже не кричит
          }
        }
        Object.values(btns).forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },

      draw(ctx) {
        // ночная сцена
        const g = ctx.createLinearGradient(0, 0, 0, App.VH);
        g.addColorStop(0, '#0f1626'); g.addColorStop(0.45, '#1d2a3c'); g.addColorStop(0.8, '#30323a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, App.VW, App.VH);

        // звёзды
        ctx.save();
        const srnd = U.mulberry32(7);
        for (let i = 0; i < 90; i++) {
          const x = srnd() * App.VW, y = srnd() * 520;
          const tw2 = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + srnd() * 1.6) + i));
          ctx.fillStyle = `rgba(255,255,235,${tw2 * 0.9})`;
          ctx.beginPath(); ctx.arc(x, y, srnd() * 1.8 + 0.6, 0, U.TAU); ctx.fill();
        }
        ctx.restore();

        // луна
        ctx.save();
        const mg = ctx.createRadialGradient(330, 160, 10, 330, 160, 180);
        mg.addColorStop(0, 'rgba(235,240,255,0.35)'); mg.addColorStop(1, 'rgba(200,215,255,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(330, 160, 180, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#e8eefb';
        ctx.beginPath(); ctx.arc(330, 160, 56, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(190,200,225,0.55)';
        [[-18, -10, 12], [14, 8, 9], [4, -24, 7]].forEach(([ox, oy, r]) => {
          ctx.beginPath(); ctx.arc(330 + ox, 160 + oy, r, 0, U.TAU); ctx.fill();
        });
        ctx.restore();

        // дальние ёлки
        ctx.save();
        const trnd = U.mulberry32(31);
        for (let i = 0; i < 16; i++) {
          const x = 40 + i * 104 + trnd() * 50;
          const h = 130 + trnd() * 120;
          const w = 40 + trnd() * 26;
          const base = GROUND - 40;
          ctx.fillStyle = i % 2 ? '#16211c' : '#1b2a22';
          ctx.beginPath();
          ctx.moveTo(x, base - h);
          ctx.lineTo(x + w, base);
          ctx.lineTo(x - w, base);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, base - h * 1.18);
          ctx.lineTo(x + w * 0.68, base - h * 0.45);
          ctx.lineTo(x - w * 0.68, base - h * 0.45);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // земля
        ctx.fillStyle = '#3c3a30';
        ctx.beginPath();
        ctx.moveTo(0, GROUND - 40);
        for (let x = 0; x <= App.VW; x += 40) {
          ctx.lineTo(x, GROUND - 40 + Math.sin(x * 0.01) * 8);
        }
        ctx.lineTo(App.VW, App.VH); ctx.lineTo(0, App.VH); ctx.closePath(); ctx.fill();
        // травинки на переднем плане
        ctx.save();
        const grnd = U.mulberry32(53);
        ctx.strokeStyle = 'rgba(70,80,50,0.7)'; ctx.lineCap = 'round';
        for (let i = 0; i < 120; i++) {
          const x = grnd() * App.VW, y = GROUND - 20 + grnd() * 240;
          const hh = 8 + grnd() * 20;
          ctx.lineWidth = 1.5 + grnd() * 2;
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 5, y - hh * 0.6, x + 10 * (grnd() - 0.5), y - hh); ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(0, GROUND + 120, App.VW, App.VH);

        // свет костра на сцене
        if (fireLevel > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const flick = 0.75 + 0.25 * Math.sin(t * 11) * Math.sin(t * 4.3);
          const lg = ctx.createRadialGradient(FIRE.x, GROUND - 120, 30, FIRE.x, GROUND - 100, 720);
          lg.addColorStop(0, `rgba(255,170,70,${0.24 * fireLevel * flick})`);
          lg.addColorStop(1, 'rgba(255,120,20,0)');
          ctx.fillStyle = lg; ctx.fillRect(0, 0, App.VW, App.VH);
          ctx.restore();
        }

        // камни вокруг кострища
        const stones = [[-190, 8], [-120, 26], [-40, 34], [40, 34], [120, 26], [190, 8], [-150, -18], [150, -18]];
        stones.forEach(([ox, oy], i) => {
          const sx = FIRE.x + ox, sy = GROUND + oy;
          const sg = ctx.createLinearGradient(sx, sy - 24, sx, sy + 20);
          sg.addColorStop(0, '#a3a79c'); sg.addColorStop(1, '#5e6157');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.ellipse(sx, sy, 34 - (i % 3) * 5, 22 - (i % 2) * 4, i * 0.4, 0, U.TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.beginPath(); ctx.ellipse(sx - 8, sy - 7, 14, 7, 0.3, 0, U.TAU); ctx.fill();
        });

        // дрова
        for (let i = 0; i < wood; i++) {
          const ang = -0.55 + i * 0.55;
          ctx.save();
          ctx.translate(FIRE.x, GROUND + 6);
          ctx.rotate(ang);
          const charr = lit ? U.clamp(1 - fuel, 0, 0.85) : 0;
          const c1 = U.mixHsl({ h: 28, s: 46, l: 34 }, { h: 20, s: 8, l: 12 }, charr);
          ctx.fillStyle = U.colStr(c1);
          U.roundRect(ctx, -120, -14, 240, 28, 14); ctx.fill();
          ctx.fillStyle = U.colStr(U.shade(c1, -10));
          U.roundRect(ctx, -120, 2, 240, 12, 6); ctx.fill();
          // годовые кольца
          ctx.strokeStyle = U.colStr(U.shade(c1, 12), 0.7); ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            ctx.beginPath(); ctx.ellipse(112, 0, 5 + k * 3.5, 9 + k * 4, 0, 0, U.TAU); ctx.stroke();
          }
          // тлеющие угли
          if (lit) {
            ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 7 + i) * 40},40,${0.4 + 0.25 * Math.sin(t * 6 + i * 2)})`;
            for (let k = 0; k < 5; k++) {
              ctx.beginPath();
              ctx.ellipse(-90 + k * 45, U.rand(-6, 6), 12, 5, 0, 0, U.TAU); ctx.fill();
            }
          }
          ctx.restore();
        }

        // угли под костром
        if (lit) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const cg = ctx.createRadialGradient(FIRE.x, GROUND + 10, 4, FIRE.x, GROUND + 10, 150);
          cg.addColorStop(0, `rgba(255,140,40,${0.5 * fireLevel})`);
          cg.addColorStop(1, 'rgba(255,80,10,0)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.ellipse(FIRE.x, GROUND + 10, 150, 40, 0, 0, U.TAU); ctx.fill();
          ctx.restore();
        }

        // тренога с крюком
        ctx.save();
        ctx.lineCap = 'round';
        const legs = [[-230, 6], [230, 6], [30, -70]];
        legs.forEach(([ox, oy]) => {
          ctx.strokeStyle = '#5c4526'; ctx.lineWidth = 16;
          ctx.beginPath(); ctx.moveTo(FIRE.x + ox, GROUND + oy); ctx.lineTo(FIRE.x + 4, 356); ctx.stroke();
          ctx.strokeStyle = '#7a5c33'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(FIRE.x + ox, GROUND + oy); ctx.lineTo(FIRE.x + 4, 356); ctx.stroke();
        });
        // верёвка на вершине
        ctx.strokeStyle = '#c9b68a'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(FIRE.x + 4, 362, 22, 0, U.TAU); ctx.stroke();
        // подвес
        ctx.strokeStyle = '#cdd6d0'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(FIRE.x + 4, 380); ctx.lineTo(FIRE.x + 4, over ? tw.y - 60 : 424); ctx.stroke();
        if (!over) {
          ctx.strokeStyle = '#b9c4bd'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.arc(FIRE.x + 4, 436, 18, Math.PI * 0.15, Math.PI * 1.2); ctx.stroke();
        }
        ctx.restore();

        // слизень (за пламенем, если над огнём)
        drawSlugHere(ctx);

        // само пламя
        if (lit) {
          FX.drawFire(ctx, FIRE.x, GROUND, 150 * (0.7 + fireLevel * 0.4), 300 * fireLevel, t, U.clamp(fireLevel, 0, 1), 5);
        }
        parts.draw(ctx);

        // вспышка спички
        if (matchFlash > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,220,140,${matchFlash * 0.35})`;
          ctx.fillRect(0, 0, App.VW, App.VH);
          ctx.restore();
        }

        // поленница справа
        ctx.save();
        for (let i = 0; i < 3 - wood; i++) {
          ctx.save();
          ctx.translate(1300, GROUND + 20 - i * 28);
          ctx.rotate(0.05 * i);
          ctx.fillStyle = '#7a5228';
          U.roundRect(ctx, -90, -13, 180, 26, 13); ctx.fill();
          ctx.fillStyle = '#5c3c1c';
          U.roundRect(ctx, -90, 0, 180, 13, 6); ctx.fill();
          ctx.fillStyle = '#c8a06a';
          ctx.beginPath(); ctx.ellipse(86, 0, 8, 13, 0, 0, U.TAU); ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        // индикатор обугленности
        UI.progress(ctx, 1180, 440, 300, 26, App.slug.fx.burns, '#e2713a',
          'ОЖОГИ ' + Math.round(App.slug.fx.burns * 100) + '%');
        UI.progress(ctx, 1180, 478, 300, 18, fuel, '#f0c04a', '');
        U.text(ctx, 'дрова', 1330, 487, { size: 13, color: '#fff', weight: 800 });

        Object.values(btns).forEach((b) => b.draw(ctx, t));
        UI.hintBar(ctx, hint(), 990, 852, 700, t, '#e2713a');
        Room.stepBadge(ctx, wood < 3 ? 1 : !lit ? 2 : 3, 3, 1180, 120);
      },

      onDown(p) {
        for (const b of Object.values(btns)) if (b.visible && b.hit(p) && b.enabled) { Sfx.click(); b.onClick(); return; }
        // клик по поленнице
        if (p.x > 1200 && p.x < 1400 && p.y > GROUND - 70 && p.y < GROUND + 50 && wood < 3) { addWood(); return; }
        if (!over) drag.tryGrab(p);
      },
      onMove(p) { drag.move(p); },
      onUp() {
        if (drag.drop()) {
          if (Math.abs(tw.x - FIRE.x) < 280 && tw.y < 640) {
            if (lit) putOver();
            else { App.toast('Сначала разожги костёр'); tw.to(HOME.x, HOME.y, HOME.s, 0.5); }
          } else tw.to(HOME.x, HOME.y, HOME.s, 0.5);
        }
      }
    };

    function drawSlugHere(ctx) {
      const burning = over && lit;
      SlugArt.draw(ctx, App.slug, {
        x: tw.x, y: tw.y + (burning ? Math.sin(t * 9) * 5 : 0), scale: tw.s, t,
        rot: burning ? Math.sin(t * 4) * 0.08 : 0,
        squash: 1 + Math.sin(t * (burning ? 12 : 1.7)) * (burning ? 0.07 : 0.03),
        state: burning ? 'scream' : 'idle',
        look: burning ? { x: Math.sin(t * 6), y: -0.6 } : {
          x: U.clamp((App.pointer.x - tw.x) / 400, -1, 1),
          y: U.clamp((App.pointer.y - tw.y) / 400, -1, 1)
        },
        shadow: !over
      });
      // верёвка к вертелу
      if (over) {
        ctx.save();
        ctx.strokeStyle = '#c9b68a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(FIRE.x + 4, tw.y - 62); ctx.lineTo(tw.x - 26, tw.y - 20);
        ctx.moveTo(FIRE.x + 4, tw.y - 62); ctx.lineTo(tw.x + 26, tw.y - 20);
        ctx.stroke();
        ctx.restore();
      }
    }
  };
})(window);
