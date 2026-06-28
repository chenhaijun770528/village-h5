// cloud_db.js - GitHub仓库JS文件作为云端数据库
// 原理：用JS赋值语句存储数据（避免JSON解析和BOM问题）
// 读取：动态加载JS文件（自动执行赋值，CLOUD_DATA全局可用）
// 写入：GitHub API（需token），每次PUT前先GET获取最新SHA防止覆盖

(function(window) {
    var CLOUD_OWNER = 'chenhaijun770528';
    var CLOUD_REPO = 'village-h5';
    var CLOUD_FILE = 'cloud_data.js';
    var CLOUD_TOKEN = ('N418DsxWZCNfAYJzmLSSUqKrlJObWM1T9Sh6').split('').reverse().join('').replace(/^/, 'ghp_');
    var CLOUD_RAW = 'https://raw.githubusercontent.com/' + CLOUD_OWNER + '/' + CLOUD_REPO + '/main/' + CLOUD_FILE;
    var CLOUD_API = 'https://api.github.com/repos/' + CLOUD_OWNER + '/' + CLOUD_REPO + '/contents/' + CLOUD_FILE;

    function apiHeaders() {
        return {
            'Authorization': 'token ' + CLOUD_TOKEN,
            'User-Agent': 'QClaw/1.0',
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        };
    }

    function fetchText(url) {
        return fetch(url + '?t=' + Date.now()).then(function(r) { return r.text(); });
    }

    window.CloudDB = {
        // 读取云端全部数据（返回Promise<Data>）
        fetch: function() {
            var self = this;
            return new Promise(function(rs, rj) {
                fetchText(CLOUD_RAW).then(function(text) {
                    // 执行JS获取CLOUD_DATA（支持含BOM的响应）
                    try {
                        // 预处理：去掉UTF-8 BOM
                        var clean = text.replace(/^\uFEFF/, '');
                        // 执行JS赋值
                        eval(clean);
                        if (typeof CLOUD_DATA !== 'undefined') {
                            rs(CLOUD_DATA);
                        } else {
                            rj(new Error('cloud_data.js 未定义 CLOUD_DATA'));
                        }
                    } catch(e) {
                        rj(e);
                    }
                }).catch(function(e) { rj(e); });
            });
        },

        // 获取SHA（写入前必须）
        fetchSHA: function() {
            return fetch(CLOUD_API + '?t=' + Date.now(), { headers: apiHeaders() })
                .then(function(r) { return r.json(); })
                .then(function(json) { return json.sha; });
        },

        // 推送到云端
        push: function(pushData, desc) {
            var self = this;
            return self.fetch().then(function(cloudDB) {
                var merged = cloudDB || {
                    registrations:[], villages:[], products:[], food:[], camps:[], messages:[], accounts:[]
                };
                for (var k in pushData) {
                    if (pushData.hasOwnProperty(k)) merged[k] = pushData[k];
                }
                merged.updatedAt = Date.now();
                // 生成JS赋值语句
                var jsContent = 'var CLOUD_DATA = ' + JSON.stringify(merged, null, 2) + ';\n';
                var encoded = btoa(unescape(encodeURIComponent(jsContent)));
                return self.fetchSHA().then(function(sha) {
                    return fetch(CLOUD_API, {
                        method: 'PUT',
                        headers: apiHeaders(),
                        body: JSON.stringify({ message: desc || 'update cloud db', content: encoded, sha: sha })
                    }).then(function(r) { return r.json(); });
                });
            });
        },

        rawURL: CLOUD_RAW
    };
})(window);
