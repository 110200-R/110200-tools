// ==UserScript==
// @name         smesm666
// @namespace    https://smesm666.local
// @version      2.0.0
// @description  角色/变量/消息/扩展/下载/水印/主题/背景/CSS/拖拽
// @author       smesm666
// @match        *://turbowarp.org/*
// @match        *://*.turbowarp.org/*
// @match        *://ccw.site/*
// @match        *://*.ccw.site/*
// @match        *://editors.astras.top/*
// @match        *://*.astras.top/*
// @match        *://com.bilup.org/*
// @match        *://*.bilup.org/*
// @match        *://omniblocks.org/*
// @match        *://*.omniblocks.org/*
// @match        *://scratch.mit.edu/*
// @match        *://*.penguinmod.com/*
// @match        *://*.cocrea.world/*
// @match        *://*.gandi.net/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(async function () {
  'use strict';

  /* ============================================================
   *  0. 常量
   * ============================================================ */
  const VERSION = '2.0.0';
  const KERNEL  = 'core';
  const KEY     = 'smesm666-settings';

  const HOST_WHITELIST = [
    'turbowarp.org','ccw.site','editors.astras.top','astras.top',
    'com.bilup.org','bilup.org','omniblocks.org',
    'scratch.mit.edu','penguinmod.com','cocrea.world','gandi.net'
  ];
  const inWhitelist = h => {
    h = h || location.hostname || '';
    return HOST_WHITELIST.some(w => h === w || h.endsWith('.' + w));
  };

  /* ============================================================
   *  1. 通用工具
   * ============================================================ */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const esc = s => String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const safe = s => String(s).replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);

  const fmtSize = b => {
    if (b == null || b < 0) return '-';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  };
  const fmtTime = s => {
    if (!isFinite(s) || s < 0) s = 0;
    return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  };
  const fmtHit = n => {
    n = n || 0;
    if (n < 10000) return String(n);
    if (n < 1e8) return (n / 1e4).toFixed(n < 1e5 ? 1 : 0) + '万';
    return (n / 1e8).toFixed(1) + '亿';
  };

  const toBlob = uri => {
    const [h, d] = uri.split(',');
    const mime = (h.match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    const bin = atob(d);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };
  const blobToB64 = blob => new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result.split(',')[1]);
    fr.readAsDataURL(blob);
  });
  const download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  /* 图标 */
  const ICONS = {
    sprite:   '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.3" fill="currentColor" stroke="none"/><path d="M8.5 15.5c1 1.4 2.3 2 3.5 2s2.5-.6 3.5-2"/>',
    variable: '<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5 3.5 16.5z"/><path d="M3.5 7.5L12 11.5l8.5-4"/><path d="M12 11.5v9"/>',
    message:  '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M8.6 8.6a4.8 4.8 0 000 6.8"/><path d="M15.4 8.6a4.8 4.8 0 010 6.8"/><path d="M5.8 5.8a8.8 8.8 0 000 12.4"/><path d="M18.2 5.8a8.8 8.8 0 010 12.4"/>',
    puzzle:   '<path d="M9.5 3.5H6a2.5 2.5 0 00-2.5 2.5V9c0 1.2-1.4 1.6-2 .7-.4-.6-.1-1.6.7-1.9 1.2-.5 1.3-2.2 0-2.8-.8-.4-1.1-1.3-.7-1.9.6-.9 2-.5 2 .7z"/><path d="M9.5 3.5h3.5V10h8.5"/><path d="M21.5 10v4.5a2.5 2.5 0 01-2.5 2.5H15"/><path d="M15 17h-4v-7H3.5"/>',
    image:    '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17.5l4.5-4.5 3.5 3.5 3-3 5 5"/>',
    upload:   '<path d="M12 16.5V4.5"/><path d="M7.5 9L12 4.5 16.5 9"/><path d="M4.5 15v3.5a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5V15"/>',
    download: '<path d="M12 4.5v12"/><path d="M7.5 12L12 16.5 16.5 12"/><path d="M4.5 15v3.5a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5V15"/>',
    gear:     '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.2 2.2M16.5 16.5l2.2 2.2M18.7 5.3l-2.2 2.2M7.5 16.5l-2.2 2.2"/>',
    info:     '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/>',
    music:    '<path d="M9.5 17.5V6.2l9-1.7v10.8"/><circle cx="7" cy="17.5" r="2.3"/><circle cx="16" cy="15.3" r="2.3"/>',
    pen:      '<path d="M16.5 3.8l3.7 3.7L8.7 19H5v-3.7z"/><path d="M14.5 5.8l3.7 3.7"/>',
    globe:    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.6 5 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5-3.6-8.5S9.6 5.8 12 3.5z"/>',
    video:    '<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="M15.5 11l5.5-3v8l-5.5-3z"/>',
    speech:   '<path d="M20.5 12.5c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 21l1.4-3.6C4.2 16.2 3.5 14.4 3.5 12.5 3.5 8.5 7.3 5.3 12 5.3s8.5 3.2 8.5 7.2z"/><path d="M8.5 11.5h7M8.5 14.5h4"/>',
    chip:     '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 6.5V3.5M15 6.5V3.5M9 20.5v-3M15 20.5v-3M6.5 9H3.5M6.5 15H3.5M20.5 9h-3M20.5 15h-3"/>',
    flask:    '<path d="M9.5 3.5v6L4.8 17.6A2 2 0 006.5 20.5h11a2 2 0 001.7-2.9L14.5 9.5v-6"/><path d="M8 3.5h8"/><path d="M7.3 14.5h9.4"/>',
    clipboard:'<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3.2A1.2 1.2 0 0110.2 2h3.6A1.2 1.2 0 0115 3.2v1.3"/><path d="M9 10h6M9 14h6M9 18h3.5"/>',
    edit:     '<path d="M4 20h4.2L20 8.2a2.1 2.1 0 00-3-3L5.5 17z"/><path d="M15.5 5.5l3 3"/>',
    trash:    '<path d="M4.5 7h15"/><path d="M9.5 7V4.8A1.3 1.3 0 0110.8 3.5h2.4A1.3 1.3 0 0114.5 4.8V7"/><path d="M6.5 7l1 12.2a1.6 1.6 0 001.6 1.5h6.8a1.6 1.6 0 001.6-1.5L18.5 7"/>',
    check:    '<path d="M4.5 12.5l5 5 10-11"/>',
    lock:     '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.2 10.5V7.8a3.8 3.8 0 017.6 0v2.7"/>',
    unlock:   '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.2 10.5V7.8a3.8 3.8 0 016.6-2.5"/>',
    file:     '<path d="M6 3.5h7.5L19 8.5V19a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19V5a1.5 1.5 0 011.5-1.5z"/><path d="M13.5 3.5V9H19"/>',
    save:     '<path d="M5 5.5A1.5 1.5 0 016.5 4h9L20 8.5v10A1.5 1.5 0 0118.5 20h-12A1.5 1.5 0 015 18.5z"/><path d="M8.5 4v5.5h7V4.5"/><rect x="8" y="13" width="8" height="7"/>',
    folder:   '<path d="M3.5 6.5A1.5 1.5 0 015 5h4l2 2.5h8A1.5 1.5 0 0120.5 9v8.5A1.5 1.5 0 0119 19H5a1.5 1.5 0 01-1.5-1.5z"/>',
    close:    '<path d="M6 6l12 12M18 6L6 18"/>',
    arrowdown:'<path d="M12 4.5v15"/><path d="M6.5 13.5L12 19l5.5-5.5"/>',
    arrowleft:'<path d="M19 12H5"/><path d="M10.5 6.5L5 12l5.5 5.5"/>',
    menu:     '<path d="M4 7h16M4 12h16M4 17h16"/>',
    warn:     '<path d="M12 4l8.5 15H3.5z"/><path d="M12 10v4"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',
    plus:     '<path d="M12 5v14"/><path d="M5 12h14"/>',
    layers:   '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    stage:    '<path d="M3.5 17.5h17"/><path d="M5.5 17.5V8l6.5-4 6.5 4v9.5"/><path d="M9 17.5v-4.5h6v4.5"/>'
  };
  const ic = (name, size) => {
    const d = ICONS[name] || ICONS.info;
    const sz = size ? ` width="${size}" height="${size}"` : '';
    return `<svg class="st-ic"${sz} viewBox="0 0 24 24">${d}</svg>`;
  };

  /* ============================================================
   *  2. VM 层（统一访问入口）
   * ============================================================ */
  const VM = (() => {
    let vm = null, src = '', ready = false;
    const listeners = new Set();

    const targetLike = t => {
      if (!t || typeof t !== 'object') return false;
      if (t.isStage === true) return true;
      try {
        if (t.sprite && Array.isArray(t.sprite.costumes)) return true;
        if (t.blocks && t.blocks._blocks) return true;
      } catch (e) {}
      return false;
    };

    const core = o => {
      try {
        const rt = o && o.runtime;
        if (!rt || !Array.isArray(rt.targets) || !rt.targets.length) return false;
        if (!rt.targets.some(targetLike)) return false;
        return typeof o.saveProjectSb3 === 'function'
            || typeof o.toJSON === 'function'
            || typeof rt.getTargetForStage === 'function';
      } catch (e) { return false; }
    };

    const score = o => {
      let s = 0;
      try {
        const rt = o.runtime, ts = rt.targets;
        if (ts.some(t => t && t.isStage)) s += 2;
        if (ts.some(t => t && t.sprite && Array.isArray(t.sprite.costumes))) s += 2;
        if (ts.some(t => t && t.blocks && t.blocks._blocks)) s += 2;
        if (typeof rt.getTargetForStage === 'function') s += 1;
        if (typeof rt.dispose === 'function') s += 1;
        if (rt.ioDevices) s += 1;
        if (typeof rt.start === 'function' || typeof rt.startHats === 'function') s += 1;
        if (typeof rt.on === 'function' || rt._events) s += 1;
        if (typeof o.saveProjectSb3 === 'function') s += 1;
      } catch (e) {}
      return s;
    };

    const domSignals = () => {
      let n = 0;
      try {
        if (document.querySelector('canvas')) n++;
        if (document.querySelector('.injectionDiv,[class*=injectionDiv]')) n++;
        if (document.querySelector('[class*=stage_wrapper],.stage,[class*=gui_stage]')) n++;
        if (document.querySelector('[class*=blockly],[class*=blocks_]')) n++;
      } catch (e) {}
      try {
        const B = window.Blockly && window.Blockly.Blocks;
        if (B && Object.keys(B).some(k => /^(motion|looks|sound|events|control|sensing|operators|data)_/.test(k))) n += 2;
      } catch (e) {}
      return n;
    };

    const looksLike = (o, deep) => {
      if (!core(o)) return false;
      return score(o) + domSignals() >= (deep ? 6 : 4);
    };

    const unwrap = (o, deep) => {
      if (!o || typeof o !== 'object') return null;
      if (looksLike(o, deep)) return o;
      for (const k of ['vm','VM','runtime']) {
        try { if (looksLike(o[k], deep)) return o[k]; } catch (e) {}
      }
      return null;
    };

    const DIRECT = ['vm','VM','Vm','scratchVM','scratch_vm','scratchVm','_vm','vmInstance','virtualMachine','runtime','scratchRuntime','projectVM'];
    const NS = ['Scratch','scratch','scratchGui','ScratchGUI','GUI','gui','app','APP','__scratch','turbowarp','TurboWarp','pm','PenguinMod','gandi','Gandi','GANDI','ccw','CCW','cocrea','Cocrea','editor','Editor','workspace','blockly'];

    const isNonEditor = () => {
      try {
        const host = location.hostname || '';
        const p = location.pathname || '';
        if (/^(\w+\.)?scratch\.mit\.edu$/.test(host)) {
          if (!/\/projects\/\d+(\/editor)?\/?$/.test(p) && !/\/projects\/\d+\/fullscreen/.test(p)) return true;
        }
        return false;
      } catch (e) { return false; }
    };

    const scan = () => {
      if (isNonEditor()) return null;
      const seen = new Set();
      const chk = (o, s, deep) => {
        if (!o || typeof o !== 'object' || seen.has(o)) return null;
        seen.add(o);
        const v = unwrap(o, deep);
        return v ? { vm: v, src: s } : null;
      };
      for (const k of DIRECT) { try { const r = chk(window[k], 'window.' + k, false); if (r) return r; } catch (e) {} }
      for (const n of NS) {
        let ns; try { ns = window[n]; } catch (e) { continue; }
        if (!ns || typeof ns !== 'object') continue;
        const r0 = chk(ns, n, false); if (r0) return r0;
        let keys = []; try { keys = Object.keys(ns); } catch (e) {}
        for (const k of keys.slice(0, 60)) {
          let v; try { v = ns[k]; } catch (e) { continue; }
          if (v && typeof v === 'function') continue;
          const r = chk(v, n + '.' + k, false); if (r) return r;
        }
      }
      let wk = []; try { wk = Object.keys(window); } catch (e) {}
      for (const k of wk.slice(0, 1200)) {
        if (k.startsWith('webpack') || k.startsWith('_')) continue;
        let v; try { v = window[k]; } catch (e) { continue; }
        if (!v || typeof v !== 'object') continue;
        const r = chk(v, 'window.' + k, true); if (r) return r;
        let k2 = []; try { k2 = Object.keys(v); } catch (e) {}
        for (const kk of k2.slice(0, 40)) {
          let vv; try { vv = v[kk]; } catch (e) { continue; }
          if (!vv || typeof vv !== 'object') continue;
          const r2 = chk(vv, 'window.' + k + '.' + kk, true); if (r2) return r2;
        }
      }
      try {
        const frs = document.querySelectorAll('iframe');
        for (let i = 0; i < frs.length && i < 8; i++) {
          let w; try { w = frs[i].contentWindow; } catch (e) { continue; }
          if (!w) continue;
          for (const k of DIRECT) {
            let v; try { v = w[k]; } catch (e) { continue; }
            const r = chk(v, 'iframe.' + k, true); if (r) return r;
          }
        }
      } catch (e) {}
      try {
        const roots = document.querySelectorAll('#app,.app,#root,.gui,.stage_wrapper,.editor,[class*=gui],[class*=editor]');
        for (let i = 0; i < roots.length && i < 12; i++) {
          const el = roots[i];
          for (const fk of Object.keys(el)) {
            if (!fk.startsWith('__reactInternalInstance') && !fk.startsWith('__reactFiber') && fk !== '__vue__' && fk !== '_vnode') continue;
            let node = el[fk];
            for (let d = 0; node && d < 12; d++) {
              const cand = node.stateNode || node.memoizedProps || node.props;
              const r = chk(cand && cand.vm, 'react.vm', true) || chk(cand, 'react.props', true);
              if (r) return r;
              node = node.return || node.parent;
            }
          }
        }
      } catch (e) {}
      return null;
    };

    const detect = () => {
      if (vm && vm.runtime && Array.isArray(vm.runtime.targets)) return vm;
      const r = scan();
      if (r) { vm = r.vm; src = r.src; }
      return vm;
    };

    const reset = () => { vm = null; src = ''; };

    const onReady = fn => { if (ready) { fn(); return; } listeners.add(fn); };
    const fireReady = () => {
      if (ready) return;
      ready = true;
      listeners.forEach(fn => { try { fn(); } catch (e) {} });
      listeners.clear();
    };

    /* 事件订阅：VM 结构变化 */
    const bus = new Set();
    const emit = () => bus.forEach(fn => { try { fn(); } catch (e) {} });
    const on = fn => { bus.add(fn); return () => bus.delete(fn); };

    const bindEvents = () => {
      const v = detect();
      if (!v) return false;
      try {
        if (v.runtime && typeof v.runtime.on === 'function') {
          ['targetsUpdate','PROJECT_CHANGED','PROJECT_LOADED','workspaceUpdate']
            .forEach(ev => { try { v.runtime.on(ev, emit); } catch (e) {} });
        }
        if (typeof v.on === 'function') {
          ['targetsUpdate','PROJECT_CHANGED','PROJECT_LOADED']
            .forEach(ev => { try { v.on(ev, emit); } catch (e) {} });
        }
      } catch (e) {}
      return true;
    };

    return {
      get: detect,
      reset,
      source: () => src || (vm ? 'fallback' : ''),
      score: () => (vm ? score(vm) : 0),
      domSignals,
      isNonEditor,
      onReady,
      fireReady,
      bindEvents,
      on,
      emit,
      ready: () => ready
    };
  })();

  const getVM = () => VM.get();
  const allTargets = () => { const v = getVM(); return v ? v.runtime.targets : []; };
  const spritesOnly = () => allTargets().filter(t => !t.isStage);
  const getTarget = id => allTargets().find(t => t.id === id);
  const blockCount = t => (t.blocks ? Object.keys(t.blocks._blocks).length : 0);

  /* ============================================================
   *  3. 设置
   * ============================================================ */
  const settings = Object.assign({
    theme: 'blue',
    bg: 'none', bgImage: '', bgFit: 'cover', bgPos: 'center', bgSize: 100,
    alpha: 96, blur: 12, css: '',
    wmText: 'smesm666', wmOn: false, wmRotate: 0, wmOpacity: 25, wmSize: 28, wmColor: '#ffffff', wmImg: '',
    pos: null, size: null, maximized: false,
    holdMs: 240, moveTh: 5, snap: true, showTip: true, sidebarCollapsed: false,
    mobile: 'auto', glass: 'off', paint: false,
    tools: { terminal: false, threads: false }
  }, JSON.parse(localStorage.getItem(KEY) || '{}'));
  const save = () => localStorage.setItem(KEY, JSON.stringify(settings));

  /* ============================================================
   *  4. 主题 / 外观
   * ============================================================ */
  const THEMES = {
    blue:   ['#3b82f6', '#2563eb'],
    cyan:   ['#06b6d4', '#0891b2'],
    green:  ['#10b981', '#059669'],
    amber:  ['#f59e0b', '#d97706'],
    rose:   ['#f43f5e', '#e11d48'],
    violet: ['#8b5cf6', '#7c3aed'],
    gray:   ['#6b7280', '#4b5563']
  };
  const BG_PRESETS = {
    none:'none',
    deepspace:'linear-gradient(135deg,#0b1026,#2a0d45)',
    starry:'radial-gradient(circle at 25% 30%,rgba(124,58,237,.55),transparent 55%),radial-gradient(circle at 75% 70%,rgba(37,99,235,.5),transparent 55%),linear-gradient(160deg,#070a18,#120b25)',
    deepsea:'linear-gradient(180deg,#0b2a4a,#0e7490)',
    sunset:'linear-gradient(135deg,#7e22ce,#3b0764)',
    forest:'linear-gradient(135deg,#12331f,#0b2417)',
    aurora:'radial-gradient(ellipse at 20% 10%,rgba(16,185,129,.45),transparent 60%),radial-gradient(ellipse at 85% 90%,rgba(124,58,237,.45),transparent 60%),linear-gradient(140deg,#041b2e,#0c3d3a 55%,#10202b)',
    candy:'radial-gradient(circle at 15% 25%,rgba(236,72,153,.5),transparent 50%),radial-gradient(circle at 85% 75%,rgba(168,85,247,.5),transparent 50%),linear-gradient(135deg,#3b0764,#831843 60%,#4c0519)',
    cyber:'radial-gradient(circle at 50% 0%,rgba(56,189,248,.35),transparent 55%),linear-gradient(170deg,#05060f,#1a0b2e 60%,#06070f)',
    monochrome:'linear-gradient(135deg,#1f2937,#374151 45%,#111827)'
  };
  const BG_NAMES = { none:'无', deepspace:'深空', starry:'星空', deepsea:'深海', sunset:'晚霞',
    forest:'森林', aurora:'极光', candy:'糖果', cyber:'赛博', monochrome:'石墨' };

  const applyTheme = n => {
    const t = THEMES[n] || THEMES.blue;
    const r = document.documentElement.style;
    r.setProperty('--st-primary', t[0]);
    r.setProperty('--st-secondary', t[1]);
    settings.theme = n; save();
  };

  const applyGlass = () => {
    const g = settings.glass || 'off';
    const roots = [panel];
    try { Win.list.forEach(w => { if (w && w.el) roots.push(w.el); }); } catch (e) {}
    roots.forEach(el => {
      if (!el) return;
      el.classList.remove('st-glass-off', 'st-liquid');
      if (g === 'off') el.classList.add('st-glass-off');
      else if (g === 'liquid') el.classList.add('st-liquid');
    });
  };

  const applyLook = () => {
    const r = document.documentElement.style;
    r.setProperty('--st-blur', settings.blur + 'px');
    if (settings.glass === 'liquid') r.setProperty('--st-blur', '24px');
    r.setProperty('--st-alpha', (settings.alpha / 100).toFixed(2));

    const bg = $('.st-bg');
    if (bg) {
      if (settings.bg === 'custom' && settings.bgImage) {
        bg.style.backgroundImage = `url(${settings.bgImage})`;
        bg.style.backgroundRepeat = settings.bgFit === 'repeat' ? 'repeat' : 'no-repeat';
        bg.style.backgroundSize = settings.bgFit === 'stretch' ? '100% 100%'
          : (settings.bgFit === 'contain' || settings.bgFit === 'cover') ? settings.bgFit
          : settings.bgSize + '% auto';
        bg.style.backgroundPosition = settings.bgPos;
        bg.style.opacity = (settings.alpha / 100).toFixed(2);
      } else if (settings.bg === 'none') {
        bg.style.background = 'none'; bg.style.opacity = '0';
      } else {
        bg.style.backgroundImage = 'none';
        bg.style.background = BG_PRESETS[settings.bg] || 'none';
        bg.style.opacity = (settings.alpha / 100).toFixed(2);
      }
    }

    let cs = $('#st-custom-css');
    if (!cs) { cs = document.createElement('style'); cs.id = 'st-custom-css'; document.head.appendChild(cs); }
    cs.textContent = settings.css
      ? settings.css.split('}').filter(Boolean).map(x => `.st-panel ${x}}\n.st-win ${x}}`).join('\n')
      : '';
  };

  /* ============================================================
   *  5. 样式
   * ============================================================ */
  const styleEl = document.createElement('style');
  styleEl.textContent = `
  :root{--st-primary:#3b82f6;--st-secondary:#2563eb;--st-blur:12px;--st-alpha:.96}
  .st-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:46px;height:46px;border-radius:10px;
    background:#1f1f23;color:#e6e6e8;font:700 13px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.3px;
    display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;
    border:1px solid #35353c;box-shadow:0 2px 12px rgba(0,0,0,.4);transition:background .15s,border-color .15s}
  .st-fab:hover{background:#2a2a30;border-color:#45454d}
  .st-fab:active{transform:scale(.96)}
  .st-panel{position:fixed;z-index:2147483001;min-width:520px;min-height:340px;display:none;
    border-radius:10px;overflow:hidden;border:1px solid #2e2e34;
    background:rgba(24,24,26,var(--st-alpha));backdrop-filter:blur(var(--st-blur));
    -webkit-backdrop-filter:blur(var(--st-blur));box-shadow:0 16px 48px rgba(0,0,0,.6);color:#e6e6e8;
    font:13.5px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
    user-select:none;-webkit-user-drag:none;resize:none}
  .st-panel input[type=text],.st-panel input[type=search],.st-panel input[type=password],
  .st-panel input[type=number],.st-panel input:not([type]),.st-panel textarea{user-select:text;-webkit-user-select:text}
  .st-panel.selectable,.st-panel.selectable *{user-select:text;-webkit-user-select:text}
  .st-bg{position:absolute;inset:0;z-index:0;pointer-events:none;transition:opacity .3s}
  .st-bg::after{content:'';position:absolute;inset:0}
  .st-glow,.st-edge{display:none}
  .st-bar{position:relative;z-index:6;height:40px;cursor:grab;display:flex;align-items:center;gap:8px;padding:0 12px;
    background:#1e1e20;border-bottom:1px solid #2a2a2e;font-size:13px;color:#8a8a90;user-select:none;touch-action:none}
  .st-bar:active{cursor:grabbing}
  .st-logo{font:700 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.4px;color:#e6e6e8;cursor:pointer;
    padding:5px 9px;border-radius:6px;background:#28282c;border:1px solid #35353c;transition:background .12s}
  .st-logo:hover{background:#32323a}
  .st-close{margin-left:auto;cursor:pointer;padding:5px;border-radius:6px;color:#8a8a90;display:flex;align-items:center;
    position:relative;z-index:34;transition:color .12s,background .12s}
  .st-close:hover{color:#e6e6e8;background:#2a2a2e}
  .st-close .st-ic{width:15px;height:15px}
  .st-sidebar{position:relative;z-index:5;float:left;width:168px;height:calc(100% - 40px);overflow:auto;
    padding:8px 6px;background:#1b1b1d;border-right:1px solid #26262a;transition:width .18s ease}
  .st-sidebar.collapsed{width:52px;padding-left:4px;padding-right:4px}
  .st-sidebar.collapsed .st-nav-txt{display:none}
  .st-sidebar.collapsed .st-nav{justify-content:center;padding:8px 0}
  .st-nav{padding:7px 10px;margin-bottom:1px;border-radius:6px;cursor:pointer;font-size:13px;color:#b4b4ba;
    display:flex;align-items:center;gap:8px;transition:background .1s,color .1s;position:relative}
  .st-nav:hover{background:#26262a;color:#e6e6e8}
  .st-nav.active{background:#2a2a30;color:#fff;font-weight:500}
  .st-nav.active::before{content:'';position:absolute;left:0;top:7px;bottom:7px;width:2px;border-radius:2px;background:var(--st-primary)}
  .st-nav .st-ic{width:15px;height:15px;flex:none;opacity:.85}
  .st-nav-sub{margin-left:12px;font-size:12.5px}
  .st-nav-sub .st-ic{width:14px;height:14px}
  .st-nav-win{margin-left:auto;display:inline-flex;opacity:.5}
  .st-nav-win .st-ic{width:11px;height:11px}
  .st-sidebar.collapsed .st-nav-win{display:none}
  .st-sidebar.collapsed .st-nav-sub{margin-left:0}
  .st-collapse{position:absolute;right:6px;top:8px;z-index:7;width:22px;height:22px;border-radius:5px;border:none;
    cursor:pointer;background:transparent;color:#8a8a90;display:flex;align-items:center;justify-content:center;padding:0;
    transition:background .1s,color .1s}
  .st-collapse:hover{background:#2a2a2e;color:#e6e6e8}
  .st-collapse .st-ic{width:14px;height:14px;stroke-width:2}
  .st-content{position:relative;z-index:5;height:calc(100% - 40px);margin-left:168px;overflow:auto;
    padding:16px 18px;box-sizing:border-box;transition:margin-left .18s ease;user-select:none;touch-action:pan-y}
  .st-content.shifted{margin-left:52px}
  .st-content img{-webkit-user-drag:none;user-select:none;background:transparent}
  .st-content::-webkit-scrollbar,.st-sidebar::-webkit-scrollbar{width:8px}
  .st-content::-webkit-scrollbar-track,.st-sidebar::-webkit-scrollbar-track{background:transparent}
  .st-content::-webkit-scrollbar-thumb,.st-sidebar::-webkit-scrollbar-thumb{background:#303036;border-radius:4px}
  .st-content::-webkit-scrollbar-thumb:hover,.st-sidebar::-webkit-scrollbar-thumb:hover{background:#404048}
  .st-title{font-size:16px;font-weight:600;margin:0 0 14px;color:#e6e6e8;display:flex;align-items:center;gap:8px}
  .st-title .st-ic{width:17px;height:17px;color:#8a8a90;stroke-width:1.7}
  .st-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px}
  .st-card{background:#202022;border:1px solid #2a2a2e;border-radius:8px;padding:12px;margin-bottom:8px}
  .st-tile{cursor:pointer;text-align:center;transition:border-color .12s,background .12s}
  .st-tile:hover{border-color:#3a3a3e;background:#242428}
  .st-tile img{width:100%;height:78px;object-fit:contain;border-radius:6px;margin-bottom:6px;background:#17171a}
  .st-meta{font-size:11.5px;color:#82828a;margin-top:3px}
  .st-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#2a2a2e;color:#b4b4ba;margin-right:4px}
  .st-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0}
  .st-btn{background:#28282c;border:1px solid #35353c;color:#e0e0e4;padding:5px 11px;border-radius:6px;
    font-size:12.5px;cursor:pointer;margin:3px 5px 3px 0;font-family:inherit;transition:background .12s,border-color .12s}
  .st-btn:hover{background:#33333a;border-color:#45454d}
  .st-btn:active{background:#28282c;transform:translateY(1px)}
  .st-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .st-btn.ghost{background:transparent}
  .st-btn.ghost:hover{background:#26262a}
  .st-btn.danger{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.25);color:#f87171}
  .st-btn.danger:hover{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.45)}
  .st-btn.tiny{padding:3px 8px;font-size:11.5px;border-radius:5px}
  .st-btn.wide{width:100%;margin:0;justify-content:center}
  input.st-in,textarea.st-in,select.st-in{background:#141416;border:1px solid #35353c;color:#e6e6e8;border-radius:6px;
    padding:5px 9px;font-size:13px;outline:none;font-family:inherit;transition:border-color .12s}
  input.st-in:focus,textarea.st-in:focus,select.st-in:focus{border-color:var(--st-primary)}
  input.st-in[readonly]{opacity:.6;cursor:not-allowed;border-style:dashed}
  .st-ic{width:1.05em;height:1.05em;flex:none;vertical-align:-.15em;stroke:currentColor;fill:none;
    stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .st-ic-lg{display:flex;align-items:center;justify-content:center;margin:0 auto 6px;color:#8a8a90}
  .st-rsz{position:absolute;z-index:30;touch-action:none}
  .st-rsz.n{top:0;left:8px;right:8px;height:6px;cursor:ns-resize}
  .st-rsz.s{bottom:0;left:8px;right:8px;height:6px;cursor:ns-resize}
  .st-rsz.e{right:0;top:8px;bottom:8px;width:6px;cursor:ew-resize}
  .st-rsz.w{left:0;top:8px;bottom:8px;width:6px;cursor:ew-resize}
  .st-rsz.nw{top:0;left:0;width:14px;height:14px;cursor:nwse-resize}
  .st-rsz.ne{top:0;right:0;width:14px;height:14px;cursor:nesw-resize}
  .st-rsz.sw{bottom:0;left:0;width:14px;height:14px;cursor:nesw-resize}
  .st-rsz.se{bottom:0;right:0;width:14px;height:14px;cursor:nwse-resize}
  .st-rsz::after{content:'';position:absolute;inset:0;opacity:0;transition:opacity .12s;background:rgba(255,255,255,.08)}
  .st-rsz.se::before{content:'';position:absolute;right:3px;bottom:3px;width:7px;height:7px;
    border-right:2px solid #8a8a90;border-bottom:2px solid #8a8a90;opacity:.5}
  .st-rsz-layer{position:absolute;inset:0;z-index:29;display:none}
  .st-panel.rszing .st-rsz-layer{display:block}
  .st-panel.lifted{box-shadow:0 24px 64px rgba(0,0,0,.7)!important}
  .st-panel.dragging{cursor:grabbing!important}
  .st-panel.drag-pending{outline:2px solid var(--st-primary);outline-offset:-2px}
  .st-hold-ring{position:absolute;z-index:28;pointer-events:none;width:20px;height:20px;margin:-10px 0 0 -10px;
    border-radius:50%;border:2px solid var(--st-primary);opacity:0}
  .st-hold-ring.go{animation:st-hold .5s ease-out forwards}
  @keyframes st-hold{0%{width:20px;height:20px;margin:-10px 0 0 -10px;opacity:.9}
    100%{width:240px;height:240px;margin:-120px 0 0 -120px;opacity:0}}
  .st-size-tip{position:absolute;right:14px;bottom:14px;z-index:31;pointer-events:none;background:#0f0f11;
    border:1px solid #35353c;color:#e6e6e8;padding:4px 10px;border-radius:6px;
    font:600 11.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:0;transition:opacity .15s}
  .st-panel.rszing .st-size-tip{opacity:1}
  .st-snap-line{position:fixed;z-index:2147483098;pointer-events:none;display:none;background:var(--st-primary)}
  .st-snap-line.v{width:2px;top:0;bottom:0}
  .st-snap-line.h{height:2px;left:0;right:0}
  .st-snap-line.on{display:block;opacity:.8}
  .st-boot{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;
    background:rgba(15,15,17,.75);pointer-events:none}
  .st-boot-logo{font:600 22px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:2px;color:#e6e6e8;
    animation:st-boot-in .4s ease both}
  @keyframes st-boot-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .st-edgebar{position:fixed;left:0;top:26%;bottom:26%;width:14px;z-index:2147483090;background:#2a2a30;
    border-right:1px solid #35353c;cursor:pointer;display:none;align-items:center;justify-content:center;
    touch-action:none;border-radius:0 6px 6px 0;opacity:.85;transition:opacity .15s,width .15s}
  .st-edgebar::after{content:'';width:3px;height:36px;border-radius:3px;background:#5a5a62}
  .st-edgebar:hover{opacity:1;width:18px}
  .st-mobile .st-edgebar{display:flex}
  .st-mobile .st-fab{display:none}
  .st-mobile .st-panel{display:none!important}
  .st-drawer{position:fixed;left:0;top:0;bottom:0;width:216px;z-index:2147483095;background:#1b1b1d;
    border-right:1px solid #2a2a2e;box-shadow:8px 0 32px rgba(0,0,0,.5);padding:14px 10px;overflow:auto;
    display:none;transform:translateX(-100%);transition:transform .22s ease}
  .st-drawer.open{display:block;transform:none}
  .st-drawer h3{margin:2px 0 12px;font-size:13px;font-weight:600;color:#8a8a90;letter-spacing:.3px;
    display:flex;align-items:center;gap:6px}
  .st-drawer h3 .st-ic{width:15px;height:15px}
  .st-drawer-nav{padding:10px 12px;border-radius:6px;margin-bottom:2px;cursor:pointer;font-size:13.5px;
    display:flex;align-items:center;gap:9px;color:#b4b4ba;background:transparent;transition:background .12s,color .12s}
  .st-drawer-nav:hover{background:#26262a;color:#e6e6e8}
  .st-drawer-nav.active{background:#2a2a30;color:#fff}
  .st-drawer-nav .st-ic{width:15px;height:15px;opacity:.85}
  .st-drawer-mask{position:fixed;inset:0;z-index:2147483094;background:rgba(0,0,0,.4);display:none}
  .st-drawer-mask.open{display:block}
  .st-win{position:fixed;z-index:2147483100;min-width:280px;min-height:220px;border-radius:10px;overflow:hidden;
    display:flex;flex-direction:column;background:rgba(24,24,26,.97);backdrop-filter:blur(var(--st-blur,12px));
    -webkit-backdrop-filter:blur(var(--st-blur,12px));border:1px solid #303038;color:#e6e6e8;
    font:13.5px/1.55 ui-sans-serif,system-ui,-apple-system,"Microsoft YaHei",sans-serif;
    box-shadow:0 16px 48px rgba(0,0,0,.55);user-select:none;touch-action:auto}
  .st-win input,.st-win textarea{user-select:text;-webkit-user-select:text}
  .st-win.active{border-color:#404048}
  .st-win-bar{display:flex;align-items:center;gap:8px;padding:9px 11px;flex:none;cursor:grab;
    background:#1e1e20;border-bottom:1px solid #2a2a2e;font-weight:600;font-size:13px;touch-action:none}
  .st-win-bar:active{cursor:grabbing}
  .st-win-bar .st-ic{width:15px;height:15px;color:#8a8a90}
  .st-win-close{margin-left:auto;cursor:pointer;padding:4px;border-radius:5px;color:#8a8a90;display:flex;
    align-items:center;position:relative;z-index:5;transition:color .12s,background .12s}
  .st-win-close:hover{color:#e6e6e8;background:#2a2a2e}
  .st-win-body{flex:1;overflow:auto;padding:12px 13px;-webkit-overflow-scrolling:touch;touch-action:pan-y;
    overscroll-behavior:contain}
  .st-win-body::-webkit-scrollbar{width:8px}
  .st-win-body::-webkit-scrollbar-thumb{background:#303036;border-radius:4px}
  .st-win-rsz{position:absolute;z-index:6;touch-action:none;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize}
  .st-win-rsz::before{content:'';position:absolute;right:4px;bottom:4px;width:8px;height:8px;
    border-right:2px solid #8a8a90;border-bottom:2px solid #8a8a90;opacity:.6}
  .st-win.win-desktop .st-win-rsz.n{left:8px;right:8px;top:0;bottom:auto;width:auto;height:6px;cursor:ns-resize}
  .st-win.win-desktop .st-win-rsz.s{left:8px;right:8px;top:auto;bottom:0;width:auto;height:6px;cursor:ns-resize}
  .st-win.win-desktop .st-win-rsz.e{top:8px;bottom:8px;right:0;left:auto;width:6px;height:auto;cursor:ew-resize}
  .st-win.win-desktop .st-win-rsz.w{top:8px;bottom:8px;left:0;right:auto;width:6px;height:auto;cursor:ew-resize}
  .st-win.win-desktop .st-win-rsz.ne{top:0;right:0;left:auto;bottom:auto;width:12px;height:12px;cursor:nesw-resize}
  .st-win.win-desktop .st-win-rsz.nw{top:0;left:0;right:auto;bottom:auto;width:12px;height:12px;cursor:nwse-resize}
  .st-win.win-desktop .st-win-rsz.sw{bottom:0;left:0;right:auto;top:auto;width:12px;height:12px;cursor:nesw-resize}
  .st-win.win-desktop .st-win-rsz.se{right:0;bottom:0;left:auto;top:auto;width:14px;height:14px}
  .st-win.win-desktop .st-win-rsz:not(.se)::before{display:none}
  .st-win-rszlayer{position:absolute;inset:0;z-index:5;display:none}
  .st-win.rszing .st-win-rszlayer{display:block}
  .st-win-new{position:fixed;right:14px;bottom:14px;z-index:2147483099;height:42px;padding:0 14px 0 12px;
    border-radius:10px;display:none;align-items:center;justify-content:center;gap:6px;background:#28282c;
    color:#e6e6e8;border:1px solid #35353c;box-shadow:0 4px 16px rgba(0,0,0,.4);
    font:600 13px/1 ui-sans-serif,system-ui,"Microsoft YaHei",sans-serif;cursor:pointer}
  .st-win-new .st-ic{width:16px;height:16px}
  .st-win-new:active{transform:scale(.95)}
  .st-mobile .st-win-new{display:flex}
  .st-panel.st-glass-off,.st-win.st-glass-off{background:rgba(24,24,26,.98)!important;
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
  .st-panel.st-liquid,.st-win.st-liquid{background:rgba(24,24,26,.72)!important;
    backdrop-filter:blur(24px) saturate(160%)!important;-webkit-backdrop-filter:blur(24px) saturate(160%)!important}
  .st-panel.st-no-anim .st-content>*,.st-panel.st-no-anim .st-card,.st-panel.st-no-anim .st-title,
  .st-win.st-no-anim .st-win-body>*,.st-win.st-no-anim .st-card,.st-win.st-no-anim .st-title{
    animation:none!important;transition:none!important}
  .st-pl-track{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:6px;cursor:pointer;
    border:1px solid transparent;transition:background .12s,border-color .12s}
  .st-pl-track:hover{background:#26262a}
  .st-pl-track.cur{background:#2a2a30;border-color:#404048}
  .st-pl-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .st-pl-seek{width:100%;height:4px;border-radius:2px;background:#35353c;appearance:none;outline:none;
    cursor:pointer;margin:8px 0}
  .st-pl-seek::-webkit-slider-thumb{appearance:none;width:12px;height:12px;border-radius:50%;
    background:var(--st-primary);cursor:pointer;border:none}
  .st-pl-seek::-moz-range-thumb{width:12px;height:12px;border:0;border-radius:50%;background:var(--st-primary);cursor:pointer}
  .st-pl-canvas{width:100%;height:72px;display:block;border-radius:6px;background:#141416;border:1px solid #2a2a2e}
  .st-spec{position:fixed;left:0;right:0;bottom:0;height:64px;z-index:2147483075;pointer-events:none;
    opacity:0;transition:opacity .3s;background:rgba(0,0,0,.5)}
  .st-spec.on{opacity:1}
  .st-spec canvas{width:100%;height:64px;display:block}
  .st-spec-tip{position:absolute;left:12px;top:5px;font:500 11px system-ui;color:#fff;opacity:.6;letter-spacing:.5px}
  .st-hit-cnt{color:#8a8a90;font-size:11.5px}
  .st-blk-wrap{display:inline-flex;flex-direction:column;gap:3px;margin:6px 10px 6px 0;padding:6px 8px;
    border-radius:7px;cursor:pointer;background:#1f1f23;border:1px solid #2a2a2e;
    transition:border-color .12s,background .12s;vertical-align:top;max-width:100%}
  .st-blk-wrap:hover{border-color:#404048;background:#242428}
  .st-blk-wrap:active{transform:scale(.98)}
  .st-blk-img{display:block;height:auto;max-width:100%}
  .st-blk-cap{font:10.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:#6a6a72;max-width:190px;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  @keyframes st-blk-flash{0%,100%{filter:none}50%{filter:drop-shadow(0 0 6px var(--st-primary))}}
  .st-blk-flash{animation:st-blk-flash .6s ease 2}
  .st-lock-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;
    background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3)}
  .st-ext-wrap{display:flex;gap:14px;align-items:flex-start}
  .st-ext-side{width:250px;flex:none}
  .st-ext-main{flex:1;min-width:0}
  .st-ext-cover{width:100%;height:150px;border-radius:8px;overflow:hidden;border:1px solid #2a2a2e;
    display:flex;align-items:center;justify-content:center;margin-bottom:10px;position:relative;background:#1a1a1c}
  .st-ext-cover img{width:100%;height:100%;object-fit:contain;background:#1a1a1c}
  .st-ext-cover .st-ic{width:48px;height:48px;color:#5a5a62}
  .st-blk{display:flex;align-items:center;min-height:28px;padding:6px 12px;margin:5px 0;border-radius:6px;
    color:#fff;font-size:12.5px;font-weight:600;line-height:1.35;border:1px solid rgba(0,0,0,.35);
    position:relative;word-break:break-word}
  .st-blk.hat{border-radius:12px 12px 6px 6px;min-height:34px}
  .st-blk.reporter{border-radius:14px;justify-content:center;text-align:center;min-width:78px;display:inline-flex}
  .st-blk.boolean{border-radius:14px;justify-content:center;display:inline-flex;min-width:26px;min-height:26px;padding:4px}
  .st-blk .st-blk-op{display:block;font:400 10px ui-monospace,monospace;opacity:.72;margin-top:2px;word-break:break-all}
  .st-prev-wrap{display:flex;gap:14px;align-items:flex-start}
  .st-prev-side{width:236px;flex:none;position:sticky;top:0}
  .st-prev-main{flex:1;min-width:0}
  .st-prev-side .st-card{margin-bottom:8px}
  .st-prev-tile{position:relative;cursor:pointer;user-select:none}
  .st-prev-tile.sel{border-color:var(--st-primary)}
  .st-prev-tile.off{opacity:.4}
  .st-prev-tile img{width:100%;height:74px;object-fit:contain;border-radius:6px;margin-bottom:5px;background:#17171a}
  .st-prev-tile .st-cb{position:absolute;left:7px;top:7px;width:16px;height:16px;z-index:2;cursor:pointer}
  .st-prev-size{font:600 11px ui-monospace,monospace;color:#82828a;margin-top:2px}
  .st-prev-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a2a2e}
  .st-prev-row:last-child{border-bottom:none}
  .st-prev-row.off{opacity:.4}
  .st-prev-row img{width:46px;height:36px;object-fit:contain;border-radius:6px;flex:none;background:#17171a}
  .st-prev-row .grow{flex:1;min-width:0}
  .st-prev-row .st-cb{position:static;margin:0;flex:none;width:16px;height:16px}
  .st-prev-stat{font:600 12px ui-monospace,monospace;line-height:1.7;color:#8a8a90}
  .st-prev-stat b{color:#e6e6e8}
  .st-bg-swatch{display:inline-flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;
    padding:5px 8px;border-radius:7px;border:1px solid #2a2a2e;transition:border-color .12s,background .12s}
  .st-bg-swatch:hover{border-color:#404048;background:#26262a}
  .st-bg-swatch.active{border-color:var(--st-primary)}
  .st-bg-thumb{width:74px;height:44px;border-radius:5px;border:1px solid #2a2a2e}
  .st-bg-swatch span{font-size:11.5px;color:#8a8a90}
  .st-toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:2147483099;
    background:#202022;color:#e6e6e8;padding:9px 16px;border-radius:8px;font-size:13px;border:1px solid #35353c;
    box-shadow:0 8px 24px rgba(0,0,0,.45);opacity:0;animation:st-toast 1.9s ease forwards}
  @keyframes st-toast{0%{opacity:0;transform:translateX(-50%) translateY(10px)}
    12%{opacity:1;transform:translateX(-50%) translateY(0)}86%{opacity:1}
    100%{opacity:0;transform:translateX(-50%) translateY(-8px)}}
  .st-seg{display:inline-flex;border:1px solid #35353c;border-radius:7px;overflow:hidden;background:#1a1a1c}
  .st-seg button{background:transparent;border:none;color:#b4b4ba;padding:7px 14px;cursor:pointer;font-size:13px;
    font-weight:500;transition:background .12s,color .12s;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
  .st-seg button+button{border-left:1px solid #2a2a2e}
  .st-seg button.active{background:#2a2a30;color:#fff}
  .st-seg button:hover:not(.active){background:#26262a}
  .st-seg button .st-ic{width:14px;height:14px}
  .st-mode-now{display:inline-block;padding:3px 10px;border-radius:5px;font-size:12px;font-weight:600;
    background:#26262a;border:1px solid #35353c;color:#b4b4ba}
  .st-mode-now.phone{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.3);color:#c4b5fd}
  .st-mode-now.pc{background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.3);color:#93c5fd}
  .st-switch{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:7px;cursor:pointer;
    background:#1f1f23;border:1px solid #2a2a2e;transition:background .12s,border-color .12s;user-select:none}
  .st-switch:hover{background:#242428;border-color:#35353c}
  .st-switch .st-sw-box{width:34px;height:20px;border-radius:10px;flex:none;position:relative;
    background:#35353c;transition:background .18s}
  .st-switch .st-sw-box::after{content:'';position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;
    background:#8a8a90;transition:left .18s,background .18s}
  .st-switch.on{border-color:var(--st-primary)}
  .st-switch.on .st-sw-box{background:var(--st-primary)}
  .st-switch.on .st-sw-box::after{left:16px;background:#fff}
  .st-switch .st-sw-txt{font-size:13px;font-weight:600;display:flex;align-items:center;gap:5px}
  .st-switch .st-sw-txt .st-ic{width:14px;height:14px;opacity:.85}
  .st-switch .st-sw-sub{font-size:11px;color:#82828a;font-weight:400;margin-top:1px}
  .st-term-out{height:260px;overflow:auto;padding:9px;border-radius:6px;background:#141416;border:1px solid #2a2a2e;
    font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;
    word-break:break-all;color:#e6e6e8}
  .st-term-line{margin:0 0 2px}
  .st-term-line.cmd{color:var(--st-primary);font-weight:600}
  .st-term-line.err{color:#f87171}
  .st-term-line.ret{color:#4ade80}
  .st-term-line.sys{color:#82828a}
  #st-term-in{font-family:ui-monospace,monospace;font-size:12.5px}
  .st-thr-wrap{display:flex;gap:10px;min-height:340px}
  .st-thr-nav{width:132px;flex:none;display:flex;flex-direction:column;gap:2px;padding:8px;border-radius:7px;
    background:#1b1b1d;border:1px solid #2a2a2e;align-self:flex-start}
  .st-thr-tab{padding:7px 9px;border-radius:6px;cursor:pointer;font-size:12.5px;display:flex;align-items:center;
    gap:6px;color:#b4b4ba;transition:background .1s,color .1s;user-select:none}
  .st-thr-tab:hover{background:#26262a;color:#e6e6e8}
  .st-thr-tab.active{background:#2a2a30;color:#fff;font-weight:500}
  .st-thr-tab .st-ic{width:14px;height:14px}
  .st-thr-main{flex:1;min-width:0}
  .st-thr-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;border-radius:6px;
    background:#1f1f23;margin-bottom:6px;border:1px solid #2a2a2e}
  .st-blk-row{display:flex;align-items:center;gap:7px;padding:5px 7px;border-radius:5px;background:#1a1a1c;
    margin-bottom:3px;font-size:11.5px}
  .st-blk-row code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    font-size:11px;color:#b4b4ba}
  .st-blk-dot{width:7px;height:7px;border-radius:50%;flex:none}
  .st-tbl{width:100%;border-collapse:collapse;font-size:12px}
  .st-tbl th,.st-tbl td{padding:6px 8px;text-align:left;border-bottom:1px solid #2a2a2e}
  .st-tbl th{color:#8a8a90;font-weight:600;font-size:11px}
  .st-tbl tr:last-child td{border-bottom:none}
  .st-tool-item .st-switch{margin-bottom:6px}
  .st-paint{position:fixed;right:14px;top:74px;z-index:2147483070;width:236px;max-height:76vh;border-radius:8px;
    overflow:hidden;display:flex;flex-direction:column;background:#1f1f23;border:1px solid #2a2a2e;color:#e6e6e8;
    font:13px/1.5 ui-sans-serif,system-ui,"Microsoft YaHei",sans-serif;box-shadow:0 16px 44px rgba(0,0,0,.5);
    user-select:none}
  .st-paint.inline{position:static;width:auto;max-height:none;border:none;border-radius:0;background:transparent;
    backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none}
  .st-paint.inline .st-paint-bar{display:none}
  .st-paint-bar{display:flex;align-items:center;gap:6px;padding:8px 10px;flex:none;cursor:grab;background:#202024;
    border-bottom:1px solid #2a2a2e;font-weight:600;font-size:12.5px}
  .st-paint-bar:active{cursor:grabbing}
  .st-paint-bar .st-ic{width:14px;height:14px;color:#8a8a90}
  .st-paint-min,.st-paint-x{margin-left:auto;cursor:pointer;padding:2px 6px;border-radius:5px;color:#8a8a90}
  .st-paint-x{margin-left:4px}
  .st-paint-x:hover,.st-paint-min:hover{color:#e6e6e8;background:#2a2a2e}
  .st-paint-body{padding:10px;overflow:auto}
  .st-paint.mini .st-paint-body{display:none}
  .st-paint-sec{margin-bottom:11px;padding-bottom:9px;border-bottom:1px solid #26262a}
  .st-paint-sec:last-of-type{border-bottom:none}
  .st-paint-sec>b{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#b4b4ba;margin-bottom:6px}
  .st-paint-grid{display:flex;flex-wrap:wrap;gap:5px}
  .st-paint-grid .st-btn{margin:0}
  .st-paint-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
  .st-paint-row label{display:flex;align-items:center;gap:5px;font-size:11.5px}
  .st-paint-row input[type=color]{width:32px;height:22px;padding:0;border:none;background:none;cursor:pointer}
  .st-paint-row input[type=range]{width:96px}
  .st-paint-stickers{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .st-paint-emoji{font-size:17px;line-height:1;padding:5px 0;border:none;border-radius:6px;cursor:pointer;
    background:#1a1a1c;transition:background .12s}
  .st-paint-emoji:hover{background:#2a2a30}
  .st-paint-tabs{display:flex;flex:none;gap:2px;padding:6px 7px 0;background:#1a1a1c;border-bottom:1px solid #2a2a2e}
  .st-paint-tab{flex:1;padding:7px 2px;border:none;border-radius:5px 5px 0 0;cursor:pointer;background:transparent;
    color:#82828a;font-size:11.5px;font-weight:500;transition:background .12s,color .12s;white-space:nowrap}
  .st-paint-tab:hover{background:#26262a;color:#e6e6e8}
  .st-paint-tab.active{background:#2a2a30;color:#fff}
  .st-paint-cats{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
  .st-paint-cat{padding:4px 9px;border-radius:11px;cursor:pointer;font-size:11.5px;background:#1a1a1c;
    border:1px solid #2a2a2e;color:#82828a;transition:background .12s,color .12s,border-color .12s}
  .st-paint-cat:hover{background:#26262a;color:#e6e6e8}
  .st-paint-cat.active{background:#2a2a30;border-color:#404048;color:#fff}
  .st-paint-search{margin-bottom:8px}
  .st-paint-search .st-in{width:100%;font-size:12px;padding:5px 8px}
  .st-paint-lb{font-size:11.5px;color:#82828a;min-width:30px}
  .st-paint-val{font:600 11.5px ui-monospace,monospace;min-width:18px;text-align:right;color:var(--st-primary)}
  .st-paint-cl{display:flex;align-items:center;gap:4px;font-size:11.5px;padding:3px 8px;border-radius:6px;
    background:#1a1a1c;cursor:pointer}
  .st-paint-cl input[type=color]{width:26px;height:18px;padding:0;border:none;background:none;cursor:pointer}
  .st-paint-ck{display:flex;align-items:center;gap:4px;font-size:11.5px;padding:4px 9px;border-radius:6px;
    background:#1a1a1c;cursor:pointer}
  .st-paint-ck input{width:14px;height:14px}
  .st-guide{box-shadow:0 0 0 1px var(--st-primary)}
  `;
  document.head.appendChild(styleEl);

  /* ============================================================
   *  6. DOM 骨架
   * ============================================================ */
  let panel, fab, navsBox, content, mainContent, sidebar, holdRing, sizeTip, snapLines;

  const buildDOM = () => {
    fab = document.createElement('div');
    fab.className = 'st-fab';
    fab.textContent = 'S6';
    fab.title = 'smesm666 ' + VERSION;
    fab.style.display = 'none';
    document.body.appendChild(fab);

    panel = document.createElement('div');
    panel.className = 'st-panel';
    panel.innerHTML = `
      <div class="st-bg"></div>
      <div class="st-glow"></div>
      <div class="st-edge st-edge-t"></div><div class="st-edge st-edge-b"></div>
      <div class="st-edge st-edge-l"></div><div class="st-edge st-edge-r"></div>
      <div class="st-rsz-layer"></div>
      <div class="st-rsz nw"></div><div class="st-rsz n"></div><div class="st-rsz ne"></div>
      <div class="st-rsz e"></div><div class="st-rsz w"></div>
      <div class="st-rsz sw"></div><div class="st-rsz s"></div>
      <div class="st-rsz se" title="拖动调整大小"></div>
      <div class="st-hold-ring"></div>
      <div class="st-size-tip"></div>
      <div class="st-snap-line v" data-snap="l"></div><div class="st-snap-line v" data-snap="r"></div>
      <div class="st-snap-line h" data-snap="t"></div><div class="st-snap-line h" data-snap="b"></div>
      <div class="st-bar">
        <div class="st-logo">S6</div>
        <div style="opacity:.6;font-size:12px">smesm666 <span style="opacity:.5;font-size:11px">v${VERSION}</span></div>
        <div class="st-close">${ic('close')}</div>
      </div>
      <div class="st-sidebar">
        <button class="st-collapse" title="折叠/展开">${ic('menu')}</button>
        <div id="st-navs"></div>
      </div>
      <div class="st-content"></div>`;
    document.body.appendChild(panel);

    navsBox = $('#st-navs', panel);
    content = $('.st-content', panel);
    mainContent = content;
    sidebar = $('.st-sidebar', panel);
    holdRing = $('.st-hold-ring', panel);
    sizeTip = $('.st-size-tip', panel);
    snapLines = {
      l: $('.st-snap-line[data-snap=l]', panel), r: $('.st-snap-line[data-snap=r]', panel),
      t: $('.st-snap-line[data-snap=t]', panel), b: $('.st-snap-line[data-snap=b]', panel)
    };
    snapLines.l.style.left = '0';
    snapLines.r.style.right = '0';
    snapLines.t.style.top = '0';
    snapLines.b.style.bottom = '0';
  };

  /* ============================================================
   *  7. 提示
   * ============================================================ */
  const toast = (msg, ok = true) => {
    const t = document.createElement('div');
    t.className = 'st-toast';
    t.textContent = msg;
    if (!ok) t.style.borderColor = 'rgba(239,68,68,.45)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  };

  const dialog = {
    prompt: (msg, def) => window.prompt(msg, def),
    confirm: msg => window.confirm(msg)
  };

  /* ============================================================
   *  8. 变量锁（单一 Proxy 实现）
   * ============================================================ */
  const VarLock = (() => {
    const locks = new Map();
    const key = (tid, name) => tid + '|' + name;
    const WRITE_OPS = [
      'data_setvariableto','data_changevariableby','data_addtolist','data_deleteoflist',
      'data_deletealloflist','data_insertatlist','data_replaceitemoflist'
    ];

    const findVar = (tid, name) => {
      const t = getTarget(tid);
      if (!t) return null;
      return Object.values(t.variables || {}).find(v => v.name === name) || null;
    };

    /* 标量守卫 */
    const guardScalar = (v, k) => {
      if (v.__stGuard === k) return;
      try {
        const cur = v.value;
        Object.defineProperty(v, '__stVal', { value: cur, writable: true, configurable: true });
        Object.defineProperty(v, 'value', {
          configurable: true, enumerable: true,
          get () { return v.__stVal; },
          set (nv) {
            const rec = locks.get(k);
            if (rec && nv !== v.__stVal) {
              rec.blocked++; rec.lastOp = '直接赋值'; rec.mode = rec.mode || '属性';
              return;
            }
            v.__stVal = nv;
          }
        });
        v.__stGuard = k;
      } catch (e) {}
    };

    const unguardScalar = v => {
      if (!v || !v.__stGuard) return;
      try {
        const cur = v.__stVal;
        Object.defineProperty(v, 'value', { value: cur, writable: true, configurable: true, enumerable: true });
        try { delete v.__stVal; } catch (e) {}
      } catch (e) {}
      try { v.__stGuard = null; } catch (e) {}
    };

    /* 列表守卫：Proxy */
    const MUTATORS = ['push','pop','shift','unshift','splice','sort','reverse','fill','copyWithin'];
    const guardList = (v, k) => {
      const arr = v.value;
      if (!Array.isArray(arr)) return;
      if (arr.__stProxyOf === k) return;
      const real = arr.__stReal || arr;

      const block = kind => {
        const rec = locks.get(k);
        if (rec) { rec.blocked++; rec.lastOp = kind; rec.mode = rec.mode || '列表'; return true; }
        return false;
      };

      const proxy = new Proxy(real, {
        get (t, prop, recv) {
          if (MUTATORS.indexOf(prop) >= 0 && typeof t[prop] === 'function') {
            const fn = t[prop];
            return function () {
              if (block(prop + '()')) return (prop === 'pop' || prop === 'shift') ? undefined : t.length;
              return fn.apply(t, arguments);
            };
          }
          return Reflect.get(t, prop, recv);
        },
        set (t, prop, val) {
          if (block('索引赋值')) return true;
          return Reflect.set(t, prop, val);
        },
        deleteProperty (t, prop) {
          if (block('删除项')) return true;
          return Reflect.deleteProperty(t, prop);
        }
      });

      try {
        Object.defineProperty(v, '__stArr', { value: proxy, writable: true, configurable: true });
        Object.defineProperty(real, '__stReal', { value: real, writable: true, configurable: true });
        Object.defineProperty(proxy, '__stProxyOf', { value: k, writable: true, configurable: true });
        Object.defineProperty(proxy, '__stReal', { value: real, writable: true, configurable: true });
      } catch (e) {}

      if (v.__stGuard === k) { v.__stArr = proxy; return; }
      Object.defineProperty(v, 'value', {
        configurable: true, enumerable: true,
        get () { return v.__stArr; },
        set (nv) {
          if (block('整体替换')) return;
          v.__stArr = nv;
        }
      });
      v.__stGuard = k;
    };

    const unguardList = v => {
      if (!v || v.__stGuard == null) return;
      const cur = v.__stArr;
      const real = (cur && cur.__stReal) ? cur.__stReal : cur;
      try {
        Object.defineProperty(v, 'value', { value: real, writable: true, configurable: true, enumerable: true });
        try { delete v.__stArr; } catch (e) {}
        if (real) { try { delete real.__stReal; } catch (e) {} }
      } catch (e) {}
      try { v.__stGuard = null; } catch (e) {}
    };

    /* 指令层 hook */
    let hookOn = false;
    const hook = () => {
      if (hookOn) return true;
      const v = getVM();
      if (!v || !v.runtime) return false;
      const rt = v.runtime;
      const P = (rt._primitives && typeof rt._primitives === 'object') ? rt._primitives
              : (rt.blocks && rt.blocks.primitives) || null;
      if (!P) return false;

      const hit = (args, util) => {
        const tid = util && util.target && util.target.id;
        if (!tid) return null;
        const t = getTarget(tid);
        if (!t) return null;
        const f = args && (args.VARIABLE || args.LIST);
        if (!f) return null;
        let vv = null;
        if (typeof f === 'string') vv = t.variables[f] || Object.values(t.variables || {}).find(x => x.name === f);
        else if (f.id) vv = t.variables[f.id] || Object.values(t.variables || {}).find(x => x.name === f.name);
        if (!vv) return null;
        return locks.get(key(tid, vv.name)) || null;
      };

      let n = 0;
      WRITE_OPS.forEach(op => {
        const fn = P[op];
        if (typeof fn !== 'function' || fn.__stHook) return;
        const wrapped = function (args, util) {
          const rec = hit(args, util);
          if (rec) { rec.blocked++; rec.lastOp = op; rec.mode = rec.mode || '指令'; return; }
          return fn.apply(this, arguments);
        };
        wrapped.__stHook = true;
        try { P[op] = wrapped; n++; } catch (e) {}
      });
      if (n) hookOn = true;
      return n > 0;
    };

    const retry = k => {
      if (k > 30) return;
      if (hook()) return;
      setTimeout(() => retry(k + 1), 400);
    };

    const lock = (tid, name) => {
      const v = findVar(tid, name);
      if (!v) return false;
      const k = key(tid, name);
      if (locks.has(k)) return true;
      locks.set(k, {
        tid, name, isList: !!v.isList,
        value: v.isList ? JSON.parse(JSON.stringify(v.value)) : v.value,
        blocked: 0, lastOp: '', mode: hookOn ? '指令' : '属性'
      });
      if (v.isList) guardList(v, k); else guardScalar(v, k);
      hook();
      return true;
    };

    const unlock = (tid, name) => {
      const k = key(tid, name);
      const rec = locks.get(k);
      if (!rec) return;
      const v = findVar(tid, name);
      if (v) { if (v.isList) unguardList(v); else unguardScalar(v); }
      locks.delete(k);
      if (v) {
        try { v.value = rec.isList ? JSON.parse(JSON.stringify(rec.value)) : rec.value; } catch (e) {}
      }
    };

    const isLocked = (tid, name) => locks.has(key(tid, name));
    const info = (tid, name) => locks.get(key(tid, name)) || null;

    /* 安全网 */
    setInterval(() => {
      if (!locks.size) return;
      const stale = [];
      locks.forEach(rec => {
        const v = findVar(rec.tid, rec.name);
        if (!v) { stale.push(key(rec.tid, rec.name)); return; }
        try {
          if (rec.isList) {
            if (JSON.stringify(rec.value) !== JSON.stringify(v.value))
              v.value = JSON.parse(JSON.stringify(rec.value));
          } else if (v.value !== rec.value) {
            v.value = rec.value;
          }
        } catch (e) {}
      });
      stale.forEach(k => locks.delete(k));
    }, 800);

    retry(0);

    return { lock, unlock, isLocked, info, list: () => Array.from(locks.values()), hookOn: () => hookOn };
  })();

  /* ============================================================
   *  9. 广播拦截（统一入口）
   * ============================================================ */
  const Broadcast = (() => {
    const blocked = new Set();
    let installed = false;

    const isBlocked = opt => {
      if (!opt) return false;
      const v = opt.BROADCAST_OPTION;
      if (v == null) return false;
      try {
        if (typeof v === 'object') {
          if (v.name && blocked.has(v.name)) return true;
          if (v.id && blocked.has(v.id)) return true;
        }
        if (blocked.has(v)) return true;
        if (typeof v === 'string' && v.startsWith('{')) {
          const o = JSON.parse(v);
          if (o && o.name && blocked.has(o.name)) return true;
          if (o && o.id && blocked.has(o.id)) return true;
        }
      } catch (e) {}
      return false;
    };

    const install = () => {
      const v = getVM();
      if (!v || !v.runtime || installed) return installed;
      const rt = v.runtime;

      const orig = rt.startHats.bind(rt);
      rt.startHats = function (op, opt) {
        if (op === 'event_whenbroadcastreceived' && isBlocked(opt)) return [];
        return orig(op, opt);
      };

      try {
        const B = rt.blocks;
        if (B && !B.__stPatched) {
          if (typeof B.startHats === 'function') {
            const ob = B.startHats.bind(B);
            B.startHats = function (op, opt) {
              if (op === 'event_whenbroadcastreceived' && isBlocked(opt)) return [];
              return ob(op, opt);
            };
          }
          B.__stPatched = 1;
        }
      } catch (e) {}

      installed = true;
      return true;
    };

    const retry = n => {
      if (n > 30 || install()) return;
      setTimeout(() => retry(n + 1), 400);
    };
    retry(0);

    return {
      has: m => blocked.has(m),
      add: m => blocked.add(m),
      remove: m => blocked.delete(m),
      list: () => Array.from(blocked),
      installed: () => installed
    };
  })();

  /* ============================================================
   *  10. 数据层
   * ============================================================ */
  let zipCache = null, zipTime = 0;
  let pjCache = null, pjSig = '';

  const getProjectZip = async force => {
    const now = Date.now();
    if (!force && zipCache && now - zipTime < 5000) return zipCache;
    const vm = getVM();
    if (!vm) throw new Error('未找到 VM');
    const sb3 = await vm.saveProjectSb3();
    zipCache = await JSZip.loadAsync(new Blob([sb3]));
    zipTime = now;
    return zipCache;
  };

  const projectSig = () => {
    try {
      const ts = allTargets();
      return ts.length + '#' + ts.map(t => [
        t.id, t.getName(), blockCount(t),
        (t.sprite ? t.sprite.costumes.length : 0),
        (t.sprite ? t.sprite.sounds.length : 0),
        Object.keys(t.variables || {}).length,
        t.currentCostume || 0
      ].join(':')).join('|');
    } catch (e) { return 'err' + Date.now(); }
  };

  const getProjectJSON = async () => {
    const sig = projectSig();
    if (pjCache && pjSig === sig) return pjCache;
    try {
      const pj = await getProjectZip();
      const txt = await pj.file('project.json').async('string');
      pjCache = JSON.parse(txt);
      pjSig = sig;
      return pjCache;
    } catch (e) { return null; }
  };

  const costumeURL = c => {
    if (!c) return '';
    const vm = getVM();
    if (c.asset && typeof c.asset.encodeDataURI === 'function') {
      try { return c.asset.encodeDataURI(); } catch (e) {}
    }
    if (c.assetId && vm && vm.runtime && vm.runtime.storage) {
      const a = vm.runtime.storage.get(c.assetId);
      if (a && typeof a.encodeDataURI === 'function') {
        try { return a.encodeDataURI(); } catch (e) {}
      }
    }
    return '';
  };

  const soundURL = s => {
    if (!s) return '';
    if (s.asset && typeof s.asset.encodeDataURI === 'function') {
      try { return s.asset.encodeDataURI(); } catch (e) {}
    }
    return '';
  };

  const getBroadcasts = () => {
    const set = new Set();
    allTargets().forEach(t => {
      Object.values((t.blocks && t.blocks._blocks) || {}).forEach(b => {
        if (b.fields && b.fields.BROADCAST_OPTION) set.add(b.fields.BROADCAST_OPTION.value);
      });
      Object.values(t.variables || {}).forEach(v => { if (v.isBroadcast) set.add(v.name); });
    });
    return Array.from(set);
  };

  /* ============================================================
   *  11. 扩展收集
   * ============================================================ */
  const EXT_BUILTIN = ['motion','looks','sound','events','control','sensing','operators',
    'data','variables','procedures','argument','goTo','tw','sb3','',
    'procedures_definition','procedures_call','procedures_prototype'];
  const EXT_ICON = { music:'music', pen:'pen', translate:'globe', videoSensing:'video', text2speech:'speech',
    makeymakey:'chip', microbit:'chip', ev3:'chip', boost:'chip', wedo2:'chip', gdxfor:'flask' };

  const disabledExts = new Set();
  let extCache = [];

  const iterEntries = (obj, fn) => {
    if (!obj) return;
    try {
      if (obj instanceof Map) { obj.forEach((v, k) => fn(k, v)); return; }
      if (obj instanceof Set) { let i = 0; obj.forEach(v => fn(i++, v)); return; }
      if (Array.isArray(obj)) { obj.forEach((v, i) => fn(i, v)); return; }
      if (typeof obj === 'object') Object.keys(obj).forEach(k => fn(k, obj[k]));
    } catch (e) {}
  };

  const unwrapExt = v => {
    if (!v || typeof v !== 'object') return null;
    for (const k of ['extension','instance','extensionInstance','module','instance_']) {
      if (v[k] && typeof v[k] === 'object') return v[k];
    }
    return v;
  };

  const extId = (ext, hint) => {
    if (ext && typeof ext === 'object') {
      try {
        if (typeof ext.getInfo === 'function') {
          const i = ext.getInfo();
          if (i && i.id) return i.id;
        }
      } catch (e) {}
      if (ext.id) return ext.id;
      if (ext.extensionId) return ext.extensionId;
      if (ext.blockTag) return ext.blockTag;
    }
    return hint || '';
  };

  const safeInfo = ext => {
    if (!ext || typeof ext.getInfo !== 'function') return null;
    try { return ext.getInfo() || null; } catch (e) { return null; }
  };

  const blocklyDefs = ns => {
    const B = window.Blockly && window.Blockly.Blocks;
    if (!B) return [];
    const list = Array.isArray(ns) ? ns : [ns];
    const out = [];
    Object.keys(B).forEach(k => {
      const prefix = String(k).split('_')[0];
      if (!list.includes(prefix) || !B[k]) return;
      const d = { opcode: k, text: null, blockType: 'command' };
      const j = B[k].json;
      if (j && typeof j === 'object') {
        if (j.message0) d.message0 = j.message0;
        if (j.args0) d.args0 = j.args0;
        if (j.colour) d.colour = j.colour;
        if (j.type) d.blockType = j.type;
      }
      out.push(d);
    });
    return out;
  };

  const usedOpcodeDefs = ns => {
    const set = new Set();
    try {
      allTargets().forEach(t => Object.values((t.blocks && t.blocks._blocks) || {}).forEach(b => {
        if ((b.opcode || '').split('_')[0] === ns) set.add(b.opcode);
      }));
    } catch (e) {}
    return Array.from(set).map(o => ({ opcode: o, text: null, blockType: 'command' }));
  };

  const toolboxNames = () => {
    const out = {};
    try {
      const ws = window.Blockly && window.Blockly.getMainWorkspace && window.Blockly.getMainWorkspace();
      if (!ws) return out;
      const tb = ws.toolbox_ || ws.getToolbox && ws.getToolbox();
      if (!tb) return out;
      const tree = tb.tree_ || tb.tree;
      if (!tree || typeof tree.getChildren !== 'function') return out;
      const top = tree.getChildren(false) || [];
      top.forEach(n => {
        try {
          const nm = n.getLabelText ? n.getLabelText() : (n.labelText_ || '');
          const bid = n.blockTag_ || (n.contents_ && n.contents_[0]);
          if (nm) out[String(bid || nm).split('_')[0]] = nm;
        } catch (e) {}
      });
      return out;
    } catch (e) { return out; }
  };

  const humanize = op => {
    const rest = String(op).split('_').slice(1).join(' ');
    if (!rest) return op;
    return rest.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
  };

  const extCover = (ext, info) => {
    try {
      if (info && info.blockIconURI) return info.blockIconURI;
      if (info && info.menuIconURI) return info.menuIconURI;
    } catch (e) {}
    if (ext && ext.iconURL) return ext.iconURL;
    if (ext && ext.blockIconURI) return ext.blockIconURI;
    return '';
  };

  const collectExtensions = () => {
    const vm = getVM();
    if (!vm) return [];
    const map = new Map();
    const nsOwner = new Set();
    const tNames = toolboxNames();

    const add = (raw, src, hint) => {
      const ext = unwrapExt(raw);
      const id = extId(ext, hint);
      if (!id) return;
      const info = safeInfo(ext);

      const infoDefs = (info && Array.isArray(info.blocks) && info.blocks.length) ? info.blocks : [];
      const nsList = [id];
      infoDefs.forEach(d => {
        const p = String(d.opcode || '').split('_')[0];
        if (p && !nsList.includes(p)) nsList.push(p);
      });

      let defs = [], countSrc = '';
      if (infoDefs.length) { defs = infoDefs; countSrc = '扩展定义'; }
      else {
        const bd = blocklyDefs(nsList);
        if (bd.length) { defs = bd; countSrc = '已注册(推测)'; }
        else { const ud = usedOpcodeDefs(id); defs = ud; countSrc = ud.length ? '项目使用(推测)' : '未知'; }
      }

      const colour = (info && info.colour) || (ext && ext.colour) || '#8b5cf6';
      const secondary = (info && info.secondaryColour) || (ext && ext.secondaryColour) || '#6d28d9';
      const byOp = new Map();
      defs.forEach(d => {
        const op = d.opcode || d.id || '';
        if (!op || byOp.has(op)) return;
        byOp.set(op, Object.assign({}, d, {
          colour: d.colour || colour,
          colourSecondary: d.colourSecondary || secondary
        }));
      });
      const finalDefs = Array.from(byOp.values());
      finalDefs.forEach(d => { if (d && d.opcode) nsOwner.add(String(d.opcode).split('_')[0]); });
      nsOwner.add(id);

      const norm = finalDefs.map(d => ({
        opcode: d.opcode || d.id || '',
        text: d.text || null,
        blockType: d.blockType || 'command',
        arguments: d.arguments || null,
        message0: d.message0 || null,
        args0: d.args0 || null,
        colour: d.colour || null,
        colourSecondary: d.colourSecondary || null
      }));

      const name = (info && info.name) || (ext && ext.name && ext.name !== id ? ext.name : null) || tNames[id] || id;

      map.set(id, {
        id, name, blocks: norm.length, blockDefs: norm,
        countSource: countSrc, colour, secondary,
        cover: extCover(ext, info), source: src, info
      });
    };

    const em = vm.extensionManager || (vm.runtime && vm.runtime.extensionManager);
    if (em) {
      ['extensions','loadedExtensions','_loadedExtensions','extensionObjects','builtinExtensions','loadedURLs','_loadedURLs']
        .forEach(k => iterEntries(em[k], (key, v) => add(v, 'em.' + k, key)));
    }
    iterEntries(vm.runtime && vm.runtime.extensions, (k, v) => add(v, 'runtime.extensions', k));
    iterEntries(vm.extensions, (k, v) => add(v, 'vm.extensions', k));
    iterEntries(vm.runtime && vm.runtime.extensionStorage, (k, v) => add(v, 'extensionStorage', k));
    iterEntries(vm.runtime && vm.runtime._extensionStorage, (k, v) => add(v, '_extensionStorage', k));

    const B = (window.Blockly && window.Blockly.Blocks) || {};
    Object.keys(B).forEach(k => {
      const ns = String(k).split('_')[0];
      if (ns && !EXT_BUILTIN.includes(ns)) nsOwner.add(ns);
    });

    const usedNs = new Set();
    try {
      allTargets().forEach(t => Object.values((t.blocks && t.blocks._blocks) || {}).forEach(b => {
        const ns = (b.opcode || '').split('_')[0];
        if (ns && !EXT_BUILTIN.includes(ns)) usedNs.add(ns);
      }));
    } catch (e) {}

    new Set([...Object.keys(B).map(k => String(k).split('_')[0]), ...usedNs]).forEach(ns => {
      if (!ns || EXT_BUILTIN.includes(ns) || map.has(ns) || nsOwner.has(ns)) return;
      const bd = blocklyDefs(ns);
      const ud = usedOpcodeDefs(ns);
      const defs = (bd.length ? bd : ud).map(d => ({ opcode: d.opcode, text: null, blockType: 'command' }));
      map.set(ns, {
        id: ns, name: tNames[ns] || ns, blocks: defs.length, blockDefs: defs,
        countSource: bd.length ? 'blockly' : 'opcode-inferred',
        colour: '#8b5cf6', secondary: '#6d28d9', cover: '', source: 'namespace-scan', info: null
      });
    });

    return Array.from(map.values())
      .filter(e => e.id && !EXT_BUILTIN.includes(e.id) && !disabledExts.has(e.id));
  };

  const extLoadingCount = () => {
    const vm = getVM();
    if (!vm) return 0;
    const em = vm.extensionManager || (vm.runtime && vm.runtime.extensionManager);
    if (!em) return 0;
    const s = em.loadingExtensions || em._loadingExtensions;
    if (s && typeof s.size === 'number') return s.size;
    if (Array.isArray(s)) return s.length;
    return 0;
  };

  /* ============================================================
   *  12. 页面路由
   * ============================================================ */
  const PAGE_ICON = {
    '角色':'sprite','绘画工具':'pen','变量':'variable','消息':'message','扩展':'puzzle',
    'ST工具箱':'chip','ST终端':'speech','ST线程管理':'layers','图片':'image',
    '角色下载':'upload','下载中心':'download','设置':'gear','关于':'info'
  };
  const PAGES = ['角色','绘画工具','变量','消息','扩展','ST工具箱','图片','角色下载','下载中心','设置','关于'];
  const SUB_PAGES = { 'ST终端':'terminal', 'ST线程管理':'threads' };
  const WINDOW_ONLY = { 'ST终端': 1, 'ST线程管理': 1 };

  let current = null, isOpen = false, bootPlayed = false;

  const buildNavs = () => {
    if (!navsBox) return;
    const t = settings.tools || {};
    navsBox.innerHTML = PAGES.map(p => {
      let h = `<div class="st-nav" data-page="${p}" title="${p}">${ic(PAGE_ICON[p])}<span class="st-nav-txt"> ${p}</span></div>`;
      if (p === 'ST工具箱') {
        Object.keys(SUB_PAGES).forEach(sp => {
          if (!t[SUB_PAGES[sp]]) return;
          h += `<div class="st-nav st-nav-sub" data-page="${sp}" title="${sp}（在独立窗口中打开）">`
             + `${ic(PAGE_ICON[sp])}<span class="st-nav-txt"> ${sp}</span>`
             + `<span class="st-nav-win">${ic('plus')}</span></div>`;
        });
      }
      return h;
    }).join('');
    if (current) {
      $$('.st-nav', panel).forEach(n => n.classList.toggle('active', n.dataset.page === current));
    }
  };

  const PAGE_FNS = {
    '角色': renderSprites,
    '绘画工具': renderPaint,
    '变量': renderVars,
    '消息': renderMessages,
    '扩展': renderExtensions,
    'ST工具箱': renderToolbox,
    'ST终端': renderTerminal,
    'ST线程管理': renderThreads,
    '图片': renderImages,
    '角色下载': renderSpriteDownload,
    '下载中心': renderDownloadCenter,
    '设置': renderSettings,
    '关于': renderAbout,
    '__img': renderImagePreview,
    '__spr': renderSpritePreview
  };

  const renderPage = page => {
    const f = PAGE_FNS[page];
    if (!f) return false;
    content.scrollTop = 0;
    content.innerHTML = '';
    f();
    return true;
  };

  const go = page => {
    if (WINDOW_ONLY[page]) { Win.create(page); return; }
    current = page;
    $$('.st-nav', panel).forEach(n => n.classList.toggle('active', n.dataset.page === page));
    $$('.st-drawer-nav', document).forEach(n => n.classList.toggle('active', n.dataset.page === page));
    Refresh.leavePreview();
    renderPage(page);
  };
  window.__stGo = go;

  /* ============================================================
   *  13. 面板开关 / 长按拖动 / 缩放
   * ============================================================ */
  const Panel = (() => {
    const MIN_W = 520, MIN_H = 340, SNAP = 14;
    let tx = 0, ty = 0, w = 900, h = 580;
    let mode = '', sx = 0, sy = 0, sw = 0, sh = 0, stx = 0, sty = 0;
    let timer = null, raf = 0, lastEv = null, capEl = null, prevRect = null;

    const init = () => {
      if (settings.size && typeof settings.size.w === 'number') {
        w = Math.max(MIN_W, settings.size.w); h = Math.max(MIN_H, settings.size.h);
      }
      if (settings.pos && typeof settings.pos.x === 'number' && !settings.maximized) {
        tx = settings.pos.x; ty = settings.pos.y;
      } else if (!settings.maximized) {
        tx = Math.max(0, innerWidth - w - 40);
        ty = Math.max(0, innerHeight - h - 40);
      }
      apply();
    };

    const apply = () => {
      const W = Math.max(MIN_W, w), H = Math.max(MIN_H, h);
      panel.style.width = W + 'px';
      panel.style.height = H + 'px';
      panel.style.transform = `translate(${tx}px,${ty}px)`;
      panel.style.left = '0'; panel.style.top = '0';
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      if (sizeTip) sizeTip.textContent = `${W} × ${H}`;
    };

    const INTERACTIVE = new Set([
      'st-card','st-tile','st-nav','st-btn','st-close','st-logo','st-rsz','st-rsz-layer',
      'st-collapse','st-switch','st-tool-item','st-pl-track','st-pl-seek','st-pl-canvas','st-pl-name',
      'st-thr-nav','st-thr-tab','st-thr-row','st-thr-main','st-blk-row','st-blk-dot',
      'st-blk-wrap','st-blk-img','st-blk-cap','st-ext-cover','st-ext-side','st-ext-main',
      'st-prev-tile','st-prev-row','st-prev-side','st-prev-main','st-term-out','st-term-line'
    ]);
    const isBlank = el => {
      while (el && el !== panel) {
        if (!el.classList) return false;
        for (const c of INTERACTIVE) if (el.classList.contains(c)) return false;
        const g = el.tagName;
        if (['BUTTON','A','SELECT','INPUT','TEXTAREA','CODE','LABEL','SVG','IMG'].includes(g)) return false;
        el = el.parentElement;
      }
      return true;
    };

    const compute = (dx, dy) => {
      let nw = sw, nh = sh, nx = stx, ny = sty;
      if (mode === 'move') { nx = stx + dx; ny = sty + dy; }
      else {
        const R = mode.includes('e'), L = mode.includes('w');
        const B = mode.includes('s'), T = mode.includes('n');
        if (R) nw = Math.max(MIN_W, sw + dx);
        if (L) { nw = Math.max(MIN_W, sw - dx); nx = stx + (sw - nw); }
        if (B) nh = Math.max(MIN_H, sh + dy);
        if (T) { nh = Math.max(MIN_H, sh - dy); ny = sty + (sh - nh); }
      }
      nx = Math.max(-nw + 60, Math.min(innerWidth - 60, nx));
      ny = Math.max(0, Math.min(innerHeight - 40, ny));
      return { nw, nh, nx, ny };
    };

    const popRing = (cx, cy) => {
      if (!holdRing) return;
      const r = panel.getBoundingClientRect();
      holdRing.style.left = (cx - r.left) + 'px';
      holdRing.style.top = (cy - r.top) + 'px';
      holdRing.classList.remove('go');
      void holdRing.offsetWidth;
      holdRing.classList.add('go');
    };

    let pendingId = null, capDone = false;
    const commit = m => {
      if (mode !== 'pending') return;
      mode = m;
      panel.classList.remove('drag-pending');
      panel.classList.add('dragging','rszing');
      if (m === 'move') { panel.classList.add('lifted'); stx = tx; sty = ty; }
      const layer = $('.st-rsz-layer', panel);
      if (layer) layer.style.display = 'block';
      const bar = $('.st-bar', panel);
      bar.style.cursor = 'grabbing';
      if (!capDone && pendingId != null) {
        capDone = true;
        try { panel.setPointerCapture(pendingId); } catch (e) {}
      }
      apply();
    };

    const doMove = e => {
      if (mode === 'pending') {
        if (Math.hypot(e.clientX - sx, e.clientY - sy) >= (settings.moveTh || 5)) {
          sx = e.clientX; sy = e.clientY; commit('move');
        } else return;
      }
      if (!mode || mode === 'pending') return;
      const r = compute(e.clientX - sx, e.clientY - sy);
      w = r.nw; h = r.nh; tx = r.nx; ty = r.ny;
      apply();
      updateSnap();
    };

    const move = e => {
      lastEv = e;
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; doMove(lastEv); });
    };

    const updateSnap = () => {
      if (!settings.snap || mode !== 'move') { hideSnap(); return; }
      const VW = innerWidth, VH = innerHeight;
      const W = Math.max(MIN_W, w), H = Math.max(MIN_H, h), N = SNAP * 3;
      const near = { l: Math.abs(tx) < N, r: Math.abs(tx + W - VW) < N, t: Math.abs(ty) < N, b: Math.abs(ty + H - VH) < N };
      ['l','r','t','b'].forEach(k => { if (snapLines[k]) snapLines[k].classList.toggle('on', !!near[k]); });
    };

    const hideSnap = () => {
      ['l','r','t','b'].forEach(k => { if (snapLines[k]) snapLines[k].classList.remove('on'); });
    };

    const snapEdge = () => {
      if (!settings.snap) return;
      const VW = innerWidth, VH = innerHeight;
      if (Math.abs(tx) < SNAP) tx = 0;
      if (Math.abs(tx + w - VW) < SNAP) tx = VW - w;
      if (Math.abs(ty) < SNAP) ty = 0;
      if (Math.abs(ty + h - VH) < SNAP) ty = VH - h;
    };

    const end = e => {
      clearTimeout(timer); timer = null;
      pendingId = null; capDone = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (capEl) { try { capEl.releasePointerCapture(e.pointerId); } catch (x) {} capEl = null; }
      const wasMove = mode === 'move';
      const wasResize = mode && mode !== 'move' && mode !== 'pending';
      if (wasMove) { snapEdge(); apply(); }
      hideSnap();
      panel.classList.remove('dragging','rszing','drag-pending','lifted');
      const layer = $('.st-rsz-layer', panel);
      if (layer) layer.style.display = 'none';
      const bar = $('.st-bar', panel);
      bar.style.cursor = '';
      mode = '';
      apply();
      if (wasMove || wasResize) {
        if (wasResize) settings.maximized = false;
        settings.pos = { x: tx, y: ty };
        settings.size = { w, h };
        save();
      }
    };

    const initEvents = () => {
      panel.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        if (!isBlank(e.target)) return;
        sx = e.clientX; sy = e.clientY;
        sw = panel.offsetWidth; sh = panel.offsetHeight;
        stx = tx; sty = ty;
        capEl = e.target; mode = 'pending';
        panel.classList.add('drag-pending');
        popRing(e.clientX, e.clientY);
        pendingId = e.pointerId; capDone = false;
        timer = setTimeout(() => {
          timer = null;
          if (mode === 'pending') { commit('move'); sx = e.clientX; sy = e.clientY; }
        }, Math.max(80, settings.holdMs || 240));
        e.preventDefault();
      });
      panel.addEventListener('pointermove', move);
      panel.addEventListener('pointerup', end);
      panel.addEventListener('pointercancel', e => { clearTimeout(timer); end(e); });

      $$('.st-rsz', panel).forEach(el => {
        el.addEventListener('pointerdown', e => {
          if (e.button !== 0) return;
          clearTimeout(timer); timer = null;
          panel.classList.remove('drag-pending');
          sx = e.clientX; sy = e.clientY;
          sw = panel.offsetWidth; sh = panel.offsetHeight;
          stx = tx; sty = ty;
          mode = el.className.replace('st-rsz', '').trim();
          capEl = el;
          panel.classList.add('rszing');
          const layer = $('.st-rsz-layer', panel);
          if (layer) layer.style.display = 'block';
          try { el.setPointerCapture(e.pointerId); } catch (x) {}
          e.preventDefault();
        });
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
      });

      const bar = $('.st-bar', panel);
      bar.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        if (e.target.closest('.st-logo')) return;
        if (e.target.closest('.st-close')) return;
        if (e.target.closest('button,input,select,textarea,a')) return;
        clearTimeout(timer); timer = null;
        panel.classList.remove('drag-pending');
        sx = e.clientX; sy = e.clientY;
        sw = panel.offsetWidth; sh = panel.offsetHeight;
        stx = tx; sty = ty;
        mode = 'move'; capEl = bar;
        panel.classList.add('rszing');
        const layer = $('.st-rsz-layer', panel);
        if (layer) layer.style.display = 'block';
        bar.style.cursor = 'grabbing';
        try { bar.setPointerCapture(e.pointerId); } catch (x) {}
        e.preventDefault();
      });
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);

      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', end);

      const blockTouch = e => { if (mode && mode !== 'pending') e.preventDefault(); };
      panel.addEventListener('touchmove', blockTouch, { passive: false });
      document.addEventListener('touchmove', blockTouch, { passive: false });

      bar.addEventListener('dblclick', e => { if (!e.target.closest('.st-logo')) toggleMax(); });

      addEventListener('resize', () => {
        if (settings.maximized) {
          w = Math.max(MIN_W, Math.round(innerWidth * 0.92));
          h = Math.max(MIN_H, Math.round(innerHeight * 0.90));
          tx = Math.round((innerWidth - w) / 2);
          ty = Math.round((innerHeight - h) / 2);
        } else {
          tx = Math.max(-Math.max(MIN_W, w) + 60, Math.min(innerWidth - 60, tx));
          ty = Math.max(0, Math.min(innerHeight - 40, ty));
        }
        apply();
      });
    };

    const toggleMax = () => {
      if (settings.maximized && prevRect) {
        w = prevRect.w; h = prevRect.h; tx = prevRect.x; ty = prevRect.y;
        settings.maximized = false; toast('已还原');
      } else {
        prevRect = { w, h, x: tx, y: ty };
        w = Math.max(MIN_W, Math.round(innerWidth * 0.92));
        h = Math.max(MIN_H, Math.round(innerHeight * 0.90));
        tx = Math.round((innerWidth - w) / 2);
        ty = Math.round((innerHeight - h) / 2);
        settings.maximized = true; toast('已最大化');
      }
      settings.size = { w, h }; settings.pos = { x: tx, y: ty };
      apply(); save();
    };

    const open = () => {
      if (!getVM()) toast('尚未检测到 Scratch VM，请确认在编辑器页面', false);
      if (Mobile.on()) {
        Mobile.apply();
        Mobile.openDrawer();
        return;
      }
      if (isOpen) return;
      isOpen = true;
      panel.style.display = 'block';
      if (!bootPlayed) bootPlayed = true;
      playBoot();
      if (!current) go('角色');
    };

    const close = () => {
      isOpen = false;
      panel.style.display = 'none';
      try { Paint.hideGuides(); } catch (e) {}
    };

    const playBoot = () => {
      const b = document.createElement('div');
      b.className = 'st-boot';
      b.innerHTML = `<div class="st-boot-logo">smesm666</div>`;
      panel.appendChild(b);
      setTimeout(() => b.remove(), 500);
    };

    const sync = () => {
      if (settings.size && typeof settings.size.w === 'number') {
        w = Math.max(MIN_W, settings.size.w);
        h = Math.max(MIN_H, settings.size.h);
      }
      if (settings.pos && typeof settings.pos.x === 'number' && !settings.maximized) {
        tx = settings.pos.x; ty = settings.pos.y;
      }
      apply();
    };

    return { init, initEvents, open, close, sync, isOpen: () => isOpen, apply };
  })();

  const openPanel = () => Panel.open();
  const closePanel = () => Panel.close();

  /* ============================================================
   *  14. 实时刷新引擎
   * ============================================================ */
  const Refresh = (() => {
    let lastSig = '';
    let lock = false;
    let searchMem = {};
    let previewKind = '';
    let detailId = '';
    let extDetailId = '';
    let sprToken = 0;

    const REFRESHABLE = { '角色':1, '变量':1, '消息':1, '扩展':1, '图片':1, '角色下载':1, '下载中心':1, '关于':1 };

    const now = force => {
      if (!isOpen) return;
      if (lock && !force) return;
      const sig = projectSig();
      if (!force && sig === lastSig) return;
      lastSig = sig;

      if (current === '设置') return;

      const q = $('.st-in[type=text]', content);
      if (q && q.id) searchMem[current] = q.value;

      if (previewKind === 'img') {
        panel.classList.add('st-no-anim');
        renderImagePreview();
        requestAnimationFrame(() => panel.classList.remove('st-no-anim'));
        return;
      }
      if (previewKind === 'spr') return;
      if (detailId) {
        if (getTarget(detailId)) {
          panel.classList.add('st-no-anim');
          renderSpriteDetail(detailId);
          requestAnimationFrame(() => panel.classList.remove('st-no-anim'));
          return;
        }
        detailId = '';
      }
      if (extDetailId) {
        panel.classList.add('st-no-anim');
        renderExtensionDetail(extDetailId);
        requestAnimationFrame(() => panel.classList.remove('st-no-anim'));
        return;
      }

      const keep = current;
      panel.classList.add('st-no-anim');
      if (REFRESHABLE[keep]) go(keep);
      requestAnimationFrame(() => panel.classList.remove('st-no-anim'));

      const q2 = $('.st-in[type=text]', content);
      if (q2 && searchMem[keep] != null) {
        q2.value = searchMem[keep];
        q2.dispatchEvent(new Event('input'));
      }
    };

    const setPreview = k => { previewKind = k || ''; };
    const setDetail = id => { detailId = id || ''; };
    const setExtDetail = id => { extDetailId = id || ''; };
    const leavePreview = () => { previewKind = ''; detailId = ''; extDetailId = ''; sprToken++; };

    const notify = () => {
      if (window.__stClearPrevCache) window.__stClearPrevCache();
      lastSig = '';
      now(true);
    };

    const init = () => {
      VM.on(() => now());
      setInterval(() => now(), 1500);

      panel.addEventListener('focusin', e => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) lock = true;
      });
      panel.addEventListener('focusout', () => { lock = false; });
      document.addEventListener('pointerdown', () => { lock = true; });
      document.addEventListener('pointerup', () => { lock = false; });
      document.addEventListener('pointercancel', () => { lock = false; });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) now(true); });
    };

    const token = () => ++sprToken;
    const curToken = () => sprToken;

    return { now, notify, init, setPreview, setDetail, setExtDetail, leavePreview, token, curToken };
  })();

  const stNotifyChange = () => Refresh.notify();
  window.__stRefresh = () => Refresh.now(true);

  /* ============================================================
   *  15. 手机模式 + 多窗口
   * ============================================================ */
  const Mobile = (() => {
    let edgeBar = null, drawer = null, drawerMask = null;
    let healed = false;

    const system = () => {
      const uad = (navigator.userAgentData && navigator.userAgentData.platform) ? navigator.userAgentData.platform : '';
      const ua = (navigator.userAgent || '') + ' ' + uad;
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
      const isMobileOS = isAndroid || isIOS || /Windows Phone|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
      const isDesktopOS = /Windows NT|Macintosh|X11|Linux/i.test(ua) && !isMobileOS;
      let platform = '未知';
      if (isAndroid) platform = 'Android';
      else if (isIOS) platform = /iPad|Macintosh/.test(ua) ? 'iPadOS' : 'iOS';
      else if (/Windows NT/i.test(ua)) platform = 'Windows';
      else if (/Macintosh/i.test(ua)) platform = 'macOS';
      else if (/X11|Linux/i.test(ua)) platform = 'Linux';
      return { isAndroid, isIOS, isMobileOS, isDesktopOS, platform };
    };

    const signals = () => {
      const mq = q => { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };
      const W = innerWidth || 0, H = innerHeight || 0;
      const s = system();
      return {
        platform: s.platform, mobileOS: s.isMobileOS, desktopOS: s.isDesktopOS,
        anyFine: mq('(any-pointer: fine)'), anyHover: mq('(any-hover: hover)'),
        noHover: mq('(hover: none)'), coarse: mq('(pointer: coarse)'),
        touch: ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0,
        maxTouch: navigator.maxTouchPoints || 0,
        small: Math.min(W, H) <= 560,
        W, H
      };
    };

    const isEnv = () => {
      if (settings.mobile === 'on') return true;
      if (settings.mobile === 'off') return false;
      const g = signals();
      if (g.mobileOS) return true;
      if (g.desktopOS) return false;
      if (g.anyFine || g.anyHover) return false;
      if (g.noHover && g.coarse) return true;
      return false;
    };

    const reason = () => {
      if (settings.mobile === 'on') return '手动强制开启';
      if (settings.mobile === 'off') return '手动强制关闭';
      const g = signals();
      if (g.mobileOS) return '系统：' + g.platform + '（手机/平板）';
      if (g.desktopOS) return '系统：' + g.platform + '（电脑）';
      if (g.anyFine || g.anyHover) return '兜底：检测到鼠标 → 电脑';
      if (g.noHover && g.coarse) return '兜底：无悬停+粗指针 → 手机';
      return '兜底：默认电脑';
    };

    const on = () => {
      if (settings.mobile === 'on') return true;
      if (settings.mobile === 'off') return false;
      return isEnv();
    };

    const build = () => {
      if (edgeBar) return;
      edgeBar = document.createElement('div');
      edgeBar.className = 'st-edgebar';
      edgeBar.title = '点击打开菜单';
      document.body.appendChild(edgeBar);

      drawerMask = document.createElement('div');
      drawerMask.className = 'st-drawer-mask';
      document.body.appendChild(drawerMask);

      drawer = document.createElement('div');
      drawer.className = 'st-drawer';
      const MOBILE_PAGES = ['角色','绘画工具','变量','消息','扩展','ST工具箱','图片','角色下载','下载中心','设置','关于'];
      drawer.innerHTML = `<h3>${ic('menu')} smesm666</h3>`
        + MOBILE_PAGES.map(p => `<div class="st-drawer-nav" data-page="${p}">${ic(PAGE_ICON[p] || 'info')}<span>${p}</span></div>`).join('');
      document.body.appendChild(drawer);

      const closeDrawer = () => {
        drawer.classList.remove('open');
        drawerMask.classList.remove('open');
      };
      let edgeLock = 0;
      edgeBar.addEventListener('click', e => {
        e.stopPropagation();
        const now = Date.now();
        if (now - edgeLock < 320) return;
        edgeLock = now;
        const open = drawer.classList.toggle('open');
        drawerMask.classList.toggle('open', open);
      });
      drawerMask.addEventListener('click', closeDrawer);
      drawer.addEventListener('click', e => {
        const n = e.target.closest('.st-drawer-nav');
        if (!n) return;
        const page = n.dataset.page;
        closeDrawer();
        edgeLock = Date.now();
        Win.create(page);
      });
      const newBtn = document.createElement('div');
      newBtn.className = 'st-win-new';
      newBtn.innerHTML = `${ic('plus')}<span class="st-win-new-txt">新建</span>`;
      newBtn.title = '新建一个窗口';
      document.body.appendChild(newBtn);
      newBtn.addEventListener('click', () => {
        const last = Win.list.length ? Win.list[Win.list.length - 1].page : '角色';
        Win.create(last);
      });
    };

    const apply = () => {
      const on_ = on();
      document.documentElement.classList.toggle('st-mobile', on_);
      if (on_) {
        build();
        if (edgeBar) edgeBar.style.display = '';
        if (isOpen) closePanel();
      } else {
        if (drawer) drawer.classList.remove('open');
        if (drawerMask) drawerMask.classList.remove('open');
        if (edgeBar) edgeBar.style.display = 'none';
        try {
          const maxW = Math.max(520, innerWidth - 24);
          const maxH = Math.max(340, innerHeight - 24);
          if (settings.size && settings.size.w > maxW) settings.size.w = maxW;
          if (settings.size && settings.size.h > maxH) settings.size.h = maxH;
          if (settings.pos) {
            settings.pos.x = Math.max(-settings.size.w + 60, Math.min(innerWidth - 60, settings.pos.x));
            settings.pos.y = Math.max(0, Math.min(innerHeight - 60, settings.pos.y));
          }
          Panel.sync();
          save();
        } catch (e) {}
      }
    };

    const openDrawer = () => {
      build();
      if (drawer) drawer.classList.add('open');
      if (drawerMask) drawerMask.classList.add('open');
    };

    const watchMouse = () => {
      document.addEventListener('pointermove', e => {
        if (healed) return;
        if (e.pointerType !== 'mouse') return;
        if (settings.mobile !== 'auto') { healed = true; return; }
        if (!isEnv()) { healed = true; return; }
        healed = true;
        settings.mobile = 'off';
        save();
        apply();
        toast('检测到鼠标，已切回电脑模式');
      }, { passive: true });
    };

    return { on, reason, signals, system, apply, build, openDrawer, watchMouse };
  })();

  const mobileOn = () => Mobile.on();
  const applyMobileMode = () => Mobile.apply();
  const mobileReason = () => Mobile.reason();
  const mobileSignals = () => Mobile.signals();

  const Win = (() => {
    const list = [];
    let zTop = 2147483100;
    let seq = 0;

    const focus = w => {
      list.forEach(x => x.el.classList.remove('active'));
      w.el.classList.add('active');
      w.el.style.zIndex = ++zTop;
      const i = list.indexOf(w);
      if (i >= 0 && i !== list.length - 1) { list.splice(i, 1); list.push(w); }
    };

    const setPage = p => {
      const w = list[list.length - 1];
      if (w && w.el.isConnected) w.page = p;
    };

    const create = page => {
      const el = document.createElement('div');
      el.className = 'st-win active';
      ++seq;

      const mob = mobileOn();
      el.classList.toggle('win-mobile', mob);
      el.classList.toggle('win-desktop', !mob);

      const MIN_W = mob ? 280 : 340;
      const MIN_H = mob ? 220 : 240;
      let w, h;
      if (mob) {
        w = Math.min(innerWidth - 20, 430);
        h = Math.min(innerHeight - 120, 560);
      } else {
        const ps = settings.size || { w: 900, h: 580 };
        w = Math.min(Math.max(MIN_W, ps.w || 900), Math.max(MIN_W, innerWidth - 60));
        h = Math.min(Math.max(MIN_H, ps.h || 580), Math.max(MIN_H, innerHeight - 80));
      }
      w = Math.max(MIN_W, Math.round(w));
      h = Math.max(MIN_H, Math.round(h));
      const off = (list.length % 5) * (mob ? 22 : 30);
      const x = Math.max(10, (innerWidth - w) / 2 + off);
      const y = Math.max(mob ? 64 : 40, (innerHeight - h) / 2 - 20 + off);
      el.style.width = w + 'px'; el.style.height = h + 'px';
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.zIndex = ++zTop;
      el.innerHTML = `<div class="st-win-bar"></div>
        <div class="st-win-body st-content"></div>
        <div class="st-win-rszlayer"></div>`
        + (mob
            ? `<div class="st-win-rsz se"></div>`
            : `<div class="st-win-rsz nw"></div><div class="st-win-rsz n"></div><div class="st-win-rsz ne"></div>
               <div class="st-win-rsz w"></div><div class="st-win-rsz e"></div>
               <div class="st-win-rsz sw"></div><div class="st-win-rsz s"></div><div class="st-win-rsz se"></div>`);
      document.body.appendChild(el);

      const bar = $('.st-win-bar', el);
      const body = $('.st-win-body', el);
      bar.innerHTML = `${ic(PAGE_ICON[page] || 'info')}<span>${esc(page)}</span>
        <div class="st-win-close">${ic('close')}</div>`;

      const win = { el, body, page, x, y, w, h, mob, MIN_W, MIN_H, maxed: false, prev: null, _pid: null };
      list.push(win);

      const prev = content;
      content = body;
      try { renderPage(page); }
      catch (e) { body.innerHTML = `<div class="st-card">渲染失败：${esc(e.message)}</div>`; }
      finally { content = prev; }

      $('.st-win-close', el).addEventListener('pointerdown', e => e.stopPropagation());
      $('.st-win-close', el).addEventListener('click', e => {
        e.stopPropagation();
        el.classList.add('closing');
        const i = list.indexOf(win);
        if (i >= 0) list.splice(i, 1);
        setTimeout(() => {
          el.remove();
          if (list.length) focus(list[list.length - 1]);
        }, 200);
      });

      el.addEventListener('pointerdown', () => focus(win));

      /* 拖动 */
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, holdT = null;
      let winRaf = 0, lastEv = null;
      const SNAP = 14;

      const clampWin = (x, y, isMove) => {
        let nx = Math.max(-win.w + 60, Math.min(innerWidth - 60, x));
        let ny = Math.max(0, Math.min(innerHeight - 50, y));
        if (isMove && !win.mob && settings.snap) {
          if (nx < SNAP) nx = 0;
          else if (nx > innerWidth - win.w - SNAP) nx = innerWidth - win.w;
          if (ny < SNAP) ny = 0;
          else if (ny > innerHeight - win.h - SNAP) ny = innerHeight - win.h;
        }
        return { x: nx, y: ny };
      };

      const startDrag = (cx, cy, pid) => {
        dragging = true;
        sx = cx; sy = cy;
        ox = win.x; oy = win.y;
        el.classList.add('active', 'dragging');
        win._pid = pid;
        if (pid != null) { try { el.setPointerCapture(pid); } catch (e) {} }
        el.style.transition = 'none';
      };

      const applyMove = () => {
        if (!dragging || !lastEv) return;
        win.maxed = false;
        const p = clampWin(ox + (lastEv.clientX - sx), oy + (lastEv.clientY - sy), true);
        win.x = p.x; win.y = p.y;
        el.style.left = win.x + 'px'; el.style.top = win.y + 'px';
      };

      const onMove = e => {
        lastEv = e;
        if (winRaf) return;
        winRaf = requestAnimationFrame(() => { winRaf = 0; applyMove(); });
      };

      const onUp = pid => {
        dragging = false;
        clearTimeout(holdT); holdT = null;
        if (winRaf) { cancelAnimationFrame(winRaf); winRaf = 0; }
        el.classList.remove('dragging');
        const id = (pid != null ? pid : win._pid);
        if (id != null) { try { el.releasePointerCapture(id); } catch (e) {} }
        win._pid = null;
      };

      const toggleMax = () => {
        if (win.mob) return;
        if (win.maxed && win.prev) {
          win.w = win.prev.w; win.h = win.prev.h; win.x = win.prev.x; win.y = win.prev.y;
          win.maxed = false; win.prev = null;
          toast('已还原');
        } else {
          win.prev = { w: win.w, h: win.h, x: win.x, y: win.y };
          win.w = Math.max(win.MIN_W, Math.round(innerWidth * 0.92));
          win.h = Math.max(win.MIN_H, Math.round(innerHeight * 0.90));
          win.x = Math.round((innerWidth - win.w) / 2);
          win.y = Math.round((innerHeight - win.h) / 2);
          win.maxed = true;
          toast('已最大化');
        }
        el.style.width = win.w + 'px'; el.style.height = win.h + 'px';
        el.style.left = win.x + 'px'; el.style.top = win.y + 'px';
      };

      bar.addEventListener('pointerdown', e => {
        focus(win);
        if (e.target.closest('.st-win-close')) return;
        startDrag(e.clientX, e.clientY, e.pointerId);
        e.preventDefault();
      });
      bar.addEventListener('dblclick', e => {
        if (e.target.closest('.st-win-close')) return;
        toggleMax();
      });
      bar.addEventListener('pointermove', onMove);
      bar.addEventListener('pointerup', e => onUp(e.pointerId));
      bar.addEventListener('pointercancel', e => onUp(e.pointerId));

      const INTERACTIVE = new Set([
        'st-card','st-tile','st-btn','st-cb','st-prev-row','st-nav','st-thr-nav','st-thr-tab','st-thr-row',
        'st-blk-row','st-blk-wrap','st-blk-img','st-blk-cap','st-ext-cover','st-ext-side','st-prev-tile',
        'st-prev-side','st-prev-main','st-term-out','st-term-line','st-switch','st-tool-item',
        'st-paint-tabs','st-paint-tab','st-paint-stickers','st-paint-logos',
        'st-pl-track','st-pl-seek','st-pl-canvas','st-pl-name'
      ]);
      const isInteractive = node => {
        while (node && node !== el) {
          if (!node.classList) return false;
          for (const c of INTERACTIVE) if (node.classList.contains(c)) return true;
          const g = node.tagName;
          if (['INPUT','TEXTAREA','BUTTON','SELECT','A','LABEL','SVG','IMG','CODE'].includes(g)) return true;
          node = node.parentElement;
        }
        return false;
      };

      body.addEventListener('pointerdown', e => {
        if (isInteractive(e.target)) return;
        const px = e.clientX, py = e.clientY, pid = e.pointerId;
        let started = false;
        const begin = (cx, cy) => {
          if (started) return; started = true;
          clearTimeout(holdT); holdT = null;
          startDrag(cx, cy, pid);
        };
        holdT = setTimeout(() => begin(px, py), 260);
        const mv = ev => {
          if (started) { onMove(ev); return; }
          if (Math.hypot(ev.clientX - px, ev.clientY - py) > 6) { begin(ev.clientX, ev.clientY); onMove(ev); }
        };
        const up = () => {
          clearTimeout(holdT); holdT = null;
          if (started) onUp(pid);
          body.removeEventListener('pointermove', mv);
          body.removeEventListener('pointerup', up);
          body.removeEventListener('pointercancel', up);
        };
        body.addEventListener('pointermove', mv);
        body.addEventListener('pointerup', up);
        body.addEventListener('pointercancel', up);
      });

      /* 缩放 */
      let resizing = false, rx = 0, ry = 0, rw = 0, rh = 0, rox = 0, roy = 0, rdir = 'se';
      let rszRaf = 0, rszEv = null;
      const rszLayer = $('.st-win-rszlayer', el);

      const applyResize = () => {
        if (!resizing || !rszEv) return;
        const dx = rszEv.clientX - rx, dy = rszEv.clientY - ry;
        let nw = rw, nh = rh, nx = rox, ny = roy;
        const E = rdir.indexOf('e') >= 0, W = rdir.indexOf('w') >= 0;
        const S = rdir.indexOf('s') >= 0, N = rdir.indexOf('n') >= 0;
        if (E) nw = Math.max(win.MIN_W, rw + dx);
        if (S) nh = Math.max(win.MIN_H, rh + dy);
        if (W) { nw = Math.max(win.MIN_W, rw - dx); nx = rox + (rw - nw); }
        if (N) { nh = Math.max(win.MIN_H, rh - dy); ny = roy + (rh - nh); }
        nw = Math.min(nw, innerWidth - 10);
        nh = Math.min(nh, innerHeight - 10);
        win.w = Math.round(nw); win.h = Math.round(nh);
        win.x = Math.round(nx); win.y = Math.round(ny);
        win.maxed = false;
        el.style.width = win.w + 'px'; el.style.height = win.h + 'px';
        el.style.left = win.x + 'px'; el.style.top = win.y + 'px';
      };

      $$('.st-win-rsz', el).forEach(h => {
        const dir = ['n','s','e','w','ne','nw','se','sw'].find(c => h.classList.contains(c)) || 'se';
        h.addEventListener('pointerdown', e => {
          e.stopPropagation(); focus(win);
          resizing = true; rdir = dir;
          rx = e.clientX; ry = e.clientY;
          rw = win.w; rh = win.h; rox = win.x; roy = win.y;
          el.style.transition = 'none';
          el.classList.add('rszing');
          if (rszLayer) rszLayer.style.display = 'block';
          try { h.setPointerCapture(e.pointerId); } catch (err) {}
          e.preventDefault();
        });
        h.addEventListener('pointermove', e => {
          rszEv = e;
          if (rszRaf) return;
          rszRaf = requestAnimationFrame(() => { rszRaf = 0; applyResize(); });
        });
        const up = () => {
          resizing = false; rszEv = null;
          el.classList.remove('rszing');
          if (rszLayer) rszLayer.style.display = '';
          if (rszRaf) { cancelAnimationFrame(rszRaf); rszRaf = 0; }
        };
        h.addEventListener('pointerup', up);
        h.addEventListener('pointercancel', up);
      });

      addEventListener('resize', () => {
        if (win.maxed) {
          win.w = Math.max(win.MIN_W, Math.round(innerWidth * 0.92));
          win.h = Math.max(win.MIN_H, Math.round(innerHeight * 0.90));
          win.x = Math.round((innerWidth - win.w) / 2);
          win.y = Math.round((innerHeight - win.h) / 2);
        } else {
          win.w = Math.min(win.w, Math.max(win.MIN_W, innerWidth - 20));
          win.h = Math.min(win.h, Math.max(win.MIN_H, innerHeight - 20));
          const p = clampWin(win.x, win.y, false);
          win.x = p.x; win.y = p.y;
        }
        el.style.width = win.w + 'px'; el.style.height = win.h + 'px';
        el.style.left = win.x + 'px'; el.style.top = win.y + 'px';
      });

      applyGlass();
      toast('已打开：' + page);
      return win;
    };

    const destroyAll = () => {
      list.slice().forEach(w => { if (w.el) w.el.classList.add('closing'); });
      const snap = list.slice();
      setTimeout(() => {
        snap.forEach(w => w.el && w.el.remove());
        list.length = 0;
      }, 200);
    };

    return { list, create, destroyAll, setPage };
  })();

  const createWindow = p => Win.create(p);
  const winSetPage = p => Win.setPage(p);
  const destroyAllWindows = () => Win.destroyAll();

  /* ============================================================
   *  16. 页面渲染
   * ============================================================ */
  function renderSprites () {
    const list = allTargets();
    if (!list.length) { content.innerHTML = '<div class="st-card">未找到 VM，请打开项目编辑器</div>'; return; }
    content.innerHTML = `<h2 class="st-title">${ic('sprite')} 角色列表</h2><div class="st-grid"></div>`;
    const grid = $('.st-grid', content);
    list.forEach(t => {
      const c0 = t.sprite && t.sprite.costumes && t.sprite.costumes[0];
      const el = document.createElement('div');
      el.className = 'st-card st-tile';
      el.innerHTML = `<img src="${costumeURL(c0)}" onerror="this.style.visibility='hidden'">
        <div><b>${t.isStage ? '舞台' : esc(t.getName())}</b></div>
        <div class="st-meta">造型 ${t.sprite ? t.sprite.costumes.length : 0} · 声音 ${t.sprite ? t.sprite.sounds.length : 0} · 积木 ${blockCount(t)}</div>`;
      el.onclick = () => renderSpriteDetail(t.id);
      grid.appendChild(el);
    });
  }

  function renderSpriteDetail (id) {
    Refresh.setDetail(id);
    let t, costumes, cc, cur, clones, priv;
    try {
      t = getTarget(id);
      if (!t) return toast('角色已不存在', false);
      clones = allTargets().filter(x => x.sprite && t.sprite && x.sprite.id === t.sprite.id).length - 1;
      costumes = (t.sprite && t.sprite.costumes) || [];
      cc = Math.max(0, Math.min(t.currentCostume || 0, costumes.length - 1));
      cur = costumes[cc];
      priv = Object.values(t.variables || {}).filter(v => !v.isBroadcast);
    } catch (e) {
      console.error('[smesm666]', e);
      return toast('读取角色失败：' + e.message, false);
    }
    content.innerHTML = `
      <div class="st-row"><button class="st-btn ghost" onclick="__stGo('角色')">← 返回</button></div>
      <h2 class="st-title">${ic('clipboard')} ${esc(t.getName())}</h2>
      <div class="st-card">
        <div class="st-row">
          <img src="${costumeURL(cur)}" style="width:84px;height:64px;object-fit:contain;border-radius:8px">
          <div><div>ID：<code>${t.id.slice(0, 8)}</code></div>
          <div>积木 ${blockCount(t)} · 造型 ${costumes.length} · 声音 ${t.sprite ? t.sprite.sounds.length : 0} · 私有变量 ${priv.length} · 克隆体 ${clones}</div></div>
        </div>
        <div class="st-row">
          <button class="st-btn" id="dl-sp">${ic('variable')} 下载角色</button>
          <button class="st-btn" id="ren-sp">${ic('edit')} 重命名</button>
          ${t.isStage ? '' : `<button class="st-btn danger" id="del-sp">${ic('trash')} 删除</button>`}
        </div>
      </div>
      <h3 style="margin:14px 0 6px">私有变量</h3>
      <div class="st-card">${priv.length ? priv.map(v => `
        <div class="st-row"><span>${esc(v.name)}</span>
        <input class="st-in" type="text" value="${esc(String(v.value))}" style="width:180px">
        <button class="st-btn" data-pv="${esc(v.name)}">更新</button></div>`).join('')
        : '<div class="st-meta">无</div>'}</div>
      <h3 style="margin:14px 0 6px">造型</h3>
      <div class="st-card">${costumes.map((c, i) => `
        <div class="st-row"><span>${esc(c.name)} ${i === cc ? ic('check') + '当前' : ''}</span>
        <button class="st-btn" onclick="__st.dlCostume('${t.id}',${i})">${ic('arrowdown')}</button>
        <button class="st-btn danger" onclick="__st.delCostume('${t.id}',${i})">${ic('close')}</button></div>`).join('')
        || '<div class="st-meta">无</div>'}</div>
      <h3 style="margin:14px 0 6px">声音</h3>
      <div class="st-card">${(t.sprite ? t.sprite.sounds : []).map((s, i) => `
        <div class="st-row"><span>${esc(s.name)}</span>
        <button class="st-btn" onclick="__st.dlSound('${t.id}',${i})">${ic('arrowdown')}</button>
        <button class="st-btn danger" onclick="__st.delSound('${t.id}',${i})">${ic('close')}</button></div>`).join('')
        || '<div class="st-meta">无</div>'}</div>`;

    $$('[data-pv]', content).forEach(b => b.onclick = () => {
      const v = Object.values(t.variables).find(x => x.name === b.dataset.pv);
      try {
        v.value = v.isList ? JSON.parse(b.previousElementSibling.value) : b.previousElementSibling.value;
        toast('已更新');
      } catch (e) { toast('列表值需为 JSON 数组', false); }
    });
    $('#dl-sp', content).onclick = () => exportSprite(t);
    $('#ren-sp', content).onclick = () => {
      const n = dialog.prompt('新名字', t.getName());
      if (!n) return;
      const vm = getVM();
      if (vm.renameSprite) vm.renameSprite(t.id, n); else t.sprite.name = n;
      zipCache = null; extCache = [];
      toast('已重命名');
      renderSpriteDetail(id);
      stNotifyChange();
    };
    const del = $('#del-sp', content);
    if (del) del.onclick = () => {
      if (!dialog.confirm('删除该角色及其全部克隆体？')) return;
      getVM().deleteSprite(t.id);
      zipCache = null; extCache = [];
      toast('已删除');
      Refresh.setDetail('');
      go('角色');
      stNotifyChange();
    };
  }

  function renderVars () {
    const vm = getVM();
    if (!vm) { content.innerHTML = '<div class="st-card">未找到 VM</div>'; return; }
    content.innerHTML = `<h2 class="st-title">${ic('variable')} 变量控制器</h2>
      <input class="st-in" id="v-q" type="text" placeholder="搜索变量名 / 角色名" style="width:100%;margin-bottom:10px">
      <div id="v-box"></div>`;
    const box = $('#v-box', content), q = $('#v-q', content);

    const draw = () => {
      const kw = (q.value || '').toLowerCase();
      let html = '';
      allTargets().slice().sort((a, b) => (b.isStage ? 1 : 0) - (a.isStage ? 1 : 0)).forEach(t => {
        const hit = Object.values(t.variables || {}).filter(v =>
          v.name.toLowerCase().includes(kw) || t.getName().toLowerCase().includes(kw));
        if (!hit.length) return;
        html += `<div class="st-card"><b>${t.isStage ? ic('globe') + ' 舞台' : ic('sprite') + ' ' + esc(t.getName())}</b>`;
        html += hit.map(v => {
          const ty = v.isCloud ? '云变量' : v.isList ? '列表' : '变量';
          const val = v.isList ? JSON.stringify(v.value) : String(v.value);
          const lk = VarLock.isLocked(t.id, v.name);
          const info = lk ? VarLock.info(t.id, v.name) : null;
          const kk = t.id + '|' + v.name;
          const hitStr = info ? ` <span class="st-meta st-hit-cnt" data-hit="${esc(kk)}">`
            + '已拦截 ' + fmtHit(info.blocked)
            + (info.lastOp ? ' · ' + esc(info.lastOp) : '')
            + (info.mode ? ' · ' + esc(info.mode) : '') + '</span>' : '';
          return `<div class="st-row"><span>${esc(v.name)}</span><span class="st-meta">[${ty}]</span>
            <input class="st-in" type="text" value="${esc(val)}" style="width:200px" ${lk ? 'readonly' : ''}>
            <button class="st-btn" data-up="${esc(v.name)}" data-tid="${t.id}">更新</button>
            <button class="st-btn ${lk ? 'danger' : 'ghost'}" data-lk="${esc(v.name)}" data-tid="${t.id}"
              title="${lk ? '点击解除锁定' : '点击锁定：将在指令层拦截所有写入'}">${lk ? ic('lock') + ' 已锁定' : ic('unlock') + ' 锁定'}</button>${hitStr}
            <button class="st-btn ghost" data-rn="${esc(v.name)}" data-tid="${t.id}">${ic('edit')}</button></div>`;
        }).join('');
        html += '</div>';
      });
      box.innerHTML = html || '<div class="st-card">无匹配</div>';

      $$('[data-up]', box).forEach(b => b.onclick = () => {
        const tid = b.dataset.tid, nm = b.dataset.up;
        const v = Object.values((getTarget(tid) || {}).variables || {}).find(x => x.name === nm);
        if (!v) return toast('未找到变量', false);
        if (VarLock.isLocked(tid, nm)) return toast('该变量已锁定，请先解除', false);
        try {
          const raw = b.previousElementSibling.value;
          v.value = v.isList ? JSON.parse(raw) : raw;
          toast('已更新');
          draw();
        } catch (e) { toast('列表值需为 JSON 数组', false); }
      });

      $$('[data-lk]', box).forEach(b => b.onclick = () => {
        const tid = b.dataset.tid, nm = b.dataset.lk;
        const v = Object.values((getTarget(tid) || {}).variables || {}).find(x => x.name === nm);
        if (!v) return toast('未找到变量', false);
        if (VarLock.isLocked(tid, nm)) {
          const info = VarLock.info(tid, nm);
          const hit = info ? info.blocked : 0;
          VarLock.unlock(tid, nm);
          toast('已解除锁定：' + nm + (hit ? '（期间拦截 ' + fmtHit(hit) + ' 次写入）' : ''));
        } else {
          /* 先提交输入框里的值 */
          const row = b.closest('.st-row');
          const inp = row ? row.querySelector('input.st-in') : null;
          if (inp) {
            try {
              const nv = v.isList ? JSON.parse(inp.value) : inp.value;
              if (v.isList && !Array.isArray(nv)) throw new Error('not array');
              v.value = nv;
            } catch (e) { return toast('输入值无效', false); }
          }
          if (VarLock.lock(tid, nm)) {
            const info = VarLock.info(tid, nm);
            const shown = v.isList ? JSON.stringify(v.value) : String(v.value);
            toast('已锁定：' + nm + ' = ' + shown + '（' + ((info && info.mode) || '拦截') + '层）');
          } else toast('锁定失败', false);
        }
        draw();
      });

      $$('input.st-in', box).forEach(inp => {
        inp.addEventListener('keydown', e => {
          if (e.key !== 'Enter') return;
          const ub = inp.closest('.st-row').querySelector('[data-up]');
          if (ub) ub.click();
        });
      });

      $$('[data-rn]', box).forEach(b => b.onclick = () => {
        const tid = b.dataset.tid, oldN = b.dataset.rn;
        const n = dialog.prompt('新变量名', oldN);
        if (!n || n === oldN) return;
        const wasLocked = VarLock.isLocked(tid, oldN);
        if (wasLocked) VarLock.unlock(tid, oldN);
        if (getVM().renameVariable) getVM().renameVariable(oldN, n, getTarget(tid));
        zipCache = null; extCache = [];
        if (wasLocked) VarLock.lock(tid, n);
        toast(wasLocked ? '已重命名（保持锁定）' : '已重命名');
        stNotifyChange();
      });
    };

    q.oninput = draw;
    draw();

    /* 拦截次数定时刷新 */
    const timer = setInterval(() => {
      if (!box.isConnected) { clearInterval(timer); return; }
      $$('.st-hit-cnt[data-hit]', box).forEach(sp => {
        const k = sp.dataset.hit;
        const i = k.indexOf('|');
        if (i < 0) return;
        const info = VarLock.info(k.slice(0, i), k.slice(i + 1));
        if (!info) return;
        sp.textContent = '已拦截 ' + fmtHit(info.blocked)
          + (info.lastOp ? ' · ' + info.lastOp : '')
          + (info.mode ? ' · ' + info.mode : '');
      });
    }, 400);
  }

  function renderMessages () {
    const msgs = getBroadcasts();
    const hooked = Broadcast.installed();
    content.innerHTML = `<h2 class="st-title">${ic('message')} 消息控制器</h2>
      <div class="st-meta" style="margin-bottom:8px">拦截引擎：${hooked
        ? '<span style="color:#10b981">已启用</span>'
        : '<span style="color:#ef4444">未就绪</span>'}</div>
      <input class="st-in" id="m-q" type="text" placeholder="搜索消息名" style="width:100%;margin-bottom:10px">
      <div id="m-box"></div>`;
    const box = $('#m-box', content), q = $('#m-q', content);

    const draw = () => {
      const kw = (q.value || '').toLowerCase();
      const hit = msgs.filter(m => m.toLowerCase().includes(kw));
      box.innerHTML = hit.map(m => {
        const on = Broadcast.has(m);
        return `<div class="st-card"><b>${ic('message')} ${esc(m)}</b>
          <button class="st-btn" data-fire="${esc(m)}">触发</button>
          <button class="st-btn ${on ? 'danger' : 'ghost'}" data-blk="${esc(m)}">${on ? ic('lock') + ' 已拦截' : ic('unlock') + ' 拦截'}</button></div>`;
      }).join('') || '<div class="st-card">无匹配</div>';

      $$('[data-fire]', box).forEach(b => b.onclick = () => {
        const name = b.dataset.fire;
        if (Broadcast.has(name)) return toast('该消息已被拦截，先解除才能触发', false);
        try {
          const n = getVM().runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: name }).length;
          toast(`已广播，启动 ${n} 个线程`);
        } catch (e) { toast('触发失败：' + e.message, false); }
      });
      $$('[data-blk]', box).forEach(b => b.onclick = () => {
        const m = b.dataset.blk;
        if (Broadcast.has(m)) { Broadcast.remove(m); toast('已解除拦截'); }
        else { Broadcast.add(m); toast('已拦截：' + m); }
        draw();
      });
    };

    q.oninput = draw;
    draw();
  }

  /* --- 扩展 --- */
  const BlkRender = (() => {
    const canvas = (() => { try { return document.createElement('canvas').getContext('2d'); } catch (e) { return null; } })();
    const FONT = '600 12px "Helvetica Neue",Helvetica,Arial,"Microsoft YaHei",sans-serif';

    const measure = t => {
      if (!t) return 0;
      if (canvas) { try { canvas.font = FONT; return canvas.measureText(t).width; } catch (e) {} }
      let w = 0;
      for (const ch of String(t)) w += /[　-鿿＀-￯]/.test(ch) ? 13 : 6.6;
      return w;
    };
    const shade = (hex, amt) => {
      try {
        let h = String(hex || '').replace('#', '').trim();
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        if (h.length !== 6) return hex;
        const n = parseInt(h, 16);
        let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        const f = v => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
        r = f(r); g = f(g); b = f(b);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      } catch (e) { return hex; }
    };
    const normColour = (c, fb) => {
      if (typeof c === 'number') return '#' + c.toString(16).padStart(6, '0');
      if (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.trim())) return c.trim();
      return fb;
    };

    const parseMsg = def => {
      const msg = String(def.message0 || def.text || '');
      const args = def.args0 || [];
      const segs = [];
      if (!msg) return segs;
      const hasPercent = /%\d/.test(msg);
      if (!hasPercent && /\[[^\]]+\]/.test(msg)) {
        let last = 0, m;
        const re = /\[([^\]]+)\]/g;
        while ((m = re.exec(msg))) {
          if (m.index > last) {
            const t = msg.slice(last, m.index);
            if (t.trim()) segs.push({ t: 'text', v: t });
          }
          segs.push({ t: 'field', a: { type: 'input_value', name: m[1] } });
          last = m.index + m[0].length;
        }
        if (last < msg.length) {
          const t = msg.slice(last);
          if (t.trim()) segs.push({ t: 'text', v: t });
        }
        return segs;
      }
      const parts = msg.split(/%(\d+)/g);
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
          const idx = parseInt(parts[i], 10) - 1;
          const a = args[idx];
          if (a) segs.push({ t: 'field', a });
        } else if (parts[i]) segs.push({ t: 'text', v: parts[i] });
      }
      if (!segs.length) segs.push({ t: 'text', v: msg });
      return segs;
    };

    const svg = (def, opcode) => {
      const colour = normColour(def.colour || def.colourPrimary, '#4d97ff');
      const secondary = normColour(def.colourSecondary, shade(colour, -0.25));
      const tertiary = normColour(def.colourTertiary, shade(colour, -0.45));
      const btype = String(def.blockType || def.type || 'command').toLowerCase();
      const isHat = btype === 'hat' || btype === 'event';
      const isReporter = btype === 'reporter';
      const isBool = btype === 'boolean';
      const isButton = btype === 'button';

      const segs = parseMsg(def);
      const PAD_X = 9, GAP = 4, H = 26, TAB_W = 13, TAB_H = 4;
      let x = PAD_X;
      const body = [];

      for (const sg of segs) {
        if (sg.t === 'text') {
          const t = String(sg.v).replace(/\s+/g, ' ').trim();
          if (!t) continue;
          const w = measure(t);
          body.push(`<text x="${x}" y="${H / 2 + 4}" font-family="Helvetica Neue,Helvetica,Arial,Microsoft YaHei,sans-serif" font-size="12" font-weight="600" fill="#fff">${esc(t)}</text>`);
          x += w + GAP;
        } else {
          const a = sg.a || {};
          const at = String(a.type || '').toLowerCase();
          let label = '';
          if (a.options) { const o = a.options[0]; label = Array.isArray(o) ? String(o[1]) : String(o); }
          else if (a.name) label = String(a.name);
          const tw = measure(label) || 18;
          const cw = Math.max(22, tw + 14);
          if (at === 'field_dropdown' || a.options) {
            body.push(`<rect x="${x}" y="5" width="${cw}" height="${H - 10}" rx="${(H - 10) / 2}" fill="${tertiary}" stroke="${shade(tertiary, -0.2)}" stroke-width="1"/>`);
            body.push(`<text x="${x + cw / 2 - 5}" y="${H / 2 + 4}" text-anchor="middle" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-size="11" font-weight="600" fill="#fff">${esc(label)}</text>`);
            body.push(`<path d="M${x + cw - 9} ${H / 2 - 2} l4 4 l-4 4 z" fill="#fff" opacity=".85"/>`);
          } else if (isBool || at === 'input_boolean') {
            const bw = Math.max(26, cw);
            body.push(`<path d="M${x + 5} 4 L${x + bw - 5} 4 L${x + bw} ${H / 2} L${x + bw - 5} ${H - 4} L${x + 5} ${H - 4} L${x} ${H / 2} Z" fill="${shade(colour, -0.55)}"/>`);
          } else {
            body.push(`<rect x="${x}" y="5" width="${cw}" height="${H - 10}" rx="${(H - 10) / 2}" fill="#fff" opacity=".95"/>`);
            if (label) body.push(`<text x="${x + cw / 2}" y="${H / 2 + 4}" text-anchor="middle" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-size="11" fill="#333" opacity=".7">${esc(label)}</text>`);
          }
          x += cw + GAP;
        }
      }
      x += PAD_X;
      const W = Math.round(Math.max(58, x));
      const TOP = isHat ? 14 : 0;
      const TH = H + TOP;

      let shape;
      if (isReporter || isButton) {
        shape = `<rect x="0" y="${TOP}" width="${W}" height="${H}" rx="${H / 2}" fill="${isButton ? secondary : colour}"/>`;
      } else if (isBool) {
        shape = `<path d="M${H / 2} 0 L${W - H / 2} 0 L${W} ${H / 2} L${W - H / 2} ${H} L${H / 2} ${H} L0 ${H / 2} Z" fill="${colour}"/>`;
      } else {
        const oy = TOP;
        if (isHat) {
          shape = `<path d="M0 ${oy + 12} A ${W / 2} ${W / 6} 0 0 1 ${W} ${oy + 12} L ${W} ${oy + H} L 0 ${oy + H} Z" fill="${colour}"/>`;
        } else {
          shape = `<rect x="0" y="${oy + TAB_H}" width="${W}" height="${H - TAB_H}" rx="4" fill="${colour}"/>`;
        }
        shape += `<path d="M${TAB_W} ${oy + TAB_H} h${TAB_W} v${-TAB_H} h${-TAB_W} z" fill="${colour}"/>`;
        shape += `<rect x="${TAB_W}" y="${oy + H - TAB_H}" width="${TAB_W}" height="${TAB_H}" rx="1.5" fill="${shade(colour, -0.5)}" opacity=".55"/>`;
      }

      const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TH}" viewBox="0 0 ${W} ${TH}">${shape}${body.join('')}</svg>`;
      return { uri: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s), w: W, h: TH };
    };

    const cache = new Map();
    const img = (def, opcode) => {
      const k = opcode + '|' + JSON.stringify(def || {}).length;
      if (cache.has(k)) return cache.get(k);
      const r = svg(def || { message0: humanize(opcode || ''), colour: '#8b5cf6' }, opcode);
      cache.set(k, r);
      return r;
    };

    return { img, svg };
  })();

  function renderExtensions (retry) {
    retry = retry || 0;
    const list = collectExtensions();
    extCache = list;
    const loading = extLoadingCount();
    if (!list.length && (loading > 0 || retry < 8) && retry < 20) {
      content.innerHTML = `<h2 class="st-title">${ic('puzzle')} 扩展管理器</h2>
        <div class="st-card">等待扩展加载…（第 ${retry + 1} 次${loading ? '，仍有 ' + loading + ' 个在加载' : ''}）</div>`;
      return setTimeout(() => renderExtensions(retry + 1), 600);
    }
    content.innerHTML = `<h2 class="st-title">${ic('puzzle')} 扩展管理器</h2>
      <button class="st-btn" id="ex-exp">导出 extensions.json</button>
      <div class="st-grid" style="margin-top:10px"></div>`;
    const grid = $('.st-grid', content);
    if (!list.length) grid.innerHTML = '<div class="st-card">未检测到第三方扩展</div>';
    list.forEach(e => {
      const d = document.createElement('div');
      d.className = 'st-card st-tile';
      d.innerHTML = `<div class="st-ic-lg">${ic(EXT_ICON[e.id] || 'puzzle', 28)}</div>
        <b>${esc(e.name)}</b>
        <div class="st-meta">积木 ${e.blocks} · ${esc(e.countSource)}</div>
        <div class="st-meta">${esc(e.id)}</div>`;
      d.onclick = () => renderExtensionDetail(e.id);
      grid.appendChild(d);
    });
    $('#ex-exp', content).onclick = () => {
      download(new Blob([JSON.stringify(list.map(x => ({
        id: x.id, name: x.name, blocks: x.blocks, source: x.source, countSource: x.countSource
      })), null, 2)], { type: 'application/json' }), 'extensions.json');
      toast('已导出');
    };
  }

  function renderExtensionDetail (id) {
    Refresh.setExtDetail(id);
    const list = extCache.length ? extCache : collectExtensions();
    const e = list.find(x => x.id === id) || {
      id, name: id, blocks: 0, blockDefs: [],
      colour: '#8b5cf6', secondary: '#6d28d9', cover: '',
      countSource: 'unknown', source: 'unknown'
    };

    content.innerHTML = `<h2 class="st-title">${ic('puzzle')} 扩展详情</h2>
      <div class="st-ext-wrap">
        <div class="st-ext-side">
          <div class="st-card">
            <div class="st-ext-cover" id="ex-cover"></div>
            <div class="st-row"><button class="st-btn ghost" id="ex-back">${ic('arrowleft')} 返回列表</button></div>
            <div class="st-row">
              <button class="st-btn" id="ex-dl">${ic('image')} 下载封面</button>
              <button class="st-btn ghost" id="ex-json">${ic('file')} 导出积木</button>
            </div>
            <div class="st-row">
              <button class="st-btn ${disabledExts.has(e.id) ? '' : 'danger'}" id="ex-disable">${ic('warn')} ${disabledExts.has(e.id) ? '恢复此扩展' : '停用此扩展'}</button>
            </div>
            ${disabledExts.has(e.id) ? '<div class="st-meta" style="margin-top:4px">该扩展已停用。恢复后建议刷新页面。</div>' : ''}
            <div class="st-prev-stat" id="ex-meta"></div>
          </div>
        </div>
        <div class="st-ext-main">
          <div class="st-card">
            <b style="font-size:15px">${esc(e.name)}</b>
            <div class="st-meta">${esc(e.id)}</div>
            <div class="st-prev-size" style="margin-top:4px">共 <b>${e.blocks}</b> 个积木 · 来源 ${esc(e.countSource)}</div>
          </div>
          <div class="st-card">
            <b>积木列表</b>
            <div class="st-meta" style="margin-bottom:6px">共 ${e.blocks} 个</div>
            <div id="ex-blocks"></div>
          </div>
        </div>
      </div>`;

    const coverBox = $('#ex-cover', content);
    if (e.cover) {
      coverBox.innerHTML = `<img src="${e.cover}" onerror="this.remove()">`;
      $('#ex-dl', content).onclick = async () => {
        try {
          if (e.cover.startsWith('data:')) {
            download(toBlob(e.cover), safe(e.id) + '_cover.png');
          } else {
            const r = await fetch(e.cover);
            download(await r.blob(), safe(e.id) + '_cover.png');
          }
          toast('封面已下载');
        } catch (err) { toast('下载失败', false); }
      };
      $('#ex-meta', content).innerHTML = `积木 <b>${e.blocks}</b> 个`;
    } else {
      coverBox.style.background = `linear-gradient(135deg,${e.colour},${e.secondary})`;
      coverBox.innerHTML = ic(EXT_ICON[e.id] || 'puzzle', 54);
      $('#ex-meta', content).innerHTML = `封面 <b>无</b> · 积木 <b>${e.blocks}</b> 个`;
      const dlb = $('#ex-dl', content);
      dlb.disabled = true;
      dlb.title = '该扩展没有封面图';
    }

    $('#ex-back', content).onclick = () => { Refresh.setExtDetail(''); renderExtensions(); };
    $('#ex-json', content).onclick = () => {
      download(new Blob([JSON.stringify({
        id: e.id, name: e.name, blocks: e.blocks, source: e.source,
        countSource: e.countSource, blockDefs: e.blockDefs || []
      }, null, 2)], { type: 'application/json' }), safe(e.id) + '_blocks.json');
      toast('已导出积木定义');
    };

    const box = $('#ex-blocks', content);
    const defs = (e.blockDefs || []).filter(Boolean);
    if (!defs.length) {
      box.innerHTML = '<div class="st-meta">未能获取该扩展的积木定义</div>';
    } else {
      defs.forEach(b => {
        const op = b.opcode || b.type || '';
        const def = Object.assign({}, b);
        if (!def.colour) def.colour = e.colour;
        if (!def.colourSecondary) def.colourSecondary = e.secondary;
        const img = BlkRender.img(def, op);
        const w = document.createElement('div');
        w.className = 'st-blk-wrap';
        w.title = '点击：跳到编辑器积木栏中的这块积木';
        w.innerHTML = `<img class="st-blk-img" src="${img.uri}" alt="${esc(op)}">
          <div class="st-blk-cap">${esc(op)}</div>`;
        w.addEventListener('click', () => jumpToBlock(op, e.name || e.id));
        box.appendChild(w);
      });
    }

    const dis = $('#ex-disable', content);
    if (dis) dis.onclick = () => {
      if (disabledExts.has(e.id)) {
        disabledExts.delete(e.id);
        extCache = [];
        refreshToolbox();
        toast('已恢复；建议刷新页面');
        renderExtensionDetail(e.id);
        return;
      }
      if (!dialog.confirm('确定停用扩展「' + e.id + '」吗？\n\n将注销积木定义、销毁已用积木、从积木栏移除。建议先保存作品。')) return;
      disableExtension(e.id);
      renderExtensionDetail(e.id);
    };
  }

  function jumpToBlock (opcode, extName) {
    const B = window.Blockly || window.ScratchBlocks;
    if (!B || typeof B.getMainWorkspace !== 'function') return toast('未找到 Blockly', false);
    const ws = B.getMainWorkspace();
    if (!ws) return toast('未找到工作区', false);

    const fly = (() => { try { return ws.getFlyout && ws.getFlyout(); } catch (e) { return null; } })();
    const flyWs = fly ? (fly.workspace_ || fly) : null;

    const find = () => {
      if (!flyWs) return null;
      try {
        const all = typeof flyWs.getAllBlocks === 'function' ? flyWs.getAllBlocks() : [];
        return all.find(b => b.type === opcode) || null;
      } catch (e) { return null; }
    };

    const jump = tb => {
      try {
        const root = tb.getSvgRoot && tb.getSvgRoot();
        if (!root) return toast('该积木未渲染', false);
        try { root.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
        root.classList.add('st-blk-flash');
        setTimeout(() => root.classList.remove('st-blk-flash'), 1800);
        toast('已定位到积木');
      } catch (e) { toast('定位失败：' + e.message, false); }
    };

    let target = find();
    if (target) return jump(target);

    /* 工作区里已使用 */
    try {
      const all = typeof ws.getAllBlocks === 'function' ? ws.getAllBlocks() : [];
      const b = all.find(x => x.type === opcode);
      if (b) { jump(b); return; }
    } catch (e) {}

    toast('该积木未在积木栏中渲染，请先手动点开它的分类', false);
  }

  function disableExtension (id) {
    const ops = (() => {
      const set = [];
      try {
        for (const e of (extCache || collectExtensions())) {
          if (e.id === id && e.blockDefs) e.blockDefs.forEach(b => { if (b.opcode) set.push(b.opcode); });
        }
      } catch (err) {}
      return set;
    })();

    const B = window.Blockly || window.ScratchBlocks;
    let killed = 0, disposed = 0, containers = 0;

    if (B && B.Blocks) {
      ops.forEach(op => { if (B.Blocks[op]) { try { delete B.Blocks[op]; killed++; } catch (e) {} } });
    }

    try {
      const ws = B && B.getMainWorkspace && B.getMainWorkspace();
      if (ws && typeof ws.getAllBlocks === 'function') {
        ws.getAllBlocks().forEach(b => {
          if (ops.includes(b.type)) {
            try { b.dispose && b.dispose(); disposed++; } catch (e) {}
          }
        });
      }
    } catch (e) {}

    const vm = getVM();
    const EM = vm && (vm.extensionManager || (vm.runtime && vm.runtime.extensionManager));
    const delFrom = (container, key) => {
      try {
        if (!container) return;
        if (container instanceof Map) { if (container.delete && container.has(key)) { container.delete(key); containers++; } }
        else if (container instanceof Set) { if (container.delete(key)) containers++; }
        else if (typeof container === 'object' && container[key]) { delete container[key]; containers++; }
      } catch (e) {}
    };
    if (EM) {
      ['extensions','loadedExtensions','_loadedExtensions','extensionObjects','builtinExtensions','loadedURLs','_loadingExtensions']
        .forEach(k => delFrom(EM[k], id));
    }
    if (vm) {
      delFrom(vm.runtime && vm.runtime.extensions, id);
      delFrom(vm.extensions, id);
      delFrom(vm.runtime && vm.runtime.extensionStorage, id);
      delFrom(vm.runtime && vm.runtime._extensionStorage, id);
    }

    disabledExts.add(id);
    refreshToolbox();
    extCache = [];

    toast('已停用「' + id + '」：注销 ' + killed + ' · 销毁 ' + disposed + ' · 清理 ' + containers);
  }

  function refreshToolbox () {
    const vm = getVM();
    if (!vm) return false;
    let done = false;
    if (typeof vm.emitWorkspaceUpdate === 'function') {
      try { vm.emitWorkspaceUpdate(); done = true; } catch (e) {}
    }
    if (vm.runtime) {
      try { if (vm.runtime.emitTargetsUpdate) vm.runtime.emitTargetsUpdate(); } catch (e) {}
      try { if (vm.runtime.emit) vm.runtime.emit('PROJECT_CHANGED'); } catch (e) {}
    }
    const B = window.Blockly || window.ScratchBlocks;
    const ws = B && B.getMainWorkspace && B.getMainWorkspace();
    if (ws && typeof ws.updateToolbox === 'function' && vm.runtime && typeof vm.runtime.getBlocksXML === 'function' && B.Xml) {
      try { ws.updateToolbox(vm.runtime.getBlocksXML(vm.runtime.targets[0])); done = true; } catch (e) {}
    }
    return done;
  }

  /* --- 图片下载 --- */
  function renderImages () {
    const list = spritesOnly();
    content.innerHTML = `<h2 class="st-title">${ic('image')} 图片下载</h2>
      <div class="st-row">
        <input class="st-in" id="i-q" type="text" placeholder="按角色名 / 造型名过滤" style="width:240px">
        <label class="st-row"><input type="checkbox" id="i-all"> 全选</label>
        <span id="i-n" class="st-meta">已选 0</span>
        <button class="st-btn" id="i-dl" disabled>下载选中</button>
      </div><div class="st-grid" id="i-g"></div>`;
    const grid = $('#i-g', content), q = $('#i-q', content);
    const cnt = $('#i-n', content), dl = $('#i-dl', content);
    const sel = new Set();

    const draw = () => {
      const kw = (q.value || '').toLowerCase();
      grid.innerHTML = '';
      list.forEach(t => (t.sprite ? t.sprite.costumes : []).forEach((c, i) => {
        if (kw && !(t.getName().toLowerCase().includes(kw) || c.name.toLowerCase().includes(kw))) return;
        const k = t.id + '#' + i;
        const el = document.createElement('div');
        el.className = 'st-card st-tile';
        el.style.position = 'relative';
        el.innerHTML = `<input type="checkbox" data-k="${k}" ${sel.has(k) ? 'checked' : ''}
            style="position:absolute;left:6px;top:6px;width:16px;height:16px">
          <img src="${costumeURL(c)}"><div><b>${esc(c.name)}</b></div>
          <div class="st-meta">${esc(t.getName())}</div>`;
        $('input[type=checkbox]', el).onchange = e => { e.target.checked ? sel.add(k) : sel.delete(k); upd(); };
        el.onclick = e => { if (e.target.tagName !== 'INPUT') downloadCostume(t, c); };
        grid.appendChild(el);
      }));
      upd();
    };
    const upd = () => { cnt.textContent = '已选 ' + sel.size; dl.disabled = sel.size === 0; };

    q.oninput = draw;
    $('#i-all', content).onchange = e => {
      sel.clear();
      if (e.target.checked) list.forEach(t => (t.sprite ? t.sprite.costumes : []).forEach((c, i) => sel.add(t.id + '#' + i)));
      draw();
    };
    dl.onclick = async () => {
      const zip = new JSZip();
      for (const k of sel) {
        const [id, i] = k.split('#');
        const t = list.find(x => x.id === id);
        const c = t.sprite.costumes[+i];
        const u = costumeURL(c);
        if (u) zip.folder(safe(t.getName())).file(`${safe(c.name)}.${c.dataFormat || 'png'}`, toBlob(u));
      }
      toast('打包中…');
      download(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), 'selected_images.zip');
      toast('已下载');
    };
    draw();
  }

  function renderSpriteDownload () {
    const list = spritesOnly();
    content.innerHTML = `<h2 class="st-title">${ic('variable')} 角色下载</h2>
      <div class="st-row">
        <input class="st-in" id="s-q" type="text" placeholder="按角色名过滤" style="width:240px">
        <label class="st-row"><input type="checkbox" id="s-all"> 全选</label>
        <span id="s-n" class="st-meta">已选 0</span>
        <button class="st-btn" id="s-dl" disabled>下载选中</button>
      </div><div id="s-l"></div>`;
    const box = $('#s-l', content), q = $('#s-q', content);
    const sel = new Set();

    const draw = () => {
      const kw = (q.value || '').toLowerCase();
      box.innerHTML = '';
      list.filter(t => t.getName().toLowerCase().includes(kw)).forEach(t => {
        const el = document.createElement('div');
        el.className = 'st-card';
        el.innerHTML = `<div class="st-row">
          <input type="checkbox" data-id="${t.id}" ${sel.has(t.id) ? 'checked' : ''}>
          <img src="${costumeURL(t.sprite && t.sprite.costumes[0])}" style="width:44px;height:34px;object-fit:contain;border-radius:6px">
          <b>${esc(t.getName())}</b>
          <span class="st-meta">积木 ${blockCount(t)} · 造型 ${t.sprite ? t.sprite.costumes.length : 0} · 声音 ${t.sprite ? t.sprite.sounds.length : 0}</span>
          <button class="st-btn" data-one="${t.id}">${ic('arrowdown')} 单独下载</button></div>`;
        $('input[type=checkbox]', el).onchange = e => { e.target.checked ? sel.add(t.id) : sel.delete(t.id); upd(); };
        $('[data-one]', el).onclick = () => exportSprite(t);
        box.appendChild(el);
      });
      upd();
    };
    const upd = () => { $('#s-n', content).textContent = '已选 ' + sel.size; $('#s-dl', content).disabled = sel.size === 0; };

    q.oninput = draw;
    $('#s-all', content).onchange = e => { sel.clear(); if (e.target.checked) list.forEach(t => sel.add(t.id)); draw(); };
    $('#s-dl', content).onclick = async () => {
      const zip = new JSZip();
      for (const id of sel) {
        const t = list.find(x => x.id === id);
        zip.file(`${safe(t.getName())}.sprite3`, await sprite3Of(t));
      }
      toast('打包中…');
      download(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), 'selected_sprites.zip');
      toast('已下载');
    };
    draw();
  }

  function renderDownloadCenter () {
    content.innerHTML = `<h2 class="st-title">${ic('download')} 下载中心</h2><div class="st-grid">
      <div class="st-card" style="text-align:center"><div class="st-ic-lg">${ic('image', 34)}</div><b>全部图片 zip</b>
        <div class="st-meta">按角色分文件夹</div>
        <button class="st-btn" id="dc-i">${ic('download')} 下载</button>
        <button class="st-btn ghost" id="dc-ip">${ic('image')} 预览</button></div>
      <div class="st-card" style="text-align:center"><div class="st-ic-lg">${ic('sprite', 34)}</div><b>全部角色 zip</b>
        <div class="st-meta">导出为多个 .sprite3</div>
        <button class="st-btn" id="dc-s">${ic('download')} 下载</button>
        <button class="st-btn ghost" id="dc-sp">${ic('sprite')} 预览</button></div>
      <div class="st-card" style="text-align:center"><div class="st-ic-lg">${ic('file', 34)}</div><b>作品 HTML</b>
        <div class="st-meta">内嵌 base64</div>
        <button class="st-btn" id="dc-h">${ic('download')} 下载</button></div>
      <div class="st-card" style="text-align:center"><div class="st-ic-lg">${ic('save', 34)}</div><b>作品 SB3</b>
        <div class="st-meta">完整项目文件</div>
        <button class="st-btn" id="dc-b">${ic('download')} 下载</button></div></div>`;
    $('#dc-i', content).onclick = async () => {
      const zip = new JSZip();
      for (const t of spritesOnly()) {
        const f = zip.folder(safe(t.getName()));
        for (const c of (t.sprite ? t.sprite.costumes : [])) {
          const u = costumeURL(c);
          if (u) f.file(`${safe(c.name)}.${c.dataFormat || 'png'}`, toBlob(u));
        }
      }
      download(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), 'all_images.zip');
      toast('已下载全部图片');
    };
    $('#dc-s', content).onclick = async () => {
      const zip = new JSZip();
      for (const t of spritesOnly()) zip.file(`${safe(t.getName())}.sprite3`, await sprite3Of(t));
      download(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), 'all_sprites.zip');
      toast('已下载全部角色');
    };
    $('#dc-ip', content).onclick = () => renderImagePreview();
    $('#dc-sp', content).onclick = () => renderSpritePreview();
    $('#dc-h', content).onclick = async () => {
      const sb3 = await getVM().saveProjectSb3();
      const b64 = await blobToB64(new Blob([sb3]));
      const html = `<!doctype html><meta charset="utf-8"><title>smesm666 Project</title>
<body style="background:#111;color:#fff;font:14px system-ui;padding:24px">
<h2>Scratch 项目</h2>
<a id="d" download="project.sb3" href="data:application/x.scratch.sb3;base64,${b64}">点击下载 SB3</a>
<script>document.getElementById('d').click()<\/script>`;
      download(new Blob([html], { type: 'text/html' }), 'project.html');
      toast('已生成 HTML');
    };
    $('#dc-b', content).onclick = async () => {
      download(new Blob([await getVM().saveProjectSb3()], { type: 'application/x.scratch.sb3' }), 'project.sb3');
      toast('已导出 SB3');
    };
  }

  /* --- 预览 --- */
  let imgCache = null, imgSel = null;
  let sprCache = null, sprSel = null;

  const buildImageList = () => {
    const out = [];
    for (const t of spritesOnly()) {
      const cs = (t.sprite && t.sprite.costumes) || [];
      cs.forEach((c, i) => {
        const u = costumeURL(c);
        const blob = u ? toBlob(u) : null;
        out.push({
          key: t.id + '#' + i, tid: t.id, idx: i, url: u, blob,
          size: blob ? blob.size : 0,
          name: c.name, sprite: t.getName(),
          fmt: (c.dataFormat || 'png').replace('image/', '')
        });
      });
    }
    return out;
  };

  const buildSpriteMeta = () => spritesOnly().map(t => ({
    id: t.id, name: t.getName(),
    thumb: costumeURL(t.sprite && t.sprite.costumes && t.sprite.costumes[0]),
    costumes: t.sprite ? t.sprite.costumes.length : 0,
    sounds: t.sprite ? t.sprite.sounds.length : 0,
    blocks: blockCount(t),
    size: null, blob: null
  }));

  async function renderImagePreview () {
    Refresh.setPreview('img');
    winSetPage('__img');
    content.innerHTML = `<h2 class="st-title">${ic('image')} 全部图片预览</h2>
      <div class="st-prev-wrap">
        <div class="st-prev-side">
          <div class="st-card">
            <div class="st-row"><button class="st-btn ghost" id="pv-back">${ic('arrowleft')} 返回</button></div>
            <div class="st-row"><label><input type="checkbox" id="pv-all" checked> 全选</label></div>
            <div class="st-row"><button class="st-btn" id="pv-dl">${ic('download')} 下载选中</button></div>
            <div class="st-prev-stat" id="pv-stat">加载中…</div>
            <div class="st-row"><input class="st-in" id="pv-q" type="text" placeholder="搜索" style="width:100%"></div>
          </div>
        </div>
        <div class="st-prev-main"><div class="st-grid" id="pv-grid"></div></div>
      </div>`;

    if (!imgCache || imgCache.sig !== projectSig()) {
      const list0 = buildImageList();
      imgCache = { sig: projectSig(), list: list0 };
      imgSel = new Set(list0.map(x => x.key));
    }
    const list = imgCache.list;
    if (!imgSel) imgSel = new Set(list.map(x => x.key));
    const sel = imgSel;

    const grid = $('#pv-grid', content), stat = $('#pv-stat', content), q = $('#pv-q', content);

    const updStat = () => {
      let n = 0, sz = 0;
      list.forEach(x => { if (sel.has(x.key)) { n++; sz += x.size; } });
      stat.innerHTML = `已选 <b>${n}</b> / 共 ${list.length} 张<br>合计 <b>${fmtSize(sz)}</b>`;
      $('#pv-dl', content).disabled = n === 0;
    };

    const draw = () => {
      const kw = (q.value || '').toLowerCase();
      grid.innerHTML = '';
      const hit = list.filter(x => !kw || x.sprite.toLowerCase().includes(kw) || x.name.toLowerCase().includes(kw));
      if (!hit.length) grid.innerHTML = '<div class="st-card">无匹配</div>';
      hit.forEach(x => {
        const on = sel.has(x.key);
        const el = document.createElement('div');
        el.className = 'st-card st-prev-tile' + (on ? ' sel' : ' off');
        el.innerHTML = `<input type="checkbox" class="st-cb" ${on ? 'checked' : ''}>
          <img src="${x.url}" onerror="this.style.visibility='hidden'">
          <div><b>${esc(x.name)}</b></div>
          <div class="st-meta">${esc(x.sprite)}</div>
          <div class="st-prev-size">${fmtSize(x.size)} · ${x.fmt}</div>`;
        const cb = $('.st-cb', el);
        cb.onclick = e => {
          e.stopPropagation();
          cb.checked ? sel.add(x.key) : sel.delete(x.key);
          el.classList.toggle('sel', cb.checked);
          el.classList.toggle('off', !cb.checked);
          updStat();
        };
        el.onclick = () => {
          if (sel.has(x.key)) sel.delete(x.key); else sel.add(x.key);
          const n = sel.has(x.key);
          cb.checked = n;
          el.classList.toggle('sel', n);
          el.classList.toggle('off', !n);
          updStat();
        };
        grid.appendChild(el);
      });
      updStat();
    };

    $('#pv-back', content).onclick = () => { Refresh.setPreview(''); go('下载中心'); };
    $('#pv-all', content).onchange = e => {
      sel.clear();
      if (e.target.checked) list.forEach(x => sel.add(x.key));
      draw();
    };
    q.oninput = draw;
    $('#pv-dl', content).onclick = async () => {
      const zip = new JSZip();
      let n = 0;
      for (const x of list) {
        if (!sel.has(x.key) || !x.blob) continue;
        zip.folder(safe(x.sprite)).file(`${safe(x.name)}.${x.fmt}`, x.blob);
        n++;
      }
      if (!n) return toast('没有选中任何图片', false);
      toast(`打包 ${n} 张图片…`);
      download(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), 'all_images.zip');
      toast('已下载');
    };
    draw();
  }

  async function renderSpritePreview () {
    Refresh.setPreview('spr');
    winSetPage('__spr');
    const myToken = Refresh.token();

    if (!sprCache || sprCache.sig !== projectSig()) {
      sprCache = { sig: projectSig(), list: buildSpriteMeta() };
      sprSel = new Set(sprCache.list.map(x => x.id));
    }
    const list = sprCache.list;
    if (!sprSel) sprSel = new Set(list.map(x => x.id));
    const sel = sprSel;

    content.innerHTML = `<h2 class="st-title">${ic('sprite')} 全部角色预览</h2>
      <div class="st-prev-wrap">
        <div class="st-prev-side">
          <div class="st-card">
            <div class="st-row"><button class="st-btn ghost" id="pv-back">${ic('arrowleft')} 返回</button></div>
            <div class="st-row"><label><input type="checkbox" id="pv-all" checked> 全选</label></div>
            <div class="st-row"><button class="st-btn" id="pv-dl">${ic('download')} 下载选中</button></div>
            <div class="st-row"><button class="st-btn ghost" id="pv-size">${ic('save')} 计算大小</button></div>
            <div class="st-prev-stat" id="pv-stat"></div>
            <div class="st-row"><input class="st-in" id="pv-q" type="text" placeholder="搜索角色名" style="width:100%"></div>
          </div>
        </div>
        <div class="st-prev-main"><div class="st-card" id="pv-list"></div></div>
      </div>`;

    $('#pv-back', content).onclick = () => { Refresh.setPreview(''); go('下载中心'); };
    const box = $('#pv-list', content), stat = $('#pv-stat', content), q = $('#pv-q', content);

    const updStat = () => {
      let n = 0, sz = 0, pending = 0;
      list.forEach(x => {
        if (!sel.has(x.id)) return;
        n++;
        if (x.size == null) pending++;
        else if (x.size > 0) sz += x.size;
      });
      stat.innerHTML = `已选 <b>${n}</b> / 共 ${list.length} 个<br>`
        + (pending ? `计算中 ${pending} 个…<br>已统计 <b>${fmtSize(sz)}</b>` : `合计 <b>${fmtSize(sz)}</b>`);
      $('#pv-dl', content).disabled = n === 0;
    };

    const draw = () => {
      const kw = (q.value || '').toLowerCase();
      box.innerHTML = '';
      const hit = list.filter(x => !kw || x.name.toLowerCase().includes(kw));
      if (!hit.length) { box.innerHTML = '<div class="st-meta">无匹配</div>'; updStat(); return; }
      hit.forEach(x => {
        const on = sel.has(x.id);
        const el = document.createElement('div');
        el.className = 'st-prev-row' + (on ? '' : ' off');
        el.style.cursor = 'pointer';
        el.dataset.sid = x.id;
        const sizeTxt = x.size == null ? '<span style="opacity:.6">计算中…</span>'
          : x.size < 0 ? '<span style="opacity:.6">-</span>' : fmtSize(x.size);
        el.innerHTML = `<input type="checkbox" class="st-cb" ${on ? 'checked' : ''}>
          <img src="${x.thumb}" onerror="this.style.visibility='hidden'">
          <div class="grow"><b>${esc(x.name)}</b>
            <div class="st-meta">积木 ${x.blocks} · 造型 ${x.costumes} · 声音 ${x.sounds}</div></div>
          <div class="st-prev-size js-size">${sizeTxt}</div>`;
        const cb = $('.st-cb', el);
        cb.onclick = e => {
          e.stopPropagation();
          cb.checked ? sel.add(x.id) : sel.delete(x.id);
          el.classList.toggle('off', !cb.checked);
          updStat();
        };
        el.onclick = () => {
          if (sel.has(x.id)) sel.delete(x.id); else sel.add(x.id);
          const n = sel.has(x.id);
          cb.checked = n;
          el.classList.toggle('off', !n);
          updStat();
        };
        box.appendChild(el);
      });
      updStat();
    };

    const calcSizes = async force => {
      const btn = $('#pv-size', content);
      if (btn) { btn.disabled = true; btn.textContent = '计算中…'; }
      await getProjectJSON();
      for (const m of list) {
        if (myToken !== Refresh.curToken()) return;
        if (!force && m.size != null) continue;
        if (!panel.isConnected || !isOpen) return;
        const t = getTarget(m.id);
        if (!t) { m.size = -1; continue; }
        try {
          const json = await sprite3Of(t);
          const blob = new Blob([json], { type: 'application/json' });
          m.size = blob.size; m.blob = blob;
        } catch (e) { m.size = -1; }
        const row = $(`.st-prev-row[data-sid="${m.id}"] .js-size`, box);
        if (row) row.textContent = m.size < 0 ? '-' : fmtSize(m.size);
        updStat();
        await sleep(0);
      }
      if (btn) { btn.disabled = false; btn.innerHTML = ic('save') + ' 重新计算'; }
      if (myToken === Refresh.curToken()) toast('大小统计完成');
    };

    $('#pv-size', content).onclick = () => calcSizes(true);
    $('#pv-all', content).onchange = e => {
      sel.clear();
      if (e.target.checked) list.forEach(x => sel.add(x.id));
      draw();
    };
    q.oninput = draw;
    $('#pv-dl', content).onclick = async () => {
      const zip = new JSZip();
      let n = 0, miss = 0;
      for (const x of list) {
        if (!sel.has(x.id)) continue;
        let blob = x.blob;
        if (!blob) {
          const t = getTarget(x.id);
          if (!t) continue;
          try {
            const json = await sprite3Of(t);
            blob = new Blob([json], { type: 'application/json' });
          } catch (e) { miss++; continue; }
        }
        zip.file(`${safe(x.name)}.sprite3`, blob);
        n++;
      }
      if (!n) return toast('没有选中任何角色', false);
      toast(`打包 ${n} 个角色…`);
      download(await zip.generateAsync({ type: 'blob', compression: 'STORE' }), 'all_sprites.zip');
      toast('已下载' + (miss ? `（${miss} 个失败）` : ''));
    };

    draw();
    calcSizes(false);
  }

  window.__stClearPrevCache = () => {
    imgCache = null; sprCache = null; imgSel = null; sprSel = null;
    pjCache = null; pjSig = '';
  };

  /* --- 导出 --- */
  let ST_DIR = null;

  const writeOut = async (blob, name) => {
    try {
      if (ST_DIR) {
        const fh = await ST_DIR.getFileHandle(name, { create: true });
        const w = await fh.createWritable();
        await w.write(blob); await w.close();
        toast('已保存：' + name);
        return;
      }
    } catch (e) {}
    download(blob, name);
  };

  const sprite3Of = async t => {
    let target = null;
    try {
      const json = await getProjectJSON();
      if (json && json.targets)
        target = json.targets.find(x => x.name === t.getName()) || json.targets.find(x => !x.isStage);
    } catch (e) {}
    return JSON.stringify({
      targets: [target || {
        isStage: false, name: t.getName(), variables: t.variables || {},
        blocks: t.blocks && t.blocks._blocks,
        costumes: t.sprite ? t.sprite.costumes : [],
        sounds: t.sprite ? t.sprite.sounds : [],
        currentCostume: t.currentCostume || 0
      }],
      monitors: [], extensions: [],
      meta: { semver: '3.0.0', vm: 'smesm666', agent: 'smesm666' }
    });
  };

  const exportSprite = async t => {
    await writeOut(new Blob([await sprite3Of(t)], { type: 'application/json' }), `${safe(t.getName())}.sprite3`);
    toast('已导出 ' + t.getName());
  };

  const downloadCostume = (t, c) => {
    const u = costumeURL(c);
    if (!u) return toast('无法获取图片', false);
    writeOut(toBlob(u), `${safe(c.name)}.${c.dataFormat || 'png'}`);
    toast('已下载 ' + c.name);
  };

  /* --- 水印 --- */
  let wmEl = null;
  const drawWM = () => {
    if (wmEl) { wmEl.remove(); wmEl = null; }
    if (!settings.wmOn) return;
    const cv = document.querySelector('.stage_stage canvas') ||
               document.querySelector('[class*=stage] canvas') || document.querySelector('canvas');
    if (!cv || !cv.parentElement) return;
    const parent = cv.parentElement;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    if (settings.wmImg) {
      wmEl = document.createElement('img');
      wmEl.src = settings.wmImg;
      wmEl.style.cssText = `position:absolute;left:50%;top:50%;max-width:40%;
        transform:translate(-50%,-50%) rotate(${settings.wmRotate}deg);
        opacity:${settings.wmOpacity / 100};pointer-events:none;z-index:9999`;
    } else {
      wmEl = document.createElement('div');
      wmEl.textContent = settings.wmText || 'smesm666';
      wmEl.style.cssText = `position:absolute;left:50%;top:50%;
        transform:translate(-50%,-50%) rotate(${settings.wmRotate}deg);
        color:${settings.wmColor};font-size:${settings.wmSize}px;font-weight:800;
        opacity:${settings.wmOpacity / 100};pointer-events:none;z-index:9999;white-space:nowrap;
        text-shadow:0 2px 10px rgba(0,0,0,.6)`;
    }
    wmEl.className = 'st-watermark';
    parent.appendChild(wmEl);
  };
  setInterval(() => { if (settings.wmOn) drawWM(); }, 800);

  /* --- 关于 / 设置 --- */
  function renderAbout () {
    content.innerHTML = `<h2 class="st-title">关于</h2><div class="st-card">
      <div style="font:700 24px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.5px;color:#e6e6e8">smesm666</div>
      <div class="st-meta" style="margin-top:6px">v${VERSION} · 内核：${KERNEL}</div>
      <div class="st-meta">SB3 拆解 · VM 原生 API · 通用 VM 探测</div>
      <div style="margin-top:10px">快捷键：<code>Esc</code> 关闭 · 空白处长按拖动 · 边缘拖拽缩放 · 双击标题栏最大化</div>
      <div class="st-meta" style="margin-top:8px">
        VM 来源：<code>${esc(VM.source() || '未检测到')}</code><br>
        平台：<code>${esc(location.hostname)}</code><br>
        界面模式：<b>${mobileOn() ? '手机' : '电脑'}</b> — ${esc(mobileReason())}<br>
        白名单：<b style="color:${inWhitelist() ? '#10b981' : '#ef4444'}">${inWhitelist() ? '已启用' : '不在白名单'}</b>
      </div>
      <div class="st-row" style="margin-top:10px">
        <button class="st-btn ghost" id="ab-mob">切换手机/电脑模式</button>
        <button class="st-btn ghost" id="ab-log">打印环境信息</button>
      </div>
      </div>`;
    $('#ab-mob', content).onclick = () => {
      settings.mobile = mobileOn() ? 'off' : 'on';
      save(); applyMobileMode();
      toast('已切换为：' + (mobileOn() ? '手机模式' : '电脑模式'));
      renderAbout();
    };
    $('#ab-log', content).onclick = () => {
      console.table ? console.table({
        模式: mobileOn() ? '手机' : '电脑',
        判定依据: mobileReason(),
        视口: innerWidth + 'x' + innerHeight,
        VM: VM.source() || '未检测到'
      }) : console.log(mobileOn(), mobileReason());
      toast('已打印到控制台');
    };
  }

  function renderSettings () {
    content.innerHTML = `
      <h2 class="st-title">${ic('gear')} 设置</h2>
      <div class="st-card"><b>主题配色</b><div class="st-row">
        ${Object.keys(THEMES).map(k => `<button class="st-btn" data-th="${k}"
          style="background:linear-gradient(135deg,${THEMES[k][0]},${THEMES[k][1]});border-color:transparent">${k}</button>`).join('')}
      </div></div>
      <div class="st-card"><b>弹窗背景</b>
        <div class="st-row" id="bg-grid" style="gap:8px"></div>
        <div class="st-row">
          <button class="st-btn ghost" id="bg-imp">${ic('image')} 导入背景图</button>
          <button class="st-btn ghost" id="bg-clr" ${settings.bgImage ? '' : 'disabled'}>${ic('close')} 清除</button>
          <input type="file" id="bg-file" accept="image/*" style="display:none">
        </div>
        <div class="st-row" style="opacity:${settings.bgImage ? 1 : .35}">
          <span>铺满</span><select class="st-in" id="bg-fit">
            <option value="cover"${settings.bgFit === 'cover' ? ' selected' : ''}>等比覆盖</option>
            <option value="contain"${settings.bgFit === 'contain' ? ' selected' : ''}>完整显示</option>
            <option value="stretch"${settings.bgFit === 'stretch' ? ' selected' : ''}>拉伸铺满</option>
            <option value="repeat"${settings.bgFit === 'repeat' ? ' selected' : ''}>平铺</option></select>
          <span>位置</span><select class="st-in" id="bg-pos">
            ${['center','top','bottom','left','right','top left','top right','bottom left','bottom right']
              .map(p => `<option value="${p}"${settings.bgPos === p ? ' selected' : ''}>${p}</option>`).join('')}</select>
          <span>缩放</span><input type="range" id="bg-size" min="10" max="200" value="${settings.bgSize}">
          <span id="sz-v">${settings.bgSize}%</span>
        </div>
      </div>
      <div class="st-card">
        <div class="st-row"><span>透明度</span><input id="set-a" type="range" min="30" max="100" value="${settings.alpha}"><span id="a-v">${settings.alpha}%</span></div>
        <div class="st-row"><span>模糊度</span><input id="set-b" type="range" min="0" max="60" value="${settings.blur}"><span id="b-v">${settings.blur}px</span></div>
      </div>
      <div class="st-card"><b>面板交互</b>
        <div class="st-row"><span>长按拖动</span><input id="set-h" type="range" min="80" max="600" step="20" value="${settings.holdMs}"><span id="h-v">${settings.holdMs}ms</span></div>
        <div class="st-row"><span>移动阈值</span><input id="set-t" type="range" min="3" max="20" value="${settings.moveTh}"><span id="t-v">${settings.moveTh}px</span></div>
        <div class="st-row">
          <label><input type="checkbox" id="set-snap"${settings.snap ? ' checked' : ''}> 边缘吸附</label>
          <label><input type="checkbox" id="set-tip"${settings.showTip ? ' checked' : ''}> 尺寸提示</label>
          <label><input type="checkbox" id="set-col"${settings.sidebarCollapsed ? ' checked' : ''}> 折叠侧栏</label>
        </div>
      </div>
      <div class="st-card"><b>舞台水印</b>
        <div class="st-row">
          <label><input type="checkbox" id="wm-on"${settings.wmOn ? ' checked' : ''}> 启用</label>
          <input class="st-in" id="wm-t" type="text" value="${esc(settings.wmText)}" placeholder="水印文字">
          <input type="color" id="wm-c" value="${settings.wmColor}">
          <input type="number" id="wm-s" min="12" max="120" value="${settings.wmSize}" style="width:70px">
          <button class="st-btn ghost" id="wm-img">图片水印</button>
          <input type="file" id="wm-file" accept="image/*" style="display:none">
        </div>
        <div class="st-row">
          <span>旋转</span><input id="wm-r" type="range" min="-180" max="180" value="${settings.wmRotate}"><span id="r-v">${settings.wmRotate}°</span>
          <span>透明度</span><input id="wm-o" type="range" min="5" max="100" value="${settings.wmOpacity}"><span id="o-v">${settings.wmOpacity}%</span>
        </div>
      </div>
      <div class="st-card"><b>域名白名单</b>
        <div class="st-meta">
          当前站点：<b style="color:${inWhitelist() ? '#10b981' : '#ef4444'}">${esc(location.hostname)}</b>
          ${inWhitelist() ? '（已启用）' : '（不在白名单）'}
        </div>
        <div class="st-row" style="flex-wrap:wrap;gap:4px;margin-top:6px">
          ${HOST_WHITELIST.map(h =>
            `<span class="st-meta" style="padding:3px 8px;border-radius:8px;
              background:${(location.hostname === h || location.hostname.endsWith('.' + h)) ? '#2a2a30' : '#1a1a1c'}">${h}</span>`).join('')}
        </div>
        <div class="st-row">
          <button class="st-btn ghost" id="sw-copy-match">复制 @match 行模板</button>
        </div>
      </div>
      <div class="st-card"><b>玻璃质感</b>
        <div class="st-row">
          <div class="st-switch ${settings.glass === 'frosted' ? 'on' : ''}" id="sw-frosted">
            <div class="st-sw-box"></div>
            <div><div class="st-sw-txt">${ic('image')} 毛玻璃</div>
              <div class="st-sw-sub">半透明 + 背景模糊</div></div>
          </div>
          <div class="st-switch ${settings.glass === 'liquid' ? 'on' : ''}" id="sw-liquid">
            <div class="st-sw-box"></div>
            <div><div class="st-sw-txt">液态玻璃</div>
              <div class="st-sw-sub">高模糊 + 高饱和</div></div>
          </div>
        </div>
      </div>
      <div class="st-card st-mode-card"><b>界面模式</b>
        <div class="st-row">
          <div class="st-seg" id="set-mobile">
            <button data-v="auto" class="${settings.mobile === 'auto' ? 'active' : ''}">${ic('menu')} 自动</button>
            <button data-v="on" class="${settings.mobile === 'on' ? 'active' : ''}">📱 手机</button>
            <button data-v="off" class="${settings.mobile === 'off' ? 'active' : ''}">🖥 电脑</button>
          </div>
        </div>
        <div class="st-row">
          <span class="st-mode-now ${mobileOn() ? 'phone' : 'pc'}" id="set-mobile-now">${mobileOn() ? '手机模式' : '电脑模式'}</span>
          <span class="st-meta">${esc(mobileReason())}</span>
        </div>
        <div class="st-row">
          <button class="st-btn ghost" id="set-newwin">${ic('puzzle')} 新建窗口</button>
          <button class="st-btn ghost" id="set-closewin">关闭全部窗口</button>
          <button class="st-btn ghost" id="set-openpanel">打开主面板</button>
        </div>
      </div>
      <div class="st-card"><b>自定义 CSS（自动加 .st-panel 前缀）</b>
        <textarea class="st-in" id="set-css" rows="6" style="width:100%;font-family:monospace">${esc(settings.css)}</textarea></div>
      <div class="st-row">
        <button class="st-btn ghost" id="set-dir">${ic('folder')} 选择下载文件夹</button>
        <button class="st-btn ghost" id="set-lay">重置面板布局</button>
        <button class="st-btn" id="set-reset">恢复默认</button>
      </div>`;

    $$('[data-th]', content).forEach(b => b.onclick = () => {
      applyTheme(b.dataset.th);
      toast('主题：' + b.dataset.th);
    });

    const g = $('#bg-grid', content);
    g.innerHTML = Object.keys(BG_PRESETS).map(k =>
      `<div class="st-bg-swatch${settings.bg === k ? ' active' : ''}" data-bg="${k}">
        <div class="st-bg-thumb" style="background:${BG_PRESETS[k] === 'none' ? '#1c1c28' : BG_PRESETS[k]}"></div>
        <span>${BG_NAMES[k]}</span></div>`).join('');
    $$('.st-bg-swatch', g).forEach(s => s.onclick = () => {
      settings.bg = s.dataset.bg;
      applyLook(); save();
      $$('.st-bg-swatch', g).forEach(x => x.classList.toggle('active', x === s));
      toast('背景：' + BG_NAMES[s.dataset.bg]);
    });

    const fi = $('#bg-file', content), clr = $('#bg-clr', content);
    const pickBg = () => {
      const f = fi.files[0];
      if (!f) return;
      if (f.size > 12 * 1024 * 1024) return toast('图片超过 12MB', false);
      const fr = new FileReader();
      fr.onload = () => { settings.bg = 'custom'; settings.bgImage = fr.result; applyLook(); save(); clr.disabled = false; toast('背景已导入'); };
      fr.readAsDataURL(f);
      fi.value = '';
    };
    $('#bg-imp', content).onclick = () => fi.click();
    fi.onchange = pickBg;
    content.addEventListener('dragover', e => e.dataTransfer && e.preventDefault());
    content.addEventListener('drop', e => {
      const f = e.dataTransfer && Array.from(e.dataTransfer.files || []).find(x => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); fi.files = e.dataTransfer.files; pickBg(); }
    });
    clr.onclick = () => {
      if (!dialog.confirm('清除已导入背景图？')) return;
      settings.bgImage = ''; settings.bg = 'none';
      applyLook(); save(); clr.disabled = true;
      toast('已清除');
    };

    const fit = $('#bg-fit', content), pos = $('#bg-pos', content), sz = $('#bg-size', content);
    const upBg = () => {
      settings.bgFit = fit.value; settings.bgPos = pos.value;
      settings.bgSize = +sz.value;
      $('#sz-v', content).textContent = sz.value + '%';
      applyLook(); save();
    };
    fit.onchange = upBg; pos.onchange = upBg; sz.oninput = upBg;

    $('#set-a', content).oninput = e => {
      settings.alpha = +e.target.value;
      $('#a-v', content).textContent = e.target.value + '%';
      applyLook(); save();
    };
    $('#set-b', content).oninput = e => {
      settings.blur = +e.target.value;
      $('#b-v', content).textContent = e.target.value + 'px';
      applyLook(); save();
    };

    $('#set-h', content).oninput = e => {
      settings.holdMs = +e.target.value;
      $('#h-v', content).textContent = e.target.value + 'ms';
      save();
    };
    $('#set-t', content).oninput = e => {
      settings.moveTh = +e.target.value;
      $('#t-v', content).textContent = e.target.value + 'px';
      save();
    };
    $('#set-snap', content).onchange = e => { settings.snap = e.target.checked; save(); };
    $('#set-tip', content).onchange = e => {
      settings.showTip = e.target.checked;
      save();
      sizeTip.style.display = e.target.checked ? '' : 'none';
    };
    $('#set-col', content).onchange = e => {
      settings.sidebarCollapsed = e.target.checked;
      sidebar.classList.toggle('collapsed', e.target.checked);
      content.classList.toggle('shifted', e.target.checked);
      $('.st-collapse', panel).innerHTML = ic(e.target.checked ? 'arrowleft' : 'menu');
      save();
    };

    $('#wm-r', content).oninput = e => { settings.wmRotate = +e.target.value; $('#r-v', content).textContent = e.target.value + '°'; save(); drawWM(); };
    $('#wm-o', content).oninput = e => { settings.wmOpacity = +e.target.value; $('#o-v', content).textContent = e.target.value + '%'; save(); drawWM(); };
    $('#wm-on', content).onchange = e => {
      settings.wmOn = e.target.checked; save(); drawWM();
      toast(settings.wmOn ? '水印已开启' : '水印已关闭');
    };
    $('#wm-t', content).oninput = e => { settings.wmText = e.target.value; save(); drawWM(); };
    $('#wm-c', content).oninput = e => { settings.wmColor = e.target.value; save(); drawWM(); };
    $('#wm-s', content).oninput = e => { settings.wmSize = +e.target.value; save(); drawWM(); };
    $('#wm-img', content).onclick = () => $('#wm-file', content).click();
    $('#wm-file', content).onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        settings.wmImg = fr.result;
        settings.wmOn = true;
        $('#wm-on', content).checked = true;
        save(); drawWM();
        toast('图片水印已设置');
      };
      fr.readAsDataURL(f);
    };

    $('#sw-copy-match', content).onclick = () => {
      const line = '// @match        *://' + location.hostname + '/*';
      try { navigator.clipboard.writeText(line); toast('已复制：' + line); }
      catch (e) { dialog.prompt('复制这行：', line); }
    };

    const swF = $('#sw-frosted', content), swL = $('#sw-liquid', content);
    const syncGlass = () => {
      swF.classList.toggle('on', settings.glass === 'frosted');
      swL.classList.toggle('on', settings.glass === 'liquid');
    };
    swF.onclick = () => {
      settings.glass = settings.glass === 'frosted' ? 'off' : 'frosted';
      save(); syncGlass(); applyLook(); applyGlass();
      toast('毛玻璃：' + (settings.glass === 'frosted' ? '开' : '关'));
      renderSettings();
    };
    swL.onclick = () => {
      settings.glass = settings.glass === 'liquid' ? 'off' : 'liquid';
      save(); syncGlass(); applyLook(); applyGlass();
      toast('液态玻璃：' + (settings.glass === 'liquid' ? '开' : '关'));
      renderSettings();
    };

    const mobSeg = $('#set-mobile', content);
    $$('button', mobSeg).forEach(btn => {
      btn.onclick = () => {
        settings.mobile = btn.dataset.v;
        save();
        $$('button', mobSeg).forEach(x => x.classList.toggle('active', x === btn));
        applyMobileMode();
        toast('已切换为：' + (mobileOn() ? '手机模式' : '电脑模式'));
        renderSettings();
      };
    });
    $('#set-openpanel', content).onclick = () => { settings.mobile = 'off'; save(); applyMobileMode(); openPanel(); };
    $('#set-newwin', content).onclick = () => Win.create(current && current !== '设置' ? current : '角色');
    $('#set-closewin', content).onclick = () => { destroyAllWindows(); toast('已关闭全部窗口'); };
    $('#set-css', content).oninput = e => { settings.css = e.target.value; applyLook(); save(); };
    $('#set-dir', content).onclick = async () => {
      try {
        if (!window.showDirectoryPicker) return toast('当前浏览器不支持', false);
        ST_DIR = await window.showDirectoryPicker();
        toast('已选择文件夹');
      } catch (e) { toast('已取消或不支持', false); }
    };
    $('#set-lay', content).onclick = () => { if (window.__stResetLayout) window.__stResetLayout(); };
    $('#set-reset', content).onclick = () => { localStorage.removeItem(KEY); location.reload(); };
    sizeTip.style.display = settings.showTip ? '' : 'none';
  }

  /* ============================================================
   *  17. ST工具箱 / 终端 / 线程
   * ============================================================ */
  function renderToolbox () {
    const t = settings.tools || {};
    const item = (key, name, icon, desc) => `
      <div class="st-card st-tool-item">
        <div class="st-row">
          <div class="st-switch ${t[key] ? 'on' : ''}" data-tool="${key}">
            <div class="st-sw-box"></div>
            <div><div class="st-sw-txt">${ic(icon)} ${name}</div>
              <div class="st-sw-sub">${desc}</div></div>
          </div>
        </div>
        <div class="st-row">
          <button class="st-btn ghost" data-open="${key}">${ic('plus')} 打开 ${name}（新窗口）</button>
        </div>
      </div>`;
    content.innerHTML = `<h2 class="st-title">${ic('chip')} ST工具箱</h2>
      <div class="st-card">
        <div class="st-meta">开启下方工具后，左侧导航栏会出现对应的分区导航项，点击会在独立窗口中打开。</div>
      </div>
      ${item('terminal', 'ST终端', 'speech', '可执行 JS：创建积木、播放角色声音、列出全部角色')}
      ${item('threads', 'ST线程管理', 'layers', '积木启用、线程、内存占用、运行时信息')}
      <div class="st-card">
        <b>当前已启用</b>
        <div class="st-meta" style="margin-top:4px">
          ${Object.keys(t).filter(k => t[k]).map(k => `<span class="st-badge">${k === 'terminal' ? 'ST终端' : 'ST线程管理'}</span>`).join(' ') || '（无）'}
        </div>
      </div>`;

    $$('[data-tool]', content).forEach(sw => {
      sw.onclick = () => {
        const k = sw.dataset.tool;
        settings.tools = settings.tools || {};
        settings.tools[k] = !settings.tools[k];
        save();
        buildNavs();
        renderToolbox();
        toast((settings.tools[k] ? '已开启：' : '已关闭：') + (k === 'terminal' ? 'ST终端' : 'ST线程管理'));
      };
    });
    $$('[data-open]', content).forEach(b => {
      b.onclick = () => {
        const k = b.dataset.open;
        if (!(settings.tools || {})[k]) {
          settings.tools = settings.tools || {};
          settings.tools[k] = true;
          save(); buildNavs();
        }
        Win.create(k === 'terminal' ? 'ST终端' : 'ST线程管理');
      };
    });
  }

  const TERM = { lines: [], hist: [], hi: -1 };

  const termPrint = (text, cls) => {
    TERM.lines.push({ text: String(text), cls: cls || '' });
    const out = document.getElementById('st-term-out');
    if (out) {
      const d = document.createElement('div');
      d.className = 'st-term-line ' + (cls || '');
      d.textContent = text;
      out.appendChild(d);
      out.scrollTop = out.scrollHeight;
    }
  };

  const termAPI = () => {
    const vm = getVM();
    return {
      vm: () => vm,
      log: (...a) => termPrint(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')),
      clear: () => { TERM.lines = []; const o = document.getElementById('st-term-out'); if (o) o.innerHTML = ''; },
      listSprites: () => {
        const rows = (vm ? vm.runtime.targets : []).filter(t => !t.isStage).map(t => {
          let bytes = 0;
          try {
            (t.sprite.costumes || []).forEach(c => { if (c.asset && c.asset.data) bytes += (c.asset.data.byteLength || 0); });
            (t.sprite.sounds || []).forEach(s => { if (s.asset && s.asset.data) bytes += (s.asset.data.byteLength || 0); });
          } catch (e) {}
          return {
            name: t.getName(),
            blocks: Object.keys(t.blocks._blocks || {}).length,
            costumes: (t.sprite.costumes || []).length,
            sounds: (t.sprite.sounds || []).length,
            size: bytes
          };
        });
        termPrint(rows.map(x => `${x.name} · 大小 ${fmtSize(x.size)} · 积木 ${x.blocks} · 造型 ${x.costumes} · 声音 ${x.sounds}`).join('\n') || '（无角色）');
        return rows;
      },
      playSound: (targetName, which) => {
        const t = vm && vm.runtime.targets.find(x => !x.isStage && (x.getName() === targetName || String(x.id).startsWith(String(targetName))));
        if (!t) { termPrint('未找到角色：' + targetName, 'err'); return; }
        const sounds = (t.sprite && t.sprite.sounds) || [];
        if (!sounds.length) { termPrint('该角色没有声音', 'err'); return; }
        let idx = 0;
        if (typeof which === 'number') idx = Math.max(0, Math.min(sounds.length - 1, which));
        else if (which) {
          const f = sounds.findIndex(s => String(s.name).indexOf(String(which)) >= 0);
          if (f >= 0) idx = f;
        }
        const snd = sounds[idx];
        const raw = snd.asset && snd.asset.data;
        if (!raw) { termPrint('该声音无原始数据', 'err'); return; }
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const ab = raw instanceof Uint8Array ? raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) : raw.buffer;
          ctx.decodeAudioData(ab.slice(0)).then(buf => {
            const src = ctx.createBufferSource();
            src.buffer = buf; src.connect(ctx.destination); src.start();
            termPrint('正在播放：' + t.getName() + ' / ' + snd.name);
          }).catch(e => termPrint('播放失败：' + e.message, 'err'));
        } catch (e) { termPrint('播放失败：' + e.message, 'err'); }
      },
      createBlock: (opcode, x, y) => {
        const B = window.Blockly || window.ScratchBlocks;
        if (!B) { termPrint('未找到 Blockly', 'err'); return; }
        let ws; try { ws = B.getMainWorkspace(); } catch (e) {}
        if (!ws) { termPrint('未找到工作区', 'err'); return; }
        if (!B.Blocks || !B.Blocks[opcode]) { termPrint('未知积木：' + opcode, 'err'); return; }
        try {
          const b = ws.newBlock(opcode);
          b.initSvg && b.initSvg();
          b.render && b.render();
          b.moveBy && b.moveBy(x || 60, y || 60);
          termPrint('已创建积木：' + opcode, 'ret');
        } catch (e) { termPrint('创建失败：' + e.message, 'err'); }
      },
      targets: () => (vm ? vm.runtime.targets.map(t => ({ name: t.getName(), id: t.id, stage: !!t.isStage })) : []),
      variables: () => {
        const o = {};
        if (vm) vm.runtime.targets.forEach(t => { o[t.getName()] = Object.values(t.variables || {}).map(v => v.name); });
        return o;
      },
      stopAll: () => { if (vm) { try { vm.stopAll(); termPrint('已停止全部脚本'); } catch (e) { termPrint('失败：' + e.message, 'err'); } } },
      greenFlag: () => { if (vm) { try { vm.greenFlag(); termPrint('已点击绿旗'); } catch (e) { termPrint('失败：' + e.message, 'err'); } } },
      help: () => {
        termPrint([
          '可用 API：',
          '  st.listSprites()              列出全部角色',
          '  st.playSound("角色名", 序号)   播放该角色的声音',
          '  st.createBlock("motion_movesteps")  创建工作区积木',
          '  st.targets() / st.variables()  target / 变量列表',
          '  st.stopAll() / st.greenFlag()  停止全部 / 绿旗',
          '  st.vm()  st.log()  st.clear()',
          '',
          '也可以直接写任意 JS，例如：1+1'
        ].join('\n'));
        return 'help';
      }
    };
  };

  const termRun = code => {
    if (!code || !code.trim()) return;
    termPrint('> ' + code, 'cmd');
    TERM.hist.unshift(code); TERM.hi = -1;
    const api = termAPI();
    try {
      const fn = new Function('st', 'api', '"use strict";' + code);
      const r = fn(api, api);
      if (r !== undefined) termPrint(typeof r === 'object' ? JSON.stringify(r, null, 2) : String(r), 'ret');
    } catch (e) { termPrint('✗ ' + (e && e.message ? e.message : e), 'err'); }
  };

  function renderTerminal () {
    content.innerHTML = `<h2 class="st-title">${ic('speech')} ST终端</h2>
      <div class="st-card">
        <div class="st-row">
          <button class="st-btn ghost" id="tm-help">帮助</button>
          <button class="st-btn ghost" id="tm-ls">列出全部角色</button>
          <button class="st-btn ghost" id="tm-clear">清屏</button>
        </div>
        <div class="st-meta" style="margin-top:4px">输入 JavaScript 后回车执行。</div>
      </div>
      <div class="st-card">
        <div id="st-term-out" class="st-term-out"></div>
        <div class="st-row" style="margin-top:8px">
          <input class="st-in" id="st-term-in" type="text" placeholder="st.listSprites()" style="flex:1;min-width:0">
          <button class="st-btn" id="st-term-run">运行</button>
        </div>
      </div>`;

    const out = document.getElementById('st-term-out');
    TERM.lines.forEach(l => {
      const d = document.createElement('div');
      d.className = 'st-term-line ' + l.cls;
      d.textContent = l.text;
      out.appendChild(d);
    });
    if (!TERM.lines.length) termPrint('ST终端就绪。输入 st.help() 查看命令。', 'sys');

    const inp = document.getElementById('st-term-in');
    const run = () => { termRun(inp.value); inp.value = ''; };
    document.getElementById('st-term-run').onclick = run;
    inp.onkeydown = e => {
      if (e.key === 'Enter') run();
      else if (e.key === 'ArrowUp') {
        if (TERM.hist.length) { TERM.hi = Math.min(TERM.hist.length - 1, TERM.hi + 1); inp.value = TERM.hist[TERM.hi]; }
      } else if (e.key === 'ArrowDown') {
        TERM.hi = Math.max(-1, TERM.hi - 1);
        inp.value = TERM.hi < 0 ? '' : TERM.hist[TERM.hi];
      }
    };
    document.getElementById('tm-help').onclick = () => termAPI().help();
    document.getElementById('tm-ls').onclick = () => termAPI().listSprites();
    document.getElementById('tm-clear').onclick = () => termAPI().clear();
    setTimeout(() => {
      const a = document.activeElement;
      if (!a || (a.tagName !== 'INPUT' && a.tagName !== 'TEXTAREA')) inp.focus();
    }, 120);
  }

  let threadTab = 'blocks';
  const BLOCK_DEF_CACHE = new Map();

  function renderThreads () {
    const vm = getVM();
    const tabs = [
      { k: 'blocks', n: '积木启用', ic: 'puzzle' },
      { k: 'threads', n: '线程', ic: 'layers' },
      { k: 'mem', n: '内存占用', ic: 'chip' },
      { k: 'runtime', n: '运行时信息', ic: 'info' }
    ];
    content.innerHTML = `<h2 class="st-title">${ic('layers')} ST线程管理</h2>
      <div class="st-thr-wrap">
        <div class="st-thr-nav">
          ${tabs.map(t => `<div class="st-thr-tab${threadTab === t.k ? ' active' : ''}" data-tab="${t.k}">${ic(t.ic)}<span> ${t.n}</span></div>`).join('')}
        </div>
        <div class="st-thr-main" id="thr-main"></div>
      </div>`;
    $$('.st-thr-tab', content).forEach(t => {
      t.onclick = () => { threadTab = t.dataset.tab; renderThreads(); };
    });
    const main = $('#thr-main', content);

    if (threadTab === 'blocks') {
      const exts = extCache.length ? extCache : [];
      const B = window.Blockly || window.ScratchBlocks;
      let ops = [];
      exts.forEach(e => (e.blockDefs || []).forEach(b => { if (b.opcode) ops.push({ op: b.opcode, ext: e.name }); }));
      if (!ops.length && B && B.Blocks) {
        ops = Object.keys(B.Blocks).filter(k => !/^motion_|^looks_|^sound_|^event_|^control_|^sensing_|^operator|^data_|^procedures/.test(k))
          .slice(0, 200).map(k => ({ op: k, ext: '内置/其他' }));
      }
      main.innerHTML = `<div class="st-card">
        <b>积木启用 / 停用</b>
        <div class="st-row"><input class="st-in" id="thr-q" placeholder="过滤" style="width:200px"></div>
        <div id="thr-list" style="margin-top:8px;max-height:340px;overflow:auto"></div>
      </div>`;
      const listBox = $('#thr-list', main);
      const draw = () => {
        const kw = ($('#thr-q', main).value || '').toLowerCase();
        const shown = ops.filter(o => !kw || o.op.toLowerCase().includes(kw) || (o.ext || '').toLowerCase().includes(kw));
        listBox.innerHTML = shown.slice(0, 300).map(o => {
          const on = !!(B && B.Blocks && B.Blocks[o.op]);
          return `<div class="st-blk-row">
            <span class="st-blk-dot" style="background:${on ? '#10b981' : '#ef4444'}"></span>
            <code>${esc(o.op)}</code>
            <span class="st-meta">${esc(o.ext || '')}</span>
            <span class="st-meta" style="opacity:.7">${on ? '已启用' : '已停用'}</span>
          </div>`;
        }).join('') || '<div class="st-meta">无匹配积木</div>';
      };
      $('#thr-q', main).oninput = draw;
      draw();
    }

    else if (threadTab === 'threads') {
      const threads = (vm && vm.runtime.threads) ? vm.runtime.threads : [];
      const statName = s => s === 0 ? '运行中' : s === 1 ? '等待' : s === 2 ? '已结束' : String(s);
      main.innerHTML = `<div class="st-card">
        <b>当前线程</b>
        <div class="st-row">
          <span class="st-meta">共 <b>${threads.length}</b> 个</span>
          <button class="st-btn danger" id="thr-stopall">停止全部</button>
          <button class="st-btn ghost" id="thr-refresh">刷新</button>
        </div>
        <div style="margin-top:8px;max-height:360px;overflow:auto">
          ${threads.length ? threads.map((th, i) => {
            const tname = th.target ? th.target.getName() : '(无)';
            return `<div class="st-thr-row">
              <div><b>${esc(tname)}</b>
                <div class="st-meta">${esc(String(th.topBlock || ''))}</div></div>
              <div style="text-align:right">
                <span class="st-badge">${statName(th.status)}</span>
                <button class="st-btn tiny danger" data-stop="${i}">停止</button>
              </div>
            </div>`;
          }).join('') : '<div class="st-meta">当前没有运行的线程</div>'}
        </div>
      </div>`;
      $('#thr-stopall', main).onclick = () => {
        if (vm) { try { vm.stopAll(); toast('已停止全部线程'); } catch (e) { toast('失败', false); } }
      };
      $('#thr-refresh', main).onclick = () => renderThreads();
      $$('[data-stop]', main).forEach(b => b.onclick = () => {
        const i = +b.dataset.stop;
        try {
          const th = vm.runtime.threads[i];
          if (th) { th.status = 2; vm.runtime.threads.splice(i, 1); }
          toast('已停止');
          renderThreads();
        } catch (e) { toast('失败', false); }
      });
    }

    else if (threadTab === 'mem') {
      const rows = vm ? vm.runtime.targets.filter(t => !t.isStage).map(t => {
        let bytes = 0, c = 0, s = 0;
        try {
          (t.sprite.costumes || []).forEach(x => { c++; if (x.asset && x.asset.data) bytes += (x.asset.data.byteLength || 0); });
          (t.sprite.sounds || []).forEach(x => { s++; if (x.asset && x.asset.data) bytes += (x.asset.data.byteLength || 0); });
        } catch (e) {}
        return { name: t.getName(), bytes, c, s, blocks: Object.keys(t.blocks._blocks || {}).length };
      }) : [];
      const total = rows.reduce((a, r) => a + r.bytes, 0);
      const pm = window.performance && performance.memory ? performance.memory : null;
      main.innerHTML = `<div class="st-card">
        <b>内存占用</b>
        <div class="st-row" style="flex-wrap:wrap;gap:10px;margin-top:6px">
          <span class="st-meta">资产合计 <b>${fmtSize(total)}</b></span>
          ${pm ? `<span class="st-meta">JS 堆 <b>${fmtSize(pm.usedJSHeapSize)}</b> / ${fmtSize(pm.totalJSHeapSize)}</span>` : '<span class="st-meta">（不提供 performance.memory）</span>'}
        </div>
        <div style="margin-top:10px;max-height:340px;overflow:auto">
          <table class="st-tbl">
            <tr><th>角色</th><th>积木</th><th>造型</th><th>声音</th><th>资产大小</th></tr>
            ${rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.blocks}</td><td>${r.c}</td><td>${r.s}</td><td>${fmtSize(r.bytes)}</td></tr>`).join('')}
          </table>
        </div>
      </div>`;
    }

    else {
      const rt = vm ? vm.runtime : null;
      const info = [];
      if (rt) {
        info.push(['线程数', (rt.threads || []).length]);
        info.push(['Target 总数', (rt.targets || []).length]);
        info.push(['克隆体', (rt.targets || []).filter(t => t.isClone).length]);
        let vars = 0; (rt.targets || []).forEach(t => { vars += Object.keys(t.variables || {}).length; });
        info.push(['变量总数', vars]);
        info.push(['turbo 模式', rt.turboMode ? '开' : '关']);
        info.push(['兼容性模式', rt.compatibilityMode ? '开' : '关']);
      }
      main.innerHTML = `<div class="st-card">
        <b>运行时信息</b>
        <table class="st-tbl" style="margin-top:8px">
          ${info.map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(String(v))}</b></td></tr>`).join('') || '<tr><td>VM 未就绪</td></tr>'}
        </table>
        <div class="st-row" style="margin-top:8px">
          <button class="st-btn ghost" id="rt-refresh">刷新</button>
          <button class="st-btn danger" id="rt-stop">停止全部脚本</button>
        </div>
      </div>`;
      $('#rt-refresh', main).onclick = () => renderThreads();
      $('#rt-stop', main).onclick = () => {
        if (vm) { try { vm.stopAll(); toast('已停止全部脚本'); } catch (e) { toast('失败', false); } }
      };
    }
  }

  /* ============================================================
   *  18. 绘画工具箱
   * ============================================================ */
  const Paint = (() => {
    const PAINT_ROOT_SEL = [
      '.paint-editor', '[class*=paint-editor]', '[class*=paint_editor]',
      '[class*=PaintEditor]', '[class*=paintEditor]'
    ];

    const root = () => {
      for (const sel of PAINT_ROOT_SEL) {
        try { const el = document.querySelector(sel); if (el) return el; } catch (e) {}
      }
      return null;
    };

    const canvas = () => {
      const r = root();
      if (!r) return null;
      try { return r.querySelector('canvas') || null; } catch (e) { return null; }
    };

    const paper = () => {
      try {
        const p = window.paper;
        if (p && p.project && p.project.activeLayer) return p;
      } catch (e) {}
      return null;
    };

    const paperCenter = p => {
      try { if (p && p.view && p.view.center) return p.view.center.clone(); } catch (e) {}
      try {
        const cv = canvas();
        if (cv && p && p.Point) return new p.Point((cv.clientWidth || 400) / 2, (cv.clientHeight || 300) / 2);
      } catch (e) {}
      return null;
    };

    const paperRadius = p => {
      try {
        const v = p && p.view && p.view.size;
        if (v) return Math.max(20, Math.min(v.width, v.height) * 0.18);
      } catch (e) {}
      return 60;
    };

    const selectedItems = p => {
      try {
        const sel = p.project.selectedItems;
        if (sel && sel.length) return sel.slice();
        const ch = p.project.activeLayer.selectedChildren;
        if (ch && ch.length) return ch.slice();
      } catch (e) {}
      return [];
    };

    const selectAll = p => {
      try {
        const ch = p.project.activeLayer.children || [];
        ch.forEach(c => { c.selected = true; });
        return ch.length;
      } catch (e) { return 0; }
    };

    const P = { fill: '#3b82f6', stroke: '#2b2b3a', sw: 3, blur: 8, grid: false, sym: false, gridSize: 24 };

    const STICKER_GROUPS = [
      { id:'face', n:'表情', s:'😀|😃|😄|😁|😆|😅|🤣|😂|🙂|🙃|😉|😊|😇|🥰|😍|🤩|😘|😗|😚|😙|🥲|😋|😛|😜|🤪|😝|🤑|🤗|🤭|🤫|🤔|🤐|🤨|😐|😑|😶|😏|😒|🙄|😬|😮|😴|🤤|😪|😵|🤯|🤠|🥳|🥸|😎|🤓|🧐|😕|😟|🙁|😯|😲|😳|🥺|😦|😧|😨|😰|😥|😢|😭|😱|😖|😣|😞|😓|😩|😫|🥱|😤|😡|😠|🤬|😈|👿|💀|👻|👽|🤖|💩|😺|😸|😹|😻|😼|😽|🙀|😿|😾' },
      { id:'hand', n:'手势', s:'👍|👎|👌|✌️|🤞|🤟|🤘|🤙|👈|👉|👆|👇|☝️|✋|🤚|🖐|🖖|👋|🤝|👏|🙌|👐|🤲|🙏|✍️|💅|🤳|💪|🦾' },
      { id:'animal', n:'动物', s:'🐱|🐶|🐭|🐹|🐰|🦊|🐻|🐼|🐨|🐯|🦁|🐮|🐷|🐸|🐵|🐔|🐧|🐦|🦆|🦅|🦉|🦇|🐺|🐴|🦄|🐝|🐛|🦋|🐌|🐞|🐜|🐢|🐍|🦎|🐙|🦑|🦐|🦀|🐡|🐠|🐟|🐬|🐳|🐋|🦈|🐊|🐅|🦓|🦍|🐘|🦒|🐪|🐫|🦔|🐇|🐿|🦨|🦡|🦃|🐓|🦜|🦩|🦚' },
      { id:'food', n:'食物', s:'🍎|🍐|🍊|🍋|🍌|🍉|🍇|🍓|🫐|🍈|🍒|🍑|🥭|🍍|🥥|🥝|🍅|🥑|🥦|🌽|🥕|🥔|🍠|🥐|🍞|🥖|🧀|🥚|🍳|🥞|🧇|🥓|🍔|🍟|🍕|🌭|🥪|🌮|🌯|🥗|🍜|🍲|🍛|🍣|🍱|🍚|🍙|🍘|🍥|🥟|🍢|🍡|🍧|🍨|🍦|🥧|🧁|🍰|🎂|🍮|🍭|🍬|🍫|🍿|🧂|☕|🍵|🧃|🥤|🍺|🍻|🥂|🍷' },
      { id:'nature', n:'自然', s:'🌸|💮|🏵|🌹|🥀|🌺|🌻|🌼|🌷|🌱|🌲|🌳|🌴|🌵|🌾|🌿|☘️|🍀|🍁|🍂|🍃|🌍|🌎|🌏|🌕|🌖|🌗|🌘|🌑|🌒|🌓|🌔|🌙|⭐|🌟|✨|⚡|🔥|💥|💫|☄️|🌈|☀️|⛅|☁️|🌧|⛈|❄️|☃️|⛄|💧|💦|🌊|🌋|🏔|🌠|🌌|🌉|🌃' },
      { id:'thing', n:'物品', s:'🎁|🎈|🎉|🎊|🎀|🎗|🏆|🥇|🥈|🥉|🎖|🏅|🎯|🎮|🕹|🎲|🧩|🎨|🎭|🎪|🎤|🎧|🎼|🎹|🥁|🎸|🎺|🎻|🎬|🎥|📷|📸|📱|💻|⌨️|🖥|🖨|💾|💿|📀|📚|📖|📝|✏️|🖊|🖌|📌|📍|✂️|📎|🔒|🔑|🔨|🛠|⚙️|🧲|💊|🩹|🚀|🛸|✈️|🚁|🚂|🚗|🚕|🚌|🏎|🚓|🚑|🚒|🚚|🚲|🛴|⛵|🚤|🛳|⚓|🚦|🗺|🧭|⏰|⏳|💣|🔍|🔎|💡|🔦|🕯|🪔|🧸|🛏|🚪|🪑|🧴|🧷' },
      { id:'symbol', n:'符号', s:'❤️|🧡|💛|💚|💙|💜|🖤|🤍|🤎|💔|❣️|💕|💞|💓|💗|💖|💘|💝|💟|☮️|✝️|☪️|🕉|☸️|✡️|🔯|🕎|☯️|☦️|⛎|♈|♉|♊|♋|♌|♍|♎|♏|♐|♑|♒|♓|🆔|⚛️|🉑|☢️|☣️|📴|📳|✴️|🆚|💮|🉐|㊙️|㊗️|🈴|🈵|🈹|❌|⭕|💢|💥|💤|💨|🕳|💬|💭|🗯|♻️|✅|☑️|✔️|❗|❓|⚠️|🚫|⛔|📛|🔰|🔱|♨️|🆗|🆙|🆒|🆕|🆓|🔝|🔙|🔚|🔜|〰️|➰|➿' }
    ];
    const FLAT_STICKERS = STICKER_GROUPS.reduce((a, g) => a.concat(g.s.split('|')), []);

    const SHAPES = [
      { k: 'triangle', n: '三角形' }, { k: 'rect', n: '矩形' }, { k: 'circle', n: '圆形' },
      { k: 'star', n: '五角星' }, { k: 'hex', n: '六边形' }, { k: 'heart', n: '爱心' },
      { k: 'cloud', n: '云朵' }, { k: 'bolt', n: '闪电' }, { k: 'arrow', n: '箭头' }
    ];
    const PATHS = {
      heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
      cloud: 'M6.5 19c-2.5 0-4.5-2-4.5-4.5S4 10 6.5 10c.3-2.8 2.6-5 5.5-5 2.9 0 5.2 2.2 5.5 5 2.5 0 4.5 2 4.5 4.5S19.5 19 17 19H6.5z',
      bolt:  'M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z',
      arrow: 'M12 2l8 8h-5v10H9V10H4l8-8z'
    };

    const addShape = kind => {
      const p = paper();
      if (!p) return toast('未接入绘图引擎', false);
      const c = paperCenter(p);
      if (!c) return toast('画布未就绪', false);
      const r = paperRadius(p);
      let item = null;
      try {
        if (kind === 'triangle') item = new p.Path.RegularPolygon({ center: c, sides: 3, radius: r });
        else if (kind === 'hex') item = new p.Path.RegularPolygon({ center: c, sides: 6, radius: r });
        else if (kind === 'rect') item = new p.Path.Rectangle({ point: [c.x - r, c.y - r * 0.7], size: [r * 2, r * 1.4] });
        else if (kind === 'circle') item = new p.Path.Circle({ center: c, radius: r });
        else if (kind === 'star') item = new p.Path.Star({ center: c, points: 5, radius1: r * 0.45, radius2: r });
        else if (PATHS[kind]) {
          item = new p.CompoundPath(PATHS[kind]);
          item.fitBounds(new p.Rectangle(c.x - r, c.y - r, r * 2, r * 2));
        }
      } catch (e) { return toast('创建失败：' + e.message, false); }
      if (!item) return;
      try {
        item.fillColor = P.fill;
        if (P.sw > 0) { item.strokeColor = P.stroke; item.strokeWidth = P.sw; }
        item.selected = true;
        if (p.view) p.view.update && p.view.update();
      } catch (e) {}
      commit(true);
      toast('已添加形状');
    };

    const addSticker = emoji => {
      const p = paper();
      if (!p) return toast('未接入绘图引擎', false);
      const c = paperCenter(p);
      if (!c) return toast('画布未就绪', false);
      const r = paperRadius(p);
      try {
        const t = new p.PointText({
          point: c, content: emoji, fontSize: r * 1.5,
          fillColor: P.fill, justification: 'center'
        });
        t.selected = true;
        if (p.view && p.view.update) p.view.update();
        commit(true);
        toast('已插入贴纸');
      } catch (e) { toast('插入失败：' + e.message, false); }
    };

    const blur = px => {
      const p = paper();
      if (!p) return toast('未接入绘图引擎', false);
      let items = selectedItems(p);
      if (!items.length) { selectAll(p); items = selectedItems(p); }
      if (!items.length) return toast('画布是空的', false);
      let ok = 0;
      items.forEach(it => {
        try {
          const b = it.bounds.clone();
          let raster = null;
          try { raster = it.rasterize ? it.rasterize() : null; } catch (e) {}
          if (!raster) return;
          const src = raster.image || raster.canvas;
          if (!src) { raster.remove(); return; }
          const ratio = (src.width || 1) / Math.max(1, b.width);
          const cv = document.createElement('canvas');
          cv.width = src.width; cv.height = src.height;
          const ctx = cv.getContext('2d');
          ctx.filter = 'blur(' + Math.max(0.5, px * ratio) + 'px)';
          ctx.drawImage(src, 0, 0);
          ctx.filter = 'none';
          const out = new p.Raster(cv);
          try { out.position = b.center.clone(); } catch (e) { out.position = raster.position.clone(); }
          it.remove(); raster.remove();
          out.selected = true;
          ok++;
        } catch (e) {}
      });
      if (p.view && p.view.update) p.view.update();
      commit(true);
      toast(ok ? '已模糊 ' + ok + ' 个对象' : '模糊失败', ok > 0);
    };

    const effect = kind => {
      const p = paper();
      if (!p) return toast('未接入绘图引擎', false);
      let items = selectedItems(p);
      if (!items.length) return toast('请先选中图形，或点"全选"', false);
      let n = 0;
      items.forEach(it => {
        try {
          if (kind === 'stroke') { it.strokeColor = P.stroke; it.strokeWidth = P.sw; }
          else if (kind === 'stroke0') { it.strokeColor = null; it.strokeWidth = 0; }
          else if (kind === 'shadow') {
            it.shadowColor = new p.Color(0, 0, 0, 0.45); it.shadowBlur = 12; it.shadowOffset = new p.Point(4, 4);
          } else if (kind === 'glow') {
            it.shadowColor = new p.Color(P.fill); it.shadowBlur = 22; it.shadowOffset = new p.Point(0, 0);
          } else if (kind === 'noshadow') { it.shadowColor = null; it.shadowBlur = 0; }
          else if (kind === 'fill') it.fillColor = P.fill;
          else if (kind === 'grad') {
            const b = it.bounds;
            it.fillColor = {
              gradient: { stops: [[P.fill, 0], [P.stroke, 1]] },
              origin: b.topLeft, destination: b.bottomRight
            };
          }
          else if (kind === 'op') it.opacity = Math.max(0.1, (it.opacity == null ? 1 : it.opacity) - 0.2);
          else if (kind === 'flipH') it.scale(-1, 1, it.bounds.center);
          else if (kind === 'flipV') it.scale(1, -1, it.bounds.center);
          else if (kind === 'rotL') it.rotate(-15, it.bounds.center);
          else if (kind === 'rotR') it.rotate(15, it.bounds.center);
          else if (kind === 'rot90') it.rotate(90, it.bounds.center);
          else if (kind === 'front') it.bringToFront();
          else if (kind === 'back') it.sendToBack();
          else if (kind === 'center') it.position = paperCenter(p) || it.position;
          else if (kind === 'dup') {
            const c = it.clone({ insert: true });
            try { c.position = c.position.add(new p.Point(12, 12)); c.selected = true; it.selected = false; } catch (e) {}
          }
          else if (kind === 'del') it.remove();
          n++;
        } catch (e) {}
      });
      if (p.view && p.view.update) p.view.update();
      commit(true);
      toast('已应用：' + kind + '（' + n + ' 个）');
    };

    let guideEl = null;
    const guidesAllowed = () => {
      try {
        if (!isOpen) return false;
        if (current !== '绘画工具') return false;
      } catch (e) {}
      return true;
    };
    const hideGuides = () => {
      if (guideEl) { guideEl.remove(); guideEl = null; }
    };
    const drawGuides = () => {
      if (!guidesAllowed() || (!P.grid && !P.sym)) { hideGuides(); return; }
      const cv = canvas();
      if (!cv) { hideGuides(); return; }
      if (!guideEl) {
        guideEl = document.createElement('div');
        guideEl.className = 'st-guide';
        document.body.appendChild(guideEl);
      }
      const r = cv.getBoundingClientRect();
      const gs = Math.max(4, P.gridSize);
      let bg = '';
      if (P.grid) {
        bg = 'repeating-linear-gradient(0deg,rgba(255,255,255,.28) 0 1px,transparent 1px ' + gs + 'px),'
           + 'repeating-linear-gradient(90deg,rgba(255,255,255,.28) 0 1px,transparent 1px ' + gs + 'px)';
      }
      guideEl.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483060;border-radius:4px;'
        + 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;'
        + (bg ? 'background-image:' + bg + ';' : '');
      guideEl.innerHTML = P.sym
        ? '<div style="position:absolute;left:50%;top:0;bottom:0;width:1px;'
          + 'background:linear-gradient(180deg,transparent,var(--st-primary),transparent);'
          + 'box-shadow:0 0 8px var(--st-primary)"></div>' : '';
    };

    /* 把 paper 改动提交给 scratch-paint */
    const commit = quiet => {
      const p = paper();
      if (!p) return false;
      try {
        if (p.view) {
          if (p.view.requestUpdate) p.view.requestUpdate();
          if (p.view.update) p.view.update();
        }
      } catch (e) {}

      let done = false, how = '';
      try {
        let el = root() || canvas();
        let fiber = null;
        while (el && !fiber) {
          for (const k of Object.keys(el)) {
            if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) { fiber = el[k]; break; }
          }
          el = el.parentElement;
        }
        const call = (fn, ctx, arg) => {
          try { if (typeof fn === 'function') { fn.call(ctx, arg); return true; } } catch (e) {}
          return false;
        };
        let node = fiber, depth = 0;
        while (node && depth++ < 80 && !done) {
          const inst = node.stateNode;
          if (inst && typeof inst === 'object') {
            for (const n of ['updateImage','handleUpdateImage','updateSvg','commitImage']) {
              if (typeof inst[n] === 'function' && call(inst[n], inst)) { done = true; how = n; break; }
            }
          }
          if (!done && node.memoizedProps && typeof node.memoizedProps.onUpdateImage === 'function') {
            let svg = null;
            try { if (inst && typeof inst.exportImage === 'function') svg = inst.exportImage(); } catch (e) {}
            if (!svg && p.project && p.project.exportSVG) {
              try { svg = p.project.exportSVG({ asString: true, bounds: 'content' }); } catch (e) {}
            }
            if (typeof svg === 'string' && svg.indexOf('<svg') >= 0) {
              if (call(node.memoizedProps.onUpdateImage, inst, svg)) { done = true; how = 'onUpdateImage'; }
            }
          }
          node = node.return;
        }
      } catch (e) {}

      if (!done) {
        try {
          const cv = canvas();
          if (cv) {
            const r = cv.getBoundingClientRect();
            const x = r.left + r.width / 2, y = r.top + r.height / 2;
            const pe = (t, cx, cy, bt) => cv.dispatchEvent(new PointerEvent(t, {
              bubbles: true, cancelable: true, composed: true,
              clientX: cx, clientY: cy, button: 0, buttons: bt,
              pointerId: 1, pointerType: 'mouse', isPrimary: true
            }));
            pe('pointerdown', x, y, 1);
            pe('pointermove', x + 2, y + 2, 1);
            pe('pointerup', x + 2, y + 2, 0);
            done = true; how = 'synthetic-drag';
          }
        } catch (e) {}
      }
      if (!quiet) toast(done ? '已同步（' + how + '）' : '未能自动同步', done);
      return done;
    };

    let paintTimer = null, guideTimer = null;

    const buildPanel = host => {
      const el = host;
      el.classList.add('st-paint');
      el.innerHTML = `
        <div class="st-paint-bar"><span>${ic('pen')} 绘画工具箱</span>
          <span class="st-paint-min">—</span>
          <span class="st-paint-x">${ic('close')}</span></div>
        <div class="st-paint-tabs">
          <button class="st-paint-tab active" data-tab="sticker">贴纸</button>
          <button class="st-paint-tab" data-tab="shape">图形</button>
          <button class="st-paint-tab" data-tab="fx">效果</button>
          <button class="st-paint-tab" data-tab="ref">参考</button>
        </div>
        <div class="st-paint-body">
          <div class="st-paint-page" data-page="sticker">
            <div class="st-paint-search"><input class="st-in st-paint-q" type="text" placeholder="搜索 emoji"></div>
            <div class="st-paint-cats"></div>
            <div class="st-paint-sec"><b>贴纸 <span class="st-paint-count"></span></b>
              <div class="st-paint-stickers st-paint-slist"></div>
            </div>
          </div>
          <div class="st-paint-page" data-page="shape" style="display:none">
            <div class="st-paint-sec"><b>形状</b><div class="st-paint-grid st-paint-shapes"></div></div>
            <div class="st-paint-sec"><b>填充 / 描边</b>
              <div class="st-paint-row">
                <label class="st-paint-cl"><input type="color" class="st-paint-fill" value="${P.fill}"><span>填充</span></label>
                <label class="st-paint-cl"><input type="color" class="st-paint-stroke" value="${P.stroke}"><span>描边</span></label>
              </div>
              <div class="st-paint-row">
                <span class="st-paint-lb">粗细</span>
                <input type="range" class="st-paint-sw" min="0" max="20" value="${P.sw}">
                <span class="st-paint-val st-paint-swv">${P.sw}</span>
              </div>
              <div class="st-paint-grid">
                <button class="st-btn tiny" data-fx="fill">应用填充</button>
                <button class="st-btn tiny" data-fx="grad">渐变</button>
                <button class="st-btn tiny" data-fx="stroke">加描边</button>
                <button class="st-btn tiny" data-fx="stroke0">去描边</button>
              </div>
            </div>
          </div>
          <div class="st-paint-page" data-page="fx" style="display:none">
            <div class="st-paint-sec"><b>模糊</b>
              <div class="st-paint-row">
                <span class="st-paint-lb">强度</span>
                <input type="range" class="st-paint-blur" min="1" max="40" value="${P.blur}">
                <span class="st-paint-val st-paint-blurv">${P.blur}</span>
              </div>
              <button class="st-btn wide" data-blur="1">应用高斯模糊</button>
            </div>
            <div class="st-paint-sec"><b>阴影 / 发光</b>
              <div class="st-paint-grid">
                <button class="st-btn tiny" data-fx="shadow">阴影</button>
                <button class="st-btn tiny" data-fx="glow">发光</button>
                <button class="st-btn tiny" data-fx="noshadow">去阴影</button>
                <button class="st-btn tiny" data-fx="op">降透明</button>
              </div>
            </div>
            <div class="st-paint-sec"><b>变换</b>
              <div class="st-paint-grid">
                <button class="st-btn tiny" data-fx="flipH">水平镜像</button>
                <button class="st-btn tiny" data-fx="flipV">垂直镜像</button>
                <button class="st-btn tiny" data-fx="rotL">左转 15°</button>
                <button class="st-btn tiny" data-fx="rotR">右转 15°</button>
                <button class="st-btn tiny" data-fx="rot90">旋转 90°</button>
                <button class="st-btn tiny" data-fx="center">居中</button>
              </div>
            </div>
            <div class="st-paint-sec"><b>排列</b>
              <div class="st-paint-grid">
                <button class="st-btn tiny" data-sel="all">全选</button>
                <button class="st-btn tiny" data-fx="front">置顶</button>
                <button class="st-btn tiny" data-fx="back">置底</button>
                <button class="st-btn tiny" data-fx="dup">复制</button>
                <button class="st-btn tiny danger" data-fx="del">删除</button>
              </div>
            </div>
          </div>
          <div class="st-paint-page" data-page="ref" style="display:none">
            <div class="st-paint-sec"><b>参考线（不写入作品）</b>
              <div class="st-paint-row">
                <label class="st-paint-ck"><input type="checkbox" class="st-paint-grid-cb" ${P.grid ? 'checked' : ''}><span>网格</span></label>
                <label class="st-paint-ck"><input type="checkbox" class="st-paint-sym-cb" ${P.sym ? 'checked' : ''}><span>对称中线</span></label>
              </div>
              <div class="st-paint-row">
                <span class="st-paint-lb">间距</span>
                <input type="range" class="st-paint-gs" min="6" max="80" value="${P.gridSize}">
                <span class="st-paint-val st-paint-gsv">${P.gridSize}</span>
              </div>
            </div>
          </div>
        </div>`;

      const bar = $('.st-paint-bar', el);
      let on = false, ox = 0, oy = 0, dx = 0, dy = 0;
      bar.addEventListener('pointerdown', e => {
        if (e.target.closest('.st-paint-min') || e.target.closest('.st-paint-x')) return;
        on = true; ox = el.offsetLeft; oy = el.offsetTop; dx = e.clientX; dy = e.clientY;
        try { bar.setPointerCapture(e.pointerId); } catch (err) {}
      });
      bar.addEventListener('pointermove', e => {
        if (!on) return;
        el.style.left = Math.max(0, Math.min(innerWidth - 60, ox + e.clientX - dx)) + 'px';
        el.style.top = Math.max(0, Math.min(innerHeight - 40, oy + e.clientY - dy)) + 'px';
      });
      bar.addEventListener('pointerup', () => { on = false; });

      if ($('.st-paint-x', el)) $('.st-paint-x', el).onclick = () => {
        settings.paint = false; save();
        destroyPaint();
        toast('绘画工具箱已关闭');
      };
      $('.st-paint-min', el).onclick = () => {
        el.classList.toggle('mini');
        $('.st-paint-min', el).textContent = el.classList.contains('mini') ? '+' : '—';
      };

      const tabs = $$('.st-paint-tab', el);
      tabs.forEach(t => t.onclick = () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        $$('.st-paint-page', el).forEach(pg => {
          pg.style.display = pg.dataset.page === t.dataset.tab ? '' : 'none';
        });
      });

      const catsBox = $('.st-paint-cats', el);
      const listBox = $('.st-paint-slist', el);
      const cntBox = $('.st-paint-count', el);
      let curCat = 'face';
      catsBox.innerHTML = STICKER_GROUPS.map(g =>
        `<button class="st-paint-cat${g.id === curCat ? ' active' : ''}" data-cat="${g.id}">${g.n}</button>`).join('');
      const drawStickers = () => {
        const kw = ($('.st-paint-q', el).value || '').trim().toLowerCase();
        const pool = kw ? FLAT_STICKERS : STICKER_GROUPS.find(g => g.id === curCat).s.split('|');
        listBox.innerHTML = pool.slice(0, kw ? 200 : 400)
          .map(e => `<button class="st-paint-emoji" data-e="${e}">${e}</button>`).join('')
          || '<div class="st-meta">无匹配</div>';
        cntBox.textContent = kw ? `（搜索 ${pool.length}）` : `（${pool.length}）`;
      };
      $$('.st-paint-cat', catsBox).forEach(b => b.onclick = () => {
        curCat = b.dataset.cat;
        $$('.st-paint-cat', catsBox).forEach(x => x.classList.toggle('active', x === b));
        drawStickers();
      });
      $('.st-paint-q', el).oninput = drawStickers;
      drawStickers();

      $('.st-paint-shapes', el).innerHTML = SHAPES.map(x =>
        `<button class="st-btn tiny" data-shape="${x.k}">${x.n}</button>`).join('');

      el.addEventListener('click', e => {
        const t = e.target.closest('[data-e],[data-shape],[data-fx],[data-blur],[data-sel]');
        if (!t) return;
        if (t.dataset.e !== undefined) { addSticker(t.dataset.e); return; }
        if (t.dataset.shape !== undefined) { addShape(t.dataset.shape); return; }
        if (t.dataset.blur !== undefined) { blur(P.blur); return; }
        if (t.dataset.sel === 'all') {
          const pp = paper();
          if (!pp) return toast('未接入绘图引擎', false);
          const n = selectAll(pp);
          toast(n ? '已选中 ' + n + ' 个对象' : '画布为空', n > 0);
          return;
        }
        if (t.dataset.fx !== undefined) { effect(t.dataset.fx); return; }
      });

      $('.st-paint-fill', el).oninput = e => { P.fill = e.target.value; };
      $('.st-paint-stroke', el).oninput = e => { P.stroke = e.target.value; };
      $('.st-paint-sw', el).oninput = e => { P.sw = +e.target.value; $('.st-paint-swv', el).textContent = P.sw; };
      $('.st-paint-blur', el).oninput = e => { P.blur = +e.target.value; $('.st-paint-blurv', el).textContent = P.blur; };
      $('.st-paint-grid-cb', el).onchange = e => { P.grid = e.target.checked; drawGuides(); };
      $('.st-paint-sym-cb', el).onchange = e => { P.sym = e.target.checked; drawGuides(); };
      $('.st-paint-gs', el).oninput = e => { P.gridSize = +e.target.value; $('.st-paint-gsv', el).textContent = P.gridSize; drawGuides(); };

      drawGuides();
      if (!guideTimer) guideTimer = setInterval(() => { if (P.grid || P.sym) drawGuides(); }, 700);
    };

    let host = null;

    const render = () => {
      host = document.createElement('div');
      host.className = 'st-paint inline';
      buildPanel(host);
      const sync = document.createElement('div');
      sync.className = 'st-row';
      sync.style.marginBottom = '8px';
      sync.innerHTML = `<button class="st-btn" id="st-paint-sync">${ic('save')} 同步到造型</button>
        <button class="st-btn ghost" id="st-paint-info">环境检测</button>`;
      host.insertBefore(sync, host.firstChild);
      $('#st-paint-sync', host).onclick = () => commit(false);
      $('#st-paint-info', host).onclick = () => {
        const info = { 绘制界面: !!root(), 画布: !!canvas(), paper: !!paper() };
        console.log('[smesm666] 绘画环境', info);
        toast(`绘制界面:${info.绘制界面 ? '✓' : '✗'} 画布:${info.画布 ? '✓' : '✗'} paper:${info.paper ? '✓' : '✗'}`);
      };
      content.innerHTML = '';
      content.appendChild(host);
    };

    const destroy = () => {
      if (guideEl) { guideEl.remove(); guideEl = null; }
    };

    const watch = () => {
      if (paintTimer) return;
      paintTimer = setInterval(() => {
        if (!settings.paint) return;
        if (!root()) return;
        if (isOpen && current !== '绘画工具' && PAGE_FNS['绘画工具']) go('绘画工具');
      }, 900);
    };

    const apply = () => {
      if (settings.paint) watch();
      else destroy();
    };

    return {
      render, commit, destroy, apply, hideGuides,
      root, canvas, paper,
      addShape, addSticker, blur, effect
    };
  })();

  function renderPaint () { Paint.render(); }
  const hideGuides = () => Paint.hideGuides();
  const destroyPaintPanel = () => Paint.destroy();
  const applyPaintMode = () => Paint.apply();
  const paintRoot = () => Paint.root();
  const paintCanvas = () => Paint.canvas();
  const getPaper = () => Paint.paper();
  const paintCommit = q => Paint.commit(q);
  const paintAddShape = k => Paint.addShape(k);
  const paintAddSticker = e => Paint.addSticker(e);
  const paintBlur = px => Paint.blur(px);
  const paintEffect = k => Paint.effect(k);

  /* ============================================================
   *  19. 开发者 API
   * ============================================================ */
  window.__st = {
    vm: getVM,
    version: VERSION,
    kernel: KERNEL,
    open: openPanel,
    close: closePanel,
    go,
    getExtensions: collectExtensions,
    extDetail: id => { go('扩展'); setTimeout(() => renderExtensionDetail(id), 200); },
    rescan: () => { extCache = []; renderExtensions(); toast('已重新扫描'); },
    extCount: extLoadingCount,
    getTheme: () => settings.theme,
    setTheme: applyTheme,
    themes: () => Object.keys(THEMES),
    invalidateCache: () => {
      zipCache = null; extCache = [];
      if (window.__stClearPrevCache) window.__stClearPrevCache();
      toast('缓存已清空'); stNotifyChange();
    },
    refresh: stNotifyChange,
    vmSource: () => VM.source(),
    inWhitelist,
    whitelist: () => HOST_WHITELIST.slice(),
    hasVM: () => !!getVM(),
    rescanVM: () => { VM.reset(); const v = VM.get(); toast(v ? '已找到 VM' : '未找到 VM', !!v); return !!v; },
    isMobile: mobileOn,
    mobileSignals,
    whyMobile: () => (mobileOn() ? '手机' : '电脑') + ' — ' + mobileReason(),
    forceDesktop: () => { settings.mobile = 'off'; save(); applyMobileMode(); toast('已强制电脑'); },
    forceMobile: () => { settings.mobile = 'on'; save(); applyMobileMode(); toast('已强制手机'); },
    resetMobile: () => { settings.mobile = 'auto'; save(); applyMobileMode(); toast('已恢复自动'); },
    glass: () => settings.glass || 'off',
    setGlass: g => {
      if (['frosted','liquid','off'].indexOf(g) < 0) return false;
      settings.glass = g; save(); applyLook(); applyGlass();
      toast('玻璃质感：' + (g === 'liquid' ? '液态玻璃' : g === 'frosted' ? '毛玻璃' : '已关闭'));
      return true;
    },
    paint: () => !!settings.paint,
    setPaint: v => { settings.paint = !!v; save(); applyPaintMode(); return settings.paint; },
    paintOpen: () => { go('绘画工具'); return true; },
    paintCommit: q => paintCommit(q !== false),
    newWindow: p => Win.create(p || '角色'),
    windows: () => Win.list.map(w => ({ page: w.page, x: w.x, y: w.y, w: w.w, h: w.h })),
    closeWindows: destroyAllWindows,
    blockMessage: m => { Broadcast.add(m); toast('已拦截：' + m); },
    unblockMessage: m => { Broadcast.remove(m); toast('已解除：' + m); },
    blockedMessages: () => Broadcast.list(),
    lockVar: (tid, name) => { const ok = VarLock.lock(tid, name); toast(ok ? '已锁定：' + name : '锁定失败', ok); return ok; },
    unlockVar: (tid, name) => { VarLock.unlock(tid, name); toast('已解除：' + name); },
    lockedVars: () => VarLock.list().map(r => ({ tid: r.tid, name: r.name, isList: r.isList, blocked: r.blocked, lastOp: r.lastOp, mode: r.mode })),
    lockMode: () => (VarLock.hookOn() ? '指令层拦截' : '属性层拦截'),
    isLocked: VarLock.isLocked,
    settings: () => settings,
    setVar: (tid, name, val) => {
      const v = Object.values(getTarget(tid).variables).find(x => x.name === name);
      if (!v) return toast('未找到变量', false);
      try { v.value = v.isList ? JSON.parse(val) : val; toast('已更新'); }
      catch (e) { toast('列表值需为 JSON 数组', false); }
    },
    dlCostume: (tid, i) => { const t = getTarget(tid); downloadCostume(t, t.sprite.costumes[i]); },
    delCostume: (tid, i) => {
      const t = getTarget(tid);
      if (!t || !t.sprite) return toast('角色不存在', false);
      const list = t.sprite.costumes || [];
      if (i < 0 || i >= list.length) return toast('造型不存在', false);
      if (!dialog.confirm('删除造型：' + list[i].name)) return;
      try {
        const vm = getVM();
        if (typeof vm.deleteCostume === 'function') vm.deleteCostume(t.id, i);
        else {
          if (list.length <= 1) return toast('至少保留一个造型', false);
          list.splice(i, 1);
          if (t.currentCostume > i) t.currentCostume -= 1;
          t.currentCostume = Math.max(0, Math.min(t.currentCostume, list.length - 1));
        }
        zipCache = null; extCache = [];
        toast('已删除造型');
        renderSpriteDetail(tid);
        stNotifyChange();
      } catch (e) { toast('删除失败：' + e.message, false); }
    },
    dlSound: (tid, i) => {
      const t = getTarget(tid);
      const s = t.sprite.sounds[i];
      if (!s) return toast('声音不存在', false);
      const u = soundURL(s);
      if (!u) return toast('无法获取声音', false);
      writeOut(toBlob(u), `${safe(s.name)}.${s.dataFormat || 'wav'}`);
      toast('已下载 ' + s.name);
    },
    delSound: (tid, i) => {
      const t = getTarget(tid);
      if (!t || !t.sprite) return toast('角色不存在', false);
      const list = t.sprite.sounds || [];
      if (i < 0 || i >= list.length) return toast('声音不存在', false);
      if (!dialog.confirm('删除声音：' + list[i].name)) return;
      try {
        const vm = getVM();
        if (typeof vm.deleteSound === 'function') vm.deleteSound(t.id, i);
        else list.splice(i, 1);
        zipCache = null; extCache = [];
        toast('已删除声音');
        renderSpriteDetail(tid);
        stNotifyChange();
      } catch (e) { toast('删除失败：' + e.message, false); }
    }
  };

  /* ============================================================
   *  20. 初始化
   * ============================================================ */
  const init = () => {
    buildDOM();
    buildNavs();

    /* 关闭按钮 */
    const closeBtn = $('.st-close', panel);
    closeBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); });
    closeBtn.addEventListener('click', e => { e.stopPropagation(); closePanel(); });
    $('.st-logo', panel).onclick = () => go('关于');
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closePanel(); });

    /* FAB */
    fab.onclick = openPanel;

    /* 导航点击 */
    navsBox.addEventListener('click', e => {
      const n = e.target.closest('.st-nav');
      if (n) go(n.dataset.page);
    });

    /* 侧栏折叠 */
    const collapse = $('.st-collapse', panel);
    const setCollapse = v => {
      settings.sidebarCollapsed = v;
      sidebar.classList.toggle('collapsed', v);
      content.classList.toggle('shifted', v);
      if (collapse) collapse.innerHTML = ic(v ? 'arrowleft' : 'menu');
      save();
    };
    collapse.onclick = e => { e.stopPropagation(); setCollapse(!settings.sidebarCollapsed); };
    if (settings.sidebarCollapsed) setCollapse(true);

    /* 面板 */
    Panel.init();
    Panel.initEvents();

    /* 实时刷新 */
    Refresh.init();

    /* 主题 */
    applyTheme(settings.theme);
    applyLook();
    applyGlass();
    applyMobileMode();
    applyPaintMode();
    Mobile.watchMouse();

    addEventListener('resize', () => {
      clearTimeout(window.__stMobT);
      window.__stMobT = setTimeout(applyMobileMode, 250);
    });
    addEventListener('orientationchange', () => setTimeout(applyMobileMode, 400));

    if (settings.wmOn) drawWM();

    /* 等 VM */
    let vmReady = false;
    VM.onReady(() => {
      if (vmReady || window.__stDisabled) return;
      vmReady = true;
      fab.style.display = '';
      Broadcast.installed();
      VM.bindEvents();
      applyMobileMode();
      console.log('%c[smesm666] VM detected: ' + (VM.source() || 'vm'), 'color:#3b82f6;font-weight:bold');
    });

    const waitVM = n => {
      if (window.__stDisabled) return;
      if (VM.isNonEditor()) { setTimeout(() => waitVM(n + 1), 3000); return; }
      if (VM.get()) { VM.fireReady(); return; }
      setTimeout(() => waitVM(n + 1), n < 30 ? 300 : 2000);
    };
    waitVM(0);

    /* SPA 路由变化重检 */
    let lastHref = location.href;
    setInterval(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        VM.reset();
        VM.get();
      }
    }, 1200);

    console.log('%c[smesm666] ' + VERSION + ' loaded', 'color:#3b82f6;font-weight:bold');
  };

  init();
})();
