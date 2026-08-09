/**
 * Answer Key Repository
 * 
 * Manages CRUD operations for government exam answer keys.
 */

import { getDatabase } from '../database.js';
import type { AnswerKey } from '../../types.js';

export class AnswerKeyRepository {
  /**
   * Create a new answer key record
   */
  static async create(answerKey: AnswerKey): Promise<void> {
    const db = getDatabase();

    try {
      await db.query(
        `INSERT INTO answer_keys (
          id, slug, title, organization, category, exam_name, 
          release_date, objection_deadline, status, download_url, 
          objection_link, official_website_url, overview, is_draft, 
          verification_status, published_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          answerKey.id,
          answerKey.slug,
          answerKey.title,
          answerKey.organization,
          answerKey.category,
          answerKey.examName,
          answerKey.releaseDate,
          answerKey.objectionDeadline,
          answerKey.status,
          answerKey.downloadUrl,
          answerKey.objectionLink || null,
          answerKey.officialWebsiteUrl,
          answerKey.overview,
          answerKey.isDraft,
          answerKey.verificationStatus,
          answerKey.publishedAt,
          answerKey.createdAt,
        ]
      );
    } catch (error) {
      console.error('[AnswerKeyRepository] Create failed:', error);
      throw error;
    }
  }

  /**
   * Find answer key by ID
   */
  static async findById(id: string): Promise<AnswerKey | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM answer_keys WHERE id = $1', [id]);

    if (!result.rows[0]) return null;

    return AnswerKeyRepository.mapRow(result.rows[0]);
  }

  /**
   * Find answer key by slug
   */
  static async findBySlug(slug: string): Promise<AnswerKey | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM answer_keys WHERE slug = $1', [slug]);

    if (!result.rows[0]) return null;

    return AnswerKeyRepository.mapRow(result.rows[0]);
  }

  /**
   * Find all answer keys with optional filtering
   */
  static async findAll(options: {
    isDraft?: boolean;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AnswerKey[]> {
    const db = getDatabase();

    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM answer_keys WHERE 1=1';

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

    return result.rows.map((row) => AnswerKeyRepository.mapRow(row));
  }

  /**
   * Update answer key
   */
  static async update(id: string, updates: Partial<AnswerKey>): Promise<AnswerKey> {
    const db = getDatabase();
    const existing = await AnswerKeyRepository.findById(id);

    if (!existing) {
      throw new Error(`Answer key ${id} not found`);
    }

    const updated: AnswerKey = { ...existing, ...updates };

    try {
      await db.query(
        `UPDATE answer_keys SET
          slug = $1, title = $2, organization = $3, category = $4, exam_name = $5,
          release_date = $6, objection_deadline = $7, status = $8, download_url = $9,
          objection_link = $10, official_website_url = $11, overview = $12,
          is_draft = $13, verification_status = $14, published_at = $15
        WHERE id = $16`,
        [
          updated.slug,
          updated.title,
          updated.organization,
          updated.category,
          updated.examName,
          updated.releaseDate,
          updated.objectionDeadline,
          updated.status,
          updated.downloadUrl,
          updated.objectionLink || null,
          updated.officialWebsiteUrl,
          updated.overview,
          updated.isDraft,
          updated.verificationStatus,
          updated.publishedAt,
          id,
        ]
      );
    } catch (error) {
      console.error('[AnswerKeyRepository] Update failed:', error);
      throw error;
    }

    return updated;
  }

  /**
   * Delete answer key
   */
  static async delete(id: string): Promise<void> {
    const db = getDatabase();

    try {
      await db.query('DELETE FROM answer_keys WHERE id = $1', [id]);
    } catch (error) {
      console.error('[AnswerKeyRepository] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Count answer keys
   */
  static async count(filters: { isDraft?: boolean; status?: string } = {}): Promise<number> {
    const db = getDatabase();

    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT COUNT(*) as count FROM answer_keys WHERE 1=1';

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
   * Map database row to AnswerKey object
   */
  private static mapRow(row: any): AnswerKey {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      organization: row.organization,
      category: row.category,
      examName: row.exam_name,
      releaseDate: row.release_date,
      objectionDeadline: row.objection_deadline,
      status: row.status,
      downloadUrl: row.download_url,
      objectionLink: row.objection_link,
      officialWebsiteUrl: row.official_website_url,
      overview: row.overview,
      isDraft: row.is_draft,
      verificationStatus: row.verification_status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    };
  }
}
