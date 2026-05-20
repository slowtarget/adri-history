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

## 2 — Add the Token as a GitHub Actions Secret

The token must **not** be committed to the repo — GitHub will block the push.  
Instead, store it as a repository secret and the deployment workflow injects it at build time.

1. Go to: https://github.com/slowtarget/adri-history/settings/secrets/actions/new
2. **Name**: `QUIZ_RESULTS_TOKEN`
3. **Secret**: paste the token you copied in step 1
4. Click **Add secret**

## 3 — Switch GitHub Pages Source to GitHub Actions

The deployment workflow (`.github/workflows/deploy.yml`) handles publishing.  
You need to tell GitHub to use it instead of the old "Deploy from branch" setting:

1. Go to: https://github.com/slowtarget/adri-history/settings/pages
2. Under **Source**, change from **Deploy from a branch** to **GitHub Actions**
3. Save

The next push to `main` will trigger the workflow and deploy with the token injected automatically.

## 4 — Using the Token Locally

The deployed site on GitHub Pages will have the token injected. For local use (opening `index.html` directly), cloud result saving won't work unless you temporarily add the token to your local `config.js`. **Do not commit that change** — use this to tell git to ignore it:

```bash
git update-index --skip-worktree config.js
```

To re-enable tracking later:

```bash
git update-index --no-skip-worktree config.js
```

## Security Notes

- The token is visible in the browser's page source of the deployed site — this is intentional and safe because:
  - It is scoped **only** to the `adri-quiz-results` repo
  - The worst an attacker can do is append garbage rows to `results.csv`
  - The quiz source code in `adri-history` is completely unaffected
- **Never commit the token** to the repository — GitHub push protection will block it
- Never use a classic token or a token scoped to more repos
- If the token is compromised, revoke it at https://github.com/settings/personal-access-tokens and create a new one, then update the repo secret

## Viewing Results

Results CSV: https://github.com/slowtarget/adri-quiz-results/blob/main/results.csv

Columns: `name, started, completed, score, total`
