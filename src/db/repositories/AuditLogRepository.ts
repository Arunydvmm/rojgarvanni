/**
 * Audit Log Repository - CRUD operations for admin action tracking
 */

import { getDatabase } from '../database.js';
import type { AuditLog } from '../../types.js';

export class AuditLogRepository {
  /**
   * Create a new audit log
   */
  static async create(log: AuditLog): Promise<AuditLog> {
    const db = getDatabase();
    await db.query(
      `INSERT INTO audit_logs (
        id, admin_user, action, details, ip_address, timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      )`,
      [log.id, log.adminUser, log.action, log.details, log.ipAddress, log.timestamp]
    );

    return log;
  }

  /**
   * Find log by ID
   */
  static async findById(id: string): Promise<AuditLog | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? this.mapRowToLog(row) : null;
  }

  /**
   * Get all logs with optional filters
   */
  static async findAll(filters?: {
    adminUser?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT * FROM audit_logs WHERE 1=1';

    if (filters?.adminUser) {
      query += ` AND admin_user = $${paramIndex++}`;
      params.push(filters.adminUser);
    }

    if (filters?.action) {
      query += ` AND action = $${paramIndex++}`;
      params.push(filters.action);
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
   * Get logs by date range
   */
  static async findByDateRange(
    startDate: string,
    endDate: string,
    limit = 1000
  ): Promise<AuditLog[]> {
    const db = getDatabase();
    const result = await db.query(
      'SELECT * FROM audit_logs WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp DESC LIMIT $3',
      [startDate, endDate, limit]
    );
    return result.rows.map((row) => this.mapRowToLog(row));
  }

  /**
   * Count logs with optional filters
   */
  static async count(filters?: { adminUser?: string; action?: string }): Promise<number> {
    const db = getDatabase();
    const params: any[] = [];
    let paramIndex = 1;
    let query = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';

    if (filters?.adminUser) {
      query += ` AND admin_user = $${paramIndex++}`;
      params.push(filters.adminUser);
    }

    if (filters?.action) {
      query += ` AND action = $${paramIndex++}`;
      params.push(filters.action);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get activity summary by admin user
   */
  static async getActivityByUser(): Promise<
    Array<{
      adminUser: string;
      actionCount: number;
      lastAction: string;
    }>
  > {
    const db = getDatabase();
    const result = await db.query(`
      SELECT 
        admin_user,
        COUNT(*) as action_count,
        MAX(timestamp) as last_action
      FROM audit_logs
      GROUP BY admin_user
      ORDER BY action_count DESC
    `);

    return result.rows.map((row) => ({
      adminUser: row.admin_user,
      actionCount: parseInt(row.action_count, 10),
      lastAction: row.last_action,
    }));
  }

  /**
   * Get recent activity (last N logs)
   */
  static async getRecentActivity(limit = 50): Promise<AuditLog[]> {
    const db = getDatabase();
    const result = await db.query(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    return result.rows.map((row) => this.mapRowToLog(row));
  }

  /**
   * Delete old logs (cleanup)
   */
  static async deleteOlderThan(daysOld: number): Promise<number> {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db.query('DELETE FROM audit_logs WHERE timestamp < $1', [
      cutoffDate.toISOString(),
    ]);
    return result.rowCount || 0;
  }

  /**
   * Map database row to AuditLog type
   */
  private static mapRowToLog(row: any): AuditLog {
    return {
      id: row.id,
      adminUser: row.admin_user,
      action: row.action,
      details: row.details,
      ipAddress: row.ip_address,
      timestamp: row.timestamp,
    };
  }
}
