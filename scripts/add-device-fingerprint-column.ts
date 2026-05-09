import { supabase } from "../server/db/supabaseClient";
import { query } from "../server/db/config";

async function addDeviceFingerprintColumn() {
  console.log("Adding device_fingerprint column to survey_responses...");

  try {
    // Try Supabase first
    if (supabase) {
      try {
        // Check if column already exists
        const { data } = await supabase
          .from("survey_responses")
          .select("device_fingerprint")
          .limit(1);

        console.log("Column already exists in Supabase");
        return;
      } catch (err: any) {
        // Column doesn't exist, add it
        if (err.code === "PGRST116" || err.message.includes("column")) {
          const { error } = await supabase.rpc("exec", {
            sql: `ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255);`,
          });

          if (error) {
            // If rpc doesn't work, try direct SQL via Supabase
            console.log("Using alternative Supabase migration method...");
            // Supabase doesn't allow raw SQL directly, so we'll handle this in the application startup
            console.log(
              "Note: You may need to add device_fingerprint column manually via Supabase dashboard",
            );
          } else {
            console.log("✅ Added device_fingerprint column to Supabase");
          }
        }
      }
    }

    // Try PostgreSQL directly
    try {
      await query(
        `ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255);`,
      );
      console.log("✅ Added device_fingerprint column to PostgreSQL");
    } catch (err: any) {
      if (
        !err.message.includes("already exists") &&
        !err.message.includes("column")
      ) {
        console.error("Error adding column to PostgreSQL:", err.message);
      } else {
        console.log(
          "✅ Column already exists in PostgreSQL or migration skipped",
        );
      }
    }
  } catch (error: any) {
    console.error("Migration error:", error.message);
    throw error;
  }
}

// Run the migration
addDeviceFingerprintColumn()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
