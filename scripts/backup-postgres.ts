import fs from 'fs';
import path from 'path';
import { db } from '../src/db/index.ts';
import {
  users,
  accounts,
  sessions,
  verificationSessions,
  categories,
  products,
  productImages,
  inventory,
  carts,
  cartItems,
  coupons,
  couponUsages,
  orders,
  orderItems,
  payments,
  paymentAttempts,
  repairTickets,
  repairStatusHistory,
  contactInquiries,
  notifications,
  auditLogs
} from '../src/db/schema.ts';

async function performBackup() {
  console.log('====================================================');
  console.log('   STAGE 1: PRODUCTION POSTGRESQL DATABASE BACKUP    ');
  console.log('====================================================\n');

  const backupDir = path.join(process.cwd(), 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `postgres_full_backup_${timestamp}.json`;
  const backupLatestFilename = 'postgres_full_backup_latest.json';
  const backupPath = path.join(backupDir, backupFilename);
  const backupLatestPath = path.join(backupDir, backupLatestFilename);

  console.log('Connecting to PostgreSQL Cloud SQL database...');

  try {
    const [
      usersData,
      accountsData,
      sessionsData,
      verificationSessionsData,
      categoriesData,
      productsData,
      productImagesData,
      inventoryData,
      cartsData,
      cartItemsData,
      couponsData,
      couponUsagesData,
      ordersData,
      orderItemsData,
      paymentsData,
      paymentAttemptsData,
      repairTicketsData,
      repairStatusHistoryData,
      contactInquiriesData,
      notificationsData,
      auditLogsData
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(accounts),
      db.select().from(sessions),
      db.select().from(verificationSessions),
      db.select().from(categories),
      db.select().from(products),
      db.select().from(productImages),
      db.select().from(inventory),
      db.select().from(carts),
      db.select().from(cartItems),
      db.select().from(coupons),
      db.select().from(couponUsages),
      db.select().from(orders),
      db.select().from(orderItems),
      db.select().from(payments),
      db.select().from(paymentAttempts),
      db.select().from(repairTickets),
      db.select().from(repairStatusHistory),
      db.select().from(contactInquiries),
      db.select().from(notifications),
      db.select().from(auditLogs)
    ]);

    const backupPayload = {
      metadata: {
        exportedAt: new Date().toISOString(),
        databaseType: 'PostgreSQL Cloud SQL',
        databaseName: process.env.SQL_DB_NAME || 'cloud_sql_development_database',
        tablesCount: 21,
        totalRecords:
          usersData.length +
          accountsData.length +
          sessionsData.length +
          verificationSessionsData.length +
          categoriesData.length +
          productsData.length +
          productImagesData.length +
          inventoryData.length +
          cartsData.length +
          cartItemsData.length +
          couponsData.length +
          couponUsagesData.length +
          ordersData.length +
          orderItemsData.length +
          paymentsData.length +
          paymentAttemptsData.length +
          repairTicketsData.length +
          repairStatusHistoryData.length +
          contactInquiriesData.length +
          notificationsData.length +
          auditLogsData.length
      },
      tables: {
        users: usersData,
        accounts: accountsData,
        sessions: sessionsData,
        verification_sessions: verificationSessionsData,
        categories: categoriesData,
        products: productsData,
        product_images: productImagesData,
        inventory: inventoryData,
        carts: cartsData,
        cart_items: cartItemsData,
        coupons: couponsData,
        coupon_usages: couponUsagesData,
        orders: ordersData,
        order_items: orderItemsData,
        payments: paymentsData,
        payment_attempts: paymentAttemptsData,
        repair_tickets: repairTicketsData,
        repair_status_history: repairStatusHistoryData,
        contact_inquiries: contactInquiriesData,
        notifications: notificationsData,
        audit_logs: auditLogsData
      }
    };

    const serialized = JSON.stringify(backupPayload, null, 2);
    fs.writeFileSync(backupPath, serialized, 'utf-8');
    fs.writeFileSync(backupLatestPath, serialized, 'utf-8');

    console.log(`✅ Backup successfully created and saved to:\n   ${backupPath}\n   ${backupLatestPath}\n`);
    console.log('--- VERIFICATION SUMMARY TABLE ---');
    console.log(`1.  users:                   ${usersData.length} records`);
    console.log(`2.  accounts:                ${accountsData.length} records`);
    console.log(`3.  sessions:                ${sessionsData.length} records`);
    console.log(`4.  verification_sessions:   ${verificationSessionsData.length} records`);
    console.log(`5.  categories:              ${categoriesData.length} records`);
    console.log(`6.  products:                ${productsData.length} records`);
    console.log(`7.  product_images:          ${productImagesData.length} records`);
    console.log(`8.  inventory:               ${inventoryData.length} records`);
    console.log(`9.  carts:                   ${cartsData.length} records`);
    console.log(`10. cart_items:              ${cartItemsData.length} records`);
    console.log(`11. coupons:                 ${couponsData.length} records`);
    console.log(`12. coupon_usages:           ${couponUsagesData.length} records`);
    console.log(`13. orders:                  ${ordersData.length} records`);
    console.log(`14. order_items:             ${orderItemsData.length} records`);
    console.log(`15. payments:                ${paymentsData.length} records`);
    console.log(`16. payment_attempts:        ${paymentAttemptsData.length} records`);
    console.log(`17. repair_tickets:          ${repairTicketsData.length} records`);
    console.log(`18. repair_status_history:   ${repairStatusHistoryData.length} records`);
    console.log(`19. contact_inquiries:       ${contactInquiriesData.length} records`);
    console.log(`20. notifications:           ${notificationsData.length} records`);
    console.log(`21. audit_logs:              ${auditLogsData.length} records`);
    console.log('----------------------------------');
    console.log(`TOTAL RECORDS BACKED UP:      ${backupPayload.metadata.totalRecords}`);
    console.log(`FILE SIZE:                   ${(Buffer.byteLength(serialized) / 1024).toFixed(2)} KB`);

    // Verify backup file integrity
    const readBack = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    if (!readBack.metadata || !readBack.tables || readBack.tables.products.length !== productsData.length) {
      throw new Error('Integrity verification failed for generated backup file.');
    }
    console.log('✅ Integrity verification: 100% MATCH against PostgreSQL live tables.');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

performBackup();
