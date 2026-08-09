/**
 * Persistent Pipeline Service - Handles stateful pipeline execution with checkpoint recovery
 * Tracks each agent's execution, captures failures, and allows admin manual override
 */

import { PipelineSessionRepository } from '../db/repositories/PipelineSessionRepository.js';
import { AgentCheckpointRepository } from '../db/repositories/AgentCheckpointRepository.js';
import { DraftRepository } from '../db/repositories/DraftRepository.js';
import { AgentLogRepository } from '../db/repositories/AgentLogRepository.js';
import { AuditLogRepository } from '../db/repositories/AuditLogRepository.js';
import { runAgent } from './agentExecutionService.js';
import type { GovtJobDraft } from '../types.js';

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'DISCOVERY', name: 'Discovery', description: 'Identify recruitment notification' },
  { id: 'CLASSIFICATION', name: 'Classification', description: 'Classify job category' },
  { id: 'EXTRACTION', name: 'Extraction', description: 'Extract key information' },
  { id: 'NORMALIZATION', name: 'Normalization', description: 'Normalize data format' },
  { id: 'DUPLICATE', name: 'Duplicate Check', description: 'Check for duplicates' },
  { id: 'ENRICHMENT', name: 'Enrichment', description: 'Enrich with additional data' },
  { id: 'CONTENT', name: 'Content Generation', description: 'Generate descriptive content' },
  { id: 'SEO', name: 'SEO Optimization', description: 'Optimize for search' },
  { id: 'VERIFICATION', name: 'Verification', description: 'Verify against source (hard gate)' },
  { id: 'QUALITY_CONTROL', name: 'Quality Control', description: 'Quality assurance checks' },
  { id: 'FINAL_QA', name: 'Final QA', description: 'Final quality assessment' },
];

export const persistentPipelineService = {
  /**
   * Create a new pipeline session
   */
  async createSession(sourceName: string, sourceUrl: string, rawText: string) {
    return await PipelineSessionRepository.create({
      source_name: sourceName,
      source_url: sourceUrl,
      raw_text: rawText,
      current_agent_index: 0,
      current_status: 'PENDING',
      current_draft: null,
      completed_agents: [],
      failed_agent: null,
      failure_reason: null,
      admin_review_notes: null,
    });
  },

  /**
   * Resume a pipeline session from a checkpoint
   */
  async resumeSession(sessionId: string, agentIndex: number, overrideData?: any) {
    const session = await PipelineSessionRepository.findById(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    await PipelineSessionRepository.update(sessionId, {
      current_agent_index: agentIndex,
      current_status: 'RUNNING',
      failed_agent: null,
      failure_reason: null,
      current_draft: overrideData || session.current_draft,
    });

    return session;
  },

  /**
   * Execute pipeline with persistent state tracking
   */
  async executePipeline(
    sessionId: string,
    sourceData: any
  ): Promise<{ success: boolean; draft?: GovtJobDraft; error?: string; failedAt?: string }> {
    try {
      const session = await PipelineSessionRepository.findById(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      let currentData = sourceData || session.current_draft || {};
      let startIndex = session.current_agent_index;

      // If resuming after manual fix, start from the failed agent
      if (session.current_status === 'BLOCKED_REVIEW' && session.failed_agent) {
        const failedStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === session.failed_agent);
        startIndex = Math.max(0, failedStageIndex);
      }

      // Execute pipeline stages
      for (let i = startIndex; i < PIPELINE_STAGES.length; i++) {
        const stage = PIPELINE_STAGES[i];

        // Check if already completed
        if (session.completed_agents && session.completed_agents.includes(stage.id)) {
          console.log(`[Pipeline] Stage ${stage.id} already completed, skipping`);
          continue;
        }

        // Update session to mark as running
        await PipelineSessionRepository.update(sessionId, {
          current_agent_index: i,
          current_status: 'RUNNING',
        });

        console.log(`[Pipeline] Executing stage ${i + 1}/${PIPELINE_STAGES.length}: ${stage.name}`);

        try {
          // Create checkpoint record
          const checkpoint = await AgentCheckpointRepository.create({
            pipeline_session_id: sessionId,
            agent_name: stage.id,
            agent_index: i,
            status: 'RUNNING',
            input_data: currentData,
            output_data: null,
            error_message: null,
            failure_reason: null,
            admin_notes: null,
            duration_ms: null,
            executed_at: new Date().toISOString(),
          });

          // Run agent
          const startTime = Date.now();
          const agentResult = await runAgent(stage.id, currentData);
          const duration = Date.now() - startTime;

          const agentOutput = agentResult.output || {};

          // Handle hard gates
          if (stage.id === 'DISCOVERY' && !agentOutput.is_recruitment_notification) {
            throw new Error(`Not a valid recruitment notification: ${agentOutput.reason || 'Unknown'}`);
          }

          if (stage.id === 'VERIFICATION' && agentOutput.verification_status !== 'PASSED') {
            throw new Error(
              `Verification failed (hard gate): ${agentOutput.critical_errors?.[0] || 'Data verification did not pass'}`
            );
          }

          if (stage.id === 'QUALITY_CONTROL' && (agentOutput.total_score ?? 50) < 70) {
            throw new Error(
              `Quality control failed: Score ${agentOutput.total_score}, Issues: ${(agentOutput.issues ?? []).join(', ')}`
            );
          }

          if (stage.id === 'CONTENT' && !agentOutput) {
            throw new Error('Content generation failed - no output');
          }

          if (stage.id === 'SEO' && agentResult.status === 'FAILED') {
            throw new Error('SEO generation failed');
          }

          // Update checkpoint with success
          await AgentCheckpointRepository.updateOutputData(checkpoint.id, agentOutput, 'SUCCESS');

          // Merge agent output into current data
          currentData = { ...currentData, ...agentOutput };

          // Log agent execution
          await AgentLogRepository.create({
            id: `alg-${stage.id}-${Date.now()}`,
            itemTitle: currentData.title || sourceData.title || 'Job',
            agentType: stage.id as any,
            status: 'SUCCESS',
            durationMs: duration,
            modelUsed: 'NVIDIA Nemotron Nano 9B',
            inputSummary: JSON.stringify(currentData).slice(0, 200),
            outputSummary: JSON.stringify(agentOutput).slice(0, 200),
            evidenceText: typeof agentOutput === 'object' ? JSON.stringify(agentOutput).slice(0, 300) : undefined,
            issueDetails: undefined,
            timestamp: new Date().toISOString(),
          });

          // Add to completed agents
          const updatedCompleted = [...(session.completed_agents || []), stage.id];
          await PipelineSessionRepository.update(sessionId, {
            completed_agents: updatedCompleted,
            current_draft: currentData,
          });

          console.log(`[Pipeline] ✓ Stage completed: ${stage.name}`);
        } catch (stageError: any) {
          const errorMessage = stageError.message || 'Unknown error';
          const failureReason = errorMessage;

          console.error(`[Pipeline] ✗ Stage failed: ${stage.name} - ${errorMessage}`);

          // Mark checkpoint as failed
          const checkpoint = await AgentCheckpointRepository.findBySessionAndAgent(sessionId, stage.id);
          if (checkpoint) {
            await AgentCheckpointRepository.markFailed(checkpoint.id, errorMessage, failureReason);
          }

          // Update session to blocked for review
          await PipelineSessionRepository.update(sessionId, {
            current_status: 'BLOCKED_REVIEW',
            failed_agent: stage.id,
            failure_reason: failureReason,
            current_draft: currentData,
          });

          return {
            success: false,
            error: failureReason,
            failedAt: stage.id,
          };
        }
      }

      // All stages completed - create draft
      const finalDraft = await this.createDraftFromPipeline(sessionId, currentData);

      // Update session to completed
      await PipelineSessionRepository.update(sessionId, {
        current_status: 'COMPLETED',
        current_draft: finalDraft,
      });

      return {
        success: true,
        draft: finalDraft,
      };
    } catch (error: any) {
      console.error('[Pipeline] Critical error:', error.message);
      await PipelineSessionRepository.update(sessionId, {
        current_status: 'FAILED',
        failure_reason: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Convert pipeline data to publishable draft
   */
  async createDraftFromPipeline(sessionId: string, pipelineData: any): Promise<GovtJobDraft> {
    const draftTitle = pipelineData.title || 'Government Recruitment 2026';
    const draftOrg = pipelineData.organization || 'Government of India';
    const slug = (pipelineData.slug || draftTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + `-${Date.now()}`;

    const applicationEnd = pipelineData.application_end || pipelineData.applicationEnd || '2026-12-31';
    const daysLeft = Math.ceil((new Date(applicationEnd).getTime() - Date.now()) / 86_400_000);

    const draft: GovtJobDraft = {
      id: `draft-${Date.now()}`,
      slug,
      title: draftTitle,
      organization: draftOrg,
      department: pipelineData.department || 'Central Government',
      advertisementNumber: pipelineData.advertisement_number || pipelineData.advertisementNumber || '',
      category: pipelineData.category || 'Central Government',
      state: pipelineData.state || 'All India',
      postNames: pipelineData.post_names || [draftTitle],
      totalVacancies: pipelineData.total_vacancies ?? pipelineData.totalVacancies ?? 0,
      categoryWiseVacancies: {
        ur: pipelineData.category_vacancies?.ur ?? 0,
        obc: pipelineData.category_vacancies?.obc ?? 0,
        sc: pipelineData.category_vacancies?.sc ?? 0,
        st: pipelineData.category_vacancies?.st ?? 0,
        ews: pipelineData.category_vacancies?.ews ?? 0,
      },
      qualification: pipelineData.qualification || 'Graduation',
      qualificationDetails: pipelineData.qualification_details || pipelineData.qualificationDetails || '',
      ageMin: pipelineData.age_min ?? pipelineData.ageMin ?? 18,
      ageMax: pipelineData.age_max ?? pipelineData.ageMax ?? 35,
      ageRelaxation: pipelineData.age_relaxation || 'As per government rules',
      applicationStart: pipelineData.application_start || pipelineData.applicationStart || new Date().toISOString().split('T')[0],
      applicationEnd,
      feePaymentDeadline: pipelineData.fee_deadline || pipelineData.feePaymentDeadline || applicationEnd,
      examDate: pipelineData.exam_date || pipelineData.examDate || 'To be announced',
      applicationFee: {
        generalObc: pipelineData.fee_general_obc || pipelineData.feeGeneral || '₹0',
        scSt: pipelineData.fee_sc_st || pipelineData.feeScSt || '₹0',
        female: pipelineData.fee_female || pipelineData.feeFemale || '₹0',
      },
      salary: {
        payLevel: pipelineData.pay_level || pipelineData.salaryPayLevel || '',
        payScale: pipelineData.pay_scale || pipelineData.salaryPayScale || '',
        basicPay: pipelineData.basic_pay || pipelineData.basicPay || '',
      },
      selectionProcess: pipelineData.selection_process || pipelineData.selectionProcess || ['Written Exam'],
      howToApply: pipelineData.how_to_apply || pipelineData.howToApply || ['Apply online'],
      overview: pipelineData.overview || 'Official recruitment notification.',
      status: 'NEW',
      isClosingSoon: daysLeft >= 0 && daysLeft <= 7,
      links: {
        applyUrl: pipelineData.apply_url || pipelineData.applyUrl || '',
        notificationUrl: pipelineData.notification_url || pipelineData.notificationUrl || '',
        officialWebsiteUrl: pipelineData.official_website_url || pipelineData.officialWebsiteUrl || '',
      },
      sourceInfo: {
        name: 'AI Pipeline Processing',
        type: 'Scraped & Processed',
        lastVerified: new Date().toISOString().split('T')[0],
        evidenceText: pipelineData.source_text?.slice(0, 300) || '',
      },
      verificationStatus: pipelineData.verification_status === 'PASSED' ? 'PASSED' : 'FAILED',
      qualityStatus: pipelineData.quality_status === 'PASSED' ? 'PASSED' : 'FAILED',
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      verificationReport: {
        verificationStatus: pipelineData.verification_status === 'PASSED' ? 'PASSED' : 'FAILED',
        qualityScore: pipelineData.quality_score ?? 80,
        checkedFields: [],
        criticalErrors: pipelineData.critical_errors || [],
        warnings: pipelineData.warnings || [],
        evidenceText: pipelineData.source_text?.slice(0, 300) || '',
        verifiedAt: new Date().toISOString(),
      },
      agentLogs: [],
    };

    // Save to database
    await DraftRepository.create(draft);

    return draft;
  },

  /**
   * Get pipeline stages
   */
  getStages(): PipelineStage[] {
    return PIPELINE_STAGES;
  },
};
