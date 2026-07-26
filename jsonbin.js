// ========== jsonbin.js ==========
// JSONBin.io 云数据库 - 浏览器端
// 全设备同步共享数据库

(function() {
  var BIN = {
    accounts:      '6a65e881da38895dfe9179f4',
    registrations: '6a65e8d0da38895dfe917af6',
    villages:      '6a65e8ffda38895dfe917bd0',
    roles:         '6a65e932f5f4af5e29c2f289'
  };
  var MASTER_KEY = '$2a$10$Jp5qaeJY5pMYvvFKg4O/1uKEIpZqkY1xzpUx8BWfPLrOy9HtsXRS2';
  var pending = 0;

  // 劫持 localStorage.setItem：village_ 前缀 key 自动推送云端（合并式同步）
  (function() {
    var _origSet = localStorage.setItem.bind(localStorage);
    var _timers = {};
    localStorage.setItem = function(k, v) {
      _origSet(k, v);
      if (typeof k === 'string' && k.indexOf('village_') === 0) {
        var binName = k.substring(8);
        if (BIN[binName] && !_timers[k]) {
          _timers[k] = setTimeout(function() {
            _timers[k] = null;
            var local = localStorage.getItem(k);
            if (!local) return;
            var data; try { data = JSON.parse(local); } catch(e) { return; }
            cloudPut(BIN[binName], data, function() {});
          }, 500);
        }
      }
    };
  })();

  // 状态角标
  function showStatus(msg, color) {
    var el = document.getElementById('cloudStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cloudStatus';
      el.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:99999;font-size:11px;padding:4px 8px;border-radius:12px;background:rgba(0,0,0,0.7);color:#fff;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = color || 'rgba(0,0,0,0.7)';
  }

  // GET
  function cloudGet(binId, cb) {
    pending++;
    showStatus('云端加载中...', '#FF9800');
    fetch('https://api.jsonbin.io/v3/b/' + binId + '/latest', {
      headers: { 'X-Master-Key': MASTER_KEY, 'X-Bin-Private': 'false' }
    }).then(function(r) { return r.json(); })
      .then(function(data) {
        pending--;
        if (pending === 0) showStatus('云端已连接', '#4CAF50');
        setTimeout(function() { var el = document.getElementById('cloudStatus'); if (el) el.remove(); }, 2000);
        cb(data && data.record ? data.record : null);
      })
      .catch(function(e) {
        pending--;
        if (pending === 0) showStatus('离线模式', '#F44336');
        cb(null);
      });
  }

  // PUT
  function cloudPut(binId, data, cb) {
    pending++;
    showStatus('同步云端...', '#FF9800');
    fetch('https://api.jsonbin.io/v3/b/' + binId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY, 'X-Bin-Private': 'false' },
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); })
      .then(function(ret) {
        pending--;
        if (pending === 0) { showStatus('已同步', '#4CAF50'); setTimeout(function() { var el = document.getElementById('cloudStatus'); if (el) el.remove(); }, 2000); }
        if (cb) cb(true, ret);
      })
      .catch(function(e) {
        pending--;
        showStatus('同步失败', '#F44336');
        if (cb) cb(false);
      });
  }

  // localStorage 封装
  function g(k, def) {
    try {
      var v = localStorage.getItem('village_' + k);
      return v ? JSON.parse(v) : def;
    } catch(e) { return def; }
  }

  function s(k, v) {
    localStorage.setItem('village_' + k, JSON.stringify(v));
  }

  // ========== accounts ==========
  window.JB_accounts = {
    getAll: function(cb) { cloudGet(BIN.accounts, cb); },
    find: function(cb, accountOrPhone) {
      cloudGet(BIN.accounts, function(data) {
        if (!data) { cb(null); return; }
        for (var i = 0; i < data.items.length; i++) {
          var x = data.items[i];
          if (x.account === accountOrPhone || x.phone === accountOrPhone) { cb(x); return; }
        }
        cb(null);
      });
    },
    create: function(cb, accountData) {
      cloudGet(BIN.accounts, function(data) {
        data = data || { nextId: 1, items: [] };
        accountData.id = 'acc_' + Date.now();
        accountData.createTime = Date.now();
        data.items.push(accountData);
        data.nextId++;
        cloudPut(BIN.accounts, data, function(ok) {
          s('accounts', data);
          cb(ok, accountData.id);
        });
      });
    },
    update: function(cb, id, updates) {
      cloudGet(BIN.accounts, function(data) {
        if (!data) { if (cb) cb(false); return; }
        for (var i = 0; i < data.items.length; i++) {
          if (data.items[i].id === id) {
            for (var k in updates) data.items[i][k] = updates[k];
            break;
          }
        }
        cloudPut(BIN.accounts, data, function(ok) {
          s('accounts', data);
          if (cb) cb(ok);
        });
      });
    },
    delete: function(cb, id) {
      cloudGet(BIN.accounts, function(data) {
        if (!data) { if (cb) cb(false); return; }
        data.items = data.items.filter(function(x) { return x.id !== id; });
        cloudPut(BIN.accounts, data, function(ok) {
          s('accounts', data);
          if (cb) cb(ok);
        });
      });
    }
  };

  // ========== registrations ==========
  window.JB_registrations = {
    getAll: function(cb) { cloudGet(BIN.registrations, cb); },
    create: function(cb, regData) {
      cloudGet(BIN.registrations, function(data) {
        data = data || { nextId: 1, items: [] };
        regData.id = 'reg_' + Date.now();
        regData.status = '待审核';
        regData.applyTime = Date.now();
        data.items.push(regData);
        data.nextId++;
        cloudPut(BIN.registrations, data, function(ok) {
          s('registrations', data);
          cb(ok, regData.id);
        });
      });
    },
    update: function(cb, id, updates) {
      cloudGet(BIN.registrations, function(data) {
        if (!data) { if (cb) cb(false); return; }
        for (var i = 0; i < data.items.length; i++) {
          if (data.items[i].id === id) {
            for (var k in updates) data.items[i][k] = updates[k];
            break;
          }
        }
        cloudPut(BIN.registrations, data, function(ok) {
          s('registrations', data);
          if (cb) cb(ok);
        });
      });
    },
    delete: function(cb, id) {
      cloudGet(BIN.registrations, function(data) {
        if (!data) { if (cb) cb(false); return; }
        data.items = data.items.filter(function(x) { return x.id !== id; });
        cloudPut(BIN.registrations, data, function(ok) {
          s('registrations', data);
          if (cb) cb(ok);
        });
      });
    }
  };

  // ========== villages ==========
  window.JB_villages = {
    getAll: function(cb) { cloudGet(BIN.villages, cb); },
    create: function(cb, vData) {
      cloudGet(BIN.villages, function(data) {
        data = data || { nextId: 1, items: [] };
        vData.id = 'v_' + Date.now();
        vData.createTime = Date.now();
        data.items.push(vData);
        data.nextId++;
        cloudPut(BIN.villages, data, function(ok) {
          s('villages', data);
          cb(ok, vData.id);
        });
      });
    },
    update: function(cb, id, updates) {
      cloudGet(BIN.villages, function(data) {
        if (!data) { if (cb) cb(false); return; }
        for (var i = 0; i < data.items.length; i++) {
          if (data.items[i].id === id) {
            for (var k in updates) data.items[i][k] = updates[k];
            break;
          }
        }
        cloudPut(BIN.villages, data, function(ok) {
          s('villages', data);
          if (cb) cb(ok);
        });
      });
    },
    delete: function(cb, id) {
      cloudGet(BIN.villages, function(data) {
        if (!data) { if (cb) cb(false); return; }
        data.items = data.items.filter(function(x) { return x.id !== id; });
        cloudPut(BIN.villages, data, function(ok) {
          s('villages', data);
          if (cb) cb(ok);
        });
      });
    }
  };

  // ========== roles ==========
  window.JB_roles = {
    getAll: function(cb) { cloudGet(BIN.roles, cb); },
    getApproved: function(cb) {
      cloudGet(BIN.roles, function(data) {
        if (!data) { cb([]); return; }
        cb(data.items.filter(function(x) { return x.status === '已通过'; }));
      });
    },
    create: function(cb, roleData) {
      cloudGet(BIN.roles, function(data) {
        data = data || { nextId: 1, items: [] };
        roleData.id = 'role_' + Date.now();
        roleData.status = '已通过';
        roleData.approveTime = Date.now();
        data.items.push(roleData);
        data.nextId++;
        cloudPut(BIN.roles, data, function(ok) {
          s('roles', data);
          cb(ok, roleData.id);
        });
      });
    },
    update: function(cb, id, updates) {
      cloudGet(BIN.roles, function(data) {
        if (!data) { if (cb) cb(false); return; }
        for (var i = 0; i < data.items.length; i++) {
          if (data.items[i].id === id) {
            for (var k in updates) data.items[i][k] = updates[k];
            break;
          }
        }
        cloudPut(BIN.roles, data, function(ok) {
          s('roles', data);
          if (cb) cb(ok);
        });
      });
    },
    delete: function(cb, id) {
      cloudGet(BIN.roles, function(data) {
        if (!data) { if (cb) cb(false); return; }
        data.items = data.items.filter(function(x) { return x.id !== id; });
        cloudPut(BIN.roles, data, function(ok) {
          s('roles', data);
          if (cb) cb(ok);
        });
      });
    }
  };

  // 启动：从云端拉取全部数据写入 localStorage，然后调用页面 init
  // 同步策略：云端优先；云端空但本地有数据时，把本地推到云端（migrate），不覆盖本地；都空才写空
  window.JB_init = function() {
    JB_accounts.getAll(function(data) {
      var la = g('accounts');
      if (data && data.items && data.items.length) s('accounts', data);
      else if (la && la.items && la.items.length) cloudPut(BIN.accounts, la, function(){});
      else s('accounts', { nextId: 1, items: [] });
      JB_registrations.getAll(function(data2) {
        var lr = g('registrations');
        if (data2 && data2.items && data2.items.length) s('registrations', data2);
        else if (lr && lr.items && lr.items.length) cloudPut(BIN.registrations, lr, function(){});
        else s('registrations', { nextId: 1, items: [] });
        JB_villages.getAll(function(data3) {
          var lv = g('villages');
          if (data3 && data3.items && data3.items.length) s('villages', data3);
          else if (lv && lv.items && lv.items.length) cloudPut(BIN.villages, lv, function(){});
          else s('villages', { nextId: 1, items: [] });
          JB_roles.getAll(function(data4) {
            var lo = g('roles');
            if (data4 && data4.items && data4.items.length) s('roles', data4);
            else if (lo && lo.items && lo.items.length) cloudPut(BIN.roles, lo, function(){});
            else s('roles', { nextId: 1, items: [] });
            if (typeof window.onJBReady === 'function') window.onJBReady();
          });
        });
      });
    });
  };

})();
