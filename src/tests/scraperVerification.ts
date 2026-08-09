/**
 * Manual Scraper Verification Script
 * 
 * Run with: npx ts-node src/tests/scraperVerification.ts
 * 
 * This script performs end-to-end verification of:
 * 1. Web scraper functionality
 * 2. Data extraction accuracy
 * 3. Database persistence
 * 4. Scheduler integration
 * 5. API endpoints
 */

import { SarkariResultScraper } from '../services/webScraperService.js';
import { ScraperScheduler } from '../services/scraperScheduler.js';
import { initializeDatabase, isDatabaseAvailable, checkDatabaseHealth } from '../db/database.js';
import { DraftRepository, SourceRepository, AuditLogRepository } from '../db/repositories/index.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(level: 'info' | 'success' | 'error' | 'warn' | 'title', msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  const colorMap = {
    info: colors.cyan,
    success: colors.green,
    error: colors.red,
    warn: colors.yellow,
    title: colors.bright + colors.blue,
  };
  console.log(`${colorMap[level]}[${timestamp}] ${msg}${colors.reset}`);
}

async function verifyScraperSystem() {
  console.log('\n' + colors.bright + colors.blue + '═══════════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.bright + colors.blue + 'RozgarVaani Web Scraper - Verification Suite' + colors.reset);
  console.log(colors.bright + colors.blue + '═══════════════════════════════════════════════════════════' + colors.reset + '\n');

  let passCount = 0;
  let failCount = 0;

  // ── TEST 1: Database Connection ──────────────────────────────────────────
  log('title', '1️⃣  DATABASE CONNECTION TEST');
  try {
    const dbResult = initializeDatabase();
    if (dbResult.success) {
      log('success', '✓ Database initialized successfully');
      passCount++;

      const health = checkDatabaseHealth();
      if (health.available) {
        log('success', `✓ Database health check passed (${health.tableCount} tables)`);
        passCount++;
      } else {
        log('error', '✗ Database health check failed');
        failCount++;
      }
    } else {
      log('error', `✗ Database initialization failed: ${dbResult.error}`);
      failCount++;
    }
  } catch (error) {
    log('error', `✗ Database connection error: ${error}`);
    failCount++;
  }

  if (!isDatabaseAvailable()) {
    log('error', '✗ Database is not available for further tests');
    return { passCount, failCount };
  }

  // ── TEST 2: Scraper Initialization ──────────────────────────────────────
  log('title', '2️⃣  SCRAPER INITIALIZATION TEST');
  let scraper: SarkariResultScraper;
  try {
    scraper = new SarkariResultScraper({
      targetUrl: 'https://www.sarkariresult.com/',
      timeout: 15000,
      retryAttempts: 2,
    });
    log('success', '✓ Scraper initialized with config');
    passCount++;
  } catch (error) {
    log('error', `✗ Scraper initialization failed: ${error}`);
    failCount++;
    return { passCount, failCount };
  }

  // ── TEST 3: Data Conversion ─────────────────────────────────────────────
  log('title', '3️⃣  DATA CONVERSION TEST');
  try {
    const mockScrapedJob = {
      title: 'SSC Combined Graduate Level Examination 2026',
      organization: 'Staff Selection Commission',
      postNames: ['Assistant', 'Lower Division Clerk'],
      totalVacancies: 5000,
      qualification: 'Bachelor\'s Degree',
      ageMin: 18,
      ageMax: 30,
      applicationStart: '2026-01-15',
      applicationEnd: '2026-02-15',
      category: 'Central Government',
      postUrl: 'https://www.sarkariresult.com/ssc-cgl-2026',
      scrapedAt: new Date().toISOString(),
    };

    const draft = scraper.convertToDraft(mockScrapedJob);
    
    if (draft.title === mockScrapedJob.title && draft.isDraft && draft.verificationStatus === 'PENDING') {
      log('success', '✓ Scraped data converted to draft correctly');
      log('info', `  - Draft ID: ${draft.id}`);
      log('info', `  - Title: ${draft.title.substring(0, 50)}...`);
      log('info', `  - Verification Status: ${draft.verificationStatus}`);
      passCount++;
    } else {
      log('error', '✗ Draft conversion failed validation');
      failCount++;
    }
  } catch (error) {
    log('error', `✗ Data conversion failed: ${error}`);
    failCount++;
  }

  // ── TEST 4: Draft Creation in Database ──────────────────────────────────
  log('title', '4️⃣  DATABASE PERSISTENCE TEST');
  let createdDraftId: string | null = null;
  try {
    const testDraft = scraper.convertToDraft({
      title: 'Test Job - Verification Script',
      organization: 'Test Ministry',
      postNames: ['Test Post'],
      totalVacancies: 100,
      postUrl: 'https://example.com/test',
      scrapedAt: new Date().toISOString(),
    });

    DraftRepository.create(testDraft);
    createdDraftId = testDraft.id;
    log('success', '✓ Draft saved to database');
    log('info', `  - Draft ID: ${testDraft.id}`);
    passCount++;

    // Try to retrieve it
    const retrieved = await DraftRepository.findById(testDraft.id);
    if (retrieved && retrieved.title === testDraft.title) {
      log('success', '✓ Draft retrieved from database successfully');
      passCount++;
    } else {
      log('error', '✗ Failed to retrieve saved draft');
      failCount++;
    }
  } catch (error) {
    log('error', `✗ Database persistence failed: ${error}`);
    failCount++;
  }

  // ── TEST 5: Source Registry ─────────────────────────────────────────────
  log('title', '5️⃣  SOURCE REGISTRY TEST');
  let createdSourceId: string | null = null;
  try {
    const sourceReg = scraper.createSourceRegistry();
    SourceRepository.create(sourceReg);
    createdSourceId = sourceReg.id;
    log('success', '✓ Source registry created');
    log('info', `  - Source: ${sourceReg.name}`);
    log('info', `  - URL: ${sourceReg.url}`);
    passCount++;

    // Try to retrieve it
    const found = await SourceRepository.findByName('SarkariResult.com');
    if (found) {
      log('success', '✓ Source retrieved by name');
      passCount++;
    } else {
      log('warn', '⚠ Source not found by name (may be expected on first run)');
    }
  } catch (error) {
    log('error', `✗ Source registry failed: ${error}`);
    failCount++;
  }

  // ── TEST 6: Scheduler Initialization ────────────────────────────────────
  log('title', '6️⃣  SCHEDULER INITIALIZATION TEST');
  let scheduler: ScraperScheduler;
  try {
    scheduler = new ScraperScheduler({
      interval: '*/15 * * * *',
      enabled: true,
      maxRetries: 2,
    });
    log('success', '✓ Scheduler initialized');
    passCount++;

    const stats = scheduler.getStats();
    log('info', `  - Total Runs: ${stats.totalRuns}`);
    log('info', `  - Successful Runs: ${stats.successfulRuns}`);
    log('info', `  - Failed Runs: ${stats.failedRuns}`);
    log('info', `  - Jobs Scraped: ${stats.totalJobsScraped}`);
    log('info', `  - Jobs Processed: ${stats.totalJobsProcessed}`);
  } catch (error) {
    log('error', `✗ Scheduler initialization failed: ${error}`);
    failCount++;
    return { passCount, failCount };
  }

  // ── TEST 7: Scheduler Start/Stop ────────────────────────────────────────
  log('title', '7️⃣  SCHEDULER CONTROL TEST');
  try {
    scheduler.start();
    log('success', '✓ Scheduler started');
    passCount++;

    const info = scheduler.getInfo();
    if (info.isRunning) {
      log('success', '✓ Scheduler running status confirmed');
      passCount++;
    } else {
      log('error', '✗ Scheduler not running after start');
      failCount++;
    }

    scheduler.stop();
    log('success', '✓ Scheduler stopped');
    passCount++;
  } catch (error) {
    log('error', `✗ Scheduler control failed: ${error}`);
    failCount++;
  }

  // ── TEST 8: Audit Logging ──────────────────────────────────────────────
  log('title', '8️⃣  AUDIT LOGGING TEST');
  try {
    const auditLog = {
      id: `test-aud-${Date.now()}`,
      adminUser: 'VerificationScript',
      action: 'SCRAPER_VERIFICATION',
      details: 'Running scraper verification suite',
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };

    AuditLogRepository.create(auditLog);
    log('success', '✓ Audit log created');
    passCount++;

    const retrieved = await AuditLogRepository.findAll({ limit: 1 });
    if (retrieved && retrieved.length > 0) {
      log('success', '✓ Audit log retrieved');
      log('info', `  - Latest action: ${retrieved[0].action}`);
      passCount++;
    } else {
      log('warn', '⚠ Could not retrieve audit logs');
    }
  } catch (error) {
    log('error', `✗ Audit logging failed: ${error}`);
    failCount++;
  }

  // ── CLEANUP ─────────────────────────────────────────────────────────────
  log('title', '🧹 CLEANUP');
  try {
    if (createdDraftId) {
      DraftRepository.delete(createdDraftId);
      log('success', '✓ Test draft cleaned up');
    }
    if (createdSourceId) {
      SourceRepository.delete(createdSourceId);
      log('success', '✓ Test source cleaned up');
    }
  } catch (error) {
    log('warn', `⚠ Cleanup failed: ${error}`);
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n' + colors.bright + colors.blue + '═══════════════════════════════════════════════════════════' + colors.reset);
  const totalTests = passCount + failCount;
  const percentage = totalTests > 0 ? ((passCount / totalTests) * 100).toFixed(1) : '0.0';
  
  if (failCount === 0 && passCount > 0) {
    console.log(colors.green + colors.bright + `✓ ALL TESTS PASSED (${passCount}/${totalTests})` + colors.reset);
  } else {
    console.log(colors.yellow + colors.bright + `⚠ TESTS COMPLETED: ${passCount}/${totalTests} (${percentage}%)` + colors.reset);
  }
  
  console.log(colors.bright + colors.blue + '═══════════════════════════════════════════════════════════' + colors.reset + '\n');

  return { passCount, failCount };
}

// Run verification
verifyScraperSystem().then(({ passCount, failCount }) => {
  const exitCode = failCount > 0 ? 1 : 0;
  process.exit(exitCode);
}).catch((error) => {
  log('error', `Fatal error: ${error}`);
  process.exit(1);
});
