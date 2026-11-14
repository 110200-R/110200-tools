// ==UserScript==
// @name         本地存储修改
// @namespace    local.witcat.db
// @version      1.0.1
// @description  修改本地存储内容
// @match        https://www.ccw.site/*
// @author       诺言Promise
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    let hookedVM = null;
    let hookReady = false;
    const vmListeners = [];

    function fireVM(vm) {
        if (hookedVM) return;
        hookedVM = vm;
        hookReady = true;
        try { W.__hookedVM = vm; W.__hookVMReady = true; } catch (e) {}
        vmListeners.forEach(cb => { try { cb(vm); } catch (e) { console.error(e); } });
        vmListeners.length = 0;
    }

    function onVMReady(cb) {
        if (hookedVM) { try { cb(hookedVM); } catch (e) { console.error(e); } return; }
        vmListeners.push(cb);
    }

    (function () {
        const TIMEOUT_MS = 30000;
        const LOG_PREFIX = '[VM-Hook]';
        const DEBUG = true;

        function isVM(obj) {
            if (!obj || typeof obj !== 'object') return false;
            if (obj.runtime && typeof obj.runtime === 'object') {
                if (Array.isArray(obj.runtime.targets)) return true;
                return true;
            }
            if (obj.hasOwnProperty('editingTarget') && obj.hasOwnProperty('runtime')) return true;
            if (typeof obj.start === 'function' && typeof obj.loadProject === 'function') return true;
            if (obj.constructor && typeof obj.constructor.name === 'string') {
                if (obj.constructor.name.includes('VM')) return true;
            }
            if (obj.extensionManager && typeof obj.extensionManager === 'object') return true;
            if (obj.ccwAPI && typeof obj.ccwAPI === 'object') return true;
            return false;
        }

        const state = {
            vm: null,
            resolved: false,
            timer: null,
            attempts: 0,
        };

        function resolveVM(vm) {
            if (state.resolved) return;
            state.resolved = true;
            state.vm = vm;
            restoreBind();
            if (state.timer) { clearTimeout(state.timer); state.timer = null; }
            if (DEBUG) {
                console.log(LOG_PREFIX, '✅ VM 已捕获');
                console.log(LOG_PREFIX, 'runtime:', vm.runtime);
                console.log(LOG_PREFIX, 'ccwAPI:', vm.ccwAPI);
                console.log(LOG_PREFIX, 'targets:', vm.runtime?.targets?.length ?? 'N/A');
            }
            fireVM(vm);
        }

        const originalBind = Function.prototype.bind;

        Function.prototype.bind = function (self, ...args) {
            if (DEBUG) state.attempts++;
            if (!state.resolved && isVM(self)) resolveVM(self);
            return originalBind.apply(this, [self, ...args]);
        };

        function restoreBind() {
            if (Function.prototype.bind !== originalBind) {
                Function.prototype.bind = originalBind;
                if (DEBUG) console.log(LOG_PREFIX, 'bind 已恢复原始');
            }
        }

        state.timer = setTimeout(() => {
            if (state.resolved) return;
            if (DEBUG) {
                console.warn(LOG_PREFIX, `⏱ 超时（${TIMEOUT_MS}ms），未捕获到 VM`);
                console.warn(LOG_PREFIX, `尝试次数：${state.attempts}`);
            }
            restoreBind();
            try { W.__hookVMReady = false; } catch (e) {}
        }, TIMEOUT_MS);

        const hookApi = {
            get vm() { return state.vm; },
            get ready() { return state.resolved; },
            onVM: onVMReady,
            restore: restoreBind,
            retry: function () {
                if (state.resolved) return;
                restoreBind();
                Function.prototype.bind = function (self, ...args) {
                    if (!state.resolved && isVM(self)) resolveVM(self);
                    return originalBind.apply(this, [self, ...args]);
                };
                console.log(LOG_PREFIX, '已重新劫持');
            },
        };

        try { W.__vmHook = hookApi; } catch (e) {}

        if (DEBUG) {
            console.log(LOG_PREFIX, '已启动，等待 VM...');
            console.log(LOG_PREFIX, '接口：window.__vmHook');
        }
    })();

    const DB_NAME = 'witcat';
    const DB_VERSION = 3;
    const STORE = 'indexeddb-store';
    const IDX_UUID = 'uuid';
    const IDX_UUID_NAME = 'uuid-name';

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    function reqAsync(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function dbGet(uuid, name) {
        const db = await openDB();
        try {
            const tx = db.transaction([STORE], 'readonly');
            const idx = tx.objectStore(STORE).index(IDX_UUID_NAME);
            return await reqAsync(idx.get([uuid, name]));
        } finally {
            db.close();
        }
    }
    async function dbListKeys(uuid) {
        const db = await openDB();
        try {
            const tx = db.transaction([STORE], 'readonly');
            const idx = tx.objectStore(STORE).index(IDX_UUID);
            const names = [];
            await new Promise((resolve, reject) => {
                const cur = idx.openCursor(uuid);
                cur.onsuccess = () => {
                    const c = cur.result;
                    if (!c) return resolve();
                    if (c.value.name !== 0) names.push(c.value.name);
                    c.continue();
                };
                cur.onerror = () => reject(cur.error);
            });
            return names;
        } finally {
            db.close();
        }
    }

    async function dbPut(record) {
        const db = await openDB();
        try {
            const tx = db.transaction([STORE], 'readwrite');
            const store = tx.objectStore(STORE);
            const idx = store.index(IDX_UUID_NAME);
            const exist = await reqAsync(idx.get([record.uuid, record.name]));
            if (exist) {
                await new Promise((resolve, reject) => {
                    const cur = idx.openCursor([record.uuid, record.name]);
                    cur.onsuccess = () => {
                        const c = cur.result;
                        if (!c) return resolve();
                        const merged = Object.assign({}, c.value, record);
                        const r = c.update(merged);
                        r.onsuccess = () => resolve();
                        r.onerror = () => reject(r.error);
                    };
                    cur.onerror = () => reject(cur.error);
                });
            } else {
                await reqAsync(store.add(record));
            }
        } finally {
            db.close();
        }
    }
    async function dbDeleteKey(uuid, name) {
        const db = await openDB();
        try {
            const tx = db.transaction([STORE], 'readwrite');
            const idx = tx.objectStore(STORE).index(IDX_UUID_NAME);
            await new Promise((resolve, reject) => {
                const cur = idx.openCursor([uuid, name]);
                cur.onsuccess = () => {
                    const c = cur.result;
                    if (!c) return resolve();
                    const r = c.delete();
                    r.onsuccess = () => resolve();
                    r.onerror = () => reject(r.error);
                };
                cur.onerror = () => reject(cur.error);
            });
        } finally {
            db.close();
        }
    }
    async function dbDeleteProject(uuid) {
        const db = await openDB();
        try {
            const tx = db.transaction([STORE], 'readwrite');
            const idx = tx.objectStore(STORE).index(IDX_UUID);
            await new Promise((resolve, reject) => {
                const cur = idx.openCursor(uuid);
                cur.onsuccess = () => {
                    const c = cur.result;
                    if (!c) return resolve();
                    const r = c.delete();
                    r.onsuccess = () => { c.continue(); };
                    r.onerror = () => reject(r.error);
                };
                cur.onerror = () => reject(cur.error);
            });
        } finally {
            db.close();
        }
    }

    async function getProjectDescp(uuid) {
        const rec = await dbGet(uuid, 0);
        return rec ? (rec.descp ?? '') : '';
    }
    async function setProjectDescp(uuid, descp) {
        const exist = await dbGet(uuid, 0);
        if (exist) {
            exist.descp = descp;
            await dbPut(exist);
        } else {
            await dbPut({ uuid, name: 0, descp });
        }
    }

    async function listAllRecords(uuid) {
        const names = await dbListKeys(uuid);
        const out = [];
        for (const n of names) {
            const rec = await dbGet(uuid, n);
            if (rec) out.push(rec);
        }
        return out;
    }

    async function saveKey({ uuid, name, value, descp, permsAll, isNew }) {
        const exist = isNew ? null : await dbGet(uuid, name);
        const record = {
            uuid,
            name,
            value,
            descp: descp ?? '',
            perms: exist?.perms
                ? { all: permsAll ?? exist.perms.all, projects: exist.perms.projects ?? {} }
                : { all: permsAll ?? 'self', projects: {} },
        };
        await dbPut(record);
    }

    async function deleteKey(uuid, name) { await dbDeleteKey(uuid, name); }
    async function deleteProject(uuid) { await dbDeleteProject(uuid); }

    function fileTypeFromArrayBuffer(buf) {
        const n = new Uint8Array(buf);
        if (n[0] === 0xff && n[1] === 0xd8) return 'image/jpeg';
        if (n[0] === 0x89 && n[1] === 0x50 && n[2] === 0x4e && n[3] === 0x47) return 'image/png';
        if (n[0] === 0x47 && n[1] === 0x49 && n[2] === 0x46 && n[3] === 0x38) return 'image/gif';
        if (n[0] === 0x42 && n[1] === 0x4d) return 'image/bmp';
        if (n[0] === 0x25 && n[1] === 0x50 && n[2] === 0x44 && n[3] === 0x46) return 'application/pdf';
        if (n[0] === 0x50 && n[1] === 0x4b && n[2] === 0x03 && n[3] === 0x04) return 'application/zip';
        if (n[0] === 0x7b && n[1] === 0x5c && n[2] === 0x72 && n[3] === 0x74) return 'text/rtf';
        if (n[0] === 0x50 && n[1] === 0x4b && n[2] === 0x53 && n[3] === 0x20) return 'application/vnd.ms-powerpoint';
        if (n[0] === 0x52 && n[1] === 0x49 && n[2] === 0x46 && n[3] === 0x46) {
            const v = new DataView(buf.slice(8, 12)).getUint32(0, false);
            if (v === 22337) return 'video/x-ms-wmv';
            if (v === 16726) return 'video/x-msvideo';
            if (v === 18514) return 'video/mp4';
        }
        if (n[0] === 0x46 && n[1] === 0x4c && n[2] === 0x56 && n[3] === 0x01) return 'video/x-flv';
        const txt = new TextDecoder().decode(buf.slice(0, 100)).trim();
        if (txt.startsWith('<?xml') || txt.startsWith('<svg')) return 'image/svg+xml';
        return 'application/octet-stream';
    }
    function fileExt(type) {
        const m = {
            'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/bmp': 'bmp',
            'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'application/zip': 'zip',
            'text/rtf': 'rtf', 'application/vnd.ms-powerpoint': 'ppt',
            'video/x-ms-wmv': 'wmv', 'video/x-msvideo': 'avi', 'video/mp4': 'mp4',
            'video/x-flv': 'flv',
        };
        return m[type] || 'bin';
    }

    function permLabel(all) {
        switch (all) {
            case 'allow': return '公开';
            case 'read': return '只读';
            case 'self': return '私有';
            case 'default': return '默认';
            default: return '私有';
        }
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function escapeAttr(s) {
        return escapeHtml(s).replace(/"/g, '&quot;');
    }

    function overlayCss() {
        return 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483600;display:flex;align-items:center;justify-content:center;';
    }
    function boxCss() {
        return 'background:#1e1e22;color:#eee;border-radius:10px;padding:20px 22px;min-width:340px;max-width:90vw;box-shadow:0 10px 40px rgba(0,0,0,.6);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    }
    function btnCss(bg) {
        return `background:${bg};color:#fff;border:0;border-radius:6px;padding:8px 14px;font-size:13px;cursor:pointer;`;
    }

    function askUserTextOrBinary(currentIsBinary) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.cssText = overlayCss();
            const box = document.createElement('div');
            box.style.cssText = boxCss();
            box.innerHTML = `
                <div style="font-size:15px;font-weight:600;margin-bottom:14px;">请选择要保存的值类型</div>
                <div style="font-size:13px;color:#bbb;line-height:1.6;margin-bottom:18px;">
                    当前键${currentIsBinary ? '是' : '不是'}二进制数据。
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button data-r="text" style="${btnCss('#444')}">保存为文本</button>
                    <button data-r="binary" style="${btnCss('#1b86a1')}">保存为二进制(blob URL)</button>
                    <button data-r="cancel" style="${btnCss('#333')}">取消</button>
                </div>
            `;
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            box.addEventListener('click', e => {
                const r = e.target.dataset.r;
                if (!r) return;
                overlay.remove();
                resolve(r);
            });
        });
    }

    const POS_KEY = 'witcat_db_ball_pos_v1';

    let ball = null;
    let panel = null;
    let currentVM = null;
    let currentUUID = '';
    let toastEl = null;

    function showToast(msg, ok = true) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.style.cssText =
                'position:fixed;top:16px;left:50%;transform:translateX(-50%);' +
                'z-index:2147483647;padding:10px 18px;border-radius:8px;' +
                'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
                'font-size:13px;color:#fff;pointer-events:none;transition:opacity .25s;opacity:0;';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.style.background = ok ? '#1f9d55' : '#c0392b';
        toastEl.style.opacity = '1';
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(() => { toastEl.style.opacity = '0'; }, 2000);
    }

    function makeBall() {
        ball = document.createElement('div');
        ball.textContent = '';
        ball.style.cssText =
            'position:fixed;width:52px;height:52px;border-radius:50%;' +
            'background:#2a2a30;color:#fff;font-weight:700;font-size:15px;' +
            'display:flex;align-items:center;justify-content:center;' +
            'cursor:pointer;user-select:none;z-index:2147483000;' +
            'box-shadow:0 4px 16px rgba(0,0,0,.45);border:1px solid #3a3a42;' +
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch (e) {}
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
            ball.style.left = saved.x + 'px';
            ball.style.top = saved.y + 'px';
        } else {
            ball.style.right = '24px';
            ball.style.bottom = '90px';
        }

        let dragging = false;
        let moved = false;
        let startX = 0, startY = 0, startL = 0, startT = 0;

        ball.addEventListener('mousedown', e => {
            dragging = true;
            moved = false;
            const r = ball.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY;
            startL = r.left; startT = r.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
            let nl = startL + dx;
            let nt = startT + dy;
            nl = Math.max(0, Math.min(window.innerWidth - ball.offsetWidth, nl));
            nt = Math.max(0, Math.min(window.innerHeight - ball.offsetHeight, nt));
            ball.style.left = nl + 'px';
            ball.style.top = nt + 'px';
            ball.style.right = 'auto';
            ball.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => {
            if (dragging) {
                dragging = false;
                const r = ball.getBoundingClientRect();
                try { localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top })); } catch (e) {}
            }
        });
        ball.addEventListener('click', () => {
            if (moved) return;
            openPanel();
        });

        document.body.appendChild(ball);
    }

    function openPanel() {
        if (panel) { panel.style.display = 'block'; refreshPanel(); return; }

        panel = document.createElement('div');
        panel.style.cssText =
            'position:fixed;width:680px;height:440px;min-width:420px;min-height:260px;' +
            'background:#1e1e22;color:#eee;border:1px solid #333;border-radius:12px;' +
            'box-shadow:0 12px 40px rgba(0,0,0,.6);z-index:2147483001;' +
            'display:flex;flex-direction:column;overflow:hidden;resize:both;' +
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

        const br = ball.getBoundingClientRect();
        let left = br.left - 700;
        if (left < 10) left = br.right + 10;
        if (left + 680 > window.innerWidth) left = Math.max(10, window.innerWidth - 690);
        let top = br.top - 200;
        top = Math.max(10, Math.min(window.innerHeight - 450, top));
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';

        panel.innerHTML = `
            <div id="witcat-db-header" style="
                height:42px;flex:0 0 42px;display:flex;align-items:center;
                padding:0 12px;background:#25252b;border-bottom:1px solid #333;
                cursor:move;user-select:none;">
                <div style="font-weight:600;font-size:14px;">WitCat IndexedDB 管理器</div>
                <div style="flex:1;"></div>
                <button id="witcat-db-refresh" style="
                    height:28px;padding:0 10px;border-radius:6px;border:0;background:#2a6b8a;
                    color:#fff;cursor:pointer;font-size:12px;margin-right:6px;">刷新</button>
                <button id="witcat-db-close" style="
                    width:28px;height:28px;border-radius:6px;border:0;background:#3a3a42;
                    color:#fff;cursor:pointer;font-size:14px;">✕</button>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:10px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #2c2c33;">
                    <button id="witcat-db-add" style="${btnCss('#1b86a1')}">新增键</button>
                    <button id="witcat-db-delproj" style="${btnCss('#8a2b2b')}">删除当前作品全部数据</button>
                    <div style="flex:1;"></div>
                    <span style="font-size:12px;color:#888;">UUID: <span id="witcat-db-uuid" style="color:#bbb;">-</span></span>
                </div>
                <div style="padding:10px 12px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #2c2c33;">
                    <label style="font-size:12px;color:#aaa;flex:0 0 auto;">作品描述</label>
                    <input id="witcat-db-descp" type="text" style="
                        flex:1;background:#2a2a30;color:#eee;border:1px solid #3a3a42;
                        border-radius:6px;padding:6px 10px;font-size:13px;outline:none;">
                    <button id="witcat-db-savedescp" style="${btnCss('#3a3a42')}">保存描述</button>
                </div>
                <div style="flex:1;overflow:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead>
                            <tr style="position:sticky;top:0;background:#25252b;z-index:2;">
                                <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #333;">键</th>
                                <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #333;">值</th>
                                <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #333;">描述</th>
                                <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #333;">权限</th>
                                <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #333;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="witcat-db-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        panel.querySelector('#witcat-db-close').addEventListener('click', closePanel);
        panel.querySelector('#witcat-db-refresh').addEventListener('click', () => {
            refreshPanel(true);
        });

        (function makeDraggable() {
            const header = panel.querySelector('#witcat-db-header');
            let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
            header.addEventListener('mousedown', e => {
                if (e.target.closest('button')) return;
                dragging = true;
                sx = e.clientX; sy = e.clientY;
                const r = panel.getBoundingClientRect();
                sl = r.left; st = r.top;
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!dragging) return;
                let nl = sl + (e.clientX - sx);
                let nt = st + (e.clientY - sy);
                nl = Math.max(-panel.offsetWidth + 80, Math.min(window.innerWidth - 80, nl));
                nt = Math.max(0, Math.min(window.innerHeight - 40, nt));
                panel.style.left = nl + 'px';
                panel.style.top = nt + 'px';
            });
            document.addEventListener('mouseup', () => { dragging = false; });
        })();

        panel.querySelector('#witcat-db-add').addEventListener('click', () => {
            openEditor(null);
        });
        panel.querySelector('#witcat-db-delproj').addEventListener('click', async () => {
            if (!currentUUID) return;
            if (!confirm(`确定删除作品（id: ${currentUUID}）的所有数据吗？`)) return;
            try {
                await deleteProject(currentUUID);
                showToast('已删除作品全部数据');
                await refreshPanel();
            } catch (e) {
                console.error(e);
                showToast('删除失败：' + e.message, false);
            }
        });
        panel.querySelector('#witcat-db-savedescp').addEventListener('click', async () => {
            if (!currentUUID) return;
            const val = panel.querySelector('#witcat-db-descp').value;
            try {
                await setProjectDescp(currentUUID, val);
                showToast('描述已保存');
            } catch (e) {
                console.error(e);
                showToast('保存描述失败：' + e.message, false);
            }
        });

        refreshPanel();
    }

    function closePanel() {
        if (panel) panel.style.display = 'none';
    }

    function resolveUUID(vm) {
        if (!vm) return '';
        try {
            if (vm.ccwAPI && typeof vm.ccwAPI.getProjectUUID === 'function') {
                const u = vm.ccwAPI.getProjectUUID();
                if (u) return u;
            }
        } catch (e) {}
        try {
            if (vm.runtime && vm.runtime.ccwAPI && typeof vm.runtime.ccwAPI.getProjectUUID === 'function') {
                const u = vm.runtime.ccwAPI.getProjectUUID();
                if (u) return u;
            }
        } catch (e) {}
        try {
            if (W.__hookedVM && W.__hookedVM.ccwAPI && typeof W.__hookedVM.ccwAPI.getProjectUUID === 'function') {
                const u = W.__hookedVM.ccwAPI.getProjectUUID();
                if (u) return u;
            }
        } catch (e) {}
        try {
            if (W.ccwAPI && typeof W.ccwAPI.getProjectUUID === 'function') {
                const u = W.ccwAPI.getProjectUUID();
                if (u) return u;
            }
        } catch (e) {}
        try {
            if (W.vm && W.vm.ccwAPI && typeof W.vm.ccwAPI.getProjectUUID === 'function') {
                const u = W.vm.ccwAPI.getProjectUUID();
                if (u) return u;
            }
        } catch (e) {}
        return '';
    }

    async function refreshPanel(fromButton) {
        if (!panel) return;

        if (!currentVM) {
            currentVM = hookedVM || W.__hookedVM || W.vm || null;
        }

        let uuid = resolveUUID(currentVM);
        if (!uuid) {
            if (!currentVM) {
                showToast('未获取到 VM，正在重试...', false);
                if (W.__vmHook && typeof W.__vmHook.retry === 'function') {
                    try { W.__vmHook.retry(); } catch (e) {}
                }
            } else {
                showToast('未获取到 ccwAPI.getProjectUUID', false);
            }
            if (fromButton) {
                return;
            }
            return;
        }

        currentUUID = uuid;
        panel.querySelector('#witcat-db-uuid').textContent = currentUUID || '-';

        try {
            const descp = await getProjectDescp(currentUUID);
            panel.querySelector('#witcat-db-descp').value = descp;
        } catch (e) {}

        const tbody = panel.querySelector('#witcat-db-tbody');
        tbody.innerHTML = '';
        let records = [];
        try {
            records = await listAllRecords(currentUUID);
        } catch (e) {
            console.error(e);
            showToast('读取数据失败：' + e.message, false);
            return;
        }

        for (const rec of records) {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #2a2a30';

            const tdKey = document.createElement('td');
            tdKey.style.cssText = 'padding:8px 10px;color:#eee;word-break:break-all;';
            tdKey.textContent = String(rec.name);
            tr.appendChild(tdKey);

            const tdVal = document.createElement('td');
            tdVal.style.cssText = 'padding:8px 10px;color:#bbb;max-width:220px;word-break:break-all;';
            if (rec.value instanceof ArrayBuffer) {
                tdVal.textContent = `[二进制，${rec.value.byteLength} 字节]`;
                const dl = document.createElement('button');
                dl.textContent = '下载';
                dl.style.cssText = btnCss('#2a6b8a') + 'margin-left:6px;padding:3px 8px;font-size:12px;';
                dl.addEventListener('click', () => {
                    const blob = new Blob([rec.value], { type: fileTypeFromArrayBuffer(rec.value) });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${rec.name}.${fileExt(blob.type)}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                });
                tdVal.appendChild(dl);
            } else {
                const s = String(rec.value ?? '');
                tdVal.textContent = s.length > 60 ? s.slice(0, 60) + '…' : s;
                tdVal.title = s;
            }
            tr.appendChild(tdVal);

            const tdDesc = document.createElement('td');
            tdDesc.style.cssText = 'padding:8px 10px;color:#999;max-width:180px;word-break:break-all;';
            const ds = String(rec.descp ?? '');
            tdDesc.textContent = ds.length > 40 ? ds.slice(0, 40) + '…' : ds;
            tdDesc.title = ds;
            tr.appendChild(tdDesc);

            const tdPerm = document.createElement('td');
            tdPerm.style.cssText = 'padding:8px 10px;color:#9c9;';
            tdPerm.textContent = permLabel(rec.perms?.all);
            tr.appendChild(tdPerm);

            const tdOp = document.createElement('td');
            tdOp.style.cssText = 'padding:8px 10px;white-space:nowrap;';
            const editBtn = document.createElement('button');
            editBtn.textContent = '编辑';
            editBtn.style.cssText = btnCss('#2a6b8a') + 'margin-right:6px;padding:4px 10px;font-size:12px;';
            editBtn.addEventListener('click', () => openEditor(rec));
            const delBtn = document.createElement('button');
            delBtn.textContent = '删除';
            delBtn.style.cssText = btnCss('#8a2b2b') + 'padding:4px 10px;font-size:12px;';
            delBtn.addEventListener('click', async () => {
                if (!confirm(`确定删除键 ${rec.name} 吗？`)) return;
                try {
                    await deleteKey(currentUUID, rec.name);
                    showToast('已删除');
                    await refreshPanel();
                } catch (e) {
                    console.error(e);
                    showToast('删除失败：' + e.message, false);
                }
            });
            tdOp.appendChild(editBtn);
            tdOp.appendChild(delBtn);
            tr.appendChild(tdOp);

            tbody.appendChild(tr);
        }
    }

    function openEditor(existing) {
        const isNew = !existing;
        const overlay = document.createElement('div');
        overlay.style.cssText = overlayCss();

        const box = document.createElement('div');
        box.style.cssText = boxCss() + 'min-width:480px;max-width:92vw;';

        const isBinary = !isNew && existing.value instanceof ArrayBuffer;
        const currentValueText = (!isBinary && existing) ? String(existing.value ?? '') : '';
        const currentDescp = existing ? String(existing.descp ?? '') : '';
        const currentPerm = existing?.perms?.all ?? 'self';

        box.innerHTML = `
            <div style="font-size:15px;font-weight:600;margin-bottom:14px;">${isNew ? '新增键' : '编辑键'}</div>

            <div style="margin-bottom:10px;">
                <div style="font-size:12px;color:#aaa;margin-bottom:4px;">键名</div>
                <input id="witcat-ed-name" type="text" value="${isNew ? '' : escapeAttr(String(existing.name))}"
                    ${isNew ? '' : 'readonly'}
                    style="width:100%;box-sizing:border-box;background:#2a2a30;color:#eee;border:1px solid #3a3a42;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;${isNew ? '' : 'opacity:.7;'}">
            </div>

            <div style="margin-bottom:10px;">
                <div style="font-size:12px;color:#aaa;margin-bottom:4px;">值类型</div>
                <label style="margin-right:16px;font-size:13px;color:#ddd;">
                    <input type="radio" name="witcat-ed-type" value="text" ${isBinary ? '' : 'checked'}> 文本
                </label>
                <label style="font-size:13px;color:#ddd;">
                    <input type="radio" name="witcat-ed-type" value="binary" ${isBinary ? 'checked' : ''}> 二进制(blob URL)
                </label>
            </div>

            <div id="witcat-ed-textwrap" style="margin-bottom:10px;${isBinary ? 'display:none;' : ''}">
                <div style="font-size:12px;color:#aaa;margin-bottom:4px;">文本值</div>
                <textarea id="witcat-ed-text" rows="3" style="width:100%;box-sizing:border-box;background:#2a2a30;color:#eee;border:1px solid #3a3a42;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;resize:vertical;">${escapeHtml(currentValueText)}</textarea>
            </div>

            <div id="witcat-ed-binwrap" style="margin-bottom:10px;${isBinary ? '' : 'display:none;'}">
                <div style="font-size:12px;color:#aaa;margin-bottom:4px;">
                    blob URL
                    ${isBinary ? `<span style="color:#888;">（当前：[二进制，${existing.value.byteLength} 字节]，留空则保持原值）</span>` : ''}
                </div>
                <input id="witcat-ed-blob" type="text" placeholder="blob:https://..." style="width:100%;box-sizing:border-box;background:#2a2a30;color:#eee;border:1px solid #3a3a42;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;">
                ${isBinary ? `<button id="witcat-ed-download" style="${btnCss('#2a6b8a')}margin-top:6px;padding:4px 10px;font-size:12px;">下载原二进制</button>` : ''}
            </div>

            <div style="margin-bottom:10px;">
                <div style="font-size:12px;color:#aaa;margin-bottom:4px;">描述</div>
                <input id="witcat-ed-descp" type="text" value="${escapeAttr(currentDescp)}" style="width:100%;box-sizing:border-box;background:#2a2a30;color:#eee;border:1px solid #3a3a42;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;">
            </div>

            <div style="margin-bottom:16px;">
                <div style="font-size:12px;color:#aaa;margin-bottom:4px;">权限</div>
                <select id="witcat-ed-perm" style="width:100%;box-sizing:border-box;background:#2a2a30;color:#eee;border:1px solid #3a3a42;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;">
                    <option value="allow" ${currentPerm === 'allow' ? 'selected' : ''}>公开（可读可改）</option>
                    <option value="read" ${currentPerm === 'read' ? 'selected' : ''}>只读</option>
                    <option value="self" ${(currentPerm === 'self' || currentPerm === 'default') ? 'selected' : ''}>私有</option>
                </select>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button id="witcat-ed-cancel" style="${btnCss('#333')}">取消</button>
                <button id="witcat-ed-ok" style="${btnCss('#1b86a1')}">确定</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const typeRadios = box.querySelectorAll('input[name="witcat-ed-type"]');
        const textWrap = box.querySelector('#witcat-ed-textwrap');
        const binWrap = box.querySelector('#witcat-ed-binwrap');
        typeRadios.forEach(r => r.addEventListener('change', () => {
            if (box.querySelector('input[name="witcat-ed-type"]:checked').value === 'text') {
                textWrap.style.display = '';
                binWrap.style.display = 'none';
            } else {
                textWrap.style.display = 'none';
                binWrap.style.display = '';
            }
        }));

        const dlBtn = box.querySelector('#witcat-ed-download');
        if (dlBtn && isBinary) {
            dlBtn.addEventListener('click', () => {
                const blob = new Blob([existing.value], { type: fileTypeFromArrayBuffer(existing.value) });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${existing.name}.${fileExt(blob.type)}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
        }

        box.querySelector('#witcat-ed-cancel').addEventListener('click', () => overlay.remove());

        box.querySelector('#witcat-ed-ok').addEventListener('click', async () => {
            const name = isNew
                ? box.querySelector('#witcat-ed-name').value.trim()
                : String(existing.name);
            if (isNew && !name) { showToast('键名不能为空', false); return; }
            if (isNew && name === '0') { showToast('键名不能为 0（保留）', false); return; }

            const type = box.querySelector('input[name="witcat-ed-type"]:checked').value;
            const descp = box.querySelector('#witcat-ed-descp').value;
            const perm = box.querySelector('#witcat-ed-perm').value;

            if (isNew) {
                const exist = await dbGet(currentUUID, name);
                if (exist) {
                    if (!confirm(`键 "${name}" 已存在，是否覆盖？`)) return;
                }
            }

            let value = undefined;
            let binaryBuf = null;
            let keepOld = false;

            if (type === 'text') {
                value = box.querySelector('#witcat-ed-text').value;
            } else {
                const blobUrl = box.querySelector('#witcat-ed-blob').value.trim();
                if (!blobUrl) {
                    if (isBinary) {
                        keepOld = true;
                        value = existing.value;
                    } else {
                        showToast('请输入 blob URL', false);
                        return;
                    }
                } else {
                    if (!blobUrl.startsWith('blob:')) {
                        showToast('不是有效的 blob URL', false);
                        return;
                    }
                    try {
                        const resp = await fetch(blobUrl);
                        const blob = await resp.blob();
                        binaryBuf = await blob.arrayBuffer();
                    } catch (e) {
                        console.error(e);
                        showToast('读取 blob URL 失败：' + e.message, false);
                        return;
                    }
                }
            }

            if (!keepOld) {
                const choice = await askUserTextOrBinary(isBinary);
                if (choice === 'cancel') return;
                if (choice === 'text') {
                    value = box.querySelector('#witcat-ed-text').value;
                } else {
                    if (binaryBuf) {
                        value = binaryBuf;
                    } else {
                        const blobUrl = box.querySelector('#witcat-ed-blob').value.trim();
                        if (!blobUrl) {
                            if (isBinary) {
                                value = existing.value;
                            } else {
                                showToast('二进制模式需要 blob URL', false);
                                return;
                            }
                        } else {
                            try {
                                const resp = await fetch(blobUrl);
                                const blob = await resp.blob();
                                value = await blob.arrayBuffer();
                            } catch (e) {
                                console.error(e);
                                showToast('读取 blob URL 失败：' + e.message, false);
                                return;
                            }
                        }
                    }
                }
            }

            try {
                await saveKey({
                    uuid: currentUUID,
                    name,
                    value,
                    descp,
                    permsAll: perm,
                    isNew,
                });
                overlay.remove();
                showToast('已保存');
                await refreshPanel();
            } catch (e) {
                console.error(e);
                showToast('保存失败：' + e.message, false);
            }
        });
    }

    function ensureBody(cb) {
        if (document.body) return cb();
        const t = setInterval(() => {
            if (document.body) { clearInterval(t); cb(); }
        }, 50);
    }

    function boot(vm) {
        currentVM = vm || hookedVM;
        console.log('[WitCat DB] 已获取 VM:', currentVM);
        ensureBody(() => {
            if (!ball) makeBall();
        });
    }

    (function waitForVM() {
        if (hookedVM) { boot(hookedVM); return; }

        onVMReady(boot);

        if (W.__hookedVM) { boot(W.__hookedVM); return; }
        if (W.__vmHook && typeof W.__vmHook.onVM === 'function') {
            try { W.__vmHook.onVM(boot); } catch (e) {}
        }

        let tries = 0;
        const maxTries = 200;
        const t = setInterval(() => {
            tries++;
            if (hookedVM || W.__hookedVM) {
                clearInterval(t);
                boot(hookedVM || W.__hookedVM);
                return;
            }
            if (W.__vmHook && typeof W.__vmHook.onVM === 'function' && tries === 1) {
                try { W.__vmHook.onVM(boot); } catch (e) {}
            }
            if (W.__vmHook && typeof W.__vmHook.retry === 'function' && tries % 40 === 0) {
                try { W.__vmHook.retry(); } catch (e) {}
            }
            if (tries >= maxTries) {
                clearInterval(t);
                console.warn('等待 VM 超时');
            }
        }, 150);
    })();

})();