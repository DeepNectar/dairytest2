/* ============ Dairy Writing — app-install.js ============
 * Turns the website into a PROPER installable application on both
 * Android (Chrome/Edge/Samsung Internet PWA) and iOS (Safari
 * "Add to Home Screen"). Plain JavaScript, no dependencies.
 *
 * Responsibilities:
 *   1. Register the service worker (offline app shell).
 *   2. Catch the Android beforeinstallprompt → show the install banner
 *      and run the native install flow from the in-app button.
 *   3. On iOS, the banner's button opens a step-by-step
 *      "Share → Add to Home Screen" guide modal.
 *   4. Remember a dismissal for one week; hide everything when the app
 *      is already installed / running standalone.
 * Keep this file independent of script.js so the journal logic never
 * breaks if installation is unavailable.
 * ========================================================== */

(function () {
  "use strict";

  var DISMISS_KEY = "dairy_install_dismissed_ts";
  var DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // hide the nudge for a week

  function $(sel) { return document.querySelector(sel); }

  // ---------- storage helpers (private try/catch — some WebViews block it) ----------
  function storeGet(k) {
    try { return window.localStorage.getItem(k); } catch (e) { return null; }
  }
  function storeSet(k, v) {
    try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ }
  }

  // ---------- platform detection ----------
  function isIOS() {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }
  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }
  function isStandalone() {
    return (
      window.matchMedia &&
      matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true // iOS Safari
    );
  }

  // ---------- element shortcuts ----------
  var banner, ibAction, ibDismiss, ibTitle, ibSub, iosModal, iosOk, iosClose;

  function showBanner(title, sub, btnLabel) {
    if (!banner) return;
    if (ibTitle) ibTitle.textContent = title;
    if (ibSub) ibSub.textContent = sub;
    if (ibAction) ibAction.textContent = btnLabel;
    banner.classList.remove("hidden");
  }
  function hideBanner() {
    if (banner) banner.classList.add("hidden");
  }
  function dismissedRecently() {
    var t = parseInt(storeGet(DISMISS_KEY) || "0", 10);
    return t && Date.now() - t < DISMISS_MS;
  }

  // ---------- iOS guide modal ----------
  function openIosGuide() {
    if (iosModal) iosModal.classList.remove("hidden");
  }
  function closeIosGuide() {
    if (iosModal) iosModal.classList.add("hidden");
  }

  // ---------- Android real install flow ----------
  var deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); // we show our own UI instead of the browser chip
    deferredPrompt = e;
    if (isStandalone() || dismissedRecently()) return;
    showBanner(
      "Install Dairy Writing",
      "Add the app to your home screen — full-screen, offline-ready.",
      "Install"
    );
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hideBanner();
    if (typeof window.showToast === "function") {
      window.showToast("🎉 App installed — find it on your home screen!");
    }
  });

  function onInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome !== "accepted") {
          storeSet(DISMISS_KEY, String(Date.now()));
        }
        deferredPrompt = null;
        hideBanner();
      });
      return;
    }
    // No native prompt available (iOS, or already answered): show the guide.
    openIosGuide();
  }

  // ---------- boot ----------
  document.addEventListener("DOMContentLoaded", function () {
    banner = $("#installBanner");
    ibAction = $("#ibAction");
    ibDismiss = $("#ibDismiss");
    ibTitle = $("#ibTitle");
    ibSub = $("#ibSub");
    iosModal = $("#iosGuideModal");
    iosOk = $("#iosGuideOk");
    iosClose = $("#iosGuideClose");

    if (ibAction) ibAction.addEventListener("click", onInstallClick);
    if (ibDismiss)
      ibDismiss.addEventListener("click", function () {
        storeSet(DISMISS_KEY, String(Date.now()));
        hideBanner();
      });
    if (iosOk) iosOk.addEventListener("click", closeIosGuide);
    if (iosClose) iosClose.addEventListener("click", closeIosGuide);
    if (iosModal)
      iosModal.addEventListener("click", function (e) {
        if (e.target === iosModal) closeIosGuide();
      });

    // Already running as an installed app → nothing to do.
    if (isStandalone()) {
      hideBanner();
      document.documentElement.classList.add("app-standalone");
      return;
    }

    // iOS: the browser gives us no install event — offer the guide up-front
    // (only in Safari proper; in-app browsers like Instagram can't install).
    if (isIOS()) {
      var isSafari =
        /^apple/.test((window.navigator.vendor || "").toLowerCase()) &&
        !/CriOS|FxiOS|EdgA|OPiOS/.test(navigator.userAgent);
      if (isSafari && !dismissedRecently()) {
        showBanner(
          "Install on your iPhone",
          "Open it full-screen like a native app via “Add to Home Screen”.",
          "How-to"
        );
      }
      return;
    }

    // Android without a captured prompt yet (or non-Chromium): still teach.
    if (isAndroid() && !dismissedRecently()) {
      setTimeout(function () {
        if (!deferredPrompt && banner && banner.classList.contains("hidden")) {
          showBanner(
            "Add to Home Screen",
            "In Chrome menu (⋮) choose “Add to Home screen” to install the app.",
            "How-to"
          );
        }
      }, 6000);
    }
  });

  // ---------- service worker registration ----------
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("sw.js")
        .catch(function () {
          /* hosting without SW support / insecure origin — the app still runs */
        });
    });
  }
})();
