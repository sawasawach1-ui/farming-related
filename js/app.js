// ============================================================
// app.js — 画面制御・入力処理・初期化
// ============================================================

// 画面切り替え
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');

  const idx = ['input', 'pending', 'confirmed', 'settings'].indexOf(name);
  if (idx >= 0) document.querySelectorAll('nav button')[idx].classList.add('active');

  if (name === 'pending')   renderList('pending',   _currentFilter.pending);
  if (name === 'confirmed') renderList('confirmed', _currentFilter.confirmed);
  if (name === 'settings')  renderSettingsScreen();
  if (name === 'input')     renderAiBanner();
}

// AIバナー（入力画面上部）
function renderAiBanner() {
  const el = document.getElementById('aiStatusBanner');
  if (!el) return;
  el.innerHTML = getApiKey()
    ? `<div class="alert-success" style="margin-bottom:12px;">🤖 Claude AI + ☁ Google Sheets</div>`
    : `<div class="alert-info" style="margin-bottom:12px;">☁ Google Sheets保存 / キーワード解析モード</div>`;
}

// 設定画面を描画
function renderSettingsScreen() {
  const key = getApiKey();
  const el  = document.getElementById('apiStatusDisplay');
  if (el) {
    el.innerHTML = key
      ? `<div class="alert-success">✅ 設定済み (${key.slice(0, 12)}...)</div>`
      : `<div class="alert-warn">未設定 — キーワード解析で動作します</div>`;
  }
}

// APIキー保存
function onSaveApiKey() {
  const k = document.getElementById('apiKeyInput').value.trim();
  if (!k) { alert('APIキーを入力してください'); return; }
  saveApiKey(k);
  document.getElementById('apiKeyInput').value = '';
  renderSettingsScreen();
  renderAiBanner();
  alert('保存しました');
}

// APIキー削除
function onClearApiKey() {
  if (!confirm('APIキーを削除しますか？')) return;
  clearApiKey();
  renderSettingsScreen();
  renderAiBanner();
}

// 入力解析
async function analyzeInput() {
  const text   = document.getElementById('inputText').value.trim();
  const person = document.getElementById('inputPerson').value;
  if (!text) { alert('内容を入力してください'); return; }

  const btn    = document.getElementById('analyzeBtn');
  btn.disabled = true;
  const loader = Object.assign(document.createElement('div'), {
    className: 'inline-loading',
    id: 'analyzeLoader',
    innerHTML: `<div class="spinner"></div>
                <span>${getApiKey() ? 'Claude AIが解析中...' : 'キーワード解析中...'}</span>`
  });
  document.querySelector('#screen-input .card').appendChild(loader);

  try {
    let records;
    if (getApiKey()) {
      try {
        records = await analyzeWithClaude(text, person);
      } catch (e) {
        alert(`AI解析エラー: ${e.message}\nキーワード解析で続行します。`);
        records = analyzeWithKeywords(text, person);
      }
    } else {
      records = analyzeWithKeywords(text, person);
    }
    showConfirmScreen(records);
  } finally {
    document.getElementById('analyzeLoader')?.remove();
    btn.disabled = false;
  }
}

// 音声入力
function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('音声入力はChromeでお試しください'); return; }
  const r  = new SR();
  r.lang   = 'ja-JP';
  r.onresult = e => {
    document.getElementById('inputText').value += e.results[0][0].transcript;
  };
  r.start();
}

// ============================================================
// 起動処理：キャッシュで即表示 → Sheetsから最新取得
// ============================================================
(async () => {
  _records = loadCache();
  updatePendingCount();
  renderAiBanner();
  await refreshRecords();
})();
