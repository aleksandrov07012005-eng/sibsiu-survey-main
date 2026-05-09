import "dotenv/config";
import { query } from "../server/db/config";

async function migrate() {
  console.log(
    "Migrating: Removing invalid CHECK constraint on question_type...",
  );

  try {
    // Remove the CHECK constraint if it exists
    await query(
      `ALTER TABLE IF EXISTS questions 
       DROP CONSTRAINT IF EXISTS questions_question_type_check;`,
    );

    // Ensure the column has a proper default
    await query(
      `ALTER TABLE IF EXISTS questions 
       ALTER COLUMN question_type SET DEFAULT 'text_line';`,
    );

    console.log("✅ Migration completed successfully.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
