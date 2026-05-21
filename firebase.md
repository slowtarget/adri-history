# Firebase / Firestore Migration Plan

## Goal

Move `facts.json` and `questions.json` data into Firestore so we can:
- Query by taxonomy labels (`era`, `period`, `topic`, `theme`)
- Build a visual taxonomy browser showing the relationship between facts and questions
- Track quiz sessions per user (future)
- Keep the existing quiz working without any risk of regression

---

## Guiding principle

**Zero risk to the existing quiz.**  
The local JSON implementation stays untouched. Firestore is opt-in via a URL query parameter:

```
index.html            ← existing, local-data mode (default, unchanged)
index.html?data=firestore  ← new Firestore mode
```

Playwright tests always run against `/` (no query param) → still pass with no changes.

---

## Firestore collection layout

```
/facts/{factId}         e.g. F001, F002 …
  id            string
  fact          string
  explanation   string
  source_quote  string
  source_line   number
  labels        map { era, period, entity, topic, theme }

/questions/{questionId}   e.g. "1", "2" …
  id            number
  question      string
  answer        string
  distractors   array<string>
  fact_ids      array<string>
```

---

## Security rules (to be applied in Firebase console)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Facts and questions: public read, authenticated write (for migration)
    match /facts/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /questions/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Everything else: deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Implementation steps

### Step 1 — Firestore loader + minimal existing-file edits
**New file:** `firestore-loader.js`
- No-op when `?data=firestore` is not in the URL (local mode, behaviour identical to today)
- When `?data=firestore`: dynamically loads the Firestore compat SDK, fetches all facts
  (ordered by `source_line`) and all questions (ordered by `id`), replaces the
  `QUIZ_FACTS` / `QUIZ_QUESTIONS` globals, then injects `quiz.js`

**`index.html` change (2 lines):**
- Add `<script src="firestore-loader.js">` before the end of `<body>`
- Remove static `<script src="quiz.js">` (quiz.js is now injected by the loader)

**`auth.js` change (1 line):**
- Guard `firebase.initializeApp(cfg)` with `if (!firebase.apps.length)` so it is safe
  to call even if the loader already initialised Firebase

*Existing tests: unaffected — they hit `/` with no query param.*

---

### Step 2 — Browser-based migration tool (`migrate.html`)
**New file:** `migrate.html`
- Standalone page, loads `facts-data.js`, `questions-data.js`, Firebase SDK + Firestore
- User signs in with Google, clicks **Upload to Firestore**
- Writes every fact and question as individual documents using batched writes
- Shows live progress (e.g. "42 / 106 facts…") and a success/error summary
- Safe to re-run: uses `set()` so existing docs are overwritten, not duplicated

---

### Step 3 — Taxonomy tree view (`taxonomy.html`)
**New file:** `taxonomy.html`
- Reads data from Firestore (or local globals as fallback)
- Groups facts into a collapsible tree: **era → period → fact cards**
- Each fact card shows `topic`, `theme`, `entity` as tags, plus the linked quiz questions
- Pure HTML/CSS, no extra dependencies

---

### Step 4 — Taxonomy graph view (D3 force graph)
**Extends:** `taxonomy.html` — adds a second tab
- Nodes: facts (circles coloured by era) and questions (rectangles)
- Edges: `fact_ids` links (question → fact) + shared-era grouping (soft cluster)
- D3 v7 loaded from CDN; graceful fallback message if offline
- Zoom, pan, hover tooltips showing fact text

---

## Files changed per step

| Step | New files | Changed files |
|------|-----------|---------------|
| 1    | `firestore-loader.js` | `index.html` (2 lines), `auth.js` (1 line) |
| 2    | `migrate.html` | — |
| 3    | `taxonomy.html` | — |
| 4    | — | `taxonomy.html` (add graph tab) |

---

## How to use (after all steps are done)

1. **Apply Firestore rules** in the Firebase console (copy from above).
2. Open `migrate.html` in a browser served over HTTP (e.g. `npx serve .`), sign in, click Upload.
3. Open `index.html?data=firestore` to run the quiz against Firestore data.
4. Open `taxonomy.html?data=firestore` to browse the taxonomy.
