/* ============================================================
   screens/map.js — карта: выпускаем слизней и двигаем их
   ============================================================ */
(function (global) {
  'use strict';

  App.register('map', function () {
    let t = 0;
    const back = Room.makeBackBtn();
    let btns = [];
    let dragIdx = -1, dx = 0, dy = 0;
    let pickerOpen = false;
    let items = [];
    let saveTimer = 0;
    const WORLD_W = 2600;                 // поляна шире экрана
    let cam = 0, panning = false, panX = 0, panCam = 0;
    const maxCam = () => Math.max(0, WORLD_W - App.VW);
    const clampCam = () => { cam = U.clamp(cam, 0, maxCam()); };
    const worldX = (sx) => sx + cam;
    const parts = new FX.Particles(300);
    const TRASH = { x: 1512, y: 918, r: 58 };
    const POOL = { x: 270, y: 858, rx: 210, ry: 68 };
    const TREE = { x: 1300, base: 952 };
    const FIRE = { x: 2300, y: 884 };
    const STUMPS = [{ x: 2116, y: 906 }, { x: 2480, y: 906 }];

    /** места, куда можно посадить слизня: ветки дерева и брёвна у костра */
    const SPOTS = [
      { x: TREE.x - 136, y: 560 }, { x: TREE.x + 168, y: 606 }, { x: TREE.x - 104, y: 688 }, // ветки
      { x: STUMPS[0].x, y: 716 }, { x: STUMPS[1].x, y: 716 }                                  // брёвна
    ];

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

    /** попал ли слизень в лужу */
    function inPool(x, y) {
      const dx = (x - POOL.x) / POOL.rx, dy = (y - POOL.y) / (POOL.ry * 1.3);
      return dx * dx + dy * dy < 1;
    }

    function refresh() { items = Save.mapItems(); }

    /** аккуратная раскладка, чтобы слизни не сваливались в кучу */
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
      slots.forEach((s, i) => {
        if (!s) return;
        out.push({ i, s, x: 120 + out.length * 200, y: App.VH - 210, w: 180, h: 170 });
      });
      return out;
    }

    return {
      enter() { build(); refresh(); t = 0; Sfx.loop('fire', true, 0.45); },
      exit() { Sfx.loop('fire', false); },
      update(dt) {
        t += dt;
        parts.update(dt);

        // на траве слизень обсыхает: капли стекают, и он снова обычный
        let changed = false;
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const f = it.slug.fx;
          const submerged = inPool(it.x, it.y) && dragIdx !== i;
          if (submerged || !f || (f.wet || 0) <= 0) continue;
          const sc = it.scale || 0.5;
          // капля срывается с брюшка
          if (Math.random() < dt * 3.2 * f.wet) {
            parts.add({
              kind: 'drop', x: it.x + U.rand(-110, 110) * sc, y: it.y + 46 * sc,
              vx: U.rand(-12, 12), vy: U.rand(40, 130), grav: 900,
              life: U.rand(0.45, 0.8), size: U.rand(3, 6), col: 'rgba(180,232,250,0.9)'
            });
          }
          // рядом с костром сохнет куда быстрее и парит
          const nearFire = U.dist(it.x, it.y, FIRE.x, FIRE.y) < 320;
          const rate = nearFire ? 0.55 : 0.1;
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
            life: U.rand(1.6, 3), size: U.rand(14, 28), alpha: 0.35
          });
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
          // вода поверх нижней половины — слизень «стоит в луже»
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
            // круги по воде
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

          // имя над слизнем
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

        // стрелки — поляна продолжается
        const arrow = (ax, dir) => {
          ctx.save();
          ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(ax + dir * 16, 470); ctx.lineTo(ax - dir * 16, 510); ctx.lineTo(ax + dir * 16, 550);
          ctx.stroke();
          ctx.restore();
        };
        if (cam > 4) arrow(42, 1);
        if (cam < maxCam() - 4) arrow(App.VW - 42, -1);

        // корзина — только пока тащишь слизня, чтобы не мешала любоваться поляной
        if (dragIdx >= 0) {
          const overTrash = U.dist(App.pointer.x, App.pointer.y, TRASH.x, TRASH.y) < TRASH.r + 40;
          ctx.save();
          ctx.fillStyle = overTrash ? '#e2574c' : 'rgba(30,40,34,0.6)';
          ctx.beginPath(); ctx.arc(TRASH.x, TRASH.y, TRASH.r + (overTrash ? 8 : 0), 0, U.TAU); ctx.fill();
          U.text(ctx, '🗑', TRASH.x, TRASH.y, { size: 48 });
          ctx.restore();
        }

        // панель
        UI.panel(ctx, 200, 16, 900, 72, 18, 'rgba(12,22,18,0.55)');
        btns.forEach((b) => b.draw(ctx, t));
        back.draw(ctx, t);

        U.text(ctx, 'Слизней на карте: ' + items.length, App.VW / 2, 120,
          { size: 22, color: '#20402f', weight: 800, stroke: 'rgba(255,255,255,0.6)', strokeW: 4 });
        U.text(ctx, 'Перетаскивай слизней. Тяни поляну в сторону — она большая.', App.VW / 2, 152,
          { size: 17, color: '#2c4c3a', weight: 700, stroke: 'rgba(255,255,255,0.5)', strokeW: 3 });

        // выбор из сохранений
        if (pickerOpen) {
          const cards = pickerCards();
          UI.panel(ctx, 80, App.VH - 240, App.VW - 160, 210, 20, 'rgba(12,22,18,0.85)');
          U.text(ctx, 'Выбери сохранение, чтобы выпустить на карту', App.VW / 2, App.VH - 218,
            { size: 18, color: '#cfe9dd', weight: 800 });
          if (!cards.length) {
            U.text(ctx, 'Пока нет ни одного сохранения', App.VW / 2, App.VH - 130,
              { size: 24, color: '#8ba99a', weight: 800 });
          }
          for (const c of cards) {
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            U.roundRect(ctx, c.x, c.y, c.w, c.h, 16); ctx.fill();
            SlugArt.draw(ctx, c.s.slug, { x: c.x + c.w / 2, y: c.y + 86, scale: 0.26, t: t + c.i, shadow: false });
            U.text(ctx, c.s.title || '', c.x + c.w / 2, c.y + 146, { size: 14, color: '#dff5ea', weight: 800, maxWidth: c.w - 16 });
            ctx.restore();
          }
        }
      },
      onDown(p) {
        if (back.hit(p)) { Sfx.click(); App.go('hub'); return; }
        if (App.hitMute(p)) return;
        for (const b of btns) if (b.hit(p)) { Sfx.click(); b.onClick(); return; }

        if (pickerOpen) {
          for (const c of pickerCards()) {
            if (p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) {
              spawn(c.s.slug); pickerOpen = false;
              return;
            }
          }
        }

        // берём слизня (сверху вниз по глубине)
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

        // тянем саму поляну
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
              kind: 'goo', x: TRASH.x + U.rand(-30, 30), y: TRASH.y,
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
              // не попал никуда наверху — спускается на траву
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

    /* ---------- небо (не едет вместе с поляной) ---------- */
    function drawSky(ctx) {
        const sky = ctx.createLinearGradient(0, 0, 0, 560);
        sky.addColorStop(0, '#7ec6e8'); sky.addColorStop(1, '#cfe9dd');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, App.VW, App.VH);
        // солнце
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const sg = ctx.createRadialGradient(1320, 150, 10, 1320, 150, 230);
        sg.addColorStop(0, 'rgba(255,248,205,0.55)'); sg.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(1320, 150, 230, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,250,215,0.85)';
        ctx.beginPath(); ctx.arc(1320, 150, 52, 0, U.TAU); ctx.fill();
        ctx.restore();
        // облака
        for (let i = 0; i < 4; i++) {
          const cx = ((t * 12 + i * 430) % (App.VW + 400)) - 200;
          const cy = 110 + i * 42;
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.82)';
          [[0, 0, 70, 38], [60, 8, 52, 30], [-58, 10, 46, 26]].forEach(([ox, oy, rx, ry]) => {
            ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, U.TAU); ctx.fill();
          });
          ctx.restore();
        }
    }

    /* ---------- поляна: она шире экрана ---------- */
    function drawWorld(ctx) {
        // холмы
        const hill = (y, col) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(0, y + 120);
          for (let x = 0; x <= WORLD_W; x += 20) {
            ctx.lineTo(x, y + Math.sin(x * 0.004 + y) * 36 + Math.sin(x * 0.011) * 14);
          }
          ctx.lineTo(WORLD_W, App.VH); ctx.lineTo(0, App.VH); ctx.closePath(); ctx.fill();
        };
        hill(430, '#7aa858');
        hill(520, '#5f9247');
        // трава-поле с мягкой кромкой
        ctx.fillStyle = '#4e8340';
        ctx.beginPath();
        ctx.moveTo(0, 660);
        for (let x = 0; x <= WORLD_W; x += 24) {
          ctx.lineTo(x, 648 + Math.sin(x * 0.006 + 1.4) * 22 + Math.sin(x * 0.02) * 7);
        }
        ctx.lineTo(WORLD_W, App.VH); ctx.lineTo(0, App.VH); ctx.closePath(); ctx.fill();
        ctx.save();
        const rnd = U.mulberry32(21);
        ctx.strokeStyle = 'rgba(30,80,30,0.35)'; ctx.lineCap = 'round';
        for (let i = 0; i < 300; i++) {
          const x = rnd() * WORLD_W, y = 560 + rnd() * (App.VH - 560);
          const h = 6 + rnd() * 16 * ((y - 540) / 400);
          const sw = Math.sin(t * 1.4 + x * 0.01) * 4;
          ctx.lineWidth = 1.5 + rnd() * 1.6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw, y - h * 0.6, x + sw * 1.6, y - h); ctx.stroke();
        }
        ctx.restore();
        // лужа
        ctx.save();
        ctx.fillStyle = 'rgba(70,140,170,0.35)';
        ctx.beginPath(); ctx.ellipse(POOL.x, POOL.y + 6, POOL.rx + 10, POOL.ry + 8, 0, 0, U.TAU); ctx.fill();
        const pg = ctx.createLinearGradient(0, POOL.y - POOL.ry, 0, POOL.y + POOL.ry);
        pg.addColorStop(0, 'rgba(120,200,225,0.85)');
        pg.addColorStop(1, 'rgba(56,130,165,0.9)');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.ellipse(POOL.x, POOL.y, POOL.rx, POOL.ry, 0, 0, U.TAU); ctx.fill();
        // блики на воде
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 4; i++) {
          const ph = t * 0.5 + i * 1.7;
          ctx.beginPath();
          ctx.ellipse(POOL.x - 90 + i * 62 + Math.sin(ph) * 10, POOL.y - 26 + i * 14,
            34 + Math.sin(ph * 1.3) * 6, 6, -0.15, 0, U.TAU);
          ctx.fill();
        }
        ctx.restore();
        // кусты и деревья
        const bush = (x, y, r, col1, col2) => {
          ctx.save();
          ctx.fillStyle = col2;
          [[0, 0, r], [-r * 0.72, r * 0.2, r * 0.72], [r * 0.72, r * 0.16, r * 0.66]].forEach(([ox, oy, rr]) => {
            ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, U.TAU); ctx.fill();
          });
          ctx.fillStyle = col1;
          [[-r * 0.3, -r * 0.35, r * 0.55], [r * 0.42, -r * 0.2, r * 0.42]].forEach(([ox, oy, rr]) => {
            ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, U.TAU); ctx.fill();
          });
          ctx.restore();
        };
        const tree = (x, y, s) => {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.beginPath(); ctx.ellipse(x, y + 6, 70 * s, 18 * s, 0, 0, U.TAU); ctx.fill();
          ctx.fillStyle = '#6b4a26';
          U.roundRect(ctx, x - 14 * s, y - 120 * s, 28 * s, 124 * s, 8 * s); ctx.fill();
          bush(x, y - 150 * s, 74 * s, '#6fb054', '#4c8339');
          bush(x - 46 * s, y - 118 * s, 50 * s, '#66a64e', '#457a34');
          ctx.restore();
        };
        tree(620, 672, 0.62);
        tree(1840, 692, 0.7);
        bush(880, 664, 38, '#6fb054', '#4c8339');
        bush(1640, 672, 42, '#6fb054', '#4c8339');
        bush(2020, 654, 36, '#6fb054', '#4c8339');
        bush(520, 900, 44, '#6fb054', '#4c8339');
        // цветы
        const frnd = U.mulberry32(77);
        for (let i = 0; i < 40; i++) {
          const x = frnd() * WORLD_W, y = 660 + frnd() * (App.VH - 680);
          const col = ['#f5e56b', '#f28fb4', '#ffffff', '#c79bf0'][Math.floor(frnd() * 4)];
          ctx.fillStyle = col;
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * U.TAU;
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 4, 3.4, 0, U.TAU); ctx.fill();
          }
          ctx.fillStyle = '#f0b429';
          ctx.beginPath(); ctx.arc(x, y, 2.6, 0, U.TAU); ctx.fill();
        }
        // камни
        [[176, 706, 40], [128, 726, 26], [960, 906, 44], [1720, 880, 38], [1960, 730, 30]].forEach(([x, y, r], i) => {
          const g = ctx.createLinearGradient(x, y - r, x, y + r);
          g.addColorStop(0, '#b0b6ae'); g.addColorStop(1, '#6e756c');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.68, i * 0.4, 0, U.TAU); ctx.fill();
        });

        // большое дерево с ветками
        drawBigTree(ctx, t);

        // костёр и брёвна
        drawCamp(ctx, t);

    }

    /* ---------- большое дерево ---------- */
    function drawBigTree(ctx, t) {
      const x = TREE.x, base = TREE.base;
      const sway = Math.sin(t * 0.6) * 0.012;
      ctx.save();
      // тень под деревом
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.ellipse(x, base, 190, 34, 0, 0, U.TAU); ctx.fill();

      // корни
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

      // ствол
      const tg = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
      tg.addColorStop(0, '#5b3d1f'); tg.addColorStop(0.45, '#7d5730'); tg.addColorStop(1, '#4a2f16');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(x - 72, base);
      ctx.quadraticCurveTo(x - 44, base - 260, x - 34, 430);
      ctx.lineTo(x + 34, 430);
      ctx.quadraticCurveTo(x + 46, base - 260, x + 74, base);
      ctx.closePath(); ctx.fill();
      // кора
      ctx.strokeStyle = 'rgba(60,38,16,0.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const ox = -46 + i * 18;
        ctx.beginPath();
        ctx.moveTo(x + ox, base - 30);
        ctx.quadraticCurveTo(x + ox * 0.7 + 6, base - 250, x + ox * 0.5, 450);
        ctx.stroke();
      }

      // ветки (на них сидят слизни)
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
      };
      branch(x - 136, 606, 150, -1, 26);
      branch(x + 168, 652, 150, 1, 26);
      branch(x - 104, 734, 130, -1, 22);

      // крона
      const leaf = (lx, ly, r, c1, c2) => {
        ctx.fillStyle = c2;
        ctx.beginPath(); ctx.arc(lx, ly, r, 0, U.TAU); ctx.fill();
        ctx.fillStyle = c1;
        ctx.beginPath(); ctx.arc(lx - r * 0.22, ly - r * 0.26, r * 0.72, 0, U.TAU); ctx.fill();
      };
      [[-152, 392, 112], [0, 322, 138], [152, 396, 116], [-78, 286, 98], [88, 280, 102],
       [-232, 470, 84], [236, 478, 86], [0, 430, 112]].forEach(([ox, oy, r], i) => {
        leaf(x + ox, oy, r, i % 2 ? '#77b85c' : '#6aad50', i % 2 ? '#4f8b3a' : '#477f33');
      });
      // листики на ветках
      [[x - 212, 590], [x + 238, 636], [x - 188, 718]].forEach(([lx, ly], i) => {
        leaf(lx, ly, 30 + (i % 2) * 6, '#7cbf60', '#549240');
      });
      ctx.restore();
    }

    /* ---------- костёр и брёвна ---------- */
    function drawCamp(ctx, t) {
      const x = FIRE.x, y = FIRE.y;
      ctx.save();
      // круг камней
      [[-96, 6], [-52, 20], [0, 26], [52, 20], [96, 6]].forEach(([ox, oy], i) => {
        const g2 = ctx.createLinearGradient(x + ox, y + oy - 18, x + ox, y + oy + 14);
        g2.addColorStop(0, '#b6bbb0'); g2.addColorStop(1, '#767c70');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.ellipse(x + ox, y + oy, 26 - (i % 2) * 4, 17, i * 0.4, 0, U.TAU); ctx.fill();
      });
      // дрова шалашиком
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(x, y - 4);
        ctx.rotate(-0.5 + i * 0.5);
        ctx.fillStyle = '#5a3a18';
        U.roundRect(ctx, -84, -11, 168, 22, 11); ctx.fill();
        ctx.fillStyle = '#43290f';
        U.roundRect(ctx, -84, 2, 168, 9, 5); ctx.fill();
        ctx.restore();
      }
      // жар
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createRadialGradient(x, y - 6, 4, x, y - 6, 150);
      cg.addColorStop(0, 'rgba(255,150,50,0.5)');
      cg.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(x, y - 6, 150, 46, 0, 0, U.TAU); ctx.fill();
      ctx.restore();
      FX.drawFire(ctx, x, y - 10, 92, 186, t, 1, 5, true);
      ctx.restore();

      // брёвна стоят вертикально — как табуретки
      STUMPS.forEach((st, i) => {
        const w = 104, h = 150;
        const topY = st.y - h;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(st.x, st.y + 6, w * 0.66, 17, 0, 0, U.TAU); ctx.fill();
        // бок
        const lg = ctx.createLinearGradient(st.x - w / 2, 0, st.x + w / 2, 0);
        lg.addColorStop(0, '#5b3d1f'); lg.addColorStop(0.45, '#8a6236'); lg.addColorStop(1, '#4a2f16');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(st.x - w / 2, topY);
        ctx.lineTo(st.x - w / 2, st.y);
        ctx.quadraticCurveTo(st.x, st.y + 22, st.x + w / 2, st.y);
        ctx.lineTo(st.x + w / 2, topY);
        ctx.closePath(); ctx.fill();
        // кора
        ctx.strokeStyle = 'rgba(62,40,18,0.5)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const ox = -34 + k * 22;
          ctx.beginPath();
          ctx.moveTo(st.x + ox, topY + 14);
          ctx.lineTo(st.x + ox + (k % 2 ? 4 : -4), st.y - 8);
          ctx.stroke();
        }
        // спил сверху — сюда садится слизень
        ctx.fillStyle = '#d2a972';
        ctx.beginPath(); ctx.ellipse(st.x, topY, w / 2, 20, 0, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(140,100,54,0.75)'; ctx.lineWidth = 2;
        for (let k = 1; k <= 4; k++) {
          ctx.beginPath(); ctx.ellipse(st.x, topY, (w / 2) * (k / 5), 20 * (k / 5), 0, 0, U.TAU); ctx.stroke();
        }
        ctx.restore();
      });
    }
  });
})(window);
