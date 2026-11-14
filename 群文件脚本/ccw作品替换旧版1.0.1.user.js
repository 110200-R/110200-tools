// ==UserScript==
// @name         作品替换
// @version      1.0.1
// @description  访问别人作品时替换作品源码，只对自己有效
// @match        https://*.ccw.site/*
// @author       不想上学
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==
(()=>{function r(e,t,n){e[t]&&(e[t]=n(e[t]))}let i;function o(e){t="作品替换";var t,n=(t=GM_getValue(t,null))?(n=new Uint8Array(t.array),new Blob([n],{type:t.type})):null;return n&&(i=URL.createObjectURL(n),e.body.latestProjectLink=i,e.body.creationRelease.projectLink=i,e.body.requireLogin=!1,e.body.forEveryone=!0,e.body.status="PUBLISHED",e.body.isOpenSource=!0,e.body.sourceOpenLevel="PUBLIC",e.body.creationReleaseList.unshift({checked:!1,coverGifLink:null,coverLink:e.body.latestCoverLink,createdAt:Date.now(),customVersion:"已替换",description:null,extensions:[],hasCloudVariables:!1,keyboardLayout:"TOUCH",oid:e.body.oid,operatingInstruction:null,profiling:null,projectLink:i,status:"PUBLISHED",submittedAt:Date.now(),tags:[],updatedAt:Date.now(),version:"已替换",videoLink:null})),e}r(XMLHttpRequest.prototype,"open",n=>function(e,t){return GM_getValue("作品替换")&&(t.startsWith("https://community-web.ccw.site/creation/detail")&&r(this,"send",t=>function(e){return r(this,"onreadystatechange",e=>function(){if(4===this.readyState)try{let e=o(JSON.parse(this.response));console.log("作品已替换",e),Object.defineProperty(this,"responseText",{get:()=>JSON.stringify(e),configurable:!0}),Object.defineProperty(this,"response",{get:()=>JSON.stringify(e),configurable:!0})}catch(e){console.error("作品替换：",e)}return e.apply(this,arguments)}),t.apply(this,arguments)}),i)&&t.includes(i)&&(t=i),n.apply(this,arguments)});var e=document.createElement("input");e.type="file",e.accept=".sb3",e.addEventListener("change",e=>{e=e.target.files[0];e&&((async(e,t)=>{var n=await t.arrayBuffer(),n=new Uint8Array(n),n={array:Array.from(n),type:t.type,size:t.size};GM_setValue(e,n)})("作品替换",e),alert("刷新页面生效"))}),GM_registerMenuCommand(GM_getValue("作品替换")?"已替换":"替换作品",()=>{alert("上传sb3文件"),setTimeout(e.click.bind(e),200)}),GM_getValue("作品替换")&&GM_registerMenuCommand("还原",()=>GM_deleteValue("作品替换"))})();