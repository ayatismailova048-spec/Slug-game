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
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (installBtn) installBtn.classList.remove('hidden');
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferred) { installBtn.classList.add('hidden'); return; }
      installBtn.classList.add('hidden');
      deferred.prompt();
      try { await deferred.userChoice; } catch (e) { /* не важно */ }
      deferred = null;
    });
  }
  window.addEventListener('appinstalled', () => {
    deferred = null;
    if (installBtn) installBtn.classList.add('hidden');
  });
})();
