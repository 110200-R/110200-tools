// ==UserScript==
// @name         积木编辑器Pro
// @namespace    local.script-tree.standalone
// @version      2.2.0
// @description  可禁用/启用/删除单块或整条脚本，实时显示并修改有返回值积木的取值，并直接运行
// @author       会飞的黄油、诺言Promise
// @match        https://www.ccw.site/*
// @match        https://www.cocrea.world/*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    function toast(msg, ms) {
        ms = ms || 2200;
        if (!document.body) {
            setTimeout(function () { toast(msg, ms); }, 100);
            return;
        }
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText =
            'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
            'background:rgba(0,0,0,.82);color:#fff;padding:10px 18px;' +
            'border-radius:8px;font:13px/1.5 -apple-system,"Segoe UI",Arial,sans-serif;' +
            'z-index:2147483647;pointer-events:none;opacity:1;' +
            'transition:opacity .3s ease;';
        document.body.appendChild(t);
        setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { t.remove(); }, 320);
        }, ms);
    }

    function getVM() {
        try {
            var candidates = [
                window.vm,
                window.Scratch && window.Scratch.vm,
                window.scratchAddons && window.scratchAddons.vm,
                window.Blockly && window.Blockly.getMainWorkspace &&
                    window.Blockly.getMainWorkspace() &&
                    window.Blockly.getMainWorkspace().options &&
                    window.Blockly.getMainWorkspace().options.vm
            ];
            for (var i = 0; i < candidates.length; i++) {
                var v = candidates[i];
                if (v && v.runtime) return v;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    function waitForVM(timeout) {
        timeout = timeout || 60000;
        return new Promise(function (resolve) {
            var start = Date.now();
            (function poll() {
                var vm = getVM();
                if (vm) return resolve(vm);
                if (Date.now() - start > timeout) return resolve(null);
                setTimeout(poll, 200);
            })();
        });
    }

    function getBlockly(runtime) {
        try {
            return window.ScratchBlocks || window.Blockly ||
                (runtime && runtime.scratchBlocks) || null;
        } catch (e) {
            return null;
        }
    }

    function askConfirm(msg) {
        try {
            if (typeof window.confirm === 'function') return window.confirm(msg);
        } catch (e) { /* ignore */ }
        return true;
    }

    function init(vm) {
        var runtime = vm.runtime;

        if (document.getElementById('script-tree-launcher')) return;

        var LANGUAGE_NAMES = {
            'zh-cn': '中文', 'en': 'English', 'es': 'Español',
            'ru': 'Русский', 'uk': 'Українська', 'ms': 'Bahasa Melayu'
        };

        function getAvailableLanguages() {
            try {
                var Blockly = getBlockly(runtime);
                var locales = Blockly && Blockly.ScratchMsgs && Blockly.ScratchMsgs.locales;
                if (locales) {
                    return Object.keys(locales).map(function (code) {
                        return { value: code, label: LANGUAGE_NAMES[code] || code };
                    });
                }
            } catch (e) { /* ignore */ }
            return [
                { value: 'zh-cn', label: '中文' },
                { value: 'en', label: 'English' }
            ];
        }

        var LANGUAGES = getAvailableLanguages().concat([
            { value: 'raw', label: '原始 opcode' }
        ]);

        var currentLang = 'zh-cn';
        try {
            var BlocklyRef = getBlockly(runtime);
            var cur = BlocklyRef && BlocklyRef.ScratchMsgs && BlocklyRef.ScratchMsgs.currentLocale;
            if (cur) {
                for (var i = 0; i < LANGUAGES.length; i++) {
                    if (LANGUAGES[i].value === cur) { currentLang = cur; break; }
                }
            }
        } catch (e) { /* ignore */ }

        function getBlockText(opcode) {
            if (currentLang === 'raw') return opcode;
            try {
                var Blockly = getBlockly(runtime);
                var locales = Blockly && Blockly.ScratchMsgs && Blockly.ScratchMsgs.locales;
                if (!locales) return opcode;
                var table = locales[currentLang];
                if (!table) return opcode;
                return table[opcode.toUpperCase()] || opcode;
            } catch (e) {
                return opcode;
            }
        }

        function blockLabel(block) {
            if (!block) return '?';
            var cleanOpcode = block.opcode.replace(/__disabled$/, '');
            var displayName = getBlockText(cleanOpcode);

            var fields = block.fields || {};
            var fieldParts = [];
            Object.keys(fields).forEach(function (k) {
                var v = fields[k];
                var val = v && v.value;
                if (val !== '' && val !== undefined && val !== null && val !== false) {
                    fieldParts.push(String(val));
                }
            });

            var finalText = displayName;
            if (fieldParts.length > 0) {
                if (/%\d+/.test(finalText)) {
                    var idx = 0;
                    finalText = finalText.replace(/%\d+/g, function () {
                        var r = fieldParts[idx];
                        idx += 1;
                        return r !== undefined ? r : '';
                    });
                } else {
                    finalText = finalText + ' ' + fieldParts.join(' ');
                }
            } else {
                finalText = finalText.replace(/%\d+/g, '').trim();
            }

            if (currentLang === 'raw') return cleanOpcode;
            return finalText + '  (' + cleanOpcode + ')';
        }

        var DISABLED_SUFFIX = '__disabled';

        function disableBlock(target, id) {
            var b = target.blocks.getBlock(id);
            if (!b) return false;
            if (b.opcode.slice(-DISABLED_SUFFIX.length) === DISABLED_SUFFIX) return true;
            b.opcode += DISABLED_SUFFIX;
            if (target.blocks.resetCache) target.blocks.resetCache();
            return true;
        }

        function enableBlock(target, id) {
            var b = target.blocks.getBlock(id);
            if (!b) return false;
            if (b.opcode.slice(-DISABLED_SUFFIX.length) !== DISABLED_SUFFIX) return true;
            b.opcode = b.opcode.slice(0, -DISABLED_SUFFIX.length);
            if (target.blocks.resetCache) target.blocks.resetCache();
            return true;
        }

        function isDisabled(block) {
            return !!block && block.opcode.slice(-DISABLED_SUFFIX.length) === DISABLED_SUFFIX;
        }



        var OUTPUT_OPS = {
            'motion_xposition': 'reporter',
            'motion_yposition': 'reporter',
            'motion_direction': 'reporter',
            'looks_size': 'reporter',
            'looks_costumenumbername': 'reporter',
            'looks_backdropnumbername': 'reporter',
            'sound_volume': 'reporter',
            'operator_add': 'reporter',
            'operator_subtract': 'reporter',
            'operator_multiply': 'reporter',
            'operator_divide': 'reporter',
            'operator_random': 'reporter',
            'operator_lt': 'boolean',
            'operator_equals': 'boolean',
            'operator_gt': 'boolean',
            'operator_and': 'boolean',
            'operator_or': 'boolean',
            'operator_not': 'boolean',
            'operator_join': 'reporter',
            'operator_letter_of': 'reporter',
            'operator_length': 'reporter',
            'operator_contains': 'boolean',
            'operator_mod': 'reporter',
            'operator_round': 'reporter',
            'operator_mathop': 'reporter',
            'data_variable': 'reporter',
            'data_listcontents': 'reporter',
            'data_itemoflist': 'reporter',
            'data_lengthoflist': 'reporter',
            'data_itemnumoflist': 'reporter',
            'data_listcontainsitem': 'boolean',
            'sensing_timer': 'reporter',
            'sensing_of': 'reporter',
            'sensing_touchingobject': 'boolean',
            'sensing_touchingcolor': 'boolean',
            'sensing_coloristouchingcolor': 'boolean',
            'sensing_distanceto': 'reporter',
            'sensing_answer': 'reporter',
            'sensing_keypressed': 'boolean',
            'sensing_mousedown': 'boolean',
            'sensing_mousex': 'reporter',
            'sensing_mousey': 'reporter',
            'sensing_loudness': 'reporter',
            'sensing_loud': 'boolean',
            'sensing_current': 'reporter',
            'sensing_dayssince2000': 'reporter',
            'sensing_username': 'reporter',
            'argument_reporter_string_number': 'reporter',
            'argument_reporter_boolean': 'boolean',
            'math_number': 'reporter',
            'math_whole_number': 'reporter',
            'math_positive_number': 'reporter',
            'math_integer': 'reporter',
            'math_angle': 'reporter',
            'text': 'reporter',
            'colour_picker': 'reporter',
            'note': 'reporter'
        };

        function getBlocklyWorkspace() {
            try {
                if (window.Blockly && window.Blockly.getMainWorkspace) {
                    var ws = window.Blockly.getMainWorkspace();
                    if (ws) return ws;
                }
                if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
                    var ws2 = window.ScratchBlocks.getMainWorkspace();
                    if (ws2) return ws2;
                }
            } catch (e) { /* ignore */ }
            return null;
        }

        function getOutputType(target, block) {
            if (!block) return null;
            var opcode = block.opcode.replace(/__disabled$/, '');
            try {
                if (vm.editingTarget && target && vm.editingTarget.id === target.id) {
                    var ws = getBlocklyWorkspace();
                    var blk = ws && ws.getBlockById && ws.getBlockById(block.id);
                    if (blk) {
                        if (blk.outputConnection) {
                            var check = blk.outputConnection.check_;
                            if (Array.isArray(check) && check.indexOf('Boolean') !== -1) return 'boolean';
                            return 'reporter';
                        }
                        return null;
                    }
                }
            } catch (e) { /* ignore */ }
            return OUTPUT_OPS[opcode] || null;
        }

        function lookupVariable(target, name) {
            function scan(t) {
                var vars = t.variables || {};
                var keys = Object.keys(vars);
                for (var i = 0; i < keys.length; i++) {
                    var v = vars[keys[i]];
                    if (v && v.name === name && v.type !== 'list') return v;
                }
                return null;
            }
            var v = scan(target);
            if (v) return v;
            var stage = runtime.getTargetForStage ? runtime.getTargetForStage() : null;
            if (stage && stage !== target) return scan(stage);
            return null;
        }

        function lookupList(target, name) {
            function scan(t) {
                var vars = t.variables || {};
                var keys = Object.keys(vars);
                for (var i = 0; i < keys.length; i++) {
                    var v = vars[keys[i]];
                    if (v && v.name === name && v.type === 'list') return v;
                }
                return null;
            }
            var v = scan(target);
            if (v) return v;
            var stage = runtime.getTargetForStage ? runtime.getTargetForStage() : null;
            if (stage && stage !== target) return scan(stage);
            return null;
        }

        function getAnswer() {
            try {
                if (runtime._answer !== undefined) return runtime._answer;
                if (runtime.answer !== undefined) return runtime.answer;
            } catch (e) { /* ignore */ }
            return '';
        }

        function evaluateReporter(target, blockId) {
            function num(v) {
                if (v === undefined || v === null || v === '') return 0;
                var n = Number(v);
                return isNaN(n) ? 0 : n;
            }
            function str(v) {
                if (v === undefined || v === null) return '';
                return String(v);
            }
            function bool(v) {
                if (typeof v === 'boolean') return v;
                if (typeof v === 'string') {
                    var s = v.toLowerCase();
                    return !(s === '' || s === '0' || s === 'false');
                }
                return !!v;
            }
            function cmp(a, b) {
                var na = Number(a), nb = Number(b);
                var aIsNum = (typeof a === 'number') ||
                    (typeof a === 'string' && a.trim() !== '' && !isNaN(na));
                var bIsNum = (typeof b === 'number') ||
                    (typeof b === 'string' && b.trim() !== '' && !isNaN(nb));
                if (aIsNum && bIsNum) {
                    if (na < nb) return -1;
                    if (na > nb) return 1;
                    return 0;
                }
                var sa = String(a === undefined || a === null ? '' : a).toLowerCase();
                var sb = String(b === undefined || b === null ? '' : b).toLowerCase();
                if (sa < sb) return -1;
                if (sa > sb) return 1;
                return 0;
            }

            function run(id, d) {
                if (d > 60) throw new Error('嵌套过深');
                var blocks = target.blocks;
                var block = blocks.getBlock(id);
                if (!block) throw new Error('积木不存在');
                var opcode = block.opcode.replace(/__disabled$/, '');

                function field(name) {
                    var f = block.fields && block.fields[name];
                    return f ? f.value : undefined;
                }

                function input(name) {
                    var val = block.inputs && block.inputs[name];
                    if (val === undefined || val === null) return undefined;
                    if (Array.isArray(val)) {
                        var shadow = val[0];
                        var subId = val[1];
                        if (typeof subId === 'string' && subId) return run(subId, d + 1);
                        if (Array.isArray(shadow)) return shadow[1];
                        if (typeof shadow === 'string' && shadow) return run(shadow, d + 1);
                        return undefined;
                    }
                    if (typeof val === 'string') return run(val, d + 1);
                    return val;
                }

                switch (opcode) {
                    case 'math_number':
                    case 'math_whole_number':
                    case 'math_positive_number':
                    case 'math_integer':
                    case 'math_angle':
                        return field('NUM');
                    case 'text':
                        return field('TEXT');
                    case 'colour_picker':
                        return field('COLOUR');
                    case 'note':
                        return field('NOTE');

                    case 'operator_add': return num(input('NUM1')) + num(input('NUM2'));
                    case 'operator_subtract': return num(input('NUM1')) - num(input('NUM2'));
                    case 'operator_multiply': return num(input('NUM1')) * num(input('NUM2'));
                    case 'operator_divide': return num(input('NUM1')) / num(input('NUM2'));
                    case 'operator_mod': {
                        var m1 = num(input('NUM1')), m2 = num(input('NUM2'));
                        if (m2 === 0) return NaN;
                        var mod = m1 % m2;
                        if (mod / m2 < 0) mod += m2;
                        return mod;
                    }
                    case 'operator_round': return Math.round(num(input('NUM')));
                    case 'operator_random': {
                        var from = num(input('FROM')), to = num(input('TO'));
                        if (from > to) { var tmp = from; from = to; to = tmp; }
                        if (from === to) return from;
                        if (Math.floor(from) === from && Math.floor(to) === to) {
                            return Math.floor(Math.random() * (to - from + 1)) + from;
                        }
                        return Math.random() * (to - from) + from;
                    }
                    case 'operator_lt': return cmp(input('OPERAND1'), input('OPERAND2')) < 0;
                    case 'operator_gt': return cmp(input('OPERAND1'), input('OPERAND2')) > 0;
                    case 'operator_equals': return cmp(input('OPERAND1'), input('OPERAND2')) === 0;
                    case 'operator_and': return bool(input('OPERAND1')) && bool(input('OPERAND2'));
                    case 'operator_or': return bool(input('OPERAND1')) || bool(input('OPERAND2'));
                    case 'operator_not': return !bool(input('OPERAND'));
                    case 'operator_join': return str(input('STRING1')) + str(input('STRING2'));
                    case 'operator_letter_of': {
                        var li = Math.floor(num(input('LETTER')));
                        var ls = str(input('STRING'));
                        if (li < 1 || li > ls.length) return '';
                        return ls.charAt(li - 1);
                    }
                    case 'operator_length': return str(input('STRING')).length;
                    case 'operator_contains':
                        return str(input('STRING1')).toLowerCase()
                            .indexOf(str(input('STRING2')).toLowerCase()) !== -1;
                    case 'operator_mathop': {
                        var op = str(field('OPERATOR')).toLowerCase();
                        var x = num(input('NUM'));
                        var out;
                        switch (op) {
                            case 'abs': out = Math.abs(x); break;
                            case 'floor': out = Math.floor(x); break;
                            case 'ceiling': out = Math.ceil(x); break;
                            case 'sqrt': out = Math.sqrt(x); break;
                            case 'sin': out = Math.sin(Math.PI * x / 180); break;
                            case 'cos': out = Math.cos(Math.PI * x / 180); break;
                            case 'tan': out = Math.tan(Math.PI * x / 180); break;
                            case 'asin': out = Math.asin(x) * 180 / Math.PI; break;
                            case 'acos': out = Math.acos(x) * 180 / Math.PI; break;
                            case 'atan': out = Math.atan(x) * 180 / Math.PI; break;
                            case 'ln': out = Math.log(x); break;
                            case 'log': out = Math.log(x) / Math.LN10; break;
                            case 'e ^': out = Math.exp(x); break;
                            case '10 ^': out = Math.pow(10, x); break;
                            default: out = 0;
                        }
                        return Math.round(out * 1e10) / 1e10;
                    }

                    case 'data_variable': {
                        var vn = field('VARIABLE');
                        var v = lookupVariable(target, vn);
                        return v ? v.value : 0;
                    }
                    case 'data_listcontents': {
                        var l = lookupList(target, field('LIST'));
                        return l ? (Array.isArray(l.value) ? l.value.join(' ') : '') : '';
                    }
                    case 'data_itemoflist': {
                        var list1 = lookupList(target, field('LIST'));
                        var idx1 = Math.floor(num(input('INDEX')));
                        if (!list1 || !Array.isArray(list1.value)) return '';
                        if (idx1 < 1 || idx1 > list1.value.length) return '';
                        return list1.value[idx1 - 1];
                    }
                    case 'data_lengthoflist': {
                        var list2 = lookupList(target, field('LIST'));
                        return list2 && Array.isArray(list2.value) ? list2.value.length : 0;
                    }
                    case 'data_itemnumoflist': {
                        var list3 = lookupList(target, field('LIST'));
                        var item = input('ITEM');
                        if (!list3 || !Array.isArray(list3.value)) return 0;
                        for (var ii = 0; ii < list3.value.length; ii++) {
                            if (cmp(list3.value[ii], item) === 0) return ii + 1;
                        }
                        return 0;
                    }
                    case 'data_listcontainsitem': {
                        var list4 = lookupList(target, field('LIST'));
                        var item2 = input('ITEM');
                        if (!list4 || !Array.isArray(list4.value)) return false;
                        for (var jj = 0; jj < list4.value.length; jj++) {
                            if (cmp(list4.value[jj], item2) === 0) return true;
                        }
                        return false;
                    }

                    case 'motion_xposition': return typeof target.x === 'number' ? target.x : 0;
                    case 'motion_yposition': return typeof target.y === 'number' ? target.y : 0;
                    case 'motion_direction': return typeof target.direction === 'number' ? target.direction : 90;

                    case 'looks_size': return typeof target.size === 'number' ? target.size : 100;
                    case 'looks_costumenumbername': {
                        var mode1 = str(field('NUMBER_NAME'));
                        if (mode1 === 'number') return (target.currentCostume || 0) + 1;
                        var costumes = target.getCostumes
                            ? target.getCostumes()
                            : (target.sprite && target.sprite.costumes) || [];
                        var cos = costumes[target.currentCostume || 0];
                        return cos ? cos.name : '';
                    }
                    case 'looks_backdropnumbername': {
                        var mode2 = str(field('NUMBER_NAME'));
                        var stage1 = runtime.getTargetForStage ? runtime.getTargetForStage() : null;
                        if (!stage1) return mode2 === 'number' ? 1 : '';
                        if (mode2 === 'number') return (stage1.currentCostume || 0) + 1;
                        var costumes2 = stage1.getCostumes
                            ? stage1.getCostumes()
                            : (stage1.sprite && stage1.sprite.costumes) || [];
                        var cos2 = costumes2[stage1.currentCostume || 0];
                        return cos2 ? cos2.name : '';
                    }

                    case 'sound_volume': return typeof target.volume === 'number' ? target.volume : 100;

                    case 'sensing_timer':
                        try { return runtime.ioDevices.clock.projectTimer(); }
                        catch (e) { throw new Error('计时器不可用'); }
                    case 'sensing_mousex':
                        try { return runtime.ioDevices.mouse.getScratchX(); }
                        catch (e) { throw new Error('鼠标不可用'); }
                    case 'sensing_mousey':
                        try { return runtime.ioDevices.mouse.getScratchY(); }
                        catch (e) { throw new Error('鼠标不可用'); }
                    case 'sensing_mousedown':
                        try { return runtime.ioDevices.mouse.getIsDown(); }
                        catch (e) { throw new Error('鼠标不可用'); }
                    case 'sensing_loudness':
                        try { return runtime.ioDevices.audio.getLoudness(); }
                        catch (e) { return 0; }
                    case 'sensing_answer':
                        return getAnswer();
                    case 'sensing_keypressed':
                        try { return runtime.ioDevices.keyboard.getKeyIsDown(input('KEY_OPTION')); }
                        catch (e) { throw new Error('键盘不可用'); }
                    case 'sensing_current': {
                        var cur = str(field('CURRENTMENU')).toUpperCase();
                        var d = new Date();
                        switch (cur) {
                            case 'YEAR': return d.getFullYear();
                            case 'MONTH': return d.getMonth() + 1;
                            case 'DATE': return d.getDate();
                            case 'DAYOFWEEK': return d.getDay() + 1;
                            case 'HOUR': return d.getHours();
                            case 'MINUTE': return d.getMinutes();
                            case 'SECOND': return d.getSeconds();
                            default: return 0;
                        }
                    }
                    case 'sensing_dayssince2000':
                        return (Date.now() - Date.UTC(2000, 0, 1)) / 86400000;
                    case 'sensing_username':
                        try { return runtime.ioDevices.userData.getUsername(); }
                        catch (e) { return ''; }
                    case 'sensing_keyoptions': return field('KEY_OPTION');

                    case 'sensing_touchingobject':
                    case 'sensing_touchingcolor':
                    case 'sensing_coloristouchingcolor':
                    case 'sensing_distanceto':
                    case 'sensing_of':
                    case 'sensing_loud':
                        throw new Error('需要运行时上下文，暂不支持');
                    case 'argument_reporter_string_number':
                    case 'argument_reporter_boolean':
                        throw new Error('自定义积木参数需运行时上下文');
                }
                throw new Error('暂不支持该积木');
            }

            try {
                return { ok: true, value: run(blockId, 0) };
            } catch (e) {
                return { ok: false, error: e.message || String(e) };
            }
        }

        function formatValue(v) {
            if (v === undefined || v === null) return '';
            if (typeof v === 'number') {
                if (!isFinite(v)) return String(v);
                return String(Math.round(v * 1e10) / 1e10);
            }
            if (typeof v === 'boolean') return String(v);
            var s = String(v);
            if (s.length > 80) s = s.slice(0, 80) + '…';
            return s;
        }

        function inputValueString(v) {
            if (v === undefined || v === null) return '';
            if (typeof v === 'number') {
                if (!isFinite(v)) return String(v);
                return String(Math.round(v * 1e10) / 1e10);
            }
            return String(v);
        }



        function getEditableInfo(block) {
            if (!block) return null;
            var op = block.opcode.replace(/__disabled$/, '');
            if (op === 'math_number' || op === 'math_whole_number' ||
                op === 'math_positive_number' || op === 'math_integer' ||
                op === 'math_angle') {
                return { kind: 'literal', field: 'NUM', numeric: true };
            }
            if (op === 'text') return { kind: 'literal', field: 'TEXT', numeric: false };
            if (op === 'colour_picker') return { kind: 'literal', field: 'COLOUR', numeric: false };
            if (op === 'note') return { kind: 'literal', field: 'NOTE', numeric: false };
            if (op === 'data_variable') {
                var f = block.fields && block.fields.VARIABLE;
                return { kind: 'variable', varName: f ? f.value : null };
            }
            if (op === 'sensing_answer') return { kind: 'answer' };
            return null;
        }

        function getInitialEditValue(target, block, info) {
            if (info.kind === 'literal') {
                var f = block.fields && block.fields[info.field];
                return f ? inputValueString(f.value) : '';
            }
            if (info.kind === 'variable') {
                var v = lookupVariable(target, info.varName);
                return v ? inputValueString(v.value) : '';
            }
            if (info.kind === 'answer') return inputValueString(getAnswer());
            return '';
        }

        function setBlocklyField(target, blockId, fieldName, value) {
            try {
                if (!vm.editingTarget || vm.editingTarget.id !== target.id) return false;
                var ws = getBlocklyWorkspace();
                if (!ws || !ws.getBlockById) return false;
                var blk = ws.getBlockById(blockId);
                if (!blk || !blk.setFieldValue) return false;
                blk.setFieldValue(value, fieldName);
                return true;
            } catch (e) {
                return false;
            }
        }

        function applyEdit(target, block, info, raw) {
            if (!block || !info) return { ok: false, error: '不可编辑' };
            var blocks = target.blocks;
            if (info.kind === 'literal') {
                var val = raw;
                if (info.numeric) {
                    var n = Number(raw);
                    if (raw === '' || isNaN(n)) return { ok: false, error: '请输入数字' };
                    val = n;
                }
                if (info.field === 'COLOUR' && !/^#[0-9a-fA-F]{6}$/.test(raw)) {
                    return { ok: false, error: '颜色格式 #rrggbb' };
                }
                var b = blocks.getBlock(block.id);
                if (!b) return { ok: false, error: '积木不存在' };
                if (!b.fields) b.fields = {};
                if (!b.fields[info.field]) b.fields[info.field] = { name: info.field };
                b.fields[info.field].value = val;
                var synced = setBlocklyField(target, block.id, info.field, val);
                if (!synced && vm.editingTarget && vm.editingTarget.id === target.id) {
                    try { vm.emitWorkspaceUpdate(); } catch (e) { /* ignore */ }
                }
                if (blocks.resetCache) blocks.resetCache();
                return { ok: true };
            }
            if (info.kind === 'variable') {
                var v = lookupVariable(target, info.varName);
                if (!v) return { ok: false, error: '变量不存在' };
                var vv = raw;
                if (raw !== '' && !isNaN(Number(raw))) vv = Number(raw);
                v.value = vv;
                if (blocks.resetCache) blocks.resetCache();
                return { ok: true };
            }
            if (info.kind === 'answer') {
                try {
                    runtime._answer = raw;
                    runtime.answer = raw;
                } catch (e) { /* ignore */ }
                return { ok: true };
            }
            return { ok: false, error: '不可编辑' };
        }



        function collectInputsSubtree(target, id, set) {
            var blocks = target.blocks;
            var b = blocks.getBlock(id);
            if (!b) return;
            if (set.has(id)) return;
            set.add(id);
            if (b.inputs) {
                Object.keys(b.inputs).forEach(function (name) {
                    var val = b.inputs[name];
                    if (!val) return;
                    if (Array.isArray(val)) {
                        var shadow = val[0];
                        var blockId = val[1];
                        if (typeof shadow === 'string' && shadow) collectInputsSubtree(target, shadow, set);
                        if (typeof blockId === 'string' && blockId) collectInputsSubtree(target, blockId, set);
                    } else if (typeof val === 'string' && val) {
                        collectInputsSubtree(target, val, set);
                    }
                });
            }
        }

        function disconnectFromParent(target, id, reconnectNext) {
            var blocks = target.blocks;
            var b = blocks.getBlock(id);
            if (!b) return;
            var parentId = b.parent;
            if (!parentId) {
                if (reconnectNext && b.next) {
                    var nb = blocks.getBlock(b.next);
                    if (nb) {
                        nb.parent = null;
                        nb.topLevel = true;
                    }
                }
                b.next = null;
                return;
            }
            var parent = blocks.getBlock(parentId);
            if (!parent) { b.parent = null; return; }
            if (parent.next === id) {
                parent.next = reconnectNext ? (b.next || null) : null;
                if (reconnectNext && b.next) {
                    var nb2 = blocks.getBlock(b.next);
                    if (nb2) nb2.parent = parentId;
                }
                b.next = null;
            } else if (parent.inputs) {
                Object.keys(parent.inputs).forEach(function (name) {
                    var val = parent.inputs[name];
                    if (!val) return;
                    if (Array.isArray(val)) {
                        if (val[1] === id) val[1] = null;
                        else if (val[0] === id) val[0] = null;
                    } else if (val === id) {
                        parent.inputs[name] = null;
                    }
                });
            }
            b.parent = null;
        }

        function deleteBlockData(target, id) {
            var blocks = target.blocks;
            var b = blocks.getBlock(id);
            if (!b) return 0;
            var set = new Set();
            collectInputsSubtree(target, id, set);
            disconnectFromParent(target, id, true);
            var n = 0;
            set.forEach(function (bid) {
                if (blocks._blocks[bid]) {
                    delete blocks._blocks[bid];
                    n++;
                }
            });
            if (blocks.resetCache) blocks.resetCache();
            return n;
        }

        function deleteChainData(target, id) {
            var blocks = target.blocks;
            var root = blocks.getBlock(id);
            if (!root) return 0;
            var set = new Set();
            var cur = id;
            while (cur) {
                var b = blocks.getBlock(cur);
                if (!b) break;
                collectInputsSubtree(target, cur, set);
                cur = b.next;
            }
            disconnectFromParent(target, id, false);
            var n = 0;
            set.forEach(function (bid) {
                if (blocks._blocks[bid]) {
                    delete blocks._blocks[bid];
                    n++;
                }
            });
            if (blocks.resetCache) blocks.resetCache();
            return n;
        }

        function tryBlocklyDelete(target, id, healStack) {
            try {
                if (!vm.editingTarget || !target || vm.editingTarget.id !== target.id) return false;
                var ws = getBlocklyWorkspace();
                if (!ws || !ws.getBlockById) return false;
                var blk = ws.getBlockById(id);
                if (!blk || !blk.dispose) return false;
                blk.dispose(healStack);
                return true;
            } catch (e) {
                return false;
            }
        }

        function tryBlocklyDeleteChain(target, id) {
            try {
                if (!vm.editingTarget || !target || vm.editingTarget.id !== target.id) return false;
                var ws = getBlocklyWorkspace();
                if (!ws || !ws.getBlockById) return false;
                var blocks = target.blocks;
                var ids = [];
                var cur = id;
                while (cur) {
                    var b = blocks.getBlock(cur);
                    if (!b) break;
                    ids.push(cur);
                    cur = b.next;
                }
                if (!ids.length) return false;
                for (var i = 0; i < ids.length; i++) {
                    if (!ws.getBlockById(ids[i])) return false;
                }
                for (var j = 0; j < ids.length; j++) {
                    var blk = ws.getBlockById(ids[j]);
                    if (blk) blk.dispose(true);
                }
                return true;
            } catch (e) {
                return false;
            }
        }

        function refreshWorkspaceAfterDataEdit(target) {
            try {
                if (vm.editingTarget && target && vm.editingTarget.id === target.id) {
                    if (vm.emitWorkspaceUpdate) vm.emitWorkspaceUpdate();
                }
            } catch (e) { /* ignore */ }
        }

        function stopAllSafely() {
            try { if (runtime.stopAll) runtime.stopAll(); } catch (e) { /* ignore */ }
        }

        function deleteOneBlock(target, id) {
            stopAllSafely();
            if (tryBlocklyDelete(target, id, true)) return true;
            var n = deleteBlockData(target, id);
            if (n > 0) {
                refreshWorkspaceAfterDataEdit(target);
                return true;
            }
            return false;
        }

        function deleteWholeChain(target, id) {
            stopAllSafely();
            if (tryBlocklyDeleteChain(target, id)) return true;
            var n = deleteChainData(target, id);
            if (n > 0) {
                refreshWorkspaceAfterDataEdit(target);
                return true;
            }
            return false;
        }


        function getChain(target, startId, depth, seen) {
            depth = depth || 0;
            seen = seen || {};
            if (depth > 50) return [];
            var blocks = target.blocks;
            var result = [];
            var id = startId;
            while (id) {
                if (seen[id]) break;
                seen[id] = true;
                var b = blocks.getBlock(id);
                if (!b) break;
                result.push({ id: id, block: b, depth: depth });

                if (b.inputs) {
                    var names = Object.keys(b.inputs);
                    for (var n = 0; n < names.length; n++) {
                        var name = names[n];
                        var val = b.inputs[name];
                        if (!val) continue;
                        var subId = Array.isArray(val) ? val[1] : val;
                        if (subId && typeof subId === 'string') {
                            var subBlock = blocks.getBlock(subId);
                            if (subBlock && subBlock.shadow === true) continue;
                            var sub = getChain(target, subId, depth + 1, seen);
                            for (var s = 0; s < sub.length; s++) result.push(sub[s]);
                        }
                    }
                }
                id = b.next;
            }
            return result;
        }

        function disableChain(target, id) {
            var list = getChain(target, id);
            var n = 0;
            for (var i = 0; i < list.length; i++) {
                if (getOutputType(target, list[i].block)) continue;
                if (disableBlock(target, list[i].id)) n++;
            }
            return n;
        }

        function enableChain(target, id) {
            var list = getChain(target, id);
            var n = 0;
            for (var i = 0; i < list.length; i++) {
                if (getOutputType(target, list[i].block)) continue;
                if (enableBlock(target, list[i].id)) n++;
            }
            return n;
        }

        function getTopScripts(target) {
            if (!target || !target.blocks || !target.blocks._blocks) return [];
            var out = [];
            var all = target.blocks._blocks;
            Object.keys(all).forEach(function (id) {
                var b = all[id];
                if (b && b.topLevel === true) out.push({ id: id, block: b });
            });
            return out;
        }

        var EVENT_HATS = {};
        [
            'event_whenflagclicked',
            'event_whenkeypressed',
            'event_whenthisspriteclicked',
            'event_whenstageclicked',
            'event_whenbackdropswitchesto',
            'event_whengreaterthan',
            'event_whenbroadcastreceived',
            'control_start_as_clone'
        ].forEach(function (op) { EVENT_HATS[op] = true; });

        function isRunnableHat(b) {
            if (!b) return false;
            var clean = b.opcode.replace(/__disabled$/, '');
            return EVENT_HATS[clean] === true;
        }

        function runScript(target, script) {
            if (isRunnableHat(script.block)) {
                try {
                    var fields = {};
                    if (script.block.fields) {
                        Object.keys(script.block.fields).forEach(function (k) {
                            var v = script.block.fields[k];
                            fields[k] = v && v.value;
                        });
                    }
                    var threads = runtime.startHats(script.block.opcode, fields, target);
                    return { ok: true, mode: 'startHats', threads: threads ? threads.length : 0 };
                } catch (e) {
                    return { ok: false, error: e.message };
                }
            }
            try {
                runtime._pushThread(script.id, target);
                return { ok: true, mode: '_pushThread' };
            } catch (e) {
                return { ok: false, error: e.message };
            }
        }



        var panel = document.createElement('div');
        panel.id = 'script-tree-panel';
        panel.style.cssText =
            'position:fixed;top:40px;left:40px;' +
            'width:760px;max-width:94vw;height:78vh;max-height:740px;' +
            'background:#fff;border-radius:12px;' +
            'box-shadow:0 20px 60px rgba(0,0,0,.3);' +
            'border:1px solid #e0e0e0;display:flex;flex-direction:column;' +
            'font-family:-apple-system,"Segoe UI",Arial,sans-serif;' +
            'z-index:999999999;overflow:hidden;';

        var header = document.createElement('div');
        header.style.cssText =
            'background:linear-gradient(135deg,#0a1a77,#2a3aa0);' +
            'color:#fff;padding:12px 16px;display:flex;' +
            'justify-content:space-between;align-items:center;' +
            'cursor:move;user-select:none;flex-shrink:0;';

        var title = document.createElement('div');
        title.textContent = '脚本编辑器';
        title.style.cssText = 'font-weight:700;font-size:14px;';

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText =
            'background:rgba(255,255,255,.2);border:none;color:#fff;' +
            'width:26px;height:26px;border-radius:50%;font-size:14px;' +
            'cursor:pointer;display:flex;align-items:center;justify-content:center;';
        closeBtn.onclick = function () {
            panel.remove();
            stopLiveRefresh();
        };
        header.appendChild(title);
        header.appendChild(closeBtn);

        var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
        header.addEventListener('mousedown', function (e) {
            if (e.target === closeBtn) return;
            dragging = true;
            var rect = panel.getBoundingClientRect();
            sx = e.clientX; sy = e.clientY; ox = rect.left; oy = rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            panel.style.left = (ox + e.clientX - sx) + 'px';
            panel.style.top = (oy + e.clientY - sy) + 'px';
        });
        document.addEventListener('mouseup', function () { dragging = false; });

        var toolbar = document.createElement('div');
        toolbar.style.cssText =
            'padding:10px 14px;display:flex;gap:8px;align-items:center;' +
            'border-bottom:1px solid #eee;flex-shrink:0;background:#fafafa;';

        var spriteSelect = document.createElement('select');
        spriteSelect.style.cssText =
            'flex:0 0 120px;padding:6px 8px;border:1px solid #ddd;' +
            'border-radius:6px;font-size:12px;background:#fff;font-family:inherit;';

        var langSelect = document.createElement('select');
        langSelect.style.cssText =
            'flex:0 0 110px;padding:6px 8px;border:1px solid #ddd;' +
            'border-radius:6px;font-size:12px;background:#fff;font-family:inherit;';
        LANGUAGES.forEach(function (l) {
            var opt = document.createElement('option');
            opt.value = l.value;
            opt.textContent = l.label;
            langSelect.appendChild(opt);
        });
        langSelect.value = currentLang;

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '搜索...';
        searchInput.style.cssText =
            'flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:6px;' +
            'font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;';

        var refreshBtn = document.createElement('button');
        refreshBtn.textContent = '刷新';
        refreshBtn.style.cssText =
            'padding:6px 10px;border:1px solid #ddd;background:#fff;' +
            'border-radius:6px;cursor:pointer;font-size:13px;';

        var restoreAllBtn = document.createElement('button');
        restoreAllBtn.textContent = '全部恢复';
        restoreAllBtn.style.cssText =
            'padding:6px 10px;border:1px solid #ddd;background:#fff;' +
            'border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit;';

        toolbar.appendChild(spriteSelect);
        toolbar.appendChild(langSelect);
        toolbar.appendChild(searchInput);
        toolbar.appendChild(refreshBtn);
        toolbar.appendChild(restoreAllBtn);

        var content = document.createElement('div');
        content.style.cssText = 'flex:1;overflow-y:auto;padding:10px;min-height:0;';

        var statusBar = document.createElement('div');
        statusBar.style.cssText =
            'padding:6px 14px;font-size:11px;color:#666;' +
            'border-top:1px solid #eee;flex-shrink:0;background:#fafafa;' +
            'min-height:26px;display:flex;align-items:center;';
        statusBar.textContent = '就绪';

        panel.appendChild(header);
        panel.appendChild(toolbar);
        panel.appendChild(content);
        panel.appendChild(statusBar);

        function setStatus(text, color) {
            statusBar.textContent = text;
            statusBar.style.color = color || '#666';
        }


        var currentTarget = null;
        var topScripts = [];
        var liveEntries = [];
        var liveTimer = null;

        function stopLiveRefresh() {
            if (liveTimer) {
                clearInterval(liveTimer);
                liveTimer = null;
            }
            liveEntries = [];
        }

        function updateLiveValues() {
            if (!document.body.contains(panel)) return;
            if (!currentTarget) return;
            for (var i = 0; i < liveEntries.length; i++) {
                var e = liveEntries[i];
                if (!e.el || !e.el.isConnected) continue;
                var r = evaluateReporter(currentTarget, e.blockId);
                if (e.kind === 'span') {
                    e.el.textContent = r.ok ? ('= ' + formatValue(r.value)) : ('⚠ ' + r.error);
                    e.el.title = r.ok ? ('当前值: ' + formatValue(r.value)) : r.error;
                } else if (e.kind === 'input') {
                    if (document.activeElement === e.el) continue;
                    if (r.ok) {
                        var txt = inputValueString(r.value);
                        if (e.el.value !== txt) e.el.value = txt;
                    }
                }
            }
        }

        function startLiveRefresh() {
            if (liveTimer) return;
            liveTimer = setInterval(updateLiveValues, 600);
        }

        function getTargets() {
            return (runtime.targets || []).filter(function (t) { return !t.isStage; });
        }

        function refreshSpriteList() {
            spriteSelect.innerHTML = '';
            var targets = getTargets();
            if (!targets.length) {
                var opt0 = document.createElement('option');
                opt0.textContent = '（无角色）';
                spriteSelect.appendChild(opt0);
                currentTarget = null;
                return;
            }
            targets.forEach(function (t) {
                var opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.isOriginal
                    ? (t.sprite && t.sprite.name || '?')
                    : ((t.sprite && t.sprite.name || '?') + '（克隆体）');
                spriteSelect.appendChild(opt);
            });
            currentTarget = targets[0];
            spriteSelect.value = currentTarget.id;
        }

        function makeSmallButton(text, bg) {
            var b = document.createElement('button');
            b.textContent = text;
            b.style.cssText =
                'padding:5px 10px;border:none;background:' + bg + ';' +
                'color:#fff;border-radius:6px;font-size:12px;cursor:pointer;' +
                'font-family:inherit;flex-shrink:0;';
            return b;
        }

        function renderScripts() {
            content.innerHTML = '';
            liveEntries = [];
            if (!currentTarget) {
                content.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">（无角色）</div>';
                return;
            }

            topScripts = getTopScripts(currentTarget);
            var kw = searchInput.value.trim().toLowerCase();

            if (!topScripts.length) {
                content.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">（该角色没有脚本）</div>';
                return;
            }

            var shown = 0;

            topScripts.forEach(function (top) {
                var chain = getChain(currentTarget, top.id);

                var filtered = chain;
                if (kw) {
                    filtered = chain.filter(function (item) {
                        return blockLabel(item.block).toLowerCase().indexOf(kw) !== -1;
                    });
                    if (filtered.length === 0) return;
                }
                shown++;

                var scriptCard = document.createElement('div');
                scriptCard.style.cssText =
                    'border:1px solid #e0e0e0;border-radius:10px;background:#fafafa;' +
                    'padding:10px 12px;margin-bottom:12px;';

                var scriptHead = document.createElement('div');
                scriptHead.style.cssText =
                    'display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap;';

                var scriptLabel = document.createElement('div');
                scriptLabel.textContent = blockLabel(top.block);
                scriptLabel.style.cssText =
                    'font-weight:700;font-size:13px;color:#333;font-family:monospace;' +
                    'flex:1;min-width:160px;word-break:break-all;';

                var runnable = isRunnableHat(top.block);

                var runBtn = makeSmallButton('运行', runnable ? '#28a745' : '#6b7280');
                runBtn.onclick = function () {
                    var res = runScript(currentTarget, top);
                    if (res.ok) {
                        setStatus('已触发' + (res.mode === 'startHats' ? (' 线程 ' + res.threads) : ''), '#28a745');
                    } else {
                        setStatus('触发失败: ' + res.error, '#ff3b30');
                    }
                };

                var disableScriptBtn = makeSmallButton('禁用整条', '#e67e22');
                disableScriptBtn.onclick = function () {
                    var n = disableChain(currentTarget, top.id);
                    setStatus('已禁用 ' + n + ' 块', '#e67e22');
                    renderScripts();
                };

                var enableScriptBtn = makeSmallButton('启用整条', '#0a1a77');
                enableScriptBtn.onclick = function () {
                    var n = enableChain(currentTarget, top.id);
                    setStatus('已启用 ' + n + ' 块', '#0a1a77');
                    renderScripts();
                };

                var deleteScriptBtn = makeSmallButton('删除整条', '#d9534f');
                deleteScriptBtn.onclick = function () {
                    if (!askConfirm('确定删除整条脚本吗？\n' + blockLabel(top.block))) return;
                    var ok = deleteWholeChain(currentTarget, top.id);
                    if (ok) {
                        setStatus('已删除整条脚本', '#d9534f');
                    } else {
                        setStatus('删除失败', '#ff3b30');
                    }
                    topScripts = getTopScripts(currentTarget);
                    renderScripts();
                };

                scriptHead.appendChild(scriptLabel);
                scriptHead.appendChild(runBtn);
                scriptHead.appendChild(disableScriptBtn);
                scriptHead.appendChild(enableScriptBtn);
                scriptHead.appendChild(deleteScriptBtn);
                scriptCard.appendChild(scriptHead);

                var blockList = document.createElement('div');
                blockList.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

                (kw ? filtered : chain).forEach(function (item) {
                    var id = item.id;
                    var block = item.block;
                    var depth = item.depth;
                    var disabled = isDisabled(block);
                    var outType = getOutputType(currentTarget, block);

                    var row = document.createElement('div');
                    row.style.cssText =
                        'display:flex;align-items:center;gap:6px;' +
                        'padding:5px 8px;border-radius:6px;' +
                        'background:' + (disabled ? '#ffe8e8' : '#fff') + ';' +
                        'border:1px solid ' + (disabled ? '#ffcccc' : '#eee') + ';' +
                        'margin-left:' + (Math.min(depth, 8) * 14) + 'px;' +
                        'font-size:12px;';

                    var dot = document.createElement('span');
                    dot.textContent = outType ? '◆' : '•';
                    dot.style.cssText =
                        'color:' + (outType ? '#0a1a77' : '#bbb') + ';' +
                        'flex-shrink:0;font-size:' + (outType ? '10px' : '12px') + ';';

                    var label = document.createElement('span');
                    label.textContent = blockLabel(block);
                    label.style.cssText =
                        'flex:1;min-width:0;font-family:monospace;word-break:break-all;' +
                        'color:' + (disabled ? '#999' : '#333') + ';' +
                        'text-decoration:' + (disabled ? 'line-through' : 'none') + ';';

                    row.appendChild(dot);
                    row.appendChild(label);

                    if (outType) {
                        var editInfo = getEditableInfo(block);
                        if (editInfo) {
                            var tag = document.createElement('span');
                            tag.textContent = '值';
                            tag.style.cssText = 'font-size:10px;color:#888;flex-shrink:0;';
                            row.appendChild(tag);

                            var inputEl = document.createElement('input');
                            inputEl.type = 'text';
                            inputEl.value = getInitialEditValue(currentTarget, block, editInfo);
                            inputEl.style.cssText =
                                'flex-shrink:0;width:110px;max-width:180px;padding:2px 6px;' +
                                'border:1px solid #c5cae9;border-radius:5px;font-size:11px;' +
                                'font-family:monospace;outline:none;background:#f5f7ff;' +
                                'color:#1a237e;box-sizing:border-box;';
                            inputEl.addEventListener('focus', function () {
                                this.style.background = '#fff';
                                this.style.borderColor = '#5c6bc0';
                            });
                            inputEl.addEventListener('blur', function () {
                                this.style.background = '#f5f7ff';
                                this.style.borderColor = '#c5cae9';
                            });
                            inputEl.addEventListener('change', (function (blk, info, el) {
                                return function () {
                                    var res = applyEdit(currentTarget, blk, info, el.value);
                                    if (res.ok) {
                                        setStatus('已修改: ' + blockLabel(blk) + ' → ' + el.value, '#0a1a77');
                                        var r = evaluateReporter(currentTarget, blk.id);
                                        if (r.ok) el.value = inputValueString(r.value);
                                    } else {
                                        setStatus('修改失败: ' + res.error, '#ff3b30');
                                        el.value = getInitialEditValue(currentTarget, blk, info);
                                    }
                                    updateLiveValues();
                                };
                            })(block, editInfo, inputEl));
                            inputEl.addEventListener('keydown', function (e) {
                                if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
                            });
                            row.appendChild(inputEl);

                            liveEntries.push({ blockId: id, el: inputEl, kind: 'input' });
                        } else {
                            var valSpan = document.createElement('span');
                            var evalResult = evaluateReporter(currentTarget, id);
                            valSpan.textContent = evalResult.ok
                                ? ('= ' + formatValue(evalResult.value))
                                : ('⚠ ' + evalResult.error);
                            valSpan.title = evalResult.ok
                                ? ('当前值: ' + formatValue(evalResult.value))
                                : evalResult.error;
                            valSpan.style.cssText =
                                'flex-shrink:0;max-width:220px;overflow:hidden;' +
                                'text-overflow:ellipsis;white-space:nowrap;' +
                                'font-family:monospace;font-size:11px;' +
                                'padding:2px 8px;border-radius:10px;' +
                                'background:' + (evalResult.ok ? '#e8f5e9' : '#fff3e0') + ';' +
                                'color:' + (evalResult.ok ? '#2e7d32' : '#e65100') + ';' +
                                'border:1px solid ' + (evalResult.ok ? '#c8e6c9' : '#ffe0b2') + ';';
                            row.appendChild(valSpan);
                            liveEntries.push({ blockId: id, el: valSpan, kind: 'span' });
                        }
                    } else {
                        var toggleBtn = document.createElement('button');
                        toggleBtn.textContent = disabled ? '启用' : '禁用';
                        toggleBtn.style.cssText =
                            'flex-shrink:0;padding:3px 8px;border:none;' +
                            'background:' + (disabled ? '#0a1a77' : '#e67e22') + ';' +
                            'color:#fff;border-radius:5px;font-size:11px;' +
                            'cursor:pointer;font-family:inherit;';
                        toggleBtn.onclick = (function (blockId, wasDisabled) {
                            return function () {
                                if (wasDisabled) enableBlock(currentTarget, blockId);
                                else disableBlock(currentTarget, blockId);
                                renderScripts();
                            };
                        })(id, disabled);
                        row.appendChild(toggleBtn);
                    }

                    var delBtn = document.createElement('button');
                    delBtn.textContent = '删除';
                    delBtn.style.cssText =
                        'flex-shrink:0;padding:3px 8px;border:none;' +
                        'background:#d9534f;color:#fff;border-radius:5px;' +
                        'font-size:11px;cursor:pointer;font-family:inherit;';
                    delBtn.onclick = (function (blockId, blk) {
                        return function () {
                            if (!askConfirm('确定删除这个积木吗？\n' + blockLabel(blk))) return;
                            var ok = deleteOneBlock(currentTarget, blockId);
                            if (ok) {
                                setStatus('已删除积木', '#d9534f');
                            } else {
                                setStatus('删除失败', '#ff3b30');
                            }
                            topScripts = getTopScripts(currentTarget);
                            renderScripts();
                        };
                    })(id, block);
                    row.appendChild(delBtn);

                    blockList.appendChild(row);
                });

                scriptCard.appendChild(blockList);
                content.appendChild(scriptCard);
            });

            startLiveRefresh();

            var langLabel = '';
            for (var i = 0; i < LANGUAGES.length; i++) {
                if (LANGUAGES[i].value === currentLang) { langLabel = LANGUAGES[i].label; break; }
            }
            setStatus('共 ' + shown + ' 条脚本 · 语言: ' + langLabel +
                (kw ? (' · 搜索: "' + searchInput.value + '"') : ''));
        }

        function reloadCurrent() {
            if (!currentTarget) return;
            topScripts = getTopScripts(currentTarget);
            renderScripts();
        }

        spriteSelect.onchange = function () {
            var list = getTargets();
            currentTarget = null;
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === spriteSelect.value) { currentTarget = list[i]; break; }
            }
            reloadCurrent();
        };

        langSelect.onchange = function () {
            currentLang = langSelect.value;
            renderScripts();
        };

        searchInput.addEventListener('input', renderScripts);

        refreshBtn.onclick = function () {
            refreshSpriteList();
            reloadCurrent();
        };

        restoreAllBtn.onclick = function () {
            if (!currentTarget) return;
            var n = 0;
            var all = currentTarget.blocks._blocks;
            Object.keys(all).forEach(function (id) {
                var b = all[id];
                if (b && b.opcode && b.opcode.slice(-DISABLED_SUFFIX.length) === DISABLED_SUFFIX) {
                    b.opcode = b.opcode.slice(0, -DISABLED_SUFFIX.length);
                    n++;
                }
            });
            if (currentTarget.blocks.resetCache) currentTarget.blocks.resetCache();
            setStatus('已恢复 ' + n + ' 块', '#0a1a77');
            renderScripts();
        };

        refreshSpriteList();
        reloadCurrent();

        if (runtime.on) {
            runtime.on('PROJECT_LOADED', function () {
                refreshSpriteList();
                reloadCurrent();
            });
        }

        var launcher = document.createElement('button');
        launcher.id = 'script-tree-launcher';
        launcher.title = '脚本编辑器';
        launcher.innerHTML =
            '<svg viewBox="0 0 32 32" width="22" height="22" fill="none" ' +
            'stroke="#fff" stroke-width="2" stroke-linejoin="round">' +
            '<path d="M6 6h8v4a2 2 0 1 0 4 0V6h8v8h-4a2 2 0 1 0 0 4h4v8h-8v-4a2 2 0 1 0-4 0v4H6v-8h4a2 2 0 1 0 0-4H6z"/>' +
            '</svg>';
        launcher.style.cssText =
            'position:fixed;right:18px;bottom:18px;width:46px;height:46px;' +
            'border-radius:50%;border:none;padding:0;cursor:pointer;' +
            'background:#e74c3c;box-shadow:0 6px 18px rgba(0,0,0,.28);' +
            'display:flex;align-items:center;justify-content:center;' +
            'user-select:none;z-index:2147483000;';

        var ldrag = false, lmove = false, lx = 0, ly = 0, lox = 0, loy = 0;

        launcher.addEventListener('mousedown', function (e) {
            ldrag = true; lmove = false;
            var r = launcher.getBoundingClientRect();
            lx = e.clientX; ly = e.clientY; lox = r.left; loy = r.top;
            launcher.style.left = r.left + 'px';
            launcher.style.top = r.top + 'px';
            launcher.style.right = 'auto';
            launcher.style.bottom = 'auto';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!ldrag) return;
            var dx = e.clientX - lx;
            var dy = e.clientY - ly;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) lmove = true;
            if (!lmove) return;
            launcher.style.left = (lox + dx) + 'px';
            launcher.style.top = (loy + dy) + 'px';
        });

        document.addEventListener('mouseup', function () {
            if (!ldrag) return;
            ldrag = false;
            if (!lmove) {
                var old = document.getElementById('script-tree-panel');
                if (old && old !== panel) old.remove();
                document.body.appendChild(panel);
                refreshSpriteList();
                reloadCurrent();
            }
        });

        document.body.appendChild(launcher);
    }

    (async function main() {
        if (!document.body) {
            await new Promise(function (resolve) {
                window.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
        }

        var vm = await waitForVM();
        if (!vm) {
            toast('VM 未获取');
            return;
        }
        init(vm);
    })();

})();