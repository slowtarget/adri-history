/* firestore-loader.js — Firestore data source for the quiz.
 *
 * Loaded as a static <script> tag AFTER quiz.js.
 *
 * Firestore mode (default on any http/https non-localhost origin):
 *   - reads ?test= param (defaults to 'iberian_history')
 *   - disables Start while fetching
 *   - loads tests/{testId} metadata + subcollection facts/questions
 *   - sets window.QUIZ_TEST, updates DOM elements tagged data-quiz-field
 *   - replaces QUIZ_FACTS / QUIZ_QUESTIONS globals, re-runs enrichment
 *   - re-enables Start once ready (or on error — falls back to locals)
 *
 * Local mode (exits immediately, keeping test-fixture globals):
 *   - file://, localhost, 127.0.0.1, or ?data=local
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

  var testId = params.get('test') || 'iberian_history';

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

  /* Update DOM elements tagged with data-quiz-field from test metadata. */
  function applyTestMeta(meta) {
    if (!meta) return;
    window.QUIZ_TEST = meta;
    if (meta.icon && meta.title) document.title = meta.icon + ' ' + meta.title;
    document.querySelectorAll('[data-quiz-field]').forEach(function (el) {
      var key = el.getAttribute('data-quiz-field');
      if (meta[key] !== undefined) el.textContent = meta[key];
    });
  }

  /* Disable Start button while Firestore data is in flight. */
  var startBtn     = document.getElementById('start-btn');
  var startBtnText = startBtn ? startBtn.textContent : '';
  function lockStart()   { if (startBtn) { startBtn.disabled = true;  startBtn.textContent = 'Loading\u2026'; } }
  function unlockStart() { if (startBtn) { startBtn.disabled = false; startBtn.textContent = startBtnText; } }

  /* Fetch test metadata + subcollection data, then replace globals. */
  function loadFromFirestore() {
    var app  = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    var db   = firebase.firestore(app);
    var test = db.collection('tests').doc(testId);

    Promise.all([
      test.get(),
      test.collection('facts').orderBy('source_line').get(),
      test.collection('questions').orderBy('id').get()
    ]).then(function (results) {
      var meta      = results[0].exists ? results[0].data() : null;
      var facts     = results[1].docs.map(function (d) { return d.data(); });
      var questions = results[2].docs.map(function (d) { return d.data(); });

      applyTestMeta(meta);

      if (facts.length && questions.length) {
        enrichQuestions(facts, questions);
        window.QUIZ_FACTS     = facts;
        window.QUIZ_QUESTIONS = questions;
        console.info('[firestore-loader] Loaded test "' + testId + '": ' +
          facts.length + ' facts, ' + questions.length + ' questions.');
      } else {
        console.warn('[firestore-loader] Test "' + testId + '" has no data — keeping local data.');
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

