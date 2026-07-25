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

  function applyData(d) {
    _cloudData = d || {};
    if (!d) return;
    for (var i = 0; i < SYNC_KEYS.length; i++) {
      var k = SYNC_KEYS[i];
      if (d[k] !== undefined && d[k] !== null) {
        var local = Storage.get(k, null);
        if (local === null || local === undefined) {
          Storage.set(k, d[k]);
        }
      }
    }
    _loaded = true;
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
        } else {
          applyData({});
        }
        console.log('[cloud] 加载成功');
        return rows;
      })
      .catch(function (e) {
        console.warn('[cloud] 加载失败，使用本地数据:', e);
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
    for (var k in map) { if (map.hasOwnProperty(k)) out.push(map[k]); }
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

  window.CloudDB = {
    load: load,
    save: save,
    SYNC_KEYS: SYNC_KEYS,
    ready: load()
  };
})();
