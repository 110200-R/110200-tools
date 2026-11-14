// ==UserScript==
// @name         角色管理器Pro
// @version      3.3.5
// @description  一个角色管理器的改版，主要优化UI部分，非正式版本，介绍同原版角色管理器。
// @author       诺言Promise、110200、落日余晖
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

// 前端UI感谢落日余晖

(function (unsafeWindow) {
  'use strict';

  // ===== 随机特征 =====
  const RAND = Math.random().toString(36).slice(2, 8);
  const CLS = "u" + RAND;
  const GLOBAL_KEY = "__u" + RAND;
  const STORE_KEY = "u" + RAND;
  const TOAST_ID = "t" + RAND;

  // 设置持久化使用的稳定 key（不能带随机后缀，否则刷新即丢）
  const SETTINGS_KEY = "RMPro_UI_Settings_v1";

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
    }
  } catch (e) { }

  // ===== 获取 VM：不劫持 bind，不用全量 DOM 遍历 =====
  function getVmCandidates() {
    const list = [];
    try {
      if (unsafeWindow?.eureka?.vm) list.push(unsafeWindow.eureka.vm);
      if (unsafeWindow?.vm) list.push(unsafeWindow.vm);
      if (unsafeWindow?.Scratch?.vm) list.push(unsafeWindow.Scratch.vm);
      if (unsafeWindow?.Scratch?.runtime?.extensionManager?.vm) list.push(unsafeWindow.Scratch.runtime.extensionManager.vm);
    } catch (e) { }
    return list;
  }

  function findStoreInObject(obj, depth, seen) {
    if (!obj || depth > 6 || seen.has(obj)) return null;
    seen.add(obj);
    try {
      if (obj.getState) {
        const st = obj.getState();
        if (st?.scratchGui?.vm) return obj;
      }
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length && i < 40; i++) {
        const v = obj[keys[i]];
        if (v && typeof v === "object") {
          const found = findStoreInObject(v, depth + 1, seen);
          if (found) return found;
        }
      }
    } catch (e) { }
    return null;
  }

  function getStoreFromLimitedDom() {
    const containers = [];
    try {
      const app = document.getElementById("app");
      if (app) containers.push(app);
      const root = document.getElementById("root");
      if (root) containers.push(root);
      const main = document.querySelector("[class*='gui']");
      if (main) containers.push(main);
      if (document.body) containers.push(document.body);
    } catch (e) { }

    for (const el of containers) {
      try {
        const keys = Object.keys(el);
        for (const k of keys) {
          if (!k.includes("__reactContainer")) continue;
          const fiber = el[k];
          if (!fiber) continue;
          const store = findStoreInObject(fiber, 0, new Set());
          if (store) return store;
        }
      } catch (e) { }
    }
    return null;
  }

  async function getVM() {
    for (const c of getVmCandidates()) {
      if (c) return c;
    }

    if (document.readyState === "complete") {
      const store = getStoreFromLimitedDom();
      const v = store?.getState?.()?.scratchGui?.vm;
      if (v) return v;
    }

    return new Promise((resolve, reject) => {
      let tries = 0;
      const maxTries = 60;
      const timer = setInterval(() => {
        tries++;
        for (const c of getVmCandidates()) {
          if (c) {
            clearInterval(timer);
            resolve(c);
            return;
          }
        }
        if (document.readyState === "complete") {
          const store = getStoreFromLimitedDom();
          const v = store?.getState?.()?.scratchGui?.vm;
          if (v) {
            clearInterval(timer);
            resolve(v);
            return;
          }
        }
        if (tries >= maxTries) {
          clearInterval(timer);
          reject(new Error("获取 VM 超时"));
        }
      }, 250);
    });
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
    } catch (e) { }
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
      catch (e) { }
    }
    if (rt && typeof rt.setSpriteLayer === "function") {
      try { rt.setSpriteLayer(target, order); requestRedraw(vmInstance); return true; }
      catch (e) { }
    }
    const candidates = ["layerOrder", "zIndex", "layer", "order", "depth"];
    for (const c of candidates) {
      if (typeof target[c] === "number") {
        target[c] = order;
        requestRedraw(vmInstance);
        return true;
      }
    }
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
        const loop = () => {
          try {
            const v = currentVm || vm;
            if (v) applyLocks(v);
          } catch (e) { }
          if (hasAnyLock()) lockTimer = requestAnimationFrame(loop);
          else lockTimer = null;
        };
        lockTimer = requestAnimationFrame(loop);
      }
    } else {
      if (lockTimer) {
        cancelAnimationFrame(lockTimer);
        lockTimer = null;
      }
    }
  }

  // ===== 变量/列表锁定 =====
  const variableLocks = new Map();

  const BYPASS_KEY = "__" + STORE_KEY + "_b";
  const LOCKED_KEY = "__" + STORE_KEY + "_l";

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

  function applyListProxy(record) {
    const realArray = record.originalArray;
    const varId = record.varId;

    const handler = {
      set(target, prop, value) {
        if (isBypassing()) { target[prop] = value; return true; }
        const rec = variableLocks.get(varId);
        if (rec && rec.locked && rec.mode === "intercept") return true;
        target[prop] = value;
        return true;
      },
      deleteProperty(target, prop) {
        if (isBypassing()) { delete target[prop]; return true; }
        const rec = variableLocks.get(varId);
        if (rec && rec.locked && rec.mode === "intercept") return true;
        delete target[prop];
        return true;
      }
    };

    const proxy = new Proxy(realArray, handler);
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

      Object.defineProperty(varObj, "value", {
        configurable: true,
        enumerable: true,
        get() {
          if (self.isList) return self.proxy || self.originalArray;
          return self.rawValue;
        },
        set(newValue) {
          if (isBypassing()) {
            if (self.isList) {
              const arr = Array.isArray(newValue) ? newValue : [];
              self.originalArray = arr;
              applyListProxy(self);
              self.rawValue = arr;
              self.value = deepCloneValue(arr);
            } else {
              self.rawValue = newValue;
              self.value = newValue;
            }
            return;
          }
          const rec = variableLocks.get(varId);
          if (rec && rec.locked && rec.mode === "intercept") return;
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

      if (isList) record.rawValue = record.originalArray;
      else record.rawValue = record.originalDescriptor.value;

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
          if (cur !== snapshot) varObj.value = snapshot;
        }
      } catch (e) { }
    }, 50);

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
        if (record.isList) finalValue = record.originalArray || [];
        else finalValue = record.rawValue;
        Object.defineProperty(varObj, "value", {
          value: finalValue,
          writable: true,
          enumerable: true,
          configurable: true
        });
      } catch (e) { }
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
      if (value !== undefined) rec.value = deepCloneValue(value);
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
    if (value !== undefined) lockValue = deepCloneValue(value);
    else lockValue = deepCloneValue(varObj.value);

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
      rawValue: isList ? null : lockValue,
      locked: true
    };

    variableLocks.set(varId, record);

    const ok = applyVariableLock(vmInstance, varId, targetId);

    if (ok) {
      showToast("已锁定");
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
    if (variableLocks.has(varId)) return unlockVariable(varId);
    return lockVariable(vmInstance, varId, targetId, value);
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
    if (broadcastInterceptLocks.has(broadcastName)) setBroadcastInterceptLock(broadcastName, false);
    else setBroadcastInterceptLock(broadcastName, true);
  }

  function patchRuntimeForBroadcastIntercept(vmInstance) {
    if (!vmInstance?.runtime) return;
    const runtime = vmInstance.runtime;
    if (patchedRuntimes.has(runtime)) return;
    if (typeof runtime.startHats !== 'function') return;

    const originalStartHats = runtime.startHats.bind(runtime);

    runtime.startHats = function (requestedHatOpcode, optMatchFields, optTarget) {
      try {
        if (requestedHatOpcode === 'event_whenbroadcastreceived' && optMatchFields) {
          const broadcastName = optMatchFields.BROADCAST_OPTION;
          if (broadcastName !== undefined && broadcastName !== null) {
            if (broadcastInterceptLocks.has(String(broadcastName))) return [];
          }
        }
      } catch (e) { }
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
  const extOriginalPrimitives = new WeakMap();

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
    if (EXTENSION_INTERCEPT_LOCKED.has(opcode)) setExtensionInterceptLock(opcode, false);
    else setExtensionInterceptLock(opcode, true);
  }

  function applyExtensionLockToRuntime(vmInstance, opcode, locked) {
    if (!vmInstance?.runtime) return;
    const runtime = vmInstance.runtime;
    if (!runtime._primitives) return;
    if (!extOriginalPrimitives.has(runtime)) extOriginalPrimitives.set(runtime, new Map());
    const origMap = extOriginalPrimitives.get(runtime);

    if (locked) {
      if (!origMap.has(opcode)) {
        const orig = runtime._primitives[opcode];
        if (typeof orig === "function") origMap.set(opcode, orig);
      }
      const original = origMap.get(opcode);
      if (typeof original === "function") {
        runtime._primitives[opcode] = function () {
          if (EXTENSION_INTERCEPT_LOCKED.has(opcode)) return undefined;
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

    if (!extOriginalPrimitives.has(runtime)) extOriginalPrimitives.set(runtime, new Map());
    const origMap = extOriginalPrimitives.get(runtime);

    for (const opcode of EXTENSION_INTERCEPT_LOCKED) {
      if (!origMap.has(opcode)) {
        const orig = runtime._primitives[opcode];
        if (typeof orig === "function") origMap.set(opcode, orig);
      }
      const original = origMap.get(opcode);
      if (typeof original === "function") {
        runtime._primitives[opcode] = function () {
          if (EXTENSION_INTERCEPT_LOCKED.has(opcode)) return undefined;
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
    extPatchedRuntimes.add(runtime);
    applyAllExtensionLocks(vmInstance);
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
      if (!groups.has(prefix)) groups.set(prefix, { prefix, opcodes: [] });
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
              if (typeof block.text === "string" && block.text) return block.text;
              const info = block.info || {};
              if (typeof info.text === "string" && info.text) return info.text;
              if (typeof info.name === "string" && info.name) return info.name;
            }
          }
        }
      }

      const Blockly = unsafeWindow?.Blockly || window.Blockly;
      if (Blockly && Blockly.Blocks && Blockly.Blocks[opcode]) {
        const def = Blockly.Blocks[opcode];
        if (typeof def.message0 === "string" && def.message0) return def.message0;
        if (typeof def.text === "string" && def.text) return def.text;
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
      if (target.variables instanceof Map) varObj = target.variables.get(varId);
      else varObj = target.variables[varId];
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

      if (typeof vmInstance.emit === "function") vmInstance.emit("variablesUpdate");
      return true;
    } catch (err) {
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
      if (target.variables instanceof Map) varObj = target.variables.get(varId);
      else varObj = target.variables[varId];
      return varObj?.value;
    } catch (err) {
      return undefined;
    }
  }

  function findVariableByName(vmInstance, name) {
    return getVariables(vmInstance).find(v => v.name === name);
  }

  function findVariablesByName(vmInstance, name) {
    return getVariables(vmInstance).filter(v => v.name === name);
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
      showToast("广播失败：" + (e && e.message ? e.message : String(e)), "error");
      return 0;
    }
  }

  function patchVMForExport(vmInstance) {
    if (!vmInstance) return;
    if (vmInstance[STORE_KEY + "_p"]) return;

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
        if (!JSZip) throw new Error('JSZip 未加载，无法导出');
        const zip = new JSZip();
        const json = this.toJSON();
        zip.file('project.json', json);
        this._addFileDescsToZip(this.serializeAssets(), zip);
        for (const key in zip.files) {
          if (zip.files[key]) zip.files[key].date = VERSION_DATE;
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
        if (!JSZip) throw new Error('JSZip 未加载，无法导出');
        const json = this.toJSON(targetId);
        const zip = new JSZip();
        zip.file('sprite.json', json);
        this._addFileDescsToZip(this.serializeAssets(targetId), zip);
        for (const key in zip.files) {
          if (zip.files[key]) zip.files[key].date = VERSION_DATE;
        }
        for (const key in zip.files) {
          if (zip.files[key]) {
            const shouldCompress = EXTENSIONS.some(ext => key.endsWith(ext));
            zip.files[key].options.compression = shouldCompress ? 'DEFLATE' : 'STORE';
          }
        }
        return zip.generateAsync({
          type: typeof type === 'string' ? type : 'blob',
          mimeType: 'application/x-scratch.sprite3',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
      };
    }

    vmInstance[STORE_KEY + "_p"] = true;
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
        if (typeof runtime.removeTarget === "function") { runtime.removeTarget(targetId); return true; }
        if (typeof runtime.disposeTarget === "function") { runtime.disposeTarget(targetId); return true; }
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
          if (target.sprite) target.sprite.clones = target.sprite.clones?.filter((c) => c.id !== targetId) || [];
          if (typeof vmInstance.emit === "function") vmInstance.emit("targetsUpdate");
          const stage = runtime.getTargetForStage?.();
          if (stage && typeof vmInstance.setEditingTarget === "function") vmInstance.setEditingTarget(stage.id);
          return true;
        }
      }
      const store = getStoreFromLimitedDom();
      if (store && typeof store.dispatch === "function") {
        store.dispatch({ type: "scratch-gui/editor/REMOVE_SPRITE", data: { targetId } });
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  function renameSprite(vmInstance, targetId, newName) {
    const target = vmInstance.runtime.targets.find((t) => t.id === targetId);
    if (!target || target.isStage || !target.sprite) return false;
    try {
      target.sprite.name = newName;
      if (typeof vmInstance.emit === "function") vmInstance.emit("targetsUpdate");
      return true;
    } catch (err) {
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
    } catch (err) { return false; }
  }

  function deleteSound(sprite, index) {
    if (!sprite?.sounds || index < 0 || index >= sprite.sounds.length) return false;
    try { sprite.sounds.splice(index, 1); return true; }
    catch (err) { return false; }
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
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5); display: flex; align-items: center;
        justify-content: center; z-index: 99999;
      `;

      dropZone.style.cssText = `
        background: rgba(20, 20, 40, 0.85); backdrop-filter: blur(30px);
        padding: 32px 40px; border-radius: 20px;
        border: 4px dashed rgba(255, 255, 255, 0.2); cursor: pointer;
        font-size: 16px; text-align: center; min-width: 320px; color: #e8e8e8;
        font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
        transition: border-color 0.3s, transform 0.2s;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
      `;

      dropZone.innerHTML = `
        <div style="font-size:48px;margin-bottom:12px;">+</div>
        <div style="font-size:20px;font-weight:bold;margin-bottom:8px;background:linear-gradient(135deg,#ff8c1a,#ff6b00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">选择或拖入文件</div>
        <div style="color:rgba(255,255,255,0.5);font-size:14px;">上传 ${label} 文件</div>
        <div style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:12px;">支持 .sprite3 .sprite2 .zip</div>
      `;

      fileInput.type = "file";
      fileInput.accept = accept;
      fileInput.style.display = "none";

      const close = () => {
        cleanup();
        document.body.removeChild(overlay);
        resolve(null);
      };

      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
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
        if (file) { cleanup(); document.body.removeChild(overlay); resolve(file); }
      });
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) { cleanup(); document.body.removeChild(overlay); resolve(file); }
      });

      const keyHandler = (e) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", keyHandler);
      cleanup = () => { document.removeEventListener("keydown", keyHandler); };

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
        GM_download({ url: URL.createObjectURL(blob), name: fileName, saveAs: false });
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
      showToast('导出角色失败: ' + err.message, 'error');
      return false;
    }
  }

  async function exportAsset(item, type) {
    const asset = item.broken ? item.broken.asset : item.asset;
    if (!asset) { showToast("无法获取素材数据", "error"); return false; }

    let ext = asset.dataFormat;
    if (!ext) ext = "bin";
    else ext = String(ext).replace(/^\./, "");

    let fileName;
    if (currentFileNameMode === "name") {
      const baseName = item.name || ("未命名_" + Math.floor(Math.random() * 10000));
      fileName = baseName + "." + ext;
    } else {
      fileName = asset.assetId + "." + ext;
    }

    const mimeType = MIME_MAP[ext.toLowerCase()] || "application/octet-stream";

    let blob;
    try { blob = new Blob([asset.data], { type: mimeType }); }
    catch (e) {
      try { blob = new Blob([asset.data.buffer || asset.data], { type: mimeType }); }
      catch (e2) { showToast("无法获取素材数据", "error"); return false; }
    }

    try {
      if (typeof GM_download === "function") {
        GM_download({ url: URL.createObjectURL(blob), name: fileName, saveAs: false });
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
      showToast("导出素材失败：" + err.message, "error");
      return false;
    }
  }

  // ===== 扩展返回值 =====
  const rtTamperMap = new Map();
  let rtGlobalMode = "apply";
  let rtMainSearch = "";
  let rtDetailSearch = "";
  let currentRtDetail = null;

  const rtTamperOriginalPrimitives = new WeakMap();

  const RT_NATIVE_WHITELIST = new Set([
    "motion_xposition", "motion_yposition", "motion_direction",
    "looks_costumenumbername", "looks_backdropnumbername", "looks_size",
    "sound_volume", "sensing_touchingobject", "sensing_touchingcolor",
    "sensing_coloristouchingcolor", "sensing_distanceto", "sensing_answer",
    "sensing_keypressed", "sensing_mousedown", "sensing_mousex", "sensing_mousey",
    "sensing_loudness", "sensing_timer", "sensing_current", "sensing_dayssince2000",
    "sensing_username", "operators_add", "operators_subtract", "operators_multiply",
    "operators_divide", "operators_random", "operators_lt", "operators_equals",
    "operators_gt", "operators_and", "operators_or", "operators_not",
    "operators_join", "operators_letter", "operators_length", "operators_contains",
    "operators_mod", "operators_round", "operators_mathop",
    "data_variable", "data_listcontents", "data_itemnumoflist", "data_lengthoflist",
    "data_listcontainsitem", "argument_reporter_string_number",
    "argument_reporter_boolean", "math_number", "math_integer", "math_whole_number",
    "math_positive_number", "math_angle", "colour_picker", "text"
  ]);

  const RT_NATIVE_BLACKLIST = new Set([
    "motion_movesteps", "motion_turnright", "motion_turnleft", "motion_goto",
    "motion_gotoxy", "motion_glidesecstoxy", "motion_glideto", "motion_pointindirection",
    "motion_pointtowards", "motion_changexby", "motion_setx", "motion_changeyby",
    "motion_sety", "motion_ifonedgebounce", "motion_setrotationstyle",
    "looks_sayforsecs", "looks_say", "looks_thinkforsecs", "looks_think",
    "looks_switchcostumeto", "looks_nextcostume", "looks_switchbackdropto",
    "looks_nextbackdrop", "looks_changesizeby", "looks_setsizeto",
    "looks_changeeffectby", "looks_seteffectto", "looks_cleargraphiceffects",
    "looks_show", "looks_hide", "looks_gotofrontback", "looks_goforwardbackwardlayers",
    "sound_play", "sound_playuntildone", "sound_stopallsounds",
    "sound_changeeffectby", "sound_seteffectto", "sound_clearwffects",
    "sound_setvolumeto", "sound_changevolumeby",
    "event_whenflagclicked", "event_whenkeypressed", "event_whenthisspriteclicked",
    "event_whenstageclicked", "event_whenbackdropswitchesto", "event_whengreaterthan",
    "event_whenbroadcastreceived", "event_broadcast", "event_broadcastandwait",
    "control_wait", "control_repeat", "control_forever", "control_if", "control_if_else",
    "control_wait_until", "control_repeat_until", "control_stop", "control_start_as_clone",
    "control_create_clone_of", "control_delete_this_clone",
    "sensing_askandwait", "sensing_setdragmode", "sensing_resettimer",
    "data_setvariableto", "data_changevariableby", "data_showvariable", "data_hidevariable",
    "data_addtolist", "data_deleteoflist", "data_deletealloflist", "data_insertatlist",
    "data_replaceitemoflist", "data_showlist", "data_hidelist",
    "procedures_definition", "procedures_call", "procedures_ifreturn"
  ]);

  function getRtRecord(opcode) {
    return rtTamperMap.get(opcode) || null;
  }

  function isRtTampered(opcode) {
    const rec = rtTamperMap.get(opcode);
    return !!(rec && rec.type && rec.type !== "none");
  }

  function convertRtValue(type, rawValue) {
    if (type === "none") return undefined;
    if (type === "boolean") {
      if (rawValue === "true") return true;
      if (rawValue === "false") return false;
      return String(rawValue);
    }
    if (type === "number") {
      const s = String(rawValue);
      if (s.trim() === "") return s;
      const n = Number(s);
      if (!Number.isNaN(n)) return n;
      return s;
    }
    if (type === "string") return String(rawValue);
    return undefined;
  }

  function getRtRuntimeValue(opcode) {
    const rec = rtTamperMap.get(opcode);
    if (!rec || !rec.type || rec.type === "none") return undefined;
    if (rtGlobalMode === "apply") {
      if (rec.converted !== undefined) return rec.converted;
      return convertRtValue(rec.type, rec.rawValue);
    }
    return convertRtValue(rec.type, rec.rawValue);
  }

  function normalizeRtRecords() {
    for (const [, rec] of rtTamperMap) {
      if (!rec || !rec.type || rec.type === "none") continue;
      rec.converted = convertRtValue(rec.type, rec.rawValue);
    }
  }

  function applyRtToOpcode(opcode) {
    const runtime = (currentVm || vm)?.runtime;
    if (!runtime?._primitives) return;
    if (!rtTamperOriginalPrimitives.has(runtime)) {
      rtTamperOriginalPrimitives.set(runtime, new Map());
    }
    const origMap = rtTamperOriginalPrimitives.get(runtime);

    const rec = rtTamperMap.get(opcode);
    const hasTamper = !!(rec && rec.type && rec.type !== "none");

    if (hasTamper) {
      if (!origMap.has(opcode)) {
        const orig = runtime._primitives[opcode];
        if (typeof orig === "function") origMap.set(opcode, orig);
      }
      const original = origMap.get(opcode);
      if (typeof original === "function") {
        const wrapped = function () {
          if (EXTENSION_INTERCEPT_LOCKED.has(opcode)) return undefined;
          const val = getRtRuntimeValue(opcode);
          if (val !== undefined) return val;
          return original.apply(this, arguments);
        };
        try {
          Object.defineProperty(wrapped, "toString", {
            value: () => original.toString(),
            writable: false,
            enumerable: false,
            configurable: false
          });
        } catch (e) { }
        runtime._primitives[opcode] = wrapped;
      }
    } else {
      if (origMap.has(opcode)) {
        const original = origMap.get(opcode);
        const locked = EXTENSION_INTERCEPT_LOCKED.has(opcode);
        if (locked) {
          runtime._primitives[opcode] = function () {
            if (EXTENSION_INTERCEPT_LOCKED.has(opcode)) return undefined;
            return original.apply(this, arguments);
          };
        } else {
          runtime._primitives[opcode] = original;
        }
        origMap.delete(opcode);
      }
    }
  }

  function applyAllRtTampers() {
    for (const opcode of rtTamperMap.keys()) applyRtToOpcode(opcode);
  }

  function setRtTamper(opcode, type, rawValue) {
    if (!type || type === "none") {
      rtTamperMap.delete(opcode);
      applyRtToOpcode(opcode);
      return true;
    }
    const rec = {
      type,
      rawValue: rawValue === undefined ? "" : String(rawValue),
      converted: undefined
    };
    rec.converted = convertRtValue(type, rec.rawValue);
    rtTamperMap.set(opcode, rec);
    applyRtToOpcode(opcode);
    return true;
  }

  function clearRtTamper(opcode) {
    rtTamperMap.delete(opcode);
    applyRtToOpcode(opcode);
  }

  function getRtConvertedPreview(type, rawValue) {
    if (type === "none") return "—";
    const v = convertRtValue(type, rawValue);
    if (typeof v === "string") return JSON.stringify(v);
    return String(v);
  }

  function getBlockType(runtime, opcode) {
    if (!runtime) return null;
    const blockInfo = runtime._blockInfo;
    if (Array.isArray(blockInfo)) {
      for (const ext of blockInfo) {
        if (!ext || !Array.isArray(ext.blocks)) continue;
        for (const block of ext.blocks) {
          if (block && block.opcode === opcode) {
            if (block.blockType) return block.blockType;
          }
        }
      }
    }
    try {
      const Blockly = unsafeWindow?.Blockly || window.Blockly;
      if (Blockly && Blockly.Blocks && Blockly.Blocks[opcode]) {
        const def = Blockly.Blocks[opcode];
        if (def.output) {
          if (def.output === "Boolean") return "Boolean";
          return "Reporter";
        }
        if (def.outputConnection) {
          if (def.outputConnection.check && def.outputConnection.check[0] === "Boolean") {
            return "Boolean";
          }
          return "Reporter";
        }
      }
    } catch (e) { }
    return null;
  }

  function getNativeReturnOpcodes(vmInstance) {
    const runtime = vmInstance?.runtime;
    if (!runtime) return [];
    const result = new Set();

    const primitives = runtime._primitives || {};
    for (const opcode of Object.keys(primitives)) {
      if (typeof primitives[opcode] !== "function") continue;
      if (!isNativeOpcode(opcode)) continue;
      if (RT_NATIVE_BLACKLIST.has(opcode)) continue;
      if (RT_NATIVE_WHITELIST.has(opcode)) { result.add(opcode); continue; }
      const bt = getBlockType(runtime, opcode);
      if (bt === "Boolean" || bt === "Reporter" || bt === null) result.add(opcode);
    }

    const blockInfo = runtime._blockInfo;
    if (Array.isArray(blockInfo)) {
      for (const ext of blockInfo) {
        if (!ext || !Array.isArray(ext.blocks)) continue;
        for (const block of ext.blocks) {
          if (!block || !block.opcode) continue;
          if (!isNativeOpcode(block.opcode)) continue;
          if (RT_NATIVE_BLACKLIST.has(block.opcode)) continue;
          if (RT_NATIVE_WHITELIST.has(block.opcode)) { result.add(block.opcode); continue; }
          const bt = block.blockType;
          if (bt === "Boolean" || bt === "Reporter") result.add(block.opcode);
        }
      }
    }

    return Array.from(result).sort();
  }

  function getRtGroups(vmInstance) {
    const extensions = getLoadedExtensions(vmInstance);
    const groups = [];
    for (const ext of extensions) {
      const allOpcodes = ext.opcodes;
      const tamperedCount = allOpcodes.filter(op => isRtTampered(op)).length;
      groups.push({
        prefix: ext.prefix,
        name: ext.name,
        isNative: false,
        opcodes: allOpcodes,
        tamperedCount,
        totalCount: allOpcodes.length
      });
    }
    groups.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  }

  // ==================== 设置系统 ====================
  const DEFAULT_SETTINGS = {
    themeColor: "#ff8c1a",
    winWidth: 680,
    winHeight: 0,
    glass: true,
    glassBlur: 30,
    winOpacity: 0.85,
    bgImage: "",
    customCSS: ""
  };

  let settings = Object.assign({}, DEFAULT_SETTINGS);

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          settings = Object.assign({}, DEFAULT_SETTINGS, parsed);
        }
      }
    } catch (e) { }
    // 数据校验
    if (!isValidHex(settings.themeColor)) settings.themeColor = DEFAULT_SETTINGS.themeColor;
    if (typeof settings.winWidth !== "number" || !isFinite(settings.winWidth)) settings.winWidth = DEFAULT_SETTINGS.winWidth;
    if (typeof settings.winHeight !== "number" || !isFinite(settings.winHeight)) settings.winHeight = DEFAULT_SETTINGS.winHeight;
    if (typeof settings.glass !== "boolean") settings.glass = DEFAULT_SETTINGS.glass;
    if (typeof settings.glassBlur !== "number" || !isFinite(settings.glassBlur)) settings.glassBlur = DEFAULT_SETTINGS.glassBlur;
    if (typeof settings.winOpacity !== "number" || !isFinite(settings.winOpacity)) settings.winOpacity = DEFAULT_SETTINGS.winOpacity;
    settings.winOpacity = Math.max(0.2, Math.min(1, settings.winOpacity));
    settings.glassBlur = Math.max(0, Math.min(60, settings.glassBlur));
    settings.winWidth = Math.max(420, Math.min(1600, settings.winWidth));
    settings.winHeight = Math.max(0, Math.min(1600, settings.winHeight));
    if (typeof settings.bgImage !== "string") settings.bgImage = "";
    if (typeof settings.customCSS !== "string") settings.customCSS = "";
  }

  let saveTimer = null;
  function saveSettings(immediate) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    const doSave = () => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (e) {
        // 存储配额不足时，尝试去掉背景图再保存
        try {
          const fallback = Object.assign({}, settings, { bgImage: "" });
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(fallback));
          settings.bgImage = "";
          applyWindowAppearance();
          syncSettingsForm();
          showToast("背景图片过大，已自动移除（存储空间不足）", "error", 3200);
        } catch (e2) {
          showToast("设置保存失败", "error");
        }
      }
    };
    if (immediate) doSave();
    else saveTimer = setTimeout(doSave, 350);
  }

  // ===== 颜色工具 =====
  function hexToRgb(hex) {
    let h = String(hex || "").trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b]
      .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("");
  }

  function isValidHex(hex) {
    return hexToRgb(hex) !== null;
  }

  function normalizeHex(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function shadeColor(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    let { r, g, b } = rgb;
    if (amount < 0) {
      const f = 1 + amount;
      r *= f; g *= f; b *= f;
    } else {
      r += (255 - r) * amount;
      g += (255 - g) * amount;
      b += (255 - b) * amount;
    }
    return rgbToHex(r, g, b);
  }

  // ===== 设置应用 =====
  function buildStylesText() {
    const rgb = hexToRgb(settings.themeColor) || { r: 255, g: 140, b: 26 };
    const theme = rgbToHex(rgb.r, rgb.g, rgb.b);
    const themeDark = shadeColor(theme, -0.18);

    const vars = `:root{
  --${CLS}-theme:${theme};
  --${CLS}-theme-dark:${themeDark};
  --${CLS}-theme-rgb:${rgb.r},${rgb.g},${rgb.b};
}\n`;

    let css = styles;
    css = css.split("#ff8c1a").join(`var(--${CLS}-theme)`);
    css = css.split("#ff6b00").join(`var(--${CLS}-theme-dark)`);
    css = css.split("rgba(255, 140, 26,").join(`rgba(var(--${CLS}-theme-rgb),`);
    return vars + css;
  }

  function applyTheme() {
    let el = document.getElementById(CLS + "-styles");
    if (!el) {
      el = document.createElement("style");
      el.id = CLS + "-styles";
      document.head.appendChild(el);
    }
    el.textContent = buildStylesText();
  }

  function applyWindowAppearance() {
    if (!windowEl) return;
    const s = settings;

    // ---- 尺寸 ----
    const maxW = Math.max(320, window.innerWidth - 20);
    const w = Math.max(360, Math.min(maxW, s.winWidth || 680));
    windowEl.style.width = w + "px";
    windowEl.style.maxWidth = "none";

    if (s.winHeight && s.winHeight > 240) {
      const maxH = Math.max(260, window.innerHeight - 20);
      const h = Math.max(280, Math.min(maxH, s.winHeight));
      windowEl.style.height = h + "px";
      windowEl.style.maxHeight = "none";
    } else {
      windowEl.style.height = "";
      windowEl.style.maxHeight = "";
    }

    // ---- 毛玻璃 ----
    const blur = s.glass ? `blur(${s.glassBlur}px)` : "none";
    try {
      windowEl.style.backdropFilter = blur;
      windowEl.style.webkitBackdropFilter = blur;
    } catch (e) { }

    // ---- 背景 ----
    const alpha = Math.max(0, Math.min(1, s.winOpacity));
    if (s.bgImage) {
      const overlay = Math.max(0, Math.min(0.96, 1 - alpha));
      windowEl.style.backgroundImage = `linear-gradient(rgba(20,20,40,${overlay}), rgba(20,20,40,${overlay})), url("${s.bgImage}")`;
      windowEl.style.backgroundSize = "cover, cover";
      windowEl.style.backgroundPosition = "center, center";
      windowEl.style.backgroundRepeat = "no-repeat, no-repeat";
      windowEl.style.backgroundColor = "transparent";
    } else {
      windowEl.style.backgroundImage = "";
      windowEl.style.backgroundSize = "";
      windowEl.style.backgroundPosition = "";
      windowEl.style.backgroundRepeat = "";
      windowEl.style.backgroundColor = `rgba(20, 20, 40, ${alpha})`;
    }
  }

  // ===== 自定义 CSS =====
  let atScopeSupported = null;
  function checkAtScopeSupport() {
    if (atScopeSupported !== null) return atScopeSupported;
    try {
      if (typeof CSSStyleSheet === "undefined") { atScopeSupported = false; return false; }
      const sheet = new CSSStyleSheet();
      sheet.replaceSync("@scope (.zz-rm-probe) { .a { color: red } }");
      atScopeSupported = sheet.cssRules.length > 0 && /^@scope/i.test(sheet.cssRules[0].cssText);
    } catch (e) {
      atScopeSupported = false;
    }
    return atScopeSupported;
  }

  const cssSheetSupported = (() => {
    try {
      return typeof CSSStyleSheet !== "undefined" &&
        CSSStyleSheet.prototype &&
        typeof CSSStyleSheet.prototype.replaceSync === "function";
    } catch (e) { return false; }
  })();

  function isValidCSS(css) {
    if (!css || !css.trim()) return true;
    try {
      if (cssSheetSupported) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        return true;
      }
      const el = document.createElement("style");
      el.textContent = css;
      document.head.appendChild(el);
      const ok = !!(el.sheet && el.sheet.cssRules && el.sheet.cssRules.length >= 0);
      document.head.removeChild(el);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function applyCustomCSS() {
    let el = document.getElementById(CLS + "-custom");
    const css = (settings.customCSS || "").trim();
    if (!css || !isValidCSS(css)) {
      if (el) el.textContent = "";
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = CLS + "-custom";
      document.head.appendChild(el);
    }
    if (checkAtScopeSupport()) {
      el.textContent = `@scope (.${CLS}-win) {\n${css}\n}`;
    } else {
      el.textContent = `.${CLS}-win {\n${css}\n}`;
    }
  }

  function applyAllSettings() {
    applyTheme();
    applyWindowAppearance();
    applyCustomCSS();
    syncSettingsForm();
  }

  // ===== 图片处理 =====
  function readFileAsDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error("读取文件失败"));
      r.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("图片解析失败"));
      img.src = src;
    });
  }

  async function processImageFile(file) {
    const raw = await readFileAsDataURL(file);
    if (!raw || typeof raw !== "string") throw new Error("读取失败");
    const img = await loadImage(raw);
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("无效的图片尺寸");

    const MAX = 1920;
    const scale = Math.min(1, MAX / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    // 尺寸没超限且体积不大，直接使用原始数据（保留透明通道）
    if (scale === 1 && raw.length < 1_200_000) return raw;

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建画布");
    ctx.drawImage(img, 0, 0, tw, th);

    let out = canvas.toDataURL("image/jpeg", 0.85);
    let quality = 0.85;
    while (out.length > 2_200_000 && quality > 0.3) {
      quality -= 0.1;
      out = canvas.toDataURL("image/jpeg", quality);
    }
    return out;
  }

  // ===== UI =====
  const styles = `
    .${CLS}-btn{position:fixed;bottom:80px;right:20px;z-index:99998;width:56px;height:56px;border-radius:50%;border:none;background:${THEME_GRADIENT};cursor:pointer;box-shadow:0 4px 20px rgba(255,140,26,0.4);transition:all .3s cubic-bezier(.34,1.56,.64,1);display:flex;align-items:center;justify-content:center;user-select:none;touch-action:none;padding:0;overflow:hidden}
    .${CLS}-btn:hover{transform:scale(1.12) rotate(-5deg);box-shadow:0 8px 35px rgba(255,140,26,0.5)}
    .${CLS}-btn:active{transform:scale(.9)}
    .${CLS}-btn img{width:70%;height:70%;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));pointer-events:none}

    .${CLS}-win {
      position: fixed; top: 80px; left: 80px; width: 680px; max-width: 92vw; max-height: 85vh;
      background: rgba(20, 20, 40, 0.85); backdrop-filter: blur(30px); border-radius: 20px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 140, 26, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08); color: #e8e8e8;
      font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
      z-index: 99999; display: none; flex-direction: column; overflow: hidden;
      animation: ${CLS}-in .35s cubic-bezier(.34,1.56,.64,1);
    }
    .${CLS}-win.open { display: flex; }

    .${CLS}-hdr {
      display: flex; align-items: center; gap: 14px; padding: 16px 20px;
      background: rgba(255, 255, 255, 0.04); border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      cursor: move; user-select: none; flex-shrink: 0;
    }
    .${CLS}-hdr .${CLS}-title {
      flex: 1; font-size: 18px; font-weight: 700;
      background: ${THEME_GRADIENT}; -webkit-background-clip: text;
      -webkit-text-fill-color: transparent; background-clip: text;
      margin: 0; letter-spacing: -.3px; pointer-events: none;
    }
    .${CLS}-hdr .${CLS}-close {
      background: rgba(255, 255, 255, 0.05); border: none; color: rgba(255, 255, 255, 0.5);
      width: 34px; height: 34px; border-radius: 50%; font-size: 18px; cursor: pointer;
      transition: all .2s; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; pointer-events: auto;
    }
    .${CLS}-hdr .${CLS}-close:hover { background: rgba(255, 70, 70, 0.2); color: #ff6b6b; transform: scale(1.05); }

    .${CLS}-body { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 18px 22px 22px; }
    .${CLS}-body::-webkit-scrollbar { width: 4px; height: 4px; }
    .${CLS}-body::-webkit-scrollbar-track { background: transparent; }
    .${CLS}-body::-webkit-scrollbar-thumb { background: ${THEME_COLOR}; border-radius: 4px; }

    .${CLS}-back {
      background: rgba(255, 255, 255, 0.05); border: none; color: rgba(255, 255, 255, 0.5);
      width: 34px; height: 34px; border-radius: 50%; font-size: 20px; cursor: pointer;
      transition: all .2s; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; pointer-events: auto; padding: 0; line-height: 1;
    }
    .${CLS}-back:hover { background: rgba(255, 255, 255, 0.12); color: #fff; transform: scale(1.05); }

    .${CLS}-sel {
      background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px; padding: 4px 8px; font-size: 12px; color: #e8e8e8;
      cursor: pointer; transition: all .2s; outline: none; pointer-events: auto;
    }
    .${CLS}-sel:focus { border-color: ${THEME_COLOR}; box-shadow: 0 0 15px rgba(255, 140, 26, 0.08); }
    .${CLS}-sel option { background: #141428; color: #e8e8e8; }

    .${CLS}-tabs {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 4px;
      overflow-x: auto; scrollbar-width: none;
    }
    .${CLS}-tabs::-webkit-scrollbar { display: none; }
    .${CLS}-tab {
      flex: 1 0 auto; padding: 8px 10px; border: none; border-radius: 10px;
      background: transparent; color: rgba(255, 255, 255, 0.5);
      font-size: 12px; font-weight: 500; cursor: pointer; transition: all .2s;
      white-space: nowrap; min-width: 68px;
    }
    .${CLS}-tab:hover { color: rgba(255, 255, 255, 0.8); }
    .${CLS}-tab.active {
      background: ${THEME_GRADIENT}; color: #fff;
      box-shadow: 0 4px 15px rgba(255, 140, 26, 0.3);
    }

    .${CLS}-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 12px; margin: 4px 0 8px; }
    .${CLS}-card {
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px; padding: 12px 8px 10px; text-align: center; cursor: pointer;
      transition: all .3s cubic-bezier(.34, 1.56, .64, 1); position: relative; overflow: hidden;
    }
    .${CLS}-card:hover { transform: translateY(-4px) scale(1.02); border-color: ${THEME_COLOR}; box-shadow: 0 8px 30px rgba(255, 140, 26, 0.15); }
    .${CLS}-card:active { transform: scale(.95); }
    .${CLS}-card img { width: 100%; aspect-ratio: 1/1; object-fit: contain; border-radius: 10px; background: rgba(0, 0, 0, 0.3); position: relative; z-index: 1; }
    .${CLS}-card .${CLS}-name { font-size: 12px; font-weight: 500; color: #e8e8e8; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; position: relative; z-index: 1; }
    .${CLS}-card .${CLS}-badge { font-size: 10px; color: rgba(255, 255, 255, 0.5); margin-top: 2px; position: relative; z-index: 1; }
    .${CLS}-card .${CLS}-badge span { margin: 0 4px; }

    .${CLS}-card.${CLS}-add {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      border: 2px dashed rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.02);
      cursor: pointer; min-height: 120px; transition: all .3s cubic-bezier(.34, 1.56, .64, 1);
    }
    .${CLS}-card.${CLS}-add:hover { border-color: ${THEME_COLOR}; background: rgba(255, 140, 26, 0.08); transform: translateY(-4px) scale(1.02); box-shadow: 0 8px 30px rgba(255, 140, 26, 0.15); }
    .${CLS}-card.${CLS}-add:active { transform: scale(.95); }
    .${CLS}-card.${CLS}-add .${CLS}-add-icon { font-size: 36px; color: rgba(255, 255, 255, 0.3); transition: all .3s; line-height: 1; }
    .${CLS}-card.${CLS}-add:hover .${CLS}-add-icon { color: ${THEME_COLOR}; transform: rotate(90deg) scale(1.1); }
    .${CLS}-card.${CLS}-add .${CLS}-add-label { font-size: 11px; color: rgba(255, 255, 255, 0.4); margin-top: 6px; transition: color .3s; }
    .${CLS}-card.${CLS}-add:hover .${CLS}-add-label { color: rgba(255, 255, 255, 0.7); }

    .${CLS}-profile {
      display: flex; align-items: center; gap: 18px; margin-bottom: 20px; padding: 16px;
      background: rgba(255, 255, 255, 0.05); border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .${CLS}-profile img { width: 64px; height: 64px; object-fit: contain; border-radius: 12px; background: rgba(0, 0, 0, 0.3); flex-shrink: 0; border: 2px solid rgba(255, 255, 255, 0.06); }
    .${CLS}-profile .${CLS}-info { flex: 1; min-width: 0; }
    .${CLS}-profile .${CLS}-info .${CLS}-name { font-size: 17px; font-weight: 600; color: #e8e8e8; margin: 0; }
    .${CLS}-profile .${CLS}-info .${CLS}-meta { font-size: 12px; color: rgba(255, 255, 255, 0.5); margin: 4px 0 0 0; }
    .${CLS}-profile .${CLS}-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
    .${CLS}-profile .${CLS}-actions button { padding: 8px 14px; border: none; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all .2s; }
    .${CLS}-profile .${CLS}-actions .${CLS}-rename { background: ${THEME_GRADIENT}; color: #fff; }
    .${CLS}-profile .${CLS}-actions .${CLS}-rename:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(255, 140, 26, 0.3); }
    .${CLS}-profile .${CLS}-actions .${CLS}-delete { background: rgba(231, 76, 60, 0.2); color: #ff6b6b; border: 1px solid rgba(231, 76, 60, 0.2); }
    .${CLS}-profile .${CLS}-actions .${CLS}-delete:hover { background: rgba(231, 76, 60, 0.35); transform: scale(1.05); }
    .${CLS}-profile .${CLS}-actions .${CLS}-export { background: linear-gradient(135deg, #2ecc71, #27ae60); color: #fff; }
    .${CLS}-profile .${CLS}-actions .${CLS}-export:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3); }

    .${CLS}-sec { margin-top: 16px; }
    .${CLS}-sec-title {
      font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.5);
      margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .${CLS}-sec-title span { font-weight: 400; opacity: .6; text-transform: none; letter-spacing: 0; }
    .${CLS}-sec-title .${CLS}-sec-actions { margin-left: auto; display: flex; gap: 6px; align-items: center; }
    .${CLS}-sec-title .${CLS}-toggle-all {
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px; padding: 3px 12px; color: rgba(255, 255, 255, 0.6);
      font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s;
      text-transform: none; letter-spacing: 0;
    }
    .${CLS}-sec-title .${CLS}-toggle-all:hover { background: rgba(255, 140, 26, 0.12); border-color: ${THEME_COLOR}; color: ${THEME_COLOR}; }

    .${CLS}-list { display: flex; flex-direction: column; gap: 6px; }
    .${CLS}-item {
      display: flex; align-items: center; gap: 12px; padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05); border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06); transition: all .2s;
    }
    .${CLS}-item:hover { border-color: rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.08); }
    .${CLS}-item .${CLS}-idx { font-size: 11px; color: rgba(255, 255, 255, 0.5); flex-shrink: 0; min-width: 28px; }
    .${CLS}-item .${CLS}-item-name { flex: 1; font-size: 13px; color: #e8e8e8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .${CLS}-item .${CLS}-cur { font-size: 10px; color: ${THEME_COLOR}; background: rgba(255, 140, 26, 0.15); padding: 2px 10px; border-radius: 12px; flex-shrink: 0; font-weight: 500; }
    .${CLS}-item .${CLS}-item-del { background: none; border: none; color: rgba(255, 255, 255, 0.5); cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 6px; transition: all .2s; flex-shrink: 0; }
    .${CLS}-item .${CLS}-item-del:hover { color: #ff6b6b; background: rgba(231, 76, 60, 0.1); }
    .${CLS}-item .${CLS}-item-exp { background: none; border: none; color: rgba(255, 255, 255, 0.5); cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 6px; transition: all .2s; flex-shrink: 0; }
    .${CLS}-item .${CLS}-item-exp:hover { color: ${THEME_COLOR}; background: rgba(255, 140, 26, 0.1); }
    .${CLS}-empty { text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 14px; padding: 30px 0; }
    .${CLS}-empty .${CLS}-empty-icon { font-size: 32px; display: block; margin-bottom: 10px; opacity: .5; }

    .${CLS}-grp { margin-bottom: 14px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; overflow: hidden; }
    .${CLS}-grp-hdr { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(255, 255, 255, 0.04); cursor: pointer; transition: background .2s; user-select: none; }
    .${CLS}-grp-hdr:hover { background: rgba(255, 255, 255, 0.08); }
    .${CLS}-grp-hdr .${CLS}-caret { font-size: 12px; color: rgba(255, 255, 255, 0.3); transition: transform .3s; flex-shrink: 0; }
    .${CLS}-grp-hdr .${CLS}-caret.open { transform: rotate(90deg); }
    .${CLS}-grp-hdr .${CLS}-grp-name { font-size: 14px; font-weight: 600; color: #e8e8e8; flex: 1; }
    .${CLS}-grp-hdr .${CLS}-grp-count { font-size: 11px; color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.06); padding: 2px 12px; border-radius: 12px; }
    .${CLS}-grp-hdr .${CLS}-grp-badge { font-size: 10px; padding: 2px 10px; border-radius: 12px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.4); flex-shrink: 0; }
    .${CLS}-grp-hdr .${CLS}-grp-badge.stage { background: rgba(52, 152, 219, 0.15); color: #5dade2; }
    .${CLS}-grp-body { padding: 6px 10px 10px; display: block; }
    .${CLS}-grp-body.collapsed { display: none; }

    .${CLS}-var {
      display: flex; align-items: center; gap: 8px; padding: 5px 8px;
      background: rgba(255, 255, 255, 0.03); border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.04); transition: all .2s; margin-bottom: 4px;
    }
    .${CLS}-var:hover { border-color: rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.06); }
    .${CLS}-var.locked { border-color: rgba(255, 140, 26, 0.3); background: rgba(255, 140, 26, 0.06); }
    .${CLS}-var.broadcast { border-color: rgba(155, 89, 182, 0.25); background: rgba(155, 89, 182, 0.05); }
    .${CLS}-var .${CLS}-var-name { font-size: 12px; color: #e8e8e8; font-weight: 500; min-width: 60px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .${CLS}-var .${CLS}-var-type { font-size: 9px; padding: 1px 8px; border-radius: 10px; flex-shrink: 0; font-weight: 500; }
    .${CLS}-var-type.cloud { background: rgba(52, 152, 219, 0.2); color: #5dade2; min-width: 42px; text-align: center; padding: 1px 6px; }
    .${CLS}-var-type.cloudlist { background: rgba(26, 188, 156, 0.2); color: #48c9b0; min-width: 42px; text-align: center; padding: 1px 6px; }
    .${CLS}-var-type.list { background: rgba(46, 204, 113, 0.2); color: #58d68d; }
    .${CLS}-var-type.normal { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.4); }
    .${CLS}-var-type.broadcast { background: rgba(155, 89, 182, 0.25); color: #bb8fce; }
    .${CLS}-var .${CLS}-var-edit { flex: 1; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 3px 8px; font-size: 12px; color: #e8e8e8; font-family: 'SF Mono', 'Menlo', 'Monaco', monospace; min-width: 50px; transition: all .2s; }
    .${CLS}-var .${CLS}-var-edit:focus { outline: none; border-color: ${THEME_COLOR}; box-shadow: 0 0 15px rgba(255, 140, 26, 0.08); }
    .${CLS}-var .${CLS}-var-edit:disabled { opacity: 0.5; cursor: not-allowed; }
    .${CLS}-var .${CLS}-var-btn { background: ${THEME_GRADIENT}; border: none; border-radius: 6px; padding: 3px 12px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; flex-shrink: 0; }
    .${CLS}-var .${CLS}-var-btn:hover { transform: scale(1.05); box-shadow: 0 2px 10px rgba(255, 140, 26, 0.3); }
    .${CLS}-var .${CLS}-var-lock { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 2px 8px; color: rgba(255, 255, 255, 0.3); font-size: 11px; cursor: pointer; transition: all .2s; flex-shrink: 0; }
    .${CLS}-var .${CLS}-var-lock:hover { background: rgba(255, 140, 26, 0.1); border-color: ${THEME_COLOR}; color: ${THEME_COLOR}; }
    .${CLS}-var .${CLS}-var-lock.locked { background: rgba(255, 140, 26, 0.15); border-color: ${THEME_COLOR}; color: ${THEME_COLOR}; }
    .${CLS}-var .${CLS}-var-trigger { background: linear-gradient(135deg, #9b59b6, #8e44ad); border: none; border-radius: 6px; padding: 3px 12px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; flex-shrink: 0; margin-left: auto; }
    .${CLS}-var .${CLS}-var-trigger:hover { transform: scale(1.05); box-shadow: 0 2px 10px rgba(155, 89, 182, 0.4); }
    .${CLS}-var .${CLS}-var-trigger:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.35); }
    .${CLS}-var .${CLS}-var-int { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 2px 8px; color: rgba(255, 255, 255, 0.3); font-size: 11px; cursor: pointer; transition: all .2s; flex-shrink: 0; }
    .${CLS}-var .${CLS}-var-int:hover { background: rgba(155, 89, 182, 0.12); border-color: #9b59b6; color: #bb8fce; }
    .${CLS}-var .${CLS}-var-int.locked { background: rgba(155, 89, 182, 0.2); border-color: #9b59b6; color: #bb8fce; }

    .${CLS}-ext-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin: 4px 0 8px; }
    .${CLS}-ext {
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px; padding: 14px 12px; cursor: pointer;
      transition: all .3s cubic-bezier(.34, 1.56, .64, 1);
      position: relative; overflow: hidden; text-align: left;
    }
    .${CLS}-ext:hover { transform: translateY(-4px) scale(1.02); border-color: ${THEME_COLOR}; box-shadow: 0 8px 30px rgba(255, 140, 26, 0.15); }
    .${CLS}-ext:active { transform: scale(.97); }
    .${CLS}-ext .${CLS}-ext-name { font-size: 14px; font-weight: 600; color: #e8e8e8; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .${CLS}-ext .${CLS}-ext-meta { font-size: 11px; color: rgba(255, 255, 255, 0.5); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .${CLS}-ext .${CLS}-ext-badge { font-size: 10px; padding: 2px 10px; border-radius: 12px; background: rgba(255, 140, 26, 0.15); color: ${THEME_COLOR}; font-weight: 600; }
    .${CLS}-ext.all-locked { border-color: rgba(231, 76, 60, 0.6); background: rgba(231, 76, 60, 0.08); opacity: 0.85; }
    .${CLS}-ext.all-locked .${CLS}-ext-name { color: #ff6b6b; }
    .${CLS}-ext.all-locked .${CLS}-ext-badge { background: rgba(231, 76, 60, 0.25); color: #ff6b6b; }

    .${CLS}-op-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; margin: 4px 0 8px; }
    .${CLS}-op {
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 8px;
      transition: all .2s; cursor: pointer;
    }
    .${CLS}-op:hover { border-color: rgba(255, 255, 255, 0.16); background: rgba(255, 255, 255, 0.07); }
    .${CLS}-op.locked { border-color: rgba(255, 140, 26, 0.5); background: rgba(255, 140, 26, 0.08); }
    .${CLS}-op .${CLS}-op-name { flex: 1; font-size: 12px; color: #e8e8e8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .${CLS}-op .${CLS}-op-lock { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 2px 8px; color: rgba(255, 255, 255, 0.3); font-size: 11px; cursor: pointer; transition: all .2s; flex-shrink: 0; }
    .${CLS}-op .${CLS}-op-lock:hover { background: rgba(255, 140, 26, 0.1); border-color: ${THEME_COLOR}; color: ${THEME_COLOR}; }
    .${CLS}-op .${CLS}-op-lock.locked { background: rgba(255, 140, 26, 0.15); border-color: ${THEME_COLOR}; color: ${THEME_COLOR}; }

    .${CLS}-toast {
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px);
      z-index: 100000; padding: 12px 24px; border-radius: 12px;
      background: rgba(20, 20, 40, 0.9); backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.06); color: #e8e8e8;
      font-family: -apple-system, 'PingFang SC', sans-serif; font-size: 13px; font-weight: 500;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8); opacity: 0;
      transition: all .4s cubic-bezier(.34, 1.56, .64, 1);
      pointer-events: none; max-width: 80%;
    }
    .${CLS}-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .${CLS}-toast.success { border-color: rgba(46, 204, 113, 0.3); }
    .${CLS}-toast.error { border-color: rgba(231, 76, 60, 0.3); }

    @keyframes ${CLS}-in {
      from { opacity: 0; transform: scale(.92) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .${CLS}-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .${CLS}-row label { font-size: 12px; color: rgba(255, 255, 255, 0.6); min-width: 40px; }
    .${CLS}-row input[type=number] { flex: 1; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 4px 8px; color: #e8e8e8; font-size: 12px; outline: none; transition: all .2s; min-width: 0; }
    .${CLS}-row input[type=number]:focus { border-color: ${THEME_COLOR}; box-shadow: 0 0 15px rgba(255, 140, 26, 0.08); }
    .${CLS}-lock-btn { width: 30px; height: 28px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.04); color: rgba(255, 255, 255, 0.4); cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; padding: 0; transition: all .2s; flex-shrink: 0; }
    .${CLS}-lock-btn:hover { background: rgba(255, 255, 255, 0.1); }
    .${CLS}-lock-btn.locked { background: rgba(255, 209, 102, 0.2); border-color: #ffd166; color: #ffd166; }
    .${CLS}-switch { width: 40px; height: 20px; border-radius: 10px; background: #444; position: relative; cursor: pointer; transition: background .2s; flex-shrink: 0; }
    .${CLS}-switch.on { background: #3a7bd5; }
    .${CLS}-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left .2s; }
    .${CLS}-switch.on::after { left: 22px; }

    .${CLS}-clone { border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 8px; margin-top: 8px; }
    .${CLS}-clone-hdr { display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: #ffb454; font-size: 12px; user-select: none; }
    .${CLS}-clone-list { margin-top: 6px; display: none; flex-direction: column; gap: 4px; }
    .${CLS}-clone-list.open { display: flex; }
    .${CLS}-clone-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; }
    .${CLS}-clone-item:hover { background: rgba(255, 255, 255, 0.05); }
    .${CLS}-clone-item.active { background: rgba(0, 210, 255, 0.18); }

    .${CLS}-rt-mode { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; flex-wrap: wrap; }
    .${CLS}-rt-mode label { font-size: 12px; color: rgba(255, 255, 255, 0.6); flex-shrink: 0; }
    .${CLS}-rt-mode select { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 4px 8px; font-size: 12px; color: #e8e8e8; cursor: pointer; outline: none; transition: all .2s; }
    .${CLS}-rt-mode select:focus { border-color: ${THEME_COLOR}; }
    .${CLS}-rt-mode select option { background: #141428; color: #e8e8e8; }

    .${CLS}-rt-search { flex: 1; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 5px 10px; font-size: 12px; color: #e8e8e8; outline: none; transition: all .2s; min-width: 60px; }
    .${CLS}-rt-search:focus { border-color: ${THEME_COLOR}; box-shadow: 0 0 15px rgba(255, 140, 26, 0.08); }

    .${CLS}-rt-card.disabled { opacity: 0.45; cursor: default; }
    .${CLS}-rt-card.disabled:hover { transform: none; border-color: rgba(255, 255, 255, 0.06); box-shadow: none; }
    .${CLS}-rt-card .${CLS}-rt-nomatch { font-size: 10px; color: rgba(255, 255, 255, 0.4); margin-top: 4px; }

    .${CLS}-rt-row {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px;
      background: rgba(255, 255, 255, 0.03); border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05); transition: all .2s;
      margin-bottom: 6px; flex-wrap: wrap;
    }
    .${CLS}-rt-row:hover { border-color: rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.06); }
    .${CLS}-rt-row.disabled { opacity: 0.5; }
    .${CLS}-rt-row .${CLS}-rt-name { flex: 1 1 160px; font-size: 12px; color: #e8e8e8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 100px; }
    .${CLS}-rt-row .${CLS}-rt-tag { font-size: 10px; padding: 2px 10px; border-radius: 12px; flex-shrink: 0; font-weight: 600; }
    .${CLS}-rt-tag.on { background: rgba(255, 140, 26, 0.18); color: ${THEME_COLOR}; }
    .${CLS}-rt-tag.off { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.4); }
    .${CLS}-rt-row .${CLS}-rt-sel { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 3px 6px; font-size: 11px; color: #e8e8e8; cursor: pointer; outline: none; transition: all .2s; flex-shrink: 0; }
    .${CLS}-rt-row .${CLS}-rt-sel:focus { border-color: ${THEME_COLOR}; }
    .${CLS}-rt-row .${CLS}-rt-sel option { background: #141428; color: #e8e8e8; }
    .${CLS}-rt-row .${CLS}-rt-input { flex: 1 1 90px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 4px 8px; font-size: 12px; color: #e8e8e8; font-family: 'SF Mono', 'Menlo', 'Monaco', monospace; outline: none; transition: all .2s; min-width: 60px; }
    .${CLS}-rt-row .${CLS}-rt-input:focus { border-color: ${THEME_COLOR}; box-shadow: 0 0 15px rgba(255, 140, 26, 0.08); }
    .${CLS}-rt-row .${CLS}-rt-input:disabled { opacity: 0.4; cursor: not-allowed; }
    .${CLS}-rt-row .${CLS}-rt-apply { background: ${THEME_GRADIENT}; border: none; border-radius: 6px; padding: 4px 12px; color: #fff; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; flex-shrink: 0; }
    .${CLS}-rt-row .${CLS}-rt-apply:hover { transform: scale(1.05); box-shadow: 0 2px 10px rgba(255, 140, 26, 0.3); }
    .${CLS}-rt-row .${CLS}-rt-apply:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }
    .${CLS}-rt-row .${CLS}-rt-blocked { font-size: 10px; color: #ff6b6b; flex-shrink: 0; }

    /* ===== 设置面板 ===== */
    .${CLS}-set { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .${CLS}-set-row {
      display: flex; align-items: center; gap: 10px; padding: 9px 12px;
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px; flex-wrap: wrap;
    }
    .${CLS}-set-row > label {
      font-size: 12px; color: rgba(255, 255, 255, 0.6);
      flex: 0 0 76px; flex-shrink: 0;
    }
    .${CLS}-set-row input[type=range] {
      flex: 1 1 120px; min-width: 100px; height: 4px; cursor: pointer;
      accent-color: ${THEME_COLOR};
    }
    .${CLS}-set-row input[type=color] {
      width: 40px; height: 28px; border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px; background: transparent; cursor: pointer;
      padding: 2px; flex-shrink: 0;
    }
    .${CLS}-set-row input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
    .${CLS}-set-row input[type=color]::-webkit-color-swatch { border: none; border-radius: 4px; }
    .${CLS}-set-input {
      background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px; padding: 4px 8px; font-size: 12px; color: #e8e8e8;
      outline: none; font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
      width: 88px; flex-shrink: 0; transition: all .2s;
    }
    .${CLS}-set-input:focus { border-color: ${THEME_COLOR}; box-shadow: 0 0 15px rgba(255, 140, 26, 0.08); }
    .${CLS}-set-val {
      font-size: 11px; color: rgba(255, 255, 255, 0.5); min-width: 56px;
      text-align: right; font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
      flex-shrink: 0;
    }
    .${CLS}-set-btn {
      background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px; padding: 5px 14px; font-size: 12px; color: #e8e8e8;
      cursor: pointer; transition: all .2s; flex-shrink: 0;
      font-family: inherit;
    }
    .${CLS}-set-btn:hover {
      background: rgba(255, 140, 26, 0.15); border-color: ${THEME_COLOR}; color: ${THEME_COLOR};
    }
    .${CLS}-set-btn:active { transform: scale(0.96); }
    .${CLS}-set-btn.danger:hover {
      background: rgba(231, 76, 60, 0.2); border-color: #ff6b6b; color: #ff6b6b;
    }
    .${CLS}-set-tip {
      font-size: 11px; color: rgba(255, 255, 255, 0.35);
      padding: 0 4px; line-height: 1.6;
    }
    .${CLS}-bg-preview {
      width: 72px; height: 42px; border-radius: 8px;
      background: rgba(0, 0, 0, 0.3) center/cover no-repeat;
      border: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: rgba(255, 255, 255, 0.3); overflow: hidden;
    }
    .${CLS}-css-area {
      width: 100%; min-height: 280px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px; padding: 12px; color: #e8e8e8;
      font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
      font-size: 12px; line-height: 1.6; outline: none;
      resize: vertical; box-sizing: border-box; transition: border-color .2s;
    }
    .${CLS}-css-area:focus { border-color: ${THEME_COLOR}; box-shadow: 0 0 15px rgba(255, 140, 26, 0.08); }
    .${CLS}-css-status { font-size: 12px; align-self: center; }

    .${CLS}-resizer {
      position: absolute; right: 0; bottom: 0; width: 22px; height: 22px;
      cursor: nwse-resize; z-index: 20; opacity: .45; transition: opacity .2s;
      touch-action: none;
    }
    .${CLS}-resizer:hover { opacity: 1; }
    .${CLS}-resizer::after {
      content: ''; position: absolute; right: 4px; bottom: 4px;
      width: 10px; height: 10px;
      border-right: 2px solid rgba(255, 255, 255, 0.5);
      border-bottom: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 0 0 3px 0;
    }
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
    toastEl.id = TOAST_ID;
    toastEl.className = `${CLS}-toast`;
    document.body.appendChild(toastEl);
  }

  function showToast(message, type = "success", duration = 2000) {
    createToast();
    const icon = type === "success" ? "✓" : "✕";
    toastEl.innerHTML = `<span style="color:${type === 'success' ? '#2ecc71' : '#ff6b6b'}">${icon}</span> ${message}`;
    toastEl.className = `${CLS}-toast ${type}`;
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => { toastEl.classList.remove("show"); }, duration);
  }

  function initStyles() {
    applyTheme();
  }

  function createUI() {
    if (isUIRendered) return;
    isUIRendered = true;
    initStyles();

    if (!floatBtn || !document.body.contains(floatBtn)) {
      if (floatBtn && document.body.contains(floatBtn)) floatBtn.remove();
      floatBtn = document.createElement("button");
      floatBtn.className = `${CLS}-btn`;
      floatBtn.innerHTML = `<img src="${ICON_DATA_URL}" alt="">`;
      floatBtn.title = "角色管理器Pro";
      floatBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (floatBtn._justDragged) { floatBtn._justDragged = false; return; }
        toggleUI();
      });
      document.body.appendChild(floatBtn);
      makeDraggable(floatBtn);
    }

    if (!windowEl || !document.body.contains(windowEl)) {
      if (windowEl && document.body.contains(windowEl)) windowEl.remove();
      windowEl = document.createElement("div");
      windowEl.className = `${CLS}-win`;
      document.body.appendChild(windowEl);
    }

    applyWindowAppearance();

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closeUI();
    });
  }

  function makeDraggable(el) {
    let isDragging = false, hasMoved = false, startX, startY, startLeft, startTop;
    const DRAG_THRESHOLD = 4;

    const onStart = (e) => {
      if (e.type === "mousedown" && e.button !== 0) return;
      const touch = e.touches ? e.touches[0] : e;
      isDragging = true; hasMoved = false;
      startX = touch.clientX; startY = touch.clientY;
      const rect = el.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
    };
    const onMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX, dy = touch.clientY - startY;
      if (!hasMoved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      hasMoved = true;
      let left = startLeft + dx, top = startTop + dy;
      left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, left));
      top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, top));
      el.style.left = left + "px"; el.style.top = top + "px";
      el.style.right = "auto"; el.style.bottom = "auto";
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

  // 窗口拖动：全局监听只绑定一次
  let winDragBound = false;
  const winDragState = { active: false, sx: 0, sy: 0, sl: 0, st: 0 };

  function winDragStart(e) {
    if (e.target.closest("button, select, input, textarea, ." + CLS + "-resizer")) return;
    if (e.type === "mousedown" && e.button !== 0) return;
    if (!windowEl) return;
    const touch = e.touches ? e.touches[0] : e;
    winDragState.active = true;
    winDragState.sx = touch.clientX;
    winDragState.sy = touch.clientY;
    const rect = windowEl.getBoundingClientRect();
    winDragState.sl = rect.left;
    winDragState.st = rect.top;
  }

  function winDragMove(e) {
    if (!winDragState.active || !windowEl) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - winDragState.sx;
    const dy = touch.clientY - winDragState.sy;
    let left = winDragState.sl + dx;
    let top = winDragState.st + dy;
    left = Math.max(0, Math.min(window.innerWidth - windowEl.offsetWidth, left));
    top = Math.max(0, Math.min(window.innerHeight - windowEl.offsetHeight, top));
    windowEl.style.left = left + "px";
    windowEl.style.top = top + "px";
    windowEl.style.right = "auto";
    windowEl.style.bottom = "auto";
    if (e.cancelable) e.preventDefault();
  }

  function winDragEnd() {
    winDragState.active = false;
  }

  function makeWindowDraggable(handle) {
    if (!handle) return;
    handle.addEventListener("mousedown", winDragStart);
    handle.addEventListener("touchstart", winDragStart, { passive: true });
    if (!winDragBound) {
      winDragBound = true;
      document.addEventListener("mousemove", winDragMove);
      document.addEventListener("touchmove", winDragMove, { passive: false });
      document.addEventListener("mouseup", winDragEnd);
      document.addEventListener("touchend", winDragEnd);
      document.addEventListener("touchcancel", winDragEnd);
    }
    ensureResizer();
  }

  // ===== 右下角缩放 =====
  function ensureResizer() {
    if (!windowEl) return;
    let r = windowEl.querySelector(`.${CLS}-resizer`);
    if (!r) {
      r = document.createElement("div");
      r.className = `${CLS}-resizer`;
      windowEl.appendChild(r);
    }
    if (r._bound) return;
    r._bound = true;

    let dragging = false, sx = 0, sy = 0, sw = 0, sh = 0;

    const onDown = (e) => {
      if (e.type === "mousedown" && e.button !== 0) return;
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      dragging = true;
      const t = e.touches ? e.touches[0] : e;
      sx = t.clientX; sy = t.clientY;
      const rect = windowEl.getBoundingClientRect();
      sw = rect.width; sh = rect.height;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchend", onUp);
      document.addEventListener("touchcancel", onUp);
    };

    const onMove = (e) => {
      if (!dragging) return;
      const t = e.touches ? e.touches[0] : e;
      const w = Math.max(420, Math.min(window.innerWidth - 20, sw + (t.clientX - sx)));
      const h = Math.max(300, Math.min(window.innerHeight - 20, sh + (t.clientY - sy)));
      settings.winWidth = Math.round(w);
      settings.winHeight = Math.round(h);
      applyWindowAppearance();
      syncSettingsForm();
      if (e.cancelable) e.preventDefault();
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
      document.removeEventListener("touchcancel", onUp);
      saveSettings();
    };

    r.addEventListener("mousedown", onDown);
    r.addEventListener("touchstart", onDown, { passive: false });
  }

  function toggleUI() { if (isOpen) closeUI(); else openUI(); }

  function openUI() {
    if (!currentVm) {
      getVM().then((v) => {
        if (v) {
          currentVm = v; vm = v;
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
    applyAllSettings();
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
    currentRtDetail = null;
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
      currentView = "audit"; renderAudit();
    } else if (tab === "extensions") {
      currentView = "extensions"; renderExtensions();
    } else if (tab === "returntamper") {
      currentView = "returntamper"; renderReturnTamperMain();
    } else if (tab === "settings") {
      currentView = "settings"; renderSettings();
    } else if (tab === "customcss") {
      currentView = "customcss"; renderCustomCSS();
    } else {
      currentView = "list"; renderMain();
    }
  }

  function toggleGroup(targetId) {
    if (collapsedGroups.has(targetId)) collapsedGroups.delete(targetId);
    else collapsedGroups.add(targetId);
    renderMain();
  }

  // ===== 通用标签栏 =====
  function renderTabsHTML() {
    const tabs = [
      ["sprites", "角色"],
      ["stage", "舞台"],
      ["variables", "变量与消息"],
      ["extensions", "扩展"],
      ["returntamper", "扩展返回值"],
      ["audit", "审计"],
      ["settings", "设置"],
      ["customcss", "自定义样式"]
    ];
    let html = `<div class="${CLS}-tabs">`;
    for (const [key, label] of tabs) {
      html += `<button class="${CLS}-tab ${currentTab === key ? 'active' : ''}" data-tab="${key}">${label}</button>`;
    }
    html += `</div>`;
    return html;
  }

  function bindCommonHeader(container) {
    const header = container.querySelector(`#${CLS}-hdr`);
    if (header) makeWindowDraggable(header);
    const closeBtn = container.querySelector(`#${CLS}-close`);
    if (closeBtn) closeBtn.addEventListener("click", closeUI);
    const tabs = container.querySelectorAll(`.${CLS}-tab`);
    tabs.forEach(tab => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  }

  function renderMain() {
    if (renderLock || !windowEl) return;
    renderLock = true;
    try {
      if (currentVm) revalidateLocks(currentVm);
      const sprites = getSprites(currentVm);
      const groups = getVariablesGrouped(currentVm);

      let html = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <h3 class="${CLS}-title">角色管理器Pro</h3>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          ${renderTabsHTML()}
      `;

      if (currentTab === "sprites") html += renderSpriteListHTML(sprites);
      else if (currentTab === "variables") html += renderVariableGroupsHTML(groups);

      html += `</div>`;
      windowEl.innerHTML = html;

      bindCommonHeader(windowEl);

      if (currentTab === "sprites") bindSpriteEvents(windowEl, sprites);
      else if (currentTab === "variables") bindVariableEvents(windowEl);
    } finally { renderLock = false; }
  }

  function renderSpriteListHTML(sprites) {
    let html = `<div class="${CLS}-grid">`;
    html += `<div class="${CLS}-card ${CLS}-add" id="${CLS}-add-sprite"><div class="${CLS}-add-icon">＋</div><div class="${CLS}-add-label">插入角色</div></div>`;
    for (let i = 0; i < sprites.length; i++) {
      const s = sprites[i];
      html += `
        <div class="${CLS}-card" data-index="${i}">
          <img src="${s.costumePreview || ''}" alt="${s.name}" loading="lazy">
          <div class="${CLS}-name">${s.name}</div>
          <div class="${CLS}-badge"><span>🖼${s.costumeCount}</span><span>🔊${s.soundCount}</span></div>
        </div>
      `;
    }
    html += `</div>`;
    return html;
  }

  function bindSpriteEvents(container, sprites) {
    const addBtn = container.querySelector(`#${CLS}-add-sprite`);
    if (addBtn) {
      addBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const success = await insertSprite(currentVm);
        if (success) renderMain();
      });
    }
    const cards = container.querySelectorAll(`.${CLS}-card:not(.${CLS}-add)`);
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
      return `<div class="${CLS}-empty"><span class="${CLS}-empty-icon">?</span>暂无变量</div>`;
    }
    let html = `<div class="${CLS}-sec">`;
    for (const group of groups) {
      const isCollapsed = collapsedGroups.has(group.targetId);
      const realVarCount = group.variables.filter(v => !v.isBroadcast).length;
      const broadcastCount = group.variables.filter(v => v.isBroadcast).length;
      const totalCount = group.variables.length;
      const stageLabel = group.isStage ? '舞台' : group.targetName;
      let countLabel;
      if (totalCount === 0) countLabel = '无内容';
      else if (realVarCount === 0 && broadcastCount > 0) countLabel = '仅消息';
      else countLabel = `${realVarCount} 个项目`;

      html += `
        <div class="${CLS}-grp" data-target-id="${group.targetId}">
          <div class="${CLS}-grp-hdr" data-target-id="${group.targetId}">
            <span class="${CLS}-caret ${isCollapsed ? '' : 'open'}">▶</span>
            <span class="${CLS}-grp-name">${stageLabel}</span>
            <span class="${CLS}-grp-badge ${group.isStage ? 'stage' : ''}">${group.isStage ? '舞台' : '角色'}</span>
            <span class="${CLS}-grp-count">${countLabel}</span>
          </div>
          <div class="${CLS}-grp-body ${isCollapsed ? 'collapsed' : ''}">
      `;

      if (totalCount === 0) html += `<div class="${CLS}-empty" style="padding:14px 0;">该角色没有变量或消息</div>`;

      for (const v of group.variables) {
        if (v.isBroadcast) {
          const escapedName = String(v.name).replace(/"/g, '&quot;');
          const interceptLocked = isBroadcastInterceptLocked(v.name);
          html += `
            <div class="${CLS}-var broadcast" data-var-id="${v.id}">
              <span class="${CLS}-var-name" title="${escapedName}">${v.name}</span>
              <span class="${CLS}-var-type broadcast">消息</span>
              <button class="${CLS}-var-trigger" data-broadcast-name="${escapedName}" ${interceptLocked ? 'disabled' : ''}>触发</button>
              <button class="${CLS}-var-int ${interceptLocked ? 'locked' : ''}" data-broadcast-name="${escapedName}">${interceptLocked ? '🔒' : '🔓'}</button>
            </div>
          `;
          continue;
        }

        const isLocked = variableLocks.has(v.id);
        let typeClass, typeLabel;
        if (v.isCloud && v.isList) { typeClass = 'cloudlist'; typeLabel = '云列表'; }
        else if (v.isCloud) { typeClass = 'cloud'; typeLabel = '云变量'; }
        else if (v.isList) { typeClass = 'list'; typeLabel = '列表'; }
        else { typeClass = 'normal'; typeLabel = '变量'; }
        const displayVal = v.isList ? JSON.stringify(v.value) : String(v.value);
        const lockedClass = isLocked ? 'locked' : '';

        html += `
          <div class="${CLS}-var ${lockedClass}" data-var-id="${v.id}">
            <span class="${CLS}-var-name" title="${v.name}">${v.name}</span>
            <span class="${CLS}-var-type ${typeClass}">${typeLabel}</span>
            <input class="${CLS}-var-edit" type="text" value="${displayVal.replace(/"/g, '&quot;')}" data-var-id="${v.id}" data-target-id="${v.targetId}" data-is-list="${v.isList}">
            <button class="${CLS}-var-btn" data-var-id="${v.id}" data-target-id="${v.targetId}" data-is-list="${v.isList}">更新</button>
            <button class="${CLS}-var-lock ${isLocked ? 'locked' : ''}" data-var-id="${v.id}" data-target-id="${v.targetId}">${isLocked ? '🔒' : '🔓'}</button>
          </div>
        `;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
    return html;
  }

  function bindVariableEvents(container) {
    const groupHeaders = container.querySelectorAll(`.${CLS}-grp-hdr`);
    groupHeaders.forEach(header => {
      header.addEventListener("click", () => toggleGroup(header.dataset.targetId));
    });

    const triggerBtns = container.querySelectorAll(`.${CLS}-var-trigger`);
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

    const interceptBtns = container.querySelectorAll(`.${CLS}-var-int`);
    interceptBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = btn.dataset.broadcastName;
        if (!name) return;
        toggleBroadcastInterceptLock(name);
        const locked = isBroadcastInterceptLocked(name);
        btn.classList.toggle("locked", locked);
        btn.textContent = locked ? "🔒" : "🔓";
        const row = btn.closest(`.${CLS}-var`);
        if (row) {
          const triggerBtn = row.querySelector(`.${CLS}-var-trigger`);
          if (triggerBtn) triggerBtn.disabled = locked;
        }
      });
    });

    const updateBtns = container.querySelectorAll(`.${CLS}-var-btn`);
    updateBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const varId = btn.dataset.varId;
        const targetId = btn.dataset.targetId;
        const isList = btn.dataset.isList === 'true';
        const input = btn.parentElement.querySelector(`.${CLS}-var-edit`);
        if (!input) return;

        const rawValue = input.value;
        let value;
        if (isList) {
          try {
            value = JSON.parse(rawValue);
            if (!Array.isArray(value)) { showToast("列表值必须是JSON数组格式，如 [1,2,3]", "error"); return; }
          } catch (e) { showToast("列表值必须是JSON数组格式，如 [1,2,3]", "error"); return; }
        } else {
          if (rawValue === 'true') value = true;
          else if (rawValue === 'false') value = false;
          else if (rawValue === 'null') value = null;
          else if (rawValue === '') value = '';
          else if (!isNaN(rawValue) && rawValue.trim() !== '') value = Number(rawValue);
          else value = rawValue;
        }

        if (setVariable(currentVm, targetId, varId, value)) {
          showToast(variableLocks.has(varId) ? "变量已更新 (锁定值同步更新)" : "变量已更新");
          setTimeout(() => renderMain(), 0);
        } else {
          showToast("更新变量失败", "error");
        }
      });
    });

    const inputs = container.querySelectorAll(`.${CLS}-var-edit`);
    inputs.forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const btn = input.parentElement.querySelector(`.${CLS}-var-btn`);
          if (btn) btn.click();
        }
      });
    });

    const lockBtns = container.querySelectorAll(`.${CLS}-var-lock`);
    lockBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const varId = btn.dataset.varId;
        const targetId = btn.dataset.targetId;
        const input = btn.parentElement.querySelector(`.${CLS}-var-edit`);
        let lockValue;
        if (input) {
          const isList = input.dataset.isList === 'true';
          if (isList) { try { lockValue = JSON.parse(input.value); } catch { lockValue = []; } }
          else {
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
          const row = btn.closest(`.${CLS}-var`);
          if (row) row.classList.remove("locked");
          setTimeout(() => renderMain(), 0);
        } else {
          if (lockVariable(currentVm, varId, targetId, lockValue)) {
            btn.classList.add("locked");
            btn.textContent = "🔒";
            const row = btn.closest(`.${CLS}-var`);
            if (row) row.classList.add("locked");
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
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <h3 class="${CLS}-title">扩展拦截</h3>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          ${renderTabsHTML()}
      `;
      if (extensions.length === 0) {
        html += `<div class="${CLS}-empty"><span class="${CLS}-empty-icon">?</span>暂无扩展</div>`;
      } else {
        html += `<div class="${CLS}-sec-title">已加载扩展 <span>(${extensions.length})</span></div>`;
        html += `<div class="${CLS}-ext-grid">`;
        for (const ext of extensions) {
          const allLockedClass = ext.allLocked ? "all-locked" : "";
          html += `
            <div class="${CLS}-ext ${allLockedClass}" data-prefix="${ext.prefix}">
              <div class="${CLS}-ext-name">${ext.name}</div>
              <div class="${CLS}-ext-meta">
                <span>${ext.totalCount} 个 opcode</span>
                ${ext.lockedCount > 0 ? `<span class="${CLS}-ext-badge">已锁 ${ext.lockedCount}</span>` : ''}
                ${ext.allLocked ? `<span class="${CLS}-ext-badge">全锁</span>` : ''}
              </div>
            </div>
          `;
        }
        html += `</div>`;
      }
      html += `</div>`;
      windowEl.innerHTML = html;

      bindCommonHeader(windowEl);

      const cards = windowEl.querySelectorAll(`.${CLS}-ext`);
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
    } finally { renderLock = false; }
  }

  function renderExtensionDetail() {
    if (renderLock || !windowEl || !currentExtDetail) return;
    renderLock = true;
    try {
      const ext = getLoadedExtensions(currentVm).find(e => e.prefix === currentExtDetail.prefix);
      if (!ext) { goBack(); return; }
      currentExtDetail = ext;

      let html = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <button class="${CLS}-back" id="${CLS}-back">‹</button>
          <h3 class="${CLS}-title">${ext.name}</h3>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          <div class="${CLS}-sec-title">OPCODE 列表 <span>(${ext.totalCount})</span>
            <div class="${CLS}-sec-actions">
              <button class="${CLS}-toggle-all" id="${CLS}-toggle-all">
                ${ext.allLocked ? '全部解除' : '全部拦截'}
              </button>
            </div>
          </div>
          <div class="${CLS}-op-grid" id="${CLS}-op-grid">
      `;
      for (const op of ext.opcodes) {
        const locked = isExtensionInterceptLocked(op);
        const displayName = getOpcodeDisplayName(currentVm, op);
        html += `
          <div class="${CLS}-op ${locked ? 'locked' : ''}" data-opcode="${op}">
            <span class="${CLS}-op-name" title="${displayName}">${displayName}</span>
            <button class="${CLS}-op-lock ${locked ? 'locked' : ''}" data-opcode="${op}">${locked ? '🔒' : '🔓'}</button>
          </div>
        `;
      }
      html += `</div></div>`;
      windowEl.innerHTML = html;

      const header = windowEl.querySelector(`#${CLS}-hdr`);
      if (header) makeWindowDraggable(header);
      const closeBtn = windowEl.querySelector(`#${CLS}-close`);
      if (closeBtn) closeBtn.addEventListener("click", closeUI);
      const backBtn = windowEl.querySelector(`#${CLS}-back`);
      if (backBtn) backBtn.addEventListener("click", () => { currentView = "extensions"; renderExtensions(); });

      const toggleAllBtn = windowEl.querySelector(`#${CLS}-toggle-all`);
      if (toggleAllBtn) {
        toggleAllBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const curExt = getLoadedExtensions(currentVm).find(x => x.prefix === ext.prefix);
          if (!curExt) return;
          const shouldLock = !curExt.allLocked;
          for (const op of curExt.opcodes) {
            if (shouldLock) {
              if (!isExtensionInterceptLocked(op)) {
                EXTENSION_INTERCEPT_LOCKED.add(op);
                applyExtensionLockToRuntime(currentVm, op, true);
              }
            } else {
              if (isExtensionInterceptLocked(op)) {
                EXTENSION_INTERCEPT_LOCKED.delete(op);
                applyExtensionLockToRuntime(currentVm, op, false);
              }
            }
          }
          showToast(shouldLock ? `已全部拦截 "${curExt.name}"` : `已全部解除 "${curExt.name}"`);
          renderExtensionDetail();
        });
      }

      const lockBtns = windowEl.querySelectorAll(`.${CLS}-op-lock`);
      lockBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleExtensionInterceptLock(btn.dataset.opcode);
          renderExtensionDetail();
        });
      });

      const opCards = windowEl.querySelectorAll(`.${CLS}-op`);
      opCards.forEach(card => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(`.${CLS}-op-lock`)) return;
          toggleExtensionInterceptLock(card.dataset.opcode);
          renderExtensionDetail();
        });
      });
    } finally { renderLock = false; }
  }

  function renderReturnTamperMain() {
    if (renderLock || !windowEl) return;
    renderLock = true;
    try {
      const groups = getRtGroups(currentVm);
      const keyword = rtMainSearch.trim().toLowerCase();

      let html = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <h3 class="${CLS}-title">扩展返回值</h3>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          ${renderTabsHTML()}

          <div class="${CLS}-rt-mode">
            <label>转换模式</label>
            <select id="${CLS}-rt-mode-select">
              <option value="apply" ${rtGlobalMode === 'apply' ? 'selected' : ''}>应用时转换</option>
              <option value="runtime" ${rtGlobalMode === 'runtime' ? 'selected' : ''}>运行时解释</option>
            </select>
            <input class="${CLS}-rt-search" id="${CLS}-rt-main-search" type="text" placeholder="搜索分组..." value="${rtMainSearch.replace(/"/g, '&quot;')}">
          </div>

          <div class="${CLS}-sec-title">分组 <span>(${groups.length})</span></div>
          <div class="${CLS}-ext-grid" id="${CLS}-rt-group-grid">
      `;
      for (const g of groups) {
        const label = g.name;
        let match = true;
        if (keyword) {
          const pool = [g.name, g.prefix].concat(g.opcodes);
          match = pool.some(x => String(x).toLowerCase().includes(keyword));
        }
        const disabledClass = match ? "" : "disabled";
        html += `
          <div class="${CLS}-ext ${CLS}-rt-card ${disabledClass}" data-prefix="${g.prefix}">
            <div class="${CLS}-ext-name">${label}</div>
            <div class="${CLS}-ext-meta">
              <span>${g.totalCount} 个 opcode</span>
              <span class="${CLS}-ext-badge">已篡改 ${g.tamperedCount} / ${g.totalCount}</span>
            </div>
            ${match ? '' : `<div class="${CLS}-rt-nomatch">无匹配</div>`}
          </div>
        `;
      }
      html += `</div></div>`;
      windowEl.innerHTML = html;

      bindCommonHeader(windowEl);

      const modeSelect = windowEl.querySelector(`#${CLS}-rt-mode-select`);
      if (modeSelect) {
        modeSelect.addEventListener("change", (e) => {
          rtGlobalMode = e.target.value;
          normalizeRtRecords();
          applyAllRtTampers();
          showToast(rtGlobalMode === "apply" ? "已切换到应用时转换" : "已切换到运行时解释");
        });
      }

      const searchInput = windowEl.querySelector(`#${CLS}-rt-main-search`);
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          rtMainSearch = e.target.value;
          renderReturnTamperMain();
        });
      }

      const cards = windowEl.querySelectorAll(`.${CLS}-rt-card`);
      cards.forEach(card => {
        if (card.classList.contains("disabled")) return;
        card.addEventListener("click", () => {
          const prefix = card.dataset.prefix;
          const groupsNow = getRtGroups(currentVm);
          const g = groupsNow.find(x => x.prefix === prefix);
          if (g) {
            currentRtDetail = g;
            currentView = "returntamperDetail";
            rtDetailSearch = "";
            renderReturnTamperDetail();
          }
        });
      });
    } finally { renderLock = false; }
  }

  function renderReturnTamperDetail() {
    if (renderLock || !windowEl || !currentRtDetail) return;
    renderLock = true;
    try {
      const groupsNow = getRtGroups(currentVm);
      const g = groupsNow.find(x => x.prefix === currentRtDetail.prefix);
      if (!g) { currentView = "returntamper"; renderReturnTamperMain(); return; }
      currentRtDetail = g;
      const keyword = rtDetailSearch.trim().toLowerCase();

      let html = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <button class="${CLS}-back" id="${CLS}-back">‹</button>
          <h3 class="${CLS}-title">${g.isNative ? '原生积木' : g.name}</h3>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          <div class="${CLS}-sec-title">OPCODE 列表 <span>(${g.totalCount})</span>
            <div class="${CLS}-sec-actions">
              <input class="${CLS}-rt-search" id="${CLS}-rt-detail-search" type="text" placeholder="搜索..." value="${rtDetailSearch.replace(/"/g, '&quot;')}">
            </div>
          </div>
          <div id="${CLS}-rt-op-list">
      `;

      let shown = 0;
      for (const op of g.opcodes) {
        const rec = getRtRecord(op);
        const type = rec?.type || "none";
        const rawValue = rec?.rawValue !== undefined ? rec.rawValue : "";
        const tampered = isRtTampered(op);
        const locked = isExtensionInterceptLocked(op);
        const displayName = g.isNative ? op : getOpcodeDisplayName(currentVm, op);

        let match = true;
        if (keyword) {
          const pool = [op, displayName];
          match = pool.some(x => String(x).toLowerCase().includes(keyword));
        }
        if (!match) continue;
        shown++;

        const disabledClass = locked ? "disabled" : "";
        const inputDisabled = (type === "none" || locked) ? "disabled" : "";
        const selectDisabled = locked ? "disabled" : "";
        const applyDisabled = locked ? "disabled" : "";

        html += `
          <div class="${CLS}-rt-row ${disabledClass}" data-opcode="${op}">
            <span class="${CLS}-rt-name" title="${op}">${displayName}</span>
            <span class="${CLS}-rt-tag ${tampered ? 'on' : 'off'}">${tampered ? '已篡改' : '未篡改'}</span>
            <select class="${CLS}-rt-sel" data-opcode="${op}" ${selectDisabled}>
              <option value="none" ${type === 'none' ? 'selected' : ''}>不篡改</option>
              <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>布尔型</option>
              <option value="number" ${type === 'number' ? 'selected' : ''}>数字型</option>
              <option value="string" ${type === 'string' ? 'selected' : ''}>字符串型</option>
            </select>
            <input class="${CLS}-rt-input" type="text" data-opcode="${op}" value="${String(rawValue).replace(/"/g, '&quot;')}" placeholder="输入值" ${inputDisabled}>
            <button class="${CLS}-rt-apply" data-opcode="${op}" ${applyDisabled}>应用</button>
            ${locked ? `<span class="${CLS}-rt-blocked">该 opcode 已被拦截，篡改暂不生效</span>` : ''}
          </div>
        `;
      }
      if (shown === 0) html += `<div class="${CLS}-empty">无匹配 opcode</div>`;
      html += `</div></div>`;
      windowEl.innerHTML = html;

      const header = windowEl.querySelector(`#${CLS}-hdr`);
      if (header) makeWindowDraggable(header);
      const closeBtn = windowEl.querySelector(`#${CLS}-close`);
      if (closeBtn) closeBtn.addEventListener("click", closeUI);
      const backBtn = windowEl.querySelector(`#${CLS}-back`);
      if (backBtn) backBtn.addEventListener("click", () => { currentView = "returntamper"; renderReturnTamperMain(); });

      const searchInput = windowEl.querySelector(`#${CLS}-rt-detail-search`);
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          rtDetailSearch = e.target.value;
          renderReturnTamperDetail();
        });
      }

      const selects = windowEl.querySelectorAll(`.${CLS}-rt-sel`);
      selects.forEach(sel => {
        sel.addEventListener("change", () => {
          const row = sel.closest(`.${CLS}-rt-row`);
          if (!row) return;
          const input = row.querySelector(`.${CLS}-rt-input`);
          const applyBtn = row.querySelector(`.${CLS}-rt-apply`);
          const type = sel.value;
          if (type === "none") {
            if (input) input.disabled = true;
            if (applyBtn) applyBtn.disabled = false;
          } else {
            if (input) input.disabled = false;
            if (applyBtn) applyBtn.disabled = false;
          }
        });
      });

      const applyBtns = windowEl.querySelectorAll(`.${CLS}-rt-apply`);
      applyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const op = btn.dataset.opcode;
          const row = btn.closest(`.${CLS}-rt-row`);
          if (!row) return;
          const sel = row.querySelector(`.${CLS}-rt-sel`);
          const input = row.querySelector(`.${CLS}-rt-input`);
          if (!sel || !input) return;
          const type = sel.value;
          const rawValue = input.value;

          if (isExtensionInterceptLocked(op)) {
            setRtTamper(op, type, rawValue);
            showToast("该 opcode 已被拦截，篡改暂不生效");
            renderReturnTamperDetail();
            return;
          }

          setRtTamper(op, type, rawValue);
          if (type === "none") showToast("已取消篡改");
          else showToast("已应用：" + getRtConvertedPreview(type, rawValue));
          renderReturnTamperDetail();
        });
      });

      const inputs = windowEl.querySelectorAll(`.${CLS}-rt-input`);
      inputs.forEach(input => {
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            const row = input.closest(`.${CLS}-rt-row`);
            if (row) {
              const btn = row.querySelector(`.${CLS}-rt-apply`);
              if (btn && !btn.disabled) btn.click();
            }
          }
        });
      });
    } finally { renderLock = false; }
  }

  function renderDetail() {
    if (renderLock || !windowEl || !currentSpriteData) return;
    renderLock = true;
    try {
      const { sprite, name, id, costumeCount, soundCount, costumePreview, isStage } = currentSpriteData;

      let html = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <button class="${CLS}-back" id="${CLS}-back">‹</button>
          <h3 class="${CLS}-title">角色详情</h3>
          <select id="${CLS}-filename-mode" class="${CLS}-sel">
            <option value="assetId" ${currentFileNameMode === 'assetId' ? 'selected' : ''}>assetId</option>
            <option value="name" ${currentFileNameMode === 'name' ? 'selected' : ''}>name</option>
            <option value="md5ext" ${currentFileNameMode === 'md5ext' ? 'selected' : ''}>md5ext</option>
          </select>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          <div class="${CLS}-profile">
            <img src="${costumePreview || ''}" alt="${name}" loading="lazy">
            <div class="${CLS}-info">
              <p class="${CLS}-name">${name}</p>
              <p class="${CLS}-meta">ID: ${id.slice(0, 8)} · 克隆体: ${currentSpriteData.clones?.length || 1}</p>
            </div>
            <div class="${CLS}-actions">
              <button class="${CLS}-export" id="${CLS}-export">导出</button>
              ${!isStage ? `
                <button class="${CLS}-rename" id="${CLS}-rename">重命名</button>
                <button class="${CLS}-delete" id="${CLS}-delete">删除</button>
              ` : ''}
            </div>
          </div>

          <div class="${CLS}-sec">
            <div class="${CLS}-sec-title">造型 <span>(${costumeCount})</span></div>
            <div class="${CLS}-list" id="${CLS}-costume-list">
      `;
      if (costumeCount === 0) html += `<div class="${CLS}-empty">无造型</div>`;
      else {
        const costumes = sprite.costumes || [];
        for (let i = 0; i < costumes.length; i++) {
          const c = costumes[i];
          const isCurrent = i === sprite.currentCostume;
          html += `
            <div class="${CLS}-item">
              <span class="${CLS}-idx">#${i + 1}</span>
              <span class="${CLS}-item-name">${c.name || '未命名'}</span>
              ${isCurrent ? `<span class="${CLS}-cur">当前</span>` : ''}
              <button class="${CLS}-item-exp" data-type="costume" data-index="${i}">⬇</button>
              <button class="${CLS}-item-del" data-type="costume" data-index="${i}">✕</button>
            </div>
          `;
        }
      }

      html += `</div></div>
          <div class="${CLS}-sec">
            <div class="${CLS}-sec-title">声音 <span>(${soundCount})</span></div>
            <div class="${CLS}-list" id="${CLS}-sound-list">
      `;
      if (soundCount === 0) html += `<div class="${CLS}-empty">无声音</div>`;
      else {
        const sounds = sprite.sounds || [];
        for (let i = 0; i < sounds.length; i++) {
          const s = sounds[i];
          html += `
            <div class="${CLS}-item">
              <span class="${CLS}-idx">#${i + 1}</span>
              <span class="${CLS}-item-name">${s.name || '未命名'}</span>
              <button class="${CLS}-item-exp" data-type="sound" data-index="${i}">⬇</button>
              <button class="${CLS}-item-del" data-type="sound" data-index="${i}">✕</button>
            </div>
          `;
        }
      }
      html += `</div></div></div>`;
      windowEl.innerHTML = html;

      const header = windowEl.querySelector(`#${CLS}-hdr`);
      if (header) makeWindowDraggable(header);
      const closeBtn = windowEl.querySelector(`#${CLS}-close`);
      if (closeBtn) closeBtn.addEventListener("click", closeUI);
      const backBtn = windowEl.querySelector(`#${CLS}-back`);
      if (backBtn) backBtn.addEventListener("click", goBack);
      const fileNameSelect = windowEl.querySelector(`#${CLS}-filename-mode`);
      if (fileNameSelect) {
        fileNameSelect.addEventListener("change", (e) => { currentFileNameMode = e.target.value; });
      }
      const exportBtn = windowEl.querySelector(`#${CLS}-export`);
      if (exportBtn) {
        exportBtn.addEventListener("click", async () => {
          patchVMForExport(currentVm);
          if (!JSZip) { showToast("JSZip 库未加载，请检查网络或刷新重试", "error"); return; }
          await exportSpriteAsFile(currentVm, id, name);
        });
      }
      const renameBtn = windowEl.querySelector(`#${CLS}-rename`);
      if (renameBtn) {
        renameBtn.addEventListener("click", () => {
          const newName = prompt(`请输入 "${name}" 的新名称：`, name);
          if (newName && newName.trim() && newName.trim() !== name) {
            if (renameSprite(currentVm, id, newName.trim())) {
              showToast(`已重命名为 "${newName.trim()}"`);
              currentSpriteData.name = newName.trim();
              renderDetail();
            } else showToast("重命名失败", "error");
          }
        });
      }
      const deleteBtn = windowEl.querySelector(`#${CLS}-delete`);
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          const cloneCount = currentSpriteData.clones?.length || 1;
          const msg = cloneCount > 1 ? `角色 "${name}" 有 ${cloneCount} 个克隆体，确定要删除吗？` : `确定要删除角色 "${name}" 吗？此操作不可撤销！`;
          if (confirm(msg)) {
            if (deleteSprite(currentVm, id)) { showToast(`已删除角色 "${name}"`); goBack(); }
            else showToast("删除失败", "error");
          }
        });
      }

      const costumeList = windowEl.querySelector(`#${CLS}-costume-list`);
      if (costumeList) {
        costumeList.addEventListener("click", (e) => {
          const exportBtn = e.target.closest(`.${CLS}-item-exp[data-type="costume"]`);
          if (exportBtn) {
            e.stopPropagation();
            const idx = parseInt(exportBtn.dataset.index);
            const costume = sprite.costumes?.[idx];
            if (costume) exportAsset(costume, "costume");
            else showToast("无法获取素材数据", "error");
            return;
          }
          const delBtn = e.target.closest(`.${CLS}-item-del[data-type="costume"]`);
          if (delBtn) {
            e.stopPropagation();
            const idx = parseInt(delBtn.dataset.index);
            const costume = sprite.costumes?.[idx];
            if (costume && confirm(`确定要删除造型 "${costume.name}" 吗？`)) {
              if (deleteCostume(sprite, idx)) { showToast(`已删除造型 "${costume.name}"`); renderDetail(); }
              else showToast("删除失败", "error");
            }
          }
        });
      }

      const soundList = windowEl.querySelector(`#${CLS}-sound-list`);
      if (soundList) {
        soundList.addEventListener("click", (e) => {
          const exportBtn = e.target.closest(`.${CLS}-item-exp[data-type="sound"]`);
          if (exportBtn) {
            e.stopPropagation();
            const idx = parseInt(exportBtn.dataset.index);
            const sound = sprite.sounds?.[idx];
            if (sound) exportAsset(sound, "sound");
            else showToast("无法获取素材数据", "error");
            return;
          }
          const delBtn = e.target.closest(`.${CLS}-item-del[data-type="sound"]`);
          if (delBtn) {
            e.stopPropagation();
            const idx = parseInt(delBtn.dataset.index);
            const sound = sprite.sounds?.[idx];
            if (sound && confirm(`确定要删除声音 "${sound.name}" 吗？`)) {
              if (deleteSound(sprite, idx)) { showToast(`已删除声音 "${sound.name}"`); renderDetail(); }
              else showToast("删除失败", "error");
            }
          }
        });
      }
    } finally { renderLock = false; }
  }

  function renderAudit() {
    if (renderLock || !windowEl) return;
    renderLock = true;
    try {
      const sprites = getSprites(currentVm);
      let html = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <button class="${CLS}-back" id="${CLS}-back">‹</button>
          <h3 class="${CLS}-title">角色审计</h3>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          <div class="${CLS}-sec">
            <div class="${CLS}-sec-title">选择角色</div>
            <div class="${CLS}-grid" id="${CLS}-audit-grid" style="grid-template-columns:repeat(auto-fill,minmax(80px,1fr));">
      `;
      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i];
        html += `
          <div class="${CLS}-card" data-audit-index="${i}" style="padding:8px 4px 6px;">
            <img src="${s.costumePreview || ''}" alt="${s.name}" style="border-radius:8px;">
            <div class="${CLS}-name" style="font-size:11px;">${s.name}</div>
          </div>
        `;
      }
      html += `
            </div>
          </div>

          <div id="${CLS}-audit-editor" style="display:none; flex-direction:column; gap:8px;">
            <div class="${CLS}-sec-title" id="${CLS}-audit-name">未选中角色</div>
            <div class="${CLS}-row"><label>x</label><input type="number" id="${CLS}-audit-x" step="1" /><button class="${CLS}-lock-btn" data-prop="x">🔓</button></div>
            <div class="${CLS}-row"><label>y</label><input type="number" id="${CLS}-audit-y" step="1" /><button class="${CLS}-lock-btn" data-prop="y">🔓</button></div>
            <div class="${CLS}-row"><label>大小</label><input type="number" id="${CLS}-audit-size" step="1" /><button class="${CLS}-lock-btn" data-prop="size">🔓</button></div>
            <div class="${CLS}-row"><label>方向</label><input type="number" id="${CLS}-audit-dir" step="1" /><button class="${CLS}-lock-btn" data-prop="direction">🔓</button></div>
            <div class="${CLS}-row"><label>层级</label><input type="number" id="${CLS}-audit-layer" step="1" /><button class="${CLS}-lock-btn" data-prop="layer">🔓</button></div>
            <div class="${CLS}-row">
              <label>可见</label>
              <div class="${CLS}-switch" id="${CLS}-audit-visible-switch"></div>
              <span id="${CLS}-audit-visible-text" style="font-size:12px;color:rgba(255,255,255,0.6)">显示</span>
              <button class="${CLS}-lock-btn" data-prop="visible">🔓</button>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
              <button class="${CLS}-rename" id="${CLS}-audit-apply" style="padding:6px 14px;border-radius:8px;font-size:12px;">应用</button>
              <button class="${CLS}-rename" id="${CLS}-audit-refresh" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">刷新</button>
              <button class="${CLS}-delete" id="${CLS}-audit-unlock-all" style="padding:6px 14px;border-radius:8px;font-size:12px;">解锁全部</button>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="${CLS}-rename" id="${CLS}-audit-front" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">置顶</button>
              <button class="${CLS}-rename" id="${CLS}-audit-back" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">置底</button>
              <button class="${CLS}-rename" id="${CLS}-audit-fwd" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">上移</button>
              <button class="${CLS}-rename" id="${CLS}-audit-bwd" style="padding:6px 14px;border-radius:8px;font-size:12px;background:rgba(255,255,255,0.1);">下移</button>
            </div>
            <div class="${CLS}-clone">
              <div class="${CLS}-clone-hdr" id="${CLS}-audit-clone-header">
                <span>克隆体 <span id="${CLS}-audit-clone-count">(0)</span></span>
                <span id="${CLS}-audit-clone-toggle">展开</span>
              </div>
              <div class="${CLS}-clone-list" id="${CLS}-audit-clone-list"></div>
            </div>
          </div>
        </div>
      `;
      windowEl.innerHTML = html;

      const header = windowEl.querySelector(`#${CLS}-hdr`);
      if (header) makeWindowDraggable(header);
      const closeBtn = windowEl.querySelector(`#${CLS}-close`);
      if (closeBtn) closeBtn.addEventListener("click", closeUI);
      const backBtn = windowEl.querySelector(`#${CLS}-back`);
      if (backBtn) backBtn.addEventListener("click", goBack);

      const cards = windowEl.querySelectorAll(`.${CLS}-card[data-audit-index]`);
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

      const lockBtns = windowEl.querySelectorAll(`.${CLS}-lock-btn`);
      lockBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
          if (!target) return;
          const prop = btn.dataset.prop;
          if (isLocked(target, prop)) clearLock(target, prop);
          else {
            let value;
            if (prop === "visible") value = !!target.visible;
            else {
              const inputMap = { x: `#${CLS}-audit-x`, y: `#${CLS}-audit-y`, size: `#${CLS}-audit-size`, direction: `#${CLS}-audit-dir`, layer: `#${CLS}-audit-layer` };
              const input = windowEl.querySelector(inputMap[prop]);
              value = input ? Number(input.value) : readProp(target, prop);
              if (Number.isNaN(value)) value = readProp(target, prop);
            }
            setLock(target, prop, value);
          }
          syncAuditLockButtons(target);
        });
      });

      const applyBtn = windowEl.querySelector(`#${CLS}-audit-apply`);
      if (applyBtn) {
        applyBtn.addEventListener("click", () => {
          const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
          if (!target) return;
          const x = Number(windowEl.querySelector(`#${CLS}-audit-x`).value);
          const y = Number(windowEl.querySelector(`#${CLS}-audit-y`).value);
          const size = Number(windowEl.querySelector(`#${CLS}-audit-size`).value);
          const dir = Number(windowEl.querySelector(`#${CLS}-audit-dir`).value);
          const layerVal = windowEl.querySelector(`#${CLS}-audit-layer`).value;
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

      const visibleSwitch = windowEl.querySelector(`#${CLS}-audit-visible-switch`);
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

      const frontBtn = windowEl.querySelector(`#${CLS}-audit-front`);
      if (frontBtn) frontBtn.addEventListener("click", () => {
        const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
        if (!target) return;
        goToFront(currentVm, target);
        if (isLocked(target, "layer")) snapshotProp(target, "layer");
        if (!selectedClone && selectedName) renderClonesForAudit(target);
      });
      const backBtn2 = windowEl.querySelector(`#${CLS}-audit-back`);
      if (backBtn2) backBtn2.addEventListener("click", () => {
        const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
        if (!target) return;
        goToBack(currentVm, target);
        if (isLocked(target, "layer")) snapshotProp(target, "layer");
        if (!selectedClone && selectedName) renderClonesForAudit(target);
      });
      const fwdBtn = windowEl.querySelector(`#${CLS}-audit-fwd`);
      if (fwdBtn) fwdBtn.addEventListener("click", () => {
        const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
        if (!target) return;
        goForwardLayers(currentVm, target, 1);
        if (isLocked(target, "layer")) snapshotProp(target, "layer");
        if (!selectedClone && selectedName) renderClonesForAudit(target);
      });
      const bwdBtn = windowEl.querySelector(`#${CLS}-audit-bwd`);
      if (bwdBtn) bwdBtn.addEventListener("click", () => {
        const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
        if (!target) return;
        goBackwardLayers(currentVm, target, 1);
        if (isLocked(target, "layer")) snapshotProp(target, "layer");
        if (!selectedClone && selectedName) renderClonesForAudit(target);
      });

      const refreshBtn = windowEl.querySelector(`#${CLS}-audit-refresh`);
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

      const unlockAllBtn = windowEl.querySelector(`#${CLS}-audit-unlock-all`);
      if (unlockAllBtn) {
        unlockAllBtn.addEventListener("click", () => {
          const target = selectedClone || (selectedName ? findTarget(currentVm, selectedName) : null);
          if (!target) return;
          clearAllLocksOf(target);
          syncAuditLockButtons(target);
        });
      }

      const cloneHeader = windowEl.querySelector(`#${CLS}-audit-clone-header`);
      if (cloneHeader) {
        cloneHeader.addEventListener("click", () => {
          if (selectedClone) return;
          cloneExpanded = !cloneExpanded;
          windowEl.querySelector(`#${CLS}-audit-clone-list`).classList.toggle("open", cloneExpanded);
          windowEl.querySelector(`#${CLS}-audit-clone-toggle`).textContent = cloneExpanded ? "折叠" : "展开";
        });
      }

      ["x", "y", "size", "direction", "layer"].forEach(prop => {
        const inputId = { x: `#${CLS}-audit-x`, y: `#${CLS}-audit-y`, size: `#${CLS}-audit-size`, direction: `#${CLS}-audit-dir`, layer: `#${CLS}-audit-layer` }[prop];
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
    } finally { renderLock = false; }
  }

  function fillAuditEditor(target) {
    if (!target) return;
    const editor = windowEl.querySelector(`#${CLS}-audit-editor`);
    if (editor) editor.style.display = "flex";
    const nameEl = windowEl.querySelector(`#${CLS}-audit-name`);
    if (nameEl) nameEl.textContent = (target.getName ? target.getName() : target.sprite?.name) + (isClone(target) ? "（克隆体）" : "");

    const xEl = windowEl.querySelector(`#${CLS}-audit-x`);
    const yEl = windowEl.querySelector(`#${CLS}-audit-y`);
    const sizeEl = windowEl.querySelector(`#${CLS}-audit-size`);
    const dirEl = windowEl.querySelector(`#${CLS}-audit-dir`);
    const layerEl = windowEl.querySelector(`#${CLS}-audit-layer`);
    if (xEl) xEl.value = target.x;
    if (yEl) yEl.value = target.y;
    if (sizeEl) sizeEl.value = target.size;
    if (dirEl) dirEl.value = target.direction;
    if (layerEl) layerEl.value = readLayerOrder(target) ?? "";

    syncAuditVisibleUI(!!target.visible);
    syncAuditLockButtons(target);
  }

  function syncAuditVisibleUI(visible) {
    const sw = windowEl.querySelector(`#${CLS}-audit-visible-switch`);
    const text = windowEl.querySelector(`#${CLS}-audit-visible-text`);
    if (sw) sw.classList.toggle("on", !!visible);
    if (text) text.textContent = visible ? "显示" : "隐藏";
  }

  function syncAuditLockButtons(target) {
    if (!windowEl) return;
    const btns = windowEl.querySelectorAll(`.${CLS}-lock-btn`);
    btns.forEach(btn => {
      const prop = btn.dataset.prop;
      const locked = target ? isLocked(target, prop) : false;
      btn.textContent = locked ? "🔒" : "🔓";
      btn.classList.toggle("locked", locked);
    });
  }

  function renderClonesForAudit(original) {
    const list = windowEl.querySelector(`#${CLS}-audit-clone-list`);
    const countEl = windowEl.querySelector(`#${CLS}-audit-clone-count`);
    if (!list || !countEl) return;
    const clones = getClonesOf(currentVm, original);
    countEl.textContent = `(${clones.length})`;
    list.innerHTML = "";
    if (!clones.length) {
      const empty = document.createElement("div");
      empty.className = `${CLS}-empty`;
      empty.style.padding = "8px";
      empty.textContent = "无克隆体";
      list.appendChild(empty);
      return;
    }
    clones.forEach(c => {
      const item = document.createElement("div");
      item.className = `${CLS}-clone-item`;
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
        windowEl.querySelector(`#${CLS}-audit-clone-toggle`).textContent = "";
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

  // ==================== 设置面板渲染 ====================
  function renderSettings() {
    if (renderLock || !windowEl) return;
    renderLock = true;
    try {
      const s = settings;
      const html = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <h3 class="${CLS}-title">设置</h3>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          ${renderTabsHTML()}

          <div class="${CLS}-sec-title">主题颜色</div>
          <div class="${CLS}-set">
            <div class="${CLS}-set-row">
              <label>主题色</label>
              <input type="color" id="${CLS}-set-theme" value="${s.themeColor}">
              <input class="${CLS}-set-input" type="text" id="${CLS}-set-theme-hex" value="${s.themeColor}" maxlength="7" spellcheck="false" placeholder="#ff8c1a">
              <button class="${CLS}-set-btn" id="${CLS}-set-theme-reset">默认</button>
            </div>
            <div class="${CLS}-set-tip">输入 6 位十六进制色值（如 #ff8c1a），输入合法时立即生效。</div>
          </div>

          <div class="${CLS}-sec-title">窗口尺寸</div>
          <div class="${CLS}-set">
            <div class="${CLS}-set-row">
              <label>宽度</label>
              <input type="range" id="${CLS}-set-w" min="420" max="1400" step="10" value="${s.winWidth}">
              <span class="${CLS}-set-val" id="${CLS}-set-w-val">${s.winWidth}px</span>
            </div>
            <div class="${CLS}-set-row">
              <label>高度</label>
              <input type="range" id="${CLS}-set-h" min="0" max="1200" step="10" value="${s.winHeight}">
              <span class="${CLS}-set-val" id="${CLS}-set-h-val">${s.winHeight ? s.winHeight + 'px' : '自动'}</span>
            </div>
            <div class="${CLS}-set-tip">高度为 0 时表示自动适应内容。也可以拖拽窗口右下角手动缩放。</div>
          </div>

          <div class="${CLS}-sec-title">毛玻璃</div>
          <div class="${CLS}-set">
            <div class="${CLS}-set-row">
              <label>启用</label>
              <div class="${CLS}-switch ${s.glass ? 'on' : ''}" id="${CLS}-set-glass"></div>
              <span class="${CLS}-set-val" id="${CLS}-set-glass-val">${s.glass ? '开' : '关'}</span>
            </div>
            <div class="${CLS}-set-row">
              <label>模糊度</label>
              <input type="range" id="${CLS}-set-blur" min="0" max="60" step="1" value="${s.glassBlur}">
              <span class="${CLS}-set-val" id="${CLS}-set-blur-val">${s.glassBlur}px</span>
            </div>
          </div>

          <div class="${CLS}-sec-title">窗口不透明度</div>
          <div class="${CLS}-set">
            <div class="${CLS}-set-row">
              <label>不透明度</label>
              <input type="range" id="${CLS}-set-op" min="20" max="100" step="1" value="${Math.round(s.winOpacity * 100)}">
              <span class="${CLS}-set-val" id="${CLS}-set-op-val">${Math.round(s.winOpacity * 100)}%</span>
            </div>
            <div class="${CLS}-set-tip">数值越低窗口背景越透明，配合毛玻璃可获得透视效果。</div>
          </div>

          <div class="${CLS}-sec-title">背景图片</div>
          <div class="${CLS}-set">
            <div class="${CLS}-set-row">
              <label>当前图片</label>
              <div class="${CLS}-bg-preview" id="${CLS}-bg-preview">无</div>
              <button class="${CLS}-set-btn" id="${CLS}-bg-upload">上传图片</button>
              <button class="${CLS}-set-btn danger" id="${CLS}-bg-remove">移除</button>
              <input type="file" accept="image/*" id="${CLS}-bg-file" style="display:none">
            </div>
            <div class="${CLS}-set-tip">图片自动铺满窗口：尺寸过大自动裁剪，过小自动放大。为保证存储，超大图片会被自动压缩。</div>
          </div>

          <div class="${CLS}-sec-title">重置</div>
          <div class="${CLS}-set">
            <div class="${CLS}-set-row">
              <label>恢复默认</label>
              <button class="${CLS}-set-btn danger" id="${CLS}-set-reset">重置全部外观设置</button>
            </div>
          </div>
        </div>
      `;
      windowEl.innerHTML = html;

      bindCommonHeader(windowEl);

      const q = (id) => windowEl.querySelector(`#${CLS}-${id}`);

      // ---- 主题色 ----
      const themeInput = q("set-theme");
      const themeHex = q("set-theme-hex");

      const commitTheme = (val, syncColorInput) => {
        const norm = normalizeHex(val);
        if (!norm) return false;
        settings.themeColor = norm;
        if (syncColorInput && themeInput) themeInput.value = norm;
        applyTheme();
        saveSettings();
        return true;
      };

      if (themeInput) {
        themeInput.addEventListener("input", () => {
          if (commitTheme(themeInput.value, false) && themeHex && document.activeElement !== themeHex) {
            themeHex.value = settings.themeColor;
          }
        });
      }
      if (themeHex) {
        themeHex.addEventListener("input", () => {
          if (isValidHex(themeHex.value)) {
            commitTheme(themeHex.value, true);
          }
        });
        themeHex.addEventListener("blur", () => {
          themeHex.value = settings.themeColor;
        });
        themeHex.addEventListener("change", () => {
          if (!commitTheme(themeHex.value, true)) {
            showToast("无效的颜色值", "error");
            themeHex.value = settings.themeColor;
          }
        });
      }
      const themeReset = q("set-theme-reset");
      if (themeReset) {
        themeReset.addEventListener("click", () => {
          settings.themeColor = DEFAULT_SETTINGS.themeColor;
          if (themeInput) themeInput.value = settings.themeColor;
          if (themeHex) themeHex.value = settings.themeColor;
          applyTheme();
          saveSettings();
          showToast("主题色已恢复默认");
        });
      }

      // ---- 宽度 ----
      const wRange = q("set-w");
      const wVal = q("set-w-val");
      if (wRange) {
        wRange.addEventListener("input", () => {
          settings.winWidth = Number(wRange.value);
          if (wVal) wVal.textContent = settings.winWidth + "px";
          applyWindowAppearance();
          saveSettings();
        });
      }

      // ---- 高度 ----
      const hRange = q("set-h");
      const hVal = q("set-h-val");
      if (hRange) {
        hRange.addEventListener("input", () => {
          settings.winHeight = Number(hRange.value);
          if (hVal) hVal.textContent = settings.winHeight ? settings.winHeight + "px" : "自动";
          applyWindowAppearance();
          saveSettings();
        });
      }

      // ---- 透明度 ----
      const opRange = q("set-op");
      const opVal = q("set-op-val");
      if (opRange) {
        opRange.addEventListener("input", () => {
          settings.winOpacity = Number(opRange.value) / 100;
          if (opVal) opVal.textContent = opRange.value + "%";
          applyWindowAppearance();
          saveSettings();
        });
      }

      // ---- 毛玻璃开关 ----
      const glassSwitch = q("set-glass");
      const glassVal = q("set-glass-val");
      if (glassSwitch) {
        glassSwitch.addEventListener("click", () => {
          settings.glass = !settings.glass;
          glassSwitch.classList.toggle("on", settings.glass);
          if (glassVal) glassVal.textContent = settings.glass ? "开" : "关";
          applyWindowAppearance();
          saveSettings();
        });
      }

      // ---- 模糊度 ----
      const blurRange = q("set-blur");
      const blurVal = q("set-blur-val");
      if (blurRange) {
        blurRange.addEventListener("input", () => {
          settings.glassBlur = Number(blurRange.value);
          if (blurVal) blurVal.textContent = settings.glassBlur + "px";
          applyWindowAppearance();
          saveSettings();
        });
      }

      // ---- 背景图 ----
      const fileInput = q("bg-file");
      const uploadBtn = q("bg-upload");
      const removeBtn = q("bg-remove");

      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", async () => {
          const f = fileInput.files && fileInput.files[0];
          fileInput.value = "";
          if (!f) return;
          if (!/^image\//.test(f.type)) {
            showToast("请选择图片文件", "error");
            return;
          }
          uploadBtn.textContent = "处理中…";
          uploadBtn.disabled = true;
          try {
            const dataUrl = await processImageFile(f);
            settings.bgImage = dataUrl;
            applyWindowAppearance();
            syncSettingsForm();
            saveSettings(true);
            showToast("背景图片已更新");
          } catch (err) {
            showToast("图片处理失败：" + (err && err.message ? err.message : String(err)), "error");
          } finally {
            uploadBtn.textContent = "上传图片";
            uploadBtn.disabled = false;
          }
        });
      }
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          if (!settings.bgImage) { showToast("当前没有背景图片", "error"); return; }
          settings.bgImage = "";
          applyWindowAppearance();
          syncSettingsForm();
          saveSettings(true);
          showToast("背景图片已移除");
        });
      }

      // ---- 重置 ----
      const resetBtn = q("set-reset");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          if (!confirm("确定要重置全部外观设置吗？（自定义 CSS 也会被清空）")) return;
          const keepCss = settings.customCSS;
          settings = Object.assign({}, DEFAULT_SETTINGS, { customCSS: keepCss });
          applyAllSettings();
          saveSettings(true);
          renderSettings();
          showToast("已恢复默认外观设置");
        });
      }

      syncSettingsForm();
    } finally { renderLock = false; }
  }

  // ==================== 自定义样式面板 ====================
  function renderCustomCSS() {
    if (renderLock || !windowEl) return;
    renderLock = true;
    try {
      const html = `
        <div class="${CLS}-hdr" id="${CLS}-hdr">
          <h3 class="${CLS}-title">自定义样式</h3>
          <button class="${CLS}-close" id="${CLS}-close">✕</button>
        </div>
        <div class="${CLS}-body">
          ${renderTabsHTML()}

          <div class="${CLS}-sec-title">自定义 CSS <span>（作用于本窗口）</span></div>
          <textarea class="${CLS}-css-area" id="${CLS}-css-area" spellcheck="false"
            placeholder="/* 例如： */
.${CLS}-body { padding: 24px; }
.${CLS}-tab.active { border-radius: 6px; }"></textarea>

          <div style="display:flex;gap:10px;margin-top:12px;align-items:center;flex-wrap:wrap;">
            <button class="${CLS}-set-btn" id="${CLS}-css-apply">应用样式</button>
            <button class="${CLS}-set-btn danger" id="${CLS}-css-clear">清空</button>
            <span class="${CLS}-css-status" id="${CLS}-css-status"></span>
          </div>

          <div class="${CLS}-set-tip" style="margin-top:14px; line-height:1.8;">
            CSS不合法的话无法生效<br>
            选择器无需手动加窗口前缀，系统会自动将样式限制在窗口范围内。<br>
            样式会保存在本地，刷新页面或重新打开窗口后依然生效。
          </div>
        </div>
      `;
      windowEl.innerHTML = html;

      bindCommonHeader(windowEl);

      const ta = windowEl.querySelector(`#${CLS}-css-area`);
      const status = windowEl.querySelector(`#${CLS}-css-status`);
      if (ta) ta.value = settings.customCSS || "";

      const applyBtn = windowEl.querySelector(`#${CLS}-css-apply`);
      if (applyBtn) {
        applyBtn.addEventListener("click", () => {
          const css = ta ? ta.value : "";
          if (css.trim() && !isValidCSS(css)) {
            if (status) { status.textContent = "语法错误"; status.style.color = "#ff6b6b"; }
            showToast("语法错误", "error");
            return;
          }
          settings.customCSS = css;
          applyCustomCSS();
          saveSettings(true);
          if (status) { status.textContent = "已应用"; status.style.color = "#2ecc71"; }
          showToast("自定义样式已应用");
        });
      }

      const clearBtn = windowEl.querySelector(`#${CLS}-css-clear`);
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          if (ta) ta.value = "";
          settings.customCSS = "";
          applyCustomCSS();
          saveSettings(true);
          if (status) { status.textContent = "已清空"; status.style.color = "rgba(255,255,255,0.5)"; }
          showToast("自定义样式已清空");
        });
      }
    } finally { renderLock = false; }
  }

  // ==================== 表单同步 ====================
  function syncSettingsForm() {
    if (!windowEl) return;
    const q = (id) => windowEl.querySelector(`#${CLS}-${id}`);
    const active = document.activeElement;
    const setVal = (el, val) => { if (el && el !== active) el.value = val; };
    const setTxt = (el, val) => { if (el) el.textContent = val; };

    // 设置面板
    const themeInput = q("set-theme");
    const themeHex = q("set-theme-hex");
    if (themeInput && themeInput !== active) themeInput.value = settings.themeColor;
    if (themeHex && themeHex !== active) themeHex.value = settings.themeColor;

    const w = q("set-w"); if (w && w !== active) w.value = settings.winWidth;
    setTxt(q("set-w-val"), settings.winWidth + "px");

    const h = q("set-h"); if (h && h !== active) h.value = settings.winHeight;
    setTxt(q("set-h-val"), settings.winHeight ? settings.winHeight + "px" : "自动");

    const op = q("set-op"); if (op && op !== active) op.value = Math.round(settings.winOpacity * 100);
    setTxt(q("set-op-val"), Math.round(settings.winOpacity * 100) + "%");

    const glassSwitch = q("set-glass");
    if (glassSwitch) glassSwitch.classList.toggle("on", settings.glass);
    setTxt(q("set-glass-val"), settings.glass ? "开" : "关");

    const blur = q("set-blur"); if (blur && blur !== active) blur.value = settings.glassBlur;
    setTxt(q("set-blur-val"), settings.glassBlur + "px");

    const prev = q("bg-preview");
    if (prev) {
      if (settings.bgImage) {
        prev.style.backgroundImage = `url("${settings.bgImage}")`;
        prev.textContent = "";
      } else {
        prev.style.backgroundImage = "";
        prev.textContent = "无";
      }
    }

    // 自定义样式面板
    const ta = q("css-area");
    if (ta && ta !== active) ta.value = settings.customCSS || "";
  }

  // ==================== 跨窗口同步 ====================
  function handleStorageChange(e) {
    if (e.key !== SETTINGS_KEY) return;
    if (!e.newValue) {
      settings = Object.assign({}, DEFAULT_SETTINGS);
    } else {
      try {
        const parsed = JSON.parse(e.newValue);
        if (!parsed || typeof parsed !== "object") return;
        settings = Object.assign({}, DEFAULT_SETTINGS, parsed);
        if (!isValidHex(settings.themeColor)) settings.themeColor = DEFAULT_SETTINGS.themeColor;
      } catch (err) {
        return;
      }
    }
    applyAllSettings();
  }

  window.addEventListener("storage", handleStorageChange);
  try { unsafeWindow.addEventListener("storage", handleStorageChange); } catch (e) { }

  window.addEventListener("beforeunload", () => {
    for (const [, info] of variableLocks) {
      if (info.timer) clearInterval(info.timer);
    }
    variableLocks.clear();
    if (lockTimer) cancelAnimationFrame(lockTimer);
    locks.clear();
    broadcastInterceptLocks.clear();
    EXTENSION_INTERCEPT_LOCKED.clear();
    rtTamperMap.clear();
    if (saveTimer) {
      clearTimeout(saveTimer);
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { }
    }
  });

  async function init() {
    try {
      loadSettings();
      applyTheme();
      currentVm = await getVM();
      if (!currentVm) return;
      vm = currentVm;
      patchVMForExport(currentVm);
      patchRuntimeForBroadcastIntercept(currentVm);
      patchRuntimeForExtensionIntercept(currentVm);
      createUI();
      applyAllSettings();
    } catch (err) { }
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
            currentVm = v; vm = v;
            patchVMForExport(v);
            patchRuntimeForBroadcastIntercept(v);
            patchRuntimeForExtensionIntercept(v);
            if (!floatBtn) createUI();
          }
        }).catch(() => {});
      }, 2000);
    }
  }, 3000);

  unsafeWindow[GLOBAL_KEY] = {
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
    getRtMode: () => rtGlobalMode,
    setRtMode: (mode) => { rtGlobalMode = mode; normalizeRtRecords(); applyAllRtTampers(); },
    getRtRecord: (opcode) => getRtRecord(opcode),
    isRtTampered: (opcode) => isRtTampered(opcode),
    setRtTamper: (opcode, type, rawValue) => setRtTamper(opcode, type, rawValue),
    clearRtTamper: (opcode) => clearRtTamper(opcode),
    listRtTampers: () => Array.from(rtTamperMap.entries()).map(([op, rec]) => ({ opcode: op, ...rec })),
    getNativeReturnOpcodes: () => getNativeReturnOpcodes(currentVm),
    getRtGroups: () => getRtGroups(currentVm),

    // ---- 新增：外观设置 API ----
    getSettings: () => JSON.parse(JSON.stringify(settings)),
    setSettings: (patch) => {
      if (!patch || typeof patch !== "object") return false;
      settings = Object.assign({}, settings, patch);
      if (!isValidHex(settings.themeColor)) settings.themeColor = DEFAULT_SETTINGS.themeColor;
      applyAllSettings();
      saveSettings(true);
      return true;
    },
    resetSettings: () => {
      settings = Object.assign({}, DEFAULT_SETTINGS);
      applyAllSettings();
      saveSettings(true);
      return true;
    },
    setThemeColor: (hex) => {
      const norm = normalizeHex(hex);
      if (!norm) return false;
      settings.themeColor = norm;
      applyTheme();
      saveSettings(true);
      return true;
    },
    setWindowSize: (w, h) => {
      if (typeof w === "number") settings.winWidth = Math.max(420, Math.min(1600, w));
      if (typeof h === "number") settings.winHeight = Math.max(0, Math.min(1600, h));
      applyWindowAppearance();
      saveSettings(true);
      return true;
    },
    setWindowOpacity: (v) => {
      settings.winOpacity = Math.max(0.2, Math.min(1, Number(v) || 0.85));
      applyWindowAppearance();
      saveSettings(true);
      return true;
    },
    setGlass: (enabled, blurPx) => {
      settings.glass = !!enabled;
      if (typeof blurPx === "number") settings.glassBlur = Math.max(0, Math.min(60, blurPx));
      applyWindowAppearance();
      saveSettings(true);
      return true;
    },
    setBackgroundImage: async (fileOrDataUrl) => {
      try {
        if (typeof fileOrDataUrl === "string") {
          settings.bgImage = fileOrDataUrl;
        } else if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
          settings.bgImage = await processImageFile(fileOrDataUrl);
        } else if (fileOrDataUrl === null) {
          settings.bgImage = "";
        } else {
          return false;
        }
        applyWindowAppearance();
        syncSettingsForm();
        saveSettings(true);
        return true;
      } catch (e) {
        return false;
      }
    },
    setCustomCSS: (css) => {
      const text = String(css === undefined || css === null ? "" : css);
      if (text.trim() && !isValidCSS(text)) return false;
      settings.customCSS = text;
      applyCustomCSS();
      saveSettings(true);
      return true;
    },
    validateCSS: (css) => isValidCSS(String(css || "")),
    openSettings: () => { openUI(); setTimeout(() => switchTab("settings"), 30); },
    openCustomCSS: () => { openUI(); setTimeout(() => switchTab("customcss"), 30); }
  };

})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);