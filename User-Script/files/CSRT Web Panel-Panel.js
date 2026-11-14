// ==UserScript==
// @name         CSRT Web Panel
// @namespace    https://www.ccw.site/
// @version      Panel
// @description  嵌入CSRT官网的悬浮球 可能败在CSP下
// @author       110200
// @match        https://www.ccw.site/*
// @grant        none
// @run-at       document-start
// @icon         https://m.ccw.site/gandi_application/RL.png
// ==/UserScript==

(function() {
    'use strict';
    const SITE_URL = 'https://csrt.netlify.app/';
    function injectGlassTheme() {
        const style = document.createElement('style');
        style.id = 'csrt-glass-theme';
        style.textContent = `
            .csrt-window {
                background: rgba(16, 18, 27, 0.75) !important;
                backdrop-filter: blur(24px) !important;
                -webkit-backdrop-filter: blur(24px) !important;
                border: 1px solid rgba(255,255,255,0.08) !important;
                border-radius: 20px !important;
                box-shadow: 0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05) !important;
                color: #eee;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .csrt-window .csrt-header {
                background: rgba(255,255,255,0.04) !important;
                border-bottom: 1px solid rgba(255,255,255,0.06) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border-radius: 20px 20px 0 0 !important;
                padding: 14px 20px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                flex-shrink: 0 !important;
            }
            .csrt-window .csrt-header .csrt-title {
                color: #f0f0f0 !important;
                font-weight: 600 !important;
                font-size: 16px !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
            }
            .csrt-window .csrt-header .csrt-title .csrt-version {
                font-size: 11px !important;
                opacity: 0.5 !important;
                font-weight: 400 !important;
            }
            .csrt-window .csrt-header .csrt-title .csrt-author {
                font-size: 11px !important;
                background: rgba(255,255,255,0.08) !important;
                padding: 2px 10px !important;
                border-radius: 12px !important;
                font-weight: 400 !important;
                opacity: 0.6 !important;
            }
            .csrt-window .csrt-header .csrt-close-btn {
                background: none !important;
                border: none !important;
                color: rgba(255,255,255,0.5) !important;
                font-size: 20px !important;
                cursor: pointer !important;
                padding: 0 8px !important;
                transition: all 0.2s !important;
                border-radius: 8px !important;
            }
            .csrt-window .csrt-header .csrt-close-btn:hover {
                color: #fff !important;
                background: rgba(255,85,85,0.2) !important;
            }
            .csrt-window .csrt-content {
                padding: 0 !important;
                overflow: hidden !important;
                flex: 1 !important;
                background: rgba(0,0,0,0.15) !important;
                display: flex !important;
            }
            .csrt-iframe {
                width: 100% !important;
                height: 100% !important;
                border: none !important;
                display: block !important;
                background: #f7f5fb !important;
                border-radius: 0 0 20px 20px !important;
            }
            @keyframes csrt-window-appear {
                0% { opacity: 0; transform: scale(0.96); }
                100% { opacity: 1; transform: scale(1); }
            }
            .csrt-window-appear {
                animation: csrt-window-appear 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards !important;
            }
            .csrt-ball {
                position: fixed !important;
                width: 52px !important;
                height: 52px !important;
                border-radius: 50% !important;
                background: rgba(20, 22, 36, 0.85) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
                color: #8be9fd !important;
                font-size: 22px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                z-index: 999999 !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(102,126,234,0.08) !important;
                user-select: none !important;
                pointer-events: auto !important;
                border: 1px solid rgba(255,255,255,0.06) !important;
                will-change: transform, left, top !important;
                touch-action: none !important;
                contain: layout style paint !important;
                transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease !important;
                text-shadow: 0 0 20px rgba(139,233,253,0.2) !important;
            }
            .csrt-ball:hover {
                box-shadow: 0 4px 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 60px rgba(102,126,234,0.15) !important;
            }
        `;
        document.head.appendChild(style);
    }
    function waitForBody() {
        return new Promise((resolve) => {
            if (document.body) { resolve(); return; }
            let timeoutId = setTimeout(() => {
                observer.disconnect();
                if (!document.body) {
                    const body = document.createElement('body');
                    document.documentElement.appendChild(body);
                }
                resolve();
            }, 3000);
            const observer = new MutationObserver(() => {
                if (document.body) {
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        });
    }
    let toolWindow = null;
    let isToolVisible = false;
    function createToolWindow() {
        const windowDiv = document.createElement('div');
        windowDiv.className = 'csrt-window csrt-window-appear';
        windowDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            width: 90vw;
            max-width: 1200px;
            height: 88vh;
            max-height: 88vh;
            background: rgba(16,18,27,0.75);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
            z-index: 1000000;
            color: #eee;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: none;
            flex-direction: column;
            overflow: hidden;
        `;
        const winWidth = Math.min(1200, window.innerWidth * 0.9);
        const winHeight = Math.min(window.innerHeight * 0.88, window.innerHeight * 0.88);
        windowDiv.style.left = ((window.innerWidth - winWidth) / 2) + 'px';
        windowDiv.style.top = ((window.innerHeight - winHeight) / 2) + 'px';
        windowDiv.style.right = 'auto';
        windowDiv.style.bottom = 'auto';
        const header = document.createElement('div');
        header.className = 'csrt-header';
        header.style.cssText = `
            padding: 14px 20px;
            background: rgba(255,255,255,0.04);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
            border-radius: 20px 20px 0 0;
        `;
        const titleContainer = document.createElement('span');
        titleContainer.className = 'csrt-title';
        titleContainer.style.cssText = `
            color: #f0f0f0;
            font-weight: 600;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        const titleText = document.createElement('span');
        titleText.textContent = ' CSRT Panel';
        const titleVersion = document.createElement('span');
        titleVersion.className = 'csrt-version';
        titleVersion.textContent = ' v1.5.0';
        const titleAuthor = document.createElement('span');
        titleAuthor.className = 'csrt-author';
        titleAuthor.textContent = ' 110200';
        titleContainer.appendChild(titleText);
        titleContainer.appendChild(titleVersion);
        titleContainer.appendChild(titleAuthor);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'csrt-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.onclick = () => {
            windowDiv.style.display = 'none';
            isToolVisible = false;
        };
        header.appendChild(titleContainer);
        header.appendChild(closeBtn);
        windowDiv.appendChild(header);
        const content = document.createElement('div');
        content.className = 'csrt-content';
        const iframe = document.createElement('iframe');
        iframe.className = 'csrt-iframe';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals');
        iframe.src = SITE_URL;
        content.appendChild(iframe);
        windowDiv.appendChild(content);
        let isDraggingWin = false;
        let winStartX, winStartY, winStartLeft, winStartTop;
        header.addEventListener('mousedown', (e) => {
            if (e.target === closeBtn) return;
            isDraggingWin = true;
            const rect = windowDiv.getBoundingClientRect();
            winStartX = e.clientX;
            winStartY = e.clientY;
            winStartLeft = rect.left;
            winStartTop = rect.top;
            windowDiv.style.cursor = 'grabbing';
            windowDiv.style.transition = 'none';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDraggingWin) return;
            const dx = e.clientX - winStartX;
            const dy = e.clientY - winStartY;
            windowDiv.style.left = (winStartLeft + dx) + 'px';
            windowDiv.style.top = (winStartTop + dy) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isDraggingWin) {
                isDraggingWin = false;
                windowDiv.style.cursor = 'default';
            }
        });
        document.body.appendChild(windowDiv);
        return windowDiv;
    }
    function toggleToolWindow() {
        if (!toolWindow) toolWindow = createToolWindow();
        if (isToolVisible) {
            toolWindow.style.display = 'none';
            isToolVisible = false;
        } else {
            toolWindow.style.display = 'flex';
            isToolVisible = true;
            const winWidth = Math.min(1200, window.innerWidth * 0.9);
            const winHeight = Math.min(window.innerHeight * 0.88, window.innerHeight * 0.88);
            toolWindow.style.left = ((window.innerWidth - winWidth) / 2) + 'px';
            toolWindow.style.top = ((window.innerHeight - winHeight) / 2) + 'px';
        }
    }
    async function createFloatingBall() {
        await waitForBody();
        if (document.querySelector('.csrt-ball')) return document.querySelector('.csrt-ball');
        const ball = document.createElement('div');
        ball.className = 'csrt-ball';
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 88 88');
        svg.setAttribute('width', '30');
        svg.setAttribute('height', '30');
        svg.style.cssText = 'display:block;filter:drop-shadow(0 0 10px rgba(103,40,182,0.3));';
        svg.innerHTML = `<defs><linearGradient x1="302.87804" y1="182.59082" x2="337.12196" y2="182.59082" gradientTransform="translate(-223.94835,-146.54535) scale(0.7394,0.7394)" gradientUnits="userSpaceOnUse" id="csrt-ball-grad"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#4c1d95"/></linearGradient></defs><g transform="translate(-276,-135.87672)"><g stroke-miterlimit="10"><path d="M320,137l43,22v50l-43,22l-43,-22v-50z" fill="#4f2e7d" stroke="#3c1b5e" stroke-width="2"/><path d="M320,146l34,18v40l-34,18l-34,-18v-40z" fill="#744cb0" stroke="none" stroke-width="1"/><text transform="translate(302.87804,202.19466) scale(1.35245,1.35245)" font-size="40" xml:space="preserve" fill="url(#csrt-ball-grad)" stroke="none" stroke-width="1" font-family="Sans Serif" font-weight="bold" text-anchor="start"><tspan x="0" dy="0">R</tspan></text><path d="M303.8142,173.18961l0.9958,-2.9874l12.61347,4.20449l-0.9958,2.9874z" fill="#744cb0" stroke="none" stroke-width="0"/><path d="M317.5202,188.30322l4.01407,-11.93927l2.1557,0.72476l-4.01407,11.93927z" fill="#744cb0" stroke="none" stroke-width="0"/><path d="M325.12501,198.06224l-2.2449,-2.90817l9.97086,-7.69681l2.2449,2.90817z" fill="#744cb0" stroke="none" stroke-width="0"/></g></g>`;
        ball.appendChild(svg);
        requestAnimationFrame(() => {
            ball.style.left = (window.innerWidth - 72) + 'px';
            ball.style.top = (window.innerHeight - 140) + 'px';
            ball.style.right = 'auto';
            ball.style.bottom = 'auto';
        });
        let isDragging = false;
        let hasPositionChanged = false;
        let offsetX = 0, offsetY = 0;
        let targetX = window.innerWidth - 72;
        let targetY = window.innerHeight - 140;
        ball.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            hasPositionChanged = false;
            const rect = ball.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            ball.style.transform = 'scale(1.15)';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let newX = Math.max(0, Math.min(e.clientX - offsetX, window.innerWidth - 60));
            let newY = Math.max(0, Math.min(e.clientY - offsetY, window.innerHeight - 60));
            if (Math.abs(newX - targetX) > 2 || Math.abs(newY - targetY) > 2) hasPositionChanged = true;
            targetX = newX;
            targetY = newY;
            ball.style.left = newX + 'px';
            ball.style.top = newY + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                ball.style.transform = 'scale(1)';
                if (!hasPositionChanged) toggleToolWindow();
            }
        });
        let touchOffsetX = 0, touchOffsetY = 0;
        let isTouching = false;
        let touchHasMoved = false;
        ball.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = ball.getBoundingClientRect();
            touchOffsetX = touch.clientX - rect.left;
            touchOffsetY = touch.clientY - rect.top;
            isTouching = true;
            touchHasMoved = false;
            ball.style.transform = 'scale(1.15)';
            e.preventDefault();
        }, {passive: false});
        document.addEventListener('touchmove', (e) => {
            if (!isTouching) return;
            const touch = e.touches[0];
            let newX = Math.max(0, Math.min(touch.clientX - touchOffsetX, window.innerWidth - 60));
            let newY = Math.max(0, Math.min(touch.clientY - touchOffsetY, window.innerHeight - 60));
            if (Math.abs(newX - targetX) > 2 || Math.abs(newY - targetY) > 2) touchHasMoved = true;
            targetX = newX;
            targetY = newY;
            ball.style.left = newX + 'px';
            ball.style.top = newY + 'px';
            e.preventDefault();
        }, {passive: false});
        document.addEventListener('touchend', (e) => {
            if (isTouching) {
                isTouching = false;
                ball.style.transform = 'scale(1)';
                if (!touchHasMoved) toggleToolWindow();
            }
        }, {passive: false});
        document.body.appendChild(ball);
        return ball;
    }
    function init() {
        injectGlassTheme();
        requestAnimationFrame(async () => {
            try { await createFloatingBall(); } catch (e) {}
        });
    }
    init();
    window.__CSRT_PANEL = {
        toggleTool: toggleToolWindow,
        version: '1.5.0-panel'
    };
})();
