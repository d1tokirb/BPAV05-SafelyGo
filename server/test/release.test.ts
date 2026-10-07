import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { registerPublicPages } from "../src/publicPages.js";
import { sendResendMail } from "../src/mail.js";
test("public privacy and support pages include deletion help and escape operator settings", async () => {
  const previous = process.env.PLATFORM_OPERATOR_NAME;
  process.env.PLATFORM_OPERATOR_NAME = "<script>bad</script>";
  try {
    const app = express();
    registerPublicPages(app);
    const privacy = await request(app).get("/privacy").expect(200);
    assert.match(privacy.text, /&lt;script&gt;/);
    assert.doesNotMatch(privacy.text, /<script>/);
    assert.match(privacy.text, /author reference removed/);
    const support = await request(app).get("/support").expect(200);
    assert.match(support.text, /Delete your account/);
  } finally {
    if (previous === undefined) delete process.env.PLATFORM_OPERATOR_NAME;
    else process.env.PLATFORM_OPERATOR_NAME = previous;
  }
});
test("Resend sends over HTTPS with a stable retry id and propagates failures", async () => {
  const original = globalThis.fetch;
  const job = {
    id: "test-job",
    recipient: "student@example.com",
    subject: "Verify",
    body: "Test code",
  };
  try {
    globalThis.fetch = (async (url, init) => {
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal(
        (init?.headers as Record<string, string>)["Idempotency-Key"],
        "safelygo-mail-test-job",
      );
      assert.deepEqual(JSON.parse(init?.body as string).to, [
        "student@example.com",
      ]);
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    await sendResendMail(job);
    globalThis.fetch = (async () =>
      new Response("{}", { status: 429 })) as typeof fetch;
    await assert.rejects(sendResendMail(job), /rejected delivery/);
  } finally {
    globalThis.fetch = original;
  }
});
