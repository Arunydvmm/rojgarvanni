/**
 * Database Connection Service for RozgarVaani
 * 
 * Provides:
 * - Singleton PostgreSQL pool connection
 * - Health check functionality
 * - Graceful shutdown handling
 * - Database availability flag for route guards
 */

import { Pool, PoolClient } from 'pg';
import { INIT_STATEMENTS, getSchemaVersion } from './schema.js';

let pool: Pool | null = null;
let _isDatabaseAvailable = false;

/**
 * Check if database is available and ready
 */
export function isDatabaseAvailable(): boolean {
  return _isDatabaseAvailable;
}

/**
 * Get database pool instance
 * @throws Error if database is not initialized
 */
export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Initialize database connection pool and create tables
 */
export async function initializeDatabase(databaseUrl?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const connectionString =
      databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost/rozgarvaani';

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    console.log('[DB] Connecting to PostgreSQL database...');

    // Create connection pool
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('[DB] ✓ PostgreSQL connection established');
    client.release();

    // Run schema initialization
    console.log('[DB] Initializing schema...');
    for (const statement of INIT_STATEMENTS) {
      await pool.query(statement);
    }

    // Verify schema by counting tables
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableCount = parseInt(result.rows[0].count, 10);

    console.log(`[DB] Schema initialized. Tables created: ${tableCount}`);

    if (tableCount < 10) {
      throw new Error(
        `Schema initialization incomplete. Expected 10 tables, found ${tableCount}`
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
export async function checkDatabaseHealth(): Promise<{
  available: boolean;
  responsive: boolean;
  error?: string;
  tableCount?: number;
  schemaVersion?: number;
}> {
  if (!_isDatabaseAvailable || !pool) {
    return {
      available: false,
      responsive: false,
      error: 'Database not initialized',
    };
  }

  try {
    // Simple query to test responsiveness
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableCount = parseInt(result.rows[0].count, 10);

    return {
      available: true,
      responsive: true,
      tableCount,
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
 * Close database connection pool gracefully
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    try {
      console.log('[DB] Closing database pool...');
      await pool.end();
      pool = null;
      _isDatabaseAvailable = false;
      console.log('[DB] ✓ Database pool closed');
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
  process.on('SIGTERM', async () => {
    console.log('[DB] SIGTERM received, closing database...');
    await closeDatabase();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[DB] SIGINT received, closing database...');
    await closeDatabase();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('[DB] Uncaught exception:', error);
    await closeDatabase();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('[DB] Unhandled rejection at:', promise, 'reason:', reason);
    await closeDatabase();
    process.exit(1);
  });
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function runTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const database = getDatabase();
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  available: boolean;
  dbSize?: string;
  tableCount?: number;
}> {
  if (!_isDatabaseAvailable || !pool) {
    return { available: false };
  }

  try {
    const sizeResult = await pool.query(
      `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
    );
    const dbSize = sizeResult.rows[0].size;

    const tableResult = await pool.query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableCount = parseInt(tableResult.rows[0].count, 10);

    return {
      available: true,
      dbSize,
      tableCount,
    };
  } catch (error) {
    return {
      available: false,
    };
  }
}
