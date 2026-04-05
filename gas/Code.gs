// ============================================================
// Code.gs — Google Apps Script（スプレッドシートのバックエンド）
// ============================================================
const SPREADSHEET_ID = '1-wvBlJ2CxxmvivY-nKnufa6OFNcqmDwZhdWTMGUNyqw';
const SHEET_NAME     = '記録';
const HEADERS        = [
  'id', 'type', 'date', 'person', 'location', 'content', 'duration',
  'destination', 'item', 'quantity', 'notes', 'status', 'createdAt', 'rawInput'
];

function doGet(e) {
  try {
    const action = e.parameter && e.parameter.action;
    if (action) {
      const sheet = ensureSheet();
      const data  = e.parameter.data ? JSON.parse(e.parameter.data) : {};
      if (action === 'save')        data.records.forEach(r => sheet.appendRow(HEADERS.map(h => r[h] ?? '')));
      else if (action === 'update') upsertRow(sheet, data.record);
      else if (action === 'delete') deleteRowById(sheet, data.id);
      return json({ ok: true });
    }
    const sheet  = ensureSheet();
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return json([]);
    return json(values.slice(1).map(row =>
      Object.fromEntries(HEADERS.map((h, i) => [h, String(row[i] ?? '')]))
    ));
  } catch (err) {
    return json({ error: err.message });
  }
}

function ensureSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh   = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function upsertRow(sheet, record) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === record.id) {
      sheet.getRange(i + 1, 1, 1, HEADERS.length)
           .setValues([HEADERS.map(h => record[h] ?? '')]);
      return;
    }
  }
  sheet.appendRow(HEADERS.map(h => record[h] ?? ''));
}

function deleteRowById(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) { sheet.deleteRow(i + 1); return; }
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
