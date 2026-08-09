/**
 * Exam Result Repository
 * 
 * Manages CRUD operations for government exam results.
 */

import { getDatabase } from '../database.js';
import type { ExamResult } from '../../types.js';

export class ExamResultRepository {
  /**
   * Create a new exam result record
   */
  static create(result: ExamResult): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO results (
        id, slug, title, organization, category, exam_name, 
        result_date, status, download_url, official_website_url, 
        notification_url, cut_off_info, overview, is_draft, 
        verification_status, published_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        result.id,
        result.slug,
        result.title,
        result.organization,
        result.category,
        result.examName,
        result.resultDate,
        result.status,
        result.downloadUrl,
        result.officialWebsiteUrl,
        result.notificationUrl || null,
        result.cutOffInfo || null,
        result.overview,
        result.isDraft ? 1 : 0,
        result.verificationStatus,
        result.publishedAt,
        result.createdAt
      );
    } catch (error) {
      console.error('[ExamResultRepository] Create failed:', error);
      throw error;
    }
  }

  /**
   * Find exam result by ID
   */
  static findById(id: string): ExamResult | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM results WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return ExamResultRepository.mapRow(row);
  }

  /**
   * Find exam result by slug
   */
  static findBySlug(slug: string): ExamResult | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM results WHERE slug = ?');
    const row = stmt.get(slug) as any;
    
    if (!row) return null;
    
    return ExamResultRepository.mapRow(row);
  }

  /**
   * Find all exam results with optional filtering
   */
  static findAll(options: {
    isDraft?: boolean;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): ExamResult[] {
    const db = getDatabase();
    
    let query = 'SELECT * FROM results WHERE 1=1';
    const params: any[] = [];

    if (options.isDraft !== undefined) {
      query += ' AND is_draft = ?';
      params.push(options.isDraft ? 1 : 0);
    }

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ExamResultRepository.mapRow(row));
  }

  /**
   * Update exam result
   */
  static update(id: string, updates: Partial<ExamResult>): ExamResult {
    const db = getDatabase();
    const existing = ExamResultRepository.findById(id);
    
    if (!existing) {
      throw new Error(`Exam result ${id} not found`);
    }

    const updated: ExamResult = { ...existing, ...updates };

    const stmt = db.prepare(`
      UPDATE results SET
        slug = ?, title = ?, organization = ?, category = ?, exam_name = ?,
        result_date = ?, status = ?, download_url = ?, official_website_url = ?,
        notification_url = ?, cut_off_info = ?, overview = ?,
        is_draft = ?, verification_status = ?, published_at = ?
      WHERE id = ?
    `);

    try {
      stmt.run(
        updated.slug,
        updated.title,
        updated.organization,
        updated.category,
        updated.examName,
        updated.resultDate,
        updated.status,
        updated.downloadUrl,
        updated.officialWebsiteUrl,
        updated.notificationUrl || null,
        updated.cutOffInfo || null,
        updated.overview,
        updated.isDraft ? 1 : 0,
        updated.verificationStatus,
        updated.publishedAt,
        id
      );
    } catch (error) {
      console.error('[ExamResultRepository] Update failed:', error);
      throw error;
    }

    return updated;
  }

  /**
   * Delete exam result
   */
  static delete(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM results WHERE id = ?');
    
    try {
      stmt.run(id);
    } catch (error) {
      console.error('[ExamResultRepository] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Count exam results
   */
  static count(filters: { isDraft?: boolean; status?: string } = {}): number {
    const db = getDatabase();
    
    let query = 'SELECT COUNT(*) as count FROM results WHERE 1=1';
    const params: any[] = [];

    if (filters.isDraft !== undefined) {
      query += ' AND is_draft = ?';
      params.push(filters.isDraft ? 1 : 0);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    const stmt = db.prepare(query);
    const result = stmt.get(...params) as any;
    
    return result?.count ?? 0;
  }

  /**
   * Map database row to ExamResult object
   */
  private static mapRow(row: any): ExamResult {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      organization: row.organization,
      category: row.category,
      examName: row.exam_name,
      resultDate: row.result_date,
      status: row.status,
      downloadUrl: row.download_url,
      officialWebsiteUrl: row.official_website_url,
      notificationUrl: row.notification_url,
      cutOffInfo: row.cut_off_info,
      overview: row.overview,
      isDraft: row.is_draft === 1,
      verificationStatus: row.verification_status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    };
  }
}
