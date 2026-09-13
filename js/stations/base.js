/* ============================================================
   stations/base.js — экран-обёртка для приборов + общие помощники
   ============================================================ */
(function (global) {
  'use strict';

  global.StationImpl = {};

  /** Помощник перетаскивания слизня мышкой/пальцем */
  global.DragSlug = class {
    constructor(tw, radius = 120) { this.tw = tw; this.radius = radius; this.on = false; this.dx = 0; this.dy = 0; this.enabled = true; }
    tryGrab(p) {
      if (!this.enabled) return false;
      const r = this.radius * this.tw.s;
      if (U.dist(p.x, p.y, this.tw.x, this.tw.y) < r) {
        this.on = true; this.dx = this.tw.x - p.x; this.dy = this.tw.y - p.y;
        this.tw.done = true;
        Sfx.squish(1.2);
        return true;
      }
      return false;
    }
    move(p) { if (this.on) { this.tw.set(p.x + this.dx, p.y + this.dy); } }
    drop() { const was = this.on; this.on = false; return was; }
  };

  App.register('station', function () {
    let impl = null, meta = null;
    const back = Room.makeBackBtn();

    return {
      enter(params) {
        meta = stationById(params.id) || STATIONS[0];
        const f = StationImpl[meta.id];
        impl = f ? f() : null;
        if (impl && impl.enter) impl.enter();
      },
      exit() { if (impl && impl.exit) impl.exit(); Sfx.stopAllLoops(); },
      update(dt) {
        back.update(dt, App.pointer, App.pointer.down);
        if (impl && impl.update) impl.update(dt);
      },
      draw(ctx) {
        if (impl && impl.draw) impl.draw(ctx);
        Room.header(ctx, meta.name, meta.num, meta.color);
        back.draw(ctx, App.time);
        if (!impl || impl.showStatus !== false) Room.status(ctx, App.slug, 26, 794, 450);
      },
      onDown(p) {
        if (back.hit(p)) { Sfx.click(); App.go('hub'); return; }
        if (App.hitMute(p)) return;
        if (impl && impl.onDown) impl.onDown(p);
      },
      onMove(p) { if (impl && impl.onMove) impl.onMove(p); },
      onUp(p) { if (impl && impl.onUp) impl.onUp(p); },
      onKey(e) { if (impl && impl.onKey) impl.onKey(e); }
    };
  });
})(window);
