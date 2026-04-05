// ============================================================
// analyze.js — AI解析・キーワード解析
// ============================================================

// Claude API で解析
async function analyzeWithClaude(text, person) {
  const apiKey = getApiKey();
  const today  = todayDate();

  const prompt = `あなたは農業記録アプリのAIアシスタントです。
テキスト：「${text}」
担当者：${person}、今日：${today}
出荷先候補：農総研、JA、直売、コボコボ、その他

以下のJSON配列のみ返答（説明文不要）：
作業記録の場合：
[{"type":"work","date":"${today}","person":"担当者","location":"場所or空","content":"作業内容","duration":"時間or空","notes":"備考or空"}]
出荷記録の場合：
[{"type":"shipping","date":"${today}","destination":"出荷先or空","item":"品目or空","quantity":"数量or空","notes":"備考or空"}]
両方ある場合は両方を配列に含める。`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `HTTP ${res.status}`);
  }

  const data  = await res.json();
  const raw   = data.content?.[0]?.text || '';
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AIの返答からJSONを取得できませんでした');

  return JSON.parse(match[0]).map(r => ({
    id: generateId(), ...r,
    status: 'pending',
    createdAt: new Date().toISOString(),
    rawInput: text,
    _source: 'ai'
  }));
}

// キーワードベースの解析（APIキーなし・オフライン時のフォールバック）
function analyzeWithKeywords(text, person) {
  const results     = [];
  const hasShipping = SHIPPING_WORDS.some(k => text.includes(k));
  const hasWork     = WORK_WORDS.some(k => text.includes(k));
  const foundItems  = ITEMS.filter(k => text.includes(k));

  if (hasWork || !hasShipping) {
    results.push({
      id: generateId(), type: 'work', date: todayDate(), person,
      location: (text.match(LOC_PATTERN) || [''])[0],
      content: [...foundItems, ...WORK_WORDS.filter(k => text.includes(k))].join('、'),
      duration: '', notes: '', status: 'pending',
      createdAt: new Date().toISOString(), rawInput: text, _source: 'keyword'
    });
  }
  if (hasShipping) {
    results.push({
      id: generateId(), type: 'shipping', date: todayDate(),
      destination: DESTINATIONS.find(d => text.includes(d)) || '',
      item: foundItems.join('、'),
      quantity: (text.match(QTY_PATTERN) || []).join('、'),
      notes: '', status: 'pending',
      createdAt: new Date().toISOString(), rawInput: text, _source: 'keyword'
    });
  }
  if (!results.length) {
    results.push({
      id: generateId(), type: 'work', date: todayDate(), person,
      location: '', content: text, duration: '', notes: '',
      status: 'pending', createdAt: new Date().toISOString(),
      rawInput: text, _source: 'keyword'
    });
  }
  return results;
}
