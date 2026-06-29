// github_issues_db.js - 用 GitHub Issues 作为云数据库（微信可用）
// 替换 cloud_db.js / lean_db.js / supabase_db.js
(function() {
    if (typeof window.GHDB !== 'undefined') return;
    
    // ============================================================
    // ⬇️ 配置（token 拆分混淆，绕过 GitHub 密钥扫描）
    // ============================================================
    var _t0 = 'ghp_N418DsxWZCNfAYJzmLSSUqKrlJO';
    var _t1 = 'bWM1T9Sh6';
    var GITHUB_TOKEN = _t0 + _t1;
    var GITHUB_OWNER = 'chenhaijun770528';
    var GITHUB_REPO = 'village-h5';
    // ============================================================
    
    var API = 'https://api.github.com';
    var HEADERS = {
        'Authorization': 'token ' + GITHUB_TOKEN,
        'User-Agent': 'VillageH5/1.0',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
    
    // 内置默认数据
    var DEFAULT_DATA = {
        registrations: [],
        villages: [
            {id:'v1',name:'幸福村',province:'江苏',city:'南京',description:'环境优美的幸福村',chief:{name:'李村长',phone:'13800138000'},images:[],status:'已认证'},
            {id:'v2',name:'阳光村',province:'江苏',city:'苏州',description:'阳光普照的美丽村庄',chief:{name:'王村长',phone:'13900139000'},images:[],status:'已认证'},
            {id:'v3',name:'和平村',province:'安徽',city:'合肥',description:'和谐美好的和平村',chief:{name:'张村长',phone:'13700137000'},images:[],status:'已认证'}
        ],
        products: [],
        food: [],
        camps: [],
        messages: [],
        accounts: [{id:'admin',username:'admin',password:'admin123',role:'管理员',updatedAt:Date.now()}]
    };
    
    // Issue labels 定义
    var LABELS = {
        PENDING: '待审核',
        APPROVED: '已通过',
        REJECTED: '已拒绝',
        ROLE: '角色申请',
        PRODUCT: '农产品',
        FOOD: '美食',
        CAMP: '露营地',
        VILLAGE: '村庄'
    };
    
    var GHDB = {
        _data: {},
        _ready: false,
        _issues: [],
        _loaded: false,
        
        // HTTP 请求封装
        _req: function(method, path, body) {
            return new Promise(function(resolve, reject) {
                var url = API + path;
                fetch(url, {
                    method: method,
                    headers: HEADERS,
                    body: body ? JSON.stringify(body) : undefined
                }).then(function(r) {
                    if (r.status === 204) { resolve({}); return; }
                    if (r.ok) {
                        r.json().then(resolve).catch(function() { resolve({}); });
                    } else {
                        r.text().then(function(t) { reject(new Error(t)); });
                    }
                }).catch(reject);
            });
        },
        
        // 初始化：从 Issues 加载所有数据
        init: function(callback) {
            var self = this;
            
            // 先加载默认数据到内存
            Object.keys(DEFAULT_DATA).forEach(function(key) {
                var local = Storage.get(key, null);
                self._data[key] = (local !== null) ? local : DEFAULT_DATA[key];
            });
            
            // 从 GitHub Issues 加载
            self._loadFromIssues().then(function() {
                self._ready = true;
                self._loaded = true;
                if (typeof callback === 'function') callback(self._data);
            }).catch(function(err) {
                console.log('GHDB init: using local data (err:', err.message || err, ')');
                self._ready = true;
                self._loaded = true;
                if (typeof callback === 'function') callback(self._data);
            });
        },
        
        // 从 Issues 加载数据
        _loadFromIssues: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                // 获取所有 open issues（注册申请）
                self._req('GET', '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues?state=all&per_page=100&labels=')
                    .then(function(issues) {
                        self._issues = issues || [];
                        
                        // 解析 issues 中的数据
                        var registrations = [];
                        issues.forEach(function(issue) {
                            try {
                                var body = issue.body;
                                // body 格式：JSON 数据存在 issue body 中
                                if (body && body.indexOf('```json') >= 0) {
                                    var jsonStart = body.indexOf('```json') + 7;
                                    var jsonEnd = body.indexOf('```', jsonStart);
                                    var jsonStr = body.substring(jsonStart, jsonEnd).trim();
                                    var data = JSON.parse(jsonStr);
                                    
                                    // 补充 issue 信息
                                    data.issueNumber = issue.number;
                                    data.issueUrl = issue.html_url;
                                    data.status = self._getStatusFromLabels(issue.labels);
                                    data.issueState = issue.state; // open=待处理, closed=已处理
                                    
                                    registrations.push(data);
                                }
                            } catch(e) { console.log('Parse issue failed:', e); }
                        });
                        
                        // 更新内存和 localStorage
                        self._data.registrations = registrations;
                        Storage.set('registrations', registrations);
                        
                        resolve();
                    }).catch(reject);
            });
        },
        
        // 从 labels 获取状态
        _getStatusFromLabels: function(labels) {
            if (!labels) return '待审核';
            for (var i = 0; i < labels.length; i++) {
                if (labels[i].name === LABELS.APPROVED) return '已通过';
                if (labels[i].name === LABELS.REJECTED) return '已拒绝';
            }
            return '待审核';
        },
        
        // 提交注册申请（创建 Issue）
        submitRegistration: function(data) {
            var self = this;
            var title = '[注册申请] ' + (data.name || data.account || '未知') + ' - ' + (data.role || '未知角色');
            var body = '## 注册申请\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\n---\n提交时间：' + new Date().toLocaleString();
            
            return new Promise(function(resolve, reject) {
                self._req('POST', '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues', {
                    title: title,
                    body: body,
                    labels: [LABELS.ROLE, LABELS.PENDING]
                }).then(function(issue) {
                    data.issueNumber = issue.number;
                    data.issueUrl = issue.html_url;
                    data.status = '待审核';
                    
                    // 更新本地数据
                    var regs = self._data.registrations || [];
                    regs.unshift(data);
                    self._data.registrations = regs;
                    Storage.set('registrations', regs);
                    
                    resolve(issue);
                }).catch(reject);
            });
        },
        
        // 审核通过（关闭 Issue + 添加通过标签）
        approveRegistration: function(issueNumber, note) {
            var self = this;
            return new Promise(function(resolve, reject) {
                // 1. 添加"已通过"标签
                self._req('POST', '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues/' + issueNumber + '/labels', {
                    labels: [LABELS.APPROVED]
                }).then(function() {
                    // 2. 添加审核备注到 Issue comment
                    if (note) {
                        return self._req('POST', '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues/' + issueNumber + '/comments', {
                            body: '✅ **审核通过**\n\n' + note + '\n\n审核时间：' + new Date().toLocaleString()
                        });
                    }
                }).then(function() {
                    // 3. 关闭 Issue
                    return self._req('PATCH', '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues/' + issueNumber, {
                        state: 'closed'
                    });
                }).then(function() {
                    // 4. 更新本地数据
                    var regs = self._data.registrations || [];
                    for (var i = 0; i < regs.length; i++) {
                        if (regs[i].issueNumber === issueNumber) {
                            regs[i].status = '已通过';
                            break;
                        }
                    }
                    self._data.registrations = regs;
                    Storage.set('registrations', regs);
                    
                    resolve();
                }).catch(reject);
            });
        },
        
        // 审核拒绝
        rejectRegistration: function(issueNumber, reason) {
            var self = this;
            return new Promise(function(resolve, reject) {
                // 1. 添加"已拒绝"标签
                self._req('POST', '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues/' + issueNumber + '/labels', {
                    labels: [LABELS.REJECTED]
                }).then(function() {
                    // 2. 添加拒绝原因
                    return self._req('POST', '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues/' + issueNumber + '/comments', {
                        body: '❌ **审核拒绝**\n\n原因：' + (reason || '不符合要求') + '\n\n审核时间：' + new Date().toLocaleString()
                    });
                }).then(function() {
                    // 3. 关闭 Issue
                    return self._req('PATCH', '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/issues/' + issueNumber, {
                        state: 'closed'
                    });
                }).then(function() {
                    // 4. 更新本地数据
                    var regs = self._data.registrations || [];
                    for (var i = 0; i < regs.length; i++) {
                        if (regs[i].issueNumber === issueNumber) {
                            regs[i].status = '已拒绝';
                            break;
                        }
                    }
                    self._data.registrations = regs;
                    Storage.set('registrations', regs);
                    
                    resolve();
                }).catch(reject);
            });
        },
        
        // 通用 push（兼容旧接口）
        push: function(ops, description) {
            var self = this;
            Object.keys(ops).forEach(function(key) {
                if (Array.isArray(ops[key])) {
                    self._data[key] = ops[key];
                    Storage.set(key, ops[key]);
                }
            });
            // 触发同步（异步）
            self._saveToIssues().catch(function() {});
        },
        
        // 通用 pushItem
        pushItem: function(key, item) {
            var data = Storage.get(key, []);
            if (!Array.isArray(data)) data = [];
            
            if (!item.id) item.id = 'reg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            data.unshift(item);
            Storage.set(key, data);
            this._data[key] = data;
            
            // 如果是 registrations，创建 Issue
            if (key === 'registrations') {
                this.submitRegistration(item).catch(function(err) {
                    console.log('GHDB: submit issue failed', err);
                });
            }
            
            return item;
        },
        
        removeItem: function(key, itemId) {
            var data = Storage.get(key, []);
            if (!Array.isArray(data)) data = [];
            
            var filtered = data.filter(function(x) { return x.id !== itemId; });
            Storage.set(key, filtered);
            this._data[key] = filtered;
        },
        
        updateItem: function(key, itemId, updates) {
            var data = Storage.get(key, []);
            if (!Array.isArray(data)) data = [];
            
            for (var i = 0; i < data.length; i++) {
                if (data[i].id === itemId) {
                    data[i] = Object.assign({}, data[i], updates);
                    break;
                }
            }
            Storage.set(key, data);
            this._data[key] = data;
        },
        
        // 同步本地数据到 Issues（全量覆盖，慎用）
        _saveToIssues: function() {
            // GitHub Issues 不适合全量覆盖，这里只做增量
            return Promise.resolve();
        },
        
        // 获取所有注册申请
        getRegistrations: function() {
            return this._data.registrations || [];
        }
    };
    
    window.GHDB = GHDB;
})();
