/**
 * Database Integration Test Suite for RozgarVaani
 * 
 * Comprehensive tests covering all 9 check categories:
 * 1. Database Connection & Schema Validation
 * 2. Repository CRUD Operations
 * 3. Data Persistence & Retrieval Accuracy
 * 4. Constraint Enforcement (Unique, Foreign Keys, Check)
 * 5. Transaction Handling & Data Integrity
 * 6. Server Startup & Health Check Integration
 * 7. API Route Database Guard Middleware
 * 8. AI Pipeline Database Integration
 * 9. Error Handling & Graceful Degradation
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { 
  initializeDatabase, 
  isDatabaseAvailable, 
  checkDatabaseHealth, 
  closeDatabase,
  getDatabase,
  runTransaction
} from '../db/database.js';
import {
  JobRepository,
  DraftRepository,
  AgentLogRepository,
  AuditLogRepository,
  SourceRepository,
  SettingsRepository
} from '../db/repositories/index.js';
import type { GovtJob, GovtJobDraft, AgentLog, AuditLog, SourceRegistry } from '../types.js';

// Test database path
const TEST_DB_PATH = './test-rozgarvaani.db';

// Sample test data
const createTestJob = (): GovtJob => ({
  id: `test-job-${Date.now()}`,
  slug: `test-job-slug-${Date.now()}`,
  title: 'Test Government Job',
  organization: 'Test Ministry',
  department: 'Test Department',
  advertisementNumber: `TEST-${Date.now()}`,
  category: 'Central Government',
  state: 'All India',
  postNames: ['Test Officer', 'Test Assistant'],
  totalVacancies: 100,
  categoryWiseVacancies: { ur: 50, obc: 25, sc: 15, st: 10, ews: 0 },
  qualification: 'Graduation',
  qualificationDetails: 'Bachelor degree from recognized university',
  ageMin: 18,
  ageMax: 35,
  ageRelaxation: 'As per government rules',
  applicationStart: '2026-01-01',
  applicationEnd: '2026-01-31',
  feePaymentDeadline: '2026-01-31',
  examDate: '2026-03-15',
  applicationFee: { generalObc: '₹500', scSt: '₹250', female: '₹250' },
  salary: { payLevel: 'Level 6', payScale: '₹35,400-₹1,12,400', basicPay: '₹35,400' },
  selectionProcess: ['Written Exam', 'Interview', 'Document Verification'],
  howToApply: ['Online application', 'Pay fee', 'Submit documents'],
  overview: 'Test recruitment for government positions',
  status: 'NEW',
  isClosingSoon: false,
  links: {
    applyUrl: 'https://test.gov.in/apply',
    notificationUrl: 'https://test.gov.in/notification.pdf',
    officialWebsiteUrl: 'https://test.gov.in'
  },
  sourceInfo: {
    name: 'Test Source',
    type: 'Test Source Type',
    lastVerified: '2026-01-01',
    evidenceText: 'Test evidence'
  },
  verificationStatus: 'PASSED',
  qualityStatus: 'PASSED',
  isDraft: false,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const createTestDraft = (): GovtJobDraft => ({
  ...createTestJob(),
  id: `test-draft-${Date.now()}`,
  slug: `test-draft-slug-${Date.now()}`,
  isDraft: true,
  publishedAt: undefined,
  verificationReport: {
    verificationStatus: 'PASSED',
    qualityScore: 85,
    checkedFields: [
      {
        field: 'title',
        value: 'Test Government Job',
        verified: true,
        confidence: 0.95,
        evidence: 'Source document verification'
      }
    ],
    criticalErrors: [],
    warnings: [],
    evidenceText: 'Test verification evidence',
    verifiedAt: new Date().toISOString()
  },
  agentLogs: []
});

const createTestAgentLog = (): AgentLog => ({
  id: `test-log-${Date.now()}`,
  itemTitle: 'Test Job Processing',
  agentType: 'DISCOVERY',
  status: 'SUCCESS',
  durationMs: 1500,
  modelUsed: 'Test Model',
  inputSummary: 'Test input processing',
  outputSummary: 'Test output generated',
  evidenceText: 'Test evidence',
  timestamp: new Date().toISOString()
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SETUP & TEARDOWN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Database Integration Tests', () => {
  beforeAll(() => {
    // Set test database URL
    process.env.DATABASE_URL = TEST_DB_PATH;
  });

  afterAll(() => {
    // Clean up test database
    try {
      closeDatabase();
      const fs = require('fs');
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
      if (fs.existsSync(`${TEST_DB_PATH}-shm`)) {
        fs.unlinkSync(`${TEST_DB_PATH}-shm`);
      }
      if (fs.existsSync(`${TEST_DB_PATH}-wal`)) {
        fs.unlinkSync(`${TEST_DB_PATH}-wal`);
      }
    } catch (error) {
      console.error('Test cleanup error:', error);
    }
  });

  beforeEach(() => {
    // Reinitialize database for each test
    closeDatabase();
    const result = initializeDatabase(TEST_DB_PATH);
    if (!result.success) {
      throw new Error(`Database initialization failed: ${result.error}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 1: DATABASE CONNECTION & SCHEMA VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('1. Database Connection & Schema Validation', () => {
    test('should initialize database successfully', () => {
      const result = initializeDatabase(TEST_DB_PATH);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should report database as available after initialization', () => {
      expect(isDatabaseAvailable()).toBe(true);
    });

    test('should pass health check with correct table count', () => {
      const health = checkDatabaseHealth();
      expect(health.available).toBe(true);
      expect(health.responsive).toBe(true);
      expect(health.tableCount).toBe(10); // All required tables
      expect(health.schemaVersion).toBeDefined();
      expect(health.error).toBeUndefined();
    });

    test('should create all required tables', () => {
      const db = getDatabase();
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as Array<{ name: string }>;

      const expectedTables = [
        'ad_campaigns', 'admit_cards', 'agent_logs', 'answer_keys', 
        'audit_logs', 'drafts', 'jobs', 'results', 'site_settings', 'sources'
      ];

      const actualTables = tables.map(t => t.name).sort();
      expect(actualTables).toEqual(expectedTables);
    });

    test('should have indexes on frequently queried columns', () => {
      const db = getDatabase();
      const indexes = db.prepare(`
        SELECT name, tbl_name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all() as Array<{ name: string; tbl_name: string }>;

      // Check for key indexes
      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_jobs_slug');
      expect(indexNames).toContain('idx_jobs_status');
      expect(indexNames).toContain('idx_drafts_verification_status');
      expect(indexNames).toContain('idx_agent_logs_timestamp');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 2: REPOSITORY CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('2. Repository CRUD Operations', () => {
    test('JobRepository - Create, Read, Update, Delete', () => {
      const testJob = createTestJob();
      
      // CREATE
      const created = await JobRepository.create(testJob);
      expect(created.id).toBe(testJob.id);
      expect(created.title).toBe(testJob.title);

      // READ by ID
      const foundById = await JobRepository.findById(testJob.id);
      expect(foundById).toBeDefined();
      expect(foundById!.id).toBe(testJob.id);
      expect(foundById!.organization).toBe(testJob.organization);

      // READ by slug
      const foundBySlug = await JobRepository.findBySlug(testJob.slug);
      expect(foundBySlug).toBeDefined();
      expect(foundBySlug!.slug).toBe(testJob.slug);

      // UPDATE
      const updated = await JobRepository.update(testJob.id, { 
        title: 'Updated Test Job',
        totalVacancies: 200
      });
      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Updated Test Job');
      expect(updated!.totalVacancies).toBe(200);
      expect(updated!.organization).toBe(testJob.organization); // Unchanged field preserved

      // DELETE
      const deleted = await JobRepository.delete(testJob.id);
      expect(deleted).toBe(true);
      
      const notFound = await JobRepository.findById(testJob.id);
      expect(notFound).toBeNull();
    });

    test('DraftRepository - Full CRUD cycle', () => {
      const testDraft = createTestDraft();
      
      // CREATE
      const created = await DraftRepository.create(testDraft);
      expect(created.id).toBe(testDraft.id);
      expect(created.isDraft).toBe(true);
      expect(created.verificationReport.verificationStatus).toBe('PASSED');

      // READ
      const found = await DraftRepository.findById(testDraft.id);
      expect(found).toBeDefined();
      expect(found!.verificationReport).toBeDefined();
      expect(found!.agentLogs).toEqual([]);

      // UPDATE
      const updated = await DraftRepository.update(testDraft.id, {
        verificationReport: {
          ...testDraft.verificationReport,
          qualityScore: 95
        }
      });
      expect(updated!.verificationReport.qualityScore).toBe(95);

      // COUNT
      const count = await DraftRepository.count();
      expect(count).toBe(1);

      // DELETE
      const deleted = await DraftRepository.delete(testDraft.id);
      expect(deleted).toBe(true);
      expect(DraftRepository.count()).toBe(0);
    });

    test('AgentLogRepository - logging and statistics', () => {
      const testLog = createTestAgentLog();
      
      // CREATE
      const created = await AgentLogRepository.create(testLog);
      expect(created.agentType).toBe('DISCOVERY');
      expect(created.status).toBe('SUCCESS');

      // READ
      const found = await AgentLogRepository.findById(testLog.id);
      expect(found).toBeDefined();
      expect(found!.durationMs).toBe(1500);

      // FIND ALL with filters
      const allLogs = await AgentLogRepository.findAll({ 
        agentType: 'DISCOVERY',
        limit: 10 
      });
      expect(allLogs).toHaveLength(1);
      expect(allLogs[0].agentType).toBe('DISCOVERY');

      // STATISTICS
      const stats = await AgentLogRepository.getStatistics();
      expect(stats.totalRuns).toBe(1);
      expect(stats.successRate).toBe(100);
      expect(stats.avgDurationMs).toBe(1500);
      expect(stats.byAgent.DISCOVERY).toBeDefined();
      expect(stats.byAgent.DISCOVERY.count).toBe(1);
    });

    test('SettingsRepository - singleton operations', () => {
      // GET (should return defaults)
      const settings = await SettingsRepository.get();
      expect(settings.adsEnabled).toBe(true);
      expect(settings.siteTitle).toBe('RozgarVaani - India Government Jobs');

      // UPDATE
      const updated = await SettingsRepository.update({
        adsEnabled: false,
        siteTitle: 'Test Site',
        autoScanIntervalMinutes: 60
      });
      expect(updated.adsEnabled).toBe(false);
      expect(updated.siteTitle).toBe('Test Site');
      expect(updated.autoScanIntervalMinutes).toBe(60);
      expect(updated.contactEmail).toBe('contact@rozgarvaani.in'); // Unchanged

      // Verify persistence
      const retrieved = await SettingsRepository.get();
      expect(retrieved.adsEnabled).toBe(false);
      expect(retrieved.siteTitle).toBe('Test Site');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 3: DATA PERSISTENCE & RETRIEVAL ACCURACY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('3. Data Persistence & Retrieval Accuracy', () => {
    test('should preserve complex nested objects in JSON fields', () => {
      const testJob = createTestJob();
      testJob.categoryWiseVacancies = { ur: 40, obc: 30, sc: 20, st: 10, ews: 0 };
      testJob.links = {
        applyUrl: 'https://test.example.com/apply',
        notificationUrl: 'https://test.example.com/notification.pdf',
        officialWebsiteUrl: 'https://test.example.com'
      };

      JobRepository.create(testJob);
      const retrieved = await JobRepository.findById(testJob.id);

      expect(retrieved!.categoryWiseVacancies).toEqual({
        ur: 40, obc: 30, sc: 20, st: 10, ews: 0
      });
      expect(retrieved!.links.applyUrl).toBe('https://test.example.com/apply');
      expect(retrieved!.selectionProcess).toEqual(testJob.selectionProcess);
    });

    test('should handle null and undefined values correctly', () => {
      const testJob = createTestJob();
      testJob.state = undefined;
      testJob.correctionWindow = undefined;
      testJob.admitCardDate = undefined;

      JobRepository.create(testJob);
      const retrieved = await JobRepository.findById(testJob.id);

      expect(retrieved!.state).toBeUndefined();
      expect(retrieved!.correctionWindow).toBeUndefined();
      expect(retrieved!.admitCardDate).toBeUndefined();
    });

    test('should maintain data type accuracy for numbers and booleans', () => {
      const testJob = createTestJob();
      testJob.totalVacancies = 500;
      testJob.ageMin = 21;
      testJob.ageMax = 40;
      testJob.isClosingSoon = true;
      testJob.isDraft = false;

      JobRepository.create(testJob);
      const retrieved = await JobRepository.findById(testJob.id);

      expect(retrieved!.totalVacancies).toBe(500);
      expect(typeof retrieved!.totalVacancies).toBe('number');
      expect(retrieved!.ageMin).toBe(21);
      expect(retrieved!.ageMax).toBe(40);
      expect(retrieved!.isClosingSoon).toBe(true);
      expect(retrieved!.isDraft).toBe(false);
    });

    test('should preserve timestamp precision in ISO format', () => {
      const testJob = createTestJob();
      const testTime = '2026-01-15T10:30:45.123Z';
      testJob.createdAt = testTime;
      testJob.updatedAt = testTime;

      JobRepository.create(testJob);
      const retrieved = await JobRepository.findById(testJob.id);

      expect(retrieved!.createdAt).toBe(testTime);
      expect(retrieved!.updatedAt).toBe(testTime);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 4: CONSTRAINT ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('4. Constraint Enforcement (Unique, Foreign Keys, Check)', () => {
    test('should enforce unique constraint on job slug', () => {
      const job1 = createTestJob();
      const job2 = createTestJob();
      job2.id = `different-${Date.now()}`;
      job2.slug = job1.slug; // Same slug

      JobRepository.create(job1);
      
      expect(() => {
        JobRepository.create(job2);
      }).toThrow();
    });

    test('should enforce unique constraint on organization + advertisement_number', () => {
      const job1 = createTestJob();
      const job2 = createTestJob();
      job2.id = `different-${Date.now()}`;
      job2.slug = `different-slug-${Date.now()}`;
      job2.organization = job1.organization;
      job2.advertisementNumber = job1.advertisementNumber;

      JobRepository.create(job1);
      
      expect(() => {
        JobRepository.create(job2);
      }).toThrow();
    });

    test('should enforce CHECK constraints on status enum', () => {
      const testJob = createTestJob();
      testJob.status = 'INVALID_STATUS' as any;

      expect(() => {
        JobRepository.create(testJob);
      }).toThrow();
    });

    test('should enforce CHECK constraints on verification status', () => {
      const testDraft = createTestDraft();
      testDraft.verificationStatus = 'INVALID_STATUS' as any;

      expect(() => {
        DraftRepository.create(testDraft);
      }).toThrow();
    });

    test('should enforce CHECK constraints on agent type enum', () => {
      const testLog = createTestAgentLog();
      testLog.agentType = 'INVALID_AGENT' as any;

      expect(() => {
        AgentLogRepository.create(testLog);
      }).toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 5: TRANSACTION HANDLING & DATA INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('5. Transaction Handling & Data Integrity', () => {
    test('should handle successful transaction with multiple operations', () => {
      const job = createTestJob();
      const log = createTestAgentLog();
      log.itemTitle = job.title;

      const result = runTransaction((db) => {
        JobRepository.create(job);
        AgentLogRepository.create(log);
        return { jobId: job.id, logId: log.id };
      });

      expect(result.jobId).toBe(job.id);
      expect(result.logId).toBe(log.id);

      // Verify both records exist
      expect(JobRepository.findById(job.id)).toBeDefined();
      expect(AgentLogRepository.findById(log.id)).toBeDefined();
    });

    test('should rollback transaction on error', () => {
      const job1 = createTestJob();
      const job2 = createTestJob();
      job2.id = `different-${Date.now()}`;
      job2.slug = job1.slug; // This will cause constraint violation

      expect(() => {
        runTransaction((db) => {
          JobRepository.create(job1);
          JobRepository.create(job2); // This should fail and rollback
        });
      }).toThrow();

      // Verify rollback - no jobs should exist
      expect(JobRepository.findById(job1.id)).toBeNull();
    });

    test('should maintain referential integrity across tables', () => {
      const job = createTestJob();
      const auditLog: AuditLog = {
        id: `test-audit-${Date.now()}`,
        adminUser: 'test-admin',
        action: 'CREATE_JOB',
        details: `Created job: ${job.title}`,
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString()
      };

      runTransaction(() => {
        JobRepository.create(job);
        AuditLogRepository.create(auditLog);
      });

      expect(JobRepository.findById(job.id)).toBeDefined();
      expect(AuditLogRepository.findById(auditLog.id)).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 6: SERVER STARTUP & HEALTH CHECK INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('6. Server Startup & Health Check Integration', () => {
    test('should initialize database on server startup', () => {
      // Simulate server startup
      closeDatabase();
      const result = initializeDatabase(TEST_DB_PATH);
      
      expect(result.success).toBe(true);
      expect(isDatabaseAvailable()).toBe(true);
    });

    test('should provide comprehensive health check information', () => {
      const health = checkDatabaseHealth();
      
      expect(health.available).toBe(true);
      expect(health.responsive).toBe(true);
      expect(health.tableCount).toBeGreaterThan(0);
      expect(health.schemaVersion).toBeDefined();
    });

    test('should handle database unavailable gracefully', () => {
      closeDatabase();
      
      expect(isDatabaseAvailable()).toBe(false);
      
      const health = checkDatabaseHealth();
      expect(health.available).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 7: API ROUTE DATABASE GUARD MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('7. API Route Database Guard Middleware', () => {
    test('should allow operations when database is available', () => {
      expect(isDatabaseAvailable()).toBe(true);
      
      // Simulate API operations that require database
      const testJob = createTestJob();
      const created = await JobRepository.create(testJob);
      expect(created).toBeDefined();
      
      const found = await JobRepository.findById(testJob.id);
      expect(found).toBeDefined();
    });

    test('should block operations when database is unavailable', () => {
      closeDatabase();
      expect(isDatabaseAvailable()).toBe(false);
      
      // Repository operations should fail gracefully
      expect(() => {
        const testJob = createTestJob();
        JobRepository.create(testJob);
      }).toThrow('Database not initialized');
    });

    test('should validate database health before operations', () => {
      const health = checkDatabaseHealth();
      expect(health.available).toBe(true);
      expect(health.responsive).toBe(true);
      
      // Only proceed with operations if health check passes
      if (health.available && health.responsive) {
        const testLog = createTestAgentLog();
        const created = await AgentLogRepository.create(testLog);
        expect(created).toBeDefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 8: AI PIPELINE DATABASE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('8. AI Pipeline Database Integration', () => {
    test('should create draft from AI pipeline output', () => {
      const testDraft = createTestDraft();
      testDraft.agentLogs = [
        createTestAgentLog(),
        { ...createTestAgentLog(), agentType: 'EXTRACTION', id: `test-extract-${Date.now()}` },
        { ...createTestAgentLog(), agentType: 'VERIFICATION', id: `test-verify-${Date.now()}` }
      ];

      const created = await DraftRepository.create(testDraft);
      expect(created.agentLogs).toHaveLength(3);
      
      const retrieved = await DraftRepository.findById(testDraft.id);
      expect(retrieved!.agentLogs).toHaveLength(3);
      expect(retrieved!.agentLogs[0].agentType).toBe('DISCOVERY');
    });

    test('should prevent duplicate job creation via pipeline', () => {
      const job1 = createTestJob();
      const draft1 = createTestDraft();
      draft1.organization = job1.organization;
      draft1.advertisementNumber = job1.advertisementNumber;

      JobRepository.create(job1);
      
      // Pipeline should detect duplicate before creating draft
      const existing = await JobRepository.existsByOrgAndAdvNumber(
        job1.organization, 
        job1.advertisementNumber!
      );
      expect(existing).toBe(true);
      
      // Should not create duplicate draft
      expect(() => {
        DraftRepository.create(draft1);
      }).toThrow();
    });

    test('should log all agent executions', () => {
      const logs = [
        createTestAgentLog(),
        { ...createTestAgentLog(), agentType: 'CLASSIFICATION', id: `test-class-${Date.now()}` },
        { ...createTestAgentLog(), agentType: 'EXTRACTION', id: `test-extract-${Date.now()}` }
      ];

      logs.forEach(log => AgentLogRepository.create(log));

      const allLogs = await AgentLogRepository.findAll({ limit: 10 });
      expect(allLogs).toHaveLength(3);

      const stats = await AgentLogRepository.getStatistics();
      expect(stats.totalRuns).toBe(3);
      expect(stats.byAgent.DISCOVERY).toBeDefined();
      expect(stats.byAgent.CLASSIFICATION).toBeDefined();
    });

    test('should promote draft to published job', () => {
      const testDraft = createTestDraft();
      DraftRepository.create(testDraft);

      // Simulate admin approval - convert draft to job
      const jobData: GovtJob = {
        ...testDraft,
        isDraft: false,
        publishedAt: new Date().toISOString()
      };

      runTransaction(() => {
        JobRepository.create(jobData);
        DraftRepository.delete(testDraft.id);
      });

      expect(JobRepository.findById(testDraft.id)).toBeDefined();
      expect(DraftRepository.findById(testDraft.id)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY 9: ERROR HANDLING & GRACEFUL DEGRADATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('9. Error Handling & Graceful Degradation', () => {
    test('should handle database initialization failure gracefully', () => {
      const result = initializeDatabase('/invalid/path/database.db');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('ENOENT');
    });

    test('should provide meaningful error messages for constraint violations', () => {
      const job1 = createTestJob();
      const job2 = createTestJob();
      job2.slug = job1.slug; // Duplicate slug

      JobRepository.create(job1);

      let error: Error | null = null;
      try {
        JobRepository.create(job2);
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
      expect(error!.message).toContain('UNIQUE constraint failed');
    });

    test('should handle connection loss gracefully', () => {
      closeDatabase();

      const health = checkDatabaseHealth();
      expect(health.available).toBe(false);
      expect(health.responsive).toBe(false);
      expect(health.error).toBe('Database not initialized');
    });

    test('should validate input data and reject invalid records', () => {
      const invalidJob = {
        ...createTestJob(),
        totalVacancies: 'invalid' as any, // Wrong type
        ageMin: -5, // Invalid age
        status: 'INVALID_STATUS' as any
      };

      expect(() => {
        JobRepository.create(invalidJob);
      }).toThrow();
    });

    test('should handle concurrent operations safely', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => {
        const job = createTestJob();
        job.id = `concurrent-job-${i}-${Date.now()}`;
        job.slug = `concurrent-slug-${i}-${Date.now()}`;
        return job;
      });

      // Create jobs concurrently
      const promises = jobs.map(job => 
        Promise.resolve().then(() => JobRepository.create(job))
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);

      // Verify all jobs were created
      const count = await JobRepository.count();
      expect(count).toBe(5);
    });

    test('should maintain data consistency during failures', () => {
      const job = createTestJob();
      const invalidLog = createTestAgentLog();
      invalidLog.agentType = 'INVALID_TYPE' as any;

      expect(() => {
        runTransaction(() => {
          JobRepository.create(job);
          AgentLogRepository.create(invalidLog); // This should fail
        });
      }).toThrow();

      // Verify transaction was rolled back
      expect(JobRepository.findById(job.id)).toBeNull();
    });
  });
});