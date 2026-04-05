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
  function _dbg(msg) {
    console.info('[live-update] ' + msg);
    if (typeof showToast === 'function') showToast('[LU] ' + msg, 'info');
  }

  async function sync(gameId, score) {
    if (!isNative()) { _dbg('not native'); return; }
    await _ensureNotifPermission();
    const plugin = getPlugin();
    if (!plugin) { _dbg('plugin null'); return; }

    // Stop chip if game is not active
    if (!score || score.gameState === 'pre' || score.gameState === 'final'
        || score.gameState === 'so_w' || score.gameState === 'so_l') {
      try { await plugin.stopLiveUpdate(); } catch {}
      return;
    }

    _dbg('posting: ' + score.gameState + ' ' + score.team + '-' + score.opp);

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
      _dbg('posted ok');
    } catch (e) {
      if (e && (e.message === 'NOTIFICATIONS_DISABLED' || (e.code && e.code === 'NOTIFICATIONS_DISABLED'))) {
        if (typeof showToast === 'function') {
          showToast('Enable notifications in Settings → Apps → Eggbeater → Notifications', 'error');
        }
      } else {
        _dbg('error: ' + (e && e.message));
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
