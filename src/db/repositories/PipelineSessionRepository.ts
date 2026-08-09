import { getDatabase } from '../database';

export interface PipelineSession {
  id: string;
  source_name: string;
  source_url: string;
  raw_text: string;
  current_agent_index: number;
  current_status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED_REVIEW';
  current_draft: any;
  completed_agents: string[];
  failed_agent: string | null;
  failure_reason: string | null;
  admin_review_notes: string | null;
  created_at: string;
  updated_at: string;
}

class PipelineSessionRepo {
  async create(session: Omit<PipelineSession, 'id' | 'created_at' | 'updated_at'>): Promise<PipelineSession> {
    const pool = getDatabase();
    const id = `ps-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO pipeline_sessions (
        id, source_name, source_url, raw_text, current_agent_index,
        current_status, current_draft, completed_agents, failed_agent,
        failure_reason, admin_review_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        session.source_name,
        session.source_url,
        session.raw_text,
        session.current_agent_index,
        session.current_status,
        session.current_draft ? JSON.stringify(session.current_draft) : null,
        JSON.stringify(session.completed_agents || []),
        session.failed_agent || null,
        session.failure_reason || null,
        session.admin_review_notes || null,
        now,
        now,
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<PipelineSession | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM pipeline_sessions WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(options?: { limit?: number; offset?: number; status?: string }): Promise<PipelineSession[]> {
    const pool = getPool();
    const limit = Math.min(options?.limit || 50, 500);
    const offset = options?.offset || 0;

    let query = 'SELECT * FROM pipeline_sessions';
    const params: any[] = [];

    if (options?.status) {
      query += ' WHERE current_status = $1';
      params.push(options.status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map((row) => this.mapRow(row));
  }

  async update(
    id: string,
    updates: Partial<Omit<PipelineSession, 'id' | 'created_at'>>
  ): Promise<PipelineSession | null> {
    const pool = getPool();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.source_name !== undefined) {
      fields.push(`source_name = $${paramIndex}`);
      values.push(updates.source_name);
      paramIndex++;
    }
    if (updates.current_agent_index !== undefined) {
      fields.push(`current_agent_index = $${paramIndex}`);
      values.push(updates.current_agent_index);
      paramIndex++;
    }
    if (updates.current_status !== undefined) {
      fields.push(`current_status = $${paramIndex}`);
      values.push(updates.current_status);
      paramIndex++;
    }
    if (updates.current_draft !== undefined) {
      fields.push(`current_draft = $${paramIndex}`);
      values.push(updates.current_draft ? JSON.stringify(updates.current_draft) : null);
      paramIndex++;
    }
    if (updates.completed_agents !== undefined) {
      fields.push(`completed_agents = $${paramIndex}`);
      values.push(JSON.stringify(updates.completed_agents));
      paramIndex++;
    }
    if (updates.failed_agent !== undefined) {
      fields.push(`failed_agent = $${paramIndex}`);
      values.push(updates.failed_agent);
      paramIndex++;
    }
    if (updates.failure_reason !== undefined) {
      fields.push(`failure_reason = $${paramIndex}`);
      values.push(updates.failure_reason);
      paramIndex++;
    }
    if (updates.admin_review_notes !== undefined) {
      fields.push(`admin_review_notes = $${paramIndex}`);
      values.push(updates.admin_review_notes);
      paramIndex++;
    }

    fields.push(`updated_at = $${paramIndex}`);
    values.push(now);
    paramIndex++;

    values.push(id);

    const result = await pool.query(
      `UPDATE pipeline_sessions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM pipeline_sessions WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  private mapRow(row: any): PipelineSession {
    return {
      id: row.id,
      source_name: row.source_name,
      source_url: row.source_url,
      raw_text: row.raw_text,
      current_agent_index: row.current_agent_index,
      current_status: row.current_status,
      current_draft: row.current_draft ? JSON.parse(row.current_draft) : null,
      completed_agents: Array.isArray(row.completed_agents) ? row.completed_agents : JSON.parse(row.completed_agents || '[]'),
      failed_agent: row.failed_agent,
      failure_reason: row.failure_reason,
      admin_review_notes: row.admin_review_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const PipelineSessionRepository = new PipelineSessionRepo();
