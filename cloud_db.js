// cloud_db.js - Supabase 云数据库版（service_role key）
// 项目: eivqbbxyllsorbvgqsju，数据表: village_data
(function() {
  var SUPABASE_URL = 'https://eivqbbxyllsorbvgqsju.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdnFiYnh5bGxzb3Jidmdxc2p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjcxMjMwOSwiZXhwIjoyMDk4Mjg4MzA5fQ.druJ-whOvHcA5fGrTaEvzRChB3sV4WRMf6cWR3Ru3fw';
  var TABLE = 'village_data';
  var ROW_ID = 'init';

  var SCHEMA = 'public';

  function makeHeaders(extra) {
    var h = {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Accept-Profile': SCHEMA,
      'Content-Profile': SCHEMA
    };
    if (extra) Object.keys(extra).forEach(function(k) { h[k] = extra[k]; });
    return h;
  }

  // 从云端读取数据
  function loadFromCloud(callback) {
    fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID + '&select=data', {
      headers: makeHeaders({ 'Accept': 'application/json' })
    })
    .then(function(r) {
      if (!r.ok) { if (callback) callback(null); return; }
      r.json().then(function(arr) {
        var data = arr && arr[0] && arr[0].data ? arr[0].data : null;
        if (callback) callback(data);
      }).catch(function() { if (callback) callback(null); });
    })
    .catch(function() { if (callback) callback(null); });
  }

  // 保存全部数据到云端（upsert）
  function saveToCloud(allData, callback) {
    var body = JSON.stringify({ id: ROW_ID, data: allData });
    fetch(SUPABASE_URL + '/rest/v1/' + TABLE, {
      method: 'POST',
      headers: makeHeaders({
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      }),
      body: body
    })
    .then(function(r) {
      if (r.status === 201 || r.status === 200 || r.status === 204) {
        console.log('[CloudDB] 保存云端成功');
        if (callback) callback(true);
      } else {
        r.text().then(function(t) { console.warn('[CloudDB] 保存失败:', r.status, t.substring(0, 200)); if (callback) callback(false); });
      }
    })
    .catch(function(e) { console.warn('[CloudDB] 保存错误:', e.message); if (callback) callback(false); });
  }

  window.CloudDB = {
    // 从云端拉取 → 合并写入 localStorage（云端优先，去重）
    loadFromPublic: function(callback) {
      var self = this;
      loadFromCloud(function(cloudData) {
        if (!cloudData) {
          console.log('[CloudDB] 无云端数据，使用本地');
          if (callback) callback();
          return;
        }
        console.log('[CloudDB] 加载云端数据, keys:', Object.keys(cloudData).join(', '));
        var keys = ['accounts', 'registrations', 'villages', 'products', 'food', 'camps', 'messages'];
        keys.forEach(function(key) {
          try {
            var localRaw = localStorage.getItem('village_' + key);
            var localArr = localRaw ? JSON.parse(localRaw) : [];
            var cloudArr = cloudData[key] || [];
            // 合并：云端优先，本地新增的保留
            var seen = {};
            cloudArr.forEach(function(item) { if (item && item.id) seen[item.id] = true; });
            var merged = cloudArr.slice();
            localArr.forEach(function(item) { if (item && item.id && !seen[item.id]) merged.push(item); });
            localStorage.setItem('village_' + key, JSON.stringify(merged));
          } catch(e) {}
        });
        console.log('[CloudDB] 合并完成');
        if (callback) callback();
      });
    },

    // 推送本地数据到云端（注册/审核时调用）
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
        // 2. 同步到云端
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
      saveToCloud(allData, callback);
    },

    // 兼容旧接口
    init: function(callback) { this.loadFromPublic(callback); },
    load: function(callback) { this.loadFromPublic(callback); }
  };
})();
