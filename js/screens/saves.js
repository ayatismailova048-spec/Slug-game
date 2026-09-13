/* ============================================================
   screens/saves.js — сохранения: 24 слота, у каждого своё имя
   ============================================================ */
(function (global) {
  'use strict';

  App.register('saves', function () {
    let t = 0;
    let cards = [];
    let page = 0;
    const PER_PAGE = 12;
    const PAGES = Math.ceil(Save.SLOTS / PER_PAGE);
    const back = Room.makeBackBtn();
    let pager = {};

    const CW = 350, CH = 252;
    const COLS = 4, ROWS = 3;
    const X0 = 60, Y0 = 128, GX = 38, GY = 26;

    function build() {
      cards = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c;
          const x = X0 + c * (CW + GX);
          const y = Y0 + r * (CH + GY);
          cards.push({
            i, x, y, w: CW, h: CH, hov: 0,
            btns: [
              new UI.Btn({ x: x + 12, y: y + CH - 50, w: 72, h: 42, label: 'Взять', font: 15, color: '#3fbf8f', dark: '#217e5e' }),
              new UI.Btn({ x: x + 88, y: y + CH - 50, w: 72, h: 42, label: 'Имя', font: 15, color: '#c98a2f', dark: '#8d5b13' }),
              new UI.Btn({ x: x + 164, y: y + CH - 50, w: 78, h: 42, label: 'Карта', font: 15, color: '#7d5cc9', dark: '#4e358c' }),
              new UI.Btn({ x: x + 248, y: y + CH - 50, w: 60, h: 42, label: '✕', font: 20, color: '#c2564c', dark: '#8a332c' })
            ],
            saveBtn: new UI.Btn({ x: x + 74, y: y + CH - 90, w: 200, h: 58, label: 'Сохранить', font: 18, color: '#4d8ec9', dark: '#2c5f8f' })
          });
        }
      }
      pager = {
        prev: new UI.Btn({ x: 660, y: 940, w: 60, h: 52, label: '‹', font: 28, color: '#8e9b93', dark: '#5f6d66', radius: 16 }),
        next: new UI.Btn({ x: 880, y: 940, w: 60, h: 52, label: '›', font: 28, color: '#8e9b93', dark: '#5f6d66', radius: 16 })
      };
    }

    const slotIndex = (c) => page * PER_PAGE + c.i;

    function doSave(idx) {
      App.askName(SlugModel.title(App.slug), (name) => {
        if (name === null) return;
        let thumb = null;
        try { thumb = SlugArt.thumbnail(App.slug, 200); } catch (e) { /* не критично */ }
        Save.setSlot(idx, App.slug, thumb, name);
        Sfx.chime(true);
        App.toast('Сохранён: ' + name, '#8ce06a');
      });
    }
    function doRename(idx) {
      const s = Save.getSlot(idx);
      if (!s) return;
      App.askName(s.name || s.title || 'Слизень', (name) => {
        if (name === null) return;
        Save.renameSlot(idx, name);
        Sfx.click(1.3);
        App.toast('Теперь его зовут ' + name, '#ffd9a0');
      });
    }
    function doLoad(idx) {
      const s = Save.getSlot(idx);
      if (!s) return;
      App.slug = SlugModel.makeSlug(s.slug);
      App.slug.fx = Object.assign(SlugModel.freshEffects(), s.slug.fx);
      Sfx.chime(true);
      App.toast('Взяли: ' + (s.name || SlugModel.title(App.slug)), '#8ce06a');
    }
    function doMap(idx) {
      const s = Save.getSlot(idx);
      if (!s) return;
      Save.mapAdd(s.slug, U.rand(320, 1280), U.rand(660, 880));
      Sfx.pop(1.2);
      App.toast((s.name || 'Слизень') + ' — на карте', '#c7a6ff');
    }
    function doDelete(idx) {
      Save.clearSlot(idx);
      Sfx.pop(0.6);
      App.toast('Слот очищен');
    }

    return {
      enter() { build(); t = 0; },
      update(dt) {
        t += dt;
        back.update(dt, App.pointer, App.pointer.down);
        const slots = Save.slots();
        for (const c of cards) {
          const h = App.pointer.x > c.x && App.pointer.x < c.x + c.w && App.pointer.y > c.y && App.pointer.y < c.y + c.h;
          c.hov += ((h ? 1 : 0) - c.hov) * Math.min(1, dt * 12);
          const filled = !!slots[slotIndex(c)];
          c.btns.forEach((b) => { b.visible = filled; b.update(dt, App.pointer, App.pointer.down); });
          c.saveBtn.visible = !filled;
          c.saveBtn.update(dt, App.pointer, App.pointer.down);
        }
        pager.prev.enabled = page > 0;
        pager.next.enabled = page < PAGES - 1;
        pager.prev.update(dt, App.pointer, App.pointer.down);
        pager.next.update(dt, App.pointer, App.pointer.down);
      },
      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, App.VH);
        g.addColorStop(0, '#9aa3a8'); g.addColorStop(0.35, '#e3e6e4'); g.addColorStop(1, '#3d4448');
        ctx.fillStyle = g; ctx.fillRect(0, 0, App.VW, App.VH);

        U.text(ctx, 'СОХРАНЕНИЕ', App.VW / 2, 64, {
          size: 50, color: '#1d2a24', weight: 900, stroke: 'rgba(255,255,255,0.7)', strokeW: 7
        });

        // кого сохраняем
        SlugArt.draw(ctx, App.slug, { x: 168, y: 74, scale: 0.2, t, shadow: false });
        U.text(ctx, SlugModel.title(App.slug), 224, 70, {
          size: 19, color: '#2a3a33', align: 'left', weight: 800, maxWidth: 300
        });

        const slots = Save.slots();
        for (const c of cards) {
          const idx = slotIndex(c);
          const s = slots[idx];
          const lift = c.hov * 5;
          const x = c.x, y = c.y - lift;
          ctx.save();
          U.shadowOn(ctx, 16 + c.hov * 10, 'rgba(0,0,0,0.32)', 0, 8);
          ctx.fillStyle = s ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.5)';
          U.roundRect(ctx, x, y, c.w, c.h, 20); ctx.fill();
          U.shadowOff(ctx);
          if (!s) {
            ctx.setLineDash([12, 10]);
            ctx.strokeStyle = 'rgba(60,80,70,0.45)'; ctx.lineWidth = 3;
            U.roundRect(ctx, x + 10, y + 10, c.w - 20, c.h - 20, 14); ctx.stroke();
            ctx.setLineDash([]);
            U.text(ctx, 'ПУСТО', x + c.w / 2, y + 80, { size: 26, color: 'rgba(50,70,60,0.5)', weight: 900 });
            U.text(ctx, '№ ' + (idx + 1), x + c.w / 2, y + 112, { size: 16, color: 'rgba(50,70,60,0.45)', weight: 700 });
          } else {
            ctx.fillStyle = '#3fbf8f';
            U.roundRect(ctx, x + 12, y + 12, 42, 30, 9); ctx.fill();
            U.text(ctx, String(idx + 1), x + 33, y + 28, { size: 17, color: '#fff', weight: 900 });

            SlugArt.draw(ctx, s.slug, {
              x: x + c.w / 2, y: y + 96, scale: 0.3, t: t + c.i,
              look: { x: U.clamp((App.pointer.x - (x + c.w / 2)) / 400, -1, 1), y: 0 },
              squash: 1 + Math.sin((t + c.i) * 1.8) * 0.03
            });
            U.text(ctx, s.name || s.title || 'Слизень', x + c.w / 2, y + 142, {
              size: 21, color: '#1d2a24', weight: 900, maxWidth: c.w - 26
            });
            U.text(ctx, s.title || '', x + c.w / 2, y + 166, {
              size: 14, color: '#6c7c74', weight: 700, maxWidth: c.w - 26
            });
            const d = new Date(s.savedAt);
            const pad = (n) => String(n).padStart(2, '0');
            U.text(ctx, `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
              x + c.w / 2, y + 186, { size: 12, color: '#8a9a92', weight: 700 });
          }
          ctx.restore();
          c.btns.forEach((b) => b.draw(ctx, t));
          c.saveBtn.draw(ctx, t);
        }

        if (PAGES > 1) {
          pager.prev.draw(ctx, t);
          pager.next.draw(ctx, t);
          U.text(ctx, (page + 1) + ' / ' + PAGES, 800, 966, { size: 22, color: '#20302a', weight: 800 });
        }

        back.draw(ctx, t);
      },
      onDown(p) {
        if (back.hit(p)) { Sfx.click(); App.go('hub'); return; }
        if (App.hitMute(p)) return;
        if (PAGES > 1) {
          if (pager.prev.hit(p) && pager.prev.enabled) { page--; Sfx.click(); return; }
          if (pager.next.hit(p) && pager.next.enabled) { page++; Sfx.click(); return; }
        }
        for (const c of cards) {
          const idx = slotIndex(c);
          if (c.saveBtn.visible && c.saveBtn.hit(p)) { Sfx.click(); doSave(idx); return; }
          if (c.btns[0].visible) {
            if (c.btns[0].hit(p)) { Sfx.click(); doLoad(idx); return; }
            if (c.btns[1].hit(p)) { Sfx.click(); doRename(idx); return; }
            if (c.btns[2].hit(p)) { Sfx.click(); doMap(idx); return; }
            if (c.btns[3].hit(p)) { Sfx.click(); doDelete(idx); return; }
          }
          if (!Save.slots()[idx] && p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) {
            Sfx.click(); doSave(idx); return;
          }
        }
      }
    };
  });
})(window);
