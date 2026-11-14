// ==UserScript==
// @name         ccw伪装身份pro
// @namespace    csrt-fake-identity
// @version      2.4.4
// @description  在 ccw 上伪装身份、作品数据、时间戳、创作者中心，支持多身份管理与主页快速伪装
// @match        https://*.ccw.site/*
// @author       110200
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-start
// @icon         https://m.ccw.site/community/images/logo-ccw.png
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG_KEY = '伪装配置';
    const PROFILES_KEY = '伪装配置列表';
    const ACTIVE_PROFILE_KEY = '伪装当前配置名';

    const DEFAULTS = {
        profileName: '当前身份名称',
        oid: '',
        id: '',
        name: '',
        avatar: '',
        fullName: '110200',
        contactPhone: '11020011020',
        identityAuthRank: 'L2',
        identity: '',
        reputationRank: 'EXCELLENT',
        reputationScore: 100,
        bio: '',
        gender: null,
        grade: 0,
        memberId: 114514,
        maxCheckedFeedId: '',
        creationCount: 0,
        publishedCreationCount: 0,
        fansCount: 0,
        followingCount: 0,
        followedCount: 0,
        likeCount: 0,
        favoriteCount: 0,
        viewCount: 0,
        playCount: 0,
        createdAt: 0,
        lastLoginAt: 0,
        updatedAt: 0,
        creatorScore: 100,
        creatorRank: 'HACKER',
        emptyFollowingText: '',
        emptyFansText: ''
    };

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
    }
    function setCookie(name, value) {
        document.cookie = `${name}=${value}; path=/;`;
    }
    function randomStr(len) {
        const chars = 'abcdefhijklmnopqrstuvwxyz0123456789';
        let s = '';
        for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

    function getConfig() {
        const saved = GM_getValue(CONFIG_KEY, null);
        if (!saved) return null;
        return Object.assign({}, DEFAULTS, saved);
    }
    function saveConfig(cfg) {
        GM_setValue(CONFIG_KEY, cfg);
        if (cfg.profileName) {
            const list = getProfiles();
            list[cfg.profileName] = cfg;
            GM_setValue(PROFILES_KEY, list);
            GM_setValue(ACTIVE_PROFILE_KEY, cfg.profileName);
        }
    }

    function rawFetch(url, options) {
        const _raw = window.__csrt_raw_fetch__;
        if (typeof _raw === 'function') return _raw(url, options);
        return window.fetch(url, options);
    }

    function getProfiles() {
        return GM_getValue(PROFILES_KEY, {});
    }
    function saveProfiles(list) {
        GM_setValue(PROFILES_KEY, list);
    }

    function switchProfile(profileName) {
        const list = getProfiles();
        if (!list[profileName]) {
            alert('未找到该身份: ' + profileName);
            return false;
        }
        const cfg = Object.assign({}, DEFAULTS, list[profileName], { profileName });
        GM_setValue(CONFIG_KEY, cfg);
        GM_setValue(ACTIVE_PROFILE_KEY, profileName);
        GM_setValue('身份', { oid: cfg.oid, id: cfg.id, name: cfg.name, avatar: cfg.avatar });
        if (cfg.oid && !getCookie('cookie-user-id')) {
            setCookie('cookie-user-id', cfg.oid);
        }
        return true;
    }

    async function doManualIdentityFlow(oid, cur) {
        let auto = { id: '', name: '', avatar: '' };
        let userExists = false;
        try {
            const info = await rawFetch('https://community-web.ccw.site/students/profile', {
                headers: { 'content-type': 'application/json' },
                referrer: 'https://www.ccw.site/',
                method: 'POST',
                body: JSON.stringify({ studentOid: oid })
            }).then(r => r.json());
            if (info?.body?.studentNumber) {
                auto.id = info.body.studentNumber || '';
                auto.name = info.body.name || '';
                auto.avatar = info.body.avatar || '';
                userExists = true;
            }
        } catch (e) {}

        if (!userExists) {
            alert('未找到该用户（或查询失败），接下来可以手动填写身份信息。');
        }

        const id = prompt(
            userExists ? '输入要切换的 id（取消则使用自动获取）' : '输入要切换的 id',
            auto.id || cur.id || ''
        );
        if (id === null) return;

        const name = prompt(
            userExists ? '输入要切换的名字（取消则使用自动获取）' : '输入要切换的名字',
            auto.name || cur.name || ''
        );
        if (name === null) return;

        const avatar = prompt(
            userExists ? '输入要切换的头像 url（取消则使用自动获取）' : '输入要切换的头像 url（可留空）',
            auto.avatar || cur.avatar || ''
        );
        if (avatar === null) return;

        const profileName = prompt(
            '为这个身份起个名字（保存到多身份列表）',
            cur.profileName || '默认'
        );
        if (profileName === null) return;

        cur.profileName = profileName || '默认';
        cur.oid = oid;
        cur.id = id || '';
        cur.name = name || '';
        cur.avatar = avatar || '';

        GM_setValue('身份', { oid: cur.oid, id: cur.id, name: cur.name, avatar: cur.avatar });
        saveConfig(cur);

        if (oid && !getCookie('cookie-user-id')) {
            setCookie('cookie-user-id', oid);
        }

        if (confirm('基础身份已保存。是否继续配置身份资料 / 作品数据 / 时间戳 / 创作者分？')) {
            await editFullProfile();
        }

        location.reload();
    }

    async function changeIdentity() {
        const cur = getConfig() || { ...DEFAULTS };

        const pathname = window.location.pathname;
        const m = pathname.match(/\/student\/([^?\/]+)/);
        if (m && m[1]) {
            const param = m[1];
            const isOid = param.length >= 15;
            const body = isOid ? { studentOid: param } : { studentNumber: param };

            let info = null;
            try {
                const resp = await rawFetch('https://community-web.ccw.site/students/profile', {
                    headers: { 'content-type': 'application/json' },
                    referrer: 'https://www.ccw.site/',
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                const json = await resp.json();
                info = json && json.body;
            } catch (e) {}

            if (info) {
                const oid = info.studentOid || (isOid ? param : '');
                const id = info.studentNumber || (!isOid ? param : '');
                const name = info.name || '';
                const avatar = info.avatar || '';
                const display = name || id || oid;

                const confirmed = confirm('是否伪装成此人？\n\n' + display + '\noid: ' + oid + '\nid: ' + id);

                if (confirmed) {
                    const newCfg = Object.assign({}, cur, {
                        profileName: '主页-' + display,
                        oid: oid,
                        id: id,
                        name: name,
                        avatar: avatar,
                        fullName: name || cur.fullName,
                        bio: info.bio || '',
                        gender: info.gender != null ? info.gender : null,
                        grade: info.grade != null ? info.grade : 0,
                        creationCount: info.creationCount || 0,
                        publishedCreationCount: info.publishedCreationCount || 0,
                        fansCount: info.fansCount || 0,
                        followingCount: info.followingCount || 0,
                        followedCount: info.followedCount || 0,
                        likeCount: info.likeCount || 0,
                        favoriteCount: info.favoriteCount || 0,
                        viewCount: info.viewCount || 0,
                        playCount: info.playCount || 0,
                        reputationRank: (info.reputationScore && info.reputationScore.rank) || cur.reputationRank,
                        reputationScore: (info.reputationScore && info.reputationScore.score) || cur.reputationScore
                    });
                    if (!newCfg.maxCheckedFeedId) newCfg.maxCheckedFeedId = randomStr(30);

                    GM_setValue('身份', { oid: newCfg.oid, id: newCfg.id, name: newCfg.name, avatar: newCfg.avatar });
                    saveConfig(newCfg);

                    if (newCfg.oid && !getCookie('cookie-user-id')) {
                        setCookie('cookie-user-id', newCfg.oid);
                    }

                    alert('已伪装成 ' + display + '，页面将刷新生效。');
                    location.reload();
                    return;
                }

                const manualOid = prompt(
                    '输入目标用户的 oid（主页链接后面的部分），取消代表关闭伪装',
                    cur.oid || ''
                );
                if (manualOid === null) return;

                if (!manualOid) {
                    if (confirm('确定要关闭伪装吗？会清除所有配置并刷新页面')) {
                        GM_deleteValue(CONFIG_KEY);
                        GM_deleteValue('身份');
                        try { document.cookie = 'cookie-user-id=; path=/; max-age=0'; } catch (e) {}
                        location.reload();
                    }
                    return;
                }

                await doManualIdentityFlow(manualOid, cur);
                return;
            }
        }

        const oid = prompt(
            '输入目标用户的 oid（主页链接后面的部分），取消代表关闭伪装',
            cur.oid || ''
        );
        if (oid === null) return;

        if (!oid) {
            if (confirm('确定要关闭伪装吗？会清除所有配置并刷新页面')) {
                GM_deleteValue(CONFIG_KEY);
                GM_deleteValue('身份');
                try { document.cookie = 'cookie-user-id=; path=/; max-age=0'; } catch (e) {}
                location.reload();
            }
            return;
        }

        await doManualIdentityFlow(oid, cur);
    }

    async function editFullProfile() {
        const cur = getConfig() || { ...DEFAULTS };

        function askNum(label, key, def) {
            const v = prompt(label + '（取消保持原值）', String(cur[key] ?? def));
            if (v === null) return;
            const n = Number(v);
            if (isNaN(n)) { alert('不是有效数字，保持原值'); return; }
            cur[key] = n;
        }
        function askStr(label, key, def) {
            const v = prompt(label + '（取消保持原值）', String(cur[key] ?? def));
            if (v === null) return;
            cur[key] = v;
        }
        function askTimestamp(label, key) {
            const v = prompt(
                label + '\n填 0 = 用真实时间；也可以填毫秒时间戳，如 1700000000000',
                String(cur[key] ?? 0)
            );
            if (v === null) return;
            const n = Number(v);
            if (isNaN(n) || n < 0) { alert('不是有效数字，保持原值'); return; }
            cur[key] = n;
        }

        alert('=== 身份资料 ===');
        askStr('fullName（真实姓名）', 'fullName', '不想上学');
        askStr('contactPhone（联系手机号）', 'contactPhone', '12345678901');
        askStr('identityAuthRank（认证等级 L0/L1/L2）', 'identityAuthRank', 'L2');
        askStr('identity（身份证号，L2 时有效，可留空）', 'identity', '');
        askStr('reputationRank（信誉等级 EXCELLENT/GOOD/...）', 'reputationRank', 'EXCELLENT');
        askNum('reputationScore（信誉分数）', 'reputationScore', 100);
        askStr('bio（个人简介）', 'bio', '');
        askNum('grade（年级）', 'grade', 0);

        alert('=== member/detail 特有 ===');
        askNum('memberId（成员 ID，数字）', 'memberId', 114514);
        askStr('maxCheckedFeedId（空 = 自动生成并固定）', 'maxCheckedFeedId', '');

        alert('=== 作品/创作数据 ===');
        askNum('creationCount（作品总数）', 'creationCount', 0);
        askNum('publishedCreationCount（已发布作品数）', 'publishedCreationCount', 0);
        askNum('fansCount（粉丝数）', 'fansCount', 0);
        askNum('followingCount（关注数）', 'followingCount', 0);
        askNum('followedCount（被关注数）', 'followedCount', 0);
        askNum('likeCount（获赞数）', 'likeCount', 0);
        askNum('favoriteCount（收藏数）', 'favoriteCount', 0);
        askNum('viewCount（浏览量）', 'viewCount', 0);
        askNum('playCount（游玩次数）', 'playCount', 0);

        alert('=== 时间戳 ===');
        askTimestamp('createdAt（注册时间）', 'createdAt');
        askTimestamp('lastLoginAt（最后登录时间）', 'lastLoginAt');
        askTimestamp('updatedAt（更新时间）', 'updatedAt');

        alert('=== 创作者中心 ===');
        askNum('creatorScore（创作分 0-100）', 'creatorScore', 100);
        askStr('creatorRank（权限档位 ORDINARY/ADVANCED/HACKER）', 'creatorRank', 'HACKER');

        alert('=== 空列表文字 ===');
        askStr('emptyFollowingText（关注列表为空时的文字，留空=默认）', 'emptyFollowingText', '');
        askStr('emptyFansText（粉丝列表为空时的文字，留空=默认）', 'emptyFansText', '');

        if (!cur.maxCheckedFeedId) {
            cur.maxCheckedFeedId = randomStr(30);
        }

        saveConfig(cur);
        alert('完整配置已保存，页面将刷新以生效。');
    }

    function quickEdit() {
        const cur = getConfig();
        if (!cur) {
            alert('尚未开启伪装，请先执行「切换身份」');
            return;
        }
        const field = prompt(
            '输入要修改的字段名：\n\n' +
            'fullName / contactPhone / identityAuthRank / identity / reputationRank / reputationScore / bio / grade / memberId / maxCheckedFeedId\n' +
            'creationCount / publishedCreationCount / fansCount / followingCount / followedCount / likeCount / favoriteCount / viewCount / playCount\n' +
            'createdAt / lastLoginAt / updatedAt\n' +
            'creatorScore / creatorRank\n' +
            'emptyFollowingText / emptyFansText\n\n' +
            '（取消 = 退出）',
            ''
        );
        if (!field) return;
        if (!(field in DEFAULTS)) {
            alert('未知字段: ' + field);
            return;
        }
        const v = prompt(`输入 ${field} 的新值`, String(cur[field] ?? ''));
        if (v === null) return;
        const n = Number(v);
        cur[field] = (!isNaN(n) && v.trim() !== '') ? n : v;
        saveConfig(cur);
        alert('已保存，页面将刷新。');
        location.reload();
    }

    function showConfig() {
        const cur = getConfig();
        if (!cur) {
            console.log('[伪装身份pro] 未配置');
            alert('未配置');
            return;
        }
        console.log('[伪装身份pro] 当前配置:', cur);
        const text = JSON.stringify(cur, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            alert('配置已复制到剪贴板，同时打印到 F12 控制台');
        }).catch(() => {
            alert('配置已打印到 F12 控制台（复制失败）');
        });
    }

    function repairLogin() {
        rawFetch('https://community-web.ccw.site/students/self/detail', {
            headers: { 'content-type': 'application/json' },
            referrer: 'https://www.ccw.site/',
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            body: '{}'
        })
            .then(r => r.json())
            .then(json => {
                if (json.body == null) {
                    alert('修复失败：服务器返回空');
                } else {
                    setCookie('cookie-user-id', json.body.oid);
                    alert('修复成功，刷新中...');
                    setTimeout(() => location.reload(), 500);
                }
            })
            .catch(e => {
                alert('修复失败: ' + e.message);
            });
    }

    function listProfiles() {
        const list = getProfiles();
        const names = Object.keys(list);
        if (names.length === 0) {
            alert('暂无已保存的身份');
            return;
        }
        const active = GM_getValue(ACTIVE_PROFILE_KEY, '');
        const msg = names.map((n, i) => {
            const cfg = list[n];
            const mark = n === active ? ' [当前]' : '';
            return `${i + 1}. ${n}${mark}\n   oid: ${cfg.oid}\n   id: ${cfg.id}\n   name: ${cfg.name}`;
        }).join('\n\n');

        const choice = prompt(
            '已保存的身份：\n\n' + msg + '\n\n输入序号切换（取消 = 退出）\n输入 d+序号 删除（例：d1）',
            ''
        );
        if (!choice) return;

        if (choice.toLowerCase().startsWith('d')) {
            const idx = parseInt(choice.slice(1)) - 1;
            if (isNaN(idx) || idx < 0 || idx >= names.length) {
                alert('无效序号');
                return;
            }
            const target = names[idx];
            if (confirm(`确定删除身份「${target}」？`)) {
                delete list[target];
                saveProfiles(list);
                if (GM_getValue(ACTIVE_PROFILE_KEY) === target) {
                    GM_deleteValue(ACTIVE_PROFILE_KEY);
                }
                alert('已删除');
            }
            return;
        }

        const idx = parseInt(choice) - 1;
        if (isNaN(idx) || idx < 0 || idx >= names.length) {
            alert('无效序号');
            return;
        }
        const target = names[idx];
        if (switchProfile(target)) {
            alert(`已切换到身份「${target}」，刷新中...`);
            location.reload();
        }
    }

    function saveCurrentAsNewProfile() {
        const cur = getConfig();
        if (!cur || !cur.oid) {
            alert('当前没有伪装身份，请先「切换身份」');
            return;
        }
        const name = prompt('为新身份起个名字', cur.profileName || '未命名');
        if (!name) return;
        const newProfile = Object.assign({}, cur, { profileName: name });
        const list = getProfiles();
        list[name] = newProfile;
        saveProfiles(list);
        saveConfig(newProfile);
        alert(`已保存为「${name}」`);
    }

    function buildSelfDetail(cfg) {
        const now = Date.now();
        const createdAt = cfg.createdAt > 0 ? cfg.createdAt : now;
        const lastLoginAt = cfg.lastLoginAt > 0 ? cfg.lastLoginAt : now;
        const updatedAt = cfg.updatedAt > 0 ? cfg.updatedAt : now;
        const idNumber = cfg.identity || (() => {
            let s = '';
            for (let i = 0; i < 18; i++) s += String(Math.floor(Math.random() * 10));
            return s;
        })();

        return {
            body: {
                abGroup: null,
                accountNumber: cfg.contactPhone,
                address: null,
                addressCode: null,
                age: null,
                archive: null,
                avatar: cfg.avatar || 'https://m.ccw.site/community/images/logo-ccw.png',
                popIcon: {},
                popIconExpireAt: null,
                pendant: {},
                pendantExpireAt: null,
                avatarFrame: {},
                avatarFrameExpireAt: null,
                titleBadge: {},
                titleBadgeExpireAt: null,
                medalIcon: {},
                bio: cfg.bio || '',
                birthYear: null,
                birthday: null,
                category: null,
                city: null,
                commentCount: 0,
                contactPhone: cfg.contactPhone,
                countryCode: null,
                createdAt,
                currentMajorClazzOid: null,
                currentParent: {
                    bindPhone: cfg.contactPhone,
                    qqNickname: '不想上学',
                    qqNum: null
                },
                distinctId: null,
                district: null,
                email: null,
                energy: null,
                energyRegain: null,
                examScore: null,
                extraInfo: null,
                firstTime: null,
                followingStatus: null,
                fullName: cfg.fullName,
                gender: cfg.gender,
                grade: cfg.grade,
                group: null,
                guest: null,
                guestNumber: null,
                hideGender: false,
                host: 'aliyun',
                identity: cfg.identityAuthRank === 'L2' ? idNumber : null,
                identityAuthRank: cfg.identityAuthRank,
                identityType: null,
                informationModifyDate: {
                    avatarModifiedAt: null,
                    nameModifiedAt: null
                },
                keywords: [],
                lastLoginAt,
                lastStudyAt: null,
                lowAge: null,
                midexamScore: null,
                miniprojectFreeNum: null,
                mpClicked: null,
                mpShowedModal: null,
                mpTutorial: null,
                name: cfg.name,
                newWorkbenchTutorial: null,
                oid: cfg.oid,
                orgId: null,
                parents: [{
                    acceptedCashInviteOnce: null,
                    alphaUser: null,
                    altName: null,
                    annualIncome: null,
                    archive: null,
                    authedTime: null,
                    avatar: null,
                    bindPhone: cfg.contactPhone,
                    birthday: null,
                    cashInviteCreatedAt: null,
                    cashInviteRestartAt: null,
                    clazzDevice: null,
                    company: null,
                    countryCode: null,
                    createdAt: null,
                    degree: null,
                    distinctId: 'CD7C6B6226784144970A0EDDAE9F4070',
                    divorced: null,
                    email: null,
                    ext: {},
                    followTeachers: [],
                    fullName: null,
                    gender: null,
                    giftCardCampaign: null,
                    guestOid: null,
                    idcard: null,
                    industry: null,
                    integer: null,
                    inviterableId: null,
                    inviterableType: null,
                    isEmployee: null,
                    jobPosition: null,
                    lastSubscribeAt: null,
                    mainContact: null,
                    name: null,
                    needSelectClazz: null,
                    oid: cfg.oid,
                    overseaExperience: null,
                    phoneAddr: { phone: cfg.contactPhone },
                    powerUser: null,
                    realName: null,
                    relationship: null,
                    remarkName: null,
                    rewardsCashesCount: null,
                    source: null,
                    sourceCategory: null,
                    sourceInfo: null,
                    status: null,
                    student: null,
                    studentOid: cfg.oid,
                    subscribe: null,
                    subscribeScene: null,
                    tags: null,
                    telephone: cfg.contactPhone,
                    university: null,
                    updatedAt: null,
                    userTags: [],
                    userType: null,
                    wechatAccount: null,
                    wechatCity: null,
                    wechatCountry: null,
                    wechatOpenid: null,
                    wechatProvince: null,
                    wechatUnionid: null,
                    wehubWxid: null,
                    wxid: null
                }],
                passwordDigest: null,
                photo: null,
                picUrl: null,
                province: null,
                qq: null,
                receiver: null,
                regChannel: '1',
                remarkName: null,
                reputationScore: {
                    rank: cfg.reputationRank,
                    score: cfg.reputationScore,
                    studentOid: cfg.oid
                },
                role: null,
                school: null,
                showServiceTerm: null,
                showTaskList: null,
                stats: null,
                studentNumber: cfg.id,
                task: null,
                teacherUnreadedMessages: null,
                tutorialSteps: null,
                updatedAt,
                validateSchool: null,
                virtualValue: null,
                watchedMiniProjectTutorailVideo: null,
                xiguaStudentNo: null,
                creationCount: cfg.creationCount,
                publishedCreationCount: cfg.publishedCreationCount,
                fansCount: cfg.fansCount,
                followingCount: cfg.followingCount,
                followedCount: cfg.followedCount,
                likeCount: cfg.likeCount,
                favoriteCount: cfg.favoriteCount,
                viewCount: cfg.viewCount,
                playCount: cfg.playCount
            },
            code: '200',
            msg: null,
            status: 200
        };
    }

    function buildMemberDetail(cfg) {
        const now = Date.now();
        const createdAt = cfg.createdAt > 0 ? cfg.createdAt : now;
        const updatedAt = cfg.updatedAt > 0 ? cfg.updatedAt : now;

        return {
            body: {
                accountOid: cfg.oid,
                accountType: 'STUDENT',
                approvedContent: null,
                approvedType: null,
                avatar: cfg.avatar || 'https://m.ccw.site/community/images/logo-ccw.png',
                createdAt,
                ext: {},
                hideGender: true,
                id: cfg.memberId,
                maxCheckedFeedId: cfg.maxCheckedFeedId,
                name: cfg.name,
                status: 'NORMAL',
                studentNumber: cfg.id,
                updatedAt,
                creationCount: cfg.creationCount,
                publishedCreationCount: cfg.publishedCreationCount,
                fansCount: cfg.fansCount,
                followingCount: cfg.followingCount,
                followedCount: cfg.followedCount,
                likeCount: cfg.likeCount,
                favoriteCount: cfg.favoriteCount,
                viewCount: cfg.viewCount,
                playCount: cfg.playCount
            },
            code: '200',
            msg: null,
            status: 200
        };
    }

    function buildStudentsProfile(cfg) {
        const now = Date.now();
        const createdAt = cfg.createdAt > 0 ? cfg.createdAt : now;
        return {
            body: {
                studentNumber: cfg.id,
                studentOid: cfg.oid,
                name: cfg.name,
                avatar: cfg.avatar || 'https://m.ccw.site/community/images/logo-ccw.png',
                category: 'ordinary',
                fullName: cfg.fullName,
                contactPhone: cfg.contactPhone,
                identityAuthRank: cfg.identityAuthRank,
                reputationScore: {
                    rank: cfg.reputationRank,
                    score: cfg.reputationScore,
                    studentOid: cfg.oid
                },
                bio: cfg.bio || '',
                gender: cfg.gender,
                grade: cfg.grade,
                createdAt,
                hideGender: false,
                creationCount: cfg.creationCount,
                publishedCreationCount: cfg.publishedCreationCount,
                fansCount: cfg.fansCount,
                followingCount: cfg.followingCount,
                followedCount: cfg.followedCount,
                likeCount: cfg.likeCount,
                favoriteCount: cfg.favoriteCount,
                viewCount: cfg.viewCount,
                playCount: cfg.playCount
            },
            code: '200',
            msg: null,
            status: 200
        };
    }

    function buildCreatorScore(cfg) {
        return {
            body: {
                rank: cfg.creatorRank || 'HACKER',
                rankRetentionDate: null,
                score: cfg.creatorScore ?? 100,
                studentOid: cfg.oid
            },
            code: '200',
            msg: null,
            status: 200
        };
    }

    const XHR = XMLHttpRequest.prototype;
    const _open = XHR.open;
    const _fetch = window.fetch;
    window.__csrt_raw_fetch__ = _fetch ? _fetch.bind(window) : null;

    const PATH_SELF_DETAIL = '/students/self/detail';
    const PATH_MEMBER_DETAIL = '/study-community/member/detail';
    const PATH_STUDENTS_PROFILE = '/students/profile';
    const PATH_LOCKED_USER = '/locked_user/detail';
    const PATH_STUDENTS_STATS = '/students/stats';
    const PATH_LAST_ACTIVE_AT = '/students/last_active_at';
    const PATH_CREATION_INTRO = '/creation/introduction/detail';
    const PATH_STUDENTS_DETAIL = '/students/detail';
    const PATH_USER_CARD_DETAIL = '/user-card/detail';
    const PATH_CREATION_STUDENT_DETAIL = '/creation/student/detail';
    const PATH_STUDENTS_FOLLOWING = '/students/following/page';
    const PATH_STUDENTS_FANS = '/students/fans/page';
    const PATH_COMMENT_PAGE = '/comment/page';
    const PATH_CREATOR_SCORE = '/students/creator_score';
    const PATH_FEED_LIST = '/feed/list';

    const PATH_STUDENT_FOLLOWING_PREFIX = '/student/following';
    const PATH_STUDENT_FANS_PREFIX = '/student/fans';
    const PATH_STUDENT_FOLLOWER_PREFIX = '/student/follower';

    function buildFakeResponse(body) {
        return {
            body,
            code: '200',
            msg: null,
            status: 200
        };
    }

    function getUrlPath(url) {
        if (typeof url !== 'string') return '';
        try {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return new URL(url).pathname;
            }
            return url.split('?')[0];
        } catch (e) {
            return url.split('?')[0];
        }
    }

    function matchRule(url) {
        const path = getUrlPath(url);
        if (!path) return null;

        if (path.endsWith(PATH_SELF_DETAIL)) return 'selfDetail';
        if (path.endsWith(PATH_MEMBER_DETAIL)) return 'memberDetail';
        if (path.endsWith(PATH_STUDENTS_PROFILE)) return 'studentsProfile';
        if (path.endsWith(PATH_LOCKED_USER)) return 'lockedUser';
        if (path.endsWith(PATH_STUDENTS_STATS)) return 'studentsStats';
        if (path.endsWith(PATH_LAST_ACTIVE_AT)) return 'lastActive';
        if (path.endsWith(PATH_CREATION_INTRO)) return 'creationIntro';
        if (path.endsWith(PATH_STUDENTS_DETAIL)) return 'studentsDetail';
        if (path.endsWith(PATH_USER_CARD_DETAIL)) return 'userCard';
        if (path.endsWith(PATH_CREATION_STUDENT_DETAIL)) return 'creationStudentDetail';
        if (path.endsWith(PATH_STUDENTS_FOLLOWING) || path.endsWith(PATH_STUDENTS_FANS)) return 'followList';
        if (path.indexOf(PATH_STUDENT_FOLLOWING_PREFIX) !== -1) return 'followList';
        if (path.indexOf(PATH_STUDENT_FANS_PREFIX) !== -1) return 'followList';
        if (path.indexOf(PATH_STUDENT_FOLLOWER_PREFIX) !== -1) return 'followList';
        if (path.endsWith(PATH_COMMENT_PAGE)) return 'commentList';
        if (path.endsWith(PATH_CREATOR_SCORE)) return 'creatorScore';
        if (path.endsWith(PATH_FEED_LIST)) return 'feedList';

        return null;
    }

    function isFollowOrFanUrl(url) {
        return matchRule(url) === 'followList';
    }

    function buildFakeBody(rule, cfg) {
        if (!rule || !cfg || !cfg.oid) return null;

        switch (rule) {
            case 'selfDetail':
                return buildSelfDetail(cfg);
            case 'memberDetail':
                return buildMemberDetail(cfg);
            case 'studentsProfile':
                return buildStudentsProfile(cfg);
            case 'lockedUser':
                return buildFakeResponse({ locked: false });
            case 'studentsStats':
                return buildFakeResponse({
                    studentOid: cfg.oid,
                    creationCount: cfg.creationCount,
                    publishedCreationCount: cfg.publishedCreationCount,
                    fansCount: cfg.fansCount,
                    followingCount: cfg.followingCount,
                    followedCount: cfg.followedCount,
                    likeCount: cfg.likeCount,
                    favoriteCount: cfg.favoriteCount,
                    viewCount: cfg.viewCount,
                    playCount: cfg.playCount,
                    worksCount: cfg.creationCount,
                    viewsCount: cfg.viewCount,
                    likesCount: cfg.likeCount,
                    favoritesCount: cfg.favoriteCount,
                    collectionCount: cfg.favoriteCount,
                    totalPlayCount: cfg.playCount,
                    totalLikeCount: cfg.likeCount,
                    totalFavoriteCount: cfg.favoriteCount
                });
            case 'lastActive': {
                const now = Date.now();
                const lastActive = cfg.lastLoginAt > 0 ? cfg.lastLoginAt : now;
                return buildFakeResponse({
                    oid: cfg.oid,
                    studentOid: cfg.oid,
                    lastActiveAt: lastActive,
                    lastLoginAt: lastActive,
                    updatedAt: lastActive,
                    online: true,
                    status: 'ONLINE'
                });
            }
            case 'creationIntro': {
                const now = Date.now();
                return buildFakeResponse({
                    oid: cfg.oid,
                    studentOid: cfg.oid,
                    introduction: cfg.bio || '',
                    description: cfg.bio || '',
                    content: cfg.bio || '',
                    title: '',
                    cover: '',
                    createdAt: cfg.createdAt > 0 ? cfg.createdAt : now,
                    updatedAt: cfg.updatedAt > 0 ? cfg.updatedAt : now
                });
            }
            case 'studentsDetail':
                return buildFakeResponse(buildStudentsProfile(cfg).body);
            case 'userCard':
                return buildFakeResponse({
                    user: {
                        accountOid: cfg.oid,
                        oid: cfg.oid,
                        studentNumber: cfg.id,
                        name: cfg.name,
                        nickname: cfg.name,
                        avatar: cfg.avatar || 'https://m.ccw.site/community/images/logo-ccw.png',
                        bio: cfg.bio || '',
                        gender: cfg.gender,
                        hideGender: false,
                        creationCount: cfg.creationCount,
                        fansCount: cfg.fansCount,
                        followingCount: cfg.followingCount,
                        likeCount: cfg.likeCount,
                        favoriteCount: cfg.favoriteCount
                    }
                });
            case 'creationStudentDetail': {
                const now = Date.now();
                return buildFakeResponse({
                    studentOid: cfg.oid,
                    studentNumber: cfg.id,
                    name: cfg.name,
                    avatar: cfg.avatar || 'https://m.ccw.site/community/images/logo-ccw.png',
                    isSelf: true,
                    creationCount: cfg.creationCount,
                    publishedCreationCount: cfg.publishedCreationCount,
                    works: [],
                    creations: [],
                    list: [],
                    data: [],
                    total: 0,
                    page: 1,
                    pageSize: 20,
                    createdAt: cfg.createdAt > 0 ? cfg.createdAt : now,
                    updatedAt: cfg.updatedAt > 0 ? cfg.updatedAt : now
                });
            }
            case 'followList':
                return buildFakeResponse({
                    studentOid: cfg.oid,
                    total: 0,
                    count: 0,
                    list: [],
                    data: [],
                    records: [],
                    rows: [],
                    items: [],
                    page: 1,
                    pageSize: 20,
                    hasMore: false
                });
            case 'commentList':
                return buildFakeResponse({
                    total: 0,
                    count: 0,
                    list: [],
                    data: [],
                    records: [],
                    rows: [],
                    items: [],
                    page: 1,
                    pageSize: 20,
                    hasMore: false
                });
            case 'creatorScore':
                return buildCreatorScore(cfg);
            case 'feedList':
                return buildFakeResponse({
                    studentOid: cfg.oid,
                    total: 0,
                    count: 0,
                    list: [],
                    data: [],
                    records: [],
                    rows: [],
                    items: [],
                    feeds: [],
                    dynamics: [],
                    page: 1,
                    pageSize: 20,
                    hasMore: false
                });
            default:
                return null;
        }
    }

    XHR.open = function (method, url, ...rest) {
        const cfg = getConfig();
        if (cfg && cfg.oid) {
            const rule = matchRule(url);
            if (rule) {
                const fake = buildFakeBody(rule, cfg);
                if (fake) {
                    return _open.call(this, method, 'data:application/json,' + JSON.stringify(fake));
                }
            }
        }
        return _open.apply(this, arguments);
    };

    if (typeof _fetch === 'function') {
        window.fetch = function (input, init) {
            const cfg = getConfig();
            if (cfg && cfg.oid) {
                const url = typeof input === 'string' ? input : (input && input.url);
                const rule = matchRule(url);
                if (rule) {
                    const fake = buildFakeBody(rule, cfg);
                    if (fake) {
                        try {
                            return Promise.resolve(new Response(JSON.stringify(fake), {
                                status: 200,
                                statusText: 'OK',
                                headers: { 'Content-Type': 'application/json' }
                            }));
                        } catch (e) {}
                    }
                }
            }
            return _fetch.apply(this, arguments);
        };
    }

    (function setupBuddyTextReplacer() {
        if (window.__csrt_buddy_text_replacer__) return;
        window.__csrt_buddy_text_replacer__ = true;

        function getRules() {
            const cfg = getConfig();
            const displayName = (cfg && (cfg.name || cfg.id)) || '110200';
            const followingTo = (cfg && cfg.emptyFollowingText) || ('你关注了 ' + displayName);
            const fansTo = (cfg && cfg.emptyFansText) || (displayName + ' 关注了你');

            return [
                { from: '你还没有关注其他人', to: followingTo },
                { from: '你还没有关注任何人', to: followingTo },
                { from: '还没有关注其他人', to: followingTo },
                { from: '还没有关注任何人', to: followingTo },
                { from: '暂无关注', to: followingTo },
                { from: '你还没有粉丝', to: fansTo },
                { from: '还没有粉丝', to: fansTo },
                { from: '暂无粉丝', to: fansTo }
            ];
        }

        function replaceTextInNode(node, rules) {
            if (!node) return;
            if (node.nodeType === 3) {
                let text = node.nodeValue;
                if (!text) return;
                let changed = false;
                for (let i = 0; i < rules.length; i++) {
                    const rule = rules[i];
                    if (text.indexOf(rule.from) !== -1) {
                        text = text.split(rule.from).join(rule.to);
                        changed = true;
                    }
                }
                if (changed) node.nodeValue = text;
                return;
            }
            if (node.nodeType !== 1) return;
            if (node.childNodes.length === 0) return;
            for (let i = 0; i < node.childNodes.length; i++) {
                replaceTextInNode(node.childNodes[i], rules);
            }
        }

        function scanAll() {
            try {
                if (!document.body) return;
                replaceTextInNode(document.body, getRules());
            } catch (e) {}
        }

        const observer = new MutationObserver((records) => {
            const rules = getRules();
            for (let i = 0; i < records.length; i++) {
                const rec = records[i];
                if (rec.type === 'childList') {
                    for (let j = 0; j < rec.addedNodes.length; j++) {
                        replaceTextInNode(rec.addedNodes[j], rules);
                    }
                } else if (rec.type === 'characterData') {
                    replaceTextInNode(rec.target, rules);
                }
            }
        });

        function startObserve() {
            if (!document.body) {
                document.addEventListener('DOMContentLoaded', startObserve, { once: true });
                return;
            }
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
            scanAll();
        }

        startObserve();
    })();

    const cfg = getConfig();
    if (cfg && cfg.oid) {
        GM_registerMenuCommand(`切换身份（当前: ${cfg.profileName || '默认'} / id: ${cfg.id || '未知'}）`, changeIdentity);
        GM_registerMenuCommand('修改完整伪装配置', editFullProfile);
        GM_registerMenuCommand('快速修改单项', quickEdit);
        GM_registerMenuCommand('查看当前配置', showConfig);
        GM_registerMenuCommand('切换已保存的身份', listProfiles);
        GM_registerMenuCommand('将当前身份另存为新配置', saveCurrentAsNewProfile);
        GM_registerMenuCommand('关闭伪装', () => {
            if (confirm('确定要关闭伪装吗？')) {
                GM_deleteValue(CONFIG_KEY);
                GM_deleteValue('身份');
                try { document.cookie = 'cookie-user-id=; path=/; max-age=0'; } catch (e) {}
                location.reload();
            }
        });
    } else {
        GM_registerMenuCommand('切换身份（未开启）', changeIdentity);
        GM_registerMenuCommand('切换已保存的身份', listProfiles);
    }

    GM_registerMenuCommand('修复掉登录的 bug', repairLogin);

})();
