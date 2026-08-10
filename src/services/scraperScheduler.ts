/**
 * Web Scraper Scheduler
 * 
 * Manages automated scraping tasks using node-cron
 * Runs scraper every 15 minutes and integrates results into the database
 */

import cron from 'node-cron';
import { isDatabaseAvailable } from '../db/database.js';
import { 
  DraftRepository, 
  SourceRepository, 
  AgentLogRepository,
  AuditLogRepository
} from '../db/repositories/index.js';
import { sarkariResultScraper, type ScraperResult, type ScrapedJobData } from './webScraperService.js';
import type { GovtJobDraft, AgentLog, AuditLog, SourceRegistry } from '../types.js';

export interface SchedulerConfig {
  interval: string; // Cron expression
  enabled: boolean;
  maxRetries: number;
  onSuccess?: (result: ScraperResult) => void;
  onError?: (error: Error) => void;
}

export interface ScraperStats {
  isRunning: boolean;
  lastRun?: Date;
  lastSuccess?: Date;
  lastError?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalJobsScraped: number;
  totalJobsProcessed: number;
  nextRun?: Date;
}

/**
 * Scraper Scheduler
 * Manages cron jobs for automated scraping
 */
export class ScraperScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private config: Required<SchedulerConfig>;
  private stats: ScraperStats = {
    isRunning: false,
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    totalJobsScraped: 0,
    totalJobsProcessed: 0
  };
  private isProcessing = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      interval: config.interval || '*/15 * * * *', // Every 15 minutes by default
      enabled: config.enabled !== false,
      maxRetries: config.maxRetries || 3,
      onSuccess: config.onSuccess,
      onError: config.onError
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[Scheduler] Scraper scheduler is disabled');
      return;
    }

    if (this.cronJob) {
      console.warn('[Scheduler] Scheduler already running');
      return;
    }

    console.log(`[Scheduler] Starting web scraper scheduler (interval: ${this.config.interval})`);

    this.cronJob = cron.schedule(this.config.interval, () => {
      this.executeScraperTask();
    });

    this.stats.isRunning = true;
    console.log('[Scheduler] ✓ Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.cronJob) {
      console.warn('[Scheduler] Scheduler is not running');
      return;
    }

    this.cronJob.stop();
    this.cronJob = null;
    this.stats.isRunning = false;
    console.log('[Scheduler] ✓ Scheduler stopped');
  }

  /**
   * Get scheduler statistics
   */
  getStats(): ScraperStats {
    return {
      ...this.stats,
      nextRun: this.cronJob ? new Date(Date.now() + 15 * 60 * 1000) : undefined // Estimate next run
    };
  }

  /**
   * Reset scheduler statistics
   */
  resetStats(): void {
    this.stats = {
      isRunning: this.stats.isRunning,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalJobsScraped: 0,
      totalJobsProcessed: 0
    };
    console.log('[Scheduler] Statistics reset');
  }

  /**
   * Execute scraper task
   */
  private async executeScraperTask(): Promise<void> {
    // Prevent concurrent executions
    if (this.isProcessing) {
      console.warn('[Scheduler] Scraper task already in progress, skipping this cycle');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      // Check database availability
      if (!isDatabaseAvailable()) {
        throw new Error('Database is not available - cannot process scraped data');
      }

      console.log('[Scheduler] Starting scraper task...');
      this.stats.totalRuns++;

      // Run scraper
      const result = await this.runScraperWithRetry();

      // Process results
      await this.processScraperResults(result);

      // Update stats
      this.stats.lastRun = new Date();
      this.stats.lastSuccess = new Date();
      this.stats.successfulRuns++;
      this.stats.totalJobsScraped += result.jobsFound;
      this.stats.totalJobsProcessed += result.jobsProcessed;

      console.log(
        `[Scheduler] ✓ Scraper task completed successfully in ${Date.now() - startTime}ms ` +
        `(${result.jobsProcessed} jobs processed)`
      );

      if (this.config.onSuccess) {
        this.config.onSuccess(result);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      this.stats.lastRun = new Date();
      this.stats.lastError = errorMsg;
      this.stats.failedRuns++;

      console.error(
        `[Scheduler] ✗ Scraper task failed after ${Date.now() - startTime}ms: ${errorMsg}`
      );

      // Log to audit trail
      try {
        const auditLog: AuditLog = {
          id: `aud-scraper-error-${Date.now()}`,
          adminUser: 'Scheduler',
          action: 'SCRAPER_ERROR',
          details: `Web scraper failed: ${errorMsg}`,
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString()
        };
        AuditLogRepository.create(auditLog);
      } catch (auditError) {
        console.error('[Scheduler] Failed to log error to audit trail:', auditError);
      }

      if (this.config.onError) {
        this.config.onError(error instanceof Error ? error : new Error(errorMsg));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Run scraper with retry logic
   */
  private async runScraperWithRetry(attempt = 1): Promise<ScraperResult> {
    try {
      return await sarkariResultScraper.scrapeJobs();
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(
          `[Scheduler] Retry ${attempt}/${this.config.maxRetries} after ${delay}ms: ` +
          `${error instanceof Error ? error.message : error}`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.runScraperWithRetry(attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Process scraper results and save to database
   */
  private async processScraperResults(result: ScraperResult): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available for processing results');
    }

    if (!result.success || result.jobs.length === 0) {
      console.log('[Scheduler] No new jobs found from scraper');
      return;
    }

    console.log(`[Scheduler] ▶ Processing ${result.jobs.length} scraped jobs...`);

    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < result.jobs.length; idx++) {
      const scrapedJob = result.jobs[idx];
      console.log(`[Scheduler] [${idx + 1}/${result.jobs.length}] Processing: "${scrapedJob.title.substring(0, 40)}..."`);

      try {
        // Check if job already exists (by URL and organization)
        const existingJob = await this.checkJobExists(scrapedJob);
        
        if (existingJob) {
          console.log(`[Scheduler] [${idx + 1}] ⊘ Skipped (duplicate)`);
          skippedCount++;
          continue;
        }

        // Convert scraped data to draft DIRECTLY (no pipeline for scraped jobs)
        console.log(`[Scheduler] [${idx + 1}] Converting to draft...`);
        const draft = sarkariResultScraper.convertToDraft(scrapedJob);
        console.log(`[Scheduler] [${idx + 1}] Draft ID: ${draft.id}`);

        // Save draft to database
        try {
          console.log(`[Scheduler] [${idx + 1}] Saving draft to database...`);
          await DraftRepository.create(draft);
          createdCount++;
          console.log(`[Scheduler] [${idx + 1}] ✓ Created draft: ${draft.title.substring(0, 50)}...`);
        } catch (dbError) {
          const errorMsg = dbError instanceof Error ? dbError.message : String(dbError);
          console.error(`[Scheduler] [${idx + 1}] ✗ Failed to save draft: ${errorMsg}`);
          skippedCount++;
          errors.push(`Job ${idx + 1}: ${errorMsg}`);
          continue;
        }

        // Create agent log entry
        const agentLog: AgentLog = {
          id: `alg-scraper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          itemTitle: draft.title,
          agentType: 'DISCOVERY',
          status: 'SUCCESS',
          durationMs: 100,
          modelUsed: 'SarkariResult Scraper',
          inputSummary: `Scraped job from sarkariresult.com: ${scrapedJob.postUrl}`,
          outputSummary: `Created draft ready for admin review`,
          evidenceText: `Source: ${scrapedJob.postUrl}`,
          timestamp: new Date().toISOString()
        };

        try {
          await AgentLogRepository.create(agentLog);
          console.log(`[Scheduler] [${idx + 1}] ✓ Logged agent execution`);
        } catch (logError) {
          console.warn(`[Scheduler] [${idx + 1}] ⚠ Failed to create agent log:`, logError);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Scheduler] [${idx + 1}] ✗ Error processing job: ${errorMsg}`);
        console.error(`[Scheduler] [${idx + 1}] Stack:`, error instanceof Error ? error.stack : 'no stack');
        errors.push(`Job ${idx + 1}: ${errorMsg}`);
      }
    }

    // Update source registry
    try {
      const sourceReg = sarkariResultScraper.createSourceRegistry();
      sourceReg.lastScan = new Date().toISOString();
      sourceReg.lastSuccessfulScan = new Date().toISOString();
      sourceReg.jobsExtractedCount += createdCount;

      const existing = SourceRepository.findByName(sourceReg.name);
      if (existing) {
        SourceRepository.update(existing.id, sourceReg);
      } else {
        SourceRepository.create(sourceReg);
      }
    } catch (error) {
      console.warn('[Scheduler] Failed to update source registry:', error);
    }

    // Log summary
    const auditLog: AuditLog = {
      id: `aud-scraper-${Date.now()}`,
      adminUser: 'Scheduler',
      action: 'SCRAPER_RUN',
      details: `Scraper found ${result.jobsFound} jobs, created ${createdCount} drafts, skipped ${skippedCount}`,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString()
    };

    try {
      AuditLogRepository.create(auditLog);
    } catch (error) {
      console.warn('[Scheduler] Failed to create audit log:', error);
    }

    console.log(
      `[Scheduler] Processing complete: Created ${createdCount}, Skipped ${skippedCount}, ` +
      `Errors: ${errors.length}`
    );

    if (errors.length > 0) {
      console.warn('[Scheduler] Some errors occurred during processing:', errors);
    }
  }

  /**
   * Check if job already exists in database
   */
  private async checkJobExists(scrapedJob: ScrapedJobData): Promise<boolean> {
    try {
      // Check by URL hash or title similarity
      // For now, we'll always create new drafts and let AI dedup handle it
      return false;
    } catch (error) {
      console.warn('[Scheduler] Error checking job existence:', error);
      return false;
    }
  }

  /**
   * Manual trigger for scraper (for testing/debugging)
   */
  async runManually(): Promise<{ success: boolean; result?: ScraperResult; error?: string }> {
    console.log('[Scheduler] ▶ Manual scraper run initiated');
    this.isProcessing = true;
    const startTime = Date.now();

    try {
      if (!isDatabaseAvailable()) {
        throw new Error('Database is not available - cannot process scraped data');
      }

      // Run scraper
      const result = await this.runScraperWithRetry();
      console.log(`[Scheduler] ✓ Scrape completed in ${Date.now() - startTime}ms: ${result.jobsFound} jobs found`);

      // Process results (save to database)
      await this.processScraperResults(result);

      console.log(`[Scheduler] ✓ Manual run completed in ${Date.now() - startTime}ms`);
      return { success: true, result };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Scheduler] ✗ Manual run failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get scheduler info
   */
  getInfo() {
    return {
      enabled: this.config.enabled,
      interval: this.config.interval,
      isRunning: this.stats.isRunning,
      isProcessing: this.isProcessing,
      stats: this.getStats()
    };
  }
}

/**
 * Create and export scheduler instance
 */
export const scraperScheduler = new ScraperScheduler({
  interval: '*/15 * * * *', // Every 15 minutes
  enabled: true,
  maxRetries: 3
});