import "dotenv/config";
import { query } from "../server/db/config";

async function fixConstraint() {
  console.log("Attempting to fix Supabase database constraint...");

  try {
    // Step 1: Drop the CHECK constraint
    console.log("Step 1: Dropping questions_question_type_check constraint...");
    await query(
      `ALTER TABLE IF EXISTS questions
       DROP CONSTRAINT IF EXISTS questions_question_type_check;`,
    );
    console.log("✅ Constraint dropped");

    // Step 2: Set default value
    console.log("Step 2: Setting question_type default value...");
    await query(
      `ALTER TABLE IF EXISTS questions
       ALTER COLUMN question_type SET DEFAULT 'text_line';`,
    );
    console.log("✅ Default value set");

    console.log("\n✅ Database constraint fixed successfully!");
    console.log("You can now save questionnaires with any question type.");
  } catch (error) {
    console.error("❌ Failed to fix constraint:", error);
    process.exit(1);
  }
}

fixConstraint();
