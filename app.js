// village-h5 数据存储工具
// 统一前缀 village_，兼容旧 key

var Storage = {
  _prefix: 'village_',
  
  get: function(key, def) {
    try {
      var v = localStorage.getItem(this._prefix + key);
      if (v === null) {
        // 兼容无前缀的旧 key
        v = localStorage.getItem(key);
      }
      if (v === null || v === undefined || v === '') return def;
      return JSON.parse(v);
    } catch(e) {
      return def;
    }
  },
  
  set: function(key, val) {
    try {
      localStorage.setItem(this._prefix + key, JSON.stringify(val));
      return true;
    } catch(e) {
      if (e.name === 'QuotaExceededError') {
        // 自动清理最旧的数据
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(this._prefix) === 0) keys.push(k);
        }
        keys.sort(function(a, b) {
          return (localStorage.getItem(a)||'').length - (localStorage.getItem(b)||'').length;
        });
        if (keys.length > 0) {
          localStorage.removeItem(keys[0]);
          // 重试一次
          try { localStorage.setItem(this._prefix + key, JSON.stringify(val)); return true; } catch(e2) {}
        }
      }
      alert('存储空间已满，请清理数据');
      return false;
    }
  },
  
  remove: function(key) {
    localStorage.removeItem(this._prefix + key);
    // 也清理无前缀的旧 key
    localStorage.removeItem(key);
  },
  
  clearAll: function() {
    var toRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(this._prefix) === 0) toRemove.push(k);
    }
    for (var j = 0; j < toRemove.length; j++) {
      localStorage.removeItem(toRemove[j]);
    }
  }
};

// Toast 提示
function toast(msg) {
  var el = document.getElementById('_toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '_toast';
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.75);color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:99999;pointer-events:none;transition:opacity .3s';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(function() { el.style.opacity = '0'; }, 2000);
}

// 生成唯一ID
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// 获取当前登录用户
function getCurrentUser() {
  return Storage.get('user', null);
}

// 检查是否已登录，未登录跳转登录页
function requireLogin() {
  var user = getCurrentUser();
  if (!user) {
    location.href = 'login.html';
    return null;
  }
  return user;
}
