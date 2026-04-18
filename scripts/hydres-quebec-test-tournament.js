const fs = require('fs');
const path = require('path');

const WORKER = 'https://ebwp-push.sarah-new.workers.dev';
const CLUB_ID = 'hydres-quebec';
const TEAM_KEY = 'masters';
const CLUB_NAME = 'Hydres Quebec';
const SCORING_PASSWORD = 'hydres26';

const day1 = { iso: '2026-04-24', label: 'Fri, Apr 24' };
const day2 = { iso: '2026-04-25', label: 'Sat, Apr 25' };
const day3 = { iso: '2026-04-26', label: 'Sun, Apr 26' };

function player(cap, first, last) {
  return { cap: String(cap), first, last };
}

const teamCatalog = [
  {
    name: 'Hydres Quebec',
    short: 'HYD',
    division: 'Platinum',
    roster: [
      player(1, 'Etienne', 'Gagnon'),
      player(2, 'Mathieu', 'Bouchard'),
      player(3, 'Samuel', 'Tremblay'),
      player(4, 'Antoine', 'Lefebvre'),
      player(5, 'Nicolas', 'Roy'),
      player(6, 'Charles', 'Pelletier'),
      player(7, 'Philippe', 'Cote'),
      player(8, 'Alexandre', 'Fortin'),
      player(9, 'Guillaume', 'Morin'),
      player(10, 'Julien', 'Lavoie'),
      player(11, 'Dominic', 'Cloutier'),
      player(12, 'Marc', 'Bergeron'),
      player(13, 'Vincent', 'Lemieux'),
      player(14, 'Cedric', 'Desjardins'),
      player(15, 'Olivier', 'Girard'),
    ],
  },
  {
    name: 'Montreal Mariniers',
    short: 'MTL',
    division: 'Platinum',
    roster: [
      player(1, 'Pascal', 'Renaud'),
      player(2, 'Xavier', 'Leduc'),
      player(3, 'Simon', 'Harvey'),
      player(4, 'David', 'Brunet'),
      player(5, 'Frederic', 'Nadeau'),
      player(6, 'Cedrik', 'Poirier'),
      player(7, 'Louis', 'Perreault'),
      player(8, 'Jean-Sebastien', 'Hebert'),
      player(9, 'Maxime', 'Blais'),
      player(10, 'Patrick', 'Dion'),
      player(11, 'Hugo', 'Lachance'),
      player(12, 'Keven', 'Bourque'),
      player(13, 'Karl', 'Gervais'),
      player(14, 'Francis', 'Paquette'),
      player(15, 'Remi', 'Thibault'),
    ],
  },
  {
    name: 'Ottawa Tritons',
    short: 'OTT',
    division: 'Platinum',
    roster: [
      player(1, 'Daniel', 'Mercer'),
      player(2, 'Connor', 'Walsh'),
      player(3, 'Ethan', 'Boyle'),
      player(4, 'Liam', 'Reid'),
      player(5, 'Ryan', 'Forbes'),
      player(6, 'Sean', 'McCarthy'),
      player(7, 'Aidan', 'Brennan'),
      player(8, 'Mason', 'Clarke'),
      player(9, 'Owen', 'Fisher'),
      player(10, 'Noah', 'Gillespie'),
      player(11, 'Declan', 'Murray'),
      player(12, 'Caleb', 'Irwin'),
      player(13, 'Tyler', 'Dawson'),
      player(14, 'Dylan', 'Fraser'),
      player(15, 'Luke', 'Holland'),
    ],
  },
  {
    name: 'Toronto Steam',
    short: 'TOR',
    division: 'Platinum',
    roster: [
      player(1, 'Brandon', 'Kerr'),
      player(2, 'Jordan', 'Patel'),
      player(3, 'Adrian', 'Singh'),
      player(4, 'Corey', 'Martin'),
      player(5, 'Trevor', 'Lewis'),
      player(6, 'Victor', 'Bennett'),
      player(7, 'Jason', 'Lopez'),
      player(8, 'Mitchell', 'Cole'),
      player(9, 'Graham', 'James'),
      player(10, 'Marcus', 'Young'),
      player(11, 'Shane', 'Miller'),
      player(12, 'Anthony', 'Price'),
      player(13, 'Derek', 'Scott'),
      player(14, 'Justin', 'Ward'),
      player(15, 'Kyle', 'Roberts'),
    ],
  },
  {
    name: 'Laval Rapids',
    short: 'LAV',
    division: 'Gold',
    roster: [
      player(1, 'Mathis', 'Savard'),
      player(2, 'Felix', 'Boucher'),
      player(3, 'Jerome', 'Turcotte'),
      player(4, 'Alexis', 'Roux'),
      player(5, 'Samuel', 'Tardif'),
      player(6, 'Martin', 'Boutin'),
      player(7, 'Loic', 'Parent'),
      player(8, 'Henri', 'Masse'),
      player(9, 'Tommy', 'Giroux'),
      player(10, 'Jonathan', 'Racine'),
      player(11, 'Stephane', 'Lalonde'),
      player(12, 'Bruno', 'Rioux'),
      player(13, 'Cyril', 'Marchand'),
      player(14, 'Mikael', 'Charron'),
      player(15, 'Yannick', 'Dube'),
    ],
  },
  {
    name: 'Quebec Nordiques Masters',
    short: 'QNM',
    division: 'Gold',
    roster: [
      player(1, 'Renaud', 'Guillemette'),
      player(2, 'Cedric', 'Boivin'),
      player(3, 'Alex', 'Piche'),
      player(4, 'Francois', 'Belley'),
      player(5, 'Dominique', 'Caron'),
      player(6, 'Tristan', 'Michaud'),
      player(7, 'Vincent', 'Demers'),
      player(8, 'Pier-Luc', 'Trempe'),
      player(9, 'Emile', 'Lebel'),
      player(10, 'Nicolas', 'Vezina'),
      player(11, 'Simon', 'Dallaire'),
      player(12, 'Luc', 'Lacroix'),
      player(13, 'Etienne', 'Briere'),
      player(14, 'Maxence', 'Bazin'),
      player(15, 'Antoine', 'Tanguay'),
    ],
  },
  {
    name: 'Sherbrooke Cascades',
    short: 'SHR',
    division: 'Gold',
    roster: [
      player(1, 'Cedrick', 'Bolduc'),
      player(2, 'Gabriel', 'St-Pierre'),
      player(3, 'Thomas', 'Gilbert'),
      player(4, 'Olivier', 'Lussier'),
      player(5, 'Raphael', 'Houde'),
      player(6, 'Jules', 'Cayer'),
      player(7, 'William', 'Arsenault'),
      player(8, 'Jonathan', 'Valliere'),
      player(9, 'Brice', 'Fortier'),
      player(10, 'Leo', 'Bisson'),
      player(11, 'Marc-Antoine', 'Goulet'),
      player(12, 'Alexandre', 'Robert'),
      player(13, 'Joel', 'Allard'),
      player(14, 'Eric', 'Ruel'),
      player(15, 'Dominik', 'Bibeau'),
    ],
  },
  {
    name: 'Gatineau Voyageurs',
    short: 'GAT',
    division: 'Gold',
    roster: [
      player(1, 'Mathieu', 'Beaudoin'),
      player(2, 'Nicolas', 'Brault'),
      player(3, 'Julien', 'Pilon'),
      player(4, 'Jeremie', 'Rivard'),
      player(5, 'Maxime', 'Guay'),
      player(6, 'Alexandre', 'Hamelin'),
      player(7, 'Charles', 'Sicard'),
      player(8, 'Lucas', 'Laplante'),
      player(9, 'Simon', 'Belisle'),
      player(10, 'David', 'Lepage'),
      player(11, 'Jerome', 'Leduc'),
      player(12, 'Benoit', 'Valois'),
      player(13, 'Jean-Francois', 'Parisien'),
      player(14, 'Kevin', 'Trempe'),
      player(15, 'Francis', 'Lafrance'),
    ],
  },
  {
    name: 'Halifax Harbour',
    short: 'HAL',
    division: 'Silver',
    roster: [
      player(1, 'Cameron', 'Ross'),
      player(2, 'Gavin', 'MacLeod'),
      player(3, 'Ian', 'Sullivan'),
      player(4, 'Colin', 'Doyle'),
      player(5, 'Avery', 'Parker'),
      player(6, 'Elliot', 'Grant'),
      player(7, 'Nate', 'Campbell'),
      player(8, 'Logan', 'Fraser'),
      player(9, 'Ty', 'Murphy'),
      player(10, 'Ben', 'McNeil'),
      player(11, 'Craig', 'MacDonald'),
      player(12, 'Troy', 'Hopkins'),
      player(13, 'Spencer', 'Cochrane'),
      player(14, 'Adam', 'Rutledge'),
      player(15, 'Mitchell', 'Perry'),
    ],
  },
  {
    name: 'Vancouver Orcas',
    short: 'VAN',
    division: 'Silver',
    roster: [
      player(1, 'Tyson', 'Wong'),
      player(2, 'Evan', 'Chu'),
      player(3, 'Jordan', 'Kwan'),
      player(4, 'Brayden', 'Lim'),
      player(5, 'Marcus', 'Yuen'),
      player(6, 'Noel', 'Park'),
      player(7, 'Kevin', 'Ho'),
      player(8, 'Alec', 'Leung'),
      player(9, 'Miles', 'Chen'),
      player(10, 'Darren', 'Liu'),
      player(11, 'Reid', 'Sandhu'),
      player(12, 'Trey', 'Poon'),
      player(13, 'Jason', 'Ng'),
      player(14, 'Colby', 'Tam'),
      player(15, 'Scott', 'Ip'),
    ],
  },
  {
    name: 'Calgary Mavericks',
    short: 'CAL',
    division: 'Silver',
    roster: [
      player(1, 'Brett', 'Sinclair'),
      player(2, 'Tyson', 'Hughes'),
      player(3, 'Cole', 'Jamieson'),
      player(4, 'Parker', 'Dunn'),
      player(5, 'Rylan', 'Peters'),
      player(6, 'Carter', 'Dixon'),
      player(7, 'Rhett', 'Morrison'),
      player(8, 'Jaxon', 'Sharp'),
      player(9, 'Odin', 'McKay'),
      player(10, 'Sawyer', 'Noble'),
      player(11, 'Landon', 'Reimer'),
      player(12, 'Mack', 'Bishop'),
      player(13, 'Hayden', 'Currie'),
      player(14, 'Briggs', 'Yates'),
      player(15, 'Devon', 'Sheppard'),
    ],
  },
  {
    name: 'Edmonton Ice',
    short: 'EDM',
    division: 'Silver',
    roster: [
      player(1, 'Wes', 'Hawkins'),
      player(2, 'Brandon', 'Elliott'),
      player(3, 'Tanner', 'Berg'),
      player(4, 'Colton', 'Schaefer'),
      player(5, 'Dawson', 'Neufeld'),
      player(6, 'Gage', 'Keller'),
      player(7, 'Mason', 'Schultz'),
      player(8, 'Kade', 'Bauman'),
      player(9, 'Griffin', 'Klein'),
      player(10, 'Liam', 'Krause'),
      player(11, 'Trevor', 'Wolfe'),
      player(12, 'Austin', 'Friesen'),
      player(13, 'Jay', 'Snyder'),
      player(14, 'Riley', 'Grau'),
      player(15, 'Cody', 'Meyer'),
    ],
  },
];

const hydresTeam = teamCatalog.find(team => team.name === 'Hydres Quebec');

function game(id, gameNum, opponent, time, dateInfo, location, pool, cap) {
  return {
    id,
    gameNum,
    opponent,
    time,
    dateISO: dateInfo.iso,
    date: dateInfo.label,
    location,
    pool,
    cap,
  };
}

const tournament = {
  clubId: CLUB_ID,
  id: 'hydres-masters-showcase-2026',
  name: 'Hydres Quebec Masters Showcase',
  subtitle: 'Masters - 12 Teams - Platinum / Gold / Silver',
  singleTeam: true,
  location: "PEPS de l'Universite Laval",
  address: '2300 Rue de la Terrasse, Quebec, QC G1V 0A6, Canada',
  dates: 'April 24-26, 2026',
  pool: 'Masters',
  scoringPassword: SCORING_PASSWORD,
  comingSoon: '',
  clockSettings: {
    quarterMins: 7,
    breakMins: 2,
    halftimeMins: 3,
    timeoutsPerTeam: 2,
    timeoutLengths: [1, 1],
  },
  games: [
    game('hyd-g1', 'G1', 'Montreal Mariniers', '8:00 AM', day1, 'Competition Pool A', 'Masters Platinum Crossover', 'White'),
    game('hyd-g2', 'G2', 'Ottawa Tritons', '12:10 PM', day1, 'Competition Pool A', 'Masters Platinum Crossover', 'Dark'),
    game('hyd-g3', 'G3', 'Toronto Steam', '5:40 PM', day1, 'Championship Pool', 'Masters Platinum Crossover', 'White'),
    game('hyd-g4', 'G4', 'Laval Rapids', '8:30 AM', day2, 'Competition Pool B', 'Power Pool Round 2', 'Dark'),
    game('hyd-g5', 'G5', 'Quebec Nordiques Masters', '1:00 PM', day2, 'Championship Pool', 'Power Pool Round 2', 'White'),
    game('hyd-g6', 'G6', 'Sherbrooke Cascades', '6:20 PM', day2, 'Competition Pool B', 'Power Pool Round 2', 'Dark'),
    game('hyd-g7', 'QF1', 'Platinum Seed #4', '8:00 AM', day3, 'Championship Pool', 'Platinum Quarterfinal', 'White'),
    game('hyd-g8', 'SF1', 'Winner Platinum QF2', '1:10 PM', day3, 'Championship Pool', 'Platinum Semifinal', 'Dark'),
    game('hyd-g9', 'F1', 'Winner Platinum SF2', '6:00 PM', day3, 'Championship Pool', 'Platinum Final', 'White'),
  ],
  bracket: {
    paths: [
      {
        id: 'masters-platinum',
        label: 'Platinum Bracket',
        qualifier: 'Top 4 after six preliminary games',
        qualifyMinWins: 4,
        steps: [
          { gameNum: 'QF1', desc: 'Platinum Quarterfinal', dateISO: day3.iso, date: day3.label, time: '8:00 AM', location: 'Championship Pool' },
          { gameNum: 'SF1', desc: 'Platinum Semifinal', dateISO: day3.iso, date: day3.label, time: '1:10 PM', location: 'Championship Pool' },
          { gameNum: 'F1', desc: 'Platinum Final', dateISO: day3.iso, date: day3.label, time: '6:00 PM', location: 'Championship Pool' },
        ],
      },
      {
        id: 'masters-gold',
        label: 'Gold Bracket',
        qualifier: 'Seeds 5-8 after six preliminary games',
        qualifyMinWins: 2,
        qualifyMaxWins: 3,
        steps: [
          { gameNum: 'QF-G1', desc: 'Gold Quarterfinal', dateISO: day3.iso, date: day3.label, time: '9:20 AM', location: 'Competition Pool A' },
          { gameNum: 'SF-G1', desc: 'Gold Semifinal', dateISO: day3.iso, date: day3.label, time: '2:20 PM', location: 'Competition Pool A' },
          { gameNum: 'GF1', desc: 'Gold Final', dateISO: day3.iso, date: day3.label, time: '5:00 PM', location: 'Competition Pool A' },
        ],
      },
      {
        id: 'masters-silver',
        label: 'Silver Bracket',
        qualifier: 'Seeds 9-12 after six preliminary games',
        qualifyMaxWins: 1,
        steps: [
          { gameNum: 'QF-S1', desc: 'Silver Quarterfinal', dateISO: day3.iso, date: day3.label, time: '10:30 AM', location: 'Competition Pool B' },
          { gameNum: 'SF-S1', desc: 'Silver Semifinal', dateISO: day3.iso, date: day3.label, time: '3:10 PM', location: 'Competition Pool B' },
          { gameNum: 'SFIN', desc: 'Silver Final', dateISO: day3.iso, date: day3.label, time: '4:30 PM', location: 'Competition Pool B' },
        ],
      },
    ],
  },
};

const payload = {
  clubId: CLUB_ID,
  clubName: CLUB_NAME,
  clubSettings: {
    clubType: 'club',
    primaryColor: '#000000',
    secondaryColor: '#ffde00',
    headerStyle: 'default',
    enableMasters: true,
    mastersOnly: true,
    singleMastersTeam: true,
  },
  teamKey: TEAM_KEY,
  tournament,
  history: [],
  roster: hydresTeam.roster,
  allTeams: teamCatalog.map(team => ({
    name: team.name,
    short: team.short,
    division: team.division,
    roster: team.roster,
  })),
};

async function api(method, pathName, password, body) {
  const res = await fetch(`${WORKER}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${pathName} failed: ${res.status} ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function deploy(password) {
  const teamQuery = `?team=${encodeURIComponent(TEAM_KEY)}&club=${encodeURIComponent(CLUB_ID)}`;
  const clubQuery = `?club=${encodeURIComponent(CLUB_ID)}`;
  await api('PUT', `/admin/club-settings${clubQuery}`, password, {
    clubName: CLUB_NAME,
    ...payload.clubSettings,
  });
  await api('PUT', `/admin/roster${teamQuery}`, password, { roster: payload.roster });
  await api('PUT', `/admin/data${teamQuery}`, password, {
    tournament: payload.tournament,
    history: payload.history,
  });
  await api('POST', `/admin/deploy${teamQuery}`, password, {});
}

async function verify() {
  const teamDataUrl = `${WORKER}/team-data?team=${encodeURIComponent(TEAM_KEY)}&club=${encodeURIComponent(CLUB_ID)}`;
  const clubInfoUrl = `${WORKER}/club-info?club=${encodeURIComponent(CLUB_ID)}`;
  const [teamRes, clubRes] = await Promise.all([fetch(teamDataUrl), fetch(clubInfoUrl)]);
  if (!teamRes.ok) throw new Error(`GET team-data failed: ${teamRes.status}`);
  if (!clubRes.ok) throw new Error(`GET club-info failed: ${clubRes.status}`);
  const teamData = await teamRes.json();
  const clubInfo = await clubRes.json();
  return {
    teamData,
    clubInfo,
  };
}

async function main() {
  const password = process.argv[2] || process.env.ADMIN_PASSWORD || '';
  const outPath = path.join(__dirname, '..', 'hydres-quebec-test-tournament.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  if (process.argv.includes('--write-only')) {
    console.log(`Wrote ${outPath}`);
    return;
  }
  if (!password) {
    throw new Error('Missing admin password');
  }

  await deploy(password);
  const verification = await verify();
  console.log(JSON.stringify({
    ok: true,
    wrote: outPath,
    tournamentId: payload.tournament.id,
    scoringPassword: SCORING_PASSWORD,
    games: payload.tournament.games.length,
    rosterPlayers: payload.roster.length,
    allTeams: payload.allTeams.length,
    verify: {
      clubName: verification.clubInfo.clubName,
      enableMasters: verification.clubInfo.enableMasters,
      mastersOnly: verification.clubInfo.mastersOnly,
      tournamentName: verification.teamData.tournament?.name,
      tournamentDates: verification.teamData.tournament?.dates,
      rosterPlayers: verification.teamData.tournament?.roster?.length || 0,
      gameCount: verification.teamData.tournament?.games?.length || 0,
    },
  }, null, 2));
}

main().catch(err => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
