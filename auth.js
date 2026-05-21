/* auth.js — Firebase OAuth (Google + GitHub) for the Iberian History Quiz
   Requires firebase-app-compat.js + firebase-auth-compat.js loaded first.
   QUIZ_CONFIG.FIREBASE_CONFIG must have an apiKey to enable auth.
   Leave FIREBASE_CONFIG: {} to disable auth (local dev / Playwright tests). */
/* global firebase, QUIZ_CONFIG */
// eslint-disable-next-line no-var
var QuizAuth = (function () {
  'use strict';

  let _user = null;

  /**
   * Call onReady(user, configured) whenever auth state changes.
   * `configured` is false when FIREBASE_CONFIG has no apiKey — auth is skipped.
   */
  function init(onReady) {
    const cfg = (typeof QUIZ_CONFIG !== 'undefined' && QUIZ_CONFIG.FIREBASE_CONFIG) || {};
    // Firebase Auth requires http/https — skip silently when opened as file:// or localhost
    if (!cfg.apiKey || location.protocol === 'file:' || location.hostname === 'localhost') {
      onReady(null, false);
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    // Skip auth for file:// and localhost — local dev / Playwright tests use local data
    firebase.auth().onAuthStateChanged(function (user) {
      _user = user;
      onReady(user, true);
    });
  }

  function signInWithGoogle() {
    return firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }

  function signInWithGitHub() {
    return firebase.auth().signInWithPopup(new firebase.auth.GithubAuthProvider());
  }

  function signOut() {
    return firebase.auth().signOut();
  }

  function getUser() { return _user; }

  return {
    init: init,
    signInWithGoogle: signInWithGoogle,
    signInWithGitHub: signInWithGitHub,
    signOut: signOut,
    getUser: getUser,
  };
}());
