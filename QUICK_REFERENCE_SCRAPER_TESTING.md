# Quick Reference: Web Scraper Testing Guide

## The Bug (FIXED ✅)
`scraperScheduler.runManually()` was not saving drafts to database.

## Test URLs

### 1. Test Scraper (Fetch Only, No Save)
```
GET http://localhost:5173/api/admin/scraper/test
```
**Expected Response**:
```json
{
  "success": true,
  "message": "Scraper test completed: 8 jobs found",
  "data": {
    "success": true,
    "jobs": [
      { "title": "...", "organization": "...", ... },
      ...
    ],
    "jobsFound": 8,
    "jobsProcessed": 8
  }
}
```

### 2. Run Scraper (Fetch + Save to Database)
```
POST http://localhost:5173/api/admin/scraper/run
```
**Expected Response**:
```json
{
  "success": true,
  "message": "Scraper completed: 8 jobs found, 8 jobs processed",
  "data": {
    "success": true,
    "jobsFound": 8,
    "jobsProcessed": 8,
    "jobs": [...]
  }
}
```

### 3. Check Saved Drafts
```
GET http://localhost:5173/api/admin/scraper/drafts
```
**Expected Response**:
```json
{
  "success": true,
  "message": "Found 8 scraper drafts",
  "data": {
    "totalDrafts": 45,
    "scraperDrafts": 8,
    "drafts": [
      { "id": "draft-scraped-...", "title": "...", ... },
      ...
    ]
  }
}
```

### 4. Get Scraper Status
```
GET http://localhost:5173/api/admin/scraper/status
```
**Expected Response**:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "successfulRuns": 2,
    "failedRuns": 0,
    "totalJobsScraped": 16,
    "totalJobsProcessed": 16
  }
}
```

---

## Log Messages to Look For

### Success Logs
```
[Scheduler] ▶ Manual scraper run initiated
[Scraper] ▶ Starting job scrape from sarkariresult.com
[Scraper] ✓ Fetched main page (245832 bytes)
[Scraper] ✓ Parsed 8 job postings from main page
[Scheduler] ▶ Processing 8 scraped jobs...
[Scheduler] [1/8] Processing: "SSC Combined Graduate Level..."
[Scheduler] [1/8] ✓ Created draft: SSC Combined Graduate Level...
[Scheduler] Processing complete: Created 8, Skipped 0, Errors: 0
[Scheduler] ✓ Manual run completed in 8432ms
```

### Error Logs
```
[Scheduler] ✗ Manual run failed: Database is not available...
[Scheduler] [1/8] ✗ Failed to save draft: UNIQUE constraint failed
[Scraper] ✗ Scraping failed: Connection timeout
```

---

## Full Test Workflow

### Step 1: Verify Scraper Can Fetch
```bash
curl http://localhost:5173/api/admin/scraper/test 2>/dev/null | jq '.data.jobsFound'
# Should output: 8 or higher
```

### Step 2: Run Manual Trigger
```bash
curl -X POST http://localhost:5173/api/admin/scraper/run 2>/dev/null | jq '.success'
# Should output: true
```

### Step 3: Verify Drafts Were Saved
```bash
curl http://localhost:5173/api/admin/scraper/drafts 2>/dev/null | jq '.data.scraperDrafts'
# Should output: 8 or higher
```

### Step 4: Check Specific Draft
```bash
curl http://localhost:5173/api/admin/drafts?limit=1 2>/dev/null | jq '.data[0].sourceInfo'
# Should show: { "name": "SarkariResult.com", ... }
```

---

## Common Issues & Solutions

### Issue: "Database is not available"
**Solution**: Ensure server started successfully and database.ts initialized
```
Look for: [DB] ✓ Database ready
```

### Issue: 0 jobs found
**Solution**: Check if sarkariresult.com website structure changed
```
Test with: GET /api/admin/scraper/test
Check HTML in browser: https://www.sarkariresult.com
```

### Issue: Drafts not saved despite successful run
**Solution**: This was the original bug - should be fixed now. Check:
1. Build: `npm run build` (should succeed)
2. Restart server
3. Run manual trigger again

### Issue: "UNIQUE constraint failed"
**Solution**: Same job already exists. This is expected behavior.
```
Solution: Try different target URL or wait for duplicate detection
```

---

## Performance Metrics

| Metric | Expected | Status |
|--------|----------|--------|
| Fetch main page | 2-5 sec | Depends on network |
| Parse jobs | <1 sec | Consistent |
| Save to DB | <100ms per job | Fast |
| Total run | 8-15 sec | Normal |

---

## Database Query Verification

Check if drafts were actually saved:

```sql
-- SQLite command line
sqlite3 rozgarvaani.db

-- Count scraper drafts
SELECT COUNT(*) FROM drafts WHERE source_info LIKE '%SarkariResult%';

-- List recent scraper drafts
SELECT id, title, created_at FROM drafts 
WHERE source_info LIKE '%SarkariResult%'
ORDER BY created_at DESC LIMIT 5;

-- Verify draft has all fields
SELECT * FROM drafts 
WHERE id = 'draft-scraped-1707123456789-abc123';
```

---

## Troubleshooting Checklist

- [ ] Server running? `npm run dev` or deployed to Render
- [ ] Database created? `ls rozgarvaani.db`
- [ ] SCRAPER_ENABLED not set to "false"?
- [ ] Network accessible to sarkariresult.com?
- [ ] Check server logs for [Scheduler] messages?
- [ ] Run test endpoint returns jobs found > 0?
- [ ] Check drafts endpoint returns drafts count > 0?
- [ ] Verify database has records: `SELECT COUNT(*) FROM drafts;`

---

## Rollback (If Needed)

If issues occur, rollback to previous commit:
```bash
git revert 5e44242
npm run build
# Redeploy
```

---

## Success Verification Checklist

- [x] Manual scraper trigger saves drafts
- [x] Automatic cron runs continue working
- [x] Draft count increases after running
- [x] Admin panel shows saved drafts
- [x] sourceInfo shows "SarkariResult.com"
- [x] No duplicate constraints on re-runs
- [x] Logs show per-job progress

---

## Commit Reference

**Commit**: 5e44242  
**Message**: "Fix: Web scraper not saving drafts to database"  
**Status**: ✅ Merged to main, pushed to GitHub  
**Build**: ✅ Success (188.0 KB)

