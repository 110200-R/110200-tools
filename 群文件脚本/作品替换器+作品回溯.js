// ==UserScript==
// @name         作品替换器
// @version      2.0.1
// @description  在访问作品页和编辑器时替换作品源码，替换作品只对自己有效
// @match        https://*.ccw.site/*
// @author       不想上学
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==
const v = "2.0.1";
(()=>{function S(e,t,o=1024*100){return new Promise((n,r)=>{let i=new FileReader;i.onload=function(d){try{let c=d.target.result.split(",")[1],s=[];for(let l=0;l<c.length;l+=o)s.push(c.slice(l,l+o));GM_setValue(e+"_meta",{totalChunks:s.length,size:t.size,type:t.type}),s.forEach((l,f)=>{GM_setValue(e+"_chunk_"+f,l)}),n(s.length)}catch(c){r(c)}},i.readAsDataURL(t)})}function B(e){return new Promise((t,o)=>{try{let n=GM_getValue(e+"_meta");if(!n){o(new Error("No data found"));return}let r="";for(let c=0;c<n.totalChunks;c++)r+=GM_getValue(e+"_chunk_"+c,"");let i=atob(r),d=[];for(let c=0;c<i.length;c+=512){let s=i.slice(c,c+512),l=new Array(s.length);for(let f=0;f<s.length;f++)l[f]=s.charCodeAt(f);d.push(new Uint8Array(l))}t(new Blob(d,{type:n.type}))}catch(n){o(n)}})}function E(e){try{let t=GM_getValue(e+"_meta");if(!t)return console.warn(`No data found for key: ${e}`),!1;for(let o=0;o<t.totalChunks;o++)GM_deleteValue(e+"_chunk_"+o);return GM_deleteValue(e+"_meta"),console.log(`Successfully cleared blob data for key: ${e}`),!0}catch(t){return console.error(`Failed to clear blob data for key: ${e}`,t),!1}}function k(e){return new Promise((t,o)=>{let n=new FileReader;n.onloadend=()=>{if(n.readyState===FileReader.DONE){let r=n.result,i=new Uint8Array(r);t(i)}},n.onerror=o,n.readAsArrayBuffer(e)})}var y=(e="",t="sb3")=>new Promise(o=>{let n=document.createElement("div");n.style.cssText=`
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
    `,n.addEventListener("click",s=>{s.target===n&&(d(),o(""))});let r=document.createElement("button");r.style.cssText=`
      background: white;
      padding: 24px 32px;
      border-radius: 12px;
      border: 4px dashed #888;
      cursor: pointer;
      font-size: 16px;
      text-align: center;
      min-width: 300px;
    `;let i=document.createElement("input");i.type="file",i.accept=e,i.style.display="none",r.innerHTML=`
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
        选择或拖入文件
      </div>
      <div style="color: #666;">
        上传${t}文件
      </div>
    `,r.addEventListener("click",()=>i.click()),r.addEventListener("dragover",s=>{s.dataTransfer.types.includes("Files")&&(s.preventDefault(),s.dataTransfer.dropEffect="copy",r.style.borderColor="#03a9fc")}),r.addEventListener("dragleave",()=>{r.style.borderColor="#888"}),r.addEventListener("drop",s=>{let l=s.dataTransfer.files[0];l&&(s.preventDefault(),d(),o(l))}),i.addEventListener("change",s=>{d();let l=s.target.files[0];l&&o(l)}),n.appendChild(r),n.appendChild(i),document.body.appendChild(n);let d=()=>{document.body.removeChild(n)},c=s=>{s.key==="Escape"&&(d(),o(null),document.removeEventListener("keydown",c))};document.addEventListener("keydown",c)});function P(e,t="请选择",o=""){return new Promise(n=>{let r=document.createElement("div");r.style.cssText=`
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        `;let i=document.createElement("div");i.style.cssText=`
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          min-width: 260px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;let d=document.createElement("h3");d.textContent=t,d.style.marginTop="0",i.appendChild(d);let c=document.createElement("select");c.style.width="100%",c.style.padding="6px",c.style.marginTop="15px",e.forEach(([F,M])=>{let b=document.createElement("option");b.textContent=F,b.value=M,M===o&&(b.selected=!0),c.appendChild(b)}),i.appendChild(c);let s=document.createElement("div");s.style.cssText=`
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        `;let l=`
          padding: 6px 16px;
          font-size: 14px;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        `,f=document.createElement("button");f.textContent="取消",f.style.cssText=`
          ${l}
          background: #f5f5f5;
          color: #333;
          border-color: #d9d9d9;
        `,f.onmouseover=()=>f.style.background="#e6e6e6",f.onmouseout=()=>f.style.background="#f5f5f5";let p=document.createElement("button");p.textContent="确定",p.style.cssText=`
          ${l}
          background: #1677ff;
          color: #fff;
          border-color: #1677ff;
        `,p.onmouseover=()=>p.style.background="#0958d9",p.onmouseout=()=>p.style.background="#1677ff",s.appendChild(f),s.appendChild(p),i.appendChild(s),r.appendChild(i),document.body.appendChild(r),f.onclick=()=>{document.body.removeChild(r),n(null)},p.onclick=()=>{document.body.removeChild(r),n(c.value)}})}var R={getVM:!0,mode:"xhr"};var a=GM_getValue("作品替换");function x(){return GM_setValue("作品替换",a)}(!a||typeof a!="object"||a instanceof Array)&&(a=R,x());function h(e,t,o){e[t]&&(e[t]=o(e[t]))}var G=GM_getValue("作品替换_meta")&&B("作品替换"),L=()=>a.mode&&G?G:y(".sb3,.sb2,.zip");var H=XMLHttpRequest.prototype,g,O;async function N(e){let{body:t}=e,{changeVersion:o}=O;if(t.requireLogin=!1,t.forEveryone=!0,t.status="PUBLISHED",t.isOpenSource=!0,t.sourceOpenLevel="PUBLIC",o){let n=t.creationRelease.version,r,i=t.creationReleaseList.map((s,l)=>(!r&&s.version==n&&(r=l),[s.customVersion?`${s.version} (${s.customVersion})`:s.version,l])),d=await P(i,"选择要加载的作品版本",r);if(!d)return console.warn("作品替换器","用户取消选择版本"),e;let c=t.creationReleaseList[Number(d)];t.creationRelease=c,t.latestProjectLink=c.projectLink,t.latestCoverLink=c.coverLink}else{if(blob=await L(),!blob)return console.warn("作品替换器","拦截xhr替换失败，blob为空"),e;g=URL.createObjectURL(blob),t.latestProjectLink=g,t.creationRelease&&(t.creationRelease.projectLink=g),t.sourceOpenLevel="PUBLIC",t.creationReleaseList.unshift({checked:!1,coverGifLink:null,coverLink:t.latestCoverLink,createdAt:Date.now(),customVersion:"已替换",description:null,extensions:[],hasCloudVariables:!1,keyboardLayout:"TOUCH",oid:t.oid,operatingInstruction:null,profiling:null,projectLink:g,status:"PUBLISHED",submittedAt:Date.now(),tags:[],updatedAt:Date.now(),version:"已替换",videoLink:null})}return e}var I=e=>function(t){return h(this,"onreadystatechange",o=>async function(){if(this.readyState===4)try{let n=JSON.parse(this.response),r=await N(n);console.log("作品已替换","通过拦截xhr",r),Object.defineProperty(this,"responseText",{get:()=>JSON.stringify(r),configurable:!0}),Object.defineProperty(this,"response",{get:()=>JSON.stringify(r),configurable:!0})}catch(n){console.error("作品替换：",n)}return o.apply(this,arguments)}),e.apply(this,arguments)};function T(e,t){let{changeVersion:o}=O=t;h(H,"open",n=>function(r,i){return i.startsWith("https://community-web.ccw.site/creation/detail")&&h(this,"send",I),(!o&&g&&i.includes(g)||i.endsWith(".sb3"))&&(i=g,e(i)),n.apply(this,arguments)})}function z(e=15e3){return new Promise((t,o)=>{trapViaBindReject=o,setTimeout(()=>o(new Error("Timeout")),e),h(Function.prototype,"bind",n=>function(r,...i){return(r==null?void 0:r.editingTarget)!==void 0&&(r==null?void 0:r.runtime)!==void 0?(Function.prototype.bind=n,t(r),n.call(this,r,...i)):n.call(this,r,...i)})})}if(!(function(){try{return typeof arguments.callee=="function"}catch(e){return console.error(e),!1}})()){let e="作品替换器不支持当前JavaScript环境，可尝试更新 篡改猴/暴力猴 的版本（推荐使用暴力猴）";throw alert(e),e}var w,C,D,W=!1;async function A(){var t;let e=window.vm??unsafeWindow.vm??((t=window.eureka)==null?void 0:t.vm)??w??await C;if(!w)throw"vm不存在，需要开启获取vm或者安装其他获取vm脚本";return w}a.mode=="xhr"&&T(()=>W=!0,{changeVersion:a.changeVersion});var $;a.getVM&&((w=window.vm??unsafeWindow.vm??(($=window.eureka)==null?void 0:$.vm))&&(C=Promise.resolve(w)),C=z().then(e=>w=e),a.mode=="load"&&C.then(e=>{h(e,"loadProject",t=>(D=t.bind(e),async function(o,...n){let r=await L();if(r){let i=await k(r);return console.log("作品已替换","通过拦截vm.loadProject"),t.call(e,i,...n)}else return console.warn("作品替换器","拦截vm.loadProject替换失败，blob为空"),t.apply(this,arguments)}))}));var m=" ",V=[{text:GM_getValue("作品替换_meta")?"重新上传作品文件":"上传作品文件",fn:_},{text:a.mode=="xhr"?"[✓] 拦截xhr (当前替换模式)":`[${m}] 拦截xhr`,async fn(){a.mode=="xhr"?(a.mode="",u(1,`[${m}] 拦截xhr`,arguments.callee)):(a.mode="xhr",u(1,"[✓] 拦截xhr (当前替换模式)",arguments.callee),u(2,`[${m}] 拦截loadProject`)),x()}},{text:a.mode=="load"?"[✓] 拦截loadProject (当前替换模式)":`[${m}] 拦截loadProject`,async fn(){a.mode=="load"?(a.mode="",u(2,`[${m}] 拦截loadProject`,arguments.callee)):(a.mode="load",u(2,"[✓] 拦截loadProject (当前替换模式)",arguments.callee),u(1,`[${m}] 拦截xhr`),a.getVM||(a.getVM=!0,u(3,"[✓] 获取vm"))),x()}},{text:a.getVM?"[✓] 获取vm":`[${m}] 获取vm`,async fn(){a.getVM?(a.mode=="load"&&(a.mode="",u(2,`[${m}] 拦截loadProject`)),a.getVM=!1,u(3,`[${m}] 获取vm`,arguments.callee)):(a.getVM=!0,u(3,"[✓] 获取vm",arguments.callee)),x()}},{text:"替换作品但不刷新页面(可能会出现问题)",async fn(){u(4,"正在替换",arguments.callee);try{let e=await A(),t=await y(".sb3,.sb2,.zip");if(t){let o=await k(t);await(D??e.loadProject.bind(e))(o),alert("已替换")}}catch(e){console.error(e),alert(e)}u(4,"替换作品但不刷新页面(可能会出现问题)",arguments.callee)}},{text:"插入角色",async fn(){u(5,"正在插入",arguments.callee);try{let e=await A(),t=await y(".sprite3,.sprite2,.zip","sprite3");if(t){let o=await k(t);await e.addSprite(o),alert("已插入")}}catch(e){console.error(e),alert(e)}u(5,"插入角色",arguments.callee)}},{text:a.changeVersion?a.mode=="xhr"?"[✓] 作品回溯":"[?] 作品回溯":`[${m}] 作品回溯`,async fn(){a.changeVersion&&a.mode=="xhr"?(a.changeVersion=!1,u(6,`[${m}] 作品回溯`,arguments.callee)):(a.changeVersion=!0,u(6,"[✓] 作品回溯",arguments.callee),a.mode!="xhr"&&(V[1].fn(),alert("作品回溯必须使用拦截xhr模式，且开启作品回溯后会关闭作品替换"))),x()}}];GM_registerMenuCommand("说明",()=>alert(`作品替换器 v${v}
在访问作品页和编辑器时替换作品源码，替换作品只对自己有效
注意：每次 替换作品/修改替换的作品/修改替换模式/开关获取vm 都必须刷新页面后才生效。

作品替换模式：
- 拦截xhr：拦截网络请求响应，修改api返回作品信息中的作品url；部分情况可能无效，比如新建作品时，此时需要换成 拦截loadProject。
- 拦截loadProject：在Scratch VM调用vm.loadProject加载作品时替换加载的作品文件，如果要选择拦截这个模式需要同时打开获取VM；如果上传的作品被ccw加密过，会加载失败，此时需要换成 拦截xhr。

替换作品但不刷新页面：直接调用vm.loadProject加载作品，无需刷新页面，但可能会出现问题。
插入角色：把角色文件插入到作品里。
作品回溯：可以查看和切换到作品以前的版本，作品回溯必须使用拦截xhr模式，且开启作品回溯后会关闭作品替换；开启后访问作品会提示选择作品版本，选项为 "原始版本号 (自定义版本号)"，默认选择最新版本。`));for(let e of V)e.id=GM_registerMenuCommand(e.text,e.fn);function u(e,t,o){let n=V[e];if(n)return t??=n.text,o??=n.fn,n.text=t,n.fn=o,n.id=GM_registerMenuCommand(t,o,{id:n.id})}async function _(){if(GM_getValue("作品替换_meta")){E("作品替换"),u(0,"上传作品文件",_);return}let e=await y(".sb3,.sb2,.zip");return e?(await S("作品替换",e),u(0,"重新上传作品文件",_),!0):!1}})();
