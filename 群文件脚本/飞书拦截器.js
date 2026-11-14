// ==UserScript==
// @name         飞书拦截器
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  拦截并捕获 ccw.site 上所有发往 open.feishu.cn/open-apis/bot/v2/hook/* 的请求。支持手动筛选（允许/拒绝）或统一拦截模式。
// @author       您
// @match        https://www.ccw.site/detail/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        mode: 'manual',
        debug: true,
        interceptPattern: 'https://open.feishu.cn/open-apis/bot/v2/hook/*'
    };

    function log(...args) {
        if (CONFIG.debug) console.log('[飞书拦截器]', ...args);
    }

    function warn(...args) {
        console.warn('[飞书拦截器]', ...args);
    }

    function matchPattern(url, pattern) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\//g, '\\/') + '$');
        return regex.test(url);
    }

    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    const interceptedRequests = [];

    function extractBotId(url) {
        const match = url.match(/\/hook\/([^\/\?]+)/);
        return match ? match[1] : '未知';
    }

    function extractMessageContent(body) {
        if (!body) return '(无内容)';
        let raw = '';
        if (typeof body === 'string') raw = body;
        else if (body instanceof URLSearchParams) raw = body.toString();
        else if (body instanceof FormData) {
            const parts = [];
            for (const [k, v] of body.entries()) parts.push(`${k}=${v}`);
            raw = parts.join('&');
        } else if (body instanceof Blob) return '(Blob 数据)';
        else if (body instanceof ArrayBuffer) return '(ArrayBuffer 数据)';
        else raw = String(body);

        try {
            const parsed = JSON.parse(raw);
            if (parsed.content && typeof parsed.content === 'object') {
                if (parsed.content.text) return parsed.content.text;
                return JSON.stringify(parsed.content);
            }
            if (parsed.content) return String(parsed.content);
            if (parsed.text) return String(parsed.text);
            return raw.slice(0, 500);
        } catch (e) {
            return raw.slice(0, 500);
        }
    }

    function createDialog(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = '__feishu_interceptor_overlay__';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 2147483647;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 520px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                padding: 16px 20px;
                background: #f5f5f5;
                border-bottom: 1px solid #e0e0e0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
                flex-shrink: 0;
            `;
            header.textContent = '飞书 Webhook 拦截';

            const bodyArea = document.createElement('div');
            bodyArea.style.cssText = `
                padding: 20px;
                flex: 1;
                overflow-y: auto;
                max-height: 60vh;
            `;

            const textarea = document.createElement('textarea');
            textarea.value = message;
            textarea.readOnly = true;
            textarea.style.cssText = `
                margin: 0;
                padding: 12px;
                background: #f8f8f8;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                font-family: Consolas, Monaco, "Courier New", monospace;
                font-size: 13px;
                line-height: 1.6;
                color: #333;
                white-space: pre-wrap;
                word-break: break-all;
                user-select: text;
                -webkit-user-select: text;
                cursor: text;
                width: 100%;
                box-sizing: border-box;
                resize: none;
                outline: none;
                display: block;
                overflow: hidden;
            `;

            const adjustHeight = () => {
                textarea.style.height = 'auto';
                const maxH = window.innerHeight * 0.5;
                const newH = Math.min(textarea.scrollHeight, maxH);
                textarea.style.height = newH + 'px';
                textarea.style.overflowY = textarea.scrollHeight > maxH ? 'auto' : 'hidden';
            };

            textarea.onclick = (e) => {
                e.stopPropagation();
            };
            textarea.onmousedown = (e) => {
                e.stopPropagation();
            };

            bodyArea.appendChild(textarea);

            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 16px 20px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                background: #fafafa;
                flex-shrink: 0;
            `;

            const btnStyle = `
                padding: 8px 20px;
                border-radius: 6px;
                border: none;
                font-size: 14px;
                cursor: pointer;
                transition: opacity 0.2s;
            `;

            const cleanup = () => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            };

            const rejectBtn = document.createElement('button');
            rejectBtn.textContent = '拒绝';
            rejectBtn.style.cssText = btnStyle + `background: #f0f0f0; color: #666;`;
            rejectBtn.onmouseover = () => rejectBtn.style.opacity = '0.8';
            rejectBtn.onmouseout = () => rejectBtn.style.opacity = '1';
            rejectBtn.onclick = (e) => {
                e.stopPropagation();
                cleanup();
                resolve(false);
            };

            const allowBtn = document.createElement('button');
            allowBtn.textContent = '允许';
            allowBtn.style.cssText = btnStyle + `background: #1677ff; color: #fff;`;
            allowBtn.onmouseover = () => allowBtn.style.opacity = '0.85';
            allowBtn.onmouseout = () => allowBtn.style.opacity = '1';
            allowBtn.onclick = (e) => {
                e.stopPropagation();
                cleanup();
                resolve(true);
            };

            footer.appendChild(rejectBtn);
            footer.appendChild(allowBtn);

            dialog.appendChild(header);
            dialog.appendChild(bodyArea);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);

            document.body.appendChild(overlay);

            adjustHeight();
        });
    }

    async function askUserPermission(url, method, body) {
        const botId = extractBotId(url);
        const messageContent = extractMessageContent(body);
        const message = `机器人ID:${botId}\n消息内容:${messageContent}`;
        return await createDialog(message);
    }

    function shouldAllowRequest(url, method, body) {
        if (!matchPattern(url, CONFIG.interceptPattern)) {
            return Promise.resolve(true);
        }

        log('捕获到目标请求:', url, '方法:', method);
        log('原始 body:', body);

        interceptedRequests.push({
            url,
            method,
            body: body ? String(body) : '',
            timestamp: new Date().toISOString()
        });

        if (CONFIG.mode === 'blockAll') {
            warn('统一拦截模式 - 已阻止请求:', url);
            return Promise.resolve(false);
        }

        if (CONFIG.mode === 'manual') {
            return askUserPermission(url, method, body).then((allowed) => {
                log('用户选择:', allowed ? '允许' : '拒绝', '-', url);
                return allowed;
            });
        }

        return Promise.resolve(true);
    }

    window.fetch = function(resource, init) {
        const url = typeof resource === 'string' ? resource : resource.url;
        const method = (init && init.method) || (typeof resource === 'object' && resource.method) || 'GET';
        const body = (init && init.body) || (typeof resource === 'object' && resource.body) || null;

        return shouldAllowRequest(url, method, body).then((allowed) => {
            if (!allowed) {
                warn('Fetch 请求被拦截并拒绝:', url);
                return Promise.reject(new TypeError('请求被用户脚本拦截'));
            }
            log('Fetch 请求放行:', url);
            return originalFetch.apply(this, arguments);
        });
    };

    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._interceptInfo = { method, url, async };
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        const info = this._interceptInfo;
        const self = this;

        if (info && matchPattern(info.url, CONFIG.interceptPattern)) {
            log('XHR 捕获到目标请求:', info.url, '方法:', info.method);
            log('XHR 原始 body:', body);

            shouldAllowRequest(info.url, info.method, body).then((allowed) => {
                if (!allowed) {
                    warn('XHR 请求被拦截并拒绝:', info.url);
                    setTimeout(() => {
                        if (typeof self.onerror === 'function') {
                            self.onerror(new ProgressEvent('error', { target: self }));
                        }
                        if (typeof self.onreadystatechange === 'function') {
                            self.readyState = 4;
                            self.status = 0;
                            self.onreadystatechange();
                        }
                    }, 0);
                    return;
                }
                log('XHR 请求放行:', info.url);
                originalXHRSend.call(self, body);
            });
            return;
        }

        return originalXHRSend.apply(this, arguments);
    };

    log('脚本已加载，模式:', CONFIG.mode, '拦截规则:', CONFIG.interceptPattern);

    window.__feishuInterceptor = {
        config: CONFIG,
        interceptedRequests: interceptedRequests,
        setMode: (mode) => {
            if (mode === 'manual' || mode === 'blockAll') {
                CONFIG.mode = mode;
                log('模式已切换为:', mode);
            } else {
                warn('无效模式，仅支持 "manual" 或 "blockAll"');
            }
        },
        clearLog: () => {
            interceptedRequests.length = 0;
            log('拦截记录已清空');
        }
    };

})();