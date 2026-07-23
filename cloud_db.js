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
  var _saving = false;
  var _saveTimer = null;
  var _cloudData = null;
  var _loadPromise = null;
  var _needPush = false;

  // ---- 云端状态角标（右下角，不干扰页面） ----
  var _badge = null;
  var _badgeState = { text: '☁', color: 'rgba(0,0,0,0.55)' };
  function ensureBadge() {
    if (_badge && _badge.parentNode) return _badge;
    if (!document.body) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureBadge);
      else setTimeout(ensureBadge, 50);
      return null;
    }
    _badge = document.createElement('div');
    _badge.id = 'cloud_status_badge';
    _badge.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;font:12px/1.4 -apple-system,sans-serif;padding:4px 9px;border-radius:11px;background:rgba(0,0,0,0.55);color:#fff;pointer-events:none;opacity:.7;box-shadow:0 1px 4px rgba(0,0,0,.3);letter-spacing:.5px;';
    document.body.appendChild(_badge);
    applyBadge();
    return _badge;
  }
  function applyBadge() {
    if (_badge) { _badge.textContent = _badgeState.text; _badge.style.background = _badgeState.color; }
  }
  function setBadge(text, color) {
    _badgeState = { text: text, color: color || 'rgba(0,0,0,0.55)' };
    var b = ensureBadge();
    if (b) applyBadge();
  }

  function apiUrl() {
    return SUPABASE_URL + '/rest/v1/' + TABLE + '?id=eq.' + ROW_ID + '&select=data';
  }
  function headers() {
    return { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY, 'Content-Type': 'application/json' };
  }

  function collect() {
    var d = {};
    for (var i = 0; i < SYNC_KEYS.length; i++) {
      d[SYNC_KEYS[i]] = Storage.get(SYNC_KEYS[i], null);
    }
    d._updated = Date.now();
    return d;
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

  function applyData(d) {
    _cloudData = d || {};
    if (!d) return;
    for (var i = 0; i < SYNC_KEYS.length; i++) {
      var k = SYNC_KEYS[i];
      if (d[k] !== undefined && d[k] !== null) Storage.set(k, d[k]);
    }
    _loaded = true;
  }

  function load() {
    if (_loadPromise) return _loadPromise;
    setBadge('☁ 连接中…', 'rgba(0,0,0,0.55)');
    if (typeof fetch !== 'function') {
      _loaded = true;
      setBadge('☁ 离线', 'rgba(140,140,140,0.85)');
      return Promise.resolve();
    }
    _loadPromise = fetch(apiUrl(), { headers: headers() }).then(function (r) {
      if (!r.ok) throw new Error('supabase ' + r.status);
      return r.json();
    }).then(function (rows) {
      if (rows && rows[0] && rows[0].data) {
        applyData(rows[0].data);
      } else {
        _needPush = true;
        applyData({});
      }
      setBadge('☁ 已同步', 'rgba(46,125,50,0.9)');
      return rows;
    }).catch(function (e) {
      console.warn('[cloud] load failed (keep local):', e);
      _loaded = true;
      _cloudData = {};
      setBadge('☁ 离线', 'rgba(140,140,140,0.85)');
    }).then(function () {
      if (_needPush) { _needPush = false; save(); }
    });
    return _loadPromise;
  }

  function save() {
    if (_saving) return;
    _saving = true;
    setBadge('☁ 保存中…', 'rgba(0,0,0,0.55)');
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
    }).then(function (r) {
      if (!r.ok) throw new Error('save ' + r.status);
      return r.json();
    }).then(function () {
      _cloudData = merged;
      _saving = false;
      setBadge('☁ 已同步', 'rgba(46,125,50,0.9)');
    }).catch(function (e) {
      console.warn('[cloud] save failed (WeChat may block Supabase; retry on next change):', e);
      _saving = false;
      setBadge('☁ 离线', 'rgba(140,140,140,0.85)');
    });
  }

  function scheduleSave() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(save, 1500);
  }

  function hookStorage() {
    if (typeof Storage === 'undefined' || !Storage.set) {
      setTimeout(hookStorage, 50);
      return;
    }
    var _origSet = Storage.set;
    Storage.set = function (k, v) {
      _origSet(k, v);
      if (_loaded && SYNC_KEYS.indexOf(k) >= 0) scheduleSave();
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
