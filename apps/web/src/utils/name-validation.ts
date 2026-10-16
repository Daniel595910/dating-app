/**
 * Name validation.
 *
 * Rejects obviously fake or garbage names before they reach the DB:
 *   - digits, symbols, or most punctuation
 *   - fewer than 2 or more than 40 characters
 *   - 3+ of the same character in a row ("dddd", "aaaa")
 *   - names with no vowels ("bcd", "qwerty")
 *   - a small blocklist of common test/fake names
 *
 * Deliberately permissive — real names are weird. If we're not sure,
 * we allow it.
 */

const BLOCKLIST = new Set([
  'test', 'tests', 'testing', 'tester',
  'admin', 'administrator', 'root', 'user', 'guest',
  'apple', 'banana', 'orange', 'cherry', 'grape',
  'qwerty', 'asdf', 'asdfasdf', 'zxcv', 'qazwsx',
  'null', 'undefined', 'nan', 'nil', 'none',
  'fake', 'dummy', 'spam', 'junk',
  'god', 'jesus', 'satan',
  'sd', 'ss', 'xx', 'zz',
]);

// Names that are fine even though they have no vowels.
const VOWELLESS_ALLOWLIST = new Set([
  'ng', 'nr', 'mr', 'mrs', 'ms', 'dr',
  'hy', 'wy', 'ky', 'sy', 'ty', 'my',
  'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't',
]);

const LETTERS_AND_SPACES = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
const HAS_THREE_IN_A_ROW = /(.)\1\1/i;
const HAS_VOWEL = /[aeiouyà-öø-ÿ]/i;

export interface NameValidationResult {
  valid: boolean;
  error?: string;
}

export function validateName(value: string, fieldLabel = 'Name'): NameValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, error: `${fieldLabel} is required.` };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: `${fieldLabel} must be at least 2 characters.` };
  }
  if (trimmed.length > 40) {
    return { valid: false, error: `${fieldLabel} must be under 40 characters.` };
  }
  if (!LETTERS_AND_SPACES.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} can only contain letters, spaces, hyphens, and apostrophes.` };
  }
  if (HAS_THREE_IN_A_ROW.test(trimmed)) {
    return { valid: false, error: `${fieldLabel} looks like a placeholder. Please enter your real name.` };
  }
  if (BLOCKLIST.has(trimmed.toLowerCase())) {
    return { valid: false, error: `${fieldLabel} isn't allowed. Please use your real name.` };
  }
  if (!HAS_VOWEL.test(trimmed) && !VOWELLESS_ALLOWLIST.has(trimmed.toLowerCase())) {
    return { valid: false, error: `${fieldLabel} doesn't look like a real name.` };
  }

  return { valid: true };
}

export function validateFirstAndLastName(
  firstName: string,
  lastName: string
): NameValidationResult {
  const first = validateName(firstName, 'First name');
  if (!first.valid) return first;

  // Last name is optional — single-word names are legitimate.
  if (lastName.trim()) {
    const last = validateName(lastName, 'Last name');
    if (!last.valid) return last;
  }

  return { valid: true };
}