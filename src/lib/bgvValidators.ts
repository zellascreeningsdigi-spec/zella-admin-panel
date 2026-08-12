// ---------------------------------------------------------------------------
// GENERATED MIRROR — DO NOT EDIT DIRECTLY.
//
// Source of truth: Zella-Screenings-backend/services/bgvFieldValidators.js
// Copied verbatim (with TypeScript annotations added) because the admin panel
// and backend are separate packages and CRA's rootDir forbids importing across
// the boundary.
//
// After changing the backend module, re-sync with:
//   node Zella-Screenings-backend/scripts/syncBgvValidators.js
// The sync script fails CI if the two files have drifted.
// ---------------------------------------------------------------------------

// Shared validation rules for candidate-submitted BGV form data.
//
// This module is the SINGLE SOURCE OF TRUTH for BGV field rules. It is mirrored
// by zella-admin-panel/src/lib/bgvValidators.ts for inline form feedback; the
// backend re-runs these rules on submit so the public endpoint cannot be
// bypassed by a direct API call.
//
// Deliberately dependency-free and side-effect-free so both tiers can use it.
//
// The Aadhaar/PAN/mobile predicates mirror services/scannerValidators.js, which
// has been in production use on the OCR pipeline.

// ---------------------------------------------------------------------------
// Verhoeff checksum (standard public tables — used for Aadhaar validation)
// ---------------------------------------------------------------------------
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

export function verhoeffCheck(str: string): boolean {
  if (typeof str !== 'string' || !/^\d+$/.test(str)) return false;
  let c = 0;
  const reversed = str.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][parseInt(reversed[i], 10)]];
  }
  return c === 0;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// ---------------------------------------------------------------------------
// Numeric / format rules
// ---------------------------------------------------------------------------

/**
 * Indian mobile: exactly 10 digits, leading 6-9.
 *
 * Separators are ignored and a leading +91 / 0 trunk prefix is tolerated —
 * candidates routinely paste "+91 98765 43210".
 */
export function isValidMobile(value: unknown): boolean {
  let digits = str(value).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Aadhaar: exactly 12 digits.
 *
 * The Verhoeff checksum is deliberately NOT enforced here. It was tried and
 * reverted: it blocked live candidates whose real Aadhaar had a single
 * mistyped digit, with an error message that gave them no way to understand
 * why a 12-digit number was rejected. Length is the rule that stops the
 * gibberish this validation exists to catch.
 *
 * verhoeffCheck remains exported for the OCR pipeline, which uses it to flag
 * low-confidence extractions for review rather than to block a submission.
 */
export function isValidAadhaar(value: unknown): boolean {
  const digits = str(value).replace(/\D/g, '');
  if (!/^\d{12}$/.test(digits)) return false;
  // Reject all-same-digit placeholders ("111111111111"), which are dummy input
  // rather than a mistyped real number.
  if (/^(\d)\1{11}$/.test(digits)) return false;
  return true;
}

/** PAN: 5 letters + 4 digits + 1 letter. Case-insensitive. */
export function isValidPan(value: unknown): boolean {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(str(value).toUpperCase());
}

/** Year of passing: 4-digit year between 1950 and (current year + 6). */
export function isValidYear(value: unknown): boolean {
  const v = str(value);
  if (!/^\d{4}$/.test(v)) return false;
  const year = parseInt(v, 10);
  return year >= 1950 && year <= new Date().getFullYear() + 6;
}

/** CTC: numeric. Currency symbols, commas and spaces are stripped first. */
export function isValidCtc(value: unknown): boolean {
  const cleaned = str(value).replace(/[₹$,\s]/g, '');
  if (cleaned === '') return false;
  return /^\d+(\.\d+)?$/.test(cleaned);
}

/** Standard email shape: name@company.tld */
export function isValidEmail(value: unknown): boolean {
  const v = str(value);
  if (!v || /\s/.test(v)) return false;
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
}

/** True when `later` is strictly after `earlier`. Blank values pass (handled by required-checks). */
export function isAfter(later: unknown, earlier: unknown): boolean {
  const a = str(later);
  const b = str(earlier);
  if (!a || !b) return true;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return true;
  return da.getTime() > db.getTime();
}

/** Normalisers applied before persisting. */
export const normalise = {
  // Mirrors isValidMobile's prefix handling so the stored value is the bare
  // 10-digit number that was actually validated.
  mobile: (v: unknown): string => {
    let digits = str(v).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  },
  aadhaar: (v: unknown): string => str(v).replace(/\D/g, ''),
  pan: (v: unknown): string => str(v).toUpperCase(),
  ctc: (v: unknown): string => str(v).replace(/[₹$,\s]/g, '')
};

// ---------------------------------------------------------------------------
// Gibberish detection
// ---------------------------------------------------------------------------
// Structural heuristics only — no dictionary. Tuned so that real Indian names,
// universities and qualifications pass while keyboard-mashing fails. The corpus
// in scripts/bgvValidatorCorpus.js is the regression guard for this tuning.

// 'y' counts as a vowel: "Symbiosis", "Mysuru", "Krishnamurthy" depend on it.
const VOWELS = 'aeiouy';

// Sequences that indicate a finger dragged across the keyboard.
const KEYBOARD_ROWS = [
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  '1234567890', 'poiuytrewq', 'lkjhgfdsa', 'mnbvcxz'
];

/** 4+ characters appearing consecutively on one keyboard row. */
function hasKeyboardRun(lower: string): boolean {
  const letters = lower.replace(/[^a-z0-9]/g, '');
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i + 4 <= row.length; i++) {
      if (letters.includes(row.slice(i, i + 4))) return true;
    }
  }
  return false;
}

/**
 * The WHOLE token is a short unit repeated back to back: "asdasd", "jkjkjk".
 *
 * Anchored to the entire token rather than scanning for any internal repeat —
 * an internal scan false-fires on ordinary words ("competitive" contains "eti"
 * twice) and on enrollment codes containing years ("ENR2020123").
 */
function isWhollyRepeatedUnit(token: string): boolean {
  const letters = token.replace(/[^a-z0-9]/g, '');
  // Requires 6+ chars: real words like "tata", "mama" and "dada" are exactly a
  // 2-char unit doubled, so a 4-char threshold rejects legitimate names.
  if (letters.length < 6) return false;
  for (let unit = 1; unit <= Math.floor(letters.length / 2); unit++) {
    if (letters.length % unit !== 0) continue;
    const head = letters.slice(0, unit);
    const parts = letters.match(new RegExp(`.{1,${unit}}`, 'g')) || [];
    if (parts.every((p: string) => p === head)) return true;
  }
  return false;
}

/**
 * A token is implausible when it has a very long consonant run.
 *
 * With 'y' treated as a vowel, genuine Indian proper nouns top out around four
 * consecutive consonants ("Krishnamurthy" -> shnm, "Chhattisgarh" -> chh/tt sg).
 * Five or more is reliably mashing. A whitelist of "legal clusters" was tried
 * first and abandoned: real names produce far too many valid clusters to
 * enumerate, and every miss blocks a real candidate.
 */
function hasImplausibleConsonantRun(word: string): boolean {
  const letters = word.replace(/[^a-z]/g, '');
  if (letters.length < 5) return false;
  return letters
    .split(new RegExp(`[${VOWELS}]+`))
    .filter(Boolean)
    .some((run: string) => run.length >= 5);
}

/**
 * Vowel-to-letter ratio sanity check. Real words in Latin script sit roughly
 * between 0.2 and 0.8. Values far outside that are mashing.
 */
function hasImplausibleVowelRatio(word: string): boolean {
  const letters = word.replace(/[^a-z]/g, '');
  if (letters.length < 5) return false;
  const vowels = letters.split('').filter((c: string) => VOWELS.includes(c)).length;
  const ratio = vowels / letters.length;
  return ratio < 0.2 || ratio > 0.8;
}

/**
 * Four or more consecutive vowels ("rheeye5" -> "eeye").
 *
 * This is the signal that catches mashing which happens to contain vowels and
 * therefore slips past every other rule. English and transliterated Indian
 * words effectively never stack four vowels in a row; the longest common runs
 * are three ("beau", "aayi").
 */
function hasImplausibleVowelRun(word: string): boolean {
  const letters = word.replace(/[^a-z]/g, '');
  return new RegExp(`[${VOWELS}]{4,}`).test(letters);
}

/** Words allowed to bypass the vowel requirement (common abbreviations). */
const KNOWN_ABBREVIATIONS = new Set([
  'bsc', 'msc', 'mba', 'bca', 'mca', 'bba', 'phd', 'llb', 'llm', 'bds', 'mds',
  'mbbs', 'btech', 'mtech', 'be', 'me', 'ba', 'ma', 'bcom', 'mcom', 'iit',
  'nit', 'bits', 'vtu', 'jntu', 'ignou', 'cbse', 'icse', 'hsc', 'ssc', 'pg',
  'ug', 'diploma', 'hons', 'st', 'dr', 'mr', 'ms', 'jr', 'sr', 'ltd', 'pvt',
  'inc', 'llp', 'hr', 'it', 'ceo', 'cto', 'vp', 'sde', 'qa'
]);

/**
 * Reject placeholder / keyboard-mash text while accepting real-world values.
 *
 * @param {string} value
 * @param {{ minLength?: number, allowCode?: boolean }} [opts]
 *   minLength — minimum trimmed length (default 3)
 *   allowCode — treat as an identifier (enrollment no.); skips the vowel,
 *               consonant-run and vowel-ratio rules, which do not apply to
 *               alphanumeric codes like "1RV18CS045".
 */
export function isMeaningfulText(value: unknown, opts: { minLength?: number; allowCode?: boolean } = {}): boolean {
  const { minLength = 3, allowCode = false } = opts;
  const v = str(value);

  if (v.length < minLength) return false;

  const lower = v.toLowerCase();

  // Must contain at least one letter — "1234" and "...." are not names.
  if (!/[a-z]/.test(lower)) return false;

  // 3+ identical LETTERS in a row: "xxxx", "aaaa". Digits are exempt —
  // PIN codes and house numbers legitimately repeat ("560001", "700016").
  if (/([a-z])\1{2,}/.test(lower)) return false;

  const tokens = lower.split(/[^a-z0-9']+/).filter(Boolean);

  if (allowCode) {
    // Identifiers ("1RV18CS045", "20BCE1234") legitimately contain digit runs
    // like "1234" and have no phonetic structure, so only the length and
    // wholly-repeated checks apply.
    if (tokens.some((t: string) => isWhollyRepeatedUnit(t))) return false;
    return v.length >= Math.max(minLength, 4);
  }

  if (hasKeyboardRun(lower)) return false;
  if (tokens.some((t: string) => isWhollyRepeatedUnit(t))) return false;

  // Placeholder words people type to get past a form.
  if (/^(test|testing|dummy|sample|abc|xyz|asdf|qwerty|na|n\/a|none|nil|null|undefined|foo|bar|temp|blah)$/i.test(lower)) {
    return false;
  }

  if (tokens.length === 0) return false;

  for (const word of tokens) {
    const letters = word.replace(/[^a-z]/g, '');
    // Purely numeric tokens (PIN codes, house numbers, years) carry no phonetic
    // structure — "560001" is a valid part of an address, not gibberish.
    if (letters.length === 0) continue;

    // A vowel run is implausible at any length: "eeye" in "rheeye5".
    if (hasImplausibleVowelRun(word)) return false;

    // Short tokens and known abbreviations bypass the remaining phonetic checks.
    if (letters.length <= 3 || KNOWN_ABBREVIATIONS.has(letters)) continue;

    if (!letters.split('').some((c: string) => VOWELS.includes(c))) return false;
    if (hasImplausibleConsonantRun(word)) return false;
    if (hasImplausibleVowelRatio(word)) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Whole-form validation
// ---------------------------------------------------------------------------

export const MESSAGES = {
  mobile: 'Enter a valid 10-digit mobile number',
  aadhaar: 'Enter a valid 12-digit Aadhaar number',
  pan: 'Enter a valid PAN (e.g. ABCDE1234F)',
  year: 'Enter a valid 4-digit year',
  ctc: 'Enter numbers only',
  email: 'Enter a valid email (e.g. name@company.com)',
  text: 'Enter a valid value',
  reason: 'Enter a meaningful reason (at least 10 characters)',
  required: 'This field is required',
  periodOrder: 'Period To must be after Period From',
  addressType: 'Select at least one current and one permanent address',
  addressDuration: 'Enter the duration of stay'
};

const has = (v: unknown): boolean => str(v).length > 0;

/**
 * Validate candidate-submitted BGV form data.
 *
 * Only non-empty values are format-checked, except where a field is explicitly
 * required — a candidate can leave optional fields blank, but must not fill
 * them with gibberish.
 *
 * @param {object} formData
 * @param {{ steps?: object }} [config] - enabled steps from the collection's formConfig
 * @returns {Record<string, string>} field path -> message (empty when valid)
 */
export function validateBGVFormData(formData: any = {}, config: any = {}): Record<string, string> {
  const errors: Record<string, string> = {};
  const steps = config.steps || {};
  const stepOn = (key: string) => steps[key] !== false;

  const set = (path: string, msg: string) => {
    if (!errors[path]) errors[path] = msg;
  };

  // --- Personal info -------------------------------------------------------
  const pi = formData.personalInfo || {};

  if (!has(pi.fullName)) set('personalInfo.fullName', MESSAGES.required);
  else if (!isMeaningfulText(pi.fullName)) set('personalInfo.fullName', MESSAGES.text);

  if (has(pi.fathersName) && !isMeaningfulText(pi.fathersName)) {
    set('personalInfo.fathersName', MESSAGES.text);
  }

  if (!has(pi.mobile)) set('personalInfo.mobile', MESSAGES.required);
  else if (!isValidMobile(pi.mobile)) set('personalInfo.mobile', MESSAGES.mobile);

  if (has(pi.alternateNumber) && !isValidMobile(pi.alternateNumber)) {
    set('personalInfo.alternateNumber', MESSAGES.mobile);
  }

  if (!has(pi.email)) set('personalInfo.email', MESSAGES.required);
  else if (!isValidEmail(pi.email)) set('personalInfo.email', MESSAGES.email);

  if (!has(pi.aadhaarNumber)) set('personalInfo.aadhaarNumber', MESSAGES.required);
  else if (!isValidAadhaar(pi.aadhaarNumber)) set('personalInfo.aadhaarNumber', MESSAGES.aadhaar);

  if (!has(pi.panNumber)) set('personalInfo.panNumber', MESSAGES.required);
  else if (!isValidPan(pi.panNumber)) set('personalInfo.panNumber', MESSAGES.pan);

  // --- Addresses -----------------------------------------------------------
  const addresses = Array.isArray(pi.addresses) ? pi.addresses : [];
  addresses.forEach((addr: any, i: number) => {
    if (!has(addr.address)) set(`personalInfo.addresses.${i}.address`, MESSAGES.required);
    else if (!isMeaningfulText(addr.address, { minLength: 10 })) {
      set(`personalInfo.addresses.${i}.address`, MESSAGES.text);
    }

    // Duration is NOT required. Candidates who began the form before the
    // structured duration fields existed have neither `durationYears` nor the
    // old free-text `duration`, and blocking them strands an in-flight
    // submission on a field that did not exist when they started. Only the
    // value's shape is checked, when a value is actually present.
    const years = addr.durationYears;
    const months = addr.durationMonths;
    if (years != null && (Number.isNaN(Number(years)) || Number(years) < 0)) {
      set(`personalInfo.addresses.${i}.durationYears`, MESSAGES.addressDuration);
    }
    if (months != null && (Number.isNaN(Number(months)) || Number(months) < 0 || Number(months) > 11)) {
      set(`personalInfo.addresses.${i}.durationMonths`, MESSAGES.addressDuration);
    }
  });

  // Address type is likewise not required — it is new, optional metadata that
  // feeds later routing work. Requiring a current/permanent pair would block
  // every candidate mid-form and every legacy record.

  // --- Education -----------------------------------------------------------
  if (stepOn('education')) {
    const ed = formData.education || {};

    if (!has(ed.degree)) set('education.degree', MESSAGES.required);
    else if (!isMeaningfulText(ed.degree)) set('education.degree', MESSAGES.text);

    if (has(ed.enrollmentNo) && !isMeaningfulText(ed.enrollmentNo, { allowCode: true })) {
      set('education.enrollmentNo', MESSAGES.text);
    }

    if (!has(ed.yearOfPassing)) set('education.yearOfPassing', MESSAGES.required);
    else if (!isValidYear(ed.yearOfPassing)) set('education.yearOfPassing', MESSAGES.year);

    if (!has(ed.universityName)) set('education.universityName', MESSAGES.required);
    else if (!isMeaningfulText(ed.universityName)) set('education.universityName', MESSAGES.text);

    if (has(ed.universityLocation) && !isMeaningfulText(ed.universityLocation)) {
      set('education.universityLocation', MESSAGES.text);
    }

    if (!isAfter(ed.periodOfStudyTo, ed.periodOfStudyFrom)) {
      set('education.periodOfStudyTo', MESSAGES.periodOrder);
    }
  }

  // --- Employment ----------------------------------------------------------
  if (stepOn('employment')) {
    const employments = Array.isArray(formData.employmentHistory) ? formData.employmentHistory : [];
    employments.forEach((emp: any, i: number) => {
      const p = (f: string) => `employmentHistory.${i}.${f}`;
      // Blank rows are skipped: candidates may have fewer than the max entries.
      const filled = Object.values(emp || {}).some((val: unknown) => has(val));
      if (!filled) return;

      if (has(emp.companyName) && !isMeaningfulText(emp.companyName)) set(p('companyName'), MESSAGES.text);
      if (has(emp.designation) && !isMeaningfulText(emp.designation)) set(p('designation'), MESSAGES.text);
      if (has(emp.ctc) && !isValidCtc(emp.ctc)) set(p('ctc'), MESSAGES.ctc);

      if (has(emp.supervisorName) && !isMeaningfulText(emp.supervisorName)) set(p('supervisorName'), MESSAGES.text);
      if (has(emp.supervisorContact) && !isValidMobile(emp.supervisorContact)) set(p('supervisorContact'), MESSAGES.mobile);
      if (has(emp.supervisorEmail) && !isValidEmail(emp.supervisorEmail)) set(p('supervisorEmail'), MESSAGES.email);

      if (has(emp.hrName) && !isMeaningfulText(emp.hrName)) set(p('hrName'), MESSAGES.text);
      if (has(emp.hrContact) && !isValidMobile(emp.hrContact)) set(p('hrContact'), MESSAGES.mobile);
      if (has(emp.hrEmail) && !isValidEmail(emp.hrEmail)) set(p('hrEmail'), MESSAGES.email);

      if (has(emp.reasonForLeaving) && !isMeaningfulText(emp.reasonForLeaving)) {
        set(p('reasonForLeaving'), MESSAGES.text);
      }

      if (!isAfter(emp.periodTo, emp.periodFrom)) set(p('periodTo'), MESSAGES.periodOrder);
    });
  }

  // --- References ----------------------------------------------------------
  if (stepOn('references')) {
    const refs = Array.isArray(formData.references) ? formData.references : [];
    refs.forEach((ref: any, i: number) => {
      const p = (f: string) => `references.${i}.${f}`;
      const filled = Object.values(ref || {}).some((val: unknown) => has(val));
      if (!filled) return;

      if (has(ref.name) && !isMeaningfulText(ref.name)) set(p('name'), MESSAGES.text);
      if (has(ref.designation) && !isMeaningfulText(ref.designation)) set(p('designation'), MESSAGES.text);
      if (has(ref.organization) && !isMeaningfulText(ref.organization)) set(p('organization'), MESSAGES.text);
      if (has(ref.relationship) && !isMeaningfulText(ref.relationship)) set(p('relationship'), MESSAGES.text);
      if (has(ref.contact) && !isValidMobile(ref.contact)) set(p('contact'), MESSAGES.mobile);
      if (has(ref.email) && !isValidEmail(ref.email)) set(p('email'), MESSAGES.email);
    });
  }

  // --- Gap details ---------------------------------------------------------
  if (stepOn('gapDetails')) {
    const gaps = Array.isArray(formData.gapDetails) ? formData.gapDetails : [];
    gaps.forEach((gap: any, i: number) => {
      if (gap?.hasGap !== 'yes') return;
      // Answering "Yes" makes duration and reason mandatory and quality-checked.
      if (!has(gap.duration)) set(`gapDetails.${i}.duration`, MESSAGES.required);
      else if (!isMeaningfulText(gap.duration, { allowCode: true })) {
        set(`gapDetails.${i}.duration`, MESSAGES.text);
      }

      if (!has(gap.reason)) set(`gapDetails.${i}.reason`, MESSAGES.required);
      else if (!isMeaningfulText(gap.reason, { minLength: 10 })) {
        set(`gapDetails.${i}.reason`, MESSAGES.reason);
      }
    });
  }

  return errors;
}

const bgvFieldValidators = {
  verhoeffCheck,
  isValidMobile,
  isValidAadhaar,
  isValidPan,
  isValidYear,
  isValidCtc,
  isValidEmail,
  isAfter,
  isMeaningfulText,
  validateBGVFormData,
  MESSAGES,
  normalise
};

export default bgvFieldValidators;
