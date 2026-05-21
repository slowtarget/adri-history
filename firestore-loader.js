/* firestore-loader.js — Optional Firestore data source for the quiz.
 *
 * Loaded as a static <script> tag AFTER quiz.js.
 *
 * Local mode (default, no query param): exits immediately — zero impact on
 * the existing quiz behaviour and all Playwright tests.
 *
 * Firestore mode (?data=firestore, requires http/https):
 *   - quiz.js has already run and initialised Firebase via QuizAuth.init()
 *   - dynamically loads the Firebase Firestore compat SDK
 *   - fetches all facts (ordered by source_line) and all questions (by id)
 *   - replaces QUIZ_FACTS / QUIZ_QUESTIONS globals and re-runs enrichment
 *   - if the user clicks Start before the fetch completes, local data is used
 *     (always a valid fallback — no broken state possible)
 */
/* global firebase, QUIZ_CONFIG */
(function () {
  'use strict';

  /* Exit immediately in local mode or when opened as file:// */
  var params = new URLSearchParams(window.location.search);
  if (params.get('data') !== 'firestore' || location.protocol === 'file:') return;

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
    }).catch(function (err) {
      console.warn('[firestore-loader] Fetch failed — keeping local data.', err.message);
    });
  }

  /* Dynamically load the Firestore compat SDK, then fetch data. */
  var sdk         = document.createElement('script');
  sdk.src         = 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore-compat.js';
  sdk.crossOrigin = 'anonymous';
  sdk.onload      = loadFromFirestore;
  sdk.onerror     = function () {
    console.warn('[firestore-loader] Could not load Firestore SDK — keeping local data.');
  };
  document.head.appendChild(sdk);
}());
