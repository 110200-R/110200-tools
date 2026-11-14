
// ==UserScript==
// @name         拾荒者控制面板
// @namespace    https://www.ccw.site/
// @version      1.1.0
// @description  拾荒者专用变量控制面板
// @match        https://www.ccw.site/detail/6a49aebe657fa02c80b54f58*
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ==============================
    // 基础配置
    // ==============================

    const page = typeof unsafeWindow !== 'undefined'
        ? unsafeWindow
        : window;

    const CONFIG = {
        variables: {
            assets: '(*游戏）玩家资产',
            hp: '（玩家）玩家血量',
            stamina: '(玩家）玩家体力',
            weapons: '(武器）武器数据列表',
            helmet: '（头盔）头盔数据列表'
        }
    };

    const STATE = {
        vm: null,
        initialized: false,
        hpLocked: false,
        staminaLocked: false,
        panel: null,
        status: null,
        opener: null,
        syncFrame: null,
        refreshTimer: null
    };

    // ==============================
    // VM 获取
    // ==============================

    function isVM(obj) {
        return !!(
            obj &&
            obj.runtime &&
            Array.isArray(obj.runtime.targets)
        );
    }

    function findVM() {
        const candidates = [
            page.eureka?.vm,
            page.vm,
            page.Scratch?.vm,
            page.Scratch?.runtime?.extensionManager?.vm,
            page.__scratchVM
        ];

        return candidates.find(isVM) || null;
    }

    function waitForVM() {
        let attempts = 0;

        const timer = setInterval(() => {
            STATE.vm = findVM();
            attempts++;

            if (STATE.vm) {
                clearInterval(timer);
                initialize();
                return;
            }

            if (attempts >= 60) {
                clearInterval(timer);
                setStatus('未找到游戏 VM，请确认游戏已加载');
            }
        }, 500);
    }

    // ==============================
    // 变量查找
    // ==============================

    function findVariable(fullName) {
        const vm = STATE.vm;

        if (!vm) return null;

        for (const target of vm.runtime.targets) {
            if (!target || !target.variables) continue;

            const variables = Object.values(target.variables);

            for (const variable of variables) {
                if (
                    variable &&
                    variable.name === fullName
                ) {
                    return {
                        target,
                        variable
                    };
                }
            }
        }

        return null;
    }

    function getEntry(key) {
        const fullName = CONFIG.variables[key];

        if (!fullName) return null;

        return findVariable(fullName);
    }

    function readValue(key) {
        const entry = getEntry(key);

        return entry ? entry.variable.value : undefined;
    }

    function writeValue(key, value) {
        const entry = getEntry(key);

        if (!entry) {
            setStatus('找不到变量：' + CONFIG.variables[key]);
            return false;
        }

        entry.variable.value = value;
        return true;
    }

    // ==============================
    // 数据解析
    // ==============================

    function parseInput(text) {
        const input = text.trim();

        if (input === '') return '';

        try {
            return JSON.parse(input);
        } catch (_) {
            const number = Number(input);

            if (Number.isFinite(number)) {
                return number;
            }

            return text;
        }
    }

    function formatValue(value) {
        if (typeof value === 'string') {
            return value;
        }

        try {
            return JSON.stringify(value, null, 2);
        } catch (_) {
            return String(value);
        }
    }

    // ==============================
    // 锁定功能
    // ==============================

    function setLock(key, enabled) {
        if (key === 'hp') {
            STATE.hpLocked = enabled;
        }

        if (key === 'stamina') {
            STATE.staminaLocked = enabled;
        }

        if (enabled) {
            writeValue(key, 100);
        }

        updateLockUI();

        setStatus(
            CONFIG.variables[key] +
            (enabled ? ' 已锁定为 100' : ' 已解除锁定')
        );
    }

    function syncLocks() {
        if (!STATE.vm) return;

        if (STATE.hpLocked) {
            writeValue('hp', 100);
        }

        if (STATE.staminaLocked) {
            writeValue('stamina', 100);
        }

        STATE.syncFrame = requestAnimationFrame(syncLocks);
    }

    // ==============================
    // DOM 工具
    // ==============================

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function setStatus(message) {
        if (STATE.status) {
            STATE.status.textContent = message;
        }
    }

    // ==============================
    // 编辑器
    // ==============================

    function createEditor(title, key) {
        const section = createElement('div', 'sc-section');

        const heading = createElement(
            'div',
            'sc-heading',
            title
        );

        const textarea = createElement(
            'textarea',
            'sc-textarea'
        );

        textarea.spellcheck = false;
        textarea.dataset.key = key;

        const initialValue = readValue(key);

        textarea.value = initialValue === undefined
            ? ''
            : formatValue(initialValue);

        const saveButton = createElement(
            'button',
            'sc-button',
            '应用修改'
        );

        saveButton.onclick = () => {
            try {
                const value = parseInput(textarea.value);

                if (writeValue(key, value)) {
                    setStatus(title + '：修改成功');
                }
            } catch (error) {
                setStatus('修改失败：' + error.message);
            }
        };

        const refreshButton = createElement(
            'button',
            'sc-button sc-secondary',
            '读取当前值'
        );

        refreshButton.onclick = () => {
            const value = readValue(key);

            if (value === undefined) {
                setStatus('读取失败：找不到变量');
                return;
            }

            textarea.value = formatValue(value);
            setStatus(title + '：已读取');
        };

        section.append(
            heading,
            textarea,
            saveButton,
            refreshButton
        );

        return section;
    }

    // ==============================
    // 锁定按钮
    // ==============================

    function createLock(title, key) {
        const row = createElement('div', 'sc-lock-row');

        const label = createElement(
            'span',
            'sc-lock-label',
            title
        );

        const button = createElement(
            'button',
            'sc-lock-button'
        );

        button.dataset.key = key;

        button.onclick = () => {
            const enabled = key === 'hp'
                ? !STATE.hpLocked
                : !STATE.staminaLocked;

            setLock(key, enabled);
        };

        row.append(label, button);

        return row;
    }

    function updateLockUI() {
        if (!STATE.panel) return;

        STATE.panel
            .querySelectorAll('.sc-lock-button')
            .forEach(button => {
                const key = button.dataset.key;

                const enabled = key === 'hp'
                    ? STATE.hpLocked
                    : STATE.staminaLocked;

                button.textContent = enabled
                    ? '锁定中 · 100'
                    : '未锁定';

                button.classList.toggle(
                    'active',
                    enabled
                );
            });
    }

    // ==============================
    // 自动刷新
    // ==============================

    function refreshAll() {
        if (!STATE.panel || !STATE.vm) return;

        STATE.panel
            .querySelectorAll('textarea[data-key]')
            .forEach(textarea => {
                if (document.activeElement === textarea) {
                    return;
                }

                const value = readValue(textarea.dataset.key);

                if (value !== undefined) {
                    textarea.value = formatValue(value);
                }
            });
    }

    // ==============================
    // CSS
    // ==============================

    function addStyle() {
        const style = document.createElement('style');

        style.textContent = `
            #sc-panel {
                position: fixed;
                top: 100px;
                right: 30px;
                width: 350px;
                max-height: 82vh;
                overflow-y: auto;
                z-index: 999999;
                color: #e8edf5;
                background: #171b24;
                border: 1px solid #3d485b;
                border-radius: 12px;
                box-shadow: 0 10px 35px #0009;
                font-family: Arial, sans-serif;
                font-size: 13px;
            }

            #sc-panel * {
                box-sizing: border-box;
            }

            .sc-header {
                padding: 14px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #252e3e;
                border-radius: 12px 12px 0 0;
                cursor: move;
                font-size: 15px;
                font-weight: bold;
            }

            .sc-close {
                color: white;
                border: none;
                background: transparent;
                font-size: 20px;
                cursor: pointer;
            }

            .sc-content {
                padding: 12px;
            }

            .sc-status {
                padding: 9px;
                margin-bottom: 12px;
                color: #9cc8ff;
                background: #222b3a;
                border-radius: 7px;
                word-break: break-all;
            }

            .sc-section {
                padding: 11px;
                margin-bottom: 10px;
                background: #222936;
                border-radius: 8px;
            }

            .sc-heading {
                margin-bottom: 9px;
                color: #dce9ff;
                font-weight: bold;
            }

            .sc-textarea {
                display: block;
                width: 100%;
                min-height: 75px;
                max-height: 190px;
                resize: vertical;
                padding: 9px;
                color: #bce4ff;
                background: #11151d;
                border: 1px solid #424e62;
                border-radius: 6px;
                outline: none;
                font-family: Consolas, monospace;
                font-size: 12px;
            }

            .sc-textarea:focus {
                border-color: #5599e8;
            }

            .sc-button,
            .sc-lock-button {
                padding: 8px 12px;
                margin-top: 8px;
                margin-right: 6px;
                color: white;
                background: #3979c9;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }

            .sc-button:hover {
                background: #4b91e5;
            }

            .sc-secondary {
                background: #505c70;
            }

            .sc-lock-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px;
                margin-bottom: 7px;
                background: #222936;
                border-radius: 7px;
            }

            .sc-lock-label {
                color: #e2e9f5;
            }

            .sc-lock-button {
                min-width: 110px;
                margin: 0;
                background: #505c70;
            }

            .sc-lock-button.active {
                background: #21885e;
            }

            .sc-footer {
                padding: 8px 2px;
                color: #8390a5;
                font-size: 11px;
                line-height: 1.6;
            }

            #sc-opener {
                position: fixed;
                right: 20px;
                bottom: 25px;
                z-index: 999998;
                padding: 11px 15px;
                color: white;
                background: #3979c9;
                border: none;
                border-radius: 8px;
                cursor: pointer;
            }
        `;

        document.head.appendChild(style);
    }

    // ==============================
    // 拖动面板
    // ==============================

    function makeDraggable(element, handle) {
        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener('mousedown', event => {
            if (event.target.closest('button')) return;

            dragging = true;

            const rect = element.getBoundingClientRect();

            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;

            event.preventDefault();
        });

        document.addEventListener('mousemove', event => {
            if (!dragging) return;

            element.style.left =
                Math.max(0, event.clientX - offsetX) + 'px';

            element.style.top =
                Math.max(0, event.clientY - offsetY) + 'px';

            element.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            dragging = false;
        });
    }

    // ==============================
    // 创建控制面板
    // ==============================

    function createUI() {
        addStyle();

        const panel = createElement('div');
        panel.id = 'sc-panel';

        const header = createElement('div', 'sc-header');

        const title = createElement(
            'span',
            '',
            '拾荒者控制面板'
        );

        const close = createElement(
            'button',
            'sc-close',
            '×'
        );

        const content = createElement('div', 'sc-content');

        STATE.status = createElement(
            'div',
            'sc-status',
            '正在连接游戏 VM...'
        );

        close.onclick = () => {
            panel.style.display = 'none';
            STATE.opener.style.display = 'block';
        };

        header.append(title, close);

        content.appendChild(STATE.status);

        content.append(
            createEditor('玩家资产', 'assets')
        );

        content.appendChild(
            createElement(
                'div',
                'sc-heading',
                '玩家状态锁定'
            )
        );

        content.append(
            createLock('玩家血量', 'hp'),
            createLock('玩家体力', 'stamina')
        );

        content.append(
            createEditor('武器数据列表', 'weapons'),
            createEditor('头盔数据列表', 'helmet')
        );

        content.appendChild(
            createElement(
                'div',
                'sc-footer',
                '拾荒者专用控制面板 · 仅修改指定的五个变量'
            )
        );

        panel.append(header, content);

        document.body.appendChild(panel);

        STATE.panel = panel;

        const opener = createElement(
            'button',
            '',
            '打开拾荒者控制面板'
        );

        opener.id = 'sc-opener';
        opener.style.display = 'none';

        opener.onclick = () => {
            panel.style.display = 'block';
            opener.style.display = 'none';
        };

        document.body.appendChild(opener);

        STATE.opener = opener;

        makeDraggable(panel, header);

        updateLockUI();
    }

    // ==============================
    // 初始化
    // ==============================

    function initialize() {
        if (STATE.initialized) return;

        STATE.initialized = true;

        createUI();

        setStatus('已连接游戏 VM');

        // 首次读取
        refreshAll();

        // 定时刷新
        STATE.refreshTimer = setInterval(
            refreshAll,
            1000
        );

        // 锁定循环
        if (
            STATE.hpLocked ||
            STATE.staminaLocked
        ) {
            requestAnimationFrame(syncLocks);
        }
    }

    // ==============================
    // 启动
    // ==============================

    createUI();

    waitForVM();

    // 锁定循环始终运行，开启锁定后自动生效
    function startLockLoop() {
        if (!STATE.vm) {
            requestAnimationFrame(startLockLoop);
            return;
        }

        syncLocks();
    }

    requestAnimationFrame(startLockLoop);

})();
