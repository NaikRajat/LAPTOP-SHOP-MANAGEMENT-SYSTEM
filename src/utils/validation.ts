/**
 * SysTech Authentication & User Input Validation Utility
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  checks: PasswordChecks;
}

/**
 * 1. Email format validation
 * - Trims leading/trailing whitespace and converts to lowercase
 * - Enforces standard RFC 5322 structure
 * - Rejects incomplete/malformed emails, missing TLD, consecutive dots, etc.
 * - Detects common typos like 'email@gmail.co'
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const clean = email.trim().toLowerCase();
  if (clean.length === 0) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  // RFC 5322 compliant regex for practical email addresses
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const parts = clean.split('@');
  if (parts.length !== 2) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  if (!domain || domain.length < 4 || domain.length > 255 || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  // Common typo checks (e.g. gmail.co instead of gmail.com)
  if (domain === 'gmail.co' || domain === 'gmail.c' || domain === 'gmail.cm') {
    return { valid: false, error: 'Please enter a valid email address. (Did you mean @gmail.com?)' };
  }
  if (domain === 'yahoo.co') {
    return { valid: false, error: 'Please enter a valid email address. (Did you mean @yahoo.com or @yahoo.co.in?)' };
  }
  if (domain === 'hotmail.co') {
    return { valid: false, error: 'Please enter a valid email address. (Did you mean @hotmail.com?)' };
  }

  return { valid: true };
}

/**
 * 2. Mobile number validation
 * - Numerical digits only
 * - Indian mobile numbers: exactly 10 digits starting with 6, 7, 8, or 9
 */
export function sanitizeMobileDigits(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.slice(0, 10);
}

export function validateIndianMobile(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Please enter a valid 10-digit mobile number.' };
  }

  // Reject if letters or disallowed characters are present
  if (/[a-zA-Z]/.test(phone)) {
    return { valid: false, error: 'Please enter a valid 10-digit mobile number.' };
  }

  let rawDigits = phone.replace(/\D/g, '');
  if (rawDigits.length === 12 && rawDigits.startsWith('91')) {
    rawDigits = rawDigits.slice(2);
  } else if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
    rawDigits = rawDigits.slice(1);
  }

  if (rawDigits.length !== 10) {
    return { valid: false, error: 'Please enter a valid 10-digit mobile number.' };
  }

  if (!/^[6-9]\d{9}$/.test(rawDigits)) {
    return { valid: false, error: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.' };
  }

  return { valid: true };
}

/**
 * 3. Strong password policy
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one numerical digit
 * - At least one special character
 */
export function getPasswordChecks(password: string): PasswordChecks {
  const p = password || '';
  return {
    minLength: p.length >= 8,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p)
  };
}

export function validateStrongPassword(password: string): PasswordValidationResult {
  const checks = getPasswordChecks(password);
  const isValid = checks.minLength && checks.hasUpper && checks.hasLower && checks.hasNumber && checks.hasSpecial;

  if (!isValid) {
    if (!checks.minLength) {
      return { valid: false, error: 'Password must be at least 8 characters long.', checks };
    }
    if (!checks.hasUpper) {
      return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).', checks };
    }
    if (!checks.hasLower) {
      return { valid: false, error: 'Password must contain at least one lowercase letter (a-z).', checks };
    }
    if (!checks.hasNumber) {
      return { valid: false, error: 'Password must contain at least one numerical digit (0-9).', checks };
    }
    if (!checks.hasSpecial) {
      return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*...).', checks };
    }
  }

  return { valid: true, checks };
}
