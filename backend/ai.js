// Shared Anthropic helpers: JSON parsing, classification, journal draft, case note.

const { KNOWN_TOPICS } = require('./guidance-loader');

const VALID_FLAGS = [
  'self-harm',
  'domestic-abuse',
  'child-safeguarding',
  'homelessness',
  'coercion',
  'fraud-admission',
];

const VALID_LEVELS = ['none', 'alert', 'urgent'];

function parseJsonFromModel(raw) {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model output was not JSON');
  }
  return JSON.parse(text.slice(start, end + 1));
}

function emptySafeguarding() {
  return { level: 'none', flags: [], caseworkerAction: '' };
}

function normaliseClassification(parsed) {
  const topics = Array.isArray(parsed.topics)
    ? parsed.topics.filter((t) => KNOWN_TOPICS.includes(t))
    : [];

  const raw = parsed.safeguarding && typeof parsed.safeguarding === 'object'
    ? parsed.safeguarding
    : {};

  const flags = Array.isArray(raw.flags)
    ? raw.flags.filter((f) => VALID_FLAGS.includes(f))
    : [];

  let level = VALID_LEVELS.includes(raw.level) ? raw.level : 'none';
  if (flags.length === 0) {
    level = 'none';
  } else if (level === 'none') {
    level = flags.some((f) => f === 'self-harm' || f === 'child-safeguarding' || f === 'domestic-abuse')
      ? 'urgent'
      : 'alert';
  }

  const caseworkerAction =
    typeof raw.caseworkerAction === 'string' ? raw.caseworkerAction.trim() : '';

  return {
    topics: topics.length ? topics : ['overview'],
    safeguarding: {
      level,
      flags,
      caseworkerAction:
        caseworkerAction ||
        (level === 'none'
          ? ''
          : 'Follow local safeguarding procedure before sending any claimant-facing reply. This tool does not replace that procedure.'),
    },
  };
}

const CLASSIFY_SYSTEM_PROMPT = `You are classifying text that a Universal Credit caseworker has pasted into an internal assistant. The text is synthetic in this prototype, but you must treat it as if it were a real journal message or case note.

Return strict JSON only, no markdown, no commentary:
{
  "topics": ["one or more topic slugs"],
  "safeguarding": {
    "level": "none" | "alert" | "urgent",
    "flags": ["zero or more flag slugs"],
    "caseworkerAction": "one or two sentences telling the caseworker what procedure to follow, or empty string if none"
  }
}

Topic slugs (use only these):
- overpayments
- hardship
- advances
- sanctions
- mandatory-reconsideration
- payments
- health
- changes
- overview

Flag slugs (use only these):
- self-harm — suicide, ending their life, not wanting to be here, self-harm
- domestic-abuse — domestic abuse, partner violence, coerced control, fear of partner seeing the journal
- child-safeguarding — a child at risk of harm, neglect, or no food/housing for a child
- homelessness — nowhere to stay tonight, street homeless, imminent eviction with nowhere to go
- coercion — someone else forcing them to claim or controlling the claim
- fraud-admission — they say they have committed benefit fraud or are working and not reporting it

Level:
- urgent: self-harm, domestic-abuse, or child-safeguarding
- alert: homelessness, coercion, or fraud-admission without the urgent flags
- none: no flags

caseworkerAction rules:
- self-harm: Tell the caseworker to follow the Six Point Plan before any journal reply. If there is immediate danger they should call 999. Signpost Samaritans 116 123. Do not give counselling advice.
- domestic-abuse: Do not put sensitive detail in the journal (an abuser may have access). Follow local domestic abuse procedure and consider a private contact method.
- child-safeguarding: Follow local safeguarding children procedures and tell a team leader.
- Other flags: Tell a team leader and record the concern. Do not investigate fraud in the journal reply.
- Do not invent facts. Do not quote graphic detail. This classification does not replace professional judgement.`;

const JOURNAL_DRAFT_SYSTEM_PROMPT = `You are an assistant helping Universal Credit caseworkers at the Department for Work and Pensions draft responses to claimant journal messages. You must follow these rules strictly:

1. Base the claimant-facing draft only on the guidance provided. Do not use any knowledge outside of this guidance.
2. Write in a professional, clear and empathetic tone. Use short sentences and plain English.
3. Keep the draft concise - no more than three paragraphs.
4. Never make up figures, dates, amounts or policy details. If the guidance does not cover the topic clearly, say so rather than guessing.
5. Unless safeguarding is urgent, end the draft by directing the claimant to contact their caseworker or call 0800 328 5644 if they have further questions.
6. The draft is for the claimant journal. The case note is internal only.

If safeguarding.level is "urgent":
- Do not write a normal policy explanation as the main reply.
- The draft must briefly acknowledge that the message has been read, say a caseworker will contact them, and (only if self-harm is flagged) include Samaritans 116 123 and 999 if they are in immediate danger.
- Do not counsel, assess risk, or ask investigative questions in the draft.
- The first checklist item must be the procedure in safeguarding.caseworkerAction.
- The case note must record that a safeguarding concern was identified and which procedure to follow, without repeating unnecessary sensitive detail.

If safeguarding.level is "alert":
- You may answer the policy question, but the checklist must start with the procedure to follow.
- Do not put domestic-abuse or coercion detail in the claimant-facing draft.

Return strict JSON only:
{
  "draft": "claimant-facing journal reply",
  "guidanceReference": "brief note on which guidance section informed the draft",
  "checklist": ["things the caseworker must verify or do before sending"],
  "caseNote": "internal LMS-style note, third person, factual, includes action and next step, not for the claimant"
}`;

const CASE_NOTE_SYSTEM_PROMPT = `You are an assistant helping Universal Credit caseworkers write internal case notes (LMS / to-do notes). You must follow these rules strictly:

1. Write in the third person. Be factual and concise. Do not give the claimant advice in the note.
2. Do not invent figures, dates, amounts, decisions or policy. If a detail is not in the source text, omit it.
3. Include: what was reported or requested, what action the caseworker is taking or should take, and the next step.
4. This note is internal. It is never sent to the claimant.
5. If safeguarding is urgent or alert, open the note with the procedure to follow. Do not repeat unnecessary sensitive detail. Do not counsel.

Return strict JSON only:
{
  "note": "the internal case note",
  "checklist": ["things the caseworker should do or verify"]
}`;

async function classifyText(client, model, text) {
  const response = await client.messages.create({
    model,
    max_tokens: 400,
    system: CLASSIFY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Classify this caseworker-pasted text:\n\n${text}`,
      },
    ],
  });

  const parsed = parseJsonFromModel(response.content[0].text);
  return normaliseClassification(parsed);
}

function fallbackClassification() {
  return {
    topics: ['overview'],
    safeguarding: emptySafeguarding(),
  };
}

async function draftJournal(client, model, { journalMessage, guidance, classification }) {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: JOURNAL_DRAFT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          `Classification: ${JSON.stringify(classification)}`,
          `Here is the Universal Credit guidance:\n${guidance}`,
          `The claimant has sent this journal message:\n${journalMessage}`,
          'Draft the JSON object now.',
        ].join('\n\n'),
      },
    ],
  });

  const parsed = parseJsonFromModel(response.content[0].text);
  const checklist = Array.isArray(parsed.checklist)
    ? parsed.checklist.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    draft: typeof parsed.draft === 'string' ? parsed.draft.trim() : '',
    guidanceReference:
      typeof parsed.guidanceReference === 'string' ? parsed.guidanceReference.trim() : '',
    checklist,
    caseNote: typeof parsed.caseNote === 'string' ? parsed.caseNote.trim() : '',
  };
}

async function draftCaseNote(client, model, { sourceText, classification }) {
  const response = await client.messages.create({
    model,
    max_tokens: 800,
    system: CASE_NOTE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          `Classification: ${JSON.stringify(classification)}`,
          `Source text from the caseworker:\n${sourceText}`,
          'Draft the JSON object now.',
        ].join('\n\n'),
      },
    ],
  });

  const parsed = parseJsonFromModel(response.content[0].text);
  const checklist = Array.isArray(parsed.checklist)
    ? parsed.checklist.map((item) => String(item)).filter(Boolean)
    : [];

  return {
    note: typeof parsed.note === 'string' ? parsed.note.trim() : '',
    checklist,
  };
}

module.exports = {
  parseJsonFromModel,
  classifyText,
  fallbackClassification,
  draftJournal,
  draftCaseNote,
  VALID_FLAGS,
  CLASSIFY_SYSTEM_PROMPT,
};
