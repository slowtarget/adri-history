// TEST FIXTURES ONLY — mirrors the 'tests' Firestore collection for local/Playwright use.
// Production data lives in Firestore. Do not add real content here.
// eslint-disable-next-line no-var
var QUIZ_TESTS = [
  {
    id: 'iberian_history',
    title: 'Iberian History Quiz',
    subtitle: 'The Middle Ages in the Iberian Peninsula',
    description: 'Test your knowledge of Al-Andalus, the Reconquista, and the Christian Kingdoms. You\'ll get 20 random questions each time \u2014 aim for 90%!',
    icon: '\u2694\ufe0f',
    questionsPerQuiz: 20,
    passThreshold: 0.9,
    active: true,
    ui: {
      passIcon: '\ud83c\udfc6',
      passHeading: 'Congratulations!',
      passMessage: 'Excellent work! You\'ve clearly mastered this material \u2014 keep it up!',
      failIcon: '\ud83d\udcda',
      failHeading: 'More Work Needed',
      failMessage: 'Review the source material and try again \u2014 you\'ll get there!'
    }
  }
];

// Set the active test as a convenience global (overridden by firestore-loader.js in production).
// eslint-disable-next-line no-var
var QUIZ_TEST = QUIZ_TESTS[0];
