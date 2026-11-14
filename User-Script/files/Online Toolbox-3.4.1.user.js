// ==UserScript==
// @name         Online Toolbox
// @version      3.4.1
// @description  更好的MMO联机
// @author       110200
// @match        https://www.ccw.site/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ccw.site
// @grant        none
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  const C = {
    POS_KEY: 'otb_pos',
    THEME_KEY: 'otb_theme',
    MMO_WIN_POS_KEY: 'otb_mmo_win_pos',
    STATE_WIN_POS_KEY: 'otb_state_win_pos',
    MAX_NAME: 50,
    MAX_ID: 50,
    POLL_READY: 3000,
    POLL_RETRY: 1500
  };

  const WS_STATE = { connected: false, url: null };
  try {
    const OrigWS = window.WebSocket;
    window.WebSocket = new Proxy(OrigWS, {
      construct(target, args) {
        const ws = new target(...args);
        try {
          const url = String(args[0] ?? '');
          if (/mmo|gandi-mmo|room|broadcast/i.test(url)) {
            WS_STATE.url = url;
            ws.addEventListener('open', () => { WS_STATE.connected = true; });
            ws.addEventListener('close', () => { WS_STATE.connected = false; });
            ws.addEventListener('error', () => { WS_STATE.connected = false; });
          }
        } catch {}
        return ws;
      }
    });
  } catch {}

  const THEMES = {
    dark: {
      bg: 'rgba(16,20,30,0.92)',
      solid: '#10141E',
      soft: 'rgba(255,255,255,0.04)',
      text: '#E4EAF5',
      dim: '#7A8699',
      primary: '#2A4A7F',
      primaryD: '#1B3358',
      secondary: '#3D5E96',
      success: '#3D9970',
      warning: '#B8860B',
      error: '#A33A3A',
      shadow: 'rgba(0,0,0,0.6)',
      inset: 'rgba(255,255,255,0.06)'
    },
    light: {
      bg: 'rgba(245,247,252,0.96)',
      solid: '#FFFFFF',
      soft: 'rgba(0,0,0,0.03)',
      text: '#1A2233',
      dim: '#6B7789',
      primary: '#2A4A7F',
      primaryD: '#1B3358',
      secondary: '#3D5E96',
      success: '#2E7D5B',
      warning: '#9A6E00',
      error: '#8B2F2F',
      shadow: 'rgba(0,0,0,0.15)',
      inset: 'rgba(255,255,255,0.8)'
    }
  };

  const $ = {
    esc: s => String(s ?? '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])),
    rand: (n = 8) => Array.from(crypto.getRandomValues(new Uint8Array(n))).map(b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62]).join(''),
    rgba: (hex, a) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    },
    darker: (hex, p) => {
      const n = parseInt(hex.slice(1), 16), a = Math.round(2.55 * p);
      const r = Math.max((n >> 16) - a, 0), g = Math.max((n >> 8 & 255) - a, 0), b = Math.max((n & 255) - a, 0);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    },
    clamp: (x, y, w, h) => ({
      x: Math.max(4, Math.min(x, Math.max(4, window.innerWidth - w - 4))),
      y: Math.max(4, Math.min(y, Math.max(4, window.innerHeight - h - 4)))
    }),
    store: {
      get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
      set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
    },
    parseJSON: (v) => {
      if (typeof v !== 'string') return v;
      try { return JSON.parse(v); } catch { return v; }
    }
  };

  const injectStyles = (t) => {
    document.getElementById('otb-style')?.remove();
    const st = document.createElement('style');
    st.id = 'otb-style';
    st.textContent = `
      #otb-ui, #otb-ui * { box-sizing: border-box; font-family: 'Segoe UI','Inter',system-ui,sans-serif; }
      #otb-ui { position: fixed; z-index: 999999; user-select: none; filter: drop-shadow(0 8px 20px ${t.shadow}); }
      #otb-toggle {
        background: linear-gradient(145deg, ${t.primary}, ${t.primaryD});
        color: #fff; border: none; padding: 12px 22px; border-radius: 48px;
        cursor: grab; font-size: 15px; font-weight: 600; letter-spacing: .3px;
        display: inline-flex; align-items: center; gap: 6px;
        box-shadow: 0 10px 20px -5px ${$.rgba(t.primary, .5)}, 0 0 0 1px ${t.inset} inset;
        transition: transform .25s cubic-bezier(.2,.9,.4,1), box-shadow .25s cubic-bezier(.2,.9,.4,1);
        touch-action: none; will-change: transform;
      }
      #otb-toggle:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 18px 28px -8px ${$.rgba(t.primary, .7)}; }
      #otb-panel {
        position: absolute; bottom: calc(100% + 16px); right: 0; width: 340px; max-height: 82vh;
        background: ${t.bg}; backdrop-filter: blur(18px) saturate(180%);
        -webkit-backdrop-filter: blur(18px) saturate(180%);
        border-radius: 32px; padding: 20px 18px 18px;
        box-shadow: 0 28px 48px -12px ${t.shadow}, 0 0 0 1px ${t.inset} inset, 0 0 0 1px ${$.rgba(t.primary, .25)};
        overflow-y: auto; overflow-x: hidden; color: ${t.text};
        opacity: 0; transform: translateY(10px) scale(.98);
        transition: opacity .2s, transform .25s cubic-bezier(.2,.9,.4,1);
        pointer-events: none;
      }
      #otb-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
      #otb-panel::-webkit-scrollbar { width: 6px; }
      #otb-panel::-webkit-scrollbar-thumb { background: ${$.rgba(t.primary, .6)}; border-radius: 12px; }
      .otb-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; margin-bottom: 8px; border-bottom: 1px solid ${$.rgba(t.text, .06)}; cursor: grab; }
      .otb-title { font-size: 18px; font-weight: 600; background: linear-gradient(135deg, ${t.text}, ${t.secondary}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .otb-close { font-size: 20px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 12px; color: ${t.dim}; cursor: pointer; background: ${$.rgba(t.text, .02)}; transition: all .2s; }
      .otb-close:hover { background: ${$.rgba(t.text, .08)}; color: ${t.text}; transform: scale(1.05); }
      .otb-status { font-size: 13px; font-weight: 500; margin-bottom: 18px; text-align: center; padding: 10px 12px; border-radius: 18px; cursor: pointer; transition: all .15s; }
      .otb-status:hover { transform: scale(1.01); }
      .otb-status small { display: block; font-size: 10px; opacity: .65; margin-top: 3px; }
      .otb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
      .otb-btn { border: none; padding: 11px 6px; border-radius: 18px; cursor: pointer; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; transition: transform .2s, box-shadow .2s, background .2s; background: linear-gradient(145deg, ${$.rgba(t.text, .08)}, ${$.rgba(t.text, .03)}); color: ${t.text}; box-shadow: 0 4px 12px ${$.rgba('#000', .3)}, 0 0 0 1px ${t.inset} inset; }
      .otb-btn:hover { transform: translateY(-3px); box-shadow: 0 16px 24px -8px ${$.rgba('#000', .55)}, 0 0 0 1px ${$.rgba(t.primary, .35)} inset; }
      .otb-btn:active { transform: scale(.96); }
      .otb-btn.accent { background: linear-gradient(145deg, ${t.primary}, ${t.primaryD}); color: #fff; }
      .otb-btn.accent:hover { background: linear-gradient(145deg, ${t.secondary}, ${t.primary}); }
      .otb-btn.weak { background: linear-gradient(145deg, ${t.success}, ${$.darker(t.success, 18)}); color: #0A1F14; font-weight: 600; }
      .otb-btn.danger { background: linear-gradient(145deg, ${t.error}, ${$.darker(t.error, 18)}); color: #fff; }
      .otb-btn[disabled] { opacity: .45; cursor: not-allowed !important; }
      .otb-footer { display: flex; justify-content: space-between; padding-top: 12px; margin-top: 4px; border-top: 1px solid ${$.rgba(t.text, .05)}; font-size: 11px; color: ${t.dim}; }
      .otb-footer span:last-child { background: ${$.rgba(t.text, .03)}; padding: 4px 10px; border-radius: 20px; font-family: monospace; }
      .otb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 10000001; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(6px); opacity: 0; transition: opacity .25s; }
      .otb-overlay.show { opacity: 1; }
      .otb-modal { background: ${t.bg}; backdrop-filter: blur(20px); border-radius: 28px; padding: 28px; width: 420px; max-width: 90vw; color: ${t.text}; box-shadow: 0 32px 64px -16px ${t.shadow}, 0 0 0 1px ${t.inset} inset; transform: scale(.94) translateY(10px); transition: transform .3s cubic-bezier(.2,.9,.4,1); }
      .otb-overlay.show .otb-modal { transform: scale(1) translateY(0); }
      .otb-modal h3 { margin: 0 0 20px; text-align: center; font-size: 18px; font-weight: 600; }
      .otb-input { width: 100%; padding: 14px 16px; border: 1px solid ${$.rgba(t.text, .1)}; border-radius: 16px; background: ${$.rgba(t.text, .04)}; color: ${t.text}; font-size: 16px; outline: none; margin-bottom: 24px; }
      .otb-input:focus { border-color: ${t.primary}; box-shadow: 0 0 0 3px ${$.rgba(t.primary, .2)}; }
      .otb-btns { display: flex; gap: 12px; justify-content: flex-end; }
      .otb-btns.center { justify-content: center; margin-top: 20px; }
      .otb-btn2 { border: none; padding: 12px 28px; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 14px; transition: transform .2s; }
      .otb-btn2.primary { background: linear-gradient(145deg, ${t.primary}, ${t.primaryD}); color: #fff; }
      .otb-btn2.primary:hover { transform: translateY(-2px); }
      .otb-btn2.ghost { background: ${$.rgba(t.text, .06)}; color: ${t.text}; font-weight: 500; }
      .otb-btn2.ghost:hover { background: ${$.rgba(t.text, .12)}; }
      .otb-result { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) scale(.94); background: ${t.bg}; backdrop-filter: blur(20px); border-radius: 28px; padding: 28px; z-index: 10000002; max-width: 80vw; max-height: 80vh; overflow: auto; box-shadow: 0 32px 64px -16px ${t.shadow}, 0 0 0 1px ${t.inset} inset; opacity: 0; transition: all .35s cubic-bezier(.2,.9,.4,1); color: ${t.text}; min-width: 320px; }
      .otb-result.show { opacity: 1; transform: translate(-50%,-50%) scale(1); }
      .otb-result h3 { margin: 0 0 20px; text-align: center; font-size: 18px; padding-bottom: 14px; border-bottom: 1px solid ${$.rgba(t.text, .08)}; }
      .otb-result pre { background: ${$.rgba(t.text, .03)}; padding: 18px; border-radius: 18px; overflow: auto; font-size: 13px; font-family: 'SF Mono','Fira Code',monospace; white-space: pre-wrap; word-wrap: break-word; max-height: 50vh; border: 1px solid ${$.rgba(t.text, .06)}; }
      .otb-toast { position: fixed; top: 24px; right: 24px; background: ${$.rgba(t.solid, .95)}; backdrop-filter: blur(16px); color: ${t.text}; padding: 14px 22px; border-radius: 20px; z-index: 10000000; font-size: 14px; font-weight: 500; box-shadow: 0 20px 40px -12px ${t.shadow}, 0 0 0 1px ${t.inset} inset; transform: translateX(120%) scale(.95); opacity: 0; transition: all .35s cubic-bezier(.2,.9,.4,1); max-width: 380px; }
      .otb-toast.show { transform: translateX(0) scale(1); opacity: 1; }
      .otb-toast.error { border-left: 4px solid ${t.error}; }
      .otb-toast.success { border-left: 4px solid ${t.success}; }
      .otb-player-list { display: flex; flex-direction: column; gap: 6px; max-height: 50vh; overflow-y: auto; margin-top: 4px; }
      .otb-player { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: ${$.rgba(t.text, .03)}; border: 1px solid ${$.rgba(t.text, .05)}; border-radius: 12px; }
      .otb-player-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: ${$.rgba(t.text, .08)}; flex-shrink: 0; }
      .otb-player-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
      .otb-player-name { font-size: 13px; font-weight: 600; color: ${t.text}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .otb-player-meta { font-size: 11px; color: ${t.dim}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .otb-player-badge { font-size: 10px; padding: 2px 8px; border-radius: 8px; flex-shrink: 0; }
      .otb-badge-hp { background: ${$.rgba(t.success, .15)}; color: ${t.success}; }
      .otb-badge-dead { background: ${$.rgba(t.error, .15)}; color: ${t.error}; }
      #otb-mmo-win {
        position: fixed; width: 380px; max-height: 76vh;
        background: ${t.bg}; backdrop-filter: blur(18px) saturate(180%);
        -webkit-backdrop-filter: blur(18px) saturate(180%);
        border-radius: 24px;
        box-shadow: 0 28px 48px -12px ${t.shadow}, 0 0 0 1px ${t.inset} inset, 0 0 0 1px ${$.rgba(t.primary, .25)};
        color: ${t.text}; z-index: 999998; display: none;
        flex-direction: column; overflow: hidden;
      }
      #otb-mmo-win.open { display: flex; }
      .otb-mmo-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px 18px; cursor: grab;
        border-bottom: 1px solid ${$.rgba(t.text, .06)};
        background: ${$.rgba(t.text, .02)};
      }
      .otb-mmo-header:active { cursor: grabbing; }
      .otb-mmo-title { font-size: 15px; font-weight: 600; color: ${t.text}; }
      .otb-mmo-close { font-size: 20px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: ${t.dim}; cursor: pointer; background: transparent; transition: all .2s; }
      .otb-mmo-close:hover { background: ${$.rgba(t.error, .15)}; color: ${t.error}; }
      .otb-mmo-body {
        padding: 16px 18px; overflow-y: auto; flex: 1;
        display: flex; flex-direction: column; gap: 14px;
      }
      .otb-mmo-body::-webkit-scrollbar { width: 6px; }
      .otb-mmo-body::-webkit-scrollbar-thumb { background: ${$.rgba(t.primary, .6)}; border-radius: 12px; }
      .otb-mmo-section-title {
        font-size: 13px; font-weight: 600; color: ${t.text};
        display: flex; align-items: center; gap: 6px;
      }
      .otb-mmo-section-title small { font-size: 10px; font-weight: 400; color: ${t.dim}; margin-left: auto; }
      .otb-mmo-desc { font-size: 11px; color: ${t.dim}; line-height: 1.5; }
      .otb-mmo-regex-list {
        display: flex; flex-direction: column; gap: 4px;
        max-height: 160px; overflow-y: auto;
        padding: 4px 0;
      }
      .otb-mmo-regex-item {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 10px; border-radius: 10px;
        background: ${$.rgba(t.text, .03)};
        border: 1px solid ${$.rgba(t.text, .05)};
      }
      .otb-mmo-regex-text {
        flex: 1; font-family: monospace; font-size: 11px;
        color: ${t.text}; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap;
      }
      .otb-mmo-regex-del {
        background: transparent; border: none; color: ${t.error};
        cursor: pointer; font-size: 14px; padding: 0 4px;
        border-radius: 6px; transition: all .15s;
      }
      .otb-mmo-regex-del:hover { background: ${$.rgba(t.error, .15)}; }
      .otb-mmo-input-row {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 10px; border-radius: 10px;
        background: ${$.rgba(t.text, .04)};
        border: 1px solid ${$.rgba(t.text, .08)};
        font-family: monospace; font-size: 12px;
      }
      .otb-mmo-input-row:focus-within { border-color: ${t.primary}; box-shadow: 0 0 0 2px ${$.rgba(t.primary, .15)}; }
      .otb-mmo-input-row .prefix, .otb-mmo-input-row .suffix { color: ${t.dim}; }
      .otb-mmo-input {
        flex: 1; background: transparent; border: none; outline: none;
        color: ${t.text}; font-family: monospace; font-size: 12px;
        padding: 4px 0;
      }
      .otb-mmo-input::placeholder { color: ${t.dim}; opacity: .6; }
      .otb-mmo-empty { font-size: 11px; color: ${t.dim}; text-align: center; padding: 12px 0; }
      #otb-state-win {
        position: fixed; width: 420px; max-height: 80vh;
        background: ${t.bg}; backdrop-filter: blur(18px) saturate(180%);
        -webkit-backdrop-filter: blur(18px) saturate(180%);
        border-radius: 24px;
        box-shadow: 0 28px 48px -12px ${t.shadow}, 0 0 0 1px ${t.inset} inset, 0 0 0 1px ${$.rgba(t.primary, .25)};
        color: ${t.text}; z-index: 999998; display: none;
        flex-direction: column; overflow: hidden;
      }
      #otb-state-win.open { display: flex; }
      .otb-state-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px 18px; cursor: grab;
        border-bottom: 1px solid ${$.rgba(t.text, .06)};
        background: ${$.rgba(t.text, .02)};
      }
      .otb-state-header:active { cursor: grabbing; }
      .otb-state-title { font-size: 15px; font-weight: 600; color: ${t.text}; }
      .otb-state-close { font-size: 20px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: ${t.dim}; cursor: pointer; background: transparent; transition: all .2s; }
      .otb-state-close:hover { background: ${$.rgba(t.error, .15)}; color: ${t.error}; }
      .otb-state-body {
        padding: 16px 18px; overflow-y: auto; flex: 1;
        display: flex; flex-direction: column; gap: 12px;
      }
      .otb-state-body::-webkit-scrollbar { width: 6px; }
      .otb-state-body::-webkit-scrollbar-thumb { background: ${$.rgba(t.primary, .6)}; border-radius: 12px; }
      .otb-state-row {
        display: flex; align-items: center; gap: 10px;
      }
      .otb-state-label {
        width: 90px; font-size: 12px; color: ${t.dim};
        flex-shrink: 0; font-family: monospace;
      }
      .otb-state-input {
        flex: 1; background: ${$.rgba(t.text, .04)};
        border: 1px solid ${$.rgba(t.text, .08)};
        border-radius: 10px; color: ${t.text};
        padding: 8px 12px; font-size: 13px;
        font-family: monospace; outline: none;
        transition: all .15s;
      }
      .otb-state-input:focus { border-color: ${t.primary}; box-shadow: 0 0 0 2px ${$.rgba(t.primary, .15)}; }
      .otb-state-input::placeholder { color: ${t.dim}; opacity: .5; }
      .otb-state-extra {
        width: 100%; min-height: 120px; resize: vertical;
        background: ${$.rgba(t.text, .04)};
        border: 1px solid ${$.rgba(t.text, .08)};
        border-radius: 10px; color: ${t.text};
        padding: 10px 12px; font-size: 12px;
        font-family: 'SF Mono','Fira Code',monospace;
        outline: none; line-height: 1.5;
        transition: all .15s;
      }
      .otb-state-extra:focus { border-color: ${t.primary}; box-shadow: 0 0 0 2px ${$.rgba(t.primary, .15)}; }
      .otb-state-actions {
        display: flex; gap: 8px; padding: 12px 18px;
        border-top: 1px solid ${$.rgba(t.text, .06)};
        background: ${$.rgba(t.text, .02)};
        flex-wrap: wrap;
      }
      .otb-state-btn {
        flex: 1; min-width: 100px;
        border: 1px solid ${$.rgba(t.text, .1)};
        border-radius: 10px;
        padding: 9px 14px;
        background: ${$.rgba(t.text, .04)};
        color: ${t.text};
        font-size: 13px; font-weight: 500;
        cursor: pointer; transition: all .2s;
        font-family: inherit;
      }
      .otb-state-btn:hover { background: ${$.rgba(t.text, .08)}; transform: translateY(-1px); }
      .otb-state-btn.primary {
        background: linear-gradient(145deg, ${t.primary}, ${t.primaryD});
        color: #fff; border-color: transparent;
        font-weight: 600;
      }
      .otb-state-btn.primary:hover { background: linear-gradient(145deg, ${t.secondary}, ${t.primary}); }
      .otb-state-btn.danger {
        background: linear-gradient(145deg, ${t.error}, ${$.darker(t.error, 18)});
        color: #fff; border-color: transparent;
      }
      .otb-state-auto {
        display: flex; align-items: center; gap: 8px;
        font-size: 12px; color: ${t.dim};
        padding: 0 2px;
      }
      .otb-state-auto input[type=checkbox] {
        accent-color: ${t.primary};
        cursor: pointer;
      }
    `;
    (document.head || document.documentElement).appendChild(st);
  };

  const VM = {
    instance: null,
    resolved: false,
    resolvers: [],
    _promise: null,
    _promiseResolve: null,
    _started: false,

    get promise() {
      if (!this._promise) this._promise = new Promise(r => { this._promiseResolve = r; });
      return this._promise;
    },

    notify(vm, source) {
      if (this.resolved || !vm) return;
      this.resolved = true;
      this.instance = vm;
      try { window.vm = vm; } catch {}
      console.log(`[OTB] VM 捕获成功 (${source}), targets=${vm.runtime?.targets?.length ?? '?'}`);
      this.resolvers.forEach(r => { try { r(vm); } catch {} });
      this.resolvers = [];
      if (this._promiseResolve) { this._promiseResolve(vm); this._promiseResolve = null; }
    },

    findInFiber(rootFiber) {
      const queue = [rootFiber];
      const visited = new Set();
      let count = 0;
      while (queue.length > 0 && count < 5000) {
        const node = queue.shift();
        if (!node || visited.has(node)) continue;
        visited.add(node);
        count++;
        try {
          const mp = node.memoizedProps;
          if (mp && mp.vm && mp.vm.runtime && mp.vm.runtime.targets) return mp.vm;
          const sn = node.stateNode;
          if (sn && sn.runtime && sn.runtime.targets) return sn;
          if (sn && sn.state && sn.state.scratchGui && sn.state.scratchGui.vm) {
            const vm = sn.state.scratchGui.vm;
            if (vm && vm.runtime) return vm;
          }
          const ms = node.memoizedState;
          if (ms) {
            let cur = ms, depth = 0;
            while (cur && depth < 30) {
              if (cur.state && cur.state.scratchGui && cur.state.scratchGui.vm) {
                const vm = cur.state.scratchGui.vm;
                if (vm && vm.runtime) return vm;
              }
              cur = cur.next;
              depth++;
            }
          }
          if (mp) {
            if (mp.scratchGui && mp.scratchGui.vm && mp.scratchGui.vm.runtime) return mp.scratchGui.vm;
            if (mp.runtime && mp.runtime.targets) return mp;
          }
        } catch {}
        if (node.child) queue.push(node.child);
        if (node.sibling) queue.push(node.sibling);
      }
      return null;
    },

    scanReactRoots() {
      if (this.resolved) return true;
      try {
        const rootEl = window.root;
        if (rootEl) {
          for (const key of Object.keys(rootEl)) {
            if (key.startsWith('__reactContainer') || key.startsWith('__reactFiber')) {
              const vm = this.findInFiber(rootEl[key]);
              if (vm) { this.notify(vm, 'window.root'); return true; }
            }
          }
        }
        const domRoot = document.getElementById('root');
        if (domRoot && domRoot !== rootEl) {
          for (const key of Object.keys(domRoot)) {
            if (key.startsWith('__reactContainer') || key.startsWith('__reactFiber')) {
              const vm = this.findInFiber(domRoot[key]);
              if (vm) { this.notify(vm, '#root'); return true; }
            }
          }
        }
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (hook && typeof hook.getFiberRoots === 'function') {
          const roots = hook.getFiberRoots(1);
          if (roots && roots.size > 0) {
            for (const root of roots) {
              const vm = this.findInFiber(root.current);
              if (vm) { this.notify(vm, 'React DevTools'); return true; }
            }
          }
        }
      } catch (e) {
        console.warn('[OTB] React 扫描失败:', e);
      }
      return false;
    },

    start() {
      if (this._started) return;
      this._started = true;
      if (this.scanReactRoots()) return;
      let count = 0;
      const timer = setInterval(() => {
        if (this.resolved) { clearInterval(timer); return; }
        if (this.scanReactRoots()) { clearInterval(timer); return; }
        if (++count >= 50) {
          clearInterval(timer);
          console.warn('[OTB] 15 秒内未能捕获 VM');
        }
      }, 300);
    }
  };

  class OTB {
    constructor() {
      this.th = $.store.get(C.THEME_KEY) || 'dark';
      this.v = null;
      this.mmo = null;
      this.rdy = false;
      this.inRoom = false;
      this.roomId = null;
      this.mySid = null;
      this.opn = false;
      this.camo = false;
      this.camoTimer = null;
      this.retry = 0;
      this.timer = null;
      this.hooked = false;
      this.ui = null;
      this.panel = null;
      this.toggle = null;
      this.statusEl = null;
      this.camoBtn = null;
      this.stateBtn = null;
      this._dragging = false;
      this._lastDetectLog = '';

      this.broadcastBlackList = [];
      this.mmoWin = null;
      this.mmoWinOpen = false;

      this.stateWin = null;
      this.stateWinOpen = false;
      this.stateAutoTimer = null;
      this.stateAutoEnabled = false;
      this.stateInputs = {};

      injectStyles(THEMES[this.th]);
      this.buildUI();
      this.buildMMOWindow();
      this.buildStateWindow();
      VM.start();
      this.startWatch();

      document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
          e.preventDefault();
          this.togglePanel();
        }
      });

      window.addEventListener('resize', () => {
        if (!this.ui) return;
        const r = this.ui.getBoundingClientRect();
        const p = $.clamp(r.left, r.top, r.width, r.height);
        Object.assign(this.ui.style, { left: p.x + 'px', top: p.y + 'px', bottom: 'auto', right: 'auto' });
        $.store.set(C.POS_KEY, p);
        this.repositionMMOWin();
        this.repositionStateWin();
      });
    }

    startWatch() {
      this.checkMMO();
      const tick = () => {
        this.checkMMO();
        const interval = this.rdy ? C.POLL_READY : C.POLL_RETRY;
        this.retry++;
        this.timer = setTimeout(tick, this.retry > 90 && !this.rdy ? 10000 : interval);
      };
      this.timer = setTimeout(tick, C.POLL_RETRY);
    }

    checkMMO() {
      const vmOk = VM.resolved || VM.scanReactRoots();
      const wasReady = this.rdy;
      const wasInRoom = this.inRoom;

      if (!vmOk) {
        this.rdy = false; this.inRoom = false;
        this.mmo = null;
        this.hooked = false; this.roomId = null;
        if (wasReady) this.onLost();
        else this.refreshStatus();
        return;
      }

      this.v = VM.instance;
      this.hookRegister();

      if (!this.mmo && this.v.runtime.ext_CCWMMO && typeof this.v.runtime.ext_CCWMMO.getClientList === 'function') {
        this.mmo = this.v.runtime.ext_CCWMMO;
        if (!this.rdy) this.onRegistered(this.mmo);
      }

      if (!this.mmo && this.v.extensionManager) {
        try {
          const mgr = this.v.extensionManager;
          const le = mgr._loadedExtensions;
          let values = [];
          if (le instanceof Map) values = [...le.values()];
          else if (Array.isArray(le)) values = le;
          else if (le && typeof le === 'object') values = Object.values(le);
          for (const obj of values) {
            const candidate = obj?.instance ?? obj;
            if (candidate && typeof candidate.getClientList === 'function') {
              this.mmo = candidate;
              if (!this.rdy) this.onRegistered(this.mmo);
              break;
            }
          }
        } catch {}
      }

      if (!this.mmo && this.v.runtime) {
        for (const k of Object.getOwnPropertyNames(this.v.runtime)) {
          try {
            const v = this.v.runtime[k];
            if (v && typeof v === 'object' && typeof v.getClientList === 'function') {
              this.mmo = v;
              if (!this.rdy) this.onRegistered(this.mmo);
              break;
            }
          } catch {}
        }
      }

      if (!this.mmo) {
        this.rdy = false; this.inRoom = false; this.roomId = null;
        if (wasReady) this.onLost();
        else this.refreshStatus();
        return;
      }

      const detection = this.detectRoom(this.mmo);
      this.inRoom = detection.inRoom;
      this.roomId = detection.roomId;
      this.rdy = true;

      const logKey = `${this.rdy}|${this.inRoom}|${detection.source}`;
      if (logKey !== this._lastDetectLog) {
        this._lastDetectLog = logKey;
        console.log(`[OTB] 检测: rdy=${this.rdy} inRoom=${this.inRoom} source=${detection.source} roomId=${this.roomId ?? 'null'}`);
      }

      if (!wasInRoom && this.inRoom) this.onRoomEnter();
      else if (wasInRoom && !this.inRoom) this.onRoomLeave();
      else if (!wasReady && this.rdy) this.onRegistered(this.mmo);

      this.refreshStatus();
    }

    detectRoom(ext) {
      try {
        const room = ext.currentRoom;
        if (room && typeof room === 'object') {
          const id = room.id ?? room.roomId ?? room.oid ?? null;
          return { inRoom: true, roomId: id, source: 'currentRoom' };
        }
      } catch {}
      for (const m of ['getRoomInfo', 'getMyInfo', 'getPlayerInfo', 'getCurrentRoom']) {
        try {
          if (typeof ext[m] === 'function') {
            const r = ext[m]();
            if (r && (r.id || r.roomId || r.oid || r.sessionId)) {
              return { inRoom: true, roomId: r.id ?? r.roomId ?? r.oid ?? null, source: `${m}()` };
            }
          }
        } catch {}
      }
      for (const key of ['sessionId', '_sessionId', 'mySessionId', 'currentSessionId']) {
        if (key in ext) {
          const sid = ext[key];
          if (this.validSessionId(sid)) return { inRoom: true, roomId: null, source: `prop:${key}` };
        }
      }
      for (const m of ['getPlayerState', 'getSelfState', 'getSelfInfo']) {
        try {
          if (typeof ext[m] === 'function') {
            const st = ext[m]();
            if (st && this.validSessionId(st.sessionId ?? st.session_id)) {
              return { inRoom: true, roomId: null, source: `${m}().sessionId` };
            }
          }
        } catch {}
      }
      try {
        if (typeof ext.getClientList === 'function') {
          let list = ext.getClientList({ FORMAT: 'JSON' });
          if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch {}
          }
          if (list !== null && list !== undefined && (Array.isArray(list) || typeof list === 'object')) {
            return { inRoom: true, roomId: null, source: 'getClientList' };
          }
        }
      } catch {}
      if (WS_STATE.connected) {
        return { inRoom: true, roomId: null, source: 'websocket' };
      }
      return { inRoom: false, roomId: null, source: 'none' };
    }

    validSessionId(sid) {
      if (sid === null || sid === undefined) return false;
      if (typeof sid === 'number') return !Number.isNaN(sid) && sid !== 0;
      const s = String(sid).trim();
      if (!s) return false;
      if (s === 'NaN' || s === 'null' || s === 'undefined' || s === '0') return false;
      return true;
    }

    hookRegister() {
      if (this.hooked || !this.v) return;
      const proto = this.v?.runtime?.constructor?.prototype;
      if (!proto || !proto.compilerRegisterExtension) return;
      this.hooked = true;
      const orig = proto.compilerRegisterExtension;
      const self = this;
      proto.compilerRegisterExtension = function (name, ext) {
        if (name === 'CCWMMO') {
          self.mmo = ext;
          self.patchBroadcastFilter(ext);
          if (!self.rdy) self.onRegistered(ext);
        }
        return orig.call(this, name, ext);
      };
    }

    patchBroadcastFilter(ext) {
      try {
        ext.dispatchNewMessageWithParams = function (_, util) {
          try {
            const hatParam = util?.thread?.hatParam || {};
            const message = `${hatParam.type}(session=${JSON.stringify(hatParam.sender)},uuid=${JSON.stringify(hatParam.senderUID)},name=${JSON.stringify(hatParam.name)},content=${JSON.stringify(hatParam.content)})`;
            const bl = window.__OTB?.broadcastBlackList || [];
            if (bl.some(re => { try { re.lastIndex = 0; return re.test(message); } catch { return false; } })) {
              return false;
            }
          } catch {}
          return true;
        };
        console.log('[OTB] 广播过滤已挂钩');
      } catch (e) {
        console.warn('[OTB] 广播过滤挂钩失败:', e);
      }
    }

    onRegistered(ext) {
      this.rdy = true;
      this.retry = 0;
      console.log('OTB: CCWMMO 扩展已注册');
      const detection = this.detectRoom(ext);
      this.inRoom = detection.inRoom;
      this.roomId = detection.roomId;
      this.refreshStatus();
      this.updateButtons();
    }

    onLost() {
      console.log('OTB: CCWMMO 已断开');
      this.refreshStatus();
      this.updateButtons();
    }
    onRoomEnter() {
      console.log('OTB: 进入房间', this.roomId);
      this.refreshStatus();
      this.updateButtons();
    }
    onRoomLeave() {
      console.log('OTB: 离开房间');
      this.refreshStatus();
      this.updateButtons();
    }

    manualRecheck() {
      this.refreshStatus('正在重新检测...', 'loading');
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      VM.scanReactRoots();
      this.checkMMO();
      setTimeout(() => {
        if (this.rdy && this.inRoom) this.toast('MMO 已连接');
        else if (this.rdy) this.toast('扩展已加载，但未进入房间', true);
        else this.toast('未检测到 MMO，请检查是否在 MMO 房间中', true);
      }, 400);
      this.retry = 0;
      this.startWatch();
    }

    buildUI() {
      document.getElementById('otb-ui')?.remove();
      const t = THEMES[this.th];

      const ui = document.createElement('div');
      ui.id = 'otb-ui';

      const pos = $.store.get(C.POS_KEY);
      if (pos) Object.assign(ui.style, { left: pos.x + 'px', top: pos.y + 'px', bottom: 'auto', right: 'auto' });
      else Object.assign(ui.style, { right: '24px', bottom: '24px' });

      const toggle = document.createElement('button');
      toggle.id = 'otb-toggle';
      toggle.textContent = 'OTB';
      this.bindBallDrag(toggle);

      const panel = document.createElement('div');
      panel.id = 'otb-panel';
      panel.addEventListener('click', e => e.stopPropagation());
      this.buildPanelContent(panel, t);

      ui.append(toggle, panel);
      document.body.appendChild(ui);

      this.ui = ui;
      this.panel = panel;
      this.toggle = toggle;

      this.bindPanelDrag(panel);
      document.addEventListener('click', e => {
        if (this.opn && this.ui && !this.ui.contains(e.target)) this.togglePanel(false);
      });
    }

    buildPanelContent(panel, t) {
      const header = document.createElement('div');
      header.className = 'otb-header';
      header.innerHTML = `<div class="otb-title">⚡ Online Toolbox</div><div class="otb-close">×</div>`;
      header.querySelector('.otb-close').addEventListener('click', () => this.togglePanel(false));
      panel.appendChild(header);

      const status = document.createElement('div');
      status.className = 'otb-status';
      status.title = '点击重新检测 MMO 连接';
      status.addEventListener('click', e => { e.stopPropagation(); this.manualRecheck(); });
      panel.appendChild(status);
      this.statusEl = status;

      const grid = document.createElement('div');
      grid.className = 'otb-grid';
      const self = this;
      const btns = [
        { t: '获取信息', c: 'accent', f: () => self.getInfo() },
        { t: '修改名称', c: '', f: () => self.changeName() },
        { t: '修改ID', c: '', f: () => self.changeID() },
        { t: '广播', c: 'accent', f: () => self.openMMOWin() },
        { t: '状态编辑', c: 'accent', f: () => self.openStateWin() },
        { t: '混淆身份', c: 'weak', f: () => self.toggleCamo() },
        { t: '重置状态', c: 'danger', f: () => self.resetState() },
        { t: '在线列表', c: 'accent', f: () => self.showList() },
        { t: '切换主题', c: '', f: () => self.toggleTheme() }
      ];
      btns.forEach(b => {
        const el = document.createElement('button');
        el.className = 'otb-btn' + (b.c ? ' ' + b.c : '');
        el.textContent = b.t;
        el.addEventListener('click', e => {
          e.stopPropagation();
          if ((!this.rdy || !this.inRoom) && !['切换主题', '重置状态', '广播', '状态编辑'].includes(b.t)) {
            this.toast('未进入 MMO 房间，无法执行', true);
            return;
          }
          b.f();
        });
        if (b.t === '混淆身份') this.camoBtn = el;
        if (b.t === '状态编辑') this.stateBtn = el;
        if (b.t === '切换主题' || b.t === '重置状态') el.dataset.always = '1';
        grid.appendChild(el);
      });
      panel.appendChild(grid);

      const footer = document.createElement('div');
      footer.className = 'otb-footer';
      footer.innerHTML = `<span>v3.4.1</span><span>Ctrl+Shift+V</span>`;
      panel.appendChild(footer);
    }

    bindBallDrag(btn) {
      let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, pressing = false;
      const down = e => {
        if (e.button !== undefined && e.button !== 0) return;
        pressing = true; moved = false; this._dragging = false;
        const r = this.ui.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        sx = p.clientX; sy = p.clientY; ox = r.left; oy = r.top;
        btn.style.cursor = 'grabbing';
        btn.style.transition = 'none';
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', up);
      };
      const move = e => {
        if (!pressing) return;
        const p = e.touches ? e.touches[0] : e;
        const dx = p.clientX - sx, dy = p.clientY - sy;
        if (!moved && Math.hypot(dx, dy) > 4) { moved = true; this._dragging = true; }
        if (!moved) return;
        if (e.cancelable) e.preventDefault();
        const r = this.ui.getBoundingClientRect();
        const q = $.clamp(ox + dx, oy + dy, r.width, r.height);
        Object.assign(this.ui.style, { left: q.x + 'px', top: q.y + 'px', bottom: 'auto', right: 'auto' });
      };
      const up = () => {
        if (!pressing) return;
        pressing = false;
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', up);
        btn.style.cursor = 'grab';
        btn.style.transition = '';
        if (moved) {
          const r = this.ui.getBoundingClientRect();
          $.store.set(C.POS_KEY, { x: r.left, y: r.top });
          setTimeout(() => { this._dragging = false; }, 0);
        } else {
          this._dragging = false;
          this.togglePanel();
        }
      };
      btn.addEventListener('mousedown', down);
      btn.addEventListener('touchstart', down, { passive: true });
    }

    bindPanelDrag(panel) {
      const header = panel.querySelector('.otb-header');
      if (!header) return;
      let dragging = false, sx, sy, ox, oy;
      header.addEventListener('mousedown', e => {
        if (e.target.classList.contains('otb-close')) return;
        dragging = true;
        const r = this.ui.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        e.preventDefault();
      });
      const move = e => {
        if (!dragging) return;
        const r = this.ui.getBoundingClientRect();
        const q = $.clamp(ox + e.clientX - sx, oy + e.clientY - sy, r.width, r.height);
        Object.assign(this.ui.style, { left: q.x + 'px', top: q.y + 'px', bottom: 'auto', right: 'auto' });
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        const r = this.ui.getBoundingClientRect();
        $.store.set(C.POS_KEY, { x: r.left, y: r.top });
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
    }

    togglePanel(force) {
      if (!this.panel) return;
      this.opn = typeof force === 'boolean' ? force : !this.opn;
      this.panel.classList.toggle('open', this.opn);
      this.toggle.textContent = this.opn ? '关闭' : 'OTB';
      if (this.opn) { this.refreshStatus(); this.updateButtons(); }
    }

    updateButtons() {
      if (!this.panel) return;
      this.panel.querySelectorAll('.otb-btn').forEach(b => {
        if (b.dataset.always) return;
        b.disabled = !(this.rdy && this.inRoom);
      });
    }

    refreshStatus(text, force) {
      const el = this.statusEl || document.querySelector('.otb-status');
      if (!el) return;
      const t = THEMES[this.th];
      let msg, sub = '', color;

      if (force === 'loading') {
        msg = text || '正在重新检测...';
        color = t.primary;
      } else if (text) {
        msg = text;
        color = force === true ? t.error : t.success;
      } else if (this.rdy && this.inRoom) {
        msg = 'MMO 已连接 · 房间正常';
        if (this.roomId) sub = `房间: ${this.roomId}`;
        color = t.success;
      } else if (this.rdy && !this.inRoom) {
        msg = '扩展已加载 · 未进入房间';
        sub = '点击重新检测';
        color = t.warning;
      } else {
        msg = 'MMO 未连接 · 点击重试';
        sub = '未检测到 CCWMMO 扩展';
        color = t.error;
      }

      el.innerHTML = `${$.esc(msg)}${sub ? `<small>${$.esc(sub)}</small>` : ''}`;
      el.style.color = color;
      el.style.background = $.rgba(color, 0.06);
      el.style.border = `1px solid ${$.rgba(color, 0.18)}`;
    }

    buildMMOWindow() {
      document.getElementById('otb-mmo-win')?.remove();
      const t = THEMES[this.th];
      const win = document.createElement('div');
      win.id = 'otb-mmo-win';

      const pos = $.store.get(C.MMO_WIN_POS_KEY);
      if (pos) {
        Object.assign(win.style, { left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' });
      } else {
        Object.assign(win.style, {
          right: '24px',
          top: '100px'
        });
      }

      const header = document.createElement('div');
      header.className = 'otb-mmo-header';
      header.innerHTML = `<div class="otb-mmo-title">MMO 广播</div><div class="otb-mmo-close">×</div>`;
      header.querySelector('.otb-mmo-close').addEventListener('click', () => this.closeMMOWin());
      win.appendChild(header);

      const body = document.createElement('div');
      body.className = 'otb-mmo-body';
      win.appendChild(body);

      document.body.appendChild(win);
      this.mmoWin = win;

      this.bindMMOWinDrag(win, header);
      this.renderMMOWinBody();
    }

    renderMMOWinBody() {
      const body = this.mmoWin?.querySelector('.otb-mmo-body');
      if (!body) return;
      body.innerHTML = '';

      const secTitle = document.createElement('div');
      secTitle.className = 'otb-mmo-section-title';
      secTitle.innerHTML = `过滤广播 <small>${this.broadcastBlackList.length} 条</small>`;
      body.appendChild(secTitle);

      const desc = document.createElement('div');
      desc.className = 'otb-mmo-desc';
      desc.textContent = '消息内容匹配任一正则时，Scratch 将不会处理该广播。';
      body.appendChild(desc);

      const list = document.createElement('div');
      list.className = 'otb-mmo-regex-list';
      if (this.broadcastBlackList.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'otb-mmo-empty';
        empty.textContent = '（无过滤规则）';
        list.appendChild(empty);
      } else {
        this.broadcastBlackList.forEach((re, idx) => {
          const item = document.createElement('div');
          item.className = 'otb-mmo-regex-item';
          const text = document.createElement('span');
          text.className = 'otb-mmo-regex-text';
          text.textContent = re.toString();
          text.title = re.toString();
          const del = document.createElement('button');
          del.className = 'otb-mmo-regex-del';
          del.textContent = '×';
          del.title = '删除';
          del.addEventListener('click', () => {
            this.broadcastBlackList.splice(idx, 1);
            this.renderMMOWinBody();
          });
          item.append(text, del);
          list.appendChild(item);
        });
      }
      body.appendChild(list);

      const inputRow = document.createElement('div');
      inputRow.className = 'otb-mmo-input-row';
      const pre = document.createElement('span');
      pre.className = 'prefix';
      pre.textContent = '/';
      const input = document.createElement('input');
      input.className = 'otb-mmo-input';
      input.type = 'text';
      input.placeholder = '输入正则，回车添加';
      const suf = document.createElement('span');
      suf.className = 'suffix';
      suf.textContent = '/g';
      inputRow.append(pre, input, suf);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const v = input.value.trim();
          if (!v) return;
          try {
            const re = new RegExp(v, 'g');
            this.broadcastBlackList.push(re);
            input.value = '';
            this.renderMMOWinBody();
            this.toast('已添加过滤规则');
          } catch (err) {
            input.style.color = '#A33A3A';
            setTimeout(() => { input.style.color = ''; }, 600);
            this.toast('正则无效: ' + err.message, true);
          }
        }
      });
      body.appendChild(inputRow);

      const sendTitle = document.createElement('div');
      sendTitle.className = 'otb-mmo-section-title';
      sendTitle.textContent = '发送广播';
      body.appendChild(sendTitle);

      const sendDesc = document.createElement('div');
      sendDesc.className = 'otb-mmo-desc';
      sendDesc.innerHTML = '格式：<code>类型("内容")</code> 或 <code>类型()</code>';
      body.appendChild(sendDesc);

      const sendRow = document.createElement('div');
      sendRow.className = 'otb-mmo-input-row';
      const sendInput = document.createElement('input');
      sendInput.className = 'otb-mmo-input';
      sendInput.type = 'text';
      sendInput.placeholder = '如: chat("hello")';
      sendRow.appendChild(sendInput);
      sendInput.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const val = sendInput.value.trim();
        if (!val) return;
        let match;
        if ((match = val.match(/(.*?)\("(.*?)"\)/))) {
          try {
            this.sendBroadcast({
              type: match[1],
              content: JSON.parse('"' + match[2] + '"')
            });
            sendInput.value = '';
          } catch {
            this.flashError(sendInput);
          }
        } else if ((match = val.match(/(.*?)\(\)/))) {
          try {
            this.sendBroadcast({ type: match[1], content: '' });
            sendInput.value = '';
          } catch {
            this.flashError(sendInput);
          }
        } else {
          this.flashError(sendInput);
        }
      });
      body.appendChild(sendRow);
    }

    flashError(el) {
      el.style.color = '#A33A3A';
      setTimeout(() => { el.style.color = ''; }, 600);
      this.toast('广播格式错误', true);
    }

    sendBroadcast({ type, content }) {
      if (!this.mmo) return this.toast('MMO 未就绪', true);
      const ext = this.mmo;
      try {
        if (typeof ext.broadcastMsg === 'function') {
          ext.broadcastMsg({ type, content });
          this.toast(`已发送: ${type}("${content}")`);
          return;
        }
      } catch (e) {
        console.warn('[OTB] broadcastMsg 调用失败:', e);
      }
      this.toast('扩展未提供 broadcastMsg', true);
    }

    bindMMOWinDrag(win, header) {
      let dragging = false, sx, sy, ox, oy;
      header.addEventListener('mousedown', e => {
        if (e.target.classList.contains('otb-mmo-close')) return;
        dragging = true;
        const r = win.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        e.preventDefault();
      });
      const move = e => {
        if (!dragging) return;
        const r = win.getBoundingClientRect();
        const q = $.clamp(ox + e.clientX - sx, oy + e.clientY - sy, r.width, r.height);
        Object.assign(win.style, { left: q.x + 'px', top: q.y + 'px', right: 'auto', bottom: 'auto' });
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        const r = win.getBoundingClientRect();
        $.store.set(C.MMO_WIN_POS_KEY, { x: r.left, y: r.top });
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
    }

    repositionMMOWin() {
      if (!this.mmoWin) return;
      const r = this.mmoWin.getBoundingClientRect();
      const p = $.clamp(r.left, r.top, r.width, r.height);
      Object.assign(this.mmoWin.style, { left: p.x + 'px', top: p.y + 'px', right: 'auto', bottom: 'auto' });
      $.store.set(C.MMO_WIN_POS_KEY, p);
    }

    openMMOWin() {
      if (!this.mmoWin) return;
      this.mmoWinOpen = true;
      this.mmoWin.classList.add('open');
      this.renderMMOWinBody();
    }

    closeMMOWin() {
      if (!this.mmoWin) return;
      this.mmoWinOpen = false;
      this.mmoWin.classList.remove('open');
    }

    buildStateWindow() {
      document.getElementById('otb-state-win')?.remove();
      const t = THEMES[this.th];
      const win = document.createElement('div');
      win.id = 'otb-state-win';

      const pos = $.store.get(C.STATE_WIN_POS_KEY);
      if (pos) {
        Object.assign(win.style, { left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' });
      } else {
        Object.assign(win.style, {
          left: '24px',
          top: '100px'
        });
      }

      const header = document.createElement('div');
      header.className = 'otb-state-header';
      header.innerHTML = `<div class="otb-state-title">MMO 状态编辑</div><div class="otb-state-close">×</div>`;
      header.querySelector('.otb-state-close').addEventListener('click', () => this.closeStateWin());
      win.appendChild(header);

      const body = document.createElement('div');
      body.className = 'otb-state-body';
      win.appendChild(body);

      const actions = document.createElement('div');
      actions.className = 'otb-state-actions';
      win.appendChild(actions);

      document.body.appendChild(win);
      this.stateWin = win;

      this.bindStateWinDrag(win, header);
      this.renderStateWinBody();
    }

    renderStateWinBody() {
      const body = this.stateWin?.querySelector('.otb-state-body');
      const actions = this.stateWin?.querySelector('.otb-state-actions');
      if (!body || !actions) return;
      body.innerHTML = '';
      actions.innerHTML = '';
      this.stateInputs = {};

      const fields = [
        { key: 'name', label: 'name', ph: '玩家名称', type: 'text' },
        { key: 'sessionId', label: 'sessionId', ph: '会话ID', type: 'text' },
        { key: 'x', label: 'x', ph: 'X 坐标', type: 'number' },
        { key: 'y', label: 'y', ph: 'Y 坐标', type: 'number' },
        { key: 'direction', label: 'direction', ph: '方向 (0-360)', type: 'number' },
        { key: 'scale', label: 'scale', ph: '大小 (0-200)', type: 'number' }
      ];

      fields.forEach(f => {
        const row = document.createElement('div');
        row.className = 'otb-state-row';
        const label = document.createElement('div');
        label.className = 'otb-state-label';
        label.textContent = f.label;
        const input = document.createElement('input');
        input.className = 'otb-state-input';
        input.type = f.type;
        input.placeholder = f.ph;
        if (f.type === 'number') {
          input.step = 'any';
        }
        row.append(label, input);
        body.appendChild(row);
        this.stateInputs[f.key] = input;
        if (this.stateAutoEnabled) {
          input.addEventListener('input', () => this.scheduleAutoApply());
        }
      });

      const extraLabel = document.createElement('div');
      extraLabel.className = 'otb-state-label';
      extraLabel.style.marginTop = '4px';
      extraLabel.textContent = 'extra (JSON)';
      body.appendChild(extraLabel);

      const extra = document.createElement('textarea');
      extra.className = 'otb-state-extra';
      extra.placeholder = '{"生命值":100,"血量上限":100,"造型":"默认"}';
      extra.spellcheck = false;
      body.appendChild(extra);
      this.stateInputs.extra = extra;
      if (this.stateAutoEnabled) {
        extra.addEventListener('input', () => this.scheduleAutoApply());
      }

      const btnRead = document.createElement('button');
      btnRead.className = 'otb-state-btn';
      btnRead.textContent = '读取当前值';
      btnRead.addEventListener('click', () => this.readMyState());
      actions.appendChild(btnRead);

      const btnApply = document.createElement('button');
      btnApply.className = 'otb-state-btn primary';
      btnApply.textContent = '应用';
      btnApply.addEventListener('click', () => this.applyMyState());
      actions.appendChild(btnApply);

      const btnClear = document.createElement('button');
      btnClear.className = 'otb-state-btn danger';
      btnClear.textContent = '清空';
      btnClear.addEventListener('click', () => {
        Object.values(this.stateInputs).forEach(el => { el.value = ''; });
      });
      actions.appendChild(btnClear);

      const autoRow = document.createElement('div');
      autoRow.className = 'otb-state-auto';
      autoRow.style.width = '100%';
      autoRow.style.marginTop = '4px';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = this.stateAutoEnabled;
      cb.addEventListener('change', () => {
        this.stateAutoEnabled = cb.checked;
        Object.values(this.stateInputs).forEach(el => {
          el.oninput = cb.checked ? () => this.scheduleAutoApply() : null;
        });
        if (cb.checked) this.toast('实时同步已开启');
        else this.toast('实时同步已关闭');
      });
      const cbLabel = document.createElement('label');
      cbLabel.textContent = '实时同步（输入即应用，500ms 节流）';
      cbLabel.style.cursor = 'pointer';
      cbLabel.prepend(cb);
      autoRow.appendChild(cbLabel);
      actions.appendChild(autoRow);
    }

    getMyPlayer() {
      if (!this.mmo) return null;
      try {
        let list = this.mmo.getClientList({ FORMAT: 'JSON' });
        if (typeof list === 'string') {
          try { list = JSON.parse(list); } catch {}
        }
        if (!Array.isArray(list)) return null;
        if (list.length === 0) return null;
        if (this.mySid) {
          const found = list.find(p => (p.sessionId ?? p.session_id) === this.mySid);
          if (found) return found;
        }
        if (list.length === 1) return list[0];
        return null;
      } catch {
        return null;
      }
    }

    readMyState() {
      const me = this.getMyPlayer();
      if (!me) return this.toast('无法识别自己，请先执行一次改名或等待同步', true);
      const fields = ['name', 'sessionId', 'x', 'y', 'direction', 'scale'];
      fields.forEach(k => {
        if (this.stateInputs[k]) {
          this.stateInputs[k].value = me[k] != null ? String(me[k]) : '';
        }
      });
      if (this.stateInputs.extra) {
        let extra = me.extra;
        if (typeof extra === 'string') {
          try { extra = JSON.stringify(JSON.parse(extra), null, 2); } catch {}
        } else if (extra && typeof extra === 'object') {
          extra = JSON.stringify(extra, null, 2);
        }
        this.stateInputs.extra.value = extra || '';
      }
      this.toast('已读取当前状态');
    }

    scheduleAutoApply() {
      if (!this.stateAutoEnabled) return;
      if (this.stateAutoTimer) clearTimeout(this.stateAutoTimer);
      this.stateAutoTimer = setTimeout(() => {
        this.stateAutoTimer = null;
        this.applyMyState(true);
      }, 500);
    }

    applyMyState(silent = false) {
      if (!this.mmo) return this.toast('MMO 未就绪', true);
      if (!this.inRoom) return this.toast('未进入房间', true);

      const payload = [];
      const numericFields = ['x', 'y', 'direction', 'scale'];
      const fields = ['name', 'sessionId', 'x', 'y', 'direction', 'scale'];

      fields.forEach(k => {
        const el = this.stateInputs[k];
        if (!el) return;
        const v = el.value.trim();
        if (v === '') return;
        if (numericFields.includes(k)) {
          const n = Number(v);
          if (Number.isNaN(n)) {
            if (!silent) this.toast(`字段 ${k} 不是有效数字`, true);
            return;
          }
          payload.push([k, n]);
        } else {
          payload.push([k, v]);
        }
      });

      const extraEl = this.stateInputs.extra;
      if (extraEl) {
        const raw = extraEl.value.trim();
        if (raw !== '') {
          try {
            JSON.parse(raw);
            payload.push(['extra', raw]);
          } catch (e) {
            if (!silent) this.toast('extra 不是合法 JSON', true);
            return;
          }
        }
      }

      if (payload.length === 0) {
        if (!silent) this.toast('没有要应用的字段', true);
        return;
      }

      payload.forEach(([key, value]) => {
        try {
          this.mmo.setPlayerState({ PLAYER_INFO: key, VALUE: value });
        } catch (e) {
          console.warn('[OTB] setPlayerState 失败:', key, e);
        }
      });

      if (key = payload.find(([k]) => k === 'sessionId')) {
        this.mySid = key[1];
      }

      if (!silent) this.toast(`已应用 ${payload.length} 个字段`);
    }

    bindStateWinDrag(win, header) {
      let dragging = false, sx, sy, ox, oy;
      header.addEventListener('mousedown', e => {
        if (e.target.classList.contains('otb-state-close')) return;
        dragging = true;
        const r = win.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        e.preventDefault();
      });
      const move = e => {
        if (!dragging) return;
        const r = win.getBoundingClientRect();
        const q = $.clamp(ox + e.clientX - sx, oy + e.clientY - sy, r.width, r.height);
        Object.assign(win.style, { left: q.x + 'px', top: q.y + 'px', right: 'auto', bottom: 'auto' });
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        const r = win.getBoundingClientRect();
        $.store.set(C.STATE_WIN_POS_KEY, { x: r.left, y: r.top });
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
    }

    repositionStateWin() {
      if (!this.stateWin) return;
      const r = this.stateWin.getBoundingClientRect();
      const p = $.clamp(r.left, r.top, r.width, r.height);
      Object.assign(this.stateWin.style, { left: p.x + 'px', top: p.y + 'px', right: 'auto', bottom: 'auto' });
      $.store.set(C.STATE_WIN_POS_KEY, p);
    }

    openStateWin() {
      if (!this.stateWin) return;
      this.stateWinOpen = true;
      this.stateWin.classList.add('open');
      this.renderStateWinBody();
      setTimeout(() => {
        this.readMyState();
      }, 200);
    }

    closeStateWin() {
      if (!this.stateWin) return;
      this.stateWinOpen = false;
      this.stateWin.classList.remove('open');
      if (this.stateAutoTimer) {
        clearTimeout(this.stateAutoTimer);
        this.stateAutoTimer = null;
      }
    }

    toast(msg, isErr = false) {
      document.querySelector('.otb-toast')?.remove();
      const el = document.createElement('div');
      el.className = 'otb-toast ' + (isErr ? 'error' : 'success');
      el.textContent = msg;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 400);
      }, 3200);
    }

    modal({ title, body, buttons, wide }) {
      const overlay = document.createElement('div');
      overlay.className = 'otb-overlay';
      const box = document.createElement('div');
      box.className = 'otb-modal';
      if (wide) box.style.width = wide;
      const h = document.createElement('h3');
      h.textContent = title;
      box.appendChild(h);
      if (body) box.appendChild(body);
      const btnRow = document.createElement('div');
      btnRow.className = 'otb-btns';
      buttons.items.forEach(b => {
        const el = document.createElement('button');
        el.className = 'otb-btn2 ' + (b.type || 'ghost');
        el.textContent = b.label;
        el.addEventListener('click', () => b.onClick?.(overlay, box));
        btnRow.appendChild(el);
      });
      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(overlay); });
      return { overlay, box };
    }

    closeModal(overlay) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }

    prompt(title, placeholder, onOk) {
      const input = document.createElement('input');
      input.className = 'otb-input';
      input.type = 'text';
      input.placeholder = placeholder || '';
      const { overlay } = this.modal({
        title, body: input,
        buttons: { items: [
          { label: '取消', type: 'ghost', onClick: o => this.closeModal(o) },
          { label: '确定', type: 'primary', onClick: o => { if (input.value.trim()) onOk(input.value.trim()); this.closeModal(o); } }
        ]}
      });
      setTimeout(() => input.focus(), 100);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { if (input.value.trim()) onOk(input.value.trim()); this.closeModal(overlay); }
        if (e.key === 'Escape') this.closeModal(overlay);
      });
    }

    result(title, content) {
      document.querySelector('.otb-result')?.remove();
      const txt = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
      const box = document.createElement('div');
      box.className = 'otb-result';
      box.innerHTML = `<h3>${$.esc(title)}</h3><pre></pre>`;
      box.querySelector('pre').textContent = txt;
      const btns = document.createElement('div');
      btns.className = 'otb-btns center';
      const copy = document.createElement('button');
      copy.className = 'otb-btn2 primary';
      copy.textContent = '复制';
      copy.addEventListener('click', () => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(txt).then(() => this.toast('已复制'));
        } else {
          const ta = document.createElement('textarea');
          ta.value = txt; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove();
          this.toast('已复制');
        }
      });
      const close = document.createElement('button');
      close.className = 'otb-btn2 ghost';
      close.textContent = '关闭';
      close.addEventListener('click', () => { box.classList.remove('show'); setTimeout(() => box.remove(), 300); });
      btns.append(copy, close);
      box.appendChild(btns);
      document.body.appendChild(box);
      requestAnimationFrame(() => box.classList.add('show'));
    }

    customModal(title, contentNode, width = '480px') {
      document.querySelector('.otb-custom-modal')?.remove();
      const overlay = document.createElement('div');
      overlay.className = 'otb-overlay otb-custom-modal';
      const box = document.createElement('div');
      box.className = 'otb-modal';
      box.style.width = width;
      const h = document.createElement('h3');
      h.textContent = title;
      box.appendChild(h);
      box.appendChild(contentNode);
      const btnRow = document.createElement('div');
      btnRow.className = 'otb-btns center';
      const close = document.createElement('button');
      close.className = 'otb-btn2 ghost';
      close.textContent = '关闭';
      close.addEventListener('click', () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
      });
      btnRow.appendChild(close);
      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          overlay.classList.remove('show');
          setTimeout(() => overlay.remove(), 300);
        }
      });
    }

    call(method, ...args) {
      const target = this.mmo;
      if (!target) { this.toast('MMO 未就绪', true); return null; }
      if (method === 'setPlayerState' && !this.inRoom) {
        this.toast('未进入房间，无法修改玩家状态', true);
        return null;
      }
      try {
        if (typeof target[method] !== 'function') throw new Error(`方法 ${method} 不存在`);
        return target[method](...args);
      } catch (e) {
        this.toast(`调用失败: ${e.message}`, true);
        return null;
      }
    }

    getInfo() {
      let r = this.call('getClientList', { FORMAT: 'JSON' });
      if (r === null || r === undefined) return;
      if (typeof r === 'string') {
        try { r = JSON.parse(r); } catch {}
      }
      this.result('MMO 信息', r);
    }

    changeName() {
      this.prompt('修改名称', '输入新名称 (≤50字符)', val => {
        const n = $.esc(val).slice(0, C.MAX_NAME);
        if (!n) return this.toast('名称不能为空', true);
        if (!this.inRoom) return this.toast('未进入房间', true);
        this.call('setPlayerState', { PLAYER_INFO: 'name', VALUE: n });
        this.toast('名称修改请求已发送');
      });
    }

    changeID() {
      this.prompt('修改 Session ID', '输入新ID (≤50字符)', val => {
        const id = $.esc(val).slice(0, C.MAX_ID);
        if (!id) return this.toast('ID不能为空', true);
        if (!this.inRoom) return this.toast('未进入房间', true);
        this.mySid = id;
        this.call('setPlayerState', { PLAYER_INFO: 'sessionId', VALUE: id });
        this.toast('ID修改请求已发送');
      });
    }

    toggleCamo() {
      this.camo = !this.camo;
      const t = THEMES[this.th];
      if (this.camo) {
        this.camoTimer = setInterval(() => {
          if (!this.rdy || !this.inRoom) return;
          try {
            this.call('setPlayerState', { PLAYER_INFO: 'name', VALUE: 'Camo_' + $.rand(5) });
            this.call('setPlayerState', { PLAYER_INFO: 'sessionId', VALUE: 'CID_' + $.rand(6) });
          } catch {}
        }, 50);
        this.toast('混淆身份模式已开启');
        if (this.camoBtn) {
          this.camoBtn.style.background = `linear-gradient(145deg, ${t.error}, ${$.darker(t.error, 18)})`;
          this.camoBtn.style.color = '#fff';
          this.camoBtn.textContent = '混淆开启';
        }
      } else {
        if (this.camoTimer) { clearInterval(this.camoTimer); this.camoTimer = null; }
        this.toast('混淆身份模式已关闭');
        if (this.camoBtn) {
          this.camoBtn.style.background = '';
          this.camoBtn.style.color = '';
          this.camoBtn.textContent = '混淆身份';
        }
      }
    }

    resetState() {
      this.prompt('重置状态', '输入 "yes" 确认重置名称和ID', val => {
        if (val.toLowerCase() !== 'yes') return this.toast('已取消', true);
        if (!this.inRoom) return this.toast('未进入房间', true);
        this.call('setPlayerState', { PLAYER_INFO: 'name', VALUE: '游客' });
        this.call('setPlayerState', { PLAYER_INFO: 'sessionId', VALUE: 'guest_' + $.rand(4) });
        this.toast('状态已重置');
      });
    }

    showList() {
      let raw = this.call('getClientList', { FORMAT: 'JSON' });
      if (raw === null || raw === undefined) {
        return this.toast('获取失败', true);
      }

      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); }
        catch (e) {
          console.warn('[OTB] getClientList 返回的字符串无法解析:', raw);
          return this.toast('数据解析失败', true);
        }
      }

      const list = this.extractPlayerList(raw);

      if (!list.length) {
        console.warn('[OTB] 未解析出玩家，原始数据:', raw);
        this.result('原始数据 (未解析出玩家)', raw);
        return this.toast('解析后无在线玩家', true);
      }

      const box = document.createElement('div');
      box.className = 'otb-player-list';
      list.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'otb-player';

        const avatar = document.createElement('img');
        avatar.className = 'otb-player-avatar';
        avatar.src = p.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="20" fill="%23222"/%3E%3Ctext x="20" y="26" text-anchor="middle" font-size="18" fill="%23666"%3E%3F%3C/text%3E%3C/svg%3E';
        avatar.onerror = () => {
          avatar.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="20" fill="%23222"/%3E%3Ctext x="20" y="26" text-anchor="middle" font-size="18" fill="%23666"%3E%3F%3C/text%3E%3C/svg%3E';
        };
        row.appendChild(avatar);

        const info = document.createElement('div');
        info.className = 'otb-player-info';
        const name = document.createElement('div');
        name.className = 'otb-player-name';
        name.textContent = `${i + 1}. ${p.name}`;
        const meta = document.createElement('div');
        meta.className = 'otb-player-meta';
        meta.textContent = `sid: ${p.sid}${p.uid ? ` · uid: ${p.uid}` : ''}`;
        info.appendChild(name);
        info.appendChild(meta);
        row.appendChild(info);

        if (p.hp !== null || p.maxHp !== null) {
          const badge = document.createElement('span');
          badge.className = 'otb-player-badge ' + (p.hp !== null && p.hp <= 0 ? 'otb-badge-dead' : 'otb-badge-hp');
          badge.textContent = p.hp !== null && p.maxHp !== null ? `${p.hp}/${p.maxHp}` : (p.hp !== null ? `HP ${p.hp}` : '');
          if (badge.textContent) row.appendChild(badge);
        }

        box.appendChild(row);
      });

      this.customModal(`在线玩家 (${list.length})`, box, '480px');
    }

    extractPlayerList(raw) {
      const result = [];
      const seen = new Set();

      const pushPlayer = (obj) => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;

        const name = obj.name ?? obj.nickname ?? obj.userName ?? obj.username
                  ?? obj.playerName ?? obj.displayName ?? null;
        const sid = obj.sessionId ?? obj.session_id ?? null;
        const uid = obj.uuid ?? obj.uid ?? obj.userId ?? null;

        if (!name && !sid && !uid) return;

        let extra = null;
        if (obj.extra) {
          try { extra = typeof obj.extra === 'string' ? JSON.parse(obj.extra) : obj.extra; }
          catch {}
        }

        const key = sid || uid || name;
        if (key && seen.has(key)) return;
        if (key) seen.add(key);

        result.push({
          name: name || '未知',
          sid: sid || '---',
          uid: uid || null,
          avatar: (extra && (extra.头像 || extra.avatar)) || obj.avatar || null,
          hp: extra && (extra.生命值 ?? extra.hp) != null ? extra.生命值 ?? extra.hp : null,
          maxHp: extra && (extra.血量上限 ?? extra.maxHp) != null ? extra.血量上限 ?? extra.maxHp : null
        });
      };

      const walk = (node, depth = 0) => {
        if (depth > 5 || node === null || node === undefined) return;

        if (typeof node === 'string') {
          const parsed = $.parseJSON(node);
          if (parsed !== node) walk(parsed, depth + 1);
          return;
        }

        if (Array.isArray(node)) {
          node.forEach(item => {
            if (item && typeof item === 'object') pushPlayer(item);
            else walk(item, depth + 1);
          });
          return;
        }

        if (typeof node !== 'object') return;

        for (const k of ['body', 'data', 'list', 'clients', 'players', 'result']) {
          if (node[k] !== undefined) walk(node[k], depth + 1);
        }

        if ('name' in node || 'sessionId' in node || 'session_id' in node
            || 'uuid' in node || 'nickname' in node) {
          pushPlayer(node);
          return;
        }

        for (const [k, v] of Object.entries(node)) {
          if (v && typeof v === 'object') {
            if ('name' in v || 'sessionId' in v || 'uuid' in v) pushPlayer(v);
            else walk(v, depth + 1);
          } else if (typeof v === 'string') {
            const parsed = $.parseJSON(v);
            if (parsed !== v) walk(parsed, depth + 1);
          }
        }
      };

      walk(raw);
      return result;
    }

    toggleTheme() {
      this.th = this.th === 'dark' ? 'light' : 'dark';
      $.store.set(C.THEME_KEY, this.th);
      const wasOpen = this.opn;
      const mmoOpen = this.mmoWinOpen;
      const stateOpen = this.stateWinOpen;
      injectStyles(THEMES[this.th]);
      this.buildUI();
      this.buildMMOWindow();
      this.buildStateWindow();
      if (wasOpen) this.togglePanel(true);
      if (mmoOpen) this.openMMOWin();
      if (stateOpen) this.openStateWin();
      this.refreshStatus();
      this.toast(`已切换为 ${this.th === 'dark' ? '暗色' : '亮色'} 主题`);
    }
  }

  const start = () => {
    if (window.__OTB) return;
    window.__OTB = new OTB();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  setTimeout(() => { if (!window.__OTB) start(); }, 1000);

})();
