let id = location.href.split("/").pop().split("?").shift();
let inputNum = prompt("请输入要刷取的数量：");
const max = parseInt(inputNum);
if(isNaN(max) || max <= 0) {
  alert("输入无效");
} else {
  let count = 0;
  const concurrent = 8;

  const uaList = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
  ];

  function getRandomHeaders(){
    const ua = uaList[Math.floor(Math.random()*uaList.length)];
    return {
      "content-type": "application/json",
      "User-Agent": ua,
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Sec-Ch-Ua": `"Chromium";v="124", "Chrome";v="124", "Not-A.Brand";v="99"`,
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": ua.includes("Mac") ? `"macOS"` : `"Windows"`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin"
    };
  }

  async function req() {
    while(count < max) {
      fetch("https://community-web.ccw.site/creation_stats/view", {
        method: "POST",
        headers: getRandomHeaders(),
        body: `{"oid":"${id}"}`
      }).then(res=>{
        if(res.ok) count++;
      }).catch(()=>{});
      await new Promise(r=>setTimeout(r,20));
    }
  }

  for(let i=0;i<concurrent;i++) req();
}
alert(`刷取完成，刷新可查看结果`);
