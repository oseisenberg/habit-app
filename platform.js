// ========================================
// PLATFORM ADAPTER
// ========================================
// Single seam between the web app and a Capacitor-wrapped iOS build.
// On the web / installed PWA this is inert: AppPlatform.isNative() is
// false and app.js keeps using its existing Notification / service
// worker / navigator.setAppBadge code paths unchanged.
//
// Inside the Capacitor iOS app, window.Capacitor is injected and the
// native plugins below take over so reminders fire in the background
// (which iOS web/PWA fundamentally cannot do) and the app icon badge
// works. Storage stays on localStorage — WKWebView storage inside a
// packaged app is persistent and not subject to Safari's PWA
// eviction, so no async storage rewrite is needed for v1.
//
// Plugin access uses the runtime bridge (window.Capacitor.Plugins.*)
// so this file needs no bundler and is safe to load as a plain
// <script> in the browser, where Capacitor is absent.

(function () {
  'use strict';

  function cap() { return (typeof window !== 'undefined') ? window.Capacitor : undefined; }
  function isNative() {
    var c = cap();
    return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform());
  }
  function plugin(name) {
    var c = cap();
    return c && c.Plugins ? c.Plugins[name] : undefined;
  }

  // Fixed notification ids so re-scheduling replaces rather than stacks.
  var ID = { morning: 1001, night: 1002, weekly: 1003 };

  var AppPlatform = {
    isNative: isNative,

    // Called once at startup (app.js bottom). No-op on web.
    async init() {
      if (!isNative()) return;
      var LN = plugin('LocalNotifications');
      try { if (LN) await LN.requestPermissions(); } catch (e) { /* user can grant later */ }
    },

    // Native permission request; web returns null so app.js falls back
    // to its existing Notification.requestPermission() flow.
    async requestNotificationPermission() {
      if (!isNative()) return null;
      var LN = plugin('LocalNotifications');
      if (!LN) return 'denied';
      try {
        var r = await LN.requestPermissions();
        return (r && r.display === 'granted') ? 'granted' : 'denied';
      } catch (e) { return 'denied'; }
    },

    // Schedule the fixed-time daily/weekly reminders natively so they
    // fire while the app is backgrounded. Returns true if it handled
    // scheduling (caller then skips the web setTimeout path). The
    // momentum alert depends on live habit state at fire time, so it
    // is intentionally left to the app-open check, not scheduled here.
    async scheduleNotifications(settings) {
      if (!isNative()) return false;
      var LN = plugin('LocalNotifications');
      if (!LN) return false;
      try {
        await LN.cancel({ notifications: [
          { id: ID.morning }, { id: ID.night }, { id: ID.weekly }
        ]});
      } catch (e) { /* nothing pending yet */ }

      if (!settings || !settings.notificationsEnabled) return true;

      var toSchedule = [];
      toSchedule.push({
        id: ID.morning,
        title: 'Habits',
        body: 'Time for your morning habits',
        schedule: { on: { hour: settings.morningReminderTime | 0, minute: 0 }, allowWhileIdle: true }
      });
      toSchedule.push({
        id: ID.night,
        title: 'Habits',
        body: 'Time for your bedtime habits',
        schedule: { on: { hour: settings.nightReminderTime | 0, minute: 0 }, allowWhileIdle: true }
      });
      if (settings.weeklySummaryEnabled) {
        toSchedule.push({
          id: ID.weekly,
          title: 'Weekly summary',
          body: 'Review your week',
          // Capacitor weekday: 1 = Sunday
          schedule: { on: { weekday: 1, hour: 10, minute: 0 }, allowWhileIdle: true }
        });
      }
      try { await LN.schedule({ notifications: toSchedule }); } catch (e) {}
      return true;
    },

    async cancelNotifications() {
      if (!isNative()) return false;
      var LN = plugin('LocalNotifications');
      if (!LN) return false;
      try {
        await LN.cancel({ notifications: [
          { id: ID.morning }, { id: ID.night }, { id: ID.weekly }
        ]});
      } catch (e) {}
      return true;
    },

    // Native app-icon badge. Returns true if handled; web path keeps
    // using navigator.setAppBadge.
    setBadge(count) {
      if (!isNative()) return false;
      var Badge = plugin('Badge');
      if (!Badge) return false;
      try {
        if (count > 0) Badge.set({ count: count });
        else Badge.clear();
      } catch (e) {}
      return true;
    }
  };

  if (typeof window !== 'undefined') window.AppPlatform = AppPlatform;
})();
