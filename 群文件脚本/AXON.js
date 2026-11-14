// ==UserScript==
// @name         AXON
// @namespace    https://www.ccw.site/
// @version      3.5.0
// @description  开发者向悬浮球（分区UI）：登录态/全局对象/最近API/WebSocket/性能/扩展积木操作/未知扩展发布/一键发布扩展(真实登记)/按作者查作品/变量监视器/病毒检测器/数据库检测器 + 工具(前缀JSON·列表快捷操作)/飞书机器人推送/系统(快照库·回收站·清空记忆)/插件系统
// @author       you
// @match        https://www.ccw.site/*
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      community-web.ccw.site
// @connect      bfs-web.ccw.site
// @connect      m.ccw.site
// @connect      zhishi.oss-cn-beijing.aliyuncs.com
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    /* ==========================================================================
     * 0. 工具 + vm 陷阱（最先安装，编辑器初始化时必中）
     * ========================================================================== */
    const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const $ = (sel, root = document) => root.querySelector(sel);

    function safeGet(fn, fallback = '—') {
        try { const v = fn(); return (v === undefined || v === null || v === '') ? fallback : v; }
        catch (e) { return '—'; }
    }

    function fmtBytes(n) {
        if (!isFinite(n)) return '—';
        const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
        while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
        return n.toFixed(2) + ' ' + u[i];
    }

    function truncate(s, n = 80) {
        s = String(s);
        return s.length > n ? s.slice(0, n) + '…' : s;
    }

    // —— vm 陷阱：劫持 Function.prototype.bind，等 vm 自己撞上来 ——
    let trappedVM = null;
    let trapHit = false;
    function isRealVM(o) {
        return !!(o && typeof o === 'object'
            && o.runtime && typeof o.runtime === 'object'
            && (typeof o.loadProject === 'function' || !!o.extensionManager || typeof o.start === 'function'));
    }
    try {
        const origBind = Function.prototype.bind;
        let resolveTrap;
        W.__ccw_vm_trap = new Promise(r => { resolveTrap = r; });
        Function.prototype.bind = function (o, ...rest) {
            if (!trapHit && o && typeof o === 'object'
                && Object.prototype.hasOwnProperty.call(o, 'editingTarget')
                && Object.prototype.hasOwnProperty.call(o, 'runtime')
                && isRealVM(o)) {
                trapHit = true;
                trappedVM = o;
                Function.prototype.bind = origBind; // 命中即还原
                resolveTrap(o);
            }
            return origBind.call(this, o, ...rest);
        };
    } catch (e) {}

    /* ==========================================================================
     * 1. 网络拦截（最迟 API 调用，供面板显示）
     * ========================================================================== */

    const EXT_QUERY_PREFIX = 'https://bfs-web.ccw.site/extensions/';

    function allowUnknownEnabled() {
        return GM_getValue('ccw_fb_allow_unknown', true);
    }

    function getManualWildExt() {
        const t = GM_getValue('ccw_fb_wild_ext', {});
        return (t && typeof t === 'object') ? t : {};
    }

    function getWildExtTable() {
        const table = Object.assign({}, getManualWildExt());
        try {
            const vm = (typeof findVM === 'function') ? findVM() : null;
            const info = vm && vm.extensionManager && vm.extensionManager._customExtensionInfo;
            if (info && typeof info === 'object') {
                for (const id in info) {
                    const u = info[id] && info[id].url;
                    if (u && !table[id]) table[id] = u;
                }
            }
        } catch (e) {}
        try {
            const wild = W.gandi && W.gandi.wildExtensions;
            if (wild && typeof wild === 'object') {
                for (const id in wild) {
                    const v = wild[id];
                    const u = (v && v.url) || (typeof v === 'string' ? v : null);
                    if (u && !table[id]) table[id] = u;
                }
            }
        } catch (e) {}
        return table;
    }

    function matchExtQuery(url) {
        if (typeof url !== 'string' || !url.startsWith(EXT_QUERY_PREFIX)) return null;
        const id = url.slice(EXT_QUERY_PREFIX.length).split(/[?#/]/)[0];
        if (!id || id === 'submit') return null; // submit 是匿名接口，不能伪造
        return id;
    }

    function fakeExtDetailJSON(extId, url) {
        return JSON.stringify({
            code: '200', msg: null, status: 200,
            body: {
                description: '此扩展为安全扩展 (由油猴放行)',
                name: extId,
                publisher: { nickname: 'developer' }, publisherId: 1,
                stats: {
                    averageRating: 5,
                    mostApprovedReviews: [{ commenter: { accountOid: 1, name: 'developer' }, content: '扩展已通过安全审核' }],
                    reviewTags: [{ count: 1, tag: '安全' }],
                },
                versions: url ? [{ assetUri: url, version: 'wild-allowed' }] : [{ version: 'wild-allowed' }],
            },
        });
    }

    // —— 作品数据嗅探：拦截加载作品 JSON 时抓 wildExtensions/extensionURLs/extensions ——
    const sniffedExt = Object.create(null);
    function harvestExtUrls(txt) {
        let obj;
        try { obj = JSON.parse(txt); } catch (e) { return; }
        let hits = 0;
        (function walk(o, depth) {
            if (!o || typeof o !== 'object' || depth > 12 || hits > 300) return;
            if (Array.isArray(o)) { o.forEach(v => walk(v, depth + 1)); return; }
            for (const k in o) {
                const v = o[k];
                if (k === 'wildExtensions' && v && typeof v === 'object') {
                    for (const id in v) {
                        const u = (v[id] && v[id].url) || (typeof v[id] === 'string' ? v[id] : '');
                        if (!(id in sniffedExt)) { sniffedExt[id] = u || ''; if (u) hits++; }
                        else if (u && !sniffedExt[id]) { sniffedExt[id] = u; hits++; }
                    }
                } else if (k === 'extensionURLs' && v && typeof v === 'object') {
                    for (const id in v) if (typeof v[id] === 'string' && v[id] && !sniffedExt[id]) { sniffedExt[id] = v[id]; hits++; }
                } else if (k === 'extensions' && Array.isArray(v)) {
                    v.forEach(id => { if (typeof id === 'string' && !(id in sniffedExt)) sniffedExt[id] = ''; });
                } else walk(v, depth + 1);
            }
        })(obj, 0);
    }

    function lookupWild(id) {
        const t = getWildExtTable();
        if (t[id]) return t[id];
        if (id in sniffedExt) return sniffedExt[id] || null;
        return undefined;
    }

    /* ==========================================================================
     * 1.5 MD5 / HMAC-MD5（自测通过标准向量）+ WebCrypto 助手
     * ========================================================================== */
    function md5core(input) {
        function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
        function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
        function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
        function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
        function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
        function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
        const n = input.length, words = [];
        for (let i = 0; i < n; i++) words[i >> 2] = (words[i >> 2] || 0) | (input[i] << ((i % 4) * 8));
        const bitLen = n * 8;
        words[bitLen >> 5] = (words[bitLen >> 5] || 0) | (0x80 << (bitLen % 32));
        const tail = (((bitLen + 64) >>> 9) << 4) + 14;
        while (words.length < tail + 1) words.push(0);
        words[tail] = bitLen;
        let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
        for (let i = 0; i < words.length; i += 16) {
            const oa = a, ob = b, oc = c, od = d;
            a = ff(a, b, c, d, words[i] | 0, 7, -680876936); d = ff(d, a, b, c, words[i + 1] | 0, 12, -389564586); c = ff(c, d, a, b, words[i + 2] | 0, 17, 606105819); b = ff(b, c, d, a, words[i + 3] | 0, 22, -1044525330);
            a = ff(a, b, c, d, words[i + 4] | 0, 7, -176418897); d = ff(d, a, b, c, words[i + 5] | 0, 12, 1200080426); c = ff(c, d, a, b, words[i + 6] | 0, 17, -1473231341); b = ff(b, c, d, a, words[i + 7] | 0, 22, -45705983);
            a = ff(a, b, c, d, words[i + 8] | 0, 7, 1770035416); d = ff(d, a, b, c, words[i + 9] | 0, 12, -1958414417); c = ff(c, d, a, b, words[i + 10] | 0, 17, -42063); b = ff(b, c, d, a, words[i + 11] | 0, 22, -1990404162);
            a = ff(a, b, c, d, words[i + 12] | 0, 7, 1804603682); d = ff(d, a, b, c, words[i + 13] | 0, 12, -40341101); c = ff(c, d, a, b, words[i + 14] | 0, 17, -1502002290); b = ff(b, c, d, a, words[i + 15] | 0, 22, 1236535329);
            a = gg(a, b, c, d, words[i + 1] | 0, 5, -165796510); d = gg(d, a, b, c, words[i + 6] | 0, 9, -1069501632); c = gg(c, d, a, b, words[i + 11] | 0, 14, 643717713); b = gg(b, c, d, a, words[i] | 0, 20, -373897302);
            a = gg(a, b, c, d, words[i + 5] | 0, 5, -701558691); d = gg(d, a, b, c, words[i + 10] | 0, 9, 38016083); c = gg(c, d, a, b, words[i + 15] | 0, 14, -660478335); b = gg(b, c, d, a, words[i + 4] | 0, 20, -405537848);
            a = gg(a, b, c, d, words[i + 9] | 0, 5, 568446438); d = gg(d, a, b, c, words[i + 14] | 0, 9, -1019803690); c = gg(c, d, a, b, words[i + 3] | 0, 14, -187363961); b = gg(b, c, d, a, words[i + 8] | 0, 20, 1163531501);
            a = gg(a, b, c, d, words[i + 13] | 0, 5, -1444681467); d = gg(d, a, b, c, words[i + 2] | 0, 9, -51403784); c = gg(c, d, a, b, words[i + 7] | 0, 14, 1735328473); b = gg(b, c, d, a, words[i + 12] | 0, 20, -1926607734);
            a = hh(a, b, c, d, words[i + 5] | 0, 4, -378558); d = hh(d, a, b, c, words[i + 8] | 0, 11, -2022574463); c = hh(c, d, a, b, words[i + 11] | 0, 16, 1839030562); b = hh(b, c, d, a, words[i + 14] | 0, 23, -35309556);
            a = hh(a, b, c, d, words[i + 1] | 0, 4, -1530992060); d = hh(d, a, b, c, words[i + 4] | 0, 11, 1272893353); c = hh(c, d, a, b, words[i + 7] | 0, 16, -155497632); b = hh(b, c, d, a, words[i + 10] | 0, 23, -1094730640);
            a = hh(a, b, c, d, words[i + 13] | 0, 4, 681279174); d = hh(d, a, b, c, words[i] | 0, 11, -358537222); c = hh(c, d, a, b, words[i + 3] | 0, 16, -722521979); b = hh(b, c, d, a, words[i + 6] | 0, 23, 76029189);
            a = hh(a, b, c, d, words[i + 9] | 0, 4, -640364487); d = hh(d, a, b, c, words[i + 12] | 0, 11, -421815835); c = hh(c, d, a, b, words[i + 15] | 0, 16, 530742520); b = hh(b, c, d, a, words[i + 2] | 0, 23, -995338651);
            a = ii(a, b, c, d, words[i] | 0, 6, -198630844); d = ii(d, a, b, c, words[i + 7] | 0, 10, 1126891415); c = ii(c, d, a, b, words[i + 14] | 0, 15, -1416354905); b = ii(b, c, d, a, words[i + 5] | 0, 21, -57434055);
            a = ii(a, b, c, d, words[i + 12] | 0, 6, 1700485571); d = ii(d, a, b, c, words[i + 3] | 0, 10, -1894986606); c = ii(c, d, a, b, words[i + 10] | 0, 15, -1051523); b = ii(b, c, d, a, words[i + 1] | 0, 21, -2054922799);
            a = ii(a, b, c, d, words[i + 8] | 0, 6, 1873313359); d = ii(d, a, b, c, words[i + 15] | 0, 10, -30611744); c = ii(c, d, a, b, words[i + 6] | 0, 15, -1560198380); b = ii(b, c, d, a, words[i + 13] | 0, 21, 1309151649);
            a = ii(a, b, c, d, words[i + 4] | 0, 6, -145523070); d = ii(d, a, b, c, words[i + 11] | 0, 10, -1120210379); c = ii(c, d, a, b, words[i + 2] | 0, 15, 718787259); b = ii(b, c, d, a, words[i + 9] | 0, 21, -343485551);
            a = add32(a, oa); b = add32(b, ob); c = add32(c, oc); d = add32(d, od);
        }
        return [a, b, c, d];
    }
    function wordsToBytes(ws) {
        const out = new Uint8Array(16);
        ws.forEach((w, i) => { out[i * 4] = w & 0xff; out[i * 4 + 1] = (w >>> 8) & 0xff; out[i * 4 + 2] = (w >>> 16) & 0xff; out[i * 4 + 3] = (w >>> 24) & 0xff; });
        return out;
    }
    function bytesToHex(bs) { return [...bs].map(b => b.toString(16).padStart(2, '0')).join(''); }
    function md5Hex(bytes) { return bytesToHex(wordsToBytes(md5core(bytes))); }
    function hmacMd5Hex(keyStr, msgStr) {
        const enc = new TextEncoder();
        let key = enc.encode(keyStr);
        if (key.length > 64) key = wordsToBytes(md5core(key));
        const k = new Uint8Array(64); k.set(key);
        const ipad = new Uint8Array(64), opad = new Uint8Array(64);
        for (let i = 0; i < 64; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
        const msg = enc.encode(msgStr);
        const cat = (x, y) => { const r = new Uint8Array(x.length + y.length); r.set(x); r.set(y, x.length); return r; };
        const inner = wordsToBytes(md5core(cat(ipad, msg)));
        return bytesToHex(wordsToBytes(md5core(cat(opad, inner))));
    }
    const subtleCrypto = () => ((typeof crypto !== 'undefined' && crypto.subtle) ? crypto : W.crypto);
    async function hmacSha1Base64(keyStr, msgStr) {
        const enc = new TextEncoder();
        const key = await subtleCrypto().subtle.importKey('raw', enc.encode(keyStr), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
        const sig = await subtleCrypto().subtle.sign('HMAC', key, enc.encode(msgStr));
        return btoa(String.fromCharCode(...new Uint8Array(sig)));
    }
    async function aesCbcDecryptUtf8(b64, keyBytes, ivBytes) {
        const raw = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
        const key = await subtleCrypto().subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
        const plain = await subtleCrypto().subtle.decrypt({ name: 'AES-CBC', iv: ivBytes }, key, raw);
        return new TextDecoder().decode(plain);
    }

    /* ==========================================================================
     * 1.6 CCW 签名请求 / OSS 直传 / 一键发布扩展（逆向自 fast-publish 扩展）
     * ========================================================================== */
    function gmxhr(opts) {
        return new Promise((resolve, reject) => GM_xmlhttpRequest(Object.assign({}, opts, {
            onload: r => resolve(r),
            onerror: e => reject(new Error('网络错误')),
            ontimeout: () => reject(new Error('请求超时')),
        })));
    }
    function readCookie(name) {
        return ('; ' + document.cookie).split('; ' + name + '=').pop().split(';').shift() || '';
    }
    async function ccwFetch(url, bodyStr = '{}') {
        const r = await gmxhr({ method: 'POST', url, headers: { 'content-type': 'application/json' }, data: bodyStr });
        return JSON.parse(r.responseText);
    }
    let _secretKey = null, _ossCreds = null;
    async function getSecretKey() {
        if (_secretKey) return _secretKey;
        const j = await ccwFetch('https://community-web.ccw.site/health/check');
        const arr = j.body || [];
        _secretKey = arr.map(o => { const t = o.traceId || ''; return t[parseInt(t[0], 16) + 1] || ''; }).reverse().join('');
        return _secretKey;
    }
    async function abFetch(url, bodyObj) {
        const t = JSON.stringify(bodyObj), ts = Date.now();
        const sig = hmacMd5Hex(await getSecretKey(), 'ccw' + t + ts);
        const r = await gmxhr({ method: 'POST', url, headers: { a: sig, b: String(ts), 'content-type': 'application/json' }, data: t });
        const j = JSON.parse(r.responseText);
        if (200 == j.status) return j.body;
        throw j;
    }
    async function getOSSCreds() {
        if (_ossCreds) return _ossCreds;
        const uid = readCookie('cookie-user-id');
        if (uid.length < 16) throw new Error('未登录或 cookie-user-id 缺失');
        const j = await ccwFetch('https://community-web.ccw.site/ccw-main/status');
        const enc = new TextEncoder();
        const plain = await aesCbcDecryptUtf8(j.body.data, enc.encode(uid.slice(uid.length - 16)), enc.encode(uid.slice(0, 16)));
        _ossCreds = JSON.parse(plain); // {accessKeyId, accessKeySecret, securityToken}
        return _ossCreds;
    }
    async function ossPut(path, bytes, contentType) {
        const c = await getOSSCreds();
        const date = new Date().toUTCString();
        const stringToSign = 'PUT\n\n' + contentType + '\n' + date + '\n'
            + 'x-oss-security-token:' + c.securityToken + '\n' + '/zhishi/' + path;
        const sig = await hmacSha1Base64(c.accessKeySecret, stringToSign);
        const r = await gmxhr({
            method: 'PUT',
            url: 'https://zhishi.oss-cn-beijing.aliyuncs.com/' + path,
            headers: {
                Authorization: 'OSS ' + c.accessKeyId + ':' + sig,
                'x-oss-security-token': c.securityToken,
                Date: date,
                'Content-Type': contentType,
            },
            data: new Blob([bytes], { type: contentType }),
        });
        if (r.status >= 200 && r.status < 300) return;
        if (r.status === 409 && /FileAlreadyExists/.test(r.responseText || '')) return;
        throw new Error('OSS 上传失败 HTTP ' + r.status + ': ' + (r.responseText || '').slice(0, 200));
    }
    async function publishExtension(opts, log) {
        const { url, eid, name } = opts;
        const cover = opts.cover || '', description = opts.description || '', projectLink = opts.projectLink || '';
        log('检查扩展 id 可用性: ' + eid);
        const chk = await gmxhr({ method: 'GET', url: EXT_QUERY_PREFIX + eid });
        let st;
        try { st = JSON.parse(chk.responseText).status; } catch (e) { st = null; }
        if (3 != st) throw new Error('扩展 id 已被占用: ' + eid + '（status=' + st + '）');
        log('拉取扩展 JS: ' + url);
        const resp = await gmxhr({ method: 'GET', url });
        if (resp.status < 200 || resp.status >= 300) throw new Error('拉取 JS 失败 HTTP ' + resp.status);
        const lines = String(resp.responseText).split('\n');
        let rewrote = false;
        for (let p = 0; p < lines.length; p++) {
            if (lines[p].includes('const extid=')) { lines[p] = 'const extid=' + JSON.stringify(eid) + '; // 扩展iD，可以修改'; rewrote = true; break; }
        }
        if (!rewrote) log('警告: 未找到 const extid= 行，按原样上传');
        const bytes = new TextEncoder().encode(lines.join('\n'));
        const md5 = md5Hex(bytes);
        const path = 'user_projects_assets/' + md5 + '.js';
        log('上传 OSS: ' + path + '（MD5 署名，篡改校验可过）');
        await ossPut(path, bytes, 'application/javascript');
        const assetUri = 'https://m.ccw.site/' + path;
        const creCache = GM_getValue('ccw_fb_pub_creations', {}) || {};
        let creationId = opts.creationId || creCache[eid];
        if (creationId) {
            log('复用 EXTERNSION 作品: ' + creationId + (opts.creationId ? '（手动填入，跳过创建）' : '（缓存）'));
            creCache[eid] = creationId;
            GM_setValue('ccw_fb_pub_creations', creCache);
        } else {
            log('创建 EXTERNSION 作品...');
            const created = await abFetch('https://community-web.ccw.site/creation/create', {
                type: 'ORIGINAL', title: name, latestProjectLink: projectLink,
                screenMode: 'LANDSCAPE', artifactType: 'EXTERNSION',
                sourceOpenLevel: 'SOURCE_READABLE', latestCoverLink: cover,
            });
            creationId = created.oid;
            creCache[eid] = creationId;
            GM_setValue('ccw_fb_pub_creations', creCache);
        }
        log('登记扩展中心 extensions/submit ...');
        await abFetch('https://bfs-web.ccw.site/extensions/submit', {
            icon: 'test', assetUri, creationId, cover, eid,
            version: '1.0.0', name, description,
            readme: opts.readme || '', changelog: opts.changelog || '',
            previews: opts.preview ? [opts.preview] : [], projectLink,
        });
        delete creCache[eid];
        GM_setValue('ccw_fb_pub_creations', creCache);
        return { eid, assetUri, creationId };
    }

    const recentCalls = [];
    const MAX_CALLS = 30;
    function pushCall(entry) {
        recentCalls.unshift(entry);
        if (recentCalls.length > MAX_CALLS) recentCalls.pop();
    }

    const origFetch = W.fetch;
    if (origFetch) {
        W.fetch = function (input, init) {
            const url = typeof input === 'string' ? input : (input && input.url);
            const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
            const qid = allowUnknownEnabled() ? matchExtQuery(url) : null;
            if (qid) {
                const u = lookupWild(qid);
                if (u !== undefined) {
                    const fake = fakeExtDetailJSON(qid, u);
                    pushCall({ kind: 'fetch', method, url: String(url), status: '伪造', ms: 0, time: new Date().toLocaleTimeString('zh-CN', { hour12: false }) });
                    console.log('[未知扩展W 已允许(fetch):', qid);
                    return Promise.resolve(new W.Response(fake, { status: 200, headers: { 'Content-Type': 'application/json' } }));
                }
            }
            const t0 = performance.now();
            return origFetch.apply(this, arguments).then(resp => {
                try {
                    pushCall({
                        kind: 'fetch', method, url: String(url),
                        status: resp.status,
                        ms: Math.round(performance.now() - t0),
                        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                    });
                    if (/ccw\.site|xiguacity\.cn/.test(String(url))) {
                        resp.clone().text().then(txt => {
                            if (txt && (txt.indexOf('wildExtensions') >= 0 || txt.indexOf('extensionURLs') >= 0)) {
                                harvestExtUrls(txt);
                            }
                        }).catch(() => {});
                    }
                } catch (e) {}
                return resp;
            }).catch(err => {
                pushCall({ kind: 'fetch', method, url: String(url), status: 'ERR', ms: Math.round(performance.now() - t0), time: new Date().toLocaleTimeString('zh-CN', { hour12: false }) });
                throw err;
            });
        };
    }

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
        this.__ccw_method = String(method || 'GET').toUpperCase();
        this.__ccw_url = String(url);
        const qid = allowUnknownEnabled() ? matchExtQuery(url) : null;
        if (qid) {
            const u = lookupWild(qid);
            if (u !== undefined) {
                const xhr = this;
                const fake = fakeExtDetailJSON(qid, u);
                const origSendOnce = origSend;
                xhr.send = function () {
                    try {
                        Object.defineProperty(xhr, 'responseText', { get: () => fake, configurable: true });
                        Object.defineProperty(xhr, 'response', { get: () => fake, configurable: true });
                    } catch (e) {}
                    console.log('[未知扩展W 已允许(xhr):', qid);
                    return origSendOnce.apply(xhr, arguments);
                };
            }
        }
        return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
        const t0 = performance.now();
        const xhr = this;
        function done() {
            pushCall({
                kind: 'xhr',
                method: xhr.__ccw_method || '?',
                url: xhr.__ccw_url || '',
                status: xhr.status || 'ERR',
                ms: Math.round(performance.now() - t0),
                time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            });
        }
        this.addEventListener('loadend', done);
        this.addEventListener('error', done);
        this.addEventListener('abort', done);
        return origSend.apply(this, arguments);
    };

    const sockets = [];
    const OrigWS = W.WebSocket;
    if (OrigWS) {
        W.WebSocket = function (url, protocols) {
            const ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
            const rec = { url: String(url), state: 'connecting', time: new Date().toLocaleTimeString('zh-CN', { hour12: false }) };
            sockets.unshift(rec);
            if (sockets.length > 10) sockets.pop();
            ws.addEventListener('open', () => rec.state = 'open');
            ws.addEventListener('close', () => rec.state = 'closed');
            ws.addEventListener('error', () => rec.state = 'error');
            return ws;
        };
        W.WebSocket.prototype = OrigWS.prototype;
        W.WebSocket.CONNECTING = OrigWS.CONNECTING;
        W.WebSocket.OPEN = OrigWS.OPEN;
        W.WebSocket.CLOSING = OrigWS.CLOSING;
        W.WebSocket.CLOSED = OrigWS.CLOSED;
    }

    /* ==========================================================================
     * 2. 样式（分区块：window / tabs / card / glass-btn / badge）
     * ========================================================================== */
    const CSS = `
    #ccw-fb-root, #ccw-fb-root * { box-sizing: border-box; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif; }
    #ccw-fb-root ::-webkit-scrollbar { width: 4px; }
    #ccw-fb-root ::-webkit-scrollbar-track { background: transparent; }
    #ccw-fb-root ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }
    #ccw-fb-root ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.2); }

    #ccw-fb-ball {
        position: fixed; right: 22px; bottom: 22px; width: 56px; height: 56px;
        border-radius: 50%; cursor: pointer; z-index: 2147483646;
        background: linear-gradient(135deg, rgba(124,140,255,.85), rgba(139,92,246,.85));
        backdrop-filter: blur(14px) saturate(1.4); -webkit-backdrop-filter: blur(14px) saturate(1.4);
        border: 1px solid rgba(255,255,255,.35);
        box-shadow: 0 8px 24px rgba(124,140,255,.35), inset 0 1px 0 rgba(255,255,255,.4);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 26px; user-select: none;
        transition: transform .18s ease, box-shadow .18s ease;
    }
    #ccw-fb-ball:hover { transform: scale(1.08); box-shadow: 0 12px 32px rgba(124,140,255,.5), inset 0 1px 0 rgba(255,255,255,.5); }
    #ccw-fb-ball.dragging { transition: none; cursor: grabbing; }

    #ccw-fb-panel {
        position: fixed; right: 90px; bottom: 22px; width: 560px; max-height: 80vh;
        z-index: 2147483646; display: none; flex-direction: column;
        border-radius: 20px; overflow: hidden;
        background: rgba(16,18,27,.75);
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255,255,255,.08);
        box-shadow: 0 25px 50px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05);
        color: #eee;
    }
    #ccw-fb-panel.open { display: flex; animation: ccw-fb-appear .3s cubic-bezier(.34,1.56,.64,1) forwards; }
    @keyframes ccw-fb-appear { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }

    #ccw-fb-panel .hd {
        padding: 14px 20px; display: flex; align-items: center; justify-content: space-between;
        background: rgba(255,255,255,.04); border-bottom: 1px solid rgba(255,255,255,.06);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        flex-shrink: 0;
    }
    #ccw-fb-panel .hd .title {
        color: #f0f0f0; font-weight: 600; letter-spacing: .3px; font-size: 15px;
        display: flex; align-items: center; gap: 10px;
    }
    #ccw-fb-panel .hd .title .ver { font-size: 11px; opacity: .5; font-weight: 400; }
    #ccw-fb-panel .hd .title .author {
        font-size: 11px; background: rgba(255,255,255,.08); padding: 2px 10px;
        border-radius: 12px; font-weight: 400; opacity: .6;
    }
    #ccw-fb-panel .hd .right { display: flex; align-items: center; gap: 6px; }
    #ccw-fb-panel .hd .right button {
        background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
        color: rgba(255,255,255,.6); border-radius: 6px; font-size: 12px;
        padding: 4px 10px; cursor: pointer; transition: all .2s; font-family: inherit;
    }
    #ccw-fb-panel .hd .right button:hover { background: rgba(124,140,255,.15); border-color: rgba(124,140,255,.25); color: #fff; }
    #ccw-fb-panel .hd .right button.close:hover { background: rgba(255,85,85,.2); border-color: rgba(255,85,85,.3); }

    #ccw-fb-panel .tabs {
        display: flex; gap: 4px; padding: 12px 20px 12px;
        border-bottom: 1px solid rgba(255,255,255,.06);
        flex-wrap: wrap; flex-shrink: 0;
    }
    #ccw-fb-panel .tabs .tab {
        padding: 8px 18px; background: transparent; color: rgba(255,255,255,.5);
        border: 1px solid transparent; border-radius: 10px; cursor: pointer;
        font-size: 13px; font-weight: 500; letter-spacing: .3px; font-family: inherit;
        transition: all .25s cubic-bezier(.34,1.56,.64,1);
    }
    #ccw-fb-panel .tabs .tab:hover { background: rgba(255,255,255,.06); transform: scale(1.04); color: rgba(255,255,255,.8); }
    #ccw-fb-panel .tabs .tab.active {
        background: rgba(124,140,255,.15); color: #fff;
        border-color: rgba(124,140,255,.25); box-shadow: 0 0 20px rgba(124,140,255,.05);
    }
    #ccw-fb-panel .tabs .tab:active { transform: scale(.95); }

    #ccw-fb-panel .subtags { display: flex; gap: 6px; margin: 2px 0 10px; flex-wrap: wrap; }
    #ccw-fb-panel .stab {
        padding: 5px 14px; font-size: 12px; border-radius: 8px; cursor: pointer; font-family: inherit;
        border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); color: rgba(255,255,255,.55);
        transition: all .18s cubic-bezier(.34,1.56,.64,1);
    }
    #ccw-fb-panel .stab:hover { color: #fff; border-color: rgba(124,140,255,.3); transform: scale(1.04); }
    #ccw-fb-panel .stab.active {
        background: rgba(124,140,255,.2); border-color: rgba(124,140,255,.35);
        color: #8be9fd; box-shadow: 0 0 14px rgba(124,140,255,.08);
    }
    #ccw-fb-panel .stab:active { transform: scale(.95); }
    #ccw-fb-panel .spage { display: none; }
    #ccw-fb-panel .spage.active { display: block; }
    #ccw-fb-panel textarea.ginput { width: 100%; resize: vertical; line-height: 1.5; }
    #ccw-fb-panel input[type=file].ginput { padding: 6px 8px; cursor: pointer; }

    #ccw-fb-panel .bd { padding: 16px 20px; overflow-y: auto; flex: 1; background: rgba(0,0,0,.15); font-size: 12px; line-height: 1.6; }
    #ccw-fb-panel .page { display: none; animation: ccw-fb-pop .3s cubic-bezier(.34,1.56,.64,1) forwards; }
    #ccw-fb-panel .page.active { display: block; }
    @keyframes ccw-fb-pop { from { opacity: .4; transform: scale(.98); } to { opacity: 1; transform: scale(1); } }

    #ccw-fb-panel .card {
        background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05);
        border-radius: 12px; padding: 14px 16px; margin-bottom: 12px;
        transition: all .2s ease;
    }
    #ccw-fb-panel .card:hover {
        background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.08);
        transform: translateY(-1px); box-shadow: 0 8px 25px rgba(0,0,0,.15);
    }
    #ccw-fb-panel .card > .ct {
        font-size: 11px; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: 1px;
        margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
    }
    #ccw-fb-panel .card > .ct::before { content: ''; width: 3px; height: 12px; border-radius: 2px; background: linear-gradient(180deg,#7c8cff,#a78bfa); }

    #ccw-fb-panel .kv { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; border-bottom: 1px dashed rgba(255,255,255,.06); }
    #ccw-fb-panel .kv:last-child { border-bottom: none; }
    #ccw-fb-panel .kv .k { color: rgba(255,255,255,.4); flex-shrink: 0; }
    #ccw-fb-panel .kv .v { color: #f0f0f0; word-break: break-all; text-align: right; font-family: ui-monospace,Consolas,monospace; }
    #ccw-fb-panel .kv .v.ok { color: #50fa7b; }
    #ccw-fb-panel .kv .v.bad { color: #ff5555; }
    #ccw-fb-panel .kv .v.warn { color: #ffb86c; }
    #ccw-fb-panel .kv .v.accent { color: #7c8cff; }

    #ccw-fb-panel .badge {
        display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;
        background: rgba(124,140,255,.12); color: #7c8cff; border: 1px solid rgba(124,140,255,.1); margin: 2px;
    }
    #ccw-fb-panel .badge.success { background: rgba(80,250,123,.12); color: #50fa7b; border-color: rgba(80,250,123,.1); }
    #ccw-fb-panel .badge.warning { background: rgba(255,184,108,.12); color: #ffb86c; border-color: rgba(255,184,108,.1); }
    #ccw-fb-panel .badge.danger { background: rgba(255,85,85,.12); color: #ff5555; border-color: rgba(255,85,85,.1); }

    #ccw-fb-panel .gbtn {
        background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
        border-radius: 10px; padding: 8px 16px; color: #e2e8f0; cursor: pointer;
        transition: all .2s cubic-bezier(.34,1.56,.64,1); font-family: inherit;
        font-size: 13px; font-weight: 500;
    }
    #ccw-fb-panel .gbtn:hover { background: rgba(124,140,255,.15); border-color: rgba(124,140,255,.25); transform: scale(1.04); box-shadow: 0 4px 12px rgba(124,140,255,.15); }
    #ccw-fb-panel .gbtn:active { transform: scale(.95); }
    #ccw-fb-panel .gbtn.primary { background: rgba(124,140,255,.2); border-color: rgba(124,140,255,.3); color: #8be9fd; }
    #ccw-fb-panel .gbtn.success { background: rgba(80,250,123,.12); border-color: rgba(80,250,123,.2); color: #50fa7b; }
    #ccw-fb-panel .gbtn.danger { background: rgba(255,85,85,.12); border-color: rgba(255,85,85,.2); color: #ff5555; }
    #ccw-fb-panel .gbtn.warning { background: rgba(255,184,108,.12); border-color: rgba(255,184,108,.2); color: #ffb86c; }
    #ccw-fb-panel .gbtn.sm { padding: 5px 12px; font-size: 12px; border-radius: 8px; }

    #ccw-fb-panel .ginput {
        background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.06);
        border-radius: 8px; color: #e2e8f0; padding: 6px 12px; font-size: 13px;
        transition: all .2s ease; outline: none; font-family: inherit;
        width: 100%; box-sizing: border-box;
    }
    #ccw-fb-panel .ginput:focus { border-color: rgba(124,140,255,.4); box-shadow: 0 0 0 3px rgba(124,140,255,.08); }
    #ccw-fb-panel .ginput::placeholder { color: rgba(255,255,255,.25); }
    #ccw-fb-panel .ginput.mono { font-family: ui-monospace,Consolas,monospace; font-size: 12px; }
    #ccw-fb-panel select.ginput { -webkit-appearance: none; appearance: none; cursor: pointer; padding-right: 22px;
        background-image: linear-gradient(45deg,transparent 50%,rgba(255,255,255,.4) 50%), linear-gradient(135deg,rgba(255,255,255,.4) 50%,transparent 50%);
        background-position: calc(100% - 13px) 47%, calc(100% - 8px) 47%; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
    #ccw-fb-panel select.ginput option { background: #1a1a2e; color: #e2e8f0; }

    #ccw-fb-panel .row { display: flex; gap: 6px; margin-bottom: 8px; }
    #ccw-fb-panel .row:last-child { margin-bottom: 0; }
    #ccw-fb-panel .divider { border: none; border-top: 1px solid rgba(255,255,255,.04); margin: 12px 0; }
    #ccw-fb-panel .hint { color: rgba(255,255,255,.4); font-size: 11px; }
    #ccw-fb-panel .status-line {
        font-size: 11px; color: rgba(255,255,255,.4); min-height: 16px; margin-top: 6px;
        font-family: ui-monospace,Consolas,monospace; word-break: break-all;
    }

    #ccw-fb-panel .call {
        font-family: ui-monospace,Consolas,monospace; font-size: 11px;
        padding: 5px 8px; margin-bottom: 3px; border-radius: 8px;
        background: rgba(255,255,255,.03); border-left: 2px solid #7c8cff;
        display: flex; gap: 6px; align-items: center; transition: all .2s;
    }
    #ccw-fb-panel .call:hover { background: rgba(255,255,255,.06); }
    #ccw-fb-panel .call.write { border-left-color: #ff5555; }
    #ccw-fb-panel .call .m { font-weight: bold; flex-shrink: 0; min-width: 46px; }
    #ccw-fb-panel .call .u { flex: 1; min-width: 0; word-break: break-all; color: rgba(255,255,255,.7); }
    #ccw-fb-panel .call .s { flex-shrink: 0; font-size: 10px; color: rgba(255,255,255,.4); }
    #ccw-fb-panel .call .s.ok { color: #50fa7b; }
    #ccw-fb-panel .call .s.err { color: #ff5555; }
    #ccw-fb-panel .call .t { flex-shrink: 0; font-size: 10px; color: rgba(255,255,255,.3); }

    #ccw-fb-panel .litem {
        transition: all .2s cubic-bezier(.34,1.56,.64,1); cursor: pointer;
        border-radius: 8px; padding: 6px 10px;
        display: flex; justify-content: space-between; gap: 8px; align-items: center;
    }
    #ccw-fb-panel .litem:hover { background: rgba(255,255,255,.04); transform: translateX(4px); }
    #ccw-fb-panel .litem .id { color: #8be9fd; font-family: ui-monospace,Consolas,monospace; font-size: 12px; }
    #ccw-fb-panel .litem .n { color: rgba(255,255,255,.4); flex-shrink: 0; font-size: 11px; }

    #ccw-fb-panel .work-item {
        padding: 8px 10px; border-radius: 8px; margin-bottom: 4px;
        background: rgba(255,255,255,.03); display: flex; gap: 8px; align-items: center;
        transition: all .2s;
    }
    #ccw-fb-panel .work-item:hover { background: rgba(255,255,255,.06); }
    #ccw-fb-panel .work-item .wt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #f0f0f0; text-decoration: none; }
    #ccw-fb-panel .work-item .wt:hover { color: #7c8cff; }

    #ccw-fb-panel .foot {
        padding: 8px 20px; border-top: 1px solid rgba(255,255,255,.06);
        font-size: 11px; color: rgba(255,255,255,.3);
        display: flex; justify-content: space-between; flex-shrink: 0;
    }
    #ccw-fb-panel .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #50fa7b; margin-right: 6px; box-shadow: 0 0 8px #50fa7b; }

    .ccw-fb-toast {
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: rgba(16,18,27,.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,.08); border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,.4); padding: 10px 24px;
        color: #f0f0f0; font-size: 14px; z-index: 2147483647;
        animation: ccw-fb-toast-in .3s ease-out;
    }
    @keyframes ccw-fb-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    `;

    /* ==========================================================================
     * 3. DOM（分区块布局：头部 / 标签 / 分区块 / 底部）
     * ========================================================================== */
    const TABS = [
        { id: 'overview', name: '概览' },
        { id: 'network', name: '网络' },
        { id: 'ext', name: '扩展' },
        { id: 'dev', name: '开发者工具' },
    ];
    let activeTab = 'overview';
    let renderVarListFn = null;

    function buildDOM() {
        if (document.getElementById('ccw-fb-root')) return;
        if (!document.documentElement) return;

        const style = document.createElement('style');
        style.id = 'ccw-fb-style';
        style.textContent = CSS;
        (document.head || document.documentElement).appendChild(style);

        const root = document.createElement('div');
        root.id = 'ccw-fb-root';
        root.innerHTML = `
            <div id="ccw-fb-ball" title="CCW 开发者数据">◉</div>
            <div id="ccw-fb-panel">
                <div class="hd">
                    <span class="title">◉ CCW 开发者数据 <span class="ver">v3.5.0</span></span>
                    <div class="right">
                        <button id="ccw-fb-copy">复制本区</button>
                        <button id="ccw-fb-refresh">刷新</button>
                        <button id="ccw-fb-close" class="close">×</button>
                    </div>
                </div>
                <div class="tabs" id="ccw-fb-tabs">
                    ${TABS.map(t => `<button class="tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${t.name}</button>`).join('')}
                </div>
                <div class="bd">
                    <div class="page ${activeTab === 'overview' ? 'active' : ''}" data-page="overview" id="ccw-fb-page-overview"></div>
                    <div class="page ${activeTab === 'network' ? 'active' : ''}" data-page="network" id="ccw-fb-page-network"></div>
                    <div class="page ${activeTab === 'ext' ? 'active' : ''}" data-page="ext">
                        <div class="card">
                            <div class="ct">VM 状态</div>
                            <div id="ccw-fb-vmstate"></div>
                        </div>
                        <div class="card">
                            <div class="ct">扩展积木操作</div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-ext-id" placeholder="扩展 ID（如 pen、music、自定义 id）">
                                <button class="gbtn sm" id="ccw-fb-ext-list">列出扩展</button>
                            </div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-ext-url" placeholder="替换为 URL（可选，m.ccw.site/.../xxx.js）">
                            </div>
                            <div class="row">
                                <button class="gbtn danger sm" id="ccw-fb-ext-del">删除该扩展所有积木</button>
                                <button class="gbtn success sm" id="ccw-fb-ext-replace">删除并替换</button>
                            </div>
                            <div class="status-line" id="ccw-fb-ext-status"></div>
                            <div id="ccw-fb-ext-listbox" style="max-height:150px;overflow-y:auto;margin-top:6px;display:none;"></div>
                        </div>
                        <div class="card">
                            <div class="ct">未知扩展发布（绕过注册校验）</div>
                            <div class="hint" style="margin-bottom:8px;">发布时 CCW 会查 bfs-web 扩展中心校验每个扩展；开启后对表内扩展伪造注册信息，免审直发。</div>
                            <div class="row">
                                <button class="gbtn sm" id="ccw-fb-wild-toggle"></button>
                                <button class="gbtn sm" id="ccw-fb-wild-refresh">刷新表</button>
                            </div>
                            <div id="ccw-fb-wild-table" style="max-height:130px;overflow-y:auto;margin-bottom:8px;"></div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-wild-id" placeholder="扩展 ID">
                                <input class="ginput mono" id="ccw-fb-wild-url" placeholder="扩展 JS 的 URL">
                            </div>
                            <div class="row">
                                <button class="gbtn primary sm" id="ccw-fb-wild-add">手动添加映射</button>
                            </div>
                            <div class="status-line" id="ccw-fb-wild-status"></div>
                        </div>
                        <div class="card">
                            <div class="ct">一键发布扩展（真实登记 · 免审）</div>
                            <div class="hint" style="margin-bottom:8px;">把扩展 JS 真实提交到 CCW 扩展中心（走匿名 submit 接口，免审核立即可用）。上传文件名按内容 MD5 署名，通过运行时防篡改校验；发布后把新地址加入作品即可正常发布+运行。</div>
                            <div class="row">
                                <button class="gbtn sm" id="ccw-fb-pub-scan">从当前作品抓取扩展（自动提取 JS 地址和 ID）</button>
                            </div>
                            <div id="ccw-fb-pub-scanbox" style="max-height:130px;overflow-y:auto;margin-bottom:8px;display:none;"></div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-pub-url" placeholder="扩展 JS 地址（http(s)://...）">
                            </div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-pub-eid" placeholder="扩展 ID（英文数字，如 myext_v2）">
                                <button class="gbtn sm" id="ccw-fb-pub-rand" style="flex-shrink:0;">随机ID</button>
                            </div>
                            <div class="row">
                                <input class="ginput" id="ccw-fb-pub-name" placeholder="扩展名称">
                            </div>
                            <div class="row">
                                <input class="ginput" id="ccw-fb-pub-desc" placeholder="简介（可选）">
                            </div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-pub-cover" placeholder="封面图 URL（可选）">
                            </div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-pub-link" placeholder="关联作品链接（可选）">
                            </div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-pub-creid" placeholder="creationId（可选：填入则跳过创建。可去我的作品页找之前失败留下的扩展作品 oid）">
                            </div>
                            <div class="row">
                                <button class="gbtn primary sm" id="ccw-fb-pub-go">开始登记发布</button>
                                <button class="gbtn success sm" id="ccw-fb-pub-inject" disabled>提交新地址到当前作品</button>
                            </div>
                            <div class="status-line" id="ccw-fb-pub-status"></div>
                            <div id="ccw-fb-pub-log" class="mono" style="max-height:140px;overflow-y:auto;margin-top:6px;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-all;display:none;"></div>
                        </div>
                        <div class="card">
                            <div class="ct">扩展中心查询（官方登记信息）</div>
                            <div class="hint" style="margin-bottom:8px;">登记前必查：eid 是否被占用、已登记扩展的版本/assetUri/安全标签。安全标签决定运行时是否强制确认。</div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-xq-eid" placeholder="扩展 ID">
                                <button class="gbtn primary sm" id="ccw-fb-xq-go" style="flex-shrink:0;">查询</button>
                            </div>
                            <div class="status-line" id="ccw-fb-xq-status"></div>
                            <div id="ccw-fb-xq-result" class="mono" style="max-height:180px;overflow-y:auto;margin-top:6px;font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-all;display:none;"></div>
                        </div>
                        <div class="card">
                            <div class="ct">作品扩展 URL 替换</div>
                            <div class="hint" style="margin-bottom:8px;">登记成功后用：把当前作品里的旧扩展地址替换成新 assetUri（运行时校验要求与登记版本完全一致），替换后保存作品生效。</div>
                            <div class="row">
                                <button class="gbtn sm" id="ccw-fb-xr-scan">抓取当前作品扩展引用</button>
                                <button class="gbtn sm primary" id="ccw-fb-xr-apply" disabled>应用全部替换</button>
                            </div>
                            <div id="ccw-fb-xr-list" style="max-height:150px;overflow-y:auto;margin-bottom:6px;display:none;"></div>
                            <div class="status-line" id="ccw-fb-xr-status"></div>
                        </div>
                    </div>
                    <div class="page ${activeTab === 'dev' ? 'active' : ''}" data-page="dev">
                        <div class="card">
                            <div class="ct">按作者查作品</div>
                            <div class="hint" style="margin-bottom:8px;">输入作者 OID → 拉取其公开作品列表（community-web API）</div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-works-oid" placeholder="作者 OID">
                                <button class="gbtn primary sm" id="ccw-fb-works-go" style="flex-shrink:0;">查询</button>
                                <button class="gbtn sm" id="ccw-fb-works-dlall" style="flex-shrink:0;" disabled>全部下载</button>
                            </div>
                            <div class="status-line" id="ccw-fb-works-status"></div>
                            <div id="ccw-fb-works-result" style="max-height:300px;overflow-y:auto;margin-top:6px;"></div>
                        </div>
                        <div class="card" id="ccw-fb-dev-var-card">
                            <div class="ct">变量监视器（实时读 vm，1s 刷新）</div>
                            <div class="row">
                                <input class="ginput mono" id="ccw-fb-var-filter" placeholder="按名称 / 值过滤…">
                                <button class="gbtn sm" id="ccw-fb-var-refresh" style="flex-shrink:0;">刷新</button>
                            </div>
                            <div class="row" style="align-items:center;">
                                <label class="hint" style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="ccw-fb-var-changed"> 仅看变化的</label>
                                <select class="ginput mono" id="ccw-fb-var-scope" title="按目标作用域过滤" style="width:auto;flex:1;padding:4px 8px;font-size:11px;"><option value="">全部目标</option></select>
                                <span class="hint" id="ccw-fb-var-count"></span>
                            </div>
                            <div class="row" style="align-items:center;">
                                <button class="gbtn sm" id="ccw-fb-var-new-toggle">＋ 新建变量 / 列表</button>
                                <button class="gbtn sm success" id="ccw-fb-var-snap-save">保存快照</button>
                                <button class="gbtn sm warning" id="ccw-fb-var-snap-load">还原快照</button>
                            </div>
                            <div id="ccw-fb-var-new" style="display:none;background:rgba(255,255,255,.03);border-radius:8px;padding:8px;margin-bottom:8px;">
                                <div class="row"><input class="ginput mono" id="ccw-fb-var-new-name" placeholder="变量名称"></div>
                                <div class="row">
                                    <select class="ginput mono" id="ccw-fb-var-new-type" style="width:auto;flex:0 0 auto;padding:4px 8px;font-size:11px;"><option value="scalar">变量</option><option value="list">列表</option></select>
                                    <select class="ginput mono" id="ccw-fb-var-new-target" style="flex:1;padding:4px 8px;font-size:11px;"></select>
                                </div>
                                <div class="row"><input class="ginput mono" id="ccw-fb-var-new-value" placeholder="初始值（列表：JSON 数组或逗号分隔）"></div>
                                <div class="row"><button class="gbtn sm primary" id="ccw-fb-var-new-go">创建</button></div>
                            </div>
                            <div class="status-line" id="ccw-fb-var-status"></div>
                            <div id="ccw-fb-var-list" style="max-height:240px;overflow-y:auto;margin-top:6px;"></div>
                        </div>
                        <div class="card">
                            <div class="ct">病毒检测器（静态扫描作品积木）</div>
                            <div class="hint" style="margin-bottom:8px;">扫描当前作品全部积木：任意 JS 执行、读取 cookie/存储（剐号）、窃取密码字段、外联非官方域名、未注册扩展前缀。</div>
                            <div class="row">
                                <button class="gbtn danger sm" id="ccw-fb-virus-go">开始扫描</button>
                            </div>
                            <div class="status-line" id="ccw-fb-virus-status"></div>
                            <div id="ccw-fb-virus-list" style="max-height:200px;overflow-y:auto;margin-top:6px;"></div>
                        </div>
                        <div class="card" id="ccw-fb-dev-db-card">
                            <div class="ct">当前数据库检测器</div>
                            <div class="hint" style="margin-bottom:8px;">检测云数据扩展加载状态、作品云变量、数据库积木用量与连接对象。</div>
                            <div class="row">
                                <button class="gbtn sm primary" id="ccw-fb-db-go">检测</button>
                                <button class="gbtn sm" id="ccw-fb-db-recapture">重新捕获</button>
                                <button class="gbtn sm primary" id="ccw-fb-db-scope-works" data-db-scope="works">作品</button>
                                <button class="gbtn sm" id="ccw-fb-db-scope-user" data-db-scope="user">用户</button>
                            </div>
                            <div class="status-line" id="ccw-fb-db-status"></div>
                            <div id="ccw-fb-db-result" style="max-height:220px;overflow-y:auto;margin-top:6px;font-size:11px;"></div>
                        </div>
                        <div class="subtags" id="ccw-fb-dev-subtabs">
                            <button class="stab active" data-stab="tools">工具</button>
                            <button class="stab" data-stab="feishu">飞书</button>
                            <button class="stab" data-stab="system">系统</button>
                            <button class="stab" data-stab="plugins">插件</button>
                        </div>
                        <div class="spage active" data-spage="tools">
                            <div class="card" id="ccw-fb-dev-batch-card">
                                <div class="ct">便捷操作 · 同变量批量增/删</div>
                                <div class="hint" style="margin-bottom:8px;">对同一名称的变量跨目标批量取值 / 新建 / 删除。</div>
                                <div class="row"><input class="ginput mono" id="ccw-fb-batch-name" placeholder="变量名称"></div>
                                <div class="row">
                                    <select class="ginput mono" id="ccw-fb-batch-scope" style="flex:1;padding:4px 8px;font-size:11px;"><option value="">全部目标</option></select>
                                    <select class="ginput mono" id="ccw-fb-batch-type" style="width:auto;flex:0 0 auto;padding:4px 8px;font-size:11px;">
                                        <option value="all">变量 + 列表</option>
                                        <option value="scalar">仅变量</option>
                                        <option value="list">仅列表</option>
                                    </select>
                                </div>
                                <div class="row"><input class="ginput mono" id="ccw-fb-batch-value" placeholder="默认值（批量设为值用）"></div>
                                <div class="row" style="align-items:center;">
                                    <label class="hint" style="display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="ccw-fb-batch-fill"> 该指定目标缺失同名变量，允许批量新建补缺</label>
                                </div>
                                <div class="row">
                                    <button class="gbtn sm primary" id="ccw-fb-batch-set">批量设为值</button>
                                    <button class="gbtn sm success" id="ccw-fb-batch-create">批量新建补缺</button>
                                    <button class="gbtn sm danger" id="ccw-fb-batch-del">批量删除</button>
                                </div>
                                <div class="status-line" id="ccw-fb-batch-status"></div>
                            </div>
                            <div class="card">
                                <div class="ct">前缀 JSON 序列化 ⇄ 恢复</div>
                                <div class="hint" style="margin-bottom:8px;">把前缀开头的变量 / 列表整体导出为 JSON 存档码，之后可一键恢复（目标消失时回退到舞台，孤儿变量自动新建）。</div>
                                <div class="row">
                                    <input class="ginput mono" id="ccw-fb-prefix-pfx" placeholder="变量名前缀（如 存档_、关卡1_）">
                                    <button class="gbtn sm primary" id="ccw-fb-prefix-exp" style="flex-shrink:0;">导出</button>
                                    <button class="gbtn sm success" id="ccw-fb-prefix-res" style="flex-shrink:0;">恢复</button>
                                </div>
                                <div class="row"><textarea class="ginput mono" id="ccw-fb-prefix-json" rows="4" placeholder="导出的 JSON 存档码（恢复时读取此处）"></textarea></div>
                                <div class="status-line" id="ccw-fb-prefix-status"></div>
                            </div>
                            <div class="card">
                                <div class="ct">列表快捷操作（清空 / 排序 / 复制）</div>
                                <div class="hint" style="margin-bottom:8px;">对任意列表就地执行快捷操作，或将源列表整体复制到另一列表。</div>
                                <div class="row"><select class="ginput mono" id="ccw-fb-lq-src" style="padding:4px 8px;font-size:11px;"></select></div>
                                <div class="row">
                                    <button class="gbtn sm" data-lq-op="clear">清空</button>
                                    <button class="gbtn sm" data-lq-op="reverse">反转</button>
                                    <button class="gbtn sm" data-lq-op="asc">升序</button>
                                    <button class="gbtn sm" data-lq-op="desc">降序</button>
                                    <button class="gbtn sm" data-lq-op="shuffle">随机</button>
                                    <button class="gbtn sm" data-lq-op="unique">去重</button>
                                </div>
                                <div class="hint" style="margin:6px 0 4px;">复制源列表到另一列表：</div>
                                <div class="row">
                                    <select class="ginput mono" id="ccw-fb-lq-dst" style="flex:1;padding:4px 8px;font-size:11px;"></select>
                                    <button class="gbtn sm success" id="ccw-fb-lq-copy" style="flex-shrink:0;">复制</button>
                                </div>
                                <div class="status-line" id="ccw-fb-lq-status"></div>
                            </div>
                        </div>
                        <div class="spage" data-spage="feishu">
                            <div class="card">
                                <div class="ct">飞书机器人推送</div>
                                <div class="hint" style="margin-bottom:8px;">填自定机器人 webhook（https://open.feishu.cn/open-apis/bot/v2/hook/…），机器人保存在本地；可先扫描变量 / 列表生成消息再发送。</div>
                                <div class="row">
                                    <select class="ginput mono" id="ccw-fb-fl-bot" style="flex:1;padding:4px 8px;font-size:11px;"></select>
                                    <button class="gbtn sm danger" id="ccw-fb-fl-del" style="flex-shrink:0;">删除选中</button>
                                </div>
                                <div class="row">
                                    <input class="ginput" id="ccw-fb-fl-name" placeholder="备注名" style="width:110px;flex:0 0 auto;">
                                    <input class="ginput mono" id="ccw-fb-fl-url" placeholder="webhook 完整地址（open.feishu.cn/open-apis/bot/v2/hook/…）" style="flex:1;">
                                    <button class="gbtn sm primary" id="ccw-fb-fl-add" style="flex-shrink:0;">添加</button>
                                </div>
                                <div class="row">
                                    <button class="gbtn sm" id="ccw-fb-fl-scan">扫描变量 / 列表</button>
                                    <button class="gbtn sm success" id="ccw-fb-fl-send">发送到选中机器人</button>
                                </div>
                                <div class="row"><textarea class="ginput mono" id="ccw-fb-fl-msg" rows="5" placeholder="消息内容（以飞书 text 消息发送）"></textarea></div>
                                <div class="status-line" id="ccw-fb-fl-status"></div>
                            </div>
                        </div>
                        <div class="spage" data-spage="system">
                            <div class="card">
                                <div class="ct">快照标记 · 还原系统（本地持久化）</div>
                                <div class="hint" style="margin-bottom:8px;">命名快照保存到本地（GM 存储），与变量监视器的内存快照互相独立；可还原 / 导出 JSON / 粘贴导入。</div>
                                <div class="row">
                                    <input class="ginput" id="ccw-fb-sy-snap-name" placeholder="快照名称（如 关卡1 前）" style="flex:1;">
                                    <button class="gbtn sm primary" id="ccw-fb-sy-snap-cap" style="flex-shrink:0;">摘取当前</button>
                                </div>
                                <div id="ccw-fb-sy-snap-list" style="max-height:160px;overflow-y:auto;margin-bottom:8px;"></div>
                                <div class="row"><textarea class="ginput mono" id="ccw-fb-sy-snap-json" rows="4" placeholder="点「导出」写入此处；也可粘贴快照 JSON 后点「导入」"></textarea></div>
                                <div class="row"><button class="gbtn sm success" id="ccw-fb-sy-snap-imp">导入</button></div>
                                <div class="status-line" id="ccw-fb-sy-snap-status"></div>
                            </div>
                            <div class="card">
                                <div class="ct">回收站（删除的变量自动进回收站）</div>
                                <div class="hint" style="margin-bottom:8px;">在变量监视器 / 批量操作中删除的变量先进入回收站（保留最近 100 条），可一键还原到原目标（目标消失时回退到舞台）。</div>
                                <div class="row">
                                    <button class="gbtn sm" id="ccw-fb-sy-rb-refresh">刷新</button>
                                    <button class="gbtn sm danger" id="ccw-fb-sy-rb-clear">清空回收站</button>
                                </div>
                                <div id="ccw-fb-sy-rb-list" style="max-height:180px;overflow-y:auto;margin-top:6px;"></div>
                                <div class="status-line" id="ccw-fb-sy-rb-status"></div>
                            </div>
                            <div class="card">
                                <div class="ct">清除全部本地记录</div>
                                <div class="hint" style="margin-bottom:8px;">清除本脚本保存的全部本地数据：绕过映射、发布缓存、机器人、快照库、回收站、插件等（面板位置一并重置）。不影响作品与云端。</div>
                                <div class="row"><button class="gbtn sm danger" id="ccw-fb-sy-wipe">清空并重置</button></div>
                                <div class="status-line" id="ccw-fb-sy-wipe-status"></div>
                            </div>
                        </div>
                        <div class="spage" data-spage="plugins">
                            <div class="card">
                                <div class="ct">插件管理（ext 类型）</div>
                                <div class="hint" style="margin-bottom:8px;">上传通过插件注册接口定义的（{type:'ext', id, name, html, css, code(ctx)}）的插件 JS；同源代码指约覆盖升级，停用后界面消失。patch 类型暂不支持。</div>
                                <div class="row">
                                    <input type="file" class="ginput" id="ccw-fb-plug-file" multiple accept=".js,text/javascript" style="flex:1;font-size:11px;">
                                    <button class="gbtn sm" id="ccw-fb-plug-reload" style="flex-shrink:0;">重新加载</button>
                                </div>
                                <div id="ccw-fb-plug-list" style="max-height:150px;overflow-y:auto;margin:6px 0;"></div>
                                <div class="status-line" id="ccw-fb-plug-status"></div>
                            </div>
                            <div id="ccw-fb-plug-area"></div>
                        </div>
                    </div>
                </div>
                <div class="foot">
                    <span><span class="dot"></span>1s 实时刷新（概览/网络）</span>
                    <span id="ccw-fb-time"></span>
                </div>
            </div>
        `;
        document.documentElement.appendChild(root);

        wireEvents();
    }

    /* ==========================================================================
     * 4. 扩展积木操作（VM 交互）
     * ========================================================================== */
    function findVM() {
        if (isRealVM(trappedVM)) return trappedVM;
        const candidates = [W.vm, W.scratchVM, W.gandi?.vm, W.GandiIDE?.vm, W.__gandi_vm__];
        for (const c of candidates) { if (isRealVM(c)) return c; }
        return null;
    }

    function vmSource() {
        if (isRealVM(trappedVM)) return 'bind 陷阱';
        if (isRealVM(W.vm)) return 'window.vm';
        if (isRealVM(W.scratchVM)) return 'window.scratchVM';
        if (isRealVM(W.gandi?.vm)) return 'gandi.vm';
        if (isRealVM(W.GandiIDE?.vm)) return 'GandiIDE.vm';
        if (isRealVM(W.__gandi_vm__)) return '__gandi_vm__';
        return null;
    }

    function listExtensionsWithCount() {
        const vm = findVM();
        if (!vm) return { ok: false, reason: '未找到 vm（先在 Gandi 编辑器打开作品）' };
        if (!vm.runtime || !Array.isArray(vm.runtime.targets)) {
            return { ok: false, reason: 'vm.runtime.targets 不可用' };
        }

        const registered = new Set();
        const mgr = vm.extensionManager;
        try {
            if (mgr && mgr._loadedExtensions instanceof Map) {
                for (const k of mgr._loadedExtensions.keys()) registered.add(k);
            }
        } catch (e) {}

        const counts = Object.create(null);
        let total = 0;
        for (const target of vm.runtime.targets) {
            const blocks = target.blocks && target.blocks._blocks;
            if (!blocks) continue;
            for (const bid in blocks) {
                const op = blocks[bid] && blocks[bid].opcode;
                if (!op) continue;
                total++;
                const idx = op.indexOf('_');
                if (idx > 0) {
                    const extId = op.slice(0, idx);
                    counts[extId] = (counts[extId] || 0) + 1;
                }
            }
        }

        const all = new Set([...registered, ...Object.keys(counts)]);
        const rows = [...all].sort().map(id => ({
            id,
            count: counts[id] || 0,
            registered: registered.has(id),
        }));
        return { ok: true, rows, total };
    }

    function deleteBlocksByExtension(extId) {
        const vm = findVM();
        if (!vm) throw new Error('未找到 vm');
        if (!extId) throw new Error('扩展 ID 为空');

        let deleted = 0;
        const prefix = extId + '_';
        for (const target of vm.runtime.targets) {
            const blocks = target.blocks;
            if (!blocks || !blocks._blocks) continue;
            const toDelete = [];
            for (const bid in blocks._blocks) {
                const b = blocks._blocks[bid];
                if (b && b.opcode && b.opcode.startsWith(prefix)) {
                    toDelete.push(bid);
                }
            }
            for (const bid of toDelete) {
                try {
                    if (typeof blocks.deleteBlock === 'function') {
                        blocks.deleteBlock(bid);
                    } else {
                        delete blocks._blocks[bid];
                    }
                    deleted++;
                } catch (e) {
                    try { delete blocks._blocks[bid]; deleted++; } catch (_) {}
                }
            }
        }

        try { vm.refreshWorkspace && vm.refreshWorkspace(); } catch (e) {}
        try { vm.emitTargetsUpdate && vm.emitTargetsUpdate(); } catch (e) {}
        try { vm.emitWorkspaceUpdate && vm.emitWorkspaceUpdate(); } catch (e) {}
        try { vm.runtime && vm.runtime.emitProjectChanged && vm.runtime.emitProjectChanged(); } catch (e) {}

        return deleted;
    }

    async function replaceExtension(extId, newUrl) {
        const vm = findVM();
        if (!vm) throw new Error('未找到 vm');
        if (!extId) throw new Error('扩展 ID 为空');
        if (!newUrl) throw new Error('替换 URL 为空');

        const deleted = deleteBlocksByExtension(extId);

        const mgr = vm.extensionManager;
        try {
            if (mgr) {
                if (mgr._loadedExtensions instanceof Map && mgr._loadedExtensions.has(extId)) {
                    mgr._loadedExtensions.delete(extId);
                }
                if (mgr._loadedExtensionsURLs instanceof Map && mgr._loadedExtensionsURLs.has(extId)) {
                    mgr._loadedExtensionsURLs.delete(extId);
                }
                if (mgr._loadedExtensionURLs instanceof Map && mgr._loadedExtensionURLs.has(extId)) {
                    mgr._loadedExtensionURLs.delete(extId);
                }
            }
        } catch (e) {}

        if (!mgr || typeof mgr.loadExtensionURL !== 'function') {
            throw new Error('vm.extensionManager.loadExtensionURL 不可用');
        }
        await mgr.loadExtensionURL(newUrl);

        try { vm.refreshWorkspace && vm.refreshWorkspace(); } catch (e) {}
        try { vm.emitTargetsUpdate && vm.emitTargetsUpdate(); } catch (e) {}
        try { vm.emitWorkspaceUpdate && vm.emitWorkspaceUpdate(); } catch (e) {}

        return { deleted, loaded: newUrl };
    }

    /* ==========================================================================
     * 4b. 按作者查作品（community-web API）
     * ========================================================================== */
    function fetchWorksPage(oid, page) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `https://community-web.ccw.site/creation/page_by_student?page=${page}&perPage=50&sortType=DESC`,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ page, perPage: 50, studentOids: [oid] }),
                onload: res => {
                    try { resolve(JSON.parse(res.responseText)); }
                    catch (e) { reject(new Error('响应解析失败')); }
                },
                onerror: () => reject(new Error('网络请求失败')),
                ontimeout: () => reject(new Error('请求超时')),
            });
        });
    }

    async function fetchAllWorks(oid) {
        let all = [], page = 1, totalPages = 1;
        do {
            const j = await fetchWorksPage(oid, page);
            if (String(j.code) !== '200') throw new Error(j.msg || '接口返回失败');
            all = all.concat((j.body && j.body.data) || []);
            totalPages = (j.body && j.body.totalPages) || 1;
            page++;
        } while (page <= totalPages && page <= 20);
        return all;
    }

    /* ==========================================================================
     * 4c. 开发者工具：变量采集 / 病毒扫描 / 数据库检测
     * ========================================================================== */
    function collectVariables() {
        const vm = findVM();
        if (!vm || !vm.runtime || !vm.runtime.targets) return null;
        const rows = [];
        for (const t of vm.runtime.targets) {
            if (!t || !t.variables) continue;
            const owner = t.isStage ? '舞台(全局)' : safeGet(() => t.getName(), t.id || '?');
            for (const varId in t.variables) {
                const v = t.variables[varId];
                if (!v) continue;
                rows.push({
                    targetId: t.id, varId,
                    name: v.name || varId,
                    value: v.value,
                    type: v.type || 'scalar',
                    isCloud: !!v.isCloud,
                    owner,
                });
            }
        }
        return rows;
    }

    function setVariableValue(row, raw) {
        const vm = findVM();
        if (!vm || !vm.runtime) return 'vm 未摘取';
        const t = (vm.runtime.targets || []).find(x => x && x.id === row.targetId);
        if (!t || !t.variables || !t.variables[row.varId]) return '目标变量不存在';
        const v = t.variables[row.varId];
        let val = raw;
        if (typeof v.value === 'number' && raw.trim() !== '' && !isNaN(Number(raw))) val = Number(raw);
        v.value = val; // 舞台监视器每帧自动刷新，无需额外通知
        return null;
    }

    function scanVirus() {
        const vm = findVM();
        if (!vm || !vm.runtime || !vm.runtime.targets) return { ok: false, reason: '未摘取 vm（打开作品编辑器后再试）' };
        const hits = [];
        const seenPrefix = Object.create(null);
        const builtinRe = /^(event|control|motion|looks|sound|data|sensing|operator|procedures|argument|text|pen|music|videoSensing|text2speech|translate|makeymakey|microbit|ev3|boost|wedo2|gdxfor|comment)_/;
        let totalBlocks = 0;
        const push = (level, op, sprite, reason) => hits.push({ level, op, sprite, reason });
        for (const t of vm.runtime.targets) {
            const b = t && t.blocks;
            if (!b || !b._blocks) continue;
            const owner = t.isStage ? '舞台' : safeGet(() => t.getName(), t.id || '?');
            for (const bid in b._blocks) {
                const blk = b._blocks[bid];
                if (!blk || !blk.opcode) continue;
                totalBlocks++;
                const op = blk.opcode;
                let blob = '';
                try { blob = JSON.stringify({ i: blk.inputs, f: blk.fields }); } catch (e) {}
                const lowOp = op.toLowerCase();
                const lowAll = (lowOp + ' ' + blob.toLowerCase());
                if (/javascript|jsfunc|execute_js|run_js|\beval_|\beval\b/.test(lowAll)) {
                    push('high', op, owner, '执行任意 JS 代码（可做任何事，含剐号）');
                }
                if (/document\.cookie|\bcookie\b|localstorage|sessionstorage/.test(lowAll)) {
                    push('high', op, owner, '读取 cookie / 本地存储（窃取账户登录态）');
                }
                if (/password|passwd|\btoken\b|账号|密码|登录态/.test(lowAll)) {
                    push('mid', op, owner, '涉及账号 / 密码 / token 内容');
                }
                const urls = blob.match(/https?:\\?\/\\?\/[^"\\s<]+/g) || [];
                for (const u0 of urls) {
                    const u = u0.replace(/\\\//g, '/');
                    if (!/(^|\.)ccw\.site|aliyuncs\.com|gandi|gandiide/.test(u)) {
                        push('mid', op, owner, '外联非官方域名: ' + truncate(u, 60));
                        break;
                    }
                }
                if (!builtinRe.test(op)) {
                    const prefix = op.split('_')[0];
                    if (!seenPrefix[prefix]) {
                        let loaded = false;
                        try { loaded = !!(vm.extensionManager && vm.extensionManager.isExtensionLoaded && vm.extensionManager.isExtensionLoaded(prefix)); } catch (e) {}
                        if (!loaded) {
                            try {
                                const ld = vm.extensionManager && vm.extensionManager._loadedExtensions;
                                if (ld) loaded = Object.keys(ld).some(id => id === prefix || id.indexOf(prefix) === 0);
                            } catch (e) {}
                        }
                        if (!loaded) {
                            seenPrefix[prefix] = true;
                            push('low', op, owner, '未注册扩展积木前缀: ' + prefix + '_*');
                        }
                    }
                }
            }
        }
        return { ok: true, hits, totalBlocks };
    }

    function detectDatabase() {
        const vm = findVM();
        if (!vm || !vm.runtime) return { ok: false, reason: '未摘取 vm（打开作品编辑器后再试）' };
        let loadedIds = [];
        try {
            const ld = vm.extensionManager && vm.extensionManager._loadedExtensions;
            if (ld) loadedIds = Object.keys(ld);
        } catch (e) {}
        const cloudExt = loadedIds.filter(id => /cloud|database|db/i.test(id));
        const rows = collectVariables() || [];
        const cloudVars = rows.filter(r => r.isCloud);
        const dbOps = Object.create(null);
        try {
            for (const t of vm.runtime.targets || []) {
                const b = t && t.blocks;
                if (!b || !b._blocks) continue;
                for (const bid in b._blocks) {
                    const op = (b._blocks[bid] && b._blocks[bid].opcode) || '';
                    if (/cloud|database/i.test(op)) dbOps[op] = (dbOps[op] || 0) + 1;
                }
            }
        } catch (e) {}
        const gdb = safeGet(() => {
            const g = W.gandi;
            if (!g) return null;
            return g.database || g.cloudDatabase || g.db || null;
        }, null);
        const gdbKeys = gdb ? Object.keys(gdb).slice(0, 8).join(', ') : '';
        const gdbState = gdb ? safeGet(() => gdb.connected ?? gdb.isConnected ?? gdb.status ?? (typeof gdb.isConnected === 'function' ? gdb.isConnected() : undefined), '—') : '—';
        const cloudIO = safeGet(() => !!vm.runtime.ioDevices?.cloud, false);
        return { ok: true, loadedIds, cloudExt, cloudVars, dbOps, gdb, gdbKeys, gdbState, cloudIO };
    }

    /* ==========================================================================
     * 4d. GM 本地存储动手（系统页快照/回收站 + 飞书机器人 + 插件共用）
     * ========================================================================== */
    const GKEY = {
        bots: 'ccw_fb_bots',
        snaps: 'ccw_fb_snaps',
        recycle: 'ccw_fb_recycle',
        plugins: 'ccw_fb_plugins',
    };
    const FB_ALL_KEYS = ['ccw_fb_allow_unknown', 'ccw_fb_wild_ext', 'ccw_fb_pub_creations', 'ccw_fb_pos',
        GKEY.bots, GKEY.snaps, GKEY.recycle, GKEY.plugins];
    function gSave(key, val) { GM_setValue(key, JSON.stringify(val)); }
    function gLoad(key, dft) {
        try {
            const raw = GM_getValue(key, null);
            if (raw == null) return dft;
            if (typeof raw !== 'string') return raw;
            const v = JSON.parse(raw);
            return (v === null || v === undefined) ? dft : v;
        } catch (e) { return dft; }
    }
    function strHash(s) {
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        return (h >>> 0).toString(36);
    }
    function rbLoad() { const a = gLoad(GKEY.recycle, []); return Array.isArray(a) ? a : []; }
    function rbPush(entry) {
        try {
            const a = rbLoad();
            a.push(Object.assign({ ts: Date.now() }, entry));
            gSave(GKEY.recycle, a.slice(-100));
        } catch (e) {}
    }
    const plugVarCbs = [];
    const plugStyleEls = [];

    /* ==========================================================================
     * 5. 事件（拖拽 / 标签切换 / 各分区交互）
     * ========================================================================== */
    let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;

    function toast(msg) {
        const t = document.createElement('div');
        t.className = 'ccw-fb-toast';
        t.textContent = msg;
        document.documentElement.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 1600);
        setTimeout(() => t.remove(), 2000);
    }

    function wireEvents() {
        const ball = $('#ccw-fb-ball');
        const panel = $('#ccw-fb-panel');

        const p = GM_getValue('ccw_fb_pos', null);
        if (p && typeof p.x === 'number' && typeof p.y === 'number') {
            ball.style.left = p.x + 'px'; ball.style.top = p.y + 'px';
            ball.style.right = 'auto'; ball.style.bottom = 'auto';
        }

        ball.addEventListener('pointerdown', e => {
            dragging = true; moved = false;
            ball.classList.add('dragging');
            const r = ball.getBoundingClientRect();
            sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
            ball.setPointerCapture(e.pointerId);
        });
        ball.addEventListener('pointermove', e => {
            if (!dragging) return;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
            const x = Math.max(0, Math.min(W.innerWidth - 56, ox + dx));
            const y = Math.max(0, Math.min(W.innerHeight - 56, oy + dy));
            ball.style.left = x + 'px'; ball.style.top = y + 'px';
            ball.style.right = 'auto'; ball.style.bottom = 'auto';
        });
        ball.addEventListener('pointerup', () => {
            if (!dragging) return;
            dragging = false;
            ball.classList.remove('dragging');
            const r = ball.getBoundingClientRect();
            GM_setValue('ccw_fb_pos', { x: r.left, y: r.top });
            if (!moved) togglePanel();
        });

        $('#ccw-fb-close').onclick = () => togglePanel(false);
        $('#ccw-fb-refresh').onclick = renderActive;
        $('#ccw-fb-copy').onclick = () => {
            const page = $(`#ccw-fb-panel .page[data-page="${activeTab}"]`);
            const text = page ? page.innerText : '';
            navigator.clipboard?.writeText(text).then(() => toast('已复制「' + TABS.find(t => t.id === activeTab).name + '」内容'));
        };

        $('#ccw-fb-tabs').addEventListener('click', e => {
            const btn = e.target.closest('.tab');
            if (!btn) return;
            activeTab = btn.dataset.tab;
            document.querySelectorAll('#ccw-fb-tabs .tab').forEach(t => t.classList.toggle('active', t === btn));
            document.querySelectorAll('#ccw-fb-panel .page').forEach(pg => pg.classList.toggle('active', pg.dataset.page === activeTab));
            renderActive();
        });

        /* ---------- 扩展积木操作 ---------- */
        const extStatus = (msg, color) => {
            const el = $('#ccw-fb-ext-status');
            el.textContent = msg;
            el.style.color = color || 'rgba(255,255,255,.4)';
        };

        $('#ccw-fb-ext-list').onclick = () => {
            const r = listExtensionsWithCount();
            const box = $('#ccw-fb-ext-listbox');
            if (!r.ok) { extStatus('✗ ' + r.reason, '#ff5555'); box.style.display = 'none'; return; }
            if (!r.rows.length) {
                extStatus('当前作品无扩展（共 ' + r.total + ' 个积木）', '#ffb86c');
                box.style.display = 'none';
                return;
            }
            box.innerHTML = r.rows.map(x =>
                `<div class="litem" data-id="${x.id}">
                    <span class="id">${x.id}</span>
                    <span class="n">${x.count} 积木${x.registered ? ' · 已注册' : ''}</span>
                </div>`
            ).join('');
            box.style.display = 'block';
            extStatus('共 ' + r.rows.length + ' 个扩展，' + r.total + ' 个积木。点击行填入 ID。', '#50fa7b');

            box.querySelectorAll('.litem').forEach(it => {
                it.onclick = () => {
                    $('#ccw-fb-ext-id').value = it.dataset.id;
                    extStatus('已填入 ' + it.dataset.id, '#8be9fd');
                };
            });
        };

        $('#ccw-fb-ext-del').onclick = () => {
            const id = $('#ccw-fb-ext-id').value.trim();
            if (!id) { extStatus('✗ 请先输入扩展 ID', '#ff5555'); return; }
            if (!confirm(`确认删除扩展 "${id}" 的所有积木：此操作立即生效（但需手动保存才会写入云端）`)) return;
            try {
                const n = deleteBlocksByExtension(id);
                extStatus(`✓ 已删除 ${n} 个积木（扩展 ${id}）`, '#50fa7b');
            } catch (e) {
                extStatus('✗ ' + e.message, '#ff5555');
            }
        };

        $('#ccw-fb-ext-replace').onclick = async () => {
            const id = $('#ccw-fb-ext-id').value.trim();
            const url = $('#ccw-fb-ext-url').value.trim();
            if (!id) { extStatus('✗ 请先输入扩展 ID', '#ff5555'); return; }
            if (!url) { extStatus('✗ 请先输入替换 URL', '#ff5555'); return; }
            if (!confirm(`确认删除扩展 "${id}" 的所有积木，并加载新扩展：\n${url}`)) return;
            extStatus('替换中...', '#ffb86c');
            try {
                const r = await replaceExtension(id, url);
                extStatus(`✓ 删除 ${r.deleted} 个积木，已加载 ${r.loaded}`, '#50fa7b');
            } catch (e) {
                extStatus('✗ ' + e.message, '#ff5555');
            }
        };

        /* ---------- 未知扩展发布 ---------- */
        const wildStatus = (msg, color) => {
            const el = $('#ccw-fb-wild-status');
            el.textContent = msg;
            el.style.color = color || 'rgba(255,255,255,.4)';
        };

        function renderWildTable() {
            const toggleBtn = $('#ccw-fb-wild-toggle');
            const on = allowUnknownEnabled();
            toggleBtn.textContent = on ? '已开启（点击关闭）' : '已关闭（点击开启）';
            toggleBtn.className = 'gbtn sm ' + (on ? 'success' : 'danger');

            const manual = getManualWildExt();
            const table = getWildExtTable();
            const ids = Object.keys(table).sort();
            const box = $('#ccw-fb-wild-table');
            if (!ids.length) {
                box.innerHTML = '<span class="hint">表为空：用 URL 加载扩展后会自动出现；也可下方手动添加。</span>';
                return;
            }
            box.innerHTML = ids.map(id =>
                `<div class="litem" data-id="${id}">
                    <span class="id">${id}</span>
                    <span class="n" title="${table[id]}">${truncate(table[id], 34)}</span>
                    ${manual[id] ? `<button class="gbtn sm danger" data-del="${id}" style="padding:2px 8px;">删</button>` : '<span class="badge success">自动</span>'}
                </div>`
            ).join('');
            box.querySelectorAll('[data-del]').forEach(btn => {
                btn.onclick = () => {
                    const t = getManualWildExt();
                    delete t[btn.dataset.del];
                    GM_setValue('ccw_fb_wild_ext', t);
                    renderWildTable();
                    wildStatus('已删除 ' + btn.dataset.del, '#ffb86c');
                };
            });
        }
        renderWildTable();

        $('#ccw-fb-wild-toggle').onclick = () => {
            GM_setValue('ccw_fb_allow_unknown', !allowUnknownEnabled());
            renderWildTable();
            wildStatus(allowUnknownEnabled() ? '✓ 已开启：发布时将伪造未注册扩展的注册信息' : '已关闭', allowUnknownEnabled() ? '#50fa7b' : '#ff5555');
        };
        $('#ccw-fb-wild-refresh').onclick = () => { renderWildTable(); wildStatus('已刷新（自动表来自 vm._customExtensionInfo / gandi.wildExtensions）', '#8be9fd'); };
        $('#ccw-fb-wild-add').onclick = () => {
            const id = $('#ccw-fb-wild-id').value.trim();
            const url = $('#ccw-fb-wild-url').value.trim();
            if (!id || !url) { wildStatus('✗ ID 和 URL 都要填', '#ff5555'); return; }
            const t = getManualWildExt();
            t[id] = url;
            GM_setValue('ccw_fb_wild_ext', t);
            $('#ccw-fb-wild-id').value = '';
            $('#ccw-fb-wild-url').value = '';
            renderWildTable();
            wildStatus('✓ 已添加 ' + id, '#50fa7b');
        };

        /* ---------- 一键发布扩展（真实登记） ---------- */
        const pubStatus = (msg, color) => {
            const el = $('#ccw-fb-pub-status');
            el.textContent = msg;
            el.style.color = color || 'rgba(255,255,255,.4)';
        };
        const pubLog = (line) => {
            const box = $('#ccw-fb-pub-log');
            box.style.display = 'block';
            box.textContent += line + '\n';
            box.scrollTop = box.scrollHeight;
        };
        let pubLastResult = null;

        $('#ccw-fb-pub-scan').onclick = () => {
            const found = {};
            const t = getWildExtTable();
            for (const id in t) if (t[id]) found[id] = t[id];
            for (const id in sniffedExt) if (sniffedExt[id] && !found[id]) found[id] = sniffedExt[id];
            const ids = Object.keys(found).sort();
            const box = $('#ccw-fb-pub-scanbox');
            box.style.display = 'block';
            if (!ids.length) {
                box.innerHTML = '<span class="hint">未找到带 URL 的扩展。请先在当前作品里加载通配扩展（或打开含通配扩展的作品页）。</span>';
                pubStatus('未捕到扩展', '#ffb86c');
                return;
            }
            box.innerHTML = ids.map(id =>
                `<div class="litem">
                    <span class="id">${id}</span>
                    <span class="n" title="${found[id]}">${truncate(found[id], 24)}</span>
                    <button class="gbtn sm" data-fill="${id}" style="padding:2px 8px;">填入</button>
                    <button class="gbtn sm primary" data-go="${id}" style="padding:2px 8px;">直奔</button>
                </div>`
            ).join('');
            pubStatus('抓到 ' + ids.length + ' 个扩展', '#50fa7b');
            box.querySelectorAll('[data-fill]').forEach(btn => {
                btn.onclick = () => fillFromScan(btn.dataset.fill, found[btn.dataset.fill], false);
            });
            box.querySelectorAll('[data-go]').forEach(btn => {
                btn.onclick = () => fillFromScan(btn.dataset.go, found[btn.dataset.go], true);
            });
        };

        async function fillFromScan(key, url, autoGo) {
            $('#ccw-fb-pub-url').value = url;
            let eid = key;
            try {
                pubStatus('探测 JS 内的 extid ...', '#8be9fd');
                const resp = await gmxhr({ method: 'GET', url });
                const m = String(resp.responseText).match(/const\s+extid\s*=\s*["'`]([^"'`]+)["'`]/);
                if (m && m[1]) eid = m[1];
            } catch (e) { /* 拉取失败用 key 兜底 */ }
            $('#ccw-fb-pub-eid').value = eid;
            $('#ccw-fb-pub-name').value = eid;
            if (autoGo) {
                pubStatus('已填入 ' + eid + '，自动登记中...', '#ffb86c');
                $('#ccw-fb-pub-go').click();
            } else {
                pubStatus('已填入 ' + eid + '，确认后点「开始登记发布」', '#50fa7b');
            }
        }

        $('#ccw-fb-pub-rand').onclick = () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let s = '';
            for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
            $('#ccw-fb-pub-eid').value = 'ext_' + s;
        };

        $('#ccw-fb-pub-go').onclick = async () => {
            const url = $('#ccw-fb-pub-url').value.trim();
            const eid = $('#ccw-fb-pub-eid').value.trim();
            const name = $('#ccw-fb-pub-name').value.trim();
            if (!url) { pubStatus('✗ 请填扩展 JS 地址', '#ff5555'); return; }
            if (!/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/.test(eid)) { pubStatus('✗ 扩展 ID 需字母开头，3-32 位字母/数字/下划线', '#ff5555'); return; }
            if (!name) { pubStatus('✗ 请填扩展名称', '#ff5555'); return; }
            const btn = $('#ccw-fb-pub-go');
            btn.disabled = true;
            $('#ccw-fb-pub-log').textContent = '';
            pubStatus('发布中（需几分钟）...', '#ffb86c');
            try {
                const r = await publishExtension({
                    url, eid, name,
                    description: $('#ccw-fb-pub-desc').value.trim() || name,
                    cover: $('#ccw-fb-pub-cover').value.trim(),
                    projectLink: $('#ccw-fb-pub-link').value.trim(),
                    creationId: $('#ccw-fb-pub-creid').value.trim(),
                }, pubLog);
                pubLastResult = r;
                const t = getManualWildExt();
                t[r.eid] = r.assetUri;
                GM_setValue('ccw_fb_wild_ext', t);
                renderWildTable();
                $('#ccw-fb-pub-inject').disabled = false;
                pubStatus('✓ 已登记：' + r.eid, '#50fa7b');
                pubLog('完成！assetUri = ' + r.assetUri);
            } catch (e) {
                const msg = (e && e.message) || (typeof e === 'object' ? JSON.stringify(e) : String(e));
                pubStatus('✗ ' + msg.slice(0, 140), '#ff5555');
                pubLog('失败：' + msg);
                if (/太频繁|"status":901/.test(msg)) {
                    pubLog('提示：作品创建接口被服务端限流。OSS 上传和已创建的作品都会缓存复用，过一阵直接重新点「开始登记发布」即可，不会重复新建。');
                }
            } finally {
                btn.disabled = false;
            }
        };

        $('#ccw-fb-pub-inject').onclick = async () => {
            if (!pubLastResult) return;
            const vm = findVM();
            if (!vm || !vm.extensionManager) { pubStatus('✗ 未摘取 vm，请在编辑器页面操作', '#ff5555'); return; }
            try {
                pubStatus('提交中...', '#ffb86c');
                await vm.extensionManager.loadExtensionURL(pubLastResult.assetUri);
                pubStatus('✓ 已提交 ' + pubLastResult.eid + '，保存作品后即绑定新地址', '#50fa7b');
            } catch (e) {
                pubStatus('✗ ' + ((e && e.message) || e), '#ff5555');
            }
        };

        /* ---------- 扩展中心查询 ---------- */
        const xqStatus = (msg, color) => {
            const el = $('#ccw-fb-xq-status');
            el.textContent = msg;
            el.style.color = color || 'rgba(255,255,255,.4)';
        };
        $('#ccw-fb-xq-go').onclick = async () => {
            const eid = $('#ccw-fb-xq-eid').value.trim();
            const box = $('#ccw-fb-xq-result');
            if (!eid) { xqStatus('✗ 请输入扩展 ID', '#ff5555'); return; }
            xqStatus('查询中...', '#ffb86c');
            box.style.display = 'none';
            try {
                const r = await gmxhr({ method: 'GET', url: EXT_QUERY_PREFIX + eid });
                let j = null;
                try { j = JSON.parse(r.responseText); } catch (e) {}
                if (!j || 3 == j.status || r.status === 404) {
                    xqStatus('✓ ' + eid + ' 未被注册，可直接登记', '#50fa7b');
                    return;
                }
                const b = j.body || {};
                const tags = (b.stats && b.stats.reviewTags) || [];
                const cnt = n => { const t = tags.find(x => x.tag === n); return t ? t.count : 0; };
                const safe = cnt('安全'), danger = cnt('危险'), risk = cnt('潜在风险');
                const grade = (danger >= safe && danger >= 3) ? 'DANGEROUS（禁止运行）'
                    : (danger < safe && safe >= 5 && danger < 3 && risk <= 3) ? 'SAFE（默许运行）'
                    : 'UNKNOWN（弹确认弹，可放行）';
                const vers = (b.versions || []).map(v => '  - ' + (v.version || '?') + '  ' + (v.assetUri || '(无assetUri)')).join('\n');
                box.textContent =
                    '名称: ' + (b.name || '?') + '\n' +
                    '简介: ' + (b.description || '(无)') + '\n' +
                    '发布者: ' + ((b.publisher && b.publisher.nickname) || '?') + '\n' +
                    '安全标签: 安全×' + safe + '  危险×' + danger + '  潜在风险×' + risk + '\n' +
                    '分级判定: ' + grade + '\n' +
                    '版本:\n' + (vers || '  (无版本记录——运行时会被判 EXTENSION_NOT_FOUND)');
                box.style.display = 'block';
                xqStatus('✓ 已注册', '#8be9fd');
            } catch (e) {
                xqStatus('✗ ' + ((e && e.message) || e), '#ff5555');
            }
        };

        /* ---------- 作品扩展 URL 替换 ---------- */
        const xrStatus = (msg, color) => {
            const el = $('#ccw-fb-xr-status');
            el.textContent = msg;
            el.style.color = color || 'rgba(255,255,255,.4)';
        };
        $('#ccw-fb-xr-scan').onclick = () => {
            const box = $('#ccw-fb-xr-list');
            const wild = (W.gandi && W.gandi.wildExtensions) || {};
            const ids = Object.keys(wild);
            box.style.display = 'block';
            $('#ccw-fb-xr-apply').disabled = true;
            if (!ids.length) {
                box.innerHTML = '<span class="hint">未发现 gandi.wildExtensions。请在编辑器打开含通配扩展的作品后再扫。</span>';
                xrStatus('未扫描到', '#ffb86c');
                return;
            }
            box.innerHTML = ids.map(id => {
                const u = (wild[id] && wild[id].url) || (typeof wild[id] === 'string' ? wild[id] : '');
                return `<div class="litem" style="flex-wrap:wrap;">
                    <span class="id">${id}</span>
                    <span class="n" title="${u}">${truncate(u || '(无 url)', 24)}</span>
                    <input class="ginput mono" data-xr-in="${id}" placeholder="新 URL（留空不改）" style="flex:1 1 100%;margin-top:4px;font-size:11px;padding:3px 6px;">
                </div>`;
            }).join('');
            $('#ccw-fb-xr-apply').disabled = false;
            xrStatus('扫描到 ' + ids.length + ' 个扩展引用', '#50fa7b');
        };
        $('#ccw-fb-xr-apply').onclick = () => {
            const wild = (W.gandi && W.gandi.wildExtensions) || {};
            let n = 0;
            document.querySelectorAll('[data-xr-in]').forEach(inp => {
                const id = inp.dataset.xrIn, v = inp.value.trim();
                if (!v || !wild[id]) return;
                if (typeof wild[id] === 'string') wild[id] = v;
                else wild[id].url = v;
                n++;
            });
            xrStatus(n ? '✓ 已替换 ' + n + ' 处，保存作品后生效（建议先另存备份）' : '没有填写任何新 URL', n ? '#50fa7b' : '#ffb86c');
        };

        /* ---------- 查作品 / 作品源代码备份 ---------- */
        let worksCache = Object.create(null);

        async function downloadWorkBlob(oid) {
            const it = worksCache[oid];
            if (!it) throw new Error('该作品无源码存储');
            const r = await new Promise((res2, rej) => GM_xmlhttpRequest({
                method: 'GET', url: it.link, responseType: 'blob',
                onload: res2, onerror: () => rej(new Error('网络错误')), ontimeout: () => rej(new Error('请求超时')),
            }));
            if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status);
            let fname = '';
            try { fname = decodeURIComponent(new URL(it.link).pathname.split('/').pop() || ''); } catch (e) {}
            if (!fname || !/\.[a-z0-9]{2,5}$/i.test(fname)) fname = String(it.title || oid).replace(/[\\/:*?"<>|]/g, '_') + '.ccw';
            const u = URL.createObjectURL(r.response);
            const a = document.createElement('a');
            a.href = u; a.download = fname;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(u), 5000);
            return fname;
        }

        $('#ccw-fb-works-go').onclick = async () => {
            const oid = $('#ccw-fb-works-oid').value.trim();
            const st = $('#ccw-fb-works-status');
            const res = $('#ccw-fb-works-result');
            if (!oid) { st.textContent = '✗ 请输入作者 OID'; st.style.color = '#ff5555'; return; }
            st.textContent = '拉取中...'; st.style.color = '#ffb86c';
            res.innerHTML = '';
            worksCache = Object.create(null);
            $('#ccw-fb-works-dlall').disabled = true;
            try {
                const all = await fetchAllWorks(oid);
                if (!all.length) {
                    st.textContent = '该作者无公开作品'; st.style.color = '#ffb86c';
                    return;
                }
                res.innerHTML = all.map(w => {
                    const open = w.sourceOpenLevel || (w.creationRelease && w.creationRelease.sourceOpenLevel) || '?';
                    const link = (w.creationRelease && w.creationRelease.projectLink) || '';
                    if (link) worksCache[w.oid] = { title: w.title || '未命名', link };
                    return `<div class="work-item">
                        <a class="wt" href="https://www.ccw.site/detail/${w.oid}" target="_blank" title="${w.title}">${w.title || '未命名'}</a>
                        <span class="badge ${link ? 'success' : 'danger'}">${link ? '可下载' : '无源'}</span>
                        <span class="badge">${open}</span>
                        ${link ? `<button class="gbtn sm primary" data-dl="${w.oid}" style="padding:2px 8px;flex-shrink:0;">下载</button>` : ''}
                    </div>`;
                }).join('');
                res.querySelectorAll('[data-dl]').forEach(btn => {
                    btn.onclick = async () => {
                        btn.disabled = true; btn.textContent = '...';
                        try { await downloadWorkBlob(btn.dataset.dl); btn.textContent = '✓'; }
                        catch (e) { btn.textContent = '✗'; st.textContent = '✗ 下载失败: ' + e.message; st.style.color = '#ff5555'; }
                        setTimeout(() => { btn.disabled = false; btn.textContent = '下载'; }, 1500);
                    };
                });
                $('#ccw-fb-works-dlall').disabled = !res.querySelector('[data-dl]');
                st.textContent = '共 ' + all.length + ' 个作品（可下载 ' + Object.keys(worksCache).length + '）'; st.style.color = '#50fa7b';
            } catch (e) {
                st.textContent = '✗ ' + e.message; st.style.color = '#ff5555';
            }
        };

        $('#ccw-fb-works-dlall').onclick = async () => {
            const st = $('#ccw-fb-works-status');
            const ids = Object.keys(worksCache);
            if (!ids.length) { st.textContent = '无可下载作品'; st.style.color = '#ffb86c'; return; }
            const btn = $('#ccw-fb-works-dlall');
            btn.disabled = true;
            let ok = 0, fail = 0;
            for (let i = 0; i < ids.length; i++) {
                st.textContent = '下载中 ' + (i + 1) + '/' + ids.length + ' ...'; st.style.color = '#ffb86c';
                try { await downloadWorkBlob(ids[i]); ok++; } catch (e) { fail++; }
                await new Promise(r2 => setTimeout(r2, 600));
            }
            st.textContent = '完成：成功 ' + ok + '，失败 ' + fail;
            st.style.color = fail ? '#ffb86c' : '#50fa7b';
            btn.disabled = false;
        };

        /* ---------- 开发者工具：变量监视器 ---------- */
        const varStatus = (m, c) => {
            const el = $('#ccw-fb-var-status');
            el.textContent = m;
            el.style.color = c || 'rgba(255,255,255,.4)';
        };
        let prevVarSnap = Object.create(null);
        const varChangedSet = new Set();
        let lastVarRows = [];
        const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        let expandedListKey = '';
        let varSnapStore = null;
        function allTargets() {
            const vm = findVM();
            const out = [];
            try {
                const ts = (vm && vm.runtime && vm.runtime.targets) || [];
                for (const t of ts) {
                    if (!t || !t.id) continue;
                    out.push({ id: t.id, label: t.isStage ? '舞台(全局)' : safeGet(() => t.getName(), t.id) });
                }
            } catch (e) {}
            return out;
        }
        function findTargetById(targetId) {
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) return null;
            return vm.runtime.targets.find(x => x && x.id === targetId) || null;
        }
        function fillSelect(sel, opts) {
            if (!sel) return;
            const key = opts.map(o => o.value).join('|');
            if (sel.dataset.optkey === key) return;
            const cur = sel.value;
            sel.dataset.optkey = key;
            sel.innerHTML = opts.map(o => `<option value="${escHtml(o.value)}">${escHtml(o.label)}</option>`).join('');
            if (opts.some(o => o.value === cur)) sel.value = cur;
        }
        function parseListRaw(raw) {
            const s = String(raw == null ? '' : raw).trim();
            if (!s) return [];
            if (s.charAt(0) === '[') {
                try { const a = JSON.parse(s); if (Array.isArray(a)) return a; } catch (e) {}
            }
            return s.split(',').map(x => x.trim()).filter(x => x.length);
        }
        function isListVar(v) { return !!v && (v.type === 'list' || Array.isArray(v.value)); }
        function genVarId() { return 'ccwv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
        function emitWorkspace() {
            try { const vm = findVM(); if (vm && vm.runtime && vm.runtime.emitWorkspaceUpdate) vm.runtime.emitWorkspaceUpdate(); } catch (e) {}
        }
        function createVarInTarget(targetId, name, kind, rawVal) {
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) return 'vm 未摘取（打开作品编辑器后重试）';
            const t = findTargetById(targetId);
            if (!t) return '目标不存在';
            if (!t.variables) return '目标不支持变量';
            const isList = kind === 'list';
            const value = isList ? parseListRaw(rawVal) : String(rawVal == null ? '' : rawVal);
            try {
                const id = genVarId();
                if (typeof t.createVariable === 'function') t.createVariable(id, name, isList ? 'list' : '', false);
                else t.variables[id] = { id, name, value, type: isList ? 'list' : '', isCloud: false };
                const v = t.variables[id];
                if (v) v.value = value;
                return null;
            } catch (e) { return '创建失败: ' + ((e && e.message) || e); }
        }
        function deleteVarInTarget(targetId, varId) {
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) return 'vm 未摘取';
            const t = findTargetById(targetId);
            if (!t) return '目标不存在';
            try {
                const v = (t.variables && t.variables[varId]) || null;
                if (v) {
                    let val = v.value;
                    if (Array.isArray(val) && val.length > 300) val = val.slice(0, 300);
                    try { val = JSON.parse(JSON.stringify(val)); } catch (e) { val = Array.isArray(val) ? [] : String(val); }
                    rbPush({
                        targetId,
                        targetLabel: t.isStage ? '舞台(全局)' : safeGet(() => t.getName(), targetId),
                        name: v.name || varId,
                        type: v.type || (Array.isArray(v.value) ? 'list' : 'scalar'),
                        isCloud: !!v.isCloud,
                        value: val,
                    });
                }
                if (typeof t.deleteVariable === 'function') { t.deleteVariable(varId); return null; }
                if (v) { delete t.variables[varId]; return null; }
                return '变量不存在';
            } catch (e) { return '删除失败: ' + ((e && e.message) || e); }
        }
        const numFirstCmp = (x, y) => {
            const nx = Number(x), ny = Number(y);
            const xn = x !== '' && x != null && !isNaN(nx), yn = y !== '' && y != null && !isNaN(ny);
            if (xn && yn) return nx - ny;
            if (xn) return -1;
            if (yn) return 1;
            return String(x).localeCompare(String(y), 'zh-Hans-CN');
        };
        const listOps = {
            clear: () => [],
            reverse: a => a.reverse(),
            asc: a => a.slice().sort(numFirstCmp),
            desc: a => a.slice().sort((x, y) => numFirstCmp(y, x)),
            shuffle: a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tm = a[i]; a[i] = a[j]; a[j] = tm; } return a; },
            unique: a => { const seen = new Set(); return a.filter(x => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; }); },
        };
        const listOpName = { clear: '清空', reverse: '反转', asc: '升序', desc: '降序', shuffle: '随机', unique: '去重' };
        function mutateList(row, op) {
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) return 'vm 未摘取';
            const t = findTargetById(row.targetId);
            const v = (t && t.variables) ? t.variables[row.varId] : null;
            if (!v) return '变量不存在';
            const arr = Array.isArray(v.value) ? v.value.slice() : [];
            try { v.value = (listOps[op] || (a => a))(arr) || []; return null; }
            catch (e) { return '操作失败: ' + ((e && e.message) || e); }
        }
        function syncScopeAndTargets(rows) {
            const owners = [], seen = Object.create(null);
            (rows || []).forEach(r => { if (!seen[r.owner]) { seen[r.owner] = 1; owners.push({ value: r.owner, label: r.owner }); } });
            fillSelect($('#ccw-fb-var-scope'), [{ value: '', label: '全部目标' }].concat(owners));
            const tg = allTargets();
            fillSelect($('#ccw-fb-var-new-target'), tg.length ? tg.map(t => ({ value: t.id, label: t.label })) : [{ value: '', label: '（无可选目标）' }]);
            fillSelect($('#ccw-fb-batch-scope'), [{ value: '', label: '全部目标' }].concat(tg.map(t => ({ value: t.id, label: t.label }))));
            const listOpts = (rows || []).filter(r => Array.isArray(r.value) || r.type === 'list')
                .map(r => ({ value: r.targetId + '|' + r.varId, label: r.owner + ' · ' + r.name }));
            const lqOpts = listOpts.length ? listOpts : [{ value: '', label: '（暂无列表）' }];
            fillSelect($('#ccw-fb-lq-src'), lqOpts);
            fillSelect($('#ccw-fb-lq-dst'), lqOpts);
        }

        function renderVarList(manual) {
            const listEl = $('#ccw-fb-var-list');
            if (!listEl) return;
            if (!manual && document.activeElement && listEl.contains(document.activeElement)) return;
            const rows = collectVariables();
            syncScopeAndTargets(rows);
            if (!rows) {
                varStatus('✗ 未摘取 vm（打开作品编辑器后自动摘取）', '#ff5555');
                listEl.innerHTML = '';
                $('#ccw-fb-var-count').textContent = '';
                return;
            }
            const filter = ($('#ccw-fb-var-filter').value || '').toLowerCase();
            const scope = $('#ccw-fb-var-scope').value || '';
            const onlyChanged = $('#ccw-fb-var-changed').checked;
            const newSnap = Object.create(null);
            rows.forEach(r => { newSnap[r.targetId + '|' + r.varId] = JSON.stringify(r.value); });
            for (const k in newSnap) {
                if (prevVarSnap[k] !== undefined && prevVarSnap[k] !== newSnap[k]) varChangedSet.add(k);
            }
            prevVarSnap = newSnap;
            let shown = 0;
            lastVarRows = [];
            const html = rows.map(r => {
                const key = r.targetId + '|' + r.varId;
                const isArr = Array.isArray(r.value) || r.type === 'list';
                const valStr = isArr
                    ? '列表[' + (Array.isArray(r.value) ? r.value.length : 0) + '] ' + truncate(JSON.stringify(r.value), 40)
                    : truncate(String(r.value), 60);
                if (scope && r.owner !== scope) return '';
                if (filter && !(r.name.toLowerCase().includes(filter) || String(r.value).toLowerCase().includes(filter))) return '';
                if (onlyChanged && !varChangedSet.has(key)) return '';
                const idx = lastVarRows.length;
                lastVarRows.push(r);
                shown++;
                const isCh = varChangedSet.has(key);
                const isBc = r.type === 'broadcast_msg';
                return `<div class="litem" style="flex-wrap:wrap;gap:4px;${isCh ? 'border-left:2px solid #ffb86c;padding-left:4px;' : ''}">
                    <span class="badge ${isArr ? 'warning' : ''}" style="margin:0;">${isArr ? '列表' : '变量'}</span>
                    <span class="id" title="${escHtml(r.name)}">${escHtml(r.name)}${r.isCloud ? ' ☁' : ''}${isBc ? ' 📢' : ''}</span>
                    <span class="n mono" title="${escHtml(String(r.value))}">${escHtml(valStr)}</span>
                    <span class="n" style="opacity:.55;">${escHtml(r.owner)}</span>
                    ${isArr
                        ? `<button class="gbtn sm primary" data-list-op="${idx}" style="padding:2px 8px;">操作</button>`
                        : `<input class="ginput mono" data-var-idx="${idx}" value="${escHtml(String(r.value))}" style="width:86px;padding:2px 6px;font-size:11px;"><button class="gbtn sm success" data-var-set="${idx}" style="padding:2px 8px;">写</button>`}
                    <button class="gbtn sm danger" data-var-del="${idx}" style="padding:2px 8px;">删</button>
                    ${isArr && expandedListKey === key ? `<div style="width:100%;display:flex;flex-wrap:wrap;gap:4px;padding-top:4px;">
                        ${Object.keys(listOps).map(op => `<button class="gbtn sm" data-list-act="${op}" data-li="${idx}" style="padding:2px 8px;">${listOpName[op]}</button>`).join('')}
                    </div>` : ''}
                </div>`;
            }).join('');
            listEl.innerHTML = html || '<span class="hint">无匹配变量</span>';
            $('#ccw-fb-var-count').textContent = '显示 ' + shown + ' / 共 ' + rows.length + ' 个变量（变化 ' + varChangedSet.size + '）';
            varStatus('✓ 已连接 vm，实时监视中（输入框改值后点「写」直接生效）', '#50fa7b');

            listEl.querySelectorAll('[data-var-set]').forEach(btn => {
                btn.onclick = () => {
                    const idx = Number(btn.dataset.varSet);
                    const inp = listEl.querySelector(`input[data-var-idx="${idx}"]`);
                    const row = lastVarRows[idx];
                    if (!row || !inp) return;
                    const err = setVariableValue(row, inp.value);
                    if (err) { varStatus('✗ 写入失败: ' + err, '#ff5555'); return; }
                    varStatus('✓ 已写入「' + row.name + '」= ' + truncate(inp.value, 30) + '（' + row.owner + '）', '#50fa7b');
                    prevVarSnap[row.targetId + '|' + row.varId] = JSON.stringify(row.value);
                    varChangedSet.delete(row.targetId + '|' + row.varId);
                };
            });
            listEl.querySelectorAll('[data-var-del]').forEach(btn => {
                btn.onclick = () => {
                    const row = lastVarRows[Number(btn.dataset.varDel)];
                    if (!row) return;
                    if (!confirm('确认删除「' + row.name + '」（' + row.owner + '）？此操作不可撤销。')) return;
                    const err = deleteVarInTarget(row.targetId, row.varId);
                    if (err) { varStatus('✗ 删除失败: ' + err, '#ff5555'); return; }
                    emitWorkspace();
                    if (expandedListKey === row.targetId + '|' + row.varId) expandedListKey = '';
                    varStatus('✓ 已删除「' + row.name + '」（' + row.owner + '）', '#50fa7b');
                    renderVarList(true);
                };
            });
            listEl.querySelectorAll('[data-list-op]').forEach(btn => {
                btn.onclick = () => {
                    const row = lastVarRows[Number(btn.dataset.listOp)];
                    if (!row) return;
                    const key = row.targetId + '|' + row.varId;
                    expandedListKey = (expandedListKey === key) ? '' : key;
                    renderVarList(true);
                };
            });
            listEl.querySelectorAll('[data-list-act]').forEach(btn => {
                btn.onclick = () => {
                    const row = lastVarRows[Number(btn.dataset.li)];
                    if (!row) return;
                    const op = btn.dataset.listAct;
                    const err = mutateList(row, op);
                    if (err) { varStatus('✗ ' + listOpName[op] + '失败: ' + err, '#ff5555'); return; }
                    varStatus('✓ 已对「' + row.name + '」执行「' + listOpName[op] + '」', '#50fa7b');
                    renderVarList(true);
                };
            });
        }
        renderVarListFn = renderVarList;
        $('#ccw-fb-var-refresh').onclick = () => renderVarList(true);
        $('#ccw-fb-var-filter').addEventListener('input', () => renderVarList(true));
        $('#ccw-fb-var-changed').addEventListener('change', () => renderVarList(true));
        $('#ccw-fb-var-scope').addEventListener('change', () => renderVarList(true));

        const newBox = $('#ccw-fb-var-new');
        $('#ccw-fb-var-new-toggle').onclick = () => {
            newBox.style.display = (newBox.style.display === 'block') ? 'none' : 'block';
        };
        $('#ccw-fb-var-new-go').onclick = () => {
            const name = ($('#ccw-fb-var-new-name').value || '').trim();
            const kind = $('#ccw-fb-var-new-type').value;
            const targetId = $('#ccw-fb-var-new-target').value;
            const raw = $('#ccw-fb-var-new-value').value;
            if (!name) { varStatus('✗ 请填写变量名称', '#ff5555'); return; }
            if (!targetId) { varStatus('✗ 请先选择目标（未摘取 vm 时无可选目标）', '#ff5555'); return; }
            const err = createVarInTarget(targetId, name, kind, raw);
            if (err) { varStatus('✗ 新建失败: ' + err, '#ff5555'); return; }
            emitWorkspace();
            varStatus('✓ 已新建「' + name + '」（' + (kind === 'list' ? '列表' : '变量') + '）', '#50fa7b');
            renderVarList(true);
        };

        $('#ccw-fb-var-snap-save').onclick = () => {
            const rows = collectVariables();
            if (!rows) { varStatus('✗ 保存快照失败：未摘取 vm', '#ff5555'); return; }
            varSnapStore = rows.map(r => {
                let cv;
                try { cv = JSON.parse(JSON.stringify(r.value)); } catch (e) { cv = String(r.value); }
                return { targetId: r.targetId, varId: r.varId, name: r.name, value: cv, type: r.type };
            });
            varStatus('✓ 已保存快照（' + varSnapStore.length + ' 个变量）', '#50fa7b');
        };
        $('#ccw-fb-var-snap-load').onclick = () => {
            if (!varSnapStore) { varStatus('✗ 尚无快照，请先「保存快照」', '#ffb86c'); return; }
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) { varStatus('✗ 还原失败：未摘取 vm', '#ff5555'); return; }
            let ok = 0, fail = 0;
            for (const s of varSnapStore) {
                try {
                    const t = findTargetById(s.targetId);
                    const v = (t && t.variables) ? t.variables[s.varId] : null;
                    if (!v) { fail++; continue; }
                    v.value = s.value;
                    ok++;
                } catch (e) { fail++; }
            }
            varStatus(fail
                ? '⚠ 还原完成：成功 ' + ok + ' 个，失败 ' + fail + ' 个（目标已变更）'
                : '✓ 已还原快照（' + ok + ' 个变量）', fail ? '#ffb86c' : '#50fa7b');
            renderVarList(true);
        };

        const batchStatus = (m, c) => {
            const el = $('#ccw-fb-batch-status');
            el.textContent = m;
            el.style.color = c || 'rgba(255,255,255,.4)';
        };
        function findMatchingVar(t, name, typeFilter) {
            if (!t || !t.variables) return null;
            for (const id in t.variables) {
                const v = t.variables[id];
                if (!v || v.name !== name) continue;
                const isList = isListVar(v);
                if (typeFilter === 'scalar' && isList) continue;
                if (typeFilter === 'list' && !isList) continue;
                return { varId: id, v };
            }
            return null;
        }
        function batchTargets() {
            const scope = $('#ccw-fb-batch-scope').value;
            const tg = allTargets();
            return scope ? tg.filter(t => t.id === scope) : tg;
        }
        function batchParams() {
            return {
                name: ($('#ccw-fb-batch-name').value || '').trim(),
                typeFilter: $('#ccw-fb-batch-type').value,
                raw: $('#ccw-fb-batch-value').value,
                fill: $('#ccw-fb-batch-fill').checked,
            };
        }
        $('#ccw-fb-batch-set').onclick = () => {
            const p = batchParams();
            if (!p.name) { batchStatus('✗ 请填写变量名称', '#ff5555'); return; }
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) { batchStatus('✗ vm 未摘取（打开作品编辑器后重试）', '#ff5555'); return; }
            let set = 0, created = 0, skip = 0, fail = 0;
            for (const tg of batchTargets()) {
                const t = findTargetById(tg.id);
                if (!t || !t.variables) { fail++; continue; }
                const hit = findMatchingVar(t, p.name, p.typeFilter);
                if (!hit) {
                    if (p.fill) {
                        const err = createVarInTarget(tg.id, p.name, p.typeFilter === 'list' ? 'list' : '', p.raw);
                        if (err) fail++; else created++;
                    } else skip++;
                    continue;
                }
                if (isListVar(hit.v)) {
                    try { hit.v.value = parseListRaw(p.raw); set++; } catch (e) { fail++; }
                } else {
                    const err = setVariableValue({ targetId: tg.id, varId: hit.varId }, p.raw);
                    if (err) fail++; else set++;
                }
            }
            emitWorkspace();
            batchStatus('已设置 ' + set + ' 个 / 新建 ' + created + ' 个'
                + (skip ? ' / 跳过 ' + skip + ' 个（无同名变量）' : '')
                + (fail ? ' / 失败 ' + fail + ' 个' : ''), fail ? '#ffb86c' : '#50fa7b');
            renderVarList(true);
        };
        $('#ccw-fb-batch-create').onclick = () => {
            const p = batchParams();
            if (!p.name) { batchStatus('✗ 请填写变量名称', '#ff5555'); return; }
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) { batchStatus('✗ vm 未摘取（打开作品编辑器后重试）', '#ff5555'); return; }
            let created = 0, skip = 0, fail = 0;
            for (const tg of batchTargets()) {
                const t = findTargetById(tg.id);
                if (!t || !t.variables) { fail++; continue; }
                if (findMatchingVar(t, p.name, p.typeFilter)) { skip++; continue; }
                const err = createVarInTarget(tg.id, p.name, p.typeFilter === 'list' ? 'list' : '', p.raw);
                if (err) fail++; else created++;
            }
            emitWorkspace();
            batchStatus('新建 ' + created + ' 个' + (skip ? ' / 跳过 ' + skip + ' 个（已存在）' : '')
                + (fail ? ' / 失败 ' + fail + ' 个' : ''), fail ? '#ffb86c' : '#50fa7b');
            renderVarList(true);
        };
        $('#ccw-fb-batch-del').onclick = () => {
            const p = batchParams();
            if (!p.name) { batchStatus('✗ 请填写变量名称', '#ff5555'); return; }
            const label = p.typeFilter === 'list' ? '列表' : (p.typeFilter === 'scalar' ? '变量' : '变量/列表');
            if (!confirm('确认删除所有目标中名称为「' + p.name + '」的' + label + '？此操作不可撤销。')) return;
            let del = 0, skip = 0, fail = 0;
            for (const tg of batchTargets()) {
                const t = findTargetById(tg.id);
                if (!t || !t.variables) { fail++; continue; }
                const hit = findMatchingVar(t, p.name, p.typeFilter);
                if (!hit) { skip++; continue; }
                const err = deleteVarInTarget(tg.id, hit.varId);
                if (err) fail++; else del++;
            }
            emitWorkspace();
            batchStatus('已删除 ' + del + ' 个' + (skip ? ' / 跳过 ' + skip + ' 个（无此变量）' : '')
                + (fail ? ' / 失败 ' + fail + ' 个' : ''), fail ? '#ffb86c' : '#50fa7b');
            renderVarList(true);
        };

        const virusStatus = (m, c) => {
            const el = $('#ccw-fb-virus-status');
            el.textContent = m;
            el.style.color = c || 'rgba(255,255,255,.4)';
        };
        $('#ccw-fb-virus-go').onclick = () => {
            const listEl = $('#ccw-fb-virus-list');
            virusStatus('扫描中...', '#ffb86c');
            listEl.innerHTML = '';
            const r = scanVirus();
            if (!r.ok) { virusStatus('✗ ' + r.reason, '#ff5555'); return; }
            if (!r.hits.length) {
                virusStatus('✓ 扫描完成（共 ' + r.totalBlocks + ' 个积木），未发现可疑项', '#50fa7b');
                return;
            }
            const lvMeta = { high: ['高危', '#ff5555'], mid: ['中危', '#ffb86c'], low: ['低危', '#8be9fd'] };
            const order = { high: 0, mid: 1, low: 2 };
            r.hits.sort((a, b) => order[a.level] - order[b.level]);
            listEl.innerHTML = r.hits.map(h =>
                `<div class="litem" style="border-left:2px solid ${lvMeta[h.level][1]};padding-left:4px;">
                    <span class="badge" style="color:${lvMeta[h.level][1]};border-color:${lvMeta[h.level][1]};">${lvMeta[h.level][0]}</span>
                    <span class="id" title="${escHtml(h.op)}">${escHtml(truncate(h.op, 28))}</span>
                    <span class="n" style="flex:1;" title="${escHtml(h.reason)}">${escHtml(h.reason)}</span>
                    <span class="n" style="opacity:.55;">${escHtml(h.sprite)}</span>
                </div>`
            ).join('');
            const nHigh = r.hits.filter(h => h.level === 'high').length;
            virusStatus('扫描完成（共 ' + r.totalBlocks + ' 个积木）：' + r.hits.length + ' 项可疑（高危 ' + nHigh + '）',
                nHigh ? '#ff5555' : '#ffb86c');
        };

        const dbStatus = (m, c) => {
            const el = $('#ccw-fb-db-status');
            el.textContent = m;
            el.style.color = c || 'rgba(255,255,255,.4)';
        };
        let dbScope = 'works';
        const dbScopeBtns = [$('#ccw-fb-db-scope-works'), $('#ccw-fb-db-scope-user')];
        function paintDbScope() {
            dbScopeBtns.forEach(b => { if (b) b.classList.toggle('primary', b.dataset.dbScope === dbScope); });
        }
        function currentUserName() {
            return safeGet(() => {
                const g = W.gandi || W.GandiIDE || {};
                const u = g.user || g.userInfo || g.currentUser || W.currentUser;
                return (u && (u.username || u.name || u.nickname)) || g.username || '';
            }, '');
        }
        function pickUserCloudVars(vars) {
            const uname = currentUserName();
            const kws = [];
            if (uname) kws.push(String(uname).toLowerCase());
            kws.push('用户');
            const out = (vars || []).filter(v => {
                const blob = (String(v.name) + ' ' + String(v.value)).toLowerCase();
                return kws.some(k => k && blob.indexOf(k) >= 0);
            });
            return { out, uname };
        }
        function dbRender(scope) {
            const res = $('#ccw-fb-db-result');
            const d = detectDatabase();
            if (!d.ok) {
                res.innerHTML = '<span class="hint">当前无可用数据（未连接或项目无变量）</span>';
                dbStatus('✗ 当前无可用数据（未连接或项目无变量）', '#ff5555');
                return;
            }
            const kvv = (k, v, cls) => `<div class="kv"><span class="k">${k}</span><span class="v ${cls || ''}">${v}</span></div>`;
            let html = '';
            html += kvv('云数据扩展', d.cloudExt.length ? escHtml(d.cloudExt.join(', ')) : '云数据扩展未加载', d.cloudExt.length ? 'ok' : 'warn');
            html += kvv('已加载扩展ID', d.loadedIds.length ? escHtml(truncate(d.loadedIds.join(', '), 90)) : '无', '');
            const connText = d.gdb ? (String(d.gdbState) === 'true' ? 'Connected' : (String(d.gdbState) === 'false' ? 'Disconnected' : String(d.gdbState))) : '未发现 gandi 数据库对象';
            html += kvv('连接状态', escHtml(connText), connText === 'Connected' ? 'ok' : 'warn');
            html += kvv('vm 云通道', d.cloudIO ? '存在' : '无', d.cloudIO ? 'ok' : '');
            if (d.gdbKeys) html += kvv('对象键', escHtml(truncate(d.gdbKeys, 80)), '');
            const shown = scope === 'user' ? pickUserCloudVars(d.cloudVars) : { out: d.cloudVars, uname: '' };
            let cvVal, cvCls;
            if (shown.out.length) { cvVal = shown.out.length + ' 个'; cvCls = 'ok'; }
            else if (scope === 'user' && d.cloudVars.length) { cvVal = '无法区分'; cvCls = 'warn'; }
            else { cvVal = '还没有云数据'; cvCls = ''; }
            html += kvv(scope === 'user' ? '用户云变量' : '作品云变量', cvVal, cvCls);
            if (scope === 'user' && !shown.out.length && d.cloudVars.length) {
                html += '<div class="hint" style="padding:2px 0;">无法区分用户云变量（vm 未暴露）</div>';
            } else if (shown.out.length) {
                html += shown.out.slice(0, 20).map(v =>
                    `<div class="litem"><span class="id">${escHtml(v.name)}</span><span class="n mono">${escHtml(truncate(String(v.value), 40))}</span><span class="n" style="opacity:.55;">${escHtml(v.owner)}</span></div>`
                ).join('');
            }
            const ops = Object.keys(d.dbOps);
            html += kvv('数据库积木', ops.length ? ops.length + ' 种' : '未使用', ops.length ? 'ok' : '');
            if (ops.length) {
                html += ops.map(op =>
                    `<div class="litem"><span class="id">${escHtml(op)}</span><span class="n">× ${d.dbOps[op]}</span></div>`
                ).join('');
            }
            res.innerHTML = html;
            const unmatch = scope === 'user' && !shown.out.length && d.cloudVars.length;
            dbStatus(d.cloudExt.length
                ? (unmatch ? '无法区分用户云变量（vm 未暴露）'
                    : (scope === 'user' ? '✓ 用户云变量猜测：' + shown.out.length + ' 个' : '✓ 云数据扩展已加载'))
                : '该作品未加载云数据扩展',
                d.cloudExt.length ? (unmatch ? '#ffb86c' : '#50fa7b') : '#ffb86c');
        }
        $('#ccw-fb-db-go').onclick = () => dbRender(dbScope);
        $('#ccw-fb-db-recapture').onclick = () => { dbStatus('重新摘取中...', '#ffb86c'); dbRender(dbScope); };
        dbScopeBtns.forEach(b => {
            if (b) b.onclick = () => { dbScope = b.dataset.dbScope === 'user' ? 'user' : 'works'; paintDbScope(); dbRender(dbScope); };
        });
        paintDbScope();

        let activeDevSub = 'tools';
        function paintDevSub() {
            document.querySelectorAll('#ccw-fb-dev-subtabs .stab').forEach(b => b.classList.toggle('active', b.dataset.stab === activeDevSub));
            document.querySelectorAll('#ccw-fb-panel .spage[data-spage]').forEach(p => p.classList.toggle('active', p.dataset.spage === activeDevSub));
        }
        document.querySelectorAll('#ccw-fb-dev-subtabs .stab').forEach(b => {
            b.onclick = () => { activeDevSub = b.dataset.stab; paintDevSub(); };
        });
        paintDevSub();

        const pfxStatus = (m, c) => { const el = $('#ccw-fb-prefix-status'); el.textContent = m; el.style.color = c || 'rgba(255,255,255,.4)'; };
        function findVarInTarget(t, name) {
            if (!t || !t.variables) return null;
            for (const id in t.variables) { const v = t.variables[id]; if (v && v.name === name) return v; }
            return null;
        }
        function restoreVarDirect(t, e) {
            try {
                const isList = e.type === 'list' || Array.isArray(e.value);
                let value;
                try { value = JSON.parse(JSON.stringify(e.value)); } catch (err) { value = isList ? [] : String(e.value); }
                const id = genVarId();
                if (typeof t.createVariable === 'function') { try { t.createVariable(id, e.name, isList ? 'list' : '', false); } catch (err) {} }
                const v = t.variables[id] || (t.variables[id] = { id, name: e.name, type: isList ? 'list' : '', isCloud: false });
                v.name = e.name; v.value = value; v.isCloud = !!e.isCloud;
                return null;
            } catch (err) { return (err && err.message) || String(err); }
        }
        function stageTarget() {
            const vm = findVM();
            return ((vm && vm.runtime && vm.runtime.targets) || []).find(t => t && t.isStage) || null;
        }
        $('#ccw-fb-prefix-exp').onclick = () => {
            const pfx = ($('#ccw-fb-prefix-pfx').value || '').trim();
            if (!pfx) { pfxStatus('✗ 请先填写变量名前缀', '#ff5555'); return; }
            const rows = collectVariables();
            if (!rows) { pfxStatus('✗ 未摘取 vm（打开作品编辑器后重试）', '#ff5555'); return; }
            const hits = rows.filter(r => String(r.name).indexOf(pfx) === 0)
                .map(r => ({ targetId: r.targetId, name: r.name, type: r.type, isCloud: r.isCloud, owner: r.owner, value: r.value }));
            if (!hits.length) { pfxStatus('⚠ 前缀「' + pfx + '」下没有变量 / 列表', '#ffb86c'); return; }
            const code = JSON.stringify({ axon: 1, kind: 'prefix', prefix: pfx, ts: Date.now(), vars: hits });
            $('#ccw-fb-prefix-json').value = code;
            try { navigator.clipboard.writeText(code).then(() => {}, () => {}); } catch (e) {}
            pfxStatus('✓ 已导出 ' + hits.length + ' 个到存档码（并尝试复制到剪贴板）', '#50fa7b');
        };
        $('#ccw-fb-prefix-res').onclick = () => {
            let obj;
            try { obj = JSON.parse($('#ccw-fb-prefix-json').value); } catch (e) { pfxStatus('✗ JSON 解析失败', '#ff5555'); return; }
            const vars = Array.isArray(obj) ? obj : (obj && obj.vars);
            if (!Array.isArray(vars) || !vars.length) { pfxStatus('✗ 存档码中没有变量', '#ff5555'); return; }
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) { pfxStatus('✗ 未摘取 vm（打开作品编辑器后重试）', '#ff5555'); return; }
            const stage = stageTarget();
            let ok = 0, created = 0, fail = 0;
            for (const e of vars) {
                try {
                    const t = findTargetById(e.targetId) || stage;
                    if (!t) { fail++; continue; }
                    const hit = findVarInTarget(t, e.name);
                    if (hit) { hit.value = e.value; ok++; }
                    else { const err = restoreVarDirect(t, e); if (err) fail++; else created++; }
                } catch (err) { fail++; }
            }
            emitWorkspace();
            renderVarList(true);
            pfxStatus('✓ 恢复完成：覆盖 ' + ok + ' / 新建 ' + created + (fail ? ' / 失败 ' + fail : ''), fail ? '#ffb86c' : '#50fa7b');
        };

        const lqStatus = (m, c) => { const el = $('#ccw-fb-lq-status'); el.textContent = m; el.style.color = c || 'rgba(255,255,255,.4)'; };
        function getListRow(selVal) {
            const s = String(selVal || '');
            const i = s.indexOf('|');
            if (i < 0) return null;
            const t = findTargetById(s.slice(0, i));
            const v = (t && t.variables) ? t.variables[s.slice(i + 1)] : null;
            if (!t || !v) return null;
            return { t, v, row: { targetId: t.id, varId: s.slice(i + 1) } };
        }
        document.querySelectorAll('#ccw-fb-panel [data-lq-op]').forEach(btn => {
            btn.onclick = () => {
                const g = getListRow($('#ccw-fb-lq-src').value);
                if (!g) { lqStatus('✗ 请先选择源列表（打开作品编辑器后有列表可选）', '#ff5555'); return; }
                const err = mutateList(g.row, btn.dataset.lqOp);
                if (err) { lqStatus('✗ 操作失败: ' + err, '#ff5555'); return; }
                lqStatus('✓ 已对「' + g.v.name + '」执行「' + (listOpName[btn.dataset.lqOp] || btn.dataset.lqOp) + '」', '#50fa7b');
                renderVarList(true);
            };
        });
        $('#ccw-fb-lq-copy').onclick = () => {
            const src = getListRow($('#ccw-fb-lq-src').value);
            const dst = getListRow($('#ccw-fb-lq-dst').value);
            if (!src || !dst) { lqStatus('✗ 请选择源列表和目标列表', '#ff5555'); return; }
            if (src.v === dst.v) { lqStatus('⚠ 源和目标是同一个列表', '#ffb86c'); return; }
            try {
                dst.v.value = JSON.parse(JSON.stringify(src.v.value));
                emitWorkspace();
                lqStatus('✓ 已把「' + src.v.name + '」（' + (Array.isArray(src.v.value) ? src.v.value.length : 0) + ' 项）复制到「' + dst.v.name + '」', '#50fa7b');
                renderVarList(true);
            } catch (e) { lqStatus('✗ 复制失败: ' + ((e && e.message) || e), '#ff5555'); }
        };

        const flStatus = (m, c) => { const el = $('#ccw-fb-fl-status'); el.textContent = m; el.style.color = c || 'rgba(255,255,255,.4)'; };
        function flBots() { const a = gLoad(GKEY.bots, []); return Array.isArray(a) ? a : []; }
        function flPaint() {
            const bots = flBots();
            fillSelect($('#ccw-fb-fl-bot'), bots.length
                ? bots.map((b, i) => ({ value: String(i), label: b.name + ' · ' + truncate(b.url.replace(/^https?:\/\//, ''), 34) }))
                : [{ value: '', label: '（暂无机器人，先添加）' }]);
        }
        $('#ccw-fb-fl-add').onclick = () => {
            const name = ($('#ccw-fb-fl-name').value || '').trim();
            const url = ($('#ccw-fb-fl-url').value || '').trim();
            if (!name) { flStatus('✗ 请填写备注名', '#ff5555'); return; }
            if (!/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//.test(url)) {
                flStatus('✗ webhook 需以 https://open.feishu.cn/open-apis/bot/v2/hook/… 完整地址', '#ff5555'); return;
            }
            const bots = flBots();
            if (bots.some(b => b.url === url)) { flStatus('⚠ 该 webhook 已存在', '#ffb86c'); return; }
            bots.push({ id: Date.now().toString(36), name, url });
            gSave(GKEY.bots, bots);
            $('#ccw-fb-fl-name').value = ''; $('#ccw-fb-fl-url').value = '';
            flPaint();
            flStatus('✓ 已添加机器人「' + name + '」（本地保存）', '#50fa7b');
        };
        $('#ccw-fb-fl-del').onclick = () => {
            const bots = flBots();
            const idx = Number($('#ccw-fb-fl-bot').value);
            if (!bots.length || isNaN(idx) || !bots[idx]) { flStatus('⚠ 没有可删除的机器人', '#ffb86c'); return; }
            if (!confirm('删除机器人「' + bots[idx].name + '」？')) return;
            bots.splice(idx, 1);
            gSave(GKEY.bots, bots);
            flPaint();
            flStatus('✓ 已删除', '#50fa7b');
        };
        $('#ccw-fb-fl-scan').onclick = () => {
            const rows = collectVariables();
            if (!rows) { flStatus('✗ 未摘取 vm（打开作品编辑器后重试）', '#ff5555'); return; }
            const lines = rows.map(r => {
                const isArr = Array.isArray(r.value) || r.type === 'list';
                const tag = r.owner + (r.isCloud ? ' ☁' : '');
                if (isArr) {
                    const a = Array.isArray(r.value) ? r.value : [];
                    return r.name + ' = 列表[' + a.length + '] ' + truncate(JSON.stringify(a), 80) + '（' + tag + '）';
                }
                return r.name + ' = ' + truncate(String(r.value), 80) + '（' + tag + '）';
            });
            let text = '【AXON 变量扫描】' + new Date().toLocaleString('zh-CN', { hour12: false }) + '\n' + lines.slice(0, 60).join('\n');
            if (lines.length > 60) text += '\n…（共 ' + lines.length + ' 个，已截断）';
            $('#ccw-fb-fl-msg').value = text;
            flStatus('✓ 已扫描 ' + rows.length + ' 个变量 / 列表到消息框（可编辑后发送）', '#50fa7b');
        };
        $('#ccw-fb-fl-send').onclick = async () => {
            const bots = flBots();
            const idx = Number($('#ccw-fb-fl-bot').value);
            const bot = bots[idx];
            if (!bot) { flStatus('✗ 请先选择 / 添加机器人', '#ff5555'); return; }
            const msg = $('#ccw-fb-fl-msg').value;
            if (!msg.trim()) { flStatus('✗ 消息内容为空', '#ff5555'); return; }
            flStatus('发送中…', '#ffb86c');
            try {
                const r = await gmxhr({
                    method: 'POST', url: bot.url, timeout: 15000,
                    headers: { 'content-type': 'application/json' },
                    data: JSON.stringify({ msg_type: 'text', content: { text: msg } }),
                });
                let j = null;
                try { j = JSON.parse(r.responseText); } catch (e) {}
                if (j && (j.code === 0 || j.StatusCode === 0)) flStatus('✓ 已发送到「' + bot.name + '」', '#50fa7b');
                else flStatus('✗ 发送失败: ' + truncate((j && (j.msg || j.msgZH || j.ErrorMessage)) || r.responseText || ('HTTP ' + r.status), 120), '#ff5555');
            } catch (e) {
                flStatus('✗ 发送失败: ' + ((e && e.message) || e), '#ff5555');
            }
        };
        flPaint();

        /* ---------- 系统页：快照库 / 回收站 / 清空本地记录 ---------- */
        const syStatus = (elId, m, c) => { const el = $(elId); el.textContent = m; el.style.color = c || 'rgba(255,255,255,.4)'; };
        function snapLib() { const a = gLoad(GKEY.snaps, []); return Array.isArray(a) ? a : []; }
        function renderSnapList() {
            const box = $('#ccw-fb-sy-snap-list');
            const list = snapLib();
            box.innerHTML = list.length ? list.map((s, i) =>
                `<div class="litem" style="flex-wrap:wrap;gap:6px;">
                    <span class="id">${escHtml(s.name)}</span>
                    <span class="n">${s.vars.length} 个变量 · ${new Date(s.ts).toLocaleString('zh-CN', { hour12: false })}</span>
                    <button class="gbtn sm success" data-snap-res="${i}" style="padding:2px 8px;">还原</button>
                    <button class="gbtn sm" data-snap-exp="${i}" style="padding:2px 8px;">导出</button>
                    <button class="gbtn sm danger" data-snap-del="${i}" style="padding:2px 8px;">删除</button>
                </div>`).join('') : '<span class="hint">暂无快照</span>';
            box.querySelectorAll('[data-snap-res]').forEach(b => { b.onclick = () => restoreSnap(Number(b.dataset.snapRes)); });
            box.querySelectorAll('[data-snap-exp]').forEach(b => {
                b.onclick = () => {
                    const s = snapLib()[Number(b.dataset.snapExp)];
                    if (!s) return;
                    $('#ccw-fb-sy-snap-json').value = JSON.stringify(s);
                    syStatus('#ccw-fb-sy-snap-status', '✓ 快照「' + s.name + '」已写入下方 JSON（可复制存档）', '#50fa7b');
                };
            });
            box.querySelectorAll('[data-snap-del]').forEach(b => {
                b.onclick = () => {
                    const i = Number(b.dataset.snapDel);
                    const s = snapLib()[i];
                    if (!s) return;
                    if (!confirm('删除快照「' + s.name + '」？')) return;
                    const list = snapLib(); list.splice(i, 1); gSave(GKEY.snaps, list);
                    renderSnapList();
                    syStatus('#ccw-fb-sy-snap-status', '✓ 已删除快照', '#50fa7b');
                };
            });
        }
        function restoreSnap(i) {
            const s = snapLib()[i];
            if (!s) return;
            const vm = findVM();
            if (!vm || !vm.runtime || !vm.runtime.targets) { syStatus('#ccw-fb-sy-snap-status', '✗ 未摘取 vm（打开作品编辑器后重试）', '#ff5555'); return; }
            const stage = stageTarget();
            let ok = 0, created = 0, fail = 0;
            for (const e of s.vars) {
                try {
                    const t = findTargetById(e.targetId) || stage;
                    if (!t) { fail++; continue; }
                    const hit = findVarInTarget(t, e.name);
                    if (hit) { hit.value = e.value; ok++; }
                    else { const err = restoreVarDirect(t, e); if (err) fail++; else created++; }
                } catch (err) { fail++; }
            }
            emitWorkspace();
            renderVarList(true);
            syStatus('#ccw-fb-sy-snap-status', '✓ 快照「' + s.name + '」还原：覆盖 ' + ok + ' / 新建 ' + created + (fail ? ' / 失败 ' + fail : ''), fail ? '#ffb86c' : '#50fa7b');
        }
        $('#ccw-fb-sy-snap-cap').onclick = () => {
            const rows = collectVariables();
            if (!rows) { syStatus('#ccw-fb-sy-snap-status', '✗ 未摘取 vm（打开作品编辑器后重试）', '#ff5555'); return; }
            let name = ($('#ccw-fb-sy-snap-name').value || '').trim();
            if (!name) name = '快照 ' + new Date().toLocaleString('zh-CN', { hour12: false });
            const list = snapLib();
            const exist = list.findIndex(s => s.name === name);
            const snap = {
                name, ts: Date.now(),
                vars: rows.map(r => {
                    let cv;
                    try { cv = JSON.parse(JSON.stringify(r.value)); } catch (e) { cv = Array.isArray(r.value) ? [] : String(r.value); }
                    return { targetId: r.targetId, name: r.name, type: r.type, isCloud: r.isCloud, value: cv };
                }),
            };
            if (exist >= 0) list[exist] = snap; else list.push(snap);
            gSave(GKEY.snaps, list.slice(-30));
            renderSnapList();
            syStatus('#ccw-fb-sy-snap-status', '✓ 已摘取快照「' + name + '」（' + snap.vars.length + ' 个变量，本地持久化）', '#50fa7b');
        };
        $('#ccw-fb-sy-snap-imp').onclick = () => {
            let obj;
            try { obj = JSON.parse($('#ccw-fb-sy-snap-json').value); } catch (e) { syStatus('#ccw-fb-sy-snap-status', '✗ JSON 解析失败', '#ff5555'); return; }
            const vars = Array.isArray(obj) ? obj : (obj && obj.vars);
            if (!Array.isArray(vars) || !vars.length) { syStatus('#ccw-fb-sy-snap-status', '✗ JSON 中没有变量数据', '#ff5555'); return; }
            const name = (obj && obj.name) || ('导入快照 ' + new Date().toLocaleString('zh-CN', { hour12: false }));
            const list = snapLib();
            list.push({ name, ts: (obj && obj.ts) || Date.now(), vars });
            gSave(GKEY.snaps, list.slice(-30));
            renderSnapList();
            syStatus('#ccw-fb-sy-snap-status', '✓ 已导入快照「' + name + '」（' + vars.length + ' 个变量），可点「还原」', '#50fa7b');
        };
        renderSnapList();

        function renderRbList() {
            const box = $('#ccw-fb-sy-rb-list');
            const a = rbLoad();
            box.innerHTML = a.length ? a.slice().reverse().map((e, ri) => {
                const i = a.length - 1 - ri;
                const isArr = e.type === 'list' || Array.isArray(e.value);
                return `<div class="litem" style="flex-wrap:wrap;gap:6px;">
                    <span class="badge ${isArr ? 'warning' : ''}" style="margin:0;">${isArr ? '列表' : '变量'}</span>
                    <span class="id">${escHtml(e.name)}</span>
                    <span class="n mono">${escHtml(truncate(JSON.stringify(e.value), 30))}</span>
                    <span class="n" style="opacity:.55;">${escHtml(e.targetLabel || '')}</span>
                    <button class="gbtn sm success" data-rb-res="${i}" style="padding:2px 8px;">还原</button>
                </div>`;
            }).join('') : '<span class="hint">回收站是空的（删除的变量会自动进来）</span>';
            box.querySelectorAll('[data-rb-res]').forEach(b => {
                b.onclick = () => {
                    const i = Number(b.dataset.rbRes);
                    const a2 = rbLoad();
                    const e = a2[i];
                    if (!e) return;
                    const vm = findVM();
                    if (!vm || !vm.runtime || !vm.runtime.targets) { syStatus('#ccw-fb-sy-rb-status', '✗ 未摘取 vm（打开作品编辑器后重试）', '#ff5555'); return; }
                    const t = findTargetById(e.targetId) || stageTarget();
                    if (!t) { syStatus('#ccw-fb-sy-rb-status', '✗ 原目标与舞台都不存在，无法还原', '#ff5555'); return; }
                    const err = restoreVarDirect(t, e);
                    if (err) { syStatus('#ccw-fb-sy-rb-status', '✗ 还原失败: ' + err, '#ff5555'); return; }
                    a2.splice(i, 1); gSave(GKEY.recycle, a2);
                    emitWorkspace();
                    renderRbList();
                    renderVarList(true);
                    syStatus('#ccw-fb-sy-rb-status', '✓ 已还原「' + e.name + '」到「' + (t.isStage ? '舞台(全局)' : safeGet(() => t.getName(), t.id)) + '」', '#50fa7b');
                };
            });
        }
        $('#ccw-fb-sy-rb-refresh').onclick = () => { renderRbList(); syStatus('#ccw-fb-sy-rb-status', '✓ 已刷新（当前 ' + rbLoad().length + ' 条）', '#50fa7b'); };
        $('#ccw-fb-sy-rb-clear').onclick = () => {
            const n = rbLoad().length;
            if (!n) { syStatus('#ccw-fb-sy-rb-status', '⚠ 回收站已是空的', '#ffb86c'); return; }
            if (!confirm('清空回收站的 ' + n + ' 条记录？不可恢复。')) return;
            gSave(GKEY.recycle, []);
            renderRbList();
            syStatus('#ccw-fb-sy-rb-status', '✓ 已清空回收站', '#50fa7b');
        };
        renderRbList();
        $('#ccw-fb-sy-wipe').onclick = () => {
            if (!confirm('确认清空 AXON 的全部本地记录？\n\n绕过映射、发布缓存、机器人、快照库、回收站、插件都会被删除，不可恢复。')) return;
            let n = 0;
            FB_ALL_KEYS.forEach(k => { try { GM_deleteValue(k); n++; } catch (e) {} });
            syStatus('#ccw-fb-sy-wipe-status', '✓ 已清空 ' + n + ' 项本地记录（建议刷新页面让开关状态复位）', '#50fa7b');
            toast('AXON 本地记录已清空');
        };

        /* ---------- 插件页：插件运行时 ---------- */
        const plugStatus = (m, c) => { const el = $('#ccw-fb-plug-status'); el.textContent = m; el.style.color = c || 'rgba(255,255,255,.4)'; };
        function plugStore() { const a = gLoad(GKEY.plugins, []); return Array.isArray(a) ? a : []; }
        const noopChain = () => new Proxy(function () {}, {
            get: (t, k) => (k === Symbol.toPrimitive ? () => '' : noopChain()),
            apply: () => noopChain(),
            set: () => true,
        });
        function makePlugCtx(def, rootEl) {
            const pkey = 'ccw_fb_plugset_' + strHash(String(def.id || def.name || 'anon'));
            const kvStore = {
                get: (k, d) => { const o = gLoad(pkey, {}); return (o && k in o) ? o[k] : d; },
                set: (k, v) => { const o = gLoad(pkey, {}) || {}; o[k] = v; gSave(pkey, o); },
            };
            return {
                root: rootEl,
                store: kvStore,
                settings: kvStore,
                variables: () => collectVariables() || [],
                onVariables: fn => { if (typeof fn === 'function') plugVarCbs.push(fn); },
                write: (name, value) => {
                    const rows = collectVariables() || [];
                    const r = rows.find(x => x.name === name);
                    if (!r) return false;
                    return !setVariableValue({ targetId: r.targetId, varId: r.varId }, String(value));
                },
                toast: m => toast(m),
                project: {
                    get id() { return safeGet(() => findVM().runtime.projectId, ''); },
                    get name() {
                        return safeGet(() => {
                            const v = findVM();
                            return (v && v.editingTarget && v.editingTarget.getName) ? v.editingTarget.getName() : '';
                        }, '');
                    },
                },
                alias: {},
                net: {
                    get: (url, headers) => gmxhr({ method: 'GET', url, headers: headers || {} }).then(r => r.responseText),
                    post: (url, data, headers) => gmxhr({
                        method: 'POST', url,
                        headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
                        data: typeof data === 'string' ? data : JSON.stringify(data),
                    }).then(r => r.responseText),
                },
                ui: () => noopChain(),
            };
        }
        function runPlugins() {
            const area = $('#ccw-fb-plug-area');
            if (!area) return;
            plugVarCbs.length = 0;
            plugStyleEls.splice(0).forEach(s => { try { s.remove(); } catch (e) {} });
            area.innerHTML = '';
            let mounted = 0, skipped = 0, failed = 0;
            const entries = plugStore();
            for (const p of entries) {
                if (!p.enabled) continue;
                const defs = [];
                const shim = { version: 'axon-3.5.0', plugin: d => { if (d && typeof d === 'object') defs.push(d); } };
                try {
                    new Function('VaIMod', p.src)(shim);
                } catch (e) {
                    failed++;
                    console.warn('[AXON] 插件加载出错「' + p.name + '」:', e);
                    continue;
                }
                for (const d of defs) {
                    if ((d.type || 'ext') === 'patch') {
                        skipped++;
                        console.warn('[AXON] 插件「' + (d.name || d.id || p.name) + '」为 patch 类型，暂不支持，已跳过');
                        continue;
                    }
                    if (d.id && !p.pid) p.pid = d.id;
                    const card = document.createElement('div');
                    card.className = 'card';
                    const ct = document.createElement('div');
                    ct.className = 'ct';
                    ct.textContent = d.name || p.name;
                    const body = document.createElement('div');
                    card.appendChild(ct); card.appendChild(body);
                    if (typeof d.css === 'string' && d.css) {
                        const st = document.createElement('style');
                        st.textContent = d.css;
                        (document.head || document.documentElement).appendChild(st);
                        plugStyleEls.push(st);
                    }
                    if (d.html) body.innerHTML = d.html;
                    area.appendChild(card);
                    const ctx = makePlugCtx(d, body);
                    try { if (typeof d.code === 'function') d.code(ctx); } catch (e) { console.warn('[AXON] 插件 code 出错「' + ct.textContent + '」:', e); }
                    try { if (typeof d.refresh === 'function') d.refresh(ctx); } catch (e) {}
                    mounted++;
                }
            }
            if (entries.some(p => p.pid)) gSave(GKEY.plugins, entries);
            if (!entries.some(p => p.enabled)) plugStatus('已启用的插件会挂载在下方（上传后自动加载）', '');
            else if (mounted || skipped || failed) {
                plugStatus('挂载 ' + mounted + ' 个插件'
                    + (skipped ? ' / 跳过 patch ' + skipped + ' 个' : '')
                    + (failed ? ' / 加载出错 ' + failed + ' 个（见控制台）' : ''), failed ? '#ffb86c' : '#50fa7b');
            }
        }
        function renderPlugList() {
            const box = $('#ccw-fb-plug-list');
            const a = plugStore();
            box.innerHTML = a.length ? a.map((p, i) =>
                `<div class="litem" style="flex-wrap:wrap;gap:6px;">
                    <span class="badge ${p.enabled ? 'success' : ''}" style="margin:0;">${p.enabled ? '启用' : '停用'}</span>
                    <span class="id">${escHtml(p.name)}</span>
                    ${p.pid ? `<span class="n mono">${escHtml(p.pid)}</span>` : ''}
                    <button class="gbtn sm ${p.enabled ? 'warning' : 'success'}" data-plug-tg="${i}" style="padding:2px 8px;">${p.enabled ? '停用' : '启用'}</button>
                    <button class="gbtn sm danger" data-plug-rm="${i}" style="padding:2px 8px;">卸载</button>
                </div>`).join('') : '<span class="hint">尚未上传插件（支持多选 .js）</span>';
            box.querySelectorAll('[data-plug-tg]').forEach(b => {
                b.onclick = () => {
                    const i = Number(b.dataset.plugTg);
                    const a2 = plugStore();
                    if (!a2[i]) return;
                    a2[i].enabled = !a2[i].enabled;
                    gSave(GKEY.plugins, a2);
                    renderPlugList();
                    runPlugins();
                    plugStatus((a2[i].enabled ? '✓ 已启用' : '⚠ 已停用') + '「' + a2[i].name + '」', a2[i].enabled ? '#50fa7b' : '#ffb86c');
                };
            });
            box.querySelectorAll('[data-plug-rm]').forEach(b => {
                b.onclick = () => {
                    const i = Number(b.dataset.plugRm);
                    const a2 = plugStore();
                    if (!a2[i]) return;
                    if (!confirm('卸载插件「' + a2[i].name + '」？其本地设置也会一并清除。')) return;
                    const p = a2.splice(i, 1)[0];
                    gSave(GKEY.plugins, a2);
                    try { GM_deleteValue('ccw_fb_plugset_' + strHash(p.pid || p.name)); } catch (e) {}
                    try { GM_deleteValue('ccw_fb_plugset_' + strHash(p.name)); } catch (e) {}
                    renderPlugList();
                    runPlugins();
                    plugStatus('✓ 已卸载「' + p.name + '」', '#50fa7b');
                };
            });
        }
        $('#ccw-fb-plug-file').addEventListener('change', e => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            if (!files.length) return;
            let done = 0, over = 0, added = 0;
            const store = plugStore();
            const finishOne = () => {
                gSave(GKEY.plugins, store);
                renderPlugList();
                runPlugins();
                plugStatus('✓ 导入完成：新增 ' + added + ' / 覆盖升级 ' + over + (added + over ? '（已自动加载）' : ''), '#50fa7b');
            };
            files.forEach(f => {
                const rd = new FileReader();
                rd.onload = () => {
                    const src = String(rd.result || '');
                    const fid = strHash(src);
                    const name = f.name.replace(/\.js$/i, '');
                    const hit = store.find(x => x.fid === fid);
                    if (hit) { hit.src = src; hit.name = name; over++; }
                    else { store.push({ fid, name, src, enabled: true, pid: '', addedAt: Date.now() }); added++; }
                    if (++done === files.length) finishOne();
                };
                rd.onerror = () => { if (++done === files.length) finishOne(); };
                rd.readAsText(f);
            });
        });
        $('#ccw-fb-plug-reload').onclick = () => { runPlugins(); plugStatus('✓ 已重新加载插件', '#50fa7b'); };
        renderPlugList();
        runPlugins();
    }

    function togglePanel(force) {
        const ball = $('#ccw-fb-ball');
        const panel = $('#ccw-fb-panel');
        const show = force !== undefined ? force : !panel.classList.contains('open');
        panel.classList.toggle('open', show);
        if (show) {
            const r = ball.getBoundingClientRect();
            panel.style.right = 'auto'; panel.style.bottom = 'auto';
            let px = r.left - 560 - 12;
            if (px < 8) px = Math.min(W.innerWidth - 568, r.right + 12);
            let py = Math.max(8, Math.min(W.innerHeight - panel.offsetHeight - 8, r.top));
            panel.style.left = px + 'px';
            panel.style.top = py + 'px';
            renderActive();
        }
    }

    /* ==========================================================================
     * 6. 数据采集（开发者向）
     * ========================================================================== */
    function detectBrowser() {
        const ua = navigator.userAgent;
        if (/EdgA?\//.test(ua)) return 'Edge ' + (ua.match(/EdgA?\/([\d.]+)/)?.[1] || '');
        if (/OPR\//.test(ua)) return 'Opera ' + (ua.match(/OPR\/([\d.]+)/)?.[1] || '');
        if (/Chrome\//.test(ua)) return 'Chrome ' + (ua.match(/Chrome\/([\d.]+)/)?.[1] || '');
        if (/Firefox\//.test(ua)) return 'Firefox ' + (ua.match(/Firefox\/([\d.]+)/)?.[1] || '');
        if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari ' + (ua.match(/Version\/([\d.]+)/)?.[1] || '');
        return '未知';
    }

    function detectAuth() {
        const cookies = document.cookie || '';
        const cookieKeys = cookies.split(';').map(s => s.trim().split('=')[0]).filter(Boolean);
        const authCookieKeys = cookieKeys.filter(k => /token|auth|session|sid|jwt|uid|user/i.test(k));

        let lsKeys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (/token|auth|session|user|jwt/i.test(k)) lsKeys.push(k);
            }
        } catch (e) {}

        const userPaths = [
            () => W.__INITIAL_STATE__?.user,
            () => W.__INITIAL_STATE__?.userInfo,
            () => W.__INITIAL_STATE__?.me,
            () => W.__NEXT_DATA__?.props?.pageProps?.user,
            () => W.__NEXT_DATA__?.props?.pageProps?.userInfo,
            () => W.$store?.state?.user,
            () => W.$store?.state?.userInfo,
            () => W.store?.getState?.()?.user,
            () => W.userInfo,
            () => W.currentUser,
            () => W.gandi?.user,
        ];
        let foundUser = null, foundPath = null;
        for (let i = 0; i < userPaths.length; i++) {
            const u = safeGet(userPaths[i], null);
            if (u && (u.id || u.user_id || u._id || u.nickname || u.username)) {
                foundUser = u;
                foundPath = ['__INITIAL_STATE__.user', '__INITIAL_STATE__.userInfo', '__INITIAL_STATE__.me',
                             '__NEXT_DATA__..user', '__NEXT_DATA__..userInfo', '$store.state.user',
                             '$store.state.userInfo', 'store.getState().user', 'userInfo', 'currentUser', 'gandi.user'][i];
                break;
            }
        }

        const hasCookie = authCookieKeys.length > 0;
        const hasLS = lsKeys.length > 0;
        const hasUser = !!foundUser;
        const isLogin = hasCookie || hasLS || hasUser;

        return {
            isLogin,
            hasCookie, hasLS, hasUser,
            cookieKeys: authCookieKeys.slice(0, 5).join(', ') || '—',
            lsKeys: lsKeys.slice(0, 5).join(', ') || '—',
            userPath: foundPath || '—',
            userId: safeGet(() => foundUser.id || foundUser.user_id || foundUser._id),
            nickname: safeGet(() => foundUser.nickname || foundUser.name || foundUser.username),
        };
    }

    function detectGlobals() {
        const known = [
            '__INITIAL_STATE__', '__NEXT_DATA__', '__NUXT__', '__APP__', '__REDUX_STATE__',
            '$store', 'store', 'gandi', 'GandiIDE', 'vm', 'scratchVM', 'scratch',
            'Blockly', 'ScratchBlocks', 'CodeMirror', 'monaco',
            'React', 'ReactDOM', 'Vue', 'angular',
            'webpackChunk', 'webpackJsonp', '__webpack_require__',
        ];
        const found = [];
        known.forEach(k => { if (W[k] !== undefined) found.push(k); });
        return found;
    }

    function detectPerf() {
        const m = performance.memory || {};
        const nav = performance.getEntriesByType?.('navigation')?.[0] || {};
        return {
            heap: m.usedJSHeapSize ? fmtBytes(m.usedJSHeapSize) + ' / ' + fmtBytes(m.jsHeapSizeLimit) : '—',
            dom: document.getElementsByTagName('*').length,
            load: nav.duration ? (nav.duration / 1000).toFixed(2) + 's' : '—',
            resources: performance.getEntriesByType?.('resource')?.length ?? 0,
            fps: fpsValue,
        };
    }

    let fpsValue = 0, frames = 0, lastT = performance.now();
    (function loop(t) {
        frames++;
        const now = t || performance.now();
        if (now - lastT >= 1000) {
            fpsValue = Math.round(frames * 1000 / (now - lastT));
            frames = 0; lastT = now;
        }
        requestAnimationFrame(loop);
    })();

    const kv = (k, v, cls = '') => `<div class="kv"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`;
    const card = (title, inner) => `<div class="card"><div class="ct">${title}</div>${inner}</div>`;

    function renderOverview() {
        const el = $('#ccw-fb-page-overview');
        if (!el) return;

        const auth = detectAuth();
        const globals = detectGlobals();
        const perf = detectPerf();
        const browser = detectBrowser();

        const authHtml =
            kv('组合判定', auth.isLogin ? '已登录' : '未登录', auth.isLogin ? 'ok' : 'bad') +
            kv('Cookie 嗅探', auth.hasCookie ? auth.cookieKeys : '无', auth.hasCookie ? 'ok' : '') +
            kv('localStorage', auth.hasLS ? auth.lsKeys : '无', auth.hasLS ? 'ok' : '') +
            kv('全局 user', auth.hasUser ? auth.userPath : '未找到', auth.hasUser ? 'ok' : 'warn') +
            kv('用户 ID', auth.userId) +
            kv('昵称', auth.nickname);

        const globalsHtml = globals.length
            ? globals.map(g => `<span class="badge">${g}</span>`).join('')
            : '<span class="hint">未检测到常见全局对象</span>';

        const envHtml =
            kv('浏览器', browser) +
            kv('路径', truncate(location.pathname + location.search, 60)) +
            kv('视口', W.innerWidth + '×' + W.innerHeight) +
            kv('FPS', perf.fps, perf.fps > 50 ? 'ok' : (perf.fps > 25 ? 'warn' : 'bad')) +
            kv('JS 堆', perf.heap) +
            kv('DOM', perf.dom) +
            kv('资源数', perf.resources) +
            kv('加载耗时', perf.load);

        el.innerHTML =
            card('登录态', authHtml) +
            card('全局对象', `<div style="padding:2px 0;">${globalsHtml}</div>`) +
            card('环境 / 性能', envHtml);
    }

    function renderNetwork() {
        const el = $('#ccw-fb-page-network');
        if (!el) return;

        const callsHtml = recentCalls.length
            ? recentCalls.slice(0, 20).map(c => {
                const isWrite = !/^(GET|HEAD|OPTIONS)$/.test(c.method);
                const statusCls = (typeof c.status === 'number' && c.status >= 200 && c.status < 300) ? 'ok' : (c.status === 'ERR' || c.status >= 400 ? 'err' : '');
                return `<div class="call ${isWrite ? 'write' : ''}">
                    <span class="m">${c.method}</span>
                    <span class="u" title="${c.url}">${truncate(c.url, 90)}</span>
                    <span class="s ${statusCls}">${c.status}</span>
                    <span class="t">${c.ms}ms</span>
                </div>`;
            }).join('')
            : '<span class="hint">暂无请求</span>';

        const wsHtml = sockets.length
            ? sockets.slice(0, 5).map(s => {
                const cls = s.state === 'open' ? 'ok' : (s.state === 'error' || s.state === 'closed' ? 'bad' : 'warn');
                return kv(s.state, truncate(s.url, 60), cls);
            }).join('')
            : kv('WS', '暂无连接');

        el.innerHTML =
            card(`最近 API（前 20 条）<span style="flex:1"></span><button class="gbtn sm danger" id="ccw-fb-clear">清空</button>`, callsHtml) +
            card('WebSocket', wsHtml);

        const clearBtn = $('#ccw-fb-clear');
        if (clearBtn) clearBtn.onclick = () => { recentCalls.length = 0; renderNetwork(); };
    }

    function renderExtState() {
        const el = $('#ccw-fb-vmstate');
        if (!el) return;
        const src = vmSource();
        const vm = findVM();
        if (src && vm) {
            const et = vm.editingTarget;
            el.innerHTML =
                kv('vm 状态', '已摘取', 'ok') +
                kv('来源', src, 'accent') +
                kv('编辑目标', et ? safeGet(() => et.getName(), '已加载') : '无（未打开作品）', et ? 'ok' : '') +
                kv('extensionManager', vm.extensionManager ? '存在' : '—');
        } else {
            el.innerHTML =
                kv('vm 状态', trapHit ? '陷阱已命中但未存取' : '未摘取', 'warn') +
                kv('bind 陷阱', trapHit ? '已触发' : '等待编辑器初始化', trapHit ? 'ok' : '') +
                kv('提示', '打开 Gandi 编辑器作品页后自动摘取', '');
        }
    }

    function renderActive() {
        if (activeTab === 'overview') renderOverview();
        else if (activeTab === 'network') renderNetwork();
        else if (activeTab === 'ext') renderExtState();
        const t = $('#ccw-fb-time');
        if (t) t.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    }

    setInterval(() => {
        const panel = $('#ccw-fb-panel');
        if (!panel || !panel.classList.contains('open')) return;
        if (activeTab === 'overview' || activeTab === 'network' || activeTab === 'ext') {
            renderActive();
        } else if (activeTab === 'dev' && renderVarListFn) {
            renderVarListFn(false);
        }
        for (const fn of plugVarCbs) { try { fn(); } catch (e) {} }
    }, 1000);

    function boot() {
        buildDOM();
        if (!document.getElementById('ccw-fb-root')) setTimeout(boot, 100);
    }
    boot();

    GM_registerMenuCommand('打开 / 关闭油猴面板', () => togglePanel());
    GM_registerMenuCommand('重置油猴面板位置', () => {
        GM_setValue('ccw_fb_pos', null);
        const ball = $('#ccw-fb-ball');
        if (ball) {
            ball.style.left = 'auto'; ball.style.top = 'auto';
            ball.style.right = '22px'; ball.style.bottom = '22px';
        }
    });

    console.log('[CCW 开发者数据] v3.5 已加载（未知扩展发布绕过: ' + (allowUnknownEnabled() ? '开' : '关') + '）');
})();
