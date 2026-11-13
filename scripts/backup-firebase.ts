import { rawDb } from '../src/lib/firebase-admin.ts';
import { collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function backupFirestore() {
  console.log('====================================================');
  console.log('       FIREBASE CLOUD FIRESTORE BACKUP UTILITY      ');
  console.log('====================================================\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backup', `firestore_export_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const collections = [
    'users',
    'products',
    'categories',
    'inventory',
    'product_images',
    'coupons',
    'coupon_usages',
    'carts',
    'orders',
    'payments',
    'payment_attempts',
    'repairs',
    'contact_inquiries',
    'notifications',
    '_metadata'
  ];

  const manifest: Record<string, number> = {};

  for (const colName of collections) {
    try {
      const snap = await getDocs(collection(rawDb, colName));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filePath = path.join(backupDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      manifest[colName] = docs.length;
      console.log(`✔ Exported ${colName.padEnd(20)}: ${docs.length} documents -> ${colName}.json`);
    } catch (e: any) {
      console.error(`❌ Error exporting ${colName}:`, e.message);
      manifest[colName] = -1;
    }
  }

  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    sourceDatabase: 'ai-studio-systechcomputers-a214840e-ab4c-435a-967c-709346b0312c',
    counts: manifest
  }, null, 2), 'utf-8');

  console.log('\n====================================================');
  console.log(`Backup completed successfully! Directory: ${backupDir}`);
  console.log('====================================================');
}

backupFirestore().catch(console.error);
