// cloud_db.js - Supabase 版本
(function() {
  var SUPABASE_URL = 'https://eivqbbxyllsorbvgqsju.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_nFdOG5Cnmb8B9uZ1qqB9zA_bVM8H44r';
  
  // 从 Supabase 读取数据并写入 localStorage
  function loadFromSupabase(callback) {
    fetch(SUPABASE_URL + '/rest/v1/village_data?id=eq.init&select=data', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    })
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      if (rows && rows.length > 0) {
        var data = rows[0].data;
        // 写入 localStorage
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
    
    fetch(SUPABASE_URL + '/rest/v1/village_data?id=eq.init', {
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
    init: function(callback) {
      loadFromSupabase(callback);
    },
    save: function(callback) {
      saveToSupabase(callback);
    },
    load: function(callback) {
      loadFromSupabase(callback);
    }
  };
})();
