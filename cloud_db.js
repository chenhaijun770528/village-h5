// cloud_db.js - GitHub 仓库版（Token 从 localStorage 读取，不写在文件里）
// Token 存在每个设备的浏览器本地，不上传 GitHub
// 使用 GitHub REST API 读写仓库里的 village-data.json
(function() {
  var REPO_OWNER = 'chenhaijun770528';
  var REPO_NAME = 'village-h5';
  var FILE_PATH = 'village-data.json';

  var BASE = 'https://api.github.com';

  // 从 localStorage 读取 Token（setup-token.html 设置）
  function getToken() {
    try { return localStorage.getItem('village_github_token') || ''; } catch(e) { return ''; }
  }

  function api(path, method, body) {
    var token = getToken();
    if (!token) {
      console.warn('[CloudDB] Token 未设置，请在 setup-token.html 中设置');
      return Promise.resolve({ ok: false, status: 0, data: { message: 'Token not set' } });
    }
    var headers = {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    return fetch(BASE + path, {
      method: method || 'GET',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function(r) {
      return r.json().then(function(d) { return { ok: r.ok, status: r.status, data: d }; })
        .catch(function() { return { ok: r.ok, status: r.status, data: null }; });
    }).catch(function(e) { return { ok: false, status: -1, data: null }; });
  }

  // 读取云端 village-data.json
  function loadCloudData(callback) {
    api('/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + FILE_PATH, 'GET')
      .then(function(result) {
        if (!result.ok) {
          if (result.status === 404) {
            console.log('[CloudDB] 云端数据文件不存在（首次使用）');
            if (callback) callback({});
          } else {
            console.warn('[CloudDB] 加载云端数据失败:', result.status);
            if (callback) callback(null);
          }
          return;
        }
        try {
          var content = atob(result.data.content);
          var cloudData = JSON.parse(content);
          console.log('[CloudDB] 加载云端数据成功, keys:', Object.keys(cloudData).join(', '));
          if (callback) callback(cloudData);
        } catch(e) {
          console.warn('[CloudDB] 解析云端数据失败:', e.message);
          if (callback) callback(null);
        }
      });
  }

  // 保存全部数据到云端 village-data.json
  function saveCloudData(allData, callback, onSha) {
    var jsonStr = JSON.stringify(allData, null, 2);
    api('/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + FILE_PATH, 'GET')
      .then(function(result) {
        var sha = result.data && result.data.sha ? result.data.sha : null;
        if (onSha) onSha(sha);
        var body = {
          message: '更新村庄H5云数据 ' + new Date().toLocaleString('zh-CN'),
          content: btoa(unescape(encodeURIComponent(jsonStr)))
        };
        if (sha) body.sha = sha;
        api('/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + FILE_PATH, 'PUT', body)
          .then(function(saveResult) {
            if (saveResult.ok) {
              console.log('[CloudDB] 保存云端成功!');
              if (callback) callback(true);
            } else {
              console.warn('[CloudDB] 保存失败:', saveResult.status, saveResult.data && saveResult.data.message);
              if (callback) callback(false);
            }
          });
      });
  }

  window.CloudDB = {
    // 从云端拉取数据 → 合并写入 localStorage（云端优先，去重）
    loadFromPublic: function(callback) {
      var self = this;
      loadCloudData(function(cloudData) {
        if (!cloudData) {
          console.log('[CloudDB] 无云端数据，使用本地');
          if (callback) callback();
          return;
        }
        var keys = ['accounts', 'registrations', 'villages', 'products', 'food', 'camps', 'messages'];
        keys.forEach(function(key) {
          try {
            var localRaw = localStorage.getItem('village_' + key);
            var localArr = localRaw ? JSON.parse(localRaw) : [];
            var cloudArr = cloudData[key] || [];
            var seen = {};
            cloudArr.forEach(function(item) { if (item && item.id) seen[item.id] = true; });
            var merged = cloudArr.slice();
            localArr.forEach(function(item) { if (item && item.id && !seen[item.id]) merged.push(item); });
            localStorage.setItem('village_' + key, JSON.stringify(merged));
          } catch(e) {}
        });
        console.log('[CloudDB] 云端数据合并完成');
        if (callback) callback();
      });
    },

    // 推送指定数据到云端（注册/审核时调用）
    push: function(data, description) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var keys = Object.keys(data);
        // 1. 先保存到本地 localStorage
        keys.forEach(function(key) {
          try {
            var existing = JSON.parse(localStorage.getItem('village_' + key) || '[]');
            var incoming = Array.isArray(data[key]) ? data[key] : [data[key]];
            var ids = {};
            existing.forEach(function(item) { if (item.id) ids[item.id] = item; });
            incoming.forEach(function(item) { if (item.id) ids[item.id] = item; });
            var merged = Object.keys(ids).map(function(k) { return ids[k]; });
            localStorage.setItem('village_' + key, JSON.stringify(merged));
          } catch(e) {}
        });
        console.log('[CloudDB] 已本地保存:', keys.join(', '), description || '');
        // 2. 同时更新云端
        self.save(function(ok) {
          if (ok) resolve();
          else reject(new Error('cloud save failed'));
        });
      });
    },

    // 保存本地全部数据到云端（供 admin 用）
    save: function(callback) {
      var allData = {};
      var keys = ['accounts', 'registrations', 'villages', 'products', 'food', 'camps', 'messages'];
      keys.forEach(function(key) {
        try { allData[key] = JSON.parse(localStorage.getItem('village_' + key) || '[]'); }
        catch(e) { allData[key] = []; }
      });
      saveCloudData(allData, callback);
    },

    // 兼容旧接口
    init: function(callback) { this.loadFromPublic(callback); },
    load: function(callback) { this.loadFromPublic(callback); },

    // 检查 Token 是否已设置
    hasToken: function() { return !!getToken(); }
  };
})();
