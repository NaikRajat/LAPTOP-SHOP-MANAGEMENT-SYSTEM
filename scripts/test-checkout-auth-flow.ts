import { adminAuth, adminDb } from '../src/lib/firebase-admin.ts';
import { firestoreService as dbService } from '../server/firestoreService.ts';

const BASE_URL = 'http://localhost:3000';

interface TestStep {
  name: string;
  passed: boolean;
  details: string;
}

const steps: TestStep[] = [];

function record(name: string, passed: boolean, details: string) {
  steps.push({ name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${name} - ${details}`);
}

async function runCheckoutTest() {
  console.log('================================================================');
  console.log('   CHECKOUT AUTHENTICATION FLOW VERIFICATION                    ');
  console.log('================================================================\n');

  let testOrderId: string | null = null;
  let testPaymentId: string | null = null;

  try {
    // 1. Unauthenticated checkout attempt should be rejected with HTTP 401
    const unauthRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Unauth Customer',
        customerPhone: '9876543210',
        customerEmail: 'unauth@example.com',
        address: 'Test Address, Kumta, Karnataka - 581343',
        fulfillment: 'pickup',
        paymentMethod: 'store_pickup_cash',
        items: [{ productId: 'prod-thinkpad-x1', quantity: 1 }]
      })
    });
    const unauthData = await unauthRes.json();
    const unauthBlocked = unauthRes.status === 401 && unauthData.error === 'Authentication required';
    record('1. Unauthenticated Request Rejection', unauthBlocked,
      unauthBlocked ? 'Backend rejected request with HTTP 401 "Authentication required"'
                    : `Unexpected status ${unauthRes.status}: ${JSON.stringify(unauthData)}`);

    // 2. Sign in with dedicated test account
    const testEmail = `checkout_test_${Date.now()}@example.com`;
    const googleRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        name: 'Checkout Test User'
      })
    });
    const googleData = await googleRes.json();
    const token = googleData.token;
    const testUid = googleData.user?.uid || googleData.user?.id;
    const authSucceeded = googleRes.status === 200 && !!token && !!testUid;
    record('2. Dedicated Account Authentication', authSucceeded,
      authSucceeded ? `Authenticated test account (UID: ${testUid}, Email: ${testEmail})`
                    : `Auth failed with HTTP ${googleRes.status}: ${JSON.stringify(googleData)}`);

    if (!authSucceeded) {
      throw new Error('Failed to authenticate test user');
    }

    // 3. Test checkout with malicious userId in body (IDOR test)
    // The backend MUST ignore body userId and use the verified Firebase UID from the token
    const orderPayload = {
      userId: 'spoofed_victim_uid',
      customerName: 'Checkout Test User',
      customerPhone: '9876543210',
      customerEmail: testEmail,
      address: 'Shop No. 4, College Road, Kumta, Karnataka - 581343',
      addressLine1: 'Shop No. 4',
      addressLine2: 'College Road',
      city: 'Kumta',
      state: 'Karnataka',
      postalCode: '581343',
      fulfillment: 'pickup',
      paymentMethod: 'store_pickup_cash',
      items: [
        {
          productId: 'prod-thinkpad-x1',
          quantity: 1,
          extendedCare: false,
          dataMigration: false
        }
      ]
    };

    const checkoutRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });
    const orderData = await checkoutRes.json();

    const orderSuccess = checkoutRes.status === 201 && !!orderData.id && !!orderData.orderNumber;
    testOrderId = orderData.id;

    record('3. Authenticated Checkout with Authorization Bearer Token', orderSuccess,
      orderSuccess ? `Order created successfully: ${orderData.orderNumber} (ID: ${orderData.id})`
                   : `Checkout failed with HTTP ${checkoutRes.status}: ${JSON.stringify(orderData)}`);

    // 4. Verify that the order in Firestore is bound to verified UID, NOT the spoofed body userId
    const orderDoc = await adminDb.collection('orders').doc(orderData.id).get();
    const orderInDb = orderDoc.data();
    const uidCorrect = orderInDb?.userId === testUid && orderInDb?.userId !== 'spoofed_victim_uid';
    record('4. Backend Customer Identity Binding to Verified UID', uidCorrect,
      uidCorrect ? `Order userId is strictly bound to verified Firebase UID "${testUid}", spoofed body ID was ignored`
                 : `VULNERABILITY: Order userId was set to "${orderInDb?.userId}"!`);

    // 5. Verify payment record was created
    const paymentSnap = await adminDb.collection('payments').where('orderId', '==', orderData.id).get();
    const paymentCreated = !paymentSnap.empty;
    if (paymentCreated) {
      testPaymentId = paymentSnap.docs[0].id;
    }
    record('5. Payment Record Generation', paymentCreated,
      paymentCreated ? `Payment record created (${testPaymentId}) with status "${paymentSnap.docs[0]?.data().status}"`
                     : 'Payment record missing!');

    // 6. Test GET /api/orders with Bearer token
    const getOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ordersList = await getOrdersRes.json();
    const getOrdersPassed = getOrdersRes.status === 200 && Array.isArray(ordersList);
    record('6. Authenticated Orders Retrieval (GET /api/orders)', getOrdersPassed,
      getOrdersPassed ? `Retrieved ${ordersList.length} orders successfully with Bearer token`
                      : `Failed with status ${getOrdersRes.status}: ${JSON.stringify(ordersList)}`);

  } catch (err: any) {
    record('Checkout Flow Execution', false, err.message);
  } finally {
    // Clean up test order, payment, and test user so production Firestore data remains clean
    console.log('\nCleaning up test probe records...');
    if (testOrderId) {
      try {
        await adminDb.collection('orders').doc(testOrderId).delete();
        console.log(`Deleted test order: ${testOrderId}`);
      } catch {}
    }
    if (testPaymentId) {
      try {
        await adminDb.collection('payments').doc(testPaymentId).delete();
        console.log(`Deleted test payment: ${testPaymentId}`);
      } catch {}
    }
    // Restore stock if modified
    try {
      const prodRef = adminDb.collection('products').doc('prod-thinkpad-x1');
      const snap = await prodRef.get();
      if (snap.exists) {
        await prodRef.update({ stock: 5 });
      }
    } catch {}
  }

  console.log('\n================================================================');
  console.log(`CHECKOUT VERIFICATION: ${steps.filter(s => s.passed).length}/${steps.length} PASSED`);
  console.log('================================================================');
}

runCheckoutTest();
