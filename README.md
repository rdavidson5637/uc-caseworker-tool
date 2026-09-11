# UC Caseworker Tool

An AI assistant for Universal Credit caseworkers, built as a portfolio project by a working UC caseworker with an MSc in Software Development. It demonstrates two things at once: understanding of the real caseworker workflow, and the ability to build safe, compliant software around an LLM.

**This project contains no real claimant data. Everything is synthetic.** See [Data governance](#data-governance) below.

This is a **prototype**, not an official DWP product. Nothing is sent automatically. The AI drafts; the caseworker decides.

## What it does

Three tools, all built around the same principle: the AI drafts, the caseworker decides.

**Journal Response Assistant.** A caseworker pastes a claimant journal message. The assistant first classifies the message for safeguarding and topic, then loads only the matching GOV.UK guidance from `data/`. It returns a claimant-facing draft, a guidance reference, a caseworker checklist, and a suggested internal case note. The caseworker reviews, edits and copies. Every draft is grounded only in the loaded guidance.

**Letter Population Tool.** A caseworker selects one of three demonstration letter types (UCD 157 Hardship Payment Payable, UCD 173 Underpayment No Arrears Due, UCD 367 Overpayment Without Civil Penalty). They can fill the form, or copy the whole case to-do (Ctrl+A, Ctrl+C), paste it, and choose "Fill fields from paste": the AI extracts only values explicitly present in the pasted text into the form, marks what it filled, and lists what it could not find. Extraction fills the form, never the letter. Generating the letter is **deterministic string replacement** — the AI does not rewrite fixed legal wording, rights information or contact details. Dates are formatted DD/MM/YYYY and amounts as £x.xx. Inconsistencies (end date before start date, zero amounts) are flagged above the letter, not written into it.

**Case Note Assistant.** A caseworker pastes a to-do dump or a short situation summary and gets an internal LMS-style note (third person, factual, action and next step). This note is never sent to the claimant. The same safeguarding classification runs first.

Each tab includes **Load example** buttons with synthetic fixtures, including a labelled safeguarding demo on the journal tab.

## The problem it solves

Caseworkers answer high volumes of journal messages, write handover notes, and populate repetitive standard letters every day. All three tasks carry cognitive load: the journal response has to be accurate against policy and empathetic in tone, the note has to be factual for the next person on the case, and the letters have to be populated without transposition errors. High-risk messages (suicide, domestic abuse, child safeguarding) must not be answered with a generic policy reply.

This tool reduces that load without removing the caseworker's judgement from the loop. Nothing is auto-sent. Safeguarding flags tell the caseworker which procedure to follow; they do not counsel the claimant or replace local process.

## Design principles

### Synthetic data only

This tool never uses, contains, or assumes real claimant data. All example journal messages, names and case details shipped with the project are fabricated. This matters because a portfolio project that handled real benefit data, even accidentally, would be a serious data protection failure. Building the constraint in from the start is the point.

### Placeholder values for operational data

All bank details, account numbers, sort codes and internal reference values use obvious placeholders: account name `DWP Debt Management`, sort code `00-00-00`, account number `PLACEHOLDER`, reference `NI-NUMBER-PLACEHOLDER`. In a real deployment these values would be injected as environment configuration at deploy time and never committed to version control. This is deliberate and demonstrates the same discipline applied to secrets: the repo contains the shape of the system, not its sensitive values.

Letter templates in this repo are **demonstration templates**, not official UCD forms. They must not be sent to a claimant.

### Human-in-the-loop, always

The AI drafts and suggests; the caseworker reviews, edits and sends. Nothing is ever sent automatically, and the UI makes this visible: outputs land in an editable review area, not an outbox. Copy buttons put text on the clipboard. Nothing is posted to the journal or a letter system.

### The AI never invents policy

The journal assistant is constrained by its system prompt to use only the guidance provided in the request. Classification picks the relevant guidance files so the model is not asked to search a dump of every topic. If the guidance does not cover a topic clearly, the tool says so rather than guessing. It never makes up figures, dates, amounts or policy details, and every response cites the guidance section it drew from.

Letters are not drafted by the model at all. The model may extract form fields from pasted to-do text; the letter itself is filled by code.

### Safeguarding is flagged, not delegated

If a message looks like suicide or self-harm, domestic abuse, child safeguarding, homelessness, coercion or a fraud admission, the UI shows a banner **before** the draft. Urgent flags tell the caseworker to follow the **Six Point Plan**, domestic abuse procedure, or local safeguarding children procedures. The model must not counsel, investigate, or invent next steps. For self-harm the draft may signpost Samaritans **116 123** and **999** if there is immediate danger. The banner states that this does not replace local procedure.

### Secrets never enter the repo

`.env` and `node_modules` are gitignored from the first commit. The Anthropic API key lives only in the local `.env` file (copy `.env.example` and add your key).

## Data protection in a real deployment

This is a local demo. A real deployment handling claimant data would need, at minimum:

- hosting within approved government infrastructure
- data processing agreements covering any third-party AI provider
- no claimant data retained by the AI provider (zero data retention terms)
- audit logging of every draft and every send
- role-based access control
- a DPIA before go-live
- Welsh language provision (this prototype is English only)
- official letter templates and operational bank details injected at deploy time, never committed
- alignment with local safeguarding procedures, including the Six Point Plan

The synthetic-only and placeholder-only rules in this repo exist so that none of those obligations are triggered by the portfolio version.

## Tech stack

- Frontend: vanilla HTML, CSS and JavaScript, styled to GOV.UK Design System patterns (Arial system stack; GDS Transport is licensed)
- Backend: Node.js with Express
- AI: Anthropic Claude API via the official SDK (classification, journal drafts, case notes, field extraction only)
- Config: dotenv

## Project structure

```
uc-caseworker-tool/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── examples.js          (synthetic demo fixtures)
├── backend/
│   ├── server.js
│   ├── ai.js                 (classify, journal draft, case note)
│   ├── guidance-loader.js
│   ├── letter-templates.js   (demonstration templates + fill)
│   ├── letter-validate.js
│   └── test-api.js
├── data/
│   └── guidance-*.txt        (plain-text copies of GOV.UK guidance)
├── .env                      (local only, never committed)
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

## Setup

```
npm install
cp .env.example .env    # then add your Anthropic API key
npm run test-api
npm start
```

Open `http://localhost:3000`.

Use the example buttons on each tab to run a demo without inventing data. The journal tab includes a labelled synthetic safeguarding example.

Letter generation does not call the AI. You can confirm a letter fills without a key:

```
curl -X POST http://localhost:3000/api/generate-letter \
  -H "Content-Type: application/json" \
  -d '{"letterType":"UCD157","fields":{"claimantName":"Jordan Hale","dateRequested":"2026-08-03","paymentAmount":"78.40","coverageStartDate":"2026-08-04","coverageEndDate":"2026-08-17","nextApplicationDate":"2026-08-18"}}'
```

## Guidance sources

The files in `data/` are plain-text copies of public GOV.UK guidance, retrieved 7 August 2026. Each file records its source URL. Content is Crown copyright, used under the Open Government Licence v3.0. Some URLs in the original project brief have since been restructured on GOV.UK; where that happened, the file notes the current equivalent page used.
