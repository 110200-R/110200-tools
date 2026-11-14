// ==UserScript==
// @name         CCW 角色信息面板
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  在 ccw.site 获取 vm，显示并修改所有角色信息，支持导出造型 SVG
// @author       会飞的黄油
// @match        https://www.ccw.site/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function getVm() {
        return new Promise((resolve) => {
            const originalBind = Function.prototype.bind;
            let resolved = false;

            const existing = window.vm || window._vm || window.Scratch?.vm;
            if (existing) {
                resolve(existing);
                return;
            }

            Function.prototype.bind = function (thisArg, ...args) {
                const isVm = thisArg && typeof thisArg === 'object' &&
                    ((typeof thisArg.start === 'function' && typeof thisArg.loadProject === 'function') ||
                     (thisArg.runtime && typeof thisArg.runtime === 'object') ||
                     (thisArg.hasOwnProperty('editingTarget') && thisArg.hasOwnProperty('runtime')) ||
                     (thisArg.constructor && thisArg.constructor.name?.includes('VM')));
                if (isVm && !resolved) {
                    resolved = true;
                    Function.prototype.bind = originalBind;
                    resolve(thisArg);
                    return originalBind.apply(this, [thisArg, ...args]);
                }
                return originalBind.apply(this, [thisArg, ...args]);
            };

            let attempts = 0;
            const timer = setInterval(() => {
                attempts++;
                const vm = window.vm || window._vm || window.Scratch?.vm;
                if (vm) {
                    clearInterval(timer);
                    if (!resolved) {
                        resolved = true;
                        Function.prototype.bind = originalBind;
                        resolve(vm);
                    }
                }
                if (attempts >= 60) {
                    clearInterval(timer);
                    if (!resolved) {
                        resolved = true;
                        Function.prototype.bind = originalBind;
                        resolve(null);
                    }
                }
            }, 500);
        });
    }

    function getTargetName(target) {
        return target.sprite?.name || '舞台';
    }

    function getCostumes(target) {
        if (!target.sprite || !target.sprite.costumes) return [];
        return target.sprite.costumes;
    }

    function applyTargetState(vm, target, x, y, costumeIndex, visible) {
        if (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) {
            target.setXY(x, y);
        }
        if (typeof costumeIndex === 'number' && costumeIndex >= 0) {
            target.setCostume(costumeIndex);
        }
        if (typeof visible === 'boolean') {
            target.setVisible(visible);
        }
        vm.runtime.requestRedraw();
        vm.runtime.requestTargetsUpdate(target);
    }

    function exportCostumeAsSVG(target, costumeIndex) {
        const costumes = getCostumes(target);
        const costume = costumes[costumeIndex];
        if (!costume || !costume.asset) {
            alert('该造型没有资源数据');
            return;
        }

        if (costume.dataFormat !== 'svg') {
            alert(`该造型是位图（${costume.dataFormat}），没有 SVG 可导出`);
            return;
        }

        try {
            const dataUri = costume.asset.encodeDataURI();
            const safeName = (costume.name || 'costume').replace(/[\\/:*?"<>|]/g, '_');

            const a = document.createElement('a');
            a.href = dataUri;
            a.download = `${safeName}.svg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error('导出 SVG 失败:', e);
            alert('导出失败：' + e.message);
        }
    }

    function createPanel(vm) {
        const win = document.createElement('div');
        win.style.cssText = `
            position: fixed;
            top: 60px;
            left: 60px;
            width: 780px;
            max-width: 95vw;
            max-height: 80vh;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            font-family: 'Segoe UI', Arial, sans-serif;
            z-index: 999999999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            background: #0a1a77;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
            flex-shrink: 0;
        `;
        const titleText = document.createElement('span');
        titleText.textContent = '角色信息面板';
        titleText.style.cssText = 'color:#fff;font-weight:700;font-size:16px;';

        const btnBox = document.createElement('div');
        btnBox.style.cssText = 'display:flex;gap:8px;';

        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '刷新';
        refreshBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none; color:#fff; padding: 6px 12px;
            border-radius: 6px; font-size: 13px; cursor: pointer;
        `;
        refreshBtn.onmouseover = () => refreshBtn.style.background = 'rgba(255,255,255,0.35)';
        refreshBtn.onmouseout  = () => refreshBtn.style.background = 'rgba(255,255,255,0.2)';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none; color:#fff; width: 32px; height: 32px;
            border-radius: 50%; font-size: 16px; cursor: pointer;
            display:flex; align-items:center; justify-content:center;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.35)';
        closeBtn.onmouseout  = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
        closeBtn.onclick = () => win.remove();

        btnBox.appendChild(refreshBtn);
        btnBox.appendChild(closeBtn);
        titleBar.appendChild(titleText);
        titleBar.appendChild(btnBox);

        const COLS = '120px 80px 140px 65px 65px 75px 55px 65px';
        const header = document.createElement('div');
        header.style.cssText = `
            display: grid;
            grid-template-columns: ${COLS};
            gap: 6px;
            padding: 10px 12px;
            background: #f0f0f7;
            font-weight: 600;
            font-size: 12px;
            color: #333;
            border-bottom: 1px solid #ddd;
            flex-shrink: 0;
        `;
        ['角色名', 'ID', '造型', 'x', 'y', '显示/隐藏', '导出', '操作'].forEach(t => {
            const c = document.createElement('div');
            c.textContent = t;
            header.appendChild(c);
        });

        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 4px 0;
        `;

        function renderRows() {
            content.innerHTML = '';
            const targets = vm.runtime.targets;

            if (!targets.length) {
                const empty = document.createElement('div');
                empty.textContent = '（暂无角色）';
                empty.style.cssText = 'padding:20px;text-align:center;color:#999;';
                content.appendChild(empty);
                return;
            }

            targets.forEach((target) => {
                const row = document.createElement('div');
                row.style.cssText = `
                    display: grid;
                    grid-template-columns: ${COLS};
                    gap: 6px;
                    padding: 8px 12px;
                    align-items: center;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 12px;
                `;

                const nameEl = document.createElement('div');
                nameEl.textContent = getTargetName(target);
                nameEl.title = getTargetName(target);
                nameEl.style.cssText = `
                    font-weight:600; color:${target.isStage ? '#888' : '#333'};
                    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
                `;

                const idEl = document.createElement('div');
                idEl.textContent = target.id;
                idEl.title = target.id;
                idEl.style.cssText = `
                    font-family: monospace; font-size: 10px; color:#999;
                    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
                `;

                const costumeSelect = document.createElement('select');
                costumeSelect.style.cssText = `
                    width: 100%; padding: 3px 4px; border: 1px solid #ddd;
                    border-radius: 4px; font-size: 11px; background: #fff;
                `;
                const costumes = getCostumes(target);
                if (costumes.length === 0) {
                    const opt = document.createElement('option');
                    opt.textContent = '（无造型）';
                    costumeSelect.appendChild(opt);
                    costumeSelect.disabled = true;
                } else {
                    costumes.forEach((costume, i) => {
                        const opt = document.createElement('option');
                        opt.value = i;
                        opt.textContent = costume.name;
                        costumeSelect.appendChild(opt);
                    });
                    costumeSelect.value = target.currentCostume ?? 0;
                }

                const xInput = document.createElement('input');
                xInput.type = 'number';
                xInput.value = Math.round(target.x * 100) / 100;
                xInput.style.cssText = `
                    width: 100%; padding: 3px 4px; border: 1px solid #ddd;
                    border-radius: 4px; font-size: 11px; box-sizing: border-box;
                `;

                const yInput = document.createElement('input');
                yInput.type = 'number';
                yInput.value = Math.round(target.y * 100) / 100;
                yInput.style.cssText = `
                    width: 100%; padding: 3px 4px; border: 1px solid #ddd;
                    border-radius: 4px; font-size: 11px; box-sizing: border-box;
                `;

                const visBtn = document.createElement('button');
                function updateVisBtn() {
                    const visible = target.visible;
                    visBtn.textContent = visible ? '显示中' : '已隐藏';
                    visBtn.style.background = visible ? '#4CAF50' : '#bbb';
                    visBtn.style.color = visible ? '#fff' : '#333';
                }
                visBtn.style.cssText = `
                    padding: 4px 6px; border: none; border-radius: 4px;
                    font-size: 11px; cursor: pointer; transition: background .15s;
                `;
                updateVisBtn();
                visBtn.addEventListener('click', () => {
                    target.setVisible(!target.visible);
                    vm.runtime.requestRedraw();
                    vm.runtime.requestTargetsUpdate(target);
                    updateVisBtn();
                });

                const exportBtn = document.createElement('button');
                exportBtn.textContent = 'SVG';
                exportBtn.title = '导出当前选中造型为 SVG 文件';
                exportBtn.style.cssText = `
                    padding: 4px 6px; border: none; background: #f5a623;
                    color: #fff; border-radius: 4px; font-size: 11px;
                    cursor: pointer; transition: background .15s;
                `;
                exportBtn.onmouseover = () => exportBtn.style.background = '#e0951a';
                exportBtn.onmouseout  = () => exportBtn.style.background = '#f5a623';
                exportBtn.addEventListener('click', () => {
                    if (costumeSelect.disabled) {
                        alert('该角色没有造型');
                        return;
                    }
                    exportCostumeAsSVG(target, Number(costumeSelect.value));
                });

                const applyBtn = document.createElement('button');
                applyBtn.textContent = '更改';
                applyBtn.style.cssText = `
                    padding: 4px 8px; border: none; background: #51dfcc;
                    color: #000; border-radius: 4px; font-size: 11px;
                    cursor: pointer; transition: background .15s;
                `;
                applyBtn.onmouseover = () => applyBtn.style.background = '#3cc9b5';
                applyBtn.onmouseout  = () => applyBtn.style.background = '#51dfcc';
                applyBtn.addEventListener('click', () => {
                    const x = Number(xInput.value);
                    const y = Number(yInput.value);
                    const costumeIndex = costumeSelect.disabled ? undefined : Number(costumeSelect.value);

                    applyTargetState(vm, target, x, y, costumeIndex, undefined);

                    xInput.value = Math.round(target.x * 100) / 100;
                    yInput.value = Math.round(target.y * 100) / 100;
                    updateVisBtn();
                });

                row.append(nameEl, idEl, costumeSelect, xInput, yInput, visBtn, exportBtn, applyBtn);
                content.appendChild(row);
            });
        }

        renderRows();
        refreshBtn.addEventListener('click', renderRows);

        win.appendChild(titleBar);
        win.appendChild(header);
        win.appendChild(content);

        // 拖拽
        let dragging = false, offsetX = 0, offsetY = 0;
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target === closeBtn || e.target === refreshBtn) return;
            const rect = win.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            dragging = true;
            win.style.transition = 'none';
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const maxX = window.innerWidth - win.offsetWidth;
            const maxY = window.innerHeight - win.offsetHeight;
            win.style.left = Math.max(0, Math.min(e.clientX - offsetX, maxX)) + 'px';
            win.style.top  = Math.max(0, Math.min(e.clientY - offsetY, maxY)) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (dragging) {
                dragging = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            }
        });

        document.body.appendChild(win);
        return win;
    }

    (async function () {
        const vm = await getVm();
        if (!vm) {
            console.error('[角色面板] 获取 vm 失败');
            return;
        }
        console.log('[角色面板] vm 已获取', vm);
        const timer = setInterval(() => {
            if (vm.runtime && vm.runtime.targets && vm.runtime.targets.length > 0) {
                clearInterval(timer);
                createPanel(vm);
            }
        }, 300);
        setTimeout(() => clearInterval(timer), 30000);
    })();

})();