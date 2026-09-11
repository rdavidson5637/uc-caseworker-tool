// Synthetic demo fixtures only. No real claimant data.
window.UC_EXAMPLES = {
  journal: {
    overpayment: {
      label: 'Overpayment',
      text: 'Hi, I got a letter saying I was overpaid and I dont understand why. Do I have to pay it back? I thought I had told you about my hours changing. Thanks, Sam.',
    },
    hardship: {
      label: 'Hardship payment',
      text: 'My Universal Credit has been reduced because of a sanction and I cannot afford food or electric this month. Can I get a hardship payment? I have already cut back on everything I can.',
    },
    sanction: {
      label: 'Sanction',
      text: 'I missed my appointment with my work coach last week because my bus did not turn up. Will I get a sanction? I have already rebooked for Thursday.',
    },
    reconsideration: {
      label: 'Mandatory reconsideration',
      text: 'I disagree with the decision on my claim. The letter says I am not entitled to the extra amount for my health condition. How do I ask you to look at it again?',
    },
    change: {
      label: 'Change of circumstances',
      text: 'I started a new part-time job on 4 August. What do I need to tell you and will my payment go down?',
    },
    safeguarding: {
      label: 'Safeguarding (synthetic)',
      text: 'SYNTHETIC DEMO — not a real claimant. I have no food and nowhere to stay tonight. I do not want to be here anymore and I have been thinking about ending my life. Please help.',
    },
  },
  letters: {
    UCD157: `SYNTHETIC CASE TO-DO — not real claimant data

Claimant full name: Jordan Hale
National Insurance number: QQ 12 34 56 C

Task: Hardship payment payable

Date payment was requested: 03/08/2026
Payment amount: 78.40
Coverage start date: 04/08/2026
Coverage end date: 17/08/2026
Date they can apply for another payment: 18/08/2026

Notes: Sanction applied. Claimant has reduced non-essential costs.`,
    UCD173: `SYNTHETIC CASE TO-DO — not real claimant data

Claimant full name: Alex Mensah
National Insurance number: QQ 98 76 54 A

Task: Underpayment — no arrears due

Entitlement amount: 424.90
Entitlement start date: 15/05/2026
Entitlement end date: 14/06/2026
Reason for underpayment: Housing costs not included for one assessment period

Benefit type already paid: Housing Benefit
Amount already paid: 390.00
Already paid start date: 15/05/2026
Already paid end date: 14/06/2026
Date from which nothing is owed: 15/06/2026

Amount already paid repeated: 390.00
Benefit type repeated: Housing Benefit
Second date range start: 15/05/2026
Second date range end: 14/06/2026`,
    UCD367: `SYNTHETIC CASE TO-DO — not real claimant data

Claimant full name: Riley Patel
National Insurance number: QQ 11 22 33 B

Task: Overpayment without civil penalty

Amount overpaid: 156.40
Date type: Date range
Overpayment start date: 20/04/2026
Overpayment end date: 19/05/2026
Reason for overpayment: Earnings not reported for one assessment period
Benefit type: Employment and Support Allowance`,
  },
  caseNote: `SYNTHETIC TO-DO / LMS DUMP — not real claimant data

Claimant: Taylor Quinn
NINO: QQ 55 66 77 C

Journal received 13/08/2026 09:14
Claimant asked why their payment is lower this month and whether they can get a hardship payment. They say a sanction was applied after a missed appointment on 06/08/2026.

Open actions:
- Explain sanction and hardship eligibility
- Check whether good reason has been considered
- Record contact and next step for work coach

No safeguarding indicators on this to-do.`,
};
