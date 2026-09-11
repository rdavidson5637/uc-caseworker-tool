// UC Caseworker Tool - backend
// Journal replies, case notes and letter population.
// Human-in-the-loop by design: every route returns a draft only. Nothing is sent.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const loadGuidance = require('./guidance-loader');
const { loadGuidanceByTopics } = require('./guidance-loader');
const {
  classifyText,
  fallbackClassification,
  draftJournal,
  draftCaseNote,
  parseJsonFromModel,
} = require('./ai');
const { populateLetter, LETTER_FIELD_NAMES } = require('./letter-templates');
const { validateLetterFields } = require('./letter-validate');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = 'claude-sonnet-4-5';

const client = new Anthropic();

const GUIDANCE = loadGuidance();
console.log(`Guidance loaded: ${GUIDANCE.length} characters`);

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const EXTRACT_SYSTEM_PROMPT = `You are an assistant helping Universal Credit caseworkers extract letter field values from case text they have copied from their case system. You must follow these rules strictly:
1. Extract a value for a field only if it is explicitly and unambiguously present in the pasted text. Never guess, infer, calculate or invent a value.
2. Output strict JSON only: a single object whose keys are exactly the field names provided, and nothing else. No markdown, no code fences, no commentary.
3. Use null for any field whose value is not clearly present in the text.
4. Format all dates as YYYY-MM-DD. If a date in the text cannot be resolved to a full date, use null.
5. Format all monetary amounts as plain numbers with no currency symbol (for example 156.40).
6. For benefit type fields, the value must be exactly one of: "Employment and Support Allowance", "Jobseeker's Allowance", "Housing Benefit", "Income Support". If the text names a different benefit or is unclear, use null.
7. For the dateType field (UCD367 only), use exactly "Single date" or "Date range" based on what the text supports, otherwise null.`;

function requireString(value, name, maxLength) {
  if (!value || typeof value !== 'string') {
    return `${name} is required and must be a string.`;
  }
  if (value.length > maxLength) {
    return `${name} must be under ${maxLength} characters.`;
  }
  return null;
}

async function safeClassify(text) {
  try {
    return await classifyText(client, MODEL, text);
  } catch (err) {
    console.error('Classification failed, continuing without flags:', err.message);
    return fallbackClassification();
  }
}

// ---------------------------------------------------------------------------
// POST /api/journal-response
// Classify first (safeguarding + topics), then draft from matching guidance.
// ---------------------------------------------------------------------------
app.post('/api/journal-response', async (req, res) => {
  const { journalMessage } = req.body || {};
  const invalid = requireString(journalMessage, 'journalMessage', 5000);
  if (invalid) {
    return res.status(400).json({ error: invalid });
  }

  try {
    const classification = await safeClassify(journalMessage);
    const selected = loadGuidanceByTopics(classification.topics);

    let drafted;
    try {
      drafted = await draftJournal(client, MODEL, {
        journalMessage,
        guidance: selected.text,
        classification,
      });
    } catch (draftErr) {
      console.error('Structured journal draft failed, falling back to plain text:', draftErr.message);
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system:
          'You are helping a Universal Credit caseworker draft a journal reply. Use only the guidance provided. No more than three paragraphs. Never invent figures. End with the helpline 0800 328 5644 unless the message is a safeguarding emergency, in which case acknowledge the message, say a caseworker will contact them, and include Samaritans 116 123 if self-harm is relevant.',
        messages: [
          {
            role: 'user',
            content: `Guidance:\n${selected.text}\n\nClassification:\n${JSON.stringify(classification)}\n\nJournal message:\n${journalMessage}`,
          },
        ],
      });
      drafted = {
        draft: response.content[0].text,
        guidanceReference: selected.files.join(', '),
        checklist: classification.safeguarding.level === 'none'
          ? ['Check the draft against the to-do before sending.']
          : [classification.safeguarding.caseworkerAction],
        caseNote: '',
      };
    }

    res.json({
      safeguarding: classification.safeguarding,
      topics: classification.topics,
      guidanceFiles: selected.files,
      draft: drafted.draft,
      guidanceReference: drafted.guidanceReference,
      checklist: drafted.checklist,
      caseNote: drafted.caseNote,
    });
  } catch (err) {
    console.error('Journal response error:', err);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/case-note
// Internal LMS-style note. Never sent to the claimant.
// ---------------------------------------------------------------------------
app.post('/api/case-note', async (req, res) => {
  const { sourceText } = req.body || {};
  const invalid = requireString(sourceText, 'sourceText', 8000);
  if (invalid) {
    return res.status(400).json({ error: invalid });
  }

  try {
    const classification = await safeClassify(sourceText);
    const drafted = await draftCaseNote(client, MODEL, {
      sourceText,
      classification,
    });

    res.json({
      safeguarding: classification.safeguarding,
      topics: classification.topics,
      note: drafted.note,
      checklist: drafted.checklist,
    });
  } catch (err) {
    console.error('Case note error:', err);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/generate-letter
// Deterministic template fill. No LLM. Warnings are returned separately.
// ---------------------------------------------------------------------------
app.post('/api/generate-letter', (req, res) => {
  const { letterType, fields } = req.body || {};

  if (!letterType || !Object.prototype.hasOwnProperty.call(LETTER_FIELD_NAMES, letterType)) {
    return res.status(400).json({ error: 'letterType must be one of: UCD157, UCD173, UCD367.' });
  }
  if (
    !fields ||
    typeof fields !== 'object' ||
    Array.isArray(fields) ||
    Object.keys(fields).length === 0
  ) {
    return res.status(400).json({ error: 'fields must be a non-empty object.' });
  }

  const { errors, warnings } = validateLetterFields(letterType, fields);
  if (errors.length) {
    return res.status(400).json({ error: errors.join(' '), warnings });
  }

  try {
    const letter = populateLetter(letterType, fields);
    res.json({ letter, warnings });
  } catch (err) {
    console.error('Letter generation error:', err);
    res.status(500).json({ error: 'Letter could not be generated' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/extract-fields
// Paste-to-fill only. The AI fills the form, never the letter.
// ---------------------------------------------------------------------------
app.post('/api/extract-fields', async (req, res) => {
  const { letterType, pastedText } = req.body || {};

  if (!letterType || !Object.prototype.hasOwnProperty.call(LETTER_FIELD_NAMES, letterType)) {
    return res.status(400).json({ error: 'letterType must be one of: UCD157, UCD173, UCD367.' });
  }
  const invalid = requireString(pastedText, 'pastedText', 20000);
  if (invalid) {
    return res.status(400).json({ error: invalid });
  }

  const fieldNames = LETTER_FIELD_NAMES[letterType];

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Letter type: ${letterType}. Field names to extract: ${fieldNames.join(', ')}. Here is the case text the caseworker pasted:\n\n${pastedText}\n\nReturn the JSON object now.`,
        },
      ],
    });

    let parsed;
    try {
      parsed = parseJsonFromModel(response.content[0].text);
    } catch (parseErr) {
      console.error('Extraction returned unparseable JSON:', response.content[0].text);
      return res.status(500).json({ error: 'Extraction failed - could not parse AI output.' });
    }

    const fields = {};
    const missing = [];
    fieldNames.forEach((name) => {
      const value = parsed[name];
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        fields[name] = String(value);
      } else {
        missing.push(name);
      }
    });

    res.json({ fields, missing });
  } catch (err) {
    console.error('Field extraction error:', err);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

app.listen(PORT, () => {
  console.log(`UC Caseworker Tool running at http://localhost:${PORT}`);
});
