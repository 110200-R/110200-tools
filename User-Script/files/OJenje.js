// ==UserScript==
// @name         OJenje
// @namespace    OJenje
// @version      0.1.0
// @license      MIT
// @description  一个 CCW 安全审计工具
// @author       KookyC
// @match        https://www.ccw.site/*
// @match        https://www.cocrea.world/*
// @icon         https://m.ccw.site/community/images/logo-ccw.png
// @grant        none
// @run-at       document-start
// ==/UserScript==
var OJenje = function (exports) {
  "use strict"; // src/vm/obtainVm.ts
  function obtainVm() {
    return new Promise(resolve => {
      const originalBind = Function.prototype.bind;
      let resolved = false;
      const existingVm = window.vm || window._vm || window.Scratch?.vm;
      if (existingVm) {
        console.log("✅ 通过 window 对象获取 VM");
        resolve(existingVm);
        return;
      } else if (!existingVm) {
        console.error("失败");
      }
      let attempts = 0;
      const maxAttempts = 30;
      function checkVm() {
        attempts++;
        const vm2 = window.vm || window._vm || window.Scratch?.vm;
        if (vm2) {
          console.log("✅ VM 已获取");
          resolve(vm2);
          return;
        }
        if (attempts >= maxAttempts) {
          console.warn("⚠️ 获取 VM 超时");
          resolve(null);
          Function.prototype.bind = function (thisArg, ...args) {
            const isVmInstance = thisArg && typeof thisArg === "object" && (typeof thisArg.start === "function" && typeof thisArg.loadProject === "function" || thisArg.runtime && typeof thisArg.runtime === "object" || thisArg.hasOwnProperty("editingTarget") && thisArg.hasOwnProperty("runtime") || thisArg.constructor && thisArg.constructor.name?.includes("VM"));
            if (isVmInstance && !resolved) {
              resolved = true;
              Function.prototype.bind = originalBind;
              console.log("✅ 通过 bind 劫持获取 VM");
              resolve(thisArg);
              return originalBind.apply(this, [thisArg, ...args]);
            }
            return originalBind.apply(this, [thisArg, ...args]);
          };
          alert("🔧 bind 劫持已启用，等待 VM 实例化...");
          return;
        }
        console.log("⏳ 等待 VM... (尝试", attempts, ")");
        setTimeout(checkVm, 500);
      }
      checkVm();
    });
  } // src/fps/fps.ts
  function createFpsMonitor(vm2) {
    if (!vm2 || !vm2.runtime) {
      console.warn("⚠️ VM 或 runtime 不可用");
      return null;
    }
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let isRunning = false;
    let animationId = null;
    const samples = [];
    let totalFrames = 0;
    let minFps = Infinity;
    let maxFps = -Infinity;
    let jankCount = 0;
    let startTime = performance.now();
    let onFrameCallback = null;
    let onJankCallback = null;
    function measureFps() {
      if (!isRunning) {
        return;
      }
      frameCount++;
      totalFrames++;
      const now = performance.now();
      const elapsed = now - lastFpsUpdate;
      if (elapsed >= 1000) {
        const fps = Math.round(frameCount / (elapsed / 1000));
        samples.push(fps);
        if (fps < minFps) {
          minFps = fps;
        }
        if (fps > maxFps) {
          maxFps = fps;
        }
        if (fps < 30) {
          jankCount++;
          if (onJankCallback) {
            onJankCallback(fps);
          }
        }
        if (onFrameCallback) {
          onFrameCallback(fps);
        }
        if (window.__FPS_DEBUG) {
          console.log(`\u5E27\u7387${fps},${jankCount}`);
        }
        frameCount = 0;
        lastFpsUpdate = now;
      }
      animationId = requestAnimationFrame(measureFps);
    }
    return {
      /** 开始监控 FPS */start() {
        if (isRunning) {
          return;
        }
        isRunning = true;
        startTime = performance.now();
        lastFpsUpdate = performance.now();
        frameCount = 0;
        measureFps();
        console.log("📊 FPS 监控已启动");
      },
      /** 停止监控并返回报告 */stop() {
        if (!isRunning) {
          console.warn("⚠️ FPS 监控未运行");
          return null;
        }
        isRunning = false;
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        const duration = performance.now() - startTime;
        const avgFps = samples.length > 0 ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : 0;
        const report = {
          currentFps: samples[samples.length - 1] || 0,
          averageFps: avgFps,
          minFps: minFps === Infinity ? 0 : minFps,
          maxFps: maxFps === -Infinity ? 0 : maxFps,
          totalFrames,
          duration,
          samples,
          jankCount
        };
        console.log("📊 FPS 监控已停止", report);
        return report;
      },
      /** 暂停监控 */pause() {
        if (!isRunning) {
          return;
        }
        isRunning = false;
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        console.log("⏸️ FPS 监控已暂停");
      },
      /** 恢复监控 */resume() {
        if (isRunning) {
          return;
        }
        isRunning = true;
        lastFpsUpdate = performance.now();
        measureFps();
        console.log("▶️ FPS 监控已恢复");
      },
      /** 设置每帧回调 */onFrame(callback) {
        onFrameCallback = callback;
      },
      /** 设置掉帧回调 */onJank(callback) {
        onJankCallback = callback;
      },
      /** 获取实时 FPS（不停止监控） */getCurrentFps() {
        const now = performance.now();
        const elapsed = (now - lastFpsUpdate) / 1000;
        if (elapsed > 0) {
          return Math.round(frameCount / elapsed);
        } else {
          return 0;
        }
      }
    };
  } // src/fps/runFPS.ts
  function createProfiler(vm2, options = {}) {
    const {
      duration = 10000,
      autoDisable = true,
      verbose = true,
      minTimeThreshold = 0,
      minCountThreshold = 0,
      sortBy = "time",
      maxItems = 20
    } = options;
    let isProfiling = false;
    let startTime = 0;
    let timeoutId = null;
    let latestReport = null;
    function isProfilerAvailable() {
      if (!vm2?.runtime) {
        return false;
      }
      return typeof vm2.runtime.enableProfiling === "function" && typeof vm2.runtime.disableProfiling === "function" && vm2.runtime.profiler;
    }
    function formatReport(rawReport) {
      if (!rawReport || typeof rawReport !== "object") {
        return null;
      }
      let blocks = [];
      let totalCount = 0;
      if (Array.isArray(rawReport)) {
        blocks = rawReport;
      } else if (rawReport.blocks && Array.isArray(rawReport.blocks)) {
        blocks = rawReport.blocks;
      } else if (rawReport.frames && Array.isArray(rawReport.frames)) {
        blocks = rawReport.frames;
      } else if (typeof rawReport === "object") {
        blocks = Object.entries(rawReport).map(([opcode, data]) => ({
          opcode,
          totalTime: data.totalTime || data.selfTime || 0,
          selfTime: data.selfTime || data.totalTime || 0,
          count: data.count || 0
        }));
      }
      if (blocks.length === 0) {
        return null;
      }
      const formattedBlocks = blocks.map(block => {
        let totalTime2 = block.totalTime || block.selfTime || block.self || block.time || 0;
        const selfTime = block.selfTime || block.self || totalTime2;
        const count = block.count || block.executions || 0;
        totalTime2 += totalTime2;
        totalCount += count;
        return {
          opcode: block.opcode || block.name || block.id || "unknown",
          totalTime: totalTime2,
          selfTime,
          count,
          avgTime: count > 0 ? totalTime2 / count : 0,
          percentage: 0 // 稍后计算
        };
      }).filter(block => {
        if (!block.opcode || block.opcode === "unknown") {
          return false;
        }
        if (minTimeThreshold > 0 && block.totalTime < minTimeThreshold) {
          return false;
        }
        if (minCountThreshold > 0 && block.count < minCountThreshold) {
          return false;
        }
        return true;
      });
      const grandTotal = formattedBlocks.reduce((sum, b) => sum + b.totalTime, 0);
      formattedBlocks.forEach(block => {
        block.percentage = grandTotal > 0 ? block.totalTime / grandTotal * 100 : 0;
      });
      const sortMap = {
        time: (a, b) => b.totalTime - a.totalTime,
        count: (a, b) => b.count - a.count,
        selfTime: (a, b) => b.selfTime - a.selfTime
      };
      formattedBlocks.sort(sortMap[sortBy] || sortMap.time);
      const topBlocks = formattedBlocks.slice(0, maxItems);
      const suggestions = [];
      if (topBlocks.length > 0) {
        const slowest = topBlocks[0];
        if (slowest.totalTime > 100) {
          suggestions.push(`\u{1F534} \u79EF\u6728 "${slowest.opcode}" \u8017\u65F6 ${slowest.totalTime.toFixed(2)}ms\uFF0C\u5EFA\u8BAE\u4F18\u5316\u6216\u51CF\u5C11\u4F7F\u7528`);
        }
        const mostFrequent = topBlocks.reduce((a, b) => a.count > b.count ? a : b);
        if (mostFrequent.count > 1000) {
          suggestions.push(`\u{1F7E1} \u79EF\u6728 "${mostFrequent.opcode}" \u6267\u884C ${mostFrequent.count} \u6B21\uFF0C\u5EFA\u8BAE\u6279\u91CF\u5904\u7406\u6216\u7F13\u5B58\u7ED3\u679C`);
        }
        const highSelfTime = topBlocks.filter(b => b.selfTime / b.totalTime > 0.8);
        if (highSelfTime.length > 0) {
          suggestions.push(`\u{1F7E1} \u4EE5\u4E0B\u79EF\u6728\u81EA\u8EAB\u8BA1\u7B97\u5360\u6BD4\u9AD8: ${highSelfTime.map(b => b.opcode).join(", ")}`);
        }
      }
      return {
        raw: rawReport,
        blocks: topBlocks,
        summary: {
          totalTime: grandTotal,
          totalCount,
          uniqueBlocks: formattedBlocks.length,
          slowestBlock: topBlocks[0]?.opcode || "N/A",
          mostExecutedBlock: topBlocks.reduce((a, b) => a.count > b.count ? a : b)?.opcode || "N/A"
        },
        suggestions
      };
    }
    function collectReport() {
      try {
        if (!vm2?.runtime?.profiler) {
          console.warn("⚠️ Profiler 不可用");
          return null;
        }
        const rawReport = vm2.runtime.profiler.reportFrames?.() || vm2.runtime.profiler.getReport?.() || vm2.runtime.profiler;
        const formatted = formatReport(rawReport);
        latestReport = formatted;
        return formatted;
      } catch (error) {
        console.error("❌ 获取性能报告失败:", error);
        return null;
      }
    }
    function printReport(report) {
      if (!verbose) {
        return;
      }
      console.log("📊 ===== 性能分析报告 =====");
      console.log(`\u{1F4C8} \u603B\u8017\u65F6: ${report.summary.totalTime.toFixed(2)}ms`);
      console.log(`\u{1F4C8} \u603B\u6267\u884C\u6B21\u6570: ${report.summary.totalCount}`);
      console.log(`\u{1F4C8} \u6D89\u53CA\u79EF\u6728\u7C7B\u578B: ${report.summary.uniqueBlocks}`);
      console.log(`\u{1F40C} \u6700\u6162\u79EF\u6728: ${report.summary.slowestBlock}`);
      console.log(`\u{1F525} \u6700\u9891\u7E41\u79EF\u6728: ${report.summary.mostExecutedBlock}`);
      console.log("");
      if (report.blocks.length === 0) {
        console.log("📭 没有性能数据");
        return;
      }
      console.log("📋 积木性能排行 (Top " + report.blocks.length + "):");
      console.table(report.blocks.map((b, i) => ({
        "#": i + 1,
        积木: b.opcode,
        "总耗时(ms)": b.totalTime.toFixed(2),
        "自身耗时(ms)": b.selfTime.toFixed(2),
        执行次数: b.count,
        "平均耗时(ms)": b.avgTime.toFixed(2),
        "占比(%)": b.percentage.toFixed(1)
      })));
      if (report.suggestions.length > 0) {
        console.log("💡 优化建议:");
        report.suggestions.forEach(s => console.log(`  ${s}`));
      }
      console.log("============================\n");
    }
    async function runProfiling() {
      if (!isProfilerAvailable()) {
        console.warn("⚠️ 当前 VM 不支持性能分析");
        return null;
      }
      if (isProfiling) {
        console.warn("⚠️ 性能分析已在进行中");
        return null;
      }
      try {
        isProfiling = true;
        startTime = performance.now();
        console.log("🔬 性能分析已启动，持续 " + duration + "ms...");
        vm2.runtime.enableProfiling();
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, duration);
        });
        const report = collectReport();
        if (report) {
          printReport(report);
        } else {
          console.warn("⚠️ 无法生成性能报告");
        }
        if (autoDisable) {
          vm2.runtime.disableProfiling();
          console.log("🔬 性能分析已关闭");
        }
        latestReport = report;
        return report;
      } catch (error) {
        console.error("❌ 性能分析失败:", error);
        return null;
      } finally {
        isProfiling = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    }
    return {
      start() {
        runProfiling().catch(console.error);
      },
      async stop() {
        if (!isProfiling) {
          console.warn("⚠️ 性能分析未在运行");
          return latestReport;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        const report = collectReport();
        if (report) {
          printReport(report);
        }
        if (autoDisable) {
          try {
            vm2.runtime.disableProfiling();
          } catch (e) {}
        }
        isProfiling = false;
        latestReport = report;
        return report;
      },
      getReport() {
        return latestReport;
      },
      isRunning() {
        return isProfiling;
      },
      disable() {
        try {
          vm2.runtime.disableProfiling();
        } catch (e) {}
        isProfiling = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        console.log("🔬 性能分析已手动关闭");
      }
    };
  } // src/vm/list.ts
  function isList(value) {
    return Array.isArray(value);
  }
  function calculateDelta(previous, current) {
    if (typeof previous === "number" && typeof current === "number") {
      const delta = current - previous;
      const deltaPercent = previous !== 0 ? delta / Math.abs(previous) * 100 : null;
      return {
        delta,
        deltaPercent
      };
    }
    return {
      delta: null,
      deltaPercent: null
    };
  }
  function getChangeType(previous, current, delta) {
    if (previous === undefined) {
      return "set";
    }
    if (delta === null) {
      return "changed";
    }
    if (delta > 0) {
      return "increased";
    }
    if (delta < 0) {
      return "decreased";
    }
    return "changed";
  }
  function detectListChange(previous, current, id) {
    if (!previous) {
      return {
        id,
        name: "",
        value: current,
        previousValue: [],
        changeType: "set",
        details: {
          lengthDelta: current.length,
          oldLength: 0,
          newLength: current.length
        },
        timestamp: Date.now(),
        targetId: "",
        targetName: "",
        changeCount: 0
      };
    }
    if (previous.length === current.length && previous.every((v, i) => v === current[i])) {
      return null;
    }
    previous.length;
    current.length;
    if (current.length === 0 && previous.length > 0) {
      return {
        id,
        name: "",
        value: current,
        previousValue: previous,
        changeType: "cleared",
        details: {
          lengthDelta: -previous.length,
          oldLength: previous.length,
          newLength: 0
        },
        timestamp: Date.now(),
        targetId: "",
        targetName: "",
        changeCount: 0
      };
    }
    if (current.length > previous.length) {
      const prefixMatch = previous.every((v, i) => v === current[i]);
      if (prefixMatch) {
        const addedValues = current.slice(previous.length);
        return {
          id,
          name: "",
          value: current,
          previousValue: previous,
          changeType: "added",
          details: {
            index: previous.length,
            addedValue: addedValues.length === 1 ? addedValues[0] : addedValues,
            lengthDelta: addedValues.length,
            oldLength: previous.length,
            newLength: current.length
          },
          timestamp: Date.now(),
          targetId: "",
          targetName: "",
          changeCount: 0
        };
      }
    }
    if (current.length < previous.length) {
      const suffixMatch = current.every((v, i) => v === previous[i]);
      if (suffixMatch) {
        const removedValues = previous.slice(current.length);
        return {
          id,
          name: "",
          value: current,
          previousValue: previous,
          changeType: "removed",
          details: {
            index: current.length,
            removedValue: removedValues.length === 1 ? removedValues[0] : removedValues,
            lengthDelta: -removedValues.length,
            oldLength: previous.length,
            newLength: current.length
          },
          timestamp: Date.now(),
          targetId: "",
          targetName: "",
          changeCount: 0
        };
      }
    }
    if (current.length === previous.length) {
      for (let i = 0; i < current.length; i++) {
        if (current[i] !== previous[i]) {
          return {
            id,
            name: "",
            value: current,
            previousValue: previous,
            changeType: "modified",
            details: {
              index: i,
              oldValue: previous[i],
              newValue: current[i],
              lengthDelta: 0,
              oldLength: previous.length,
              newLength: current.length
            },
            timestamp: Date.now(),
            targetId: "",
            targetName: "",
            changeCount: 0
          };
        }
      }
    }
    return {
      id,
      name: "",
      value: current,
      previousValue: previous,
      changeType: "replaced",
      details: {
        lengthDelta: current.length - previous.length,
        oldLength: previous.length,
        newLength: current.length
      },
      timestamp: Date.now(),
      targetId: "",
      targetName: "",
      changeCount: 0
    };
  }
  function createRealtimeMonitorList(vm2) {
    if (!vm2 || !vm2.runtime) {
      console.log("⚠️ VM 不可用");
      return null;
    }
    const variableStates = /* @__PURE__ */new Map();
    const listStates = /* @__PURE__ */new Map();
    const changeCountMap = /* @__PURE__ */new Map();
    const deltaMap = /* @__PURE__ */new Map();
    const firstChangeMap = /* @__PURE__ */new Map();
    const lastChangeMap = /* @__PURE__ */new Map();
    const listLengthHistory = /* @__PURE__ */new Map();
    const listAddCount = /* @__PURE__ */new Map();
    const listRemoveCount = /* @__PURE__ */new Map();
    const listModifyCount = /* @__PURE__ */new Map();
    const listClearCount = /* @__PURE__ */new Map();
    const globalCallbacks = /* @__PURE__ */new Set();
    const watcherCallbacks = /* @__PURE__ */new Map();
    const historyMap = /* @__PURE__ */new Map();
    const MAX_HISTORY = 200;
    let isPaused = false;
    let isRunning = true;
    let checkId = null;
    function findVariableTarget(id) {
      const targets = vm2.runtime.targets || [];
      for (const target of targets) {
        if (target.variables && target.variables[id]) {
          return {
            targetId: target.id,
            targetName: target.getName?.() || target.sprite?.name || "unknown"
          };
        }
      }
      return null;
    }
    function getListName(id) {
      const targets = vm2.runtime.targets || [];
      for (const target of targets) {
        if (target.variables && target.variables[id]) {
          return target.variables[id].name || id;
        }
      }
      return id;
    }
    function getListStats(id) {
      const hist = listLengthHistory.get(id) || [];
      return {
        currentLength: listStates.get(id)?.length || 0,
        maxLength: hist.length > 0 ? Math.max(...hist) : 0,
        avgLength: hist.length > 0 ? hist.reduce((a, b) => a + b, 0) / hist.length : 0,
        lengthChanges: hist.length,
        addCount: listAddCount.get(id) || 0,
        removeCount: listRemoveCount.get(id) || 0,
        modifyCount: listModifyCount.get(id) || 0,
        clearCount: listClearCount.get(id) || 0
      };
    }
    function detectChanges() {
      if (isPaused || !isRunning) {
        return;
      }
      const targets = vm2.runtime.targets || [];
      const changes = [];
      for (const target of targets) {
        if (!target.variables) {
          continue;
        }
        for (const [id, variable] of Object.entries(target.variables)) {
          const currentValue = variable.value;
          const previousValue = variableStates.get(id);
          const isListValue = isList(currentValue);
          if (previousValue !== currentValue) {
            const count = (changeCountMap.get(id) || 0) + 1;
            changeCountMap.set(id, count);
            const now = Date.now();
            if (!firstChangeMap.has(id)) {
              firstChangeMap.set(id, now);
            }
            lastChangeMap.set(id, now);
            const info = findVariableTarget(id);
            if (isListValue) {
              const listChange = detectListChange(listStates.get(id), currentValue, id);
              if (listChange) {
                listChange.name = getListName(id);
                listChange.targetId = info?.targetId || "unknown";
                listChange.targetName = info?.targetName || "unknown";
                listChange.changeCount = count;
                const hist = listLengthHistory.get(id) || [];
                hist.push(currentValue.length);
                if (hist.length > 100) {
                  hist.shift();
                }
                listLengthHistory.set(id, hist);
                switch (listChange.changeType) {
                  case "added":
                    listAddCount.set(id, (listAddCount.get(id) || 0) + 1);
                    break;
                  case "removed":
                    listRemoveCount.set(id, (listRemoveCount.get(id) || 0) + 1);
                    break;
                  case "modified":
                    listModifyCount.set(id, (listModifyCount.get(id) || 0) + 1);
                    break;
                  case "cleared":
                    listClearCount.set(id, (listClearCount.get(id) || 0) + 1);
                    break;
                }
                listStates.set(id, [...currentValue]);
                variableStates.set(id, currentValue);
                const hist2 = historyMap.get(id) || [];
                hist2.push(listChange);
                if (hist2.length > MAX_HISTORY) {
                  hist2.shift();
                }
                historyMap.set(id, hist2);
                changes.push(listChange);
              }
            } else {
              const {
                delta,
                deltaPercent
              } = calculateDelta(previousValue, currentValue);
              if (delta !== null) {
                const total = (deltaMap.get(id) || 0) + delta;
                deltaMap.set(id, total);
              }
              const change = {
                id,
                name: variable.name || id,
                value: currentValue,
                previousValue,
                delta,
                deltaPercent,
                timestamp: now,
                targetId: info?.targetId || "unknown",
                targetName: info?.targetName || "unknown",
                changeType: getChangeType(previousValue, currentValue, delta),
                changeCount: count
              };
              variableStates.set(id, currentValue);
              const hist = historyMap.get(id) || [];
              hist.push(change);
              if (hist.length > MAX_HISTORY) {
                hist.shift();
              }
              historyMap.set(id, hist);
              changes.push(change);
            }
          }
        }
      }
      for (const change of changes) {
        for (const cb of globalCallbacks) {
          try {
            cb(change);
          } catch (e) {}
        }
        const watchers = watcherCallbacks.get(change.id);
        if (watchers) {
          for (const cb of watchers) {
            try {
              cb(change);
            } catch (e) {}
          }
        }
      }
    }
    function initStates() {
      const targets = vm2.runtime.targets || [];
      for (const target of targets) {
        if (target.variables) {
          for (const [id, variable] of Object.entries(target.variables)) {
            const value = variable.value;
            variableStates.set(id, value);
            if (isList(value)) {
              listStates.set(id, [...value]);
            }
            if (!historyMap.has(id)) {
              historyMap.set(id, []);
            }
          }
        }
      }
    }
    function startPolling() {
      initStates();
      function poll() {
        if (!isRunning) {
          return;
        }
        detectChanges();
        checkId = requestAnimationFrame(poll);
      }
      poll();
    }
    startPolling();
    function getVariableStats(id) {
      const changes = historyMap.get(id) || [];
      const currentValue = variableStates.get(id);
      const info = findVariableTarget(id);
      let totalDelta = 0;
      let maxDelta = 0;
      let minDelta = Infinity;
      let deltaCount = 0;
      for (const change of changes) {
        if ("delta" in change && change.delta !== null) {
          totalDelta += change.delta;
          maxDelta = Math.max(maxDelta, Math.abs(change.delta));
          minDelta = Math.min(minDelta, Math.abs(change.delta));
          deltaCount++;
        }
      }
      const firstChange = firstChangeMap.get(id);
      const lastChange = lastChangeMap.get(id);
      const duration = firstChange && lastChange ? (lastChange - firstChange) / 1000 : 0;
      const changeRate = duration > 0 ? changes.length / duration : 0;
      let trend = "stable";
      if (changes.length > 5) {
        const recent = changes.slice(-10);
        const recentDeltas = recent.map(c => "delta" in c && c.delta !== null ? c.delta : null).filter(d => d !== null);
        if (recentDeltas.length > 3) {
          const avg = recentDeltas.reduce((a, b) => a + b, 0) / recentDeltas.length;
          const stdDev = Math.sqrt(recentDeltas.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / recentDeltas.length);
          if (Math.abs(avg) > stdDev) {
            trend = avg > 0 ? "increasing" : "decreasing";
          } else if (stdDev > Math.abs(avg) * 2) {
            trend = "volatile";
          }
        }
      }
      const stats = {
        id,
        name: info?.targetName || id,
        currentValue,
        totalChanges: changes.length,
        totalDelta,
        avgDelta: deltaCount > 0 ? totalDelta / deltaCount : 0,
        maxDelta: maxDelta === 0 ? 0 : maxDelta,
        minDelta: minDelta === Infinity ? 0 : minDelta,
        changeRate: parseFloat(changeRate.toFixed(2)),
        firstChange: firstChange || 0,
        lastChange: lastChange || 0,
        trend
      };
      if (isList(currentValue)) {
        stats.listStats = getListStats(id);
      }
      return stats;
    }
    return {
      onVariableChange(callback) {
        globalCallbacks.add(callback);
        return () => globalCallbacks.delete(callback);
      },
      watchVariable(id, callback) {
        if (!watcherCallbacks.has(id)) {
          watcherCallbacks.set(id, /* @__PURE__ */new Set());
        }
        watcherCallbacks.get(id).add(callback);
        return () => {
          const cbs = watcherCallbacks.get(id);
          if (cbs) {
            cbs.delete(callback);
            if (cbs.size === 0) {
              watcherCallbacks.delete(id);
            }
          }
        };
      },
      getVariable(id) {
        const targets = vm2.runtime.targets || [];
        for (const target of targets) {
          if (target.variables && target.variables[id]) {
            return target.variables[id].value;
          }
        }
        return undefined;
      },
      getAllVariables() {
        const result = {};
        const targets = vm2.runtime.targets || [];
        for (const target of targets) {
          if (target.variables) {
            for (const [id, variable] of Object.entries(target.variables)) {
              result[id] = variable.value;
            }
          }
        }
        return result;
      },
      getHistory(id, limit = 50) {
        const hist = historyMap.get(id) || [];
        return hist.slice(-limit);
      },
      getStats(id) {
        return getVariableStats(id);
      },
      pause() {
        isPaused = true;
        console.log("⏸️ 列表监听已暂停");
      },
      resume() {
        isPaused = false;
        console.log("▶️ 列表监听已恢复");
      },
      stop() {
        isRunning = false;
        if (checkId) {
          cancelAnimationFrame(checkId);
          checkId = null;
        }
        globalCallbacks.clear();
        watcherCallbacks.clear();
        console.log("⏹️ 列表监听已停止");
      }
    };
  } // src/UI/mainUI.js
  function newWindows(component) {
    const windowDiv = document.createElement("div");
    windowDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    font-family: 'Segoe UI', Arial, sans-serif;
    z-index: 1000;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: default;
    `;
    const titleBar = document.createElement("div");
    titleBar.style.cssText = `
    background: #FF8C00;
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
    `;
    const titleText = document.createElement("span");
    titleText.textContent = "OJenje";
    titleText.style.cssText = `
    color: #fff;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    `;
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    line-height: 1;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = "rgba(255,255,255,0.35)";
    closeBtn.onmouseout = () => closeBtn.style.background = "rgba(255,255,255,0.2)";
    titleBar.appendChild(titleText);
    titleBar.appendChild(closeBtn);
    windowDiv.appendChild(titleBar);
    windowDiv.appendChild(component);
    document.body.appendChild(windowDiv);
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    function disableTransition() {
      windowDiv.style.transition = "none";
    }
    function enableTransition() {
      windowDiv.style.transition = "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    }
    titleBar.addEventListener("mousedown", function (e) {
      if (e.target === closeBtn) {
        return;
      }
      const rect = windowDiv.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      isDragging = true;
      disableTransition();
      const currentLeft = rect.left;
      const currentTop = rect.top;
      windowDiv.style.left = currentLeft + "px";
      windowDiv.style.top = currentTop + "px";
      windowDiv.style.transform = "none";
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    });
    document.addEventListener("mousemove", function (e) {
      if (!isDragging) {
        return;
      }
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      const maxX = window.innerWidth - windowDiv.offsetWidth;
      const maxY = window.innerHeight - windowDiv.offsetHeight;
      windowDiv.style.left = Math.max(0, Math.min(newX, maxX)) + "px";
      windowDiv.style.top = Math.max(0, Math.min(newY, maxY)) + "px";
    });
    document.addEventListener("mouseup", function () {
      if (isDragging) {
        isDragging = false;
        enableTransition();
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    });
    let isCollapsed = false;
    let lastPosition = {
      left: windowDiv.style.left || "50%",
      top: windowDiv.style.top || "50%",
      transform: windowDiv.style.transform || "translate(-50%, -50%)"
    };
    closeBtn.addEventListener("click", function () {
      if (!isCollapsed) {
        const rect = windowDiv.getBoundingClientRect();
        lastPosition.left = rect.left + "px";
        lastPosition.top = rect.top + "px";
        lastPosition.transform = "none";
        component.style.display = "none";
        windowDiv.style.transition = "all 0.5s cubic-bezier(0.34, 1.0, 0.64, 1)";
        windowDiv.style.top = "10px";
        windowDiv.style.left = "50%";
        windowDiv.style.transform = "translateX(-50%) scale(0.85)";
        windowDiv.style.width = "200px";
        windowDiv.style.borderRadius = "40px";
        windowDiv.style.opacity = "0.7";
        titleText.style.fontSize = "14px";
        closeBtn.textContent = "↕";
        closeBtn.style.background = "rgba(255,255,255,0.15)";
        isCollapsed = true;
      } else {
        component.style.display = "inline";
        windowDiv.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
        windowDiv.style.top = lastPosition.top;
        windowDiv.style.left = lastPosition.left;
        windowDiv.style.transform = lastPosition.transform || "none";
        windowDiv.style.width = "400px";
        windowDiv.style.borderRadius = "12px";
        windowDiv.style.opacity = "1";
        titleText.style.fontSize = "18px";
        closeBtn.textContent = "✕";
        closeBtn.style.background = "rgba(255,255,255,0.2)";
        isCollapsed = false;
      }
    });
    return windowDiv;
  }
  function mainComponent() {
    const newComponent = document.createElement("div");
    newComponent.style.cssText = `
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 500px;
        overflow-y: auto;
    `;
    return newComponent;
  } // src/extension/extension.js
  function getExtensionCode(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        callback(null, xhr.responseText);
      } else if (xhr.readyState === 4) {
        alert("如果是ccw扩展请在ccw中运行，如果是在github中的扩展请在github里运行（github一般没可能）");
        callback(new Error("加载失败: " + xhr.status));
      }
    };
    xhr.send();
  }
  async function calculateHash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } // src/branch.ts
  var textProgram;
  var cssBtn = `
    background: #5c99df;
    border: none;
    color: #000000;
    display: block;
    margin: 24px auto 0 0;
    padding: 10px 40px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s;
`;
  function home() {
    const container = document.createElement("div");
    container.style.cssText = `padding:20px; display:flex; flex-direction:column; gap:10px;`;
    const fpsBtn = document.createElement("button");
    fpsBtn.textContent = "📊 FPS 监控";
    fpsBtn.style.cssText = cssBtn;
    fpsBtn.onclick = () => {
      clickBtnTF.page = "FPS";
    };
    container.appendChild(fpsBtn);
    const varBtn2 = document.createElement("button");
    varBtn2.textContent = "📝 变量与列表";
    varBtn2.style.cssText = cssBtn;
    varBtn2.onclick = () => {
      clickBtnTF.page = "variable and list";
    };
    container.appendChild(varBtn2);
    const extBtn = document.createElement("button");
    extBtn.textContent = "🔒 扩展验证";
    extBtn.style.cssText = cssBtn;
    extBtn.onclick = () => {
      clickBtnTF.page = "extension";
    };
    container.appendChild(extBtn);
    return container;
  }
  function fpsBtnClick() {
    const container = document.createElement("div");
    container.style.cssText = `padding:20px; display:flex; flex-direction:column; gap:10px;`;
    const fpsMain = document.createElement("button");
    fpsMain.textContent = "主要fps测量";
    fpsMain.style.cssText = cssBtn;
    fpsMain.onclick = () => {
      fpsBtnTF.page = "main";
    };
    container.appendChild(fpsMain);
    const fpsP = document.createElement("button");
    fpsP.textContent = "积木fps测量";
    fpsP.style.cssText = cssBtn;
    fpsP.onclick = () => {
      fpsBtnTF.page = "program";
    };
    container.appendChild(fpsP);
    return container;
  }
  function variableListBtnClick() {
    const container = document.createElement("div");
    container.style.cssText = `padding:20px; display:flex; flex-direction:column; gap:10px;`;
    const variableBtn = document.createElement("button");
    variableBtn.textContent = "变量";
    variableBtn.style.cssText = cssBtn;
    variableBtn.onclick = () => {
      varClick.page = "var";
    };
    container.appendChild(variableBtn);
    const listBtn = document.createElement("button");
    listBtn.textContent = "列表";
    listBtn.style.cssText = cssBtn;
    listBtn.onclick = () => {
      varClick.page = "list";
    };
    container.appendChild(listBtn);
    return container;
  }
  function extensionBtnClick() {
    const container = document.createElement("div");
    container.style.cssText = `padding:20px; display:flex; flex-direction:column; gap:10px;`;
    const inputURL = document.createElement("input");
    inputURL.placeholder = "https://m.ccw.site/user_projects_assets/xxx.js";
    inputURL.style.cssText = `padding:8px; border:1px solid #ddd; border-radius:4px;`;
    container.appendChild(inputURL);
    const inputHash = document.createElement("input");
    inputHash.placeholder = "输入你原始的哈希值，如果没有记录请在本次之后记录";
    inputHash.style.cssText = `padding:8px; border:1px solid #ddd; border-radius:4px;`;
    container.appendChild(inputHash);
    const sureBtn = document.createElement("button");
    sureBtn.textContent = "验证";
    sureBtn.style.cssText = cssBtn;
    sureBtn.onclick = async () => {
      const url = inputURL.value.trim();
      const hashText = inputHash.value.trim();
      if (!url || !hashText) {
        return alert("请填写完整");
      }
      const code = await new Promise((resolve, reject) => {
        getExtensionCode(url, (err, res) => err ? reject(err) : resolve(res));
      });
      const originalHash = await calculateHash(code);
      alert(originalHash === hashText ? "没有篡改" : "被篡改");
    };
    container.appendChild(sureBtn);
    return container;
  }
  function fpsContent() {
    const container = document.createElement("div");
    container.style.cssText = `padding:20px; display:flex; flex-direction:column; gap:10px;`;
    const labels = ["start", "stop", "pause", "resume", "getCurrentFps"];
    labels.map(label => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = cssBtn;
      btn.onclick = () => {
        fpsContentClick.page = label;
      };
      container.appendChild(btn);
      return btn;
    });
    const onFrameBtn = document.createElement("button");
    onFrameBtn.textContent = "onFrame";
    onFrameBtn.style.cssText = cssBtn;
    const onJankBtn = document.createElement("button");
    onJankBtn.textContent = "onJank";
    onJankBtn.style.cssText = cssBtn;
    const textarea = document.createElement("textarea");
    textarea.placeholder = "输入onJank/onFrame代码...";
    textarea.style.cssText = `
        width: 100%;
        height: 80px;
        padding: 8px;
        font-family: monospace;
        font-size: 13px;
        border: 1px solid #ccc;
        border-radius: 4px;
        resize: vertical;
        box-sizing: border-box;
    `;
    onFrameBtn.addEventListener("click", async () => {
      textProgram = textarea.value.trim();
      fpsContentClick.page = "onFrame";
    });
    onJankBtn.addEventListener("click", async () => {
      textProgram = textarea.value.trim();
      fpsContentClick.page = "onJank";
    });
    container.appendChild(onFrameBtn);
    container.appendChild(onJankBtn);
    container.appendChild(textarea);
    return container;
  }
  function fpsContentRun() {
    const container = document.createElement("div");
    container.style.cssText = `padding:20px; display:flex; flex-direction:column; gap:10px;`;
    const labels = ["Runstart", "Runstop", "getReport", "isRunning", "disable"];
    labels.map(label => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = cssBtn;
      btn.onclick = () => {
        fpsContentClick.page = label;
      };
      container.appendChild(btn);
      return btn;
    });
    return container;
  }
  function varBtn() {
    const container = document.createElement("div");
    container.style.cssText = `padding:20px; display:flex; flex-direction:column; gap:10px;`;
    const labels = ["onVariableChange", "watchVariable", "getVariable", "getAllVariables", "getHistory", "getStatsVar", "pauseVar", "resumeVar", "stopVar"];
    labels.forEach(label => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = cssBtn;
      btn.onclick = () => {
        varBtnClick.page = label;
      };
      container.appendChild(btn);
    });
    return container;
  }
  function backBtn() {
    const container = document.createElement("div");
    container.style.cssText = `padding:20px;`;
    const btn = document.createElement("button");
    btn.textContent = "← 返回";
    btn.style.cssText = `
        background: transparent;
        border: none;
        color: #5c99df;
        font-size: 14px;
        cursor: pointer;
        text-align: left;
    `;
    btn.onclick = () => {
      clickBtnTF.page = "home";
    };
    container.appendChild(btn);
    return container;
  }
  function popupPrompt(prompt2) {
    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.2s ease;
    `;
    const popupPrompt2 = document.createElement("div");
    popupPrompt2.className = "popup";
    popupPrompt2.style.cssText = `
        background: #FFFFFF;
        color: #1F2937;
        padding: 32px 40px 28px;
        border-radius: 12px;
        width: 400px;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(0, 0, 0, 0.04);
        font-size: 15px;
        line-height: 1.6;
        position: relative;
        animation: scaleIn 0.25s ease;
    `;
    popupPrompt2.textContent = prompt2;
    const promptButton = document.createElement("button");
    promptButton.textContent = "确 定";
    promptButton.style.cssText = `
        display: block;
        margin: 24px 0 0 auto;
        padding: 10px 40px;
        background: #B3D9FF;
        color: #FFFFFF;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.15s;
    `;
    promptButton.addEventListener("click", () => {
      overlay.remove();
    });
    popupPrompt2.appendChild(promptButton);
    overlay.appendChild(popupPrompt2);
    document.body.appendChild(overlay);
  } // src/index.ts
  var state = {
    page: "home",
    action: ""
  };
  var proxy = new Proxy(state, {
    set(target, key, value) {
      target[key] = value;
      render();
      return true;
    }
  });
  var clickBtnTF = proxy;
  var fpsBtnTF = proxy;
  var varClick = proxy;
  var fpsContentClick = proxy;
  var varBtnClick = proxy;
  var fpsFunction;
  var vm;
  var mainFPSMonitor;
  var fpsProfiler;
  var monitor;
  var homePage = home();
  var fpsNavPage = fpsBtnClick();
  var variableNavPage = variableListBtnClick();
  var extensionPage = extensionBtnClick();
  var varContentPage = varBtn();
  var backBtnPage = backBtn();
  var fpsContentRunPage = fpsContentRun();
  var fpsContentPage = fpsContent();
  var mainUI = mainComponent();
  mainUI.append(homePage, fpsNavPage, variableNavPage, extensionPage, fpsContentPage, varContentPage, backBtnPage, fpsContentRunPage);
  (async function init() {
    vm = await obtainVm();
    if (!vm) {
      console.error("❌ 无法获取 VM");
      return;
    }
    mainFPSMonitor = createFpsMonitor(vm);
    fpsProfiler = createProfiler(vm);
    monitor = createRealtimeMonitorList(vm);
    newWindows(mainUI);
    render();
    console.log("✅ OJenje 已启动");
  })();
  function render() {
    const {
      page
    } = proxy;
    if (page !== "start" && page !== "Runstart" && page !== "stop" && page !== "Runstop" && page !== "pause" && page !== "resume" && page !== "getCurrentFps" && page !== "getReport" && page !== "isRunning" && page !== "disable" && page !== "onVariableChange" && page !== "onVariableChange" && page !== "watchVariable" && page !== "getVariable" && page !== "getAllVariables" && page !== "getHistory" && page !== "getStatsVar" && page !== "pauseVar" && page !== "resumeVar" && page !== "stopVar" && page !== "onJank" && page !== "onFrame") {
      homePage.style.display = "none";
      fpsNavPage.style.display = "none";
      variableNavPage.style.display = "none";
      extensionPage.style.display = "none";
      fpsContentPage.style.display = "none";
      varContentPage.style.display = "none";
      backBtnPage.style.display = "none";
      varContentPage.style.display = "none";
      fpsContentRunPage.style.display = "none";
    }
    if (page === "home") {
      homePage.style.display = "block";
    } else if (page === "FPS") {
      backBtnPage.style.display = "block";
      fpsNavPage.style.display = "block";
    } else if (page === "main") {
      backBtnPage.style.display = "block";
      fpsContentPage.style.display = "block";
    } else if (page === "program") {
      backBtnPage.style.display = "block";
      fpsContentRunPage.style.display = "block";
    } else if (page === "variable and list") {
      backBtnPage.style.display = "block";
      variableNavPage.style.display = "block";
    } else if (page === "var") {
      backBtnPage.style.display = "block";
      varContentPage.style.display = "block";
    } else if (page === "list") {
      backBtnPage.style.display = "block";
      varContentPage.style.display = "block";
    } else if (page === "extension") {
      backBtnPage.style.display = "block";
      extensionPage.style.display = "block";
    }
    switch (page) {
      case "start":
        mainFPSMonitor.start();
        popupPrompt("✅ FPS 监控已启动");
        break;
      case "Runstart":
        fpsProfiler.start();
        popupPrompt("✅ FPS 监控已启动");
        break;
      case "stop":
        let report = mainFPSMonitor.stop();
        console.log("📊 报告:", report);
        popupPrompt(`\u{1F4CA} \u5DF2\u505C\u6B62
\u5E73\u5747 FPS: ${report?.averageFps || 0}`);
        break;
      case "Runstop":
        let reportRun = fpsProfiler.stop();
        console.log("📊 报告:", reportRun);
        popupPrompt(`\u{1F4CA} \u5DF2\u505C\u6B62
\u5E73\u5747 FPS: ${reportRun?.averageFps || 0}`);
        break;
      case "pause":
        mainFPSMonitor.pause();
        popupPrompt("⏸️ 已暂停");
        break;
      case "resume":
        mainFPSMonitor.resume();
        popupPrompt("▶️ 已恢复");
        break;
      case "getCurrentFps":
        const fps = mainFPSMonitor.getCurrentFps();
        popupPrompt(`\u5F53\u524D FPS: ${fps}`);
        break;
      case "getReport":
        const reports = fpsProfiler.getReport();
        popupPrompt(`\u83B7\u53D6 FPS: ${reports}`);
        break;
      case "isRunning":
        const run = fpsProfiler.isRunning();
        popupPrompt(`\u68C0\u6D4B\u72B6\u6001\uFF1A${run}`);
        break;
      case "disable":
        fpsProfiler.disable();
        popupPrompt(`\u5DF2\u5173\u95ED`);
        break;
      case "onVariableChange":
        popupPrompt("开始侦测，按下确定键继续，结果放置于控制台");
        monitor.onVariableChange(change => {
          console.log(change);
        });
        break;
      case "watchVariable":
        let ids = prompt("输入变量/列表ID，点击确定后将结果放置于控制台");
        monitor.watchVariable(ids, change => {
          console.log(change);
        });
        break;
      case "getVariable":
        let idsVar = prompt("输入变量/列表ID，点击确定后将当前值放置于控制台");
        monitor.getVariable(idsVar);
        break;
      case "getAllVariables":
        console.log(monitor.getAllVariables());
        popupPrompt("所有变量/列表名已放置于控制台");
        break;
      case "getHistory":
        let name = prompt("输入变量/列表ID");
        let numbers = prompt("请输入历史条数");
        console.log(monitor.getHistory(name, Number(numbers)));
        popupPrompt("返回值已放置于控制台");
        break;
      case "getStatsVar":
        let theID = prompt("输入变量/列表ID");
        monitor.getStats(theID);
        break;
      case "pauseVar":
        monitor.pause();
        popupPrompt("已暂停");
        break;
      case "resumeVar":
        monitor.resume();
        popupPrompt("已重启");
        break;
      case "stopVar":
        monitor.stop();
        popupPrompt("已停止");
        break;
      case "onJank":
        fpsFunction = new Function("fps", textProgram);
        mainFPSMonitor.onJank(fpsFunction);
        break;
      case "onFrame":
        fpsFunction = new Function("fps", textProgram);
        mainFPSMonitor.onFrame(fpsFunction);
        break;
      default:
        console.log("未知操作:", page);
        break;
    }
  }
  exports.clickBtnTF = clickBtnTF;
  exports.fpsBtnTF = fpsBtnTF;
  exports.fpsContentClick = fpsContentClick;
  exports.varBtnClick = varBtnClick;
  exports.varClick = varClick;
  return exports;
}({});