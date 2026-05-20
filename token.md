# Setting Up the GitHub PAT Token

The quiz pushes result rows to a separate private repo (`slowtarget/adri-quiz-results`) using a fine-grained Personal Access Token (PAT). Follow these steps to create and configure it.

## 1 — Create the Token

1. Go to: https://github.com/settings/personal-access-tokens/new
2. Fill in the form:
   - **Token name**: `adri-quiz-results`
   - **Expiration**: choose a date that suits you (e.g. 1 year)
   - **Repository access**: select **Only select repositories** → choose `adri-quiz-results`
3. Under **Permissions → Repository permissions**, set:
   - **Contents**: Read and Write
   - Everything else: No access
4. Click **Generate token** and copy the value immediately — you won't see it again.

## 2 — Add the Token to config.js

Open `config.js` and paste the token into the `GITHUB_TOKEN` field:

```js
var QUIZ_CONFIG = {
  GITHUB_OWNER: 'slowtarget',
  GITHUB_REPO:  'adri-quiz-results',
  RESULTS_FILE: 'results.csv',
  GITHUB_TOKEN: 'github_pat_YOUR_TOKEN_HERE',   // ← paste here
};
```

Or use the terminal:

```bash
cd /Users/jasonf/Developer/adri/history
sed -i '' "s/GITHUB_TOKEN: ''/GITHUB_TOKEN: 'github_pat_YOUR_TOKEN_HERE'/" config.js
```

## 3 — Commit and Push

```bash
git add config.js
git commit -m "Add results token"
git push
```

## Security Notes

- The token is visible in the browser's page source — this is intentional and safe because:
  - It is scoped **only** to the `adri-quiz-results` repo
  - The worst an attacker can do is append garbage rows to `results.csv`
  - The quiz source code in `adri-history` is completely unaffected
- Never use a classic token or a token scoped to more repos
- If the token is compromised, revoke it at https://github.com/settings/personal-access-tokens and create a new one

## Viewing Results

Results CSV: https://github.com/slowtarget/adri-quiz-results/blob/main/results.csv

Columns: `name, started, completed, score, total`
