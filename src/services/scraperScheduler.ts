/**
 * Web Scraper Scheduler + AI Pipeline Processor
 * 
 * Manages automated scraping tasks using node-cron
 * API Data → Simplified 5-Stage AI Pipeline → Published Articles
 */

import cron from 'node-cron';
import { isDatabaseAvailable } from '../db/database.js';
import { 
  SourceRepository, 
  AuditLogRepository,
  JobRepository
} from '../db/repositories/index.js';
import { sarkariResultScraper, type ScraperResult, type ScrapedJobData } from './webScraperService.js';
import { simplifiedPipelineService } from './persistentPipelineService.js';
import type { AuditLog, SourceRegistry } from '../types.js';

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
  totalJobsPublished: number;
  nextRun?: Date;
}

/**
 * Scraper Scheduler
 * API Fetch → Minimal AI Pipeline → Direct Publication
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
    totalJobsPublished: 0
  };
  private isProcessing = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      interval: config.interval || '*/15 * * * *', // Every 15 minutes by default
      enabled: config.enabled !== false,
      maxRetries: config.maxRetries || 2,
      onSuccess: config.onSuccess,
      onError: config.onError
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[Scheduler] API scheduler is disabled');
      return;
    }

    if (this.cronJob) {
      console.warn('[Scheduler] Scheduler already running');
      return;
    }

    console.log(`[Scheduler] Starting API → Pipeline scheduler (interval: ${this.config.interval})`);

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
      nextRun: this.cronJob ? new Date(Date.now() + 15 * 60 * 1000) : undefined
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
      totalJobsPublished: 0
    };
    console.log('[Scheduler] Statistics reset');
  }

  /**
   * Execute scraper task
   */
  private async executeScraperTask(): Promise<void> {
    if (this.isProcessing) {
      console.warn('[Scheduler] Task already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      if (!isDatabaseAvailable()) {
        throw new Error('Database is not available');
      }

      console.log('[Scheduler] Starting RapidAPI → Pipeline cycle...');
      this.stats.totalRuns++;

      // Fetch from API
      const result = await this.runScraperWithRetry();

      // Process through pipeline
      await this.processScraperResults(result);

      // Update stats
      this.stats.lastRun = new Date();
      this.stats.lastSuccess = new Date();
      this.stats.successfulRuns++;
      this.stats.totalJobsScraped += result.jobsFound;

      console.log(
        `[Scheduler] ✓ Cycle complete in ${Date.now() - startTime}ms ` +
        `(${result.jobsFound} fetched, published via pipeline)`
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
        `[Scheduler] ✗ Cycle failed after ${Date.now() - startTime}ms: ${errorMsg}`
      );

      try {
        const auditLog: AuditLog = {
          id: `aud-scraper-error-${Date.now()}`,
          adminUser: 'Scheduler',
          action: 'SCRAPER_ERROR',
          details: `RapidAPI scheduler error: ${errorMsg}`,
          ipAddress: '127.0.0.1',
          timestamp: new Date().toISOString()
        };
        AuditLogRepository.create(auditLog);
      } catch (auditError) {
        console.error('[Scheduler] Failed to log error:', auditError);
      }

      if (this.config.onError) {
        this.config.onError(error instanceof Error ? error : new Error(errorMsg));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch from RapidAPI with retry
   */
  private async runScraperWithRetry(attempt = 1): Promise<ScraperResult> {
    try {
      return await sarkariResultScraper.fetchLatestJobs();
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
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
   * Process scraped data through simplified 5-stage pipeline
   * API Data → DISCOVERY → EXTRACTION → CONTENT → SEO → FINAL_QA → Published Article
   */
  private async processScraperResults(result: ScraperResult): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new Error('Database not available for pipeline processing');
    }

    if (!result.success || result.jobs.length === 0) {
      console.log('[Scheduler] No jobs in API response');
      return;
    }

    console.log(`[Scheduler] ▶ Sending ${result.jobs.length} jobs through 5-stage AI pipeline...`);

    let publishedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < result.jobs.length; idx++) {
      const job = result.jobs[idx];
      const jobNum = `[${idx + 1}/${result.jobs.length}]`;

      try {
        console.log(`[Scheduler] ${jobNum} Processing: "${job.title.substring(0, 40)}..."`);

        // Check for duplicate
        const existing = await this.checkJobExists(job);
        if (existing) {
          console.log(`[Scheduler] ${jobNum} ⊘ Already published (duplicate)`);
          failedCount++;
          continue;
        }

        // Execute minimal pipeline (5 stages with fallbacks)
        console.log(`[Scheduler] ${jobNum} ▶ Executing AI pipeline...`);
        const pipelineResult = await simplifiedPipelineService.executePipeline({
          title: job.title,
          organization: job.organization,
          postNames: job.postNames,
          totalVacancies: job.totalVacancies,
          qualification: job.qualification,
          ageMin: job.ageMin,
          ageMax: job.ageMax,
          applicationEnd: job.applicationEnd,
          applicationStart: job.applicationStart,
          examDate: job.examDate,
          category: job.category,
          postUrl: job.postUrl,
          source: job.source
        });

        if (pipelineResult.success && pipelineResult.job) {
          publishedCount++;
          this.stats.totalJobsPublished++;
          console.log(`[Scheduler] ${jobNum} ✓ Published: "${pipelineResult.job.title}"`);
        } else {
          failedCount++;
          const err = pipelineResult.error || 'Unknown error';
          console.error(`[Scheduler] ${jobNum} ✗ Pipeline failed: ${err}`);
          errors.push(`Job ${idx + 1}: ${err}`);
        }

      } catch (error) {
        failedCount++;
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Scheduler] ${jobNum} ✗ Error: ${errMsg}`);
        errors.push(`Job ${idx + 1}: ${errMsg}`);
      }
    }

    // Update source registry
    try {
      const sourceReg = sarkariResultScraper.createSourceRegistry();
      sourceReg.lastScan = new Date().toISOString();
      sourceReg.lastSuccessfulScan = new Date().toISOString();
      sourceReg.jobsExtractedCount += publishedCount;

      const existing = SourceRepository.findByName(sourceReg.name);
      if (existing) {
        SourceRepository.update(existing.id, sourceReg);
      } else {
        SourceRepository.create(sourceReg);
      }
    } catch (error) {
      console.warn('[Scheduler] Failed to update source:', error);
    }

    // Audit log
    try {
      const auditLog: AuditLog = {
        id: `aud-scraper-${Date.now()}`,
        adminUser: 'Scheduler',
        action: 'SCRAPER_RUN',
        details: `RapidAPI: ${result.jobsFound} fetched → Pipeline: ${publishedCount} published, ${failedCount} failed`,
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString()
      };
      AuditLogRepository.create(auditLog);
    } catch (error) {
      console.warn('[Scheduler] Failed to log audit:', error);
    }

    console.log(
      `[Scheduler] ✓ Pipeline cycle complete: ${publishedCount} published, ${failedCount} failed`
    );

    if (errors.length > 0) {
      console.warn('[Scheduler] Errors encountered:', errors.slice(0, 3).join(' | '));
    }
  }

  /**
   * Check if job already exists
   */
  private async checkJobExists(job: ScrapedJobData): Promise<boolean> {
    try {
      const existing = await JobRepository.findByOrgAndTitle(job.organization, job.title);
      return !!existing;
    } catch (error) {
      console.warn('[Scheduler] Error checking for duplicate:', error);
      return false;
    }
  }

  /**
   * Run scraper manually (triggered by admin via API)
   */
  async runManually(): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      console.log('[Scheduler] Admin triggered manual scraper run');
      if (this.isProcessing) {
        return {
          success: false,
          error: 'Scraper is already processing. Please wait for current run to complete.'
        };
      }

      this.isProcessing = true;
      const startTime = Date.now();

      try {
        if (!isDatabaseAvailable()) {
          throw new Error('Database is not available');
        }

        // Fetch from API
        const result = await this.runScraperWithRetry();

        // Process through pipeline
        await this.processScraperResults(result);

        this.stats.totalRuns++;
        this.stats.lastRun = new Date();
        this.stats.lastSuccess = new Date();
        this.stats.successfulRuns++;
        this.stats.totalJobsScraped += result.jobsFound;

        console.log(`[Scheduler] ✓ Manual run complete in ${Date.now() - startTime}ms`);

        return {
          success: true,
          result: {
            jobsFound: result.jobsFound,
            jobsProcessed: result.jobs.length,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.stats.lastError = errorMsg;
        this.stats.failedRuns++;

        console.error(`[Scheduler] ✗ Manual run failed: ${errorMsg}`);

        return {
          success: false,
          error: errorMsg
        };
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get scheduler info (for admin dashboard)
   */
  getInfo() {
    return {
      isRunning: this.stats.isRunning,
      interval: this.config.interval,
      lastRun: this.stats.lastRun,
      lastSuccess: this.stats.lastSuccess,
      lastError: this.stats.lastError,
      totalRuns: this.stats.totalRuns,
      successfulRuns: this.stats.successfulRuns,
      failedRuns: this.stats.failedRuns,
      totalJobsScraped: this.stats.totalJobsScraped,
      totalJobsPublished: this.stats.totalJobsPublished,
      nextRun: this.stats.nextRun
    };
  }
}

// Export singleton
export const scraperScheduler = new ScraperScheduler();
