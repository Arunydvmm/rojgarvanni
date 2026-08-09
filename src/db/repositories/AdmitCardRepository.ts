/**
 * Admit Card Repository
 * 
 * Manages CRUD operations for government exam admit cards.
 */

import { getDatabase } from '../database.js';
import type { AdmitCard } from '../../types.js';

export class AdmitCardRepository {
  /**
   * Create a new admit card record
   */
  static create(admitCard: AdmitCard): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO admit_cards (
        id, slug, title, organization, category, exam_name, 
        exam_date, admit_card_release_date, status, download_url, 
        official_website_url, instructions, overview, is_draft, 
        verification_status, published_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        admitCard.id,
        admitCard.slug,
        admitCard.title,
        admitCard.organization,
        admitCard.category,
        admitCard.examName,
        admitCard.examDate,
        admitCard.admitCardReleaseDate,
        admitCard.status,
        admitCard.downloadUrl,
        admitCard.officialWebsiteUrl,
        JSON.stringify(admitCard.instructions || []),
        admitCard.overview,
        admitCard.isDraft ? 1 : 0,
        admitCard.verificationStatus,
        admitCard.publishedAt,
        admitCard.createdAt
      );
    } catch (error) {
      console.error('[AdmitCardRepository] Create failed:', error);
      throw error;
    }
  }

  /**
   * Find admit card by ID
   */
  static findById(id: string): AdmitCard | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM admit_cards WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return AdmitCardRepository.mapRow(row);
  }

  /**
   * Find admit card by slug
   */
  static findBySlug(slug: string): AdmitCard | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM admit_cards WHERE slug = ?');
    const row = stmt.get(slug) as any;
    
    if (!row) return null;
    
    return AdmitCardRepository.mapRow(row);
  }

  /**
   * Find all admit cards with optional filtering
   */
  static findAll(options: {
    isDraft?: boolean;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): AdmitCard[] {
    const db = getDatabase();
    
    let query = 'SELECT * FROM admit_cards WHERE 1=1';
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
    
    return rows.map(row => AdmitCardRepository.mapRow(row));
  }

  /**
   * Update admit card
   */
  static update(id: string, updates: Partial<AdmitCard>): AdmitCard {
    const db = getDatabase();
    const existing = AdmitCardRepository.findById(id);
    
    if (!existing) {
      throw new Error(`Admit card ${id} not found`);
    }

    const updated: AdmitCard = { ...existing, ...updates };

    const stmt = db.prepare(`
      UPDATE admit_cards SET
        slug = ?, title = ?, organization = ?, category = ?, exam_name = ?,
        exam_date = ?, admit_card_release_date = ?, status = ?, download_url = ?,
        official_website_url = ?, instructions = ?, overview = ?,
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
        updated.examDate,
        updated.admitCardReleaseDate,
        updated.status,
        updated.downloadUrl,
        updated.officialWebsiteUrl,
        JSON.stringify(updated.instructions || []),
        updated.overview,
        updated.isDraft ? 1 : 0,
        updated.verificationStatus,
        updated.publishedAt,
        id
      );
    } catch (error) {
      console.error('[AdmitCardRepository] Update failed:', error);
      throw error;
    }

    return updated;
  }

  /**
   * Delete admit card
   */
  static delete(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM admit_cards WHERE id = ?');
    
    try {
      stmt.run(id);
    } catch (error) {
      console.error('[AdmitCardRepository] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Count admit cards
   */
  static count(filters: { isDraft?: boolean; status?: string } = {}): number {
    const db = getDatabase();
    
    let query = 'SELECT COUNT(*) as count FROM admit_cards WHERE 1=1';
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
   * Map database row to AdmitCard object
   */
  private static mapRow(row: any): AdmitCard {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      organization: row.organization,
      category: row.category,
      examName: row.exam_name,
      examDate: row.exam_date,
      admitCardReleaseDate: row.admit_card_release_date,
      status: row.status,
      downloadUrl: row.download_url,
      officialWebsiteUrl: row.official_website_url,
      instructions: row.instructions ? JSON.parse(row.instructions) : [],
      overview: row.overview,
      isDraft: row.is_draft === 1,
      verificationStatus: row.verification_status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    };
  }
}
