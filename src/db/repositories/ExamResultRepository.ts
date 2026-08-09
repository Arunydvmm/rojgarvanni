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
  static async create(result: ExamResult): Promise<void> {
    const db = getDatabase();

    try {
      await db.query(
        `INSERT INTO results (
          id, slug, title, organization, category, exam_name, 
          result_date, status, download_url, official_website_url, 
          notification_url, cut_off_info, overview, is_draft, 
          verification_status, published_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
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
          result.isDraft,
          result.verificationStatus,
          result.publishedAt,
          result.createdAt,
        ]
      );
    } catch (error) {
      console.error('[ExamResultRepository] Create failed:', error);
      throw error;
    }
  }

  /**
   * Find exam result by ID
   */
  static async findById(id: string): Promise<ExamResult | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM results WHERE id = $1', [id]);

    if (!result.rows[0]) return null;

    return ExamResultRepository.mapRow(result.rows[0]);
  }

  /**
   * Find exam result by slug
   */
  static async findBySlug(slug: string): Promise<ExamResult | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM results WHERE slug = $1', [slug]);

    if (!result.rows[0]) return null;

    return ExamResultRepository.mapRow(result.rows[0]);
  }

  /**
   * Find all exam results with optional filtering
   */
  static async findAll(options: {
    isDraft?: boolean;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ExamResult[]> {
    const db = getDatabase();

    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM results WHERE 1=1';

    if (options.isDraft !== undefined) {
      query += ` AND is_draft = $${paramIndex++}`;
      params.push(options.isDraft);
    }

    if (options.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(options.status);
    }

    if (options.category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(options.category);
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
      if (options.offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(options.offset);
      }
    }

    const result = await db.query(query, params);

    return result.rows.map((row) => ExamResultRepository.mapRow(row));
  }

  /**
   * Update exam result
   */
  static async update(id: string, updates: Partial<ExamResult>): Promise<ExamResult> {
    const db = getDatabase();
    const existing = await ExamResultRepository.findById(id);

    if (!existing) {
      throw new Error(`Exam result ${id} not found`);
    }

    const updated: ExamResult = { ...existing, ...updates };

    try {
      await db.query(
        `UPDATE results SET
          slug = $1, title = $2, organization = $3, category = $4, exam_name = $5,
          result_date = $6, status = $7, download_url = $8, official_website_url = $9,
          notification_url = $10, cut_off_info = $11, overview = $12,
          is_draft = $13, verification_status = $14, published_at = $15
        WHERE id = $16`,
        [
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
          updated.isDraft,
          updated.verificationStatus,
          updated.publishedAt,
          id,
        ]
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
  static async delete(id: string): Promise<void> {
    const db = getDatabase();

    try {
      await db.query('DELETE FROM results WHERE id = $1', [id]);
    } catch (error) {
      console.error('[ExamResultRepository] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Count exam results
   */
  static async count(filters: { isDraft?: boolean; status?: string } = {}): Promise<number> {
    const db = getDatabase();

    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT COUNT(*) as count FROM results WHERE 1=1';

    if (filters.isDraft !== undefined) {
      query += ` AND is_draft = $${paramIndex++}`;
      params.push(filters.isDraft);
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    const result = await db.query(query, params);

    return parseInt(result.rows[0]?.count ?? 0, 10);
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
      isDraft: row.is_draft,
      verificationStatus: row.verification_status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    };
  }
}
