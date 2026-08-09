/**
 * Settings Repository - CRUD operations for site settings (singleton)
 */

import { getDatabase } from '../database.js';
import type { SiteSettings } from '../../types.js';

export class SettingsRepository {
  /**
   * Get site settings (singleton - always ID 1)
   */
  static get(): SiteSettings {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM site_settings WHERE id = 1');
    const row = stmt.get() as any;

    if (!row) {
      // Should never happen due to INSERT OR IGNORE in schema, but handle gracefully
      throw new Error('Site settings not initialized');
    }

    return this.mapRowToSettings(row);
  }

  /**
   * Update site settings
   */
  static update(updates: Partial<SiteSettings>): SiteSettings {
    const existing = this.get();
    const updated = { ...existing, ...updates };

    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE site_settings SET
        ads_enabled = @ads_enabled,
        site_title = @site_title,
        contact_email = @contact_email,
        maintenance_mode = @maintenance_mode,
        auto_scan_interval_minutes = @auto_scan_interval_minutes
      WHERE id = 1
    `);

    stmt.run({
      ads_enabled: updated.adsEnabled ? 1 : 0,
      site_title: updated.siteTitle,
      contact_email: updated.contactEmail,
      maintenance_mode: updated.maintenanceMode ? 1 : 0,
      auto_scan_interval_minutes: updated.autoScanIntervalMinutes,
    });

    return updated;
  }

  /**
   * Enable/disable ads
   */
  static setAdsEnabled(enabled: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE site_settings SET ads_enabled = ? WHERE id = 1');
    stmt.run(enabled ? 1 : 0);
  }

  /**
   * Enable/disable maintenance mode
   */
  static setMaintenanceMode(enabled: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE site_settings SET maintenance_mode = ? WHERE id = 1');
    stmt.run(enabled ? 1 : 0);
  }

  /**
   * Update auto-scan interval
   */
  static setAutoScanInterval(minutes: number): void {
    const db = getDatabase();
    const stmt = db.prepare(
      'UPDATE site_settings SET auto_scan_interval_minutes = ? WHERE id = 1'
    );
    stmt.run(minutes);
  }

  /**
   * Reset to default settings
   */
  static resetToDefaults(): SiteSettings {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE site_settings SET
        ads_enabled = 1,
        site_title = 'RozgarVaani - India Government Jobs',
        contact_email = 'contact@rozgarvaani.in',
        maintenance_mode = 0,
        auto_scan_interval_minutes = 30
      WHERE id = 1
    `);
    stmt.run();

    return this.get();
  }

  /**
   * Map database row to SiteSettings type
   */
  private static mapRowToSettings(row: any): SiteSettings {
    return {
      adsEnabled: row.ads_enabled === 1,
      siteTitle: row.site_title,
      contactEmail: row.contact_email,
      maintenanceMode: row.maintenance_mode === 1,
      autoScanIntervalMinutes: row.auto_scan_interval_minutes,
    };
  }
}
