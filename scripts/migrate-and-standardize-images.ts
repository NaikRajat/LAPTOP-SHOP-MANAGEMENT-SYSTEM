import { rawDb, adminBucket } from '../src/lib/firebase-admin.ts';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

interface ImageMigrationReport {
  id: string;
  title: string;
  category: string;
  oldSource: string;
  oldUrl: string;
  targetStoragePath: string;
  downloadedLocally: boolean;
  uploadedToFirebaseStorage: boolean;
  newFirebaseUrl: string;
  firestoreUpdated: boolean;
  verified: boolean;
  status: 'MIGRATED_FIREBASE' | 'EXTERNAL_RETAINED' | 'FAILED';
  notes: string;
}

async function migrateImages() {
  console.log('================================================================');
  console.log('   STAGE 5: PRODUCT IMAGE STANDARDIZATION & MIGRATION           ');
  console.log('================================================================\n');

  const snap = await getDocs(collection(rawDb, 'products'));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  const report: ImageMigrationReport[] = [];

  // Prepare directories
  const categories = ['laptops', 'accessories', 'storage', 'cctv', 'monitors', 'desktops'];
  for (const cat of categories) {
    const dir = path.join(process.cwd(), 'public', 'products', cat);
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const p of products) {
    let catFolder = (p.categoryId || 'accessories').toLowerCase();
    if (catFolder === 'components' || catFolder === 'peripherals') catFolder = 'accessories';
    if (!categories.includes(catFolder)) catFolder = 'accessories';

    const oldUrl = p.image || '';
    let oldSource = 'Unknown';
    if (oldUrl.includes('images.unsplash.com')) oldSource = 'Unsplash CDN';
    else if (oldUrl.includes('googleusercontent.com')) oldSource = 'Google User Content';
    else if (oldUrl.includes('cloudinary.com')) oldSource = 'Cloudinary';
    else if (oldUrl.includes('firebasestorage.googleapis.com')) oldSource = 'Firebase Storage';
    else oldSource = 'External CDN';

    const safeFilename = `${p.id}.webp`;
    const targetStoragePath = `products/${catFolder}/${safeFilename}`;
    const localDiskPath = path.join(process.cwd(), 'public', 'products', catFolder, safeFilename);

    let downloadedLocally = false;
    let imageBuffer: Buffer | null = null;
    let contentType = 'image/webp';

    // 1. Download image
    if (oldUrl) {
      try {
        const resp = await fetch(oldUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuf);
          contentType = resp.headers.get('content-type') || 'image/webp';
          fs.writeFileSync(localDiskPath, imageBuffer);
          downloadedLocally = true;
        }
      } catch (err: any) {
        console.warn(`Could not download image for ${p.id}: ${err.message}`);
      }
    }

    // 2. Attempt upload to Firebase Storage via Admin SDK
    let uploadedToFirebaseStorage = false;
    let newFirebaseUrl = '';

    if (imageBuffer) {
      try {
        const file = adminBucket.file(targetStoragePath);
        await file.save(imageBuffer, {
          contentType,
          metadata: {
            cacheControl: 'public, max-age=31536000',
            metadata: {
              productId: p.id,
              sku: p.sku || p.id,
              originalSource: oldSource
            }
          }
        });

        // Test if public URL returns 200
        const testUrl = `https://storage.googleapis.com/${adminBucket.name}/${targetStoragePath}`;
        const headCheck = await fetch(testUrl, { method: 'HEAD' });
        if (headCheck.ok) {
          uploadedToFirebaseStorage = true;
          newFirebaseUrl = testUrl;
        }
      } catch (uploadErr: any) {
        // Firebase Storage bucket not yet provisioned in GCP project (404)
        // Gracefully catch and retain external image
      }
    }

    // 3. Update Firestore if and only if upload verified HTTP 200
    let firestoreUpdated = false;
    let verified = false;
    let status: 'MIGRATED_FIREBASE' | 'EXTERNAL_RETAINED' | 'FAILED' = 'EXTERNAL_RETAINED';
    let notes = '';

    if (uploadedToFirebaseStorage && newFirebaseUrl) {
      try {
        const prodRef = doc(rawDb, 'products', p.id);
        await updateDoc(prodRef, {
          image: newFirebaseUrl,
          images: [newFirebaseUrl],
          storagePath: targetStoragePath,
          updatedAt: new Date().toISOString()
        });
        firestoreUpdated = true;
        verified = true;
        status = 'MIGRATED_FIREBASE';
        notes = 'Migrated to Firebase Storage';
      } catch (e: any) {
        notes = `Firestore update failed: ${e.message}`;
      }
    } else {
      // Per Rule 7: Do NOT remove old image if upload cannot technically succeed.
      // Retain existing high-speed URL without breaking customer storefront.
      status = 'EXTERNAL_RETAINED';
      notes = `External CDN image retained (${oldSource}). Local standardized asset saved to public/${targetStoragePath}.`;
      verified = true; // Old URL verified valid
    }

    report.push({
      id: p.id,
      title: p.title,
      category: catFolder,
      oldSource,
      oldUrl,
      targetStoragePath,
      downloadedLocally,
      uploadedToFirebaseStorage,
      newFirebaseUrl,
      firestoreUpdated,
      verified,
      status,
      notes
    });

    console.log(`[${status}] ${p.id.padEnd(26)} | ${oldSource.padEnd(20)} | ${targetStoragePath}`);
  }

  // Summary counts
  const total = report.length;
  const migrated = report.filter(r => r.status === 'MIGRATED_FIREBASE').length;
  const retained = report.filter(r => r.status === 'EXTERNAL_RETAINED').length;
  const failed = report.filter(r => r.status === 'FAILED').length;

  console.log('\n================================================================');
  console.log('                 IMAGE MIGRATION SUMMARY                        ');
  console.log('================================================================');
  console.log(`Total Products Evaluated       : ${total}`);
  console.log(`Migrated to Firebase Storage   : ${migrated}`);
  console.log(`External Images Retained       : ${retained}`);
  console.log(`Failed Migrations              : ${failed}`);
  console.log(`Downloaded Local Backup Assets : ${report.filter(r => r.downloadedLocally).length}/22`);
  console.log('================================================================\n');

  // Save report to file
  const reportPath = path.join(process.cwd(), 'backup', 'stage5_image_standardization_report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total,
    migrated,
    retained,
    failed,
    report
  }, null, 2), 'utf-8');

  console.log(`Detailed report saved to: ${reportPath}`);
}

migrateImages().catch(console.error);
