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
  static create(answerKey: AnswerKey): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO answer_keys (
        id, slug, title, organization, category, exam_name, 
        release_date, objection_deadline, status, download_url, 
        objection_link, official_website_url, overview, is_draft, 
        verification_status, published_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
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
        answerKey.isDraft ? 1 : 0,
        answerKey.verificationStatus,
        answerKey.publishedAt,
        answerKey.createdAt
      );
    } catch (error) {
      console.error('[AnswerKeyRepository] Create failed:', error);
      throw error;
    }
  }

  /**
   * Find answer key by ID
   */
  static findById(id: string): AnswerKey | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM answer_keys WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return AnswerKeyRepository.mapRow(row);
  }

  /**
   * Find answer key by slug
   */
  static findBySlug(slug: string): AnswerKey | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM answer_keys WHERE slug = ?');
    const row = stmt.get(slug) as any;
    
    if (!row) return null;
    
    return AnswerKeyRepository.mapRow(row);
  }

  /**
   * Find all answer keys with optional filtering
   */
  static findAll(options: {
    isDraft?: boolean;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): AnswerKey[] {
    const db = getDatabase();
    
    let query = 'SELECT * FROM answer_keys WHERE 1=1';
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
    
    return rows.map(row => AnswerKeyRepository.mapRow(row));
  }

  /**
   * Update answer key
   */
  static update(id: string, updates: Partial<AnswerKey>): AnswerKey {
    const db = getDatabase();
    const existing = AnswerKeyRepository.findById(id);
    
    if (!existing) {
      throw new Error(`Answer key ${id} not found`);
    }

    const updated: AnswerKey = { ...existing, ...updates };

    const stmt = db.prepare(`
      UPDATE answer_keys SET
        slug = ?, title = ?, organization = ?, category = ?, exam_name = ?,
        release_date = ?, objection_deadline = ?, status = ?, download_url = ?,
        objection_link = ?, official_website_url = ?, overview = ?,
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
        updated.releaseDate,
        updated.objectionDeadline,
        updated.status,
        updated.downloadUrl,
        updated.objectionLink || null,
        updated.officialWebsiteUrl,
        updated.overview,
        updated.isDraft ? 1 : 0,
        updated.verificationStatus,
        updated.publishedAt,
        id
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
  static delete(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM answer_keys WHERE id = ?');
    
    try {
      stmt.run(id);
    } catch (error) {
      console.error('[AnswerKeyRepository] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Count answer keys
   */
  static count(filters: { isDraft?: boolean; status?: string } = {}): number {
    const db = getDatabase();
    
    let query = 'SELECT COUNT(*) as count FROM answer_keys WHERE 1=1';
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
      isDraft: row.is_draft === 1,
      verificationStatus: row.verification_status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    };
  }
}
