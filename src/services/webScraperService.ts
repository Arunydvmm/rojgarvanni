/**
 * Sarkari Result API Service (RapidAPI)
 * 
 * Fetches government job postings from RapidAPI Sarkari Result endpoint
 * No web scraping needed - clean JSON API data
 * API limit: 1000 requests per month
 */

import axios, { AxiosInstance } from 'axios';
import type { GovtJobDraft, SourceRegistry, AgentLog } from '../types.js';

export interface ScraperConfig {
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ScrapedJobData {
  title: string;
  organization?: string;
  postNames: string[];
  totalVacancies?: number;
  qualification?: string;
  ageMin?: number;
  ageMax?: number;
  applicationEnd?: string;
  applicationStart?: string;
  examDate?: string;
  category?: string;
  postUrl: string;
  scrapedAt: string;
  source?: 'jobs' | 'admissions' | 'results';
}

export interface ScraperResult {
  success: boolean;
  timestamp: string;
  sourceUrl: string;
  jobsFound: number;
  jobsProcessed: number;
  jobs: ScrapedJobData[];
  errors?: string[];
  duration: number;
}

/**
 * Sarkari Result API Client (RapidAPI)
 * Uses official API instead of web scraping
 * Endpoints: /jobs, /admissions, /results
 */
export class SarkariResultScraper {
  private axiosInstance: AxiosInstance;
  private apiKey: string;
  private config: Required<ScraperConfig>;
  private readonly RAPIDAPI_HOST = 'sarkari-result.p.rapidapi.com';
  private readonly RAPIDAPI_BASE_URL = 'https://sarkari-result.p.rapidapi.com';
  private readonly ENDPOINTS = {
    jobs: '/jobs',
    admissions: '/admissions',
    results: '/results'
  };

  constructor(config: ScraperConfig = {}) {
    this.apiKey = config.apiKey || process.env.SARKARI_RESULT_API_KEY || '';
    this.config = {
      apiKey: this.apiKey,
      timeout: config.timeout || 15000,
      retryAttempts: config.retryAttempts || 2, // Lower for API to respect rate limits
      retryDelay: config.retryDelay || 3000 // Longer delay for API
    };

    this.axiosInstance = axios.create({
      baseURL: this.RAPIDAPI_BASE_URL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': this.RAPIDAPI_HOST,
        'x-rapidapi-key': this.apiKey
      }
    });

    if (!this.apiKey) {
      console.warn('[Scraper] SARKARI_RESULT_API_KEY not configured - scraper disabled');
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch from API with retry logic
   */
  private async fetchWithRetry(endpoint: string): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`[Scraper] Fetching ${endpoint} (attempt ${attempt}/${this.config.retryAttempts})`);
        const response = await this.axiosInstance.get(endpoint);
        
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[Scraper] Attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.config.retryAttempts) {
          // Exponential backoff to respect rate limits
          const delayMs = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[Scraper] Waiting ${delayMs}ms before retry...`);
          await this.delay(delayMs);
        }
      }
    }

    throw new Error(`Failed to fetch ${endpoint} after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Parse API response and convert to ScrapedJobData
   */
  private parseJobData(item: any, source: 'jobs' | 'admissions' | 'results'): ScrapedJobData | null {
    try {
      // Handle different response formats from different endpoints
      const title = item.title || item.post_name || item.name || '';
      if (!title) return null;

      const organization = item.organization || item.org || item.company || '';
      const postUrl = item.link || item.url || item.apply_url || `https://sarkariresult.com`;

      // Parse vacancies
      const vacanciesStr = String(item.vacancies || item.total_vacancies || '0');
      const totalVacancies = parseInt(vacanciesStr.match(/\d+/)?.[0] || '0', 10) || 0;

      // Parse dates
      const applicationEnd = item.last_date || item.application_end || item.deadline;
      const applicationStart = item.start_date || item.application_start;
      const examDate = item.exam_date || item.written_exam_date;

      // Parse qualification
      const qualification = item.qualification || item.eligibility || item.required_qualification || 'Graduation';

      // Parse age
      let ageMin = 18;
      let ageMax = 35;
      if (item.age_limit || item.age) {
        const ageMatch = String(item.age_limit || item.age).match(/(\d+)\s*-\s*(\d+)/);
        if (ageMatch) {
          ageMin = parseInt(ageMatch[1], 10);
          ageMax = parseInt(ageMatch[2], 10);
        }
      }

      // Determine category
      let category = item.category || 'Central Government';
      if (title.includes('SSC')) category = 'SSC';
      else if (title.includes('UPSC')) category = 'UPSC';
      else if (title.includes('Bank')) category = 'Banking';
      else if (title.includes('Railway')) category = 'Railway';
      else if (title.includes('Police')) category = 'Police';

      const scraped: ScrapedJobData = {
        title: title.trim(),
        organization: organization.trim() || 'Government of India',
        postNames: [title.trim()],
        totalVacancies,
        qualification: qualification.trim(),
        ageMin,
        ageMax,
        applicationEnd,
        applicationStart,
        examDate,
        category,
        postUrl: postUrl.trim(),
        scrapedAt: new Date().toISOString(),
        source
      };

      return scraped;
    } catch (error) {
      console.error('[Scraper] Error parsing job data:', error);
      return null;
    }
  }

  /**
   * Fetch latest jobs from RapidAPI
   */
  async fetchLatestJobs(): Promise<ScraperResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        sourceUrl: this.RAPIDAPI_BASE_URL,
        jobsFound: 0,
        jobsProcessed: 0,
        jobs: [],
        errors: ['SARKARI_RESULT_API_KEY not configured'],
        duration: Date.now() - startTime
      };
    }

    const allJobs: ScrapedJobData[] = [];
    const errors: string[] = [];

    try {
      console.log('[Scraper] Starting API fetch from RapidAPI Sarkari Result endpoints...');

      // Fetch from /jobs endpoint
      try {
        console.log('[Scraper] Fetching /jobs endpoint...');
        const jobsData = await this.fetchWithRetry(this.ENDPOINTS.jobs);
        
        if (Array.isArray(jobsData)) {
          jobsData.forEach((item: any) => {
            const parsed = this.parseJobData(item, 'jobs');
            if (parsed) allJobs.push(parsed);
          });
          console.log(`[Scraper] ✓ Fetched ${jobsData.length} items from /jobs`);
        } else if (jobsData && typeof jobsData === 'object') {
          const parsed = this.parseJobData(jobsData, 'jobs');
          if (parsed) allJobs.push(parsed);
          console.log(`[Scraper] ✓ Fetched 1 item from /jobs`);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[Scraper] ⚠ Failed to fetch /jobs:`, errMsg);
        errors.push(`jobs endpoint: ${errMsg}`);
      }

      // Fetch from /admissions endpoint (if different from jobs)
      try {
        console.log('[Scraper] Fetching /admissions endpoint...');
        const admissionsData = await this.fetchWithRetry(this.ENDPOINTS.admissions);
        
        if (Array.isArray(admissionsData)) {
          admissionsData.forEach((item: any) => {
            const parsed = this.parseJobData(item, 'admissions');
            if (parsed) allJobs.push(parsed);
          });
          console.log(`[Scraper] ✓ Fetched ${admissionsData.length} items from /admissions`);
        } else if (admissionsData && typeof admissionsData === 'object') {
          const parsed = this.parseJobData(admissionsData, 'admissions');
          if (parsed) allJobs.push(parsed);
          console.log(`[Scraper] ✓ Fetched 1 item from /admissions`);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[Scraper] ⚠ Failed to fetch /admissions:`, errMsg);
        errors.push(`admissions endpoint: ${errMsg}`);
      }

      // Deduplication by title + organization
      const deduped = new Map<string, ScrapedJobData>();
      allJobs.forEach((job) => {
        const key = `${job.title}|${job.organization}`;
        if (!deduped.has(key)) {
          deduped.set(key, job);
        }
      });

      const uniqueJobs = Array.from(deduped.values());

      console.log(`[Scraper] ✓ Fetch complete: ${uniqueJobs.length} unique jobs found`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        sourceUrl: this.RAPIDAPI_BASE_URL,
        jobsFound: uniqueJobs.length,
        jobsProcessed: uniqueJobs.length,
        jobs: uniqueJobs,
        errors: errors.length > 0 ? errors : undefined,
        duration: Date.now() - startTime
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[Scraper] Fatal error:', errMsg);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        sourceUrl: this.RAPIDAPI_BASE_URL,
        jobsFound: 0,
        jobsProcessed: allJobs.length,
        jobs: allJobs,
        errors: [errMsg],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Convert scraped job data to draft for admin review
   */
  convertToDraft(job: ScrapedJobData): GovtJobDraft {
    const slug = `${job.organization.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const applicationEnd = job.applicationEnd || '2026-12-31';
    const daysLeft = Math.ceil((new Date(applicationEnd).getTime() - Date.now()) / 86_400_000);

    const draft: GovtJobDraft = {
      id: `draft-${Date.now()}`,
      slug,
      title: job.title,
      organization: job.organization || 'Government of India',
      department: 'Government Ministry/Department',
      advertisementNumber: `${job.category}/${Date.now()}`,
      category: job.category || 'Central Government',
      state: 'All India',
      postNames: job.postNames || [job.title],
      totalVacancies: job.totalVacancies || 0,
      categoryWiseVacancies: {
        ur: Math.floor((job.totalVacancies || 0) * 0.45),
        obc: Math.floor((job.totalVacancies || 0) * 0.27),
        sc: Math.floor((job.totalVacancies || 0) * 0.15),
        st: Math.floor((job.totalVacancies || 0) * 0.08),
        ews: Math.floor((job.totalVacancies || 0) * 0.05)
      },
      qualification: job.qualification || 'Graduation',
      qualificationDetails: 'As per official notification',
      ageMin: job.ageMin || 18,
      ageMax: job.ageMax || 35,
      ageRelaxation: 'As per government rules (SC/ST: +5 years, OBC: +3 years)',
      applicationStart: job.applicationStart || new Date().toISOString().split('T')[0],
      applicationEnd,
      feePaymentDeadline: job.applicationEnd || applicationEnd,
      examDate: job.examDate || 'To be announced',
      applicationFee: {
        generalObc: '₹100',
        scSt: '₹0',
        female: '₹0'
      },
      salary: {
        payLevel: 'As per notification',
        payScale: 'As per notification',
        basicPay: 'Not specified in source'
      },
      selectionProcess: ['Written Examination', 'Document Verification'],
      howToApply: ['Visit official website', 'Register and apply online', 'Pay application fee (if applicable)'],
      overview: `${job.organization} is recruiting ${job.totalVacancies || 'multiple'} candidates for various positions. This is a government job opportunity with competitive salary and benefits. Apply before ${applicationEnd}.`,
      status: 'NEW',
      isClosingSoon: daysLeft >= 0 && daysLeft <= 7,
      links: {
        applyUrl: job.postUrl || '',
        notificationUrl: job.postUrl || '',
        officialWebsiteUrl: 'https://www.sarkariresult.com/'
      },
      sourceInfo: {
        name: 'RapidAPI Sarkari Result',
        type: 'API Fetch',
        lastVerified: new Date().toISOString().split('T')[0],
        evidenceText: `Fetched from ${job.source} endpoint. Source: ${job.postUrl}`
      },
      verificationStatus: 'PENDING',
      qualityStatus: 'PENDING',
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verificationReport: {
        verificationStatus: 'PENDING',
        qualityScore: 0,
        checkedFields: [],
        criticalErrors: [],
        warnings: ['This is a draft from API - requires admin review and verification'],
        evidenceText: `API Source: ${job.source}`,
        verifiedAt: new Date().toISOString()
      },
      agentLogs: []
    };

    return draft;
  }

  /**
   * Create source registry entry for RapidAPI
   */
  createSourceRegistry(): SourceRegistry {
    return {
      id: 'src-rapidapi-sarkari-result',
      name: 'RapidAPI Sarkari Result',
      url: this.RAPIDAPI_BASE_URL,
      type: 'API',
      crawlFrequency: 15,
      lastScan: new Date().toISOString(),
      lastSuccessfulScan: new Date().toISOString(),
      jobsExtractedCount: 0,
      isActive: !!this.apiKey,
      permissionNotes: 'RapidAPI - 1000 requests/month limit. Respects rate limits.'
    };
  }
}

// Export singleton instance
export const sarkariResultScraper = new SarkariResultScraper();
