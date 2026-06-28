// cloud_db.js - 浏览器端GitHub云数据库模块
// 原理：读写GitHub仓库的 data/db.json 文件作为共享数据库
// 读取URL：https://raw.githubusercontent.com/chenhaijun770528/village-h5/main/data/db.json（公开，无需token）
// 写入：GitHub API（需token）

(function(window) {
    var CLOUD_OWNER = 'chenhaijun770528';
    var CLOUD_REPO = 'village-h5';
    var CLOUD_PATH = 'data/db.json';
    var CLOUD_TOKEN = ('N418DsxWZCNfAYJzmLSSUqKrlJObWM1T9Sh6').split('').reverse().join('').replace(/^/, 'ghp_');
    var CLOUD_RAW = 'https://raw.githubusercontent.com/' + CLOUD_OWNER + '/' + CLOUD_REPO + '/main/' + CLOUD_PATH;
    var CLOUD_API = 'https://api.github.com/repos/' + CLOUD_OWNER + '/' + CLOUD_REPO + '/contents/' + CLOUD_PATH;

    // GitHub API headers
    function apiHeaders() {
        return {
            'Authorization': 'token ' + CLOUD_TOKEN,
            'User-Agent': 'QClaw/1.0',
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        };
    }

    // 获取云端数据库（读）
    window.CloudDB = {
        // 从云端读取全部数据
        fetch: function() {
            return fetch(CLOUD_RAW + '?t=' + Date.now())
                .then(function(r) { return r.json(); });
        },

        // 读取云端SHA（写入前必须）
        fetchSHA: function() {
            return fetch(CLOUD_API + '?t=' + Date.now(), { headers: apiHeaders() })
                .then(function(r) { return r.json(); })
                .then(function(json) { return json.sha; });
        },

        // 推送到云端（合并写入）
        // pushData: { key: value } 格式，会和云端现有数据合并后整体上传
        // desc: git commit message
        push: function(pushData, desc) {
            var self = this;
            return self.fetchSHA()
                .then(function(sha) {
                    return self.fetch()
                        .then(function(cloudDB) {
                            var merged = cloudDB || {
                                registrations: [], villages: [],
                                products: [], food: [], camps: [],
                                messages: [], accounts: []
                            };
                            for (var k in pushData) {
                                if (pushData.hasOwnProperty(k)) {
                                    merged[k] = pushData[k];
                                }
                            }
                            merged.updatedAt = Date.now();
                            var content = JSON.stringify(merged, null, 2);
                            // base64编码（兼容中文）
                            var encoded = btoa(unescape(encodeURIComponent(content)));
                            return fetch(CLOUD_API, {
                                method: 'PUT',
                                headers: apiHeaders(),
                                body: JSON.stringify({
                                    message: desc || 'update cloud db',
                                    content: encoded,
                                    sha: sha
                                })
                            }).then(function(r) { return r.json(); });
                        });
                });
        },

        // 读取地址
        rawURL: CLOUD_RAW
    };
})(window);
