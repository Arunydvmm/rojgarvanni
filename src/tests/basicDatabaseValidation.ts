/**
 * Basic Database Validation Script
 * Tests core functionality of the database-first architecture
 */

import 'dotenv/config';
import { 
  initializeDatabase, 
  isDatabaseAvailable, 
  checkDatabaseHealth, 
  closeDatabase,
  getDatabase
} from '../db/database.js';
import {
  JobRepository,
  DraftRepository,
  SettingsRepository
} from '../db/repositories/index.js';
import type { GovtJob } from '../types.js';

console.log('🚀 RozgarVaani Database Integration Validation');
console.log('='.repeat(60));

const TEST_DB_PATH = './validation-test.db';

async function validateDatabase() {
  let testsPassed = 0;
  let testsFailed = 0;
  const results: string[] = [];

  const test = (name: string, condition: boolean, details?: string) => {
    if (condition) {
      testsPassed++;
      results.push(`✓ ${name}`);
      console.log(`✓ ${name}`);
      if (details) console.log(`  ${details}`);
    } else {
      testsFailed++;
      results.push(`✗ ${name}`);
      console.log(`✗ ${name}`);
      if (details) console.log(`  ${details}`);
    }
  };

  try {
    // 1. Database Initialization
    console.log('\n📁 Database Connection & Schema');
    process.env.DATABASE_URL = TEST_DB_PATH;
    
    const initResult = initializeDatabase(TEST_DB_PATH);
    test('Database initialization', initResult.success, initResult.error);
    
    test('Database availability check', isDatabaseAvailable());
    
    const health = checkDatabaseHealth();
    test('Health check responsive', health.available && health.responsive);
    test('Schema validation (10 tables)', health.tableCount === 10, `Found ${health.tableCount} tables`);

    // 2. Basic CRUD Operations
    console.log('\n📁 Repository CRUD Operations');
    
    const testJob: GovtJob = {
      id: `test-${Date.now()}`,
      slug: `test-slug-${Date.now()}`,
      title: 'Test Government Job Validation',
      organization: 'Test Ministry of Database',
      department: 'IT Department',
      advertisementNumber: `VALID-${Date.now()}`,
      category: 'Central Government',
      state: 'All India',
      postNames: ['Software Engineer', 'Data Analyst'],
      totalVacancies: 50,
      qualification: 'Graduation',
      qualificationDetails: 'Bachelor degree in Computer Science or related field',
      ageMin: 21,
      ageMax: 35,
      ageRelaxation: 'As per government rules',
      applicationStart: '2026-02-01',
      applicationEnd: '2026-02-28',
      feePaymentDeadline: '2026-02-28',
      examDate: '2026-04-15',
      applicationFee: { generalObc: '₹750', scSt: '₹375', female: '₹375' },
      salary: { payLevel: 'Level 7', payScale: '₹44,900-₹1,42,400', basicPay: '₹44,900' },
      selectionProcess: ['Online Test', 'Technical Interview', 'HR Interview'],
      howToApply: ['Apply online at official website', 'Upload required documents', 'Pay application fee'],
      overview: 'Recruitment for technical positions in government IT projects',
      status: 'NEW',
      isClosingSoon: false,
      links: {
        applyUrl: 'https://validation.gov.in/apply',
        notificationUrl: 'https://validation.gov.in/notification.pdf',
        officialWebsiteUrl: 'https://validation.gov.in'
      },
      sourceInfo: {
        name: 'Validation Test Source',
        type: 'Test Source',
        lastVerified: '2026-01-15',
        evidenceText: 'Test validation evidence'
      },
      verificationStatus: 'PASSED',
      qualityStatus: 'PASSED',
      isDraft: false,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Test CREATE
    try {
      const createdJob = JobRepository.create(testJob);
      test('Job creation', createdJob.id === testJob.id);
    } catch (error) {
      test('Job creation', false, (error as Error).message);
    }

    // Test READ
    try {
      const foundJob = JobRepository.findById(testJob.id);
      test('Job retrieval by ID', foundJob !== null && foundJob.id === testJob.id);
      
      const foundBySlug = JobRepository.findBySlug(testJob.slug);
      test('Job retrieval by slug', foundBySlug !== null && foundBySlug.slug === testJob.slug);
    } catch (error) {
      test('Job retrieval', false, (error as Error).message);
    }

    // Test UPDATE
    try {
      const updatedJob = JobRepository.update(testJob.id, { 
        title: 'Updated Test Job Title',
        totalVacancies: 75 
      });
      test('Job update', updatedJob !== null && updatedJob.title === 'Updated Test Job Title');
      test('Job update preserves other fields', updatedJob !== null && updatedJob.organization === testJob.organization);
    } catch (error) {
      test('Job update', false, (error as Error).message);
    }

    // Test COUNT
    try {
      const count = JobRepository.count();
      test('Job count', count >= 1, `Found ${count} jobs`);
    } catch (error) {
      test('Job count', false, (error as Error).message);
    }

    // 3. Settings Repository (Singleton)
    console.log('\n📁 Settings Management');
    try {
      const settings = SettingsRepository.get();
      test('Settings retrieval', settings.siteTitle === 'RozgarVaani - India Government Jobs');
      
      const updatedSettings = SettingsRepository.update({ adsEnabled: false });
      test('Settings update', updatedSettings.adsEnabled === false);
      
      const verifyUpdate = SettingsRepository.get();
      test('Settings persistence', verifyUpdate.adsEnabled === false);
    } catch (error) {
      test('Settings operations', false, (error as Error).message);
    }

    // 4. Constraint Testing
    console.log('\n📁 Constraint Enforcement');
    try {
      const duplicateJob = { ...testJob, id: `duplicate-${Date.now()}` }; // Same slug
      JobRepository.create(duplicateJob);
      test('Unique constraint enforcement', false, 'Should have failed due to duplicate slug');
    } catch (error) {
      test('Unique constraint enforcement', true, 'Correctly rejected duplicate slug');
    }

    // 5. Complex Data Types
    console.log('\n📁 Data Persistence');
    try {
      const complexJob = { ...testJob, id: `complex-${Date.now()}`, slug: `complex-${Date.now()}` };
      complexJob.advertisementNumber = `COMPLEX-${Date.now()}`; // Unique advertisement number
      complexJob.categoryWiseVacancies = { ur: 30, obc: 15, sc: 3, st: 2, ews: 0 };
      complexJob.vacancyDetails = [
        { postName: 'Senior Engineer', vacancies: 25, categoryBreakdown: { ur: 15, obc: 6, sc: 2, st: 2, ews: 0 } },
        { postName: 'Junior Engineer', vacancies: 25, categoryBreakdown: { ur: 15, obc: 9, sc: 1, st: 0, ews: 0 } }
      ];

      const created = JobRepository.create(complexJob);
      const retrieved = JobRepository.findById(complexJob.id);
      
      test('Complex JSON persistence', 
        retrieved !== null && 
        JSON.stringify(retrieved.categoryWiseVacancies) === JSON.stringify(complexJob.categoryWiseVacancies)
      );
      test('Array persistence', 
        retrieved !== null && 
        Array.isArray(retrieved.vacancyDetails) && 
        retrieved.vacancyDetails!.length === 2
      );
    } catch (error) {
      test('Complex data persistence', false, (error as Error).message);
    }

    // Clean up test job
    try {
      JobRepository.delete(testJob.id);
      test('Job deletion', JobRepository.findById(testJob.id) === null);
    } catch (error) {
      test('Job deletion', false, (error as Error).message);
    }

  } catch (error) {
    console.error('Validation error:', error);
    testsFailed++;
  } finally {
    // Cleanup
    try {
      closeDatabase();
      const fs = await import('fs');
      [TEST_DB_PATH, `${TEST_DB_PATH}-shm`, `${TEST_DB_PATH}-wal`].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }

  // Final Report
  console.log('\n' + '='.repeat(60));
  console.log('DATABASE VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Tests Passed: ${testsPassed} ✓`);
  console.log(`Tests Failed: ${testsFailed} ${testsFailed > 0 ? '✗' : ''}`);
  console.log(`Success Rate: ${testsPassed + testsFailed > 0 ? ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1) : 0}%`);

  if (testsFailed > 0) {
    console.log('\nFailed tests need attention before production deployment.');
  } else {
    console.log('\n🎉 All database integration tests PASSED!');
    console.log('✅ Database-first architecture is ready for production');
  }

  console.log('='.repeat(60));
  
  return testsFailed === 0;
}

// Run validation
validateDatabase().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});