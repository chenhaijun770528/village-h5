// profile-product-fix.js
// 覆盖 profile.html 中的 applyProduct 和 showProductApps 函数
// 用法：在 profile.html 的 </body> 前加 <script src="profile-product-fix.js"></script>

var _prodImages = [];

// ===== 覆盖 applyProduct =====
window.applyProduct = function(editId) {
  _prodImages = [];
  var isEdit = !!editId;
  var editData = null;
  if (isEdit) {
    var apps = Storage.get('product_applications', []);
    for (var i = 0; i < apps.length; i++) {
      if (apps[i].id === editId) { editData = apps[i]; break; }
    }
    if (editData && editData.images) {
      _prodImages = [];
      for (var k = 0; k < editData.images.length; k++) _prodImages.push(editData.images[k]);
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
  title.textContent = isEdit ? '编辑农产品' : '申请上架农产品';
  wrap.appendChild(title);

  // 名称
  var lb1 = document.createElement('label');
  lb1.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb1.textContent = '农产品名称 *';
  wrap.appendChild(lb1);
  var inp1 = document.createElement('input');
  inp1.id = 'pName'; inp1.type = 'text';
  inp1.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:12px;';
  if (editData) inp1.value = editData.name;
  wrap.appendChild(inp1);

  // 价格 + 单位 一行
  var row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;gap:10px;margin-bottom:12px;';
  var col1 = document.createElement('div'); col1.style.cssText = 'flex:1;';
  var lb2 = document.createElement('label');
  lb2.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb2.textContent = '价格（元）*';
  col1.appendChild(lb2);
  var inp2 = document.createElement('input');
  inp2.id = 'pPrice'; inp2.type = 'number';
  inp2.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;';
  if (editData) inp2.value = editData.price;
  col1.appendChild(inp2);
  var col2 = document.createElement('div'); col2.style.cssText = 'flex:1;';
  var lb3 = document.createElement('label');
  lb3.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb3.textContent = '单位';
  col2.appendChild(lb3);
  var inp3 = document.createElement('input');
  inp3.id = 'pUnit'; inp3.type = 'text';
  inp3.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;';
  inp3.value = editData ? editData.unit : '斤';
  col2.appendChild(inp3);
  row1.appendChild(col1); row1.appendChild(col2);
  wrap.appendChild(row1);

  // 库存
  var lb4 = document.createElement('label');
  lb4.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb4.textContent = '库存数量';
  wrap.appendChild(lb4);
  var inp4 = document.createElement('input');
  inp4.id = 'pStock'; inp4.type = 'number';
  inp4.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:12px;';
  if (editData) inp4.value = editData.stock; else inp4.value = '100';
  wrap.appendChild(inp4);

  // 描述
  var lb5 = document.createElement('label');
  lb5.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:4px;';
  lb5.textContent = '描述';
  wrap.appendChild(lb5);
  var txt1 = document.createElement('textarea');
  txt1.id = 'pDesc'; txt1.rows = 3;
  txt1.style.cssText = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;margin-bottom:12px;';
  if (editData && editData.description) txt1.value = editData.description;
  wrap.appendChild(txt1);

  // 图片
  var lb6 = document.createElement('label');
  lb6.style.cssText = 'font-size:13px;color:#666;display:block;margin-bottom:6px;';
  lb6.textContent = '产品图片（最多6张）';
  wrap.appendChild(lb6);

  var preview = document.createElement('div');
  preview.id = 'prodImgPreview';
  preview.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;';

  function renderPrev() {
    while (preview.firstChild) preview.removeChild(preview.firstChild);
    for (var ii = 0; ii < _prodImages.length; ii++) {
      (function(idx) {
        var d = document.createElement('div');
        d.style.cssText = 'position:relative;width:60px;height:60px;';
        var im = document.createElement('img');
        im.src = _prodImages[idx];
        im.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:6px;';
        d.appendChild(im);
        var sp = document.createElement('span');
        sp.textContent = '×';
        sp.style.cssText = 'position:absolute;top:-4px;right:-4px;width:18px;height:18px;background:#F44336;color:white;border-radius:50%;text-align:center;line-height:18px;font-size:12px;cursor:pointer;';
        sp.onclick = function() { _prodImages.splice(idx, 1); renderPrev(); };
        d.appendChild(sp);
        preview.appendChild(d);
      })(ii);
    }
  }
  renderPrev();
  wrap.appendChild(preview);

  var fInput = document.createElement('input');
  fInput.type = 'file'; fInput.accept = 'image/*'; fInput.multiple = true;
  fInput.style.display = 'none';
  fInput.onchange = function(e) {
    var files = e.target.files;
    for (var fi = 0; fi < files.length && _prodImages.length < 6; fi++) {
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
            _prodImages.push(canvas.toDataURL('image/jpeg', 0.7));
            renderPrev();
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
  submitBtn.style.cssText = 'flex:1;padding:10px;background:#2E7D32;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;';
  submitBtn.onclick = function() {
    var name = document.getElementById('pName').value.trim();
    var price = parseFloat(document.getElementById('pPrice').value);
    var unit = document.getElementById('pUnit').value.trim() || '斤';
    var stock = parseInt(document.getElementById('pStock').value) || 0;
    var desc = document.getElementById('pDesc').value.trim();
    if (!name) { alert('请填写农产品名称'); return; }
    if (!price || price <= 0) { alert('请填写有效价格'); return; }
    var app = {
      id: editId || ('prod_' + Date.now()),
      name: name, price: price, unit: unit, stock: stock,
      description: desc,
      images: _prodImages.length > 0 ? _prodImages : undefined,
      sellerId: currentUser.account,
      sellerName: currentUser.currentRoleName || '',
      village: myReg ? myReg.village : '',
      status: '待审核',
      createTime: new Date().toISOString()
    };
    var apps = Storage.get('product_applications', []);
    if (editId) {
      var fidx = -1;
      for (var fi = 0; fi < apps.length; fi++) { if (apps[fi].id === editId) { fidx = fi; break; } }
      if (fidx > -1) apps[fidx] = app;
    } else {
      apps.push(app);
    }
    Storage.set('product_applications', apps);
    alert(isEdit ? '修改已保存，已重新提交审核' : '申请已提交，等待村主任审核');
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

// ===== 覆盖 showProductApps（加编辑/删除按钮）=====
window.showProductApps = function() {
  var currentUser = Storage.get('user', null);
  if (!currentUser) { alert('请先登录'); return; }
  var apps = [];
  var allApps = Storage.get('product_applications', []);
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
  title.textContent = '🥬 我的农产品';
  wrap.appendChild(title);

  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ 申请上架农产品';
  addBtn.style.cssText = 'width:100%;padding:12px;background:#2E7D32;color:white;border:none;border-radius:8px;margin-bottom:16px;font-size:14px;cursor:pointer;';
  addBtn.onclick = function() { overlay.remove(); window.applyProduct(); };
  wrap.appendChild(addBtn);

  if (apps.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:40px;color:#999;';
    empty.textContent = '暂无农产品申请';
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
        priceEl.textContent = '¥' + p.price + '/' + p.unit + ' · 库存' + p.stock;
        info.appendChild(priceEl);

        if (p.description) {
          var descEl = document.createElement('div');
          descEl.style.cssText = 'color:#999;font-size:11px;margin-top:4px;';
          descEl.textContent = p.description;
          info.appendChild(descEl);
        }

        var villageEl = document.createElement('div');
        villageEl.style.cssText = 'color:#999;font-size:11px;margin-top:4px;';
        villageEl.textContent = p.village || '';
        info.appendChild(villageEl);

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
          editBtn.onclick = function() { overlay.remove(); window.applyProduct(p.id); };
          rightCol.appendChild(editBtn);
        }
        if (p.status === '待审核') {
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.textContent = '删除';
          delBtn.style.cssText = 'padding:4px 10px;background:#ccc;color:#666;border:none;border-radius:4px;font-size:11px;cursor:pointer;';
          delBtn.onclick = function() { window.deleteProduct(p.id); };
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

// ===== 覆盖 deleteProduct =====
window.deleteProduct = function(id) {
  if (!confirm('确定删除这个申请？')) return;
  var apps = Storage.get('product_applications', []);
  var filtered = [];
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].id !== id) filtered.push(apps[i]);
  }
  Storage.set('product_applications', filtered);
  alert('已删除');
  location.reload();
};
