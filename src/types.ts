export type JobCategory =
  | 'SSC'
  | 'UPSC'
  | 'Railway'
  | 'Banking'
  | 'Defence'
  | 'Police'
  | 'Teaching'
  | 'Healthcare'
  | 'Engineering'
  | 'State Government'
  | 'Central Government'
  | 'Other';

export type QualificationLevel =
  | '10th'
  | '12th'
  | 'ITI'
  | 'Diploma'
  | 'Graduation'
  | 'Post Graduation'
  | 'Engineering'
  | 'Medical'
  | 'Other';

export type JobStatus = 'NEW' | 'ACTIVE' | 'CLOSING_SOON' | 'TODAY' | 'CLOSED';

export type VerificationStatus = 'PASSED' | 'FAILED' | 'PENDING';
export type QualityStatus = 'PASSED' | 'FAILED' | 'PENDING';

export interface ApplicationFee {
  generalObc: string;
  scSt: string;
  female: string;
  details?: string;
}

export interface SalaryInfo {
  payScale: string;
  payLevel: string;
  basicPay: string;
}

export interface VacancyDetail {
  postName: string;
  department?: string;
  vacancies: number;
  categoryBreakdown?: {
    ur?: number;
    obc?: number;
    sc?: number;
    st?: number;
    ews?: number;
  };
}

export interface GovtJob {
  id: string;
  slug: string;
  title: string;
  organization: string;
  department: string;
  advertisementNumber?: string;
  category: JobCategory;
  state?: string;
  postNames: string[];
  totalVacancies: number;
  categoryWiseVacancies?: {
    ur?: number;
    obc?: number;
    sc?: number;
    st?: number;
    ews?: number;
  };
  vacancyDetails?: VacancyDetail[];
  qualification: QualificationLevel;
  qualificationDetails: string;
  ageMin: number;
  ageMax: number;
  ageRelaxation: string;
  applicationStart: string;
  applicationEnd: string;
  feePaymentDeadline: string;
  correctionWindow?: string;
  examDate: string;
  admitCardDate?: string;
  resultDate?: string;
  applicationFee: ApplicationFee;
  salary: SalaryInfo;
  selectionProcess: string[];
  howToApply: string[];
  overview: string;
  status: JobStatus;
  isClosingSoon: boolean;
  links: {
    applyUrl?: string;
    notificationUrl?: string;
    officialWebsiteUrl?: string;
    admitCardUrl?: string;
  };
  sourceInfo: {
    name: string;
    type: string;
    lastVerified: string;
    officialNotificationUrl?: string;
    evidenceText?: string;
  };
  verificationStatus: VerificationStatus;
  qualityStatus: QualityStatus;
  isDraft: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamResult {
  id: string;
  slug: string;
  title: string;
  organization: string;
  category: JobCategory;
  examName: string;
  resultDate: string;
  status: 'DECLARED' | 'EXPECTED';
  downloadUrl: string;
  officialWebsiteUrl: string;
  notificationUrl?: string;
  cutOffInfo?: string;
  overview?: string;
  isDraft: boolean;
  verificationStatus: VerificationStatus;
  publishedAt: string;
  createdAt: string;
}

export interface AdmitCard {
  id: string;
  slug: string;
  title: string;
  organization: string;
  category: JobCategory;
  examName: string;
  examDate: string;
  admitCardReleaseDate: string;
  status: 'AVAILABLE' | 'SOON';
  downloadUrl: string;
  officialWebsiteUrl: string;
  instructions?: string[];
  overview?: string;
  isDraft: boolean;
  verificationStatus: VerificationStatus;
  publishedAt: string;
  createdAt: string;
}

export interface AnswerKey {
  id: string;
  slug: string;
  title: string;
  organization: string;
  category: JobCategory;
  examName: string;
  releaseDate: string;
  objectionDeadline: string;
  status: 'RELEASED' | 'PROVISIONAL' | 'FINAL';
  downloadUrl: string;
  objectionLink?: string;
  officialWebsiteUrl: string;
  overview?: string;
  isDraft: boolean;
  verificationStatus: VerificationStatus;
  publishedAt: string;
  createdAt: string;
}

export interface SourceRegistry {
  id: string;
  name: string;
  type: 'GOVT_PORTAL' | 'RECRUITMENT_BOARD' | 'PUBLIC_FEED' | 'AUTHORIZED_API';
  url: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  crawlFrequency: 'EVERY_30_MIN' | 'HOURLY' | 'DAILY';
  lastScan: string;
  lastSuccessfulScan: string;
  lastError?: string;
  permissionNotes: string;
  parserType: string;
  jobsExtractedCount: number;
}

export type AgentType =
  | 'DISCOVERY'
  | 'CLASSIFICATION'
  | 'EXTRACTION'
  | 'NORMALIZATION'
  | 'DUPLICATE'
  | 'ENRICHMENT'
  | 'CONTENT'
  | 'SEO'
  | 'VERIFICATION'
  | 'QUALITY_CONTROL'
  | 'DRAFT'
  | 'FINAL_QA';

export interface AgentLog {
  id: string;
  itemTitle: string;
  agentType: AgentType;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'RUNNING';
  durationMs: number;
  modelUsed: string;
  inputSummary: string;
  outputSummary: string;
  evidenceText?: string;
  issueDetails?: string;
  timestamp: string;
}

export interface VerificationFieldCheck {
  field: string;
  value: string;
  verified: boolean;
  confidence: number;
  evidence: string;
  issue?: string;
}

export interface VerificationReport {
  verificationStatus: 'PASSED' | 'FAILED';
  qualityScore: number;
  checkedFields: VerificationFieldCheck[];
  criticalErrors: string[];
  warnings: string[];
  evidenceText: string;
  verifiedAt: string;
}

export interface GovtJobDraft extends GovtJob {
  verificationReport: VerificationReport;
  agentLogs: AgentLog[];
}

export interface SiteSettings {
  adsEnabled: boolean;
  siteTitle: string;
  contactEmail: string;
  maintenanceMode: boolean;
  autoScanIntervalMinutes: number;
}

export interface AdCampaign {
  id: string;
  placement: 'HOME_TOP' | 'HOME_MIDDLE' | 'JOB_TOP' | 'JOB_MIDDLE' | 'DESKTOP_SIDEBAR' | 'MOBILE_STICKY';
  title: string;
  sponsorName: string;
  bannerUrl: string;
  targetUrl: string;
  active: boolean;
  impressionsCount: number;
  clicksCount: number;
}

export interface AuditLog {
  id: string;
  adminUser: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}


// ─── Final QA + Auto-Fix Agent Types ────────────────────────────────────────

export type QAFinalStatus =
  | 'READY_FOR_ADMIN_REVIEW'
  | 'REPROCESS_REQUIRED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'BLOCKED';

export type QACheckResult = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

export type QAActionType =
  | 'AUTO_FIXED'
  | 'REMOVED_UNSUPPORTED_CLAIM'
  | 'SOURCE_PRIORITY_CORRECTION'
  | 'NO_CHANGE';

export type ReprocessTarget =
  | 'ExtractionAgent'
  | 'ClassificationAgent'
  | 'NormalizationAgent'
  | 'DuplicateAgent'
  | 'ContentAgent'
  | 'SEOAgent'
  | 'VerificationAgent'
  | 'DataValidationLayer';

export interface QAAutoFix {
  field: string;
  old_value: string;
  new_value: string;
  action: QAActionType;
  reason: string;
  source_reference: string;
  timestamp: string;
}

export interface QARemovedContent {
  field: string;
  removed_text: string;
  reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface QAReprocessRequest {
  field: string;
  issue: string;
  responsible_agent: ReprocessTarget;
  downstream_agents: ReprocessTarget[];
}

export interface QAManualReviewItem {
  field: string;
  issue: string;
  current_value: string;
  reason_cannot_auto_fix: string;
}

export interface QACriticalError {
  category: string;
  message: string;
  blocking: boolean;
}

export interface QAWarning {
  category: string;
  message: string;
}

export interface QAChecks {
  source: QACheckResult;
  data: QACheckResult;
  dates: QACheckResult;
  vacancies: QACheckResult;
  eligibility: QACheckResult;
  fee: QACheckResult;
  salary: QACheckResult;
  selection: QACheckResult;
  content: QACheckResult;
  urls: QACheckResult;
  seo: QACheckResult;
  duplicate: QACheckResult;
  schema: QACheckResult;
  agent_pipeline: QACheckResult;
  public_render_data: QACheckResult;
}

export interface QAFinalReport {
  draft_id: string;
  draft_title: string;
  final_status: QAFinalStatus;
  overall_score: number;
  cycles_completed: number;
  checks: QAChecks;
  auto_fixes: QAAutoFix[];
  removed_unsupported_content: QARemovedContent[];
  reprocess_requests: QAReprocessRequest[];
  manual_review_items: QAManualReviewItem[];
  critical_errors: QACriticalError[];
  warnings: QAWarning[];
  final_recommendation: string;
  run_at: string;
}
