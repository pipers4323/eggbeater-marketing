const fs = require('fs');
let content = fs.readFileSync('c:/Users/sarah/Claude Code/eggbeater-marketing/admin.html', 'utf8');

// Normalize newlines to \n to make regexes work reliably
content = content.replace(/\r\n/g, '\n');

const helper = `
    async function _pushToFirebaseMirror(teamKey, tournament, history) {
      if (typeof fbSaveTournamentMirror === 'function') {
        try { await fbSaveTournamentMirror(teamKey, { tournament, history }); } catch(e){}
      }
    }
`;

// Insert the helper function right before saveAndDeploy unless it's already there
if (!content.includes('_pushToFirebaseMirror')) {
  content = content.replace('async function saveAndDeploy() {', helper + '\n    async function saveAndDeploy() {');

  // 1. goLive & setUpcomingMode
  let prev = '';
  while(prev !== content) {
      prev = content;
      content = content.replace(
          /(const res = await api\('PUT', '\/admin\/data', \{ tournament: S\.tournament, history: S\.history \}\);\n\s*)(?!await _pushToFirebaseMirror)(showStatus\('Deploying)/,
          "$1await _pushToFirebaseMirror(S.team, S.tournament, S.history);\n        $2"
      );
  }

  // 3. saveUpcomingInfo
  content = content.replace(
    /(const res = await api\('PUT', '\/admin\/data', \{ tournament: S\.tournament, history: S\.history \}\);\n\s*if \(!res\.ok\)[^\n]*\n\s*)(?!await _pushToFirebaseMirror)(showStatus\('Deploying)/,
    "$1await _pushToFirebaseMirror(S.team, S.tournament, S.history);\n        $2"
  );

  // 4. deployAll (hasData)
  content = content.replace(
    /showStatus\(`Deploying \$\{key\} \(has data\)…`, 'info'\);\n\s*S\.team = key;\n\s*const depRes = await api\('POST', '\/admin\/deploy'\);/,
    "showStatus(`Deploying ${key} (has data)…`, 'info');\n            S.team = key;\n            await _pushToFirebaseMirror(key, tournament, history);\n            const depRes = await api('POST', '/admin/deploy');"
  );

  // 5. deployAll (stayTuned)
  content = content.replace(
    /if \(!saveRes\.ok\) \{ S\.team = origTeam; failed\.push\(key\); continue; \}\n\s*const depRes = await api\('POST', '\/admin\/deploy'\);/,
    "if (!saveRes.ok) { S.team = origTeam; failed.push(key); continue; }\n            await _pushToFirebaseMirror(key, stayTunedTournament, []);\n            const depRes = await api('POST', '/admin/deploy');"
  );

  // 6. setAllUpcomingMode
  content = content.replace(
    /const saveRes = await api\('PUT', `\/admin\/data\?team=\$\{encodeURIComponent\(key\)\}`, \{ tournament: t, history: data\.history \|\| \[\] \}\);\n\s*if \(!saveRes\.ok\)/,
    "const saveRes = await api('PUT', `/admin/data?team=${encodeURIComponent(key)}`, { tournament: t, history: data.history || [] });\n          await _pushToFirebaseMirror(key, t, data.history || []);\n          if (!saveRes.ok)"
  );

  // 7. deployRaw
  content = content.replace(
    /const saveRes = await api\('PUT', '\/admin\/data', \{ tournament: parsed\.tournament, history: parsed\.history \}\);\n\s*if \(!saveRes\.ok\)/,
    "const saveRes = await api('PUT', '/admin/data', { tournament: parsed.tournament, history: parsed.history });\n        await _pushToFirebaseMirror(S.team, parsed.tournament, parsed.history);\n        if (!saveRes.ok)"
  );

  // Convert newlines back to Windows \r\n to match project style
  content = content.replace(/\n/g, '\r\n');

  fs.writeFileSync('c:/Users/sarah/Claude Code/eggbeater-marketing/admin.html', content);
  console.log('Patched admin.html successfully');
} else {
  console.log('Already patched!');
}
