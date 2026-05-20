// quiz.spec.js — Playwright browser tests for the Iberian History Quiz
// Run from the tests/ directory:  npx playwright test
const { test, expect } = require('@playwright/test');

/** Navigate to the quiz and return the page. */
async function openQuiz(page) {
  await page.goto('/');
  await expect(page.locator('[data-screen="start"]')).toBeVisible();
  return page;
}

/** Click Start and wait for the first question to appear. */
async function startQuiz(page) {
  await page.click('[data-testid="start-btn"]');
  await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
  await expect(page.locator('[data-testid="question-text"]')).not.toBeEmpty();
}

/**
 * Answer the current question correctly by reading globalThis._quizState.
 * Returns whether the answer was correct (always true here).
 */
async function answerCorrectly(page) {
  const correctKey = await page.evaluate(() => globalThis._quizState.correctAnswer);
  await page.click(`[data-testid="option-${correctKey}"]`);
  return correctKey;
}

/**
 * Answer the current question with a wrong option.
 * Picks the first option that is NOT the correct answer.
 */
async function answerWrong(page) {
  const correctKey = await page.evaluate(() => globalThis._quizState.correctAnswer);
  const allKeys = ['A', 'B', 'C', 'D'];
  const wrongKey = allKeys.find(k => k !== correctKey);
  await page.click(`[data-testid="option-${wrongKey}"]`);
  return wrongKey;
}

/** Click Next (or See Results on the last question). */
async function clickNext(page) {
  await page.click('[data-testid="next-btn"]');
}

/**
 * Play through all 20 questions, answering each correctly or wrongly
 * depending on the `pattern` array (true = correct, false = wrong).
 * Pattern wraps if shorter than 20.
 */
async function playQuiz(page, pattern) {
  await startQuiz(page);
  for (let i = 0; i < 20; i++) {
    if (pattern[i % pattern.length]) {
      await answerCorrectly(page);
    } else {
      await answerWrong(page);
    }
    await clickNext(page);
    if (i < 19) {
      await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
    }
  }
  await expect(page.locator('[data-screen="results"]')).toBeVisible();
}

/* ──────────────────────────────────────────────────────────────── */
/* Start screen                                                      */
/* ──────────────────────────────────────────────────────────────── */

test('start screen is shown on load', async ({ page }) => {
  await openQuiz(page);
  await expect(page.locator('h1')).toContainText('Iberian History Quiz');
  await expect(page.locator('[data-testid="start-btn"]')).toBeVisible();
});

test('quiz and results screens are hidden on load', async ({ page }) => {
  await openQuiz(page);
  await expect(page.locator('[data-screen="quiz"]')).toBeHidden();
  await expect(page.locator('[data-screen="results"]')).toBeHidden();
});

/* ──────────────────────────────────────────────────────────────── */
/* Quiz screen basics                                                */
/* ──────────────────────────────────────────────────────────────── */

test('clicking Start shows the quiz screen with a question', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  await expect(page.locator('[data-testid="question-text"]')).not.toBeEmpty();
});

test('four answer options are displayed', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  for (const key of ['A', 'B', 'C', 'D']) {
    await expect(page.locator(`[data-testid="option-${key}"]`)).toBeVisible();
  }
});

test('question counter reads "Question 1 of 20" at start', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  await expect(page.locator('[data-testid="question-counter"]')).toHaveText('Question 1 of 20');
});

test('Next button is hidden before answering', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  await expect(page.locator('[data-testid="next-btn"]')).toBeHidden();
});

/* ──────────────────────────────────────────────────────────────── */
/* Answering questions                                               */
/* ──────────────────────────────────────────────────────────────── */

test('correct answer turns the option green', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  const key = await answerCorrectly(page);
  await expect(page.locator(`[data-testid="option-${key}"]`)).toHaveClass(/correct/);
});

test('wrong answer turns the selected option red and the correct option green', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  const correctKey = await page.evaluate(() => globalThis._quizState.correctAnswer);
  const wrongKey = ['A', 'B', 'C', 'D'].find(k => k !== correctKey);
  await page.click(`[data-testid="option-${wrongKey}"]`);
  await expect(page.locator(`[data-testid="option-${wrongKey}"]`)).toHaveClass(/wrong/);
  await expect(page.locator(`[data-testid="option-${correctKey}"]`)).toHaveClass(/correct/);
});

test('Next button appears after answering', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  await answerCorrectly(page);
  await expect(page.locator('[data-testid="next-btn"]')).toBeVisible();
});

test('options are disabled after answering so double-click has no effect', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  const key = await answerCorrectly(page);
  // clicking again should not change score
  await page.click(`[data-testid="option-${key}"]`);
  const score = await page.evaluate(() => globalThis._quizState.score);
  expect(score).toBe(1);
});

test('score tracker increments on correct answer', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  await answerCorrectly(page);
  await expect(page.locator('[data-testid="score-tracker"]')).toHaveText('Score: 1');
});

test('score tracker does not increment on wrong answer', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  await answerWrong(page);
  await expect(page.locator('[data-testid="score-tracker"]')).toHaveText('Score: 0');
});

/* ──────────────────────────────────────────────────────────────── */
/* Navigation through all 20 questions                              */
/* ──────────────────────────────────────────────────────────────── */

test('quiz advances through exactly 20 questions', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);

  for (let i = 1; i <= 20; i++) {
    await expect(page.locator('[data-testid="question-counter"]'))
      .toHaveText(`Question ${i} of 20`);
    await answerCorrectly(page);
    if (i < 20) {
      await clickNext(page);
    }
  }
  // On question 20 the next button says "See Results →"
  await expect(page.locator('[data-testid="next-btn"]')).toBeVisible();
  await clickNext(page);
  await expect(page.locator('[data-screen="results"]')).toBeVisible();
});

/* ──────────────────────────────────────────────────────────────── */
/* Results screen — passing (all 20 correct = 100%)                 */
/* ──────────────────────────────────────────────────────────────── */

test('getting all 20 correct shows the Congratulations screen', async ({ page }) => {
  await openQuiz(page);
  // all correct
  await playQuiz(page, [true]);
  await expect(page.locator('[data-testid="result-heading"]')).toContainText('Congratulations');
  await expect(page.locator('[data-testid="score-display"]')).toContainText('20 / 20');
});

test('getting 18/20 correct (90%) shows Congratulations', async ({ page }) => {
  await openQuiz(page);
  // 18 correct, 2 wrong: pattern [true,true,...,true,false,false]
  const pattern = new Array(18).fill(true).concat([false, false]);
  await playQuiz(page, pattern);
  await expect(page.locator('[data-testid="result-heading"]')).toContainText('Congratulations');
  await expect(page.locator('[data-testid="score-display"]')).toContainText('18 / 20');
});

/* ──────────────────────────────────────────────────────────────── */
/* Results screen — failing (below 90%)                             */
/* ──────────────────────────────────────────────────────────────── */

test('getting 17/20 (85%) shows "More Work Needed"', async ({ page }) => {
  await openQuiz(page);
  const pattern = new Array(17).fill(true).concat([false, false, false]);
  await playQuiz(page, pattern);
  await expect(page.locator('[data-testid="result-heading"]')).toContainText('More Work Needed');
  await expect(page.locator('[data-testid="score-display"]')).toContainText('17 / 20');
});

test('getting all 20 wrong shows "More Work Needed"', async ({ page }) => {
  await openQuiz(page);
  await playQuiz(page, [false]);
  await expect(page.locator('[data-testid="result-heading"]')).toContainText('More Work Needed');
  await expect(page.locator('[data-testid="score-display"]')).toContainText('0 / 20');
});

/* ──────────────────────────────────────────────────────────────── */
/* Restart / rerun                                                   */
/* ──────────────────────────────────────────────────────────────── */

test('"Try Again" button restarts the quiz at question 1', async ({ page }) => {
  await openQuiz(page);
  await playQuiz(page, [true]);
  await page.click('[data-testid="restart-btn"]');
  await expect(page.locator('[data-screen="quiz"]')).toBeVisible();
  await expect(page.locator('[data-testid="question-counter"]')).toHaveText('Question 1 of 20');
  await expect(page.locator('[data-testid="score-tracker"]')).toHaveText('Score: 0');
});

test('quiz produces a different question order on each run', async ({ page }) => {
  await openQuiz(page);
  await startQuiz(page);
  const firstRun = await page.evaluate(() =>
    globalThis._quizState.currentQuestion.id
  );

  // restart
  await answerCorrectly(page);
  // play through remaining 19 questions quickly
  for (let i = 1; i < 20; i++) {
    await clickNext(page);
    await answerCorrectly(page);
  }
  await clickNext(page); // show results
  await page.click('[data-testid="restart-btn"]');
  await expect(page.locator('[data-screen="quiz"]')).toBeVisible();

  // collect first questions of 5 more runs — at least one should differ
  const firstQuestions = [firstRun];
  for (let run = 0; run < 5; run++) {
    const q = await page.evaluate(() => globalThis._quizState.currentQuestion.id);
    firstQuestions.push(q);
    // just need one question per run — restart
    await answerCorrectly(page);
    for (let i = 1; i < 20; i++) {
      await clickNext(page);
      await answerCorrectly(page);
    }
    await clickNext(page);
    if (run < 4) {
      await page.click('[data-testid="restart-btn"]');
    }
  }
  const unique = new Set(firstQuestions);
  // With 100 questions and 5 restarts, the probability that ALL first
  // questions are identical is (1/100)^5 — effectively impossible.
  expect(unique.size).toBeGreaterThan(1);
});
