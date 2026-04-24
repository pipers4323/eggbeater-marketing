**Director Sheet Write-Back Setup**

Use [DIRECTOR_SHEET_WRITEBACK_APPS_SCRIPT.gs](C:/Users/sarah/Claude%20Code/eggbeater-marketing/DIRECTOR_SHEET_WRITEBACK_APPS_SCRIPT.gs) as the Google Apps Script web app that receives Eggbeater score updates and writes them back into the source Google Sheet rows captured during Director host import.

**What This Solves**
- Director host import already preserves the source row and score column metadata for each imported game.
- Eggbeater can now POST score updates to an Apps Script webhook whenever:
  - a director submits a score
  - an admin overrides a director score
  - an imported team records live scores
  - an imported team finalizes a score

**Setup**
1. Open the Google Sheet you want Eggbeater to update.
2. Click `Extensions -> Apps Script`.
3. Replace the default script with the contents of [DIRECTOR_SHEET_WRITEBACK_APPS_SCRIPT.gs](C:/Users/sarah/Claude%20Code/eggbeater-marketing/DIRECTOR_SHEET_WRITEBACK_APPS_SCRIPT.gs).
4. For the fastest weekend setup, leave `SCRIPT_SECRET` blank exactly as provided.
5. Save the script.
6. Click `Deploy -> New deployment`.
7. Choose `Web app`.
8. Set:
   `Execute as`: `Me`
   `Who has access`: `Anyone`
9. Deploy and copy the web app URL.
10. In Eggbeater Director, paste that URL into `Apps Script score write-back webhook`.
11. Leave the optional secret field in Director blank for the weekend setup.
12. Publish the Director package again so the server stores the write-back config for that share code.

**Fastest Weekend Path**
1. Paste the script.
2. Do not edit the secret.
3. Deploy as a web app.
4. Paste the web app URL into Director.
5. Publish the Director package again.

That is the minimum setup.

**Expected Payload**
Eggbeater sends JSON shaped like:

```json
{
  "event": "score_update",
  "source": "team-finalize",
  "directorCode": "ABC123",
  "clubId": "680-drivers",
  "ageGroup": "14u-girls",
  "tournamentId": "kap7-futures-day4-2026-14u-girls",
  "tournamentName": "2026 Kap 7 Futures Water Polo League presented by BIWPA",
  "game": {
    "id": "gabc123",
    "gameNum": "7",
    "ageGroupName": "14u Girls",
    "division": "Masters Division 1",
    "team1Name": "680",
    "team2Name": "Davis",
    "time": "3:00 PM",
    "date": "April 25, 2026",
    "dateISO": "2026-04-25",
    "location": "Campo HS/SODA AC"
  },
  "score": {
    "score1": 8,
    "score2": 5,
    "team": 8,
    "opp": 5,
    "status": "final",
    "gameState": "final",
    "period": 4,
    "clock": "0:00",
    "updatedAt": 1777055000000
  },
  "sourceSheet": {
    "sheetId": "google-sheet-id",
    "sheetGid": "123456789",
    "rowNumber": 42,
    "whiteTeamCol": 4,
    "whiteScoreCol": 5,
    "darkTeamCol": 6,
    "darkScoreCol": 7,
    "statusCol": 8
  },
  "sharedSecret": "same-secret-you-configured",
  "sentAt": "2026-04-24T15:00:00.000Z"
}
```

**Important Notes**
- `rowNumber` and the `*ScoreCol` fields come from the Director host import. If a game was not imported from the Director sheet, there is nothing to write back.
- This starter script writes only:
  - white score
  - dark score
  - status
- Leaving the secret blank is less secure, but it is the fastest operational path for this weekend.
- If your sheet uses different columns or multiple tabs, you can adapt `resolveSheet_()` and `normalizeStatus_()`.
- The script prefers the imported tab `gid`. If that is unavailable, it falls back to matching sheet names, then the first tab.

**How To Test**
1. Import and publish a Director tournament from the Google Sheet.
2. Confirm the Director package webhook URL and secret are saved.
3. Score one imported game in Eggbeater.
4. Check the matching row in Google Sheets.
5. If it does not update, open `Apps Script -> Executions` and inspect the failed run.
