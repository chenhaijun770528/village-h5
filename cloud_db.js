// cloud_db.js - Supabase 版本（全方法版）
(function() {
  var SUPABASE_URL = 'https://eivqbbxyllsorbvgqsju.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_nFdOG5Cnmb8B9uZ1qqB9zA_bVM8H44r';
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
  
  // 从 Supabase 读取全量数据
  function fetchData() {
    return new Promise(function(resolve, reject) {
      fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID + '&select=data', {
        headers: makeHeaders({ 'Accept': 'application/json' })
      })
      .then(function(r) { return r.json(); })
      .then(function(rows) {
        if (rows && rows.length > 0) resolve(rows[0].data);
        else resolve(null);
      })
      .catch(function(err) { reject(err); });
    });
  }
  
  // 合并云端数据和本地数据（以 id 为唯一键，保留两端数据）
  function mergeById(localArr, cloudArr) {
    if (!Array.isArray(localArr)) localArr = [];
    if (!Array.isArray(cloudArr)) cloudArr = [];
    var map = {};
    // 先放本地数据
    localArr.forEach(function(item) { if (item && item.id) map[item.id] = item; });
    // 云端数据覆盖（云端有更新）
    cloudArr.forEach(function(item) { if (item && item.id) map[item.id] = item; });
    return Object.keys(map).map(function(k) { return map[k]; });
  }
  
  // 从 Supabase 加载 → 合并写入 localStorage（不是覆盖）
  function loadFromSupabase(callback) {
    fetchData().then(function(data) {
      if (data) {
        Object.keys(data).forEach(function(key) {
          try {
            var localRaw = localStorage.getItem('village_' + key);
            var localArr = localRaw ? JSON.parse(localRaw) : [];
            var cloudArr = data[key] || [];
            // 用合并模式：本地+云端，id去重，云端优先
            var merged = mergeById(localArr, cloudArr);
            localStorage.setItem('village_' + key, JSON.stringify(merged));
          } catch(e) {}
        });
        console.log('[CloudDB] 已从 Supabase 合并数据');
      }
      if (callback) callback();
    }).catch(function(err) {
      console.log('[CloudDB] 加载失败:', err);
      if (callback) callback();
    });
  }
  
  // 保存 localStorage 全部数据到 Supabase
  function saveToSupabase(callback) {
    var data = {};
    ['registrations', 'villages', 'products', 'food', 'camps', 'messages', 'accounts'].forEach(function(key) {
      try { data[key] = JSON.parse(localStorage.getItem('village_' + key) || '[]'); } catch(e) { data[key] = []; }
    });
    
    fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID, {
      method: 'PATCH',
      headers: makeHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
      body: JSON.stringify({ data: data, updated_at: new Date().toISOString() })
    })
    .then(function(r) {
      console.log('[CloudDB] 保存结果:', r.status);
      if (callback) callback(r.ok);
    })
    .catch(function(err) {
      console.log('[CloudDB] 保存失败:', err);
      if (callback) callback(false);
    });
  }
  
  window.CloudDB = {
    // 供注册页调用：追加数据到本地+云端
    push: function(data, description) {
      return new Promise(function(resolve, reject) {
        Object.keys(data).forEach(function(key) {
          try { localStorage.setItem('village_' + key, JSON.stringify(data[key])); } catch(e) {}
        });
        console.log('[CloudDB] push 本地:', description || '');
        saveToSupabase(function(success) {
          if (success) { resolve(); }
          else { reject(new Error('云端保存失败，数据已在本地')); }
        });
      });
    },
    
    // 供 index.html 调用：获取云端数据对象（不写本地）
    fetch: function() {
      return fetchData();
    },
    
    // 供 admin.html/profile.html 调用：加载云端→写本地
    loadFromPublic: function(callback) {
      if (typeof callback === 'function') { loadFromSupabase(callback); return; }
      return new Promise(function(resolve) { loadFromSupabase(resolve); });
    },
    
    // 供 admin.html approveRole 调用：保存当前本地数据到云端
    save: function(callback) { saveToSupabase(callback); },
    
    // 兼容旧版
    init: function(callback) { loadFromSupabase(callback); },
    load: function(callback) { loadFromSupabase(callback); }
  };
})();
