import { getDatabase } from '../database';

export interface AgentCheckpoint {
  id: string;
  pipeline_session_id: string;
  agent_name: string;
  agent_index: number;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'MANUAL_OVERRIDE';
  input_data: any;
  output_data: any;
  error_message: string | null;
  failure_reason: string | null;
  admin_notes: string | null;
  duration_ms: number | null;
  executed_at: string;
}

class AgentCheckpointRepo {
  async create(checkpoint: Omit<AgentCheckpoint, 'id'>): Promise<AgentCheckpoint> {
    const pool = getDatabase();
    const id = `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await pool.query(
      `INSERT INTO agent_checkpoints (
        id, pipeline_session_id, agent_name, agent_index, status,
        input_data, output_data, error_message, failure_reason, admin_notes,
        duration_ms, executed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        checkpoint.pipeline_session_id,
        checkpoint.agent_name,
        checkpoint.agent_index,
        checkpoint.status,
        JSON.stringify(checkpoint.input_data),
        checkpoint.output_data ? JSON.stringify(checkpoint.output_data) : null,
        checkpoint.error_message || null,
        checkpoint.failure_reason || null,
        checkpoint.admin_notes || null,
        checkpoint.duration_ms || null,
        checkpoint.executed_at,
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<AgentCheckpoint | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM agent_checkpoints WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async findByPipelineSessionId(pipelineSessionId: string): Promise<AgentCheckpoint[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM agent_checkpoints WHERE pipeline_session_id = $1 ORDER BY agent_index ASC',
      [pipelineSessionId]
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  async findBySessionAndAgent(pipelineSessionId: string, agentName: string): Promise<AgentCheckpoint | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM agent_checkpoints WHERE pipeline_session_id = $1 AND agent_name = $2 ORDER BY executed_at DESC LIMIT 1',
      [pipelineSessionId, agentName]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async updateOutputData(
    id: string,
    outputData: any,
    status: AgentCheckpoint['status'] = 'SUCCESS'
  ): Promise<AgentCheckpoint | null> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE agent_checkpoints SET output_data = $1, status = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(outputData), status, id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async markFailed(
    id: string,
    errorMessage: string,
    failureReason: string
  ): Promise<AgentCheckpoint | null> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE agent_checkpoints SET status = 'FAILED', error_message = $1, failure_reason = $2 WHERE id = $3 RETURNING *`,
      [errorMessage, failureReason, id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async updateWithAdminNotes(id: string, adminNotes: string, overrideData?: any): Promise<AgentCheckpoint | null> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE agent_checkpoints SET 
        admin_notes = $1, 
        status = 'MANUAL_OVERRIDE',
        output_data = COALESCE($2, output_data)
       WHERE id = $3 RETURNING *`,
      [adminNotes, overrideData ? JSON.stringify(overrideData) : null, id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM agent_checkpoints WHERE id = $1', [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  private mapRow(row: any): AgentCheckpoint {
    return {
      id: row.id,
      pipeline_session_id: row.pipeline_session_id,
      agent_name: row.agent_name,
      agent_index: row.agent_index,
      status: row.status,
      input_data: typeof row.input_data === 'string' ? JSON.parse(row.input_data) : row.input_data,
      output_data: row.output_data
        ? typeof row.output_data === 'string'
          ? JSON.parse(row.output_data)
          : row.output_data
        : null,
      error_message: row.error_message,
      failure_reason: row.failure_reason,
      admin_notes: row.admin_notes,
      duration_ms: row.duration_ms,
      executed_at: row.executed_at,
    };
  }
}

export const AgentCheckpointRepository = new AgentCheckpointRepo();
