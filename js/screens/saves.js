/* ============================================================
   screens/saves.js — экран сохранений
   ============================================================ */
(function (global) {
  'use strict';

  App.register('saves', function () {
    let t = 0;
    let cards = [];
    const back = Room.makeBackBtn();
    let confirmIdx = -1;

    const CW = 420, CH = 288;
    const POS = [
      { x: 100, y: 170 }, { x: 590, y: 170 }, { x: 1080, y: 170 },
      { x: 100, y: 486 }, { x: 590, y: 486 }, { x: 1080, y: 486 }
    ];

    function build() {
      cards = POS.map((p, i) => ({
        i, x: p.x, y: p.y, w: CW, h: CH, hov: 0,
        btns: [
          new UI.Btn({ x: p.x + 16, y: p.y + CH - 74, w: 124, h: 56, label: 'Загрузить', font: 16, color: '#3fbf8f', dark: '#217e5e' }),
          new UI.Btn({ x: p.x + 150, y: p.y + CH - 74, w: 124, h: 56, label: 'На карту', font: 16, color: '#7d5cc9', dark: '#4e358c' }),
          new UI.Btn({ x: p.x + 284, y: p.y + CH - 74, w: 120, h: 56, label: 'Удалить', font: 16, color: '#c2564c', dark: '#8a332c' })
        ],
        saveBtn: new UI.Btn({ x: p.x + 90, y: p.y + CH - 86, w: 240, h: 64, label: 'Сохранить сюда', font: 18, color: '#4d8ec9', dark: '#2c5f8f' })
      }));
    }

    function doSave(i) {
      let thumb = null;
      try { thumb = SlugArt.thumbnail(App.slug, 200); } catch (e) { /* не критично */ }
      const ok = Save.setSlot(i, App.slug, thumb);
      Sfx.chime(true);
      App.toast(ok ? 'Сохранено в слот ' + (i + 1) : 'Не удалось сохранить', ok ? '#8ce06a' : '#ff8a7a');
    }
    function doLoad(i) {
      const s = Save.getSlot(i);
      if (!s) return;
      App.slug = SlugModel.makeSlug(s.slug);
      App.slug.fx = Object.assign(SlugModel.freshEffects(), s.slug.fx);
      Sfx.chime(true);
      App.toast('Загружен: ' + SlugModel.title(App.slug), '#8ce06a');
    }
    function doMap(i) {
      const s = Save.getSlot(i);
      if (!s) return;
      Save.mapAdd(s.slug, U.rand(320, 1280), U.rand(520, 860));
      Sfx.pop(1.2);
      App.toast('Слизень выпущен на карту', '#c7a6ff');
    }
    function doDelete(i) {
      Save.clearSlot(i);
      Sfx.pop(0.6);
      App.toast('Слот ' + (i + 1) + ' очищен');
    }

    return {
      enter() { build(); t = 0; confirmIdx = -1; },
      update(dt) {
        t += dt;
        back.update(dt, App.pointer, App.pointer.down);
        const slots = Save.slots();
        for (const c of cards) {
          const h = App.pointer.x > c.x && App.pointer.x < c.x + c.w && App.pointer.y > c.y && App.pointer.y < c.y + c.h;
          c.hov += ((h ? 1 : 0) - c.hov) * Math.min(1, dt * 12);
          const filled = !!slots[c.i];
          c.btns.forEach((b) => { b.visible = filled; b.update(dt, App.pointer, App.pointer.down); });
          c.saveBtn.visible = !filled;
          c.saveBtn.update(dt, App.pointer, App.pointer.down);
        }
      },
      draw(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, App.VH);
        g.addColorStop(0, '#9aa3a8'); g.addColorStop(0.35, '#e3e6e4'); g.addColorStop(1, '#3d4448');
        ctx.fillStyle = g; ctx.fillRect(0, 0, App.VW, App.VH);

        // заголовок как на эскизе
        ctx.save();
        U.text(ctx, 'СОХРАНЕНИЕ', App.VW / 2, 96, {
          size: 62, color: '#1d2a24', weight: 900, stroke: 'rgba(255,255,255,0.7)', strokeW: 8
        });
        ctx.restore();

        const slots = Save.slots();
        for (const c of cards) {
          const s = slots[c.i];
          const lift = c.hov * 5;
          const x = c.x, y = c.y - lift;
          ctx.save();
          U.shadowOn(ctx, 18 + c.hov * 12, 'rgba(0,0,0,0.35)', 0, 10);
          ctx.fillStyle = s ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)';
          U.roundRect(ctx, x, y, c.w, c.h, 22); ctx.fill();
          U.shadowOff(ctx);
          if (!s) {
            ctx.setLineDash([12, 10]);
            ctx.strokeStyle = 'rgba(60,80,70,0.45)'; ctx.lineWidth = 3;
            U.roundRect(ctx, x + 10, y + 10, c.w - 20, c.h - 20, 16); ctx.stroke();
            ctx.setLineDash([]);
            U.text(ctx, 'ПУСТО', x + c.w / 2, y + 110, { size: 30, color: 'rgba(50,70,60,0.55)', weight: 900 });
            U.text(ctx, 'Слот ' + (c.i + 1), x + c.w / 2, y + 150, { size: 18, color: 'rgba(50,70,60,0.5)', weight: 700 });
          } else {
            // номер слота
            ctx.fillStyle = '#3fbf8f';
            U.roundRect(ctx, x + 14, y + 14, 44, 34, 10); ctx.fill();
            U.text(ctx, String(c.i + 1), x + 36, y + 32, { size: 20, color: '#fff', weight: 900 });
            // живой слизень
            const sl = s.slug;
            SlugArt.draw(ctx, sl, {
              x: x + c.w / 2, y: y + 132, scale: 0.40, t: t + c.i,
              look: { x: U.clamp((App.pointer.x - (x + c.w / 2)) / 400, -1, 1), y: 0 },
              squash: 1 + Math.sin((t + c.i) * 1.8) * 0.03
            });
            U.text(ctx, s.title || SlugModel.title(sl), x + c.w / 2, y + 190, {
              size: 21, color: '#1d2a24', weight: 900, maxWidth: c.w - 30
            });
            const d = new Date(s.savedAt);
            const pad = (n) => String(n).padStart(2, '0');
            U.text(ctx, `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
              x + c.w / 2, y + 214, { size: 15, color: '#5d6a63', weight: 700 });
          }
          ctx.restore();
          c.btns.forEach((b) => b.draw(ctx, t));
          c.saveBtn.draw(ctx, t);
        }

        // текущий слизень
        UI.panel(ctx, App.VW / 2 - 300, 816, 600, 92, 20, 'rgba(16,26,22,0.85)');
        SlugArt.draw(ctx, App.slug, { x: App.VW / 2 - 232, y: 872, scale: 0.24, t, shadow: false });
        U.text(ctx, 'Текущий: ' + SlugModel.title(App.slug), App.VW / 2 + 20, 850, { size: 22, color: '#eafff0', weight: 800, maxWidth: 480 });
        U.text(ctx, 'Нажми на пустой слот, чтобы сохранить', App.VW / 2 + 20, 882, { size: 16, color: '#9fb3aa', weight: 700 });

        back.draw(ctx, t);
      },
      onDown(p) {
        if (back.hit(p)) { Sfx.click(); App.go('hub'); return; }
        if (App.hitMute(p)) return;
        for (const c of cards) {
          if (c.saveBtn.visible && c.saveBtn.hit(p)) { Sfx.click(); doSave(c.i); return; }
          if (c.btns[0].visible) {
            if (c.btns[0].hit(p)) { Sfx.click(); doLoad(c.i); return; }
            if (c.btns[1].hit(p)) { Sfx.click(); doMap(c.i); return; }
            if (c.btns[2].hit(p)) { Sfx.click(); doDelete(c.i); return; }
          }
          // клик по пустой карточке
          if (!Save.slots()[c.i] && p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) {
            Sfx.click(); doSave(c.i); return;
          }
        }
      }
    };
  });
})(window);
