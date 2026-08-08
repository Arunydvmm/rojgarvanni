/**
 * NVIDIA Multi-Agent Integration Tests
 *
 * Covers: connection, authentication, model config, single agent,
 * multiple agents, pipeline, failure handling, JSON parsing, retry,
 * and security (no key leakage).
 *
 * Run with:  node --experimental-vm-modules src/tests/nvidiaIntegration.test.ts
 * Or via tsx: npx tsx src/tests/nvidiaIntegration.test.ts
 *
 * Requires NVIDIA_API_KEY env var to be set for live tests.
 * Tests that require a live key are marked [LIVE].
 * Tests that are purely local logic are marked [LOCAL].
 */

import 'dotenv/config';
import {
  nvidiaChat,
  extractJSON,
  testNvidiaConnection,
  NvidiaConfigError,
  NvidiaParseError,
  NvidiaAPIError,
  NVIDIA_MODEL_ID,
  NVIDIA_API_BASE,
} from '../services/nvidiaAIService.js';

import {
  runAgent,
  runPipeline,
  getAllAgentStats,
  AGENT_REGISTRY,
} from '../services/agentExecutionService.js';

// ─── Mini test harness ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results: { name: string; ok: boolean; detail: string }[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    results.push({ name, ok: true, detail: '' });
    passed++;
  } catch (err: any) {
    const detail = err?.message ?? String(err);
    console.error(`  ❌ ${name}\n     ${detail}`);
    results.push({ name, ok: false, detail });
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

const LIVE = !!process.env.NVIDIA_API_KEY &&
  process.env.NVIDIA_API_KEY !== 'your_new_rotated_key';

const SAMPLE_TEXT = `
STAFF SELECTION COMMISSION (SSC) - CGL 2026
Advertisement No: SSC/CGL/2026
Total Vacancies: 17,727 Posts
Application Start: 15-08-2026 | Application End: 15-09-2026
Qualification: Graduation | Age: 18-30 Years
Fee: Rs 100 for General/OBC | Exempted for SC/ST/Women
Pay Level: Level 6 to Level 8 | Official Website: https://ssc.gov.in
`;

// ─── Test Suite ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  RozgarVaani — NVIDIA Integration Test Suite');
  console.log('══════════════════════════════════════════════════\n');

  console.log('── [LOCAL] Configuration ──────────────────────────\n');

  // 1. Model ID is configured correctly
  await test('[LOCAL] Model ID matches spec', async () => {
    assert(NVIDIA_MODEL_ID === 'nvidia/nvidia-nemotron-nano-9b-v2',
      `Expected nvidia/nvidia-nemotron-nano-9b-v2, got ${NVIDIA_MODEL_ID}`);
  });

  // 2. API base is configured correctly
  await test('[LOCAL] API base matches spec', async () => {
    assert(NVIDIA_API_BASE === 'https://integrate.api.nvidia.com/v1',
      `Unexpected API base: ${NVIDIA_API_BASE}`);
  });

  // 3. All 12 agents registered
  await test('[LOCAL] All 12 agents are registered', async () => {
    const ids = Object.keys(AGENT_REGISTRY);
    assert(ids.length === 12, `Expected 12 agents, found ${ids.length}: ${ids.join(', ')}`);
    const required = ['DISCOVERY','CLASSIFICATION','EXTRACTION','NORMALIZATION',
      'DUPLICATE','ENRICHMENT','CONTENT','SEO','VERIFICATION','QUALITY_CONTROL','DRAFT','FINAL_QA'];
    for (const r of required) {
      assert(ids.includes(r), `Missing agent: ${r}`);
    }
  });

  // 4. Each agent has its own non-empty system prompt
  await test('[LOCAL] Each agent has a unique, non-empty system prompt', async () => {
    const prompts = Object.values(AGENT_REGISTRY).map((a) => a.systemPrompt);
    const unique = new Set(prompts);
    assert(unique.size === prompts.length, 'Two or more agents share the same system prompt!');
    for (const [id, def] of Object.entries(AGENT_REGISTRY)) {
      assert(def.systemPrompt.length > 50, `Agent ${id} has a suspiciously short prompt`);
    }
  });

  // 5. NvidiaConfigError thrown when key is missing
  await test('[LOCAL] NvidiaConfigError when API key is missing', async () => {
    const saved = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    let threw = false;
    try {
      await nvidiaChat([{ role: 'user', content: 'ping' }]);
    } catch (e) {
      if (e instanceof NvidiaConfigError) threw = true;
    }
    process.env.NVIDIA_API_KEY = saved;
    assert(threw, 'Expected NvidiaConfigError when key is missing');
  });

  // 6. extractJSON handles raw JSON
  await test('[LOCAL] extractJSON parses raw JSON string', async () => {
    const result = extractJSON('{"status":"ok","count":42}') as any;
    assert(result.status === 'ok', 'Expected status ok');
    assert(result.count === 42, 'Expected count 42');
  });

  // 7. extractJSON handles markdown fences
  await test('[LOCAL] extractJSON strips markdown code fences', async () => {
    const raw = '```json\n{"foo":"bar"}\n```';
    const result = extractJSON(raw) as any;
    assert(result.foo === 'bar', 'Expected foo=bar');
  });

  // 8. extractJSON throws NvidiaParseError for truly invalid JSON
  await test('[LOCAL] extractJSON throws NvidiaParseError for invalid JSON', async () => {
    let threw = false;
    try { extractJSON('This is not JSON at all.'); } catch (e) {
      if (e instanceof NvidiaParseError) threw = true;
    }
    assert(threw, 'Expected NvidiaParseError');
  });

  // 9. API key never appears in getAllAgentStats() output
  await test('[LOCAL] API key not present in agent stats output', async () => {
    const stats = JSON.stringify(getAllAgentStats());
    const key = process.env.NVIDIA_API_KEY ?? '';
    if (key && key !== 'your_new_rotated_key') {
      assert(!stats.includes(key), 'API key found in getAllAgentStats() output!');
    }
    // Also check no bearer patterns
    assert(!/Bearer\s+\S{10,}/i.test(stats), 'Bearer token found in stats output!');
  });

  // 10. runAgent returns FAILED gracefully when key is missing (no crash)
  await test('[LOCAL] runAgent returns FAILED status when key is missing', async () => {
    const saved = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    const result = await runAgent('DISCOVERY', { text: 'test' }, { maxRetries: 1 });
    process.env.NVIDIA_API_KEY = saved;
    assert(result.status === 'FAILED', 'Expected FAILED status');
    assert(result.output === null, 'Expected null output on failure');
    assert(!result.errorMessage?.includes(saved ?? ''), 'Error message leaks API key!');
  });

  // ── LIVE tests (only run when real API key is set) ─────────────────────────

  if (!LIVE) {
    console.log('\n── [LIVE] Tests skipped — NVIDIA_API_KEY not set ──────\n');
    console.log('  Set NVIDIA_API_KEY in your .env file to run live tests.\n');
  } else {
    console.log('\n── [LIVE] API Connection & Authentication ─────────────\n');

    // 11. Connection test passes
    await test('[LIVE] testNvidiaConnection returns ok=true', async () => {
      const r = await testNvidiaConnection();
      assert(r.ok, `Connection failed: ${r.error}`);
      assert(r.durationMs > 0, 'Expected durationMs > 0');
    });

    // 12. Model ID returned matches configured model
    await test('[LIVE] Returned model ID matches configuration', async () => {
      const r = await testNvidiaConnection();
      assert(r.ok, 'Connection not ok');
      assert(r.model.includes('nemotron') || r.model.includes('nvidia'),
        `Unexpected model in response: ${r.model}`);
    });

    // 13. API key not present in response
    await test('[LIVE] API key not present in nvidiaChat response', async () => {
      const r = await nvidiaChat([{ role: 'user', content: 'Reply: {"ok":true}' }], { maxTokens: 20 });
      const key = process.env.NVIDIA_API_KEY!;
      assert(!r.content.includes(key), 'API key found in response content!');
      assert(!JSON.stringify(r).includes(key), 'API key found in response JSON!');
    });

    console.log('\n── [LIVE] Single Agent ────────────────────────────────\n');

    // 14. Discovery agent on valid text
    await test('[LIVE] DISCOVERY agent identifies valid notification', async () => {
      const r = await runAgent('DISCOVERY', { text: SAMPLE_TEXT }, { maxRetries: 2 });
      assert(r.status === 'SUCCESS', `Expected SUCCESS, got ${r.status}: ${r.errorMessage}`);
      const out = r.output as any;
      assert(typeof out.is_recruitment_notification === 'boolean',
        'Missing is_recruitment_notification field');
    });

    // 15. Discovery agent on clearly invalid text
    await test('[LIVE] DISCOVERY agent rejects non-recruitment text', async () => {
      const r = await runAgent('DISCOVERY', { text: 'Today is a sunny day. Mangoes are in season.' }, { maxRetries: 2 });
      assert(r.status === 'SUCCESS', `Agent should complete even if false: ${r.errorMessage}`);
      const out = r.output as any;
      assert(out.is_recruitment_notification === false, 'Should classify as NOT a recruitment notice');
    });

    console.log('\n── [LIVE] Multiple Agents, Same Model ─────────────────\n');

    // 16. Classification + Extraction + SEO all use the same model ID
    await test('[LIVE] Classification, Extraction, SEO all use NVIDIA Nemotron Nano 9B', async () => {
      const [c, e, s] = await Promise.all([
        runAgent('CLASSIFICATION', { text: SAMPLE_TEXT }, { maxRetries: 2 }),
        runAgent('EXTRACTION',     { text: SAMPLE_TEXT }, { maxRetries: 2 }),
        runAgent('SEO',            { title: 'SSC CGL 2026', organization: 'SSC',
                                     total_vacancies: 17727, category: 'SSC' }, { maxRetries: 2 }),
      ]);
      for (const r of [c, e, s]) {
        assert(r.modelUsed === 'NVIDIA Nemotron Nano 9B',
          `Expected NVIDIA model, got: ${r.modelUsed}`);
      }
    });

    // 17. Extraction returns structured JSON
    await test('[LIVE] EXTRACTION agent returns valid structured JSON', async () => {
      const r = await runAgent('EXTRACTION', { text: SAMPLE_TEXT }, { maxRetries: 2 });
      assert(r.status === 'SUCCESS', `Extraction failed: ${r.errorMessage}`);
      const out = r.output as any;
      assert(typeof out === 'object' && out !== null, 'Output is not an object');
      // At least title or organization should be present
      assert(out.title || out.organization, 'Neither title nor organization extracted');
    });

    console.log('\n── [LIVE] JSON Parsing & Retry ────────────────────────\n');

    // 18. extractJSON works on live model output
    await test('[LIVE] extractJSON works on live NVIDIA response', async () => {
      const r = await nvidiaChat([
        { role: 'system', content: 'Return ONLY valid JSON. No prose.' },
        { role: 'user',   content: 'Return: {"test":true,"count":7}' },
      ], { maxTokens: 30, temperature: 0 });
      const parsed = extractJSON(r.content) as any;
      assert(typeof parsed === 'object', 'Could not parse live JSON response');
    });

    // 19. Retry: agent recovers from a transient parse failure (simulated by maxRetries)
    await test('[LIVE] runAgent attempt count is recorded correctly', async () => {
      const r = await runAgent('DISCOVERY', { text: SAMPLE_TEXT }, { maxRetries: 2 });
      assert(r.attempts >= 1, `Expected >= 1 attempt, got ${r.attempts}`);
      assert(r.attempts <= 2, `Expected <= 2 attempts, got ${r.attempts}`);
    });

    console.log('\n── [LIVE] Security ────────────────────────────────────\n');

    // 20. API key never in any successful agent result
    await test('[LIVE] API key absent from agent result object', async () => {
      const r = await runAgent('DISCOVERY', { text: SAMPLE_TEXT }, { maxRetries: 1 });
      const serialized = JSON.stringify(r);
      const key = process.env.NVIDIA_API_KEY!;
      assert(!serialized.includes(key), 'API key leaked in AgentResult!');
    });
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter((r) => !r.ok).forEach((r) => {
      console.log(`  ✗ ${r.name}`);
      console.log(`    ${r.detail}`);
    });
    process.exit(1);
  }

  console.log('All tests passed ✅\n');
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
