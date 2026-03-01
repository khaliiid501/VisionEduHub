-- VisionEduHub | Smart Teacher's Assistant
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_status') THEN
    CREATE TYPE lesson_status AS ENUM ('draft', 'published', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analytics_event_type') THEN
    CREATE TYPE analytics_event_type AS ENUM (
      'lesson_opened',
      'analysis_requested',
      'analysis_completed',
      'feedback_viewed',
      'student_submission_created'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  preferred_locale VARCHAR(12) NOT NULL DEFAULT 'ar-SA',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT users_full_name_length CHECK (char_length(full_name) >= 3)
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  learning_objectives TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status lesson_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 45,
  ai_assistant_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT lessons_duration_positive CHECK (estimated_duration_minutes > 0)
);

CREATE TABLE IF NOT EXISTS lesson_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  CONSTRAINT lesson_enrollments_unique UNIQUE (lesson_id, student_id),
  CONSTRAINT progress_percent_valid CHECK (progress_percent >= 0 AND progress_percent <= 100)
);

CREATE TABLE IF NOT EXISTS student_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  improved_text TEXT,
  grammar_issues_count INTEGER NOT NULL DEFAULT 0,
  rhetoric_issues_count INTEGER NOT NULL DEFAULT 0,
  readability_score NUMERIC(5,2),
  creativity_score NUMERIC(5,2),
  analysis_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT submission_text_not_empty CHECK (char_length(trim(original_text)) > 0)
);

CREATE TABLE IF NOT EXISTS analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES student_submissions(id) ON DELETE SET NULL,
  event_type analytics_event_type NOT NULL,
  event_source VARCHAR(60) NOT NULL DEFAULT 'dashboard',
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id UUID,
  ip_hash CHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_status ON lessons(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_lessons_scheduled_for ON lessons(scheduled_for) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_submissions_lesson_student ON student_submissions(lesson_id, student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_time ON analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_time ON analytics(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_lessons_set_updated_at ON lessons;
CREATE TRIGGER trg_lessons_set_updated_at
BEFORE UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Example policy templates (adapt per auth provider):
-- CREATE POLICY teacher_can_view_own_lessons ON lessons
--   FOR SELECT USING (teacher_id = current_setting('app.user_id')::uuid);
--
-- CREATE POLICY student_can_view_own_submissions ON student_submissions
--   FOR SELECT USING (student_id = current_setting('app.user_id')::uuid);
