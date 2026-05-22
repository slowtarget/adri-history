/* quiz.js — Iberian History Quiz logic */
(function () {
  'use strict';

  const QUESTIONS_PER_QUIZ = 20;
  const PASS_SCORE = Math.ceil(QUESTIONS_PER_QUIZ * 0.9); // 18 out of 20
  const STORAGE_KEY = 'iberian_quiz_results';
  const NAME_KEY    = 'iberian_quiz_player_name';

  /* ── State ──────────────────────────────────────────────────── */
  let selectedQuestions = [];
  let currentIndex = 0;
  let score = 0;
  let answered = false;
  let startTime = null;
  let wrongAnswers = [];  // { question, yourKey, yourText, correctKey, correctText }
  let playerName   = '';
  let currentChoices = {};    // { A: text, B: text, C: text, D: text } — set each render
  let currentCorrectKey = ''; // which key holds the correct answer this render

  /* ── DOM refs ───────────────────────────────────────────────── */
  const screens = {
    start:   document.getElementById('start-screen'),
    quiz:    document.getElementById('quiz-screen'),
    results: document.getElementById('results-screen'),
    signin:  document.getElementById('signin-screen'),
  };

  const startBtn      = document.getElementById('start-btn');
  const playerNameInput = document.getElementById('player-name');
  const restartBtn    = document.getElementById('restart-btn');
  const nextBtn       = document.getElementById('next-btn');
  const questionText  = document.getElementById('question-text');
  const questionCounter = document.getElementById('question-counter');
  const progressFill  = document.getElementById('progress-fill');
  const scoreTracker  = document.getElementById('score-tracker');
  const optionBtns    = Array.from(document.querySelectorAll('.option'));

  const resultIcon    = document.getElementById('result-icon');
  const resultHeading = document.getElementById('result-heading');
  const resultMessage = document.getElementById('result-message');
  const scoreDisplay  = document.getElementById('score-display');
  const scoreBarFill  = document.getElementById('score-bar-fill');
  const timingInfo    = document.getElementById('timing-info');
  const wrongSection  = document.getElementById('wrong-answers-section');
  const wrongList     = document.getElementById('wrong-answers-list');
  const downloadBtn   = document.getElementById('download-csv-btn');
  const inlineExplain     = document.getElementById('inline-explain');
  const inlineQuote       = document.getElementById('inline-quote');
  const inlineExplanation = document.getElementById('inline-explanation');

  const googleSigninBtn = document.getElementById('google-signin-btn');
  const githubSigninBtn = document.getElementById('github-signin-btn');
  const signinError     = document.getElementById('signin-error');
  const signedInBanner  = document.getElementById('signed-in-banner');
  const signedInName    = document.getElementById('signed-in-name');
  const signoutBtn      = document.getElementById('signout-btn');

  /* ── Utility ────────────────────────────────────────────────── */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
  }

  function fmtDate(d) {
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  /* UTF-8-safe base64 encode/decode (handles accented chars in questions) */
  function toB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }

  function fromB64(b64) {
    const bin   = atob(b64.replace(/\n/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
    return new TextDecoder().decode(bytes);
  }

  /* ── Zod schemas ────────────────────────────────────────────── */
  const z = (window.Zod && window.Zod.z) ? window.Zod.z : null;

  // Accepts any value → string, strips HTML & control chars, caps length.
  const safeStr = function (maxLen) {
    return z.unknown().transform(function (v) {
      return String(v == null ? '' : v)
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/<[^>]*>/g, '')
        .slice(0, maxLen || 500);
    });
  };

  // Answer key must be exactly one of A–D; anything else becomes '?'.
  const answerKeySchema = z ? z.string().regex(/^[ABCD]$/).catch('?') : null;

  // Shape of one wrong-answer entry.
  const wrongAnswerSchema = z.object({
    question:    safeStr(500),
    yourKey:     answerKeySchema,
    yourText:    safeStr(200),
    correctKey:  answerKeySchema,
    correctText: safeStr(200),
    quote:       safeStr(500),
    explanation: safeStr(600),
  });

  // Shape of one complete result record (corrupt rows fail safeParse → skipped).
  const resultSchema = z.object({
    name:      safeStr(60),
    started:   z.string().datetime({ offset: true }),
    completed: z.string().datetime({ offset: true }),
    score:     z.number().int().min(0).max(100),
    total:     z.number().int().min(1).max(100),
    wrong:     z.array(wrongAnswerSchema).default([]),
  });

  /* ── CSV helpers ────────────────────────────────────────────── */

  // Wrap a cell value in quotes if needed AND neutralise spreadsheet
  // formula-injection (= + - @ \t \r prefixes used by Excel/Sheets).
  function csvCell(v) {
    let s = String(v).replace(/[\x00-\x1F\x7F]/g, ' '); // strip control chars
    // Prefix dangerous lead characters so spreadsheets treat as text
    if (/^[=+\-@\t\r]/.test(s)) s = '\'' + s;
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  }

  function loadResults() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveResult(entry) {
    const all = loadResults();
    all.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function buildCSV() {
    const rows   = loadResults();
    const header = ['Name', 'Date', 'Time Started', 'Time Completed', 'Score', 'Out Of', 'Percentage', 'Wrong Questions'];
    const lines  = [header.join(',')];
    rows.forEach(function (r) {
      const parsed = resultSchema.safeParse(r);
      if (!parsed.success) return; // skip corrupt rows
      const { name, started, completed, score, total, wrong } = parsed.data;
      const startedDate   = new Date(started);
      const completedDate = new Date(completed);
      const wrongSummary  = wrong.map(function (w) {
        return w.question + ' [Correct: ' + w.correctKey + ') ' + w.correctText + ']';
      }).join(' | ');
      lines.push([
        csvCell(name || 'Anonymous'),
        csvCell(startedDate.toLocaleDateString()),
        csvCell(startedDate.toLocaleTimeString()),
        csvCell(completedDate.toLocaleTimeString()),
        csvCell(score),
        csvCell(total),
        csvCell(Math.round(score / total * 100) + '%'),
        csvCell(wrongSummary || 'None'),
      ].join(','));
    });
    return lines.join('\n');
  }

  function downloadCSV() {
    const csv  = buildCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'quiz_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Firestore: persist result to 'results' collection ──────── */
  function pushResultToFirestore(entry) {
    /* Skip if Firestore SDK not loaded (local/test mode) or user not authenticated */
    if (typeof firebase === 'undefined' || typeof firebase.firestore !== 'function') return;
    var user = (typeof QuizAuth !== 'undefined') ? QuizAuth.getUser() : null;
    if (!user) return;
    var app = firebase.apps.length ? firebase.app() : null;
    if (!app) return;

    var tid = (window.QUIZ_TEST && window.QUIZ_TEST.id) ||
               new URLSearchParams(window.location.search).get('test') ||
               'iberian_history';

    firebase.firestore(app).collection('results').add({
      name:      entry.name || 'Anonymous',
      started:   entry.started,
      completed: entry.completed,
      score:     entry.score,
      total:     entry.total,
      wrong:     entry.wrong,
      testId:    tid,
      userId:    user.uid,
      userEmail: user.email || '',
      savedAt:   new Date().toISOString(),
    }).catch(function (err) {
      console.warn('[quiz] Firestore result save error:', err.message);
    });
  }

  /* ── One-time question enrichment ──────────────────────────
   * Run once at startup: attach the full fact objects to every
   * question so quote/explanation/era are available without
   * storing them redundantly on the question itself.
   * ──────────────────────────────────────────────────────────── */
  var factById = {};
  if (typeof QUIZ_FACTS !== 'undefined') {
    QUIZ_FACTS.forEach(function (f) { factById[f.id] = f; });
  }
  QUIZ_QUESTIONS.forEach(function (q) {
    q.facts = (q.fact_ids || []).map(function (fid) { return factById[fid]; }).filter(Boolean);
    q.era   = q.facts.length > 0 ? q.facts[0].labels.era : 'Unknown';
  });

  /* ── Question selection ─────────────────────────────────────
   * Steps through the sorted QUIZ_FACTS array at intervals of
   * n/count with ±2 random jitter, picking one question per
   * sampled fact.  Wraps around if the pointer exceeds the array
   * length.  No two questions sharing a fact_id appear together.
   * Falls back to random fill if the stepping loop can't find
   * enough questions (e.g. heavily overlapping fact sets).
   * ──────────────────────────────────────────────────────────── */
  function selectQuestions(pool, count) {
    var facts = (typeof QUIZ_FACTS !== 'undefined') ? QUIZ_FACTS : [];
    var n = facts.length;

    /* Build reverse index: fact_id → [questions] */
    var factQs = {};
    pool.forEach(function (q) {
      (q.fact_ids || []).forEach(function (fid) {
        if (!factQs[fid]) factQs[fid] = [];
        factQs[fid].push(q);
      });
    });

    var step  = n / count;                   /* ~5.3 for 106 facts / 20 */
    var pos   = Math.random() * step;        /* random start in [0, step) */
    var selected  = [];
    var usedQIds  = new Set();
    var usedFacts = new Set();
    var attempts  = 0;
    var maxAttempts = n * 3;                 /* safety exit */

    while (selected.length < count && attempts < maxAttempts) {
      var idx  = Math.floor(pos) % n;
      var fact = facts[idx];

      if (fact && !usedFacts.has(fact.id)) {
        /* Candidates: questions for this fact, not yet used, no fact overlap */
        var candidates = (factQs[fact.id] || []).filter(function (q) {
          if (usedQIds.has(q.id)) return false;
          return (q.fact_ids || []).every(function (fid) { return !usedFacts.has(fid); });
        });

        if (candidates.length > 0) {
          var q = candidates[Math.floor(Math.random() * candidates.length)];
          selected.push(q);
          usedQIds.add(q.id);
          (q.fact_ids || []).forEach(function (fid) { usedFacts.add(fid); });
        }
      }

      pos += step + (Math.random() * 4 - 2); /* advance with ±2 jitter */
      attempts++;
    }

    /* Fallback: fill remaining slots without fact constraint */
    if (selected.length < count) {
      var remaining = shuffle(pool);
      for (var i = 0; i < remaining.length && selected.length < count; i++) {
        if (!usedQIds.has(remaining[i].id)) selected.push(remaining[i]);
      }
    }

    return shuffle(selected);
  }

  /* ── Quiz flow ──────────────────────────────────────────────── */
  function startQuiz() {
    playerName = (playerNameInput.value || '').trim() || 'Anonymous';
    localStorage.setItem(NAME_KEY, playerName);
    selectedQuestions = selectQuestions(QUIZ_QUESTIONS, QUESTIONS_PER_QUIZ);
    currentIndex = 0;
    score = 0;
    wrongAnswers = [];
    startTime = new Date();
    showScreen('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    inlineExplain.classList.add('hidden');
    inlineQuote.textContent = '';
    inlineExplanation.textContent = '';
    const q = selectedQuestions[currentIndex];
    const num = currentIndex + 1;

    /* progress */
    questionCounter.textContent = 'Question ' + num + ' of ' + QUESTIONS_PER_QUIZ;
    progressFill.style.width = (num / QUESTIONS_PER_QUIZ * 100) + '%';
    scoreTracker.textContent = 'Score: ' + score;

    /* question */
    questionText.textContent = q.question;

    /* options — pick 3 random distractors, add correct answer, shuffle */
    const keys = ['A', 'B', 'C', 'D'];
    const pickedDistractors = shuffle(q.distractors).slice(0, 3);
    const choiceTexts = shuffle([q.answer].concat(pickedDistractors));
    currentChoices = {};
    keys.forEach(function (key, i) { currentChoices[key] = choiceTexts[i]; });
    currentCorrectKey = keys.find(function (key) { return currentChoices[key] === q.answer; });

    keys.forEach(function (key) {
      const btn = document.querySelector('.option[data-key="' + key + '"]');
      btn.className = 'option';
      btn.disabled = false;
      document.getElementById('text-' + key).textContent = currentChoices[key];
    });

    nextBtn.classList.add('hidden');

    // expose state for tests
    window._quizState = {
      currentQuestion: q,
      correctAnswer: currentCorrectKey,
      currentIndex: currentIndex,
      score: score,
    };
  }

  function handleAnswer(selectedKey) {
    if (answered) return;
    answered = true;

    const q = selectedQuestions[currentIndex];
    const isCorrect = selectedKey === currentCorrectKey;

    if (isCorrect) score++;

    /* style all option buttons */
    optionBtns.forEach(function (btn) {
      btn.disabled = true;
      if (btn.dataset.key === currentCorrectKey) {
        btn.classList.add('correct');
      } else if (btn.dataset.key === selectedKey && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    scoreTracker.textContent = 'Score: ' + score;

    // update exposed state
    window._quizState.score = score;
    window._quizState.lastAnswerCorrect = isCorrect;

    if (!isCorrect) {
      var primaryFact = (q.facts && q.facts[0]) || {};
      var qQuote = primaryFact.source_quote || '';
      var qExplain = primaryFact.explanation || '';
      if (qQuote || qExplain) {
        inlineQuote.textContent = qQuote ? '\u201c' + qQuote + '\u201d' : '';
        inlineExplanation.textContent = qExplain;
        inlineExplain.classList.remove('hidden');
      }
      wrongAnswers.push({
        question:    q.question,
        yourKey:     selectedKey,
        yourText:    currentChoices[selectedKey],
        correctKey:  currentCorrectKey,
        correctText: q.answer,
        quote:       qQuote,
        explanation: qExplain,
      });
    }

    if (currentIndex < QUESTIONS_PER_QUIZ - 1) {
      nextBtn.classList.remove('hidden');
    } else {
      /* last question — show results after a short delay */
      nextBtn.textContent = 'See Results →';
      nextBtn.classList.remove('hidden');
    }
  }

  function showResults() {
    const endTime = new Date();
    const pct    = score / QUESTIONS_PER_QUIZ;
    const passed = score >= PASS_SCORE;

    showScreen('results');

    var ui = (window.QUIZ_TEST && window.QUIZ_TEST.ui) || {};
    if (passed) {
      resultIcon.textContent    = ui.passIcon    || '🏆';
      resultHeading.textContent = ui.passHeading || 'Congratulations!';
      resultMessage.textContent = ui.passMessage ||
        'Excellent work! You scored ' + score + ' out of ' + QUESTIONS_PER_QUIZ +
        '. You\'ve clearly mastered this material — keep it up!';
    } else {
      resultIcon.textContent    = ui.failIcon    || '📚';
      resultHeading.textContent = ui.failHeading || 'More Work Needed';
      resultMessage.textContent = ui.failMessage ||
        'You scored ' + score + ' out of ' + QUESTIONS_PER_QUIZ +
        '. You need at least ' + PASS_SCORE + '/20 to pass (90%). ' +
        'Review the source material and try again — you\'ll get there!';
    }

    scoreDisplay.textContent = score + ' / ' + QUESTIONS_PER_QUIZ;

    /* timing */
    timingInfo.textContent = 'Started: ' + fmtDate(startTime) + '   ·   Finished: ' + fmtDate(endTime);

    /* wrong answers list — built with textContent only (no innerHTML) */
    wrongList.innerHTML = '';

    function renderWrongItem(d) {
      const li = document.createElement('li');
      li.className = 'wrong-item';

      const qSpan = document.createElement('span');
      qSpan.className = 'wrong-q';
      qSpan.textContent = d.question;

      const yourSpan = document.createElement('span');
      yourSpan.className = 'wrong-ans';
      yourSpan.textContent = 'Your answer: ' + d.yourKey + ') ' + d.yourText;

      const correctSpan = document.createElement('span');
      correctSpan.className = 'correct-ans';
      correctSpan.textContent = 'Correct answer: ' + d.correctKey + ') ' + d.correctText;

      li.appendChild(qSpan);
      li.appendChild(yourSpan);
      li.appendChild(correctSpan);

      if (d.quote || d.explanation) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'explain-btn';
        toggleBtn.textContent = '📖 Show source';

        const explainDiv = document.createElement('div');
        explainDiv.className = 'explain-box hidden';

        if (d.quote) {
          const quoteP = document.createElement('p');
          quoteP.className = 'explain-quote';
          quoteP.textContent = '\u201c' + d.quote + '\u201d';
          explainDiv.appendChild(quoteP);
        }
        if (d.explanation) {
          const explainP = document.createElement('p');
          explainP.className = 'explain-text';
          explainP.textContent = d.explanation;
          explainDiv.appendChild(explainP);
        }

        toggleBtn.addEventListener('click', function () {
          const hidden = explainDiv.classList.toggle('hidden');
          toggleBtn.textContent = hidden ? '📖 Show source' : '📖 Hide source';
        });

        li.appendChild(toggleBtn);
        li.appendChild(explainDiv);
      }

      wrongList.appendChild(li);
    }

    if (wrongAnswers.length > 0) {
      wrongAnswers.forEach(function (w) {
        if (!z) {
          /* Zod not available (file:// origin) — render without validation */
          renderWrongItem(w);
          return;
        }
        const parsed = wrongAnswerSchema.safeParse(w);
        if (!parsed.success) {
          console.warn('[quiz] wrongAnswer parse failed:', parsed.error?.issues);
          return;
        }
        const d = parsed.data;
        renderWrongItem(d);
      });
      wrongSection.classList.remove('hidden');
    } else {
      wrongSection.classList.add('hidden');
    }

    /* score bar */
    requestAnimationFrame(function () {
      scoreBarFill.style.width      = (pct * 100) + '%';
      scoreBarFill.style.background = passed
        ? 'linear-gradient(90deg, #3ab569, #61d48c)'
        : 'linear-gradient(90deg, #e05b5b, #e0933a)';
    });

    /* parse + sanitise through Zod before storing/pushing */
    const parsed = resultSchema.safeParse({
      name:      playerName,
      started:   startTime.toISOString(),
      completed: endTime.toISOString(),
      score:     score,
      total:     QUESTIONS_PER_QUIZ,
      wrong:     wrongAnswers,
    });
    if (parsed.success) {
      saveResult(parsed.data);
      pushResultToFirestore(parsed.data);
    }

    /* expose final state for tests */
    window._quizState = { score: score, total: QUESTIONS_PER_QUIZ, passed: passed };
  }

  /* ── Event listeners ────────────────────────────────────────── */
  startBtn.addEventListener('click', startQuiz);

  restartBtn.addEventListener('click', function () {
    nextBtn.textContent = 'Next →';
    startQuiz();
  });

  downloadBtn.addEventListener('click', downloadCSV);

  nextBtn.addEventListener('click', function () {
    currentIndex++;
    if (currentIndex < QUESTIONS_PER_QUIZ) {
      renderQuestion();
    } else {
      showResults();
    }
  });

  optionBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleAnswer(btn.dataset.key);
    });
  });

  /* ── Init ───────────────────────────────────────────────────── */
  // Restore last-used name (may be overridden by auth callback)
  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName) playerNameInput.value = savedName;

  // Allow pressing Enter in the name field to start
  playerNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') startQuiz();
  });

  // Sign-in button handlers
  if (googleSigninBtn) {
    googleSigninBtn.addEventListener('click', function () {
      signinError.classList.add('hidden');
      QuizAuth.signInWithGoogle().catch(function (err) {
        signinError.textContent = err.message;
        signinError.classList.remove('hidden');
      });
    });
  }

  if (githubSigninBtn) {
    githubSigninBtn.addEventListener('click', function () {
      signinError.classList.add('hidden');
      QuizAuth.signInWithGitHub().catch(function (err) {
        signinError.textContent = err.message;
        signinError.classList.remove('hidden');
      });
    });
  }

  if (signoutBtn) {
    signoutBtn.addEventListener('click', function () { QuizAuth.signOut(); });
  }

  // Auth state drives which screen is shown.
  // When not configured (FIREBASE_CONFIG: {}), onReady fires synchronously
  // with (null, false) so local dev and Playwright tests work without auth.
  QuizAuth.init(function (user, configured) {
    if (!configured) {
      showScreen('start');
      return;
    }
    if (user) {
      if (user.displayName) playerNameInput.value = user.displayName;
      signedInName.textContent = 'Signed in as ' + (user.displayName || user.email);
      signedInBanner.classList.remove('hidden');
      showScreen('start');
    } else {
      signedInBanner.classList.add('hidden');
      showScreen('signin');
    }
  });

}());
