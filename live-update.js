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
      if (window.Capacitor && window.Capacitor.Plugins) {
        return window.Capacitor.Plugins.LiveUpdate;
      }
    } catch (e) {
      console.warn('[live-update] Could not access LiveUpdate plugin:', e.message);
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
    await _ensureNotifPermission(); // request POST_NOTIFICATIONS on Android 13+ (no-op after first call)
    const plugin = getPlugin();
    if (!plugin) return;

    // Stop chip if game is not active
    if (!score || score.gameState === 'pre' || score.gameState === 'final'
        || score.gameState === 'so_w' || score.gameState === 'so_l') {
      try { await plugin.stopLiveUpdate(); } catch {}
      return;
    }

    const teamLabel = (typeof getActiveTeamLabel === 'function') ? getActiveTeamLabel() : 'Eggbeater';
    const oppLabel  = score.oppName || 'Opponent';

    // Quarter label
    const qLabel = score.period ? `Q${score.period}` : '';

    // Status Chip Text — keep short for Android chip (~9 chars)
    // Format: "Q1 7-5" or "Q3 2-4"
    const shortText = `${qLabel} ${score.team ?? 0}-${score.opp ?? 0}`.trim();

    // Clock + full notification body
    const clockStr = score.clock || '';
    const body = `${teamLabel} vs ${oppLabel}${qLabel ? ' · ' + qLabel : ''}${clockStr ? ' ' + clockStr : ''}`;

    try {
      await plugin.startLiveUpdate({
        title:     `🤽 LIVE: ${teamLabel} ${score.team ?? 0}-${score.opp ?? 0}`,
        body:      body,
        shortText: shortText,
      });
    } catch (e) {
      console.error('[live-update] Sync failed:', e);
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

})();
