(() => {
  if (window.__formDataManagerLoaded) return;
  window.__formDataManagerLoaded = true;

  const SKIP_TYPES = new Set(['password', 'hidden', 'submit', 'button', 'reset', 'image', 'file']);
  const FIELD_QUERY = 'input, select, textarea';

  // ---------- Helpers ----------

  function isFillable(el) {
    if (el.disabled) return false;
    if (el.tagName === 'INPUT' && SKIP_TYPES.has((el.type || 'text').toLowerCase())) return false;
    return true;
  }

  function isVisible(el) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  }

  function cssPath(el) {
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
      return `#${CSS.escape(el.id)}`;
    }
    const tag = el.tagName.toLowerCase();
    if (el.name) {
      const byName = `${tag}[name="${CSS.escape(el.name)}"]`;
      const matches = document.querySelectorAll(byName);
      if (matches.length === 1) return byName;
      if (el.type === 'radio' || el.type === 'checkbox') {
        const byValue = `${byName}[value="${CSS.escape(el.value)}"]`;
        if (document.querySelectorAll(byValue).length === 1) return byValue;
      }
    }
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(' > ');
  }

  function labelFor(el) {
    if (el.labels && el.labels.length) return el.labels[0].innerText.trim();
    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ref = document.getElementById(labelledBy);
      if (ref) return ref.innerText.trim();
    }
    return (el.placeholder || el.name || el.id || '').trim();
  }

  function serializeField(el) {
    const tag = el.tagName.toLowerCase();
    const type = tag === 'input' ? (el.type || 'text').toLowerCase() : tag;
    const field = {
      selector: cssPath(el),
      tag,
      type,
      name: el.name || '',
      id: el.id || '',
      label: labelFor(el).slice(0, 120),
    };
    if (type === 'checkbox' || type === 'radio') {
      field.checked = el.checked;
      field.value = el.value;
    } else if (tag === 'select' && el.multiple) {
      field.value = [...el.selectedOptions].map((o) => o.value);
    } else {
      field.value = el.value;
    }
    return field;
  }

  function collectFields(root = document, { onlyFilled = false } = {}) {
    const seenRadios = new Set();
    const fields = [];
    root.querySelectorAll(FIELD_QUERY).forEach((el) => {
      if (!isFillable(el)) return;
      const type = (el.type || '').toLowerCase();
      if (type === 'radio') {
        // Only store the checked radio of each group.
        const key = `${el.form ? cssPath(el.form) : ''}|${el.name}`;
        if (!el.checked || seenRadios.has(key)) return;
        seenRadios.add(key);
      }
      const field = serializeField(el);
      if (onlyFilled) {
        const empty =
          (field.type === 'checkbox' && !field.checked) ||
          (Array.isArray(field.value) ? field.value.length === 0 : field.value === '');
        if (empty) return;
      }
      fields.push(field);
    });
    return fields;
  }

  // Use the native setter so React/Vue/Angular notice the change.
  function setNativeValue(el, value) {
    const proto =
      el.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : el.tagName === 'SELECT'
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
  }

  function setNativeChecked(el, checked) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    if (setter) setter.call(el, checked);
    else el.checked = checked;
  }

  function fire(el) {
    el.dispatchEvent(new Event('focus', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function flash(el) {
    const prev = el.style.outline;
    el.style.outline = '2px solid #22c55e';
    setTimeout(() => (el.style.outline = prev), 1200);
  }

  function findElement(field) {
    if (field.type === 'radio' && field.name) {
      const radio = document.querySelector(
        `input[type="radio"][name="${CSS.escape(field.name)}"][value="${CSS.escape(field.value)}"]`
      );
      if (radio) return radio;
    }
    try {
      const el = document.querySelector(field.selector);
      if (el) return el;
    } catch (_) {
      /* invalid selector on this page */
    }
    if (field.id) {
      const el = document.getElementById(field.id);
      if (el) return el;
    }
    if (field.name) {
      const candidates = document.getElementsByName(field.name);
      if (field.type === 'checkbox') {
        const match = [...candidates].find((c) => c.value === field.value);
        if (match) return match;
      }
      if (candidates.length) return candidates[0];
    }
    return null;
  }

  function applyValue(el, field) {
    const type = (el.type || el.tagName).toLowerCase();
    if (type === 'checkbox' || type === 'radio') {
      const want = field.checked ?? Boolean(field.value);
      if (el.checked !== want) {
        setNativeChecked(el, want);
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        // The synthetic click may toggle it back on some frameworks; enforce final state.
        if (el.checked !== want) setNativeChecked(el, want);
      }
      fire(el);
    } else if (el.tagName === 'SELECT' && el.multiple && Array.isArray(field.value)) {
      [...el.options].forEach((o) => (o.selected = field.value.includes(o.value)));
      fire(el);
    } else if (el.tagName === 'SELECT') {
      const value = String(field.value ?? '');
      const option =
        [...el.options].find((o) => o.value === value) ||
        [...el.options].find((o) => o.text.trim().toLowerCase() === value.toLowerCase());
      if (!option) return false;
      setNativeValue(el, option.value);
      fire(el);
    } else {
      setNativeValue(el, String(field.value ?? ''));
      fire(el);
    }
    flash(el);
    return true;
  }

  function fillFields(fields) {
    let filled = 0;
    const missing = [];
    for (const field of fields) {
      const el = findElement(field);
      if (el && isFillable(el) && applyValue(el, field)) filled++;
      else missing.push(field.label || field.name || field.selector);
    }
    return { filled, total: fields.length, missing };
  }

  // ---------- Profile autofill (heuristic matching) ----------

  const PROFILE_RULES = [
    { key: 'email', ac: ['email'], re: /e-?mail/i },
    { key: 'firstName', ac: ['given-name'], re: /(first|given|f)[\s_-]?name|fname/i },
    { key: 'lastName', ac: ['family-name'], re: /(last|family|sur|l)[\s_-]?name|lname/i },
    { key: 'fullName', ac: ['name'], re: /^(full[\s_-]?)?name$|your[\s_-]?name|full[\s_-]?name/i },
    { key: 'phone', ac: ['tel', 'tel-national'], re: /phone|mobile|tel|contact[\s_-]?no/i },
    { key: 'company', ac: ['organization'], re: /company|organi[sz]ation|employer|business/i },
    { key: 'jobTitle', ac: ['organization-title'], re: /job|title|designation|position|role/i },
    { key: 'address1', ac: ['address-line1', 'street-address'], re: /address[\s_-]?(line)?[\s_-]?1|street|^address$/i },
    { key: 'address2', ac: ['address-line2'], re: /address[\s_-]?(line)?[\s_-]?2|apt|suite|unit/i },
    { key: 'city', ac: ['address-level2'], re: /city|town|locality/i },
    { key: 'state', ac: ['address-level1'], re: /state|province|region|county/i },
    { key: 'zip', ac: ['postal-code'], re: /zip|postal|post[\s_-]?code|pin[\s_-]?code/i },
    { key: 'country', ac: ['country', 'country-name'], re: /country/i },
    { key: 'website', ac: ['url'], re: /website|url|homepage|site/i },
    { key: 'dob', ac: ['bday'], re: /birth|dob|bday/i },
    { key: 'username', ac: ['username'], re: /user[\s_-]?name|login|handle/i },
  ];

  function matchProfileKey(el) {
    const ac = (el.getAttribute('autocomplete') || '').toLowerCase().split(/\s+/).pop();
    if (ac) {
      const rule = PROFILE_RULES.find((r) => r.ac.includes(ac));
      if (rule) return rule.key;
    }
    if (el.type === 'email') return 'email';
    if (el.type === 'tel') return 'phone';
    const hints = [el.name, el.id, el.placeholder, labelFor(el)].filter(Boolean);
    for (const rule of PROFILE_RULES) {
      if (hints.some((h) => rule.re.test(h))) return rule.key;
    }
    return null;
  }

  function autofillProfile(profile, { overwrite = false } = {}) {
    const values = { ...profile };
    if (!values.fullName && (values.firstName || values.lastName)) {
      values.fullName = [values.firstName, values.lastName].filter(Boolean).join(' ');
    }
    const custom = Array.isArray(profile.custom) ? profile.custom : [];
    let filled = 0;
    document.querySelectorAll(FIELD_QUERY).forEach((el) => {
      if (!isFillable(el) || !isVisible(el)) return;
      const type = (el.type || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') return;
      if (!overwrite && el.value) return;

      let value;
      const hints = [el.name, el.id, el.placeholder, labelFor(el)].filter(Boolean).join(' ').toLowerCase();
      const customHit = custom.find((c) => c.key && hints.includes(c.key.toLowerCase()));
      if (customHit) value = customHit.value;
      else {
        const key = matchProfileKey(el);
        if (key) value = values[key];
      }
      if (value && applyValue(el, { value })) filled++;
    });
    return { filled };
  }

  // ---------- Auto-generated (random) data ----------

  function clampLength(el, value) {
    const max = el.maxLength;
    return max > 0 && typeof value === 'string' ? value.slice(0, max) : value;
  }

  function randomNumber(el, hints) {
    const F = globalThis.FDMFaker;
    let min = el.min !== '' ? Number(el.min) : NaN;
    let max = el.max !== '' ? Number(el.max) : NaN;
    if (Number.isNaN(min) || Number.isNaN(max)) {
      if (/age/.test(hints)) [min, max] = [18, 70];
      else if (/year/.test(hints)) [min, max] = [1990, 2026];
      else if (/qty|quantity|count|number of/.test(hints)) [min, max] = [1, 10];
      else if (/price|amount|salary|cost|budget/.test(hints)) [min, max] = [100, 5000];
      else [min, max] = [Number.isNaN(min) ? 1 : min, Number.isNaN(max) ? 100 : max];
    }
    const step = Number(el.step) || 1;
    const steps = Math.floor((max - min) / step);
    return String(min + F.int(0, Math.max(0, steps)) * step);
  }

  function generateValue(el, person) {
    const F = globalThis.FDMFaker;
    const type = el.tagName === 'TEXTAREA' ? 'textarea' : (el.type || 'text').toLowerCase();
    const hints = [el.name, el.id, el.placeholder, labelFor(el)].filter(Boolean).join(' ').toLowerCase();
    const key = matchProfileKey(el);

    switch (type) {
      case 'email':
        return person.email;
      case 'tel':
        return person.phone;
      case 'url':
        return person.website;
      case 'number':
      case 'range':
        return randomNumber(el, hints);
      case 'date':
        return key === 'dob' || /birth|dob/.test(hints) ? person.dob : F.date();
      case 'datetime-local':
        return `${F.date()}T${F.time()}`;
      case 'time':
        return F.time();
      case 'month':
        return F.date().slice(0, 7);
      case 'week':
        return `${F.int(2024, 2027)}-W${String(F.int(1, 52)).padStart(2, '0')}`;
      case 'color':
        return `#${F.int(0, 0xffffff).toString(16).padStart(6, '0')}`;
      case 'textarea':
        return F.paragraph();
    }

    if (key && person[key]) return person[key];
    if (/message|comment|description|bio|about|note|feedback|summary|details/.test(hints)) return F.sentence(10, 20);
    if (/subject|title|heading/.test(hints)) return F.sentence(3, 6).replace(/\.$/, '');
    if (/age/.test(hints)) return String(F.int(18, 70));
    if (/amount|price|salary|budget|qty|quantity/.test(hints)) return randomNumber(el, hints);
    if (/code|otp|pin/.test(hints)) return String(F.int(100000, 999999));
    if (/search|query|keyword/.test(hints)) return F.words(2);
    return F.words(F.int(1, 3)).replace(/^./, (c) => c.toUpperCase());
  }

  const OPTION_ALIASES = {
    'United States': ['united states', 'united states of america', 'usa', 'us', 'u.s.', 'u.s.a.'],
  };
  const STATE_NAMES = { NY: 'new york', TX: 'texas', CA: 'california', WA: 'washington', IL: 'illinois', MA: 'massachusetts' };

  function matchOption(options, el, person) {
    const key = matchProfileKey(el);
    if (!key || !person[key]) return null;
    const wanted = new Set([String(person[key]).toLowerCase(), ...(OPTION_ALIASES[person[key]] || [])]);
    if (key === 'state' && STATE_NAMES[person.state]) wanted.add(STATE_NAMES[person.state]);
    if (key === 'country' && person.countryCode) wanted.add(person.countryCode.toLowerCase());
    return options.find(
      (o) => wanted.has(o.value.trim().toLowerCase()) || wanted.has(o.text.trim().toLowerCase())
    );
  }

  function autoGenerate({ overwrite = false, person: given } = {}) {
    const F = globalThis.FDMFaker;
    const person = given || F.profile();
    const touched = [];
    const radioGroups = new Map();

    document.querySelectorAll(FIELD_QUERY).forEach((el) => {
      if (!isFillable(el) || !isVisible(el) || el.readOnly) return;
      const type = (el.type || '').toLowerCase();

      if (type === 'radio') {
        const key = `${el.form ? cssPath(el.form) : ''}|${el.name}`;
        if (!radioGroups.has(key)) radioGroups.set(key, []);
        radioGroups.get(key).push(el);
        return;
      }

      if (type === 'checkbox') {
        if (!overwrite && el.checked) return;
        // Required boxes (e.g. "accept terms") always get ticked; others are random.
        const want = el.required || Math.random() < 0.5;
        if (applyValue(el, { checked: want })) touched.push(el);
        return;
      }

      if (el.tagName === 'SELECT') {
        const options = [...el.options].filter((o) => !o.disabled && o.value !== '');
        if (!options.length) return;
        if (!overwrite && el.selectedIndex > 0) return;
        // Keep country/state dropdowns consistent with the generated person.
        const matched = matchOption(options, el, person);
        if (matched && !el.multiple) {
          applyValue(el, { value: matched.value });
          touched.push(el);
          return;
        }
        if (el.multiple) {
          const chosen = options.filter(() => Math.random() < 0.4);
          if (!chosen.length) chosen.push(F.pick(options));
          applyValue(el, { value: chosen.map((o) => o.value) });
        } else {
          applyValue(el, { value: F.pick(options).value });
        }
        touched.push(el);
        return;
      }

      if (!overwrite && el.value) return;
      const value = clampLength(el, generateValue(el, person));
      if (value != null && applyValue(el, { value })) touched.push(el);
    });

    radioGroups.forEach((radios) => {
      if (!overwrite && radios.some((r) => r.checked)) return;
      const radio = F.pick(radios);
      if (applyValue(radio, { checked: true })) touched.push(radio);
    });

    return { filled: touched.length, fields: touched.map(serializeField) };
  }

  // ---------- Auto history on submit ----------

  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      const fields = collectFields(form, { onlyFilled: true });
      if (!fields.length) return;
      try {
        chrome.runtime.sendMessage({
          type: 'history:add',
          entry: { action: 'submitted', url: location.href, title: document.title, fields },
        });
      } catch (_) {
        /* extension reloaded; ignore */
      }
    },
    true
  );

  // ---------- Auto-fill saved forms on page load ----------

  function urlKey(url) {
    try {
      const u = new URL(url);
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch (_) {
      return url;
    }
  }

  async function autoFillOnLoad() {
    try {
      const { savedForms = [] } = await chrome.storage.local.get('savedForms');
      const here = urlKey(location.href);
      const form = savedForms.find((f) => f.autoFill && urlKey(f.url) === here);
      if (!form) return;
      // Give SPAs a moment to render their inputs.
      setTimeout(() => fillFields(form.fields), 800);
    } catch (_) {
      /* storage unavailable */
    }
  }
  autoFillOnLoad();

  // ---------- Messages from side panel ----------

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg?.type) {
      case 'ping':
        sendResponse({ ok: true });
        break;
      case 'capture': {
        const fields = collectFields(document, { onlyFilled: msg.onlyFilled !== false });
        sendResponse({ ok: true, url: location.href, title: document.title, fields });
        break;
      }
      case 'fill':
        sendResponse({ ok: true, ...fillFields(msg.fields || []) });
        break;
      case 'autofillProfile':
        sendResponse({ ok: true, ...autofillProfile(msg.profile || {}, { overwrite: msg.overwrite }) });
        break;
      case 'autoGenerate':
        sendResponse({ ok: true, ...autoGenerate({ overwrite: msg.overwrite, person: msg.person }) });
        break;
      case 'clearForm': {
        let cleared = 0;
        document.querySelectorAll(FIELD_QUERY).forEach((el) => {
          if (!isFillable(el)) return;
          const type = (el.type || '').toLowerCase();
          if (type === 'checkbox' || type === 'radio') {
            if (el.checked) applyValue(el, { checked: false });
          } else if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
            fire(el);
          } else if (el.value) {
            setNativeValue(el, '');
            fire(el);
          }
          cleared++;
        });
        sendResponse({ ok: true, cleared });
        break;
      }
      default:
        return false;
    }
    return false;
  });
})();
