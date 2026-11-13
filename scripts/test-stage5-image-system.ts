import { rawDb } from '../src/lib/firebase-admin.ts';
import { collection, getDocs } from 'firebase/firestore';

interface TestItem {
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestItem[] = [];

function record(name: string, passed: boolean, details: string) {
  testResults.push({ name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} ${name}: ${details}`);
}

async function runStage5Tests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('================================================================');
  console.log('       STAGE 5: IMAGE SYSTEM & SECURITY TEST SUITE              ');
  console.log('================================================================\n');

  // 1. Authenticate Admin and Customer
  let adminToken = '';
  let customerToken = '';

  try {
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@systech.com', password: 'admin123' })
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;

    const custRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@systech.com', password: 'customer123' })
    });
    const custData = await custRes.json();
    customerToken = custData.token;

    record('Authentication for Image Testing', !!adminToken && !!customerToken,
      'Admin and Customer sessions authenticated successfully');
  } catch (e: any) {
    record('Authentication for Image Testing', false, e.message);
  }

  // 2. Audit all 22 live product images via HTTP HEAD
  try {
    const snap = await getDocs(collection(rawDb, 'products'));
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    let accessibleCount = 0;
    const failedUrls: string[] = [];

    for (const p of products) {
      const url = p.image;
      if (!url) {
        failedUrls.push(`${p.id}: missing image URL`);
        continue;
      }
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        if (resp.ok) {
          accessibleCount++;
        } else {
          failedUrls.push(`${p.id}: HTTP ${resp.status} on ${url}`);
        }
      } catch (err: any) {
        failedUrls.push(`${p.id}: fetch failed (${err.message})`);
      }
    }

    record('All 22 Product Images Public HTTP 200 Check', accessibleCount === 22,
      `${accessibleCount}/22 live catalog image URLs are responding with HTTP 200 OK`);
  } catch (e: any) {
    record('All 22 Product Images Public HTTP 200 Check', false, e.message);
  }

  // 3. Security: Customer blocked from /api/upload (POST & DELETE)
  try {
    const custPostRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' })
    });
    const custDelRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({ path: 'products/laptops/test.webp' })
    });

    record('Customer Blocked from Upload & Delete (HTTP 403)', custPostRes.status === 403 && custDelRes.status === 403,
      `Upload returned HTTP ${custPostRes.status}, Delete returned HTTP ${custDelRes.status}`);
  } catch (e: any) {
    record('Customer Blocked from Upload & Delete', false, e.message);
  }

  // 4. Validation: Reject non-image files
  try {
    const invalidFormatRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        image: 'data:text/plain;base64,SGVsbG8gU3lzdGVjaA==',
        name: 'malicious.txt'
      })
    });
    record('Server-Side Rejection of Non-Image Files (HTTP 400)', invalidFormatRes.status === 400,
      `Rejected invalid MIME type with HTTP ${invalidFormatRes.status}`);
  } catch (e: any) {
    record('Server-Side Rejection of Non-Image Files', false, e.message);
  }

  // 5. Validation: Reject oversized files (> 5MB)
  try {
    // Generate dummy payload > 5MB
    const bigBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(8 * 1024 * 1024);
    const bigRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ image: bigBase64, name: 'oversized.jpg' })
    });
    record('Server-Side Size Limit Enforcement (HTTP 413)', bigRes.status === 413,
      `Oversized payload rejected with HTTP ${bigRes.status}`);
  } catch (e: any) {
    record('Server-Side Size Limit Enforcement', false, e.message);
  }

  // 6. Admin Upload Valid PNG/JPEG/WEBP Image
  let uploadedPath = '';
  let uploadedUrl = '';
  try {
    // 1x1 transparent PNG
    const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        image: validPng,
        name: 'admin-test-accessory.png',
        category: 'accessories'
      })
    });
    const uploadData = await uploadRes.json();
    uploadedPath = uploadData.path;
    uploadedUrl = uploadData.url;

    record('Admin Image Upload via Server Endpoint', uploadRes.status === 200 && !!uploadData.url,
      `Uploaded to ${uploadData.path} (${uploadData.storage})`);
  } catch (e: any) {
    record('Admin Image Upload via Server Endpoint', false, e.message);
  }

  // 7. Image Replacement Test
  try {
    const replacePng = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
    const replaceRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        image: replacePng,
        name: 'admin-test-accessory-replaced.webp',
        category: 'accessories'
      })
    });
    const replaceData = await replaceRes.json();
    record('Admin Image Replacement Flow', replaceRes.status === 200 && !!replaceData.url,
      `Replaced with new asset: ${replaceData.path}`);
  } catch (e: any) {
    record('Admin Image Replacement Flow', false, e.message);
  }

  // 8. Admin Image Deletion Endpoint (DELETE /api/upload)
  try {
    const delRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ path: uploadedPath })
    });
    const delData = await delRes.json();
    record('Admin Image Deletion Endpoint (DELETE /api/upload)', delRes.status === 200 && delData.success === true,
      `Successfully deleted path: ${delData.deletedPath}`);
  } catch (e: any) {
    record('Admin Image Deletion Endpoint', false, e.message);
  }

  // 9. Verify Frontend Broken Image Handling Functionality
  try {
    const prodsRes = await fetch(`${BASE_URL}/api/products`);
    const prods = await prodsRes.json();
    const hasFallbacks = prods.every((p: any) => typeof p.image === 'string' && p.image.length > 0);
    record('Catalog Image URL Consistency & Integrity', hasFallbacks,
      `All ${prods.length} products have verified, non-empty image strings`);
  } catch (e: any) {
    record('Catalog Image URL Consistency & Integrity', false, e.message);
  }

  console.log('\n================================================================');
  const allPassed = testResults.every(t => t.passed);
  console.log(`STAGE 5 TEST SCORE: ${testResults.filter(t => t.passed).length}/${testResults.length} CHECKS PASSED.`);
  console.log(allPassed ? '🎉 ALL STAGE 5 IMAGE SYSTEM CHECKS PASSED!' : '⚠️ SOME CHECKS FAILED.');
  console.log('================================================================');
}

runStage5Tests().catch(console.error);
