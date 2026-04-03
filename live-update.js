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
      if (window.Capacitor && window.Capacitor.registerPlugin) {
        return window.Capacitor.registerPlugin('LiveUpdate');
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

    // Only sync if the game is active
    if (!score || score.gameState === 'pre' || score.gameState === 'final') {
      await plugin.stopLiveUpdate();
      return;
    }

    const teamLabel = (typeof getActiveTeamLabel === 'function') ? getActiveTeamLabel() : 'Eggbeater';
    const oppLabel = score.oppName || 'Opponent';
    
    // Status Chip Text (Max ~7-9 chars recommended for Android 16)
    // Format: "7-5 Q3" or "0-0 1st"
    const shortText = `${score.team}-${score.opp} ${score.period || ''}`.trim();

    // Notification Body
    const body = `${teamLabel} vs ${oppLabel} · ${score.clock || 'Start'}`;

    try {
      await plugin.startLiveUpdate({
        title: `Live: ${teamLabel} ${score.team}-${score.opp}`,
        body: body,
        shortText: shortText
      });
    } catch (e) {
      console.error('[live-update] Sync failed:', e);
    }
  }

  async function stop() {
    const plugin = getPlugin();
    if (plugin) await plugin.stopLiveUpdate();
  }

  window.EggbeaterLiveUpdate = {
    sync,
    stop
  };

})();
