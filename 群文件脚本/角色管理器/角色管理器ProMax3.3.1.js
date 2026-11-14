// ==UserScript==
// @name         角色管理器Pro
// @version      3.3.1
// @description  支持获取角色详细信息、更改/插入/删除角色、修改变量和列表、导出角色与素材、查看/修改克隆体位置/大小/方向/可见性/图层层级，支持按属性锁定、整合广播触发器，支持拦截广播，支持扩展拦截
// @author       诺言Promise、110200
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
// @grant        GM_download
// @run-at       document-start
// @icon         https://i.postimg.cc/28DQ8V5L/RM.png
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// ==/UserScript==

// 前端UI感谢DeepSeek
// DeepSeek老师我喜欢你！！！
// 另外，我恨前端！！！！！！

(function (unsafeWindow) {
  'use strict';

  const THEME_COLOR = "#ff8c1a";
  const THEME_GRADIENT = "linear-gradient(135deg, #ff8c1a, #ff6b00)";

  const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="59.66622" height="59.66622" viewBox="0,0,59.66622,59.66622"><g transform="translate(-290.16689,-150.16689)"><g stroke="none" stroke-miterlimit="10"><path d="M290.16689,180c0,-16.47637 13.35674,-29.83311 29.83311,-29.83311c16.47637,0 29.83311,13.35674 29.83311,29.83311c0,16.47637 -13.35674,29.83311 -29.83311,29.83311c-16.47637,0 -29.83311,-13.35674 -29.83311,-29.83311z" fill="#e67e29" stroke-width="0"/><path d="M294.31587,180c0,-14.18496 11.49918,-25.68413 25.68413,-25.68413c14.18496,0 25.68413,11.49918 25.68413,25.68413c0,14.18496 -11.49918,25.68413 -25.68413,25.68413c-14.18496,0 -25.68413,-11.49918 -25.68413,-25.68413z" fill="#ff8c2e" stroke-width="0"/><text transform="translate(301.65912,186.79111) scale(0.62636,0.62636)" font-size="40" xml:space="preserve" fill="#ffffff" stroke-width="1" font-family="Sans Serif" font-weight="normal" text-anchor="start"><tspan x="0" dy="0">RM</tspan></text><path d="M300.53226,185.25699v-0.43552h38.76127v0.43552z" fill="#ff8c2e" stroke-width="0"/><path d="M326.01018,190.70099v-25.47791h1.0888v25.47791z" fill="#ff8c2e" stroke-width="0"/><path d="M298.79018,175.67556v-0.87104h44.85854v0.87104z" fill="#ff8c2e" stroke-width="0"/><path d="M305.56091,167.23725l1.23184,-1.23184l27.25438,27.25438l-1.23184,1.23184z" fill="#ff8c2e" stroke-width="0"/><text transform="translate(307.45471,194.51301) scale(0.12545,0.12545)" font-size="40" xml:space="preserve" fill="#ffffff" stroke-width="1" font-family="Sans Serif" font-weight="normal" text-anchor="start"><tspan x="0" dy="0">角色管理器</tspan></text></g></g></svg>`;

  const ICON_DATA_URL = 'data:image/svg+xml,' + encodeURIComponent(ICON_SVG);

  let vm = null;
  let currentVm = null;

  let JSZip = null;
  try {
    if (typeof window.JSZip !== 'undefined') {
      JSZip = window.JSZip;
    } else if (typeof unsafeWindow.JSZip !== 'undefined') {
      JSZip = unsafeWindow.JSZip;
    } else if (typeof JSZip !== 'undefined') {
      JSZip = window.JSZip || unsafeWindow.JSZip;
    }
  } catch (e) {
    console.warn('JSZip 加载失败', e);
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
    } catch { }
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
    } catch { }
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
        } catch { }
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

  const VERSION_DATE = new Date(1591657163000);
  const EXTENSIONS = [".json", ".svg", ".wav", ".ttf", ".otf"];

  const MIME_MAP = {
    svg: "image/svg+xml",
    png: "image/png",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    bmp: "image/bmp",
    gif: "image/gif",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    ttf: "font/ttf",
    otf: "font/otf",
    json: "application/json"
  };

  function isStage(target) {
    return !!(target && target.isStage);
  }

  function isClone(target) {
    if (!target) return false;
    if (typeof target.isOriginal === "boolean") return !target.isOriginal;
    return typeof target.isClone === "boolean" ? target.isClone : false;
  }

  function getOriginals(vmInstance) {
    if (!vmInstance || !vmInstance.runtime || !Array.isArray(vmInstance.runtime.targets)) return [];
    return vmInstance.runtime.targets.filter(t => t && !isStage(t) && !isClone(t));
  }

  function getClonesOf(vmInstance, original) {
    if (!vmInstance || !vmInstance.runtime || !Array.isArray(vmInstance.runtime.targets)) return [];
    const name = original.getName ? original.getName() : original.sprite?.name;
    return vmInstance.runtime.targets.filter(
      t => t && !isStage(t) && isClone(t) &&
        (t.sprite === original.sprite ||
          (t.getName && t.getName() === name))
    );
  }

  function readLayerOrder(target) {
    if (!target) return null;
    const candidates = ["layerOrder", "zIndex", "layer", "order", "depth"];
    for (const c of candidates) {
      if (typeof target[c] === "number") return target[c];
    }
    const rt = target.runtime;
    if (rt && Array.isArray(rt.targets)) {
      const sprites = rt.targets.filter(t => t && !isStage(t));
      const idx = sprites.indexOf(target);
      if (idx >= 0) return idx;
    }
    return null;
  }

  function getAssetFilesFromRuntime(runtime, targetId) {
    const targets = targetId ? [runtime.getTargetById(targetId)] : runtime.targets;
    const results = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!target) continue;
      const sprite = target.sprite;
      if (!sprite) continue;

      const costumes = sprite.costumes || [];
      for (let j = 0; j < costumes.length; j++) {
        const costume = costumes[j];
        const asset = costume.broken ? costume.broken.asset : costume.asset;
        if (asset) {
          results.push({
            fileName: asset.assetId + '.' + asset.dataFormat,
            fileContent: asset.data
          });
        }
      }

      const sounds = sprite.sounds || [];
      for (let j = 0; j < sounds.length; j++) {
        const sound = sounds[j];
        const asset = sound.broken ? sound.broken.asset : sound.asset;
        if (asset) {
          results.push({
            fileName: asset.assetId + '.' + asset.dataFormat,
            fileContent: asset.data
          });
        }
      }
    }

    try {
      if (runtime.fontManager && typeof runtime.fontManager.serializeAssets === 'function') {
        const fonts = runtime.fontManager.serializeAssets();
        for (let i = 0; i < fonts.length; i++) {
          results.push({
            fileName: fonts[i].assetId + '.' + fonts[i].dataFormat,
            fileContent: fonts[i].data
          });
        }
      }
    } catch (e) { }

    return results;
  }

  function requestRedraw(vmInstance) {
    try {
      if (vmInstance?.runtime?.requestRedraw) vmInstance.runtime.requestRedraw();
      else if (vmInstance?.runtime?.requestUpdateRunLoop) vmInstance.runtime.requestUpdateRunLoop();
    } catch (e) {
      console.warn("[RoleManager] requestRedraw 失败", e);
    }
  }

  function setPosition(vmInstance, target, x, y) {
    if (typeof target.setXY === "function") target.setXY(x, y);
    else { target.x = x; target.y = y; }
    requestRedraw(vmInstance);
  }

  function setSize(vmInstance, target, size) {
    if (typeof target.setSize === "function") target.setSize(size);
    else target.size = size;
    requestRedraw(vmInstance);
  }

  function setDirection(vmInstance, target, dir) {
    if (typeof target.setDirection === "function") target.setDirection(dir);
    else target.direction = dir;
    requestRedraw(vmInstance);
  }

  function setVisible(vmInstance, target, visible) {
    if (typeof target.setVisible === "function") target.setVisible(visible);
    else target.visible = visible;
    requestRedraw(vmInstance);
  }

  function setLayerOrder(vmInstance, target, order) {
    const rt = vmInstance?.runtime;
    if (rt && typeof rt.setTargetOrder === "function") {
      try { rt.setTargetOrder(target, order); requestRedraw(vmInstance); return true; }
      catch (e) { console.warn("[RoleManager] setTargetOrder 失败，尝试兜底", e); }
    }
    if (rt && typeof rt.setSpriteLayer === "function") {
      try { rt.setSpriteLayer(target, order); requestRedraw(vmInstance); return true; }
      catch (e) { console.warn("[RoleManager] setSpriteLayer 失败，尝试兜底", e); }
    }
    const candidates = ["layerOrder", "zIndex", "layer", "order", "depth"];
    for (const c of candidates) {
      if (typeof target[c] === "number") {
        target[c] = order;
        requestRedraw(vmInstance);
        return true;
      }
    }
    console.warn("[RoleManager] 未找到可写入的图层字段/方法");
    return false;
  }

  function goToFront(vmInstance, target) {
    if (typeof target.goToFront === "function") { target.goToFront(); requestRedraw(vmInstance); return; }
    if (vmInstance?.runtime?.setTargetOrder) {
      const max = getOriginals(vmInstance).length + 1;
      setLayerOrder(vmInstance, target, max);
    }
  }

  function goToBack(vmInstance, target) {
    if (typeof target.goToBack === "function") { target.goToBack(); requestRedraw(vmInstance); return; }
    if (vmInstance?.runtime?.setTargetOrder) setLayerOrder(vmInstance, target, 0);
  }

  function goForwardLayers(vmInstance, target, n = 1) {
    if (typeof target.goForwardLayers === "function") { target.goForwardLayers(n); requestRedraw(vmInstance); return; }
    const cur = readLayerOrder(target);
    if (typeof cur === "number") setLayerOrder(vmInstance, target, cur + n);
  }

  function goBackwardLayers(vmInstance, target, n = 1) {
    if (typeof target.goBackwardLayers === "function") { target.goBackwardLayers(n); requestRedraw(vmInstance); return; }
    const cur = readLayerOrder(target);
    if (typeof cur === "number") setLayerOrder(vmInstance, target, cur - n);
  }

  const locks = new Map();
  const LOCK_PROPS = ["x", "y", "size", "direction", "layer", "visible"];

  function hasAnyLock() {
    for (const [, lock] of locks) {
      if (Object.keys(lock).length > 0) return true;
    }
    return false;
  }

  function isLocked(target, prop) {
    const l = locks.get(target);
    return !!(l && Object.prototype.hasOwnProperty.call(l, prop));
  }

  function setLock(target, prop, value) {
    let l = locks.get(target);
    if (!l) { l = {}; locks.set(target, l); }
    l[prop] = value;
    ensureLockLoop();
  }

  function clearLock(target, prop) {
    const l = locks.get(target);
    if (!l) return;
    delete l[prop];
    if (Object.keys(l).length === 0) locks.delete(target);
  }

  function clearAllLocksOf(target) {
    locks.delete(target);
  }

  function snapshotProp(target, prop) {
    switch (prop) {
      case "x": setLock(target, "x", target.x); break;
      case "y": setLock(target, "y", target.y); break;
      case "size": setLock(target, "size", target.size); break;
      case "direction": setLock(target, "direction", target.direction); break;
      case "layer": setLock(target, "layer", readLayerOrder(target)); break;
      case "visible": setLock(target, "visible", !!target.visible); break;
    }
  }

  function applyLocks(vmInstance) {
    for (const [target, lock] of locks) {
      if (!target || target.isStage) continue;
      const lockX = Object.prototype.hasOwnProperty.call(lock, "x");
      const lockY = Object.prototype.hasOwnProperty.call(lock, "y");
      if (lockX || lockY) {
        const nx = lockX ? lock.x : target.x;
        const ny = lockY ? lock.y : target.y;
        if (typeof target.setXY === "function") target.setXY(nx, ny);
        else { target.x = nx; target.y = ny; }
      }
      if (Object.prototype.hasOwnProperty.call(lock, "size")) {
        if (typeof target.setSize === "function") target.setSize(lock.size);
        else target.size = lock.size;
      }
      if (Object.prototype.hasOwnProperty.call(lock, "direction")) {
        if (typeof target.setDirection === "function") target.setDirection(lock.direction);
        else target.direction = lock.direction;
      }
      if (Object.prototype.hasOwnProperty.call(lock, "visible")) {
        if (typeof target.setVisible === "function") target.setVisible(lock.visible);
        else target.visible = lock.visible;
      }
      if (Object.prototype.hasOwnProperty.call(lock, "layer")) {
        if (typeof lock.layer === "number") setLayerOrder(vmInstance, target, lock.layer);
      }
    }
    requestRedraw(vmInstance);
  }

  let lockTimer = null;

  function ensureLockLoop() {
    if (hasAnyLock()) {
      if (!lockTimer) {
        lockTimer = setInterval(() => {
          try {
            const v = currentVm || vm;
            if (v) applyLocks(v);
          } catch (e) { }
        }, 1);
      }
    } else {
      if (lockTimer) {
        clearInterval(lockTimer);
        lockTimer = null;
      }
    }
  }

  // ===== 变量/列表锁定（拦截方案 + 降级轮询）=====
  const variableLocks = new Map();

  const BYPASS_KEY = "__srm_bypass";
  const LOCKED_KEY = "__srm_locked";

  function deepCloneValue(value) {
    if (Array.isArray(value)) {
      try { return JSON.parse(JSON.stringify(value)); }
      catch { return value.slice(); }
    }
    return value;
  }

  function setBypass(on) {
    try {
      unsafeWindow[BYPASS_KEY] = on;
      window[BYPASS_KEY] = on;
    } catch (e) { }
  }

  function isBypassing() {
    try {
      return !!(unsafeWindow[BYPASS_KEY] || window[BYPASS_KEY]);
    } catch (e) {
      return false;
    }
  }

  function getVarObj(vmInstance, targetId, varId) {
    if (!vmInstance?.runtime) return null;
    const target = vmInstance.runtime.targets.find(t => t.id === targetId);
    if (!target?.variables) return null;
    if (target.variables instanceof Map) return target.variables.get(varId) || null;
    return target.variables[varId] || null;
  }

  function readRawValue(varObj) {
    if (!varObj) return undefined;
    if (varObj.__srm_rawValue !== undefined) return varObj.__srm_rawValue;
    return varObj.value;
  }

  function applyListProxy(record) {
    const varObj = record.varObj;
    const realArray = record.originalArray;
    const varId = record.varId;

    const handler = {
      set(target, prop, value) {
        if (isBypassing()) {
          target[prop] = value;
          return true;
        }
        const rec = variableLocks.get(varId);
        if (rec && rec.locked && rec.mode === "intercept") {
          return true;
        }
        target[prop] = value;
        return true;
      },
      deleteProperty(target, prop) {
        if (isBypassing()) {
          delete target[prop];
          return true;
        }
        const rec = variableLocks.get(varId);
        if (rec && rec.locked && rec.mode === "intercept") {
          return true;
        }
        delete target[prop];
        return true;
      }
    };

    const proxy = new Proxy(realArray, handler);
    proxy.__srmHandler = handler;
    record.proxy = proxy;
    return proxy;
  }

  function applyVariableLock(vmInstance, varId, targetId) {
    const record = variableLocks.get(varId);
    if (!record) return false;

    const varObj = getVarObj(vmInstance, targetId, varId);
    if (!varObj) return false;

    record.varObj = varObj;
    record.targetId = targetId;

    if (varObj[LOCKED_KEY] === varId) return true;

    const isList = Array.isArray(record.value) || record.isList;

    try {
      const desc = Object.getOwnPropertyDescriptor(varObj, "value");
      if (desc && !desc.configurable) {
        return applyPollingLock(vmInstance, record, varObj);
      }

      record.originalDescriptor = desc || {
        value: varObj.value,
        writable: true,
        enumerable: true,
        configurable: true
      };

      let rawValue = varObj.value;
      if (isList) {
        if (!Array.isArray(rawValue)) rawValue = [];
        record.originalArray = rawValue;
        applyListProxy(record);
      } else {
        record.originalArray = null;
      }

      const self = record;
      const realTargetId = targetId;

      Object.defineProperty(varObj, "value", {
        configurable: true,
        enumerable: true,
        get() {
          if (self.isList) {
            return self.proxy || self.originalArray;
          }
          return self.rawValue;
        },
        set(newValue) {
          if (isBypassing()) {
            if (self.isList) {
              const arr = Array.isArray(newValue) ? newValue : [];
              self.originalArray = arr;
              if (self.proxy) {
                applyListProxy(self);
              } else {
                applyListProxy(self);
              }
              self.rawValue = arr;
              self.value = deepCloneValue(arr);
            } else {
              self.rawValue = newValue;
              self.value = newValue;
            }
            return;
          }
          const rec = variableLocks.get(varId);
          if (rec && rec.locked && rec.mode === "intercept") {
            return;
          }
          if (self.isList) {
            const arr = Array.isArray(newValue) ? newValue : [];
            self.originalArray = arr;
            self.rawValue = arr;
            self.value = deepCloneValue(arr);
          } else {
            self.rawValue = newValue;
            self.value = newValue;
          }
        }
      });

      if (isList) {
        record.rawValue = record.originalArray;
      } else {
        record.rawValue = record.originalDescriptor.value;
      }

      Object.defineProperty(varObj, LOCKED_KEY, {
        value: varId,
        enumerable: false,
        configurable: true,
        writable: true
      });

      record.mode = "intercept";
      record.locked = true;
      return true;
    } catch (e) {
      console.warn("[RoleManager] 拦截方案失败，降级轮询", e);
      return applyPollingLock(vmInstance, record, varObj);
    }
  }

  function applyPollingLock(vmInstance, record, varObj) {
    record.mode = "polling";
    record.locked = true;
    record.varObj = varObj;

    const isList = record.isList;
    const snapshot = record.value;

    if (record.timer) {
      clearInterval(record.timer);
      record.timer = null;
    }

    record.timer = setInterval(() => {
      try {
        const rec = variableLocks.get(record.varId);
        if (!rec || !rec.locked) return;
        const cur = varObj.value;
        if (isList) {
          const arr = Array.isArray(cur) ? cur : [];
          if (JSON.stringify(arr) !== JSON.stringify(snapshot)) {
            arr.length = 0;
            for (let i = 0; i < snapshot.length; i++) arr.push(snapshot[i]);
          }
        } else {
          if (cur !== snapshot) {
            varObj.value = snapshot;
          }
        }
      } catch (e) { }
    }, 1);

    try {
      Object.defineProperty(varObj, LOCKED_KEY, {
        value: record.varId,
        enumerable: false,
        configurable: true,
        writable: true
      });
    } catch (e) { }

    return true;
  }

  function removeVariableLock(vmInstance, varId) {
    const record = variableLocks.get(varId);
    if (!record) return false;

    const varObj = record.varObj;

    if (record.timer) {
      clearInterval(record.timer);
      record.timer = null;
    }

    if (record.mode === "intercept" && varObj) {
      try {
        let finalValue;
        if (record.isList) {
          finalValue = record.originalArray || [];
        } else {
          finalValue = record.rawValue;
        }
        Object.defineProperty(varObj, "value", {
          value: finalValue,
          writable: true,
          enumerable: true,
          configurable: true
        });
      } catch (e) {
        console.warn("[RoleManager] 还原变量属性失败", e);
      }
    }

    if (varObj) {
      try { delete varObj[LOCKED_KEY]; } catch (e) { }
    }

    variableLocks.delete(varId);
    return true;
  }

  function lockVariable(vmInstance, varId, targetId, value) {
    if (variableLocks.has(varId)) {
      const rec = variableLocks.get(varId);
      if (value !== undefined) {
        rec.value = deepCloneValue(value);
      }
      return true;
    }

    const varObj = getVarObj(vmInstance, targetId, varId);
    if (!varObj) {
      showToast("无法获取变量对象", "error");
      return false;
    }

    const isList = Array.isArray(varObj.value);
    const isCloud = !!varObj.isCloud;

    let lockValue;
    if (value !== undefined) {
      lockValue = deepCloneValue(value);
    } else {
      lockValue = deepCloneValue(varObj.value);
    }

    const record = {
      varId: varId,
      targetId: targetId,
      value: lockValue,
      isList: isList,
      isCloud: isCloud,
      mode: null,
      timer: null,
      originalDescriptor: null,
      originalArray: null,
      varObj: varObj,
      proxy: null,
      proxyHandler: null,
      rawValue: isList ? null : lockValue,
      locked: true
    };

    variableLocks.set(varId, record);

    const ok = applyVariableLock(vmInstance, varId, targetId);

    if (ok) {
      showToast("已锁定 (值: " + (typeof lockValue === 'string' ? lockValue : JSON.stringify(lockValue)) + ")");
      return true;
    } else {
      variableLocks.delete(varId);
      showToast("锁定失败", "error");
      return false;
    }
  }

  function unlockVariable(varId) {
    const record = variableLocks.get(varId);
    if (!record) return false;
    removeVariableLock(currentVm || vm, varId);
    showToast("已解锁");
    return true;
  }

  function toggleLock(vmInstance, varId, targetId, value) {
    if (variableLocks.has(varId)) {
      return unlockVariable(varId);
    } else {
      return lockVariable(vmInstance, varId, targetId, value);
    }
  }

  function getLockedVariables() {
    const result = [];
    for (const [varId, info] of variableLocks) {
      result.push({
        id: varId,
        targetId: info.targetId,
        value: info.value,
        isList: info.isList,
        isCloud: info.isCloud
      });
    }
    return result;
  }

  function revalidateLocks(vmInstance) {
    if (!vmInstance?.runtime) return;
    for (const [varId, record] of variableLocks) {
      try {
        const varObj = getVarObj(vmInstance, record.targetId, varId);
        if (!varObj) continue;

        if (record.mode === "intercept") {
          if (varObj[LOCKED_KEY] === varId && varObj === record.varObj) continue;
          record.varObj = varObj;
          record.locked = true;
          applyVariableLock(vmInstance, varId, record.targetId);
        } else if (record.mode === "polling") {
          if (varObj === record.varObj && record.timer) continue;
          record.varObj = varObj;
          record.locked = true;
          applyPollingLock(vmInstance, record, varObj);
        }
      } catch (e) { }
    }
  }

  // ===== 广播拦截锁 =====
  const broadcastInterceptLocks = new Set();
  let patchedRuntimes = new WeakSet();
  let originalStartHatsMap = new WeakMap();

  function isBroadcastInterceptLocked(broadcastName) {
    return broadcastInterceptLocks.has(broadcastName);
  }

  function setBroadcastInterceptLock(broadcastName, locked) {
    if (locked) {
      broadcastInterceptLocks.add(broadcastName);
      showToast(`已拦截广播 "${broadcastName}"`);
    } else {
      broadcastInterceptLocks.delete(broadcastName);
      showToast(`已解除拦截 "${broadcastName}"`);
    }
  }

  function toggleBroadcastInterceptLock(broadcastName) {
    if (broadcastInterceptLocks.has(broadcastName)) {
      setBroadcastInterceptLock(broadcastName, false);
    } else {
      setBroadcastInterceptLock(broadcastName, true);
    }
  }

  function patchRuntimeForBroadcastIntercept(vmInstance) {
    if (!vmInstance?.runtime) return;
    const runtime = vmInstance.runtime;
    if (patchedRuntimes.has(runtime)) return;
    if (typeof runtime.startHats !== 'function') return;

    const originalStartHats = runtime.startHats.bind(runtime);
    originalStartHatsMap.set(runtime, originalStartHats);

    runtime.startHats = function (requestedHatOpcode, optMatchFields, optTarget) {
      try {
        if (requestedHatOpcode === 'event_whenbroadcastreceived' && optMatchFields) {
          const broadcastName = optMatchFields.BROADCAST_OPTION;
          if (broadcastName !== undefined && broadcastName !== null) {
            if (broadcastInterceptLocks.has(String(broadcastName))) {
              return [];
            }
          }
        }
      } catch (e) {
        console.warn('[RoleManager] 广播拦截判断异常:', e);
      }
      return originalStartHats(requestedHatOpcode, optMatchFields, optTarget);
    };

    patchedRuntimes.add(runtime);
  }

  // ===== 扩展 opcode 拦截 =====
  const EXTENSION_INTERCEPT_LOCKED = new Set();
  const NATIVE_OPCODE_PREFIXES = new Set([
    "motion_", "looks_", "sound_", "event_", "control_", "sensing_",
    "operators_", "data_", "procedures_", "argument_", "math_", "text_",
    "colour_", "colour", "makeymakey_", "if_", "looks_"
  ]);

  const extPatchedRuntimes = new WeakSet();
  const extOriginalPrimitives = new WeakMap(); // runtime -> Map<opcode, fn>

  function getExtensionPrefix(opcode) {
    if (!opcode || typeof opcode !== "string") return "";
    const idx = opcode.indexOf("_");
    if (idx <= 0) return opcode;
    return opcode.slice(0, idx + 1);
  }

  function isNativeOpcode(opcode) {
    const prefix = getExtensionPrefix(opcode);
    return NATIVE_OPCODE_PREFIXES.has(prefix);
  }

  function isExtensionInterceptLocked(opcode) {
    return EXTENSION_INTERCEPT_LOCKED.has(opcode);
  }

  function setExtensionInterceptLock(opcode, locked) {
    if (locked) {
      EXTENSION_INTERCEPT_LOCKED.add(opcode);
      applyExtensionLockToRuntime(currentVm || vm, opcode, true);
      showToast(`已拦截 opcode "${opcode}"`);
    } else {
      EXTENSION_INTERCEPT_LOCKED.delete(opcode);
      applyExtensionLockToRuntime(currentVm || vm, opcode, false);
      showToast(`已解除拦截 "${opcode}"`);
    }
  }

  function toggleExtensionInterceptLock(opcode) {
    if (EXTENSION_INTERCEPT_LOCKED.has(opcode)) {
      setExtensionInterceptLock(opcode, false);
    } else {
      setExtensionInterceptLock(opcode, true);
    }
  }

  function applyExtensionLockToRuntime(vmInstance, opcode, locked) {
    if (!vmInstance?.runtime) return;
    const runtime = vmInstance.runtime;
    if (!runtime._primitives) return;
    if (!extOriginalPrimitives.has(runtime)) {
      extOriginalPrimitives.set(runtime, new Map());
    }
    const origMap = extOriginalPrimitives.get(runtime);

    if (locked) {
      if (!origMap.has(opcode)) {
        const orig = runtime._primitives[opcode];
        if (typeof orig === "function") {
          origMap.set(opcode, orig);
        }
      }
      const original = origMap.get(opcode);
      if (typeof original === "function") {
        runtime._primitives[opcode] = function () {
          if (EXTENSION_INTERCEPT_LOCKED.has(opcode)) {
            return undefined;
          }
          return original.apply(this, arguments);
        };
      }
    } else {
      if (origMap.has(opcode)) {
        runtime._primitives[opcode] = origMap.get(opcode);
        origMap.delete(opcode);
      }
    }
  }

  function applyAllExtensionLocks(vmInstance) {
    if (!vmInstance?.runtime) return;
    const runtime = vmInstance.runtime;
    if (!runtime._primitives) return;

    if (!extOriginalPrimitives.has(runtime)) {
      extOriginalPrimitives.set(runtime, new Map());
    }
    const origMap = extOriginalPrimitives.get(runtime);

    for (const opcode of EXTENSION_INTERCEPT_LOCKED) {
      if (!origMap.has(opcode)) {
        const orig = runtime._primitives[opcode];
        if (typeof orig === "function") {
          origMap.set(opcode, orig);
        }
      }
      const original = origMap.get(opcode);
      if (typeof original === "function") {
        runtime._primitives[opcode] = function () {
          if (EXTENSION_INTERCEPT_LOCKED.has(opcode)) {
            return undefined;
          }
          return original.apply(this, arguments);
        };
      }
    }
  }

  function patchRuntimeForExtensionIntercept(vmInstance) {
    if (!vmInstance?.runtime) return;
    const runtime = vmInstance.runtime;
    if (extPatchedRuntimes.has(runtime)) {
      applyAllExtensionLocks(vmInstance);
      return;
    }
    if (!runtime._primitives) return;

    try {
      const primitives = runtime._primitives;
      const handler = {
        set(target, prop, value) {
          target[prop] = value;
          if (typeof prop === "string" && EXTENSION_INTERCEPT_LOCKED.has(prop) && typeof value === "function") {
            if (!extOriginalPrimitives.has(runtime)) {
              extOriginalPrimitives.set(runtime, new Map());
            }
            const origMap = extOriginalPrimitives.get(runtime);
            if (!origMap.has(prop)) {
              origMap.set(prop, value);
            }
            const original = origMap.get(prop);
            target[prop] = function () {
              if (EXTENSION_INTERCEPT_LOCKED.has(prop)) {
                return undefined;
              }
              return original.apply(this, arguments);
            };
          }
          return true;
        }
      };

      runtime._primitives = new Proxy(primitives, handler);
      extPatchedRuntimes.add(runtime);
      applyAllExtensionLocks(vmInstance);
    } catch (e) {
      console.warn("[RoleManager] 扩展拦截 Proxy 失败，降级为仅包装已有 opcode", e);
      extPatchedRuntimes.add(runtime);
      applyAllExtensionLocks(vmInstance);
    }
  }

  function getLoadedExtensions(vmInstance) {
    if (!vmInstance?.runtime?._primitives) return [];
    const primitives = vmInstance.runtime._primitives;
    const groups = new Map();

    const keys = Object.keys(primitives);
    for (const opcode of keys) {
      if (typeof primitives[opcode] !== "function") continue;
      if (isNativeOpcode(opcode)) continue;
      const prefix = getExtensionPrefix(opcode);
      if (!prefix) continue;
      if (!groups.has(prefix)) {
        groups.set(prefix, {
          prefix,
          opcodes: []
        });
      }
      groups.get(prefix).opcodes.push(opcode);
    }

    const result = [];
    for (const [prefix, info] of groups) {
      info.opcodes.sort();
      const lockedCount = info.opcodes.filter(op => EXTENSION_INTERCEPT_LOCKED.has(op)).length;
      result.push({
        prefix,
        name: prefix.replace(/_$/, ""),
        opcodes: info.opcodes,
        lockedCount,
        totalCount: info.opcodes.length,
        allLocked: info.opcodes.length > 0 && lockedCount === info.opcodes.length
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }

  function getOpcodeDisplayName(vmInstance, opcode) {
    try {
      const runtime = vmInstance?.runtime;
      if (!runtime) return opcode;

      const blockInfo = runtime._blockInfo;
      if (Array.isArray(blockInfo)) {
        for (const ext of blockInfo) {
          if (!ext || !Array.isArray(ext.blocks)) continue;
          for (const block of ext.blocks) {
            if (block && block.opcode === opcode) {
              const info = block.info || {};
              const name =
                (typeof info.name === "string" && info.name) ||
                (typeof info.text === "string" && info.text) ||
                (typeof block.text === "string" && block.text);
              if (name) return name;
            }
          }
        }
      }

      const Blockly = unsafeWindow?.Blockly || window.Blockly;
      if (Blockly && Blockly.Blocks && Blockly.Blocks[opcode]) {
        const def = Blockly.Blocks[opcode];
        const name =
          (typeof def.message0 === "string" && def.message0) ||
          (typeof def.text === "string" && def.text);
        if (name) return name;
      }
    } catch (e) { }
    return opcode;
  }

  function getVariables(vmInstance) {
    if (!vmInstance?.runtime?.targets) return [];
    const variables = [];
    for (const target of vmInstance.runtime.targets) {
      if (!target.variables) continue;
      const targetName = target.isStage ? "舞台" : (target.sprite?.name || "未知角色");
      const vars = target.variables instanceof Map
        ? [...target.variables.entries()]
        : Object.entries(target.variables);
      for (const [id, variable] of vars) {
        if (variable?.value === undefined) continue;
        const isBroadcast = variable.type === "broadcast_msg";
        const isList = Array.isArray(variable.value);
        variables.push({
          id: id,
          name: variable.name || "未命名",
          value: variable.value,
          isList: isList,
          isBroadcast: isBroadcast,
          isCloud: !!variable.isCloud,
          type: variable.type || "",
          targetId: target.id || "",
          targetName: targetName,
          isStage: target.isStage || false,
          displayValue: isList ? JSON.stringify(variable.value) : String(variable.value),
          isLocked: variableLocks.has(id)
        });
      }
    }
    return variables;
  }

  function getVariablesGrouped(vmInstance) {
    const vars = getVariables(vmInstance);
    const groups = new Map();
    for (const v of vars) {
      const key = v.targetId;
      if (!groups.has(key)) {
        groups.set(key, {
          targetId: key,
          targetName: v.targetName,
          isStage: v.isStage,
          variables: []
        });
      }
      groups.get(key).variables.push(v);
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.isStage && !b.isStage) return -1;
      if (!a.isStage && b.isStage) return 1;
      return a.targetName.localeCompare(b.targetName);
    });
  }

  function setVariable(vmInstance, targetId, varId, value) {
    if (!vmInstance?.runtime) return false;
    try {
      const target = vmInstance.runtime.targets.find(t => t.id === targetId);
      if (!target?.variables) return false;

      let varObj = null;
      if (target.variables instanceof Map) {
        varObj = target.variables.get(varId);
      } else {
        varObj = target.variables[varId];
      }
      if (!varObj) return false;

      const record = variableLocks.get(varId);
      const isLocked = !!record;

      setBypass(true);
      try {
        if (isLocked && record.isList) {
          const arr = record.originalArray || [];
          arr.length = 0;
          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) arr.push(value[i]);
          }
          record.value = deepCloneValue(arr);
          record.rawValue = arr;
        } else {
          varObj.value = value;
          if (isLocked) {
            record.value = deepCloneValue(value);
            if (record.isList && Array.isArray(value)) {
              record.originalArray = value;
              record.rawValue = value;
            } else {
              record.rawValue = value;
            }
          }
        }
      } finally {
        setBypass(false);
      }

      if (typeof vmInstance.emit === "function") {
        vmInstance.emit("variablesUpdate");
      }
      return true;
    } catch (err) {
      console.error("设置变量失败", err);
      setBypass(false);
      return false;
    }
  }

  function getVariableValue(vmInstance, targetId, varId) {
    if (!vmInstance?.runtime) return undefined;
    try {
      const target = vmInstance.runtime.targets.find(t => t.id === targetId);
      if (!target?.variables) return undefined;

      let varObj = null;
      if (target.variables instanceof Map) {
        varObj = target.variables.get(varId);
      } else {
        varObj = target.variables[varId];
      }
      return varObj?.value;
    } catch (err) {
      return undefined;
    }
  }

  function findVariableByName(vmInstance, name) {
    const vars = getVariables(vmInstance);
    return vars.find(v => v.name === name);
  }

  function findVariablesByName(vmInstance, name) {
    const vars = getVariables(vmInstance);
    return vars.filter(v => v.name === name);
  }

  function triggerBroadcast(vmInstance, broadcastName) {
    if (!vmInstance?.runtime || typeof vmInstance.runtime.startHats !== 'function') {
      showToast("当前环境不支持触发广播", "error");
      return 0;
    }
    if (isBroadcastInterceptLocked(broadcastName)) {
      showToast(`广播 "${broadcastName}" 已被拦截锁定，无法触发`, "error");
      return 0;
    }
    try {
      const threads = vmInstance.runtime.startHats('event_whenbroadcastreceived', {
        BROADCAST_OPTION: broadcastName
      });
      const count = Array.isArray(threads) ? threads.length : 0;
      showToast(`已广播 "${broadcastName}" (${count} 个线程启动)`);
      return count;
    } catch (e) {
      console.error("[RoleManager] 触发广播失败:", e);
      showToast("广播失败：" + (e && e.message ? e.message : String(e)), "error");
      return 0;
    }
  }

  function patchVMForExport(vmInstance) {
    if (!vmInstance) return;
    if (vmInstance._patchedForExport) return;

    if (typeof vmInstance.serializeAssets !== 'function') {
      vmInstance.serializeAssets = function (targetId) {
        return getAssetFilesFromRuntime(this.runtime, targetId);
      };
    }

    if (typeof vmInstance._addFileDescsToZip !== 'function') {
      vmInstance._addFileDescsToZip = function (fileDescs, zip) {
        for (let i = 0; i < fileDescs.length; i++) {
          const desc = fileDescs[i];
          zip.file(desc.fileName, desc.fileContent);
        }
      };
    }

    if (typeof vmInstance._saveProjectZip !== 'function') {
      vmInstance._saveProjectZip = function () {
        if (!JSZip) {
          throw new Error('JSZip 未加载，无法导出');
        }
        const zip = new JSZip();
        const json = this.toJSON();
        zip.file('project.json', json);
        this._addFileDescsToZip(this.serializeAssets(), zip);

        for (const key in zip.files) {
          if (zip.files[key]) {
            zip.files[key].date = VERSION_DATE;
          }
        }

        for (const key in zip.files) {
          if (zip.files[key]) {
            const shouldCompress = EXTENSIONS.some(ext => key.endsWith(ext));
            zip.files[key].options.compression = shouldCompress ? 'DEFLATE' : 'STORE';
          }
        }

        return zip;
      };
    }

    if (typeof vmInstance.saveProjectSb3 !== 'function') {
      vmInstance.saveProjectSb3 = function (type) {
        return this._saveProjectZip().generateAsync({
          type: type || 'blob',
          mimeType: 'application/x.scratch.sb3'
        });
      };
    }

    if (typeof vmInstance.exportSprite !== 'function') {
      vmInstance.exportSprite = function (targetId, type) {
        if (!JSZip) {
          throw new Error('JSZip 未加载，无法导出');
        }
        const json = this.toJSON(targetId);
        const zip = new JSZip();
        zip.file('sprite.json', json);
        this._addFileDescsToZip(this.serializeAssets(targetId), zip);

        for (const key in zip.files) {
          if (zip.files[key]) {
            zip.files[key].date = VERSION_DATE;
          }
        }

        for (const key in zip.files) {
          if (zip.files[key]) {
            const shouldCompress = EXTENSIONS.some(ext => key.endsWith(ext));
            zip.files[key].options.compression = shouldCompress ? 'DEFLATE' : 'STORE';
          }
        }

        return zip.generateAsync({
          type: typeof type === 'string' ? type : 'blob',
          mimeType: 'application/x.scratch.sprite3',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
      };
    }

    vmInstance._patchedForExport = true;
  }

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
        costumePreview: t.sprite.costumes?.[0]?.asset?.encodeDataURI?.() || "",
        isStage: false
      }));
  }

  function getStage(vmInstance) {
    if (!vmInstance?.runtime?.targets) return null;
    const stageTarget = vmInstance.runtime.targets.find((t) => t.isStage);
    if (!stageTarget || !stageTarget.sprite) return null;
    return {
      target: stageTarget,
      sprite: stageTarget.sprite,
      name: stageTarget.sprite.name,
      id: stageTarget.id,
      clones: stageTarget.sprite.clones || [],
      costumeCount: stageTarget.sprite.costumes?.length || 0,
      soundCount: stageTarget.sprite.sounds?.length || 0,
      costumePreview: stageTarget.sprite.costumes?.[0]?.asset?.encodeDataURI?.() || "",
      isStage: true
    };
  }

  function deleteSprite(vmInstance, targetId) {
    const target = vmInstance.runtime.targets.find((t) => t.id === targetId);
    if (!target || target.isStage) return false;
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

  function blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  function showFilePrompt(accept = ".sprite3,.sprite2,.zip", label = "sprite3") {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      const dropZone = document.createElement("div");
      const fileInput = document.createElement("input");
      let cleanup = () => {};

      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      `;

      dropZone.style.cssText = `
        background: rgba(20, 20, 40, 0.85);
        backdrop-filter: blur(30px);
        padding: 32px 40px;
        border-radius: 20px;
        border: 4px dashed rgba(255, 255, 255, 0.2);
        cursor: pointer;
        font-size: 16px;
        text-align: center;
        min-width: 320px;
        color: #e8e8e8;
        font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
        transition: border-color 0.3s, transform 0.2s;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
      `;

      dropZone.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">+</div>
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px; background: linear-gradient(135deg, #ff8c1a, #ff6b00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
          选择或拖入文件
        </div>
        <div style="color: rgba(255,255,255,0.5); font-size: 14px;">
          上传 ${label} 文件
        </div>
        <div style="color: rgba(255,255,255,0.3); font-size: 12px; margin-top: 12px;">
          支持 .sprite3 .sprite2 .zip
        </div>
      `;

      fileInput.type = "file";
      fileInput.accept = accept;
      fileInput.style.display = "none";

      const close = () => {
        cleanup();
        document.body.removeChild(overlay);
        resolve(null);
      };

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });

      dropZone.addEventListener("click", () => fileInput.click());

      dropZone.addEventListener("dragover", (e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          dropZone.style.borderColor = "#ff8c1a";
          dropZone.style.transform = "scale(1.02)";
        }
      });

      dropZone.addEventListener("dragleave", () => {
        dropZone.style.borderColor = "rgba(255,255,255,0.2)";
        dropZone.style.transform = "scale(1)";
      });

      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "rgba(255,255,255,0.2)";
        dropZone.style.transform = "scale(1)";
        const file = e.dataTransfer.files[0];
        if (file) {
          cleanup();
          document.body.removeChild(overlay);
          resolve(file);
        }
      });

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          cleanup();
          document.body.removeChild(overlay);
          resolve(file);
        }
      });

      const keyHandler = (e) => {
        if (e.key === "Escape") close();
      };
      document.addEventListener("keydown", keyHandler);

      cleanup = () => {
        document.removeEventListener("keydown", keyHandler);
      };

      overlay.appendChild(dropZone);
      overlay.appendChild(fileInput);
      document.body.appendChild(overlay);
    });
  }

  async function insertSprite(vmInstance) {
    try {
      const file = await showFilePrompt(".sprite3,.sprite2,.zip", "角色");
      if (!file) return false;
      const arrayBuffer = await blobToArrayBuffer(file);
      if (typeof vmInstance.addSprite === "function") {
        await vmInstance.addSprite(arrayBuffer);
        showToast("角色插入成功！");
        return true;
      } else {
        showToast("当前环境不支持插入角色", "error");
        return false;
      }
    } catch (err) {
      console.error("插入角色失败", err);
      showToast("插入失败：" + err.message, "error");
      return false;
    }
  }

  async function exportSpriteAsFile(vmInstance, targetId, spriteName) {
    try {
      patchVMForExport(vmInstance);

      if (typeof vmInstance.exportSprite !== 'function') {
        showToast("当前环境不支持导出角色", "error");
        return false;
      }

      if (!JSZip) {
        showToast("JSZip 库未加载，请检查网络或刷新重试", "error");
        return false;
      }

      const blob = await vmInstance.exportSprite(targetId);
      const fileName = spriteName + '.sprite3';

      if (typeof GM_download === 'function') {
        GM_download({
          url: URL.createObjectURL(blob),
          name: fileName,
          saveAs: false
        });
        showToast(`已导出角色 "${spriteName}"`);
        return true;
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
        showToast(`已导出角色 "${spriteName}"`);
        return true;
      }
    } catch (err) {
      console.error('导出角色失败:', err);
      showToast('导出角色失败: ' + err.message, 'error');
      return false;
    }
  }

  async function exportAsset(item, type) {
    const asset = item.broken ? item.broken.asset : item.asset;
    if (!asset) {
      showToast("无法获取素材数据", "error");
      return false;
    }

    let ext = asset.dataFormat;
    if (!ext) {
      ext = "bin";
    } else {
      ext = String(ext).replace(/^\./, "");
    }

    let fileName;
    if (currentFileNameMode === "name") {
      const baseName = item.name || ("未命名_" + Math.floor(Math.random() * 10000));
      fileName = baseName + "." + ext;
    } else {
      fileName = asset.assetId + "." + ext;
    }

    const mimeType = MIME_MAP[ext.toLowerCase()] || "application/octet-stream";

    let blob;
    try {
      blob = new Blob([asset.data], { type: mimeType });
    } catch (e) {
      try {
        blob = new Blob([asset.data.buffer || asset.data], { type: mimeType });
      } catch (e2) {
        showToast("无法获取素材数据", "error");
        return false;
      }
    }

    try {
      if (typeof GM_download === "function") {
        GM_download({
          url: URL.createObjectURL(blob),
          name: fileName,
          saveAs: false
        });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      }
      const typeLabel = type === "costume" ? "造型" : "声音";
      showToast(`已导出${typeLabel} "${item.name || fileName}"`);
      return true;
    } catch (err) {
      console.error("导出素材失败", err);
      showToast("导出素材失败：" + err.message, "error");
      return false;
    }
  }

  const styles = `
    .srm-float-btn{position:fixed;bottom:80px;right:20px;z-index:99998;width:56px;height:56px;border-radius:50%;border:none;background:${THEME_GRADIENT};cursor:pointer;box-shadow:0 4px 20px rgba(255,140,26,0.4);transition:all .3s cubic-bezier(.34,1.56,.64,1);display:flex;align-items:center;justify-content:center;user-select:none;touch-action:none;padding:0;overflow:hidden}
    .srm-float-btn:hover{transform:scale(1.12) rotate(-5deg);box-shadow:0 8px 35px rgba(255,140,26,0.5)}
    .srm-float-btn:active{transform:scale(.9)}
    .srm-float-btn img{width:70%;height:70%;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));pointer-events:none}

    .srm-window {
      position: fixed;
      top: 80px;
      left: 80px;
      width: 680px;
      max-width: 92vw;
      max-height: 85vh;
      background: rgba(20, 20, 40, 0.85);
      backdrop-filter: blur(30px);
      border-radius: 20px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 140, 26, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #e8e8e8;
      font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
      z-index: 99999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: srm-scale-in .35s cubic-bezier(.34,1.56,.64,1);
    }
    .srm-window.open { display: flex; }

    .srm-window-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.04);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    }
    .srm-window-header .srm-title {
      flex: 1;
      font-size: 18px;
      font-weight: 700;
      background: ${THEME_GRADIENT};
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
      letter-spacing: -.3px;
      pointer-events: none;
    }
    .srm-window-header .srm-close-btn {
      background: rgba(255, 255, 255, 0.05);
      border: none;
      color: rgba(255, 255, 255, 0.5);
      width: 34px;
      height: 34px;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      transition: all .2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      pointer-events: auto;
    }
    .srm-window-header .srm-close-btn:hover {
      background: rgba(255, 70, 70, 0.2);
      color: #ff6b6b;
      transform: scale(1.05);
    }

    .srm-window-body {
      flex: 1;
      overflow-y: auto;
      padding: 18px 22px 22px;
    }
    .srm-window-body::-webkit-scrollbar { width: 4px; }
    .srm-window-body::-webkit-scrollbar-track { background: transparent; }
    .srm-window-body::-webkit-scrollbar-thumb { background: #ff8c1a; border-radius: 4px; }

    .srm-back-btn {
      background: rgba(255, 255, 255, 0.05);
      border: none;
      color: rgba(255, 255, 255, 0.5);
      width: 34px;
      height: 34px;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
      transition: all .2s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      pointer-events: auto;
      padding: 0;
      line-height: 1;
    }
    .srm-back-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      transform: scale(1.05);
    }

    .srm-filename-select {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
      color: #e8e8e8;
      cursor: pointer;
      transition: all .2s;
      outline: none;
      pointer-events: auto;
    }
    .srm-filename-select:focus { border-color: #ff8c1a; box-shadow: 0 0 15px rgba(255, 140, 26, 0.08); }
    .srm-filename-select option { background: #141428; color: #e8e8e8; }

    .srm-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 4px;
    }
    .srm-tab {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all .2s;
    }
    .srm-tab:hover { color: rgba(255, 255, 255, 0.8); }
    .srm-tab.active {
      background: ${THEME_GRADIENT};
      color: #fff;
      box-shadow: 0 4px 15px rgba(255, 140, 26, 0.3);
    }

    .srm-sprite-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 12px;
      margin: 4px 0 8px;
    }
    .srm-sprite-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 12px 8px 10px;
      text-align: center;
      cursor: pointer;
      transition: all .3s cubic-bezier(.34, 1.56, .64, 1);
      position: relative;
      overflow: hidden;
    }
    .srm-sprite-card:hover {
      transform: translateY(-4px) scale(1.02);
      border-color: #ff8c1a;
      box-shadow: 0 8px 30px rgba(255, 140, 26, 0.15);
    }
    .srm-sprite-card:active { transform: scale(.95); }
    .srm-sprite-card img {
      width: 100%;
      aspect-ratio: 1/1;
      object-fit: contain;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.3);
      position: relative;
      z-index: 1;
    }
    .srm-sprite-card .srm-name {
      font-size: 12px;
      font-weight: 500;
      color: #e8e8e8;
      margin-top: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      position: relative;
      z-index: 1;
    }
    .srm-sprite-card .srm-badge {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 2px;
      position: relative;
      z-index: 1;
    }
    .srm-sprite-card .srm-badge span { margin: 0 4px; }

    .srm-sprite-card.srm-add-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 2px dashed rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.02);
      cursor: pointer;
      min-height: 120px;
      transition: all .3s cubic-bezier(.34, 1.56, .64, 1);
    }
    .srm-sprite-card.srm-add-card:hover {
      border-color: #ff8c1a;
      background: rgba(255, 140, 26, 0.08);
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 8px 30px rgba(255, 140, 26, 0.15);
    }
    .srm-sprite-card.srm-add-card:active { transform: scale(.95); }
    .srm-sprite-card.srm-add-card .srm-add-icon {
      font-size: 36px;
      color: rgba(255, 255, 255, 0.3);
      transition: all .3s;
      line-height: 1;
    }
    .srm-sprite-card.srm-add-card:hover .srm-add-icon {
      color: #ff8c1a;
      transform: rotate(90deg) scale(1.1);
    }
    .srm-sprite-card.srm-add-card .srm-add-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 6px;
      transition: color .3s;
    }
    .srm-sprite-card.srm-add-card:hover .srm-add-label { color: rgba(255, 255, 255, 0.7); }

    .srm-detail-profile {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .srm-detail-profile img {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.3);
      flex-shrink: 0;
      border: 2px solid rgba(255, 255, 255, 0.06);
    }
    .srm-detail-profile .srm-info { flex: 1; min-width: 0; }
    .srm-detail-profile .srm-info .srm-name {
      font-size: 17px;
      font-weight: 600;
      color: #e8e8e8;
      margin: 0;
    }
    .srm-detail-profile .srm-info .srm-meta {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin: 4px 0 0 0;
    }
    .srm-detail-profile .srm-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .srm-detail-profile .srm-actions button {
      padding: 8px 14px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all .2s;
    }
    .srm-detail-profile .srm-actions .srm-btn-rename {
      background: ${THEME_GRADIENT};
      color: #fff;
    }
    .srm-detail-profile .srm-actions .srm-btn-rename:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(255, 140, 26, 0.3);
    }
    .srm-detail-profile .srm-actions .srm-btn-delete {
      background: rgba(231, 76, 60, 0.2);
      color: #ff6b6b;
      border: 1px solid rgba(231, 76, 60, 0.2);
    }
    .srm-detail-profile .srm-actions .srm-btn-delete:hover {
      background: rgba(231, 76, 60, 0.35);
      transform: scale(1.05);
    }
    .srm-detail-profile .srm-actions .srm-btn-export {
      background: linear-gradient(135deg, #2ecc71, #27ae60);
      color: #fff;
    }
    .srm-detail-profile .srm-actions .srm-btn-export:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
    }

    .srm-section { margin-top: 16px; }
    .srm-section-title {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      margin: 0 0 10px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .srm-section-title span { font-weight: 400; opacity: .6; }

    .srm-item-list { display: flex; flex-direction: column; gap: 6px; }
    .srm-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all .2s;
    }
    .srm-item:hover {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.08);
    }
    .srm-item .srm-item-idx {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      flex-shrink: 0;
      min-width: 28px;
    }
    .srm-item .srm-item-name {
      flex: 1;
      font-size: 13px;
      color: #e8e8e8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .srm-item .srm-item-current {
      font-size: 10px;
      color: #ff8c1a;
      background: rgba(255, 140, 26, 0.15);
      padding: 2px 10px;
      border-radius: 12px;
      flex-shrink: 0;
      font-weight: 500;
    }
    .srm-item .srm-item-del {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      font-size: 14px;
      padding: 4px 6px;
      border-radius: 6px;
      transition: all .2s;
      flex-shrink: 0;
    }
    .srm-item .srm-item-del:hover {
      color: #ff6b6b;
      background: rgba(231, 76, 60, 0.1);
    }
    .srm-item .srm-item-export {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      font-size: 14px;
      padding: 4px 6px;
      border-radius: 6px;
      transition: all .2s;
      flex-shrink: 0;
    }
    .srm-item .srm-item-export:hover {
      color: #ff8c1a;
      background: rgba(255, 140, 26, 0.1);
    }
    .srm-empty {
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      padding: 30px 0;
    }
    .srm-empty .srm-empty-icon {
      font-size: 32px;
      display: block;
      margin-bottom: 10px;
      opacity: .5;
    }

    .srm-var-group {
      margin-bottom: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      overflow: hidden;
    }
    .srm-var-group-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      cursor: pointer;
      transition: background .2s;
      user-select: none;
    }
    .srm-var-group-header:hover { background: rgba(255, 255, 255, 0.08); }
    .srm-var-group-header .srm-group-caret {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.3);
      transition: transform .3s;
      flex-shrink: 0;
    }
    .srm-var-group-header .srm-group-caret.open { transform: rotate(90deg); }
    .srm-var-group-header .srm-group-name {
      font-size: 14px;
      font-weight: 600;
      color: #e8e8e8;
      flex: 1;
    }
    .srm-var-group-header .srm-group-count {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 12px;
      border-radius: 12px;
    }
    .srm-var-group-header .srm-group-badge {
      font-size: 10px;
      padding: 2px 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.4);
      flex-shrink: 0;
    }
    .srm-var-group-header .srm-group-badge.stage {
      background: rgba(52, 152, 219, 0.15);
      color: #5dade2;
    }
    .srm-var-group-body {
      padding: 6px 10px 10px;
      display: block;
    }
    .srm-var-group-body.collapsed { display: none; }

    .srm-var-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: all .2s;
      margin-bottom: 4px;
    }
    .srm-var-item:hover {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.06);
    }
    .srm-var-item.locked-item {
      border-color: rgba(255, 140, 26, 0.3);
      background: rgba(255, 140, 26, 0.06);
    }
    .srm-var-item.broadcast-item {
      border-color: rgba(155, 89, 182, 0.25);
      background: rgba(155, 89, 182, 0.05);
    }
    .srm-var-item .srm-var-name {
      font-size: 12px;
      color: #e8e8e8;
      font-weight: 500;
      min-width: 60px;
      flex-shrink: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .srm-var-item .srm-var-type {
      font-size: 9px;
      padding: 1px 8px;
      border-radius: 10px;
      flex-shrink: 0;
      font-weight: 500;
    }
    .srm-var-type.cloud {
      background: rgba(52, 152, 219, 0.2);
      color: #5dade2;
      min-width: 42px;
      text-align: center;
      padding: 1px 6px;
    }
    .srm-var-type.cloudlist {
      background: rgba(26, 188, 156, 0.2);
      color: #48c9b0;
      min-width: 42px;
      text-align: center;
      padding: 1px 6px;
    }
    .srm-var-type.list {
      background: rgba(46, 204, 113, 0.2);
      color: #58d68d;
    }
    .srm-var-type.normal {
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.4);
    }
    .srm-var-type.broadcast {
      background: rgba(155, 89, 182, 0.25);
      color: #bb8fce;
    }
    .srm-var-item .srm-var-edit {
      flex: 1;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 12px;
      color: #e8e8e8;
      font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
      min-width: 50px;
      transition: all .2s;
    }
    .srm-var-item .srm-var-edit:focus {
      outline: none;
      border-color: #ff8c1a;
      box-shadow: 0 0 15px rgba(255, 140, 26, 0.08);
    }
    .srm-var-item .srm-var-edit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .srm-var-item .srm-var-edit::placeholder { color: rgba(255, 255, 255, 0.15); }
    .srm-var-item .srm-var-btn {
      background: ${THEME_GRADIENT};
      border: none;
      border-radius: 6px;
      padding: 3px 12px;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
      flex-shrink: 0;
    }
    .srm-var-item .srm-var-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 10px rgba(255, 140, 26, 0.3);
    }
    .srm-var-item .srm-var-btn:active { transform: scale(.95); }
    .srm-var-item .srm-var-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none !important;
    }
    .srm-var-item .srm-var-lock {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 2px 8px;
      color: rgba(255, 255, 255, 0.3);
      font-size: 11px;
      cursor: pointer;
      transition: all .2s;
      flex-shrink: 0;
    }
    .srm-var-item .srm-var-lock:hover {
      background: rgba(255, 140, 26, 0.1);
      border-color: #ff8c1a;
      color: #ff8c1a;
    }
    .srm-var-item .srm-var-lock.locked {
      background: rgba(255, 140, 26, 0.15);
      border-color: #ff8c1a;
      color: #ff8c1a;
    }
    .srm-var-item .srm-var-lock.locked:hover {
      background: rgba(231, 76, 60, 0.15);
      border-color: #ff6b6b;
      color: #ff6b6b;
    }
    .srm-var-item .srm-var-trigger {
      background: linear-gradient(135deg, #9b59b6, #8e44ad);
      border: none;
      border-radius: 6px;
      padding: 3px 12px;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
      flex-shrink: 0;
      margin-left: auto;
    }
    .srm-var-item .srm-var-trigger:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 10px rgba(155, 89, 182, 0.4);
    }
    .srm-var-item .srm-var-trigger:active { transform: scale(.95); }
    .srm-var-item .srm-var-trigger:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none !important;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.35);
    }
    .srm-var-item .srm-var-intercept {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 2px 8px;
      color: rgba(255, 255, 255, 0.3);
      font-size: 11px;
      cursor: pointer;
      transition: all .2s;
      flex-shrink: 0;
    }
    .srm-var-item .srm-var-intercept:hover {
      background: rgba(155, 89, 182, 0.12);
      border-color: #9b59b6;
      color: #bb8fce;
    }
    .srm-var-item .srm-var-intercept.locked {
      background: rgba(155, 89, 182, 0.2);
      border-color: #9b59b6;
      color: #bb8fce;
    }
    .srm-var-item .srm-var-intercept.locked:hover {
      background: rgba(231, 76, 60, 0.15);
      border-color: #ff6b6b;
      color: #ff6b6b;
    }

    .srm-ext-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
      margin: 4px 0 8px;
    }
    .srm-ext-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 14px 12px;
      cursor: pointer;
      transition: all .3s cubic-bezier(.34, 1.56, .64, 1);
      position: relative;
      overflow: hidden;
      text-align: left;
    }
    .srm-ext-card:hover {
      transform: translateY(-4px) scale(1.02);
      border-color: #ff8c1a;
      box-shadow: 0 8px 30px rgba(255, 140, 26, 0.15);
    }
    .srm-ext-card:active { transform: scale(.97); }
    .srm-ext-card .srm-ext-name {
      font-size: 14px;
      font-weight: 600;
      color: #e8e8e8;
      margin-bottom: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .srm-ext-card .srm-ext-meta {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .srm-ext-card .srm-ext-lock-badge {
      font-size: 10px;
      padding: 2px 10px;
      border-radius: 12px;
      background: rgba(255, 140, 26, 0.15);
      color: #ff8c1a;
      font-weight: 600;
    }
    .srm-ext-card.all-locked {
      border-color: rgba(231, 76, 60, 0.6);
      background: rgba(231, 76, 60, 0.08);
      opacity: 0.85;
    }
    .srm-ext-card.all-locked .srm-ext-name { color: #ff6b6b; }
    .srm-ext-card.all-locked .srm-ext-lock-badge {
      background: rgba(231, 76, 60, 0.25);
      color: #ff6b6b;
    }

    .srm-opcode-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
      margin: 4px 0 8px;
    }
    .srm-opcode-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all .2s;
      cursor: pointer;
    }
    .srm-opcode-card:hover {
      border-color: rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.07);
    }
    .srm-opcode-card.locked {
      border-color: rgba(255, 140, 26, 0.5);
      background: rgba(255, 140, 26, 0.08);
    }
    .srm-opcode-card .srm-opcode-name {
      flex: 1;
      font-size: 12px;
      color: #e8e8e8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
    }
    .srm-opcode-card .srm-opcode-lock {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 2px 8px;
      color: rgba(255, 255, 255, 0.3);
      font-size: 11px;
      cursor: pointer;
      transition: all .2s;
      flex-shrink: 0;
    }
    .srm-opcode-card .srm-opcode-lock:hover {
      background: rgba(255, 140, 26, 0.1);
      border-color: #ff8c1a;
      color: #ff8c1a;
    }
    .srm-opcode-card .srm-opcode-lock.locked {
      background: rgba(255, 140, 26, 0.15);
      border-color: #ff8c1a;
      color: #ff8c1a;
    }
    .srm-opcode-card .srm-opcode-lock.locked:hover {
      background: rgba(231, 76, 60, 0.15);
      border-color: #ff6b6b;
      color: #ff6b6b;
    }

    .srm-toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      z-index: 100000;
      padding: 12px 24px;
      border-radius: 12px;
      background: rgba(20, 20, 40, 0.9);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: #e8e8e8;
      font-family: -apple-system, 'PingFang SC', sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
      opacity: 0;
      transition: all .4s cubic-bezier(.34, 1.56, .64, 1);
      pointer-events: none;
      max-width: 80%;
    }
    .srm-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .srm-toast.success { border-color: rgba(46, 204, 113, 0.3); }
    .srm-toast.error { border-color: rgba(231, 76, 60, 0.3); }

    @keyframes srm-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes srm-scale-in {
      from { opacity: 0; transform: scale(.92) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .srm-audit-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .srm-audit-row label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      min-width: 40px;
    }
    .srm-audit-row input[type=number] {
      flex: 1;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 4px 8px;
      color: #e8e8e8;
      font-size: 12px;
      outline: none;
      transition: all .2s;
      min-width: 0;
    }
    .srm-audit-row input[type=number]:focus {
      border-color: #ff8c1a;
      box-shadow: 0 0 15px rgba(255, 140, 26, 0.08);
    }
    .srm-lock-btn {
      width: 30px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all .2s;
      flex-shrink: 0;
    }
    .srm-lock-btn:hover { background: rgba(255, 255, 255, 0.1); }
    .srm-lock-btn.locked {
      background: rgba(255, 209, 102, 0.2);
      border-color: #ffd166;
      color: #ffd166;
    }
    .srm-audit-switch {
      width: 40px;
      height: 20px;
      border-radius: 10px;
      background: #444;
      position: relative;
      cursor: pointer;
      transition: background .2s;
      flex-shrink: 0;
    }
    .srm-audit-switch.on { background: #3a7bd5; }
    .srm-audit-switch::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      transition: left .2s;
    }
    .srm-audit-switch.on::after { left: 22px; }

    .srm-clone-wrap {
      border: 1px dashed rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px;
      margin-top: 8px;
    }
    .srm-clone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      color: #ffb454;
      font-size: 12px;
      user-select: none;
    }
    .srm-clone-list {
      margin-top: 6px;
      display: none;
      flex-direction: column;
      gap: 4px;
    }
    .srm-clone-list.open { display: flex; }
    .srm-clone-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 12px;
    }
    .srm-clone-item:hover { background: rgba(255, 255, 255, 0.05); }
    .srm-clone-item.active { background: rgba(0, 210, 255, 0.18); }
  `;

  let currentView = "list";
  let currentSpriteData = null;
  let currentTab = "sprites";
  let currentFileNameMode = "assetId";
  let currentExtDetail = null;
  let floatBtn = null;
  let windowEl = null;
  let toastEl = null;
  let isOpen = false;
  let isUIRendered = false;
  let renderLock = false;
  let collapsedGroups = new Set();

  let selectedName = null;
  let selectedClone = null;
  let cloneExpanded = false;

  function createToast() {
    if (toastEl) return;
    toastEl = document.createElement("div");
    toastEl.className = "srm-toast";
    document.body.appendChild(toastEl);
  }

  function showToast(message, type = "success", duration = 2000) {
    createToast();
    const icon = type === "success" ? "✓" : "✕";
    toastEl.innerHTML = `<span style="color:${type === 'success' ? '#2ecc71' : '#ff6b6b'}">${icon}</span> ${message}`;
    toastEl.className = `srm-toast ${type}`;
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
    if (isUIRendered) return;
    isUIRendered = true;

    initStyles();

    if (!floatBtn || !document.body.contains(floatBtn)) {
      if (floatBtn && document.body.contains(floatBtn)) floatBtn.remove();
      floatBtn = document.createElement("button");
      floatBtn.className = "srm-float-btn";
      floatBtn.innerHTML = `<img src="${ICON_DATA_URL}" alt="角色管理器Pro">`;
      floatBtn.title = "角色管理器Pro";
      floatBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (floatBtn._justDragged) {
          floatBtn._justDragged = false;
          return;
        }
        toggleUI();
      });
      document.body.appendChild(floatBtn);
      makeDraggable(floatBtn);
    }

    if (!windowEl || !document.body.contains(windowEl)) {
      if (windowEl && document.body.contains(windowEl)) windowEl.remove();
      windowEl = document.createElement("div");
      windowEl.className = "srm-window";
      document.body.appendChild(windowEl);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closeUI();
    });
  }

  function makeDraggable(el) {
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, startLeft, startTop;
    const DRAG_THRESHOLD = 4;

    const onStart = (e) => {
      if (e.type === "mousedown" && e.button !== 0) return;
      const touch = e.touches ? e.touches[0] : e;
      isDragging = true;
      hasMoved = false;
      startX = touch.clientX;
      startY = touch.clientY;
      const rect = el.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!hasMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      hasMoved = true;

      let left = startLeft + dx;
      let top = startTop + dy;
      left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, left));
      top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, top));
      el.style.left = left + "px";
      el.style.top = top + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";

      if (e.cancelable) e.preventDefault();
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      if (hasMoved) {
        el._justDragged = true;
        setTimeout(() => { el._justDragged = false; }, 200);
      }
    };

    el.addEventListener("mousedown", onStart);
    el.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
  }

  function makeWindowDraggable(handle) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const onStart = (e) => {
      if (e.target.closest("button, select, input, .srm-back-btn, .srm-close-btn, .srm-filename-select")) return;
      if (e.type === "mousedown" && e.button !== 0) return;
      const touch = e.touches ? e.touches[0] : e;
      isDragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      const rect = windowEl.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      let left = startLeft + dx;
      let top = startTop + dy;
      left = Math.max(0, Math.min(window.innerWidth - windowEl.offsetWidth, left));
      top = Math.max(0, Math.min(window.innerHeight - windowEl.offsetHeight, top));
      windowEl.style.left = left + "px";
      windowEl.style.top = top + "px";
      windowEl.style.right = "auto";
      windowEl.style.bottom = "auto";

      if (e.cancelable) e.preventDefault();
    };

    const onEnd = () => {
      isDragging = false;
    };

    handle.addEventListener("mousedown", onStart);
    handle.addEventListener("touchstart", onStart, { passive: true });
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
          vm = v;
          patchVMForExport(v);
          patchRuntimeForBroadcastIntercept(v);
          patchRuntimeForExtensionIntercept(v);
          openUI();
        } else {
          showToast("无法获取VM实例", "error");
        }
      });
      return;
    }

    if (!isUIRendered || !floatBtn || !document.body.contains(floatBtn)) {
      isUIRendered = false;
      createUI();
    }

    isOpen = true;
    windowEl.classList.add("open");
    currentView = "list";
    currentTab = "sprites";
    renderMain();
  }

  function closeUI() {
    isOpen = false;
    if (windowEl) windowEl.classList.remove("open");
  }

  function goBack() {
    currentView = "list";
    currentTab = "sprites";
    currentExtDetail = null;
    renderMain();
  }

  function switchTab(tab) {
    currentTab = tab;
    if (tab === "stage") {
      currentView = "detail";
      currentSpriteData = getStage(currentVm);
      if (!currentSpriteData) {
        showToast("无法获取舞台数据", "error");
        currentTab = "sprites";
        currentView = "list";
        renderMain();
        return;
      }
      renderDetail();
    } else if (tab === "audit") {
      currentView = "audit";
      renderAudit();
    } else if (tab === "extensions") {
      currentView = "extensions";
      renderExtensions();
    } else {
      currentView = "list";
      renderMain();
    }
  }

  function toggleGroup(targetId) {
    if (collapsedGroups.has(targetId)) {
      collapsedGroups.delete(targetId);
    } else {
      collapsedGroups.add(targetId);
    }
    renderMain();
  }

  function renderMain() {
    if (renderLock || !windowEl) return;
    renderLock = true;

    try {
      if (currentVm) revalidateLocks(currentVm);

      const sprites = getSprites(currentVm);
      const groups = getVariablesGrouped(currentVm);

      let html = `
        <div class="srm-window-header" id="srm-window-header">
          <h3 class="srm-title">角色管理器Pro</h3>
          <button class="srm-close-btn" id="srm-close-btn">✕</button>
        </div>
        <div class="srm-window-body">
          <div class="srm-tabs">
            <button class="srm-tab ${currentTab === 'sprites' ? 'active' : ''}" data-tab="sprites">角色</button>
            <button class="srm-tab ${currentTab === 'stage' ? 'active' : ''}" data-tab="stage">舞台</button>
            <button class="srm-tab ${currentTab === 'variables' ? 'active' : ''}" data-tab="variables">变量与消息</button>
            <button class="srm-tab ${currentTab === 'extensions' ? 'active' : ''}" data-tab="extensions">扩展</button>
            <button class="srm-tab ${currentTab === 'audit' ? 'active' : ''}" data-tab="audit">审计</button>
          </div>
      `;

      if (currentTab === "sprites") {
        html += renderSpriteListHTML(sprites);
      } else if (currentTab === "variables") {
        html += renderVariableGroupsHTML(groups);
      }

      html += `</div>`;

      windowEl.innerHTML = html;

      const header = windowEl.querySelector("#srm-window-header");
      if (header) makeWindowDraggable(header);

      const closeBtn = windowEl.querySelector("#srm-close-btn");
      if (closeBtn) closeBtn.addEventListener("click", closeUI);

      const tabs = windowEl.querySelectorAll(".srm-tab");
      tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          switchTab(tab.dataset.tab);
        });
      });

      if (currentTab === "sprites") {
        bindSpriteEvents(windowEl, sprites);
      } else if (currentTab === "variables") {
        bindVariableEvents(windowEl);
      }
    } finally {
      renderLock = false;
    }
  }

  function renderSpriteListHTML(sprites) {
    let html = `<div class="srm-sprite-grid">`;

    html += `
      <div class="srm-sprite-card srm-add-card" id="srm-add-sprite-btn">
        <div class="srm-add-icon">＋</div>
        <div class="srm-add-label">插入角色</div>
      </div>
    `;

    for (let i = 0; i < sprites.length; i++) {
      const s = sprites[i];
      const preview = s.costumePreview || '';
      html += `
        <div class="srm-sprite-card" data-index="${i}">
          <img src="${preview}" alt="${s.name}" loading="lazy"
               onerror="this.src='data:image/svg+xml,%253Csvg xmlns=%2522http://www.w3.org/2000/svg%2522 width=%252280%2522 height=%252280%2522%253E%253Crect width=%252280%2522 height=%252280%2522 fill=%2522rgba(255,255,255,0.05)%2522/%253E%253Ctext x=%252240%2522 y=%252248%2522 text-anchor=%2522middle%2522 fill=%2522rgba(255,255,255,0.2)%2522 font-size=%252230%2522%253E?%253C/text%253E%253C/svg%253E'">
          <div class="srm-name">${s.name}</div>
          <div class="srm-badge">
            <span>🖼${s.costumeCount}</span>
            <span>🔊${s.soundCount}</span>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  function bindSpriteEvents(container, sprites) {
    const addBtn = container.querySelector("#srm-add-sprite-btn");
    if (addBtn) {
      addBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const success = await insertSprite(currentVm);
        if (success) {
          renderMain();
        }
      });
    }

    const cards = container.querySelectorAll(".srm-sprite-card:not(.srm-add-card)");
    cards.forEach(card => {
      const idx = parseInt(card.dataset.index);
      card.addEventListener("click", () => {
        if (sprites[idx]) {
          currentSpriteData = sprites[idx];
          currentView = "detail";
          renderDetail();
        }
      });
    });
  }

  function renderVariableGroupsHTML(groups) {
    if (!groups || groups.length === 0) {
      return `
        <div class="srm-empty">
          <span class="srm-empty-icon"> ? </span>
          暂无变量
        </div>
      `;
    }

    let html = `<div class="srm-section">`;

    for (const group of groups) {
      const isCollapsed = collapsedGroups.has(group.targetId);
      const realVarCount = group.variables.filter(v => !v.isBroadcast).length;
      const broadcastCount = group.variables.filter(v => v.isBroadcast).length;
      const totalCount = group.variables.length;
      const stageLabel = group.isStage ? '舞台' : group.targetName;

      let countLabel;
      if (totalCount === 0) {
        countLabel = '无内容';
      } else if (realVarCount === 0 && broadcastCount > 0) {
        countLabel = '仅消息';
      } else {
        countLabel = `${realVarCount} 个项目`;
      }

      html += `
        <div class="srm-var-group" data-target-id="${group.targetId}">
          <div class="srm-var-group-header" data-target-id="${group.targetId}">
            <span class="srm-group-caret ${isCollapsed ? '' : 'open'}">▶</span>
            <span class="srm-group-name">${stageLabel}</span>
            <span class="srm-group-badge ${group.isStage ? 'stage' : ''}">${group.isStage ? '舞台' : '角色'}</span>
            <span class="srm-group-count">${countLabel}</span>
          </div>
          <div class="srm-var-group-body ${isCollapsed ? 'collapsed' : ''}">
      `;

      if (totalCount === 0) {
        html += `<div class="srm-empty" style="padding:14px 0;">该角色没有变量或消息</div>`;
      }

      for (const v of group.variables) {
        if (v.isBroadcast) {
          const escapedName = String(v.name).replace(/"/g, '&quot;');
          const interceptLocked = isBroadcastInterceptLocked(v.name);
          html += `
            <div class="srm-var-item broadcast-item" data-var-id="${v.id}">
              <span class="srm-var-name" title="${escapedName}">${v.name}</span>
              <span class="srm-var-type broadcast">消息</span>
              <button class="srm-var-trigger" data-broadcast-name="${escapedName}" title="${interceptLocked ? '该广播已被拦截锁定' : '触发此广播'}" ${interceptLocked ? 'disabled' : ''}>触发</button>
              <button class="srm-var-intercept ${interceptLocked ? 'locked' : ''}" data-broadcast-name="${escapedName}" title="${interceptLocked ? '点击解除拦截' : '点击拦截该广播（所有积木都无法触发）'}">
                ${interceptLocked ? '🔒' : '🔓'}
              </button>
            </div>
          `;
          continue;
        }

        const isLocked = variableLocks.has(v.id);
        let typeClass, typeLabel;
        if (v.isCloud && v.isList) {
          typeClass = 'cloudlist';
          typeLabel = '云列表';
        } else if (v.isCloud) {
          typeClass = 'cloud';
          typeLabel = '云变量';
        } else if (v.isList) {
          typeClass = 'list';
          typeLabel = '列表';
        } else {
          typeClass = 'normal';
          typeLabel = '变量';
        }
        const displayVal = v.isList ? JSON.stringify(v.value) : String(v.value);
        const lockedClass = isLocked ? 'locked-item' : '';

        html += `
          <div class="srm-var-item ${lockedClass}" data-var-id="${v.id}">
            <span class="srm-var-name" title="${v.name}">${v.name}</span>
            <span class="srm-var-type ${typeClass}">${typeLabel}</span>
            <input class="srm-var-edit" type="text" value="${displayVal.replace(/"/g, '&quot;')}"
                   placeholder="${v.isList ? '列表值' : '变量值'}"
                   data-var-id="${v.id}" data-target-id="${v.targetId}" data-is-list="${v.isList}">
            <button class="srm-var-btn" data-var-id="${v.id}" data-target-id="${v.targetId}" data-is-list="${v.isList}">
              更新
            </button>
            <button class="srm-var-lock ${isLocked ? 'locked' : ''}" data-var-id="${v.id}" data-target-id="${v.targetId}" title="${isLocked ? '点击解锁' : '点击锁定'}">
              ${isLocked ? '🔒' : '🔓'}
            </button>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  function bindVariableEvents(container) {
    const groupHeaders = container.querySelectorAll(".srm-var-group-header");
    groupHeaders.forEach(header => {
      header.addEventListener("click", () => {
        const targetId = header.dataset.targetId;
        toggleGroup(targetId);
      });
    });

    const triggerBtns = container.querySelectorAll(".srm-var-trigger");
    triggerBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = btn.dataset.broadcastName;
        if (!name) return;
        if (isBroadcastInterceptLocked(name)) {
          showToast(`广播 "${name}" 已被拦截锁定，无法触发`, "error");
          return;
        }
        triggerBroadcast(currentVm, name);
      });
    });

    const interceptBtns = container.querySelectorAll(".srm-var-intercept");
    interceptBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = btn.dataset.broadcastName;
        if (!name) return;
        toggleBroadcastInterceptLock(name);
        const locked = isBroadcastInterceptLocked(name);
        btn.classList.toggle("locked", locked);
        btn.textContent = locked ? "🔒" : "🔓";
        btn.title = locked ? "点击解除拦截" : "点击拦截该广播（所有积木都无法触发）";
        const row = btn.closest(".srm-var-item");
        if (row) {
          const triggerBtn = row.querySelector(".srm-var-trigger");
          if (triggerBtn) {
            triggerBtn.disabled = locked;
            triggerBtn.title = locked ? "该广播已被拦截锁定" : "触发此广播";
          }
        }
      });
    });

    const updateBtns = container.querySelectorAll(".srm-var-btn");
    updateBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const varId = btn.dataset.varId;
        const targetId = btn.dataset.targetId;
        const isList = btn.dataset.isList === 'true';
        const input = btn.parentElement.querySelector(".srm-var-edit");
        if (!input) return;

        const rawValue = input.value;
        let value;
        if (isList) {
          try {
            value = JSON.parse(rawValue);
            if (!Array.isArray(value)) {
              showToast("列表值必须是JSON数组格式，如 [1,2,3]", "error");
              return;
            }
          } catch (e) {
            showToast("列表值必须是JSON数组格式，如 [1,2,3]", "error");
            return;
          }
        } else {
          if (rawValue === 'true') value = true;
          else if (rawValue === 'false') value = false;
          else if (rawValue === 'null') value = null;
          else if (rawValue === '') value = '';
          else if (!isNaN(rawValue) && rawValue.trim() !== '') value = Number(rawValue);
          else value = rawValue;
        }

        if (setVariable(currentVm, targetId, varId, value)) {
          if (variableLocks.has(varId)) {
            showToast("变量已更新 (锁定值同步更新)");
          } else {
            showToast("变量已更新");
          }
          setTimeout(() => renderMain(), 0);
        } else {
          showToast("更新变量失败", "error");
        }
      });
    });

    const inputs = container.querySelectorAll(".srm-var-edit");
    inputs.forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const btn = input.parentElement.querySelector(".srm-var-btn");
          if (btn) btn.click();
        }
      });
    });

    const lockBtns = container.querySelectorAll(".srm-var-lock");
    lockBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const varId = btn.dataset.varId;
        const targetId = btn.dataset.targetId;

        const input = btn.parentElement.querySelector(".srm-var-edit");
        let lockValue;
        if (input) {
          const isList = input.dataset.isList === 'true';
          if (isList) {
            try {
              lockValue = JSON.parse(input.value);
            } catch {
              lockValue = [];
            }
          } else {
            const raw = input.value;
            if (raw === 'true') lockValue = true;
            else if (raw === 'false') lockValue = false;
            else if (raw === 'null') lockValue = null;
            else if (raw === '') lockValue = '';
            else if (!isNaN(raw) && raw.trim() !== '') lockValue = Number(raw);
            else lockValue = raw;
          }
        } else {
          lockValue = getVariableValue(currentVm, targetId, varId);
        }

        if (variableLocks.has(varId)) {
          unlockVariable(varId);
          btn.classList.remove("locked");
          btn.textContent = "🔓";
          btn.title = "点击锁定";
          const row = btn.closest(".srm-var-item");
          if (row) row.classList.remove("locked-item");
          setTimeout(() => renderMain(), 0);
        } else {
          if (lockVariable(currentVm, varId, targetId, lockValue)) {
            btn.classList.add("locked");
            btn.textContent = "🔒";
            btn.title = "点击解锁";
            const row = btn.closest(".srm-var-item");
            if (row) row.classList.add("locked-item");
            setTimeout(() => renderMain(), 0);
          }
        }
      });
    });
  }

  function renderExtensions() {
    if (renderLock || !windowEl) return;
    renderLock = true;

    try {
      const extensions = getLoadedExtensions(currentVm);

      let html = `
        <div class="srm-window-header" id="srm-window-header">
          <h3 class="srm-title">扩展拦截</h3>
          <button class="srm-close-btn" id="srm-close-btn">✕</button>
        </div>
        <div class="srm-window-body">
          <div class="srm-tabs">
            <button class="srm-tab ${currentTab === 'sprites' ? 'active' : ''}" data-tab="sprites">角色</button>
            <button class="srm-tab ${currentTab === 'stage' ? 'active' : ''}" data-tab="stage">舞台</button>
            <button class="srm-tab ${currentTab === 'variables' ? 'active' : ''}" data-tab="variables">变量与消息</button>
            <button class="srm-tab ${currentTab === 'extensions' ? 'active' : ''}" data-tab="extensions">扩展</button>
            <button class="srm-tab ${currentTab === 'audit' ? 'active' : ''}" data-tab="audit">审计</button>
          </div>
      `;

      if (extensions.length === 0) {
        html += `
          <div class="srm-empty">
            <span class="srm-empty-icon">🧩</span>
            暂无扩展
          </div>
        `;
      } else {
        html += `<div class="srm-section-title">已加载扩展 <span>(${extensions.length})</span></div>`;
        html += `<div class="srm-ext-card-grid">`;
        for (const ext of extensions) {
          const allLockedClass = ext.allLocked ? "all-locked" : "";
          html += `
            <div class="srm-ext-card ${allLockedClass}" data-prefix="${ext.prefix}">
              <div class="srm-ext-name">${ext.name}</div>
              <div class="srm-ext-meta">
                <span>${ext.totalCount} 个 opcode</span>
                ${ext.lockedCount > 0 ? `<span class="srm-ext-lock-badge">已锁 ${ext.lockedCount}</span>` : ''}
                ${ext.allLocked ? `<span class="srm-ext-lock-badge">全锁</span>` : ''}
              </div>
            </div>
          `;
        }
        html += `</div>`;
      }

      html += `</div>`;

      windowEl.innerHTML = html;

      const header = windowEl.querySelector("#srm-window-header");
      if (header) makeWindowDraggable(header);

      const closeBtn = windowEl.querySelector("#srm-close-btn");
      if (closeBtn) closeBtn.addEventListener("click", closeUI);

      const tabs = windowEl.querySelectorAll(".srm-tab");
      tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          switchTab(tab.dataset.tab);
        });
      });

      const cards = windowEl.querySelectorAll(".srm-ext-card");
      cards.forEach(card => {
        card.addEventListener("click", () => {
          const prefix = card.dataset.prefix;
          const ext = getLoadedExtensions(currentVm).find(e => e.prefix === prefix);
          if (ext) {
            currentExtDetail = ext;
            currentView = "extensionDetail";
            renderExtensionDetail();
          }
        });
      });
    } finally {
      renderLock = false;
    }
  }

  function renderExtensionDetail() {
    if (renderLock || !windowEl || !currentExtDetail) return;
    renderLock = true;

    try {
      const ext = getLoadedExtensions(currentVm).find(e => e.prefix === currentExtDetail.prefix);
      if (!ext) {
        goBack();
        return;
      }
      currentExtDetail = ext;

      let html = `
        <div class="srm-window-header" id="srm-window-header">
          <button class="srm-back-btn" id="srm-back-btn">‹</button>
          <h3 class="srm-title">${ext.name}</h3>
          <button class="srm-close-btn" id="srm-close-btn">✕</button>
        </div>
        <div class="srm-window-body">
          <div class="srm-section-title">OPCODE 列表 <span>(${ext.totalCount})</span></div>
          <div class="srm-opcode-card-grid" id="srm-opcode-grid">
      `;

      for (const op of ext.opcodes) {
        const locked = isExtensionInterceptLocked(op);
        const displayName = getOpcodeDisplayName(currentVm, op);
        html += `
          <div class="srm-opcode-card ${locked ? 'locked' : ''}" data-opcode="${op}">
            <span class="srm-opcode-name" title="${displayName}">${displayName}</span>
            <button class="srm-opcode-lock ${locked ? 'locked' : ''}" data-opcode="${op}" title="${locked ? '点击解锁' : '点击拦截'}">
              ${locked ? '🔒' : '🔓'}
            </button>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;

      windowEl.innerHTML = html;

      const header = windowEl.querySelector("#srm-window-header");
      if (header) makeWindowDraggable(header);

      const closeBtn = windowEl.querySelector("#srm-close-btn");
      if (closeBtn) closeBtn.addEventListener("click", closeUI);

      const backBtn = windowEl.querySelector("#srm-back-btn");
      if (backBtn) backBtn.addEventListener("click", () => {
        currentView = "extensions";
        renderExtensions();
      });

      const lockBtns = windowEl.querySelectorAll(".srm-opcode-lock");
      lockBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const op = btn.dataset.opcode;
          toggleExtensionInterceptLock(op);
          renderExtensionDetail();
        });
      });

      const opCards = windowEl.querySelectorAll(".srm-opcode-card");
      opCards.forEach(card => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".srm-opcode-lock")) return;
          const op = card.dataset.opcode;
          toggleExtensionInterceptLock(op);
          renderExtensionDetail();
        });
      });
    } finally {
      renderLock = false;
    }
  }

  function renderDetail() {
    if (renderLock || !windowEl || !currentSpriteData) return;
    renderLock = true;

    try {
      const { sprite, name, id, costumeCount, soundCount, costumePreview, isStage } = currentSpriteData;

      let html = `
        <div class="srm-window-header" id="srm-window-header">
          <button class="srm-back-btn" id="srm-back-btn">‹</button>
          <h3 class="srm-title">角色详情</h3>
          <select id="srm-filename-mode" class="srm-filename-select">
            <option value="assetId" ${currentFileNameMode === 'assetId' ? 'selected' : ''}>assetId</option>
            <option value="name" ${currentFileNameMode === 'name' ? 'selected' : ''}>name</option>
            <option value="md5ext" ${currentFileNameMode === 'md5ext' ? 'selected' : ''}>md5ext</option>
          </select>
          <button class="srm-close-btn" id="srm-close-btn">✕</button>
        </div>
        <div class="srm-window-body">
          <div class="srm-detail-profile">
            <img src="${costumePreview || ''}" alt="${name}" loading="lazy"
                 onerror="this.src='data:image/svg+xml,%253Csvg xmlns=%2522http://www.w3.org/2000/svg%2522 width=%252264%2522 height=%252264%2522%253E%253Crect width=%252264%2522 height=%252264%2522 fill=%2522rgba(255,255,255,0.05)%2522/%253E%253Ctext x=%252232%2522 y=%252240%2522 text-anchor=%2522middle%2522 fill=%2522rgba(255,255,255,0.2)%2522 font-size=%252228%2522%253E?%253C/text%253E%253C/svg%253E'">
            <div class="srm-info">
              <p class="srm-name">${name}</p>
              <p class="srm-meta">ID: ${id.slice(0, 8)} · 克隆体: ${currentSpriteData.clones?.length || 1}</p>
            </div>
            <div class="srm-actions">
              <button class="srm-btn-export" id="srm-export-btn">导出</button>
              ${!isStage ? `
                <button class="srm-btn-rename" id="srm-rename-btn">重命名</button>
                <button class="srm-btn-delete" id="srm-delete-btn">删除</button>
              ` : ''}
            </div>
          </div>

          <div class="srm-section">
            <div class="srm-section-title">造型 <span>(${costumeCount})</span></div>
            <div class="srm-item-list" id="srm-costume-list">
      `;

      if (costumeCount === 0) {
        html += `<div class="srm-empty">无造型</div>`;
      } else {
        const costumes = sprite.costumes || [];
        for (let i = 0; i < costumes.length; i++) {
          const c = costumes[i];
          const isCurrent = i === sprite.currentCostume;
          html += `
            <div class="srm-item">
              <span class="srm-item-idx">#${i + 1}</span>
              <span class="srm-item-name">${c.name || '未命名'}</span>
              ${isCurrent ? '<span class="srm-item-current">当前</span>' : ''}
              <button class="srm-item-export" data-type="costume" data-index="${i}" title="导出造型">⬇</button>
              <button class="srm-item-del" data-type="costume" data-index="${i}">✕</button>
            </div>
          `;
        }
      }

      html += `
            </div>
          </div>

          <div class="srm-section">
            <div class="srm-section-title">声音 <span>(${soundCount})</span></div>
            <div class="srm-item-list" id="srm-sound-list">
      `;

      if (soundCount === 0) {
        html += `<div class="srm-empty">无声音</div>`;
      } else {
        const sounds = sprite.sounds || [];
        for (let i = 0; i < sounds.length; i++) {
          const s = sounds[i];
          html += `
            <div class="srm-item">
              <span class="srm-item-idx">#${i + 1}</span>
              <span class="srm-item-name">${s.name || '未命名'}</span>
              <button class="srm-item-export" data-type="sound" data-index="${i}" title="导出声音">⬇</button>
              <button class="srm-item-del" data-type="sound" data-index="${i}">✕</button>
            </div>
          `;
        }
      }

      html += `
            </div>
          </div>
        </div>
      `;

      windowEl.innerHTML = html;

      const header = windowEl.querySelector("#srm-window-header");
      if (header) makeWindowDraggable(header);

      const closeBtn = windowEl.querySelector("#srm-close-btn");
      if (closeBtn) closeBtn.addEventListener("click", closeUI);

      const backBtn = windowEl.querySelector("#srm-back-btn");
      if (backBtn) backBtn.addEventListener("click", goBack);

      const fileNameSelect = windowEl.querySelector("#srm-filename-mode");
      if (fileNameSelect) {
        fileNameSelect.addEventListener("change", (e) => {
          currentFileNameMode = e.target.value;
        });
      }

      const exportBtn = windowEl.querySelector("#srm-export-btn");
      if (exportBtn) {
        exportBtn.addEventListener("click", async () => {
          patchVMForExport(currentVm);
          if (!JSZip) {
            showToast("JSZip 库未加载，请检查网络或刷新重试", "error");
            return;
          }
          await exportSpriteAsFile(currentVm, id, name);
        });
      }

      const renameBtn = windowEl.querySelector("#srm-rename-btn");
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

      const deleteBtn = windowEl.querySelector("#srm-delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          const cloneCount = currentSpriteData.clones?.length || 1;
          const msg = cloneCount > 1
            ? `角色 "${name}" 有 ${cloneCount} 个克隆体，确定要删除吗？`
            : `确定要删除角色 "${name}" 吗？此操作不可撤销！`;
          if (confirm(msg)) {
            if (deleteSprite(currentVm, id)) {
              showToast(`已删除角色 "${name}"`);
              goBack();
            } else {
              showToast("删除失败", "error");
            }
          }
        });
      }

      const costumeList = windowEl.querySelector("#srm-costume-list");
      if (costumeList) {
        costumeList.addEventListener("click", (e) => {
          const exportBtn = e.target.closest('.srm-item-export[data-type="costume"]');
          if (exportBtn) {
            e.stopPropagation();
            const idx = parseInt(exportBtn.dataset.index);
            const costume = sprite.costumes?.[idx];
            if (costume) {
              exportAsset(costume, "costume");
            } else {
              showToast("无法获取素材数据", "error");
            }
            return;
          }
          const delBtn = e.target.closest('.srm-item-del[data-type="costume"]');
          if (delBtn) {
            e.stopPropagation();
            const idx = parseInt(delBtn.dataset.index);
            const costume = sprite.costumes?.[idx];
            if (costume && confirm(`确定要删除造型 "${costume.name}" 吗？`)) {
              if (deleteCostume(sprite, idx)) {
                showToast(`已删除造型 "${costume.name}"`);
                renderDetail();
              } else {
                showToast("删除失败", "error");
              }
            }
          }
        });
      }

      const soundList = windowEl.querySelector("#srm-sound-list");
      if (soundList) {
        soundList.addEventListener("click", (e) => {
          const exportBtn = e.target.closest('.srm-item-export[data-type="sound"]');
          if (exportBtn) {
            e.stopPropagation();
            const idx = parseInt(exportBtn.dataset.index);
            const sound = sprite.sounds?.[idx];
            if (sound) {
              exportAsset(sound, "sound");
            } else {
              showToast("无法获取素材数据", "error");
            }
            return;
          }
          const delBtn = e.target.closest('.srm-item-del[data-type="sound"]');
          if (delBtn) {
            e.stopPropagation();
            const idx = parseInt(delBtn.dataset.index);
            const sound = sprite.sounds?.[idx];
            if (sound && confirm(`确定要删除声音 "${sound.name}" 吗？`)) {
              if (deleteSound(sprite, idx)) {
                showToast(`已删除声音 "${sound.name}"`);
                renderDetail();
              } else {
                showToast("删除失败", "error");
              }
            }
          }
        });
      }
    } finally {
      renderLock = false;
    }
  }

  function renderAudit() {
    if (renderLock || !windowEl) return;
    renderLock = true;

    try {
      const sprites = getSprites(currentVm);

      let html = `
        <div class="srm-window-header" id="srm-window-header">
          <button class="srm-back-btn" id="srm-back-btn">‹</button>
          <h3 class="srm-title">角色审计</h3>
          <button class="srm-close-btn" id="srm-close-btn">✕</button>
        </div>
        <div class="srm-window-body">
          <div class="srm-section">
            <div class="srm-section-title">选择角色</div>
            <div class="srm-sprite-grid" id="srm-audit-grid" style="grid-template-columns:repeat(auto-fill,minmax(80px,1fr));">
      `;

      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i];
        html += `
          <div class="srm-sprite-card" data-audit-index="${i}" style="padding:8px 4px 6px;">
            <img src="${s.costumePreview || ''}" alt="${s.name}" style="border-radius:8px;">
            <div class="srm-name" style="font-size:11px;">${s.name}</div>
          </div>
        `;
      }

      html += `
            </div>
          </div>

          <div id="srm-audit-editor" style="display:none; flex-direction:column; gap:8px;">
            <div class="srm-section-title" id="srm-audit-name">未选中角色</div>

            <div class="srm-audit-row">
              <label>x</label><input type="number" id="srm-audit-x" step="1" />
              <button class="srm-lock-btn" data-prop="x">🔓</button>
            </div>
            <div class="srm-audit-row">
              <label>y</label><input type="number" id="srm-audit-y" step="1" />
              <button class="srm-lock-btn" data-prop="y">🔓</button>
            </div>
            <div class="srm-audit-row">
              <label>大小</label><input type="number" id="srm-audit-size" step="1" />
              <button class="srm-lock-btn" data-prop="size">🔓</button>
            </div>
            <div class="srm-audit-row">
              <label>方向</label><input type="number" id="srm-audit-dir" step="1" />
              <button class="srm-lock-btn" data-prop="direction">🔓</button>
            </div>
            <div class="srm-audit-row">
              <label>层级</label><input type="number" id="srm-audit-layer" step="1" />
              <button class="srm-lock-btn" data-prop="layer">🔓</button>
            </div>
            <div class="srm-audit-row">
              <label>可见</label>
              <div class="srm-audit-switch" id="srm-audit-visible-switch"></div>
              <span id="srm-audit-visible-text" style="font-size:12px;color:rgba(255,255,255,0.6)">显示</span>
              <button class="srm-lock-btn" data-prop="visible">🔓</button>
            </div>

            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
              <button class="srm-btn-rename" id="srm-audit-apply" style="padding:6px 14px;border-radius:8px;font-size:12px;">应用</button>
              <button class="srm-btn-rename" id="srm-audit-refresh" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">刷新</button>
              <button class="srm-btn-delete" id="srm-audit-unlock-all" style="padding:6px 14px;border-radius:8px;font-size:12px;">解锁全部</button>
            </div>

            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="srm-btn-rename" id="srm-audit-front" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">置顶</button>
              <button class="srm-btn-rename" id="srm-audit-back" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">置底</button>
              <button class="srm-btn-rename" id="srm-audit-fwd" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">上移</button>
              <button class="srm-btn-rename" id="srm-audit-bwd" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">下移</button>
            </div>

            <div class="srm-clone-wrap">
              <div class="srm-clone-header" id="srm-audit-clone-header">
                <span>克隆体 <span id="srm-audit-clone-count">(0)</span></span>
                <span id="srm-audit-clone-toggle">展开</span>
              </div>
              <div class="srm-clone-list" id="srm-audit-clone-list"></div>
            </div>

            <div class="srm-hint" style="color:rgba(255,255,255,0.3);font-size:11px;">
              提示: x/y/大小/方向/层级 修改后点“应用”生效；可见性开关点击即时生效。
            </div>
          </div>
        </div>
      `;

      windowEl.innerHTML = html;

      const header = windowEl.querySelector("#srm-window-header");
      if (header) makeWindowDraggable(header);

      const closeBtn = windowEl.querySelector("#srm-close-btn");
      if (closeBtn) closeBtn.addEventListener("click", closeUI);

      const backBtn = windowEl.querySelector("#srm-back-btn");
      if (backBtn) backBtn.addEventListener("click", goBack);

      const cards = windowEl.querySelectorAll(".srm-sprite-card[data-audit-index]");
      cards.forEach(card => {
        card.addEventListener("click", () => {
          const idx = parseInt(card.dataset.auditIndex);
          if (sprites[idx]) {
            selectedName = sprites[idx].name;
            selectedClone = null;
            fillAuditEditor(sprites[idx].target);
            renderClonesForAudit(sprites[idx].target);
            cards.forEach(c => c.style.borderColor = 'rgba(255,255,255,0.06)');
            card.style.borderColor = '#ff8c1a';
          }
        });
      });

      const lockBtns = windowEl.querySelectorAll(".srm-lock-btn");
      lockBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
          if (!target) return;
          const prop = btn.dataset.prop;
          if (isLocked(target, prop)) {
            clearLock(target, prop);
          } else {
            let value;
            if (prop === "visible") value = !!target.visible;
            else {
              const inputMap = {
                x: "#srm-audit-x", y: "#srm-audit-y", size: "#srm-audit-size",
                direction: "#srm-audit-dir", layer: "#srm-audit-layer"
              };
              const input = windowEl.querySelector(inputMap[prop]);
              value = input ? Number(input.value) : readProp(target, prop);
              if (Number.isNaN(value)) value = readProp(target, prop);
            }
            setLock(target, prop, value);
          }
          syncAuditLockButtons(target);
        });
      });

      const applyBtn = windowEl.querySelector("#srm-audit-apply");
      if (applyBtn) {
        applyBtn.addEventListener("click", () => {
          const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
          if (!target) return;
          const x = Number(windowEl.querySelector("#srm-audit-x").value);
          const y = Number(windowEl.querySelector("#srm-audit-y").value);
          const size = Number(windowEl.querySelector("#srm-audit-size").value);
          const dir = Number(windowEl.querySelector("#srm-audit-dir").value);
          const layerVal = windowEl.querySelector("#srm-audit-layer").value;
          const layer = layerVal === "" ? null : Number(layerVal);

          if (!Number.isNaN(x) && !Number.isNaN(y)) setPosition(currentVm, target, x, y);
          if (!Number.isNaN(size)) setSize(currentVm, target, size);
          if (!Number.isNaN(dir)) setDirection(currentVm, target, dir);
          if (layer !== null && !Number.isNaN(layer)) setLayerOrder(currentVm, target, layer);
          requestRedraw(currentVm);
          syncAuditLockButtons(target);
          if (!selectedClone && selectedName) renderClonesForAudit(target);
        });
      }

      const visibleSwitch = windowEl.querySelector("#srm-audit-visible-switch");
      if (visibleSwitch) {
        visibleSwitch.addEventListener("click", () => {
          const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
          if (!target) return;
          const next = !target.visible;
          setVisible(currentVm, target, next);
          syncAuditVisibleUI(next);
          if (isLocked(target, "visible")) setLock(target, "visible", next);
          syncAuditLockButtons(target);
        });
      }

      const frontBtn = windowEl.querySelector("#srm-audit-front");
      if (frontBtn) frontBtn.addEventListener("click", () => {
        const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
        if (!target) return;
        goToFront(currentVm, target);
        if (isLocked(target, "layer")) snapshotProp(target, "layer");
        if (!selectedClone && selectedName) renderClonesForAudit(target);
      });
      const backBtn2 = windowEl.querySelector("#srm-audit-back");
      if (backBtn2) backBtn2.addEventListener("click", () => {
        const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
        if (!target) return;
        goToBack(currentVm, target);
        if (isLocked(target, "layer")) snapshotProp(target, "layer");
        if (!selectedClone && selectedName) renderClonesForAudit(target);
      });
      const fwdBtn = windowEl.querySelector("#srm-audit-fwd");
      if (fwdBtn) fwdBtn.addEventListener("click", () => {
        const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
        if (!target) return;
        goForwardLayers(currentVm, target, 1);
        if (isLocked(target, "layer")) snapshotProp(target, "layer");
        if (!selectedClone && selectedName) renderClonesForAudit(target);
      });
      const bwdBtn = windowEl.querySelector("#srm-audit-bwd");
      if (bwdBtn) bwdBtn.addEventListener("click", () => {
        const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
        if (!target) return;
        goBackwardLayers(currentVm, target, 1);
        if (isLocked(target, "layer")) snapshotProp(target, "layer");
        if (!selectedClone && selectedName) renderClonesForAudit(target);
      });

      const refreshBtn = windowEl.querySelector("#srm-audit-refresh");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
          if (target) fillAuditEditor(target);
          if (!selectedClone && selectedName) {
            const t = findTarget(currentVm, selectedName);
            if (t) renderClonesForAudit(t);
          }
        });
      }

      const unlockAllBtn = windowEl.querySelector("#srm-audit-unlock-all");
      if (unlockAllBtn) {
        unlockAllBtn.addEventListener("click", () => {
          const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
          if (!target) return;
          clearAllLocksOf(target);
          syncAuditLockButtons(target);
        });
      }

      const cloneHeader = windowEl.querySelector("#srm-audit-clone-header");
      if (cloneHeader) {
        cloneHeader.addEventListener("click", () => {
          if (selectedClone) return;
          cloneExpanded = !cloneExpanded;
          windowEl.querySelector("#srm-audit-clone-list").classList.toggle("open", cloneExpanded);
          windowEl.querySelector("#srm-audit-clone-toggle").textContent = cloneExpanded ? "折叠" : "展开";
        });
      }

      ["x", "y", "size", "direction", "layer"].forEach(prop => {
        const inputId = { x: "#srm-audit-x", y: "#srm-audit-y", size: "#srm-audit-size", direction: "#srm-audit-dir", layer: "#srm-audit-layer" }[prop];
        const input = windowEl.querySelector(inputId);
        if (input) {
          input.addEventListener("input", () => {
            const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
            if (!target) return;
            if (isLocked(target, prop)) {
              const v = Number(input.value);
              if (!Number.isNaN(v)) setLock(target, prop, v);
            }
          });
        }
      });
    } finally {
      renderLock = false;
    }
  }

  function fillAuditEditor(target) {
    if (!target) return;
    const editor = windowEl.querySelector("#srm-audit-editor");
    if (editor) editor.style.display = "flex";

    const nameEl = windowEl.querySelector("#srm-audit-name");
    if (nameEl) nameEl.textContent = (target.getName ? target.getName() : target.sprite?.name) + (isClone(target) ? "（克隆体）" : "");

    const xEl = windowEl.querySelector("#srm-audit-x");
    const yEl = windowEl.querySelector("#srm-audit-y");
    const sizeEl = windowEl.querySelector("#srm-audit-size");
    const dirEl = windowEl.querySelector("#srm-audit-dir");
    const layerEl = windowEl.querySelector("#srm-audit-layer");

    if (xEl) xEl.value = target.x;
    if (yEl) yEl.value = target.y;
    if (sizeEl) sizeEl.value = target.size;
    if (dirEl) dirEl.value = target.direction;
    if (layerEl) layerEl.value = readLayerOrder(target) ?? "";

    syncAuditVisibleUI(!!target.visible);
    syncAuditLockButtons(target);
  }

  function syncAuditVisibleUI(visible) {
    const sw = windowEl.querySelector("#srm-audit-visible-switch");
    const text = windowEl.querySelector("#srm-audit-visible-text");
    if (sw) sw.classList.toggle("on", !!visible);
    if (text) text.textContent = visible ? "显示" : "隐藏";
  }

  function syncAuditLockButtons(target) {
    if (!windowEl) return;
    const btns = windowEl.querySelectorAll(".srm-lock-btn");
    btns.forEach(btn => {
      const prop = btn.dataset.prop;
      const locked = target ? isLocked(target, prop) : false;
      btn.textContent = locked ? "🔒" : "🔓";
      btn.classList.toggle("locked", locked);
    });
  }

  function renderClonesForAudit(original) {
    const list = windowEl.querySelector("#srm-audit-clone-list");
    const countEl = windowEl.querySelector("#srm-audit-clone-count");
    if (!list || !countEl) return;

    const clones = getClonesOf(currentVm, original);
    countEl.textContent = `(${clones.length})`;
    list.innerHTML = "";

    if (!clones.length) {
      const empty = document.createElement("div");
      empty.className = "srm-empty";
      empty.style.padding = "8px";
      empty.textContent = "无克隆体";
      list.appendChild(empty);
      return;
    }

    clones.forEach(c => {
      const item = document.createElement("div");
      item.className = "srm-clone-item";
      const left = document.createElement("span");
      left.textContent = `克隆体 x=${c.x} y=${c.y}`;
      item.appendChild(left);
      if (isLocked(c, "x") || isLocked(c, "y") || isLocked(c, "size") || isLocked(c, "direction") || isLocked(c, "layer") || isLocked(c, "visible")) {
        const icon = document.createElement("span");
        icon.textContent = "🔒";
        icon.style.color = "#ffd166";
        item.appendChild(icon);
      }
      item.addEventListener("click", () => {
        selectedClone = c;
        selectedName = null;
        fillAuditEditor(c);
        list.innerHTML = "";
        countEl.textContent = "(—)";
        windowEl.querySelector("#srm-audit-clone-toggle").textContent = "";
      });
      list.appendChild(item);
    });
  }

  function findTarget(vmInstance, name) {
    if (!vmInstance || !vmInstance.runtime) return null;
    const originals = getOriginals(vmInstance);
    const hit = originals.find(t => (t.getName ? t.getName() : t.sprite?.name) === name);
    if (hit) return hit;
    const clones = vmInstance.runtime.targets.filter(t => t && !isStage(t) && isClone(t));
    return clones.find(t => (t.getName ? t.getName() : t.sprite?.name) === name) || null;
  }

  function readProp(target, prop) {
    switch (prop) {
      case "x": return target.x;
      case "y": return target.y;
      case "size": return target.size;
      case "direction": return target.direction;
      case "layer": return readLayerOrder(target);
      case "visible": return !!target.visible;
    }
    return undefined;
  }

  window.addEventListener("beforeunload", () => {
    for (const [varId, info] of variableLocks) {
      if (info.timer) clearInterval(info.timer);
    }
    variableLocks.clear();
    if (lockTimer) clearInterval(lockTimer);
    locks.clear();
    broadcastInterceptLocks.clear();
    EXTENSION_INTERCEPT_LOCKED.clear();
  });

  async function init() {
    try {
      currentVm = await getVM();
      if (!currentVm) {
        console.warn("无法获取VM");
        return;
      }
      vm = currentVm;
      patchVMForExport(currentVm);
      patchRuntimeForBroadcastIntercept(currentVm);
      patchRuntimeForExtensionIntercept(currentVm);
      createUI();
      console.log("角色管理器Pro 已加载");
    } catch (err) {
      console.error("角色管理器Pro 初始化失败", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => {
        getVM().then((v) => {
          if (v) {
            currentVm = v;
            vm = v;
            patchVMForExport(v);
            patchRuntimeForBroadcastIntercept(v);
            patchRuntimeForExtensionIntercept(v);
            if (!floatBtn) createUI();
          }
        }).catch(() => {});
      }, 2000);
    }
  }, 3000);

  unsafeWindow.__srm = {
    vm: () => currentVm,
    open: openUI,
    close: closeUI,
    getSprites: () => getSprites(currentVm),
    getStage: () => getStage(currentVm),
    getVariables: () => getVariables(currentVm),
    getVariablesGrouped: () => getVariablesGrouped(currentVm),
    deleteSprite: (id) => deleteSprite(currentVm, id),
    renameSprite: (id, name) => renameSprite(currentVm, id, name),
    insertSprite: () => insertSprite(currentVm),
    setVariable: (targetId, varId, value) => setVariable(currentVm, targetId, varId, value),
    findVariableByName: (name) => findVariableByName(currentVm, name),
    findVariablesByName: (name) => findVariablesByName(currentVm, name),
    lockVariable: (varId, targetId, value) => lockVariable(currentVm, varId, targetId, value),
    unlockVariable: (varId) => unlockVariable(varId),
    toggleLock: (varId, targetId, value) => toggleLock(currentVm, varId, targetId, value),
    getLockedVariables: getLockedVariables,
    triggerBroadcast: (name) => triggerBroadcast(currentVm, name),
    isBroadcastInterceptLocked: (name) => isBroadcastInterceptLocked(name),
    setBroadcastInterceptLock: (name, locked) => setBroadcastInterceptLock(name, locked),
    toggleBroadcastInterceptLock: (name) => toggleBroadcastInterceptLock(name),
    exportSprite: (targetId, spriteName) => exportSpriteAsFile(currentVm, targetId, spriteName),
    exportAsset: (item, type) => exportAsset(item, type),
    patchVMForExport: () => patchVMForExport(currentVm),
    getFileNameMode: () => currentFileNameMode,
    setFileNameMode: (mode) => { currentFileNameMode = mode; },
    getLoadedExtensions: () => getLoadedExtensions(currentVm),
    getOpcodeDisplayName: (opcode) => getOpcodeDisplayName(currentVm, opcode),
    isExtensionInterceptLocked: (opcode) => isExtensionInterceptLocked(opcode),
    setExtensionInterceptLock: (opcode, locked) => setExtensionInterceptLock(opcode, locked),
    toggleExtensionInterceptLock: (opcode) => toggleExtensionInterceptLock(opcode),
    getLockedExtensionOpcodes: () => Array.from(EXTENSION_INTERCEPT_LOCKED),
  };

  unsafeWindow.RoleManager = {
    _vm: null,
    async ready() {
      if (this._vm) return this._vm;
      this._vm = await getVM();
      return this._vm;
    },
    async listRoles() {
      const v = await this.ready();
      return getOriginals(v).map(t => ({
        name: t.getName ? t.getName() : t.sprite?.name,
        isStage: isStage(t),
        isClone: isClone(t),
        x: t.x, y: t.y, size: t.size, direction: t.direction,
        visible: t.visible, layerOrder: readLayerOrder(t)
      }));
    },
    async listClones(name) {
      const v = await this.ready();
      const original = findTarget(v, name);
      if (!original) return null;
      return getClonesOf(v, original).map(t => ({
        name: t.getName ? t.getName() : t.sprite?.name,
        isClone: true,
        x: t.x, y: t.y, size: t.size, direction: t.direction,
        visible: t.visible, layerOrder: readLayerOrder(t)
      }));
    },
    async getRole(name) {
      const v = await this.ready();
      const t = findTarget(v, name);
      if (!t) return null;
      return {
        name: t.getName ? t.getName() : t.sprite?.name,
        isStage: isStage(t), isClone: isClone(t),
        x: t.x, y: t.y, size: t.size, direction: t.direction,
        visible: t.visible, layerOrder: readLayerOrder(t)
      };
    },
    async _mustFind(name) {
      const v = await this.ready();
      const t = findTarget(v, name);
      if (!t) throw new Error(`[RoleManager] 找不到角色: ${name}`);
      return { vm: v, t };
    },
    async setRolePosition(name, x, y) {
      const { vm: v, t } = await this._mustFind(name);
      setPosition(v, t, x, y);
      return this.getRole(name);
    },
    async setRoleSize(name, size) {
      const { vm: v, t } = await this._mustFind(name);
      setSize(v, t, size);
      return this.getRole(name);
    },
    async setRoleDirection(name, deg) {
      const { vm: v, t } = await this._mustFind(name);
      setDirection(v, t, deg);
      return this.getRole(name);
    },
    async setRoleVisible(name, visible) {
      const { vm: v, t } = await this._mustFind(name);
      setVisible(v, t, !!visible);
      return this.getRole(name);
    },
    async setRoleLayer(name, order) {
      const { vm: v, t } = await this._mustFind(name);
      setLayerOrder(v, t, order);
      return this.getRole(name);
    },
    async roleToFront(name) {
      const { vm: v, t } = await this._mustFind(name);
      goToFront(v, t);
      return this.getRole(name);
    },
    async roleToBack(name) {
      const { vm: v, t } = await this._mustFind(name);
      goToBack(v, t);
      return this.getRole(name);
    },
    async roleForward(name, n = 1) {
      const { vm: v, t } = await this._mustFind(name);
      goForwardLayers(v, t, n);
      return this.getRole(name);
    },
    async roleBackward(name, n = 1) {
      const { vm: v, t } = await this._mustFind(name);
      goBackwardLayers(v, t, n);
      return this.getRole(name);
    },
    async lockProp(name, prop, value) {
      const { t } = await this._mustFind(name);
      if (!LOCK_PROPS.includes(prop)) throw new Error(`[RoleManager] 无效属性: ${prop}`);
      const v = value === undefined ? readProp(t, prop) : value;
      setLock(t, prop, v);
      return true;
    },
    async unlockProp(name, prop) {
      const { t } = await this._mustFind(name);
      clearLock(t, prop);
      return true;
    },
    async unlockAll(name) {
      const { t } = await this._mustFind(name);
      clearAllLocksOf(t);
      return true;
    },
    async getLocks(name) {
      const { t } = await this._mustFind(name);
      const l = locks.get(t);
      return l ? Object.assign({}, l) : {};
    },
    show: () => { if (!isOpen) openUI(); },
    hide: () => { if (isOpen) closeUI(); },
    toggle: () => toggleUI(),
    triggerBroadcast: (name) => triggerBroadcast(currentVm, name),
    lockBroadcast: (name) => setBroadcastInterceptLock(name, true),
    unlockBroadcast: (name) => setBroadcastInterceptLock(name, false),
    isBroadcastLocked: (name) => isBroadcastInterceptLocked(name),
    listExtensions: () => getLoadedExtensions(currentVm),
    getOpcodeDisplayName: (opcode) => getOpcodeDisplayName(currentVm, opcode),
    isOpcodeLocked: (opcode) => isExtensionInterceptLocked(opcode),
    lockOpcode: (opcode) => setExtensionInterceptLock(opcode, true),
    unlockOpcode: (opcode) => setExtensionInterceptLock(opcode, false),
    toggleOpcode: (opcode) => toggleExtensionInterceptLock(opcode),
    listLockedOpcodes: () => Array.from(EXTENSION_INTERCEPT_LOCKED),
  };

})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);