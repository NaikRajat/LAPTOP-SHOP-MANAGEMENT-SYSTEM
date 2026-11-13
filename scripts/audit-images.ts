import { rawDb } from '../src/lib/firebase-admin.ts';
import { collection, getDocs } from 'firebase/firestore';

async function auditImages() {
  console.log('====================================================');
  console.log('       PRODUCT IMAGES AUDIT (22 FIRESTORE PRODUCTS) ');
  console.log('====================================================\n');

  const snap = await getDocs(collection(rawDb, 'products'));
  const prods = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  console.log(`Found ${prods.length} products in Firestore.\n`);

  const auditData: any[] = [];
  const sourceStats = {
    unsplash: 0,
    google_usercontent: 0,
    cloudinary: 0,
    firebase_storage: 0,
    other: 0
  };

  for (const p of prods) {
    const primaryUrl = p.image || '';
    const galleryUrls: string[] = Array.isArray(p.images) ? p.images : (primaryUrl ? [primaryUrl] : []);

    let primarySource = 'unknown';
    if (primaryUrl.includes('images.unsplash.com')) primarySource = 'Unsplash';
    else if (primaryUrl.includes('googleusercontent.com')) primarySource = 'Google User Content';
    else if (primaryUrl.includes('cloudinary.com')) primarySource = 'Cloudinary';
    else if (primaryUrl.includes('firebasestorage.googleapis.com')) primarySource = 'Firebase Storage';
    else primarySource = 'Other';

    if (primarySource === 'Unsplash') sourceStats.unsplash++;
    else if (primarySource === 'Google User Content') sourceStats.google_usercontent++;
    else if (primarySource === 'Cloudinary') sourceStats.cloudinary++;
    else if (primarySource === 'Firebase Storage') sourceStats.firebase_storage++;
    else sourceStats.other++;

    auditData.push({
      id: p.id,
      sku: p.sku || p.id,
      title: p.title,
      category: p.categoryId || 'accessories',
      primaryUrl,
      primarySource,
      galleryCount: galleryUrls.length,
      galleryUrls
    });

    console.log(`[${p.id}] ${p.title}`);
    console.log(`  Category : ${p.categoryId || 'accessories'} | SKU: ${p.sku}`);
    console.log(`  Primary  : ${primarySource} -> ${primaryUrl.substring(0, 60)}...`);
    console.log(`  Gallery  : ${galleryUrls.length} image(s)\n`);
  }

  console.log('----------------------------------------------------');
  console.log('IMAGE SOURCE DISTRIBUTION:');
  console.log(`- Unsplash CDN            : ${sourceStats.unsplash}`);
  console.log(`- Google User Content CDN : ${sourceStats.google_usercontent}`);
  console.log(`- Cloudinary CDN          : ${sourceStats.cloudinary}`);
  console.log(`- Firebase Storage        : ${sourceStats.firebase_storage}`);
  console.log(`- Other                   : ${sourceStats.other}`);
  console.log('====================================================');
}

auditImages().catch(console.error);
