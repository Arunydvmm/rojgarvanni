# Persistent Pipeline Workflow - Complete Implementation

## Overview

Implemented a complete stateful pipeline architecture that persists execution state, tracks agent failures, and enables admin manual intervention. Data is no longer lost on hard refresh, and admins can review/fix failed steps.

## New Workflow: Scraper → Pipeline → Draft

```
┌─────────────────────────────────────────────────────────────────┐
│ SCRAPER (sarkariresult.com)                                     │
│ - Extracts job data every 15 minutes                            │
│ - Creates PipelineSession (PENDING)                             │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PERSISTENT PIPELINE SESSION (Saved in DB)                       │
│ - ID: ps-{timestamp}                                            │
│ - Status: PENDING → RUNNING → COMPLETED/BLOCKED_REVIEW/FAILED  │
│ - Raw text, current agent index, completed agents list          │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PIPELINE EXECUTION (11 Stages)                                  │
│ 1. DISCOVERY - Identify recruitment notification               │
│ 2. CLASSIFICATION - Classify job category                       │
│ 3. EXTRACTION - Extract key information                         │
│ 4. NORMALIZATION - Normalize data format                        │
│ 5. DUPLICATE CHECK - Check for duplicates                       │
│ 6. ENRICHMENT - Enrich with additional data                     │
│ 7. CONTENT - Generate descriptive content                       │
│ 8. SEO - SEO optimization                                       │
│ 9. VERIFICATION - Verify against source (HARD GATE)             │
│ 10. QUALITY_CONTROL - Quality assurance                         │
│ 11. FINAL_QA - Final quality assessment                         │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ├─ SUCCESS? ───► Creates DRAFT (isDraft=true)
              │
              └─ FAILURE? ───► Session = BLOCKED_REVIEW
                                    ↓
                           ┌────────────────────┐
                           │ ADMIN INTERVENTION │
                           ├────────────────────┤
                           │ 1. View failure    │
                           │ 2. Edit data       │
                           │ 3. Add notes       │
                           │ 4. Resume pipeline │
                           └────────────────────┘
```

## Database Tables

### pipeline_sessions
Persists the entire pipeline execution state:
```sql
- id: TEXT PRIMARY KEY
- source_name, source_url, raw_text
- current_agent_index: INT (which stage we're at)
- current_status: ENUM (PENDING, RUNNING, COMPLETED, FAILED, BLOCKED_REVIEW)
- current_draft: JSONB (partial or complete draft data)
- completed_agents: JSONB ARRAY (list of passed stage IDs)
- failed_agent: TEXT (which agent failed, if any)
- failure_reason: TEXT (detailed error message)
- admin_review_notes: TEXT (admin's manual notes)
- created_at, updated_at: TIMESTAMPS
```

### agent_checkpoints
Detailed tracking of each agent execution:
```sql
- id: TEXT PRIMARY KEY
- pipeline_session_id: FOREIGN KEY → pipeline_sessions
- agent_name: TEXT (DISCOVERY, CLASSIFICATION, etc.)
- agent_index: INT (0-11)
- status: ENUM (SUCCESS, FAILED, SKIPPED, MANUAL_OVERRIDE)
- input_data: JSONB (what we sent to agent)
- output_data: JSONB (what agent returned)
- error_message: TEXT (if failed)
- failure_reason: TEXT (why it failed)
- admin_notes: TEXT (admin's manual fix notes)
- duration_ms: INT (agent execution time)
- executed_at: TIMESTAMP
```

## New Admin APIs

### 1. Create Pipeline Session
```bash
POST /api/admin/pipeline/start
{
  "rawText": "...",
  "sourceName": "SarkariResult Scraper",  # optional
  "sourceUrl": "https://..."               # optional
}

Response:
{
  "success": true,
  "sessionId": "ps-1725014400000",
  "data": { /* session object */ }
}
```

### 2. Execute Pipeline
```bash
POST /api/admin/pipeline/execute
{
  "sessionId": "ps-1725014400000"
}

Response (Success):
{
  "success": true,
  "message": "Pipeline execution completed",
  "draft": { /* created draft object */ }
}

Response (Blocked for Review):
{
  "success": false,
  "message": "Pipeline execution blocked at VERIFICATION",
  "error": "Verification failed: Data verification did not pass",
  "failedAt": "VERIFICATION",
  "sessionId": "ps-1725014400000"
}
```

### 3. List All Pipeline Sessions
```bash
GET /api/admin/pipeline/sessions?status=BLOCKED_REVIEW&limit=50&offset=0

Response:
{
  "success": true,
  "count": 5,
  "data": [ /* sessions */ ]
}
```

### 4. View Session with Checkpoints
```bash
GET /api/admin/pipeline/sessions/ps-1725014400000

Response:
{
  "success": true,
  "data": {
    "session": { /* full session object */ },
    "checkpoints": [ /* array of all agent executions */ ]
  }
}
```

### 5. Admin Manual Fix & Resume
```bash
POST /api/admin/pipeline/sessions/ps-1725014400000/fix
{
  "agentIndex": 8,                    # resume from VERIFICATION (stage 8)
  "fixedData": { /* corrected fields */ },
  "adminNotes": "Fixed the age validation error"
}

Response:
{
  "success": true,
  "message": "Pipeline fixed and ready to resume",
  "sessionId": "ps-1725014400000"
}
```

## Key Features

### 1. Persistent State
- **Problem**: Previous hard refresh lost all pipeline data
- **Solution**: All state saved in `pipeline_sessions` table
- **Benefit**: Admins can view and recover failed pipelines

### 2. Failure Tracking
- Each agent execution tracked in `agent_checkpoints`
- Captures input data, output data, error message, failure reason
- Admin can see exactly what failed and why

### 3. Admin Manual Intervention
- When pipeline fails at any stage → BLOCKED_REVIEW status
- Admin can:
  - View the failure reason and checkpoint details
  - Manually edit the data that caused the failure
  - Add notes explaining the fix
  - Resume pipeline from that point
- No data lost, easy recovery

### 4. Hard Gate Failures
Stages that block pipeline if failed:
- DISCOVERY: Not a recruitment notification → BLOCK
- VERIFICATION: Verification failed → BLOCK
- QUALITY_CONTROL: Score < 70 → BLOCK
- CONTENT: No output generated → BLOCK
- SEO: Generation failed → BLOCK

### 5. Scraper Integration
- Scraper no longer directly creates drafts
- Creates pipeline session per job
- Pipeline executes asynchronously
- Admin can monitor and intervene in real-time

## Example Admin Workflow

### Scenario: VERIFICATION fails

1. **Admin Views Failed Pipeline**
   ```bash
   GET /api/admin/pipeline/sessions?status=BLOCKED_REVIEW
   ```
   Sees 1 session at VERIFICATION stage

2. **Admin Reviews Details**
   ```bash
   GET /api/admin/pipeline/sessions/ps-1725014400000
   ```
   Sees:
   - failure_reason: "Age verification failed: extracted age_max 65, but official document says 60"
   - checkpoint data showing the mismatch

3. **Admin Fixes Data**
   ```bash
   POST /api/admin/pipeline/sessions/ps-1725014400000/fix
   {
     "agentIndex": 8,
     "fixedData": { "age_max": 60 },
     "adminNotes": "Corrected age_max from official PDF"
   }
   ```

4. **Admin Resumes Pipeline**
   ```bash
   POST /api/admin/pipeline/execute
   {
     "sessionId": "ps-1725014400000"
   }
   ```

5. **Pipeline Completes**
   - Continues from stage 9 with corrected data
   - Creates final draft
   - Draft ready for admin approval in verification queue

## Audit Trail

Every action logged:
- START_PIPELINE: Admin started manual pipeline
- COMPLETE_PIPELINE: Pipeline completed successfully
- BLOCK_PIPELINE: Pipeline blocked at stage X with reason
- FIX_PIPELINE: Admin fixed stage X with notes

View audit logs:
```bash
GET /api/admin/audit-logs
```

## Build & Deployment

✅ **Build Status**: PASSING
- Production bundle: 236.7kb
- All TypeScript compilation successful
- No errors or warnings

✅ **Database Initialization**
- 2 new tables created on startup
- Backward compatible (existing data untouched)
- Proper foreign keys and indexes

✅ **Production Ready**
- All changes committed to GitHub
- Commit: 5778439
- Ready for deployment

## Future Enhancements

1. **Bulk Pipeline Management**
   - Resume multiple failed pipelines
   - Batch fix for common failures

2. **Pipeline Analytics**
   - Success rate by stage
   - Average time per stage
   - Common failure reasons

3. **Automated Retries**
   - Auto-retry certain failures
   - Configurable backoff strategies

4. **Stage Rollback**
   - Rerun specific stages without full pipeline
   - Compare outputs between attempts

5. **Pipeline Templates**
   - Save successful fix patterns
   - Auto-apply to similar failures
