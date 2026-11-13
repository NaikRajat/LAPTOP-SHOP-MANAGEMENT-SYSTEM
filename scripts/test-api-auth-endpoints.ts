console.log('=== TESTING API ENDPOINTS ON LIVE SERVER (http://localhost:3000) ===\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function check(cond: boolean, name: string, detail?: string) {
    if (cond) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} - ${detail || ''}`);
      failed++;
    }
  }

  // 1. Check Email with malformed email (e.g. email@gmail.co)
  try {
    const res = await fetch('http://localhost:3000/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'email@gmail.co' })
    });
    const data = await res.json();
    check(res.status === 400, 'Endpoint rejects email@gmail.co with HTTP 400', `Status: ${res.status}`);
    check(data.error?.includes('Did you mean @gmail.com?'), 'Endpoint returns typo suggestion in error', data.error);
  } catch (e: any) {
    check(false, 'Check email@gmail.co', e.message);
  }

  // 2. Check Email with random non-existent email (verifies read-only behavior)
  const testEmail = `probe_readonly_${Date.now()}@example.com`;
  try {
    const res = await fetch('http://localhost:3000/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const data = await res.json();
    check(res.status === 200, 'Valid new email check returns HTTP 200', `Status: ${res.status}`);
    check(data.exists === false, 'Valid new email reports exists: false', JSON.stringify(data));

    // Confirm email was NOT created in database
    const verifyNotCreated = await fetch('http://localhost:3000/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const verifyData = await verifyNotCreated.json();
    check(verifyData.exists === false, 'Confirm email check never created account in database');
  } catch (e: any) {
    check(false, 'Readonly check email test', e.message);
  }

  // 3. Register endpoint rejects weak password
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: `test_${Date.now()}@example.com`,
        phone: '9876543210',
        password: 'weak'
      })
    });
    const data = await res.json();
    check(res.status === 400, 'Register endpoint rejects weak password with HTTP 400', `Status: ${res.status}`);
    check(data.error?.includes('Password'), 'Register returns password complexity message', data.error);
  } catch (e: any) {
    check(false, 'Register weak password check', e.message);
  }

  // 4. Register endpoint rejects invalid mobile number
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: `test_${Date.now()}@example.com`,
        phone: '12345',
        password: 'SysTech@123'
      })
    });
    const data = await res.json();
    check(res.status === 400, 'Register endpoint rejects invalid mobile number with HTTP 400', `Status: ${res.status}`);
    check(data.error?.includes('mobile'), 'Register returns mobile validation error', data.error);
  } catch (e: any) {
    check(false, 'Register invalid phone check', e.message);
  }

  // 5. Protected endpoints: change-password and forgot-password require authentication (Profile ONLY)
  try {
    const res = await fetch('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: 'SysTech@123' })
    });
    check(res.status === 401, 'Unauthenticated change-password is blocked with HTTP 401', `Status: ${res.status}`);
  } catch (e: any) {
    check(false, 'change-password auth check', e.message);
  }

  try {
    const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@systech.com' })
    });
    check(res.status === 401, 'Unauthenticated forgot-password is blocked with HTTP 401', `Status: ${res.status}`);
  } catch (e: any) {
    check(false, 'forgot-password auth check', e.message);
  }

  console.log(`\n========================================`);
  console.log(`API ENDPOINT TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runTests();
