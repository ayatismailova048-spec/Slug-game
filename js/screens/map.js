/* ============================================================
   screens/map.js — карта: поляна шире экрана, время суток,
   погода и времена года
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- время суток ---------- */
  const TIMES = {
    morning: {
      sky: ['#f7c98f', '#ffe6c2', '#d8ecdc'],
      tint: 'rgba(255,190,130,0.14)',
      sun: { x: 320, y: 250, r: 54, glow: 'rgba(255,232,180,0.55)', core: 'rgba(255,246,220,0.9)' },
      stars: 0, fireGlow: 0.8, light: 0.3
    },
    day: {
      sky: ['#7ec6e8', '#bfe4ef', '#cfe9dd'],
      tint: null,
      sun: { x: 1320, y: 150, r: 52, glow: 'rgba(255,248,205,0.55)', core: 'rgba(255,250,215,0.85)' },
      stars: 0, fireGlow: 0.6, light: 0
    },
    evening: {
      sky: ['#4b3f74', '#e08a5c', '#f0c58e'],
      tint: 'rgba(226,120,60,0.2)',
      sun: { x: 1180, y: 470, r: 66, glow: 'rgba(255,160,80,0.55)', core: 'rgba(255,206,140,0.95)' },
      stars: 0.3, fireGlow: 1.1, light: 0.6
    },
    night: {
      sky: ['#0d1630', '#1b2a4c', '#2b3a55'],
      tint: 'rgba(18,28,66,0.52)',
      moon: { x: 1240, y: 180, r: 58 },
      stars: 1, fireGlow: 1.6, light: 1.15
    }
  };

  /* ---------- времена года ---------- */
  const SEASONS = {
    summer: {
      grass: '#4e8340', hill1: '#7aa858', hill2: '#5f9247',
      leaf1: '#77b85c', leaf2: '#4f8b3a', bush1: '#6fb054', bush2: '#4c8339',
      blade: 'rgba(30,80,30,0.35)', flowers: 40, fall: null, snow: 0, bare: false
    },
    autumn: {
      grass: '#7d8b3c', hill1: '#a2a355', hill2: '#86903f',
      leaf1: '#e79a35', leaf2: '#c4642a', bush1: '#d08a33', bush2: '#a35c22',
      blade: 'rgba(90,80,20,0.35)', flowers: 14, fall: 'leaf', snow: 0, bare: false
    },
    winter: {
      grass: '#e7f0f6', hill1: '#e2ecf4', hill2: '#cfdfeb',
      leaf1: '#9fb6c4', leaf2: '#87a0b0', bush1: '#dceaf2', bush2: '#c2d6e2',
      blade: 'rgba(150,175,190,0.5)', flowers: 0, fall: 'snow', snow: 1, bare: true
    },
    spring: {
      grass: '#5aa24a', hill1: '#8cc067', hill2: '#6cab52',
      leaf1: '#83c765', leaf2: '#589a3c', bush1: '#7cc25e', bush2: '#54903d',
      blade: 'rgba(40,100,35,0.35)', flowers: 90, fall: 'petal', snow: 0, bare: false, blossom: true
    }
  };

  App.register('map', function () {
    let t = 0;
    const back = Room.makeBackBtn();
    let btns = [];
    let dragIdx = -1, dx = 0, dy = 0;
    let pickerOpen = false;
    let items = [];
    let saveTimer = 0;

    const WORLD_W = 2600;
    let cam = 0, panning = false, panX = 0, panCam = 0;
    const maxCam = () => Math.max(0, WORLD_W - App.VW);
    const clampCam = () => { cam = U.clamp(cam, 0, maxCam()); };
    const worldX = (sx) => sx + cam;

    const parts = new FX.Particles(400);
    const sky = [];                      // осадки и листва — в экранных координатах
    const SKY_MAX = 520;
    let fireLevel = 1, steamT = 0;

    const TRASH = { x: 1512, y: 918, r: 58 };
    const POOL = { x: 270, y: 858, rx: 210, ry: 68 };
    const TREE = { x: 1300, base: 952 };
    const FIRE = { x: 2300, y: 884 };
    const STUMPS = [{ x: 2116, y: 906 }, { x: 2480, y: 906 }];

    const SPOTS = [
      { x: TREE.x - 136, y: 560 }, { x: TREE.x + 168, y: 606 }, { x: TREE.x - 104, y: 688 },
      { x: STUMPS[0].x, y: 716 }, { x: STUMPS[1].x, y: 716 }
    ];

    let env = { time: 'day', weather: 'clear', season: 'summer' };
    const TM = () => TIMES[env.time] || TIMES.day;
    const SN = () => SEASONS[env.season] || SEASONS.summer;

    /* ---------- переключатели ---------- */
    const PICKS = [
      { key: 'time', x: 40, opts: [['morning', '🌄'], ['day', '🌞'], ['evening', '🌆'], ['night', '🌙']] },
      { key: 'weather', x: 324, opts: [['clear', '☀'], ['rain', '🌧'], ['hail', '🧊']] },
      { key: 'season', x: 540, opts: [['summer', '🌿'], ['autumn', '🍂'], ['winter', '❄'], ['spring', '🌸']] }
    ];
    const PICK_Y = 916, PICK_R = 30, PICK_STEP = 68;
    function pickButtons() {
      const out = [];
      for (const g of PICKS) {
        g.opts.forEach((o, i) => out.push({ group: g.key, val: o[0], icon: o[1], x: g.x + i * PICK_STEP + PICK_R, y: PICK_Y + PICK_R }));
      }
      return out;
    }

    function freeSpot(x, y, selfIdx) {
      let best = null, bd = 130;
      for (const sp of SPOTS) {
        const d = U.dist(x, y, sp.x, sp.y);
        if (d > bd) continue;
        let taken = false;
        for (let i = 0; i < items.length; i++) {
          if (i === selfIdx) continue;
          if (U.dist(items[i].x, items[i].y, sp.x, sp.y) < 34) { taken = true; break; }
        }
        if (taken) continue;
        bd = d; best = sp;
      }
      return best;
    }

    function inPool(x, y) {
      const ax = (x - POOL.x) / POOL.rx, ay = (y - POOL.y) / (POOL.ry * 1.3);
      return ax * ax + ay * ay < 1;
    }

    function refresh() { items = Save.mapItems(); }

    function spawn(slug) {
      const n = Save.mapItems().length;
      const col = n % 5, row = Math.floor(n / 5) % 3;
      const x = cam + 300 + col * 250 + U.rand(-40, 40);
      const y = 660 + row * 110 + U.rand(-25, 25);
      Save.mapAdd(slug, U.clamp(x, 120, WORLD_W - 120), U.clamp(y, 640, App.VH - 80));
      refresh(); Sfx.pop(1.1); App.toast('Слизень на карте', '#8ce06a');
    }

    function build() {
      btns = [
        new UI.Btn({
          x: 240, y: 24, w: 300, h: 56, label: 'Выпустить текущего', icon: '🐌', font: 18,
          color: '#3fbf8f', dark: '#217e5e',
          onClick: () => {
            App.askName(App.slug.nick && App.slug.nick !== 'Слизень' ? App.slug.nick : SlugModel.title(App.slug), (name) => {
              if (name === null) return;
              const copy = SlugModel.clone(App.slug);
              copy.nick = name;
              spawn(copy);
            });
          }
        }),
        new UI.Btn({
          x: 556, y: 24, w: 290, h: 56, label: 'Из сохранений', icon: '💾', font: 18,
          color: '#4d8ec9', dark: '#2c5f8f',
          onClick: () => { pickerOpen = !pickerOpen; Sfx.click(); }
        }),
        new UI.Btn({
          x: 862, y: 24, w: 220, h: 56, label: 'Убрать всех', font: 18,
          color: '#c2564c', dark: '#8a332c',
          onClick: () => { Save.mapClear(); refresh(); Sfx.pop(0.5); App.toast('Карта пуста'); }
        })
      ];
    }

    function pickerCards() {
      const slots = Save.slots();
      const out = [];
      slots.forEach((s) => {
        if (!s) return;
        out.push({ s, x: 120 + out.length * 200, y: App.VH - 330, w: 180, h: 170 });
      });
      return out;
    }

    /* ---------- осадки и листопад ---------- */
    function spawnSky(dt) {
      const w = env.weather, sn = SN();
      const add = (o) => { if (sky.length < SKY_MAX) sky.push(o); };
      if (w === 'rain') {
        const n = Math.floor(dt * 260) + (Math.random() < (dt * 260) % 1 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          add({ kind: 'rain', x: U.rand(-80, App.VW + 80), y: U.rand(-60, 0), vx: 70, vy: U.rand(1200, 1600), len: U.rand(24, 46) });
        }
      }
      if (w === 'hail' && Math.random() < dt * 32) {
        add({ kind: 'hail', x: U.rand(0, App.VW), y: -20, vx: U.rand(-20, 40), vy: U.rand(620, 820), r: U.rand(5, 11), bounce: 1 });
      }
      if (sn.fall === 'snow' && Math.random() < dt * 34) {
        add({ kind: 'snow', x: U.rand(0, App.VW), y: -20, vx: U.rand(-18, 18), vy: U.rand(50, 110), r: U.rand(3, 7), ph: U.rand(0, 9) });
      }
      if (sn.fall === 'leaf' && Math.random() < dt * 9) {
        add({ kind: 'leaf', x: U.rand(0, App.VW), y: -30, vx: U.rand(-30, 20), vy: U.rand(60, 120), r: U.rand(9, 16), rot: U.rand(0, 6), spin: U.rand(-2, 2), ph: U.rand(0, 9) });
      }
      if (sn.fall === 'petal' && Math.random() < dt * 12) {
        add({ kind: 'petal', x: U.rand(0, App.VW), y: -20, vx: U.rand(-26, 16), vy: U.rand(50, 100), r: U.rand(5, 9), rot: U.rand(0, 6), spin: U.rand(-2, 2), ph: U.rand(0, 9) });
      }
    }

    function updateSky(dt) {
      for (let i = sky.length - 1; i >= 0; i--) {
        const p = sky[i];
        p.y += p.vy * dt;
        p.x += (p.vx + (p.ph !== undefined ? Math.sin(t * 1.6 + p.ph) * 40 : 0)) * dt;
        if (p.rot !== undefined) p.rot += p.spin * dt;
        if (p.kind === 'hail' && p.y > 900 && p.bounce > 0) {
          p.bounce = 0; p.vy = -p.vy * 0.35; p.vx *= 0.5; p.life = 0.5;
        }
        if (p.life !== undefined) { p.life -= dt; if (p.life <= 0) { sky.splice(i, 1); continue; } }
        if (p.y > App.VH + 60 || p.x < -120 || p.x > App.VW + 120) sky.splice(i, 1);
      }
    }

    function drawSkyParts(ctx) {
      for (const p of sky) {
        ctx.save();
        if (p.kind === 'rain') {
          ctx.strokeStyle = 'rgba(214,240,255,0.85)';
          ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.02, p.y + p.len);
          ctx.stroke();
        } else if (p.kind === 'hail') {
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(170,205,225,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
        } else if (p.kind === 'snow') {
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, U.TAU); ctx.fill();
        } else if (p.kind === 'leaf') {
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = ['#e08b2a', '#c9612a', '#d9a431'][Math.floor(p.r) % 3];
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(120,60,10,0.6)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0); ctx.stroke();
        } else if (p.kind === 'petal') {
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = ['#f9c2d8', '#fcdcea', '#f4a8c6'][Math.floor(p.r) % 3];
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      }
    }

    return {
      enter() {
        build(); refresh(); t = 0;
        env = Object.assign({ time: 'day', weather: 'clear', season: 'summer' }, Save.getEnv());
        fireLevel = env.weather === 'rain' ? 0 : 1;
        sky.length = 0;
      },
      exit() { Sfx.loop('fire', false); Sfx.loop('water', false); },

      update(dt) {
        t += dt;
        parts.update(dt);
        spawnSky(dt);
        updateSky(dt);

        // дождь тушит костёр
        const target = env.weather === 'rain' ? 0 : 1;
        fireLevel = U.lerp(fireLevel, target, dt * (target === 0 ? 1.1 : 0.5));
        if (fireLevel < 0.01) fireLevel = 0;
        Sfx.loop('fire', fireLevel > 0.08, 0.45 * fireLevel);
        Sfx.loop('water', env.weather === 'rain', 0.5);

        // пар от тухнущего костра
        if (env.weather === 'rain' && fireLevel > 0.001 && fireLevel < 0.7) {
          steamT -= dt;
          if (steamT <= 0) {
            steamT = 0.06;
            parts.add({
              kind: 'smoke', x: FIRE.x + U.rand(-40, 40), y: FIRE.y - 30,
              vx: U.rand(-20, 20), vy: U.rand(-90, -50), grav: -6, wind: 8,
              life: U.rand(1.4, 2.6), size: U.rand(16, 30), alpha: 0.5
            });
          }
        }

        let changed = false;
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const f = it.slug.fx;
          if (!f) continue;
          const sc = it.scale || 0.5;
          const submerged = inPool(it.x, it.y) && dragIdx !== i;

          // под дождём слизни мокнут
          if (env.weather === 'rain' && !submerged) {
            SlugModel.apply(it.slug, 'shower', dt * 0.3);
            changed = true;
          }

          if (submerged || (f.wet || 0) <= 0 || env.weather === 'rain') continue;

          const nearFire = fireLevel > 0.3 && U.dist(it.x, it.y, FIRE.x, FIRE.y) < 320;
          const rate = nearFire ? 0.55 : 0.1;
          if (Math.random() < dt * 3.2 * f.wet) {
            parts.add({
              kind: 'drop', x: it.x + U.rand(-110, 110) * sc, y: it.y + 46 * sc,
              vx: U.rand(-12, 12), vy: U.rand(40, 130), grav: 900,
              life: U.rand(0.45, 0.8), size: U.rand(3, 6), col: 'rgba(180,232,250,0.9)'
            });
          }
          if (nearFire && Math.random() < dt * 14 * f.wet) {
            parts.add({
              kind: 'steam', x: it.x + U.rand(-70, 70) * sc, y: it.y - 20 * sc,
              vx: U.rand(-16, 16), vy: U.rand(-70, -34), life: U.rand(0.9, 1.8),
              size: U.rand(10, 22), alpha: 0.5
            });
          }
          f.wet = Math.max(0, f.wet - dt * rate);
          f.clean = Math.max(0, (f.clean || 0) - dt * rate * 0.6);
          f.steam = Math.max(0, (f.steam || 0) - dt * 0.2);
          changed = true;
        }
        if (changed) {
          saveTimer -= dt;
          if (saveTimer <= 0) { Save.mapSave(); saveTimer = 2.5; }
        }

        // тащишь слизня к краю — поляна едет следом
        if (dragIdx >= 0) {
          const edge = 110;
          if (App.pointer.x > App.VW - edge && cam < maxCam()) { cam += 420 * dt; clampCam(); items[dragIdx].x += 420 * dt; }
          if (App.pointer.x < edge && cam > 0) { cam -= 420 * dt; clampCam(); items[dragIdx].x -= 420 * dt; }
        }

        // искры и дымок от костра
        if (fireLevel > 0.3) {
          if (Math.random() < dt * 16) {
            parts.add({
              kind: 'ember', x: FIRE.x + U.rand(-34, 34), y: FIRE.y - 16,
              vx: U.rand(-26, 26), vy: U.rand(-150, -80), grav: 30, drag: 0.985,
              life: U.rand(0.8, 1.8), size: U.rand(1.4, 3), alpha: 1
            });
          }
          if (Math.random() < dt * 7) {
            parts.add({
              kind: 'smoke', x: FIRE.x + U.rand(-24, 24), y: FIRE.y - 110,
              vx: U.rand(-16, 16), vy: U.rand(-60, -34), grav: -5, wind: 10,
              life: U.rand(1.6, 3), size: U.rand(14, 28), alpha: 0.3
            });
          }
        }

        back.update(dt, App.pointer, App.pointer.down);
        btns.forEach((b) => b.update(dt, App.pointer, App.pointer.down));
      },

      draw(ctx) {
        drawSky(ctx);
        ctx.save();
        ctx.translate(-cam, 0);
        drawWorld(ctx);

        // слизни (сортируем по y для глубины)
        const order = items.map((it, i) => i).sort((a, b) => items[a].y - items[b].y);
        for (const i of order) {
          const it = items[i];
          const wet = inPool(it.x, it.y) && dragIdx !== i;
          const bob = Math.sin(t * 1.6 + i) * (wet ? 2.5 : 4);
          const sink = wet ? 26 : 0;
          SlugArt.draw(ctx, it.slug, {
            x: it.x, y: it.y + bob + sink, scale: it.scale || 0.5, t: t + i * 0.7,
            squash: 1 + Math.sin(t * 1.9 + i) * 0.035,
            look: {
              x: U.clamp((worldX(App.pointer.x) - it.x) / 420, -1, 1),
              y: U.clamp((App.pointer.y - it.y) / 420, -1, 1)
            },
            alpha: dragIdx === i ? 0.85 : 1
          });

          if (wet) {
            const sc = it.scale || 0.5;
            const line = it.y + bob + sink + 14;
            ctx.save();
            ctx.beginPath();
            ctx.rect(it.x - 190 * sc, line, 380 * sc, 260);
            ctx.clip();
            const wg = ctx.createLinearGradient(0, POOL.y - POOL.ry, 0, POOL.y + POOL.ry);
            wg.addColorStop(0, 'rgba(120,200,225,0.8)');
            wg.addColorStop(1, 'rgba(56,130,165,0.88)');
            ctx.fillStyle = wg;
            ctx.beginPath(); ctx.ellipse(POOL.x, POOL.y, POOL.rx, POOL.ry, 0, 0, U.TAU); ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 3;
            for (let k = 0; k < 3; k++) {
              const ph = (t * 0.5 + k * 0.33 + i * 0.2) % 1;
              ctx.globalAlpha = (1 - ph) * 0.55;
              ctx.beginPath();
              ctx.ellipse(it.x, line + 2, (60 + ph * 90) * sc, (16 + ph * 24) * sc, 0, 0, U.TAU);
              ctx.stroke();
            }
            ctx.restore();
          }

          const nick = it.slug.nick;
          if (nick && nick !== 'Слизень') {
            ctx.save();
            ctx.font = `800 18px ${U.FONT}`;
            const nw = ctx.measureText(nick).width + 26;
            const ny = it.y + bob - 110 * (it.scale || 0.5) - 26;
            ctx.fillStyle = 'rgba(16,28,22,0.7)';
            U.roundRect(ctx, it.x - nw / 2, ny - 16, nw, 32, 16); ctx.fill();
            U.text(ctx, nick, it.x, ny, { size: 18, color: '#eafff0', weight: 800 });
            ctx.restore();
          }

          if (dragIdx === i) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.beginPath(); ctx.ellipse(it.x, it.y + 60, 110 * (it.scale || 0.5) * 1.6, 30, 0, 0, U.TAU); ctx.stroke();
            ctx.restore();
          }
        }
        parts.draw(ctx);

        // подсказка: куда можно посадить
        if (dragIdx >= 0) {
          const it = items[dragIdx];
          const sp = freeSpot(it.x, it.y, dragIdx);
          if (sp) {
            ctx.save();
            const pulse = 0.45 + 0.35 * Math.sin(t * 6);
            ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
            ctx.lineWidth = 5;
            ctx.setLineDash([10, 8]);
            ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 44, 78, 22, 0, 0, U.TAU); ctx.stroke();
            ctx.restore();
          }
        }
        ctx.restore();

        // общий свет времени суток
        const T = TM();
        if (T.tint) { ctx.fillStyle = T.tint; ctx.fillRect(0, 0, App.VW, App.VH); }

        // ...а костёр эту темноту разгоняет вокруг себя
        if (T.light > 0 && fireLevel > 0.05) {
          const fx = FIRE.x - cam, fy = FIRE.y - 40;
          if (fx > -700 && fx < App.VW + 700) {
            const flick = 0.86 + 0.14 * Math.sin(t * 9.3) * Math.sin(t * 3.7);
            const R = (360 + 240 * fireLevel) * (0.8 + T.light * 0.35);
            const a = 0.42 * fireLevel * T.light * flick;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const lg = ctx.createRadialGradient(fx, fy, 16, fx, fy, R);
            lg.addColorStop(0, `rgba(255,196,110,${a})`);
            lg.addColorStop(0.35, `rgba(255,152,60,${a * 0.55})`);
            lg.addColorStop(0.7, `rgba(240,110,34,${a * 0.2})`);
            lg.addColorStop(1, 'rgba(220,90,20,0)');
            ctx.fillStyle = lg;
            ctx.fillRect(0, 0, App.VW, App.VH);
            // тёплое пятно на земле
            const gg = ctx.createRadialGradient(fx, FIRE.y + 10, 10, fx, FIRE.y + 10, R * 0.8);
            gg.addColorStop(0, `rgba(255,170,70,${a * 0.42})`);
            gg.addColorStop(1, 'rgba(255,140,40,0)');
            ctx.fillStyle = gg;
            ctx.beginPath(); ctx.ellipse(fx, FIRE.y + 10, R * 0.8, R * 0.3, 0, 0, U.TAU); ctx.fill();
            ctx.restore();
          }
        }

        // осадки и листопад — поверх всего мира
        drawSkyParts(ctx);

        // стрелки — поляна продолжается
        const arrow = (ax, dir) => {
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(ax + dir * 16, 430); ctx.lineTo(ax - dir * 16, 470); ctx.lineTo(ax + dir * 16, 510);
          ctx.stroke();
          ctx.restore();
        };
        if (cam > 4) arrow(42, 1);
        if (cam < maxCam() - 4) arrow(App.VW - 42, -1);

        // корзина — только пока тащишь
        if (dragIdx >= 0) {
          const overTrash = U.dist(App.pointer.x, App.pointer.y, TRASH.x, TRASH.y) < TRASH.r + 40;
          ctx.save();
          ctx.fillStyle = overTrash ? '#e2574c' : 'rgba(30,40,34,0.6)';
          ctx.beginPath(); ctx.arc(TRASH.x, TRASH.y, TRASH.r + (overTrash ? 8 : 0), 0, U.TAU); ctx.fill();
          U.text(ctx, '🗑', TRASH.x, TRASH.y, { size: 48 });
          ctx.restore();
        }

        // панель сверху
        UI.panel(ctx, 200, 16, 900, 72, 18, 'rgba(12,22,18,0.55)');
        btns.forEach((b) => b.draw(ctx, t));
        back.draw(ctx, t);

        U.text(ctx, 'Слизней на карте: ' + items.length, App.VW / 2, 120,
          { size: 22, color: '#20402f', weight: 800, stroke: 'rgba(255,255,255,0.6)', strokeW: 4 });
        U.text(ctx, 'Перетаскивай слизней. Тяни поляну в сторону — она большая.', App.VW / 2, 152,
          { size: 17, color: '#2c4c3a', weight: 700, stroke: 'rgba(255,255,255,0.5)', strokeW: 3 });

        // переключатели времени, погоды и сезона
        ctx.save();
        UI.panel(ctx, 24, PICK_Y - 12, 800, 84, 22, 'rgba(12,22,18,0.55)');
        for (const b of pickButtons()) {
          const on = env[b.group] === b.val;
          const hov = U.dist(App.pointer.x, App.pointer.y, b.x, b.y) < PICK_R + 4;
          ctx.save();
          ctx.fillStyle = on ? '#3fbf8f' : hov ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.12)';
          ctx.beginPath(); ctx.arc(b.x, b.y, PICK_R, 0, U.TAU); ctx.fill();
          if (on) {
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(b.x, b.y, PICK_R + 4, 0, U.TAU); ctx.stroke();
          }
          U.text(ctx, b.icon, b.x, b.y + 1, { size: 28 });
          ctx.restore();
        }
        ctx.restore();

        // выбор из сохранений
        if (pickerOpen) {
          const cards = pickerCards();
          UI.panel(ctx, 80, App.VH - 360, App.VW - 160, 210, 20, 'rgba(12,22,18,0.88)');
          U.text(ctx, 'Выбери сохранение, чтобы выпустить на карту', App.VW / 2, App.VH - 338,
            { size: 18, color: '#cfe9dd', weight: 800 });
          if (!cards.length) {
            U.text(ctx, 'Пока нет ни одного сохранения', App.VW / 2, App.VH - 250,
              { size: 24, color: '#8ba99a', weight: 800 });
          }
          for (const c of cards) {
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            U.roundRect(ctx, c.x, c.y, c.w, c.h, 16); ctx.fill();
            SlugArt.draw(ctx, c.s.slug, { x: c.x + c.w / 2, y: c.y + 86, scale: 0.26, t, shadow: false });
            U.text(ctx, c.s.name || c.s.title || '', c.x + c.w / 2, c.y + 146,
              { size: 14, color: '#dff5ea', weight: 800, maxWidth: c.w - 16 });
            ctx.restore();
          }
        }
      },

      onDown(p) {
        if (back.hit(p)) { Sfx.click(); App.go('hub'); return; }
        if (App.hitMute(p)) return;
        for (const b of btns) if (b.hit(p)) { Sfx.click(); b.onClick(); return; }

        // переключатели
        for (const b of pickButtons()) {
          if (U.dist(p.x, p.y, b.x, b.y) < PICK_R + 6) {
            env[b.group] = b.val;
            Save.setEnv({ [b.group]: b.val });
            Sfx.click(1.2);
            if (b.group === 'weather' || b.group === 'season') sky.length = 0;
            if (b.group === 'weather' && b.val === 'rain') Sfx.splash();
            return;
          }
        }

        if (pickerOpen) {
          for (const c of pickerCards()) {
            if (p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) {
              spawn(c.s.slug); pickerOpen = false;
              return;
            }
          }
        }

        const wx = worldX(p.x);
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          const r = 150 * (it.scale || 0.5);
          if (U.dist(wx, p.y, it.x, it.y) < r) {
            dragIdx = i; dx = it.x - wx; dy = it.y - p.y;
            Sfx.squish(1 + Math.random() * 0.3);
            return;
          }
        }

        if (maxCam() > 0) { panning = true; panX = p.x; panCam = cam; }
      },

      onMove(p) {
        if (dragIdx >= 0) {
          const it = items[dragIdx];
          it.x = U.clamp(worldX(p.x) + dx, 60, WORLD_W - 60);
          it.y = U.clamp(p.y + dy, 380, App.VH - 56);
        } else if (panning) {
          cam = panCam - (p.x - panX);
          clampCam();
        }
      },

      onUp(p) {
        panning = false;
        if (dragIdx >= 0) {
          if (U.dist(p.x, p.y, TRASH.x, TRASH.y) < TRASH.r + 40) {
            parts.emit(20, () => ({
              kind: 'goo', x: TRASH.x + U.rand(-30, 30) + cam, y: TRASH.y,
              vx: U.rand(-160, 160), vy: U.rand(-260, -60), grav: 700,
              life: U.rand(0.4, 0.9), size: U.rand(4, 10),
              col: U.colStr(items[dragIdx].slug.color, 0.9)
            }));
            Save.mapRemove(dragIdx); refresh();
            Sfx.squish(0.6); App.toast('Слизень убран с карты');
          } else {
            const it = items[dragIdx];
            const sp = it && freeSpot(it.x, it.y, dragIdx);
            if (sp) {
              it.x = sp.x; it.y = sp.y;
              Sfx.squish(0.9);
            } else if (it && it.y < 660) {
              it.y = 700;
            }
            if (it && inPool(it.x, it.y)) {
              const wasDry = (it.slug.fx.wet || 0) < 0.9;
              SlugModel.apply(it.slug, 'shower', 1);
              if (wasDry) {
                Sfx.splash();
                parts.emit(22, () => ({
                  kind: 'drop', x: it.x + U.rand(-70, 70), y: it.y + 30,
                  vx: U.rand(-180, 180), vy: U.rand(-320, -110), grav: 900,
                  life: U.rand(0.4, 0.8), size: U.rand(3, 8), col: 'rgba(190,235,250,0.9)'
                }));
                App.toast((it.slug.nick && it.slug.nick !== 'Слизень' ? it.slug.nick : 'Слизень') + ' плюхнулся в лужу', '#9fdcff');
              }
            }
            Save.mapSave();
          }
          dragIdx = -1;
        }
      }
    };

    /* ---------- небо ---------- */
    function drawSky(ctx) {
      const T = TM();
      const g = ctx.createLinearGradient(0, 0, 0, 620);
      g.addColorStop(0, T.sky[0]); g.addColorStop(0.55, T.sky[1]); g.addColorStop(1, T.sky[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, App.VW, App.VH);
      if (env.weather !== 'clear') {
        ctx.fillStyle = 'rgba(96,108,120,0.42)';
        ctx.fillRect(0, 0, App.VW, App.VH);
      }

      // звёзды
      if (T.stars > 0) {
        const rnd = U.mulberry32(9);
        ctx.save();
        for (let i = 0; i < 110; i++) {
          const x = rnd() * App.VW, y = rnd() * 520;
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + rnd() * 1.4) + i));
          ctx.fillStyle = `rgba(255,255,240,${tw * T.stars})`;
          ctx.beginPath(); ctx.arc(x, y, rnd() * 1.7 + 0.6, 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      }

      // солнце или луна
      ctx.save();
      if (T.moon) {
        const m = T.moon;
        const mg = ctx.createRadialGradient(m.x, m.y, 8, m.x, m.y, m.r * 3.4);
        mg.addColorStop(0, 'rgba(226,236,255,0.34)'); mg.addColorStop(1, 'rgba(200,215,255,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3.4, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#e9eefb';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(192,202,226,0.55)';
        [[-18, -10, 12], [14, 8, 9], [4, -24, 7]].forEach(([ox, oy, r]) => {
          ctx.beginPath(); ctx.arc(m.x + ox, m.y + oy, r, 0, U.TAU); ctx.fill();
        });
      } else if (T.sun && env.weather === 'clear') {
        const s = T.sun;
        ctx.globalCompositeOperation = 'lighter';
        const sg = ctx.createRadialGradient(s.x, s.y, 10, s.x, s.y, s.r * 4.4);
        sg.addColorStop(0, s.glow); sg.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 4.4, 0, U.TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = s.core;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, U.TAU); ctx.fill();
      }
      ctx.restore();

      // тучи: в дождь и град серые
      const rainy = env.weather !== 'clear';
      for (let i = 0; i < 4; i++) {
        const cx = ((t * 12 + i * 430) % (App.VW + 400)) - 200;
        const cy = 110 + i * 42;
        ctx.save();
        ctx.fillStyle = rainy ? 'rgba(118,128,140,0.9)'
          : env.time === 'night' ? 'rgba(120,130,155,0.5)' : 'rgba(255,255,255,0.82)';
        [[0, 0, 70, 38], [60, 8, 52, 30], [-58, 10, 46, 26]].forEach(([ox, oy, rx, ry]) => {
          ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, U.TAU); ctx.fill();
        });
        ctx.restore();
      }
    }

    /* ---------- поляна ---------- */
    function drawWorld(ctx) {
      const S = SN();

      const hill = (y, col) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, y + 120);
        for (let x = 0; x <= WORLD_W; x += 20) {
          ctx.lineTo(x, y + Math.sin(x * 0.004 + y) * 36 + Math.sin(x * 0.011) * 14);
        }
        ctx.lineTo(WORLD_W, App.VH); ctx.lineTo(0, App.VH); ctx.closePath(); ctx.fill();
      };
      hill(430, S.hill1);
      hill(520, S.hill2);

      ctx.fillStyle = S.grass;
      ctx.beginPath();
      ctx.moveTo(0, 660);
      for (let x = 0; x <= WORLD_W; x += 24) {
        ctx.lineTo(x, 648 + Math.sin(x * 0.006 + 1.4) * 22 + Math.sin(x * 0.02) * 7);
      }
      ctx.lineTo(WORLD_W, App.VH); ctx.lineTo(0, App.VH); ctx.closePath(); ctx.fill();

      // зимой у костра снег подтаял
      if (S.snow > 0 && fireLevel > 0.2) {
        ctx.save();
        const mg = ctx.createRadialGradient(FIRE.x, FIRE.y, 30, FIRE.x, FIRE.y, 300 * fireLevel);
        mg.addColorStop(0, 'rgba(96,140,80,0.95)');
        mg.addColorStop(0.7, 'rgba(120,158,100,0.6)');
        mg.addColorStop(1, 'rgba(140,170,130,0)');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.ellipse(FIRE.x, FIRE.y + 10, 300 * fireLevel, 110 * fireLevel, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
      }

      // травинки
      ctx.save();
      const rnd = U.mulberry32(21);
      ctx.strokeStyle = S.blade; ctx.lineCap = 'round';
      const blades = S.snow > 0 ? 130 : 300;
      for (let i = 0; i < blades; i++) {
        const x = rnd() * WORLD_W, y = 560 + rnd() * (App.VH - 560);
        const h = 6 + rnd() * 16 * ((y - 540) / 400) * (S.snow ? 0.5 : 1);
        const sw = Math.sin(t * 1.4 + x * 0.01) * 4;
        ctx.lineWidth = 1.5 + rnd() * 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw, y - h * 0.6, x + sw * 1.6, y - h); ctx.stroke();
      }
      ctx.restore();

      // весной травы больше
      if (S.flowers >= 90) {
        ctx.save();
        const grnd = U.mulberry32(45);
        ctx.strokeStyle = 'rgba(60,130,45,0.5)'; ctx.lineCap = 'round';
        for (let i = 0; i < 160; i++) {
          const x = grnd() * WORLD_W, y = 640 + grnd() * (App.VH - 640);
          const h = 14 + grnd() * 22;
          ctx.lineWidth = 2 + grnd() * 2;
          const sw = Math.sin(t * 1.2 + x * 0.02) * 5;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw, y - h * 0.6, x + sw * 1.8, y - h); ctx.stroke();
        }
        ctx.restore();
      }

      // лужа (зимой подмерзает)
      ctx.save();
      ctx.fillStyle = 'rgba(70,140,170,0.35)';
      ctx.beginPath(); ctx.ellipse(POOL.x, POOL.y + 6, POOL.rx + 10, POOL.ry + 8, 0, 0, U.TAU); ctx.fill();
      const pg = ctx.createLinearGradient(0, POOL.y - POOL.ry, 0, POOL.y + POOL.ry);
      if (S.snow > 0) { pg.addColorStop(0, 'rgba(206,232,244,0.95)'); pg.addColorStop(1, 'rgba(150,190,215,0.95)'); }
      else { pg.addColorStop(0, 'rgba(120,200,225,0.85)'); pg.addColorStop(1, 'rgba(56,130,165,0.9)'); }
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(POOL.x, POOL.y, POOL.rx, POOL.ry, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 4; i++) {
        const ph = t * 0.5 + i * 1.7;
        ctx.beginPath();
        ctx.ellipse(POOL.x - 90 + i * 62 + Math.sin(ph) * 10, POOL.y - 26 + i * 14,
          34 + Math.sin(ph * 1.3) * 6, 6, -0.15, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();

      // кусты и маленькие деревья
      const bush = (x, y, r) => {
        ctx.save();
        ctx.fillStyle = S.bush2;
        [[0, 0, r], [-r * 0.72, r * 0.2, r * 0.72], [r * 0.72, r * 0.16, r * 0.66]].forEach(([ox, oy, rr]) => {
          ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, U.TAU); ctx.fill();
        });
        ctx.fillStyle = S.bush1;
        [[-r * 0.3, -r * 0.35, r * 0.55], [r * 0.42, -r * 0.2, r * 0.42]].forEach(([ox, oy, rr]) => {
          ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, U.TAU); ctx.fill();
        });
        if (S.blossom) {
          const brnd = U.mulberry32(Math.round(x));
          ctx.fillStyle = '#f9c2d8';
          for (let i = 0; i < 7; i++) {
            ctx.beginPath();
            ctx.arc(x + (brnd() * 2 - 1) * r, y + (brnd() * 2 - 1) * r * 0.7, 4.5, 0, U.TAU); ctx.fill();
          }
        }
        if (S.snow > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath(); ctx.ellipse(x, y - r * 0.7, r * 0.9, r * 0.34, 0, 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      };
      const smallTree = (x, y, s2) => {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(x, y + 6, 70 * s2, 18 * s2, 0, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#6b4a26';
        U.roundRect(ctx, x - 14 * s2, y - 120 * s2, 28 * s2, 124 * s2, 8 * s2); ctx.fill();
        if (S.bare) {
          ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 9 * s2; ctx.lineCap = 'round';
          [[-1, -0.3], [1, -0.5], [-1, -0.75], [1, -0.95]].forEach(([dir, hy]) => {
            ctx.beginPath();
            ctx.moveTo(x, y + 120 * s2 * hy);
            ctx.lineTo(x + dir * 54 * s2, y + 120 * s2 * hy - 44 * s2);
            ctx.stroke();
          });
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5 * s2;
          [[-1, -0.3], [1, -0.5], [-1, -0.75], [1, -0.95]].forEach(([dir, hy]) => {
            ctx.beginPath();
            ctx.moveTo(x, y + 120 * s2 * hy - 5 * s2);
            ctx.lineTo(x + dir * 50 * s2, y + 120 * s2 * hy - 47 * s2);
            ctx.stroke();
          });
        } else {
          bush(x, y - 150 * s2, 74 * s2);
          bush(x - 46 * s2, y - 118 * s2, 50 * s2);
        }
        ctx.restore();
      };
      smallTree(620, 672, 0.62);
      smallTree(1840, 692, 0.7);
      bush(880, 664, 38);
      bush(1640, 672, 42);
      bush(2020, 654, 36);
      bush(520, 900, 44);

      // цветы
      if (S.flowers > 0) {
        const frnd = U.mulberry32(77);
        const cols = S.flowers >= 90
          ? ['#f5e56b', '#f28fb4', '#ffffff', '#c79bf0', '#ff9ec7', '#9be3ff']
          : S.fall === 'leaf' ? ['#e0a33a', '#c98042', '#d9c15a'] : ['#f5e56b', '#f28fb4', '#ffffff', '#c79bf0'];
        for (let i = 0; i < S.flowers; i++) {
          const x = frnd() * WORLD_W, y = 660 + frnd() * (App.VH - 680);
          const col = cols[Math.floor(frnd() * cols.length)];
          ctx.fillStyle = col;
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * U.TAU;
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 4, 3.4, 0, U.TAU); ctx.fill();
          }
          ctx.fillStyle = '#f0b429';
          ctx.beginPath(); ctx.arc(x, y, 2.6, 0, U.TAU); ctx.fill();
        }
      }

      // камни
      [[176, 706, 40], [128, 726, 26], [960, 906, 44], [1720, 880, 38], [1960, 730, 30]].forEach(([x, y, r], i) => {
        const g2 = ctx.createLinearGradient(x, y - r, x, y + r);
        g2.addColorStop(0, '#b0b6ae'); g2.addColorStop(1, '#6e756c');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.68, i * 0.4, 0, U.TAU); ctx.fill();
        if (S.snow > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath(); ctx.ellipse(x, y - r * 0.24, r * 0.88, r * 0.26, i * 0.4, 0, U.TAU); ctx.fill();
        }
      });

      drawBigTree(ctx, S);
      drawCamp(ctx, S);
    }

    /* ---------- большое дерево ---------- */
    function drawBigTree(ctx, S) {
      const x = TREE.x, base = TREE.base;
      const sway = Math.sin(t * 0.6) * 0.012;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.ellipse(x, base, 190, 34, 0, 0, U.TAU); ctx.fill();

      ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 26; ctx.lineCap = 'round';
      [-1, 1].forEach((s2) => {
        ctx.beginPath();
        ctx.moveTo(x + s2 * 20, base - 60);
        ctx.quadraticCurveTo(x + s2 * 90, base - 30, x + s2 * 140, base - 2);
        ctx.stroke();
      });

      ctx.translate(x, base);
      ctx.rotate(sway);
      ctx.translate(-x, -base);

      const tg = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
      tg.addColorStop(0, '#5b3d1f'); tg.addColorStop(0.45, '#7d5730'); tg.addColorStop(1, '#4a2f16');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(x - 72, base);
      ctx.quadraticCurveTo(x - 44, base - 260, x - 34, 430);
      ctx.lineTo(x + 34, 430);
      ctx.quadraticCurveTo(x + 46, base - 260, x + 74, base);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(60,38,16,0.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const ox = -46 + i * 18;
        ctx.beginPath();
        ctx.moveTo(x + ox, base - 30);
        ctx.quadraticCurveTo(x + ox * 0.7 + 6, base - 250, x + ox * 0.5, 450);
        ctx.stroke();
      }

      const branch = (bx, by, len, dir, th) => {
        ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = th; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + dir * 24, by + 42);
        ctx.quadraticCurveTo(bx - dir * len * 0.35, by + 16, bx - dir * len * 0.02, by);
        ctx.lineTo(bx + dir * len * 0.55, by);
        ctx.stroke();
        ctx.strokeStyle = '#8a6236'; ctx.lineWidth = th * 0.45;
        ctx.beginPath();
        ctx.moveTo(x + dir * 24, by + 40);
        ctx.quadraticCurveTo(bx - dir * len * 0.35, by + 14, bx + dir * len * 0.55, by - 2);
        ctx.stroke();
        if (S.snow > 0) {
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = th * 0.4;
          ctx.beginPath();
          ctx.moveTo(x + dir * 24, by + 36);
          ctx.quadraticCurveTo(bx - dir * len * 0.35, by + 8, bx + dir * len * 0.55, by - 8);
          ctx.stroke();
        }
      };
      branch(x - 136, 606, 150, -1, 26);
      branch(x + 168, 652, 150, 1, 26);
      branch(x - 104, 734, 130, -1, 22);

      if (S.bare) {
        // зимой — голые ветки и шапки снега
        ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 16; ctx.lineCap = 'round';
        [[-1, 470, 170], [1, 430, 190], [-1, 380, 150], [1, 350, 140], [-1, 320, 110], [1, 300, 120]].forEach(([dir, by, len]) => {
          ctx.beginPath();
          ctx.moveTo(x, by + 70);
          ctx.quadraticCurveTo(x + dir * len * 0.5, by + 10, x + dir * len, by - 60);
          ctx.stroke();
        });
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 7;
        [[-1, 470, 170], [1, 430, 190], [-1, 380, 150], [1, 350, 140], [-1, 320, 110], [1, 300, 120]].forEach(([dir, by, len]) => {
          ctx.beginPath();
          ctx.moveTo(x, by + 64);
          ctx.quadraticCurveTo(x + dir * len * 0.5, by + 4, x + dir * len, by - 66);
          ctx.stroke();
        });
      } else {
        const leaf = (lx, ly, r, c1, c2) => {
          ctx.fillStyle = c2;
          ctx.beginPath(); ctx.arc(lx, ly, r, 0, U.TAU); ctx.fill();
          ctx.fillStyle = c1;
          ctx.beginPath(); ctx.arc(lx - r * 0.22, ly - r * 0.26, r * 0.72, 0, U.TAU); ctx.fill();
        };
        [[-152, 392, 112], [0, 322, 138], [152, 396, 116], [-78, 286, 98], [88, 280, 102],
         [-232, 470, 84], [236, 478, 86], [0, 430, 112]].forEach(([ox, oy, r], i) => {
          leaf(x + ox, oy, r, S.leaf1, S.leaf2);
        });
        [[-212, 590], [238, 636], [-188, 718]].forEach(([ox, ly], i) => {
          leaf(x + ox, ly, 30 + (i % 2) * 6, S.leaf1, S.leaf2);
        });
        if (S.blossom) {
          const brnd = U.mulberry32(5);
          ctx.fillStyle = '#f9c2d8';
          for (let i = 0; i < 46; i++) {
            const ox = (brnd() * 2 - 1) * 250, oy = 280 + brnd() * 230;
            ctx.beginPath(); ctx.arc(x + ox, oy, 5 + brnd() * 4, 0, U.TAU); ctx.fill();
          }
          ctx.fillStyle = '#fff0f6';
          for (let i = 0; i < 24; i++) {
            const ox = (brnd() * 2 - 1) * 240, oy = 290 + brnd() * 210;
            ctx.beginPath(); ctx.arc(x + ox, oy, 4, 0, U.TAU); ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    /* ---------- костёр и пеньки ---------- */
    function drawCamp(ctx, S) {
      const x = FIRE.x, y = FIRE.y;
      ctx.save();
      [[-96, 6], [-52, 20], [0, 26], [52, 20], [96, 6]].forEach(([ox, oy], i) => {
        const g2 = ctx.createLinearGradient(x + ox, y + oy - 18, x + ox, y + oy + 14);
        g2.addColorStop(0, '#b6bbb0'); g2.addColorStop(1, '#767c70');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(x + ox, y + oy, 26 - (i % 2) * 4, 17, i * 0.4, 0, U.TAU); ctx.fill();
      });
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(x, y - 4);
        ctx.rotate(-0.5 + i * 0.5);
        ctx.fillStyle = fireLevel > 0.2 ? '#5a3a18' : '#3a2a18';
        U.roundRect(ctx, -84, -11, 168, 22, 11); ctx.fill();
        ctx.fillStyle = fireLevel > 0.2 ? '#43290f' : '#2a1e12';
        U.roundRect(ctx, -84, 2, 168, 9, 5); ctx.fill();
        ctx.restore();
      }
      if (fireLevel > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const glow = TM().fireGlow * fireLevel;
        const cg = ctx.createRadialGradient(x, y - 6, 4, x, y - 6, 150 + glow * 90);
        cg.addColorStop(0, `rgba(255,150,50,${0.5 * glow})`);
        cg.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.ellipse(x, y - 6, 150 + glow * 90, 46 + glow * 24, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
        FX.drawFire(ctx, x, y - 10, 92 * (0.5 + fireLevel * 0.5), 186 * fireLevel, t, fireLevel, 5, true);
      }
      ctx.restore();

      STUMPS.forEach((st) => {
        const w = 104, h = 150;
        const topY = st.y - h;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(st.x, st.y + 6, w * 0.66, 17, 0, 0, U.TAU); ctx.fill();
        const lg = ctx.createLinearGradient(st.x - w / 2, 0, st.x + w / 2, 0);
        lg.addColorStop(0, '#5b3d1f'); lg.addColorStop(0.45, '#8a6236'); lg.addColorStop(1, '#4a2f16');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(st.x - w / 2, topY);
        ctx.lineTo(st.x - w / 2, st.y);
        ctx.quadraticCurveTo(st.x, st.y + 22, st.x + w / 2, st.y);
        ctx.lineTo(st.x + w / 2, topY);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(62,40,18,0.5)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const ox = -34 + k * 22;
          ctx.beginPath();
          ctx.moveTo(st.x + ox, topY + 14);
          ctx.lineTo(st.x + ox + (k % 2 ? 4 : -4), st.y - 8);
          ctx.stroke();
        }
        ctx.fillStyle = '#d2a972';
        ctx.beginPath(); ctx.ellipse(st.x, topY, w / 2, 20, 0, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(140,100,54,0.75)'; ctx.lineWidth = 2;
        for (let k = 1; k <= 4; k++) {
          ctx.beginPath(); ctx.ellipse(st.x, topY, (w / 2) * (k / 5), 20 * (k / 5), 0, 0, U.TAU); ctx.stroke();
        }
        if (S.snow > 0 && U.dist(st.x, st.y, FIRE.x, FIRE.y) > 260 * fireLevel) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.beginPath(); ctx.ellipse(st.x, topY - 4, w / 2 - 4, 17, 0, 0, U.TAU); ctx.fill();
        }
        ctx.restore();
      });
    }
  });
})(window);
