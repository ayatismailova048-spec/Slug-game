/* ============================================================
   stations/base.js — экран-обёртка для приборов + общие помощники
   Никаких надписей: только прибор, слизень и стрелка «назад».
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
    move(p) { if (this.on) this.tw.set(p.x + this.dx, p.y + this.dy); }
    drop() { const was = this.on; this.on = false; return was; }
  };

  /**
   * Держатель слизня: его можно взять где угодно, бросить в прибор
   * и вытащить обратно. Вне прибора слизень просто остаётся там,
   * куда его положили.
   */
  global.Holder = class {
    constructor(home, ground) {
      this.home = home;
      this.ground = ground === undefined ? home.y : ground;
      this.tw = new Room.Tw(home.x, home.y, home.s);
      this.drag = new global.DragSlug(this.tw, 150);
      this.inside = false;
    }
    reset() { this.tw.set(this.home.x, this.home.y, this.home.s); this.inside = false; }
    grab(p) {
      if (this.drag.tryGrab(p)) { this.inside = false; return true; }
      return false;
    }
    move(p) { this.drag.move(p); }
    /** zoneHit(x, y) — попал ли слизень в прибор */
    release(zoneHit, onIn, onOut) {
      if (!this.drag.drop()) return;
      if (zoneHit(this.tw.x, this.tw.y)) {
        this.inside = true;
        if (onIn) onIn();
      } else {
        this.inside = false;
        const x = U.clamp(this.tw.x, 150, App.VW - 150);
        this.tw.to(x, this.ground, this.home.s, 0.35);
        if (onOut) onOut();
      }
    }
    /** пока слизень внутри прибора — прибор сам держит его */
    hold(x, y, s) { if (this.inside && !this.drag.on) this.tw.set(x, y, s); }
    get held() { return this.drag.on; }
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
        back.draw(ctx, App.time);
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
