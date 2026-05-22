// config.js — Firebase configuration for the Iberian History Quiz.
// Quiz results are stored in Firestore (write requires authentication).
// See migrate.html for required Firestore security rules.

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
// eslint-disable-next-line no-var
var QUIZ_CONFIG = {
  // Firebase config for Google/GitHub OAuth sign-in and Firestore result storage.
  // Not a secret — safe to commit. Get values from Firebase console → Project settings → Web app.
  FIREBASE_CONFIG: firebaseConfig,
};
