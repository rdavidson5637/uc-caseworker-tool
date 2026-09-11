(function () {
  'use strict';

  // ---------------- Helpers ----------------
  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }
    return data;
  }

  function showErrorSummary(summaryEl, listEl, items, groupEl) {
    listEl.innerHTML = '';
    items.forEach((item) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href || '#';
      a.textContent = item.text;
      li.appendChild(a);
      listEl.appendChild(li);
    });
    summaryEl.hidden = false;
    if (groupEl) groupEl.classList.add('govuk-form-group--error');
    summaryEl.focus();
  }

  function clearErrorSummary(summaryEl, listEl, groupEl) {
    listEl.innerHTML = '';
    summaryEl.hidden = true;
    if (groupEl) groupEl.classList.remove('govuk-form-group--error');
  }

  function setFieldError(errorEl, inputEl, message) {
    if (!errorEl) return;
    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      if (inputEl) {
        inputEl.classList.add('govuk-input--error');
        inputEl.classList.add('govuk-textarea--error');
      }
    } else {
      errorEl.textContent = '';
      errorEl.hidden = true;
      if (inputEl) {
        inputEl.classList.remove('govuk-input--error');
        inputEl.classList.remove('govuk-textarea--error');
      }
    }
  }

  function setBusy(button, busyText) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
  }

  function clearBusy(button) {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }

  async function copyFrom(id, statusId) {
    const el = document.getElementById(id);
    const status = document.getElementById(statusId);
    const text = el ? el.value : '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      el.focus();
      el.select();
      document.execCommand('copy');
    }
    if (status) {
      status.hidden = false;
      setTimeout(() => {
        status.hidden = true;
      }, 2500);
    }
  }

  function updateCount(input, countEl, max) {
    const remaining = max - input.value.length;
    countEl.textContent = remaining + ' character' + (remaining === 1 ? '' : 's') + ' remaining';
    countEl.classList.toggle('govuk-character-count--warning', remaining < 100);
  }

  function renderList(ul, items) {
    ul.innerHTML = '';
    (items || []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
  }

  function flagLabel(flag) {
    const labels = {
      'self-harm': 'Suicide or self-harm',
      'domestic-abuse': 'Domestic abuse',
      'child-safeguarding': 'Child safeguarding',
      homelessness: 'Homelessness or destitution',
      coercion: 'Third-party coercion',
      'fraud-admission': 'Possible fraud admission',
    };
    return labels[flag] || flag;
  }

  function renderSafeguarding(container, safeguarding) {
    container.innerHTML = '';
    if (!safeguarding || safeguarding.level === 'none') {
      container.hidden = true;
      return;
    }

    const urgent = safeguarding.level === 'urgent';
    const banner = document.createElement('div');
    banner.className =
      'govuk-notification-banner ' +
      (urgent ? 'govuk-notification-banner--urgent' : 'govuk-notification-banner--alert');
    banner.setAttribute('role', 'alert');

    const header = document.createElement('div');
    header.className = 'govuk-notification-banner__header';
    header.textContent = urgent
      ? 'Urgent safeguarding — follow procedure before any journal reply'
      : 'Safeguarding or risk flag — tell a team leader';

    const content = document.createElement('div');
    content.className = 'govuk-notification-banner__content';

    if (safeguarding.flags && safeguarding.flags.length) {
      const p = document.createElement('p');
      p.className = 'govuk-body';
      p.innerHTML = '<strong>Flags: </strong>' + safeguarding.flags.map(flagLabel).join('; ');
      content.appendChild(p);
    }

    if (safeguarding.caseworkerAction) {
      const action = document.createElement('p');
      action.className = 'govuk-body';
      action.textContent = safeguarding.caseworkerAction;
      content.appendChild(action);
    }

    const caveat = document.createElement('p');
    caveat.className = 'govuk-hint';
    caveat.textContent =
      'This is a prompt for the caseworker. It does not replace the Six Point Plan, domestic abuse procedure, or local safeguarding children procedures.';
    content.appendChild(caveat);

    banner.appendChild(header);
    banner.appendChild(content);
    container.appendChild(banner);
    container.hidden = false;
  }

  // ---------------- Tabs ----------------
  const tabs = Array.from(document.querySelectorAll('.govuk-tabs__tab'));
  const panels = {
    journal: document.getElementById('panel-journal'),
    letter: document.getElementById('panel-letter'),
    note: document.getElementById('panel-note'),
  };

  function tabKey(tab) {
    return tab.id.replace('tab-', '');
  }

  function activateTab(target, focusTab) {
    tabs.forEach((tab) => {
      const selected = tab === target;
      const key = tabKey(tab);
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      tab.parentElement.classList.toggle('govuk-tabs__list-item--selected', selected);
      panels[key].hidden = !selected;
    });
    if (focusTab) target.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      activateTab(tab, false);
    });
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') {
        return;
      }
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      activateTab(tabs[next], true);
    });
  });

  // ---------------- Letter fields ----------------
  const BENEFIT_OPTIONS = [
    'Employment and Support Allowance',
    "Jobseeker's Allowance",
    'Housing Benefit',
    'Income Support',
  ];

  const LETTER_FIELDS = {
    UCD157: [
      { name: 'claimantName', label: 'Claimant full name', type: 'text', hint: 'As it should appear on the letter.' },
      { name: 'dateRequested', label: 'Date payment was requested', type: 'date' },
      { name: 'paymentAmount', label: 'Payment amount (£)', type: 'number' },
      { name: 'coverageStartDate', label: 'Coverage start date', type: 'date' },
      { name: 'coverageEndDate', label: 'Coverage end date', type: 'date' },
      { name: 'nextApplicationDate', label: 'Date they can apply for another payment', type: 'date' },
    ],
    UCD173: [
      { name: 'claimantName', label: 'Claimant full name', type: 'text' },
      { name: 'entitlementAmount', label: 'Entitlement amount (£)', type: 'number' },
      { name: 'entitlementStartDate', label: 'Entitlement start date', type: 'date' },
      { name: 'entitlementEndDate', label: 'Entitlement end date', type: 'date' },
      { name: 'underpaymentReason', label: 'Reason for underpayment', type: 'text' },
      { name: 'benefitTypePaid', label: 'Benefit type already paid', type: 'select' },
      { name: 'amountPaid', label: 'Amount already paid (£)', type: 'number' },
      { name: 'paidStartDate', label: 'Already paid start date', type: 'date' },
      { name: 'paidEndDate', label: 'Already paid end date', type: 'date' },
      { name: 'nothingOwedFromDate', label: 'Date from which nothing is owed', type: 'date' },
      { name: 'amountPaidRepeated', label: 'Amount already paid repeated (£)', type: 'number' },
      { name: 'benefitTypeRepeated', label: 'Benefit type repeated', type: 'select' },
      { name: 'secondRangeStart', label: 'Second date range start', type: 'date' },
      { name: 'secondRangeEnd', label: 'Second date range end', type: 'date' },
    ],
    UCD367: [
      { name: 'claimantName', label: 'Claimant full name', type: 'text' },
      { name: 'amountOverpaid', label: 'Amount overpaid (£)', type: 'number' },
      { name: 'dateType', label: 'Date type', type: 'radio', options: ['Single date', 'Date range'] },
      { name: 'overpaymentDate', label: 'Overpayment date', type: 'date', showWhen: 'Single date' },
      { name: 'overpaymentStartDate', label: 'Overpayment start date', type: 'date', showWhen: 'Date range' },
      { name: 'overpaymentEndDate', label: 'Overpayment end date', type: 'date', showWhen: 'Date range' },
      { name: 'overpaymentReason', label: 'Reason for overpayment', type: 'text' },
      { name: 'benefitType', label: 'Benefit type', type: 'select' },
    ],
  };

  const letterTypeSelect = document.getElementById('letter-type');
  const letterFieldsDiv = document.getElementById('letter-fields');

  function updateConditionalFields() {
    const radios = letterFieldsDiv.querySelectorAll('input[type="radio"]:checked');
    const selected = radios.length ? radios[0].value : null;
    letterFieldsDiv.querySelectorAll('[data-show-when]').forEach((wrapper) => {
      const show = wrapper.dataset.showWhen === selected;
      wrapper.hidden = !show;
    });
  }

  function renderFields(letterType) {
    letterFieldsDiv.innerHTML = '';
    LETTER_FIELDS[letterType].forEach((field) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'govuk-form-group';
      wrapper.dataset.fieldName = field.name;
      if (field.showWhen) wrapper.dataset.showWhen = field.showWhen;

      if (field.type === 'radio') {
        const legend = document.createElement('p');
        legend.className = 'govuk-label';
        legend.textContent = field.label;
        wrapper.appendChild(legend);
        const radioWrap = document.createElement('div');
        radioWrap.className = 'govuk-radios';
        field.options.forEach((opt, i) => {
          const item = document.createElement('div');
          item.className = 'govuk-radios__item';
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = field.name;
          radio.id = 'field-' + field.name + '-' + i;
          radio.value = opt;
          if (i === 0) radio.checked = true;
          radio.addEventListener('change', updateConditionalFields);
          const label = document.createElement('label');
          label.className = 'govuk-label';
          label.htmlFor = radio.id;
          label.textContent = opt;
          item.appendChild(radio);
          item.appendChild(label);
          radioWrap.appendChild(item);
        });
        wrapper.appendChild(radioWrap);
      } else if (field.type === 'select') {
        const label = document.createElement('label');
        label.className = 'govuk-label';
        label.htmlFor = 'field-' + field.name;
        label.textContent = field.label;
        const select = document.createElement('select');
        select.className = 'govuk-select';
        select.id = 'field-' + field.name;
        select.name = field.name;
        BENEFIT_OPTIONS.forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          select.appendChild(option);
        });
        wrapper.appendChild(label);
        wrapper.appendChild(select);
      } else {
        const label = document.createElement('label');
        label.className = 'govuk-label';
        label.htmlFor = 'field-' + field.name;
        label.textContent = field.label;
        wrapper.appendChild(label);
        if (field.hint) {
          const hint = document.createElement('div');
          hint.className = 'govuk-hint';
          hint.textContent = field.hint;
          wrapper.appendChild(hint);
        }
        const input = document.createElement('input');
        input.className = 'govuk-input';
        input.type = field.type;
        input.id = 'field-' + field.name;
        input.name = field.name;
        if (field.type === 'number') {
          input.min = '0.01';
          input.step = '0.01';
        }
        wrapper.appendChild(input);
      }

      letterFieldsDiv.appendChild(wrapper);
    });
    updateConditionalFields();
  }

  function fieldLabel(name) {
    const field = LETTER_FIELDS[letterTypeSelect.value].find((f) => f.name === name);
    return field ? field.label : name;
  }

  function setFieldValue(name, value) {
    const wrapper = letterFieldsDiv.querySelector('[data-field-name="' + name + '"]');
    if (!wrapper) return false;

    const radios = wrapper.querySelectorAll('input[type="radio"]');
    if (radios.length) {
      let matched = false;
      radios.forEach((r) => {
        if (r.value === value) {
          r.checked = true;
          matched = true;
        }
      });
      if (matched) updateConditionalFields();
      return matched;
    }

    const input = wrapper.querySelector('input, select');
    if (!input) return false;
    if (input.tagName === 'SELECT') {
      const option = Array.from(input.options).find((o) => o.value === value);
      if (!option) return false;
      input.value = value;
    } else {
      input.value = value;
    }
    wrapper.classList.add('field-filled');
    return true;
  }

  letterTypeSelect.addEventListener('change', () => {
    renderFields(letterTypeSelect.value);
    document.getElementById('paste-status').hidden = true;
    document.getElementById('letter-warnings').hidden = true;
  });
  renderFields(letterTypeSelect.value);

  // ---------------- Journal ----------------
  const journalInput = document.getElementById('journal-input');
  const journalSubmit = document.getElementById('journal-submit');
  const journalCount = document.getElementById('journal-count');
  const journalExamples = document.getElementById('journal-examples');

  updateCount(journalInput, journalCount, 5000);
  journalInput.addEventListener('input', () => updateCount(journalInput, journalCount, 5000));

  const examples = window.UC_EXAMPLES || { journal: {}, letters: {}, caseNote: '' };
  Object.entries(examples.journal || {}).forEach(([key, example]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'govuk-button govuk-button--secondary';
    btn.textContent = 'Example: ' + example.label;
    btn.addEventListener('click', () => {
      journalInput.value = example.text;
      updateCount(journalInput, journalCount, 5000);
      journalInput.focus();
    });
    journalExamples.appendChild(btn);
  });

  journalSubmit.addEventListener('click', async () => {
    const summary = document.getElementById('journal-error-summary');
    const list = document.getElementById('journal-error-list');
    const group = document.getElementById('journal-group');
    const errorEl = document.getElementById('journal-error');
    const status = document.getElementById('journal-status');
    clearErrorSummary(summary, list, group);
    setFieldError(errorEl, journalInput, '');
    status.textContent = '';

    const journalMessage = journalInput.value.trim();
    if (!journalMessage) {
      showErrorSummary(
        summary,
        list,
        [{ href: '#journal-input', text: 'Enter a journal message before drafting a response.' }],
        group
      );
      setFieldError(errorEl, journalInput, 'Enter a journal message before drafting a response.');
      return;
    }

    setBusy(journalSubmit, 'Drafting...');
    status.textContent = 'Checking safeguarding and drafting a response. This can take a few seconds.';
    try {
      const data = await postJson('/api/journal-response', { journalMessage });
      renderSafeguarding(document.getElementById('journal-safeguarding'), data.safeguarding);
      document.getElementById('journal-output').value = data.draft || '';
      document.getElementById('journal-output-section').hidden = false;

      const ref = document.getElementById('journal-guidance-ref');
      ref.textContent = data.guidanceReference
        ? 'Guidance reference: ' + data.guidanceReference
        : '';

      const checklistWrap = document.getElementById('journal-checklist-wrap');
      if (data.checklist && data.checklist.length) {
        renderList(document.getElementById('journal-checklist'), data.checklist);
        checklistWrap.hidden = false;
      } else {
        checklistWrap.hidden = true;
      }

      const noteWrap = document.getElementById('journal-note-wrap');
      document.getElementById('journal-case-note').value = data.caseNote || '';
      noteWrap.hidden = !data.caseNote;
      status.textContent = 'Draft ready for review.';
    } catch (err) {
      showErrorSummary(summary, list, [{ href: '#journal-input', text: err.message }], group);
      status.textContent = '';
    } finally {
      clearBusy(journalSubmit);
    }
  });

  document.getElementById('journal-copy-draft').addEventListener('click', () => {
    copyFrom('journal-output', 'journal-copy-draft-status');
  });
  document.getElementById('journal-copy-note').addEventListener('click', () => {
    copyFrom('journal-case-note', 'journal-copy-note-status');
  });

  // ---------------- Letters: paste-to-fill ----------------
  const pasteInput = document.getElementById('paste-input');
  const pasteFill = document.getElementById('paste-fill');
  const pasteStatus = document.getElementById('paste-status');
  const pasteLive = document.getElementById('paste-live');

  document.getElementById('letter-load-example').addEventListener('click', () => {
    const sample = examples.letters[letterTypeSelect.value];
    if (sample) {
      pasteInput.value = sample;
      pasteInput.focus();
    }
  });

  pasteFill.addEventListener('click', async () => {
    const summary = document.getElementById('letter-error-summary');
    const list = document.getElementById('letter-error-list');
    clearErrorSummary(summary, list);
    pasteStatus.hidden = true;
    pasteLive.textContent = '';

    const pastedText = pasteInput.value.trim();
    if (!pastedText) {
      showErrorSummary(summary, list, [
        { href: '#paste-input', text: 'Paste the case text before filling fields.' },
      ]);
      return;
    }

    setBusy(pasteFill, 'Extracting...');
    pasteLive.textContent = 'Extracting values from the pasted text.';
    try {
      const data = await postJson('/api/extract-fields', {
        letterType: letterTypeSelect.value,
        pastedText,
      });

      letterFieldsDiv.querySelectorAll('.field-filled').forEach((w) => w.classList.remove('field-filled'));
      const entries = Object.entries(data.fields || {});
      entries.filter(([name]) => name === 'dateType').forEach(([name, value]) => setFieldValue(name, value));
      let filled = 0;
      entries
        .filter(([name]) => name !== 'dateType')
        .forEach(([name, value]) => {
          if (setFieldValue(name, value)) filled += 1;
        });

      const notFound = (data.missing || []).map(fieldLabel);
      let status =
        'Filled ' +
        filled +
        ' field' +
        (filled === 1 ? '' : 's') +
        ' from the pasted text. Check every value before generating.';
      if (notFound.length) {
        status += ' Not found — fill in manually: ' + notFound.join(', ') + '.';
      }
      pasteStatus.textContent = status;
      pasteStatus.hidden = false;
      pasteLive.textContent = 'Fields updated. Check every value.';
    } catch (err) {
      showErrorSummary(summary, list, [{ href: '#paste-input', text: err.message }]);
      pasteLive.textContent = '';
    } finally {
      clearBusy(pasteFill);
    }
  });

  // ---------------- Letters: generate ----------------
  const letterSubmit = document.getElementById('letter-submit');

  function renderWarnings(warnings) {
    const box = document.getElementById('letter-warnings');
    box.innerHTML = '';
    if (!warnings || !warnings.length) {
      box.hidden = true;
      return;
    }
    const banner = document.createElement('div');
    banner.className = 'govuk-notification-banner govuk-notification-banner--alert';
    banner.setAttribute('role', 'alert');
    const header = document.createElement('div');
    header.className = 'govuk-notification-banner__header';
    header.textContent = 'Check these details before using the letter';
    const content = document.createElement('div');
    content.className = 'govuk-notification-banner__content';
    const ul = document.createElement('ul');
    ul.className = 'govuk-list govuk-list--bullet';
    warnings.forEach((w) => {
      const li = document.createElement('li');
      li.textContent = w;
      ul.appendChild(li);
    });
    content.appendChild(ul);
    banner.appendChild(header);
    banner.appendChild(content);
    box.appendChild(banner);
    box.hidden = false;
  }

  letterSubmit.addEventListener('click', async () => {
    const summary = document.getElementById('letter-error-summary');
    const list = document.getElementById('letter-error-list');
    const status = document.getElementById('letter-status');
    clearErrorSummary(summary, list);
    status.textContent = '';

    const letterType = letterTypeSelect.value;
    const fields = {};
    const missing = [];

    letterFieldsDiv.querySelectorAll('[data-field-name]').forEach((wrapper) => {
      if (wrapper.hidden) return;
      const name = wrapper.dataset.fieldName;
      const radio = wrapper.querySelector('input[type="radio"]:checked');
      if (radio) {
        fields[name] = radio.value;
        return;
      }
      const input = wrapper.querySelector('input, select');
      if (!input) return;
      const value = input.value.trim();
      if (!value) {
        const label = wrapper.querySelector('label, .govuk-label');
        missing.push({
          text: 'Enter ' + (label ? label.textContent : name).toLowerCase(),
          href: '#' + (input.id || 'letter-fields'),
        });
        return;
      }
      fields[name] = value;
    });

    if (missing.length) {
      showErrorSummary(summary, list, missing);
      return;
    }

    setBusy(letterSubmit, 'Generating...');
    status.textContent = 'Populating the demonstration template.';
    try {
      const data = await postJson('/api/generate-letter', { letterType, fields });
      document.getElementById('letter-output').value = data.letter || '';
      document.getElementById('letter-output-section').hidden = false;
      renderWarnings(data.warnings);
      status.textContent = 'Letter ready for review.';
    } catch (err) {
      showErrorSummary(summary, list, [{ href: '#letter-fields', text: err.message }]);
      status.textContent = '';
    } finally {
      clearBusy(letterSubmit);
    }
  });

  document.getElementById('letter-copy').addEventListener('click', () => {
    copyFrom('letter-output', 'letter-copy-status');
  });

  document.getElementById('letter-print').addEventListener('click', () => {
    const letter = document.getElementById('letter-output').value;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      '<!DOCTYPE html><html lang="en"><head><title>Letter</title>' +
        '<style>body{font-family:Arial,sans-serif;white-space:pre-wrap;margin:2rem;line-height:1.4;}</style>' +
        '</head><body></body></html>'
    );
    win.document.body.textContent = letter;
    win.document.close();
    win.focus();
    win.print();
  });

  // ---------------- Case note ----------------
  const noteInput = document.getElementById('note-input');
  const noteSubmit = document.getElementById('note-submit');
  const noteCount = document.getElementById('note-count');

  updateCount(noteInput, noteCount, 8000);
  noteInput.addEventListener('input', () => updateCount(noteInput, noteCount, 8000));

  document.getElementById('note-load-example').addEventListener('click', () => {
    noteInput.value = examples.caseNote || '';
    updateCount(noteInput, noteCount, 8000);
    noteInput.focus();
  });

  noteSubmit.addEventListener('click', async () => {
    const summary = document.getElementById('note-error-summary');
    const list = document.getElementById('note-error-list');
    const group = document.getElementById('note-group');
    const errorEl = document.getElementById('note-error');
    const status = document.getElementById('note-status');
    clearErrorSummary(summary, list, group);
    setFieldError(errorEl, noteInput, '');
    status.textContent = '';

    const sourceText = noteInput.value.trim();
    if (!sourceText) {
      showErrorSummary(
        summary,
        list,
        [{ href: '#note-input', text: 'Enter case details before drafting a note.' }],
        group
      );
      setFieldError(errorEl, noteInput, 'Enter case details before drafting a note.');
      return;
    }

    setBusy(noteSubmit, 'Drafting...');
    status.textContent = 'Checking safeguarding and drafting an internal note.';
    try {
      const data = await postJson('/api/case-note', { sourceText });
      renderSafeguarding(document.getElementById('note-safeguarding'), data.safeguarding);
      document.getElementById('note-output').value = data.note || '';
      document.getElementById('note-output-section').hidden = false;

      const checklistWrap = document.getElementById('note-checklist-wrap');
      if (data.checklist && data.checklist.length) {
        renderList(document.getElementById('note-checklist'), data.checklist);
        checklistWrap.hidden = false;
      } else {
        checklistWrap.hidden = true;
      }
      status.textContent = 'Note ready for review.';
    } catch (err) {
      showErrorSummary(summary, list, [{ href: '#note-input', text: err.message }], group);
      status.textContent = '';
    } finally {
      clearBusy(noteSubmit);
    }
  });

  document.getElementById('note-copy').addEventListener('click', () => {
    copyFrom('note-output', 'note-copy-status');
  });
})();
