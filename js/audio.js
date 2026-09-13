/* ============================================================
   audio.js — весь звук синтезируется через WebAudio.
   Никаких файлов: гул блендера, треск костра, шум воды,
   шипение сковороды, хруст льда и крики слизня.
   ============================================================ */
(function (global) {
  'use strict';

  const A = {
    ctx: null, master: null, ready: false, muted: false,
    loops: {}, noiseBuf: null
  };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.7;
    const comp = A.ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 6; comp.release.value = 0.25;
    A.master.connect(comp); comp.connect(A.ctx.destination);
    // буфер шума 2 сек
    const len = A.ctx.sampleRate * 2;
    const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;      // немного «коричневого» шума
      d[i] = w * 0.7 + last * 3;
    }
    A.noiseBuf = buf;
    A.ready = true;
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.7, A.ctx.currentTime, 0.05);
  };

  const now = () => A.ctx.currentTime;

  function noiseSrc() {
    const s = A.ctx.createBufferSource();
    s.buffer = A.noiseBuf; s.loop = true;
    return s;
  }
  function env(gain, t0, a, d, peak = 1, sus = 0, rel = 0) {
    gain.gain.cancelScheduledValues(t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    if (sus > 0) {
      gain.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0002), t0 + a + d);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d + rel);
    } else {
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    }
  }

  /* ---------- одиночные звуки ---------- */

  A.click = function (p = 1) {
    if (!A.ready) return;
    const t = now();
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(520 * p, t);
    o.frequency.exponentialRampToValueAtTime(190 * p, t + 0.07);
    env(g, t, 0.004, 0.09, 0.12);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.15);
  };

  A.switchSnap = function () {
    if (!A.ready) return;
    const t = now();
    const n = noiseSrc(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 3;
    env(g, t, 0.002, 0.05, 0.22);
    n.connect(f); f.connect(g); g.connect(A.master); n.start(t); n.stop(t + 0.1);
  };

  /** Крик слизня. pain 0..1 — выше боль, выше и злее голос */
  A.scream = function (pain = 0.6, dur = 0.7) {
    if (!A.ready || A.muted) return;
    const t = now();
    const base = 170 + pain * 260;
    const o = A.ctx.createOscillator();
    const o2 = A.ctx.createOscillator();
    const vib = A.ctx.createOscillator(), vibG = A.ctx.createGain();
    const filt = A.ctx.createBiquadFilter();
    const g = A.ctx.createGain();

    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.setValueAtTime(base * 0.7, t);
    o.frequency.exponentialRampToValueAtTime(base * 1.9, t + dur * 0.22);
    o.frequency.exponentialRampToValueAtTime(base * 0.55, t + dur);
    o2.frequency.setValueAtTime(base * 1.42, t);
    o2.frequency.exponentialRampToValueAtTime(base * 0.8, t + dur);

    vib.type = 'sine'; vib.frequency.value = 11 + pain * 9;
    vibG.gain.value = base * 0.18;
    vib.connect(vibG); vibG.connect(o.frequency);

    filt.type = 'bandpass'; filt.Q.value = 2.2;
    filt.frequency.setValueAtTime(600, t);
    filt.frequency.exponentialRampToValueAtTime(1800 + pain * 1400, t + dur * 0.3);
    filt.frequency.exponentialRampToValueAtTime(500, t + dur);

    env(g, t, 0.04, dur * 0.35, 0.22 + pain * 0.16, 0.09, dur * 0.5);

    const o2g = A.ctx.createGain(); o2g.gain.value = 0.35;
    o.connect(filt); o2.connect(o2g); o2g.connect(filt);
    filt.connect(g); g.connect(A.master);
    o.start(t); o2.start(t); vib.start(t);
    o.stop(t + dur + 0.2); o2.stop(t + dur + 0.2); vib.stop(t + dur + 0.2);
  };

  A.squish = function (pitch = 1) {
    if (!A.ready) return;
    const t = now();
    const o = A.ctx.createOscillator(), g = A.ctx.createGain(), f = A.ctx.createBiquadFilter();
    o.type = 'sine';
    o.frequency.setValueAtTime(420 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(90 * pitch, t + 0.22);
    f.type = 'lowpass'; f.frequency.value = 900;
    env(g, t, 0.01, 0.25, 0.2);
    const n = noiseSrc(), nf = A.ctx.createBiquadFilter(), ng = A.ctx.createGain();
    nf.type = 'bandpass'; nf.frequency.value = 420; nf.Q.value = 1.2;
    env(ng, t, 0.01, 0.18, 0.1);
    o.connect(f); f.connect(g); g.connect(A.master);
    n.connect(nf); nf.connect(ng); ng.connect(A.master);
    o.start(t); o.stop(t + 0.4); n.start(t); n.stop(t + 0.3);
  };

  A.splash = function () {
    if (!A.ready) return;
    const t = now();
    const n = noiseSrc(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    env(g, t, 0.005, 0.4, 0.3);
    n.connect(f); f.connect(g); g.connect(A.master); n.start(t); n.stop(t + 0.5);
  };

  A.gulp = function () {
    if (!A.ready) return;
    const t = now();
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.16);
    env(g, t, 0.01, 0.2, 0.3);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.3);
  };

  A.pop = function (p = 1) {
    if (!A.ready) return;
    const t = now();
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(900 * p, t);
    o.frequency.exponentialRampToValueAtTime(200 * p, t + 0.08);
    env(g, t, 0.003, 0.1, 0.18);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.15);
  };

  A.matchStrike = function () {
    if (!A.ready) return;
    const t = now();
    const n = noiseSrc(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 1800;
    env(g, t, 0.01, 0.28, 0.3);
    n.connect(f); f.connect(g); g.connect(A.master); n.start(t); n.stop(t + 0.4);
    // «вспышка»
    setTimeout(() => {
      if (!A.ready) return;
      const t2 = now();
      const n2 = noiseSrc(), f2 = A.ctx.createBiquadFilter(), g2 = A.ctx.createGain();
      f2.type = 'lowpass'; f2.frequency.setValueAtTime(1200, t2);
      f2.frequency.exponentialRampToValueAtTime(200, t2 + 0.5);
      env(g2, t2, 0.02, 0.5, 0.28);
      n2.connect(f2); f2.connect(g2); g2.connect(A.master); n2.start(t2); n2.stop(t2 + 0.7);
    }, 170);
  };

  A.freezeZap = function () {
    if (!A.ready) return;
    const t = now();
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1400, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 1.1);
    env(g, t, 0.02, 1.2, 0.16);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 1.4);
    // хруст
    for (let i = 0; i < 7; i++) {
      const tt = t + 0.15 + i * 0.12 + Math.random() * 0.05;
      const n = noiseSrc(), f = A.ctx.createBiquadFilter(), gg = A.ctx.createGain();
      f.type = 'highpass'; f.frequency.value = 3000 + Math.random() * 3000;
      env(gg, tt, 0.002, 0.05, 0.09);
      n.connect(f); f.connect(gg); gg.connect(A.master); n.start(tt); n.stop(tt + 0.08);
    }
  };

  A.chime = function (up = true) {
    if (!A.ready) return;
    const t = now();
    const notes = up ? [523, 659, 784, 1047] : [784, 659, 523, 392];
    notes.forEach((fr, i) => {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = fr;
      env(g, t + i * 0.075, 0.01, 0.4, 0.13);
      o.connect(g); g.connect(A.master);
      o.start(t + i * 0.075); o.stop(t + i * 0.075 + 0.5);
    });
  };

  A.acidHiss = function () {
    if (!A.ready) return;
    const t = now();
    const n = noiseSrc(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 0.6;
    env(g, t, 0.05, 0.9, 0.16);
    n.connect(f); f.connect(g); g.connect(A.master); n.start(t); n.stop(t + 1.2);
  };

  /* ---------- зацикленные звуки ---------- */

  function makeLoop(name, build) {
    A.loops[name] = { nodes: null, gain: null, build, level: 0 };
  }

  /** on/off с плавным фейдом; level 0..1 громкость/интенсивность */
  A.loop = function (name, on, level = 1) {
    if (!A.ready) return;
    const L = A.loops[name];
    if (!L) return;
    if (on) {
      if (!L.nodes) L.nodes = L.build(A.ctx, A.master);
      L.nodes.set(level);
      L.nodes.gain.gain.setTargetAtTime(L.nodes.baseGain * level, now(), 0.15);
    } else if (L.nodes) {
      L.nodes.gain.gain.setTargetAtTime(0.0001, now(), 0.12);
      const nodes = L.nodes; L.nodes = null;
      setTimeout(() => { try { nodes.stop(); } catch (e) {} }, 600);
    }
  };
  A.stopAllLoops = function () { Object.keys(A.loops).forEach((k) => A.loop(k, false)); };

  makeLoop('fire', (ctx, out) => {
    const n = noiseSrc();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    n.connect(lp); lp.connect(hp); hp.connect(g); g.connect(out);
    n.start();
    // случайные потрескивания
    let alive = true;
    const crackle = () => {
      if (!alive || !A.ready) return;
      const t = now();
      const c = noiseSrc(), cf = ctx.createBiquadFilter(), cg = ctx.createGain();
      cf.type = 'bandpass'; cf.frequency.value = 1800 + Math.random() * 3500; cf.Q.value = 6;
      env(cg, t, 0.002, 0.05 + Math.random() * 0.05, 0.05 + Math.random() * 0.07);
      c.connect(cf); cf.connect(cg); cg.connect(out);
      c.start(t); c.stop(t + 0.12);
      setTimeout(crackle, 90 + Math.random() * 330);
    };
    crackle();
    return {
      gain: g, baseGain: 0.16,
      set: (lv) => { lp.frequency.setTargetAtTime(500 + lv * 900, now(), 0.2); },
      stop: () => { alive = false; n.stop(); }
    };
  });

  makeLoop('water', (ctx, out) => {
    const n = noiseSrc();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.5;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.7; lfoG.gain.value = 400;
    lfo.connect(lfoG); lfoG.connect(bp.frequency); lfo.start();
    n.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out);
    n.start();
    return {
      gain: g, baseGain: 0.15,
      set: (lv) => { hp.frequency.setTargetAtTime(400 + lv * 900, now(), 0.2); },
      stop: () => { n.stop(); lfo.stop(); }
    };
  });

  makeLoop('motor', (ctx, out) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 70;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 141;
    const o2g = ctx.createGain(); o2g.gain.value = 0.25;
    const n = noiseSrc();
    const ng = ctx.createGain(); ng.gain.value = 0.35;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 3;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    o.connect(f); o2.connect(o2g); o2g.connect(f); n.connect(ng); ng.connect(f);
    f.connect(g); g.connect(out);
    o.start(); o2.start(); n.start();
    return {
      gain: g, baseGain: 0.11,
      set: (lv) => {
        o.frequency.setTargetAtTime(55 + lv * 115, now(), 0.25);
        o2.frequency.setTargetAtTime(110 + lv * 250, now(), 0.25);
        f.frequency.setTargetAtTime(800 + lv * 2600, now(), 0.25);
      },
      stop: () => { o.stop(); o2.stop(); n.stop(); }
    };
  });

  makeLoop('sizzle', (ctx, out) => {
    const n = noiseSrc();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3400;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    n.connect(hp); hp.connect(g); g.connect(out); n.start();
    let alive = true;
    const spit = () => {
      if (!alive || !A.ready) return;
      const t = now();
      const c = noiseSrc(), cf = ctx.createBiquadFilter(), cg = ctx.createGain();
      cf.type = 'bandpass'; cf.frequency.value = 4000 + Math.random() * 4000; cf.Q.value = 4;
      env(cg, t, 0.002, 0.04, 0.04 + Math.random() * 0.05);
      c.connect(cf); cf.connect(cg); cg.connect(out); c.start(t); c.stop(t + 0.08);
      setTimeout(spit, 60 + Math.random() * 200);
    };
    spit();
    return {
      gain: g, baseGain: 0.1,
      set: (lv) => { hp.frequency.setTargetAtTime(2500 + lv * 2500, now(), 0.2); },
      stop: () => { alive = false; n.stop(); }
    };
  });

  makeLoop('bubbles', (ctx, out) => {
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.connect(out);
    let alive = true, lv = 1;
    const bub = () => {
      if (!alive || !A.ready) return;
      const t = now();
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine';
      const f0 = 300 + Math.random() * 700;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.06);
      env(og, t, 0.004, 0.08, 0.5);
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.14);
      setTimeout(bub, 40 + Math.random() * 220 / Math.max(lv, 0.2));
    };
    bub();
    return { gain: g, baseGain: 0.12, set: (v) => { lv = v; }, stop: () => { alive = false; } };
  });

  makeLoop('freezer', (ctx, out) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 58;
    const n = noiseSrc();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    const ng = ctx.createGain(); ng.gain.value = 0.5;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    o.connect(g); n.connect(f); f.connect(ng); ng.connect(g); g.connect(out);
    o.start(); n.start();
    return { gain: g, baseGain: 0.13, set: () => {}, stop: () => { o.stop(); n.stop(); } };
  });

  global.Sfx = A;
})(window);
