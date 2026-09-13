/* ============================================================
   slug.js — модель слизня: состояния, эффекты, комбинации
   ============================================================ */
(function (global) {
  'use strict';

  const BASE_COLOR = { h: 104, s: 42, l: 50 };

  const PILLS = {
    violet: { name: 'Фиолетовая', col: { h: 276, s: 72, l: 45 }, effect: 'Щупальца-вены, слизень мутирует' },
    yellow: { name: 'Жёлтая',     col: { h: 44,  s: 92, l: 52 }, effect: 'Раздувает: слизень растёт' },
    blue:   { name: 'Синяя',      col: { h: 224, s: 78, l: 50 }, effect: 'Сжимает: слизень уменьшается' },
    cyan:   { name: 'Голубая',    col: { h: 196, s: 82, l: 55 }, effect: 'Лечит раны и ожоги' }
  };

  function freshEffects() {
    return {
      wounds: 0,    // раны от блендера
      blended: 0,   // деформация от блендера
      burns: 0,     // ожоги (костёр)
      blisters: 0,  // волдыри
      soot: 0,      // копоть
      melt: 0,      // кислота — растворение
      bones: 0,     // видны кости
      wet: 0,       // душ
      clean: 0,     // «блеск чистоты»
      fried: 0,     // сковорода
      crust: 0,     // корочка
      frozen: 0,    // лёд
      iceBlock: 0,  // толстая глыба (мокрый + заморозка)
      steam: 0      // горячий/парящий
    };
  }

  function makeSlug(opts = {}) {
    return {
      id: opts.id || 'slug_' + Math.random().toString(36).slice(2, 9),
      nick: opts.nick || 'Слизень',
      seed: opts.seed !== undefined ? opts.seed : (Math.random() * 1e9) | 0,
      color: opts.color ? { ...opts.color } : { ...BASE_COLOR },
      size: opts.size || 1,
      hp: opts.hp !== undefined ? opts.hp : 100,
      mood: opts.mood !== undefined ? opts.mood : 1,   // 1 счастлив ... 0 ужас
      alive: opts.alive !== undefined ? opts.alive : true,
      fx: Object.assign(freshEffects(), opts.fx || {}),
      pills: (opts.pills || []).slice(),
      history: (opts.history || []).slice(),
      createdAt: opts.createdAt || Date.now()
    };
  }

  /** Применить эффект. amount 0..1 */
  function apply(slug, kind, amount, extra) {
    const f = slug.fx;
    const add = (key, v) => { f[key] = U.clamp(f[key] + v, 0, 1); };
    amount = U.clamp(amount, 0, 1);

    switch (kind) {
      case 'blend':
        add('wounds', amount * 0.95);
        add('blended', amount);
        f.clean = 0;
        slug.hp -= amount * 42;
        slug.mood = Math.min(slug.mood, 0.12);
        // смешение съеденных таблеток — цвет плывёт
        if (slug.pills.length) {
          const p = PILLS[slug.pills[slug.pills.length - 1]];
          slug.color = U.mixHsl(slug.color, p.col, 0.35 * amount);
        }
        break;

      case 'burn':
        add('burns', amount);
        add('blisters', amount * 0.8);
        add('soot', amount * 0.7);
        f.wet = Math.max(0, f.wet - amount * 1.4);
        f.frozen = Math.max(0, f.frozen - amount * 2);
        f.iceBlock = Math.max(0, f.iceBlock - amount * 2);
        add('steam', f.wet > 0.2 ? 0.6 : 0.2);
        slug.hp -= amount * 35;
        slug.mood = Math.min(slug.mood, 0.1);
        break;

      case 'acid':
        add('melt', amount);
        add('bones', amount * 0.9);
        f.clean = 0;
        slug.hp -= amount * 45;
        slug.mood = Math.min(slug.mood, 0.08);
        break;

      case 'shower':
        add('wet', amount);
        add('clean', amount);
        f.soot = Math.max(0, f.soot - amount * 1.6);
        f.wounds = Math.max(0, f.wounds - amount * 0.25);
        f.frozen = Math.max(0, f.frozen - amount * 0.8);
        f.iceBlock = Math.max(0, f.iceBlock - amount * 0.8);
        slug.mood = Math.min(1, slug.mood + amount * 0.45);
        slug.hp = Math.min(100, slug.hp + amount * 6);
        if (extra && extra.hot) add('steam', amount * 0.8);
        break;

      case 'pill': {
        const key = extra && extra.pill;
        const p = PILLS[key];
        if (!p) break;
        slug.pills.push(key);
        slug.color = U.mixHsl(slug.color, p.col, 0.22);
        if (key === 'yellow') slug.size = U.clamp(slug.size * 1.18, 0.55, 1.85);
        if (key === 'blue') slug.size = U.clamp(slug.size * 0.85, 0.55, 1.85);
        if (key === 'cyan') {
          f.wounds = Math.max(0, f.wounds - 0.55);
          f.burns = Math.max(0, f.burns - 0.5);
          f.blisters = Math.max(0, f.blisters - 0.6);
          f.melt = Math.max(0, f.melt - 0.35);
          f.bones = Math.max(0, f.bones - 0.35);
          slug.hp = Math.min(100, slug.hp + 30);
          slug.mood = Math.min(1, slug.mood + 0.4);
        }
        if (key === 'violet') slug.mood = Math.max(0.2, slug.mood - 0.2);
        break;
      }

      case 'fry':
        add('fried', amount);
        add('crust', amount * 0.9);
        f.wet = Math.max(0, f.wet - amount * 1.5);
        f.frozen = Math.max(0, f.frozen - amount * 2);
        f.iceBlock = Math.max(0, f.iceBlock - amount * 2);
        if (amount > 0.75) add('burns', (amount - 0.75) * 2);
        slug.hp -= amount * 30;
        slug.mood = Math.min(slug.mood, 0.15);
        break;

      case 'freeze':
        add('frozen', amount);
        if (f.wet > 0.4) add('iceBlock', amount * (0.6 + f.wet * 0.5));
        f.steam = 0;
        f.fried = Math.max(0, f.fried - amount * 0.2);
        slug.hp -= amount * 18;
        slug.mood = Math.min(slug.mood, 0.25);
        break;
    }

    slug.hp = U.clamp(slug.hp, 0, 100);
    slug.mood = U.clamp(slug.mood, 0, 1);
    slug.alive = slug.hp > 0;
    const last = slug.history[slug.history.length - 1];
    if (last !== kind) slug.history.push(kind);
    return slug;
  }

  /** Название состояния по комбинации эффектов */
  function title(slug) {
    const f = slug.fx;
    const has = (k, v = 0.25) => f[k] >= v;

    if (has('iceBlock', 0.4)) return 'Слизень во льду';
    if (has('frozen', 0.5) && has('fried', 0.4)) return 'Мороженое в панировке';
    if (has('frozen', 0.5)) return 'Замороженный слизень';
    if (has('bones', 0.6) && has('burns', 0.4)) return 'Обугленный скелет';
    if (has('bones', 0.5)) return 'Слизень-скелет';
    if (has('wounds', 0.5) && has('fried', 0.45)) return 'Котлета по-слизнячьи';
    if (has('fried', 0.7)) return 'Хрустящий слизень';
    if (has('fried', 0.3)) return 'Жареный слизень';
    if (has('burns', 0.6)) return 'Угольный слизень';
    if (has('burns', 0.25)) return 'Подгоревший слизень';
    if (has('melt', 0.3)) return 'Подтаявший слизень';
    if (has('wounds', 0.5) && slug.pills.length >= 2) return 'Радужный смузи';
    if (has('wounds', 0.45)) return 'Израненный слизень';
    if (slug.pills.length >= 3) return 'Экспериментальный слизень';
    if (slug.pills.length >= 1) return 'Слизень под таблетками';
    if (has('wet', 0.5) && has('clean', 0.5)) return 'Чистый слизень';
    if (has('wet', 0.3)) return 'Мокрый слизень';
    return 'Обычный слизень';
  }

  /** Короткий список активных эффектов для интерфейса */
  function badges(slug) {
    const f = slug.fx, out = [];
    const push = (cond, label, color) => { if (cond) out.push({ label, color }); };
    push(f.wounds > 0.15, 'Раны', '#d2413a');
    push(f.burns > 0.15, 'Ожоги', '#8a4a20');
    push(f.blisters > 0.2, 'Волдыри', '#e8b79a');
    push(f.soot > 0.2, 'Копоть', '#3a3a3a');
    push(f.melt > 0.15, 'Растворён', '#7ddc3a');
    push(f.bones > 0.25, 'Видны кости', '#f2e7d5');
    push(f.wet > 0.2, 'Мокрый', '#4aa8e0');
    push(f.fried > 0.15, 'Жареный', '#c2661f');
    push(f.crust > 0.3, 'Корочка', '#8e4a12');
    push(f.frozen > 0.15, 'Заморожен', '#9fd8f2');
    push(f.iceBlock > 0.25, 'В глыбе льда', '#bfeaff');
    slug.pills.forEach((p) => out.push({ label: PILLS[p].name.toLowerCase(), color: U.colStr(PILLS[p].col) }));
    return out;
  }

  /** «Боль» — насколько слизню плохо прямо сейчас (0..1) */
  function pain(slug) {
    const f = slug.fx;
    return U.clamp(f.wounds * 0.9 + f.burns * 0.8 + f.melt * 0.9 + f.fried * 0.7 + f.frozen * 0.4, 0, 1);
  }

  function clone(slug) { return JSON.parse(JSON.stringify(slug)); }

  function reset(slug) {
    const s = makeSlug({ nick: slug ? slug.nick : 'Слизень' });
    return s;
  }

  global.SlugModel = { makeSlug, apply, title, badges, pain, clone, reset, PILLS, BASE_COLOR, freshEffects };
})(window);
