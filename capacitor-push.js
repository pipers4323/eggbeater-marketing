/**
 * capacitor-push.js — Native Push Notification Bridge
 * ─────────────────────────────────────────────────────
 * Detects if running inside Capacitor native WebView.
 * If native: uses Capacitor's PushNotifications plugin to register for APNs.
 * If web: falls through to existing Web Push code in app.js.
 *
 * The Capacitor runtime + plugins are injected by the native shell (ios/App)
 * so we access them via window.Capacitor at runtime — no bundling needed.
 *
 * Exposes window.EggbeaterPush with register() / unregister() methods.
 */

(function () {
  'use strict';

  // ── Detect Capacitor environment ───────────────────────────────────────────
  function isNative() {
    return !!(window.Capacitor &&
              window.Capacitor.isNativePlatform &&
              window.Capacitor.isNativePlatform());
  }

  // ── Get the PushNotifications plugin (Capacitor 8+) ────────────────────────
  function getPushPlugin() {
    try {
      // In Capacitor 8, plugins are available on Capacitor.Plugins
      if (window.Capacitor && window.Capacitor.Plugins) {
        return window.Capacitor.Plugins.PushNotifications;
      }
    } catch (e) {
      console.warn('[push-bridge] Could not access PushNotifications plugin:', e.message);
    }
    return null;
  }

  // ── Register for native push notifications ─────────────────────────────────
  async function register(preferences) {
    if (!isNative()) {
      // Web browser — use existing Web Push from app.js
      if (typeof subscribeToPush === 'function') return subscribeToPush();
      return;
    }

    const push = getPushPlugin();
    if (!push) {
      console.warn('[push-bridge] PushNotifications plugin not available');
      if (typeof showToast === 'function') showToast('Push not available on this device');
      return;
    }

    try {
      // Request permission
      const permResult = await push.requestPermissions();
      if (permResult.receive !== 'granted') {
        if (typeof showToast === 'function') {
          showToast('Notifications blocked — enable in Settings');
        }
        return;
      }

      // Register with APNs
      await push.register();

      // Listen for the registration token
      push.addListener('registration', async (tokenData) => {
        const token = tokenData.value;
        console.info('[push-bridge] APNs token received:', token.substring(0, 12) + '…');

        // Save token to Firestore
        if (typeof fbSavePushToken === 'function') {
          const prefs = preferences || _getDefaultPreferences();
          await fbSavePushToken(token, prefs);
        }

        localStorage.setItem('ebwp-push-subscribed', '1');
        localStorage.setItem('ebwp-push-platform', 'ios');
        localStorage.setItem('ebwp-apns-token', token);

        if (typeof showToast === 'function') {
          showToast('🔔 Notifications enabled!', 'ok');
        }
        if (typeof renderPushButton === 'function') renderPushButton();
      });

      // Listen for registration errors
      push.addListener('registrationError', (error) => {
        console.error('[push-bridge] Registration failed:', error);
        if (typeof showToast === 'function') {
          showToast('Could not enable notifications: ' + (error.error || 'Unknown error'));
        }
      });

      // Listen for incoming notifications (foreground)
      push.addListener('pushNotificationReceived', (notification) => {
        console.info('[push-bridge] Push received:', notification);
        // Show a toast for foreground notifications
        if (typeof showToast === 'function') {
          const title = notification.title || 'Eggbeater';
          const body = notification.body || '';
          showToast(`📣 ${title}: ${body}`, 'ok');
        }
        // Trigger a data refresh
        if (typeof reloadTournamentJs === 'function') reloadTournamentJs();
      });

      // Listen for notification taps (background → foreground)
      push.addListener('pushNotificationActionPerformed', (action) => {
        console.info('[push-bridge] Push tapped:', action);
        // Refresh data when user taps a notification
        if (typeof reloadTournamentJs === 'function') reloadTournamentJs();
      });

    } catch (e) {
      console.error('[push-bridge] Registration error:', e);
      if (typeof showToast === 'function') {
        showToast('Could not enable notifications: ' + e.message);
      }
    }
  }

  // ── Unregister from native push notifications ──────────────────────────────
  async function unregister() {
    if (!isNative()) {
      if (typeof unsubscribeFromPush === 'function') return unsubscribeFromPush();
      return;
    }

    try {
      const token = localStorage.getItem('ebwp-apns-token');
      if (token && typeof fbRemovePushToken === 'function') {
        await fbRemovePushToken(token);
      }

      const push = getPushPlugin();
      if (push) {
        await push.removeAllListeners();
      }

      localStorage.removeItem('ebwp-push-subscribed');
      localStorage.removeItem('ebwp-push-platform');
      localStorage.removeItem('ebwp-apns-token');

      if (typeof showToast === 'function') showToast('Notifications turned off');
      if (typeof renderPushButton === 'function') renderPushButton();
    } catch (e) {
      if (typeof showToast === 'function') showToast('Could not unsubscribe: ' + e.message);
    }
  }

  // ── Default notification preferences ───────────────────────────────────────
  function _getDefaultPreferences() {
    return {
      gameScores: true,
      scheduleChanges: true,
      tournamentAnnouncements: true,
      ageGroups: (typeof getSelectedTeams === 'function') ? getSelectedTeams() : ['14u-girls'],
    };
  }

  // ── Update preferences without re-registering ──────────────────────────────
  async function updatePreferences(preferences) {
    const token = localStorage.getItem('ebwp-apns-token');
    if (!token) return;
    if (typeof fbSavePushToken === 'function') {
      await fbSavePushToken(token, preferences);
    }
  }

  // ── Check if registered ────────────────────────────────────────────────────
  function isRegistered() {
    return !!localStorage.getItem('ebwp-push-subscribed');
  }

  function isNativePush() {
    return localStorage.getItem('ebwp-push-platform') === 'ios';
  }

  // ── Expose global API ──────────────────────────────────────────────────────
  window.EggbeaterPush = {
    register,
    unregister,
    updatePreferences,
    isRegistered,
    isNative,
    isNativePush,
  };

})();
