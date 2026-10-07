import { pool, transaction } from "./db.js";
import { migrations } from "./schema.js";
import { pathToFileURL } from "node:url";
export async function migrate() {
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(742019)");
    await db.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY,applied_at timestamptz DEFAULT now())",
    );
    for (const m of migrations) {
      if (
        !(
          await db.query("SELECT 1 FROM schema_migrations WHERE version=$1", [
            m.version,
          ])
        ).rowCount
      ) {
        await db.query(m.sql);
        await db.query("INSERT INTO schema_migrations(version) VALUES($1)", [
          m.version,
        ]);
      }
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await migrate();
  console.log("Database migrations complete");
  await pool.end();
}
