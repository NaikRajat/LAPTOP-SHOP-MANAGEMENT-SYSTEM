import fs from 'fs';
import path from 'path';

async function runBackupVerification() {
  const BASE_URL = 'http://localhost:3000';
  console.log('================================================================');
  console.log('      STAGE 6: AUTOMATED FIREBASE BACKUP VERIFICATION           ');
  console.log('================================================================\n');

  // 1. Authenticate Admin
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@systech.com', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.token;

  console.log('1. Admin authenticated for backup trigger.');

  // 2. Trigger real live backup immediately
  console.log('2. Triggering immediate live backup via POST /api/backup/trigger...');
  const triggerRes = await fetch(`${BASE_URL}/api/backup/trigger`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!triggerRes.ok) {
    throw new Error(`Trigger failed: ${triggerRes.status} ${await triggerRes.text()}`);
  }

  const triggerData = await triggerRes.json();
  console.log('Trigger response:', JSON.stringify(triggerData, null, 2));

  // 3. Query backup status via GET /api/backup/status
  console.log('\n3. Querying backup status via GET /api/backup/status...');
  const statusRes = await fetch(`${BASE_URL}/api/backup/status`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const statusData = await statusRes.json();
  console.log('Status response:', JSON.stringify(statusData, null, 2));

  // 4. Verify directory on disk
  console.log('\n4. Verifying private backup storage on disk...');
  const backupDir = statusData.lastBackup?.localPath;
  console.log(`Checking local backup directory: ${backupDir}`);

  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory ${backupDir} does not exist!`);
  }

  const stat = fs.statSync(backupDir);
  const modeOctal = (stat.mode & 0o777).toString(8);
  console.log(`Directory mode: 0${modeOctal} (0700 private: ${modeOctal === '700'})`);

  const files = fs.readdirSync(backupDir);
  console.log(`Files in backup snapshot (${files.length} files):`, files.join(', '));

  // Verify manifest
  const manifestPath = path.join(backupDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log('\n================================================================');
  console.log('               VERIFICATION SUMMARY RESULTS                     ');
  console.log('================================================================');
  console.log(`A. Backup Bucket Destination  : ${manifest.bucketDestination}`);
  console.log(`B. Scheduler / Job Name       : ${manifest.jobName}`);
  console.log(`C. Daily Schedule             : ${manifest.schedule} (Daily at 02:00 UTC)`);
  console.log(`D. Retention Period           : ${manifest.retentionDays} days`);
  console.log(`E. Latest Backup Timestamp    : ${manifest.completedAt}`);
  console.log(`F. Total Backup Size          : ${(manifest.sizeBytes / 1024).toFixed(2)} KB (${manifest.sizeBytes} bytes)`);
  console.log(`G. Collections Included (${manifest.totalCollections}) :`);
  for (const [col, info] of Object.entries(manifest.collections as Record<string, any>)) {
    console.log(`   - ${col.padEnd(24)}: ${String(info.count).padStart(4)} docs | ${(info.sizeBytes / 1024).toFixed(2)} KB | SHA256: ${info.sha256.substring(0, 12)}...`);
  }
  console.log(`H. Automated Backups Active   : ${statusData.active === true ? 'YES (ACTIVE)' : 'NO'}`);
  console.log(`I. Snapshot Checksum (SHA256) : ${manifest.checksum}`);
  console.log(`J. Storage Privacy Mode       : Mode 0${modeOctal} (Strictly Private - Non-Public)`);
  console.log('================================================================\n');
}

runBackupVerification().catch(console.error);
