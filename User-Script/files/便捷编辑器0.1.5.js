// ==UserScript==
// @name         便捷编辑器
// @version      0.1.5
// @description  在ccw播放器页面捕获作品并传入gandi进行编辑后再一键替换回去，把你的外挂扔到外太空！！！！！
// @author       诺言Promise
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
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==


// GUI来自DeepSeek（感谢体谅，诺言真的不会写GUI）
(function () {
  'use strict';

  const W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

  const HOST = location.hostname;
  const PATH = location.pathname;

  const IS_GANDI_EDITOR = (/cocrea\.world$/.test(HOST) && /^\/gandi/.test(PATH)) ||
                          (/ccw\.site$/.test(HOST) && /^\/gandi/.test(PATH));

  let isTransferMode = false;
  try {
    const u = new URL(location.href);
    if (u.searchParams.get('twe') === '1') {
      isTransferMode = true;
      u.searchParams.delete('twe');
      try { history.replaceState(null, '', u.toString()); } catch (e) {}
    }
  } catch (e) {}

  const EDITOR_SIDE = IS_GANDI_EDITOR && isTransferMode;
  const SOURCE_SIDE = !IS_GANDI_EDITOR;

  const KEY_TO_EDITOR = 'twe_gandi_to_editor_v1';
  const KEY_TO_SOURCE = 'twe_gandi_to_source_v1';

  const DATA_TTL_MS = 30 * 60 * 1000;
  const CHANNEL = '__twe_gandi_bridge_v1__';


  function makeToken() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function safeGMGet(key, fallback) {
    try {
      const v = GM_getValue(key);
      return v === undefined ? fallback : v;
    } catch (e) {
      return fallback;
    }
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

  function cleanAllCache() {
    const keys = [KEY_TO_EDITOR, KEY_TO_SOURCE];
    const legacyKeys = ['twe_to_editor_v3', 'twe_to_source_v3'];
    let removed = 0;
    for (const k of [...keys, ...legacyKeys]) {
      try {
        if (GM_getValue(k) !== undefined) {
          GM_deleteValue(k);
          removed++;
        }
      } catch (e) {}
    }
    return removed;
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
                typeof target.emit === 'function') {  // ← 严格检测
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
        position: fixed; top: 60px; left: 60px; z-index: 999999;
        width: 380px;
        background: rgba(18, 18, 32, 0.92);
        backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 25px 60px rgba(0,0,0,.85);
        color: #e8e8e8;
        font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
        display: none; flex-direction: column;
        overflow: hidden;
        animation: ${CLS}-in .3s cubic-bezier(.34,1.56,.64,1);
      }
      .${CLS}-panel.open { display: flex; }
      @keyframes ${CLS}-in {
        from { opacity: 0; transform: scale(.94) translateY(18px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      .${CLS}-hdr {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px;
        background: rgba(255,255,255,0.04);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        cursor: move; user-select: none;
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

      .${CLS}-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; }

      .${CLS}-desc {
        font-size: 12px; color: rgba(255,255,255,.5); line-height: 1.6;
        padding: 8px 10px; background: rgba(255,255,255,.03);
        border-radius: 8px; border: 1px solid rgba(255,255,255,.04);
      }
      .${CLS}-action {
        border: none; border-radius: 10px;
        padding: 11px 16px; font-size: 13px; font-weight: 600;
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
        font-size: 11px; color: rgba(255,255,255,.5);
        padding: 6px 10px; border-radius: 8px;
        background: rgba(255,255,255,.03);
        text-align: center;
        transition: color .3s;
      }
      .${CLS}-status.ok   { color: #2ecc71; }
      .${CLS}-status.err  { color: #ff6b6b; }
      .${CLS}-status.busy { color: #ff8c1a; }

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
      panelEl: null
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
          <span class="${CLS}-title">便携编辑器</span>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          <div class="${CLS}-desc">
            将当前作品送到 Gandi 编辑器进行修改，编辑完成后可一键替换回本页面。
          </div>
          <button class="${CLS}-action ${CLS}-open-editor" id="${CLS}-open">编辑此作品</button>
          <button class="${CLS}-action ${CLS}-load-back" id="${CLS}-load-back">从编辑器载入</button>
          <div class="${CLS}-status" id="${CLS}-status">就绪</div>
        </div>
      `;
      document.body.appendChild(panel);
      state.panelEl = panel;

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
        if (d.type === 'editor-saved') {
          toast('编辑器已保存，可点击「从编辑器载入」替换', 'success', 3000);
          setStatus('编辑器已保存，可以载入', 'ok');
        }
      });

      checkIncomingData();
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
          setStatus('已就绪', 'ok');
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

        setStatus('正在跳转到 Gandi…', 'busy');
        const url = 'https://cocrea.world/gandi?twe=1';
        window.open(url, '_blank');

        setStatus('已打开 Gandi 编辑器，编辑后点击「保存并返回」', 'ok');
        toast('已打开 Gandi 编辑器');
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

    try {
      if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('打开作品编辑器面板', () => openPanel());
        GM_registerMenuCommand('清理所有缓存数据', () => {
          const n = cleanAllCache();
          alert(`已清理 ${n} 条缓存数据。刷新页面后生效。`);
        });
      }
    } catch (e) {}
  }


  function initEditorSide() {
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
        animation: ${CLS}-slide .35s ease;
      }
      @keyframes ${CLS}-slide {
        from { opacity: 0; transform: translateX(20px); }
        to   { opacity: 1; transform: translateX(0); }
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

    async function loadProjectFromStorage() {
      try {
        const stored = readFreshData(KEY_TO_EDITOR);
        if (!stored || !stored.data) {
          toast('未找到待编辑的作品数据（或数据已过期）', 'error', 3000);
          return false;
        }

        toast('正在载入作品…', 'success', 1500);
        const buf = b642ab(stored.data);

        const vm = await getEditorVM();
        await waitForVMLoaded(vm);

        await new Promise(r => setTimeout(r, 2000));

        await deserializeInto(vm, buf);

        try {
          if (typeof vm.emit === 'function') {
            vm.emit('targetsUpdate');
            vm.emit('workspaceUpdate');
          }
        } catch (e) {}

        safeGMDelete(KEY_TO_EDITOR);

        toast('作品已载入 Gandi 编辑器');
        return true;
      } catch (err) {
        console.error('载入作品失败:', err);
        toast('载入失败：' + (err.message || err), 'error', 4000);
        return false;
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
        const buf = await serializeProject(vm);

        const ok = safeGMSet(KEY_TO_SOURCE, {
          data: ab2b64(buf),
          ts: Date.now()
        });
        if (!ok) throw new Error('无法写入 GM 存储');

        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              __channel: CHANNEL,
              type: 'editor-saved',
              ts: Date.now()
            }, '*');
          }
        } catch (e) {}

        toast('已保存！返回原页面点击「从编辑器载入」即可替换', 'success', 4500);
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
      btn.innerHTML = '保存并返回原页面';
      btn.addEventListener('click', saveAndReturn);
      document.body.appendChild(btn);

      const hint = document.createElement('div');
      hint.className = CLS + '-hint';
      hint.textContent = '编辑完成后点击上方按钮，然后回到原页面点击「从编辑器载入」替换。';
      document.body.appendChild(hint);
    }

    async function autoRun() {
      try {
        createEditorUI();
        await new Promise(r => setTimeout(r, 1500));
        await loadProjectFromStorage();
      } catch (err) {
        console.error('初始化失败:', err);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoRun, { once: true });
    } else {
      autoRun();
    }

    try {
      if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('手动载入作品', () => loadProjectFromStorage());
        GM_registerMenuCommand('保存并返回', () => saveAndReturn());
        GM_registerMenuCommand('清理所有缓存数据', () => {
          const n = cleanAllCache();
          alert(`已清理 ${n} 条缓存数据。`);
        });
      }
    } catch (e) {}
  }


  if (EDITOR_SIDE) {
    initEditorSide();
  } else if (SOURCE_SIDE) {
    initSourceSide();
  }

})();