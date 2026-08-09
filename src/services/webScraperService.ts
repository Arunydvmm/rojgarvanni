/**
 * Web Scraper Service for sarkariresult.com
 * 
 * Fetches government job postings from sarkariresult.com every 15 minutes
 * Parses HTML content and extracts relevant job information
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import type { GovtJob, GovtJobDraft, SourceRegistry, AgentLog } from '../types.js';

export interface ScraperConfig {
  targetUrl: string;
  headers?: Record<string, string>;
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
 * SarkariResult Web Scraper
 * Extracts job postings from sarkariresult.com
 */
export class SarkariResultScraper {
  private axiosInstance: AxiosInstance;
  private config: Required<ScraperConfig>;
  private scrapedUrls: Set<string> = new Set();

  constructor(config: ScraperConfig = {}) {
    this.config = {
      targetUrl: config.targetUrl || 'https://www.sarkariresult.com/',
      headers: config.headers || {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: config.timeout || 15000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 2000
    };

    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: this.config.headers
    });
  }

  /**
   * Fetch HTML content from target URL with retry logic
   */
  private async fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`[Scraper] Fetching (attempt ${attempt}/${this.config.retryAttempts}): ${url}`);
        const response = await this.axiosInstance.get(url);
        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[Scraper] Attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse job listing table/article from HTML
   */
  private parseJobPostings($: cheerio.CheerioAPI, html: string): ScrapedJobData[] {
    const jobs: ScrapedJobData[] = [];

    try {
      // Target job article containers (sarkariresult.com uses various selectors)
      const selectors = [
        'article',
        '.post',
        '.job-posting',
        'div[class*="job"]',
        'div[class*="vacancy"]',
        'table tr'
      ];

      for (const selector of selectors) {
        $(selector).each((index, element) => {
          try {
            const $element = $(element);
            const text = $element.text();

            // Extract job title
            const titleMatch = text.match(/^([^:]+(?:Recruitment|Notification|Vacancy|Admit|Result))/i);
            if (!titleMatch) return;

            const title = titleMatch[1].trim().substring(0, 200);

            // Extract organization name
            const orgMatch = text.match(/(?:Ministry|Department|Board|Commission|Authority|Bank|Railway|SSC)[\w\s]*/i);
            const organization = orgMatch ? orgMatch[0].trim() : 'Government of India';

            // Extract key numbers
            const vacancyMatch = text.match(/(\d+)\s*(?:vacancy|vacancies|post|position)/i);
            const totalVacancies = vacancyMatch ? parseInt(vacancyMatch[1]) : undefined;

            const ageMatch = text.match(/(\d+)\s*(?:to|–|-)\s*(\d+)\s*years?/i);
            const ageMin = ageMatch ? parseInt(ageMatch[1]) : undefined;
            const ageMax = ageMatch ? parseInt(ageMatch[2]) : undefined;

            // Extract dates
            const datePattern = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/g;
            const dates: string[] = [];
            let dateMatch;
            while ((dateMatch = datePattern.exec(text)) !== null) {
              const date = `${dateMatch[3]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[1]).padStart(2, '0')}`;
              dates.push(date);
            }

            const applicationEnd = dates[dates.length - 1] || undefined;
            const applicationStart = dates[0] || undefined;

            // Extract qualification
            const qualMatch = text.match(/(?:Qualification|Eligibility)[\s:]*([^.!?\n]+)/i);
            const qualification = qualMatch ? qualMatch[1].trim().substring(0, 100) : undefined;

            // Extract category
            const categoryKeywords = ['SSC', 'UPSC', 'Railway', 'Banking', 'Defence', 'Police', 'Teaching', 'State'];
            const category = categoryKeywords.find(cat => text.includes(cat)) || 'Central Government';

            // Get link URL
            const linkElement = $element.find('a').first();
            const postUrl = linkElement.attr('href') || '';

            if (!postUrl || this.scrapedUrls.has(postUrl)) return;

            this.scrapedUrls.add(postUrl);

            const jobData: ScrapedJobData = {
              title,
              organization,
              postNames: [title],
              totalVacancies,
              qualification,
              ageMin,
              ageMax,
              applicationEnd,
              applicationStart,
              category,
              postUrl: this.normalizeUrl(postUrl),
              scrapedAt: new Date().toISOString()
            };

            if (title.length > 10 && postUrl.length > 5) {
              jobs.push(jobData);
            }
          } catch (error) {
            console.warn('[Scraper] Error parsing element:', error instanceof Error ? error.message : error);
          }
        });

        if (jobs.length > 0) break; // Stop if we found jobs
      }
    } catch (error) {
      console.error('[Scraper] Error during parsing:', error);
    }

    return jobs;
  }

  /**
   * Normalize URLs to absolute paths
   */
  private normalizeUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `https://www.sarkariresult.com${url}`;
    return `https://www.sarkariresult.com/${url}`;
  }

  /**
   * Main scraping method
   */
  async scrapeJobs(): Promise<ScraperResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const jobs: ScrapedJobData[] = [];

    try {
      console.log('[Scraper] ▶ Starting job scrape from sarkariresult.com');
      console.log(`[Scraper] Target URL: ${this.config.targetUrl}`);
      console.log(`[Scraper] Timeout: ${this.config.timeout}ms, Retries: ${this.config.retryAttempts}`);

      // Fetch main page
      const html = await this.fetchWithRetry(this.config.targetUrl);
      console.log(`[Scraper] ✓ Fetched main page (${html.length} bytes)`);
      
      const $ = cheerio.load(html);

      // Parse job postings
      console.log('[Scraper] Parsing job postings...');
      const parsedJobs = this.parseJobPostings($, html);
      jobs.push(...parsedJobs);

      console.log(`[Scraper] ✓ Parsed ${jobs.length} job postings from main page`);

      // Scrape additional category pages (optional, for more comprehensive data)
      const categoryUrls = [
        'https://www.sarkariresult.com/p/ssc.html',
        'https://www.sarkariresult.com/p/upsc.html',
        'https://www.sarkariresult.com/p/railway.html'
      ];

      for (let catIdx = 0; catIdx < categoryUrls.length; catIdx++) {
        const categoryUrl = categoryUrls[catIdx];
        try {
          console.log(`[Scraper] [${catIdx + 1}/${categoryUrls.length}] Scraping category: ${categoryUrl}`);
          const categoryHtml = await this.fetchWithRetry(categoryUrl);
          const $category = cheerio.load(categoryHtml);
          const categoryJobs = this.parseJobPostings($category, categoryHtml);
          jobs.push(...categoryJobs);
          console.log(`[Scraper] [${catIdx + 1}] ✓ Scraped ${categoryJobs.length} jobs`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.warn(`[Scraper] [${catIdx + 1}] ⚠ Failed to scrape category: ${errorMsg}`);
          errors.push(`Category scrape failed: ${errorMsg}`);
        }
      }

      // Remove duplicate URLs
      const uniqueJobs = jobs.filter((job, index, self) => 
        self.findIndex(j => j.postUrl === job.postUrl) === index
      );

      console.log(`[Scraper] ✓ Total jobs found: ${jobs.length}, Unique: ${uniqueJobs.length}`);
      console.log(`[Scraper] ✓ Scrape completed in ${Date.now() - startTime}ms`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        sourceUrl: this.config.targetUrl,
        jobsFound: jobs.length,
        jobsProcessed: uniqueJobs.length,
        jobs: uniqueJobs,
        errors: errors.length > 0 ? errors : undefined,
        duration: Date.now() - startTime
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Scraper] ✗ Scraping failed:', errorMsg);
      console.error('[Scraper] Stack:', error instanceof Error ? error.stack : 'no stack');

      return {
        success: false,
        timestamp: new Date().toISOString(),
        sourceUrl: this.config.targetUrl,
        jobsFound: 0,
        jobsProcessed: 0,
        jobs: [],
        errors: [errorMsg],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Convert scraped data to GovtJobDraft for AI pipeline
   */
  convertToDraft(scrapedJob: ScrapedJobData): GovtJobDraft {
    const now = new Date().toISOString();
    const slug = scrapedJob.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100);

    return {
      id: `draft-scraped-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      slug,
      title: scrapedJob.title,
      organization: scrapedJob.organization || 'Government of India',
      department: 'Government Department',
      advertisementNumber: `SR-${Date.now()}`,
      category: (scrapedJob.category as any) || 'Central Government',
      state: 'All India',
      postNames: scrapedJob.postNames,
      totalVacancies: scrapedJob.totalVacancies || 0,
      qualification: scrapedJob.qualification || 'As per official notification',
      qualificationDetails: scrapedJob.qualification || 'Check official website for detailed qualification requirements',
      ageMin: scrapedJob.ageMin || 18,
      ageMax: scrapedJob.ageMax || 65,
      ageRelaxation: 'As per government rules',
      applicationStart: scrapedJob.applicationStart || now.split('T')[0],
      applicationEnd: scrapedJob.applicationEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      feePaymentDeadline: scrapedJob.applicationEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      examDate: scrapedJob.examDate || 'To be announced',
      applicationFee: { generalObc: '₹100', scSt: '₹0', female: '₹0' },
      salary: { payLevel: '', payScale: '', basicPay: '' },
      selectionProcess: ['Written Exam', 'Interview', 'Document Verification'],
      howToApply: ['Visit official website', 'Fill online application', 'Pay fee', 'Submit'],
      overview: `Government job notification for ${scrapedJob.title}. For more details visit the official website.`,
      status: 'NEW',
      isClosingSoon: false,
      links: {
        applyUrl: scrapedJob.postUrl,
        notificationUrl: scrapedJob.postUrl,
        officialWebsiteUrl: 'https://www.sarkariresult.com'
      },
      sourceInfo: {
        name: 'SarkariResult.com',
        type: 'RECRUITMENT_BOARD',
        lastVerified: now.split('T')[0],
        officialNotificationUrl: scrapedJob.postUrl,
        evidenceText: `Scraped from sarkariresult.com on ${now}`
      },
      verificationStatus: 'PENDING',
      qualityStatus: 'PENDING',
      isDraft: true,
      createdAt: now,
      updatedAt: now,
      verificationReport: {
        verificationStatus: 'PENDING',
        qualityScore: 0,
        checkedFields: [],
        criticalErrors: [],
        warnings: ['Scraped data - requires AI verification before publishing'],
        evidenceText: `Auto-scraped from sarkariresult.com at ${now}`,
        verifiedAt: now
      },
      agentLogs: []
    };
  }

  /**
   * Create source registry entry
   */
  createSourceRegistry(): SourceRegistry {
    return {
      id: 'src-sarkariresult',
      name: 'SarkariResult.com',
      type: 'RECRUITMENT_BOARD',
      url: 'https://www.sarkariresult.com/',
      status: 'ACTIVE',
      crawlFrequency: 'EVERY_30_MIN',
      lastScan: new Date().toISOString(),
      lastSuccessfulScan: new Date().toISOString(),
      permissionNotes: 'Public government recruitment portal - allowed to scrape',
      parserType: 'SARKARIRESULT_PARSER',
      jobsExtractedCount: 0
    };
  }
}

/**
 * Export scraper instance
 */
export const sarkariResultScraper = new SarkariResultScraper();