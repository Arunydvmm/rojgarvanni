/**
 * Settings Repository - CRUD operations for site settings (singleton)
 */

import { getDatabase } from '../database.js';
import type { SiteSettings } from '../../types.js';

export class SettingsRepository {
  /**
   * Get site settings (singleton - always ID 1)
   */
  static async get(): Promise<SiteSettings> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM site_settings WHERE id = 1');
    const row = result.rows[0];

    if (!row) {
      throw new Error('Site settings not initialized');
    }

    return this.mapRowToSettings(row);
  }

  /**
   * Update site settings
   */
  static async update(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    const existing = await this.get();
    const updated = { ...existing, ...updates };

    const db = getDatabase();
    await db.query(
      `UPDATE site_settings SET
        ads_enabled = $1,
        site_title = $2,
        contact_email = $3,
        maintenance_mode = $4,
        auto_scan_interval_minutes = $5
      WHERE id = 1`,
      [
        updated.adsEnabled,
        updated.siteTitle,
        updated.contactEmail,
        updated.maintenanceMode,
        updated.autoScanIntervalMinutes,
      ]
    );

    return updated;
  }

  /**
   * Enable/disable ads
   */
  static async setAdsEnabled(enabled: boolean): Promise<void> {
    const db = getDatabase();
    await db.query('UPDATE site_settings SET ads_enabled = $1 WHERE id = 1', [enabled]);
  }

  /**
   * Enable/disable maintenance mode
   */
  static async setMaintenanceMode(enabled: boolean): Promise<void> {
    const db = getDatabase();
    await db.query('UPDATE site_settings SET maintenance_mode = $1 WHERE id = 1', [enabled]);
  }

  /**
   * Update auto-scan interval
   */
  static async setAutoScanInterval(minutes: number): Promise<void> {
    const db = getDatabase();
    await db.query('UPDATE site_settings SET auto_scan_interval_minutes = $1 WHERE id = 1', [
      minutes,
    ]);
  }

  /**
   * Reset to default settings
   */
  static async resetToDefaults(): Promise<SiteSettings> {
    const db = getDatabase();
    await db.query(
      `UPDATE site_settings SET
        ads_enabled = true,
        site_title = 'RozgarVaani - India Government Jobs',
        contact_email = 'contact@rozgarvaani.in',
        maintenance_mode = false,
        auto_scan_interval_minutes = 30
      WHERE id = 1`
    );

    return this.get();
  }

  /**
   * Map database row to SiteSettings type
   */
  private static mapRowToSettings(row: any): SiteSettings {
    return {
      adsEnabled: row.ads_enabled,
      siteTitle: row.site_title,
      contactEmail: row.contact_email,
      maintenanceMode: row.maintenance_mode,
      autoScanIntervalMinutes: row.auto_scan_interval_minutes,
    };
  }
}
