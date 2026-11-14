// ==UserScript==
// @name         显示ccwdata隐藏积木
// @version      1.0.3
// @description  显示ccwdata扩展里的隐藏积木
// @match        https://www.ccw.site/gandi*
// @match        https://www.ccw.site/creator*
// @author       不想上学
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==
function patch(obj, p, fn) {
    if (obj[p]) obj[p] = fn(obj[p]);
}
function trapViaBind() {
    return new Promise((resolve, reject) => {
        trapViaBindReject = reject;
        setTimeout(() => reject(new Error("获取VM超时")), 15000);
        patch(Function.prototype, "bind", _bind => {
            return function (self2, ...args) {
                if (
                    self2?.editingTarget !== undefined &&
                    self2?.runtime !== undefined
                ) {
                    Function.prototype.bind = _bind;
                    resolve(self2);
                    return _bind.call(this, self2, ...args);
                }
                return _bind.call(this, self2, ...args);
            };
        });
    });
}

function getReduxStoreFromDOM() {
    try {
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            for (const root of window.__REACT_DEVTOOLS_GLOBAL_HOOK__.getFiberRoots?.(
                1
            ) || []) {
                const state = findReduxStore(root);
                if (state) return state;
            }
        }

        const elements = document.querySelectorAll("*");
        for (const el of elements) {
            try {
                const key = Object.keys(el).find(k =>
                    k.includes("__reactContainer")
                );
                if (key && el[key]) {
                    const result = searchReactTreeSafe(el[key]);
                    if (result) return result;
                }
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        console.warn("获取Redux Store失败", e);
    }
    return null;

    function findReduxStore(obj, seen = new Set()) {
        if (!obj || seen.has(obj)) return null;
        seen.add(obj);

        try {
            if (obj?.memoizedState?.state?.scratchGui?.vm) {
                return obj.memoizedState.state;
            }
            if (obj?.stateNode?.state?.scratchGui?.vm) {
                return obj.stateNode;
            }
            if (obj?.getState?.()?.scratchGui?.vm) {
                return obj;
            }

            for (const key in obj) {
                if (obj[key] && typeof obj[key] === "object") {
                    const result = findReduxStore(obj[key], seen);
                    if (result) return result;
                }
            }
        } catch (e) {}
        return null;
    }

    function searchReactTreeSafe(obj, seen = new Set()) {
        if (!obj || seen.has(obj)) return null;
        seen.add(obj);

        try {
            if (obj.getState) {
                const state = obj.getState();
                if (state?.scratchGui?.vm && state.scratchPaint) {
                    return obj;
                }
            }

            for (const key in obj) {
                if (obj[key] && typeof obj[key] === "object") {
                    const result = searchReactTreeSafe(obj[key], seen);
                    if (result) return result;
                }
            }
        } catch (e) {}
        return null;
    }
}
async function getVM() {
    let _vm = window.eureka?.vm;
    if (_vm) {
        console.log("通过Eureka获取vm", _vm);
    } else if ((_vm = window.vm ?? unsafeWindow.vm)) {
        console.log("通过全局变量获取vm", _vm);
    } else if (document.readyState === "complete") {
        _vm = getReduxStoreFromDOM()?.getState()?.scratchGui?.vm;
        if (!_vm) throw "无法从DOM获取vm";
        console.log("通过DOM获取vm", _vm);
    } else {
        _vm = await trapViaBind();
        console.log("通过Bind获取vm", _vm);
    }
    return (window.vm = _vm);
}
let vm = await getVM(),
    _ccwdata;
const { runtime } = vm;
async function refreshBlocks() {
    try {
        await runtime.extensionManager.refreshBlocks();
        try {
            runtime.requestBlocksUpdate();
        } catch (e) {
            console.error(e);
        }
    } catch (e) {
        console.error(e);
    }
    return 0;
}
Object.defineProperty(runtime, "ext_CCWData", {
    get: () => _ccwdata,
    set(ccwdata) {
        console.log("ccwdata", ccwdata);
        if (ccwdata && ccwdata.getInfo) {
            patch(
                ccwdata,
                "getInfo",
                _getInfo =>
                    function () {
                        const info = _getInfo.apply(this, arguments);
                        info.blocks.unshift("---已显示隐藏积木");
                        for (const block of info.blocks) {
                            delete block.hideFromPalette;
                        }
                        return info;
                    }
            );
        }
        setTimeout(refreshBlocks, 0);
        return (_ccwdata = ccwdata);
    },
    configurable: true
});
