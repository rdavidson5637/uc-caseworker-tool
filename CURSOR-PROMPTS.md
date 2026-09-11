# Cursor prompts - run in order, test after each

Delete this file before pushing to GitHub, or keep it as build documentation. Either works, but decide deliberately.

Before prompt 1: `npm install`, copy `.env.example` to `.env`, add your real API key. Confirm `git status` does not show `.env` or `node_modules` before your first commit.

---

## Prompt 1 - test-api.js

```
Create backend/test-api.js. It loads the API key from .env using dotenv (require('dotenv').config() with the path resolved relative to the project root, since I run scripts from the project root), creates an Anthropic client from @anthropic-ai/sdk, and sends one small test message ("Say API connection successful and nothing else") to claude-sonnet-4-5 with max_tokens 50. Log the text of the response on success. On failure, log a clear error distinguishing a missing key (process.env.ANTHROPIC_API_KEY undefined) from an API error. Exit with code 1 on failure. No Express, no other files.
```

Test: `node backend/test-api.js` prints the success message.

---

## Prompt 2 - guidance-loader.js

```
Create backend/guidance-loader.js. Export a single function loadGuidance() that synchronously reads every .txt file in the data/ directory (resolve the path relative to this file with path.join(__dirname, '..', 'data') so it works regardless of cwd), sorts filenames alphabetically for deterministic output, and returns one combined string. Before each file's content, insert a separator line: "===== SOURCE FILE: <filename> =====". If the data directory is missing or contains no .txt files, throw an Error with a clear message rather than returning an empty string. CommonJS modules. No other files.
```

Test: `node -e "console.log(require('./backend/guidance-loader')().length)"` prints a large number (should be 25k+ characters).

---

## Prompt 3 - /api/journal-response route

```
Create backend/server.js. Express app, port 3000. Middleware: express.json() and express.static for the frontend/ directory (path resolved relative to the file). Load dotenv at the top. Create one Anthropic client at module level.

Add POST /api/journal-response. Body: { journalMessage: string }. Validate journalMessage exists, is a string, and is under 5000 characters; return 400 with { error } if not. Call loadGuidance() from guidance-loader.js once at server startup, not per request, and store it in a constant.

Call the Anthropic API (claude-sonnet-4-5, max_tokens 1024) with this exact system message:

"You are an assistant helping Universal Credit caseworkers at the Department for Work and Pensions draft responses to claimant journal messages. You must follow these rules strictly:
1. Base your response only on the guidance provided. Do not use any knowledge outside of this guidance.
2. Write in a professional, clear and empathetic tone appropriate for communication with benefit claimants.
3. Keep responses concise - no more than three paragraphs.
4. Never make up figures, dates, amounts or policy details. If the guidance does not cover the topic clearly, say so rather than guessing.
5. Always end by directing the claimant to contact their caseworker or call 0800 328 5644 if they have further questions.
6. After your response add a line break then write \"Guidance reference:\" followed by a brief note on which section of the guidance informed your response."

User message: "Here is the Universal Credit guidance: [guidance]. The claimant has sent this journal message: [journalMessage]. Draft a response the caseworker can review, edit and send." with the bracketed values interpolated.

Respond with { draft: <text> }. Wrap the API call in try/catch; on error return 500 with { error: "AI service unavailable" } and log the real error server-side only. Do not add the letter route yet.
```

Test: start the server, then
`curl -X POST http://localhost:3000/api/journal-response -H "Content-Type: application/json" -d '{"journalMessage":"Hi, I got a letter saying I was overpaid and I dont understand why. Do I have to pay it back?"}'`
Draft should reference the overpayments guidance and end with the helpline line.

---

## Prompt 4 - /api/generate-letter route

```
In backend/server.js, add POST /api/generate-letter. Body: { letterType: string, fields: object }. Validate letterType is one of "UCD157", "UCD173", "UCD367" and fields is a non-empty object; 400 with { error } otherwise.

Add a LETTER_TEMPLATES constant near the top: an object keyed by letter type. For now each entry is a short placeholder string like "PLACEHOLDER TEMPLATE for UCD 157 - real template text added in a later step. Variable fields: [list the field names]". Real templates get pasted in at prompt 9.

Call the Anthropic API (claude-sonnet-4-5, max_tokens 2048) with this exact system message:

"You are an assistant helping Universal Credit caseworkers populate standard DWP letter templates. You must follow these rules strictly:
1. Use only the variable details provided. Do not add, change or invent any information.
2. Do not alter any fixed legal wording, rights information, contact details or procedural content.
3. Insert the provided details naturally so the letter reads clearly and professionally.
4. Before producing the letter, check for inconsistencies in the provided details - for example a date range where the end date is before the start date, or a zero payment amount. If you find any issues, flag them clearly at the top of your response before the letter.
5. Output the complete populated letter ready for the caseworker to review.
6. Do not add any commentary after the letter."

User message: "Letter type: [letterType]. Variable details provided by the caseworker: [fields formatted as a 'Key: value' list, one per line]. Fixed letter template: [template]. Populate the template using only the variable details provided."

Respond with { letter: <text> }. Same error handling pattern as the journal route. Do not modify the journal route.
```

Test: `curl -X POST http://localhost:3000/api/generate-letter -H "Content-Type: application/json" -d '{"letterType":"UCD157","fields":{"claimantName":"Test Person","amount":"0"}}'`
Expect a populated placeholder letter with the zero amount flagged at the top.

---

## Prompt 5 - index.html shell

```
Create frontend/index.html. Single file, PicoCSS via CDN (https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css). No JavaScript logic yet beyond tab switching.

Structure:
- Header: "UC Caseworker Assistant" with a small subtitle "Synthetic data only - AI drafts, caseworker decides".
- Two tabs: "Journal Response" and "Letter Population". Implement tab switching with a few lines of inline JS toggling a hidden class.
- Journal tab: a labelled textarea for the claimant's journal message, a "Draft response" button, and an output section containing an editable textarea labelled "Draft for review - edit before sending" plus a visible static note: "This is a draft. Nothing is sent automatically."
- Letter tab: a select for letter type (UCD 157 - Hardship Payment Payable / UCD 173 - Underpayment No Arrears Due / UCD 367 - Overpayment Without Civil Penalty), an empty div#letter-fields where the dynamic form will render, a "Generate letter" button, and an output section matching the journal tab's editable-draft pattern with the same nothing-sent-automatically note.
- Give every interactive element a sensible id. Add an empty div for inline error messages in each tab.
```

Test: `node backend/server.js`, open http://localhost:3000, both tabs render and switch.

---

## Prompt 6 - journal response frontend JS

```
In frontend/index.html, wire up the Journal Response tab. On "Draft response" click: read the textarea, client-side validate non-empty, show the error div if empty. POST to /api/journal-response with fetch, JSON body { journalMessage }. While waiting, disable the button and set its text to "Drafting...". On success, put the draft into the editable review textarea. On failure (non-200 or network error), show the server's error message or a generic one in the error div. Always restore the button state in finally. Do not touch the letter tab.
```

Test: paste a synthetic message about hardship payments in the UI, get a draft grounded in the hardship guidance.

---

## Prompt 7 - dynamic letter form fields

```
In frontend/index.html, add a LETTER_FIELDS config object and render the form into div#letter-fields whenever the letter type select changes.

UCD157 (6 fields): claimant full name (text), date payment was requested (date), payment amount in pounds (number, min 0.01, step 0.01), coverage start date (date), coverage end date (date), date they can apply for another payment (date).

UCD173 (14 fields): claimant full name (text), entitlement amount (number), entitlement start date (date), entitlement end date (date), reason for underpayment (text), benefit type already paid (select: Employment and Support Allowance / Jobseeker's Allowance / Housing Benefit / Income Support), amount already paid (number), already paid start date (date), already paid end date (date), date from which nothing is owed (date), amount already paid repeated (number), benefit type repeated (same select options), second date range start (date), second date range end (date).

UCD367 (6 fields, one conditional): claimant full name (text), amount overpaid (number), date type (radio: "Single date" or "Date range"), then conditionally show either one overpayment date (date) or start and end dates (two date inputs), reason for overpayment (text), benefit type (same select options).

Each field has a label and a name attribute in camelCase. Render the correct fields on page load for the initially selected type. No submission logic yet.
```

Test: switch between the three letter types; field sets change correctly; UCD 367's radio toggles one date vs two.

---

## Prompt 8 - letter generation frontend JS

```
In frontend/index.html, wire up "Generate letter". On click: collect all rendered field values into an object keyed by field name (for UCD367 include only the date fields relevant to the selected date type). Client-side validate all visible fields are filled; show which are missing in the error div. POST to /api/generate-letter with { letterType, fields }, same loading/disable/error pattern as the journal tab. On success, put the letter into the editable review textarea.
```

Test: full round trip for each letter type. Also submit an end date before a start date and confirm the inconsistency flag appears at the top of the output.

---

## Prompt 9 - real letter templates

```
In backend/server.js, replace the three placeholder entries in LETTER_TEMPLATES with the full letter texts I am pasting below. Treat every fixed section as immutable content within the template string. Bank details must remain exactly: account name DWP Debt Management, sort code 00-00-00, account number PLACEHOLDER, reference NI-NUMBER-PLACEHOLDER. Mark variable insertion points in the templates as [FIELD: fieldName] matching the frontend field names. Do not change anything else in the file.

[PASTE THE THREE FULL TEMPLATES HERE]
```

Test: generate each letter, check every variable field lands in the right place and fixed sections are word-for-word identical to your source, placeholders intact.

---

## Prompt 10 - polish and GOV.UK styling

```
Restyle frontend/index.html toward GOV.UK internal-tool conventions while keeping PicoCSS as the base: GDS Transport is licensed, so use a system font stack with Arial; black header band with white "UC Caseworker Assistant" text; GOV.UK blue (#1d70b8) for primary buttons and tab highlights; error messages styled with the GOV.UK error pattern (red left border, bold message); form labels bold and above inputs; clear focus states (yellow #ffdd00 outline). Add a footer note: "Portfolio demonstration. Synthetic data only. Not an official DWP product." Check both tabs, loading states and error states still work. Do not change any backend code or any API behaviour.
```

Test: full manual pass of both features, including error states (stop the server and try a request; submit empty forms; inconsistent dates).

---

## After prompt 10

- Commit history check: confirm no commit ever contained .env
- README already covers the narrative; update if anything drifted during the build
- Push, then run through the demo script once cold: journal message about an overpayment, then a UCD 367 with a deliberate date error
