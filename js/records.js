// ============================================================
// records.js — レコードのCRUD操作
// ============================================================

// 確定
async function confirmRecord(id) {
  const r = _records.find(r => r.id === id);
  if (!r) return;
  r.status = 'confirmed';
  setSyncBar('syncing', '⏳ 更新中...');
  try {
    const res = await apiPost({ action: 'update', record: r });
    if (res && res.error) throw new Error(res.error);
    cacheRecords([..._records]);
    setSyncBar('ok', '✅ 確定しました');
    renderList('pending', _currentFilter.pending);
  } catch (e) {
    r.status = 'pending'; // ロールバック
    setSyncBar('error', `❌ 更新失敗: ${e.message}`);
  }
}

// 削除
async function deleteRecord(id) {
  if (!confirm('削除しますか？')) return;
  const prev = [..._records];
  _records = _records.filter(r => r.id !== id);
  cacheRecords(_records);
  renderList('pending',   _currentFilter.pending);
  renderList('confirmed', _currentFilter.confirmed);
  setSyncBar('syncing', '⏳ 削除中...');
  try {
    await apiPost({ action: 'delete', id });
    setSyncBar('ok', '✅ 削除しました');
  } catch (e) {
    _records = prev; // ロールバック
    cacheRecords(prev);
    setSyncBar('error', `❌ 削除失敗: ${e.message}`);
    renderList('pending',   _currentFilter.pending);
    renderList('confirmed', _currentFilter.confirmed);
  }
}

// 編集画面を開く
function editRecord(id) {
  const record = _records.find(r => r.id === id);
  if (!record) return;
  window._editingId  = id;
  window._editStatus = record.status;
  showConfirmScreen([record]);
  // ボタンを「変更を保存」に切り替え
  const btn = document.getElementById('saveBtn');
  btn.textContent = '☁ 変更を保存';
  btn.onclick = saveEdit;
}

// 編集を保存
async function saveEdit() {
  const updated  = collectForm(0);
  updated.status = window._editStatus;
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = '保存中...';
  setSyncBar('syncing', '⏳ 更新中...');
  try {
    const res = await apiPost({ action: 'update', record: updated });
    if (res && res.error) throw new Error(res.error);
    const idx = _records.findIndex(r => r.id === window._editingId);
    if (idx >= 0) _records[idx] = updated;
    cacheRecords([..._records]);
    setSyncBar('ok', '✅ 保存しました');
    showScreen(updated.status === 'pending' ? 'pending' : 'confirmed');
  } catch (e) {
    setSyncBar('error', `❌ 保存失敗: ${e.message}`);
    btn.disabled = false;
    btn.textContent = '☁ 変更を保存';
  }
}

// 確認画面から新規保存
async function saveAllToSheets() {
  const count   = window._pendingRecords.length;
  const newRecs = Array.from({ length: count }, (_, i) => collectForm(i));
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = '保存中...';
  setSyncBar('syncing', '⏳ Googleスプレッドシートに保存中...');
  try {
    const res = await apiPost({ action: 'save', records: newRecs });
    if (res && res.error) throw new Error(res.error);
    _records.push(...newRecs);
    cacheRecords([..._records]);
    setSyncBar('ok', '✅ 保存しました');
    document.getElementById('inputText').value = '';
    alert(`${count}件を保存しました`);
    showScreen('pending');
  } catch (e) {
    setSyncBar('error', `❌ 保存失敗: ${e.message}`);
    alert(`保存に失敗しました: ${e.message}`);
    btn.disabled = false;
    btn.textContent = '☁ Googleスプレッドシートに保存';
  }
}
