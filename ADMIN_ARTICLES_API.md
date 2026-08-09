# Admin Articles Management API

Complete REST API for admin to view, edit, and delete published articles (jobs, exam results, admit cards, answer keys).

## Authentication

All endpoints require database availability. Admin routes are protected by the `requireDatabase` middleware.

```bash
# Set admin password (default: admin123)
ADMIN_PASSWORD="your-secure-password"
```

## Published Jobs Management

### List Published Jobs

**GET** `/api/admin/jobs`

List all published jobs with pagination and filtering.

**Query Parameters:**
- `category` (string, optional) - Filter by job category
- `status` (string, optional) - Filter by job status (NEW, ACTIVE, CLOSING_SOON, TODAY, CLOSED)
- `search` (string, optional) - Search in title, organization, category
- `limit` (number, optional) - Items per page (default: 50, max: 500)
- `offset` (number, optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": "job-123",
      "slug": "acme-hr-officer",
      "title": "HR Officer",
      "organization": "ACME Corp",
      "category": "Private Sector",
      "status": "ACTIVE",
      "totalVacancies": 5,
      "applicationEnd": "2026-12-31",
      "publishedAt": "2026-11-01T10:00:00Z",
      "createdAt": "2026-11-01T10:00:00Z",
      "updatedAt": "2026-11-01T10:00:00Z",
      ...
    }
  ]
}
```

### View Job Details

**GET** `/api/admin/jobs/:id`

Get detailed information about a specific published job.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job-123",
    "title": "HR Officer",
    "organization": "ACME Corp",
    "verificationStatus": "PASSED",
    "qualityStatus": "PASSED",
    ...
  }
}
```

### Edit Published Job

**PUT** `/api/admin/jobs/:id`

Update job details (title, status, dates, links, etc.).

**Request Body:**
```json
{
  "title": "Senior HR Officer",
  "status": "CLOSING_SOON",
  "applicationEnd": "2026-12-15",
  "links": {
    "applyUrl": "https://new-apply-url.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job updated successfully",
  "data": { /* updated job object */ }
}
```

**Audit Log:** `EDIT_JOB: Edited published job: <title>`

### Delete Published Job

**DELETE** `/api/admin/jobs/:id`

Remove a published job from the system.

**Response:**
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

**Audit Log:** `DELETE_JOB: Deleted published job: <title>`

---

## Exam Results Management

### List Exam Results

**GET** `/api/admin/results`

List all published exam results.

**Query Parameters:**
- `status` (string, optional) - Filter by status (DECLARED, EXPECTED)
- `search` (string, optional) - Search in title, organization, exam name
- `limit`, `offset` - Pagination

### Edit Exam Result

**PUT** `/api/admin/results/:id`

Update exam result details.

**Request Body:**
```json
{
  "status": "FINAL",
  "resultDate": "2026-12-20",
  "downloadUrl": "https://new-url.pdf"
}
```

**Audit Log:** `EDIT_RESULT: Edited exam result: <title>`

### Delete Exam Result

**DELETE** `/api/admin/results/:id`

Remove published exam result.

**Audit Log:** `DELETE_RESULT: Deleted exam result: <title>`

---

## Admit Cards Management

### List Admit Cards

**GET** `/api/admin/admit-cards`

List all published admit cards.

**Query Parameters:**
- `status` (string, optional) - Filter by status (AVAILABLE, SOON)
- `search` (string, optional) - Search in title, organization, exam name
- `limit`, `offset` - Pagination

### Edit Admit Card

**PUT** `/api/admin/admit-cards/:id`

Update admit card details.

**Request Body:**
```json
{
  "status": "AVAILABLE",
  "admitCardReleaseDate": "2026-12-01",
  "downloadUrl": "https://new-download-url.pdf"
}
```

**Audit Log:** `EDIT_ADMIT_CARD: Edited admit card: <title>`

### Delete Admit Card

**DELETE** `/api/admin/admit-cards/:id`

Remove published admit card.

**Audit Log:** `DELETE_ADMIT_CARD: Deleted admit card: <title>`

---

## Answer Keys Management

### List Answer Keys

**GET** `/api/admin/answer-keys`

List all published answer keys.

**Query Parameters:**
- `status` (string, optional) - Filter by status (RELEASED, PROVISIONAL, FINAL)
- `search` (string, optional) - Search in title, organization, exam name
- `limit`, `offset` - Pagination

### Edit Answer Key

**PUT** `/api/admin/answer-keys/:id`

Update answer key details.

**Request Body:**
```json
{
  "status": "FINAL",
  "releaseDate": "2026-12-15",
  "objectionDeadline": "2026-12-22",
  "downloadUrl": "https://new-key-url.pdf"
}
```

**Audit Log:** `EDIT_ANSWER_KEY: Edited answer key: <title>`

### Delete Answer Key

**DELETE** `/api/admin/answer-keys/:id`

Remove published answer key.

**Audit Log:** `DELETE_ANSWER_KEY: Deleted answer key: <title>`

---

## Error Responses

### Not Found (404)
```json
{
  "success": false,
  "message": "Published job not found"
}
```

### Database Unavailable (503)
```json
{
  "success": false,
  "message": "Database unavailable"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Failed to fetch published jobs"
}
```

---

## Common Query Examples

### Search for specific job
```bash
GET /api/admin/jobs?search=software&limit=10
```

### Filter by status with pagination
```bash
GET /api/admin/jobs?status=ACTIVE&limit=20&offset=0
```

### Find closing soon jobs
```bash
GET /api/admin/jobs?status=CLOSING_SOON&limit=50
```

### Search exam results
```bash
GET /api/admin/results?search=SSC&limit=25
```

---

## Audit Trail

All modifications are automatically logged:

- **EDIT_JOB** - Job title edited
- **DELETE_JOB** - Job deleted
- **EDIT_RESULT** - Exam result edited
- **DELETE_RESULT** - Exam result deleted
- **EDIT_ADMIT_CARD** - Admit card edited
- **DELETE_ADMIT_CARD** - Admit card deleted
- **EDIT_ANSWER_KEY** - Answer key edited
- **DELETE_ANSWER_KEY** - Answer key deleted

View audit logs via: **GET** `/api/admin/audit-logs`

---

## Rate Limiting & Pagination

- Maximum page size: 500 items
- Default page size: 50 items
- Recommended: Use `limit=50` and `offset=0,50,100...` for pagination

---

## API Usage Example

```bash
# List all published jobs
curl -X GET "http://localhost:3000/api/admin/jobs?limit=10"

# Search for specific job
curl -X GET "http://localhost:3000/api/admin/jobs?search=engineer"

# Update a job status
curl -X PUT "http://localhost:3000/api/admin/jobs/job-123" \
  -H "Content-Type: application/json" \
  -d '{"status":"CLOSING_SOON"}'

# Delete a job
curl -X DELETE "http://localhost:3000/api/admin/jobs/job-123"

# List exam results
curl -X GET "http://localhost:3000/api/admin/results?limit=20"

# List admit cards
curl -X GET "http://localhost:3000/api/admin/admit-cards?status=AVAILABLE"

# List answer keys
curl -X GET "http://localhost:3000/api/admin/answer-keys?search=SSC"
```

---

## Implementation Notes

- All endpoints are **async** and properly handle database errors
- Filtering is **case-insensitive**
- Search performs **substring matching** across multiple fields
- Pagination uses **offset-based** approach
- All timestamps are in **ISO 8601** format
- Audit logs include **admin user, action, timestamp, IP address**
