// ==UserScript==
// @name         便捷编辑器 iframe
// @version      0.3.0
// @description  在ccw作品页捕获作品再飞入gandi进行内嵌编辑后再飞回去
// @author       诺言Promise 110200
// @match        https://scratch.mit.edu/*
// @match        https://gonfunko.github.io/scratch-gui/*
// @match        https://aerfaying.com/*
// @match        https://www.ccw.site/*
// @match        https://gitblock.cn/*
// @match        https://world.xiaomawang.com/*
// @match        https://www.cocrea.world/*
// @match        https://coding.xmuer.online/*
// @match        https://create.codelab.club/*
// @match        https://addon.codelab.club/*
// @match        https://www.scratch-cn.cn/*
// @match        https://40code.com/*
// @match        https://turbowarp.org/*
// @match        https://codingclip.com/*
// @match        https://editor.turbowarp.cn/*
// @match        https://0832.ink/rc/*
// @match        https://studio.penguinmod.com/*
// @match        https://codinghou.cn/*
// @match        https://s3player.hetao101.com/*
// @match        https://www.matinslab.com/scratch/*
// @match        https://cocrea.world/gandi*
// @match        https://www.ccw.site/gandi*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_xmlhttpRequest
// @connect      *.aliyuncs.com
// @connect      *.ccw.site
// @connect      cocrea.world
// @connect      *.cocrea.world
// @run-at       document-start
// ==/UserScript==

// 感谢DS的内嵌前端      ——110200

(function () {
  'use strict';

  if (/ccw\.site$/.test(location.hostname)) {
    const isCSP = (node) =>
      node && node.tagName === 'META' &&
      node.getAttribute &&
      node.getAttribute('http-equiv') === 'Content-Security-Policy';

    const origPrepend = Element.prototype.prepend;
    Element.prototype.prepend = function(...nodes) {
      return origPrepend.apply(this, nodes.filter(n => !isCSP(n)));
    };

    const origAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(node) {
      if (isCSP(node)) return node;
      return origAppendChild.call(this, node);
    };

    const origInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(node, ref) {
      if (isCSP(node)) return node;
      return origInsertBefore.call(this, node, ref);
    };

    const origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (name && name.toLowerCase() === 'http-equiv' &&
          value && String(value).toLowerCase() === 'content-security-policy') {
        return;
      }
      return origSetAttribute.call(this, name, value);
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (isCSP(node) && node.parentNode) node.parentNode.removeChild(node);
        }
      }
    });
    const startObserve = () => {
      if (document.head) observer.observe(document.head, { childList: true, subtree: true });
      else setTimeout(startObserve, 10);
    };
    startObserve();

    const cleanExisting = () => {
      document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')
        .forEach(el => el.remove());
    };
    document.addEventListener('DOMContentLoaded', cleanExisting);
    window.addEventListener('load', cleanExisting);
  }

  const W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

  const HOST = location.hostname;
  const PATH = location.pathname;

  const IS_GANDI_EDITOR = (/cocrea\.world$/.test(HOST) && /^\/gandi/.test(PATH)) ||
                          (/ccw\.site$/.test(HOST) && /^\/gandi/.test(PATH));

  const IS_EMBEDDED = (() => {
    try { return window.self !== window.top; } catch (e) { return true; }
  })();

  const KEY_TO_EDITOR = 'twe_gandi_to_editor_v1';
  const KEY_TO_SOURCE = 'twe_gandi_to_source_v1';

  const DATA_TTL_MS = 30 * 60 * 1000;
  const CHANNEL = '__twe_gandi_bridge_v1__';
  const EDITOR_URL = 'https://cocrea.world/gandi?twe=1';

  function makeToken() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function safeGMGet(key, fallback) {
    try {
      const v = GM_getValue(key);
      return v === undefined ? fallback : v;
    } catch (e) { return fallback; }
  }

  function safeGMSet(key, val) {
    try { GM_setValue(key, val); return true; }
    catch (e) { return false; }
  }

  function safeGMDelete(key) {
    try { GM_deleteValue(key); } catch (e) {}
  }

  function readFreshData(key) {
    const stored = safeGMGet(key, null);
    if (!stored || !stored.data || !stored.ts) return null;
    const age = Date.now() - stored.ts;
    if (age > DATA_TTL_MS || age < -60000) {
      safeGMDelete(key);
      return null;
    }
    return stored;
  }

  function isValidVM(v) {
    return !!(v &&
      v.runtime &&
      typeof v.loadProject === 'function' &&
      typeof v.emit === 'function');
  }

  function tryGetVMDirect() {
    const checks = [
      () => W.vm,
      () => W.eureka && W.eureka.vm,
      () => W.Scratch && W.Scratch.vm,
      () => W.Scratch && W.Scratch.runtime && W.Scratch.runtime.extensionManager && W.Scratch.runtime.extensionManager.vm
    ];
    for (const fn of checks) {
      try {
        const v = fn();
        if (isValidVM(v)) return v;
      } catch (e) {}
    }
    return null;
  }

  function findStore(obj, depth, seen) {
    if (!obj || depth > 6 || seen.has(obj)) return null;
    seen.add(obj);
    try {
      if (typeof obj.getState === 'function') {
        const st = obj.getState();
        if (st && st.scratchGui && st.scratchGui.vm) return obj;
      }
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length && i < 40; i++) {
        const v = obj[keys[i]];
        if (v && typeof v === 'object') {
          const found = findStore(v, depth + 1, seen);
          if (found) return found;
        }
      }
    } catch (e) {}
    return null;
  }

  function tryGetVMFromReact() {
    try {
      const containers = [
        document.getElementById('app'),
        document.getElementById('root'),
        document.body
      ].filter(Boolean);
      for (const el of containers) {
        let keys;
        try { keys = Object.keys(el); } catch (e) { continue; }
        for (const k of keys) {
          if (!k.includes('__reactContainer')) continue;
          const store = findStore(el[k], 0, new Set());
          if (store) {
            const st = store.getState && store.getState();
            const v = st && st.scratchGui && st.scratchGui.vm;
            if (isValidVM(v)) return v;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  function getVM(timeout) {
    timeout = timeout || 30000;
    return new Promise((resolve, reject) => {
      let done = false;
      const start = Date.now();
      let timer = null;
      const origBind = W.Function && W.Function.prototype && W.Function.prototype.bind;
      let bindPatched = false;

      function restoreBind() {
        if (!bindPatched) return;
        bindPatched = false;
        try { W.Function.prototype.bind = origBind; } catch (e) {}
      }

      function finish(vm) {
        if (done) return;
        done = true;
        if (timer) clearInterval(timer);
        restoreBind();
        resolve(vm);
      }

      function fail(err) {
        if (done) return;
        done = true;
        if (timer) clearInterval(timer);
        restoreBind();
        reject(err);
      }

      const direct = tryGetVMDirect();
      if (direct) return finish(direct);

      try {
        if (origBind) {
          bindPatched = true;
          W.Function.prototype.bind = function () {
            const target = arguments[0];
            if (!done && target && typeof target === 'object' &&
                target.runtime && target.runtime.targets &&
                typeof target.loadProject === 'function' &&
                typeof target.emit === 'function') {
              finish(target);
            }
            return origBind.apply(this, arguments);
          };
        }
      } catch (e) {}

      timer = setInterval(() => {
        const v = tryGetVMDirect() || tryGetVMFromReact();
        if (v) return finish(v);
        if (Date.now() - start > timeout) fail(new Error('获取 VM 超时'));
      }, 250);
    });
  }

  function patchVMForExport(vm) {
    if (!vm || vm.__twePatched) return;
    try { vm.__twePatched = true; } catch (e) {}

    if (typeof vm.serializeAssets !== 'function') {
      vm.serializeAssets = function (targetId) {
        const runtime = this.runtime;
        if (!runtime) return [];
        const targets = targetId ? [runtime.getTargetById(targetId)] : runtime.targets;
        const results = [];
        for (const target of (targets || [])) {
          if (!target || !target.sprite) continue;
          for (const costume of (target.sprite.costumes || [])) {
            const asset = costume.broken ? costume.broken.asset : costume.asset;
            if (asset) results.push({ fileName: asset.assetId + '.' + asset.dataFormat, fileContent: asset.data });
          }
          for (const sound of (target.sprite.sounds || [])) {
            const asset = sound.broken ? sound.broken.asset : sound.asset;
            if (asset) results.push({ fileName: asset.assetId + '.' + asset.dataFormat, fileContent: asset.data });
          }
        }
        try {
          if (runtime.fontManager && typeof runtime.fontManager.serializeAssets === 'function') {
            for (const f of runtime.fontManager.serializeAssets()) {
              results.push({ fileName: f.assetId + '.' + f.dataFormat, fileContent: f.data });
            }
          }
        } catch (e) {}
        return results;
      };
    }

    if (typeof vm._addFileDescsToZip !== 'function') {
      vm._addFileDescsToZip = function (fileDescs, zip) {
        for (const d of fileDescs) zip.file(d.fileName, d.fileContent);
      };
    }

    if (typeof vm.saveProjectSb3 !== 'function') {
      vm.saveProjectSb3 = async function (type) {
        const JSZip = W.JSZip;
        if (!JSZip) throw new Error('JSZip 未加载');
        const zip = new JSZip();
        zip.file('project.json', this.toJSON());
        this._addFileDescsToZip(this.serializeAssets(), zip);
        return zip.generateAsync({
          type: type || 'blob',
          mimeType: 'application/x.scratch.sb3'
        });
      };
    }
  }

  async function serializeProject(vm) {
    patchVMForExport(vm);
    const blob = await vm.saveProjectSb3();
    if (!blob) throw new Error('序列化失败');
    return await blob.arrayBuffer();
  }

  async function deserializeInto(vm, arrayBuffer) {
    const data = arrayBuffer instanceof ArrayBuffer ? arrayBuffer : arrayBuffer.buffer;

    if (typeof vm.emit !== 'function') {
      try {
        vm.emit = function () {};
      } catch (e) {
        try {
          Object.defineProperty(vm, 'emit', {
            value: function () {},
            writable: true,
            configurable: true,
            enumerable: false
          });
        } catch (e2) {}
      }
    }

    await vm.loadProject(data);
  }

  function ab2b64(ab) {
    const bytes = new Uint8Array(ab);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function b642ab(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function initSourceSide() {
    const RAND = Math.random().toString(36).slice(2, 8);
    const CLS = 'tws' + RAND;

    const styles = `
      .${CLS}-btn {
        position: fixed; bottom: 100px; right: 20px; z-index: 999998;
        width: 54px; height: 54px; border-radius: 50%; border: none;
        background: linear-gradient(135deg, #3a7bd5, #2b5fa8);
        cursor: pointer; padding: 0;
        box-shadow: 0 4px 20px rgba(58,123,213,.42);
        display: flex; align-items: center; justify-content: center;
        transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s;
        user-select: none; touch-action: none; overflow: hidden;
      }
      .${CLS}-btn:hover { transform: scale(1.12) rotate(-5deg); box-shadow: 0 8px 35px rgba(58,123,213,.55); }
      .${CLS}-btn:active { transform: scale(.92); }
      .${CLS}-btn svg { width: 26px; height: 26px; pointer-events: none; }

      .${CLS}-panel {
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        z-index: 999999;
        width: 90vw; max-width: 1200px;
        height: 88vh; max-height: 88vh;
        background: rgba(18, 18, 32, 0.92);
        backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 25px 60px rgba(0,0,0,.85);
        color: #e8e8e8;
        font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
        display: none; flex-direction: column;
        overflow: hidden;
      }
      .${CLS}-panel.open { display: flex; }

      .${CLS}-hdr {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px;
        background: rgba(255,255,255,0.04);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        cursor: move; user-select: none;
        flex-shrink: 0;
      }
      .${CLS}-title {
        flex: 1; font-size: 14px; font-weight: 700;
        background: linear-gradient(135deg, #3a7bd5, #2b5fa8);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        pointer-events: none;
      }
      .${CLS}-close {
        width: 28px; height: 28px; border-radius: 50%; border: none;
        background: rgba(255,255,255,.06); color: rgba(255,255,255,.55);
        font-size: 14px; cursor: pointer; padding: 0;
        display: flex; align-items: center; justify-content: center;
        transition: all .2s;
      }
      .${CLS}-close:hover { background: rgba(255,70,70,.22); color: #ff6b6b; }

      .${CLS}-toolbar {
        display: flex; gap: 8px; padding: 10px 16px;
        background: rgba(255,255,255,.02);
        border-bottom: 1px solid rgba(255,255,255,.05);
        flex-shrink: 0;
      }
      .${CLS}-action {
        border: none; border-radius: 10px;
        padding: 9px 16px; font-size: 13px; font-weight: 600;
        cursor: pointer; transition: all .2s;
        color: #fff; font-family: inherit;
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        white-space: nowrap;
      }
      .${CLS}-open-editor { background: linear-gradient(135deg, #3a7bd5, #2b5fa8); }
      .${CLS}-open-editor:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(58,123,213,.45); }
      .${CLS}-load-back { background: linear-gradient(135deg, #ff8c1a, #ff6b00); }
      .${CLS}-load-back:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(255,140,26,.45); }
      .${CLS}-action:active { transform: translateY(0) scale(.97); }
      .${CLS}-action:disabled { opacity: .5; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

      .${CLS}-status {
        margin-left: auto; font-size: 11px; color: rgba(255,255,255,.5);
        padding: 6px 10px; border-radius: 8px;
        background: rgba(255,255,255,.03);
        text-align: center;
        transition: color .3s;
        display: flex; align-items: center;
      }
      .${CLS}-status.ok   { color: #2ecc71; }
      .${CLS}-status.err  { color: #ff6b6b; }
      .${CLS}-status.busy { color: #ff8c1a; }

      .${CLS}-frame-wrap {
        flex: 1; position: relative;
        background: rgba(0,0,0,.2);
        display: flex;
      }
      .${CLS}-frame {
        width: 100%; height: 100%; border: none; display: block;
        background: #f7f5fb;
      }
      .${CLS}-placeholder {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        flex-direction: column; gap: 12px;
        color: rgba(255,255,255,.5); font-size: 13px;
        background: rgba(0,0,0,.35);
        pointer-events: none;
      }
      .${CLS}-placeholder.hidden { display: none; }

      .${CLS}-toast {
        position: fixed; bottom: 30px; left: 50%;
        transform: translateX(-50%) translateY(24px);
        z-index: 1000000;
        padding: 12px 24px; border-radius: 12px;
        background: rgba(20,20,40,.92);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,.08);
        color: #e8e8e8;
        font-family: -apple-system, 'PingFang SC', sans-serif;
        font-size: 13px; font-weight: 500;
        box-shadow: 0 20px 50px rgba(0,0,0,.75);
        opacity: 0; pointer-events: none;
        transition: all .35s cubic-bezier(.34,1.56,.64,1);
        max-width: 80vw;
      }
      .${CLS}-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      .${CLS}-toast.success { border-color: rgba(46,204,113,.35); }
      .${CLS}-toast.error   { border-color: rgba(231,76,60,.35); }
    `;

    let styleEl = null;
    function ensureStyles() {
      if (styleEl && document.head.contains(styleEl)) return;
      styleEl = document.createElement('style');
      styleEl.id = CLS + '-styles';
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }

    let toastEl = null, toastTimer = null;
    function toast(msg, type, duration) {
      ensureStyles();
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = CLS + '-toast';
        document.body.appendChild(toastEl);
      }
      type = type || 'success';
      const icon = type === 'error' ? '✕' : '✓';
      const color = type === 'error' ? '#ff6b6b' : '#2ecc71';
      toastEl.innerHTML = `<span style="color:${color}">${icon}</span> ${msg}`;
      toastEl.className = CLS + '-toast ' + type;
      void toastEl.offsetWidth;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration || 2200);
    }

    const state = {
      open: false,
      busy: false,
      vm: null,
      panelEl: null,
      iframeEl: null,
      editorReady: false,
      pendingSourceData: false,
      retryTimer: null
    };

    function setStatus(text, kind) {
      const el = document.getElementById(CLS + '-status');
      if (!el) return;
      el.textContent = text;
      el.className = CLS + '-status' + (kind ? ' ' + kind : '');
    }

    function makeDraggable(handle, target) {
      let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button')) return;
        dragging = true;
        sx = e.clientX; sy = e.clientY;
        const rect = target.getBoundingClientRect();
        sl = rect.left; st = rect.top;
        target.style.transform = 'none';
        target.style.left = rect.left + 'px';
        target.style.top = rect.top + 'px';
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        let left = Math.max(0, Math.min(window.innerWidth  - target.offsetWidth,  sl + e.clientX - sx));
        let top  = Math.max(0, Math.min(window.innerHeight - target.offsetHeight, st + e.clientY - sy));
        target.style.left = left + 'px';
        target.style.top  = top  + 'px';
      });
      document.addEventListener('mouseup', () => { dragging = false; });
    }

    function createUI() {
      if (document.getElementById(CLS + '-panel')) return;
      if (!document.body) return;
      ensureStyles();

      const btn = document.createElement('button');
      btn.id = CLS + '-btn';
      btn.className = CLS + '-btn';
      btn.title = '便携编辑器';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel();
      });
      document.body.appendChild(btn);

      const panel = document.createElement('div');
      panel.id = CLS + '-panel';
      panel.className = CLS + '-panel';
      panel.innerHTML = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <span class="${CLS}-title">便携编辑器 · 内嵌 Gandi</span>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-toolbar">
          <button class="${CLS}-action ${CLS}-open-editor" id="${CLS}-open">编辑此作品</button>
          <button class="${CLS}-action ${CLS}-load-back" id="${CLS}-load-back">从编辑器载入</button>
          <div class="${CLS}-status" id="${CLS}-status">就绪</div>
        </div>
        <div class="${CLS}-frame-wrap">
          <iframe class="${CLS}-frame" id="${CLS}-frame" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"></iframe>
          <div class="${CLS}-placeholder" id="${CLS}-placeholder">
            <div>点击「编辑此作品」后，Gandi 编辑器将在此处加载</div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      state.panelEl = panel;
      state.iframeEl = panel.querySelector('#' + CLS + '-frame');

      panel.querySelector('#' + CLS + '-close').addEventListener('click', closePanel);
      panel.querySelector('#' + CLS + '-open').addEventListener('click', handleOpenEditor);
      panel.querySelector('#' + CLS + '-load-back').addEventListener('click', handleLoadFromEditor);
      makeDraggable(panel.querySelector('#' + CLS + '-hdr'), panel);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.open) closePanel();
      });

      window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d || d.__channel !== CHANNEL) return;
        if (d.type === 'editor-ready') {
          state.editorReady = true;
        } else if (d.type === 'editor-loaded') {
          state.pendingSourceData = false;
          stopRetry();
          setStatus('作品已载入编辑器', 'ok');
        } else if (d.type === 'editor-saved') {
          toast('编辑器已保存，可点击「从编辑器载入」替换', 'success', 3000);
          setStatus('编辑器已保存，可以载入', 'ok');
        } else if (d.type === 'editor-load-failed') {
          stopRetry();
          toast('编辑器载入失败：' + (d.message || '未知错误'), 'error', 3500);
          setStatus('编辑器载入失败', 'err');
        }
      });

      checkIncomingData();
    }

    function stopRetry() {
      if (state.retryTimer) {
        clearInterval(state.retryTimer);
        state.retryTimer = null;
      }
    }

    function startRetry() {
      stopRetry();
      let count = 0;
      const maxRetry = 20;
      state.retryTimer = setInterval(() => {
        count++;
        try {
          state.iframeEl.contentWindow.postMessage({
            __channel: CHANNEL, type: 'load-project', ts: Date.now()
          }, '*');
        } catch (e) {}
        if (count >= maxRetry) stopRetry();
      }, 500);
    }

    function checkIncomingData() {
      const stored = readFreshData(KEY_TO_SOURCE);
      if (stored) {
        const age = Math.round((Date.now() - stored.ts) / 1000);
        setStatus(`发现编辑器回传数据（${age}s 前），可点击「从编辑器载入」`, 'ok');
      }
    }

    function openPanel() {
      if (!state.panelEl) createUI();
      if (!state.panelEl) return;
      state.open = true;
      state.panelEl.classList.add('open');
      checkIncomingData();
      if (!state.vm) {
        getVM(15000).then((vm) => {
          state.vm = vm;
          if (!state.busy) setStatus('已就绪', 'ok');
        }).catch(() => {
          setStatus('未检测到 VM，请确保作品已加载', 'err');
        });
      }
    }

    function closePanel() {
      state.open = false;
      if (state.panelEl) state.panelEl.classList.remove('open');
    }

    function togglePanel() {
      if (state.open) closePanel();
      else openPanel();
    }

    async function handleOpenEditor() {
      if (state.busy) return;
      state.busy = true;
      const openBtn = document.getElementById(CLS + '-open');
      const loadBtn = document.getElementById(CLS + '-load-back');
      if (openBtn) openBtn.disabled = true;
      if (loadBtn) loadBtn.disabled = true;

      try {
        safeGMDelete(KEY_TO_EDITOR);
        safeGMDelete(KEY_TO_SOURCE);

        setStatus('正在读取当前作品…', 'busy');
        if (!state.vm) state.vm = await getVM(30000);

        setStatus('正在序列化…', 'busy');
        const buf = await serializeProject(state.vm);

        setStatus('正在写入存储…', 'busy');
        const ok = safeGMSet(KEY_TO_EDITOR, {
          data: ab2b64(buf),
          ts: Date.now(),
          token: makeToken()
        });
        if (!ok) throw new Error('无法写入 GM 存储');

        setStatus('正在加载内嵌编辑器…', 'busy');
        const placeholder = document.getElementById(CLS + '-placeholder');
        if (placeholder) placeholder.classList.add('hidden');

        state.pendingSourceData = true;
        state.editorReady = false;

        if (!state.iframeEl.src || state.iframeEl.src === 'about:blank') {
          state.iframeEl.src = EDITOR_URL;
        }

        startRetry();

        toast('已准备内嵌编辑器');
      } catch (err) {
        console.error('[作品编辑器] 打开失败:', err);
        setStatus('打开失败：' + (err.message || err), 'err');
        toast('打开失败：' + (err.message || err), 'error', 3500);
      } finally {
        state.busy = false;
        if (openBtn) openBtn.disabled = false;
        if (loadBtn) loadBtn.disabled = false;
      }
    }

    async function handleLoadFromEditor() {
      if (state.busy) return;
      state.busy = true;
      const openBtn = document.getElementById(CLS + '-open');
      const loadBtn = document.getElementById(CLS + '-load-back');
      if (openBtn) openBtn.disabled = true;
      if (loadBtn) loadBtn.disabled = true;

      try {
        setStatus('正在读取编辑器结果…', 'busy');
        const stored = readFreshData(KEY_TO_SOURCE);
        if (!stored || !stored.data) {
          setStatus('未找到编辑器保存的作品', 'err');
          toast('未找到编辑器保存的作品，请先在 Gandi 中点击「保存并返回」', 'error', 3500);
          return;
        }

        setStatus('正在解析数据…', 'busy');
        const buf = b642ab(stored.data);

        if (!state.vm) state.vm = await getVM(30000);

        setStatus('正在替换页面作品…', 'busy');
        await deserializeInto(state.vm, buf);

        try {
          if (typeof state.vm.emit === 'function') {
            state.vm.emit('targetsUpdate');
            state.vm.emit('workspaceUpdate');
          }
        } catch (e) {}
        try {
          if (state.vm.runtime && typeof state.vm.runtime.requestRedraw === 'function') {
            state.vm.runtime.requestRedraw();
          }
        } catch (e) {}

        safeGMDelete(KEY_TO_SOURCE);
        safeGMDelete(KEY_TO_EDITOR);

        setStatus('已替换到页面', 'ok');
        toast('已成功替换页面作品');
      } catch (err) {
        console.error('载入失败:', err);
        setStatus('载入失败：' + (err.message || err), 'err');
        toast('载入失败：' + (err.message || err), 'error', 3500);
      } finally {
        state.busy = false;
        if (openBtn) openBtn.disabled = false;
        if (loadBtn) loadBtn.disabled = false;
      }
    }

    const attach = () => {
      createUI();
      getVM(15000).then((vm) => { state.vm = vm; }).catch(() => {});
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attach, { once: true });
    } else {
      attach();
    }
  }

  function patchFetchForOSS() {
    if (window.__tweFetchPatched) return;
    window.__tweFetchPatched = true;

    const origFetch = window.fetch;
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const needsBypass = /aliyuncs\.com|sts|oss.*credential|upload.*credential|oss-|\.oss\./i.test(url);

      if (!needsBypass) return origFetch.apply(this, arguments);

      return new Promise((resolve, reject) => {
        const method = (init && init.method) || 'GET';
        const headers = {};
        if (init && init.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => { headers[k] = v; });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([k, v]) => { headers[k] = v; });
          } else {
            Object.assign(headers, init.headers);
          }
        }

        GM_xmlhttpRequest({
          method: method,
          url: url,
          headers: headers,
          data: init && init.body,
          responseType: 'arraybuffer',
          onload: (res) => {
            const responseHeaders = new Headers();
            if (res.responseHeaders) {
              res.responseHeaders.split('\r\n').forEach(line => {
                const idx = line.indexOf(':');
                if (idx > 0) {
                  responseHeaders.append(
                    line.slice(0, idx).trim(),
                    line.slice(idx + 1).trim()
                  );
                }
              });
            }
            resolve(new Response(res.response, {
              status: res.status,
              statusText: res.statusText,
              headers: responseHeaders
            }));
          },
          onerror: (err) => {
            console.error('[TWE] GM_xmlhttpRequest 失败:', err);
            reject(new Error('GM_xmlhttpRequest failed'));
          }
        });
      });
    };
  }

  function patchXHRForOSS() {
    if (window.__tweXHRPatched) return;
    window.__tweXHRPatched = true;

    const OrigXHR = window.XMLHttpRequest;
    if (!OrigXHR) return;

    function shouldBypass(url) {
      return /aliyuncs\.com|sts|oss.*credential|upload.*credential|oss-|\.oss\./i.test(url || '');
    }

    const origOpen = OrigXHR.prototype.open;
    const origSend = OrigXHR.prototype.send;

    OrigXHR.prototype.open = function (method, url) {
      this.__tweMethod = method;
      this.__tweUrl = url;
      this.__tweBypass = shouldBypass(url);
      if (this.__tweBypass) {
        try { this.__tweReadyState = 0; } catch (e) {}
        return;
      }
      return origOpen.apply(this, arguments);
    };

    OrigXHR.prototype.send = function (body) {
      if (!this.__tweBypass) return origSend.apply(this, arguments);

      const xhr = this;
      const method = xhr.__tweMethod || 'GET';
      const url = xhr.__tweUrl;
      const headers = {};

      try { xhr.readyState = 1; xhr.dispatchEvent(new Event('readystatechange')); } catch (e) {}
      try { if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange(); } catch (e) {}

      GM_xmlhttpRequest({
        method: method,
        url: url,
        headers: headers,
        data: body,
        responseType: 'arraybuffer',
        onload: (res) => {
          try {
            Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
            Object.defineProperty(xhr, 'status', { value: res.status, configurable: true });
            Object.defineProperty(xhr, 'statusText', { value: res.statusText || '', configurable: true });
            Object.defineProperty(xhr, 'response', { value: res.response, configurable: true });
            Object.defineProperty(xhr, 'responseText', { value: '', configurable: true });
          } catch (e) {}
          try { xhr.dispatchEvent(new Event('readystatechange')); } catch (e) {}
          try { if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange(); } catch (e) {}
          try { xhr.dispatchEvent(new Event('load')); } catch (e) {}
          try { if (typeof xhr.onload === 'function') xhr.onload(); } catch (e) {}
        },
        onerror: (err) => {
          console.error('[TWE] XHR GM_xmlhttpRequest 失败:', err);
          try { xhr.dispatchEvent(new Event('error')); } catch (e) {}
          try { if (typeof xhr.onerror === 'function') xhr.onerror(err); } catch (e) {}
        }
      });
    };
  }

  function initEditorSide() {

    try { patchFetchForOSS(); } catch (e) { console.warn('[TWE] fetch 劫持失败:', e); }
    try { patchXHRForOSS(); } catch (e) { console.warn('[TWE] XHR 劫持失败:', e); }

    const RAND = Math.random().toString(36).slice(2, 8);
    const CLS = 'tge' + RAND;

    const styles = `
      .${CLS}-btn {
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        padding: 10px 20px; border-radius: 10px; border: none;
        background: linear-gradient(135deg, #ff8c1a, #ff6b00);
        color: #fff; font-size: 14px; font-weight: 700;
        cursor: pointer;
        box-shadow: 0 6px 24px rgba(255,140,26,.45);
        display: flex; align-items: center; gap: 8px;
        font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
        transition: all .2s;
        user-select: none;
      }
      .${CLS}-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(255,140,26,.55); }
      .${CLS}-btn:active { transform: translateY(0); }
      .${CLS}-btn:disabled { opacity: .55; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

      .${CLS}-hint {
        position: fixed; top: 74px; right: 20px; z-index: 999999;
        padding: 8px 14px; border-radius: 8px;
        background: rgba(20, 20, 40, 0.92);
        backdrop-filter: blur(20px);
        color: #e8e8e8; font-size: 12px;
        font-family: -apple-system, 'PingFang SC', sans-serif;
        box-shadow: 0 10px 30px rgba(0,0,0,.5);
        border: 1px solid rgba(255,140,26,.3);
        max-width: 280px;
        line-height: 1.5;
      }

      .${CLS}-toast {
        position: fixed; bottom: 30px; left: 50%;
        transform: translateX(-50%) translateY(24px);
        z-index: 1000000;
        padding: 12px 24px; border-radius: 12px;
        background: rgba(20,20,40,.92);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,.08);
        color: #e8e8e8;
        font-family: -apple-system, 'PingFang SC', sans-serif;
        font-size: 13px; font-weight: 500;
        box-shadow: 0 20px 50px rgba(0,0,0,.75);
        opacity: 0; pointer-events: none;
        transition: all .35s cubic-bezier(.34,1.56,.64,1);
      }
      .${CLS}-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      .${CLS}-toast.success { border-color: rgba(46,204,113,.35); }
      .${CLS}-toast.error   { border-color: rgba(231,76,60,.35); }
    `;

    let styleEl = null;
    function ensureStyles() {
      if (styleEl && document.head.contains(styleEl)) return;
      styleEl = document.createElement('style');
      styleEl.id = CLS + '-styles';
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }

    let toastEl = null, toastTimer = null;
    function toast(msg, type, duration) {
      ensureStyles();
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = CLS + '-toast';
        document.body.appendChild(toastEl);
      }
      type = type || 'success';
      const icon = type === 'error' ? '✕' : '✓';
      const color = type === 'error' ? '#ff6b6b' : '#2ecc71';
      toastEl.innerHTML = `<span style="color:${color}">${icon}</span> ${msg}`;
      toastEl.className = CLS + '-toast ' + type;
      void toastEl.offsetWidth;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration || 2200);
    }

    let vmRef = null;
    let busy = false;
    let loadingProject = false;

    async function getEditorVM() {
      if (isValidVM(vmRef)) return vmRef;
      vmRef = await getVM(60000);
      return vmRef;
    }

    async function waitForVMLoaded(vm, timeout) {
      timeout = timeout || 45000;
      const start = Date.now();
      return new Promise((resolve) => {
        const check = () => {
          try {
            if (vm.runtime && (vm.runtime._loaded || vm.runtime.getTargetForStage || vm.runtime.targets)) {
              resolve();
              return;
            }
          } catch (e) {}
          if (Date.now() - start > timeout) { resolve(); return; }
          setTimeout(check, 300);
        };
        check();
      });
    }

    function notifyParent(type, extra) {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(Object.assign({
            __channel: CHANNEL,
            type: type,
            ts: Date.now()
          }, extra || {}), '*');
        }
      } catch (e) {}
    }

    async function waitForEditorData(timeout) {
      timeout = timeout || 3000;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const stored = readFreshData(KEY_TO_EDITOR);
        if (stored && stored.data) return stored;
        await new Promise(r => setTimeout(r, 200));
      }
      return null;
    }

    function forceRefreshEditor(vm) {
      try {
        if (vm.runtime && typeof vm.runtime.emit === 'function') {
          vm.runtime.emit('targetsUpdate');
          vm.runtime.emit('PROJECT_LOADED');
        }
        if (typeof vm.emit === 'function') {
          vm.emit('targetsUpdate');
          vm.emit('workspaceUpdate');
        }
      } catch (e) {}

      try {
        if (vm.runtime && typeof vm.runtime.getTargetForStage === 'function') {
          const stage = vm.runtime.getTargetForStage();
          if (stage && typeof vm.setEditingTarget === 'function') {
            vm.setEditingTarget(stage.id);
          }
        }
      } catch (e) {}

      try {
        const containers = [
          document.getElementById('app'),
          document.getElementById('root'),
          document.body
        ].filter(Boolean);
        for (const el of containers) {
          let keys;
          try { keys = Object.keys(el); } catch (e) { continue; }
          for (const k of keys) {
            if (!k.includes('__reactContainer')) continue;
            const store = findStore(el[k], 0, new Set());
            if (!store || typeof store.dispatch !== 'function') continue;

            const actionAttempts = [
              { type: 'scratch-gui/vm/UPDATE_TARGET_LIST', targetList: vm.runtime.targets },
              { type: 'scratch-gui/targets/UPDATE_TARGET_LIST', targetList: vm.runtime.targets },
              { type: 'scratch-gui/project/LOAD_PROJECT' },
              { type: 'scratch-gui/vm/SET_VM', vm: vm },
            ];
            for (const a of actionAttempts) {
              try { store.dispatch(a); } catch (e) {}
            }

            try {
              const st = store.getState();
              if (st && st.scratchGui) {
                store.setState({
                  scratchGui: Object.assign({}, st.scratchGui, {
                    projectChanged: (st.scratchGui.projectChanged || 0) + 1
                  })
                });
              }
            } catch (e) {}
          }
        }
      } catch (e) {}

      try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }

    async function forceLoadIntoVM(vm, buf) {
      try {
        try {
            console.log('[TWE-DIAG] 开始清空旧舞台...');
            const runtime = vm.runtime;
            if (runtime && Array.isArray(runtime.targets)) {
                const oldTargets = [...runtime.targets];
                for (const t of oldTargets) {
                    if (runtime.renderer && t.drawableID !== undefined) {
                        try { runtime.renderer.destroyDrawable(t.drawableID, t.isStage); } catch (e) {}
                    }
                    if (typeof t.dispose === 'function') {
                        try { t.dispose(); } catch (e) {}
                    }
                }
                runtime.targets.length = 0;
                console.log('[TWE-DIAG] 旧舞台已清空，当前 targets 数量:', runtime.targets.length);
            }
        } catch (cleanErr) {
            console.warn('[TWE-DIAG] 清空旧舞台失败:', cleanErr);
        }

        try {
          await vm.loadProject(buf);
        } catch (e) {
          console.warn('[激进载入] loadProject 抛错，继续强制刷新:', e);
        }

        await new Promise(r => setTimeout(r, 1200));
        forceRefreshEditor(vm);
        await new Promise(r => setTimeout(r, 600));

        let targetCount = 0;
        try {
          targetCount = (vm.runtime && vm.runtime.targets) ? vm.runtime.targets.length : 0;
        } catch (e) {}

        if (targetCount > 0) {
          forceRefreshEditor(vm);
          return true;
        }
        return false;
      } catch (e) {
        console.warn('[激进载入] 暴力灌 VM 失败:', e);
        return false;
      }
    }

    async function loadProjectFromStorage(silent) {
      if (loadingProject) return false;
      loadingProject = true;
      try {
        const stored = await waitForEditorData(3000);
        if (!stored || !stored.data) {
          if (!silent) toast('未找到待编辑的作品数据（或数据已过期）', 'error', 3000);
          notifyParent('editor-load-failed', { message: 'no-data' });
          return false;
        }

        toast('正在载入作品…', 'success', 1500);
        const buf = b642ab(stored.data);

        const vm = await getEditorVM();
        await waitForVMLoaded(vm);

        console.log('[TWE-DIAG] 开始纯暴力灌 VM 流程');

        const loadOk = await forceLoadIntoVM(vm, buf);
        console.log('[TWE-DIAG] forceLoadIntoVM 结果:', loadOk);

        if (loadOk) {
          toast('已强制载入作品到 VM', 'success', 2000);
          notifyParent('editor-loaded');
          safeGMDelete(KEY_TO_EDITOR);
          return true;
        }

        notifyParent('editor-load-failed', { message: 'all-methods-failed' });
        return false;
      } catch (err) {
        console.error('载入作品失败:', err);
        toast('载入失败：' + (err.message || err), 'error', 4000);
        notifyParent('editor-load-failed', { message: err.message || String(err) });
        return false;
      } finally {
        loadingProject = false;
      }
    }

    async function saveAndReturn() {
      if (busy) return;
      busy = true;
      const btn = document.getElementById(CLS + '-btn');
      if (btn) btn.disabled = true;

      try {
        toast('正在保存…', 'success', 1200);
        const vm = await getEditorVM();

        try {
            const runtime = vm.runtime;
            if (runtime && Array.isArray(runtime.targets)) {
                const stages = runtime.targets.filter(t => t && t.isStage);
                if (stages.length > 1) {
                    console.warn('[TWE-DIAG] 保存前发现多余舞台，数量:', stages.length);
                    for (let i = 1; i < stages.length; i++) {
                         const extra = stages[i];
                         const idx = runtime.targets.indexOf(extra);
                         if (idx > -1) runtime.targets.splice(idx, 1);
                         if (runtime.renderer && extra.drawableID !== undefined) {
                             try { runtime.renderer.destroyDrawable(extra.drawableID, true); } catch (e) {}
                         }
                         if (typeof extra.dispose === 'function') {
                             try { extra.dispose(); } catch (e) {}
                         }
                    }
                    console.log('[TWE-DIAG] 清理完毕，剩余 Stage 数量: 1');
                } else {
                    console.log('[TWE-DIAG] 保存前检查：Stage 数量正常 (1)');
                }
            }
        } catch (cleanErr) {
            console.warn('[TWE-DIAG] 保存前清理舞台异常:', cleanErr);
        }

        const buf = await serializeProject(vm);

        const ok = safeGMSet(KEY_TO_SOURCE, {
          data: ab2b64(buf),
          ts: Date.now()
        });
        if (!ok) throw new Error('无法写入 GM 存储');

        notifyParent('editor-saved');

        if (!IS_EMBEDDED) {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                __channel: CHANNEL,
                type: 'editor-saved',
                ts: Date.now()
              }, '*');
            }
          } catch (e) {}
        }

        toast('已保存！点击「从编辑器载入」即可替换', 'success', 4500);
      } catch (err) {
        console.error('保存失败:', err);
        toast('保存失败：' + (err.message || err), 'error', 4000);
      } finally {
        busy = false;
        if (btn) btn.disabled = false;
      }
    }

    function createEditorUI() {
      if (document.getElementById(CLS + '-btn')) return;
      if (!document.body) return;
      ensureStyles();

      const btn = document.createElement('button');
      btn.id = CLS + '-btn';
      btn.className = CLS + '-btn';
      btn.textContent = IS_EMBEDDED ? '保存' : '保存';
      btn.addEventListener('click', saveAndReturn);
      document.body.appendChild(btn);
    }

    window.addEventListener('message', (e) => {
      const d = e.data;
      if (!d || d.__channel !== CHANNEL) return;
      if (d.type === 'load-project') {
        loadProjectFromStorage(true);
      }
    });

    async function autoRun() {
      try {
        createEditorUI();
        notifyParent('editor-ready');
        if (IS_EMBEDDED) {
          const stored = await waitForEditorData(5000);
          if (stored && stored.data) {
            await loadProjectFromStorage(true);
          }
        }
      } catch (err) {
        console.error('初始化失败:', err);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoRun, { once: true });
    } else {
      autoRun();
    }
  }

  if (IS_GANDI_EDITOR) {
    initEditorSide();
  } else {
    initSourceSide();
  }

})();
