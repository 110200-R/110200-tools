(function (_0x355e6b) {
  const {
    ArgumentType: _0x289a08,
    BlockType: _0xd882e9,
    Cast: _0x9d6c72,
    translate: _0x86b0e6,
    extensions: _0x4cc0c8,
    runtime: _0x326829
  } = _0x355e6b;
  _0x86b0e6.setup({
    zh: {
      extensionName: "gandilocker",
      setPasscodeBlock: "设置访问码 [PASSCODE]",
      lockWithPasscodeBlock: "打开协作时锁屏(带访问码)[TITLE_TEXT]",
      lockNoPasscodeBlock: "打开协作时锁屏[TITLE_TEXT]"
    },
    en: {
      extensionName: "gandilocker",
      setPasscodeBlock: "set access code [PASSCODE]",
      lockWithPasscodeBlock: "lock on project load(with passcode)[TITLE_TEXT]",
      lockNoPasscodeBlock: "lock on project load[TITLE_TEXT]"
    }
  });
  const _0xd307fd = "gandilocker_settings";
  function _0x3f0bba() {
    try {
      const _0x23c431 = localStorage.getItem(_0xd307fd);
      if (_0x23c431) {
        return JSON.parse(_0x23c431);
      }
    } catch (_0x2ecd4a) {}
    return {
      passcode: "",
      requirePass: false,
      title: "作品已锁定"
    };
  }
  function _0xbeb8c4(_0x1445b4, _0x7c160f, _0x44238c) {
    try {
      const _0x314954 = {
        passcode: _0x1445b4,
        requirePass: _0x7c160f,
        title: _0x44238c
      };
      const _0x316f84 = btoa(encodeURIComponent(JSON.stringify(_0x314954)));
      localStorage.setItem(_0xd307fd, _0x316f84);
    } catch (_0x2d2f78) {}
  }
  function _0x1e3019(_0x501efa) {
    try {
      return JSON.parse(decodeURIComponent(atob(_0x501efa)));
    } catch (_0x5cd812) {
      return null;
    }
  }
  class _0x892c12 {
    constructor() {
      const _0x27f5be = localStorage.getItem(_0xd307fd);
      let _0x522846;
      if (_0x27f5be) {
        _0x522846 = _0x1e3019(_0x27f5be);
        if (!_0x522846) {
          _0x522846 = _0x3f0bba();
        }
      } else {
        _0x522846 = _0x3f0bba();
      }
      this._storedPasscode = _0x522846.passcode || "";
      this._lockRequirePass = _0x522846.requirePass || false;
      this._lockTitle = _0x522846.title || "作品已锁定";
      this._isValidated = false;
      this._observer = null;
      this._devToolsCheckInterval = null;
      this._extensionCheckInterval = null;
      this._preventClose = true;
      this._disableDevTools();
      this._disableKeyboardShortcuts();
      this._preventPageClose();
      this._detectExtensions();
      _0x355e6b.vm.runtime.once("PROJECT_LOADED", () => {
        this._createLockScreen();
      });
    }
    _disableDevTools() {
      document.onkeydown = _0x33b47b => {
        if (_0x33b47b.key === "F12" || _0x33b47b.ctrlKey && _0x33b47b.shiftKey && (_0x33b47b.key === "I" || _0x33b47b.key === "J" || _0x33b47b.key === "C") || _0x33b47b.ctrlKey && _0x33b47b.key === "U") {
          _0x33b47b.preventDefault();
          _0x33b47b.stopPropagation();
          return false;
        }
      };
      document.oncontextmenu = _0x1d5fe5 => {
        _0x1d5fe5.preventDefault();
        _0x1d5fe5.stopPropagation();
        return false;
      };
      const _0x475cd2 = () => {
        const _0x2c1943 = 160;
        const _0x292c73 = window.outerWidth - window.innerWidth > _0x2c1943;
        const _0x17b1ee = window.outerHeight - window.innerHeight > _0x2c1943;
        if (_0x292c73 || _0x17b1ee) {
          this._showDevToolsWarning();
        }
      };
      this._devToolsCheckInterval = setInterval(_0x475cd2, 1000);
    }
    _showDevToolsWarning() {
      document.body.innerHTML = "";
      const _0x1d17e2 = document.createElement("div");
      _0x1d17e2.textContent = "想用开发者工具？想得美";
      _0x1d17e2.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;color:#ff2222;background:#000;padding:30px 50px;border:3px solid #ff2222;border-radius:15px;font-family:\"Courier New\",monospace;text-shadow:0 0 15px #ff2222;letter-spacing:3px;";
      document.body.appendChild(_0x1d17e2);
      setTimeout(() => {
        window.location.href = "about:blank";
      }, 2000);
    }
    _detectExtensions() {
      const _0x39e39c = () => {
        const _0x3f8975 = ["Tampermonkey", "Violentmonkey", "Greasemonkey", "AdBlock", "uBlock", "Adblock Plus", "React Developer Tools", "Vue.js devtools", "Redux DevTools", "Angular DevTools", "Web Developer", "Firebug", "Lightshot", "Evernote Web Clipper"];
        for (const _0x5eb212 of _0x3f8975) {
          if (this._checkExtensionByName(_0x5eb212)) {
            this._showExtensionWarning(_0x5eb212);
            return;
          }
        }
        if (this._checkCommonExtensionSignatures()) {
          this._showExtensionWarning("浏览器扩展");
        }
      };
      this._extensionCheckInterval = setInterval(_0x39e39c, 2000);
      setTimeout(_0x39e39c, 3000);
    }
    _checkExtensionByName(_0x2c3d05) {
      const _0x3d72ac = _0x2c3d05.toLowerCase();
      if (_0x3d72ac.includes("tampermonkey") || _0x3d72ac.includes("violentmonkey") || _0x3d72ac.includes("greasemonkey")) {
        if (window.Tampermonkey || window.Violentmonkey || window.Greasemonkey) {
          return true;
        }
        if (window.chrome && window.chrome.runtime && window.chrome.runtime.getURL) {
          try {
            const _0x507ae3 = window.chrome.runtime.getURL("");
            if (_0x507ae3.includes("tampermonkey") || _0x507ae3.includes("violentmonkey") || _0x507ae3.includes("greasemonkey")) {
              return true;
            }
          } catch (_0x29ed92) {}
        }
      }
      if (document.querySelector("[data-tampermonkey-extension]") || document.querySelector("[data-violentmonkey-extension]") || document.querySelector("[data-greasemonkey-extension]")) {
        return true;
      }
      return false;
    }
    _checkCommonExtensionSignatures() {
      const _0x12b738 = document.querySelectorAll("*");
      for (const _0x29728e of _0x12b738) {
        const _0x13e37e = _0x29728e.attributes;
        for (let _0x5b3284 = 0; _0x5b3284 < _0x13e37e.length; _0x5b3284++) {
          const _0x4ba402 = _0x13e37e[_0x5b3284].name.toLowerCase();
          if (_0x4ba402.includes("tampermonkey") || _0x4ba402.includes("violentmonkey") || _0x4ba402.includes("greasemonkey") || _0x4ba402.includes("extension")) {
            return true;
          }
        }
      }
      if (window.__TAMPERMONKEY__ || window.__VIOLENTMONKEY__ || window.__GREASEMONKEY__) {
        return true;
      }
      return false;
    }
    _showExtensionWarning(_0x13bb7c) {
      document.body.innerHTML = "";
      const _0x32feea = document.createElement("div");
      _0x32feea.innerHTML = "检测到 " + _0x13bb7c + "！<br>请禁用所有扩展后重试。";
      _0x32feea.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;color:#ff2222;background:#000;padding:30px 50px;border:3px solid #ff2222;border-radius:15px;font-family:\"Courier New\",monospace;text-shadow:0 0 15px #ff2222;text-align:center;line-height:1.6;";
      document.body.appendChild(_0x32feea);
      setTimeout(() => {
        window.location.href = "about:blank";
      }, 3000);
      clearInterval(this._extensionCheckInterval);
    }
    _disableKeyboardShortcuts() {
      window.addEventListener("keydown", _0x22a64b => {
        if (_0x22a64b.key === "F12" || _0x22a64b.ctrlKey && _0x22a64b.shiftKey && (_0x22a64b.key === "I" || _0x22a64b.key === "J" || _0x22a64b.key === "C") || _0x22a64b.ctrlKey && _0x22a64b.key === "U" || _0x22a64b.ctrlKey && _0x22a64b.key === "S" || _0x22a64b.ctrlKey && _0x22a64b.key === "P") {
          _0x22a64b.preventDefault();
          _0x22a64b.stopPropagation();
          return false;
        }
      }, true);
    }
    _preventPageClose() {
      window.addEventListener("beforeunload", _0x15475c => {
        if (!this._isValidated && this._preventClose) {
          _0x15475c.preventDefault();
          _0x15475c.returnValue = "作品已锁定";
          return "作品已锁定";
        }
      });
    }
    _createLockScreen() {
      const _0x2cf89a = document.createElement("div");
      _0x2cf89a.id = "gandilocker-overlay";
      _0x2cf89a.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;color:#39ff14;font-family:\"Courier New\",monospace;z-index:2147483647;display:flex;flex-direction:column;justify-content:center;align-items:center;";
      const _0x50ede9 = document.createElement("h1");
      _0x50ede9.innerText = this._lockTitle;
      _0x50ede9.style.cssText = "margin:0 0 30px 0;font-size:32px;letter-spacing:6px;text-shadow:0 0 10px #39ff14;font-weight:normal;";
      _0x2cf89a.appendChild(_0x50ede9);
      if (this._lockRequirePass) {
        const _0x490844 = document.createElement("div");
        _0x490844.innerText = "> ENTER ACCESS CODE:";
        _0x490844.style.cssText = "font-size:18px;margin-bottom:15px;";
        _0x2cf89a.appendChild(_0x490844);
        const _0x33b26e = document.createElement("input");
        _0x33b26e.type = "password";
        _0x33b26e.style.cssText = "background:#000;border:1px solid #39ff14;color:#39ff14;font-family:\"Courier New\",monospace;font-size:20px;padding:10px 15px;outline:none;text-shadow:0 0 5px #39ff14;width:250px;";
        _0x2cf89a.appendChild(_0x33b26e);
        const _0x47b508 = document.createElement("div");
        _0x47b508.innerText = "press ENTER to submit";
        _0x47b508.style.cssText = "margin-top:20px;font-size:14px;color:#39ff14;";
        _0x2cf89a.appendChild(_0x47b508);
        setTimeout(() => _0x33b26e.focus(), 100);
        _0x33b26e.addEventListener("keydown", _0x332238 => {
          if (_0x332238.key === "Enter") {
            const _0x1d05c7 = _0x33b26e.value;
            if (_0x1d05c7 === this._storedPasscode) {
              this._isValidated = true;
              this._preventClose = false;
              clearInterval(this._devToolsCheckInterval);
              clearInterval(this._extensionCheckInterval);
              _0x2cf89a.remove();
            } else {
              _0x33b26e.value = "";
              _0x47b508.innerText = "> ACCESS DENIED!";
              _0x47b508.style.color = "#ff2222";
              setTimeout(() => {
                _0x47b508.innerText = "press ENTER to submit";
                _0x47b508.style.color = "#39ff14";
              }, 1500);
            }
          }
        });
      }
      const _0x13ebec = document.createElement("div");
      _0x13ebec.innerText = "made by ahd";
      _0x13ebec.style.cssText = "position:absolute;bottom:20px;right:25px;font-size:12px;opacity:0.6;color:#39ff14;";
      _0x2cf89a.appendChild(_0x13ebec);
      _0x2cf89a.oncontextmenu = _0x47da0e => {
        _0x47da0e.preventDefault();
        _0x47da0e.stopPropagation();
        return false;
      };
      this._observer = new MutationObserver(_0x4a06c0 => {
        for (const _0x2efda3 of _0x4a06c0) {
          for (const _0x41e505 of _0x2efda3.removedNodes) {
            if (_0x41e505 === _0x2cf89a && !this._isValidated) {
              this._destroyPage();
              return;
            }
          }
        }
      });
      this._observer.observe(document.body, {
        childList: true,
        subtree: true,
        childList: true
      });
      document.body.appendChild(_0x2cf89a);
    }
    _destroyPage() {
      document.body.innerHTML = "";
      const _0x38aa6e = document.createElement("div");
      _0x38aa6e.textContent = "使用开发者工具？想得美";
      _0x38aa6e.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;color:#39ff14;background:#000;padding:20px;border:2px solid #39ff14;border-radius:10px;font-family:\"Courier New\",monospace;text-shadow:0 0 10px #39ff14;";
      document.body.appendChild(_0x38aa6e);
      if (this._observer) {
        this._observer.disconnect();
      }
      clearInterval(this._devToolsCheckInterval);
      clearInterval(this._extensionCheckInterval);
      setTimeout(() => {
        window.location.href = "about:blank";
      }, 1000);
    }
    getInfo() {
      const _0x486cdf = {
        type: _0x289a08.STRING,
        defaultValue: ""
      };
      const _0x150598 = {
        PASSCODE: _0x486cdf
      };
      const _0x2b42fd = {
        opcode: "setAccessCode",
        blockType: _0xd882e9.COMMAND,
        text: _0x86b0e6({
          id: "setPasscodeBlock"
        }),
        arguments: _0x150598
      };
      const _0x5b8337 = {
        opcode: "lockOnLoadWithPass",
        blockType: _0xd882e9.COMMAND,
        text: _0x86b0e6({
          id: "lockWithPasscodeBlock"
        }),
        arguments: {
          TITLE_TEXT: {
            type: _0x289a08.STRING,
            defaultValue: "作品已锁定"
          }
        }
      };
      const _0x562ca2 = {
        opcode: "lockOnLoadNoPass",
        blockType: _0xd882e9.COMMAND,
        text: _0x86b0e6({
          id: "lockNoPasscodeBlock"
        }),
        arguments: {
          TITLE_TEXT: {
            type: _0x289a08.STRING,
            defaultValue: "作品已锁定"
          }
        }
      };
      return {
        id: "gandilocker",
        color1: "#000000",
        color2: "#39ff14",
        color3: "#39ff14",
        name: _0x86b0e6({
          id: "extensionName"
        }),
        blocks: [_0x2b42fd, _0x5b8337, _0x562ca2],
        menus: {}
      };
    }
    setAccessCode(_0x2b6c36) {
      this._storedPasscode = _0x9d6c72.toString(_0x2b6c36.PASSCODE);
      this._lockRequirePass = true;
      _0xbeb8c4(this._storedPasscode, this._lockRequirePass, this._lockTitle);
    }
    lockOnLoadWithPass(_0x369ef4) {
      this._lockRequirePass = true;
      this._lockTitle = _0x9d6c72.toString(_0x369ef4.TITLE_TEXT);
      _0xbeb8c4(this._storedPasscode, this._lockRequirePass, this._lockTitle);
    }
    lockOnLoadNoPass(_0x410364) {
      this._lockRequirePass = false;
      this._lockTitle = _0x9d6c72.toString(_0x410364.TITLE_TEXT);
      _0xbeb8c4(this._storedPasscode, this._lockRequirePass, this._lockTitle);
    }
  }
  _0x4cc0c8.register(new _0x892c12());
})(Scratch);