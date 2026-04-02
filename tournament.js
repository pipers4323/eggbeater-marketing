/**
 * Eggbeater Water Polo — Tournament Data
 * ==========================================
 * Update this file before each new tournament, then re-deploy to Netlify.
 * The app will automatically archive the current tournament to History
 * on each parent's device the next time they open the app.
 *
 * INSTRUCTIONS:
 *  1. Change the `id` to something unique (e.g. 'kap7-april-2026') — this triggers the archive
 *  2. Update name, location, dates, pool
 *  3. Replace the `games` array with the team's pool play schedule
 *  4. Update the `bracket.paths` with the playoff structure for this tournament
 *
 * BRACKET PATH TIPS:
 *  - Each path needs qualifyMinWins (and optionally qualifyMaxWins) to auto-project
 *  - Steps are the bracket games in order — fill in date/time/location when known
 *  - If a step's time isn't known yet, leave it as 'TBD'
 */

window.TOURNAMENT = {

  // ── Club Identity ─────────────────────────────────────────────────────────
  // Set this to the club's slug so the app always loads the right club data
  // without needing a ?club= URL parameter.
  clubId:    'big-splash',

  // ── Identity ─────────────────────────────────────────────────────────────
  // IMPORTANT: Change `id` for every new tournament — this is what triggers
  // the automatic history archive on parents' devices.
  id:        'tournament-2026',
  name:      'Tournament 2026',
  subtitle:  '',
  location:  '',
  dates:     '',
  pool:      '',

  // ── Scorer Password ───────────────────────────────────────────────────────
  // Parents must enter this to use live scoring controls.
  // Leave blank to allow anyone to score.
  scoringPassword: '',

  // ── Coming Soon Message ───────────────────────────────────────────────────
  // Blank = show the schedule below.
  comingSoon: '',

  // ── Clock Settings ────────────────────────────────────────────────────────
  clockSettings: {
    quarterMins:     6,
    breakMins:       2,
    halftimeMins:    3,
    timeoutsPerTeam: 2,
    timeoutLengths:  [1, 0.5],   // minutes — 1st T/O = 1 min, 2nd T/O = 30 sec
  },

  // ── Team Labels ───────────────────────────────────────────────────────────
  teamLabels: { A: 'Team A', B: 'Team B' },

  // ── Pool Play Games ───────────────────────────────────────────────────────
  games: [
    // {
    //   id:       'game-1',
    //   gameNum:  'G1',
    //   opponent: 'Opponent Name',
    //   time:     '8:30 AM',
    //   dateISO:  '2026-01-01',
    //   date:     'Thu, Jan 1',
    //   location: 'Pool A',
    //   pool:     'Pool A',
    //   cap:      'White',
    // },
  ],

  // ── Bracket Paths ─────────────────────────────────────────────────────────
  bracket: {
    paths: [
      // {
      //   id:              'gold',
      //   label:           'Gold Bracket',
      //   qualifier:       '2-0 · 1st in Pool',
      //   qualifyMinWins:  2,
      //   steps: [
      //     {
      //       gameNum:  'G10',
      //       desc:     'Gold Semi',
      //       date:     'Sat, Jan 1',
      //       dateISO:  '2026-01-01',
      //       time:     '2:30 PM',
      //       location: 'Main Pool',
      //     },
      //   ],
      // },
    ],
  },

  // ── Roster ────────────────────────────────────────────────────────────────
  // Cap numbers are TBD per tournament — matching is by name.
  // Update first/last names to match your actual roster before game day.
  roster: [
    { cap: '', first: 'Player',    last: 'One'    },
    { cap: '', first: 'Player',    last: 'Two'    },
    { cap: '', first: 'Player',    last: 'Three'  },
  ],
};

/**
 * HISTORY_SEED — Pre-loaded past tournament results
 * ===================================================
 * These appear in the History tab for all users on first install.
 * Add new entries chronologically (oldest last) whenever you have
 * completed tournament data to pre-populate.
 *
 * Each entry mirrors the archived tournament structure:
 *   id, name, subtitle, dates, location, pool, wins, losses, record,
 *   games: [{ id, gameNum, opponent, score, result, cap }]
 *   bracketPaths: [] (fill in if bracket results are available)
 */

window.HISTORY_SEED = [

  // Add past tournament entries here.
  // Example:
  // {
  //   id:          'tournament-example-team',
  //   name:        'Example Tournament',
  //   subtitle:    'Team A · Day 1',
  //   team:        'Team A',
  //   dates:       'January 1, 2026',
  //   location:    'Example Aquatic Center',
  //   pool:        'Pool A',
  //   wins:        2,
  //   losses:      0,
  //   record:      '2-0',
  //   games: [
  //     { id: 'g1', gameNum: 'G1', opponent: 'Opponent A', score: '10-5', result: 'W', cap: 'White' },
  //     { id: 'g2', gameNum: 'G2', opponent: 'Opponent B', score: '8-4',  result: 'W', cap: 'Dark'  },
  //   ],
  //   bracketPaths: [],
  // },

];
