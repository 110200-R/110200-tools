// ==UserScript==
// @name         Gandi Get Admin Link
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  获取编程猫协作作品链接
// @author       ahd
// @match        https://www.ccw.site/gandi/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let panel = null;
    let orb = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    function createOrb() {
        orb = document.createElement('div');
        orb.id = 'gandi-orb';
        orb.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 2147483646;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #666 0%, #333 100%);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            font-size: 20px;
            color: white;
        `;
        orb.innerHTML = '⚙';
        orb.onmouseover = () => {
            orb.style.transform = 'scale(1.1)';
            orb.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        };
        orb.onmouseout = () => {
            orb.style.transform = 'scale(1)';
            orb.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        };
        orb.onclick = () => {
            orb.style.display = 'none';
            createPanel();
        };
        document.body.appendChild(orb);
    }

    function createPanel() {
        panel = document.createElement('div');
        panel.id = 'gandi-admin-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            min-width: 300px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            cursor: move;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 12px;
            background: none;
            border: none;
            font-size: 24px;
            color: #666;
            cursor: pointer;
            line-height: 1;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
            z-index: 10;
        `;
        closeBtn.onmouseover = () => {
            closeBtn.style.background = '#f0f0f0';
            closeBtn.style.color = '#333';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'none';
            closeBtn.style.color = '#666';
        };
        closeBtn.onclick = () => {
            panel.remove();
            panel = null;
            if (orb) {
                orb.style.display = 'flex';
            } else {
                createOrb();
            }
        };
        panel.appendChild(closeBtn);

        const title = document.createElement('div');
        title.innerText = '协作工具';
        title.style.cssText = `
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 16px;
            padding-right: 30px;
        `;
        panel.appendChild(title);

        const getLinkBtn = document.createElement('button');
        getLinkBtn.innerText = '获取协作作品链接';
        getLinkBtn.style.cssText = `
            width: 100%;
            padding: 12px 20px;
            background: #333;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        getLinkBtn.onmouseover = () => {
            getLinkBtn.style.background = '#555';
            getLinkBtn.style.transform = 'translateY(-2px)';
            getLinkBtn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
        };
        getLinkBtn.onmouseout = () => {
            getLinkBtn.style.background = '#333';
            getLinkBtn.style.transform = 'translateY(0)';
            getLinkBtn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        };
        getLinkBtn.onclick = async () => {
            getLinkBtn.innerText = '获取中...';
            getLinkBtn.style.opacity = '0.7';
            getLinkBtn.disabled = true;

            try {
                const projectId = window.location.pathname.split('/').pop();
                
                const response = await fetch('https://community-web.ccw.site/creation/team_member/observer_invite_token/fetch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        creationOid: projectId
                    })
                });

                const data = await response.json();
                
                if (data.code === '200' && data.body) {
                    const inviteLink = `https://www.ccw.site/gandi/project/${projectId}?inviteToken=${data.body}`;
                    
                    const resultDiv = document.createElement('div');
                    resultDiv.style.cssText = `
                        margin-top: 12px;
                        padding: 12px;
                        background: #f5f5f5;
                        border-radius: 6px;
                        border: 1px solid #e0e0e0;
                    `;
                    
                    const linkText = document.createElement('div');
                    linkText.innerText = '协作链接:';
                    linkText.style.cssText = `
                        font-size: 12px;
                        color: #666;
                        margin-bottom: 8px;
                    `;
                    resultDiv.appendChild(linkText);
                    
                    const linkInput = document.createElement('input');
                    linkInput.type = 'text';
                    linkInput.value = inviteLink;
                    linkInput.readOnly = true;
                    linkInput.style.cssText = `
                        width: 100%;
                        padding: 8px;
                        background: #ffffff;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 12px;
                        color: #333;
                        box-sizing: border-box;
                    `;
                    linkInput.onclick = () => {
                        linkInput.select();
                        navigator.clipboard.writeText(inviteLink).then(() => {
                            linkInput.style.background = '#e8e8e8';
                            setTimeout(() => {
                                linkInput.style.background = '#ffffff';
                            }, 500);
                        });
                    };
                    resultDiv.appendChild(linkInput);
                    
                    const hint = document.createElement('div');
                    hint.innerText = '点击链接自动复制';
                    hint.style.cssText = `
                        font-size: 11px;
                        color: #999;
                        margin-top: 6px;
                        text-align: center;
                    `;
                    resultDiv.appendChild(hint);
                    
                    const existingResult = panel.querySelector('div[style*="margin-top: 12px"]');
                    if (existingResult) existingResult.remove();
                    
                    panel.appendChild(resultDiv);
                } else {
                    alert('获取失败: ' + (data.msg || '未知错误'));
                }
            } catch (error) {
                alert('获取失败: ' + error.message);
            } finally {
                getLinkBtn.innerText = '获取协作作品链接';
                getLinkBtn.style.opacity = '1';
                getLinkBtn.disabled = false;
            }
        };
        panel.appendChild(getLinkBtn);

        document.body.appendChild(panel);
        makeDraggable(panel);
    }

    function makeDraggable(element) {
        element.onmousedown = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            
            isDragging = true;
            dragOffset.x = e.clientX - element.offsetLeft;
            dragOffset.y = e.clientY - element.offsetTop;
            element.style.cursor = 'grabbing';
        };

        document.onmousemove = (e) => {
            if (!isDragging) return;
            
            element.style.left = (e.clientX - dragOffset.x) + 'px';
            element.style.top = (e.clientY - dragOffset.y) + 'px';
            element.style.right = 'auto';
        };

        document.onmouseup = () => {
            isDragging = false;
            if (element) {
                element.style.cursor = 'move';
            }
        };
    }

    setTimeout(createPanel, 2000);
})();