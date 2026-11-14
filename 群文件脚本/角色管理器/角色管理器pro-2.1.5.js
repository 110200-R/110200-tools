// ==UserScript==
// @name         角色管理器Pro
// @version      2.1.5
// @description  支持获取角色详细信息，更改，插入角色，修改变量和列表，导出角色
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

(function (unsafeWindow) {
  'use strict';

  const THEME_COLOR = "#ff8c1a";
  const THEME_GRADIENT = "linear-gradient(135deg, #ff8c1a, #ff6b00)";

  const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="59.66622" height="59.66622" viewBox="0,0,59.66622,59.66622"><g transform="translate(-290.16689,-150.16689)"><g stroke="none" stroke-miterlimit="10"><path d="M290.16689,180c0,-16.47637 13.35674,-29.83311 29.83311,-29.83311c16.47637,0 29.83311,13.35674 29.83311,29.83311c0,16.47637 -13.35674,29.83311 -29.83311,29.83311c-16.47637,0 -29.83311,-13.35674 -29.83311,-29.83311z" fill="#e67e29" stroke-width="0"/><path d="M294.31587,180c0,-14.18496 11.49918,-25.68413 25.68413,-25.68413c14.18496,0 25.68413,11.49918 25.68413,25.68413c0,14.18496 -11.49918,25.68413 -25.68413,25.68413c-14.18496,0 -25.68413,-11.49918 -25.68413,-25.68413z" fill="#ff8c2e" stroke-width="0"/><text transform="translate(301.65912,186.79111) scale(0.62636,0.62636)" font-size="40" xml:space="preserve" fill="#ffffff" stroke-width="1" font-family="Sans Serif" font-weight="normal" text-anchor="start"><tspan x="0" dy="0">RM</tspan></text><path d="M300.53226,185.25699v-0.43552h38.76127v0.43552z" fill="#ff8c2e" stroke-width="0"/><path d="M326.01018,190.70099v-25.47791h1.0888v25.47791z" fill="#ff8c2e" stroke-width="0"/><path d="M298.79018,175.67556v-0.87104h44.85854v0.87104z" fill="#ff8c2e" stroke-width="0"/><path d="M305.56091,167.23725l1.23184,-1.23184l27.25438,27.25438l-1.23184,1.23184z" fill="#ff8c2e" stroke-width="0"/><text transform="translate(307.45471,194.51301) scale(0.12545,0.12545)" font-size="40" xml:space="preserve" fill="#ffffff" stroke-width="1" font-family="Sans Serif" font-weight="normal" text-anchor="start"><tspan x="0" dy="0">角色管理器</tspan></text></g></g></svg>`;

  const ICON_DATA_URL = 'data:image/svg+xml,' + encodeURIComponent(ICON_SVG);

  let vm = null;


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

  function getAssetFilesFromRuntime(runtime, targetId) {
    const targets = targetId ? [runtime.getTargetById(targetId)] : runtime.targets;
    const results = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!target) continue;
      const sprite = target.sprite;
      if (!sprite) continue;

      // costumes
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

      // sounds
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

    // fonts
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

  function patchVMForExport(vmInstance) {
    if (!vmInstance) return;
    if (vmInstance._patchedForExport) return;

    // serializeAssets
    if (typeof vmInstance.serializeAssets !== 'function') {
      vmInstance.serializeAssets = function (targetId) {
        return getAssetFilesFromRuntime(this.runtime, targetId);
      };
    }

    // _addFileDescsToZip
    if (typeof vmInstance._addFileDescsToZip !== 'function') {
      vmInstance._addFileDescsToZip = function (fileDescs, zip) {
        for (let i = 0; i < fileDescs.length; i++) {
          const desc = fileDescs[i];
          zip.file(desc.fileName, desc.fileContent);
        }
      };
    }

    // _saveProjectZip
    if (typeof vmInstance._saveProjectZip !== 'function') {
      vmInstance._saveProjectZip = function () {
        if (!JSZip) {
          throw new Error('JSZip 未加载，无法导出');
        }
        const zip = new JSZip();
        const json = this.toJSON();
        zip.file('project.json', json);
        this._addFileDescsToZip(this.serializeAssets(), zip);

        // 设置文件日期
        for (const key in zip.files) {
          if (zip.files[key]) {
            zip.files[key].date = VERSION_DATE;
          }
        }

        // 设置压缩选项
        for (const key in zip.files) {
          if (zip.files[key]) {
            const shouldCompress = EXTENSIONS.some(ext => key.endsWith(ext));
            zip.files[key].options.compression = shouldCompress ? 'DEFLATE' : 'STORE';
          }
        }

        return zip;
      };
    }

    // saveProjectSb3
    if (typeof vmInstance.saveProjectSb3 !== 'function') {
      vmInstance.saveProjectSb3 = function (type) {
        return this._saveProjectZip().generateAsync({
          type: type || 'blob',
          mimeType: 'application/x.scratch.sb3'
        });
      };
    }

    // exportSprite
    if (typeof vmInstance.exportSprite !== 'function') {
      vmInstance.exportSprite = function (targetId, type) {
        if (!JSZip) {
          throw new Error('JSZip 未加载，无法导出');
        }
        const json = this.toJSON(targetId);
        const zip = new JSZip();
        zip.file('sprite.json', json);
        this._addFileDescsToZip(this.serializeAssets(targetId), zip);

        // 设置文件日期
        for (const key in zip.files) {
          if (zip.files[key]) {
            zip.files[key].date = VERSION_DATE;
          }
        }

        // 设置压缩选项
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
        costumePreview: t.sprite.costumes?.[0]?.asset?.encodeDataURI?.() || ""
      }));
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

  let lockTimers = new Map();

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
        const isList = Array.isArray(variable.value);
        variables.push({
          id: id,
          name: variable.name || "未命名",
          value: variable.value,
          isList: isList,
          isCloud: !!variable.isCloud,
          targetId: target.id || "",
          targetName: targetName,
          isStage: target.isStage || false,
          displayValue: isList ? JSON.stringify(variable.value) : String(variable.value),
          isLocked: lockTimers.has(id)
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

      varObj.value = value;
      if (typeof vmInstance.emit === "function") {
        vmInstance.emit("variablesUpdate");
      }
      return true;
    } catch (err) {
      console.error("设置变量失败", err);
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

  function lockVariable(vmInstance, varId, targetId, value, interval = 100) {
    if (lockTimers.has(varId)) {
      unlockVariable(varId);
    }

    const currentValue = getVariableValue(vmInstance, targetId, varId);
    const lockValue = value !== undefined ? value : currentValue;

    if (lockValue === undefined) {
      showToast("无法获取变量当前值", "error");
      return false;
    }

    setVariable(vmInstance, targetId, varId, lockValue);

    const timer = setInterval(() => {
      const current = getVariableValue(vmInstance, targetId, varId);
      if (JSON.stringify(current) !== JSON.stringify(lockValue)) {
        setVariable(vmInstance, targetId, varId, lockValue);
      }
    }, interval);

    lockTimers.set(varId, {
      targetId: targetId,
      value: lockValue,
      timer: timer,
      interval: interval
    });

    showToast("已锁定变量 (值: " + (typeof lockValue === 'string' ? lockValue : JSON.stringify(lockValue)) + ")");
    return true;
  }

  function unlockVariable(varId) {
    const lockInfo = lockTimers.get(varId);
    if (lockInfo) {
      clearInterval(lockInfo.timer);
      lockTimers.delete(varId);
      showToast("已解锁变量");
      return true;
    }
    return false;
  }

  function toggleLock(vmInstance, varId, targetId, value) {
    if (lockTimers.has(varId)) {
      return unlockVariable(varId);
    } else {
      return lockVariable(vmInstance, varId, targetId, value);
    }
  }

  function getLockedVariables() {
    const result = [];
    for (const [varId, info] of lockTimers) {
      result.push({
        id: varId,
        targetId: info.targetId,
        value: info.value,
        interval: info.interval
      });
    }
    return result;
  }

  function findVariableByName(vmInstance, name) {
    const vars = getVariables(vmInstance);
    return vars.find(v => v.name === name);
  }

  function findVariablesByName(vmInstance, name) {
    const vars = getVariables(vmInstance);
    return vars.filter(v => v.name === name);
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
        dropZone.removeEventListener("dragover", () => {});
        dropZone.removeEventListener("dragleave", () => {});
        dropZone.removeEventListener("drop", () => {});
        fileInput.removeEventListener("change", () => {});
        overlay.removeEventListener("click", () => {});
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
      // 确保VM已被patch
      patchVMForExport(vmInstance);

      if (typeof vmInstance.exportSprite !== 'function') {
        showToast("当前环境不支持导出角色", "error");
        return false;
      }

      // 检查JSZip
      if (!JSZip) {
        showToast("JSZip 库未加载，请检查网络或刷新重试", "error");
        return false;
      }

      const blob = await vmInstance.exportSprite(targetId);
      const fileName = spriteName + '.sprite3';

      // 使用 GM_download 或创建 a 标签下载
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


  const styles = `
    .srm-float-btn{position:fixed;bottom:80px;right:20px;z-index:99998;width:56px;height:56px;border-radius:50%;border:none;background:${THEME_GRADIENT};cursor:pointer;box-shadow:0 4px 20px rgba(255,140,26,0.4);transition:all .3s cubic-bezier(.34,1.56,.64,1);display:flex;align-items:center;justify-content:center;user-select:none;touch-action:none;padding:0;overflow:hidden}
    .srm-float-btn:hover{transform:scale(1.12) rotate(-5deg);box-shadow:0 8px 35px rgba(255,140,26,0.5)}
    .srm-float-btn:active{transform:scale(.9)}
    .srm-float-btn img{width:70%;height:70%;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2))}
    .srm-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);backdrop-filter:blur(20px) saturate(1.2);z-index:99999;display:none;align-items:center;justify-content:center;animation:srm-fade-in .3s cubic-bezier(.34,1.56,.64,1)}
    .srm-overlay.open{display:flex}
    .srm-panel{background:rgba(20,20,40,0.85);backdrop-filter:blur(30px);border-radius:24px;padding:0;max-width:620px;width:94%;max-height:85vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.8),0 0 40px rgba(255,140,26,0.05);border:1px solid rgba(255,255,255,0.08);color:#e8e8e8;font-family:-apple-system,'PingFang SC','Segoe UI',sans-serif;animation:srm-scale-in .35s cubic-bezier(.34,1.56,.64,1);position:relative}
    .srm-panel-scroll{padding:24px 28px 28px;max-height:85vh;overflow-y:auto;position:relative;z-index:1}
    .srm-panel-scroll::-webkit-scrollbar{width:4px}
    .srm-panel-scroll::-webkit-scrollbar-track{background:transparent}
    .srm-panel-scroll::-webkit-scrollbar-thumb{background:#ff8c1a;border-radius:4px}
    .srm-header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.06)}
    .srm-header .srm-back,.srm-header .srm-close{background:rgba(255,255,255,0.05);border:none;color:rgba(255,255,255,0.5);width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center}
    .srm-header .srm-back:hover,.srm-header .srm-close:hover{background:rgba(255,255,255,0.12);color:#fff;transform:scale(1.05)}
    .srm-header .srm-close:hover{background:rgba(255,70,70,0.2);color:#ff6b6b}
    .srm-header .srm-title{flex:1;font-size:20px;font-weight:700;background:${THEME_GRADIENT};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0;letter-spacing:-.3px}
    .srm-tabs{display:flex;gap:4px;margin-bottom:16px;background:rgba(255,255,255,0.05);border-radius:12px;padding:4px}
    .srm-tab{flex:1;padding:8px 12px;border:none;border-radius:10px;background:transparent;color:rgba(255,255,255,0.5);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s}
    .srm-tab:hover{color:rgba(255,255,255,0.8)}
    .srm-tab.active{background:${THEME_GRADIENT};color:#fff;box-shadow:0 4px 15px rgba(255,140,26,0.3)}

    .srm-sprite-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:12px;margin:4px 0 8px}
    .srm-sprite-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:12px 8px 10px;text-align:center;cursor:pointer;transition:all .3s cubic-bezier(.34,1.56,.64,1);position:relative;overflow:hidden}
    .srm-sprite-card:hover{transform:translateY(-4px) scale(1.02);border-color:#ff8c1a;box-shadow:0 8px 30px rgba(255,140,26,0.15)}
    .srm-sprite-card:active{transform:scale(.95)}
    .srm-sprite-card img{width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:10px;background:rgba(0,0,0,0.3);position:relative;z-index:1}
    .srm-sprite-card .srm-name{font-size:12px;font-weight:500;color:#e8e8e8;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;position:relative;z-index:1}
    .srm-sprite-card .srm-badge{font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px;position:relative;z-index:1}
    .srm-sprite-card .srm-badge span{margin:0 4px}
    .srm-sprite-card.srm-add-card{display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px dashed rgba(255,255,255,0.15);background:rgba(255,255,255,0.02);cursor:pointer;min-height:120px;transition:all .3s cubic-bezier(.34,1.56,.64,1)}
    .srm-sprite-card.srm-add-card:hover{border-color:#ff8c1a;background:rgba(255,140,26,0.08);transform:translateY(-4px) scale(1.02);box-shadow:0 8px 30px rgba(255,140,26,0.15)}
    .srm-sprite-card.srm-add-card:active{transform:scale(.95)}
    .srm-sprite-card.srm-add-card .srm-add-icon{font-size:36px;color:rgba(255,255,255,0.3);transition:all .3s;line-height:1}
    .srm-sprite-card.srm-add-card:hover .srm-add-icon{color:#ff8c1a;transform:rotate(90deg) scale(1.1)}
    .srm-sprite-card.srm-add-card .srm-add-label{font-size:11px;color:rgba(255,255,255,0.4);margin-top:6px;transition:color .3s}
    .srm-sprite-card.srm-add-card:hover .srm-add-label{color:rgba(255,255,255,0.7)}

    .srm-detail-profile{display:flex;align-items:center;gap:18px;margin-bottom:20px;padding:16px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.06)}
    .srm-detail-profile img{width:64px;height:64px;object-fit:contain;border-radius:12px;background:rgba(0,0,0,0.3);flex-shrink:0;border:2px solid rgba(255,255,255,0.06)}
    .srm-detail-profile .srm-info{flex:1;min-width:0}
    .srm-detail-profile .srm-info .srm-name{font-size:17px;font-weight:600;color:#e8e8e8;margin:0}
    .srm-detail-profile .srm-info .srm-meta{font-size:12px;color:rgba(255,255,255,0.5);margin:4px 0 0 0}
    .srm-detail-profile .srm-actions{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap}
    .srm-detail-profile .srm-actions button{padding:8px 14px;border:none;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;transition:all .2s}
    .srm-detail-profile .srm-actions .srm-btn-rename{background:${THEME_GRADIENT};color:#fff}
    .srm-detail-profile .srm-actions .srm-btn-rename:hover{transform:scale(1.05);box-shadow:0 4px 15px rgba(255,140,26,0.3)}
    .srm-detail-profile .srm-actions .srm-btn-delete{background:rgba(231,76,60,0.2);color:#ff6b6b;border:1px solid rgba(231,76,60,0.2)}
    .srm-detail-profile .srm-actions .srm-btn-delete:hover{background:rgba(231,76,60,0.35);transform:scale(1.05)}
    .srm-detail-profile .srm-actions .srm-btn-export{background:linear-gradient(135deg,#2ecc71,#27ae60);color:#fff}
    .srm-detail-profile .srm-actions .srm-btn-export:hover{transform:scale(1.05);box-shadow:0 4px 15px rgba(46,204,113,0.3)}
    .srm-section{margin-top:16px}
    .srm-section-title{font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);margin:0 0 10px 0;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:.5px}
    .srm-section-title span{font-weight:400;opacity:.6}
    .srm-item-list{display:flex;flex-direction:column;gap:6px}
    .srm-item{display:flex;align-items:center;gap:12px;padding:8px 12px;background:rgba(255,255,255,0.05);border-radius:10px;border:1px solid rgba(255,255,255,0.06);transition:all .2s}
    .srm-item:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.08)}
    .srm-item .srm-item-idx{font-size:11px;color:rgba(255,255,255,0.5);flex-shrink:0;min-width:28px}
    .srm-item .srm-item-name{flex:1;font-size:13px;color:#e8e8e8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .srm-item .srm-item-current{font-size:10px;color:#ff8c1a;background:rgba(255,140,26,0.15);padding:2px 10px;border-radius:12px;flex-shrink:0;font-weight:500}
    .srm-item .srm-item-del{background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:14px;padding:4px 6px;border-radius:6px;transition:all .2s;flex-shrink:0}
    .srm-item .srm-item-del:hover{color:#ff6b6b;background:rgba(231,76,60,0.1)}
    .srm-empty{text-align:center;color:rgba(255,255,255,0.5);font-size:14px;padding:30px 0}
    .srm-empty .srm-empty-icon{font-size:32px;display:block;margin-bottom:10px;opacity:.5}

    .srm-var-group{margin-bottom:14px;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden}
    .srm-var-group-header{display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.04);cursor:pointer;transition:background .2s;user-select:none}
    .srm-var-group-header:hover{background:rgba(255,255,255,0.08)}
    .srm-var-group-header .srm-group-caret{font-size:12px;color:rgba(255,255,255,0.3);transition:transform .3s;flex-shrink:0}
    .srm-var-group-header .srm-group-caret.open{transform:rotate(90deg)}
    .srm-var-group-header .srm-group-name{font-size:14px;font-weight:600;color:#e8e8e8;flex:1}
    .srm-var-group-header .srm-group-count{font-size:11px;color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.06);padding:2px 12px;border-radius:12px}
    .srm-var-group-header .srm-group-badge{font-size:10px;padding:2px 10px;border-radius:12px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4);flex-shrink:0}
    .srm-var-group-header .srm-group-badge.stage{background:rgba(52,152,219,0.15);color:#5dade2}
    .srm-var-group-body{padding:6px 10px 10px;display:block}
    .srm-var-group-body.collapsed{display:none}

    .srm-var-item{display:flex;align-items:center;gap:8px;padding:5px 8px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.04);transition:all .2s;margin-bottom:4px}
    .srm-var-item:hover{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.06)}
    .srm-var-item.locked-item{border-color:rgba(255,140,26,0.3);background:rgba(255,140,26,0.06)}
    .srm-var-item .srm-var-name{font-size:12px;color:#e8e8e8;font-weight:500;min-width:60px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .srm-var-item .srm-var-type{font-size:9px;padding:1px 8px;border-radius:10px;flex-shrink:0;font-weight:500}
    .srm-var-type.cloud{background:rgba(52,152,219,0.2);color:#5dade2}
    .srm-var-type.list{background:rgba(46,204,113,0.2);color:#58d68d}
    .srm-var-type.normal{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4)}
    .srm-var-item .srm-var-edit{flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:3px 8px;font-size:12px;color:#e8e8e8;font-family:'SF Mono','Menlo','Monaco',monospace;min-width:50px;transition:all .2s}
    .srm-var-item .srm-var-edit:focus{outline:none;border-color:#ff8c1a;box-shadow:0 0 15px rgba(255,140,26,0.08)}
    .srm-var-item .srm-var-edit:disabled{opacity:0.5;cursor:not-allowed}
    .srm-var-item .srm-var-edit::placeholder{color:rgba(255,255,255,0.15)}
    .srm-var-item .srm-var-btn{background:${THEME_GRADIENT};border:none;border-radius:6px;padding:3px 12px;color:#fff;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;flex-shrink:0}
    .srm-var-item .srm-var-btn:hover{transform:scale(1.05);box-shadow:0 2px 10px rgba(255,140,26,0.3)}
    .srm-var-item .srm-var-btn:active{transform:scale(.95)}
    .srm-var-item .srm-var-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none!important}
    .srm-var-item .srm-var-lock{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:2px 8px;color:rgba(255,255,255,0.3);font-size:11px;cursor:pointer;transition:all .2s;flex-shrink:0}
    .srm-var-item .srm-var-lock:hover{background:rgba(255,140,26,0.1);border-color:#ff8c1a;color:#ff8c1a}
    .srm-var-item .srm-var-lock.locked{background:rgba(255,140,26,0.15);border-color:#ff8c1a;color:#ff8c1a}
    .srm-var-item .srm-var-lock.locked:hover{background:rgba(231,76,60,0.15);border-color:#ff6b6b;color:#ff6b6b}

    .srm-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);z-index:100000;padding:12px 24px;border-radius:12px;background:rgba(20,20,40,0.9);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06);color:#e8e8e8;font-family:-apple-system,'PingFang SC',sans-serif;font-size:13px;font-weight:500;box-shadow:0 25px 60px rgba(0,0,0,0.8);opacity:0;transition:all .4s cubic-bezier(.34,1.56,.64,1);pointer-events:none;max-width:80%}
    .srm-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    .srm-toast.success{border-color:rgba(46,204,113,0.3)}
    .srm-toast.error{border-color:rgba(231,76,60,0.3)}
    @keyframes srm-fade-in{from{opacity:0}to{opacity:1}}
    @keyframes srm-scale-in{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
  `;

  let currentVm = null;
  let currentView = "list";
  let currentSpriteData = null;
  let currentTab = "sprites";
  let overlay = null;
  let panel = null;
  let floatBtn = null;
  let toastEl = null;
  let isOpen = false;
  let isUIRendered = false;
  let renderLock = false;

  let collapsedGroups = new Set();

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
      floatBtn.innerHTML = `<img src="${ICON_DATA_URL}" alt="角色管理器">`;
      floatBtn.title = "角色管理器";
      floatBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleUI();
      });
      document.body.appendChild(floatBtn);
      makeDraggable(floatBtn);
    }

    if (!overlay || !document.body.contains(overlay)) {
      if (overlay && document.body.contains(overlay)) overlay.remove();
      overlay = document.createElement("div");
      overlay.className = "srm-overlay";
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeUI();
      });
      document.body.appendChild(overlay);
    }

    if (!panel || !document.body.contains(panel)) {
      if (panel && document.body.contains(panel)) panel.remove();
      panel = document.createElement("div");
      panel.className = "srm-panel";
      overlay.appendChild(panel);
    }

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
          vm = v;
          // Patch VM for export
          patchVMForExport(v);
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
    overlay.classList.add("open");
    currentView = "list";
    currentTab = "sprites";
    renderMain();
  }

  function closeUI() {
    isOpen = false;
    if (overlay) overlay.classList.remove("open");
  }

  function goBack() {
    currentView = "list";
    renderMain();
  }

  function switchTab(tab) {
    currentTab = tab;
    renderMain();
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
    if (renderLock || !panel) return;
    renderLock = true;

    try {
      const sprites = getSprites(currentVm);
      const groups = getVariablesGrouped(currentVm);

      const scrollDiv = document.createElement("div");
      scrollDiv.className = "srm-panel-scroll";

      let html = `
        <div class="srm-header">
          <h3 class="srm-title">角色管理器Pro</h3>
          <button class="srm-close" id="srm-close-btn">✕</button>
        </div>
        <div class="srm-tabs">
          <button class="srm-tab ${currentTab === 'sprites' ? 'active' : ''}" data-tab="sprites">角色</button>
          <button class="srm-tab ${currentTab === 'variables' ? 'active' : ''}" data-tab="variables">变量</button>
        </div>
      `;

      if (currentTab === "sprites") {
        html += renderSpriteListHTML(sprites);
      } else {
        html += renderVariableGroupsHTML(groups);
      }

      scrollDiv.innerHTML = html;
      panel.innerHTML = "";
      panel.appendChild(scrollDiv);

      const closeBtn = panel.querySelector("#srm-close-btn");
      if (closeBtn) closeBtn.addEventListener("click", closeUI);

      const tabs = panel.querySelectorAll(".srm-tab");
      tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          switchTab(tab.dataset.tab);
        });
      });

      if (currentTab === "sprites") {
        bindSpriteEvents(panel, sprites);
      } else {
        bindVariableEvents(panel);
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

  function bindSpriteEvents(panel, sprites) {
    const addBtn = panel.querySelector("#srm-add-sprite-btn");
    if (addBtn) {
      addBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const success = await insertSprite(currentVm);
        if (success) {
          renderMain();
        }
      });
    }

    const cards = panel.querySelectorAll(".srm-sprite-card:not(.srm-add-card)");
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
      const varCount = group.variables.length;
      const stageLabel = group.isStage ? '舞台' : group.targetName;

      html += `
        <div class="srm-var-group" data-target-id="${group.targetId}">
          <div class="srm-var-group-header" data-target-id="${group.targetId}">
            <span class="srm-group-caret ${isCollapsed ? '' : 'open'}">▶</span>
            <span class="srm-group-name">${stageLabel}</span>
            <span class="srm-group-badge ${group.isStage ? 'stage' : ''}">${group.isStage ? '舞台' : '角色'}</span>
            <span class="srm-group-count">${varCount} 个变量</span>
          </div>
          <div class="srm-var-group-body ${isCollapsed ? 'collapsed' : ''}">
      `;

      for (const v of group.variables) {
        const isLocked = lockTimers.has(v.id);
        const typeClass = v.isCloud ? 'cloud' : (v.isList ? 'list' : 'normal');
        const typeLabel = v.isCloud ? '云' : (v.isList ? '列表' : '变量');
        const displayVal = v.isList ? JSON.stringify(v.value) : String(v.value);
        const lockedClass = isLocked ? 'locked-item' : '';

        html += `
          <div class="srm-var-item ${lockedClass}" data-var-id="${v.id}">
            <span class="srm-var-name" title="${v.name}">${v.name}</span>
            <span class="srm-var-type ${typeClass}">${typeLabel}</span>
            <input class="srm-var-edit" type="text" value="${displayVal.replace(/"/g, '&quot;')}"
                   placeholder="${v.isList ? '列表值' : '变量值'}"
                   data-var-id="${v.id}" data-target-id="${v.targetId}" data-is-list="${v.isList}"
                   ${isLocked ? 'disabled' : ''}>
            <button class="srm-var-btn" data-var-id="${v.id}" data-target-id="${v.targetId}" data-is-list="${v.isList}" ${isLocked ? 'disabled' : ''}>
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

  function bindVariableEvents(panel) {
    const groupHeaders = panel.querySelectorAll(".srm-var-group-header");
    groupHeaders.forEach(header => {
      header.addEventListener("click", () => {
        const targetId = header.dataset.targetId;
        toggleGroup(targetId);
      });
    });

    const updateBtns = panel.querySelectorAll(".srm-var-btn:not([disabled])");
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
          if (lockTimers.has(varId)) {
            const lockInfo = lockTimers.get(varId);
            lockInfo.value = value;
            showToast("变量已更新 (锁定值同步更新)");
          } else {
            showToast("变量已更新");
          }
          setTimeout(() => renderMain(), 300);
        } else {
          showToast("更新变量失败", "error");
        }
      });
    });

    const inputs = panel.querySelectorAll(".srm-var-edit:not([disabled])");
    inputs.forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const btn = input.parentElement.querySelector(".srm-var-btn:not([disabled])");
          if (btn) btn.click();
        }
      });
    });

    const lockBtns = panel.querySelectorAll(".srm-var-lock");
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

        if (lockTimers.has(varId)) {
          unlockVariable(varId);
          setTimeout(() => renderMain(), 200);
        } else {
          if (lockVariable(currentVm, varId, targetId, lockValue)) {
            setTimeout(() => renderMain(), 200);
          }
        }
      });
    });
  }


  function renderDetail() {
    if (renderLock || !panel || !currentSpriteData) return;
    renderLock = true;

    try {
      const { sprite, name, id, costumeCount, soundCount, costumePreview } = currentSpriteData;

      const scrollDiv = document.createElement("div");
      scrollDiv.className = "srm-panel-scroll";

      let html = `
        <div class="srm-header">
          <button class="srm-back" id="srm-back-btn">‹</button>
          <h3 class="srm-title">角色详情</h3>
          <button class="srm-close" id="srm-close-btn">✕</button>
        </div>

        <div class="srm-detail-profile">
          <img src="${costumePreview || ''}" alt="${name}" loading="lazy"
               onerror="this.src='data:image/svg+xml,%253Csvg xmlns=%2522http://www.w3.org/2000/svg%2522 width=%252264%2522 height=%252264%2522%253E%253Crect width=%252264%2522 height=%252264%2522 fill=%2522rgba(255,255,255,0.05)%2522/%253E%253Ctext x=%252232%2522 y=%252240%2522 text-anchor=%2522middle%2522 fill=%2522rgba(255,255,255,0.2)%2522 font-size=%252228%2522%253E?%253C/text%253E%253C/svg%253E'">
          <div class="srm-info">
            <p class="srm-name">${name}</p>
            <p class="srm-meta">ID: ${id.slice(0, 8)} · 克隆体: ${currentSpriteData.clones?.length || 1}</p>
          </div>
          <div class="srm-actions">
            <button class="srm-btn-export" id="srm-export-btn">导出</button>
            <button class="srm-btn-rename" id="srm-rename-btn">重命名</button>
            <button class="srm-btn-delete" id="srm-delete-btn">删除</button>
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
              <button class="srm-item-del" data-type="sound" data-index="${i}">✕</button>
            </div>
          `;
        }
      }

      html += `
          </div>
        </div>
      `;

      scrollDiv.innerHTML = html;
      panel.innerHTML = "";
      panel.appendChild(scrollDiv);

      const closeBtn = panel.querySelector("#srm-close-btn");
      if (closeBtn) closeBtn.addEventListener("click", closeUI);

      const backBtn = panel.querySelector("#srm-back-btn");
      if (backBtn) backBtn.addEventListener("click", goBack);

      // 导出
      const exportBtn = panel.querySelector("#srm-export-btn");
      if (exportBtn) {
        exportBtn.addEventListener("click", async () => {
          // 确保 VM 已 patch
          patchVMForExport(currentVm);
          // 检查 JSZip
          if (!JSZip) {
            showToast("JSZip 库未加载，请检查网络或刷新重试", "error");
            return;
          }
          await exportSpriteAsFile(currentVm, id, name);
        });
      }

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
            ? `角色 "${name}" 有 ${cloneCount} 个克隆体，确定要删除吗？`
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

      const costumeList = panel.querySelector("#srm-costume-list");
      if (costumeList) {
        costumeList.addEventListener("click", (e) => {
          const btn = e.target.closest('.srm-item-del[data-type="costume"]');
          if (btn) {
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
          }
        });
      }

      const soundList = panel.querySelector("#srm-sound-list");
      if (soundList) {
        soundList.addEventListener("click", (e) => {
          const btn = e.target.closest('.srm-item-del[data-type="sound"]');
          if (btn) {
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
          }
        });
      }
    } finally {
      renderLock = false;
    }
  }


  window.addEventListener("beforeunload", () => {
    for (const [varId, info] of lockTimers) {
      clearInterval(info.timer);
    }
    lockTimers.clear();
  });

  function getVMInstance() { return currentVm; }

  async function init() {
    try {
      currentVm = await getVM();
      if (!currentVm) {
        console.warn("无法获取VM");
        return;
      }
      vm = currentVm;
      // Patch VM for export
      patchVMForExport(currentVm);
      createUI();
      console.log("角色管理器已加载");
    } catch (err) {
      console.error("角色管理器初始化失败", err);
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
    getVariables: () => getVariables(currentVm),
    getVariablesGrouped: () => getVariablesGrouped(currentVm),
    deleteSprite: (id) => deleteSprite(currentVm, id),
    renameSprite: (id, name) => renameSprite(currentVm, id, name),
    insertSprite: () => insertSprite(currentVm),
    setVariable: (targetId, varId, value) => setVariable(currentVm, targetId, varId, value),
    findVariableByName: (name) => findVariableByName(currentVm, name),
    findVariablesByName: (name) => findVariablesByName(currentVm, name),
    lockVariable: (varId, targetId, value, interval) => lockVariable(currentVm, varId, targetId, value, interval),
    unlockVariable: (varId) => unlockVariable(varId),
    toggleLock: (varId, targetId, value) => toggleLock(currentVm, varId, targetId, value),
    getLockedVariables: getLockedVariables,
    // 新增导出功能
    exportSprite: (targetId, spriteName) => exportSpriteAsFile(currentVm, targetId, spriteName),
    patchVMForExport: () => patchVMForExport(currentVm),
  };

})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);