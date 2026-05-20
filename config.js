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
const firebaseConfig = {
  apiKey: "AIzaSyBCGOOP01T0EZ9BHBUVJc5GFoaB1Q6uMfw",
  authDomain: "adri-db0d8.firebaseapp.com",
  projectId: "adri-db0d8",
  storageBucket: "adri-db0d8.firebasestorage.app",
  messagingSenderId: "518606028152",
  appId: "1:518606028152:web:786c895df1022b88f85c8d",
  measurementId: "G-RCP5HMX17S"
};
var QUIZ_CONFIG = {
  GITHUB_OWNER: 'slowtarget',
  GITHUB_REPO:  'adri-quiz-results',   // separate repo — token can only touch this
  RESULTS_FILE: 'results.csv',
  GITHUB_TOKEN: '',   // ← injected by GitHub Actions from repo secret QUIZ_RESULTS_TOKEN

  // Firebase config for Google/GitHub OAuth sign-in.
  // Not a secret — safe to commit. Get values from Firebase console → Project settings → Web app.
  // Leave as {} to disable auth (local dev / Playwright tests).
  FIREBASE_CONFIG: firebaseConfig,
};
