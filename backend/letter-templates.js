// Demonstration letter templates for the portfolio prototype.
// These are not official UCD 157 / 173 / 367 forms and must not be sent to a claimant.
// Fixed legal-style wording is populated by string replacement only — the AI never rewrites it.

const DEMO_BANNER =
  'DEMONSTRATION TEMPLATE — not an official DWP letter. Synthetic data only. Do not send to a claimant.';

const LETTER_FIELD_NAMES = {
  UCD157: [
    'claimantName',
    'dateRequested',
    'paymentAmount',
    'coverageStartDate',
    'coverageEndDate',
    'nextApplicationDate',
  ],
  UCD173: [
    'claimantName',
    'entitlementAmount',
    'entitlementStartDate',
    'entitlementEndDate',
    'underpaymentReason',
    'benefitTypePaid',
    'amountPaid',
    'paidStartDate',
    'paidEndDate',
    'nothingOwedFromDate',
    'amountPaidRepeated',
    'benefitTypeRepeated',
    'secondRangeStart',
    'secondRangeEnd',
  ],
  UCD367: [
    'claimantName',
    'amountOverpaid',
    'dateType',
    'overpaymentDate',
    'overpaymentStartDate',
    'overpaymentEndDate',
    'overpaymentReason',
    'benefitType',
  ],
};

const DATE_FIELDS = new Set([
  'dateRequested',
  'coverageStartDate',
  'coverageEndDate',
  'nextApplicationDate',
  'entitlementStartDate',
  'entitlementEndDate',
  'paidStartDate',
  'paidEndDate',
  'nothingOwedFromDate',
  'secondRangeStart',
  'secondRangeEnd',
  'overpaymentDate',
  'overpaymentStartDate',
  'overpaymentEndDate',
]);

const MONEY_FIELDS = new Set([
  'paymentAmount',
  'entitlementAmount',
  'amountPaid',
  'amountPaidRepeated',
  'amountOverpaid',
]);

const RIGHTS_AND_CONTACT = `
If you disagree with a decision

You can ask us to look at the decision again. This is called a mandatory reconsideration. It is free.

You usually need to ask within one month of the date on this letter. You can ask later if you have a good reason, for example if you have been in hospital or had a bereavement.

If you still disagree after we have looked at the decision again, you can appeal to an independent tribunal. The mandatory reconsideration notice will tell you how.

Equality Act 2010

We will make reasonable adjustments if you are disabled and need extra support to use our service. Contact us if you need this letter in a different format, such as large print, braille or audio.

Contact Universal Credit

Telephone: 0800 328 5644
Welsh language: 0800 328 1744
Textphone: 0800 328 1344
Relay UK: 18001 then 0800 328 5644

Find out about call charges at gov.uk/call-charges
`.trim();

const LETTER_TEMPLATES = {
  UCD157: `${DEMO_BANNER}

Department for Work and Pensions
Universal Credit

Hardship payment payable

Dear [FIELD: claimantName]

We have looked at your request for a hardship payment, which we received on [FIELD: dateRequested].

We can pay you a recoverable hardship payment of [FIELD: paymentAmount].

This payment covers the period from [FIELD: coverageStartDate] to [FIELD: coverageEndDate].

You can apply for another hardship payment from [FIELD: nextApplicationDate].

You will usually pay this money back through your future Universal Credit payments.

How to pay back the money

We will take the money back from your Universal Credit payments unless we agree another way for you to repay.

You may not have to repay

In some circumstances you may not have to pay all of the money back. Contact us if you are still in hardship or your circumstances change.

${RIGHTS_AND_CONTACT}
`,

  UCD173: `${DEMO_BANNER}

Department for Work and Pensions
Universal Credit

Underpayment — no arrears due

Dear [FIELD: claimantName]

We have looked at your Universal Credit for the period from [FIELD: entitlementStartDate] to [FIELD: entitlementEndDate].

Your entitlement for that period was [FIELD: entitlementAmount].

The reason for the underpayment is: [FIELD: underpaymentReason].

We have already paid you [FIELD: benefitTypePaid] of [FIELD: amountPaid] for the period from [FIELD: paidStartDate] to [FIELD: paidEndDate].

Nothing further is owed from [FIELD: nothingOwedFromDate].

We have also taken into account [FIELD: benefitTypeRepeated] of [FIELD: amountPaidRepeated] for the period from [FIELD: secondRangeStart] to [FIELD: secondRangeEnd].

Because those payments have already been made, no arrears are due.

Changes you must tell us about

You must tell us about changes in your circumstances straight away. If you do not, you may be paid too much and have to pay the money back.

${RIGHTS_AND_CONTACT}
`,

  UCD367: `${DEMO_BANNER}

Department for Work and Pensions
Universal Credit

Overpayment without a civil penalty

Dear [FIELD: claimantName]

We have paid you too much Universal Credit.

The amount overpaid is [FIELD: amountOverpaid]. This overpayment relates to [FIELD: dateClause].

The reason for the overpayment is: [FIELD: overpaymentReason].

The overpayment is on [FIELD: benefitType].

By law Universal Credit has the right to recover all overpayments. This letter does not include a civil penalty.

How to pay the money back

We may take money from your Universal Credit payments, or you can pay DWP Debt Management.

Account name: DWP Debt Management
Sort code: 00-00-00
Account number: PLACEHOLDER
Reference: NI-NUMBER-PLACEHOLDER

If you do not pay, we may ask your employer to take money from your wages.

${RIGHTS_AND_CONTACT}
`,
};

function formatDate(value) {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return text;
}

function formatMoney(value) {
  if (value === undefined || value === null || value === '') return '';
  const n = Number(String(value).replace(/[£,\s]/g, ''));
  if (Number.isNaN(n)) return String(value);
  return `£${n.toFixed(2)}`;
}

function formatFields(fields) {
  const formatted = {};
  Object.entries(fields || {}).forEach(([name, value]) => {
    if (DATE_FIELDS.has(name)) {
      formatted[name] = formatDate(value);
    } else if (MONEY_FIELDS.has(name)) {
      formatted[name] = formatMoney(value);
    } else {
      formatted[name] = value === undefined || value === null ? '' : String(value);
    }
  });
  return formatted;
}

function dateClause(fields, formatted) {
  if (fields.dateType === 'Date range') {
    return `the period from ${formatted.overpaymentStartDate} to ${formatted.overpaymentEndDate}`;
  }
  return formatted.overpaymentDate ? `the date ${formatted.overpaymentDate}` : 'the date given on your case';
}

function populateLetter(letterType, fields) {
  const template = LETTER_TEMPLATES[letterType];
  if (!template) {
    throw new Error(`Unknown letter type: ${letterType}`);
  }

  const formatted = formatFields(fields);
  let output = template;

  if (letterType === 'UCD367') {
    output = output.replace(/\[FIELD: dateClause\]/g, dateClause(fields, formatted));
  }

  output = output.replace(/\[FIELD: (\w+)\]/g, (_, name) => {
    return Object.prototype.hasOwnProperty.call(formatted, name) ? formatted[name] : '';
  });

  return output.trim() + '\n';
}

module.exports = {
  LETTER_TEMPLATES,
  LETTER_FIELD_NAMES,
  DATE_FIELDS,
  MONEY_FIELDS,
  formatDate,
  formatMoney,
  formatFields,
  populateLetter,
};
