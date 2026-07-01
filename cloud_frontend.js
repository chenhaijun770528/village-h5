/**
 * cloud_frontend.js - 前端云端同步脚本
 * 用于前台页面（profile.html等）连接 Supabase 云端
 */

(function() {
  var C = window._cloud = {
    url: 'https://eivqbbxyllsorbvgqsju.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdnFiYnh5bGxzb3Jidmdxc2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTIzMDksImV4cCI6MjA5ODI4ODMwOX0.QeKnbo1cgA0yGMOEydML3PNXatH1V1QXfW0hyxRy7KY',
    table: 'village_data',
    rowId: 'init',
    connected: false
  };

  // 从云端加载全部数据
  C.loadAll = function(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', C.url + '/rest/v1/' + C.table + '?id=eq.' + C.rowId + '&select=data', true);
    xhr.setRequestHeader('apikey', C.key);
    xhr.setRequestHeader('Authorization', 'Bearer ' + C.key);
    xhr.timeout = 8000;
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var arr = JSON.parse(xhr.responseText);
            if (arr.length > 0 && arr[0].data) {
              C.cloudData = arr[0].data;
              C.connected = true;
              // 合并到 localStorage
              C.mergeToLocal(C.cloudData);
            }
          } catch(e) {}
        }
        if (callback) callback(C.connected);
      }
    };
    xhr.ontimeout = function() { if (callback) callback(false); };
    xhr.onerror = function() { if (callback) callback(false); };
    xhr.send();
  };

  // 合并云端数据到 localStorage
  C.mergeToLocal = function(cloudData) {
    // 合并 registrations
    if (cloudData.registrations && cloudData.registrations.length) {
      var localRegs = C._get('registrations', []);
      var merged = C._mergeById(localRegs, cloudData.registrations);
      C._set('registrations', merged);
    }
    // 合并 villages
    if (cloudData.villages && cloudData.villages.length) {
      var localVillages = C._get('villages', []);
      var merged = C._mergeById(localVillages, cloudData.villages);
      C._set('villages', merged);
    }
    // 合并 accounts
    if (cloudData.accounts && cloudData.accounts.length) {
      var localAccounts = C._get('accounts', []);
      var merged = C._mergeById(localAccounts, cloudData.accounts);
      C._set('accounts', merged);
    }
    // 合并 announcements
    if (cloudData.announcements && cloudData.announcements.length) {
      var localAnn = C._get('announcements', []);
      var merged = C._mergeById(localAnn, cloudData.announcements);
      C._set('announcements', merged);
    }
  };

  // 把 localStorage 数据推送到云端
  C.pushToCloud = function(callback) {
    var data = {
      registrations: C._get('registrations', []),
      villages: C._get('villages', []),
      accounts: C._get('accounts', []),
      announcements: C._get('announcements', [])
    };
    var xhr = new XMLHttpRequest();
    xhr.open('PATCH', C.url + '/rest/v1/' + C.table + '?id=eq.' + C.rowId, true);
    xhr.setRequestHeader('apikey', C.key);
    xhr.setRequestHeader('Authorization', 'Bearer ' + C.key);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 8000;
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (callback) callback(xhr.status === 200 || xhr.status === 204);
      }
    };
    xhr.ontimeout = function() { if (callback) callback(false); };
    xhr.onerror = function() { if (callback) callback(false); };
    xhr.send(JSON.stringify({ data: data }));
  };

  // 合并两个数组（去重，按 id 合并）
  C._mergeById = function(local, remote) {
    var map = {};
    local.forEach(function(item) {
      var key = item.id || '';
      if (key) map[key] = item;
    });
    remote.forEach(function(item) {
      var key = item.id || '';
      if (key) {
        if (map[key]) {
          // 已存在，用云端数据覆盖（云端是最新的）
          map[key] = item;
        } else {
          map[key] = item;
        }
      }
    });
    var result = [];
    for (var k in map) { result.push(map[k]); }
    return result;
  };

  C._get = function(key, def) {
    try {
      var v = localStorage.getItem('village_' + key);
      return v ? JSON.parse(v) : def;
    } catch(e) { return def; }
  };

  C._set = function(key, val) {
    try { localStorage.setItem('village_' + key, JSON.stringify(val)); } catch(e) {}
  };
})();
