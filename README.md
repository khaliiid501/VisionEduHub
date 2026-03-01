# VisionEduHub - Smart Teacher's Assistant (Prototype)

VisionEduHub is a full-stack prototype for an Arabic-first educational assistant that helps teachers analyze student writing quality and deliver actionable feedback in seconds.

## Why this prototype exists
Teachers need fast, reliable, and explainable feedback loops for student writing. This prototype focuses on:
- Arabic grammar and spelling signals.
- Rhetorical quality insights.
- Creative rewrite alternatives to improve expression quality.

## Core capabilities
- Arabic immersive dashboard (RTL, Liquid Glass + Spatial UI direction).
- API-based text analysis endpoint.
- Rule-based NLP engine with optional OpenAI refinement path.
- Production-grade PostgreSQL schema for users, lessons, submissions, and analytics.

## Project structure
```text
VisionEduHub/
├── README.md
├── package.json
├── database/
│   └── schema.sql
├── docs/
│   └── architecture-deployment.md
├── scripts/
│   └── generate_architecture_pdf.py
├── output/
│   └── pdf/
├── src/
│   ├── client/
│   │   ├── app.js
│   │   ├── index.html
│   │   └── styles.css
│   └── server/
│       ├── analyzer.js
│       └── index.js
└── .gitignore
```

## Architecture snapshot
- Frontend: HTML/CSS/Vanilla JS, RTL-first educational dashboard.
- Backend: Node.js HTTP server with isolated analysis module.
- Data: PostgreSQL schema with typed enums, indexes, timestamps, and RLS-ready design.
- AI Layer: Optional OpenAI augmentation if `OPENAI_API_KEY` is present.

For a detailed summary, see:
- [docs/architecture-deployment.md](./docs/architecture-deployment.md)
- PDF export: `output/pdf/visioneduhub-architecture-deployment.pdf`

## Local run
### Prerequisites
- Node.js 18+
- Python 3.10+ (for PDF generation)
- PostgreSQL 15+ (for database deployment)

### Start app
```bash
npm install
npm run start
```
Then open: `http://localhost:8787`

### Development mode
```bash
npm run dev
```

## API
### `GET /api/health`
Health check endpoint.

### `POST /api/analyze-text`
Analyzes Arabic student text.

Request example:
```json
{
  "topic": "التعلم النشط",
  "gradeLevel": "متوسط",
  "text": "في هذا الموضوع سوف اتحدث عن اهمية القراءة ..."
}
```

Response example:
```json
{
  "meta": {
    "analyzedAt": "2026-03-01T10:20:00.000Z",
    "gradeLevel": "متوسط",
    "topic": "التعلم النشط",
    "llmAugmentationUsed": false
  },
  "summary": {
    "grammarIssues": 4,
    "rhetoricIssues": 3,
    "readabilityScore": 78,
    "creativityScore": 61
  },
  "issues": [
    {
      "id": "ISS-1",
      "category": "grammar",
      "severity": "medium",
      "snippet": "الى",
      "explanation": "...",
      "suggestion": "..."
    }
  ],
  "improvedDraft": "...",
  "creativeAlternatives": ["...", "..."]
}
```

## Database setup
Run schema:
```bash
psql "$DATABASE_URL" -f database/schema.sql
```

Core tables required by product scope:
- `users`
- `lessons`
- `analytics`

Extended MVP tables included:
- `lesson_enrollments`
- `student_submissions`

## Generate architecture PDF
```bash
npm run pdf
```
Expected output:
- `output/pdf/visioneduhub-architecture-deployment.pdf`

## Deployment (MVP)
1. Deploy API container (Render, Fly.io, Railway, ECS, or Kubernetes).
2. Provision managed PostgreSQL and run schema migration.
3. Configure environment variables (`PORT`, optional `OPENAI_API_KEY`).
4. Add reverse proxy + TLS.
5. Enable observability (logs, metrics, error alerts).

## SaaS path
- Multi-tenant school model with per-organization billing.
- Usage-based pricing by text analysis volume.
- Premium features: curriculum insights, cohort comparison, LMS integration.

## Initial Git commands
```bash
git init
git checkout -b codex/visioneduhub-mvp
git add .
git commit -m "feat: bootstrap VisionEduHub smart teacher assistant prototype"
git remote add origin <YOUR_REPO_URL>
git push -u origin codex/visioneduhub-mvp
```
