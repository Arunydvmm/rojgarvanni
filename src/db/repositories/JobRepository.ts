/**
 * Job Repository - CRUD operations for published jobs
 */

import { getDatabase } from '../database.js';
import type { GovtJob } from '../../types.js';
import type { QueryResult } from 'pg';

export class JobRepository {
  /**
   * Create a new job
   */
  static async create(job: GovtJob): Promise<GovtJob> {
    const db = getDatabase();
    await db.query(
      `INSERT INTO jobs (
        id, slug, title, organization, department, advertisement_number,
        category, state, post_names, total_vacancies, category_wise_vacancies,
        vacancy_details, qualification, qualification_details, age_min, age_max,
        age_relaxation, application_start, application_end, fee_payment_deadline,
        correction_window, exam_date, admit_card_date, result_date, application_fee,
        salary, selection_process, how_to_apply, overview, status, is_closing_soon,
        links, source_info, verification_status, quality_status, is_draft,
        published_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31,
        $32, $33, $34, $35, $36,
        $37, $38, $39
      )`,
      [
        job.id,
        job.slug,
        job.title,
        job.organization,
        job.department,
        job.advertisementNumber || null,
        job.category,
        job.state || null,
        JSON.stringify(job.postNames),
        job.totalVacancies,
        job.categoryWiseVacancies ? JSON.stringify(job.categoryWiseVacancies) : null,
        job.vacancyDetails ? JSON.stringify(job.vacancyDetails) : null,
        job.qualification,
        job.qualificationDetails,
        job.ageMin,
        job.ageMax,
        job.ageRelaxation,
        job.applicationStart,
        job.applicationEnd,
        job.feePaymentDeadline,
        job.correctionWindow || null,
        job.examDate,
        job.admitCardDate || null,
        job.resultDate || null,
        JSON.stringify(job.applicationFee),
        JSON.stringify(job.salary),
        JSON.stringify(job.selectionProcess),
        JSON.stringify(job.howToApply),
        job.overview,
        job.status,
        job.isClosingSoon,
        JSON.stringify(job.links),
        JSON.stringify(job.sourceInfo),
        job.verificationStatus,
        job.qualityStatus,
        job.isDraft,
        job.publishedAt || null,
        job.createdAt,
        job.updatedAt,
      ]
    );

    return job;
  }

  /**
   * Find job by ID
   */
  static async findById(id: string): Promise<GovtJob | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? this.mapRowToJob(row) : null;
  }

  /**
   * Find job by organization and title (for deduplication)
   */
  static async findByOrgAndTitle(organization: string, title: string): Promise<GovtJob | null> {
    const db = getDatabase();
    const result = await db.query(
      'SELECT * FROM jobs WHERE organization = $1 AND title = $2 LIMIT 1',
      [organization, title]
    );
    const row = result.rows[0];
    return row ? this.mapRowToJob(row) : null;
  }

  /**
   * Find job by slug
   */
  static async findBySlug(slug: string): Promise<GovtJob | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM jobs WHERE slug = $1', [slug]);
    const row = result.rows[0];
    return row ? this.mapRowToJob(row) : null;
  }

  /**
   * Get all jobs with optional filters
   */
  static async findAll(filters?: {
    category?: string;
    status?: string;
    isDraft?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<GovtJob[]> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM jobs WHERE 1=1';

    if (filters?.category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(filters.category);
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.isDraft !== undefined) {
      query += ` AND is_draft = $${paramIndex++}`;
      params.push(filters.isDraft);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await db.query(query, params);
    return result.rows.map((row) => this.mapRowToJob(row));
  }

  /**
   * Update job
   */
  static async update(id: string, updates: Partial<GovtJob>): Promise<GovtJob | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const db = getDatabase();
    await db.query(
      `UPDATE jobs SET
        slug = $1,
        title = $2,
        organization = $3,
        department = $4,
        advertisement_number = $5,
        category = $6,
        state = $7,
        post_names = $8,
        total_vacancies = $9,
        category_wise_vacancies = $10,
        vacancy_details = $11,
        qualification = $12,
        qualification_details = $13,
        age_min = $14,
        age_max = $15,
        age_relaxation = $16,
        application_start = $17,
        application_end = $18,
        fee_payment_deadline = $19,
        correction_window = $20,
        exam_date = $21,
        admit_card_date = $22,
        result_date = $23,
        application_fee = $24,
        salary = $25,
        selection_process = $26,
        how_to_apply = $27,
        overview = $28,
        status = $29,
        is_closing_soon = $30,
        links = $31,
        source_info = $32,
        verification_status = $33,
        quality_status = $34,
        is_draft = $35,
        published_at = $36,
        updated_at = $37
      WHERE id = $38`,
      [
        updated.slug,
        updated.title,
        updated.organization,
        updated.department,
        updated.advertisementNumber || null,
        updated.category,
        updated.state || null,
        JSON.stringify(updated.postNames),
        updated.totalVacancies,
        updated.categoryWiseVacancies
          ? JSON.stringify(updated.categoryWiseVacancies)
          : null,
        updated.vacancyDetails ? JSON.stringify(updated.vacancyDetails) : null,
        updated.qualification,
        updated.qualificationDetails,
        updated.ageMin,
        updated.ageMax,
        updated.ageRelaxation,
        updated.applicationStart,
        updated.applicationEnd,
        updated.feePaymentDeadline,
        updated.correctionWindow || null,
        updated.examDate,
        updated.admitCardDate || null,
        updated.resultDate || null,
        JSON.stringify(updated.applicationFee),
        JSON.stringify(updated.salary),
        JSON.stringify(updated.selectionProcess),
        JSON.stringify(updated.howToApply),
        updated.overview,
        updated.status,
        updated.isClosingSoon,
        JSON.stringify(updated.links),
        JSON.stringify(updated.sourceInfo),
        updated.verificationStatus,
        updated.qualityStatus,
        updated.isDraft,
        updated.publishedAt || null,
        updated.updatedAt,
        updated.id,
      ]
    );

    return updated;
  }

  /**
   * Delete job by ID
   */
  static async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.query('DELETE FROM jobs WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  /**
   * Count jobs with optional filters
   */
  static async count(filters?: { category?: string; status?: string }): Promise<number> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT COUNT(*) as count FROM jobs WHERE 1=1';

    if (filters?.category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(filters.category);
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if job exists by organization and advertisement number (duplicate check)
   */
  static async existsByOrgAndAdvNumber(
    organization: string,
    advertisementNumber: string
  ): Promise<boolean> {
    const db = getDatabase();
    const result = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE organization = $1 AND advertisement_number = $2',
      [organization, advertisementNumber]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }

  /**
   * Map database row to GovtJob type
   */
  private static mapRowToJob(row: any): GovtJob {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      organization: row.organization,
      department: row.department,
      advertisementNumber: row.advertisement_number,
      category: row.category,
      state: row.state,
      postNames: row.post_names,
      totalVacancies: row.total_vacancies,
      categoryWiseVacancies: row.category_wise_vacancies,
      vacancyDetails: row.vacancy_details,
      qualification: row.qualification,
      qualificationDetails: row.qualification_details,
      ageMin: row.age_min,
      ageMax: row.age_max,
      ageRelaxation: row.age_relaxation,
      applicationStart: row.application_start,
      applicationEnd: row.application_end,
      feePaymentDeadline: row.fee_payment_deadline,
      correctionWindow: row.correction_window,
      examDate: row.exam_date,
      admitCardDate: row.admit_card_date,
      resultDate: row.result_date,
      applicationFee: row.application_fee,
      salary: row.salary,
      selectionProcess: row.selection_process,
      howToApply: row.how_to_apply,
      overview: row.overview,
      status: row.status,
      isClosingSoon: row.is_closing_soon,
      links: row.links,
      sourceInfo: row.source_info,
      verificationStatus: row.verification_status,
      qualityStatus: row.quality_status,
      isDraft: row.is_draft,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
