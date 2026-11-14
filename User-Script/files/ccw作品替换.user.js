// ==UserScript==
// @name         作品替换器
// @version      1.0.4
// @description  访问别人作品时替换作品源码，替换后的作品不会上传，只对自己有效
// @match        https://*.ccw.site/*
// @author       不想上学
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==
(async()=>{var s,e=GM_getValue("作品替换_meta");function r(e,t,n){e[t]&&(e[t]=n(e[t]))}s="作品替换";let a=new Promise((e,t)=>{try{var n=GM_getValue(s+"_meta");if(n){let t="";for(let e=0;e<n.totalChunks;e++)t+=GM_getValue(s+"_chunk_"+e,"");var r=atob(t),a=[];for(let e=0;e<r.length;e+=512){var o=r.slice(e,e+512),i=new Array(o.length);for(let e=0;e<o.length;e++)i[e]=o.charCodeAt(e);a.push(new Uint8Array(i))}e(new Blob(a,{type:n.type}))}else t(new Error("No data found"))}catch(e){t(e)}}),o;r(XMLHttpRequest.prototype,"open",n=>function(e,t){return GM_getValue("作品替换_meta")&&(t.startsWith("https://community-web.ccw.site/creation/detail")&&r(this,"send",t=>function(e){return r(this,"onreadystatechange",e=>async function(){if(4===this.readyState)try{var t=JSON.parse(this.response);n=t,(a=await a)&&(o=URL.createObjectURL(a),n.body.latestProjectLink=o,n.body.creationRelease&&(n.body.creationRelease.projectLink=o),n.body.requireLogin=!1,n.body.forEveryone=!0,n.body.status="PUBLISHED",n.body.isOpenSource=!0,n.body.sourceOpenLevel="PUBLIC",n.body.creationReleaseList.unshift({checked:!1,coverGifLink:null,coverLink:n.body.latestCoverLink,createdAt:Date.now(),customVersion:"已替换",description:null,extensions:[],hasCloudVariables:!1,keyboardLayout:"TOUCH",oid:n.body.oid,operatingInstruction:null,profiling:null,projectLink:o,status:"PUBLISHED",submittedAt:Date.now(),tags:[],updatedAt:Date.now(),version:"已替换",videoLink:null}));let e=await n;console.log("作品已替换",e),Object.defineProperty(this,"responseText",{get:()=>JSON.stringify(e),configurable:!0}),Object.defineProperty(this,"response",{get:()=>JSON.stringify(e),configurable:!0})}catch(e){console.error("作品替换：",e)}var n;return e.apply(this,arguments)}),t.apply(this,arguments)}),o)&&t.includes(o)&&(t=o),n.apply(this,arguments)}),GM_registerMenuCommand(e?"已替换":"替换作品",()=>{var i,s;i=".sb3,.sb2,.zip",s="sb3",new Promise(n=>{let t=document.createElement("div"),r=(t.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `,t.addEventListener("click",e=>{e.target===t&&(a(),n(""))}),document.createElement("button")),e=(r.style.cssText=`
      background: white;
      padding: 24px 32px;
      border-radius: 12px;
      border: 4px dashed #888;
      cursor: pointer;
      font-size: 16px;
      text-align: center;
      min-width: 300px;
    `,document.createElement("input")),a=(e.type="file",e.accept=i,e.style.display="none",r.innerHTML=`
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
        选择或拖入文件
      </div>
      <div style="color: #666;">
        上传${s}文件
      </div>
    `,r.addEventListener("click",()=>e.click()),r.addEventListener("dragover",e=>{e.dataTransfer.types.includes("Files")&&(e.preventDefault(),e.dataTransfer.dropEffect="copy",r.style.borderColor="#03a9fc")}),r.addEventListener("dragleave",()=>{r.style.borderColor="#888"}),r.addEventListener("drop",e=>{var t=e.dataTransfer.files[0];t&&(e.preventDefault(),n(t))}),e.addEventListener("change",e=>{e=e.target.files[0];e&&n(e)}),t.appendChild(r),t.appendChild(e),document.body.appendChild(t),()=>{document.body.removeChild(t)}),o=e=>{"Escape"===e.key&&(a(),n(""),document.removeEventListener("keydown",o))};document.addEventListener("keydown",o)}).then(async e=>{var o,i,s;o="作品替换",i=e,s=102400,await new Promise((r,a)=>{var e=new FileReader;e.onload=function(e){try{var t=e.target.result.split(",")[1],n=[];for(let e=0;e<t.length;e+=s)n.push(t.slice(e,e+s));GM_setValue(o+"_meta",{totalChunks:n.length,size:i.size,type:i.type}),n.forEach((e,t)=>{GM_setValue(o+"_chunk_"+t,e)}),r(n.length)}catch(e){a(e)}},e.readAsDataURL(i)}),alert("刷新页面生效")})}),e&&("array"==typeof e&&(GM_deleteValue("作品替换_meta"),location.reload(!0)),GM_registerMenuCommand("还原",()=>GM_deleteValue("作品替换_meta")))})();