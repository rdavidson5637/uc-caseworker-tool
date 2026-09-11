// Reads guidance files from data/ and combines them for the journal assistant.
// loadGuidance() returns every file (used as a fallback).
// loadGuidanceByTopics() returns only the files that match classified topics.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const TOPIC_FILES = {
  overpayments: 'guidance-overpayments.txt',
  hardship: 'guidance-hardship-payments.txt',
  advances: 'guidance-advances.txt',
  sanctions: 'guidance-sanctions.txt',
  'mandatory-reconsideration': 'guidance-mandatory-reconsideration.txt',
  payments: 'guidance-payments.txt',
  health: 'guidance-health-conditions.txt',
  changes: 'guidance-changes-of-circumstances.txt',
  overview: 'guidance-universal-credit-overview.txt',
};

const KNOWN_TOPICS = Object.keys(TOPIC_FILES);

function listGuidanceFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`Guidance data directory not found: ${DATA_DIR}`);
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.txt'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .txt guidance files found in ${DATA_DIR}`);
  }

  return files;
}

function readFiles(filenames) {
  return filenames
    .map((filename) => {
      const fullPath = path.join(DATA_DIR, filename);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Guidance file not found: ${filename}`);
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      return `===== SOURCE FILE: ${filename} =====\n\n${content.trim()}`;
    })
    .join('\n\n');
}

function loadGuidance() {
  return readFiles(listGuidanceFiles());
}

function loadGuidanceByTopics(topics) {
  const files = new Set();
  (topics || []).forEach((topic) => {
    const filename = TOPIC_FILES[topic];
    if (filename) files.add(filename);
  });

  if (files.size === 0) {
    return { text: loadGuidance(), files: listGuidanceFiles() };
  }

  const filenames = Array.from(files).sort();
  return { text: readFiles(filenames), files: filenames };
}

module.exports = loadGuidance;
module.exports.loadGuidance = loadGuidance;
module.exports.loadGuidanceByTopics = loadGuidanceByTopics;
module.exports.TOPIC_FILES = TOPIC_FILES;
module.exports.KNOWN_TOPICS = KNOWN_TOPICS;
