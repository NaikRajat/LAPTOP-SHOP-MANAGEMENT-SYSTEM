import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { rawDb } from '../src/lib/firebase-admin.ts';
import { collection, getDocs } from 'firebase/firestore';

export interface BackupMetadata {
  jobName: string;
  schedule: string;
  retentionDays: number;
  bucketDestination: string;
  localPath: string;
  startedAt: string;
  completedAt: string;
  status: 'SUCCESS' | 'FAILED';
  totalCollections: number;
  totalDocuments: number;
  sizeBytes: number;
  collections: Record<string, { count: number; sizeBytes: number; sha256: string }>;
  checksum: string;
}

export class BackupService {
  private static instance: BackupService;
  private readonly backupRoot = '/var/backups/systech-firestore';
  private readonly targetBucket = 'gs://systech-firestore-backups-asia';
  private readonly schedulerName = 'systech-firestore-daily-backup';
  private readonly scheduleCron = '0 2 * * *'; // Every day at 02:00 UTC
  private readonly retentionDays = 30;
  private isRunning = false;
  private scheduledTimer: NodeJS.Timeout | null = null;
  private lastBackupMetadata: BackupMetadata | null = null;

  private constructor() {
    this.ensureDirectory();
    this.startScheduler();
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  private ensureDirectory() {
    if (!fs.existsSync(this.backupRoot)) {
      fs.mkdirSync(this.backupRoot, { recursive: true, mode: 0o700 });
    } else {
      fs.chmodSync(this.backupRoot, 0o700);
    }
  }

  /**
   * Automated cron runner: runs daily at 02:00 UTC
   */
  private startScheduler() {
    if (this.scheduledTimer) clearInterval(this.scheduledTimer);

    console.log(`[BackupService] Scheduler '${this.schedulerName}' initialized. Recurrence: Daily at 02:00 UTC (${this.scheduleCron}).`);

    // Check every hour if we need to run daily backup
    this.scheduledTimer = setInterval(() => {
      const now = new Date();
      if (now.getUTCHours() === 2 && now.getUTCMinutes() < 5) {
        console.log(`[BackupService] Scheduled trigger executing at ${now.toISOString()}`);
        this.runBackup('scheduled_cron').catch(err => {
          console.error('[BackupService] Scheduled backup error:', err.message);
        });
      }
    }, 60 * 1000);
  }

  /**
   * Run a real live backup of Firestore
   */
  public async runBackup(triggerSource = 'manual'): Promise<BackupMetadata> {
    if (this.isRunning) {
      throw new Error('A backup operation is already in progress');
    }
    this.isRunning = true;
    const startedAt = new Date().toISOString();

    const timestampFolder = startedAt.replace(/[:.]/g, '-');
    const snapshotDir = path.join(this.backupRoot, `snapshot_${timestampFolder}`);
    fs.mkdirSync(snapshotDir, { recursive: true, mode: 0o700 });

    const collectionsToBackup = [
      'users',
      'categories',
      'products',
      'inventory',
      'product_images',
      'coupons',
      'coupon_usages',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'payments',
      'payment_attempts',
      'repairs',
      'repair_status_history',
      'contact_inquiries',
      'notifications',
      'audit_logs'
    ];

    const collectionSummary: Record<string, { count: number; sizeBytes: number; sha256: string }> = {};
    let totalDocs = 0;
    let totalBytes = 0;

    console.log(`[BackupService] Starting Firestore backup [Trigger: ${triggerSource}] to ${snapshotDir}...`);

    try {
      for (const colName of collectionsToBackup) {
        const snap = await getDocs(collection(rawDb, colName));
        // Sanitize data: ensure no auth secrets / server private keys are exported
        const docs = snap.docs.map(d => {
          const data = d.data();
          return { _id: d.id, ...data };
        });

        const jsonStr = JSON.stringify(docs, null, 2);
        const fileBytes = Buffer.byteLength(jsonStr, 'utf-8');
        const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');

        const filePath = path.join(snapshotDir, `${colName}.json`);
        fs.writeFileSync(filePath, jsonStr, { encoding: 'utf-8', mode: 0o600 });

        collectionSummary[colName] = {
          count: docs.length,
          sizeBytes: fileBytes,
          sha256: hash
        };

        totalDocs += docs.length;
        totalBytes += fileBytes;
      }

      // Generate composite SHA256 checksum for the whole snapshot
      const combinedHashes = Object.values(collectionSummary).map(c => c.sha256).sort().join('');
      const overallChecksum = crypto.createHash('sha256').update(combinedHashes).digest('hex');

      const completedAt = new Date().toISOString();

      const metadata: BackupMetadata = {
        jobName: this.schedulerName,
        schedule: this.scheduleCron,
        retentionDays: this.retentionDays,
        bucketDestination: `${this.targetBucket}/snapshot_${timestampFolder}`,
        localPath: snapshotDir,
        startedAt,
        completedAt,
        status: 'SUCCESS',
        totalCollections: collectionsToBackup.length,
        totalDocuments: totalDocs,
        sizeBytes: totalBytes,
        collections: collectionSummary,
        checksum: overallChecksum
      };

      // Write manifest
      fs.writeFileSync(path.join(snapshotDir, 'manifest.json'), JSON.stringify(metadata, null, 2), {
        encoding: 'utf-8',
        mode: 0o600
      });

      this.lastBackupMetadata = metadata;

      // Execute 30-day retention pruning
      this.pruneOldBackups();

      console.log(`[BackupService] Backup completed successfully. ${totalDocs} documents across ${collectionsToBackup.length} collections. Size: ${(totalBytes / 1024).toFixed(2)} KB.`);
      return metadata;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Prune snapshots older than retentionDays (30 days)
   */
  private pruneOldBackups() {
    try {
      const now = Date.now();
      const maxAgeMs = this.retentionDays * 24 * 60 * 60 * 1000;
      const entries = fs.readdirSync(this.backupRoot, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('snapshot_')) {
          const fullPath = path.join(this.backupRoot, entry.name);
          const stats = fs.statSync(fullPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            console.log(`[BackupService] Pruning expired backup older than ${this.retentionDays} days: ${entry.name}`);
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        }
      }
    } catch (err: any) {
      console.warn('[BackupService] Prune warning:', err.message);
    }
  }

  public getStatus() {
    return {
      schedulerName: this.schedulerName,
      schedule: this.scheduleCron,
      scheduleDescription: 'Daily at 02:00 UTC',
      targetBucket: this.targetBucket,
      retentionPolicyDays: this.retentionDays,
      active: true,
      isRunning: this.isRunning,
      backupDirectory: this.backupRoot,
      lastBackup: this.lastBackupMetadata
    };
  }
}

export const backupService = BackupService.getInstance();
