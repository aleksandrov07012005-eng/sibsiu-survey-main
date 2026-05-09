import "dotenv/config";
import bcrypt from "bcryptjs";
import { query } from "../server/db/config";
import { createClient } from "@supabase/supabase-js";

const useSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_KEY;
let supabase: any = null;

if (useSupabase) {
  supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
}

async function executeSQL(sql: string): Promise<any> {
  if (useSupabase && supabase) {
    // Execute via direct query - Supabase doesn't have exec_sql by default
    // So we'll use the pg client via DATABASE_URL with retry
    try {
      return await query(sql);
    } catch (err: any) {
      console.error("SQL execution failed:", err.message);
      throw err;
    }
  } else {
    return await query(sql);
  }
}

async function init() {
  console.log("Initializing database schema...");

  // First, remove the old CHECK constraint if it exists on existing tables
  try {
    await query(
      `ALTER TABLE IF EXISTS questions
       DROP CONSTRAINT IF EXISTS questions_question_type_check;`,
    );
    console.log("Removed old question_type constraint");
  } catch (err) {
    console.log("No old constraint to remove (table may not exist yet)");
  }

  // Create tables
  await query(`
    CREATE TABLE IF NOT EXISTS questionnaires (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id SERIAL PRIMARY KEY,
      questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      start_date TIMESTAMP NULL,
      end_date TIMESTAMP NULL,
      unique_link VARCHAR(255),
      created_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type VARCHAR(255) NOT NULL DEFAULT 'text_line',
      is_required BOOLEAN NOT NULL DEFAULT FALSE,
      question_order INTEGER NOT NULL DEFAULT 1,
      formatting JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS answer_options (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      option_order INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(is_active);
    CREATE INDEX IF NOT EXISTS idx_surveys_dates ON surveys(end_date);
    CREATE INDEX IF NOT EXISTS idx_questions_questionnaire ON questions(questionnaire_id);
    CREATE INDEX IF NOT EXISTS idx_options_question ON answer_options(question_id);

    -- Programs table for educational programs/links
    CREATE TABLE IF NOT EXISTS programs (
      id SERIAL PRIMARY KEY,
      code VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      program_name VARCHAR(255) NOT NULL,
      created_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      full_name VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'admin',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES auth_users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES auth_users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS survey_fingerprints (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
      fingerprint VARCHAR(255) NOT NULL,
      cookie_id VARCHAR(255),
      ip_address VARCHAR(255),
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (survey_id, fingerprint)
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_survey_fingerprints_survey ON survey_fingerprints(survey_id);

    -- Questionnaire access table
    CREATE TABLE IF NOT EXISTS questionnaire_access (
      id SERIAL PRIMARY KEY,
      questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (questionnaire_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_questionnaire_access_questionnaire ON questionnaire_access(questionnaire_id);
    CREATE INDEX IF NOT EXISTS idx_questionnaire_access_user ON questionnaire_access(user_id);

    -- Survey access table
    CREATE TABLE IF NOT EXISTS survey_access (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (survey_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_survey_access_survey ON survey_access(survey_id);
    CREATE INDEX IF NOT EXISTS idx_survey_access_user ON survey_access(user_id);

    -- Program access table
    CREATE TABLE IF NOT EXISTS program_access (
      id SERIAL PRIMARY KEY,
      program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (program_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_program_access_program ON program_access(program_id);
    CREATE INDEX IF NOT EXISTS idx_program_access_user ON program_access(user_id);

    -- Survey responses tables
    CREATE TABLE IF NOT EXISTS survey_responses (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
      participant_id INTEGER,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      time_spent_seconds INTEGER,
      status VARCHAR(32) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
      device_fingerprint VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS question_responses (
      id SERIAL PRIMARY KEY,
      response_id INTEGER NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      answer_data JSONB,
      answered_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS survey_groups (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      group_type VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS survey_programs (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (survey_id, program_id)
    );

    CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
    CREATE INDEX IF NOT EXISTS idx_question_responses_response ON question_responses(response_id);
    CREATE INDEX IF NOT EXISTS idx_survey_groups_survey ON survey_groups(survey_id);
    CREATE INDEX IF NOT EXISTS idx_survey_programs_survey ON survey_programs(survey_id);
    CREATE INDEX IF NOT EXISTS idx_survey_programs_program ON survey_programs(program_id);
  `);

  // Seed minimal data if empty
  const qCount = await query("SELECT COUNT(*)::int AS c FROM questionnaires");
  if (qCount.rows[0].c === 0) {
    console.log("Seeding demo data...");
    const q = await query(
      `INSERT INTO questionnaires (title, description, version, created_by)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      ["Оценка качества образования", "Демо-анкета для примера", 1, 1],
    );

    const questionnaireId = q.rows[0].id as number;

    await query(
      `INSERT INTO surveys (questionnaire_id, title, is_active, start_date, end_date, unique_link, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        questionnaireId,
        "Опрос для обучающихся",
        true,
        new Date(),
        null,
        "demo-link",
        1,
      ],
    );

    // A couple of questions and options
    const q1 = await query(
      `INSERT INTO questions (questionnaire_id, question_text, question_type, is_required, question_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [
        questionnaireId,
        "Насколько вы довольны качеством обучения?",
        "single_choice",
        true,
        1,
      ],
    );
    await query(
      `INSERT INTO answer_options (question_id, option_text, option_order)
       VALUES ($1,$2,$3),($1,$4,$5),($1,$6,$7)`,
      [q1.rows[0].id, "Отлично", 1, "Хорошо", 2, "Удовлетворительно", 3],
    );
  }

  const userCount = await query("SELECT COUNT(*)::int AS c FROM auth_users");
  if (userCount.rows[0].c === 0) {
    const passwordHash = await bcrypt.hash("changeme", 12);
    await query(
      `INSERT INTO auth_users (email, full_name, password_hash, role) VALUES ($1,$2,$3,$4)`,
      ["admin@demo.com", "Администратор", passwordHash, "admin"],
    );
    console.log("👉 Created default admin account admin@demo.com / changeme");
  }

  console.log("✅ Database is ready.");
}

init().catch((e) => {
  console.error("❌ Init failed:", e);
  process.exit(1);
});
