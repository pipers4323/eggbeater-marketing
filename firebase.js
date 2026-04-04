/**
 * firebase.js — Eggbeater Water Polo
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 1: Google Sign-In + cross-device preferences sync
 *          Parents sign in once → My Players & age group picks sync to every
 *          device they own automatically, via Firestore.
 *
 * Phase 2: Live tournament data via Firestore onSnapshot
 *          Admin saves scores / bracket / roster → all parent devices update
 *          in real-time without a page refresh.
 *
 * NOTHING IS DELETED — localStorage remains the fallback for signed-out users
 * and for offline use.  Firebase is purely additive.
 *
 * ── FIRST-TIME SETUP (do this once) ─────────────────────────────────────────
 *  1. Go to console.firebase.google.com
 *  2. "Add project" → name it (e.g. "eggbeater-wp") → continue
 *  3. Project Settings (gear icon) → General → "Your apps" → Add app → Web (</>)
 *       App nickname: Eggbeater  (don't need Firebase Hosting)
 *  4. Copy the firebaseConfig object that appears → paste values into
 *     FIREBASE_CONFIG below
 *  5. Authentication → Sign-in method → Google → Enable → Save
 *  6. Authentication → Settings → Authorized domains → Add:
 *       eggbeater.app   (and localhost for testing)
 *  7. Firestore Database → Create database → Start in TEST MODE → pick region
 *  8. Firestore → Rules → replace the default with these rules, then Publish:
 *
 *     rules_version = '2';
 *     service cloud.firestore {
 *       match /databases/{database}/documents {
 *         // Each parent can only read/write their own preferences
 *         match /users/{uid}/prefs/{doc} {
 *           allow read, write: if request.auth != null && request.auth.uid == uid;
 *         }
 *         // Tournament data (flat — Phase 2 backward compat)
 *         match /tournaments/{teamKey} {
 *           allow read:  if true;
 *           allow write: if request.auth != null;
 *         }
 *         // Phase 3: Multi-club / multi-tournament structure
 *         match /clubs/{clubId} {
 *           allow read: if true;
 *           // Only club admins can write to the club doc
 *           allow create: if request.auth != null;
 *           allow update, delete: if request.auth != null
 *             && request.auth.uid in resource.data.adminUIDs;
 *           match /tournaments/{tournamentId} {
 *             allow read: if true;
 *             allow write: if request.auth != null
 *               && request.auth.uid in
 *                  get(/databases/$(database)/documents/clubs/$(clubId)).data.adminUIDs;
 *           }
 *         }
 *       }
 *     }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── YOUR FIREBASE CONFIG — replace all values from Step 4 above ───────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyALS7O7coExR8-7VPDBMMA0Hp6dhoe-zQg',
  authDomain:        'eggbeater-wp.firebaseapp.com',
  projectId:         'eggbeater-wp',
  storageBucket:     'eggbeater-wp.firebasestorage.app',
  messagingSenderId: '511455199636',
  appId:             '1:511455199636:web:deef46fd0f49a1fcb40f81',
  measurementId:     'G-2LF1TFFNV9',
};

// ── Internal state ────────────────────────────────────────────────────────────
let _fbAuth = null;
let _fbDb   = null;
let _fbUser = null;
const _tournamentListeners = {};   // teamKey → unsubscribe function

// ── Whether Firebase is ready to use ─────────────────────────────────────────
function fbReady() { return !!_fbAuth && !!_fbDb; }

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

function fbInit() {
  if (_fbAuth) return;                          // already initialized
  if (typeof firebase === 'undefined') {
    console.warn('[firebase] SDK not loaded — offline mode');
    return;
  }
  // Don't init if config is still placeholder
  if (FIREBASE_CONFIG.apiKey === 'REPLACE_WITH_YOUR_API_KEY') {
    console.info('[firebase] Config not filled in yet — running without Firebase');
    _fbUpdateAuthUI(null);
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _fbAuth = firebase.auth();
    _fbDb   = firebase.firestore();

    _fbAuth.onAuthStateChanged(user => {
      _fbUser = user;
      _onFbAuthChange(user);
    });

    // Pre-initialize native SocialLogin plugin if on Capacitor
    if (_isCapacitorNative()) _initSocialLogin();

    // Reveal the auth button now that Firebase is ready
    const btn = document.getElementById('fb-auth-btn');
    if (btn) btn.classList.remove('hidden');

    console.info('[firebase] ready ✓');
  } catch (e) {
    console.warn('[firebase] init error:', e.message);
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

/** Detect if running inside a Capacitor native WebView */
function _isCapacitorNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

/** Get the SocialLogin plugin (Capacitor 8) */
function _getSocialLoginPlugin() {
  try {
    if (window.Capacitor && window.Capacitor.Plugins) {
      return window.Capacitor.Plugins.SocialLogin;
    }
  } catch (e) {
    console.warn('[firebase] Could not access SocialLogin plugin:', e.message);
  }
  return null;
}

/** Initialize the SocialLogin plugin (call once on app start) */
let _socialLoginInitialized = false;
async function _initSocialLogin() {
  if (_socialLoginInitialized) return;
  const plugin = _getSocialLoginPlugin();
  if (!plugin) return;
  try {
    await plugin.initialize({
      google: {
        iOSClientId: '511455199636-35l7ilb7m2ehiveg91ho5lvgo6034fht.apps.googleusercontent.com',
        webClientId: '511455199636-t7nimg31inbjp165p29tj0orm6v9oh8t.apps.googleusercontent.com',
        iOSServerClientId: '511455199636-t7nimg31inbjp165p29tj0orm6v9oh8t.apps.googleusercontent.com',
        mode: 'online',
      },
    });
    _socialLoginInitialized = true;
    console.info('[firebase] SocialLogin plugin initialized ✓');
  } catch (e) {
    console.warn('[firebase] SocialLogin init error:', e.message);
  }
}

async function fbSignIn() {
  if (!_fbAuth) return;

  if (_isCapacitorNative()) {
    // ── Native iOS: use SocialLogin plugin for native Google Sign-In ─────
    // This opens the native Google Sign-In UI (NOT a WebView),
    // which Google allows. Returns an ID token we pass to Firebase.
    try {
      await _initSocialLogin();
      const plugin = _getSocialLoginPlugin();
      if (!plugin) {
        if (typeof showToast === 'function') showToast('Sign-in not available on this device', 'error');
        return;
      }
      const result = await plugin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile'],
        },
      });
      console.info('[firebase] Native Google sign-in result:', JSON.stringify(result).substring(0, 200));

      // Extract the ID token from the native sign-in result
      const idToken = result && result.result && result.result.idToken;
      if (!idToken) {
        console.error('[firebase] No ID token in native sign-in result');
        if (typeof showToast === 'function') showToast('Sign-in failed — no token received', 'error');
        return;
      }

      // Use the ID token to sign in with Firebase.
      // On iOS: WKWebView sends Referer: capacitor://localhost which Firebase blocks.
      // The fetch interceptor can't suppress browser Referer headers, so we proxy
      // through our CF Worker — the server call has no browser Referer.
      // On Android: window.location is http://localhost which Firebase allows.
      const isIOS = window.Capacitor?.getPlatform?.() === 'ios';
      if (isIOS) {
        // Worker verifies Google token, mints Firebase custom token (no Referer issue)
        const workerUrl = typeof PUSH_SERVER_URL !== 'undefined'
          ? PUSH_SERVER_URL : 'https://ebwp-push.sarah-new.workers.dev';
        const resp = await fetch(`${workerUrl}/google-sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const { customToken, error } = await resp.json();
        if (error || !customToken) throw new Error(error || 'Worker sign-in failed');
        await _fbAuth.signInWithCustomToken(customToken);
        console.info('[firebase] Signed in via Worker custom token ✓');
      } else {
        // Android: signInWithCredential works (http://localhost is whitelisted)
        const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
        await _fbAuth.signInWithCredential(credential);
        console.info('[firebase] Signed in via native Google ✓');
      }
    } catch (e) {
      console.error('[firebase] Native sign-in error:', e);
      if (e.message && !e.message.includes('cancel')) {
        if (typeof showToast === 'function') showToast('Sign-in failed — ' + e.message, 'error');
      }
    }
  } else {
    // ── Web browser: popup works fine ────────────────────────────────────
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');
    try {
      const result = await _fbAuth.signInWithPopup(provider);
      _fbCaptureCalToken(result);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        if (typeof showToast === 'function') showToast('Sign-in failed — ' + e.message, 'error');
      }
    }
  }
}

/** Capture the Google OAuth calendar token from a sign-in result */
function _fbCaptureCalToken(result) {
  const calToken = result && result.credential ? result.credential.accessToken : null;
  if (calToken && typeof state !== 'undefined') {
    state.accessToken = calToken;
    state.tokenExpiry = Date.now() + 50 * 60 * 1000; // 50 min (conservative)
    if (typeof updateSyncBadge === 'function' && state.selectedCalId) updateSyncBadge('ok');
  }
}

async function fbSignOut() {
  if (!_fbAuth) return;
  try {
    await _fbAuth.signOut();
    if (typeof showToast === 'function') showToast('Signed out');
  } catch (e) {
    console.warn('[firebase] sign-out error:', e.message);
  }
}

function fbIsSignedIn() { return !!_fbUser; }
function fbGetUser()    { return _fbUser;   }

/** Get a Firebase ID token for the current user (for Worker API auth). */
async function fbGetIdToken(forceRefresh) {
  if (!_fbUser) return null;
  try { return await _fbUser.getIdToken(!!forceRefresh); }
  catch (e) { console.warn('[firebase] getIdToken error:', e.message); return null; }
}

/**
 * Check if the current user is an admin for the given club.
 * Reads clubs/{clubId}.adminUIDs from Firestore.
 * Returns { isAdmin: bool, isSuperAdmin: bool, clubName: string }.
 */
async function fbCheckAdminAccess(clubId) {
  if (!fbReady() || !_fbUser) return { isAdmin: false, isSuperAdmin: false, clubName: '' };
  try {
    const doc = await _fbDb.collection('clubs').doc(clubId).get();
    if (!doc.exists) return { isAdmin: false, isSuperAdmin: false, clubName: '' };
    const data = doc.data();
    const adminUIDs = data.adminUIDs || [];
    const superAdminUIDs = data.superAdminUIDs || [];
    return {
      isAdmin:      adminUIDs.includes(_fbUser.uid) || superAdminUIDs.includes(_fbUser.uid),
      isSuperAdmin: superAdminUIDs.includes(_fbUser.uid),
      clubName:     data.name || '',
    };
  } catch (e) {
    console.warn('[firebase] fbCheckAdminAccess error:', e.message);
    return { isAdmin: false, isSuperAdmin: false, clubName: '' };
  }
}

/**
 * Add an admin UID to a club's adminUIDs list in Firestore.
 */
async function fbAddClubAdmin(clubId, uid) {
  if (!fbReady()) return false;
  try {
    const ref = _fbDb.collection('clubs').doc(clubId);
    const doc = await ref.get();
    if (!doc.exists) return false;
    const uids = doc.data().adminUIDs || [];
    if (uids.includes(uid)) return true; // already an admin
    uids.push(uid);
    await ref.update({ adminUIDs: uids });
    return true;
  } catch (e) {
    console.warn('[firebase] fbAddClubAdmin error:', e.message);
    return false;
  }
}

/**
 * Remove an admin UID from a club's adminUIDs list.
 */
async function fbRemoveClubAdmin(clubId, uid) {
  if (!fbReady()) return false;
  try {
    const ref = _fbDb.collection('clubs').doc(clubId);
    const doc = await ref.get();
    if (!doc.exists) return false;
    const uids = (doc.data().adminUIDs || []).filter(u => u !== uid);
    await ref.update({ adminUIDs: uids });
    return true;
  } catch (e) {
    console.warn('[firebase] fbRemoveClubAdmin error:', e.message);
    return false;
  }
}

/**
 * List all clubs (for super-admin club selector).
 */
async function fbListClubs() {
  if (!fbReady()) return [];
  try {
    const snap = await _fbDb.collection('clubs').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[firebase] fbListClubs error:', e.message);
    return [];
  }
}

// ── Auth state change handler ─────────────────────────────────────────────────
async function _onFbAuthChange(user) {
  _fbUpdateAuthUI(user);
  // Reset GIS token client so login_hint picks up the newly signed-in email
  if (typeof state !== 'undefined' && state.tokenClient) state.tokenClient = null;
  if (user) {
    await fbLoadPrefs();
    if (typeof showToast === 'function') showToast('☁️ Preferences synced across devices');
    // Silently refresh calendar token on page reload if a calendar was previously connected
    _fbTrySilentCalendarRefresh();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PREFS  (Phase 1)
// Saves/loads My Players selections and chosen age groups to Firestore
// so parents see the same picks on every device they use.
// ─────────────────────────────────────────────────────────────────────────────

async function fbSavePrefs() {
  if (!fbReady() || !_fbUser) return;
  try {
    const prefs = {
      myPlayers:    (typeof getMyPlayers    === 'function') ? getMyPlayers()    : [],
      selectedTeams:(typeof getSelectedTeams=== 'function') ? getSelectedTeams(): [],
      favGroups:    (typeof getFavGroups    === 'function') ? getFavGroups()    : [],
      savedAt:      new Date().toISOString(),
    };
    await _fbDb.doc(`users/${_fbUser.uid}/prefs/main`).set(prefs);
  } catch (e) {
    console.warn('[firebase] fbSavePrefs error:', e.message);
  }
}

async function fbLoadPrefs() {
  if (!fbReady() || !_fbUser) return;
  try {
    const snap = await _fbDb.doc(`users/${_fbUser.uid}/prefs/main`).get();
    if (!snap.exists) return;
    const data = snap.data();

    // Apply cloud prefs — cloud wins (they were saved from the user's last device)
    let changed = false;
    if (Array.isArray(data.myPlayers) && data.myPlayers.length) {
      if (typeof saveMyPlayers === 'function') { saveMyPlayers(data.myPlayers); changed = true; }
    }
    if (Array.isArray(data.selectedTeams) && data.selectedTeams.length) {
      if (typeof setSelectedTeams === 'function') { setSelectedTeams(data.selectedTeams); changed = true; }
    }
    if (Array.isArray(data.favGroups)) {
      if (typeof setFavGroups === 'function') { setFavGroups(data.favGroups); changed = true; }
    }
    // Re-render only if something actually changed
    if (changed) {
      if (typeof renderRosterTab  === 'function') renderRosterTab();
      if (typeof renderTeamPicker === 'function') renderTeamPicker();
    }
  } catch (e) {
    console.warn('[firebase] fbLoadPrefs error:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE TOURNAMENT DATA  (Phase 2)
// Admin saves → Firestore → onSnapshot fires on every parent device → re-render
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start listening to a team's tournament document.
 * Calling again with the same key stops the old listener first (safe to call on every load).
 */
function fbListenToTournament(teamKey) {
  if (!fbReady()) return;

  // Stop any existing listener for this key
  if (_tournamentListeners[teamKey]) {
    _tournamentListeners[teamKey]();
    delete _tournamentListeners[teamKey];
  }

  // Use club-scoped collection so listeners match the deployed data path
  const col = _fbTournamentsCol();
  if (!col) return;

  _tournamentListeners[teamKey] = col
    .doc(teamKey)
    .onSnapshot(snap => {
      if (!snap.exists) return;
      const data = snap.data();
      if (!data || !data.tournament) return;

      // Never let Firestore overwrite a KV-deployed Stay Tuned placeholder
      if (typeof TEAM_CACHE !== 'undefined' && TEAM_CACHE[teamKey] &&
          TEAM_CACHE[teamKey].tournament && TEAM_CACHE[teamKey].tournament.stayTuned) {
        console.info('[firebase] Ignoring Firestore snapshot for', teamKey, '— Stay Tuned placeholder active');
        return;
      }

      // Update TEAM_CACHE so multi-team rendering picks up the fresh data
      if (typeof TEAM_CACHE !== 'undefined') {
        TEAM_CACHE[teamKey] = {
          tournament: data.tournament,
          history:    data.history || [],
        };
      }

      // If this is the primary selected team, update the global TOURNAMENT
      const isPrimary = (typeof getSelectedTeam === 'function')
        ? getSelectedTeam() === teamKey
        : true;

      if (isPrimary) {
        window.TOURNAMENT   = data.tournament;
        window.HISTORY_SEED = data.history || [];
      }

      // Re-render all tabs that depend on tournament data
      if (typeof renderHeader       === 'function') renderHeader();
      if (typeof renderScheduleTab  === 'function') renderScheduleTab();
      if (typeof renderScoresTab    === 'function') renderScoresTab();
      if (typeof renderPossibleTab  === 'function') renderPossibleTab();
      if (typeof renderHistoryTab   === 'function') renderHistoryTab();
      if (typeof renderRosterTab    === 'function') renderRosterTab();
      if (typeof updateLiveDot      === 'function') updateLiveDot();
    }, err => {
      console.warn('[firebase] tournament listener error for', teamKey, ':', err.message);
    });
}

/** Stop a specific team's listener (call when deselecting an age group). */
function fbStopTournamentListener(teamKey) {
  if (_tournamentListeners[teamKey]) {
    _tournamentListeners[teamKey]();
    delete _tournamentListeners[teamKey];
  }
}

/** Stop all active tournament listeners. */
function fbStopAllListeners() {
  for (const key of Object.keys(_tournamentListeners)) {
    _tournamentListeners[key]();
    delete _tournamentListeners[key];
  }
}

/**
 * Admin: mirror saved tournament data to Firestore.
 * Called right after the existing Cloudflare KV save in saveAndDeploy().
 * The app's onSnapshot listeners will pick up the change within ~1 second.
 *
 * @param {string} teamKey   e.g. '14u-girls'
 * @param {object} payload   { tournament, history }
 * @returns {boolean}        true on success
 */
async function fbSaveTournamentMirror(teamKey, payload) {
  if (!fbReady()) return false;
  try {
    await _fbDb.collection('tournaments').doc(teamKey).set({
      tournament: payload.tournament,
      history:    payload.history || [],
      savedAt:    new Date().toISOString(),
    });
    return true;
  } catch (e) {
    console.warn('[firebase] fbSaveTournamentMirror error:', e.message);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH UI
// Updates the sign-in / sign-out button and user badge in the header.
// ─────────────────────────────────────────────────────────────────────────────

function _fbUpdateAuthUI(user) {
  const btn      = document.getElementById('fb-auth-btn');
  const userInfo = document.getElementById('fb-user-info');
  if (!btn) return;     // UI elements not present on this page — skip silently

  if (user) {
    btn.textContent = 'Sign Out';
    btn.title       = `Signed in as ${user.email}`;
    btn.onclick     = fbSignOut;
    if (userInfo) {
      const firstName = (user.displayName || '').split(' ')[0] || '✓';
      userInfo.textContent = `☁️ ${firstName}`;
      userInfo.classList.remove('hidden');
    }
  } else {
    btn.textContent = 'Sign In';
    btn.title       = 'Sign in with Google to sync preferences across devices';
    btn.onclick     = fbSignIn;
    if (userInfo) {
      userInfo.textContent = '';
      userInfo.classList.add('hidden');
    }
  }
  // Also re-render the Settings tab if it's currently showing
  if (typeof renderSettingsTab === 'function' && typeof state !== 'undefined' && state.currentTab === 'settings') {
    renderSettingsTab();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: MULTI-TOURNAMENT / CLUB SCALE
// Firestore structure: clubs/{clubId}/tournaments/{tournamentId}
// Each tournament document holds all age groups, status, metadata.
// ─────────────────────────────────────────────────────────────────────────────

let _fbClubId = '';  // default — overridden via fbSetClubId()

/** Set the active club ID (call before any tournament operations). */
function fbSetClubId(id) { if (id) _fbClubId = id; }

/** Get the current club ID. */
function fbGetClubId() { return _fbClubId; }

/** Get reference to the club's tournaments collection */
function _fbTournamentsCol() {
  if (!fbReady()) return null;
  return _fbDb.collection('clubs').doc(_fbClubId).collection('tournaments');
}

/**
 * Load list of all tournaments for the club (lightweight metadata only).
 * Returns [{id, name, dates, status, location, createdAt, updatedAt}]
 */
async function fbLoadTournaments() {
  const col = _fbTournamentsCol();
  if (!col) return [];
  try {
    const snap = await col.orderBy('updatedAt', 'desc').get();
    return snap.docs.map(doc => {
      const d = doc.data();
      return {
        id:        doc.id,
        name:      d.name || '',
        dates:     d.dates || '',
        status:    d.status || 'upcoming',
        location:  d.location || '',
        createdAt: d.createdAt || '',
        updatedAt: d.updatedAt || '',
        ageGroupKeys: Object.keys(d.ageGroups || {}),
      };
    });
  } catch (e) {
    console.warn('[firebase] fbLoadTournaments error:', e.message);
    return [];
  }
}

/**
 * Load a single tournament's full data (all age groups).
 * Returns { id, name, dates, status, location, ageGroups: { '14u-girls': {tournament, history, roster}, ... } }
 */
async function fbLoadTournament(tournamentId) {
  const col = _fbTournamentsCol();
  if (!col) return null;
  try {
    const doc = await col.doc(tournamentId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.warn('[firebase] fbLoadTournament error:', e.message);
    return null;
  }
}

/**
 * Create a new tournament document. Returns the new document ID.
 */
async function fbCreateTournament({ name, dates, location, address, status }) {
  const col = _fbTournamentsCol();
  if (!col) return null;
  try {
    const now = new Date().toISOString();
    const ref = await col.add({
      name:      name || '',
      dates:     dates || '',
      location:  location || '',
      address:   address || '',
      status:    status || 'upcoming',
      ageGroups: {},
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  } catch (e) {
    console.warn('[firebase] fbCreateTournament error:', e.message);
    return null;
  }
}

/**
 * Save a single age group's data within a tournament.
 * Also updates tournament-level metadata.
 */
async function fbSaveTournamentAgeGroup(tournamentId, teamKey, { tournament, history, roster }) {
  const col = _fbTournamentsCol();
  if (!col) return false;
  try {
    const now = new Date().toISOString();
    const updates = {
      [`ageGroups.${teamKey}`]: { tournament, history: history || [], roster: roster || null },
      updatedAt: now,
    };
    // Also update top-level metadata from tournament data
    if (tournament?.name)     updates.name     = tournament.name;
    if (tournament?.dates)    updates.dates    = tournament.dates;
    if (tournament?.location) updates.location = tournament.location;
    if (tournament?.address)  updates.address  = tournament.address;
    await col.doc(tournamentId).update(updates);
    // Dual-write to flat path for backward compat
    await fbSaveTournamentMirror(teamKey, { tournament, history });
    return true;
  } catch (e) {
    console.warn('[firebase] fbSaveTournamentAgeGroup error:', e.message);
    return false;
  }
}

/**
 * Set a tournament's status. When activating, deactivate all others first.
 */
async function fbSetTournamentStatus(tournamentId, status) {
  const col = _fbTournamentsCol();
  if (!col) return false;
  try {
    if (status === 'active') {
      // Deactivate any currently active tournaments
      const activeSnap = await col.where('status', '==', 'active').get();
      const batch = _fbDb.batch();
      activeSnap.docs.forEach(doc => {
        if (doc.id !== tournamentId) {
          batch.update(doc.ref, { status: 'archived', updatedAt: new Date().toISOString() });
        }
      });
      batch.update(col.doc(tournamentId), { status: 'active', updatedAt: new Date().toISOString() });
      await batch.commit();
    } else {
      await col.doc(tournamentId).update({ status, updatedAt: new Date().toISOString() });
    }
    return true;
  } catch (e) {
    console.warn('[firebase] fbSetTournamentStatus error:', e.message);
    return false;
  }
}

/**
 * Delete a tournament document entirely.
 */
async function fbDeleteTournament(tournamentId) {
  const col = _fbTournamentsCol();
  if (!col) return false;
  try {
    await col.doc(tournamentId).delete();
    return true;
  } catch (e) {
    console.warn('[firebase] fbDeleteTournament error:', e.message);
    return false;
  }
}

/**
 * Listen to the club's active tournament in real-time.
 * Calls callback(tournamentDoc) whenever the active tournament changes.
 * Returns unsubscribe function.
 */
function fbListenToActiveTournament(callback) {
  const col = _fbTournamentsCol();
  if (!col) return () => {};
  return col.where('status', '==', 'active').limit(1).onSnapshot(snap => {
    if (snap.empty) { callback(null); return; }
    const doc = snap.docs[0];
    callback({ id: doc.id, ...doc.data() });
  }, err => {
    console.warn('[firebase] active tournament listener error:', err.message);
  });
}

/**
 * Ensure the club document exists with basic info.
 */
async function fbEnsureClub(clubName, adminUid) {
  if (!fbReady()) return;
  try {
    const ref = _fbDb.collection('clubs').doc(_fbClubId);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({
        name: clubName || 'My Club',
        adminUIDs: adminUid ? [adminUid] : [],
        superAdminUIDs: adminUid ? [adminUid] : [],
        createdAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('[firebase] fbEnsureClub error:', e.message);
  }
}

/**
 * Create a new club document. Returns the club ID.
 */
async function fbCreateClub(clubId, clubName, adminUid) {
  if (!fbReady()) return false;
  try {
    const ref = _fbDb.collection('clubs').doc(clubId);
    const existing = await ref.get();
    if (existing.exists) return false; // already exists
    await ref.set({
      name: clubName,
      adminUIDs: adminUid ? [adminUid] : [],
      superAdminUIDs: [],
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (e) {
    console.warn('[firebase] fbCreateClub error:', e.message);
    return false;
  }
}

/**
 * Migrate existing flat tournament data into the new club/tournament structure.
 * Reads from flat `tournaments/{teamKey}` docs, creates one club tournament.
 * Only runs if no tournaments exist in the club yet.
 */
async function fbMigrateTournaments() {
  const col = _fbTournamentsCol();
  if (!col) return null;
  try {
    // Check if club already has tournaments
    const existing = await col.limit(1).get();
    if (!existing.empty) return existing.docs[0].id; // already migrated

    // Read all flat tournament docs
    const teamKeys = ['10u-coed','12u-girls','12u-boys','14u-girls','14u-boys','16u-girls','16u-boys','18u-girls','18u-boys'];
    const ageGroups = {};
    let name = '', dates = '', location = '', address = '';
    for (const key of teamKeys) {
      try {
        const snap = await _fbDb.collection('tournaments').doc(key).get();
        if (snap.exists) {
          const d = snap.data();
          ageGroups[key] = { tournament: d.tournament || {}, history: d.history || [], roster: null };
          if (!name && d.tournament?.name) name = d.tournament.name;
          if (!dates && d.tournament?.dates) dates = d.tournament.dates;
          if (!location && d.tournament?.location) location = d.tournament.location;
          if (!address && d.tournament?.address) address = d.tournament.address;
        }
      } catch {}
    }

    if (!Object.keys(ageGroups).length) return null; // nothing to migrate

    await fbEnsureClub();
    const now = new Date().toISOString();
    const ref = await col.add({
      name, dates, location, address,
      status: 'active',
      ageGroups,
      createdAt: now,
      updatedAt: now,
    });
    console.info('[firebase] migrated existing tournament data → ', ref.id);
    return ref.id;
  } catch (e) {
    console.warn('[firebase] fbMigrateTournaments error:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SILENT CALENDAR TOKEN REFRESH
// Called after Firebase restores a session on page reload. If the parent had a
// calendar connected, attempt a silent GIS token refresh (no popup) since they
// already granted calendar scope during their original Firebase sign-in.
// ─────────────────────────────────────────────────────────────────────────────

function _fbTrySilentCalendarRefresh() {
  if (typeof state === 'undefined') return;
  if (!state.selectedCalId) return;                                // no calendar connected
  if (state.accessToken && Date.now() < state.tokenExpiry) return; // token still valid
  // Wait briefly for GIS to finish loading before attempting refresh
  const attempt = () => {
    if (!window.google?.accounts?.oauth2) return;
    if (typeof ensureTokenClient === 'function') ensureTokenClient();
    if (!state.tokenClient) return;
    // prompt:'' = no forced UI — works silently when user has already consented
    state.tokenClient.requestAccessToken({ prompt: '' });
  };
  if (window.google?.accounts?.oauth2) {
    attempt();
  } else {
    // GIS may still be loading — retry after a short delay
    setTimeout(attempt, 2000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUSH TOKEN STORAGE (APNs device tokens for native iOS push)
// Tokens stored at: clubs/{clubId}/pushTokens/{tokenHash}
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple hash for creating a Firestore-safe document ID from a device token.
 */
function _hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0; // 32-bit integer
  }
  return 'tok_' + Math.abs(hash).toString(36) + '_' + token.substring(0, 8);
}

/**
 * Save an APNs device token to Firestore with notification preferences.
 * @param {string} token   APNs device token
 * @param {object} prefs   { gameScores, scheduleChanges, tournamentAnnouncements, ageGroups[] }
 */
async function fbSavePushToken(token, prefs) {
  if (!fbReady() || !token) return false;
  const clubId = fbGetClubId();
  if (!clubId) return false;
  try {
    const tokenHash = _hashToken(token);
    const ref = _fbDb.collection('clubs').doc(clubId).collection('pushTokens').doc(tokenHash);
    await ref.set({
      token:       token,
      platform:    'ios',
      clubId:      clubId,
      userId:      _fbUser ? _fbUser.uid : null,
      ageGroups:   prefs.ageGroups || [],
      gameScores:            prefs.gameScores !== false,
      scheduleChanges:       prefs.scheduleChanges !== false,
      tournamentAnnouncements: prefs.tournamentAnnouncements !== false,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.info('[firebase] push token saved for club:', clubId);
    // Sync updated token list to Worker KV
    _syncPushTokensToWorker(clubId);
    return true;
  } catch (e) {
    console.warn('[firebase] fbSavePushToken error:', e.message);
    return false;
  }
}

/**
 * Remove a push token from Firestore (user opted out).
 */
async function fbRemovePushToken(token) {
  if (!fbReady() || !token) return false;
  const clubId = fbGetClubId();
  if (!clubId) return false;
  try {
    const tokenHash = _hashToken(token);
    await _fbDb.collection('clubs').doc(clubId).collection('pushTokens').doc(tokenHash).delete();
    console.info('[firebase] push token removed for club:', clubId);
    // Sync updated token list to Worker KV
    _syncPushTokensToWorker(clubId);
    return true;
  } catch (e) {
    console.warn('[firebase] fbRemovePushToken error:', e.message);
    return false;
  }
}

/**
 * Sync all push tokens from Firestore to the Cloudflare Worker KV.
 * The worker reads tokens from KV (fast) rather than querying Firestore.
 * Called automatically after token save/remove.
 */
async function _syncPushTokensToWorker(clubId) {
  if (!fbReady()) return;
  const cid = clubId || fbGetClubId();
  if (!cid) return;
  try {
    const snap = await _fbDb.collection('clubs').doc(cid).collection('pushTokens').get();
    const tokens = snap.docs.map(d => d.data());
    // POST to worker's sync endpoint
    const workerUrl = (typeof PUSH_SERVER_URL !== 'undefined') ? PUSH_SERVER_URL : 'https://ebwp-push.sarah-new.workers.dev';
    fetch(`${workerUrl}/sync-apns-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubId: cid, tokens }),
    }).catch(() => {}); // fire-and-forget
  } catch (e) {
    console.warn('[firebase] _syncPushTokensToWorker error:', e.message);
  }
}
