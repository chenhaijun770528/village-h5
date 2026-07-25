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
  var _syncTimer = null;
  var _lastCloudUpdate = 0;

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

  // 云端优先合并（审核状态会被云端覆盖）
  function applyData(d) {
    _cloudData = d || {};
    if (!d) return;

    var cloudUpdateTime = d._updated || 0;
    var needRefresh = false;

    for (var i = 0; i < SYNC_KEYS.length; i++) {
      var k = SYNC_KEYS[i];
      if (d[k] === undefined || d[k] === null) continue;

      var local = Storage.get(k, null);
      var cloud = d[k];

      if (Array.isArray(local) && Array.isArray(cloud)) {
        // 检查云端是否有更新
        for (var ci = 0; ci < cloud.length; ci++) {
          var cloudItem = cloud[ci];
          if (!cloudItem || !cloudItem.id) continue;

          var localItem = null;
          for (var li = 0; li < local.length; li++) {
            if (local[li] && local[li].id === cloudItem.id) {
              localItem = local[li];
              break;
            }
          }

          // 如果云端数据更新时间比本地新，或者状态不一致
          if (localItem && cloudItem.status && localItem.status !== cloudItem.status) {
            console.log('[cloud] 状态更新: ' + cloudItem.name + ' ' + localItem.status + ' -> ' + cloudItem.status);
            needRefresh = true;
            break;
          }
        }

        // 合并：云端优先
        var merged = mergeById(cloud, local);
        Storage.set(k, merged);
      } else {
        Storage.set(k, cloud);
      }
    }

    _loaded = true;
    _lastCloudUpdate = cloudUpdateTime;

    // 如果有更新，触发页面重新渲染
    if (needRefresh && typeof renderVillages === 'function') {
      console.log('[cloud] 检测到数据更新，重新渲染页面');
      renderVillages();
    }
    if (needRefresh && typeof loadLandscapeDesigners === 'function') {
      loadLandscapeDesigners();
    }
  }

  function mergeById(cloudArr, localArr) {
    var map = {};
    var i;

    // 先放本地数据
    for (i = 0; i < (localArr || []).length; i++) {
      var item = localArr[i];
      if (item && item.id) map[item.id] = item;
    }

    // 云端数据覆盖（云端优先）
    for (i = 0; i < (cloudArr || []).length; i++) {
      var cloudItem = cloudArr[i];
      if (cloudItem && cloudItem.id) {
        map[cloudItem.id] = cloudItem; // 云端覆盖本地
      }
    }

    var result = [];
    for (var key in map) if (map.hasOwnProperty(key)) result.push(map[key]);
    return result;
  }

  function load() {
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
          applyData(rows[0].data);
          console.log('[cloud] 数据同步成功');
        } else {
          applyData({});
        }
        return rows;
      })
      .catch(function (e) {
        console.warn('[cloud] 同步失败:', e);
        _loaded = true;
        _cloudData = {};
      });
  }

  function save() {
    if (typeof fetch !== 'function') return;

    var local = collect();
    var merged = {};
    for (var i = 0; i < SYNC_KEYS.length; i++) {
      var k = SYNC_KEYS[i];
      merged[k] = mergeById(_cloudData ? _cloudData[k] : null, local[k]);
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
      _lastCloudUpdate = Date.now();
      console.log('[cloud] 保存成功');
    })
    .catch(function (e) {
      console.warn('[cloud] 保存失败:', e);
    });
  }

  // 【新增】每30秒自动同步
  function startAutoSync() {
    if (_syncTimer) clearInterval(_syncTimer);

    _syncTimer = setInterval(function() {
      if (document.hidden) return; // 页面不可见时跳过

      console.log('[cloud] 自动同步检查...');
      load();
    }, 30000); // 30秒

    console.log('[cloud] 已启动自动同步（每30秒）');
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

  // 页面可见性变化时立即同步
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden && _loaded) {
        console.log('[cloud] 页面重新可见，立即同步');
        load();
      }
    });
  }

  window.CloudDB = {
    load: load,
    save: save,
    SYNC_KEYS: SYNC_KEYS,
    ready: load().then(function() {
      startAutoSync(); // 初始化完成后启动自动同步
    })
  };
})();
