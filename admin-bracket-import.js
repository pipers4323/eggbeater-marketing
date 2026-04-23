(function () {
  function bsParseLocation(raw) {
    const m = String(raw || '').match(/^(.+?)\s*#\s*(\d+)$/);
    return m ? { venue: m[1].trim(), poolNum: m[2] } : { venue: String(raw || ''), poolNum: '' };
  }

  function bsExtractBracketCode(raw) {
    const m = String(raw || '').match(/^([A-Z]\d+)[-\u2013( ]/i);
    return m ? m[1].toUpperCase() : null;
  }

  function bsBracketGameDesc(raw) {
    const text = String(raw || '').trim();
    const m = text.match(/^([A-Z]\d+)[-\u2013( ]*(\d+(?:st|nd|rd|th))\s*([A-Z])\)?[-\u2013 ]*$/i);
    if (m) return `${m[2]} ${m[3]}`;
    const fb = text.match(/^[A-Z]\d+[-\u2013( ]+(.+)$/i);
    return fb ? fb[1].replace(/[-\u2013) ]+$/, '').trim() : (text || 'TBD');
  }

  function bsParseRebracket(rows) {
    const seedingMap = {};
    let fmt1Hits = 0;
    for (const row of rows || []) {
      for (const cell of row || []) {
        if (/^([A-Z]\d+)[-\u2013( ]*(\d+(?:st|nd|rd|th))\s*([A-Z])\)?[-\u2013 ]*$/i.test(String(cell || '').trim())) fmt1Hits++;
      }
    }

    if (fmt1Hits > 0) {
      for (const row of rows || []) {
        for (const cell of row || []) {
          const m = String(cell || '').trim().match(/^([A-Z]\d+)[-\u2013( ]*(\d+(?:st|nd|rd|th))\s*([A-Z])\)?[-\u2013 ]*$/i);
          if (m) seedingMap[(m[2] + ' ' + m[3]).toLowerCase()] = m[1].toUpperCase();
        }
      }
      return seedingMap;
    }

    let headerRow = null;
    let headerRowIdx = -1;
    for (let ri = 0; ri < (rows || []).length; ri++) {
      const nonEmpty = (rows[ri] || []).filter(c => String(c || '').trim());
      if (nonEmpty.length >= 2 && /^[A-Z]\b/i.test(nonEmpty[0] || '')) {
        headerRow = rows[ri];
        headerRowIdx = ri;
        break;
      }
    }
    if (!headerRow) return seedingMap;

    const colLetters = {};
    for (let ci = 0; ci < headerRow.length; ci++) {
      const lm = String(headerRow[ci] || '').trim().match(/^([A-Z])\b/i);
      if (lm) colLetters[ci] = lm[1].toUpperCase();
    }
    for (let ri = headerRowIdx + 1; ri < rows.length; ri++) {
      const row = rows[ri] || [];
      const rowNum = String(row[0] || '').trim();
      if (!/^\d+$/.test(rowNum)) continue;
      for (let ci = 1; ci < row.length; ci++) {
        const cell = String(row[ci] || '').trim();
        const grpLetter = colLetters[ci];
        if (!cell || !grpLetter) continue;
        const vm = cell.match(/^(\d+(?:st|nd|rd|th))\s+([A-Z])$/i);
        if (vm) seedingMap[(vm[1] + ' ' + vm[2]).toLowerCase()] = grpLetter + rowNum;
      }
    }
    return seedingMap;
  }

  function bsColLabelToIndex(label) {
    let col = 0;
    for (const ch of String(label || '').toUpperCase()) {
      if (ch < 'A' || ch > 'Z') continue;
      col = col * 26 + (ch.charCodeAt(0) - 64);
    }
    return Math.max(0, col - 1);
  }

  function bsParseCellRef(ref) {
    const m = String(ref || '').trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!m) return null;
    return {
      ref: m[0],
      col: bsColLabelToIndex(m[1]),
      row: Math.max(0, parseInt(m[2], 10) - 1),
    };
  }

  function bsParseA1Range(range) {
    const text = String(range || '').trim();
    if (!text) return null;
    const m = text.match(/^(?:[^!]+!)?([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (m) {
      return {
        startCol: bsColLabelToIndex(m[1]),
        startRow: Math.max(0, parseInt(m[2], 10) - 1),
        endCol: bsColLabelToIndex(m[3]),
        endRow: Math.max(0, parseInt(m[4], 10) - 1),
      };
    }
    const rowOnly = text.match(/^(\d+):(\d+)$/);
    if (rowOnly) {
      return {
        startCol: 0,
        startRow: Math.max(0, parseInt(rowOnly[1], 10) - 1),
        endCol: Infinity,
        endRow: Math.max(0, parseInt(rowOnly[2], 10) - 1),
      };
    }
    return null;
  }

  function bsRgbToHex(rgb) {
    if (!rgb) return '';
    const vals = ['red', 'green', 'blue'].map(k => {
      const v = Math.max(0, Math.min(1, Number(rgb[k] || 0)));
      return Math.round(v * 255);
    });
    return '#' + vals.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function bsNormalizeCellColor(value) {
    const hex = bsRgbToHex(value).toLowerCase();
    if (!hex || hex === '#ffffff' || hex === '#000000') return '';
    return hex;
  }

  function bsHexDistance(a, b) {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    const av = a.replace('#', '');
    const bv = b.replace('#', '');
    if (av.length !== 6 || bv.length !== 6) return Number.POSITIVE_INFINITY;
    const numsA = [0, 2, 4].map(i => parseInt(av.slice(i, i + 2), 16));
    const numsB = [0, 2, 4].map(i => parseInt(bv.slice(i, i + 2), 16));
    return Math.sqrt(numsA.reduce((sum, cur, idx) => sum + Math.pow(cur - numsB[idx], 2), 0));
  }

  function bsCellValue(cell) {
    return String(cell?.formattedValue || '').trim();
  }

  function bsCellColor(cell) {
    return bsNormalizeCellColor(
      cell?.effectiveFormat?.backgroundColorStyle?.rgbColor ||
      cell?.effectiveFormat?.backgroundColor ||
      null
    );
  }

  function bsResolveLegendLabel(gridData, ref) {
    const row = gridData?.rows?.[ref.row] || [];
    const baseCell = row[ref.col] || null;
    const baseLabel = bsCellValue(baseCell);
    const baseColor = bsCellColor(baseCell);
    if (baseLabel) return { label: baseLabel, color: baseColor };

    // Real sheets sometimes put the age-group text next to the colored cell or
    // in the top-left cell of a merged block while the clicked reference lands
    // inside an empty sibling cell. Search nearby cells on the same row first.
    for (let delta = 1; delta <= 3; delta++) {
      for (const col of [ref.col + delta, ref.col - delta]) {
        if (col < 0) continue;
        const cell = row[col] || null;
        const label = bsCellValue(cell);
        if (!label) continue;
        const color = bsCellColor(cell) || baseColor;
        return { label, color };
      }
    }

    // Fallback for vertically merged legends or stacked labels.
    for (let delta = 1; delta <= 2; delta++) {
      for (const rowIdx of [ref.row - delta, ref.row + delta]) {
        if (rowIdx < 0) continue;
        const cell = gridData?.rows?.[rowIdx]?.[ref.col] || null;
        const label = bsCellValue(cell);
        if (!label) continue;
        const color = bsCellColor(cell) || baseColor;
        return { label, color };
      }
    }

    return { label: '', color: baseColor };
  }

  async function bsFetchJson(url, accessToken, label) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      let payload = null;
      try {
        payload = await resp.json();
      } catch {
        payload = null;
      }
      if (!resp.ok) {
        const apiMsg = payload?.error?.message || payload?.error_description || '';
        throw new Error(`${label} failed (HTTP ${resp.status})${apiMsg ? ' — ' + apiMsg : ''}`);
      }
      return payload;
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error(`${label} timed out after 15 seconds`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function bsFetchGoogleSheetGrid({ sheetId, sheetGid, accessToken }) {
    if (!sheetId) throw new Error('Missing sheet ID');
    if (!accessToken) throw new Error('Missing Google access token');

    const meta = await bsFetchJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets(properties(sheetId,title,gridProperties))`,
      accessToken,
      'Google Sheets metadata fetch'
    );
    const sheets = meta?.sheets || [];
    const target = sheets.find(s => String(s?.properties?.sheetId) === String(sheetGid))
      || sheets[0];
    if (!target?.properties?.title) throw new Error('Could not find the requested sheet tab');
    const sheetTitle = target.properties.title;
    const encodedRange = encodeURIComponent(`'${sheetTitle.replace(/'/g, "''")}'`);
    const gridJson = await bsFetchJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=true&ranges=${encodedRange}`,
      accessToken,
      'Google Sheets grid fetch'
    );
    const gridSheet = (gridJson?.sheets || [])[0];
    if (!gridSheet) throw new Error('No grid data returned for the selected tab');
    const rowData = gridSheet?.data?.[0]?.rowData || [];
    const maxCols = rowData.reduce((max, row) => Math.max(max, (row?.values || []).length), 0);
    const rows = rowData.map(row => {
      const vals = row?.values || [];
      return Array.from({ length: maxCols }, (_, idx) => vals[idx] || null);
    });
    const values = rows.map(row => row.map(bsCellValue));
    return {
      sheetTitle,
      sheetGid: String(target.properties.sheetId),
      rows,
      values,
      maxCols,
    };
  }

  function bsBuildColorLegend(gridData, refs) {
    const parsedRefs = refs
      .map(bsParseCellRef)
      .filter(Boolean);
    if (!parsedRefs.length) throw new Error('Could not parse legend cell refs');
    const entries = parsedRefs.map(ref => {
      const { label, color } = bsResolveLegendLabel(gridData, ref);
      return { ...ref, label, color };
    }).filter(entry => entry.label);
    if (!entries.length) throw new Error('Legend cells appear empty');
    if (entries.some(entry => !entry.color)) {
      throw new Error('Legend cells need fill colors so the importer can separate age groups');
    }
    return entries;
  }

  function bsAssignRowAgeGroups(gridData, legendEntries) {
    const colorMap = Object.fromEntries(legendEntries.map(entry => [entry.label, entry.color]));
    const rowAgeGroups = new Array((gridData?.rows || []).length).fill('');
    let active = '';
    for (let ri = 0; ri < (gridData?.rows || []).length; ri++) {
      const row = gridData.rows[ri] || [];
      const counts = {};
      let strongest = '';
      let strongestCount = 0;
      for (const cell of row) {
        const value = bsCellValue(cell);
        if (!value) continue;
        const color = bsCellColor(cell);
        if (!color) continue;
        let bestLabel = '';
        let bestDist = 70;
        for (const entry of legendEntries) {
          const dist = bsHexDistance(color, entry.color);
          if (dist < bestDist) {
            bestDist = dist;
            bestLabel = entry.label;
          }
        }
        if (!bestLabel) continue;
        counts[bestLabel] = (counts[bestLabel] || 0) + 1;
        if (counts[bestLabel] > strongestCount) {
          strongest = bestLabel;
          strongestCount = counts[bestLabel];
        }
      }
      if (!strongest) {
        const rowText = row.map(bsCellValue).join(' ').toLowerCase();
        const labelHit = legendEntries.find(entry => rowText.includes(String(entry.label || '').toLowerCase()));
        if (labelHit) strongest = labelHit.label;
      }
      if (strongest) active = strongest;
      const hasContent = row.some(cell => bsCellValue(cell));
      rowAgeGroups[ri] = hasContent ? active : '';
    }
    return { rowAgeGroups, colorMap };
  }

  function bsBuildColorCodedAgeGroups(gridData, legendCells) {
    const refs = String(legendCells || '').split(/[\s,]+/).map(part => part.trim()).filter(Boolean);
    const legendEntries = bsBuildColorLegend(gridData, refs);
    const { rowAgeGroups, colorMap } = bsAssignRowAgeGroups(gridData, legendEntries);
    return {
      ageGroups: legendEntries.map(entry => entry.label),
      legendParsed: legendEntries.map(entry => ({ ref: entry.ref, row: entry.row, col: entry.col })),
      legendColors: colorMap,
      rowAgeGroups,
    };
  }

  function bsExtractGridRows(gridData, range, selectedAgeGroup, rowAgeGroups) {
    const values = gridData?.values || [];
    const bounds = range ? bsParseA1Range(range) : null;
    const startRow = bounds ? bounds.startRow : 0;
    const endRow = bounds ? Math.min(values.length - 1, bounds.endRow) : values.length - 1;
    const startCol = bounds ? bounds.startCol : 0;
    const endCol = bounds ? Math.min((gridData?.maxCols || 0) - 1, bounds.endCol) : (gridData?.maxCols || 0) - 1;
    const rows = [];
    const shouldFilterByAge = !!selectedAgeGroup && !!bounds;
    for (let ri = startRow; ri <= endRow; ri++) {
      const rowAge = rowAgeGroups?.[ri] || '';
      if (shouldFilterByAge && rowAge && rowAge !== selectedAgeGroup) continue;
      const row = values[ri] || [];
      rows.push(row.slice(startCol, endCol + 1).map(cell => String(cell || '').trim()));
    }
    return rows;
  }

  function bsComputeBracketPaths(allRows, seedingMap, myPool, cols, helpers) {
    const { parseDateToISO, isoToDate } = helpers;
    const poolUpper = String(myPool || '').replace(/^pool\s*/i, '').trim().toUpperCase();
    if (!poolUpper || !/^[A-Z]$/.test(poolUpper) || !Array.isArray(allRows) || !allRows.length) return [];
    const { dateCol = 0, timeCol = 2, whiteCol = 3, darkCol = 5, locCol = 1, dataStartRow = 0 } = cols || {};

    const codeToGames = {};
    for (let ri = dataStartRow; ri < allRows.length; ri++) {
      const row = allRows[ri] || [];
      const rawWhite = String(row[whiteCol] || '').trim();
      const rawBlue = String(row[darkCol] || '').trim();
      const wCode = bsExtractBracketCode(rawWhite);
      const bCode = bsExtractBracketCode(rawBlue);
      if (!wCode && !bCode) continue;
      const rawTime = String(row[timeCol] || '').trim();
      const rawDate = dateCol >= 0 ? String(row[dateCol] || '').trim() : '';
      const rawLoc = locCol >= 0 ? String(row[locCol] || '').trim() : '';
      const locP = bsParseLocation(rawLoc);
      const dateISO = parseDateToISO(rawDate);
      let timeFmt = rawTime;
      if (rawTime && !/am|pm/i.test(rawTime)) {
        const hm = rawTime.match(/^(\d{1,2}):/);
        if (hm) {
          const h = parseInt(hm[1], 10);
          timeFmt = rawTime + (h >= 7 && h <= 11 ? ' AM' : ' PM');
        }
      }
      const game = {
        white: rawWhite,
        blue: rawBlue,
        whiteCode: wCode,
        blueCode: bCode,
        time: timeFmt,
        dateISO,
        date: dateISO ? isoToDate(dateISO) : rawDate,
        location: locP.venue + (locP.poolNum ? ' Pool ' + locP.poolNum : ''),
      };
      if (wCode) (codeToGames[wCode] = codeToGames[wCode] || []).push(game);
      if (bCode) (codeToGames[bCode] = codeToGames[bCode] || []).push(game);
    }

    function getReachable(startCode) {
      const visited = new Set();
      const reachable = [];
      const queue = [startCode];
      while (queue.length) {
        const code = queue.shift();
        if (visited.has(code)) continue;
        visited.add(code);
        for (const g of (codeToGames[code] || [])) {
          if (!reachable.includes(g)) reachable.push(g);
        }
        const grp = code.match(/^([A-Z])/)?.[1];
        if (grp) {
          const wc = seedingMap[('1st ' + grp).toLowerCase()];
          const lc = seedingMap[('2nd ' + grp).toLowerCase()];
          if (wc && !visited.has(wc)) queue.push(wc);
          if (lc && !visited.has(lc)) queue.push(lc);
        }
      }
      return reachable;
    }

    const paths = [];
    for (const ord of ['1st', '2nd', '3rd', '4th', '5th']) {
      const startCode = seedingMap[(ord + ' ' + poolUpper).toLowerCase()];
      if (!startCode) continue;
      const reachable = getReachable(startCode);
      if (!reachable.length) continue;
      const byDate = {};
      const dateOrder = [];
      for (const g of reachable) {
        const dk = g.dateISO || g.date || 'TBD';
        if (!byDate[dk]) {
          byDate[dk] = [];
          dateOrder.push(dk);
        }
        byDate[dk].push(g);
      }
      for (const dk of [...new Set(dateOrder)].sort()) {
        const dg = byDate[dk];
        paths.push({
          id: 'bs-' + ord.replace(/\W/g, '') + poolUpper + '-' + dk,
          label: 'If ' + ord + ' in Pool ' + poolUpper + ' \u2014 ' + dg.length + ' possible game' + (dg.length !== 1 ? 's' : ''),
          qualifier: 'Bracket games your team could play if they finish ' + ord + ' in Pool ' + poolUpper + '.',
          steps: dg.map(g => ({
            gameNum: '',
            desc: bsBracketGameDesc(g.white) + ' vs ' + bsBracketGameDesc(g.blue),
            time: g.time || 'TBD',
            date: g.date || dk,
            dateISO: g.dateISO || '',
            location: g.location || '',
          })),
        });
      }
    }
    return paths;
  }

  function bsIsFuturesWinLossSheet(state, allRows) {
    if (state?.bsync?.wizardMode !== 'futures') return false;
    return (allRows || []).some(row =>
      Array.isArray(row) && row.some(cell => /\b[WL]-?Game\s*\d+\b/i.test(String(cell || '').trim()))
    );
  }

  function bsBuildKap7RowContext(allRows, helpers) {
    const { parseDateToISO } = helpers;
    const rowDate = new Array(allRows.length).fill('');
    const rowLoc = new Array(allRows.length).fill('');
    let currentDate = '';
    let currentLoc = '';
    for (let ri = 0; ri < allRows.length; ri++) {
      const row = allRows[ri] || [];
      for (let ci = 0; ci < Math.min(row.length, 8); ci++) {
        const d = parseDateToISO((row[ci] || '').trim());
        if (d) {
          currentDate = d;
          break;
        }
      }
      for (let ci = 0; ci < Math.min(row.length - 1, 8); ci++) {
        const lc = (row[ci] || '').toLowerCase().trim();
        if (lc === 'location:' || lc === 'location') {
          const v = (row[ci + 1] || '').trim();
          if (v && !/^location/i.test(v)) {
            currentLoc = v;
            break;
          }
        }
      }
      rowDate[ri] = currentDate;
      rowLoc[ri] = currentLoc;
    }
    return { rowDate, rowLoc };
  }

  function bsCollectKap7SectionRows(allRows, rowContext, helpers) {
    const { isoToDate } = helpers;
    const sectionRows = [];
    for (let ri = 0; ri < allRows.length; ri++) {
      const row = allRows[ri] || [];
      const rawGameNum = String(row[0] || '').trim();
      if (!/^\d+$/.test(rawGameNum)) continue;
      const white = String(row[2] || '').trim();
      const dark = String(row[3] || '').trim();
      if (!white && !dark) continue;
      sectionRows.push({
        gameNum: rawGameNum,
        white,
        dark,
        time: String(row[1] || '').trim(),
        dateISO: rowContext.rowDate[ri] || '',
        date: rowContext.rowDate[ri] ? isoToDate(rowContext.rowDate[ri]) : '',
        location: rowContext.rowLoc[ri] || '',
        pool: String(row[4] || '').trim(),
        group: String(row[6] || '').trim(),
        format: String(row[7] || '').trim(),
        note: String(row[8] || '').trim(),
      });
    }
    return sectionRows;
  }

  function bsIsKap7WinLossRow(row) {
    const raw = String(row?.format || row?.note || '').trim().toLowerCase();
    return raw === 'w/l' || raw === 'win/loss' || raw === 'win-loss';
  }

  function bsExpandKap7Ref(raw, helpers) {
    const { normalizeOpponentName } = helpers;
    const text = String(raw || '').trim();
    const win = text.match(/^W-?Game\s*(\d+)$/i);
    if (win) return `Winner of Game ${win[1]}`;
    const loss = text.match(/^L-?Game\s*(\d+)$/i);
    if (loss) return `Loser of Game ${loss[1]}`;
    return normalizeOpponentName(text || 'TBD');
  }

  function bsFindKap7LiveBracketGame(sectionRows, teamName, slotGames) {
    const teamNeedle = String(teamName || '').trim().toLowerCase();
    const slotLocations = new Set((slotGames || []).map(g => String(g.location || '').trim().toLowerCase()).filter(Boolean));
    return sectionRows.find(row => {
      if (!bsIsKap7WinLossRow(row)) return false;
      if (slotLocations.size && !slotLocations.has(String(row.location || '').trim().toLowerCase())) return false;
      return row.white.toLowerCase().includes(teamNeedle) || row.dark.toLowerCase().includes(teamNeedle);
    }) || null;
  }

  function bsBuildKap7OutcomeRows(sectionRows, liveBracketGame, outcome) {
    const sameBlockRows = sectionRows.filter(row =>
      row.dateISO === liveBracketGame.dateISO &&
      row.location === liveBracketGame.location &&
      row.group === liveBracketGame.group &&
      bsIsKap7WinLossRow(row)
    );
    return sameBlockRows.filter(row => new RegExp(`\\b${outcome}-?Game\\s*${liveBracketGame.gameNum}\\b`, 'i').test(`${row.white} ${row.dark}`));
  }

  function bsBuildKap7PathSteps(rows, outcome, liveBracketGame, teamName, helpers) {
    const escapedTeamName = teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return rows.map(row => {
      const teamOnWhite = new RegExp(`\\b${escapedTeamName}\\b`, 'i').test(row.white) ||
        new RegExp(`^${outcome}-?Game\\s*${liveBracketGame.gameNum}$`, 'i').test(row.white);
      const otherSide = teamOnWhite ? row.dark : row.white;
      return {
        gameNum: row.gameNum,
        desc: `vs ${bsExpandKap7Ref(otherSide, helpers)}`,
        time: row.time || 'TBD',
        date: row.date || (row.dateISO ? helpers.isoToDate(row.dateISO) : ''),
        dateISO: row.dateISO || '',
        location: row.location || '',
      };
    });
  }

  function bsBuildKap7TeamPaths(slot, teamName, games, sectionRows, helpers) {
    const slotGames = slot ? games.filter(g => (g.team || '') === slot) : [...games];
    const slotKey = (slot || 'A').toLowerCase();
    if (!slotGames.length) return [];
    const liveBracketGame = bsFindKap7LiveBracketGame(sectionRows, teamName, slotGames);
    if (!liveBracketGame) return [];
    const winRows = bsBuildKap7OutcomeRows(sectionRows, liveBracketGame, 'W');
    const lossRows = bsBuildKap7OutcomeRows(sectionRows, liveBracketGame, 'L');
    const paths = [];
    if (winRows.length) {
      paths.push({
        id: `kap7-futures-${slotKey}-win-${liveBracketGame.dateISO || 'day1'}`,
        label: `If ${teamName} wins Game ${liveBracketGame.gameNum}`,
        qualifier: `Official bracket path from the Futures sheet — ${liveBracketGame.location}.`,
        steps: bsBuildKap7PathSteps(winRows, 'W', liveBracketGame, teamName, helpers),
      });
    }
    if (lossRows.length) {
      paths.push({
        id: `kap7-futures-${slotKey}-loss-${liveBracketGame.dateISO || 'day1'}`,
        label: `If ${teamName} loses Game ${liveBracketGame.gameNum}`,
        qualifier: `Official bracket path from the Futures sheet — ${liveBracketGame.location}.`,
        steps: bsBuildKap7PathSteps(lossRows, 'L', liveBracketGame, teamName, helpers),
      });
    }
    return paths;
  }

  function bsResolveKap7SlotDescriptors(state, games) {
    const explicitNames = String(state?.bsync?.teamName || '')
      .split(',')
      .map(name => name.trim())
      .filter(Boolean);
    const slotKeys = [...new Set((games || []).map(g => String(g.team || '').trim().toUpperCase()).filter(Boolean))];
    if (slotKeys.length) {
      return slotKeys.map((slot, idx) => ({
        slot,
        teamName: explicitNames[idx] || explicitNames[0] || '',
      })).filter(item => item.teamName);
    }
    const singleName = explicitNames[0] || '';
    return singleName ? [{ slot: '', teamName: singleName }] : [];
  }

  function bsComputeKap7FuturesSpecialPaths({ allRows, games, state, helpers }) {
    if (!bsIsFuturesWinLossSheet(state, allRows)) return null;
    if (!Array.isArray(allRows) || !allRows.length || !Array.isArray(games) || !games.length) return null;
    const rowContext = bsBuildKap7RowContext(allRows, helpers);
    const sectionRows = bsCollectKap7SectionRows(allRows, rowContext, helpers);
    const descriptors = bsResolveKap7SlotDescriptors(state, games);
    if (!descriptors.length) return null;
    const bySlot = {};
    descriptors.forEach(({ slot, teamName }) => {
      const key = slot || 'A';
      bySlot[key] = bsBuildKap7TeamPaths(slot, teamName, games, sectionRows, helpers);
    });
    return Object.values(bySlot).some(paths => paths.length) ? bySlot : null;
  }

  window.AdminBracketImport = {
    bsParseLocation,
    bsExtractBracketCode,
    bsBracketGameDesc,
    bsFetchGoogleSheetGrid,
    bsBuildColorCodedAgeGroups,
    bsExtractGridRows,
    bsParseRebracket,
    bsComputeBracketPaths,
    bsComputeKap7FuturesSpecialPaths,
  };
})();
