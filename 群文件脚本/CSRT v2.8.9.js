// ==UserScript==
// @name         CSRT - CCW Security Research Tool
// @namespace    https://www.ccw.site/
// @version      2.8.9
// @description  CCW官方安全研究工具 - 完整扩展拦截 | 代码修改 | 附加功能 | 经济合约 | 伪装手机号 | 成就排行 | 变量折叠 | 作品替换 | 作品下载 | 毛玻璃UI | 变量管理 | 云数据 | 排行榜
// @author       110200
// @match        https://www.ccw.site/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_download
// @run-at       document-start
// ==/UserScript==
(function () {
  "use strict";
  const vLS289 = "2.8.9";
  const vLSCSRTCCWSecurityResea = "CSRT - CCW Security Research Tool";
  function f() {
    const v18 = document.createElement("style");
    v18.id = "csrt-glass-theme";
    v18.textContent = "\n            /* ===== CSRT 毛玻璃主题 v2.8.9 ===== */\n            .csrt-window {\n                background: rgba(16, 18, 27, 0.75) !important;\n                backdrop-filter: blur(24px) !important;\n                -webkit-backdrop-filter: blur(24px) !important;\n                border: 1px solid rgba(255, 255, 255, 0.08) !important;\n                border-radius: 20px !important;\n                box-shadow: 0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05) !important;\n                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n                color: #eee;\n                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n            }\n            .csrt-window .csrt-header {\n                background: rgba(255,255,255,0.04) !important;\n                border-bottom: 1px solid rgba(255,255,255,0.06) !important;\n                backdrop-filter: blur(8px) !important;\n                -webkit-backdrop-filter: blur(8px) !important;\n                border-radius: 20px 20px 0 0 !important;\n                padding: 14px 20px !important;\n                display: flex !important;\n                justify-content: space-between !important;\n                align-items: center !important;\n                flex-shrink: 0 !important;\n            }\n            .csrt-window .csrt-header .csrt-title {\n                color: #f0f0f0 !important;\n                font-weight: 600 !important;\n                letter-spacing: 0.3px !important;\n                font-size: 16px !important;\n                display: flex !important;\n                align-items: center !important;\n                gap: 10px !important;\n            }\n            .csrt-window .csrt-header .csrt-title .csrt-version {\n                font-size: 11px !important;\n                opacity: 0.5 !important;\n                font-weight: 400 !important;\n            }\n            .csrt-window .csrt-header .csrt-title .csrt-author {\n                font-size: 11px !important;\n                background: rgba(255,255,255,0.08) !important;\n                padding: 2px 10px !important;\n                border-radius: 12px !important;\n                font-weight: 400 !important;\n                opacity: 0.6 !important;\n            }\n            .csrt-window .csrt-header .csrt-close-btn {\n                background: none !important;\n                border: none !important;\n                color: rgba(255,255,255,0.5) !important;\n                font-size: 20px !important;\n                cursor: pointer !important;\n                padding: 0 8px !important;\n                transition: all 0.2s !important;\n                border-radius: 8px !important;\n            }\n            .csrt-window .csrt-header .csrt-close-btn:hover {\n                color: #fff !important;\n                background: rgba(255,85,85,0.2) !important;\n            }\n            .csrt-window .csrt-header .csrt-right-section {\n                display: flex !important;\n                align-items: center !important;\n                gap: 8px !important;\n            }\n            .csrt-scale-btn {\n                padding: 2px 10px !important;\n                font-size: 16px !important;\n                min-width: 28px !important;\n                height: 28px !important;\n                border-radius: 6px !important;\n                display: flex !important;\n                align-items: center !important;\n                justify-content: center !important;\n                background: rgba(255,255,255,0.04) !important;\n                border: 1px solid rgba(255,255,255,0.06) !important;\n                color: rgba(255,255,255,0.6) !important;\n                cursor: pointer !important;\n                transition: all 0.2s !important;\n                font-family: inherit !important;\n            }\n            .csrt-scale-btn:hover {\n                background: rgba(124,140,255,0.15) !important;\n                border-color: rgba(124,140,255,0.25) !important;\n                color: #fff !important;\n            }\n            .csrt-scale-display {\n                color: rgba(255,255,255,0.6) !important;\n                font-size: 12px !important;\n                min-width: 44px !important;\n                text-align: center !important;\n                font-weight: 500 !important;\n            }\n            .csrt-window .csrt-content {\n                padding: 20px !important;\n                overflow-y: auto !important;\n                flex: 1 !important;\n                background: rgba(0,0,0,0.15) !important;\n            }\n            .csrt-tab {\n                padding: 8px 18px !important;\n                background: transparent !important;\n                color: rgba(255,255,255,0.5) !important;\n                border: 1px solid transparent !important;\n                border-radius: 10px !important;\n                cursor: pointer !important;\n                font-size: 13px !important;\n                font-weight: 500 !important;\n                transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n                backdrop-filter: blur(4px) !important;\n                -webkit-backdrop-filter: blur(4px) !important;\n                letter-spacing: 0.3px !important;\n                transform: scale(1) !important;\n                font-family: inherit !important;\n            }\n            .csrt-tab:hover {\n                background: rgba(255,255,255,0.06) !important;\n                transform: scale(1.04) !important;\n                color: rgba(255,255,255,0.8) !important;\n            }\n            .csrt-tab.active {\n                background: rgba(124,140,255,0.15) !important;\n                color: #ffffff !important;\n                border-color: rgba(124,140,255,0.25) !important;\n                box-shadow: 0 0 20px rgba(124,140,255,0.05) !important;\n            }\n            .csrt-tab:active {\n                transform: scale(0.95) !important;\n            }\n            .csrt-tabs {\n                display: flex !important;\n                gap: 4px !important;\n                margin-bottom: 16px !important;\n                border-bottom: 1px solid rgba(255,255,255,0.06) !important;\n                padding-bottom: 12px !important;\n                flex-wrap: wrap !important;\n            }\n            .csrt-card {\n                background: rgba(255,255,255,0.03) !important;\n                border: 1px solid rgba(255,255,255,0.05) !important;\n                border-radius: 12px !important;\n                padding: 16px !important;\n                backdrop-filter: blur(4px) !important;\n                -webkit-backdrop-filter: blur(4px) !important;\n                transition: all 0.2s ease !important;\n            }\n            .csrt-card:hover {\n                background: rgba(255,255,255,0.05) !important;\n                border-color: rgba(255,255,255,0.08) !important;\n                transform: translateY(-1px) !important;\n                box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;\n            }\n            .csrt-glass-btn {\n                background: rgba(255,255,255,0.04) !important;\n                border: 1px solid rgba(255,255,255,0.06) !important;\n                border-radius: 10px !important;\n                padding: 8px 16px !important;\n                color: #e2e8f0 !important;\n                cursor: pointer !important;\n                transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n                backdrop-filter: blur(4px) !important;\n                -webkit-backdrop-filter: blur(4px) !important;\n                font-family: inherit !important;\n                font-size: 13px !important;\n                font-weight: 500 !important;\n            }\n            .csrt-glass-btn:hover {\n                background: rgba(124,140,255,0.15) !important;\n                border-color: rgba(124,140,255,0.25) !important;\n                transform: scale(1.04) !important;\n                box-shadow: 0 4px 12px rgba(124,140,255,0.15) !important;\n            }\n            .csrt-glass-btn:active {\n                transform: scale(0.95) !important;\n            }\n            .csrt-glass-btn.primary {\n                background: rgba(124,140,255,0.2) !important;\n                border-color: rgba(124,140,255,0.3) !important;\n                color: #8be9fd !important;\n            }\n            .csrt-glass-btn.success {\n                background: rgba(80,250,123,0.12) !important;\n                border-color: rgba(80,250,123,0.2) !important;\n                color: #50fa7b !important;\n            }\n            .csrt-glass-btn.danger {\n                background: rgba(255,85,85,0.12) !important;\n                border-color: rgba(255,85,85,0.2) !important;\n                color: #ff5555 !important;\n            }\n            .csrt-glass-btn.warning {\n                background: rgba(255,184,108,0.12) !important;\n                border-color: rgba(255,184,108,0.2) !important;\n                color: #ffb86c !important;\n            }\n            .csrt-glass-btn.info {\n                background: rgba(139,233,253,0.12) !important;\n                border-color: rgba(139,233,253,0.2) !important;\n                color: #8be9fd !important;\n            }\n            .csrt-input {\n                background: rgba(0,0,0,0.3) !important;\n                border: 1px solid rgba(255,255,255,0.06) !important;\n                border-radius: 8px !important;\n                color: #e2e8f0 !important;\n                padding: 6px 12px !important;\n                font-size: 13px !important;\n                transition: all 0.2s ease !important;\n                outline: none !important;\n                font-family: inherit !important;\n                width: 100% !important;\n                box-sizing: border-box !important;\n            }\n            .csrt-input:focus {\n                border-color: rgba(124,140,255,0.4) !important;\n                box-shadow: 0 0 0 3px rgba(124,140,255,0.08) !important;\n            }\n            .csrt-input::placeholder {\n                color: rgba(255,255,255,0.25) !important;\n            }\n            .csrt-select {\n                background: rgba(0,0,0,0.3) !important;\n                border: 1px solid rgba(255,255,255,0.06) !important;\n                border-radius: 8px !important;\n                color: #e2e8f0 !important;\n                padding: 6px 12px !important;\n                font-size: 12px !important;\n                font-family: inherit !important;\n                outline: none !important;\n            }\n            .csrt-select:focus {\n                border-color: rgba(124,140,255,0.4) !important;\n            }\n            .csrt-scroll::-webkit-scrollbar { width: 4px !important; }\n            .csrt-scroll::-webkit-scrollbar-track { background: transparent !important; }\n            .csrt-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12) !important; border-radius: 4px !important; }\n            .csrt-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2) !important; }\n            .csrt-badge {\n                display: inline-block !important;\n                padding: 2px 10px !important;\n                border-radius: 20px !important;\n                font-size: 11px !important;\n                font-weight: 500 !important;\n                background: rgba(124,140,255,0.12) !important;\n                color: #7c8cff !important;\n                border: 1px solid rgba(124,140,255,0.1) !important;\n                backdrop-filter: blur(4px) !important;\n                -webkit-backdrop-filter: blur(4px) !important;\n            }\n            .csrt-badge.success {\n                background: rgba(80,250,123,0.12) !important;\n                color: #50fa7b !important;\n                border-color: rgba(80,250,123,0.1) !important;\n            }\n            .csrt-badge.warning {\n                background: rgba(255,184,108,0.12) !important;\n                color: #ffb86c !important;\n                border-color: rgba(255,184,108,0.1) !important;\n            }\n            .csrt-badge.danger {\n                background: rgba(255,85,85,0.12) !important;\n                color: #ff5555 !important;\n                border-color: rgba(255,85,85,0.1) !important;\n            }\n            @keyframes csrt-panel-pop {\n                0% { opacity: 0.4; transform: scale(0.96); }\n                100% { opacity: 1; transform: scale(1); }\n            }\n            .csrt-panel {\n                animation: csrt-panel-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;\n            }\n            @keyframes csrt-window-appear {\n                0% { opacity: 0; transform: scale(0.96); }\n                100% { opacity: 1; transform: scale(1); }\n            }\n            .csrt-window-appear {\n                animation: csrt-window-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;\n            }\n            .csrt-list-item {\n                transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;\n                cursor: pointer !important;\n                border-radius: 8px !important;\n                padding: 6px 10px !important;\n            }\n            .csrt-list-item:hover {\n                background: rgba(255,255,255,0.04) !important;\n                transform: translateX(4px) !important;\n            }\n            .csrt-divider {\n                border: none !important;\n                border-top: 1px solid rgba(255,255,255,0.04) !important;\n                margin: 12px 0 !important;\n            }\n            .csrt-toast {\n                background: rgba(16,18,27,0.85) !important;\n                backdrop-filter: blur(20px) !important;\n                -webkit-backdrop-filter: blur(20px) !important;\n                border: 1px solid rgba(255,255,255,0.08) !important;\n                border-radius: 12px !important;\n                box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;\n                padding: 10px 24px !important;\n                color: #f0f0f0 !important;\n                font-size: 14px !important;\n                position: fixed !important;\n                bottom: 100px !important;\n                left: 50% !important;\n                transform: translateX(-50%) !important;\n                z-index: 1000004 !important;\n                animation: csrt-toast-in 0.3s ease-out !important;\n            }\n            @keyframes csrt-toast-in {\n                from { opacity: 0; transform: translateX(-50%) translateY(20px); }\n                to { opacity: 1; transform: translateX(-50%) translateY(0); }\n            }\n            @keyframes csrt-toast-out {\n                from { opacity: 1; transform: translateX(-50%) translateY(0); }\n                to { opacity: 0; transform: translateX(-50%) translateY(20px); }\n            }\n            .csrt-text-primary { color: #f0f0f0 !important; }\n            .csrt-text-secondary { color: rgba(255,255,255,0.7) !important; }\n            .csrt-text-muted { color: rgba(255,255,255,0.4) !important; }\n            .csrt-text-accent { color: #7c8cff !important; }\n            .csrt-text-success { color: #50fa7b !important; }\n            .csrt-text-warning { color: #ffb86c !important; }\n            .csrt-text-danger { color: #ff5555 !important; }\n            .csrt-toggle {\n                padding: 4px 14px !important;\n                border-radius: 6px !important;\n                border: 1px solid rgba(255,255,255,0.1) !important;\n                background: rgba(255,255,255,0.05) !important;\n                color: #6272a4 !important;\n                cursor: pointer !important;\n                font-size: 12px !important;\n                transition: all 0.2s !important;\n                flex-shrink: 0 !important;\n                font-family: inherit !important;\n            }\n            .csrt-toggle.on {\n                border-color: rgba(80,250,123,0.4) !important;\n                background: rgba(80,250,123,0.15) !important;\n                color: #50fa7b !important;\n            }\n            .csrt-toggle:hover { opacity: 0.8 !important; }\n            .csrt-var-grid {\n                display: grid;\n                grid-template-columns: 1fr 1fr auto;\n                gap: 4px 8px;\n                padding: 4px 0;\n                border-bottom: 1px solid rgba(255,255,255,0.05);\n                align-items: center;\n            }\n            .csrt-var-grid-header {\n                color: rgba(255,255,255,0.3);\n                font-size: 11px;\n            }\n            .csrt-var-grid-item {\n                padding: 4px 0;\n                border-bottom: 1px solid rgba(255,255,255,0.03);\n            }\n            .csrt-var-name {\n                color: #f8f8f2;\n                font-size: 12px;\n                overflow: hidden;\n                text-overflow: ellipsis;\n                white-space: nowrap;\n            }\n            .csrt-var-name.cloud { color: #ffb86c; }\n            .csrt-var-input {\n                background: rgba(0,0,0,0.3);\n                border: 1px solid rgba(255,255,255,0.06);\n                border-radius: 4px;\n                color: #f8f8f2;\n                padding: 2px 6px;\n                font-size: 12px;\n                font-family: monospace;\n                width: 100%;\n                box-sizing: border-box;\n            }\n            .csrt-var-lock {\n                padding: 2px 8px;\n                background: rgba(102,126,234,0.15);\n                border: 1px solid rgba(102,126,234,0.2);\n                border-radius: 4px;\n                color: #8be9fd;\n                cursor: pointer;\n                font-size: 11px;\n                transition: all 0.15s;\n            }\n            .csrt-var-lock:hover { background: rgba(102,126,234,0.25); }\n            .csrt-var-fold-btn {\n                background: rgba(102,126,234,0.15);\n                border: 1px solid rgba(102,126,234,0.2);\n                border-radius: 4px;\n                color: #8be9fd;\n                cursor: pointer;\n                font-size: 11px;\n                padding: 2px 12px;\n                transition: all 0.15s;\n            }\n            .csrt-var-fold-btn:hover { background: rgba(102,126,234,0.25); }\n            .csrt-cloud-tab {\n                padding: 4px 12px !important;\n                font-size: 11px !important;\n                border-radius: 6px !important;\n                cursor: pointer !important;\n                transition: all 0.2s !important;\n                font-family: inherit !important;\n                background: transparent !important;\n                color: rgba(255,255,255,0.5) !important;\n                border: 1px solid transparent !important;\n            }\n            .csrt-cloud-tab.active {\n                background: rgba(255,184,108,0.15) !important;\n                color: #ffb86c !important;\n                border-color: rgba(255,184,108,0.2) !important;\n            }\n            .csrt-cloud-tab:hover {\n                background: rgba(255,255,255,0.05) !important;\n            }\n            .csrt-section-title {\n                color: #f8f8f2 !important;\n                font-weight: 500 !important;\n                font-size: 14px !important;\n                margin-bottom: 8px !important;\n            }\n            .csrt-section {\n                background: rgba(255,255,255,0.03) !important;\n                border-radius: 8px !important;\n                padding: 12px !important;\n                margin-bottom: 12px !important;\n            }\n            .csrt-section.border-left-success { border-left: 3px solid #50fa7b !important; }\n            .csrt-section.border-left-warning { border-left: 3px solid #ffb86c !important; }\n            .csrt-section.border-left-info { border-left: 3px solid #8be9fd !important; }\n            .csrt-section.border-left-gold { border-left: 3px solid #f1fa8c !important; }\n            .csrt-section.border-left-danger { border-left: 3px solid #ff5555 !important; }\n        ";
    document.head.appendChild(v18);
  }
  const vO = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
    dir: console.dir,
    table: console.table,
    group: console.group,
    groupEnd: console.groupEnd,
    groupCollapsed: console.groupCollapsed,
    time: console.time,
    timeLog: console.timeLog,
    timeEnd: console.timeEnd,
    assert: console.assert,
    count: console.count,
    countReset: console.countReset,
    clear: console.clear
  };
  const vVO = vO;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};
  console.dir = () => {};
  console.table = () => {};
  console.group = () => {};
  console.groupEnd = () => {};
  console.groupCollapsed = () => {};
  console.time = () => {};
  console.timeLog = () => {};
  console.timeEnd = () => {};
  console.assert = () => {};
  console.count = () => {};
  console.countReset = () => {};
  console.clear = () => {};
  const vO2 = {
    errors: [],
    warnings: [],
    logs: [],
    addError: function (p7) {
      this.errors.push({
        time: Date.now(),
        msg: p7
      });
    },
    addWarning: function (p8) {
      this.warnings.push({
        time: Date.now(),
        msg: p8
      });
    },
    addLog: function (p9) {
      this.logs.push({
        time: Date.now(),
        msg: p9
      });
    },
    getErrors: function () {
      return this.errors;
    },
    clear: function () {
      this.errors = [];
      this.warnings = [];
      this.logs = [];
    }
  };
  const vVO3 = {
    bypassBlacklist: false,
    blockCollaboration: false,
    projectReplacer: false,
    spriteInserter: false,
    fakeIdentity: false,
    performanceMonitor: false,
    fakePhone: false,
    economyContract: false,
    replacerMode: "xhr",
    replacerChangeVersion: false
  };
  const vVO4 = {
    identityAuthRank: "L2",
    phoneNumber: "12345678901",
    reputationRank: "EXCELLENT",
    reputationScore: 100,
    fullName: "不想上学"
  };
  let v19 = null;
  let v20 = false;
  let vA2 = [];
  const vLN20 = 20;
  function f2() {
    try {
      const v21 = localStorage.getItem("__csrt_features");
      if (v21) {
        const v22 = JSON.parse(v21);
        Object.assign(vVO3, v22);
      }
      const v23 = localStorage.getItem("__csrt_phone_settings");
      if (v23) {
        const v24 = JSON.parse(v23);
        Object.assign(vVO4, v24);
      }
      const vGM_getValue = GM_getValue("__csrt_replacer_meta");
      if (vGM_getValue) {
        try {
          const v25 = JSON.parse(vGM_getValue);
          let vLS = "";
          for (let vLN02 = 0; vLN02 < v25.totalChunks; vLN02++) {
            vLS += GM_getValue("__csrt_replacer_chunk_" + vLN02, "");
          }
          const vAtob = atob(vLS);
          const vA3 = [];
          for (let vLN03 = 0; vLN03 < vAtob.length; vLN03 += 512) {
            const v26 = vAtob.slice(vLN03, vLN03 + 512);
            const v27 = new Array(v26.length);
            for (let vLN04 = 0; vLN04 < v26.length; vLN04++) {
              v27[vLN04] = v26.charCodeAt(vLN04);
            }
            vA3.push(new Uint8Array(v27));
          }
          const vO5 = {
            type: v25.type || "application/zip"
          };
          v19 = new Blob(vA3, vO5);
          v20 = true;
        } catch (e3) {
          vO2.addError("加载作品替换数据失败: " + e3.message);
        }
      }
    } catch (e4) {}
  }
  function f3() {
    try {
      localStorage.setItem("__csrt_features", JSON.stringify(vVO3));
      localStorage.setItem("__csrt_phone_settings", JSON.stringify(vVO4));
    } catch (e5) {}
  }
  f2();
  function f4() {
    const v28 = window.location.href;
    if (v28.match(/\/student\/[^?\/]+/)) {
      return "profile";
    }
    if (v28.match(/\/creation\/[^?\/]+/) || v28.match(/\/detail\/[^?\/]+/)) {
      return "project";
    }
    if (v28.match(/\/gandi/)) {
      return "gandi";
    }
    return "other";
  }
  function f5(p10) {
    const v29 = p10.match(/\/student\/([^?\/]+)/);
    if (v29) {
      return v29[1];
    } else {
      return null;
    }
  }
  function f6(p11) {
    let v30 = p11.match(/\/detail\/([^?\/]+)/);
    if (v30) {
      return v30[1];
    }
    v30 = p11.match(/\/creation\/([^?\/]+)/);
    if (v30) {
      return v30[1];
    }
    v30 = p11.match(/\/([^?\/]+)(?:\?|$)/);
    if (v30 && v30[1].length >= 8) {
      return v30[1];
    }
    return null;
  }
  function f7() {
    const v31 = document.title;
    const v32 = v31.match(/^(.+?)\s*-\s*(.+?)\s*-\s*共创世界/);
    if (v32) {
      return v32[2].trim();
    }
    const vA4 = [".creator-info .name", ".author-info .name", ".user-info .username", "[class*=\"creator\"] [class*=\"name\"]", ".detail-creator .name", ".project-creator .name"];
    for (const v33 of vA4) {
      try {
        const v34 = document.querySelector(v33);
        if (v34 && v34.textContent.trim() && !v34.textContent.includes("创作者中心")) {
          return v34.textContent.trim();
        }
      } catch (e6) {}
    }
    return "未知创作者";
  }
  function f8() {
    const v35 = document.title.match(/^(.+?)的主页\s*-\s*共创世界/);
    if (v35) {
      return v35[1].trim();
    } else {
      return null;
    }
  }
  function f9(p12, p13, p14) {
    if (p12[p13]) {
      p12[p13] = p14(p12[p13]);
    }
  }
  function f10(p15) {
    const v36 = "; " + document.cookie;
    const v37 = v36.split("; " + p15 + "=");
    if (v37.length === 2) {
      return v37.pop().split(";").shift();
    }
  }
  function f11(p16, p17) {
    document.cookie = p16 + "=" + p17 + "; path=/; domain=.ccw.site;";
  }
  function f12(p18) {
    return new Promise((p19, p20) => {
      const v38 = new FileReader();
      v38.onloadend = () => p19(v38.result);
      v38.onerror = p20;
      v38.readAsArrayBuffer(p18);
    });
  }
  function f13(p21, p22) {
    let vLS2 = "";
    for (let vLN05 = 0; vLN05 < p21; vLN05++) {
      vLS2 += p22[Math.floor(Math.random() * p22.length)];
    }
    return vLS2;
  }
  function f14(p23, p24) {
    const v39 = URL.createObjectURL(p23);
    const v40 = document.createElement("a");
    v40.href = v39;
    v40.download = p24;
    document.body.appendChild(v40);
    v40.click();
    document.body.removeChild(v40);
    // TOLOOK
    setTimeout(() => URL.revokeObjectURL(v39), 5000);
  }
  function f15(p25 = "", p26 = "") {
    return new Promise(p27 => {
      const v41 = document.createElement("div");
      v41.style.cssText = "\n                position: fixed; top: 0; left: 0; width: 100%; height: 100%;\n                background: rgba(0,0,0,0.6); display: flex; align-items: center;\n                justify-content: center; z-index: 9999; backdrop-filter: blur(8px);\n            ";
      const v42 = document.createElement("div");
      v42.style.cssText = "\n                background: rgba(16,18,27,0.85); backdrop-filter: blur(20px);\n                -webkit-backdrop-filter: blur(20px); padding: 32px 40px;\n                border-radius: 16px; border: 3px dashed rgba(255,255,255,0.15);\n                cursor: pointer; font-size: 16px; text-align: center;\n                min-width: 320px; max-width: 90vw; color: #f8f8f2;\n                transition: border-color 0.3s; box-shadow: 0 20px 60px rgba(0,0,0,0.8);\n            ";
      v42.innerHTML = "\n                <div style=\"font-size:24px;font-weight:bold;margin-bottom:12px;color:#8be9fd;\">📂 选择或拖入文件</div>\n                <div style=\"color:rgba(255,255,255,0.5);font-size:14px;\">" + (p26 || "上传文件") + "</div>\n                <div style=\"color:rgba(255,255,255,0.3);font-size:12px;margin-top:8px;\">支持格式: " + (p25 || "所有文件") + "</div>\n            ";
      const v43 = document.createElement("input");
      v43.type = "file";
      v43.accept = p25;
      v43.style.display = "none";
      const vF5 = () => {
        if (v41.parentNode) {
          v41.remove();
        }
        document.removeEventListener("keydown", vF6);
      };
      const vF6 = p28 => {
        if (p28.key === "Escape") {
          vF5();
          p27(null);
        }
      };
      v41.addEventListener("click", p29 => {
        if (p29.target === v41) {
          vF5();
          p27(null);
        }
      });
      v42.addEventListener("click", () => v43.click());
      v42.addEventListener("dragover", p30 => {
        if (p30.dataTransfer.types.includes("Files")) {
          p30.preventDefault();
          p30.dataTransfer.dropEffect = "copy";
          v42.style.borderColor = "#8be9fd";
        }
      });
      v42.addEventListener("dragleave", () => {
        v42.style.borderColor = "rgba(255,255,255,0.15)";
      });
      v42.addEventListener("drop", p31 => {
        const v44 = p31.dataTransfer.files[0];
        if (v44) {
          p31.preventDefault();
          vF5();
          p27(v44);
        }
      });
      v43.addEventListener("change", p32 => {
        const v45 = p32.target.files[0];
        if (v45) {
          vF5();
          p27(v45);
        }
      });
      document.addEventListener("keydown", vF6);
      v41.appendChild(v42);
      v41.appendChild(v43);
      document.body.appendChild(v41);
    });
  }
  const v46 = new Set(["motion", "looks", "sound", "events", "control", "sensing", "operators", "variables", "list", "procedures", "pen", "music", "video", "text2speech", "translate", "makeymakey", "microbit", "ev3", "wedo2", "boost", "gdxfor"]);
  function f16(p33) {
    return v46.has(p33.toLowerCase());
  }
  let v47 = null;
  let v48 = null;
  let v49 = null;
  let vA5 = [];
  const v50 = new Promise(p34 => {
    v48 = p34;
  });
  function f17(p35) {
    unsafeWindow.vm = window.vm = p35;
    vA5.forEach(p36 => p36(p35));
    vA5 = [];
    if (v48) {
      v48(p35);
      v48 = null;
    }
  }
  function f18() {
    const v51 = Function.prototype.bind;
    Function.prototype.bind = function (p37, ..._0x1333ef) {
      if (p37?.editingTarget !== undefined && p37?.runtime !== undefined) {
        Function.prototype.bind = v51;
        v47 = p37;
        f17(p37);
        return v51.call(this, p37, ..._0x1333ef);
      }
      return v51.call(this, p37, ..._0x1333ef);
    };
  }
  f18();
  // TOLOOK
  setTimeout(() => {
    if (v49) {
      v49(new Error("获取VM超时"));
      v49 = null;
    }
  }, 15000);
  function f19() {
    try {
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const v52 = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.getFiberRoots?.(1) || [];
        for (const v53 of v52) {
          const v_0x16a74e = function f20(p38, p39 = new Set()) {
            if (!p38 || p39.has(p38)) {
              return null;
            }
            p39.add(p38);
            try {
              if (p38?.memoizedState?.state?.scratchGui?.vm) {
                return p38.memoizedState.state;
              }
              if (p38?.stateNode?.state?.scratchGui?.vm) {
                return p38.stateNode;
              }
              if (p38?.getState?.()?.scratchGui?.vm) {
                return p38;
              }
              for (const v54 in p38) {
                if (p38[v54] && typeof p38[v54] === "object") {
                  const vF20 = f20(p38[v54], p39);
                  if (vF20) {
                    return vF20;
                  }
                }
              }
            } catch (e7) {}
            return null;
          }(v53);
          if (v_0x16a74e) {
            return v_0x16a74e;
          }
        }
      }
      const v55 = document.querySelectorAll("*");
      for (const v56 of v55) {
        try {
          const v57 = Object.keys(v56).find(p40 => p40.includes("__reactContainer"));
          if (v57 && v56[v57]) {
            const v_0x35d65b = function f21(p41, p42 = new Set()) {
              if (!p41 || p42.has(p41)) {
                return null;
              }
              p42.add(p41);
              try {
                if (p41.getState) {
                  const v58 = p41.getState();
                  if (v58?.scratchGui?.vm && v58.scratchPaint) {
                    return p41;
                  }
                }
                for (const v59 in p41) {
                  if (p41[v59] && typeof p41[v59] === "object") {
                    const vF21 = f21(p41[v59], p42);
                    if (vF21) {
                      return vF21;
                    }
                  }
                }
              } catch (e8) {}
              return null;
            }(v56[v57]);
            if (v_0x35d65b) {
              return v_0x35d65b;
            }
          }
        } catch (e9) {
          continue;
        }
      }
    } catch (e10) {
      vO2.addError("获取Redux Store失败: " + e10.message);
    }
    return null;
  }
  async function f22() {
    if (v47) {
      return v47;
    }
    let v60 = window.eureka?.vm;
    if (v60) {
      v47 = v60;
      f17(v60);
      vO2.addLog("通过Eureka获取vm");
      return v60;
    }
    v60 = window.vm ?? unsafeWindow.vm;
    if (v60) {
      v47 = v60;
      f17(v60);
      vO2.addLog("通过全局变量获取vm");
      return v60;
    }
    if (document.readyState === "complete") {
      const vF19 = f19();
      if (vF19) {
        v60 = vF19.getState?.()?.scratchGui?.vm;
        if (v60) {
          v47 = v60;
          f17(v60);
          vO2.addLog("通过DOM获取vm");
          return v60;
        }
      }
      vO2.addError("无法从DOM获取vm");
    }
    v60 = await v50;
    vO2.addLog("通过Bind获取vm");
    return v60;
  }
  function f23(p43) {
    const v61 = document.createElement("div");
    v61.className = "csrt-toast";
    v61.textContent = p43;
    document.body.appendChild(v61);
    // TOLOOK
    setTimeout(() => {
      v61.style.animation = "csrt-toast-out 0.3s ease-in";
      // TOLOOK
      setTimeout(() => v61.remove(), 300);
    }, 2500);
  }
  function f24() {
    return new Promise(p44 => {
      if (document.body) {
        p44();
        return;
      }
      let vSetTimeout = // TOLOOK
      setTimeout(() => {
        v63.disconnect();
        if (!document.body) {
          const v62 = document.createElement("body");
          document.documentElement.appendChild(v62);
        }
        p44();
      }, 3000);
      const v63 = new MutationObserver(() => {
        if (document.body) {
          v63.disconnect();
          clearTimeout(vSetTimeout);
          p44();
        }
      });
      v63.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    });
  }
  let vLN1 = 1;
  const vLN08 = 0.8;
  const vLN15 = 1.5;
  const vLN005 = 0.05;
  function f25(p45) {
    const v64 = document.createElement("div");
    v64.style.cssText = "display:flex;align-items:center;gap:4px;";
    const v65 = document.createElement("button");
    v65.textContent = "−";
    v65.className = "csrt-scale-btn";
    v65.onclick = () => f26(-vLN005);
    const v66 = document.createElement("span");
    v66.className = "csrt-scale-display";
    v66.textContent = "100%";
    const v67 = document.createElement("button");
    v67.textContent = "+";
    v67.className = "csrt-scale-btn";
    v67.onclick = () => f26(vLN005);
    const v68 = document.createElement("button");
    v68.textContent = "⟲";
    v68.className = "csrt-scale-btn";
    v68.title = "重置缩放";
    v68.onclick = () => f27(1);
    v64.appendChild(v65);
    v64.appendChild(v66);
    v64.appendChild(v67);
    v64.appendChild(v68);
    function f26(p46) {
      const v69 = Math.min(vLN15, Math.max(vLN08, vLN1 + p46));
      f27(v69);
    }
    function f27(p47) {
      vLN1 = Math.min(vLN15, Math.max(vLN08, p47));
      p45.style.transform = "scale(" + vLN1 + ")";
      v66.textContent = Math.round(vLN1 * 100) + "%";
    }
    return v64;
  }
  async function f28() {
    await f24();
    if (document.querySelector(".csrt-ball")) {
      return document.querySelector(".csrt-ball");
    }
    const v70 = document.createElement("div");
    v70.className = "csrt-ball";
    v70.style.cssText = "\n            position: fixed;\n            width: 52px;\n            height: 52px;\n            border-radius: 50%;\n            background: rgba(20, 22, 36, 0.85) !important;\n            backdrop-filter: blur(20px) !important;\n            -webkit-backdrop-filter: blur(20px) !important;\n            color: #8be9fd;\n            font-size: 22px;\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            cursor: pointer;\n            z-index: 999999;\n            box-shadow: 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(102,126,234,0.08);\n            user-select: none;\n            pointer-events: auto;\n            border: 1px solid rgba(255,255,255,0.06);\n            will-change: transform, left, top;\n            touch-action: none;\n            contain: layout style paint;\n            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;\n            text-shadow: 0 0 20px rgba(139,233,253,0.2);\n        ";
    const v71 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    v71.setAttribute("viewBox", "0 0 88 96.24656");
    v71.setAttribute("width", "32");
    v71.setAttribute("height", "35");
    v71.style.cssText = "display:block;";
    v71.innerHTML = "\n            <defs>\n              <linearGradient x1=\"302.87804\" y1=\"182.59082\" x2=\"337.12196\" y2=\"182.59082\" gradientTransform=\"translate(-223.94835,-146.54535) scale(0.7394,0.7394)\" gradientUnits=\"userSpaceOnUse\" id=\"csrt-logo-grad\">\n                <stop offset=\"0\" stop-color=\"#6728b6\"/>\n                <stop offset=\"1\" stop-color=\"#000000\"/>\n              </linearGradient>\n            </defs>\n            <g transform=\"translate(-276,-131.87672)\">\n              <g stroke-miterlimit=\"10\">\n                <path d=\"M320,133l43,22v50l-43,22l-43,-22v-50z\" fill=\"#4f2e7d\" stroke=\"#3c1b5e\" stroke-width=\"2\"/>\n                <path d=\"M320,142l34,18v40l-34,18l-34,-18v-40z\" fill=\"#744cb0\" stroke=\"none\" stroke-width=\"1\"/>\n                <text transform=\"translate(302.87804,198.19466) scale(1.35245,1.35245)\" font-size=\"40\" xml:space=\"preserve\" fill=\"url(#csrt-logo-grad)\" stroke=\"none\" stroke-width=\"1\" font-family=\"Sans Serif\" font-weight=\"normal\" text-anchor=\"start\">\n                  <tspan x=\"0\" dy=\"0\">R</tspan>\n                </text>\n                <path d=\"M303.8142,169.18961l0.9958,-2.9874l12.61347,4.20449l-0.9958,2.9874z\" fill=\"#744cb0\" stroke=\"none\" stroke-width=\"0\"/>\n                <path d=\"M317.5202,184.30322l4.01407,-11.93927l2.1557,0.72476l-4.01407,11.93927z\" fill=\"#744cb0\" stroke=\"none\" stroke-width=\"0\"/>\n                <path d=\"M325.12501,194.06224l-2.2449,-2.90817l9.97086,-7.69681l2.2449,2.90817z\" fill=\"#744cb0\" stroke=\"none\" stroke-width=\"0\"/>\n              </g>\n            </g>\n            ";
    v70.textContent = "";
    v70.appendChild(v71);
    v70.title = "CSRT v" + vLS289 + " | 作者: 110200";
    const v72 = document.createElement("div");
    v72.style.cssText = "\n            position: absolute;\n            width: 80px;\n            height: 80px;\n            border-radius: 50%;\n            background: radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%);\n            pointer-events: none;\n            z-index: -1;\n            transition: all 0.5s ease;\n        ";
    v70.appendChild(v72);
    requestAnimationFrame(() => {
      const v73 = window.innerWidth - 72;
      const v74 = window.innerHeight - 140;
      v70.style.left = v73 + "px";
      v70.style.top = v74 + "px";
      v70.style.right = "auto";
      v70.style.bottom = "auto";
    });
    let v75 = false;
    let v76 = false;
    let vLN06 = 0;
    let vLN07 = 0;
    let v77 = window.innerWidth - 72;
    let v78 = window.innerHeight - 140;
    let vV77 = v77;
    let vV78 = v78;
    let v79 = null;
    function f29() {
      const v80 = vV77 - v77;
      const v81 = vV78 - v78;
      v77 += v80 * 0.2;
      v78 += v81 * 0.2;
      if (Math.abs(v80) < 0.5 && Math.abs(v81) < 0.5) {
        v77 = vV77;
        v78 = vV78;
      }
      v70.style.left = v77 + "px";
      v70.style.top = v78 + "px";
      if (Math.abs(vV77 - v77) > 0.1 || Math.abs(vV78 - v78) > 0.1) {
        v79 = requestAnimationFrame(f29);
      } else {
        v79 = null;
      }
    }
    function f30() {
      if (v79) {
        cancelAnimationFrame(v79);
        v79 = null;
      }
      f29();
    }
    v70.addEventListener("mousedown", p48 => {
      if (p48.button !== 0) {
        return;
      }
      v75 = true;
      v76 = false;
      const v82 = v70.getBoundingClientRect();
      vLN06 = p48.clientX - v82.left;
      vLN07 = p48.clientY - v82.top;
      v70.style.cursor = "grabbing";
      v70.style.transform = "scale(1.15)";
      v70.style.boxShadow = "0 8px 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 60px rgba(102,126,234,0.15)";
      p48.preventDefault();
    });
    document.addEventListener("mousemove", p49 => {
      if (!v75) {
        return;
      }
      let v83 = p49.clientX - vLN06;
      let v84 = p49.clientY - vLN07;
      const v85 = window.innerWidth - 60;
      const v86 = window.innerHeight - 60;
      v83 = Math.max(0, Math.min(v83, v85));
      v84 = Math.max(0, Math.min(v84, v86));
      if (Math.abs(v83 - vV77) > 2 || Math.abs(v84 - vV78) > 2) {
        v76 = true;
      }
      vV77 = v83;
      vV78 = v84;
      if (!v79) {
        f30();
      }
    });
    document.addEventListener("mouseup", p50 => {
      if (v75) {
        v75 = false;
        v70.style.cursor = "pointer";
        v70.style.transform = "scale(1)";
        v70.style.boxShadow = "0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(102,126,234,0.08)";
        if (!v76) {
          f93();
        }
        p50.preventDefault();
      }
    });
    let vLN09 = 0;
    let vLN010 = 0;
    let v87 = false;
    let v88 = false;
    v70.addEventListener("touchstart", p51 => {
      const v89 = p51.touches[0];
      const v90 = v70.getBoundingClientRect();
      vLN09 = v89.clientX - v90.left;
      vLN010 = v89.clientY - v90.top;
      v87 = true;
      v88 = false;
      v70.style.transform = "scale(1.15)";
      v70.style.boxShadow = "0 8px 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 60px rgba(102,126,234,0.15)";
      p51.preventDefault();
    }, {
      passive: false
    });
    document.addEventListener("touchmove", p52 => {
      if (!v87) {
        return;
      }
      const v91 = p52.touches[0];
      let v92 = v91.clientX - vLN09;
      let v93 = v91.clientY - vLN010;
      const v94 = window.innerWidth - 60;
      const v95 = window.innerHeight - 60;
      v92 = Math.max(0, Math.min(v92, v94));
      v93 = Math.max(0, Math.min(v93, v95));
      if (Math.abs(v92 - vV77) > 2 || Math.abs(v93 - vV78) > 2) {
        v88 = true;
      }
      vV77 = v92;
      vV78 = v93;
      if (!v79) {
        f30();
      }
      p52.preventDefault();
    }, {
      passive: false
    });
    document.addEventListener("touchend", p53 => {
      if (v87) {
        v87 = false;
        v70.style.transform = "scale(1)";
        v70.style.boxShadow = "0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(102,126,234,0.08)";
        if (!v88) {
          f93();
        }
      }
    }, {
      passive: false
    });
    window.addEventListener("resize", () => {
      const v96 = window.innerWidth - 60;
      const v97 = window.innerHeight - 60;
      vV77 = Math.min(vV77, v96);
      vV78 = Math.min(vV78, v97);
      if (!v79) {
        f30();
      }
    });
    v70.addEventListener("mouseenter", () => {
      v70.style.boxShadow = "0 4px 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 60px rgba(102,126,234,0.15)";
      v72.style.transform = "scale(1.3)";
      v72.style.opacity = "1";
    });
    v70.addEventListener("mouseleave", () => {
      v70.style.boxShadow = "0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(102,126,234,0.08)";
      v72.style.transform = "scale(1)";
      v72.style.opacity = "0.6";
    });
    document.body.appendChild(v70);
    return v70;
  }
  function f31(p54) {
    if (!p54 || !p54.runtime) {
      return false;
    }
    const v98 = p54.extensionManager;
    if (v98) {
      const v99 = v98._loadedExtensions || {};
      const vA6 = ["ccwdata", "CCWData", "ccw_data", "ccwData"];
      for (const v100 of vA6) {
        if (v99[v100]) {
          return true;
        }
      }
      const v101 = v98._gandiExternalExtensionServices || {};
      for (const v102 of vA6) {
        if (v101[v102]) {
          return true;
        }
      }
      if (typeof v98._getAllProjectData === "function") {
        return true;
      }
      if (typeof v98._setValueToProject === "function") {
        return true;
      }
      if (typeof v98._getValueFromProject === "function") {
        return true;
      }
    }
    const v103 = p54.runtime.targets || [];
    for (const v104 of v103) {
      if (v104.blocks) {
        const v105 = v104.blocks._blocks || {};
        for (const v106 in v105) {
          const v107 = v105[v106];
          if (v107.opcode && (v107.opcode.startsWith("ccwdata_") || v107.opcode.startsWith("CCWData_"))) {
            return true;
          }
        }
      }
    }
    const v108 = p54.runtime;
    if (v108) {
      if (typeof v108.ccwAPI?.getAllProjectData === "function") {
        return true;
      }
      if (typeof v108.ccwAPI?.setValueToProject === "function") {
        return true;
      }
      if (typeof v108.ccwAPI?.getValueFromProject === "function") {
        return true;
      }
    }
    return false;
  }
  function f32(p55) {
    if (!p55 || !p55.runtime) {
      return false;
    }
    const v109 = p55.extensionManager;
    if (v109) {
      const v110 = v109._loadedExtensions || {};
      const vA7 = ["gandieconomy", "GandiEconomy", "gandi_economy", "economy"];
      for (const v111 of vA7) {
        if (v110[v111]) {
          return true;
        }
      }
      const v112 = v109._gandiExternalExtensionServices || {};
      for (const v113 of vA7) {
        if (v112[v113]) {
          return true;
        }
      }
      if (typeof v109.getSmartContractList === "function") {
        return true;
      }
      if (typeof v109.getSmartContract === "function") {
        return true;
      }
      if (typeof v109.requestExecuteSmartContract === "function") {
        return true;
      }
      if (typeof v109.getSmartContractAccountByContractId === "function") {
        return true;
      }
    }
    const v114 = p55.runtime.targets || [];
    for (const v115 of v114) {
      if (v115.blocks) {
        const v116 = v115.blocks._blocks || {};
        for (const v117 in v116) {
          const v118 = v116[v117];
          if (v118.opcode && (v118.opcode.startsWith("gandieconomy_") || v118.opcode.startsWith("GandiEconomy_"))) {
            return true;
          }
        }
      }
    }
    const v119 = p55.runtime;
    if (v119) {
      if (typeof v119.ccwAPI?.getSmartContractList === "function") {
        return true;
      }
      if (typeof v119.ccwAPI?.executeSmartContract === "function") {
        return true;
      }
    }
    return false;
  }
  function f33(p56) {
    if (!p56 || !p56.runtime) {
      return false;
    }
    const v120 = p56.extensionManager;
    if (v120) {
      const v121 = v120._loadedExtensions || {};
      const vA8 = ["gandiachievement", "GandiAchievement", "GandiAchievementAndLeaderboard", "gandi_achievement", "achievement", "leaderboard"];
      for (const v122 of vA8) {
        if (v121[v122]) {
          return true;
        }
      }
      const v123 = v120._gandiExternalExtensionServices || {};
      for (const v124 of vA8) {
        if (v123[v124]) {
          return true;
        }
      }
      if (typeof v120.getAchievements === "function") {
        return true;
      }
      if (typeof v120.obtainAchievement === "function") {
        return true;
      }
      if (typeof v120.getLeaderboards === "function") {
        return true;
      }
      if (typeof v120.getLeaderboardRecords === "function") {
        return true;
      }
      if (typeof v120.insertLeaderboard === "function") {
        return true;
      }
    }
    const v125 = p56.runtime.targets || [];
    for (const v126 of v125) {
      if (v126.blocks) {
        const v127 = v126.blocks._blocks || {};
        for (const v128 in v127) {
          const v129 = v127[v128];
          if (v129.opcode && (v129.opcode.startsWith("gandiachievement_") || v129.opcode.startsWith("GandiAchievement_") || v129.opcode.startsWith("gandileaderboard_") || v129.opcode.startsWith("GandiLeaderboard_"))) {
            return true;
          }
        }
      }
    }
    const v130 = p56.runtime;
    if (v130) {
      if (typeof v130.ccwAPI?.getAchievements === "function") {
        return true;
      }
      if (typeof v130.ccwAPI?.getLeaderboards === "function") {
        return true;
      }
    }
    return false;
  }
  let v131 = null;
  let v132 = null;
  async function f34(p57 = false) {
    const vF42 = f4();
    const vO10 = {
      pageType: vF42,
      url: window.location.href,
      title: document.title,
      projectId: null,
      userId: null,
      creator: null,
      userName: null,
      creatorId: null,
      internalExtensions: [],
      customExtensions: [],
      allExtensions: [],
      wildExtensions: {},
      projectExtensions: [],
      extensionURLs: {},
      loadedExtensions: [],
      hasMaliciousPatterns: false,
      warnings: [],
      vmInfo: null,
      projectData: null,
      isExtensionIntercepted: false,
      hasCCWData: false,
      hasGandiEconomy: false,
      hasGandiAchievement: false,
      isProfile: false,
      isOther: false
    };
    const vVO10 = vO10;
    if (vF42 === "other") {
      vVO10.isOther = true;
      const v133 = document.title.match(/^(.+?)\s*[—\-|]\s*(.+?)(?:\s*[—\-|]|$)/);
      vVO10.creator = v133 ? v133[1].trim() : document.title.split(/[—\-|]/)[0]?.trim() || "未知";
      return vVO10;
    }
    if (vF42 === "profile") {
      vVO10.isProfile = true;
      vVO10.userId = f5(window.location.href);
      if (!p57 && v132) {
        vVO10.userName = v132;
      } else {
        const vF8 = f8();
        if (vF8) {
          v132 = vF8;
          vVO10.userName = vF8;
        } else {
          vVO10.userName = "未知用户";
        }
      }
      try {
        const v134 = document.querySelector(".user-name, .username, .nickname, [class*=\"name\"]");
        if (v134 && v134.textContent.trim()) {
          if (!v132) {
            vVO10.userName = v134.textContent.trim();
            v132 = vVO10.userName;
          }
        }
      } catch (e11) {}
      return vVO10;
    }
    if (!p57 && v131) {
      vVO10.creator = v131;
    } else {
      const vF7 = f7();
      v131 = vF7;
      vVO10.creator = vF7;
    }
    vVO10.projectId = f6(window.location.href);
    try {
      const v135 = document.querySelector("[class*=\"creator\"] a, [class*=\"author\"] a");
      if (v135) {
        const v136 = v135.href.match(/\/student\/(\d+)/);
        if (v136) {
          vVO10.creatorId = v136[1];
        }
      }
      const v137 = await f22();
      if (v137) {
        v47 = v137;
        const vO11 = {
          runtime: !!v137.runtime,
          editingTarget: !!v137.editingTarget,
          targets: v137.runtime?.targets?.length || 0
        };
        vVO10.vmInfo = vO11;
        const v138 = v137.runtime;
        if (v138) {
          vVO10.hasCCWData = f31(v137);
          vVO10.hasGandiEconomy = f32(v137);
          vVO10.hasGandiAchievement = f33(v137);
          if (v138.ccwAPI) {
            if (typeof v138.ccwAPI.getAllProjectData === "function" || typeof v138.ccwAPI.setValueToProject === "function") {
              vVO10.hasCCWData = true;
            }
            if (typeof v138.ccwAPI.getSmartContractList === "function" || typeof v138.ccwAPI.executeSmartContract === "function") {
              vVO10.hasGandiEconomy = true;
            }
            if (typeof v138.ccwAPI.getAchievements === "function" || typeof v138.ccwAPI.getLeaderboards === "function") {
              vVO10.hasGandiAchievement = true;
            }
          }
          let v139 = null;
          try {
            v139 = v138.getProjectData?.();
            if (!v139) {
              if (v137._projectData) {
                v139 = v137._projectData;
              } else if (v138._projectData) {
                v139 = v138._projectData;
              } else if (v137.projectData) {
                v139 = v137.projectData;
              }
            }
            if (v139) {
              vVO10.projectData = v139;
              vVO10.projectExtensions = v139.extensions || [];
              if (v139.gandi?.wildExtensions) {
                vVO10.wildExtensions = v139.gandi.wildExtensions;
              }
              if (v139.extensionURLs) {
                vVO10.extensionURLs = v139.extensionURLs;
              }
            }
          } catch (e12) {
            vO2.addError("获取项目数据失败: " + e12.message);
          }
          if (v137.extensionManager) {
            const v140 = v137.extensionManager._loadedExtensions || {};
            vVO10.loadedExtensions = Object.keys(v140);
          }
          if (v139) {
            const v141 = v139.extensions || [];
            const v142 = v139.gandi?.wildExtensions || {};
            const v143 = v139.extensionURLs || {};
            const v144 = new Set();
            v141.forEach(p58 => {
              const v145 = typeof p58 === "string" ? p58 : p58?.name;
              if (v145) {
                v144.add(v145);
              }
            });
            Object.keys(v143).forEach(p59 => v144.add(p59));
            Object.keys(v142).forEach(p60 => v144.add(p60));
            vVO10.customExtensions = [];
            vVO10.internalExtensions = [];
            v144.forEach(p61 => {
              const v146 = v142[p61] !== undefined;
              const v147 = v143[p61] !== undefined;
              const vF16 = f16(p61);
              if (v146 || v147 || !vF16) {
                const v148 = v142[p61]?.url || v143[p61] || v141.find(p62 => (typeof p62 === "string" ? p62 : p62?.name) === p61 && typeof p62 === "object" && p62.url)?.url || "未知";
                vVO10.customExtensions.push({
                  name: p61,
                  type: "custom",
                  url: v148,
                  source: v146 ? "wildExtensions" : v147 ? "extensionURLs" : "extensions数组",
                  modified: false,
                  originalCode: null,
                  modifiedCode: null,
                  isLoaded: vVO10.loadedExtensions.includes(p61)
                });
              } else if (!vVO10.internalExtensions.includes(p61)) {
                vVO10.internalExtensions.push(p61);
              }
            });
            vVO10.isExtensionIntercepted = vVO10.customExtensions.length > 0;
            const vA9 = ["bit.ly", "tinyurl", "shorturl", "goo.gl", "pastebin", "raw.githubusercontent.com", "gist.github.com"];
            vVO10.customExtensions.forEach(p63 => {
              if (p63.url && p63.url !== "未知") {
                vA9.forEach(p64 => {
                  if (p63.url.includes(p64)) {
                    vVO10.warnings.push("[" + p63.name + "] 使用可疑域名: " + p64);
                    vVO10.hasMaliciousPatterns = true;
                  }
                });
                if (!p63.url.startsWith(window.location.origin) && !p63.url.startsWith("https://m.ccw.site/") && !p63.url.startsWith("https://assets.ccw.site/")) {
                  vVO10.warnings.push("[" + p63.name + "] 加载外部资源: " + p63.url);
                  vVO10.hasMaliciousPatterns = true;
                }
              }
            });
            const v149 = new Set();
            vVO10.customExtensions.forEach(p65 => v149.add(p65.name));
            vVO10.internalExtensions.forEach(p66 => v149.add(p66));
            vVO10.allExtensions = Array.from(v149);
          }
        }
      }
    } catch (e13) {
      vO2.addError("获取项目信息失败: " + e13.message);
    }
    return vVO10;
  }
  function f35(p67) {
    return new Promise(p68 => {
      GM_xmlhttpRequest({
        method: "GET",
        url: p67,
        onload: p69 => p68(p69.responseText),
        onerror: () => p68(null)
      });
    });
  }
  async function f36(p70) {
    const v150 = await f34(true);
    const v151 = v150.customExtensions.find(p71 => p71.name === p70);
    if (v151 && v151.url && v151.url !== "未知") {
      return new Promise(p72 => {
        GM_xmlhttpRequest({
          method: "GET",
          url: v151.url,
          onload: p73 => p72(p73.responseText),
          onerror: () => p72(null)
        });
      });
    }
    return null;
  }
  function f37() {
    if (!v20 || !v19) {
      return;
    }
    const v152 = XMLHttpRequest.prototype;
    const v153 = v152.open;
    const v154 = v152.send;
    v152.open = function (p74, p75) {
      this._url = p75;
      this._method = p74;
      return v153.apply(this, arguments);
    };
    v152.send = function (p76) {
      if (this._url && this._url.includes("/creation/detail")) {
        const vThis = this;
        const v155 = vThis.onreadystatechange;
        vThis.onreadystatechange = function () {
          if (this.readyState === 4) {
            try {
              const v156 = JSON.parse(this.responseText);
              const v157 = URL.createObjectURL(v19);
              if (vVO3.replacerChangeVersion && v156.body?.creationReleaseList) {
                const v158 = v156.body.creationReleaseList.map((p77, p78) => ({
                  index: p78,
                  version: p77.version,
                  customVersion: p77.customVersion || "",
                  projectLink: p77.projectLink
                }));
                const vPrompt = prompt("选择要加载的作品版本：\n" + v158.map((p79, p80) => p80 + 1 + ". " + p79.version + (p79.customVersion ? " (" + p79.customVersion + ")" : "")).join("\n") + "\n\n输入编号（默认最新）:");
                if (vPrompt) {
                  const v159 = parseInt(vPrompt) - 1;
                  if (v159 >= 0 && v159 < v158.length) {
                    const v160 = v158[v159];
                    if (v160.projectLink) {
                      v156.body.latestProjectLink = v160.projectLink;
                      v156.body.creationRelease = v156.body.creationReleaseList[v159];
                      vO2.addLog("作品回溯: 加载版本 " + v160.version);
                    }
                  }
                }
              } else {
                v156.body.latestProjectLink = v157;
                if (v156.body.creationRelease) {
                  v156.body.creationRelease.projectLink = v157;
                }
              }
              v156.body.requireLogin = false;
              v156.body.forEveryone = true;
              v156.body.status = "PUBLISHED";
              v156.body.isOpenSource = true;
              v156.body.sourceOpenLevel = "PUBLIC";
              const v161 = JSON.stringify(v156);
              const vO12 = {
                get: () => v161,
                configurable: true
              };
              Object.defineProperty(this, "responseText", vO12);
              const vO13 = {
                get: () => v161,
                configurable: true
              };
              Object.defineProperty(this, "response", vO13);
              vO2.addLog("作品已替换");
            } catch (e14) {
              vO2.addError("作品替换失败: " + e14.message);
            }
          }
          if (v155) {
            return v155.apply(this, arguments);
          }
        };
      }
      return v154.apply(this, arguments);
    };
  }
  function f38(p81) {
    return new Promise((p82, p83) => {
      const v162 = new FileReader();
      v162.onload = function (p84) {
        try {
          const v163 = p84.target.result.split(",")[1];
          const vLN102400 = 102400;
          const vA10 = [];
          for (let vLN011 = 0; vLN011 < v163.length; vLN011 += vLN102400) {
            vA10.push(v163.slice(vLN011, vLN011 + vLN102400));
          }
          const vO14 = {
            totalChunks: vA10.length,
            size: p81.size,
            type: p81.type || "application/zip"
          };
          const vVO14 = vO14;
          GM_setValue("__csrt_replacer_meta", JSON.stringify(vVO14));
          vA10.forEach((p85, p86) => {
            GM_setValue("__csrt_replacer_chunk_" + p86, p85);
          });
          GM_setValue("__csrt_replacer_chunk_count", vA10.length);
          p82();
        } catch (e15) {
          p83(e15);
        }
      };
      v162.onerror = p83;
      v162.readAsDataURL(p81);
    });
  }
  function f39() {
    try {
      const vGM_getValue2 = GM_getValue("__csrt_replacer_meta");
      if (vGM_getValue2) {
        const v164 = JSON.parse(vGM_getValue2);
        for (let vLN012 = 0; vLN012 < v164.totalChunks; vLN012++) {
          GM_deleteValue("__csrt_replacer_chunk_" + vLN012);
        }
        GM_deleteValue("__csrt_replacer_chunk_count");
        GM_deleteValue("__csrt_replacer_meta");
      }
      v19 = null;
      v20 = false;
      return true;
    } catch (e16) {
      vO2.addError("清除替换数据失败: " + e16.message);
      return false;
    }
  }
  function f40() {
    if (!vVO3.bypassBlacklist) {
      return;
    }
    const v165 = XMLHttpRequest.prototype;
    const v166 = v165.open;
    v165.open = function (p87, p88) {
      if (p88 === "https://community-web.ccw.site/student/block_record/status") {
        return v166.call(this, p87, "data:application/json,{\"body\":\"NOT_BLOCKED\",\"code\":\"200\",\"msg\":null,\"status\":200}");
      }
      return v166.call(this, p87, p88);
    };
  }
  function f41() {
    if (!vVO3.blockCollaboration) {
      return;
    }
    function f42(p89) {
      try {
        return JSON.parse(p89);
      } catch {
        return;
      }
    }
    function f43(p90) {
      if (p90 && p90[0] === "project") {
        p90[1].author = "61039f14fffbe5461b880787";
        return p90;
      } else if (p90 && p90[0] === "log") {
        return [];
      }
      return p90;
    }
    const v167 = WebSocket.prototype;
    const v168 = v167.send;
    v167.send = function (p91) {
      if (this.url && this.url.startsWith("wss://mp2.ccw.site/multiplayer/")) {
        const vF422 = f42(p91);
        if (vF422) {
          const vF43 = f43(vF422);
          if (vF43 !== undefined && vF43 !== null) {
            p91 = JSON.stringify(vF43);
          }
          if (Array.isArray(vF43) && vF43.length === 0) {
            return;
          }
        }
      }
      return v168.apply(this, arguments);
    };
  }
  async function f44() {
    const vGM_getValue3 = GM_getValue("csrt_fake_identity");
    const vPrompt2 = prompt("输入目标用户的oid（主页链接后面的部分），取消代表不伪装\n输入 \"clear\" 清除伪装", vGM_getValue3?.oid ?? "");
    if (vPrompt2 === null) {
      return;
    }
    if (vPrompt2.toLowerCase() === "clear") {
      GM_deleteValue("csrt_fake_identity");
      if (confirm("✅ 已清除伪装身份，是否刷新页面？")) {
        location.reload();
      }
      return;
    }
    if (!vPrompt2.trim()) {
      alert("❌ 请输入有效的 oid");
      return;
    }
    try {
      const vO15 = {
        studentOid: vPrompt2
      };
      const v169 = await fetch("https://community-web.ccw.site/students/profile", {
        headers: {
          "content-type": "application/json"
        },
        referrer: "https://www.ccw.site/",
        method: "POST",
        body: JSON.stringify(vO15)
      }).then(p92 => p92.json());
      if (!v169?.body) {
        alert("❌ 未找到该用户，请检查 oid 是否正确");
        return;
      }
      const v170 = v169.body;
      const v171 = v170.studentNumber || "";
      const v172 = v170.name || "";
      const v173 = v170.avatar || "";
      const v174 = "📋 获取到用户信息：\n\n" + ("🆔 用户ID: " + (v171 || "未获取到") + "\n") + ("👤 用户名: " + (v172 || "未获取到") + "\n") + ("🖼️ 头像: " + (v173 ? "✅ 已获取" : "❌ 未获取") + "\n\n") + "点击\"确定\"使用自动获取的信息，点击\"取消\"手动输入";
      if (confirm(v174)) {
        if (!v171 && !v172) {
          alert("❌ 未能自动获取到用户信息，请手动输入");
          return;
        }
        GM_setValue("csrt_fake_identity", {
          oid: vPrompt2,
          id: v171 || "unknown",
          name: v172 || "未知用户",
          avatar: v173 || "https://m.ccw.site/community/images/logo-ccw.png"
        });
        alert("✅ 伪装身份已保存！\n\n👤 " + v172 + "\n🆔 " + v171 + "\n\n刷新页面生效！");
        location.reload();
      } else {
        let vPrompt3 = prompt("输入要伪装的 id（学号）:", vGM_getValue3?.id || v171 || "");
        if (vPrompt3 === null) {
          return;
        }
        let vPrompt4 = prompt("输入要伪装的名字:", vGM_getValue3?.name || v172 || "");
        if (vPrompt4 === null) {
          return;
        }
        let vPrompt5 = prompt("输入要伪装的头像 URL:", vGM_getValue3?.avatar || v173 || "");
        if (vPrompt5 === null) {
          return;
        }
        if (!vPrompt3 && !vPrompt4) {
          alert("❌ id 和 name 至少需要填写一个");
          return;
        }
        GM_setValue("csrt_fake_identity", {
          oid: vPrompt2,
          id: vPrompt3 || v171 || "unknown",
          name: vPrompt4 || v172 || "未知用户",
          avatar: vPrompt5 || v173 || "https://m.ccw.site/community/images/logo-ccw.png"
        });
        alert("✅ 伪装身份已保存，刷新页面生效！");
        location.reload();
      }
    } catch (e17) {
      alert("❌ 获取用户信息失败: " + e17.message);
      console.error("伪装身份失败:", e17);
    }
  }
  function f45() {
    const vGM_getValue4 = GM_getValue("csrt_fake_identity");
    GM_registerMenuCommand(vGM_getValue4 ? "🎭 伪装身份 (" + (vGM_getValue4.name || vGM_getValue4.id) + ")" : "🎭 伪装身份 (未开启)", f44);
  }
  function f46() {
    const vGM_getValue5 = GM_getValue("csrt_fake_identity");
    if (!vGM_getValue5) {
      return;
    }
    const {
      oid: _0x14ba6a,
      id: _0x180cae,
      name: _0x3b7a60,
      avatar: _0x387920
    } = vGM_getValue5;
    if (!f10("cookie-user-id")) {
      f11("cookie-user-id", _0x14ba6a);
    }
    const v175 = XMLHttpRequest.prototype;
    const v176 = v175.open;
    v175.open = function (p93, p94) {
      if (p94 === "https://community-web.ccw.site/students/self/detail") {
        const vO17 = {
          body: {
            abGroup: null,
            accountNumber: null,
            address: null,
            addressCode: null,
            age: null,
            archive: null,
            avatar: _0x387920 || "https://m.ccw.site/community/images/logo-ccw.png",
            bio: "",
            birthYear: null,
            birthday: null,
            category: null,
            city: null,
            commentCount: 0,
            contactPhone: "12345678901",
            countryCode: null,
            createdAt: Date.now(),
            currentMajorClazzOid: null,
            currentParent: {
              bindPhone: "12345678901",
              qqNickname: "CSRT",
              qqNum: null
            },
            distinctId: null,
            district: null,
            email: null,
            energy: null,
            energyRegain: null,
            examScore: null,
            extraInfo: null,
            firstTime: null,
            followingStatus: null,
            fullName: _0x3b7a60 || "创作者",
            gender: null,
            grade: 0,
            group: null,
            guest: null,
            guestNumber: null,
            hideGender: false,
            host: "aliyun",
            identity: null,
            identityAuthRank: "L2",
            identityType: null,
            informationModifyDate: {
              avatarModifiedAt: null,
              nameModifiedAt: null
            },
            keywords: [],
            lastLoginAt: null,
            lastStudyAt: null,
            lowAge: null,
            midexamScore: null,
            miniprojectFreeNum: null,
            mpClicked: null,
            mpShowedModal: null,
            mpTutorial: null,
            name: _0x3b7a60 || "创作者",
            newWorkbenchTutorial: null,
            oid: _0x14ba6a,
            orgId: null,
            parents: [{
              acceptedCashInviteOnce: null,
              alphaUser: null,
              altName: null,
              annualIncome: null,
              archive: null,
              authedTime: null,
              avatar: null,
              bindPhone: "12345678901",
              birthday: null,
              cashInviteCreatedAt: null,
              cashInviteRestartAt: null,
              clazzDevice: null,
              company: null,
              countryCode: null,
              createdAt: null,
              degree: null,
              distinctId: f13(32, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
              divorced: null,
              email: null,
              ext: {},
              followTeachers: [],
              fullName: null,
              gender: null,
              giftCardCampaign: null,
              guestOid: null,
              idcard: null,
              industry: null,
              integer: null,
              inviterableId: null,
              inviterableType: null,
              isEmployee: null,
              jobPosition: null,
              lastSubscribeAt: null,
              mainContact: null,
              name: null,
              needSelectClazz: null,
              oid: _0x14ba6a,
              overseaExperience: null,
              phoneAddr: {
                phone: "12345678901"
              },
              powerUser: null,
              realName: null,
              relationship: null,
              remarkName: null,
              rewardsCashesCount: null,
              source: null,
              sourceCategory: null,
              sourceInfo: null,
              status: null,
              student: null,
              studentOid: _0x14ba6a,
              subscribe: null,
              subscribeScene: null,
              tags: null,
              telephone: "12345678901",
              university: null,
              updatedAt: null,
              userTags: [],
              userType: null,
              wechatAccount: null,
              wechatCity: null,
              wechatCountry: null,
              wechatOpenid: null,
              wechatProvince: null,
              wechatUnionid: null,
              wehubWxid: null,
              wxid: null
            }],
            passwordDigest: null,
            photo: null,
            picUrl: null,
            province: null,
            qq: null,
            receiver: null,
            regChannel: "1",
            remarkName: null,
            reputationScore: {
              rank: "EXCELLENT",
              score: 100,
              studentOid: null
            },
            role: null,
            school: null,
            showServiceTerm: null,
            showTaskList: null,
            stats: null,
            studentNumber: _0x180cae || "00000000",
            task: null,
            teacherUnreadedMessages: null,
            tutorialSteps: null,
            updatedAt: Date.now(),
            validateSchool: null,
            virtualValue: null,
            watchedMiniProjectTutorailVideo: null,
            xiguaStudentNo: null
          },
          code: "200",
          msg: null,
          status: 200
        };
        const v177 = JSON.stringify(vO17);
        return v176.call(this, p93, "data:application/json," + v177);
      }
      return v176.call(this, p93, p94);
    };
    vO2.addLog("伪装身份已启用: " + (_0x3b7a60 || _0x180cae));
  }
  function f47() {
    if (!vVO3.fakePhone) {
      return;
    }
    let v178 = vVO4.identityAuthRank || "L2";
    let v179 = vVO4.phoneNumber || "12345678901";
    let v180 = vVO4.reputationRank || "EXCELLENT";
    let v181 = vVO4.reputationScore || 100;
    let v182 = vVO4.fullName || "不想上学";
    function f48(p95) {
      if (GM_getValue("csrt_fake_identity")) {
        console.warn("检测到开启了伪装身份，伪装手机号功能可能冲突");
        if (!GM_getValue("_csrt_phone_ignore_identity_warning", false)) {
          if (confirm("⚠️ 检测到开启了伪装身份功能\n\n伪装身份会覆盖手机号相关的认证信息，\n建议关闭伪装身份后使用伪装手机号。\n\n是否忽略此警告？（下次不再弹出）")) {
            GM_setValue("_csrt_phone_ignore_identity_warning", true);
          }
        }
      }
      if (!p95?.body) {
        throw new Error("返回body为空");
      }
      let vV178 = v178;
      if (!vV178) {
        const vVO18 = {
          L0: "L1",
          L1: "L2",
          L2: "L1"
        };
        vV178 = vVO18[p95.body.identityAuthRank] || "L1";
      }
      p95.body.identityAuthRank = vV178;
      p95.body.contactPhone = v179;
      p95.body.accountNumber = v179;
      if (p95.body.currentParent) {
        p95.body.currentParent.bindPhone = v179;
        p95.body.currentParent.qqNickname = null;
        p95.body.currentParent.qqNum = null;
      }
      if (vV178 === "L2") {
        p95.body.fullName = p95.body.fullName || v182;
        p95.body.identity = p95.body.identity || f13(18, "0123456789");
      }
      if (p95.body.parents && Array.isArray(p95.body.parents)) {
        p95.body.parents.forEach(p96 => {
          p96.distinctId = p96.distinctId || f13(32, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
          p96.phoneAddr = v179;
          p96.telephone = v179;
          p96.bindPhone = v179;
        });
      }
      if (p95.body.reputationScore) {
        p95.body.reputationScore.rank = v180;
        p95.body.reputationScore.score = v181;
      }
      return p95;
    }
    const v183 = XMLHttpRequest.prototype;
    const v184 = v183.open;
    v183.open = function (p97, p98) {
      if (p98 === "https://community-web.ccw.site/students/self/detail") {
        const v185 = this.send;
        this.send = function (p99) {
          const v186 = this.onreadystatechange;
          this.onreadystatechange = function () {
            if (this.readyState === 4) {
              try {
                const v187 = JSON.parse(this.response);
                const vF48 = f48(v187);
                Object.defineProperty(this, "responseText", {
                  get: () => JSON.stringify(vF48),
                  configurable: true
                });
                Object.defineProperty(this, "response", {
                  get: () => JSON.stringify(vF48),
                  configurable: true
                });
                vO2.addLog("伪装手机号已加载");
              } catch (e18) {
                vO2.addError("伪装手机号失败: " + e18.message);
              }
            }
            if (v186) {
              return v186.call(this);
            }
          };
          return v185.call(this, p99);
        };
      }
      return v184.call(this, p97, p98);
    };
    vO2.addLog("伪装手机号已启用");
  }
  let v188 = document.title;
  function f49(p100) {
    if (p100 && p100.trim()) {
      v188 = document.title;
      document.title = p100.trim();
      const vO19 = {
        success: true,
        title: document.title
      };
      return vO19;
    }
    return {
      success: false,
      error: "标题不能为空"
    };
  }
  function f50() {
    document.title = v188;
    const vO21 = {
      success: true,
      title: document.title
    };
    return vO21;
  }
  let v189 = null;
  let vA11 = [];
  let v190 = false;
  function f51(p101, p102) {
    return new Promise(p103 => {
      v189 = p103;
      vA11 = p101.map(p104 => ({
        ...p104,
        allowed: undefined
      }));
      v190 = true;
      const v191 = document.createElement("div");
      v191.style.cssText = "\n                position: fixed; top: 0; left: 0; right: 0; bottom: 0;\n                background: rgba(0,0,0,0.7); z-index: 1000002;\n                display: flex; align-items: center; justify-content: center;\n                backdrop-filter: blur(8px);\n            ";
      const v192 = document.createElement("div");
      v192.style.cssText = "\n                background: rgba(16,18,27,0.85); backdrop-filter: blur(24px);\n                -webkit-backdrop-filter: blur(24px); border-radius: 20px;\n                padding: 24px; width: 750px; max-width: 95vw; max-height: 85vh;\n                border: 1px solid rgba(255,255,255,0.08);\n                box-shadow: 0 25px 50px rgba(0,0,0,0.6);\n                color: #eee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n                display: flex; flex-direction: column; overflow: hidden;\n            ";
      const v193 = document.createElement("div");
      v193.style.cssText = "\n                display: flex; justify-content: space-between; align-items: center;\n                padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06);\n                flex-shrink: 0;\n            ";
      const v194 = document.createElement("span");
      v194.style.cssText = "font-size:20px;font-weight:600;color:#ffb86c;display:flex;align-items:center;gap:10px;";
      v194.innerHTML = "🔌 扩展拦截 - 请审查以下扩展 (" + p101.length + "个)";
      const v195 = document.createElement("button");
      v195.textContent = "✕";
      v195.style.cssText = "\n                background:none; border:none; color:rgba(255,255,255,0.4);\n                font-size:22px; cursor:pointer; padding:0 8px; border-radius:8px;\n                transition:all 0.2s;\n            ";
      v195.onmouseover = () => v195.style.color = "#fff";
      v195.onmouseout = () => v195.style.color = "rgba(255,255,255,0.4)";
      v195.onclick = () => {
        if (confirm("确定要关闭拦截窗口吗？项目将不会加载这些扩展。")) {
          v191.remove();
          v190 = false;
          if (v189) {
            v189({
              action: "cancel",
              extensions: vA11
            });
          }
        }
      };
      v193.appendChild(v194);
      v193.appendChild(v195);
      v192.appendChild(v193);
      const v196 = document.createElement("div");
      v196.style.cssText = "\n                padding:8px 12px; background:rgba(255,181,0,0.12);\n                border:1px solid rgba(255,181,0,0.2); border-radius:8px;\n                margin:12px 0; font-size:13px; color:#ffb86c; flex-shrink:0;\n            ";
      v196.textContent = "⚠️ 请仔细审查每个扩展的代码，确认安全后再加载。可疑扩展请拒绝加载。";
      v192.appendChild(v196);
      const v197 = document.createElement("div");
      v197.style.cssText = "flex:1; overflow-y:auto; margin:8px 0; padding-right:4px;";
      v197.className = "csrt-scroll";
      const vA12 = [];
      vA11.forEach((p105, p106) => {
        const v198 = document.createElement("div");
        v198.style.cssText = "\n                    background:rgba(255,255,255,0.03); border-radius:12px; padding:12px;\n                    margin-bottom:10px; border-left:3px solid " + (p105.isLoaded ? "#50fa7b" : "#ffb86c") + ";\n                    transition:all 0.3s;\n                ";
        const v199 = document.createElement("div");
        v199.style.cssText = "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;";
        const v200 = document.createElement("span");
        v200.style.cssText = "font-weight:600; font-size:15px; color:#f8f8f2; display:flex; align-items:center; gap:10px;";
        v200.innerHTML = "📦 " + p105.name;
        const v201 = document.createElement("span");
        v201.style.cssText = "\n                    font-size:10px; padding:1px 8px; border-radius:10px;\n                    background: " + (p105.isCustom ? "rgba(255,184,108,0.15)" : "rgba(80,250,123,0.15)") + ";\n                    color: " + (p105.isCustom ? "#ffb86c" : "#50fa7b") + ";\n                    margin-left:6px;\n                ";
        v201.textContent = p105.isCustom ? "🔶 自定义" : "🔷 官方";
        v200.appendChild(v201);
        v199.appendChild(v200);
        const v202 = document.createElement("div");
        v202.style.cssText = "display:flex; align-items:center; gap:10px; flex-wrap:wrap;";
        const v203 = document.createElement("span");
        v203.style.cssText = "\n                    font-size:11px; padding:2px 10px; border-radius:12px;\n                    background: " + (p105.isLoaded ? "rgba(80,250,123,0.15)" : "rgba(255,184,108,0.15)") + ";\n                    color: " + (p105.isLoaded ? "#50fa7b" : "#ffb86c") + ";\n                ";
        v203.textContent = p105.isLoaded ? "✅ 已加载" : "⏳ 未加载";
        v202.appendChild(v203);
        const v204 = document.createElement("span");
        v204.style.cssText = "\n                    font-size:11px; padding:2px 10px; border-radius:12px;\n                    background:rgba(255,85,85,0.15); color:#ff5555;\n                    display: " + (p105.modified ? "inline-block" : "none") + ";\n                ";
        v204.textContent = "✏️ 已修改";
        v204.id = "modified-" + p106;
        v202.appendChild(v204);
        v199.appendChild(v202);
        v198.appendChild(v199);
        const v205 = document.createElement("div");
        v205.style.cssText = "\n                    color:rgba(255,255,255,0.4); font-size:12px; word-break:break-all;\n                    margin-top:4px; font-family:monospace;\n                ";
        v205.textContent = "🔗 " + p105.url;
        v198.appendChild(v205);
        if (p105.source) {
          const v206 = document.createElement("div");
          v206.style.cssText = "color:rgba(255,255,255,0.3); font-size:11px; margin-top:2px;";
          v206.textContent = "来源: " + p105.source;
          v198.appendChild(v206);
        }
        const v207 = document.createElement("div");
        v207.style.cssText = "display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;";
        const v208 = document.createElement("button");
        v208.textContent = "📝 查看/修改代码";
        v208.className = "csrt-glass-btn info";
        v208.onclick = async function () {
          await f52(p105, p106, v204, v198);
        };
        v207.appendChild(v208);
        const v209 = document.createElement("button");
        v209.textContent = "✅ 允许加载";
        v209.className = "csrt-glass-btn success";
        v209.onclick = function () {
          p105.allowed = true;
          v198.style.borderLeftColor = "#50fa7b";
          this.textContent = "✅ 已允许";
          this.style.background = "rgba(80,250,123,0.25)";
          this.disabled = true;
          const v210 = v207.querySelector(".reject-btn");
          if (v210) {
            v210.textContent = "❌ 已拒绝";
            v210.style.background = "rgba(255,85,85,0.1)";
            v210.disabled = true;
          }
        };
        v207.appendChild(v209);
        const v211 = document.createElement("button");
        v211.textContent = "❌ 拒绝";
        v211.className = "csrt-glass-btn danger";
        v211.onclick = function () {
          p105.allowed = false;
          v198.style.borderLeftColor = "#ff5555";
          this.textContent = "❌ 已拒绝";
          this.style.background = "rgba(255,85,85,0.25)";
          this.disabled = true;
          const v212 = v207.querySelector(".allow-btn");
          if (v212) {
            v212.textContent = "✅ 已允许";
            v212.style.background = "rgba(80,250,123,0.1)";
            v212.disabled = true;
          }
        };
        v207.appendChild(v211);
        v198.appendChild(v207);
        v197.appendChild(v198);
        vA12.push(v198);
      });
      v192.appendChild(v197);
      const v213 = document.createElement("div");
      v213.style.cssText = "\n                display:flex; gap:12px; padding-top:12px;\n                border-top:1px solid rgba(255,255,255,0.06);\n                flex-shrink:0; flex-wrap:wrap; justify-content:space-between;\n                align-items:center;\n            ";
      const v214 = document.createElement("div");
      v214.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";
      const v215 = document.createElement("button");
      v215.textContent = "✅ 全部允许";
      v215.className = "csrt-glass-btn success";
      v215.onclick = function () {
        vA11.forEach(p107 => {
          p107.allowed = true;
        });
        vA12.forEach(p108 => {
          p108.style.borderLeftColor = "#50fa7b";
          const v216 = p108.querySelectorAll("button");
          v216.forEach(p109 => {
            if (p109.textContent.includes("允许")) {
              p109.textContent = "✅ 已允许";
              p109.style.background = "rgba(80,250,123,0.25)";
              p109.disabled = true;
            }
            if (p109.textContent.includes("拒绝") && !p109.textContent.includes("已拒绝")) {
              p109.textContent = "❌ 已拒绝";
              p109.style.background = "rgba(255,85,85,0.1)";
              p109.disabled = true;
            }
          });
        });
      };
      v214.appendChild(v215);
      const v217 = document.createElement("button");
      v217.textContent = "❌ 全部拒绝";
      v217.className = "csrt-glass-btn danger";
      v217.onclick = function () {
        vA11.forEach(p110 => {
          p110.allowed = false;
        });
        vA12.forEach(p111 => {
          p111.style.borderLeftColor = "#ff5555";
          const v218 = p111.querySelectorAll("button");
          v218.forEach(p112 => {
            if (p112.textContent.includes("拒绝") && !p112.textContent.includes("已拒绝")) {
              p112.textContent = "❌ 已拒绝";
              p112.style.background = "rgba(255,85,85,0.25)";
              p112.disabled = true;
            }
            if (p112.textContent.includes("允许") && !p112.textContent.includes("已允许")) {
              p112.textContent = "✅ 已允许";
              p112.style.background = "rgba(80,250,123,0.1)";
              p112.disabled = true;
            }
          });
        });
      };
      v214.appendChild(v217);
      const v219 = document.createElement("button");
      v219.textContent = "▶ 继续加载项目";
      v219.className = "csrt-glass-btn primary";
      v219.onclick = function () {
        const v220 = vA11.filter(p113 => p113.allowed === undefined);
        if (v220.length > 0) {
          if (!confirm("还有 " + v220.length + " 个扩展未选择允许/拒绝，确定要继续吗？未选择的扩展将不会被加载。")) {
            return;
          }
        }
        v191.remove();
        v190 = false;
        if (v189) {
          v189({
            action: "continue",
            extensions: vA11
          });
        }
      };
      v213.appendChild(v214);
      v213.appendChild(v219);
      v192.appendChild(v213);
      v191.appendChild(v192);
      document.body.appendChild(v191);
    });
  }
  async function f52(p114, p115, p116, p117) {
    let v221 = p114.modifiedCode || p114.originalCode;
    if (!v221) {
      v221 = await f36(p114.name);
      if (v221) {
        p114.originalCode = v221;
      } else {
        alert("无法获取扩展 \"" + p114.name + "\" 的代码");
        return;
      }
    }
    const v222 = document.createElement("div");
    v222.style.cssText = "\n            position: fixed; top:0; left:0; right:0; bottom:0;\n            background:rgba(0,0,0,0.8); z-index:1000003;\n            display:flex; align-items:center; justify-content:center;\n            backdrop-filter:blur(8px);\n        ";
    const v223 = document.createElement("div");
    v223.style.cssText = "\n            background:rgba(16,18,27,0.85); backdrop-filter:blur(24px);\n            -webkit-backdrop-filter:blur(24px); border-radius:20px;\n            padding:24px; width:85%; max-width:800px; max-height:85vh;\n            border:1px solid rgba(139,233,253,0.2);\n            box-shadow:0 20px 60px rgba(0,0,0,0.6);\n            color:#eee; display:flex; flex-direction:column; overflow:hidden;\n        ";
    const v224 = document.createElement("div");
    v224.style.cssText = "\n            display:flex; justify-content:space-between; align-items:center;\n            padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06);\n            flex-shrink:0;\n        ";
    const v225 = document.createElement("span");
    v225.style.cssText = "font-size:18px;font-weight:600;color:#8be9fd;";
    v225.textContent = "📝 编辑扩展: " + p114.name;
    v224.appendChild(v225);
    const v226 = document.createElement("button");
    v226.textContent = "✕";
    v226.style.cssText = "\n            background:none; border:none; color:rgba(255,255,255,0.4);\n            font-size:22px; cursor:pointer; padding:0 8px; border-radius:8px;\n            transition:all 0.2s;\n        ";
    v226.onmouseover = () => v226.style.color = "#fff";
    v226.onmouseout = () => v226.style.color = "rgba(255,255,255,0.4)";
    v226.onclick = () => v222.remove();
    v224.appendChild(v226);
    v223.appendChild(v224);
    const v227 = document.createElement("textarea");
    v227.style.cssText = "\n            width:100%; height:400px; margin:12px 0;\n            background:rgba(0,0,0,0.4); color:#f8f8f2;\n            border:1px solid rgba(255,255,255,0.06); border-radius:12px;\n            padding:12px; font-family:'Courier New',monospace; font-size:12px;\n            resize:vertical; box-sizing:border-box; tab-size:2; line-height:1.6;\n        ";
    v227.value = v221;
    v223.appendChild(v227);
    const v228 = document.createElement("div");
    v228.style.cssText = "display:flex; gap:12px; justify-content:flex-end; flex-shrink:0; padding-top:8px;";
    const v229 = document.createElement("button");
    v229.textContent = "取消";
    v229.className = "csrt-glass-btn";
    v229.onclick = () => v222.remove();
    const v230 = document.createElement("button");
    v230.textContent = "💾 保存修改";
    v230.className = "csrt-glass-btn primary";
    v230.onclick = function () {
      const v231 = v227.value;
      if (v231 !== p114.originalCode) {
        p114.modifiedCode = v231;
        p114.modified = true;
        if (p116) {
          p116.style.display = "inline-block";
        }
        if (p117) {
          p117.style.borderLeftColor = "#ffb86c";
        }
        f23("✅ 修改已保存");
      }
      v222.remove();
    };
    v228.appendChild(v229);
    v228.appendChild(v230);
    v223.appendChild(v228);
    v222.appendChild(v223);
    document.body.appendChild(v222);
    // TOLOOK
    setTimeout(() => v227.focus(), 100);
  }
  async function f53(p118, p119) {
    if (!v47) {
      try {
        v47 = await f22();
      } catch (e19) {
        vO2.addError("VM未就绪，无法修改扩展: " + e19.message);
        return {
          success: false,
          error: "VM未就绪"
        };
      }
      if (!v47) {
        return {
          success: false,
          error: "VM未就绪"
        };
      }
    }
    try {
      const v232 = v47.extensionManager;
      if (!v232) {
        return {
          success: false,
          error: "扩展管理器未找到"
        };
      }
      const v233 = v232._loadedExtensions || {};
      if (!v233[p118]) {
        const vO25 = {
          success: false,
          error: "扩展 " + p118 + " 未加载"
        };
        return vO25;
      }
      const v234 = v233[p118];
      if (v234.custom || v234.url) {
        const v235 = new Blob([p119], {
          type: "application/javascript"
        });
        const v236 = URL.createObjectURL(v235);
        const v237 = v234.url;
        await v232.loadExtensionURL(v236);
        v233[p118].url = v236;
        v233[p118].originalUrl = v237;
        const vO27 = {
          success: true,
          message: "扩展 " + p118 + " 已修改",
          newUrl: v236,
          originalUrl: v237
        };
        return vO27;
      }
      return {
        success: false,
        error: "仅支持自定义扩展的修改"
      };
    } catch (e20) {
      vO2.addError("修改扩展失败: " + e20.message);
      const vO29 = {
        success: false,
        error: e20.message
      };
      return vO29;
    }
  }
  function f54() {
    f22().then(p120 => {
      if (!p120) {
        vO2.addError("VM未就绪，无法设置扩展拦截");
        return;
      }
      const v238 = p120.loadProject;
      p120._originalLoadProject = v238;
      p120.loadProject = async function (p121) {
        let v239 = null;
        let v240 = null;
        try {
          if (p120.exports?.JSZip) {
            v239 = p120.exports.JSZip;
          } else if (window.JSZip) {
            v239 = window.JSZip;
          }
          if (typeof p121 === "string") {
            v240 = JSON.parse(p121);
          } else if (p121 instanceof ArrayBuffer || p121 instanceof Uint8Array) {
            if (v239) {
              const v241 = await v239.loadAsync(p121);
              const v242 = v241.file("project.json");
              if (v242) {
                const v243 = await v242.async("string");
                v240 = JSON.parse(v243);
              }
            }
          } else if (p121 && typeof p121 === "object") {
            if (p121.file) {
              const v244 = p121.file("project.json");
              if (v244) {
                const v245 = await v244.async("string");
                v240 = JSON.parse(v245);
              }
            } else {
              v240 = p121;
            }
          }
          if (v240) {
            try {
              let v246 = null;
              if (typeof p121 === "string") {
                v246 = new Blob([p121], {
                  type: "application/json"
                });
              } else if (p121 instanceof ArrayBuffer || p121 instanceof Uint8Array) {
                v246 = new Blob([p121], {
                  type: "application/zip"
                });
              } else if (p121 && typeof p121 === "object" && p121.file) {
                const v247 = await v239.loadAsync(p121);
                const v248 = await v247.generateAsync({
                  type: "arraybuffer"
                });
                v246 = new Blob([v248], {
                  type: "application/zip"
                });
              }
              if (v246) {
                const v249 = f6(window.location.href) || "unknown";
                vA2.unshift({
                  timestamp: new Date(),
                  data: v246,
                  filename: v249 + "_" + Date.now() + ".sb3",
                  projectId: v249
                });
                if (vA2.length > vLN20) {
                  vA2.pop();
                }
                console.log("✅ CSRT 已捕获作品:", v249, "总数:", vA2.length);
                vO2.addLog("已捕获作品: " + v249);
              }
            } catch (e21) {
              console.warn("⚠️ CSRT 捕获失败:", e21.message);
              vO2.addError("捕获作品失败: " + e21.message);
            }
          }
          if (v240) {
            const v250 = v240.extensions || [];
            const v251 = v240.gandi?.wildExtensions || {};
            const v252 = v240.extensionURLs || {};
            const v253 = v250.length > 0 || Object.keys(v251).length > 0 || Object.keys(v252).length > 0;
            if (v253) {
              console.log("🔍 CSRT 检测到扩展:", {
                extensions: v250.length,
                wild: Object.keys(v251).length,
                urls: Object.keys(v252).length
              });
              const v254 = new Set();
              v250.forEach(p122 => {
                const v255 = typeof p122 === "string" ? p122 : p122?.name;
                if (v255) {
                  v254.add(v255);
                }
              });
              Object.keys(v252).forEach(p123 => v254.add(p123));
              Object.keys(v251).forEach(p124 => v254.add(p124));
              const vA13 = [];
              v254.forEach(p125 => {
                const v256 = v251[p125] !== undefined;
                const v257 = v252[p125] !== undefined;
                const v258 = v251[p125]?.url || v252[p125] || v250.find(p126 => (typeof p126 === "string" ? p126 : p126?.name) === p125 && typeof p126 === "object" && p126.url)?.url || "未知";
                vA13.push({
                  name: p125,
                  url: v258,
                  source: v256 ? "wildExtensions" : v257 ? "extensionURLs" : "extensions数组",
                  isCustom: v256 || v257 || !f16(p125),
                  allowed: undefined,
                  modified: false,
                  originalCode: null,
                  modifiedCode: null,
                  isLoaded: false
                });
              });
              const v259 = await f51(vA13, v240);
              if (v259.action === "continue") {
                const v260 = v259.extensions.filter(p127 => p127.allowed === true).map(p128 => p128.name);
                if (v240.extensions) {
                  v240.extensions = v240.extensions.filter(p129 => {
                    const v261 = typeof p129 === "string" ? p129 : p129?.name;
                    return v261 && v260.includes(v261);
                  });
                }
                if (v240.extensionURLs) {
                  Object.keys(v240.extensionURLs).forEach(p130 => {
                    if (!v260.includes(p130)) {
                      delete v240.extensionURLs[p130];
                    }
                  });
                }
                if (v240.gandi?.wildExtensions) {
                  Object.keys(v240.gandi.wildExtensions).forEach(p131 => {
                    if (!v260.includes(p131)) {
                      delete v240.gandi.wildExtensions[p131];
                    }
                  });
                }
                const v262 = v259.extensions.filter(p132 => p132.modified && p132.allowed);
                for (const v263 of v262) {
                  if (v263.modifiedCode) {
                    const v264 = new Blob([v263.modifiedCode], {
                      type: "application/javascript"
                    });
                    const v265 = URL.createObjectURL(v264);
                    if (v240.gandi?.wildExtensions?.[v263.name]) {
                      v240.gandi.wildExtensions[v263.name].url = v265;
                    }
                    if (v240.extensionURLs?.[v263.name]) {
                      v240.extensionURLs[v263.name] = v265;
                    }
                  }
                }
                vO2.addLog("扩展拦截完成，允许了 " + v260.length + " 个扩展");
                const v266 = JSON.stringify(v240);
                return v238.call(p120, v266);
              } else {
                return Promise.reject(new Error("扩展加载被用户取消"));
              }
            }
          }
        } catch (e22) {
          vO2.addError("loadProject劫持失败: " + e22.message);
          console.error("loadProject劫持失败:", e22);
        }
        return v238.call(p120, p121);
      };
      if (p120.runtime) {
        const v267 = p120.runtime.loadProject;
        p120.runtime.loadProject = function (p133) {
          return p120.loadProject(p133);
        };
      }
      vO2.addLog("扩展拦截器已设置");
    }).catch(p134 => {
      vO2.addError("扩展拦截设置失败: " + p134.message);
      console.error("扩展拦截设置失败:", p134);
    });
  }
  async function f55() {
    try {
      const v268 = await f22();
      if (!v268) {
        alert("❌ 无法获取VM实例");
        return;
      }
      const v269 = v268.runtime;
      if (!v269) {
        alert("❌ 无法获取Runtime");
        return;
      }
      let v270 = v269.getProjectData?.();
      if (!v270) {
        if (v268._projectData) {
          v270 = v268._projectData;
        } else if (v269._projectData) {
          v270 = v269._projectData;
        } else if (v268.projectData) {
          v270 = v268.projectData;
        }
      }
      if (!v270) {
        alert("❌ 无法获取项目数据");
        return;
      }
      let v271 = null;
      if (v268.exports?.JSZip) {
        v271 = v268.exports.JSZip;
      } else if (window.JSZip) {
        v271 = window.JSZip;
      }
      if (!v271) {
        alert("❌ 无法加载JSZip库");
        return;
      }
      const v272 = new v271();
      const v273 = typeof v270 === "string" ? JSON.parse(v270) : v270;
      v272.file("project.json", JSON.stringify(v273, null, 2));
      const vA14 = [];
      if (v273.gandi?.assets) {
        v273.gandi.assets.forEach(p135 => {
          if (p135.md5ext) {
            vA14.push({
              name: p135.md5ext,
              url: "https://m.ccw.site/user_projects_assets/" + encodeURIComponent(p135.md5ext)
            });
          }
        });
      }
      if (v273.targets) {
        v273.targets.forEach(p136 => {
          if (p136.sounds) {
            p136.sounds.forEach(p137 => {
              if (p137.md5ext) {
                vA14.push({
                  name: p137.md5ext,
                  url: "https://m.ccw.site/user_projects_assets/" + encodeURIComponent(p137.md5ext)
                });
              }
            });
          }
          if (p136.costumes) {
            p136.costumes.forEach(p138 => {
              if (p138.md5ext) {
                vA14.push({
                  name: p138.md5ext,
                  url: "https://m.ccw.site/user_projects_assets/" + encodeURIComponent(p138.md5ext)
                });
              }
            });
          }
        });
      }
      let vLN013 = 0;
      const v274 = vA14.length;
      if (v274 > 0) {
        f23("⏳ 正在下载资源 (0/" + v274 + ")...");
      }
      const vLN32 = 32;
      let vLN014 = 0;
      await Promise.all(new Array(vLN32).fill(0).map(async () => {
        while (vLN014 < vA14.length) {
          const v275 = vA14[vLN014++];
          if (v272.file(v275.name)) {
            continue;
          }
          try {
            const v276 = await fetch(v275.url);
            if (!v276.ok) {
              throw new Error("HTTP " + v276.status);
            }
            const v277 = await v276.blob();
            v272.file(v275.name, v277);
            vLN013++;
            if (vLN013 % 5 === 0) {
              f23("⏳ 正在下载资源 (" + vLN013 + "/" + v274 + ")...");
            }
          } catch (e23) {
            vO2.addError("下载资源失败: " + v275.name + " - " + e23.message);
          }
        }
      }));
      f23("📦 正在打包...");
      const v278 = await v272.generateAsync({
        type: "arraybuffer"
      });
      const v279 = new Blob([v278], {
        type: "application/zip"
      });
      f14(v279, "project_" + Date.now() + ".sb3");
      f23("✅ 下载完成！共 " + vA14.length + " 个文件");
    } catch (e24) {
      vO2.addError("下载项目失败: " + e24.message);
      alert("❌ 下载失败: " + e24.message);
    }
  }
  async function f56() {
    try {
      const v280 = await f22();
      if (!v280) {
        alert("❌ 无法获取VM实例");
        return;
      }
      const v281 = v280.runtime;
      if (!v281) {
        alert("❌ 无法获取Runtime");
        return;
      }
      let v282 = null;
      if (v280.exports?.JSZip) {
        v282 = v280.exports.JSZip;
      } else if (window.JSZip) {
        v282 = window.JSZip;
      }
      if (!v282) {
        alert("❌ 无法加载JSZip库");
        return;
      }
      const v283 = v281.targets || [];
      const vA15 = [];
      for (const v284 of v283) {
        if (v284.isStage) {
          continue;
        }
        try {
          const v285 = v284.toJSON();
          const v286 = new v282();
          v286.file("sprite.json", JSON.stringify(v285, null, 2));
          const vA16 = [];
          if (v284.sounds) {
            v284.sounds.forEach(p139 => {
              if (p139.asset) {
                const vO37 = {
                  name: p139.asset.assetId + "." + p139.asset.dataFormat,
                  data: p139.asset.data
                };
                vA16.push(vO37);
              }
            });
          }
          if (v284.costumes) {
            v284.costumes.forEach(p140 => {
              if (p140.asset) {
                const vO38 = {
                  name: p140.asset.assetId + "." + p140.asset.dataFormat,
                  data: p140.asset.data
                };
                vA16.push(vO38);
              }
            });
          }
          for (const v287 of vA16) {
            v286.file(v287.name, v287.data);
          }
          const v288 = await v286.generateAsync({
            type: "arraybuffer"
          });
          const v289 = new Blob([v288], {
            type: "application/zip"
          });
          const v290 = v284.getName?.() || v284.sprite?.name || "sprite";
          const vO41 = {
            blob: v289,
            name: v290 + ".sprite3"
          };
          vA15.push(vO41);
        } catch (e25) {
          vO2.addError("导出角色失败: " + e25.message);
        }
      }
      if (vA15.length === 0) {
        alert("❌ 没有找到可导出的角色");
        return;
      }
      const vConfirm = confirm("找到 " + vA15.length + " 个角色。\n\n点击\"确定\"：将所有角色打包为ZIP文件\n点击\"取消\"：逐个下载每个角色");
      if (vConfirm) {
        const v291 = new v282();
        for (const v292 of vA15) {
          v291.file(v292.name, v292.blob);
        }
        const v293 = await v291.generateAsync({
          type: "arraybuffer"
        });
        const v294 = new Blob([v293], {
          type: "application/zip"
        });
        f14(v294, "all_sprites_" + Date.now() + ".zip");
        f23("✅ 已导出 " + vA15.length + " 个角色");
      } else {
        for (const v295 of vA15) {
          f14(v295.blob, v295.name);
        }
        f23("✅ 已导出 " + vA15.length + " 个角色");
      }
    } catch (e26) {
      vO2.addError("导出角色失败: " + e26.message);
      alert("❌ 导出失败: " + e26.message);
    }
  }
  function f57() {
    if (vA2.length === 0) {
      alert("📂 暂无捕获的作品\n\n当作品通过 loadProject 加载时，会自动捕获并保存在这里。\n最多保存最近 " + vLN20 + " 个作品。");
      return;
    }
    let vLS3 = "📂 捕获的作品列表\n\n";
    vA2.forEach((p141, p142) => {
      const v296 = p141.timestamp.toLocaleString("zh-CN");
      const v297 = (p141.data.size / 1024).toFixed(1);
      vLS3 += p142 + 1 + ". " + (p141.projectId || "unknown") + " | " + v296 + " | " + v297 + "KB\n";
    });
    vLS3 += "\n共 " + vA2.length + " 个作品，最多 " + vLN20 + " 个。";
    const vPrompt6 = prompt(vLS3 + "\n\n输入编号下载对应作品，输入 \"all\" 下载全部，输入 \"clear\" 清空列表：", "");
    if (vPrompt6 === null) {
      return;
    }
    if (vPrompt6.toLowerCase() === "clear") {
      if (confirm("确定要清空所有捕获的作品吗？")) {
        vA2 = [];
        f23("✅ 已清空捕获列表");
      }
      return;
    }
    if (vPrompt6.toLowerCase() === "all") {
      for (const v298 of vA2) {
        f14(v298.data, v298.filename);
      }
      f23("✅ 已下载 " + vA2.length + " 个作品");
      return;
    }
    const v299 = parseInt(vPrompt6) - 1;
    if (!isNaN(v299) && v299 >= 0 && v299 < vA2.length) {
      const v300 = vA2[v299];
      f14(v300.data, v300.filename);
      f23("✅ 已下载: " + v300.filename);
    } else {
      alert("❌ 无效的编号");
    }
  }
  let v301 = false;
  let v302 = null;
  let v303 = null;
  let vLN015 = 0;
  let vLN016 = 0;
  let vLN017 = 0;
  let v304 = Date.now();
  function f58() {
    const v305 = window.fetch;
    window.fetch = function (..._0x58389b) {
      vLN016++;
      return v305.apply(this, _0x58389b);
    };
    const v306 = XMLHttpRequest.prototype;
    const v307 = v306.send;
    v306.send = function (p143) {
      vLN016++;
      return v307.apply(this, arguments);
    };
  }
  function f59() {
    const v308 = performance.now();
    fetch("/favicon.ico?" + Date.now(), {
      cache: "no-store",
      mode: "no-cors"
    }).catch(() => {}).finally(() => {
      vLN017 = Math.round(performance.now() - v308);
    });
  }
  function f60() {
    if (document.querySelector(".csrt-monitor")) {
      return document.querySelector(".csrt-monitor");
    }
    const v309 = document.createElement("div");
    v309.className = "csrt-monitor";
    v309.style.cssText = "\n            position: fixed; bottom: 140px; right: 20px;\n            background: rgba(16,18,27,0.85); backdrop-filter: blur(20px);\n            -webkit-backdrop-filter: blur(20px);\n            border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;\n            padding: 10px 14px; z-index: 999998;\n            color: #f8f8f2; font-family: 'Courier New', monospace; font-size: 12px;\n            min-width: 140px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);\n            user-select: none; cursor: move; touch-action: none;\n            contain: layout style paint; transition: opacity 0.3s ease; opacity: 1;\n        ";
    v309.innerHTML = "\n            <div style=\"display:flex;flex-direction:column;gap:3px;\">\n                <div style=\"display:flex;justify-content:space-between;align-items:center;\">\n                    <span style=\"color:rgba(255,255,255,0.4);\">📊 延迟</span>\n                    <span id=\"csrt-latency\" style=\"color:#8be9fd;\">--ms</span>\n                </div>\n                <div style=\"display:flex;justify-content:space-between;align-items:center;\">\n                    <span style=\"color:rgba(255,255,255,0.4);\">🔄 FPS</span>\n                    <span id=\"csrt-fps\" style=\"color:#50fa7b;\">--</span>\n                </div>\n                <div style=\"display:flex;justify-content:space-between;align-items:center;\">\n                    <span style=\"color:rgba(255,255,255,0.4);\">📡 请求</span>\n                    <span id=\"csrt-requests\" style=\"color:#f1fa8c;\">0</span>\n                </div>\n                <div style=\"display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.05);padding-top:3px;margin-top:2px;\">\n                    <span style=\"font-size:10px;color:rgba(255,255,255,0.3);\">⏱️</span>\n                    <span id=\"csrt-uptime\" style=\"font-size:10px;color:rgba(255,255,255,0.3);\">00:00</span>\n                </div>\n            </div>\n        ";
    let v310 = false;
    let vLN018 = 0;
    let vLN019 = 0;
    v309.addEventListener("mousedown", p144 => {
      v310 = true;
      const v311 = v309.getBoundingClientRect();
      vLN018 = p144.clientX - v311.left;
      vLN019 = p144.clientY - v311.top;
      v309.style.cursor = "grabbing";
      p144.preventDefault();
    });
    document.addEventListener("mousemove", p145 => {
      if (!v310) {
        return;
      }
      let v312 = p145.clientX - vLN018;
      let v313 = p145.clientY - vLN019;
      const v314 = window.innerWidth - v309.offsetWidth - 10;
      const v315 = window.innerHeight - v309.offsetHeight - 10;
      v312 = Math.max(10, Math.min(v312, v314));
      v313 = Math.max(10, Math.min(v313, v315));
      v309.style.left = v312 + "px";
      v309.style.top = v313 + "px";
      v309.style.right = "auto";
      v309.style.bottom = "auto";
    });
    document.addEventListener("mouseup", () => {
      if (v310) {
        v310 = false;
        v309.style.cursor = "move";
      }
    });
    document.body.appendChild(v309);
    return v309;
  }
  function f61() {
    if (v301) {
      return;
    }
    v301 = true;
    v304 = Date.now();
    v302 = f60();
    f58();
    f59();
    let vLN020 = 0;
    let v316 = performance.now();
    function f62() {
      vLN020++;
      const v317 = performance.now();
      if (v317 - v316 >= 1000) {
        vLN015 = vLN020;
        vLN020 = 0;
        v316 = v317;
        f63();
      }
      if (v301) {
        requestAnimationFrame(f62);
      }
    }
    function f63() {
      const v318 = document.getElementById("csrt-latency");
      const v319 = document.getElementById("csrt-fps");
      const v320 = document.getElementById("csrt-requests");
      const v321 = document.getElementById("csrt-uptime");
      if (v318) {
        v318.textContent = vLN017 + "ms";
      }
      if (v319) {
        v319.textContent = vLN015;
      }
      if (v320) {
        v320.textContent = vLN016;
      }
      const v322 = Math.floor((Date.now() - v304) / 1000);
      const v323 = String(Math.floor(v322 / 60)).padStart(2, "0");
      const v324 = String(v322 % 60).padStart(2, "0");
      if (v321) {
        v321.textContent = v323 + ":" + v324;
      }
    }
    v303 = // TOLOOK
    setInterval(() => {
      f59();
      f63();
    }, 2000);
    requestAnimationFrame(f62);
    f63();
    vO2.addLog("性能监控已启动");
  }
  function f64() {
    v301 = false;
    if (v303) {
      clearInterval(v303);
      v303 = null;
    }
    if (v302) {
      v302.remove();
      v302 = null;
    }
    vO2.addLog("性能监控已停止");
  }
  function f65(p146) {
    if (p146 && !v301) {
      f61();
    } else if (!p146 && v301) {
      f64();
    }
    vVO3.performanceMonitor = p146;
    f3();
  }
  async function f66() {
    const v325 = document.createElement("div");
    v325.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    const v326 = document.createElement("button");
    v326.textContent = "🔄 刷新信息";
    v326.className = "csrt-glass-btn primary";
    v326.style.alignSelf = "flex-start";
    const v327 = document.createElement("div");
    v327.style.cssText = "\n            background:rgba(255,255,255,0.03); border-radius:12px; padding:16px;\n            font-size:13px; line-height:1.8; font-family:'Courier New',monospace;\n            max-height:400px; overflow-y:auto;\n        ";
    v327.className = "csrt-scroll";
    v327.id = "srt-info-content";
    async function f67() {
      const v328 = await f34(false);
      const v329 = v328.isProfile || false;
      const v330 = v328.isOther || false;
      if (v330) {
        v327.innerHTML = "\n                    <div style=\"color:#8be9fd;font-weight:600;margin-bottom:8px;\">📋 当前页面</div>\n                    <div style=\"display:grid;grid-template-columns:70px 1fr;gap:4px 12px;\">\n                        <span style=\"color:rgba(255,255,255,0.4);\">标题:</span><span style=\"color:#f8f8f2;\">" + (v328.title || "未知") + "</span>\n                        <span style=\"color:rgba(255,255,255,0.4);\">创作者:</span><span style=\"color:#f8f8f2;\">" + (v328.creator || "未知") + "</span>\n                        <span style=\"color:rgba(255,255,255,0.4);\">URL:</span><span style=\"color:#f1fa8c;font-size:11px;word-break:break-all;\">" + (v328.url || "未知") + "</span>\n                        <span style=\"color:rgba(255,255,255,0.4);\">页面类型:</span><span style=\"color:rgba(255,255,255,0.4);\">其他</span>\n                    </div>\n                ";
        return;
      }
      if (v329) {
        v327.innerHTML = "\n                    <div style=\"color:#8be9fd;font-weight:600;margin-bottom:8px;\">📋 个人信息</div>\n                    <div style=\"display:grid;grid-template-columns:70px 1fr;gap:4px 12px;\">\n                        <span style=\"color:rgba(255,255,255,0.4);\">标题:</span><span style=\"color:#f8f8f2;\">" + (v328.title || "未知") + "</span>\n                        <span style=\"color:rgba(255,255,255,0.4);\">个人ID:</span><span style=\"color:#f1fa8c;\">" + (v328.userId || "未识别") + "</span>\n                        <span style=\"color:rgba(255,255,255,0.4);\">名称:</span><span style=\"color:#f8f8f2;\">" + (v328.userName || "未知用户") + "</span>\n                    </div>\n                ";
        return;
      }
      let v331 = "\n                <div style=\"color:#8be9fd;font-weight:600;margin-bottom:8px;\">📋 当前作品信息</div>\n                <div style=\"display:grid;grid-template-columns:80px 1fr;gap:4px 12px;\">\n                    <span style=\"color:rgba(255,255,255,0.4);\">标题:</span><span style=\"color:#f8f8f2;\">" + (v328.title || "未知") + "</span>\n                    <span style=\"color:rgba(255,255,255,0.4);\">项目ID:</span><span style=\"color:#f1fa8c;\">" + (v328.projectId || "未识别") + "</span>\n                    <span style=\"color:rgba(255,255,255,0.4);\">创作者:</span><span style=\"color:#f8f8f2;\">" + (v328.creator || "未知") + "</span>\n                    <span style=\"color:rgba(255,255,255,0.4);\">VM状态:</span><span style=\"color:#50fa7b;\">" + (v328.vmInfo ? "✅ 已就绪" : "❌ 未就绪") + "</span>\n                    <span style=\"color:rgba(255,255,255,0.4);\">自定义扩展:</span><span style=\"color:#ffb86c;\">" + v328.customExtensions.length + "</span>\n                    <span style=\"color:rgba(255,255,255,0.4);\">官方扩展:</span><span style=\"color:#8be9fd;\">" + v328.internalExtensions.length + "</span>\n                    <span style=\"color:rgba(255,255,255,0.4);\">CCWData:</span><span style=\"color:" + (v328.hasCCWData ? "#50fa7b" : "rgba(255,255,255,0.4)") + ";\">" + (v328.hasCCWData ? "✅ 已加载" : "❌ 未加载") + "</span>\n                    <span style=\"color:rgba(255,255,255,0.4);\">经济合约:</span><span style=\"color:" + (v328.hasGandiEconomy ? "#f1fa8c" : "rgba(255,255,255,0.4)") + ";\">" + (v328.hasGandiEconomy ? "✅ 已加载" : "❌ 未加载") + "</span>\n                    <span style=\"color:rgba(255,255,255,0.4);\">成就/排行:</span><span style=\"color:" + (v328.hasGandiAchievement ? "#50fa7b" : "rgba(255,255,255,0.4)") + ";\">" + (v328.hasGandiAchievement ? "✅ 已加载" : "❌ 未加载") + "</span>\n                    " + (v328.hasMaliciousPatterns ? "<span style=\"color:#ff5555;\">⚠️ 检测到可疑模式</span>" : "") + "\n                </div>\n            ";
      if (v328.customExtensions.length > 0) {
        v331 += "<div style=\"margin-top:12px;color:#ffb86c;font-weight:600;\">🔌 自定义扩展详情</div><div style=\"margin-top:4px;font-size:12px;\">";
        v328.customExtensions.forEach(p147 => {
          const v332 = p147.isLoaded ? "✅ 已加载" : "⏳ 未加载";
          const v333 = p147.modified ? "✏️ 已修改" : "";
          v331 += "\n                        <div class=\"csrt-list-item\" style=\"display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);\">\n                            <span style=\"color:#f8f8f2;\">" + p147.name + "</span>\n                            <span style=\"color:rgba(255,255,255,0.4);font-size:11px;\">" + v332 + " " + v333 + " | " + p147.source + "</span>\n                        </div>\n                    ";
        });
        v331 += "</div>";
      }
      if (v328.internalExtensions.length > 0) {
        v331 += "\n                    <div style=\"margin-top:8px;color:#8be9fd;font-weight:600;\">📦 官方/内部扩展</div>\n                    <div style=\"margin-top:4px;font-size:11px;color:rgba(255,255,255,0.4);\">" + v328.internalExtensions.join(", ") + "</div>\n                ";
      }
      if (v328.warnings.length > 0) {
        v331 += "\n                    <div style=\"margin-top:12px;color:#ff5555;font-weight:600;\">🚨 安全警告</div>\n                    <div style=\"margin-top:4px;font-size:12px;\">" + v328.warnings.map(p148 => "<div style=\"padding:4px 0;color:#ffb86c;\">• " + p148 + "</div>").join("") + "</div>\n                ";
      }
      v327.innerHTML = v331;
    }
    v326.onclick = f67;
    // TOLOOK
    setTimeout(f67, 500);
    v325.appendChild(v326);
    v325.appendChild(v327);
    const v334 = document.createElement("div");
    v334.style.cssText = "margin-top:12px;padding:12px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.05);";
    const v335 = document.createElement("div");
    v335.style.cssText = "color:#8be9fd;font-weight:600;font-size:13px;margin-bottom:8px;";
    v335.textContent = "✏️ 修改浏览器标题";
    const v336 = document.createElement("div");
    v336.style.cssText = "display:flex;gap:8px;align-items:center;flex-wrap:wrap;";
    const v337 = document.createElement("input");
    v337.className = "csrt-input";
    v337.placeholder = "输入新标题...";
    v337.value = document.title;
    const v338 = document.createElement("button");
    v338.textContent = "应用";
    v338.className = "csrt-glass-btn primary";
    v338.onclick = function () {
      const vF49 = f49(v337.value);
      if (vF49.success) {
        v337.value = vF49.title;
        f23("✅ 标题已更新");
      } else {
        alert(vF49.error);
      }
    };
    const v339 = document.createElement("button");
    v339.textContent = "↩️ 恢复";
    v339.className = "csrt-glass-btn";
    v339.onclick = function () {
      const vF50 = f50();
      v337.value = vF50.title;
      f23("✅ 已恢复原始标题");
    };
    v336.appendChild(v337);
    v336.appendChild(v338);
    v336.appendChild(v339);
    v334.appendChild(v335);
    v334.appendChild(v336);
    v325.appendChild(v334);
    return v325;
  }
  function f68() {
    const v340 = document.createElement("div");
    v340.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    const v341 = document.createElement("button");
    v341.textContent = "🔍 扫描扩展";
    v341.className = "csrt-glass-btn primary";
    v341.style.alignSelf = "flex-start";
    const v342 = document.createElement("div");
    v342.style.cssText = "\n            background:rgba(255,255,255,0.03); border-radius:12px; padding:16px;\n            font-size:13px; line-height:1.8; font-family:'Courier New',monospace;\n            max-height:400px; overflow-y:auto;\n        ";
    v342.className = "csrt-scroll";
    v342.id = "srt-scan-result";
    v342.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);\">点击\"扫描扩展\"开始分析...</div>";
    v341.onclick = function () {
      f34(true).then(p149 => {
        let v343 = "\n                    <div style=\"color:#8be9fd;font-weight:600;margin-bottom:8px;\">🔍 扩展扫描结果</div>\n                    <div style=\"color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:8px;\">\n                        自定义: " + p149.customExtensions.length + " | 官方: " + p149.internalExtensions.length + "\n                        " + (p149.hasMaliciousPatterns ? " | ⚠️ 检测到可疑模式" : "") + "\n                    </div>\n                ";
        if (p149.customExtensions.length === 0) {
          v343 += "<div style=\"color:#50fa7b;\">✅ 未发现自定义扩展</div>";
        } else {
          p149.customExtensions.forEach((p150, p151) => {
            const v344 = p150.isLoaded ? "✅ 已加载" : "⏳ 未加载";
            const v345 = p150.modified ? "✏️ 已修改" : "";
            v343 += "\n                            <div style=\"background:rgba(255,255,255,0.03);border-radius:8px;padding:8px;margin-bottom:8px;border-left:3px solid " + (p150.isLoaded ? "#50fa7b" : "#ffb86c") + ";\">\n                                <div style=\"display:flex;justify-content:space-between;align-items:center;\">\n                                    <span style=\"color:#f8f8f2;font-weight:600;\">" + (p151 + 1) + ". " + p150.name + "</span>\n                                    <span style=\"color:rgba(255,255,255,0.4);font-size:11px;\">" + v344 + " " + v345 + "</span>\n                                </div>\n                                <div style=\"color:rgba(255,255,255,0.4);font-size:11px;word-break:break-all;margin-top:4px;\">\n                                    URL: " + (p150.url || "未知") + "\n                                    <br>来源: " + p150.source + "\n                                </div>\n                                <div style=\"margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;\">\n                                    <button class=\"srt-inspect-ext csrt-glass-btn info\" data-name=\"" + p150.name + "\" style=\"padding:2px 12px;font-size:11px;\">🔎 检查代码</button>\n                                    <button class=\"srt-modify-ext csrt-glass-btn warning\" data-name=\"" + p150.name + "\" style=\"padding:2px 12px;font-size:11px;\">✏️ 修改代码</button>\n                                </div>\n                            </div>\n                        ";
          });
        }
        v342.innerHTML = v343;
        v342.querySelectorAll(".srt-inspect-ext").forEach(p152 => {
          p152.onclick = function () {
            f69(this.dataset.name);
          };
        });
        v342.querySelectorAll(".srt-modify-ext").forEach(p153 => {
          p153.onclick = function () {
            f70(this.dataset.name);
          };
        });
      }).catch(p154 => {
        v342.innerHTML = "<div style=\"color:#ff5555;\">❌ 扫描失败: " + p154.message + "</div>";
      });
    };
    v340.appendChild(v341);
    v340.appendChild(v342);
    return v340;
  }
  async function f69(p155) {
    const v346 = await f36(p155);
    if (!v346) {
      alert("无法获取扩展 \"" + p155 + "\" 的代码");
      return;
    }
    const v347 = document.createElement("div");
    v347.style.cssText = "\n            position:fixed; top:0; left:0; right:0; bottom:0;\n            background:rgba(0,0,0,0.8); z-index:1000003;\n            display:flex; align-items:center; justify-content:center;\n            backdrop-filter:blur(8px);\n        ";
    const v348 = document.createElement("div");
    v348.style.cssText = "\n            background:rgba(16,18,27,0.85); backdrop-filter:blur(24px);\n            border-radius:20px; padding:24px; width:85%; max-width:800px;\n            max-height:85vh; border:1px solid rgba(139,233,253,0.2);\n            box-shadow:0 20px 60px rgba(0,0,0,0.6);\n            color:#eee; display:flex; flex-direction:column; overflow:hidden;\n        ";
    const v349 = document.createElement("div");
    v349.style.cssText = "\n            display:flex; justify-content:space-between; align-items:center;\n            padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06);\n            flex-shrink:0;\n        ";
    const v350 = document.createElement("span");
    v350.style.cssText = "font-size:18px;font-weight:600;color:#8be9fd;";
    v350.textContent = "🔎 扩展代码: " + p155;
    v349.appendChild(v350);
    const v351 = document.createElement("button");
    v351.textContent = "✕";
    v351.style.cssText = "\n            background:none; border:none; color:rgba(255,255,255,0.4);\n            font-size:22px; cursor:pointer; padding:0 8px; border-radius:8px;\n            transition:all 0.2s;\n        ";
    v351.onmouseover = () => v351.style.color = "#fff";
    v351.onmouseout = () => v351.style.color = "rgba(255,255,255,0.4)";
    v351.onclick = () => v347.remove();
    v349.appendChild(v351);
    v348.appendChild(v349);
    const v352 = document.createElement("div");
    v352.style.cssText = "\n            flex:1; margin:12px 0; background:rgba(0,0,0,0.4); border-radius:12px;\n            padding:12px; overflow-y:auto; font-family:'Courier New',monospace;\n            font-size:12px; line-height:1.6; color:#f8f8f2; white-space:pre-wrap;\n            word-break:break-all; max-height:500px; border:1px solid rgba(255,255,255,0.05);\n        ";
    v352.className = "csrt-scroll";
    v352.textContent = v346;
    v348.appendChild(v352);
    const v353 = document.createElement("div");
    v353.style.cssText = "display:flex; gap:12px; justify-content:flex-end; flex-shrink:0; padding-top:8px;";
    const v354 = document.createElement("button");
    v354.textContent = "关闭";
    v354.className = "csrt-glass-btn";
    v354.onclick = () => v347.remove();
    v353.appendChild(v354);
    v348.appendChild(v353);
    v347.appendChild(v348);
    document.body.appendChild(v347);
  }
  async function f70(p156) {
    const v355 = await f36(p156);
    if (!v355) {
      alert("无法获取扩展 \"" + p156 + "\" 的代码");
      return;
    }
    const v356 = document.createElement("div");
    v356.style.cssText = "\n            position:fixed; top:0; left:0; right:0; bottom:0;\n            background:rgba(0,0,0,0.8); z-index:1000003;\n            display:flex; align-items:center; justify-content:center;\n            backdrop-filter:blur(8px);\n        ";
    const v357 = document.createElement("div");
    v357.style.cssText = "\n            background:rgba(16,18,27,0.85); backdrop-filter:blur(24px);\n            border-radius:20px; padding:24px; width:85%; max-width:800px;\n            max-height:85vh; border:1px solid rgba(255,184,108,0.2);\n            box-shadow:0 20px 60px rgba(0,0,0,0.6);\n            color:#eee; display:flex; flex-direction:column; overflow:hidden;\n        ";
    const v358 = document.createElement("div");
    v358.style.cssText = "\n            display:flex; justify-content:space-between; align-items:center;\n            padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06);\n            flex-shrink:0;\n        ";
    const v359 = document.createElement("span");
    v359.style.cssText = "font-size:18px;font-weight:600;color:#ffb86c;";
    v359.textContent = "✏️ 编辑扩展: " + p156;
    v358.appendChild(v359);
    const v360 = document.createElement("button");
    v360.textContent = "✕";
    v360.style.cssText = "\n            background:none; border:none; color:rgba(255,255,255,0.4);\n            font-size:22px; cursor:pointer; padding:0 8px; border-radius:8px;\n            transition:all 0.2s;\n        ";
    v360.onmouseover = () => v360.style.color = "#fff";
    v360.onmouseout = () => v360.style.color = "rgba(255,255,255,0.4)";
    v360.onclick = () => v356.remove();
    v358.appendChild(v360);
    v357.appendChild(v358);
    const v361 = document.createElement("textarea");
    v361.style.cssText = "\n            width:100%; height:400px; margin:12px 0;\n            background:rgba(0,0,0,0.4); color:#f8f8f2;\n            border:1px solid rgba(255,255,255,0.06); border-radius:12px;\n            padding:12px; font-family:'Courier New',monospace; font-size:12px;\n            resize:vertical; box-sizing:border-box; tab-size:2; line-height:1.6;\n        ";
    v361.value = v355;
    v357.appendChild(v361);
    const v362 = document.createElement("div");
    v362.style.cssText = "display:flex; gap:12px; justify-content:flex-end; flex-shrink:0; padding-top:8px;";
    const v363 = document.createElement("button");
    v363.textContent = "取消";
    v363.className = "csrt-glass-btn";
    v363.onclick = () => v356.remove();
    const v364 = document.createElement("button");
    v364.textContent = "💾 保存修改";
    v364.className = "csrt-glass-btn primary";
    v364.onclick = function () {
      const v365 = v361.value;
      f34(true).then(p157 => {
        const v366 = p157.customExtensions.find(p158 => p158.name === p156);
        if (v366) {
          v366.modifiedCode = v365;
          v366.modified = true;
        }
        f53(p156, v365).then(p159 => {
          if (p159.success) {
            f23("✅ 扩展 \"" + p156 + "\" 已修改");
          } else {
            f23("⚠️ 修改已保存，但应用失败: " + p159.error);
          }
        }).catch(p160 => f23("⚠️ 保存成功，但应用失败: " + p160.message));
        v356.remove();
      });
    };
    v362.appendChild(v363);
    v362.appendChild(v364);
    v357.appendChild(v362);
    v356.appendChild(v357);
    document.body.appendChild(v356);
    // TOLOOK
    setTimeout(() => v361.focus(), 100);
  }
  function f71() {
    const v367 = document.createElement("div");
    v367.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    const v368 = document.createElement("div");
    v368.style.cssText = "color:#8be9fd;font-weight:600;font-size:16px;margin-bottom:4px;";
    v368.textContent = "🔧 附加功能";
    v367.appendChild(v368);
    const v369 = document.createElement("div");
    v369.style.cssText = "color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:8px;";
    v369.textContent = "开启/关闭附加功能，设置自动保存";
    v367.appendChild(v369);
    function f72(p161, p162, p163, p164) {
      const v370 = document.createElement("div");
      v370.style.cssText = "\n                display:flex; justify-content:space-between; align-items:center;\n                padding:10px 12px; background:rgba(255,255,255,0.03);\n                border-radius:8px; border-left:3px solid " + (p163 ? "#50fa7b" : "rgba(255,255,255,0.2)") + ";\n            ";
      const v371 = document.createElement("div");
      v371.style.cssText = "display:flex;flex-direction:column;gap:2px;";
      const v372 = document.createElement("span");
      v372.style.cssText = "color:#f8f8f2;font-size:14px;font-weight:500;";
      v372.textContent = p161;
      const v373 = document.createElement("span");
      v373.style.cssText = "color:rgba(255,255,255,0.4);font-size:11px;";
      v373.textContent = p162;
      v371.appendChild(v372);
      v371.appendChild(v373);
      const v374 = document.createElement("button");
      v374.textContent = p163 ? "🟢 已开启" : "⚪ 已关闭";
      v374.className = p163 ? "csrt-toggle on" : "csrt-toggle";
      v374.onclick = function () {
        const v375 = !p163;
        p163 = v375;
        this.textContent = v375 ? "🟢 已开启" : "⚪ 已关闭";
        this.className = v375 ? "csrt-toggle on" : "csrt-toggle";
        v370.style.borderLeftColor = v375 ? "#50fa7b" : "rgba(255,255,255,0.2)";
        p164(v375);
      };
      v370.appendChild(v371);
      v370.appendChild(v374);
      return v370;
    }
    v367.appendChild(f72("🚫 无视黑名单", "绕过黑名单检测，显示为未屏蔽状态", vVO3.bypassBlacklist, p165 => {
      vVO3.bypassBlacklist = p165;
      f3();
      f23("无视黑名单: " + (p165 ? "已开启" : "已关闭"));
      if (p165 && confirm("此功能需要刷新页面才能生效，是否立即刷新？")) {
        location.reload();
      }
    }));
    v367.appendChild(f72("🔇 屏蔽协作记录", "屏蔽协作中的修改、进入、退出通知", vVO3.blockCollaboration, p166 => {
      vVO3.blockCollaboration = p166;
      f3();
      f23("屏蔽协作记录: " + (p166 ? "已开启" : "已关闭"));
      if (p166 && confirm("此功能需要刷新页面才能生效，是否立即刷新？")) {
        location.reload();
      }
    }));
    v367.appendChild(f72("📊 性能监控", "实时显示网络延迟、FPS、请求数", vVO3.performanceMonitor, p167 => {
      f65(p167);
    }));
    v367.appendChild(f72("📱 伪装手机号", "伪装认证等级、手机号、信誉、QQ", vVO3.fakePhone, p168 => {
      vVO3.fakePhone = p168;
      f3();
      f23("伪装手机号: " + (p168 ? "已开启" : "已关闭"));
      if (p168 && confirm("此功能需要刷新页面才能生效，是否立即刷新？")) {
        location.reload();
      }
    }));
    const v376 = document.createElement("div");
    v376.className = "csrt-divider";
    v367.appendChild(v376);
    const vGM_getValue6 = GM_getValue("csrt_fake_identity");
    const v377 = document.createElement("div");
    v377.style.cssText = "\n            display:flex; flex-direction:column; gap:6px; padding:10px 12px;\n            background:rgba(255,255,255,0.03); border-radius:8px;\n            border-left:3px solid " + (vGM_getValue6 ? "#50fa7b" : "rgba(255,255,255,0.2)") + ";\n        ";
    const v378 = document.createElement("div");
    v378.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    const v379 = document.createElement("div");
    v379.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    const v380 = document.createElement("span");
    v380.style.cssText = "color:#f8f8f2;font-size:14px;font-weight:500;";
    v380.textContent = "🎭 伪装身份";
    const v381 = document.createElement("span");
    v381.style.cssText = "color:rgba(255,255,255,0.4);font-size:11px;";
    v381.textContent = vGM_getValue6 ? "当前伪装: " + (vGM_getValue6.name || vGM_getValue6.id) : "未开启伪装";
    v379.appendChild(v380);
    v379.appendChild(v381);
    const v382 = document.createElement("div");
    v382.style.cssText = "display:flex;gap:8px;";
    const v383 = document.createElement("button");
    v383.textContent = vGM_getValue6 ? "🔄 修改" : "📝 设置";
    v383.className = "csrt-glass-btn info";
    v383.onclick = f44;
    const v384 = document.createElement("button");
    v384.textContent = "🗑️ 清除";
    v384.className = "csrt-glass-btn danger";
    v384.onclick = function () {
      if (confirm("确定要清除伪装身份吗？")) {
        GM_deleteValue("csrt_fake_identity");
        f23("✅ 已清除，刷新页面生效。");
        location.reload();
      }
    };
    v382.appendChild(v383);
    if (vGM_getValue6) {
      v382.appendChild(v384);
    }
    v378.appendChild(v379);
    v378.appendChild(v382);
    v377.appendChild(v378);
    v367.appendChild(v377);
    const v385 = GM_getValue("__csrt_replacer_meta") !== undefined;
    const v386 = document.createElement("div");
    v386.style.cssText = "\n            display:flex; flex-direction:column; gap:6px; padding:10px 12px;\n            background:rgba(255,255,255,0.03); border-radius:8px;\n            border-left:3px solid " + (v385 ? "#50fa7b" : "rgba(255,255,255,0.2)") + ";\n        ";
    const v387 = document.createElement("div");
    v387.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    const v388 = document.createElement("div");
    v388.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    const v389 = document.createElement("span");
    v389.style.cssText = "color:#f8f8f2;font-size:14px;font-weight:500;";
    v389.textContent = "📦 作品替换器";
    const v390 = document.createElement("span");
    v390.style.cssText = "color:rgba(255,255,255,0.4);font-size:11px;";
    v390.textContent = v385 ? "✅ 已替换，刷新页面生效" : "访问他人作品时替换为本地文件";
    v388.appendChild(v389);
    v388.appendChild(v390);
    const v391 = document.createElement("div");
    v391.style.cssText = "display:flex;gap:8px;";
    const v392 = document.createElement("button");
    v392.textContent = v385 ? "🗑️ 清除替换" : "📂 选择文件";
    v392.className = v385 ? "csrt-glass-btn danger" : "csrt-glass-btn success";
    v392.onclick = async function () {
      if (v385) {
        if (confirm("确定要清除替换文件吗？")) {
          if (f39()) {
            f23("✅ 已清除，刷新页面生效。");
            location.reload();
          }
        }
        return;
      }
      const v393 = await f15(".sb3,.sb2,.zip", "上传sb3文件");
      if (!v393) {
        return;
      }
      try {
        await f38(v393);
        f23("✅ 作品替换文件已保存！刷新页面生效。");
        location.reload();
      } catch (e27) {
        alert("❌ 保存失败: " + e27.message);
      }
    };
    const v394 = document.createElement("button");
    v394.textContent = vVO3.replacerChangeVersion ? "🔄 作品回溯: 开" : "🔄 作品回溯: 关";
    v394.className = vVO3.replacerChangeVersion ? "csrt-toggle on" : "csrt-toggle";
    v394.onclick = function () {
      vVO3.replacerChangeVersion = !vVO3.replacerChangeVersion;
      this.textContent = vVO3.replacerChangeVersion ? "🔄 作品回溯: 开" : "🔄 作品回溯: 关";
      this.className = vVO3.replacerChangeVersion ? "csrt-toggle on" : "csrt-toggle";
      f3();
      f23("作品回溯: " + (vVO3.replacerChangeVersion ? "已开启" : "已关闭"));
    };
    v391.appendChild(v392);
    if (v385) {
      v391.appendChild(v394);
    }
    v387.appendChild(v388);
    v387.appendChild(v391);
    v386.appendChild(v387);
    v367.appendChild(v386);
    const v395 = document.createElement("div");
    v395.style.cssText = "\n            display:flex; flex-direction:column; gap:6px; padding:10px 12px;\n            background:rgba(255,255,255,0.03); border-radius:8px; border-left:3px solid #8be9fd;\n        ";
    const v396 = document.createElement("div");
    v396.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    const v397 = document.createElement("div");
    v397.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    const v398 = document.createElement("span");
    v398.style.cssText = "color:#f8f8f2;font-size:14px;font-weight:500;";
    v398.textContent = "🧩 角色插入器";
    const v399 = document.createElement("span");
    v399.style.cssText = "color:rgba(255,255,255,0.4);font-size:11px;";
    v399.textContent = "向当前作品插入本地角色文件 (.sprite3)";
    v397.appendChild(v398);
    v397.appendChild(v399);
    const v400 = document.createElement("button");
    v400.textContent = "📂 选择角色文件";
    v400.className = "csrt-glass-btn info";
    v400.onclick = async function () {
      try {
        const v401 = await f22();
        if (!v401) {
          alert("❌ 无法获取VM实例，请确保在作品页面使用");
          return;
        }
        const v402 = await f15(".sprite3,.sprite2,.zip", "上传角色文件");
        if (!v402) {
          return;
        }
        await v401.addSprite(await f12(v402));
        f23("✅ 角色插入成功！");
      } catch (e28) {
        alert("❌ 错误: " + e28.message);
      }
    };
    v396.appendChild(v397);
    v396.appendChild(v400);
    v395.appendChild(v396);
    v367.appendChild(v395);
    const v403 = document.createElement("div");
    v403.style.cssText = "\n            display:flex; flex-direction:column; gap:6px; padding:10px 12px;\n            background:rgba(255,255,255,0.03); border-radius:8px; border-left:3px solid #f1fa8c;\n        ";
    const v404 = document.createElement("div");
    v404.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    const v405 = document.createElement("div");
    v405.style.cssText = "display:flex;flex-direction:column;gap:2px;";
    const v406 = document.createElement("span");
    v406.style.cssText = "color:#f8f8f2;font-size:14px;font-weight:500;";
    v406.textContent = "📥 作品下载工具";
    const v407 = document.createElement("span");
    v407.style.cssText = "color:rgba(255,255,255,0.4);font-size:11px;";
    v407.textContent = "下载完整作品、角色或捕获历史";
    v405.appendChild(v406);
    v405.appendChild(v407);
    const v408 = document.createElement("div");
    v408.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;";
    const v409 = document.createElement("button");
    v409.textContent = "💾 下载作品(.sb3)";
    v409.className = "csrt-glass-btn primary";
    v409.onclick = f55;
    const v410 = document.createElement("button");
    v410.textContent = "🎨 下载所有角色";
    v410.className = "csrt-glass-btn info";
    v410.onclick = f56;
    const v411 = document.createElement("button");
    v411.textContent = "📂 捕获列表";
    v411.className = "csrt-glass-btn warning";
    v411.onclick = f57;
    v408.appendChild(v409);
    v408.appendChild(v410);
    v408.appendChild(v411);
    v404.appendChild(v405);
    v404.appendChild(v408);
    v403.appendChild(v404);
    v367.appendChild(v403);
    const v412 = document.createElement("div");
    v412.style.cssText = "\n            margin-top:8px; padding:8px 12px; background:rgba(255,255,255,0.03);\n            border-radius:6px; font-size:11px; color:rgba(255,255,255,0.4);\n        ";
    v412.textContent = "💡 设置保存在本地 | 部分功能需要刷新页面生效 | 油猴菜单也可操作";
    v367.appendChild(v412);
    return v367;
  }
  let v413 = null;
  let vA17 = [];
  let vA18 = [];
  let v414 = null;
  let vLN12 = 1;
  let v415 = false;
  let v416 = null;
  function f73() {
    const v417 = document.getElementById("csrt-var-list");
    if (!v417) {
      return;
    }
    const v418 = document.getElementById("csrt-sprite-select");
    const v419 = document.getElementById("csrt-clone-input");
    const v420 = document.getElementById("csrt-clone-total");
    const v421 = document.getElementById("csrt-var-search");
    f22().then(p169 => {
      if (!p169) {
        v417.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 无法获取VM实例</div>";
        return;
      }
      const v422 = p169.runtime;
      if (!v422) {
        v417.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 无法获取Runtime</div>";
        return;
      }
      const v423 = v422.targets || [];
      vA18 = v423;
      const v424 = v423.find(p170 => p170.isStage);
      const v425 = v423.filter(p171 => !p171.isStage && p171.isOriginal);
      if (v418) {
        const v426 = v418.value;
        v418.innerHTML = "";
        const v427 = document.createElement("option");
        v427.value = "stage";
        v427.textContent = "🎭 舞台";
        v418.appendChild(v427);
        v425.forEach(p172 => {
          const v428 = document.createElement("option");
          v428.value = p172.id;
          v428.textContent = p172.sprite?.name || "未知角色";
          v418.appendChild(v428);
        });
        if (v426 && v418.querySelector("option[value=\"" + v426 + "\"]")) {
          v418.value = v426;
        }
      }
      let v429 = v418 ? v418.value : "stage";
      let v430 = v423.find(p173 => p173.id === v429 || v429 === "stage" && p173.isStage);
      if (!v430) {
        v430 = v424;
        if (v418) {
          v418.value = "stage";
        }
      }
      const v431 = v423.filter(p174 => p174.sprite?.name === v430?.sprite?.name);
      if (v420) {
        v420.textContent = "/ " + (v431.length || 1);
      }
      let v432 = v419 ? parseInt(v419.value) || 1 : 1;
      v432 = Math.max(1, Math.min(v432, v431.length || 1));
      if (v419) {
        v419.value = v432;
      }
      if (v431.length > 0) {
        v430 = v431[v432 - 1] || v431[0];
      }
      const v433 = v430?.variables || {};
      const v434 = Object.keys(v433);
      const vA19 = [];
      for (const v435 of v434) {
        const v436 = v433[v435];
        const v437 = v436.isCloud || false;
        const v438 = v436.type === "list" || Array.isArray(v436.value);
        let v439 = v436.value;
        if (v438) {
          try {
            v439 = Array.isArray(v439) ? JSON.stringify(v439) : v439;
          } catch (e29) {
            v439 = String(v439);
          }
        }
        const vO44 = {
          id: v435,
          name: v436.name || v435,
          value: v439,
          isCloud: v437,
          isList: v438,
          frozen: v436._csrt_frozen || false
        };
        vA19.push(vO44);
      }
      vA17 = vA19;
      v414 = v429;
      const v440 = v421?.value || "";
      f74(v440);
      if (!v417._eventsBound) {
        v417._eventsBound = true;
        v417.addEventListener("change", function (p175) {
          const v441 = p175.target.closest("input[data-varid]");
          if (!v441) {
            return;
          }
          const v442 = v441.dataset.varid;
          const v443 = vA17.find(p176 => p176.id === v442);
          if (!v443) {
            return;
          }
          let v444 = v441.value;
          if (v443.isList) {
            try {
              v444 = JSON.parse(v444);
            } catch (e30) {
              try {
                v444 = v444.split(",").map(p177 => p177.trim());
              } catch (e31) {
                v444 = [];
              }
            }
          }
          f75(v442, v444);
          f23("✅ 已更新: " + v443.name);
        });
        v417.addEventListener("click", function (p178) {
          const v445 = p178.target.closest("button[data-varid]");
          if (!v445) {
            return;
          }
          const v446 = v445.dataset.varid;
          const v447 = vA17.find(p179 => p179.id === v446);
          if (!v447) {
            return;
          }
          const v448 = v445.dataset.frozen === "true";
          const v449 = !v448;
          v445.dataset.frozen = String(v449);
          v445.textContent = v449 ? "🔓" : "🔒";
          v447.frozen = v449;
          f76(v446, v449);
          f23((v449 ? "🔒 已锁定" : "🔓 已解锁") + ": " + v447.name);
        });
      }
    }).catch(p180 => {
      v417.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载失败: " + p180.message + "</div>";
    });
  }
  function f74(p181 = "") {
    const v450 = document.getElementById("csrt-var-list");
    if (!v450) {
      return;
    }
    const v451 = vA17.filter(p182 => p182.name.toLowerCase().includes(p181.toLowerCase()));
    if (v451.length === 0) {
      v450.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">无匹配变量</div>";
      return;
    }
    const vLN202 = 20;
    if (typeof v450._expanded === "undefined") {
      v450._expanded = false;
    }
    let vV451 = v451;
    let v452 = false;
    if (!v450._expanded && v451.length > vLN202) {
      vV451 = v451.slice(0, vLN202);
      v452 = true;
    }
    let vLSdivClasscsrtvargridC = "\n            <div class=\"csrt-var-grid csrt-var-grid-header\">\n                <span>变量名</span>\n                <span>值</span>\n                <span>操作</span>\n            </div>\n        ";
    vV451.forEach(p183 => {
      const v453 = p183.isCloud ? "cloud" : "";
      vLSdivClasscsrtvargridC += "\n                <div class=\"csrt-var-grid csrt-var-grid-item\">\n                    <span class=\"csrt-var-name " + v453 + "\" title=\"" + p183.name + "\">" + (p183.isCloud ? "☁️ " : "") + p183.name + (p183.isList ? " 📋" : "") + "</span>\n                    <input class=\"csrt-var-input\" type=\"text\" value=\"" + String(p183.value).replace(/"/g, "&quot;") + "\" data-varid=\"" + p183.id + "\">\n                    <button class=\"csrt-var-lock\" data-varid=\"" + p183.id + "\" data-frozen=\"" + (p183.frozen ? "true" : "false") + "\">" + (p183.frozen ? "🔓" : "🔒") + "</button>\n                </div>\n            ";
    });
    if (v452 || v450._expanded) {
      vLSdivClasscsrtvargridC += "\n                <div style=\"padding:6px 0;text-align:center;border-top:1px solid rgba(255,255,255,0.05);\">\n                    <button class=\"csrt-var-fold-btn\" id=\"csrt-var-fold-toggle\">" + (v450._expanded ? "🔼 收起" : "🔽 展开全部 (" + v451.length + ")") + "</button>\n                </div>\n            ";
    }
    v450.innerHTML = vLSdivClasscsrtvargridC;
    const v454 = document.getElementById("csrt-var-fold-toggle");
    if (v454) {
      v454.onclick = function () {
        v450._expanded = !v450._expanded;
        f74(p181);
      };
    }
  }
  function f75(p184, p185) {
    if (!v47) {
      return;
    }
    const v455 = v47.runtime?.targets || [];
    for (const v456 of v455) {
      if (v456.variables && v456.variables[p184]) {
        v456.variables[p184].value = p185;
        break;
      }
    }
  }
  function f76(p186, p187) {
    if (!v47) {
      return;
    }
    const v457 = v47.runtime?.targets || [];
    for (const v458 of v457) {
      if (v458.variables && v458.variables[p186]) {
        v458.variables[p186]._csrt_frozen = p187;
        break;
      }
    }
  }
  function f77() {
    f22().then(async p188 => {
      if (!p188) {
        return;
      }
      let v459 = null;
      if (p188.extensionManager) {
        const v460 = p188.extensionManager._loadedExtensions || {};
        if (v460.ccwdata) {
          v459 = v460.ccwdata;
        }
      }
      if (!v459) {
        if (p188.extensionManager?._gandiExternalExtensionServices?.ccwdata) {
          v459 = p188.extensionManager._gandiExternalExtensionServices.ccwdata;
        }
      }
      const v461 = document.getElementById("csrt-cloud-project");
      const v462 = document.getElementById("csrt-cloud-user");
      if (!v459) {
        if (v461) {
          v461.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">CCWData扩展未加载</div>";
        }
        if (v462) {
          v462.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">CCWData扩展未加载</div>";
        }
        return;
      }
      try {
        const v463 = (await v459._getAllProjectData?.()) || {};
        const v464 = Object.keys(v463);
        if (v461) {
          if (v464.length === 0) {
            v461.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">暂无作品云数据</div>";
          } else {
            let vLSdivClasscsrtvargridC2 = "\n                            <div class=\"csrt-var-grid csrt-var-grid-header\">\n                                <span>键名</span>\n                                <span>值</span>\n                                <span>操作</span>\n                            </div>\n                        ";
            v464.forEach(p189 => {
              const v465 = v463[p189];
              vLSdivClasscsrtvargridC2 += "\n                                <div class=\"csrt-var-grid csrt-var-grid-item\">\n                                    <span style=\"color:#f8f8f2;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\" title=\"" + p189 + "\">" + p189 + "</span>\n                                    <input class=\"csrt-var-input\" type=\"text\" value=\"" + String(v465).replace(/"/g, "&quot;") + "\" data-key=\"" + p189 + "\" data-type=\"project\">\n                                    <button class=\"csrt-var-lock\" data-key=\"" + p189 + "\" data-type=\"project\">✏️</button>\n                                </div>\n                            ";
            });
            v461.innerHTML = vLSdivClasscsrtvargridC2;
            v461.querySelectorAll("input[data-key]").forEach(p190 => {
              p190.onchange = function () {
                const v466 = this.dataset.key;
                const v467 = this.dataset.type;
                let v468 = this.value;
                try {
                  v468 = JSON.parse(v468);
                } catch (e32) {}
                if (v467 === "project") {
                  v459._setValueToProject?.(v466, v468);
                }
                f23("✅ 已更新云数据: " + v466);
              };
            });
            v461.querySelectorAll("button[data-key]").forEach(p191 => {
              p191.onclick = function () {
                const v469 = this.parentElement.querySelector("input");
                if (v469) {
                  v469.focus();
                  v469.select();
                }
              };
            });
          }
        }
        const v470 = (await v459._getAllUserData?.()) || {};
        const v471 = Object.keys(v470);
        if (v462) {
          if (v471.length === 0) {
            v462.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">暂无用户云数据</div>";
          } else {
            let vLSdivClasscsrtvargridC3 = "\n                            <div class=\"csrt-var-grid csrt-var-grid-header\">\n                                <span>键名</span>\n                                <span>值</span>\n                                <span>操作</span>\n                            </div>\n                        ";
            v471.forEach(p192 => {
              const v472 = v470[p192];
              vLSdivClasscsrtvargridC3 += "\n                                <div class=\"csrt-var-grid csrt-var-grid-item\">\n                                    <span style=\"color:#f8f8f2;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\" title=\"" + p192 + "\">" + p192 + "</span>\n                                    <input class=\"csrt-var-input\" type=\"text\" value=\"" + String(v472).replace(/"/g, "&quot;") + "\" data-key=\"" + p192 + "\" data-type=\"user\">\n                                    <button class=\"csrt-var-lock\" data-key=\"" + p192 + "\" data-type=\"user\">✏️</button>\n                                </div>\n                            ";
            });
            v462.innerHTML = vLSdivClasscsrtvargridC3;
            v462.querySelectorAll("input[data-key]").forEach(p193 => {
              p193.onchange = function () {
                const v473 = this.dataset.key;
                const v474 = this.dataset.type;
                let v475 = this.value;
                try {
                  v475 = JSON.parse(v475);
                } catch (e33) {}
                if (v474 === "user") {
                  v459._setValueToUser?.(v473, v475);
                }
                f23("✅ 已更新用户云数据: " + v473);
              };
            });
            v462.querySelectorAll("button[data-key]").forEach(p194 => {
              p194.onclick = function () {
                const v476 = this.parentElement.querySelector("input");
                if (v476) {
                  v476.focus();
                  v476.select();
                }
              };
            });
          }
        }
      } catch (e34) {
        vO2.addError("加载云数据失败: " + e34.message);
        if (v461) {
          v461.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载失败: " + e34.message + "</div>";
        }
        if (v462) {
          v462.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载失败: " + e34.message + "</div>";
        }
      }
    }).catch(p195 => {
      vO2.addError("获取VM失败: " + p195.message);
    });
  }
  function f78() {
    const v477 = document.getElementById("csrt-economy-content");
    if (!v477) {
      return;
    }
    f22().then(async p196 => {
      if (!p196) {
        v477.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 无法获取VM实例</div>";
        return;
      }
      let v478 = null;
      const vA20 = ["gandieconomy", "GandiEconomy", "gandi_economy"];
      if (p196.extensionManager) {
        const v479 = p196.extensionManager._loadedExtensions || {};
        for (const v480 of vA20) {
          if (v479[v480]) {
            v478 = v479[v480];
            break;
          }
        }
        if (!v478 && p196.extensionManager._gandiExternalExtensionServices) {
          for (const v481 of vA20) {
            if (p196.extensionManager._gandiExternalExtensionServices[v481]) {
              v478 = p196.extensionManager._gandiExternalExtensionServices[v481];
              break;
            }
          }
        }
      }
      if (!v478) {
        v477.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">经济合约扩展未加载</div>";
        return;
      }
      if (typeof v478.getSmartContractList !== "function") {
        v477.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 经济合约扩展API不完整</div>";
        return;
      }
      try {
        const v482 = (await v478.getSmartContractList?.()) || [];
        if (v482.length === 0) {
          v477.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">暂无经济合约</div>";
          return;
        }
        let vLSdivStylemaxheight300 = "<div style=\"max-height:300px;overflow-y:auto;\">";
        const vVO45 = {
          DUCK_MAKER: "鸭里奥制造",
          GENERAL: "通用",
          GENERAL_NO_SPLIT: "通用(无分成)"
        };
        for (const v483 of v482) {
          const v484 = (await v478.getSmartContractAccountByContractId?.(v483.id)) || 0;
          const v485 = v483.status === "ENABLED" ? "✅ 已启用" : "⛔ 已禁用";
          const v486 = vVO45[v483.type] || v483.type || "未知";
          vLSdivStylemaxheight300 += "\n                        <div style=\"background:rgba(255,255,255,0.03);border-radius:6px;padding:8px;margin-bottom:8px;border-left:3px solid " + (v483.status === "ENABLED" ? "#50fa7b" : "#ff5555") + ";\">\n                            <div style=\"display:flex;justify-content:space-between;align-items:center;\">\n                                <span style=\"color:#f8f8f2;font-weight:500;\">" + (v483.title || "未命名合约") + "</span>\n                                <span style=\"color:rgba(255,255,255,0.4);font-size:11px;\">" + v485 + "</span>\n                            </div>\n                            <div style=\"color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px;\">\n                                类型: " + v486 + " | 余额: " + v484 + " 金币\n                            </div>\n                            <div style=\"color:rgba(255,255,255,0.3);font-size:10px;margin-top:2px;word-break:break-all;\">\n                                ID: " + v483.id + "\n                            </div>\n                            <div style=\"margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;\">\n                                <button class=\"srt-view-contract csrt-glass-btn info\" data-id=\"" + v483.id + "\" style=\"padding:2px 10px;font-size:10px;\">📋 查看规则</button>\n                                <button class=\"srt-execute-contract csrt-glass-btn primary\" data-id=\"" + v483.id + "\" style=\"padding:2px 10px;font-size:10px;\">▶ 执行规则</button>\n                            </div>\n                        </div>\n                    ";
        }
        vLSdivStylemaxheight300 += "</div>";
        v477.innerHTML = vLSdivStylemaxheight300;
        v477.querySelectorAll(".srt-view-contract").forEach(p197 => {
          p197.onclick = function () {
            f79(this.dataset.id, v478);
          };
        });
        v477.querySelectorAll(".srt-execute-contract").forEach(p198 => {
          p198.onclick = function () {
            f80(this.dataset.id, v478);
          };
        });
      } catch (e35) {
        v477.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载失败: " + e35.message + "</div>";
        vO2.addError("加载经济合约失败: " + e35.message);
      }
    }).catch(p199 => {
      v477.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载失败: " + p199.message + "</div>";
    });
  }
  async function f79(p200, p201) {
    try {
      const v487 = await p201.getSmartContract?.(p200);
      if (!v487) {
        alert("无法获取合约详情");
        return;
      }
      const v488 = document.createElement("div");
      v488.style.cssText = "\n                position: fixed; top:0; left:0; right:0; bottom:0;\n                background: rgba(0,0,0,0.8); z-index:1000003;\n                display:flex; align-items:center; justify-content:center;\n                backdrop-filter:blur(8px);\n            ";
      const v489 = document.createElement("div");
      v489.style.cssText = "\n                background:rgba(16,18,27,0.85); backdrop-filter:blur(24px);\n                border-radius:20px; padding:24px;\n                width:85%; max-width:700px; max-height:85vh;\n                border:1px solid rgba(241,250,140,0.2);\n                box-shadow:0 20px 60px rgba(0,0,0,0.6);\n                color:#eee; display:flex; flex-direction:column; overflow:hidden;\n            ";
      const v490 = document.createElement("div");
      v490.style.cssText = "\n                display:flex; justify-content:space-between; align-items:center;\n                padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06);\n                flex-shrink:0;\n            ";
      const v491 = document.createElement("span");
      v491.style.cssText = "font-size:18px;font-weight:600;color:#f1fa8c;";
      v491.textContent = "📋 合约规则: " + (v487.title || "未命名");
      const v492 = document.createElement("button");
      v492.textContent = "✕";
      v492.style.cssText = "\n                background:none; border:none; color:rgba(255,255,255,0.4); font-size:22px;\n                cursor:pointer; padding:0 8px; border-radius:8px; transition:all 0.2s;\n            ";
      v492.onmouseover = () => v492.style.color = "#fff";
      v492.onmouseout = () => v492.style.color = "rgba(255,255,255,0.4)";
      v492.onclick = () => v488.remove();
      v490.appendChild(v491);
      v490.appendChild(v492);
      v489.appendChild(v490);
      let v493 = "\n                <div style=\"margin:12px 0;font-size:13px;line-height:1.8;overflow-y:auto;flex:1;\">\n                    <div style=\"color:rgba(255,255,255,0.4);font-size:12px;\">合约ID: " + v487.id + "</div>\n                    <div style=\"color:rgba(255,255,255,0.4);font-size:12px;\">类型: " + v487.type + "</div>\n                    <div style=\"color:rgba(255,255,255,0.4);font-size:12px;\">状态: " + (v487.status === "ENABLED" ? "✅ 已启用" : "⛔ 已禁用") + "</div>\n            ";
      if (v487.rules && v487.rules.length > 0) {
        v493 += "<div style=\"margin-top:12px;color:#f1fa8c;font-weight:500;\">📌 规则列表</div>";
        v487.rules.forEach((p202, p203) => {
          const v494 = p202.rule?.code || p202.code || "无代码";
          const v495 = p202.rule?.funSignature?.zh_cn || p202.funSignature?.zh_cn || "无描述";
          v493 += "\n                        <div style=\"background:rgba(255,255,255,0.03);border-radius:6px;padding:8px;margin-top:6px;border-left:2px solid #f1fa8c;\">\n                            <div style=\"color:#f8f8f2;font-weight:500;\">规则" + (p203 + 1) + ": " + (p202.rule?.title || p202.title || "未命名") + "</div>\n                            <div style=\"color:rgba(255,255,255,0.4);font-size:11px;\">" + v495 + "</div>\n                            <details style=\"margin-top:4px;\">\n                                <summary style=\"color:#8be9fd;cursor:pointer;font-size:11px;\">查看代码</summary>\n                                <pre style=\"background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;font-size:11px;font-family:monospace;color:#f8f8f2;white-space:pre-wrap;word-break:break-all;margin-top:4px;max-height:200px;overflow-y:auto;\">" + v494 + "</pre>\n                            </details>\n                        </div>\n                    ";
        });
      } else {
        v493 += "<div style=\"color:rgba(255,255,255,0.4);margin-top:12px;\">该合约暂无规则</div>";
      }
      v493 += "</div>";
      v489.insertAdjacentHTML("beforeend", v493);
      const v496 = document.createElement("div");
      v496.style.cssText = "\n                display:flex; gap:12px; justify-content:flex-end;\n                flex-shrink:0; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);\n            ";
      const v497 = document.createElement("button");
      v497.textContent = "关闭";
      v497.className = "csrt-glass-btn";
      v497.onclick = () => v488.remove();
      v496.appendChild(v497);
      v489.appendChild(v496);
      v488.appendChild(v489);
      document.body.appendChild(v488);
    } catch (e36) {
      alert("❌ 获取合约详情失败: " + e36.message);
    }
  }
  async function f80(p204, p205) {
    try {
      const v498 = await p205.getSmartContract?.(p204);
      if (!v498 || !v498.rules || v498.rules.length === 0) {
        alert("该合约没有可执行的规则");
        return;
      }
      const v499 = v498.rules.map((p206, p207) => p207 + 1 + ". " + (p206.rule?.title || p206.title || "未命名")).join("\n");
      const vPrompt7 = prompt("选择要执行的规则 (输入编号):\n" + v499);
      if (!vPrompt7) {
        return;
      }
      const v500 = parseInt(vPrompt7) - 1;
      if (isNaN(v500) || v500 < 0 || v500 >= v498.rules.length) {
        alert("无效的规则编号");
        return;
      }
      const v501 = v498.rules[v500];
      const v502 = v501.rule?.code || v501.code;
      const vO46 = {};
      if (v501.rule?.funSignature?.params) {
        for (const v503 of v501.rule.funSignature.params) {
          const vPrompt8 = prompt("请输入参数 \"" + v503 + "\" 的值:");
          if (vPrompt8 === null) {
            return;
          }
          vO46[v503] = isNaN(vPrompt8) ? vPrompt8 : Number(vPrompt8);
        }
      }
      const v504 = await p205.requestExecuteSmartContract?.(p204, v501.id || v501.rule?.id, v502, vO46);
      alert("✅ 执行完成\n结果: " + JSON.stringify(v504, null, 2));
    } catch (e37) {
      alert("❌ 执行失败: " + e37.message);
    }
  }
  let vA21 = [];
  function f81() {
    const v505 = document.getElementById("csrt-achievement-content");
    if (!v505) {
      return;
    }
    f22().then(async p208 => {
      if (!p208) {
        v505.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 无法获取VM实例</div>";
        return;
      }
      let v506 = null;
      const vA22 = ["gandiachievement", "GandiAchievement", "GandiAchievementAndLeaderboard", "gandi_achievement"];
      if (p208.extensionManager) {
        const v507 = p208.extensionManager._loadedExtensions || {};
        for (const v508 of vA22) {
          if (v507[v508]) {
            v506 = v507[v508];
            break;
          }
        }
        if (!v506 && p208.extensionManager._gandiExternalExtensionServices) {
          for (const v509 of vA22) {
            if (p208.extensionManager._gandiExternalExtensionServices[v509]) {
              v506 = p208.extensionManager._gandiExternalExtensionServices[v509];
              break;
            }
          }
        }
      }
      if (!v506) {
        v505.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">成就扩展未加载</div>";
        return;
      }
      const vF62 = f6(window.location.href);
      if (!vF62) {
        v505.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 无法获取作品ID</div>";
        return;
      }
      try {
        const v510 = (await v506.getAchievements?.(vF62)) || [];
        vA21 = v510;
        if (v510.length === 0) {
          v505.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">该作品暂无成就</div>";
          return;
        }
        let vLSdivStylemaxheight3002 = "<div style=\"max-height:300px;overflow-y:auto;\">";
        v510.forEach(p209 => {
          const v511 = p209.obtained ? "✅ 已获得" : "❌ 未获得";
          vLSdivStylemaxheight3002 += "\n                        <div style=\"background:rgba(255,255,255,0.03);border-radius:6px;padding:8px;margin-bottom:6px;border-left:3px solid " + (p209.obtained ? "#50fa7b" : "#ffb86c") + ";\" class=\"srt-ach-item\" data-title=\"" + (p209.title || "") + "\">\n                            <div style=\"display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;\">\n                                <span style=\"color:#f8f8f2;font-weight:500;\">" + (p209.title || "未命名成就") + "</span>\n                                <span style=\"color:rgba(255,255,255,0.4);font-size:11px;\">" + v511 + "</span>\n                            </div>\n                            " + (p209.description ? "<div style=\"color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px;\">" + p209.description + "</div>" : "") + "\n                            <div style=\"color:rgba(255,255,255,0.3);font-size:10px;margin-top:2px;word-break:break-all;\">ID: " + p209.oid + "</div>\n                            " + (p209.recordExt !== undefined ? "<div style=\"color:rgba(255,255,255,0.3);font-size:10px;margin-top:2px;\">额外数据: " + (p209.recordExt || "无") + "</div>" : "") + "\n                            <div style=\"margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;\">\n                                " + (!p209.obtained ? "<button class=\"srt-obtain-ach csrt-glass-btn success\" data-id=\"" + p209.oid + "\" style=\"padding:2px 10px;font-size:10px;\">🏆 获得</button>" : "") + "\n                                <button class=\"srt-modify-ach csrt-glass-btn warning\" data-id=\"" + p209.oid + "\" data-ext=\"" + (p209.recordExt || "") + "\" style=\"padding:2px 10px;font-size:10px;\">📝 修改额外数据</button>\n                            </div>\n                        </div>\n                    ";
        });
        vLSdivStylemaxheight3002 += "</div>";
        v505.innerHTML = vLSdivStylemaxheight3002;
        v505.querySelectorAll(".srt-obtain-ach").forEach(p210 => {
          p210.onclick = async function () {
            const v512 = this.dataset.id;
            try {
              await v506.obtainAchievement?.(v512);
              f23("✅ 已获得成就");
              f81();
            } catch (e38) {
              alert("❌ 获得成就失败: " + e38.message);
            }
          };
        });
        v505.querySelectorAll(".srt-modify-ach").forEach(p211 => {
          p211.onclick = function () {
            const v513 = this.dataset.id;
            const v514 = this.dataset.ext;
            const vPrompt9 = prompt("请输入新的额外数据:", v514);
            if (vPrompt9 !== null) {
              v506.updateAchievementExtra?.(v513, vPrompt9);
              f23("✅ 已更新成就额外数据");
              // TOLOOK
              setTimeout(f81, 500);
            }
          };
        });
      } catch (e39) {
        v505.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载成就失败: " + e39.message + "</div>";
        vO2.addError("加载成就失败: " + e39.message);
      }
    }).catch(p212 => {
      v505.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载失败: " + p212.message + "</div>";
    });
  }
  function f82(p213) {
    const v515 = document.getElementById("csrt-achievement-content");
    if (!v515) {
      return;
    }
    const v516 = v515.querySelectorAll(".srt-ach-item");
    let v517 = false;
    v516.forEach(p214 => {
      const v518 = p214.dataset.title?.toLowerCase() || "";
      if (v518.includes(p213.toLowerCase())) {
        p214.style.display = "block";
        v517 = true;
      } else {
        p214.style.display = "none";
      }
    });
    const v519 = v515.querySelector(".srt-ach-no-result");
    if (!v517) {
      if (!v519) {
        const v520 = document.createElement("div");
        v520.className = "srt-ach-no-result";
        v520.style.cssText = "color:rgba(255,255,255,0.4);padding:8px;text-align:center;";
        v520.textContent = "无匹配成就";
        v515.appendChild(v520);
      }
    } else if (v519) {
      v519.remove();
    }
  }
  let vA23 = [];
  function f83() {
    const v521 = document.getElementById("csrt-leaderboard-content");
    if (!v521) {
      return;
    }
    f22().then(async p215 => {
      if (!p215) {
        v521.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 无法获取VM实例</div>";
        return;
      }
      let v522 = null;
      const vA24 = ["gandiachievement", "GandiAchievement", "GandiAchievementAndLeaderboard", "gandi_achievement"];
      if (p215.extensionManager) {
        const v523 = p215.extensionManager._loadedExtensions || {};
        for (const v524 of vA24) {
          if (v523[v524]) {
            v522 = v523[v524];
            break;
          }
        }
        if (!v522 && p215.extensionManager._gandiExternalExtensionServices) {
          for (const v525 of vA24) {
            if (p215.extensionManager._gandiExternalExtensionServices[v525]) {
              v522 = p215.extensionManager._gandiExternalExtensionServices[v525];
              break;
            }
          }
        }
      }
      if (!v522) {
        v521.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">排行榜扩展未加载</div>";
        return;
      }
      const vF63 = f6(window.location.href);
      if (!vF63) {
        v521.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 无法获取作品ID</div>";
        return;
      }
      try {
        const v526 = (await v522.getLeaderboards?.(vF63)) || [];
        vA23 = v526;
        if (v526.length === 0) {
          v521.innerHTML = "<div style=\"color:rgba(255,255,255,0.4);padding:8px;\">该作品暂无排行榜</div>";
          return;
        }
        let vLSdivStylemaxheight3003 = "<div style=\"max-height:300px;overflow-y:auto;\">";
        for (const v527 of v526) {
          const v528 = v527.status === "ENABLED" ? "✅ 已启用" : "⛔ 已禁用";
          vLSdivStylemaxheight3003 += "\n                        <div style=\"background:rgba(255,255,255,0.03);border-radius:6px;padding:8px;margin-bottom:6px;border-left:3px solid #f1fa8c;\" class=\"srt-lb-item\" data-title=\"" + (v527.title || "") + "\">\n                            <div style=\"display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;\">\n                                <span style=\"color:#f8f8f2;font-weight:500;\">" + (v527.title || "未命名排行榜") + "</span>\n                                <span style=\"color:rgba(255,255,255,0.4);font-size:11px;\">" + v528 + "</span>\n                            </div>\n                            <div style=\"color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px;\">单位: " + (v527.scoreUnit || "分") + " | ID: " + v527.oid + "</div>\n                            <div style=\"margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;\">\n                                <button class=\"srt-view-lb csrt-glass-btn info\" data-id=\"" + v527.oid + "\" style=\"padding:2px 10px;font-size:10px;\">📊 查看排行</button>\n                                <button class=\"srt-modify-lb csrt-glass-btn warning\" data-id=\"" + v527.oid + "\" style=\"padding:2px 10px;font-size:10px;\">✏️ 修改分数</button>\n                            </div>\n                        </div>\n                    ";
        }
        vLSdivStylemaxheight3003 += "</div>";
        v521.innerHTML = vLSdivStylemaxheight3003;
        v521.querySelectorAll(".srt-view-lb").forEach(p216 => {
          p216.onclick = function () {
            f85(this.dataset.id, v522);
          };
        });
        v521.querySelectorAll(".srt-modify-lb").forEach(p217 => {
          p217.onclick = function () {
            f86(this.dataset.id, v522);
          };
        });
      } catch (e40) {
        v521.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载排行榜失败: " + e40.message + "</div>";
        vO2.addError("加载排行榜失败: " + e40.message);
      }
    }).catch(p218 => {
      v521.innerHTML = "<div style=\"color:#ff5555;padding:8px;\">❌ 加载失败: " + p218.message + "</div>";
    });
  }
  function f84(p219) {
    const v529 = document.getElementById("csrt-leaderboard-content");
    if (!v529) {
      return;
    }
    const v530 = v529.querySelectorAll(".srt-lb-item");
    let v531 = false;
    v530.forEach(p220 => {
      const v532 = p220.dataset.title?.toLowerCase() || "";
      if (v532.includes(p219.toLowerCase())) {
        p220.style.display = "block";
        v531 = true;
      } else {
        p220.style.display = "none";
      }
    });
    const v533 = v529.querySelector(".srt-lb-no-result");
    if (!v531) {
      if (!v533) {
        const v534 = document.createElement("div");
        v534.className = "srt-lb-no-result";
        v534.style.cssText = "color:rgba(255,255,255,0.4);padding:8px;text-align:center;";
        v534.textContent = "无匹配排行榜";
        v529.appendChild(v534);
      }
    } else if (v533) {
      v533.remove();
    }
  }
  async function f85(p221, p222) {
    try {
      const v535 = (await p222.getLeaderboardRecords?.(p221)) || [];
      if (!v535.length) {
        alert("该排行榜暂无记录");
        return;
      }
      const v536 = document.createElement("div");
      v536.style.cssText = "\n                position: fixed; top:0; left:0; right:0; bottom:0;\n                background: rgba(0,0,0,0.8); z-index:1000003;\n                display:flex; align-items:center; justify-content:center;\n                backdrop-filter:blur(8px);\n            ";
      const v537 = document.createElement("div");
      v537.style.cssText = "\n                background:rgba(16,18,27,0.85); backdrop-filter:blur(24px);\n                border-radius:20px; padding:24px;\n                width:85%; max-width:600px; max-height:80vh;\n                border:1px solid rgba(139,233,253,0.2);\n                box-shadow:0 20px 60px rgba(0,0,0,0.6);\n                color:#eee; display:flex; flex-direction:column; overflow:hidden;\n            ";
      const v538 = document.createElement("div");
      v538.style.cssText = "\n                display:flex; justify-content:space-between; align-items:center;\n                padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06);\n                flex-shrink:0;\n            ";
      const v539 = document.createElement("span");
      v539.style.cssText = "font-size:18px;font-weight:600;color:#8be9fd;";
      v539.textContent = "📊 排行榜记录";
      const v540 = document.createElement("button");
      v540.textContent = "✕";
      v540.style.cssText = "\n                background:none; border:none; color:rgba(255,255,255,0.4); font-size:22px;\n                cursor:pointer; padding:0 8px; border-radius:8px; transition:all 0.2s;\n            ";
      v540.onmouseover = () => v540.style.color = "#fff";
      v540.onmouseout = () => v540.style.color = "rgba(255,255,255,0.4)";
      v540.onclick = () => v536.remove();
      v538.appendChild(v539);
      v538.appendChild(v540);
      v537.appendChild(v538);
      let vLSdivStylemargin12px0f = "\n                <div style=\"margin:12px 0;font-size:13px;overflow-y:auto;flex:1;max-height:400px;\">\n                    <div style=\"display:grid;grid-template-columns:50px 1fr auto;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);font-size:11px;\">\n                        <span>排名</span>\n                        <span>用户</span>\n                        <span>分数</span>\n                    </div>\n            ";
      v535.forEach((p223, p224) => {
        const v541 = p223.ranking || p224 + 1;
        const v542 = p223.user?.nickname || p223.user?.name || "未知用户";
        const v543 = p223.score || 0;
        const v544 = p223.isCurrentUser || false;
        vLSdivStylemargin12px0f += "\n                    <div style=\"display:grid;grid-template-columns:50px 1fr auto;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);" + (v544 ? "background:rgba(241,250,140,0.1);" : "") + "\">\n                        <span style=\"color:" + (v544 ? "#f1fa8c" : "rgba(255,255,255,0.4)") + ";\">#" + v541 + "</span>\n                        <span style=\"color:" + (v544 ? "#f1fa8c" : "#f8f8f2") + ";\">" + v542 + (v544 ? " (你)" : "") + "</span>\n                        <span style=\"color:" + (v544 ? "#f1fa8c" : "#f8f8f2") + ";\">" + v543 + "</span>\n                    </div>\n                ";
      });
      vLSdivStylemargin12px0f += "</div>";
      v537.insertAdjacentHTML("beforeend", vLSdivStylemargin12px0f);
      const v545 = document.createElement("div");
      v545.style.cssText = "\n                display:flex; gap:12px; justify-content:flex-end;\n                flex-shrink:0; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);\n            ";
      const v546 = document.createElement("button");
      v546.textContent = "关闭";
      v546.className = "csrt-glass-btn";
      v546.onclick = () => v536.remove();
      v545.appendChild(v546);
      v537.appendChild(v545);
      v536.appendChild(v537);
      document.body.appendChild(v536);
    } catch (e41) {
      alert("❌ 获取排行榜记录失败: " + e41.message);
    }
  }
  async function f86(p225, p226) {
    try {
      const vPrompt10 = prompt("请输入新的分数:");
      if (vPrompt10 === null) {
        return;
      }
      const vParseFloat = parseFloat(vPrompt10);
      if (isNaN(vParseFloat)) {
        alert("❌ 请输入有效的数字");
        return;
      }
      const vPrompt11 = prompt("请输入额外数据 (可选):", "");
      await p226.insertLeaderboard?.(p225, vParseFloat, vPrompt11 || undefined);
      f23("✅ 分数已更新: " + vParseFloat);
      // TOLOOK
      setTimeout(f83, 500);
    } catch (e42) {
      alert("❌ 修改分数失败: " + e42.message);
    }
  }
  function f87() {
    const v547 = document.createElement("div");
    v547.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    let v548 = false;
    let v549 = false;
    let v550 = false;
    f22().then(p227 => {
      if (p227) {
        v548 = f31(p227);
        v549 = f32(p227);
        v550 = f33(p227);
        f88();
      }
    });
    function f88() {
      let v551 = "\n                <div style=\"color:#8be9fd;font-weight:600;font-size:16px;margin-bottom:4px;\">📝 数据修改</div>\n                <div style=\"color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:8px;\">\n                    变量管理 · 云数据 · 经济合约 · 成就 · 排行榜\n                </div>\n\n                <!-- 扩展状态 -->\n                <div style=\"background:rgba(255,255,255,0.03);border-radius:8px;padding:12px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.05);display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:12px;\">\n                    <div><span style=\"color:rgba(255,255,255,0.4);\">CCWData:</span> <span style=\"color:" + (v548 ? "#50fa7b" : "rgba(255,255,255,0.3)") + ";\">" + (v548 ? "✅ 已加载" : "❌ 未加载") + "</span></div>\n                    <div><span style=\"color:rgba(255,255,255,0.4);\">经济合约:</span> <span style=\"color:" + (v549 ? "#f1fa8c" : "rgba(255,255,255,0.3)") + ";\">" + (v549 ? "✅ 已加载" : "❌ 未加载") + "</span></div>\n                    <div><span style=\"color:rgba(255,255,255,0.4);\">成就/排行:</span> <span style=\"color:" + (v550 ? "#50fa7b" : "rgba(255,255,255,0.3)") + ";\">" + (v550 ? "✅ 已加载" : "❌ 未加载") + "</span></div>\n                </div>\n            ";
      v551 += "\n                <div class=\"csrt-section border-left-info\">\n                    <div class=\"csrt-section-title\">🎯 变量管理</div>\n                    <div style=\"display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;\">\n                        <select id=\"csrt-sprite-select\" class=\"csrt-select\" style=\"padding:4px 8px;font-size:12px;\">\n                            <option value=\"stage\">🎭 舞台</option>\n                        </select>\n                        <input type=\"number\" id=\"csrt-clone-input\" min=\"1\" value=\"1\" style=\"width:50px;padding:4px 8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:4px;color:#f8f8f2;font-size:12px;\">\n                        <span id=\"csrt-clone-total\" style=\"color:rgba(255,255,255,0.4);font-size:12px;\">/ 1</span>\n                        <input type=\"text\" id=\"csrt-var-search\" placeholder=\"🔍 搜索变量...\" class=\"csrt-input\" style=\"flex:1;min-width:100px;padding:4px 8px;font-size:12px;\">\n                        <button id=\"csrt-var-refresh\" class=\"csrt-glass-btn info\" style=\"padding:4px 12px;font-size:12px;\">🔄</button>\n                    </div>\n                    <div id=\"csrt-var-list\" style=\"max-height:300px;overflow-y:auto;font-size:12px;border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px;\">\n                        <div style=\"color:rgba(255,255,255,0.4);padding:8px;\">加载中...</div>\n                    </div>\n                </div>\n            ";
      if (v548) {
        v551 += "\n                    <div class=\"csrt-section border-left-warning\">\n                        <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">\n                            <div class=\"csrt-section-title\" style=\"color:#ffb86c;\">☁️ CCWData云数据管理</div>\n                            <span style=\"font-size:11px;color:#50fa7b;\">✅ 已检测到</span>\n                        </div>\n                        <div style=\"display:flex;gap:4px;margin-bottom:8px;\">\n                            <button class=\"csrt-cloud-tab active\" data-tab=\"project\" style=\"padding:4px 12px;font-size:11px;background:rgba(255,184,108,0.15);color:#ffb86c;border-color:rgba(255,184,108,0.2);border-radius:6px;cursor:pointer;\">📁 作品数据</button>\n                            <button class=\"csrt-cloud-tab\" data-tab=\"user\" style=\"padding:4px 12px;font-size:11px;background:transparent;color:rgba(255,255,255,0.5);border:1px solid transparent;border-radius:6px;cursor:pointer;\">👤 用户数据</button>\n                        </div>\n                        <div id=\"csrt-cloud-project\" style=\"font-size:12px;padding:4px 0;\">\n                            <div style=\"color:rgba(255,255,255,0.4);padding:8px;\">加载云数据...</div>\n                        </div>\n                        <div id=\"csrt-cloud-user\" style=\"font-size:12px;padding:4px 0;display:none;\">\n                            <div style=\"color:rgba(255,255,255,0.4);padding:8px;\">加载云数据...</div>\n                        </div>\n                    </div>\n                ";
      }
      if (v549) {
        v551 += "\n                    <div class=\"csrt-section border-left-gold\">\n                        <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">\n                            <div class=\"csrt-section-title\" style=\"color:#f1fa8c;\">💰 经济合约管理</div>\n                            <span style=\"font-size:11px;color:#50fa7b;\">✅ 已检测到</span>\n                        </div>\n                        <div id=\"csrt-economy-content\" style=\"font-size:12px;padding:4px 0;\">\n                            <div style=\"color:rgba(255,255,255,0.4);padding:8px;\">加载经济合约数据...</div>\n                        </div>\n                    </div>\n                ";
      }
      if (v550) {
        v551 += "\n                    <div class=\"csrt-section border-left-success\">\n                        <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">\n                            <div class=\"csrt-section-title\" style=\"color:#50fa7b;\">🏆 成就管理</div>\n                            <span style=\"font-size:11px;color:#50fa7b;\">✅ 已检测到</span>\n                        </div>\n                        <div style=\"display:flex;gap:6px;margin-bottom:8px;\">\n                            <input type=\"text\" id=\"csrt-ach-search\" placeholder=\"🔍 搜索成就...\" class=\"csrt-input\" style=\"flex:1;padding:4px 8px;font-size:12px;\">\n                            <button id=\"csrt-ach-refresh\" class=\"csrt-glass-btn info\" style=\"padding:4px 12px;font-size:12px;\">🔄</button>\n                        </div>\n                        <div id=\"csrt-achievement-content\" style=\"font-size:12px;padding:4px 0;max-height:300px;overflow-y:auto;\">\n                            <div style=\"color:rgba(255,255,255,0.4);padding:8px;\">加载成就数据...</div>\n                        </div>\n                    </div>\n\n                    <div class=\"csrt-section border-left-gold\">\n                        <div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">\n                            <div class=\"csrt-section-title\" style=\"color:#f1fa8c;\">📊 排行榜管理</div>\n                            <span style=\"font-size:11px;color:#50fa7b;\">✅ 已检测到</span>\n                        </div>\n                        <div style=\"display:flex;gap:6px;margin-bottom:8px;\">\n                            <input type=\"text\" id=\"csrt-lb-search\" placeholder=\"🔍 搜索排行榜...\" class=\"csrt-input\" style=\"flex:1;padding:4px 8px;font-size:12px;\">\n                            <button id=\"csrt-lb-refresh\" class=\"csrt-glass-btn info\" style=\"padding:4px 12px;font-size:12px;\">🔄</button>\n                        </div>\n                        <div id=\"csrt-leaderboard-content\" style=\"font-size:12px;padding:4px 0;max-height:300px;overflow-y:auto;\">\n                            <div style=\"color:rgba(255,255,255,0.4);padding:8px;\">加载排行榜数据...</div>\n                        </div>\n                    </div>\n                ";
      }
      v547.innerHTML = v551;
      // TOLOOK
      setTimeout(() => {
        const v552 = document.getElementById("csrt-var-refresh");
        if (v552) {
          v552.onclick = f73;
        }
        const v553 = document.getElementById("csrt-sprite-select");
        const v554 = document.getElementById("csrt-clone-input");
        if (v553) {
          v553.onchange = f73;
        }
        if (v554) {
          v554.onchange = f73;
        }
        const v555 = document.getElementById("csrt-var-search");
        if (v555) {
          v555.oninput = function () {
            f74(this.value);
          };
        }
        if (v548) {
          document.querySelectorAll(".csrt-cloud-tab").forEach(p228 => {
            p228.onclick = function () {
              const v556 = this.dataset.tab;
              document.querySelectorAll(".csrt-cloud-tab").forEach(p229 => {
                p229.className = "csrt-cloud-tab";
              });
              this.className = "csrt-cloud-tab active";
              const v557 = document.getElementById("csrt-cloud-project");
              const v558 = document.getElementById("csrt-cloud-user");
              if (v556 === "project") {
                v557.style.display = "block";
                v558.style.display = "none";
              } else {
                v557.style.display = "none";
                v558.style.display = "block";
              }
            };
          });
          f77();
        }
        if (v549) {
          f78();
        }
        if (v550) {
          f81();
          const v559 = document.getElementById("csrt-ach-search");
          if (v559) {
            v559.oninput = function () {
              f82(this.value);
            };
          }
          const v560 = document.getElementById("csrt-ach-refresh");
          if (v560) {
            v560.onclick = f81;
          }
          const v561 = document.getElementById("csrt-lb-search");
          if (v561) {
            v561.oninput = function () {
              f84(this.value);
            };
          }
          const v562 = document.getElementById("csrt-lb-refresh");
          if (v562) {
            v562.onclick = f83;
          }
          f83();
        }
        f73();
      }, 100);
    }
    v413 = v547;
    return v547;
  }
  function f89() {
    const v563 = document.createElement("div");
    v563.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    const v564 = document.createElement("div");
    v564.style.cssText = "display:flex;gap:8px;";
    const v565 = document.createElement("button");
    v565.textContent = "🔄 刷新日志";
    v565.className = "csrt-glass-btn primary";
    const v566 = document.createElement("button");
    v566.textContent = "🗑️ 清空日志";
    v566.className = "csrt-glass-btn danger";
    v564.appendChild(v565);
    v564.appendChild(v566);
    v563.appendChild(v564);
    const v567 = document.createElement("div");
    v567.style.cssText = "\n            background:rgba(0,0,0,0.3); border-radius:12px; padding:12px;\n            font-size:12px; font-family:'Courier New',monospace;\n            max-height:350px; overflow-y:auto; min-height:100px;\n        ";
    v567.className = "csrt-scroll";
    v567.id = "srt-log-content";
    function f90() {
      let vLS4 = "";
      const v568 = vO2.getErrors();
      if (v568.length === 0) {
        vLS4 = "<div style=\"color:rgba(255,255,255,0.4);\">📋 无错误日志</div>";
      } else {
        v568.slice(-50).forEach(p230 => {
          const v569 = new Date(p230.time).toLocaleTimeString();
          vLS4 += "<div style=\"color:#ff5555;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.03);\">\n                        <span style=\"color:rgba(255,255,255,0.4);\">[" + v569 + "]</span> ❌ " + p230.msg + "\n                    </div>";
        });
      }
      v567.innerHTML = vLS4;
      v567.scrollTop = v567.scrollHeight;
    }
    v565.onclick = f90;
    v566.onclick = () => {
      vO2.clear();
      f90();
      f23("✅ 日志已清空");
    };
    f90();
    v563.appendChild(v567);
    return v563;
  }
  function f91() {
    const v570 = document.createElement("div");
    v570.style.cssText = "display:flex;flex-direction:column;gap:12px;";
    const v571 = document.createElement("div");
    v571.style.cssText = "\n            background:rgba(255,181,0,0.08); border:1px solid rgba(255,181,0,0.15);\n            border-radius:8px; padding:8px 12px; font-size:12px; color:#ffb86c;\n        ";
    v571.textContent = "⚠️ 此功能仅用于安全研究，执行的代码将具有页面完整权限。";
    v570.appendChild(v571);
    const v572 = document.createElement("textarea");
    v572.className = "csrt-input";
    v572.style.cssText = "\n            height:150px; resize:vertical; font-family:'Courier New',monospace;\n            font-size:12px; tab-size:2; line-height:1.6;\n        ";
    v572.placeholder = "// 在此输入JavaScript代码\n\nvmPromise.then(vm => {\n  console.log('VM已就绪', vm.runtime.targets);\n});";
    v570.appendChild(v572);
    const v573 = document.createElement("div");
    v573.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;";
    const vA25 = [{
      label: "📋 控制台",
      code: "console.log(\"页面信息:\", document.title, location.href);\nconsole.log(\"页面加载时间:\", performance.now(), \"ms\");"
    }, {
      label: "🔍 DOM查询",
      code: "// 查询页面所有元素\nconst allElements = document.querySelectorAll(\"*\");\nconsole.log(\"页面元素总数:\", allElements.length);\n\n// 查询所有按钮\nconst buttons = document.querySelectorAll(\"button\");\nconsole.log(\"按钮数量:\", buttons.length);\nbuttons.forEach((b, i) => console.log(i+1, b.textContent?.trim() || \"(无文本)\"));"
    }, {
      label: "📊 性能",
      code: "// 页面性能数据\nconsole.table(performance.getEntriesByType(\"navigation\"));\nconsole.log(\"DNS查询耗时:\", performance.getEntriesByName(\"document\")[0]?.domainLookupEnd - performance.getEntriesByName(\"document\")[0]?.domainLookupStart, \"ms\");\nconsole.log(\"白屏时间:\", performance.getEntriesByName(\"document\")[0]?.responseStart, \"ms\");"
    }, {
      label: "🔄 自动点击",
      code: "// 自动点击页面第一个按钮\nconst btn = document.querySelector(\"button\");\nif (btn) {\n  btn.click();\n  console.log(\"✅ 已点击按钮:\", btn.textContent?.trim() || \"无文本\");\n} else {\n  console.log(\"❌ 未找到按钮\");\n}"
    }];
    vA25.forEach(p231 => {
      const v574 = document.createElement("button");
      v574.textContent = p231.label;
      v574.className = "csrt-glass-btn";
      v574.onclick = () => {
        v572.value = p231.code;
        v572.focus();
      };
      v573.appendChild(v574);
    });
    v570.appendChild(v573);
    const v575 = document.createElement("button");
    v575.textContent = "▶ 执行代码 (安全研究)";
    v575.className = "csrt-glass-btn primary";
    v575.onclick = function () {
      const v576 = v572.value;
      try {
        const v577 = (0, eval)(v576);
        const v578 = document.createElement("div");
        v578.style.cssText = "\n                    margin-top:8px; padding:8px 12px;\n                    background:rgba(80,250,123,0.08);\n                    border:1px solid rgba(80,250,123,0.15);\n                    border-radius:8px; color:#50fa7b;\n                    font-size:12px; font-family:'Courier New',monospace;\n                    max-height:200px; overflow-y:auto; white-space:pre-wrap;\n                ";
        v578.textContent = "✅ 执行完成\n结果: " + (v577 !== undefined ? JSON.stringify(v577, null, 2) : "undefined");
        v570.appendChild(v578);
        // TOLOOK
        setTimeout(() => v578.remove(), 8000);
      } catch (e43) {
        const v579 = document.createElement("div");
        v579.style.cssText = "\n                    margin-top:8px; padding:8px 12px;\n                    background:rgba(255,85,85,0.08);\n                    border:1px solid rgba(255,85,85,0.15);\n                    border-radius:8px; color:#ff5555; font-size:12px;\n                ";
        v579.textContent = "❌ 错误: " + e43.message;
        v570.appendChild(v579);
        // TOLOOK
        setTimeout(() => v579.remove(), 5000);
        vO2.addError("代码执行错误: " + e43.message);
      }
    };
    v570.appendChild(v575);
    return v570;
  }
  let v580 = null;
  let v581 = false;
  function f92() {
    const v582 = document.createElement("div");
    v582.className = "csrt-window csrt-window-appear";
    v582.style.cssText = "\n            position: fixed;\n            top: 50%;\n            left: 50%;\n            width: 820px;\n            max-width: 95vw;\n            max-height: 88vh;\n            background: rgba(16, 18, 27, 0.75);\n            backdrop-filter: blur(24px);\n            -webkit-backdrop-filter: blur(24px);\n            border: 1px solid rgba(255, 255, 255, 0.08);\n            border-radius: 20px;\n            box-shadow: 0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);\n            z-index: 1000000;\n            color: #eee;\n            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n            display: none;\n            flex-direction: column;\n            overflow: hidden;\n            transform: scale(1);\n            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);\n        ";
    const v583 = Math.min(820, window.innerWidth * 0.95);
    const v584 = Math.min(window.innerHeight * 0.88, window.innerHeight * 0.88);
    v582.style.left = (window.innerWidth - v583) / 2 + "px";
    v582.style.top = (window.innerHeight - v584) / 2 + "px";
    v582.style.right = "auto";
    v582.style.bottom = "auto";
    v582.style.transform = "scale(1)";
    const v585 = document.createElement("div");
    v585.className = "csrt-header";
    v585.style.cssText = "\n            padding: 14px 20px;\n            background: rgba(255,255,255,0.04);\n            border-bottom: 1px solid rgba(255,255,255,0.06);\n            backdrop-filter: blur(8px);\n            -webkit-backdrop-filter: blur(8px);\n            display: flex;\n            justify-content: space-between;\n            align-items: center;\n            flex-shrink: 0;\n            border-radius: 20px 20px 0 0;\n        ";
    const v586 = document.createElement("span");
    v586.className = "csrt-title";
    v586.innerHTML = "\n            <span>🔬 CSRT</span>\n            <span class=\"csrt-version\">v" + vLS289 + "</span>\n            <span class=\"csrt-author\">110200</span>\n        ";
    const v587 = document.createElement("div");
    v587.className = "csrt-right-section";
    const vF25 = f25(v582);
    v587.appendChild(vF25);
    const v588 = document.createElement("button");
    v588.className = "csrt-close-btn";
    v588.textContent = "✕";
    v588.onclick = () => {
      v582.style.display = "none";
      v581 = false;
    };
    v587.appendChild(v588);
    v585.appendChild(v586);
    v585.appendChild(v587);
    v582.appendChild(v585);
    const v589 = document.createElement("div");
    v589.className = "csrt-content";
    v589.style.cssText = "\n            padding: 20px;\n            overflow-y: auto;\n            flex: 1;\n            background: rgba(0,0,0,0.15);\n        ";
    const v590 = document.createElement("div");
    v590.className = "csrt-tabs";
    const vF44 = f4();
    const v591 = vF44 === "profile";
    const v592 = vF44 === "other";
    const vO51 = {
      id: "info",
      label: v591 ? "📋 个人信息" : v592 ? "📋 当前页面" : "📊 作品信息"
    };
    let vA26 = [vO51];
    if (!v591 && !v592) {
      vA26.push({
        id: "extensions",
        label: "🔌 扩展审查"
      });
    }
    vA26.push({
      id: "features",
      label: "🔧 附加功能"
    });
    if (!v591 && !v592) {
      vA26.push({
        id: "datamodify",
        label: "📝 数据修改"
      });
    }
    vA26.push({
      id: "executor",
      label: "⌨️ 代码执行"
    }, {
      id: "logs",
      label: "📋 审查日志"
    });
    let vLSInfo = "info";
    const vO57 = {};
    vA26.forEach(p232 => {
      const v593 = document.createElement("button");
      v593.textContent = p232.label;
      v593.className = "csrt-tab" + (vLSInfo === p232.id ? " active" : "");
      v593.onclick = async () => {
        vLSInfo = p232.id;
        document.querySelectorAll(".csrt-tab").forEach(p233 => {
          p233.className = "csrt-tab" + (p233.dataset.tab === vLSInfo ? " active" : "");
        });
        Object.keys(vO57).forEach(p234 => {
          vO57[p234].style.display = p234 === vLSInfo ? "block" : "none";
          if (p234 === vLSInfo) {
            vO57[p234].style.animation = "none";
            requestAnimationFrame(() => {
              vO57[p234].style.animation = "csrt-panel-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";
            });
          }
        });
        if (p232.id === "info") {
          const v594 = document.querySelector("#srt-info-content")?.parentElement?.querySelector("button");
          if (v594) {
            v594.click();
          }
        }
        if (p232.id === "datamodify") {
          const v595 = vO57.datamodify;
          if (v595) {
            v595.innerHTML = "";
            const vF87 = f87();
            v595.appendChild(vF87);
          }
        }
      };
      v593.dataset.tab = p232.id;
      v590.appendChild(v593);
      let v596;
      if (p232.id === "info") {
        v596 = document.createElement("div");
        v596.className = "csrt-panel";
        f66().then(p235 => {
          v596.appendChild(p235);
        });
      } else if (p232.id === "extensions") {
        v596 = f68();
        v596.className = "csrt-panel";
      } else if (p232.id === "features") {
        v596 = f71();
        v596.className = "csrt-panel";
      } else if (p232.id === "datamodify") {
        v596 = document.createElement("div");
        v596.className = "csrt-panel";
        const vF872 = f87();
        v596.appendChild(vF872);
      } else if (p232.id === "executor") {
        v596 = f91();
        v596.className = "csrt-panel";
      } else if (p232.id === "logs") {
        v596 = f89();
        v596.className = "csrt-panel";
      }
      vO57[p232.id] = v596;
      v596.style.display = p232.id === "info" ? "block" : "none";
      v589.appendChild(v596);
    });
    v589.prepend(v590);
    v582.appendChild(v589);
    let v597 = false;
    let v598;
    let v599;
    let v600;
    let v601;
    v585.addEventListener("mousedown", p236 => {
      if (p236.target === v588 || p236.target.closest(".csrt-scale-btn") || p236.target.closest(".csrt-scale-display")) {
        return;
      }
      v597 = true;
      const v602 = v582.getBoundingClientRect();
      v598 = p236.clientX;
      v599 = p236.clientY;
      v600 = v602.left;
      v601 = v602.top;
      v582.style.cursor = "grabbing";
      p236.preventDefault();
    });
    document.addEventListener("mousemove", p237 => {
      if (!v597) {
        return;
      }
      const v603 = p237.clientX - v598;
      const v604 = p237.clientY - v599;
      v582.style.left = v600 + v603 + "px";
      v582.style.top = v601 + v604 + "px";
      v582.style.transform = "scale(" + vLN1 + ")";
    });
    document.addEventListener("mouseup", () => {
      if (v597) {
        v597 = false;
        v582.style.cursor = "default";
      }
    });
    v582.style.animation = "none";
    requestAnimationFrame(() => {
      v582.style.animation = "csrt-window-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";
    });
    document.body.appendChild(v582);
    return v582;
  }
  function f93() {
    if (!v580) {
      v580 = f92();
    }
    if (v581) {
      v580.style.display = "none";
      v581 = false;
    } else {
      v580.style.display = "flex";
      v581 = true;
      const v605 = Math.min(820, window.innerWidth * 0.95);
      const v606 = Math.min(window.innerHeight * 0.88, window.innerHeight * 0.88);
      v580.style.left = (window.innerWidth - v605) / 2 + "px";
      v580.style.top = (window.innerHeight - v606) / 2 + "px";
      v580.style.transform = "scale(" + vLN1 + ")";
      // TOLOOK
      setTimeout(() => {
        const v607 = document.querySelector("#srt-info-content")?.parentElement?.querySelector("button");
        if (v607) {
          v607.click();
        }
        const v608 = document.querySelector("#datamodify .csrt-panel");
        if (v608) {
          v608.innerHTML = "";
          const vF873 = f87();
          v608.appendChild(vF873);
        }
      }, 500);
    }
  }
  function f94() {
    f45();
    const v609 = GM_getValue("__csrt_replacer_meta") !== undefined;
    GM_registerMenuCommand(v609 ? "🔄 作品替换器 - 已替换" : "🔄 作品替换器 - 选择文件", async () => {
      if (v609) {
        if (confirm("已存在替换文件，是否清除？") && f39()) {
          alert("✅ 已清除，刷新页面生效。");
          location.reload();
        }
        return;
      }
      const v610 = await f15(".sb3,.sb2,.zip", "上传sb3文件");
      if (!v610) {
        return;
      }
      try {
        await f38(v610);
        alert("✅ 作品替换文件已保存！刷新页面生效。");
        location.reload();
      } catch (e44) {
        alert("❌ 保存失败: " + e44.message);
      }
    });
    GM_registerMenuCommand("🧩 角色插入器 - 插入角色", async () => {
      try {
        const v611 = await f22();
        if (!v611) {
          alert("❌ 无法获取VM实例，请确保在作品页面使用");
          return;
        }
        const v612 = await f15(".sprite3,.sprite2,.zip", "上传角色文件");
        if (!v612) {
          return;
        }
        await v611.addSprite(await f12(v612));
        alert("✅ 角色插入成功！");
      } catch (e45) {
        alert("❌ 错误: " + e45.message);
      }
    });
    GM_registerMenuCommand(vVO3.replacerChangeVersion ? "🔄 作品回溯: 开" : "🔄 作品回溯: 关", () => {
      vVO3.replacerChangeVersion = !vVO3.replacerChangeVersion;
      f3();
      alert("作品回溯: " + (vVO3.replacerChangeVersion ? "已开启" : "已关闭"));
    });
    GM_registerMenuCommand("📥 下载当前作品 (.sb3)", f55);
    GM_registerMenuCommand("🎨 下载所有角色", f56);
    GM_registerMenuCommand("📂 查看捕获列表", f57);
  }
  let v613 = null;
  async function f95() {
    if (document.querySelector(".csrt-ball")) {
      return;
    }
    console.log("🔬 CSRT v" + vLS289 + " 初始化开始...");
    f();
    f40();
    f41();
    f46();
    f47();
    if (v20) {
      f37();
    }
    f94();
    if (vVO3.performanceMonitor) {
      // TOLOOK
      setTimeout(() => f61(), 2000);
    }
    requestAnimationFrame(async () => {
      try {
        v613 = await f28();
        console.log("✅ CSRT: 悬浮球已创建");
      } catch (e46) {
        console.error("❌ CSRT: 悬浮球创建失败", e46);
      }
      document.addEventListener("keydown", p238 => {
        if (p238.ctrlKey && p238.shiftKey && p238.key === "E") {
          p238.preventDefault();
          f93();
        }
      });
      // TOLOOK
      setTimeout(() => {
        try {
          f54();
          console.log("✅ CSRT: 扩展拦截已设置");
        } catch (e47) {
          console.error("❌ CSRT: 扩展拦截设置失败", e47);
        }
      }, 100);
      // TOLOOK
      setTimeout(async () => {
        try {
          const v614 = await f34(false);
          if (v614.customExtensions?.length > 0 || v614.warnings?.length > 0) {
            if (v613) {
              v613.style.border = "2px solid #ff5555";
              v613.style.animation = "csrt-pulse 2s infinite";
            }
            console.log("⚠️ CSRT: 检测到 " + v614.customExtensions.length + " 个自定义扩展");
          } else {
            console.log("✅ CSRT: 未检测到自定义扩展");
          }
        } catch (e48) {
          vO2.addError("自动检测失败: " + e48.message);
          console.error("❌ CSRT: 自动检测失败", e48);
        }
      }, 5000);
    });
  }
  const v615 = document.createElement("style");
  v615.textContent = "\n        @keyframes csrt-pulse {\n            0% { box-shadow: 0 0 0 0 rgba(255,85,85,0.4); }\n            70% { box-shadow: 0 0 0 15px rgba(255,85,85,0); }\n            100% { box-shadow: 0 0 0 0 rgba(255,85,85,0); }\n        }\n    ";
  document.head.appendChild(v615);
  f95();
  const vO58 = {
    version: vLS289,
    name: vLSCSRTCCWSecurityResea,
    author: "110200",
    getProjectInfo: f34,
    modifyExtensionCode: f53,
    getExtensionCode: f36,
    vmPromise: v50,
    vmInstance: () => v47,
    getVM: f22,
    privateLog: vO2,
    toggleTool: f93,
    setBrowserTitle: f49,
    resetBrowserTitle: f50,
    extractProjectIdFromUrl: f6,
    featureSettings: vVO3,
    phoneSettings: vVO4,
    saveSettings: f3,
    loadSettings: f2,
    showFilePrompt: f15,
    blobToArrayBuffer: f12,
    hasCCWDataExtension: f31,
    hasGandiEconomyExtension: f32,
    hasGandiAchievementExtension: f33,
    downloadProject: f55,
    getPageType: f4,
    startMonitor: f61,
    stopMonitor: f64,
    toggleMonitor: f65,
    capturedProjects: vA2,
    downloadAllSprites: f56,
    showCapturedList: f57,
    loadVariableList: f73,
    loadCloudData: f77,
    loadEconomyContracts: f78,
    loadAchievements: f81,
    loadLeaderboards: f83
  };
  unsafeWindow.__CSRT = vO58;
  window.addEventListener("beforeunload", () => {
    Object.keys(vVO).forEach(p239 => {
      console[p239] = vVO[p239];
    });
  });
})();