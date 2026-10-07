import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { transaction } from "./db.js";
export async function enqueueMail(
  db: pg.PoolClient,
  to: string,
  subject: string,
  body: string,
) {
  await db.query(
    "INSERT INTO mail_outbox(id,recipient,subject,body) VALUES($1,$2,$3,$4)",
    [randomUUID(), to, subject, body],
  );
}
// Durable outbox: row locks prevent concurrent replicas from sending the same queued job.
// SMTP is at-least-once; the same verification code may arrive twice after a crash.
export async function deliverMail() {
  await transaction(async (db) => {
    const jobs = await db.query(
      "SELECT * FROM mail_outbox WHERE next_attempt<=now() ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED",
    );
    for (const job of jobs.rows) {
      try {
        if (
          process.env.MAIL_MODE === "file" &&
          process.env.NODE_ENV !== "production"
        ) {
          await mkdir(".mail", { recursive: true });
          await writeFile(
            ".mail/" + job.id + ".json",
            JSON.stringify({
              to: job.recipient,
              subject: job.subject,
              body: job.body,
            }),
          );
        } else if (process.env.MAIL_MODE === "resend") {
          await sendResendMail(job);
        } else {
          const transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_PORT === "465",
            requireTLS: process.env.NODE_ENV === "production",
            disableFileAccess: true,
            disableUrlAccess: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            connectionTimeout: 10000,
            socketTimeout: 10000,
          });
          await transport.sendMail({
            from: process.env.SMTP_FROM,
            to: job.recipient,
            subject: job.subject,
            text: job.body,
          });
        }
        await db.query("DELETE FROM mail_outbox WHERE id=$1", [job.id]);
      } catch {
        await db.query(
          "UPDATE mail_outbox SET attempts=attempts+1,next_attempt=now()+interval '5 minutes' WHERE id=$1",
          [job.id],
        );
        console.error("Email delivery failed; will retry", job.id);
      }
    }
  });
}

export async function sendResendMail(job: {
  id: string;
  recipient: string;
  subject: string;
  body: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
      "Idempotency-Key": "safelygo-mail-" + job.id,
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [job.recipient],
      subject: job.subject,
      text: job.body,
      ...(process.env.PLATFORM_SUPPORT_EMAIL
        ? { reply_to: process.env.PLATFORM_SUPPORT_EMAIL }
        : {}),
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Email provider rejected delivery.");
}
