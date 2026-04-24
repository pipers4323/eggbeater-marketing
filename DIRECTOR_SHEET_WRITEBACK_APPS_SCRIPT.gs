// Fastest weekend setup: leave this blank and also leave the Eggbeater secret field blank.
// If you want a shared secret, put the same value here and in Director.
const SCRIPT_SECRET = '';

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (!raw) return jsonResponse({ ok: false, error: 'Missing request body' }, 400);

    const payload = JSON.parse(raw);
    if (!payload || payload.event !== 'score_update') {
      return jsonResponse({ ok: false, error: 'Unsupported event' }, 400);
    }

    if (SCRIPT_SECRET && String(payload.sharedSecret || '').trim() !== SCRIPT_SECRET) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 403);
    }

    const sourceSheet = payload.sourceSheet || {};
    const rowNumber = Number(sourceSheet.rowNumber || 0);
    if (!rowNumber) return jsonResponse({ ok: false, error: 'Missing sourceSheet.rowNumber' }, 400);

    const sheet = resolveSheet_(sourceSheet, payload);
    if (!sheet) return jsonResponse({ ok: false, error: 'Could not resolve target sheet/tab' }, 400);

    const score = payload.score || {};
    const updates = [];

    pushCellUpdate_(updates, sourceSheet.whiteScoreCol, rowNumber, score.score1);
    pushCellUpdate_(updates, sourceSheet.darkScoreCol, rowNumber, score.score2);
    pushCellUpdate_(updates, sourceSheet.statusCol, rowNumber, normalizeStatus_(score.status || score.gameState || 'final'));

    if (!updates.length) {
      return jsonResponse({ ok: false, error: 'No score/status columns configured in sourceSheet metadata' }, 400);
    }

    updates.forEach(update => {
      sheet.getRange(update.row, update.col).setValue(update.value);
    });

    SpreadsheetApp.flush();
    return jsonResponse({
      ok: true,
      updated: updates.map(update => ({ row: update.row, col: update.col, value: update.value })),
      sheetName: sheet.getName(),
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

function resolveSheet_(sourceSheet, payload) {
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSpreadsheet) return null;

  const requestedGid = String(sourceSheet.sheetGid || '').trim();
  if (requestedGid) {
    const byGid = activeSpreadsheet.getSheets().find(sheet => String(sheet.getSheetId()) === requestedGid);
    if (byGid) return byGid;
  }

  const game = payload && payload.game ? payload.game : {};
  const preferredNames = [
    String(game.ageGroupName || '').trim(),
    String(game.division || '').trim(),
    String(payload.tournamentName || '').trim(),
  ].filter(Boolean);

  for (let i = 0; i < preferredNames.length; i++) {
    const match = activeSpreadsheet.getSheetByName(preferredNames[i]);
    if (match) return match;
  }

  const sheets = activeSpreadsheet.getSheets();
  return sheets.length ? sheets[0] : null;
}

function normalizeStatus_(status) {
  const text = String(status || '').trim().toLowerCase();
  if (!text) return 'final';
  if (text === 'so_w' || text === 'so_l') return 'shootout';
  if (text === 'ff') return 'forfeit';
  return text;
}

function pushCellUpdate_(updates, col, row, value) {
  const colNum = Number(col || 0);
  if (!colNum) return;
  updates.push({ row, col: colNum, value });
}

function jsonResponse(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
