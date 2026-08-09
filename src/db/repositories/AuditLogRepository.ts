/**
 * Audit Log Repository - CRUD operations for admin action tracking
 */

import { getDatabase } from '../database.js';
import type { AuditLog } from '../../types.js';

export class AuditLogRepository {
  /**
   * Create a new audit log
   */
  static create(log: AuditLog): AuditLog {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        id, admin_user, action, details, ip_address, timestamp
      ) VALUES (
        @id, @admin_user, @action, @details, @ip_address, @timestamp
      )
    `);

    stmt.run({
      id: log.id,
      admin_user: log.adminUser,
      action: log.action,
      details: log.details,
      ip_address: log.ipAddress,
      timestamp: log.timestamp,
    });

    return log;
  }

  /**
   * Find log by ID
   */
  static findById(id: string): AuditLog | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM audit_logs WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToLog(row) : null;
  }

  /**
   * Get all logs with optional filters
   */
  static findAll(filters?: {
    adminUser?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): AuditLog[] {
    const db = getDatabase();
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any = {};

    if (filters?.adminUser) {
      query += ' AND admin_user = @admin_user';
      params.admin_user = filters.adminUser;
    }

    if (filters?.action) {
      query += ' AND action = @action';
      params.action = filters.action;
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
   * Get logs by date range
   */
  static findByDateRange(
    startDate: string,
    endDate: string,
    limit = 1000
  ): AuditLog[] {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT * FROM audit_logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?'
    );
    const rows = stmt.all(startDate, endDate, limit) as any[];
    return rows.map((row) => this.mapRowToLog(row));
  }

  /**
   * Count logs with optional filters
   */
  static count(filters?: { adminUser?: string; action?: string }): number {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
    const params: any = {};

    if (filters?.adminUser) {
      query += ' AND admin_user = @admin_user';
      params.admin_user = filters.adminUser;
    }

    if (filters?.action) {
      query += ' AND action = @action';
      params.action = filters.action;
    }

    const stmt = db.prepare(query);
    const result = stmt.get(params) as { count: number };
    return result.count;
  }

  /**
   * Get activity summary by admin user
   */
  static getActivityByUser(): Array<{
    adminUser: string;
    actionCount: number;
    lastAction: string;
  }> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        admin_user,
        COUNT(*) as action_count,
        MAX(timestamp) as last_action
      FROM audit_logs
      GROUP BY admin_user
      ORDER BY action_count DESC
    `);
    const rows = stmt.all() as Array<{
      admin_user: string;
      action_count: number;
      last_action: string;
    }>;

    return rows.map((row) => ({
      adminUser: row.admin_user,
      actionCount: row.action_count,
      lastAction: row.last_action,
    }));
  }

  /**
   * Get recent activity (last N logs)
   */
  static getRecentActivity(limit = 50): AuditLog[] {
    const db = getDatabase();
    const stmt = db.prepare(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?'
    );
    const rows = stmt.all(limit) as any[];
    return rows.map((row) => this.mapRowToLog(row));
  }

  /**
   * Delete old logs (cleanup)
   */
  static deleteOlderThan(daysOld: number): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const stmt = db.prepare('DELETE FROM audit_logs WHERE timestamp < ?');
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
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
