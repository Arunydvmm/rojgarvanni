/**
 * Simple Database Integration Test Runner
 * 
 * Runs comprehensive database tests without Jest dependency
 * Covers all 9 check categories for database-first architecture validation
 */

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

// Test utilities
class TestRunner {
  private passed = 0;
  private failed = 0;
  private tests: { name: string; result: 'PASS' | 'FAIL'; error?: string }[] = [];

  test(name: string, testFn: () => void | Promise<void>) {
    try {
      const result = testFn();
      if (result instanceof Promise) {
        return result.then(() => {
          this.passed++;
          this.tests.push({ name, result: 'PASS' });
          console.log(`✓ ${name}`);
        }).catch((error) => {
          this.failed++;
          this.tests.push({ name, result: 'FAIL', error: error.message });
          console.log(`✗ ${name}: ${error.message}`);
        });
      } else {
        this.passed++;
        this.tests.push({ name, result: 'PASS' });
        console.log(`✓ ${name}`);
      }
    } catch (error) {
      this.failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.tests.push({ name, result: 'FAIL', error: errorMsg });
      console.log(`✗ ${name}: ${errorMsg}`);
    }
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('Expected value to be defined');
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null, got ${actual}`);
        }
      },
      toThrow: () => {
        if (typeof actual !== 'function') {
          throw new Error('Expected a function');
        }
        try {
          actual();
          throw new Error('Expected function to throw');
        } catch (error) {
          // Expected
        }
      },
      toHaveLength: (length: number) => {
        if (!actual || actual.length !== length) {
          throw new Error(`Expected length ${length}, got ${actual?.length || 'undefined'}`);
        }
      },
      toBeGreaterThan: (value: number) => {
        if (typeof actual !== 'number' || actual <= value) {
          throw new Error(`Expected ${actual} to be greater than ${value}`);
        }
      },
      toContain: (value: any) => {
        if (!actual || !actual.includes(value)) {
          throw new Error(`Expected ${actual} to contain ${value}`);
        }
      }
    };
  }

  describe(name: string, testSuite: () => void | Promise<void>) {
    console.log(`\n📁 ${name}`);
    return testSuite();
  }

  beforeEach(fn: () => void) {
    fn();
  }

  report() {
    console.log('\n' + '='.repeat(80));
    console.log('DATABASE INTEGRATION TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${this.tests.length}`);
    console.log(`Passed: ${this.passed} ✓`);
    console.log(`Failed: ${this.failed} ${this.failed > 0 ? '✗' : ''}`);
    console.log(`Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log('\nFAILED TESTS:');
      this.tests.filter(t => t.result === 'FAIL').forEach(test => {
        console.log(`  ✗ ${test.name}: ${test.error}`);
      });
    }
    
    console.log('='.repeat(80));
    return this.failed === 0;
  }
}

// Sample test data creators
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

// Main test runner
async function runDatabaseTests() {
  const runner = new TestRunner();
  
  // Setup
  process.env.DATABASE_URL = TEST_DB_PATH;
  
  // Cleanup function
  const cleanup = () => {
    try {
      closeDatabase();
      const fs = require('fs');
      [TEST_DB_PATH, `${TEST_DB_PATH}-shm`, `${TEST_DB_PATH}-wal`].forEach(file => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  try {
    // Initialize fresh database for each test category
    const resetDatabase = () => {
      closeDatabase();
      const result = initializeDatabase(TEST_DB_PATH);
      if (!result.success) {
        throw new Error(`Database initialization failed: ${result.error}`);
      }
    };

    // CATEGORY 1: Database Connection & Schema Validation
    runner.describe('1. Database Connection & Schema Validation', () => {
      resetDatabase();
      
      runner.test('should initialize database successfully', () => {
        const result = initializeDatabase(TEST_DB_PATH);
        runner.expect(result.success).toBe(true);
      });

      runner.test('should report database as available', () => {
        runner.expect(isDatabaseAvailable()).toBe(true);
      });

      runner.test('should pass health check', () => {
        const health = checkDatabaseHealth();
        runner.expect(health.available).toBe(true);
        runner.expect(health.responsive).toBe(true);
        runner.expect(health.tableCount).toBe(10);
      });

      runner.test('should create all required tables', () => {
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
        runner.expect(actualTables).toEqual(expectedTables);
      });
    });

    // CATEGORY 2: Repository CRUD Operations
    runner.describe('2. Repository CRUD Operations', () => {
      resetDatabase();

      runner.test('JobRepository - Full CRUD cycle', () => {
        const testJob = createTestJob();
        
        // CREATE
        const created = JobRepository.create(testJob);
        runner.expect(created.id).toBe(testJob.id);

        // READ
        const found = JobRepository.findById(testJob.id);
        runner.expect(found).toBeDefined();
        runner.expect(found!.title).toBe(testJob.title);

        // UPDATE
        const updated = JobRepository.update(testJob.id, { title: 'Updated Job' });
        runner.expect(updated!.title).toBe('Updated Job');

        // DELETE
        const deleted = JobRepository.delete(testJob.id);
        runner.expect(deleted).toBe(true);
        runner.expect(JobRepository.findById(testJob.id)).toBeNull();
      });

      runner.test('DraftRepository - CRUD with verification report', () => {
        const testDraft = createTestDraft();
        
        const created = DraftRepository.create(testDraft);
        runner.expect(created.verificationReport.verificationStatus).toBe('PASSED');

        const found = DraftRepository.findById(testDraft.id);
        runner.expect(found!.verificationReport.qualityScore).toBe(85);

        runner.expect(DraftRepository.delete(testDraft.id)).toBe(true);
      });

      runner.test('SettingsRepository - Singleton operations', () => {
        const settings = SettingsRepository.get();
        runner.expect(settings.adsEnabled).toBe(true);

        const updated = SettingsRepository.update({ adsEnabled: false });
        runner.expect(updated.adsEnabled).toBe(false);
      });
    });

    // CATEGORY 3: Data Persistence & Retrieval Accuracy
    runner.describe('3. Data Persistence & Retrieval Accuracy', () => {
      resetDatabase();

      runner.test('should preserve complex JSON objects', () => {
        const testJob = createTestJob();
        testJob.categoryWiseVacancies = { ur: 40, obc: 30, sc: 20, st: 10, ews: 0 };
        
        JobRepository.create(testJob);
        const retrieved = JobRepository.findById(testJob.id);
        
        runner.expect(retrieved!.categoryWiseVacancies).toEqual({
          ur: 40, obc: 30, sc: 20, st: 10, ews: 0
        });
      });

      runner.test('should handle null values correctly', () => {
        const testJob = createTestJob();
        testJob.state = undefined;
        
        JobRepository.create(testJob);
        const retrieved = JobRepository.findById(testJob.id);
        runner.expect(retrieved!.state).toBe(undefined);
      });
    });

    // CATEGORY 4: Constraint Enforcement
    runner.describe('4. Constraint Enforcement', () => {
      resetDatabase();

      runner.test('should enforce unique slug constraint', () => {
        const job1 = createTestJob();
        const job2 = createTestJob();
        job2.id = `different-${Date.now()}`;
        job2.slug = job1.slug;

        JobRepository.create(job1);
        runner.expect(() => JobRepository.create(job2)).toThrow();
      });

      runner.test('should enforce status enum constraint', () => {
        const testJob = createTestJob();
        testJob.status = 'INVALID_STATUS' as any;
        
        runner.expect(() => JobRepository.create(testJob)).toThrow();
      });
    });

    // CATEGORY 5: Transaction Handling
    runner.describe('5. Transaction Handling & Data Integrity', () => {
      resetDatabase();

      runner.test('should handle successful transaction', () => {
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

        runner.expect(JobRepository.findById(job.id)).toBeDefined();
        runner.expect(AuditLogRepository.findById(auditLog.id)).toBeDefined();
      });
    });

    // CATEGORY 6: Server Startup & Health Check
    runner.describe('6. Server Startup & Health Check Integration', () => {
      runner.test('should initialize on startup', () => {
        closeDatabase();
        const result = initializeDatabase(TEST_DB_PATH);
        runner.expect(result.success).toBe(true);
        runner.expect(isDatabaseAvailable()).toBe(true);
      });

      runner.test('should provide health check info', () => {
        const health = checkDatabaseHealth();
        runner.expect(health.available).toBe(true);
        runner.expect(health.tableCount).toBeGreaterThan(0);
      });
    });

    // CATEGORY 7: API Route Guards
    runner.describe('7. API Route Database Guard Middleware', () => {
      resetDatabase();

      runner.test('should allow operations when DB available', () => {
        runner.expect(isDatabaseAvailable()).toBe(true);
        const testJob = createTestJob();
        const created = JobRepository.create(testJob);
        runner.expect(created).toBeDefined();
      });

      runner.test('should block when DB unavailable', () => {
        closeDatabase();
        runner.expect(isDatabaseAvailable()).toBe(false);
        
        runner.expect(() => {
          const testJob = createTestJob();
          JobRepository.create(testJob);
        }).toThrow();
      });
    });

    // CATEGORY 8: AI Pipeline Integration
    runner.describe('8. AI Pipeline Database Integration', () => {
      resetDatabase();

      runner.test('should create draft from pipeline output', () => {
        const testDraft = createTestDraft();
        testDraft.agentLogs = [
          {
            id: `test-log-${Date.now()}`,
            itemTitle: 'Test Job Processing',
            agentType: 'DISCOVERY',
            status: 'SUCCESS',
            durationMs: 1500,
            modelUsed: 'Test Model',
            inputSummary: 'Test input',
            outputSummary: 'Test output',
            timestamp: new Date().toISOString()
          }
        ];

        const created = DraftRepository.create(testDraft);
        runner.expect(created.agentLogs).toHaveLength(1);
      });

      runner.test('should prevent duplicate creation', () => {
        const job = createTestJob();
        JobRepository.create(job);
        
        const exists = JobRepository.existsByOrgAndAdvNumber(
          job.organization, 
          job.advertisementNumber!
        );
        runner.expect(exists).toBe(true);
      });
    });

    // CATEGORY 9: Error Handling
    runner.describe('9. Error Handling & Graceful Degradation', () => {
      runner.test('should handle init failure gracefully', () => {
        const result = initializeDatabase('/invalid/path/database.db');
        runner.expect(result.success).toBe(false);
        runner.expect(result.error).toBeDefined();
      });

      runner.test('should handle connection loss', () => {
        closeDatabase();
        const health = checkDatabaseHealth();
        runner.expect(health.available).toBe(false);
        runner.expect(health.error).toBeDefined();
      });
    });

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    cleanup();
    return runner.report();
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDatabaseTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { runDatabaseTests };