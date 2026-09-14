/* ============================================================
   main.js — запуск игры
   ============================================================ */
(function () {
  'use strict';
  const boot = document.getElementById('boot');
  const btn = document.getElementById('bootBtn');

  function start() {
    Sfx.init();
    boot.classList.add('hidden');
    setTimeout(() => { boot.style.display = 'none'; }, 500);
    App.start('game', 'title');
  }
  btn.addEventListener('click', start);
  btn.addEventListener('touchend', (e) => { e.preventDefault(); start(); }, { passive: false });

  // автозапуск без звука, если пользователь не нажал (например, при тестах)
  window.__startGame = start;

  /* ---------- установка как приложение ---------- */
  const topLevel = (() => { try { return window.top === window.self; } catch (e) { return false; } })();
  if (topLevel && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('sw:', e));
    });
  }

  const installBtn = document.getElementById('installBtn');
  const INSTALLED_KEY = 'slugLab.installed';

  // приложение уже стоит на телефоне?
  function isInstalled() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) return true;
      if (navigator.standalone === true) return true;               // iOS
      if (document.referrer.indexOf('android-app://') === 0) return true;
      if (localStorage.getItem(INSTALLED_KEY) === '1') return true; // уже ставили раньше
    } catch (e) { /* не важно */ }
    return false;
  }
  window.__slugInstalled = isInstalled;

  function markInstalled() {
    try { localStorage.setItem(INSTALLED_KEY, '1'); } catch (e) { /* не важно */ }
  }
  function hideInstall() {
    if (installBtn) installBtn.classList.add('hidden');
  }

  // запущено из иконки — значит установлено, кнопку больше не показываем никогда
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
