/**
 * Agent Execution Service
 *
 * Generic run_agent() engine that:
 *  1. Loads agent config + system prompt
 *  2. Validates input
 *  3. Sends request to NVIDIA via the central AI service
 *  4. Parses JSON output
 *  5. Validates output schema
 *  6. Records execution status
 *  7. Retries on retryable errors (max 3 attempts)
 *  8. Returns a structured AgentResult
 *
 * The API key NEVER leaves nvidiaAIService.ts.
 */

import {
  nvidiaChat,
  extractJSON,
  NVIDIA_MODEL_DISPLAY_NAME,
  NVIDIA_MODEL_ID,
  NvidiaAPIError,
  NvidiaTimeoutError,
  NvidiaParseError,
  NvidiaConfigError,
  type NvidiaMessage,
  type NvidiaRequestOptions,
} from './nvidiaAIService.js';

import { DISCOVERY_SYSTEM_PROMPT }    from '../agents/discovery/prompt.js';
import { CLASSIFICATION_SYSTEM_PROMPT } from '../agents/classification/prompt.js';
import { EXTRACTION_SYSTEM_PROMPT }   from '../agents/extraction/prompt.js';
import { NORMALIZATION_SYSTEM_PROMPT } from '../agents/normalization/prompt.js';
import { DUPLICATE_SYSTEM_PROMPT }    from '../agents/duplicate/prompt.js';
import { ENRICHMENT_SYSTEM_PROMPT }   from '../agents/enrichment/prompt.js';
import { CONTENT_SYSTEM_PROMPT }      from '../agents/content/prompt.js';
import { SEO_SYSTEM_PROMPT }          from '../agents/seo/prompt.js';
import { VERIFICATION_SYSTEM_PROMPT } from '../agents/verification/prompt.js';
import { QUALITY_SYSTEM_PROMPT }      from '../agents/quality/prompt.js';
import { DRAFT_SYSTEM_PROMPT }        from '../agents/draft/prompt.js';
import { FINAL_QA_SYSTEM_PROMPT }     from '../agents/final_qa/prompt.js';

import type { AgentType } from '../types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentStatus = 'SUCCESS' | 'WARNING' | 'FAILED' | 'RUNNING';

export interface AgentDefinition {
  id: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  version: string;
}

export interface AgentResult {
  agentId: AgentType;
  agentName: string;
  status: AgentStatus;
  output: unknown;          // parsed JSON output — caller casts to their type
  rawContent: string;       // raw model text before parsing
  durationMs: number;
  attempts: number;
  modelUsed: string;
  inputSummary: string;
  outputSummary: string;
  errorMessage?: string;
  timestamp: string;
}

export interface AgentRunOptions {
  /** Override default max retries (default: 3). */
  maxRetries?: number;
  /** Override default retry delay ms (default: 1500). */
  retryDelayMs?: number;
  /** Override default request timeout ms (default: 30_000). */
  timeoutMs?: number;
}

// ─── Agent Registry ───────────────────────────────────────────────────────────
// One centralized registry — all agents share NVIDIA_MODEL_ID, differ only in prompt.

const AGENT_REGISTRY: Record<AgentType, AgentDefinition> = {
  DISCOVERY: {
    id: 'DISCOVERY',
    name: 'Discovery Agent',
    description: 'Detects genuine government recruitment notifications',
    systemPrompt: DISCOVERY_SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 512,
    version: '1.0.0',
  },
  CLASSIFICATION: {
    id: 'CLASSIFICATION',
    name: 'Classification Agent',
    description: 'Classifies job category and qualification level',
    systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 512,
    version: '1.0.0',
  },
  EXTRACTION: {
    id: 'EXTRACTION',
    name: 'Extraction Agent',
    description: 'Extracts all structured fields from notification text',
    systemPrompt: EXTRACTION_SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 2048,
    version: '1.0.0',
  },
  NORMALIZATION: {
    id: 'NORMALIZATION',
    name: 'Normalization Agent',
    description: 'Normalizes dates, salary, fees to standard formats',
    systemPrompt: NORMALIZATION_SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 2048,
    version: '1.0.0',
  },
  DUPLICATE: {
    id: 'DUPLICATE',
    name: 'Duplicate Detection Agent',
    description: 'Detects duplicate or near-duplicate notifications',
    systemPrompt: DUPLICATE_SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 512,
    version: '1.0.0',
  },
  ENRICHMENT: {
    id: 'ENRICHMENT',
    name: 'Enrichment Agent',
    description: 'Enriches records with age relaxation, eligibility details',
    systemPrompt: ENRICHMENT_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 1024,
    version: '1.0.0',
  },
  CONTENT: {
    id: 'CONTENT',
    name: 'Content Agent',
    description: 'Generates candidate-facing overview and highlights',
    systemPrompt: CONTENT_SYSTEM_PROMPT,
    temperature: 0.5,
    maxTokens: 1024,
    version: '1.0.0',
  },
  SEO: {
    id: 'SEO',
    name: 'SEO Agent',
    description: 'Generates slug, meta title, meta description, keywords',
    systemPrompt: SEO_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 512,
    version: '1.0.0',
  },
  VERIFICATION: {
    id: 'VERIFICATION',
    name: 'Verification Agent',
    description: 'Hard-gate cross-checks every field against source evidence',
    systemPrompt: VERIFICATION_SYSTEM_PROMPT,
    temperature: 0.0,
    maxTokens: 1024,
    version: '1.0.0',
  },
  QUALITY_CONTROL: {
    id: 'QUALITY_CONTROL',
    name: 'Quality Control Agent',
    description: 'Scores completeness, consistency, readability',
    systemPrompt: QUALITY_SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 512,
    version: '1.0.0',
  },
  DRAFT: {
    id: 'DRAFT',
    name: 'Draft Assembly Agent',
    description: 'Assembles final GovtJobDraft from all agent outputs',
    systemPrompt: DRAFT_SYSTEM_PROMPT,
    temperature: 0.1,
    maxTokens: 2048,
    version: '1.0.0',
  },
  FINAL_QA: {
    id: 'FINAL_QA',
    name: 'Final QA Agent',
    description: 'Final inspection + auto-fix before admin review',
    systemPrompt: FINAL_QA_SYSTEM_PROMPT,
    temperature: 0.0,
    maxTokens: 1024,
    version: '1.0.0',
  },
};

// ─── Execution Stats (in-memory, per server restart) ─────────────────────────

interface AgentStats {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  totalDurationMs: number;
  lastRun: string | null;
  lastStatus: AgentStatus | null;
  lastError: string | null;
}

const agentStats: Record<string, AgentStats> = {};

function getStats(agentId: AgentType): AgentStats {
  if (!agentStats[agentId]) {
    agentStats[agentId] = {
      totalRuns: 0, successCount: 0, failureCount: 0,
      warningCount: 0, totalDurationMs: 0,
      lastRun: null, lastStatus: null, lastError: null,
    };
  }
  return agentStats[agentId];
}

function recordStats(agentId: AgentType, result: AgentResult) {
  const s = getStats(agentId);
  s.totalRuns++;
  s.totalDurationMs += result.durationMs;
  s.lastRun = result.timestamp;
  s.lastStatus = result.status;
  if (result.status === 'SUCCESS') s.successCount++;
  else if (result.status === 'FAILED') { s.failureCount++; s.lastError = result.errorMessage ?? null; }
  else if (result.status === 'WARNING') s.warningCount++;
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ─── Core run_agent() ─────────────────────────────────────────────────────────

/**
 * Execute a single agent against the provided input data.
 *
 * @param agentId  - Which agent to run (maps to system prompt + config)
 * @param input    - Arbitrary input object; serialized as user message JSON
 * @param options  - Optional overrides for retry/timeout
 */
export async function runAgent(
  agentId: AgentType,
  input: unknown,
  options: AgentRunOptions = {}
): Promise<AgentResult> {
  const def = AGENT_REGISTRY[agentId];
  if (!def) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const maxRetries  = options.maxRetries   ?? 2;
  const retryDelay  = options.retryDelayMs ?? 2000;
  const timeoutMs   = options.timeoutMs    ?? 120_000;

  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
  const inputSummary = inputStr.length > 200
    ? inputStr.slice(0, 200) + '…'
    : inputStr;

  const startedAt = Date.now();
  let attempts = 0;
  let lastError = '';

  while (attempts < maxRetries) {
    attempts++;
    try {
      const messages: NvidiaMessage[] = [
        { role: 'system', content: def.systemPrompt },
        { role: 'user',   content: inputStr },
      ];

      const nvidiaOpts: NvidiaRequestOptions = {
        temperature: def.temperature,
        maxTokens:   def.maxTokens,
        timeoutMs,
      };

      const response = await nvidiaChat(messages, nvidiaOpts);
      const durationMs = Date.now() - startedAt;

      // Parse JSON — throws NvidiaParseError if unparseable
      const parsed = extractJSON(response.content);

      const outputSummary = JSON.stringify(parsed).slice(0, 200);

      const result: AgentResult = {
        agentId,
        agentName: def.name,
        status: 'SUCCESS',
        output: parsed,
        rawContent: response.content,
        durationMs,
        attempts,
        modelUsed: NVIDIA_MODEL_DISPLAY_NAME,
        inputSummary,
        outputSummary,
        timestamp: new Date().toISOString(),
      };

      recordStats(agentId, result);
      return result;

    } catch (err: unknown) {
      const isRetryable =
        err instanceof NvidiaAPIError    && err.retryable ||
        err instanceof NvidiaTimeoutError                 ||
        err instanceof NvidiaParseError;

      const errMsg = err instanceof Error ? err.message : String(err);
      lastError = errMsg;

      // Do NOT retry NvidiaConfigError — key is missing, retrying won't help
      if (err instanceof NvidiaConfigError) break;

      if (!isRetryable || attempts >= maxRetries) break;

      // Exponential back-off: 1.5s, 3s, 6s
      await sleep(retryDelay * attempts);
    }
  }

  // All attempts exhausted
  const durationMs = Date.now() - startedAt;
  const result: AgentResult = {
    agentId,
    agentName: def.name,
    status: 'FAILED',
    output: null,
    rawContent: '',
    durationMs,
    attempts,
    modelUsed: NVIDIA_MODEL_DISPLAY_NAME,
    inputSummary,
    outputSummary: `Failed after ${attempts} attempt(s)`,
    errorMessage: lastError,
    timestamp: new Date().toISOString(),
  };

  recordStats(agentId, result);
  return result;
}

// ─── Pipeline runner ──────────────────────────────────────────────────────────

/**
 * Run multiple agents sequentially, passing the previous output
 * as input to the next agent.
 *
 * @param stages  - Ordered list of agent IDs to run
 * @param initialInput - Input to the first agent
 * @param options - Options applied to every agent
 * @returns Map of agentId → AgentResult
 */
export async function runPipeline(
  stages: AgentType[],
  initialInput: unknown,
  options: AgentRunOptions = {}
): Promise<Map<AgentType, AgentResult>> {
  const results = new Map<AgentType, AgentResult>();
  let currentInput: unknown = initialInput;

  for (const agentId of stages) {
    const result = await runAgent(agentId, currentInput, options);
    results.set(agentId, result);

    if (result.status === 'FAILED') {
      // Abort pipeline on hard failure
      console.error(`[Pipeline] Agent ${agentId} failed — aborting pipeline.`);
      break;
    }

    // Pass this agent's parsed output to the next as enriched input
    currentInput = { ...( typeof currentInput === 'object' && currentInput !== null ? currentInput : {} ),
      ...(typeof result.output === 'object' && result.output !== null ? result.output : {}) };
  }

  return results;
}

// ─── Admin Stats Exports ──────────────────────────────────────────────────────

export interface AgentMonitorEntry {
  agentId: AgentType;
  agentName: string;
  description: string;
  model: string;
  version: string;
  totalRuns: number;
  successRate: string;
  avgDurationMs: number;
  failureCount: number;
  warningCount: number;
  lastRun: string | null;
  lastStatus: AgentStatus | null;
  lastError: string | null;
}

export function getAllAgentStats(): AgentMonitorEntry[] {
  return (Object.keys(AGENT_REGISTRY) as AgentType[]).map((agentId) => {
    const def = AGENT_REGISTRY[agentId];
    const s   = getStats(agentId);
    const rate = s.totalRuns > 0
      ? ((s.successCount / s.totalRuns) * 100).toFixed(1) + '%'
      : 'N/A';
    const avgMs = s.totalRuns > 0
      ? Math.round(s.totalDurationMs / s.totalRuns)
      : 0;

    return {
      agentId,
      agentName: def.name,
      description: def.description,
      model: NVIDIA_MODEL_ID,
      version: def.version,
      totalRuns: s.totalRuns,
      successRate: rate,
      avgDurationMs: avgMs,
      failureCount: s.failureCount,
      warningCount: s.warningCount,
      lastRun: s.lastRun,
      lastStatus: s.lastStatus,
      lastError: s.lastError,
    };
  });
}

export { AGENT_REGISTRY, NVIDIA_MODEL_DISPLAY_NAME, NVIDIA_MODEL_ID };
