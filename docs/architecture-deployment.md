# VisionEduHub - Architecture and Deployment Summary

## 1) Product scope
VisionEduHub delivers a Smart Teacher's Assistant focused on Arabic writing quality. Teachers upload or paste student text, then receive:
- Grammar and spelling insights.
- Rhetorical quality observations.
- Creative rewrite alternatives suitable for class feedback.

## 2) Recommended stack (for MVP)
- Frontend: HTML/CSS/Vanilla JS dashboard (RTL Arabic-first UI).
- Backend API: Node.js (HTTP server + analysis engine module).
- Database: PostgreSQL with JSONB for flexible analytics payloads.
- Infra: Dockerized API + managed Postgres + CDN edge for static assets.

Why this stack:
- Fast MVP iteration and low operational overhead.
- Clean migration path to React/Next.js and microservices later.
- Strong SQL guarantees for educational analytics integrity.

### Alternatives considered (and why not chosen for this MVP)
- Next.js full-stack:
  - Strong choice for scale, but slower initial setup and added build complexity for this prototype phase.
- Python FastAPI:
  - Excellent for NLP workloads, but would split team focus across JS frontend and Python backend from day one.
- Firebase-only backend:
  - Faster auth/storage bootstrap, but weaker relational modeling for lessons and analytics governance at scale.

## 3) Layered architecture
1. Presentation layer:
   - Dashboard with Liquid Glass + Spatial UI for immersive experience.
   - Teacher-facing workflow for text analysis and lesson-level insights.
2. Application layer:
   - API endpoints (`/api/analyze-text`, `/api/health`).
   - Domain logic for Arabic grammar/rhetoric detection.
3. Data layer:
   - Core entities: users, lessons, analytics.
   - Submission and enrollment data for longitudinal learning metrics.
4. AI augmentation layer:
   - Optional OpenAI refinement for advanced rewrite quality.
   - Rule-based fallback when no external model key is configured.

## 4) Data model highlights
- `users`: authentication + role segmentation (admin/teacher/student).
- `lessons`: lesson ownership, schedule, and AI mode settings.
- `analytics`: high-volume event table for behavior and quality tracking.
- `student_submissions`: stores original/improved text and analysis payload.

## 5) Scalability plan
- Add Redis for hot analytics counters.
- Move analysis jobs to async queue (e.g., BullMQ / SQS workers).
- Partition analytics table by time for high-ingest workloads.
- Add read replicas for dashboard-heavy reporting.

## 6) Security controls
- Password hashing (Argon2id recommended in production).
- JWT + role-based access control.
- RLS policies per teacher/student tenant boundary.
- Input size limits and strict JSON validation.
- Audit-ready analytics with hashed IPs and minimal PII exposure.

## 7) Deployment steps
1. Build and run API service:
   - `npm install`
   - `npm run start`
2. Provision PostgreSQL and run `database/schema.sql`.
3. Set environment variables:
   - `PORT`
   - `OPENAI_API_KEY` (optional)
   - `OPENAI_ANALYZER_MODEL` (optional)
4. Configure reverse proxy (Nginx or managed platform ingress).
5. Enable TLS, centralized logging, and alerting.
6. Add CI checks: lint, unit tests, smoke tests.

## 8) SaaS readiness notes
- Tenant-aware data isolation.
- Per-school usage quotas.
- Metered billing by analysis volume.
- Integrations with LMS platforms via REST/webhooks.
