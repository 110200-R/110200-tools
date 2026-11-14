// ==UserScript==
// @name         CForge
// @namespace    CForge
// @version      0.32
// @license      AGPL-3.0
// @description  修改器工具
// @author       XM
// @match        https://www.ccw.site/*
// @icon         https://www.coze.cn/s/820300JY86k/
// @grant        none
// @run-at       document-start
// ==/UserScript==
"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/util/inject.js
  function patch(obj, p, fn) {
    if (obj[p]) obj[p] = fn(obj[p]);
  }
  function addStyle(css) {
    if (css instanceof URL) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = css.toString();
      document.documentElement.appendChild(style);
    } else {
      const style = document.createElement("style");
      style.textContent = css;
      document.documentElement.appendChild(style);
    }
  }
  function trap(callback) {
    patch(Function.prototype, "bind", (_bind) => {
      return function(self2, ...args) {
        if (typeof self2 === "object" && self2 !== null) {
          const hasEdit = Object.prototype.hasOwnProperty.call(self2, "editingTarget");
          const hasRuntime = Object.prototype.hasOwnProperty.call(self2, "runtime");
          if (hasEdit && hasRuntime) {
            Function.prototype.bind = _bind;
            callback(self2);
            return _bind.call(this, self2, ...args);
          }
        }
        return _bind.call(this, self2, ...args);
      };
    });
  }
  var vm = globalThis.__CSense_vm_trap ?? new Promise(trap);
  delete globalThis.__CSense_vm_trap;
  var LazyXHR = class {
    constructor() {
      this.interceptors = {
        request: {
          handlers: [],
          use: (fulfilled, rejected, options) => {
            this.interceptors.request.handlers.push({
              fulfilled,
              rejected,
              synchronous: false,
              runWhen: options?.runWhen ?? null
            });
          }
        },
        response: {
          handlers: [],
          use: (fulfilled, rejected, options) => {
            this.interceptors.response.handlers.push({
              fulfilled,
              rejected,
              synchronous: false,
              runWhen: options?.runWhen ?? null
            });
          }
        }
      };
    }
    delegate(axiosInstance) {
      axiosInstance.interceptors.request.handlers.unshift(
        ...this.interceptors.request.handlers
      );
      axiosInstance.interceptors.response.handlers.unshift(
        ...this.interceptors.response.handlers
      );
    }
  };

  // src/base/scene.js
  var SceneManager = class {
    constructor(target) {
      this._disposed = false;
      this.overlays = [];
      this.target = target;
      this.updateRequested = false;
      this.scene = [];
      const fn = () => {
        if (this.updateRequested) {
          this.updateRequested = false;
          this._render();
        }
        if (!this._disposed) requestAnimationFrame(fn);
      };
      requestAnimationFrame(fn);
    }
    _doSetTitle() {
    }
    _updateTitle() {
      const c = this.scene.at(-1).constructor;
      this._doSetTitle(c.title ?? c.name);
    }
    dispose() {
      this._disposed = true;
    }
    _destroy() {
      while (this.target.firstChild) {
        this.target.removeChild(this.target.firstChild);
      }
    }
    _render() {
      this._destroy();
      this._updateTitle();
      this.overlays.forEach((overlay) => overlay.render());
      this.scene.at(-1).render();
    }
    addOverlay(scene) {
      this.overlays.push(scene);
      this.requestUpdate();
    }
    removeOverlay(scene) {
      const index = this.overlays.indexOf(scene);
      if (index !== -1) {
        this.overlays[index].dispose();
        this.overlays.splice(index, 1);
        this.requestUpdate();
      }
    }
    back() {
      if (this.scene.length > 1) {
        const scene = this.scene.pop();
        scene.dispose();
        this.requestUpdate();
        return true;
      }
      return false;
    }
    open(scene) {
      this.scene.push(scene);
      this.requestUpdate();
    }
    requestUpdate() {
      this.updateRequested = true;
    }
  };

  // src/api/ccwdata.js
  var Database = class {
    constructor() {
      this.data = /* @__PURE__ */ new Map();
      this.watchers = /* @__PURE__ */ new Map();
    }
    watch(key, callback) {
      this.watchers.set(key, callback);
    }
    set(key, value) {
      if (this.data.get(key) === value) return;
      if (this.watchers.has(key)) {
        return this.data.set(
          key,
          this.watchers.get(key)(this.data.get(key), value)
        );
      } else this.data.set(key, value);
    }
    get(key) {
      return this.data.get(key);
    }
    has(key) {
      return this.data.has(key);
    }
    entries() {
      return this.data.entries();
    }
    values() {
      return this.data.values();
    }
    keys() {
      return this.data.keys();
    }
  };

  // src/util/extensionInjector.js
  var ExtensionInjector = class {
    constructor() {
      this.extensions = /* @__PURE__ */ new Map();
    }
    on(name, callback) {
      if (!this.extensions.has(name)) {
        this.extensions.set(name, []);
      }
      this.extensions.get(name).push(callback);
    }
    emit(name, extensionObject) {
      if (!this.extensions.has(name)) return;
      for (const callback of this.extensions.get(name)) {
        try {
          callback(extensionObject);
        } catch (e) {
          console.error(`[CForge] 扩展事件 ${name} 回调失败`, e);
        }
      }
    }
  };

  // CForge: fetch interceptor to capture leaderboard API calls + [v0.26] creation/detail mode拦截
  var _lbCaptured = { url: null, method: null, body: null, headers: null };
  var _origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var method = (init && init.method) || (input && input.method) || "GET";
      // [v0.29] 读码JSON：捕获 fetch 请求体
      if (state_default.jsonCapture.enabled && init && init.body && method.toUpperCase() !== 'GET') {
        try {
          var bodyStr = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
          if (bodyStr && bodyStr.length > 2) {
            state_default.jsonCapture.captured.unshift({
              url: url, method: method, body: bodyStr,
              timestamp: new Date().toLocaleTimeString(),
              source: 'fetch'
            });
            if (state_default.jsonCapture.captured.length > state_default.jsonCapture.maxCaptured) {
              state_default.jsonCapture.captured.pop();
            }
          }
        } catch(e) {}
      }
      if (url.indexOf("gandi-main.ccw.site/creation/leaderboards") !== -1 && method.toUpperCase() === "POST") {
        _lbCaptured.url = url;
        _lbCaptured.method = method;
        _lbCaptured.body = init && init.body ? init.body : null;
        _lbCaptured.headers = init && init.headers ? init.headers : null;
        console.log("[CForge] Captured leaderboard POST:", url, "body:", _lbCaptured.body);
      }
      // [v0.26] Gandi编辑器页面：拦截creation/detail请求 + 响应错误码处理
      if (window.location.pathname.indexOf('/gandi/project/') === 0 && url.indexOf('creation/detail') !== -1) {
        // 改mode=EDIT为mode=VIEW
        if (url.indexOf('mode=EDIT') !== -1) {
          var _editUrl = url.replace(/mode=EDIT/g, 'mode=VIEW');
          if (typeof input === 'string') {
            input = _editUrl;
          } else if (input && input.url) {
            input = new Request(_editUrl, input);
          }
          console.log('[CForge][编辑器] fetch: creation/detail mode EDIT→VIEW');
        }
        if (init && init.body && typeof init.body === 'string') {
          try {
            var _bodyObj = JSON.parse(init.body);
            if (_bodyObj.mode === 'EDIT') {
              _bodyObj.mode = 'VIEW';
              init = Object.assign({}, init, { body: JSON.stringify(_bodyObj) });
            }
          } catch(e) {}
        }
        return _origFetch.call(this, input, init).then(function(response) {
          if (response.ok) {
            return response.text().then(function(text) {
              try {
                var data = JSON.parse(text);
                // 检测错误码（HTTP 200 + body中有错误码）
                if (data && data.code && data.code !== 0) {
                  console.log('[CForge][编辑器] fetch: creation/detail返回错误码:', data.code, '— 构造假响应');
                  var cJson = state_default.projectJson;
                  if (!cJson) {
                    try { cJson = JSON.parse(localStorage.getItem('CForge_cachedProjectJson') || 'null'); } catch(e) {}
                  }
                  var cUid = '';
                  try { var cu = JSON.parse(localStorage.getItem('CForge_userInfo') || '{}'); if (cu.userId) cUid = cu.userId; } catch(e) {}
                  var _pid = '';
                  try { _pid = window.location.pathname.split('/gandi/project/')[1] || 'cforge_fake'; } catch(e) { _pid = 'cforge_fake'; }
                  var fb = {
                    id: _pid, title: 'CForge源码编辑',
                    authorId: cUid, ownerId: cUid, creatorId: cUid,
                    isOwner: true, canEdit: true, editable: true,
                    permission: 'edit', requireLogin: false, role: 'owner',
                    isAuthor: true, mode: 'EDIT', viewOnly: false, readOnly: false,
                    type: 'scratch', status: 'published', visibility: 'public', version: 0,
                    description: '', thumbnail: '', createdAt: Date.now(), updatedAt: Date.now()
                  };
                  if (cJson) { fb.content = JSON.stringify(cJson); fb.project = cJson; }
                  data = { code: 0, msg: 'success', body: fb, data: fb };
                  console.log('[CForge][编辑器] fetch: 已构造假响应' + (cJson ? '（含项目JSON）' : '（仅元数据）'));
                } else {
                  // 正常成功响应：修改权限字段
                  var body = (data && data.data && data.data.body) || (data && data.body) || data;
                  if (body && typeof body === 'object' && !Array.isArray(body)) {
                    var curUid = '';
                    try { var s = JSON.parse(localStorage.getItem('CForge_userInfo') || '{}'); if (s.userId) curUid = s.userId; } catch(e) {}
                    if (curUid) {
                      if ('authorId' in body) body.authorId = curUid;
                      if ('ownerId' in body) body.ownerId = curUid;
                      if ('creatorId' in body) body.creatorId = curUid;
                      if ('userId' in body) body.userId = curUid;
                    }
                    if ('isOwner' in body) body.isOwner = true;
                    if ('canEdit' in body) body.canEdit = true;
                    if ('editable' in body) body.editable = true;
                    if ('permission' in body) body.permission = 'edit';
                    if ('requireLogin' in body) body.requireLogin = false;
                    if ('role' in body) body.role = 'owner';
                    if ('isAuthor' in body) body.isAuthor = true;
                    if ('mode' in body) body.mode = 'EDIT';
                    if ('viewOnly' in body) body.viewOnly = false;
                    if ('readOnly' in body) body.readOnly = false;
                    // [v0.31] 如果响应中没有项目内容，从缓存补充
                    if (!body.content && !body.project) {
                      var _cj2 = state_default.projectJson;
                      if (!_cj2) { try { _cj2 = JSON.parse(localStorage.getItem('CForge_cachedProjectJson') || 'null'); } catch(e) {} }
                      if (_cj2) {
                        body.content = JSON.stringify(_cj2);
                        body.project = _cj2;
                        console.log('[CForge][编辑器] fetch响应: 已从缓存补充项目JSON');
                      }
                    }
                    if (data && data.data && data.data.body) { data.data.body = body; }
                    else if (data && data.body) { data.body = body; }
                    console.log('[CForge][编辑器] fetch响应: 已修改权限字段');
                  }
                }
                return new Response(JSON.stringify(data), {
                  status: response.status,
                  statusText: response.statusText,
                  headers: { 'Content-Type': 'application/json' }
                });
              } catch(e) {
                console.error('[CForge][编辑器] fetch响应解析失败:', e);
                return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
              }
            });
          }
          return response;
        });
      }
    } catch(e) {}
    return _origFetch.apply(this, arguments);
  };


  // src/base/state.js
  var state_default = {
    pluginPromise: Promise.resolve(),
    userInfo: (function() {
      try {
        var saved = localStorage.getItem("CForge_userInfo");
        if (saved) return JSON.parse(saved);
      } catch(e) {}
      return null;
    })(),
    isDisguised: (function() {
      try {
        return localStorage.getItem("CForge_isDisguised") === "true";
      } catch(e) {}
      return false;
    })(),
    myInfo: null,
    vm: null,
    /** @type {Record<string, Database>} */
    ccwdata: Object.freeze({
      /** @type {Database} */
      project: new Database(),
      /** @type {Database} */
      user: new Database()
    }),
    extensionInjector: new ExtensionInjector(),
    mmo: {
      /** @type {RegExp[]} */
      broadcastBlackList: [],
      /** @type {Array<{time:string,type:string,sender:string,senderUID:string,name:string,content:string}>} */
      broadcastLog: [],
      /** @type {Array<{target:string,type:string,content:string}>} */
      broadcastBlocks: []
    },
    /** @type {{enabled:boolean, blockList:string[]}} */
    eventBlock: {
      enabled: false,
      blockList: ["event_whengreaterthan"]
    },
    blacklistBypass: {
      enabled: (function() {
        try {
          var saved = localStorage.getItem("CForge_blacklistBypass");
          if (saved !== null) return saved === "true";
        } catch(e) {}
        return true;
      })()
    },
    /** @type {{enabled:boolean}} */
    skipExtIntercept: {
      enabled: (function() {
        try {
          var saved = localStorage.getItem("CForge_skipExtIntercept");
          if (saved !== null) return saved === "true";
        } catch(e) {}
        return true; // [v0.18] 默认跳过扩展拦截，避免MMO画面异常
      })()
    },
    autoClicker: {
      enabled: (function() {
        try { return localStorage.getItem("CForge_autoClicker") === "true"; } catch(e) {}
        return false;
      })(),
      hotkey: (function() {
        try { var h = localStorage.getItem("CForge_autoClickerHotkey"); if (h) return h; } catch(e) {}
        return "1";
      })(),
      active: false,
      _frame: 0
    },
    /** @type {{enabled:boolean, captured:Array, maxCaptured:number}} */
    jsonCapture: {
      enabled: false,
      captured: [],
      maxCaptured: 50
    },
    button: null,
    /** @type {LazyXHR} */
    axios: new LazyXHR(),
    isIdentified: false,
    projectJson: null
  };

  // [源码功能] JSON.parse 全局劫持 — 捕获项目 JSON + [v0.26] 缓存到localStorage供编辑器页面使用
  (function() {
    var _origJSONParse = JSON.parse;
    JSON.parse = function() {
      var result = _origJSONParse.apply(this, arguments);
      try {
        if (result && typeof result === 'object' && Array.isArray(result.targets)) {
          state_default.projectJson = result;
          // [v0.26] 缓存到localStorage，供Gandi编辑器页面的错误回退使用
          try { localStorage.setItem('CForge_cachedProjectJson', JSON.stringify(result)); } catch(e) {}
        }
      } catch(e) {}
      return result;
    };
    JSON.parse.toString = function() { return _origJSONParse.toString(); };
  })();

  // [v0.26] Gandi编辑器页面：请求拦截mode=EDIT→VIEW + 响应权限伪装（顶层注册，确保在VM捕获前生效）
  (function() {
    if (window.location.pathname.indexOf('/gandi/project/') !== 0) return;
    console.log('[CForge] 检测到Gandi编辑器页面，启用源码编辑权限伪装 v0.27');

    // 辅助函数：修改creation/detail响应中的权限字段
    function _modifyCreationDetailBody(body) {
      if (!body || typeof body !== 'object') return;
      var curUid = state_default._realMMOUserId || (state_default.userInfo && state_default.userInfo.userId) || '';
      if (!curUid) {
        try { var s = JSON.parse(localStorage.getItem('CForge_userInfo') || '{}'); if (s.userId) curUid = s.userId; } catch(e) {}
      }
      if (curUid) {
        if ('authorId' in body) body.authorId = curUid;
        if ('ownerId' in body) body.ownerId = curUid;
        if ('creatorId' in body) body.creatorId = curUid;
        if ('studentNumber' in body) body.studentNumber = curUid;
        if ('userId' in body) body.userId = curUid;
        ['author', 'owner', 'creator', 'user', 'userInfo'].forEach(function(k) {
          if (body[k] && typeof body[k] === 'object' && !Array.isArray(body[k])) {
            if ('userId' in body[k]) body[k].userId = curUid;
            if ('studentNumber' in body[k]) body[k].studentNumber = curUid;
            if ('id' in body[k]) body[k].id = curUid;
            if ('name' in body[k] && state_default._realMMOUserName) body[k].name = state_default._realMMOUserName;
          }
        });
      }
      if ('isOwner' in body) body.isOwner = true;
      if ('canEdit' in body) body.canEdit = true;
      if ('editable' in body) body.editable = true;
      if ('permission' in body) body.permission = 'edit';
      if ('requireLogin' in body) body.requireLogin = false;
      if ('role' in body) body.role = 'owner';
      if ('isAuthor' in body) body.isAuthor = true;
      if ('mode' in body) body.mode = 'EDIT';
      if ('viewOnly' in body) body.viewOnly = false;
      if ('readOnly' in body) body.readOnly = false;
    }

    // 1. axios请求拦截器：将creation/detail的mode=EDIT改为mode=VIEW
    state_default.axios.interceptors.request.use(function(config) {
      var url = config.url || '';
      if (url.indexOf('creation/detail') !== -1) {
        var changed = false;
        // 修改URL中的mode=EDIT
        if (url.indexOf('mode=EDIT') !== -1) {
          config.url = url.replace(/mode=EDIT/g, 'mode=VIEW');
          changed = true;
        }
        // 修改params中的mode
        if (config.params && config.params.mode === 'EDIT') {
          config.params.mode = 'VIEW';
          changed = true;
        }
        // 修改data中的mode（POST body）
        if (config.data && typeof config.data === 'object' && config.data.mode === 'EDIT') {
          config.data.mode = 'VIEW';
          changed = true;
        } else if (config.data && typeof config.data === 'string') {
          try {
            var d = JSON.parse(config.data);
            if (d.mode === 'EDIT') {
              d.mode = 'VIEW';
              config.data = JSON.stringify(d);
              changed = true;
            }
          } catch(e) {}
        }
        if (changed) console.log('[CForge][编辑器] axios请求: creation/detail mode EDIT→VIEW');
      }
      return config;
    });

    // 2. axios响应拦截器：检测creation/detail错误码并构造假响应 + 修改权限字段
    state_default.axios.interceptors.response.use(function(resp) {
      var url = resp.config.url || '';
      // 捕获用户信息
      var body = resp.data && resp.data.body;
      if (body && body.studentNumber && body.name) {
        if (!state_default._realMMOUserId) {
          state_default._realMMOUserId = String(body.studentNumber);
          state_default._realMMOUserName = body.name;
          console.log('[CForge][编辑器] 捕获用户ID:', state_default._realMMOUserId);
        }
      }
      // [v0.26] 检测creation/detail错误响应（HTTP 200 + body中有错误码）
      if (url.indexOf('creation/detail') !== -1 && resp.data && resp.data.code && resp.data.code !== 0) {
        console.log('[CForge][编辑器] creation/detail返回错误码:', resp.data.code, resp.data.msg, '— 构造假成功响应');
        var cachedJson = state_default.projectJson;
        if (!cachedJson) {
          try { cachedJson = JSON.parse(localStorage.getItem('CForge_cachedProjectJson') || 'null'); } catch(e) {}
        }
        console.log('[CForge][编辑器] 缓存项目JSON:', cachedJson ? '可用' : '不可用');
        var curUid = state_default._realMMOUserId || (state_default.userInfo && state_default.userInfo.userId) || '';
        if (!curUid) {
          try { var s = JSON.parse(localStorage.getItem('CForge_userInfo') || '{}'); if (s.userId) curUid = s.userId; } catch(e) {}
        }
        var fakeBody = {
          id: 'cforge_fake',
          title: 'CForge源码编辑',
          authorId: curUid,
          ownerId: curUid,
          creatorId: curUid,
          isOwner: true,
          canEdit: true,
          editable: true,
          permission: 'edit',
          requireLogin: false,
          role: 'owner',
          isAuthor: true,
          mode: 'EDIT',
          viewOnly: false,
          readOnly: false,
          type: 'scratch', status: 'published', visibility: 'public', version: 0,
          description: '', thumbnail: '', createdAt: Date.now(), updatedAt: Date.now()
        };
        if (cachedJson) {
          fakeBody.content = JSON.stringify(cachedJson);
          fakeBody.project = cachedJson;
        }
        resp.data = { code: 0, msg: 'success', body: fakeBody, data: fakeBody };
        console.log('[CForge][编辑器] 已构造假成功响应' + (cachedJson ? '（含项目JSON）' : '（仅元数据，编辑器需自行加载项目）'));
        return resp;
      }
      // 正常成功响应：修改creation/detail权限字段
      if (url.indexOf('creation/detail') !== -1 || url.indexOf('creation') !== -1) {
        var respBody = resp.data && resp.data.body;
        if (respBody && typeof respBody === 'object') {
          _modifyCreationDetailBody(respBody);
          // [v0.31] 如果响应中没有项目内容，从缓存补充
          if (!respBody.content && !respBody.project) {
            var cj = state_default.projectJson;
            if (!cj) { try { cj = JSON.parse(localStorage.getItem('CForge_cachedProjectJson') || 'null'); } catch(e) {} }
            if (cj) {
              respBody.content = JSON.stringify(cj);
              respBody.project = cj;
              console.log('[CForge][编辑器] axios响应: 已从缓存补充项目JSON');
            }
          }
          console.log('[CForge][编辑器] axios响应: 已修改creation/detail权限字段');
        }
        // 也处理data本身就是body的情况
        if (resp.data && typeof resp.data === 'object' && !resp.data.body && !resp.data.code) {
          _modifyCreationDetailBody(resp.data);
        }
      }
      return resp;
    },
    // 3. axios错误处理：HTTP 4xx/5xx或编辑器interceptor抛出错误时，构造假响应
    function(error) {
      var errUrl = (error && error.config && error.config.url) || '';
      console.log('[CForge][编辑器] axios错误处理: url=' + errUrl + ', message=' + (error && error.message));
      if (errUrl.indexOf('creation/detail') !== -1) {
        var cachedJson2 = state_default.projectJson;
        if (!cachedJson2) {
          try { cachedJson2 = JSON.parse(localStorage.getItem('CForge_cachedProjectJson') || 'null'); } catch(e) {}
        }
        console.log('[CForge][编辑器] 错误回退: 缓存项目JSON', cachedJson2 ? '可用' : '不可用');
        var curUid2 = state_default._realMMOUserId || (state_default.userInfo && state_default.userInfo.userId) || '';
        if (!curUid2) {
          try { var s2 = JSON.parse(localStorage.getItem('CForge_userInfo') || '{}'); if (s2.userId) curUid2 = s2.userId; } catch(e) {}
        }
        var fakeBody2 = {
          id: 'cforge_fake',
          title: 'CForge源码编辑',
          authorId: curUid2,
          ownerId: curUid2,
          creatorId: curUid2,
          isOwner: true,
          canEdit: true,
          editable: true,
          permission: 'edit',
          requireLogin: false,
          role: 'owner',
          isAuthor: true,
          mode: 'EDIT',
          viewOnly: false,
          readOnly: false,
          type: 'scratch', status: 'published', visibility: 'public', version: 0,
          description: '', thumbnail: '', createdAt: Date.now(), updatedAt: Date.now()
        };
        if (cachedJson2) {
          fakeBody2.content = JSON.stringify(cachedJson2);
          fakeBody2.project = cachedJson2;
        }
        console.log('[CForge][编辑器] 错误回退: 构造假响应' + (cachedJson2 ? '（含项目JSON）' : '（仅元数据）'));
        return {
          data: { code: 0, msg: 'success', body: fakeBody2, data: fakeBody2 },
          status: 200,
          statusText: 'OK',
          config: error.config,
          headers: {}
        };
      }
      return Promise.reject(error);
    });
  })();

  // [v0.8] 免疫黑名单 - Hook XHR.prototype.open + [v0.26] creation/detail mode拦截 + [v0.27] XHR响应拦截
  (function() {
    var _xhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (typeof url === "string") this._cforge_url = url;
      if (state_default.blacklistBypass && state_default.blacklistBypass.enabled && typeof url === "string" && url.indexOf("/student/block_record/status") !== -1) {
        var fakeResp = 'data:application/json,{"body":"NOT_BLOCKED","code":"200","msg":null,"status":200}';
        var restArgs = [];
        for (var i = 2; i < arguments.length; i++) restArgs.push(arguments[i]);
        return _xhrOpen.apply(this, [method, fakeResp].concat(restArgs));
      }
      // [v0.26] Gandi编辑器页面：将creation/detail请求中的mode=EDIT改为mode=VIEW
      if (window.location.pathname.indexOf('/gandi/project/') === 0 && typeof url === "string" && url.indexOf('creation/detail') !== -1 && url.indexOf('mode=EDIT') !== -1) {
        var newUrl = url.replace(/mode=EDIT/g, 'mode=VIEW');
        var xhrRestArgs = [];
        for (var j = 2; j < arguments.length; j++) xhrRestArgs.push(arguments[j]);
        console.log('[CForge][编辑器] XHR: creation/detail mode EDIT→VIEW');
        return _xhrOpen.apply(this, [method, newUrl].concat(xhrRestArgs));
      }
      return _xhrOpen.apply(this, arguments);
    };
    // [v0.27] XHR响应拦截：在creation/detail返回错误码时，直接在XHR层面替换responseText
    // 这样axios和Gandi编辑器代码完全看不到原始错误响应
    var _xhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
      var xhr = this;
      var reqUrl = xhr._cforge_url || '';
      // [v0.29] 读码JSON：捕获 XHR 请求体
      if (state_default.jsonCapture.enabled && body && typeof body === 'string' && body.length > 2) {
        try {
          state_default.jsonCapture.captured.unshift({
            url: reqUrl, method: 'POST', body: body,
            timestamp: new Date().toLocaleTimeString(),
            source: 'xhr'
          });
          if (state_default.jsonCapture.captured.length > state_default.jsonCapture.maxCaptured) {
            state_default.jsonCapture.captured.pop();
          }
        } catch(e) {}
      }
      if (reqUrl.indexOf('creation/detail') !== -1 && window.location.pathname.indexOf('/gandi/project/') === 0) {
        var origOnRSC = xhr.onreadystatechange;
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            try {
              var respText = xhr.responseText;
              var data = JSON.parse(respText);
              if (data.code && data.code !== 0) {
                var cJson = state_default.projectJson;
                if (!cJson) { try { cJson = JSON.parse(localStorage.getItem('CForge_cachedProjectJson') || 'null'); } catch(e) {} }
                var projectId = '';
                try { projectId = window.location.pathname.split('/gandi/project/')[1] || ''; } catch(e) {}
                var cUid = state_default._realMMOUserId || '';
                if (!cUid) { try { var cu = JSON.parse(localStorage.getItem('CForge_userInfo') || '{}'); if (cu.userId) cUid = cu.userId; } catch(e) {} }
                var fb = {
                  id: projectId || 'cforge_fake', title: 'CForge源码编辑',
                  authorId: cUid, ownerId: cUid, creatorId: cUid,
                  isOwner: true, canEdit: true, editable: true,
                  permission: 'edit', requireLogin: false, role: 'owner',
                  isAuthor: true, mode: 'EDIT', viewOnly: false, readOnly: false,
                  type: 'scratch', status: 'published', visibility: 'public', version: 0,
                  description: '', thumbnail: '', createdAt: Date.now(), updatedAt: Date.now()
                };
                if (cJson) { fb.content = JSON.stringify(cJson); fb.project = cJson; }
                var fakeRespText = JSON.stringify({ code: 0, msg: 'success', body: fb, data: fb });
                try {
                  Object.defineProperty(xhr, 'responseText', { get: function() { return fakeRespText; }, configurable: true });
                  Object.defineProperty(xhr, 'response', { get: function() { return fakeRespText; }, configurable: true });
                } catch(e) { console.warn('[CForge][编辑器] XHR响应替换失败:', e); }
                console.log('[CForge][编辑器] XHR响应拦截: 已替换错误码' + data.code + '为假成功响应' + (cJson ? '（含项目JSON）' : '（仅元数据）'));
              }
            } catch(e) {}
          }
          if (origOnRSC) origOnRSC.apply(xhr, arguments);
        };
      }
      return _xhrSend.apply(xhr, arguments);
    };
  })();

  // src/overlay/identity.js
  var IdentityWarningOverlay = class {
    constructor(manager) {
      this.manager = manager;
      this.showOverlay = false;
      this.isUpdated = false;
      state_default.axios.interceptors.response.use((resp) => {
        if (resp.config.url.endsWith("/students/self/detail") && this.isUpdated) {
          const body = resp.data.body;
          if (body) {
            state_default.myInfo = body;
            if (body.identitiyAuthRank === "L2") {
              this.showOverlay = true;
              state_default.isIdentified = true;
              manager.requestUpdate();
            }
          }
        }
        return resp;
      });
    }
    render() {
      const target = this.manager.target;
      if (this.showOverlay) {
        const warningDiv = document.createElement("div");
        warningDiv.style.cursor = "pointer";
        warningDiv.textContent = "账户已实名认证";
        warningDiv.title = "为防止您的行为遭到追踪，请登出账户或切换到未实名认证的账户。您可以点击此处立刻登出。";
        warningDiv.style.width = "100%";
        warningDiv.style.backgroundColor = "#c8a800";
        warningDiv.style.color = "black";
        warningDiv.style.textAlign = "center";
        warningDiv.style.padding = "5px";
        warningDiv.style.fontSize = "12px";
        warningDiv.style.boxSizing = "border-box";
        warningDiv.addEventListener("click", async () => {
          await fetch("https://sso.ccw.site/web/auth/logout", {
            headers: {
              "content-type": "application/json"
            },
            body: "{}",
            method: "POST",
            mode: "cors",
            credentials: "include"
          });
          document.cookie = "cookie-user-id=;domain=.ccw.site;path=/;max-age=-999999";
          window.location.reload();
        });
        target.appendChild(warningDiv);
      }
    }
    dispose() {
    }
  };

  // src/asset/logo.svg
  var logo_default = 'data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22UTF-8%22%3F%3E%0A%3Csvg%20fill%3D%22none%22%20version%3D%221.1%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22g1%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23A855F7%22%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%232563EB%22%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22g2%22%20x1%3D%220%25%22%20y1%3D%2250%25%22%20x2%3D%22100%25%22%20y2%3D%2250%25%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23EF4444%22%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%2240%25%22%20stop-color%3D%22%23A855F7%22%2F%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%232563EB%22%2F%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%3C%2Fdefs%3E%0A%20%20%3Cg%20transform%3D%22matrix%281%2C0%2C0%2C-1%2C0%2C80%29%22%3E%0A%20%20%20%20%3Cg%20transform%3D%22matrix%281%2C0%2C0%2C-1%2C0%2C160%29%22%3E%0A%20%20%20%20%20%20%3Cpath%0A%20%20%20%20%20%20%20%20d%3D%22m9.4332%2086.067-1.7864-1.782c-4.6571%203.6624-7.6468%209.3405-7.6468%2015.715%200%205.3448%202.1018%2010.2%205.5258%2013.788l1.7728-1.7684c-2.9708-3.1349-4.7924-7.365-4.7924-12.019%200-5.6848%202.7174-10.737%206.927-13.933zm2.7405%2029.575-1.8541%201.8496c2.8814%201.5984%206.1991%202.5088%209.7299%202.5088%2010.396%200%2018.945-7.8934%2019.95-18h-2.5205c-0.9949%208.7231-8.4191%2015.5-17.43%2015.5-2.8321%200-5.5075-0.6695-7.8758-1.8584zm19.256-28.96%201.6169-1.9102c-3.5-2.9753-8.0385-4.7712-12.997-4.7712-1.6482%200-3.2499%200.19838-4.7825%200.57251l2.1313%202.126c0.8646-0.13074%201.75-0.19853%202.6512-0.19853%204.3427%200%208.3169%201.574%2011.38%204.1814z%22%0A%20%20%20%20%20%20%20%20fill%3D%22url%28%23g1%29%22%20fill-rule%3D%22evenodd%22%20%2F%3E%0A%20%20%20%20%20%20%3Cpath%0A%20%20%20%20%20%20%20%20d%3D%22m20.05%2086.045v-0.045285c-6.0798%200-11.257%203.8564-13.207%209.2507-1.9631%205.3748-0.47868%2011.63%204.1686%2015.519%205.4162%204.5336%2013.258%204.2889%2018.375-0.2846l-0.0192-0.0161c2.4219-2.1464%204.0939-5.1163%204.5748-8.4695h-5.0945q-0.1527%200.6663-0.4092%201.3128-0.6879%201.7331-2.0091%203.0512-1.3213%201.318-3.0587%202.0041-1.6001%200.6319-3.3211%200.6319-1.7209%200-3.321-0.6319-1.7374-0.6861-3.0587-2.0041-1.3213-1.3181-2.0091-3.0512-0.63347-1.5961-0.63346-3.3128%200-1.5702%200.52996-3.0395%200.54154-1.4842%201.5643-2.7%201.1062-1.3151%202.62-2.1316%201.6437-0.8866%203.5051-1.049%201.8615-0.16246%203.6345%200.42595%201.633%200.54193%202.9513%201.6454l3.2219-3.8302c-2.6269-2.1988-5.8244-3.2736-9.0047-3.2757z%22%0A%20%20%20%20%20%20%20%20fill%3D%22url%28%23g2%29%22%20fill-rule%3D%22evenodd%22%20%2F%3E%0A%20%20%20%20%3C%2Fg%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
  // src/util/constant.js
  var CSENSE_WINDOW_BASE_ZINDEX = 9999;

  // src/util/window.js
  var windowOpen = window.open;
  // [v0.28] 标签页模式：在 /detail/ 页面将 CForge 集成为侧边标签
  function createTabWindow(element, onClose) {
    addStyle(`
      .cforge-modifier-tab { background-color: #2d1b4e !important; color: #c084fc !important; cursor: pointer; }
      .cforge-modifier-tab.cforge-tab-active { background-color: #A855F7 !important; color: #fff !important; }
      .cforge-modifier-panel { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; position: relative; z-index: 1; }
      .cforge-modifier-header { display: flex; align-items: center; padding: 6px 10px; background: linear-gradient(45deg, #2d2d44, #1a1a2e); border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; min-height: 36px; }
      .cforge-modifier-close-btn { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #f87171; cursor: pointer; font-size: 16px; font-weight: 700; width: 28px; height: 28px; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 1; }
      .cforge-modifier-close-btn:hover { background: rgba(239,68,68,0.3); }
      .cforge-modifier-title { flex: 1; text-align: center; color: #e0e0e0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .csense-window input[type="text"], .csense-window input[type="number"], .csense-window input[type="search"], .csense-window input:not([type]), .csense-window select {
        padding: 6px 10px; border: 1px solid rgba(168,85,247,0.25); border-radius: 6px;
        background: rgba(255,255,255,0.05); color: #e0e0e0; font-size: 13px; font-family: inherit;
        outline: none; box-sizing: border-box; transition: border-color 0.2s;
      }
      .csense-window input[type="text"]:focus, .csense-window input[type="number"]:focus, .csense-window input[type="search"]:focus, .csense-window input:not([type]):focus, .csense-window select:focus {
        border-color: rgba(168,85,247,0.6);
      }
      .csense-window input::placeholder { color: rgba(255,255,255,0.3); }
      .csense-window select { cursor: pointer; }
      .csense-window select option { background: #1a1a2e; color: #e0e0e0; }
    `);
    var titleText = "CForge";
    var headerDiv = document.createElement("div");
    headerDiv.className = "cforge-modifier-header";
    var closeBtn = document.createElement("button");
    closeBtn.className = "cforge-modifier-close-btn";
    closeBtn.textContent = "\u2715";
    closeBtn.title = "\u8fd4\u56de";
    closeBtn.style.display = "none";
    closeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      onClose();
    });
    headerDiv.appendChild(closeBtn);
    var titleSpacer = document.createElement("div");
    titleSpacer.style.width = "28px";
    titleSpacer.style.flexShrink = "0";
    headerDiv.appendChild(titleSpacer);
    var titleSpan = document.createElement("span");
    titleSpan.className = "cforge-modifier-title";
    titleSpan.textContent = titleText;
    headerDiv.appendChild(titleSpan);
    var headerSpacer = document.createElement("div");
    headerSpacer.style.width = "28px";
    headerSpacer.style.flexShrink = "0";
    headerDiv.appendChild(headerSpacer);
    var wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;";
    wrapper.appendChild(headerDiv);
    element.classList.add("csense-window");
    element.style.cssText = "width:100%;flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px;box-sizing:border-box;background-color:#1a1a2e;color:#e0e0e0;";
    wrapper.appendChild(element);
    var result = { button: null, window: null, setTitle: function(v) {
      titleText = v;
      titleSpan.textContent = v;
      closeBtn.style.display = (v === "\u4e3b\u9875" || v === "CForge") ? "none" : "flex";
    } };
    function injectTab() {
      // [v0.29] 多选择器匹配，兼容不同页面的 CSS 类名 hash 后缀
      var tabList = document.querySelector("ul.sliderBarTab-3mNt0")
                 || document.querySelector('ul[class*="sliderBarTab"]')
                 || document.querySelector('ul[class*="tabBar"]')
                 || document.querySelector('ul[class*="TabBar"]')
                 || document.querySelector('div[class*="tabList"] ul');
      var panelContainer = document.querySelector("div.sliderBarPanel-3Vk0Z")
                        || document.querySelector('div[class*="sliderBarPanel"]')
                        || document.querySelector('div[class*="panelContainer"]')
                        || document.querySelector('div[class*="PanelContainer"]')
                        || (tabList ? tabList.parentElement.querySelector('div[class*="Panel"], div[class*="panel"]') : null);
      if (!tabList || !panelContainer) {
        if (!injectTab._logged) {
          injectTab._logged = true;
          console.log('[CForge][标签页] 未找到侧边栏元素，500ms后重试… tabList:', !!tabList, 'panelContainer:', !!panelContainer);
          // 列出页面上所有 ul 和可能的侧边栏容器，帮助调试
          var allUls = document.querySelectorAll('ul');
          var ulClasses = Array.from(allUls).map(function(u) { return u.className || '(no class)'; }).slice(0, 20);
          console.log('[CForge][标签页] 页面 ul 元素类名列表:', ulClasses);
        }
        setTimeout(injectTab, 500);
        return;
      }
      console.log('[CForge][标签页] 找到侧边栏元素! tabList:', tabList.className, 'panelContainer:', panelContainer.className);
      if (tabList.querySelector(".cforge-modifier-tab")) {
        if (!panelContainer.contains(wrapper)) {
          var existingPanel = panelContainer.querySelector(".cforge-modifier-panel");
          if (existingPanel) { existingPanel.appendChild(wrapper); }
        }
        return;
      }
      // [v0.29] 从已有 tab 元素动态获取 class 名，避免硬编码 hash 后缀
      var existingTabs = tabList.querySelectorAll('li');
      var tabItemClass = 'cforge-modifier-tab';
      var activeClass = 'active-2X4mj';
      if (existingTabs.length > 0) {
        var firstTab = existingTabs[0];
        var firstTabClasses = firstTab.className.split(/\s+/).filter(function(c) { return c && c.indexOf('cforge') === -1; });
        tabItemClass = firstTabClasses.join(' ') + ' cforge-modifier-tab';
        // 检测 active class
        var activeMatch = firstTab.className.match(/active-[A-Za-z0-9_]+/);
        if (activeMatch) activeClass = activeMatch[0];
      }
      var tab = document.createElement("li");
      tab.className = tabItemClass;
      var icon = document.createElement("img");
      icon.src = logo_default;
      icon.style.cssText = "width:14px;height:14px;display:block;margin:0 auto 3px;";
      tab.appendChild(icon);
      tab.appendChild(document.createTextNode("\u4fee\u6539\u5668"));
      var panel = document.createElement("div");
      panel.className = "cforge-modifier-panel";
      panel.style.cssText = "display:none;width:100%;height:100%;";
      panel.appendChild(wrapper);
      tabList.appendChild(tab);
      panelContainer.appendChild(panel);
      console.log('[CForge] \u5df2\u6ce8\u5165\u201c\u4fee\u6539\u5668\u201d\u6807\u7b7e\u9875 (tabClass:', tabItemClass, ', activeClass:', activeClass, ')');
      // [v0.30] helper: get platform active class from element
      function getPlatformActiveClass(el) {
        var m = el.className.match(/active[A-Za-z0-9_-]*/);
        return m ? m[0] : activeClass;
      }
      tab.addEventListener("click", function(e) {
        e.stopPropagation();
        tabList.querySelectorAll('li').forEach(function(t) {
          if (t !== tab) {
            var pac = getPlatformActiveClass(t);
            if (pac) t.classList.remove(pac);
          }
        });
        tab.classList.add('cforge-tab-active');
        Array.from(panelContainer.children).forEach(function(p) { if (p !== panel) p.style.display = "none"; });
        panel.style.display = "flex";
      });
      tabList.querySelectorAll('li').forEach(function(t) {
        if (t !== tab) {
          t.addEventListener("click", function() {
            tab.classList.remove('cforge-tab-active');
            panel.style.display = "none";
            // [v0.31] 清除CForge对平台面板设置的inline display:none，恢复平台原生显隐逻辑
            Array.from(panelContainer.children).forEach(function(p) {
              if (p !== panel && p.style.display === "none") {
                p.style.display = "";
              }
            });
          });
        }
      });
      var obs = new MutationObserver(function() {
        if (!tabList.contains(tab) || !panelContainer.contains(panel)) {
          obs.disconnect();
          setTimeout(injectTab, 100);
        }
      });
      obs.observe(tabList, { childList: true });
      obs.observe(panelContainer, { childList: true });
    }
    injectTab();
    return result;
  }
  function createWindow(element, onClose) {
    let shadowContainer = null;
    let shadowRoot = null;
    function ensureShadowContainer() {
      if (shadowContainer && shadowRoot) {
        return shadowRoot;
      }
      if (document.body) {
        shadowContainer = document.createElement("div");
        document.body.appendChild(shadowContainer);
        shadowRoot = shadowContainer.attachShadow({ mode: "closed" });
        return shadowRoot;
      }
      return null;
    }
    function pollForBody() {
      const checkInterval = setInterval(() => {
        const root = ensureShadowContainer();
        if (root) {
          clearInterval(checkInterval);
        }
      }, 500);
    }
    pollForBody();
    const reopenButton = document.createElement("button");
    reopenButton.style.position = "fixed";
    reopenButton.style.bottom = "20px";
    reopenButton.style.right = "20px";
    reopenButton.style.zIndex = String(CSENSE_WINDOW_BASE_ZINDEX);
    reopenButton.style.padding = "10px";
    reopenButton.style.color = "white";
    reopenButton.style.border = "none";
    reopenButton.style.cursor = "pointer";
    reopenButton.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
    reopenButton.style.width = "50px";
    reopenButton.style.height = "50px";
    reopenButton.style.borderRadius = "50%";
    reopenButton.style.background = "linear-gradient(45deg, #2d2d44, #1a1a2e)";
    reopenButton.title = "--CForge弹窗点击打开--";
    const image = document.createElement("img");
    image.src = logo_default;
    image.alt = "CForge";
    reopenButton.appendChild(image);
    let isDraggingButton = false;
    let hasPositionChanged = false;
    let buttonOffsetX, buttonOffsetY;
    reopenButton.addEventListener("mousedown", (e) => {
      isDraggingButton = true;
      hasPositionChanged = false;
      buttonOffsetX = e.clientX - reopenButton.getBoundingClientRect().left;
      buttonOffsetY = e.clientY - reopenButton.getBoundingClientRect().top;
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (isDraggingButton) {
        delete reopenButton.style.bottom;
        delete reopenButton.style.right;
        reopenButton.style.left = e.clientX - buttonOffsetX + "px";
        reopenButton.style.top = e.clientY - buttonOffsetY + "px";
        hasPositionChanged = true;
        e.preventDefault();
      }
    });
    document.addEventListener("mouseup", (e) => {
      if (isDraggingButton) {
        if (hasPositionChanged) {
          isDraggingButton = false;
        } else {
          reopenButton.style.display = "none";
          floatingDiv.style.display = "block";
          if (reopenButton.style.top) floatingDiv.style.top = reopenButton.style.top;
          if (reopenButton.style.left) floatingDiv.style.left = reopenButton.style.left;
          floatingDiv.animate([{ opacity: "0" }, { opacity: "1" }], {
            duration: 300,
            easing: "ease-in-out"
          });
        }
        e.preventDefault();
      }
    });
    const rootForButton = ensureShadowContainer();
    if (rootForButton) {
      rootForButton.appendChild(reopenButton);
    } else {
      const addButtonInterval = setInterval(() => {
        const r = ensureShadowContainer();
        if (r) {
          r.appendChild(reopenButton);
          clearInterval(addButtonInterval);
        }
      }, 500);
    }
    function closeFloatingDiv() {
      floatingDiv.style.display = "none";
      reopenButton.style.display = "block";
    }
    const floatingDiv = document.createElement("div");
    floatingDiv.className = "csense-window";
    floatingDiv.style.position = "fixed";
    floatingDiv.style.minWidth = "240px";
    floatingDiv.style.minHeight = "120px";
    floatingDiv.style.width = "auto";
    floatingDiv.style.height = "auto";
    floatingDiv.style.maxHeight = "calc(100vh - 40px)";
    floatingDiv.style.display = "flex";
    floatingDiv.style.flexDirection = "column";
    floatingDiv.style.backgroundColor = "#1a1a2e";
    floatingDiv.style.color = "#e0e0e0";
    floatingDiv.style.border = "1px solid #ffffff";
    floatingDiv.style.borderRadius = "8px";
    floatingDiv.style.zIndex = "9999";
    floatingDiv.style.top = "20px";
    floatingDiv.style.left = "20px";
    floatingDiv.style.overflow = "hidden";
    floatingDiv.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    let isDragging = false;
    let offsetX, offsetY;
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.padding = "10px";
    header.style.background = "linear-gradient(45deg, #2d2d44, #1a1a2e)";
    header.style.color = "white";
    header.style.cursor = "move";
    header.style.borderTopLeftRadius = "8px";
    header.style.borderTopRightRadius = "8px";
    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - floatingDiv.getBoundingClientRect().left;
      offsetY = e.clientY - floatingDiv.getBoundingClientRect().top;
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        floatingDiv.style.left = e.clientX - offsetX + "px";
        floatingDiv.style.top = e.clientY - offsetY + "px";
        e.preventDefault();
      }
    });
    document.addEventListener("mouseup", (e) => {
      if (isDragging) {
        isDragging = false;
        e.preventDefault();
      }
    });
    const logo = document.createElement("img");
    logo.src = logo_default;
    logo.alt = "CForge";
    logo.style.cursor = "pointer";
    logo.style.height = "24px";
    logo.style.marginRight = "10px";
    let isRotating = false;
    let rotation = 0;
    function rotate() {
      if (isRotating) {
        rotation += 15;
        logo.style.transform = `rotate(${rotation}deg)`;
        requestAnimationFrame(rotate);
      }
    }
    logo.addEventListener("mouseover", () => {
      logo.style.filter = "brightness(1.5) drop-shadow(0 0 4px rgba(108,92,231,0.8))";
      if (!isRotating) {
        logo.style.transition = "transform 0.3s linear, filter 0.3s ease";
        isRotating = true;
        rotate();
      }
    });
    logo.addEventListener("mouseout", () => {
      logo.style.filter = "brightness(1) drop-shadow(none)";
      isRotating = false;
      rotation = 0;
      logo.style.transition = "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1), filter 0.3s ease";
      logo.style.transform = `rotate(0deg)`;
    });
    // Click logo to collapse window to floating ball
    logo.addEventListener("click", (e) => {
      e.stopPropagation();
      closeFloatingDiv();
    });
    header.appendChild(logo);
    const title = document.createElement("strong");
    title.textContent = "CForge";
    title.style.flexGrow = "1";
    title.style.textAlign = "left";
    title.style.fontFamily = "monospace";
    title.style.fontSize = "1em";
    title.style.fontWeight = "normal";
    header.appendChild(title);
    const closeButton = document.createElement("button");
    closeButton.style.background = "none";
    closeButton.style.border = "none";
    closeButton.style.color = "white";
    closeButton.style.cursor = "pointer";
    closeButton.textContent = "✖";
    closeButton.addEventListener("click", () => {
      if (onClose()) closeFloatingDiv();
    });
    header.appendChild(closeButton);
    floatingDiv.appendChild(header);
    element.style.flex = "1 1 auto";
    element.style.overflowY = "auto";
    element.style.minHeight = "0";
    element.style.maxHeight = "calc(100vh - 80px)";
    floatingDiv.appendChild(element);
    closeFloatingDiv();
    const rootForWindow = ensureShadowContainer();
    if (rootForWindow) {
      rootForWindow.appendChild(floatingDiv);
    } else {
      const addWindowInterval = setInterval(() => {
        const r = ensureShadowContainer();
        if (r) {
          r.appendChild(floatingDiv);
          clearInterval(addWindowInterval);
        }
      }, 500);
    }
    return {
      button: reopenButton,
      window: floatingDiv,
      setTitle: (v) => {
        title.textContent = v;
      }
    };
  }
  function createScrollable() {
    const scrollable = document.createElement("div");
    scrollable.style.maxHeight = "300px";
    scrollable.style.maxWidth = "500px";
    scrollable.style.overflowY = "auto";
    scrollable.style.padding = "0";
    scrollable.style.margin = "0";
    return scrollable;
  }

  // src/api/vmapi.js
  var Variable = class _Variable {
    static freezed = Symbol("LockedByCSense");
    constructor(target, id) {
      this.variable = target.variables[id];
    }
    get() {
      return this.variable.value;
    }
    set(v) {
      this.variable.value = v;
      return this;
    }
    get freezing() {
      return !!this.variable[_Variable.freezed];
    }
    set freezing(v) {
      if (v) {
        if (this.variable[_Variable.freezed]) return;
        this.variable[_Variable.freezed] = true;
        this.watch(function(before) {
          return before;
        });
      } else {
        delete this.variable[_Variable.freezed];
        this.unwatch();
      }
    }
    watch(callback) {
      let variable = this.variable.value;
      Object.defineProperty(this.variable, "value", {
        get() {
          return variable;
        },
        set(value) {
          const oldValue = variable;
          variable = callback(oldValue, value);
        },
        configurable: true
      });
    }
    unwatch() {
      const freezedValue = this.variable.value;
      delete this.variable.value;
      this.variable.value = freezedValue;
    }

  };
  var ListVariable = class _ListVariable {
    static freezed = Symbol("LockedByCForge_List");
    constructor(target, listId, index) {
      this.listObj = target.lists[listId];
      this.index = index;
    }
    get() {
      return this.listObj.value[this.index];
    }
    set(v) {
      this.listObj.value[this.index] = v;
      return this;
    }
    get freezing() {
      return !!this.listObj.value[this._freezedKey];
    }
    get _freezedKey() {
      return `${_ListVariable.freezed.toString()}_${this.index}`;
    }
    set freezing(v) {
      if (v) {
        if (this.listObj[this._freezedKey]) return;
        this.listObj[this._freezedKey] = true;
      } else {
        delete this.listObj[this._freezedKey];
      }
    }
  };
  var VMAPI = class {
    constructor(vm2) {
      this.instance = vm2;
    }
    sprite(name) {
      const v = this.instance.runtime.targets.find((t) => t.sprite.name === name);
      if (!v) return null;
      return new VMSprite(v.sprite);
    }
  };
  var VMSprite = class {
    constructor(sprite) {
      this.sprite = sprite;
    }
    get clones() {
      return this.sprite.clones.map((v) => new VMTarget(v));
    }
    on(event, callback) {
      if (event === "clone") {
        patch(this.sprite, "createClone", (createClone) => {
          return function(...args) {
            const res = createClone.call(this, ...args);
            callback(res);
            return res;
          };
        });
      }
    }
  };
  var VMTarget = class {
    constructor(target) {
      this.target = target;
    }
    varId(id) {
      if (this.target.variables[id]) return new Variable(this.target, id);
      return null;
    }
    var(name) {
      const v = Object.values(this.target.variables).find((v2) => v2.name === name);
      if (v) return new Variable(this.target, v.id);
      return null;
    }
  };

  // src/scene/project.js
  var ProjectScene = class {
    static title = "项目";
    constructor(manager, JSZip, input) {
      this.manager = manager;
      this.vm = state_default.vm;
      this.JSZip = JSZip;
      this.input = input;
    }
    render() {
      const target = this.manager.target;
      const searchContainer = document.createElement("div");
      searchContainer.style.display = "flex";
      searchContainer.style.justifyContent = "center";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "搜索角色...";
      searchInput.style.padding = "5px";
      searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
      searchInput.style.width = "100%";
      searchInput.style.boxSizing = "border-box";
      const downloadButton = document.createElement("button");
      downloadButton.textContent = "⬇️";
      downloadButton.title = "下载该项目";
      downloadButton.style.padding = "10px";
      downloadButton.style.border = "none";
      downloadButton.style.cursor = "pointer";
      downloadButton.style.background = "rgb(0, 123, 255)";
      downloadButton.style.color = "white";
      downloadButton.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
      downloadButton.addEventListener("click", async () => {
        downloadButton.disabled = true;
        downloadButton.textContent = "\u23F3 \u51C6\u5907\u4E0B\u8F7D";
        progressBar.style.display = "block";
        progressFill.style.width = "5%";
        progressText.textContent = "\u51C6\u5907\u4E0B\u8F7D\u4E2D...";

        try {
          let zip = null;
          let projectJson = null;
          progressFill.style.width = "10%";
          if (typeof this.input === "string" || typeof this.input === "object" && !(this.input instanceof ArrayBuffer) && !(this.input instanceof Uint8Array)) {
            zip = new this.JSZip();
            zip.file("project.json", this.input);
            projectJson = JSON.parse(this.input);
          } else {
            zip = await this.JSZip.loadAsync(this.input);
            const projectFile = zip.file("project.json");
            projectJson = JSON.parse(await projectFile.async("string"));
          }

          const filesToFetch = [];
          if (projectJson.gandi?.assets) {
            projectJson.gandi.assets.forEach((asset) => {
              filesToFetch.push([
                `${asset.md5ext}`,
                `https://m.ccw.site/user_projects_assets/${encodeURIComponent(asset.md5ext)}`
              ]);
            });
          }
          for (const target2 of projectJson.targets) {
            target2.sounds.forEach((sound) => {
              filesToFetch.push([
                `${sound.md5ext}`,
                `https://m.ccw.site/user_projects_assets/${encodeURIComponent(sound.md5ext)}`
              ]);
            });
            target2.costumes.forEach((costume) => {
              filesToFetch.push([
                `${costume.md5ext}`,
                `https://m.ccw.site/user_projects_assets/${encodeURIComponent(costume.md5ext)}`
              ]);
            });
          }

          progressFill.style.width = "15%";
          progressText.textContent = `\u51C6\u5907\u4E0B\u8F7D ${filesToFetch.length} \u4E2A\u6587\u4EF6...`;

          const totalFiles = filesToFetch.length;
          let completedCount = 0;
          let failedCount = 0;
          let failedFiles = [];

          const fetchWithRetry = async (url, md5ext, maxRetries) => {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                if (blob.size === 0) throw new Error("Empty response");
                return blob;
              } catch (err) {
                if (attempt < maxRetries - 1) {
                  await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
                } else {
                  throw err;
                }
              }
            }
          };

          const concurrency = 16;
          let index = 0;
          await Promise.all(
            new Array(concurrency).fill(0).map(async () => {
              while (index < filesToFetch.length) {
                const myIdx = index++;
                const [md5ext, url2] = filesToFetch[myIdx];
                if (zip.file(md5ext)) {
                  completedCount++;
                  const pct = 15 + (completedCount / totalFiles) * 70;
                  progressFill.style.width = pct + "%";
                  progressText.textContent = `\u4E0B\u8F7D\u4E2D ${completedCount}/${totalFiles}`;
                  continue;
                }
                try {
                  const blob = await fetchWithRetry(url2, md5ext, 3);
                  zip.file(md5ext, blob);
                  completedCount++;
                } catch (e) {
                  failedCount++;
                  failedFiles.push({ md5ext, url: url2, error: e.message });
                  completedCount++;
                }
                const pct = 15 + (completedCount / totalFiles) * 70;
                progressFill.style.width = pct + "%";
                progressText.textContent = `\u4E0B\u8F7D\u4E2D ${completedCount}/${totalFiles}` + (failedCount > 0 ? ` (\u5931\u8D25${failedCount})` : "");
              }
            })
          );

          // Retry failed files once more
          if (failedFiles.length > 0) {
            progressText.textContent = `\u91CD\u8BD5 ${failedFiles.length} \u4E2A\u5931\u8D25\u6587\u4EF6...`;
            progressFill.style.width = "88%";
            const stillFailed = [];
            for (const f of failedFiles) {
              try {
                const blob = await fetchWithRetry(f.url, f.md5ext, 2);
                zip.file(f.md5ext, blob);
              } catch (e2) {
                stillFailed.push(f.md5ext);
              }
            }
            if (stillFailed.length > 0) {
              console.warn("Failed files after retry:", stillFailed);
              progressText.textContent = `\u4E0B\u8F7D\u5B8C\u6210 (\u26A0 ${stillFailed.length}\u4E2A\u6587\u4EF6\u5931\u8D25)`;
              progressFill.style.width = "92%";
              progressFill.style.background = "linear-gradient(90deg, #e17055, #fdcb6e)";
            } else {
              failedCount = 0;
            }
          }

          progressFill.style.width = "95%";
          progressText.textContent = "\u538B\u7F29\u4E2D...";
          const content = await zip.generateAsync({ type: "arraybuffer" });
          progressFill.style.width = "100%";
          progressText.textContent = "\u4E0B\u8F7D\u5B8C\u6210!";
          const url = URL.createObjectURL(new Blob([content], { type: "application/zip" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = "ccw\u9879\u76EE\u4E0B\u8F7D.sb3";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error("Download failed:", err);
          progressFill.style.width = "100%";
          progressFill.style.background = "#e74c3c";
          progressText.textContent = "\u4E0B\u8F7D\u5931\u8D25: " + err.message;
        }

        setTimeout(() => {
          downloadButton.disabled = false;
          downloadButton.textContent = "\u2B07\uFE0F";
          progressBar.style.display = "none";
          progressFill.style.width = "0%";
          progressFill.style.background = "linear-gradient(90deg, #6c5ce7, #a29bfe)";
          progressText.textContent = "";
        }, 3000);
      });
      searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const items = spriteList.children;
        let hasResults = false;
        Array.from(items).forEach((item) => {
          if (item.className !== "no-results" && item.querySelector(".item-name").textContent.toLowerCase().includes(filter)) {
            item.style.display = "flex";
            hasResults = true;
          } else if (item.className !== "no-results") {
            item.style.display = "none";
          }
        });
        if (!hasResults) {
          if (!spriteList.querySelector(".no-results")) {
            const noResultsItem = document.createElement("li");
            noResultsItem.textContent = "(无结果)";
            noResultsItem.className = "no-results";
            noResultsItem.style.display = "flex";
            noResultsItem.style.justifyContent = "center";
            noResultsItem.style.alignItems = "center";
            noResultsItem.style.width = "100%";
            noResultsItem.style.height = "100%";
            noResultsItem.style.color = "#a0a0b0";
            spriteList.appendChild(noResultsItem);
          }
        } else {
          const noResultsItem = spriteList.querySelector(".no-results");
          if (noResultsItem) {
            spriteList.removeChild(noResultsItem);
          }
        }
      });
      searchContainer.appendChild(searchInput);
      searchContainer.appendChild(downloadButton);

      const progressBar = document.createElement("div");
      progressBar.style.width = "100%";
      progressBar.style.height = "20px";
      progressBar.style.backgroundColor = "#2a2a3d";
      progressBar.style.borderRadius = "4px";
      progressBar.style.overflow = "hidden";
      progressBar.style.marginTop = "8px";
      progressBar.style.display = "none";
      progressBar.style.border = "1px solid rgba(255,255,255,0.15)";
      const progressFill = document.createElement("div");
      progressFill.style.height = "100%";
      progressFill.style.width = "0%";
      progressFill.style.background = "linear-gradient(90deg, #6c5ce7, #a29bfe)";
      progressFill.style.transition = "width 0.3s ease";
      progressBar.appendChild(progressFill);
      const progressText = document.createElement("div");
      progressText.style.position = "absolute";
      progressText.style.width = "100%";
      progressText.style.textAlign = "center";
      progressText.style.fontSize = "10px";
      progressText.style.color = "#e0e0e0";
      progressText.style.lineHeight = "20px";
      progressText.style.top = "0";
      progressText.style.pointerEvents = "none";
      progressText.textContent = "";
      progressBar.style.position = "relative";
      progressBar.appendChild(progressText);
      target.appendChild(progressBar);
      target.appendChild(searchContainer);
      const scrollable = createScrollable();
      const spriteList = document.createElement("ul");
      spriteList.style.marginTop = "10px";
      spriteList.style.padding = "0";
      spriteList.style.margin = "0";
      spriteList.style.listStyleType = "none";
      const sprites = this.vm.runtime.targets.filter((target2) => target2.isOriginal).map((target2) => target2.sprite);
      sprites.forEach((sprite) => {
        const listItem = document.createElement("li");
        listItem.style.display = "flex";
        listItem.style.flexDirection = "column";
        listItem.style.alignItems = "center";
        listItem.style.flex = "1 1 calc(25% - 10px)";
        listItem.style.maxWidth = "25%";
        listItem.style.margin = "5px";
        listItem.style.boxSizing = "border-box";
        listItem.style.textAlign = "center";
        listItem.style.padding = "10px";
        listItem.style.border = "1px solid rgba(255,255,255,0.3)";
        listItem.style.borderRadius = "8px";
        listItem.style.backgroundColor = "#2a2a3d";
        listItem.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        listItem.addEventListener("mouseover", () => {
          listItem.style.transform = "scale(1.05)";
          listItem.style.transition = "transform 0.2s ease-in-out";
        });
        listItem.addEventListener("mouseout", () => {
          listItem.style.transform = "scale(1)";
        });
        listItem.addEventListener("click", () => {
          this.manager.open(new SpriteEditScene(this.manager, sprite));
        });
        const spriteImage = document.createElement("img");
        spriteImage.src = sprite.costumes[0].asset.encodeDataURI();
        spriteImage.alt = sprite.name;
        spriteImage.style.width = "100%";
        spriteImage.style.height = "100%";
        spriteImage.style.marginBottom = "5px";
        const spriteName = document.createElement("div");
        spriteName.title = spriteName.textContent = sprite.name;
        spriteName.style.width = "80px";
        spriteName.className = "item-name";
        spriteName.style.fontSize = "14px";
        spriteName.style.fontWeight = "bold";
        spriteName.style.whiteSpace = "nowrap";
        spriteName.style.overflow = "hidden";
        spriteName.style.textOverflow = "ellipsis";
        listItem.appendChild(spriteImage);
        listItem.appendChild(spriteName);
        spriteList.appendChild(listItem);
      });
      spriteList.style.display = "flex";
      spriteList.style.flexWrap = "wrap";
      scrollable.appendChild(spriteList);
      target.appendChild(scrollable);
    }
    dispose() {
    }
  };

  // src/scene/spriteEdit.js
  var SpriteEditScene = class {
    static title = "\u{1F3AF} \u89D2\u8272\u7F16\u8F91";
    constructor(manager, sprite) {
      this.manager = manager;
      this.sprite = sprite;
      this.runtime = sprite.runtime;
      this.lockStates = {};
      this.propInputs = {};
      this.selected = 0;
      this.disposed = false;
      this.lastCloneCount = null;

      // Variable management (merged from SpriteScene)
      this.isRunning = this.runtime.frameLoop.running;
      Object.defineProperty(this.runtime.frameLoop, "running", {
        get: () => this.isRunning,
        set: (value) => {
          this.isRunning = value;
          if (this.pauseButton) this.modifyPauseState(this.pauseButton);
        },
        configurable: true
      });
      this.lastFocused = null;
      this.lastPropFocused = null;
      this.pauseButton = null;
      this.varInputs = {};
      const animationFrame = () => {
        if (this.sprite.clones.length !== this.lastCloneCount) {
          this.lastCloneCount = this.sprite.clones.length;
          if (this.selected >= this.sprite.clones.length) {
            this.selected = Math.max(0, this.sprite.clones.length - 1);
          }
        }
        if (!this.disposed) {
          for (const [prop, input] of Object.entries(this.propInputs)) {
            const clone = this.sprite.clones[this.selected];
            if (!clone) continue;
            if (this.lockStates[prop]) {
              // Locked: write the frozen value back to VM every frame
              const lockedVal = parseFloat(input.value);
              if (!isNaN(lockedVal)) {
                this[prop] = lockedVal;
              }
              continue;
            }
            let val;
            if (prop === "x" || prop === "y") {
              val = Math.round(clone[prop]);
            } else if (prop === "direction") {
              val = Math.round(clone.direction);
            } else if (prop === "size") {
              val = Math.round(clone.size);
            }
            if (val !== undefined && String(val) !== input.value && input !== this.lastPropFocused) {
              input.value = String(val);
            }
          }
        // Variable value sync (merged from SpriteScene)
        for (const [id, value] of Object.entries(this.varInputs)) {
          const rawVal = this.sprite.clones[this.selected].variables[id].value;
          const content = Array.isArray(rawVal) ? JSON.stringify(rawVal) : String(rawVal);
          if (value.value !== content && value !== this.lastFocused) {
            value.animate([{ color: "red" }, { color: "" }], { duration: 300 });
            value.value = content;
          }
        }
          requestAnimationFrame(animationFrame);
        }
      };
      requestAnimationFrame(animationFrame);
    }

    _makePropRow(label, prop, target, defaultVal) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.marginBottom = "6px";
      row.style.padding = "4px 6px";
      row.style.border = "1px solid rgba(255,255,255,0.15)";
      row.style.borderRadius = "4px";
      row.style.backgroundColor = "#16162a";
      const lbl = document.createElement("span");
      lbl.textContent = label;
      lbl.style.width = "50px";
      lbl.style.fontSize = "11px";
      lbl.style.color = "#a0a0b0";
      lbl.style.flexShrink = "0";
      const inp = document.createElement("input");
      inp.type = "number";
      inp.style.flexGrow = "1";
      inp.style.fontFamily = "monospace";
      inp.style.fontSize = "11px";
      inp.style.marginLeft = "4px";
      inp.style.marginRight = "4px";
      inp.style.backgroundColor = "#1a1a2e";
      inp.style.color = "#e0e0e0";
      inp.style.border = "1px solid rgba(255,255,255,0.25)";
      inp.style.borderRadius = "3px";
      inp.style.padding = "3px 5px";
      inp.style.boxSizing = "border-box";
      inp.style.outline = "none";
      inp.value = String(defaultVal);
      inp.addEventListener("change", () => {
        if (!this.lockStates[prop]) {
          this[prop] = parseFloat(inp.value) || 0;
        }
      });
      inp.addEventListener("focus", () => { this.lastPropFocused = inp; inp.style.borderColor = "#6c5ce7"; });
      inp.addEventListener("blur", () => {
        inp.style.borderColor = "rgba(255,255,255,0.25)";
        setTimeout(() => { if (this.lastPropFocused === inp) this.lastPropFocused = null; }, 500);
      });
      this.propInputs[prop] = inp;
      const lockBtn = document.createElement("button");
      lockBtn.textContent = "\u{1F513}";
      lockBtn.title = "\u70B9\u51FB\u9501\u5B9A";
      lockBtn.style.background = "none";
      lockBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      lockBtn.style.color = "#e0e0e0";
      lockBtn.style.cursor = "pointer";
      lockBtn.style.fontSize = "12px";
      lockBtn.style.padding = "2px 4px";
      lockBtn.style.borderRadius = "3px";
      lockBtn.style.flexShrink = "0";
      lockBtn.addEventListener("click", () => {
        this.lockStates[prop] = !this.lockStates[prop];
        if (this.lockStates[prop]) {
          inp.disabled = true;
          inp.style.opacity = "0.5";
          lockBtn.textContent = "\u{1F512}";
          lockBtn.title = "\u70B9\u51FB\u89E3\u9501";
          lockBtn.style.borderColor = "#6c5ce7";
          lockBtn.style.color = "#6c5ce7";
        } else {
          inp.disabled = false;
          inp.style.opacity = "1";
          lockBtn.textContent = "\u{1F513}";
          lockBtn.title = "\u70B9\u51FB\u9501\u5B9A";
          lockBtn.style.borderColor = "rgba(255,255,255,0.2)";
          lockBtn.style.color = "#e0e0e0";
        }
      });
      row.appendChild(lbl);
      row.appendChild(inp);
      row.appendChild(lockBtn);
      return row;
    }

    modifyPauseState(pauseButton) {
      pauseButton.textContent = this.isRunning ? "\u23F8\uFE0F" : "\u25B6\uFE0F";
      pauseButton.title = this.isRunning ? "\u6682\u505C" : "\u7EE7\u7EED";
      pauseButton.style.padding = "5px";
      pauseButton.style.border = "none";
      pauseButton.style.borderRadius = "5px";
      pauseButton.style.color = "white";
      pauseButton.style.backgroundColor = this.isRunning ? "#6c5ce7" : "#e9ae3b";
      pauseButton.style.cursor = "pointer";
      pauseButton.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
      pauseButton.style.width = "30px";
      pauseButton.style.height = "30px";
    }

    render() {
      const panel = this.manager.target;
      const sprite = this.sprite;
      const clones = sprite.clones;
      this.lastCloneCount = clones.length;

      // Header info
      const header = document.createElement("div");
      header.style.padding = "8px";
      header.style.marginBottom = "8px";
      header.style.backgroundColor = "#2a2a3d";
      header.style.borderRadius = "6px";
      header.style.border = "1px solid rgba(255,255,255,0.2)";
      header.style.textAlign = "center";
      const nameEl = document.createElement("div");
      nameEl.textContent = sprite.name;
      nameEl.style.fontSize = "15px";
      nameEl.style.fontWeight = "bold";
      nameEl.style.color = "#e0e0e0";
      const costumeImg = document.createElement("img");
      try { costumeImg.src = sprite.costumes[0].asset.encodeDataURI(); } catch(e) {}
      costumeImg.style.width = "48px";
      costumeImg.style.height = "48px";
      costumeImg.style.marginTop = "6px";
      costumeImg.style.imageRendering = "pixelated";
      header.appendChild(nameEl);
      header.appendChild(costumeImg);
      panel.appendChild(header);

      // Clone selector
      const cloneRow = document.createElement("div");
      cloneRow.style.display = "flex";
      cloneRow.style.alignItems = "center";
      cloneRow.style.marginBottom = "8px";
      cloneRow.style.padding = "4px 6px";
      cloneRow.style.backgroundColor = "#16162a";
      cloneRow.style.borderRadius = "4px";
      cloneRow.style.border = "1px solid rgba(255,255,255,0.15)";
      const cloneLabel = document.createElement("span");
      cloneLabel.textContent = "\u514B\u9686\u4F53:";
      cloneLabel.style.fontSize = "11px";
      cloneLabel.style.color = "#a0a0b0";
      cloneLabel.style.marginRight = "6px";
      const cloneSelect = document.createElement("select");
      cloneSelect.style.flexGrow = "1";
      cloneSelect.style.padding = "3px 5px";
      cloneSelect.style.backgroundColor = "#1a1a2e";
      cloneSelect.style.color = "#e0e0e0";
      cloneSelect.style.border = "1px solid rgba(255,255,255,0.25)";
      cloneSelect.style.borderRadius = "3px";
      cloneSelect.style.fontSize = "11px";
      cloneSelect.style.outline = "none";
      for (let i = 0; i < clones.length; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = i === 0 ? "\u539F\u89D2\u8272" : "\u514B\u9686\u4F53 #" + i;
        cloneSelect.appendChild(opt);
      }
      cloneSelect.addEventListener("change", () => {
        const idx = parseInt(cloneSelect.value);
        if (idx >= 0 && idx < this.sprite.clones.length) {
          this.selected = idx;
          this.manager.requestUpdate();
        }
      });
      const totalSpan = document.createElement("span");
      totalSpan.style.fontSize = "10px";
      totalSpan.style.color = "#a0a0b0";
      totalSpan.style.marginLeft = "6px";
      totalSpan.textContent = "\u5171 " + clones.length;
      cloneRow.appendChild(cloneLabel);
      cloneRow.appendChild(cloneSelect);
      cloneRow.appendChild(totalSpan);
      panel.appendChild(cloneRow);

      // Section title
      const sectionTitle = document.createElement("div");
      sectionTitle.textContent = "\u{1F4D0} \u5C5E\u6027\u7F16\u8F91";
      sectionTitle.style.fontSize = "12px";
      sectionTitle.style.fontWeight = "bold";
      sectionTitle.style.color = "#a0a0b0";
      sectionTitle.style.marginBottom = "6px";
      sectionTitle.style.padding = "0 4px";
      panel.appendChild(sectionTitle);

      // Init lock states
      const props = ["x", "y", "size", "direction"];
      props.forEach(p => { if (!this.lockStates[p]) this.lockStates[p] = false; });

      const clone0 = clones[0];
      const scrollable = document.createElement("div");
      scrollable.style.overflowY = "auto";
      scrollable.style.maxHeight = "320px";
      scrollable.style.paddingRight = "2px";

      // Position section
      const posTitle = document.createElement("div");
      posTitle.textContent = "\u{1F4CD} \u4F4D\u7F6E";
      posTitle.style.fontSize = "11px";
      posTitle.style.color = "#8080a0";
      posTitle.style.marginBottom = "4px";
      posTitle.style.marginTop = "2px";
      scrollable.appendChild(posTitle);

      const posGrid = document.createElement("div");
      posGrid.style.display = "grid";
      posGrid.style.gridTemplateColumns = "1fr 1fr";
      posGrid.style.gap = "4px";
      posGrid.appendChild(this._makePropRow("X", "x", clone0, Math.round(clone0.x)));
      posGrid.appendChild(this._makePropRow("Y", "y", clone0, Math.round(clone0.y)));
      scrollable.appendChild(posGrid);

      // Transform section
      const transTitle = document.createElement("div");
      transTitle.textContent = "\u{1F504} \u53D8\u6362";
      transTitle.style.fontSize = "11px";
      transTitle.style.color = "#8080a0";
      transTitle.style.marginTop = "8px";
      transTitle.style.marginBottom = "4px";
      scrollable.appendChild(transTitle);

      const transGrid = document.createElement("div");
      transGrid.style.display = "grid";
      transGrid.style.gridTemplateColumns = "1fr 1fr";
      transGrid.style.gap = "4px";
      transGrid.appendChild(this._makePropRow("\u5927\u5C0F%", "size", clone0, Math.round(clone0.size)));
      transGrid.appendChild(this._makePropRow("\u65B9\u5411\u00B0", "direction", clone0, Math.round(clone0.direction)));
      scrollable.appendChild(transGrid);

      // Toggles section
      const toggleTitle = document.createElement("div");
      toggleTitle.textContent = "\u{1F518} \u72B6\u6001";
      toggleTitle.style.fontSize = "11px";
      toggleTitle.style.color = "#8080a0";
      toggleTitle.style.marginTop = "8px";
      toggleTitle.style.marginBottom = "4px";
      scrollable.appendChild(toggleTitle);

      const toggleBox = document.createElement("div");
      toggleBox.style.display = "flex";
      toggleBox.style.gap = "6px";
      toggleBox.style.marginBottom = "6px";

      // Visible toggle
      const visBtn = document.createElement("button");
      const updateVisBtn = () => {
        visBtn.textContent = clone0.visible ? "\u{1F441} \u663E\u793A" : "\u{1F6AB} \u9690\u85CF";
        visBtn.style.background = clone0.visible ? "#2d6a4f" : "#4a4a5e";
        visBtn.style.borderColor = clone0.visible ? "#52b788" : "#6c6c7e";
      };
      visBtn.style.border = "1px solid";
      visBtn.style.color = "#e0e0e0";
      visBtn.style.cursor = "pointer";
      visBtn.style.padding = "5px 12px";
      visBtn.style.borderRadius = "4px";
      visBtn.style.fontSize = "11px";
      visBtn.style.flexGrow = "1";
      updateVisBtn();
      visBtn.addEventListener("click", () => {
        if (typeof clone0.setVisible === "function") { clone0.setVisible(!clone0.visible); } else { clone0.visible = !clone0.visible; }
        updateVisBtn();
      });
      toggleBox.appendChild(visBtn);

      // Draggable toggle
      const dragBtn = document.createElement("button");
      const updateDragBtn = () => {
        dragBtn.textContent = clone0.draggable ? "\u{1F512} \u53EF\u62D6\u62FD" : "\u{1F513} \u4E0D\u53EF\u62D6";
        dragBtn.style.background = clone0.draggable ? "#2d6a4f" : "#4a4a5e";
        dragBtn.style.borderColor = clone0.draggable ? "#52b788" : "#6c6c7e";
      };
      dragBtn.style.border = "1px solid";
      dragBtn.style.color = "#e0e0e0";
      dragBtn.style.cursor = "pointer";
      dragBtn.style.padding = "5px 12px";
      dragBtn.style.borderRadius = "4px";
      dragBtn.style.fontSize = "11px";
      dragBtn.style.flexGrow = "1";
      updateDragBtn();
      dragBtn.addEventListener("click", () => {
        if (typeof clone0.setDraggable === "function") { clone0.setDraggable(!clone0.draggable); } else { clone0.draggable = !clone0.draggable; }
        updateDragBtn();
      });
      toggleBox.appendChild(dragBtn);
      scrollable.appendChild(toggleBox);

      // Rotation style
      const rotTitle = document.createElement("div");
      rotTitle.textContent = "\u{1F504} \u65CB\u8F6C\u6A21\u5F0F";
      rotTitle.style.fontSize = "11px";
      rotTitle.style.color = "#8080a0";
      rotTitle.style.marginTop = "6px";
      rotTitle.style.marginBottom = "4px";
      scrollable.appendChild(rotTitle);

      const rotBox = document.createElement("div");
      rotBox.style.display = "flex";
      rotBox.style.gap = "3px";
      rotBox.style.marginBottom = "8px";
      const rotStyles = [
        ["all-around", "\u{1F504} \u5168\u65B9\u5411"],
        ["left-right", "\u{2194} \u5DE6\u53F3"],
        ["don't rotate", "\u{1F6AB} \u4E0D\u65CB\u8F6C"]
      ];
      rotStyles.forEach(([val, text]) => {
        const rb = document.createElement("button");
        rb.textContent = text;
        rb.style.flexGrow = "1";
        rb.style.padding = "4px 2px";
        rb.style.border = "1px solid " + (clone0.rotationStyle === val ? "#6c5ce7" : "rgba(255,255,255,0.2)");
        rb.style.background = clone0.rotationStyle === val ? "#6c5ce7" : "#2a2a3d";
        rb.style.color = "#e0e0e0";
        rb.style.cursor = "pointer";
        rb.style.borderRadius = "4px";
        rb.style.fontSize = "10px";
        rb.addEventListener("click", () => {
          if (typeof clone0.setRotationStyle === "function") { clone0.setRotationStyle(val); } else { clone0.rotationStyle = val; }
          rotBox.querySelectorAll("button").forEach(b => {
            b.style.background = "#2a2a3d";
            b.style.borderColor = "rgba(255,255,255,0.2)";
          });
          rb.style.background = "#6c5ce7";
          rb.style.borderColor = "#6c5ce7";
        });
        rotBox.appendChild(rb);
      });
      scrollable.appendChild(rotBox);

      // Reset all button
      const resetBtn = document.createElement("button");
      resetBtn.textContent = "\u{1F504} \u91CD\u7F6E\u6240\u6709\u9501\u5B9A";
      resetBtn.style.width = "100%";
      resetBtn.style.padding = "5px";
      resetBtn.style.marginTop = "4px";
      resetBtn.style.background = "#4a4a5e";
      resetBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      resetBtn.style.color = "#e0e0e0";
      resetBtn.style.cursor = "pointer";
      resetBtn.style.borderRadius = "4px";
      resetBtn.style.fontSize = "11px";
      resetBtn.addEventListener("click", () => {
        props.forEach(p => { this.lockStates[p] = false; });
        panel.querySelectorAll("button").forEach(btn => {
          if (["\u{1F512}", "\u{1F513}"].includes(btn.textContent.trim())) {
            if (btn !== visBtn && btn !== dragBtn) {
              btn.textContent = "\u{1F513}";
              btn.title = "\u70B9\u51FB\u9501\u5B9A";
              btn.style.borderColor = "rgba(255,255,255,0.2)";
              btn.style.color = "#e0e0e0";
            }
          }
        });
        Object.values(this.propInputs).forEach(inp => {
          inp.disabled = false;
          inp.style.opacity = "1";
        });
      });
      scrollable.appendChild(resetBtn);

      panel.appendChild(scrollable);

      // === Pause/Play Button ===
      const pauseContainer = document.createElement("div");
      pauseContainer.style.display = "flex";
      pauseContainer.style.alignItems = "center";
      pauseContainer.style.marginBottom = "8px";
      const pauseButton = document.createElement("button");
      pauseButton.addEventListener("click", () => {
        if (this.isRunning) {
          this.runtime.frameLoop.stop();
        } else {
          this.runtime.frameLoop.start();
        }
      });
      this.pauseButton = pauseButton;
      this.modifyPauseState(pauseButton);
      pauseContainer.appendChild(pauseButton);
      panel.appendChild(pauseContainer);

      // === 变量管理 Section ===
      const varSectionTitle = document.createElement("div");
      varSectionTitle.textContent = "\u{1F4CA} \u53D8\u91CF\u7BA1\u7406";
      varSectionTitle.style.fontSize = "12px";
      varSectionTitle.style.fontWeight = "bold";
      varSectionTitle.style.color = "#a0a0b0";
      varSectionTitle.style.marginTop = "12px";
      varSectionTitle.style.marginBottom = "6px";
      varSectionTitle.style.padding = "0 4px";
      panel.appendChild(varSectionTitle);

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "搜索变量...";
      searchInput.style.padding = "5px";
      searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
      searchInput.style.width = "100%";
      searchInput.style.boxSizing = "border-box";
      searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const items = variableList.children;
        let hasResults = false;
        Array.from(items).forEach((item) => {
          if (item.className !== "no-results" && item.querySelector(".item-name").textContent.toLowerCase().includes(filter)) {
            item.style.display = "flex";
            hasResults = true;
          } else if (item.className !== "no-results") {
            item.style.display = "none";
          }
        });
        if (!hasResults) {
          if (!variableList.querySelector(".no-results")) {
            const noResultsItem = document.createElement("li");
            noResultsItem.textContent = "(无结果)";
            noResultsItem.className = "no-results";
            noResultsItem.style.display = "flex";
            noResultsItem.style.justifyContent = "center";
            noResultsItem.style.alignItems = "center";
            noResultsItem.style.width = "100%";
            noResultsItem.style.height = "100%";
            noResultsItem.style.color = "#a0a0b0";
            variableList.appendChild(noResultsItem);
          }
        } else {
          const noResultsItem = variableList.querySelector(".no-results");
          if (noResultsItem) {
            variableList.removeChild(noResultsItem);
          }
        }
      });
      panel.appendChild(searchInput);
      const varScrollable = createScrollable();
      const variableList = document.createElement("ul");
      variableList.style.padding = "0";
      variableList.style.margin = "0";
      variableList.style.listStyleType = "none";
      variableList.style.marginTop = "10px";
      if (Object.keys(sprite.clones[this.selected].variables).length === 0) {
        const noResultsItem = document.createElement("li");
        noResultsItem.textContent = "(无结果)";
        noResultsItem.className = "no-results";
        noResultsItem.style.display = "flex";
        noResultsItem.style.justifyContent = "center";
        noResultsItem.style.alignItems = "center";
        noResultsItem.style.width = "100%";
        noResultsItem.style.height = "100%";
        noResultsItem.style.color = "#a0a0b0";
        variableList.appendChild(noResultsItem);
      } else {
        this.varInputs = Object.fromEntries(
          Object.values(sprite.clones[this.selected].variables).map(
            (variable) => {
              const listItem = document.createElement("li");
              listItem.style.display = "flex";
              listItem.style.alignItems = "center";
              listItem.style.marginBottom = "5px";
              listItem.style.padding = "5px";
              listItem.style.border = "1px solid rgba(255,255,255,0.3)";
              listItem.style.borderRadius = "4px";
              listItem.style.backgroundColor = "#2a2a3d";
              const nameSpan = document.createElement("span");
              nameSpan.textContent = variable.name;
              nameSpan.className = "item-name";
              nameSpan.style.flexGrow = "1";
              nameSpan.style.marginRight = "10px";
              const valueInput = document.createElement("input");
              valueInput.type = "text";
              valueInput.style.fontFamily = "monospace";
              valueInput.value = Array.isArray(variable.value) ? JSON.stringify(variable.value) : variable.value;
              valueInput.style.flexGrow = "2";
              valueInput.style.marginRight = "10px";
              valueInput.addEventListener("change", () => {
                if (Array.isArray(variable.value)) {
                  try { variable.value = JSON.parse(valueInput.value); } catch { /* preserve original array */ }
                } else {
                  try { variable.value = JSON.parse(valueInput.value); } catch { variable.value = valueInput.value; }
                }
              });
              valueInput.addEventListener("focus", () => {
                this.lastFocused = valueInput;
              });
              valueInput.addEventListener("blur", () => {
                setTimeout(() => {
                  if (this.lastFocused === valueInput) {
                    this.lastFocused = null;
                  }
                }, 500);
              });
              const lockButton = document.createElement("button");
              lockButton.style.marginRight = "5px";
              const v = new Variable(
                sprite.clones[this.selected],
                variable.id
              );
              lockButton.textContent = v.freezing ? "🔒" : "🔓";
              lockButton.title = v.freezing ? "点击解锁" : "点击锁定";
              valueInput.disabled = v.freezing;
              lockButton.addEventListener("click", () => {
                if (Array.isArray(variable.value)) {
                  try { variable.value = JSON.parse(valueInput.value); } catch { /* keep original array */ }
                } else {
                  try { variable.value = JSON.parse(valueInput.value); } catch { variable.value = valueInput.value; }
                }
                v.freezing = !v.freezing;
                lockButton.title = v.freezing ? "点击解锁" : "点击锁定";
                lockButton.textContent = v.freezing ? "🔒" : "🔓";
                valueInput.disabled = v.freezing;
              });
              listItem.appendChild(nameSpan);
              listItem.appendChild(valueInput);
              listItem.appendChild(lockButton);
              variableList.appendChild(listItem);
              return [variable.id, valueInput];
            }
          )
        );
      }
      varScrollable.appendChild(variableList);
      panel.appendChild(varScrollable);

      // === Lists Section ===
      // Make target a positioning context for overlay panel
      panel.style.position = "relative";
      const currentTarget = sprite.clones[this.selected];
      const listsObj = currentTarget.lists || {};
      const listNames = Object.values(listsObj);

      if (listNames.length > 0) {
        const listSectionTitle = document.createElement("div");
        listSectionTitle.textContent = "\u{1F4CB} \u5217\u8868";
        listSectionTitle.style.marginTop = "10px";
        listSectionTitle.style.marginBottom = "5px";
        listSectionTitle.style.fontWeight = "bold";
        listSectionTitle.style.color = "#a0a0b0";
        panel.appendChild(listSectionTitle);

        const listScrollable = createScrollable();
        const listList = document.createElement("ul");
        listList.style.padding = "0";
        listList.style.margin = "0";
        listList.style.listStyleType = "none";

        listNames.forEach((listData) => {
          const listItem = document.createElement("li");
          listItem.style.display = "flex";
          listItem.style.alignItems = "center";
          listItem.style.marginBottom = "5px";
          listItem.style.padding = "5px";
          listItem.style.border = "1px solid rgba(255,255,255,0.3)";
          listItem.style.borderRadius = "4px";
          listItem.style.backgroundColor = "#2a2a3d";
          listItem.style.cursor = "pointer";

          const listIcon = document.createElement("span");
          listIcon.textContent = "\u{1F4CB}";
          listIcon.style.marginRight = "8px";

          const nameSpan = document.createElement("span");
          nameSpan.textContent = listData.name;
          nameSpan.className = "item-name";
          nameSpan.style.flexGrow = "1";
          nameSpan.style.marginRight = "10px";

          const countSpan = document.createElement("span");
          countSpan.textContent = `(${listData.value.length})`;
          countSpan.style.color = "#a0a0b0";
          countSpan.style.fontSize = "12px";
          countSpan.style.marginRight = "5px";

          listItem.appendChild(listIcon);
          listItem.appendChild(nameSpan);
          listItem.appendChild(countSpan);

          listItem.addEventListener("click", (e) => {
            e.stopPropagation();
            openListPanel(listData);
          });

          listList.appendChild(listItem);
        });

        listScrollable.appendChild(listList);
        panel.appendChild(listScrollable);
      }

      // === List Panel (overlay popup) ===
      const openListPanel = (listData) => {
        // Remove existing panel
        const old = panel.querySelector(".cforge-list-panel");
        if (old) old.remove();

        const panel = document.createElement("div");
        panel.className = "cforge-list-panel";
        panel.style.position = "absolute";
        panel.style.top = "0";
        panel.style.left = "0";
        panel.style.right = "0";
        panel.style.bottom = "0";
        panel.style.zIndex = "100";
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
        panel.style.backgroundColor = "#1a1a2e";
        panel.style.borderRadius = "6px";
        panel.style.border = "1px solid rgba(255,255,255,0.3)";
        panel.style.overflow = "hidden";

        // Header
        const ph = document.createElement("div");
        ph.style.display = "flex";
        ph.style.justifyContent = "space-between";
        ph.style.alignItems = "center";
        ph.style.padding = "8px 10px";
        ph.style.background = "linear-gradient(45deg, #2d2d44, #1a1a2e)";
        ph.style.borderBottom = "1px solid rgba(255,255,255,0.3)";
        const pt = document.createElement("strong");
        pt.textContent = "\u{1F4CB} " + listData.name;
        pt.style.color = "#e0e0e0";
        pt.style.fontSize = "13px";
        const cb = document.createElement("button");
        cb.textContent = "\u2716 \u5173\u95ED";
        cb.style.background = "none";
        cb.style.border = "1px solid rgba(255,255,255,0.3)";
        cb.style.color = "#e0e0e0";
        cb.style.cursor = "pointer";
        cb.style.fontSize = "11px";
        cb.style.padding = "2px 8px";
        cb.style.borderRadius = "3px";
        cb.addEventListener("click", () => {
          panel.remove();
        });
        ph.appendChild(pt);
        ph.appendChild(cb);
        panel.appendChild(ph);

        // Body
        const pb = document.createElement("div");
        pb.style.overflowY = "auto";
        pb.style.padding = "6px";
        pb.style.flexGrow = "1";

        // Helper: write back entire array to ensure VM setter is triggered
        const writeBack = (newArr) => {
          listData.value = newArr;
        };

        const renderItems = () => {
          pb.innerHTML = "";
          const arr = [...listData.value]; // always work on a fresh copy
          if (arr.length === 0) {
            const em = document.createElement("div");
            em.textContent = "(\u7A7A\u5217\u8868)";
            em.style.color = "#a0a0b0";
            em.style.textAlign = "center";
            em.style.padding = "10px";
            pb.appendChild(em);
            return;
          }
          arr.forEach((itemValue, idx) => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.marginBottom = "4px";
            row.style.padding = "3px 5px";
            row.style.border = "1px solid rgba(255,255,255,0.15)";
            row.style.borderRadius = "3px";
            row.style.backgroundColor = "#1a1a2e";

            const idxS = document.createElement("span");
            idxS.textContent = `${idx + 1}`;
            idxS.style.color = "#a0a0b0";
            idxS.style.fontSize = "10px";
            idxS.style.marginRight = "6px";
            idxS.style.minWidth = "18px";
            idxS.style.textAlign = "right";

            const inp = document.createElement("input");
            inp.type = "text";
            inp.value = String(itemValue);
            inp.style.flexGrow = "1";
            inp.style.fontFamily = "monospace";
            inp.style.fontSize = "11px";
            inp.style.marginRight = "4px";
            inp.style.backgroundColor = "#16162a";
            inp.style.color = "#e0e0e0";
            inp.style.border = "1px solid rgba(255,255,255,0.25)";
            inp.style.borderRadius = "3px";
            inp.style.padding = "2px 5px";
            inp.style.boxSizing = "border-box";
            inp.style.outline = "none";
            inp.addEventListener("input", () => {
              // Modify one item and write entire array back
              const cur = [...listData.value];
              cur[idx] = inp.value;
              writeBack(cur);
            });
            inp.addEventListener("focus", () => {
              inp.style.borderColor = "#6c5ce7";
            });
            inp.addEventListener("blur", () => {
              inp.style.borderColor = "rgba(255,255,255,0.25)";
              const cur = [...listData.value];
              cur[idx] = inp.value;
              writeBack(cur);
            });

            // Lock state stored on the list object
            const lockKey = "__cforge_locked_" + idx;
            let locked = !!listData[lockKey];

            const lockB = document.createElement("button");
            lockB.textContent = locked ? "\u{1F512}" : "\u{1F513}";
            lockB.title = locked ? "\u70B9\u51FB\u89E3\u9501" : "\u70B9\u51FB\u9501\u5B9A";
            lockB.style.background = "none";
            lockB.style.border = "none";
            lockB.style.cursor = "pointer";
            lockB.style.fontSize = "11px";
            lockB.style.marginRight = "2px";
            lockB.style.padding = "0 2px";
            if (locked) inp.disabled = true;
            lockB.addEventListener("click", (e) => {
              e.stopPropagation();
              locked = !locked;
              if (locked) {
                listData[lockKey] = true;
              } else {
                delete listData[lockKey];
              }
              inp.disabled = locked;
              lockB.textContent = locked ? "\u{1F512}" : "\u{1F513}";
              lockB.title = locked ? "\u70B9\u51FB\u89E3\u9501" : "\u70B9\u51FB\u9501\u5B9A";
            });

            const delB = document.createElement("button");
            delB.textContent = "\u2716";
            delB.title = "\u5220\u9664\u7B2C" + (idx + 1) + "\u9879";
            delB.style.background = "none";
            delB.style.border = "1px solid rgba(255,80,80,0.4)";
            delB.style.color = "#ff6b6b";
            delB.style.cursor = "pointer";
            delB.style.fontSize = "11px";
            delB.style.padding = "1px 5px";
            delB.style.borderRadius = "3px";
            delB.style.fontWeight = "bold";
            delB.addEventListener("click", (e) => {
              e.stopPropagation();
              // Remove item and write entire array back
              const cur = [...listData.value];
              cur.splice(idx, 1);
              writeBack(cur);
              // Clean up lock key
              delete listData[lockKey];
              renderItems();
            });

            row.appendChild(idxS);
            row.appendChild(inp);
            row.appendChild(lockB);
            row.appendChild(delB);
            pb.appendChild(row);
          });
        };
        renderItems();
        panel.appendChild(pb);

        // Add item button at bottom
        const addRow = document.createElement("div");
        addRow.style.display = "flex";
        addRow.style.justifyContent = "center";
        addRow.style.padding = "5px";
        addRow.style.borderTop = "1px solid rgba(255,255,255,0.15)";
        const addBtn = document.createElement("button");
        addBtn.textContent = "+ \u6DFB\u52A0\u9879";
        addBtn.style.background = "#6c5ce7";
        addBtn.style.border = "none";
        addBtn.style.color = "white";
        addBtn.style.cursor = "pointer";
        addBtn.style.borderRadius = "4px";
        addBtn.style.padding = "3px 12px";
        addBtn.style.fontSize = "11px";
        addBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const cur = [...listData.value];
          cur.push("");
          writeBack(cur);
          renderItems();
          pb.scrollTop = pb.scrollHeight;
        });
        addRow.appendChild(addBtn);
        panel.appendChild(addRow);

        this.manager.target.appendChild(panel);
      };
      }

    get x() { return this.sprite.clones[this.selected].x; }
    set x(v) {
      const c = this.sprite.clones[this.selected];
      if (typeof c.setXY === "function") { c.setXY(v, c.y); } else { c.x = v; }
    }
    get y() { return this.sprite.clones[this.selected].y; }
    set y(v) {
      const c = this.sprite.clones[this.selected];
      if (typeof c.setXY === "function") { c.setXY(c.x, v); } else { c.y = v; }
    }
    get size() { return this.sprite.clones[this.selected].size; }
    set size(v) {
      const c = this.sprite.clones[this.selected];
      if (typeof c.setSize === "function") { c.setSize(v); } else { c.size = v; }
    }
    get direction() { return this.sprite.clones[this.selected].direction; }
    set direction(v) {
      const c = this.sprite.clones[this.selected];
      if (typeof c.setDirection === "function") { c.setDirection(v); } else { c.direction = v; }
    }

    dispose() {
      this.disposed = true;
      delete this.runtime.frameLoop.running;
      this.runtime.frameLoop.running = this.isRunning;
    }
  };

  // src/scene/leaderboard.js
  var LeaderboardScene = class {
    static title = "排行榜";
    constructor(manager, extension, leaderboardId) {
      this.manager = manager;
      this.extension = extension;
      this.leaderboardId = leaderboardId;
      this.leaderboard = null;
      this.fetching = false;
    }
    render() {
      const scrollable = createScrollable();
      if (!this.leaderboard) {
        if (!this.fetching)
          fetch(
            `https://gandi-main.ccw.site/creation/leaderboards/${this.leaderboardId}/records`,
            {
              credentials: "include"
            }
          ).then((v) => v.json()).then((v) => {
            if (v.body) {
              if (state_default._lbOverrides && state_default._lbOverrides[self.leaderboardId || this.leaderboardId]) {
                var overrideScore = state_default._lbOverrides[self.leaderboardId || this.leaderboardId];
                if (v.body && v.body.curUserLeaderboardRecord) {
                  v.body.curUserLeaderboardRecord.score = overrideScore;
                  console.log("[CForge] Applied client-side score override:", overrideScore);
                }
              }

              this.leaderboard = v.body;
              this.fetching = false;
              this.manager.requestUpdate();
            }
          });
        this.fetching = true;
        const loading = document.createElement("strong");
        loading.style.color = "#a0a0b0";
        loading.textContent = "加载中...";
        loading.style.display = "block";
        loading.style.textAlign = "center";
        scrollable.appendChild(loading);
        this.manager.target.appendChild(scrollable);
      } else {
        const searchContainer = document.createElement("div");
        searchContainer.style.display = "flex";
        searchContainer.style.justifyContent = "center";
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "搜索排行榜...";
        searchInput.style.padding = "5px";
        searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
        searchInput.style.width = "100%";
        searchInput.style.boxSizing = "border-box";
        searchInput.addEventListener("input", () => {
          const filter = searchInput.value.toLowerCase();
          const items = leaderboardList.children;
          let hasResults = false;
          Array.from(items).forEach((item) => {
            if (item.className !== "no-results" && item.querySelector(".item-name").textContent.toLowerCase().includes(filter)) {
              item.style.display = "flex";
              hasResults = true;
            } else if (item.className !== "no-results") {
              item.style.display = "none";
            }
          });
          if (!hasResults) {
            if (!leaderboardList.querySelector(".no-results")) {
              const noResultsItem = document.createElement("li");
              noResultsItem.textContent = "(无结果)";
              noResultsItem.className = "no-results";
              noResultsItem.style.display = "flex";
              noResultsItem.style.justifyContent = "center";
              noResultsItem.style.alignItems = "center";
              noResultsItem.style.width = "100%";
              noResultsItem.style.height = "100%";
              noResultsItem.style.color = "#a0a0b0";
              leaderboardList.appendChild(noResultsItem);
            }
          } else {
            const noResultsItem = leaderboardList.querySelector(".no-results");
            if (noResultsItem) {
              leaderboardList.removeChild(noResultsItem);
            }
          }
        });
        searchContainer.appendChild(searchInput);
        this.manager.target.appendChild(searchContainer);
        const leaderboardList = document.createElement("ul");
        leaderboardList.style.marginTop = "10px";
        leaderboardList.style.padding = "0";
        leaderboardList.style.margin = "0";
        leaderboardList.style.listStyleType = "none";
        this.leaderboard.leaderboardRecords.forEach((record) => {
          const listItem = document.createElement("li");
          listItem.style.display = "flex";
          listItem.style.flexDirection = "column";
          listItem.style.alignItems = "flex-start";
          listItem.style.padding = "5px";
          listItem.style.border = "1px solid rgba(255,255,255,0.3)";
          listItem.style.borderRadius = "4px";
          listItem.style.backgroundColor = "#2a2a3d";
          const rankSpan = document.createElement("span");
          rankSpan.textContent = `${record.ranking}`;
          rankSpan.style.marginRight = "10px";
          const nameContainer = document.createElement("div");
          nameContainer.style.display = "flex";
          nameContainer.style.alignItems = "center";
          nameContainer.style.width = "100%";
          const avatar = document.createElement("img");
          avatar.src = record.user.avatar;
          avatar.alt = "avatar";
          avatar.style.width = "24px";
          avatar.style.height = "24px";
          avatar.style.marginRight = "10px";
          avatar.style.cursor = "pointer";
          avatar.style.borderRadius = "50%";
          avatar.title = "查看主页";
          avatar.addEventListener("click", () => {
            windowOpen(
              `https://www.ccw.site/student/${record.user.id}`,
              "window",
              "left=100,top=100,width=640,height=640"
            );
          });
          const nameSpan = document.createElement("span");
          nameSpan.textContent = record.user.nickname;
          nameSpan.className = "item-name";
          nameSpan.style.flexGrow = "1";
          nameSpan.style.marginRight = "10px";
          nameSpan.style.textWrapMode = "nowrap";
          nameSpan.style.overflow = "hidden";
          nameSpan.style.textOverflow = "ellipsis";
          nameSpan.title = `创建时间 ${record.createdAt === null ? "未知" : new Date(record.createdAt)} / 最后更新 ${record.updatedAt === null ? "未知" : new Date(record.updatedAt)}`;
          const scoreSpan = document.createElement("span");
          scoreSpan.textContent = `${record.score} ${this.leaderboard.scoreUnit}`;
          scoreSpan.style.color = "#a0a0b0";
          scoreSpan.style.textWrapMode = "nowrap";
          scoreSpan.style.overflow = "hidden";
          scoreSpan.style.textOverflow = "ellipsis";
          nameContainer.appendChild(rankSpan);
          nameContainer.appendChild(avatar);
          nameContainer.appendChild(nameSpan);
          nameContainer.appendChild(scoreSpan);
          listItem.appendChild(nameContainer);
          leaderboardList.appendChild(listItem);
        });
        scrollable.appendChild(leaderboardList);
        this.manager.target.appendChild(scrollable);
        if (this.leaderboard.curUserLeaderboardRecord) {
          const record = this.leaderboard.curUserLeaderboardRecord;
          const userItem = document.createElement("div");
          userItem.style.display = "flex";
          userItem.style.flexDirection = "column";
          userItem.style.alignItems = "flex-start";
          userItem.style.padding = "5px";
          userItem.style.border = "1px solid rgba(255,255,255,0.3)";
          userItem.style.borderRadius = "4px";
          userItem.style.backgroundColor = "#2a2a3d";
          const rankSpan = document.createElement("span");
          rankSpan.textContent = `${record.ranking}`;
          rankSpan.style.marginRight = "10px";
          const nameContainer = document.createElement("div");
          nameContainer.style.display = "flex";
          nameContainer.style.alignItems = "center";
          nameContainer.style.width = "100%";
          const avatar = document.createElement("img");
          avatar.src = record.user.avatar;
          avatar.alt = "avatar";
          avatar.style.width = "24px";
          avatar.style.height = "24px";
          avatar.style.marginRight = "10px";
          avatar.style.cursor = "default";
          avatar.style.borderRadius = "50%";
          const nameSpan = document.createElement("span");
          nameSpan.textContent = record.user.nickname;
          nameSpan.style.flexGrow = "1";
          nameSpan.style.marginRight = "10px";
          nameSpan.style.textWrapMode = "nowrap";
          nameSpan.style.overflow = "hidden";
          nameSpan.style.textOverflow = "ellipsis";
          nameSpan.title = `创建时间 ${record.createdAt === null ? "未知" : new Date(record.createdAt)} / 最后更新 ${record.updatedAt === null ? "未知" : new Date(record.updatedAt)}`;
          const scoreInput = document.createElement("input");
          scoreInput.value = record.score;
          scoreInput.type = "number";
          scoreInput.style.border = "none";
          scoreInput.style.outline = "none";
          scoreInput.style.direction = "rtl";
          scoreInput.style.color = "#a0a0b0";
          scoreInput.style.width = "100%";
          scoreInput.style.backgroundColor = "transparent";
          scoreInput.placeholder = "(无分数)";
          scoreInput.style.marginRight = "5px";
          scoreInput.addEventListener("change", () => {
            const v = Number(scoreInput.value);
            if (Number.isNaN(v)) {
              scoreInput.value = record.score;
            } else if (record.value !== v) {
              record.score = v;
              this.extension.apis.insertLeaderboard(
                this.leaderboardId,
                record.score,
                record.ext
              );
            }
          });
          const unitSpan = document.createElement("span");
          unitSpan.textContent = `${this.leaderboard.scoreUnit}`;
          unitSpan.style.color = "#a0a0b0";
          unitSpan.style.textWrapMode = "nowrap";
          unitSpan.style.textOverflow = "ellipsis";
          nameContainer.appendChild(rankSpan);
          nameContainer.appendChild(avatar);
          nameContainer.appendChild(nameSpan);
          nameContainer.append(scoreInput);
          nameContainer.appendChild(unitSpan);
          const bruteForceBtn = document.createElement("button");
          bruteForceBtn.textContent = "暴力改分";
          bruteForceBtn.style.cssText = "padding:2px 8px;font-size:12px;border:1px solid rgba(255,80,80,0.5);border-radius:4px;background:#2a1515;color:#ff6b6b;cursor:pointer;marginLeft:5px;white-space:nowrap;";
          bruteForceBtn.title = "尝试多种方式强制修改分数（含客户端覆盖）";
          bruteForceBtn.addEventListener("click", () => {
            const newScore = Number(scoreInput.value);
            if (Number.isNaN(newScore)) { return; }
            const self = this;
            console.log("[CForge] === Record full dump ===", JSON.stringify(record));
            console.log("[CForge] === extension.apis keys ===", self.extension && self.extension.apis ? Object.keys(self.extension.apis) : "no apis");
            console.log("[CForge] === Captured LB POST ===", JSON.stringify(_lbCaptured));
            if (!confirm("确认暴力改分为 " + newScore + "?\n将尝试多种服务端方法，失败则客户端覆盖显示。")) { return; }
            bruteForceBtn.disabled = true;
            bruteForceBtn.textContent = "执行中...";
            const lbId = self.leaderboardId;
            const ext = record.ext;
            const base = "https://gandi-main.ccw.site/creation/leaderboards";
            const recUrl = base + "/" + lbId + "/records";
            (async () => {
              let success = false;
              // Method 1: Try DELETE on various URLs
              const delUrls = [];
              if (record.id) delUrls.push(recUrl + "/" + record.id);
              if (record._id) delUrls.push(recUrl + "/" + record._id);
              if (record.recordId) delUrls.push(recUrl + "/" + record.recordId);
              delUrls.push(recUrl);
              for (const url of delUrls) {
                try {
                  const res = await fetch(url, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" } });
                  console.log("[CForge] DELETE", url, res.status);
                  if (res.ok) {
                    const body = await res.text().catch(() => "");
                    console.log("[CForge] DELETE success!", body.substring(0, 200));
                    success = true; break;
                  }
                } catch(e) {}
              }
              // Method 2: If DELETE worked, re-insert with new score
              if (success) {
                await new Promise(r => setTimeout(r, 500));
                try { self.extension.apis.insertLeaderboard(lbId, newScore, ext); } catch(e) {}
                await new Promise(r => setTimeout(r, 800));
                self.leaderboard = null; self.fetching = false; self.manager.requestUpdate();
                bruteForceBtn.disabled = false; bruteForceBtn.textContent = "暴力改分";
                return;
              }
              // Method 3: Try PATCH to overwrite
              for (const url of delUrls) {
                try {
                  const res = await fetch(url, {
                    method: "PATCH", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ score: newScore, ext: ext || null })
                  });
                  console.log("[CForge] PATCH", url, res.status);
                  if (res.ok) { success = true; break; }
                } catch(e) {}
              }
              if (success) {
                await new Promise(r => setTimeout(r, 500));
                self.leaderboard = null; self.fetching = false; self.manager.requestUpdate();
                bruteForceBtn.disabled = false; bruteForceBtn.textContent = "暴力改分";
                return;
              }
              // Method 4: Try POST with X-HTTP-Method-Override
              try {
                const res = await fetch(recUrl, {
                  method: "POST", credentials: "include",
                  headers: { "Content-Type": "application/json", "X-HTTP-Method-Override": "PUT" },
                  body: JSON.stringify({ score: newScore, ext: ext || null, force: true, overwrite: true })
                });
                console.log("[CForge] POST+override", res.status);
                if (res.ok) {
                  await new Promise(r => setTimeout(r, 500));
                  self.leaderboard = null; self.fetching = false; self.manager.requestUpdate();
                  bruteForceBtn.disabled = false; bruteForceBtn.textContent = "暴力改分";
                  return;
                }
              } catch(e) {}
              // Method 5: Use captured request info if available
              if (_lbCaptured.url) {
                console.log("[CForge] Trying captured URL with PUT...");
                try {
                  const res = await fetch(_lbCaptured.url, {
                    method: "PUT", credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ score: newScore, ext: ext || null })
                  });
                  console.log("[CForge] PUT(captured)", res.status);
                  if (res.ok) {
                    await new Promise(r => setTimeout(r, 500));
                    self.leaderboard = null; self.fetching = false; self.manager.requestUpdate();
                    bruteForceBtn.disabled = false; bruteForceBtn.textContent = "暴力改分";
                    return;
                  }
                } catch(e) {}
              }
              // Method 6 (fallback): Client-side override
              console.log("[CForge] All server methods failed, using client-side override");
              if (!state_default._lbOverrides) state_default._lbOverrides = {};
              state_default._lbOverrides[lbId] = newScore;
              // Modify current display
              record.score = newScore;
              if (self.leaderboard && self.leaderboard.curUserLeaderboardRecord) {
                self.leaderboard.curUserLeaderboardRecord.score = newScore;
              }
              self.manager.requestUpdate();
              // Hook fetch response for this leaderboard
              bruteForceBtn.textContent = "已覆盖";
              setTimeout(() => { bruteForceBtn.disabled = false; bruteForceBtn.textContent = "暴力改分"; }, 2000);
            })();
          });
          nameContainer.appendChild(bruteForceBtn);
          userItem.appendChild(nameContainer);
          this.manager.target.appendChild(userItem);
        }
      }
    }
    dispose() {
    }
  };

  // src/scene/achievement.js
  var AchievementScene = class {
    static title = "成就";
    constructor(manager, extension) {
      this.manager = manager;
      this.extension = extension;
      this.achievementList = null;
      this.leaderboardList = null;
      this.selected = "achievement";
      this.fetchingAchievement = false;
      this.fetchingLeaderboard = false;
    }
    renderLeaderboard() {
      const scrollable = createScrollable();
      if (!this.leaderboardList) {
        if (!this.fetchingLeaderboard)
          fetch(
            `https://gandi-main.ccw.site/creation/leaderboards?creationId=${this.extension.runtime.ccwAPI.getProjectUUID()}&perPage=200`,
            {
              credentials: "include"
            }
          ).then((v) => v.json()).then((v) => {
            if (v.body) {
              this.leaderboardList = v.body;
              this.fetchingLeaderboard = false;
              this.manager.requestUpdate();
            }
          });
        this.fetchingLeaderboard = true;
        const loading = document.createElement("strong");
        loading.style.color = "#a0a0b0";
        loading.textContent = "加载中...";
        loading.style.display = "block";
        loading.style.textAlign = "center";
        scrollable.appendChild(loading);
      } else {
        const searchContainer = document.createElement("div");
        searchContainer.style.display = "flex";
        searchContainer.style.justifyContent = "center";
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "搜索排行榜...";
        searchInput.style.padding = "5px";
        searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
        searchInput.style.width = "100%";
        searchInput.style.boxSizing = "border-box";
        searchInput.addEventListener("input", () => {
          const filter = searchInput.value.toLowerCase();
          const items = leaderboardList.children;
          let hasResults = false;
          Array.from(items).forEach((item) => {
            if (item.className !== "no-results" && item.querySelector(".item-name").textContent.toLowerCase().includes(filter)) {
              item.style.display = "flex";
              hasResults = true;
            } else if (item.className !== "no-results") {
              item.style.display = "none";
            }
          });
          if (!hasResults) {
            if (!leaderboardList.querySelector(".no-results")) {
              const noResultsItem = document.createElement("li");
              noResultsItem.textContent = "(无结果)";
              noResultsItem.className = "no-results";
              noResultsItem.style.display = "flex";
              noResultsItem.style.justifyContent = "center";
              noResultsItem.style.alignItems = "center";
              noResultsItem.style.width = "100%";
              noResultsItem.style.height = "100%";
              noResultsItem.style.color = "#a0a0b0";
              leaderboardList.appendChild(noResultsItem);
            }
          } else {
            const noResultsItem = leaderboardList.querySelector(".no-results");
            if (noResultsItem) {
              leaderboardList.removeChild(noResultsItem);
            }
          }
        });
        searchContainer.appendChild(searchInput);
        this.manager.target.appendChild(searchContainer);
        const leaderboardList = document.createElement("ul");
        leaderboardList.style.marginTop = "10px";
        leaderboardList.style.padding = "0";
        leaderboardList.style.margin = "0";
        leaderboardList.style.listStyleType = "none";
        if (this.leaderboardList.length === 0) {
          const noResultsItem = document.createElement("li");
          noResultsItem.textContent = "(无结果)";
          noResultsItem.className = "no-results";
          noResultsItem.style.display = "flex";
          noResultsItem.style.justifyContent = "center";
          noResultsItem.style.alignItems = "center";
          noResultsItem.style.width = "100%";
          noResultsItem.style.height = "100%";
          noResultsItem.style.color = "#a0a0b0";
          leaderboardList.appendChild(noResultsItem);
        } else {
          this.leaderboardList.forEach((leaderboard) => {
            const listItem = document.createElement("li");
            listItem.style.display = "flex";
            listItem.style.flexDirection = "column";
            listItem.style.alignItems = "flex-start";
            listItem.style.marginBottom = "5px";
            listItem.style.padding = "5px";
            listItem.style.border = "1px solid rgba(255,255,255,0.3)";
            listItem.style.borderRadius = "4px";
            listItem.style.backgroundColor = "#2a2a3d";
            const nameContainer = document.createElement("div");
            nameContainer.style.display = "flex";
            nameContainer.style.alignItems = "center";
            nameContainer.style.width = "100%";
            const nameSpan = document.createElement("span");
            nameSpan.textContent = leaderboard.title;
            nameSpan.className = "item-name";
            nameSpan.title = `创建时间 ${leaderboard.createdAt === null ? "未知" : new Date(leaderboard.createdAt)} / 最后更新 ${new Date(
              leaderboard.updatedAt === null ? "未知" : leaderboard.updatedAt
            )}`;
            nameSpan.style.flexGrow = "1";
            nameSpan.style.marginRight = "10px";
            const inspectButton = document.createElement("button");
            inspectButton.textContent = "🔍";
            inspectButton.style.cursor = "pointer";
            inspectButton.style.marginRight = "5px";
            inspectButton.title = "查看排行榜";
            inspectButton.addEventListener("click", () => {
              this.manager.open(
                new LeaderboardScene(
                  this.manager,
                  this.extension,
                  leaderboard.oid
                )
              );
            });
            const extra = document.createElement("span");
            extra.title = extra.textContent = `单位: ${leaderboard.scoreUnit}`;
            extra.style.textWrap = "nowrap";
            extra.style.overflow = "hidden";
            extra.style.textOverflow = "ellipsis";
            extra.style.maxWidth = "400px";
            extra.style.color = "#a0a0b0";
            extra.style.width = "100%";
            nameContainer.appendChild(nameSpan);
            nameContainer.appendChild(inspectButton);
            listItem.appendChild(nameContainer);
            listItem.appendChild(extra);
            leaderboardList.appendChild(listItem);
          });
        }
        scrollable.appendChild(leaderboardList);
      }
      this.manager.target.appendChild(scrollable);
    }
    renderAchievements() {
      const scrollable = createScrollable();
      if (!this.achievementList) {
        if (!this.fetchingAchievement)
          fetch(
            `https://gandi-main.ccw.site/achievements?creationId=${this.extension.runtime.ccwAPI.getProjectUUID()}&perPage=200`,
            {
              credentials: "include"
            }
          ).then((v) => v.json()).then((v) => {
            if (v.body) {
              this.achievementList = v.body.data;
              this.fetchingAchievement = false;
              this.manager.requestUpdate();
            }
          });
        this.fetchingAchievement = true;
        const loading = document.createElement("strong");
        loading.style.color = "#a0a0b0";
        loading.textContent = "加载中...";
        loading.style.display = "block";
        loading.style.textAlign = "center";
        scrollable.appendChild(loading);
      } else {
        const searchContainer = document.createElement("div");
        searchContainer.style.display = "flex";
        searchContainer.style.justifyContent = "center";
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "搜索成就...";
        searchInput.style.padding = "5px";
        searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
        searchInput.style.width = "100%";
        searchInput.style.boxSizing = "border-box";
        searchInput.addEventListener("input", () => {
          const filter = searchInput.value.toLowerCase();
          const items = achievementList.children;
          let hasResults = false;
          Array.from(items).forEach((item) => {
            if (item.className !== "no-results" && item.querySelector(".item-name").textContent.toLowerCase().includes(filter)) {
              item.style.display = "flex";
              hasResults = true;
            } else if (item.className !== "no-results") {
              item.style.display = "none";
            }
          });
          if (!hasResults) {
            if (!achievementList.querySelector(".no-results")) {
              const noResultsItem = document.createElement("li");
              noResultsItem.textContent = "(无结果)";
              noResultsItem.className = "no-results";
              noResultsItem.style.display = "flex";
              noResultsItem.style.justifyContent = "center";
              noResultsItem.style.alignItems = "center";
              noResultsItem.style.width = "100%";
              noResultsItem.style.height = "100%";
              noResultsItem.style.color = "#a0a0b0";
              achievementList.appendChild(noResultsItem);
            }
          } else {
            const noResultsItem = achievementList.querySelector(".no-results");
            if (noResultsItem) {
              achievementList.removeChild(noResultsItem);
            }
          }
        });
        searchContainer.appendChild(searchInput);
        this.manager.target.appendChild(searchContainer);
        const achievementList = document.createElement("ul");
        achievementList.style.marginTop = "10px";
        achievementList.style.padding = "0";
        achievementList.style.margin = "0";
        achievementList.style.listStyleType = "none";
        if (this.achievementList.length === 0) {
          const noResultsItem = document.createElement("li");
          noResultsItem.textContent = "(无结果)";
          noResultsItem.className = "no-results";
          noResultsItem.style.display = "flex";
          noResultsItem.style.justifyContent = "center";
          noResultsItem.style.alignItems = "center";
          noResultsItem.style.width = "100%";
          noResultsItem.style.height = "100%";
          noResultsItem.style.color = "#a0a0b0";
          achievementList.appendChild(noResultsItem);
        } else {
          this.achievementList.forEach((achievement) => {
            const listItem = document.createElement("li");
            listItem.style.display = "flex";
            listItem.style.flexDirection = "column";
            listItem.style.alignItems = "flex-start";
            listItem.style.marginBottom = "5px";
            listItem.style.padding = "5px";
            listItem.style.border = "1px solid rgba(255,255,255,0.3)";
            listItem.style.borderRadius = "4px";
            listItem.style.backgroundColor = "#2a2a3d";
            const nameContainer = document.createElement("div");
            nameContainer.style.display = "flex";
            nameContainer.style.alignItems = "center";
            nameContainer.style.width = "100%";
            const icon = document.createElement("img");
            icon.src = achievement.icon;
            icon.title = `创建时间 ${achievement.createdAt === null ? "未知" : new Date(achievement.createdAt)} / 最后更新 ${achievement.updatedAt === null ? "未知" : new Date(achievement.updatedAt)}`;
            icon.alt = "icon";
            icon.style.width = "24px";
            icon.style.height = "24px";
            icon.style.marginRight = "10px";
            const nameSpan = document.createElement("span");
            nameSpan.textContent = achievement.title;
            nameSpan.className = "item-name";
            nameSpan.title = achievement.description;
            nameSpan.style.flexGrow = "1";
            nameSpan.style.marginRight = "10px";
            const toggleButton = document.createElement("button");
            toggleButton.textContent = achievement.obtained ? "✅" : "❌";
            toggleButton.style.cursor = achievement.obtained ? "default" : "pointer";
            toggleButton.title = achievement.obtained ? "已获得该成就" : "获得";
            toggleButton.style.marginRight = "5px";
            if (!achievement.obtained) {
              toggleButton.addEventListener(
                "click",
                () => {
                  this.extension.apis.obtainAchievement(achievement.oid);
                  achievement.obtained = true;
                  toggleButton.style.cursor = "default";
                  toggleButton.textContent = "✅";
                  toggleButton.title = "已获得该成就";
                },
                { once: true }
              );
            }
            const extra = document.createElement("input");
            extra.type = "text";
            extra.value = achievement.recordExt ?? "";
            extra.placeholder = "(无附加说明)";
            extra.style.color = "#a0a0b0";
            extra.style.backgroundColor = "transparent";
            extra.style.width = "100%";
            extra.style.outline = "none";
            extra.style.border = "none";
            extra.addEventListener("change", () => {
              if (achievement.recordExt !== extra.value) {
                achievement.recordExt = extra.value;
                this.extension.apis.updateAchievementExtra(
                  achievement.oid,
                  extra.value
                );
              }
            });
            nameContainer.appendChild(icon);
            nameContainer.appendChild(nameSpan);
            nameContainer.appendChild(toggleButton);
            listItem.appendChild(nameContainer);
            listItem.appendChild(extra);
            achievementList.appendChild(listItem);
          });
        }
        scrollable.appendChild(achievementList);
      }
      this.manager.target.appendChild(scrollable);
    }
    render() {
      const tabContainer = document.createElement("div");
      tabContainer.style.display = "flex";
      tabContainer.style.justifyContent = "center";
      const achievementTab = document.createElement("button");
      achievementTab.textContent = "成就";
      achievementTab.style.flexGrow = "1";
      achievementTab.style.padding = "10px";
      achievementTab.style.border = "1px solid rgba(255,255,255,0.3)";
      achievementTab.style.borderBottom = this.selected === "achievement" ? "none" : "1px solid rgba(255,255,255,0.3)";
      achievementTab.style.backgroundColor = this.selected === "achievement" ? "#2a2a3d" : "#1a1a2e";
      achievementTab.style.cursor = "pointer";
      achievementTab.addEventListener("click", () => {
        this.selected = "achievement";
        this.manager.requestUpdate();
      });
      const leaderboardTab = document.createElement("button");
      leaderboardTab.textContent = "排行榜";
      leaderboardTab.style.flexGrow = "1";
      leaderboardTab.style.padding = "10px";
      leaderboardTab.style.border = "1px solid rgba(255,255,255,0.3)";
      leaderboardTab.style.borderBottom = this.selected === "leaderboard" ? "none" : "1px solid rgba(255,255,255,0.3)";
      leaderboardTab.style.backgroundColor = this.selected === "leaderboard" ? "#2a2a3d" : "#1a1a2e";
      leaderboardTab.style.cursor = "pointer";
      leaderboardTab.addEventListener("click", () => {
        this.selected = "leaderboard";
        this.manager.requestUpdate();
      });
      tabContainer.appendChild(achievementTab);
      tabContainer.appendChild(leaderboardTab);
      this.manager.target.appendChild(tabContainer);
      if (this.selected === "achievement") {
        this.renderAchievements();
      } else {
        this.renderLeaderboard();
      }
    }
    dispose() {
    }
  };

  // src/scene/economyPool.js
  var EconomyPoolScene = class _EconomyPoolScene {
    static title = "币池管理";
    constructor(manager, extension, pool) {
      this.manager = manager;
      this.extension = extension;
      this.pool = pool;
    }
    static parseRule(str) {
      let state = 0;
      let key = "";
      const res = [];
      for (const c of str) {
        if (state === 0) {
          if (c === "[") {
            res.push(key);
            key = "";
            state = 1;
          } else {
            key += c;
          }
        } else if (state === 1) {
          if (c === "]") {
            state = 0;
            res.push({ name: key });
            key = "";
          } else {
            key += c;
          }
        }
      }
      if (state !== 0) throw new Error("Brace unclosed");
      if (key !== "") res.push(key);
      return res;
    }
    render() {
      const scrollable = createScrollable();
      const searchContainer = document.createElement("div");
      searchContainer.style.display = "flex";
      searchContainer.style.justifyContent = "center";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "搜索规则...";
      searchInput.style.padding = "5px";
      searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
      searchInput.style.width = "100%";
      searchInput.style.boxSizing = "border-box";
      searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const items = ruleList.children;
        let hasResults = false;
        Array.from(items).forEach((item) => {
          if (item.className !== "no-results" && item.description.toLowerCase().includes(filter)) {
            item.style.display = "flex";
            hasResults = true;
          } else if (item.className !== "no-results") {
            item.style.display = "none";
          }
        });
        if (!hasResults) {
          if (!ruleList.querySelector(".no-results")) {
            const noResultsItem = document.createElement("li");
            noResultsItem.textContent = "(无结果)";
            noResultsItem.className = "no-results";
            noResultsItem.style.display = "flex";
            noResultsItem.style.justifyContent = "center";
            noResultsItem.style.alignItems = "center";
            noResultsItem.style.width = "100%";
            noResultsItem.style.height = "100%";
            noResultsItem.style.color = "#a0a0b0";
            ruleList.appendChild(noResultsItem);
          }
        } else {
          const noResultsItem = ruleList.querySelector(".no-results");
          if (noResultsItem) {
            ruleList.removeChild(noResultsItem);
          }
        }
      });
      searchContainer.appendChild(searchInput);
      this.manager.target.appendChild(searchContainer);
      const ruleList = document.createElement("ul");
      ruleList.style.marginTop = "10px";
      ruleList.style.padding = "0";
      ruleList.style.margin = "0";
      ruleList.style.listStyleType = "none";
      if (this.pool.rules.length === 0) {
        const noResultsItem = document.createElement("li");
        noResultsItem.textContent = "(无结果)";
        noResultsItem.className = "no-results";
        noResultsItem.style.display = "flex";
        noResultsItem.style.justifyContent = "center";
        noResultsItem.style.alignItems = "center";
        noResultsItem.style.width = "100%";
        noResultsItem.style.height = "100%";
        noResultsItem.style.color = "#a0a0b0";
        ruleList.appendChild(noResultsItem);
      } else {
        this.pool.rules.forEach((rule) => {
          const listItem = document.createElement("li");
          listItem.description = rule.rule.funSignature.zh_cn;
          listItem.style.display = "flex";
          listItem.style.flexDirection = "column";
          listItem.style.alignItems = "flex-start";
          listItem.style.marginBottom = "5px";
          listItem.style.padding = "5px";
          listItem.style.border = "1px solid rgba(255,255,255,0.3)";
          listItem.style.borderRadius = "4px";
          listItem.style.backgroundColor = "#2a2a3d";
          const ruleContainer = document.createElement("div");
          ruleContainer.style.display = "flex";
          ruleContainer.style.alignItems = "center";
          ruleContainer.style.width = "100%";
          const parsedRule = _EconomyPoolScene.parseRule(
            rule.rule.funSignature.zh_cn
          );
          const inputs = {};
          for (const element of parsedRule) {
            if (typeof element === "string") {
              const span = document.createElement("span");
              span.textContent = element;
              span.style.textWrapMode = "nowrap";
              span.style.overflow = "hidden";
              span.style.textOverflow = "ellipsis";
              ruleContainer.appendChild(span);
            } else {
              const input = document.createElement("input");
              input.type = "number";
              input.placeholder = element.name;
              input.style.border = "none";
              input.style.outline = "none";
              input.style.backgroundColor = "transparent";
              input.style.textWrapMode = "nowrap";
              input.style.overflow = "hidden";
              input.style.textOverflow = "ellipsis";
              input.style.marginRight = "5px";
              input.style.width = "50px";
              ruleContainer.appendChild(input);
              inputs[element.name] = input;
            }
          }
          const executeButton = document.createElement("button");
          executeButton.textContent = "执行";
          executeButton.style.cursor = "pointer";
          executeButton.style.marginLeft = "auto";
          executeButton.title = rule.rule.title;
          executeButton.addEventListener("click", () => {
            let invalid = false;
            const params = Object.fromEntries(
              Object.entries(inputs).map(([key, input]) => {
                const value = Number(input.value);
                if (input.value === "" || Number.isNaN(value) || value <= 0) {
                  input.animate(
                    [{ backgroundColor: "red" }, { backgroundColor: "" }],
                    {
                      duration: 300
                    }
                  );
                  invalid = true;
                  return [key, 0];
                } else return [key, value];
              })
            );
            if (!invalid) {
              this.extension.apis.requestExecuteSmartContract(
                this.pool.id,
                rule.id,
                rule.rule.code,
                params
              );
            }
          });
          ruleContainer.appendChild(executeButton);
          listItem.appendChild(ruleContainer);
          ruleList.appendChild(listItem);
        });
      }
      scrollable.appendChild(ruleList);
      this.manager.target.appendChild(scrollable);
      const fundPanel = document.createElement("div");
      fundPanel.style.display = "flex";
      fundPanel.style.flexDirection = "row";
      fundPanel.style.alignItems = "flex-start";
      fundPanel.style.padding = "5px";
      fundPanel.style.border = "1px solid rgba(255,255,255,0.3)";
      fundPanel.style.borderRadius = "4px";
      fundPanel.style.backgroundColor = "#2a2a3d";
      const detailButton = document.createElement("button");
      detailButton.textContent = "规则详情";
      detailButton.style.cursor = "pointer";
      detailButton.style.marginRight = "5px";
      detailButton.title = "查看规则详情";
      detailButton.addEventListener("click", () => {
        this.extension.apis.showSmartContractDetail(this.pool.id);
      });
      fundPanel.appendChild(detailButton);
      const fundButton = document.createElement("button");
      fundButton.textContent = "无偿注资";
      fundButton.style.cursor = "pointer";
      fundButton.title = "进行无偿注资";
      fundButton.addEventListener("click", () => {
        this.extension._requestFund({
          contractId: this.pool.id
        });
      });
      fundPanel.appendChild(fundButton);
      this.manager.target.appendChild(fundPanel);
    }
    dispose() {
    }
  };

  // src/scene/economy.js
  var EconomyScene = class {
    static title = "经济合约";
    constructor(manager, extension) {
      this.manager = manager;
      this.extension = extension;
      this.pools = null;
      this.fetching = false;
    }
    render() {
      const scrollable = createScrollable();
      if (!this.pools) {
        if (!this.fetching) {
          ;
          (async () => {
            const poolList = await this.extension.apis.getSmartContractList();
            for (const pool of poolList) {
              pool.balance = await this.extension.apis.getSmartContractAccountByContractId(
                pool.id
              );
            }
            this.fetching = false;
            this.pools = poolList;
            this.manager.requestUpdate();
          })();
        }
        this.fetching = true;
        const loading = document.createElement("strong");
        loading.style.color = "#a0a0b0";
        loading.textContent = "加载中...";
        loading.style.display = "block";
        loading.style.textAlign = "center";
        scrollable.appendChild(loading);
      } else {
        const searchContainer = document.createElement("div");
        searchContainer.style.display = "flex";
        searchContainer.style.justifyContent = "center";
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.placeholder = "搜索合约...";
        searchInput.style.padding = "5px";
        searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
        searchInput.style.width = "100%";
        searchInput.style.boxSizing = "border-box";
        searchInput.addEventListener("input", () => {
          const filter = searchInput.value.toLowerCase();
          const items = poolList.children;
          let hasResults = false;
          Array.from(items).forEach((item) => {
            if (item.className !== "no-results" && item.querySelector(".item-name").textContent.toLowerCase().includes(filter)) {
              item.style.display = "flex";
              hasResults = true;
            } else if (item.className !== "no-results") {
              item.style.display = "none";
            }
          });
          if (!hasResults) {
            if (!poolList.querySelector(".no-results")) {
              const noResultsItem = document.createElement("li");
              noResultsItem.textContent = "(无结果)";
              noResultsItem.className = "no-results";
              noResultsItem.style.display = "flex";
              noResultsItem.style.justifyContent = "center";
              noResultsItem.style.alignItems = "center";
              noResultsItem.style.width = "100%";
              noResultsItem.style.height = "100%";
              noResultsItem.style.color = "#a0a0b0";
              poolList.appendChild(noResultsItem);
            }
          } else {
            const noResultsItem = poolList.querySelector(".no-results");
            if (noResultsItem) {
              poolList.removeChild(noResultsItem);
            }
          }
        });
        searchContainer.appendChild(searchInput);
        this.manager.target.appendChild(searchContainer);
        const poolList = document.createElement("ul");
        poolList.style.marginTop = "10px";
        poolList.style.padding = "0";
        poolList.style.margin = "0";
        poolList.style.listStyleType = "none";
        this.pools.forEach((pool) => {
          const typeMap = {
            DUCK_MAKER: "鸭里奥",
            GENERAL: "通用",
            GENERAL_NO_SPLIT: "通用 (作者无分成)"
          };
          const listItem = document.createElement("li");
          listItem.style.display = "flex";
          listItem.style.flexDirection = "column";
          listItem.style.alignItems = "flex-start";
          listItem.style.marginBottom = "5px";
          listItem.style.padding = "5px";
          listItem.style.border = "1px solid rgba(255,255,255,0.3)";
          listItem.style.borderRadius = "4px";
          listItem.style.backgroundColor = "#2a2a3d";
          const nameContainer = document.createElement("div");
          nameContainer.style.display = "flex";
          nameContainer.style.alignItems = "center";
          nameContainer.style.width = "100%";
          const nameSpan = document.createElement("span");
          nameSpan.textContent = pool.title;
          nameSpan.className = "item-name";
          if (pool.status !== "ENABLED") {
            nameSpan.style.color = "#a0a0b0";
          }
          nameSpan.title = `创建时间 ${pool.createdAt === null ? "未知" : new Date(pool.createdAt)} / 最后更新 ${new Date(
            pool.updatedAt === null ? "未知" : pool.updatedAt
          )}`;
          nameSpan.style.flexGrow = "1";
          nameSpan.style.marginRight = "10px";
          const inspectButton = document.createElement("button");
          inspectButton.textContent = "🔍";
          inspectButton.style.cursor = "pointer";
          inspectButton.style.marginRight = "5px";
          inspectButton.title = "查看合约";
          inspectButton.addEventListener("click", () => {
            this.manager.open(
              new EconomyPoolScene(this.manager, this.extension, pool)
            );
          });
          const extra = document.createElement("span");
          extra.title = extra.textContent = `(${pool.status === "ENABLED" ? "可用" : "不可用"}) ${typeMap[pool.type] ?? "未知"} / ${pool.balance} 币`;
          extra.style.textWrap = "nowrap";
          extra.style.overflow = "hidden";
          extra.style.textOverflow = "ellipsis";
          extra.style.maxWidth = "400px";
          extra.style.color = "#a0a0b0";
          extra.style.width = "100%";
          nameContainer.appendChild(nameSpan);
          nameContainer.appendChild(inspectButton);
          listItem.appendChild(nameContainer);
          listItem.appendChild(extra);
          poolList.appendChild(listItem);
        });
        scrollable.appendChild(poolList);
      }
      this.manager.target.appendChild(scrollable);
    }
    dispose() {
    }
  };

  // src/scene/mmo.js
  var MMOScene = class {
    static title = "MMO";
    constructor(manager, extension) {
      this.manager = manager;
      this.extension = extension;
      this.inputing = false;
    }
    render() {
      // [v0.20] 静态扫描的广播积木
      if (state_default.mmo.broadcastBlocks && state_default.mmo.broadcastBlocks.length > 0) {
        const scanTitle = document.createElement("p");
        scanTitle.textContent = "\u{1f4cb} 项目广播积木扫描";
        scanTitle.style.fontSize = "16px";
        scanTitle.style.marginBottom = "5px";
        this.manager.target.appendChild(scanTitle);
        const scanDesc = document.createElement("p");
        scanDesc.textContent = "项目中的广播积木（点击可填入下方发送框）。";
        scanDesc.style.fontSize = "12px";
        scanDesc.style.marginBottom = "8px";
        scanDesc.style.color = "#a0a0b0";
        this.manager.target.appendChild(scanDesc);
        const scanScrollable = createScrollable();
        scanScrollable.style.maxHeight = "120px";
        const scanList = document.createElement("ul");
        scanList.style.listStyle = "none";
        scanList.style.padding = "0";
        scanList.style.margin = "0";
        state_default.mmo.broadcastBlocks.forEach((blk) => {
          const item = document.createElement("li");
          item.style.cssText = "padding:6px 8px;margin-bottom:4px;border-radius:6px;background:rgba(124,110,240,0.08);border:1px solid rgba(124,110,240,0.2);cursor:pointer;transition:background 0.2s;";
          item.addEventListener("mouseenter", () => { item.style.background = "rgba(124,110,240,0.15)"; });
          item.addEventListener("mouseleave", () => { item.style.background = "rgba(124,110,240,0.08)"; });
          item.addEventListener("click", () => {
            const typeInput = this.manager.target.querySelector('input[placeholder="消息类型（必填）"]');
            const contentInput = this.manager.target.querySelector('input[placeholder="发布的内容（可留空）"]');
            if (typeInput && blk.type !== "动态") typeInput.value = blk.type;
            if (contentInput && blk.content !== "动态") contentInput.value = blk.content;
            item.animate([{ background: "rgba(80,180,80,0.3)" }, { background: "rgba(124,110,240,0.08)" }], { duration: 500 });
          });
          const targetSpan = document.createElement("span");
          targetSpan.textContent = "[" + blk.target + "]";
          targetSpan.style.cssText = "color:#6a6a8a;margin-right:6px;font-size:11px;";
          const typeSpan = document.createElement("span");
          typeSpan.textContent = blk.type;
          typeSpan.style.cssText = "color:#7c6ef0;font-weight:bold;margin-right:6px;";
          const contentSpan = document.createElement("span");
          const contentPreview = blk.content.length > 30 ? blk.content.substring(0, 30) + "..." : blk.content;
          contentSpan.textContent = contentPreview;
          contentSpan.style.cssText = "color:#c0c0d0;font-size:12px;";
          contentSpan.title = blk.content;
          item.appendChild(targetSpan);
          item.appendChild(typeSpan);
          item.appendChild(contentSpan);
          scanList.appendChild(item);
        });
        scanScrollable.appendChild(scanList);
        this.manager.target.appendChild(scanScrollable);
        const divider = document.createElement("hr");
        divider.style.cssText = "border:none;border-top:1px solid rgba(255,255,255,0.1);margin:12px 0;";
        this.manager.target.appendChild(divider);
      }
      if (this.extension.currentRoom) {
        // 广播消息记录
        const logTitle = document.createElement("p");
        logTitle.textContent = "📡 广播消息记录";
        logTitle.style.fontSize = "16px";
        logTitle.style.marginBottom = "5px";
        this.manager.target.appendChild(logTitle);
        const logDesc = document.createElement("p");
        logDesc.textContent = "实时捕获的MMO广播消息（最近200条）。点击可复制消息类型。";
        logDesc.style.fontSize = "12px";
        logDesc.style.marginBottom = "8px";
        logDesc.style.color = "#a0a0b0";
        this.manager.target.appendChild(logDesc);
        const logScrollable = createScrollable();
        logScrollable.style.maxHeight = "120px";
        const logList = document.createElement("ul");
        logList.style.listStyle = "none";
        logList.style.padding = "0";
        logList.style.margin = "0";
        if (state_default.mmo.broadcastLog.length === 0) {
          const noItem = document.createElement("li");
          noItem.textContent = "(暂无消息，加入房间后自动记录)";
          noItem.style.color = "#a0a0b0";
          noItem.style.textAlign = "center";
          noItem.style.padding = "20px 0";
          logList.appendChild(noItem);
        } else {
          state_default.mmo.broadcastLog.forEach((msg) => {
            const item = document.createElement("li");
            item.style.cssText = "padding:6px 8px;margin-bottom:4px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);cursor:pointer;transition:background 0.2s;";
            item.addEventListener("mouseenter", () => { item.style.background = "rgba(255,255,255,0.1)"; });
            item.addEventListener("mouseleave", () => { item.style.background = "rgba(255,255,255,0.05)"; });
            item.addEventListener("click", () => {
              navigator.clipboard.writeText(msg.type).catch(() => {});
              item.animate([{ background: "rgba(80,180,80,0.3)" }, { background: "rgba(255,255,255,0.05)" }], { duration: 500 });
            });
            const timeSpan = document.createElement("span");
            timeSpan.textContent = msg.time;
            timeSpan.style.cssText = "color:#6a6a8a;margin-right:8px;font-size:11px;";
            const typeSpan = document.createElement("span");
            typeSpan.textContent = msg.type;
            typeSpan.style.cssText = "color:#7c6ef0;font-weight:bold;margin-right:6px;";
            const nameSpan = document.createElement("span");
            nameSpan.textContent = msg.name ? `[${msg.name}]` : "";
            nameSpan.style.cssText = "color:#a0a0b0;margin-right:6px;font-size:12px;";
            const contentSpan = document.createElement("span");
            const contentPreview = msg.content.length > 40 ? msg.content.substring(0, 40) + "..." : msg.content;
            contentSpan.textContent = contentPreview;
            contentSpan.style.cssText = "color:#c0c0d0;font-size:12px;";
            contentSpan.title = msg.content;
            item.appendChild(timeSpan);
            item.appendChild(typeSpan);
            item.appendChild(nameSpan);
            item.appendChild(contentSpan);
            logList.appendChild(item);
          });
        }
        logScrollable.appendChild(logList);
        this.manager.target.appendChild(logScrollable);
        const clearLogBtn = document.createElement("button");
        clearLogBtn.textContent = "🗑 清空记录";
        clearLogBtn.style.cssText = "margin:8px 0 16px 0;padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#a0a0b0;cursor:pointer;font-size:12px;";
        clearLogBtn.addEventListener("click", () => {
          state_default.mmo.broadcastLog = [];
          this.manager.requestUpdate();
        });
        this.manager.target.appendChild(clearLogBtn);
        const title1 = document.createElement("p");
        title1.textContent = "过滤广播";
        title1.style.fontSize = "16px";
        title1.style.marginBottom = "5px";
        this.manager.target.appendChild(title1);
        const description = document.createElement("p");
        description.textContent = "您可以在这里管理广播的黑名单。";
        description.style.cursor = "help";
        description.title = `广播格式如下：
消息类型(session="",uuid="",name="",content="")`;
        description.style.fontSize = "12px";
        this.manager.target.appendChild(description);
        const description2 = document.createElement("p");
        description2.textContent = "如果消息的内容匹配任何一个正则表达式，它将不会被 Scratch 处理。";
        description2.style.fontSize = "12px";
        description2.style.marginBottom = "10px";
        this.manager.target.appendChild(description2);
        const scrollable = createScrollable();
        scrollable.style.maxHeight = "120px";
        const list = document.createElement("ul");
        if (state_default.mmo.broadcastBlackList.length === 0) {
          const noResultsItem = document.createElement("li");
          noResultsItem.textContent = "(无结果)";
          noResultsItem.className = "no-results";
          noResultsItem.style.display = "flex";
          noResultsItem.style.justifyContent = "center";
          noResultsItem.style.alignItems = "center";
          noResultsItem.style.width = "100%";
          noResultsItem.style.height = "100%";
          noResultsItem.style.color = "#a0a0b0";
          list.appendChild(noResultsItem);
        } else {
          state_default.mmo.broadcastBlackList.forEach((regex, index) => {
            const listItem = document.createElement("li");
            listItem.style.display = "flex";
            listItem.style.alignItems = "center";
            listItem.style.justifyContent = "space-between";
            listItem.style.padding = "5px 0";
            const regexSpan = document.createElement("span");
            regexSpan.textContent = regex.toString();
            regexSpan.style.flexGrow = "1";
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "❌";
            deleteBtn.title = "删除";
            deleteBtn.style.marginLeft = "10px";
            deleteBtn.addEventListener("click", () => {
              state_default.mmo.broadcastBlackList.splice(index, 1);
              this.manager.requestUpdate();
            });
            listItem.appendChild(regexSpan);
            listItem.appendChild(deleteBtn);
            list.appendChild(listItem);
          });
        }
        scrollable.appendChild(list);
        this.manager.target.appendChild(scrollable);
        const flexInputContainer = document.createElement("div");
        flexInputContainer.style.display = "flex";
        const regexBefore = document.createElement("span");
        regexBefore.textContent = "/";
        regexBefore.style.marginRight = "5px";
        flexInputContainer.appendChild(regexBefore);
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "添加新的正则表达式...";
        input.style.flexGrow = "1";
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            try {
              const newRegex = new RegExp(input.value, "g");
              state_default.mmo.broadcastBlackList.push(newRegex);
              this.inputing = true;
              this.manager.requestUpdate();
            } catch {
              input.animate([{ color: "red" }, { color: "" }], {
                duration: 300
              });
            }
          }
        });
        if (this.inputing) {
          this.inputing = false;
          input.select();
        }
        flexInputContainer.appendChild(input);
        const regexAfter = document.createElement("span");
        regexAfter.textContent = "/g";
        regexAfter.style.marginLeft = "5px";
        flexInputContainer.appendChild(regexAfter);
        this.manager.target.appendChild(flexInputContainer);
        const title2 = document.createElement("p");
        title2.textContent = "发送广播";
        this.manager.target.appendChild(title2);
        const description3 = document.createElement("p");
        description3.textContent = "填写消息类型和内容，点击发送或按Enter键。";
        description3.style.fontSize = "12px";
        this.manager.target.appendChild(description3);
        const broadcastContainer = document.createElement("div");
        broadcastContainer.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:10px;";
        const typeInput = document.createElement("input");
        typeInput.type = "text";
        typeInput.placeholder = "消息类型（必填）";
        typeInput.style.cssText = "width:100%;box-sizing:border-box;padding:8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;background:#1e1e2e;color:white;font-size:13px;";
        const contentInput = document.createElement("input");
        contentInput.type = "text";
        contentInput.placeholder = "发布的内容（可留空）";
        contentInput.style.cssText = "width:100%;box-sizing:border-box;padding:8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;background:#1e1e2e;color:white;font-size:13px;";
        const sendBtn = document.createElement("button");
        sendBtn.textContent = "📡 发送广播";
        sendBtn.style.cssText = "padding:8px 16px;border:none;border-radius:6px;background:#7c6ef0;color:white;font-weight:bold;cursor:pointer;font-size:13px;";
        sendBtn.addEventListener("mouseover", () => { sendBtn.style.background = "#6b5de0"; });
        sendBtn.addEventListener("mouseout", () => { sendBtn.style.background = "#7c6ef0"; });
        const doSend = () => {
          const msgType = typeInput.value.trim();
          if (!msgType) {
            typeInput.animate([{ color: "red" }, { color: "" }], { duration: 300 });
            return;
          }
          try {
            this.extension.broadcastMsg({
              type: msgType,
              content: contentInput.value
            });
            typeInput.value = "";
            contentInput.value = "";
          } catch {
            typeInput.animate([{ color: "red" }, { color: "" }], { duration: 300 });
          }
        };
        sendBtn.addEventListener("click", doSend);
        typeInput.addEventListener("keypress", (e) => { if (e.key === "Enter") doSend(); });
        contentInput.addEventListener("keypress", (e) => { if (e.key === "Enter") doSend(); });
        broadcastContainer.appendChild(typeInput);
        broadcastContainer.appendChild(contentInput);
        broadcastContainer.appendChild(sendBtn);
        this.manager.target.appendChild(broadcastContainer);
      } else {
        const p = document.createElement("p");
        p.textContent = "现在没有加入任何房间。请在加入房间后重新打开此页面。";
        this.manager.target.appendChild(p);
      }
    }
    dispose() {
    }
  };

  // src/overlay/result.js
  var ResultOverlay = class {
    constructor(manager, isSuccess, message) {
      this.manager = manager;
      this.isSuccess = isSuccess;
      this.message = message;
      setTimeout(() => {
        this.manager.removeOverlay(this);
      }, 3e3);
    }
    render() {
      const target = this.manager.target;
      const div = document.createElement("div");
      div.textContent = this.message;
      div.style.width = "100%";
      div.style.backgroundColor = this.isSuccess ? "green" : "red";
      div.style.color = "white";
      div.style.textAlign = "center";
      div.style.padding = "5px";
      div.style.fontSize = "12px";
      div.style.boxSizing = "border-box";
      div.animate(
        [{ transform: "translateY(-100%)" }, { transform: "translateY(0)" }],
        {
          duration: 300,
          easing: "ease-in-out"
        }
      );
      div.style.position = "relative";
      div.style.zIndex = "-1";
      target.appendChild(div);
    }
    dispose() {
    }
  };

  // src/base/monaco.js
  addStyle(
    new URL(
      "https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/editor/editor.main.css"
    )
  );
  window.MonacoEnvironment = {
    getWorkerUrl(fileName) {
      if (fileName === "workerMain.js") {
        return `data:text/javascript;base64,${btoa(
          `(function(fetch){globalThis.fetch=function(url,...args){return fetch.call(this,'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/base/worker/'+url,...args);};})(globalThis.fetch);importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs/base/worker/workerMain.js');`
        )}`;
      }
    }
  };
  var Monaco = import("https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/+esm");

  // src/scene/script.js
  var ScriptScene = class {
    static title = "高级";
    constructor(manager) {
      this.manager = manager;
      this.Monaco = null;
      Monaco.then((v) => {
        this.Monaco = v;
        this.manager.requestUpdate();
      });
      this.editor = null;
      this.overlay = null;
    }
    run(code) {
      const engine = {
        async vm() {
          const v = await vm;
          return new VMAPI(v);
        },
        get ccwdata() {
          return globalThis.ccwdata;
        }
      };
      return new async function() {
      }.constructor("engine", code)(engine);
    }
    render() {
      if (!this.Monaco) {
        const loading = document.createElement("strong");
        loading.style.color = "#a0a0b0";
        loading.textContent = "加载中...";
        loading.style.display = "block";
        loading.style.textAlign = "center";
        this.manager.target.appendChild(loading);
      } else {
        if (this.editor) this.editor.dispose();
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "center";
        container.style.padding = "10px";
        const description = document.createElement("p");
        description.textContent = "你可以指定一个自定义脚本用于进行自动化操作。可使用命令面板运行脚本。";
        description.style.marginBottom = "10px";
        container.appendChild(description);
        const editor = document.createElement("div");
        editor.style.width = "100%";
        editor.style.height = "300px";
        editor.style.marginBottom = "10px";
        const editorValue = window.localStorage.getItem("__csense-storaged-script") ?? `// 这是 CSense Scripting API 的使用示例。
const vm = await engine.vm()
const target = vm.sprite('Stage').clones[0]
target.var('我的变量').set('你好').watch(function (before, after) {
  return '你好，' + after
}) // .freezing = true
`;
        this.editor = this.Monaco.editor.create(editor, {
          value: editorValue,
          automaticLayout: true,
          language: "javascript",
          tabSize: 2,
          insertSpaces: true
        });
        this.editor.addAction({
          id: "csense.execute",
          label: `运行脚本`,
          contextMenuGroupId: "csense",
          run: () => {
            const v = this.run(this.editor.getValue());
            this.overlay = new ResultOverlay(this.manager, true, "脚本已运行。");
            this.manager.addOverlay(this.overlay);
            v.then(
              () => {
              },
              (err) => {
                console.error(err);
                if (this.overlay) {
                  this.overlay.isSuccess = false;
                  this.overlay.message = "发生错误。请检查 DevTools 控制台。";
                  this.manager.requestUpdate();
                }
              }
            );
          }
        });
        this.editor.onDidChangeModelContent(() => {
          window.localStorage.setItem(
            "__csense-storaged-script",
            this.editor.getValue()
          );
        });
        container.appendChild(editor);
        this.manager.target.appendChild(container);
      }
    }
    dispose() {
      this.editor.dispose();
      this.manager.removeOverlay(this.overlay);
      this.overlay = null;
    }
  };

  // src/scene/about.js
  var MMOAssistScene = class {
    static title = "联机辅助";
    constructor(manager) {
      this.manager = manager;
      this.isRadarActive = false;
      this.isCameraLocked = false;
      this.isAimbotActive = false;
      this.overlayCanvas = null;
      this.overlayCtx = null;
      this.animFrameId = null;
      this.myLastX = 0;
      this.myLastY = 0;
      this.myFaction = "neutral";
      this.lastAimAngle = 0;
      this.isProcessing = false;
      this.lastUpdateTime = 0;
      this.UPDATE_FPS = 30;
      this.warningRange = 500;
    }
    _getPlayerFaction(extra) {
      if (!extra) return "neutral";
      const extraStr = String(extra).toLowerCase();
      const factionKeywords = {
        "blue": ["蓝色", "蓝方", "蓝队", "blu", "blue", "蓝"],
        "red": ["红色", "红方", "红队", "red", "红"],
        "green": ["绿色", "绿方", "绿队", "green", "绿"],
        "yellow": ["黄色", "黄方", "黄队", "yellow", "黄"],
        "purple": ["紫色", "紫方", "紫队", "purple", "紫"],
        "orange": ["橙色", "橙方", "橙队", "orange", "橙"],
        "cyan": ["青色", "青方", "青队", "cyan", "青"],
        "pink": ["粉色", "粉方", "粉队", "pink", "粉"]
      };
      for (const [faction, keywords] of Object.entries(factionKeywords)) {
        for (const keyword of keywords) {
          if (extraStr.includes(keyword)) return faction;
        }
      }
      return "neutral";
    }
    _getFactionColor(faction, distance, warningRange) {
      const factionColors = {
        "blue": { r: 100, g: 150, b: 255 },
        "red": { r: 255, g: 100, b: 100 },
        "green": { r: 100, g: 255, b: 100 },
        "yellow": { r: 255, g: 255, b: 100 },
        "purple": { r: 200, g: 100, b: 255 },
        "orange": { r: 255, g: 150, b: 50 },
        "cyan": { r: 100, g: 255, b: 255 },
        "pink": { r: 255, g: 150, b: 255 },
        "neutral": { r: 200, g: 200, b: 200 }
      };
      const color = factionColors[faction] || factionColors["neutral"];
      if (distance < warningRange) {
        const warningFactor = 1 - (distance / warningRange);
        const alpha = 0.7 + warningFactor * 0.3;
        const intensity = 0.8 + warningFactor * 0.2;
        return {
          r: Math.min(255, Math.floor(color.r * intensity)),
          g: Math.min(255, Math.floor(color.g * intensity)),
          b: Math.min(255, Math.floor(color.b * intensity)),
          a: alpha
        };
      }
      return { r: color.r, g: color.g, b: color.b, a: 0.7 };
    }
    _getCameraData(vmInst) {
      try {
        const cameraX = vmInst.runtime.ext_GandiKamera.cameraX;
        const cameraY = vmInst.runtime.ext_GandiKamera.cameraY;
        const cameraZoom = vmInst.runtime.ext_GandiKamera.cameraZoom;
        return { cameraX, cameraY, cameraZoom, zoomFactor: cameraZoom / 100 };
      } catch (e) {
        return { cameraX: 0, cameraY: 0, cameraZoom: 100, zoomFactor: 1 };
      }
    }
    _setCameraToMyPosition(vmInst, myX, myY) {
      try {
        vmInst.runtime.ext_GandiKamera.cameraX = myX;
        vmInst.runtime.ext_GandiKamera.cameraY = myY;
        return true;
      } catch (e) {
        return false;
      }
    }
    _lockMouseToZero(vmInst) {
      try {
        if (vmInst.runtime && vmInst.runtime.ioDevices && vmInst.runtime.ioDevices.mouse) {
          vmInst.runtime.ioDevices.mouse.getScratchX = () => 0;
          vmInst.runtime.ioDevices.mouse.getScratchY = () => 0;
          return true;
        }
      } catch (e) {}
      return false;
    }
    _unlockMouse(vmInst) {
      try {
        if (vmInst.runtime && vmInst.runtime.ioDevices && vmInst.runtime.ioDevices.mouse) {
          delete vmInst.runtime.ioDevices.mouse.getScratchX;
          delete vmInst.runtime.ioDevices.mouse.getScratchY;
          return true;
        }
      } catch (e) {}
      return false;
    }
    _setMousePosition(x, y) {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseMoveEvent = new MouseEvent("mousemove", {
        view: window, bubbles: true, cancelable: true,
        clientX: x + rect.left, clientY: y + rect.top
      });
      canvas.dispatchEvent(mouseMoveEvent);
    }
    _setupOverlay() {
      const canvas = document.querySelector("canvas");
      if (!canvas) return false;
      if (this.overlayCanvas) {
        this.overlayCanvas.width = canvas.width;
        this.overlayCanvas.height = canvas.height;
        return true;
      }
      this.overlayCanvas = document.createElement("canvas");
      this.overlayCanvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:9999;";
      this.overlayCanvas.width = canvas.width;
      this.overlayCanvas.height = canvas.height;
      canvas.parentElement.appendChild(this.overlayCanvas);
      this.overlayCtx = this.overlayCanvas.getContext("2d");
      return true;
    }
    _removeOverlay() {
      if (this.overlayCanvas && this.overlayCanvas.parentElement) {
        this.overlayCanvas.parentElement.removeChild(this.overlayCanvas);
      }
      this.overlayCanvas = null;
      this.overlayCtx = null;
    }
    async _getVmInstance() {
      return await vm;
    }
    async _processFrame() {
      if (this.isProcessing) return;
      this.isProcessing = true;
      const now = Date.now();
      const fpsInterval = 1000 / this.UPDATE_FPS;
      const elapsed = now - this.lastUpdateTime;
      if (elapsed < fpsInterval) {
        this.isProcessing = false;
        this.animFrameId = requestAnimationFrame(() => this._processFrame());
        return;
      }
      this.lastUpdateTime = now - (elapsed % fpsInterval);
      try {
        const v = await this._getVmInstance();
        if (!v || !v.runtime || !v.runtime.ext_CCWMMO || !v.runtime.ext_CCWMMO.currentRoom) {
          this.isProcessing = false;
          if (this.isRadarActive || this.isCameraLocked || this.isAimbotActive) {
            this.animFrameId = requestAnimationFrame(() => this._processFrame());
          }
          return;
        }
        const sessionId = await v.runtime.ext_CCWMMO.currentRoom.sessionId;
        const clientListStr = await v.runtime.ext_CCWMMO.getClientList({ FORMAT: "JSON" });
        const clients = JSON.parse(clientListStr);
        const me = clients.find(c => c.sessionId === sessionId);
        if (!me) {
          this.isProcessing = false;
          if (this.isRadarActive || this.isCameraLocked || this.isAimbotActive) {
            this.animFrameId = requestAnimationFrame(() => this._processFrame());
          }
          return;
        }
        this.myLastX = me.x;
        this.myLastY = me.y;
        this.myFaction = this._getPlayerFaction(me.extra);
        if (this.isCameraLocked) {
          if (!this._setCameraToMyPosition(v, this.myLastX, this.myLastY)) {
            this.isCameraLocked = false;
          }
        }
        if (this.isRadarActive || this.isAimbotActive) {
          this._setupOverlay();
          if (this.overlayCtx && this.overlayCanvas) {
            const cameraData = this._getCameraData(v);
            const centerX = this.overlayCanvas.width / 2;
            const centerY = this.overlayCanvas.height / 2;
            const maxPointerLength = Math.min(this.overlayCanvas.width, this.overlayCanvas.height) * 0.6;
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
            if (this.isRadarActive) {
              this.overlayCtx.beginPath();
              this.overlayCtx.arc(centerX, centerY, 3, 0, Math.PI * 2);
              this.overlayCtx.fillStyle = "rgba(255, 0, 0, 0.7)";
              this.overlayCtx.fill();
            }
            let allPlayers = [];
            let enemyPlayers = [];
            let currentAimTarget = null;
            for (let i = 0; i < clients.length; i++) {
              const client = clients[i];
              if (client.sessionId === sessionId) continue;
              const dx = client.x - this.myLastX;
              const dy = client.y - this.myLastY;
              const realDistance = Math.sqrt(dx * dx + dy * dy);
              allPlayers.push({ client, distance: realDistance });
              const clientFaction = this._getPlayerFaction(client.extra);
              if (clientFaction !== "neutral" && clientFaction !== this.myFaction) {
                enemyPlayers.push({ client, distance: realDistance, faction: clientFaction });
              }
              if (this.isRadarActive) {
                let scaledX = (client.x - cameraData.cameraX) * (this.overlayCanvas.width / 640) * cameraData.zoomFactor;
                let scaledY = (client.y - cameraData.cameraY) * (this.overlayCanvas.height / 360) * cameraData.zoomFactor;
                const canvasYPos = -scaledY;
                const angle = Math.atan2(canvasYPos, scaledX);
                const screenDistance = Math.sqrt(scaledX * scaledX + canvasYPos * canvasYPos);
                let pointerLength = screenDistance < maxPointerLength ? Math.max(screenDistance, 15) : maxPointerLength;
                const endX = centerX + Math.cos(angle) * pointerLength;
                const endY = centerY + Math.sin(angle) * pointerLength;
                const colorInfo = this._getFactionColor(clientFaction, realDistance, this.warningRange);
                let lineWidth = 3;
                if (realDistance < this.warningRange) {
                  const warningFactor = 1 - (realDistance / this.warningRange);
                  lineWidth = 2 + warningFactor * 3;
                }
                this.overlayCtx.beginPath();
                this.overlayCtx.moveTo(centerX, centerY);
                this.overlayCtx.lineTo(endX, endY);
                this.overlayCtx.strokeStyle = `rgba(${colorInfo.r},${colorInfo.g},${colorInfo.b},${colorInfo.a})`;
                this.overlayCtx.lineWidth = lineWidth;
                this.overlayCtx.stroke();
                const arrowSize = Math.max(6, Math.min(10, pointerLength * 0.1));
                this.overlayCtx.beginPath();
                this.overlayCtx.moveTo(endX, endY);
                this.overlayCtx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
                this.overlayCtx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
                this.overlayCtx.closePath();
                this.overlayCtx.fillStyle = this.overlayCtx.strokeStyle;
                this.overlayCtx.fill();
                const textX = endX + Math.cos(angle) * 25;
                const textY = endY + Math.sin(angle) * 25;
                this.overlayCtx.font = "18px Arial bold";
                this.overlayCtx.fillStyle = this.overlayCtx.strokeStyle;
                this.overlayCtx.textAlign = "center";
                this.overlayCtx.fillText(Math.round(realDistance), textX, textY);
              }
            }
            if (this.isAimbotActive && allPlayers.length > 0) {
              let targetPlayers = enemyPlayers.length > 0 ? enemyPlayers : allPlayers;
              targetPlayers.sort((a, b) => a.distance - b.distance);
              const targetClient = targetPlayers[0].client;
              currentAimTarget = targetClient;
              const dx = targetClient.x - this.myLastX;
              const dy = targetClient.y - this.myLastY;
              const targetAngle = Math.atan2(dy, dx);
              this.lastAimAngle = targetAngle;
              const targetScreenX = centerX + Math.cos(targetAngle) * (maxPointerLength + 50);
              const targetScreenY = centerY - Math.sin(targetAngle) * (maxPointerLength + 50);
              this._setMousePosition(targetScreenX, targetScreenY);
              const aimArrowLength = 100;
              const aimArrowX = centerX + Math.cos(targetAngle) * aimArrowLength;
              const aimArrowY = centerY - Math.sin(targetAngle) * aimArrowLength;
              this.overlayCtx.beginPath();
              this.overlayCtx.moveTo(centerX, centerY);
              this.overlayCtx.lineTo(aimArrowX, aimArrowY);
              this.overlayCtx.strokeStyle = "rgba(255, 255, 0, 0.9)";
              this.overlayCtx.lineWidth = 4;
              this.overlayCtx.stroke();
              const aimTextX = aimArrowX + Math.cos(targetAngle) * 20;
              const aimTextY = aimArrowY - Math.sin(targetAngle) * 20;
              this.overlayCtx.font = "16px Arial bold";
              this.overlayCtx.fillStyle = "rgba(255, 255, 0, 0.9)";
              this.overlayCtx.textAlign = "center";
              this.overlayCtx.fillText("锁头", aimTextX, aimTextY);
            }
          }
        }
        if (!this.isRadarActive && !this.isAimbotActive) {
          if (this.overlayCtx && this.overlayCanvas) {
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
          }
        }
      } catch (e) {}
      this.isProcessing = false;
      if (this.isRadarActive || this.isCameraLocked || this.isAimbotActive) {
        this.animFrameId = requestAnimationFrame(() => this._processFrame());
      }
    }
    _startLoop() {
      if (this.animFrameId) return;
      this._processFrame();
    }
    _stopLoop() {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    }
    _createToggle(label, isOn, onToggle) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.padding = "12px 16px";
      row.style.margin = "8px 0";
      row.style.backgroundColor = "#2a2a3d";
      row.style.borderRadius = "8px";
      row.style.border = "1px solid rgba(255,255,255,0.15)";
      const labelEl = document.createElement("span");
      labelEl.textContent = label;
      labelEl.style.fontSize = "14px";
      labelEl.style.fontWeight = "bold";
      labelEl.style.color = "#e0e0e0";
      const toggle = document.createElement("div");
      toggle.style.width = "48px";
      toggle.style.height = "26px";
      toggle.style.borderRadius = "13px";
      toggle.style.cursor = "pointer";
      toggle.style.transition = "all 0.3s ease";
      toggle.style.position = "relative";
      toggle.style.backgroundColor = isOn ? "#4CAF50" : "#555";
      const knob = document.createElement("div");
      knob.style.width = "22px";
      knob.style.height = "22px";
      knob.style.borderRadius = "50%";
      knob.style.backgroundColor = "white";
      knob.style.position = "absolute";
      knob.style.top = "2px";
      knob.style.transition = "all 0.3s ease";
      knob.style.left = isOn ? "24px" : "2px";
      toggle.appendChild(knob);
      let currentState = isOn;
      toggle.addEventListener("click", () => {
        const newState = onToggle(!currentState);
        currentState = newState;
        toggle.style.backgroundColor = currentState ? "#4CAF50" : "#555";
        knob.style.left = currentState ? "24px" : "2px";
      });
      row.appendChild(labelEl);
      row.appendChild(toggle);
      return row;
    }
    render() {
      const scrollable = createScrollable();
      const title = document.createElement("p");
      title.textContent = "联机辅助";
      title.style.fontSize = "18px";
      title.style.fontWeight = "bold";
      title.style.textAlign = "center";
      title.style.marginBottom = "5px";
      title.style.color = "#e0e0e0";
      scrollable.appendChild(title);
      const desc = document.createElement("p");
      desc.textContent = "仅在使用MMO扩展时可用，需先进入房间。";
      desc.style.fontSize = "12px";
      desc.style.textAlign = "center";
      desc.style.color = "#8888aa";
      desc.style.marginBottom = "15px";
      scrollable.appendChild(desc);
      const panel = document.createElement("div");
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.gap = "8px";
      panel.appendChild(this._createToggle("雷达透视", this.isRadarActive, (on) => {
        this.isRadarActive = on;
        if (on) {
          this._setupOverlay();
          this._startLoop();
        } else {
          if (!this.isCameraLocked && !this.isAimbotActive) {
            this._stopLoop();
            this._removeOverlay();
          } else {
            if (this.overlayCtx && this.overlayCanvas) {
              this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
            }
          }
        }
        return on;
      }));
      panel.appendChild(this._createToggle("锁定摄像机", this.isCameraLocked, (on) => {
        this.isCameraLocked = on;
        if (on) {
          this._startLoop();
        } else {
          if (!this.isRadarActive && !this.isAimbotActive) {
            this._stopLoop();
          }
        }
        return on;
      }));
      panel.appendChild(this._createToggle("锁头", this.isAimbotActive, (on) => {
        this.isAimbotActive = on;
        if (on) {
          this._lockMouseToZeroAsync();
          this._setupOverlay();
          this._startLoop();
        } else {
          this._unlockMouseAsync();
          if (!this.isRadarActive && !this.isCameraLocked) {
            this._stopLoop();
            this._removeOverlay();
          } else if (!this.isRadarActive) {
            if (this.overlayCtx && this.overlayCanvas) {
              this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
            }
          }
        }
        return on;
      }));
      scrollable.appendChild(panel);
      const warningRow = document.createElement("div");
      warningRow.style.marginTop = "15px";
      warningRow.style.padding = "10px 16px";
      warningRow.style.backgroundColor = "#2a2a3d";
      warningRow.style.borderRadius = "8px";
      warningRow.style.border = "1px solid rgba(255,255,255,0.15)";
      const warningLabel = document.createElement("div");
      warningLabel.textContent = "预警距离: " + this.warningRange;
      warningLabel.style.fontSize = "12px";
      warningLabel.style.color = "#aaa";
      warningLabel.style.marginBottom = "6px";
      warningRow.appendChild(warningLabel);
      const warningSlider = document.createElement("input");
      warningSlider.type = "range";
      warningSlider.min = "0";
      warningSlider.max = "1000";
      warningSlider.value = String(this.warningRange);
      warningSlider.style.width = "100%";
      warningSlider.addEventListener("input", (e) => {
        this.warningRange = parseInt(e.target.value);
        warningLabel.textContent = "预警距离: " + this.warningRange;
      });
      warningRow.appendChild(warningSlider);
      scrollable.appendChild(warningRow);
      this.manager.target.appendChild(scrollable);
    }
    async _lockMouseToZeroAsync() {
      const v = await this._getVmInstance();
      if (v) this._lockMouseToZero(v);
    }
    async _unlockMouseAsync() {
      const v = await this._getVmInstance();
      if (v) this._unlockMouse(v);
    }
    dispose() {
      this.isRadarActive = false;
      this.isCameraLocked = false;
      this.isAimbotActive = false;
      this._stopLoop();
      this._removeOverlay();
      this._unlockMouseAsync();
    }
  };



  var AboutScene = class {
    static title = "关于";
    constructor(manager) {
      this.manager = manager;
    }
    pSmall(message) {
      const p = document.createElement("p");
      p.textContent = message;
      p.style.textAlign = "center";
      p.style.fontSize = "small";
      return p;
    }
    render() {
      const scrollable = createScrollable();
      const container = document.createElement("div");
      const logo = document.createElement("img");
      logo.src = logo_default;
      logo.alt = "CForge";
      logo.style.display = "block";
      logo.style.margin = "0 auto";
      logo.style.width = "120px";
      logo.style.height = "120px";
      logo.style.marginTop = "30px";
      logo.style.marginBottom = "20px";
      container.appendChild(logo);
      const description = document.createElement("p");
      description.textContent = "CForge修改器";
      description.style.textAlign = "center";
      description.style.fontWeight = "bold";
      description.style.fontSize = "small";
      container.appendChild(description);
      container.appendChild(this.pSmall("此工具基于CSense修改"));
      container.appendChild(
        this.pSmall(
          "使用此工具后果自负"
        )
      );
      container.appendChild(
        this.pSmall(
          "您可以对此工具进行修改、二次创作，但请勿传播此工具"
        )
      );
      container.appendChild(this.pSmall("⚠️请勿将此工具用于任何非法用途⚠️"));
      container.appendChild(
        this.pSmall(
          "            --XM"
        )
      );
      scrollable.appendChild(container);
      this.manager.target.appendChild(scrollable);
    }
    dispose() {
    }
  };

  // src/scene/ccwdata.js
  var CCWDataScene = class {
    static title = "云数据管理";
    constructor(manager, extension) {
      this.manager = manager;
      this.extension = extension;
      this.selected = "project";
      this.disposed = false;
      this.lastFocused = null;
      this.noResultsItem = null;
      this.inputs = {};
      const animationFrame = () => {
        const db = state_default.ccwdata[this.selected];
        for (const [name, value] of db.entries()) {
          if (!this.inputs[name]) {
            const v = this.createListElement(this.selected, name);
            this.inputs[name] = v[1];
            this.manager.target.querySelector("ul").appendChild(v[2]);
            if (this.noResultsItem) {
              this.noResultsItem.remove();
              this.noResultsItem = null;
            }
          } else {
            if (this.inputs[name].value !== value && this.inputs[name] !== this.lastFocused) {
              this.inputs[name].animate([{ color: "red" }, { color: "" }], {
                duration: 300
              });
              this.inputs[name].value = value;
            }
          }
        }
        if (!this.disposed) requestAnimationFrame(animationFrame);
      };
      requestAnimationFrame(animationFrame);
    }
    createListElement(type, name) {
      const value = state_default.ccwdata[type].get(name);
      const listItem = document.createElement("li");
      listItem.style.display = "flex";
      listItem.style.alignItems = "center";
      listItem.style.marginBottom = "5px";
      listItem.style.padding = "5px";
      listItem.style.border = "1px solid rgba(255,255,255,0.3)";
      listItem.style.borderRadius = "4px";
      listItem.style.backgroundColor = "#2a2a3d";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = name;
      nameSpan.style.flexGrow = "1";
      nameSpan.style.marginRight = "10px";
      nameSpan.className = "item-name";
      const valueInput = document.createElement("input");
      valueInput.type = "text";
      valueInput.style.fontFamily = "monospace";
      valueInput.value = Array.isArray(value) ? JSON.stringify(value) : value;
      valueInput.style.flexGrow = "2";
      valueInput.style.marginRight = "10px";
      valueInput.addEventListener("change", () => {
        if (type === "project") {
          this.extension._setValueToProject(name, valueInput.value);
        } else {
          this.extension._setValueToUser(name, valueInput.value);
        }
      });
      valueInput.addEventListener("focus", () => {
        this.lastFocused = valueInput;
      });
      valueInput.addEventListener("blur", () => {
        this.lastFocused = null;
      });
      listItem.appendChild(nameSpan);
      listItem.appendChild(valueInput);
      return [name, valueInput, listItem];
    }
    render() {
      const tabContainer = document.createElement("div");
      tabContainer.style.display = "flex";
      tabContainer.style.justifyContent = "center";
      const projectTab = document.createElement("button");
      projectTab.textContent = "作品";
      projectTab.style.flexGrow = "1";
      projectTab.style.padding = "10px";
      projectTab.style.border = "1px solid rgba(255,255,255,0.3)";
      projectTab.style.borderBottom = this.selected === "project" ? "none" : "1px solid rgba(255,255,255,0.3)";
      projectTab.style.backgroundColor = this.selected === "project" ? "#2a2a3d" : "#1a1a2e";
      projectTab.style.cursor = "pointer";
      projectTab.addEventListener("click", () => {
        this.selected = "project";
        this.manager.requestUpdate();
      });
      const userTab = document.createElement("button");
      userTab.textContent = "用户";
      userTab.style.flexGrow = "1";
      userTab.style.padding = "10px";
      userTab.style.border = "1px solid rgba(255,255,255,0.3)";
      userTab.style.borderBottom = this.selected === "user" ? "none" : "1px solid rgba(255,255,255,0.3)";
      userTab.style.backgroundColor = this.selected === "user" ? "#2a2a3d" : "#1a1a2e";
      userTab.style.cursor = "pointer";
      userTab.addEventListener("click", () => {
        this.selected = "user";
        this.manager.requestUpdate();
      });
      tabContainer.appendChild(projectTab);
      tabContainer.appendChild(userTab);
      this.manager.target.appendChild(tabContainer);
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "搜索变量...";
      searchInput.style.padding = "5px";
      searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
      searchInput.style.width = "100%";
      searchInput.style.boxSizing = "border-box";
      searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const items = variableList.children;
        let hasResults = false;
        Array.from(items).forEach((item) => {
          if (item.className !== "no-results" && item.querySelector(".item-name").textContent.toLowerCase().includes(filter)) {
            item.style.display = "flex";
            hasResults = true;
          } else if (item.className !== "no-results") {
            item.style.display = "none";
          }
        });
        if (!hasResults) {
          if (!variableList.querySelector(".no-results")) {
            const noResultsItem = document.createElement("li");
            noResultsItem.textContent = "(无结果)";
            noResultsItem.className = "no-results";
            noResultsItem.style.display = "flex";
            noResultsItem.style.justifyContent = "center";
            noResultsItem.style.alignItems = "center";
            noResultsItem.style.width = "100%";
            noResultsItem.style.height = "100%";
            noResultsItem.style.color = "#a0a0b0";
            variableList.appendChild(noResultsItem);
          }
        } else {
          const noResultsItem = variableList.querySelector(".no-results");
          if (noResultsItem) {
            variableList.removeChild(noResultsItem);
          }
        }
      });
      this.manager.target.appendChild(searchInput);
      const scrollable = createScrollable();
      const db = state_default.ccwdata[this.selected];
      const variableList = document.createElement("ul");
      variableList.style.padding = "0";
      variableList.style.margin = "0";
      variableList.style.listStyleType = "none";
      variableList.style.marginTop = "10px";
      if (db.keys().length === 0) {
        const noResultsItem = document.createElement("li");
        noResultsItem.textContent = "(无结果)";
        noResultsItem.className = "no-results";
        noResultsItem.style.display = "flex";
        noResultsItem.style.justifyContent = "center";
        noResultsItem.style.alignItems = "center";
        noResultsItem.style.width = "100%";
        noResultsItem.style.height = "100%";
        noResultsItem.style.color = "#a0a0b0";
        this.noResultsItem = noResultsItem;
        variableList.appendChild(noResultsItem);
      } else {
        this.inputs = Object.fromEntries(
          db.keys().map((name) => {
            const v = this.createListElement(this.selected, name);
            variableList.appendChild(v[2]);
            return [name, v[1]];
          })
        );
      }
      scrollable.appendChild(variableList);
      this.manager.target.appendChild(scrollable);
    }
    dispose() {
      this.disposed = true;
    }
  };

  // package.json
  var version = "0.32";

  // src/sandbox/bridge.ts
  var Bridge = class _Bridge {
    send_fn;
    send_trigger;
    recv_trigger;
    // polyfill Source: https://stackoverflow.com/a/2117523
    static uuid() {
      return crypto.randomUUID instanceof Function ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(
        /[018]/g,
        (c) => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
      );
    }
    send(method, args) {
      return new Promise((resolve, reject) => {
        const id = _Bridge.uuid();
        this.send_fn({
          type: "message",
          id,
          request: {
            method,
            args
          }
        });
        this.send_trigger.set(id, {
          resolve(val) {
            resolve(val);
          },
          reject(err) {
            reject(err);
          }
        });
      });
    }
    recv(method, trigger) {
      this.recv_trigger.set(method, trigger);
    }
    constructor(send_fn, eventListener) {
      ;
      [this.send_fn, this.send_trigger, this.recv_trigger] = [
        send_fn,
        /* @__PURE__ */ new Map(),
        /* @__PURE__ */ new Map()
      ];
      eventListener((ev) => {
        if (ev.data.type == "result") {
          const pm = this.send_trigger.get(ev.data.id);
          if (pm !== void 0) {
            switch (ev.data.result.status) {
              case "resolve": {
                pm.resolve(ev.data.result);
                this.send_trigger.delete(ev.data.id);
                break;
              }
              case "reject": {
                pm.reject(ev.data.result.value);
                this.send_trigger.delete(ev.data.id);
                break;
              }
            }
          }
        } else {
          const trigger = this.recv_trigger.get(ev.data.request.method);
          if (trigger !== void 0) {
            try {
              const res = trigger(ev.data.request.args);
              if (res instanceof Promise) {
                res.then(
                  (res2) => {
                    this.send_fn({
                      type: "result",
                      id: ev.data.id,
                      result: {
                        status: "resolve",
                        value: res2
                      }
                    });
                  },
                  (err) => {
                    this.send_fn({
                      type: "result",
                      id: ev.data.id,
                      result: {
                        status: "reject",
                        value: err
                      }
                    });
                  }
                );
              } else {
                this.send_fn({
                  type: "result",
                  id: ev.data.id,
                  result: {
                    status: "resolve",
                    value: res
                  }
                });
              }
            } catch (err) {
              this.send_fn({
                type: "result",
                id: ev.data.id,
                result: {
                  status: "reject",
                  value: err
                }
              });
            }
          } else {
            this.send_fn({
              type: "result",
              id: ev.data.id,
              result: {
                status: "reject",
                value: `${ev.data.request.method} is not defined`
              }
            });
          }
        }
      });
    }
  };

  // src/sandbox/sandbox.ts
  var Sandbox = class {
    bridge;
    scope;
    url;
    async evaluate(fn, ...args) {
      const result = await this.bridge.send("eval", [
        fn.toString(),
        args
      ]);
      if (result.status == "resolve") return result.value;
      throw result.value;
    }
    dispose() {
      this.scope.terminate();
      URL.revokeObjectURL(this.url);
    }
    regist(method, trigger) {
      this.bridge.recv(method, trigger);
    }
    constructor(prepatch) {
      this.scope = new Worker(
        this.url = URL.createObjectURL(
          new Blob(
            [
              `
          ;((prepatch) => {
            var Bridge = ${Bridge}
            const post = globalThis.postMessage
            const bridge = new Bridge(post.bind(this.scope), ev =>
              globalThis.addEventListener('message', ev)
            )
            prepatch.call(globalThis, globalThis, bridge)
            bridge.recv('eval', (val) => {
              const [code, args] = val
              const ret = new Function('return ' + code)()
              if (ret instanceof Function) return ret.apply(globalThis, args)
              return ret
            })
          })(${prepatch ? prepatch.toString() : ""})
        `
            ],
            { type: "text/javascript" }
          )
        )
      );
      this.bridge = new Bridge(
        this.scope.postMessage.bind(this.scope),
        (ev) => this.scope.addEventListener("message", ev)
      );
    }
  };

  // src/sandbox/index.js
  async function getExtensionInfo(code, timeout = 10) {
    const sandbox = new Sandbox((global, bridge) => {
      class Color {
        /**
         * @typedef {object} RGBObject - An object representing a color in RGB format.
         * @property {number} r - the red component, in the range [0, 255].
         * @property {number} g - the green component, in the range [0, 255].
         * @property {number} b - the blue component, in the range [0, 255].
         */
        /**
         * @typedef {object} HSVObject - An object representing a color in HSV format.
         * @property {number} h - hue, in the range [0-359).
         * @property {number} s - saturation, in the range [0,1].
         * @property {number} v - value, in the range [0,1].
         */
        /** @type {RGBObject} */
        static get RGB_BLACK() {
          return { r: 0, g: 0, b: 0 };
        }
        /** @type {RGBObject} */
        static get RGB_WHITE() {
          return { r: 255, g: 255, b: 255 };
        }
        /**
         * Convert a Scratch decimal color to a hex string, #RRGGBB.
         * @param {number} decimal RGB color as a decimal.
         * @return {string} RGB color as #RRGGBB hex string.
         */
        static decimalToHex(decimal) {
          if (decimal < 0) {
            decimal += 16777215 + 1;
          }
          let hex = Number(decimal).toString(16);
          hex = `#${"000000".substr(0, 6 - hex.length)}${hex}`;
          return hex;
        }
        /**
         * Convert a Scratch decimal color to an RGB color object.
         * @param {number} decimal RGB color as decimal.
         * @return {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
         */
        static decimalToRgb(decimal) {
          const a = decimal >> 24 & 255;
          const r = decimal >> 16 & 255;
          const g = decimal >> 8 & 255;
          const b = decimal & 255;
          return { r, g, b, a: a > 0 ? a : 255 };
        }
        /**
         * Convert a hex color (e.g., F00, #03F, #0033FF) to an RGB color object.
         * @param {!string} hex Hex representation of the color.
         * @return {RGBObject} null on failure, or rgb: {r: red [0,255], g: green [0,255], b: blue [0,255]}.
         */
        static hexToRgb(hex) {
          if (hex.startsWith("#")) {
            hex = hex.substring(1);
          }
          const parsed = parseInt(hex, 16);
          if (isNaN(parsed)) {
            return null;
          }
          if (hex.length === 6) {
            return {
              r: parsed >> 16 & 255,
              g: parsed >> 8 & 255,
              b: parsed & 255
            };
          } else if (hex.length === 3) {
            const r = parsed >> 8 & 15;
            const g = parsed >> 4 & 15;
            const b = parsed & 15;
            return {
              r: r << 4 | r,
              g: g << 4 | g,
              b: b << 4 | b
            };
          }
          return null;
        }
        /**
         * Convert an RGB color object to a hex color.
         * @param {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
         * @return {!string} Hex representation of the color.
         */
        static rgbToHex(rgb) {
          return Color.decimalToHex(Color.rgbToDecimal(rgb));
        }
        /**
         * Convert an RGB color object to a Scratch decimal color.
         * @param {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
         * @return {!number} Number representing the color.
         */
        static rgbToDecimal(rgb) {
          return (rgb.r << 16) + (rgb.g << 8) + rgb.b;
        }
        /**
         * Convert a hex color (e.g., F00, #03F, #0033FF) to a decimal color number.
         * @param {!string} hex Hex representation of the color.
         * @return {!number} Number representing the color.
         */
        static hexToDecimal(hex) {
          return Color.rgbToDecimal(Color.hexToRgb(hex));
        }
        /**
         * Convert an HSV color to RGB format.
         * @param {HSVObject} hsv - {h: hue [0,360), s: saturation [0,1], v: value [0,1]}
         * @return {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
         */
        static hsvToRgb(hsv) {
          let h = hsv.h % 360;
          if (h < 0) h += 360;
          const s = Math.max(0, Math.min(hsv.s, 1));
          const v = Math.max(0, Math.min(hsv.v, 1));
          const i = Math.floor(h / 60);
          const f = h / 60 - i;
          const p = v * (1 - s);
          const q = v * (1 - s * f);
          const t = v * (1 - s * (1 - f));
          let r;
          let g;
          let b;
          switch (i) {
            default:
            case 0:
              r = v;
              g = t;
              b = p;
              break;
            case 1:
              r = q;
              g = v;
              b = p;
              break;
            case 2:
              r = p;
              g = v;
              b = t;
              break;
            case 3:
              r = p;
              g = q;
              b = v;
              break;
            case 4:
              r = t;
              g = p;
              b = v;
              break;
            case 5:
              r = v;
              g = p;
              b = q;
              break;
          }
          return {
            r: Math.floor(r * 255),
            g: Math.floor(g * 255),
            b: Math.floor(b * 255)
          };
        }
        /**
         * Convert an RGB color to HSV format.
         * @param {RGBObject} rgb - {r: red [0,255], g: green [0,255], b: blue [0,255]}.
         * @return {HSVObject} hsv - {h: hue [0,360), s: saturation [0,1], v: value [0,1]}
         */
        static rgbToHsv(rgb) {
          const r = rgb.r / 255;
          const g = rgb.g / 255;
          const b = rgb.b / 255;
          const x = Math.min(Math.min(r, g), b);
          const v = Math.max(Math.max(r, g), b);
          let h = 0;
          let s = 0;
          if (x !== v) {
            const f = r === x ? g - b : g === x ? b - r : r - g;
            const i = r === x ? 3 : g === x ? 5 : 1;
            h = (i - f / (v - x)) * 60 % 360;
            s = (v - x) / v;
          }
          return { h, s, v };
        }
        /**
         * Linear interpolation between rgb0 and rgb1.
         * @param {RGBObject} rgb0 - the color corresponding to fraction1 <= 0.
         * @param {RGBObject} rgb1 - the color corresponding to fraction1 >= 1.
         * @param {number} fraction1 - the interpolation parameter. If this is 0.5, for example, mix the two colors equally.
         * @return {RGBObject} the interpolated color.
         */
        static mixRgb(rgb0, rgb1, fraction1) {
          if (fraction1 <= 0) return rgb0;
          if (fraction1 >= 1) return rgb1;
          const fraction0 = 1 - fraction1;
          return {
            r: fraction0 * rgb0.r + fraction1 * rgb1.r,
            g: fraction0 * rgb0.g + fraction1 * rgb1.g,
            b: fraction0 * rgb0.b + fraction1 * rgb1.b
          };
        }
      }
      const isNotActuallyZero = (val) => {
        if (typeof val !== "string") return false;
        for (let i = 0; i < val.length; i++) {
          const code2 = val.charCodeAt(i);
          if (code2 === 48 || code2 === 9) {
            return false;
          }
        }
        return true;
      };
      class Cast {
        /**
         * Scratch cast to number.
         * Treats NaN as 0.
         * In Scratch 2.0, this is captured by `interp.numArg.`
         * @param {*} value Value to cast to number.
         * @return {number} The Scratch-casted number value.
         */
        static toNumber(value) {
          if (typeof value === "number") {
            if (Number.isNaN(value)) {
              return 0;
            }
            return value;
          }
          const n = Number(value);
          if (Number.isNaN(n)) {
            return 0;
          }
          return n;
        }
        /**
         * Scratch cast to boolean.
         * In Scratch 2.0, this is captured by `interp.boolArg.`
         * Treats some string values differently from JavaScript.
         * @param {*} value Value to cast to boolean.
         * @return {boolean} The Scratch-casted boolean value.
         */
        static toBoolean(value) {
          if (typeof value === "boolean") {
            return value;
          }
          if (typeof value === "string") {
            if (value === "" || value === "0" || value.toLowerCase() === "false") {
              return false;
            }
            return true;
          }
          return Boolean(value);
        }
        /**
         * Scratch cast to string.
         * @param {*} value Value to cast to string.
         * @return {string} The Scratch-casted string value.
         */
        static toString(value) {
          return String(value);
        }
        /**
         * Cast any Scratch argument to an RGB color array to be used for the renderer.
         * @param {*} value Value to convert to RGB color array.
         * @return {Array.<number>} [r,g,b], values between 0-255.
         */
        static toRgbColorList(value) {
          const color = Cast.toRgbColorObject(value);
          return [color.r, color.g, color.b];
        }
        /**
         * Cast any Scratch argument to an RGB color object to be used for the renderer.
         * @param {*} value Value to convert to RGB color object.
         * @return {RGBOject} [r,g,b], values between 0-255.
         */
        static toRgbColorObject(value) {
          let color;
          if (typeof value === "string" && value.substring(0, 1) === "#") {
            color = Color.hexToRgb(value);
            if (!color) color = { r: 0, g: 0, b: 0, a: 255 };
          } else {
            color = Color.decimalToRgb(Cast.toNumber(value));
          }
          return color;
        }
        /**
         * Determine if a Scratch argument is a white space string (or null / empty).
         * @param {*} val value to check.
         * @return {boolean} True if the argument is all white spaces or null / empty.
         */
        static isWhiteSpace(val) {
          return val === null || typeof val === "string" && val.trim().length === 0;
        }
        /**
         * Compare two values, using Scratch cast, case-insensitive string compare, etc.
         * In Scratch 2.0, this is captured by `interp.compare.`
         * @param {*} v1 First value to compare.
         * @param {*} v2 Second value to compare.
         * @returns {number} Negative number if v1 < v2; 0 if equal; positive otherwise.
         */
        static compare(v1, v2) {
          let n1 = Number(v1);
          let n2 = Number(v2);
          if (n1 === 0 && isNotActuallyZero(v1)) {
            n1 = NaN;
          } else if (n2 === 0 && isNotActuallyZero(v2)) {
            n2 = NaN;
          }
          if (isNaN(n1) || isNaN(n2)) {
            const s1 = String(v1).toLowerCase();
            const s2 = String(v2).toLowerCase();
            if (s1 < s2) {
              return -1;
            } else if (s1 > s2) {
              return 1;
            }
            return 0;
          }
          if (n1 === Infinity && n2 === Infinity || n1 === -Infinity && n2 === -Infinity) {
            return 0;
          }
          return n1 - n2;
        }
        /**
         * Determine if a Scratch argument number represents a round integer.
         * @param {*} val Value to check.
         * @return {boolean} True if number looks like an integer.
         */
        static isInt(val) {
          if (typeof val === "number") {
            if (isNaN(val)) {
              return true;
            }
            return val === Math.floor(val);
          } else if (typeof val === "boolean") {
            return true;
          } else if (typeof val === "string") {
            return val.indexOf(".") < 0;
          }
          return false;
        }
        static get LIST_INVALID() {
          return "INVALID";
        }
        static get LIST_ALL() {
          return "ALL";
        }
        /**
         * Compute a 1-based index into a list, based on a Scratch argument.
         * Two special cases may be returned:
         * LIST_ALL: if the block is referring to all of the items in the list.
         * LIST_INVALID: if the index was invalid in any way.
         * @param {*} index Scratch arg, including 1-based numbers or special cases.
         * @param {number} length Length of the list.
         * @param {boolean} acceptAll Whether it should accept "all" or not.
         * @return {(number|string)} 1-based index for list, LIST_ALL, or LIST_INVALID.
         */
        static toListIndex(index, length, acceptAll) {
          if (typeof index !== "number") {
            if (index === "all") {
              return acceptAll ? Cast.LIST_ALL : Cast.LIST_INVALID;
            }
            if (index === "last") {
              if (length > 0) {
                return length;
              }
              return Cast.LIST_INVALID;
            } else if (index === "random" || index === "any") {
              if (length > 0) {
                return 1 + Math.floor(Math.random() * length);
              }
              return Cast.LIST_INVALID;
            }
          }
          index = Math.floor(Cast.toNumber(index));
          if (index < 1 || index > length) {
            return Cast.LIST_INVALID;
          }
          return index;
        }
      }
      delete global.fetch;
      delete global.XMLHttpRequest;
      delete global.WebSocket;
      delete global.Worker;
      delete global.importScripts;
      global.window = global;
      global.console = {
        log: () => {
        },
        info: () => {
        },
        warn: () => {
        },
        error: () => {
        },
        debug: () => {
        },
        trace: () => {
        },
        dir: () => {
        },
        time: () => {
        },
        timeLog: () => {
        },
        timeStamp: () => {
        },
        timeEnd: () => {
        },
        assert: () => {
        },
        clear: () => {
        },
        count: () => {
        },
        countReset: () => {
        },
        group: () => {
        },
        groupEnd: () => {
        },
        table: () => {
        },
        profile: () => {
        },
        profileEnd: () => {
        }
      };
      global.document = {
        createElement: () => ({
          style: {},
          setAttribute: () => {
          },
          getContext: () => ({
            fillRect: () => {
            },
            drawImage: () => {
            },
            getImageData: () => ({
              data: []
            }),
            putImageData: () => {
            },
            createImageData: () => [],
            setTransform: () => {
            },
            drawFocusIfNeeded: () => {
            },
            resetTransform: () => {
            }
          }),
          appendChild: () => {
          },
          addEventListener: () => {
          },
          removeEventListener: () => {
          }
        }),
        addEventListener: () => {
        },
        removeEventListener: () => {
        },
        body: {
          appendChild: () => {
          }
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        readyState: "complete",
        documentElement: {
          style: {}
        }
      };
      let translation = {};
      const dummyTranslate = Object.assign(
        (message, args) => {
          if (message && typeof message === "object") {
            return translation?.["zh-cn"]?.[message?.id] ?? translation?.["en"]?.[message?.id] ?? message?.default;
          } else if (typeof message === "string") {
            return translation?.["zh-cn"]?.[message] ?? translation?.["en"]?.[message] ?? message;
          }
          return null;
        },
        {
          setup(t) {
            if (t && typeof t === "object") {
              translation = t;
            }
          }
        }
      );
      const fakeVm = {
        getAllSprites() {
          return [];
        },
        getEditingTarget() {
          return null;
        },
        getRenderer() {
          return null;
        },
        getRuntime() {
          return fakeVm.runtime;
        },
        on() {
        },
        removeListener() {
        },
        emit() {
        },
        runtime: {
          getTargetById() {
            return null;
          },
          getAllTargets() {
            return [];
          },
          getFormatMessage: (obj) => {
            global.Scratch.translate.setup(obj);
            return global.Scratch.translate;
          }
        }
      };
      global.Scratch = {
        ArgumentType: {
          ANGLE: "angle",
          BOOLEAN: "Boolean",
          COLOR: "color",
          NUMBER: "number",
          STRING: "string",
          MATRIX: "matrix",
          NOTE: "note",
          IMAGE: "image",
          XIGUA_MATRIX: "xigua_matrix",
          XIGUA_WHITE_BOARD_NOTE: "xigua_white_board_note",
          CCW_HAT_PARAMETER: "ccw_hat_parameter",
          COSTUME: "costume",
          SOUND: "sound"
        },
        BlockType: {
          BOOLEAN: "Boolean",
          BUTTON: "button",
          LABEL: "label",
          COMMAND: "command",
          CONDITIONAL: "conditional",
          EVENT: "event",
          HAT: "hat",
          LOOP: "loop",
          REPORTER: "reporter",
          XML: "xml"
        },
        TargetType: {
          SPRITE: "sprite",
          STAGE: "stage"
        },
        extensions: {
          unsandboxed: true,
          register: function(ext) {
            global.extensionInstance = ext;
          }
        },
        Cast,
        Color,
        vm: fakeVm,
        runtime: fakeVm.runtime,
        renderer: null,
        translate: dummyTranslate
      };
      global.extensionInstance = null;
    });
    const timeoutPm = new Promise(
      (resolve) => setTimeout(() => {
        resolve({
          result: "error",
          error: "Timeout",
          info: null
        });
      }, timeout * 1e3)
    );
    let result = sandbox.evaluate(async (code2) => {
      try {
        const AsyncFunction = Object.getPrototypeOf(
          async function() {
          }
        ).constructor;
        const fn = new AsyncFunction(code2);
        await fn();
        if (globalThis.tempExt) {
          globalThis.extensionInstance = new globalThis.tempExt.Extension(
            globalThis.runtime
          );
        }
        return {
          result: "success",
          error: null,
          info: JSON.parse(JSON.stringify(globalThis.extensionInstance.getInfo()))
        };
      } catch (e) {
        return {
          result: "error",
          error: e instanceof Error ? e.stack : String(e),
          info: null
        };
      }
    }, code);
    return Promise.race([result, timeoutPm]).then((res) => {
      sandbox.dispose();
      return res;
    });
  }

  // src/scene/extensionEdit.js
  var ExtensionEditScene = class {
    static title = "编辑扩展";
    /**
     *
     * @param {import('../base/scene.js').SceneManager} manager
     * @param {{ name: string, url: string, type: 'custom', newContent: string | null }} extension
     */
    constructor(manager, extension) {
      this.manager = manager;
      this.extension = extension;
      Monaco.then((v) => {
        this.Monaco = v;
        this.manager.requestUpdate();
      });
      this.editor = null;
    }
    async getExtensionInfo() {
      const extensionInfo = await getExtensionInfo(
        this.extension.newContent ?? ""
      );
      if (extensionInfo.result !== "success") {
        return extensionInfo;
      } else {
        const template = `// 代码并不直接可用，请根据扩展实际功能进行修改。

;(function (Scratch, info) {
  'use strict'
  class Extension {
    getInfo() {
      return info
    }${(() => {
          const getDefaultDummy = (blockType) => {
            switch (blockType) {
              case "reporter":
                return "\n      return 0\n    ";
              case "Boolean":
                return "\n      return false\n    ";
              default:
                return "";
            }
          };
          try {
            const code = extensionInfo.info.blocks.map(
              (v) => `[${JSON.stringify(v.opcode ?? v.func)}] () {${getDefaultDummy(v.blockType)}}`
            );
            return code.length ? "\n    " + code.join("\n    ") : "";
          } catch {
            return "";
          }
        })()}
  }
  Scratch.extensions.register(new Extension())
})(Scratch, ${JSON.stringify(extensionInfo.info, null, 2)})`;
        return template.trim();
      }
    }
    render() {
      const target = this.manager.target;
      if (!this.Monaco) {
        const loading = document.createElement("strong");
        loading.style.color = "#a0a0b0";
        loading.textContent = "加载中...";
        loading.style.display = "block";
        loading.style.textAlign = "center";
        target.appendChild(loading);
      } else {
        if (this.editor) this.editor.dispose();
        const editor = document.createElement("div");
        editor.style.width = "550px";
        editor.style.height = "300px";
        editor.style.marginBottom = "10px";
        target.appendChild(editor);
        this.editor = this.Monaco.editor.create(editor, {
          value: this.extension.newContent ?? "// 正在获取扩展内容...",
          automaticLayout: true,
          language: "javascript",
          tabSize: 2,
          insertSpaces: true
        });
        this.editor.onDidChangeModelContent(() => {
          this.extension.newContent = this.editor.getValue();
        });
        if (this.extension.newContent === null) {
          fetch(this.extension.url).then((r) => r.text()).then((text) => {
            this.extension.newContent = text;
            this.editor.setValue(text);
          }).catch(() => {
            this.editor.setValue(this.extension.newContent);
            this.extension.newContent = null;
          });
        }
        const toolbar = document.createElement("div");
        toolbar.style.display = "flex";
        toolbar.style.width = "100%";
        toolbar.style.height = "50px";
        if (this.extension.url.startsWith(
          "https://m.ccw.site/user_projects_assets/"
        )) {
          const loading = document.createElement("p");
          loading.style.color = "#a0a0b0";
          loading.textContent = "正在解析扩展...";
          loading.style.display = "block";
          loading.style.textAlign = "center";
          toolbar.appendChild(loading);
          fetch(
            `https://bfs-web.ccw.site/extensions/${encodeURIComponent(this.extension.name)}`
          ).then((v) => v.json()).then((data) => {
            if (data.status !== 200) {
              loading.textContent = "解析扩展失败。";
              return;
            }
            const body = data.body;
            const version2 = body.versions.find(
              (v) => v.assetUri === this.extension.url
            );
            if (!version2) {
              loading.textContent = "解析扩展失败。";
              return;
            }
            const link = document.createElement("a");
            link.href = `https://assets.ccw.site/extensions/${body.eid}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = `${body.name} (${version2.version})`;
            link.style.textDecoration = "none";
            link.style.color = "#a0a0b0";
            link.style.marginRight = "10px";
            link.style.marginTop = "10px";
            link.style.marginLeft = "10px";
            loading.replaceWith(link);
            const useNoopButton = document.createElement("button");
            useNoopButton.textContent = "生成空扩展";
            useNoopButton.title = "根据官方积木预览生成空扩展 (可能出现问题)。右键可以使用沙箱解析。";
            useNoopButton.style.marginBottom = "10px";
            useNoopButton.style.marginLeft = "10px";
            useNoopButton.style.padding = "10px 20px";
            useNoopButton.style.fontSize = "16px";
            useNoopButton.addEventListener("click", async () => {
              try {
                useNoopButton.disabled = true;
                useNoopButton.textContent = "请稍等";
                const preview = version2.previews[0];
                const svg = await fetch(preview).then((r) => r.text());
                const parser = new DOMParser();
                const doc = parser.parseFromString(svg, "image/svg+xml");
                const opcode = `/**
${Array.from(
                  doc.querySelectorAll("g.blocklyDraggable")
                ).map((v) => {
                  const typeMap = {
                    "reporter boolean": "Scratch.BlockType.BOOLEAN",
                    "reporter round": "Scratch.BlockType.REPORTER",
                    "c-block": "Scratch.BlockType.CONDITIONAL"
                  };
                  return {
                    opcode: v.getAttribute("data-id"),
                    type: Object.entries(typeMap).find(
                      ([k]) => v.getAttribute("data-shapes").includes(k)
                    )?.[1] || "(未知)"
                  };
                }).map((v) => {
                  return ` * @${v.opcode} 类型 ${v.type}`;
                })}
 */`;
                const res = await this.getExtensionInfo();
                if (typeof res !== "string") {
                  useNoopButton.textContent = "发生错误";
                  useNoopButton.style.color = "#a0a0b0";
                  useNoopButton.title = res.error;
                  return;
                }
                let code = opcode + "\n\n" + res;
                this.extension.newContent = code;
                this.editor.setValue(this.extension.newContent);
                useNoopButton.textContent = "生成空扩展";
                useNoopButton.disabled = false;
              } catch (e) {
                useNoopButton.textContent = "发生错误";
                useNoopButton.style.color = "#a0a0b0";
                useNoopButton.title = e instanceof Error ? e.stack ?? e.message : String(e);
              }
            });
            link.after(useNoopButton);
            const marketButton = document.createElement("button");
            marketButton.textContent = "使用优化版";
            marketButton.title = "⚠️不想上学研发的高危扩展 使用后果自负⚠️";
            marketButton.style.marginBottom = "10px";
            marketButton.style.marginLeft = "10px";
            marketButton.style.padding = "10px 20px";
            marketButton.style.fontSize = "16px";
            marketButton.addEventListener("click", async () => {
              marketButton.disabled = true;
              marketButton.textContent = "请稍等";
              const ext = await fetch(
                `https://csense-rev.github.io/csense-marketplace/${body.eid}/${version2.version}.js`
              ).then((r) => {
                if (!r.ok) return null;
                return r.text();
              }).catch(() => null);
              if (!ext) {
                marketButton.textContent = "获取失败";
                marketButton.style.color = "#a0a0b0";
                marketButton.title = "社区市场暂无此扩展。请访问 https://github.com/csense-rev/csense-marketplace 请求此扩展。";
                return;
              }
              this.extension.newContent = ext;
              this.editor.setValue(this.extension.newContent);
              marketButton.textContent = "使用优化版";
              marketButton.disabled = false;
            });
            useNoopButton.after(marketButton);
            const space = document.createElement("div");
            space.style.flexGrow = "1";
            marketButton.after(space);
            const inspectButton = document.createElement("button");
            inspectButton.textContent = "🔎";
            inspectButton.style.marginBottom = "10px";
            inspectButton.style.marginRight = "10px";
            inspectButton.style.padding = "5px";
            inspectButton.title = "查看官方提供的积木预览。";
            let floatDiv = null;
            let hideTimeout = null;
            const showPreview = (ev) => {
              const svgUrl = version2.previews[0];
              if (!svgUrl) return;
              if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
              }
              if (!floatDiv) {
                floatDiv = document.createElement("div");
                floatDiv.style.position = "fixed";
                const mouseX = ev.clientX;
                const mouseY = ev.clientY;
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const popupWidth = 700;
                const popupHeight = 300;
                const rightSpace = windowWidth - mouseX;
                const leftSpace = mouseX;
                if (rightSpace >= popupWidth) {
                  floatDiv.style.left = mouseX + "px";
                  floatDiv.style.bottom = windowHeight - mouseY + "px";
                } else if (leftSpace >= popupWidth) {
                  floatDiv.style.right = windowWidth - mouseX + "px";
                  floatDiv.style.bottom = windowHeight - mouseY + "px";
                } else {
                  floatDiv.style.right = windowWidth - mouseX + "px";
                  floatDiv.style.bottom = windowHeight - mouseY + "px";
                }
                floatDiv.style.backgroundColor = "#2a2a3d";
                floatDiv.style.border = "1px solid rgba(255,255,255,0.3)";
                floatDiv.style.borderRadius = "8px";
                floatDiv.style.padding = "10px";
                floatDiv.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
                floatDiv.style.zIndex = String(CSENSE_WINDOW_BASE_ZINDEX + 1);
                floatDiv.style.maxWidth = "700px";
                floatDiv.style.maxHeight = "300px";
                floatDiv.style.overflowX = "auto";
                const img = document.createElement("img");
                img.src = svgUrl;
                img.style.display = "block";
                img.style.margin = "10px";
                img.style.maxWidth = "100%";
                img.style.height = "auto";
                floatDiv.appendChild(img);
                document.body.appendChild(floatDiv);
                floatDiv.addEventListener("mouseenter", () => {
                  if (hideTimeout) {
                    clearTimeout(hideTimeout);
                    hideTimeout = null;
                  }
                });
                floatDiv.addEventListener("mouseleave", () => {
                  hideTimeout = setTimeout(() => {
                    if (floatDiv) {
                      floatDiv.remove();
                      floatDiv = null;
                    }
                  }, 100);
                });
              }
            };
            const hidePreview = () => {
              hideTimeout = setTimeout(() => {
                if (floatDiv) {
                  floatDiv.remove();
                  floatDiv = null;
                }
              }, 100);
            };
            inspectButton.addEventListener("mouseenter", showPreview);
            inspectButton.addEventListener("mouseleave", hidePreview);
            space.after(inspectButton);
          }).catch((v) => {
            loading.textContent = "解析扩展失败。";
          });
        } else {
          const useNoopButton = document.createElement("button");
          useNoopButton.textContent = "生成空扩展";
          useNoopButton.title = "尝试使用沙箱生成空扩展。";
          useNoopButton.style.marginBottom = "10px";
          useNoopButton.style.marginLeft = "10px";
          useNoopButton.style.padding = "10px 20px";
          useNoopButton.style.fontSize = "16px";
          useNoopButton.addEventListener("click", async (ev) => {
            useNoopButton.disabled = true;
            useNoopButton.textContent = "请稍等";
            const res = await this.getExtensionInfo();
            if (typeof res !== "string") {
              useNoopButton.textContent = "发生错误";
              useNoopButton.style.color = "#a0a0b0";
              useNoopButton.title = res.error;
            }
            this.extension.newContent = res;
            this.editor.setValue(this.extension.newContent);
            useNoopButton.textContent = "生成空扩展";
            useNoopButton.disabled = false;
          });
          toolbar.appendChild(useNoopButton);
        }
        target.appendChild(toolbar);
      }
    }
    dispose() {
      this.editor?.dispose();
    }
  };

  // src/scene/extension.js
  var ExtensionScene = class {
    static title = "扩展";
    /**
     *
     * @param {import('../base/scene.js').SceneManager} manager
     * @param {import('../overlay/extension.js').ExtensionOverlay} overlay
     */
    constructor(manager, overlay) {
      this.manager = manager;
      this.overlay = overlay;
      const extensionsList = this.extensionsList = [];
      for (const ext of this.overlay.projectJson.extensions) {
        if (!this.overlay.projectJson.gandi?.wildExtensions?.[ext])
          extensionsList.push({
            name: ext,
            type: "internal",
            url: null
          });
      }
      if (this.overlay.projectJson.gandi?.wildExtensions) {
        for (const [name, obj] of Object.entries(
          this.overlay.projectJson.gandi?.wildExtensions ?? {}
        )) {
          extensionsList.push({
            name,
            type: "custom",
            url: obj.url,
            newContent: null
          });
        }
      }
    }
    async loadExtension(ext) {
      if (!state_default.vm.extensionManager._gandiExternalExtensionServicesLoaded) {
        await state_default.vm.extensionManager.loadGandiExternalExtensionServers();
      }
      if (ext.type === "internal") {
        await state_default.vm.extensionManager.loadExtensionURL(ext.name);
      } else if (ext.type === "custom" && ext.url) {
        let url = ext.url;
        let isFake = false;
        if (ext.newContent !== null) {
          url = URL.createObjectURL(
            new File([ext.newContent], "extension.js", {
              type: "application/javascript"
            })
          );
          patch(
            state_default.vm.extensionManager,
            "addCustomExtensionInfo",
            (addCustomExtensionInfo) => {
              return function(ext2, maskUrl) {
                if (maskUrl === url) {
                  maskUrl = ext2.url;
                }
                state_default.vm.extensionManager.addCustomExtensionInfo = addCustomExtensionInfo;
                return addCustomExtensionInfo.call(this, ext2, maskUrl);
              };
            }
          );
          isFake = true;
          patch(document, "createElement", (createElement) => {
            return function(tagName) {
              if (tagName === "script") {
                const script = createElement.call(this, tagName);
                const proxy = new Proxy(script, {
                  set(target, prop, value) {
                    if (prop === "src") {
                      return Reflect.set(target, "src", url);
                    } else return Reflect.set(target, prop, value);
                  }
                });
                document.createElement = createElement;
                patch(document.body, "append", (append) => {
                  return function(child) {
                    if (child === proxy) {
                      document.body.append = append;
                      return append.call(this, script);
                    }
                    return append.call(this, child);
                  };
                });
                patch(document.body, "removeChild", (removeChild) => {
                  return function(child) {
                    if (child === proxy) {
                      document.body.removeChild = removeChild;
                      return removeChild.call(this, script);
                    }
                    return removeChild.call(this, child);
                  };
                });
                return proxy;
              }
              return createElement.call(this, tagName);
            };
          });
        }
        await state_default.vm.extensionManager.loadExtensionURL(url);
        if (isFake) URL.revokeObjectURL(url);
      }
    }
    async loadModifiedProject() {
      for (const ext of this.extensionsList) {
        if (state_default.vm.extensionManager.isExtensionLoaded(ext.name)) {
          continue;
        }
        await this.loadExtension(ext);
      }
      if (this.overlay.projectJson.gandi?.wildExtensions) {
        this.overlay.projectJson.gandi.wildExtensions = {};
      }
      const _clearLoadedExtensions = state_default.vm.extensionManager.clearLoadedExtensions;
      state_default.vm.extensionManager.clearLoadedExtensions = function() {
        state_default.vm.extensionManager.clearLoadedExtensions = _clearLoadedExtensions;
      };
      this.overlay.projectJson.extensions = [];
      this.overlay.projectJson.extensionURLs = {};
      this.overlay.input = this.overlay.input.file(
        "project.json",
        JSON.stringify(this.overlay.projectJson)
      );
      this.overlay.resolver.resolve(this.overlay.input);
    }
    render() {
      const target = this.manager.target;
      const extensionsList = this.extensionsList;
      if (extensionsList.length === 0) {
        const noExt = document.createElement("p");
        noExt.style.textAlign = "center";
        noExt.textContent = "该项目没有使用任何扩展。";
        target.appendChild(noExt);
        return;
      }
      const container = document.createElement("div");
      container.style.display = "flex";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "搜索扩展...";
      searchInput.style.padding = "5px";
      searchInput.style.border = "1px solid rgba(255,255,255,0.3)";
      searchInput.style.flexGrow = "1";
      searchInput.style.boxSizing = "border-box";
      searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const items = list.children;
        let hasResults = false;
        Array.from(items).forEach((item) => {
          if (item.className !== "no-results" && item.querySelector(".item-name").textContent.toLowerCase().includes(filter)) {
            item.style.display = "flex";
            hasResults = true;
          } else if (item.className !== "no-results") {
            item.style.display = "none";
          }
        });
        if (!hasResults) {
          if (!list.querySelector(".no-results")) {
            const noResultsItem = document.createElement("li");
            noResultsItem.textContent = "(无结果)";
            noResultsItem.className = "no-results";
            noResultsItem.style.display = "flex";
            noResultsItem.style.justifyContent = "center";
            noResultsItem.style.alignItems = "center";
            noResultsItem.style.width = "100%";
            noResultsItem.style.height = "100%";
            noResultsItem.style.color = "#a0a0b0";
            list.appendChild(noResultsItem);
          }
        } else {
          const noResultsItem = list.querySelector(".no-results");
          if (noResultsItem) {
            list.removeChild(noResultsItem);
          }
        }
      });
      container.appendChild(searchInput);
      const continueButton = document.createElement("button");
      continueButton.textContent = "▶️";
      continueButton.title = "完成编辑";
      continueButton.style.padding = "5px";
      continueButton.style.border = "none";
      continueButton.style.borderRadius = "5px";
      continueButton.style.color = "white";
      continueButton.style.backgroundColor = "#6c5ce7";
      continueButton.style.cursor = "pointer";
      continueButton.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
      continueButton.style.width = "30px";
      continueButton.style.height = "30px";
      continueButton.addEventListener("click", async () => {
        this.manager.back();
        this.overlay.showOverlay = false;
        await this.loadModifiedProject();
      });
      container.appendChild(continueButton);
      target.appendChild(container);
      const scrollable = createScrollable();
      const list = document.createElement("ul");
      list.style.listStyle = "none";
      list.style.padding = "0";
      list.style.margin = "0";
      let loadPromise = Promise.resolve();
      extensionsList.forEach((ext) => {
        const listItem = document.createElement("li");
        listItem.style.display = "flex";
        listItem.style.alignItems = "center";
        listItem.style.padding = "5px";
        listItem.style.border = "1px solid rgba(255,255,255,0.3)";
        listItem.style.borderRadius = "4px";
        listItem.style.backgroundColor = "#2a2a3d";
        const name = document.createElement("span");
        name.textContent = ext.name;
        name.classList.add("item-name");
        name.style.marginRight = "10px";
        listItem.appendChild(name);
        const type = document.createElement("span");
        type.textContent = ext.type === "internal" ? "官方扩展" : `自定义扩展${ext.newContent !== null ? " (已修改)" : ""}`;
        if (ext.type === "custom" && ext.url) {
          type.title = ext.url;
        }
        type.style.fontSize = "12px";
        type.style.color = "#a0a0b0";
        type.style.flexGrow = "1";
        listItem.appendChild(type);
        let editButton = null;
        if (ext.type === "custom" && ext.url && !state_default.vm.extensionManager.isExtensionLoaded(ext.name)) {
          editButton = document.createElement("button");
          editButton.textContent = "✏️";
          editButton.title = "点击此处编辑此扩展。将会打开一个代码编辑器。";
          editButton.style.marginRight = "5px";
          editButton.addEventListener("click", () => {
            this.manager.open(new ExtensionEditScene(this.manager, ext));
          });
          listItem.appendChild(editButton);
        }
        const loadButton = document.createElement("button");
        loadButton.textContent = "⏬";
        loadButton.title = "立刻加载扩展";
        if (state_default.vm.extensionManager.isExtensionLoaded(ext.name)) {
          loadButton.textContent = "✅";
          loadButton.title = "已加载";
          loadButton.disabled = true;
        } else {
          loadButton.addEventListener("click", () => {
            loadButton.textContent = "✅";
            loadButton.title = "已加载";
            loadButton.disabled = true;
            if (editButton) {
              listItem.removeChild(editButton);
              editButton = null;
            }
            loadPromise = loadPromise.then(() => this.loadExtension(ext));
          });
        }
        listItem.appendChild(loadButton);
        list.appendChild(listItem);
      });
      scrollable.appendChild(list);
      target.appendChild(scrollable);
    }
    dispose() {
    }
  };

  // src/overlay/extension.js
  var ExtensionOverlay = class {
    /**
     * @param {import('../base/scene.js').SceneManager} manager
     * @param {import('jszip')} input
     * @param {object} projectJson
     * @param {PromiseWithResolvers<import('jszip')>} resolver
     */
    constructor(manager, input, projectJson, resolver) {
      this.manager = manager;
      this.input = input;
      this.projectJson = projectJson;
      this.resolver = resolver;
      this.showOverlay = true;
      this.resolver.promise.then(() => {
        manager.removeOverlay(this);
      });
      state_default.button.title = "CForge拦截了扩展的加载，请点击进行处理。";
      // 弹窗提醒用户处理扩展（JS拖拽调整大小 + 美化界面）
      var _cfModal = document.createElement("div");
      _cfModal.id = "_cfModal_root";
      _cfModal.style.cssText = "position:fixed;z-index:99999;width:360px;min-width:260px;min-height:180px;"
        + "background:linear-gradient(145deg,#0f0f23 0%,#1a1a3e 40%,#252350 100%);"
        + "border:1px solid rgba(255,215,0,0.4);border-radius:16px;padding:0;color:#fff;"
        + "font-family:-apple-system,BlinkMacSystemFont,sans-serif;"
        + "box-shadow:0 16px 48px rgba(0,0,0,0.6),0 0 30px rgba(255,215,0,0.08),inset 0 1px 0 rgba(255,255,255,0.08);"
        + "backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);overflow:visible;user-select:none;";
      // 注入hover等伪类样式（仅用于交互增强，核心样式已内联）
      if (!document.getElementById('_cfModal_styles')) {
        var _cfStyles = document.createElement('style');
        _cfStyles.id = '_cfModal_styles';
        _cfStyles.textContent = '#_cfModal_root #_cf_modal_close:hover{background:linear-gradient(135deg,rgba(255,215,0,0.3),rgba(255,200,0,0.15))!important;transform:translateY(-1px);box-shadow:0 4px 16px rgba(255,215,0,0.25)}#_cfModal_root #_cf_modal_close:active{transform:translateY(0);box-shadow:none}#_cfModal_root .resize-handle:hover{opacity:0.9!important}';
        document.head.appendChild(_cfStyles);
      }
      // 用 DOM API 构建内容，避免 innerHTML 转义问题
      var _header = document.createElement('div');
      _header.style.cssText = 'padding:20px 24px 0;text-align:center;';
      var _iconWrap = document.createElement('div');
      _iconWrap.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,rgba(255,215,0,0.18),rgba(255,180,0,0.06));border:1px solid rgba(255,215,0,0.3);margin-bottom:14px;';
      var _icon = document.createElement('span');
      _icon.style.cssText = 'font-size:28px;line-height:1;';
      _icon.textContent = '\u26a0\ufe0f';
      _iconWrap.appendChild(_icon);
      var _title = document.createElement('div');
      _title.style.cssText = 'font-size:17px;font-weight:600;letter-spacing:0.5px;color:#f0f0f8;margin-bottom:8px;';
      _title.textContent = '\u68c0\u6d4b\u5230\u4f5c\u54c1\u81ea\u5e26\u6269\u5c55';
      _header.appendChild(_iconWrap);
      _header.appendChild(_title);
      var _body = document.createElement('div');
      _body.style.cssText = 'padding:12px 24px 24px;text-align:center;';
      var _desc = document.createElement('div');
      _desc.style.cssText = 'font-size:13px;color:rgba(190,190,215,0.85);line-height:1.6;margin-bottom:20px;';
      _desc.textContent = '\u70b9\u51fb\u60ac\u6d6e\u7403\u67e5\u770b\u5e76\u51b3\u5b9a\u662f\u5426\u52a0\u8f7d';
      var _closeBtn = document.createElement('button');
      _closeBtn.id = '_cf_modal_close';
      _closeBtn.style.cssText = 'padding:10px 32px;border-radius:10px;border:1px solid rgba(255,215,0,0.45);background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,200,0,0.06));color:#ffd700;cursor:pointer;font-size:14px;font-weight:500;letter-spacing:0.5px;transition:all 0.25s ease;outline:none;';
      _closeBtn.textContent = '\u77e5\u9053\u4e86';
      _body.appendChild(_desc);
      _body.appendChild(_closeBtn);
      // 右下角拖拽手柄
      var _resizeHandle = document.createElement('div');
      _resizeHandle.className = 'resize-handle';
      _resizeHandle.title = '\u62d6\u62fd\u8c03\u6574\u5927\u5c0f';
      _resizeHandle.style.cssText = 'position:absolute;bottom:0;right:0;width:24px;height:24px;cursor:nwse-resize;display:flex;align-items:center;justify-content:center;opacity:0.4;transition:opacity 0.2s;z-index:10;';
      _resizeHandle.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 2L2 12M12 6L6 12M12 10L10 12" stroke="rgba(255,215,0,0.85)" stroke-width="1.5" stroke-linecap="round"/></svg>';
      _cfModal.appendChild(_header);
      _cfModal.appendChild(_body);
      _cfModal.appendChild(_resizeHandle);
      document.body.appendChild(_cfModal);
      // 居中定位
      _cfModal.style.left = (window.innerWidth - _cfModal.offsetWidth) / 2 + 'px';
      _cfModal.style.top = (window.innerHeight - _cfModal.offsetHeight) / 2 + 'px';
      // JS拖拽调整大小
      var _isResizing = false, _startX = 0, _startY = 0, _startW = 0, _startH = 0;
      _resizeHandle.addEventListener('mousedown', function(e) {
        e.preventDefault(); e.stopPropagation();
        _isResizing = true; _startX = e.clientX; _startY = e.clientY;
        _startW = _cfModal.offsetWidth; _startH = _cfModal.offsetHeight;
        document.addEventListener('mousemove', _onResizeMove);
        document.addEventListener('mouseup', _onResizeEnd);
      }, false);
      _resizeHandle.addEventListener('touchstart', function(e) {
        e.preventDefault(); e.stopPropagation();
        var t = e.touches[0];
        _isResizing = true; _startX = t.clientX; _startY = t.clientY;
        _startW = _cfModal.offsetWidth; _startH = _cfModal.offsetHeight;
        document.addEventListener('touchmove', _onTouchResizeMove, {passive: false});
        document.addEventListener('touchend', _onTouchResizeEnd);
      }, false);
      function _onResizeMove(e) {
        if (!_isResizing) return;
        var newW = Math.max(260, _startW + (e.clientX - _startX));
        var newH = Math.max(180, _startH + (e.clientY - _startY));
        _cfModal.style.width = newW + 'px';
        _cfModal.style.height = newH + 'px';
      }
      function _onTouchResizeMove(e) {
        if (!_isResizing) return;
        e.preventDefault();
        var t = e.touches[0];
        var newW = Math.max(260, _startW + (t.clientX - _startX));
        var newH = Math.max(180, _startH + (t.clientY - _startY));
        _cfModal.style.width = newW + 'px';
        _cfModal.style.height = newH + 'px';
      }
      function _onResizeEnd() {
        _isResizing = false;
        document.removeEventListener('mousemove', _onResizeMove);
        document.removeEventListener('mouseup', _onResizeEnd);
      }
      function _onTouchResizeEnd() {
        _isResizing = false;
        document.removeEventListener('touchmove', _onTouchResizeMove);
        document.removeEventListener('touchend', _onTouchResizeEnd);
      }
      function _cfModalCleanup() {
        _cfModal.remove();
        var _s = document.getElementById('_cfModal_styles');
        if (_s) _s.remove();
        document.removeEventListener('mousemove', _onResizeMove);
        document.removeEventListener('mouseup', _onResizeEnd);
        document.removeEventListener('touchmove', _onTouchResizeMove);
        document.removeEventListener('touchend', _onTouchResizeEnd);
      }
      _closeBtn.addEventListener('click', _cfModalCleanup);
      // 渐变闪烁：原色\u2194黄色平滑过渡
      let blinkOn = false;
      state_default.button.style.transition = "filter 1s ease-in-out";
      if (state_default._blinkTimer) clearInterval(state_default._blinkTimer);
      state_default._blinkTimer = setInterval(() => {
        blinkOn = !blinkOn;
        state_default.button.style.filter = blinkOn ? "sepia(1) saturate(5) hue-rotate(-10deg)" : "none";
      }, 500);
      state_default.button.style.filter = "none";


      this.scene = new ExtensionScene(this.manager, this);
    }
    render() {
      const currentScene = this.manager.scene.at(-1)?.constructor?.title;
      if (currentScene !== "主页" || !this.showOverlay) {
        return;
      }
      const target = this.manager.target;
      const warningDiv = document.createElement("div");
      warningDiv.style.cursor = "pointer";
      warningDiv.textContent = "请处理项目扩展";
      warningDiv.title = "该项目自带了一些扩展。在您确认之前，项目将不会加载。点击此处进行处理。";
      warningDiv.style.width = "100%";
      warningDiv.style.backgroundColor = "#b87333";
      warningDiv.style.color = "black";
      warningDiv.style.textAlign = "center";
      warningDiv.style.padding = "5px";
      warningDiv.style.fontSize = "12px";
      warningDiv.style.boxSizing = "border-box";
      warningDiv.addEventListener("click", async () => {
        this.manager.open(this.scene);
      });
      target.appendChild(warningDiv);
    }
    dispose() {
      if (state_default._blinkTimer) { clearInterval(state_default._blinkTimer); state_default._blinkTimer = null; }
      state_default.button.style.transition = "";
      state_default.button.style.filter = "none";
      state_default.button.title = "--点击打开CForge弹窗--";
      // 关闭弹窗（如果还在）
      const _m = document.getElementById('_cf_modal_close');
      if (_m) _m.closest('#_cfModal_root')?.remove();
      const _s = document.getElementById('_cfModal_styles');
      if (_s) _s.remove();
    }
  };

  // src/util/withResolvers.js
  function withResolvers() {
    let resolveFn, rejectFn;
    const promise = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
    return {
      promise,
      resolve: resolveFn,
      reject: rejectFn
    };
  }

  // src/scene/plugin.js
  var EventBlockScene = class {
    static title = "事件屏蔽";
    constructor(manager) {
      this.manager = manager;
    }
    render() {
      const target = this.manager.target;
      const eb = state_default.eventBlock;

      // 开关
      const switchRow = document.createElement("div");
      switchRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);";
      const switchLabel = document.createElement("span");
      switchLabel.textContent = "🛡️ 启用事件屏蔽";
      switchLabel.style.cssText = "color:white;font-weight:bold;";
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = eb.enabled;
      toggle.style.cssText = "width:18px;height:18px;cursor:pointer;accent-color:#7c6ef0;";
      toggle.addEventListener("change", () => {
        eb.enabled = toggle.checked;
        this.manager.requestUpdate();
      });
      switchRow.appendChild(switchLabel);
      switchRow.appendChild(toggle);
      target.appendChild(switchRow);

      // 说明
      const desc = document.createElement("p");
      desc.textContent = "屏蔽指定 Scratch hat 积木的触发。被屏蔽的事件将不会执行。默认屏蔽「当计时器大于X」。";
      desc.style.cssText = "font-size:12px;color:#a0a0b0;margin-bottom:12px;line-height:1.5;";
      target.appendChild(desc);

      // 屏蔽列表
      const listTitle = document.createElement("p");
      listTitle.textContent = "屏蔽列表";
      listTitle.style.cssText = "font-size:14px;margin-bottom:6px;color:#c0c0d0;";
      target.appendChild(listTitle);

      const scrollable = createScrollable();
      const list = document.createElement("ul");
      list.style.listStyle = "none";
      list.style.padding = "0";
      list.style.margin = "0";

      if (eb.blockList.length === 0) {
        const noItem = document.createElement("li");
        noItem.textContent = "(空列表，所有事件正常触发)";
        noItem.style.cssText = "color:#a0a0b0;text-align:center;padding:16px 0;";
        list.appendChild(noItem);
      } else {
        eb.blockList.forEach((opcode, index) => {
          const item = document.createElement("li");
          item.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:7px 10px;margin-bottom:4px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);";
          const nameSpan = document.createElement("span");
          nameSpan.textContent = opcode;
          nameSpan.style.cssText = "color:#e07070;font-family:monospace;font-size:13px;";
          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "❌";
          deleteBtn.title = "移除";
          deleteBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:14px;";
          deleteBtn.addEventListener("click", () => {
            eb.blockList.splice(index, 1);
            this.manager.requestUpdate();
          });
          item.appendChild(nameSpan);
          item.appendChild(deleteBtn);
          list.appendChild(item);
        });
      }
      scrollable.appendChild(list);
      target.appendChild(scrollable);

      // 添加输入
      const addRow = document.createElement("div");
      addRow.style.cssText = "display:flex;gap:8px;margin-top:10px;";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "输入事件opcode（如 event_whengreaterthan）";
      input.style.cssText = "flex:1;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:white;font-size:13px;";
      const addBtn = document.createElement("button");
      addBtn.textContent = "添加";
      addBtn.style.cssText = "padding:6px 14px;border-radius:6px;border:1px solid #7c6ef0;background:rgba(124,110,240,0.2);color:#7c6ef0;cursor:pointer;font-size:13px;";
      const doAdd = () => {
        const val = input.value.trim();
        if (val && !eb.blockList.includes(val)) {
          eb.blockList.push(val);
          input.value = "";
          this.manager.requestUpdate();
        } else if (eb.blockList.includes(val)) {
          input.animate([{ color: "orange" }, { color: "white" }], { duration: 400 });
        }
      };
      addBtn.addEventListener("click", doAdd);
      input.addEventListener("keypress", (e) => { if (e.key === "Enter") doAdd(); });
      addRow.appendChild(input);
      addRow.appendChild(addBtn);
      target.appendChild(addRow);

      // 常用事件快捷添加
      const quickTitle = document.createElement("p");
      quickTitle.textContent = "常用事件";
      quickTitle.style.cssText = "font-size:13px;color:#a0a0b0;margin-top:16px;margin-bottom:8px;";
      target.appendChild(quickTitle);

      const quickRow = document.createElement("div");
      quickRow.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;";
      const commonEvents = [
        { opcode: "event_whengreaterthan", label: "计时器>X" },
        { opcode: "event_whenflagclicked", label: "绿旗点击" },
        { opcode: "event_whenkeypressed", label: "按键按下" },
        { opcode: "event_whenthisspriteclicked", label: "角色被点击" },
        { opcode: "event_whenbackdropswitchesto", label: "背景切换" },
        { opcode: "event_whengreaterthan_timer", label: "计时器(旧)" },
        { opcode: "event_whenbroadcastreceived", label: "收到广播" },
        { opcode: "event_whenstageclicked", label: "舞台被点击" }
      ];
      for (const ev of commonEvents) {
        const chip = document.createElement("button");
        const isBlocked = eb.blockList.includes(ev.opcode);
        chip.textContent = ev.label;
        chip.title = ev.opcode;
        chip.style.cssText = `padding:4px 10px;border-radius:12px;border:1px solid ${isBlocked ? "#e07070" : "rgba(255,255,255,0.2)"};background:${isBlocked ? "rgba(224,112,112,0.2)" : "rgba(255,255,255,0.05)"};color:${isBlocked ? "#e07070" : "#a0a0b0"};cursor:pointer;font-size:12px;transition:all 0.2s;`;
        chip.addEventListener("click", () => {
          if (eb.blockList.includes(ev.opcode)) {
            eb.blockList.splice(eb.blockList.indexOf(ev.opcode), 1);
          } else {
            eb.blockList.push(ev.opcode);
          }
          this.manager.requestUpdate();
        });
        quickRow.appendChild(chip);
      }
      target.appendChild(quickRow);
    }
    dispose() {
    }
  };

  // [v0.8] 免疫黑名单插件场景
  var BlacklistBypassScene = class {
    static title = "免疫黑名单";
    constructor(manager) {
      this.manager = manager;
    }
    render() {
      const target = this.manager.target;
      const bl = state_default.blacklistBypass;

      // 开关
      const switchRow = document.createElement("div");
      switchRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);";
      const switchLabel = document.createElement("span");
      switchLabel.textContent = "🔓 启用免疫黑名单";
      switchLabel.style.cssText = "color:white;font-weight:bold;";
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = bl.enabled;
      toggle.style.cssText = "width:18px;height:18px;cursor:pointer;accent-color:#7c6ef0;";
      toggle.addEventListener("change", () => {
        bl.enabled = toggle.checked;
        try { localStorage.setItem("CForge_blacklistBypass", String(bl.enabled)); } catch(e) {}
        this.manager.requestUpdate();
      });
      switchRow.appendChild(switchLabel);
      switchRow.appendChild(toggle);
      target.appendChild(switchRow);

      // 说明
      const desc = document.createElement("p");
      desc.textContent = '开启后，在"回复我的"页面可以回复被拉黑的人的评论。原理是拦截黑名单状态检查接口，始终返回"未拉黑"状态。';
      desc.style.cssText = "font-size:12px;color:#a0a0b0;margin-bottom:12px;line-height:1.5;";
      target.appendChild(desc);

      // 状态指示
      const statusRow = document.createElement("div");
      statusRow.style.cssText = "padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);margin-top:8px;";
      const statusText = document.createElement("span");
      statusText.textContent = bl.enabled ? "✅ 免疫已开启 — 黑名单对你无效" : "⚪ 免疫已关闭 — 黑名单正常生效";
      statusText.style.cssText = `font-size:13px;color:${bl.enabled ? "#70e070" : "#a0a0b0"};`;
      statusRow.appendChild(statusText);
      target.appendChild(statusRow);

      // 来源说明
      const srcInfo = document.createElement("p");
      srcInfo.textContent = "来源：ccwtools — 作者：不想上学";
      srcInfo.style.cssText = "font-size:11px;color:#707080;margin-top:16px;";
      target.appendChild(srcInfo);
    }
    dispose() {
    }
  };

  // [v0.18] 跳过扩展拦截插件场景
  var SkipExtInterceptScene = class {
    static title = "跳过扩展拦截";
    constructor(manager) {
      this.manager = manager;
    }
    render() {
      const target = this.manager.target;
      const si = state_default.skipExtIntercept;

      const switchRow = document.createElement("div");
      switchRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);";
      const switchLabel = document.createElement("span");
      switchLabel.textContent = "⏭️ 跳过扩展拦截";
      switchLabel.style.cssText = "color:white;font-weight:bold;";
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = si.enabled;
      toggle.style.cssText = "width:18px;height:18px;cursor:pointer;accent-color:#7c6ef0;";
      toggle.addEventListener("change", () => {
        si.enabled = toggle.checked;
        try { localStorage.setItem("CForge_skipExtIntercept", String(si.enabled)); } catch(e) {}
        this.manager.requestUpdate();
      });
      switchRow.appendChild(switchLabel);
      switchRow.appendChild(toggle);
      target.appendChild(switchRow);

      const desc = document.createElement("p");
      desc.textContent = "开启后（默认），CForge不会拦截作品的扩展加载流程，直接使用原始方式加载项目。这可以避免MMO联机游戏中出现的画面异常（如看不到其他玩家身体、无法挖方块等）。关闭后，CForge会拦截扩展加载并弹窗让你管理扩展（原CSense行为）。修改后需刷新页面生效。";
      desc.style.cssText = "font-size:12px;color:#a0a0b0;margin-bottom:12px;line-height:1.5;";
      target.appendChild(desc);

      const statusRow = document.createElement("div");
      statusRow.style.cssText = "padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);margin-top:8px;";
      const statusText = document.createElement("span");
      statusText.textContent = si.enabled ? "✅ 当前：跳过扩展拦截（推荐）" : "⚠️ 当前：拦截扩展加载（可能导致MMO异常）";
      statusText.style.cssText = "font-size:13px;color:" + (si.enabled ? "#4caf50" : "#ff9800") + ";";
      statusRow.appendChild(statusText);
      target.appendChild(statusRow);
    }
    dispose() {
    }
  };


  var AutoClickerScene = class {
    static title = "0.7(连点器)";
    constructor(manager) {
      this.manager = manager;
    }
    render() {
      const target = this.manager.target;
      const ac = state_default.autoClicker;

      const switchRow = document.createElement("div");
      switchRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);";
      const switchLabel = document.createElement("span");
      switchLabel.textContent = "💫 0.7(连点器)";
      switchLabel.style.cssText = "color:white;font-weight:bold;";
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = ac.enabled;
      toggle.style.cssText = "width:18px;height:18px;cursor:pointer;accent-color:#7c6ef0;";
      toggle.addEventListener("change", () => {
        ac.enabled = toggle.checked;
        if (!ac.enabled) ac.active = false;
        try { localStorage.setItem("CForge_autoClicker", String(ac.enabled)); } catch(e) {}
        this.manager.requestUpdate();
      });
      switchRow.appendChild(switchLabel);
      switchRow.appendChild(toggle);
      target.appendChild(switchRow);

      const desc = document.createElement("p");
      desc.textContent = "开启后，按下设定的快捷键开始连点（每一帧交替按下/松开鼠标），按下其他任意键停止。";
      desc.style.cssText = "font-size:12px;color:#a0a0b0;margin-bottom:12px;line-height:1.5;";
      target.appendChild(desc);

      const hotkeyRow = document.createElement("div");
      hotkeyRow.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);";
      const hotkeyLabel = document.createElement("span");
      hotkeyLabel.textContent = "快捷键：";
      hotkeyLabel.style.cssText = "color:white;font-weight:bold;";
      const hotkeyInput = document.createElement("input");
      hotkeyInput.type = "text";
      hotkeyInput.value = ac.hotkey;
      hotkeyInput.maxLength = 1;
      hotkeyInput.style.cssText = "width:60px;padding:6px 10px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;background:#1e1e2e;color:white;font-size:14px;text-align:center;";
      hotkeyInput.placeholder = "按一个键";
      hotkeyInput.addEventListener("keydown", (e) => {
        e.preventDefault();
        if (e.key.length === 1 || e.key === "Enter" || e.key === " ") {
          ac.hotkey = e.key === " " ? " " : e.key;
          hotkeyInput.value = ac.hotkey;
          try { localStorage.setItem("CForge_autoClickerHotkey", ac.hotkey); } catch(e2) {}
        }
      });
      hotkeyRow.appendChild(hotkeyLabel);
      hotkeyRow.appendChild(hotkeyInput);
      target.appendChild(hotkeyRow);

      const statusRow = document.createElement("div");
      statusRow.style.cssText = "padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);margin-top:8px;";
      const statusText = document.createElement("span");
      if (!ac.enabled) {
        statusText.textContent = "⚠️ 当前：未开启";
        statusText.style.color = "#a0a0b0";
      } else if (ac.active) {
        statusText.textContent = "✅ 当前：连点中（按任意键停止）";
        statusText.style.color = "#4caf50";
      } else {
        statusText.textContent = "⏳ 当前：已开启，按下「" + ac.hotkey + "」开始连点";
        statusText.style.color = "#ff9800";
      }
      statusText.style.cssText += "font-size:13px;";
      statusRow.appendChild(statusText);
      target.appendChild(statusRow);
    }
    dispose() {
    }
  };

  // [v0.29] 读码JSON 插件场景
  var JsonCaptureScene = class {
    static title = "读码JSON";

    constructor(manager) {
      this.manager = manager;
      this.selectedIdx = -1;
    }

    render() {
      const target = this.manager.target;
      const jc = state_default.jsonCapture;

      // 开关
      const switchRow = document.createElement("div");
      switchRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);";
      const switchLabel = document.createElement("span");
      switchLabel.textContent = "📡 捕获API请求";
      switchLabel.style.cssText = "color:white;font-weight:bold;";
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = jc.enabled;
      toggle.style.cssText = "width:18px;height:18px;cursor:pointer;accent-color:#7c6ef0;";
      toggle.addEventListener("change", () => {
        jc.enabled = toggle.checked;
        if (!toggle.checked) { jc.captured = []; this.selectedIdx = -1; }
        this.manager.requestUpdate();
      });
      switchRow.appendChild(switchLabel);
      switchRow.appendChild(toggle);
      target.appendChild(switchRow);

      const desc = document.createElement("p");
      desc.textContent = "开启后拦截所有 fetch/XHR 发出的 JSON 请求体，可查看、编辑、复制或重放。";
      desc.style.cssText = "font-size:12px;color:#a0a0b0;margin-bottom:12px;line-height:1.5;";
      target.appendChild(desc);

      if (!jc.enabled) {
        const hint = document.createElement("div");
        hint.textContent = "⚠️ 请先开启捕获开关";
        hint.style.cssText = "text-align:center;color:#707080;padding:20px;";
        target.appendChild(hint);
        return;
      }

      // 操作按钮行
      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;gap:6px;margin-bottom:8px;";
      const clearBtn = document.createElement("button");
      clearBtn.textContent = "🗑️ 清空";
      clearBtn.style.cssText = "flex:1;padding:6px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;background:#2a2a3d;color:white;cursor:pointer;font-size:12px;";
      clearBtn.addEventListener("click", () => { jc.captured = []; this.selectedIdx = -1; this.manager.requestUpdate(); });
      btnRow.appendChild(clearBtn);
      target.appendChild(btnRow);

      // 捕获列表
      if (jc.captured.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "暂无捕获记录，操作页面触发API请求后将自动记录…";
        empty.style.cssText = "text-align:center;color:#707080;padding:20px;font-size:12px;";
        target.appendChild(empty);
        return;
      }

      const listContainer = document.createElement("div");
      listContainer.style.cssText = "max-height:200px;overflow-y:auto;margin-bottom:10px;border:1px solid rgba(255,255,255,0.1);border-radius:6px;";

      jc.captured.forEach((item, idx) => {
        const row = document.createElement("div");
        row.style.cssText = "padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;font-size:11px;" + (idx === this.selectedIdx ? "background:rgba(168,85,247,0.2);" : "");
        const urlSpan = document.createElement("div");
        urlSpan.textContent = "[" + item.timestamp + "] " + item.method + " " + (item.source || '');
        urlSpan.style.color = "#a0a0b0";
        urlSpan.style.marginBottom = "2px";
        const urlPath = document.createElement("div");
        try { urlPath.textContent = new URL(item.url, location.origin).pathname; } catch(e) { urlPath.textContent = item.url.substring(0, 60); }
        urlPath.style.color = idx === this.selectedIdx ? "#c084fc" : "#7080a0";
        urlPath.style.overflow = "hidden";
        urlPath.style.textOverflow = "ellipsis";
        urlPath.style.whiteSpace = "nowrap";
        row.appendChild(urlSpan);
        row.appendChild(urlPath);
        row.addEventListener("click", () => { this.selectedIdx = idx; this.manager.requestUpdate(); });
        listContainer.appendChild(row);
      });
      target.appendChild(listContainer);

      // 编辑器区域
      if (this.selectedIdx >= 0 && this.selectedIdx < jc.captured.length) {
        const item = jc.captured[this.selectedIdx];

        // URL 显示
        const urlBox = document.createElement("div");
        urlBox.style.cssText = "padding:6px 8px;background:rgba(255,255,255,0.05);border-radius:4px;margin-bottom:6px;font-size:11px;color:#a0a0b0;word-break:break-all;";
        urlBox.textContent = item.url;
        target.appendChild(urlBox);

        // JSON 编辑器
        const editorLabel = document.createElement("div");
        editorLabel.textContent = "📝 JSON 编辑器（可修改）";
        editorLabel.style.cssText = "font-size:12px;color:#a0a0b0;margin-bottom:4px;";
        target.appendChild(editorLabel);

        let formattedBody = item.body;
        try { formattedBody = JSON.stringify(JSON.parse(item.body), null, 2); } catch(e) {}

        const editor = document.createElement("textarea");
        editor.value = formattedBody;
        editor.style.cssText = "width:100%;height:240px;background:#0d1117;color:#c9d1d9;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:10px;font-family:'Consolas','Monaco','Courier New',monospace;font-size:12px;line-height:1.5;resize:vertical;tab-size:2;box-sizing:border-box;";
        editor.setAttribute("spellcheck", "false");
        target.appendChild(editor);

        // 按钮行
        const editBtnRow = document.createElement("div");
        editBtnRow.style.cssText = "display:flex;gap:6px;margin-top:6px;";

        const formatBtn = document.createElement("button");
        formatBtn.textContent = "📐 格式化";
        formatBtn.style.cssText = "flex:1;padding:6px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;background:#2a2a3d;color:white;cursor:pointer;font-size:12px;";
        formatBtn.addEventListener("click", () => {
          try { editor.value = JSON.stringify(JSON.parse(editor.value), null, 2); }
          catch(e) { alert('JSON 格式错误: ' + e.message); }
        });

        const copyBtn = document.createElement("button");
        copyBtn.textContent = "📋 复制";
        copyBtn.style.cssText = "flex:1;padding:6px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;background:#2a2a3d;color:white;cursor:pointer;font-size:12px;";
        copyBtn.addEventListener("click", () => {
          editor.select();
          document.execCommand("copy");
          copyBtn.textContent = "✅ 已复制";
          setTimeout(() => { copyBtn.textContent = "📋 复制"; }, 1500);
        });

        const replayBtn = document.createElement("button");
        replayBtn.textContent = "🚀 重放";
        replayBtn.style.cssText = "flex:1;padding:6px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;background:#2a1b4e;color:#c084fc;cursor:pointer;font-size:12px;";
        replayBtn.addEventListener("click", () => {
          try {
            JSON.parse(editor.value); // 验证JSON
            fetch(item.url, {
              method: item.method,
              headers: { 'Content-Type': 'application/json' },
              body: editor.value,
              credentials: 'include'
            }).then(function(r) {
              replayBtn.textContent = "✅ " + r.status;
              setTimeout(() => { replayBtn.textContent = "🚀 重放"; }, 2000);
            }).catch(function(e) {
              replayBtn.textContent = "❌ 失败";
              setTimeout(() => { replayBtn.textContent = "🚀 重放"; }, 2000);
              console.error('[CForge][读码JSON] 重放失败:', e);
            });
          } catch(e) {
            alert('JSON 格式错误，无法重放: ' + e.message);
          }
        });

        editBtnRow.appendChild(formatBtn);
        editBtnRow.appendChild(copyBtn);
        editBtnRow.appendChild(replayBtn);
        target.appendChild(editBtnRow);
      }
    }

    dispose() {
    }
  };

  var PluginScene = class {
    static title = "插件";

    constructor(manager) {
      this.manager = manager;
    }
    render() {
      const target = this.manager.target;
      const scrollable = createScrollable();
      const list = document.createElement("ul");
      list.style.listStyle = "none";
      list.style.padding = "0";
      list.style.margin = "0";
      const items = [
        { name: "🛡️ 事件屏蔽", desc: "屏蔽指定Scratch事件触发（如计时器）", action: () => this.manager.open(new EventBlockScene(this.manager)) },
        { name: "🎮 联机辅助", desc: "雷达透视/锁定摄像机/锁头", action: () => this.manager.open(new MMOAssistScene(this.manager)) },
        { name: "🔓 免疫黑名单", desc: "回复被拉黑用户的评论", action: () => this.manager.open(new BlacklistBypassScene(this.manager)) },
        { name: "⏭️ 扩展拦截", desc: "跳过/启用扩展拦截（解决MMO画面异常）", action: () => this.manager.open(new SkipExtInterceptScene(this.manager)) },
        { name: "💫 0.7(连点器)", desc: "快速模拟鼠标点击（可自定义快捷键）", action: () => this.manager.open(new AutoClickerScene(this.manager)) },
        { name: "📡 读码JSON", desc: "捕获/查看/编辑/重放API请求JSON", action: () => this.manager.open(new JsonCaptureScene(this.manager)) }
      ];

      for (const item of items) {
        const listItem = document.createElement("li");
        listItem.style.display = "flex";
        listItem.style.alignItems = "center";
        listItem.style.padding = "8px 10px";
        listItem.style.border = "1px solid rgba(255,255,255,0.3)";
        listItem.style.borderRadius = "4px";
        listItem.style.backgroundColor = "#2a2a3d";
        listItem.style.marginBottom = "6px";
        listItem.style.cursor = "pointer";
        const nameSpan = document.createElement("span");
        nameSpan.textContent = item.name;
        nameSpan.style.color = "white";
        nameSpan.style.fontWeight = "bold";
        nameSpan.style.marginRight = "10px";
        listItem.appendChild(nameSpan);
        const descSpan = document.createElement("span");
        descSpan.textContent = item.desc;
        descSpan.style.color = "#a0a0b0";
        descSpan.style.fontSize = "12px";
        descSpan.style.flexGrow = "1";
        listItem.appendChild(descSpan);
        listItem.addEventListener("click", item.action);
        list.appendChild(listItem);
      }
      scrollable.appendChild(list);
      target.appendChild(scrollable);
    }
    dispose() {
    }
  };

  // src/scene/source_code.js
  var SourceCodeScene = class {
    static title = "源码";

    constructor(manager) {
      this.manager = manager;
    }

    render() {
      var projectId = null;
      try {
        if (state_default.vm && state_default.vm.runtime && state_default.vm.runtime.ccwAPI) {
          projectId = state_default.vm.runtime.ccwAPI.getProjectUUID();
        }
      } catch(e) {
        console.warn('[CForge][源码] 获取项目ID失败:', e);
      }

      // [v0.30] 降级：从URL中提取projectId（/detail/{id}）
      if (!projectId) {
        try {
          var pathParts = window.location.pathname.split('/');
          var detailIdx = pathParts.indexOf('detail');
          if (detailIdx !== -1 && pathParts[detailIdx + 1]) {
            projectId = decodeURIComponent(pathParts[detailIdx + 1]);
            console.log('[CForge][源码] 从URL提取projectId:', projectId);
          }
        } catch(e) {}
      }

      // [v0.31] 打开编辑器前，从VM缓存项目JSON到localStorage（新标签页state_default会重置）
      if (projectId) {
        try {
          var pj = state_default.projectJson;
          if (!pj && state_default.vm) {
            try { pj = state_default.vm.toJSON(); } catch(e) {}
          }
          if (pj) {
            localStorage.setItem('CForge_cachedProjectJson', JSON.stringify(pj));
            localStorage.setItem('CForge_cachedProjectId', projectId);
            console.log('[CForge][源码] 已缓存项目JSON到localStorage, projectId:', projectId);
          } else {
            console.warn('[CForge][源码] 无法获取项目JSON，编辑器可能无法加载');
          }
        } catch(e) {
          console.warn('[CForge][源码] 缓存项目JSON失败:', e);
        }
        window.open("https://www.ccw.site/gandi/project/" + encodeURIComponent(projectId));
        console.log('[CForge][源码] 已在新标签页打开 Gandi 编辑器, projectId:', projectId);
      } else {
        var projectJson = state_default.projectJson;
        if (!projectJson && state_default.vm) {
          try { projectJson = state_default.vm.toJSON(); } catch(e) {}
        }
        if (projectJson) {
          var blob = new Blob([JSON.stringify(projectJson)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'cforge_project.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('[CForge][源码] 已导出项目JSON (降级模式)');
        } else {
          alert('[CForge] 无法获取项目数据，请确保已进入项目页面');
        }
      }

      this.manager.back();
    }

    dispose() {
    }
  };

  // src/scene/home.js
  var HomeScene = class _HomeScene {
    static title = "主页";
    // 添加新 entry 时请往这里写东西
    static featureListOrder = [
      "📝 作品数据",
      "💻 源码",
      "🌩️ 云数据",
      "🎮 MMO 框架",
      "🏆 成就相关功能",
      "📜 经济合约",
      "⚙️ 高级",
      "🛠️ 插件",
      "ℹ️ 关于"
    ];
    /**
     * @param {Set<[string, Function]>} featureList
     * @param {string[]} order
     */
    static orderBy(featureList, order) {
      return Array.from(featureList.entries()).sort((a, b) => {
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      });
    }
    /**
     *
     * @param {import('../base/scene').SceneManager} manager
     */
    constructor(manager) {
      this.plugin = new PluginScene(manager);
      if (!state_default.pluginPromise) state_default.pluginPromise = Promise.resolve();
      // Preserve userInfo loaded from localStorage
      if (!state_default.userInfo) state_default.userInfo = null;
      // Add disguised flag to track if userInfo is manually set
      if (!state_default.hasOwnProperty('isDisguised')) state_default.isDisguised = false;
      state_default.axios.interceptors.response.use((resp) => {
        if (resp.config.url.endsWith("/students/self/detail") && !state_default.userInfo) {
          const body = resp.data.body;
          state_default.myInfo = body;
          if (!this.isProfilePage) {
            state_default.userInfo = {
              userId: body.studentNumber,
              userName: body.name,
              uuid: body.oid,
              oid: body.oid,
              avatar: body.avatar,
              constellation: -1,
              following: 0,
              followers: 0,
              liked: 0,
              gender: ["MALE", "FEMALE"].indexOf(body.gender),
              // TODO for gandi: non-binary
              pendant: "",
              reputationScore: body.reputationScore
            };
            manager.requestUpdate();
            try { localStorage.setItem("CForge_userInfo", JSON.stringify(state_default.userInfo)); } catch(e) {}
          }
        }
        return resp;
      });
      state_default.axios.interceptors.response.use((resp) => {
        if (resp.config.url === "https://community-web.ccw.site/creation/detail") {
          resp.data.body.requireLogin = false;
        }
        return resp;
      });

      // [v0.7] 彻底伪装：axios响应拦截器，伪装模式下替换所有API响应中的用户信息
      state_default.axios.interceptors.response.use((resp) => {
        if (!state_default.isDisguised || !state_default.userInfo || state_default._skipDisguise) return resp;
        const url = resp.config.url || '';
        const d = state_default.userInfo;
        // 通用替换函数：将对象中的用户信息字段替换为伪装数据
        const replaceFields = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          if (d.userId) {
            if ('studentNumber' in obj) obj.studentNumber = d.userId;
            if ('userId' in obj) obj.userId = d.userId;
          }
          if (d.userName) {
            if ('name' in obj) obj.name = d.userName;
            if ('nickname' in obj) obj.nickname = d.userName;
            if ('userName' in obj) obj.userName = d.userName;
          }
          if (d.avatar && 'avatar' in obj) obj.avatar = d.avatar;
          if (d.oid) {
            if ('oid' in obj) obj.oid = d.oid;
            if ('studentOid' in obj) obj.studentOid = d.oid;
          }
          if (d.uuid) {
            if ('uuid' in obj) obj.uuid = d.uuid;
          }
          if (d.gender >= 0 && 'gender' in obj) {
            obj.gender = d.gender === 0 ? 'MALE' : d.gender === 1 ? 'FEMALE' : obj.gender;
          }
          if ('pendant' in obj) obj.pendant = d.pendant || '';
          if ('reputationScore' in obj && d.reputationScore) obj.reputationScore = d.reputationScore;
        };
        // 1. 拦截已知用户信息接口（精确匹配）
        if (resp.data && resp.data.body && (
          url.endsWith('/students/self/detail') ||
          url.endsWith('/students/profile')
        )) {
          // [v0.13] 替换前捕获真实userId（用于MMO onAuth）
          var _realId = resp.data.body.studentNumber || resp.data.body.userId;
          if (_realId) {
            state_default._realMMOUserId = _realId;
            state_default._realMMOUserName = resp.data.body.name || resp.data.body.userName || '';
            console.log('[CForge] Captured real userId:', _realId, '/', state_default._realMMOUserName);
          }
          replaceFields(resp.data.body);
        }
        // 2. 广谱拦截：任何响应体中同时包含 studentNumber+name 字段的，视为用户信息响应
        if (resp.data && resp.data.body && typeof resp.data.body === 'object' && !Array.isArray(resp.data.body)) {
          const b = resp.data.body;
          if (b.studentNumber !== undefined && b.name !== undefined) {
            // [v0.13] 广谱捕获
            if (!state_default._realMMOUserId && b.studentNumber) {
              state_default._realMMOUserId = b.studentNumber;
              state_default._realMMOUserName = b.name || '';
              console.log('[CForge] Captured real userId (broad):', b.studentNumber);
            }
            replaceFields(b);
          }
        }
        return resp;
      });
      // [v0.13] 记录API请求URL（用于定位正确的API地址）
      state_default.axios.interceptors.request.use(function(config) {
        var reqURL = (config.baseURL || '') + (config.url || '');
        if (reqURL.indexOf('student') !== -1 || reqURL.indexOf('user') !== -1 || reqURL.indexOf('self') !== -1) {
          console.log('[CForge] API Request URL:', reqURL);
          state_default._lastApiURL = reqURL;
        }
        return config;
      });



      // [v0.21] Global patchGlobalUser - always available, not just inside vm.then()
      state_default._patchGlobalUser = function() {
        try {
          if (state_default.userInfo && state_default.isDisguised) {
            if (window.__CCW_USER__) {
              window.__CCW_USER__.userId = state_default.userInfo.userId;
              window.__CCW_USER__.userName = state_default.userInfo.userName;
              window.__CCW_USER__.nickname = state_default.userInfo.userName;
              window.__CCW_USER__.oid = state_default.userInfo.oid;
              window.__CCW_USER__.avatar = state_default.userInfo.avatar;
            }
            if (window.CCW_USER) {
              window.CCW_USER.userId = state_default.userInfo.userId;
              window.CCW_USER.userName = state_default.userInfo.userName;
              window.CCW_USER.nickname = state_default.userInfo.userName;
              window.CCW_USER.oid = state_default.userInfo.oid;
              window.CCW_USER.avatar = state_default.userInfo.avatar;
            }
          }
        } catch(e) {}
      };
      // Run immediately and set up interval
      state_default._patchGlobalUser();
      setInterval(function() { state_default._patchGlobalUser(); }, 1000);

      if (window.location.pathname.startsWith("/student/")) {
        this.isProfilePage = true;
        state_default.axios.interceptors.response.use((resp) => {
          if (resp.config.url.endsWith("/students/profile") && resp.data.body && !state_default.userInfo) {
            const body = resp.data.body;
            state_default.userInfo = {
              userId: body.studentNumber,
              userName: body.name,
              uuid: body.studentOid,
              oid: body.studentOid,
              avatar: body.avatar,
              constellation: -1,
              following: 0,
              followers: 0,
              liked: 0,
              gender: ["MALE", "FEMALE"].indexOf(body.gender),
              pendant: "",
              reputationScore: body.reputationScore
            };
            manager.requestUpdate();
            try { localStorage.setItem("CForge_userInfo", JSON.stringify(state_default.userInfo)); } catch(e) {}
          }
          return resp;
        });
      } else {
        this.isProfilePage = false;
        vm.then((vm2) => {
          state_default.vm = vm2;
          // Hook startHats for event blocking
          const _originalStartHats = vm2.runtime.startHats.bind(vm2.runtime);
          vm2.runtime.startHats = function(hatOpcode, optMatchFields, optTargetId, opt0, opt1, opt2) {
            const eb = state_default.eventBlock;
            if (eb.enabled) {
              if (Array.isArray(eb.blockList) && eb.blockList.includes(hatOpcode)) {
                return {};
              }
            }
            return _originalStartHats(hatOpcode, optMatchFields, optTargetId, opt0, opt1, opt2);
          };
          // [v0.20] 0.7连点器：帧钩子 + 快捷键
          const _origRuntimeStep = vm2.runtime._step.bind(vm2.runtime);
          vm2.runtime._step = function() {
            if (state_default.autoClicker.enabled && state_default.autoClicker.active) {
              state_default.autoClicker._frame++;
              try {
                vm2.runtime.ioDevices.mouse._isDown = (state_default.autoClicker._frame % 2 === 1);
              } catch(e) {}
            }
            return _origRuntimeStep();
          };
          document.addEventListener("keydown", (e) => {
            if (!state_default.autoClicker.enabled) return;
            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
            if (e.key === state_default.autoClicker.hotkey) {
              state_default.autoClicker.active = true;
            } else {
              state_default.autoClicker.active = false;
              try { vm2.runtime.ioDevices.mouse._isDown = false; } catch(e2) {}
            }
          });
          const _originalLoadProject = vm2.loadProject;
          const _scanBroadcastBlocks = (_pj) => {
            try {
              if (!_pj || !_pj.targets) return;
              const _blocks = [];
              for (const _target of _pj.targets) {
                if (!_target.blocks) continue;
                for (const _bid in _target.blocks) {
                  const _block = _target.blocks[_bid];
                  if (_block.opcode === "CCWMMO_broadcastMsg") {
                    let _typeVal = "动态";
                    let _contentVal = "动态";
                    if (_block.inputs && _block.inputs.TYPE) {
                      const _ref = _block.inputs.TYPE[1];
                      if (Array.isArray(_ref) && _ref[0] === 10) _typeVal = _ref[1];
                      else if (typeof _ref === "string" && _target.blocks[_ref] && _target.blocks[_ref].opcode === "data_variable" && _target.blocks[_ref].fields && _target.blocks[_ref].fields.VARIABLE) {
                        _typeVal = "变量:" + _target.blocks[_ref].fields.VARIABLE[0];
                      }
                    }
                    if (_block.inputs && _block.inputs.CONTENT) {
                      const _ref = _block.inputs.CONTENT[1];
                      if (Array.isArray(_ref) && _ref[0] === 10) _contentVal = _ref[1];
                      else if (typeof _ref === "string" && _target.blocks[_ref] && _target.blocks[_ref].opcode === "data_variable" && _target.blocks[_ref].fields && _target.blocks[_ref].fields.VARIABLE) {
                        _contentVal = "变量:" + _target.blocks[_ref].fields.VARIABLE[0];
                      }
                    }
                    _blocks.push({ target: _target.name, type: String(_typeVal), content: String(_contentVal) });
                  }
                }
              }
              state_default.mmo.broadcastBlocks = _blocks;
            } catch(e) { console.warn("[CForge] 广播积木扫描失败:", e); }
          };
          vm2.loadProject = async (input) => {
              const JSZip = vm2.exports.JSZip;
              this.featureList.set(
                "📝 作品数据",
                () => this.manager.open(new ProjectScene(this.manager, JSZip, input))
              );
              this.manager.requestUpdate();
              // [v0.18] 跳过扩展拦截：默认开启，直接走原始loadProject，避免MMO画面异常
              if (state_default.skipExtIntercept && state_default.skipExtIntercept.enabled) {
                // [v0.20] 静态扫描广播积木
                try {
                  let _pj = null;
                  if (typeof input === "string") _pj = JSON.parse(input);
                  else if (typeof input === "object" && !(input instanceof ArrayBuffer) && !(input instanceof Uint8Array)) _pj = input;
                  else {
                    const _zip = await JSZip.loadAsync(input);
                    const _file = _zip.file("project.json");
                    if (_file) _pj = JSON.parse(await _file.async("string"));
                  }
                  _scanBroadcastBlocks(_pj);
                } catch(e) {}
                return _originalLoadProject.call(vm2, input);
              }
              let projectZip = null;
              let projectJson = null;
              if (typeof input === "string" || typeof input === "object" && !(input instanceof ArrayBuffer) && !(input instanceof Uint8Array)) {
                projectZip = new JSZip();
                projectZip.file("project.json", input);
                projectJson = typeof input === "string" ? JSON.parse(input) : input;
              } else {
                projectZip = await JSZip.loadAsync(input);
                const file = projectZip.file("project.json");
                if (file) {
                  const content = await file.async("string");
                  projectJson = JSON.parse(content);
                }
              }
              _scanBroadcastBlocks(projectJson);
              state_default.button.title = "CForge正在加载插件……";
              let _pbOn = false;
              state_default.button.style.transition = "filter 1s ease-in-out";
              if (state_default._blinkTimer) clearInterval(state_default._blinkTimer);
              state_default._blinkTimer = setInterval(() => {
                _pbOn = !_pbOn;
                state_default.button.style.filter = _pbOn ? "sepia(1) saturate(5) hue-rotate(-10deg)" : "none";
              }, 500);
              state_default.button.style.filter = "none";
              await state_default.pluginPromise;
              if (state_default._blinkTimer) { clearInterval(state_default._blinkTimer); state_default._blinkTimer = null; }
              state_default.button.style.transition = "";
              state_default.button.style.filter = "none";
              state_default.button.title = "--点击打开CForge弹窗--";

              if (projectJson.extensions && projectJson.extensions.length > 0) {
                const resolver = withResolvers();
                this.manager.addOverlay(
                  new ExtensionOverlay(
                    this.manager,
                    projectZip,
                    projectJson,
                    resolver
                  )
                );
                input = await (await resolver.promise).generateAsync({
                  type: "arraybuffer"
                });
              }
              return _originalLoadProject.call(vm2, input);
          };
          const patchCCWAPI = (ccwAPI) => {
            try {
              // Patch getUserInfo
              // [v0.16] 伪装时返回伪装身份；保存原始函数供MMO获取真实uuid
              const _getUserInfo = ccwAPI.getUserInfo;
              state_default._origGetUserInfo = _getUserInfo.bind(ccwAPI);
              ccwAPI.getUserInfo = async function() {
                if (state_default.isDisguised && state_default.userInfo) {
                  return state_default.userInfo;
                }
                return await _getUserInfo.call(this);
              };

              // Patch getUserId if exists
              if (ccwAPI.getUserId) {
                const _getUserId = ccwAPI.getUserId;
                ccwAPI.getUserId = function() {
                  if (state_default.isDisguised && state_default.userInfo?.userId) return state_default.userInfo.userId;
                  return _getUserId.call(this);
                };
              }

              // Patch getUserName/getNickname if exists
              if (ccwAPI.getUserName) {
                const _getUserName = ccwAPI.getUserName;
                ccwAPI.getUserName = function() {
                  if (state_default.isDisguised && state_default.userInfo?.userName) return state_default.userInfo.userName;
                  return _getUserName.call(this);
                };
              }
              if (ccwAPI.getNickname) {
                const _getNickname = ccwAPI.getNickname;
                ccwAPI.getNickname = function() {
                  if (state_default.isDisguised && state_default.userInfo?.userName) return state_default.userInfo.userName;
                  return _getNickname.call(this);
                };
              }

              // Patch getUserAvatar if exists
              if (ccwAPI.getUserAvatar) {
                const _getUserAvatar = ccwAPI.getUserAvatar;
                ccwAPI.getUserAvatar = function() {
                  if (state_default.isDisguised && state_default.userInfo?.avatar) return state_default.userInfo.avatar;
                  return _getUserAvatar.call(this);
                };
              }

              // Patch isLoggedIn/isLogin if exists
              if (ccwAPI.isLoggedIn) {
                ccwAPI.isLoggedIn = function() {
                  if (state_default.isDisguised) return !!state_default.userInfo;
                  return true; // 用户已登录CCW，返回true
                };
              }
              if (ccwAPI.isLogin) {
                ccwAPI.isLogin = function() {
                  if (state_default.isDisguised) return !!state_default.userInfo;
                  return true;
                };
              }
            } catch(e) {}
          };
          if (vm2.runtime.ccwAPI) patchCCWAPI(vm2.runtime.ccwAPI);
          const _setCCWAPI = vm2.runtime.setCCWAPI;
          vm2.runtime.setCCWAPI = function(api) {
            _setCCWAPI.call(this, api);
            patchCCWAPI(api);
          };
          let userName = vm2.runtime.ioDevices.userData._username;
          Object.defineProperty(vm2.runtime.ioDevices.userData, "_username", {
            get: () => {
              if (state_default.isDisguised && state_default.userInfo) return state_default.userInfo.userName;
              return userName;
            },
            set(value) {
              userName = value;
            }
          });
          const _compilerRegisterExtension = vm2.runtime.constructor.prototype.compilerRegisterExtension;
          const patchUUID = (extensionObject) => {
            // [v0.11] 重写MMO扩展的用户身份属性
            // 核心思路：uuid/userId始终用真实值（onAuth校验），nickname用伪装值
            let _internalUserId = extensionObject.UserId;
            let _internalNickname = extensionObject.ccwUserNickname;
            let _internalUUID = extensionObject.ccwUserUUID;

            Object.defineProperties(extensionObject, {
              UserId: {
                configurable: true,
                get() { return _internalUserId; },
                set(v) { _internalUserId = v; }
              },
              ccwUserNickname: {
                configurable: true,
                get() {
                  if (state_default.isDisguised && state_default.userInfo?.userName) {
                    return state_default.userInfo.userName;
                  }
                  return _internalNickname;
                },
                set(v) { _internalNickname = v; }
              },
              ccwUserUUID: {
                configurable: true,
                get() {
                  if (state_default._realMMOUserId) return state_default._realMMOUserId;
                  return _internalUUID;
                },
                set(v) { _internalUUID = v; }
              }
            });
          };

          // [v0.17] MMO网络层 - 真名认证 + 入房后改名 + 诊断
          const patchMMONetwork = (extensionObject) => {
            const client = extensionObject.client;
            if (!client) {
              console.warn('[CForge] MMO client not found, network patch skipped');
              return;
            }

            console.log('[CForge] MMO Network v0.17');
            console.log('[CForge] isDisguised:', state_default.isDisguised);
            console.log('[CForge] MMO cached uuid:', extensionObject.ccwUserUUID);
            console.log('[CForge] MMO cached name:', extensionObject.ccwUserNickname);
            console.log('[CForge] _realMMOUserId:', state_default._realMMOUserId || 'NOT SET');
            console.log('[CForge] _realMMOUserName:', state_default._realMMOUserName || 'NOT SET');

            // 主动获取真实userId（绕过伪装拦截器）- 作为页面加载时未捕获的fallback
            if (state_default.isDisguised && !state_default._realMMOUserId && state_default._origGetUserInfo) {
              console.log('[CForge] Fetching real userId via original getUserInfo...');
              state_default._skipDisguise = true;
              state_default._origGetUserInfo().then(function(realInfo) {
                state_default._skipDisguise = false;
                if (realInfo && realInfo.userId) {
                  state_default._realMMOUserId = realInfo.userId;
                  state_default._realMMOUserName = realInfo.userName || '';
                  console.log('[CForge] Real userId captured:', realInfo.userId, '/', state_default._realMMOUserName);
                  console.log('[CForge] Disguised userId:', state_default.userInfo.userId, '/', state_default.userInfo.userName);
                } else {
                  console.log('[CForge] getUserInfo returned no userId:', realInfo);
                }
              }).catch(function(e) {
                state_default._skipDisguise = false;
                console.log('[CForge] getUserInfo failed:', e);
              });
            } else if (state_default._realMMOUserId) {
              console.log('[CForge] Real userId already captured:', state_default._realMMOUserId, '/', state_default._realMMOUserName);
            } else {
              console.log('[CForge] WARNING: cannot fetch real userId (origGetUserInfo not available)');
            }

            // [v0.17] Hook Colyseus client methods: 用真实名字认证
            // matchmaker body 的 name 字段会被服务端 onAuth 校验，必须用真实名
            var _cforgeClientHooked = false;
            var clientMethods = ['joinOrCreate', 'create', 'join', 'joinById'];
            clientMethods.forEach(function(methodName) {
              var origMethod = client[methodName];
              if (typeof origMethod === 'function' && !client['_cf_' + methodName]) {
                client['_cf_' + methodName] = origMethod;
                client[methodName] = function(roomName, options) {
                  var opts = options || {};
                  if (state_default.isDisguised && state_default._realMMOUserName && opts.name) {
                    console.log('[CForge] Auth name replace:', opts.name, '->', state_default._realMMOUserName);
                    opts = Object.assign({}, opts, { name: state_default._realMMOUserName });
                  }
                  return origMethod.call(this, roomName, opts);
                };
                _cforgeClientHooked = true;
              }
            });
            console.log('[CForge] Client method hooks:', _cforgeClientHooked ? 'applied' : 'skipped (already hooked)');

            // [v0.17] Hook bindRoom: 入房后尝试改回伪装名
            if (!extensionObject._cfBindRoomHooked) {
              extensionObject._cfBindRoomHooked = true;
              var origBindRoom = extensionObject.bindRoom;
              extensionObject.bindRoom = function() {
                var room = arguments[0];
                var result = origBindRoom.apply(this, arguments);
                // 入房后延迟发送伪装名
                if (state_default.isDisguised && state_default.userInfo && state_default.userInfo.userName && state_default._realMMOUserName) {
                  var disguiseName = state_default.userInfo.userName;
                  setTimeout((function(r, dn) {
                    return function() {
                      if (r && r.send) {
                        console.log('[CForge] Post-join: setting disguised name:', dn);
                        r.send('syscmd:set_state', { name: dn });
                      }
                    };
                  })(room, disguiseName), 800);
                }
                return result;
              };
              console.log('[CForge] bindRoom hook: applied');
            }

            // 轻量XHR诊断：仅拦截matchmaker请求
            if (!window._cforgeMMOXHRHooked) {
              window._cforgeMMOXHRHooked = true;
              var _origXHROpen = XMLHttpRequest.prototype.open;
              var _origXHRSend = XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.open = function(method, url) {
                this._cfURL = url;
                return _origXHROpen.apply(this, arguments);
              };
              XMLHttpRequest.prototype.send = function(body) {
                if (typeof this._cfURL === 'string' && this._cfURL.indexOf('/matchmake/') !== -1) {
                  console.log('[CForge] Matchmaker request body:', body);
                  console.log('[CForge] _realMMOUserId at request time:', state_default._realMMOUserId || 'NOT SET');
                  console.log('[CForge] _realMMOUserName at request time:', state_default._realMMOUserName || 'NOT SET');
                  var self = this;
                  this.addEventListener('load', function() {
                    console.log('[CForge] Matchmaker response:', self.status, self.responseText);
                  });
                }
                return _origXHRSend.call(this, body);
              };
            }

            console.log('[CForge] MMO network patches v0.17 applied');
          };

          // [v0.21] Use shared patchGlobalUser from state_default
          if (typeof window !== 'undefined') {
            state_default._patchGlobalUser();
            setInterval(function() { state_default._patchGlobalUser(); }, 1000);
          }

          patch(
            vm2.extensionManager,
            "isValidExtensionURL",
            (isValidExtensionURL) => {
              return function(extensionURL) {
                if (extensionURL.startsWith("blob:")) return true;
                return isValidExtensionURL.call(this, extensionURL);
              };
            }
          );
          state_default.extensionInjector.on("community", (extensionObject) => {
            extensionObject.getCoinCount = () => Infinity;
            extensionObject.isUserLikedOtherProject = extensionObject.isLiked = extensionObject.isMyFans = extensionObject.isFanOfSomeone = extensionObject.requestFollow = extensionObject.isUserFavoriteOtherProject = () => true;
            const _insertCoinAndWaitForResult = extensionObject.insertCoinAndWaitForResult;
            extensionObject.insertCoinAndWaitForResult = function(args) {
              if (confirm(`作品请求投 ${args.COUNT} 个币，是否伪造结果？`)) {
                return true;
              }
              return _insertCoinAndWaitForResult.call(this, args);
            };
          });
          state_default.extensionInjector.on(
            "GandiAchievementAndLeaderboard",
            (extensionObject) => {
              this.featureList.set("🏆 成就相关功能", () => {
                this.manager.open(
                  new AchievementScene(this.manager, extensionObject)
                );
              });
              this.manager.requestUpdate();
            }
          );
          state_default.extensionInjector.on("GandiEconomy", (extensionObject) => {
            patch(extensionObject, "requestFundReturn", (requestFundReturn) => {
              return function(args) {
                const res = prompt(
                  "作品正在请求合约无偿注资。请输入伪造的注资金额。\n当不输入任何内容时，将自动回落到官方实现。"
                );
                if (res === null || res === "") {
                  return requestFundReturn.call(this, args);
                }
                const v = Number(res);
                if (Number.isNaN(v) || v < 0) {
                  return 0;
                }
                return v;
              };
            });
            this.featureList.set("📜 经济合约", () => {
              this.manager.open(new EconomyScene(this.manager, extensionObject));
            });
          });
          state_default.extensionInjector.on("CCWMMO", (extensionObject) => {
            patchUUID(extensionObject);
            patchMMONetwork(extensionObject);
            extensionObject.dispatchNewMessageWithParams = function(_, util) {
              const blackList = state_default.mmo.broadcastBlackList;
              const hatParam = util.thread.hatParam;
              // [v0.20] 广播中真实名替换为伪装名（防止入房时露馅）
              if (state_default.isDisguised && state_default._realMMOUserName && state_default.userInfo && state_default.userInfo.userName) {
                if (hatParam.name === state_default._realMMOUserName) {
                  hatParam.name = state_default.userInfo.userName;
                }
                if (hatParam.senderUID === state_default._realMMOUserId) {
                  hatParam.senderUID = state_default.userInfo.userId;
                }
              }
              const message = `${hatParam.type}(session=${JSON.stringify(hatParam.sender)},uuid=${JSON.stringify(hatParam.senderUID)},name=${JSON.stringify(hatParam.name)},content=${JSON.stringify(hatParam.content)})`;
              // 记录广播消息
              try {
                const now = new Date();
                const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
                state_default.mmo.broadcastLog.unshift({
                  time: timeStr,
                  type: hatParam.type || '',
                  sender: hatParam.sender || '',
                  senderUID: hatParam.senderUID || '',
                  name: hatParam.name || '',
                  content: hatParam.content || ''
                });
                if (state_default.mmo.broadcastLog.length > 200) state_default.mmo.broadcastLog.length = 200;
              } catch(e) {}
              if (blackList.some((regex) => regex.test(message))) {
                return false;
              }
              return true;
            };

            this.featureList.set("🎮 MMO 框架", () => {
              this.manager.open(new MMOScene(this.manager, extensionObject));
            });

          });
          state_default.extensionInjector.on("CCWData", (extensionObject) => {
            this.featureList.set("🌩️ 云数据", () => {
              this.manager.open(new CCWDataScene(this.manager, extensionObject));
            });
            extensionObject.sendPlayEventCode = () => {
            };
            patch(
              extensionObject,
              "_getValueFromProject",
              (_getValueFromProject) => {
                return async function(name) {
                  const newValue = await _getValueFromProject.call(this, name);
                  state_default.ccwdata.project.set(name, newValue);
                  const possiblyModifiedValue = state_default.ccwdata.project.get(name);
                  if (possiblyModifiedValue !== newValue) {
                    return extensionObject._setValueToProject(
                      name,
                      possiblyModifiedValue
                    );
                  }
                  return possiblyModifiedValue;
                };
              }
            );
            patch(extensionObject, "_setValueToProject", (_setValueToProject) => {
              return async function(name, value) {
                state_default.ccwdata.project.set(name, value);
                return await _setValueToProject.call(
                  this,
                  name,
                  state_default.ccwdata.project.get(name)
                );
              };
            });
            patch(extensionObject, "_getValueFromUser", (_getValueFromUser) => {
              return async function(name) {
                const newValue = await _getValueFromUser.call(this, name);
                state_default.ccwdata.user.set(name, newValue);
                const possiblyModifiedValue = state_default.ccwdata.user.get(name);
                if (possiblyModifiedValue !== newValue) {
                  return extensionObject._setValueToUser(
                    name,
                    possiblyModifiedValue
                  );
                }
                return possiblyModifiedValue;
              };
            });
            patch(extensionObject, "_setValueToUser", (_setValueToUser) => {
              return async function(name, value) {
                state_default.ccwdata.user.set(name, value);
                return await _setValueToUser.call(
                  this,
                  name,
                  state_default.ccwdata.user.get(name)
                );
              };
            });
          });
          vm2.runtime.compilerRegisterExtension = (name, extensionObject) => {
            state_default.extensionInjector.emit(name, extensionObject);
            _compilerRegisterExtension.call(vm2.runtime, name, extensionObject);
          };
        });
      }
      this.manager = manager;
      this.animationFrame = null;
      this.avatarRotation = 0;
      this.featureList = /* @__PURE__ */ new Map([
        [
          "⚙️ 高级",
          () => {
            this.manager.open(new ScriptScene(this.manager));
          }
        ],
        [
          "🛠️ 插件",
          () => {
            this.manager.open(this.plugin);
          }
        ],
        [
          "ℹ️ 关于",
          () => {
            this.manager.open(new AboutScene(this.manager));
          }
        ]
      ]);
      // [v0.32] 源码仅在作品页面显示
      if (window.location.pathname.indexOf("/detail/") === 0) {
        this.featureList.set("💻 源码", () => {
          this.manager.open(new SourceCodeScene(this.manager));
        });
      }
    }
    static createListButton(feature, callback) {
      const li = document.createElement("li");
      li.textContent = feature;
      li.style.padding = "10px";
      li.style.margin = "5px 0";
      li.style.backgroundColor = "#2a2a3d";
      li.style.borderRadius = "8px";
      li.style.cursor = "pointer";
      li.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
      li.addEventListener("mouseover", () => {
        li.style.transform = "scale(1.05)";
        li.style.transition = "transform 0.2s ease-in-out";
      });
      li.addEventListener("mouseout", () => {
        li.style.transform = "scale(1)";
      });
      li.addEventListener("click", callback);
      return li;
    }
    renderFeatureList() {
      const ul = document.createElement("ul");
      const features = _HomeScene.orderBy(
        this.featureList,
        _HomeScene.featureListOrder
      );
      features.forEach((feature) => {
        ul.appendChild(_HomeScene.createListButton(feature[0], feature[1]));
      });
      ul.style.padding = "0";
      ul.style.margin = "0";
      ul.style.listStyleType = "none";
      return ul;
    }
    render() {
      const scrollable = createScrollable();
      scrollable.style.maxHeight = "none";
      scrollable.style.maxWidth = "none";
      scrollable.style.width = "100%";
      scrollable.style.height = "100%";
      const userProfile = document.createElement("div");
      userProfile.style.display = "flex";
      userProfile.style.marginTop = "10px";
      userProfile.style.flexDirection = "column";
      userProfile.style.alignItems = "center";
      userProfile.style.marginBottom = "10px";
      const avatar = document.createElement("img");
      avatar.src = state_default.userInfo?.avatar ?? logo_default;
      avatar.alt = "用户头像";
      avatar.style.width = "120px";
      avatar.style.height = "120px";
      avatar.style.cursor = "pointer";
      avatar.style.borderRadius = "50%";
      avatar.style.marginBottom = "10px";
      if (!this.isProfilePage) {
        avatar.style.transition = "opacity 0.3s ease-in-out";
        avatar.title = "点击编辑用户信息";
        avatar.addEventListener("mouseover", () => {
          avatar.style.opacity = "0.5";
        });
        avatar.addEventListener("mouseout", () => {
          avatar.style.opacity = "1";
        });
        avatar.addEventListener("click", () => {
          this._openUserInfoForm();
        });
      }
      const rotateAvatar = () => {
        if (!state_default.userInfo && document.cookie.includes("cookie-user-id=")) {
          this.avatarRotation += 5;
          avatar.style.transform = `rotate(${this.avatarRotation}deg)`;
          this.animationFrame = requestAnimationFrame(rotateAvatar);
        } else {
          this.avatarRotation = 0;
          this.animationFrame = null;
        }
      };
      if (!this.animationFrame) {
        rotateAvatar();
      }
      const username = document.createElement("div");
      username.textContent = state_default.userInfo?.userName ?? (document.cookie.includes("cookie-user-id=") ? "请稍等..." : "未登录");
      username.style.fontSize = "16px";
      username.style.fontWeight = "bold";
      userProfile.appendChild(avatar);
      userProfile.appendChild(username);
      scrollable.appendChild(userProfile);
      const ul = this.renderFeatureList();
      scrollable.appendChild(ul);
      const about = document.createElement("strong");
      about.style.color = "#a0a0b0";
      about.textContent = `CForge v${version}`;
      about.style.display = "block";
      about.style.textAlign = "center";
      scrollable.appendChild(about);
      this.manager.target.appendChild(scrollable);
    }

    _openUserInfoForm() {
      const existing = state_default.userInfo || {};

      // Create overlay
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.backgroundColor = "rgba(0,0,0,0.6)";
      overlay.style.zIndex = "99999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.3s ease";

      // Create modal
      const modal = document.createElement("div");
      modal.style.backgroundColor = "#1e1e2e";
      modal.style.border = "1px solid rgba(255,255,255,0.2)";
      modal.style.borderRadius = "12px";
      modal.style.padding = "24px";
      modal.style.width = "340px";
      modal.style.maxWidth = "90vw";
      modal.style.maxHeight = "80vh";
      modal.style.overflowY = "auto";
      modal.style.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";

      // Title bar
      const titleBar = document.createElement("div");
      titleBar.style.textAlign = "center";
      titleBar.style.marginBottom = "8px";

      // [v0.7] 完全伪装按钮已移除

      // Title (center)
      const title = document.createElement("div");
      const disguiseStatus = state_default.isDisguised ? " \u{1F512} \u5DF2\u4F2A\u88C5" : "";
      title.innerHTML = "\u{1F464} \u7528\u6237\u4FE1\u606F\u8BBE\u7F6E" + (disguiseStatus ? '<span style="color:#6c5ce7;font-size:12px;margin-left:8px;">' + disguiseStatus + '</span>' : "");
      title.style.fontSize = "16px";
      title.style.fontWeight = "bold";
      title.style.color = "#e0e0e0";
      titleBar.appendChild(title);

      modal.appendChild(titleBar);

      // Add hint text
      const hint = document.createElement("div");
      hint.textContent = "\u2139\uFE0F \u8BF7\u5148\u7528\u771F\u5B9E\u8D26\u53F7\u767B\u5F55\u5E76\u8FDB\u5165\u623F\u95F4\uFF0C\u518D\u8BBE\u7F6E\u4F2A\u88C5\u4FE1\u606F\uFF08\u5BA2\u6237\u7AEF\u4F2A\u88C5\uFF09";
      hint.style.fontSize = "11px";
      hint.style.color = "#888";
      hint.style.marginBottom = "16px";
      hint.style.textAlign = "center";
      modal.appendChild(hint);

      // Helper to create form field
      const createField = (label, key, placeholder, type) => {
        const row = document.createElement("div");
        row.style.marginBottom = "12px";
        const lbl = document.createElement("label");
        lbl.textContent = label;
        lbl.style.display = "block";
        lbl.style.fontSize = "12px";
        lbl.style.color = "#a0a0b0";
        lbl.style.marginBottom = "4px";
        row.appendChild(lbl);
        const inp = document.createElement("input");
        inp.type = type || "text";
        inp.placeholder = placeholder || "";
        inp.value = existing[key] || "";
        inp.style.width = "100%";
        inp.style.padding = "8px 10px";
        inp.style.borderRadius = "6px";
        inp.style.border = "1px solid rgba(255,255,255,0.2)";
        inp.style.backgroundColor = "#2a2a3d";
        inp.style.color = "#e0e0e0";
        inp.style.fontSize = "13px";
        inp.style.outline = "none";
        inp.style.boxSizing = "border-box";
        inp.dataset.key = key;
        inp.addEventListener("focus", () => { inp.style.borderColor = "#6c5ce7"; });
        inp.addEventListener("blur", () => { inp.style.borderColor = "rgba(255,255,255,0.2)"; });
        row.appendChild(inp);
        return row;
      };

      modal.appendChild(createField("\u7528\u6237\u540D", "userName", "\u8F93\u5165\u6635\u79F0", "text"));
      modal.appendChild(createField("\u7528\u6237ID", "userId", "\u5B66\u53F7/\u5DE5\u53F7", "text"));
      modal.appendChild(createField("UUID", "uuid", "\u8F93\u5165UUID", "text"));
      modal.appendChild(createField("OID", "oid", "\u8F93\u5165OID", "text"));
      modal.appendChild(createField("\u5934\u50CF URL", "avatar", "https://...", "url"));

      // Gender select
      const genderRow = document.createElement("div");
      genderRow.style.marginBottom = "12px";
      const genderLbl = document.createElement("label");
      genderLbl.textContent = "\u6027\u522B";
      genderLbl.style.display = "block";
      genderLbl.style.fontSize = "12px";
      genderLbl.style.color = "#a0a0b0";
      genderLbl.style.marginBottom = "4px";
      genderRow.appendChild(genderLbl);
      const genderSel = document.createElement("select");
      genderSel.style.width = "100%";
      genderSel.style.padding = "8px 10px";
      genderSel.style.borderRadius = "6px";
      genderSel.style.border = "1px solid rgba(255,255,255,0.2)";
      genderSel.style.backgroundColor = "#2a2a3d";
      genderSel.style.color = "#e0e0e0";
      genderSel.style.fontSize = "13px";
      genderSel.style.outline = "none";
      genderSel.style.boxSizing = "border-box";
      const opts = [
        { value: "", text: "\u672A\u8BBE\u7F6E" },
        { value: "0", text: "\u7537" },
        { value: "1", text: "\u5973" }
      ];
      opts.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.text;
        if (String(existing.gender || "") === o.value) opt.selected = true;
        genderSel.appendChild(opt);
      });
      genderRow.appendChild(genderSel);
      modal.appendChild(genderRow);

      // Buttons
      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";
      btnRow.style.marginTop = "18px";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "\u53D6\u6D88";
      cancelBtn.style.flex = "1";
      cancelBtn.style.padding = "10px";
      cancelBtn.style.borderRadius = "6px";
      cancelBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      cancelBtn.style.backgroundColor = "transparent";
      cancelBtn.style.color = "#a0a0b0";
      cancelBtn.style.cursor = "pointer";
      cancelBtn.style.fontSize = "14px";
      cancelBtn.addEventListener("click", () => {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 300);
      });

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "\u4FDD\u5B58\u5E76\u5E94\u7528";
      saveBtn.style.flex = "1";
      saveBtn.style.padding = "10px";
      saveBtn.style.borderRadius = "6px";
      saveBtn.style.border = "none";
      saveBtn.style.backgroundColor = "#6c5ce7";
      saveBtn.style.color = "white";
      saveBtn.style.cursor = "pointer";
      saveBtn.style.fontSize = "14px";
      saveBtn.style.fontWeight = "bold";
      saveBtn.addEventListener("click", () => {
        const inputs = modal.querySelectorAll("input[data-key]");
        const data = {};
        inputs.forEach(inp => { data[inp.dataset.key] = inp.value.trim(); });
        const gVal = genderSel.value;
        if (gVal !== "") data.gender = parseInt(gVal);
        else data.gender = -1;

        // Fill defaults for missing fields
        if (!data.constellation) data.constellation = -1;
        if (!data.following) data.following = 0;
        if (!data.followers) data.followers = 0;
        if (!data.liked) data.liked = 0;
        if (!data.pendant) data.pendant = "";
        if (!data.reputationScore) data.reputationScore = 0;

        state_default.userInfo = data;
        state_default.isDisguised = true;  // Mark as disguised

        // Save to localStorage for persistence
        try {
          localStorage.setItem("CForge_userInfo", JSON.stringify(data));
          localStorage.setItem("CForge_isDisguised", "true");
        } catch(e) {}

        // [v0.21] Immediately patch global user objects for real-time name change
        if (state_default._patchGlobalUser) state_default._patchGlobalUser();

        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.remove();
          this.manager.requestUpdate();
        }, 300);
      });

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(saveBtn);
      modal.appendChild(btnRow);

      // Prevent event bubbling to CCW page (bubble phase only, not capture!)
      overlay.addEventListener("click", (e) => e.stopPropagation());
      overlay.addEventListener("mousedown", (e) => e.stopPropagation());
      overlay.addEventListener("touchstart", (e) => e.stopPropagation());
      modal.addEventListener("click", (e) => e.stopPropagation());
      modal.addEventListener("mousedown", (e) => e.stopPropagation());
      modal.addEventListener("touchstart", (e) => e.stopPropagation());

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      // Trigger fade in
      setTimeout(() => { overlay.style.opacity = "1"; }, 10);
    }


    dispose() {
    }
  };

  // src/index.js
  (() => {
    function asNativeFunc(fn) {
      const toString = fn.toString = () => "function () { [native code] }";
      fn.toString.toString = toString;
      return fn;
    }
    if (!console.log.toString().includes("[native code]")) {
      alert(
        "⚠️CForge加载过慢⚠️\n\n这可能会导致一些功能异常，并且我们不会修复这些异常。\n如果您在使用 Tampermonkey: 请换用 Violentmonkey。\n如果您在使用 Violentmonkey：请在设置中勾选同步 page 模式。这可能会导致一些脚本异常，请自行取舍。"
      );
    }
    const _apply = Function.prototype.apply;
    Function.prototype.apply = function(thisArg, args) {
      if (typeof thisArg === "object" && thisArg && thisArg.defaults && thisArg.interceptors && thisArg.interceptors.request.handlers.length > 0) {
        if (state_default.axios instanceof LazyXHR) {
          state_default.axios.delegate(thisArg);
          state_default.axios = thisArg;
          window.axios = thisArg;
        }
        this.apply = _apply;
      }
      return _apply.call(this, thisArg, args);
    };
    const content = document.createElement("div");
    content.style.fontFamily = "unset";
    addStyle(`
    .csense-window input[type="text"],
    .csense-window input[type="number"],
    .csense-window input[type="search"],
    .csense-window input:not([type]),
    .csense-window textarea,
    .csense-window select {
      background-color: rgba(255,255,255,0.05) !important;
      color: #e0e0e0 !important;
      border: 1px solid rgba(168,85,247,0.25) !important;
      border-radius: 6px !important;
      padding: 6px 10px !important;
      font-size: 13px !important;
      font-family: inherit !important;
      outline: none !important;
      box-sizing: border-box !important;
      transition: border-color 0.2s !important;
    }
    .csense-window input[type="text"]:focus,
    .csense-window input[type="number"]:focus,
    .csense-window input[type="search"]:focus,
    .csense-window input:not([type]):focus,
    .csense-window textarea:focus,
    .csense-window select:focus {
      border-color: rgba(168,85,247,0.6) !important;
    }
    .csense-window input::placeholder {
      color: rgba(255,255,255,0.3) !important;
    }
    .csense-window select { cursor: pointer !important; }
    .csense-window select option { background: #1a1a2e !important; color: #e0e0e0 !important; }
`);
    const manager = new SceneManager(content);
    manager.addOverlay(new IdentityWarningOverlay(manager));
    manager.open(new HomeScene(manager));
    const _isProjectPage = window.location.pathname.indexOf("/detail/") === 0;
    console.log('[CForge] 当前页面:', window.location.pathname, '_isProjectPage:', _isProjectPage);
    const win = _isProjectPage
      ? createTabWindow(content, () => { return !manager.back(); })
      : createWindow(content, () => { return !manager.back(); });
    manager._doSetTitle = win.setTitle;
    state_default.button = win.button;
    manager._updateTitle();
    globalThis.manager = manager;
    const querySelectorAll = Document.prototype.querySelectorAll;
    Document.prototype.querySelectorAll = asNativeFunc(function(selectors) {
      if (this !== document) {
        return querySelectorAll.call(this, selectors);
      }
      const elements = Array.from(querySelectorAll.call(this, selectors));
      const result = elements.filter(
        (el) => !(el === win.button || el === win.window)
      );
      return Object.assign(result, {
        item(nth) {
          return result[nth];
        }
      });
    });
    const querySelector = Document.prototype.querySelector;
    Document.prototype.querySelector = asNativeFunc(function(selectors) {
      if (this !== document) {
        return querySelector.call(this, selectors);
      }
      const res = querySelector.call(this, selectors);
      if (res === win.button || res === win.window) {
        return null;
      }
      return res;
    });
  })();
})();