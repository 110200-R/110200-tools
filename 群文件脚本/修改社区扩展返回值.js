// ==UserScript==
// @name         修改社区扩展返回值
// @version      1.0.4
// @description  用于修改社区连接扩展的返回值
// @author       110200
// @match        https://www.ccw.site/*
// @grant        none
// @run-at       document-start
// @icon         https://zhishi.oss-cn-beijing.aliyuncs.com/user_projects_assets/a6edfa0f6b8dda2fc126d847989c94ba.svg
// ==/UserScript==

(function (unsafeWindow) {
  'use strict';

  let vm = null;
  let currentVm = null;

  // ===== 预置规则 =====
  const PRESET_RULES = [
    { opcode: "community_getCoinCount",               type: "number",  value: "110200" },
    { opcode: "community_getUserValue",               type: "string",  value: "110200" },
    { opcode: "community_insertCoinAndWaitForResult", type: "boolean", value: "true"   },
    { opcode: "community_isFanOfSomeone",             type: "boolean", value: "true"   },
    { opcode: "community_isLiked",                    type: "boolean", value: "true"   },
    { opcode: "community_isMyFans",                   type: "boolean", value: "true"   },
    { opcode: "community_isUserFavoriteOtherProject", type: "boolean", value: "true"   },
    { opcode: "community_isUserLikedOtherProject",    type: "boolean", value: "true"   }
  ];

  // ===== 获取 VM =====
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

  // ===== 扩展返回值篡改 =====
  const rtTamperMap = new Map();
  const rtTamperOriginalPrimitives = new WeakMap();

  function convertRtValue(type, rawValue) {
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

  function applyRtToOpcode(opcode) {
    const runtime = (currentVm || vm)?.runtime;
    if (!runtime?._primitives) return;
    if (!rtTamperOriginalPrimitives.has(runtime)) {
      rtTamperOriginalPrimitives.set(runtime, new Map());
    }
    const origMap = rtTamperOriginalPrimitives.get(runtime);

    const rec = rtTamperMap.get(opcode);
    if (!rec) return;

    const current = runtime._primitives[opcode];
    if (current && current.__rtWrapper === true && origMap.has(opcode)) return;
    if (current && current.__rtWrapper !== true && typeof current === "function") {
      origMap.set(opcode, current);
    } else if (!origMap.has(opcode)) {
      return;
    }

    const original = origMap.get(opcode);
    if (typeof original !== "function") return;

    const value = rec.converted;
    const wrapped = function () {
      return value;
    };
    try {
      Object.defineProperty(wrapped, "__rtWrapper", {
        value: true, writable: false, enumerable: false, configurable: false
      });
      Object.defineProperty(wrapped, "toString", {
        value: () => original.toString(),
        writable: false, enumerable: false, configurable: false
      });
    } catch (e) { }
    runtime._primitives[opcode] = wrapped;
  }

  function applyPresetRules() {
    for (const rule of PRESET_RULES) {
      if (!rule || !rule.opcode) continue;
      const rawValue = rule.value === undefined ? "" : String(rule.value);
      const existing = rtTamperMap.get(rule.opcode);
      if (existing && existing.type === rule.type && existing.rawValue === rawValue) {
        continue;
      }
      rtTamperMap.set(rule.opcode, {
        type: rule.type,
        rawValue,
        converted: convertRtValue(rule.type, rawValue)
      });
    }
    for (const opcode of rtTamperMap.keys()) applyRtToOpcode(opcode);
  }

  // ===== 每 50ms 自动应用 =====
  let presetTimer = null;
  function startPresetLoop() {
    if (presetTimer) return;
    applyPresetRules();
    presetTimer = setInterval(() => {
      try { applyPresetRules(); } catch (e) { }
    }, 50);
  }

  window.addEventListener("beforeunload", () => {
    if (presetTimer) clearInterval(presetTimer);
    rtTamperMap.clear();
  });

  async function init() {
    try {
      currentVm = await getVM();
      if (!currentVm) return;
      vm = currentVm;
      startPresetLoop();
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
            startPresetLoop();
          }
        }).catch(() => {});
      }, 2000);
    }
  }, 3000);

})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);