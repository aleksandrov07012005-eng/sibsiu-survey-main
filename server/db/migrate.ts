import { query } from "./config";
import { logger } from "../logger";

export async function runMigrations() {
  logger.info("Running PostgreSQL migrations...");
  const migrations = [
    {
      name: "questionnaire_access",
      sql: `CREATE TABLE IF NOT EXISTS questionnaire_access (
        id SERIAL PRIMARY KEY,
        questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (questionnaire_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_questionnaire_access_questionnaire ON questionnaire_access(questionnaire_id);
      CREATE INDEX IF NOT EXISTS idx_questionnaire_access_user ON questionnaire_access(user_id);`,
    },
    {
      name: "survey_access",
      sql: `CREATE TABLE IF NOT EXISTS survey_access (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (survey_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_survey_access_survey ON survey_access(survey_id);
      CREATE INDEX IF NOT EXISTS idx_survey_access_user ON survey_access(user_id);`,
    },
    {
      name: "program_access",
      sql: `CREATE TABLE IF NOT EXISTS program_access (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (program_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_program_access_program ON program_access(program_id);
      CREATE INDEX IF NOT EXISTS idx_program_access_user ON program_access(user_id);`,
    },
    {
      name: "survey_groups",
      sql: `CREATE TABLE IF NOT EXISTS survey_groups (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        group_type VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_survey_groups_survey ON survey_groups(survey_id);`,
    },
    {
      name: "survey_programs",
      sql: `CREATE TABLE IF NOT EXISTS survey_programs (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (survey_id, program_id)
      );
      CREATE INDEX IF NOT EXISTS idx_survey_programs_survey ON survey_programs(survey_id);
      CREATE INDEX IF NOT EXISTS idx_survey_programs_program ON survey_programs(program_id);`,
    },
  ];

  for (const migration of migrations) {
    try {
      await query(migration.sql);
      logger.info(`✅ Migration ${migration.name} completed`);
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        logger.info(`✅ Table ${migration.name} already exists`);
      } else {
        logger.warn(`Migration ${migration.name} warning:`, err.message);
      }
    }
  }
  logger.info("✅ Database migrations completed");
}
