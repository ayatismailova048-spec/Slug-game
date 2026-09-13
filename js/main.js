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
})();
