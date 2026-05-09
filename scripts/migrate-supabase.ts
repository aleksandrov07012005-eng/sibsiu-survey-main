import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || "https://wevpfxwfsgholnfuatzq.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error("❌ SUPABASE_KEY environment variable is not set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Creating missing access tables in Supabase...");

  const sqlStatements = `
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

    -- Survey groups table
    CREATE TABLE IF NOT EXISTS survey_groups (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      group_type VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_survey_groups_survey ON survey_groups(survey_id);

    -- Survey programs table
    CREATE TABLE IF NOT EXISTS survey_programs (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (survey_id, program_id)
    );

    CREATE INDEX IF NOT EXISTS idx_survey_programs_survey ON survey_programs(survey_id);
    CREATE INDEX IF NOT EXISTS idx_survey_programs_program ON survey_programs(program_id);
  `;

  try {
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: sqlStatements,
    });

    if (error) {
      console.error("❌ Migration failed:", error);
      // Try individual statements as fallback
      console.log("Attempting individual statement approach...");

      const statements = [
        `CREATE TABLE IF NOT EXISTS questionnaire_access (
          id SERIAL PRIMARY KEY,
          questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (questionnaire_id, user_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_questionnaire_access_questionnaire ON questionnaire_access(questionnaire_id)`,
        `CREATE INDEX IF NOT EXISTS idx_questionnaire_access_user ON questionnaire_access(user_id)`,
        `CREATE TABLE IF NOT EXISTS survey_access (
          id SERIAL PRIMARY KEY,
          survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (survey_id, user_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_survey_access_survey ON survey_access(survey_id)`,
        `CREATE INDEX IF NOT EXISTS idx_survey_access_user ON survey_access(user_id)`,
        `CREATE TABLE IF NOT EXISTS program_access (
          id SERIAL PRIMARY KEY,
          program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (program_id, user_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_program_access_program ON program_access(program_id)`,
        `CREATE INDEX IF NOT EXISTS idx_program_access_user ON program_access(user_id)`,
        `CREATE TABLE IF NOT EXISTS survey_groups (
          id SERIAL PRIMARY KEY,
          survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          group_type VARCHAR(255),
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`,
        `CREATE INDEX IF NOT EXISTS idx_survey_groups_survey ON survey_groups(survey_id)`,
        `CREATE TABLE IF NOT EXISTS survey_programs (
          id SERIAL PRIMARY KEY,
          survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (survey_id, program_id)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_survey_programs_survey ON survey_programs(survey_id)`,
        `CREATE INDEX IF NOT EXISTS idx_survey_programs_program ON survey_programs(program_id)`,
      ];

      for (const stmt of statements) {
        try {
          const { error: stmtError } = await supabase.rpc("exec_sql", {
            sql: stmt,
          });
          if (stmtError) {
            console.warn(
              `⚠️  Statement failed (may already exist):`,
              stmtError.message,
            );
          } else {
            console.log(`✅ Executed:`, stmt.substring(0, 50) + "...");
          }
        } catch (err) {
          console.warn(`⚠️  Statement error:`, err);
        }
      }

      process.exit(0);
    }

    console.log("✅ Migration completed successfully");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

migrate();
