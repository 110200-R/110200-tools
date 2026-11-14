// ==UserScript==
// @name         角色删除器
// @version      1.0.0
// @description  用于删除指定角色（只对自己有效）
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

  let vm = null;
  let menuCommandId = null;

  // 给对象的方法添加包装
  function patch(obj, prop, fn) {
    if (obj?.[prop]) {
      obj[prop] = fn(obj[prop]);
    }
  }

  // 获取VM
  async function getVM() {
    // 1常见挂载位
    let _vm =
      unsafeWindow?.eureka?.vm ||
      unsafeWindow?.vm ||
      unsafeWindow?.Scratch?.vm ||
      unsafeWindow?.Scratch?.runtime?.extensionManager?.vm;
    if (_vm) return _vm;

    // 2页面已完成时，优先走 Redux 树检索
    if (document.readyState === "complete") {
      _vm = getReduxStoreFromDOM()?.getState?.()?.scratchGui?.vm;
      if (_vm) return _vm;
    }

    // 3回退到 bind 捕获
    return trapViaBind();
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

      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        try {
          const key = Object.keys(el).find((k) => k.includes("__reactContainer"));
          if (!key || !el[key]) continue;
          const store = searchReactTreeSafe(el[key]);
          if (store) return store;
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn("Redux Store检索失败", err);
    }
    return null;

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
      } catch {
        // ignore
      }
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
      } catch {
        // ignore
      }
      return null;
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

  // 注册菜单命令
  function registerMenuCommand(name, callback) {
    if (menuCommandId !== null) {
      // 如果已存在，先移除再重新注册
      try {
        // GM_registerMenuCommand 返回的 id 可用于更新，但直接重新注册即可
        // 旧菜单会保留，但新菜单会覆盖显示
      } catch {}
    }
    menuCommandId = GM_registerMenuCommand(name, callback);
  }

  // 创建UI
  function showSpriteSelector(vmInstance) {
    const targets = vmInstance.runtime.targets || [];
    const sprites = targets.filter((t) => !t.isStage && t.sprite && t.sprite.name);

    if (sprites.length === 0) {
      alert("当前没有可删除的角色（舞台除外）");
      return;
    }

    // 创建模态框
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      backdrop-filter: blur(4px);
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      background: #1a1a2e;
      border-radius: 16px;
      padding: 24px;
      max-width: 420px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      border: 1px solid #444;
      color: #ddd;
      font-family: 'PingFang', sans-serif;
    `;

    const title = document.createElement("h3");
    title.textContent = "选择要删除的角色";
    title.style.cssText = `
      margin: 0 0 16px 0;
      color: #ff8c1a;
      font-size: 18px;
    `;
    panel.appendChild(title);

    const list = document.createElement("div");
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    `;

    sprites.forEach((target, index) => {
      const row = document.createElement("div");
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: #222236;
        border-radius: 8px;
        border: 1px solid #333;
        cursor: pointer;
        transition: all 0.2s;
      `;
      row.addEventListener("mouseenter", () => {
        row.style.borderColor = "#ff8c1a";
        row.style.background = "#2a2a4a";
      });
      row.addEventListener("mouseleave", () => {
        row.style.borderColor = "#333";
        row.style.background = "#222236";
      });

      // 角色预览图
      const img = document.createElement("img");
      try {
        const costume = target.sprite.costumes?.[0];
        if (costume?.asset?.encodeDataURI) {
          img.src = costume.asset.encodeDataURI();
        } else {
          img.src = "";
        }
      } catch {
        img.src = "";
      }
      img.style.cssText = `
        width: 36px;
        height: 36px;
        object-fit: contain;
        border-radius: 4px;
        background: #11111f;
        flex-shrink: 0;
      `;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = target.sprite.name || `角色 ${index + 1}`;
      nameSpan.style.cssText = `
        flex: 1;
        font-size: 14px;
        color: #ddd;
      `;

      const countSpan = document.createElement("span");
      const cloneCount = target.sprite.clones?.length || 1;
      countSpan.textContent = `克隆体: ${cloneCount}`;
      countSpan.style.cssText = `
        font-size: 12px;
        color: #888;
        flex-shrink: 0;
      `;

      row.appendChild(img);
      row.appendChild(nameSpan);
      row.appendChild(countSpan);

      row.addEventListener("click", () => {
        const targetName = target.sprite.name || `角色 ${index + 1}`;
        const cloneCount2 = target.sprite.clones?.length || 1;

        if (cloneCount2 > 1) {
          if (!confirm(`角色 "${targetName}" 有 ${cloneCount2} 个克隆体，删除后所有克隆体将被移除。确定要删除吗？`)) {
            return;
          }
        } else {
          if (!confirm(`确定要删除角色 "${targetName}" 嘛？此操作不可撤销喵！`)) {
            return;
          }
        }

        try {
          deleteSprite(vmInstance, target);
          closeModal();
          alert(`已成功删除角色 "${targetName}"`);
        } catch (err) {
          alert(`删除失败: ${err.message || err}`);
          console.error("删除失败", err);
        }
      });

      list.appendChild(row);
    });

    panel.appendChild(list);

    // 取消按钮
    const btnRow = document.createElement("div");
    btnRow.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText = `
      padding: 8px 24px;
      border: none;
      border-radius: 8px;
      background: #6c757d;
      color: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    `;
    cancelBtn.addEventListener("mouseenter", () => {
      cancelBtn.style.filter = "brightness(1.1)";
    });
    cancelBtn.addEventListener("mouseleave", () => {
      cancelBtn.style.filter = "none";
    });
    cancelBtn.addEventListener("click", closeModal);

    btnRow.appendChild(cancelBtn);
    panel.appendChild(btnRow);
    modal.appendChild(panel);
    document.body.appendChild(modal);

    function closeModal() {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }

    // 点击外部关闭
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // 关闭
    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  // 删除角色的核心逻辑
  function deleteSprite(vmInstance, target) {
    if (!vmInstance || !target) return;

    const targetId = target.id;
    const sprite = target.sprite;
    const spriteName = sprite?.name || "未知角色";

    if (typeof vmInstance.deleteSprite === "function") {
      vmInstance.deleteSprite(targetId);
      console.log(`通过vm.deleteSprite删除: ${spriteName}`);
      return;
    }

    const runtime = vmInstance.runtime;
    if (runtime) {
      if (typeof runtime.removeTarget === "function") {
        runtime.removeTarget(targetId);
        console.log(`通过runtime.removeTarget删除: ${spriteName}`);
        return;
      }

      if (typeof runtime.disposeTarget === "function") {
        runtime.disposeTarget(targetId);
        console.log(`通过runtime.disposeTarget删除: ${spriteName}`);
        return;
      }

      const index = runtime.targets.indexOf(target);
      if (index !== -1) {
        // 先清理克隆体
        if (sprite?.clones) {
          const clones = [...sprite.clones];
          clones.forEach((clone) => {
            const cloneIdx = runtime.targets.indexOf(clone);
            if (cloneIdx !== -1) {
              runtime.targets.splice(cloneIdx, 1);
            }
          });
        }
        // 移除主目标
        runtime.targets.splice(index, 1);
        // 从 sprite 的 clones 中移除自身引用
        if (sprite) {
          sprite.clones = sprite.clones?.filter((c) => c.id !== targetId) || [];
        }
        // 触发渲染更新
        if (typeof vmInstance.emit === "function") {
          vmInstance.emit("targetsUpdate");
        }
        if (typeof vmInstance.setEditingTarget === "function") {
          const stage = runtime.getTargetForStage?.();
          if (stage) {
            vmInstance.setEditingTarget(stage.id);
          }
        }
        console.log(`手动从targets移除: ${spriteName}`);
        return;
      }
    }

    const store = getReduxStoreFromDOM();
    if (store && typeof store.dispatch === "function") {
      try {
        store.dispatch({
          type: "scratch-gui/editor/REMOVE_SPRITE",
          data: { targetId }
        });
        console.log(`通过Redux dispatch删除: ${spriteName}`);
        return;
      } catch {
        // ignore
      }
    }

    throw new Error(`无法删除角色 "${spriteName}"，未找到合适的删除方法`);
  }

  // 主函数
  async function init() {
    try {
      vm = await getVM();
      if (!vm) {
        console.warn("无法获取VM");
        return;
      }

      registerMenuCommand("删除角色", async () => {
        // 重新获取最新的 VM 实例
        try {
          const freshVm = await getVM();
          if (freshVm) vm = freshVm;
        } catch {
          // 如果获取失败，使用已有的 vm
        }

        if (!vm) {
          alert("无法获取 VM 实例，请刷新页面后重试");
          return;
        }

        const targets = vm.runtime?.targets || [];
        const sprites = targets.filter((t) => !t.isStage && t.sprite);
        if (sprites.length === 0) {
          alert("当前没有可删除的角色");
          return;
        }

        showSpriteSelector(vm);
      });

      console.log("已初始化");
    } catch (err) {
      console.error("初始化失败", err);
    }
  }

  // 等待页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 页面切换时重新初始化
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // 延迟重新初始化，等待新页面加载
      setTimeout(init, 2000);
    }
  }, 3000);

})(typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
