/**
 * Agent Log Repository - CRUD operations for AI agent execution logs
 */

import { getDatabase } from '../database.js';
import type { AgentLog, AgentType } from '../../types.js';

export class AgentLogRepository {
  /**
   * Create a new agent log
   */
  static create(log: AgentLog): AgentLog {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO agent_logs (
        id, item_title, agent_type, status, duration_ms, model_used,
        input_summary, output_summary, evidence_text, issue_details, timestamp
      ) VALUES (
        @id, @item_title, @agent_type, @status, @duration_ms, @model_used,
        @input_summary, @output_summary, @evidence_text, @issue_details, @timestamp
      )
    `);

    stmt.run({
      id: log.id,
      item_title: log.itemTitle,
      agent_type: log.agentType,
      status: log.status,
      duration_ms: log.durationMs,
      model_used: log.modelUsed,
      input_summary: log.inputSummary,
      output_summary: log.outputSummary,
      evidence_text: log.evidenceText || null,
      issue_details: log.issueDetails || null,
      timestamp: log.timestamp,
    });

    return log;
  }

  /**
   * Find log by ID
   */
  static findById(id: string): AgentLog | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM agent_logs WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToLog(row) : null;
  }

  /**
   * Get all logs with optional filters
   */
  static findAll(filters?: {
    agentType?: AgentType;
    status?: string;
    limit?: number;
    offset?: number;
  }): AgentLog[] {
    const db = getDatabase();
    let query = 'SELECT * FROM agent_logs WHERE 1=1';
    const params: any = {};

    if (filters?.agentType) {
      query += ' AND agent_type = @agent_type';
      params.agent_type = filters.agentType;
    }

    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }

    query += ' ORDER BY timestamp DESC';

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
    return rows.map((row) => this.mapRowToLog(row));
  }

  /**
   * Get logs by item title (for a specific job/draft)
   */
  static findByItemTitle(itemTitle: string, limit = 100): AgentLog[] {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT * FROM agent_logs WHERE item_title = ? ORDER BY timestamp DESC LIMIT ?'
    );
    const rows = stmt.all(itemTitle, limit) as any[];
    return rows.map((row) => this.mapRowToLog(row));
  }

  /**
   * Count logs with optional filters
   */
  static count(filters?: { agentType?: AgentType; status?: string }): number {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM agent_logs WHERE 1=1';
    const params: any = {};

    if (filters?.agentType) {
      query += ' AND agent_type = @agent_type';
      params.agent_type = filters.agentType;
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
   * Get statistics for agent execution
   */
  static getStatistics(): {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
    byAgent: Record<AgentType, { count: number; successRate: number }>;
  } {
    const db = getDatabase();

    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM agent_logs');
    const totalResult = totalStmt.get() as { count: number };

    const successStmt = db.prepare(
      "SELECT COUNT(*) as count FROM agent_logs WHERE status = 'SUCCESS'"
    );
    const successResult = successStmt.get() as { count: number };

    const avgDurationStmt = db.prepare(
      'SELECT AVG(duration_ms) as avg FROM agent_logs'
    );
    const avgDurationResult = avgDurationStmt.get() as { avg: number };

    const byAgentStmt = db.prepare(`
      SELECT 
        agent_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success
      FROM agent_logs
      GROUP BY agent_type
    `);
    const byAgentRows = byAgentStmt.all() as Array<{
      agent_type: AgentType;
      total: number;
      success: number;
    }>;

    const byAgent: Record<string, { count: number; successRate: number }> = {};
    for (const row of byAgentRows) {
      byAgent[row.agent_type] = {
        count: row.total,
        successRate: row.total > 0 ? (row.success / row.total) * 100 : 0,
      };
    }

    return {
      totalRuns: totalResult.count,
      successRate:
        totalResult.count > 0
          ? (successResult.count / totalResult.count) * 100
          : 0,
      avgDurationMs: avgDurationResult.avg || 0,
      byAgent: byAgent as any,
    };
  }

  /**
   * Delete old logs (cleanup)
   */
  static deleteOlderThan(daysOld: number): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const stmt = db.prepare('DELETE FROM agent_logs WHERE timestamp < ?');
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
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
