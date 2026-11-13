import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db } from './index.ts';
import {
  users,
  categories,
  products,
  productImages,
  inventory,
  coupons,
  orders,
  orderItems,
  repairTickets,
  repairStatusHistory,
  contactInquiries,
  notifications
} from './schema.ts';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('--- Starting Database Seed from data/db.json ---');

  const dbJsonPath = path.join(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(dbJsonPath)) {
    console.error('data/db.json not found at', dbJsonPath);
    return;
  }

  const raw = fs.readFileSync(dbJsonPath, 'utf-8');
  const data = JSON.parse(raw);

  // 1. Seed Categories
  console.log('Seeding categories...');
  const categoryDefs = [
    { id: 'laptops', name: 'Showroom Laptops', description: 'Certified refurbished & sealed brand-new laptops', icon: 'Laptop', displayOrder: 1 },
    { id: 'accessories', name: 'Tech & Gaming Gear', description: 'High performance keyboards, mice, and docks', icon: 'Headphones', displayOrder: 2 },
    { id: 'storage', name: 'Storage & RAM Upgrades', description: 'NVMe Gen4 SSDs & high-speed memory modules', icon: 'HardDrive', displayOrder: 3 },
    { id: 'monitors', name: 'Displays & Monitors', description: 'Color-calibrated IPS & 144Hz+ gaming displays', icon: 'Monitor', displayOrder: 4 },
    { id: 'cctv', name: 'CCTV & Security', description: 'Hikvision, CP Plus & 4G Solar Surveillance Kits', icon: 'Shield', displayOrder: 5 }
  ];

  for (const cat of categoryDefs) {
    await db.insert(categories)
      .values(cat)
      .onConflictDoUpdate({
        target: categories.id,
        set: { name: cat.name, description: cat.description, icon: cat.icon, displayOrder: cat.displayOrder }
      });
  }

  // 2. Seed Default Coupons
  console.log('Seeding coupons...');
  const defaultCoupons = [
    { code: 'SYSTECH', description: 'Launch & In-Store pickup flat discount', discountPercent: 5, maxDiscount: 8000, minSpend: 10000, isActive: true },
    { code: 'FIRST10', description: 'First customer welcoming voucher', discountPercent: 10, maxDiscount: 3000, minSpend: 5000, isActive: true },
    { code: 'KUMTA5', description: 'Uttara Kannada local customer special', discountPercent: 5, maxDiscount: 5000, minSpend: 2000, isActive: true }
  ];

  for (const c of defaultCoupons) {
    await db.insert(coupons)
      .values(c)
      .onConflictDoNothing();
  }

  // 3. Seed Users with bcrypt hashed passwords
  console.log('Seeding users...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const ownerPasswordHash = await bcrypt.hash('systech2026', 10);

  // Default Admin & Owner
  const initialUsers = [
    {
      uid: 'user-admin',
      email: 'admin@systech.com',
      name: 'SysTech Admin Staff',
      phone: '+91 94481 55198',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isVerified: true
    },
    {
      uid: 'user-owner',
      email: 'rajatnaik0541@gmail.com',
      name: 'Rajat Naik (Store Owner)',
      phone: '+91 94481 55198',
      passwordHash: ownerPasswordHash,
      role: 'OWNER',
      isVerified: true
    }
  ];

  if (data.users && Array.isArray(data.users)) {
    for (const u of data.users) {
      if (u.email === 'admin@systech.com' || u.email === 'rajatnaik0541@gmail.com') continue;
      initialUsers.push({
        uid: u.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: u.email,
        name: u.name || 'Customer',
        phone: u.phone || '',
        passwordHash: await bcrypt.hash('customer123', 10),
        role: (u.role && u.role.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'CUSTOMER',
        isVerified: true
      });
    }
  }

  for (const u of initialUsers) {
    await db.insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: u.name,
          phone: u.phone,
          role: u.role,
          passwordHash: u.passwordHash,
          isVerified: u.isVerified
        }
      });
  }

  // 4. Seed Products and Inventory
  console.log('Seeding products & inventory...');
  if (data.products && Array.isArray(data.products)) {
    for (const p of data.products) {
      const categoryId = categoryDefs.some(c => c.id === p.category) ? p.category : 'laptops';
      const slug = p.id || p.sku.toLowerCase().replace(/[^a-z0-9]/g, '-');

      await db.insert(products)
        .values({
          id: p.id,
          slug,
          title: p.title,
          brand: p.brand || 'Generic',
          model: p.specs?.tagline || '',
          sku: p.sku || `SKU-${p.id}`,
          categoryId,
          price: p.price,
          originalPrice: p.originalPrice || p.price,
          condition: p.condition === 'brand_new' ? 'new' : 'refurbished',
          warranty: p.specs?.warranty || '1 Year SysTech Store Warranty',
          rating: String(p.rating || '4.8'),
          reviewCount: p.reviewsCount || 0,
          featured: Boolean(p.featured),
          description: p.description || '',
          image: p.image || '',
          specifications: p.specs || {}
        })
        .onConflictDoUpdate({
          target: products.id,
          set: {
            title: p.title,
            brand: p.brand || 'Generic',
            price: p.price,
            originalPrice: p.originalPrice || p.price,
            condition: p.condition === 'brand_new' ? 'new' : 'refurbished',
            image: p.image || '',
            specifications: p.specs || {}
          }
        });

      // Insert primary image
      if (p.image) {
        await db.insert(productImages)
          .values({
            productId: p.id,
            url: p.image,
            isPrimary: true,
            displayOrder: 0
          })
          .onConflictDoNothing();
      }

      // Insert inventory
      await db.insert(inventory)
        .values({
          productId: p.id,
          stock: p.stock ?? 5,
          reservedStock: 0,
          lowStockThreshold: 2
        })
        .onConflictDoUpdate({
          target: inventory.productId,
          set: {
            stock: p.stock ?? 5
          }
        });
    }
  }

  // 5. Seed Repairs
  console.log('Seeding repair tickets...');
  if (data.repairs && Array.isArray(data.repairs)) {
    for (const r of data.repairs) {
      await db.insert(repairTickets)
        .values({
          id: r.id,
          ticketNumber: r.ticketNumber,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          deviceType: 'Laptop',
          deviceBrand: r.deviceModel?.split(' ')[0] || 'Generic',
          deviceModel: r.deviceModel || 'Laptop',
          issueDescription: `${r.issueCategory}: ${r.issueDetails}`,
          urgency: 'standard',
          status: r.status === 'completed' ? 'delivered' : 'in_repair',
          estimatedCost: r.estimatedCost || 0,
          technicianNotes: r.technicianNotes || ''
        })
        .onConflictDoNothing();
    }
  }

  // 6. Seed Inquiries & Notifications
  console.log('Seeding messages & notifications...');
  if (data.messages && Array.isArray(data.messages)) {
    for (const m of data.messages) {
      await db.insert(contactInquiries)
        .values({
          name: m.name,
          email: m.email,
          phone: m.phone || '',
          subject: m.subject || 'Store Inquiry',
          message: m.message,
          status: m.read ? 'resolved' : 'unread'
        })
        .onConflictDoNothing();
    }
  }

  if (data.notifications && Array.isArray(data.notifications)) {
    for (const n of data.notifications) {
      await db.insert(notifications)
        .values({
          title: n.title,
          message: n.message,
          type: n.type || 'order',
          isRead: Boolean(n.read)
        })
        .onConflictDoNothing();
    }
  }

  console.log('--- Seeding Completed Successfully! ---');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
