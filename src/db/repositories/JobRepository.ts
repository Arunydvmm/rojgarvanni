/**
 * Job Repository - CRUD operations for published jobs
 */

import { getDatabase } from '../database.js';
import type { GovtJob } from '../../types.js';

export class JobRepository {
  /**
   * Create a new job
   */
  static create(job: GovtJob): GovtJob {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO jobs (
        id, slug, title, organization, department, advertisement_number,
        category, state, post_names, total_vacancies, category_wise_vacancies,
        vacancy_details, qualification, qualification_details, age_min, age_max,
        age_relaxation, application_start, application_end, fee_payment_deadline,
        correction_window, exam_date, admit_card_date, result_date, application_fee,
        salary, selection_process, how_to_apply, overview, status, is_closing_soon,
        links, source_info, verification_status, quality_status, is_draft,
        published_at, created_at, updated_at
      ) VALUES (
        @id, @slug, @title, @organization, @department, @advertisement_number,
        @category, @state, @post_names, @total_vacancies, @category_wise_vacancies,
        @vacancy_details, @qualification, @qualification_details, @age_min, @age_max,
        @age_relaxation, @application_start, @application_end, @fee_payment_deadline,
        @correction_window, @exam_date, @admit_card_date, @result_date, @application_fee,
        @salary, @selection_process, @how_to_apply, @overview, @status, @is_closing_soon,
        @links, @source_info, @verification_status, @quality_status, @is_draft,
        @published_at, @created_at, @updated_at
      )
    `);

    stmt.run({
      id: job.id,
      slug: job.slug,
      title: job.title,
      organization: job.organization,
      department: job.department,
      advertisement_number: job.advertisementNumber || null,
      category: job.category,
      state: job.state || null,
      post_names: JSON.stringify(job.postNames),
      total_vacancies: job.totalVacancies,
      category_wise_vacancies: job.categoryWiseVacancies
        ? JSON.stringify(job.categoryWiseVacancies)
        : null,
      vacancy_details: job.vacancyDetails
        ? JSON.stringify(job.vacancyDetails)
        : null,
      qualification: job.qualification,
      qualification_details: job.qualificationDetails,
      age_min: job.ageMin,
      age_max: job.ageMax,
      age_relaxation: job.ageRelaxation,
      application_start: job.applicationStart,
      application_end: job.applicationEnd,
      fee_payment_deadline: job.feePaymentDeadline,
      correction_window: job.correctionWindow || null,
      exam_date: job.examDate,
      admit_card_date: job.admitCardDate || null,
      result_date: job.resultDate || null,
      application_fee: JSON.stringify(job.applicationFee),
      salary: JSON.stringify(job.salary),
      selection_process: JSON.stringify(job.selectionProcess),
      how_to_apply: JSON.stringify(job.howToApply),
      overview: job.overview,
      status: job.status,
      is_closing_soon: job.isClosingSoon ? 1 : 0,
      links: JSON.stringify(job.links),
      source_info: JSON.stringify(job.sourceInfo),
      verification_status: job.verificationStatus,
      quality_status: job.qualityStatus,
      is_draft: job.isDraft ? 1 : 0,
      published_at: job.publishedAt || null,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    });

    return job;
  }

  /**
   * Find job by ID
   */
  static findById(id: string): GovtJob | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToJob(row) : null;
  }

  /**
   * Find job by slug
   */
  static findBySlug(slug: string): GovtJob | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM jobs WHERE slug = ?');
    const row = stmt.get(slug) as any;
    return row ? this.mapRowToJob(row) : null;
  }

  /**
   * Get all jobs with optional filters
   */
  static findAll(filters?: {
    category?: string;
    status?: string;
    isDraft?: boolean;
    limit?: number;
    offset?: number;
  }): GovtJob[] {
    const db = getDatabase();
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params: any = {};

    if (filters?.category) {
      query += ' AND category = @category';
      params.category = filters.category;
    }

    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }

    if (filters?.isDraft !== undefined) {
      query += ' AND is_draft = @is_draft';
      params.is_draft = filters.isDraft ? 1 : 0;
    }

    query += ' ORDER BY created_at DESC';

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
    return rows.map((row) => this.mapRowToJob(row));
  }

  /**
   * Update job
   */
  static update(id: string, updates: Partial<GovtJob>): GovtJob | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE jobs SET
        slug = @slug,
        title = @title,
        organization = @organization,
        department = @department,
        advertisement_number = @advertisement_number,
        category = @category,
        state = @state,
        post_names = @post_names,
        total_vacancies = @total_vacancies,
        category_wise_vacancies = @category_wise_vacancies,
        vacancy_details = @vacancy_details,
        qualification = @qualification,
        qualification_details = @qualification_details,
        age_min = @age_min,
        age_max = @age_max,
        age_relaxation = @age_relaxation,
        application_start = @application_start,
        application_end = @application_end,
        fee_payment_deadline = @fee_payment_deadline,
        correction_window = @correction_window,
        exam_date = @exam_date,
        admit_card_date = @admit_card_date,
        result_date = @result_date,
        application_fee = @application_fee,
        salary = @salary,
        selection_process = @selection_process,
        how_to_apply = @how_to_apply,
        overview = @overview,
        status = @status,
        is_closing_soon = @is_closing_soon,
        links = @links,
        source_info = @source_info,
        verification_status = @verification_status,
        quality_status = @quality_status,
        is_draft = @is_draft,
        published_at = @published_at,
        updated_at = @updated_at
      WHERE id = @id
    `);

    stmt.run({
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      organization: updated.organization,
      department: updated.department,
      advertisement_number: updated.advertisementNumber || null,
      category: updated.category,
      state: updated.state || null,
      post_names: JSON.stringify(updated.postNames),
      total_vacancies: updated.totalVacancies,
      category_wise_vacancies: updated.categoryWiseVacancies
        ? JSON.stringify(updated.categoryWiseVacancies)
        : null,
      vacancy_details: updated.vacancyDetails
        ? JSON.stringify(updated.vacancyDetails)
        : null,
      qualification: updated.qualification,
      qualification_details: updated.qualificationDetails,
      age_min: updated.ageMin,
      age_max: updated.ageMax,
      age_relaxation: updated.ageRelaxation,
      application_start: updated.applicationStart,
      application_end: updated.applicationEnd,
      fee_payment_deadline: updated.feePaymentDeadline,
      correction_window: updated.correctionWindow || null,
      exam_date: updated.examDate,
      admit_card_date: updated.admitCardDate || null,
      result_date: updated.resultDate || null,
      application_fee: JSON.stringify(updated.applicationFee),
      salary: JSON.stringify(updated.salary),
      selection_process: JSON.stringify(updated.selectionProcess),
      how_to_apply: JSON.stringify(updated.howToApply),
      overview: updated.overview,
      status: updated.status,
      is_closing_soon: updated.isClosingSoon ? 1 : 0,
      links: JSON.stringify(updated.links),
      source_info: JSON.stringify(updated.sourceInfo),
      verification_status: updated.verificationStatus,
      quality_status: updated.qualityStatus,
      is_draft: updated.isDraft ? 1 : 0,
      published_at: updated.publishedAt || null,
      updated_at: updated.updatedAt,
    });

    return updated;
  }

  /**
   * Delete job by ID
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM jobs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count jobs with optional filters
   */
  static count(filters?: { category?: string; status?: string }): number {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM jobs WHERE 1=1';
    const params: any = {};

    if (filters?.category) {
      query += ' AND category = @category';
      params.category = filters.category;
    }

    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }

    const stmt = db.prepare(query);
    const result = stmt.get(params) as { count: number };
    return result.count;
  }

  /**
   * Check if job exists by organization and advertisement number (duplicate check)
   */
  static existsByOrgAndAdvNumber(
    organization: string,
    advertisementNumber: string
  ): boolean {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM jobs WHERE organization = ? AND advertisement_number = ?'
    );
    const result = stmt.get(organization, advertisementNumber) as { count: number };
    return result.count > 0;
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
      postNames: JSON.parse(row.post_names),
      totalVacancies: row.total_vacancies,
      categoryWiseVacancies: row.category_wise_vacancies
        ? JSON.parse(row.category_wise_vacancies)
        : undefined,
      vacancyDetails: row.vacancy_details
        ? JSON.parse(row.vacancy_details)
        : undefined,
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
      applicationFee: JSON.parse(row.application_fee),
      salary: JSON.parse(row.salary),
      selectionProcess: JSON.parse(row.selection_process),
      howToApply: JSON.parse(row.how_to_apply),
      overview: row.overview,
      status: row.status,
      isClosingSoon: row.is_closing_soon === 1,
      links: JSON.parse(row.links),
      sourceInfo: JSON.parse(row.source_info),
      verificationStatus: row.verification_status,
      qualityStatus: row.quality_status,
      isDraft: row.is_draft === 1,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
