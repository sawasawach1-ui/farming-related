// ============================================================
// ui.js — 画面描画・フォーム生成
// ============================================================

// 現在のフィルター状態
const _currentFilter = { pending: 'all', confirmed: 'all' };

// 一覧をフィルター
function filterList(screen, type, btn) {
  btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  _currentFilter[screen] = type;
  renderList(screen, type);
}

// 一覧を描画
function renderList(screen, typeFilter) {
  const status   = screen === 'pending' ? 'pending' : 'confirmed';
  const filtered = _records
    .filter(r => r.status === status && (typeFilter === 'all' || r.type === typeFilter))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const container = document.getElementById(screen + 'List');
  if (!filtered.length) {
    container.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>記録がありません</p></div>';
    return;
  }
  container.innerHTML = filtered.map(r => recordCardHTML(r)).join('');
}

// 1件のカードHTML
function recordCardHTML(r) {
  const body = r.type === 'work'
    ? `<div class="record-content">📝 ${r.content || '（未入力）'}</div>
       <div class="record-meta">
         👤 ${r.person || '―'}
         ${r.location ? ' 📍 ' + r.location : ''}
         ${r.duration ? ' ⏱ '  + r.duration : ''}
       </div>`
    : `<div class="record-content">🚚 ${r.destination || '―'} / ${r.item || '―'} / ${r.quantity || '―'}</div>`;

  const actions = r.status === 'pending'
    ? `<button style="background:#2196F3;color:white;" onclick="confirmRecord('${r.id}')">✓ 確定</button>
       <button style="background:#f5f5f5;color:#333;" onclick="editRecord('${r.id}')">編集</button>
       <button style="background:#ffebee;color:#f44336;" onclick="deleteRecord('${r.id}')">削除</button>`
    : `<button style="background:#f5f5f5;color:#333;" onclick="editRecord('${r.id}')">編集</button>
       <button style="background:#ffebee;color:#f44336;" onclick="deleteRecord('${r.id}')">削除</button>`;

  return `
    <div class="record-card">
      <div class="record-header">
        <span class="badge badge-${r.type}">${r.type === 'work' ? '作業' : '出荷'}</span>
        <span class="record-date">📅 ${r.date}</span>
      </div>
      ${body}
      ${r.notes ? `<div class="record-meta">💬 ${r.notes}</div>` : ''}
      <div class="record-actions">${actions}</div>
    </div>`;
}

// 確認画面を表示
function showConfirmScreen(records) {
  window._pendingRecords = records;
  const srcBadge = records.some(r => r._source === 'ai')
    ? '<span class="badge badge-ai">🤖 AI解析</span>'
    : '<span class="badge badge-kw">🔍 キーワード解析</span>';

  let html = `
    <div style="padding:16px;max-width:600px;margin:0 auto;">
      <h1 style="color:#4a7c59;font-size:20px;margin-bottom:8px;">解析結果を確認</h1>
      <p style="font-size:14px;color:#666;margin-bottom:16px;">
        ${srcBadge} ${records.length}件を検出。修正してから保存してください。
      </p>`;

  records.forEach((r, i) => {
    const missing = getMissingFields(r);
    html += `
      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span class="badge badge-${r.type}">${r.type === 'work' ? '作業記録' : '出荷記録'}</span>
          ${missing.length ? `<span class="warn-text">⚠ 未入力：${missing.join('、')}</span>` : ''}
        </div>
        ${r.type === 'work' ? workFormHTML(r, i) : shippingFormHTML(r, i)}
      </div>`;
  });

  html += `
      <button class="btn btn-primary" id="saveBtn" onclick="saveAllToSheets()">
        ☁ Googleスプレッドシートに保存
      </button>
      <button class="btn btn-secondary" onclick="showScreen('input')">← 入力に戻る</button>
    </div>`;

  document.getElementById('confirmContent').innerHTML = html;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-confirm').classList.add('active');
}

// 必須項目の不足チェック
function getMissingFields(r) {
  const m = [];
  if (!r.date) m.push('日付');
  if (r.type === 'work') {
    if (!r.person)  m.push('担当者');
    if (!r.content) m.push('作業内容');
  } else {
    if (!r.destination) m.push('出荷先');
    if (!r.item)        m.push('品目');
    if (!r.quantity)    m.push('数量');
  }
  return m;
}

// 作業記録フォーム
function workFormHTML(r, i) {
  return `
    <input type="hidden" id="r${i}_type" value="work">
    <input type="hidden" id="r${i}_id"   value="${r.id}">
    <div class="form-row"><label>日付 <span class="required">*</span></label>
      <input type="date" id="r${i}_date" value="${r.date}"></div>
    <div class="form-row"><label>担当者 <span class="required">*</span></label>
      <select id="r${i}_person">
        <option ${r.person === 'Toshimi' ? 'selected' : ''}>Toshimi</option>
        <option ${r.person === 'Aydee'   ? 'selected' : ''}>Aydee</option>
      </select></div>
    <div class="form-row"><label>作業内容 <span class="required">*</span></label>
      <input type="text" id="r${i}_content"  value="${esc(r.content)}"
             placeholder="例：きゅうり収穫" class="${!r.content ? 'missing' : ''}"></div>
    <div class="form-row"><label>場所</label>
      <input type="text" id="r${i}_location" value="${esc(r.location)}" placeholder="例：ハウス1"></div>
    <div class="form-row"><label>作業時間</label>
      <input type="text" id="r${i}_duration" value="${esc(r.duration)}" placeholder="例：2時間"></div>
    <div class="form-row"><label>備考</label>
      <input type="text" id="r${i}_notes"    value="${esc(r.notes)}"    placeholder="メモ..."></div>`;
}

// 出荷記録フォーム
function shippingFormHTML(r, i) {
  const dests = ['農総研', 'JA', '直売', 'コボコボ', 'その他'];
  const opts  = dests.map(d => `<option ${r.destination === d ? 'selected' : ''}>${d}</option>`).join('');
  return `
    <input type="hidden" id="r${i}_type" value="shipping">
    <input type="hidden" id="r${i}_id"   value="${r.id}">
    <div class="form-row"><label>日付 <span class="required">*</span></label>
      <input type="date" id="r${i}_date" value="${r.date}"></div>
    <div class="form-row"><label>出荷先 <span class="required">*</span></label>
      <select id="r${i}_destination" class="${!r.destination ? 'missing' : ''}">
        <option value="">-- 選択 --</option>${opts}</select></div>
    <div class="form-row"><label>品目 <span class="required">*</span></label>
      <input type="text" id="r${i}_item"     value="${esc(r.item)}"
             placeholder="例：きゅうり" class="${!r.item ? 'missing' : ''}"></div>
    <div class="form-row"><label>数量 <span class="required">*</span></label>
      <input type="text" id="r${i}_quantity" value="${esc(r.quantity)}"
             placeholder="例：3袋" class="${!r.quantity ? 'missing' : ''}"></div>
    <div class="form-row"><label>備考</label>
      <input type="text" id="r${i}_notes"    value="${esc(r.notes)}" placeholder="メモ..."></div>`;
}

// フォームからデータを収集
function collectForm(i) {
  const type = document.getElementById(`r${i}_type`).value;
  const base = {
    id:     document.getElementById(`r${i}_id`).value,
    type,
    date:   document.getElementById(`r${i}_date`).value,
    notes:  document.getElementById(`r${i}_notes`).value,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  if (type === 'work') {
    return { ...base,
      person:   document.getElementById(`r${i}_person`).value,
      content:  document.getElementById(`r${i}_content`).value,
      location: document.getElementById(`r${i}_location`).value,
      duration: document.getElementById(`r${i}_duration`).value };
  }
  return { ...base,
    destination: document.getElementById(`r${i}_destination`).value,
    item:        document.getElementById(`r${i}_item`).value,
    quantity:    document.getElementById(`r${i}_quantity`).value };
}

// 未確定バッジを更新
function updatePendingCount() {
  const count = _records.filter(r => r.status === 'pending').length;
  const badge = document.getElementById('pendingCount');
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline' : 'none';
}

// 現在の画面を再描画
function renderCurrentScreen() {
  const active = document.querySelector('.screen.active');
  if (!active) return;
  const name = active.id.replace('screen-', '');
  if (name === 'pending')   renderList('pending',   _currentFilter.pending);
  if (name === 'confirmed') renderList('confirmed', _currentFilter.confirmed);
}
