// Deterministic checks for letter fields. Inconsistencies are warnings:
// the letter is still generated so the caseworker can see and correct it.

const { LETTER_FIELD_NAMES, MONEY_FIELDS } = require('./letter-templates');

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
  match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (match) return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`);
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(/[£,\s]/g, ''));
  return Number.isNaN(n) ? null : n;
}

function compareDates(fields, startName, endName, label) {
  const start = parseDate(fields[startName]);
  const end = parseDate(fields[endName]);
  if (start && end && end < start) {
    return `${label}: the end date is before the start date.`;
  }
  return null;
}

function moneyWarnings(fields) {
  const warnings = [];
  Object.entries(fields).forEach(([name, value]) => {
    if (!MONEY_FIELDS.has(name)) return;
    const amount = parseMoney(value);
    if (amount === null) return;
    if (amount === 0) {
      warnings.push(`${name} is £0.00. Check this is correct before sending.`);
    } else if (amount < 0) {
      warnings.push(`${name} is a negative amount. Check this is correct before sending.`);
    }
  });
  return warnings;
}

function requiredFields(letterType, fields) {
  const names = LETTER_FIELD_NAMES[letterType] || [];
  const missing = [];

  names.forEach((name) => {
    if (letterType === 'UCD367') {
      if (fields.dateType === 'Date range' && name === 'overpaymentDate') return;
      if (fields.dateType !== 'Date range' && (name === 'overpaymentStartDate' || name === 'overpaymentEndDate')) {
        return;
      }
      if (name === 'dateType') return;
    }
    const value = fields[name];
    if (value === undefined || value === null || String(value).trim() === '') {
      missing.push(name);
    }
  });

  return missing;
}

function validateLetterFields(letterType, fields) {
  const errors = [];
  const warnings = [];

  if (!LETTER_FIELD_NAMES[letterType]) {
    errors.push('letterType must be one of: UCD157, UCD173, UCD367.');
    return { errors, warnings };
  }

  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    errors.push('fields must be a non-empty object.');
    return { errors, warnings };
  }

  const missing = requiredFields(letterType, fields);
  if (missing.length) {
    errors.push('Fill in all required fields: ' + missing.join(', ') + '.');
  }

  warnings.push(...moneyWarnings(fields));

  if (letterType === 'UCD157') {
    const range = compareDates(fields, 'coverageStartDate', 'coverageEndDate', 'Coverage period');
    if (range) warnings.push(range);

    const coverageEnd = parseDate(fields.coverageEndDate);
    const nextApply = parseDate(fields.nextApplicationDate);
    if (coverageEnd && nextApply && nextApply < coverageEnd) {
      warnings.push('The next application date is before the coverage end date.');
    }
  }

  if (letterType === 'UCD173') {
    [
      compareDates(fields, 'entitlementStartDate', 'entitlementEndDate', 'Entitlement period'),
      compareDates(fields, 'paidStartDate', 'paidEndDate', 'Already paid period'),
      compareDates(fields, 'secondRangeStart', 'secondRangeEnd', 'Second date range'),
    ].forEach((msg) => {
      if (msg) warnings.push(msg);
    });
  }

  if (letterType === 'UCD367') {
    if (fields.dateType && fields.dateType !== 'Single date' && fields.dateType !== 'Date range') {
      errors.push('dateType must be "Single date" or "Date range".');
    }
    const range = compareDates(
      fields,
      'overpaymentStartDate',
      'overpaymentEndDate',
      'Overpayment period'
    );
    if (range) warnings.push(range);
  }

  return { errors, warnings };
}

module.exports = {
  validateLetterFields,
  parseDate,
  parseMoney,
};
