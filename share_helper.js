// share_helper.js - 注册审核链接生成器（所有注册页共用）
// 用法：在注册成功回调里调用  showShareLink(regData);

/**
 * 显示审核链接弹窗
 * @param {Object} regData - 注册数据
 * @param {string} roleName - 角色名称（用于弹窗标题）
 */
function showShareLink(regData, roleName) {
    var shareUrl = 'https://chenhaijun770528.github.io/village-h5/url_share.html#';
    try {
        shareUrl += btoa(encodeURIComponent(JSON.stringify(regData)));
    } catch(e) {
        toast('生成链接失败');
        return;
    }

    // 创建弹窗
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

    modal.innerHTML =
        '<div style="background:white;border-radius:16px;max-width:360px;width:100%;padding:24px;text-align:center;">' +
            '<div style="font-size:18px;font-weight:600;margin-bottom:8px;color:#2E7D32;">✅ 注册提交成功</div>' +
            '<div style="font-size:14px;color:#666;margin-bottom:16px;">请复制下方链接，发送给管理员审核</div>' +
            '<div style="background:#f5f5f5;padding:10px;border-radius:8px;font-size:12px;word-break:break-all;text-align:left;color:#333;max-height:80px;overflow:auto;margin-bottom:16px;" id="shareUrlText">' + shareUrl + '</div>' +
            '<div style="display:flex;gap:8px;">' +
                '<button onclick="copyShareLink(\'' + shareUrl.replace(/'/g, '\\'') + '\')" style="flex:1;padding:10px;background:#2E7D32;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;">📋 复制链接</button>' +
                '<button onclick="this.closest(\'.modal\').remove();location.reload();" style="flex:1;padding:10px;background:#999;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;">关闭</button>' +
            '</div>' +
        '</div>';

    // 防止重复弹窗
    var oldModal = document.getElementById('shareModal');
    if (oldModal) oldModal.remove();
    modal.classList.add('modal');
    modal.id = 'shareModal';
    document.body.appendChild(modal);
}

/**
 * 复制审核链接
 */
function copyShareLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
            toast('链接已复制！请发给管理员');
        }).catch(function() {
            promptCopy(url);
        });
    } else {
        promptCopy(url);
    }
}

function promptCopy(url) {
    prompt('请手动复制链接：', url);
}

// 导出（兼容非模块化环境）
window.showShareLink = showShareLink;
window.copyShareLink = copyShareLink;
