// ==UserScript==
// @name         CCW 扩展源码提取器
// @namespace    https://www.ccw.site/
// @version      5.0.0
// @description  多策略并行提取 CCW 扩展 URL 和源码
// @author       会飞的黄油
// @match        https://www.ccw.site/*
// @match        https://*.ccw.site/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @run-at       document-start
// @all_frames   true
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        pollInterval: 300,
        pollTimeout: 60000,
        reactScanThrottle: 1000,
        windowScanLimit: 800,
        fetchTimeout: 15000
    };

    const BUILTIN = new Set([
        'motion','looks','sound','events','control','sensing','operators',
        'variables','list','procedures','pen','music','video','text2speech',
        'translate','makeymakey','microbit','ev3','wedo2','boost','gdxfor',
        'faceSensing','speech','videoSensing','gandi'
    ]);

    const log = (...a) => console.log('[CCWExtract]', ...a);
    const warn = (...a) => console.warn('[CCWExtract]', ...a);

    const HITS = {
        network_js:     new Map(),
        network_worker: new Map(),
        performance:    new Map(),
        loadExtURL:     new Map(),
        customInfo:     new Map(),
        officialInfo:   new Map(),
        gandiServices:  new Map(),
        loadedNames:    new Set(),
        opcodeNames:    new Set(),
        evalSources:    new Map()
    };

    (function hookNetworkEarly() {
        const addJS = (url, tag) => {
            if (!url || typeof url !== 'string') return;
            if (/\.js(\?|#|$)/i.test(url)) {
                HITS.network_js.set(url, { url, tag });
            }
        };
        const addWorker = (url, tag) => {
            if (!url || typeof url !== 'string') return;
            HITS.network_worker.set(url, { url, tag });
        };

        try {
            const OrigOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                addJS(url, 'xhr');
                if (/worker|extension/i.test(url || '')) addWorker(url, 'xhr-worker');
                return OrigOpen.call(this, method, url, ...rest);
            };
        } catch (e) {}

        try {
            const origFetch = window.fetch;
            if (typeof origFetch === 'function') {
                window.fetch = function (input, init) {
                    const url = typeof input === 'string' ? input : input?.url;
                    addJS(url, 'fetch');
                    if (/worker|extension/i.test(url || '')) addWorker(url, 'fetch-worker');
                    return origFetch.call(this, input, init);
                };
            }
        } catch (e) {}

        try {
            const origAppend = Node.prototype.appendChild;
            Node.prototype.appendChild = function (child) {
                if (child && child.tagName === 'SCRIPT' && child.src) addJS(child.src, 'script-append');
                return origAppend.call(this, child);
            };
        } catch (e) {}

        try {
            const origSetAttr = Element.prototype.setAttribute;
            Element.prototype.setAttribute = function (name, value) {
                if (this.tagName === 'SCRIPT' && name === 'src') addJS(value, 'script-setAttribute');
                return origSetAttr.call(this, name, value);
            };
        } catch (e) {}

        try {
            const OrigWorker = window.Worker;
            if (typeof OrigWorker === 'function') {
                window.Worker = function (url, ...args) {
                    const u = typeof url === 'string' ? url : url?.url;
                    addWorker(u, 'Worker-ctor');
                    return new OrigWorker(url, ...args);
                };
                window.Worker.prototype = OrigWorker.prototype;
            }
        } catch (e) {}

        try {
            const origImport = window.importScripts;
            if (typeof origImport === 'function') {
                window.importScripts = function (...urls) {
                    urls.forEach(u => addJS(u, 'importScripts'));
                    return origImport.apply(this, urls);
                };
            }
        } catch (e) {}
    })();

    (function hookEval() {
        const isLikelyExtension = (src) => {
            if (typeof src !== 'string') return false;
            if (src.length < 500) return false;
            return (
                /Scratch\.extensions\.register/.test(src) ||
                /extensionId|getInfo\s*\(\s*\)/.test(src) ||
                /blocks\s*:\s*\[/.test(src) ||
                /opcode\s*:/.test(src)
            );
        };

        try {
            const origEval = window.eval;
            window.eval = function (src) {
                if (isLikelyExtension(src)) {
                    const name = 'eval_' + HITS.evalSources.size;
                    HITS.evalSources.set(name, { name, source: src });
                    log('eval 捕获扩展源码, 长度', src.length);
                }
                return origEval.call(this, src);
            };
        } catch (e) {}

        try {
            const OrigFunction = window.Function;
            window.Function = function (...args) {
                const body = args[args.length - 1];
                if (isLikelyExtension(body)) {
                    const name = 'Function_' + HITS.evalSources.size;
                    HITS.evalSources.set(name, { name, source: body });
                    log('Function 捕获扩展源码, 长度', body.length);
                }
                return new OrigFunction(...args);
            };
            window.Function.prototype = OrigFunction.prototype;
        } catch (e) {}
    })();

    function isVM(obj) {
        if (!obj || typeof obj !== 'object') return false;
        const rt = obj.runtime;
        if (!rt || typeof rt !== 'object') return false;
        if (!Array.isArray(rt.targets)) return false;
        return ('editingTarget' in obj) || ('extensionManager' in obj) || ('loadProject' in obj);
    }

    function scanWindowForVM() {
        const direct = [
            window.eureka?.vm, window.vm,
            typeof unsafeWindow !== 'undefined' ? unsafeWindow.vm : null,
            window.__vm, window._vm, window.scratchVm,
            window.Scratch?.vm, window.scratch?.vm,
            window.vmInstance, window.__scratchVm
        ];
        for (const c of direct) if (isVM(c)) return c;

        let keys;
        try { keys = Object.keys(window); } catch (e) { return null; }
        let count = 0;
        for (const key of keys) {
            if (++count > CONFIG.windowScanLimit) break;
            let val;
            try { val = window[key]; } catch (e) { continue; }
            if (!val || typeof val !== 'object') continue;
            if (isVM(val)) return val;
            let keys2, c2 = 0;
            try { keys2 = Object.keys(val); } catch (e) { continue; }
            for (const k2 of keys2) {
                if (++c2 > 50) break;
                let v2;
                try { v2 = val[k2]; } catch (e) { continue; }
                if (isVM(v2)) return v2;
            }
        }
        return null;
    }

    function walkFiberForVM(node, visited, depth) {
        if (!node || visited.has(node) || depth > 40) return null;
        visited.add(node);
        try {
            if (isVM(node)) return node;
            const m = node.memoizedState;
            if (m?.state?.scratchGui?.vm) return m.state.scratchGui.vm;
            if (m?.memoizedState?.scratchGui?.vm) return m.memoizedState.scratchGui.vm;
            const sn = node.stateNode;
            if (sn?.state?.scratchGui?.vm) return sn.state.scratchGui.vm;
            if (isVM(sn)) return sn;
            if (typeof node.getState === 'function') {
                const st = node.getState();
                if (st?.scratchGui?.vm) return st.scratchGui.vm;
            }
            for (const c of [node.child, node.sibling, node.return, node.alternate]) {
                if (!c || typeof c !== 'object') continue;
                const r = walkFiberForVM(c, visited, depth + 1);
                if (r) return r;
            }
            let n = 0;
            for (const k in node) {
                if (++n > 60) break;
                if (k === 'stateNode' || k === '_owner') continue;
                let v;
                try { v = node[k]; } catch (e) { continue; }
                if (v && typeof v === 'object') {
                    const r = walkFiberForVM(v, visited, depth + 1);
                    if (r) return r;
                }
            }
        } catch (e) {}
        return null;
    }

    function scanReactForVM() {
        try {
            const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
            if (hook && typeof hook.getFiberRoots === 'function') {
                for (let i = 1; i <= 10; i++) {
                    let roots;
                    try { roots = hook.getFiberRoots(i); } catch (e) { continue; }
                    if (!roots) continue;
                    for (const root of roots) {
                        const r = walkFiberForVM(root, new Set(), 0);
                        if (r) return r;
                    }
                }
            }
            const nodes = document.querySelectorAll('*');
            const limit = Math.min(nodes.length, 500);
            for (let i = 0; i < limit; i++) {
                const el = nodes[i];
                let keys;
                try { keys = Object.keys(el); } catch (e) { continue; }
                for (const k of keys) {
                    if (k.startsWith('__reactContainer') || k.startsWith('__reactFiber')) {
                        const r = walkFiberForVM(el[k], new Set(), 0);
                        if (r) return r;
                    }
                }
            }
        } catch (e) {}
        return null;
    }

    let vmInstance = null;
    let vmSearching = false;
    let vmWaiters = [];
    let vmStatusCallback = null;
    let hooked = false;

    function setVMStatus(s) {
        if (typeof vmStatusCallback === 'function') {
            try { vmStatusCallback(s); } catch (e) {}
        }
    }

    function hookExtensionManager(vm) {
        if (hooked || !vm) return;
        const em = vm.extensionManager;
        if (!em) return;
        hooked = true;

        const orig = em.loadExtensionURL;
        if (typeof orig === 'function' && !orig.__hooked) {
            const wrapped = function (url, ...args) {
                try {
                    if (typeof url === 'string' && /^https?:/i.test(url)) {
                        HITS.loadExtURL.set(url, { url, tag: 'loadExtensionURL' });
                        log('loadExtensionURL:', url);
                    }
                } catch (e) {}
                return orig.apply(this, [url, ...args]);
            };
            wrapped.__hooked = true;
            em.loadExtensionURL = wrapped;
        }

        ['loadExtensionIdOrURL', 'loadExtension', 'loadExternalExtension', '_loadExtension'].forEach(fn => {
            const o = em[fn];
            if (typeof o !== 'function' || o.__hooked) return;
            const w = function (arg, ...args) {
                try {
                    if (typeof arg === 'string' && /^https?:/i.test(arg)) {
                        HITS.loadExtURL.set(arg, { url: arg, tag: fn });
                    }
                } catch (e) {}
                return o.apply(this, [arg, ...args]);
            };
            w.__hooked = true;
            em[fn] = w;
        });

        log('extensionManager 已 hook');
    }

    function resolveVM(vm) {
        if (!vm || vmInstance) return;
        vmInstance = vm;
        hookExtensionManager(vm);
        setVMStatus('found');
        const ws = vmWaiters; vmWaiters = [];
        ws.forEach(fn => fn(vm));
    }

    function rejectVM() {
        setVMStatus('timeout');
        const ws = vmWaiters; vmWaiters = [];
        ws.forEach(fn => fn(null, 'timeout'));
    }

    async function pollVM() {
        if (vmInstance) return vmInstance;

        let vm = scanWindowForVM();
        if (vm) { resolveVM(vm); return vm; }
        vm = scanReactForVM();
        if (vm) { resolveVM(vm); return vm; }

        if (vmSearching) return new Promise(resolve => vmWaiters.push(v => resolve(v)));

        vmSearching = true;
        setVMStatus('searching');

        return new Promise(resolve => {
            vmWaiters.push(v => resolve(v));
            const start = Date.now();
            let lastReact = 0;

            const timer = setInterval(() => {
                let found = scanWindowForVM();
                if (found) { clearInterval(timer); vmSearching = false; resolveVM(found); return; }

                const now = Date.now();
                if (now - lastReact >= CONFIG.reactScanThrottle) {
                    lastReact = now;
                    found = scanReactForVM();
                    if (found) { clearInterval(timer); vmSearching = false; resolveVM(found); return; }
                }

                if (now - start > CONFIG.pollTimeout) {
                    clearInterval(timer);
                    vmSearching = false;
                    warn('VM 轮询超时');
                    rejectVM();
                }
            }, CONFIG.pollInterval);
        });
    }

    async function getVM() {
        if (vmInstance) return vmInstance;
        return await pollVM();
    }

    function collectFromPerformance() {
        try {
            const entries = performance.getEntriesByType('resource');
            for (const e of entries) {
                const url = e.name;
                if (!url) continue;
                if (/\.js(\?|#|$)/i.test(url)) {
                    HITS.performance.set(url, {
                        url,
                        initiatorType: e.initiatorType,
                        tag: 'performance'
                    });
                }
            }
            log('performance 收集到', HITS.performance.size, '个 .js');
        } catch (e) { warn('performance 收集失败', e); }
    }

    // ---- B：从 extensionManager 各字段拿 ----
    function extractFromMapLike(obj, tag, bucket) {
        if (!obj) return;
        const push = (name, url, extra) => {
            if (!name) return;
            bucket.set(name, { name, url: url || null, extra: extra || null, tag });
        };

        if (obj instanceof Map) {
            obj.forEach((v, k) => {
                let url = null;
                if (typeof v === 'string' && /^https?:/i.test(v)) url = v;
                else if (v && typeof v === 'object') {
                    url = v.url || v.extensionURL || v.assetUri || v.scriptURL || v.src || null;
                }
                push(k, url, v);
            });
        } else if (typeof obj === 'object') {
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                let url = null;
                if (typeof v === 'string' && /^https?:/i.test(v)) url = v;
                else if (v && typeof v === 'object') {
                    url = v.url || v.extensionURL || v.assetUri || v.scriptURL || v.src || null;
                }
                push(k, url, v);
            }
        }
    }

    function collectFromExtensionManager(vm) {
        const em = vm?.extensionManager || {};
        try {
            if (em._customExtensionInfo) {
                extractFromMapLike(em._customExtensionInfo, '_customExtensionInfo', HITS.customInfo);
                log('_customExtensionInfo:', HITS.customInfo.size, '条');
            }
        } catch (e) {}
        try {
            if (em._officialExtensionInfo) {
                extractFromMapLike(em._officialExtensionInfo, '_officialExtensionInfo', HITS.officialInfo);
                log('_officialExtensionInfo:', HITS.officialInfo.size, '条');
            }
        } catch (e) {}
        try {
            if (em._gandiExternalExtensionServices) {
                extractFromMapLike(em._gandiExternalExtensionServices, '_gandiExternalExtensionServices', HITS.gandiServices);
                log('_gandiExternalExtensionServices:', HITS.gandiServices.size, '条');
            }
        } catch (e) {}
        try {
            const raw = em._loadedExtensions;
            if (raw instanceof Map) raw.forEach((v, k) => HITS.loadedNames.add(k));
            else if (raw && typeof raw === 'object') Object.keys(raw).forEach(k => HITS.loadedNames.add(k));
            log('_loadedExtensions 名字:', HITS.loadedNames.size, '个');
        } catch (e) {}
    }

    // ---- C：从 targets 扫 opcode ----
    function collectFromTargets(vm) {
        const names = new Set();
        for (const t of (vm?.runtime?.targets || [])) {
            const blocks = t?.blocks?._blocks || {};
            for (const id in blocks) {
                const op = blocks[id]?.opcode;
                if (!op || typeof op !== 'string') continue;
                const dot = op.indexOf('_');
                if (dot <= 0) continue;
                const prefix = op.slice(0, dot);
                if (BUILTIN.has(prefix)) continue;
                names.add(prefix);
            }
        }
        names.forEach(n => HITS.opcodeNames.add(n));
        log('targets 扫出扩展名:', HITS.opcodeNames.size, '个');
    }

    function nameFromURL(url) {
        if (!url || typeof url !== 'string') return null;
        try {
            const path = url.split('?')[0].split('#')[0];
            const base = path.split('/').pop() || '';
            let name = base.replace(/\.js$/i, '');
            name = name.replace(/\.(min|bundle|worker|prod|dev)$/i, '');
            return name || null;
        } catch (e) { return null; }
    }

    function fuzzyMatch(a, b) {
        if (!a || !b) return false;
        const x = a.toLowerCase();
        const y = b.toLowerCase();
        if (x === y) return true;
        if (x.includes(y) || y.includes(x)) return true;
        const x2 = x.replace(/[._\-\s]/g, '');
        const y2 = y.replace(/[._\-\s]/g, '');
        if (x2 === y2) return true;
        if (x2.includes(y2) || y2.includes(x2)) return true;
        return false;
    }

    function allURLs() {
        const urls = new Set();
        [HITS.network_js, HITS.network_worker, HITS.performance, HITS.loadExtURL]
            .forEach(bucket => { for (const url of bucket.keys()) urls.add(url); });
        [HITS.customInfo, HITS.officialInfo, HITS.gandiServices]
            .forEach(bucket => {
                bucket.forEach(v => { if (v.url) urls.add(v.url); });
            });
        return [...urls];
    }

    async function extractAll() {
        const vm = await getVM();
        if (!vm) return { all: [], strategies: {}, error: 'VM 未就绪' };

        hookExtensionManager(vm);

        collectFromPerformance();
        collectFromExtensionManager(vm);
        collectFromTargets(vm);

        await new Promise(r => setTimeout(r, 200));

        const strategies = {
            customInfo:     [...HITS.customInfo.values()],
            officialInfo:   [...HITS.officialInfo.values()],
            gandiServices:  [...HITS.gandiServices.values()],
            loadedNames:    [...HITS.loadedNames],
            opcodeNames:    [...HITS.opcodeNames],
            network_js:     [...HITS.network_js.values()],
            network_worker: [...HITS.network_worker.values()],
            performance:    [...HITS.performance.values()],
            loadExtURL:     [...HITS.loadExtURL.values()],
            evalSources:    [...HITS.evalSources.values()].map(e => ({ name: e.name, length: e.source.length }))
        };

        const map = new Map();
        const ensure = (name) => {
            if (!name) return null;
            if (!map.has(name)) {
                map.set(name, { name, url: null, urlSource: null, knownBy: new Set() });
            }
            return map.get(name);
        };

        const namedSources = [
            ['customInfo',    HITS.customInfo],
            ['officialInfo',  HITS.officialInfo],
            ['gandiServices', HITS.gandiServices]
        ];
        for (const [tag, bucket] of namedSources) {
            bucket.forEach((v, name) => {
                const e = ensure(name);
                e.knownBy.add(tag);
                if (v.url && !e.url) { e.url = v.url; e.urlSource = tag; }
            });
        }

        HITS.loadedNames.forEach(name => ensure(name).knownBy.add('_loadedExtensions'));
        HITS.opcodeNames.forEach(name => ensure(name).knownBy.add('targets.scan'));

        const urls = allURLs();
        for (const url of urls) {
            const cand = nameFromURL(url);
            if (!cand) continue;

            if (map.has(cand)) {
                const e = map.get(cand);
                if (!e.url) { e.url = url; e.urlSource = 'network(exact)'; }
                continue;
            }

            let matched = false;
            for (const [name, e] of map.entries()) {
                if (e.url) continue;
                if (fuzzyMatch(name, cand)) {
                    e.url = url;
                    e.urlSource = 'network(fuzzy:' + cand + ')';
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                const e = ensure(cand);
                if (!e.url) { e.url = url; e.urlSource = 'network(orphan)'; }
                e.knownBy.add('network(orphan)');
            }
        }

        HITS.evalSources.forEach((v, name) => {
            for (const [extName, e] of map.entries()) {
                if (!e.source && fuzzyMatch(extName, name)) {
                    e.source = v.source;
                    e.sourceType = 'eval';
                    break;
                }
            }
        });

        const all = [...map.values()].map(e => ({
            name: e.name,
            url: e.url,
            urlSource: e.urlSource,
            sourceType: e.source ? 'inline' : 'url',
            inlineSource: e.source || null,
            knownBy: [...e.knownBy],
            isLoaded: HITS.loadedNames.has(e.name)
        }));

        all.sort((a, b) => {
            const sa = (a.isLoaded ? 2 : 0) + (a.url || a.inlineSource ? 1 : 0);
            const sb = (b.isLoaded ? 2 : 0) + (b.url || b.inlineSource ? 1 : 0);
            return sb - sa;
        });

        return { all, strategies, vmReady: true };
    }

    function normalizeUrl(url) {
        if (!url) return null;
        if (/^(https?:|blob:|data:)/i.test(url)) return url;
        if (url.startsWith('//')) return location.protocol + url;
        if (url.startsWith('/')) return location.origin + url;
        return url;
    }

    async function fetchExtensionCode(ext) {
        if (ext?.inlineSource) return ext.inlineSource;

        const url = normalizeUrl(ext?.url);
        if (!url) return null;

        if (url.startsWith('blob:')) {
            try { return await (await fetch(url)).text(); }
            catch (e) { return null; }
        }

        if (url.startsWith('data:')) {
            const i = url.indexOf(',');
            if (i < 0) return null;
            try {
                const p = url.slice(i + 1);
                return url.slice(0, i).includes('base64') ? atob(p) : decodeURIComponent(p);
            } catch (e) { return null; }
        }

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout: CONFIG.fetchTimeout,
                headers: {
                    'Referer': 'https://www.ccw.site/',
                    'Origin': 'https://www.ccw.site'
                },
                onload: r => resolve(r.status >= 200 && r.status < 300 ? r.responseText : null),
                onerror: () => resolve(null),
                ontimeout: () => resolve(null)
            });
        });
    }

    let ball = null;

    function updateBallStatus(status) {
        if (!ball) return;
        if (status === 'searching') { ball.textContent = '🔍'; ball.title = '搜索 VM...'; }
        else if (status === 'found') { ball.textContent = '📦'; ball.title = 'VM 就绪，点击查看'; }
        else if (status === 'timeout') { ball.textContent = '⚠️'; ball.title = '未找到 VM'; }
        else { ball.textContent = '📦'; ball.title = 'CCW 扩展源码提取器'; }
    }

    function createBall() {
        if (ball && document.body.contains(ball)) return ball;
        ball = document.createElement('div');
        ball.textContent = '🔍';
        ball.style.cssText = `
            position: fixed; right: 20px; bottom: 160px;
            width: 48px; height: 48px; border-radius: 50%;
            background: linear-gradient(135deg,#667eea,#764ba2);
            color: #fff; font-size: 22px; display: flex;
            align-items: center; justify-content: center;
            cursor: pointer; z-index: 2147483646;
            box-shadow: 0 4px 15px rgba(0,0,0,.35);
            user-select: none; border: 2px solid rgba(255,255,255,.2);
            transition: transform .2s;
        `;
        ball.onmouseenter = () => { ball.style.transform = 'scale(1.1)'; };
        ball.onmouseleave = () => { ball.style.transform = 'scale(1)'; };
        ball.onclick = openPanel;
        document.body.appendChild(ball);

        vmStatusCallback = updateBallStatus;
        updateBallStatus('searching');
        pollVM().catch(() => {});
        return ball;
    }

    async function openPanel() {
        let result;
        try { result = await extractAll(); }
        catch (e) { alert('❌ 提取失败: ' + e.message); return; }

        const all = Array.isArray(result?.all) ? result.all : [];

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,.7);
            z-index: 2147483647; display: flex; align-items: center;
            justify-content: center; backdrop-filter: blur(4px);
        `;

        const win = document.createElement('div');
        win.style.cssText = `
            background: #1a1a2e; border-radius: 16px; width: 880px;
            max-width: 95vw; max-height: 88vh; display: flex;
            flex-direction: column; color: #eee; overflow: hidden;
            border: 2px solid #8be9fd; box-shadow: 0 20px 60px rgba(0,0,0,.9);
            font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
        `;

        // 头部
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px 20px; display: flex; justify-content: space-between;
            align-items: center; border-bottom: 1px solid rgba(255,255,255,.1);
            flex-shrink: 0;
        `;

        const title = document.createElement('span');
        title.style.cssText = `font-size:18px;font-weight:600;color:#8be9fd;`;
        const withSrc = all.filter(e => e.url || e.inlineSource).length;
        title.textContent = `📦 扩展提取 (${all.length} 个 / ${withSrc} 有源码)`;

        const right = document.createElement('div');
        right.style.cssText = `display:flex;gap:8px;align-items:center;`;

        const dbgBtn = document.createElement('button');
        dbgBtn.textContent = '🔧 策略详情';
        dbgBtn.style.cssText = `
            background:rgba(255,181,0,.2); border:1px solid rgba(255,181,0,.4);
            color:#ffb86c; border-radius:6px; padding:4px 12px;
            font-size:12px; cursor:pointer;
        `;
        dbgBtn.onclick = () => showStrategyPanel(result.strategies);
        right.appendChild(dbgBtn);

        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '🔄';
        refreshBtn.style.cssText = `
            background:rgba(102,126,234,.25); border:1px solid rgba(102,126,234,.4);
            color:#8be9fd; border-radius:6px; padding:4px 12px;
            font-size:12px; cursor:pointer;
        `;
        refreshBtn.onclick = () => { overlay.remove(); openPanel(); };
        right.appendChild(refreshBtn);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `background:none;border:none;color:#6272a4;font-size:22px;cursor:pointer;`;
        closeBtn.onclick = () => overlay.remove();
        right.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(right);
        win.appendChild(header);

        // 主体
        const body = document.createElement('div');
        body.style.cssText = `padding: 16px 20px; overflow-y: auto; flex: 1;`;

        if (result?.error) {
            const err = document.createElement('div');
            err.style.cssText = `
                padding: 12px; background: rgba(255,85,85,.1);
                border: 1px solid rgba(255,85,85,.3); border-radius: 8px;
                color: #ff5555; font-size: 13px; margin-bottom: 12px;
            `;
            err.textContent = '❌ ' + result.error;
            body.appendChild(err);
        }

        if (all.length === 0) {
            const e = document.createElement('div');
            e.style.cssText = `color:#6272a4;padding:20px;text-align:center;`;
            e.textContent = '未发现任何扩展';
            body.appendChild(e);
        } else {
            all.forEach(ext => body.appendChild(buildExtCard(ext)));
        }

        win.appendChild(body);
        overlay.appendChild(win);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    function buildExtCard(ext) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: rgba(255,255,255,.03); border-radius: 8px;
            padding: 12px; margin-bottom: 10px;
            border-left: 3px solid ${(ext.url || ext.inlineSource) ? '#50fa7b' : '#6272a4'};
        `;

        const title = document.createElement('div');
        title.style.cssText = `display:flex;justify-content:space-between;align-items:center;gap:8px;`;

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `font-weight:600;color:#f8f8f2;font-size:14px;word-break:break-all;`;
        nameSpan.textContent = ext.name;

        const badgeRow = document.createElement('div');
        badgeRow.style.cssText = `display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;`;

        const loadBadge = document.createElement('span');
        loadBadge.style.cssText = `
            font-size:10px; padding:1px 8px; border-radius:10px;
            background:${ext.isLoaded ? 'rgba(80,250,123,.15)' : 'rgba(98,114,164,.15)'};
            color:${ext.isLoaded ? '#50fa7b' : '#6272a4'};
        `;
        loadBadge.textContent = ext.isLoaded ? '✅ 已加载' : '⏳ 未加载';
        badgeRow.appendChild(loadBadge);

        const srcBadge = document.createElement('span');
        srcBadge.style.cssText = `
            font-size:10px; padding:1px 8px; border-radius:10px;
            background:${(ext.url || ext.inlineSource) ? 'rgba(139,233,253,.15)' : 'rgba(255,85,85,.15)'};
            color:${(ext.url || ext.inlineSource) ? '#8be9fd' : '#ff5555'};
        `;
        srcBadge.textContent = ext.inlineSource ? '📎 内联' : (ext.url ? '🔗 URL' : '❌ 无源码');
        badgeRow.appendChild(srcBadge);

        title.appendChild(nameSpan);
        title.appendChild(badgeRow);
        card.appendChild(title);

        const knownDiv = document.createElement('div');
        knownDiv.style.cssText = `font-size:10px;color:#6272a4;margin-top:4px;`;
        knownDiv.textContent = '来源: ' + (ext.knownBy || []).join(', ');
        card.appendChild(knownDiv);

        if (ext.url) {
            const urlDiv = document.createElement('div');
            urlDiv.style.cssText = `
                font-size:11px;color:#8be9fd;word-break:break-all;
                margin-top:4px;font-family:monospace;line-height:1.4;
                background:rgba(0,0,0,.2);padding:4px 6px;border-radius:4px;
            `;
            urlDiv.textContent = ext.url;
            if (ext.urlSource) urlDiv.title = '来源: ' + ext.urlSource;
            card.appendChild(urlDiv);
        }

        if (ext.inlineSource) {
            const preview = document.createElement('div');
            preview.style.cssText = `
                font-size:10px;color:#6272a4;margin-top:4px;
                background:rgba(0,0,0,.2);padding:4px 6px;border-radius:4px;
                max-height:60px;overflow:hidden;font-family:monospace;
            `;
            preview.textContent = ext.inlineSource.slice(0, 200) +
                (ext.inlineSource.length > 200 ? '...' : '');
            card.appendChild(preview);
        }

        const btnRow = document.createElement('div');
        btnRow.style.cssText = `margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;`;

        if (ext.url || ext.inlineSource) {
            btnRow.appendChild(makeBtn('🔎 查看源码', '#8be9fd', async btn => {
                btn.textContent = '⏳ 加载中...'; btn.disabled = true;
                const code = await fetchExtensionCode(ext);
                btn.textContent = '🔎 查看源码'; btn.disabled = false;
                if (code == null) { alert('❌ 下载失败'); return; }
                showCodeModal(ext.name, code);
            }));

            btnRow.appendChild(makeBtn('📋 复制', '#50fa7b', async btn => {
                btn.textContent = '⏳...'; btn.disabled = true;
                const code = await fetchExtensionCode(ext);
                btn.textContent = '📋 复制'; btn.disabled = false;
                if (code == null) { alert('❌ 下载失败'); return; }
                try { GM_setClipboard(code); } catch (e) { alert('复制失败'); return; }
                btn.textContent = '✅ 已复制';
                setTimeout(() => btn.textContent = '📋 复制', 1500);
            }));

            btnRow.appendChild(makeBtn('⬇️ 下载', '#f1fa8c', async btn => {
                btn.textContent = '⏳...'; btn.disabled = true;
                const code = await fetchExtensionCode(ext);
                btn.textContent = '⬇️ 下载'; btn.disabled = false;
                if (code == null) { alert('❌ 下载失败'); return; }
                const blob = new Blob([code], { type: 'application/javascript' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${ext.name}.js`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
                btn.textContent = '✅ 完成';
                setTimeout(() => btn.textContent = '⬇️ 下载', 1500);
            }));
        } else {
            btnRow.appendChild(makeBtn('✏️ 手动填 URL', '#ffb86c', () => {
                const url = prompt('输入该扩展的 JS URL:', '');
                if (!url) return;
                ext.url = url;
                ext.urlSource = 'manual';
                ext.knownBy = [...(ext.knownBy || []), 'manual'];
                const parent = card.parentElement;
                const newCard = buildExtCard(ext);
                parent.replaceChild(newCard, card);
            }));
        }

        card.appendChild(btnRow);
        return card;
    }

    function makeBtn(text, color, onClick) {
        const b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = `
            padding: 4px 12px; background: rgba(255,255,255,.05);
            border: 1px solid ${color}55; border-radius: 4px;
            color: ${color}; cursor: pointer; font-size: 12px;
            transition: background .15s;
        `;
        b.onmouseenter = () => b.style.background = `${color}22`;
        b.onmouseleave = () => b.style.background = 'rgba(255,255,255,.05)';
        b.onclick = () => onClick(b);
        return b;
    }

    function showCodeModal(name, code) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,.8);
            z-index: 2147483647; display: flex; align-items: center;
            justify-content: center; backdrop-filter: blur(4px);
        `;

        const win = document.createElement('div');
        win.style.cssText = `
            background: #1a1a2e; border-radius: 16px; width: 85%;
            max-width: 950px; max-height: 88vh; display: flex;
            flex-direction: column; border: 2px solid #8be9fd;
            box-shadow: 0 20px 60px rgba(0,0,0,.9); color: #eee;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding:14px 20px;display:flex;justify-content:space-between;
            align-items:center;border-bottom:1px solid rgba(255,255,255,.1);
            flex-shrink:0;
        `;

        const title = document.createElement('span');
        title.style.cssText = `color:#8be9fd;font-weight:600;font-size:15px;word-break:break-all;`;
        title.textContent = `🔎 ${name} (${code.length} 字符)`;

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = `display:flex;gap:8px;align-items:center;flex-shrink:0;`;

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 复制全部';
        copyBtn.style.cssText = `
            background:rgba(80,250,123,.15); border:1px solid rgba(80,250,123,.3);
            color:#50fa7b; border-radius:6px; padding:4px 12px;
            font-size:12px; cursor:pointer;
        `;
        copyBtn.onclick = () => {
            try { GM_setClipboard(code); copyBtn.textContent = '✅ 已复制'; }
            catch (e) { copyBtn.textContent = '❌ 失败'; }
            setTimeout(() => copyBtn.textContent = '📋 复制全部', 1500);
        };
        btnGroup.appendChild(copyBtn);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `background:none;border:none;color:#6272a4;font-size:22px;cursor:pointer;`;
        closeBtn.onclick = () => overlay.remove();
        btnGroup.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(btnGroup);
        win.appendChild(header);

        const pre = document.createElement('pre');
        pre.style.cssText = `
            flex:1; margin:0; padding:16px; overflow:auto;
            font-family: 'Courier New', monospace; font-size:12px;
            line-height:1.6; color:#f8f8f2; background:rgba(0,0,0,.3);
            white-space:pre-wrap; word-break:break-all;
        `;
        pre.textContent = code;
        win.appendChild(pre);

        overlay.appendChild(win);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    function showStrategyPanel(strategies) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,.8);
            z-index: 2147483647; display: flex; align-items: center;
            justify-content: center; backdrop-filter: blur(4px);
        `;

        const win = document.createElement('div');
        win.style.cssText = `
            background: #1a1a2e; border-radius: 16px; width: 85%;
            max-width: 900px; max-height: 88vh; display: flex;
            flex-direction: column; border: 2px solid #ffb86c;
            box-shadow: 0 20px 60px rgba(0,0,0,.9); color: #eee;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding:14px 20px;display:flex;justify-content:space-between;
            align-items:center;border-bottom:1px solid rgba(255,255,255,.1);
            flex-shrink:0;
        `;

        const title = document.createElement('span');
        title.style.cssText = `color:#ffb86c;font-weight:600;font-size:15px;`;
        title.textContent = '🔧 策略详情（每路独立收集到的内容）';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `background:none;border:none;color:#6272a4;font-size:22px;cursor:pointer;`;
        closeBtn.onclick = () => overlay.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);
        win.appendChild(header);

        const body = document.createElement('div');
        body.style.cssText = `padding:16px 20px;overflow-y:auto;flex:1;font-size:12px;`;

        for (const [tag, list] of Object.entries(strategies || {})) {
            const sec = document.createElement('div');
            sec.style.cssText = `margin-bottom:16px;`;

            const secTitle = document.createElement('div');
            secTitle.style.cssText = `
                color:#8be9fd;font-weight:600;font-size:13px;
                margin-bottom:6px;padding-bottom:4px;
                border-bottom:1px solid rgba(255,255,255,.08);
            `;
            secTitle.textContent = `${tag} (${Array.isArray(list) ? list.length : 0} 条)`;
            sec.appendChild(secTitle);

            if (!Array.isArray(list) || list.length === 0) {
                const e = document.createElement('div');
                e.style.cssText = `color:#6272a4;font-size:11px;`;
                e.textContent = '(空)';
                sec.appendChild(e);
            } else {
                list.forEach(item => {
                    const row = document.createElement('div');
                    row.style.cssText = `
                        color:#f8f8f2;font-size:11px;font-family:monospace;
                        padding:2px 0;word-break:break-all;
                    `;
                    if (typeof item === 'string') {
                        row.textContent = item;
                    } else if (item.url) {
                        row.textContent = (item.name ? item.name + ' → ' : '') + item.url;
                    } else if (item.name) {
                        row.textContent = item.name +
                            (item.source ? ' (' + item.source.length + ' 字符)' : '');
                    } else {
                        row.textContent = JSON.stringify(item).slice(0, 200);
                    }
                    sec.appendChild(row);
                });
            }

            body.appendChild(sec);
        }

        win.appendChild(body);
        overlay.appendChild(win);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    function boot() {
        if (document.body) createBall();
        else {
            const ob = new MutationObserver(() => {
                if (document.body) { ob.disconnect(); createBall(); }
            });
            ob.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    boot();

    const api = {
        version: '5.0.0',
        getVM,
        extractAll,
        fetchExtensionCode,
        HITS,
        strategies: () => ({
            customInfo:     [...HITS.customInfo.values()],
            officialInfo:   [...HITS.officialInfo.values()],
            gandiServices:  [...HITS.gandiServices.values()],
            loadedNames:    [...HITS.loadedNames],
            opcodeNames:    [...HITS.opcodeNames],
            network_js:     [...HITS.network_js.values()],
            network_worker: [...HITS.network_worker.values()],
            performance:    [...HITS.performance.values()],
            loadExtURL:     [...HITS.loadExtURL.values()],
            evalSources:    [...HITS.evalSources.values()].map(e => ({ name: e.name, length: e.source.length }))
        }),
        collect: async () => {
            const vm = await getVM();
            if (!vm) return null;
            hookExtensionManager(vm);
            collectFromPerformance();
            collectFromExtensionManager(vm);
            collectFromTargets(vm);
            return api.strategies();
        },
        link: (extName, url) => {
            HITS.loadExtURL.set(url, { url, tag: 'manual-link' });
            console.log('已关联:', extName, '→', url);
        },
        reset: () => {
            vmInstance = null;
            vmSearching = false;
            vmWaiters = [];
            hooked = false;
            Object.values(HITS).forEach(b => {
                if (b instanceof Map) b.clear();
                else if (b instanceof Set) b.clear();
            });
            setVMStatus('idle');
        }
    };

    try { unsafeWindow.__CCWExtract = api; }
    catch (e) { window.__CCWExtract = api; }

    log('已加载 v5.0.0');
})();