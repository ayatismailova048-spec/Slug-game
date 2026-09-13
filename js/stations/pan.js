/* ============================================================
   stations/pan.js — прибор №6
   Шаги: поставить сковороду → налить масло → включить конфорку →
         дождаться жара → класть слизня → переворачивать
   ============================================================ */
(function (global) {
  'use strict';

  const STOVE = { x: 780, y: 628 };
  const HOME = { x: 210, y: 700, s: 0.46 };
  const KNOB = { x: 1290, y: 348, r: 62 };

  StationImpl.pan = function () {
    let t = 0;
    let panOn = false;        // сковорода на плите
    let oil = 0;              // 0..1
    let burner = 0;           // положение ручки 0..1
    let knobDrag = false;
    let temp = 0;             // 0..1 (0 = 20°, 1 = 260°)
    let inPan = false;
    let side = 0;             // 0/1
    let sideTime = 0;
    let sizzleT = 0, screamT = 0;
    const parts = new FX.Particles(500);
    const tw = new Room.Tw(HOME.x, HOME.y, HOME.s);
    const drag = new global.DragSlug(tw, 150);
    let btns = {};

    function build() {
      btns = {
        place: new UI.Btn({
          x: 1080, y: 170, w: 380, h: 66, label: 'Поставить сковороду', icon: '🍳', font: 20,
          color: '#8a8f96', dark: '#55595f', pulse: true,
          onClick: () => {
            panOn = true; Sfx.pop(0.6); btns.place.visible = false; btns.oil.pulse = true;
            App.toast('Сковорода на плите', '#f0c04a');
          }
        }),
        oil: new UI.Btn({
          x: 1080, y: 170, w: 380, h: 66, label: 'Налить масло', icon: '🫒', font: 20,
          color: '#9ac23a', dark: '#5f8016', visible: false,
          onClick: () => {
            if (!panOn) { App.toast('Сначала поставь сковороду'); return; }
            oil = U.clamp(oil + 0.5, 0, 1);
            Sfx.splash(); btns.oil.pulse = false;
            App.toast(oil >= 1 ? 'Масла достаточно' : 'Плеснули масла', '#dbe86a');
            parts.emit(12, () => ({
              kind: 'goo', x: STOVE.x + U.rand(-60, 60), y: STOVE.y - 30,
              vx: U.rand(-60, 60), vy: U.rand(-30, 60), grav: 400,
              life: U.rand(0.4, 0.8), size: U.rand(3, 8), col: 'rgba(230,205,90,0.9)'
            }));
          }
        }),
        flip: new UI.Btn({
          x: 1080, y: 480, w: 380, h: 70, label: 'Перевернуть', icon: '🥄', font: 21,
          color: '#d79a34', dark: '#96631a', visible: false,
          onClick: flip
        }),
        out: new UI.Btn({
          x: 1080, y: 560, w: 380, h: 62, label: 'Снять со сковороды', font: 19,
          color: '#4d8ec9', dark: '#2c5f8f', visible: false,
          onClick: takeOut
        })
      };
      btns.oil.visible = false;
    }

    function flip() {
      side = 1 - side; sideTime = 0;
      Sfx.squish(0.8); Sfx.pop(0.9);
      App.shake(5);
      parts.emit(10, () => ({
        kind: 'goo', x: tw.x + U.rand(-50, 50), y: tw.y,
        vx: U.rand(-120, 120), vy: U.rand(-220, -80), grav: 600,
        life: U.rand(0.4, 0.8), size: U.rand(3, 7), col: 'rgba(240,215,120,0.9)'
      }));
      App.toast('Перевернули на другой бок', '#f0c04a');
    }

    function putIn() {
      if (!panOn) { App.toast('Сначала поставь сковороду на плиту'); return false; }
      inPan = true; drag.enabled = false; sideTime = 0;
      tw.to(STOVE.x, STOVE.y - 26, 0.42, 0.5);
      btns.flip.visible = true; btns.out.visible = true;
      if (oil < 0.2) App.toast('Без масла пригорит быстрее!', '#ff9a6b');
      return true;
    }
    function takeOut() {
      inPan = false; drag.enabled = true;
      btns.flip.visible = false; btns.out.visible = false;
      Sfx.loop('sizzle', false);
      tw.to(HOME.x, HOME.y, HOME.s, 0.7, U.easeOutBack);
      App.toast('Теперь это ' + SlugModel.title(App.slug).toLowerCase(), '#f0c04a');
    }

    function tempC() { return Math.round(20 + temp * 240); }

    function hint() {
      if (!panOn) return 'Поставь сковороду на плиту';
      if (oil < 0.4) return 'Налей масло — иначе слизень пригорит';
      if (burner < 0.1) return 'Поверни ручку конфорки (тяни вверх)';
      if (temp < 0.45) return 'Ждём, пока сковорода разогреется...';
      if (!inPan) return 'Клади слизня на сковороду!';
      if (sideTime > 4) return 'Горит! Переверни скорее!';
      return 'Жарится. Не забывай переворачивать';
    }

    return {
      enter() { build(); t = 0; tw.set(HOME.x, HOME.y, HOME.s); },
      exit() { Sfx.loop('sizzle', false); Sfx.loop('fire', false); },

      update(dt) {
        t += dt; tw.update(dt); parts.update(dt);
        if (!panOn && !btns.place.visible) btns.oil.visible = true;
        if (panOn) { btns.place.visible = false; btns.oil.visible = true; }

        // нагрев
        const target = burner * (panOn ? 1 : 0.15);
        temp = U.lerp(temp, target, dt * (target > temp ? 0.5 : 0.8));
        Sfx.loop('fire', burner > 0.05, burner * 0.8);

        // масло шипит
        if (panOn && oil > 0.05 && temp > 0.4) {
          Sfx.loop('sizzle', true, U.clamp((temp - 0.4) * 2, 0.2, 1));
          if (Math.random() < dt * 20 * temp) {
            parts.add({
              kind: 'goo', x: STOVE.x + U.rand(-110, 110), y: STOVE.y - 40,
              vx: U.rand(-70, 70), vy: U.rand(-190, -70), grav: 600,
              life: U.rand(0.3, 0.6), size: U.rand(2, 5), col: 'rgba(250,225,140,0.9)'
            });
          }
          if (Math.random() < dt * 8) {
            parts.add({
              kind: 'steam', x: STOVE.x + U.rand(-120, 120), y: STOVE.y - 60,
              vx: U.rand(-20, 20), vy: U.rand(-70, -30), life: U.rand(1, 2),
              size: U.rand(10, 22), alpha: 0.45
            });
          }
        } else if (!inPan) Sfx.loop('sizzle', false);

        if (inPan && temp > 0.35) {
          sideTime += dt;
          const heat = (temp - 0.3) * 1.4;
          const oilFactor = oil > 0.4 ? 1 : 1.7;   // без масла — пригорает
          SlugModel.apply(App.slug, 'fry', dt * 0.09 * heat);
          if (sideTime > 4.5) SlugModel.apply(App.slug, 'burn', dt * 0.05 * heat * oilFactor);
          screamT -= dt;
          if (screamT <= 0) { Sfx.scream(0.45 + temp * 0.4, 0.5); screamT = 0.8 + Math.random() * 0.6; }
          App.shake(dt * 2);
        }

        Object.values(btns).forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },

      draw(ctx) {
        Room.drawLab(ctx, t, { wall1: '#5a4a3c', wall2: '#352a22', floor1: '#a89684', floor2: '#6d5f52', horizon: 600 });

        // кухонный гарнитур
        ctx.save();
        ctx.fillStyle = '#8a6e52';
        U.roundRect(ctx, 120, 712, 1080, 200, 14); ctx.fill();
        ctx.fillStyle = '#a8866a';
        U.roundRect(ctx, 120, 712, 1080, 26, 10); ctx.fill();
        ctx.restore();

        // плита
        ctx.save();
        U.shadowOn(ctx, 24, 'rgba(0,0,0,0.4)', 0, 12);
        ctx.fillStyle = '#2c2f33';
        U.roundRect(ctx, STOVE.x - 270, 608, 540, 96, 16); ctx.fill();
        U.shadowOff(ctx);
        ctx.fillStyle = '#3c4045';
        U.roundRect(ctx, STOVE.x - 258, 616, 516, 30, 10); ctx.fill();
        // решётка конфорки
        ctx.strokeStyle = '#15171a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * U.TAU;
          ctx.beginPath();
          ctx.moveTo(STOVE.x + Math.cos(a) * 34, 640 + Math.sin(a) * 12);
          ctx.lineTo(STOVE.x + Math.cos(a) * 116, 640 + Math.sin(a) * 40);
          ctx.stroke();
        }
        ctx.strokeStyle = '#1c1f23'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(STOVE.x, 640, 118, 40, 0, 0, U.TAU); ctx.stroke();
        ctx.restore();

        // зарево конфорки под сковородой
        if (burner > 0.03) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(STOVE.x, 656, 10, STOVE.x, 656, 340);
          g.addColorStop(0, `rgba(255,150,60,${0.16 * burner})`);
          g.addColorStop(1, 'rgba(255,120,20,0)');
          ctx.fillStyle = g; ctx.fillRect(STOVE.x - 400, 380, 800, 420);
          ctx.restore();
        }

        // сковорода
        const panX = panOn ? STOVE.x : 430;
        const panY = panOn ? STOVE.y : 660;
        ctx.save();
        U.shadowOn(ctx, 20, 'rgba(0,0,0,0.45)', 0, 10);
        ctx.fillStyle = '#17191d';
        ctx.beginPath(); ctx.ellipse(panX, panY, 200, 78, 0, 0, U.TAU); ctx.fill();
        U.shadowOff(ctx);
        // ручка
        ctx.strokeStyle = '#17191d'; ctx.lineWidth = 26; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(panX + 180, panY - 16); ctx.lineTo(panX + 330, panY - 60); ctx.stroke();
        ctx.strokeStyle = '#2b3036'; ctx.lineWidth = 14;
        ctx.beginPath(); ctx.moveTo(panX + 180, panY - 16); ctx.lineTo(panX + 330, panY - 60); ctx.stroke();
        // внутренняя чаша
        const ig = ctx.createRadialGradient(panX - 50, panY - 24, 10, panX, panY - 6, 190);
        ig.addColorStop(0, '#4a5057'); ig.addColorStop(1, '#202329');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.ellipse(panX, panY - 10, 180, 64, 0, 0, U.TAU); ctx.fill();
        // раскалённость
        if (temp > 0.3) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = (temp - 0.3) * 0.5;
          const hg = ctx.createRadialGradient(panX, panY - 4, 6, panX, panY - 4, 180);
          hg.addColorStop(0, 'rgba(255,120,40,0.7)');
          hg.addColorStop(1, 'rgba(255,60,10,0)');
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.ellipse(panX, panY - 6, 180, 64, 0, 0, U.TAU); ctx.fill();
          ctx.restore();
        }
        // масло
        if (oil > 0.02) {
          ctx.save();
          ctx.globalAlpha = 0.5 + oil * 0.35;
          const og = ctx.createRadialGradient(panX - 30, panY - 6, 5, panX, panY - 4, 150 * oil + 40);
          og.addColorStop(0, 'rgba(255,235,150,0.95)');
          og.addColorStop(1, 'rgba(210,170,50,0.35)');
          ctx.fillStyle = og;
          ctx.beginPath();
          ctx.ellipse(panX, panY - 4, (110 + 60 * oil) + Math.sin(t * 3) * 4, (34 + 18 * oil), 0, 0, U.TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        // языки пламени вокруг сковороды
        if (burner > 0.03 && panOn) {
          FX.drawFire(ctx, STOVE.x - 150, 688, 46, 90 * burner, t, burner * 0.9, 23);
          FX.drawFire(ctx, STOVE.x + 150, 688, 46, 90 * burner, t + 1.7, burner * 0.9, 41);
          FX.drawFire(ctx, STOVE.x, 700, 120, 70 * burner, t + 0.9, burner * 0.7, 63);
        } else if (burner > 0.03) {
          FX.drawFire(ctx, STOVE.x, 654, 110, 110 * burner, t, burner, 23);
        }

        // слизень
        const frying = inPan && temp > 0.35;
        SlugArt.draw(ctx, App.slug, {
          x: tw.x, y: tw.y + (frying ? Math.sin(t * 18) * 2 : 0), scale: tw.s, t,
          squash: inPan ? 1.18 + Math.sin(t * 16) * 0.05 : 1 + Math.sin(t * 1.7) * 0.03,
          state: frying ? 'scream' : 'idle',
          rot: inPan ? (side ? Math.PI : 0) : 0,
          look: { x: U.clamp((App.pointer.x - tw.x) / 400, -1, 1), y: U.clamp((App.pointer.y - tw.y) / 400, -1, 1) },
          shadow: !inPan
        });
        parts.draw(ctx);

        // панель управления
        UI.panel(ctx, 1050, 250, 440, 180, 20, 'rgba(30,22,16,0.75)');
        U.text(ctx, 'КОНФОРКА', KNOB.x, 272, { size: 18, color: '#ffe3b8', weight: 800 });
        UI.knob(ctx, KNOB.x, KNOB.y, KNOB.r, burner, t, '#e6d6c2', burner > 0.7);
        // термометр
        U.text(ctx, tempC() + '°C', 1145, KNOB.y - 12, { size: 30, color: temp > 0.8 ? '#ff8a5c' : '#ffe3b8', weight: 900 });
        UI.progress(ctx, 1085, KNOB.y + 14, 130, 18, temp, temp > 0.8 ? '#e2574c' : '#f0a92e', '');
        U.text(ctx, temp < 0.45 ? 'холодная' : temp < 0.8 ? 'горячая' : 'РАСКАЛЕНА', 1150, KNOB.y + 46,
          { size: 15, color: '#ffd9a8', weight: 800 });

        // прожарка
        UI.progress(ctx, 1080, 440, 380, 24, App.slug.fx.fried, '#d79a34',
          'ПРОЖАРКА ' + Math.round(App.slug.fx.fried * 100) + '%');
        if (inPan) {
          const warn = U.clamp(sideTime / 6, 0, 1);
          UI.progress(ctx, 1080, 640, 380, 16, warn, warn > 0.7 ? '#e2574c' : '#8a8f96', '');
          U.text(ctx, warn > 0.7 ? 'ПЕРЕВЕРНИ!' : 'бок №' + (side + 1), 1270, 648,
            { size: 14, color: '#fff', weight: 800 });
        }

        Object.values(btns).forEach((b) => b.draw(ctx, t));
        UI.hintBar(ctx, hint(), 990, 852, 700, t, '#d79a34');
        Room.stepBadge(ctx, !panOn ? 1 : oil < 0.4 ? 2 : burner < 0.1 ? 3 : 4, 4, 1080, 116);
      },

      onDown(p) {
        for (const b of Object.values(btns)) if (b.visible && b.hit(p)) { Sfx.click(); b.onClick(); return; }
        if (U.dist(p.x, p.y, KNOB.x, KNOB.y) < KNOB.r + 20) { knobDrag = true; Sfx.switchSnap(); return; }
        if (!inPan) {
          if (drag.tryGrab(p)) return;
          if (panOn && U.dist(p.x, p.y, STOVE.x, STOVE.y - 20) < 190) putIn();
        }
      },
      onMove(p) {
        if (knobDrag) burner = U.clamp(((KNOB.y + KNOB.r) - p.y) / (KNOB.r * 2.4), 0, 1);
        drag.move(p);
      },
      onUp() {
        knobDrag = false;
        if (drag.drop()) {
          if (U.dist(tw.x, tw.y, STOVE.x, STOVE.y - 20) < 240) { if (!putIn()) tw.to(HOME.x, HOME.y, HOME.s, 0.5); }
          else tw.to(HOME.x, HOME.y, HOME.s, 0.5);
        }
      }
    };
  };
})(window);
