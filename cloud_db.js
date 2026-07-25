(function () {
  'use strict';

  var SUPABASE_URL = 'https://eivqbbxyllsorbvgqsju.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdnFiYnh5bGxzb3Jidmdxc2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTIzMDksImV4cCI6MjA5ODI4ODMwOX0.QeKnbo1cgA0yGMOEydML3PNXatH1V1QXfW0hyxRy7KY';
  var TABLE = 'village_data';
  var ROW_ID = 'init';

  var SYNC_KEYS = [
    'accounts', 'announcements', 'camp_applications', 'camps',
    'favorites', 'food_applications', 'foods', 'history', 'messages',
    'orders', 'product_applications', 'products', 'registrations',
    'reviews', 'township_applications', 'villages'
  ];

  var _loaded = false;
  var _cloudData = null;
  var _lastSyncTime = 0;

  function apiUrl() {
    return SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID + '&select=data';
  }

  function headers() {
    return {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + ANON_KEY,
      'Content-Type': 'application/json'
    };
  }

  function collect() {
    var d = {};
    for (var i = 0; i < SYNC_KEYS.length; i++) {
      d[SYNC_KEYS[i]] = Storage.get(SYNC_KEYS[i], null);
    }
    d._updated = Date.now();
    return d;
  }

  // 【关键修复】云端优先合并：云端数据覆盖本地，但保留本地独有的记录
  function applyData(d, forceOverwrite) {
    _cloudData = d || {};
    if (!d) return;
    
    for (var i = 0; i < SYNC_KEYS.length; i++) {
      var k = SYNC_KEYS[i];
      if (d[k] === undefined || d[k] === null) continue;
      
      var local = Storage.get(k, null);
      var cloud = d[k];
      
      if (Array.isArray(local) && Array.isArray(cloud)) {
        // 数组合并：云端优先，但保留本地独有的（按 id 匹配）
        var merged = mergeById(cloud, local, forceOverwrite);
        Storage.set(k, merged);
      } else if (local && typeof local === 'object' && cloud && typeof cloud === 'object') {
        // 对象合并：云端优先
        var mergedObj = {};
        for (var lk in local) if (local.hasOwnProperty(lk)) mergedObj[lk] = local[lk];
        for (var ck in cloud) if (cloud.hasOwnProperty(ck)) mergedObj[ck] = cloud[ck]; // 云端覆盖
        Storage.set(k, mergedObj);
      } else {
        // 简单值：云端优先
        Storage.set(k, cloud);
      }
    }
    _loaded = true;
    _lastSyncTime = Date.now();
  }

  // 按 id 合并数组，云端优先
  function mergeById(cloudArr, localArr, forceOverwrite) {
    var map = {};
    var i;
    
    // 先放入本地数据
    for (i = 0; i < (localArr || []).length; i++) {
      var item = localArr[i];
      if (item && item.id) map[item.id] = item;
    }
    
    // 云端数据覆盖（如果 forceOverwrite 或云端数据更新）
    for (i = 0; i < (cloudArr || []).length; i++) {
      var cloudItem = cloudArr[i];
      if (cloudItem && cloudItem.id) {
        var existing = map[cloudItem.id];
        if (!existing) {
          // 云端有新记录，加入
          map[cloudItem.id] = cloudItem;
        } else if (forceOverwrite || (cloudItem._updated && existing._updated && cloudItem._updated > existing._updated)) {
          // 云端数据更新，覆盖
          map[cloudItem.id] = cloudItem;
        }
        // 否则保留本地（本地更新）
      }
    }
    
    var result = [];
    for (var key in map) if (map.hasOwnProperty(key)) result.push(map[key]);
    return result;
  }

  function load(forceOverwrite) {
    if (typeof fetch !== 'function') {
      _loaded = true;
      return Promise.resolve();
    }

    return fetch(apiUrl(), { headers: headers() })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (rows) {
        if (rows && rows[0] && rows[0].data) {
          applyData(rows[0].data, forceOverwrite);
          console.log('[cloud] 加载成功，数据已同步');
        } else {
          applyData({}, forceOverwrite);
        }
        return rows;
      })
      .catch(function (e) {
        console.warn('[cloud] 加载失败:', e);
        _loaded = true;
        _cloudData = {};
      });
  }

  // 【新增】强制刷新（用于页面切换时拉取最新数据）
  function refresh() {
    console.log('[cloud] 强制刷新数据...');
    return load(true); // true = 强制用云端覆盖
  }

  function save() {
    if (typeof fetch !== 'function') return;

    var local = collect();
    var merged = {};
    for (var i = 0; i < SYNC_KEYS.length; i++) {
      var k = SYNC_KEYS[i];
      merged[k] = mergeArrays(_cloudData ? _cloudData[k] : null, local[k]);
    }
    merged._updated = Date.now();

    fetch(apiUrl(), {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ data: merged })
    })
    .then(function (r) {
      if (!r.ok) throw new Error('save ' + r.status);
      return r.json();
    })
    .then(function () {
      _cloudData = merged;
      console.log('[cloud] 保存成功');
    })
    .catch(function (e) {
      console.warn('[cloud] 保存失败:', e);
    });
  }

  function mergeArrays(a, b) {
    var map = {};
    function keyOf(x) {
      if (x && x.id !== undefined && x.id !== null) return 'id:' + x.id;
      return 'val:' + JSON.stringify(x);
    }
    (a || []).forEach(function (x) { map[keyOf(x)] = x; });
    (b || []).forEach(function (x) { map[keyOf(x)] = x; });
    var out = [];
    for (var k in map) if (map.hasOwnProperty(k)) out.push(map[k]);
    return out;
  }

  function hookStorage() {
    if (typeof Storage === 'undefined' || !Storage.set) {
      setTimeout(hookStorage, 100);
      return;
    }
    var _origSet = Storage.set;
    Storage.set = function (k, v) {
      _origSet(k, v);
      if (_loaded && SYNC_KEYS.indexOf(k) >= 0) {
        save();
      }
    };
  }

  hookStorage();

  // 页面可见性变化时自动刷新
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && _loaded) {
        // 页面重新可见时，延迟刷新
        setTimeout(function() {
          refresh().then(function() {
            // 触发页面重新渲染
            if (typeof renderVillages === 'function') renderVillages();
            if (typeof loadLandscapeDesigners === 'function') loadLandscapeDesigners();
          });
        }, 500);
      }
    });
  }

  window.CloudDB = {
    load: load,
    save: save,
    refresh: refresh,
    SYNC_KEYS: SYNC_KEYS,
    ready: load()
  };
})();
