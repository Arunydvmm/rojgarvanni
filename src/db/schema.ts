/**
 * SQLite Database Schema for RozgarVaani Government Job Portal
 * 
 * All tables, indexes, and constraints required for production-ready
 * database-first architecture using better-sqlite3.
 * 
 * DESIGN PRINCIPLES:
 * - Single source of truth for all job data
 * - JSONB-style TEXT columns for nested objects (SQLite doesn't have native JSONB)
 * - Unique constraints on organization + advertisement_number for duplicate protection
 * - Indexes on frequently queried columns (status, timestamps, slugs)
 * - Audit trail for all admin actions
 */

export const SCHEMA_VERSION = 1;

/**
 * Main jobs table - published government jobs visible to public
 */
export const JOBS_TABLE = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  department TEXT NOT NULL,
  advertisement_number TEXT,
  category TEXT NOT NULL,
  state TEXT,
  post_names TEXT NOT NULL, -- JSON array
  total_vacancies INTEGER NOT NULL DEFAULT 0,
  category_wise_vacancies TEXT, -- JSON object
  vacancy_details TEXT, -- JSON array of VacancyDetail
  qualification TEXT NOT NULL,
  qualification_details TEXT NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  age_relaxation TEXT NOT NULL,
  application_start TEXT NOT NULL, -- ISO 8601 date string
  application_end TEXT NOT NULL,
  fee_payment_deadline TEXT NOT NULL,
  correction_window TEXT,
  exam_date TEXT NOT NULL,
  admit_card_date TEXT,
  result_date TEXT,
  application_fee TEXT NOT NULL, -- JSON object (ApplicationFee)
  salary TEXT NOT NULL, -- JSON object (SalaryInfo)
  selection_process TEXT NOT NULL, -- JSON array
  how_to_apply TEXT NOT NULL, -- JSON array
  overview TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('NEW', 'ACTIVE', 'CLOSING_SOON', 'TODAY', 'CLOSED')),
  is_closing_soon INTEGER NOT NULL DEFAULT 0, -- boolean as 0/1
  links TEXT NOT NULL, -- JSON object
  source_info TEXT NOT NULL, -- JSON object
  verification_status TEXT NOT NULL CHECK(verification_status IN ('PASSED', 'FAILED', 'PENDING')),
  quality_status TEXT NOT NULL CHECK(quality_status IN ('PASSED', 'FAILED', 'PENDING')),
  is_draft INTEGER NOT NULL DEFAULT 0, -- boolean as 0/1
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  -- Duplicate prevention: each org can only post one job with the same advertisement number
  UNIQUE(organization, advertisement_number)
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_slug ON jobs(slug);
CREATE INDEX IF NOT EXISTS idx_jobs_application_end ON jobs(application_end);
CREATE INDEX IF NOT EXISTS idx_jobs_published_at ON jobs(published_at);
CREATE INDEX IF NOT EXISTS idx_jobs_is_draft ON jobs(is_draft);
CREATE INDEX IF NOT EXISTS idx_jobs_verification_status ON jobs(verification_status);
CREATE INDEX IF NOT EXISTS idx_jobs_org_adv ON jobs(organization, advertisement_number);
`;

/**
 * Drafts table - AI-generated jobs pending admin review
 */
export const DRAFTS_TABLE = `
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  department TEXT NOT NULL,
  advertisement_number TEXT,
  category TEXT NOT NULL,
  state TEXT,
  post_names TEXT NOT NULL,
  total_vacancies INTEGER NOT NULL DEFAULT 0,
  category_wise_vacancies TEXT,
  vacancy_details TEXT,
  qualification TEXT NOT NULL,
  qualification_details TEXT NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  age_relaxation TEXT NOT NULL,
  application_start TEXT NOT NULL,
  application_end TEXT NOT NULL,
  fee_payment_deadline TEXT NOT NULL,
  correction_window TEXT,
  exam_date TEXT NOT NULL,
  admit_card_date TEXT,
  result_date TEXT,
  application_fee TEXT NOT NULL,
  salary TEXT NOT NULL,
  selection_process TEXT NOT NULL,
  how_to_apply TEXT NOT NULL,
  overview TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('NEW', 'ACTIVE', 'CLOSING_SOON', 'TODAY', 'CLOSED')),
  is_closing_soon INTEGER NOT NULL DEFAULT 0,
  links TEXT NOT NULL,
  source_info TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('PASSED', 'FAILED', 'PENDING')),
  quality_status TEXT NOT NULL CHECK(quality_status IN ('PASSED', 'FAILED', 'PENDING')),
  is_draft INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  
  -- Draft-specific fields
  verification_report TEXT NOT NULL, -- JSON object (VerificationReport)
  agent_logs TEXT NOT NULL, -- JSON array of AgentLog
  qa_final_report TEXT, -- JSON object (QAFinalReport) - added after Final QA agent
  
  UNIQUE(organization, advertisement_number)
);

CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
CREATE INDEX IF NOT EXISTS idx_drafts_verification_status ON drafts(verification_status);
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON drafts(created_at);
CREATE INDEX IF NOT EXISTS idx_drafts_org_adv ON drafts(organization, advertisement_number);
`;

/**
 * Exam results table
 */
export const RESULTS_TABLE = `
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  category TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  result_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DECLARED', 'EXPECTED')),
  download_url TEXT NOT NULL,
  official_website_url TEXT NOT NULL,
  notification_url TEXT,
  cut_off_info TEXT,
  overview TEXT,
  is_draft INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('PASSED', 'FAILED', 'PENDING')),
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_results_status ON results(status);
CREATE INDEX IF NOT EXISTS idx_results_result_date ON results(result_date);
CREATE INDEX IF NOT EXISTS idx_results_published_at ON results(published_at);
`;

/**
 * Admit cards table
 */
export const ADMIT_CARDS_TABLE = `
CREATE TABLE IF NOT EXISTS admit_cards (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  category TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  exam_date TEXT NOT NULL,
  admit_card_release_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'SOON')),
  download_url TEXT NOT NULL,
  official_website_url TEXT NOT NULL,
  instructions TEXT, -- JSON array
  overview TEXT,
  is_draft INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('PASSED', 'FAILED', 'PENDING')),
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admit_cards_status ON admit_cards(status);
CREATE INDEX IF NOT EXISTS idx_admit_cards_exam_date ON admit_cards(exam_date);
CREATE INDEX IF NOT EXISTS idx_admit_cards_published_at ON admit_cards(published_at);
`;

/**
 * Answer keys table
 */
export const ANSWER_KEYS_TABLE = `
CREATE TABLE IF NOT EXISTS answer_keys (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  category TEXT NOT NULL,
  exam_name TEXT NOT NULL,
  release_date TEXT NOT NULL,
  objection_deadline TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('RELEASED', 'PROVISIONAL', 'FINAL')),
  download_url TEXT NOT NULL,
  objection_link TEXT,
  official_website_url TEXT NOT NULL,
  overview TEXT,
  is_draft INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('PASSED', 'FAILED', 'PENDING')),
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answer_keys_status ON answer_keys(status);
CREATE INDEX IF NOT EXISTS idx_answer_keys_release_date ON answer_keys(release_date);
CREATE INDEX IF NOT EXISTS idx_answer_keys_published_at ON answer_keys(published_at);
`;

/**
 * Source registry - tracks external data sources for AI pipeline
 */
export const SOURCES_TABLE = `
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('GOVT_PORTAL', 'RECRUITMENT_BOARD', 'PUBLIC_FEED', 'AUTHORIZED_API')),
  url TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'PAUSED', 'ERROR')),
  crawl_frequency TEXT NOT NULL CHECK(crawl_frequency IN ('EVERY_30_MIN', 'HOURLY', 'DAILY')),
  last_scan TEXT NOT NULL,
  last_successful_scan TEXT NOT NULL,
  last_error TEXT,
  permission_notes TEXT NOT NULL,
  parser_type TEXT NOT NULL,
  jobs_extracted_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_last_scan ON sources(last_scan);
`;

/**
 * Agent execution logs - tracks every AI agent run
 */
export const AGENT_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS agent_logs (
  id TEXT PRIMARY KEY,
  item_title TEXT NOT NULL,
  agent_type TEXT NOT NULL CHECK(agent_type IN (
    'DISCOVERY', 'CLASSIFICATION', 'EXTRACTION', 'NORMALIZATION',
    'DUPLICATE', 'ENRICHMENT', 'CONTENT', 'SEO',
    'VERIFICATION', 'QUALITY_CONTROL', 'DRAFT', 'FINAL_QA'
  )),
  status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'WARNING', 'FAILED', 'RUNNING')),
  duration_ms INTEGER NOT NULL,
  model_used TEXT NOT NULL,
  input_summary TEXT NOT NULL,
  output_summary TEXT NOT NULL,
  evidence_text TEXT,
  issue_details TEXT,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_type ON agent_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_logs_status ON agent_logs(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp);
`;

/**
 * Audit logs - tracks all admin actions for compliance
 */
export const AUDIT_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_user TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user ON audit_logs(admin_user);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
`;

/**
 * Site settings - singleton table with single row (id=1)
 */
export const SITE_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  ads_enabled INTEGER NOT NULL DEFAULT 1,
  site_title TEXT NOT NULL DEFAULT 'RozgarVaani - India Government Jobs',
  contact_email TEXT NOT NULL DEFAULT 'contact@rozgarvaani.in',
  maintenance_mode INTEGER NOT NULL DEFAULT 0,
  auto_scan_interval_minutes INTEGER NOT NULL DEFAULT 30
);

-- Insert default settings if not exists
INSERT OR IGNORE INTO site_settings (id, ads_enabled, site_title, contact_email, maintenance_mode, auto_scan_interval_minutes)
VALUES (1, 1, 'RozgarVaani - India Government Jobs', 'contact@rozgarvaani.in', 0, 30);
`;

/**
 * Ad campaigns table
 */
export const AD_CAMPAIGNS_TABLE = `
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id TEXT PRIMARY KEY,
  placement TEXT NOT NULL CHECK(placement IN (
    'HOME_TOP', 'HOME_MIDDLE', 'JOB_TOP', 'JOB_MIDDLE',
    'DESKTOP_SIDEBAR', 'MOBILE_STICKY'
  )),
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  banner_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  impressions_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active ON ad_campaigns(active);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_placement ON ad_campaigns(placement);
`;

/**
 * All SQL initialization statements in order
 */
export const INIT_STATEMENTS = [
  JOBS_TABLE,
  DRAFTS_TABLE,
  RESULTS_TABLE,
  ADMIT_CARDS_TABLE,
  ANSWER_KEYS_TABLE,
  SOURCES_TABLE,
  AGENT_LOGS_TABLE,
  AUDIT_LOGS_TABLE,
  SITE_SETTINGS_TABLE,
  AD_CAMPAIGNS_TABLE,
];

/**
 * Helper to check if database schema is up to date
 */
export function getSchemaVersion(): number {
  return SCHEMA_VERSION;
}
