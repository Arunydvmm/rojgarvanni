import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
// Legacy Gemini import kept for reference — NVIDIA is the primary model
import { GoogleGenAI } from '@google/genai';
import {
  runAgent,
  getAllAgentStats,
  NVIDIA_MODEL_DISPLAY_NAME,
  NVIDIA_MODEL_ID,
} from './src/services/agentExecutionService.js';
import {
  testNvidiaConnection,
  NvidiaConfigError,
} from './src/services/nvidiaAIService.js';
import {
  GovtJob,
  ExamResult,
  AdmitCard,
  AnswerKey,
  SourceRegistry,
  GovtJobDraft,
  AgentLog,
  SiteSettings,
  AdCampaign,
  AuditLog,
  QAFinalReport,
  QAAutoFix,
  QARemovedContent,
  QAReprocessRequest,
  QAManualReviewItem,
  QACriticalError,
  QAWarning,
  QAChecks,
  QAFinalStatus,
  QACheckResult,
} from './src/types';

// ── WEB SCRAPER IMPORTS ──────────────────────────────────────────────────────
import { scraperScheduler } from './src/services/scraperScheduler.js';

// ── DATABASE IMPORTS ─────────────────────────────────────────────────────────
import {
  initializeDatabase,
  isDatabaseAvailable,
  checkDatabaseHealth,
  setupShutdownHandlers,
} from './src/db/database.js';
import {
  JobRepository,
  DraftRepository,
  AgentLogRepository,
  AuditLogRepository,
  SourceRepository,
  SettingsRepository,
  AdmitCardRepository,
  AnswerKeyRepository,
  ExamResultRepository,
} from './src/db/repositories/index.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Legacy Gemini client — kept as fallback; primary model is NVIDIA Nemotron Nano 9B
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

// Helper to log audit actions
function logAudit(action: string, details: string, adminUser = 'Administrator') {
  if (!isDatabaseAvailable()) {
    console.warn('[Audit] Database unavailable, audit log not persisted:', action);
    return;
  }

  try {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      adminUser,
      action,
      details,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    };
    AuditLogRepository.create(newLog);
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error);
  }
}

// ── DATABASE GUARD MIDDLEWARE ────────────────────────────────────────────────
// Middleware to block write/AI operations if database is unavailable
function requireDatabase(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({
      success: false,
      message: 'Database unavailable. Cannot process this request.',
      error: 'SERVICE_UNAVAILABLE',
    });
  }
  next();
}

// --- PUBLIC API ROUTES ---

// GET /api/jobs
app.get('/api/jobs', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const { category, qualification, status, search, limit } = req.query;
    let filtered = JobRepository.findAll({ isDraft: false });

  if (category && typeof category === 'string' && category !== 'All') {
    filtered = filtered.filter((j) => j.category.toLowerCase() === category.toLowerCase());
  }
  if (qualification && typeof qualification === 'string' && qualification !== 'All') {
    filtered = filtered.filter((j) => j.qualification.toLowerCase() === qualification.toLowerCase());
  }
  if (status && typeof status === 'string' && status !== 'All') {
    filtered = filtered.filter((j) => j.status.toLowerCase() === status.toLowerCase());
  }
  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.organization.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q) ||
        j.qualification.toLowerCase().includes(q) ||
        j.postNames.some((p) => p.toLowerCase().includes(q))
    );
  }

  if (limit && !isNaN(Number(limit))) {
    filtered = filtered.slice(0, Number(limit));
  }

  res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    console.error('[API] Error in /api/jobs:', error);
    res.status(500).json({ success: false, message: 'Database query failed' });
  }
});

// GET /api/jobs/:slug
app.get('/api/jobs/:slug', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const job = JobRepository.findBySlug(req.params.slug) || JobRepository.findById(req.params.slug);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Government Job notification not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    console.error('[API] Error in /api/jobs/:slug:', error);
    res.status(500).json({ success: false, message: 'Database query failed' });
  }
});

// GET /api/results
app.get('/api/results', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const { category, search } = req.query;
    let filtered = ExamResultRepository.findAll({ isDraft: false });

    if (category && typeof category === 'string' && category !== 'All') {
      filtered = filtered.filter((r) => r.category.toLowerCase() === category.toLowerCase());
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.organization.toLowerCase().includes(q) ||
          r.examName.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[API] Error in /api/results:', error);
    res.status(500).json({ success: false, message: 'Database query failed' });
  }
});

// GET /api/results/:slug
app.get('/api/results/:slug', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const item = ExamResultRepository.findBySlug(req.params.slug) || ExamResultRepository.findById(req.params.slug);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('[API] Error in /api/results/:slug:', error);
    res.status(500).json({ success: false, message: 'Database query failed' });
  }
});

// GET /api/admit-cards
app.get('/api/admit-cards', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const { category, search } = req.query;
    let filtered = AdmitCardRepository.findAll({ isDraft: false });

    if (category && typeof category === 'string' && category !== 'All') {
      filtered = filtered.filter((a) => a.category.toLowerCase() === category.toLowerCase());
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.organization.toLowerCase().includes(q) ||
          a.examName.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[API] Error in /api/admit-cards:', error);
    res.status(500).json({ success: false, message: 'Database query failed' });
  }
});

// GET /api/admit-cards/:slug
app.get('/api/admit-cards/:slug', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const item = AdmitCardRepository.findBySlug(req.params.slug) || AdmitCardRepository.findById(req.params.slug);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Admit Card not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('[API] Error in /api/admit-cards/:slug:', error);
    res.status(500).json({ success: false, message: 'Database query failed' });
  }
});

// GET /api/answer-keys
app.get('/api/answer-keys', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const { category, search } = req.query;
    let filtered = AnswerKeyRepository.findAll({ isDraft: false });

    if (category && typeof category === 'string' && category !== 'All') {
      filtered = filtered.filter((ak) => ak.category.toLowerCase() === category.toLowerCase());
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (ak) =>
          ak.title.toLowerCase().includes(q) ||
          ak.organization.toLowerCase().includes(q) ||
          ak.examName.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('[API] Error in /api/answer-keys:', error);
    res.status(500).json({ success: false, message: 'Database query failed' });
  }
});

// GET /api/answer-keys/:slug
app.get('/api/answer-keys/:slug', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const item = AnswerKeyRepository.findBySlug(req.params.slug) || AnswerKeyRepository.findById(req.params.slug);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Answer Key not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('[API] Error in /api/answer-keys/:slug:', error);
    res.status(500).json({ success: false, message: 'Database query failed' });
  }
});

// GET /api/search (Unified search across jobs, results, admit cards, answer keys)
app.get('/api/search', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const query = typeof req.query.q === 'string' ? req.query.q.toLowerCase().trim() : '';
    if (!query) {
      return res.json({
        success: true,
        data: { jobs: [], results: [], admitCards: [], answerKeys: [] },
      });
    }

    const matchedJobs = JobRepository.findAll({ isDraft: false }).filter(
      (j) =>
        j.title.toLowerCase().includes(query) ||
        j.organization.toLowerCase().includes(query) ||
        j.category.toLowerCase().includes(query) ||
        j.qualification.toLowerCase().includes(query)
    );

    // Include results, admit cards, and answer keys in search
    const matchedResults = ExamResultRepository.findAll({ isDraft: false }).filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.organization.toLowerCase().includes(query) ||
        r.examName.toLowerCase().includes(query)
    );

    const matchedAdmitCards = AdmitCardRepository.findAll({ isDraft: false }).filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.organization.toLowerCase().includes(query) ||
        a.examName.toLowerCase().includes(query)
    );

    const matchedAnswerKeys = AnswerKeyRepository.findAll({ isDraft: false }).filter(
      (ak) =>
        ak.title.toLowerCase().includes(query) ||
        ak.organization.toLowerCase().includes(query) ||
        ak.examName.toLowerCase().includes(query)
    );

    res.json({
      success: true,
      data: {
        jobs: matchedJobs,
        results: matchedResults,
        admitCards: matchedAdmitCards,
        answerKeys: matchedAnswerKeys,
      },
    });
  } catch (error) {
    console.error('[API] Error in search:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// GET /api/site-settings (Public settings, e.g. whether ads are enabled)
app.get('/api/site-settings', (req, res) => {
  if (!isDatabaseAvailable()) {
    // Return basic settings if database is unavailable
    return res.json({
      success: true,
      data: {
        adsEnabled: false,
        siteTitle: 'RozgarVaani - India Government Jobs',
        contactEmail: 'contact@rozgarvaani.in',
        maintenanceMode: false,
        autoScanIntervalMinutes: 30,
      },
      ads: []
    });
  }

  try {
    const settings = SettingsRepository.get();
    res.json({ success: true, data: settings, ads: settings.adsEnabled ? [] : [] }); // TODO: Add ad campaigns
  } catch (error) {
    console.error('[API] Error fetching site settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch site settings' });
  }
});

// --- ADMIN API ROUTES ---

// POST /api/admin/login
app.post('/api/admin/login', requireDatabase, (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === adminPassword) {
    logAudit('ADMIN_LOGIN_SUCCESS', 'Admin user logged in successfully');
    return res.json({
      success: true,
      token: 'jwt-rozgarvaani-admin-authenticated-session-2026',
      user: { name: 'Portal Admin', role: 'SUPER_ADMIN', email: 'admin@rozgarvaani.in' },
    });
  }
  logAudit('ADMIN_LOGIN_FAILED', 'Invalid password attempt');
  res.status(401).json({ success: false, message: 'Invalid password. Try "admin123".' });
});

// GET /api/admin/dashboard-stats
app.get('/api/admin/dashboard-stats', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const totalJobs = JobRepository.count();
    const activeJobs = JobRepository.count({ status: 'ACTIVE' }) + JobRepository.count({ status: 'NEW' });
    const totalDrafts = DraftRepository.count();
    const failedDrafts = DraftRepository.findAll({ verificationStatus: 'FAILED' }).length;
    const activeSources = SourceRepository.count({ status: 'ACTIVE' });
    const totalAgentRuns = AgentLogRepository.count();
    const totalResults = ExamResultRepository.count({ isDraft: false });
    const totalAdmitCards = AdmitCardRepository.count({ isDraft: false });
    const totalAnswerKeys = AnswerKeyRepository.count({ isDraft: false });
    const settings = SettingsRepository.get();

    res.json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        totalResults,
        totalAdmitCards,
        totalAnswerKeys,
        totalDrafts,
        failedVerifications: failedDrafts,
        activeSources,
        totalAgentRuns,
        adsEnabled: settings.adsEnabled,
      },
    });
  } catch (error) {
    console.error('[API] Error in dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/admin/drafts
app.get('/api/admin/drafts', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const drafts = DraftRepository.findAll();
    res.json({ success: true, data: drafts });
  } catch (error) {
    console.error('[API] Error fetching drafts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drafts' });
  }
});

// POST /api/admin/drafts/:id/approve
app.post('/api/admin/drafts/:id/approve', requireDatabase, (req, res) => {
  try {
    const draft = DraftRepository.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    // Hard gate check
    if (draft.verificationReport.verificationStatus === 'FAILED') {
      return res.status(400).json({
        success: false,
        message: 'HARD GATE FAILURE: Cannot publish draft with failed verification report without resolving critical errors.',
      });
    }

    // Convert draft to published GovtJob
    const publishedJob: GovtJob = {
      ...draft,
      isDraft: false,
      status: 'NEW',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    JobRepository.create(publishedJob);
    DraftRepository.delete(draft.id);

    logAudit('APPROVE_AND_PUBLISH_DRAFT', `Approved draft: ${publishedJob.title}`);
    res.json({ success: true, message: 'Draft approved and published to public portal', data: publishedJob });
  } catch (error) {
    console.error('[API] Error approving draft:', error);
    res.status(500).json({ success: false, message: 'Failed to approve draft' });
  }
});

// POST /api/admin/drafts/:id/reject
app.post('/api/admin/drafts/:id/reject', requireDatabase, (req, res) => {
  try {
    const draft = DraftRepository.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    DraftRepository.delete(draft.id);
    logAudit('REJECT_DRAFT', `Rejected and removed draft: ${draft.title}`);
    res.json({ success: true, message: 'Draft rejected and removed' });
  } catch (error) {
    console.error('[API] Error rejecting draft:', error);
    res.status(500).json({ success: false, message: 'Failed to reject draft' });
  }
});

// POST /api/admin/jobs/manual (Create or edit job manually)
app.post('/api/admin/jobs/manual', requireDatabase, (req, res) => {
  const jobData = req.body;
  if (!jobData.title || !jobData.organization) {
    return res.status(400).json({ success: false, message: 'Title and Organization are required' });
  }

  try {
    const newJob: GovtJob = {
      id: jobData.id || `job-man-${Date.now()}`,
      slug: jobData.slug || jobData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: jobData.title,
      organization: jobData.organization,
      department: jobData.department || 'Government Department',
      advertisementNumber: jobData.advertisementNumber || 'MANUAL-2026',
      category: jobData.category || 'Central Government',
      state: jobData.state || 'All India',
      postNames: jobData.postNames || [jobData.title],
      totalVacancies: Number(jobData.totalVacancies) || 0,
      categoryWiseVacancies: jobData.categoryWiseVacancies || { ur: 0, obc: 0, sc: 0, st: 0, ews: 0 },
      qualification: jobData.qualification || 'Graduation',
      qualificationDetails: jobData.qualificationDetails || 'As per official advertisement.',
      ageMin: Number(jobData.ageMin) || 18,
      ageMax: Number(jobData.ageMax) || 35,
      ageRelaxation: jobData.ageRelaxation || 'As per government rules',
      applicationStart: jobData.applicationStart || new Date().toISOString().split('T')[0],
      applicationEnd: jobData.applicationEnd || '2026-09-30',
      feePaymentDeadline: jobData.feePaymentDeadline || '2026-09-30',
      examDate: jobData.examDate || 'To be announced',
      applicationFee: jobData.applicationFee || { generalObc: '₹100', scSt: '₹0', female: '₹0' },
      salary: jobData.salary || { payLevel: 'Level 6', payScale: '₹35,400 - ₹1,12,400', basicPay: '₹35,400' },
      selectionProcess: jobData.selectionProcess || ['Written Exam', 'Document Verification'],
      howToApply: jobData.howToApply || ['Visit official website', 'Fill online application', 'Pay fee', 'Submit'],
      overview: jobData.overview || 'Government recruitment notification.',
      status: jobData.status || 'NEW',
      isClosingSoon: false,
      links: jobData.links || {
        applyUrl: 'https://example.gov.in',
        notificationUrl: 'https://example.gov.in/notice.pdf',
        officialWebsiteUrl: 'https://example.gov.in',
      },
      sourceInfo: {
        name: 'Admin Manual Entry',
        type: 'Direct Admin Creation',
        lastVerified: new Date().toISOString().split('T')[0],
        evidenceText: 'Created directly by portal administrator.',
      },
      verificationStatus: 'PASSED',
      qualityStatus: 'PASSED',
      isDraft: false,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = JobRepository.findById(newJob.id);
    if (existing) {
      JobRepository.update(newJob.id, newJob);
      logAudit('UPDATE_JOB_MANUAL', `Updated job: ${newJob.title}`);
    } else {
      JobRepository.create(newJob);
      logAudit('CREATE_JOB_MANUAL', `Created new job manually: ${newJob.title}`);
    }

    res.json({ success: true, message: 'Job saved successfully', data: newJob });
  } catch (error) {
    console.error('[API] Error saving manual job:', error);
    res.status(500).json({ success: false, message: 'Failed to save job' });
  }
});

// GET /api/admin/sources
app.get('/api/admin/sources', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const sources = SourceRepository.findAll();
    res.json({ success: true, data: sources });
  } catch (error) {
    console.error('[API] Error fetching sources:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sources' });
  }
});

// POST /api/admin/sources
app.post('/api/admin/sources', requireDatabase, (req, res) => {
  const { name, url, type, crawlFrequency, permissionNotes } = req.body;
  if (!name || !url) {
    return res.status(400).json({ success: false, message: 'Source Name and URL are required' });
  }

  try {
    const newSource: SourceRegistry = {
      id: `src-${Date.now()}`,
      name,
      url,
      type: type || 'GOVT_PORTAL',
      status: 'ACTIVE',
      crawlFrequency: crawlFrequency || 'EVERY_30_MIN',
      lastScan: new Date().toISOString(),
      lastSuccessfulScan: new Date().toISOString(),
      permissionNotes: permissionNotes || 'Public government recruitment portal feed',
      parserType: 'GENERIC_AI_SOURCE_PARSER',
      jobsExtractedCount: 0,
    };

    SourceRepository.create(newSource);
    logAudit('ADD_SOURCE', `Added government source registry: ${name}`);
    res.json({ success: true, message: 'Source added to registry', data: newSource });
  } catch (error) {
    console.error('[API] Error creating source:', error);
    res.status(500).json({ success: false, message: 'Failed to create source' });
  }
});

// GET /api/admin/pipeline/logs
app.get('/api/admin/pipeline/logs', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const logs = AgentLogRepository.findAll({ limit: 1000 });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[API] Error fetching agent logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pipeline logs' });
  }
});

// GET /api/admin/settings
app.get('/api/admin/settings', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const settings = SettingsRepository.get();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[API] Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// POST /api/admin/settings
app.post('/api/admin/settings', requireDatabase, (req, res) => {
  const { adsEnabled, siteTitle, contactEmail, maintenanceMode, autoScanIntervalMinutes } = req.body;
  
  try {
    const updatedSettings = SettingsRepository.update({
      adsEnabled: adsEnabled !== undefined ? Boolean(adsEnabled) : undefined,
      siteTitle: siteTitle || undefined,
      contactEmail: contactEmail || undefined,
      maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : undefined,
      autoScanIntervalMinutes: autoScanIntervalMinutes ? Number(autoScanIntervalMinutes) : undefined,
    });

    logAudit('UPDATE_SETTINGS', `Updated site settings (Ads enabled: ${updatedSettings.adsEnabled})`);
    res.json({ success: true, message: 'Settings saved', data: updatedSettings });
  } catch (error) {
    console.error('[API] Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// GET /api/admin/audit-logs
app.get('/api/admin/audit-logs', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const logs = AuditLogRepository.findAll({ limit: 1000 });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[API] Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// ─── HEALTH CHECK ENDPOINT ──────────────────────────────────────────────────
// GET /api/health
app.get('/api/health', (req, res) => {
  const dbHealth = checkDatabaseHealth();
  const aiAvailable = Boolean(process.env.NVIDIA_API_KEY);
  
  const systemStatus = {
    database: {
      available: dbHealth.available,
      responsive: dbHealth.responsive,
      tableCount: dbHealth.tableCount,
      schemaVersion: dbHealth.schemaVersion,
      error: dbHealth.error,
    },
    ai: {
      available: aiAvailable,
      model: aiAvailable ? NVIDIA_MODEL_DISPLAY_NAME : 'Not configured',
    },
    server: {
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }
  };

  const overallStatus = dbHealth.available && aiAvailable ? 'healthy' : 
                       dbHealth.available ? 'limited' : 'degraded';

  res.json({
    success: true,
    status: overallStatus,
    timestamp: new Date().toISOString(),
    data: systemStatus
  });
});

// ─── NVIDIA MULTI-AGENT PIPELINE ─────────────────────────────────────────────
// POST /api/admin/pipeline/run
// Executes the full 12-stage NVIDIA Nemotron Nano 9B pipeline.
// Gemini is no longer used here. One model, 12 agents, separate prompts.
app.post('/api/admin/pipeline/run', requireDatabase, async (req, res) => {
  const { rawText, sourceUrl } = req.body;

  const textContent =
    rawText ||
    `OFFICIAL RECRUITMENT NOTIFICATION 2026
    Organization: Steel Authority of India Limited (SAIL) / Ministry of Steel
    Notice No: SAIL/MT/2026-09
    Post Name: Management Trainee (Technical) - Mechanical, Electrical, Metallurgy, Civil
    Total Vacancies: 640 Posts
    Qualification: BE/B.Tech degree in relevant engineering branch with 65% marks (60% for SC/ST)
    Age Limit: 18 to 28 years as on 01 Sep 2026
    Application Start Date: 20 August 2026
    Last Date to Apply: 15 September 2026
    Exam Date: October 2026
    Application Fee: Rs. 500 for General/OBC/EWS, Rs. 100 for SC/ST/PwBD
    Pay Scale: Rs. 50,000 - Rs. 1,60,000 (E-1 Grade)
    Official Website: https://sail.co.in/careers`;

  const pipelineStartTime = Date.now();
  const createdLogs: AgentLog[] = [];

  // Helper: convert an AgentResult → AgentLog for the in-memory log store
  function toLog(result: any, titleOverride?: string): AgentLog {
    return {
      id: `alg-${result.agentId}-${Date.now()}`,
      itemTitle: titleOverride || result.inputSummary.slice(0, 80),
      agentType: result.agentId as any,
      status: result.status as any,
      durationMs: result.durationMs,
      modelUsed: NVIDIA_MODEL_DISPLAY_NAME,
      inputSummary: result.inputSummary,
      outputSummary: result.outputSummary,
      evidenceText: typeof result.output === 'object' && result.output !== null
        ? JSON.stringify(result.output).slice(0, 300)
        : undefined,
      issueDetails: result.errorMessage,
      timestamp: result.timestamp,
    };
  }

  try {
    // ── Stage 1: DISCOVERY ───────────────────────────────────────────────────
    const discoveryResult = await runAgent('DISCOVERY', { text: textContent });
    const discoveryOut = (discoveryResult.output ?? {}) as any;
    createdLogs.push(toLog(discoveryResult));

    if (discoveryResult.status === 'FAILED' || discoveryOut.is_recruitment_notification === false) {
      for (const log of createdLogs) {
        AgentLogRepository.create(log);
      }
      return res.status(422).json({
        success: false,
        message: discoveryOut.reason || 'Discovery agent: not a valid recruitment notification.',
        stage: 'DISCOVERY',
      });
    }

    // ── Stage 2: CLASSIFICATION ──────────────────────────────────────────────
    const classifyResult = await runAgent('CLASSIFICATION', { text: textContent });
    const classifyOut = (classifyResult.output ?? {}) as any;
    createdLogs.push(toLog(classifyResult));

    if (classifyResult.status === 'FAILED') {
      for (const log of createdLogs) {
        AgentLogRepository.create(log);
      }
      return res.status(500).json({ success: false, message: 'Classification failed.', stage: 'CLASSIFICATION' });
    }

    // ── Stage 3: EXTRACTION ──────────────────────────────────────────────────
    const extractResult = await runAgent('EXTRACTION', { text: textContent });
    const extractOut = (extractResult.output ?? {}) as any;
    createdLogs.push(toLog(extractResult, extractOut?.title || 'Job'));

    if (extractResult.status === 'FAILED' || !extractOut || !extractOut.title) {
      for (const log of createdLogs) {
        AgentLogRepository.create(log);
      }
      return res.status(500).json({ success: false, message: 'Extraction agent failed.', stage: 'EXTRACTION' });
    }

    // ── Stage 4: NORMALIZATION ───────────────────────────────────────────────
    const normResult = await runAgent('NORMALIZATION', extractOut);
    const normOut = (normResult.output ?? extractOut) as any;
    createdLogs.push(toLog(normResult, normOut.title));

    if (normResult.status === 'FAILED' || !normOut) {
      for (const log of createdLogs) {
        AgentLogRepository.create(log);
      }
      return res.status(500).json({ success: false, message: 'Normalization failed.', stage: 'NORMALIZATION' });
    }

    // ── Stage 5: DUPLICATE CHECK ─────────────────────────────────────────────
    const existingJobs = JobRepository.findAll({ limit: 20 });
    const existingDrafts = DraftRepository.findAll({ limit: 20 });
    const existingTitles = [...existingJobs, ...existingDrafts].map((j) => ({
      id: j.id, title: j.title, organization: j.organization,
      advertisementNumber: j.advertisementNumber,
      applicationStart: j.applicationStart,
      applicationEnd: j.applicationEnd,
    }));
    const dupResult = await runAgent('DUPLICATE', { incoming: normOut, existing_records: existingTitles });
    const dupOut = (dupResult.output ?? { status: 'NEW', recommendation: 'PROCEED' }) as any;
    createdLogs.push(toLog(dupResult, normOut.title));

    if (dupOut.recommendation === 'BLOCK' || dupResult.status === 'FAILED') {
      // Save logs before early return
      for (const log of createdLogs) {
        AgentLogRepository.create(log);
      }
      return res.status(409).json({
        success: false,
        message: `Duplicate detected: ${dupOut.match_reason || 'Unknown reason'}`,
        stage: 'DUPLICATE',
        matched_id: dupOut.matched_record_id,
      });
    }

    // ── Stage 6: ENRICHMENT ──────────────────────────────────────────────────
    const enrichResult = await runAgent('ENRICHMENT', normOut);
    const enrichOut = (enrichResult.output ?? {}) as any;
    createdLogs.push(toLog(enrichResult, normOut.title));

    if (enrichResult.status === 'FAILED') {
      console.warn('[Pipeline] ENRICHMENT failed, continuing with empty enrichment');
    }

    // ── Stage 7: CONTENT ─────────────────────────────────────────────────────
    const contentInput = { ...normOut, enrichment: enrichOut };
    const contentResult = await runAgent('CONTENT', contentInput);
    const contentOut = (contentResult.output ?? {}) as any;
    createdLogs.push(toLog(contentResult, normOut.title));

    // CRITICAL: If CONTENT fails, stop pipeline — do NOT execute downstream stages
    if (contentResult.status === 'FAILED' || !contentOut) {
      console.error('[Pipeline] CONTENT failed — STOPPING PIPELINE (cannot proceed to SEO, VERIFICATION, QA)');
      for (const log of createdLogs) {
        AgentLogRepository.create(log);
      }
      return res.status(500).json({
        success: false,
        message: 'Content generation failed. Pipeline stopped.',
        stage: 'CONTENT',
        logs: createdLogs,
      });
    }

    // ── Stage 8: SEO ─────────────────────────────────────────────────────────
    const seoInput = { title: normOut.title, organization: normOut.organization,
      total_vacancies: normOut.total_vacancies, application_end: normOut.application_end,
      category: classifyOut.category };
    const seoResult = await runAgent('SEO', seoInput);
    const seoOut = (seoResult.output ?? {}) as any;
    createdLogs.push(toLog(seoResult, normOut.title));

    if (seoResult.status === 'FAILED') {
      console.warn('[Pipeline] SEO failed, continuing with default SEO values');
    }

    // ── Stage 9: VERIFICATION (Hard Gate) ───────────────────────────────────
    const verifyInput = { source_text: textContent, extracted_data: normOut };
    const verifyResult = await runAgent('VERIFICATION', verifyInput);
    const verifyOut = (verifyResult.output ?? { verification_status: 'FAILED' }) as any;
    createdLogs.push(toLog(verifyResult, normOut.title));

    if (verifyResult.status === 'FAILED') {
      console.error('[Pipeline] VERIFICATION failed — hard gate applies');
    }

    const isVerificationPassed = verifyOut.verification_status === 'PASSED';

    // ── Stage 10: QUALITY CONTROL ────────────────────────────────────────────
    const qualityInput = { ...normOut, content: contentOut, seo: seoOut, verification: verifyOut };
    const qualityResult = await runAgent('QUALITY_CONTROL', qualityInput);
    const qualityOut = (qualityResult.output ?? { quality_status: 'PENDING', total_score: 50 }) as any;
    createdLogs.push(toLog(qualityResult, normOut.title));

    if (qualityResult.status === 'FAILED') {
      console.warn('[Pipeline] QUALITY_CONTROL failed');
    }

    // ── Stage 11: FINAL QA (AI pass) ─────────────────────────────────────────
    const qaInput = {
      draft_data: normOut, content: contentOut, seo: seoOut,
      verification: verifyOut, quality: qualityOut,
      agent_results: createdLogs.map((l) => ({ agent: l.agentType, status: l.status })),
    };
    const qaResult = await runAgent('FINAL_QA', qaInput);
    const qaOut = (qaResult.output ?? { final_status: 'MANUAL_REVIEW_REQUIRED' }) as any;
    createdLogs.push(toLog(qaResult, normOut.title));

    if (qaResult.status === 'FAILED') {
      console.warn('[Pipeline] FINAL_QA failed');
    }

    // ── Assemble Draft ───────────────────────────────────────────────────────
    const draftTitle   = normOut.title       || 'Government Recruitment 2026';
    const draftOrg     = normOut.organization || 'Government of India';
    const slug = seoOut.slug ||
      draftTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const applicationEnd = normOut.application_end || normOut.applicationEnd || '2026-12-31';
    const daysLeft = Math.ceil((new Date(applicationEnd).getTime() - Date.now()) / 86_400_000);

    const newDraft: GovtJobDraft = {
      id: `draft-${Date.now()}`,
      slug,
      title: draftTitle,
      organization: draftOrg,
      department: normOut.department || 'Central Government',
      advertisementNumber: normOut.advertisement_number || normOut.advertisementNumber || '',
      category: classifyOut.category || normOut.category || 'Central Government',
      state: normOut.state || 'All India',
      postNames: normOut.post_names || [draftTitle],
      totalVacancies: normOut.total_vacancies ?? normOut.totalVacancies ?? 0,
      categoryWiseVacancies: {
        ur:  normOut.category_vacancies?.ur  ?? 0,
        obc: normOut.category_vacancies?.obc ?? 0,
        sc:  normOut.category_vacancies?.sc  ?? 0,
        st:  normOut.category_vacancies?.st  ?? 0,
        ews: normOut.category_vacancies?.ews ?? 0,
      },
      qualification: classifyOut.qualification || normOut.qualification || 'Graduation',
      qualificationDetails: normOut.qualification_details || normOut.qualificationDetails || '',
      ageMin: normOut.age_min ?? normOut.ageMin ?? 18,
      ageMax: normOut.age_max ?? normOut.ageMax ?? 35,
      ageRelaxation: enrichOut.age_relaxation_details || normOut.age_relaxation || 'As per government rules',
      applicationStart: normOut.application_start || normOut.applicationStart || new Date().toISOString().split('T')[0],
      applicationEnd,
      feePaymentDeadline: normOut.fee_deadline || normOut.feePaymentDeadline || applicationEnd,
      examDate: normOut.exam_date || normOut.examDate || 'To be announced',
      applicationFee: {
        generalObc: normOut.fee_general_obc || normOut.feeGeneral || '₹0',
        scSt:        normOut.fee_sc_st      || normOut.feeScSt    || '₹0',
        female:      normOut.fee_female     || normOut.feeFemale  || '₹0',
      },
      salary: {
        payLevel:  normOut.pay_level   || normOut.salaryPayLevel  || '',
        payScale:  normOut.pay_scale   || normOut.salaryPayScale  || '',
        basicPay:  normOut.basic_pay   || normOut.basicPay        || '',
      },
      selectionProcess: normOut.selection_process || normOut.selectionProcess || ['Written Exam'],
      howToApply: enrichOut.application_steps || normOut.how_to_apply || normOut.howToApply || ['Apply online'],
      overview: contentOut.overview || normOut.overview || 'Official recruitment notification.',
      status: 'NEW',
      isClosingSoon: daysLeft >= 0 && daysLeft <= 7,
      links: {
        applyUrl:           normOut.apply_url             || normOut.applyUrl            || '',
        notificationUrl:    normOut.notification_url      || normOut.notificationUrl     || '',
        officialWebsiteUrl: normOut.official_website_url  || normOut.officialWebsiteUrl  || '',
      },
      sourceInfo: {
        name: sourceUrl ? 'User Provided Source' : 'Official Portal Notice',
        type: 'Permitted Official Source',
        lastVerified: new Date().toISOString().split('T')[0],
        evidenceText: textContent.slice(0, 300),
      },
      verificationStatus: isVerificationPassed ? 'PASSED' : 'FAILED',
      qualityStatus: (qualityOut.quality_status === 'PASSED') ? 'PASSED' : 'FAILED',
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verificationReport: {
        verificationStatus: isVerificationPassed ? 'PASSED' : 'FAILED',
        qualityScore: verifyOut.quality_score ?? (isVerificationPassed ? 90 : 45),
        checkedFields: (verifyOut.checked_fields ?? []).map((f: any) => ({
          field:      f.field      ?? '',
          value:      String(f.extracted_value ?? ''),
          verified:   Boolean(f.verified),
          confidence: Number(f.confidence ?? 0),
          evidence:   f.evidence ?? '',
        })),
        criticalErrors: verifyOut.critical_errors ?? [],
        warnings:       verifyOut.warnings        ?? [],
        evidenceText:   textContent.slice(0, 300),
        verifiedAt:     new Date().toISOString(),
      },
      agentLogs: createdLogs,
    };

    DraftRepository.create(newDraft);
    
    // Save all agent logs
    for (const log of createdLogs) {
      AgentLogRepository.create(log);
    }
    
    logAudit('RUN_AI_PIPELINE', `NVIDIA Pipeline (${NVIDIA_MODEL_ID}) generated draft: ${newDraft.title}`);

    res.json({
      success: true,
      message: `NVIDIA Nemotron Nano 9B pipeline completed in ${Date.now() - pipelineStartTime}ms. Draft created for Admin Review.`,
      model: NVIDIA_MODEL_DISPLAY_NAME,
      final_qa_status: qaOut.final_status,
      data: {
        draft: newDraft,
        logs: createdLogs,
        totalDurationMs: Date.now() - pipelineStartTime,
        stagesCompleted: createdLogs.length,
      },
    });

  } catch (error: any) {
    console.error('[Pipeline] Error:', error.message);
    
    // Save logs even on failure
    for (const log of createdLogs) {
      try {
        AgentLogRepository.create(log);
      } catch (logError) {
        console.error('[Pipeline] Failed to save log:', logError);
      }
    }
    
    // Never leak the API key in error responses
    const safeMessage = (error.message || 'Pipeline execution error').replace(/(Bearer\s+)\S+/gi, '$1[REDACTED]');
    res.status(500).json({ success: false, message: safeMessage });
  }
});

// Start Server and Vite setup
async function startServer() {
  console.log('🚀 RozgarVaani Government Job Portal - Starting up...');
  
  // ── DATABASE INITIALIZATION ─────────────────────────────────────────────
  console.log('[Startup] Initializing database...');
  const dbResult = initializeDatabase();
  
  if (!dbResult.success) {
    console.error(`[Startup] ✗ Database initialization failed: ${dbResult.error}`);
    console.error('[Startup] ✗ Starting in LIMITED MODE (read-only, no AI pipeline)');
    
    // In limited mode, we still start the server but guard all write operations
    console.log('[Startup] ⚠️  AI Pipeline disabled - database required for content generation');
  } else {
    console.log('[Startup] ✓ Database ready and available');
    
    // Setup graceful shutdown handlers
    setupShutdownHandlers();
    
    // ── START WEB SCRAPER SCHEDULER ─────────────────────────────────────────
    const scraperEnabled = process.env.SCRAPER_ENABLED !== 'false';
    if (scraperEnabled) {
      try {
        console.log('[Startup] Starting web scraper scheduler...');
        scraperScheduler.start();
        console.log('[Startup] ✓ Web scraper scheduler running (every 15 minutes)');
        logAudit('SCRAPER_START', 'Web scraper scheduler started on server startup');
      } catch (error) {
        console.error('[Startup] ✗ Failed to start web scraper:', error);
        logAudit('SCRAPER_START_FAILED', `Failed to start web scraper: ${error}`);
      }
    } else {
      console.log('[Startup] ⚠️  Web scraper scheduler is disabled (set SCRAPER_ENABLED=true to enable)');
    }
  }

  // ── HEALTH CHECK ────────────────────────────────────────────────────────
  const health = checkDatabaseHealth();
  console.log(`[Startup] Database health: ${health.available ? '✓ Available' : '✗ Unavailable'}`);
  if (health.available && health.tableCount) {
    console.log(`[Startup] Database tables: ${health.tableCount}`);
  }

  // ── VITE/EXPRESS SETUP ──────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ RozgarVaani Government Job Portal Server running on http://0.0.0.0:${PORT}`);
    console.log(`Database: ${isDatabaseAvailable() ? '✓ Available' : '✗ Limited Mode'}`);
  });
}

// ─── FINAL QA + AUTO-FIX AGENT ──────────────────────────────────────────────
// POST /api/admin/drafts/:id/qa-check
// Runs the complete 28-rule QA audit on a draft, auto-fixes safe issues,
// and returns a strict QAFinalReport JSON.
app.post('/api/admin/drafts/:id/qa-check', requireDatabase, (req, res) => {
  try {
    let draft = DraftRepository.findById(req.params.id);
    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

  const autoFixes: QAAutoFix[] = [];
  const removedContent: QARemovedContent[] = [];
  const reprocessRequests: QAReprocessRequest[] = [];
  const manualReviewItems: QAManualReviewItem[] = [];
  const criticalErrors: QACriticalError[] = [];
  const warnings: QAWarning[] = [];

  const ts = () => new Date().toISOString();

  // ── helpers ────────────────────────────────────────────────────────────────

  function recordFix(field: string, oldVal: string, newVal: string, reason: string, srcRef = 'verified_source') {
    autoFixes.push({ field, old_value: oldVal, new_value: newVal, action: 'AUTO_FIXED', reason, source_reference: srcRef, timestamp: ts() });
  }

  function recordRemoved(field: string, text: string, reason: string, severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH') {
    removedContent.push({ field, removed_text: text, reason, severity });
  }

  function recordReprocess(field: string, issue: string, agent: QAReprocessRequest['responsible_agent'], downstream: QAReprocessRequest['downstream_agents']) {
    reprocessRequests.push({ field, issue, responsible_agent: agent, downstream_agents: downstream });
  }

  function recordManual(field: string, issue: string, currentVal: string, why: string) {
    manualReviewItems.push({ field, issue, current_value: currentVal, reason_cannot_auto_fix: why });
  }

  // Slug safe-generator from a verified title string
  function makeSlug(title: string): string {
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // Check whether a string is a plausible YYYY-MM-DD date
  function isValidDate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
  }

  // Trim + collapse duplicate inner spaces
  function cleanText(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
  }

  // ── CHECK COUNTERS (used for scoring) ──────────────────────────────────────
  const checkResults: QAChecks = {
    source: 'PASS', data: 'PASS', dates: 'PASS', vacancies: 'PASS',
    eligibility: 'PASS', fee: 'PASS', salary: 'PASS', selection: 'PASS',
    content: 'PASS', urls: 'PASS', seo: 'PASS', duplicate: 'PASS',
    schema: 'PASS', agent_pipeline: 'PASS', public_render_data: 'PASS',
  };

  // Maximum fix cycles
  const MAX_CYCLES = 5;
  let cycle = 0;
  let issuesFoundThisCycle = true;

  while (issuesFoundThisCycle && cycle < MAX_CYCLES) {
    cycle++;
    issuesFoundThisCycle = false;

    // ── [1] SOURCE CHECK ─────────────────────────────────────────────────────
    if (!draft.sourceInfo?.name || draft.sourceInfo.name.trim() === '') {
      criticalErrors.push({ category: 'source', message: 'sourceInfo.name is missing', blocking: true });
      checkResults.source = 'FAIL';
      issuesFoundThisCycle = true;
    }
    if (!draft.sourceInfo?.lastVerified) {
      warnings.push({ category: 'source', message: 'sourceInfo.lastVerified is empty' });
      checkResults.source = checkResults.source === 'FAIL' ? 'FAIL' : 'WARN';
      issuesFoundThisCycle = true;
    }

    // ── [2] DATA / TITLE / ORG CHECK ─────────────────────────────────────────
    const rawTitle = draft.title ?? '';
    const cleanedTitle = cleanText(rawTitle);
    if (cleanedTitle !== rawTitle) {
      recordFix('title', rawTitle, cleanedTitle, 'Removed extra whitespace from title');
      draft = { ...draft, title: cleanedTitle };
      issuesFoundThisCycle = true;
    }
    if (!draft.title) {
      criticalErrors.push({ category: 'data', message: 'title is empty', blocking: true });
      checkResults.data = 'FAIL';
    }
    if (!draft.organization) {
      criticalErrors.push({ category: 'data', message: 'organization is empty', blocking: true });
      checkResults.data = 'FAIL';
    }

    // ── [3] DATE CHECK ───────────────────────────────────────────────────────
    const dateFields: Array<keyof typeof draft> = ['applicationStart', 'applicationEnd', 'feePaymentDeadline'];
    for (const df of dateFields) {
      const val = draft[df] as string | undefined;
      if (val && !isValidDate(val)) {
        // Try to parse and reformat
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          const fixed = parsed.toISOString().split('T')[0];
          recordFix(df as string, val, fixed, 'Reformatted date to YYYY-MM-DD');
          (draft as any)[df] = fixed;
          issuesFoundThisCycle = true;
        } else {
          checkResults.dates = 'FAIL';
          recordReprocess(df as string, `Date field "${df}" has invalid format: "${val}"`, 'NormalizationAgent', []);
        }
      }
    }
    // Order check: applicationStart <= applicationEnd
    if (isValidDate(draft.applicationStart) && isValidDate(draft.applicationEnd)) {
      if (new Date(draft.applicationStart) > new Date(draft.applicationEnd)) {
        checkResults.dates = 'FAIL';
        recordReprocess('applicationStart/applicationEnd', 'applicationStart is after applicationEnd — cannot auto-fix without verified source', 'VerificationAgent', ['NormalizationAgent']);
        issuesFoundThisCycle = true;
      }
    }
    // feePaymentDeadline should not be before applicationEnd
    if (isValidDate(draft.feePaymentDeadline) && isValidDate(draft.applicationEnd)) {
      if (new Date(draft.feePaymentDeadline) < new Date(draft.applicationEnd)) {
        warnings.push({ category: 'dates', message: 'feePaymentDeadline is before applicationEnd — verify with source' });
        if (checkResults.dates === 'PASS') checkResults.dates = 'WARN';
      }
    }

    // ── [4] VACANCY CHECK ────────────────────────────────────────────────────
    if (typeof draft.totalVacancies !== 'number' || draft.totalVacancies < 0) {
      checkResults.vacancies = 'FAIL';
      criticalErrors.push({ category: 'vacancies', message: `totalVacancies is invalid: ${draft.totalVacancies}`, blocking: false });
      issuesFoundThisCycle = true;
    }
    // Category totals must not exceed total (when present)
    if (draft.categoryWiseVacancies && draft.totalVacancies > 0) {
      const cv = draft.categoryWiseVacancies;
      const catSum = (cv.ur ?? 0) + (cv.obc ?? 0) + (cv.sc ?? 0) + (cv.st ?? 0) + (cv.ews ?? 0);
      if (catSum > draft.totalVacancies) {
        checkResults.vacancies = 'FAIL';
        recordReprocess('categoryWiseVacancies', `Category sum (${catSum}) exceeds totalVacancies (${draft.totalVacancies})`, 'VerificationAgent', ['NormalizationAgent', 'ContentAgent']);
        issuesFoundThisCycle = true;
      } else if (catSum > 0 && catSum < draft.totalVacancies) {
        warnings.push({ category: 'vacancies', message: `Category breakdown sums to ${catSum}, but totalVacancies is ${draft.totalVacancies}. May be incomplete.` });
        if (checkResults.vacancies === 'PASS') checkResults.vacancies = 'WARN';
      }
    }

    // ── [5] ELIGIBILITY CHECK ─────────────────────────────────────────────────
    if (!draft.qualification) {
      checkResults.eligibility = 'FAIL';
      criticalErrors.push({ category: 'eligibility', message: 'qualification field is empty', blocking: false });
      issuesFoundThisCycle = true;
    }
    if (typeof draft.ageMin !== 'number' || typeof draft.ageMax !== 'number') {
      checkResults.eligibility = 'FAIL';
      criticalErrors.push({ category: 'eligibility', message: 'ageMin or ageMax is missing', blocking: false });
      issuesFoundThisCycle = true;
    } else if (draft.ageMin >= draft.ageMax) {
      checkResults.eligibility = 'FAIL';
      recordReprocess('ageMin/ageMax', `ageMin (${draft.ageMin}) >= ageMax (${draft.ageMax})`, 'ExtractionAgent', ['NormalizationAgent', 'VerificationAgent']);
      issuesFoundThisCycle = true;
    }
    const rawQD = draft.qualificationDetails ?? '';
    const cleanedQD = cleanText(rawQD);
    if (cleanedQD !== rawQD) {
      recordFix('qualificationDetails', rawQD, cleanedQD, 'Trimmed whitespace');
      draft = { ...draft, qualificationDetails: cleanedQD };
      issuesFoundThisCycle = true;
    }

    // ── [6] FEE CHECK ────────────────────────────────────────────────────────
    if (!draft.applicationFee?.generalObc) {
      warnings.push({ category: 'fee', message: 'applicationFee.generalObc is empty — mark as NOT_PROVIDED if source confirms fee exemption' });
      if (checkResults.fee === 'PASS') checkResults.fee = 'WARN';
    }
    // Detect AI-invented implausible fee text (contains words not typical of govt fees)
    const feeStr = JSON.stringify(draft.applicationFee ?? '');
    if (/accommodation|travel allowance|hostel/i.test(feeStr)) {
      recordRemoved('applicationFee', feeStr, 'Fee details contain unsupported non-fee claims', 'HIGH');
      checkResults.fee = 'WARN';
      issuesFoundThisCycle = true;
    }

    // ── [7] SALARY CHECK ─────────────────────────────────────────────────────
    const salaryStr = JSON.stringify(draft.salary ?? '');
    // If salary fields are default placeholder and no evidence, warn
    if (!draft.salary?.payScale && !draft.salary?.basicPay) {
      warnings.push({ category: 'salary', message: 'salary.payScale and salary.basicPay are both empty — mark salary_status = NOT_PROVIDED if source does not specify' });
      if (checkResults.salary === 'PASS') checkResults.salary = 'WARN';
    }
    // Detect AI-invented estimated salary with no evidence
    if (/approximately|estimated|around ₹|circa/i.test(salaryStr)) {
      recordRemoved('salary', salaryStr, 'Salary contains estimated/invented figures not from verified source', 'HIGH');
      checkResults.salary = 'WARN';
      issuesFoundThisCycle = true;
    }

    // ── [8] SELECTION PROCESS CHECK ──────────────────────────────────────────
    if (!Array.isArray(draft.selectionProcess) || draft.selectionProcess.length === 0) {
      checkResults.selection = 'FAIL';
      recordReprocess('selectionProcess', 'selectionProcess array is empty', 'ExtractionAgent', ['ContentAgent', 'VerificationAgent']);
      issuesFoundThisCycle = true;
    } else {
      // Clean whitespace in each step
      const cleaned = draft.selectionProcess.map(cleanText);
      const changed = cleaned.some((s, i) => s !== draft.selectionProcess[i]);
      if (changed) {
        recordFix('selectionProcess', JSON.stringify(draft.selectionProcess), JSON.stringify(cleaned), 'Trimmed whitespace in selection process steps');
        draft = { ...draft, selectionProcess: cleaned };
        issuesFoundThisCycle = true;
      }
    }

    // ── [9] CONTENT / OVERVIEW CHECK ─────────────────────────────────────────
    const rawOverview = draft.overview ?? '';
    const cleanedOverview = cleanText(rawOverview);
    if (cleanedOverview !== rawOverview) {
      recordFix('overview', rawOverview, cleanedOverview, 'Trimmed whitespace in overview');
      draft = { ...draft, overview: cleanedOverview };
      issuesFoundThisCycle = true;
    }
    if (!draft.overview || draft.overview.length < 20) {
      checkResults.content = 'FAIL';
      recordReprocess('overview', 'overview is too short or missing', 'ContentAgent', ['SEOAgent']);
      issuesFoundThisCycle = true;
    }
    // Detect unsupported factual claims in overview
    const unsupportedPhrases = [
      { pattern: /provides?\s+(accommodation|housing|hostel)/i, label: 'provides accommodation' },
      { pattern: /guaranteed\s+(job|placement|posting)/i, label: 'guaranteed placement' },
      { pattern: /\d+\s*(lakh|crore)\s*salary/i, label: 'invented high salary claim' },
    ];
    for (const { pattern, label } of unsupportedPhrases) {
      if (pattern.test(draft.overview)) {
        const match = draft.overview.match(pattern)?.[0] ?? label;
        const cleaned = draft.overview.replace(pattern, '').replace(/\s{2,}/g, ' ').trim();
        recordRemoved('overview', match, `Unsupported claim detected: "${label}"`, 'HIGH');
        draft = { ...draft, overview: cleaned };
        checkResults.content = 'WARN';
        issuesFoundThisCycle = true;
      }
    }

    // ── [10] URL CHECK ───────────────────────────────────────────────────────
    const urlFields: Array<{ key: string; val: string | undefined }> = [
      { key: 'links.officialWebsiteUrl', val: draft.links?.officialWebsiteUrl },
      { key: 'links.applyUrl', val: draft.links?.applyUrl },
      { key: 'links.notificationUrl', val: draft.links?.notificationUrl },
    ];
    for (const { key, val } of urlFields) {
      if (!val) {
        warnings.push({ category: 'urls', message: `${key} is missing` });
        if (checkResults.urls === 'PASS') checkResults.urls = 'WARN';
        continue;
      }
      // Fix http:// → https:// when the domain is a known gov domain
      if (/^http:\/\/(.*\.gov\.in|.*\.nic\.in|.*\.gov\.in)/i.test(val)) {
        const fixed = val.replace(/^http:\/\//, 'https://');
        const fieldKey = key.split('.')[1] as keyof typeof draft.links;
        recordFix(key, val, fixed, 'Upgraded government URL from http to https');
        draft = { ...draft, links: { ...draft.links, [fieldKey]: fixed } };
        issuesFoundThisCycle = true;
      }
      // Detect obviously malformed URLs (no dot in host)
      try {
        const u = new URL(val);
        if (!u.hostname.includes('.')) throw new Error('no dot');
      } catch {
        checkResults.urls = 'FAIL';
        criticalErrors.push({ category: 'urls', message: `${key} is malformed: "${val}"`, blocking: false });
        issuesFoundThisCycle = true;
      }
    }

    // ── [11] SEO / SLUG CHECK ────────────────────────────────────────────────
    const rawSlug = draft.slug ?? '';
    // Malformed slug: uppercase, spaces, special chars
    const expectedSlug = makeSlug(draft.title);
    if (!rawSlug || rawSlug !== rawSlug.toLowerCase() || /[^a-z0-9-]/.test(rawSlug)) {
      recordFix('slug', rawSlug, expectedSlug, 'Generated clean slug from verified title');
      draft = { ...draft, slug: expectedSlug };
      checkResults.seo = 'WARN';
      issuesFoundThisCycle = true;
    }

    // ── [12] DUPLICATE CHECK ─────────────────────────────────────────────────
    // Check published + other drafts for same advertisementNumber + org
    const advNo = (draft.advertisementNumber ?? '').trim().toLowerCase();
    const org = (draft.organization ?? '').trim().toLowerCase();
    if (advNo) {
      const allJobs = JobRepository.findAll();
      const allDrafts = DraftRepository.findAll();
      const exactDup = [...allJobs, ...allDrafts].find(
        (j) =>
          j.id !== draft.id &&
          (j.advertisementNumber ?? '').trim().toLowerCase() === advNo &&
          (j.organization ?? '').trim().toLowerCase() === org
      );
      if (exactDup) {
        checkResults.duplicate = 'FAIL';
        criticalErrors.push({
          category: 'duplicate',
          message: `Exact duplicate found: id="${exactDup.id}" title="${exactDup.title}" has same advertisementNumber and organization`,
          blocking: true,
        });
        issuesFoundThisCycle = true;
      }
    }

    // ── [13] DATABASE / SCHEMA CHECK ─────────────────────────────────────────
    const requiredFields: Array<keyof typeof draft> = [
      'id', 'slug', 'title', 'organization', 'department', 'category',
      'qualification', 'totalVacancies', 'applicationStart', 'applicationEnd',
      'applicationFee', 'salary', 'selectionProcess', 'howToApply', 'overview',
      'status', 'links', 'sourceInfo', 'verificationStatus', 'qualityStatus',
      'isDraft', 'createdAt', 'updatedAt',
    ];
    for (const rf of requiredFields) {
      if (draft[rf] === undefined || draft[rf] === null || draft[rf] === '') {
        checkResults.schema = 'FAIL';
        // Safe fields we can generate
        if (rf === 'slug') {
          const gen = makeSlug(draft.title);
          recordFix('slug', '', gen, 'Generated missing slug from title');
          draft = { ...draft, slug: gen };
          issuesFoundThisCycle = true;
        } else if (rf === 'updatedAt') {
          recordFix('updatedAt', '', ts(), 'Set missing updatedAt to current timestamp');
          draft = { ...draft, updatedAt: ts() };
          issuesFoundThisCycle = true;
        } else if (rf === 'createdAt') {
          recordFix('createdAt', '', ts(), 'Set missing createdAt to current timestamp');
          draft = { ...draft, createdAt: ts() };
          issuesFoundThisCycle = true;
        } else {
          criticalErrors.push({ category: 'schema', message: `Required field "${rf}" is missing or empty`, blocking: false });
        }
      }
    }
    // status enum check
    const validStatuses = ['NEW', 'ACTIVE', 'CLOSING_SOON', 'TODAY', 'CLOSED'];
    if (!validStatuses.includes(draft.status)) {
      recordFix('status', draft.status, 'NEW', 'Invalid status enum value reset to NEW');
      draft = { ...draft, status: 'NEW' };
      issuesFoundThisCycle = true;
    }
    // Derive isClosingSoon from applicationEnd if deterministic
    if (isValidDate(draft.applicationEnd)) {
      const daysLeft = Math.ceil((new Date(draft.applicationEnd).getTime() - Date.now()) / 86400000);
      const shouldBeClosingSoon = daysLeft >= 0 && daysLeft <= 7;
      if (draft.isClosingSoon !== shouldBeClosingSoon) {
        recordFix('isClosingSoon', String(draft.isClosingSoon), String(shouldBeClosingSoon), 'Derived isClosingSoon from applicationEnd date');
        draft = { ...draft, isClosingSoon: shouldBeClosingSoon };
        issuesFoundThisCycle = true;
      }
      // Derive status from date
      const isPast = daysLeft < 0;
      const isToday = daysLeft === 0;
      let derivedStatus: typeof draft.status = draft.status;
      if (isPast) derivedStatus = 'CLOSED';
      else if (isToday) derivedStatus = 'TODAY';
      else if (shouldBeClosingSoon) derivedStatus = 'CLOSING_SOON';
      if (derivedStatus !== draft.status && (isPast || isToday)) {
        recordFix('status', draft.status, derivedStatus, `Status derived from applicationEnd date (${daysLeft} days remaining)`);
        draft = { ...draft, status: derivedStatus };
        issuesFoundThisCycle = true;
      }
    }

    // ── [14] AGENT PIPELINE CHECK ─────────────────────────────────────────────
    const requiredAgents = ['DISCOVERY', 'EXTRACTION', 'VERIFICATION'];
    const draftAny = draft as any;
    const existingAgentLogs: Array<{ agentType: string; status: string }> = draftAny.agentLogs ?? [];
    for (const agent of requiredAgents) {
      const found = existingAgentLogs.find((l) => l.agentType === agent);
      if (!found) {
        checkResults.agent_pipeline = 'FAIL';
        recordReprocess('agentLogs', `Required agent "${agent}" has no log entry — stage not completed`, 'VerificationAgent', []);
        issuesFoundThisCycle = true;
      } else if (found.status === 'FAILED') {
        checkResults.agent_pipeline = 'FAIL';
        recordReprocess('agentLogs', `Agent "${agent}" previously FAILED — must reprocess from that stage`, agent as any, []);
        issuesFoundThisCycle = true;
      }
    }

    // ── [15] PUBLIC RENDER CHECK ──────────────────────────────────────────────
    // Ensure all fields used by public job pages are non-empty
    const renderFields: Array<{ field: keyof typeof draft; label: string }> = [
      { field: 'title', label: 'Title' },
      { field: 'organization', label: 'Organization' },
      { field: 'overview', label: 'Overview' },
      { field: 'qualification', label: 'Qualification' },
      { field: 'applicationEnd', label: 'Application End Date' },
    ];
    for (const { field, label } of renderFields) {
      if (!draft[field]) {
        checkResults.public_render_data = 'FAIL';
        criticalErrors.push({ category: 'public_render_data', message: `Public page field "${label}" is missing`, blocking: false });
        issuesFoundThisCycle = true;
      }
    }

    // If no issues found this cycle, break the loop naturally
  } // end while

  // ── SCORING ────────────────────────────────────────────────────────────────
  const checkValues = Object.values(checkResults) as QACheckResult[];
  const failCount = checkValues.filter((v) => v === 'FAIL').length;
  const warnCount = checkValues.filter((v) => v === 'WARN').length;
  const baseScore = 100 - failCount * 10 - warnCount * 3;
  const overallScore = Math.max(0, Math.min(100, baseScore));

  // ── FINAL STATUS DECISION ─────────────────────────────────────────────────
  const hasBlockingCritical = criticalErrors.some((e) => e.blocking);
  const hasCritical = criticalErrors.length > 0;
  const hasReprocess = reprocessRequests.length > 0;
  const hasManual = manualReviewItems.length > 0;

  let finalStatus: QAFinalStatus;
  if (hasBlockingCritical) {
    finalStatus = 'BLOCKED';
  } else if (hasCritical || checkResults.duplicate === 'FAIL') {
    finalStatus = 'BLOCKED';
  } else if (hasReprocess) {
    finalStatus = 'REPROCESS_REQUIRED';
  } else if (hasManual || cycle >= MAX_CYCLES) {
    finalStatus = 'MANUAL_REVIEW_REQUIRED';
  } else {
    finalStatus = 'READY_FOR_ADMIN_REVIEW';
  }

  // ── PERSIST FIXED DRAFT BACK ──────────────────────────────────────────────
  if (autoFixes.length > 0 || removedContent.length > 0) {
    draft.updatedAt = ts();
    draftsDb[draftIdx] = draft;
    logAudit('QA_AUTO_FIX', `Final QA Agent applied ${autoFixes.length} auto-fix(es) to draft: ${draft.title}`);
  }

  // ── RECOMMENDATION ────────────────────────────────────────────────────────
  let recommendation = '';
  if (finalStatus === 'READY_FOR_ADMIN_REVIEW') {
    recommendation = `All ${checkValues.length} checks passed after ${cycle} cycle(s). ${autoFixes.length} safe fix(es) applied automatically. Send to administrator for final approval.`;
  } else if (finalStatus === 'BLOCKED') {
    recommendation = `${criticalErrors.length} critical error(s) block publication. Resolve before this draft can proceed.`;
  } else if (finalStatus === 'REPROCESS_REQUIRED') {
    recommendation = `${reprocessRequests.length} field(s) require re-extraction or re-verification. Route to responsible agents.`;
  } else {
    recommendation = `${manualReviewItems.length} issue(s) require manual human review — cannot be resolved automatically.`;
  }

  // ── ADD QA AGENT LOG ENTRY ────────────────────────────────────────────────
  const qaLog: AgentLog = {
    id: `alg-qa-${Date.now()}`,
    itemTitle: draft.title,
    agentType: 'QUALITY_CONTROL',
    status: finalStatus === 'READY_FOR_ADMIN_REVIEW' ? 'SUCCESS' : finalStatus === 'BLOCKED' ? 'FAILED' : 'WARNING',
    durationMs: cycle * 80,
    modelUsed: 'Final QA Rules Engine v1',
    inputSummary: `Ran ${checkValues.length} checks over ${cycle} cycle(s) on draft "${draft.title}"`,
    outputSummary: `Status: ${finalStatus} | Score: ${overallScore}/100 | Fixes: ${autoFixes.length} | Errors: ${criticalErrors.length}`,
    issueDetails: criticalErrors.map((e) => e.message).join('; ') || undefined,
    timestamp: ts(),
  };
  agentLogsDb.unshift(qaLog);

  const report: QAFinalReport = {
    draft_id: draft.id,
    draft_title: draft.title,
    final_status: finalStatus,
    overall_score: overallScore,
    cycles_completed: cycle,
    checks: checkResults,
    auto_fixes: autoFixes,
    removed_unsupported_content: removedContent,
    reprocess_requests: reprocessRequests,
    manual_review_items: manualReviewItems,
    critical_errors: criticalErrors,
    warnings,
    final_recommendation: recommendation,
    run_at: ts(),
  };

  res.json({ success: true, data: report });
  } catch (error) {
    console.error('[QA] Error in QA check:', error);
    res.status(500).json({ success: false, message: 'QA check failed' });
  }
});
// ─── END FINAL QA AGENT ──────────────────────────────────────────────────────

// ─── NVIDIA AGENT MONITORING ENDPOINTS ───────────────────────────────────────

// GET /api/admin/agent-stats — per-agent runtime stats (success rate, avg ms, etc.)
app.get('/api/admin/agent-stats', (_req, res) => {
  res.json({
    success: true,
    model: NVIDIA_MODEL_ID,
    model_display: NVIDIA_MODEL_DISPLAY_NAME,
    data: getAllAgentStats(),
  });
});

// GET /api/admin/nvidia/test — lightweight connectivity + auth check
app.get('/api/admin/nvidia/test', async (_req, res) => {
  const result = await testNvidiaConnection();
  // Never echo the key; the result object from testNvidiaConnection() already omits it
  res.json({
    success: result.ok,
    model: result.model || NVIDIA_MODEL_ID,
    durationMs: result.durationMs,
    error: result.error ?? null,
  });
});

// GET /api/admin/logs (alias for pipeline/logs used by AdminAuditLogs)
app.get('/api/admin/logs', (req, res) => {
  if (!isDatabaseAvailable()) {
    return res.status(503).json({ success: false, message: 'Database unavailable' });
  }

  try {
    const logs = AgentLogRepository.findAll({ limit: 1000 });
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('[API] Error fetching logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});

// ─── WEB SCRAPER ADMIN ENDPOINTS ─────────────────────────────────────────────

// GET /api/admin/scraper/status — Get current scraper status and stats
app.get('/api/admin/scraper/status', requireDatabase, (req, res) => {
  try {
    const stats = scraperScheduler.getStats();
    const info = scraperScheduler.getInfo();
    res.json({ success: true, data: { ...info, ...stats } });
  } catch (error) {
    console.error('[API] Error fetching scraper status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch scraper status' });
  }
});

// POST /api/admin/scraper/run — Manually trigger scraper
app.post('/api/admin/scraper/run', requireDatabase, async (req, res) => {
  try {
    console.log('[Scraper API] Manual scraper run requested by admin');
    const result = await scraperScheduler.runManually();
    logAudit('SCRAPER_MANUAL_RUN', `Admin triggered manual scraper run: ${result.jobsProcessed} jobs processed`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Scraper API] Manual scraper run failed:', error);
    logAudit('SCRAPER_MANUAL_RUN_FAILED', `Admin manual scraper run failed: ${error}`);
    res.status(500).json({ success: false, message: 'Scraper execution failed' });
  }
});

// POST /api/admin/scraper/start — Start the scheduler
app.post('/api/admin/scraper/start', requireDatabase, (req, res) => {
  try {
    scraperScheduler.start();
    logAudit('SCRAPER_SCHEDULER_START', 'Admin started scraper scheduler');
    res.json({ success: true, message: 'Scraper scheduler started', data: scraperScheduler.getInfo() });
  } catch (error) {
    console.error('[Scraper API] Failed to start scheduler:', error);
    logAudit('SCRAPER_SCHEDULER_START_FAILED', `Failed to start scraper: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to start scheduler' });
  }
});

// POST /api/admin/scraper/stop — Stop the scheduler
app.post('/api/admin/scraper/stop', requireDatabase, (req, res) => {
  try {
    scraperScheduler.stop();
    logAudit('SCRAPER_SCHEDULER_STOP', 'Admin stopped scraper scheduler');
    res.json({ success: true, message: 'Scraper scheduler stopped', data: scraperScheduler.getInfo() });
  } catch (error) {
    console.error('[Scraper API] Failed to stop scheduler:', error);
    logAudit('SCRAPER_SCHEDULER_STOP_FAILED', `Failed to stop scraper: ${error}`);
    res.status(500).json({ success: false, message: 'Failed to stop scheduler' });
  }
});

// POST /api/admin/scraper/reset-stats — Reset scraper statistics
app.post('/api/admin/scraper/reset-stats', requireDatabase, (req, res) => {
  try {
    scraperScheduler.resetStats();
    logAudit('SCRAPER_STATS_RESET', 'Admin reset scraper statistics');
    res.json({ success: true, message: 'Scraper statistics reset', data: scraperScheduler.getStats() });
  } catch (error) {
    console.error('[Scraper API] Failed to reset stats:', error);
    res.status(500).json({ success: false, message: 'Failed to reset statistics' });
  }
});

startServer();
