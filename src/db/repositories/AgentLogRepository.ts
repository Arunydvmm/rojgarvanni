/**
 * Agent Log Repository - CRUD operations for AI agent execution logs
 */

import { getDatabase } from '../database.js';
import type { AgentLog, AgentType } from '../../types.js';

export class AgentLogRepository {
  /**
   * Create a new agent log
   */
  static async create(log: AgentLog): Promise<AgentLog> {
    const db = getDatabase();
    await db.query(
      `INSERT INTO agent_logs (
        id, item_title, agent_type, status, duration_ms, model_used,
        input_summary, output_summary, evidence_text, issue_details, timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11
      )`,
      [
        log.id,
        log.itemTitle,
        log.agentType,
        log.status,
        log.durationMs,
        log.modelUsed,
        log.inputSummary,
        log.outputSummary,
        log.evidenceText || null,
        log.issueDetails || null,
        log.timestamp,
      ]
    );

    return log;
  }

  /**
   * Find log by ID
   */
  static async findById(id: string): Promise<AgentLog | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM agent_logs WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? this.mapRowToLog(row) : null;
  }

  /**
   * Get all logs with optional filters
   */
  static async findAll(filters?: {
    agentType?: AgentType;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<AgentLog[]> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM agent_logs WHERE 1=1';

    if (filters?.agentType) {
      query += ` AND agent_type = $${paramIndex++}`;
      params.push(filters.agentType);
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await db.query(query, params);
    return result.rows.map((row) => this.mapRowToLog(row));
  }

  /**
   * Get logs by item title (for a specific job/draft)
   */
  static async findByItemTitle(itemTitle: string, limit = 100): Promise<AgentLog[]> {
    const db = getDatabase();
    const result = await db.query(
      'SELECT * FROM agent_logs WHERE item_title = $1 ORDER BY timestamp DESC LIMIT $2',
      [itemTitle, limit]
    );
    return result.rows.map((row) => this.mapRowToLog(row));
  }

  /**
   * Count logs with optional filters
   */
  static async count(filters?: { agentType?: AgentType; status?: string }): Promise<number> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT COUNT(*) as count FROM agent_logs WHERE 1=1';

    if (filters?.agentType) {
      query += ` AND agent_type = $${paramIndex++}`;
      params.push(filters.agentType);
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get statistics for agent execution
   */
  static async getStatistics(): Promise<{
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
    byAgent: Record<AgentType, { count: number; successRate: number }>;
  }> {
    const db = getDatabase();

    const totalResult = await db.query('SELECT COUNT(*) as count FROM agent_logs');
    const totalRuns = parseInt(totalResult.rows[0].count, 10);

    const successResult = await db.query(
      "SELECT COUNT(*) as count FROM agent_logs WHERE status = 'SUCCESS'"
    );
    const successCount = parseInt(successResult.rows[0].count, 10);

    const avgResult = await db.query('SELECT AVG(duration_ms) as avg FROM agent_logs');
    const avgDurationMs = avgResult.rows[0].avg || 0;

    const byAgentResult = await db.query(`
      SELECT 
        agent_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success
      FROM agent_logs
      GROUP BY agent_type
    `);

    const byAgent: Record<string, { count: number; successRate: number }> = {};
    for (const row of byAgentResult.rows) {
      const total = parseInt(row.total, 10);
      const success = parseInt(row.success, 10);
      byAgent[row.agent_type] = {
        count: total,
        successRate: total > 0 ? (success / total) * 100 : 0,
      };
    }

    return {
      totalRuns,
      successRate: totalRuns > 0 ? (successCount / totalRuns) * 100 : 0,
      avgDurationMs,
      byAgent: byAgent as any,
    };
  }

  /**
   * Delete old logs (cleanup)
   */
  static async deleteOlderThan(daysOld: number): Promise<number> {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db.query(
      'DELETE FROM agent_logs WHERE timestamp < $1',
      [cutoffDate.toISOString()]
    );
    return result.rowCount || 0;
  }

  /**
   * Map database row to AgentLog type
   */
  private static mapRowToLog(row: any): AgentLog {
    return {
      id: row.id,
      itemTitle: row.item_title,
      agentType: row.agent_type,
      status: row.status,
      durationMs: row.duration_ms,
      modelUsed: row.model_used,
      inputSummary: row.input_summary,
      outputSummary: row.output_summary,
      evidenceText: row.evidence_text,
      issueDetails: row.issue_details,
      timestamp: row.timestamp,
    };
  }
}
