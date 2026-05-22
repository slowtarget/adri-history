/* firestore-loader.js — Firestore data source for the quiz.
 *
 * Loaded as a static <script> tag AFTER quiz.js.
 *
 * Firestore mode (default on any http/https non-localhost origin):
 *   - disables the Start button and shows "Loading…" while fetching
 *   - dynamically loads the Firebase Firestore compat SDK
 *   - fetches all facts (ordered by source_line) and all questions (by id)
 *   - replaces QUIZ_FACTS / QUIZ_QUESTIONS globals and re-runs enrichment
 *   - re-enables Start once data is ready (or on error — falls back to locals)
 *
 * Local mode (exits immediately, keeping test-fixture globals):
 *   - file:// protocol
 *   - localhost / 127.0.0.1
 *   - ?data=local query param (explicit override for any host)
 */
/* global firebase, QUIZ_CONFIG */
(function () {
  'use strict';

  /* Exit immediately in local mode */
  var params  = new URLSearchParams(window.location.search);
  var isLocal = location.protocol === 'file:' ||
                location.hostname === 'localhost' ||
                location.hostname === '127.0.0.1' ||
                params.get('data') === 'local';
  if (isLocal) return;

  var cfg = (typeof QUIZ_CONFIG !== 'undefined' && QUIZ_CONFIG.FIREBASE_CONFIG) || {};
  if (!cfg.apiKey) {
    console.warn('[firestore-loader] No Firebase apiKey in QUIZ_CONFIG — Firestore mode skipped.');
    return;
  }

  /* Replicate quiz.js's enrichment so q.facts / q.era are set on Firestore objects. */
  function enrichQuestions(facts, questions) {
    var factById = {};
    facts.forEach(function (f) { factById[f.id] = f; });
    questions.forEach(function (q) {
      q.facts = (q.fact_ids || []).map(function (fid) { return factById[fid]; }).filter(Boolean);
      q.era   = q.facts.length > 0 ? q.facts[0].labels.era : 'Unknown';
    });
  }

  /* Disable Start button while Firestore data is in flight. */
  var startBtn     = document.getElementById('start-btn');
  var startBtnText = startBtn ? startBtn.textContent : '';
  function lockStart()   { if (startBtn) { startBtn.disabled = true;  startBtn.textContent = 'Loading\u2026'; } }
  function unlockStart() { if (startBtn) { startBtn.disabled = false; startBtn.textContent = startBtnText; } }

  /* Fetch from Firestore and replace globals.
     Firebase may already be initialised by auth.js; initialise here if not
     (e.g. when running on localhost where auth.js skips initializeApp). */
  function loadFromFirestore() {
    var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    var db  = firebase.firestore(app);

    Promise.all([
      db.collection('facts').orderBy('source_line').get(),
      db.collection('questions').orderBy('id').get()
    ]).then(function (results) {
      var facts     = results[0].docs.map(function (d) { return d.data(); });
      var questions = results[1].docs.map(function (d) { return d.data(); });

      if (facts.length && questions.length) {
        enrichQuestions(facts, questions);
        window.QUIZ_FACTS     = facts;
        window.QUIZ_QUESTIONS = questions;
        console.info(
          '[firestore-loader] Loaded ' + facts.length + ' facts and ' +
          questions.length + ' questions from Firestore.'
        );
      } else {
        console.warn('[firestore-loader] Firestore collections are empty — keeping local data.');
      }
      unlockStart();
    }).catch(function (err) {
      console.warn('[firestore-loader] Fetch failed — keeping local data.', err.message);
      unlockStart();
    });
  }

  /* Dynamically load the Firestore compat SDK, then fetch data. */
  lockStart();
  var sdk         = document.createElement('script');
  sdk.src         = 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore-compat.js';
  sdk.crossOrigin = 'anonymous';
  sdk.onload      = loadFromFirestore;
  sdk.onerror     = function () {
    console.warn('[firestore-loader] Could not load Firestore SDK — keeping local data.');
    unlockStart();
  };
  document.head.appendChild(sdk);
}());
