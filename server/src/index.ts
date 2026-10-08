import { app } from "./app.js";
import { migrate } from "./migrate.js";
import { pool } from "./db.js";
import { deliverMail } from "./mail.js";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (process.env.NODE_ENV === "production") {
  const validMail =
    process.env.MAIL_MODE === "resend"
      ? process.env.RESEND_API_KEY && process.env.MAIL_FROM
      : process.env.MAIL_MODE === "smtp" &&
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.SMTP_FROM;
  if (!validMail)
    throw new Error(
      "Production requires configured Resend HTTPS delivery or SMTP delivery.",
    );
  if (!process.env.PLATFORM_OPERATOR_NAME)
    throw new Error(
      "Production requires PLATFORM_OPERATOR_NAME for public privacy/support pages.",
    );
}
if (process.env.NODE_ENV === "production") {
  const publicUrl = new URL(process.env.PUBLIC_URL || "http://localhost");
  if (publicUrl.protocol !== "https:" || publicUrl.hostname === "localhost")
    throw new Error("Production requires an HTTPS PUBLIC_URL.");
  if (process.env.DEMO_LOGIN === "true" || process.env.DEMO_SEED === "true")
    throw new Error("Production must disable DEMO_LOGIN and DEMO_SEED.");
}
await migrate();
const server = app.listen(Number(process.env.PORT || 4000), "0.0.0.0", () =>
  console.log("SafelyGo API listening on port", process.env.PORT || 4000),
);
let working = false;
const jobs = setInterval(async () => {
  if (working) return;
  working = true;
  try {
    await deliverMail();
    await pool.query(
      "DELETE FROM sharing_sessions WHERE expires_at<now() OR stopped_at IS NOT NULL; DELETE FROM sessions WHERE expires_at<now(); DELETE FROM auth_codes WHERE expires_at<now(); DELETE FROM contact_invitations WHERE expires_at<now(); DELETE FROM rate_limits WHERE reset_at<now(); DELETE FROM geocoder_cache WHERE expires_at<now(); DELETE FROM mail_outbox WHERE created_at<now()-interval '1 day';",
    );
  } catch (e) {
    console.error("Maintenance failed", e instanceof Error ? e.message : e);
  } finally {
    working = false;
  }
}, 15000);
const shutdown = () => {
  clearInterval(jobs);
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 15000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
