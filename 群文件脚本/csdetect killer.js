// ==UserScript==
// @name         CSdetect Killer Pro
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Ultimate protection against CSense detection redirects - Works on Tampermonkey & Violentmonkey
// @author       ANON073
// @match        https://www.ccw.site/*
// @match        https://d.chen-jin.dpdns.org/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      *
// @noframes
// ==/UserScript==
(function() {
    'use strict';
    const CONFIG = {
        BLOCKED_DOMAINS: ['d.chen-jin.dpdns.org', 'supabase.co'],
        BLOCKED_PATHS: ['/csdetected', '/csense'],
        BLOCKED_API: ['csense_detections', 'csense-detection'],
        // targethost is the domain you want to redirect to when a blocked page is detected. Leave it empty if you don't want to redirect.
        TARGET_HOST: '',
        //但一定要填
        CHECK_INTERVAL: 50,
        COOLDOWN_STORAGE_KEY: 'csdetect_killer_last_check'
    };
    let currentHost = window.location.hostname;
    let isOnTargetSite = currentHost === CONFIG.TARGET_HOST || currentHost.includes('ccw.site');
    let scriptStartTime = Date.now();
    let blockedCount = 0;
    function log(...args) {
        console.log(`[CSKiller${new Date().toLocaleTimeString()}]`, ...args);
    }
    function shouldBlockUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const lowerUrl = url.toLowerCase();
        return CONFIG.BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain.toLowerCase())) ||
               CONFIG.BLOCKED_PATHS.some(path => lowerUrl.includes(path.toLowerCase())) ||
               CONFIG.BLOCKED_API.some(api => lowerUrl.includes(api.toLowerCase()));
    }
    function isOnBlockedPage() {
        return shouldBlockUrl(window.location.href);
    }
    function forceRedirectToTarget() {
        try {
            if (window.stop) window.stop();
        } catch(e) {}

        try {
            window.location.href = 'https://' + CONFIG.TARGET_HOST + '/';
            window.location.replace('https://' + CONFIG.TARGET_HOST + '/');
            window.location.assign('https://' + CONFIG.TARGET_HOST + '/');
        } catch(e) {
        }
    }

    if (isOnBlockedPage() && !isOnTargetSite) {
        forceRedirectToTarget();
        return;
    }

    const OriginalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0];
        const urlString = typeof url === 'string' ? url : (url instanceof Request ? url.url : '');

        if (shouldBlockUrl(urlString)) {
            blockedCount++;

            return new Response(JSON.stringify({
                success: true,
                data: [],
                message: 'Request blocked by CSdetect Killer',
                timestamp: Date.now()
            }), {
                status: 200,
                statusText: 'OK',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSKiller-Blocked': 'true'
                }
            });
        }

        try {
            return await OriginalFetch.apply(this, args);
        } catch(error) {
            throw error;
        }
    };

    const OriginalXHR = XMLHttpRequest;

    class ProtectedXHR extends OriginalXHR {
        constructor() {
            super();
            this._cskBlocked = false;
            this._cskOriginalOpen = null;
            this._cskOriginalSend = null;

            this._setupProtection();
        }

        _setupProtection() {
            this._cskOriginalOpen = this.open.bind(this);
            this._cskOriginalSend = this.send.bind(this);

            const self = this;

            this.open = function(method, url, ...rest) {
                if (shouldBlockUrl(url)) {
                    blockedCount++;

                    self._cskBlocked = true;
                    Object.defineProperty(self, 'readyState', { value: 4, writable: false });
                    Object.defineProperty(self, 'status', { value: 200, writable: false });
                    Object.defineProperty(self, 'statusText', { value: 'OK', writable: false });
                    Object.defineProperty(self, 'responseText', {
                        value: JSON.stringify({ success: true, data: [] }),
                        writable: false
                    });
                    Object.defineProperty(self, 'response', {
                        value: JSON.stringify({ success: true, data: [] }),
                        writable: false
                    });

                    setTimeout(() => {
                        try {
                            const loadEvent = new Event('load');
                            const readyEvent = new Event('readystatechange');
                            self.dispatchEvent(readyEvent);
                            self.dispatchEvent(loadEvent);

                            if (typeof self.onload === 'function') {
                                self.onload.call(self, loadEvent);
                            }
                            if (typeof self.onreadystatechange === 'function') {
                                self.onreadystatechange.call(self, readyEvent);
                            }
                        } catch(e) {}
                    }, 1);

                    return;
                }

                return self._cskOriginalOpen(method, url, ...rest);
            };

            this.send = function(...args) {
                if (self._cskBlocked) return;
                return self._cskOriginalSend(...args);
            };
        }
    }

    window.XMLHttpRequest = ProtectedXHR;

    const OriginalCreateElement = Document.prototype.createElement;

    Document.prototype.createElement = function(tagName, options) {
        const element = OriginalCreateElement.call(this, tagName, options);

        if (!element || !tagName) return element;

        const tagLower = tagName.toLowerCase();

        if (['iframe', 'frame'].includes(tagLower)) {
            protectElementSrc(element, 'iframe');
        }

        if (tagLower === 'script') {
            protectElementSrc(element, 'script');
        }

        if (tagLower === 'a') {
            protectElementHref(element);
        }

        if (tagLower === 'meta') {
            protectMetaRefresh(element);
        }

        if (tagLower === 'form') {
            protectFormAction(element);
        }

        if (tagLower === 'link' && (options && options.rel === 'stylesheet')) {
            protectElementSrc(element, 'link');
        }

        return element;
    };

    function protectElementSrc(element, type) {
        const originalSetAttribute = element.setAttribute.bind(element);

        element.setAttribute = function(name, value) {
            const nameLower = name.toLowerCase();
            if ((nameLower === 'src' || nameLower === 'href') && shouldBlockUrl(value)) {
                blockedCount++;
                if (type === 'a') {
                    originalSetAttribute(name, 'javascript:void(0)');
                }
                return;
            }
            return originalSetAttribute(name, value);
        };

        try {
            const srcProperty = type === 'link' ? 'href' : 'src';
            Object.defineProperty(element, srcProperty, {
                get() {
                    try { return this.getAttribute(srcProperty); } catch(e) { return ''; }
                },
                set(value) {
                    if (shouldBlockUrl(value)) {
                        blockedCount++;
                        if (type === 'a') {
                            this.setAttribute(srcProperty, 'javascript:void(0)');
                        }
                        return;
                    }
                    this.setAttribute(srcProperty, value);
                },
                configurable: true
            });
        } catch(e) {}
    }

    function protectElementHref(element) {
        protectElementSrc(element, 'a');
    }

    function protectMetaRefresh(element) {
        const originalSetAttribute = element.setAttribute.bind(element);

        element.setAttribute = function(name, value) {
            const nameLower = name.toLowerCase();
            if (nameLower === 'http-equiv' && value && value.toLowerCase() === 'refresh') {
                return;
            }
            if (nameLower === 'content' && /url=/i.test(value) && shouldBlockUrl(value)) {
                blockedCount++;
                return;
            }
            return originalSetAttribute(name, value);
        };
    }

    function protectFormAction(element) {
        const originalSetAttribute = element.setAttribute.bind(element);

        element.setAttribute = function(name, value) {
            if (name.toLowerCase() === 'action' && shouldBlockUrl(value)) {
                blockedCount++;
                return;
            }
            return originalSetAttribute(name, value);
        };
    }

    const OriginalAppendChild = Node.prototype.appendChild;

    Node.prototype.appendChild = function(child) {
        if (child && child.tagName) {
            const tag = child.tagName.toLowerCase();
            const src = child.src || child.href || '';

            if (['script', 'iframe', 'frame', 'link'].includes(tag) && shouldBlockUrl(src)) {
                blockedCount++;
                return child;
            }
        }

        return OriginalAppendChild.call(this, child);
    };

    const OriginalInsertBefore = Node.prototype.insertBefore;

    Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (newNode && newNode.tagName) {
            const tag = newNode.tagName.toLowerCase();
            const src = newNode.src || newNode.href || '';

            if (['script', 'iframe', 'frame', 'link'].includes(tag) && shouldBlockUrl(src)) {
                blockedCount++;
                return newNode;
            }
        }

        return OriginalInsertBefore.call(this, newNode, referenceNode);
    };

    try {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    registration.unregister()
                        .then(() => log('✅ Unregistered service worker:', registration.scope))
                        .catch(e => log('⚠️ Failed to unregister service worker:', e.message));
                });
            }).catch(e => {});

            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && shouldBlockUrl(event.data.url)) {
                    log('🔒 Blocked service worker message');
                }
            });
        }
    } catch(e) {}

    const OriginalWebSocket = window.WebSocket;

    window.WebSocket = function(url, protocols) {
        if (shouldBlockUrl(url)) {
            blockedCount++;
            log(`🔒 Blocked WebSocket #${blockedCount}:`, url ? url.substring(0, 100) : 'unknown');

            const fakeWS = {
                CLOSED: 3,
                CLOSING: 2,
                CONNECTING: 0,
                OPEN: 1,
                readyState: 3,
                bufferedAmount: 0,
                extensions: '',
                protocol: '',
                url: url || '',
                close: () => {},
                send: () => {},
                ping: () => {},
                pong: () => {},
                terminate: () => {},
                onopen: null,
                onmessage: null,
                onerror: null,
                onclose: null,
                binaryType: 'blob',
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false
            };

            setTimeout(() => {
                try {
                    if (fakeWS.onclose) fakeWS.onclose({ wasClean: true, code: 1000, reason: 'Blocked by CSKiller' });
                } catch(e) {}
            }, 10);

            return fakeWS;
        }

        try {
            return new OriginalWebSocket(url, protocols);
        } catch(e) {
            log('⚠️ WebSocket creation error:', e.message);
            return new OriginalWebSocket('about:blank');
        }
    };

    const locationProxyHandler = {
        get(target, prop) {
            const value = target[prop];

            if (['assign', 'replace', 'reload'].includes(prop)) {
                return function(...args) {
                    const url = args[0];
                    if (url && shouldBlockUrl(url.toString())) {
                        blockedCount++;
                        log(`🔒 Blocked location.${prop} #${blockedCount}:`, url.toString().substring(0, 100));
                        return;
                    }
                    log(`✅ Allowed location.${prop}:`, url ? url.toString().substring(0, 100) : 'reload');
                    return value.apply(target, args);
                };
            }

            if (typeof value === 'function') {
                return value.bind(target);
            }

            return value;
        },

        set(target, prop, value) {
            if (prop === 'href') {
                if (shouldBlockUrl(value.toString())) {
                    blockedCount++;
                    log(`🔒 Blocked location.href set #${blockedCount}:`, value.toString().substring(0, 100));
                    return true;
                }
            }
            target[prop] = value;
            return true;
        }
    };

    try {
        const realLocation = window.location;

        Object.defineProperty(window, 'location', {
            get() {
                return new Proxy(realLocation, locationProxyHandler);
            },
            set() {},
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(Location.prototype, 'href', {
            get() { return realLocation.href; },
            set(value) {
                if (shouldBlockUrl(value.toString())) {
                    blockedCount++;
                    log(`🔒 Blocked Location.prototype.href set #${blockedCount}:`, value.toString().substring(0, 100));
                    return;
                }
                realLocation.href = value;
            },
            configurable: true,
            enumerable: true
        });

        ['assign', 'replace', 'reload'].forEach(method => {
            Location.prototype[method] = function(...args) {
                const url = args[0];
                if (url && shouldBlockUrl(url.toString())) {
                    blockedCount++;
                    log(`🔒 Blocked Location.prototype.${method} #${blockedCount}:`, url.toString().substring(0, 100));
                    return;
                }
                log(`✅ Allowed Location.prototype.${method}:`, url ? url.toString().substring(0, 100) : method);
                return realLocation[method].apply(this, args);
            };
        });
    } catch(e) {
        log('❌ Error setting up location proxy:', e.message);
    }

    const originalWindowOpen = window.open;

    window.open = function(url, ...args) {
        if (url && shouldBlockUrl(url.toString())) {
            blockedCount++;
            log(`🔒 Blocked window.open #${blockedCount}:`, url.toString().substring(0, 100));
            return null;
        }
        log(`✅ Allowed window.open:`, url ? url.toString().substring(0, 100) : 'popup');
        return originalWindowOpen.call(this, url, ...args);
    };

    const historyMethods = ['pushState', 'replaceState', 'go', 'back', 'forward'];

    historyMethods.forEach(method => {
        const original = history[method];

        history[method] = function(...args) {
            if (['pushState', 'replaceState'].includes(method)) {
                const url = args[2];
                if (url && shouldBlockUrl(url.toString())) {
                    blockedCount++;
                    log(`🔒 Blocked history.${method} #${blockedCount}:`, url.toString().substring(0, 100));
                    return;
                }
            }
            log(`✅ Allowed history.${method}`);
            return original.apply(this, args);
        };
    });

    const criticalEvents = [
        'beforeunload',
        'unload',
        'pagehide',
        'hashchange',
        'popstate'
    ];

    criticalEvents.forEach(eventType => {
        window.addEventListener(eventType, function(e) {
            if (eventType === 'beforeunload') {
                e.preventDefault();
                e.returnValue = '';
                return '';
            } else {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, true);
    });

    document.addEventListener('click', function(e) {
        let target = e.target;
        let depth = 0;

        while (target && target !== document && depth < 10) {
            if (target.tagName === 'A') {
                const href = target.getAttribute('href') || '';
                if (shouldBlockUrl(href)) {
                    blockedCount++;
                    log(`🔒 Blocked click on link #${blockedCount}:`, href.substring(0, 100));
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }

            if (target.tagName === 'FORM') {
                const action = target.getAttribute('action') || '';
                if (shouldBlockUrl(action)) {
                    blockedCount++;
                    log(`🔒 Blocked form submit click #${blockedCount}:`, action.substring(0, 100));
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }

            target = target.parentElement;
            depth++;
        }
    }, true);

    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form && form.action && shouldBlockUrl(form.action)) {
            blockedCount++;
            log(`🔒 Blocked form submit #${blockedCount}:`, form.action.substring(0, 100));
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, true);

    document.addEventListener('contextmenu', function(e) {
        let target = e.target;
        while (target && target !== document) {
            if (target.tagName === 'A' || target.tagName === 'IFRAME') {
                const src = target.src || target.href || '';
                if (shouldBlockUrl(src)) {
                    e.preventDefault();
                    return false;
                }
            }
            target = target.parentElement;
        }
    }, true);

    const originalEval = window.eval;

    window.eval = function(code) {
        if (code && typeof code === 'string') {
            const suspiciousPatterns = [
                'location',
                'redirect',
                ...CONFIG.BLOCKED_API,
                ...CONFIG.BLOCKED_DOMAINS.map(d => d.split('.')[0]),
                'window.open',
                'document.write'
            ];

            const hasSuspiciousCode = suspiciousPatterns.some(pattern =>
                code.toLowerCase().includes(pattern.toLowerCase())
            );

            if (hasSuspiciousCode) {
                blockedCount++;
                log(`🔒 Blocked suspicious eval #${blockedCount}`);
                return undefined;
            }
        }

        try {
            return originalEval.call(this, code);
        } catch(e) {
            log('⚠️ Eval execution error:', e.message);
            throw e;
        }
    };

    const originalFunction = window.Function;

    window.Function = function(code) {
        if (code && typeof code === 'string') {
            const suspiciousPatterns = [
                'location',
                'redirect',
                ...CONFIG.BLOCKED_API,
                ...CONFIG.BLOCKED_DOMAINS.map(d => d.split('.')[0])
            ];

            const hasSuspiciousCode = suspiciousPatterns.some(pattern =>
                code.toLowerCase().includes(pattern.toLowerCase())
            );

            if (hasSuspiciousCode) {
                blockedCount++;
                log(`🔒 Blocked suspicious Function #${blockedCount}`);
                return function() {};
            }
        }

        try {
            return new originalFunction(code);
        } catch(e) {
            log('⚠️ Function creation error:', e.message);
            throw e;
        }
    };

    const originalDocumentWrite = document.write;

    document.write = function(content) {
        if (content && shouldBlockUrl(content.toString())) {
            blockedCount++;
            log(`🔒 Blocked document.write #${blockedCount}:`, content.toString().substring(0, 100));
            return;
        }
        return originalDocumentWrite.apply(this, arguments);
    };

    const originalDocumentWriteln = document.writeln;

    document.writeln = function(content) {
        if (content && shouldBlockUrl(content.toString())) {
            blockedCount++;
            log(`🔒 Blocked document.writeln #${blockedCount}:`, content.toString().substring(0, 100));
            return;
        }
        return originalDocumentWriteln.apply(this, arguments);
    };

    const originalDocumentOpen = document.open;

    document.open = function(...args) {
        log('⚠️ Intercepted document.open call');
        return originalDocumentOpen.apply(this, args);
    };

    try {
        Object.defineProperty(window, 'top', {
            get() {
                try { return window; } catch(e) { return window; }
            },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(window, 'parent', {
            get() {
                try { return window; } catch(e) { return window; }
            },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(window, 'self', {
            get() { return window; },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(window, 'frameElement', {
            get() { return null; },
            configurable: false,
            enumerable: true
        });
    } catch(e) {
        log('❌ Error setting up window properties:', e.message);
    }

    let lastCheckTime = parseInt(localStorage.getItem(CONFIG.COOLDOWN_STORAGE_KEY) || '0');
    let checkIntervalId = null;

    function performSecurityCheck() {
        const now = Date.now();
        const timeSinceLastCheck = now - lastCheckTime;

        if (timeSinceLastCheck < CONFIG.CHECK_INTERVAL) {
            return;
        }

        lastCheckTime = now;

        try {
            localStorage.setItem(CONFIG.COOLDOWN_STORAGE_KEY, now.toString());
        } catch(e) {}

        if (!isOnTargetSite && isOnBlockedPage()) {
            log('🚨 SECURITY CHECK: Detected blocked page!');
            forceRedirectToTarget();
            return;
        }

        const currentUrl = window.location.href;
        if (currentUrl.includes('about:blank') || currentUrl.includes('javascript:')) {
            return;
        }
    }

    checkIntervalId = setInterval(performSecurityCheck, CONFIG.CHECK_INTERVAL);

    const domObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    const tagName = node.tagName;
                    const src = node.src || node.href || node.action || '';

                    if (tagName === 'SCRIPT' && shouldBlockUrl(src)) {
                        blockedCount++;
                        log(`🔒 Removed script node #${blockedCount}:`, src.substring(0, 100));
                        node.remove();
                        return;
                    }

                    if (tagName === 'IFRAME' && shouldBlockUrl(src)) {
                        blockedCount++;
                        log(`🔒 Removed iframe node #${blockedCount}:`, src.substring(0, 100));
                        node.remove();
                        return;
                    }

                    if (node.querySelectorAll) {
                        const dangerousElements = node.querySelectorAll(
                            'script[src], iframe[src], frame[src], link[href], a[href]'
                        );

                        dangerousElements.forEach(el => {
                            const elSrc = el.src || el.href || '';
                            if (shouldBlockUrl(elSrc)) {
                                blockedCount++;
                                log(`🔒 Removed nested element <${el.tagName}> #${blockedCount}:`, elSrc.substring(0, 100));
                                el.remove();
                            }
                        });
                    }

                    if (tagName === 'META') {
                        const httpEquiv = node.getAttribute('http-equiv');
                        const content = node.getAttribute('content') || '';

                        if (httpEquiv && httpEquiv.toLowerCase() === 'refresh') {
                            log('🔒 Removed meta refresh tag');
                            node.remove();
                            return;
                        }

                        if (/url=/i.test(content) && shouldBlockUrl(content)) {
                            log('🔒 Removed meta refresh with blocked URL');
                            node.remove();
                            return;
                        }
                    }
                }
            });
        });
    });

    try {
        const observeTarget = document.documentElement || document;
        domObserver.observe(observeTarget, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'href', 'action']
        });
    } catch(e) {
        log('⚠️ DOM Observer setup error:', e.message);
    }

    window.addEventListener('error', function(e) {
        if (e.filename && shouldBlockUrl(e.filename)) {
            log('🔒 Blocked error from blocked source:', e.filename);
            e.preventDefault();
        }
    }, true);

    window.addEventListener('unhandledrejection', function(e) {
        log('⚠️ Unhandled promise rejection:', e.reason);
    }, true);

    const performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
            if (entry.name && shouldBlockUrl(entry.name)) {
                log(`🔒 Detected blocked resource in Performance API:`, entry.name.substring(0, 100));
            }
        });
    });

    try {
        performanceObserver.observe({ entryTypes: ['resource'] });
    } catch(e) {}

    const scriptLoadTime = Date.now() - scriptStartTime;
    window.CSKiller = {
        version: '20.0 Ultimate',
        blockedCount: blockedCount,
        config: CONFIG,
        isRunning: true,
        startTime: scriptStartTime,
        getStatus: () => ({
            version: '20.0 Ultimate',
            blockedRequests: blockedCount,
            uptime: Math.floor((Date.now() - scriptStartTime) / 1000),
            currentHost: currentHost,
            isProtected: !isOnBlockedPage() || isOnTargetSite
        })
    };

})();