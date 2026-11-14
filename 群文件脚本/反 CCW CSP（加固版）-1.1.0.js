// ==UserScript==
// @name         反 CCW CSP（加固版）
// @version      1.1.0
// @description  阻止已经疯掉的CCW做的乐子CSP
// @author       110200
// @match        https://www.ccw.site/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const isCSP = (node) => {
        if (!node || node.nodeType !== 1 || node.tagName !== 'META') return false;
        const equiv = node.getAttribute('http-equiv');
        return equiv && equiv.toLowerCase() === 'content-security-policy';
    };

    const origPrepend = Element.prototype.prepend;
    Element.prototype.prepend = function(...nodes) {
        const filtered = nodes.filter(n => !isCSP(n));
        return origPrepend.apply(this, filtered);
    };

    const origAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(node) {
        if (isCSP(node)) return node;
        return origAppendChild.call(this, node);
    };

    const origInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(node, ref) {
        if (isCSP(node)) return node;
        return origInsertBefore.call(this, node, ref);
    };

    const origSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        if (name && name.toLowerCase() === 'http-equiv' &&
            value && value.toLowerCase() === 'content-security-policy') {
            return;
        }
        return origSetAttribute.call(this, name, value);
    };

    const origWrite = document.write;
    document.write = function(html) {
        if (typeof html === 'string' &&
            /http-equiv\s*=\s*["']?content-security-policy/i.test(html)) {
            return;
        }
        return origWrite.apply(this, arguments);
    };

    const killExistingCSP = () => {
        if (document.head) {
            document.querySelectorAll('meta[http-equiv]').forEach(el => {
                if (isCSP(el)) el.remove();
            });
            return true;
        }
        return false;
    };

    if (!killExistingCSP()) {
        const headWatcher = new MutationObserver(() => {
            if (killExistingCSP()) {
                headWatcher.disconnect();
            }
        });
        headWatcher.observe(document.documentElement || document, {
            childList: true,
            subtree: true
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (isCSP(node) && node.parentNode) {
                    node.parentNode.removeChild(node);
                }
                if (node.nodeType === 1 && node.querySelectorAll) {
                    node.querySelectorAll('meta[http-equiv]').forEach(el => {
                        if (isCSP(el)) el.remove();
                    });
                }
            }
        }
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')
            .forEach(el => el.remove());
    });

    window.addEventListener('load', () => {
        document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')
            .forEach(el => el.remove());
    });
})();