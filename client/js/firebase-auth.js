"use strict";

(function initializeCatMatchFirebase() {
  const config = window.CATMATCH_FIREBASE_CONFIG || {};
  const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
  const configured = requiredKeys.every((key) => {
    const value = String(config[key] || "").trim();
    return value && !value.includes("PASTE_");
  });

  if (!configured || !window.firebase?.auth) {
    window.catmatchFirebase = {
      configured: false,
      configurationError: configured
        ? "โหลด Firebase Authentication SDK ไม่สำเร็จ"
        : "ยังไม่ได้ใส่ Firebase Web Config",
    };
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  const auth = firebase.auth();
  auth.languageCode = "th";
  auth.useDeviceLanguage?.();

  function createGoogleProvider() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  window.catmatchFirebase = {
    configured: true,
    auth,

    useSessionPersistence() {
      return auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
    },

    emailLogin(email, password) {
      return auth.signInWithEmailAndPassword(email, password);
    },

    googleLogin() {
      return auth.signInWithPopup(createGoogleProvider());
    },

    googleLoginRedirect() {
      return auth.signInWithRedirect(createGoogleProvider());
    },

    getRedirectResult() {
      return auth.getRedirectResult();
    },

    createEmailAccount(email, password) {
      return auth.createUserWithEmailAndPassword(email, password);
    },

    getIdToken(user, forceRefresh = false) {
      return user.getIdToken(forceRefresh);
    },

    signOut() {
      return auth.signOut();
    },
  };
})();
