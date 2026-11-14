// ==UserScript==
// @name         角色管理器
// @version      1.2.2
// @description  获取角色详细信息，支持进行更改（仅对自己有效）
// @author       诺言Promise
// @match        https://scratch.mit.edu/*
// @match        https://gonfunko.github.io/scratch-gui/*
// @match        https://aerfaying.com/*
// @match        https://www.ccw.site/*
// @match        https://gitblock.cn/*
// @match        https://world.xiaomawang.com/*
// @match        https://www.cocrea.world/*
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
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function (unsafeWindow) {
  'use strict';

  // ui是ai写的，我不太会写前端
  // ====== 配置 ======
  const THEME_COLOR = "#ff8c1a";
  const BG_DARK = "#1a1a2e";
  const BG_CARD = "#222236";
  const BG_INPUT = "#11111f";
  const TEXT_COLOR = "#ddd";
  const TEXT_MUTED = "#888";
  const BORDER_COLOR = "#444";

  // ====== VM获取模块 ======
  let vm = null;

  function patch(obj, prop, fn) {
    if (obj?.[prop]) {
      const original = obj[prop];
      obj[prop] = function (...args) {
        return fn.call(this, original, ...args);
      };
    }
  }

  function trapViaBind() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("通过 bind 捕获 VM 超时"));
      }, 15000);

      const originalBind = Function.prototype.bind;
      Function.prototype.bind = function (self, ...args) {
        if (self?.editingTarget !== undefined && self?.runtime !== undefined) {
          clearTimeout(timer);
          Function.prototype.bind = originalBind;
          resolve(self);
          return originalBind.call(this, self, ...args);
        }
        return originalBind.call(this, self, ...args);
      };
    });
  }

  function findReduxStore(obj, seen = new Set()) {
    if (!obj || seen.has(obj)) return null;
    seen.add(obj);
    try {
      if (obj?.memoizedState?.state?.scratchGui?.vm) return obj.memoizedState.state;
      if (obj?.stateNode?.state?.scratchGui?.vm) return obj.stateNode;
      if (obj?.getState?.()?.scratchGui?.vm) return obj;
      for (const key in obj) {
        const value = obj[key];
        if (value && typeof value === "object") {
          const found = findReduxStore(value, seen);
          if (found) return found;
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  function searchReactTreeSafe(obj, seen = new Set()) {
    if (!obj || seen.has(obj)) return null;
    seen.add(obj);
    try {
      if (obj.getState) {
        const state = obj.getState();
        if (state?.scratchGui?.vm) return obj;
      }
      for (const key in obj) {
        const value = obj[key];
        if (value && typeof value === "object") {
          const found = searchReactTreeSafe(value, seen);
          if (found) return found;
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  function getReduxStoreFromDOM() {
    try {
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const roots = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.getFiberRoots?.(1) || [];
        for (const root of roots) {
          const store = findReduxStore(root);
          if (store) return store;
        }
      }

      for (const el of document.querySelectorAll("*")) {
        try {
          const key = Object.keys(el).find((k) => k.includes("__reactContainer"));
          if (!key || !el[key]) continue;
          const store = searchReactTreeSafe(el[key]);
          if (store) return store;
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.warn("Redux Store检索失败", err);
    }
    return null;
  }

  async function getVM() {
    let _vm =
      unsafeWindow?.eureka?.vm ||
      unsafeWindow?.vm ||
      unsafeWindow?.Scratch?.vm ||
      unsafeWindow?.Scratch?.runtime?.extensionManager?.vm;
    if (_vm) return _vm;

    if (document.readyState === "complete") {
      _vm = getReduxStoreFromDOM()?.getState?.()?.scratchGui?.vm;
      if (_vm) return _vm;
    }

    return trapViaBind();
  }

  // ====== 核心功能 ======

  function getSprites(vmInstance) {
    if (!vmInstance?.runtime?.targets) return [];
    return vmInstance.runtime.targets
      .filter((t) => !t.isStage && t.sprite && t.sprite.name)
      .map((t) => ({
        target: t,
        sprite: t.sprite,
        name: t.sprite.name,
        id: t.id,
        clones: t.sprite.clones || [],
        costumeCount: t.sprite.costumes?.length || 0,
        soundCount: t.sprite.sounds?.length || 0,
        costumePreview: t.sprite.costumes?.[0]?.asset?.encodeDataURI?.() || ""
      }));
  }

  function getSpriteByName(vmInstance, name) {
    const list = getSprites(vmInstance);
    return list.find((s) => s.name === name);
  }

  function deleteSprite(vmInstance, targetId) {
    const target = vmInstance.runtime.targets.find((t) => t.id === targetId);
    if (!target || target.isStage) return false;

    const spriteName = target.sprite?.name || "未知角色";

    try {
      if (typeof vmInstance.deleteSprite === "function") {
        vmInstance.deleteSprite(targetId);
        return true;
      }

      const runtime = vmInstance.runtime;
      if (runtime) {
        if (typeof runtime.removeTarget === "function") {
          runtime.removeTarget(targetId);
          return true;
        }
        if (typeof runtime.disposeTarget === "function") {
          runtime.disposeTarget(targetId);
          return true;
        }

        const idx = runtime.targets.indexOf(target);
        if (idx !== -1) {
          if (target.sprite?.clones) {
            const clones = [...target.sprite.clones];
            clones.forEach((clone) => {
              const cloneIdx = runtime.targets.indexOf(clone);
              if (cloneIdx !== -1) runtime.targets.splice(cloneIdx, 1);
            });
          }
          runtime.targets.splice(idx, 1);
          if (target.sprite) {
            target.sprite.clones = target.sprite.clones?.filter((c) => c.id !== targetId) || [];
          }
          if (typeof vmInstance.emit === "function") {
            vmInstance.emit("targetsUpdate");
          }
          const stage = runtime.getTargetForStage?.();
          if (stage && typeof vmInstance.setEditingTarget === "function") {
            vmInstance.setEditingTarget(stage.id);
          }
          return true;
        }
      }

      const store = getReduxStoreFromDOM();
      if (store && typeof store.dispatch === "function") {
        store.dispatch({
          type: "scratch-gui/editor/REMOVE_SPRITE",
          data: { targetId }
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error("删除角色失败", err);
      return false;
    }
  }

  function renameSprite(vmInstance, targetId, newName) {
    const target = vmInstance.runtime.targets.find((t) => t.id === targetId);
    if (!target || target.isStage || !target.sprite) return false;
    try {
      target.sprite.name = newName;
      // 触发更新
      if (typeof vmInstance.emit === "function") {
        vmInstance.emit("targetsUpdate");
      }
      return true;
    } catch (err) {
      console.error("重命名失败", err);
      return false;
    }
  }

  function deleteCostume(sprite, index) {
    if (!sprite?.costumes || index < 0 || index >= sprite.costumes.length) return false;
    try {
      sprite.costumes.splice(index, 1);
      if (sprite.currentCostume >= sprite.costumes.length) {
        sprite.currentCostume = Math.max(0, sprite.costumes.length - 1);
      }
      return true;
    } catch (err) {
      console.error("删除造型失败", err);
      return false;
    }
  }

  function deleteSound(sprite, index) {
    if (!sprite?.sounds || index < 0 || index >= sprite.sounds.length) return false;
    try {
      sprite.sounds.splice(index, 1);
      return true;
    } catch (err) {
      console.error("删除声音失败", err);
      return false;
    }
  }

  // ====== UI 模块 ======

  const styles = `
    .srm-float-btn {
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 99998;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #ff8c1a, #e67e22);
      color: white;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(255, 140, 26, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      touch-action: none;
    }
    .srm-float-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 30px rgba(255, 140, 26, 0.5);
    }
    .srm-float-btn:active {
      transform: scale(0.95);
    }

    .srm-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      animation: srm-fade-in 0.25s ease;
    }
    .srm-overlay.open {
      display: flex;
    }

    .srm-panel {
      background: ${BG_DARK};
      border-radius: 16px;
      padding: 24px;
      max-width: 520px;
      width: 92%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      border: 1px solid ${BORDER_COLOR};
      color: ${TEXT_COLOR};
      font-family: 'PingFang', -apple-system, sans-serif;
      animation: srm-scale-in 0.25s ease;
      position: relative;
    }
    .srm-panel::-webkit-scrollbar {
      width: 4px;
    }
    .srm-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .srm-panel::-webkit-scrollbar-thumb {
      background: ${THEME_COLOR};
      border-radius: 4px;
    }

    .srm-panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid ${BORDER_COLOR};
    }
    .srm-panel-header .srm-back {
      background: none;
      border: none;
      color: ${TEXT_MUTED};
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
      transition: color 0.2s;
    }
    .srm-panel-header .srm-back:hover {
      color: white;
    }
    .srm-panel-header .srm-title {
      flex: 1;
      font-size: 18px;
      font-weight: 600;
      color: ${THEME_COLOR};
      margin: 0;
    }
    .srm-panel-header .srm-close {
      background: none;
      border: none;
      color: ${TEXT_MUTED};
      font-size: 22px;
      cursor: pointer;
      padding: 0 4px;
      transition: color 0.2s;
    }
    .srm-panel-header .srm-close:hover {
      color: #ff6b6b;
    }

    .srm-sprite-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 10px;
      margin: 8px 0 16px 0;
    }
    .srm-sprite-card {
      background: ${BG_CARD};
      border: 2px solid ${BORDER_COLOR};
      border-radius: 10px;
      padding: 8px 6px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .srm-sprite-card:hover {
      border-color: ${THEME_COLOR};
      transform: translateY(-2px);
    }
    .srm-sprite-card img {
      width: 100%;
      aspect-ratio: 1/1;
      object-fit: contain;
      border-radius: 6px;
      background: ${BG_INPUT};
    }
    .srm-sprite-card .srm-name {
      font-size: 11px;
      color: ${TEXT_COLOR};
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .srm-sprite-card .srm-badge {
      font-size: 10px;
      color: ${TEXT_MUTED};
      margin-top: 2px;
    }

    /* 详情页 */
    .srm-detail-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid ${BORDER_COLOR};
    }
    .srm-detail-header img {
      width: 56px;
      height: 56px;
      object-fit: contain;
      border-radius: 8px;
      background: ${BG_INPUT};
      flex-shrink: 0;
    }
    .srm-detail-header .srm-info {
      flex: 1;
      min-width: 0;
    }
    .srm-detail-header .srm-info .srm-name {
      font-size: 16px;
      font-weight: 600;
      color: ${TEXT_COLOR};
      margin: 0;
    }
    .srm-detail-header .srm-info .srm-meta {
      font-size: 12px;
      color: ${TEXT_MUTED};
      margin: 2px 0 0 0;
    }
    .srm-detail-header .srm-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    .srm-detail-header .srm-actions button {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .srm-detail-header .srm-actions .srm-btn-rename {
      background: ${THEME_COLOR};
      color: white;
    }
    .srm-detail-header .srm-actions .srm-btn-rename:hover {
      filter: brightness(1.1);
    }
    .srm-detail-header .srm-actions .srm-btn-delete {
      background: #e74c3c;
      color: white;
    }
    .srm-detail-header .srm-actions .srm-btn-delete:hover {
      filter: brightness(1.1);
    }

    .srm-section {
      margin-top: 12px;
    }
    .srm-section-title {
      font-size: 14px;
      font-weight: 500;
      color: ${THEME_COLOR};
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .srm-section-title span {
      font-size: 12px;
      color: ${TEXT_MUTED};
      font-weight: 400;
    }

    .srm-item-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .srm-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      background: ${BG_CARD};
      border-radius: 6px;
      border: 1px solid ${BORDER_COLOR};
      transition: all 0.2s;
    }
    .srm-item:hover {
      border-color: ${THEME_COLOR};
    }
    .srm-item .srm-item-name {
      flex: 1;
      font-size: 13px;
      color: ${TEXT_COLOR};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .srm-item .srm-item-idx {
      font-size: 11px;
      color: ${TEXT_MUTED};
      flex-shrink: 0;
    }
    .srm-item .srm-item-current {
      font-size: 10px;
      color: ${THEME_COLOR};
      background: rgba(255, 140, 26, 0.15);
      padding: 1px 8px;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .srm-item .srm-item-del {
      background: none;
      border: none;
      color: ${TEXT_MUTED};
      cursor: pointer;
      font-size: 14px;
      padding: 0 4px;
      transition: color 0.2s;
      flex-shrink: 0;
    }
    .srm-item .srm-item-del:hover {
      color: #e74c3c;
    }

    .srm-empty {
      text-align: center;
      color: ${TEXT_MUTED};
      font-size: 13px;
      padding: 16px 0;
    }

    .srm-toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100000;
      padding: 12px 24px;
      border-radius: 10px;
      background: ${BG_DARK};
      border: 1px solid ${BORDER_COLOR};
      color: ${TEXT_COLOR};
      font-family: 'PingFang', sans-serif;
      font-size: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      max-width: 80%;
    }
    .srm-toast.show {
      opacity: 1;
    }
    .srm-toast.success {
      border-color: #2ecc71;
    }
    .srm-toast.error {
      border-color: #e74c3c;
    }

    @keyframes srm-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes srm-scale-in {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
  `;

  // ====== UI 实例 ======

  let currentVm = null;
  let currentView = "list"; // 'list' | 'detail'
  let currentSpriteData = null;
  let overlay = null;
  let panel = null;
  let floatBtn = null;
  let toastEl = null;
  let isOpen = false;

  function createToast() {
    if (toastEl) return;
    toastEl = document.createElement("div");
    toastEl.className = "srm-toast";
    document.body.appendChild(toastEl);
  }

  function showToast(message, type = "success", duration = 2000) {
    createToast();
    toastEl.textContent = message;
    toastEl.className = `srm-toast ${type}`;
    // 强制回流
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, duration);
  }

  function initStyles() {
    if (document.getElementById("srm-styles")) return;
    const style = document.createElement("style");
    style.id = "srm-styles";
    style.textContent = styles;
    document.head.appendChild(style);
  }

  function createUI() {
    initStyles();

    // 悬浮球
    if (!floatBtn) {
      floatBtn = document.createElement("button");
      floatBtn.className = "srm-float-btn";
      floatBtn.innerHTML = "🎭";
      floatBtn.title = "角色管理器";
      floatBtn.addEventListener("click", toggleUI);
      document.body.appendChild(floatBtn);

      // 悬浮球拖拽
      makeDraggable(floatBtn);
    }

    // 遮罩
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "srm-overlay";
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeUI();
      });
      document.body.appendChild(overlay);
    }

    // 主面板
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "srm-panel";
      overlay.appendChild(panel);
    }

    // 键盘事件
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closeUI();
    });
  }

  function makeDraggable(el) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const onStart = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      isDragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      const rect = el.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      el.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      let left = startLeft + dx;
      let top = startTop + dy;
      left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, left));
      top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, top));
      el.style.left = left + "px";
      el.style.top = top + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
      e.preventDefault();
    };

    const onEnd = () => {
      isDragging = false;
      el.style.cursor = "pointer";
    };

    el.addEventListener("mousedown", onStart);
    el.addEventListener("touchstart", onStart, { passive: false });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
  }

  function toggleUI() {
    if (isOpen) {
      closeUI();
    } else {
      openUI();
    }
  }

  function openUI() {
    if (!currentVm) {
      getVM().then((v) => {
        if (v) {
          currentVm = v;
          openUI();
        } else {
          showToast("无法获取VM实例", "error");
        }
      });
      return;
    }
    isOpen = true;
    overlay.classList.add("open");
    currentView = "list";
    renderList();
  }

  function closeUI() {
    isOpen = false;
    overlay.classList.remove("open");
  }

  function goBack() {
    currentView = "list";
    renderList();
  }

  function renderList() {
    const sprites = getSprites(currentVm);
    panel.innerHTML = `
      <div class="srm-panel-header">
        <h3 class="srm-title">🎭 角色列表</h3>
        <button class="srm-close" id="srm-close-btn">✕</button>
      </div>
      ${sprites.length === 0 ? '<div class="srm-empty">暂无角色</div>' : ''}
      <div class="srm-sprite-grid">
        ${sprites.map((s, i) => `
          <div class="srm-sprite-card" data-index="${i}">
            <img src="${s.costumePreview || ''}" alt="${s.name}"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%2280%22 height=%2280%22 fill=%22%2311111f%22/%3E%3Ctext x=%2240%22 y=%2248%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2230%22%3E?%3C/text%3E%3C/svg%3E'">
            <div class="srm-name">${s.name}</div>
            <div class="srm-badge">🎨${s.costumeCount} 🔊${s.soundCount}</div>
          </div>
        `).join('')}
      </div>
    `;

    // 事件绑定
    const closeBtn = panel.querySelector("#srm-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeUI);

    const cards = panel.querySelectorAll(".srm-sprite-card");
    cards.forEach((card) => {
      const idx = parseInt(card.dataset.index);
      card.addEventListener("click", () => {
        const sprites2 = getSprites(currentVm);
        if (sprites2[idx]) {
          currentSpriteData = sprites2[idx];
          currentView = "detail";
          renderDetail();
        }
      });
    });
  }

  function renderDetail() {
    if (!currentSpriteData) return;
    const { sprite, name, id, costumeCount, soundCount, costumePreview } = currentSpriteData;
    const target = currentVm.runtime.targets.find((t) => t.id === id);
    const isList = sprite.type === "list";

    panel.innerHTML = `
      <div class="srm-panel-header">
        <button class="srm-back" id="srm-back-btn">‹</button>
        <h3 class="srm-title">📋 角色详情</h3>
        <button class="srm-close" id="srm-close-btn">✕</button>
      </div>

      <div class="srm-detail-header">
        <img src="${costumePreview || ''}" alt="${name}"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2256%22%3E%3Crect width=%2256%22 height=%2256%22 fill=%22%2311111f%22/%3E%3Ctext x=%2228%22 y=%2236%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2224%22%3E?%3C/text%3E%3C/svg%3E'">
        <div class="srm-info">
          <p class="srm-name">${name}</p>
          <p class="srm-meta">ID: ${id.slice(0, 8)} | 克隆体: ${currentSpriteData.clones?.length || 1}</p>
        </div>
        <div class="srm-actions">
          <button class="srm-btn-rename" id="srm-rename-btn">✏️ 重命名</button>
          <button class="srm-btn-delete" id="srm-delete-btn">🗑️ 删除</button>
        </div>
      </div>

      <!-- 造型 -->
      <div class="srm-section">
        <div class="srm-section-title">🎨 造型 <span>(${costumeCount})</span></div>
        <div class="srm-item-list" id="srm-costume-list">
          ${costumeCount === 0 ? '<div class="srm-empty">无造型</div>' : ''}
          ${(sprite.costumes || []).map((c, i) => `
            <div class="srm-item">
              <span class="srm-item-idx">#${i + 1}</span>
              <span class="srm-item-name">${c.name || '未命名'}</span>
              ${i === sprite.currentCostume ? '<span class="srm-item-current">当前</span>' : ''}
              <button class="srm-item-del" data-type="costume" data-index="${i}">✕</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 声音 -->
      <div class="srm-section">
        <div class="srm-section-title">🔊 声音 <span>(${soundCount})</span></div>
        <div class="srm-item-list" id="srm-sound-list">
          ${soundCount === 0 ? '<div class="srm-empty">无声音</div>' : ''}
          ${(sprite.sounds || []).map((s, i) => `
            <div class="srm-item">
              <span class="srm-item-idx">#${i + 1}</span>
              <span class="srm-item-name">${s.name || '未命名'}</span>
              <button class="srm-item-del" data-type="sound" data-index="${i}">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 事件绑定
    const closeBtn = panel.querySelector("#srm-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeUI);

    const backBtn = panel.querySelector("#srm-back-btn");
    if (backBtn) backBtn.addEventListener("click", goBack);

    const renameBtn = panel.querySelector("#srm-rename-btn");
    if (renameBtn) {
      renameBtn.addEventListener("click", () => {
        const newName = prompt(`请输入 "${name}" 的新名称：`, name);
        if (newName && newName.trim() && newName.trim() !== name) {
          if (renameSprite(currentVm, id, newName.trim())) {
            showToast(`已重命名为 "${newName.trim()}"`);
            currentSpriteData.name = newName.trim();
            renderDetail();
          } else {
            showToast("重命名失败", "error");
          }
        }
      });
    }

    const deleteBtn = panel.querySelector("#srm-delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        const cloneCount = currentSpriteData.clones?.length || 1;
        const msg = cloneCount > 1
          ? `角色 "${name}" 有 ${cloneCount} 个克隆体，删除后所有克隆体将被移除。确定要删除吗？`
          : `确定要删除角色 "${name}" 吗？此操作不可撤销！`;
        if (confirm(msg)) {
          if (deleteSprite(currentVm, id)) {
            showToast(`已删除角色 "${name}"`);
            closeUI();
          } else {
            showToast("删除失败", "error");
          }
        }
      });
    }

    // 造型删除
    const costumeDelBtns = panel.querySelectorAll('#srm-costume-list .srm-item-del[data-type="costume"]');
    costumeDelBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const costume = sprite.costumes?.[idx];
        if (costume && confirm(`确定要删除造型 "${costume.name}" 吗？`)) {
          if (deleteCostume(sprite, idx)) {
            showToast(`已删除造型 "${costume.name}"`);
            renderDetail();
          } else {
            showToast("删除失败", "error");
          }
        }
      });
    });

    // 声音删除
    const soundDelBtns = panel.querySelectorAll('#srm-sound-list .srm-item-del[data-type="sound"]');
    soundDelBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const sound = sprite.sounds?.[idx];
        if (sound && confirm(`确定要删除声音 "${sound.name}" 吗？`)) {
          if (deleteSound(sprite, idx)) {
            showToast(`已删除声音 "${sound.name}"`);
            renderDetail();
          } else {
            showToast("删除失败", "error");
          }
        }
      });
    });
  }

  // ====== 初始化 ======

  async function init() {
    try {
      currentVm = await getVM();
      if (!currentVm) {
        console.warn("角色管理器: 无法获取VM");
        return;
      }
      createUI();
      console.log("角色管理器已加载");
    } catch (err) {
      console.error("角色管理器初始化失败", err);
    }
  }

  // 等待页面加载
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 页面切换重新初始化
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => {
        getVM().then((v) => {
          if (v) {
            currentVm = v;
            if (!floatBtn) createUI();
          }
        }).catch(() => {});
      }, 2000);
    }
  }, 3000);

  // 暴露API
  unsafeWindow.__srm = {
    vm: () => currentVm,
    open: openUI,
    close: closeUI,
    getSprites: () => getSprites(currentVm),
    deleteSprite: (id) => deleteSprite(currentVm, id),
    renameSprite: (id, name) => renameSprite(currentVm, id, name),
  };

})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);