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

  function bsIsKap7Futures14uSheet(state) {
    if (state?.bsync?.sheetId !== '1n7y7fVM7RWku9yzqyx5sIxwdOTvDuXInV-Q0nLW9c7c') return false;
    return /14u/i.test(String(state?.bsync?.myAgeGroup || ''));
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
        group: String(row[6] || '').trim(),
        note: String(row[7] || '').trim(),
      });
    }
    return sectionRows;
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

  function bsFindKap7LiveBracketGame(sectionRows, teamName, locationHint) {
    return sectionRows.find(row => {
      if (!/win\/loss/i.test(row.note || '')) return false;
      if (locationHint && row.location !== locationHint) return false;
      return row.white.toLowerCase().includes(teamName.toLowerCase()) || row.dark.toLowerCase().includes(teamName.toLowerCase());
    }) || null;
  }

  function bsBuildKap7OutcomeRows(sectionRows, liveBracketGame, outcome) {
    const sameBlockRows = sectionRows.filter(row =>
      row.dateISO === liveBracketGame.dateISO &&
      row.location === liveBracketGame.location &&
      /win\/loss/i.test(row.note || '')
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

  function bsBuildKap7TeamPaths(slot, teamName, locationHint, games, sectionRows, helpers) {
    const slotGames = games.filter(g => (g.team || '') === slot);
    if (!slotGames.length) return [];
    const liveBracketGame = bsFindKap7LiveBracketGame(sectionRows, teamName, locationHint);
    if (!liveBracketGame) return [];
    const winRows = bsBuildKap7OutcomeRows(sectionRows, liveBracketGame, 'W');
    const lossRows = bsBuildKap7OutcomeRows(sectionRows, liveBracketGame, 'L');
    const paths = [];
    if (winRows.length) {
      paths.push({
        id: `kap7-futures-${slot.toLowerCase()}-win-${liveBracketGame.dateISO || 'day1'}`,
        label: `If ${teamName} wins Game ${liveBracketGame.gameNum}`,
        qualifier: `Official bracket path from the Futures sheet — ${liveBracketGame.location}.`,
        steps: bsBuildKap7PathSteps(winRows, 'W', liveBracketGame, teamName, helpers),
      });
    }
    if (lossRows.length) {
      paths.push({
        id: `kap7-futures-${slot.toLowerCase()}-loss-${liveBracketGame.dateISO || 'day1'}`,
        label: `If ${teamName} loses Game ${liveBracketGame.gameNum}`,
        qualifier: `Official bracket path from the Futures sheet — ${liveBracketGame.location}.`,
        steps: bsBuildKap7PathSteps(lossRows, 'L', liveBracketGame, teamName, helpers),
      });
    }
    return paths;
  }

  function bsComputeKap7FuturesSpecialPaths({ allRows, games, state, helpers }) {
    if (!bsIsKap7Futures14uSheet(state)) return null;
    if (!Array.isArray(allRows) || !allRows.length || !Array.isArray(games) || !games.length) return null;
    const rowContext = bsBuildKap7RowContext(allRows, helpers);
    const sectionRows = bsCollectKap7SectionRows(allRows, rowContext, helpers);
    const bySlot = {
      A: bsBuildKap7TeamPaths('A', '680 A', 'Campo HS/SODA AC', games, sectionRows, helpers),
      B: bsBuildKap7TeamPaths('B', '680 B', 'Independence HS', games, sectionRows, helpers),
    };
    return (bySlot.A.length || bySlot.B.length) ? bySlot : null;
  }

  window.AdminBracketImport = {
    bsParseLocation,
    bsExtractBracketCode,
    bsBracketGameDesc,
    bsParseRebracket,
    bsComputeBracketPaths,
    bsComputeKap7FuturesSpecialPaths,
  };
})();
