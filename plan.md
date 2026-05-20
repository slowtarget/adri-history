# Iberian History Quiz — Project Plan

## Overview
An interactive, browser-based multiple-choice quiz for a 14-year-old covering the Middle Ages in the Iberian Peninsula (Al-Andalus and the Christian Kingdoms), sourced from `source.md`.

---

## Goals
- 100 multiple-choice questions drawn from `source.md`
- Each run randomly selects 20 questions in a random order
- Pass threshold: 90% (18 / 20 correct)
- End screen: **Congratulations** (≥ 18/20) or **More Work Needed** (< 18/20)
- Fully self-contained static web app — open `index.html` directly in a browser
- Browser-based Playwright test suite

---

## File Structure
```
history/
├── source.md              # Source material
├── plan.md                # This file
├── questions.json         # 100 MCQ questions (A/B/C/D) with answers
├── questions-data.js      # Same data exposed as window.QUIZ_QUESTIONS
├── index.html             # Quiz UI
├── style.css              # Styling
├── quiz.js                # Quiz logic
└── tests/
    ├── package.json       # Playwright dependency
    ├── playwright.config.js
    └── quiz.spec.js       # Browser tests
```

---

## Question Format (questions.json)
```json
{
  "id": 1,
  "question": "In which century did the Visigoths arrive in Europe?",
  "options": {
    "A": "3rd century",
    "B": "4th century",
    "C": "5th century",
    "D": "6th century"
  },
  "answer": "C"
}
```

---

## Quiz Flow
1. **Start screen** — title, topic description, Start button
2. **Question screen** — one question at a time with A/B/C/D buttons
   - Progress bar and "Question X of 20" counter
   - On selection: green = correct, red = wrong; correct answer always highlighted
   - "Next →" button appears after selection
3. **Results screen**
   - Score displayed (e.g. "You scored 17 / 20")
   - **Congratulations** banner if score ≥ 18 (90%)
   - **More Work Needed** banner if score < 18
   - "Try Again" button re-shuffles and restarts

---

## How to Run
```bash
# Simply open in browser (double-click or):
open index.html
```
No server required — all data is embedded via `questions-data.js`.

---

## How to Run Tests
```bash
cd tests
npm install
npx playwright install chromium
npx playwright test
```

---

## Topics Covered (source.md)
1. Visigothic Kingdom of Toledo
2. Al-Andalus — Dependent Emirate, Independent Emirate, Caliphate of Córdoba, Taifa Kingdoms, North African Empires (Almoravids & Almohads), Nasrid Kingdom of Granada
3. Christian Kingdoms — Asturias/León, Castile, Pamplona/Navarre, Aragon, El Cid
4. Key battles: Guadalete, Covadonga, Poitiers, Sagrajas, Lucena, Alarcos, Las Navas de Tolosa
5. Reconquista concept and timeline


todo - consider adding a subject area field to each question 

we can then ensure that each quiz has questions from a wide range of subject areas

also add some guidance on potentially weak areas in the results page

we may want to ask essentially the same question in multiple ways - where questions are very close in topic area, such that one may give the hint to the answer of the other, we should make them exclusive, perhaps we can do this by tagging questions and not allow questions with duplicate tags to arrive in the same set of 20 quiz questions

so I guess add a list of tags to each question could be a first step.

maybe better a heirarchy of subject areas ... -- like in 1-5 above -- then subdivide  

use genetic naming? for heirarchy levels
family class etc? another suggestion?

then ensure questions from all top level areas appear in the quiz, and none that share the lowest level.




