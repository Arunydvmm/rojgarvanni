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
  static async create(admitCard: AdmitCard): Promise<void> {
    const db = getDatabase();

    try {
      await db.query(
        `INSERT INTO admit_cards (
          id, slug, title, organization, category, exam_name, 
          exam_date, admit_card_release_date, status, download_url, 
          official_website_url, instructions, overview, is_draft, 
          verification_status, published_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
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
          admitCard.isDraft,
          admitCard.verificationStatus,
          admitCard.publishedAt,
          admitCard.createdAt,
        ]
      );
    } catch (error) {
      console.error('[AdmitCardRepository] Create failed:', error);
      throw error;
    }
  }

  /**
   * Find admit card by ID
   */
  static async findById(id: string): Promise<AdmitCard | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM admit_cards WHERE id = $1', [id]);

    if (!result.rows[0]) return null;

    return AdmitCardRepository.mapRow(result.rows[0]);
  }

  /**
   * Find admit card by slug
   */
  static async findBySlug(slug: string): Promise<AdmitCard | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM admit_cards WHERE slug = $1', [slug]);

    if (!result.rows[0]) return null;

    return AdmitCardRepository.mapRow(result.rows[0]);
  }

  /**
   * Find all admit cards with optional filtering
   */
  static async findAll(options: {
    isDraft?: boolean;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AdmitCard[]> {
    const db = getDatabase();

    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM admit_cards WHERE 1=1';

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

    return result.rows.map((row) => AdmitCardRepository.mapRow(row));
  }

  /**
   * Update admit card
   */
  static async update(id: string, updates: Partial<AdmitCard>): Promise<AdmitCard> {
    const db = getDatabase();
    const existing = await AdmitCardRepository.findById(id);

    if (!existing) {
      throw new Error(`Admit card ${id} not found`);
    }

    const updated: AdmitCard = { ...existing, ...updates };

    try {
      await db.query(
        `UPDATE admit_cards SET
          slug = $1, title = $2, organization = $3, category = $4, exam_name = $5,
          exam_date = $6, admit_card_release_date = $7, status = $8, download_url = $9,
          official_website_url = $10, instructions = $11, overview = $12,
          is_draft = $13, verification_status = $14, published_at = $15
        WHERE id = $16`,
        [
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
          updated.isDraft,
          updated.verificationStatus,
          updated.publishedAt,
          id,
        ]
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
  static async delete(id: string): Promise<void> {
    const db = getDatabase();

    try {
      await db.query('DELETE FROM admit_cards WHERE id = $1', [id]);
    } catch (error) {
      console.error('[AdmitCardRepository] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Count admit cards
   */
  static async count(filters: { isDraft?: boolean; status?: string } = {}): Promise<number> {
    const db = getDatabase();

    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT COUNT(*) as count FROM admit_cards WHERE 1=1';

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
      instructions: row.instructions,
      overview: row.overview,
      isDraft: row.is_draft,
      verificationStatus: row.verification_status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
    };
  }
}
