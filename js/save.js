/* ============================================================
   save.js — сохранения в localStorage: слоты и карта
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'slugLab.save.v2';
  const SLOTS = 24;

  function blank() {
    return { slots: new Array(SLOTS).fill(null), map: [], mapSeen: false };
  }

  let data = null;

  function load() {
    if (data) return data;
    try {
      const raw = localStorage.getItem(KEY);
      data = raw ? JSON.parse(raw) : blank();
      if (!data.slots || data.slots.length !== SLOTS) {
        const old = (data.slots || []).slice(0, SLOTS);
        data.slots = new Array(SLOTS).fill(null);
        old.forEach((s, i) => (data.slots[i] = s));
      }
      if (!Array.isArray(data.map)) data.map = [];
    } catch (e) {
      console.warn('Не удалось прочитать сохранение:', e);
      data = blank();
    }
    return data;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Не удалось сохранить:', e);
      return false;
    }
  }

  function setSlot(i, slug, thumb, name) {
    load();
    const copy = SlugModel.clone(slug);
    if (name) copy.nick = name;
    data.slots[i] = {
      slug: copy,
      name: name || copy.nick || SlugModel.title(slug),
      title: SlugModel.title(slug),
      thumb: thumb || null,
      savedAt: Date.now()
    };
    return persist();
  }

  function renameSlot(i, name) {
    load();
    const sl = data.slots[i];
    if (!sl) return false;
    sl.name = name;
    if (sl.slug) sl.slug.nick = name;
    return persist();
  }

  function getSlot(i) { load(); return data.slots[i]; }
  function clearSlot(i) { load(); data.slots[i] = null; return persist(); }
  function slots() { load(); return data.slots; }

  function mapItems() { load(); return data.map; }
  function mapAdd(slug, x, y) {
    load();
    data.map.push({ slug: SlugModel.clone(slug), x, y, scale: 0.5 + Math.random() * 0.12, flip: Math.random() > 0.5 });
    persist();
    return data.map[data.map.length - 1];
  }
  function mapRemove(idx) { load(); data.map.splice(idx, 1); persist(); }
  function mapSave() { persist(); }
  function mapClear() { load(); data.map = []; persist(); }

  function wipe() { data = blank(); persist(); }

  global.Save = { load, persist, setSlot, renameSlot, getSlot, clearSlot, slots, mapItems, mapAdd, mapRemove, mapSave, mapClear, wipe, SLOTS };
})(window);
