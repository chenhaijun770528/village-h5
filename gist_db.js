/**
 * GistDB - GitHub Gist 当数据库
 * Gist ID: ed0e2614049e613d382f94458d9022f1
 * 用 raw.githubusercontent.com 读取（支持CORS），API 写入
 */
(function() {
  var GIST_ID = 'ed0e2614049e613d382f94458d9022f1';
  var TOKEN = window.GIST_TOKEN || '';
  var RAW_BASE = 'https://gist.githubusercontent.com/chenhaijun770528/' + GIST_ID + '/raw';
  var API_BASE = 'https://api.github.com/gists/' + GIST_ID;
  var OWNER = 'chenhaijun770528';
  var REPO = 'village-h5'; // 用于存储版本号的仓库
  var VERSION_KEY = 'gist_version';
  var _cache = {};
  var _callbacks = [];
  var _ready = false;
  var _pending = [];
  var _version = null;

  // 内部：版本号存储在仓库的 data/version.txt 文件
  var VERSION_RAW = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/main/data/version.txt';

  // 初始化：从仓库获取当前版本号，再拉gist数据
  function init(callback) {
    _callbacks.push(callback);
    if (_ready) {
      setTimeout(function() { runCallbacks(); }, 0);
      return;
    }
    // 拉取gist获取当前所有文件
    fetchGist(function(gist) {
      if (!gist || !gist.files) {
        runCallbacks();
        return;
      }
      _cache = {};
      for (var fname in gist.files) {
        var f = gist.files[fname];
        if (f.content !== undefined) {
          try {
            _cache[f.filename] = JSON.parse(f.content);
          } catch(e) {
            _cache[f.filename] = f.content;
          }
        }
      }
      _version = gist.version;
      _ready = true;
      runCallbacks();
    });
  }

  function runCallbacks() {
    var cbs = _callbacks.splice(0);
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](_cache); } catch(e) {}
    }
  }

  // 读取：先从内存cache（已加载），有callback则异步刷新
  function get(key, callback) {
    if (callback) {
      // 异步刷新
      fetchFile(key, function(data) {
        _cache[key] = data;
        callback(data);
      });
    } else {
      return _cache[key];
    }
  }

  // 设置并保存到gist
  function set(key, data, callback) {
    _cache[key] = data;
    save(key, callback);
  }

  // 推单个文件到gist
  function save(key, callback) {
    var body = {
      description: '村庄H5数据库 - Village H5 Database',
      files: {}
    };
    body.files[key] = {
      content: JSON.stringify(_cache[key], null, 2)
    };
    // 带上当前版本做乐观锁
    if (_version) {
      // GitHub Gist PATCH 不支持 if-match，用覆盖策略
    }
    var xhr = new XMLHttpRequest();
    xhr.open('PATCH', API_BASE, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + TOKEN);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var resp = JSON.parse(xhr.responseText);
          _version = resp.version;
          // 更新 _cache 里所有文件（因为PATCH会更新整个gist）
          for (var fname in resp.files) {
            var f = resp.files[fname];
            if (f.content !== undefined) {
              try {
                _cache[fname] = JSON.parse(f.content);
              } catch(e) {
                _cache[fname] = f.content;
              }
            }
          }
          // 同时更新 _cache[key] 用最新版本
          if (resp.files[key] && resp.files[key].raw_url) {
            // raw_url会变化但内容已是最新
          }
          if (callback) callback({ ok: true, version: _version });
        } else {
          console.error('GistDB save error:', xhr.status, xhr.responseText);
          if (callback) callback({ ok: false, error: xhr.status });
        }
      }
    };
    xhr.send(JSON.stringify(body));
  }

  // 删除gist中一个文件
  function remove(key, callback) {
    var body = {
      description: '村庄H5数据库 - Village H5 Database',
      files: {}
    };
    body.files[key] = null; // GitHub Gist API 支持设为null删除
    var xhr = new XMLHttpRequest();
    xhr.open('PATCH', API_BASE, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + TOKEN);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        delete _cache[key];
        if (callback) callback({ ok: true });
      } else if (xhr.readyState === 4) {
        if (callback) callback({ ok: false, error: xhr.status });
      }
    };
    xhr.send(JSON.stringify(body));
  }

  // fetchGist: 获取gist完整信息（带version）
  function fetchGist(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + TOKEN);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            callback(JSON.parse(xhr.responseText));
          } catch(e) {
            callback(null);
          }
        } else {
          console.error('GistDB fetchGist error:', xhr.status);
          callback(null);
        }
      }
    };
    xhr.send();
  }

  // fetchFile: 用 raw URL 读取单个文件（支持CORS）
  function fetchFile(key, callback) {
    // 用 raw URL 读取，绕过API的CORS限制
    var url = RAW_BASE + '/' + key + '?t=' + Date.now();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            callback(JSON.parse(xhr.responseText));
          } catch(e) {
            callback(xhr.responseText);
          }
        } else {
          // fallback：用API获取gist
          fetchGist(function(gist) {
            if (gist && gist.files && gist.files[key]) {
              try {
                callback(JSON.parse(gist.files[key].content));
              } catch(e) {
                callback(gist.files[key].content);
              }
            } else {
              callback(null);
            }
          });
        }
      }
    };
    xhr.send();
  }

  // 监听 localStorage.setItem，village_ 前缀自动同步到gist
  var _origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, val) {
    _origSetItem(key, val);
    // 不自动推云端（因为gist是共享数据库，写入会覆盖他人数据）
    // 由页面逻辑显式调用 set() 来同步
  };

  // 暴露全局
  window.GistDB = {
    init: init,
    get: get,
    set: set,
    remove: remove,
    ready: function() { return _ready; }
  };
})();
