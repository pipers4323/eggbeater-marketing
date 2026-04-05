/**
 * live-update.js — Android 16 Live Update Bridge
 * ────────────────────────────────────────────────
 * Bridges Capacitor's LiveUpdate native plugin to the Eggbeater web layer.
 * Targets Android 16 (API 36) Status Bar chips.
 */

(function () {
  'use strict';

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  function getPlugin() {
    try {
      // Primary: Capacitor bridge populates Plugins for registered native plugins
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LiveUpdate) {
        return window.Capacitor.Plugins.LiveUpdate;
      }
      // Fallback: call nativePromise directly (bypasses Plugins object lookup)
      // Works even if the plugin doesn't appear in window.Capacitor.Plugins
      if (window.Capacitor && typeof window.Capacitor.nativePromise === 'function') {
        _dbg('using nativePromise fallback');
        return {
          startLiveUpdate:  (o) => window.Capacitor.nativePromise('LiveUpdate', 'startLiveUpdate',  o || {}),
          updateLiveUpdate: (o) => window.Capacitor.nativePromise('LiveUpdate', 'updateLiveUpdate', o || {}),
          stopLiveUpdate:   (o) => window.Capacitor.nativePromise('LiveUpdate', 'stopLiveUpdate',   o || {}),
        };
      }
      // Last resort: log what IS in Plugins for diagnostics
      if (window.Capacitor && window.Capacitor.Plugins) {
        _dbg('Plugins keys: ' + Object.keys(window.Capacitor.Plugins).join(','));
      }
    } catch (e) {
      _dbg('getPlugin error: ' + e.message);
    }
    return null;
  }

  // Request POST_NOTIFICATIONS permission on Android 13+ (one-time, in-context)
  let _permRequested = false;
  async function _ensureNotifPermission() {
    if (_permRequested) return;
    _permRequested = true;
    try {
      if (!isNative()) return;
      if (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'android') return;
      const push = window.Capacitor?.Plugins?.PushNotifications;
      if (push) {
        const result = await push.requestPermissions();
        console.info('[live-update] POST_NOTIFICATIONS permission:', result?.receive);
      }
    } catch (e) {
      console.warn('[live-update] Permission request failed:', e.message);
    }
  }

  /**
   * Sync the current live game state to the native Android 16 Status Chip.
   * @param {string} gameId
   * @param {object} score - { team, opp, clock, period, gameState }
   */
  async function sync(gameId, score) {
    if (!isNative()) return;
    await _ensureNotifPermission();
    const plugin = getPlugin();
    if (!plugin) return;

    // Stop chip if game is not active
    if (!score || score.gameState === 'pre' || score.gameState === 'final'
        || score.gameState === 'so_w' || score.gameState === 'so_l') {
      try { await plugin.stopLiveUpdate(); } catch {}
      return;
    }

    // Use server-supplied team/opp names so both scorer and viewer see real names
    const teamLabel = score.teamName || (typeof getActiveTeamLabel === 'function' ? getActiveTeamLabel() : '') || 'Eggbeater';
    const oppLabel  = score.oppName  || 'Opponent';
    const ageGroup  = score.ageGroup || '';
    const qLabel    = score.period ? `Q${score.period}` : '';
    const clockStr  = score.clock || '';
    const shortText = `${qLabel} ${score.team ?? 0}-${score.opp ?? 0}`.trim();

    // Title: "12u Girls · 🤽 LIVE: 680 Blue 3-2"
    const agePrefix = ageGroup ? `${ageGroup} · ` : '';

    // Body: last event if available, otherwise matchup + clock
    const eventStr = score.lastEvent || '';
    const matchup  = `${teamLabel} vs ${oppLabel}`;
    const body = eventStr
      ? `${matchup} · ${eventStr}`
      : `${matchup}${qLabel ? ' · ' + qLabel : ''}${clockStr ? ' · ' + clockStr : ''}`;

    // Native countdown chronometer for Android notification — mirrors iOS Live Activity clock.
    // clockWhenMs = the wall-clock time when the period timer would reach 0 (if running).
    // Android uses setWhen() + setChronometerCountDown(true) to tick natively without polling.
    const timerRunning = !!(score.timerRunning);
    let clockWhenMs = 0;
    if (timerRunning && score.timerSecondsLeft > 0 && score.timerStartedAt > 0) {
      const elapsedSec = (Date.now() - score.timerStartedAt) / 1000;
      const remainingSec = Math.max(0, score.timerSecondsLeft - elapsedSec);
      clockWhenMs = Date.now() + remainingSec * 1000;
    }

    try {
      await plugin.startLiveUpdate({
        title:        `${agePrefix}🤽 LIVE: ${teamLabel} ${score.team ?? 0}-${score.opp ?? 0}`,
        body:         body,
        shortText:    shortText,
        timerRunning: timerRunning,
        clockWhenMs:  clockWhenMs,
      });
    } catch (e) {
      if (e && (e.message === 'NOTIFICATIONS_DISABLED' || (e.code && e.code === 'NOTIFICATIONS_DISABLED'))) {
        if (typeof showToast === 'function') {
          showToast('Enable notifications in Settings → Apps → Eggbeater → Notifications', 'error');
        }
      } else {
        console.error('[live-update] Sync failed:', e && e.message);
      }
    }
  }

  async function stop() {
    const plugin = getPlugin();
    if (plugin) {
      try { await plugin.stopLiveUpdate(); } catch {}
    }
  }

  window.EggbeaterLiveUpdate = {
    sync,
    stop
  };

  // Request POST_NOTIFICATIONS permission eagerly at app load on Android 13+.
  // Showing the dialog at launch (in context) is better than mid-game.
  if (typeof window !== 'undefined' && window.Capacitor &&
      window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
      window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android') {
    _ensureNotifPermission();
  }

})();
