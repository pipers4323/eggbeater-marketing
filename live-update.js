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

  /**
   * Sync the current live game state to the native Android 16 Status Chip.
   * @param {string} gameId
   * @param {object} score - { team, opp, clock, period, gameState }
   */
  async function sync(gameId, score) {
    if (!isNative()) return;
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
