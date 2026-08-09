/**
 * Source Repository - CRUD operations for data source registry
 */

import { getDatabase } from '../database.js';
import type { SourceRegistry } from '../../types.js';

export class SourceRepository {
  /**
   * Create a new source
   */
  static async create(source: SourceRegistry): Promise<SourceRegistry> {
    const db = getDatabase();
    await db.query(
      `INSERT INTO sources (
        id, name, type, url, status, crawl_frequency, last_scan,
        last_successful_scan, last_error, permission_notes, parser_type, jobs_extracted_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12
      )`,
      [
        source.id,
        source.name,
        source.type,
        source.url,
        source.status,
        source.crawlFrequency,
        source.lastScan,
        source.lastSuccessfulScan,
        source.lastError || null,
        source.permissionNotes,
        source.parserType,
        source.jobsExtractedCount,
      ]
    );

    return source;
  }

  /**
   * Find source by ID
   */
  static async findById(id: string): Promise<SourceRegistry | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM sources WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? this.mapRowToSource(row) : null;
  }

  /**
   * Find source by name (unique)
   */
  static async findByName(name: string): Promise<SourceRegistry | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM sources WHERE name = $1', [name]);
    const row = result.rows[0];
    return row ? this.mapRowToSource(row) : null;
  }

  /**
   * Get all sources with optional filters
   */
  static async findAll(filters?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SourceRegistry[]> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM sources WHERE 1=1';

    if (filters?.type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    query += ' ORDER BY name ASC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await db.query(query, params);
    return result.rows.map((row) => this.mapRowToSource(row));
  }

  /**
   * Get active sources ready for scanning
   */
  static async getActiveSources(): Promise<SourceRegistry[]> {
    const db = getDatabase();
    const result = await db.query(
      "SELECT * FROM sources WHERE status = 'ACTIVE' ORDER BY last_scan ASC"
    );
    return result.rows.map((row) => this.mapRowToSource(row));
  }

  /**
   * Update source
   */
  static async update(id: string, updates: Partial<SourceRegistry>): Promise<SourceRegistry | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };

    const db = getDatabase();
    await db.query(
      `UPDATE sources SET
        name = $1,
        type = $2,
        url = $3,
        status = $4,
        crawl_frequency = $5,
        last_scan = $6,
        last_successful_scan = $7,
        last_error = $8,
        permission_notes = $9,
        parser_type = $10,
        jobs_extracted_count = $11
      WHERE id = $12`,
      [
        updated.name,
        updated.type,
        updated.url,
        updated.status,
        updated.crawlFrequency,
        updated.lastScan,
        updated.lastSuccessfulScan,
        updated.lastError || null,
        updated.permissionNotes,
        updated.parserType,
        updated.jobsExtractedCount,
        updated.id,
      ]
    );

    return updated;
  }

  /**
   * Update scan timestamp
   */
  static async updateScanTimestamp(id: string, success: boolean, error?: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    if (success) {
      await db.query(
        `UPDATE sources 
        SET last_scan = $1, last_successful_scan = $2, last_error = NULL, status = 'ACTIVE'
        WHERE id = $3`,
        [now, now, id]
      );
    } else {
      await db.query(
        `UPDATE sources 
        SET last_scan = $1, last_error = $2, status = 'ERROR'
        WHERE id = $3`,
        [now, error || 'Unknown error', id]
      );
    }
  }

  /**
   * Increment jobs extracted count
   */
  static async incrementJobsExtracted(id: string, count: number): Promise<void> {
    const db = getDatabase();
    await db.query(
      'UPDATE sources SET jobs_extracted_count = jobs_extracted_count + $1 WHERE id = $2',
      [count, id]
    );
  }

  /**
   * Delete source by ID
   */
  static async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.query('DELETE FROM sources WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  /**
   * Count sources
   */
  static async count(filters?: { status?: string }): Promise<number> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT COUNT(*) as count FROM sources WHERE 1=1';

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get sources summary
   */
  static async getSummary(): Promise<{
    totalSources: number;
    activeSources: number;
    errorSources: number;
    totalJobsExtracted: number;
  }> {
    const db = getDatabase();

    const totalResult = await db.query('SELECT COUNT(*) as count FROM sources');
    const totalSources = parseInt(totalResult.rows[0].count, 10);

    const activeResult = await db.query(
      "SELECT COUNT(*) as count FROM sources WHERE status = 'ACTIVE'"
    );
    const activeSources = parseInt(activeResult.rows[0].count, 10);

    const errorResult = await db.query(
      "SELECT COUNT(*) as count FROM sources WHERE status = 'ERROR'"
    );
    const errorSources = parseInt(errorResult.rows[0].count, 10);

    const jobsResult = await db.query('SELECT SUM(jobs_extracted_count) as total FROM sources');
    const totalJobsExtracted = parseInt(jobsResult.rows[0].total || 0, 10);

    return {
      totalSources,
      activeSources,
      errorSources,
      totalJobsExtracted,
    };
  }

  /**
   * Map database row to SourceRegistry type
   */
  private static mapRowToSource(row: any): SourceRegistry {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      status: row.status,
      crawlFrequency: row.crawl_frequency,
      lastScan: row.last_scan,
      lastSuccessfulScan: row.last_successful_scan,
      lastError: row.last_error,
      permissionNotes: row.permission_notes,
      parserType: row.parser_type,
      jobsExtractedCount: row.jobs_extracted_count,
    };
  }
}
