// ==UserScript==
// @name         GandiLocker 解药
// @namespace    https://github.com/
// @version      1.0
// @description  让GandiLocker无效果
// @author       110200
// @match        *://www.ccw.site/gandi/project/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

var W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

try {
  Object.defineProperty(W, 'outerWidth', {
    get: function () { return W.innerWidth + 60; },
    configurable: true
  });
  Object.defineProperty(W, 'outerHeight', {
    get: function () { return W.innerHeight + 60; },
    configurable: true
  });
} catch (e) {}

try { W.localStorage.removeItem('gandilocker_settings'); } catch (e) {}

function hideInsteadOfRemove() {
  const overlay = W.document.getElementById('gandilocker-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
    overlay.style.visibility = 'hidden';
  }

  W.document.querySelectorAll('div').forEach((el) => {
    if (el.children.length > 0) return;
    const txt = (el.textContent || '').trim();
    if (txt === '想用开发者工具？想得美' || txt === '使用开发者工具？想得美') {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    }
  });
}

setInterval(hideInsteadOfRemove, 500);