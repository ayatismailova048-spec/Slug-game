/* ============================================================
   stations/index.js — список приборов лаборатории
   ============================================================ */
(function (global) {
  'use strict';
  global.STATIONS = [
    { id: 'blender',  num: 1, name: 'Блендер',   icon: 'blender', color: '#4fbfb0', dark: '#2c8577', desc: 'Изрубит слизня в кашу — будут раны' },
    { id: 'campfire', num: 2, name: 'Костёр',    icon: 'fire',    color: '#e2713a', dark: '#a94718', desc: 'Ожоги, волдыри и копоть' },
    { id: 'acid',     num: 3, name: 'Кислота',   icon: 'acid',    color: '#8bc93a', dark: '#4f8615', desc: 'Растворяет: покажутся кости' },
    { id: 'shower',   num: 4, name: 'Душ',       icon: 'shower',  color: '#3fb0d8', dark: '#1f6f92', desc: 'Смывает копоть, слизень мокрый' },
    { id: 'pills',    num: 5, name: 'Таблетки',  icon: 'pills',   color: '#9a63dd', dark: '#603a95', desc: 'Цветные вены и мутации' },
    { id: 'pan',      num: 6, name: 'Сковорода', icon: 'pan',     color: '#d79a34', dark: '#96631a', desc: 'Масло, жар и хрустящая корочка' },
    { id: 'ice',      num: 7, name: 'Лёд',       icon: 'ice',     color: '#69b8e8', dark: '#35789f', desc: 'Заморозка. На мокром вырастают сосульки' }
  ];
  global.stationById = (id) => global.STATIONS.find((s) => s.id === id);
})(window);
