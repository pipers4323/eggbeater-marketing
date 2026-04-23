(function () {
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
    bsComputeKap7FuturesSpecialPaths,
  };
})();
