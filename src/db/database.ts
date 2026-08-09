/**
 * Database Connection Service for RozgarVaani
 * 
 * Provides:
 * - Singleton database connection
 * - Health check functionality
 * - Graceful shutdown handling
 * - Database availability flag for route guards
 */

import Database from 'better-sqlite3';
import { INIT_STATEMENTS, getSchemaVersion } from './schema.js';

let db: Database.Database | null = null;
let _isDatabaseAvailable = false;

/**
 * Check if database is available and ready
 */
export function isDatabaseAvailable(): boolean {
  return _isDatabaseAvailable;
}

/**
 * Get database instance
 * @throws Error if database is not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Initialize database connection and create tables
 */
export function initializeDatabase(databasePath?: string): {
  success: boolean;
  error?: string;
} {
  try {
    const dbPath = databasePath || process.env.DATABASE_URL || './rozgarvaani.db';

    if (!dbPath) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    console.log(`[DB] Connecting to SQLite database at: ${dbPath}`);

    // Create database connection
    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });

    // Enable foreign keys (SQLite has them disabled by default)
    db.pragma('foreign_keys = ON');

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    // Run schema initialization
    console.log('[DB] Initializing schema...');
    for (const statement of INIT_STATEMENTS) {
      db.exec(statement);
    }

    // Verify schema by counting tables
    const tableCount = db
      .prepare(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
      )
      .get() as { count: number };

    console.log(`[DB] Schema initialized. Tables created: ${tableCount.count}`);

    if (tableCount.count < 10) {
      throw new Error(
        `Schema initialization incomplete. Expected 10 tables, found ${tableCount.count}`
      );
    }

    _isDatabaseAvailable = true;

    console.log('[DB] ✓ Database ready');
    return { success: true };
  } catch (error) {
    _isDatabaseAvailable = false;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error';
    console.error('[DB] ✗ Database initialization failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Health check - verifies database is accessible and responsive
 */
export function checkDatabaseHealth(): {
  available: boolean;
  responsive: boolean;
  error?: string;
  tableCount?: number;
  schemaVersion?: number;
} {
  if (!_isDatabaseAvailable || !db) {
    return {
      available: false,
      responsive: false,
      error: 'Database not initialized',
    };
  }

  try {
    // Simple query to test responsiveness
    const result = db
      .prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`)
      .get() as { count: number };

    return {
      available: true,
      responsive: true,
      tableCount: result.count,
      schemaVersion: getSchemaVersion(),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Database query failed';
    return {
      available: true,
      responsive: false,
      error: errorMessage,
    };
  }
}

/**
 * Close database connection gracefully
 */
export function closeDatabase(): void {
  if (db) {
    try {
      console.log('[DB] Closing database connection...');
      db.close();
      db = null;
      _isDatabaseAvailable = false;
      console.log('[DB] ✓ Database connection closed');
    } catch (error) {
      console.error(
        '[DB] Error closing database:',
        error instanceof Error ? error.message : error
      );
    }
  }
}

/**
 * Setup graceful shutdown handlers
 */
export function setupShutdownHandlers(): void {
  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('[DB] SIGTERM received, closing database...');
    closeDatabase();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[DB] SIGINT received, closing database...');
    closeDatabase();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('[DB] Uncaught exception:', error);
    closeDatabase();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[DB] Unhandled rejection at:', promise, 'reason:', reason);
    closeDatabase();
    process.exit(1);
  });
}

/**
 * Execute a transaction with automatic rollback on error
 */
export function runTransaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDatabase();
  const transaction = database.transaction(fn);
  return transaction(database);
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): {
  available: boolean;
  path?: string;
  sizeBytes?: number;
  pageCount?: number;
  pageSize?: number;
} {
  if (!_isDatabaseAvailable || !db) {
    return { available: false };
  }

  try {
    const pageCount = db.pragma('page_count', { simple: true }) as number;
    const pageSize = db.pragma('page_size', { simple: true }) as number;
    const sizeBytes = pageCount * pageSize;

    return {
      available: true,
      path: db.name,
      sizeBytes,
      pageCount,
      pageSize,
    };
  } catch (error) {
    return {
      available: false,
    };
  }
}
