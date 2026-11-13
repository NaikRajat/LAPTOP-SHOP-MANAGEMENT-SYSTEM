import { validateEmail, sanitizeMobileDigits, validateIndianMobile, validateStrongPassword, getPasswordChecks } from '../src/utils/validation.ts';

console.log('=== SYSTECH AUTHENTICATION & USER PROFILE VALIDATION TEST SUITE ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// 1. EMAIL VALIDATION TESTS
// -------------------------------------------------------------
console.log('\n--- 1. EMAIL VALIDATION TESTS ---');

// Test 1.1: Common typo email@gmail.co
const typoResult = validateEmail('email@gmail.co');
assert(!typoResult.valid, 'Reject email@gmail.co', typoResult.error);
assert(typoResult.error?.includes('Did you mean @gmail.com?'), 'Provide helpful typo correction for @gmail.co', typoResult.error);

// Test 1.2: Malformed and incomplete emails
const malformedList = [
  'user@',
  '@domain.com',
  'user@domain',
  'user@domain.',
  'user@.com',
  'user..name@gmail.com',
  '.user@gmail.com',
  'user@gmail..com',
  'email@yahoo.co',
  'email@hotmail.co',
  'plainaddress',
  'missingatsign.com'
];

for (const email of malformedList) {
  const res = validateEmail(email);
  assert(!res.valid, `Reject malformed email: "${email}"`, res.error);
}

// Test 1.3: Valid emails
const validEmails = [
  'customer@systech.com',
  'rajatnaik0541@gmail.com',
  'support@domain.co.in',
  'user.name+tag@example.org',
  '  SUPPORT@SYSTECH.COM  ' // Should trim and validate
];

for (const email of validEmails) {
  const res = validateEmail(email);
  assert(res.valid, `Accept valid email: "${email}"`, res.error);
}

// -------------------------------------------------------------
// 2. MOBILE NUMBER VALIDATION TESTS
// -------------------------------------------------------------
console.log('\n--- 2. MOBILE NUMBER VALIDATION TESTS ---');

// Test 2.1: Sanitization (strip non-digits)
assert(sanitizeMobileDigits('+91 98765-43210') === '9876543210', 'Sanitize phone digits removes country code symbol and hyphen');
assert(sanitizeMobileDigits('abc98765xyz43210!!!') === '9876543210', 'Sanitize phone digits strips all letters and symbols');

// Test 2.2: Invalid mobile lengths and characters
const invalidMobiles = [
  '12345',
  '98765',
  '987654321', // 9 digits
  '9876543210123', // > 10 digits
  '1234567890', // Starts with 1 (not standard Indian mobile 6-9)
  '2345678901', // Starts with 2
  'abcdefghij', // Letters
  ''
];

for (const mob of invalidMobiles) {
  const res = validateIndianMobile(mob);
  assert(!res.valid, `Reject invalid mobile: "${mob}"`, res.error);
}

// Test 2.3: Valid 10-digit Indian numbers starting with 6, 7, 8, 9
const validMobiles = [
  '9876543210',
  '8765432109',
  '7654321098',
  '6543210987'
];

for (const mob of validMobiles) {
  const res = validateIndianMobile(mob);
  assert(res.valid, `Accept valid 10-digit Indian mobile: "${mob}"`, res.error);
}

// -------------------------------------------------------------
// 3. STRONG PASSWORD COMPLEXITY TESTS
// -------------------------------------------------------------
console.log('\n--- 3. STRONG PASSWORD COMPLEXITY TESTS ---');

// Test 3.1: Weak passwords failing specific criteria
const weakPasswords = [
  { pass: 'short', reason: '< 8 chars' },
  { pass: 'systech123@', reason: 'No uppercase letter' },
  { pass: 'SYSTECH123@', reason: 'No lowercase letter' },
  { pass: 'SysTechPassword@', reason: 'No digit' },
  { pass: 'SysTech12345', reason: 'No special character' }
];

for (const item of weakPasswords) {
  const res = validateStrongPassword(item.pass);
  assert(!res.valid, `Reject weak password (${item.reason}): "${item.pass}"`, res.error);
}

// Test 3.2: Acceptable strong password
const strongPassword = 'SysTech@123';
const strongResult = validateStrongPassword(strongPassword);
assert(strongResult.valid, `Accept strong password "${strongPassword}"`, strongResult.error);
assert(strongResult.checks.minLength, 'Check: Min 8 chars passed');
assert(strongResult.checks.hasUpper, 'Check: Uppercase passed');
assert(strongResult.checks.hasLower, 'Check: Lowercase passed');
assert(strongResult.checks.hasNumber, 'Check: Number passed');
assert(strongResult.checks.hasSpecial, 'Check: Special char passed');

// Test 3.3: Real-time requirements checker
const partialChecks = getPasswordChecks('SysTech');
assert(partialChecks.minLength === false, 'Real-time check: minLength false for 7 chars');
assert(partialChecks.hasUpper === true, 'Real-time check: hasUpper true');
assert(partialChecks.hasLower === true, 'Real-time check: hasLower true');
assert(partialChecks.hasNumber === false, 'Real-time check: hasNumber false');
assert(partialChecks.hasSpecial === false, 'Real-time check: hasSpecial false');

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log(`========================================`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL VALIDATION SPECIFICATIONS PASSED!\n');
}
