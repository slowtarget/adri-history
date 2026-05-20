// config.js — configure to enable cloud result saving to GitHub
//
// SETUP (one-time):
//   1. Go to https://github.com/settings/personal-access-tokens/new
//   2. Token name: adri-quiz-results
//   3. Repository access: Only select "adri-history"
//   4. Permissions → Repository permissions → Contents: Read and Write
//   5. Generate token, paste it below as GITHUB_TOKEN
//
// The token only has write access to this one repo's contents — no other
// permissions are granted, so the exposure risk is minimal.

// eslint-disable-next-line no-var
var QUIZ_CONFIG = {
  GITHUB_OWNER: 'slowtarget',
  GITHUB_REPO:  'adri-quiz-results',   // separate repo — token can only touch this
  RESULTS_FILE: 'results.csv',
  GITHUB_TOKEN: '',   // ← paste your fine-grained PAT here
};
