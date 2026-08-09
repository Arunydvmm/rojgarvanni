/**
 * Source Repository - CRUD operations for data source registry
 */

import { getDatabase } from '../database.js';
import type { SourceRegistry } from '../../types.js';

export class SourceRepository {
  /**
   * Create a new source
   */
  static create(source: SourceRegistry): SourceRegistry {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO sources (
        id, name, type, url, status, crawl_frequency, last_scan,
        last_successful_scan, last_error, permission_notes, parser_type, jobs_extracted_count
      ) VALUES (
        @id, @name, @type, @url, @status, @crawl_frequency, @last_scan,
        @last_successful_scan, @last_error, @permission_notes, @parser_type, @jobs_extracted_count
      )
    `);

    stmt.run({
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      status: source.status,
      crawl_frequency: source.crawlFrequency,
      last_scan: source.lastScan,
      last_successful_scan: source.lastSuccessfulScan,
      last_error: source.lastError || null,
      permission_notes: source.permissionNotes,
      parser_type: source.parserType,
      jobs_extracted_count: source.jobsExtractedCount,
    });

    return source;
  }

  /**
   * Find source by ID
   */
  static findById(id: string): SourceRegistry | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM sources WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToSource(row) : null;
  }

  /**
   * Find source by name (unique)
   */
  static findByName(name: string): SourceRegistry | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM sources WHERE name = ?');
    const row = stmt.get(name) as any;
    return row ? this.mapRowToSource(row) : null;
  }

  /**
   * Get all sources with optional filters
   */
  static findAll(filters?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): SourceRegistry[] {
    const db = getDatabase();
    let query = 'SELECT * FROM sources WHERE 1=1';
    const params: any = {};

    if (filters?.type) {
      query += ' AND type = @type';
      params.type = filters.type;
    }

    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }

    query += ' ORDER BY name ASC';

    if (filters?.limit) {
      query += ' LIMIT @limit';
      params.limit = filters.limit;
    }

    if (filters?.offset) {
      query += ' OFFSET @offset';
      params.offset = filters.offset;
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(params) as any[];
    return rows.map((row) => this.mapRowToSource(row));
  }

  /**
   * Get active sources ready for scanning
   */
  static getActiveSources(): SourceRegistry[] {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM sources WHERE status = 'ACTIVE' ORDER BY last_scan ASC");
    const rows = stmt.all() as any[];
    return rows.map((row) => this.mapRowToSource(row));
  }

  /**
   * Update source
   */
  static update(id: string, updates: Partial<SourceRegistry>): SourceRegistry | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };

    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE sources SET
        name = @name,
        type = @type,
        url = @url,
        status = @status,
        crawl_frequency = @crawl_frequency,
        last_scan = @last_scan,
        last_successful_scan = @last_successful_scan,
        last_error = @last_error,
        permission_notes = @permission_notes,
        parser_type = @parser_type,
        jobs_extracted_count = @jobs_extracted_count
      WHERE id = @id
    `);

    stmt.run({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      url: updated.url,
      status: updated.status,
      crawl_frequency: updated.crawlFrequency,
      last_scan: updated.lastScan,
      last_successful_scan: updated.lastSuccessfulScan,
      last_error: updated.lastError || null,
      permission_notes: updated.permissionNotes,
      parser_type: updated.parserType,
      jobs_extracted_count: updated.jobsExtractedCount,
    });

    return updated;
  }

  /**
   * Update scan timestamp
   */
  static updateScanTimestamp(id: string, success: boolean, error?: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    if (success) {
      const stmt = db.prepare(`
        UPDATE sources 
        SET last_scan = ?, last_successful_scan = ?, last_error = NULL, status = 'ACTIVE'
        WHERE id = ?
      `);
      stmt.run(now, now, id);
    } else {
      const stmt = db.prepare(`
        UPDATE sources 
        SET last_scan = ?, last_error = ?, status = 'ERROR'
        WHERE id = ?
      `);
      stmt.run(now, error || 'Unknown error', id);
    }
  }

  /**
   * Increment jobs extracted count
   */
  static incrementJobsExtracted(id: string, count: number): void {
    const db = getDatabase();
    const stmt = db.prepare(
      'UPDATE sources SET jobs_extracted_count = jobs_extracted_count + ? WHERE id = ?'
    );
    stmt.run(count, id);
  }

  /**
   * Delete source by ID
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM sources WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count sources
   */
  static count(filters?: { status?: string }): number {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM sources WHERE 1=1';
    const params: any = {};

    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }

    const stmt = db.prepare(query);
    const result = stmt.get(params) as { count: number };
    return result.count;
  }

  /**
   * Get sources summary
   */
  static getSummary(): {
    totalSources: number;
    activeSources: number;
    errorSources: number;
    totalJobsExtracted: number;
  } {
    const db = getDatabase();

    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM sources');
    const totalResult = totalStmt.get() as { count: number };

    const activeStmt = db.prepare("SELECT COUNT(*) as count FROM sources WHERE status = 'ACTIVE'");
    const activeResult = activeStmt.get() as { count: number };

    const errorStmt = db.prepare("SELECT COUNT(*) as count FROM sources WHERE status = 'ERROR'");
    const errorResult = errorStmt.get() as { count: number };

    const jobsStmt = db.prepare('SELECT SUM(jobs_extracted_count) as total FROM sources');
    const jobsResult = jobsStmt.get() as { total: number };

    return {
      totalSources: totalResult.count,
      activeSources: activeResult.count,
      errorSources: errorResult.count,
      totalJobsExtracted: jobsResult.total || 0,
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
