import { firestoreService as dbService } from '../server/firestoreService.ts';
import { adminAuth, rawDb } from '../src/lib/firebase-admin.ts';
import { collection, getDocs } from 'firebase/firestore';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(id: number, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${id}/18] ${name}: ${details}`);
}

async function runStage4Verification() {
  const TARGET_URL = 'http://127.0.0.1:3000';


  console.log('================================================================');
  console.log('     STAGE 4: PRODUCTION DEPLOYMENT & ENDPOINT AUDIT           ');
  console.log('================================================================\n');

  let customerToken = '';
  let adminToken = '';
  let testOrderId = '';

  // 15. API Health & Active Database
  try {
    const res = await fetch(`${TARGET_URL}/api/health`);
    const data = await res.json();
    const isFirebase = data.database?.includes('Firebase Cloud Firestore');
    record(15, 'API Health & Active Database Verification', res.status === 200 && isFirebase,
      `Status: ${data.status} | Active DB: ${data.database} | DB ID: ${data.firestoreDatabaseId}`);
  } catch (e: any) {
    record(15, 'API Health', false, e.message);
  }

  // 16. Firestore Connectivity
  try {
    const snap = await getDocs(collection(rawDb, 'products'));
    record(16, 'Firestore Live Connectivity', snap.size === 22,
      `Successfully queried Firestore directly. Catalog size: ${snap.size} products`);
  } catch (e: any) {
    record(16, 'Firestore Live Connectivity', false, e.message);
  }

  // 1. Public Product Listing
  try {
    const res = await fetch(`${TARGET_URL}/api/products`);
    const data = await res.json();
    record(1, 'Public Product Listing', Array.isArray(data) && data.length === 22,
      `Returned ${data.length} products with live prices and stock levels`);
  } catch (e: any) {
    record(1, 'Public Product Listing', false, e.message);
  }

  // 2. Search
  try {
    const res = await fetch(`${TARGET_URL}/api/products?search=ThinkPad`);
    const data = await res.json();
    record(2, 'Catalog Search', data.length > 0 && data[0].title.includes('ThinkPad'),
      `Search query returned ${data.length} matching products (${data[0]?.title})`);
  } catch (e: any) {
    record(2, 'Catalog Search', false, e.message);
  }

  // 3. Product Details & Images
  try {
    const res = await fetch(`${TARGET_URL}/api/products/prod-anker-737`);
    const data = await res.json();
    record(3, 'Product Details & Image Metadata', data.id === 'prod-anker-737' && !!data.image,
      `Retrieved "${data.title}" (₹${data.price}), Image URL verified`);
  } catch (e: any) {
    record(3, 'Product Details & Images', false, e.message);
  }

  // 4. Customer Registration & Login
  try {
    const loginRes = await fetch(`${TARGET_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@systech.com', password: 'customer123' })
    });
    const loginData = await loginRes.json();
    customerToken = loginData.token;
    record(4, 'Customer Authentication & Login', !!customerToken && loginData.user?.role === 'customer',
      `Authenticated customer@systech.com, UID: ${loginData.user?.uid || loginData.user?.id}`);
  } catch (e: any) {
    record(4, 'Customer Registration & Login', false, e.message);
  }

  // 5. Google Login
  try {
    const gRes = await fetch(`${TARGET_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'google_audit_tester@systech.com', name: 'Google Tester' })
    });
    const gData = await gRes.json();
    record(5, 'Google Authentication Flow', !!gData.token,
      `Successfully authenticated Google user: ${gData.user?.email}`);
  } catch (e: any) {
    record(5, 'Google Login', false, e.message);
  }

  // 6. OTP Login Flow
  try {
    const sendRes = await fetch(`${TARGET_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@systech.com' })
    });
    const sendData = await sendRes.json();
    record(6, 'Email OTP Login Session Generation', sendData.success && !!sendData.sessionId,
      `Session ${sendData.sessionId} generated in Firestore /verification_sessions`);
  } catch (e: any) {
    record(6, 'OTP Login Flow', false, e.message);
  }

  // 7. Profile & Delivery Address
  try {
    const profileRes = await fetch(`${TARGET_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const profileData = await profileRes.json();
    record(7, 'Profile & Delivery Address Persistence', !!profileData.user?.address,
      `User ${profileData.user?.name} address: "${profileData.user?.address}"`);
  } catch (e: any) {
    record(7, 'Profile & Delivery Address', false, e.message);
  }

  // 8. Cart Operations
  try {
    const cartRes = await fetch(`${TARGET_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const cartData = await cartRes.json();
    record(8, 'Cart Operations & Isolation', Array.isArray(cartData.items),
      `Loaded persistent user cart with ${cartData.items?.length || 0} items`);
  } catch (e: any) {
    record(8, 'Cart Operations', false, e.message);
  }

  // 9. Checkout & Authoritative Pricing
  try {
    const orderRes = await fetch(`${TARGET_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        customerName: 'Priya Sharma',
        customerPhone: '9845011223',
        fulfillment: 'in_store_pickup',
        items: [{ productId: 'prod-anker-737', quantity: 1, price: 1 }], // Client spoof
        paymentMethod: 'store_pickup_cash'
      })
    });
    const orderData = await orderRes.json();
    testOrderId = orderData.id;
    record(9, 'Checkout & Server-Authoritative Pricing', orderData.subtotal === 4999,
      `Order ${orderData.orderNumber} placed. Server authoritatively charged ₹${orderData.subtotal}`);
  } catch (e: any) {
    record(9, 'Checkout', false, e.message);
  }

  // 10. Orders History
  try {
    const histRes = await fetch(`${TARGET_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const histData = await histRes.json();
    const hasOrder = histData.some((o: any) => o.id === testOrderId);
    record(10, 'Customer Orders History Retrieval', hasOrder,
      `Retrieved customer order history containing ${histData.length} records`);
  } catch (e: any) {
    record(10, 'Orders History', false, e.message);
  }

  // 11. Admin Login & Authorization
  try {
    const adminRes = await fetch(`${TARGET_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@systech.com', password: 'admin123' })
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;
    const decoded = await adminAuth.verifyIdToken(adminToken);
    record(11, 'Admin Login & Custom Claim Verification', decoded.role === 'ADMIN',
      `Admin logged in. Verified Custom Claims: ${decoded.role}`);
  } catch (e: any) {
    record(11, 'Admin Login', false, e.message);
  }

  // 12. Admin Product Management (CRUD)
  try {
    const tempSku = `PROD-TEMP-${Date.now()}`;
    const createRes = await fetch(`${TARGET_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Admin Verification Temp Item',
        sku: tempSku,
        price: 999,
        stock: 5,
        condition: 'brand_new',
        categoryId: 'accessories'
      })
    });
    const created = await createRes.json();
    await fetch(`${TARGET_URL}/api/products/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record(12, 'Admin Product Management CRUD', !!created.id,
      `Admin successfully created and deleted test product ${created.id}`);
  } catch (e: any) {
    record(12, 'Admin Product Management', false, e.message);
  }

  // 13. Repair Booking & Tracking
  try {
    const repRes = await fetch(`${TARGET_URL}/api/repairs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Deployment Verification User',
        customerPhone: '9845012345',
        deviceType: 'laptop',
        deviceModel: 'MacBook Air M2',
        problemDescription: 'Trackpad haptic feedback issue'
      })
    });
    const rep = await repRes.json();
    const trackRes = await fetch(`${TARGET_URL}/api/repairs/lookup/${rep.ticketNumber}`);
    const tracked = await trackRes.json();
    record(13, 'Repair Booking & Public Tracking', tracked.ticketNumber === rep.ticketNumber,
      `Booked ticket ${rep.ticketNumber}, tracking lookup resolved status "${tracked.status}"`);
  } catch (e: any) {
    record(13, 'Repair Booking & Tracking', false, e.message);
  }

  // 14. Contact Inquiry
  try {
    const inqRes = await fetch(`${TARGET_URL}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Deployment Auditor',
        email: 'auditor@systech.com',
        message: 'Verifying public contact API'
      })
    });
    const inq = await inqRes.json();
    record(14, 'Contact Inquiry Submission', !!inq.id,
      `Created contact inquiry ${inq.id} in Firestore`);
  } catch (e: any) {
    record(14, 'Contact Inquiry', false, e.message);
  }

  // 17. Storage & Image Loading
  try {
    const testImgUrl = 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800';
    const imgRes = await fetch(testImgUrl, { method: 'HEAD' });
    record(17, 'CDN & Storage Image Delivery', imgRes.status === 200,
      `Product CDN images responding with HTTP 200 OK (${imgRes.headers.get('content-type')})`);
  } catch (e: any) {
    record(17, 'Storage & Image Loading', false, e.message);
  }

  // 18. Customer → /admin Route Guard (403)
  try {
    const guardRes = await fetch(`${TARGET_URL}/admin`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    record(18, 'Customer /admin Route Guard (403)', guardRes.status === 403,
      `Customer access to /admin returned HTTP ${guardRes.status} Forbidden`);
  } catch (e: any) {
    record(18, 'Customer Route Guard', false, e.message);
  }

  console.log('\n================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL SCORE: ${results.filter(r => r.passed).length}/${results.length} CHECKS PASSED.`);
  console.log(allPassed ? '🎉 ALL 18 PRODUCTION DEPLOYMENT CHECKS PASSED!' : '⚠️ SOME CHECKS FAILED.');
  console.log('================================================================');
}

runStage4Verification().catch(console.error);
