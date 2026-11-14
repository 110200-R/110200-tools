(function () {
    var a = window['location']['href']
        ['split']('/')['pop']()
        ['split']('?')['shift']();

    if (!a) {
        alert("未获取到作品ID");
        return;
    }

    console.log("作品ID:", a);

    var b = prompt("请求次数:", "10");
    if (b === null) return;

    var c = parseInt(b);
    if (isNaN(c) || c <= 0) {
        alert("请输入正整数");
        return;
    }

    var e = 0;
    var f = [];

    var g = setInterval(function () {
        e++;

        if (e > c) {
            clearInterval(g);
            Promise.all(f).then(function (h) {
                alert("完成 " + c + " 次请求");
            });
            return;
        }

        f.push(
            fetch("https://community-web.ccw.site/creation_stats/view", {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({ oid: a })
            })
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    console.log("第" + e + "次:", d);
                })
                .catch(function (err) {
                    console.error("第" + e + "次失败:", err);
                })
        );
    }, 100);
})();