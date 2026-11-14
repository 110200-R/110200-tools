// ==UserScript==
// @name         广播触发器
// @namespace    http://tampermonkey.net/
// @version      1.2.2
// @description  在各社区的作品预览页面模拟广播
// @author       诺言Promise
// @match        https://aerfaying.com/*
// @match        https://www.ccw.site/*
// @match        https://gitblock.cn/*
// @match        https://world.xiaomawang.com/*
// @match        https://www.cocrea.world/*
// @match        https://create.codelab.club/*
// @match        https://addon.codelab.club/*
// @match        https://www.scratch-cn.cn/*
// @match        https://40code.com/*
// @match        https://codingclip.com/*
// @match        https://editor.turbowarp.cn/*
// @match        https://0832.ink/rc/*
// @match        https://studio.penguinmod.com/*
// @match        https://codinghou.cn/*
// @match        https://s3player.hetao101.com/*
// @match        https://www.matinslab.com/scratch/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const ICON_SVG = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="59.66622" height="59.66622" viewBox="0,0,59.66622,59.66622"><g transform="translate(-210.16689,-150.16689)"><g stroke="none" stroke-miterlimit="10"><path d="M210.16689,180c0,-16.47637 13.35674,-29.83311 29.83311,-29.83311c16.47637,0 29.83311,13.35674 29.83311,29.83311c0,16.47637 -13.35674,29.83311 -29.83311,29.83311c-16.47637,0 -29.83311,-13.35674 -29.83311,-29.83311z" fill="#0079ff" stroke-width="0"/><path d="M214.31587,180c0,-14.18496 11.49918,-25.68413 25.68413,-25.68413c14.18496,0 25.68413,11.49918 25.68413,25.68413c0,14.18496 -11.49918,25.68413 -25.68413,25.68413c-14.18496,0 -25.68413,-11.49918 -25.68413,-25.68413z" fill="#00b4dc" stroke-width="0"/><text transform="translate(221.65912,186.79111) scale(0.62636,0.62636)" font-size="40" xml:space="preserve" fill="#ffffff" stroke-width="1" font-family="Sans Serif" font-weight="normal" text-anchor="start"><tspan x="0" dy="0">MS</tspan></text><path d="M220.53226,185.25699v-0.43552h38.76127v0.43552z" fill="#00b4dc" stroke-width="0"/><path d="M246.01018,190.70099v-25.47791h1.0888v25.47791z" fill="#00b4dc" stroke-width="0"/><path d="M218.79018,175.67556v-0.87104h44.85854v0.87104z" fill="#00b4dc" stroke-width="0"/><path d="M225.56091,167.23725l1.23184,-1.23184l27.25438,27.25438l-1.23184,1.23184z" fill="#00b4dc" stroke-width="0"/><text transform="translate(227.45471,194.51301) scale(0.12545,0.12545)" font-size="40" xml:space="preserve" fill="#ffffff" stroke-width="1" font-family="Sans Serif" font-weight="normal" text-anchor="start"><tspan x="0" dy="0">消息广播器</tspan></text></g></g></svg>`;

    const ICON_DATA_URL = 'data:image/svg+xml,' + encodeURIComponent(ICON_SVG);

    let vm = null;
    let floatingBall = null;
    let floatingWindow = null;
    let isOpen = false;
    let isActive = true;
    let isDraggingBall = false;
    let isDraggingWindow = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let ballX = 0;
    let ballY = 0;
    let winX = 0;
    let winY = 0;

    const originalBind = Function.prototype.bind;

    function getVMFromRedux() {
        try {
            if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                const roots = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.getFiberRoots?.(1) || [];
                for (const root of roots) {
                    const result = findVMInFiber(root);
                    if (result) return result;
                }
            }
            const elements = document.querySelectorAll('*');
            for (const el of elements) {
                try {
                    const key = Object.keys(el).find(k => k.includes('__reactContainer'));
                    if (key && el[key]) {
                        const result = findVMInFiber(el[key]);
                        if (result) return result;
                    }
                } catch {
                    continue;
                }
            }
        } catch (e) {
            console.warn('[Broadcast Simulator] 获取Redux Store失败:', e);
        }
        return null;
    }

    function findVMInFiber(fiber, visited = new Set()) {
        if (!fiber || visited.has(fiber)) return null;
        visited.add(fiber);
        try {
            if (fiber?.memoizedState?.state?.scratchGui?.vm) {
                return fiber.memoizedState.state.scratchGui.vm;
            }
            if (fiber?.stateNode?.state?.scratchGui?.vm) {
                return fiber.stateNode.state.scratchGui.vm;
            }
            if (fiber?.getState?.()?.scratchGui?.vm) {
                return fiber.getState().scratchGui.vm;
            }
            for (const key in fiber) {
                if (fiber[key] && typeof fiber[key] === 'object') {
                    const result = findVMInFiber(fiber[key], visited);
                    if (result) return result;
                }
            }
        } catch {
            // ignore
        }
        return null;
    }

    function trapVMViaBind(timeout = 15000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                Function.prototype.bind = originalBind;
                reject('获取VM超时');
            }, timeout);
            Function.prototype.bind = function(context, ...args) {
                if (context && context.runtime && context.greenFlag) {
                    Function.prototype.bind = originalBind;
                    clearTimeout(timer);
                    resolve(context);
                }
                return originalBind.call(this, context, ...args);
            };
        });
    }

    async function getVM() {
        if (window.eureka?.vm) {
            return window.eureka.vm;
        }
        const vmFromRedux = getVMFromRedux();
        if (vmFromRedux) {
            return vmFromRedux;
        }
        try {
            const vmFromBind = await trapVMViaBind();
            if (vmFromBind) {
                return vmFromBind;
            }
        } catch (e) {
            console.warn('[Broadcast Simulator] bind拦截失败:', e);
        }
        throw new Error('[Broadcast Simulator] 无法获取VM实例');
    }

    function isProjectLoaded(vmInstance) {
        if (!vmInstance?.runtime) return false;
        return !!vmInstance.runtime._loaded ||
               (!!vmInstance.runtime.targets && !!vmInstance.runtime.getTargetForStage()) ||
               !!vmInstance.runtime.projectData ||
               !!vmInstance.runtime._steppingInterval;
    }

    function waitForProjectLoad(vmInstance) {
        return new Promise((resolve) => {
            if (isProjectLoaded(vmInstance)) {
                resolve();
                return;
            }
            const interval = setInterval(() => {
                if (isProjectLoaded(vmInstance)) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    function getBroadcastList(vmInstance) {
        const broadcastSet = new Set();
        const targets = vmInstance.runtime.targets || [];
        for (const target of targets) {
            if (!target.blocks) continue;
            const blocks = target.blocks._blocks || target.blocks;
            for (const blockId in blocks) {
                const block = blocks[blockId];
                if (block && block.opcode === 'event_whenbroadcastreceived') {
                    const fields = block.fields || {};
                    const broadcastOption = fields.BROADCAST_OPTION;
                    if (broadcastOption && broadcastOption.value !== undefined) {
                        const name = String(broadcastOption.value).toUpperCase();
                        broadcastSet.add(name);
                    }
                }
            }
        }
        const result = [];
        for (const name of broadcastSet) {
            let count = 0;
            let originalName = name;
            for (const target of targets) {
                if (!target.blocks) continue;
                const blocks = target.blocks._blocks || target.blocks;
                for (const blockId in blocks) {
                    const block = blocks[blockId];
                    if (block && block.opcode === 'event_whenbroadcastreceived') {
                        const fields = block.fields || {};
                        const broadcastOption = fields.BROADCAST_OPTION;
                        if (broadcastOption && String(broadcastOption.value).toUpperCase() === name) {
                            count++;
                            if (originalName === name) {
                                originalName = broadcastOption.value;
                            }
                        }
                    }
                }
            }
            result.push({
                name: originalName,
                nameUpper: name,
                count: count
            });
        }
        result.sort((a, b) => a.name.localeCompare(b.name));
        return result;
    }

    function doBroadcast(vmInstance, broadcastName) {
        try {
            const threads = vmInstance.runtime.startHats('event_whenbroadcastreceived', {
                BROADCAST_OPTION: broadcastName
            });
            return threads.length;
        } catch (e) {
            console.error('[Broadcast Simulator] 广播失败:', e);
            return 0;
        }
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clampWindowRect(winEl, winW, winH) {
        const maxX = window.innerWidth - winW;
        const maxY = window.innerHeight - winH;
        winX = clamp(winX, 0, maxX);
        winY = clamp(winY, 0, maxY);
        winEl.style.left = winX + 'px';
        winEl.style.top = winY + 'px';
    }

    function clampBallRect(ballEl) {
        const maxX = window.innerWidth - 48;
        const maxY = window.innerHeight - 48;
        ballX = clamp(ballX, 0, maxX);
        ballY = clamp(ballY, 0, maxY);
        ballEl.style.left = ballX + 'px';
        ballEl.style.top = ballY + 'px';
        ballEl.style.right = 'auto';
        ballEl.style.bottom = 'auto';
    }

    function createFloatingBall() {
        const ball = document.createElement('div');
        ball.id = 'scratch-broadcast-ball';
        ball.innerHTML = `<img src="${ICON_DATA_URL}" style="width:70%;height:70%;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));pointer-events:none;">`;
        ball.style.cssText = `
            position: fixed;
            right: 60px;
            bottom: 120px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4fc3f7, #0288d1);
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(2,136,209,0.4);
            transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease, opacity 0.3s ease, background 0.3s ease;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 0;
            overflow: hidden;
        `;
        ball.addEventListener('mouseenter', () => {
            if (isActive) {
                ball.style.transform = 'scale(1.1)';
                ball.style.boxShadow = '0 6px 30px rgba(2,136,209,0.5)';
            }
        });
        ball.addEventListener('mouseleave', () => {
            if (isActive) {
                ball.style.transform = 'scale(1)';
                ball.style.boxShadow = '0 4px 20px rgba(2,136,209,0.4)';
            }
        });
        ball.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isActive) {
                toggleFloatingWindow();
            } else {
                isActive = true;
                ball.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)';
                ball.style.opacity = '1';
                ball.style.transform = 'scale(1)';
                ball.style.boxShadow = '0 4px 20px rgba(2,136,209,0.4)';
                openFloatingWindow();
            }
        });
        document.body.appendChild(ball);
        ballX = window.innerWidth - 60 - 48;
        ballY = window.innerHeight - 120 - 48;
        ball.style.left = ballX + 'px';
        ball.style.top = ballY + 'px';
        ball.style.right = 'auto';
        ball.style.bottom = 'auto';
        ball.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDraggingBall = true;
            const rect = ball.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            ball.style.cursor = 'grabbing';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDraggingBall) return;
            ballX = e.clientX - dragOffsetX;
            ballY = e.clientY - dragOffsetY;
            clampBallRect(ball);
            if (isOpen && floatingWindow) {
                updateWindowPosition();
            }
        });
        document.addEventListener('mouseup', () => {
            if (isDraggingBall) {
                isDraggingBall = false;
                ball.style.cursor = 'pointer';
            }
        });
        return ball;
    }

    function updateWindowPosition() {
        if (!floatingWindow) return;
        const ballRect = floatingBall.getBoundingClientRect();
        let left = ballRect.right + 20;
        let top = ballRect.top - (floatingWindow.offsetHeight || 300) + 10;
        const maxX = window.innerWidth - (floatingWindow.offsetWidth || 340);
        const maxY = window.innerHeight - (floatingWindow.offsetHeight || 300);
        left = clamp(left, 0, maxX);
        top = clamp(top, 0, maxY);
        winX = left;
        winY = top;
        floatingWindow.style.left = left + 'px';
        floatingWindow.style.top = top + 'px';
        floatingWindow.style.right = 'auto';
        floatingWindow.style.bottom = 'auto';
    }

    function createFloatingWindow(vmInstance) {
        const existing = document.getElementById('scratch-broadcast-window');
        if (existing) {
            existing.remove();
            return null;
        }

        const broadcastList = getBroadcastList(vmInstance);

        const windowDiv = document.createElement('div');
        windowDiv.id = 'scratch-broadcast-window';
        windowDiv.style.cssText = `
            position: fixed;
            width: 360px;
            max-height: 50vh;
            background: rgba(20,20,40,0.85);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 0;
            z-index: 10000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.08);
            color: #e8e8e8;
            font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
            display: flex;
            flex-direction: column;
            animation: srm-scale-in 0.35s cubic-bezier(.34,1.56,.64,1);
            overflow: hidden;
            transition: opacity 0.25s ease, transform 0.25s ease;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes srm-scale-in {
                from { opacity: 0; transform: scale(.92) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes srm-scale-out {
                from { opacity: 1; transform: scale(1) translateY(0); }
                to { opacity: 0; transform: scale(.92) translateY(20px); }
            }
            #scratch-broadcast-window .srm-scrollable::-webkit-scrollbar {
                width: 4px;
            }
            #scratch-broadcast-window .srm-scrollable::-webkit-scrollbar-track {
                background: transparent;
            }
            #scratch-broadcast-window .srm-scrollable::-webkit-scrollbar-thumb {
                background: #4fc3f7;
                border-radius: 4px;
            }
            #scratch-broadcast-window .srm-scrollable::-webkit-scrollbar-thumb:hover {
                background: #0288d1;
            }
            .srm-broadcast-card {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                padding: 12px 16px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(.34,1.56,.64,1);
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
                overflow: hidden;
            }
            .srm-broadcast-card:hover {
                transform: translateY(-2px) scale(1.01);
                border-color: #4fc3f7;
                box-shadow: 0 8px 25px rgba(79,195,247,0.15);
            }
            .srm-broadcast-card:active {
                transform: scale(.98);
            }
            .srm-broadcast-card .srm-card-name {
                font-size: 14px;
                font-weight: 500;
                color: #4fc3f7;
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .srm-broadcast-card .srm-card-count {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
                flex-shrink: 0;
                margin-left: 12px;
            }
            .srm-broadcast-card .srm-card-check {
                display: none;
                font-size: 16px;
                color: #4CAF50;
                flex-shrink: 0;
                margin-left: 8px;
                font-weight: bold;
            }
            .srm-broadcast-card.srm-card-flash {
                background: rgba(76,175,80,0.25) !important;
                border-color: #4CAF50 !important;
            }
            .srm-broadcast-card.srm-card-flash .srm-card-check {
                display: inline;
            }
        `;
        document.head.appendChild(style);

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px 12px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0;
        `;
        header.innerHTML = `
            <span style="font-size: 18px; font-weight: 700; color: #e8e8e8; letter-spacing: -0.3px;">消息广播器</span>
            <button id="broadcast-close-btn" style="
                background: rgba(255,255,255,0.08);
                border: none;
                color: rgba(255,255,255,0.5);
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                padding: 0;
            ">✕</button>
        `;
        windowDiv.appendChild(header);

        setTimeout(() => {
            const closeBtn = document.getElementById('broadcast-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('mouseenter', () => {
                    closeBtn.style.background = 'rgba(231,76,60,0.3)';
                    closeBtn.style.color = '#ff6b6b';
                });
                closeBtn.addEventListener('mouseleave', () => {
                    closeBtn.style.background = 'rgba(255,255,255,0.08)';
                    closeBtn.style.color = 'rgba(255,255,255,0.5)';
                });
                closeBtn.addEventListener('click', () => {
                    closeFloatingWindow();
                });
            }
        }, 0);

        const listContainer = document.createElement('div');
        listContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 12px 16px 8px 16px;
            max-height: calc(50vh - 120px);
            min-height: 60px;
        `;
        listContainer.classList.add('srm-scrollable');

        const refreshContainer = document.createElement('div');
        refreshContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px 16px 20px;
            border-top: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0;
        `;

        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '刷新列表';
        refreshBtn.style.cssText = `
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.7);
            padding: 6px 16px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
        `;
        refreshBtn.addEventListener('mouseenter', () => {
            refreshBtn.style.background = 'rgba(255,255,255,0.12)';
            refreshBtn.style.color = '#fff';
        });
        refreshBtn.addEventListener('mouseleave', () => {
            refreshBtn.style.background = 'rgba(255,255,255,0.05)';
            refreshBtn.style.color = 'rgba(255,255,255,0.7)';
        });

        const statusSpan = document.createElement('span');
        statusSpan.style.cssText = `
            font-size: 12px;
            color: rgba(255,255,255,0.4);
        `;
        statusSpan.textContent = `${broadcastList.length} 个广播`;

        refreshContainer.appendChild(refreshBtn);
        refreshContainer.appendChild(statusSpan);
        windowDiv.appendChild(refreshContainer);

        function renderList() {
            const list = getBroadcastList(vmInstance);
            statusSpan.textContent = `${list.length} 个广播`;
            if (list.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align:center;padding:30px 0;color:rgba(255,255,255,0.4);">
                        <div style="font-size:32px;display:block;margin-bottom:10px;opacity:0.5;">?</div>
                        <div style="font-size:14px;">暂无广播</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.2);margin-top:6px;">请在项目中添加"当收到广播"积木</div>
                    </div>
                `;
                return;
            }
            let html = '';
            for (const item of list) {
                html += `
                    <div class="srm-broadcast-card" data-name="${item.name.replace(/"/g, '&quot;')}" data-nameupper="${item.nameUpper}">
                        <span class="srm-card-name">${item.name}</span>
                        <span class="srm-card-count">${item.count} 个接收者</span>
                        <span class="srm-card-check">✓</span>
                    </div>
                `;
            }
            listContainer.innerHTML = html;

            const cards = listContainer.querySelectorAll('.srm-broadcast-card');
            cards.forEach(card => {
                const nameUpper = card.dataset.nameupper;
                card.addEventListener('click', () => {
                    const count = doBroadcast(vmInstance, nameUpper);
                    card.classList.add('srm-card-flash');
                    setTimeout(() => {
                        card.classList.remove('srm-card-flash');
                    }, 600);
                    showToast(`已广播 "${card.dataset.name}" (${count} 个线程启动)`);
                });
            });
        }

        function showLoading() {
            listContainer.innerHTML = `
                <div style="text-align:center;padding:30px 0;">
                    <div style="
                        width: 24px;
                        height: 24px;
                        border: 2px solid rgba(255,255,255,0.1);
                        border-top-color: #888;
                        border-radius: 50%;
                        animation: srm-spin 0.8s linear infinite;
                        margin: 0 auto;
                    "></div>
                </div>
            `;
            const spinStyle = document.createElement('style');
            spinStyle.textContent = `@keyframes srm-spin { to { transform: rotate(360deg); } }`;
            if (!document.getElementById('srm-spin-style')) {
                spinStyle.id = 'srm-spin-style';
                document.head.appendChild(spinStyle);
            }
        }

        refreshBtn.addEventListener('click', () => {
            showLoading();
            setTimeout(() => {
                renderList();
            }, 400);
        });

        listContainer.appendChild(document.createElement('div'));
        renderList();

        windowDiv.insertBefore(listContainer, refreshContainer);

        document.body.appendChild(windowDiv);

        const ballRect = floatingBall.getBoundingClientRect();
        winX = ballRect.right + 20;
        winY = ballRect.top - (windowDiv.offsetHeight || 300) + 10;
        const maxX = window.innerWidth - (windowDiv.offsetWidth || 340);
        const maxY = window.innerHeight - (windowDiv.offsetHeight || 300);
        winX = clamp(winX, 0, maxX);
        winY = clamp(winY, 0, maxY);
        windowDiv.style.left = winX + 'px';
        windowDiv.style.top = winY + 'px';
        windowDiv.style.right = 'auto';
        windowDiv.style.bottom = 'auto';

        windowDiv.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('.srm-broadcast-card')) return;
            isDraggingWindow = true;
            const rect = windowDiv.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            windowDiv.style.cursor = 'grabbing';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDraggingWindow) return;
            winX = e.clientX - dragOffsetX;
            winY = e.clientY - dragOffsetY;
            clampWindowRect(windowDiv, windowDiv.offsetWidth || 340, windowDiv.offsetHeight || 300);
        });
        document.addEventListener('mouseup', () => {
            if (isDraggingWindow) {
                isDraggingWindow = false;
                windowDiv.style.cursor = 'default';
            }
        });

        return windowDiv;
    }

    let toastTimer = null;

    function showToast(message) {
        const existing = document.getElementById('scratch-toast');
        if (existing) existing.remove();
        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
        }

        const toast = document.createElement('div');
        toast.id = 'scratch-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: rgba(20,20,40,0.9);
            backdrop-filter: blur(20px);
            padding: 12px 24px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.06);
            color: #e8e8e8;
            font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 25px 60px rgba(0,0,0,0.8);
            z-index: 10001;
            opacity: 0;
            transition: all 0.4s cubic-bezier(.34,1.56,.64,1);
            pointer-events: none;
            max-width: 80%;
            text-align: center;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 400);
            toastTimer = null;
        }, 2000);
    }

    function toggleFloatingWindow() {
        if (isOpen) {
            closeFloatingWindow();
        } else {
            openFloatingWindow();
        }
    }

    function openFloatingWindow() {
        if (!vm) {
            showToast('VM未就绪，请等待页面加载完成');
            return;
        }
        const win = createFloatingWindow(vm);
        if (win) {
            isOpen = true;
            floatingWindow = win;
            if (floatingBall) {
                isActive = true;
                floatingBall.style.background = 'linear-gradient(135deg, #4fc3f7, #0288d1)';
                floatingBall.style.opacity = '1';
                floatingBall.style.transform = 'scale(1)';
                floatingBall.style.boxShadow = '0 4px 20px rgba(2,136,209,0.4)';
            }
        }
    }

    function closeFloatingWindow() {
        if (floatingWindow) {
            floatingWindow.style.animation = 'srm-scale-out 0.25s cubic-bezier(.34,1.56,.64,1)';
            setTimeout(() => {
                if (floatingWindow && floatingWindow.parentNode) {
                    floatingWindow.remove();
                }
                floatingWindow = null;
            }, 250);
        }
        isOpen = false;
        if (floatingBall) {
            isActive = false;
            floatingBall.style.background = 'rgba(100,100,100,0.4)';
            floatingBall.style.opacity = '0.6';
            floatingBall.style.transform = 'scale(0.95)';
            floatingBall.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        }
    }

    async function init() {
        console.log('[Broadcast Simulator] 正在初始化...');
        try {
            vm = await getVM();
        } catch (e) {
            console.warn('[Broadcast Simulator] 获取VM失败:', e);
            const retryBtn = document.createElement('div');
            retryBtn.id = 'scratch-broadcast-retry';
            retryBtn.innerHTML = 'VM获取失败，点击重试';
            retryBtn.style.cssText = `
                position: fixed;
                bottom: 80px;
                right: 20px;
                z-index: 9999;
                padding: 10px 18px;
                background: linear-gradient(135deg, #f44336, #d32f2f);
                color: white;
                border-radius: 25px;
                cursor: pointer;
                font-family: -apple-system, 'PingFang SC', 'Segoe UI', sans-serif;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                user-select: none;
            `;
            retryBtn.addEventListener('click', () => {
                retryBtn.remove();
                init();
            });
            document.body.appendChild(retryBtn);
            return;
        }
        if (!vm) {
            console.warn('[Broadcast Simulator] VM为空');
            return;
        }
        console.log('[Broadcast Simulator] VM获取成功', vm);
        try {
            await waitForProjectLoad(vm);
            console.log('[Broadcast Simulator] 作品加载完成');
        } catch (e) {
            console.warn('[Broadcast Simulator] 等待作品加载失败:', e);
        }
        floatingBall = createFloatingBall();
        console.log('[Broadcast Simulator] 初始化完成！');
    }

    if (document.readyState === 'complete') {
        setTimeout(init, 500);
    } else {
        window.addEventListener('load', () => {
            setTimeout(init, 500);
        });
    }

})();