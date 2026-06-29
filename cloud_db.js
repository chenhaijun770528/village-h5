// cloud_db.js - Supabase 版本（修复 Accept-Profile header）
(function() {
  var SUPABASE_URL = 'https://eivqbbxyllsorbvgqsju.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_nFdOG5Cnmb8B9uZ1qqB9zA_bVM8H44r';
  var TABLE = 'village_data';
  var ROW_ID = 'init';
  
  // 统一请求头（关键：必须加 Accept-Profile 指定 public schema）
  function headers() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Accept-Profile': 'public',
      'Content-Profile': 'public'
    };
  }
  
  // 从 Supabase 读取数据并写入 localStorage
  function loadFromSupabase(callback) {
    var h = headers();
    h['Accept'] = 'application/json';
    
    fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID + '&select=data', { headers: h })
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
    
    var h = headers();
    h['Content-Type'] = 'application/json';
    h['Prefer'] = 'return=representation';
    
    fetch(SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID, {
      method: 'PATCH',
      headers: h,
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
    push: function(data, description) {
      return new Promise(function(resolve, reject) {
        // 1. 先写本地
        Object.keys(data).forEach(function(key) {
          try { localStorage.setItem('village_' + key, JSON.stringify(data[key])); } catch(e) {}
        });
        console.log('[CloudDB] 已写入本地:', description || '');
        
        // 2. 直接保存到 Supabase
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
