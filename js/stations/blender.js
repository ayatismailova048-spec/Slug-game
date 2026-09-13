/* ============================================================
   stations/blender.js — прибор №1
   Шаги: положить слизня → закрыть крышку → выбрать скорость → ПУСК
   ============================================================ */
(function (global) {
  'use strict';

  const JAR = { x: 880, top: 258, bot: 566, wTop: 206, wBot: 156 };
  const HOME = { x: 400, y: 648, s: 0.62 };
  const IN = { x: JAR.x, y: 470, s: 0.40 };

  StationImpl.blender = function () {
    let t = 0;
    let phase = 'idle';        // idle | in | closed | run | done
    let lidClosed = false;
    let speed = 1;             // 1,2,3(турбо)
    let blend = 0;             // накопленное измельчение 0..1
    let spin = 0, spinV = 0;
    let mist = 0;
    let screamTimer = 0;
    const parts = new FX.Particles(400);
    const tw = new Room.Tw(HOME.x, HOME.y, HOME.s);
    const drag = new global.DragSlug(tw, 150);
    let btns = {};

    function speedFactor() { return [0, 0.30, 0.52, 0.95][speed]; }

    function build() {
      btns = {
        lid: new UI.Btn({
          x: 1130, y: 300, w: 250, h: 62, label: 'Закрыть крышку', font: 20,
          color: '#7a8b83', dark: '#4c5a54', visible: false,
          onClick: () => {
            lidClosed = true; phase = 'closed'; Sfx.switchSnap();
            btns.lid.visible = false; showRun(true);
          }
        }),
        s1: new UI.Btn({ x: 1130, y: 392, w: 76, h: 56, label: '1', font: 24, color: '#5b7f9c', dark: '#3a5468', visible: false, onClick: () => setSpeed(1) }),
        s2: new UI.Btn({ x: 1216, y: 392, w: 76, h: 56, label: '2', font: 24, color: '#5b7f9c', dark: '#3a5468', visible: false, onClick: () => setSpeed(2) }),
        s3: new UI.Btn({ x: 1302, y: 392, w: 82, h: 56, label: 'ТУРБО', font: 15, color: '#b8563f', dark: '#7d3225', visible: false, onClick: () => setSpeed(3) }),
        power: new UI.Btn({
          x: 1130, y: 470, w: 254, h: 78, label: 'ПУСК', font: 28, icon: '⏻',
          color: '#3fbf6f', dark: '#22834a', visible: false, pulse: true,
          onClick: () => togglePower()
        }),
        open: new UI.Btn({
          x: 1130, y: 570, w: 254, h: 62, label: 'Открыть и достать', font: 19,
          color: '#c98a2f', dark: '#8d5b13', visible: false,
          onClick: () => finish()
        })
      };
    }

    function setSpeed(v) { speed = v; Sfx.click(1.1 + v * 0.1); }

    function showRun(v) {
      btns.s1.visible = btns.s2.visible = btns.s3.visible = v;
      btns.power.visible = v;
    }

    function togglePower() {
      if (phase === 'run') {
        phase = 'closed';
        Sfx.loop('motor', false);
        btns.power.label = 'ПУСК'; btns.power.color = '#3fbf6f'; btns.power.dark = '#22834a';
        btns.open.visible = true;
      } else if (phase === 'closed') {
        phase = 'run';
        Sfx.init(); Sfx.loop('motor', true, 0.3 + speed * 0.25);
        btns.power.label = 'СТОП'; btns.power.color = '#e2574c'; btns.power.dark = '#a8362d';
        btns.open.visible = false;
      }
    }

    function finish() {
      Sfx.loop('motor', false);
      if (blend > 0.02) {
        SlugModel.apply(App.slug, 'blend', blend);
        Sfx.squish(0.7);
        App.toast('Теперь это ' + SlugModel.title(App.slug).toLowerCase(), '#ff8a7a');
      }
      blend = 0; mist = 0; lidClosed = false; speed = 1;
      phase = 'idle';
      showRun(false); btns.open.visible = false; btns.lid.visible = false;
      btns.power.label = 'ПУСК'; btns.power.color = '#3fbf6f'; btns.power.dark = '#22834a';
      tw.set(JAR.x, JAR.top - 40, 0.35);
      tw.to(HOME.x, HOME.y, HOME.s, 0.85, U.easeOutBack);
      drag.enabled = true;
    }

    function putIn() {
      phase = 'in'; drag.enabled = false;
      tw.to(IN.x, IN.y, IN.s, 0.6, U.easeOutCubic, () => { Sfx.squish(0.8); });
      btns.lid.visible = true;
    }

    const hints = {
      idle: 'Перетащи слизня в чашу блендера (или кликни по чаше)',
      in: 'Закрой крышку — без неё блендер не включится',
      closed: 'Выбери скорость и нажми ПУСК',
      run: 'Работает! Нажми СТОП, когда хватит',
      done: ''
    };

    return {
      enter() { build(); t = 0; phase = 'idle'; tw.set(HOME.x, HOME.y, HOME.s); drag.enabled = true; },
      exit() { Sfx.loop('motor', false); },

      update(dt) {
        t += dt;
        tw.update(dt);
        parts.update(dt);

        if (phase === 'run') {
          const f = speedFactor();
          blend = U.clamp(blend + dt * f * 0.42, 0, 1);
          spinV = U.lerp(spinV, 9 + speed * 7, dt * 4);
          mist = U.lerp(mist, U.clamp(blend * 1.3, 0, 1), dt * 2);
          App.shake(dt * (6 + speed * 8));
          screamTimer -= dt;
          if (screamTimer <= 0) { Sfx.scream(0.55 + speed * 0.15, 0.45); screamTimer = 0.42 + Math.random() * 0.3; }
          // брызги внутри чаши
          parts.emit(2, () => ({
            kind: 'goo', x: JAR.x + U.rand(-70, 70), y: 470 + U.rand(-60, 60),
            vx: U.rand(-160, 160), vy: U.rand(-160, 160), grav: 200,
            life: U.rand(0.3, 0.7), size: U.rand(3, 9),
            col: Math.random() < 0.4 ? 'rgba(200,40,40,0.85)' : U.colStr(App.slug.color, 0.85)
          }));
          Sfx.loop('motor', true, 0.3 + speed * 0.25);
        } else {
          spinV = U.lerp(spinV, 0, dt * 3);
          mist = U.lerp(mist, phase === 'idle' ? 0 : mist * 0.98, dt);
        }
        spin += spinV * dt;

        Object.values(btns).forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#44605d', wall2: '#25403f', horizon: 660 });
        Room.drawCounter(ctx, 180, 700, 1240, 60);

        // --- корпус блендера ---
        const bx = JAR.x, baseY = 700;
        ctx.save();
        U.shadowOn(ctx, 30, 'rgba(0,0,0,0.45)', 0, 16);
        const bg = ctx.createLinearGradient(bx - 140, 0, bx + 140, 0);
        bg.addColorStop(0, '#3b4f48'); bg.addColorStop(0.5, '#546b62'); bg.addColorStop(1, '#2d3e38');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(bx - 140, baseY); ctx.lineTo(bx - 100, 556);
        ctx.lineTo(bx + 100, 556); ctx.lineTo(bx + 140, baseY);
        ctx.closePath(); ctx.fill();
        U.shadowOff(ctx);
        ctx.fillStyle = '#22302b';
        U.roundRect(ctx, bx - 140, baseY - 10, 280, 22, 8); ctx.fill();
        // панель
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        U.roundRect(ctx, bx - 82, 612, 164, 62, 12); ctx.fill();
        for (let i = 0; i < 3; i++) {
          const on = (phase === 'run' && speed >= i + 1);
          ctx.fillStyle = on ? ['#7fd46b', '#f0c04a', '#ff6a4a'][i] : '#3c4a44';
          ctx.beginPath(); ctx.arc(bx - 48 + i * 40, 632, 11, 0, U.TAU); ctx.fill();
          if (on) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(bx - 48 + i * 40, 632, 2, bx - 48 + i * 40, 632, 26);
            g.addColorStop(0, 'rgba(255,255,200,0.5)'); g.addColorStop(1, 'rgba(255,255,200,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx - 48 + i * 40, 632, 26, 0, U.TAU); ctx.fill();
            ctx.restore();
          }
        }
        U.text(ctx, 'SLUG-O-MATIC', bx, 662, { size: 14, color: '#9fb3aa', weight: 800 });
        ctx.restore();

        // --- чаша: сначала содержимое, потом стекло ---
        const jarPath = (c, inset = 0) => {
          c.beginPath();
          c.moveTo(JAR.x - JAR.wTop / 2 + inset, JAR.top + inset);
          c.lineTo(JAR.x - JAR.wBot / 2 + inset, JAR.bot - inset);
          c.lineTo(JAR.x + JAR.wBot / 2 - inset, JAR.bot - inset);
          c.lineTo(JAR.x + JAR.wTop / 2 - inset, JAR.top + inset);
          c.closePath();
        };

        ctx.save();
        jarPath(ctx, 6); ctx.clip();
        // слизень внутри
        if (phase !== 'idle' || tw.x > JAR.x - 120) {
          drawSlugHere(ctx);
        }
        parts.draw(ctx);
        // кровавая взвесь
        if (mist > 0.01) {
          ctx.save();
          ctx.globalAlpha = mist * 0.5;
          const mg = ctx.createLinearGradient(0, JAR.top, 0, JAR.bot);
          mg.addColorStop(0, 'rgba(190,60,50,0.35)');
          mg.addColorStop(1, 'rgba(120,25,25,0.85)');
          ctx.fillStyle = mg;
          const lvl = JAR.bot - 240 * mist;
          FX.drawLiquidSurface(ctx, JAR.x, lvl, JAR.wTop, t, 'rgba(200,70,55,0.9)', 'rgba(110,20,20,0.95)', 6 + spinV * 0.3, 0.04);
          ctx.restore();
        }
        // ножи
        ctx.save();
        ctx.translate(JAR.x, JAR.bot - 26);
        ctx.rotate(spin);
        ctx.fillStyle = '#b9c6c0';
        U.roundRect(ctx, -54, -5, 108, 10, 5); ctx.fill();
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#98a7a0';
        U.roundRect(ctx, -40, -5, 80, 10, 5); ctx.fill();
        ctx.restore();
        ctx.restore();

        // стекло
        ctx.save();
        jarPath(ctx);
        const gg = ctx.createLinearGradient(JAR.x - 110, 0, JAR.x + 110, 0);
        gg.addColorStop(0, 'rgba(225,245,250,0.30)');
        gg.addColorStop(0.25, 'rgba(255,255,255,0.10)');
        gg.addColorStop(0.55, 'rgba(180,215,225,0.14)');
        gg.addColorStop(1, 'rgba(225,245,250,0.34)');
        ctx.fillStyle = gg; ctx.fill();
        ctx.strokeStyle = 'rgba(235,250,255,0.85)'; ctx.lineWidth = 5; ctx.stroke();
        // мерные полоски
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        for (let i = 1; i <= 4; i++) {
          const y = JAR.top + (JAR.bot - JAR.top) * (i / 5);
          ctx.beginPath(); ctx.moveTo(JAR.x + 46, y); ctx.lineTo(JAR.x + 72, y); ctx.stroke();
        }
        // блик
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(JAR.x - 74, JAR.top + 16); ctx.lineTo(JAR.x - 54, JAR.top + 16);
        ctx.lineTo(JAR.x - 40, JAR.bot - 24); ctx.lineTo(JAR.x - 60, JAR.bot - 24);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        // ручка
        ctx.save();
        ctx.strokeStyle = '#9fada6'; ctx.lineWidth = 16; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(JAR.x + 100, JAR.top + 40);
        ctx.quadraticCurveTo(JAR.x + 190, JAR.top + 150, JAR.x + 90, JAR.bot - 40);
        ctx.stroke();
        ctx.strokeStyle = '#cfdad4'; ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(JAR.x + 100, JAR.top + 40);
        ctx.quadraticCurveTo(JAR.x + 190, JAR.top + 150, JAR.x + 90, JAR.bot - 40);
        ctx.stroke();
        ctx.restore();

        // крышка
        ctx.save();
        const lidY = lidClosed ? JAR.top - 26 : JAR.top - 96;
        U.shadowOn(ctx, 16, 'rgba(0,0,0,0.4)', 0, 8);
        const lg = ctx.createLinearGradient(0, lidY, 0, lidY + 30);
        lg.addColorStop(0, '#6d7f77'); lg.addColorStop(1, '#414f49');
        ctx.fillStyle = lg;
        U.roundRect(ctx, JAR.x - JAR.wTop / 2 - 10, lidY, JAR.wTop + 20, 30, 12); ctx.fill();
        U.shadowOff(ctx);
        ctx.fillStyle = '#8e9f97';
        U.roundRect(ctx, JAR.x - 34, lidY - 16, 68, 20, 9); ctx.fill();
        if (!lidClosed) {
          U.text(ctx, '↓ крышка открыта', JAR.x, lidY - 40, { size: 17, color: '#ffd9a0', weight: 800 });
        }
        ctx.restore();

        // слизень вне чаши
        if (phase === 'idle') drawSlugHere(ctx);

        // индикатор измельчения
        if (blend > 0.005 || phase === 'run' || phase === 'closed') {
          UI.progress(ctx, 1130, 250, 254, 26, blend, '#e2574c', 'ИЗМЕЛЬЧЕНИЕ ' + Math.round(blend * 100) + '%');
        }

        Object.values(btns).forEach((b) => b.draw(ctx, t));
        UI.hintBar(ctx, hints[phase] || '', 990, 852, 700, t, '#4fbfb0');
        Room.stepBadge(ctx, phase === 'idle' ? 1 : phase === 'in' ? 2 : 3, 3, 1240, 150);
      },

      onDown(p) {
        for (const b of Object.values(btns)) if (b.visible && b.hit(p)) { Sfx.click(); b.onClick(); return; }
        if (phase === 'idle') {
          if (drag.tryGrab(p)) return;
          // клик по чаше — тоже кладёт
          if (p.x > JAR.x - 130 && p.x < JAR.x + 130 && p.y > JAR.top && p.y < JAR.bot) putIn();
        }
      },
      onMove(p) { drag.move(p); },
      onUp() {
        if (drag.drop()) {
          if (tw.x > JAR.x - 150 && tw.x < JAR.x + 150 && tw.y < JAR.bot + 40) putIn();
          else tw.to(HOME.x, HOME.y, HOME.s, 0.5);
        }
      }
    };

    function drawSlugHere(ctx) {
      const spinning = phase === 'run';
      const wob = spinning ? Math.sin(t * 30) * 0.25 : 0;
      SlugArt.draw(ctx, App.slug, {
        x: tw.x, y: tw.y, scale: tw.s, t,
        rot: spinning ? spin * 0.55 : Math.sin(t * 1.4) * 0.02,
        squash: spinning ? 1 + Math.sin(t * 22) * 0.22 : 1 + Math.sin(t * 1.8) * 0.03,
        state: spinning ? 'scream' : (phase === 'in' || phase === 'closed' ? 'pain' : 'idle'),
        look: spinning ? { x: Math.sin(t * 9), y: Math.cos(t * 7) } : {
          x: U.clamp((App.pointer.x - tw.x) / 400, -1, 1),
          y: U.clamp((App.pointer.y - tw.y) / 400, -1, 1)
        },
        shadow: phase === 'idle'
      });
      if (spinning && wob) { /* визуальная тряска учтена через squash */ }
    }
  };
})(window);
