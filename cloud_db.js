// cloud_db.js - Supabase 版本（修正版）
(function() {
  var SUPABASE_URL = 'https://eivqbbxyllsorbvgqsju.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_nFdOG5Cnmb8B9uZ1qqB9zA_bVM8H44r';
  var TABLE = 'village_data';
  var ROW_ID = 'init';
  
  // 从 Supabase 读取数据并写入 localStorage
  function loadFromSupabase(callback) {
    fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID + '&select=data', {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    })
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      if (rows && rows.length > 0) {
        var data = rows[0].data;
        Object.keys(data).forEach(function(key) {
          try { localStorage.setItem('village_' + key, JSON.stringify(data[key])); } catch(e) {}
        });
        console.log('[CloudDB] 已从 Supabase 加载数据');
      }
      if (callback) callback();
    })
    .catch(function(err) {
      console.log('[CloudDB] 加载失败:', err);
      if (callback) callback();
    });
  }
  
  // 保存 localStorage 数据到 Supabase
  function saveToSupabase(callback) {
    var data = {};
    ['registrations', 'villages', 'products', 'food', 'camps', 'messages', 'accounts'].forEach(function(key) {
      try { data[key] = JSON.parse(localStorage.getItem('village_' + key) || '[]'); } catch(e) { data[key] = []; }
    });
    
    fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
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
    // ===== 注册页用的 push() =====
    // 追加新数据到云端，data格式: { registrations: [...] }
    push: function(data, description) {
      return new Promise(function(resolve, reject) {
        // 1. 先写本地 localStorage（即时生效）
        Object.keys(data).forEach(function(key) {
          try { localStorage.setItem('village_' + key, JSON.stringify(data[key])); } catch(e) {}
        });
        console.log('[CloudDB] 已写入本地:', description || '');
        
        // 2. 直接保存当前全部 localStorage 到 Supabase（不先加载，避免覆盖）
        //    saveToSupabase 会自动读取所有 village_ 前缀的 key
        saveToSupabase(function(success) {
          if (success) {
            console.log('[CloudDB] push 云端成功:', description || '');
            resolve();
          } else {
            console.log('[CloudDB] push 云端失败，数据已在本地');
            reject(new Error('云端保存失败'));
          }
        });
      });
    },
    
    // ===== admin.html/首页 用的 loadFromPublic() =====
    // 从 Supabase 拉取全量数据写入 localStorage
    loadFromPublic: function(callback) {
      if (typeof callback === 'function') {
        loadFromSupabase(callback);
        return;
      }
      return new Promise(function(resolve, reject) {
        loadFromSupabase(function() { resolve(); });
      });
    },
    
    // ===== 兼容旧版 =====
    init: function(callback) { loadFromSupabase(callback); },
    save: function(callback) { saveToSupabase(callback); },
    load: function(callback) { loadFromSupabase(callback); }
  };
})();
