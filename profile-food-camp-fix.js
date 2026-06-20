// profile-food-camp-fix.js
// 覆盖美食/露营地申请函数 + 修复村主任审核函数
// 依赖 profile-product-fix.js 先加载

// ===== 美食申请（完整表单+图片）=====
var _foodImages = [];

window.applyFood = function(editId) {
  _foodImages = [];
  var isEdit = !!editId;
  var editData = null;
  if (isEdit) {
    var apps = Storage.get('food_applications', []);
    for (var i = 0; i < apps.length; i++) {
      if (apps[i].id === editId) { editData = apps[i]; break; }
    }
    if (editData && editData.images) {
      _foodImages = [];
      for (var k = 0; k < editData.images.length; k++) _foodImages.push(editData.images[k]);
    }
  }
  var currentUser = Storage.get('user', null);
  if (!currentUser) { alert('请先登录'); return; }
  var myReg = null;
  var regs = Storage.get('registrations', []);
  for (var j = 0; j < regs.length; j++) {
    if (regs[j].account === currentUser.account && regs[j].role === '村民') { myReg = regs[j]; break; }
  }

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'background:white;min-height:100%;padding:16px;';
  overlay.appendChild(wrap);

  var title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:16px;font-size:16px;';
  title.textContent = isEdit ? '编辑美食' : '申请上架美食';
  wrap.appendChild(title);

  // 名称
  var lb1 = document.createElement('label');
  lb1.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb1.textContent = '美食名称 *';
  wrap.appendChild(lb1);
  var inp1 = document.createElement('input');
  inp1.id = 'fName'; inp1.type = 'text';
  inp1.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:12px;';
  if (editData) inp1.value = editData.name;
  wrap.appendChild(inp1);

  // 价格 + 单位
  var row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;gap:10px;margin-bottom:12px;';
  var col1 = document.createElement('div'); col1.style.cssText = 'flex:1;';
  var lb2 = document.createElement('label');
  lb2.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb2.textContent = '价格（元）*';
  col1.appendChild(lb2);
  var inp2 = document.createElement('input');
  inp2.id = 'fPrice'; inp2.type = 'number';
  inp2.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;';
  if (editData) inp2.value = editData.price;
  col1.appendChild(inp2);
  var col2 = document.createElement('div'); col2.style.cssText = 'flex:1;';
  var lb3 = document.createElement('label');
  lb3.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb3.textContent = '单位';
  col2.appendChild(lb3);
  var inp3 = document.createElement('input');
  inp3.id = 'fUnit'; inp3.type = 'text';
  inp3.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;';
  inp3.value = editData ? editData.unit : '份';
  col2.appendChild(inp3);
  row1.appendChild(col1); row1.appendChild(col2);
  wrap.appendChild(row1);

  // 库存
  var lb4 = document.createElement('label');
  lb4.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb4.textContent = '每日供应量';
  wrap.appendChild(lb4);
  var inp4 = document.createElement('input');
  inp4.id = 'fStock'; inp4.type = 'number';
  inp4.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:12px;';
  if (editData) inp4.value = editData.stock; else inp4.value = '10';
  wrap.appendChild(inp4);

  // 描述
  var lb5 = document.createElement('label');
  lb5.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb5.textContent = '描述';
  wrap.appendChild(lb5);
  var txt1 = document.createElement('textarea');
  txt1.id = 'fDesc'; txt1.rows = 3;
  txt1.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;margin-bottom:12px;';
  if (editData && editData.description) txt1.value = editData.description;
  wrap.appendChild(txt1);

  // 图片
  var lb6 = document.createElement('label');
  lb6.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:6px;';
  lb6.textContent = '美食图片（最多6张）';
  wrap.appendChild(lb6);
  var preview = document.createElement('div');
  preview.id = 'foodImgPreview';
  preview.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;';
  function renderFoodPrev() {
    while (preview.firstChild) preview.removeChild(preview.firstChild);
    for (var ii = 0; ii < _foodImages.length; ii++) {
      (function(idx) {
        var d = document.createElement('div');
        d.style.cssText = 'position:relative;width:60px;height:60px;';
        var im = document.createElement('img');
        im.src = _foodImages[idx];
        im.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:6px;';
        d.appendChild(im);
        var sp = document.createElement('span');
        sp.textContent = '×';
        sp.style.cssText = 'position:absolute;top:-4px;right:-4px;width:18px;height:18px;background:#F44336;color:white;border-radius:50%;text-align:center;line-height:18px;font-size:12px;cursor:pointer;';
        sp.onclick = function() { _foodImages.splice(idx, 1); renderFoodPrev(); };
        d.appendChild(sp);
        preview.appendChild(d);
      })(ii);
    }
  }
  renderFoodPrev();
  wrap.appendChild(preview);

  var fInput = document.createElement('input');
  fInput.type = 'file'; fInput.accept = 'image/*'; fInput.multiple = true;
  fInput.style.display = 'none';
  fInput.onchange = function(e) {
    var files = e.target.files;
    for (var fi = 0; fi < files.length && _foodImages.length < 6; fi++) {
      (function(f) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          var img = new Image();
          img.onload = function() {
            var canvas = document.createElement('canvas');
            var w = img.width, h = img.height;
            if (w > 800) { h = h * 800 / w; w = 800; }
            if (h > 600) { w = w * 600 / h; h = 600; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            _foodImages.push(canvas.toDataURL('image/jpeg', 0.7));
            renderFoodPrev();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(f);
      })(files[fi]);
    }
    this.value = '';
  };
  wrap.appendChild(fInput);

  var upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.textContent = '+ 上传图片';
  upBtn.style.cssText = 'padding:8px 14px;background:#f5f5f5;color:#666;border:1px dashed #ccc;border-radius:6px;font-size:12px;cursor:pointer;margin-bottom:16px;';
  upBtn.onclick = function() { fInput.click(); };
  wrap.appendChild(upBtn);

  // 按钮行
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;';
  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '取消';
  cancelBtn.style.cssText = 'flex:1;padding:10px;background:#f5f5f5;color:#666;border:none;border-radius:8px;font-size:14px;cursor:pointer;';
  cancelBtn.onclick = function() { overlay.remove(); };
  var submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.textContent = isEdit ? '保存修改' : '提交审核';
  submitBtn.style.cssText = 'flex:1;padding:10px;background:#FF9800;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;';
  submitBtn.onclick = function() {
    var name = document.getElementById('fName').value.trim();
    var price = parseFloat(document.getElementById('fPrice').value);
    var unit = document.getElementById('fUnit').value.trim() || '份';
    var stock = parseInt(document.getElementById('fStock').value) || 0;
    var desc = document.getElementById('fDesc').value.trim();
    if (!name) { alert('请填写美食名称'); return; }
    if (!price || price <= 0) { alert('请填写有效价格'); return; }
    var app = {
      id: editId || ('food_' + Date.now()),
      name: name, price: price, unit: unit, stock: stock,
      description: desc,
      images: _foodImages.length > 0 ? _foodImages : undefined,
      sellerId: currentUser.account,
      sellerName: currentUser.currentRoleName || '',
      village: myReg ? myReg.village : '',
      status: '待审核',
      createTime: new Date().toISOString()
    };
    var apps = Storage.get('food_applications', []);
    if (editId) {
      var fidx = -1;
      for (var fi = 0; fi < apps.length; fi++) { if (apps[fi].id === editId) { fidx = fi; break; } }
      if (fidx > -1) apps[fidx] = app;
    } else {
      apps.push(app);
    }
    Storage.set('food_applications', apps);
    alert(isEdit ? '修改已保存，已重新提交审核' : '美食申请已提交，等待村主任审核');
    location.reload();
  };
  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(submitBtn);
  wrap.appendChild(btnRow);

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;background:#f5f5f5;font-size:20px;cursor:pointer;';
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
};

// ===== 美食列表（带编辑/删除）=====
window.showFoodApps = function() {
  var currentUser = Storage.get('user', null);
  if (!currentUser) { alert('请先登录'); return; }
  var apps = [];
  var allApps = Storage.get('food_applications', []);
  for (var i = 0; i < allApps.length; i++) {
    if (allApps[i].sellerId === currentUser.account) apps.push(allApps[i]);
  }
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'background:white;min-height:100%;padding:16px;';
  overlay.appendChild(wrap);
  var title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:16px;font-size:16px;';
  title.textContent = '🍲 我的美食';
  wrap.appendChild(title);
  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ 申请上架美食';
  addBtn.style.cssText = 'width:100%;padding:12px;background:#FF9800;color:white;border:none;border-radius:8px;margin-bottom:16px;font-size:14px;cursor:pointer;';
  addBtn.onclick = function() { overlay.remove(); window.applyFood(); };
  wrap.appendChild(addBtn);
  if (apps.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:40px;color:#999;';
    empty.textContent = '暂无美食申请';
    wrap.appendChild(empty);
  } else {
    for (var j = 0; j < apps.length; j++) {
      (function(p) {
        var statusColor = p.status === '已通过' ? '#4CAF50' : (p.status === '待审核' ? '#FF9800' : '#F44336');
        var card = document.createElement('div');
        card.style.cssText = 'background:white;padding:12px;border-radius:8px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        var topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;';
        var info = document.createElement('div');
        info.style.cssText = 'flex:1;';
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-weight:bold;';
        nameEl.textContent = p.name;
        info.appendChild(nameEl);
        var priceEl = document.createElement('div');
        priceEl.style.cssText = 'color:#666;font-size:12px;margin-top:4px;';
        priceEl.textContent = '¥' + p.price + '/' + p.unit + ' · 每日供' + p.stock;
        info.appendChild(priceEl);
        if (p.description) {
          var descEl = document.createElement('div');
          descEl.style.cssText = 'color:#999;font-size:11px;margin-top:4px;';
          descEl.textContent = p.description;
          info.appendChild(descEl);
        }
        topRow.appendChild(info);
        var rightCol = document.createElement('div');
        rightCol.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-left:10px;';
        var statusEl = document.createElement('span');
        statusEl.style.cssText = 'color:' + statusColor + ';font-size:12px;white-space:nowrap;';
        statusEl.textContent = p.status;
        rightCol.appendChild(statusEl);
        if (p.status === '待审核' || p.status === '已拒绝') {
          var editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.textContent = '编辑';
          editBtn.style.cssText = 'padding:4px 10px;background:#FF9800;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;';
          editBtn.onclick = function() { overlay.remove(); window.applyFood(p.id); };
          rightCol.appendChild(editBtn);
        }
        if (p.status === '待审核') {
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.textContent = '删除';
          delBtn.style.cssText = 'padding:4px 10px;background:#ccc;color:#666;border:none;border-radius:4px;font-size:11px;cursor:pointer;';
          delBtn.onclick = function() { window.deleteFood(p.id); };
          rightCol.appendChild(delBtn);
        }
        topRow.appendChild(rightCol);
        card.appendChild(topRow);
        wrap.appendChild(card);
      })(apps[j]);
    }
  }
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;background:#f5f5f5;font-size:20px;cursor:pointer;';
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
};

window.deleteFood = function(id) {
  if (!confirm('确定删除这个申请？')) return;
  var apps = Storage.get('food_applications', []);
  var filtered = [];
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].id !== id) filtered.push(apps[i]);
  }
  Storage.set('food_applications', filtered);
  alert('已删除');
  location.reload();
};

// ===== 露营地申请（完整表单+图片）=====
var _campImages = [];

window.applyCamp = function(editId) {
  _campImages = [];
  var isEdit = !!editId;
  var editData = null;
  if (isEdit) {
    var apps = Storage.get('camp_applications', []);
    for (var i = 0; i < apps.length; i++) {
      if (apps[i].id === editId) { editData = apps[i]; break; }
    }
    if (editData && editData.images) {
      _campImages = [];
      for (var k = 0; k < editData.images.length; k++) _campImages.push(editData.images[k]);
    }
  }
  var currentUser = Storage.get('user', null);
  if (!currentUser) { alert('请先登录'); return; }
  var myReg = null;
  var regs = Storage.get('registrations', []);
  for (var j = 0; j < regs.length; j++) {
    if (regs[j].account === currentUser.account && regs[j].role === '村民') { myReg = regs[j]; break; }
  }

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'background:white;min-height:100%;padding:16px;';
  overlay.appendChild(wrap);

  var title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:16px;font-size:16px;';
  title.textContent = isEdit ? '编辑露营地' : '申请上架露营地';
  wrap.appendChild(title);

  var lb1 = document.createElement('label');
  lb1.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb1.textContent = '露营地名称 *';
  wrap.appendChild(lb1);
  var inp1 = document.createElement('input');
  inp1.id = 'cName'; inp1.type = 'text';
  inp1.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:12px;';
  if (editData) inp1.value = editData.name;
  wrap.appendChild(inp1);

  var lb2 = document.createElement('label');
  lb2.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb2.textContent = '价格（元/晚）*';
  wrap.appendChild(lb2);
  var inp2 = document.createElement('input');
  inp2.id = 'cPrice'; inp2.type = 'number';
  inp2.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:12px;';
  if (editData) inp2.value = editData.price;
  wrap.appendChild(inp2);

  var lb3 = document.createElement('label');
  lb3.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb3.textContent = '可接待人数';
  wrap.appendChild(lb3);
  var inp3 = document.createElement('input');
  inp3.id = 'cCapacity'; inp3.type = 'number';
  inp3.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:12px;';
  if (editData) inp3.value = editData.capacity || editData.stock; else inp3.value = '10';
  wrap.appendChild(inp3);

  var lb4 = document.createElement('label');
  lb4.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb4.textContent = '描述';
  wrap.appendChild(lb4);
  var txt1 = document.createElement('textarea');
  txt1.id = 'cDesc'; txt1.rows = 3;
  txt1.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;margin-bottom:12px;';
  if (editData && editData.description) txt1.value = editData.description;
  wrap.appendChild(txt1);

  // 图片
  var lb5 = document.createElement('label');
  lb5.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:6px;';
  lb5.textContent = '露营地图片（最多6张）';
  wrap.appendChild(lb5);
  var preview = document.createElement('div');
  preview.id = 'campImgPreview';
  preview.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;';
  function renderCampPrev() {
    while (preview.firstChild) preview.removeChild(preview.firstChild);
    for (var ii = 0; ii < _campImages.length; ii++) {
      (function(idx) {
        var d = document.createElement('div');
        d.style.cssText = 'position:relative;width:60px;height:60px;';
        var im = document.createElement('img');
        im.src = _campImages[idx];
        im.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:6px;';
        d.appendChild(im);
        var sp = document.createElement('span');
        sp.textContent = '×';
        sp.style.cssText = 'position:absolute;top:-4px;right:-4px;width:18px;height:18px;background:#F44336;color:white;border-radius:50%;text-align:center;line-height:18px;font-size:12px;cursor:pointer;';
        sp.onclick = function() { _campImages.splice(idx, 1); renderCampPrev(); };
        d.appendChild(sp);
        preview.appendChild(d);
      })(ii);
    }
  }
  renderCampPrev();
  wrap.appendChild(preview);

  var fInput = document.createElement('input');
  fInput.type = 'file'; fInput.accept = 'image/*'; fInput.multiple = true;
  fInput.style.display = 'none';
  fInput.onchange = function(e) {
    var files = e.target.files;
    for (var fi = 0; fi < files.length && _campImages.length < 6; fi++) {
      (function(f) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          var img = new Image();
          img.onload = function() {
            var canvas = document.createElement('canvas');
            var w = img.width, h = img.height;
            if (w > 800) { h = h * 800 / w; w = 800; }
            if (h > 600) { w = w * 600 / h; h = 600; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            _campImages.push(canvas.toDataURL('image/jpeg', 0.7));
            renderCampPrev();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(f);
      })(files[fi]);
    }
    this.value = '';
  };
  wrap.appendChild(fInput);

  var upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.textContent = '+ 上传图片';
  upBtn.style.cssText = 'padding:8px 14px;background:#f5f5f5;color:#666;border:1px dashed #ccc;border-radius:6px;font-size:12px;cursor:pointer;margin-bottom:16px;';
  upBtn.onclick = function() { fInput.click(); };
  wrap.appendChild(upBtn);

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;';
  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = '取消';
  cancelBtn.style.cssText = 'flex:1;padding:10px;background:#f5f5f5;color:#666;border:none;border-radius:8px;font-size:14px;cursor:pointer;';
  cancelBtn.onclick = function() { overlay.remove(); };
  var submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.textContent = isEdit ? '保存修改' : '提交审核';
  submitBtn.style.cssText = 'flex:1;padding:10px;background:#2E7D32;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;';
  submitBtn.onclick = function() {
    var name = document.getElementById('cName').value.trim();
    var price = parseFloat(document.getElementById('cPrice').value);
    var capacity = parseInt(document.getElementById('cCapacity').value) || 0;
    var desc = document.getElementById('cDesc').value.trim();
    if (!name) { alert('请填写露营地名称'); return; }
    if (!price || price <= 0) { alert('请填写有效价格'); return; }
    var app = {
      id: editId || ('camp_' + Date.now()),
      name: name, price: price, capacity: capacity,
      description: desc,
      images: _campImages.length > 0 ? _campImages : undefined,
      sellerId: currentUser.account,
      sellerName: currentUser.currentRoleName || '',
      village: myReg ? myReg.village : '',
      status: '待审核',
      createTime: new Date().toISOString()
    };
    var apps = Storage.get('camp_applications', []);
    if (editId) {
      var fidx = -1;
      for (var fi = 0; fi < apps.length; fi++) { if (apps[fi].id === editId) { fidx = fi; break; } }
      if (fidx > -1) apps[fidx] = app;
    } else {
      apps.push(app);
    }
    Storage.set('camp_applications', apps);
    alert(isEdit ? '修改已保存，已重新提交审核' : '露营地申请已提交，等待村主任审核');
    location.reload();
  };
  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(submitBtn);
  wrap.appendChild(btnRow);

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;background:#f5f5f5;font-size:20px;cursor:pointer;';
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
};

// ===== 露营地列表 =====
window.showCampApps = function() {
  var currentUser = Storage.get('user', null);
  if (!currentUser) { alert('请先登录'); return; }
  var apps = [];
  var allApps = Storage.get('camp_applications', []);
  for (var i = 0; i < allApps.length; i++) {
    if (allApps[i].sellerId === currentUser.account) apps.push(allApps[i]);
  }
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'background:white;min-height:100%;padding:16px;';
  overlay.appendChild(wrap);
  var title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:16px;font-size:16px;';
  title.textContent = '🏕️ 我的露营地';
  wrap.appendChild(title);
  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ 申请上架露营地';
  addBtn.style.cssText = 'width:100%;padding:12px;background:#2E7D32;color:white;border:none;border-radius:8px;margin-bottom:16px;font-size:14px;cursor:pointer;';
  addBtn.onclick = function() { overlay.remove(); window.applyCamp(); };
  wrap.appendChild(addBtn);
  if (apps.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:40px;color:#999;';
    empty.textContent = '暂无露营地申请';
    wrap.appendChild(empty);
  } else {
    for (var j = 0; j < apps.length; j++) {
      (function(p) {
        var statusColor = p.status === '已通过' ? '#4CAF50' : (p.status === '待审核' ? '#FF9800' : '#F44336');
        var card = document.createElement('div');
        card.style.cssText = 'background:white;padding:12px;border-radius:8px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        var topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;';
        var info = document.createElement('div');
        info.style.cssText = 'flex:1;';
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-weight:bold;';
        nameEl.textContent = p.name;
        info.appendChild(nameEl);
        var priceEl = document.createElement('div');
        priceEl.style.cssText = 'color:#666;font-size:12px;margin-top:4px;';
        priceEl.textContent = '¥' + p.price + '/晚 · 可接待' + (p.capacity || p.stock || 0) + '人';
        info.appendChild(priceEl);
        if (p.description) {
          var descEl = document.createElement('div');
          descEl.style.cssText = 'color:#999;font-size:11px;margin-top:4px;';
          descEl.textContent = p.description;
          info.appendChild(descEl);
        }
        topRow.appendChild(info);
        var rightCol = document.createElement('div');
        rightCol.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-left:10px;';
        var statusEl = document.createElement('span');
        statusEl.style.cssText = 'color:' + statusColor + ';font-size:12px;white-space:nowrap;';
        statusEl.textContent = p.status;
        rightCol.appendChild(statusEl);
        if (p.status === '待审核' || p.status === '已拒绝') {
          var editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.textContent = '编辑';
          editBtn.style.cssText = 'padding:4px 10px;background:#FF9800;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;';
          editBtn.onclick = function() { overlay.remove(); window.applyCamp(p.id); };
          rightCol.appendChild(editBtn);
        }
        if (p.status === '待审核') {
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.textContent = '删除';
          delBtn.style.cssText = 'padding:4px 10px;background:#ccc;color:#666;border:none;border-radius:4px;font-size:11px;cursor:pointer;';
          delBtn.onclick = function() { window.deleteCamp(p.id); };
          rightCol.appendChild(delBtn);
        }
        topRow.appendChild(rightCol);
        card.appendChild(topRow);
        wrap.appendChild(card);
      })(apps[j]);
    }
  }
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;background:#f5f5f5;font-size:20px;cursor:pointer;';
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
};

window.deleteCamp = function(id) {
  if (!confirm('确定删除这个申请？')) return;
  var apps = Storage.get('camp_applications', []);
  var filtered = [];
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].id !== id) filtered.push(apps[i]);
  }
  Storage.set('camp_applications', filtered);
  alert('已删除');
  location.reload();
};

// ===== 修复村主任审核函数（current_user -> user）=====
window.auditProducts = function() {
  var currentUser = Storage.get('user', null);
  if (!currentUser) { alert('请先登录'); return; }
  var myVillage = null;
  var villages = Storage.get('villages', []);
  for (var i = 0; i < villages.length; i++) {
    if (villages[i].chief && villages[i].chief.name === currentUser.currentRoleName) {
      myVillage = villages[i]; break;
    }
  }
  if (!myVillage) { alert('未找到您的村庄'); return; }
  var apps = [];
  var allApps = Storage.get('product_applications', []);
  for (var j = 0; j < allApps.length; j++) {
    if (allApps[j].village === myVillage.name && allApps[j].status === '待审核') apps.push(allApps[j]);
  }
  // 渲染审核弹窗（复用原有逻辑，用DOM创建）
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'background:white;min-height:100%;padding:16px;';
  overlay.appendChild(wrap);
  var title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:16px;font-size:16px;';
  title.textContent = '🥬 农产品审核 (' + apps.length + ')';
  wrap.appendChild(title);
  if (apps.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:40px;color:#999;';
    empty.textContent = '暂无待审核申请';
    wrap.appendChild(empty);
  } else {
    for (var k = 0; k < apps.length; k++) {
      (function(p) {
        var card = document.createElement('div');
        card.style.cssText = 'background:white;padding:12px;border-radius:8px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-weight:bold;';
        nameEl.textContent = p.name;
        card.appendChild(nameEl);
        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'color:#666;font-size:12px;margin-top:4px;';
        infoEl.textContent = '¥' + p.price + '/' + p.unit + ' · 库存' + p.stock + ' · 申请人:' + p.sellerName;
        card.appendChild(infoEl);
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;margin-top:10px;';
        var appBtn = document.createElement('button');
        appBtn.type = 'button';
        appBtn.textContent = '通过';
        appBtn.style.cssText = 'flex:1;padding:8px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;';
        appBtn.onclick = function() { window.approveProduct(p.id); overlay.remove(); };
        var rejBtn = document.createElement('button');
        rejBtn.type = 'button';
        rejBtn.textContent = '拒绝';
        rejBtn.style.cssText = 'flex:1;padding:8px;background:#F44336;color:white;border:none;border-radius:4px;cursor:pointer;';
        rejBtn.onclick = function() { window.rejectProduct(p.id); overlay.remove(); };
        btnRow.appendChild(appBtn);
        btnRow.appendChild(rejBtn);
        card.appendChild(btnRow);
        wrap.appendChild(card);
      })(apps[k]);
    }
  }
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;background:#f5f5f5;font-size:20px;cursor:pointer;';
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
};

window.auditFoods = function() {
  var currentUser = Storage.get('user', null);
  if (!currentUser) { alert('请先登录'); return; }
  var myVillage = null;
  var villages = Storage.get('villages', []);
  for (var i = 0; i < villages.length; i++) {
    if (villages[i].chief && villages[i].chief.name === currentUser.currentRoleName) {
      myVillage = villages[i]; break;
    }
  }
  if (!myVillage) { alert('未找到您的村庄'); return; }
  var apps = [];
  var allApps = Storage.get('food_applications', []);
  for (var j = 0; j < allApps.length; j++) {
    if (allApps[j].village === myVillage.name && allApps[j].status === '待审核') apps.push(allApps[j]);
  }
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'background:white;min-height:100%;padding:16px;';
  overlay.appendChild(wrap);
  var title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:16px;font-size:16px;';
  title.textContent = '🍲 美食审核 (' + apps.length + ')';
  wrap.appendChild(title);
  if (apps.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:40px;color:#999;';
    empty.textContent = '暂无待审核申请';
    wrap.appendChild(empty);
  } else {
    for (var k = 0; k < apps.length; k++) {
      (function(p) {
        var card = document.createElement('div');
        card.style.cssText = 'background:white;padding:12px;border-radius:8px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-weight:bold;';
        nameEl.textContent = p.name;
        card.appendChild(nameEl);
        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'color:#666;font-size:12px;margin-top:4px;';
        infoEl.textContent = '¥' + p.price + '/' + p.unit + ' · 每日供' + p.stock + ' · 申请人:' + p.sellerName;
        card.appendChild(infoEl);
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;margin-top:10px;';
        var appBtn = document.createElement('button');
        appBtn.type = 'button';
        appBtn.textContent = '通过';
        appBtn.style.cssText = 'flex:1;padding:8px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;';
        appBtn.onclick = function() { window.approveFood(p.id); overlay.remove(); };
        var rejBtn = document.createElement('button');
        rejBtn.type = 'button';
        rejBtn.textContent = '拒绝';
        rejBtn.style.cssText = 'flex:1;padding:8px;background:#F44336;color:white;border:none;border-radius:4px;cursor:pointer;';
        rejBtn.onclick = function() { window.rejectFood(p.id); overlay.remove(); };
        btnRow.appendChild(appBtn);
        btnRow.appendChild(rejBtn);
        card.appendChild(btnRow);
        wrap.appendChild(card);
      })(apps[k]);
    }
  }
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;background:#f5f5f5;font-size:20px;cursor:pointer;';
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
};

window.auditCamps = function() {
  var currentUser = Storage.get('user', null);
  if (!currentUser) { alert('请先登录'); return; }
  var myVillage = null;
  var villages = Storage.get('villages', []);
  for (var i = 0; i < villages.length; i++) {
    if (villages[i].chief && villages[i].chief.name === currentUser.currentRoleName) {
      myVillage = villages[i]; break;
    }
  }
  if (!myVillage) { alert('未找到您的村庄'); return; }
  var apps = [];
  var allApps = Storage.get('camp_applications', []);
  for (var j = 0; j < allApps.length; j++) {
    if (allApps[j].village === myVillage.name && allApps[j].status === '待审核') apps.push(allApps[j]);
  }
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;overflow:auto;';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'background:white;min-height:100%;padding:16px;';
  overlay.appendChild(wrap);
  var title = document.createElement('h3');
  title.style.cssText = 'margin-bottom:16px;font-size:16px;';
  title.textContent = '🏕️ 露营地审核 (' + apps.length + ')';
  wrap.appendChild(title);
  if (apps.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:40px;color:#999;';
    empty.textContent = '暂无待审核申请';
    wrap.appendChild(empty);
  } else {
    for (var k = 0; k < apps.length; k++) {
      (function(p) {
        var card = document.createElement('div');
        card.style.cssText = 'background:white;padding:12px;border-radius:8px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-weight:bold;';
        nameEl.textContent = p.name;
        card.appendChild(nameEl);
        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'color:#666;font-size:12px;margin-top:4px;';
        infoEl.textContent = '¥' + p.price + '/晚 · 可接待' + (p.capacity || p.stock || 0) + '人 · 申请人:' + p.sellerName;
        card.appendChild(infoEl);
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;margin-top:10px;';
        var appBtn = document.createElement('button');
        appBtn.type = 'button';
        appBtn.textContent = '通过';
        appBtn.style.cssText = 'flex:1;padding:8px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;';
        appBtn.onclick = function() { window.approveCamp(p.id); overlay.remove(); };
        var rejBtn = document.createElement('button');
        rejBtn.type = 'button';
        rejBtn.textContent = '拒绝';
        rejBtn.style.cssText = 'flex:1;padding:8px;background:#F44336;color:white;border:none;border-radius:4px;cursor:pointer;';
        rejBtn.onclick = function() { window.rejectCamp(p.id); overlay.remove(); };
        btnRow.appendChild(appBtn);
        btnRow.appendChild(rejBtn);
        card.appendChild(btnRow);
        wrap.appendChild(card);
      })(apps[k]);
    }
  }
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;width:40px;height:40px;border-radius:50%;border:none;background:#f5f5f5;font-size:20px;cursor:pointer;';
  closeBtn.onclick = function() { overlay.remove(); };
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
};
