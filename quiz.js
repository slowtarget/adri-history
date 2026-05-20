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

  /* ── DOM refs ───────────────────────────────────────────────── */
  const screens = {
    start:   document.getElementById('start-screen'),
    quiz:    document.getElementById('quiz-screen'),
    results: document.getElementById('results-screen'),
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

  /* ── Validation / sanitisation ────────────────────────────── */

  // Strip HTML tags and control characters from any string before display.
  function sanitizeText(raw) {
    return String(raw)
      .replace(/[\x00-\x1F\x7F]/g, '')   // strip control chars
      .replace(/<[^>]*>/g, '')             // strip any HTML tags
      .slice(0, 500);                      // hard length cap
  }

  // Validate that a value is a safe finite integer in [0, max].
  function validateInt(v, max) {
    const n = Number(v);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= max ? n : 0;
  }

  // Validate an ISO date string; returns a Date or null.
  function validateDate(s) {
    const d = new Date(s);
    return (typeof s === 'string' && !isNaN(d.getTime())) ? d : null;
  }

  // Validate an answer key is exactly one of A–D.
  function validateKey(k) {
    return /^[ABCD]$/.test(String(k)) ? String(k) : '?';
  }

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
      // Validate every field before writing to CSV
      const started   = validateDate(r.started);
      const completed = validateDate(r.completed);
      if (!started || !completed) return; // skip corrupt rows
      const sc    = validateInt(r.score, 100);
      const total = validateInt(r.total, 100) || QUESTIONS_PER_QUIZ;
      const wrongSummary = (Array.isArray(r.wrong) ? r.wrong : []).map(function (w) {
        return sanitizeText(w.question) +
          ' [Correct: ' + validateKey(w.correctKey) + ') ' + sanitizeText(w.correctText) + ']';
      }).join(' | ');
      lines.push([
        csvCell(sanitizeText(r.name || 'Anonymous')),
        csvCell(started.toLocaleDateString()),
        csvCell(started.toLocaleTimeString()),
        csvCell(completed.toLocaleTimeString()),
        csvCell(sc),
        csvCell(total),
        csvCell(Math.round(sc / total * 100) + '%'),
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

  /* ── GitHub API: append one row to results.csv in the repo ─── */
  async function pushResultToGitHub(entry) {
    const cfg = (typeof QUIZ_CONFIG !== 'undefined') ? QUIZ_CONFIG : {};
    if (!cfg.GITHUB_TOKEN) return; // silently skip if not configured

    const apiURL = 'https://api.github.com/repos/' +
      cfg.GITHUB_OWNER + '/' + cfg.GITHUB_REPO +
      '/contents/' + cfg.RESULTS_FILE;

    const headers = {
      'Authorization': 'Bearer ' + cfg.GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    /* 1. Fetch existing file (get SHA + current content) */
    let sha     = null;
    let current = '';
    try {
      const res = await fetch(apiURL, { headers: headers });
      if (res.ok) {
        const data = await res.json();
        sha     = data.sha;
        current = fromB64(data.content);
      }
    } catch (_) { /* file doesn't exist yet — that's fine */ }

    /* 2. Build new row */
    const started   = new Date(entry.started);
    const completed = new Date(entry.completed);
    const wrongSummary = entry.wrong.map(function (w) {
      return w.question + ' [Correct: ' + w.correctKey + ') ' + w.correctText + ']';
    }).join(' | ');
    const newRow = [
      csvCell(entry.name || 'Anonymous'),
      csvCell(started.toLocaleDateString()),
      csvCell(started.toLocaleTimeString()),
      csvCell(completed.toLocaleTimeString()),
      csvCell(entry.score),
      csvCell(entry.total),
      csvCell(Math.round(entry.score / entry.total * 100) + '%'),
      csvCell(wrongSummary || 'None'),
    ].join(',');

    const CSV_HEADER = 'Name,Date,Time Started,Time Completed,Score,Out Of,Percentage,Wrong Questions';
    const newContent = (current ? current.trimEnd() + '\n' : CSV_HEADER + '\n') + newRow + '\n';

    /* 3. Commit the updated file */
    const body = {
      message: 'Add quiz result for ' + (entry.name || 'Anonymous'),
      content: toB64(newContent),
    };
    if (sha) body.sha = sha;

    try {
      await fetch(apiURL, {
        method:  'PUT',
        headers: headers,
        body:    JSON.stringify(body),
      });
    } catch (_) { /* fail silently — local results are already saved */ }
  }

  /* ── Quiz flow ──────────────────────────────────────────────── */
  function startQuiz() {
    playerName = (playerNameInput.value || '').trim() || 'Anonymous';
    localStorage.setItem(NAME_KEY, playerName);
    selectedQuestions = shuffle(QUIZ_QUESTIONS).slice(0, QUESTIONS_PER_QUIZ);
    currentIndex = 0;
    score = 0;
    wrongAnswers = [];
    startTime = new Date();
    showScreen('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    const q = selectedQuestions[currentIndex];
    const num = currentIndex + 1;

    /* progress */
    questionCounter.textContent = 'Question ' + num + ' of ' + QUESTIONS_PER_QUIZ;
    progressFill.style.width = (num / QUESTIONS_PER_QUIZ * 100) + '%';
    scoreTracker.textContent = 'Score: ' + score;

    /* question */
    questionText.textContent = q.question;

    /* options */
    const keys = ['A', 'B', 'C', 'D'];
    keys.forEach(function (key) {
      const btn = document.querySelector('.option[data-key="' + key + '"]');
      btn.className = 'option';
      btn.disabled = false;
      document.getElementById('text-' + key).textContent = q.options[key];
    });

    nextBtn.classList.add('hidden');

    // expose state for tests
    window._quizState = {
      currentQuestion: q,
      correctAnswer: q.answer,
      currentIndex: currentIndex,
      score: score,
    };
  }

  function handleAnswer(selectedKey) {
    if (answered) return;
    answered = true;

    const q = selectedQuestions[currentIndex];
    const isCorrect = selectedKey === q.answer;

    if (isCorrect) score++;

    /* style all option buttons */
    optionBtns.forEach(function (btn) {
      btn.disabled = true;
      if (btn.dataset.key === q.answer) {
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
      wrongAnswers.push({
        question:    q.question,
        yourKey:     selectedKey,
        yourText:    q.options[selectedKey],
        correctKey:  q.answer,
        correctText: q.options[q.answer],
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

    if (passed) {
      resultIcon.textContent    = '🏆';
      resultHeading.textContent = 'Congratulations!';
      resultMessage.textContent =
        'Excellent work! You scored ' + score + ' out of ' + QUESTIONS_PER_QUIZ +
        '. You\'ve clearly mastered this material — keep it up!';
    } else {
      resultIcon.textContent    = '📖';
      resultHeading.textContent = 'More Work Needed';
      resultMessage.textContent =
        'You scored ' + score + ' out of ' + QUESTIONS_PER_QUIZ +
        '. You need at least ' + PASS_SCORE + '/20 to pass (90%). ' +
        'Review the source material and try again — you\'ll get there!';
    }

    scoreDisplay.textContent = score + ' / ' + QUESTIONS_PER_QUIZ;

    /* timing */
    timingInfo.textContent = 'Started: ' + fmtDate(startTime) + '   ·   Finished: ' + fmtDate(endTime);

    /* wrong answers list — built with textContent only (no innerHTML) */
    wrongList.innerHTML = '';
    if (wrongAnswers.length > 0) {
      wrongAnswers.forEach(function (w) {
        // Validate every field before touching the DOM
        const qText      = sanitizeText(w.question);
        const yourKey    = validateKey(w.yourKey);
        const yourText   = sanitizeText(w.yourText);
        const correctKey = validateKey(w.correctKey);
        const correctText = sanitizeText(w.correctText);

        const li = document.createElement('li');
        li.className = 'wrong-item';

        const qSpan = document.createElement('span');
        qSpan.className = 'wrong-q';
        qSpan.textContent = qText;

        const yourSpan = document.createElement('span');
        yourSpan.className = 'wrong-ans';
        yourSpan.textContent = 'Your answer: ' + yourKey + ') ' + yourText;

        const correctSpan = document.createElement('span');
        correctSpan.className = 'correct-ans';
        correctSpan.textContent = 'Correct answer: ' + correctKey + ') ' + correctText;

        li.appendChild(qSpan);
        li.appendChild(yourSpan);
        li.appendChild(correctSpan);
        wrongList.appendChild(li);
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

    /* persist to localStorage — validate fields before storing */
    const entry = {
      name:      sanitizeText(playerName).slice(0, 60) || 'Anonymous',
      started:   startTime.toISOString(),
      completed: endTime.toISOString(),
      score:     validateInt(score, QUESTIONS_PER_QUIZ),
      total:     QUESTIONS_PER_QUIZ,
      wrong:     wrongAnswers.map(function (w) {
        return {
          question:    sanitizeText(w.question),
          yourKey:     validateKey(w.yourKey),
          yourText:    sanitizeText(w.yourText),
          correctKey:  validateKey(w.correctKey),
          correctText: sanitizeText(w.correctText),
        };
      }),
    };
    saveResult(entry);

    /* push to GitHub (async, non-blocking) */
    pushResultToGitHub(entry);

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
  // Restore last-used name
  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName) playerNameInput.value = savedName;

  // Allow pressing Enter in the name field to start
  playerNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') startQuiz();
  });

  showScreen('start');

}());
