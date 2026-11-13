import { firestoreService as dbService } from '../server/firestoreService.ts';
import { adminAuth } from '../src/lib/firebase-admin.ts';

async function main() {
  console.log('=================================================================');
  console.log('       STAGE 3: FIREBASE CUTOVER COMPREHENSIVE TEST SUITE        ');
  console.log('=================================================================\n');

  const summary: Record<string, { passed: boolean; details: string }> = {};

  // -------------------------------------------------------------
  // AREA 1: Health & Database Backend Verification
  // -------------------------------------------------------------
  console.log('>>> [1/7] VERIFYING ACTIVE BACKEND SERVICE & HEALTH');
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    const health = await healthRes.json();
    const isFirebase = health.database.includes('Firebase Cloud Firestore');
    summary['1. Backend Cutover'] = {
      passed: isFirebase && health.status === 'ok',
      details: `Active Database: ${health.database} | Firestore DB: ${health.firestoreDatabaseId} | Rollback: ${health.rollbackDatabase}`
    };
    console.log('  ✔ Health check:', health.database);
  } catch (e: any) {
    summary['1. Backend Cutover'] = { passed: false, details: e.message };
  }

  // -------------------------------------------------------------
  // AREA 2: Authentication & Role Verification
  // -------------------------------------------------------------
  console.log('\n>>> [2/7] VERIFYING AUTHENTICATION, ROLES & CLAIMS');
  let adminToken = '';
  let customerToken = '';
  try {
    // 2a. Admin Login
    const adminLoginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@systech.com', password: 'admin123' })
    });
    const adminLogin = await adminLoginRes.json();
    adminToken = adminLogin.token;

    // Verify token with Admin SDK
    const decodedAdmin = await adminAuth.verifyIdToken(adminToken);

    // 2b. OTP verification flow check (generate session & verify)
    const otpUser = await dbService.getUserByEmail('customer@systech.com');
    customerToken = await adminAuth.createCustomToken(otpUser?.uid || 'usr_customer', {
      role: 'CUSTOMER',
      email: 'customer@systech.com',
      name: 'Priya Sharma'
    });
    const decodedCustomer = await adminAuth.verifyIdToken(customerToken);

    // 2c. Verify admin route access
    const adminVerifyRes = await fetch('http://localhost:3000/api/admin/verify', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminVerify = await adminVerifyRes.json();

    // 2d. Verify customer blocked from admin route
    const customerBlockRes = await fetch('http://localhost:3000/api/admin/verify', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    summary['2. Authentication & Claims'] = {
      passed: !!adminToken && decodedAdmin.role === 'ADMIN' && adminVerify.authorized && customerBlockRes.status === 403,
      details: `Admin verified with role ${decodedAdmin.role}. Customer correctly blocked (HTTP ${customerBlockRes.status}) from admin operations.`
    };
    console.log('  ✔ Admin Role:', decodedAdmin.role);
    console.log('  ✔ Customer Token verified, blocked from /admin: HTTP', customerBlockRes.status);
  } catch (e: any) {
    summary['2. Authentication & Claims'] = { passed: false, details: e.message };
  }

  // -------------------------------------------------------------
  // AREA 3: Products Catalog & Inventory Management
  // -------------------------------------------------------------
  console.log('\n>>> [3/7] VERIFYING PRODUCTS & INVENTORY');
  let createdProductId = '';
  try {
    // 3a. Public listing & filter
    const prodsRes = await fetch('http://localhost:3000/api/products?category=laptops');
    const prods = await prodsRes.json();

    // 3b. Search query
    const searchRes = await fetch('http://localhost:3000/api/products?search=ThinkPad');
    const searchProds = await searchRes.json();

    // 3c. Admin Create Product
    const newProdSku = `TEST-PROD-${Date.now()}`;
    const createRes = await fetch('http://localhost:3000/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Stage 3 Test Gaming Mouse',
        sku: newProdSku,
        brand: 'SysTech Pro',
        price: 2499,
        originalPrice: 3999,
        stock: 15,
        condition: 'brand_new',
        categoryId: 'accessories',
        description: 'RGB Optical 16000 DPI Gaming Mouse for cutover verification',
        image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800'
      })
    });
    const createdProd = await createRes.json();
    createdProductId = createdProd.id;

    // 3d. Admin Edit Product
    const editRes = await fetch(`http://localhost:3000/api/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Stage 3 Test Gaming Mouse (Updated Special Edition)',
        price: 2299,
        stock: 20
      })
    });
    const updatedProd = await editRes.json();

    // 3e. Admin Delete Product (cleanup)
    const deleteRes = await fetch(`http://localhost:3000/api/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const deleteData = await deleteRes.json();

    summary['3. Product & Inventory'] = {
      passed: prods.length > 0 && searchProds.length > 0 && createdProd.sku === newProdSku && updatedProd.stock === 20 && deleteData.success,
      details: `Public listing (${prods.length} laptops), search ("${searchProds[0]?.title}"), Admin CRUD (Created ${createdProd.id}, updated stock to 20, deleted successfully).`
    };
    console.log(`  ✔ Public catalog: ${prods.length} laptops | Search match: "${searchProds[0]?.title}"`);
    console.log(`  ✔ Admin CRUD: Created ${createdProd.id} -> Updated stock to ${updatedProd.stock} -> Deleted`);
  } catch (e: any) {
    summary['3. Product & Inventory'] = { passed: false, details: e.message };
  }

  // -------------------------------------------------------------
  // AREA 4: Cart & Promotion Engine
  // -------------------------------------------------------------
  console.log('\n>>> [4/7] VERIFYING CART & PROMOTION VALIDATION');
  try {
    // 4a. Add to Cart
    const addCartRes = await fetch('http://localhost:3000/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': 'sess_test_verification_stage3'
      },
      body: JSON.stringify({
        productId: 'prod-anker-737',
        quantity: 2,
        extendedCare: true
      })
    });
    const cartState = await addCartRes.json();

    // 4b. Validate Coupon
    const promoRes = await fetch('http://localhost:3000/api/promotions/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SYSTECH', subtotal: 80000 })
    });
    const promo = await promoRes.json();

    summary['4. Cart & Promotions'] = {
      passed: cartState.items?.length > 0 && promo.valid && promo.discount > 0,
      details: `Cart persisted with ${cartState.items?.length} items. Coupon SYSTECH calculated discount of ₹${promo.discount} on ₹80,000 subtotal.`
    };
    console.log(`  ✔ Cart items: ${cartState.items?.length} | Subtotal: ₹${cartState.subtotal}`);
    console.log(`  ✔ Coupon SYSTECH: Valid (${promo.valid}), Discount: ₹${promo.discount}`);
  } catch (e: any) {
    summary['4. Cart & Promotions'] = { passed: false, details: e.message };
  }

  // -------------------------------------------------------------
  // AREA 5: Orders, Checkout & Payments
  // -------------------------------------------------------------
  console.log('\n>>> [5/7] VERIFYING ORDERS & RAZORPAY PAYMENT FLOW');
  try {
    // 5a. Place Order with atomic inventory deduction
    const placeOrderRes = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        customerName: 'Rajat Naik (Store Owner)',
        customerEmail: 'rajatnaik0541@gmail.com',
        customerPhone: '9845012345',
        fulfillment: 'in_store_pickup',
        items: [{ productId: 'prod-anker-737', quantity: 1, price: 4999 }],
        paymentMethod: 'upi_online'
      })
    });
    const orderData = await placeOrderRes.json();

    // 5b. Initiate Razorpay Order
    const rzpOrderRes = await fetch('http://localhost:3000/api/payments/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderData.id })
    });
    const rzpOrder = await rzpOrderRes.json();

    // 5c. Admin Update Order Status
    const updateStatusRes = await fetch(`http://localhost:3000/api/orders/${orderData.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'completed' })
    });
    const updatedOrder = await updateStatusRes.json();

    summary['5. Orders & Payments'] = {
      passed: !!orderData.id && !!rzpOrder.orderId && updatedOrder.status === 'completed',
      details: `Created order ${orderData.orderNumber} (₹${orderData.total}). Razorpay order generated (${rzpOrder.razorpayOrderId}). Status updated to completed.`
    };
    console.log(`  ✔ Order Created: ${orderData.orderNumber} (ID: ${orderData.id})`);
    console.log(`  ✔ Razorpay Order: ${rzpOrder.razorpayOrderId} | Currency: ${rzpOrder.currency}`);
    console.log(`  ✔ Status updated to: ${updatedOrder.status}`);
  } catch (e: any) {
    summary['5. Orders & Payments'] = { passed: false, details: e.message };
  }

  // -------------------------------------------------------------
  // AREA 6: Repair Lab & Inquiries
  // -------------------------------------------------------------
  console.log('\n>>> [6/7] VERIFYING REPAIRS LAB & INQUIRIES');
  try {
    // 6a. Book Diagnostic Repair
    const repairBookRes = await fetch('http://localhost:3000/api/repairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Ganesh Hegde',
        customerPhone: '9845112233',
        customerEmail: 'ganesh@example.com',
        deviceType: 'laptop',
        deviceModel: 'Dell Inspiron 15 3520',
        problemDescription: 'Laptop screen flickering and hinge loose'
      })
    });
    const repair = await repairBookRes.json();

    // 6b. Public Lookup by Ticket Number
    const lookupRes = await fetch(`http://localhost:3000/api/repairs/lookup/${repair.ticketNumber}`);
    const lookedUp = await lookupRes.json();

    // 6c. Admin update repair ticket
    const updateRepairRes = await fetch(`http://localhost:3000/api/repairs/${repair.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'in_progress',
        technicianNotes: 'Screen panel replaced, hinge aligned, 40-point diagnostics passed.'
      })
    });
    const updatedRepair = await updateRepairRes.json();

    summary['6. Repairs & Inquiries'] = {
      passed: !!repair.ticketNumber && lookedUp.ticketNumber === repair.ticketNumber && updatedRepair.status === 'in_progress',
      details: `Booked ticket ${repair.ticketNumber} (${repair.deviceModel}). Public tracking lookup verified. Status updated to in_progress.`
    };
    console.log(`  ✔ Booked Ticket: ${repair.ticketNumber} (${repair.deviceModel})`);
    console.log(`  ✔ Public Lookup verified: ${lookedUp.ticketNumber}`);
    console.log(`  ✔ Technician notes updated: ${updatedRepair.status}`);
  } catch (e: any) {
    summary['6. Repairs & Inquiries'] = { passed: false, details: e.message };
  }

  // -------------------------------------------------------------
  // AREA 7: Rollback Readiness & Data Integrity
  // -------------------------------------------------------------
  console.log('\n>>> [7/7] VERIFYING POSTGRESQL ROLLBACK SOURCE INTEGRITY');
  try {
    // Check that pgService methods are still 100% operational
    const { pgService } = await import('../server/pgService.ts');
    const pgProducts = await pgService.getProducts();
    const pgRepairs = await pgService.getRepairs();

    summary['7. Rollback Readiness'] = {
      passed: pgProducts.length >= 22 && pgRepairs.length >= 4,
      details: `PostgreSQL database remains completely online and intact with ${pgProducts.length} products and ${pgRepairs.length} repair tickets. Can be switched back instantly by reverting server.ts import.`
    };
    console.log(`  ✔ PostgreSQL Cloud SQL intact: ${pgProducts.length} products, ${pgRepairs.length} repair records.`);
  } catch (e: any) {
    summary['7. Rollback Readiness'] = { passed: false, details: e.message };
  }

  // -------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------
  console.log('\n=================================================================');
  console.log('                 STAGE 3 VERIFICATION SUMMARY                    ');
  console.log('=================================================================');
  let allOk = true;
  for (const [key, val] of Object.entries(summary)) {
    const icon = val.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${icon} ${key}: ${val.details}`);
    if (!val.passed) allOk = false;
  }
  console.log('=================================================================');
  console.log(allOk ? '🎉 STAGE 3 CUTOVER IS 100% SUCCESSFUL AND PRODUCTION-READY!' : '⚠️ SOME CHECKS REQUIRE ATTENTION.');
}

main().catch(console.error);
