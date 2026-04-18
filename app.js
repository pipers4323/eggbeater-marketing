/**
 * Eggbeater Water Polo — Tournament App
 * =========================================
 * Features:
 *  - Tournament schedule loaded from tournament.js
 *  - WIN / LOSS tracking per game
 *  - Projected next game (pool play → bracket projection)
 *  - Google Calendar sync (optional, OAuth-based)
 *  - Tournament history (auto-archived to localStorage)
 */

// ─── DARK MODE (3-mode: light / dark / system) ───────────────────────────────

function getThemePref() {
  return localStorage.getItem('ebwp-theme-preference') || 'system';
}

function applyThemePref(pref) {
  localStorage.setItem('ebwp-theme-preference', pref);
  // Legacy compat — old key
  localStorage.removeItem('ebwp-theme');
  let effective;
  if (pref === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    effective = pref;
  }
  document.documentElement.dataset.theme = effective;
  updateThemeIcon();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = effective === 'dark' ? '#0d1117' : (window._clubPrimaryColor || '#002868');
}

// Legacy toggle (from header button) — cycles light → dark → system
function toggleTheme() {
  const prefs = ['light', 'dark', 'system'];
  const cur = getThemePref();
  const next = prefs[(prefs.indexOf(cur) + 1) % prefs.length];
  applyThemePref(next);
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle');
  const pref = getThemePref();
  if (btn) btn.textContent = pref === 'dark' ? '☀️' : pref === 'system' ? '⚙️' : '🌙';
}

// Listen for OS theme changes when in 'system' mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemePref() === 'system') applyThemePref('system');
});

// Init icon on load
setTimeout(updateThemeIcon, 0);

const APP_LANG_KEY = 'ebwp-lang';
const APP_I18N = {
  en: {
    club_picker_title: 'Welcome to Eggbeater',
    club_picker_subtitle: 'Select your club to get started',
    club_picker_footer: "Don't see your club? Ask your club admin for the link.",
    spectator_guide_link: 'New to Eggbeater? Read the Spectator Guide ->',
    returning_user: 'Returning user?',
    splash_signin_hint: 'Restore your clubs and settings instantly',
    header_lang: 'Lang',
    nav_schedule: 'Schedule',
    nav_scores: 'Scores',
    nav_history: 'History',
    nav_more: 'More',
    nav_roster: 'Roster',
    nav_settings: 'Settings',
    nav_help: 'Help',
    nav_tournament_scores: 'Tournament Scores',
    settings_title: 'Settings',
    settings_subtitle: 'Manage your team and preferences.',
    settings_team_selection: 'Team Selection',
    settings_my_clubs: 'My Clubs',
    settings_add_club: 'Add Club',
    settings_add_club_desc: 'Join another club via code',
    settings_return_splash: 'Return to Splash Screen',
    settings_return_splash_desc: 'Go back to club selection',
    settings_appearance: 'Appearance',
    settings_appearance_desc: 'Choose your display theme',
    settings_calendar: 'Calendar and Notifications',
    settings_subscription: 'Subscription',
    settings_help: 'Help and Support',
    settings_account: 'Account',
    settings_how_to_use: 'How to Use Eggbeater',
    settings_how_to_use_desc: 'Scoring, bracket, notifications and more',
    team_picker_title: 'Select Age Groups',
    team_picker_select_all: 'Select all',
    team_picker_clear: 'Clear',
    team_picker_done_count: 'Done ({count})',
    team_picker_select_one: 'Select at least one',
    team_picker_selected: 'Selected',
    team_picker_tap_include: 'Tap to include',
    team_picker_change: 'Change age groups',
    team_picker_empty_chip: 'Select Team',
    schedule_select_prompt: 'Select an age group above to view the schedule.',
    schedule_force_refresh: 'Force Refresh',
    next_tournament_complete: 'Tournament Complete',
    next_check_history_final: 'Check History for final results',
    next_all_games_complete: 'All Games Complete',
    next_no_more_scheduled: 'No more scheduled games',
    next_waiting_update: 'Waiting for the next tournament update',
    next_check_history_results: 'Check the History tab for results',
    next_in_progress: 'In Progress',
    next_next_game: 'Next Game',
    next_projected_next: 'Projected Next',
    next_based_on_record: 'Based on {record} pool record',
    possible_division_standings: 'Division Standings',
    possible_select_prompt: 'Select an age group above to view the bracket.',
    possible_coming_soon_title: 'Bracket Coming Soon',
    possible_coming_soon_body: 'The Bracket feature will be made available once the tournament schedule is received.',
    possible_no_data: 'No bracket data for this tournament.',
    possible_confirmed: '{record} pool record → {label} confirmed.',
    possible_projected: '{record} pool record → projected {label}.',
    possible_mark_results: 'Mark pool play results to see your projected bracket path.',
    possible_projected_badge: 'Projected',
    history_title: 'Tournament History',
    history_select_prompt: 'Select an age group above to view tournament history.',
    history_desc: 'Past tournament results, most recent first.',
    history_empty: 'No history yet. Results from completed tournaments will appear here automatically.',
    history_goals_label: 'Goals:',
    history_assists_label: 'Assists:',
    history_player_label: 'Player',
    common_share: 'Share',
    common_follow_live: 'Follow Live',
    common_send_telegram: 'Send to Telegram',
    common_send_groupme: 'Send to GroupMe',
    help_schedule_title: 'Schedule Tab',
    help_history_title: 'History Tab',
    help_scores_title: 'Scores Tab — Live Scores & Box Scores',
    help_live_scoring_title: 'Live Scoring — Scorer Controls',
    help_schedule_body: `<p>The <strong>Schedule</strong> tab shows all upcoming games for the selected team sorted by game number.</p>
      <ul>
        <li>The <strong>Next Game</strong> card at the top highlights your next upcoming game in blue. When a game is being live-scored it turns red, shows <strong>LIVE</strong>, and displays the current score, quarter, and live clock.</li>
        <li>Games below the Next Game card show opponent, game number, time, pool, location, and cap color.</li>
        <li>The next game only appears once and does not duplicate in the list below.</li>
        <li>Once a game has a result it automatically moves to the <strong>History</strong> tab.</li>
        <li>Tap <strong>Add to Calendar</strong> to sync all games to Google Calendar.</li>
        <li>Tap <strong>Get Notified</strong> to enable push notifications when the schedule changes.</li>
        <li>If multiple age groups are selected, the schedule splits into labeled sections so you can follow more than one team at once.</li>
      </ul>`,
    help_scores_body: `<p>The <strong>Scores</strong> tab is where live scoring and box scores live. Watch for a pulsing red dot on the Scores nav button when a game is being actively scored.</p>
      <ul>
        <li><strong>View Live Scores</strong> lets you follow a live game without the scoring password.</li>
        <li>Tap <strong>Login to Score</strong> in the viewer if you have the password and need full scoring controls.</li>
        <li>When a scorer is active you will see a <strong>LIVE</strong> badge and updates appear within about 5 seconds.</li>
        <li>The <strong>event log</strong> shows every goal, assist, exclusion, and other event with clock times.</li>
        <li>The <strong>box score</strong> shows each player's totals for goals, attempts, 5m, shootout stats, assists, exclusions, and earned exclusions.</li>
        <li>After the game, stats flow into player history in the Roster tab.</li>
      </ul>`,
    help_live_scoring_body: `<p>If you have the scoring password, tap <strong>Login to Score</strong> in the top-right of the viewer and enter the tournament password to unlock full scoring controls.</p>
      <ul>
        <li>Only the current game shows its full scoring buttons. Upcoming games stay collapsed until you need them.</li>
        <li><strong>Auto Clock</strong> counts down automatically from the admin-set quarter length. Tap <strong>Start</strong> to begin Q1 and the clock.</li>
        <li><strong>Game State bar</strong> moves through Start, quarters, halftime, and Final. The <strong>Pre</strong> button resets back to pre-game.</li>
        <li><strong>Goal / Opp Goal</strong> records a goal and prompts for the scorer.</li>
        <li><strong>Attempt / Opp Attempt</strong> records a shot that did not score.</li>
        <li><strong>Assist</strong>, <strong>Steal</strong>, <strong>Field Block</strong>, <strong>Excl</strong>, and <strong>Earned Excl</strong> track the rest of the stat line.</li>
        <li><strong>5m</strong> and <strong>5m Attempt</strong> track penalty shots.</li>
        <li><strong>GK Save</strong> records goalie saves.</li>
        <li><strong>Timeout</strong> buttons pause the clock automatically and gray out after use.</li>
        <li><strong>Reset Clock</strong> restores the full quarter length without changing the game state.</li>
        <li><strong>Undo</strong> removes the last logged event.</li>
      </ul>`,
    help_history_body: `<p><strong>History</strong> keeps a running record of completed tournaments.</p>
      <ul>
        <li>When you mark a result in Scores, that game moves off Schedule and into History automatically.</li>
        <li>Full tournament results archive automatically when a new tournament loads.</li>
        <li>The standings table shows cumulative bracket points across all tournament days.</li>
        <li>Tap any tournament entry to expand it and see game-by-game results.</li>
        <li>History is stored on your device and also seeded from the official record on first install.</li>
      </ul>`,
    help_shootout_title: 'Shootout Mode',
    help_shootout_body: `<p>When a game is tied at the end of regulation, tap <strong>SO</strong> in the game state bar to enter Shootout Mode.</p>
      <ul>
        <li>Each team selects 5 players to take 5-meter shots.</li>
        <li>Each shootout goal adds <strong>+0.1</strong> to the score so a tied game can still display the shootout result.</li>
        <li><strong>SO Goal / Opp SO Goal</strong> replaces the normal goal buttons during shootout mode.</li>
        <li><strong>SO Miss</strong> tracks missed shootout shots for stats.</li>
        <li>The normal 5m row is hidden during shootouts.</li>
        <li>You can send a shootout alert to Telegram or GroupMe when the shootout begins.</li>
      </ul>`,
    help_bracket_title: 'Bracket Tab',
    help_bracket_body: `<p>The <strong>Bracket</strong> tab shows where the team could end up based on pool-play results.</p>
      <ul>
        <li>Before the schedule is posted it shows <em>Bracket Coming Soon</em>.</li>
        <li>As results are entered, the projected bracket path highlights automatically.</li>
        <li>Gold, Silver, and Bronze paths can show the possible opponent, time, and location.</li>
        <li>Bracket points are <strong>Win 4, SO Win 3, SO Loss 2, Loss 1, Forfeit 0</strong>.</li>
        <li>If multiple age groups or split teams are selected, each gets its own labeled bracket section.</li>
      </ul>`,
    help_myplayer_title: 'My Player — Follow Your Child',
    help_myplayer_body: `<p>In the <strong>Roster</strong> tab, the <em>My Player</em> card lets you follow your child's stats across the season.</p>
      <ul>
        <li>With one age group selected, choose your child from the dropdown.</li>
        <li>With multiple age groups selected, a separate My Player card appears for each team.</li>
        <li>The card surfaces goals, assists, attempts, exclusions, earned exclusions, games played, and shooting percentages.</li>
        <li>Recent games are listed with per-game stats and scores.</li>
        <li>The stats CSV export downloads the full tracked history.</li>
        <li>Goalies see saves instead of shooting percentages.</li>
      </ul>`,
    help_agegroup_title: 'Age Group Selector & A/B Team Picker',
    help_agegroup_body: `<p>The age group selector below the tournament header controls which teams you are viewing.</p>
      <ul>
        <li>Tap an age group to activate it.</li>
        <li>Tap another group to follow multiple age groups at the same time.</li>
        <li>Selections stay sorted in age order and are remembered between sessions.</li>
        <li>If a club has A/B teams in the same age group, the selector expands so you can choose one or both squads independently.</li>
        <li>When the age group picker slides up, tap <strong>Done</strong> at the top-right (next to <em>Select all</em> and <em>Clear</em>) to confirm your selection and close the picker.</li>
      </ul>`,
    help_multi_title: 'Multi-Age-Group & Split-Team View',
    help_multi_body: `<p>Eggbeater can show multiple age groups and multiple squads at the same time across Schedule, Scores, Bracket, Roster, and History.</p>
      <ul>
        <li>When multiple age groups are active, each tab splits into labeled sections.</li>
        <li>When both A and B teams are selected, each squad gets its own section and data stays separated.</li>
        <li>Section headers tell you exactly which age group and team you are looking at.</li>
        <li>History and bracket tracking remain independent per team.</li>
      </ul>`,
    help_settings_title: 'Settings — Team Selection, My Clubs & Account',
    help_settings_body: `<p>Open the <strong>Settings</strong> tab to manage your setup.</p>
      <ul>
        <li><strong>Team Selection</strong> lets you choose one or multiple age groups and saves those selections automatically.</li>
        <li><strong>My Clubs</strong> lists every club you have joined and lets you switch between them.</li>
        <li><strong>Add Club</strong> lets you join another club with its code or invite link.</li>
        <li><strong>Return to Splash Screen</strong> clears the current club view without deleting your saved clubs.</li>
        <li><strong>Account</strong> shows your signed-in identity when you use Google sign-in, and lets you sign out.</li>
      </ul>`,
    help_notifications_title: 'Notifications & Calendar Sync',
    help_notifications_body: `<p>Use notifications and calendar sync so tournament-day changes reach you automatically.</p>
      <ul>
        <li><strong>Google Calendar</strong> can sync games so time and location updates flow into your calendar.</li>
        <li>You can change the connected calendar later from the calendar settings card.</li>
        <li>The calendar connection reconnects automatically on future visits once it has been authorized.</li>
        <li><strong>Push Notifications</strong> notify you when schedules change or games go live.</li>
        <li><strong>Telegram / GroupMe</strong> updates can also be sent by the scorer to your team channels.</li>
        <li>If your admin shares a <code>webcal://</code> link, you can subscribe and keep bracket or NJO feeds synced in Apple Calendar, Google Calendar, or Outlook.</li>
      </ul>`,
    help_live_updates_title: 'Live Activities & Live Updates',
    help_live_updates_body: `<p>Follow live-scored games without leaving your lock screen.</p>
      <ul>
        <li><strong>iPhone</strong> uses Live Activities on the lock screen and Dynamic Island.</li>
        <li><strong>Android 16+</strong> uses a persistent Live Update notification chip.</li>
        <li>Tap <strong>Follow Live</strong> on an in-progress game to start following it.</li>
        <li>Live updates work alongside push notifications.</li>
      </ul>`,
    help_watch_title: 'Apple Watch Companion App',
    help_watch_body: `<p>The native iOS app includes an Apple Watch companion app for quick tournament-day checks.</p>
      <ul>
        <li>The Watch app uses club branding and shows the selected club and team.</li>
        <li>You can choose which team the Watch should follow.</li>
        <li>You can pin a featured game or let Eggbeater auto-select the next game.</li>
        <li>The Watch can show schedules and haptic goal alerts for the live game you are following.</li>
      </ul>`,
    help_widgets_title: 'Home Screen Widgets',
    help_widgets_body: `<p>Add Eggbeater widgets to your home screen for quick access.</p>
      <ul>
        <li><strong>Score Widget</strong> shows the live or most recent score.</li>
        <li><strong>Schedule Widget</strong> shows the next upcoming game.</li>
        <li><strong>Stats Widget</strong> highlights top scorers from the current tournament.</li>
        <li>Widgets are available on both iOS and Android and refresh automatically when data changes.</li>
      </ul>`,
    help_tscore_title: 'T-Score Tab — Tournament Director Scores',
    help_tscore_body: `<p>The <strong>T-Score</strong> tab shows official scores published by the tournament director, separate from the live stat tracking flow.</p>
      <ul>
        <li>Director scores are the official finals used for standings and bracket placement.</li>
        <li>Authorized scorers may be able to submit final scores from this tab if the director has enabled that flow.</li>
        <li>Scores refresh as new director results are published.</li>
        <li>If your team admin has imported games from a hosted tournament director package, this tab also shows the <strong>director-published schedule</strong> — game times, courts, and matchups for all age groups at the tournament, so you can see the full picture even across teams you are not directly following.</li>
      </ul>`,
    help_multiclub_title: 'Multi-Club Support',
    help_multiclub_body: `<p>Eggbeater supports multiple clubs, each with separate tournaments, rosters, and admin teams.</p>
      <ul>
        <li>Each club uses its own club ID so schedules, scores, rosters, and history stay separated.</li>
        <li>A <code>?join=</code> link can add and open a club automatically.</li>
        <li>Your age-group selections and My Player picks are saved per club.</li>
        <li>Club branding colors and logos are also scoped per club.</li>
      </ul>`,
    help_darkmode_title: 'Dark Mode',
    help_darkmode_body: `<p>Eggbeater supports dark mode for easier viewing in low light.</p>
      <ul>
        <li>Choose <strong>Light</strong>, <strong>Dark</strong>, or <strong>System</strong> in Settings.</li>
        <li>The app can match your device theme automatically.</li>
        <li>Your preference is remembered between visits.</li>
        <li>All major tabs, cards, modals, and navigation surfaces support dark mode.</li>
      </ul>`,
    help_maps_title: 'Map & Directions',
    help_maps_body: `<p>Game cards include direction links so you can navigate to the venue quickly.</p>
      <ul>
        <li>The location line opens directions when tapped.</li>
        <li>Apple Maps, Google Maps, and Waze buttons are supported where available.</li>
        <li>Both the Next Game card and regular schedule cards can include map links.</li>
        <li>Coordinates are passed directly when available; otherwise the app searches by venue name.</li>
      </ul>`,
    help_offline_title: 'Offline Scoring Support',
    help_offline_body: `<p>Scorers can keep entering events even if connectivity drops.</p>
      <ul>
        <li>Failed live-score updates are queued automatically on the device.</li>
        <li>An offline banner appears while scores are waiting to sync.</li>
        <li>Queued events replay in order when the connection returns.</li>
        <li>A confirmation toast appears after scores sync successfully.</li>
      </ul>`,
    help_accessibility_title: 'Accessibility',
    help_accessibility_body: `<p>Eggbeater is designed to work with built-in iOS and Android accessibility features.</p>
      <ul>
        <li>Screen readers can navigate the app and read live updates.</li>
        <li>Voice control can activate controls by their visible names.</li>
        <li>Text scales with device font settings.</li>
        <li>Reduce Motion and higher contrast settings are respected where supported.</li>
        <li>Important state is never conveyed by color alone.</li>
      </ul>`,
    help_box_score_title: 'Live Scoring and Box Score',
    scorer_controls: 'Scoring Controls',
    scorer_open: 'Open Scorer',
    scorer_team_label: 'Team',
    scorer_opp_label: 'Opp',
    scorer_undo: 'Undo',
    scorer_share_box_score: 'Share',
    scorer_shootout_mode: 'SHOOTOUT MODE',
    scorer_shootout_hint: 'Each goal = +0.1 · Track who shoots!',
    scorer_goal: '+ Goal',
    scorer_opp_goal: '+ Opp Goal',
    scorer_team_so_goal: 'Team SO Goal',
    scorer_opp_so_goal: 'Opp SO Goal',
    scorer_team_so_miss: 'Team SO Miss',
    scorer_opp_so_miss: 'Opp SO Miss',
    scorer_assist: 'Assist',
    scorer_steal: 'Steal',
    scorer_sprint_won: 'Sprint Won',
    scorer_field_block: 'Field Block',
    scorer_attempt: 'Attempt',
    scorer_turnover: 'Turnover',
    scorer_excl: 'Excl',
    scorer_earned_excl: 'Earned Excl',
    scorer_opp_steal: 'Opp Steal',
    scorer_opp_attempt: 'Opp Attempt',
    scorer_opp_excl: 'Opp Excl',
    scorer_5m: '5m',
    scorer_5m_attempt: '5m Attempt',
    scorer_opp_5m: 'Opp 5m',
    scorer_opp_5m_attempt: 'Opp 5m Attempt',
    scorer_gk_save: 'GK Save',
    scorer_pause: 'Pause',
    scorer_start: 'Start',
    scorer_resume: 'Resume',
    scorer_reset: 'Reset',
    scorer_halftime_break: 'Halftime break',
    scorer_quarter_break: 'Quarter break',
    scorer_next_quarter_ready: 'next quarter ready',
    event_goal: 'GOAL',
    event_goal_6v5: 'GOAL (6v5)',
    event_goal_5m: 'GOAL (5m)',
    event_shot_attempt: 'SHOT ATTEMPT',
    event_turnover: 'TURNOVER',
    event_attempt_5m: 'ATTEMPT (5m)',
    event_so_goal: 'SO GOAL',
    event_so_miss: 'SO MISS',
    event_assist: 'ASSIST',
    event_steal: 'STEAL',
    event_steal_fbu: 'STEAL (FBU)',
    event_sprint_won: 'SPRINT WON',
    event_opp_sprint_won: 'OPP SPRINT WON',
    event_opp_steal: 'OPP STEAL',
    event_excl: 'EXCL',
    event_brutal: 'BRUTAL',
    event_timeout: 'TIMEOUT',
    event_opp_timeout: 'OPP T/O',
    event_save: 'SAVE',
    event_field_block: 'FIELD BLOCK',
    event_team_fallback: 'Team',
    event_opp_fallback: 'Opp',
    boxscore_goalkeeper: 'Goalkeeper',
    boxscore_player: 'Player',
    boxscore_total: 'Total',
    boxscore_team_timeouts: 'Team Timeouts: {count}',
    boxscore_shot_attempts: 'Shot Attempts',
    boxscore_5m_goals: '5m Penalty Goals',
    boxscore_5m_attempts: '5m Penalty Attempts',
    boxscore_so_goals: 'Shootout Goals',
    boxscore_so_misses: 'Shootout Misses',
    boxscore_sprints_won: 'Sprints Won',
    boxscore_forced_ball_under: 'Forced Ball Under',
    boxscore_field_blocks: 'Field Blocks',
    boxscore_earned_exclusions: 'Earned Exclusions',
    roster_title: 'Roster',
    roster_manage_players_desc: 'Manage players for live scoring. Cap numbers appear on goal/assist chips.',
    roster_download_all_stats: 'Download All Player Stats',
    roster_season_stats: 'Season Stats',
    roster_no_players_yet: 'No players yet.',
    roster_add_player: 'Add Player',
    roster_save_roster: 'Save Roster',
    playerstats_empty: 'No box scores recorded yet.<br>Use live scoring during a game to start tracking stats.',
    playerstats_download_aria: 'Download stats for {name}',
    playerstats_games_count: '{count} game(s)',
    season_stats_title: 'Season Player Stats',
    season_stats_loading: 'Loading season stats…',
    season_stats_empty: 'No archived stats yet.<br>Stats aggregate from archived tournaments with player data.',
    season_stats_failed: 'Failed to load: {message}',
    live_follow_not_started: 'Game has not started yet — check back when it begins!',
    live_follow_over: 'Game is already over.',
    live_follow_android: 'Following Live! Check your status bar for score updates.',
    live_update_plugin_missing: 'Live Update plugin not available.',
    live_follow_native_only: 'Follow Live is available in the iOS and Android apps.',
    live_activity_plugin_missing: 'Live Activity plugin not installed/registered',
    live_follow_stopped: 'Stopped following live.',
    live_follow_ios: 'Following Live! Updates appear on your lock screen.',
    live_follow_unavailable: 'Live activities unavailable: {message}'
  },
  es: {
    club_picker_title: 'Bienvenido a Eggbeater',
    club_picker_subtitle: 'Selecciona tu club para comenzar',
    club_picker_footer: 'No ves tu club? Pidele el enlace al administrador del club.',
    spectator_guide_link: 'Nuevo en Eggbeater? Lee la guia para espectadores ->',
    returning_user: 'Ya usaste la app?',
    splash_signin_hint: 'Restaura tus clubes y ajustes al instante',
    header_lang: 'Idioma',
    nav_schedule: 'Calendario',
    nav_scores: 'Marcadores',
    nav_history: 'Historial',
    nav_more: 'Mas',
    nav_roster: 'Roster',
    nav_settings: 'Ajustes',
    nav_help: 'Ayuda',
    nav_tournament_scores: 'Marcadores del torneo',
    settings_title: 'Ajustes',
    settings_subtitle: 'Administra tu equipo y preferencias.',
    settings_team_selection: 'Seleccion de equipo',
    settings_my_clubs: 'Mis clubes',
    settings_add_club: 'Agregar club',
    settings_add_club_desc: 'Unete a otro club con un codigo',
    settings_return_splash: 'Volver a inicio',
    settings_return_splash_desc: 'Regresa a la seleccion de club',
    settings_appearance: 'Apariencia',
    settings_appearance_desc: 'Elige el tema de la app',
    settings_calendar: 'Calendario y notificaciones',
    settings_subscription: 'Suscripcion',
    settings_help: 'Ayuda y soporte',
    settings_account: 'Cuenta',
    settings_how_to_use: 'Como usar Eggbeater',
    settings_how_to_use_desc: 'Marcacion, cuadro, notificaciones y mas',
    team_picker_title: 'Seleccionar grupos de edad',
    team_picker_select_all: 'Seleccionar todo',
    team_picker_clear: 'Limpiar',
    team_picker_done_count: 'Listo ({count})',
    team_picker_select_one: 'Selecciona al menos uno',
    team_picker_selected: 'Seleccionado',
    team_picker_tap_include: 'Toca para incluir',
    team_picker_change: 'Cambiar grupos de edad',
    team_picker_empty_chip: 'Seleccionar equipo',
    schedule_select_prompt: 'Selecciona un grupo de edad arriba para ver el calendario.',
    schedule_force_refresh: 'Actualizar',
    next_tournament_complete: 'Torneo finalizado',
    next_check_history_final: 'Consulta Historial para los resultados finales',
    next_all_games_complete: 'Todos los partidos finalizados',
    next_no_more_scheduled: 'No hay mas partidos programados',
    next_waiting_update: 'Esperando la proxima actualizacion del torneo',
    next_check_history_results: 'Consulta la pestaña Historial para ver los resultados',
    next_in_progress: 'En juego',
    next_next_game: 'Proximo partido',
    next_projected_next: 'Siguiente proyectado',
    next_based_on_record: 'Segun record de grupo {record}',
    possible_division_standings: 'Clasificacion de division',
    possible_select_prompt: 'Selecciona un grupo de edad arriba para ver el cuadro.',
    possible_coming_soon_title: 'Cuadro proximamente',
    possible_coming_soon_body: 'La funcion de cuadro estara disponible cuando llegue el calendario del torneo.',
    possible_no_data: 'No hay datos de cuadro para este torneo.',
    possible_confirmed: 'Record de grupo {record} → {label} confirmado.',
    possible_projected: 'Record de grupo {record} → {label} proyectado.',
    possible_mark_results: 'Marca los resultados de fase de grupos para ver tu camino proyectado.',
    possible_projected_badge: 'Proyectado',
    history_title: 'Historial del torneo',
    history_select_prompt: 'Selecciona un grupo de edad arriba para ver el historial del torneo.',
    history_desc: 'Resultados de torneos pasados, del mas reciente al mas antiguo.',
    history_empty: 'Todavia no hay historial. Los resultados de torneos finalizados apareceran aqui automaticamente.',
    history_goals_label: 'Goles:',
    history_assists_label: 'Asistencias:',
    history_player_label: 'Jugador',
    common_share: 'Compartir',
    common_follow_live: 'Seguir en vivo',
    common_send_telegram: 'Enviar a Telegram',
    common_send_groupme: 'Enviar a GroupMe',
    help_schedule_title: 'Pestaña Calendario',
    help_history_title: 'Pestaña Historial',
    help_scores_title: 'Pestaña Marcadores — Marcadores en vivo y box score',
    help_live_scoring_title: 'Marcación en vivo — Controles del anotador',
    help_schedule_body: `<p>La pestaña <strong>Calendario</strong> muestra todos los partidos pendientes del equipo seleccionado ordenados por numero de juego.</p>
      <ul>
        <li>La tarjeta de <strong>Proximo partido</strong> arriba destaca el siguiente juego. Cuando se anota en vivo se pone roja, muestra <strong>LIVE</strong> y enseña marcador, periodo y reloj.</li>
        <li>Las tarjetas de abajo muestran rival, numero de juego, hora, pool, sede y color de gorro.</li>
        <li>El proximo juego solo aparece una vez y no se duplica en la lista.</li>
        <li>Cuando un juego recibe resultado se mueve automaticamente a <strong>Historial</strong>.</li>
        <li>Toca <strong>Agregar al calendario</strong> para sincronizar con Google Calendar.</li>
        <li>Toca <strong>Recibir avisos</strong> para activar notificaciones cuando cambie el calendario.</li>
        <li>Si eliges varios grupos, el calendario se divide en secciones etiquetadas.</li>
      </ul>`,
    help_scores_body: `<p>La pestaña <strong>Marcadores</strong> contiene el marcador en vivo y el box score. Mira el punto rojo pulsante en la barra cuando un partido se esta anotando activamente.</p>
      <ul>
        <li><strong>Ver marcador en vivo</strong> te deja seguir un partido en tiempo real sin la clave de anotacion.</li>
        <li>Toca el boton <strong>Login to Score</strong> si tienes la clave y necesitas controles completos.</li>
        <li>Cuando un anotador esta activo veras la insignia <strong>LIVE</strong> y las actualizaciones llegan en unos 5 segundos.</li>
        <li>El <strong>registro de eventos</strong> muestra goles, asistencias, exclusiones y otros eventos con la hora del reloj.</li>
        <li>El <strong>box score</strong> muestra totales por jugador para goles, intentos, 5m, shootout, asistencias y exclusiones.</li>
        <li>Despues del juego las estadisticas pasan al historial del jugador en Roster.</li>
      </ul>`,
    help_live_scoring_body: `<p>Si tienes la clave de anotacion, toca el boton <strong>Login to Score</strong> en la parte superior del visor e ingresa la clave del torneo para desbloquear los controles completos.</p>
      <ul>
        <li>Solo el juego actual muestra todos los botones de anotacion. Los demas quedan plegados.</li>
        <li><strong>Auto Clock</strong> cuenta hacia atras automaticamente desde la duracion configurada por el admin. Toca <strong>Start</strong> para iniciar Q1.</li>
        <li>La <strong>barra de estado</strong> avanza por Start, cuartos, medio tiempo y Final. <strong>Pre</strong> regresa al estado previo.</li>
        <li><strong>Goal / Opp Goal</strong> registra un gol y pide elegir al goleador.</li>
        <li><strong>Attempt / Opp Attempt</strong> registra un tiro que no entro.</li>
        <li><strong>Assist</strong>, <strong>Steal</strong>, <strong>Field Block</strong>, <strong>Excl</strong> y <strong>Earned Excl</strong> completan la linea estadistica.</li>
        <li><strong>5m</strong> y <strong>5m Attempt</strong> registran tiros de penalty.</li>
        <li><strong>GK Save</strong> registra atajadas del portero.</li>
        <li>Los <strong>timeouts</strong> pausan el reloj automaticamente y se desactivan tras usarse.</li>
        <li><strong>Reset Clock</strong> restaura el tiempo completo del cuarto sin cambiar el estado del juego.</li>
        <li><strong>Undo</strong> elimina el ultimo evento registrado.</li>
      </ul>`,
    help_history_body: `<p><strong>Historial</strong> guarda un registro continuo de los torneos completados.</p>
      <ul>
        <li>Cuando marcas un resultado en Marcadores, ese partido sale de Calendario y entra en Historial automaticamente.</li>
        <li>Los resultados completos del torneo se archivan automaticamente cuando carga un torneo nuevo.</li>
        <li>La tabla de posiciones muestra puntos acumulados de bracket a lo largo de todos los dias del torneo.</li>
        <li>Toca cualquier torneo para expandirlo y ver los resultados juego por juego.</li>
        <li>El historial se guarda en tu dispositivo y tambien se inicializa desde el registro oficial.</li>
      </ul>`,
    help_shootout_title: 'Modo Shootout',
    help_shootout_body: `<p>Cuando un juego termina empatado, toca <strong>SO</strong> en la barra de estado para entrar al modo shootout.</p>
      <ul>
        <li>Cada equipo elige 5 jugadores para tirar penales de 5 metros.</li>
        <li>Cada gol del shootout suma <strong>+0.1</strong> al marcador para reflejar el desempate.</li>
        <li><strong>SO Goal / Opp SO Goal</strong> reemplaza los botones normales de gol durante el shootout.</li>
        <li><strong>SO Miss</strong> registra tiros fallados para estadisticas.</li>
        <li>La fila normal de 5m se oculta durante el shootout.</li>
        <li>Puedes enviar una alerta de shootout a Telegram o GroupMe cuando comience.</li>
      </ul>`,
    help_bracket_title: 'Pestaña Bracket',
    help_bracket_body: `<p>La pestaña <strong>Bracket</strong> muestra a donde puede llegar el equipo segun los resultados del grupo.</p>
      <ul>
        <li>Antes de que exista calendario publicado se muestra <em>Bracket Coming Soon</em>.</li>
        <li>A medida que entran resultados, el camino proyectado se resalta automaticamente.</li>
        <li>Las rutas Oro, Plata y Bronce pueden mostrar rival posible, hora y lugar.</li>
        <li>Los puntos del bracket son <strong>Win 4, SO Win 3, SO Loss 2, Loss 1, Forfeit 0</strong>.</li>
        <li>Si eliges varios grupos o equipos A/B, cada uno recibe su propia seccion etiquetada.</li>
      </ul>`,
    help_myplayer_title: 'My Player — Sigue a tu jugador',
    help_myplayer_body: `<p>En la pestaña <strong>Roster</strong>, la tarjeta <em>My Player</em> te permite seguir las estadisticas de tu hijo o hija durante la temporada.</p>
      <ul>
        <li>Con un solo grupo seleccionado, elige al jugador desde el desplegable.</li>
        <li>Con varios grupos seleccionados, aparece una tarjeta independiente por equipo.</li>
        <li>La tarjeta muestra goles, asistencias, intentos, exclusiones, exclusiones generadas, juegos y porcentajes de tiro.</li>
        <li>Tambien muestra juegos recientes con estadisticas por partido.</li>
        <li>La exportacion CSV descarga el historial completo.</li>
        <li>Los porteros ven atajadas en lugar de porcentajes de tiro.</li>
      </ul>`,
    help_agegroup_title: 'Selector de grupo y equipos A/B',
    help_agegroup_body: `<p>El selector de grupos debajo del encabezado del torneo controla que equipos ves.</p>
      <ul>
        <li>Toca un grupo para activarlo.</li>
        <li>Toca otro grupo para seguir varios grupos al mismo tiempo.</li>
        <li>Las selecciones se mantienen en orden por edad y se recuerdan entre sesiones.</li>
        <li>Si un club tiene equipos A/B en el mismo grupo, el selector se expande para elegir uno o ambos equipos.</li>
        <li>Cuando se abre el selector de grupos, toca <strong>Listo</strong> en la parte superior derecha (junto a <em>Seleccionar todo</em> y <em>Limpiar</em>) para confirmar tu seleccion y cerrar el panel.</li>
      </ul>`,
    help_multi_title: 'Vista multi-grupo y multi-equipo',
    help_multi_body: `<p>Eggbeater puede mostrar varios grupos y varios equipos al mismo tiempo en Calendario, Marcadores, Bracket, Roster e Historial.</p>
      <ul>
        <li>Cuando varios grupos estan activos, cada pestaña se divide en secciones etiquetadas.</li>
        <li>Cuando A y B estan activos, cada equipo recibe su propia seccion y los datos no se mezclan.</li>
        <li>Los encabezados te dicen exactamente que grupo y equipo estas viendo.</li>
        <li>El historial y el bracket se siguen de forma independiente por equipo.</li>
      </ul>`,
    help_settings_title: 'Ajustes — seleccion de equipo, mis clubes y cuenta',
    help_settings_body: `<p>Abre la pestaña <strong>Ajustes</strong> para administrar tu configuracion.</p>
      <ul>
        <li><strong>Seleccion de equipo</strong> te permite elegir uno o varios grupos y guarda esas selecciones automaticamente.</li>
        <li><strong>Mis clubes</strong> muestra todos los clubes a los que te has unido y permite cambiar entre ellos.</li>
        <li><strong>Agregar club</strong> te permite unirte a otro club con su codigo o enlace.</li>
        <li><strong>Volver al inicio</strong> limpia la vista actual sin borrar tus clubes guardados.</li>
        <li><strong>Cuenta</strong> muestra tu identidad conectada con Google y te permite cerrar sesion.</li>
      </ul>`,
    help_notifications_title: 'Notificaciones y sincronizacion de calendario',
    help_notifications_body: `<p>Usa notificaciones y calendario para recibir cambios automaticamente durante el torneo.</p>
      <ul>
        <li><strong>Google Calendar</strong> puede sincronizar juegos para que cambios de hora y lugar lleguen a tu calendario.</li>
        <li>Puedes cambiar luego el calendario conectado desde la tarjeta de ajustes.</li>
        <li>La conexion del calendario se reconecta automaticamente en visitas futuras una vez autorizada.</li>
        <li><strong>Push Notifications</strong> te avisan cuando cambia el calendario o un partido entra en vivo.</li>
        <li><strong>Telegram / GroupMe</strong> tambien pueden recibir actualizaciones del anotador.</li>
        <li>Si tu admin comparte un enlace <code>webcal://</code>, puedes suscribirte para mantener sincronizados feeds de bracket o NJO.</li>
      </ul>`,
    help_live_updates_title: 'Live Activities y Live Updates',
    help_live_updates_body: `<p>Sigue partidos en vivo sin abrir la app.</p>
      <ul>
        <li><strong>iPhone</strong> usa Live Activities en la pantalla bloqueada y Dynamic Island.</li>
        <li><strong>Android 16+</strong> usa una notificacion persistente tipo Live Update.</li>
        <li>Toca <strong>Seguir en vivo</strong> en un juego en progreso para empezar a seguirlo.</li>
        <li>Las actualizaciones en vivo funcionan junto con las notificaciones push.</li>
      </ul>`,
    help_watch_title: 'App complementaria de Apple Watch',
    help_watch_body: `<p>La app nativa de iOS incluye una app para Apple Watch para revisar rapidamente el torneo.</p>
      <ul>
        <li>La app del Watch usa los colores del club y muestra el club y equipo seleccionados.</li>
        <li>Puedes elegir que equipo debe seguir el Watch.</li>
        <li>Puedes fijar un juego destacado o dejar que Eggbeater elija el siguiente.</li>
        <li>El Watch puede mostrar calendario y alertas de gol con vibracion para el juego en vivo seguido.</li>
      </ul>`,
    help_widgets_title: 'Widgets de pantalla de inicio',
    help_widgets_body: `<p>Agrega widgets de Eggbeater a tu pantalla de inicio para acceso rapido.</p>
      <ul>
        <li><strong>Score Widget</strong> muestra el marcador en vivo o el mas reciente.</li>
        <li><strong>Schedule Widget</strong> muestra el siguiente juego.</li>
        <li><strong>Stats Widget</strong> destaca a los maximos goleadores del torneo actual.</li>
        <li>Los widgets existen en iOS y Android y se actualizan automaticamente cuando cambian los datos.</li>
      </ul>`,
    help_tscore_title: 'Pestaña T-Score — marcadores del director',
    help_tscore_body: `<p>La pestaña <strong>T-Score</strong> muestra los marcadores oficiales publicados por el director del torneo, separados del flujo de estadisticas en vivo.</p>
      <ul>
        <li>Los marcadores del director son los resultados oficiales usados para standings y bracket.</li>
        <li>Los anotadores autorizados pueden enviar finales desde esta pestaña si el director lo habilita.</li>
        <li>Los marcadores se actualizan al publicarse nuevos resultados del director.</li>
        <li>Si el admin de tu equipo ha importado juegos del paquete de un director de torneo, esta pestana tambien muestra el <strong>calendario publicado por el director</strong> — horarios, canchas y enfrentamientos de todos los grupos de edad del torneo, para que puedas ver el panorama completo mas alla de tu equipo.</li>
      </ul>`,
    help_multiclub_title: 'Soporte multi-club',
    help_multiclub_body: `<p>Eggbeater admite varios clubes, cada uno con torneos, rosters y admins separados.</p>
      <ul>
        <li>Cada club usa su propio ID para mantener separados calendario, marcadores, roster e historial.</li>
        <li>Un enlace con <code>?join=</code> puede agregar y abrir un club automaticamente.</li>
        <li>Tus selecciones de grupos y My Player se guardan por club.</li>
        <li>Los colores y logos tambien se administran por club.</li>
      </ul>`,
    help_darkmode_title: 'Modo oscuro',
    help_darkmode_body: `<p>Eggbeater admite modo oscuro para una lectura mas comoda en poca luz.</p>
      <ul>
        <li>Elige <strong>Claro</strong>, <strong>Oscuro</strong> o <strong>Sistema</strong> en Ajustes.</li>
        <li>La app puede seguir automaticamente el tema del dispositivo.</li>
        <li>Tu preferencia se recuerda entre visitas.</li>
        <li>Todas las pantallas principales y modales soportan modo oscuro.</li>
      </ul>`,
    help_maps_title: 'Mapas y direcciones',
    help_maps_body: `<p>Las tarjetas de juego incluyen enlaces de direccion para llegar rapido a la sede.</p>
      <ul>
        <li>La linea de ubicacion abre direcciones al tocarla.</li>
        <li>Apple Maps, Google Maps y Waze estan soportados donde existan.</li>
        <li>Tanto la tarjeta de Proximo Juego como las tarjetas normales pueden incluir mapas.</li>
        <li>Si hay coordenadas se usan directamente; si no, la app busca por nombre del lugar.</li>
      </ul>`,
    help_offline_title: 'Soporte de anotacion offline',
    help_offline_body: `<p>Los anotadores pueden seguir registrando eventos incluso si se cae la conexion.</p>
      <ul>
        <li>Las actualizaciones fallidas se ponen automaticamente en cola en el dispositivo.</li>
        <li>Aparece una banda offline mientras los marcadores esperan sincronizarse.</li>
        <li>Los eventos en cola se reenvian en orden cuando regresa la conexion.</li>
        <li>Una notificacion confirma cuando los marcadores se sincronizan correctamente.</li>
      </ul>`,
    help_accessibility_title: 'Accesibilidad',
    help_accessibility_body: `<p>Eggbeater esta diseñado para funcionar con las funciones de accesibilidad integradas en iOS y Android.</p>
      <ul>
        <li>Los lectores de pantalla pueden navegar la app y leer actualizaciones en vivo.</li>
        <li>El control por voz puede activar controles por su nombre visible.</li>
        <li>El texto escala con el tamano configurado en el dispositivo.</li>
        <li>Reduce Motion y ajustes de mayor contraste se respetan cuando estan disponibles.</li>
        <li>La informacion importante nunca depende solo del color.</li>
      </ul>`,
    help_box_score_title: 'Marcador en vivo y box score',
    scorer_controls: 'Controles de anotación',
    scorer_open: 'Abrir anotador',
    scorer_team_label: 'Equipo',
    scorer_opp_label: 'Rival',
    scorer_undo: 'Deshacer',
    scorer_share_box_score: 'Compartir',
    scorer_shootout_mode: 'MODO PENALES',
    scorer_shootout_hint: 'Cada gol = +0.1 · Marca quién tira',
    scorer_goal: '+ Gol',
    scorer_opp_goal: '+ Gol rival',
    scorer_team_so_goal: 'Gol de penales',
    scorer_opp_so_goal: 'Gol rival penales',
    scorer_team_so_miss: 'Fallo en penales',
    scorer_opp_so_miss: 'Fallo rival penales',
    scorer_assist: 'Asistencia',
    scorer_steal: 'Robo',
    scorer_sprint_won: 'Sprint ganado',
    scorer_field_block: 'Bloqueo de campo',
    scorer_attempt: 'Intento',
    scorer_turnover: 'Pérdida',
    scorer_excl: 'Exclusión',
    scorer_earned_excl: 'Exclusión provocada',
    scorer_opp_steal: 'Robo rival',
    scorer_opp_attempt: 'Intento rival',
    scorer_opp_excl: 'Exclusión rival',
    scorer_5m: '5m',
    scorer_5m_attempt: 'Intento 5m',
    scorer_opp_5m: '5m rival',
    scorer_opp_5m_attempt: 'Intento 5m rival',
    scorer_gk_save: 'Atajada GK',
    scorer_pause: 'Pausa',
    scorer_start: 'Iniciar',
    scorer_resume: 'Reanudar',
    scorer_reset: 'Reiniciar',
    scorer_halftime_break: 'Descanso',
    scorer_quarter_break: 'Pausa entre cuartos',
    scorer_next_quarter_ready: 'próximo cuarto listo',
    event_goal: 'GOL',
    event_goal_6v5: 'GOL (6v5)',
    event_goal_5m: 'GOL (5m)',
    event_shot_attempt: 'INTENTO',
    event_turnover: 'PÉRDIDA',
    event_attempt_5m: 'INTENTO (5m)',
    event_so_goal: 'GOL DE PENALES',
    event_so_miss: 'FALLO DE PENALES',
    event_assist: 'ASISTENCIA',
    event_steal: 'ROBO',
    event_steal_fbu: 'ROBO (FBU)',
    event_sprint_won: 'SPRINT GANADO',
    event_opp_sprint_won: 'SPRINT RIVAL',
    event_opp_steal: 'ROBO RIVAL',
    event_excl: 'EXCL',
    event_brutal: 'BRUTALIDAD',
    event_timeout: 'TIEMPO FUERA',
    event_opp_timeout: 'T/O RIVAL',
    event_save: 'ATAJADA',
    event_field_block: 'BLOQUEO DE CAMPO',
    event_team_fallback: 'Equipo',
    event_opp_fallback: 'Rival',
    boxscore_goalkeeper: 'Portero',
    boxscore_player: 'Jugador',
    boxscore_total: 'Total',
    boxscore_team_timeouts: 'Tiempos fuera del equipo: {count}',
    boxscore_shot_attempts: 'Intentos de tiro',
    boxscore_5m_goals: 'Goles de 5m',
    boxscore_5m_attempts: 'Intentos de 5m',
    boxscore_so_goals: 'Goles en penales',
    boxscore_so_misses: 'Fallos en penales',
    boxscore_sprints_won: 'Sprints ganados',
    boxscore_forced_ball_under: 'Forced Ball Under',
    boxscore_field_blocks: 'Bloqueos de campo',
    boxscore_earned_exclusions: 'Exclusiones provocadas',
    roster_title: 'Roster',
    roster_manage_players_desc: 'Administra jugadoras para la anotación en vivo. Los números de gorro aparecen en las fichas de gol y asistencia.',
    roster_download_all_stats: 'Descargar todas las estadísticas',
    roster_season_stats: 'Estadísticas de temporada',
    roster_no_players_yet: 'Todavía no hay jugadoras.',
    roster_add_player: 'Agregar jugadora',
    roster_save_roster: 'Guardar roster',
    playerstats_empty: 'Todavía no hay box scores.<br>Usa la anotación en vivo durante un partido para comenzar a seguir estadísticas.',
    playerstats_download_aria: 'Descargar estadísticas de {name}',
    playerstats_games_count: '{count} juego(s)',
    season_stats_title: 'Estadísticas de temporada',
    season_stats_loading: 'Cargando estadísticas de temporada…',
    season_stats_empty: 'Todavía no hay estadísticas archivadas.<br>Se agregan desde torneos archivados con datos de jugadoras.',
    season_stats_failed: 'No se pudo cargar: {message}',
    live_follow_not_started: 'El partido todavía no comienza — vuelve cuando empiece.',
    live_follow_over: 'El partido ya terminó.',
    live_follow_android: 'Siguiendo en vivo. Revisa la barra de estado para ver actualizaciones.',
    live_update_plugin_missing: 'El plugin Live Update no está disponible.',
    live_follow_native_only: 'Seguir en vivo está disponible en las apps de iOS y Android.',
    live_activity_plugin_missing: 'El plugin Live Activity no está instalado/registrado',
    live_follow_stopped: 'Se dejó de seguir en vivo.',
    live_follow_ios: 'Siguiendo en vivo. Las actualizaciones aparecen en tu pantalla de bloqueo.',
    live_follow_unavailable: 'Live Activities no disponibles: {message}'
  },
  fr: {
    club_picker_title: 'Bienvenue sur Eggbeater',
    club_picker_subtitle: 'Choisissez votre club pour commencer',
    club_picker_footer: 'Vous ne voyez pas votre club ? Demandez le lien a votre administrateur.',
    spectator_guide_link: 'Nouveau sur Eggbeater ? Lire le guide spectateurs ->',
    returning_user: 'Utilisateur deja inscrit ?',
    splash_signin_hint: 'Retrouvez vos clubs et reglages instantanement',
    header_lang: 'Langue',
    nav_schedule: 'Calendrier',
    nav_scores: 'Scores',
    nav_history: 'Historique',
    nav_more: 'Plus',
    nav_roster: 'Effectif',
    nav_settings: 'Reglages',
    nav_help: 'Aide',
    nav_tournament_scores: 'Scores du tournoi',
    settings_title: 'Reglages',
    settings_subtitle: 'Gerez votre equipe et vos preferences.',
    settings_team_selection: "Selection d'equipe",
    settings_my_clubs: 'Mes clubs',
    settings_add_club: 'Ajouter un club',
    settings_add_club_desc: 'Rejoindre un autre club avec un code',
    settings_return_splash: "Retour a l'accueil",
    settings_return_splash_desc: 'Revenir a la selection du club',
    settings_appearance: 'Apparence',
    settings_appearance_desc: "Choisissez le theme d'affichage",
    settings_calendar: 'Calendrier et notifications',
    settings_subscription: 'Abonnement',
    settings_help: 'Aide et support',
    settings_account: 'Compte',
    settings_how_to_use: 'Comment utiliser Eggbeater',
    settings_how_to_use_desc: 'Score, tableau, notifications et plus',
    team_picker_title: "Choisir les groupes d'age",
    team_picker_select_all: 'Tout selectionner',
    team_picker_clear: 'Effacer',
    team_picker_done_count: 'Terminer ({count})',
    team_picker_select_one: 'Selectionnez au moins un groupe',
    team_picker_selected: 'Selectionne',
    team_picker_tap_include: 'Touchez pour inclure',
    team_picker_change: "Changer les groupes d'age",
    team_picker_empty_chip: "Choisir l'equipe",
    schedule_select_prompt: "Choisissez un groupe d'age ci-dessus pour voir le calendrier.",
    schedule_force_refresh: 'Actualiser',
    next_tournament_complete: 'Tournoi termine',
    next_check_history_final: "Voir l'historique pour les resultats finaux",
    next_all_games_complete: 'Tous les matchs sont termines',
    next_no_more_scheduled: "Aucun autre match n'est programme",
    next_waiting_update: 'En attente de la prochaine mise a jour du tournoi',
    next_check_history_results: "Voir l'onglet Historique pour les resultats",
    next_in_progress: 'En cours',
    next_next_game: 'Prochain match',
    next_projected_next: 'Prochain projete',
    next_based_on_record: 'Base sur le bilan {record} en poule',
    possible_division_standings: 'Classement de division',
    possible_select_prompt: "Choisissez un groupe d'age ci-dessus pour voir le tableau.",
    possible_coming_soon_title: 'Tableau a venir',
    possible_coming_soon_body: 'La fonction Tableau sera disponible lorsque le calendrier du tournoi sera recu.',
    possible_no_data: 'Aucune donnee de tableau pour ce tournoi.',
    possible_confirmed: 'Bilan de poule {record} → {label} confirme.',
    possible_projected: 'Bilan de poule {record} → {label} projete.',
    possible_mark_results: 'Entrez les resultats de poule pour voir votre parcours projete.',
    possible_projected_badge: 'Projete',
    history_title: 'Historique du tournoi',
    history_select_prompt: "Choisissez un groupe d'age ci-dessus pour voir l'historique du tournoi.",
    history_desc: 'Resultats des tournois passes, du plus recent au plus ancien.',
    history_empty: "Aucun historique pour l'instant. Les resultats des tournois termines apparaitront ici automatiquement.",
    history_goals_label: 'Buts :',
    history_assists_label: 'Passes :',
    history_player_label: 'Joueur',
    common_share: 'Partager',
    common_follow_live: 'Suivre en direct',
    common_send_telegram: 'Envoyer vers Telegram',
    common_send_groupme: 'Envoyer vers GroupMe',
    help_schedule_title: 'Onglet Calendrier',
    help_history_title: 'Onglet Historique',
    help_scores_title: 'Onglet Scores — Scores en direct et box score',
    help_live_scoring_title: 'Score en direct — Commandes du marqueur',
    help_schedule_body: `<p>L'onglet <strong>Calendrier</strong> affiche tous les matchs a venir pour l'equipe selectionnee, tries par numero de match.</p>
      <ul>
        <li>La carte <strong>Prochain match</strong> en haut met en avant le match suivant. Lorsqu'un match est score en direct, elle devient rouge et affiche le score, la periode et l'horloge.</li>
        <li>Les cartes en dessous montrent l'adversaire, le numero de match, l'heure, la poule, le lieu et la couleur du bonnet.</li>
        <li>Le prochain match n'apparait qu'une seule fois et n'est pas duplique plus bas.</li>
        <li>Lorsqu'un resultat est enregistre, le match passe automatiquement dans <strong>Historique</strong>.</li>
        <li>Touchez <strong>Ajouter au calendrier</strong> pour synchroniser les matchs avec Google Calendar.</li>
        <li>Touchez <strong>Recevoir des alertes</strong> pour activer les notifications de mise a jour.</li>
        <li>Si plusieurs groupes d'age sont selectionnes, le calendrier se divise en sections etiquetees.</li>
      </ul>`,
    help_scores_body: `<p>L'onglet <strong>Scores</strong> rassemble le score en direct et le box score. Surveillez le point rouge pulsant dans la navigation quand un match est activement score.</p>
      <ul>
        <li><strong>Voir le score en direct</strong> permet de suivre un match en temps reel sans le mot de passe scoreur.</li>
        <li>Touchez le bouton <strong>Login to Score</strong> si vous avez le mot de passe et avez besoin des commandes completes.</li>
        <li>Quand un scoreur est actif, le badge <strong>LIVE</strong> apparait et les mises a jour arrivent en environ 5 secondes.</li>
        <li>Le <strong>journal d'evenements</strong> montre les buts, passes, exclusions et autres actions avec l'heure au chronometre.</li>
        <li>Le <strong>box score</strong> montre les totaux par joueur pour buts, tentatives, 5m, shootout, passes et exclusions.</li>
        <li>Apres le match, les stats alimentent l'historique joueur dans l'onglet Effectif.</li>
      </ul>`,
    help_live_scoring_body: `<p>Si vous avez le mot de passe scoreur, touchez le bouton <strong>Login to Score</strong> en haut a droite du lecteur et saisissez le mot de passe du tournoi pour debloquer toutes les commandes.</p>
      <ul>
        <li>Seul le match en cours affiche tous les boutons de score. Les matchs suivants restent replies.</li>
        <li><strong>Auto Clock</strong> decompte automatiquement depuis la duree de quart configuree par l'admin. Touchez <strong>Start</strong> pour lancer Q1.</li>
        <li>La <strong>barre d'etat</strong> avance entre Start, les quarts, la mi-temps et Final. <strong>Pre</strong> remet le match en pre-game.</li>
        <li><strong>Goal / Opp Goal</strong> enregistre un but et demande le joueur marqueur.</li>
        <li><strong>Attempt / Opp Attempt</strong> enregistre un tir manque.</li>
        <li><strong>Assist</strong>, <strong>Steal</strong>, <strong>Field Block</strong>, <strong>Excl</strong> et <strong>Earned Excl</strong> completent la feuille de stats.</li>
        <li><strong>5m</strong> et <strong>5m Attempt</strong> suivent les penalties de 5 metres.</li>
        <li><strong>GK Save</strong> enregistre les arrets du gardien.</li>
        <li>Les boutons de <strong>temps morts</strong> mettent l'horloge en pause automatiquement et se grisent apres utilisation.</li>
        <li><strong>Reset Clock</strong> restaure le temps complet du quart sans changer l'etat du match.</li>
        <li><strong>Undo</strong> supprime le dernier evenement enregistre.</li>
      </ul>`,
    help_history_body: `<p><strong>Historique</strong> conserve un enregistrement continu des tournois termines.</p>
      <ul>
        <li>Quand vous enregistrez un resultat dans Scores, le match quitte Calendrier et passe automatiquement dans Historique.</li>
        <li>Les resultats complets du tournoi s'archivent automatiquement lorsqu'un nouveau tournoi est charge.</li>
        <li>Le tableau des classements affiche les points de bracket cumules sur toute la duree du tournoi.</li>
        <li>Touchez une entree de tournoi pour l'ouvrir et voir les resultats match par match.</li>
        <li>L'historique est stocke sur votre appareil et initialise a partir du dossier officiel lors de la premiere installation.</li>
      </ul>`,
    help_shootout_title: 'Mode Shootout',
    help_shootout_body: `<p>Quand un match est a egalite a la fin du temps reglementaire, touchez <strong>SO</strong> dans la barre d'etat pour entrer en mode shootout.</p>
      <ul>
        <li>Chaque equipe selectionne 5 joueurs pour tirer les penalties de 5 metres.</li>
        <li>Chaque but de shootout ajoute <strong>+0.1</strong> au score pour afficher clairement le vainqueur.</li>
        <li><strong>SO Goal / Opp SO Goal</strong> remplace les boutons de but normaux pendant le shootout.</li>
        <li><strong>SO Miss</strong> suit les tirs manques pour les statistiques.</li>
        <li>La ligne 5m normale est masquee pendant le shootout.</li>
        <li>Vous pouvez envoyer une alerte de shootout a Telegram ou GroupMe lorsqu'il commence.</li>
      </ul>`,
    help_bracket_title: 'Onglet Bracket',
    help_bracket_body: `<p>L'onglet <strong>Bracket</strong> montre la trajectoire possible de l'equipe selon les resultats de poule.</p>
      <ul>
        <li>Avant la publication du calendrier, il affiche <em>Bracket Coming Soon</em>.</li>
        <li>A mesure que les resultats arrivent, la trajectoire projetee se met en surbrillance automatiquement.</li>
        <li>Les parcours Or, Argent et Bronze peuvent montrer l'adversaire possible, l'heure et le lieu.</li>
        <li>Les points de bracket sont <strong>Win 4, SO Win 3, SO Loss 2, Loss 1, Forfeit 0</strong>.</li>
        <li>Si plusieurs groupes d'age ou equipes A/B sont selectionnes, chacun a sa propre section etiquetee.</li>
      </ul>`,
    help_myplayer_title: 'My Player — Suivre votre enfant',
    help_myplayer_body: `<p>Dans l'onglet <strong>Effectif</strong>, la carte <em>My Player</em> permet de suivre les statistiques de votre enfant sur toute la saison.</p>
      <ul>
        <li>Avec un seul groupe d'age selectionne, choisissez votre enfant dans la liste.</li>
        <li>Avec plusieurs groupes selectionnes, une carte My Player apparait pour chaque equipe.</li>
        <li>La carte affiche buts, passes, tentatives, exclusions, exclusions provoquees, matchs et pourcentages de tir.</li>
        <li>Les matchs recents avec stats et scores par match sont aussi visibles.</li>
        <li>L'export CSV telecharge l'historique complet suivi.</li>
        <li>Les gardiens voient les arrets a la place des pourcentages de tir.</li>
      </ul>`,
    help_agegroup_title: 'Selecteur de groupe d age et equipes A/B',
    help_agegroup_body: `<p>Le selecteur sous l'entete du tournoi controle les equipes affichees.</p>
      <ul>
        <li>Touchez un groupe d'age pour l'activer.</li>
        <li>Touchez un autre groupe pour en suivre plusieurs en meme temps.</li>
        <li>Les selections restent triees par age et sont memorisees entre les sessions.</li>
        <li>Si un club a des equipes A/B dans le meme groupe, le selecteur s'etend pour choisir l'une ou les deux.</li>
        <li>Lorsque le panneau de selection s'ouvre, touchez <strong>Terminer</strong> en haut a droite (a cote de <em>Tout selectionner</em> et <em>Effacer</em>) pour confirmer votre selection et fermer le panneau.</li>
      </ul>`,
    help_multi_title: 'Vue multi-groupes et equipes multiples',
    help_multi_body: `<p>Eggbeater peut afficher plusieurs groupes d'age et plusieurs equipes en meme temps dans Calendrier, Scores, Bracket, Effectif et Historique.</p>
      <ul>
        <li>Quand plusieurs groupes sont actifs, chaque onglet se divise en sections etiquetees.</li>
        <li>Quand A et B sont actives, chaque equipe a sa propre section et les donnees ne se melangent pas.</li>
        <li>Les entetes indiquent clairement le groupe d'age et l'equipe affiches.</li>
        <li>L'historique et le bracket restent separes par equipe.</li>
      </ul>`,
    help_settings_title: 'Reglages — selection equipe, mes clubs et compte',
    help_settings_body: `<p>Ouvrez l'onglet <strong>Reglages</strong> pour gerer votre configuration.</p>
      <ul>
        <li><strong>Selection equipe</strong> permet de choisir un ou plusieurs groupes d'age et enregistre ces choix automatiquement.</li>
        <li><strong>Mes clubs</strong> affiche tous les clubs rejoints et permet de passer de l'un a l'autre.</li>
        <li><strong>Ajouter un club</strong> permet de rejoindre un autre club avec son code ou son lien.</li>
        <li><strong>Retour a l'accueil</strong> efface la vue actuelle sans supprimer vos clubs enregistres.</li>
        <li><strong>Compte</strong> montre votre identite Google connectee et permet de vous deconnecter.</li>
      </ul>`,
    help_notifications_title: 'Notifications et synchronisation calendrier',
    help_notifications_body: `<p>Utilisez les notifications et le calendrier pour recevoir automatiquement les changements pendant le tournoi.</p>
      <ul>
        <li><strong>Google Calendar</strong> peut synchroniser les matchs afin que les changements d'horaire et de lieu apparaissent dans votre calendrier.</li>
        <li>Vous pouvez changer de calendrier connecte depuis la carte de reglages.</li>
        <li>La connexion calendrier se reconnecte automatiquement lors des prochaines visites une fois autorisee.</li>
        <li><strong>Push Notifications</strong> vous alertent quand le calendrier change ou quand un match passe en direct.</li>
        <li><strong>Telegram / GroupMe</strong> peuvent aussi recevoir les mises a jour envoyees par le scoreur.</li>
        <li>Si votre admin partage un lien <code>webcal://</code>, vous pouvez vous abonner pour garder les flux de bracket ou NJO synchronises.</li>
      </ul>`,
    help_live_updates_title: 'Live Activities et Live Updates',
    help_live_updates_body: `<p>Suivez les matchs scores en direct sans ouvrir l'application.</p>
      <ul>
        <li><strong>iPhone</strong> utilise Live Activities sur l'ecran verrouille et la Dynamic Island.</li>
        <li><strong>Android 16+</strong> utilise une notification Live Update persistante.</li>
        <li>Touchez <strong>Suivre en direct</strong> sur un match en cours pour le suivre.</li>
        <li>Les mises a jour en direct fonctionnent avec les notifications push.</li>
      </ul>`,
    help_watch_title: 'Application compagnon Apple Watch',
    help_watch_body: `<p>L'application iOS native inclut une app Apple Watch pour verifier rapidement le tournoi.</p>
      <ul>
        <li>L'app Watch utilise les couleurs du club et montre le club et l'equipe selectionnes.</li>
        <li>Vous pouvez choisir l'equipe suivie par la montre.</li>
        <li>Vous pouvez epingler un match vedette ou laisser Eggbeater choisir automatiquement le prochain match.</li>
        <li>La montre peut afficher le calendrier et des alertes vibrantes sur les buts du match suivi.</li>
      </ul>`,
    help_widgets_title: 'Widgets ecran d accueil',
    help_widgets_body: `<p>Ajoutez des widgets Eggbeater a l'ecran d'accueil pour un acces rapide.</p>
      <ul>
        <li><strong>Score Widget</strong> affiche le score en direct ou le plus recent.</li>
        <li><strong>Schedule Widget</strong> affiche le prochain match a venir.</li>
        <li><strong>Stats Widget</strong> met en avant les meilleurs buteurs du tournoi en cours.</li>
        <li>Les widgets existent sur iOS et Android et se mettent a jour automatiquement lorsque les donnees changent.</li>
      </ul>`,
    help_tscore_title: 'Onglet T-Score — scores du directeur',
    help_tscore_body: `<p>L'onglet <strong>T-Score</strong> affiche les scores officiels publies par le directeur du tournoi, separes du flux de statistiques en direct.</p>
      <ul>
        <li>Les scores du directeur sont les resultats officiels utilises pour les classements et le bracket.</li>
        <li>Les scoreurs autorises peuvent soumettre les scores finaux depuis cet onglet si le directeur active ce flux.</li>
        <li>Les scores se rafraichissent quand de nouveaux resultats du directeur sont publies.</li>
        <li>Si l'administrateur de votre equipe a importe des matchs depuis le package d'un directeur de tournoi, cet onglet affiche egalement le <strong>calendrier publie par le directeur</strong> — horaires, terrains et oppositions pour tous les groupes d'age du tournoi, afin de voir la vue d'ensemble au-dela de votre equipe.</li>
      </ul>`,
    help_multiclub_title: 'Support multi-clubs',
    help_multiclub_body: `<p>Eggbeater prend en charge plusieurs clubs, chacun avec ses propres tournois, effectifs et equipes admin.</p>
      <ul>
        <li>Chaque club utilise son propre identifiant afin que calendrier, scores, effectif et historique restent separes.</li>
        <li>Un lien avec <code>?join=</code> peut ajouter et ouvrir automatiquement un club.</li>
        <li>Vos selections de groupes d'age et My Player sont enregistrees par club.</li>
        <li>Les couleurs et logos de marque sont eux aussi geres par club.</li>
      </ul>`,
    help_darkmode_title: 'Mode sombre',
    help_darkmode_body: `<p>Eggbeater prend en charge le mode sombre pour un confort visuel en faible luminosite.</p>
      <ul>
        <li>Choisissez <strong>Clair</strong>, <strong>Sombre</strong> ou <strong>Systeme</strong> dans Reglages.</li>
        <li>L'app peut suivre automatiquement le theme de votre appareil.</li>
        <li>Votre preference est memorisee entre les visites.</li>
        <li>Tous les ecrans principaux et modales prennent en charge le mode sombre.</li>
      </ul>`,
    help_maps_title: 'Cartes et itineraire',
    help_maps_body: `<p>Les cartes de match incluent des liens d'itineraire pour arriver rapidement au lieu.</p>
      <ul>
        <li>La ligne de lieu ouvre l'itineraire au toucher.</li>
        <li>Apple Maps, Google Maps et Waze sont pris en charge lorsque disponibles.</li>
        <li>La carte Prochain match et les cartes d'horaire peuvent inclure des liens cartographiques.</li>
        <li>Les coordonnees sont envoyees directement quand elles existent, sinon l'app recherche par nom du lieu.</li>
      </ul>`,
    help_offline_title: 'Support score hors ligne',
    help_offline_body: `<p>Les scoreurs peuvent continuer a saisir des evenements meme si la connexion tombe.</p>
      <ul>
        <li>Les mises a jour qui echouent sont mises en file automatiquement sur l'appareil.</li>
        <li>Une bannière hors ligne apparait pendant que les scores attendent la synchronisation.</li>
        <li>Les evenements en file sont renvoyes dans l'ordre lorsque la connexion revient.</li>
        <li>Une notification confirme quand les scores sont synchronises avec succes.</li>
      </ul>`,
    help_accessibility_title: 'Accessibilite',
    help_accessibility_body: `<p>Eggbeater est conçu pour fonctionner avec les fonctions d'accessibilite integrees d'iOS et d'Android.</p>
      <ul>
        <li>Les lecteurs d'ecran peuvent naviguer dans l'app et lire les mises a jour en direct.</li>
        <li>Le controle vocal peut activer les boutons par leur nom visible.</li>
        <li>Le texte suit la taille de police choisie sur l'appareil.</li>
        <li>Reduce Motion et les reglages de contraste plus eleve sont respectes lorsque possibles.</li>
        <li>Les informations importantes ne dependent jamais uniquement de la couleur.</li>
      </ul>`,
    help_box_score_title: 'Score en direct et box score',
    scorer_controls: 'Commandes de score',
    scorer_open: 'Ouvrir le marqueur',
    scorer_team_label: 'Equipe',
    scorer_opp_label: 'Adversaire',
    scorer_undo: 'Annuler',
    scorer_share_box_score: 'Partager',
    scorer_shootout_mode: 'MODE TIRS AU BUT',
    scorer_shootout_hint: 'Chaque but = +0.1 · Suivez les tireurs',
    scorer_goal: '+ But',
    scorer_opp_goal: '+ But adverse',
    scorer_team_so_goal: 'But TAB équipe',
    scorer_opp_so_goal: 'But TAB adverse',
    scorer_team_so_miss: 'Raté TAB équipe',
    scorer_opp_so_miss: 'Raté TAB adverse',
    scorer_assist: 'Passe',
    scorer_steal: 'Interception',
    scorer_sprint_won: 'Sprint gagné',
    scorer_field_block: 'Contre de champ',
    scorer_attempt: 'Tentative',
    scorer_turnover: 'Balle perdue',
    scorer_excl: 'Excl',
    scorer_earned_excl: 'Excl provoquée',
    scorer_opp_steal: 'Interception adverse',
    scorer_opp_attempt: 'Tentative adverse',
    scorer_opp_excl: 'Excl adverse',
    scorer_5m: '5m',
    scorer_5m_attempt: 'Tentative 5m',
    scorer_opp_5m: '5m adverse',
    scorer_opp_5m_attempt: 'Tentative 5m adverse',
    scorer_gk_save: 'Arrêt GK',
    scorer_pause: 'Pause',
    scorer_start: 'Demarrer',
    scorer_resume: 'Reprendre',
    scorer_reset: 'Reinitialiser',
    scorer_halftime_break: 'Mi-temps',
    scorer_quarter_break: 'Pause interquart',
    scorer_next_quarter_ready: 'quart suivant prêt',
    event_goal: 'BUT',
    event_goal_6v5: 'BUT (6v5)',
    event_goal_5m: 'BUT (5m)',
    event_shot_attempt: 'TENTATIVE',
    event_turnover: 'BALLE PERDUE',
    event_attempt_5m: 'TENTATIVE (5m)',
    event_so_goal: 'BUT TAB',
    event_so_miss: 'RATE TAB',
    event_assist: 'PASSE',
    event_steal: 'INTERCEPTION',
    event_steal_fbu: 'INTERCEPTION (FBU)',
    event_sprint_won: 'SPRINT GAGNÉ',
    event_opp_sprint_won: 'SPRINT ADVERSE',
    event_opp_steal: 'INTERCEPTION ADVERSE',
    event_excl: 'EXCL',
    event_brutal: 'BRUTALITE',
    event_timeout: 'TEMPS MORT',
    event_opp_timeout: 'TM ADVERSE',
    event_save: 'ARRÊT',
    event_field_block: 'CONTRE DE CHAMP',
    event_team_fallback: 'Equipe',
    event_opp_fallback: 'Adversaire',
    boxscore_goalkeeper: 'Gardien',
    boxscore_player: 'Joueur',
    boxscore_total: 'Total',
    boxscore_team_timeouts: 'Temps morts equipe : {count}',
    boxscore_shot_attempts: 'Tentatives de tir',
    boxscore_5m_goals: 'Buts de 5m',
    boxscore_5m_attempts: 'Tentatives de 5m',
    boxscore_so_goals: 'Buts TAB',
    boxscore_so_misses: 'Ratés TAB',
    boxscore_sprints_won: 'Sprints gagnés',
    boxscore_forced_ball_under: 'Forced Ball Under',
    boxscore_field_blocks: 'Contres de champ',
    boxscore_earned_exclusions: 'Exclusions provoquées',
    roster_title: 'Effectif',
    roster_manage_players_desc: 'Gérez les joueurs pour le score en direct. Les bonnets apparaissent sur les puces but/passe.',
    roster_download_all_stats: 'Télécharger toutes les stats',
    roster_season_stats: 'Stats de saison',
    roster_no_players_yet: 'Aucun joueur pour le moment.',
    roster_add_player: 'Ajouter un joueur',
    roster_save_roster: "Enregistrer l'effectif",
    playerstats_empty: 'Aucun box score enregistré.<br>Utilisez le score en direct pendant un match pour commencer à suivre les stats.',
    playerstats_download_aria: 'Télécharger les stats de {name}',
    playerstats_games_count: '{count} match(es)',
    season_stats_title: 'Stats des joueurs sur la saison',
    season_stats_loading: 'Chargement des stats de saison…',
    season_stats_empty: "Pas encore de stats archivées.<br>Les stats s'agrègent à partir des tournois archivés avec données joueur.",
    season_stats_failed: 'Échec du chargement : {message}',
    live_follow_not_started: "Le match n'a pas encore commencé — revenez quand il démarre.",
    live_follow_over: 'Le match est déjà terminé.',
    live_follow_android: "Suivi en direct activé. Vérifiez votre barre d'état pour les mises à jour.",
    live_update_plugin_missing: "Le plugin Live Update n'est pas disponible.",
    live_follow_native_only: 'Le suivi en direct est disponible dans les apps iOS et Android.',
    live_activity_plugin_missing: "Le plugin Live Activity n'est pas installé/enregistré",
    live_follow_stopped: 'Suivi en direct arrêté.',
    live_follow_ios: 'Suivi en direct activé. Les mises à jour apparaissent sur votre écran verrouillé.',
    live_follow_unavailable: 'Live Activities indisponibles : {message}'
  }
};

function getAppLang() {
  return localStorage.getItem(APP_LANG_KEY)
    || localStorage.getItem('eggbeater-site-lang')
    || 'en';
}

function appT(key) {
  const lang = getAppLang();
  return (APP_I18N[lang] && APP_I18N[lang][key]) || APP_I18N.en[key] || key;
}

function appFormat(key, vars = {}) {
  return Object.entries(vars).reduce((out, [name, value]) => out.replaceAll(`{${name}}`, value), appT(key));
}

function applyAppTranslations() {
  const picker = document.getElementById('header-lang-picker');
  if (picker) picker.value = getAppLang();
  const textMap = {
    'club-picker-title': 'club_picker_title',
    'club-picker-subtitle': 'club_picker_subtitle',
    'club-picker-footer': 'club_picker_footer',
    'spectator-guide-link': 'spectator_guide_link',
    'returning-user-label': 'returning_user',
    'splash-signin-hint': 'splash_signin_hint',
    'header-lang-label': 'header_lang',
    'nav-label-schedule': 'nav_schedule',
    'nav-label-scores': 'nav_scores',
    'nav-label-more': 'nav_more',
    'nav-label-roster-desktop': 'nav_roster',
    'nav-label-settings-desktop': 'nav_settings',
    'nav-label-help-desktop': 'nav_help',
    'nav-label-tscore-drawer': 'nav_tournament_scores',
    'nav-label-roster-drawer': 'nav_roster',
    'nav-label-settings-drawer': 'nav_settings',
    'nav-label-help-drawer': 'nav_help',
    'team-picker-modal-title': 'team_picker_title',
    'team-picker-select-all': 'team_picker_select_all',
    'team-picker-clear': 'team_picker_clear'
  };
  Object.entries(textMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = appT(key);
  });
  const historyEl = document.getElementById('nav-label-history');
  if (historyEl) {
    const crown = historyEl.querySelector('.nav-crown');
    historyEl.textContent = appT('nav_history');
    if (crown) historyEl.appendChild(crown);
  }
  const teamPickerModal = document.getElementById('team-picker-modal');
  if (teamPickerModal) teamPickerModal.setAttribute('aria-label', appT('team_picker_title'));
}

function setAppLang(lang) {
  if (!APP_I18N[lang]) lang = 'en';
  localStorage.setItem(APP_LANG_KEY, lang);
  localStorage.setItem('eggbeater-site-lang', lang);
  applyAppTranslations();
  renderHeader();
  if (state.currentTab === 'settings') renderSettingsTab();
  if (state.currentTab === 'schedule') renderScheduleTab();
  if (state.currentTab === 'possible') renderPossibleTab();
  if (state.currentTab === 'history') renderHistoryTab();
}

// ─── CLUB BRANDING ────────────────────────────────────────────────────────────

/**
 * Recolor the default Eggbeater SVG logo using the club's primary color.
 * Defined at module scope so applyClubLogo can call it without being inside applyClubBranding.
 */
function recolorEggbeaterSvg(imgEl) {
  if (!imgEl) return;
  const color = window._clubPrimaryColor || '#002868';
  fetch('logo_large.svg')
    .then(r => r.text())
    .then(svg => {
      const recolored = svg.replace('fill="#002868"', `fill="${color}"`);
      const blob = new Blob([recolored], { type: 'image/svg+xml' });
      if (imgEl._blobUrl) URL.revokeObjectURL(imgEl._blobUrl);
      imgEl._blobUrl = URL.createObjectURL(blob);
      imgEl.src = imgEl._blobUrl;
    })
    .catch(() => {});
}

/**
 * Apply custom club colors by overriding CSS custom properties.
 * Computes lighter/darker tints from the primary hex color.
 */
function applyClubBranding(primaryColor, secondaryColor, headerStyle) {
  if (!primaryColor) return;
  const root = document.documentElement;

  // Parse hex → {r, g, b}
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
  }
  function rgbToHex(r,g,b) {
    return '#' + [r,g,b].map(c => Math.max(0,Math.min(255,Math.round(c))).toString(16).padStart(2,'0')).join('');
  }
  function mix(c, white, t) {
    return { r: c.r + (white.r - c.r) * t, g: c.g + (white.g - c.g) * t, b: c.b + (white.b - c.b) * t };
  }
  function darken(c, amount) {
    return { r: c.r * (1 - amount), g: c.g * (1 - amount), b: c.b * (1 - amount) };
  }

  const pc = hexToRgb(primaryColor);
  const white = { r: 255, g: 255, b: 255 };

  // Set primary and computed variants
  root.style.setProperty('--royal', primaryColor);
  root.style.setProperty('--royal-rgb', `${pc.r}, ${pc.g}, ${pc.b}`);
  const dark = darken(pc, 0.3);
  root.style.setProperty('--royal-dark', rgbToHex(dark.r, dark.g, dark.b));
  const mid = mix(pc, white, 0.2);
  root.style.setProperty('--royal-mid', rgbToHex(mid.r, mid.g, mid.b));
  const light = mix(pc, white, 0.85);
  root.style.setProperty('--royal-light', rgbToHex(light.r, light.g, light.b));
  const subtle = mix(pc, white, 0.93);
  root.style.setProperty('--royal-subtle', rgbToHex(subtle.r, subtle.g, subtle.b));

  // Set secondary color (accent)
  if (secondaryColor) {
    root.style.setProperty('--teal', secondaryColor);
    const sc = hexToRgb(secondaryColor);
    const tl = mix(sc, white, 0.9);
    root.style.setProperty('--teal-light', rgbToHex(tl.r, tl.g, tl.b));
  }

  // Update meta theme-color for mobile browser chrome
  const isDark = document.documentElement.dataset.theme === 'dark';
  if (!isDark) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = primaryColor;
  }

  // Store for theme toggle to reference
  window._clubPrimaryColor = primaryColor;

  // Update state for widget sync
  state.clubInfo = state.clubInfo || {};
  state.clubInfo.primaryColor = primaryColor;
  state.clubInfo.secondaryColor = secondaryColor;
  _syncWidgetsAll();

  // On native iOS, ViewController.swift injects CSS with !important at document-end
  // using CSS variables that may not recompute reliably in WKWebView. Inject a later
  // <style> tag with hardcoded actual values so it wins the cascade.
  if (window.Capacitor?.getPlatform?.() === 'ios') {
    const r = pc.r, g = pc.g, b = pc.b, hex = primaryColor;
    let el = document.getElementById('ios-brand-style');
    if (!el) { el = document.createElement('style'); el.id = 'ios-brand-style'; document.head.appendChild(el); }
    el.textContent =
      `body::after{background:linear-gradient(to bottom,transparent 0%,transparent 20%,${hex} 60%)!important}` +
      `.app-header{background:rgba(${r},${g},${b},0.82)!important}` +
      `.next-game-card{background:rgba(${r},${g},${b},0.65)!important}` +
      `.bracket-section.projected{background:rgba(${r},${g},${b},0.72)!important}` +
      `html[data-theme="dark"] .viewer-tab-bar{background:rgba(${r},${g},${b},0.55)!important}` +
      `@media(prefers-color-scheme:dark){html:not([data-theme]) .viewer-tab-bar{background:rgba(${r},${g},${b},0.55)!important}}`;
  }

  // Recolor all eggbeater SVG logo instances (header logo + inline "brought to you by" logo)
  const logoImg = document.querySelector('.club-logo-img');
  if (logoImg) {
    logoImg._brandApplied = true;
    recolorEggbeaterSvg(logoImg);
  }
  // Also recolor the inline "brought to you by" logo
  const inlineLogo = document.querySelector('.eggbeater-inline-logo');
  if (inlineLogo) recolorEggbeaterSvg(inlineLogo);
}

/**
 * BFS flood-fill background removal: makes outer near-white pixels transparent
 * while preserving internal white design elements (borders, faces, letters, etc.)
 */
function removeLogoBackground(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const w = canvas.width, h = canvas.height;
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      
      // If the first pixel or a quick sample of the perimeter is transparent, 
      // skip the cleaning algorithm to protect our pre-processed logo.
      if (d[3] < 200 || d[(w*h-1)*4 + 3] < 200) { resolve(dataUrl); return; }
      
      const bgR = d[0], bgG = d[1], bgB = d[2];
      if (bgR < 200 || bgG < 200 || bgB < 200) { resolve(dataUrl); return; }
      
      const TOL2 = 30 * 30;
      const visited = new Uint8Array(w * h);
      function matches(pi) {
        if (d[pi + 3] === 0) return true;
        const dr = d[pi] - bgR, dg = d[pi+1] - bgG, db = d[pi+2] - bgB;
        return (dr*dr + dg*dg + db*db) <= TOL2;
      }
      const queue = [];
      for (const [sx, sy] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]]) {
        const si = sy * w + sx;
        if (!visited[si]) { visited[si] = 1; queue.push(si); }
      }
      let qi = 0;
      while (qi < queue.length) {
        const idx = queue[qi++];
        d[idx * 4 + 3] = 0;
        const x = idx % w, y = (idx / w) | 0;
        if (x > 0)   { const n=idx-1; if (!visited[n]&&matches(n*4)){visited[n]=1;queue.push(n);} }
        if (x < w-1) { const n=idx+1; if (!visited[n]&&matches(n*4)){visited[n]=1;queue.push(n);} }
        if (y > 0)   { const n=idx-w; if (!visited[n]&&matches(n*4)){visited[n]=1;queue.push(n);} }
        if (y < h-1) { const n=idx+w; if (!visited[n]&&matches(n*4)){visited[n]=1;queue.push(n);} }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Show the club's custom logo in the header (if uploaded) or fall back to the
 * eggbeater logo. When a custom logo is present, the eggbeater logo collapses
 * to a small "brought to you by eggbeater" credit line.
 */
function applyClubLogo(logoDataUrl, clubName) {
  const defaultLogo  = document.querySelector('.club-logo-img');
  const customWrap   = document.querySelector('.club-custom-logo-wrap');
  const customImg    = document.querySelector('.club-custom-logo-img');
  const poweredByBar = document.querySelector('.eggbeater-poweredby-bar');

  if (logoDataUrl) {
    if (customImg) {
      customImg.alt = clubName || 'Club logo';
      customImg.src = logoDataUrl;
    }
    if (customWrap)  customWrap.classList.remove('hidden');
    if (poweredByBar) poweredByBar.classList.remove('hidden');
    if (defaultLogo) {
      defaultLogo.classList.add('hidden');
      defaultLogo.style.display = 'none'; // Force hide
    }
    state.clubInfo = state.clubInfo || {};
    state.clubInfo.logo = logoDataUrl;
    state.clubInfo.name = clubName || state.clubInfo.name;
    _syncWidgetsAll();
  } else {
    // No custom logo — show eggbeater logo, reset any stale SVG blob from a
    // previous club that had branding (avoids keeping the old club's color)
    if (customWrap)  customWrap.classList.add('hidden');
    if (poweredByBar) poweredByBar.classList.add('hidden');
    if (defaultLogo) {
      defaultLogo.classList.remove('hidden');
      defaultLogo.style.display = ''; // Restore display
      if (defaultLogo._blobUrl && !window._clubPrimaryColor) {
        URL.revokeObjectURL(defaultLogo._blobUrl);
        defaultLogo._blobUrl = null;
        defaultLogo._brandApplied = false;
        defaultLogo.src = 'logo_large.svg';
      } else if (!defaultLogo._brandApplied && window._clubPrimaryColor) {
        recolorEggbeaterSvg(defaultLogo);
        defaultLogo._brandApplied = true;
      }
    }
  }
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const CONFIG = {
  // Get this from Google Cloud Console → APIs & Services → Credentials
  // Add your Vercel URL to Authorized JavaScript Origins
  CLIENT_ID: '334438983134-th4thsf0upc8pabe245d2l41fon2oun9.apps.googleusercontent.com',

  SCOPES:            'https://www.googleapis.com/auth/calendar',
  EVENT_TAG:         'ebwp-sync-v1',          // tag on calendar events for cleanup
  SYNC_INTERVAL_MS:  20 * 60 * 1000,           // auto-sync every 20 min
  EVENT_DURATION_MIN: 45,                       // default game length in minutes
};

// ─── STORAGE KEYS ─────────────────────────────────────────────────────────────

// Returns a gender-appropriate water polo emoji based on the team key
function swimmerEmoji(teamKey) {
  if (!teamKey) teamKey = getSelectedTeam() || '';
  const k = teamKey.toLowerCase();
  if (k.includes('boy') || k.includes('men') || k.includes('bv') || k.includes('bjv')) return '🤽‍♂️';
  return '🤽‍♀️'; // girls, co-ed, or default
}

const STORE = {
  TOURNAMENT_ID:    'ebwp-tournament-id',
  SNAPSHOT:         'ebwp-snapshot',
  RESULTS:          'ebwp-results',
  BRACKET_RESULTS:  'ebwp-bracket-results',
  LIVE_SCORES:      'ebwp-live-scores',
  HISTORY:          'ebwp-history',
  CALENDAR_ID:      'ebwp-calendar-id',
  CALENDAR_NAME:    'ebwp-calendar-name',
  ROSTER:           'ebwp-roster',
  GROUPME_BOT_ID:   'ebwp-groupme-bot-id',
  MY_PLAYER:        'ebwp-my-player',       // legacy single followed player
  MY_PLAYERS:       'ebwp-my-players',      // [{name, teamKey}] multi-child
  SPORTS68_URL:     'ebwp-68sports-url',    // parent's 6-8 Sports profile URL
};

// Cache of loaded tournament data keyed by age-group key (e.g. '14u-girls')
const TEAM_CACHE = {};

// ─── MULTI-TEAM HELPERS ────────────────────────────────────────────────────────

function isMultiTeam() {
  // Multi-team is the default. Only disabled when explicitly set.
  return TOURNAMENT.singleTeam !== true;
}

/** Returns all selected team letters for the currently-rendering age group (e.g. ['A','B']). */
function getActiveTeams() {
  if (!isMultiTeam()) return null;
  if (_activeTeamLetters) return _activeTeamLetters;  // per-letter rendering override
  const groupKey = _activeAgeGroup || getSelectedTeam();
  return getEffectiveTeamLettersForGroup(groupKey);
}
/** Returns the primary selected letter (first of the set). Used for single-letter contexts. */
function getActiveTeam() {
  const teams = getActiveTeams();
  return teams ? teams[0] : null;
}

function getTeamLabel(teamKey) {
  if (!teamKey) return 'My Team';
  return TOURNAMENT.teamLabels?.[teamKey] || ('Team ' + teamKey);
}

function getActiveTeamLabel() {
  return getTeamLabel(getActiveTeam()) || 'Eggbeater';
}

function _teamDisplayNameForGame(gameOrRef, fallbackName = '') {
  const game = (gameOrRef && typeof gameOrRef === 'object') ? gameOrRef : _findGameByRef(gameOrRef);
  const groupKey = _contextGroupKey(gameOrRef, game?._groupKey || '');
  const tournament = getTournamentForGroup(groupKey) || TOURNAMENT || {};
  const baseName = String(tournament.clubName || TOURNAMENT?.clubName || fallbackName || appT('scorer_team_label')).trim();
  const validTeams = getValidTeamLettersForGroup(groupKey);
  const teamLetter = String(game?.team || '').trim().toUpperCase();
  if (!baseName) return appT('scorer_team_label');
  if (!teamLetter || validTeams.length <= 1) return baseName;
  const rawLabel = String(tournament.teamLabels?.[teamLetter] || '').trim();
  if (!rawLabel) return `${baseName} ${teamLetter}`.trim();
  const normalizedBase = baseName.toLowerCase();
  const normalizedRaw = rawLabel.toLowerCase();
  if (normalizedRaw === normalizedBase || normalizedRaw.startsWith(normalizedBase + ' ')) return rawLabel;
  return `${baseName} ${rawLabel}`.trim();
}

// ── Per-age-group A/B/C preference storage ────────────────────────────────────
// Stored as { '12u-girls': ['A','B'], '16u-boys': ['B'] } in ebwp-team-letters.
// A child playing on both A and B within the same age group can have both selected.
// Falls back to the legacy global ebwp-selected-team value for existing users.
function getTeamLettersForGroup(groupKey) {
  try {
    const map = JSON.parse(localStorage.getItem('ebwp-team-letters') || '{}');
    const val = map[groupKey] ?? localStorage.getItem('ebwp-selected-team') ?? null;
    if (!val) return [];
    return Array.isArray(val) ? val : [val]; // migrate old single-string format
  } catch { return []; }
}
/** Convenience: returns the first selected letter (primary), or null. */
function getTeamLetterForGroup(groupKey) {
  return getTeamLettersForGroup(groupKey)[0] ?? null;
}
function getTournamentForGroup(groupKey) {
  if (!groupKey) return TOURNAMENT || null;
  return TEAM_CACHE[groupKey]?.tournament || ((_activeAgeGroup || getSelectedTeam()) === groupKey ? TOURNAMENT : null);
}
function inferTeamLettersFromTournament(tournament) {
  if (!tournament) return [];
  const letters = new Set();
  const addLetter = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (['A', 'B', 'C'].includes(normalized)) letters.add(normalized);
  };
  if (tournament.enableCTeam) ['A', 'B', 'C'].forEach(addLetter);
  if (Array.isArray(tournament.teams)) tournament.teams.forEach(addLetter);
  Object.keys(tournament.teamLabels || {}).forEach(addLetter);
  if (tournament.roster && !Array.isArray(tournament.roster) && typeof tournament.roster === 'object') {
    Object.keys(tournament.roster).forEach(addLetter);
  }
  if (Array.isArray(tournament.games)) {
    tournament.games.forEach(g => addLetter(g?.team));
  }
  const paths = tournament.bracket?.paths;
  if (paths && !Array.isArray(paths) && typeof paths === 'object') {
    Object.keys(paths).forEach(addLetter);
  }
  return ['A', 'B', 'C'].filter(letter => letters.has(letter));
}
function getValidTeamLettersForGroup(groupKey) {
  const tournament = getTournamentForGroup(groupKey);
  if (!tournament) return [];
  const inferred = inferTeamLettersFromTournament(tournament);
  if (inferred.length > 1) return inferred;
  if (tournament.singleTeam === true) return [];
  if (tournament.enableCTeam) return ['A', 'B', 'C'];
  if (Array.isArray(tournament.teams) && tournament.teams.length > 1) return [...tournament.teams];
  return inferred;
}
function getEffectiveTeamLettersForGroup(groupKey, customMap = null) {
  const validTeams = getValidTeamLettersForGroup(groupKey);
  if (!validTeams.length) return [];
  const raw = customMap ? customMap[groupKey] : getTeamLettersForGroup(groupKey);
  const selected = Array.isArray(raw) ? raw.filter(l => validTeams.includes(l)) : [];
  return selected.length ? selected : [validTeams[0]];
}
function setTeamLettersForGroup(groupKey, letters) {
  try {
    const map = JSON.parse(localStorage.getItem('ebwp-team-letters') || '{}');
    map[groupKey] = letters;
    localStorage.setItem('ebwp-team-letters', JSON.stringify(map));
  } catch {}
}
function chooseTeamLettersForGroup(groupKey, value, validTeams = null) {
  const allowed = Array.isArray(validTeams) && validTeams.length ? validTeams : getValidTeamLettersForGroup(groupKey);
  if (!allowed.length) return;
  const next = value === 'ALL' ? [...allowed] : [value].filter(l => allowed.includes(l));
  if (!next.length) return;
  setTeamLettersForGroup(groupKey, next);
}
/** Toggles one letter in/out of the selected set for a group. At least one always stays selected. */
// Returns the roster array for the currently selected team(s) (merged when both A+B selected)
function getTournamentRoster() {
  const r = TOURNAMENT.roster;
  if (!r) return [];
  if (Array.isArray(r)) return r;          // single-team (legacy array format)
  const letters = getActiveTeams();
  if (!letters) return [];
  return letters.flatMap(l => r[l] || []);
}

function getScopedRoster(gameOrRef = null, explicitGroupKey = '') {
  const groupKey = _contextGroupKey(gameOrRef, explicitGroupKey);
  const cacheRoster = groupKey ? TEAM_CACHE[groupKey]?.tournament?.roster : null;
  const localRoster = (!groupKey || groupKey === getSelectedTeam()) ? TOURNAMENT.roster : null;
  const rosterSrc = cacheRoster || localRoster;
  if (!rosterSrc) return [];
  if (Array.isArray(rosterSrc)) return rosterSrc.map(p => ({ ...p }));

  const game = gameOrRef ? _findGameByRef(gameOrRef, groupKey) : null;
  const explicitLetter = game?.team || null;
  const letters = explicitLetter
    ? [explicitLetter]
    : (groupKey ? getTeamLettersForGroup(groupKey) : getActiveTeams());

  if (!letters?.length) return [];
  return letters.flatMap(l => (rosterSrc[l] || []).map(p => ({ ...p })));
}

// Returns games for the currently selected team(s). When A+B both selected, returns union.
// Games with no `team` field are treated as belonging to the FIRST team (A).
function getTournamentGames() {
  if (TOURNAMENT.upcomingMode) return [];
  const games = TOURNAMENT.games || [];
  const groupKey = _activeAgeGroup || getSelectedTeam() || getSelectedTeams()[0] || '';
  const letters = getActiveTeams();
  if (!letters) return games.map(g => ({ ...g, _groupKey: g._groupKey || groupKey }));                           // single-team — return all
  const firstTeam = Array.isArray(TOURNAMENT.teams) && TOURNAMENT.teams.length
    ? TOURNAMENT.teams[0] : 'A';
  return games.filter(g => {
    if (!g.team) return letters.includes(firstTeam);   // unassigned → first team only
    return letters.includes(g.team);
  }).map(g => ({ ...g, _groupKey: g._groupKey || groupKey }));
}

function getScopedTournamentGames(teamKey = '') {
  if (!teamKey) return getTournamentGames();
  const cache = TEAM_CACHE[teamKey];
  const tournament = cache?.tournament;
  if (!tournament || tournament.upcomingMode) return [];
  const games = tournament.games || [];
  const letters = getTeamLettersForGroup(teamKey);
  if (!letters?.length) return games.map(g => ({ ...g, _groupKey: g._groupKey || teamKey }));
  const firstTeam = Array.isArray(tournament.teams) && tournament.teams.length ? tournament.teams[0] : 'A';
  return games.filter(g => {
    if (!g.team) return letters.includes(firstTeam);
    return letters.includes(g.team);
  }).map(g => ({ ...g, _groupKey: g._groupKey || teamKey }));
}

// Returns bracket paths for the currently selected team(s). Merges when A+B both selected.
// A plain array (legacy format) belongs to the first team only.
function getTournamentBracketPaths() {
  const bp = TOURNAMENT.bracket?.paths;
  if (bp) {
    const letters = getActiveTeams();
    if (!letters) return Array.isArray(bp) ? bp : null;  // single-team — return as-is
    if (Array.isArray(bp)) {
      return letters.includes('A') ? bp : null;
    }
    const paths = letters.flatMap(l => bp[l] || []);
    return paths.length ? paths : null;
  }
  // Fall back to paths imported via director tournament import
  const ip = TOURNAMENT.bracket?.importedPaths;
  return Array.isArray(ip) && ip.length ? ip : null;
}

function switchTeam(letter, groupKey) {
  if (!groupKey) groupKey = _activeAgeGroup || getSelectedTeam();
  const validTeams = getValidTeamLettersForGroup(groupKey);
  if (!validTeams.length) return;
  chooseTeamLettersForGroup(groupKey, letter, validTeams);
  const first = getEffectiveTeamLettersForGroup(groupKey)[0];
  if (first) localStorage.setItem('ebwp-selected-team', first); // legacy compat
  _historyTeamFilter = '';   // clear stale opponent search when team changes
  state.roster = loadRoster(getSelectedTeam());
  renderTeamPicker();
  renderHeader();
  renderScheduleTab();
  renderScoresTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
  if (state.currentTab === 'settings') _renderSettingsTeamPicker();
  updateSpectatorCrowns();
}

// Returns history entries relevant to the currently selected team.
// Red (A) team → entries for 'Team', 'Team A', 'Team A1', 'Team A2', 'A', 'A1', 'A2' (any non-B variant).
// Blue (B) team → entries for 'Team B', 'B' only.
// Single-team mode (no multi-team) → all entries unchanged.
/** Extracts team letter from a history entry's team label.
 *  Handles: 'A', 'B', 'Team A', 'Team B', '680 A', '680 B', etc.
 *  Returns 'A', 'B', 'C', or null (unassigned → belongs to primary/A team). */
function _historyEntryTeamLetter(teamLabel) {
  const t = (teamLabel || '').trim();
  if (!t) return null;
  if (/^[ABC]$/i.test(t)) return t.toUpperCase();
  if (/\bTeam\s*A\b/i.test(t)) return 'A';
  if (/\bTeam\s*B\b/i.test(t)) return 'B';
  if (/\bTeam\s*C\b/i.test(t)) return 'C';
  // Custom labels like "680 A", "680 B" — letter at end after space
  const m = t.match(/\s([ABC])$/i);
  if (m) return m[1].toUpperCase();
  return null; // unassigned
}

function getHistoryForActiveTeam() {
  const history = getHistory();
  const all = history;

  if (!isMultiTeam()) return all;
  const team = getActiveTeam();
  if (!team) return all;

  return all.filter(entry => {
    const letter = _historyEntryTeamLetter(entry.team);
    if (team === 'A') return letter === 'A' || letter === null; // unassigned defaults to A
    if (team === 'B') return letter === 'B';
    if (team === 'C') return letter === 'C';
    return true;
  });
}

/** Create a history-like object from games in the active tournament that have results. */
function _getVirtualHistoryEntry() {
  const games = getTournamentGames().filter(g => _getResultForGame(g));
  if (!games.length) return null;

  let wins = 0, losses = 0, pts = 0;
  const gameEntries = games.map(g => {
    const res = _getResultForGame(g);
    if (isWin(res)) wins++; else if (isLoss(res)) losses++;
    pts += (POINTS[res] || 0);
    return {
      ...g,
      result: res,
      liveScore: getLiveScore(g)
    };
  });

  return {
    id: 'active-virtual',
    name: TOURNAMENT.name || 'Current Tournament',
    subtitle: (TOURNAMENT.date || 'Active') + ' · IN PROGRESS',
    games: gameEntries,
    wins,
    losses,
    record: `${wins}-${losses}`,
    totalPoints: pts,
    virtual: true
  };
}

// ─── BRACKET POINTS ───────────────────────────────────────────────────────────
// Points awarded per game result (per league rules)

const POINTS = { W: 4, SW: 3, SL: 2, L: 1, F: 0 };

function getPoints(result) {
  return (result != null && result in POINTS) ? POINTS[result] : null;
}

function isWin(result)  { return result === 'W'  || result === 'SW'; }
function isLoss(result) { return result === 'L'  || result === 'SL' || result === 'F'; }

function resultLabel(result) {
  return { W: 'WIN', SW: 'SO WIN', SL: 'SO LOSS', L: 'LOSS', F: 'FORFEIT' }[result] || result || '—';
}

function _parseGameRef(gameRef) {
  const raw = String(gameRef ?? '');
  const m = raw.match(/^([^:]+):(.*)$/);
  if (!m) return { raw, groupKey: '', gameId: raw };
  return { raw, groupKey: m[1], gameId: m[2] };
}

function _contextGroupKey(gameOrRef, explicitGroupKey = '') {
  if (explicitGroupKey) return explicitGroupKey;
  if (gameOrRef && typeof gameOrRef === 'object') {
    if (gameOrRef._groupKey) return gameOrRef._groupKey;
    if (gameOrRef.ageGroup) return gameOrRef.ageGroup;
  }
  const parsed = _parseGameRef(gameOrRef);
  if (parsed.groupKey) return parsed.groupKey;
  if (_activeAgeGroup) return _activeAgeGroup;
  return getSelectedTeam() || getSelectedTeams()[0] || '';
}

function _gameIdOnly(gameOrRef) {
  if (gameOrRef && typeof gameOrRef === 'object') return String(gameOrRef.id ?? '');
  return _parseGameRef(gameOrRef).gameId;
}

function _scopedGameKey(gameOrRef, explicitGroupKey = '') {
  const groupKey = _contextGroupKey(gameOrRef, explicitGroupKey);
  const gameId = _gameIdOnly(gameOrRef);
  return groupKey ? `${groupKey}:${gameId}` : gameId;
}

function _gameRef(gameOrRef, explicitGroupKey = '') {
  return _scopedGameKey(gameOrRef, explicitGroupKey);
}

function _findGameByRef(gameOrRef, explicitGroupKey = '') {
  const groupKey = _contextGroupKey(gameOrRef, explicitGroupKey);
  const gameId = _gameIdOnly(gameOrRef);
  if (groupKey && TEAM_CACHE[groupKey]?.tournament?.games) {
    const match = TEAM_CACHE[groupKey].tournament.games.find(g => String(g.id) === String(gameId));
    if (match) return { ...match, _groupKey: groupKey };
  }
  const local = getTournamentGames().find(g => String(g.id) === String(gameId) && (!groupKey || g._groupKey === groupKey));
  if (local) return local;
  return getTournamentGames().find(g => String(g.id) === String(gameId)) || null;
}

function _getLiveScoreForGame(gameOrRef, explicitGroupKey = '') {
  const scopedKey = _scopedGameKey(gameOrRef, explicitGroupKey);
  return state.liveScores[scopedKey] || state.liveScores[_gameIdOnly(gameOrRef)] || null;
}

function _hasMeaningfulLiveScoreData(score) {
  if (!score) return false;
  return (Array.isArray(score.events) && score.events.some(ev => ev.type !== 'game_state'))
    || Number(score.team || 0) !== 0
    || Number(score.opp || 0) !== 0;
}

function _getAuthoritativeLiveResult(gameOrRef, explicitGroupKey = '') {
  const score = _getLiveScoreForGame(gameOrRef, explicitGroupKey);
  if (!score) return { hasLive: false, result: null };

  const direct = _inferFinalResultFromScore(score);
  if (direct) return { hasLive: true, result: direct };

  const hasMeaningfulLiveData = _hasMeaningfulLiveScoreData(score);
  if (!hasMeaningfulLiveData) return { hasLive: false, result: null };

  const game = _findGameByRef(gameOrRef, explicitGroupKey);
  const start = game ? parseGameTime(game.dateISO, game.time) : null;
  const isPastExpectedWindow = start ? (Date.now() - start.getTime()) > ((CONFIG.EVENT_DURATION_MIN || 90) * 60000) : false;
  const stillLive = !!isGameLive(_gameRef(gameOrRef, explicitGroupKey));
  if (!stillLive && isPastExpectedWindow) {
    if (typeof score.team === 'number' && typeof score.opp === 'number') {
      if (score.team > score.opp) return { hasLive: true, result: 'W' };
      if (score.team < score.opp) return { hasLive: true, result: 'L' };
    }
  }

  return { hasLive: true, result: null };
}

function _getResultForGame(gameOrRef, explicitGroupKey = '') {
  const liveResolved = _getAuthoritativeLiveResult(gameOrRef, explicitGroupKey);
  if (liveResolved.hasLive && liveResolved.result) {
    const scopedKey = _scopedGameKey(gameOrRef, explicitGroupKey);
    if (state.results[scopedKey] !== liveResolved.result) {
      state.results[scopedKey] = liveResolved.result;
      _saveResults();
    }
    return liveResolved.result;
  }
  if (liveResolved.hasLive) {
    return null;
  }
  const scopedKey = _scopedGameKey(gameOrRef, explicitGroupKey);
  if (state.results[scopedKey] != null) return state.results[scopedKey];
  const rawKey = _gameIdOnly(gameOrRef);
  return state.results[rawKey] ?? null;
}

function _setResultForGame(gameOrRef, result, explicitGroupKey = '') {
  const scopedKey = _scopedGameKey(gameOrRef, explicitGroupKey);
  state.results[scopedKey] = state.results[scopedKey] === result ? null : result;
  localStorage.setItem(STORE.RESULTS, JSON.stringify(state.results));
}

function _saveResults() {
  localStorage.setItem(STORE.RESULTS, JSON.stringify(state.results));
}

function _hydrateOfficialResultsFromTournament() {
  let changed = false;
  const seen = new Set();
  const applyGames = (games, explicitGroupKey = '') => {
    if (!Array.isArray(games)) return;
    games.forEach(g => {
      if (!g?.id || !g?.result) return;
      const scopedKey = _scopedGameKey(g, explicitGroupKey || g._groupKey || '');
      if (seen.has(scopedKey)) return;
      seen.add(scopedKey);
      if (state.results[scopedKey] == null) {
        state.results[scopedKey] = g.result;
        changed = true;
      }
    });
  };

  applyGames(window.TOURNAMENT?.games || [], getSelectedTeams()[0] || '');
  Object.entries(TEAM_CACHE || {}).forEach(([groupKey, cache]) => applyGames(cache?.tournament?.games || [], groupKey));

  if (changed) _saveResults();
}

function _warnIntegrity(message, detail = '') {
  const full = detail ? `${message}: ${detail}` : message;
  state.integrityWarnings.push(full);
  if (state.integrityWarnings.length > 50) state.integrityWarnings.shift();
  console.warn('[integrity]', full);
}

function _matchingGroupKeysForGameId(gameId) {
  const gidStr = String(gameId);
  const keys = new Set();
  for (const [key, cache] of Object.entries(TEAM_CACHE)) {
    if (cache?.tournament?.games?.some(g => String(g.id) === gidStr)) keys.add(key);
  }
  if (TOURNAMENT?.games?.some(g => String(g.id) === gidStr)) {
    keys.add(getSelectedTeam() || getSelectedTeams()[0] || '');
  }
  return [...keys].filter(Boolean);
}

function _restorePrimaryTournamentContext() {
  const primaryKey = getSelectedTeams()[0];
  if (!primaryKey || !TEAM_CACHE[primaryKey]) return;
  window.TOURNAMENT = TEAM_CACHE[primaryKey].tournament;
  window.HISTORY_SEED = TEAM_CACHE[primaryKey].history || [];
}

function _normalizeScopedMyGamesState() {
  const rawGames = [...getMyGames()];
  if (!rawGames.length) return false;
  const next = new Set();
  let changed = false;

  for (const key of rawGames) {
    const rawKey = String(key);
    if (rawKey.includes(':')) {
      next.add(rawKey);
      continue;
    }
    const matches = _matchingGroupKeysForGameId(rawKey);
    if (matches.length === 1) {
      next.add(`${matches[0]}:${rawKey}`);
      changed = true;
    } else {
      next.add(rawKey);
      if (matches.length > 1) _warnIntegrity('Ambiguous raw my-games key', rawKey);
    }
  }

  const nextArr = [...next];
  if (changed || nextArr.length !== rawGames.length) {
    localStorage.setItem('ebwp-my-games', JSON.stringify(nextArr));
    return true;
  }
  return false;
}

function _normalizeTeamCacheState() {
  let changed = false;
  for (const [groupKey, cache] of Object.entries(TEAM_CACHE || {})) {
    if (!cache?.tournament) continue;
    if (Array.isArray(cache.tournament.games)) {
      cache.tournament.games = cache.tournament.games.map(g => {
        if (g?._groupKey === groupKey) return g;
        changed = true;
        return { ...g, _groupKey: groupKey };
      });
    }
    if (Array.isArray(cache.history)) {
      cache.history = cache.history.map(entry => {
        let entryChanged = false;
        const normalized = { ...entry };
        if (!normalized.ageGroup) {
          normalized.ageGroup = groupKey;
          entryChanged = true;
        }
        if (Array.isArray(normalized.games)) {
          normalized.games = normalized.games.map(g => {
            if (g?._groupKey === groupKey) return g;
            entryChanged = true;
            return { ...g, _groupKey: groupKey };
          });
        }
        if (entryChanged) changed = true;
        return normalized;
      });
    }
  }
  return changed;
}

function _normalizeStoredHistoryState() {
  const history = getHistory();
  if (!Array.isArray(history) || !history.length) return false;
  let changed = false;
  const next = history.map(entry => {
    const guessedGroupKey =
      entry?.ageGroup
      || Object.entries(TEAM_CACHE || {}).find(([, cache]) => cache?.tournament?.id === entry?.id)?.[0]
      || '';
    if (!guessedGroupKey) return entry;
    let entryChanged = false;
    const normalized = { ...entry };
    if (!normalized.ageGroup) {
      normalized.ageGroup = guessedGroupKey;
      entryChanged = true;
    }
    if (Array.isArray(normalized.games)) {
      normalized.games = normalized.games.map(g => {
        if (g?._groupKey === guessedGroupKey) return g;
        entryChanged = true;
        return { ...g, _groupKey: guessedGroupKey };
      });
    }
    if (entryChanged) changed = true;
    return normalized;
  });
  if (changed) localStorage.setItem(STORE.HISTORY, JSON.stringify(next));
  return changed;
}

function _normalizeScopedResultsState() {
  const entries = Object.entries(state.results || {});
  if (!entries.length) return false;
  const next = {};
  let changed = false;

  for (const [key, value] of entries) {
    if (key.includes(':')) next[key] = value;
  }

  for (const [key, value] of entries) {
    if (key.includes(':')) continue;
    const matches = _matchingGroupKeysForGameId(key);
    if (matches.length === 1) {
      const scopedKey = `${matches[0]}:${key}`;
      if (next[scopedKey] == null) next[scopedKey] = value;
      changed = true;
    } else {
      next[key] = value;
      if (matches.length > 1) _warnIntegrity('Ambiguous raw result key', key);
    }
  }

  if (changed || Object.keys(next).length !== entries.length) state.results = next;
  return changed;
}

function _normalizeScopedLiveScoresState() {
  const entries = Object.entries(state.liveScores || {});
  if (!entries.length) return false;
  const next = {};
  let changed = false;

  for (const [key, score] of entries) {
    if (!key.includes(':')) continue;
    const parsed = _parseGameRef(key);
    next[key] = { ...score, ageGroup: score?.ageGroup || parsed.groupKey || '' };
    if (!score?.ageGroup && parsed.groupKey) changed = true;
  }

  for (const [key, score] of entries) {
    if (key.includes(':')) continue;
    const matches = _matchingGroupKeysForGameId(key);
    const resolvedGroup = score?.ageGroup && matches.includes(score.ageGroup)
      ? score.ageGroup
      : (matches.length === 1 ? matches[0] : '');
    if (resolvedGroup) {
      const scopedKey = `${resolvedGroup}:${key}`;
      if (!next[scopedKey]) next[scopedKey] = { ...score, ageGroup: resolvedGroup };
      changed = true;
    } else {
      next[key] = score;
      if (matches.length > 1) _warnIntegrity('Ambiguous raw live score key', key);
    }
  }

  if (changed || Object.keys(next).length !== entries.length) state.liveScores = next;
  return changed;
}

function _auditMultiTeamIntegrity(opts = {}) {
  const { persist = true } = opts;
  state.integrityWarnings = [];
  const resultsChanged = _normalizeScopedResultsState();
  const liveChanged = _normalizeScopedLiveScoresState();
  const myGamesChanged = _normalizeScopedMyGamesState();
  const cacheChanged = _normalizeTeamCacheState();
  const historyChanged = _normalizeStoredHistoryState();
  _restorePrimaryTournamentContext();
  state.roster = loadRoster(getSelectedTeam());
  if (persist) {
    if (resultsChanged) _saveResults();
    if (liveChanged) saveLiveScores();
  }
  return {
    resultsChanged,
    liveChanged,
    myGamesChanged,
    cacheChanged,
    historyChanged,
    warnings: [...state.integrityWarnings],
  };
}

function _inferFinalResultFromScore(score) {
  if (!score) return null;
  if (score.gameState === 'so_w') return 'SW';
  if (score.gameState === 'so_l') return 'SL';
  if (score.gameState === 'ff') return 'F';
  if (score.gameState !== 'final') return null;
  if (typeof score.team !== 'number' || typeof score.opp !== 'number') return null;
  if (score.team > score.opp) return 'W';
  if (score.team < score.opp) return 'L';
  return null;
}

function _applyAutoFinalResult(gameOrRef, score, explicitGroupKey = '') {
  const derived = _inferFinalResultFromScore(score);
  if (!derived) return false;
  const scopedKey = _scopedGameKey(gameOrRef, explicitGroupKey);
  if (state.results[scopedKey] === derived) return false;
  state.results[scopedKey] = derived;
  _saveResults();
  return true;
}

function _hydrateDerivedResultsFromLiveScores() {
  let changed = false;
  for (const [key, score] of Object.entries(state.liveScores || {})) {
    const parsed = _parseGameRef(key);
    const gameRef = key.includes(':') ? key : parsed.gameId;
    const groupKey = score?.ageGroup || parsed.groupKey || '';
    if (_applyAutoFinalResult(gameRef, score, groupKey)) changed = true;
  }
  return changed;
}

// ─── STATE ────────────────────────────────────────────────────────────────────

const state = {
  results:          {},     // gameId → 'W' | 'SW' | 'SL' | 'L' | 'F'
  bracketResults:   {},     // 'pathId-gameNum' → 'W' | 'L'
  liveScores:       {},     // gameId → { team, opp, clock, period, gameState, events[], quarterMins, halfMins, timeoutMins }
  dirScores:        {},     // gameId → { score1, score2, status, updatedAt }  — director game scores
  dirScorerUnlocked: false, // true = director scoring mode unlocked
  dirPollTimer:     null,   // interval ID for polling dir scores
  // Tournament Score tab
  tscoreUnlocked:   false,
  tscorePkg:        null,
  tscorePw:         '',
  tscoreScores:     {},
  tscorePollTimer:  null,
  scorerDetailsOpen:{},
  scoreDetail:      null,
  scoreDetailTab:   'summary',
  historyDetail:    null,
  historyDetailTab: 'summary',
  roster:           [],     // [{ cap, first, last }] — editable via Roster tab
  currentTab:       'schedule',
  viewerMode:       true,       // true = viewing live scores without scorer login (default for spectators)
  spectatorTier:    null,       // canonical in-memory tier name going forward
  parentTier:       null,       // legacy mirror kept for compatibility during migration
  undoToast:        null,
  integrityWarnings: [],

  // Calendar sync
  accessToken:      null,
  tokenExpiry:      null,
  selectedCalId:    null,
  selectedCalName:  null,
  syncActive:       false,
    syncIntervalId:   null,
    lastSyncTime:     null,
    tokenClient:      null,
    pendingAction:    null,   // callback to run after token is granted
    nativeSystemState:{
      platform: '',
      isLowPowerMode: false,
      thermalState: 'unknown',
      isThermallyConstrained: false,
    },
  };

// ─── DOM HELPER ───────────────────────────────────────────────────────────────

// _renderSuffix is set during multi-team rendering so $('foo') finds 'foo-14u-girls' etc.
let _renderSuffix    = '';
let _inMultiRender   = false;   // prevents recursive multi→single→multi dispatch
let _activeAgeGroup  = null;    // which age group is currently being rendered (for per-group A/B)
let _activeTeamLetters = null;  // when set, overrides getActiveTeams() during per-letter rendering
let _pendingTeamPickerKeys = [];
let _pendingTeamPickerLetters = {};
// _historyOverride bypasses localStorage during multi-team history rendering
  let _historyOverride = null;

  function getNativeSystemPlugin() {
    const platform = window.Capacitor?.getPlatform?.();
    if (platform === 'ios') return window.Capacitor?.Plugins?.LiveActivity || null;
    if (platform === 'android') return window.Capacitor?.Plugins?.LiveUpdate || null;
    return null;
  }

  function _applyNativeSystemState(info = {}) {
    state.nativeSystemState = {
      platform: info.platform || window.Capacitor?.getPlatform?.() || '',
      isLowPowerMode: !!info.isLowPowerMode,
      thermalState: info.thermalState || 'unknown',
      isThermallyConstrained: !!info.isThermallyConstrained,
    };
  }

  async function refreshNativeSystemState() {
    const plugin = getNativeSystemPlugin();
    if (!plugin?.getSystemState) return null;
    try {
      const info = await plugin.getSystemState();
      _applyNativeSystemState(info || {});
      return state.nativeSystemState;
    } catch (_) {
      return null;
    }
  }

  async function openNativeAppSettings() {
    const plugin = getNativeSystemPlugin();
    if (!plugin?.openAppSettings) {
      showToast('Device settings are only available in the native app');
      return;
    }
    try {
      await plugin.openAppSettings();
    } catch (_) {
      showToast('Could not open app settings');
    }
  }

  async function openNativeNotificationSettings() {
    const plugin = getNativeSystemPlugin();
    if (!plugin?.openNotificationSettings) {
      showToast('Notification settings are only available in the native app');
      return;
    }
    try {
      await plugin.openNotificationSettings();
    } catch (_) {
      showToast('Could not open notification settings');
    }
  }

const $ = id => document.getElementById(_renderSuffix ? id + _renderSuffix : id)
               || document.getElementById(id);

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normalizeOpponentName(name) {
  let s = String(name || '').trim();
  if (!s) return '';
  s = s.replace(/^\(\s*\d+(?:st|nd|rd|th)\s+[A-Z]\s*\)\s*[-–]\s*/i, '');
  s = s.replace(/^\(\s*[A-Z]\d+\s*\)\s*[-–]\s*/i, '');
  s = s.replace(/^[A-Z]\d+\s*[-–]\s*/i, '');
  s = s.replace(/^[A-Z]?\d+\s*\([^)]*\)\s*[-–]\s*/i, '');
  s = s.replace(/^\d+(?:st|nd|rd|th)\s+[A-Z]\s*[-–]\s*/i, '');
  s = s.replace(/^[A-Z]\d+\s+/i, '');
  s = s.replace(/^\d+(?:st|nd|rd|th)\s+[A-Z]\s+/i, '');
  s = s.replace(/^\s*[-–]\s*/, '');
  return s.trim() || String(name || '').trim();
}

/**
 * Build a tappable directions link for a location string with Apple Maps, Google Maps, and Waze.
 * If location looks like coordinates ("37.7749,-122.4194"), use directly.
 * Otherwise URL-encode as a place name search.
 * Light/dark styling handled via CSS classes (.directions-btn, .location-venue).
 */
function buildLocationLink(location) {
  if (!location) return '';
  const isCoords = /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(location.trim());
  const dest = isCoords ? location.trim() : encodeURIComponent(location);
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  const appleUrl  = `https://maps.apple.com/?daddr=${dest}`;
  const wazeUrl   = `https://waze.com/ul?q=${dest}`;
  return `<span style="display:inline-flex;flex-direction:column;gap:4px" onclick="event.stopPropagation()">
    <span style="display:inline-flex;align-items:center;gap:5px">
      <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;opacity:0.7"><path d="M6 0C3.24 0 1 2.24 1 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 6 3.5 1.5 1.5 0 0 1 6 6.5z" fill="currentColor"/></svg>
      <span class="location-venue">${escHtml(location)}</span>
    </span>
    <span style="display:inline-flex;align-items:center;gap:5px;padding-left:17px">
      <a href="${appleUrl}"  target="_blank" rel="noopener" class="directions-btn" onclick="event.stopPropagation()"><img src="https://www.google.com/s2/favicons?sz=16&domain=maps.apple.com" width="13" height="13" style="border-radius:3px;vertical-align:middle" alt="">Apple</a>
      <a href="${googleUrl}" target="_blank" rel="noopener" class="directions-btn" onclick="event.stopPropagation()"><img src="https://www.google.com/s2/favicons?sz=16&domain=maps.google.com" width="13" height="13" style="border-radius:3px;vertical-align:middle" alt="">Google</a>
      <a href="${wazeUrl}"   target="_blank" rel="noopener" class="directions-btn" onclick="event.stopPropagation()"><img src="https://www.google.com/s2/favicons?sz=16&domain=waze.com" width="13" height="13" style="border-radius:3px;vertical-align:middle" alt="">Waze</a>
    </span>
  </span>`;
}

/**
 * Sort key for roster cap numbers.
 * Field players (2–25+) sort numerically first.
 * Goalkeepers (GK / 1 / 1A) and blank caps sort to the bottom.
 */
function capSortKey(cap) {
  const c = String(cap || '').trim().toUpperCase();
  if (!c || c === 'GK' || c === '1' || c === '1A') return 9999;
  const n = parseInt(c, 10);
  return isNaN(n) ? 9998 : n;
}

/** Returns true if the cap number belongs to a goalkeeper (GK, 1, or 1A). */
function isGoalie(cap) {
  const c = String(cap || '').trim().toUpperCase();
  return c === 'GK' || c === '1' || c === '1A';
}

/** Returns a copy of a roster array sorted: field players 2–25 first, goalies last. */
function sortedRoster(roster) {
  return [...(roster || [])].sort((a, b) => capSortKey(a.cap) - capSortKey(b.cap));
}

function hideToast() {
  const t = $('toast');
  if (!t) return;
  clearTimeout(t._timer);
  t.classList.add('hidden');
  delete t.dataset.toastToken;
}

function showToast(msg, type = 'default', opts = {}) {
  const t = $('toast');
  if (!t) return;
  const {
    timeoutMs = 4000,
    actionLabel = '',
    onAction = null,
    onExpire = null,
  } = opts || {};
  const token = String(Date.now() + Math.random());
  t.dataset.toastToken = token;
  t.className = `toast toast-${type}`;
  t.innerHTML = '';
  const msgEl = document.createElement('span');
  msgEl.className = 'toast-message';
  msgEl.textContent = msg;
  t.appendChild(msgEl);
  if (actionLabel && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = actionLabel;
    btn.onclick = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      if (t.dataset.toastToken !== token) return;
      clearTimeout(t._timer);
      t.classList.add('hidden');
      delete t.dataset.toastToken;
      onAction();
    };
    t.appendChild(btn);
  }
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  if (timeoutMs > 0) {
    t._timer = setTimeout(() => {
      if (t.dataset.toastToken !== token) return;
      t.classList.add('hidden');
      delete t.dataset.toastToken;
      if (typeof onExpire === 'function') onExpire();
    }, timeoutMs);
  }
}

function showUndoToast(msg, onUndo, opts = {}) {
  showToast(msg, opts.type || 'default', {
    timeoutMs: opts.timeoutMs ?? 5000,
    actionLabel: opts.actionLabel || 'Undo',
    onAction: () => {
      try { onUndo?.(); } catch (err) { console.warn('undo failed:', err?.message || err); }
    },
  });
}

function scheduleUndoableAction(msg, apply, opts = {}) {
  showToast(msg, opts.type || 'default', {
    timeoutMs: opts.timeoutMs ?? 5000,
    actionLabel: opts.actionLabel || 'Undo',
    onAction: () => {
      try { opts.onCanceled?.(); } catch (err) { console.warn('undo cancel failed:', err?.message || err); }
    },
    onExpire: () => {
      try { apply?.(); } catch (err) { console.warn('scheduled action failed:', err?.message || err); }
    },
  });
}

function _cloneJsonSafe(value) {
  try { return JSON.parse(JSON.stringify(value)); }
  catch {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return value;
  }
}

// ─── ACCESSIBILITY: MODAL FOCUS MANAGEMENT (WCAG 2.4.3, 4.1.3) ───────────────
// Provides focus trapping, trigger-restore, and score announcements so that
// VoiceOver and Voice Control users get a complete, non-confusing experience.

const _FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Trap Tab/Shift-Tab focus within a modal container.
 * Immediately moves focus to the first focusable child.
 * Returns a cleanup function that removes the keydown listener.
 */
function _trapFocus(container) {
  function getFocusable() { return [...container.querySelectorAll(_FOCUSABLE)]; }
  function onKey(e) {
    if (e.key !== 'Tab') return;
    const els = getFocusable();
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  container.addEventListener('keydown', onKey);
  // Delay so element is visible/painted before focus
  setTimeout(() => { const f = getFocusable(); if (f.length) f[0].focus(); }, 50);
  return () => container.removeEventListener('keydown', onKey);
}

/** Per-modal a11y state: id → { trigger, cleanup } */
const _modalA11y = {};

/** Call when opening any modal. Saves the triggering element and arms the focus trap. */
function _openModal(id) {
  const container = $(id);
  if (!container) return;
  _modalA11y[id] = { trigger: document.activeElement, cleanup: _trapFocus(container) };
}

/** Call when closing any modal. Disarms the trap and restores focus to the trigger. */
function _closeModal(id) {
  const m = _modalA11y[id];
  if (!m) return;
  if (m.cleanup) m.cleanup();
  setTimeout(() => m.trigger?.focus(), 50);
  delete _modalA11y[id];
}

/** Announce a score update to screen readers via the aria-live region. */
function _announceScore(gameId) {
  const announcer = $('score-announcer');
  if (!announcer) return;
  const s = getLiveScore(gameId);
  if (!s) return;
  const game = _findGameByRef(gameId);
  const home = TOURNAMENT.clubName || 'Us';
  const away = game?.opponent || 'Opponent';
  const qtr  = s.period ? ' — ' + _getPeriodLabel(s.period, gameId) : '';
  const clk  = s.clock  ? ` ${s.clock}` : '';
  announcer.textContent = `${home} ${s.team ?? 0}, ${away} ${s.opp ?? 0}${qtr}${clk}.`;
}

// ─── TIME HELPERS ─────────────────────────────────────────────────────────────

// Format a raw date key (ISO "2026-04-04" or already-human "Apr 4, 2026") for display
// as a date-group-header label. ISO dates become "Sat · April 4"; others pass through.
function formatDateGroupLabel(dateStr) {
  if (!dateStr || dateStr === 'Unknown' || dateStr === 'TBD') return dateStr || 'TBD';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    try {
      const d = new Date(dateStr + 'T00:00:00'); // local midnight
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      const md  = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      return `${day} · ${md}`;
    } catch (e) { /* fall through */ }
  }
  return dateStr;
}

function _lastSyncLabel() {
  const ts = parseInt(localStorage.getItem('ebwp-last-sync') || '0', 10);
  if (!ts) return null;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24)    return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/**
 * Returns a small HTML warning string when a score poll has failed more recently
 * than it last succeeded — signals to the user that live data may be stale.
 * @param {number|undefined} lastError  — state.dirPollLastError or tscorePollLastError
 * @param {number|undefined} lastSuccess — state.dirPollLastSuccess or tscorePollLastSuccess
 */
function _pollStaleNote(lastError, lastSuccess) {
  if (!lastError) return '';
  if (lastSuccess && lastSuccess >= lastError) return ''; // recovered
  const mins = Math.round((Date.now() - lastError) / 60000);
  const ago = mins < 1 ? 'just now' : `${mins} min ago`;
  return `<div style="background:#fef3c7;color:#92400e;font-size:0.75rem;font-weight:600;padding:6px 14px;border-radius:8px;margin-bottom:8px">
    ⚠️ Live feed interrupted (${ago}) — scores may be delayed
  </div>`;
}

/** Shows or hides the body-level live-scoring banner (position:fixed outside overflow containers). */
function _setLiveBanner(visible) {
  const el = document.getElementById('live-scoring-banner');
  if (el) el.classList.toggle('hidden', !visible);
}

/** Returns today's date as a local YYYY-MM-DD string (NOT UTC — avoids UTC-midnight-shift bug). */
function _localDateStr(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function _getTournamentLastDateISO(tournament = TOURNAMENT) {
  const dates = new Set();
  (tournament?.games || []).forEach(g => {
    if (g?.dateISO) dates.add(g.dateISO);
  });
  (tournament?.bracket?.paths || []).forEach(path => {
    (path?.steps || []).forEach(step => {
      if (step?.dateISO) dates.add(step.dateISO);
    });
  });
  const sorted = [...dates].sort();
  return sorted[sorted.length - 1] || '';
}

function _isTournamentPastWindow(tournament = TOURNAMENT, now = new Date()) {
  if (tournament?.upcomingMode || tournament?.comingSoon) return false;
  const lastDateISO = _getTournamentLastDateISO(tournament);
  if (!lastDateISO) return false;
  const cutoff = new Date(lastDateISO + 'T23:59:59');
  return now.getTime() > cutoff.getTime();
}

function _renderTournamentCompleteCard() {
  const record = getPoolRecord();
  return `
    <div class="coming-soon-wrap">
      <div class="coming-soon-card tournament-complete-card">
        <div class="coming-soon-icon">🏁</div>
        <div class="coming-soon-text">
          <div class="coming-soon-label">Tournament Complete</div>
          <div class="coming-soon-sub">${escHtml(TOURNAMENT.name || 'This tournament')} has ended.</div>
          <div class="coming-soon-sub" style="margin-top:8px">Check the History tab for final results${record ? ` · ${escHtml(record)}` : ''}.</div>
        </div>
      </div>
    </div>`;
}

function parseGameTime(dateISO, timeStr) {
  if (!dateISO || !timeStr || timeStr === 'TBD') return null;
  try {
    const [timePart, ampm] = timeStr.split(' ');
    const [hStr, mStr] = timePart.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const d = new Date(dateISO + 'T00:00:00'); // local midnight, not UTC — new Date('2026-04-05') parses as UTC midnight which is April 4 at 5PM Pacific
    d.setHours(h, m, 0, 0);
    return d;
  } catch { return null; }
}

function toISOLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}` +
         `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

// ─── PROJECTED NEXT GAME ──────────────────────────────────────────────────────
// Returns the next upcoming game — either a pool play game (by time)
// or the next bracket step from the projected path once pool play is complete.

function findNextGameOrProjected() {
  const now = new Date();
  if (_isTournamentPastWindow(TOURNAMENT, now)) return null;
  const games = getTournamentGames();
  const unplayedGames = games.filter(g => !_getResultForGame(g));

  // 1. Next upcoming pool play game by clock time
  // Keep showing a game as "next" until 90 min past its start time (covers typical game duration)
  const gameNumVal = g => parseInt((g.gameNum || '').replace(/\D/g, ''), 10) || 9999;
  const withTime = unplayedGames.filter(g => {
    const t = parseGameTime(g.dateISO, g.time);
    return t && t > new Date(now - 90 * 60 * 1000);
  });
  // Fallback: if no games have a valid future dateISO (e.g. dates not yet entered),
  // treat all unplayed games as upcoming and sort by game number.
  const pool = withTime.length > 0 ? withTime : unplayedGames;
  const nextPool = pool
    .sort((a, b) => {
      const ta = parseGameTime(a.dateISO, a.time), tb = parseGameTime(b.dateISO, b.time);
      if (ta && tb) return ta - tb;
      if (ta) return -1;
      if (tb) return 1;
      return gameNumVal(a) - gameNumVal(b);
    })[0];

  if (nextPool) return { game: nextPool, type: 'pool' };

  const projected = inferProjectedPath();
  if (!projected) return null;

  for (const step of (projected.steps || [])) {
    const stepKey = `${projected.id}-${step.gameNum}`;
    if (!state.bracketResults[stepKey]) {
      return { game: step, type: 'bracket', pathLabel: projected.label };
    }
  }

  return null;
}

// ─── BRACKET PROJECTION ───────────────────────────────────────────────────────

function inferProjectedPath() {
  const paths = getTournamentBracketPaths();
  if (!paths?.length) return null;
  // Imported director paths have no qualifyMinWins/qualifyMaxWins — skip projection
  if (!paths.some(p => p.qualifyMinWins != null || p.qualifyMaxWins != null)) return null;

  const games = getTournamentGames();
  if (!games.length) return null;

  const completedGames = games.filter(g => _getResultForGame(g));
  if (!completedGames.length) return null;

  const wins = completedGames.filter(g => isWin(_getResultForGame(g))).length;

  for (const path of paths) {
    const minW = path.qualifyMinWins ?? 0;
    const maxW = path.qualifyMaxWins ?? 99;
    if (wins >= minW && wins <= maxW) return path;
  }

  return paths[0]; // fallback
}

function getPoolRecord() {
  let w = 0, l = 0, pts = 0;
  for (const g of getTournamentGames()) {
    const r = _getResultForGame(g);
    if (isWin(r))  w++;
    else if (isLoss(r)) l++;
    if (r != null) pts += POINTS[r] ?? 0;
  }
  return (w + l) > 0 ? `${w}-${l} · ${pts} pts` : '0-0';
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────

function getHistory() {
  if (_historyOverride !== null) return _historyOverride;
  try { return JSON.parse(localStorage.getItem(STORE.HISTORY) || '[]'); }
  catch { return []; }
}

function archiveTournament(snapshot, results, bracketResults, liveScores) {
  const history = getHistory();
  const games = snapshot.games || [];
  const snapshotGroupKey = snapshot._groupKey || snapshot.ageGroup || getSelectedTeams()[0] || '';
  let wins = 0, losses = 0, totalPoints = 0;
  for (const g of games) {
    const r = results[_scopedGameKey(g, snapshotGroupKey)] ?? results[g.id];
    if (isWin(r))        wins++;
    else if (isLoss(r))  losses++;
    if (r != null) totalPoints += POINTS[r] ?? 0;
  }
  const record = `${wins}-${losses}`;

  const bracketPaths = (snapshot.bracket?.paths || []).map(path => ({
    ...path,
    steps: (path.steps || []).map(step => ({
      ...step,
      result: (bracketResults || {})[`${path.id}-${step.gameNum}`] || null,
    })),
  }));

  // Extract player stats from liveScores events (Phase 5D)
  const playerStats = {};
  for (const g of games) {
    const ls = (liveScores || {})[_scopedGameKey(g, snapshotGroupKey)] || (liveScores || {})[g.id];
    if (!ls || !Array.isArray(ls.events)) continue;
    const playersInGame = new Set();
    for (const ev of ls.events) {
      const player = ev.player || ev.scorer;
      if (!player) continue;
      if (!playerStats[player]) {
      playerStats[player] = { goals: 0, assists: 0, steals: 0, turnovers: 0, sprintWins: 0, exclusions: 0, gamesPlayed: 0 };
      }
      playersInGame.add(player);
      const action = (ev.action || ev.type || '').toLowerCase();
    if (action === 'goal' || action === 'scored')     playerStats[player].goals++;
    else if (action === 'assist')                       playerStats[player].assists++;
    else if (action === 'steal')                        playerStats[player].steals++;
    else if (action === 'turnover')                     playerStats[player].turnovers++;
    else if (action === 'sprint_won')                   playerStats[player].sprintWins++;
      else if (action === 'exclusion' || action === 'ejection') playerStats[player].exclusions++;
    }
    for (const p of playersInGame) {
      playerStats[p].gamesPlayed++;
    }
  }

  const archived = {
    id: snapshot.id, name: snapshot.name, subtitle: snapshot.subtitle,
    dates: snapshot.dates, location: snapshot.location, pool: snapshot.pool,
    record, wins, losses, totalPoints,
    archivedAt: new Date().toISOString(),
    games: games.map(g => ({
      ...g,
      _groupKey: snapshotGroupKey || g._groupKey || '',
      result:    results[_scopedGameKey(g, snapshotGroupKey)] ?? results[g.id] ?? null,
      points:    getPoints(results[_scopedGameKey(g, snapshotGroupKey)] ?? results[g.id] ?? null),
      liveScore: (liveScores || {})[_scopedGameKey(g, snapshotGroupKey)] || (liveScores || {})[g.id] || null,
    })),
    bracketPaths,
    playerStats,
  };

  const idx = history.findIndex(h => h.id === archived.id);
  if (idx >= 0) history[idx] = archived;
  else history.unshift(archived);

  _syncWidgetsAll();

  localStorage.setItem(STORE.HISTORY, JSON.stringify(history));
}

// ─── TOURNAMENT CHANGE DETECTION ──────────────────────────────────────────────

function checkTournamentChange() {
  const savedId = localStorage.getItem(STORE.TOURNAMENT_ID);
  let savedSnap, savedRes, savedBrRes, savedLiveScores;
  try {
    savedSnap       = JSON.parse(localStorage.getItem(STORE.SNAPSHOT)        || 'null');
    savedRes        = JSON.parse(localStorage.getItem(STORE.RESULTS)         || '{}');
    savedBrRes      = JSON.parse(localStorage.getItem(STORE.BRACKET_RESULTS) || '{}');
    savedLiveScores = JSON.parse(localStorage.getItem(STORE.LIVE_SCORES)     || '{}');
  } catch (e) {
    console.warn('[ebwp] checkTournamentChange: corrupted localStorage, skipping archive check:', e.message);
    return;
  }

  if (savedId && savedId !== TOURNAMENT.id && savedSnap) {
    // Only archive if results were actually recorded (skip blank placeholder data)
    const hasResults = Object.keys(savedRes).length > 0 || Object.keys(savedBrRes).length > 0;
    if (hasResults) {
      archiveTournament(savedSnap, savedRes, savedBrRes, savedLiveScores);
      showToast(`${savedSnap.name || 'Last tournament'} archived to History ✓`, 'ok');
    }
    localStorage.removeItem(STORE.RESULTS);
    localStorage.removeItem(STORE.BRACKET_RESULTS);
    localStorage.removeItem(STORE.LIVE_SCORES);
    // Clear cached rosters so new tournament always loads fresh from admin panel
    localStorage.removeItem(STORE.ROSTER);
    localStorage.removeItem(STORE.ROSTER + '-A');
    localStorage.removeItem(STORE.ROSTER + '-B');
    state.results        = {};
    state.bracketResults = {};
    state.liveScores     = {};
  } else {
    state.results        = savedRes;
    state.bracketResults = savedBrRes;
    state.liveScores     = savedLiveScores;
  }

  _hydrateOfficialResultsFromTournament();
  _hydrateDerivedResultsFromLiveScores();

  localStorage.setItem(STORE.TOURNAMENT_ID, TOURNAMENT.id);
  localStorage.setItem(STORE.SNAPSHOT, JSON.stringify(TOURNAMENT));

  // Restore calendar settings
  state.selectedCalId   = localStorage.getItem(STORE.CALENDAR_ID)   || null;
  state.selectedCalName = localStorage.getItem(STORE.CALENDAR_NAME) || null;
  if (state.selectedCalId) state.syncActive = true;
}

// ─── LIVE SCORING ─────────────────────────────────────────────────────────────

// ─── LIVE SCORES PERSISTENCE ──────────────────────────────────────────────────

function saveLiveScores() {
  localStorage.setItem(STORE.LIVE_SCORES, JSON.stringify(state.liveScores));
}

// ─── MY-GAMES TRACKING ────────────────────────────────────────────────────────
// The CF worker /live-scores response never includes deviceId, so we can't
// tell our own broadcasts from a stranger's via the response alone.
// Instead we keep a local Set of game IDs this device has scored.
// pollLiveScores skips these; updateLiveDot/buildScheduleCard treat them as
// local (respecting the scorer-locked state).

function getMyGames() {
  try { return new Set(JSON.parse(localStorage.getItem('ebwp-my-games') || '[]')); }
  catch { return new Set(); }
}
function addMyGame(gameId) {
  const g = getMyGames();
  g.add(gameId);
  localStorage.setItem('ebwp-my-games', JSON.stringify([...g]));
}

// Returns true if a game should show as LIVE right now —
// either this device has scorer unlocked and the game is active,
// or another device broadcast it recently.
function isGameLive(gameId) {
  const s = getLiveScore(gameId);
  if (!s || !s.gameState || s.gameState === 'pre' || s.gameState === 'final') return false;
  // If a recent remote broadcast exists, use that regardless of myGames history
  if (s._broadcastAt) return (Date.now() - s._broadcastAt) < 30 * 60 * 1000;
  // Local-only score: live only while scorer is actively unlocked on this device
  return isScorerUnlocked();
}

/** Returns the age-group KEY (e.g. '14u-girls') for a given gameId by checking TEAM_CACHE. */
function _resolveGameAgeGroupKey(gameId) {
  const parsed = _parseGameRef(gameId);
  if (parsed.groupKey) return parsed.groupKey;
  const scopedScore = state.liveScores[_scopedGameKey(gameId)] || state.liveScores[String(gameId)];
  if (scopedScore?.ageGroup) return scopedScore.ageGroup;
  const gidStr = String(gameId);
  for (const [key, cache] of Object.entries(TEAM_CACHE)) {
    if (cache?.tournament?.games?.some(g => String(g.id) === gidStr)) return key;
  }
  // Fallback: check global TOURNAMENT
  if (TOURNAMENT?.games?.some(g => String(g.id) === gidStr)) return getSelectedTeam();
  return getSelectedTeams()[0] || '';
}

/** Returns the age-group LABEL (e.g. '14u Girls') for a given gameId. */
function _resolveGameAgeGroup(gameId) {
  const key = _resolveGameAgeGroupKey(gameId);
  return TEAM_OPTIONS.find(t => t.key === key)?.label || '';
}

/** Build an enriched score object for EggbeaterLiveUpdate.sync() — adds team name,
 *  opponent name, age group, and last event so the Android notification is descriptive. */
function _buildLUScore(gameId) {
  const score    = getLiveScore(gameId);
  const game     = _findGameByRef(gameId);
  // Age group: resolve from TEAM_CACHE so the correct group is used even with multiple selected
  const _agLabel = _resolveGameAgeGroup(gameId);
  const _tName   = _teamDisplayNameForGame(gameId, localStorage.getItem('ebwp-club-name') || getAppClubId() || '');
  return {
    ...score,
    teamName:  _tName || '',
    oppName:   game ? (game.opponent || '') : (score.oppName || ''),
    ageGroup:  _agLabel,
    lastEvent: (typeof _buildLastEventStr === 'function') ? _buildLastEventStr(gameId) : '',
  };
}

/** Save + re-render + broadcast after any scoring action. */
function afterScore(gameId) {
  const gameRef = _gameRef(gameId);
  const scopedKey = _scopedGameKey(gameId);
  addMyGame(scopedKey); // remember we scored this game on this device
  saveLiveScores();
  renderGamesList();
  renderNextGameCard(); // update LIVE badge on blue card
  if (state.currentTab === 'scores') renderScoresTab();
  updateLiveDot();
  _announceScore(gameRef); // VoiceOver: read updated score aloud
  // Broadcast score to CF Worker — reset to pre clears all viewer devices
  const _afterGs = state.liveScores[scopedKey];
  let historyChanged = false;
  if (_afterGs) historyChanged = _applyAutoFinalResult(gameId, _afterGs);
  if (_afterGs && _afterGs.gameState === 'pre') {
    broadcastGameReset(gameRef);
    // End iOS Live Activity and stop Android chip when game resets to pre
    if (window._activeLA?.gameId === gameRef) {
      const _laEnd = window.Capacitor?.Plugins?.LiveActivity;
      if (_laEnd) _laEnd.endActivity({}).catch(() => {});
      window._activeLA = null;
      if (window._laAutoStarted) _laAutoStarted.delete(gameRef);
    }
    if (typeof EggbeaterLiveUpdate !== 'undefined') EggbeaterLiveUpdate.stop();
  } else broadcastLiveScore(gameRef); // fire-and-forget
  notifyScorePush(gameRef, 'goal'); // fire-and-forget APNs push
  // Android 16 Live Update Sync
  if (typeof EggbeaterLiveUpdate !== 'undefined') {
    EggbeaterLiveUpdate.sync(gameRef, _buildLUScore(gameRef));
  }
  // iOS Live Activity auto-update (fire-and-forget) — scorer's own lock screen updates on every goal
  if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'ios') {
    const _las = state.liveScores[scopedKey];
    if (_las && _las.gameState !== 'pre' && _las.gameState !== 'final') {
      const _la = window.Capacitor?.Plugins?.LiveActivity ||
        (window.Capacitor?.nativePromise ? { updateActivity: (o) => window.Capacitor.nativePromise('LiveActivity', 'updateActivity', o) } : null);
      if (_la) {
        const _remaining = _las.timerRunning
          ? Math.max(0, (_las.timerSecondsLeft || 0) - (Date.now() - (_las.timerStartedAt || Date.now())) / 1000)
          : 0;
        _la.updateActivity({
          homeScore: _las.team  || 0,
          awayScore: _las.opp   || 0,
          clock:     _las.clock || '0:00',
          quarter:   String(_las.period || 1),
          lastEvent: _buildLastEventStr(gameRef),
          timerEnd:  _las.timerRunning && _remaining > 0 ? (Date.now() / 1000 + _remaining) : 0,
        }).catch(() => {});
      }
    }
  }
  if (historyChanged) renderHistoryTab();
  _syncWidgetsAll();
}

// Show/hide the pulsing red dot on the Scores nav button.
// Shows when THIS device has scorer unlocked + active game, OR when another
// device is broadcasting a live score (visible to all viewers).
// Clears the moment anyone locks (they broadcast 'pre' to the worker).
function updateLiveDot() {
  const dot = $('scores-live-dot');
  if (!dot) return;
  const STALE_MS    = 30 * 60 * 1000;
  const localActive = isScorerUnlocked();
  const myGames     = getMyGames();
  const hasLive = getTournamentGames().some(g => {
    const s = getLiveScore(g);
    if (!s || !s.gameState || s.gameState === 'pre' || s.gameState === 'final') return false;
    if (myGames.has(_gameRef(g)) || myGames.has(String(g.id)) || !s._remote) return localActive;
    return (Date.now() - (s._broadcastAt || 0)) < STALE_MS;
  });
  dot.classList.toggle('hidden', !hasLive);
  // Sync live-game indicator to native tab bar red dot (iOS only, no-op elsewhere)
  try { window.webkit?.messageHandlers?.tabSync?.postMessage({ hasLive }); } catch(_){}
}

function loadLiveScores() {
  try {
    state.liveScores = JSON.parse(localStorage.getItem(STORE.LIVE_SCORES) || '{}');
  } catch { state.liveScores = {}; }
}

// Returns (and migrates) the liveScore object for a game.
// Shape: { team, opp, clock, period, gameState, events[], quarterMins, halfMins, timeoutMins }
function getLiveScore(gameId) {
  const scopedKey = _scopedGameKey(gameId);
  const rawKey = _gameIdOnly(gameId);
  const scopedGroup = _contextGroupKey(gameId);
  const baseTiming = _getScopedClockSettings(gameId);
  const singleScopedTeam = getSelectedTeams().length <= 1;
  let key = scopedKey;
  if (!state.liveScores[key]) {
    const legacy = state.liveScores[rawKey];
    if (legacy && (!scopedGroup || legacy.ageGroup === scopedGroup || (!legacy.ageGroup && singleScopedTeam))) {
      state.liveScores[key] = { ...legacy, ageGroup: legacy.ageGroup || scopedGroup };
    }
  }
  if (!state.liveScores[key]) {
    state.liveScores[key] = {
      team: 0, opp: 0, clock: '', period: 0, gameState: 'pre', events: [],
      quarterMins: baseTiming.quarterMins,
      halfMins: baseTiming.halftimeMins,
      timeoutMins: baseTiming.timeoutLengths[0] ?? 1,
    };
  }
  const s = state.liveScores[key];
  // Migrate old goals[] format → events[]
  if (!s.events && s.goals) {
    s.events = s.goals.map(g => ({
      type: g.side === 'team' ? 'goal' : 'opp_goal',
      side: g.side, cap: g.cap || '', name: g.name || '',
      clock: '', period: 0, sixOnFive: false, ts: g.ts || Date.now(),
    }));
    delete s.goals;
  }
  if (!s.events)      s.events      = [];
  s.events.forEach((ev, idx) => _eventIdFor(ev, idx));
  if (!s.gameState)   s.gameState   = 'pre';
  if (s.period == null) s.period    = 0;
  const pristineTiming = !s.timingLocked
    || (
      (s.gameState === 'pre' || !s.gameState)
      && !s.timerPhase
      && !(s.timerSecondsLeft > 0)
      && !(Array.isArray(s.events) && s.events.length)
      && !(s.team > 0)
      && !(s.opp > 0)
    );
  if (pristineTiming) {
    s.quarterMins = baseTiming.quarterMins;
    s.halfMins = baseTiming.halftimeMins;
    s.timeoutMins = baseTiming.timeoutLengths[0] ?? 1;
    s.breakMins = baseTiming.breakMins;
    s.timeoutsPerTeam = baseTiming.timeoutsPerTeam;
    s.timeoutLengths = [...baseTiming.timeoutLengths];
    if (!s.timerRunning) s.timingLocked = false;
  } else {
    if (s.quarterMins == null) s.quarterMins = baseTiming.quarterMins;
    if (s.halfMins    == null) s.halfMins    = baseTiming.halftimeMins;
    if (s.timeoutMins == null) s.timeoutMins = baseTiming.timeoutLengths[0] ?? 1;
  }
  if (scopedGroup && !s.ageGroup) s.ageGroup = scopedGroup;
  return s;
}

function _setLiveScore(gameId, score) {
  const scopedKey = _scopedGameKey(gameId);
  state.liveScores[scopedKey] = {
    ...score,
    ageGroup: score?.ageGroup || _contextGroupKey(gameId),
  };
}

// ─── BOX SCORE EVENT RECORDING ────────────────────────────────────────────────

// Mapping from game-state key → period number
const PERIOD_FOR_STATE = { start: 0, q1: 1, q2: 2, half: 2, q3: 3, q4: 4, ot: 5, final: 4, shootout: 6 };
const TIMER_PHASE_FOR_STATE = { q1: 'q1', q2: 'q2', half: 'halftime', q3: 'q3', q4: 'q4' };
const PERIOD_LABELS    = { 0: 'Pre-Game', 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4', 5: 'OT', 6: 'Shootout' };
const HALF_PERIOD_LABELS = { 0: 'Pre-Game', 1: 'H1', 2: 'Half', 3: 'H2', 5: 'OT', 6: 'Shootout' };
function _getPeriodLabel(period, gameOrRef) {
  const cs = getClockSettings(gameOrRef);
  return ((cs.periodMode === 'halves' ? HALF_PERIOD_LABELS : PERIOD_LABELS)[period]) || `P${period}`;
}

// Log a game-state transition (Start, Q1, Q2, Half, Q3, Q4, OT, Final)
function setGameState(gameId, gstate) {
  const s = getLiveScore(gameId);
  s.gameState = gstate;
  const newPeriod = PERIOD_FOR_STATE[gstate];
  if (newPeriod != null) s.period = newPeriod;
  const mappedPhase = TIMER_PHASE_FOR_STATE[gstate];
  if (mappedPhase) s.timerPhase = mappedPhase;
  s.events.push({ type: 'game_state', gameState: gstate, clock: s.clock || '', period: s.period, ts: Date.now() });
  _setLiveScore(gameId, s);

  // Feedback: Auto-reset clock when moving to a quarter state
  const isQuarter = ['q1','q2','q3','q4','ot','shootout'].includes(gstate);
  if (isQuarter) {
    resetGameClock(gameId, mappedPhase || null, true);
  } else if (gstate === 'half') {
    resetGameClock(gameId, 'halftime');
  }

  afterScore(gameId);
}

// Toggle a game-state button — tap once to activate, tap again to revert to Pre-Game.
// Used for Start, Shootout, and End so accidental taps can always be reversed cleanly.
function toggleGameState(gameId, gstate) {
  const s = getLiveScore(gameId);
  if (s.gameState === gstate) {
    // Remove the most recent event for this key and drop back to pre-game
    const events = s.events || [];
    const revIdx = [...events].reverse().findIndex(e => e.type === 'game_state' && e.gameState === gstate);
    if (revIdx !== -1) events.splice(events.length - 1 - revIdx, 1);
    s.gameState    = 'pre';
    s.period       = 0;
    s.timerRunning = false; // stop clock ticker so LA/chip stops updating
    _setLiveScore(gameId, s);
    afterScore(gameId);
  } else {
    setGameState(gameId, gstate);
  }
}

// Resets the game back to Pre-Game state from any state (clears game_state events).
function resetToPreGame(gameId) {
  const previous = _cloneJsonSafe(getLiveScore(gameId));
  const s = getLiveScore(gameId);
  s.events       = (s.events || []).filter(e => e.type !== 'game_state');
  s.gameState    = 'pre';
  s.period       = 0;
  s.timerRunning = false; // stop clock ticker so LA/chip stops updating
  _setLiveScore(gameId, s);
  afterScore(gameId);
  showUndoToast('Game reset to pre-game', () => {
    if (!previous) return;
    _setLiveScore(gameId, previous);
    saveLiveScores();
    renderGamesList();
    renderNextGameCard();
    if (state.currentTab === 'scores') renderScoresTab();
  }, { timeoutMs: 4000 });
}

// Keep old name as alias
function toggleGameStart(gameId) { toggleGameState(gameId, 'start'); }

// Update the running clock display (no re-render — called on every keystroke)
function setGameClock(gameId, val) {
  const s = getLiveScore(gameId);
  s.clock = val;
  _setLiveScore(gameId, s);
  saveLiveScores();
}

// Update game timing settings (quarterMins / halfMins / timeoutMins)
function setGameTiming(gameId, field, val) {
  const s = getLiveScore(gameId);
  const n = parseFloat(val);
  if (!isNaN(n) && n >= 0) s[field] = n;
  s.timingLocked = true;
  _setLiveScore(gameId, s);
  saveLiveScores();
}

// Record any event with a player (goal, assist, exclusion, brutality)
function recordEventForPlayer(gameId, eventType, cap, name, extra = false) {
  const s          = getLiveScore(gameId);
  const inShootout = s.gameState === 'shootout';
  const isGoal     = eventType === 'goal';
  const isOppGoal  = eventType === 'opp_goal';
  const opts = (extra && typeof extra === 'object') ? extra : { sixOnFive: !!extra };
  // In shootout mode goals become SO goals (decimal scoring)
  const actualType = (inShootout && isGoal)    ? 'so_goal'
                   : (inShootout && isOppGoal) ? 'opp_so_goal'
                   : eventType;
  const ev = {
    type: actualType, side: (actualType === 'opp_so_goal' || isOppGoal) ? 'opp' : 'team',
    cap: cap || '', name: name || '',
    clock: _pendingClock || s.clock || '', period: s.period || 0,
    sixOnFive: (isGoal && opts.sixOnFive && !inShootout) ? true : false,
    counter: actualType === 'goal' ? !!opts.counter : false,
    forcedBallUnder: actualType === 'steal' ? !!opts.forcedBallUnder : false,
    inside2m: actualType === 'turnover' ? !!opts.inside2m : false,
    sprintWon: actualType === 'sprint_won',
    ts: Date.now(),
  };
  _pendingClock = '';
  const isTeamGoal = actualType === 'goal' || actualType === 'goal_5m' || actualType === 'so_goal';
  if (actualType === 'goal')        s.team++;
  if (actualType === 'goal_5m')     s.team++;
  if (actualType === 'so_goal')     s.team = Math.round((s.team + 0.1) * 10) / 10;
  if (actualType === 'opp_goal')    s.opp++;
  if (actualType === 'opp_so_goal') s.opp  = Math.round((s.opp  + 0.1) * 10) / 10;
  s.events.push(ev);
  _setLiveScore(gameId, s);
  if (isTeamGoal) _hapticGoal(); // celebrate! 🎉
  afterScore(gameId);
}

// Record a direct (no-player) event: opp_goal, timeout, opp_timeout, opp_exclusion
// Always uses auto-clock — no manual prompt needed.
function recordEventDirect(gameId, eventType) {
  _pendingClock = getCurrentClockStr(gameId);
  _doRecordDirect(gameId, eventType);
}

// Internal — records immediately using _pendingClock (no prompt).
function _doRecordDirect(gameId, eventType) {
  const s          = getLiveScore(gameId);
  const inShootout = s.gameState === 'shootout';
  const actualType = (inShootout && eventType === 'opp_goal') ? 'opp_so_goal' : eventType;
  const isOppSide  = actualType.startsWith('opp');
  const ev = {
    type: actualType, side: isOppSide ? 'opp' : 'team',
    cap: '', name: '', clock: _pendingClock || s.clock || '', period: s.period || 0,
    sixOnFive: false, ts: Date.now(),
  };
  _pendingClock = '';
  if (actualType === 'opp_goal')    s.opp++;
  if (actualType === 'opp_goal_5m') s.opp++;
  if (actualType === 'opp_so_goal') s.opp = Math.round((s.opp + 0.1) * 10) / 10;
  s.events.push(ev);
  _setLiveScore(gameId, s);
  afterScore(gameId);
}

// Recompute team + opp scores from event list (handles regular goals and SO goals)
function recomputeScores(events) {
  let team = 0, opp = 0;
  for (const e of events) {
    if (e.type === 'goal')        team++;
    if (e.type === 'goal_5m')     team++;
    if (e.type === 'so_goal')     team = Math.round((team + 0.1) * 10) / 10;
    if (e.type === 'opp_goal')    opp++;
    if (e.type === 'opp_goal_5m') opp++;
    if (e.type === 'opp_so_goal') opp  = Math.round((opp  + 0.1) * 10) / 10;
  }
  return { team, opp };
}

function _eventIdFor(ev, idx = 0) {
  if (!ev) return '';
  if (!ev.id) {
    const baseTs = ev.ts || Date.now();
    ev.id = `ev_${baseTs}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
  }
  return ev.id;
}

/** Fire a heavy haptic (iOS Taptic Engine) or a double-pulse vibration (Android/web)
 *  when our team scores a goal — gives parents watching live a physical jolt of joy. */
function _hapticGoal() {
  try {
    const Haptics = window.Capacitor?.Plugins?.Haptics;
    if (Haptics) { Haptics.impact({ style: 'heavy' }).catch(() => {}); return; }
  } catch {}
  try { navigator.vibrate?.([80, 40, 80]); } catch {} // double-pulse fallback
}

// Remove the last event (smart undo — recomputes scores)
function undoLastEvent(gameId) {
  const s = getLiveScore(gameId);
  // Backward compat: old goals[] format
  if (!s.events && s.goals?.length) {
    const last = s.goals.pop();
    if (last.side === 'team') s.team = Math.max(0, s.team - 1);
    else s.opp = Math.max(0, s.opp - 1);
    _setLiveScore(gameId, s);
    afterScore(gameId); return;
  }
  if (!s.events?.length) return;
  const last = s.events.pop();
  // Revert game state if needed
  if (last.type === 'game_state') {
    const prev = [...s.events].reverse().find(e => e.type === 'game_state');
    s.gameState = prev?.gameState || 'pre';
    s.period    = PERIOD_FOR_STATE[s.gameState] ?? 0;
  }
  // Recompute scores from remaining events (includes SO goals)
  const recomputed = recomputeScores(s.events);
  s.team = recomputed.team;
  s.opp  = recomputed.opp;
  _setLiveScore(gameId, s);
  afterScore(gameId);
}

// Backward-compat shims
function scoreGoal(gameId, side, cap, name) {
  if (side === 'team') recordEventForPlayer(gameId, 'goal', cap, name, false);
  else recordEventDirect(gameId, 'opp_goal');
}
function undoLastGoal(gameId) { undoLastEvent(gameId); }

// ─── BOX SCORE RENDERING ──────────────────────────────────────────────────────

// Build the event log HTML, grouped by period
function buildEventLog(events, currentPeriod = 0, gameId = null) {
  const nonState = events.filter(e => e.type !== 'game_state');
  if (!nonState.length) return '';

  // Group by period
  const groups = {};
  for (const ev of nonState) {
    const p = ev.period ?? 0;
    if (!groups[p]) groups[p] = [];
    groups[p].push(ev);
  }

  const WP_BALL = '<span class="wp-ball">🏐</span>';
  const TYPE_ICONS = { goal:WP_BALL, opp_goal:WP_BALL, goal_5m:WP_BALL, opp_goal_5m:WP_BALL, shot_miss:'❌', opp_shot_miss:'❌', miss_5m:'❌', opp_miss_5m:'❌', so_goal:WP_BALL, opp_so_goal:WP_BALL, so_miss:'❌', opp_so_miss:'❌', assist:'🤝', steal:'🧤', turnover:'↩️', sprint_won:'⚡', opp_sprint_won:'⚡', exclusion:'❌', opp_exclusion:'❌', brutality:'🟥', timeout:'⏱', opp_timeout:'⏱', save:'🧤', block:'🧤' };
  const TYPE_LABEL = {
    goal:          ev => ev.counter ? 'GOAL (Counter)' : (ev.sixOnFive ? appT('event_goal_6v5') : appT('event_goal')),
    opp_goal:      ()  => appT('event_goal'),
    goal_5m:       ()  => appT('event_goal_5m'),
    opp_goal_5m:   ()  => appT('event_goal_5m'),
    shot_miss:     ()  => appT('event_shot_attempt'),
    opp_shot_miss: ()  => appT('event_shot_attempt'),
    miss_5m:       ()  => appT('event_attempt_5m'),
    opp_miss_5m:   ()  => appT('event_attempt_5m'),
    so_goal:       ()  => appT('event_so_goal'),
    opp_so_goal:   ()  => appT('event_so_goal'),
    so_miss:       ()  => appT('event_so_miss'),
    opp_so_miss:   ()  => appT('event_so_miss'),
    assist:        ()  => appT('event_assist'),
    steal:         ev  => ev.forcedBallUnder ? appT('event_steal_fbu') : appT('event_steal'),
    turnover:      ev  => ev.inside2m ? 'TURNOVER (Inside 2m)' : appT('event_turnover'),
    sprint_won:    ()  => appT('event_sprint_won'),
    opp_sprint_won:()  => appT('event_opp_sprint_won'),
    opp_steal:     ()  => appT('event_opp_steal'),
    exclusion:     ()  => appT('event_excl'),
    opp_exclusion: ()  => appT('event_excl'),
    brutality:     ()  => appT('event_brutal'),
    timeout:       ()  => appT('event_timeout'),
    opp_timeout:   ()  => appT('event_opp_timeout'),
    save:          ()  => appT('event_save'),
    block:         ()  => appT('event_save'),
    field_block:   ()  => appT('event_field_block'),
  };

  let html = '<div class="event-log">';
  const sortedPeriods = Object.entries(groups).sort((a,b) => Number(b[0]) - Number(a[0]));
  const currentP = currentPeriod;

  for (const [period, evs] of sortedPeriods) {
    const label = _getPeriodLabel(parseInt(period), gameId);
    const pKey  = `${currentP}_p${period}`; // Unique key to check manual toggle
    const manuallyOpened = state.logQuartersOpened && state.logQuartersOpened[pKey];
    const isOpen = parseInt(period) === currentP || sortedPeriods.length === 1 || manuallyOpened;
    
    html += `<details class="event-log-qtr" ${isOpen?'open':''} ontoggle="onQuarterToggle(this, '${period}')">
      <summary class="event-period-header">${escHtml(label)}</summary>`;
    const sortedEvents = [...evs].sort((a, b) => {
      if ((a.ts || 0) !== (b.ts || 0)) return (b.ts || 0) - (a.ts || 0);
      const aClock = _clockSortValue(a.clock);
      const bClock = _clockSortValue(b.clock);
      if (aClock !== bClock) return aClock - bClock;
      return String(a.type || '').localeCompare(String(b.type || ''));
    });
    for (const ev of sortedEvents) {
      const isTeam    = ev.side === 'team';
      const icon      = TYPE_ICONS[ev.type] || '·';
      const typeLabel = (TYPE_LABEL[ev.type] || (() => ev.type))(ev);
      const playerName = ev.cap
        ? `${ev.cap}. ${ev.name || '(No Name Provided)'}`
        : (ev.name || (isTeam ? appT('event_team_fallback') : appT('event_opp_fallback')));
      const teamName = isTeam
        ? _teamDisplayNameForGame(gameId, TOURNAMENT.clubName || appT('scorer_team_label'))
        : normalizeOpponentName(_findGameByRef(gameId)?.opponent || 'Opp');
      const eventId = _eventIdFor(ev);
      const rowKey = `${String(gameId).replace(/[^a-zA-Z0-9_-]/g, '_')}__${eventId}`;
      const deleteAction = isScorerUnlockedForTournament(TOURNAMENT)
        ? `<button class="event-delete-btn" onclick="event.stopPropagation();deletePlayByPlayEvent(${JSON.stringify(_gameRef(gameId))},${JSON.stringify(eventId)})">Delete</button>`
        : '';
      html += `<div class="event-swipe-row" id="event-row-${rowKey}" ontouchstart="startEventSwipe(event,${JSON.stringify(rowKey)})" ontouchend="endEventSwipe(event,${JSON.stringify(rowKey)})">
        ${deleteAction}
        <div class="event-row event-${isTeam?'team':'opp'}" onclick="maybeCloseEventSwipe(${JSON.stringify(rowKey)})">
        <div class="event-main">
          <span class="event-type">${escHtml(typeLabel)}</span>
          <span class="event-team-name">${escHtml(teamName)}</span>
        </div>
        <div class="event-sub">
          <span class="event-clock">${escHtml(ev.clock||'—')}</span>
          <span class="event-player">${escHtml(playerName)}</span>
        </div>
        </div>
      </div>`;
    }
    html += `</details>`;
  }
  html += '</div>';
  return html;
}

function _clockSortValue(clock) {
  const match = String(clock || '').match(/^(\d+):(\d{2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return (parseInt(match[1], 10) * 60) + parseInt(match[2], 10);
}

let _eventSwipeStart = null;

function _closeAllEventSwipeRows(exceptKey = '') {
  document.querySelectorAll('.event-swipe-row.swiped').forEach(row => {
    if (exceptKey && row.id === `event-row-${exceptKey}`) return;
    row.classList.remove('swiped');
  });
}

function startEventSwipe(evt, rowKey) {
  const touch = evt.touches?.[0];
  if (!touch) return;
  _eventSwipeStart = { rowKey, x: touch.clientX, y: touch.clientY };
}

function endEventSwipe(evt, rowKey) {
  const touch = evt.changedTouches?.[0];
  if (!_eventSwipeStart || _eventSwipeStart.rowKey !== rowKey || !touch) return;
  const dx = touch.clientX - _eventSwipeStart.x;
  const dy = touch.clientY - _eventSwipeStart.y;
  _eventSwipeStart = null;
  if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
  const row = document.getElementById(`event-row-${rowKey}`);
  if (!row) return;
  if (dx > 0) {
    _closeAllEventSwipeRows(rowKey);
    row.classList.add('swiped');
  } else {
    row.classList.remove('swiped');
  }
}

function maybeCloseEventSwipe(rowKey) {
  const row = document.getElementById(`event-row-${rowKey}`);
  if (row?.classList.contains('swiped')) row.classList.remove('swiped');
}

function deletePlayByPlayEvent(gameId, eventId) {
  const s = getLiveScore(gameId);
  if (!Array.isArray(s.events) || !s.events.length) return;
  const idx = s.events.findIndex((ev, i) => _eventIdFor(ev, i) === eventId);
  if (idx === -1) return;
  const removed = s.events[idx];
  s.events.splice(idx, 1);
  if (removed?.type === 'game_state') {
    const prev = [...s.events].reverse().find(e => e.type === 'game_state');
    s.gameState = prev?.gameState || 'pre';
    s.period = PERIOD_FOR_STATE[s.gameState] ?? 0;
  }
  const recomputed = recomputeScores(s.events);
  s.team = recomputed.team;
  s.opp = recomputed.opp;
  _setLiveScore(gameId, s);
  afterScore(gameId);
  showToast('Event deleted', 'ok');
}

function _isTeamGoalType(type) {
  return ['goal', 'goal_5m', 'so_goal'].includes(type);
}

function _isOppGoalType(type) {
  return ['opp_goal', 'opp_goal_5m', 'opp_so_goal'].includes(type);
}

function _buildScoreDetailSummary(game, score, ageGroupLabel = '', extraActionHtml = '') {
  const events = (score.events || []).filter(e => e.type !== 'game_state');
  const teamName = _teamDisplayNameForGame(game, TOURNAMENT.clubName || appT('scorer_team_label'));
  const oppName = normalizeOpponentName(game.opponent || 'Opp');
  const periodBaseLabel = score.gameState === 'final'
    ? 'Final'
    : (PERIOD_LABELS[score.period] || (isGameLive(_gameRef(game)) ? 'Live' : 'Scheduled'));
  const statusLabel = score.clock && score.gameState && score.gameState !== 'pre' && score.gameState !== 'final'
    ? `${periodBaseLabel} · ${score.clock}`
    : periodBaseLabel;
  const periodsSeen = new Set([1, 2, 3, 4]);
  const periodScores = {};
  const teamStats = { saves: 0, powerGoals: 0, powerOpps: 0, penGoals: 0, penAttempts: 0, sprints: 0, steals: 0, blocks: 0 };
  const oppStats  = { saves: 0, powerGoals: 0, powerOpps: 0, penGoals: 0, penAttempts: 0, sprints: 0, steals: 0, blocks: 0 };
  const teamPlayers = {};
  const oppPlayers = {};

  for (const ev of events) {
    const period = Number(ev.period || 0);
    if (period > 0) periodsSeen.add(period);
    if (!periodScores[period]) periodScores[period] = { team: 0, opp: 0 };
    if (_isTeamGoalType(ev.type)) periodScores[period].team++;
    if (_isOppGoalType(ev.type)) periodScores[period].opp++;

    const targetStats = ev.side === 'team' ? teamStats : oppStats;
    const playerKey = ev.cap || ev.name || '_unknown';
    const playerMap = ev.side === 'team' ? teamPlayers : oppPlayers;
    if (!playerMap[playerKey]) playerMap[playerKey] = { name: ev.name || '(No Name Provided)', cap: ev.cap || '', goals: 0, assists: 0, steals: 0, saves: 0, blocks: 0, exclusions: 0 };
    const player = playerMap[playerKey];

    if (ev.type === 'save') { targetStats.saves++; player.saves++; }
    if (ev.type === 'block' || ev.type === 'field_block') { targetStats.blocks++; player.blocks++; }
    if (ev.type === 'steal' || ev.type === 'opp_steal') { targetStats.steals++; player.steals++; }
    if (ev.type === 'sprint_won') targetStats.sprints++;
    if (ev.type === 'opp_sprint_won') oppStats.sprints++;
    if (ev.type === 'earned_excl') teamStats.powerOpps++;
    if (ev.type === 'opp_exclusion') oppStats.powerOpps++;
    if (ev.type === 'goal' && ev.sixOnFive) teamStats.powerGoals++;
    if (ev.type === 'opp_goal' && ev.sixOnFive) oppStats.powerGoals++;
    if (ev.type === 'goal_5m') { teamStats.penGoals++; teamStats.penAttempts++; }
    if (ev.type === 'miss_5m') teamStats.penAttempts++;
    if (ev.type === 'opp_goal_5m') { oppStats.penGoals++; oppStats.penAttempts++; }
    if (ev.type === 'opp_miss_5m') oppStats.penAttempts++;
    if (ev.type === 'goal' || ev.type === 'goal_5m' || ev.type === 'so_goal') player.goals++;
    if (ev.type === 'assist') player.assists++;
    if (ev.type === 'exclusion' || ev.type === 'brutality') player.exclusions++;
    if (ev.type === 'opp_exclusion') {
      const oppPlayer = oppPlayers[playerKey] || (oppPlayers[playerKey] = { name: ev.name || '(No Name Provided)', cap: ev.cap || '', goals: 0, assists: 0, steals: 0, saves: 0, blocks: 0, exclusions: 0 });
      oppPlayer.exclusions++;
    }
  }

  const periodColumns = [...periodsSeen]
    .filter(p => p > 0)
    .sort((a, b) => a - b)
    .map(p => ({
      key: p,
      label: p <= 4 ? `Q${p}` : (p === 5 ? 'OT' : `P${p}`),
      team: periodScores[p]?.team || 0,
      opp: periodScores[p]?.opp || 0,
    }));

  const buildLeaderRows = (players, kind) => Object.values(players)
    .sort((a, b) => {
      const aVal = kind === 'off' ? (a.goals * 3 + a.assists) : (a.steals * 2 + a.blocks + a.saves);
      const bVal = kind === 'off' ? (b.goals * 3 + b.assists) : (b.steals * 2 + b.blocks + b.saves);
      return bVal - aVal || b.goals - a.goals || a.name.localeCompare(b.name);
    })
    .slice(0, 3);

  const teamOff = buildLeaderRows(teamPlayers, 'off');
  const teamDef = buildLeaderRows(teamPlayers, 'def');
  const hasTeamStatEvents = events.some(ev => ev.side === 'team');
  const showScoringTable = score.gameState !== 'pre' || events.length > 0 || Number(score.team || 0) > 0 || Number(score.opp || 0) > 0;
  const showStatBreakdown = showScoringTable && hasTeamStatEvents;

  const saveRatioTeam = `${teamStats.saves}/${teamStats.saves + (score.opp || 0)}`;
  const powerPlayTeam = `${teamStats.powerGoals}/${teamStats.powerOpps}`;
  const pensTeam = `${teamStats.penGoals}/${teamStats.penAttempts}`;
  const scoringGridCols = `minmax(140px, 1.6fr) repeat(${periodColumns.length + 1}, minmax(32px, 0.5fr))`;

  const statValue = (made, attempts = null) => {
    if (attempts == null) return Number(made || 0);
    if (!attempts) return 0;
    return Number(made || 0) / Number(attempts || 1);
  };

  const statRow = (label, rawValue, displayValue) => {
    let pct = 0;
    if (label === 'Scoring' || label === 'Sprints Won' || label === 'Saves') {
      pct = Math.min(100, Number(rawValue || 0) * 10);
    } else {
      pct = Math.min(100, Number(rawValue || 0) * 100);
    }
    return `<div class="score-detail-compare-row team-only">
      <div class="score-detail-compare-head team-only">
        <span>${escHtml(label)}</span>
        <span>${escHtml(displayValue)}</span>
      </div>
      <div class="score-detail-compare-bars team-only">
        <span class="score-detail-bar score-detail-bar-left"><span style="width:${pct}%"></span></span>
      </div>
    </div>`;
  };

  const leaderSection = (title, rows, formatter) => `
    <div class="score-detail-leaders team-only">
      <div class="score-detail-section-title">${escHtml(title)}</div>
      <div class="score-detail-leader-grid team-only">
        <div>${rows.map(r => `<div class="score-detail-leader-row"><strong>${escHtml(r.name)}</strong><span>${escHtml(formatter(r))}</span></div>`).join('') || '<div class="score-detail-leader-row muted">—</div>'}</div>
      </div>
    </div>`;

  return `
    <div class="score-detail-summary card tab-card">
      <div class="score-detail-summary-meta">
        <div>
          <div class="score-detail-summary-kicker">${escHtml(ageGroupLabel || TOURNAMENT.name || 'Match Details')}</div>
          <div class="score-detail-summary-status">${escHtml(statusLabel)}</div>
        </div>
        <div class="score-detail-summary-head-actions">
          ${game.gameNum ? `<div class="scores-detail-game-num">${escHtml(game.gameNum)}</div>` : ''}
          ${extraActionHtml || ''}
        </div>
      </div>
      <div class="score-detail-summary-info">
        <div><strong>Time</strong><span>${escHtml(game.date || formatDateGroupLabel(game.dateISO) || '')}${game.time ? ` ${escHtml(game.time)}` : ''}</span></div>
        <div><strong>Location</strong><span>${TOURNAMENT.location ? buildLocationLink(TOURNAMENT.location) : 'TBD'}</span></div>
      </div>
      <div class="score-detail-summary-scoreline">
        <div class="team-block"><div class="team-name">${escHtml(teamName)}</div><div class="team-score">${Number.isInteger(score.team) ? score.team : Number(score.team || 0).toFixed(1)}</div></div>
        <div class="score-sep">-</div>
        <div class="team-block"><div class="team-name">${escHtml(oppName)}</div><div class="team-score">${Number.isInteger(score.opp) ? score.opp : Number(score.opp || 0).toFixed(1)}</div></div>
      </div>
      ${showScoringTable ? `<div class="score-detail-scoring-table">
        <div class="score-detail-scoring-head">Scoring</div>
        <div class="score-detail-scoring-row head" style="grid-template-columns:${scoringGridCols}">
          <span></span>
          ${periodColumns.map(col => `<span>${escHtml(col.label)}</span>`).join('')}
          <span>Total</span>
        </div>
        <div class="score-detail-scoring-row" style="grid-template-columns:${scoringGridCols}">
          <span>${escHtml(teamName)}</span>
          ${periodColumns.map(col => `<span>${col.team}</span>`).join('')}
          <span>${Number.isInteger(score.team) ? score.team : Number(score.team || 0).toFixed(1)}</span>
        </div>
        <div class="score-detail-scoring-row" style="grid-template-columns:${scoringGridCols}">
          <span>${escHtml(oppName)}</span>
          ${periodColumns.map(col => `<span>${col.opp}</span>`).join('')}
          <span>${Number.isInteger(score.opp) ? score.opp : Number(score.opp || 0).toFixed(1)}</span>
        </div>
      </div>` : ''}
      ${showStatBreakdown ? `<div class="score-detail-compare team-only">
        ${statRow('Scoring', Number(score.team || 0), String(score.team || 0))}
        ${statRow('Save Ratio', statValue(teamStats.saves, teamStats.saves + (score.opp || 0)), saveRatioTeam)}
        ${statRow('Power Plays', statValue(teamStats.powerGoals, teamStats.powerOpps), powerPlayTeam)}
        ${statRow('Penalties', statValue(teamStats.penGoals, teamStats.penAttempts), pensTeam)}
        ${statRow('Sprints Won', teamStats.sprints, String(teamStats.sprints))}
        ${statRow('Saves', teamStats.saves, String(teamStats.saves))}
      </div>` : ''}
      ${showStatBreakdown ? leaderSection('Offensive Leaders', teamOff, r => `${r.goals}G${r.assists ? ` · ${r.assists}A` : ''}`) : ''}
      ${showStatBreakdown ? leaderSection('Defensive Leaders', teamDef, r => `${r.steals} STL${(r.blocks + r.saves) ? ` · ${r.blocks + r.saves} DEF` : ''}`) : ''}
    </div>`;
}

function _buildScoreDetailScorerPanel(game, s) {
  const gid = escHtml(_gameRef(game));
  const teamDisplayName = _teamDisplayNameForGame(game, TOURNAMENT.clubName || appT('scorer_team_label'));
  const cs = getClockSettings(gid);
  const _isHalves = cs.periodMode === 'halves';
  const GS_OPTS = _isHalves ? [
    { key:'start', label:'▶ Start' },
    { key:'q1', label:'H1' },
    { key:'half', label:'½ Time' },
    { key:'q3', label:'H2' },
    { key:'shootout', label:'🎯 SO' },
    { key:'final', label:'🏁 End' },
  ] : [
    { key:'start', label:'▶ Start' },
    { key:'q1', label:'Q1' },
    { key:'q2', label:'Q2' },
    { key:'half', label:'½ Time' },
    { key:'q3', label:'Q3' },
    { key:'q4', label:'Q4' },
    { key:'shootout', label:'🎯 SO' },
    { key:'final', label:'🏁 End' },
  ];
  const TOGGLE_KEYS = new Set(['start', 'shootout', 'final']);
  const preBtn = (s.gameState && s.gameState !== 'pre')
    ? `<button class="gs-btn gs-btn-pre" onclick="resetToPreGame('${gid}')" title="Reset to Pre-Game">↩ Pre</button>`
    : '';
  const gsBar = preBtn + GS_OPTS.map(o => {
    const active = s.gameState === o.key ? ' gs-active' : '';
    let handler;
    if (o.key === 'start') handler = `startScoring('${gid}')`;
    else if (TOGGLE_KEYS.has(o.key)) handler = `toggleGameState('${gid}','${o.key}')`;
    else handler = `setGameState('${gid}','${o.key}')`;
    return `<button class="gs-btn${active}" onclick="${handler}">${o.label}</button>`;
  }).join('');
  const timerSecsLeft = (() => {
    if (s.timerRunning && s.timerStartedAt) {
      const elapsed = (Date.now() - s.timerStartedAt) / 1000;
      return Math.max(0, (s.timerSecondsLeft || 0) - elapsed);
    }
    return s.timerSecondsLeft || 0;
  })();
  const phaseLabel = (() => {
    if (s.timerPhase) return _phaseLabel(s.timerPhase);
    if (s.gameState && s.gameState !== 'pre') return s.gameState.toUpperCase();
    return '';
  })();
  const isBreakPhase = s.timerPhase === 'break12' || s.timerPhase === 'break34' || s.timerPhase === 'halftime';
  const teamTOUsed = s.teamTimeoutsUsed || [];
  const oppTOUsed  = s.oppTimeoutsUsed || [];
  const timingRow = `
    <div class="auto-clock-wrap">
      <div class="auto-clock-phase">${phaseLabel}</div>
      <div class="auto-clock-time" id="game-clock-${gid}">${fmtClock(timerSecsLeft)}</div>
      <div class="auto-clock-controls">
        ${isBreakPhase ? `<span class="auto-clock-break-label">${s.timerPhase === 'halftime' ? escHtml(appT('scorer_halftime_break')) : escHtml(appT('scorer_quarter_break'))} — ${escHtml(appT('scorer_next_quarter_ready'))}</span>` : `
          ${s.timerRunning
            ? `<button class="auto-clock-btn auto-clock-pause" onclick="pauseGameTimer('${gid}')">⏸ ${escHtml(appT('scorer_pause'))}</button>`
            : `<button class="auto-clock-btn auto-clock-resume" onclick="${s.gameState === 'pre' ? `startScoring('${gid}')` : `resumeGameTimer('${gid}')`}">▶ ${escHtml(s.gameState === 'pre' ? appT('scorer_start') : appT('scorer_resume'))}</button>`
          }
          <button class="auto-clock-btn auto-clock-reset" onclick="resetGameClock('${gid}')">↺ ${escHtml(appT('scorer_reset'))}</button>
        `}
      </div>
      ${cs.timeoutsPerTeam > 0 ? `
      <div class="auto-clock-to-row">
        ${(cs.timeoutLengths||[]).map(m => {
          const used = teamTOUsed.includes(m);
          return `<span class="auto-clock-to-chip${used?' auto-clock-to-used':''}">${used?'✓':'◉'} ${fmtTOLabel(m)}</span>`;
        }).join('')}
        <span class="auto-clock-to-sep">·</span>
        ${(cs.timeoutLengths||[]).map(m => {
          const used = oppTOUsed.includes(m);
          return `<span class="auto-clock-to-chip auto-clock-to-opp${used?' auto-clock-to-used':''}">${used?'✓':'◉'} Opp ${fmtTOLabel(m)}</span>`;
        }).join('')}
      </div>` : ''}
    </div>`;
  return `
    <div class="score-detail-scorer card tab-card">
      <div class="score-detail-section-title">Scoring Controls</div>
      <div class="scoring-section score-detail-scoring-section">
        <div class="gs-bar">${gsBar}</div>
        ${timingRow}
        <div class="live-scoreboard">
          <div class="ls-team">
            <span class="ls-label">${escHtml(teamDisplayName)}</span>
            <span class="ls-score ls-score-team">${Number.isInteger(s.team) ? s.team : s.team.toFixed(1)}</span>
          </div>
          <span class="ls-sep">—</span>
          <div class="ls-team ls-team-opp">
            <span class="ls-label">${escHtml(normalizeOpponentName(game.opponent || 'Opp'))}</span>
            <span class="ls-score ls-score-opp">${Number.isInteger(s.opp) ? s.opp : s.opp.toFixed(1)}</span>
          </div>
        </div>
        <div class="ls-actions-row">
          <button class="ls-undo-btn" onclick="undoLastEvent('${gid}')">↩ ${escHtml(appT('scorer_undo'))}</button>
          <button class="ls-share-btn" onclick="shareBoxScore('${gid}')">📤 ${escHtml(appT('scorer_share_box_score'))}</button>
        </div>
        ${s.gameState === 'shootout' ? `
        <div style="background:#fef3c7;border:1.5px solid #f59e0b;border-radius:8px;padding:6px 10px;margin-bottom:6px;text-align:center">
          <span style="font-weight:700;color:#92400e">🎯 ${escHtml(appT('scorer_shootout_mode'))}</span>
          <span style="color:#78350f;font-size:0.8rem;display:block;margin-top:2px">${escHtml(appT('scorer_shootout_hint'))}</span>
        </div>` : ''}
        <div class="score-btns-row">
          <button class="score-btn score-btn-team" onclick="openEventPicker('${gid}','goal')">${s.gameState === 'shootout' ? `🎯 ${escHtml(appT('scorer_team_so_goal'))}` : `+ ${escHtml(appT('scorer_goal'))}`}</button>
          <button class="score-btn score-btn-opp" onclick="recordEventDirect('${gid}','opp_goal')">${s.gameState === 'shootout' ? `🎯 ${escHtml(appT('scorer_opp_so_goal'))}` : `+ ${escHtml(appT('scorer_opp_goal'))}`}</button>
        </div>
        ${s.gameState === 'shootout' ? `
        <div class="score-btns-row" style="margin-top:4px">
          <button class="score-btn" style="background:#fff1f2;color:#be123c;border-color:#fda4af" onclick="openEventPicker('${gid}','so_miss')">❌ ${escHtml(appT('scorer_team_so_miss'))}</button>
          <button class="score-btn" style="background:#fff1f2;color:#be123c;border-color:#fda4af" onclick="recordEventDirect('${gid}','opp_so_miss')">❌ ${escHtml(appT('scorer_opp_so_miss'))}</button>
        </div>` : ''}
        <div class="stat-btns-row">
          <button class="stat-btn stat-assist" onclick="openEventPicker('${gid}','assist')">${escHtml(appT('scorer_assist'))}</button>
          <button class="stat-btn stat-steal" onclick="openEventPicker('${gid}','steal')">${escHtml(appT('scorer_steal'))}</button>
          <button class="stat-btn stat-sprint" onclick="openEventPicker('${gid}','sprint_won')">${escHtml(appT('scorer_sprint_won'))}</button>
          <button class="stat-btn stat-field-block" onclick="openEventPicker('${gid}','field_block')">${escHtml(appT('scorer_field_block'))}</button>
          <button class="stat-btn stat-attempt" onclick="openEventPicker('${gid}','shot_miss')">${escHtml(appT('scorer_attempt'))}</button>
        </div>
        <div class="stat-btns-row">
          <button class="stat-btn stat-turnover" onclick="openEventPicker('${gid}','turnover')">${escHtml(appT('scorer_turnover'))}</button>
          <button class="stat-btn stat-exclusion" onclick="openEventPicker('${gid}','exclusion')">${escHtml(appT('scorer_excl'))}</button>
          <button class="stat-btn stat-earned-excl" onclick="openEventPicker('${gid}','earned_excl')">${escHtml(appT('scorer_earned_excl'))}</button>
          <button class="stat-btn stat-opp-steal" onclick="recordEventDirect('${gid}','opp_steal')">${escHtml(appT('scorer_opp_steal'))}</button>
          <button class="stat-btn stat-opp-attempt" onclick="recordEventDirect('${gid}','opp_shot_miss')">${escHtml(appT('scorer_opp_attempt'))}</button>
          <button class="stat-btn stat-opp-excl" onclick="recordEventDirect('${gid}','opp_exclusion')">${escHtml(appT('scorer_opp_excl'))}</button>
        </div>
        ${s.gameState !== 'shootout' ? `
        <div class="stat-btns-row">
          <button class="stat-btn stat-goal-5m" onclick="openEventPicker('${gid}','goal_5m')">🎯 ${escHtml(appT('scorer_5m'))}</button>
          <button class="stat-btn stat-attempt-5m" onclick="openEventPicker('${gid}','miss_5m')">❌ ${escHtml(appT('scorer_5m_attempt'))}</button>
          <button class="stat-btn stat-goal-5m" onclick="recordEventDirect('${gid}','opp_goal_5m')">🎯 ${escHtml(appT('scorer_opp_5m'))}</button>
          <button class="stat-btn stat-attempt-5m" onclick="recordEventDirect('${gid}','opp_miss_5m')">❌ ${escHtml(appT('scorer_opp_5m_attempt'))}</button>
        </div>` : ''}
        <div class="stat-btns-row">
          <button class="stat-btn stat-save" onclick="openEventPicker('${gid}','save')">🧤 ${escHtml(appT('scorer_gk_save'))}</button>
        </div>
      </div>
    </div>`;
}

// Build the box score summary table HTML
function buildBoxScoreHtml(events, oppName) {
  const nonState = events.filter(e => e.type !== 'game_state');
  if (!nonState.length) return '';

  const playerMap   = {};
  let teamTimeouts  = 0;

  for (const ev of nonState) {
    if (ev.type === 'timeout')    { teamTimeouts++; continue; }
    if (ev.side !== 'team')       continue;
    const key = ev.cap || ev.name || '_unknown';
    if (!playerMap[key]) playerMap[key] = { cap: ev.cap||'', name: ev.name||'', G:0, SM:0, G5:0, M5:0, SOG:0, SOM:0, A:0, Stl:0, SW:0, FBU:0, FB:0, Excl:0, EE:0, Sv:0 };
    if (ev.type === 'goal')                              playerMap[key].G++;
    if (ev.type === 'shot_miss')                         playerMap[key].SM++;
    if (ev.type === 'goal_5m')                           playerMap[key].G5++;
    if (ev.type === 'miss_5m')                           playerMap[key].M5++;
    if (ev.type === 'so_goal')                           playerMap[key].SOG++;
    if (ev.type === 'so_miss')                           playerMap[key].SOM++;
    if (ev.type === 'assist')                            playerMap[key].A++;
    if (ev.type === 'steal')                             { playerMap[key].Stl++; if (ev.forcedBallUnder) playerMap[key].FBU++; }
    if (ev.type === 'sprint_won')                        playerMap[key].SW++;
    if (ev.type === 'field_block')                       playerMap[key].FB++;
    if (ev.type === 'exclusion' || ev.type === 'brutality') playerMap[key].Excl++;
    if (ev.type === 'earned_excl')                       playerMap[key].EE++;
    if (ev.type === 'save' || ev.type === 'block')       playerMap[key].Sv++;
  }

  const players = Object.values(playerMap)
    .sort((a,b) => parseInt(a.cap||'999',10) - parseInt(b.cap||'999',10));

  if (!players.length && !teamTimeouts) return '';

  // Split field players from goalkeepers
  const fieldPlayers = players.filter(p => !isGoalie(p.cap));
  const gkPlayers    = players.filter(p =>  isGoalie(p.cap));

  const totalG    = fieldPlayers.reduce((s,p) => s+p.G, 0);
  const totalA    = fieldPlayers.reduce((s,p) => s+p.A, 0);
  const totalStl  = fieldPlayers.reduce((s,p) => s+(p.Stl||0), 0);
  const totalSW   = fieldPlayers.reduce((s,p) => s+(p.SW||0), 0);
  const totalFBU  = fieldPlayers.reduce((s,p) => s+(p.FBU||0), 0);
  const totalFB   = fieldPlayers.reduce((s,p) => s+(p.FB||0), 0);
  const totalExcl = fieldPlayers.reduce((s,p) => s+p.Excl, 0);
  const totalEE   = fieldPlayers.reduce((s,p) => s+(p.EE||0), 0);

  const hasShotMiss = fieldPlayers.some(p => p.SM > 0);
  const has5m     = fieldPlayers.some(p => p.G5 > 0 || p.M5 > 0);
  const hasSoGoals = fieldPlayers.some(p => p.SOG > 0 || p.SOM > 0);
  const hasSprintWins = fieldPlayers.some(p => (p.SW||0) > 0);
  const hasForcedBallUnder = fieldPlayers.some(p => (p.FBU||0) > 0);
  const hasFieldBlocks = fieldPlayers.some(p => (p.FB||0) > 0);
  const fieldRows = fieldPlayers.map(p => {
    const pName = p.cap ? `#${escHtml(p.cap)} ${escHtml((p.name||'').split(' ')[0])}` : escHtml(p.name||'?');
    return `<div class="bs-row">
      <span class="bs-player">${pName}</span>
      <span class="bs-stat${p.G?'   has-stat':''}">${p.G}</span>
      ${hasShotMiss ? `<span class="bs-stat${p.SM?' has-stat excl-stat':''}">${p.SM||0}</span>` : ''}
      ${has5m ? `<span class="bs-stat${p.G5?' has-stat':''}">${p.G5||0}</span>` : ''}
      ${has5m ? `<span class="bs-stat${p.M5?' has-stat excl-stat':''}">${p.M5||0}</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat${p.SOG?' has-stat':''}">${p.SOG||0}</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat${p.SOM?' has-stat excl-stat':''}">${p.SOM||0}</span>` : ''}
      <span class="bs-stat${p.A?'   has-stat':''}">${p.A}</span>
      <span class="bs-stat${p.Stl?' has-stat':''}">${p.Stl||0}</span>
      ${hasSprintWins ? `<span class="bs-stat${p.SW?' has-stat':''}">${p.SW||0}</span>` : ''}
      ${hasForcedBallUnder ? `<span class="bs-stat${p.FBU?' has-stat':''}">${p.FBU||0}</span>` : ''}
      ${hasFieldBlocks ? `<span class="bs-stat${p.FB?' has-stat':''}">${p.FB||0}</span>` : ''}
      <span class="bs-stat${p.Excl?' has-stat excl-stat':''}">${p.Excl}</span>
      <span class="bs-stat${p.EE?'   has-stat excl-stat':''}">${p.EE||0}</span>
    </div>`;
  }).join('');

  const gkRows = gkPlayers.map(p => {
    const pName = p.cap ? `#${escHtml(p.cap)} ${escHtml((p.name||'').split(' ')[0])}` : escHtml(p.name||'GK');
    return `<div class="bs-row">
      <span class="bs-player">${pName}</span>
      <span class="bs-stat${p.Sv?'  has-stat gk-stat':''}">${p.Sv}</span>
      <span class="bs-stat${p.Excl?' has-stat excl-stat':''}">${p.Excl}</span>
    </div>`;
  }).join('');

  const gkSection = gkPlayers.length ? `
    <div class="bs-section-label">${escHtml(appT('boxscore_goalkeeper'))}</div>
    <div class="bs-header-row">
      <span class="bs-player bs-col-hdr">${escHtml(appT('boxscore_player'))}</span>
      <span class="bs-stat bs-col-hdr">Sv</span>
      <span class="bs-stat bs-col-hdr">Ex</span>
    </div>
    ${gkRows}` : '';

  const toLine = teamTimeouts ? `<div class="bs-footer-line">${escHtml(appT('boxscore_team_timeouts'))}: ${teamTimeouts}</div>` : '';

  const totalSM  = fieldPlayers.reduce((s,p) => s+(p.SM||0), 0);
  const totalG5  = fieldPlayers.reduce((s,p) => s+p.G5,  0);
  const totalM5  = fieldPlayers.reduce((s,p) => s+p.M5,  0);
  const totalSOG = fieldPlayers.reduce((s,p) => s+p.SOG, 0);
  const totalSOM = fieldPlayers.reduce((s,p) => s+p.SOM, 0);
  return `<div class="box-score">
    <div class="bs-header-row">
      <span class="bs-player bs-col-hdr">${escHtml(appT('boxscore_player'))}</span>
      <span class="bs-stat bs-col-hdr">G</span>
      ${hasShotMiss ? `<span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_shot_attempts'))}">SA</span>` : ''}
      ${has5m ? `<span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_5m_goals'))}">5m✓</span>` : ''}
      ${has5m ? `<span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_5m_attempts'))}">5m?</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_so_goals'))}">SO✓</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_so_misses'))}">SO✗</span>` : ''}
      <span class="bs-stat bs-col-hdr">A</span>
      <span class="bs-stat bs-col-hdr">S</span>
      ${hasSprintWins ? `<span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_sprints_won'))}">SW</span>` : ''}
      ${hasForcedBallUnder ? `<span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_forced_ball_under'))}">FBU</span>` : ''}
      ${hasFieldBlocks ? `<span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_field_blocks'))}">FB</span>` : ''}
      <span class="bs-stat bs-col-hdr">Ex</span>
      <span class="bs-stat bs-col-hdr" title="${escHtml(appT('boxscore_earned_exclusions'))}">EE</span>
    </div>
    ${fieldRows}
    ${fieldPlayers.length ? `<div class="bs-row bs-total-row">
      <span class="bs-player">${escHtml(appT('boxscore_total'))}</span>
      <span class="bs-stat has-stat">${totalG}</span>
      ${hasShotMiss ? `<span class="bs-stat">${totalSM}</span>` : ''}
      ${has5m ? `<span class="bs-stat has-stat">${totalG5}</span>` : ''}
      ${has5m ? `<span class="bs-stat">${totalM5}</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat has-stat">${totalSOG}</span>` : ''}
      ${hasSoGoals ? `<span class="bs-stat">${totalSOM}</span>` : ''}
      <span class="bs-stat">${totalA}</span>
      <span class="bs-stat">${totalStl}</span>
      ${hasSprintWins ? `<span class="bs-stat">${totalSW}</span>` : ''}
      ${hasForcedBallUnder ? `<span class="bs-stat">${totalFBU}</span>` : ''}
      ${hasFieldBlocks ? `<span class="bs-stat">${totalFB}</span>` : ''}
      <span class="bs-stat">${totalExcl}</span>
      <span class="bs-stat">${totalEE}</span>
    </div>` : ''}
    ${gkSection}
    ${toLine}
  </div>`;
}

// Share (or copy) the formatted box score text
function shareBoxScore(gameId) {
  const s    = getLiveScore(gameId);
  const game = getTournamentGames().find(g => g.id === gameId);
  const opp  = game?.opponent || 'Opponent';
  const evs  = s.events || [];

  const TYPE_TEXT = {
    goal:          ev => ev.counter ? 'GOAL (Counter)' : (ev.sixOnFive ? 'GOAL (6v5)' : 'GOAL'),
    opp_goal:      ()  => 'GOAL',
    goal_5m:       ()  => 'GOAL (5m)',
    opp_goal_5m:   ()  => 'GOAL (5m)',
    shot_miss:     ()  => 'SHOT ATTEMPT',
    opp_shot_miss: ()  => 'SHOT ATTEMPT',
    miss_5m:       ()  => 'ATTEMPT (5m)',
    opp_miss_5m:   ()  => 'ATTEMPT (5m)',
    so_goal:       ()  => 'SO GOAL',
    opp_so_goal:   ()  => 'SO GOAL',
    so_miss:       ()  => 'SO MISS',
    opp_so_miss:   ()  => 'SO MISS',
    assist:        ()  => 'ASSIST',
    steal:         ev  => ev.forcedBallUnder ? 'STEAL (FBU)' : 'STEAL',
    turnover:      ev => ev.inside2m ? 'TURNOVER (Inside 2m)' : 'TURNOVER',
    sprint_won:    ()  => 'SPRINT WON',
    opp_sprint_won:()  => 'OPP SPRINT WON',
    opp_steal:     ()  => 'OPP STEAL',
    exclusion:     ()  => 'EXCL',
    opp_exclusion: ()  => 'EXCL',
    brutality:     ()  => 'BRUTALITY',
    timeout:       ()  => 'TIMEOUT',
    opp_timeout:   ()  => 'OPP TIMEOUT',
    save:          ()  => 'SAVE',
    block:         ()  => 'SAVE',
    field_block:   ()  => 'FIELD BLOCK',
  };

  let text = `${TOURNAMENT.name || 'Eggbeater'}\n`;
  text += `${getActiveTeamLabel()} vs ${opp}\n`;
  text += `Final Score: Team ${s.team} – ${s.opp} ${opp}\n`;
  if (s.quarterMins) text += `Quarters: ${s.quarterMins} min  ·  Half: ${s.halfMins} min  ·  T/O: ${s.timeoutMins} min\n`;
  text += '\n';

  // Events by period
  const nonState = evs.filter(e => e.type !== 'game_state');
  const groups   = {};
  for (const ev of nonState) {
    const p = ev.period ?? 0;
    if (!groups[p]) groups[p] = [];
    groups[p].push(ev);
  }
  for (const [period, pevs] of Object.entries(groups).sort((a,b) => Number(a[0])-Number(b[0]))) {
    text += `── ${PERIOD_LABELS[parseInt(period)] || 'P'+period} ──\n`;
    for (const ev of pevs) {
      const clock  = ev.clock ? `[${ev.clock}] ` : '';
      const player = ev.cap   ? `#${ev.cap} ${(ev.name||'').split(' ')[0]}` : (ev.name || '');
      const side   = ev.side === 'team' ? 'Team' : opp;
      const tl     = (TYPE_TEXT[ev.type] || (() => ev.type))(ev);
      text += `  ${clock}${side}${player?' '+player:''} — ${tl}\n`;
    }
    text += '\n';
  }

  // Box score summary
  const playerMap = {};
  let ttls = 0;
  for (const ev of nonState) {
    if (ev.type === 'timeout')  { ttls++; continue; }
    if (ev.side !== 'team')     continue;
    const k = ev.cap || ev.name || '?';
    if (!playerMap[k]) playerMap[k] = { cap:ev.cap||'', name:ev.name||'', G:0, A:0, Stl:0, TO:0, SW:0, Excl:0, EE:0, Sv:0 };
    if (ev.type==='goal')                              playerMap[k].G++;
    if (ev.type==='assist')                            playerMap[k].A++;
    if (ev.type==='steal')                             playerMap[k].Stl++;
    if (ev.type==='turnover')                          playerMap[k].TO++;
    if (ev.type==='sprint_won')                        playerMap[k].SW++;
    if (ev.type==='exclusion'||ev.type==='brutality')  playerMap[k].Excl++;
    if (ev.type==='earned_excl')                       playerMap[k].EE++;
    if (ev.type==='save' || ev.type==='block')         playerMap[k].Sv++;
  }
  const ps = Object.values(playerMap).sort((a,b)=>parseInt(a.cap||'999')-parseInt(b.cap||'999'));
  const fieldPs = ps.filter(p => !isGoalie(p.cap));
  const gkPs    = ps.filter(p =>  isGoalie(p.cap));
  if (fieldPs.length) {
    text += `── Box Score ──\n`;
    text += `${'Player'.padEnd(15)} G  A  S  SW Ex EE\n`;
    for (const p of fieldPs) {
      const n = (p.cap ? `#${p.cap} ${(p.name||'').split(' ')[0]}` : p.name||'?').padEnd(15);
      text += `${n} ${p.G}  ${p.A}  ${p.Stl||0}  ${p.SW||0}  ${p.Excl}  ${p.EE||0}\n`;
    }
    if (ttls) text += `Team Timeouts: ${ttls}\n`;
  }
  if (gkPs.length) {
    text += `── Goalkeeper ──\n`;
    text += `${'Player'.padEnd(15)} Sv Ex\n`;
    for (const p of gkPs) {
      const n = (p.cap ? `#${p.cap} ${(p.name||'').split(' ')[0]}` : p.name||'GK').padEnd(15);
      text += `${n} ${p.Sv}  ${p.Excl}\n`;
    }
  }
  text += `\nGenerated by ${getActiveTeamLabel()} WP App`;

  if (navigator.share) {
    navigator.share({ title: `Team vs ${opp} — Box Score`, text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text)
      .then(()  => showToast('Box score copied!', 'ok'))
      .catch(()  => showToast('Copy failed — try a different browser'));
  }
}

// ─── ROSTER MANAGEMENT ────────────────────────────────────────────────────────

function loadRoster(groupOrRef = null) {
  try {
    const rosterGroupKey = _contextGroupKey(groupOrRef) || getSelectedTeam();
    const key = isMultiTeam() && rosterGroupKey ? STORE.ROSTER + '-' + rosterGroupKey : STORE.ROSTER;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only use cached roster if it has actual players; otherwise fall through to admin-panel data
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* fall through */ }
  // Always show the roster deployed from the admin panel
  return getScopedRoster(groupOrRef);
}

function saveRosterToStorage() {
  const key = isMultiTeam() ? STORE.ROSTER + '-' + getActiveTeam() : STORE.ROSTER;
  localStorage.setItem(key, JSON.stringify(state.roster));
}

function getRosterPlayers(gameOrRef = null, explicitGroupKey = '') {
  const roster = getScopedRoster(gameOrRef, explicitGroupKey);
  if (roster.length) return roster;
  return state.roster || [];
}

function addRosterPlayer() {
  state.roster.push({ cap: '', first: '', last: '' });
  saveRosterToStorage();
  renderRosterTab();
  setTimeout(() => {
    const rows = document.querySelectorAll('.roster-edit-row');
    if (rows.length) {
      rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      rows[rows.length - 1].querySelector('input')?.focus();
    }
  }, 60);
}

function removeRosterPlayer(idx) {
  const previous = state.roster.map(p => ({ ...p }));
  const removed = state.roster[idx];
  if (!removed) return;
  state.roster.splice(idx, 1);
  saveRosterToStorage();
  renderRosterTab();
  const playerName = [removed.first, removed.last].filter(Boolean).join(' ') || `#${removed.cap || '?'}`;
  showUndoToast(`Removed ${playerName} from roster`, () => {
    state.roster = previous;
    saveRosterToStorage();
    renderRosterTab();
  });
}

function updateRosterPlayer(idx, field, val) {
  if (state.roster[idx]) {
    state.roster[idx][field] = val;
    saveRosterToStorage();
  }
}

function saveRosterFromUI() {
  saveRosterToStorage();
  showToast('Roster saved!', 'ok');
}

// ─── GROUPME BOT ───────────────────────────────────────────────────────────────

function loadGroupMeSettings() {
  return localStorage.getItem(STORE.GROUPME_BOT_ID) || '';
}

function saveGroupMeSettings(botId) {
  state.groupmeBotId = botId.trim();
  if (state.groupmeBotId) {
    localStorage.setItem(STORE.GROUPME_BOT_ID, state.groupmeBotId);
  } else {
    localStorage.removeItem(STORE.GROUPME_BOT_ID);
  }
}

function updateGroupMeBotId(val) {
  saveGroupMeSettings(val);
}

/** Split a long text into chunks that fit GroupMe's ~1000-char limit. */
function chunkMessage(text, maxLen = 900) {
  const lines  = text.split('\n');
  const chunks = [];
  let cur      = '';
  for (const line of lines) {
    const add = (cur ? '\n' : '') + line;
    if (cur.length + add.length > maxLen) {
      if (cur) chunks.push(cur);
      cur = line;
    } else {
      cur += add;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/** Send the current box score to Telegram or GroupMe via the worker /notify endpoint. */
async function sendBoxScoreNotify(gameId, channel) {
  const text = buildBoxScoreText(gameId);
  const scorePassword = TOURNAMENT.scoringPassword || '';
  const label = channel === 'tg' ? 'Telegram' : 'GroupMe';
  showToast(`Sending to ${label}…`);
  try {
    const res  = await fetch(`${PUSH_SERVER_URL}/notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, channel, scorePassword, team: getSelectedTeam() }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast(`✅ Sent to ${label}!`, 'ok');
    } else {
      showToast(`❌ ${label}: ${data.description || 'Not configured or failed'}`, 'err');
    }
  } catch (e) {
    showToast('❌ Network error: ' + e.message, 'err');
  }
}

/** Send a shootout alert notification to Telegram and/or GroupMe. */
async function sendShootoutAlert(gameId, channel) {
  const s    = getLiveScore(gameId);
  const game = getTournamentGames().find(g => g.id === gameId);
  const opp  = game?.opponent || 'Opponent';
  const teamScore = Number.isInteger(s.team) ? s.team : s.team.toFixed(1);
  const oppScore  = Number.isInteger(s.opp)  ? s.opp  : s.opp.toFixed(1);
  const text = [
    `🎯 SHOOTOUT!`,
    `${TOURNAMENT.name || 'Eggbeater'}`,
    `Team vs ${opp}`,
    ``,
    `Tied ${teamScore}–${oppScore} at end of regulation.`,
    `Heading to penalty shootout! 5 shots per team.`,
    ``,
    `Each goal = 0.1 pts · Most total wins the round.`,
  ].join('\n');
  const label = channel === 'tg' ? 'Telegram' : 'GroupMe';
  showToast(`Sending shootout alert to ${label}…`);
  try {
    const res = await fetch(`${PUSH_SERVER_URL}/notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, channel, scorePassword: TOURNAMENT.scoringPassword || '', team: getSelectedTeam() }),
    });
    const data = await res.json();
    if (data.ok) showToast(`✅ Shootout alert sent to ${label}!`, 'ok');
    else showToast(`❌ ${label}: ${data.description || 'Not configured or failed'}`, 'err');
  } catch (e) {
    showToast('❌ Network error: ' + e.message, 'err');
  }
}

/** Build the plain-text box score (same as shareBoxScore but returns string). */
function buildBoxScoreText(gameId) {
  const s    = getLiveScore(gameId);
  const game = getTournamentGames().find(g => g.id === gameId);
  const opp  = game?.opponent || 'Opponent';
  const evs  = s.events || [];

  const TYPE_TEXT = {
    goal:          ev => ev.counter ? 'GOAL (Counter)' : (ev.sixOnFive ? 'GOAL (6v5)' : 'GOAL'),
    opp_goal:      ()  => 'GOAL',
    goal_5m:       ()  => 'GOAL (5m)',
    opp_goal_5m:   ()  => 'GOAL (5m)',
    shot_miss:     ()  => 'SHOT ATTEMPT',
    opp_shot_miss: ()  => 'SHOT ATTEMPT',
    miss_5m:       ()  => 'ATTEMPT (5m)',
    opp_miss_5m:   ()  => 'ATTEMPT (5m)',
    so_goal:       ()  => 'SO GOAL',
    opp_so_goal:   ()  => 'SO GOAL',
    so_miss:       ()  => 'SO MISS',
    opp_so_miss:   ()  => 'SO MISS',
    assist:        ()  => 'ASSIST',
    steal:         ev  => ev.forcedBallUnder ? 'STEAL (FBU)' : 'STEAL',
    turnover:      ev => ev.inside2m ? 'TURNOVER (Inside 2m)' : 'TURNOVER',
    sprint_won:    ()  => 'SPRINT WON',
    opp_sprint_won:()  => 'OPP SPRINT WON',
    opp_steal:     ()  => 'OPP STEAL',
    exclusion:     ()  => 'EXCL',
    opp_exclusion: ()  => 'EXCL',
    brutality:     ()  => 'BRUTALITY',
    timeout:       ()  => 'TIMEOUT',
    opp_timeout:   ()  => 'OPP TIMEOUT',
    save:          ()  => 'SAVE',
    block:         ()  => 'SAVE',
    field_block:   ()  => 'FIELD BLOCK',
  };

  // ── Status line: smart summary based on game state ──
  const gs = s.gameState || 'pre';
  let statusLine;
  const scoreStr = `${getActiveTeamLabel()} ${s.team} – ${opp} ${s.opp}`;
  if (gs === 'pre' || gs === 'start') {
    statusLine = 'Game has Started';
  } else if (gs === 'half') {
    statusLine = `Halftime: ${scoreStr}`;
  } else if (gs === 'final' || gs === 'so_w' || gs === 'so_l' || gs === 'ff') {
    const label = gs === 'so_w' ? 'SO Win' : gs === 'so_l' ? 'SO Loss' : gs === 'ff' ? 'Forfeit' : 'Final';
    statusLine = `${label}: ${scoreStr}`;
  } else {
    // In-progress quarter/OT — show current period + score
    const periodLabel = _getPeriodLabel(s.period, gameId);
    statusLine = `${periodLabel}: ${scoreStr}`;
  }

  let text = `${TOURNAMENT.name || 'Eggbeater'}\n`;
  text += `${getActiveTeamLabel()} vs ${opp}\n`;
  text += `${statusLine}\n`;
  text += '\n';

  const nonState = evs.filter(e => e.type !== 'game_state');
  const groups   = {};
  for (const ev of nonState) {
    const p = ev.period ?? 0;
    if (!groups[p]) groups[p] = [];
    groups[p].push(ev);
  }
  for (const [period, pevs] of Object.entries(groups).sort((a,b) => Number(a[0])-Number(b[0]))) {
    text += `── ${PERIOD_LABELS[parseInt(period)] || 'P'+period} ──\n`;
    for (const ev of pevs) {
      const clock  = ev.clock ? `[${ev.clock}] ` : '';
      const player = ev.cap   ? `#${ev.cap} ${(ev.name||'').split(' ')[0]}` : (ev.name || '');
      const side   = ev.side === 'team' ? 'Team' : opp;
      const tl     = (TYPE_TEXT[ev.type] || (() => ev.type))(ev);
      text += `  ${clock}${side}${player?' '+player:''} — ${tl}\n`;
    }
    text += '\n';
  }

  const playerMap = {};
  let ttls = 0, oppTtls = 0;
  for (const ev of nonState) {
    if (ev.type === 'timeout')     { ttls++;    continue; }
    if (ev.type === 'opp_timeout') { oppTtls++; continue; }
    if (ev.side !== 'team')     continue;
    const k = ev.cap || ev.name || '?';
    if (!playerMap[k]) playerMap[k] = { cap:ev.cap||'', name:ev.name||'', G:0, A:0, Stl:0, TO:0, SW:0, Excl:0, EE:0, Sv:0 };
    if (ev.type==='goal')                              playerMap[k].G++;
    if (ev.type==='assist')                            playerMap[k].A++;
    if (ev.type==='steal')                             playerMap[k].Stl++;
    if (ev.type==='turnover')                          playerMap[k].TO++;
    if (ev.type==='sprint_won')                        playerMap[k].SW++;
    if (ev.type==='exclusion'||ev.type==='brutality')  playerMap[k].Excl++;
    if (ev.type==='earned_excl')                       playerMap[k].EE++;
    if (ev.type==='save' || ev.type==='block')         playerMap[k].Sv++;
  }
  const ps = Object.values(playerMap).sort((a,b)=>parseInt(a.cap||'999')-parseInt(b.cap||'999'));
  const fieldPs = ps.filter(p => !isGoalie(p.cap));
  const gkPs    = ps.filter(p =>  isGoalie(p.cap));
  if (fieldPs.length) {
    text += `── Box Score ──\n`;
    text += `Player          G  A  S  SW Ex EE\n`;
    for (const p of fieldPs) {
      const n = (p.cap ? `#${p.cap} ${(p.name||'').split(' ')[0]}` : p.name||'?').padEnd(15);
      text += `${n} ${p.G}  ${p.A}  ${p.Stl||0}  ${p.SW||0}  ${p.Excl}  ${p.EE||0}\n`;
    }
    if (ttls)    text += `Team Timeouts: ${ttls}\n`;
    if (oppTtls) text += `Opp Timeouts: ${oppTtls}\n`;
  }
  if (gkPs.length) {
    text += `── Goalkeeper ──\n`;
    text += `Player          Sv Ex\n`;
    for (const p of gkPs) {
      const n = (p.cap ? `#${p.cap} ${(p.name||'').split(' ')[0]}` : p.name||'GK').padEnd(15);
      text += `${n} ${p.Sv}  ${p.Excl}\n`;
    }
  }
  text += `\n— ${getActiveTeamLabel()} WP App\nhttps://eggbeater.app`;
  return text;
}

async function testGroupMeBot() {
  const input = $('groupme-bot-id-input');
  const botId = (input?.value || '').trim();
  if (!botId) { showToast('Paste your Bot ID first'); return; }
  saveGroupMeSettings(botId);
  showToast('Sending test message…');
  try {
    const res = await fetch('https://api.groupme.com/v3/bots/post', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bot_id: botId, text: 'Eggbeater WP App connected! 🤽‍♀️' }),
    });
    if (res.ok || res.status === 202) {
      showToast('Test message sent! Check your GroupMe 📱', 'ok');
    } else {
      showToast(`Failed (HTTP ${res.status}) — double-check Bot ID`);
    }
  } catch {
    showToast('Network error — check connection');
  }
}

function renderRosterTab() {
  const el = $('view-roster');
  if (!el) return;
  const slots = getExpandedTeamSlots();
  if (slots.length === 0) {
    el.innerHTML = '<p class="empty-msg" style="padding:24px;text-align:center;color:var(--gray-500)">Select an age group above to view the roster.</p>';
    return;
  }
  if (slots.length > 1) { _renderRosterMulti(el, slots); return; }
  const roster = getRosterPlayers(getSelectedTeam());

  // If roster is empty, trigger a background reload (handles slow CF worker cold-start on Android).
  // _doTeamLoad will call renderRosterTab() again once data arrives.
  if (roster.length === 0 && !window._rosterReloading) {
    window._rosterReloading = true;
    loadAllSelectedTeams().then(() => {
      state.roster = loadRoster(getSelectedTeam());
      window._rosterReloading = false;
      renderRosterTab();
    }).catch(() => { window._rosterReloading = false; });
  }

  // Sort display order: field players 2-25 numerically, goalies (GK/1/1A) at bottom.
  // Preserve original index i so edit/delete operations target the correct state.roster slot.
  const sortedEntries = roster
    .map((p, i) => ({ p, i }))
    .sort((a, b) => capSortKey(a.p.cap) - capSortKey(b.p.cap));

  const isHS = localStorage.getItem('ebwp-club-type') === 'highschool';

  const colHdr = `<div class="roster-edit-header">
    <span class="rec-col-cap">Cap</span>
    <span class="rec-col-name">First</span>
    <span class="rec-col-name">Last</span>
    ${isHS ? '<span class="rec-col-name" style="flex:0 0 70px">Grade</span>' : ''}
    <span class="rec-col-del"></span>
  </div>`;

  const rows = sortedEntries.map(({ p, i }) => `
    <div class="roster-edit-row">
      <input type="text" class="roster-cap-input${isGoalie(p.cap) ? ' roster-cap-gk' : ''}" value="${escHtml(p.cap||'')}" placeholder="#"
             maxlength="3" oninput="updateRosterPlayer(${i},'cap',this.value)" aria-label="Cap">
      <input type="text" class="roster-name-input" value="${escHtml(p.first||'')}" placeholder="First"
             oninput="updateRosterPlayer(${i},'first',this.value)" aria-label="First">
      <input type="text" class="roster-name-input" value="${escHtml(p.last||'')}" placeholder="Last"
             oninput="updateRosterPlayer(${i},'last',this.value)" aria-label="Last">
      ${isHS ? `<select class="roster-name-input" style="flex:0 0 70px;font-size:0.75rem;padding:6px 2px"
                       onchange="updateRosterPlayer(${i},'grade',this.value)" aria-label="Grade">
        <option value="">—</option>
        <option value="Freshman"${p.grade==='Freshman'?' selected':''}>Fr</option>
        <option value="Sophomore"${p.grade==='Sophomore'?' selected':''}>So</option>
        <option value="Junior"${p.grade==='Junior'?' selected':''}>Jr</option>
        <option value="Senior"${p.grade==='Senior'?' selected':''}>Sr</option>
      </select>` : ''}
      <button class="roster-remove-btn" onclick="removeRosterPlayer(${i})" aria-label="Remove">×</button>
    </div>`).join('');

  el.innerHTML = `${renderMyPlayerCard()}
  ${renderPlayerLookupCard()}
  <div class="card tab-card roster-main-card">
    <div class="history-header-row">
      <h2>${escHtml(appT('roster_title'))}</h2>
      <span class="history-subtitle">${escHtml(_groupSectionLabelFor(getSelectedTeam(), null))}</span>
    </div>
    <p class="step-desc">${escHtml(appT('roster_manage_players_desc'))}</p>
    <button class="pstats-export-btn" onclick="openPlayerStatsModal()">📊 ${escHtml(appT('roster_download_all_stats'))}</button>
    <button class="pstats-export-btn" style="background:#eff6ff;color:#1e40af;border-color:#93c5fd" onclick="openSeasonStatsModal()">📊 ${escHtml(appT('roster_season_stats'))}</button>
    ${colHdr}
    <div id="roster-edit-list">
      ${rows || `<p class="empty-msg" style="padding:10px 0">${escHtml(appT('roster_no_players_yet'))}</p>`}
    </div>
    <button class="btn btn-ghost" onclick="addRosterPlayer()" style="margin-top:10px">+ ${escHtml(appT('roster_add_player'))}</button>
    <button class="btn-save-roster" onclick="saveRosterFromUI()">💾 ${escHtml(appT('roster_save_roster'))}</button>
  </div>`;
}

function _renderRosterMulti(el, slots) {
  let html = renderMyPlayersCard();
  for (const { groupKey, letter, suffix } of slots) {
    const cache = TEAM_CACHE[groupKey];
    const letters = letter ? [letter] : getTeamLettersForGroup(groupKey);
    const roster = cache ? (Array.isArray(cache.tournament.roster)
      ? cache.tournament.roster
      : letters.flatMap(l => cache.tournament.roster?.[l] || [])) : [];
    const sorted = sortedRoster(roster);
    const rows = sorted.map(p => `
      <div class="roster-view-row">
        <span class="roster-cap-badge${isGoalie(p.cap) ? ' roster-cap-gk' : ''}">${p.cap ? '#' + escHtml(p.cap) : '—'}</span>
        <span class="roster-view-name">${escHtml([p.first, p.last].filter(Boolean).join(' ') || '—')}</span>
      </div>`).join('');
    html += `<div class="card tab-card roster-view-card">
      <div class="scores-slot-header slot-header-in-card"><span class="scores-slot-label">${escHtml(_groupSectionLabelFor(groupKey, letter))}</span></div>
      <div class="history-header-row">
        <h2>Roster</h2>
      </div>
      <div class="roster-view-list">
        ${rows || '<p class="empty-msg" style="padding:10px 0">No roster data.</p>'}
      </div>
    </div>`;
  }
  el.innerHTML = html;
}

// ─── PLAYER LOOKUP (Roster tab) ──────────────────────────────────────────────

let _playerLookupName = '';

/** Builds the "Player Stats" lookup card inserted above the roster management card. */
function renderPlayerLookupCard() {
  const teamKey   = getSelectedTeam();
  const roster    = getRosterPlayers(teamKey);
  const allStats  = getAllPlayersWithStats(teamKey);
  const sorted    = sortedRoster(roster);
  const rosterNames = new Set(sorted.map(p => `${p.first} ${p.last}`.toLowerCase().trim()));

  const rosterOpts = sorted
    .filter(p => p.first || p.last)
    .map(p => {
      const name = `${p.first} ${p.last}`.trim();
      const sel  = _playerLookupName === name ? ' selected' : '';
      return `<option value="${encodeURIComponent(name)}"${sel}>${p.cap ? `#${escHtml(p.cap)} ` : ''}${escHtml(name)}</option>`;
    });

  const histOpts = allStats
    .filter(p => p.name && !rosterNames.has(p.name.toLowerCase()))
    .map(p => {
      const sel = _playerLookupName === p.name ? ' selected' : '';
      return `<option value="${encodeURIComponent(p.name)}"${sel}>${escHtml(p.name)}</option>`;
    });

  const resultHtml = _playerLookupName ? buildPlayerLookupResult(_playerLookupName) : '';

  // Group into optgroups so roster cap-order is visually clear
  const optsHtml = rosterOpts.length
    ? `<optgroup label="Current Roster">${rosterOpts.join('')}</optgroup>`
      + (histOpts.length ? `<optgroup label="Past Players">${histOpts.join('')}</optgroup>` : '')
    : histOpts.join('');

  return `<div class="card tab-card player-lookup-card">
    <div class="history-header-row">
      <h2>Player Stats</h2>
    </div>
    <p class="step-desc">Look up stats for any rostered player.</p>
    <select class="player-lookup-select" onchange="selectPlayerLookup(this.value)">
      <option value="">— Choose a player —</option>
      ${optsHtml}
    </select>
    <div id="player-lookup-result">${resultHtml}</div>
  </div>`;
}

/** Called when the player lookup dropdown changes. */
function selectPlayerLookup(encodedName) {
  _playerLookupName = encodedName ? decodeURIComponent(encodedName) : '';
  const el = $('player-lookup-result');
  if (el) el.innerHTML = _playerLookupName ? buildPlayerLookupResult(_playerLookupName) : '';
}

/** Builds the stats panel HTML for a given player name. */
function buildPlayerLookupResult(name) {
  const teamKey = getSelectedTeam();
  const stats  = getMyPlayerSummaryStats(name, teamKey);
  const roster = getRosterPlayers(teamKey);
  const entry  = roster.find(p => `${p.first} ${p.last}`.toLowerCase() === name.toLowerCase());
  const isGK   = entry ? isGoalie(entry.cap) : ((stats?.Sv || 0) > 0);

  const G          = stats?.G          || 0;
  const A          = stats?.A          || 0;
  const Excl       = stats?.Excl       || 0;
  const EE         = stats?.EE         || 0;
  const sixOnFive  = stats?.sixOnFive  || 0;
  const Sv         = stats?.Sv         || 0;
  const gameCount  = stats?.gameCount  || 0;
  const nameEnc    = encodeURIComponent(name);
  const capBadge   = entry?.cap ? `<span class="plookup-cap">#${escHtml(entry.cap)}</span>` : '';
  const gkBadge    = isGK ? `<span class="plookup-gk-badge">GK</span>` : '';

  const SM2        = stats?.SM  || 0;
  const G5_2       = stats?.G5  || 0;
  const M5_2       = stats?.M5  || 0;
  const SOG2       = stats?.SOG || 0;
  const SOM2       = stats?.SOM || 0;

  const statBoxes = isGK
    ? `<div class="mp-stat-rows">
        <div class="mp-stat-row-lg">
          <div class="mp-stat-box"><span class="mp-stat-num">${Sv}</span><span class="mp-stat-lbl">Saves</span></div>
          <div class="mp-stat-box"><span class="mp-stat-num">${Excl}</span><span class="mp-stat-lbl">Exclusions</span></div>
          <div class="mp-stat-box"><span class="mp-stat-num">${gameCount}</span><span class="mp-stat-lbl">Games</span></div>
        </div>
       </div>`
    : `<div class="mp-stat-rows">
        <div class="mp-stat-row-lg">
          <div class="mp-stat-box"><span class="mp-stat-num">${G}</span><span class="mp-stat-lbl">Goals</span></div>
          <div class="mp-stat-box"><span class="mp-stat-num">${A}</span><span class="mp-stat-lbl">Assists</span></div>
          <div class="mp-stat-box"><span class="mp-stat-num">${SM2}</span><span class="mp-stat-lbl">Attempts</span></div>
        </div>
        <div class="mp-stat-row-4">
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${sixOnFive}</span><span class="mp-stat-lbl-sm">6on5 Goals</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${G5_2}</span><span class="mp-stat-lbl-sm">5m Goals</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${M5_2}</span><span class="mp-stat-lbl-sm">5m Attempts</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SOG2}</span><span class="mp-stat-lbl-sm">SO Goals</span></div>
        </div>
        <div class="mp-stat-row-3">
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${Excl}</span><span class="mp-stat-lbl-sm">Exclusions</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${EE}</span><span class="mp-stat-lbl-sm">Earned Excl</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SOM2}</span><span class="mp-stat-lbl-sm">SO Attempts</span></div>
          <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${gameCount}</span><span class="mp-stat-lbl-sm">Games</span></div>
        </div>
       </div>`;

  const rows   = collectPlayerGameRows(name);
  const recent = [...rows].reverse().slice(0, 5);
  const gameRowsHtml = recent.map(r => {
    const res   = r.result ? `<span class="mp-game-result mp-res-${r.result.toLowerCase()}">${resultLabel(r.result)}</span>` : '';
    const score = (r.teamScore !== '' && r.oppScore !== '') ? `<span class="mp-game-score">${r.teamScore}–${r.oppScore}</span>` : '';
    const st    = isGK
      ? `Sv&nbsp;${r.Sv||0}&nbsp; Ex&nbsp;${r.Excl}`
      : `G&nbsp;${r.G}&nbsp; A&nbsp;${r.A}&nbsp; Ex&nbsp;${r.Excl}&nbsp; EE&nbsp;${r.EE||0}`;
    return `<div class="mp-game-row">
      <div class="mp-game-opp">${escHtml(r.opponent)}${res ? ' '+res : ''}${score ? ' '+score : ''}</div>
      <div class="mp-game-stats">${st}</div>
    </div>`;
  }).join('');

  const moreNote = rows.length > 5
    ? `<div class="mp-game-more">${rows.length - 5} more game${rows.length - 5 !== 1 ? 's' : ''} in download</div>` : '';

  return `
    <div class="plookup-player-header">
      <div class="plookup-name-row">${capBadge}<span class="plookup-name">${escHtml(name)}</span>${gkBadge}</div>
    </div>
    ${statBoxes}
    ${!gameCount ? '<p class="plookup-no-stats">No stats recorded yet — use live scoring to start tracking.</p>' : ''}
    ${gameRowsHtml ? `<div class="plookup-games-section">
      <div class="mp-section-label">Recent games</div>
      ${gameRowsHtml}${moreNote}
    </div>` : ''}
    ${gameCount ? `<button class="plookup-dl-btn" onclick="downloadPlayerStats('${nameEnc}')">📊 Download stats CSV</button>` : ''}`;
}

// ─── HISTORY TEAM SEARCH ─────────────────────────────────────────────────────

let _historyTeamFilter = '';

/** Builds and injects the "Search by Team" card into #history-team-search. */
function renderHistoryTeamSearch() {
  const el = $('history-team-search');
  if (!el) return;

  const history = getHistoryForActiveTeam();
  const oppSet  = new Set();
  for (const t of history) {
    for (const g of (t.games || [])) {
      if (g.opponent && g.opponent.trim() && g.opponent !== 'TBD') oppSet.add(g.opponent.trim());
    }
  }
  // Also include opponents from current tournament live scores
  for (const g of getTournamentGames()) {
    const ls = getLiveScore(g);
    const hasLiveScore = !!((ls.team > 0) || (ls.opp > 0) || (Array.isArray(ls.events) && ls.events.length));
    const hasSyncedScore = g.teamScore !== '' && g.teamScore != null && g.oppScore !== '' && g.oppScore != null;
    if (g.opponent && g.opponent !== 'TBD' && (hasLiveScore || hasSyncedScore || _getResultForGame(g))) oppSet.add(g.opponent.trim());
  }

  if (!oppSet.size) { el.innerHTML = ''; return; }

  const opts = [...oppSet].sort((a, b) => a.localeCompare(b)).map(opp => {
    const sel = _historyTeamFilter === opp ? ' selected' : '';
    return `<option value="${encodeURIComponent(opp)}"${sel}>${escHtml(opp)}</option>`;
  });

  const resultHtml = _historyTeamFilter ? buildTeamSearchResult(_historyTeamFilter) : '';

  el.innerHTML = `<div class="card tab-card team-search-card">
    <div class="history-header-row">
      <h2>Search by Team</h2>
      ${_historyTeamFilter ? `<button class="team-search-clear-btn" onclick="clearTeamSearch()">Clear ✕</button>` : ''}
    </div>
    <select class="team-search-select" onchange="applyTeamSearch(this.value)">
      <option value="">— Select an opponent —</option>
      ${opts.join('')}
    </select>
    <div id="team-search-result">${resultHtml}</div>
  </div>`;
}

/** Called when an opponent is selected in the team search dropdown. */
function applyTeamSearch(encodedOpp) {
  _historyTeamFilter = encodedOpp ? decodeURIComponent(encodedOpp) : '';
  const resultEl = $('team-search-result');
  if (resultEl) resultEl.innerHTML = _historyTeamFilter ? buildTeamSearchResult(_historyTeamFilter) : '';
  // Re-render header to show/hide Clear button
  const headerBtn = document.querySelector('.team-search-card .history-header-row .team-search-clear-btn');
  const hRow = document.querySelector('.team-search-card .history-header-row');
  if (hRow) {
    const existing = hRow.querySelector('.team-search-clear-btn');
    if (_historyTeamFilter && !existing) {
      const btn = document.createElement('button');
      btn.className = 'team-search-clear-btn';
      btn.textContent = 'Clear ✕';
      btn.onclick = clearTeamSearch;
      hRow.appendChild(btn);
    } else if (!_historyTeamFilter && existing) {
      existing.remove();
    }
  }
}

function clearTeamSearch() {
  _historyTeamFilter = '';
  renderHistoryTeamSearch();
}

/** Builds the results panel for a selected opponent. */
function buildTeamSearchResult(opponent) {
  const normalizedOpponent = normalizeOpponentName(opponent);
  const oppLC = normalizedOpponent.toLowerCase();

  // Collect all games vs this opponent from history + current tournament
  const matchedGames = [];

  for (const t of getHistoryForActiveTeam()) {
    for (const g of (t.games || [])) {
      if (normalizeOpponentName(g.opponent || '').toLowerCase() !== oppLC) continue;
      const ls = g.liveScore || {};
      matchedGames.push({
        tournamentName: t.name || 'Past Tournament',
        date:           g.dateISO || g.date || '',
        result:         g.result || '',
        teamScore:      ls.team ?? g.teamScore ?? '',
        oppScore:       ls.opp  ?? g.oppScore  ?? '',
        score:          g.score || '',
      });
    }
  }
  // Current tournament
  for (const g of getTournamentGames()) {
    if (normalizeOpponentName(g.opponent || '').toLowerCase() !== oppLC) continue;
    const ls = getLiveScore(g);
    const hasLiveScore = !!((ls.team > 0) || (ls.opp > 0) || (Array.isArray(ls.events) && ls.events.length));
    const teamScore = hasLiveScore ? (ls.team ?? '') : (g.teamScore ?? '');
    const oppScore = hasLiveScore ? (ls.opp ?? '') : (g.oppScore ?? '');
    const result = _getResultForGame(g) || '';
    if (teamScore === '' && oppScore === '' && !result) continue;
    matchedGames.push({
      tournamentName: TOURNAMENT.name || 'Eggbeater',
      date:           g.dateISO || g.date || '',
      result,
      teamScore,
      oppScore,
      score:          g.score || ((teamScore !== '' && oppScore !== '') ? `${teamScore}-${oppScore}` : ''),
    });
  }

  if (!matchedGames.length) {
    return `<p class="team-search-empty">No recorded results vs ${escHtml(opponent)} yet.</p>`;
  }

  // Sort chronologically
  matchedGames.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  // Record tally
  let W = 0, L = 0, T = 0;
  for (const g of matchedGames) {
    if (isWin(g.result))  W++;
    else if (g.result === 'L' || g.result === 'SL') L++;
    else if (g.result && g.result !== 'F') T++;
  }
  const totalWithResult = W + L + T;
  const recStr = totalWithResult ? `${W}W – ${L}L${T ? ` – ${T}T` : ''}` : `${matchedGames.length} game${matchedGames.length !== 1 ? 's' : ''}`;

  const gameRows = matchedGames.map(g => {
    const rc = isWin(g.result) ? 'win' : (g.result === 'L' || g.result === 'SL') ? 'loss' : 'none';
    let dateStr = '';
    if (g.date) {
      try { dateStr = new Date(g.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
      catch { dateStr = g.date; }
    }
    let scoreStr = '';
    if (g.teamScore !== '' && g.oppScore !== '') {
      scoreStr = `<span class="tsearch-score">${g.teamScore}–${g.oppScore}</span>`;
    } else if (g.score) {
      scoreStr = `<span class="tsearch-score">${escHtml(g.score)}</span>`;
    }
    const resultStr = g.result ? `<span class="hg-result ${rc}">${g.result}</span>` : '';
    return `<div class="tsearch-game-row">
      <div class="tsearch-game-left">
        <span class="tsearch-tourney">${escHtml(g.tournamentName)}</span>
        ${dateStr ? `<span class="tsearch-date">${escHtml(dateStr)}</span>` : ''}
      </div>
      <div class="tsearch-game-right">${scoreStr}${resultStr}</div>
    </div>`;
  }).join('');

  return `
    <div class="tsearch-record-row">
      <span class="tsearch-record-label">vs ${escHtml(opponent)}</span>
      <span class="tsearch-record-value">${recStr}</span>
    </div>
    <div class="tsearch-games-list">${gameRows}</div>`;
}

// ── Auto-Clock Engine ────────────────────────────────────────────────────────

function _getScopedClockSettings(gameOrRef = null) {
  const groupKey = gameOrRef ? _contextGroupKey(gameOrRef) : '';
  const cs = (groupKey && TEAM_CACHE[groupKey]?.tournament?.clockSettings)
    || TOURNAMENT.clockSettings
    || {};
  return {
    quarterMins: cs.quarterMins ?? 7,
    breakMins: cs.breakMins ?? 2,
    halftimeMins: cs.halftimeMins ?? 5,
    timeoutsPerTeam: cs.timeoutsPerTeam ?? 2,
    timeoutLengths: Array.isArray(cs.timeoutLengths) && cs.timeoutLengths.length ? cs.timeoutLengths : [1, 0.5],
    periodMode: cs.periodMode || 'quarters',
    halfMins: cs.halfMins ?? 18,
  };
}

function getClockSettings(gameOrRef = null) {
  const gameScore = gameOrRef ? state.liveScores[_scopedGameKey(gameOrRef)] : null;
  const base = _getScopedClockSettings(gameOrRef);
  const useLiveTiming = !!gameScore?.timingLocked;
  return {
    quarterMins: useLiveTiming ? (gameScore?.quarterMins ?? base.quarterMins) : base.quarterMins,
    breakMins: useLiveTiming ? (gameScore?.breakMins ?? base.breakMins) : base.breakMins,
    halftimeMins: useLiveTiming ? (gameScore?.halfMins ?? base.halftimeMins) : base.halftimeMins,
    timeoutsPerTeam: useLiveTiming ? (gameScore?.timeoutsPerTeam ?? base.timeoutsPerTeam) : base.timeoutsPerTeam,
    timeoutLengths: useLiveTiming && Array.isArray(gameScore?.timeoutLengths) && gameScore.timeoutLengths.length
      ? gameScore.timeoutLengths
      : [...base.timeoutLengths],
    periodMode: base.periodMode,
    halfMins: useLiveTiming ? (gameScore?.halfMinsPerHalf ?? base.halfMins) : base.halfMins,
  };
}

function fmtClock(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getCurrentClockStr(gameId) {
  const s = getLiveScore(gameId);
  if (!s) return '0:00';
  if (s.timerRunning && s.timerStartedAt) {
    const elapsed = (Date.now() - s.timerStartedAt) / 1000;
    return fmtClock(Math.max(0, (s.timerSecondsLeft || 0) - elapsed));
  }
  return fmtClock(s.timerSecondsLeft || 0);
}

function hasAutoClock(gameId) {
  const s = getLiveScore(gameId);
  return !!(s && s.timerPhase && (s.timerRunning || (s.timerSecondsLeft || 0) > 0));
}

let _clockTicker = null;

function ensureClockTicker() {
  if (_clockTicker) return;
  _clockTicker = setInterval(_tickAllClocks, 250);
}

function _tickAllClocks() {
  let anyRunning = false;
  for (const [gameId, s] of Object.entries(state.liveScores)) {
    if (!s || !s.timerRunning) continue;
    anyRunning = true;
    const elapsed = (Date.now() - (s.timerStartedAt || Date.now())) / 1000;
    const remaining = Math.max(0, (s.timerSecondsLeft || 0) - elapsed);
    const fmtTime = fmtClock(remaining);
    const el = document.getElementById('game-clock-' + gameId);
    if (el) el.textContent = fmtTime;
    // Also update the schedule page live card clock
    const schedEl = document.getElementById('next-game-clock-' + gameId);
    if (schedEl) schedEl.textContent = fmtTime;
    // Keep state.clock in sync so broadcasts and Live Activity updates have the current time
    s.clock = fmtTime;
    // Push clock to iOS Live Activity once per second — no _activeLA check since
    // the LA can outlive an _activeLA reset (e.g. after a SW cache reload).
    if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'ios') {
      const now = Date.now();
      if (!window._laLastClockPush || now - window._laLastClockPush >= 1000) {
        window._laLastClockPush = now;
        const _la = window.Capacitor?.Plugins?.LiveActivity ||
          (window.Capacitor?.nativePromise ? { updateActivity: (o) => window.Capacitor.nativePromise('LiveActivity', 'updateActivity', o) } : null);
        if (_la) _la.updateActivity({
          homeScore: s.team  || 0,
          awayScore: s.opp   || 0,
          clock:     fmtTime,
          quarter:   String(s.period || 1),
          lastEvent: _buildLastEventStr(gameId),
          // Native iOS countdown timer — Date.now()/1000 + remaining seconds = end timestamp
          timerEnd:  s.timerRunning && remaining > 0 ? (Date.now() / 1000 + remaining) : 0,
        }).catch(() => {});
      }
    }
    if (remaining <= 0 && !s._clockExpiring) {
      s._clockExpiring = true;
      _handleClockExpired(gameId);
    }
  }
  if (!anyRunning && _clockTicker) {
    clearInterval(_clockTicker);
    _clockTicker = null;
  }
}

const _PHASE_SEQ = ['q1','break12','q2','halftime','q3','break34','q4','done'];
const _PHASE_SEQ_HALVES = ['h1','halftime','h2','done'];

function _getPhaseSeq(cs) {
  return (cs && cs.periodMode === 'halves') ? _PHASE_SEQ_HALVES : _PHASE_SEQ;
}

function _phaseSeconds(phase, cs) {
  if (phase === 'break12' || phase === 'break34') return (cs.breakMins || 2) * 60;
  if (phase === 'halftime') return (cs.halftimeMins || 5) * 60;
  if (phase === 'h1' || phase === 'h2') return (cs.halfMins || 18) * 60;
  return (cs.quarterMins || 7) * 60;
}

function _nextPhase(phase, cs) {
  const seq = _getPhaseSeq(cs);
  const i = seq.indexOf(phase);
  return i >= 0 && i < seq.length - 1 ? seq[i + 1] : 'done';
}

function _phaseGameState(phase) {
  return { q1:'q1', q2:'q2', halftime:'half', q3:'q3', q4:'q4', h1:'q1', h2:'q3' }[phase] || null;
}

function _phaseLabel(phase) {
  return { q1:'Q1', break12:'Quarter Break', q2:'Q2', halftime:'Half Time', q3:'Q3', break34:'Quarter Break', q4:'Q4', done:'Final', h1:'H1', h2:'H2' }[phase] || phase?.toUpperCase() || '';
}

function _handleClockExpired(gameId) {
  const s = getLiveScore(gameId);
  const cs = getClockSettings(gameId);
  const cur  = s.timerPhase || 'q1';
  const next = _nextPhase(cur, cs);

  s.timerRunning     = false;
  s.timerStartedAt   = null;
  s.timerSecondsLeft = 0;
  s._clockExpiring   = false;

  if (next === 'done') {
    _setLiveScore(gameId, s);
    saveLiveScores();
    setGameState(gameId, 'final');
    showToast('🏁 Game over!');
    return;
  }

  s.timerPhase       = next;
  s.timerSecondsLeft = _phaseSeconds(next, cs);

  const isBreak = next === 'break12' || next === 'break34' || next === 'halftime';
  if (isBreak) {
    // Auto-start break/halftime countdown
    s.timerRunning   = true;
    s.timerStartedAt = Date.now();
    _setLiveScore(gameId, s);
    saveLiveScores();
    ensureClockTicker();
    const gs = _phaseGameState(next);
    if (gs) setGameState(gameId, gs);
    else { renderGamesList(); renderNextGameCard(); if (state.currentTab === 'scores') renderScoresTab(); }
    showToast(next === 'halftime' ? '⏸ Halftime!' : (next === 'h1' || next === 'h2' ? '⏸ Half break' : '⏸ Quarter break'));
  } else {
    // New quarter — advance state, wait for scorer to tap ▶
    _setLiveScore(gameId, s);
    saveLiveScores();
    const gs = _phaseGameState(next);
    if (gs) setGameState(gameId, gs);
    else { renderGamesList(); renderNextGameCard(); if (state.currentTab === 'scores') renderScoresTab(); }
    showToast(`⏱ ${_phaseLabel(next)} — tap ▶ to start`);
  }
}

function startScoring(gameId) {
  const s  = getLiveScore(gameId);
  const cs = getClockSettings(gameId);
  s.quarterMins = cs.quarterMins;
  s.breakMins = cs.breakMins;
  s.halfMins = cs.halftimeMins;
  s.timeoutsPerTeam = cs.timeoutsPerTeam;
  s.timeoutLengths = [...(cs.timeoutLengths || [])];
  s.halfMinsPerHalf = cs.halfMins;
  s.timingLocked = true;

  // Determine which quarter we're starting
  const phase = s.timerPhase || 'q1';
  const isNewGame = !s.timerPhase || s.gameState === 'pre';

  if (isNewGame) {
    const csForStart = getClockSettings(gameId);
    s.timerPhase = csForStart.periodMode === 'halves' ? 'h1' : 'q1';
    s.teamTimeoutsLeft = cs.timeoutsPerTeam;
    s.oppTimeoutsLeft  = cs.timeoutsPerTeam;
    s.teamTimeoutIdx   = 0;
    s.oppTimeoutIdx    = 0;
  }

  if (!s.timerSecondsLeft || s.timerSecondsLeft <= 0) {
    s.timerSecondsLeft = _phaseSeconds(s.timerPhase, cs);
  }

  s.timerRunning   = true;
  s.timerStartedAt = Date.now();
  s._clockExpiring = false;

  _setLiveScore(gameId, s);
  saveLiveScores();
  ensureClockTicker();

  // Set game state for the current quarter
  const gs = _phaseGameState(s.timerPhase);
  if (gs && s.gameState !== gs) setGameState(gameId, gs);
  else afterScore(gameId);
}

/**
 * Push the current clock state to the iOS Live Activity.
 * Called whenever timerRunning or timerSecondsLeft changes so SwiftUI's
 * native Text(.timer) countdown starts/stops at exactly the right moment.
 */
function _pushLAClockState(gameId) {
  // No _activeLA guard — the LA may still be showing even if _activeLA was reset
  // (e.g. after a SW reload). Always attempt updateActivity; fails silently if no LA active.
  if (!window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() !== 'ios') return;
  const s = getLiveScore(gameId);
  if (!s) return;
  const _la = window.Capacitor?.Plugins?.LiveActivity ||
    (window.Capacitor?.nativePromise
      ? { updateActivity: (o) => window.Capacitor.nativePromise('LiveActivity', 'updateActivity', o) }
      : null);
  if (!_la) return;
  const remaining = s.timerRunning
    ? Math.max(0, (s.timerSecondsLeft || 0) - (Date.now() - (s.timerStartedAt || Date.now())) / 1000)
    : 0;
  _la.updateActivity({
    homeScore: s.team  || 0,
    awayScore: s.opp   || 0,
    clock:     s.clock || fmtClock(s.timerSecondsLeft || 0),
    quarter:   String(s.period || 1),
    lastEvent: _buildLastEventStr(gameId),
    // timerEnd non-zero → SwiftUI runs native countdown; 0 → shows frozen clockStr
    timerEnd:  s.timerRunning && remaining > 0 ? (Date.now() / 1000 + remaining) : 0,
  }).catch(() => {});
}

function pauseGameTimer(gameId) {
  const s = getLiveScore(gameId);
  if (!s.timerRunning) return;
  const elapsed      = (Date.now() - (s.timerStartedAt || Date.now())) / 1000;
  s.timerSecondsLeft = Math.max(0, (s.timerSecondsLeft || 0) - elapsed);
  s.timerRunning     = false;
  s.timerStartedAt   = null;
  s.clock            = fmtClock(s.timerSecondsLeft); // freeze display time
  _setLiveScore(gameId, s);
  saveLiveScores();
  _pushLAClockState(gameId); // tell LA to stop ticking (timerEnd → 0)
  renderGamesList();
  renderNextGameCard();
  if (state.currentTab === 'scores') renderScoresTab();
}

function resumeGameTimer(gameId) {
  const s = getLiveScore(gameId);
  if (s.timerRunning) return;
  if ((s.timerSecondsLeft || 0) <= 0) return;
  s.timerRunning   = true;
  s.timerStartedAt = Date.now();
  _setLiveScore(gameId, s);
  saveLiveScores();
  ensureClockTicker();
  _pushLAClockState(gameId); // tell LA to start native countdown with new timerEnd
  renderGamesList();
  renderNextGameCard();
  if (state.currentTab === 'scores') renderScoresTab();
}

function resetGameClock(gameId, phaseOverride = null, autoStart = false) {
  const previous = _cloneJsonSafe(getLiveScore(gameId));
  const s  = getLiveScore(gameId);
  const cs = getClockSettings(gameId);
  s.quarterMins = cs.quarterMins;
  s.breakMins = cs.breakMins;
  s.halfMins = cs.halftimeMins;
  s.timeoutsPerTeam = cs.timeoutsPerTeam;
  s.timeoutLengths = [...(cs.timeoutLengths || [])];
  s.timingLocked = true;
  const phase = phaseOverride || s.timerPhase || 'q1';
  if (phaseOverride) s.timerPhase = phaseOverride;
  s.timerRunning     = false;
  s.timerStartedAt   = null;
  s.timerSecondsLeft = _phaseSeconds(phase, cs);
  s._clockExpiring   = false;
  if (autoStart && !['halftime','break12','break34'].includes(phase)) {
    s.timerRunning = true;
    s.timerStartedAt = Date.now();
  }
  _setLiveScore(gameId, s);
  saveLiveScores();
  if (s.timerRunning) ensureClockTicker();
  // Update display immediately
  const el = document.getElementById('game-clock-' + gameId);
  if (el) el.textContent = fmtClock(s.timerSecondsLeft);
  renderGamesList();
  renderNextGameCard();
  if (state.currentTab === 'scores') renderScoresTab();
  showUndoToast('Clock reset', () => {
    if (!previous) return;
    _setLiveScore(gameId, previous);
    saveLiveScores();
    if (previous.timerRunning) ensureClockTicker();
    const clockEl = document.getElementById('game-clock-' + gameId);
    if (clockEl) clockEl.textContent = fmtClock(previous.timerSecondsLeft || 0);
    renderGamesList();
    renderNextGameCard();
    if (state.currentTab === 'scores') renderScoresTab();
  }, { timeoutMs: 3000 });
}

// Format timeout length for button labels: 1 → "1 Min", 0.5 → "30s", 1.5 → "1.5 Min"
function fmtTOLabel(mins) {
  if (mins < 1) return `${Math.round(mins * 60)}s`;
  return `${mins} Min`;
}

function callTeamTimeout(gameId, lengthMins) {
  const s = getLiveScore(gameId);
  if (!s.teamTimeoutsUsed) s.teamTimeoutsUsed = [];

  if (s.teamTimeoutsUsed.includes(lengthMins)) {
    s.teamTimeoutsUsed = s.teamTimeoutsUsed.filter(m => m !== lengthMins);
    const idx = s.events.findLastIndex(e => e.type === 'timeout' && (e.period === s.period || (s.period === 0 && !e.period)));
    if (idx !== -1) s.events.splice(idx, 1);
    _setLiveScore(gameId, s);
    saveLiveScores();
    afterScore(gameId);
    showToast('Timeout removed');
    return;
  }

  pauseGameTimer(gameId);
  s.teamTimeoutsUsed = [...s.teamTimeoutsUsed, lengthMins];
  _setLiveScore(gameId, s);
  _pendingClock = getCurrentClockStr(gameId);
  _doRecordDirect(gameId, 'timeout');
}

function callOppTimeout(gameId, lengthMins) {
  const s = getLiveScore(gameId);
  if (!s.oppTimeoutsUsed) s.oppTimeoutsUsed = [];

  if (s.oppTimeoutsUsed.includes(lengthMins)) {
    s.oppTimeoutsUsed = s.oppTimeoutsUsed.filter(m => m !== lengthMins);
    const idx = s.events.findLastIndex(e => e.type === 'opp_timeout' && (e.period === s.period || (s.period === 0 && !e.period)));
    if (idx !== -1) s.events.splice(idx, 1);
    _setLiveScore(gameId, s);
    saveLiveScores();
    afterScore(gameId);
    showToast('Opp Timeout removed');
    return;
  }

  pauseGameTimer(gameId);
  s.oppTimeoutsUsed = [...s.oppTimeoutsUsed, lengthMins];
  _setLiveScore(gameId, s);
  _pendingClock = getCurrentClockStr(gameId);
  _doRecordDirect(gameId, 'opp_timeout');
}

// ─── CLOCK PROMPT ─────────────────────────────────────────────────────────────

let _pendingClock    = '';   // clock value bridged from prompt → recording
let _clockCallback   = null; // called with the entered time (or '' to skip)

/** Show the clock-prompt bottom sheet. callback(clockStr) fires when confirmed. */
function promptClock(callback) {
  _clockCallback = callback;
  const input = $('clock-prompt-input');
  if (input) input.value = '';
  $('clock-prompt')?.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _openModal('clock-prompt');
  // Auto-focus input after paint (overrides _trapFocus default — both target the input)
  setTimeout(() => $('clock-prompt-input')?.focus(), 80);
}

function confirmClockPrompt(val) {
  $('clock-prompt')?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  _closeModal('clock-prompt');
  const cb = _clockCallback;
  _clockCallback = null;
  if (cb) cb((val || '').trim());
}

function skipClockPrompt() { confirmClockPrompt(''); }

// ─── EVENT PICKER MODAL ───────────────────────────────────────────────────────

let _pickerGameId   = null;
let _pickerType     = 'goal';
let _pickerSixOnFive = false;

function openEventPicker(gameId, eventType) {
  const _doOpenPicker = () => {
    const isSixOnFive = eventType === 'goal_6v5';
    const realType    = isSixOnFive ? 'goal' : eventType;

    // Direct events — record immediately with the captured clock
    if (realType === 'timeout') { _doRecordDirect(gameId, 'timeout'); return; }

    const roster = getRosterPlayers(gameId);
    if (!roster.length && realType === 'goal') {
      recordEventForPlayer(gameId, 'goal', '', '', isSixOnFive);
      return;
    }

    _pickerGameId    = gameId;
    _pickerType      = realType;
    _pickerSixOnFive = isSixOnFive;

    const TITLES = {
      goal:         'Who scored?',
      assist:       'Who assisted?',
      steal:        'Who got the steal?',
      turnover:     'Who committed the turnover?',
      sprint_won:   'Who won the sprint?',
      field_block:  'Who got the field block?',
      exclusion:    'Who was excluded?',
      brutality:    'Brutality foul — who?',
      earned_excl:  'Who earned the exclusion?',
      save:         'Who made the save?',
    };

    const titleEl = $('roster-modal-title');
    const row6v5  = $('roster-6v5-row');
    const list    = $('roster-modal-list');
    const extraOptions = [];
    if (realType === 'goal') {
      extraOptions.push(
        { key: 'sixOnFive', label: '6-on-5 power play goal', checked: isSixOnFive, group: 'goal-mode' },
        { key: 'counter', label: 'Counter', checked: false, group: 'goal-mode' }
      );
    } else if (realType === 'steal') {
      extraOptions.push({ key: 'forcedBallUnder', label: 'Forced Ball Under', checked: false });
    } else if (realType === 'turnover') {
      extraOptions.push({ key: 'inside2m', label: 'Inside 2m', checked: false });
    }

    if (titleEl) titleEl.textContent = TITLES[realType] || 'Select Player';
    if (row6v5) {
      row6v5.classList.toggle('hidden', !extraOptions.length);
      row6v5.innerHTML = extraOptions.map(opt => `
        <label class="roster-6v5-label">
          <input type="checkbox" id="roster-extra-${opt.key}" class="roster-6v5-checkbox"${opt.checked ? ' checked' : ''}${opt.group ? ` data-exclusive-group="${opt.group}"` : ''}>
          <span>${escHtml(opt.label)}</span>
        </label>`).join('');
      row6v5.querySelectorAll('[data-exclusive-group]').forEach(el => {
        el.addEventListener('change', () => {
          if (!el.checked) return;
          row6v5.querySelectorAll(`[data-exclusive-group="${el.getAttribute('data-exclusive-group')}"]`).forEach(other => {
            if (other !== el) other.checked = false;
          });
        });
      });
    }

    // For saves, show only goalkeepers; for everything else show full roster
    const goalieOnly    = realType === 'save';
    const displayRoster = goalieOnly
      ? sortedRoster(roster).filter(p => isGoalie(p.cap))
      : sortedRoster(roster);

    if (realType === 'save' && displayRoster.length === 1) {
      const player = displayRoster[0];
      recordEventForPlayer(gameId, 'save', player.cap, `${player.first} ${player.last}`);
      return;
    }

    list.innerHTML = '';
    if (realType === 'sprint_won') {
      const oppBtn = document.createElement('button');
      oppBtn.className = 'roster-player-btn roster-player-btn-opp';
      oppBtn.innerHTML = `
        <span class="roster-cap">OPP</span>
        <span class="roster-name">Opponent won the sprint</span>`;
      oppBtn.addEventListener('click', () => {
        recordEventDirect(gameId, 'opp_sprint_won');
        closeEventPicker();
      });
      list.appendChild(oppBtn);
    }
    displayRoster.forEach(player => {
      const btn = document.createElement('button');
      btn.className = 'roster-player-btn';
      btn.innerHTML = `
        <span class="roster-cap">${player.cap ? '#'+escHtml(player.cap) : 'GK'}</span>
        <span class="roster-name">${escHtml(player.first)} ${escHtml(player.last)}</span>`;
      btn.addEventListener('click', () => {
        const extra = {
          sixOnFive: !!$('roster-extra-sixOnFive')?.checked || _pickerSixOnFive,
          counter: !!$('roster-extra-counter')?.checked,
          forcedBallUnder: !!$('roster-extra-forcedBallUnder')?.checked,
          inside2m: !!$('roster-extra-inside2m')?.checked,
        };
        recordEventForPlayer(gameId, _pickerType, player.cap, `${player.first} ${player.last}`, extra);
        closeEventPicker();
      });
      list.appendChild(btn);
    });

    $('roster-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    _openModal('roster-modal');
  };
  // Always use auto-clock — no manual prompt needed.
  _pendingClock = getCurrentClockStr(gameId);
  _doOpenPicker();
}

// Backward-compat alias
function openRosterPicker(gameId) { openEventPicker(gameId, 'goal'); }

function closeEventPicker() {
  $('roster-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  _closeModal('roster-modal');
  _pickerGameId = null;
  const row = $('roster-6v5-row');
  if (row) row.innerHTML = '';
}
function closeRosterPicker() { closeEventPicker(); }

// ─── RESULT MANAGEMENT ────────────────────────────────────────────────────────

function setResult(gameId, result) {
  const scopedKey = _scopedGameKey(gameId);
  const previous = state.results[scopedKey] ?? state.results[_gameIdOnly(gameId)] ?? null;
  _setResultForGame(gameId, result);
  renderScheduleTab();
  renderScoresTab();
  renderHistoryTab();
  renderPossibleTab();
  // Trigger a calendar re-sync if active
  if (state.syncActive && state.accessToken) syncToCalendar();
  showUndoToast(`Result set to ${resultLabel(result)}`, () => {
    if (previous == null) delete state.results[scopedKey];
    else state.results[scopedKey] = previous;
    _saveResults();
    renderScheduleTab();
    renderScoresTab();
    renderHistoryTab();
    renderPossibleTab();
    if (state.syncActive && state.accessToken) syncToCalendar();
  }, { timeoutMs: 3500 });
}

function setBracketResult(stepKey, result) {
  const previous = state.bracketResults[stepKey] ?? null;
  state.bracketResults[stepKey] = state.bracketResults[stepKey] === result ? null : result;
  localStorage.setItem(STORE.BRACKET_RESULTS, JSON.stringify(state.bracketResults));
  renderPossibleTab();
  renderNextGameCard(); // bracket projection may have advanced
  showUndoToast(`Bracket result set to ${result}`, () => {
    if (previous == null) delete state.bracketResults[stepKey];
    else state.bracketResults[stepKey] = previous;
    localStorage.setItem(STORE.BRACKET_RESULTS, JSON.stringify(state.bracketResults));
    renderPossibleTab();
    renderNextGameCard();
  }, { timeoutMs: 3500 });
}

/** Clear all manual Win/Loss marks from the device */
function clearManualResults() {
  if (confirm('Clear all your manual Win/Loss marks? This will move games back to the Schedule and Scores tabs.')) {
    const previous = { ...state.results };
    state.results = {};
    localStorage.removeItem(STORE.RESULTS);
    
    // Refresh all tabs
    renderScheduleTab();
    renderScoresTab();
    renderHistoryTab();
    renderPossibleTab();
    renderSettingsTab(); // update button state if needed
    
    if (typeof showToast === 'function') {
      showUndoToast('Manual results cleared.', () => {
        state.results = previous;
        _saveResults();
        renderScheduleTab();
        renderScoresTab();
        renderHistoryTab();
        renderPossibleTab();
        renderSettingsTab();
      });
    }
  }
}


// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────

function ensureTokenClient() {
  if (state.tokenClient) return;
  if (!window.google?.accounts?.oauth2) return;
  // If a spectator is already signed in via Firebase, skip the account-picker popup
  const hint = (typeof fbGetUser === 'function' && fbGetUser()?.email) || undefined;
  state.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id:  CONFIG.CLIENT_ID,
    scope:      CONFIG.SCOPES,
    callback:   handleTokenResponse,
    ...(hint ? { login_hint: hint } : {}),
  });
}

function handleTokenResponse(resp) {
  if (resp.error) {
    showToast('Sign-in failed: ' + resp.error);
    updateSyncBadge('error');
    return;
  }
  state.accessToken = resp.access_token;
  state.tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
  if (state.pendingAction) {
    const fn = state.pendingAction;
    state.pendingAction = null;
    fn();
  }
}

/** Check if running inside Capacitor native app */
function _isNativePlatform() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

// ─── PLAY INTEGRITY (Android only) ────────────────────────────────────────────
// Requests a Play Integrity token from the device, then verifies it against our
// Vercel edge function which calls Google's Play Integrity API.
// Result is cached for 60 minutes — the token is single-use for the nonce but
// the device/app reputation verdict doesn't change during a session.

let _integrityVerdict = null;   // cached { verdict, ts } — null = not yet checked
let _integrityPending = null;   // in-flight Promise to avoid duplicate requests

/** Generate a cryptographically random base64url nonce (24 bytes = 192 bits). */
function _generateNonce() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Check Play Integrity on Android.
 * Returns an object: { ok: true } on PLAY_RECOGNIZED / meets device integrity,
 *                    { ok: false, reason } on failure or unrecognized device.
 * On iOS or web, always returns { ok: true } (not applicable).
 * Results are cached for 60 minutes per session.
 */
async function checkPlayIntegrity() {
  // Only meaningful on Android native
  if (!_isNativePlatform() || window.Capacitor?.getPlatform?.() !== 'android') {
    return { ok: true };
  }

  // Return cached verdict if fresh (< 60 min)
  if (_integrityVerdict && (Date.now() - _integrityVerdict.ts) < 60 * 60 * 1000) {
    return _integrityVerdict.result;
  }

  // Deduplicate concurrent calls
  if (_integrityPending) return _integrityPending;

  _integrityPending = (async () => {
    try {
      const plugin = window.Capacitor?.Plugins?.PlayIntegrity;
      if (!plugin) {
        console.warn('[integrity] PlayIntegrity plugin not available');
        return { ok: true }; // fail-open so existing users aren't blocked
      }

      const nonce = _generateNonce();
      const { token } = await plugin.requestToken({ nonce });

      const res = await fetch('https://ebwp-push.sarah-new.workers.dev/verify-integrity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      });

      if (!res.ok) {
        console.warn('[integrity] Verification endpoint returned', res.status);
        return { ok: true }; // fail-open on backend errors
      }

      const payload = await res.json();

      // Evaluate the verdict
      const appVerdict    = payload?.tokenPayloadExternal?.appIntegrity?.appRecognitionVerdict    || '';
      const deviceVerdict = payload?.tokenPayloadExternal?.deviceIntegrity?.deviceRecognitionVerdict || [];

      const appOk    = appVerdict === 'PLAY_RECOGNIZED';
      const deviceOk = deviceVerdict.includes('MEETS_DEVICE_INTEGRITY');

      const result = appOk && deviceOk
        ? { ok: true }
        : { ok: false, reason: `app=${appVerdict} device=${JSON.stringify(deviceVerdict)}` };

      _integrityVerdict = { result, ts: Date.now() };
      return result;

    } catch (e) {
      console.warn('[integrity] Check failed:', e.message);
      return { ok: true }; // fail-open — don't block legitimate users on API errors
    } finally {
      _integrityPending = null;
    }
  })();

  return _integrityPending;
}

function requestToken(callback) {
  if (_isNativePlatform()) {
    // ── Native iOS: GIS doesn't work in WKWebView ──────────────────────
    // Use the SocialLogin plugin to get a fresh access token with calendar scope
    _requestTokenNative(callback);
    return;
  }

  // ── Web browser: use GIS token client ──────────────────────────────
  ensureTokenClient();
  if (!state.tokenClient) {
    showToast('Google Sign-In not ready yet — try again in a moment.');
    return;
  }
  state.pendingAction = callback;
  if (state.accessToken && Date.now() < state.tokenExpiry) {
    const fn = state.pendingAction;
    state.pendingAction = null;
    fn();
    return;
  }
  const alreadyConsented = !!state.accessToken || (typeof fbIsSignedIn === 'function' && fbIsSignedIn());
  state.tokenClient.requestAccessToken({ prompt: alreadyConsented ? '' : 'consent' });
}

async function _requestTokenNative(callback) {
  // If we already have a valid token, use it
  if (state.accessToken && Date.now() < state.tokenExpiry) {
    callback();
    return;
  }

  try {
    const plugin = window.Capacitor?.Plugins?.SocialLogin;
    if (!plugin) {
      showToast('Calendar sync not available on this device.');
      return;
    }

    // Request Google sign-in with calendar scope to get an access token
    const result = await plugin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile', 'https://www.googleapis.com/auth/calendar'],
      },
    });

    console.info('[calendar] SocialLogin result keys:', JSON.stringify(result, null, 2).substring(0, 500));

    // The plugin may return accessToken as:
    // - { token: "..." } (object with token property)
    // - "..." (plain string)  
    // - nested under result.result
    const r = result?.result || result;
    let token = null;

    // Try accessToken.token (object format)
    if (r?.accessToken?.token) {
      token = r.accessToken.token;
    }
    // Try accessToken as string
    else if (typeof r?.accessToken === 'string') {
      token = r.accessToken;
    }
    // Try serverAuthCode (would need exchange, but log it)
    else {
      console.warn('[calendar] No accessToken found. Available keys:', Object.keys(r || {}));
      console.warn('[calendar] Full result:', JSON.stringify(r).substring(0, 300));
    }

    if (token) {
      state.accessToken = token;
      state.tokenExpiry = Date.now() + 50 * 60 * 1000; // ~50 min
      callback();
    } else {
      showToast('Could not get calendar access — please try again.');
    }
  } catch (e) {
    console.error('[calendar] native token error:', e);
    if (!e.message?.includes('cancel')) {
      showToast('Calendar sign-in failed — ' + e.message);
    }
  }
}

// ─── CALENDAR API ─────────────────────────────────────────────────────────────

async function calFetch(path, options = {}) {
  const resp = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${state.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${resp.status}`);
  }
  if (resp.status === 204) return {};
  return resp.json();
}

async function listCalendars() {
  const data = await calFetch('/users/me/calendarList');
  return (data.items || [])
    .filter(c => c.accessRole === 'owner' || c.accessRole === 'writer')
    .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
}

function buildEventPayload(game, isPool = true) {
  const start = parseGameTime(game.dateISO, game.time);
  if (!start) return null;
  const end = new Date(start.getTime() + CONFIG.EVENT_DURATION_MIN * 60000);

  const title = isPool
    ? `Team vs ${game.opponent || 'TBD'} — ${TOURNAMENT.name}`
    : `Team ${game.desc} (Projected) — ${TOURNAMENT.name}`;

  const lines = [
    `Tournament: ${TOURNAMENT.name}`,
    `Date: ${game.date || game.dateISO}`,
    game.pool     ? `Pool: ${game.pool}`         : null,
    game.gameNum  ? `Game: ${game.gameNum}`      : null,
    game.cap      ? `Team Caps: ${game.cap}`      : null,
    !isPool       ? `Bracket: ${game.desc}`      : null,
    '',
    'Added by Eggbeater Water Polo App',
  ].filter(l => l !== null).join('\n');

  return {
    summary:     title,
    location:    game.location || '',
    description: lines,
    start: { dateTime: toISOLocal(start), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end:   { dateTime: toISOLocal(end),   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    extendedProperties: {
      private: {
        [CONFIG.EVENT_TAG]: 'true',
        gameId: game.id || game.gameNum || '',
        tournamentId: TOURNAMENT.id,
      },
    },
  };
}

async function syncToCalendar() {
  if (!state.selectedCalId || !state.accessToken) return;

  updateSyncBadge('syncing');
  renderSyncCard(); // show spinner

  try {
    // Fetch existing tagged events for this tournament
    const existingRes = await calFetch(
      `/calendars/${encodeURIComponent(state.selectedCalId)}/events` +
      `?privateExtendedProperty=${encodeURIComponent(CONFIG.EVENT_TAG + '=true')}` +
      `&privateExtendedProperty=${encodeURIComponent('tournamentId=' + TOURNAMENT.id)}` +
      `&maxResults=50&singleEvents=true`
    );
    const existingEvents = existingRes.items || [];
    const existingByGameId = {};
    for (const ev of existingEvents) {
      const gId = ev.extendedProperties?.private?.gameId;
      if (gId) existingByGameId[gId] = ev;
    }

    let created = 0, updated = 0, skipped = 0;

    // Sync all pool play games
    for (const game of getTournamentGames()) {
      const payload = buildEventPayload(game, true);
      if (!payload) { skipped++; continue; }
      const existing = existingByGameId[game.id];
      if (existing) {
        await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events/${existing.id}`,
          { method: 'PUT', body: JSON.stringify(payload) });
        updated++;
      } else {
        await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events`,
          { method: 'POST', body: JSON.stringify(payload) });
        created++;
      }
      delete existingByGameId[game.id];
    }

    // Sync next projected bracket step (as a tentative "possible" event)
    const nextInfo = findNextGameOrProjected();
    if (nextInfo?.type === 'bracket') {
      const bGame = nextInfo.game;
      const bId   = `bracket-${bGame.gameNum}`;
      const payload = buildEventPayload({ ...bGame, id: bId, dateISO: bGame.dateISO, time: bGame.time }, false);
      if (payload) {
        const existing = existingByGameId[bId];
        if (existing) {
          await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events/${existing.id}`,
            { method: 'PUT', body: JSON.stringify(payload) });
          updated++;
        } else {
          await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events`,
            { method: 'POST', body: JSON.stringify(payload) });
          created++;
        }
        delete existingByGameId[bId];
      }
    }

    // Delete stale events (old bracket projections, removed games)
    for (const stale of Object.values(existingByGameId)) {
      await calFetch(`/calendars/${encodeURIComponent(state.selectedCalId)}/events/${stale.id}`,
        { method: 'DELETE' });
    }

    state.lastSyncTime = new Date();
    updateSyncBadge('ok');
    renderSyncCard();

    const parts = [];
    if (created) parts.push(`${created} added`);
    if (updated) parts.push(`${updated} updated`);
    if (!parts.length) parts.push('Calendar up to date');
    showToast('📅 ' + parts.join(' · '), 'ok');

    // Schedule next auto-sync
    clearInterval(state.syncIntervalId);
    state.syncIntervalId = setInterval(() => {
      if (state.accessToken && Date.now() < state.tokenExpiry) syncToCalendar();
    }, CONFIG.SYNC_INTERVAL_MS);

  } catch (err) {
    updateSyncBadge('error');
    renderSyncCard();
    showToast('Sync failed: ' + err.message);
  }
}

// ─── CALENDAR CHOOSER ─────────────────────────────────────────────────────────

function startCalendarSetup() {
  requestToken(async () => {
    try {
      const cals = await listCalendars();
      renderCalendarChooser(cals);
      // Hide bottom nav while choosing
      document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
      $('view-calendar').classList.remove('hidden');
    } catch (err) {
      showToast('Could not load calendars: ' + err.message);
    }
  });
}

function renderCalendarChooser(calendars) {
  const list = $('calendars-list');
  list.innerHTML = '';
  calendars.forEach(cal => {
    const item = document.createElement('label');
    item.className = 'calendar-item';
    item.innerHTML = `
      <input type="radio" name="cal" value="${escHtml(cal.id)}">
      <span class="cal-dot" style="background:${escHtml(cal.backgroundColor || '#1440b0')}"></span>
      <span class="cal-name">${escHtml(cal.summary)}${cal.primary ? ' (Primary)' : ''}</span>
    `;
    item.querySelector('input').addEventListener('change', () => {
      state.selectedCalId   = cal.id;
      state.selectedCalName = cal.summary;
      localStorage.setItem(STORE.CALENDAR_ID,   cal.id);
      localStorage.setItem(STORE.CALENDAR_NAME, cal.summary);
      state.syncActive = true;
      // Return to schedule tab and sync
      switchTab('schedule');
      requestToken(() => syncToCalendar());
    });
    list.appendChild(item);
  });
}

function cancelCalendarChoice() {
  switchTab('schedule');
}

// ─── SYNC BADGE (header) ──────────────────────────────────────────────────────

function updateSyncBadge(status) {
  const badge = $('sync-badge');
  if (!state.syncActive) { badge.classList.add('hidden'); return; }
  badge.classList.remove('hidden');
  const map = {
    ok:      { text: '✓ Synced',   cls: 'badge-ok' },
    syncing: { text: '↻ Syncing',  cls: 'badge-syncing' },
    error:   { text: '⚠ Sync err', cls: 'badge-error' },
  };
  const { text, cls } = map[status] || map.ok;
  badge.textContent  = text;
  badge.className    = `sync-badge ${cls}`;
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  $(`view-${tab}`)?.classList.remove('hidden');
  // For tabs in bottom nav, highlight them; for "more" tabs, highlight "more"
  const primaryTabs = ['schedule','scores','history'];
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isActive = primaryTabs.includes(tab)
      ? btn.dataset.tab === tab
      : btn.dataset.tab === 'more';
    btn.classList.toggle('nav-active', isActive);
    // Keep aria-selected in sync for the three primary tab buttons (role="tab")
    if (btn.hasAttribute('aria-selected')) {
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
  });
  // Also update desktop-only sidebar items
  document.querySelectorAll('.desktop-nav-item').forEach(btn => {
    btn.classList.toggle('nav-active', btn.dataset.tab === tab);
  });
  updateTScoreTabVisibility();
  if (tab !== 'scores') _setLiveBanner(false); // hide banner when leaving scores tab
  // Compact header on Scores tab — hides the subtitle (dates/venue) to free vertical space
  const _hdr = document.querySelector('.app-header');
  if (_hdr) { _hdr.classList.toggle('scores-compact', tab === 'scores'); if (tab !== 'scores') _hdr.classList.remove('scoring-active'); syncHeaderHeight(); }
  // Sync selected tab to native Liquid Glass tab bar (iOS only, no-op elsewhere)
  try { window.webkit?.messageHandlers?.tabSync?.postMessage({ tab }); } catch(_){}
  if (tab === 'possible')    renderPossibleTab();
  if (tab === 'roster')      renderRosterTab();
  if (tab === 'scores')      renderScoresTab();
  if (tab === 'tournscore')  renderTournScoreTab();
  if (tab === 'help')        renderHelpTab();
  if (tab === 'settings')    renderSettingsTab();
}

/** Toggle the More drawer bottom sheet */
function toggleMoreDrawer() {
  const el = $('more-drawer');
  if (!el) return;
  el.classList.toggle('hidden');
  // Sync aria-expanded on the More button
  const moreBtn = $('more-btn');
  if (moreBtn) moreBtn.setAttribute('aria-expanded', el.classList.contains('hidden') ? 'false' : 'true');
  updateTScoreTabVisibility();
}

/** Navigate from the More drawer — auto-closes drawer */
function moreNavigate(tab) {
  const el = $('more-drawer');
  if (el) {
    el.classList.add('hidden');
    const moreBtn = $('more-btn');
    if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
  }
  switchTab(tab);
}

/** Show/hide the T-Score item in the More drawer based on whether a director package is available. */
function updateTScoreTabVisibility() {
  // Drawer item
  const drawerItem = document.querySelector('.more-drawer-tscore');
  if (drawerItem) {
    const hasPkg = !!(getDirectorPkg() || state.tscorePkg);
    drawerItem.classList.toggle('hidden', !hasPkg);
  }
}

/** Render the Settings tab with team picker, favorites, and club change */
function renderSettingsTab() {
  const el = $('view-settings');
  if (!el) return;

  const currentClubId = getAppClubId() || '';
  const clubName = localStorage.getItem('ebwp-club-name') || currentClubId;

  // Auth state
  const fbAvailable = typeof firebase !== 'undefined' && typeof firebase.auth === 'function';
  const user = fbAvailable ? firebase.auth().currentUser : null;

  // Silently re-check RC entitlement every time the Settings tab opens.
  // This catches cases where logIn() hadn't completed yet on the first load.
  // Pass the best available email so RC can match the dashboard grant.
  if (user && getResolvedSpectatorTier() !== 'spectator') {
    if (typeof _checkSpectatorSubscription === 'function') {
      const rcId = user.email || localStorage.getItem('ebwp-auth-email') || user.uid;
      _checkSpectatorSubscription(rcId);
    }
  }

  // Theme preference
  const themePref = getThemePref();
  function themePill(value, label) {
    const active = themePref === value;
    const style = active
      ? 'background:var(--royal);color:#fff;border-color:var(--royal)'
      : 'background:transparent;color:var(--gray-600);border-color:var(--gray-200)';
    return `<button onclick="applyThemePref('${value}');renderSettingsTab()" style="padding:6px 14px;border-radius:20px;font-size:0.82rem;font-weight:700;border:1.5px solid;cursor:pointer;font-family:inherit;transition:all .15s;${style}">${label}</button>`;
  }

  el.innerHTML = `
    <div class="card tab-card" style="padding:12px 16px;margin-bottom:8px">
      <h2 style="font-size:1.1rem;margin:0 0 2px 0">${appT('settings_title')}</h2>
      <p class="step-desc" style="margin:0;font-size:0.78rem">${appT('settings_subtitle')}</p>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${appT('settings_team_selection')}</div>
      <div id="settings-team-picker" class="settings-team-picker"></div>
      ${_isNativePlatform() ? `
      <div class="settings-item" onclick="openLASettingsModal()" style="border-top:1px solid var(--gray-100)">
        <span class="settings-item-icon">📡</span>
        <div class="settings-item-text">
          <div class="settings-item-label">${window.Capacitor?.getPlatform?.() === 'ios' ? 'Live Activities' : 'Live Updates'}</div>
          <div class="settings-item-value">Auto-start for favorited teams</div>
        </div>
        <span style="color:var(--gray-300);font-size:1.1rem">›</span>
      </div>` : ''}
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${appT('settings_my_clubs')}</div>
      <div id="settings-clubs-list">
        <div class="settings-item" style="justify-content:center;color:var(--gray-400);font-size:0.85rem">Loading clubs…</div>
      </div>
      <div class="settings-item" onclick="_settingsAddClub()" style="border-top:1px solid var(--gray-100)">
        <span class="settings-item-icon" style="color:var(--royal)">＋</span>
          <div class="settings-item-text">
            <div class="settings-item-label">${appT('settings_add_club')}</div>
          <div class="settings-item-value">${appT('settings_add_club_desc')}</div>
        </div>
      </div>
      <div class="settings-item" onclick="_returnToSplash()" style="border-top:1px solid var(--gray-100)">
        <span class="settings-item-icon">🏠</span>
        <div class="settings-item-text">
          <div class="settings-item-label">${appT('settings_return_splash')}</div>
          <div class="settings-item-value">${appT('settings_return_splash_desc')}</div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${appT('settings_appearance')}</div>
      <div style="padding:12px 16px">
        <div style="font-size:0.82rem;color:var(--gray-500);margin-bottom:10px">${appT('settings_appearance_desc')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${themePill('light', '☀️ Light')}
          ${themePill('dark', '🌙 Dark')}
          ${themePill('system', '⚙️ System')}
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${appT('settings_calendar')}</div>
      <div id="sync-section"></div>
      <div id="push-btn-container"></div>
      ${_isNativePlatform() ? `
      <div class="settings-item" onclick="openNativeNotificationSettings()" style="border-top:1px solid var(--gray-100)">
        <span class="settings-item-icon">🔔</span>
        <div class="settings-item-text">
          <div class="settings-item-label">Open Notification Settings</div>
          <div class="settings-item-value">Recover alerts if permissions were blocked</div>
        </div>
        <span style="color:var(--gray-300);font-size:1.1rem">›</span>
      </div>
      <div class="settings-item" onclick="openNativeAppSettings()" style="border-top:1px solid var(--gray-100)">
        <span class="settings-item-icon">⚙️</span>
        <div class="settings-item-text">
          <div class="settings-item-label">Open App Settings</div>
          <div class="settings-item-value">Review permissions and system restrictions</div>
        </div>
        <span style="color:var(--gray-300);font-size:1.1rem">›</span>
      </div>` : ''}
      </div>

    <div class="settings-section">
      <div class="settings-section-title">${appT('settings_subscription')}</div>
      ${getResolvedSpectatorTier() === 'spectator' ? `
        <div class="settings-item" style="cursor:default">
          <span style="background:#16a34a;color:white;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;flex-shrink:0">Spectator ✓</span>
          <div class="settings-item-text">
            <div class="settings-item-label">Spectator Monthly — Active</div>
            <div class="settings-item-value">Stats history · Bracket · Live Follow · $4.99/mo</div>
          </div>
        </div>` : `
        <div class="settings-item" onclick="showSpectatorUpgradeSheet()">
          <span class="settings-item-icon">👑</span>
          <div class="settings-item-text">
            <div class="settings-item-label" style="color:#16a34a">Upgrade to Spectator Monthly</div>
            <div class="settings-item-value">Stats · Bracket · Live Follow · $4.99/mo</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`}
      <div style="padding:6px 16px 8px;font-size:0.7rem;color:var(--gray-400)">
        ${user ? `Subscription account: ${escHtml(user.email || localStorage.getItem('ebwp-auth-email') || user.uid)}` : 'Sign in (Account section below) to activate a subscription'}
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${appT('settings_help')}</div>
      <div class="settings-item" onclick="switchTab('help')">
        <span class="settings-item-icon">📖</span>
        <div class="settings-item-text">
          <div class="settings-item-label">${appT('settings_how_to_use')}</div>
          <div class="settings-item-value">${appT('settings_how_to_use_desc')}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>

    <div class="settings-section" style="margin-bottom:24px">
      <div class="settings-section-title">${appT('settings_account')}</div>
      ${user ? `
        <div class="settings-item" style="cursor:default">
          <span class="settings-item-icon" style="font-size:1.3rem">☁️</span>
          <div class="settings-item-text">
            <div class="settings-item-label">${escHtml(user.displayName || 'Signed In')}</div>
            <div class="settings-item-value">${escHtml(user.email || localStorage.getItem('ebwp-auth-email') || '')}</div>
          </div>
        </div>
        <div class="settings-item" onclick="fbSignOut()" style="border-top:1px solid var(--gray-100)">
          <span class="settings-item-icon">🚪</span>
          <div class="settings-item-text">
            <div class="settings-item-label" style="color:#dc2626">Sign Out</div>
          </div>
        </div>
      ` : `
        <div class="settings-item" onclick="fbSignIn()">
          <span class="settings-item-icon">👤</span>
          <div class="settings-item-text">
            <div class="settings-item-label">Sign In with Google</div>
            <div class="settings-item-value">Sync preferences across devices</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      `}
    </div>

    <div class="settings-section" style="margin-bottom:30px">
      <div class="settings-section-title">⚙️ Data Management</div>
      <div class="settings-item" onclick="clearManualResults()">
        <span class="settings-item-icon">🧹</span>
        <div class="settings-item-text">
          <div class="settings-item-label" style="color:#dc2626">Reset manual Win/Loss results</div>
          <div class="settings-item-value">Undo accidental win marks</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>

  `;

  // Render team pills into the settings area
  _renderSettingsTeamPicker();
  // Load club list asynchronously
  _renderSettingsClubList();
  // Render calendar sync + push notification widgets
  renderSyncCard();
  renderPushButton();
}

/** Fetch joined clubs from worker and render quick-switch list in Settings */
async function _renderSettingsClubList() {
  const container = $('settings-clubs-list');
  if (!container) return;

  const currentClubId = getAppClubId() || '';
  const joined = getJoinedClubs();

  let allClubs = [];
  try {
    const res = await fetch(WORKER + '/clubs');
    if (res.ok) {
      const data = await res.json();
      allClubs = data.clubs || [];
    }
  } catch (e) {
    console.warn('[settings] fetch /clubs error:', e.message);
  }

  const clubs = allClubs.filter(c => joined.includes(c.id));

  if (!clubs.length) {
    container.innerHTML = `
      <div class="settings-item" style="cursor:default">
        <span class="settings-item-icon">🤽‍♀️</span>
        <div class="settings-item-text">
          <div class="settings-item-label">${escHtml(localStorage.getItem('ebwp-club-name') || currentClubId || 'No club')}</div>
          <div class="settings-item-value">Use "Add Club" below to join a club</div>
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  for (const club of clubs) {
    const isCurrent = club.id === currentClubId;
    const checkMark = isCurrent ? '<span class="current-club-check">✓</span>' : '';
    const clubIcon = club.logo
      ? `<img src="${escHtml(club.logo)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1.5px solid var(--gray-200)">`
      : `<span style="font-size:1.3rem">🤽‍♀️</span>`;
    html += `
      <div class="settings-item${isCurrent ? ' current-club-item' : ''}" onclick="${isCurrent ? '' : `_settingsSwitchClub('${escHtml(club.id)}','${escHtml(club.name || club.id)}','${escHtml(club.clubType || '')}')`}" ${isCurrent ? 'style="cursor:default"' : ''}>
        <span class="settings-item-icon" style="display:flex;align-items:center;justify-content:center">${clubIcon}</span>
        <div class="settings-item-text">
          <div class="settings-item-label${isCurrent ? ' current-club-name' : ''}">${escHtml(club.name || club.id)}</div>
          ${isCurrent ? '<div class="settings-item-value">Current club</div>' : ''}
        </div>
        ${checkMark}
        <button onclick="event.stopPropagation();_settingsRemoveClub('${escHtml(club.id)}','${escHtml(club.name || club.id)}')"
                style="background:none;border:none;color:var(--gray-300);font-size:1.1rem;cursor:pointer;padding:4px 6px;border-radius:6px;flex-shrink:0"
                title="Remove club" aria-label="Remove ${escHtml(club.name || club.id)}">×</button>
      </div>
    `;
  }
  container.innerHTML = html;
}

/** Quick-switch to a different club from Settings */
function _settingsSwitchClub(clubId, clubName, clubType) {
  // Clear ALL old club's data (tournament, history, scores, roster, etc.)
  // but keep my-players (favorite player stats persist across clubs)
  localStorage.removeItem('ebwp-team-keys');   // legacy global key
  localStorage.removeItem('ebwp-team-key');    // legacy compat key
  // Note: ebwp-fav-groups-{clubId} and ebwp-team-keys-{clubId} are NOT cleared
  // — each club's favorites and team selection are stored per-club and persist
  localStorage.removeItem('ebwp-tournament-id');
  localStorage.removeItem('ebwp-snapshot');
  localStorage.removeItem('ebwp-results');
  localStorage.removeItem('ebwp-bracket-results');
  localStorage.removeItem('ebwp-live-scores');
  localStorage.removeItem('ebwp-history');
  localStorage.removeItem('ebwp-roster');
  // Also clear any team-specific history/data (ebwp-history-*, ebwp-sched-*)
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('ebwp-history-') || k.startsWith('ebwp-sched-') ||
              k.startsWith('ebwp-mpc-'))) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  // Note: ebwp-my-players is NOT cleared — favorite player stats persist across clubs

  // Set the new club
  localStorage.setItem('ebwp-club-id', clubId);
  localStorage.setItem('ebwp-club-name', clubName);
  if (clubType) {
    localStorage.setItem('ebwp-club-type', clubType);
  } else {
    localStorage.removeItem('ebwp-club-type');
  }
  // Reload to re-initialize with the new club using the canonical join link format.
  window.location.href = window.location.pathname + '?join=' + encodeURIComponent(clubId);
}

/** Remove a club from the joined list; returns to splash if it was the only club */
function _settingsRemoveClub(clubId, clubName) {
  const joined = getJoinedClubs();
  const isOnly = joined.length <= 1;
  const isCurrent = clubId === getAppClubId();
  const snapshot = {
    joined: [...joined],
    clubId: localStorage.getItem('ebwp-club-id'),
    clubName: localStorage.getItem('ebwp-club-name'),
    clubType: localStorage.getItem('ebwp-club-type'),
    teamKeys: localStorage.getItem('ebwp-team-keys'),
    teamKey: localStorage.getItem('ebwp-team-key'),
    tournamentId: localStorage.getItem('ebwp-tournament-id'),
    snapshot: localStorage.getItem('ebwp-snapshot'),
  };

  scheduleUndoableAction(`Remove ${clubName}?`, () => {
    removeJoinedClub(clubId);

    if (isOnly || isCurrent) {
      localStorage.removeItem('ebwp-club-id');
      localStorage.removeItem('ebwp-club-name');
      localStorage.removeItem('ebwp-club-type');
      localStorage.removeItem('ebwp-team-keys');
      localStorage.removeItem('ebwp-team-key');
      localStorage.removeItem('ebwp-tournament-id');
      localStorage.removeItem('ebwp-snapshot');
      window.location.href = window.location.pathname;
      return;
    }

    showToast(`Removed ${clubName}`, 'ok');
    _renderSettingsClubList();
  }, {
    onCanceled: () => {
      localStorage.setItem('ebwp-joined-clubs', JSON.stringify(snapshot.joined));
      _renderSettingsClubList();
    },
  });
}

/** Show inline add-club input in Settings */
function _settingsAddClub() {
  const container = $('settings-clubs-list');
  if (!container) return;
  // Check if already showing
  if (container.querySelector('.settings-join-row')) return;

  const row = document.createElement('div');
  row.className = 'settings-join-row';
  row.style.cssText = 'display:flex;gap:8px;padding:10px 16px;border-top:1px solid var(--gray-100)';
  row.innerHTML = `
    <input id="settings-join-input" type="text" placeholder="Enter club code"
           style="flex:1;padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:0.88rem;font-family:inherit">
    <button onclick="_settingsJoinClub()" style="padding:9px 14px;background:var(--royal);color:white;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;white-space:nowrap">Join</button>
  `;
  container.parentElement.insertBefore(row, container.nextSibling.nextSibling);

  const errDiv = document.createElement('div');
  errDiv.id = 'settings-join-error';
  errDiv.style.cssText = 'font-size:0.8rem;color:#dc2626;padding:0 16px 8px;min-height:14px';
  row.parentElement.insertBefore(errDiv, row.nextSibling);

  setTimeout(() => document.getElementById('settings-join-input')?.focus(), 100);
}

/** Handle joining a club from Settings */
async function _settingsJoinClub() {
  const input = document.getElementById('settings-join-input');
  const errEl = document.getElementById('settings-join-error');
  if (!input) return;
  const code = input.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!code) { if (errEl) errEl.textContent = 'Please enter a club code'; return; }

  try {
    const res = await fetch(WORKER + '/clubs');
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    const club = (data.clubs || []).find(c => c.id === code);
    if (!club) {
      if (errEl) errEl.textContent = `Club "${code}" not found. Check with your admin.`;
      return;
    }
    addJoinedClub(code);
    if (typeof showToast === 'function') showToast(`Joined ${club.name || code}!`);
    _renderSettingsClubList(); // refresh the list
    // Remove join row
    const row = document.querySelector('.settings-join-row');
    if (row) row.remove();
    if (errEl) errEl.remove();
  } catch (e) {
    if (errEl) errEl.textContent = 'Could not connect. Try again.';
  }
}

/** Render team pills inside the Settings tab */
function _renderSettingsTeamPicker() {
  const container = $('settings-team-picker');
  if (!container) return;

  const isHS = localStorage.getItem('ebwp-club-type') === 'highschool';
  const selectedTeams = getSelectedTeams();
  const favGroups = getFavGroups();

  if (isHS) {
    const groups = [
      { label: 'Boys',  keys: [{key:'boys-varsity',label:'Varsity'},{key:'boys-jv',label:'JV'}] },
      { label: 'Girls', keys: [{key:'girls-varsity',label:'Varsity'},{key:'girls-jv',label:'JV'}] },
    ];
    function buildStar(key) {
      const isFav = favGroups.includes(key);
      const cls = isFav ? 'age-star age-star-on' : 'age-star';
      const icon = isFav ? '★' : '☆';
      return `<span class="${cls}" onclick="event.stopPropagation();toggleFavGroup('${escHtml(key)}');_renderSettingsTeamPicker();renderHeader()" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${icon}</span>`;
    }
    let html = '<div class="age-pill-row" style="gap:6px">';
    for (const g of groups) {
      const anyActive = g.keys.some(k => selectedTeams.includes(k.key));
      const pillCls = anyActive ? 'age-pill age-pill-active age-pill-compound' : 'age-pill';
      if (!anyActive) {
        html += `<button class="${pillCls}" onclick="onAgeGroupToggle('${g.keys[0].key}');_renderSettingsTeamPicker();renderHeader()">${escHtml(g.label)}</button>`;
      } else {
        const groupKeys = g.keys.map(k => k.key).join(',');
        const subBtns = g.keys.map(k => {
          const cls = selectedTeams.includes(k.key) ? 'age-sub-btn age-sub-active' : 'age-sub-btn';
          return `<button class="${cls}" onclick="event.stopPropagation();onAgeGroupToggle('${escHtml(k.key)}');_renderSettingsTeamPicker();renderHeader()">${buildStar(k.key)}${escHtml(k.label)}</button>`;
        }).join('');
        html += `<div class="${pillCls}">
          <button class="age-pill-label" style="padding:6px 10px;font-weight:700;background:none;border:none;color:inherit;cursor:pointer" onclick="event.stopPropagation();deselectHSGroup('${groupKeys}');_renderSettingsTeamPicker();renderHeader()">${escHtml(g.label)}</button>
          <span class="age-pill-sep">·</span>
          ${subBtns}
        </div>`;
      }
    }
    html += '</div>';
    container.innerHTML = html;
  } else {
    // Club teams: standard pill layout with A/B sub-pills for multi-team tournaments
    const anySelected = selectedTeams.length > 0;
    let html = '<div class="age-pill-row" style="gap:6px;flex-wrap:wrap">';
    for (const opt of TEAM_OPTIONS) {
      const active = selectedTeams.includes(opt.key);
      const isFav = favGroups.includes(opt.key);
      const starCls = isFav ? 'age-star age-star-on' : 'age-star';
      const starIcon = isFav ? '★' : '☆';
      const starBtn = `<span class="${starCls}" onclick="event.stopPropagation();toggleFavGroup('${escHtml(opt.key)}');_renderSettingsTeamPicker();renderHeader()">${starIcon}</span>`;

      // Check if this age group has a multi-team tournament
      const tournament = TEAM_CACHE[opt.key]?.tournament || null;
      const validTeams = getValidTeamLettersForGroup(opt.key);
      const isMulti = tournament && validTeams.length > 1;

      if (active && isMulti) {
        const effective = getEffectiveTeamLettersForGroup(opt.key);
        const allOn = effective.length === validTeams.length;
        const subBtns = [
          `<button class="${allOn ? 'age-sub-btn age-sub-active' : 'age-sub-btn'}" onclick="event.stopPropagation();switchTeam('ALL','${escHtml(opt.key)}');_renderSettingsTeamPicker();renderHeader()">All</button>`,
          ...validTeams.map(letter => {
            const lbl = tournament.teamLabels?.[letter] || `Team ${letter}`;
            const isOn = effective.length === 1 && effective[0] === letter;
            const subCls = isOn ? 'age-sub-btn age-sub-active' : 'age-sub-btn';
            return `<button class="${subCls}" onclick="event.stopPropagation();switchTeam('${letter}','${escHtml(opt.key)}');_renderSettingsTeamPicker();renderHeader()">${escHtml(lbl)}</button>`;
          })
        ].join('');

        html += `<div class="age-pill age-pill-active age-pill-compound">
          <button class="age-pill-label" style="padding:6px 10px;font-weight:700;background:none;border:none;color:inherit;cursor:pointer" onclick="event.stopPropagation();onAgeGroupToggle('${escHtml(opt.key)}');_renderSettingsTeamPicker();renderHeader()">${starBtn}${escHtml(opt.label)}</button>
          <span class="age-pill-sep">·</span>
          ${subBtns}
        </div>`;
      } else {
        const cls = active ? 'age-pill age-pill-active' : 'age-pill';
        html += `<button class="${cls}" onclick="onAgeGroupToggle('${escHtml(opt.key)}');_renderSettingsTeamPicker();renderHeader()">
          ${starBtn}
          ${escHtml(opt.label)}
        </button>`;
      }
    }
    html += '</div>';
    if (anySelected) {
      html += `<button onclick="_resetTeamSelection()" style="margin-top:8px;background:none;border:none;color:var(--gray-400);font-size:0.78rem;cursor:pointer;padding:2px 0;font-family:inherit">Reset selection</button>`;
    }
    container.innerHTML = html;
  }
}

/** Clear current club selection and reload to show the club picker (splash screen) */
function _returnToSplash() {
  const snapshot = {
    clubId: localStorage.getItem('ebwp-club-id'),
    clubName: localStorage.getItem('ebwp-club-name'),
    clubType: localStorage.getItem('ebwp-club-type'),
    teamKeys: localStorage.getItem('ebwp-team-keys'),
    teamKey: localStorage.getItem('ebwp-team-key'),
    tournamentId: localStorage.getItem('ebwp-tournament-id'),
    snapshot: localStorage.getItem('ebwp-snapshot'),
  };
  scheduleUndoableAction('Return to the splash screen?', () => {
    localStorage.removeItem('ebwp-club-id');
    localStorage.removeItem('ebwp-club-name');
    localStorage.removeItem('ebwp-club-type');
    localStorage.removeItem('ebwp-team-keys');
    localStorage.removeItem('ebwp-team-key');
    localStorage.removeItem('ebwp-tournament-id');
    localStorage.removeItem('ebwp-snapshot');
    window.location.href = window.location.pathname;
  }, {
    onCanceled: () => {
      snapshot.clubId == null ? localStorage.removeItem('ebwp-club-id') : localStorage.setItem('ebwp-club-id', snapshot.clubId);
      snapshot.clubName == null ? localStorage.removeItem('ebwp-club-name') : localStorage.setItem('ebwp-club-name', snapshot.clubName);
      snapshot.clubType == null ? localStorage.removeItem('ebwp-club-type') : localStorage.setItem('ebwp-club-type', snapshot.clubType);
      snapshot.teamKeys == null ? localStorage.removeItem('ebwp-team-keys') : localStorage.setItem('ebwp-team-keys', snapshot.teamKeys);
      snapshot.teamKey == null ? localStorage.removeItem('ebwp-team-key') : localStorage.setItem('ebwp-team-key', snapshot.teamKey);
      snapshot.tournamentId == null ? localStorage.removeItem('ebwp-tournament-id') : localStorage.setItem('ebwp-tournament-id', snapshot.tournamentId);
      snapshot.snapshot == null ? localStorage.removeItem('ebwp-snapshot') : localStorage.setItem('ebwp-snapshot', snapshot.snapshot);
    },
  });
}

/** Clear all selected age groups and re-render */
function _resetTeamSelection() {
  const clubId = getAppClubId();
  const scopedTeamKeysKey = clubId ? `ebwp-team-keys-${clubId}` : null;
  const scopedFavKey = clubId ? `ebwp-fav-groups-${clubId}` : null;
  const snapshot = {
    scopedTeamKeys: scopedTeamKeysKey ? localStorage.getItem(scopedTeamKeysKey) : null,
    scopedFavs: scopedFavKey ? localStorage.getItem(scopedFavKey) : null,
    teamKeys: localStorage.getItem('ebwp-team-keys'),
    teamKey: localStorage.getItem('ebwp-team-key'),
    selectedTeam: localStorage.getItem('ebwp-selected-team'),
  };
  scheduleUndoableAction('Reset selected age groups?', () => {
    if (scopedTeamKeysKey) localStorage.removeItem(scopedTeamKeysKey);
    if (scopedFavKey) localStorage.removeItem(scopedFavKey);
    localStorage.removeItem('ebwp-team-keys');
    localStorage.removeItem('ebwp-team-key');
    localStorage.removeItem('ebwp-selected-team');
    _renderSettingsTeamPicker();
    renderHeader();
  }, {
    onCanceled: () => {
      if (scopedTeamKeysKey) snapshot.scopedTeamKeys == null ? localStorage.removeItem(scopedTeamKeysKey) : localStorage.setItem(scopedTeamKeysKey, snapshot.scopedTeamKeys);
      if (scopedFavKey) snapshot.scopedFavs == null ? localStorage.removeItem(scopedFavKey) : localStorage.setItem(scopedFavKey, snapshot.scopedFavs);
      snapshot.teamKeys == null ? localStorage.removeItem('ebwp-team-keys') : localStorage.setItem('ebwp-team-keys', snapshot.teamKeys);
      snapshot.teamKey == null ? localStorage.removeItem('ebwp-team-key') : localStorage.setItem('ebwp-team-key', snapshot.teamKey);
      snapshot.selectedTeam == null ? localStorage.removeItem('ebwp-selected-team') : localStorage.setItem('ebwp-selected-team', snapshot.selectedTeam);
    },
  });
}

// ─── RENDER: SCORES TAB ───────────────────────────────────────────────────────

function _withScoreTournamentContext(groupKey, fn) {
  const savedTournament = window.TOURNAMENT;
  const savedHistory = window.HISTORY_SEED;
  const savedActiveAgeGroup = _activeAgeGroup;
  const cache = groupKey ? TEAM_CACHE[groupKey] : null;
  if (cache) {
    window.TOURNAMENT = cache.tournament;
    window.HISTORY_SEED = cache.history || [];
    _activeAgeGroup = groupKey;
  }
  try {
    return fn(cache);
  } finally {
    if (cache) {
      window.TOURNAMENT = savedTournament;
      window.HISTORY_SEED = savedHistory;
      _activeAgeGroup = savedActiveAgeGroup;
    }
  }
}

function openScoreDetail(gameId, groupKey = '', ageGroupLabel = '', viewerOnly = false) {
  state.scoreDetail = { gameId, groupKey, ageGroupLabel, viewerOnly: !!viewerOnly, scorerMode: false };
  state.scoreDetailTab = 'summary';
  renderScoresTab();
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function openScorerDetail(gameId, groupKey = '', ageGroupLabel = '') {
  if (!state.scorerDetailsOpen) state.scorerDetailsOpen = {};
  state.scorerDetailsOpen[gameId] = true;
  state.scoreDetail = { gameId, groupKey, ageGroupLabel, viewerOnly: false, scorerMode: true };
  state.scoreDetailTab = 'summary';
  renderScoresTab();
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function handleOpenScorerClick(evt, gameId, groupKey = '', ageGroupLabel = '') {
  evt?.stopPropagation?.();
  openScorerDetail(gameId, groupKey, ageGroupLabel);
  return false;
}

function handleToggleLiveClick(evt, gameId) {
  evt?.stopPropagation?.();
  toggleLiveActivity(gameId);
  return false;
}

function closeScoreDetail() {
  state.scoreDetail = null;
  state.scoreDetailTab = 'summary';
  renderScoresTab();
}

function setScoreDetailTab(tab) {
  state.scoreDetailTab = tab === 'play' ? 'play' : 'summary';
  renderScoresTab();
}

function openHistoryGameDetail(tournamentId, gameIndex) {
  state.historyDetail = { tournamentId, gameIndex };
  state.historyDetailTab = 'summary';
  renderHistoryTab();
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function closeHistoryGameDetail() {
  state.historyDetail = null;
  state.historyDetailTab = 'summary';
  renderHistoryTab();
}

function setHistoryDetailTab(tab) {
  state.historyDetailTab = tab === 'play' ? 'play' : 'summary';
  renderHistoryTab();
}

function _historyGamesSource() {
  const history = getHistoryForActiveTeam().filter(h => h.id !== TOURNAMENT.id);
  const virtualT = _getVirtualHistoryEntry();
  return virtualT ? [virtualT, ...history] : history;
}

function _getHistoryDetailContext() {
  const ctx = state.historyDetail;
  if (!ctx) return null;
  const tournament = _historyGamesSource().find(h => h.id === ctx.tournamentId);
  const game = tournament?.games?.[ctx.gameIndex];
  if (!tournament || !game) return null;
  return { tournament, game, gameIndex: ctx.gameIndex };
}

function _historyGameScoreData(tournament, game) {
  const ls = game.liveScore || {};
  const events = Array.isArray(ls.events)
    ? ls.events
    : (Array.isArray(ls.goals) ? ls.goals.map(g2 => ({ type: g2.side === 'team' ? 'goal' : 'opp_goal', ...g2 })) : []);
  const recomputed = events.length ? recomputeScores(events) : null;
  const teamScore = typeof game.teamScore === 'number' ? game.teamScore
    : (game.teamScore !== '' && game.teamScore != null ? Number(game.teamScore) : null);
  const oppScore = typeof game.oppScore === 'number' ? game.oppScore
    : (game.oppScore !== '' && game.oppScore != null ? Number(game.oppScore) : null);
  return {
    team: recomputed ? recomputed.team : (typeof ls.team === 'number' ? ls.team : (teamScore ?? 0)),
    opp: recomputed ? recomputed.opp : (typeof ls.opp === 'number' ? ls.opp : (oppScore ?? 0)),
    clock: ls.clock || '',
    period: ls.period || 0,
    gameState: (game.result || ls.gameState === 'final') ? 'final' : (ls.gameState || 'pre'),
    events,
    timerRunning: false,
    timerSecondsLeft: 0,
    teamTimeoutsUsed: ls.teamTimeoutsUsed || [],
    oppTimeoutsUsed: ls.oppTimeoutsUsed || [],
  };
}

function buildHistoryGameDetailView(ctx) {
  const { tournament, game } = ctx;
  const score = _historyGameScoreData(tournament, game);
  const gameView = {
    ...game,
    date: game.date || tournament.dates || '',
    gameNum: game.gameNum || game.id || '',
  };
  const ageGroupLabel = tournament.name || '';
  return `
    <div class="scores-detail-shell history-detail-shell">
      <div class="scores-detail-topbar">
        <button class="scores-detail-back" onclick="closeHistoryGameDetail()">← Back to History</button>
        ${ageGroupLabel ? `<span class="scores-detail-pill">${escHtml(ageGroupLabel)}</span>` : ''}
      </div>
      <div class="scores-detail-hero">
        <div class="scores-detail-hero-top">
          <div>
            <div class="scores-detail-kicker">${escHtml(tournament.name || 'Game Details')}</div>
            <div class="scores-detail-title">${escHtml(_teamDisplayNameForGame(gameView, TOURNAMENT.clubName || 'Team'))} vs ${escHtml(normalizeOpponentName(game.opponent || 'TBD'))}</div>
          </div>
          ${game.gameNum ? `<div class="scores-detail-game-num">${escHtml(game.gameNum)}</div>` : ''}
        </div>
      </div>
      <div class="scores-detail-tabs">
        <button class="scores-detail-tab ${state.historyDetailTab !== 'play' ? 'active' : ''}" onclick="setHistoryDetailTab('summary')">Summary</button>
        <button class="scores-detail-tab ${state.historyDetailTab === 'play' ? 'active' : ''}" onclick="setHistoryDetailTab('play')">Play-by-Play</button>
      </div>
      ${state.historyDetailTab === 'play'
        ? `<div class="score-detail-play card tab-card">${score.events.some(e => e.type !== 'game_state') ? buildEventLog(score.events, score.period || 4, gameView) : `<div class="score-detail-empty">No play-by-play events recorded.</div>`}</div>`
        : `<div class="score-detail-summary-host">${_buildScoreDetailSummary(gameView, score, ageGroupLabel)}</div>`}
    </div>`;
}

function getScoreCardTab(gameId) {
  const key = _gameRef(gameId);
  return state.scoreCardTabs?.[key] === 'play' ? 'play' : 'summary';
}

function setScoreCardTab(gameId, tab) {
  if (!state.scoreCardTabs) state.scoreCardTabs = {};
  state.scoreCardTabs[_gameRef(gameId)] = tab === 'play' ? 'play' : 'summary';
  renderScoresTab();
}

function enableScoreDetailScorer() {
  if (!state.scoreDetail) return;
  state.scoreDetail.scorerMode = true;
  renderScoresTab();
}

function getScoreDetailContext() {
  const detail = state.scoreDetail;
  if (!detail?.gameId) return null;
  return _withScoreTournamentContext(detail.groupKey || '', () => {
    const games = Array.isArray(TOURNAMENT.games) ? TOURNAMENT.games : [];
    const game = games.find(g => _gameRef(g) === detail.gameId);
    if (!game) return null;
    return {
      ...detail,
      game: detail.groupKey ? { ...game, _groupKey: detail.groupKey } : game
    };
  });
}

function buildScoresListCard(g, viewerOnly = false, ageGroupLabel = '') {
  const gid = _gameRef(g);
  const openArgs = `${JSON.stringify(gid)},${JSON.stringify(g._groupKey || '')},${JSON.stringify(ageGroupLabel || '')},${viewerOnly ? 'true' : 'false'}`;
  const s = getLiveScore(g);
  const hasScore = (s.team > 0 || s.opp > 0 || (s.gameState && s.gameState !== 'pre'));
  const statusLabel = s.gameState === 'final'
    ? 'Final'
    : (PERIOD_LABELS[s.period] || (isGameLive(gid) ? 'Live' : 'Scheduled'));
  const timeMeta = g.time && g.time !== 'TBD'
    ? `${escHtml(g.time)}${(g.date || g.dateISO) ? ` · ${escHtml(g.date || formatDateGroupLabel(g.dateISO))}` : ''}`
    : escHtml(g.date || (g.dateISO ? formatDateGroupLabel(g.dateISO) : 'Time TBD'));
  const capIcon = g.cap === 'Dark' ? '🔵' : g.cap === 'White' ? '⚪' : '';
  const locationHtml = TOURNAMENT.location ? buildLocationLink(TOURNAMENT.location) : '';
  const liveChip = isGameLive(gid) ? `<span class="scores-status-chip live">Live</span>` : '';
  const finalChip = s.gameState === 'final' || _getResultForGame(g)
    ? `<span class="scores-status-chip final">Final</span>` : '';
  const canScore = !TOURNAMENT.scoringPassword || isScorerUnlockedForTournament(TOURNAMENT);
  const scorerOpenArgs = `${JSON.stringify(gid)},${JSON.stringify(g._groupKey || '')},${JSON.stringify(ageGroupLabel || '')}`;
  const actionBtn = (!viewerOnly && canScore)
    ? `<button class="scores-open-scorer-btn" onclick="return handleOpenScorerClick(event, ${scorerOpenArgs})" title="${escHtml(appT('scorer_open'))}">✏️ ${escHtml(appT('scorer_open'))}</button>`
    : `<button class="follow-live-btn-sm" onclick="return handleToggleLiveClick(event, '${escHtml(gid)}')" title="${escHtml(appT('common_follow_live'))}">📡 ${escHtml(appT('common_follow_live'))}</button>`;

  return `
    <div class="scores-list-card ${g.cap === 'Dark' ? 'cap-dark-bg' : g.cap === 'White' ? 'cap-white-bg' : ''}"
         role="button"
         tabindex="0"
         onclick="openScoreDetail(${openArgs})"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openScoreDetail(${openArgs})}">
      ${ageGroupLabel ? `<div class="scores-list-age-label">${escHtml(ageGroupLabel)}</div>` : ''}
      <div class="scores-list-top">
        <div class="scores-list-vs">vs ${escHtml(normalizeOpponentName(g.opponent || 'TBD'))}</div>
        <div class="scores-list-top-right">
          ${liveChip}${finalChip}
          ${g.gameNum ? `<span class="scores-list-game-num">${escHtml(g.gameNum)}</span>` : ''}
        </div>
      </div>
      <div class="scores-list-meta">
        <span>🕐 ${timeMeta}</span>
        ${g.pool ? `<span>${swimmerEmoji()} ${escHtml(g.pool)}${capIcon ? ` · ${capIcon} ${escHtml(g.cap)} Caps` : ''}</span>` : (capIcon ? `<span>${capIcon} ${escHtml(g.cap)} Caps</span>` : '')}
        ${locationHtml}
      </div>
      <div class="scores-list-bottom">
        <div class="scores-list-scoreline">
          <span class="scores-list-team">${escHtml(TOURNAMENT.clubName || 'Team')}</span>
          <span class="scores-list-score">${hasScore ? `${s.team} - ${s.opp}` : '—'}</span>
          <span class="scores-list-team opp">${escHtml(normalizeOpponentName(g.opponent || 'Opp'))}</span>
        </div>
        <div class="scores-list-actions">
          <span class="scores-list-status">${escHtml(statusLabel)}</span>
          ${actionBtn}
        </div>
      </div>
    </div>`;
}

function buildScoreDetailPlayByPlay(g) {
  const s = getLiveScore(g);
  const events = s.events || [];
  const hasEvents = events.some(e => e.type !== 'game_state');
  return `
    <div class="score-detail-play card tab-card">
      ${hasEvents
        ? buildEventLog(events, s.period, g)
        : `<div class="score-detail-empty">No play-by-play events yet.</div>`}
      </div>`;
}

function buildEmbeddedScoreCardDetail(game, viewerOnly = false, ageGroupLabel = '') {
  const s = getLiveScore(game);
  const canScore = !TOURNAMENT.scoringPassword || isScorerUnlockedForTournament(TOURNAMENT);
  const tab = getScoreCardTab(game);
  const gid = escHtml(_gameRef(game));
  const scorerOpenArgs = `${JSON.stringify(_gameRef(game))},${JSON.stringify(_contextGroupKey(game))},${JSON.stringify(ageGroupLabel || '')}`;
  const scorerAction = (!viewerOnly && canScore)
    ? `<button class="scores-open-scorer-btn score-detail-inline-scorer-btn" onclick="return handleOpenScorerClick(event, ${scorerOpenArgs})">✏️ ${escHtml(appT('scorer_open'))}</button>`
    : '';

  return `
    <div class="score-card-detail">
      <div class="scores-detail-tabs score-card-detail-tabs">
        <button class="scores-detail-tab ${tab !== 'play' ? 'active' : ''}" onclick="setScoreCardTab('${gid}','summary')">Summary</button>
        <button class="scores-detail-tab ${tab === 'play' ? 'active' : ''}" onclick="setScoreCardTab('${gid}','play')">Play-by-Play</button>
      </div>
      ${tab === 'play'
        ? buildScoreDetailPlayByPlay(game)
        : `<div class="score-detail-summary-host">
            ${_buildScoreDetailSummary(game, s, ageGroupLabel, scorerAction)}
          </div>`}
    </div>`;
}

function buildScoreDetailView(ctx) {
  return _withScoreTournamentContext(ctx.groupKey || '', () => {
    const { game, viewerOnly, ageGroupLabel } = ctx;
    const s = getLiveScore(game);
    const canScore = !TOURNAMENT.scoringPassword || isScorerUnlockedForTournament(TOURNAMENT);
    const summaryAction = (!viewerOnly && canScore && !ctx.scorerMode)
      ? `<button class="scores-open-scorer-btn score-detail-inline-scorer-btn" onclick="enableScoreDetailScorer()">✏️ ${escHtml(appT('scorer_open'))}</button>`
      : '';
    const scorerPanel = (!viewerOnly && canScore && ctx.scorerMode)
      ? _buildScoreDetailScorerPanel(game, s)
      : '';
    return `
      <div class="scores-detail-shell">
        <div class="scores-detail-topbar">
          <button class="scores-detail-back" onclick="closeScoreDetail()">← Back to Scores</button>
          ${ageGroupLabel ? `<span class="scores-detail-pill">${escHtml(ageGroupLabel)}</span>` : ''}
        </div>
        <div class="scores-detail-hero">
          <div class="scores-detail-hero-top">
            <div>
              <div class="scores-detail-kicker">${escHtml(TOURNAMENT.name || 'Game Details')}</div>
              <div class="scores-detail-title">${escHtml(_teamDisplayNameForGame(game, TOURNAMENT.clubName || 'Team'))} vs ${escHtml(normalizeOpponentName(game.opponent || 'TBD'))}</div>
            </div>
            ${game.gameNum ? `<div class="scores-detail-game-num">${escHtml(game.gameNum)}</div>` : ''}
          </div>
        </div>
        <div class="scores-detail-tabs">
          <button class="scores-detail-tab ${state.scoreDetailTab !== 'play' ? 'active' : ''}" onclick="setScoreDetailTab('summary')">Summary</button>
          <button class="scores-detail-tab ${state.scoreDetailTab === 'play' ? 'active' : ''}" onclick="setScoreDetailTab('play')">Play-by-Play</button>
        </div>
        ${state.scoreDetailTab === 'play'
          ? buildScoreDetailPlayByPlay(game)
          : `<div class="score-detail-summary-host">
              ${scorerPanel}
              ${_buildScoreDetailSummary(game, s, ageGroupLabel, summaryAction)}
            </div>`}
      </div>`;
  });
}

function renderScoresTab() {
  const el = $('view-scores');
  if (!el) return;

  // ── Director "Submit Live Scores" section (prepended regardless of scorer mode) ──
  const dirPkg = getDirectorPkg();
  const dirGames = dirPkg?.directorGames || [];
  let dirHtml = '';
  if (dirGames.length) {
    // Restore unlock state from localStorage (keyed by code so it resets on new publish)
    if (!state.dirScorerUnlocked) {
      const savedCode = localStorage.getItem(DIR_SCORER_CODE);
      if (localStorage.getItem(DIR_SCORER_KEY) === '1' && savedCode === dirPkg.code) {
        state.dirScorerUnlocked = true;
      }
    }
    dirHtml = buildDirScoreSection(dirPkg, dirGames);
  }

  const detailCtx = getScoreDetailContext();
  if (state.scoreDetail && detailCtx) {
    _setLiveBanner(isGameLive(detailCtx.gameId));
    el.innerHTML = dirHtml + buildScoreDetailView(detailCtx);
    return;
  }
  if (state.scoreDetail && !detailCtx) state.scoreDetail = null;

  // Multi-slot: show read-only scores per (ageGroup × letter) slot
  const scoreSlots = getExpandedTeamSlots();
  if (scoreSlots.length > 1) {
    // Check unlock state per-slot: global TOURNAMENT may differ from individual slot tournaments,
    // causing isScorerUnlocked() to return false even when the scorer IS unlocked for a slot.
    const _savedTmpT = window.TOURNAMENT;
    let anySlotHasPassword = false, anySlotUnlocked = false;
    for (const { groupKey } of scoreSlots) {
      const c = TEAM_CACHE[groupKey];
      if (c) {
        window.TOURNAMENT = c.tournament;
        if (c.tournament.scoringPassword) anySlotHasPassword = true;
        if (isScorerUnlockedForTournament(c.tournament)) anySlotUnlocked = true;
      }
    }
    window.TOURNAMENT = _savedTmpT;
    const scorerLocked = anySlotHasPassword && !anySlotUnlocked;
    const loginBar = anySlotUnlocked
      ? `<div class="scorer-tab-bar"><span class="scorer-tab-label">🔓 Scorer Mode Active</span><button class="scorer-tab-lock-btn" onclick="lockScoring()">🔒 Lock</button></div>`
      : (scorerLocked
        ? `<div class="scorer-gate-bar"><button class="scorer-gate-btn" onclick="openScoringPasswordModal()">🔒 Login to Score</button></div>`
        : '');
    let html = loginBar;
    const gameNumVal = g => parseInt((g.gameNum || '').replace(/\D/g, ''), 10) || 9999;
    for (const { groupKey, letter } of scoreSlots) {
      const cache = TEAM_CACHE[groupKey];
      const allGames = cache ? (cache.tournament.games || []) : [];
      const firstTeam = cache && Array.isArray(cache.tournament.teams) ? cache.tournament.teams[0] : 'A';
      const letters = letter ? [letter] : getTeamLettersForGroup(groupKey);
      // If no letters configured for this group (single-team setup), show all games —
      // same logic as getTournamentGames() which returns all games when letters is null.
      const games = (!letters.length
        ? allGames
        : allGames.filter(g => g.team ? letters.includes(g.team) : letters.includes(firstTeam)))
        .map(g => ({ ...g, _groupKey: groupKey }));
      const today = _localDateStr();
      // Filter out games with results (they move to history) and games from past days
const active = games.filter(g => (!g.dateISO || g.dateISO >= today) && !_getResultForGame(g));

      // Slot label — lean header row (not a full card wrapper)
      const slotLabel = _groupSectionLabelFor(groupKey, letter);
      html += `<div class="scores-slot-header"><span class="scores-slot-label">${escHtml(slotLabel)}</span></div>`;

      if (!active.length) {
        html += `<p class="empty-msg" style="padding:8px 12px 16px">No active games.</p>`;
        continue;
      }

      // Sort by date+time then game number (parseGameTime combines both — fixes same-day ordering)
      const _gt = g => { const t = parseGameTime(g.dateISO, g.time); return t ? t.getTime() : (g.dateISO ? new Date(g.dateISO + 'T00:00:00').getTime() : Infinity); };
      active.sort((a, b) => {
        const td = _gt(a) - _gt(b);
        return td !== 0 ? td : gameNumVal(a) - gameNumVal(b);
      });

      // Group by date — prefer dateISO as key so same-day games with/without g.date stay together
      const byDate = {};
      const dateOrder = [];
      for (const g of active) {
        const dk = g.dateISO || g.date || 'Unknown';
        if (!byDate[dk]) { byDate[dk] = []; dateOrder.push(dk); }
        byDate[dk].push(g);
      }
      // Switch TOURNAMENT context to this slot's tournament so buildGameCard uses the
      // right password, clubName, and scoring config (restored below after each slot).
      const _savedT = window.TOURNAMENT, _savedH = window.HISTORY_SEED;
      if (cache) { window.TOURNAMENT = cache.tournament; window.HISTORY_SEED = cache.history || []; }
      _activeAgeGroup = groupKey;
      for (const dk of dateOrder) {
        html += `<div class="date-group-header">${escHtml(formatDateGroupLabel(dk))}</div>`;
        html += `<div class="games-section">`;
        const slotCanScore = !window.TOURNAMENT?.scoringPassword || isScorerUnlockedForTournament(window.TOURNAMENT);
        for (const g of byDate[dk]) {
          html += slotCanScore
            ? buildGameCard(g, false, true, slotLabel)
            : buildGameCard(g, true, true, slotLabel);
        }
        html += `</div>`;
      }
      _activeAgeGroup = null;
      if (cache) { window.TOURNAMENT = _savedT; window.HISTORY_SEED = _savedH; }
    }
    html += `<div style="text-align:center;padding:18px 0 4px;font-size:0.82rem;color:rgba(255,255,255,0.85)">New to box scoring? <a href="https://eggbeater.app/scoring-guide.html" target="_blank" rel="noopener" style="color:#fff;font-weight:600">Read the guide here →</a></div>`;
    el.innerHTML = dirHtml + html;
    return;
  }

  // ── Tab-level: scorer not unlocked → show live scores (viewer mode) with scorer login in corner ─
  if (TOURNAMENT.scoringPassword && !isScorerUnlocked()) {

    const games = getTournamentGames();
    const activeGames = games.filter(g => !_getResultForGame(g));
    const gameNumVal = g => parseInt((g.gameNum || '').replace(/\D/g, ''), 10) || 9999;
    const _gt2 = g => { const t = parseGameTime(g.dateISO, g.time); return t ? t.getTime() : (g.dateISO ? new Date(g.dateISO + 'T00:00:00').getTime() : Infinity); };
    activeGames.sort((a, b) => {
      const td = _gt2(a) - _gt2(b);
      return td !== 0 ? td : gameNumVal(a) - gameNumVal(b);
    });

    const anyLive = activeGames.some(g => isGameLive(_gameRef(g)));

    let cardsHtml = '';
    if (!activeGames.length) {
      cardsHtml = `<div class="card tab-card" style="text-align:center;padding:24px 16px">
          <div style="font-size:2rem;margin-bottom:8px">${swimmerEmoji(teamKey)}</div>
          <div style="font-weight:700;margin-bottom:4px">No games scheduled yet</div>
          <div style="color:var(--gray-600);font-size:0.88rem">Check back on tournament day.</div>
        </div>`;
    } else {
      const byDate = {};
      const dateOrder = [];
      for (const g of activeGames) {
        const d = g.dateISO || g.date || 'Unknown';
        if (!byDate[d]) { byDate[d] = []; dateOrder.push(d); }
        byDate[d].push(g);
      }
      for (const dateKey of dateOrder) {
        cardsHtml += `<div class="date-group-header">${escHtml(formatDateGroupLabel(dateKey))}</div><div class="games-section">`;
        for (const g of byDate[dateKey]) cardsHtml += buildGameCard(g, true, true);
        cardsHtml += `</div>`;
      }
    }

    _setLiveBanner(anyLive);
    const _guideLink = `<div style="text-align:center;padding:18px 0 4px;font-size:0.82rem;color:rgba(255,255,255,0.85)">New to box scoring? <a href="https://eggbeater.app/scoring-guide.html" target="_blank" rel="noopener" style="color:#fff;font-weight:600">Read the guide here →</a></div>`;
    el.innerHTML = dirHtml + `
        <div class="viewer-tab-bar">
          <span class="viewer-tab-label">${anyLive ? '🔴 Live Scores' : '📺 Scores'}</span>
          <button class="viewer-tab-login-btn" onclick="openScoringPasswordModal()">🔒 Login to Score</button>
        </div>
        ${cardsHtml}${_guideLink}`;
    return;
  }

  const games = getTournamentGames();
  if (!games.length) {
    const tName = TOURNAMENT.name ? `<strong>${escHtml(TOURNAMENT.name)}</strong>` : 'the upcoming tournament';
    const tDate = TOURNAMENT.dates ? ` on ${escHtml(TOURNAMENT.dates)}` : '';
    el.innerHTML = dirHtml + `<div class="card tab-card">
      <div class="history-header-row"><h2>Box Scores</h2></div>
      <div style="padding:20px 16px;text-align:center">
        <div style="font-size:2rem;margin-bottom:10px">${swimmerEmoji()}</div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:6px">Live scoring coming soon</div>
        <div style="color:var(--gray-600);font-size:0.88rem;line-height:1.55">
          Box scores and live game stats will be available here on tournament day${tDate}.<br><br>
          Check back once the schedule for ${tName} is posted.
        </div>
      </div>
    </div>`;
    return;
  }

  // Group games by date — filter out completed games (they appear in History tab)
  const activeGames = games.filter(g => !_getResultForGame(g));

  if (!activeGames.length) {
    el.innerHTML = dirHtml + `<div class="card tab-card">
      <div class="history-header-row"><h2>Box Scores</h2></div>
      <p class="empty-msg" style="padding:16px 0">All games complete — check the History tab for results.</p>
    </div>`;
    return;
  }

  // Sort by date+time then game number
  const gameNumVal = g => parseInt((g.gameNum || '').replace(/\D/g, ''), 10) || 9999;
  const _gt3 = g => { const t = parseGameTime(g.dateISO, g.time); return t ? t.getTime() : (g.dateISO ? new Date(g.dateISO + 'T00:00:00').getTime() : Infinity); };
  activeGames.sort((a, b) => {
    const td = _gt3(a) - _gt3(b);
    return td !== 0 ? td : gameNumVal(a) - gameNumVal(b);
  });

  const byDate = {};
  const dateOrder = [];
  for (const g of activeGames) {
    const d = g.dateISO || g.date || 'Unknown';
    if (!byDate[d]) { byDate[d] = []; dateOrder.push(d); }
    byDate[d].push(g);
  }

  // Live banner — shown when any game is being scored by another device
  const liveGames = games.filter(g => {
    const s = getLiveScore(g);
    return s?._remote && s.gameState && s.gameState !== 'pre'
      && (Date.now() - (s._broadcastAt || 0)) < 30 * 60 * 1000;
  });
  _setLiveBanner(liveGames.length > 0);

  // Single lock bar at the top when scorer is unlocked
  const lockBar = TOURNAMENT.scoringPassword
    ? `<div class="scorer-tab-bar">
         <span class="scorer-tab-label">🔓 Scorer Mode Active</span>
         <button class="scorer-tab-lock-btn" onclick="lockScoring()">🔒 Lock</button>
       </div>`
    : '';

  let html = lockBar;
  for (const dateKey of dateOrder) {
    html += `<div class="date-group-header">${escHtml(formatDateGroupLabel(dateKey))}</div>`;
    html += `<div class="games-section">`;
    for (const g of byDate[dateKey]) html += buildGameCard(g, false, true);
    html += `</div>`;
  }

  html += `<div style="text-align:center;padding:18px 0 4px;font-size:0.82rem;color:rgba(255,255,255,0.85)">New to box scoring? <a href="https://eggbeater.app/scoring-guide.html" target="_blank" rel="noopener" style="color:#fff;font-weight:600">Read the guide here →</a></div>`;
  el.innerHTML = dirHtml + html;
}

// ─── DIRECTOR LIVE SCORES ─────────────────────────────────────────────────────

function buildDirScheduleHtml(dirPkg) {
  const sched = dirPkg.importedSchedule || [];
  if (!sched.length) return '';
  // Group by date
  const byDate = {};
  for (const g of sched) {
    const d = g.date || g.dateISO || '';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(g);
  }
  let html = `<div style="margin-bottom:16px">
    <div style="font-size:0.75rem;font-weight:700;color:var(--royal);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Game Schedule</div>`;
  for (const [date, games] of Object.entries(byDate)) {
    if (date) html += `<div style="font-size:0.72rem;font-weight:700;color:var(--gray-500);margin:8px 0 4px">${escHtml(date)}</div>`;
    const sorted = [...games].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    for (const g of sorted) {
      html += `<div style="display:flex;gap:8px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--gray-100)">
        <div style="font-size:0.78rem;color:var(--gray-400);min-width:68px;flex-shrink:0">${escHtml(g.time || '')}</div>
        <div style="flex:1;font-size:0.88rem"><span style="font-weight:600">${escHtml(g.team1Name || '')}</span><span style="color:var(--gray-300);margin:0 5px">vs</span><span style="font-weight:600">${escHtml(g.team2Name || '')}</span></div>
        <div style="font-size:0.75rem;color:var(--gray-400);text-align:right">${escHtml(g.location || '')}</div>
      </div>`;
    }
  }
  html += '</div>';
  return html;
}

function buildDirScoreSection(dirPkg, dirGames) {
  const schedHtml = buildDirScheduleHtml(dirPkg);
  if (!state.dirScorerUnlocked) {
    // Locked: show schedule + unlock button + read-only scores if any exist
    const anyScores = Object.keys(state.dirScores).some(id => state.dirScores[id]?.status === 'final');
    const resultsHtml = anyScores ? buildDirStandingsHtml(dirGames) : '';
    return `
      <div class="card tab-card" id="dir-score-section">
        <div class="history-header-row">
          <h2>Submit Live Scores</h2>
          <span class="history-subtitle">${escHtml(dirPkg.tournamentName || '')}</span>
        </div>
        ${schedHtml}
        ${resultsHtml}
        <button class="btn" style="margin-top:${anyScores||schedHtml?'12':'0'}px" onclick="openDirScoringModal()">🔒 Unlock Score Entry</button>
      </div>`;
  }

  // Unlocked: score entry grid grouped by division
  const groups = {};
  for (const g of dirGames) {
    const key = (g.ageGroupName ? g.ageGroupName + ' · ' : '') + 'Division ' + (g.divisionName || '?');
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }

  let rows = '';
  for (const [label, grpGames] of Object.entries(groups)) {
    rows += `<div style="margin-bottom:14px">
      <div style="font-size:0.72rem;font-weight:700;color:var(--royal);text-transform:uppercase;margin-bottom:6px">${escHtml(label)}</div>`;
    for (const g of grpGames) {
      const sc = state.dirScores[g.id] || {};
      const isFinal = sc.status === 'final';
      rows += `
        <div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);flex-wrap:wrap">
          <div style="flex:1;min-width:140px;font-size:0.88rem">
            <span style="font-weight:600;color:var(--royal-dark)">${escHtml(g.team1Name || g.team1Seed)}</span>
            <span style="color:var(--gray-400);margin:0 5px">vs</span>
            <span style="font-weight:600;color:var(--royal-dark)">${escHtml(g.team2Name || g.team2Seed)}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="number" min="0" max="99" id="dir-s1-${escHtml(g.id)}"
                   value="${isFinal ? sc.score1 : ''}" placeholder="–"
                   style="width:46px;text-align:center;padding:5px 4px;border:1.5px solid var(--gray-300);border-radius:6px;font-size:1rem;font-weight:700">
            <span style="color:var(--gray-400);font-weight:700">–</span>
            <input type="number" min="0" max="99" id="dir-s2-${escHtml(g.id)}"
                   value="${isFinal ? sc.score2 : ''}" placeholder="–"
                   style="width:46px;text-align:center;padding:5px 4px;border:1.5px solid var(--gray-300);border-radius:6px;font-size:1rem;font-weight:700">
            <button class="btn${isFinal ? ' btn-ghost' : ''}" style="font-size:0.8rem;padding:5px 12px"
                    onclick="submitDirGameScore('${escHtml(g.id)}')">
              ${isFinal ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>`;
    }
    rows += '</div>';
  }

  const standingsHtml = Object.keys(state.dirScores).length ? buildDirStandingsHtml(dirGames) : '';

  return `
    <div class="card tab-card" id="dir-score-section">
      <div class="history-header-row">
        <h2>Submit Live Scores</h2>
        <button class="btn btn-ghost" style="font-size:0.78rem;padding:5px 12px" onclick="lockDirScoring()">🔒 Lock</button>
      </div>
      ${schedHtml}
      ${rows}
      ${standingsHtml ? `<div style="margin-top:14px;padding-top:12px;border-top:2px solid var(--gray-100)">${standingsHtml}</div>` : ''}
    </div>`;
}

function buildDirStandingsHtml(dirGames) {
  const divStats = {};
  for (const g of dirGames) {
    const sc = state.dirScores[g.id];
    if (!sc || sc.status !== 'final') continue;
    const divKey = (g.ageGroupName || '') + '|' + (g.divisionName || '');
    if (!divStats[divKey]) divStats[divKey] = { agName: g.ageGroupName, divName: g.divisionName, teams: {} };
    const ds = divStats[divKey].teams;
    const t1 = g.team1Name || g.team1Seed;
    const t2 = g.team2Name || g.team2Seed;
    if (!ds[t1]) ds[t1] = { w:0, l:0, t:0, gf:0, ga:0 };
    if (!ds[t2]) ds[t2] = { w:0, l:0, t:0, gf:0, ga:0 };
    ds[t1].gf += sc.score1; ds[t1].ga += sc.score2;
    ds[t2].gf += sc.score2; ds[t2].ga += sc.score1;
    if (sc.score1 > sc.score2)      { ds[t1].w++; ds[t2].l++; }
    else if (sc.score1 < sc.score2) { ds[t2].w++; ds[t1].l++; }
    else                             { ds[t1].t++; ds[t2].t++; }
  }
  if (!Object.keys(divStats).length) return '';
  let html = '<div style="font-size:0.8rem;font-weight:700;color:var(--gray-700);margin-bottom:8px">Standings</div>';
  for (const { agName, divName, teams } of Object.values(divStats)) {
    const sorted = Object.entries(teams).sort(([,a],[,b]) => {
      const pa = a.w*3+a.t, pb = b.w*3+b.t;
      return pa !== pb ? pb - pa : (b.gf-b.ga) - (a.gf-a.ga);
    });
    html += `<div style="margin-bottom:10px">
      <div style="font-size:0.72rem;font-weight:700;color:var(--royal);margin-bottom:4px">${escHtml(agName ? agName + ' · ' : '')}Division ${escHtml(divName)}</div>
      <table style="width:100%;font-size:0.82rem;border-collapse:collapse">
        <tr style="color:var(--gray-400);font-size:0.7rem;text-align:center">
          <th style="text-align:left;padding:2px 4px;font-weight:600">Team</th>
          <th style="padding:2px 6px">W</th><th style="padding:2px 6px">L</th><th style="padding:2px 6px">T</th>
          <th style="padding:2px 6px">GF</th><th style="padding:2px 6px">GA</th><th style="padding:2px 6px">GD</th>
        </tr>
        ${sorted.map(([name, s], i) => `
          <tr style="border-top:1px solid var(--gray-100)">
            <td style="padding:4px 4px;font-weight:${i===0?'700':'400'}">${i+1}. ${escHtml(name)}</td>
            <td style="text-align:center;padding:4px 6px">${s.w}</td>
            <td style="text-align:center;padding:4px 6px">${s.l}</td>
            <td style="text-align:center;padding:4px 6px">${s.t}</td>
            <td style="text-align:center;padding:4px 6px">${s.gf}</td>
            <td style="text-align:center;padding:4px 6px">${s.ga}</td>
            <td style="text-align:center;padding:4px 6px;color:${s.gf-s.ga>0?'var(--green)':s.gf-s.ga<0?'var(--red)':'inherit'}">${s.gf-s.ga>0?'+':''}${s.gf-s.ga}</td>
          </tr>`).join('')}
      </table>
    </div>`;
  }
  return html;
}

function buildDirReseedHtml(dirPkg, dirGames) {
  // Show reseeding guidance for divisions that have seedByDay enabled and are fully scored
  if (!dirPkg?.ageGroups) return '';
  let html = '';
  for (const ag of dirPkg.ageGroups) {
    for (const dv of (ag.divisions || [])) {
      if (!dv.seedByDay) continue;
      // Get games for this division
      const divGames = dirGames.filter(g => g.ageGroupName === ag.name && g.divisionName === dv.name);
      const scoredGames = divGames.filter(g => state.dirScores[g.id]?.status === 'final');
      if (!scoredGames.length) continue;
      // Calculate standings
      const teams = {};
      for (const g of scoredGames) {
        const sc = state.dirScores[g.id];
        const t1 = g.team1Name || g.team1Seed, t2 = g.team2Name || g.team2Seed;
        if (!teams[t1]) teams[t1] = { w:0, l:0, t:0, gf:0, ga:0 };
        if (!teams[t2]) teams[t2] = { w:0, l:0, t:0, gf:0, ga:0 };
        teams[t1].gf += sc.score1; teams[t1].ga += sc.score2;
        teams[t2].gf += sc.score2; teams[t2].ga += sc.score1;
        if (sc.score1 > sc.score2) { teams[t1].w++; teams[t2].l++; }
        else if (sc.score1 < sc.score2) { teams[t2].w++; teams[t1].l++; }
        else { teams[t1].t++; teams[t2].t++; }
      }
      const sorted = Object.entries(teams).sort(([,a],[,b]) => {
        const pa = a.w*3+a.t, pb = b.w*3+b.t;
        return pa !== pb ? pb - pa : (b.gf-b.ga) - (a.gf-a.ga);
      });
      const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
      html += `<div style="margin-top:14px;padding-top:12px;border-top:2px solid var(--gray-100)">
        <div style="font-size:0.8rem;font-weight:700;color:var(--gray-700);margin-bottom:6px">Next Day Seeding — ${escHtml(ag.name ? ag.name + ' · ' : '')}Division ${escHtml(dv.name)}</div>
        ${sorted.map(([name, s], i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.85rem">
            <span style="font-weight:700;color:var(--royal);min-width:32px">${ordinals[i] || (i+1)+'th'}</span>
            <span style="font-weight:600">${escHtml(name)}</span>
            <span style="color:var(--gray-400);font-size:0.78rem">${s.w}W–${s.l}L${s.t?'–'+s.t+'T':''}</span>
            <span style="margin-left:auto;font-size:0.75rem;color:var(--gray-400);font-style:italic">feeds "${ordinals[i] || (i+1)+'th'} Div ${escHtml(dv.name)}"</span>
          </div>`).join('')}
      </div>`;
    }
  }
  return html;
}

function openDirScoringModal() {
  const modal = document.getElementById('dir-scoring-pw-modal');
  if (!modal) return;
  const inp = document.getElementById('dir-scoring-pw-input');
  if (inp) inp.value = '';
  const err = document.getElementById('dir-scoring-pw-error');
  if (err) err.textContent = '';
  modal.classList.remove('hidden');
  _openModal('dir-scoring-pw-modal');
  setTimeout(() => { if (inp) inp.focus(); }, 100);
}

function closeDirScoringModal() {
  const modal = document.getElementById('dir-scoring-pw-modal');
  if (modal) modal.classList.add('hidden');
  _closeModal('dir-scoring-pw-modal');
}

function submitDirScoringPassword() {
  const dirPkg = getDirectorPkg();
  if (!dirPkg) return;
  const entered = (document.getElementById('dir-scoring-pw-input')?.value || '').trim();
  const correct = (dirPkg.directorScoringPassword || '').trim();
  if (correct && entered !== correct) {
    const err = document.getElementById('dir-scoring-pw-error');
    if (err) err.textContent = 'Incorrect password — try again';
    return;
  }
  state.dirScorerUnlocked = true;
  localStorage.setItem(DIR_SCORER_KEY, '1');
  localStorage.setItem(DIR_SCORER_CODE, dirPkg.code || '');
  closeDirScoringModal();
  showToast('🔓 Score entry unlocked!', 'ok');
  renderScoresTab();
  startDirScorePolling();
}

function lockDirScoring() {
  state.dirScorerUnlocked = false;
  localStorage.removeItem(DIR_SCORER_KEY);
  renderScoresTab();
}

async function submitDirGameScore(gameId) {
  const dirPkg = getDirectorPkg();
  if (!dirPkg) return;
  const s1el = document.getElementById('dir-s1-' + gameId);
  const s2el = document.getElementById('dir-s2-' + gameId);
  if (!s1el || !s2el) return;
  const score1 = parseInt(s1el.value);
  const score2 = parseInt(s2el.value);
  if (isNaN(score1) || isNaN(score2)) { showToast('Enter both scores'); return; }
  try {
    const res = await fetch(WORKER + '/dir-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: dirPkg.code,
        gameId,
        score1,
        score2,
        password: dirPkg.directorScoringPassword || '',
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Save failed');
    state.dirScores[gameId] = { score1, score2, status: 'final', updatedAt: Date.now() };
    showToast('✓ Score saved');
    renderScoresTab();
    if (state.currentTab === 'possible') renderPossibleTab();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

async function pollDirScores() {
  const dirPkg = getDirectorPkg();
  if (!dirPkg?.code || !dirPkg?.directorGames?.length) return;
  try {
    const res = await fetch(WORKER + '/dir-scores?code=' + encodeURIComponent(dirPkg.code));
    const data = await res.json();
    if (!data.ok) return;
    let changed = false;
    for (const [id, sc] of Object.entries(data.scores || {})) {
      const existing = state.dirScores[id];
      if (!existing || sc.updatedAt > (existing.updatedAt || 0)) {
        state.dirScores[id] = sc;
        changed = true;
      }
    }
    if (changed) {
      if (state.currentTab === 'scores') renderScoresTab();
      if (state.currentTab === 'possible') renderPossibleTab();
    }
  } catch {}
}

/** Returns the appropriate poll interval given the user's current power state.
 *  Doubles all poll intervals when Data Saver is on or battery is below 20% unplugged. */
async function _getPollInterval(baseMs) {
  try {
    let multiplier = 1;
    // Data Saver (Chrome Android / desktop)
    if (window.matchMedia?.('(prefers-reduced-data: reduce)').matches) multiplier = Math.max(multiplier, 2);
    // Battery Status API (Chromium)
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      if (!battery.charging && battery.level < 0.20) multiplier = Math.max(multiplier, 2);
    }
    if (state.nativeSystemState?.isLowPowerMode) multiplier = Math.max(multiplier, 2);
    const thermal = state.nativeSystemState?.thermalState;
    if (state.nativeSystemState?.isThermallyConstrained) multiplier = Math.max(multiplier, 3);
    else if (thermal === 'fair' || thermal === 'moderate') multiplier = Math.max(multiplier, 2);
    return baseMs * multiplier;
  } catch { /* API unavailable on this platform — use base rate */ }
  return baseMs;
}

/** Restart all active polling timers at the correct power-aware rate.
 *  Debounced 3 s so rapid `levelchange` events (1 per % of battery drain)
 *  don't fire a burst of immediate network requests. */
let _powerChangeDebounce = null;
function _restartPollOnPowerChange() {
  clearTimeout(_powerChangeDebounce);
  _powerChangeDebounce = setTimeout(() => {
    if (state.dirPollTimer)    startDirScorePolling();
    if (state.tscorePollTimer) startTournScorePolling();
    if (_livePollTimer)        startLivePoller(); // also restarts viewer poll at new rate
  }, 3000);
}

async function startDirScorePolling() {
  if (state.dirPollTimer) clearInterval(state.dirPollTimer);
  const dirPkg = getDirectorPkg();
  if (!dirPkg?.code || !dirPkg?.directorGames?.length) return;
  pollDirScores(); // immediate first fetch
  const interval = await _getPollInterval(30000);
  state.dirPollTimer = setInterval(pollDirScores, interval);
}

// ─── RENDER: TOURNAMENT SCORE TAB ────────────────────────────────────────────

const TSCORE_STORE   = 'ebwp-tscore-pkg';       // cached tournament package
const TSCORE_PW_KEY  = 'ebwp-tscore-pw';        // remembered scorer password
const TSCORE_CODE_KEY = 'ebwp-tscore-code';      // remembered share code

function renderTournScoreTab() {
  const el = $('view-tournscore');
  if (!el) return;

  // Step 1: Scorer password gate
  if (!state.tscoreUnlocked) {
    const savedCode = localStorage.getItem(TSCORE_CODE_KEY) || '';
    el.innerHTML = `
      <div class="card tab-card">
        <h2>🏆 Tournament Score</h2>
        <p class="step-desc">Enter the scoring password and share code to access the full tournament bracket for live score entry.</p>
        <div style="margin-top:14px">
          <label style="font-size:0.82rem;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px">Scorer Password</label>
          <input id="tscore-pw" type="password" class="form-input" placeholder="Tournament password"
                 autocomplete="off" autocorrect="off" spellcheck="false"
                 style="margin-bottom:12px;font-size:0.95rem"
                 onkeydown="if(event.key==='Enter')document.getElementById('tscore-code')?.focus()">
          <label style="font-size:0.82rem;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px">Share Code</label>
          <input id="tscore-code" type="text" class="form-input" placeholder="e.g. ABC123" maxlength="6"
                 value="${escHtml(savedCode)}"
                 autocomplete="off" spellcheck="false"
                 style="text-transform:uppercase;letter-spacing:2px;font-weight:700;font-size:1rem;margin-bottom:12px"
                 oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')"
                 onkeydown="if(event.key==='Enter')unlockTournScore()">
          <div id="tscore-err" style="color:var(--red);font-size:0.82rem;margin-bottom:8px"></div>
          <button class="btn" style="width:100%;padding:12px;font-size:0.95rem;font-weight:700" onclick="unlockTournScore()">🔓 Unlock Tournament Scoring</button>
        </div>
      </div>`;
    return;
  }

  // Step 2: Bracket loaded — render score entry
  const pkg = state.tscorePkg;
  if (!pkg) { el.innerHTML = '<div class="card tab-card"><p class="empty-msg">No tournament data loaded.</p></div>'; return; }

  let html = `<div class="card tab-card">
    <div class="history-header-row">
      <h2>🏆 ${escHtml(pkg.tournamentName || 'Tournament')}</h2>
      <button class="btn btn-ghost" style="font-size:0.78rem;padding:5px 12px" onclick="lockTournScore()">🔒 Lock</button>
    </div>
    <p class="step-desc" style="margin-bottom:4px">${escHtml([pkg.dates, pkg.location].filter(Boolean).join(' · '))}</p>`;

  // Render each age group > division group > division with games
  const ags = pkg.ageGroups || [];
  const dirGames = pkg.directorGames || [];

  if (dirGames.length) {
    // Group games by age group + division
    const groups = {};
    for (const g of dirGames) {
      const key = (g.ageGroupName ? g.ageGroupName + ' · ' : '') + (g.divisionGroupName ? g.divisionGroupName + ' · ' : '') + 'Division ' + (g.divisionName || '?');
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    }

    for (const [label, grpGames] of Object.entries(groups)) {
      html += `<div style="margin-top:14px">
        <div style="font-size:0.75rem;font-weight:700;color:var(--royal);text-transform:uppercase;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid var(--royal-light)">${escHtml(label)}</div>`;
      for (const g of grpGames) {
        const sc = state.tscoreScores[g.id] || {};
        const isFinal = sc.status === 'final';
        html += `
          <div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);flex-wrap:wrap">
            <div style="flex:1;min-width:130px;font-size:0.88rem">
              <span style="font-weight:600;color:var(--royal-dark)">${escHtml(g.team1Name || g.team1Seed || '?')}</span>
              <span style="color:var(--gray-400);margin:0 4px">vs</span>
              <span style="font-weight:600;color:var(--royal-dark)">${escHtml(g.team2Name || g.team2Seed || '?')}</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="number" min="0" max="99" id="ts-s1-${escHtml(g.id)}"
                     value="${isFinal ? sc.score1 : ''}" placeholder="–" inputmode="numeric"
                     style="width:46px;text-align:center;padding:5px 4px;border:1.5px solid ${isFinal?'var(--green)':'var(--gray-300)'};border-radius:6px;font-size:1rem;font-weight:700">
              <span style="color:var(--gray-400);font-weight:700">–</span>
              <input type="number" min="0" max="99" id="ts-s2-${escHtml(g.id)}"
                     value="${isFinal ? sc.score2 : ''}" placeholder="–" inputmode="numeric"
                     style="width:46px;text-align:center;padding:5px 4px;border:1.5px solid ${isFinal?'var(--green)':'var(--gray-300)'};border-radius:6px;font-size:1rem;font-weight:700">
              <button class="btn${isFinal ? ' btn-ghost' : ''}" style="font-size:0.8rem;padding:5px 12px"
                      onclick="submitTournScore('${escHtml(g.id)}')">
                ${isFinal ? '✓' : 'Save'}
              </button>
            </div>
          </div>`;
      }
      html += '</div>';
    }
  } else {
    html += '<p class="empty-msg" style="padding:20px 0">No bracket games found in this tournament package.</p>';
  }

  // Standings
  if (dirGames.length && Object.keys(state.tscoreScores).length) {
    html += '<div style="margin-top:16px;padding-top:12px;border-top:2px solid var(--gray-100)">';
    html += buildTournScoreStandings(dirGames);
    html += '</div>';
  }

  html += '</div>';
  el.innerHTML = html;
}

async function unlockTournScore() {
  const pw = (document.getElementById('tscore-pw')?.value || '').trim();
  const code = (document.getElementById('tscore-code')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const errEl = document.getElementById('tscore-err');
  if (!code || code.length < 6) { if (errEl) errEl.textContent = 'Enter the 6-character share code'; return; }

  if (errEl) errEl.textContent = 'Loading…';
  try {
    const res = await fetch(WORKER + '/tournament-pkg?code=' + encodeURIComponent(code));
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Package not found');
    const pkg = data.pkg;

    // Verify password
    const correctPw = (pkg.directorScoringPassword || '').trim();
    if (correctPw && pw !== correctPw) {
      if (errEl) errEl.textContent = 'Incorrect scoring password';
      return;
    }

    // Success — store and unlock
    state.tscoreUnlocked = true;
    state.tscorePkg = { ...pkg, code };
    state.tscorePw = pw;
    state.tscoreScores = {};
    localStorage.setItem(TSCORE_CODE_KEY, code);
    localStorage.setItem(TSCORE_PW_KEY, pw);
    localStorage.setItem(TSCORE_STORE, JSON.stringify({ ...pkg, code }));

    // Fetch existing scores
    await pollTournScores();
    startTournScorePolling();
    renderTournScoreTab();
  } catch (e) {
    if (errEl) errEl.textContent = e.message;
  }
}

function lockTournScore() {
  state.tscoreUnlocked = false;
  state.tscorePkg = null;
  state.tscoreScores = {};
  if (state.tscorePollTimer) clearInterval(state.tscorePollTimer);
  localStorage.removeItem(TSCORE_PW_KEY);
  renderTournScoreTab();
}

async function submitTournScore(gameId) {
  const pkg = state.tscorePkg;
  if (!pkg) return;
  const s1el = document.getElementById('ts-s1-' + gameId);
  const s2el = document.getElementById('ts-s2-' + gameId);
  if (!s1el || !s2el) return;
  const score1 = parseInt(s1el.value);
  const score2 = parseInt(s2el.value);
  if (isNaN(score1) || isNaN(score2)) { showToast('Enter both scores'); return; }
  try {
    const res = await fetch(WORKER + '/dir-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: pkg.code,
        gameId,
        score1,
        score2,
        password: state.tscorePw || pkg.directorScoringPassword || '',
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Save failed');
    state.tscoreScores[gameId] = { score1, score2, status: 'final', updatedAt: Date.now() };
    showToast('✓ Score saved');
    renderTournScoreTab();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

async function pollTournScores() {
  const pkg = state.tscorePkg;
  if (!pkg?.code) return;
  try {
    const res = await fetch(WORKER + '/dir-scores?code=' + encodeURIComponent(pkg.code));
    const data = await res.json();
    if (!data.ok) return;
    let changed = false;
    for (const [id, sc] of Object.entries(data.scores || {})) {
      const existing = state.tscoreScores[id];
      if (!existing || sc.updatedAt > (existing.updatedAt || 0)) {
        state.tscoreScores[id] = sc;
        changed = true;
      }
    }
    if (changed && state.currentTab === 'tournscore') renderTournScoreTab();
  } catch {}
}

async function startTournScorePolling() {
  if (state.tscorePollTimer) clearInterval(state.tscorePollTimer);
  if (!state.tscorePkg?.code) return;
  const interval = await _getPollInterval(15000);
  state.tscorePollTimer = setInterval(pollTournScores, interval);
}

function buildTournScoreStandings(dirGames) {
  const divStats = {};
  for (const g of dirGames) {
    const sc = state.tscoreScores[g.id];
    if (!sc || sc.status !== 'final') continue;
    const divKey = (g.ageGroupName || '') + '|' + (g.divisionGroupName || '') + '|' + (g.divisionName || '');
    if (!divStats[divKey]) divStats[divKey] = { agName: g.ageGroupName, dgName: g.divisionGroupName, divName: g.divisionName, teams: {} };
    const ds = divStats[divKey].teams;
    const t1 = g.team1Name || g.team1Seed;
    const t2 = g.team2Name || g.team2Seed;
    if (!ds[t1]) ds[t1] = { w:0, l:0, t:0, gf:0, ga:0 };
    if (!ds[t2]) ds[t2] = { w:0, l:0, t:0, gf:0, ga:0 };
    ds[t1].gf += sc.score1; ds[t1].ga += sc.score2;
    ds[t2].gf += sc.score2; ds[t2].ga += sc.score1;
    if (sc.score1 > sc.score2)      { ds[t1].w++; ds[t2].l++; }
    else if (sc.score1 < sc.score2) { ds[t2].w++; ds[t1].l++; }
    else                             { ds[t1].t++; ds[t2].t++; }
  }
  if (!Object.keys(divStats).length) return '';
  let html = '<div style="font-size:0.82rem;font-weight:700;color:var(--gray-700);margin-bottom:8px">Standings</div>';
  for (const { agName, dgName, divName, teams } of Object.values(divStats)) {
    const sorted = Object.entries(teams).sort(([,a],[,b]) => {
      const pa = a.w*3+a.t, pb = b.w*3+b.t;
      return pa !== pb ? pb - pa : (b.gf-b.ga) - (a.gf-a.ga);
    });
    const label = [agName, dgName, 'Division ' + divName].filter(Boolean).join(' · ');
    html += `<div style="margin-bottom:10px">
      <div style="font-size:0.72rem;font-weight:700;color:var(--royal);margin-bottom:4px">${escHtml(label)}</div>
      <table style="width:100%;font-size:0.82rem;border-collapse:collapse">
        <tr style="color:var(--gray-400);font-size:0.7rem;text-align:center">
          <th style="text-align:left;padding:2px 4px;font-weight:600">Team</th>
          <th style="padding:2px 6px">W</th><th style="padding:2px 6px">L</th><th style="padding:2px 6px">T</th>
          <th style="padding:2px 6px">GF</th><th style="padding:2px 6px">GA</th><th style="padding:2px 6px">GD</th>
        </tr>
        ${sorted.map(([name, s], i) => `
          <tr style="border-top:1px solid var(--gray-100)">
            <td style="padding:4px 4px;font-weight:${i===0?'700':'400'}">${i+1}. ${escHtml(name)}</td>
            <td style="text-align:center;padding:4px 6px">${s.w}</td>
            <td style="text-align:center;padding:4px 6px">${s.l}</td>
            <td style="text-align:center;padding:4px 6px">${s.t}</td>
            <td style="text-align:center;padding:4px 6px">${s.gf}</td>
            <td style="text-align:center;padding:4px 6px">${s.ga}</td>
            <td style="text-align:center;padding:4px 6px;color:${s.gf-s.ga>0?'var(--green)':s.gf-s.ga<0?'var(--red)':'inherit'}">${s.gf-s.ga>0?'+':''}${s.gf-s.ga}</td>
          </tr>`).join('')}
      </table>
    </div>`;
  }
  return html;
}

// Restore tournament score session on load
function restoreTournScoreSession() {
  try {
    const pkgStr = localStorage.getItem(TSCORE_STORE);
    const pw = localStorage.getItem(TSCORE_PW_KEY);
    if (pkgStr && pw) {
      const pkg = JSON.parse(pkgStr);
      state.tscoreUnlocked = true;
      state.tscorePkg = pkg;
      state.tscorePw = pw;
      state.tscoreScores = {};
      pollTournScores();
      startTournScorePolling();
    }
  } catch {}
}

// ─── RENDER: HEADER ───────────────────────────────────────────────────────────

function renderHeader() {
  const isUpcoming = !!(TOURNAMENT.upcomingMode);
  const isHS = localStorage.getItem('ebwp-club-type') === 'highschool';
  const clubId = getAppClubId();

  let headerName = TOURNAMENT.name || 'Tournament';
  let headerSub = [TOURNAMENT.dates, TOURNAMENT.location].filter(Boolean).join(' · ');

  if (isHS) {
    const savedClubName = localStorage.getItem('ebwp-club-name');
    headerName = savedClubName
      || (clubId ? clubId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : headerName);
    const teamKey = getSelectedTeam();
    const teamOpt = TEAM_OPTIONS.find(t => t.key === teamKey);
    const teamLabel = teamOpt ? teamOpt.label : (teamKey || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const seasonLabel = `Fall ${new Date().getFullYear()} Season`;
    headerSub = teamLabel ? teamLabel + ' · ' + seasonLabel : seasonLabel;
  } else if (TOURNAMENT.stayTuned) {
    const savedClubName = localStorage.getItem('ebwp-club-name');
    headerName = savedClubName
      || (clubId ? clubId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : headerName);
    // Even in non-HS mode, if we are in "Stay Tuned" mode (no tourney), show the selected team in subtext
    const teamKey = getSelectedTeam();
    const teamOpt = TEAM_OPTIONS.find(t => t.key === teamKey);
    const teamLabel = teamOpt ? teamOpt.label : (teamKey || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (teamLabel) headerSub = teamLabel;
  }

  $('header-tournament-name').innerHTML =
    (isUpcoming ? '<em>Upcoming Tournament:</em> ' : '') + escHtml(headerName);
  $('header-tournament-dates').textContent = headerSub;

  // Render compact team indicator in header (tappable → opens Settings)
  renderTeamPicker();
  syncHeaderHeight();
}

function _teamPickerDisplayLabels(teamKeys) {
  return (teamKeys || []).map(k => {
    const opt = TEAM_OPTIONS.find(t => t.key === k);
    return opt ? opt.label : k.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  });
}

function renderTeamPickerModal() {
  const listEl = $('team-picker-modal-list');
  const doneBtn = $('team-picker-modal-done');
  if (!listEl || !doneBtn) return;
  const active = new Set(_pendingTeamPickerKeys);
  const labels = _teamPickerDisplayLabels(_pendingTeamPickerKeys);
  listEl.innerHTML = TEAM_OPTIONS.map(opt => {
    const on = active.has(opt.key);
    const validTeams = getValidTeamLettersForGroup(opt.key);
    const showTeamChoices = on && validTeams.length > 1;
    const tournament = getTournamentForGroup(opt.key);
    const effective = getEffectiveTeamLettersForGroup(opt.key, _pendingTeamPickerLetters);
    const allOn = showTeamChoices && effective.length === validTeams.length;
    const teamChoices = showTeamChoices ? `
      <div class="team-picker-modal-team-row">
        <button class="${allOn ? 'team-picker-modal-team-btn active' : 'team-picker-modal-team-btn'}" onclick="event.stopPropagation();setPendingTeamPickerLetters('${escHtml(opt.key)}','ALL')">All</button>
        ${validTeams.map(letter => {
          const label = tournament?.teamLabels?.[letter] || `Team ${letter}`;
          const activeLetter = effective.length === 1 && effective[0] === letter;
          return `<button class="${activeLetter ? 'team-picker-modal-team-btn active' : 'team-picker-modal-team-btn'}" onclick="event.stopPropagation();setPendingTeamPickerLetters('${escHtml(opt.key)}','${letter}')">${escHtml(label)}</button>`;
        }).join('')}
      </div>` : '';
    return `<div class="team-picker-modal-item${on ? ' active' : ''}">
      <button class="team-picker-modal-row${on ? ' active' : ''}" onclick="toggleTeamPickerOption('${escHtml(opt.key)}')">
        <span class="team-picker-modal-check">✓</span>
        <span class="team-picker-modal-copy${showTeamChoices ? ' has-team-choices' : ''}">
          <span class="team-picker-modal-titleline">${escHtml(opt.label)}</span>
          <span class="team-picker-modal-subline">${on ? appT('team_picker_selected') : appT('team_picker_tap_include')}</span>
        </span>
      </button>
      ${teamChoices}
    </div>`;
  }).join('');
  doneBtn.disabled = _pendingTeamPickerKeys.length === 0;
  doneBtn.textContent = labels.length ? appFormat('team_picker_done_count', { count: String(labels.length) }) : appT('team_picker_select_one');
}

async function openTeamPickerModal() {
  _pendingTeamPickerKeys = [...getSelectedTeams()];
  const missing = _pendingTeamPickerKeys.filter(key => !getTournamentForGroup(key));
  if (missing.length) {
    await Promise.all(missing.map(key => loadTeamData(key)));
  }
  _pendingTeamPickerLetters = {};
  _pendingTeamPickerKeys.forEach(key => {
    _pendingTeamPickerLetters[key] = getEffectiveTeamLettersForGroup(key);
  });
  renderTeamPickerModal();
  const modal = $('team-picker-modal');
  if (modal) modal.classList.remove('hidden');
  _openModal('team-picker-modal');
}

function closeTeamPickerModal() {
  const modal = $('team-picker-modal');
  if (modal) modal.classList.add('hidden');
  _closeModal('team-picker-modal');
}

async function toggleTeamPickerOption(teamKey) {
  const current = new Set(_pendingTeamPickerKeys);
  if (current.has(teamKey)) {
    current.delete(teamKey);
    delete _pendingTeamPickerLetters[teamKey];
  } else {
    current.add(teamKey);
    if (!TEAM_CACHE[teamKey]) await loadTeamData(teamKey);
    _pendingTeamPickerLetters[teamKey] = getEffectiveTeamLettersForGroup(teamKey);
  }
  const order = TEAM_OPTIONS.map(t => t.key);
  _pendingTeamPickerKeys = Array.from(current).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  renderTeamPickerModal();
}

function selectAllTeamPickerOptions() {
  _pendingTeamPickerKeys = TEAM_OPTIONS.map(t => t.key);
  _pendingTeamPickerLetters = {};
  _pendingTeamPickerKeys.forEach(key => {
    _pendingTeamPickerLetters[key] = getEffectiveTeamLettersForGroup(key);
  });
  renderTeamPickerModal();
}

function clearTeamPickerOptions() {
  _pendingTeamPickerKeys = [];
  _pendingTeamPickerLetters = {};
  renderTeamPickerModal();
}

function setPendingTeamPickerLetters(groupKey, value) {
  const validTeams = getValidTeamLettersForGroup(groupKey);
  if (!validTeams.length) return;
  _pendingTeamPickerLetters[groupKey] = value === 'ALL' ? [...validTeams] : [value].filter(l => validTeams.includes(l));
  renderTeamPickerModal();
}

async function applySelectedTeamsAndRefresh(nextTeams) {
  const teams = Array.from(new Set((nextTeams || []).filter(Boolean)));
  if (!teams.length) return;
  setSelectedTeams(teams);
  teams.forEach(key => {
    const chosenLetters = _pendingTeamPickerLetters[key];
    if (Array.isArray(chosenLetters) && chosenLetters.length) setTeamLettersForGroup(key, chosenLetters);
  });
  const missing = teams.filter(k => !TEAM_CACHE[k]);
  if (missing.length) await Promise.all(missing.map(k => loadTeamData(k)));
  _auditMultiTeamIntegrity();
  checkTournamentChange();
  seedHistory();
  renderTeamPicker();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
  if (state.currentTab === 'settings') _renderSettingsTeamPicker();
  await _syncWidgetsAll();
  await syncSheetConfigToServiceWorker();
  if (typeof fbListenToTournament === 'function') {
    teams.forEach(k => fbListenToTournament(k));
  }
}

async function applyTeamPickerSelection() {
  if (!_pendingTeamPickerKeys.length) return;
  closeTeamPickerModal();
  await applySelectedTeamsAndRefresh(_pendingTeamPickerKeys);
  _pendingTeamPickerLetters = {};
}

/** Render a compact team badge in the header that opens the age-group picker when tapped */
function renderTeamPicker() {
  const el = $('team-picker');
  if (!el) return;

  const selectedTeams = getSelectedTeams();
  const labels = _teamPickerDisplayLabels(selectedTeams);
  const visible = labels.slice(0, 2).map(label => `<span class="header-team-chip">${escHtml(label)}</span>`).join('');
  const more = labels.length > 2 ? `<span class="header-team-chip header-team-chip-more">+${labels.length - 2}</span>` : '';

  el.innerHTML = `
    <button class="header-team-badge" onclick="openTeamPickerModal()" title="${escHtml(appT('team_picker_change'))}">
      <span class="header-team-badge-chips">${visible || `<span class="header-team-chip">${escHtml(appT('team_picker_empty_chip'))}</span>`}${more}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
  `;
}

/** Keep --header-h CSS variable in sync so the desktop sidebar top offset is correct. */
function syncHeaderHeight() {
  const h = document.querySelector('.app-header');
  if (h) document.documentElement.style.setProperty('--header-h', h.offsetHeight + 'px');
}

// ─── RENDER: SCHEDULE TAB ─────────────────────────────────────────────────────

function renderScheduleTab() {
  _renderSuffix = '';
  const slots = getExpandedTeamSlots();
  if (slots.length === 0) {
    const msg = `<p class="empty-msg" style="padding:24px;text-align:center;color:var(--gray-500)">${appT('schedule_select_prompt')}</p>`;
    const ns = $('next-game-section'); if (ns) ns.innerHTML = '';
    const sl = $('schedule-list');    if (sl) sl.innerHTML = msg;
    const ss = $('schedule-standings'); if (ss) ss.innerHTML = '';
    renderDirectorImportCard();
    return;
  }
  if (slots.length > 1) {
    _renderScheduleMulti(slots);
    _syncWidgetsAll();
    return;
  }
  renderNextGameCard();
  renderDirectorImportCard();
  renderGamesList();

  // When there's no active schedule, show the bracket standings below the coming-soon card
  if (!getTournamentGames().length) {
    renderHistoryStandings('schedule-standings', window.HISTORY_SEED || []);
  } else {
    const el = $('schedule-standings');
    if (el) el.innerHTML = '';
  }

  _syncWidgetsAll();

  // Refresh button at the bottom of the tab
  const rb = $('schedule-refresh-wrap');
  if (rb) rb.innerHTML = `
    <button class="schedule-refresh-btn" id="schedule-refresh-btn" onclick="forceAppRefresh(this)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      ${appT('schedule_force_refresh')}
    </button>`;

}

/**
 * Returns an array of { groupKey, letter, suffix } slots — one per (ageGroup × selectedLetter).
 * When 14u Girls has both A+B selected → two slots. When single letter → one slot per group.
 * `suffix` is used as the unique DOM ID fragment (e.g. "14u-girls-A").
 */
function getExpandedTeamSlots() {
  const slots = [];
  for (const groupKey of getSelectedTeams()) {
    const cache = TEAM_CACHE[groupKey];
    const validTeams = getValidTeamLettersForGroup(groupKey);
    const isMulti = cache && validTeams.length > 1;
    if (!isMulti) {
      slots.push({ groupKey, letter: null, suffix: groupKey });
    } else {
      const effective = getEffectiveTeamLettersForGroup(groupKey);
      for (const letter of effective) {
        slots.push({ groupKey, letter, suffix: `${groupKey}-${letter}` });
      }
    }
  }
  return slots;
}

/** Section label for a specific slot: "14u Girls · Pacific Red". */
function _groupSectionLabelFor(groupKey, letter) {
  const base = TEAM_OPTIONS.find(t => t.key === groupKey)?.label || groupKey;
  if (!letter) return base;
  const cache = TEAM_CACHE[groupKey];
  if (!cache || getValidTeamLettersForGroup(groupKey).length <= 1) return base;
  const teamLabel = cache.tournament.teamLabels?.[letter];
  return teamLabel ? `${base} · ${teamLabel}` : `${base} · Team ${letter}`;
}

/** Section label using current render context (_activeTeamLetters). */
function _groupSectionLabel(groupKey) {
  if (_activeTeamLetters?.length === 1) return _groupSectionLabelFor(groupKey, _activeTeamLetters[0]);
  const base  = TEAM_OPTIONS.find(t => t.key === groupKey)?.label || groupKey;
  const cache = TEAM_CACHE[groupKey];
  if (!cache || getValidTeamLettersForGroup(groupKey).length <= 1) return base;
  const letters    = getTeamLettersForGroup(groupKey);
  const teamLabels = letters.map(l => cache.tournament.teamLabels?.[l]).filter(Boolean);
  return teamLabels.length ? `${base} · ${teamLabels.join(' & ')}` : base;
}

function _renderScheduleMulti(slots) {
  renderDirectorImportCard();
  $('next-game-section').innerHTML = '';
  $('schedule-standings').innerHTML = '';

  $('schedule-list').innerHTML = slots.map(({ groupKey, letter, suffix }) =>
    `<div class="team-section">
      <div class="scores-slot-header"><span class="scores-slot-label">${escHtml(_groupSectionLabelFor(groupKey, letter))}</span></div>
      <div id="next-game-section-${suffix}"></div>
      <div id="schedule-list-${suffix}"></div>
    </div>`
  ).join('');

  for (const { groupKey, letter, suffix } of slots) {
    const cache = TEAM_CACHE[groupKey];
    if (!cache) continue;
    const savedT = window.TOURNAMENT, savedH = window.HISTORY_SEED;
    window.TOURNAMENT = cache.tournament; window.HISTORY_SEED = cache.history || [];
    _activeAgeGroup = groupKey;
    _activeTeamLetters = letter ? [letter] : null;
    _renderSuffix = '-' + suffix;
    renderNextGameCard();
    renderGamesList();
    _renderSuffix = '';
    _activeTeamLetters = null;
    _activeAgeGroup = null;
    window.TOURNAMENT = savedT; window.HISTORY_SEED = savedH;
  }

  const rb = $('schedule-refresh-wrap');
  if (rb) rb.innerHTML = `<button class="schedule-refresh-btn" id="schedule-refresh-btn" onclick="forceAppRefresh(this)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
    ${appT('schedule_force_refresh')}</button>`;
}

/** Clears SW cache and reloads to pick up latest code + data. */
async function forceAppRefresh(btn) {
  if (btn) { btn.disabled = true; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Refreshing…'; }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) { /* ignore — reload anyway */ }
  // Use location.replace with timestamp to bypass Android WebView HTTP disk cache
  // (window.location.reload() does NOT bypass it — old cached content is served)
  const base = location.pathname.replace(/\?.*$/, '');
  location.replace(base + '?_r=' + Date.now());
}

function openLiveGameFromSchedule(gameOrRef, ageGroupLabel = '') {
  const game = _findGameByRef(gameOrRef);
  if (!game) return;
  if (!isGameLive(_gameRef(game))) return;
  openScoreDetail(_gameIdOnly(game), _contextGroupKey(game), ageGroupLabel || '', false);
}

function renderNextGameCard() {
  const section = $('next-game-section');
  const next = findNextGameOrProjected();

  if (!next) {
    const games = getTournamentGames();
    const tournamentPast = _isTournamentPastWindow();
    const allPoolDone = games.length > 0 && games.every(g => _getResultForGame(g));
    // Never show "Tournament Complete" when the slot is intentionally in upcoming/coming-soon mode.
    // upcomingMode means the admin cleared the slot and set it to upcoming — stale date data
    // from a previously loaded tournament must not trigger the completion card.
    if ((allPoolDone || tournamentPast) && !TOURNAMENT.upcomingMode && !TOURNAMENT.comingSoon) {
      section.innerHTML = `
        <div class="next-game-wrap">
          <div class="next-game-card next-complete">
            <div class="next-label">${tournamentPast ? appT('next_tournament_complete') : appT('next_all_games_complete')}</div>
            <div class="next-vs">${tournamentPast ? appT('next_check_history_final') : appT('next_no_more_scheduled')}</div>
            <div class="next-meta"><span>Record: ${getPoolRecord()} — ${tournamentPast ? appT('next_waiting_update') : appT('next_check_history_results')}</span></div>
          </div>
        </div>`;
    } else {
      section.innerHTML = '';
    }
    return;
  }

  if (next.type === 'pool') {
    const g = next.game;
    const capIcon = g.cap === 'Dark' ? '🔵' : '⚪';
    const nextCapBgClass = g.cap === 'Dark' ? ' cap-dark-bg' : g.cap === 'White' ? ' cap-white-bg' : '';
    const nextLive = isGameLive(_gameRef(g));
    // Live score summary — shown on the IN PROGRESS card
    const liveS = nextLive ? getLiveScore(g) : null;
    const GS_DISPLAY = { start:'Starting', q1:'Q1', q2:'Q2', half:'Half Time', q3:'Q3', q4:'Q4', shootout:'Shootout', final:'Final' };
    const gsLabel    = (liveS && GS_DISPLAY[liveS.gameState]) || '';
    const clockStr   = liveS ? getCurrentClockStr(g.id) : '';
    const liveSummary = (liveS && liveS.gameState && liveS.gameState !== 'pre')
      ? `<div class="next-live-score">
           <span class="next-live-score-nums">${liveS.team} &ndash; ${liveS.opp}</span>
           ${gsLabel ? `<span class="next-live-period">${gsLabel}</span>` : ''}
           ${clockStr ? `<span class="next-live-clock" id="next-game-clock-${_gameRef(g)}">${clockStr}</span>` : ''}
         </div>`
      : '';
    const nextDateKey = g.dateISO || g.date;
    const nextDateHeader = nextDateKey
      ? `<div class="date-group-header">${escHtml(formatDateGroupLabel(nextDateKey))}</div>` : '';
    section.innerHTML = `
      ${nextDateHeader}
      <div class="next-game-wrap">
        <div class="next-game-card${nextCapBgClass}${nextLive ? ' next-game-live next-game-card-clickable' : ''}"${nextLive ? ` onclick="openLiveGameFromSchedule('${escHtml(_gameRef(g))}')"` : ''}>
          <div class="next-game-card-top">
            ${g.gameNum ? `<div class="next-game-num">${escHtml(g.gameNum)}</div>` : ''}
            ${nextLive ? `<span class="live-badge-next">🔴 LIVE</span>` : ''}
            <button class="follow-live-btn" onclick="event.stopPropagation();toggleLiveActivity('${_gameRef(g)}')">📡 ${appT('common_follow_live')}</button>
          </div>
          <div class="next-label">${nextLive ? appT('next_in_progress') : appT('next_next_game')}</div>
          <div class="next-vs">vs ${escHtml(normalizeOpponentName(g.opponent || 'TBD'))}</div>
          ${liveSummary}
          <div class="next-meta">
            <span>🕐 ${escHtml(g.time)} &nbsp;·&nbsp; ${escHtml(g.date || g.dateISO)}</span>
            ${g.pool ? `<span>${swimmerEmoji()} ${escHtml(g.pool)}${g.cap ? ` &nbsp;·&nbsp; ${capIcon} ${escHtml(g.cap)} Caps` : ''}</span>` : (g.cap ? `<span>${capIcon} ${escHtml(g.cap)} Caps</span>` : '')}
            ${TOURNAMENT.location ? buildLocationLink(TOURNAMENT.location) : ''}
          </div>
        </div>
      </div>`;
  } else {
    const g = next.game;
    const timeStr = g.time && g.time !== 'TBD'
      ? `🕐 ${escHtml(g.time)} · ${escHtml(g.date || g.dateISO)}`
      : g.date ? escHtml(g.date) : 'Time TBD';
    section.innerHTML = `
      <div class="next-game-wrap">
        <div class="next-game-card next-projected">
          ${g.gameNum ? `<div class="next-game-num">${escHtml(g.gameNum)}</div>` : ''}
          <div class="next-label">${appT('next_projected_next')} · ${escHtml(next.pathLabel || '')}</div>
          <div class="next-vs">${escHtml(normalizeOpponentName(g.desc || 'Bracket Game'))}</div>
          <div class="next-meta">
            <span>${timeStr}</span>
            ${bracketLocationDisplay(g.location) ? buildLocationLink(bracketLocationDisplay(g.location)) : ''}
          </div>
          <div class="next-cap-badge projected-note">${escHtml(appFormat('next_based_on_record', { record: getPoolRecord() }))}</div>
        </div>
      </div>`;
  }
}

function renderSyncCard() {
  const section = $('sync-section');

  if (!state.syncActive) {
    // Show "Sync to Calendar" invite
    section.innerHTML = `
      <div class="sync-invite-card">
        <div class="sync-invite-inner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--royal)">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div class="sync-invite-text">
            <strong>Add to Google Calendar</strong>
            <span>Sync all games to your calendar</span>
          </div>
        </div>
        <button class="btn-sync-connect" onclick="startCalendarSetup()">Connect</button>
      </div>`;
  } else {
    // Show sync status
    const timeStr = state.lastSyncTime
      ? state.lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Not yet synced';
    section.innerHTML = `
      <div class="sync-status-card">
        <div class="sync-status-inner">
          <span class="sync-cal-name">📅 ${escHtml(state.selectedCalName || 'Calendar')}</span>
          <span class="sync-time">Last sync: ${timeStr}</span>
        </div>
        <div class="sync-btn-row">
          <button class="btn-sync-now" onclick="requestToken(() => syncToCalendar())">Sync Now</button>
          <button class="btn-sync-change" onclick="disconnectCalendar()" title="Change or disconnect calendar">Change</button>
        </div>
      </div>`;
  }
}

/** Disconnects the current calendar so the user can pick a new one. */
function disconnectCalendar() {
  if (!confirm('Disconnect calendar and choose a different one?')) return;
  clearInterval(state.syncIntervalId);
  state.syncActive      = false;
  state.selectedCalId   = null;
  state.selectedCalName = null;
  state.lastSyncTime    = null;
  state.syncIntervalId  = null;
  state.accessToken     = null;
  state.tokenExpiry     = null;
  localStorage.removeItem(STORE.CALENDAR_ID);
  localStorage.removeItem(STORE.CALENDAR_NAME);
  renderSyncCard();
  showToast('Calendar disconnected — tap Connect to choose a new one');
}

// ─── TOURNAMENT DIRECTOR IMPORT ───────────────────────────────────────────────

const DIR_STORE        = 'ebwp-director-pkg';         // localStorage key for last-imported package
const DIR_SCORER_KEY   = 'ebwp-dir-scorer-unlocked';  // localStorage key for director scorer unlock
const DIR_SCORER_CODE  = 'ebwp-dir-scorer-code';      // localStorage key for which code was unlocked

function getDirectorPkg() {
  try { return JSON.parse(localStorage.getItem(DIR_STORE) || 'null'); } catch { return null; }
}

function renderDirectorImportCard() {
  // Director import moved to T-Score tab — this is now a no-op
}

async function importDirectorPackage() {
  const input = document.getElementById('director-code-input');
  if (!input) return;
  const code = (input.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6) { showToast('Enter the 6-character share code'); return; }
  input.disabled = true;
  try {
    const res = await fetch(`${WORKER}/tournament-pkg?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'Import failed');
    const pkg = data.pkg;
    localStorage.setItem(DIR_STORE, JSON.stringify({ ...pkg, importedAt: Date.now(), code }));
    const summary = [pkg.tournamentName || 'Tournament', pkg.dates, pkg.location].filter(Boolean).join(' · ');
    showToast('Imported: ' + summary);
    input.value = '';
    renderDirectorImportCard();
  } catch (e) {
    showToast('Import failed: ' + e.message);
  } finally {
    if (input) input.disabled = false;
  }
}

function clearDirectorImport() {
  localStorage.removeItem(DIR_STORE);
  renderDirectorImportCard();
}


function renderGamesList() {
  const listEl = $('schedule-list');
  const games  = getTournamentGames();

  if (!games.length) {
    if (TOURNAMENT.stayTuned) {
      listEl.innerHTML = `
        <div class="coming-soon-wrap">
          <div class="coming-soon-card">
            <div class="coming-soon-icon">⏳</div>
            <div class="coming-soon-text">
              <div class="coming-soon-label">Stay Tuned!</div>
              <div class="coming-soon-sub">${localStorage.getItem('ebwp-club-type') === 'highschool' ? 'Future season information will appear here.' : 'Future tournament information will appear here.'}</div>
              <div class="coming-soon-sub" style="margin-top:8px;font-size:.82rem;opacity:.8">Enable notifications to be updated when ${localStorage.getItem('ebwp-club-type') === 'highschool' ? 'season info is' : 'tournaments are'} added.</div>
            </div>
          </div>
        </div>`;
    } else if (TOURNAMENT.comingSoon) {
      listEl.innerHTML = `
        <div class="coming-soon-wrap">
          <div class="coming-soon-card">
            <div class="coming-soon-icon">📅</div>
            <div class="coming-soon-text">
              <div class="coming-soon-label">${escHtml(TOURNAMENT.comingSoon)}</div>
              <div class="coming-soon-sub">Upcoming Tournament: ${escHtml(TOURNAMENT.name)}</div>
              ${TOURNAMENT.dates ? `<div class="coming-soon-date">🗓 ${escHtml(TOURNAMENT.dates)}</div>` : ''}
            </div>
          </div>
        </div>`;
    } else {
      listEl.innerHTML = '<p class="empty-msg" style="padding:24px 18px;">No games scheduled.</p>';
    }
    return;
  }

  // Show only today + future games that haven't been completed yet
  // Completed games (with a result) move to the History tab automatically
  const todayStr = _localDateStr();
  const upcomingGames = games.filter(g =>
    (!g.dateISO || g.dateISO >= todayStr) && !_getResultForGame(g)
  );

  if (!upcomingGames.length) {
    const tournamentPast = _isTournamentPastWindow() && !TOURNAMENT.upcomingMode && !TOURNAMENT.comingSoon;
    const allDone = games.length > 0 && games.every(g => _getResultForGame(g));
    // The schedule header already renders the completion state in the blue Next Game slot.
    // Keep the list body empty here so we do not show a second duplicate completion card.
    listEl.innerHTML = (tournamentPast || allDone)
      ? ''
      : '<p class="empty-msg" style="padding:24px 18px;">All games complete — check the History tab for results.</p>';
    return;
  }

  // Sort by date then by game number numerically (G1 < G4 < G10 < G13)
  const gameNumVal = g => parseInt((g.gameNum || '').replace(/\D/g, ''), 10) || 9999;
  const _gt4 = g => { const t = parseGameTime(g.dateISO, g.time); return t ? t.getTime() : (g.dateISO ? new Date(g.dateISO + 'T00:00:00').getTime() : Infinity); };
  upcomingGames.sort((a, b) => {
    const td = _gt4(a) - _gt4(b);
    if (td !== 0) return td;
    return gameNumVal(a) - gameNumVal(b);
  });

  // Exclude the next game — it already appears in the blue card above
  const nextObj    = findNextGameOrProjected();
  const nextGameId = nextObj?.type === 'pool' ? nextObj.game?.id : null;
  const nextDateKey = nextObj?.type === 'pool' ? (nextObj.game?.dateISO || nextObj.game?.date) : null;
  const listGames  = upcomingGames.filter(g => g.id !== nextGameId);

  if (!listGames.length) { listEl.innerHTML = ''; return; }

  const groups = {};
  const groupOrder = [];
  for (const g of listGames) {
    const key = g.dateISO || g.date || 'TBD';
    if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
    groups[key].push(g);
  }

  let html = '';
  for (const dateLabel of groupOrder) {
    // Skip the date header if it matches the next game's date — already shown above that card
    if (dateLabel !== nextDateKey) {
      html += `<div class="date-group-header">${escHtml(formatDateGroupLabel(dateLabel))}</div>`;
    }
    html += `<div class="games-section">`;
    for (const g of groups[dateLabel]) html += buildScheduleCard(g);
    html += `</div>`;
  }
  listEl.innerHTML = html;
}

// Clean schedule card — shows game info only, no scoring controls.
// Completed games (with a result) are filtered out upstream and shown in History.
function buildScheduleCard(g) {
  const capBgClass = g.cap === 'Dark' ? 'cap-dark-bg' : g.cap === 'White' ? 'cap-white-bg' : '';
  const capIcon = g.cap === 'Dark' ? '🔵' : '⚪';
  // LIVE badge is handled by the Next Game blue card; plain schedule cards don't show it
  const isLive = isGameLive(_gameRef(g));
  const liveBadge = isLive ? ' <span class="live-badge">🔴 LIVE</span>' : '';
  const followBtn = `<button class="follow-live-btn-sm" onclick="event.stopPropagation();toggleLiveActivity('${_gameRef(g)}')" title="${escHtml(appT('common_follow_live'))}">📡 ${escHtml(appT('common_follow_live'))}</button>`;

  return `
    <div class="sched-card ${capBgClass}${isLive ? ' sched-card-clickable' : ''}"${isLive ? ` onclick="openLiveGameFromSchedule('${escHtml(_gameRef(g))}')"` : ''}>
      <div class="sched-card-top">
        <div class="sched-vs">${TOURNAMENT.clubName ? escHtml(TOURNAMENT.clubName) + ' vs ' : 'vs '}${escHtml(normalizeOpponentName(g.opponent || 'TBD'))}${liveBadge} ${followBtn}</div>
        ${g.gameNum ? `<div class="sched-game-num">${escHtml(g.gameNum)}</div>` : ''}
      </div>
      <div class="sched-meta">
        <span>🕐 ${escHtml(g.time || 'TBD')}${(g.date || g.dateISO) ? ' · ' + escHtml(g.date || formatDateGroupLabel(g.dateISO)) : ''}</span>
        ${g.pool ? `<span>${swimmerEmoji()} ${escHtml(g.pool)}${g.cap ? ` &nbsp;·&nbsp; ${capIcon} ${escHtml(g.cap)} Caps` : ''}</span>` : (g.cap ? `<span>${capIcon} ${escHtml(g.cap || '')} Caps</span>` : '')}
        ${TOURNAMENT.location ? buildLocationLink(TOURNAMENT.location) : ''}
      </div>
    </div>`;
}

function onQuarterToggle(el, period) {
  if (!state.logQuartersOpened) state.logQuartersOpened = {};
  const currentP = state.liveScores[Object.keys(state.liveScores)[0]]?.period || 0;
  const pKey = `${currentP}_p${period}`;
  state.logQuartersOpened[pKey] = el.open;
}

function _onScorerToggle(el, gameId) {
  if (!state.scorerDetailsOpen) state.scorerDetailsOpen = {};
  state.scorerDetailsOpen[gameId] = !!el.open;
  const hdr = document.querySelector('.app-header');
  if (el.open) {
    el.closest('.game-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    hdr?.classList.add('scoring-active');
  } else {
    hdr?.classList.remove('scoring-active');
  }
  syncHeaderHeight();
}

function buildGameCard(g, viewerOnly = false, showLocation = true, ageGroupLabel = '') {
  const result    = _getResultForGame(g);
  const pts       = getPoints(result);
  const win       = isWin(result);
  const loss      = isLoss(result);
  const cardClass = win ? 'result-win' : loss ? 'result-loss' : '';
  const capBgClass = g.cap === 'Dark' ? 'cap-dark-bg' : g.cap === 'White' ? 'cap-white-bg' : '';
  const capIcon   = g.cap === 'Dark' ? '🔵' : '⚪';
  const pillHtml  = result
    ? `<span class="result-pill ${win ? 'win' : 'loss'}">${resultLabel(result)}</span>` : '';
  const capBadge = g.cap
    ? `<span class="game-cap-pill ${g.cap === 'Dark' ? 'game-cap-pill-dark' : 'game-cap-pill-white'}">${capIcon} ${escHtml(g.cap)} Caps</span>`
    : '';
  const primaryMeta = [
    `<span class="icon-label">🕐 ${escHtml(g.time || 'TBD')}${(g.date || g.dateISO) ? ' · ' + escHtml(g.date || g.dateISO) : ''}</span>`,
    g.pool ? `<span class="icon-label">${swimmerEmoji()} ${escHtml(g.pool)}</span>` : '',
    capBadge
  ].filter(Boolean).join('');
  const locationRow = showLocation && TOURNAMENT.location
    ? `<div class="game-location-row">${buildLocationLink(TOURNAMENT.location)}</div>`
    : '';

  const btn = (cls, val, label, p) => {
    const active = result === val ? 'active' : '';
    return `<button class="result-btn ${cls} ${active}" onclick="setResult('${escHtml(_gameRef(g))}','${val}')"><span class="rbtn-label">${label}</span><span class="rbtn-pts">${p} pt${p !== 1 ? 's' : ''}</span></button>`;
  };

  // ── Live scoring / box score section ──────────────────────────────────────
  const s   = getLiveScore(g);
  const gid = escHtml(_gameRef(g));
  const teamDisplayName = _teamDisplayNameForGame(g, TOURNAMENT.clubName || appT('scorer_team_label'));

  // Live broadcast indicator (shown when another device is actively scoring)
  const STALE_MS = 30 * 60 * 1000; // 30 min — after this, treat as stale
  const isRemoteLive = !!(s._remote && s.gameState && s.gameState !== 'pre'
    && (Date.now() - (s._broadcastAt || 0)) < STALE_MS);
  const liveBadgeHtml = isRemoteLive
    ? `<span class="live-badge">🔴 LIVE</span>` : '';
  const liveScoreBarHtml = isRemoteLive ? (() => {
    const updatedAt = s._broadcastAt
      ? new Date(s._broadcastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const periodStr = PERIOD_LABELS[s.period] || '';
    const liveClock = s.clock || '';
    return `<div class="live-score-bar">
      <span class="lsb-scores">${escHtml(teamDisplayName)}&nbsp;<strong>${Number.isInteger(s.team) ? s.team : s.team.toFixed(1)}</strong>&nbsp;—&nbsp;<strong>${Number.isInteger(s.opp) ? s.opp : s.opp.toFixed(1)}</strong>&nbsp;${escHtml(g.opponent||'Opp')}</span>
      ${periodStr ? `<span class="lsb-period">${periodStr}</span>` : ''}
      ${liveClock ? `<span class="lsb-clock">${escHtml(liveClock)}</span>` : ''}
      ${updatedAt ? `<span class="lsb-updated">↻ ${updatedAt}</span>` : ''}
    </div>`;
  })() : '';
  const events = s.events || [];

  // Auto-clock display (replaces manual clock entry row)
  const cs = getClockSettings(gid);

  // Game state bar
  const _isHalves = cs.periodMode === 'halves';
  const GS_OPTS = _isHalves ? [
    { key:'start',    label:'▶ Start'  },
    { key:'q1',       label:'H1'       },
    { key:'half',     label:'½ Time'   },
    { key:'q3',       label:'H2'       },
    { key:'shootout', label:'🎯 SO'    },
    { key:'final',    label:'🏁 End'   },
  ] : [
    { key:'start',    label:'▶ Start'  },
    { key:'q1',       label:'Q1'       },
    { key:'q2',       label:'Q2'       },
    { key:'half',     label:'½ Time'   },
    { key:'q3',       label:'Q3'       },
    { key:'q4',       label:'Q4'       },
    { key:'shootout', label:'🎯 SO'    },
    { key:'final',    label:'🏁 End'   },
  ];
  const TOGGLE_KEYS = new Set(['start', 'shootout', 'final']);
  // Pre-Game reset button — only show once a game state has been set
  const preBtn = (s.gameState && s.gameState !== 'pre')
    ? `<button class="gs-btn gs-btn-pre" onclick="resetToPreGame('${gid}')" title="Reset to Pre-Game">↩ Pre</button>`
    : '';
  const gsBar = preBtn + GS_OPTS.map(o => {
    const active = s.gameState === o.key ? ' gs-active' : '';
    let handler;
    if (o.key === 'start') {
      handler = `startScoring('${gid}')`;
    } else if (TOGGLE_KEYS.has(o.key)) {
      handler = `toggleGameState('${gid}','${o.key}')`;
    } else {
      handler = `setGameState('${gid}','${o.key}')`;
    }
    return `<button class="gs-btn${active}" onclick="${handler}">${o.label}</button>`;
  }).join('');
  const timerSecsLeft = (() => {
    if (s.timerRunning && s.timerStartedAt) {
      const elapsed = (Date.now() - s.timerStartedAt) / 1000;
      return Math.max(0, (s.timerSecondsLeft || 0) - elapsed);
    }
    return s.timerSecondsLeft || 0;
  })();
  const phaseLabel = (() => {
    if (s.timerPhase) return _phaseLabel(s.timerPhase);
    if (s.gameState && s.gameState !== 'pre') return s.gameState.toUpperCase();
    return '';
  })();
  const isBreakPhase = s.timerPhase === 'break12' || s.timerPhase === 'break34' || s.timerPhase === 'halftime';
  const teamTOUsed = s.teamTimeoutsUsed || [];
  const oppTOUsed  = s.oppTimeoutsUsed  || [];

  const timingRow = `
    <div class="auto-clock-wrap">
      <div class="auto-clock-phase">${phaseLabel}</div>
      <div class="auto-clock-time" id="game-clock-${gid}">${fmtClock(timerSecsLeft)}</div>
      <div class="auto-clock-controls">
        ${isBreakPhase ? `<span class="auto-clock-break-label">${s.timerPhase === 'halftime' ? escHtml(appT('scorer_halftime_break')) : escHtml(appT('scorer_quarter_break'))} — ${escHtml(appT('scorer_next_quarter_ready'))}</span>` : `
          ${s.timerRunning
            ? `<button class="auto-clock-btn auto-clock-pause" onclick="pauseGameTimer('${gid}')">⏸ ${escHtml(appT('scorer_pause'))}</button>`
            : `<button class="auto-clock-btn auto-clock-resume" onclick="${s.gameState === 'pre' ? `startScoring('${gid}')` : `resumeGameTimer('${gid}')`}">▶ ${escHtml(s.gameState === 'pre' ? appT('scorer_start') : appT('scorer_resume'))}</button>`
          }
          <button class="auto-clock-btn auto-clock-reset" onclick="resetGameClock('${gid}')">↺ ${escHtml(appT('scorer_reset'))}</button>
        `}
      </div>
      ${cs.timeoutsPerTeam > 0 ? `
      <div class="auto-clock-to-row">
        ${(cs.timeoutLengths||[]).map(m => {
          const used = teamTOUsed.includes(m);
          return `<span class="auto-clock-to-chip${used?' auto-clock-to-used':''}">${used?'✓':'◉'} ${fmtTOLabel(m)}</span>`;
        }).join('')}
        <span class="auto-clock-to-sep">·</span>
        ${(cs.timeoutLengths||[]).map(m => {
          const used = oppTOUsed.includes(m);
          return `<span class="auto-clock-to-chip auto-clock-to-opp${used?' auto-clock-to-used':''}">${used?'✓':'◉'} Opp ${fmtTOLabel(m)}</span>`;
        }).join('')}
      </div>` : ''}
    </div>`;

  // Event log + box score
  const eventLogHtml = buildEventLog(events, s.period, gid);
  const boxScoreHtml = buildBoxScoreHtml(events, normalizeOpponentName(g.opponent || 'Opp'));
  const hasEvents    = events.filter(e=>e.type!=='game_state').length > 0;

  // Scorer mode: show full controls only if no password is set, or password is unlocked
  const canScore = !TOURNAMENT.scoringPassword || isScorerUnlockedForTournament(TOURNAMENT);

  const embeddedDetail = buildEmbeddedScoreCardDetail(g, viewerOnly || !canScore, ageGroupLabel);

  return `
    <div class="game-card ${cardClass} ${capBgClass}">
      ${ageGroupLabel ? `<div class="game-card-age-label">${escHtml(ageGroupLabel)}</div>` : ''}
      <div class="game-card-top">
        <div class="game-vs">${TOURNAMENT.clubName ? escHtml(TOURNAMENT.clubName) + ' vs ' : 'vs '}${escHtml(normalizeOpponentName(g.opponent || 'TBD'))}${pillHtml}${liveBadgeHtml}</div>
        ${g.gameNum ? `<div class="game-num-tag">${escHtml(g.gameNum)}</div>` : ''}
      </div>
      ${liveScoreBarHtml}
      <div class="game-info-row game-info-row-primary">${primaryMeta}</div>
      ${locationRow}
      ${pts !== null ? `<div class="game-info-row"><span class="points-badge">+${pts} bracket pts</span></div>` : ''}

      ${embeddedDetail}

      ${canScore ? `
      <div class="result-row result-row-5">
        ${btn('result-w-btn',  'W',  'WIN',   4)}
        ${btn('result-sw-btn', 'SW', 'SO·W',  3)}
        ${btn('result-sl-btn', 'SL', 'SO·L',  2)}
        ${btn('result-l-btn',  'L',  'LOSS',  1)}
        ${btn('result-f-btn',  'F',  'FF',    0)}
      </div>
      ${s.gameState === 'shootout' ? `
      <div class="result-notify-row">
        <button class="notify-btn" style="background:#fef3c7;color:#92400e;border-color:#f59e0b" onclick="sendShootoutAlert('${gid}','tg')">🎯✈️ Shootout Alert → Telegram</button>
        <button class="notify-btn" style="background:#fef3c7;color:#92400e;border-color:#f59e0b" onclick="sendShootoutAlert('${gid}','gm')">🎯💬 Shootout Alert → GroupMe</button>
      </div>` : ''}
      <div class="result-notify-row">
        <button class="notify-btn notify-tg" onclick="sendBoxScoreNotify('${gid}','tg')">✈️ ${appT('common_send_telegram')}</button>
        <button class="notify-btn notify-gm" onclick="sendBoxScoreNotify('${gid}','gm')">💬 ${appT('common_send_groupme')}</button>
      </div>` : ''}
    </div>`;
}

// ─── RENDER: POSSIBLE GAMES TAB ───────────────────────────────────────────────

// Builds the full location string for a bracket step pin.
// If the step has a short sub-location (pool name like "Main Pool", "Pool E"),
// it is prefixed with the venue name from TOURNAMENT.location so the pin reads
// e.g. "Foothill College · Main Pool" instead of just "Main Pool".
function bracketLocationDisplay(stepLocation) {
  // No location on the step — fall back to the tournament venue
  if (!stepLocation) return (TOURNAMENT.location || '').split(',')[0].trim() || '';
  // If it already looks like a full address (contains a comma) show it as-is
  if (stepLocation.includes(',')) return stepLocation;
  // If step already names a venue building (school / aquatic center / etc.), show as-is
  // This handles multi-venue tournaments where Day 2 games move to a different facility
  if (/\b(hs|high school|college|university|center|aquatic|arena|stadium|park|pool|natatorium)\b/i.test(stepLocation)) {
    return stepLocation;
  }
  // Short sub-location (e.g. "Pool E", "Main Pool") → prepend tournament venue name
  const venue = (TOURNAMENT.location || '').split(',')[0].trim();
  return venue ? `${venue} \u00b7 ${stepLocation}` : stepLocation;
}

function renderPossibleTab() {
  if (!spectatorHasFeature('bracket_view')) {
    const viewEl = document.getElementById('view-possible');
    if (viewEl) viewEl.innerHTML = renderSpectatorNudge('possible');
    return;
  }
  // ── Director standings + reseeding (shown when dir scores exist) ─────────
  const dirPkg = getDirectorPkg();
  const dirGames = dirPkg?.directorGames || [];
  const hasAnyDirScores = dirGames.some(g => state.dirScores[g.id]?.status === 'final');
  if (hasAnyDirScores) {
    const standingsHtml = buildDirStandingsHtml(dirGames);
    const reseedHtml = buildDirReseedHtml(dirPkg, dirGames);
    const standingsCard = document.getElementById('dir-standings-card');
    const container = document.getElementById('view-possible');
    if (container && !standingsCard) {
      const card = document.createElement('div');
      card.id = 'dir-standings-card';
      card.className = 'card tab-card';
      card.innerHTML = `<div class="history-header-row"><h2>${appT('possible_division_standings')}</h2></div>
        <div id="dir-standings-body"></div>
        <div id="dir-reseed-body"></div>`;
      container.insertBefore(card, container.firstChild);
    }
    const bodyEl = document.getElementById('dir-standings-body');
    if (bodyEl) bodyEl.innerHTML = standingsHtml;
    const reseedEl = document.getElementById('dir-reseed-body');
    if (reseedEl) reseedEl.innerHTML = reseedHtml;
  }

  const slots = getExpandedTeamSlots();
  if (slots.length === 0) {
    const listEl = $('possible-list');   if (listEl) listEl.innerHTML = '';
    const descEl = $('possible-desc');   if (descEl) descEl.innerHTML = '';
    const emptyEl = $('possible-empty');
    if (emptyEl) { emptyEl.classList.remove('hidden'); emptyEl.innerHTML = appT('possible_select_prompt'); }
    return;
  }
  if (slots.length > 1 && !_inMultiRender) { _renderPossibleMulti(slots); return; }
  const listEl  = $('possible-list');
  const emptyEl = $('possible-empty');
  const descEl  = $('possible-desc');
  if (!listEl || !emptyEl) return; // tab not in DOM yet — will re-render when tab is switched to
  listEl.innerHTML = '';

  // Upcoming mode — no games loaded yet, or upcomingMode flag is set
  const hasGames = Array.isArray(TOURNAMENT.games) && TOURNAMENT.games.length > 0 && !TOURNAMENT.upcomingMode;
  if (!hasGames) {
    emptyEl.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:2rem;margin-bottom:10px">🏆</div>
        <div style="font-weight:700;font-size:1rem;margin-bottom:6px">${appT('possible_coming_soon_title')}</div>
        <div style="color:var(--gray-600);font-size:0.88rem;line-height:1.55">
          ${appT('possible_coming_soon_body')}
        </div>
      </div>`;
    emptyEl.classList.remove('hidden');
    descEl.textContent = '';
    return;
  }

  const paths = getTournamentBracketPaths();
  if (!paths?.length) { emptyEl.innerHTML = appT('possible_no_data'); emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');

  const projected  = inferProjectedPath();
const allPoolDone = getTournamentGames().every(g => _getResultForGame(g)) && getTournamentGames().length > 0;

  if (projected) {
    descEl.textContent = allPoolDone
      ? appFormat('possible_confirmed', { record: getPoolRecord(), label: projected.label })
      : appFormat('possible_projected', { record: getPoolRecord(), label: projected.label });
  } else {
    descEl.textContent = appT('possible_mark_results');
  }

  paths.forEach(path => {
    const isProjected  = projected && path.id === projected.id;
    const isEliminated = projected && !isProjected;

    const section = document.createElement('div');
    section.className = `bracket-section${isProjected ? ' projected' : isEliminated ? ' eliminated' : ''}`;

    const header = document.createElement('div');
    header.className = 'bracket-header';
    header.innerHTML = `
      <span class="bracket-title">${escHtml(path.label)}</span>
      ${isProjected ? `<span class="bracket-projected-badge">${appT('possible_projected_badge')}</span>` : ''}`;
    section.appendChild(header);

    if (path.qualifier) {
      const qual = document.createElement('div');
      qual.className = 'bracket-qualifier';
      qual.textContent = path.qualifier;
      section.appendChild(qual);
    }

    (path.steps || []).forEach(step => {
      const stepKey    = `${path.id}-${step.gameNum}`;
      const stepResult = state.bracketResults[stepKey] || null;
      const timeStr    = step.time && step.time !== 'TBD'
        ? `${escHtml(step.date || '')} · ${escHtml(step.time)}`
        : step.date ? escHtml(step.date) : 'Time TBD';
      const resultPill = stepResult
        ? `<span class="result-pill ${stepResult==='W'?'win':'loss'}">${stepResult==='W'?'WIN':'LOSS'}</span>` : '';
      const resultBtns = isProjected ? `
        <div class="bracket-result-row">
          <button class="bracket-result-btn win-btn  ${stepResult==='W'?'active':''}" onclick="setBracketResult('${stepKey}','W')">WIN</button>
          <button class="bracket-result-btn loss-btn ${stepResult==='L'?'active':''}" onclick="setBracketResult('${stepKey}','L')">LOSS</button>
        </div>` : '';

      const stepLocDisplay = bracketLocationDisplay(step.location);
      const row = document.createElement('div');
      row.className = 'bracket-step-row';
      row.innerHTML = `
        <div class="bracket-step-num">${escHtml(step.gameNum || '')}</div>
        <div class="bracket-step-inner">
          <div class="bracket-step-desc">${escHtml(step.desc || '')}${resultPill}</div>
          <div class="bracket-step-meta">
            <span>${timeStr}</span>
            ${stepLocDisplay ? `<span>📍 ${escHtml(stepLocDisplay)}</span>` : ''}
          </div>
          ${resultBtns}
        </div>`;
      section.appendChild(row);
    });

    listEl.appendChild(section);
  });
}

// ─── RENDER: HISTORY TAB ──────────────────────────────────────────────────────

function buildHistoryCard(t, options = {}) {
  const { expanded = false } = options;
  const { wins = 0, losses = 0, record = '0-0', totalPoints } = t;
  const recordClass = wins > losses ? 'winning' : losses > wins ? 'losing' : 'even';

  const gameRowsHtml = (t.games || []).map(g => {
    const r  = g.result;
    const rc = isWin(r) ? 'win' : isLoss(r) ? 'loss' : 'none';
    const rl = resultLabel(r);

    // Live scoring data (saved at archive time) — support both events[] and old goals[]
    const ls      = g.liveScore || {};
    const allEvts = ls.events || (ls.goals
      ? ls.goals.map(g2 => ({ type: g2.side === 'team' ? 'goal' : 'opp_goal', ...g2 }))
      : []);
    const nonState = allEvts.filter(e => e.type !== 'game_state');
    const recomputed = allEvts.length ? recomputeScores(allEvts) : null;
    const syncedScore = (g.teamScore !== '' && g.teamScore != null && g.oppScore !== '' && g.oppScore != null)
      ? `${g.teamScore}-${g.oppScore}`
      : '';
    const hasMeaningfulLiveScore = !!(recomputed && (
      nonState.length ||
      (recomputed.team ?? 0) !== 0 ||
      (recomputed.opp ?? 0) !== 0
    ));
    // Director-scored games: liveScore has .team/.opp but no goal events
    const lsDirectScore = (!hasMeaningfulLiveScore && typeof ls.team === 'number' && typeof ls.opp === 'number' && (ls.team > 0 || ls.opp > 0))
      ? `${ls.team}-${ls.opp}` : '';
    // Old history entries may have score stored as a liveScore object — extract team/opp
    const scoreObj = (!hasMeaningfulLiveScore && g.score && typeof g.score === 'object')
      ? (typeof g.score.team === 'number' && typeof g.score.opp === 'number' && (g.score.team > 0 || g.score.opp > 0)
          ? `${g.score.team}-${g.score.opp}` : '')
      : '';
    const scoreLabel = hasMeaningfulLiveScore
      ? `${recomputed.team ?? 0}-${recomputed.opp ?? 0}`
      : (syncedScore || lsDirectScore || scoreObj || (typeof g.score === 'string' ? g.score : '') || (typeof g.time === 'string' ? g.time : '') || '');

    // Goal scorer chips
    const teamGoals   = nonState.filter(ev => ev.type === 'goal');
    const scorerChips = teamGoals.map(ev => {
      const cap   = ev.cap || '';
      const name  = ev.name || '';
      const label = cap
        ? `#${escHtml(cap)} ${escHtml(name.split(' ')[0])}`
        : escHtml(name.split(' ')[0] || '?');
      const sixTag = ev.sixOnFive ? ' ⚡' : '';
      return `<span class="hist-scorer-chip">${label}${sixTag}</span>`;
    }).join('');

    // Assist chips
    const teamAssists  = nonState.filter(ev => ev.type === 'assist');
    const assistChips  = teamAssists.map(ev => {
      const cap   = ev.cap || '';
      const name  = ev.name || '';
      const label = cap
        ? `#${escHtml(cap)} ${escHtml(name.split(' ')[0])}`
        : escHtml(name.split(' ')[0] || '?');
      return `<span class="hist-scorer-chip hist-assist-chip">${label}</span>`;
    }).join('');

    // Per-player box score table (only when meaningful data exists)
    const playerMap = {};
    for (const ev of nonState) {
      if (ev.side !== 'team') continue;
      const k = ev.cap || ev.name || '?';
      if (!playerMap[k]) playerMap[k] = { cap: ev.cap||'', name: ev.name||'', G:0, A:0, Ex:0 };
      if (ev.type === 'goal')                              playerMap[k].G++;
      if (ev.type === 'assist')                            playerMap[k].A++;
      if (ev.type === 'exclusion' || ev.type === 'brutality') playerMap[k].Ex++;
    }
    const playerRows = Object.values(playerMap)
      .sort((a, b) => parseInt(a.cap||'999') - parseInt(b.cap||'999'));
    const hasStats   = playerRows.some(p => p.G || p.A || p.Ex);

    const boxScoreTable = hasStats ? `
      <div class="hist-box-score">
        <div class="hist-bs-row hist-bs-header">
          <span class="hist-bs-player">${appT('history_player_label')}</span>
          <span class="hist-bs-stat">G</span>
          <span class="hist-bs-stat">A</span>
          <span class="hist-bs-stat">Ex</span>
        </div>
        ${playerRows.filter(p => p.G || p.A || p.Ex).map(p => `
          <div class="hist-bs-row">
            <span class="hist-bs-player">${p.cap ? `#${escHtml(p.cap)} ` : ''}${escHtml((p.name||'').split(' ')[0] || '?')}</span>
            <span class="hist-bs-stat">${p.G || '—'}</span>
            <span class="hist-bs-stat">${p.A || '—'}</span>
            <span class="hist-bs-stat">${p.Ex || '—'}</span>
          </div>`).join('')}
      </div>` : '';

    return `
      <div class="history-game-row history-game-row-clickable" onclick="openHistoryGameDetail('${escHtml(t.id)}', ${t.games.indexOf(g)})">
        ${g.gameNum ? `<span class="hg-num">${escHtml(g.gameNum)}</span>` : ''}
        <span class="hg-vs">vs ${escHtml(normalizeOpponentName(g.opponent || 'TBD'))}</span>
        ${scoreLabel ? `<span class="hg-score">${escHtml(scoreLabel)}</span>` : ''}
        ${g.points != null ? `<span class="hg-pts">+${g.points}</span>` : ''}
        <span class="hg-result ${rc}">${rl}</span>
      </div>
      ${scorerChips ? `
        <div class="hist-scorer-row">
          <span class="hist-scorers-label">${appT('history_goals_label')}</span>
          <div class="hist-scorer-chips">${scorerChips}</div>
        </div>` : ''}
      ${assistChips ? `
        <div class="hist-scorer-row">
          <span class="hist-scorers-label">${appT('history_assists_label')}</span>
          <div class="hist-scorer-chips">${assistChips}</div>
        </div>` : ''}
      ${boxScoreTable}`;
  }).join('');

  const bracketRowsHtml = (t.bracketPaths || []).flatMap(p =>
    (p.steps || []).filter(s => s.result).map(s => {
      const r = s.result;
      const rc = r === 'W' ? 'win' : r === 'L' ? 'loss' : 'none';
      return `<div class="history-game-row">
        ${s.gameNum ? `<span class="hg-num">${escHtml(s.gameNum)}</span>` : ''}
        <span class="hg-vs">${escHtml(s.desc || 'Bracket')}</span>
        <span class="hg-meta">${escHtml(p.label || '')}</span>
        <span class="hg-result ${rc}">${r}</span>
      </div>`;
    })
  ).join('');

  const card = document.createElement('div');
  card.className = `history-card${expanded ? ' expanded' : ''}`;
  card.id = `history-card-${t.id}`;
  card.innerHTML = `
    <div class="history-card-header" onclick="toggleHistoryCard('${t.id}')">
      <div class="history-name-block">
        <div class="history-tournament-name">${escHtml(t.name || 'Tournament')}</div>
        <div class="history-meta">${[t.dates, t.location, t.pool].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="history-badges">
        <div class="history-record-badge ${recordClass}">${escHtml(record)}</div>
        ${totalPoints != null ? `<div class="history-pts-badge">${totalPoints} pts</div>` : ''}
      </div>
      <div class="history-expand-icon">▼</div>
    </div>
    <div class="history-games">
      ${gameRowsHtml}${bracketRowsHtml}
      ${!gameRowsHtml && !bracketRowsHtml
        ? '<div class="history-game-row" style="color:var(--gray-400);font-size:.85rem;">No results recorded.</div>'
        : ''}
    </div>`;
  return card;
}

function _renderPossibleMulti(slots) {
  $('possible-desc').textContent = '';
  $('possible-list').innerHTML = slots.map(({ groupKey, letter, suffix }) =>
    `<div class="team-section">
      <div class="scores-slot-header slot-header-in-card"><span class="scores-slot-label">${escHtml(_groupSectionLabelFor(groupKey, letter))}</span></div>
      <div id="possible-desc-${suffix}" class="possible-desc"></div>
      <div id="possible-list-${suffix}"></div>
      <div id="possible-empty-${suffix}" class="empty-msg hidden"></div>
    </div>`
  ).join('');
  $('possible-empty').classList.add('hidden');

  _inMultiRender = true;
  for (const { groupKey, letter, suffix } of slots) {
    const cache = TEAM_CACHE[groupKey];
    if (!cache) continue;
    const savedT = window.TOURNAMENT, savedH = window.HISTORY_SEED;
    window.TOURNAMENT = cache.tournament; window.HISTORY_SEED = cache.history || [];
    _activeAgeGroup = groupKey;
    _activeTeamLetters = letter ? [letter] : null;
    _renderSuffix = '-' + suffix;
    renderPossibleTab();
    _renderSuffix = '';
    _activeTeamLetters = null;
    _activeAgeGroup = null;
    window.TOURNAMENT = savedT; window.HISTORY_SEED = savedH;
  }
  _inMultiRender = false;
}

function renderHistoryTab() {
  if (!spectatorHasFeature('spectator_stats')) {
    const viewEl = document.getElementById('view-history');
    if (viewEl) viewEl.innerHTML = renderSpectatorNudge('history');
    return;
  }
  const slots = getExpandedTeamSlots();

  // No teams selected — show empty prompt
  if (slots.length === 0 && !_inMultiRender) {
    const viewEl = document.getElementById('view-history');
    if (viewEl) viewEl.innerHTML = `<div class="card tab-card">
      <div class="history-header-row"><h2>${appT('history_title')}</h2></div>
      <p class="step-desc">${appT('history_select_prompt')}</p>
    </div>`;
    return;
  }

  // Multi-team render
  if (slots.length > 1 && !_inMultiRender) { _renderHistoryMulti(slots); return; }

  const historyDetailCtx = _getHistoryDetailContext();
  if (state.historyDetail && historyDetailCtx) {
    const viewEl = document.getElementById('view-history');
    if (viewEl) viewEl.innerHTML = buildHistoryGameDetailView(historyDetailCtx);
    return;
  }
  if (state.historyDetail && !historyDetailCtx) state.historyDetail = null;

  // Single-team: ensure static HTML structure exists (may have been replaced by multi-render)
  if (!_inMultiRender && slots.length === 1) {
    const viewEl = document.getElementById('view-history');
    if (viewEl && !viewEl.querySelector('#history-list')) {
      const label = _groupSectionLabelFor(slots[0].groupKey, slots[0].letter);
      viewEl.innerHTML = `<div class="card tab-card">
        <div class="history-header-row">
          <h2>${appT('history_title')}</h2>
          <span class="history-subtitle" id="history-subtitle">${escHtml(label)}</span>
        </div>
        <p class="step-desc" id="history-desc">${appT('history_desc')}</p>
        <div id="history-team-search"></div>
        <div id="history-standings"></div>
        <div id="history-list"></div>
        <div id="history-empty" class="empty-msg hidden">
          ${appT('history_empty')}
        </div>
      </div>`;
    } else {
      const subtitleEl = viewEl?.querySelector('#history-subtitle');
      if (subtitleEl) subtitleEl.textContent = _groupSectionLabelFor(slots[0].groupKey, slots[0].letter);
    }
  }
  const listEl  = $('history-list');
  const emptyEl = $('history-empty');
  const history = getHistoryForActiveTeam().filter(h => h.id !== TOURNAMENT.id);
  const virtualT = _getVirtualHistoryEntry();
  const seasonEntries = virtualT ? [virtualT, ...history] : history;
  listEl.innerHTML = '';

  // Clear old top-level standings slot — standings are now embedded per tournament
  const standingsEl = $('history-standings');
  if (standingsEl) standingsEl.innerHTML = '';

  renderHistoryTeamSearch();

  // ── Season Dashboard (record overview) ─────────────────────────────────────
  if (standingsEl && seasonEntries.length) {
    let totalW = 0, totalL = 0, totalGF = 0, totalGA = 0, totalGames = 0;
    for (const h of seasonEntries) {
      totalW += h.wins || 0;
      totalL += h.losses || 0;
      for (const g of (h.games || [])) {
        const evts = g.liveScore?.events || [];
        const rec = evts.length ? recomputeScores(evts) : null;
        const gf = rec ? rec.team : (g.liveScore?.team ?? g.liveScore?.us);
        const ga = rec ? rec.opp : (g.liveScore?.opp ?? g.liveScore?.them);
        if (typeof gf === 'number') totalGF += gf;
        if (typeof ga === 'number') totalGA += ga;
      }
      totalGames += (h.games || []).filter(g => g.result).length;
    }
    const totalPlayed = totalW + totalL;
    const pct = totalPlayed ? Math.round((totalW / totalPlayed) * 100) : 0;
    const pctColor = pct >= 70 ? '#16a34a' : pct >= 50 ? '#ca8a04' : pct >= 30 ? '#ea580c' : '#dc2626';
    const pctBg = pct >= 70 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : pct >= 30 ? '#fff7ed' : '#fef2f2';

    // Get current team label for the header
    const teamLabel = (() => {
      if (_activeAgeGroup) {
        const activeLetter = _activeTeamLetters?.length === 1 ? _activeTeamLetters[0] : null;
        return _groupSectionLabelFor(_activeAgeGroup, activeLetter);
      }
      const slot = getExpandedTeamSlots()[0];
      if (slot) return _groupSectionLabelFor(slot.groupKey, slot.letter);
      return '';
    })();

    // ── League summary cards (Futures + BAWL) ──────────────────────────────
    const _leagueDefs = [
      { key: 'futures', label: 'Kap 7 Futures League', filter: e => /futures|kap.?7/i.test((e.name || '') + (e.id || '')) },
      { key: 'bawl',    label: 'Bay Area WP League',   filter: e => /bay area|bawl/i.test((e.name || '') + (e.id || '')) },
    ];
    // Group history entries by sub-team label (same logic as TOURNEY_GROUPS detail sections)
    const _leagueTeamKey = e => e.team || e.subtitle || '';
    const _leagueCards = _leagueDefs.map(def => {
      const le = history.filter(def.filter);
      if (!le.length) return '';

      // Group by sub-team
      const byTeam = {};
      le.forEach(e => {
        const k = _leagueTeamKey(e) || 'All';
        if (!byTeam[k]) byTeam[k] = [];
        byTeam[k].push(e);
      });
      const teamKeys = Object.keys(byTeam).sort((a, b) => {
        const order = ['Team', 'Team A', 'Team A1', 'Team A2', 'Team B', 'A', 'A1', 'A2', 'B', 'All', 'Other'];
        return (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99);
      });
      const multiTeam = teamKeys.length > 1;

      const rows = teamKeys.map(tk => {
        const te = byTeam[tk];
        const tPts = te.reduce((s, h) => s + (h.totalPoints || 0), 0);
        const tW   = te.reduce((s, h) => s + (h.wins   || 0), 0);
        const tL   = te.reduce((s, h) => s + (h.losses || 0), 0);
        const tT   = te.reduce((s, h) => s + (h.ties   || 0), 0);
        const tRec = tT ? `${tW}W–${tL}L–${tT}T` : `${tW}W–${tL}L`;
        if (multiTeam) {
          return `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-top:1px solid var(--g100)">
            <span style="flex:1;font-size:0.78rem;font-weight:700;color:var(--text)">${escHtml(tk)}</span>
            <span style="font-size:0.72rem;color:var(--gray-500)">${tRec}</span>
            <span style="font-size:0.85rem;font-weight:800;color:var(--royal);min-width:42px;text-align:right">${tPts} pts</span>
          </div>`;
        }
        // Single team — show totals inline under label
        return `<div style="font-size:1.4rem;font-weight:900;color:var(--royal);line-height:1.1;margin-top:2px">${tPts} pts</div>
          <div style="font-size:0.72rem;color:var(--gray-500);margin-top:3px">${tRec} · ${te.length} event${te.length !== 1 ? 's' : ''}</div>`;
      }).join('');

      return `<div class="card tab-card" style="flex:1;padding:14px 16px;margin-bottom:0">
        <div style="font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:var(--gray-500);margin-bottom:${multiTeam ? 2 : 4}px">${escHtml(def.label)}</div>
        ${rows}
      </div>`;
    }).filter(Boolean);
    const _leagueHtml = _leagueCards.length
      ? `<div style="display:flex;gap:10px;margin-bottom:14px">${_leagueCards.join('')}</div>`
      : '';

    standingsEl.innerHTML = _leagueHtml + `
      <div class="card tab-card season-record-card" style="padding:18px 20px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
          <div style="flex:1">
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--gray-500);margin-bottom:4px">Season Record${teamLabel ? ' · ' + escHtml(teamLabel) : ''}</div>
            <div style="font-size:1.6rem;font-weight:800;color:var(--text);line-height:1.2">${totalW}W - ${totalL}L</div>
            <div style="font-size:0.85rem;color:var(--gray-500);margin-top:2px">${totalGames} games · ${seasonEntries.length} tournament${seasonEntries.length > 1 ? 's' : ''}${totalGF || totalGA ? ` · ${totalGF} GF / ${totalGA} GA` : ''}</div>
          </div>
          <div style="width:58px;height:58px;border-radius:50%;background:${pctBg};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;border:2px solid ${pctColor}44">
            <span style="font-size:1.1rem;font-weight:900;color:${pctColor}">${pct}%</span>
            <span style="font-size:0.55rem;font-weight:700;text-transform:uppercase;color:${pctColor};margin-top:-2px">Wins</span>
          </div>
        </div>
        <div style="height:8px;background:rgba(var(--royal-rgb),.08);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:4px;transition:width .3s"></div>
        </div>
      </div>
    `;
  }

  // ── Season Stats aggregate (Phase 5D) ─────────────────────────────────────
  if (standingsEl && seasonEntries.length) {
    const seasonStats = {};
    for (const h of seasonEntries) {
      const ps = h.playerStats || {};
      for (const [name, s] of Object.entries(ps)) {
        if (!seasonStats[name]) seasonStats[name] = { goals: 0, assists: 0, steals: 0, exclusions: 0, gamesPlayed: 0, tournaments: 0 };
        seasonStats[name].goals += s.goals || 0;
        seasonStats[name].assists += s.assists || 0;
        seasonStats[name].steals += s.steals || 0;
        seasonStats[name].exclusions += s.exclusions || 0;
        seasonStats[name].gamesPlayed += s.gamesPlayed || 0;
        seasonStats[name].tournaments++;
      }
    }
    const sorted = Object.entries(seasonStats).sort((a, b) => b[1].goals - a[1].goals);
    if (sorted.length) {
      const rows = sorted.slice(0, 15).map(([name, s], i) =>
        `<tr><td style="font-weight:600">${i + 1}. ${escHtml(name)}</td><td>${s.goals}</td><td>${s.assists}</td><td>${s.steals}</td><td>${s.gamesPlayed}</td></tr>`
      ).join('');
      standingsEl.innerHTML += `
        <div class="card tab-card" style="padding:10px 18px;margin-bottom:16px">
          <details class="season-stats-details">
            <summary style="font-weight:800;font-size:0.88rem;cursor:pointer;padding:8px 0;display:flex;align-items:center;gap:8px">
              <span style="font-size:1.1rem">📊</span>
              <span style="flex:1">Season Stats (${seasonEntries.length} tournament${seasonEntries.length > 1 ? 's' : ''})</span>
              <span class="hs-chevron" style="font-size:0.7rem;color:var(--gray-500)">▼</span>
            </summary>
            <div style="overflow-x:auto;margin-top:6px;padding-bottom:8px">
              <table class="season-stats-table" style="width:100%;border-collapse:collapse;font-size:0.85rem">
                <thead>
                  <tr style="text-align:left;color:var(--gray-500);text-transform:uppercase;font-size:0.65rem;letter-spacing:0.5px">
                    <th style="padding:8px 4px">Player</th>
                    <th style="padding:8px 4px">G</th>
                    <th style="padding:8px 4px">A</th>
                    <th style="padding:8px 4px">S</th>
                    <th style="padding:8px 4px">GP</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </details>
        </div>`;
    }
  }

  // ── Current tournament: completed games section ───────────────────────────
  const completedNow = getTournamentGames().filter(g => _getResultForGame(g));
  if (completedNow.length) {
    emptyEl.classList.add('hidden');
    
    // Use the rich virtual history entry to get full stats/scores
    if (virtualT) {
      const cardWrap = document.createElement('div');
      cardWrap.className = 'history-section-card';
      listEl.appendChild(cardWrap);

      // Section heading
      const curHead = document.createElement('div');
      curHead.className = 'history-section-heading history-section-toggle';
      curHead.setAttribute('aria-expanded', 'true'); // expanded by default for active tourney
      curHead.innerHTML = `<span class="hs-title">${escHtml(TOURNAMENT.name || 'Current Tournament')}</span><span class="hs-chevron">▼</span>`;
      cardWrap.appendChild(curHead);

      // Section content - uses buildHistoryCard for rich score/stat display
      const curContent = document.createElement('div');
      curContent.id = 'hs-content-current';
      curContent.className = 'history-section-content expanded';
      cardWrap.appendChild(curContent);
      
      curContent.appendChild(buildHistoryCard(virtualT, { expanded: true }));
      
      // Allow collapsing if clicked
      curHead.onclick = () => toggleHistorySection('hs-content-current', curHead);
    }
  }

  if (!history.length && !completedNow.length) { emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');

  const TEAM_ORDER = ['Team', 'Team A', 'Team A1', 'Team A2', 'Team B', 'A', 'A1', 'A2', 'B', 'Other'];

  // Each entry defines one tournament section shown in the history tab
  // (newest season first). Set noStandings:true for tournaments with no bracket points.
  const TOURNEY_GROUPS = [
    {
      heading:   'Kap 7 Futures League · 2026',
      shortName: 'Kap 7 Futures League',
      filter:    e => /futures|kap.?7/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:     '14U SoCal International Tournament · 2026',
      shortName:   'SoCal International 2026',
      noStandings: true,
      filter:      e => /socal.?intl|socal.?international/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:   'Bay Area Water Polo League · Winter 2025–2026',
      shortName: 'BAWL Winter 2025–2026',
      filter:    e => /bay area|bawl/i.test((e.name || '') + (e.id || ''))
                   && /winter/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:   'Bay Area Water Polo League · Fall 2025–2026',
      shortName: 'BAWL Fall 2025–2026',
      filter:    e => /bay area|bawl/i.test((e.name || '') + (e.id || ''))
                   && /fall/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:     'Evan Cousineau Memorial Cup · 2025',
      shortName:   'EC Cup 2025',
      noStandings: true,
      filter:      e => /evan.?cousineau|ec.?cup/i.test((e.name || '') + (e.id || '')),
    },
    {
      heading:    'Pacific Zone Champions Cup Qualification · 2025',
      shortName:  'Pacific Zone Qual 2025',
      noStandings: true,
      filter:     e => /pac.?zone|champions.?cup/i.test((e.name || '') + (e.id || '')),
    },
  ];

  TOURNEY_GROUPS.forEach((group, gi) => {
    const entries = history.filter(group.filter);
    if (!entries.length) return;

    const sectionId = `hs-content-${gi}`;

    const cardWrap = document.createElement('div');
    cardWrap.className = 'history-section-card';
    listEl.appendChild(cardWrap);

    // ── Collapsible section heading ───────────────────────────────────────────
    const secEl = document.createElement('div');
    secEl.className = 'history-section-heading history-section-toggle';
    secEl.setAttribute('aria-expanded', 'false');
    secEl.innerHTML = `<span class="hs-title">${escHtml(group.heading)}</span><span class="hs-chevron">▶</span>`;
    secEl.onclick = () => toggleHistorySection(sectionId, secEl);
    cardWrap.appendChild(secEl);

    // ── Collapsible content wrapper (collapsed by default) ────────────────────
    const contentEl = document.createElement('div');
    contentEl.id = sectionId;
    contentEl.className = 'history-section-content';
    cardWrap.appendChild(contentEl);

    // ── Standings card (only for tournaments with bracket points) ─────────────
    if (!group.noStandings) {
      const standDiv = document.createElement('div');
      standDiv.className = 'history-section-standings';
      standDiv.innerHTML = buildStandingsHtml(entries, group.shortName);
      contentEl.appendChild(standDiv);
    }

    // ── Team sub-sections ────────────────────────────────────────────────────
    const byTeam = {};
    entries.forEach(e => {
      const sub = e.subtitle || '';
      const key = e.team
        || (/Team B/i.test(sub) ? 'Team B' : /Team A/i.test(sub) ? 'Team A' : 'Other');
      if (!byTeam[key]) byTeam[key] = [];
      byTeam[key].push(e);
    });

    const teamKeys = Object.keys(byTeam).sort((a, b) => {
      const ai = TEAM_ORDER.indexOf(a), bi = TEAM_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    // Only show sub-team headings when there are multiple distinct teams in this section
    const showSubHeadings = teamKeys.length > 1;

    teamKeys.forEach(team => {
      if (showSubHeadings) {
        const th = document.createElement('div');
        th.className = 'history-team-heading';
        th.textContent = team;
        contentEl.appendChild(th);
      }
      byTeam[team].forEach(t => contentEl.appendChild(buildHistoryCard(t)));
    });
  });

  // ── Ungrouped entries (manually added via admin) — group by season ─────────
  const grouped = new Set();
  TOURNEY_GROUPS.forEach(g => history.filter(g.filter).forEach(e => grouped.add(e.id)));
  const ungrouped = history.filter(e => !grouped.has(e.id));

  if (ungrouped.length) {
    // Group by season, or "Other Tournaments" if no season set
    const bySeason = {};
    const seasonOrder = [];
    for (const h of ungrouped) {
      const s = h.season || 'Other Tournaments';
      if (!bySeason[s]) { bySeason[s] = []; seasonOrder.push(s); }
      bySeason[s].push(h);
    }
    seasonOrder.forEach((season, si) => {
      const sEntries = bySeason[season];
      const sectionId = `hs-content-season-${si}`;

      const cardWrap = document.createElement('div');
      cardWrap.className = 'history-section-card';
      listEl.appendChild(cardWrap);

      const totalW = sEntries.reduce((s, h) => s + (h.wins || 0), 0);
      const totalL = sEntries.reduce((s, h) => s + (h.losses || 0), 0);
      const record = totalW || totalL ? ` · ${totalW}W–${totalL}L` : '';

      const secEl = document.createElement('div');
      secEl.className = 'history-section-heading history-section-toggle';
      secEl.setAttribute('aria-expanded', 'false');
      secEl.innerHTML = `<span class="hs-title">${escHtml(season)}${record}</span><span class="hs-chevron">▶</span>`;
      secEl.onclick = () => toggleHistorySection(sectionId, secEl);
      cardWrap.appendChild(secEl);

      const contentEl = document.createElement('div');
      contentEl.id = sectionId;
      contentEl.className = 'history-section-content';
      cardWrap.appendChild(contentEl);

      sEntries.forEach(t => contentEl.appendChild(buildHistoryCard(t)));
    });
  }
}

function toggleHistorySection(contentId, headingEl) {
  const el = document.getElementById(contentId);
  if (!el) return;
  const isOpen = el.classList.toggle('expanded');
  if (headingEl) {
    headingEl.setAttribute('aria-expanded', String(isOpen));
    const chevron = headingEl.querySelector('.hs-chevron');
    if (chevron) chevron.textContent = isOpen ? '▼' : '▶';
  }
}

function toggleHistoryCard(id) {
  document.getElementById(`history-card-${id}`)?.classList.toggle('expanded');
}

// ─── HISTORY SEED ─────────────────────────────────────────────────────────────
// Removes any test/placeholder history entries that should never appear in production.
const PURGE_IDS = [
  // Add any test/placeholder history IDs here to auto-purge them on load
];
function purgeTestHistory() {
  const history = getHistory();
  const cleaned = history.filter(h => !PURGE_IDS.includes(h.id));
  if (cleaned.length !== history.length) {
    localStorage.setItem(STORE.HISTORY, JSON.stringify(cleaned));
  }
}

// Merges HISTORY_SEED entries from tournament.js into localStorage on first load.
// Entries already in history (matched by id) are never overwritten.

function seedHistory() {
  if (typeof HISTORY_SEED === 'undefined' || !HISTORY_SEED.length) return;
  const history = getHistory();
  let changed = false;
  for (const entry of HISTORY_SEED) {
    const idx = history.findIndex(h => h.id === entry.id);
    if (idx >= 0) {
      // Always overwrite seed entries so updates (like added points) propagate
      if (JSON.stringify(history[idx]) !== JSON.stringify(entry)) {
        history[idx] = entry;
        changed = true;
      }
    } else {
      history.push(entry);   // append — seed entries are older, show after current
      changed = true;
    }
  }
  if (changed) localStorage.setItem(STORE.HISTORY, JSON.stringify(history));
}

// ─── CUMULATIVE STANDINGS ─────────────────────────────────────────────────────
// Pass in a filtered array of history entries; returns sorted team totals.

function getCumulativeStandings(entries) {
  const TEAM_ORDER = ['Team', 'Team A', 'Team A1', 'Team A2', 'Team B'];
  const map = {};
  for (const entry of entries) {
    const sub  = entry.subtitle || '';
    const subtitleTeamMatch = sub.match(/^(.+?)\s+[ABC](?=\s*[·|-]|$)/i);
    // Resolve team label: explicit entry.team, or inferred from subtitle
    const team = entry.team
      || (/Team B/i.test(sub) ? 'Team B' : /Team A/i.test(sub) ? 'Team A'
        : subtitleTeamMatch ? subtitleTeamMatch[0].trim() : null);
    if (!team) continue;
    if (!map[team]) map[team] = { team, pts: 0, wins: 0, losses: 0, days: 0 };
    map[team].pts    += entry.totalPoints || 0;
    map[team].wins   += entry.wins        || 0;
    map[team].losses += entry.losses      || 0;
    map[team].days++;
  }
  return Object.values(map).sort((a, b) => {
    const d = (b.pts - a.pts) || (b.wins - a.wins);
    return d !== 0 ? d : TEAM_ORDER.indexOf(a.team) - TEAM_ORDER.indexOf(b.team);
  });
}

// Builds and returns the HTML for a standings card for the given entries.
function buildStandingsHtml(entries, seriesLabel) {
  const standings = getCumulativeStandings(entries);
  if (!standings.length) return '';
  const maxPts = Math.max(...standings.map(s => s.pts));
  const rows = standings.map((s, i) => {
    const isLeader = s.pts === maxPts && s.pts > 0;
    const pos = i === 0 && isLeader ? '🥇' : i === 1 ? '🥈' : `${i + 1}`;
    return `
      <div class="standings-row${isLeader ? ' standings-leader' : ''}">
        <span class="standings-pos">${pos}</span>
        <span class="standings-team-name">${escHtml(s.team)}</span>
        <span class="standings-wl">${s.wins}-${s.losses} · ${s.days} day${s.days !== 1 ? 's' : ''}</span>
        <span class="standings-pts">${s.pts} pts</span>
      </div>`;
  }).join('');
  return `
    <div class="standings-card">
      <div class="standings-heading">Bracket Points Standings</div>
      <div class="standings-series">${escHtml(seriesLabel)} · Cumulative</div>
      ${rows}
    </div>`;
}

function _renderHistoryMulti(slots) {
  const viewEl = document.getElementById('view-history');
  if (!viewEl) return;
  viewEl.innerHTML = `<div class="card tab-card">
    <div class="history-header-row"><h2>Tournament History</h2></div>
    <p class="step-desc">Results for all your selected age groups.</p>
    ${slots.map(({ groupKey, letter, suffix }) =>
      `<div class="team-section" style="margin:0 -2px">
        <div class="scores-slot-header"><span class="scores-slot-label">${escHtml(_groupSectionLabelFor(groupKey, letter))}</span></div>
        <div id="history-team-search-${suffix}"></div>
        <div id="history-standings-${suffix}"></div>
        <div id="history-list-${suffix}"></div>
        <div id="history-empty-${suffix}" class="empty-msg hidden">No history yet.</div>
      </div>`
    ).join('')}
  </div>`;

  _inMultiRender = true;
  for (const { groupKey, letter, suffix } of slots) {
    const cache = TEAM_CACHE[groupKey];
    if (!cache) continue;
    const savedT = window.TOURNAMENT, savedH = window.HISTORY_SEED;
    window.TOURNAMENT   = cache.tournament;
    window.HISTORY_SEED = cache.history || [];
    _historyOverride    = cache.history || [];
    _activeAgeGroup     = groupKey;
    _activeTeamLetters  = letter ? [letter] : null;
    _renderSuffix       = '-' + suffix;
    renderHistoryTab();
    _renderSuffix      = '';
    _activeTeamLetters = null;
    _activeAgeGroup    = null;
    _historyOverride   = null;
    window.TOURNAMENT   = savedT;
    window.HISTORY_SEED = savedH;
  }
  _inMultiRender = false;
  const primaryKey = getSelectedTeams()[0];
  if (TEAM_CACHE[primaryKey]) window.HISTORY_SEED = TEAM_CACHE[primaryKey].history || [];
  seedHistory();
}

// Schedule tab — only show Futures standings (the active bracket play).
function renderHistoryStandings(targetId = 'history-standings', historyData = null) {
  const el = $(targetId);
  if (!el) return;
  const data = historyData !== null ? historyData : getHistory();
  const futuresEntries = data.filter(
    e => /futures|kap.?7/i.test((e.name || '') + (e.id || ''))
  );
  el.innerHTML = buildStandingsHtml(futuresEntries, 'Kap 7 Futures League');
}

// ─── RELOAD TOURNAMENT DATA ───────────────────────────────────────────────────
// Called when a PUSH_SYNC arrives after an admin deploy.
// Fetches fresh tournament.js from the network (bypassing SW cache),
// re-evaluates it so window.TOURNAMENT / window.HISTORY_SEED are updated,
// then re-renders every tab that depends on tournament data.

async function reloadTournamentJs() {
  try {
    const res = await fetch(`/tournament.js?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      // Can't fetch — just re-render with what we have
      renderScheduleTab();
      renderPossibleTab();
      return;
    }
    const code = await res.text();
    // Re-execute the file so window.TOURNAMENT and window.HISTORY_SEED are updated
    // eslint-disable-next-line no-new-func
    new Function(code)();
  } catch (err) {
    console.warn('reloadTournamentJs fetch failed:', err.message);
  }
  // Also reload from worker for all selected teams
  await loadAllSelectedTeams();
  // Re-run initialization that depends on TOURNAMENT (archive check, seed history)
  checkTournamentChange();
  seedHistory();
  // Re-render all tabs that display tournament data
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
}

function buildSheetConfigFromTournament(tournament) {
  const colIndex = value => {
    if (Number.isInteger(value)) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value !== 'string') return null;
    const raw = value.trim();
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return Math.max(0, Number(raw) - 1);
    if (!/^[A-Za-z]+$/.test(raw)) return null;
    return raw.toUpperCase().split('').reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
  };
  const sync = tournament?.sheetSync;
  if (!sync?.sheetUrl || !sync?.teamName) return null;

  const sheetIdMatch = sync.sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!sheetIdMatch) return null;
  const gidMatch = sync.sheetUrl.match(/[#?&]gid=(\d+)/);

  const dates = new Set();
  (tournament?.games || []).forEach(g => {
    if (g?.dateISO) dates.add(g.dateISO);
  });
  (tournament?.bracket?.paths || []).forEach(path => {
    (path?.steps || []).forEach(step => {
      if (step?.dateISO) dates.add(step.dateISO);
    });
  });

  const tournamentDates = {};
  Array.from(dates).sort().forEach((dateISO, idx) => {
    tournamentDates[`day ${idx + 1}`] = dateISO;
  });

  return {
    sheetId: sheetIdMatch[1],
    gid: gidMatch?.[1] || '',
    teamName: sync.teamName,
    tournamentDates,
    cacheKey: `${getAppClubId() || 'club'}:${tournament?.id || 'tournament'}:${sync.teamName}`,
    whiteTeamCol: colIndex(sync.whiteTeamCol),
    whiteScoreCol: colIndex(sync.whiteScoreCol),
    darkTeamCol: colIndex(sync.darkTeamCol),
    darkScoreCol: colIndex(sync.darkScoreCol),
    gameNumCol: colIndex(sync.gameNumCol),
  };
}

async function syncSheetConfigToServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const primaryTeam = getSelectedTeams()[0];
  const tournament = TEAM_CACHE[primaryTeam]?.tournament || window.TOURNAMENT;
  const config = buildSheetConfigFromTournament(tournament);
  if (!config) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const msg = { type: 'SYNC_SHEET_CONFIG', config };
    reg.active?.postMessage(msg);
    navigator.serviceWorker.controller?.postMessage(msg);
  } catch (_) {}
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  // Tag the HTML element with the native platform so CSS can scope native-only styles.
  const platform = window.Capacitor?.getPlatform?.();
  if (platform === 'ios') {
    document.documentElement.classList.add('native-ios');
  } else if (platform === 'android') {
    document.documentElement.classList.add('native-android');
  }

  // Hide native splash screen — in remote URL mode launchAutoHide doesn't fire reliably
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      window.Capacitor.nativePromise('SplashScreen', 'hide', {}).catch(() => {});
    }
  } catch (_) {}

  if (typeof TOURNAMENT === 'undefined') {
    document.body.innerHTML = '<p style="padding:2rem;color:red;">Error: tournament.js not loaded.</p>';
    return;
  }

  applyAppTranslations();

  // Phase 3: Show club picker on first visit (no club selected yet)
  // Firebase still inits in the background so the picker can list clubs
  if (typeof fbInit === 'function') fbInit();

  // ── Handle ?join=CLUB_ID — spectator clicked admin's share link ──
  _handleJoinParam();

  // ── Backward compat: migrate existing club selection to joined list ──
  _migrateJoinedClubs();

  // ── One-time migration: clear stale 14u-girls data for HS clubs ──
  if (!localStorage.getItem('ebwp-migrated-v2')) {
    const clubType = localStorage.getItem('ebwp-club-type');
    const teamKey  = localStorage.getItem('ebwp-team-key');
    const HS_KEYS  = ['boys-varsity','boys-jv','girls-varsity','girls-jv'];
    const CLUB_KEYS = ['10u-coed','12u-girls','12u-boys','14u-girls','14u-boys','16u-girls','16u-boys','18u-girls','18u-boys','masters','masters-women','masters-men'];
    // If HS club but team key is a club key (or vice versa), clear stale data
    if ((clubType === 'highschool' && teamKey && CLUB_KEYS.includes(teamKey)) ||
        (clubType === 'club' && teamKey && HS_KEYS.includes(teamKey))) {
      localStorage.removeItem(STORE.HISTORY);
      localStorage.removeItem(STORE.SNAPSHOT);
      localStorage.removeItem(STORE.BRACKET_RESULTS);
      localStorage.removeItem(STORE.TOURNAMENT_ID);
      localStorage.removeItem('ebwp-team-key');
      localStorage.removeItem('ebwp-team-keys');
      console.info('[ebwp] Cleared stale data from mismatched team type');
    }
    localStorage.setItem('ebwp-migrated-v2', '1');
  }

  if (showClubPickerIfNeeded()) return; // picker shown — wait for selection

  checkTournamentChange(); // also restores state.liveScores from localStorage

  // 🩹 One-time data fix: Untoggle accidental DONS win
  if (!localStorage.getItem('ebwp-patch-dons-fix-v1')) {
    const _games = getTournamentGames();
    const _dons = _games.find(g => (g.opponent || '').toUpperCase().includes('DONS'));
  if (_dons && _getResultForGame(_dons)) {
    delete state.results[_scopedGameKey(_dons)];
    _saveResults();
  }
    localStorage.setItem('ebwp-patch-dons-fix-v1', '1');
  }

  // Resume any auto-clocks that were running before page reload
  const hasRunning = Object.values(state.liveScores).some(s => s && s.timerRunning);
  if (hasRunning) ensureClockTicker();

  state.roster      = loadRoster(getSelectedTeam());
  purgeTestHistory();
  seedHistory();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
  updateSpectatorCrowns(); // show/hide 👑 on History + Bracket based on spectator tier
  startLivePoller(); // start polling for live scores from other devices
  updateLiveDot();   // set dot state on initial load
  startDirScorePolling(); // start polling for director game scores
  restoreTournScoreSession(); // restore Tournament Score tab session if saved
  updateTScoreTabVisibility(); // hide T-Score tab unless director pkg imported

  // Load team data for all selected age groups (async — updates TOURNAMENT from KV)
  // IMPORTANT: fetch club info FIRST to set correct TEAM_OPTIONS before loading data
  const _appClubId = getAppClubId();
  if (_appClubId && typeof fbSetClubId === 'function') {
    fbSetClubId(_appClubId);
  }

  // Detect club change for auto-favorite logic
  const _lastClubId = sessionStorage.getItem('ebwp-last-club-id');
  const _isClubChange = _lastClubId && _lastClubId !== _appClubId;
  if (_appClubId) sessionStorage.setItem('ebwp-last-club-id', _appClubId);

  const _doTeamLoad = async () => {
    // Fetch club info to ensure we have the right team options
    if (_appClubId) {
      // Reset primary color so applyClubLogo can detect "no branding" on club switch
      window._clubPrimaryColor = null;

      // Logo URL saved outside try-catch so it can be applied even if processing throws
      let _pendingLogoUrl = null, _pendingLogoName = null;
      try {
        const infoRes = await fetch(WORKER + '/club-info?club=' + encodeURIComponent(_appClubId));
        const info = await infoRes.json();
        if (info.ok) {
          // ── Apply logo FIRST — before any processing that could throw ─────────
          // This guarantees the logo shows even if clubType/teamOptions code errors.
          _pendingLogoUrl  = info.logo   || null;
          _pendingLogoName = info.clubName || null;
          applyClubLogo(_pendingLogoUrl, _pendingLogoName);

          if (info.clubName) {
            // Title-case if it's a slug (e.g., "alameda-high" → "Alameda High")
            const displayName = info.clubName.includes('-') && !info.clubName.includes(' ')
              ? info.clubName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              : info.clubName;
            localStorage.setItem('ebwp-club-name', displayName);
            renderHeader(); // update header as soon as we have the club name
          }
          if (info.clubType) {
            const singleMastersTeam = (!!info.enableMasters && !!info.mastersOnly)
              ? (!!info.singleMastersTeam || await detectSingleMastersTeamClub(_appClubId))
              : false;
            localStorage.setItem('ebwp-club-type', info.clubType);
            storeClubPrograms(!!info.enableMasters, !!info.mastersOnly, singleMastersTeam);
            const isHS = info.clubType === 'highschool';
            TEAM_OPTIONS = getClubTeamOptions(info.clubType, !!info.enableMasters, !!info.mastersOnly, singleMastersTeam);
            // Reset selection if current keys are invalid for this club type
            const validKeys = TEAM_OPTIONS.map(t => t.key);
            // Always prioritize favorite if current selection is the default or missing
            const current = getSelectedTeams();
            const hasInvalid = current.some(k => !validKeys.includes(k));
            const favTeam = _getAutoFavoriteTeam(validKeys);
            const isDefault = current.length === 1 && (current[0] === validKeys[0] || current[0] === '10u-coed');

            if (hasInvalid || _isClubChange || (favTeam && isDefault && favTeam !== current[0])) {
              if (favTeam) {
                setSelectedTeams([favTeam]);
              } else if (hasInvalid) {
                setSelectedTeams([validKeys[0]]);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[ebwp] club-info fetch failed:', e.message);
        // Safety net: if the try block threw AFTER saving logo URL, still apply it
        if (_pendingLogoUrl) applyClubLogo(_pendingLogoUrl, _pendingLogoName);
      }

      // Fetch club branding (custom colors)
      try {
        const brandRes = await fetch(WORKER + '/club-branding?club=' + encodeURIComponent(_appClubId));
        const brand = await brandRes.json();
        if (brand.ok && brand.primaryColor) {
          applyClubBranding(brand.primaryColor, brand.secondaryColor, brand.headerStyle);
        } else if (brand.ok) {
          // Club exists but has no custom branding — reset CSS vars to defaults
          // so colors don't bleed from a previously viewed club
          applyClubBranding('#002868', null, null);
          window._clubPrimaryColor = null;
        }
      } catch (e) {
        console.warn('[ebwp] club-branding fetch failed:', e.message);
      }
    }

    // Now load team data with correct team keys
    await loadAllSelectedTeams();
    checkTournamentChange();
    seedHistory();
    state.roster = loadRoster(getSelectedTeam()); // refresh in-memory roster from fresh TOURNAMENT.roster
    renderHeader();
    renderScheduleTab();
    renderPossibleTab();
    renderHistoryTab();
    renderRosterTab();
    applyAppTranslations();
    // Re-poll live scores now that TOURNAMENT.id is populated — the startup poll used
    // an empty tournament ID and got no results, so state.liveScores was empty.
    // This second poll fetches with the correct ID and triggers sync inside pollLiveScores
    // if any game is live (changed=true path).
    pollLiveScores();
    // Phase 2: start Firestore real-time listeners for each selected team
    if (typeof fbListenToTournament === 'function') {
      getSelectedTeams().forEach(k => fbListenToTournament(k));
    }
  };

  _doTeamLoad();

  // Phase 3: listen for active tournament changes — auto-reload when admin switches tournaments
  if (typeof fbListenToActiveTournament === 'function') {
    let _knownActiveTournId = null;
    fbListenToActiveTournament(tourDoc => {
      if (!tourDoc) return;
      if (_knownActiveTournId === null) {
        // First snapshot — record current active tournament
        _knownActiveTournId = tourDoc.id;
        return;
      }
      if (tourDoc.id !== _knownActiveTournId) {
        // Active tournament changed — reload to pick up new deployed data
        console.info('[phase3] Active tournament changed:', _knownActiveTournId, '→', tourDoc.id);
        _knownActiveTournId = tourDoc.id;
        if (typeof showToast === 'function') showToast('New tournament activated — refreshing…');
        setTimeout(() => location.replace('/?_r=' + Date.now()), 1500);
      }
    });
  }

  // Pre-initialize token client once GIS loads
  const gisReady = setInterval(() => {
    if (window.google?.accounts?.oauth2) {
      clearInterval(gisReady);
      ensureTokenClient();
      if (state.syncActive) updateSyncBadge('ok');
    }
  }, 300);

  // Keep --header-h updated so the desktop sidebar top offset stays correct
  window.addEventListener('resize', syncHeaderHeight);

  // Native Deep Linking (Widgets)
  if (typeof Capacitor !== 'undefined' && Capacitor.Plugins.App) {
    Capacitor.Plugins.App.addListener('appUrlOpen', data => {
      const url = new URL(data.url);
      if (url.protocol === 'eggbeater:' && url.host === 'score') {
        const gameId = url.pathname.replace('/', '');
        if (gameId) {
          switchTab('scores');
          setTimeout(() => {
            if (typeof openGameScoreModal === 'function') {
              openGameScoreModal(gameId);
            }
          }, 500);
        }
      }
    });
  }

  // ── Offline/online detection (Phase 5E) ─────────────────────────────────
  window.addEventListener('offline', () => {
    const b = document.getElementById('offline-banner');
    if (b) b.classList.remove('hidden');
  });
  window.addEventListener('online', () => {
    const b = document.getElementById('offline-banner');
    if (b) b.classList.add('hidden');
    // Directly clear the schedule tab's inline offline bar — don't wait for data reload
    if (typeof renderScheduleTab === 'function' && state.currentTab === 'schedule') renderScheduleTab();
    // Auto-refresh tournament data on reconnect
    if (typeof reloadTournamentJs === 'function') reloadTournamentJs();
  });

  // ── Power-aware polling: restart timers when battery or data-saver state changes ──
  refreshNativeSystemState().finally(() => _restartPollOnPowerChange());
  getNativeSystemPlugin()?.addListener?.('systemStateChanged', info => {
    _applyNativeSystemState(info || {});
    _restartPollOnPowerChange();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshNativeSystemState().catch(() => {});
      pollLiveScores().catch(() => {});
      startLivePoller();
    }
  });
  try {
    window.Capacitor?.Plugins?.App?.addListener?.('resume', () => {
      refreshNativeSystemState().catch(() => {});
      pollLiveScores().catch(() => {});
      startLivePoller();
    });
  } catch (_) {}
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      battery.addEventListener('chargingchange',  _restartPollOnPowerChange);
      battery.addEventListener('levelchange',     _restartPollOnPowerChange);
    }).catch(() => {});
  }
  window.matchMedia?.('(prefers-reduced-data: reduce)')
    .addEventListener?.('change', _restartPollOnPowerChange);

  // Check initial state
  if (!navigator.onLine) {
    const b = document.getElementById('offline-banner');
    if (b) b.classList.remove('hidden');
  }

  if ('serviceWorker' in navigator) {
    // Auto-reload when a new service worker activates so every device always
    // runs the latest code immediately after a deploy (no manual refresh needed).
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.replace(location.pathname);
    });

    navigator.serviceWorker.register('/sw.js')
      .then(async reg => {
        // Listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', e => {
          if (e.data?.type === 'PUSH_SYNC' || e.data?.type === 'PERIODIC_SYNC_TRIGGERED') {
            // Re-fetch tournament.js from the network and refresh all tabs
            reloadTournamentJs();
          }
          // SW signals that a new version just activated — reload to get fresh assets
          if (e.data?.type === 'SW_UPDATED') {
            window.location.replace(location.pathname);
          }
        });
        // Register periodic background sync (Android/Chrome, best-effort)
        if ('periodicSync' in reg) {
          reg.periodicSync.register('check-schedule', { minInterval: 30 * 60 * 1000 })
            .catch(() => { /* permission not granted — push will still work */ });
        }
        await syncSheetConfigToServiceWorker();
      })
      .catch(() => {});
  }

  // Initial Widget Sync — wait 2 s for team-data KV fetch before writing
  setTimeout(() => _syncWidgetsAll(), 2000);

  // On app resume (foreground after background): immediately re-poll live scores and
  // reload team data so Android viewers don't have to force-quit to see live games.
  // pollLiveScores() is called both immediately AND after loadAllSelectedTeams() because
  // on cold start the tournament data may not be cached yet, causing the first poll to
  // find no games. The second poll (in .then) runs once data is confirmed loaded.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pollLiveScores();
      loadAllSelectedTeams().then(() => {
        state.roster = loadRoster(getSelectedTeam());
        renderScheduleTab();
        renderRosterTab();
        pollLiveScores();
      }).catch(() => {});
    }
  });
  // Capacitor native app resume event (fires when app comes back from background)
  if (window.Capacitor?.Plugins?.App) {
    window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        pollLiveScores();
        loadAllSelectedTeams().then(() => {
          state.roster = loadRoster(getSelectedTeam());
          renderScheduleTab();
          renderRosterTab();
          pollLiveScores();
        }).catch(() => {});
      }
    });
  }
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

// VAPID public key for the ebwp-push Cloudflare Worker
const PUSH_SERVER_URL = 'https://ebwp-push.sarah-new.workers.dev';
const WORKER = PUSH_SERVER_URL;

// ── Spectator tier ────────────────────────────────────────────────────────────
// Set to true when ready to enforce spectator subscriptions in production.
const ENFORCE_SPECTATOR_TIERS = false;
const ENFORCE_PARENT_TIERS = ENFORCE_SPECTATOR_TIERS; // legacy alias during migration

// Features gated behind Spectator Monthly ($4.99/mo)
const SPECTATOR_FEATURES = ['spectator_stats', 'bracket_view'];
const PARENT_FEATURES = SPECTATOR_FEATURES; // legacy alias during migration

function normalizeSpectatorFeature(feature) {
  if (feature === 'parent_stats') return 'spectator_stats';
  return feature;
}

function getStoredSpectatorTier() {
  return normalizeSpectatorTier(
    localStorage.getItem('ebwp-spectator-tier')
    || localStorage.getItem('ebwp-parent-tier')
    || 'free'
  );
}

function normalizeSpectatorTier(tier) {
  if (tier === 'spectator' || tier === 'parent') return 'spectator';
  return 'free';
}

function getResolvedSpectatorTier() {
  return normalizeSpectatorTier(state.spectatorTier || state.parentTier || getStoredSpectatorTier());
}

function spectatorHasFeature(feature) {
  if (!ENFORCE_SPECTATOR_TIERS) return true;
  return spectatorHasFeatureByTier(feature);
}

// Always checks real tier — ignores ENFORCE_SPECTATOR_TIERS. Used for crown badges.
function spectatorHasFeatureByTier(feature) {
  feature = normalizeSpectatorFeature(feature);
  const tier = getResolvedSpectatorTier();
  if (tier === 'spectator') return true;
  return false;
}

function updateSpectatorCrowns() {
  const gates = { history: 'spectator_stats', possible: 'bracket_view' };
  Object.entries(gates).forEach(([tab, feature]) => {
    const locked = !spectatorHasFeatureByTier(feature);
    document.querySelectorAll(`[data-parent-tab="${tab}"] .nav-crown`).forEach(el => {
      el.style.display = locked ? '' : 'none';
    });
  });
}

function renderSpectatorNudge(tabKey) {
  const nudges = {
    history: {
      icon: '📊', title: 'Player Stats & History', tier: 'Spectator Monthly',
      price: '$4.99/mo · Cancel anytime',
      items: ['Season stats across all tournaments', 'Player progress & goal tracking', 'Win/loss record & standings history', 'Full tournament archive'],
    },
    possible: {
      icon: '🏆', title: 'Tournament Bracket View', tier: 'Spectator Monthly',
      price: '$4.99/mo · Cancel anytime',
      items: ['Full bracket with live results', 'Pool play standings & seedings', 'Advancement tracking round-by-round', 'Shareable bracket link'],
    },
  };
  const n = nudges[tabKey] || nudges['history'];
  return `
    <div style="display:flex;flex-direction:column;align-items:center;padding:40px 24px;text-align:center;max-width:360px;margin:0 auto">
      <div style="font-size:3rem;margin-bottom:12px">${n.icon}</div>
      <div style="font-size:1.2rem;font-weight:800;color:var(--gray-900);margin-bottom:4px">${n.title}</div>
      <div style="font-size:0.82rem;font-weight:700;color:#16a34a;background:#dcfce7;padding:3px 10px;border-radius:20px;margin-bottom:16px">${n.tier} 👑</div>
      <ul style="text-align:left;list-style:none;padding:0;margin:0 0 20px;width:100%">
        ${n.items.map(i => `<li style="padding:6px 0;font-size:0.9rem;color:var(--gray-700);display:flex;gap:8px;align-items:flex-start"><span style="color:#16a34a;font-weight:700;flex-shrink:0">✓</span>${i}</li>`).join('')}
      </ul>
      <div style="font-size:0.85rem;color:var(--gray-500);margin-bottom:16px">${n.price}</div>
      <button onclick="showSpectatorUpgradeSheet()" style="background:#16a34a;color:white;border:none;border-radius:10px;padding:14px 28px;font-size:1rem;font-weight:700;cursor:pointer;width:100%">Upgrade to Spectator 👑</button>
    </div>`;
}

function showSpectatorUpgradeSheet() {
  alert('Spectator Monthly — $4.99/mo\n\nUnlocks: Player Stats History, Tournament Bracket, Live Follow\n\nBilling is not enabled in this beta build yet.\nEmail hello@eggbeater.app if you want Spectator access turned on for testing.');
}

// Legacy aliases kept during the parent* -> spectator* migration.
const parentHasFeature = spectatorHasFeature;
const parentHasFeatureByTier = spectatorHasFeatureByTier;
const updateParentCrowns = updateSpectatorCrowns;
const renderParentNudge = renderSpectatorNudge;
const showParentUpgradeSheet = showSpectatorUpgradeSheet;

// Phase 3: Club ID detection — URL param > localStorage > tournament data > default
function getAppClubId() {
  const params = new URLSearchParams(window.location.search);
  // Accept both ?club= (legacy) and ?join= (preferred/canonical)
  const fromUrl = params.get('club') || params.get('join');
  if (fromUrl) {
    localStorage.setItem('ebwp-club-id', fromUrl);
    return fromUrl;
  }
  const saved = localStorage.getItem('ebwp-club-id');
  if (saved) return saved;
  // NOTE: do NOT fall back to TOURNAMENT.clubId here — that's a legacy single-club default
  // that prevents the splash/club-picker from appearing after _returnToSplash() clears the selection.
  return null;
}

// ─── CLUB PICKER ──────────────────────────────────────────────────────────────

// ── Joined clubs list management ──────────────────────────────────────────────

function getJoinedClubs() {
  try {
    return JSON.parse(localStorage.getItem('ebwp-joined-clubs') || '[]');
  } catch { return []; }
}

function addJoinedClub(clubId) {
  if (!clubId) return;
  const joined = getJoinedClubs();
  if (!joined.includes(clubId)) {
    joined.push(clubId);
    localStorage.setItem('ebwp-joined-clubs', JSON.stringify(joined));
  }
}

function removeJoinedClub(clubId) {
  const joined = getJoinedClubs().filter(id => id !== clubId);
  localStorage.setItem('ebwp-joined-clubs', JSON.stringify(joined));
}

/**
 * Handle inbound club link parameters. Both ?join= and legacy ?club=
 * are normalized through the same add/join/password flow.
 */
async function _handleJoinParam() {
  const params = new URLSearchParams(window.location.search);
  const joinClub = params.get('join') || params.get('club');
  if (!joinClub) return;

  // Clean up the URL so refreshes don't re-trigger the join flow.
  params.delete('join');
  params.delete('club');
  const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
  window.history.replaceState({}, '', newUrl);

  // If already joined, just select it
  const joined = getJoinedClubs();
  if (joined.includes(joinClub)) {
    _selectClub(joinClub);
    return;
  }

  // Check if this club requires a password before joining
  try {
    const res = await fetch(WORKER + '/club-info?club=' + encodeURIComponent(joinClub));
    const data = await res.json();
    if (data.ok && data.requiresJoinPassword) {
      window._pendingJoinClub = { id: joinClub, name: data.clubName, clubType: data.clubType };
      const titleEl = document.getElementById('join-pw-title');
      if (titleEl) titleEl.textContent = 'Join ' + (data.clubName || 'Club');
      _openModal('join-pw-modal');
      return;
    }
    // Not gated or fetch failed — proceed normally
    if (data.ok) {
      addJoinedClub(joinClub);
      _selectClub(joinClub, data.clubName, data.clubType);
    }
  } catch (e) {
    console.warn('[ebwp] _handleJoinParam check failed:', e.message);
    // Fallback: try to join anyway
    addJoinedClub(joinClub);
    _selectClub(joinClub);
  }
}

/**
 * Backward compatibility: if user has an existing club selection
 * but no joined clubs list yet, migrate it.
 */
function _migrateJoinedClubs() {
  const existing = localStorage.getItem('ebwp-club-id');
  if (existing && !getJoinedClubs().length) {
    addJoinedClub(existing);
  }
}

/**
 * Show the club picker if no club is selected yet.
 * Returns true if the picker was shown (app should wait), false if club is already set.
 */
function showClubPickerIfNeeded() {
  // If club is already set (via URL param or localStorage), skip picker
  if (getAppClubId()) return false;

  const picker = document.getElementById('club-picker');
  if (!picker) return false;

  picker.classList.remove('hidden');
  // Hide the main app chrome while picker is showing
  document.querySelector('.app-header').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';

  // Load clubs from Firestore once Firebase is ready
  _loadClubPickerList();
  return true;
}

/**
 * Fetch clubs from the worker and render the picker cards.
 * Only shows clubs the spectator has joined via a share link.
 */
async function _loadClubPickerList(switchMode) {
  const listEl = document.getElementById('club-picker-list');
  if (!listEl) return;

  const joined = getJoinedClubs();
  let allClubs = [];
  try {
    const res = await fetch(WORKER + '/clubs');
    if (res.ok) {
      const data = await res.json();
      allClubs = data.clubs || [];
    }
  } catch (e) {
    console.warn('[club-picker] fetch /clubs error:', e.message);
  }

  // Filter to only show joined clubs
  const clubs = allClubs.filter(c => joined.includes(c.id));

  listEl.innerHTML = '';

  if (!clubs.length) {
    // No joined clubs — show join prompt
    listEl.innerHTML = `
      <div style="text-align:center;padding:24px 16px">
        <div style="font-size:2.2rem;margin-bottom:10px">🤽‍♀️</div>
        <div style="font-size:1.1rem;font-weight:700;color:white;margin-bottom:8px">Join Your Club</div>
        <div style="font-size:0.88rem;color:rgba(255,255,255,0.7);line-height:1.5;margin-bottom:16px">
          Ask your club admin for the spectator join link.<br>
          It looks like: <em style="color:#fbbf24">eggbeater.app?join=your-club</em>
        </div>
        <div style="display:flex;gap:8px;max-width:320px;margin:0 auto">
          <input id="join-code-input" type="text" placeholder="Enter club code"
                 style="flex:1;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:0.9rem;font-family:inherit">
          <button onclick="_manualJoinClub()" style="padding:10px 16px;background:#002868;color:white;border:none;border-radius:8px;font-size:0.88rem;font-weight:700;cursor:pointer">Join</button>
        </div>
        <div id="join-error" style="font-size:0.82rem;color:#dc2626;margin-top:8px;min-height:18px"></div>
      </div>
    `;
    return;
  }

  // Auto-select only on first visit (not when switching clubs)
  if (!switchMode && clubs.length === 1) {
    _selectClub(clubs[0].id, clubs[0].name, clubs[0].clubType);
    return;
  }

  for (const club of clubs) {
    const card = document.createElement('div');
    card.className = 'club-picker-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const logoHtml = club.logo
      ? `<img src="${club.logo}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover">`
      : `<span style="font-size:1.6rem">\u{1F3CA}</span>`;

    card.innerHTML = `
      <div class="club-picker-card-icon">${logoHtml}</div>
      <div class="club-picker-card-info">
        <div class="club-picker-card-name">${_escHtml(club.name || club.id)}</div>
      </div>
      <div class="club-picker-card-arrow">\u203A</div>
    `;

    card.addEventListener('click', () => _selectClub(club.id, club.name, club.clubType));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') _selectClub(club.id, club.name, club.clubType); });
    listEl.appendChild(card);
  }

  // Add "Join another club" link at bottom
  const joinMore = document.createElement('div');
  joinMore.style.cssText = 'text-align:center;padding:12px;font-size:0.82rem';
  joinMore.innerHTML = `<a href="#" onclick="event.preventDefault();_showJoinInput()" style="color:rgba(255,255,255,0.8);font-weight:600">+ Join another club</a>`;
  listEl.appendChild(joinMore);
}

/** Manual join via text input */
async function _manualJoinClub() {
  const input = document.getElementById('join-code-input');
  const errEl = document.getElementById('join-error');
  if (!input) return;
  const code = input.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!code) { if (errEl) errEl.textContent = 'Please enter a club code'; return; }

  // If already joined, just select it
  if (getJoinedClubs().includes(code)) {
    _selectClub(code);
    return;
  }

  // Validate club exists and check if gated
  try {
    const res = await fetch(WORKER + '/club-info?club=' + encodeURIComponent(code));
    if (!res.ok) throw new Error('Network error');
    const club = await res.json();
    if (!club.ok) {
      if (errEl) errEl.textContent = `Club "${code}" not found. Check with your admin.`;
      return;
    }

    if (club.requiresJoinPassword) {
      window._pendingJoinClub = { id: club.clubId, name: club.clubName, clubType: club.clubType };
      const titleEl = document.getElementById('join-pw-title');
      if (titleEl) titleEl.textContent = 'Join ' + (club.clubName || 'Club');
      _openModal('join-pw-modal');
      return;
    }

    addJoinedClub(code);
    _selectClub(club.clubId, club.clubName, club.clubType);
  } catch (e) {
    if (errEl) errEl.textContent = 'Could not connect. Try again.';
  }
}

/** Submit join password from modal */
async function submitJoinPassword() {
  const input = document.getElementById('join-pw-input');
  const errEl = document.getElementById('join-pw-error');
  const btn = document.querySelector('#join-pw-modal .scoring-pw-btn');
  const pending = window._pendingJoinClub;

  if (!input || !pending) return;
  const pw = input.value.trim();
  if (!pw) { if (errEl) errEl.textContent = 'Please enter password'; return; }

  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Joining...';

  try {
    const res = await fetch(WORKER + '/validate-join-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubId: pending.id, password: pw })
    });
    const data = await res.json();
    if (data.ok) {
      addJoinedClub(pending.id);
      _closeModal('join-pw-modal');
      _selectClub(pending.id, pending.name, pending.clubType);
      input.value = '';
    } else {
      errEl.textContent = 'Incorrect password — check with your club admin and try again';
    }
  } catch (e) {
    errEl.textContent = 'Error connecting to server';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Join Club';
  }
}

/** Show inline join input when user already has clubs but wants to add another */
function _showJoinInput() {
  const listEl = document.getElementById('club-picker-list');
  if (!listEl) return;
  const existing = listEl.querySelector('.join-another-row');
  if (existing) return; // already showing
  const row = document.createElement('div');
  row.className = 'join-another-row';
  row.style.cssText = 'display:flex;gap:8px;padding:8px 16px;max-width:320px;margin:0 auto';
  row.innerHTML = `
    <input id="join-code-input" type="text" placeholder="Club code"
           style="flex:1;padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:0.88rem;font-family:inherit">
    <button onclick="_manualJoinClub()" style="padding:8px 14px;background:#002868;color:white;border:none;border-radius:8px;font-size:0.82rem;font-weight:700;cursor:pointer">Join</button>
  `;
  listEl.appendChild(row);
  row.querySelector('input').focus();
}

function _escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/**
 * Called when a spectator taps a club card.
 */
function _selectClub(clubId, clubName, clubType) {
  localStorage.setItem('ebwp-club-id', clubId);
  if (clubName) localStorage.setItem('ebwp-club-name', clubName);
  localStorage.setItem('ebwp-club-type', clubType || 'club');
  storeClubPrograms(false, false, false);
  TEAM_OPTIONS = getClubTeamOptions(clubType || 'club', false, false, false);
  // Reset team selection to first valid team for this club type
  localStorage.setItem('ebwp-team-keys', JSON.stringify([TEAM_OPTIONS[0].key]));

  // Update URL so bookmarks and shares include the club
  // Use ?join= so the club gets added to the spectator's joined-clubs list on reload
  const url = new URL(window.location);
  url.searchParams.delete('club');
  url.searchParams.set('join', clubId);
  window.history.replaceState({}, '', url);

  // Hide picker, show app
  document.getElementById('club-picker').classList.add('hidden');
  document.querySelector('.app-header').style.display = '';
  document.getElementById('app').style.display = '';
  document.getElementById('bottom-nav').style.display = '';

  // Set club for Firestore routing
  if (typeof fbSetClubId === 'function') fbSetClubId(clubId, { persist: true });

  // Reload all team data with the new club ID
  loadAllSelectedTeams().then(() => {
    checkTournamentChange();
    seedHistory();
    renderHeader();
    renderScheduleTab();
    renderPossibleTab();
    renderHistoryTab();
    renderRosterTab();
  });
}

/**
 * Reset club selection — shows the picker again.
 * Called from "Change Club" link in header.
 */
function changeClub() {
  localStorage.removeItem('ebwp-club-id');
  localStorage.removeItem('ebwp-club-name');
  localStorage.removeItem('ebwp-club-type');
  localStorage.removeItem('ebwp-enable-masters');
  localStorage.removeItem('ebwp-masters-only');
  localStorage.removeItem('ebwp-single-masters-team');
  localStorage.removeItem('ebwp-team-keys');
  localStorage.removeItem('ebwp-team-key');
  TEAM_OPTIONS = TEAM_OPTIONS_CLUB_YOUTH; // reset to default
  // Note: ebwp-joined-clubs is NOT cleared — user keeps their club memberships
  // Clear URL club param
  const url = new URL(window.location);
  url.searchParams.delete('club');
  window.history.replaceState({}, '', url);
  // Show picker (force show even if only 1 club, so user can add more)
  _showPickerForSwitch();
}

/** Show picker in "switch" mode — always shows all clubs + add option, never auto-selects */
function _showPickerForSwitch() {
  const picker = document.getElementById('club-picker');
  if (!picker) return;
  picker.classList.remove('hidden');
  document.querySelector('.app-header').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';
  _loadClubPickerList(true); // true = switch mode (no auto-select)
}

// ─── TEAM / AGE-GROUP ─────────────────────────────────────────────────────────

const TEAM_OPTIONS_CLUB_YOUTH = [
  { key: '10u-boys',  label: '10u Boys' },
  { key: '10u-girls', label: '10u Girls' },
  { key: '10u-coed',  label: '10u Co-Ed' },
  { key: '12u-coed',  label: '12u Co-Ed' },
  { key: '12u-girls', label: '12u Girls' },
  { key: '12u-boys',  label: '12u Boys'  },
  { key: '14u-girls', label: '14u Girls' },
  { key: '14u-boys',  label: '14u Boys'  },
  { key: '16u-girls', label: '16u Girls' },
  { key: '16u-boys',  label: '16u Boys'  },
  { key: '18u-girls', label: '18u Girls' },
  { key: '18u-boys',  label: '18u Boys'  },
];

const TEAM_OPTIONS_CLUB_MASTERS = [
  { key: 'masters-women', label: 'Masters Women' },
  { key: 'masters-men',   label: 'Masters Men'   },
];
const TEAM_OPTIONS_CLUB_MASTERS_SINGLE = [
  { key: 'masters', label: 'Masters' },
];
const TEAM_OPTIONS_CLUB = [...TEAM_OPTIONS_CLUB_YOUTH, ...TEAM_OPTIONS_CLUB_MASTERS];

const TEAM_OPTIONS_HS = [
  { key: 'boys-varsity',  label: 'Boys Varsity' },
  { key: 'boys-jv',       label: 'Boys JV' },
  { key: 'girls-varsity', label: 'Girls Varsity' },
  { key: 'girls-jv',      label: 'Girls JV' },
];

function getStoredClubPrograms() {
  return {
    enableMasters: localStorage.getItem('ebwp-enable-masters') === 'true',
    mastersOnly: localStorage.getItem('ebwp-masters-only') === 'true',
    singleMastersTeam: localStorage.getItem('ebwp-single-masters-team') === 'true',
  };
}

function storeClubPrograms(enableMasters, mastersOnly, singleMastersTeam = false) {
  localStorage.setItem('ebwp-enable-masters', enableMasters ? 'true' : 'false');
  localStorage.setItem('ebwp-masters-only', enableMasters && mastersOnly ? 'true' : 'false');
  localStorage.setItem('ebwp-single-masters-team', enableMasters && singleMastersTeam ? 'true' : 'false');
}

function getClubTeamOptions(clubType, enableMasters = false, mastersOnly = false, singleMastersTeam = false) {
  if (clubType === 'highschool') return TEAM_OPTIONS_HS;
  if (enableMasters && mastersOnly) return singleMastersTeam ? TEAM_OPTIONS_CLUB_MASTERS_SINGLE : TEAM_OPTIONS_CLUB_MASTERS;
  if (enableMasters) return TEAM_OPTIONS_CLUB;
  return TEAM_OPTIONS_CLUB_YOUTH;
}

async function detectSingleMastersTeamClub(clubId) {
  if (!clubId) return false;
  try {
    const res = await fetch(WORKER + '/team-data?team=masters&club=' + encodeURIComponent(clubId));
    return res.ok;
  } catch {
    return false;
  }
}

const storedPrograms = getStoredClubPrograms();
let TEAM_OPTIONS = getClubTeamOptions(
  localStorage.getItem('ebwp-club-type'),
  storedPrograms.enableMasters,
  storedPrograms.mastersOnly,
  storedPrograms.singleMastersTeam
);

// ── Age-group selection (supports multiple selections) ────────────────────────

function _teamKeysKey() {
  // Per-club namespaced key so each club remembers its own selected teams
  const clubId = getAppClubId();
  return clubId ? `ebwp-team-keys-${clubId}` : 'ebwp-team-keys';
}

function getSelectedTeams() {
  const validKeys = TEAM_OPTIONS.map(t => t.key);
  try {
    // Try per-club key first, fall back to legacy global key
    const stored = localStorage.getItem(_teamKeysKey()) || localStorage.getItem('ebwp-team-keys');
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      // Filter to only keys valid for the current club's team options
      const filtered = parsed.filter(k => validKeys.includes(k));
      if (filtered.length) return filtered;
    }
  } catch {}
  // Fall back to auto-favorite for the current club if available
  const fav = _getAutoFavoriteTeam(validKeys);
  if (fav) return [fav];
  // Fall back to legacy single-team key if it's valid, otherwise first option
  const legacy = localStorage.getItem('ebwp-team-key');
  if (legacy && validKeys.includes(legacy)) return [legacy];
  return [validKeys[0] || '14u-girls'];
}

function getSelectedTeam() {
  return getSelectedTeams()[0];
}

function setSelectedTeams(keys) {
  localStorage.setItem(_teamKeysKey(), JSON.stringify(keys));
  if (keys.length) localStorage.setItem('ebwp-team-key', keys[0]); // compat
  // Sync to Firestore if a spectator is signed in (Phase 1)
  if (typeof fbSavePrefs === 'function') fbSavePrefs();
}

// ── Favorite age groups (Phase 5A) ────────────────────────────────────────────

function _favKey() {
  // Per-club namespaced key so each club remembers its own favorites independently
  const clubId = getAppClubId();
  return clubId ? `ebwp-fav-groups-${clubId}` : 'ebwp-fav-groups';
}

function getFavGroups() {
  try {
    // Try per-club key first, fall back to legacy global key
    const stored = localStorage.getItem(_favKey()) || localStorage.getItem('ebwp-fav-groups');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function setFavGroups(groups) {
  localStorage.setItem(_favKey(), JSON.stringify(groups));
  if (typeof fbSavePrefs === 'function') fbSavePrefs();
}

/**
 * Auto-select a favorite team for the current club.
 * Returns the first favorite team key that's valid for this club, or null.
 */
function _getAutoFavoriteTeam(validKeys) {
  const favs = getFavGroups();
  if (!favs.length) return null;
  // Return the first favorite that's a valid team for this club
  for (const fav of favs) {
    if (validKeys.includes(fav)) return fav;
  }
  return null;
}

function toggleFavGroup(key) {
  const favs = getFavGroups();
  const idx = favs.indexOf(key);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(key);
  setFavGroups(favs);
  renderTeamPicker();
}

// ── Live Activity / Live Update per-team preferences ──────────────────────────

/** In-memory set of game IDs that were auto-started this session (prevents double-trigger). */
const _laAutoStarted = new Set();

function getLAPrefs() {
  try { return JSON.parse(localStorage.getItem(`ebwp-la-prefs-${getAppClubId()}`) || '{}'); }
  catch { return {}; }
}

function setLAPref(teamKey, enabled) {
  const prefs = getLAPrefs();
  prefs[teamKey] = enabled;
  localStorage.setItem(`ebwp-la-prefs-${getAppClubId()}`, JSON.stringify(prefs));
}

function _teamLabelForKey(teamKey) {
  if (typeof TEAM_OPTIONS !== 'undefined') {
    const opt = TEAM_OPTIONS.find(o => o.key === teamKey);
    if (opt?.label) return opt.label;
  }
  return teamKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function _buildLATeamListHTML() {
  const platform = window.Capacitor?.getPlatform?.();
  const favs = getFavGroups();
  const prefs = getLAPrefs();
  if (!favs.length) {
    return `<div style="padding:12px 0;text-align:center;color:var(--gray-400);font-size:0.85rem">
      Star a team in Team Selection to configure preferences here.
    </div>`;
  }
  return favs.map(teamKey => {
    const label = _teamLabelForKey(teamKey);
    const enabled = prefs[teamKey] !== false; // default on
    const thing = platform === 'ios' ? 'activity' : 'update';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--gray-100)">
      <span style="font-size:0.95rem;font-weight:600">${escHtml(label)}</span>
      <button onclick="toggleLAPref('${escHtml(teamKey)}')"
              role="switch" aria-checked="${enabled}" aria-label="${escHtml(label)} live ${thing}"
              style="width:51px;height:31px;border-radius:16px;border:none;cursor:pointer;padding:2px;
                     background:${enabled ? 'var(--royal)' : '#ccc'};flex-shrink:0;transition:background .2s">
        <span style="display:block;width:27px;height:27px;border-radius:50%;background:#fff;
                     box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s;
                     transform:translateX(${enabled ? '20px' : '0'})"></span>
      </button>
    </div>`;
  }).join('');
}

function openLASettingsModal() {
  const platform = window.Capacitor?.getPlatform?.();
  const title = platform === 'ios' ? 'Live Activities' : 'Live Updates';
  const desc  = platform === 'ios'
    ? 'Automatically add a real-time scorecard to your Lock Screen when a favorited team\'s game begins.'
    : 'Automatically show a live score chip in your status bar when a favorited team\'s game begins.';

  let modal = document.getElementById('la-settings-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'la-settings-modal';
    modal.className = 'roster-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', `${title} Settings`);
    modal.innerHTML = `
      <div class="roster-modal-backdrop" onclick="closeLASettingsModal()"></div>
      <div class="roster-modal-sheet">
        <div class="roster-modal-header">
          <span class="roster-modal-title">📡 ${escHtml(title)}</span>
          <button class="roster-modal-close" onclick="closeLASettingsModal()" aria-label="Close">✕</button>
        </div>
        <div style="padding:16px">
          <p style="margin:0 0 16px 0;font-size:0.85rem;color:var(--gray-500)">${escHtml(desc)}</p>
          <div id="la-teams-list"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('la-teams-list').innerHTML = _buildLATeamListHTML();
  modal.classList.remove('hidden');
  _openModal('la-settings-modal');
}

function closeLASettingsModal() {
  const modal = document.getElementById('la-settings-modal');
  if (modal) modal.classList.add('hidden');
  _closeModal('la-settings-modal');
}

function toggleLAPref(teamKey) {
  const prefs = getLAPrefs();
  setLAPref(teamKey, prefs[teamKey] === false); // flip (default on → off; off → on)
  const listEl = document.getElementById('la-teams-list');
  if (listEl) listEl.innerHTML = _buildLATeamListHTML();
}

function toggleSelectedTeam(key) {
  const teams = getSelectedTeams();
  const idx   = teams.indexOf(key);
  if (idx >= 0) {
    teams.splice(idx, 1);
  } else {
    teams.push(key);
  }
  // Always keep in canonical age-group order regardless of selection order
  const order = TEAM_OPTIONS.map(t => t.key);
  teams.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  setSelectedTeams(teams);
}

async function loadTeamData(teamKey) {
  try {
    let teamUrl = `${WORKER}/team-data?team=${encodeURIComponent(teamKey)}`;
    const club = getAppClubId();
    if (club) teamUrl += `&club=${encodeURIComponent(club)}`;
    const res = await fetch(teamUrl, { cache: 'no-store' });
    if (!res.ok) {
      // Server has no data for this slot (404 = intentionally cleared / never set up).
      // Clear any stale cache entry so the multi-slot renderer doesn't show old tournament
      // data (e.g. a past tournament from a previous bleed) for an empty slot.
      if (res.status === 404) delete TEAM_CACHE[teamKey];
      return;
    }
    const data = await res.json();
    const { tournament, history, clubType, clubName, branding, enableMasters, mastersOnly, singleMastersTeam } = data;
    const inferredSingleMastersTeam = !!singleMastersTeam || (!!enableMasters && !!mastersOnly && teamKey === 'masters');
    if (tournament) {
      TEAM_CACHE[teamKey]  = { tournament, history: history || [] };
      window.TOURNAMENT    = tournament;
      window.HISTORY_SEED  = history || [];
      // Clear cached roster and history so fresh data from server is used.
      // Keep tournament history/results intact on refresh; only clear roster caches here.
      localStorage.removeItem(STORE.ROSTER);
      localStorage.removeItem(STORE.ROSTER + '-A');
      localStorage.removeItem(STORE.ROSTER + '-B');
      localStorage.removeItem(STORE.ROSTER + '-C');
    }

    // Apply branding from the team data payload (preferred source)
    if (branding) {
      if (branding.primaryColor) {
        applyClubBranding(branding.primaryColor, branding.secondaryColor, branding.headerStyle);
      }
      if (branding.logoUrl) {
        applyClubLogo(branding.logoUrl, clubName);
      }
      // Don't call applyClubLogo(null) here — if team-data has no logoUrl,
      // keep whatever logo was already set by the club-info fetch in _doTeamLoad.
    }
    // Detect HS club type and switch team options dynamically
    if (clubType && clubType !== localStorage.getItem('ebwp-club-type')) {
      localStorage.setItem('ebwp-club-type', clubType);
      storeClubPrograms(!!enableMasters, !!mastersOnly, inferredSingleMastersTeam);
      const isHS = clubType === 'highschool';
      TEAM_OPTIONS = getClubTeamOptions(clubType, !!enableMasters, !!mastersOnly, inferredSingleMastersTeam);
      // If the current team key doesn't belong to the new options, reset selection
      const validKeys = TEAM_OPTIONS.map(t => t.key);
      const current = getSelectedTeams();
      if (!current.some(k => validKeys.includes(k))) {
        setSelectedTeams([validKeys[0]]);
      }
      renderHeader(); // switch header style (HS vs Club)
    }
    if (clubName && clubName !== localStorage.getItem('ebwp-club-name')) {
      localStorage.setItem('ebwp-club-name', clubName);
      renderHeader();
    }
  } catch (e) {
    console.warn('[ebwp] loadTeamData failed:', e.message);
  }
}

async function loadAllSelectedTeams() {
  const teams = getSelectedTeams();
  if (teams.length > 0) await loadTeamData(teams[0]); // primary first
  if (teams.length > 1) await Promise.all(teams.slice(1).map(k => loadTeamData(k)));
  _auditMultiTeamIntegrity();
  await syncSheetConfigToServiceWorker();
}

/** Deselect all team keys in an HS group (e.g., boys-varsity,boys-jv) */
async function deselectHSGroup(keysStr) {
  const keysToRemove = keysStr.split(',');
  let teams = getSelectedTeams().filter(k => !keysToRemove.includes(k));
  setSelectedTeams(teams);
  _auditMultiTeamIntegrity();
  checkTournamentChange();
  seedHistory();
  renderTeamPicker();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
  await syncSheetConfigToServiceWorker();
}

async function onAgeGroupToggle(teamKey) {
  toggleSelectedTeam(teamKey);
  const teams = getSelectedTeams();
  // Load any uncached teams
  const missing = teams.filter(k => !TEAM_CACHE[k]);
  if (missing.length) await Promise.all(missing.map(k => loadTeamData(k)));
  _auditMultiTeamIntegrity();
  checkTournamentChange();
  seedHistory();
  renderTeamPicker();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
  if (state.currentTab === 'settings') _renderSettingsTeamPicker();
  await _syncWidgetsAll();
  await syncSheetConfigToServiceWorker();
  // Phase 2: sync Firestore listeners to match current team selection
  if (typeof fbListenToTournament === 'function') {
    teams.forEach(k => fbListenToTournament(k));
  }
}

async function onTeamChange(teamKey) {
  setSelectedTeams([teamKey]);
  await loadTeamData(teamKey);
  _auditMultiTeamIntegrity();
  checkTournamentChange();
  seedHistory();
  renderHeader();
  renderScheduleTab();
  renderPossibleTab();
  renderHistoryTab();
  renderRosterTab();
  await _syncWidgetsAll();
  await syncSheetConfigToServiceWorker();
}
const VAPID_PUBLIC_KEY = 'BLAUkqU0MK0iweY295OlM0ZvnsnW_sY9nimSShbwBZRQc2swcC79ReFT2Abs4drLSZZdrToy3nZRILeta37USBY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    showToast('Push notifications not supported in this browser');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted' && _isNativePlatform()) {
      showToast('Notifications blocked — opening device settings');
      openNativeNotificationSettings();
      return;
    }
    if (permission !== 'granted') {
      showToast('Notifications blocked — enable in browser settings');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub   = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Send the subscription to the Cloudflare Worker
    const res = await fetch(`${PUSH_SERVER_URL}/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(sub),
    });

    if (res.ok) {
      localStorage.setItem('ebwp-push-subscribed', '1');
      showToast('🔔 Notifications enabled! You\'ll be alerted when new games are added.', 'ok');
      renderPushButton();
    } else {
      showToast('Subscription failed — try again');
    }
  } catch (e) {
    console.error('Push subscribe error:', e);
    showToast('Could not enable notifications: ' + e.message);
  }
}

async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    localStorage.removeItem('ebwp-push-subscribed');
    showToast('Notifications turned off');
    renderPushButton();
  } catch (e) {
    showToast('Could not unsubscribe: ' + e.message);
  }
}

function isPushSubscribed() {
  return !!localStorage.getItem('ebwp-push-subscribed');
}

/** Renders the push toggle button inside the sync card area. */
function renderPushButton() {
  const el = $('push-btn-container');
  if (!el) return;

  // Check support: native (Capacitor) or web (Service Worker + PushManager)
  const native    = typeof EggbeaterPush !== 'undefined' && EggbeaterPush.isNative();
  const webSupported = ('serviceWorker' in navigator) && ('PushManager' in window);
  if (!native && !webSupported) { el.innerHTML = ''; return; }

  const subscribed = isPushSubscribed();

  if (subscribed) {
    // ── Subscribed: show preferences + unsubscribe ───────────────────────
    const prefs = _loadPushPrefs();
    const ageGroups = (typeof getSelectedTeams === 'function') ? getSelectedTeams() : [];

    el.innerHTML = `
      <div class="push-card">
        <div class="push-header">
          <span class="push-icon">🔔</span>
          <span class="push-title">Notifications On${native ? ' (iOS)' : ''}</span>
        </div>
        <div class="push-prefs">
          <label class="push-pref-row">
            <input type="checkbox" id="pref-scores" ${prefs.gameScores ? 'checked' : ''}
                   onchange="onPushPrefChange()">
            <span>Game score updates</span>
          </label>
          <div id="score-freq-section" class="push-sub-prefs" style="${prefs.gameScores ? '' : 'display:none'}">
            <label class="push-pref-row push-pref-sub">
              <input type="radio" name="score-freq" value="everyGoal" ${prefs.scoreFrequency === 'everyGoal' ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>Every goal 🟡</span>
            </label>
            <label class="push-pref-row push-pref-sub">
              <input type="radio" name="score-freq" value="endOfQuarter" ${prefs.scoreFrequency === 'endOfQuarter' ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>End of quarter</span>
            </label>
            <label class="push-pref-row push-pref-sub">
              <input type="radio" name="score-freq" value="endOfGame" ${prefs.scoreFrequency === 'endOfGame' ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>End of game only</span>
            </label>
          </div>
          <label class="push-pref-row">
            <input type="checkbox" id="pref-schedule" ${prefs.scheduleChanges ? 'checked' : ''}
                   onchange="onPushPrefChange()">
            <span>Schedule changes</span>
          </label>
          <label class="push-pref-row">
            <input type="checkbox" id="pref-announce" ${prefs.tournamentAnnouncements ? 'checked' : ''}
                   onchange="onPushPrefChange()">
            <span>Tournament announcements</span>
          </label>
          <label class="push-pref-row">
            <input type="checkbox" id="pref-reminders" ${prefs.gameReminders ? 'checked' : ''}
                   onchange="onPushPrefChange()">
            <span>Game reminders ⏰</span>
          </label>
          <div id="reminder-lead-section" class="push-sub-prefs" style="${prefs.gameReminders ? '' : 'display:none'}">
            <label class="push-pref-row push-pref-sub">
              <input type="checkbox" id="pref-remind-30" ${(prefs.reminderLeadMinutes || []).includes(30) ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>30 minutes before</span>
            </label>
            <label class="push-pref-row push-pref-sub">
              <input type="checkbox" id="pref-remind-60" ${(prefs.reminderLeadMinutes || []).includes(60) ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>1 hour before</span>
            </label>
            <label class="push-pref-row push-pref-sub">
              <input type="checkbox" id="pref-remind-120" ${(prefs.reminderLeadMinutes || []).includes(120) ? 'checked' : ''}
                     onchange="onPushPrefChange()">
              <span>2 hours before</span>
            </label>
          </div>
        </div>
        <button class="push-btn push-btn-on" onclick="handlePushUnsubscribe()">
          Turn off notifications
        </button>
      </div>`;
  } else {
    // ── Not subscribed: warm-up card before triggering native prompt ─────
    // Honest, specific description → user taps → THEN the native OS dialog appears.
    // This pattern dramatically reduces permission denials.

    // If the user dismissed within the last 14 days, respect that and stay quiet.
    const dismissed = parseInt(localStorage.getItem('ebwp-push-dismissed') || '0', 10);
    const DISMISS_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days
    if (dismissed && Date.now() - dismissed < DISMISS_TTL) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <div class="push-card">
        <div class="push-header">
          <span class="push-icon">🔔</span>
          <span class="push-title">Game Alerts</span>
        </div>
        <p class="push-desc" style="margin-bottom:6px">We'll send you a notification when new games are added to the schedule. Nothing else.</p>
        <p class="push-desc" style="font-size:0.75rem;color:var(--gray-400);margin-bottom:10px">You can turn this off at any time in Settings.</p>
        <div style="display:flex;gap:8px">
          <button class="push-btn push-btn-off" style="flex:2" onclick="handlePushSubscribe()">
            Enable Notifications
          </button>
          <button style="flex:1;background:none;border:1.5px solid var(--gray-200);border-radius:8px;padding:10px;font-size:0.82rem;font-weight:600;color:var(--gray-500);cursor:pointer"
                  onclick="localStorage.setItem('ebwp-push-dismissed', Date.now()); this.closest('.push-card').style.display='none'">
            Not Now
          </button>
        </div>
      </div>`;
  }
}

function _loadPushPrefs() {
  try {
    const saved = localStorage.getItem('ebwp-push-prefs');
    if (saved) {
      const p = JSON.parse(saved);
      // Ensure new fields have defaults
      if (!p.scoreFrequency) p.scoreFrequency = 'everyGoal';
      if (p.gameReminders === undefined) p.gameReminders = false;
      if (!Array.isArray(p.reminderLeadMinutes)) p.reminderLeadMinutes = [60];
      return p;
    }
  } catch {}
  return { gameScores: true, scoreFrequency: 'everyGoal', scheduleChanges: true,
           tournamentAnnouncements: true, gameReminders: false, reminderLeadMinutes: [60] };
}

function _savePushPrefs(prefs) {
  localStorage.setItem('ebwp-push-prefs', JSON.stringify(prefs));
}

function onPushPrefChange() {
  const scoresOn = !!($('pref-scores') && $('pref-scores').checked);
  const remindersOn = !!($('pref-reminders') && $('pref-reminders').checked);

  // Toggle sub-sections visibility
  const freqSec = document.getElementById('score-freq-section');
  if (freqSec) freqSec.style.display = scoresOn ? '' : 'none';
  const remSec = document.getElementById('reminder-lead-section');
  if (remSec) remSec.style.display = remindersOn ? '' : 'none';

  // Read score frequency radio
  const freqRadio = document.querySelector('input[name="score-freq"]:checked');
  const scoreFrequency = freqRadio ? freqRadio.value : 'everyGoal';

  // Read reminder lead times
  const reminderLeadMinutes = [];
  if ($('pref-remind-30')?.checked) reminderLeadMinutes.push(30);
  if ($('pref-remind-60')?.checked) reminderLeadMinutes.push(60);
  if ($('pref-remind-120')?.checked) reminderLeadMinutes.push(120);

  const prefs = {
    gameScores:              scoresOn,
    scoreFrequency,
    scheduleChanges:         !!($('pref-schedule') && $('pref-schedule').checked),
    tournamentAnnouncements: !!($('pref-announce') && $('pref-announce').checked),
    gameReminders:           remindersOn,
    reminderLeadMinutes,
    ageGroups: (typeof getSelectedTeams === 'function') ? getSelectedTeams() : [],
  };
  _savePushPrefs(prefs);
  // Update Firestore if native
  if (typeof EggbeaterPush !== 'undefined' && EggbeaterPush.isNativePush()) {
    EggbeaterPush.updatePreferences(prefs);
  }
}

async function handlePushSubscribe() {
  const prefs = {
    gameScores: true,
    scoreFrequency: 'everyGoal',
    scheduleChanges: true,
    tournamentAnnouncements: true,
    gameReminders: false,
    reminderLeadMinutes: [60],
    ageGroups: (typeof getSelectedTeams === 'function') ? getSelectedTeams() : [],
  };
  _savePushPrefs(prefs);

  if (typeof EggbeaterPush !== 'undefined' && EggbeaterPush.isNative()) {
    await EggbeaterPush.register(prefs);
  } else {
    await subscribeToPush();
  }
}

async function handlePushUnsubscribe() {
  if (typeof EggbeaterPush !== 'undefined' && EggbeaterPush.isNativePush()) {
    await EggbeaterPush.unregister();
  } else {
    await unsubscribeFromPush();
  }
  localStorage.removeItem('ebwp-push-prefs');
  // Clear the "Not Now" dismiss flag so the warm-up card reappears immediately
  // if the user wants to re-enable notifications later.
  localStorage.removeItem('ebwp-push-dismissed');
}

// ─── SCORER MODE (password-gated scoring controls) ────────────────────────────

function _getUnlockedScoringTournamentIds() {
  try {
    const raw = JSON.parse(localStorage.getItem('ebwp-scorer-tournaments') || '[]');
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function _setUnlockedScoringTournamentIds(ids) {
  const clean = [...new Set((ids || []).filter(Boolean))];
  if (clean.length) localStorage.setItem('ebwp-scorer-tournaments', JSON.stringify(clean));
  else localStorage.removeItem('ebwp-scorer-tournaments');
}

function isScorerUnlockedForTournament(tournament) {
  const tournamentId = tournament?.id || '';
  if (!tournamentId) return false;
  const unlockedIds = _getUnlockedScoringTournamentIds();
  if (unlockedIds.includes(tournamentId)) return true;
  const legacyUnlocked = localStorage.getItem('ebwp-scorer-unlocked') === '1';
  const legacyTournamentId = localStorage.getItem('ebwp-scorer-tournament') || '';
  if (!legacyUnlocked) return false;
  if (legacyTournamentId === tournamentId) return true;
  const legacyTournament = Object.values(TEAM_CACHE || {}).map(c => c?.tournament).find(t => t?.id === legacyTournamentId);
  return !!(
    legacyTournament?.scoringPassword &&
    tournament?.scoringPassword &&
    legacyTournament.scoringPassword === tournament.scoringPassword
  );
}

function isScorerUnlocked() {
  return isScorerUnlockedForTournament(TOURNAMENT);
}

function openScoringPasswordModal() {
  const modal = $('scoring-pw-modal');
  if (!modal) return;
  $('scoring-pw-input').value = '';
  $('scoring-pw-error').textContent = '';
  modal.classList.remove('hidden');
  _openModal('scoring-pw-modal');
  setTimeout(() => $('scoring-pw-input').focus(), 150);
}

function closeScoringPasswordModal() {
  $('scoring-pw-modal').classList.add('hidden');
  _closeModal('scoring-pw-modal');
}

function submitScoringPassword() {
  const entered = ($('scoring-pw-input').value || '').trim();
  const correct = (TOURNAMENT.scoringPassword || '').trim();
  const selectedTournaments = getSelectedTeams()
    .map(groupKey => TEAM_CACHE[groupKey]?.tournament)
    .filter(Boolean);
  const protectedPasswords = new Set(
    [correct, ...selectedTournaments.map(t => (t.scoringPassword || '').trim())].filter(Boolean)
  );
  const passwordMatchesSelectedScope = protectedPasswords.has(entered);

  if (!protectedPasswords.size || passwordMatchesSelectedScope) {
    const unlocked = new Set(_getUnlockedScoringTournamentIds());
    const primaryId = TOURNAMENT.id || '';
    if (primaryId && (!correct || correct === entered)) unlocked.add(primaryId);
    for (const cacheTournament of selectedTournaments) {
      if (!cacheTournament?.id) continue;
      const cachePassword = (cacheTournament.scoringPassword || '').trim();
      if (!cachePassword || cachePassword === entered) unlocked.add(cacheTournament.id);
    }
    _setUnlockedScoringTournamentIds([...unlocked]);
    localStorage.setItem('ebwp-scorer-unlocked',    '1');
    localStorage.setItem('ebwp-scorer-tournament',  primaryId);
    state.viewerMode = false;
    closeScoringPasswordModal();
    showToast('🔓 Scorer mode unlocked!', 'ok');
    renderGamesList();
    if (state.currentTab === 'scores') renderScoresTab();
  } else {
    $('scoring-pw-error').textContent = 'Incorrect password — try again';
    $('scoring-pw-input').value = '';
    $('scoring-pw-input').focus();
  }
}

function lockScoring() {
  localStorage.removeItem('ebwp-scorer-unlocked');
  localStorage.removeItem('ebwp-scorer-tournament');
  localStorage.removeItem('ebwp-scorer-tournaments');
  // Broadcast 'pre' to worker for every game this device was scoring so that
  // ALL other devices' live dots and LIVE badges clear immediately.
  const myGames = getMyGames();
  for (const [gameId, s] of Object.entries(state.liveScores)) {
    if (s && s.gameState && s.gameState !== 'pre' && (myGames.has(gameId) || !s._remote)) {
      broadcastGameReset(gameId);
    }
  }
  document.querySelector('.app-header')?.classList.remove('scoring-active');
  showToast('🔒 Scorer mode locked');
  updateLiveDot();
  renderGamesList();
  renderNextGameCard(); // clear LIVE badge on blue card
  if (state.currentTab === 'scores') renderScoresTab();
  syncHeaderHeight();
}

// ─── LIVE SCORE BROADCAST & SYNC ──────────────────────────────────────────────
// Scorer device pushes state after every event.
// Viewer devices poll every 5 s and merge remote state into their display.
// Devices are distinguished by a random per-device ID stored in localStorage
// so the scorer never overwrites their own live state with stale remote data.

const LIVE_POLL_MS = 5_000;
let _livePollTimer = null;

function getDeviceId() {
  let id = localStorage.getItem('ebwp-device-id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('ebwp-device-id', id);
  }
  return id;
}

/** Push current live score for a game to Cloudflare KV. Fire-and-forget. */
async function broadcastLiveScore(gameId) {
  const scopedKey = _scopedGameKey(gameId);
  const score = state.liveScores[scopedKey];
  if (!score || score.gameState === 'pre') return; // nothing worth broadcasting yet
  // Strip private tracking fields before sending
  const { _remote, _broadcastAt, _deviceId, ...cleanScore } = score;
  const ageGroup = _contextGroupKey(gameId) || cleanScore.ageGroup || getSelectedTeam() || '';
  const scorePw = TOURNAMENT.scoringPassword || '';
  const payload = {
    gameId: _gameIdOnly(gameId),
    clubId:       getAppClubId() || '',
    ageGroup,
    tournamentId: TOURNAMENT.id || '',
    deviceId:     getDeviceId(),
    score:        { ...cleanScore, ageGroup },
    _scorePw:     scorePw, // stored in offline queue so SW can authenticate replays
  };
  const headers = { 'Content-Type': 'application/json' };
  if (scorePw) headers['X-Score-Password'] = scorePw;
  try {
    const res = await fetch(`${PUSH_SERVER_URL}/live-score`, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch (e) {
    // Queue for later sync
    _queuePendingScore(payload);
  }
}

// ── Offline Score Queue (IndexedDB) ──────────────────────────────────────────

function _openScoreDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ebwp-offline', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-scores'))
        db.createObjectStore('pending-scores', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('tournament-cache'))
        db.createObjectStore('tournament-cache', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function _queuePendingScore(payload) {
  try {
    const db = await _openScoreDB();
    const tx = db.transaction('pending-scores', 'readwrite');
    tx.objectStore('pending-scores').add({
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    });
    // Show offline banner
    _showOfflineBanner(true);
    // Register background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('score-sync').catch(() => {});
    }
  } catch (e) { console.warn('[offline] queue failed:', e.message); }
}

async function _syncPendingScores() {
  try {
    const db = await _openScoreDB();
    const tx = db.transaction('pending-scores', 'readonly');
    const store = tx.objectStore('pending-scores');
    const all = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    if (!all.length) return;

    let synced = 0;
    for (const entry of all) {
      if (entry.retryCount >= 10) {
        // Give up — delete and notify
        const dtx = db.transaction('pending-scores', 'readwrite');
        dtx.objectStore('pending-scores').delete(entry.id);
        showToast('❌ Failed to sync a score after 10 retries', 'err');
        continue;
      }
      try {
        const replayHeaders = { 'Content-Type': 'application/json' };
        if (entry.payload._scorePw) replayHeaders['X-Score-Password'] = entry.payload._scorePw;
        const res = await fetch(`${PUSH_SERVER_URL}/live-score`, {
          method:  'POST',
          headers: replayHeaders,
          body:    JSON.stringify(entry.payload),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        // Success — remove from queue
        const dtx = db.transaction('pending-scores', 'readwrite');
        dtx.objectStore('pending-scores').delete(entry.id);
        synced++;
      } catch {
        // Increment retry count
        const utx = db.transaction('pending-scores', 'readwrite');
        utx.objectStore('pending-scores').put({ ...entry, retryCount: entry.retryCount + 1 });
        break; // stop trying if still offline
      }
    }
    if (synced > 0) {
      showToast(`✅ ${synced} score${synced > 1 ? 's' : ''} synced`, 'ok');
    }
    // Check if queue is empty now
    const checkTx = db.transaction('pending-scores', 'readonly');
    const remaining = await new Promise((res) => {
      const req = checkTx.objectStore('pending-scores').count();
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(0);
    });
    if (remaining === 0) _showOfflineBanner(false);
  } catch (e) { console.warn('[offline] sync failed:', e.message); }
}

function _showOfflineBanner(show) {
  let banner = document.getElementById('offline-score-banner');
  if (show && !banner) {
    banner = document.createElement('div');
    banner.id = 'offline-score-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:0.82rem;font-weight:700;text-align:center;padding:8px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.15)';
    banner.textContent = '📡 Offline — scores will sync when connected';
    document.body.appendChild(banner);
  } else if (!show && banner) {
    banner.remove();
  }
}

// Sync when connectivity resumes
window.addEventListener('online', () => { _syncPendingScores(); });
// Also try syncing on page load
setTimeout(_syncPendingScores, 3000);
// Handle sync delegation from service worker (when SW fires background sync but app is open)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'SYNC_SCORES') _syncPendingScores();
  });
}

// ── Cache tournament data for offline fallback ───────────────────────────────

async function _cacheTournamentData(team, data) {
  try {
    const db = await _openScoreDB();
    const tx = db.transaction('tournament-cache', 'readwrite');
    tx.objectStore('tournament-cache').put({ key: team, data, updatedAt: Date.now() });
  } catch { /* ignore */ }
}

async function _getCachedTournamentData(team) {
  try {
    const db = await _openScoreDB();
    const tx = db.transaction('tournament-cache', 'readonly');
    return await new Promise((res) => {
      const req = tx.objectStore('tournament-cache').get(team);
      req.onsuccess = () => res(req.result?.data || null);
      req.onerror = () => res(null);
    });
  } catch { return null; }
}

// Broadcast gameState:'pre' to the worker so ALL polling devices clear their
// live dot / LIVE badge the moment this scorer locks.
function broadcastGameReset(gameId) {
  try {
    const scopedKey = _scopedGameKey(gameId);
    const score = state.liveScores[scopedKey] || {};
    const { _remote, _broadcastAt, _deviceId, ...cleanScore } = score;
    const scorePw = TOURNAMENT.scoringPassword || '';
    const ageGroup = _contextGroupKey(gameId) || cleanScore.ageGroup || getSelectedTeam() || '';
    const headers = { 'Content-Type': 'application/json' };
    if (scorePw) headers['X-Score-Password'] = scorePw;
    fetch(`${PUSH_SERVER_URL}/live-score`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({
        gameId: _gameIdOnly(gameId),
        clubId:       getAppClubId() || '',
        ageGroup,
        tournamentId: TOURNAMENT.id || '',
        deviceId:     getDeviceId(),
        score:        { ...cleanScore, gameState: 'pre', ageGroup },
        _scorePw:     scorePw,
      }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

/** Fire-and-forget APNs push to spectators when a score event happens. */
function notifyScorePush(gameId, eventType) {
  const scopedKey = _scopedGameKey(gameId);
  const score = state.liveScores[scopedKey];
  if (!score || score.gameState === 'pre' || score.gameState === 'final') return;
  const game = _findGameByRef(gameId);
  const clubId = (typeof getAppClubId === 'function' ? getAppClubId() : null) || 'my-club';
  const teamKey = _contextGroupKey(gameId) || ((typeof getSelectedTeam === 'function') ? getSelectedTeam() : TEAM_OPTIONS[0].key);
  try {
    const headers = { 'Content-Type': 'application/json' };
    // Include scoring password if available
    const scorePw = TOURNAMENT.scoringPassword || '';
    if (scorePw) headers['X-Score-Password'] = scorePw;
    fetch(`${PUSH_SERVER_URL}/notify-score`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        clubId,
        ageGroup: teamKey,
        gameId: _gameIdOnly(gameId),
        teamScore: score.team || 0,
        oppScore: score.opp || 0,
        opponent: game?.opponent || 'Opponent',
        event: eventType,
      }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

/** Poll worker for live scores pushed by other devices. */
async function pollLiveScores() {
  try {
    const tid = encodeURIComponent(TOURNAMENT.id || '');
    const res = await fetch(`${PUSH_SERVER_URL}/live-scores?t=${tid}`, { cache: 'no-store' });
    if (!res.ok) return;
    const remote = await res.json();

    let changed = false;
    const myGames = getMyGames();
    const changedGameIds = []; // track which games updated for aria-live announcement

    for (const [gameId, remoteScore] of Object.entries(remote)) {
      const scopedKey = _scopedGameKey(gameId, remoteScore.ageGroup || remoteScore.score?.ageGroup || '');
      if ((myGames.has(scopedKey) || myGames.has(gameId)) && isScorerUnlocked()) continue; // active scorer — don't overwrite local state
      const local = state.liveScores[scopedKey] || state.liveScores[gameId] || {};
      if ((remoteScore.broadcastAt || 0) <= (local._broadcastAt || 0)) continue; // not newer

      // Strip worker meta fields; tag the score as remote with the source device
      const { deviceId, tournamentId, gameId: _gid, broadcastAt, ...scoreData } = remoteScore;
      const scoreAgeGroup = remoteScore.ageGroup || scoreData.ageGroup || '';

      // Haptic for spectator viewers when team scores (remote team score went up)
      const prevTeam = local.team || 0;
      if ((scoreData.team || 0) > prevTeam) _hapticGoal();

      // If scorer reset the game to pre, wipe the local entry entirely so viewer sees clean state
      if (scoreData.gameState === 'pre') {
        if (state.liveScores[scopedKey]) { delete state.liveScores[scopedKey]; changed = true; }
        // End Live Activity / Live Update for this game if active
        if (window._activeLA?.gameId === scopedKey || window._activeLA?.gameId === gameId) {
          const _laPlugin = window.Capacitor?.Plugins?.LiveActivity;
          if (_laPlugin) _laPlugin.endActivity({}).catch(() => {});
          window._activeLA = null;
          _laAutoStarted.delete(scopedKey); // allow re-auto-start if game resumes
        }
        if (typeof EggbeaterLiveUpdate !== 'undefined' && window.Capacitor?.getPlatform?.() === 'android') {
          EggbeaterLiveUpdate.stop();
        }
        continue;
      }

      state.liveScores[scopedKey] = { ...scoreData, ageGroup: scoreAgeGroup || _contextGroupKey(gameId), _remote: true, _broadcastAt: broadcastAt, _deviceId: deviceId };
      _applyAutoFinalResult(gameId, state.liveScores[scopedKey], scoreAgeGroup);
      changedGameIds.push(scopedKey);
      changed = true;
    }

    // Auto-start Live Activity (iOS) for favorited teams when their game goes live
    if (_isNativePlatform() && window.Capacitor?.getPlatform?.() === 'ios') {
      const _laPrefsI = getLAPrefs();
      const _favsI = getFavGroups();
      const _games = getTournamentGames();
      for (const [gId, score] of Object.entries(state.liveScores)) {
        if (!score._remote) continue; // only auto-start for viewer, not active scorer
        if (score.gameState === 'pre' || score.gameState === 'final') continue;
        if (_laAutoStarted.has(gId)) continue;
        if (window._activeLA?.gameId === gId) { _laAutoStarted.add(gId); continue; } // already active
        const game = _findGameByRef(gId);
        const groupKey = _resolveGameAgeGroupKey(gId);
        if (!game || !_favsI.includes(groupKey)) continue;
        if (_laPrefsI[groupKey] === false) continue; // user disabled for this team
        _laAutoStarted.add(gId);
        toggleLiveActivity(gId).catch(() => {});
        break; // one at a time
      }
    }

    if (changed) {
      _auditMultiTeamIntegrity();
      saveLiveScores();
      // Start the 250ms clock ticker if any received game has a running timer.
      // Without this, viewer clocks never tick — ensureClockTicker() is only called
      // on the scorer path, not after a remote poll update.
      if (Object.values(state.liveScores).some(s => s && s.timerRunning)) {
        ensureClockTicker();
      }
      // Re-render schedule tab fully (handles both single-team and multi-team paths)
      // so the IN PROGRESS card and LIVE badges appear without a force refresh.
      if (state.currentTab === 'schedule') renderScheduleTab();
      else { renderNextGameCard(); renderGamesList(); }
      if (state.currentTab === 'scores') renderScoresTab();
      renderHistoryTab();
      updateLiveDot();
      // VoiceOver: announce the most recently broadcast game that changed
      if (changedGameIds.length === 1) {
        _announceScore(changedGameIds[0]);
      } else if (changedGameIds.length > 1) {
        const latest = changedGameIds.reduce((best, gid) =>
          (state.liveScores[gid]?._broadcastAt || 0) > (state.liveScores[best]?._broadcastAt || 0) ? gid : best
        );
        _announceScore(latest);
      }
      // Only show toast if at least one changed game is actually in progress
      // (prevents false toast when stale 'final' KV entries arrive on app load)
      const _hasLiveGame = changedGameIds.some(gid => {
        const _s = state.liveScores[gid];
        return _s && _s.gameState !== 'final' && _s.gameState !== 'so_w' && _s.gameState !== 'so_l';
      });
      if (_hasLiveGame) showLiveToast();
      _syncWidgetsAll();

      // iOS Live Activity update
      if (window._activeLA) {
        const { gameId: laGameId, plugin: laPlugin } = window._activeLA;
        const ls = state.liveScores[laGameId];
        if (ls) {
          const isEnded = ls.gameState === 'final' || ls.gameState === 'so_w' || ls.gameState === 'so_l';
          if (isEnded) {
            try { await laPlugin.endActivity({}); } catch {}
            window._activeLA = null;
          } else {
            try {
              const _lsRemaining = ls.timerRunning
                ? Math.max(0, (ls.timerSecondsLeft || 0) - (Date.now() - (ls.timerStartedAt || Date.now())) / 1000)
                : 0;
              await laPlugin.updateActivity({
                homeScore: ls.team  || 0,
                awayScore: ls.opp   || 0,
                clock:     ls.clock || '0:00',
                quarter:   String(ls.period || 1),
                lastEvent: _buildLastEventStr(laGameId),
                timerEnd:  ls.timerRunning && _lsRemaining > 0 ? (Date.now() / 1000 + _lsRemaining) : 0,
              });
            } catch (e) {
              console.warn('[LA] updateActivity failed:', e);
            }
          }
        }
      }
    }
    // Android 16 Live Update — runs on EVERY successful poll cycle (not just when changed).
    // If the foreground service start fails silently on first detection, the 5-second poller
    // retries automatically without needing broadcastAt to change again.
    // Only skip if tournament data hasn't loaded yet (empty array = race condition on startup).
    if (typeof EggbeaterLiveUpdate !== 'undefined' && Capacitor?.getPlatform?.() === 'android'
        && getTournamentGames().length > 0) {
      const _laPrefsA = getLAPrefs();
      const _favsA = getFavGroups();
      const liveGames = getTournamentGames().filter(g => isGameLive(_gameRef(g)));
      const autoGame = liveGames.find(g => {
        const groupKey = _contextGroupKey(g, g._groupKey || '');
        return _favsA.includes(groupKey) && _laPrefsA[groupKey] !== false;
      }) || (liveGames.length > 0 && !liveGames.some(g => {
        const groupKey = _contextGroupKey(g, g._groupKey || '');
        return _favsA.includes(groupKey) && _laPrefsA[groupKey] === false;
      }) ? liveGames[0] : null);
      if (autoGame) {
        const autoGameRef = _gameRef(autoGame);
        EggbeaterLiveUpdate.sync(autoGameRef, _buildLUScore(autoGameRef));
      } else {
        EggbeaterLiveUpdate.stop();
      }
    }
  } catch { /* ignore network errors — offline is fine */ }
}

let _liveToastShown = false;
function showLiveToast() {
  if (_liveToastShown) return;
  _liveToastShown = true;
  showToast('📡 Live scoring update received', 'ok');
  setTimeout(() => { _liveToastShown = false; }, 15000);
}

async function startLivePoller() {
  if (_livePollTimer) clearInterval(_livePollTimer);
  pollLiveScores(); // immediate first check
  const interval = await _getPollInterval(LIVE_POLL_MS); // 5 s normal, 10 s on low battery
  _livePollTimer = setInterval(pollLiveScores, interval);
}

// ─── PLAYER STATS DOWNLOAD ────────────────────────────────────────────────────

/**
 * Scans all events (current tournament + full history) and returns a
 * de-duped list of players who have at least one recorded event.
 * Players are keyed by NAME (case-insensitive) so the same player
 * wearing different cap numbers across tournaments is merged into one row.
 * Each entry: { name, G, A, Excl, sixOnFive, gameCount }
 */
function getAllPlayersWithStats(teamKey = '') {
  // key = lowercased full name (or 'unknown:cap' fallback for nameless events)
  const map = {};

  function nameKey(ev) {
    const name = String(ev.name || '').trim();
    if (name) return name.toLowerCase();
    const cap = String(ev.cap || '').trim();
    return cap ? ('unknown:' + cap) : null;
  }

  function processEvts(evts, gameKey) {
    for (const ev of (evts || [])) {
      if (ev.side !== 'team' || ev.type === 'game_state') continue;
      if (!['goal','shot_miss','goal_5m','miss_5m','so_goal','so_miss','assist','steal','field_block','sprint_won','exclusion','brutality','earned_excl','save','block'].includes(ev.type)) continue;
      const key = nameKey(ev);
      if (!key) continue;
      const name = String(ev.name || '').trim();
      if (!map[key]) map[key] = { name, G: 0, SM: 0, G5: 0, M5: 0, SOG: 0, SOM: 0, Stl: 0, FBU: 0, FB: 0, SW: 0, A: 0, Excl: 0, EE: 0, sixOnFive: 0, Sv: 0, games: new Set() };
      // Keep the longest / most complete name seen for this player
      if (name.length > map[key].name.length) map[key].name = name;
      map[key].games.add(gameKey);
      if (ev.type === 'goal')                               { map[key].G++;      if (ev.sixOnFive) map[key].sixOnFive++; }
      if (ev.type === 'shot_miss')                            map[key].SM++;
      if (ev.type === 'goal_5m')                              map[key].G5++;
      if (ev.type === 'miss_5m')                              map[key].M5++;
      if (ev.type === 'so_goal')                              map[key].SOG++;
      if (ev.type === 'so_miss')                              map[key].SOM++;
      if (ev.type === 'steal')                                { map[key].Stl++; if (ev.forcedBallUnder) map[key].FBU++; }
      if (ev.type === 'field_block')                          map[key].FB++;
      if (ev.type === 'sprint_won')                           map[key].SW++;
      if (ev.type === 'assist')                               map[key].A++;
      if (ev.type === 'exclusion' || ev.type === 'brutality') map[key].Excl++;
      if (ev.type === 'earned_excl')                          map[key].EE++;
      if (ev.type === 'save' || ev.type === 'block')          map[key].Sv++;
    }
  }

  // Current tournament live scores
  for (const g of getScopedTournamentGames(teamKey)) {
    const ls = getLiveScore(g);
    processEvts(ls.events || [], 'current:' + g.id);
  }

  // Full history (localStorage)
  for (const t of getHistory()) {
    for (const g of (t.games || [])) {
      const ls   = g.liveScore || {};
      const evts = ls.events || (ls.goals
        ? ls.goals.map(g2 => ({ type: g2.side === 'team' ? 'goal' : 'opp_goal', ...g2 }))
        : []);
      processEvts(evts, t.id + ':' + (g.id || g.opponent));
    }
  }

  return Object.values(map)
    .map(p => ({ ...p, gameCount: p.games.size }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Collects per-game stats for one player matched by NAME.
 * Matching rules (in order of specificity):
 *  1. Full name exact match (case-insensitive)
 *  2. First name exact match (only when first name is > 2 chars, avoids "Jo" collisions)
 * Cap numbers are intentionally ignored for matching — they rotate per tournament.
 * Returns an array of row objects sorted oldest → newest.
 */
function collectPlayerGameRows(name, teamKey = '') {
  const rows    = [];
  const nameStr = String(name || '').trim().toLowerCase();
  const firstName = nameStr.split(' ')[0] || '';

  function matchesPlayer(ev) {
    const evName = String(ev.name || '').trim().toLowerCase();
    if (!evName) return false;
    if (evName === nameStr) return true;                                    // full match
    if (firstName.length > 2 && evName.split(' ')[0] === firstName) return true; // first-name match
    return false;
  }

  function extractFromEvts(evts) {
    let G = 0, SM = 0, G5 = 0, M5 = 0, SOG = 0, SOM = 0, Stl = 0, FBU = 0, FB = 0, SW = 0, A = 0, Excl = 0, EE = 0, sixOnFive = 0, Sv = 0, hasAny = false;
    for (const ev of (evts || [])) {
      if (ev.type === 'game_state') continue;
      if (!matchesPlayer(ev)) continue;
      hasAny = true;
      if (ev.type === 'goal')                               { G++;  if (ev.sixOnFive) sixOnFive++; }
      if (ev.type === 'shot_miss')                            SM++;
      if (ev.type === 'goal_5m')                              G5++;
      if (ev.type === 'miss_5m')                              M5++;
      if (ev.type === 'so_goal')                              SOG++;
      if (ev.type === 'so_miss')                              SOM++;
      if (ev.type === 'steal')                                { Stl++; if (ev.forcedBallUnder) FBU++; }
      if (ev.type === 'field_block')                          FB++;
      if (ev.type === 'sprint_won')                           SW++;
      if (ev.type === 'assist')                               A++;
      if (ev.type === 'exclusion' || ev.type === 'brutality') Excl++;
      if (ev.type === 'earned_excl')                          EE++;
      if (ev.type === 'save' || ev.type === 'block')          Sv++;
    }
    return { hasAny, G, SM, G5, M5, SOG, SOM, Stl, FBU, FB, SW, A, Excl, EE, sixOnFive, Sv };
  }

  // Current tournament
  for (const g of getScopedTournamentGames(teamKey)) {
    const ls   = getLiveScore(g);
    const evts = ls.events || [];
    const stats = extractFromEvts(evts);
    if (stats.hasAny || evts.filter(e => e.type !== 'game_state').length > 0) {
      // Only include this game if events were recorded AND this player appeared
      if (!stats.hasAny) continue;
      rows.push({
        tournamentName: TOURNAMENT.name || 'Eggbeater',
        date:           g.dateISO || g.date || '',
        opponent:       normalizeOpponentName(g.opponent || 'TBD'),
        result:         _getResultForGame(g) || '',
        teamScore:      ls.team ?? '',
        oppScore:       ls.opp  ?? '',
        ...stats,
      });
    }
  }

  // Full history
  for (const t of getHistory()) {
    for (const g of (t.games || [])) {
      const ls   = g.liveScore || {};
      const evts = ls.events || (ls.goals
        ? ls.goals.map(g2 => ({ type: g2.side === 'team' ? 'goal' : 'opp_goal', ...g2 }))
        : []);
      const stats = extractFromEvts(evts);
      if (!stats.hasAny) continue;
      rows.push({
        tournamentName: t.name || 'Past Tournament',
        date:           g.dateISO || g.date || '',
        opponent:       normalizeOpponentName(g.opponent || 'TBD'),
        result:         g.result || '',
        teamScore:      ls.team ?? '',
        oppScore:       ls.opp  ?? '',
        ...stats,
      });
    }
  }

  // Sort chronologically (oldest first)
  rows.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return rows;
}

/** Builds a CSV string for a player's stats. */
function buildPlayerStatsCSV(playerLabel, rows) {
  const now      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalG    = rows.reduce((s, r) => s + r.G, 0);
  const totalA    = rows.reduce((s, r) => s + r.A, 0);
  const totalStl  = rows.reduce((s, r) => s + (r.Stl || 0), 0);
  const totalSW   = rows.reduce((s, r) => s + (r.SW || 0), 0);
  const totalFBU  = rows.reduce((s, r) => s + (r.FBU || 0), 0);
  const totalFB   = rows.reduce((s, r) => s + (r.FB || 0), 0);
  const totalExcl = rows.reduce((s, r) => s + r.Excl, 0);
  const total6v5  = rows.reduce((s, r) => s + r.sixOnFive, 0);
  const totalSv   = rows.reduce((s, r) => s + (r.Sv  || 0), 0);
  const totalWins = rows.filter(r => isWin(r.result)).length;
  const isGkPlayer = totalSv > 0;

  const q = str => `"${String(str || '').replace(/"/g, '""')}"`;

  const header = isGkPlayer
    ? 'Tournament,Date,Opponent,Result,Team Score,Opp Score,Goals,Assists,Steals,Sprint Wins,Forced Ball Under,Field Blocks,Exclusions,6v5 Goals,Saves'
    : 'Tournament,Date,Opponent,Result,Team Score,Opp Score,Goals,Assists,Steals,Sprint Wins,Forced Ball Under,Field Blocks,Exclusions,6v5 Goals';

  const lines = [
    q('Eggbeater Water Polo — Player Stats Export'),
    q(`Player: ${playerLabel}`),
    q(`Exported: ${now}`),
    q(`${rows.length} game${rows.length !== 1 ? 's' : ''}  |  Record: ${totalWins}-${rows.length - totalWins}  |  Goals: ${totalG}  Assists: ${totalA}  Steals: ${totalStl}  Exclusions: ${totalExcl}${totalSW ? '  Sprint Wins: ' + totalSW : ''}${totalFBU ? '  FBU: ' + totalFBU : ''}${totalFB ? '  Field Blocks: ' + totalFB : ''}${total6v5 ? '  6v5: ' + total6v5 : ''}${isGkPlayer ? `  Saves: ${totalSv}` : ''}`),
    '',
    header,
  ];

  for (const r of rows) {
    let dateStr = '';
    if (r.date) {
      try {
        dateStr = new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch { dateStr = r.date; }
    }
    const base = [
      q(r.tournamentName),
      q(dateStr),
      q(r.opponent),
      q(resultLabel(r.result)),
      r.teamScore !== '' ? r.teamScore : '',
      r.oppScore  !== '' ? r.oppScore  : '',
      r.G,
      r.A,
      r.Stl || 0,
      r.SW || 0,
      r.FBU || 0,
      r.FB || 0,
      r.Excl,
      r.sixOnFive,
    ];
    if (isGkPlayer) base.push(r.Sv || 0);
    lines.push(base.join(','));
  }

  lines.push('');
  const totalsBase = [q('SEASON TOTALS'), '', '', '', '', '', totalG, totalA, totalStl, totalSW, totalFBU, totalFB, totalExcl, total6v5];
  if (isGkPlayer) totalsBase.push(totalSv);
  lines.push(totalsBase.join(','));

  return lines.join('\n');
}

/** Triggers a file download in the browser. */
function triggerDownload(filename, content, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Opens the player stats download modal. */
function openPlayerStatsModal() {
  const players = getAllPlayersWithStats();
  const listEl  = $('player-stats-list');

  if (!players.length) {
    listEl.innerHTML = `<p class="pstats-empty">${appT('playerstats_empty')}</p>`;
  } else {
    listEl.innerHTML = players.map(p => {
      const displayName = escHtml(p.name || '?');
      const gkExtra     = p.Sv ? `&nbsp;&nbsp;Sv&nbsp;${p.Sv||0}` : '';
      const totals      = `<span class="pstats-totals">G&nbsp;${p.G}&nbsp;&nbsp;A&nbsp;${p.A}&nbsp;&nbsp;Ex&nbsp;${p.Excl}${gkExtra}</span>`;
      const gamesStr    = `<span class="pstats-games">${escHtml(appFormat('playerstats_games_count', { count: String(p.gameCount) }))}</span>`;
      const nameEncoded = encodeURIComponent(p.name || '');
      return `<button class="pstats-player-btn" onclick="downloadPlayerStats('${nameEncoded}')" aria-label="${escHtml(appFormat('playerstats_download_aria', { name: p.name || '?' }))}">
        <div class="pstats-player-left"><span class="pstats-name">${displayName}</span></div>
        <div class="pstats-player-right">${totals}${gamesStr}<span class="pstats-dl-icon" aria-hidden="true">⬇</span></div>
      </button>`;
    }).join('');
  }

  $('player-stats-modal').classList.remove('hidden');
  _openModal('player-stats-modal');
}

/** Closes the player stats modal. */
function closePlayerStatsModal() {
  $('player-stats-modal').classList.add('hidden');
  _closeModal('player-stats-modal');
}

// ── Season Stats Modal (from archived tournaments) ──────────────────────────

let _seasonStatsData = [];
let _seasonStatsSort = { col: 'goals', desc: true };

async function openSeasonStatsModal() {
  // Create modal if not exists
  let modal = $('season-stats-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'season-stats-modal';
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:480px;width:100%;max-height:90vh;overflow-y:auto;border-radius:16px;padding:0">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 8px;border-bottom:1px solid var(--gray-200,#e5e7eb)">
          <h2 style="margin:0;font-size:1.1rem">📊 ${escHtml(appT('season_stats_title'))}</h2>
          <button onclick="closeSeasonStatsModal()" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--gray-500,#6b7280)">✕</button>
        </div>
        <div id="season-stats-body" style="padding:12px 16px"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeSeasonStatsModal(); });
  }

  modal.classList.remove('hidden');
  const body = $('season-stats-body');
  body.innerHTML = `<div style="text-align:center;color:var(--gray-500,#6b7280);padding:24px;font-size:0.85rem">${escHtml(appT('season_stats_loading'))}</div>`;

  try {
    const clubId = localStorage.getItem('ebwp-club') || 'my-club';
    const team = getSelectedTeam();
    const res = await fetch(`${PUSH_SERVER_URL}/player-stats?club=${encodeURIComponent(clubId)}&team=${encodeURIComponent(team)}`);
    const data = await res.json();
    _seasonStatsData = data.stats || [];

    if (!_seasonStatsData.length) {
      body.innerHTML = `<div style="text-align:center;color:var(--gray-500,#6b7280);padding:24px;font-size:0.85rem">${appT('season_stats_empty')}</div>`;
      return;
    }

    renderSeasonStatsTable();
  } catch (e) {
    body.innerHTML = `<div style="color:#dc2626;padding:16px;font-size:0.85rem">${escHtml(appFormat('season_stats_failed', { message: e.message }))}</div>`;
  }
}

function closeSeasonStatsModal() {
  const m = $('season-stats-modal');
  if (m) m.classList.add('hidden');
}

function sortSeasonStats(col) {
  if (_seasonStatsSort.col === col) {
    _seasonStatsSort.desc = !_seasonStatsSort.desc;
  } else {
    _seasonStatsSort.col = col;
    _seasonStatsSort.desc = true;
  }
  renderSeasonStatsTable();
}

function renderSeasonStatsTable() {
  const body = $('season-stats-body');
  if (!body || !_seasonStatsData.length) return;

  const { col, desc } = _seasonStatsSort;
  const sorted = [..._seasonStatsData].sort((a, b) => {
    if (col === 'name') return desc ? (b.name||'').localeCompare(a.name||'') : (a.name||'').localeCompare(b.name||'');
    const av = a[col] ?? 0, bv = b[col] ?? 0;
    return desc ? bv - av : av - bv;
  });

  const arrow = (c) => _seasonStatsSort.col === c ? (_seasonStatsSort.desc ? ' ▼' : ' ▲') : '';
  const th = (label, key, align) => `<th style="padding:6px 4px;cursor:pointer;white-space:nowrap;font-size:0.68rem;text-align:${align||'center'};color:${_seasonStatsSort.col===key?'#1d4ed8':'#6b7280'};font-weight:700;user-select:none" onclick="sortSeasonStats('${key}')">${label}${arrow(key)}</th>`;

  let html = `<div style="overflow-x:auto;margin:0 -16px;padding:0 16px">
    <table style="width:100%;border-collapse:collapse;font-size:0.78rem">
      <thead><tr style="border-bottom:2px solid #e5e7eb">
        ${th('#','cap','center')}${th('Name','name','left')}${th('GP','gamesPlayed')}${th('G','goals')}${th('A','assists')}${th('S','steals')}${th('EX','exclusions')}${th('G/GP','goalsPerGame')}
      </tr></thead><tbody>`;

  for (const [i, p] of sorted.entries()) {
    const bg = i % 2 ? '#f9fafb' : 'white';
    html += `<tr style="background:${bg}">
      <td style="padding:5px 4px;text-align:center;font-weight:700;color:#1d4ed8">${escHtml(p.cap||'')}</td>
      <td style="padding:5px 4px;font-weight:600;white-space:nowrap">${escHtml(p.name)}</td>
      <td style="padding:5px 4px;text-align:center">${p.gamesPlayed}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:700;color:#16a34a">${p.goals}</td>
      <td style="padding:5px 4px;text-align:center">${p.assists}</td>
      <td style="padding:5px 4px;text-align:center">${p.steals}</td>
      <td style="padding:5px 4px;text-align:center;color:#dc2626">${p.exclusions}</td>
      <td style="padding:5px 4px;text-align:center;font-weight:600">${(p.goalsPerGame||0).toFixed(2)}</td>
    </tr>`;
  }

  html += '</tbody></table></div>';
  html += `<div style="font-size:0.68rem;color:#9ca3af;margin-top:8px;text-align:right">${sorted.length} players · tap column to sort</div>`;
  body.innerHTML = html;
}

/** Compiles and downloads one player's stats as a CSV. */
function downloadPlayerStats(nameEncoded) {
  const name  = decodeURIComponent(nameEncoded);
  const rows  = collectPlayerGameRows(name);

  if (!rows.length) {
    showToast('No stats found for this player');
    return;
  }

  const playerLabel = name || 'Player';
  const safeName    = playerLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const filename    = `ebwp_${safeName}_stats.csv`;

  const csv = buildPlayerStatsCSV(playerLabel, rows);
  triggerDownload(filename, csv);
  closePlayerStatsModal();
  showToast(`📥 Downloaded ${playerLabel}'s stats (${rows.length} game${rows.length !== 1 ? 's' : ''})`, 'ok');
}

// ─── HELP TAB ─────────────────────────────────────────────────────────────────

function renderHelpTab() {
  const el = $('view-help');
  if (!el) return;

  const sections = [
    {
      icon: '📲',
      title: 'Installing the App (iOS App Store & Google Play)',
      body: `<p>Download the native <strong>Eggbeater Water Polo</strong> app for the best experience — faster performance, reliable push notifications, and home screen access.</p>
      <p style="margin-top:10px"><strong>🍎 iPhone / iPad (iOS)</strong></p>
      <ol>
        <li>Open the <strong>App Store</strong> on your iPhone or iPad.</li>
        <li>Search for <strong>Eggbeater Water Polo</strong>.</li>
        <li>Tap <strong>Get</strong> to download and install.</li>
        <li>Open the app, select your club and age group, then go to <strong>Settings → Notifications</strong> to enable push notifications.</li>
      </ol>
      <p style="margin-top:10px"><strong>🤖 Android</strong></p>
      <ol>
        <li>Open the <strong>Google Play Store</strong> on your Android device.</li>
        <li>Search for <strong>Eggbeater Water Polo</strong>.</li>
        <li>Tap <strong>Install</strong>.</li>
        <li>Open the app, select your club and age group, then allow notifications when prompted.</li>
      </ol>
      <p style="margin-top:8px;color:var(--text-muted);font-size:0.85rem">💡 The native app is recommended for the most reliable notifications and the smoothest experience.</p>`
    },
    {
      icon: '📱',
      title: 'Installing the Web App (iOS & Android)',
      body: `<p>No App Store needed — you can install the Eggbeater web app directly from your browser and add it to your home screen for a full-screen, app-like experience.</p>
      <p style="margin-top:10px"><strong>🍎 iPhone / iPad (iOS — Safari required)</strong></p>
      <ol>
        <li>Open <a href="https://eggbeater.app" target="_blank" rel="noopener" style="color:var(--royal);font-weight:700">eggbeater.app</a> in <strong>Safari</strong> (must be Safari — Chrome and other iOS browsers cannot install home screen apps).</li>
        <li>Tap the <strong>Share</strong> button — the box-with-arrow icon at the bottom of the screen (top-right on iPad).</li>
        <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
        <li>Tap <strong>Add</strong> — the Eggbeater icon appears on your home screen.</li>
        <li>Always open from the home screen icon for full-screen mode and push notifications.</li>
        <li>Go to <strong>Settings → Calendar &amp; Notifications</strong> and tap <em>Enable Notifications</em>.</li>
      </ol>
      <p style="margin-top:8px;color:var(--text-muted);font-size:0.85rem">⚠️ Push notifications on iOS require iOS 16.4+ and the app must be opened from the home screen icon, not from Safari directly.</p>
      <p style="margin-top:10px"><strong>🤖 Android (Chrome)</strong></p>
      <ol>
        <li>Open <a href="https://eggbeater.app" target="_blank" rel="noopener" style="color:var(--royal);font-weight:700">eggbeater.app</a> in <strong>Chrome</strong>.</li>
        <li>Tap the <strong>three-dot menu</strong> (⋮) in the top-right corner.</li>
        <li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
        <li>Tap <strong>Add</strong> or <strong>Install</strong> to confirm.</li>
        <li>Open from your home screen icon, then tap <em>Get Notified</em> and allow notifications when prompted.</li>
      </ol>`
    },
    {
      icon: '📅',
      title: appT('help_schedule_title'),
      body: appT('help_schedule_body')
    },
    {
      icon: '🏆',
      title: appT('help_scores_title'),
      body: appT('help_scores_body')
    },
    {
      icon: '📊',
      title: appT('help_live_scoring_title'),
      body: appT('help_live_scoring_body')
    },
    {
      icon: '🎯',
      title: appT('help_shootout_title'),
      body: appT('help_shootout_body')
    },
    {
      icon: '🏅',
      title: appT('help_bracket_title'),
      body: appT('help_bracket_body')
    },
    {
      icon: '📜',
      title: appT('help_history_title'),
      body: appT('help_history_body')
    },
    {
      icon: '⭐',
      title: appT('help_myplayer_title'),
      body: appT('help_myplayer_body')
    },
    {
      icon: '🤽‍♀️',
      title: appT('help_agegroup_title'),
      body: appT('help_agegroup_body')
    },
    {
      icon: '👥',
      title: appT('help_multi_title'),
      body: appT('help_multi_body')
    },
    {
      icon: '🌐',
      title: 'Accessing the Spectator App from the Web',
      body: `<p>No install required — the full app works in any modern browser on any device: phone, tablet, or computer.</p>
      <ul>
        <li>Open <a href="https://eggbeater.app" target="_blank" rel="noopener" style="color:var(--royal);font-weight:700">eggbeater.app</a> in any browser — Chrome, Safari, Firefox, Edge, etc.</li>
        <li>All features work in the browser: schedule, live scores, bracket, roster, and history.</li>
        <li><strong>Bookmark it</strong> for quick access — tap the browser's share or bookmark icon and save it to your favorites.</li>
        <li>Your age group selections and preferences are remembered automatically in your browser.</li>
        <li>For push notifications and full-screen mode, install the app to your home screen — see <em>Installing the Web App</em> above, or download the native app from the App Store or Google Play.</li>
      </ul>`
    },
    {
      icon: '⚙️',
      title: appT('help_settings_title'),
      body: appT('help_settings_body')
    },
    {
      icon: '☁️',
      title: 'Sign In with Google — One Tap Covers Everything',
      body: `<p>Go to <strong>Settings → Account</strong> and tap <strong>Sign In with Google</strong>. This single sign-in covers <em>both</em> preference sync and Google Calendar access — no second popup ever.</p>
      <ul>
        <li><strong>Preferences sync:</strong> your selected age group(s), A/B team choices, and My Player picks are saved to the cloud and restored automatically on every device you use.</li>
        <li><strong>Calendar access included:</strong> the same sign-in grants calendar permission, so when you tap Connect in Settings → Calendar &amp; Notifications you just pick which calendar to use — Google doesn't ask you to sign in again.</li>
        <li><strong>Automatic reconnect:</strong> on every future visit your calendar reconnects silently in the background. You'll never need to re-authenticate unless you revoke access.</li>
        <li>Sign in on your phone — within seconds your tablet or laptop shows the exact same setup.</li>
        <li>Tap <strong>Sign Out</strong> (same button) to disconnect. Your local preferences stay on the device — nothing is deleted.</li>
        <li>The app works fully without signing in. Sign-In is purely additive and optional.</li>
      </ul>`
    },
    {
      icon: '🔔',
      title: appT('help_notifications_title'),
      body: appT('help_notifications_body')
    },
    {
      icon: '🔴',
      title: appT('help_live_updates_title'),
      body: appT('help_live_updates_body')
    },
    {
      icon: '⌚',
      title: appT('help_watch_title'),
      body: appT('help_watch_body')
    },
    {
      icon: '🧩',
      title: appT('help_widgets_title'),
      body: appT('help_widgets_body')
    },
    {
      icon: '📺',
      title: appT('help_tscore_title'),
      body: appT('help_tscore_body')
    },
    {
      icon: '🏢',
      title: appT('help_multiclub_title'),
      body: appT('help_multiclub_body')
    },
    {
      icon: '🌙',
      title: appT('help_darkmode_title'),
      body: appT('help_darkmode_body')
    },
    {
      icon: '📍',
      title: appT('help_maps_title'),
      body: appT('help_maps_body')
    },
    {
      icon: '📡',
      title: appT('help_offline_title'),
      body: appT('help_offline_body')
    },
    {
      icon: '🔍',
      title: 'Club Directory',
      body: `<p>A <strong>public club directory</strong> is available for discovering clubs on the Eggbeater platform.</p>
      <ul>
        <li>Visit <a href="https://eggbeater.app/directory.html" target="_blank" style="color:var(--royal);font-weight:700">the Club Directory</a> to browse all clubs.</li>
        <li>Each club shows their logo, name, type (Club or High School), and number of active age groups.</li>
        <li>Use the <strong>search bar</strong> at the top to filter clubs by name.</li>
        <li>Tapping a club card loads the app with that club's schedule pre-selected.</li>
        <li>The directory is mobile-responsive and requires no login.</li>
      </ul>`
    },
    {
      icon: '♿',
      title: appT('help_accessibility_title'),
      body: appT('help_accessibility_body')
    },
  ];

  const accordionHtml = sections.map((s, i) => `
    <details class="help-item">
      <summary class="help-summary">
        <span class="help-icon">${s.icon}</span>
        <span class="help-title">${s.title}</span>
        <svg class="help-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div class="help-body">${s.body}</div>
    </details>`).join('');

  el.innerHTML = `
    <div class="card tab-card help-intro-card">
      <div class="help-intro-row">
        <img src="icon-512.png" alt="Eggbeater" class="help-logo">
        <div>
          <h2 class="help-intro-title">Eggbeater Water Polo</h2>
          <p class="help-intro-sub">Spectator guide &amp; quick reference</p>
        </div>
      </div>
      <a href="eggbeater-quickstart.pdf" target="_blank" rel="noopener" class="help-quickstart-btn">
        📄 Download Quick Start Guide
      </a>
    </div>

    <div class="card tab-card help-accordion-card">
      ${accordionHtml}
    </div>

    <div class="card tab-card help-feedback-card">
      <div class="help-feedback-header">
        <span class="help-feedback-icon">💡</span>
        <div>
          <div class="help-feedback-title">Have an idea or feedback?</div>
          <div class="help-feedback-sub">We're always adding new features — let us know what you'd find useful!</div>
        </div>
      </div>
      <a class="help-request-btn"
         href="mailto:hello@eggbeater.app?subject=Eggbeater%20App%20Feature%20Request&body=Hi%2C%20I%20have%20a%20suggestion%20for%20the%20Eggbeater%20WP%20app%3A%0A%0A"
         target="_blank" rel="noopener">
        ✉️ Request a Feature
      </a>
      <p class="help-feedback-note">Tapping this opens your email app addressed to the app team. Just type your idea and hit send!</p>
    </div>

    <div class="help-version">Eggbeater Water Polo · Built with ❤️ for the team</div>
  `;
}

// ─── WIDGET SYNC ──────────────────────────────────────────────────────────────
// Writes all widget data to shared UserDefaults via the LiveActivity plugin.
// Called whenever club branding, live scores, or player stats change.
// On iOS, LiveActivityPlugin.updateWidgetData() writes to group.com.eggbeater.waterpolo
// and calls WidgetCenter.shared.reloadAllTimelines() automatically.

function _watchDateLabel(dateISO) {
  if (!dateISO) return '';
  try {
    return new Date(dateISO + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateISO;
  }
}

function _buildWatchPayload(availableTeams, clubName) {
  const currentTeamKey = getSelectedTeam();
  const games = [];

  for (const team of availableTeams) {
    const tournament = TEAM_CACHE[team.key]?.tournament || (team.key === currentTeamKey ? TOURNAMENT : null);
    if (!tournament || tournament.upcomingMode || !Array.isArray(tournament.games)) continue;

    tournament.games.forEach((game, index) => {
      const id = String(game.id || `${team.key}-${index}`);
      const liveScore = getLiveScore(`${team.key}:${id}`);
      const gameState = liveScore.gameState || '';
      const isFinal = !!_getResultForGame(`${team.key}:${id}`) || gameState === 'final' || gameState === 'so_w' || gameState === 'so_l' || gameState === 'ff';
      const liveIsActive = !!(liveScore && gameState && !['pre', 'final', 'so_w', 'so_l', 'ff'].includes(gameState));

      games.push({
        id: `${team.key}:${id}`,
        teamKey: team.key,
        teamLabel: team.label,
        opponent: game.opponent || 'TBD',
        time: game.time || '',
        dateISO: game.dateISO || game.date || '',
        dateLabel: game.dateLabel || _watchDateLabel(game.dateISO || game.date || ''),
        pool: (game.pool || game.location) ? `\n${game.pool || game.location}` : null,
        cap: game.cap || null,
        gameNum: game.gameNum || game.number || null,
        ageGroup: team.label,
        liveTeamScore: (liveScore.team != null || isFinal) ? (liveScore.team ?? 0) : null,
        liveOppScore: (liveScore.opp != null || isFinal) ? (liveScore.opp ?? 0) : null,
        livePeriod: liveScore.period ? `Q${liveScore.period}` : (isFinal ? 'Final' : null),
        liveIsActive,
      });
    });
  }

  return {
    clubName: clubName || 'Eggbeater Water Polo',
    primaryColor: (state.clubInfo?.primaryColor) || '#002868',
    secondaryColor: (state.clubInfo?.secondaryColor) || '#00A693',
    teams: availableTeams,
    games,
    updatedAt: Date.now() / 1000,
  };
}

async function _syncWidgetsAll() {
  if (!_isNativePlatform()) return;
  const platform  = window.Capacitor?.getPlatform?.() || '';
  const isAndroid = platform === 'android';
  // iOS uses LiveActivity plugin; Android uses LiveUpdate plugin
  const plugin = isAndroid
    ? window.Capacitor?.Plugins?.LiveUpdate
    : window.Capacitor?.Plugins?.LiveActivity;
  if (!plugin?.updateWidgetData) return;
  try {
    // 1. Club branding colors
    const primary   = (state.clubInfo?.primaryColor)   || '#002868';
    const secondary = (state.clubInfo?.secondaryColor) || '#00A693';

    // 2. Available teams — selected age group keys + human labels
    const selectedTeamKeys = getSelectedTeams();
    const availableTeams   = selectedTeamKeys.map(key => ({
      key,
      label: TEAM_OPTIONS.find(t => t.key === key)?.label || key,
    }));

    // 3. All live scores — keyed by age-group label for widget matching
    const allLiveScores = {};
    const games = getTournamentGames();
    const clubName = localStorage.getItem('ebwp-club-name') || '';
    for (const [gameId, score] of Object.entries(state.liveScores)) {
      if (!score || score.gameState === 'pre' || score.gameState === 'final' ||
          score.gameState === 'so_w' || score.gameState === 'so_l') continue;
      if (!score._broadcastAt || (Date.now() - score._broadcastAt) > 90 * 60 * 1000) continue;
      const game = _findGameByRef(gameId);
      // Key by the game's actual age-group label (resolved from TEAM_CACHE)
      const matchedKey = _resolveGameAgeGroupKey(gameId);
      if (matchedKey && selectedTeamKeys.includes(matchedKey)) {
        const label = TEAM_OPTIONS.find(t => t.key === matchedKey)?.label || matchedKey;
        allLiveScores[label] = {
          homeTeam:        score.teamName  || (game ? `${clubName} ${game.team || ''}`.trim() : clubName) || 'My Team',
          awayTeam:        score.oppName   || (game?.opponent) || 'Opponent',
          homeScore:       score.team      ?? 0,
          awayScore:       score.opp       ?? 0,
          status:          'LIVE',
          clock:           score.clock     || '',
          period:          score.period    ? `Q${score.period}` : '',
          gameId,
          timerRunning:    !!(score.timerRunning),
          timerSecondsLeft: score.timerSecondsLeft || 0,
          timerStartedAt:  score.timerStartedAt   || 0,
        };
      }
    }

    // 4. My players stats (followed players from getMyPlayers())
    const myPlayersList = getMyPlayers();
    const myPlayersStats = myPlayersList.map(p => {
      const s = getMyPlayerSummaryStats(p.name);
      return {
        id:               (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name:             p.name || '',
        firstName:        (p.name || '').split(' ')[0] || '',
        goals:            s?.G     || 0,
        assists:          s?.A     || 0,
        exclusions:       s?.Excl  || 0,
        earnedExclusions: s?.EE    || 0,
      };
    });

    // 5. Next upcoming game
    const now = Date.now();
    const upcoming = games
      .filter(g => !g.isFinal)
      .map(g => {
        const dateStr = g.date || '';
        const timeStr = g.time || '';
        const dt = dateStr ? new Date(dateStr + 'T' + (timeStr || '00:00') + ':00') : null;
        return { game: g, ts: dt ? dt.getTime() : Infinity };
      })
      .filter(x => x.ts > now - 90 * 60 * 1000)
      .sort((a, b) => a.ts - b.ts);
    const nextG = upcoming[0]?.game;
    const nextGame = nextG ? {
      opponent: normalizeOpponentName(nextG.opponent || 'TBD'),
      date:     nextG.date    || '',
      time:     nextG.time    || '',
      location: nextG.location || '',
    } : null;

    let writes;
    if (isAndroid) {
      // Android widget providers read specific keys in specific formats
      // ScoreWidgetProvider reads 'score_widget_data' — flat object for the first live game
      const liveEntries = Object.values(allLiveScores);
      const liveGame    = liveEntries[0] || null;

      // StatsWidgetProvider reads 'stats_widget_data' — {players:[{name,detail}]}
      const statsPlayers = myPlayersStats.map(p => ({
        name:   p.name,
        detail: `${p.goals} G, ${p.assists} A`,
      }));

      // ScheduleWidgetProvider reads 'schedule_widget_data' — {games:[{teams,time}]}
      const scheduleGames = upcoming.slice(0, 3).map(x => ({
        teams: `vs ${x.game.opponent || 'TBD'}`,
        time:  x.game.time || '',
      }));

      writes = [
        { key: 'club_name',            data: clubName || 'Eggbeater Water Polo' },
        { key: 'stats_widget_data',    data: JSON.stringify({ players: statsPlayers }) },
        { key: 'schedule_widget_data', data: JSON.stringify({ games: scheduleGames }) },
      ];
      if (liveGame) {
        writes.push({ key: 'score_widget_data', data: JSON.stringify({
          homeTeam:  liveGame.homeTeam,
          awayTeam:  liveGame.awayTeam,
          homeScore: String(liveGame.homeScore),
          awayScore: String(liveGame.awayScore),
          status:    'LIVE',
          clock:     `${liveGame.period}  ${liveGame.clock}`.trim(),
          gameId:    liveGame.gameId,
        })});
      }
    } else {
      // iOS — write to shared UserDefaults; each call triggers WidgetCenter reload
      writes = [
        { key: 'club_primary_color',   data: primary },
        { key: 'club_secondary_color', data: secondary },
        { key: 'available_teams',      data: JSON.stringify(availableTeams) },
        { key: 'all_live_scores',      data: JSON.stringify(allLiveScores) },
        { key: 'my_players_stats',     data: JSON.stringify(myPlayersStats) },
        { key: 'ebwp_watch_payload',   data: JSON.stringify(_buildWatchPayload(availableTeams, clubName)) },
      ];
      if (nextGame) writes.push({ key: 'next_game', data: JSON.stringify(nextGame) });
    }

    // Fire all writes concurrently; failures are silent (non-critical)
    await Promise.all(writes.map(w => plugin.updateWidgetData(w).catch(() => {})));
  } catch (_) {
    // Widget sync is non-critical — never throw
  }
}

// ─── MY PLAYER(S) ─────────────────────────────────────────────────────────────

/** Returns array of followed players: [{name, teamKey}]. */
function getMyPlayers() {
  try { return JSON.parse(localStorage.getItem(STORE.MY_PLAYERS) || '[]'); } catch { return []; }
}
function saveMyPlayers(arr) {
  localStorage.setItem(STORE.MY_PLAYERS, JSON.stringify(arr));
  // Sync to Firestore if a spectator is signed in (Phase 1)
  if (typeof fbSavePrefs === 'function') fbSavePrefs();
  _syncWidgetsAll();
}
function addMyPlayer(name, teamKey) {
  const arr = getMyPlayers();
  const key = teamKey || getSelectedTeam();
  // Uniqueness is per team — two different kids in two different age groups can
  // share the same name, and two kids in the same age group can both be followed.
  if (!arr.find(p => p.name.toLowerCase() === name.toLowerCase() && p.teamKey === key)) {
    arr.push({ name, teamKey: key });
    saveMyPlayers(arr);
    showToast(`⭐ Following ${name}`, 'ok');
  }
  renderRosterTab();
}
function removeMyPlayer(name, teamKey) {
  const prevPlayers = getMyPlayers();
  const prevLegacy = localStorage.getItem(STORE.MY_PLAYER);
  // If teamKey is provided, only remove that specific team entry.
  // Otherwise remove ALL entries with this name (legacy / fallback).
  saveMyPlayers(getMyPlayers().filter(p => {
    const nameMatch = p.name.toLowerCase() === name.toLowerCase();
    if (!nameMatch) return true;        // keep — different name
    if (teamKey)    return p.teamKey !== teamKey;  // keep — different team
    return false;                       // no teamKey — remove all with this name
  }));
  // Also clear legacy single-player if it matches
  if ((localStorage.getItem(STORE.MY_PLAYER) || '').toLowerCase() === name.toLowerCase()) {
    localStorage.removeItem(STORE.MY_PLAYER);
  }
  renderRosterTab();
  showUndoToast(`Removed ${name} from My Player`, () => {
    saveMyPlayers(prevPlayers);
    if (prevLegacy == null) localStorage.removeItem(STORE.MY_PLAYER);
    else localStorage.setItem(STORE.MY_PLAYER, prevLegacy);
    renderRosterTab();
  });
}

/** Legacy single-player getter — returns first tracked player's name. */
function getMyPlayer() {
  const arr = getMyPlayers();
  if (arr.length) return arr[0].name;
  return localStorage.getItem(STORE.MY_PLAYER) || '';
}

/** Legacy single-player setter — replaces the first tracked player. */
function setMyPlayer(name) {
  if (name) {
    const arr = getMyPlayers();
    const teamKey = getSelectedTeam();
    if (!arr.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      // Replace first entry for this team, or add
      const idx = arr.findIndex(p => p.teamKey === teamKey);
      if (idx >= 0) arr[idx] = { name, teamKey };
      else arr.push({ name, teamKey });
      saveMyPlayers(arr);
    }
    localStorage.setItem(STORE.MY_PLAYER, name);
    showToast(`⭐ Following ${name}`, 'ok');
  } else {
    localStorage.removeItem(STORE.MY_PLAYER);
  }
  renderRosterTab();
}

/** Clears the followed player for the current team. */
function clearMyPlayer() {
  const teamKey = getSelectedTeam();
  const prevPlayers = getMyPlayers();
  const prevLegacy = localStorage.getItem(STORE.MY_PLAYER);
  const arr = getMyPlayers().filter(p => p.teamKey !== teamKey);
  saveMyPlayers(arr);
  localStorage.removeItem(STORE.MY_PLAYER);
  renderRosterTab();
  showUndoToast('Cleared followed players for this age group', () => {
    saveMyPlayers(prevPlayers);
    if (prevLegacy == null) localStorage.removeItem(STORE.MY_PLAYER);
    else localStorage.setItem(STORE.MY_PLAYER, prevLegacy);
    renderRosterTab();
  });
}

/**
 * Renders multi-child "My Players" card for the top of the multi-team roster tab.
 * Shows one card per followed player.
 */
function renderMyPlayersCard() {
  const players = getMyPlayers();
  const teams   = getSelectedTeams();

  // Build one mini card per team with an add-player option
  let html = '';
  for (const teamKey of teams) {
    const label    = TEAM_OPTIONS.find(t => t.key === teamKey)?.label || teamKey;
    const cache    = TEAM_CACHE[teamKey];
    const roster   = cache
      ? (Array.isArray(cache.tournament.roster) ? cache.tournament.roster : (cache.tournament.roster?.A || []))
      : getRosterPlayers(teamKey);
    const tracked  = players.filter(p => p.teamKey === teamKey);
    const sorted   = sortedRoster(roster).filter(p => p.first || p.last);
    const opts     = sorted.map(p => {
      const full = [p.first, p.last].filter(Boolean).join(' ');
      const sel  = tracked.some(t => t.name.toLowerCase() === full.toLowerCase()) ? ' selected' : '';
      return `<option value="${escHtml(full)}"${sel}>${p.cap ? '#' + escHtml(p.cap) + ' ' : ''}${escHtml(full)}</option>`;
    }).join('');

    if (tracked.length) {
      const badges = tracked.map(p => `
        <span class="mp-multi-badge">
          ⭐ ${escHtml(p.name)}
          <button class="mp-multi-remove" onclick="removeMyPlayer('${escHtml(p.name)}','${escHtml(p.teamKey)}')" title="Remove">×</button>
        </span>`).join('');
      const statCards = tracked.map(p => _renderPlayerStatsCard(p.name, teamKey)).join('');
      html += `<div class="card tab-card mp-multi-card">
        <div class="scores-slot-header"><span class="scores-slot-label">${escHtml(label)}</span></div>
        <div class="mp-multi-badges">${badges}</div>
        ${opts ? `<div class="mp-multi-add-row">
          <select class="mp-multi-select" id="mp-sel-${escHtml(teamKey)}">
            <option value="">+ Add another player…</option>${opts}
          </select>
          <button class="mp-multi-add-btn" onclick="_addPlayerFromSelect('${escHtml(teamKey)}')">Add</button>
        </div>` : ''}
        <div class="mp-multi-player-cards">${statCards}</div>
      </div>`;
    } else {
      html += `<div class="card tab-card mp-multi-card mp-multi-empty">
        <div class="scores-slot-header"><span class="scores-slot-label">${escHtml(label)}</span></div>
        <p class="step-desc" style="margin-bottom:8px">Tap a player below to follow their stats.</p>
        ${opts ? `<div class="mp-multi-add-row">
          <select class="mp-multi-select" id="mp-sel-${escHtml(teamKey)}">
            <option value="">Select a player…</option>${opts}
          </select>
          <button class="mp-multi-add-btn" onclick="_addPlayerFromSelect('${escHtml(teamKey)}')">Follow</button>
        </div>` : '<p class="empty-msg">No roster loaded yet.</p>'}
      </div>`;
    }
  }
  return html;
}

function _addPlayerFromSelect(teamKey) {
  const sel = document.getElementById('mp-sel-' + teamKey);
  if (!sel || !sel.value) return;
  addMyPlayer(sel.value, teamKey);
}

/** Gets saved 6-8 Sports profile URL. */
function get68SportsUrl() {
  return localStorage.getItem(STORE.SPORTS68_URL) || '';
}

/** Saves 6-8 Sports profile URL to localStorage. */
function save68SportsUrl(url) {
  if (url) {
    localStorage.setItem(STORE.SPORTS68_URL, url.trim());
  } else {
    localStorage.removeItem(STORE.SPORTS68_URL);
  }
}

/** Opens the saved 6-8 Sports profile URL, or the dashboard homepage. */
function open68SportsUrl() {
  const url = get68SportsUrl();
  window.open(url || 'https://www.6-8dashboard.com/', '_blank', 'noopener');
}

/**
 * Looks up summary stats for a player by name from getAllPlayersWithStats().
 * Uses the same full-name / first-name matching rules as the CSV download.
 */
function getMyPlayerSummaryStats(name, teamKey = getSelectedTeam()) {
  if (!name) return null;
  const all       = getAllPlayersWithStats(teamKey);
  const nameLC    = name.toLowerCase();
  const firstName = nameLC.split(' ')[0] || '';
  return all.find(p => {
    const pn = (p.name || '').toLowerCase();
    if (pn === nameLC) return true;
    if (firstName.length > 2 && pn.split(' ')[0] === firstName) return true;
    return false;
  }) || null;
}

/** Sanitises a player name into a safe key for localStorage / data attributes. */
function _mpKey(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, '_'); }

/** Toggles collapse state for a specific player stats card (keyed by sanitised name). */
function toggleMyPlayerCollapse(key) {
  const storeKey  = `ebwp-mpc-${key}`;
  const collapsed = localStorage.getItem(storeKey) === '1';
  localStorage.setItem(storeKey, collapsed ? '0' : '1');
  const chevron = document.querySelector(`.mp-collapse-chevron[data-mpkey="${key}"]`);
  const body    = document.querySelector(`.mp-body[data-mpkey="${key}"]`);
  if (chevron) chevron.classList.toggle('mp-collapsed', !collapsed);
  if (body)    body.classList.toggle('mp-body-hidden', !collapsed);
}

/** Renders a full stats card for one player (used in single-team mode). */
function _renderPlayerStatsCard(playerName, teamKey = getSelectedTeam()) {
  const cache = TEAM_CACHE[teamKey];
  const tournamentRoster = cache
    ? (Array.isArray(cache.tournament.roster) ? cache.tournament.roster : Object.values(cache.tournament.roster || {}).flat())
    : null;
  const roster   = tournamentRoster || state.roster || [];
  const stats    = getMyPlayerSummaryStats(playerName, teamKey);
  const G        = stats ? stats.G          : 0;
  const SM       = stats ? (stats.SM  || 0) : 0;
  const G5       = stats ? (stats.G5  || 0) : 0;
  const M5       = stats ? (stats.M5  || 0) : 0;
  const SOG      = stats ? (stats.SOG || 0) : 0;
  const SOM      = stats ? (stats.SOM || 0) : 0;
  const A        = stats ? stats.A          : 0;
  const Excl     = stats ? stats.Excl       : 0;
  const Stl      = stats ? (stats.Stl || 0) : 0;
  const SW       = stats ? (stats.SW  || 0) : 0;
  const FBU      = stats ? (stats.FBU || 0) : 0;
  const FB       = stats ? (stats.FB  || 0) : 0;
  const sixOnFive = stats ? (stats.sixOnFive || 0) : 0;
  const Sv       = stats ? (stats.Sv  || 0) : 0;
  const gameCount = stats ? stats.gameCount  : 0;

  function shotPct(made, missed) {
    const total = made + missed;
    if (!total) return { pct: '—', frac: '0/0' };
    return { pct: Math.round((made / total) * 100) + '%', frac: `${made}/${total}` };
  }
  const regPct  = shotPct(G, SM);
  const fivePct = shotPct(G5, M5);
  const soPct   = shotPct(SOG, SOM);
  const initials      = playerName.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
  const hasStats      = stats && gameCount > 0;
  const nameEnc       = encodeURIComponent(playerName);
  const rosterEntry   = roster.find(p => `${p.first} ${p.last}`.toLowerCase() === playerName.toLowerCase());
  const playerIsGoalie = rosterEntry ? isGoalie(rosterEntry.cap) : (Sv > 0);

  const gameRows = (() => {
    const rows = collectPlayerGameRows(playerName, teamKey);
    if (!rows.length) return '';
    const recent = [...rows].reverse().slice(0, 5);
    const cells  = recent.map(r => {
      const res   = r.result ? `<span class="mp-game-result mp-res-${r.result.toLowerCase()}">${resultLabel(r.result)}</span>` : '';
      const score = (r.teamScore !== '' && r.oppScore !== '') ? `${r.teamScore}–${r.oppScore}` : '';
      return `<div class="mp-game-row">
        <div class="mp-game-opp">${escHtml(r.opponent)}${res ? ' ' + res : ''} ${score ? `<span class="mp-game-score">${score}</span>` : ''}</div>
        <div class="mp-game-stats">${playerIsGoalie
          ? `Sv&nbsp;${r.Sv||0}&nbsp; Ex&nbsp;${r.Excl}`
          : `G&nbsp;${r.G}&nbsp; A&nbsp;${r.A}&nbsp; Stl&nbsp;${r.Stl||0}${r.SW ? `&nbsp; SW&nbsp;${r.SW}` : ''}${r.FBU ? `&nbsp; FBU&nbsp;${r.FBU}` : ''}${r.FB ? `&nbsp; FB&nbsp;${r.FB}` : ''}&nbsp; Ex&nbsp;${r.Excl}`}</div>
      </div>`;
    }).join('');
    const moreNote = rows.length > 5 ? `<div class="mp-game-more">${rows.length - 5} more game${rows.length - 5 !== 1 ? 's' : ''} in download</div>` : '';
    return `<div class="mp-games-section">
      <div class="mp-section-label">Recent games</div>
      ${cells}
      ${moreNote}
    </div>`;
  })();

  const key         = _mpKey(playerName);
  const isCollapsed = localStorage.getItem(`ebwp-mpc-${key}`) === '1';

  return `<div class="card tab-card my-player-card">
    <div class="mp-header" onclick="toggleMyPlayerCollapse('${escHtml(key)}')" style="cursor:pointer">
      <div class="mp-avatar">${escHtml(initials)}</div>
      <div class="mp-info">
        <div class="mp-name">${escHtml(playerName)}</div>
        <button class="mp-change-btn" onclick="event.stopPropagation();removeMyPlayer('${escHtml(playerName)}')">Remove</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="mp-star-badge">⭐</span>
        <svg class="mp-collapse-chevron${isCollapsed ? ' mp-collapsed' : ''}" data-mpkey="${escHtml(key)}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>

    <div class="mp-body${isCollapsed ? ' mp-body-hidden' : ''}" data-mpkey="${escHtml(key)}">
    <div class="mp-stat-rows">
      ${playerIsGoalie ? `
      <div class="mp-stat-row-lg">
        <div class="mp-stat-box"><span class="mp-stat-num">${Sv}</span><span class="mp-stat-lbl">Saves</span></div>
        <div class="mp-stat-box"><span class="mp-stat-num">${Excl}</span><span class="mp-stat-lbl">Exclusions</span></div>
        <div class="mp-stat-box"><span class="mp-stat-num">${gameCount}</span><span class="mp-stat-lbl">Games</span></div>
      </div>
` : `
      <div class="mp-stat-group-label">Core Stats</div>
      <div class="mp-stat-row-4">
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${G}</span><span class="mp-stat-lbl-sm">Goals</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${A}</span><span class="mp-stat-lbl-sm">Assists</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${Stl}</span><span class="mp-stat-lbl-sm">Steals</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${Excl}</span><span class="mp-stat-lbl-sm">Exclusions</span></div>
      </div>
      <div class="mp-stat-group-label">Specialty Stats</div>
      <div class="mp-stat-row-4">
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SW}</span><span class="mp-stat-lbl-sm">Sprint Wins</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${FBU}</span><span class="mp-stat-lbl-sm">Forced Under</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${FB}</span><span class="mp-stat-lbl-sm">Field Blocks</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${sixOnFive}</span><span class="mp-stat-lbl-sm">6on5 Goals</span></div>
      </div>
      <div class="mp-stat-row-4">
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${gameCount}</span><span class="mp-stat-lbl-sm">Games</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${G5}</span><span class="mp-stat-lbl-sm">5m Goals</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${M5}</span><span class="mp-stat-lbl-sm">5m Attempts</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SOG}</span><span class="mp-stat-lbl-sm">SO Goals</span></div>
      </div>
      <div class="mp-stat-group-label">Shot Breakdown</div>
      <div class="mp-stat-row-4">
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SOM}</span><span class="mp-stat-lbl-sm">SO Attempts</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${SM}</span><span class="mp-stat-lbl-sm">Shot Attempts</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${regPct.pct}</span><span class="mp-stat-lbl-sm">Shot %</span></div>
        <div class="mp-stat-box mp-stat-box-sm"><span class="mp-stat-num-sm">${fivePct.pct}</span><span class="mp-stat-lbl-sm">5m %</span></div>
      </div>`}
    </div>

    ${!playerIsGoalie ? `
    <div class="mp-pct-grid">
      <div class="mp-pct-box">
        <span class="mp-pct-num">${regPct.pct}</span>
        <span class="mp-pct-frac">${regPct.frac} shots</span>
        <span class="mp-pct-lbl">Shooting %</span>
      </div>
      <div class="mp-pct-box">
        <span class="mp-pct-num">${fivePct.pct}</span>
        <span class="mp-pct-frac">${fivePct.frac} shots</span>
        <span class="mp-pct-lbl">5m Shot %</span>
      </div>
      <div class="mp-pct-box">
        <span class="mp-pct-num">${soPct.pct}</span>
        <span class="mp-pct-frac">${soPct.frac} shots</span>
        <span class="mp-pct-lbl">SO Shot %</span>
      </div>
    </div>` : ''}

    ${!hasStats ? `<p class="mp-no-stats">No stats tracked yet — start live scoring to build this player's history!</p>` : ''}
    ${gameRows}
    <div class="mp-dl-bar">
      <button class="mp-dl-wide-btn" onclick="downloadPlayerStats('${nameEnc}')">
        <span class="mp-dl-wide-icon">📊</span>
        <span class="mp-dl-wide-lbl">Download Stats CSV</span>
      </button>
    </div>
    </div>
  </div>`;
}

/**
 * Builds the "My Players" card(s) for the top of the Roster tab in single-team mode.
 * Supports multiple players from the same age group.
 */
function renderMyPlayerCard() {
  const teamKey = getSelectedTeam();
  const roster  = getRosterPlayers(teamKey);
  const players = getMyPlayers().filter(p => p.teamKey === teamKey);

  // Build options excluding already-followed players
  const opts = sortedRoster(roster)
    .filter(p => p.first || p.last)
    .filter(p => {
      const full = [p.first, p.last].filter(Boolean).join(' ');
      return !players.some(t => t.name.toLowerCase() === full.toLowerCase());
    })
    .map(p => {
      const full = [p.first, p.last].filter(Boolean).join(' ');
      return `<option value="${escHtml(full)}">${p.cap ? '#' + escHtml(p.cap) + ' ' : ''}${escHtml(full)}</option>`;
    }).join('');

  if (!players.length) {
    return `<div class="card tab-card my-player-card mp-empty">
      <div class="mp-empty-header">
        <span class="mp-empty-star">⭐</span>
        <div>
          <div class="mp-empty-title">My Players</div>
          <div class="mp-empty-sub">Follow your child's stats at a glance</div>
        </div>
      </div>
      ${opts
        ? `<div class="mp-multi-add-row">
             <select class="mp-multi-select" id="mp-sel-${escHtml(teamKey)}">
               <option value="">— Pick a player —</option>${opts}
             </select>
             <button class="mp-multi-add-btn" onclick="_addPlayerFromSelect('${escHtml(teamKey)}')">Follow</button>
           </div>`
        : `<p class="mp-no-roster">Add players to the roster below, then come back here to follow your child.</p>`
      }
    </div>`;
  }

  // Selection management card
  let html = `<div class="card tab-card my-player-card">
    <div class="mp-multi-header"><span>⭐</span> <strong>My Players</strong></div>
    <div class="mp-multi-badges">
      ${players.map(p => `
        <span class="mp-multi-badge">
          ⭐ ${escHtml(p.name)}
          <button class="mp-multi-remove" onclick="removeMyPlayer('${escHtml(p.name)}','${escHtml(p.teamKey || teamKey)}')" title="Remove">×</button>
        </span>`).join('')}
    </div>
    ${opts ? `<div class="mp-multi-add-row">
      <select class="mp-multi-select" id="mp-sel-${escHtml(teamKey)}">
        <option value="">+ Add another player…</option>${opts}
      </select>
      <button class="mp-multi-add-btn" onclick="_addPlayerFromSelect('${escHtml(teamKey)}')">Add</button>
    </div>` : ''}
  </div>`;

  // Individual stats card per followed player
  for (const p of players) {
    html += _renderPlayerStatsCard(p.name, teamKey);
  }
  return html;
}

// ─── LIVE ACTIVITIES (iOS) ───────────────────────────────────────────────────

// Tracks the currently active Live Activity so pollLiveScores can update it.
window._activeLA = null;

/** Build a human-readable last-event string for the Live Activity event feed. */
function _buildLastEventStr(gameId) {
  const s = getLiveScore(gameId);
  if (!s || !s.events || !s.events.length) return '';
  const ev = [...s.events].reverse().find(e =>
    ['goal','goal_5m','opp_goal','opp_goal_5m','so_goal','opp_so_goal',
     'exclusion','timeout','opp_timeout','game_state'].includes(e.type)
  );
  if (!ev) return '';
  const q  = ev.period ? `Q${ev.period}` : '';
  const t  = ev.clock  ? ` ${ev.clock}`  : '';
  const sc = `${s.team || 0}-${s.opp || 0}`;
  const pl = [ev.cap ? `#${ev.cap}` : '', ev.name || ''].filter(Boolean).join(' ');
  switch (ev.type) {
    case 'goal':       return `🟡 ${pl || 'Goal'} scored${ev.counter ? ' (Counter)' : (ev.sixOnFive ? ' (6 on 5)' : '')} · ${q}${t} · ${sc}`;
    case 'goal_5m':    return `🟡 ${pl || 'Penalty'} scored (5m) · ${q}${t} · ${sc}`;
    case 'opp_goal':   return `🟡 Opponent scored · ${q}${t} · ${sc}`;
    case 'opp_goal_5m':return `🟡 Opponent penalty (5m) · ${q}${t} · ${sc}`;
    case 'so_goal':    return `🟡 ${pl || 'SO goal'} · ${sc}`;
    case 'opp_so_goal':return `🟡 Opponent SO goal · ${sc}`;
    case 'exclusion':  return pl ? `🟡 ${pl} excluded · ${q}${t}` : '';
    case 'timeout':    return `⏱ Timeout · ${q}${t}`;
    case 'opp_timeout':return `⏱ Opponent timeout · ${q}${t}`;
    case 'game_state':
      if (ev.gameState === 'q1') return '▶ Game started';
      if (ev.gameState === 'q2') return '▶ Q2 started';
      if (ev.gameState === 'q3') return '▶ Q3 started';
      if (ev.gameState === 'q4') return '▶ Q4 started';
      if (ev.gameState === 'final') return `🏁 Final: ${sc}`;
      return '';
    default: return '';
  }
}

async function toggleLiveActivity(gameId) {
  const platform = window.Capacitor?.getPlatform?.();
  const isNative = window.Capacitor?.isNativePlatform?.();
  const rawGameId = _gameIdOnly(gameId);
  const scopedGameId = _gameRef(gameId);

  // ── Android: route to Live Update chip (not iOS Live Activities) ──────────
  if (isNative && platform === 'android') {
    const game  = _findGameByRef(gameId);
    const score = getLiveScore(gameId);
    const gs    = score?.gameState || 'pre';
    if (gs === 'pre') {
      showToast(appT('live_follow_not_started'), "info");
      return;
    }
    if (gs === 'final') {
      showToast(appT('live_follow_over'), "info");
      return;
    }
    if (typeof EggbeaterLiveUpdate !== 'undefined') {
      EggbeaterLiveUpdate.sync(_gameRef(gameId), _buildLUScore(gameId));
      showToast(appT('live_follow_android'), "ok");
    } else {
      showToast(appT('live_update_plugin_missing'), "error");
    }
    return;
  }

  // ── Web / non-native ──────────────────────────────────────────────────────
  if (!isNative || platform !== 'ios') {
    showToast(appT('live_follow_native_only'));
    return;
  }

  const LiveActivity = Capacitor.Plugins.LiveActivity;
  if (!LiveActivity) {
    showToast(appT('live_activity_plugin_missing'), "error");
    return;
  }

  // If already following this game — end it
  if (window._activeLA && window._activeLA.gameId === scopedGameId) {
    try { await LiveActivity.endActivity({}); } catch {}
    window._activeLA = null;
    showToast(appT('live_follow_stopped'), "info");
    return;
  }

  // End any previous activity before starting a new one
  if (window._activeLA) {
    try { await LiveActivity.endActivity({}); } catch {}
    window._activeLA = null;
  }

  const game = _findGameByRef(gameId);

  // Poll for fresh score before starting so we don't show 0-0
  try { await pollLiveScores(); } catch {}
  const score = getLiveScore(gameId);

  // Club branding colours (fall back to Eggbeater royal/teal)
  const primaryColor  = (state.clubInfo?.primaryColor  || '#002868').replace('#', '');
  const secondaryColor = (state.clubInfo?.secondaryColor || '#00A693').replace('#', '');

  try {
    // Calculate remaining clock time for native iOS countdown timer
    const _laRemaining = score.timerRunning
      ? Math.max(0, (score.timerSecondsLeft || 0) - (Date.now() - (score.timerStartedAt || Date.now())) / 1000)
      : 0;

    if (window._liveActivityPushTokenListener?.remove) {
      try { await window._liveActivityPushTokenListener.remove(); } catch {}
    }
    window._liveActivityPushTokenListener = await LiveActivity.addListener('onPushTokenReceived', async (info) => {
      try {
        await fetch(`${PUSH_SERVER_URL}/live-activity/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: rawGameId, pushToken: info.token }),
        });
      } catch (e) {
        console.error('[LA] Failed to sync push token:', e);
      }
    });

    await LiveActivity.startActivity({
      homeTeam:      game ? (`${localStorage.getItem('ebwp-club-name') || getAppClubId() || ''}${game.team ? ' ' + game.team : ''}`).trim() : "Home",
      awayTeam:      game?.opponent || "Away",
      homeScore:     score.team  || 0,
      awayScore:     score.opp   || 0,
      clock:         score.clock || "0:00",
      quarter:       String(score.period || 1),
      lastEvent:     _buildLastEventStr(gameId),
      // Native iOS countdown — non-zero timerEnd makes SwiftUI tick the clock automatically
      timerEnd:      score.timerRunning && _laRemaining > 0 ? (Date.now() / 1000 + _laRemaining) : 0,
      // Use HTTPS worker URL for logo — base64 data: URLs don't load in AsyncImage
      homeLogoUrl:   state.clubInfo?.logo ? `${PUSH_SERVER_URL}/club-logo?club=${encodeURIComponent(getAppClubId())}` : '',
      awayLogoUrl:   '',   // opponent logo not yet stored
      primaryColor:  primaryColor,
      secondaryColor: secondaryColor,
      ageGroup:      _resolveGameAgeGroup(gameId),
    });

    // Track so pollLiveScores can push updates
    window._activeLA = { gameId: scopedGameId, plugin: LiveActivity };

    showToast(appT('live_follow_ios'), "ok");
  } catch (e) {
    showToast(appFormat('live_follow_unavailable', { message: e.message }), "error");
    window._activeLA = null;
  }
}

document.addEventListener('DOMContentLoaded', init);




