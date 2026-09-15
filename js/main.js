/* ============================================================
   main.js — запуск игры
   ============================================================ */
(function () {
  'use strict';
  let started = false;

  function start() {
    if (started) return;
    started = true;
    Sfx.init();
    App.start('game', 'title');
    // игра готова — экран загрузки уходит, доиграв свою анимацию
    if (window.SlugLoader) window.SlugLoader.done();
  }
  window.__startGame = start;

  // игра запускается сразу, поверх неё крутится экран загрузки
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // звук включится сам при первом касании — браузер не даёт включить его раньше
  function unlockAudio() {
    Sfx.init();
    try { if (Sfx.ctx && Sfx.ctx.state === 'suspended') Sfx.ctx.resume(); } catch (e) { /* не важно */ }
  }
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, unlockAudio, { passive: true });
  });

  /* ---------- установка как приложение ---------- */
  const topLevel = (() => { try { return window.top === window.self; } catch (e) { return false; } })();
  if (topLevel && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // если приедет новая версия — перезагрузить страницу один раз
    let reloading = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => { try { reg.update(); } catch (e) { /* не важно */ } })
        .catch((e) => console.warn('sw:', e));
    });
  }

  const installBtn = document.getElementById('installBtn');
  const INSTALLED_KEY = 'slugLab.installed';

  // приложение уже стоит на телефоне?
  // игра открыта из иконки, в окне приложения
  function isStandalone() {
    try {
      if (window.matchMedia) {
        if (window.matchMedia('(display-mode: standalone)').matches) return true;
        if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
        if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
      }
      if (navigator.standalone === true) return true;               // iOS
      if (document.referrer.indexOf('android-app://') === 0) return true;
    } catch (e) { /* не важно */ }
    return false;
  }
  // приложение вообще стоит на телефоне (даже если открыли во вкладке браузера)
  function isInstalled() {
    if (isStandalone()) return true;
    try {
      if (localStorage.getItem(INSTALLED_KEY) === '1') return true;
    } catch (e) { /* не важно */ }
    return false;
  }
  window.__slugStandalone = isStandalone;
  window.__slugInstalled = isInstalled;

  function markInstalled() {
    try { localStorage.setItem(INSTALLED_KEY, '1'); } catch (e) { /* не важно */ }
  }
  function hideInstall() {
    if (installBtn) installBtn.classList.add('hidden');
  }

  // запущено из иконки — значит установлено, кнопку больше не показываем
  if (isInstalled()) { markInstalled(); hideInstall(); }

  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    if (isInstalled()) { hideInstall(); return; }
    deferred = e;
    if (installBtn) installBtn.classList.remove('hidden');
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferred) { hideInstall(); return; }
      hideInstall();
      deferred.prompt();
      try {
        const res = await deferred.userChoice;
        if (res && res.outcome === 'accepted') markInstalled();
      } catch (e) { /* не важно */ }
      deferred = null;
    });
  }
  window.addEventListener('appinstalled', () => {
    deferred = null;
    markInstalled();
    hideInstall();
  });

  // если приложение открыли в окне-приложении уже после запуска
  try {
    if (window.matchMedia) {
      window.matchMedia('(display-mode: standalone)').addEventListener('change', (ev) => {
        if (ev.matches) { markInstalled(); hideInstall(); }
      });
    }
  } catch (e) { /* не важно */ }
})();
