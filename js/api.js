// ============================================================
// api.js — Google Sheets との通信
// ============================================================

// ローカルキャッシュ（オフライン対応・高速表示）
let _records = [];

function cacheRecords(records) {
  _records = records;
  localStorage.setItem('farmCache', JSON.stringify(records));
  updatePendingCount();
}
function loadCache() {
  return JSON.parse(localStorage.getItem('farmCache') || '[]');
}

// 同期ステータスバーの表示
function setSyncBar(state, msg) {
  const bar = document.getElementById('syncBar');
  bar.className = state;
  bar.textContent = msg;
  if (state === 'ok') setTimeout(() => bar.style.display = 'none', 2000);
}

// GETリクエスト（全件取得）
async function apiGet() {
  const res = await fetch(SCRIPT_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// GETリクエスト（書き込み操作）
// file://からのPOSTはCORSでブロックされるためGETを使用
async function apiPost(data) {
  const params = new URLSearchParams({
    action: data.action,
    data: JSON.stringify(data)
  });
  const res = await fetch(SCRIPT_URL + '?' + params.toString(), { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Sheetsから最新データを読み込む
async function refreshRecords() {
  setSyncBar('syncing', '⏳ Googleスプレッドシートを読み込み中...');
  try {
    const records = await apiGet();
    if (records.error) throw new Error(records.error);
    cacheRecords(records);
    setSyncBar('ok', '✅ 最新データを読み込みました');
    renderCurrentScreen();
  } catch (e) {
    setSyncBar('error', `❌ 読み込み失敗: ${e.message} — キャッシュを表示中`);
    _records = loadCache();
    renderCurrentScreen();
  }
}

// 接続テスト（設定画面用）
async function testConnection() {
  const el = document.getElementById('sheetStatus');
  el.innerHTML = '<div class="inline-loading"><div class="spinner"></div>接続テスト中...</div>';
  try {
    const data = await apiGet();
    if (data.error) throw new Error(data.error);
    el.innerHTML = `<div class="alert-success">✅ 接続成功！ 現在 ${data.length} 件の記録があります</div>`;
  } catch (e) {
    el.innerHTML = `<div class="alert-warn">❌ 接続失敗: ${e.message}</div>`;
  }
}
