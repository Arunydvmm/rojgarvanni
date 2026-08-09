// Jest setup file for database integration tests
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = './test-rozgarvaani.db';

// Mock console methods to reduce test noise (optional)
if (process.env.JEST_SILENT) {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test timeout
jest.setTimeout(30000);