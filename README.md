# Adri History Quiz

An interactive multiple-choice quiz covering the Middle Ages in the Iberian Peninsula, built for a 14-year-old student.

## Live Quiz

👉 **https://slowtarget.github.io/adri-history/**

## How It Works

- 20 questions are selected randomly from a bank of 100 each time you play
- You need 18/20 (90%) to pass
- Wrong answers are listed on the results screen
- Results (name, time, score) are saved locally and pushed to a private CSV in GitHub

## Running Locally

No server required — just open the file directly:

```bash
open /Users/jasonf/Developer/adri/history/index.html
```

## Cloud Results

Results are saved to a separate private repo (`slowtarget/adri-quiz-results`) via the GitHub Contents API.  
See [token.md](token.md) for setup instructions.

## Running Tests

```bash
cd tests
npm install
npx playwright install chromium
npx playwright test
```

Test report is written to `tests/playwright-report/`.

## Tech Stack

- Vanilla HTML / CSS / JavaScript — no build step
- [Zod v3](https://zod.dev) (vendored) for input validation
- [Playwright](https://playwright.dev) for browser tests
- GitHub Pages for hosting
- GitHub Contents API for results persistence
