import { parseArgs } from "node:util";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";
import { reviewCampus, type CampusReviewAction } from "./platform.js";
import { z } from "zod";

const usage = `SafelyGo campus operations (trusted server access required)
  list [pending|active|suspended]
  show CAMPUS_UUID
  approve CAMPUS_UUID --operator NAME --reason REVIEW_REFERENCE
  suspend CAMPUS_UUID --operator NAME --reason REASON
  reactivate CAMPUS_UUID --operator NAME --reason REVIEW_REFERENCE
  transfer CAMPUS_UUID NEW_OWNER_USER_UUID --operator NAME --reason REVIEW_REFERENCE
Read docs/CAMPUS_OPERATIONS.md before changing campus access.
Every mutation requires a named operator and a review reason; these are self-reported audit labels, not authentication.`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      operator: { type: "string" },
      reason: { type: "string" },
      help: { type: "boolean" },
    },
  });
  const [action, id, target] = positionals;
  if (!action || values.help) {
    console.log(usage);
  } else {
    const actions = [
      "list",
      "show",
      "approve",
      "suspend",
      "reactivate",
      "transfer",
    ];
    if (!actions.includes(action)) throw new Error("Unknown action. " + usage);
    if (positionals.length > (action === "transfer" ? 3 : 2))
      throw new Error("Unexpected positional argument.");
    if (action === "list" && id)
      z.enum(["pending", "active", "suspended"]).parse(id);
    if (action !== "list") z.uuid().parse(id);
    if (action === "transfer") z.uuid().parse(target);
    const mutation = !["list", "show"].includes(action);
    const operator = mutation
      ? z.string().trim().min(2).max(120).parse(values.operator)
      : null;
    const reason = mutation
      ? z.string().trim().min(10).max(1000).parse(values.reason)
      : null;
    await migrate();
    if (action === "list") {
      const result = await pool.query(
        `SELECT c.id,c.name,c.domain,c.website,c.status,u.email AS owner_email,u.verified
         FROM campuses c JOIN memberships m ON m.campus_id=c.id AND m.role='owner'
         JOIN users u ON u.id=m.user_id WHERE ($1::text IS NULL OR c.status=$1) ORDER BY c.created_at`,
        [id || null],
      );
      console.table(result.rows);
    } else if (action === "show") {
      const result = await pool.query(
        `SELECT c.id,c.name,c.domain,c.website,c.status,c.latitude,c.longitude,c.radius_m,
         u.id AS owner_id,u.name AS owner_name,u.email AS owner_email,u.verified AS owner_verified,
         (SELECT count(*) FROM memberships WHERE campus_id=c.id) AS member_count,
         (SELECT count(*) FROM emergency_contacts WHERE campus_id=c.id) AS directory_count
         FROM campuses c JOIN memberships m ON m.campus_id=c.id AND m.role='owner'
         JOIN users u ON u.id=m.user_id WHERE c.id=$1`,
        [id],
      );
      if (!result.rowCount) throw new Error("Campus not found.");
      const reviews = await pool.query(
        "SELECT action,operator_name,review_note,created_at FROM audit WHERE campus_id=$1 AND action LIKE 'platform.%' ORDER BY id DESC LIMIT 20",
        [id],
      );
      console.log(
        JSON.stringify(
          { campus: result.rows[0], reviews: reviews.rows },
          null,
          2,
        ),
      );
    } else {
      await reviewCampus({
        id,
        action: action as CampusReviewAction,
        target,
        operator: operator!,
        reason: reason!,
      });
      console.log(
        "Campus",
        action,
        "completed; audit record and notification queued.",
      );
    }
  }
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? "Invalid arguments. " + usage
      : error instanceof Error
        ? error.message
        : "Operation failed.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
