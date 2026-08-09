/**
 * Draft Repository - CRUD operations for draft jobs pending review
 */

import { getDatabase } from '../database.js';
import type { GovtJobDraft } from '../../types.js';

export class DraftRepository {
  /**
   * Create a new draft
   */
  static create(draft: GovtJobDraft): GovtJobDraft {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO drafts (
        id, slug, title, organization, department, advertisement_number,
        category, state, post_names, total_vacancies, category_wise_vacancies,
        vacancy_details, qualification, qualification_details, age_min, age_max,
        age_relaxation, application_start, application_end, fee_payment_deadline,
        correction_window, exam_date, admit_card_date, result_date, application_fee,
        salary, selection_process, how_to_apply, overview, status, is_closing_soon,
        links, source_info, verification_status, quality_status, is_draft,
        published_at, created_at, updated_at, verification_report, agent_logs, qa_final_report
      ) VALUES (
        @id, @slug, @title, @organization, @department, @advertisement_number,
        @category, @state, @post_names, @total_vacancies, @category_wise_vacancies,
        @vacancy_details, @qualification, @qualification_details, @age_min, @age_max,
        @age_relaxation, @application_start, @application_end, @fee_payment_deadline,
        @correction_window, @exam_date, @admit_card_date, @result_date, @application_fee,
        @salary, @selection_process, @how_to_apply, @overview, @status, @is_closing_soon,
        @links, @source_info, @verification_status, @quality_status, @is_draft,
        @published_at, @created_at, @updated_at, @verification_report, @agent_logs, @qa_final_report
      )
    `);

    stmt.run({
      id: draft.id,
      slug: draft.slug,
      title: draft.title,
      organization: draft.organization,
      department: draft.department,
      advertisement_number: draft.advertisementNumber || null,
      category: draft.category,
      state: draft.state || null,
      post_names: JSON.stringify(draft.postNames),
      total_vacancies: draft.totalVacancies,
      category_wise_vacancies: draft.categoryWiseVacancies
        ? JSON.stringify(draft.categoryWiseVacancies)
        : null,
      vacancy_details: draft.vacancyDetails
        ? JSON.stringify(draft.vacancyDetails)
        : null,
      qualification: draft.qualification,
      qualification_details: draft.qualificationDetails,
      age_min: draft.ageMin,
      age_max: draft.ageMax,
      age_relaxation: draft.ageRelaxation,
      application_start: draft.applicationStart,
      application_end: draft.applicationEnd,
      fee_payment_deadline: draft.feePaymentDeadline,
      correction_window: draft.correctionWindow || null,
      exam_date: draft.examDate,
      admit_card_date: draft.admitCardDate || null,
      result_date: draft.resultDate || null,
      application_fee: JSON.stringify(draft.applicationFee),
      salary: JSON.stringify(draft.salary),
      selection_process: JSON.stringify(draft.selectionProcess),
      how_to_apply: JSON.stringify(draft.howToApply),
      overview: draft.overview,
      status: draft.status,
      is_closing_soon: draft.isClosingSoon ? 1 : 0,
      links: JSON.stringify(draft.links),
      source_info: JSON.stringify(draft.sourceInfo),
      verification_status: draft.verificationStatus,
      quality_status: draft.qualityStatus,
      is_draft: 1, // Always 1 for drafts
      published_at: draft.publishedAt || null,
      created_at: draft.createdAt,
      updated_at: draft.updatedAt,
      verification_report: JSON.stringify(draft.verificationReport),
      agent_logs: JSON.stringify(draft.agentLogs),
      qa_final_report: null, // Will be added by Final QA agent
    });

    return draft;
  }

  /**
   * Find draft by ID
   */
  static findById(id: string): GovtJobDraft | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM drafts WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToDraft(row) : null;
  }

  /**
   * Find draft by slug
   */
  static findBySlug(slug: string): GovtJobDraft | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM drafts WHERE slug = ?');
    const row = stmt.get(slug) as any;
    return row ? this.mapRowToDraft(row) : null;
  }

  /**
   * Get all drafts with optional filters
   */
  static findAll(filters?: {
    verificationStatus?: string;
    limit?: number;
    offset?: number;
  }): GovtJobDraft[] {
    const db = getDatabase();
    let query = 'SELECT * FROM drafts WHERE 1=1';
    const params: any = {};

    if (filters?.verificationStatus) {
      query += ' AND verification_status = @verification_status';
      params.verification_status = filters.verificationStatus;
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
    return rows.map((row) => this.mapRowToDraft(row));
  }

  /**
   * Update draft
   */
  static update(id: string, updates: Partial<GovtJobDraft>): GovtJobDraft | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE drafts SET
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
        published_at = @published_at,
        updated_at = @updated_at,
        verification_report = @verification_report,
        agent_logs = @agent_logs,
        qa_final_report = @qa_final_report
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
      published_at: updated.publishedAt || null,
      updated_at: updated.updatedAt,
      verification_report: JSON.stringify(updated.verificationReport),
      agent_logs: JSON.stringify(updated.agentLogs),
      qa_final_report: null, // Keep existing or set from updates if provided
    });

    return updated;
  }

  /**
   * Delete draft by ID
   */
  static delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM drafts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Count drafts
   */
  static count(): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM drafts');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Check if draft exists by organization and advertisement number
   */
  static existsByOrgAndAdvNumber(
    organization: string,
    advertisementNumber: string
  ): boolean {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM drafts WHERE organization = ? AND advertisement_number = ?'
    );
    const result = stmt.get(organization, advertisementNumber) as { count: number };
    return result.count > 0;
  }

  /**
   * Map database row to GovtJobDraft type
   */
  private static mapRowToDraft(row: any): GovtJobDraft {
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
      isDraft: true,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      verificationReport: JSON.parse(row.verification_report),
      agentLogs: JSON.parse(row.agent_logs),
    };
  }
}
