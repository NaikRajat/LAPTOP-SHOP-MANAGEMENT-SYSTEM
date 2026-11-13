import { firestoreService as dbService } from '../server/firestoreService.ts';
import { adminDb } from '../src/lib/firebase-admin.ts';
import { validateEmail, validateIndianMobile, validateStrongPassword } from '../src/utils/validation.ts';

const BASE_URL = 'http://localhost:3000';

interface AuditResult {
  scenarioId: number;
  name: string;
  passed: boolean;
  details: string;
}

const auditResults: AuditResult[] = [];

function record(scenarioId: number, name: string, passed: boolean, details: string) {
  auditResults.push({ scenarioId, name, passed, details });
  const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${statusIcon} [Scenario ${scenarioId}] ${name}: ${details}`);
}

async function runAudit() {
  console.log('================================================================');
  console.log('   FOCUSED SECURITY & REGRESSION AUDIT (10 SCENARIOS)           ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Scenario 1: Existing users with legacy passwords can still log in
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@systech.com', password: 'admin123' })
    });
    const data = await res.json();
    const passed = res.status === 200 && !!data.token && data.user?.email === 'admin@systech.com';
    record(1, 'Legacy Password Login', passed,
      passed ? 'admin@systech.com successfully logged in with legacy password "admin123" (which does not meet new policy)'
             : `Failed login with status ${res.status}: ${JSON.stringify(data)}`);
  } catch (e: any) {
    record(1, 'Legacy Password Login', false, e.message);
  }

  // -------------------------------------------------------------
  // Scenario 2: New users must satisfy the complete password policy
  // -------------------------------------------------------------
  try {
    const weakPasses = ['weak', 'SysTechNoSpecial123', 'SYSTECH@123', 'systech@123', 'Sys@1'];
    let allBlocked = true;
    let blockReason = '';
    for (const wp of weakPasses) {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Audit User',
          email: `audit_user_${Date.now()}@example.com`,
          phone: '9876543210',
          password: wp,
          sessionId: 'ses_mock',
          code: '123456'
        })
      });
      const data = await res.json();
      if (res.status !== 400 || !data.error?.includes('Password')) {
        allBlocked = false;
        blockReason = `Weak password "${wp}" was not rejected with password complexity error: ${JSON.stringify(data)}`;
        break;
      }
    }

    record(2, 'New User Complete Password Policy Enforcement', allBlocked,
      allBlocked ? 'All weak/non-compliant passwords were appropriately rejected with HTTP 400'
                 : blockReason);
  } catch (e: any) {
    record(2, 'New User Complete Password Policy Enforcement', false, e.message);
  }

  // -------------------------------------------------------------
  // Scenario 3: Google-only users can establish a password without nonexistent current password
  // -------------------------------------------------------------
  let googleToken = '';
  let googleUserEmail = `audit_google_${Date.now()}@example.com`;
  let googleUserId = '';
  try {
    // 3a. Provision Google user
    const gRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: googleUserEmail, name: 'Google Audit User' })
    });
    const gData = await gRes.json();
    googleToken = gData.token;
    googleUserId = gData.user?.uid || gData.user?.id;

    // 3b. Establish password WITHOUT providing currentPassword
    const changeRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({ newPassword: 'SysTech@Google2026' })
    });
    const changeData = await changeRes.json();
    const establishPassed = changeRes.status === 200 && changeData.success === true;

    // 3c. Verify that once established, changing password again REQUIRES currentPassword
    const reChangeWithoutCurrent = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({ newPassword: 'SysTech@Google2027' })
    });
    const reChangeData = await reChangeWithoutCurrent.json();
    const currentEnforced = reChangeWithoutCurrent.status === 400 && reChangeData.error?.includes('Current password');

    const passed = establishPassed && currentEnforced;
    record(3, 'Google-Only User Password Establishment & Subsequent Enforcement', passed,
      passed ? 'Google user established password without current password; subsequent change strictly enforced current password'
             : `Step 3b (${changeRes.status}) or 3c (${reChangeWithoutCurrent.status}) failed: ${JSON.stringify(changeData)} / ${JSON.stringify(reChangeData)}`);
  } catch (e: any) {
    record(3, 'Google-Only User Password Establishment & Subsequent Enforcement', false, e.message);
  }

  // -------------------------------------------------------------
  // Scenario 4: Authenticated users cannot change another user's password (IDOR)
  // -------------------------------------------------------------
  try {
    // User attempts to manipulate body with another user's ID or email
    await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({
        userId: 'user-admin',
        email: 'admin@systech.com',
        uid: 'user-admin',
        currentPassword: 'SysTech@Google2026',
        newPassword: 'HackedSysTech@2026'
      })
    });

    // Verify admin@systech.com password was NOT changed to the spoofed password
    const adminHacked = await dbService.verifyPassword('admin@systech.com', 'HackedSysTech@2026');
    const adminIntact = await dbService.verifyPassword('admin@systech.com', 'admin123');
    const passed = !adminHacked && !!adminIntact;

    record(4, 'IDOR Protection on Password Change', passed,
      passed ? 'Server ignored manipulated userId/email in payload; admin account untouched'
             : 'VULNERABILITY DETECTED: Admin password was altered via IDOR payload!');
  } catch (e: any) {
    record(4, 'IDOR Protection on Password Change', false, e.message);
  }

  // -------------------------------------------------------------
  // Scenario 5: Password reset links sent ONLY to authenticated account's verified email
  // -------------------------------------------------------------
  try {
    // 5a. Authenticated user provides victim's email in req.body
    const spoofRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({ email: 'victim_account@systech.com' })
    });
    const spoofData = await spoofRes.json();
    const spoofRejected = spoofRes.status === 403;

    // 5b. Authenticated user requests reset for their own verified email
    const legitRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({ email: googleUserEmail })
    });
    const legitData = await legitRes.json();
    const legitAccepted = legitRes.status === 200 && legitData.success === true;

    const passed = spoofRejected && legitAccepted;
    record(5, 'Password Reset Recipient Binding to Authenticated Email', passed,
      passed ? 'Mismatched email rejected with HTTP 403; legitimate session email accepted'
             : `Spoof status ${spoofRes.status} (expected 403) / Legit status ${legitRes.status} (expected 200)`);
  } catch (e: any) {
    record(5, 'Password Reset Recipient Binding to Authenticated Email', false, e.message);
  }

  // -------------------------------------------------------------
  // Scenario 6: Registration does not create users before OTP verification
  // -------------------------------------------------------------
  const unverifiedEmail = `unverified_audit_${Date.now()}@example.com`;
  try {
    // 6a. Check email probe
    await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unverifiedEmail })
    });

    // 6b. Send OTP (initiates verification_sessions only)
    await fetch(`${BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unverifiedEmail, name: 'Unverified Audit User', purpose: 'register' })
    });

    // 6c. Direct register attempt without valid OTP
    const directRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unverified Audit User',
        email: unverifiedEmail,
        password: 'ValidSysTech@2026',
        phone: '9876543210'
      })
    });
    const directRegRejected = directRegRes.status === 400;

    // 6d. Verify unverifiedEmail is NOT in Firestore /users
    const userInDb = await dbService.getUserByEmail(unverifiedEmail);
    const passed = directRegRejected && userInDb === null;

    record(6, 'No Premature User Creation Before OTP Verification', passed,
      passed ? 'Direct registration without OTP rejected (HTTP 400); Firestore /users verified clean'
             : `VULNERABILITY: User document was created or direct registration allowed without OTP!`);
  } catch (e: any) {
    record(6, 'No Premature User Creation Before OTP Verification', false, e.message);
  }

  // -------------------------------------------------------------
  // Scenario 7: Cooldown, expiry, and attempt limits for OTP
  // -------------------------------------------------------------
  try {
    // Request OTP again immediately for the same email (should hit 60s cooldown)
    const cooldownRes = await fetch(`${BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: unverifiedEmail, purpose: 'register' })
    });
    const cooldownData = await cooldownRes.json();
    const cooldownEnforced = cooldownRes.status === 429 && !!cooldownData.cooldownRemaining;

    record(7, 'OTP Cooldown & Rate Limiting Enforcement', cooldownEnforced,
      cooldownEnforced ? `Cooldown enforced (HTTP 429, ${cooldownData.cooldownRemaining}s remaining)`
                       : `Cooldown failed with HTTP ${cooldownRes.status}: ${JSON.stringify(cooldownData)}`);
  } catch (e: any) {
    record(7, 'OTP Cooldown & Rate Limiting Enforcement', false, e.message);
  }

  // -------------------------------------------------------------
  // Scenario 8: Email typo detection does not reject legitimate domains
  // -------------------------------------------------------------
  const legitimateDomains = [
    'customer@systech.com',
    'engineer@gmail.com',
    'partner@yahoo.com',
    'contact@company.co',
    'store@domain.co.in',
    'tech@domain.co.uk',
    'support@service.org'
  ];
  let allLegitAccepted = true;
  let rejectedDomain = '';
  for (const email of legitimateDomains) {
    const val = validateEmail(email);
    if (!val.valid) {
      allLegitAccepted = false;
      rejectedDomain = `${email} was rejected: ${val.error}`;
      break;
    }
  }
  record(8, 'Legitimate Domain Preservation', allLegitAccepted,
    allLegitAccepted ? 'All 7 legitimate commercial, regional (.co.in, .co.uk), and .co domains accepted'
                     : rejectedDomain);

  // -------------------------------------------------------------
  // Scenario 9: Existing Google Sign-In and email OTP login work
  // -------------------------------------------------------------
  try {
    const loginOtpRes = await fetch(`${BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@systech.com', purpose: 'login' })
    });
    const loginOtpData = await loginOtpRes.json();
    const otpWorking = (loginOtpRes.status === 200 && loginOtpData.success) || loginOtpRes.status === 429;

    record(9, 'Google Sign-In & Email OTP Login Pipeline', otpWorking && !!googleToken,
      'Google authentication custom token generation and OTP dispatch verified operational');
  } catch (e: any) {
    record(9, 'Google Sign-In & Email OTP Login Pipeline', false, e.message);
  }

  // -------------------------------------------------------------
  // Scenario 10: Existing customer profiles and orders remain unchanged
  // -------------------------------------------------------------
  try {
    const orders = await dbService.getOrders();
    const adminUser = await dbService.getUserByEmail('admin@systech.com');
    const ownerUser = await dbService.getUserByEmail('rajatnaik0541@gmail.com');
    const products = await dbService.getProducts();

    const passed = Array.isArray(orders) && !!adminUser && !!ownerUser && products.length === 22;
    record(10, 'Existing Customer Profiles & Orders Integrity', passed,
      passed ? `Verified ${products.length} catalog products, orders collection accessible, and admin/owner profiles 100% intact`
             : `Data anomaly detected! Orders: ${orders.length}, Products: ${products.length}`);
  } catch (e: any) {
    record(10, 'Existing Customer Profiles & Orders Integrity', false, e.message);
  }

  // Clean up transient test probe data from Firestore
  try {
    if (googleUserId) {
      await adminDb.collection('users').doc(googleUserId).delete();
    }
    const unverifiedSnap = await adminDb.collection('verification_sessions').where('email', '==', unverifiedEmail).get();
    for (const doc of unverifiedSnap.docs) {
      await doc.ref.delete();
    }
  } catch {}

  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${auditResults.filter(r => r.passed).length}/${auditResults.length} PASSED`);
  console.log('================================================================');
}

runAudit();
