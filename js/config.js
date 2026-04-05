// ============================================================
// config.js — 定数・共通ユーティリティ
// ============================================================

// Google Apps Script のURL（デプロイ後に取得したURL）
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynnJL0LoJLZa6m3zuyhn38DELRgxnvOwfkuQvrKVJzszkRxvQDXjgEO24MOQFt9ZKlQA/exec';

// スプレッドシートの列順序（Apps Scriptと合わせること）
const HEADERS = [
  'id', 'type', 'date', 'person', 'location', 'content', 'duration',
  'destination', 'item', 'quantity', 'notes', 'status', 'createdAt', 'rawInput'
];

// キーワード解析用リスト
const SHIPPING_WORDS = ['出荷', '納品', '届け', '送り'];
const WORK_WORDS     = ['収穫', '作業', '植え', '種まき', '水やり', '除草', '剪定', '防除', '施肥', '耕'];
const DESTINATIONS   = ['農総研', 'JA', '直売', 'コボコボ'];
const ITEMS          = ['きゅうり', 'トマト', 'ナス', 'ピーマン', 'レタス', 'キャベツ', '大根', 'にんじん', 'ほうれん草', 'いちご'];
const QTY_PATTERN    = /(\d+\s*(?:袋|箱|個|kg|本|束|ケース|枚))/g;
const LOC_PATTERN    = /ハウス\d+|圃場\d*|畑\d*/g;

// ユーティリティ
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
function todayDate() {
  return new Date().toISOString().split('T')[0];
}
function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// APIキー管理
function getApiKey()   { return localStorage.getItem('claudeApiKey') || ''; }
function saveApiKey(k) { localStorage.setItem('claudeApiKey', k); }
function clearApiKey() { localStorage.removeItem('claudeApiKey'); }
