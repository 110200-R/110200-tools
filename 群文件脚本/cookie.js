// 部分无用功能例如ui请自行删除

// ==UserScript==
// @name         Cookie 全量导出器
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  导出浏览器全部 Cookie 为 JSON 文件
// @author       Маскировка
// @match        *://*/*
// @grant        GM_cookie
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const BROWSER_RULES = [
        { name: 'Edge',     ua: /Edg\//,      engine: 'Chromium' },
        { name: 'OperaGX',  ua: /OPR\/.*GX/,  engine: 'Chromium' },
        { name: 'Opera',    ua: /OPR\//,      engine: 'Chromium' },
        { name: 'Brave',    ua: /Brave\//,    engine: 'Chromium' },
        { name: 'Vivaldi',  ua: /Vivaldi\//,  engine: 'Chromium' },
        { name: 'Chrome',   ua: /Chrome\//,   engine: 'Chromium' },
        { name: 'Chromium', ua: /Chromium\//, engine: 'Chromium' },
        { name: 'Firefox',  ua: /Firefox\//,  engine: 'Gecko'    },
        { name: 'Safari',   ua: /Safari\//,   engine: 'WebKit'   }
    ];

    function detectBrowser() {
        const ua = navigator.userAgent;
        for (const rule of BROWSER_RULES) {
            if (rule.ua.test(ua)) {
                const versionMatch = ua.match(
                    new RegExp(rule.name.replace('GX', '') + '\\/([\\d.]+)')
                );
                const majorMatch = ua.match(/(Chrome|Chromium|Edg|OPR)\/(\d+)/);
                return {
                    name: rule.name,
                    engine: rule.engine,
                    version: versionMatch ? versionMatch[1] : 'unknown',
                    chromiumMajor: rule.engine === 'Chromium' && majorMatch
                        ? parseInt(majorMatch[2], 10)
                        : 0
                };
            }
        }
        return { name: 'Unknown', engine: 'Unknown', version: 'unknown', chromiumMajor: 0 };
    }

    function parsePrefix(name) {
        if (name.startsWith('__Host-'))   return 'Host';
        if (name.startsWith('__Secure-')) return 'Secure';
        return null;
    }

    const SAME_SITE_LABEL = {
        'no_restriction': 'None',
        'lax':            'Lax',
        'strict':         'Strict',
        'unspecified':    'Unspecified'
    };

    function normalizeCookie(c) {
        return {
            name:       c.name,
            value:      c.value,
            domain:     c.domain || '',
            path:       c.path || '/',
            expires:    c.expirationDate || null,
            httpOnly:   c.httpOnly === true,
            secure:     c.secure === true,
            sameSite:   c.sameSite || 'unspecified',
            sameSiteLabel: SAME_SITE_LABEL[c.sameSite] || 'Unspecified',
            hostOnly:   c.hostOnly === true,
            session:    c.session === true,
            prefix:     parsePrefix(c.name),
            partitionKey: c.partitionKey
                ? {
                    topLevelSite: c.partitionKey.topLevelSite,
                    hasCrossSiteAncestor: c.partitionKey.hasCrossSiteAncestor === true
                }
                : null
        };
    }

    function buildSummary(cookies) {
        const summary = {
            total:          cookies.length,
            session:        0,
            persistent:     0,
            secure:         0,
            httpOnly:       0,
            partitioned:    0,
            prefixedHost:   0,
            prefixedSecure: 0,
            uniqueDomains:  0,
            sameSite: { None: 0, Lax: 0, Strict: 0, Unspecified: 0 }
        };

        const domains = new Set();

        for (const c of cookies) {
            c.session ? summary.session++ : summary.persistent++;
            if (c.secure)   summary.secure++;
            if (c.httpOnly) summary.httpOnly++;
            if (c.partitionKey) summary.partitioned++;
            if (c.prefix === 'Host')   summary.prefixedHost++;
            if (c.prefix === 'Secure') summary.prefixedSecure++;
            if (c.domain) domains.add(c.domain);
            if (summary.sameSite[c.sameSiteLabel] !== undefined) {
                summary.sameSite[c.sameSiteLabel]++;
            }
        }

        summary.uniqueDomains = domains.size;
        return summary;
    }

    function downloadJSON(jsonStr, filename) {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    function injectStyle() {
        if (document.getElementById('__cookie_exporter_style__')) return;
        const style = document.createElement('style');
        style.id = '__cookie_exporter_style__';
        style.textContent = `
            .ce-overlay {
                position: fixed; inset: 0; z-index: 2147483647;
                background: rgba(15,23,42,.55);
                backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
                animation: ce-fade .15s ease-out;
            }
            @keyframes ce-fade { from { opacity: 0 } to { opacity: 1 } }
            .ce-panel {
                width: 720px; max-width: 92vw; max-height: 86vh;
                background: #fff; border-radius: 12px; overflow: hidden;
                box-shadow: 0 24px 60px rgba(0,0,0,.35);
                display: flex; flex-direction: column;
            }
            .ce-header {
                padding: 18px 22px 14px;
                border-bottom: 1px solid #e5e7eb;
            }
            .ce-title {
                font-size: 16px; font-weight: 700; color: #111827;
            }
            .ce-subtitle {
                margin-top: 4px; font-size: 12px; color: #6b7280;
            }
            .ce-stats {
                display: grid; grid-template-columns: repeat(4, 1fr);
                gap: 8px; padding: 14px 22px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
            }
            .ce-stat {
                background: #fff; border: 1px solid #e5e7eb;
                border-radius: 8px; padding: 8px 10px;
            }
            .ce-stat-label {
                font-size: 10px; color: #9ca3af;
                text-transform: uppercase; letter-spacing: .4px;
            }
            .ce-stat-value {
                font-size: 17px; font-weight: 700; color: #111827;
                margin-top: 2px;
            }
            .ce-body {
                padding: 0; overflow: hidden; flex: 1;
                display: flex; flex-direction: column;
            }
            .ce-textarea {
                flex: 1; min-height: 260px; width: 100%;
                border: none; outline: none; resize: none;
                padding: 14px 22px; box-sizing: border-box;
                font-family: "SF Mono", Consolas, Monaco, monospace;
                font-size: 12px; line-height: 1.55;
                color: #1f2937; background: #fff;
            }
            .ce-footer {
                padding: 12px 22px 16px;
                display: flex; gap: 10px; justify-content: flex-end;
                border-top: 1px solid #e5e7eb; background: #fafafa;
            }
            .ce-btn {
                padding: 8px 18px; font-size: 13px; font-weight: 600;
                border-radius: 8px; border: 1px solid transparent;
                cursor: pointer; transition: all .12s;
                font-family: inherit;
            }
            .ce-btn-primary { background: #2563eb; color: #fff; }
            .ce-btn-primary:hover { background: #1d4ed8; }
            .ce-btn-secondary { background: #fff; color: #374151; border-color: #d1d5db; }
            .ce-btn-secondary:hover { background: #f3f4f6; }
            .ce-btn:disabled { opacity: .55; cursor: default; }
        `;
        document.head.appendChild(style);
    }

    function showPanel(pkg, browser) {
        injectStyle();

        const overlay = document.createElement('div');
        overlay.className = 'ce-overlay';

        const panel = document.createElement('div');
        panel.className = 'ce-panel';

        const header = document.createElement('div');
        header.className = 'ce-header';
        header.innerHTML = `
            <div class="ce-title">Cookie 导出完成</div>
            <div class="ce-subtitle">
                ${browser.name} ${browser.version}
                · ${browser.engine}${browser.chromiumMajor ? ' ' + browser.chromiumMajor : ''}
                · 共 ${pkg.totalCount} 条
            </div>
        `;

        const s = pkg.summary;
        const stats = document.createElement('div');
        stats.className = 'ce-stats';
        const items = [
            ['会话 Cookie', s.session],
            ['持久 Cookie', s.persistent],
            ['Secure',      s.secure],
            ['HttpOnly',    s.httpOnly],
            ['分区 Cookie', s.partitioned],
            ['唯一域名',    s.uniqueDomains],
            ['__Host- 前缀', s.prefixedHost],
            ['__Secure- 前缀', s.prefixedSecure]
        ];
        for (const [label, value] of items) {
            const cell = document.createElement('div');
            cell.className = 'ce-stat';
            cell.innerHTML =
                `<div class="ce-stat-label">${label}</div>` +
                `<div class="ce-stat-value">${value}</div>`;
            stats.appendChild(cell);
        }

        const body = document.createElement('div');
        body.className = 'ce-body';
        const ta = document.createElement('textarea');
        ta.className = 'ce-textarea';
        ta.value = JSON.stringify(pkg, null, 2);
        ta.readOnly = true;
        body.appendChild(ta);

        const footer = document.createElement('div');
        footer.className = 'ce-footer';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'ce-btn ce-btn-secondary';
        copyBtn.textContent = '复制 JSON';
        copyBtn.onclick = () => {
            ta.select();
            ta.setSelectionRange(0, ta.value.length);
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) {}
            copyBtn.textContent = ok ? '已复制' : '复制失败，请手动 Ctrl+C';
            setTimeout(() => { copyBtn.textContent = '复制 JSON'; }, 1500);
        };

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'ce-btn ce-btn-primary';
        downloadBtn.textContent = '下载 JSON 文件';
        downloadBtn.onclick = () => {
            const filename = `cookies_${browser.name.toLowerCase()}_${Date.now()}.json`;
            downloadJSON(ta.value, filename);
            downloadBtn.textContent = '已下载';
            downloadBtn.disabled = true;
            setTimeout(() => {
                downloadBtn.textContent = '下载 JSON 文件';
                downloadBtn.disabled = false;
            }, 1800);
        };

        const closeBtn = document.createElement('button');
        closeBtn.className = 'ce-btn ce-btn-secondary';
        closeBtn.textContent = '关闭';
        closeBtn.onclick = () => document.body.removeChild(overlay);

        footer.appendChild(copyBtn);
        footer.appendChild(downloadBtn);
        footer.appendChild(closeBtn);

        panel.appendChild(header);
        panel.appendChild(stats);
        panel.appendChild(body);
        panel.appendChild(footer);
        overlay.appendChild(panel);

        overlay.addEventListener('click', e => {
            if (e.target === overlay) document.body.removeChild(overlay);
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', escHandler);
                if (document.body.contains(overlay)) document.body.removeChild(overlay);
            }
        });

        document.body.appendChild(overlay);
        ta.focus();
    }

    function exportAllCookies() {
        const browser = detectBrowser();

        GM_cookie.list({}, function (cookies, error) {
            if (error) {
                alert('获取 Cookie 失败：' + error +
                    '\n\n请确认 Tampermonkey：\n' +
                    '设置 → 通用 → 配置模式 = 高级\n' +
                    '设置 → 安全 → 允许脚本访问 Cookie = ALL');
                return;
            }
            if (!cookies || cookies.length === 0) {
                alert('未获取到任何 Cookie。\n请将 Tampermonkey 的“允许脚本访问 Cookie”设为 ALL。');
                return;
            }

            const normalized = cookies.map(normalizeCookie);
            normalized.sort((a, b) => {
                if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
                return a.name.localeCompare(b.name);
            });

            const pkg = {
                formatVersion: '1.0',
                exportTime: new Date().toISOString(),
                source: {
                    browser: browser.name,
                    version: browser.version,
                    engine: browser.engine,
                    chromiumMajor: browser.chromiumMajor || null,
                    supportsPartitioned: browser.chromiumMajor >= 118,
                    platform: navigator.platform,
                    userAgent: navigator.userAgent
                },
                totalCount: normalized.length,
                summary: buildSummary(normalized),
                cookies: normalized
            };

            console.log('[CookieExporter] 已导出 ' + normalized.length + ' 条 Cookie');
            console.log(pkg);

            showPanel(pkg, browser);
        });
    }

    GM_registerMenuCommand('导出所有 Cookie', exportAllCookies);
})();