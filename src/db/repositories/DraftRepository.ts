/**
 * Draft Repository - CRUD operations for draft jobs pending review
 */

import { getDatabase } from '../database.js';
import type { GovtJobDraft } from '../../types.js';

export class DraftRepository {
  /**
   * Create a new draft
   */
  static async create(draft: GovtJobDraft): Promise<GovtJobDraft> {
    const db = getDatabase();
    await db.query(
      `INSERT INTO drafts (
        id, slug, title, organization, department, advertisement_number,
        category, state, post_names, total_vacancies, category_wise_vacancies,
        vacancy_details, qualification, qualification_details, age_min, age_max,
        age_relaxation, application_start, application_end, fee_payment_deadline,
        correction_window, exam_date, admit_card_date, result_date, application_fee,
        salary, selection_process, how_to_apply, overview, status, is_closing_soon,
        links, source_info, verification_status, quality_status, is_draft,
        published_at, created_at, updated_at, verification_report, agent_logs, qa_final_report
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31,
        $32, $33, $34, $35, $36,
        $37, $38, $39, $40, $41, $42
      )`,
      [
        draft.id,
        draft.slug,
        draft.title,
        draft.organization,
        draft.department,
        draft.advertisementNumber || null,
        draft.category,
        draft.state || null,
        JSON.stringify(draft.postNames),
        draft.totalVacancies,
        draft.categoryWiseVacancies ? JSON.stringify(draft.categoryWiseVacancies) : null,
        draft.vacancyDetails ? JSON.stringify(draft.vacancyDetails) : null,
        draft.qualification,
        draft.qualificationDetails,
        draft.ageMin,
        draft.ageMax,
        draft.ageRelaxation,
        draft.applicationStart,
        draft.applicationEnd,
        draft.feePaymentDeadline,
        draft.correctionWindow || null,
        draft.examDate,
        draft.admitCardDate || null,
        draft.resultDate || null,
        JSON.stringify(draft.applicationFee),
        JSON.stringify(draft.salary),
        JSON.stringify(draft.selectionProcess),
        JSON.stringify(draft.howToApply),
        draft.overview,
        draft.status,
        draft.isClosingSoon,
        JSON.stringify(draft.links),
        JSON.stringify(draft.sourceInfo),
        draft.verificationStatus,
        draft.qualityStatus,
        true,
        draft.publishedAt || null,
        draft.createdAt,
        draft.updatedAt,
        JSON.stringify(draft.verificationReport),
        JSON.stringify(draft.agentLogs),
        null,
      ]
    );

    return draft;
  }

  /**
   * Find draft by ID
   */
  static async findById(id: string): Promise<GovtJobDraft | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM drafts WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? this.mapRowToDraft(row) : null;
  }

  /**
   * Find draft by slug
   */
  static async findBySlug(slug: string): Promise<GovtJobDraft | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM drafts WHERE slug = $1', [slug]);
    const row = result.rows[0];
    return row ? this.mapRowToDraft(row) : null;
  }

  /**
   * Get all drafts with optional filters
   */
  static async findAll(filters?: {
    verificationStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<GovtJobDraft[]> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM drafts WHERE 1=1';

    if (filters?.verificationStatus) {
      query += ` AND verification_status = $${paramIndex++}`;
      params.push(filters.verificationStatus);
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
    return result.rows.map((row) => this.mapRowToDraft(row));
  }

  /**
   * Update draft
   */
  static async update(id: string, updates: Partial<GovtJobDraft>): Promise<GovtJobDraft | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const db = getDatabase();
    await db.query(
      `UPDATE drafts SET
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
        published_at = $35,
        updated_at = $36,
        verification_report = $37,
        agent_logs = $38,
        qa_final_report = $39
      WHERE id = $40`,
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
        updated.categoryWiseVacancies ? JSON.stringify(updated.categoryWiseVacancies) : null,
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
        updated.publishedAt || null,
        updated.updatedAt,
        JSON.stringify(updated.verificationReport),
        JSON.stringify(updated.agentLogs),
        null,
        updated.id,
      ]
    );

    return updated;
  }

  /**
   * Delete draft by ID
   */
  static async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.query('DELETE FROM drafts WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  /**
   * Count drafts
   */
  static async count(): Promise<number> {
    const db = getDatabase();
    const result = await db.query('SELECT COUNT(*) as count FROM drafts');
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Check if draft exists by organization and advertisement number
   */
  static async existsByOrgAndAdvNumber(
    organization: string,
    advertisementNumber: string
  ): Promise<boolean> {
    const db = getDatabase();
    const result = await db.query(
      'SELECT COUNT(*) as count FROM drafts WHERE organization = $1 AND advertisement_number = $2',
      [organization, advertisementNumber]
    );
    return parseInt(result.rows[0].count, 10) > 0;
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
      isDraft: true,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      verificationReport: row.verification_report,
      agentLogs: row.agent_logs,
    };
  }
}
