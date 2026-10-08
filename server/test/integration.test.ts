import { createServer } from "node:http";
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const execute = promisify(execFile);
async function operator(...args: string[]) {
  return execute(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(new URL("../src/operator.ts", import.meta.url)),
      ...args,
    ],
    {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      timeout: 20000,
    },
  );
}
const review = [
  "--operator",
  "Acceptance operator",
  "--reason",
  "TEST-REVIEW: fictional campus authority confirmed for acceptance testing",
];
// Explicit disposable database only. Never truncate a deployment database.
if (
  !process.env.TEST_DATABASE_URL ||
  !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error(
    "Set TEST_DATABASE_URL to a disposable database whose name ends in _test.",
  );
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
const { app } = await import("../src/app.js");
const { pool } = await import("../src/db.js");
const { migrate } = await import("../src/migrate.js");
let ip = 1;
const call = (
  method: "get" | "post" | "put" | "patch" | "delete",
  path: string,
  session?: string,
  body?: unknown,
) => {
  const r = request(app)
    [method]("/api" + path)
    .set("X-Forwarded-For", "10.1.0." + ((ip++ % 250) + 1));
  if (session) r.set("Authorization", "Bearer " + session);
  return body === undefined ? r : r.send(body);
};
const pass = "Test-only-long-password!";
async function register(email: string, name = "Test Student") {
  const r = await call("post", "/auth/register", undefined, {
    email,
    name,
    password: pass,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const u = r.body as { token: string; user: { id: string; email: string } };
  const mail = await pool.query(
    "SELECT body FROM mail_outbox WHERE recipient=$1 ORDER BY created_at DESC",
    [email],
  );
  const code = mail.rows[0].body.match(/\b\d{8}\b/)[0];
  assert.equal(
    (await call("post", "/auth/verify", u.token, { code })).status,
    200,
  );
  return u;
}
async function campus(session: string, name: string, domain: string) {
  const r = await call("post", "/campuses", session, {
    name,
    domain,
    website: "https://" + domain,
    latitude: 40.73,
    longitude: -73.99,
    radiusM: 1500,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body as { id: string; join_code: string };
}
before(async () => {
  await migrate();
  await pool.query(
    "TRUNCATE users,campuses,rate_limits,geocoder_cache CASCADE",
  );
});
after(async () => {
  await pool.end();
});
test("complete multi-campus service flows and security boundaries", async (t) => {
  const owner = await register("owner@alpha.edu", "Campus Owner");
  const otherOwner = await register("owner@beta.edu", "Other Owner");
  const student = await register("student@alpha.edu");
  const friend = await register("friend@alpha.edu", "Trusted Friend");
  const stranger = await register("stranger@beta.edu");
  const a = await campus(owner.token, "Alpha Campus", "alpha.edu");
  const b = await campus(otherOwner.token, "Beta Campus", "beta.edu");
  const base = "/campuses/" + a.id;
  let reportId = "";
  let contactId = "";
  let sessionId = "";
  await t.test(
    "activation, invitation codes and campus membership",
    async () => {
      assert.equal(
        (
          await call("post", "/campuses/join", student.token, {
            campusId: a.id,
            joinCode: a.join_code,
          })
        ).status,
        400,
      );
      await operator("approve", a.id, ...review);
      await operator("approve", b.id, ...review);
      assert.equal(
        (
          await call("post", "/campuses/join", stranger.token, {
            campusId: a.id,
            joinCode: "incorrect-code",
          })
        ).status,
        400,
      );
      for (const u of [student, friend])
        assert.equal(
          (
            await call("post", "/campuses/join", u.token, {
              campusId: a.id,
              joinCode: a.join_code,
            })
          ).status,
          200,
        );
      assert.equal(
        (await call("get", base + "/reports", otherOwner.token)).status,
        403,
      );
    },
  );
  await t.test("report submission, location bounds and privacy", async () => {
    const input = {
      title: "Broken light",
      description: "Sensitive private description",
      category: "lighting",
      severity: "medium",
      latitude: 40.73,
      longitude: -73.99,
    };
    assert.equal(
      (
        await call("post", base + "/reports", student.token, {
          ...input,
          latitude: 0,
          longitude: 0,
        })
      ).status,
      400,
    );
    const r = await call("post", base + "/reports", student.token, input);
    assert.equal(r.status, 201);
    reportId = r.body.id;
    assert.equal(
      (await call("get", base + "/reports", friend.token)).body.length,
      0,
    );
    assert.equal(
      (await call("get", base + "/reports", student.token)).body[0].description,
      input.description,
    );
    assert.equal(
      (
        await call("patch", base + "/reports/" + reportId, student.token, {
          status: "resolved",
          publicSummary: null,
          staffNote: "",
        })
      ).status,
      403,
    );
  });
  await t.test(
    "staff publication strips author identity and private content",
    async () => {
      const v = {
        status: "reviewing",
        publicSummary: "Lighting maintenance near the library",
        staffNote: "Private staff note",
      };
      assert.equal(
        (await call("patch", base + "/reports/" + reportId, owner.token, v))
          .status,
        200,
      );
      const r = await call("get", base + "/reports", friend.token);
      assert.equal(r.body[0].title, v.publicSummary);
      assert.equal(r.body[0].description, v.publicSummary);
      assert.equal(r.body[0].author_id, null);
      assert.equal(r.body[0].staff_note, null);
      assert.equal(
        (
          await call(
            "patch",
            "/campuses/" + b.id + "/reports/" + reportId,
            otherOwner.token,
            v,
          )
        ).status,
        404,
      );
    },
  );
  await t.test("directory, alerts, staff delegation and audit", async () => {
    const r = await call("post", base + "/directory", owner.token, {
      name: "Campus safety",
      phone: "+1 212 555 0100",
      description: "Test number",
      priority: 1,
    });
    assert.equal(r.status, 201);
    assert.equal(
      (await call("get", base + "/directory", student.token)).body.length,
      1,
    );
    assert.equal(
      (
        await call("post", base + "/directory", student.token, {
          name: "Fake",
          phone: "123",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("post", base + "/alerts", owner.token, {
          title: "Test notice",
          body: "Maintenance underway",
          hours: 2,
        })
      ).status,
      201,
    );
    assert.equal(
      (await call("get", base + "/alerts", student.token)).body.length,
      1,
    );
    assert.equal(
      (
        await call("patch", base + "/members/" + friend.user.id, owner.token, {
          role: "staff",
        })
      ).status,
      200,
    );
    assert.equal(
      (await call("get", base + "/reports", friend.token)).body[0].description,
      "Sensitive private description",
    );
    assert.equal(
      (
        await call("patch", base + "/members/" + owner.user.id, owner.token, {
          role: "student",
        })
      ).status,
      404,
    );
    const rotation = await call("post", base + "/rotate-code", owner.token);
    assert.equal(rotation.status, 200);
    const activity = (await call("get", base + "/audit", owner.token)).body;
    assert.ok(activity.length >= 4);
    assert.equal(
      activity.find((event: any) => event.action === "directory.created")
        .details.title,
      "Campus safety",
    );
    assert.equal(
      activity.find((event: any) => event.action === "alert.created").details
        .title,
      "Test notice",
    );
    assert.ok(
      activity.some(
        (event: any) => event.action === "campus.invitation_rotated",
      ),
    );
    assert.ok(!JSON.stringify(activity).includes(rotation.body.joinCode));
  });
  await t.test("trusted contact acceptance and access isolation", async () => {
    const r = await call("post", "/contacts", student.token, {
      email: friend.user.email,
    });
    assert.equal(r.status, 201);
    contactId = r.body.id;
    assert.equal(
      (
        await call("post", "/sharing", student.token, {
          recipientIds: [friend.user.id],
          minutes: 15,
        })
      ).status,
      403,
    );
    assert.equal(
      (await call("post", "/contacts/" + contactId + "/accept", student.token))
        .status,
      404,
    );
    assert.equal(
      (await call("post", "/contacts/" + contactId + "/accept", friend.token))
        .status,
      200,
    );
    const s = await call("post", "/sharing", student.token, {
      recipientIds: [friend.user.id],
      minutes: 15,
    });
    assert.equal(s.status, 201);
    sessionId = s.body.id;
    assert.equal(
      (
        await call(
          "put",
          "/sharing/" + sessionId + "/location",
          student.token,
          { latitude: 40.73, longitude: -73.99, accuracy: 8 },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call("put", "/sharing/" + sessionId + "/location", friend.token, {
          latitude: 0,
          longitude: 0,
          accuracy: 8,
        })
      ).status,
      410,
    );
    assert.equal(
      (await call("get", "/sharing", friend.token)).body.incoming.length,
      1,
    );
    assert.equal(
      (await call("get", "/sharing", owner.token)).body.incoming.length,
      0,
    );
    assert.equal(
      (await call("get", "/sharing", stranger.token)).body.incoming.length,
      0,
    );
  });
  await t.test(
    "unknown location accuracy stays unknown for the recipient",
    async () => {
      const result = await call(
        "put",
        "/sharing/" + sessionId + "/location",
        student.token,
        {
          latitude: 40.73,
          longitude: -73.99,
        },
      );
      assert.equal(result.status, 200);
      const incoming = (await call("get", "/sharing", friend.token)).body
        .incoming;
      assert.equal(incoming[0].accuracy, null);
      const invalid = await call(
        "put",
        "/sharing/" + sessionId + "/location",
        student.token,
        {
          latitude: 40.73,
          longitude: -73.99,
          accuracy: -1,
        },
      );
      assert.equal(invalid.status, 400);
    },
  );
  await t.test("contact removal revokes access immediately", async () => {
    assert.equal(
      (await call("delete", "/contacts/" + contactId, friend.token)).status,
      204,
    );
    assert.equal(
      (await call("get", "/sharing", friend.token)).body.incoming.length,
      0,
    );
  });
  await t.test("stop and expiry revoke access and writes", async () => {
    assert.equal(
      (await call("delete", "/sharing/" + sessionId, student.token)).status,
      204,
    );
    assert.equal(
      (
        await call(
          "put",
          "/sharing/" + sessionId + "/location",
          student.token,
          { latitude: 1, longitude: 1, accuracy: 0 },
        )
      ).status,
      410,
    );
    const expired = randomUUID();
    await pool.query(
      "INSERT INTO sharing_sessions(id,owner_id,expires_at) VALUES($1,$2,now()-interval '1 second')",
      [expired, student.user.id],
    );
    assert.equal(
      (await call("get", "/sharing", student.token)).body.mine.length,
      0,
    );
    assert.equal(
      (
        await call("put", "/sharing/" + expired + "/location", student.token, {
          latitude: 1,
          longitude: 1,
          accuracy: 0,
        })
      ).status,
      410,
    );
  });
  await t.test(
    "recovery codes are bounded, single-use and revoke sessions",
    async () => {
      const recovery = await call("post", "/auth/forgot", undefined, {
        email: student.user.email,
      });
      assert.equal(recovery.status, 200, JSON.stringify(recovery.body));
      const mail = await pool.query(
        "SELECT body FROM mail_outbox WHERE recipient=$1 AND subject='Reset your SafelyGo password' ORDER BY created_at DESC",
        [student.user.email],
      );
      const code = mail.rows[0].body.match(/\b\d{8}\b/)[0];
      const r = await call("post", "/auth/reset", undefined, {
        email: student.user.email,
        code,
        password: "New-long-password-for-tests",
      });
      assert.equal(r.status, 200);
      assert.equal((await call("get", "/me", student.token)).status, 401);
      assert.equal(
        (
          await call("post", "/auth/reset", undefined, {
            email: student.user.email,
            code,
            password: pass,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call("post", "/auth/login", undefined, {
            email: student.user.email,
            password: pass,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await call("post", "/auth/login", undefined, {
            email: student.user.email,
            password: "New-long-password-for-tests",
          })
        ).status,
        200,
      );
    },
  );
  await t.test("unverified users cannot access campuses", async () => {
    const r = await call("post", "/auth/register", undefined, {
      name: "Unverified",
      email: "unverified@alpha.edu",
      password: pass,
    });
    assert.equal((await call("get", "/campuses", r.body.token)).status, 403);
    assert.equal((await call("get", "/me", r.body.token)).status, 200);
  });
  await t.test(
    "account deletion protects owners and anonymizes retained reports",
    async () => {
      assert.equal(
        (await call("delete", "/me", owner.token, { password: pass })).status,
        409,
      );
      const login = await call("post", "/auth/login", undefined, {
        email: student.user.email,
        password: "New-long-password-for-tests",
      });
      assert.equal(
        (
          await call("delete", "/me", login.body.token, {
            password: "New-long-password-for-tests",
          })
        ).status,
        204,
      );
      assert.equal(
        (
          await pool.query("SELECT author_id FROM reports WHERE id=$1", [
            reportId,
          ])
        ).rows[0].author_id,
        null,
      );
      assert.equal((await call("get", "/me", login.body.token)).status, 401);
    },
  );
  await t.test("malformed input and unauthenticated access", async () => {
    assert.equal((await call("get", "/me")).status, 401);
    assert.equal(
      (await call("get", "/campuses/not-a-uuid/reports", owner.token)).status,
      400,
    );
    assert.equal(
      (
        await call("post", base + "/reports", owner.token, {
          title: "Missing fields",
        })
      ).status,
      400,
    );
  });
  await t.test(
    "verification codes lock after five attempts and resend replaces them",
    async () => {
      const r = await call("post", "/auth/register", undefined, {
        name: "Code test",
        email: "codes@alpha.edu",
        password: pass,
      });
      const codeMail = await pool.query(
        "SELECT body FROM mail_outbox WHERE recipient=$1 ORDER BY created_at DESC",
        ["codes@alpha.edu"],
      );
      const original = codeMail.rows[0].body.match(/\b\d{8}\b/)[0];
      for (let i = 0; i < 5; i++)
        assert.equal(
          (
            await call("post", "/auth/verify", r.body.token, {
              code: "00000000",
            })
          ).status,
          400,
        );
      assert.equal(
        (await call("post", "/auth/verify", r.body.token, { code: original }))
          .status,
        400,
      );
      assert.equal(
        (await call("post", "/auth/resend", r.body.token)).status,
        200,
      );
      const replacement = await pool.query(
        "SELECT body FROM mail_outbox WHERE recipient=$1 ORDER BY created_at DESC",
        ["codes@alpha.edu"],
      );
      assert.equal(
        (
          await call("post", "/auth/verify", r.body.token, {
            code: replacement.rows[0].body.match(/\b\d{8}\b/)[0],
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "fresh signup through approval, staff actions, invitations and deletion",
    async (journey) => {
      const manager = await register("manager@gamma.edu", "Gamma Manager");
      const pal = await register("pal@gamma.edu", "Gamma Friend");
      const raw = await call("post", "/auth/register", undefined, {
        name: "Fresh Student",
        email: "fresh@gamma.edu",
        password: pass,
      });
      assert.equal(raw.status, 201, JSON.stringify(raw.body));
      assert.equal(
        (await call("get", "/campuses", raw.body.token)).status,
        403,
      );
      const codeMail = await pool.query(
        "SELECT body FROM mail_outbox WHERE recipient='fresh@gamma.edu' ORDER BY created_at DESC",
      );
      const verification = codeMail.rows[0].body.match(/\b\d{8}\b/)[0];
      assert.equal(
        (
          await call("post", "/auth/verify", raw.body.token, {
            code: verification,
          })
        ).status,
        200,
      );
      const login = await call("post", "/auth/login", undefined, {
        email: "fresh@gamma.edu",
        password: pass,
      });
      assert.equal(login.status, 200);
      const fresh = { token: login.body.token, user: login.body.user };
      const gamma = await campus(
        manager.token,
        "Gamma Acceptance Campus",
        "gamma.edu",
      );
      const path = "/campuses/" + gamma.id;
      let concern = "";
      await journey.test(
        "pending campus review, real operator approval and owner notification",
        async () => {
          assert.ok(
            !(await call("get", "/campuses", fresh.token)).body.some(
              (c: { id: string }) => c.id === gamma.id,
            ),
          );
          await assert.rejects(operator("approve", gamma.id));
          assert.equal(
            (
              await pool.query("SELECT status FROM campuses WHERE id=$1", [
                gamma.id,
              ])
            ).rows[0].status,
            "pending",
          );
          assert.match(
            (await operator("list", "pending")).stdout,
            /Gamma Acceptance Campus/,
          );
          await operator("approve", gamma.id, ...review);
          await assert.rejects(operator("approve", gamma.id, ...review));
          const details = JSON.parse((await operator("show", gamma.id)).stdout);
          assert.equal(details.campus.status, "active");
          assert.equal(details.reviews[0].operator_name, "Acceptance operator");
          assert.match(details.reviews[0].review_note, /TEST-REVIEW/);
          assert.equal(
            (
              await pool.query(
                "SELECT 1 FROM mail_outbox WHERE recipient=$1 AND subject='SafelyGo campus active'",
                [manager.user.email],
              )
            ).rowCount,
            1,
          );
          assert.ok(
            (await call("get", "/campuses", fresh.token)).body.some(
              (c: { id: string }) => c.id === gamma.id,
            ),
          );
          assert.equal(
            (
              await call("post", "/campuses/join", fresh.token, {
                campusId: gamma.id,
                joinCode: "wrong-code",
              })
            ).status,
            400,
          );
          for (const person of [fresh, pal])
            assert.equal(
              (
                await call("post", "/campuses/join", person.token, {
                  campusId: gamma.id,
                  joinCode: gamma.join_code,
                })
              ).status,
              200,
            );
        },
      );
      await journey.test(
        "student report and delegated staff management",
        async () => {
          const r = await call("post", path + "/reports", fresh.token, {
            title: "Test path",
            description: "Private acceptance details",
            category: "hazard",
            severity: "low",
            latitude: 40.73,
            longitude: -73.99,
          });
          assert.equal(r.status, 201);
          concern = r.body.id;
          assert.equal(
            (
              await call(
                "patch",
                path + "/members/" + pal.user.id,
                manager.token,
                { role: "staff" },
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await call(
                "patch",
                path + "/members/" + fresh.user.id,
                pal.token,
                { role: "staff" },
              )
            ).status,
            403,
          );
          assert.equal(
            (
              await call("patch", path + "/reports/" + concern, pal.token, {
                status: "resolved",
                publicSummary: "Path issue resolved",
                staffNote: "Checked by test staff",
              })
            ).status,
            200,
          );
          const contact = {
            name: "Acceptance safety office",
            phone: "+1 212 555 0199",
            description: "Fictional test number",
            priority: 1,
          };
          const directory = await call(
            "post",
            path + "/directory",
            pal.token,
            contact,
          );
          assert.equal(directory.status, 201);
          assert.equal(
            (
              await call(
                "patch",
                path + "/directory/" + directory.body.id,
                pal.token,
                { ...contact, description: "Updated test entry" },
              )
            ).status,
            200,
          );
          assert.equal(
            (await call("get", path + "/directory", fresh.token)).body[0]
              .description,
            "Updated test entry",
          );
          assert.equal(
            (
              await call(
                "delete",
                path + "/directory/" + directory.body.id,
                pal.token,
              )
            ).status,
            204,
          );
          const announcement = await call("post", path + "/alerts", pal.token, {
            title: "Test update",
            body: "Acceptance only",
            hours: 1,
          });
          assert.equal(announcement.status, 201);
          assert.equal(
            (await call("get", path + "/alerts", fresh.token)).body.length,
            1,
          );
          assert.equal(
            (
              await call(
                "delete",
                path + "/alerts/" + announcement.body.id,
                pal.token,
              )
            ).status,
            204,
          );
          assert.equal(
            (
              await call(
                "patch",
                path + "/members/" + pal.user.id,
                manager.token,
                { role: "student" },
              )
            ).status,
            200,
          );
          assert.equal(
            (await call("post", path + "/directory", pal.token, contact))
              .status,
            403,
          );
        },
      );
      await journey.test(
        "invitation delivery queue, recipient acceptance and live access",
        async () => {
          const invite = await call("post", "/contacts", fresh.token, {
            email: pal.user.email,
          });
          assert.equal(invite.status, 201);
          assert.equal(
            (
              await call("post", "/contacts", fresh.token, {
                email: pal.user.email,
              })
            ).status,
            409,
          );
          const inbox = await call("get", "/contacts", pal.token);
          assert.equal(inbox.body[0].status, "pending");
          assert.equal(
            (
              await call(
                "post",
                "/contacts/" + invite.body.id + "/accept",
                manager.token,
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await call(
                "post",
                "/contacts/" + invite.body.id + "/accept",
                pal.token,
              )
            ).status,
            200,
          );
          const walk = await call("post", "/sharing", fresh.token, {
            recipientIds: [pal.user.id],
            minutes: 15,
          });
          assert.equal(walk.status, 201);
          assert.equal(
            (
              await call(
                "put",
                "/sharing/" + walk.body.id + "/location",
                fresh.token,
                { latitude: 40.73, longitude: -73.99, accuracy: 8 },
              )
            ).status,
            200,
          );
          assert.equal(
            (await call("get", "/sharing", pal.token)).body.incoming.length,
            1,
          );
        },
      );
      await journey.test(
        "account deletion revokes sharing and clears queued personal emails",
        async () => {
          assert.equal(
            (
              await call("delete", "/me", fresh.token, {
                password: "wrong-password",
              })
            ).status,
            403,
          );
          assert.equal(
            (await call("get", "/sharing", pal.token)).body.incoming.length,
            1,
          );
          assert.ok(
            (
              await pool.query("SELECT 1 FROM mail_outbox WHERE recipient=$1", [
                fresh.user.email,
              ])
            ).rowCount,
          );
          assert.equal(
            (await call("delete", "/me", fresh.token, { password: pass }))
              .status,
            204,
          );
          assert.equal((await call("get", "/me", fresh.token)).status, 401);
          assert.equal(
            (await call("get", "/sharing", pal.token)).body.incoming.length,
            0,
          );
          assert.equal(
            (await call("get", "/contacts", pal.token)).body.length,
            0,
          );
          for (const table of ["sessions", "memberships", "auth_codes"])
            assert.equal(
              (
                await pool.query(`SELECT 1 FROM ${table} WHERE user_id=$1`, [
                  fresh.user.id,
                ])
              ).rowCount,
              0,
            );
          assert.equal(
            (
              await pool.query(
                "SELECT 1 FROM sharing_sessions WHERE owner_id=$1",
                [fresh.user.id],
              )
            ).rowCount,
            0,
          );
          assert.equal(
            (
              await pool.query("SELECT 1 FROM mail_outbox WHERE recipient=$1", [
                fresh.user.email,
              ])
            ).rowCount,
            0,
          );
          assert.equal(
            (
              await pool.query("SELECT author_id FROM reports WHERE id=$1", [
                concern,
              ])
            ).rows[0].author_id,
            null,
          );
          assert.equal(
            (
              await call("post", "/auth/login", undefined, {
                email: fresh.user.email,
                password: pass,
              })
            ).status,
            401,
          );
        },
      );
      await journey.test(
        "ownership transfer allows former owner deletion",
        async () => {
          assert.equal(
            (await call("delete", "/me", manager.token, { password: pass }))
              .status,
            409,
          );
          await operator("transfer", gamma.id, pal.user.id, ...review);
          const current = await call("get", "/me", pal.token);
          assert.equal(current.body.campuses[0].role, "owner");
          assert.equal(
            (await call("get", "/me", manager.token)).body.campuses[0].role,
            "staff",
          );
          assert.equal(
            (await call("delete", "/me", manager.token, { password: pass }))
              .status,
            204,
          );
          assert.equal(
            JSON.parse((await operator("show", gamma.id)).stdout).campus
              .owner_id,
            pal.user.id,
          );
        },
      );
      await journey.test(
        "operator suspension and reviewed reactivation",
        async () => {
          await operator("suspend", gamma.id, ...review);
          assert.equal(
            (await call("get", path + "/reports", pal.token)).status,
            403,
          );
          await assert.rejects(operator("approve", gamma.id, ...review));
          await operator("reactivate", gamma.id, ...review);
          assert.equal(
            (await call("get", path + "/reports", pal.token)).status,
            200,
          );
          const reviews = JSON.parse(
            (await operator("show", gamma.id)).stdout,
          ).reviews;
          assert.deepEqual(
            reviews.map((v: { action: string }) => v.action),
            [
              "platform.reactivate",
              "platform.suspend",
              "platform.transfer",
              "platform.approve",
            ],
          );
        },
      );
    },
  );
  await t.test(
    "paginated history remains accessible and tenant-filtered",
    async () => {
      await pool.query(
        `INSERT INTO reports(id,campus_id,author_id,title,description,category,severity,latitude,longitude,created_at) SELECT md5('pagination-'||g::text)::uuid,$1,$2,'History '||g::text,'Older campus report','other','low',40.73,-73.99,now()-g*interval '1 minute' FROM generate_series(1,201) g`,
        [a.id, owner.user.id],
      );
      const first = await call("get", base + "/reports", owner.token);
      const second = await call(
        "get",
        base + "/reports?offset=200",
        owner.token,
      );
      assert.equal(first.body.length, 200);
      assert.ok(second.body.length > 0);
      assert.ok(
        !first.body.some((r: { id: string }) =>
          second.body.some((n: { id: string }) => n.id === r.id),
        ),
      );
      assert.equal(
        (await call("get", base + "/reports?offset=-1", owner.token)).status,
        400,
      );
      assert.equal(
        (await call("get", base + "/reports?offset=200", otherOwner.token))
          .status,
        403,
      );
    },
  );
  await t.test(
    "membership revocation and suspension apply on the next request",
    async () => {
      assert.equal(
        (await call("delete", base + "/members/" + friend.user.id, owner.token))
          .status,
        204,
      );
      assert.equal(
        (await call("get", base + "/reports", friend.token)).status,
        403,
      );
      await pool.query("UPDATE campuses SET status='suspended' WHERE id=$1", [
        a.id,
      ]);
      assert.equal(
        (await call("get", base + "/reports", owner.token)).status,
        403,
      );
    },
  );
  await t.test(
    "verification codes are delivered by the local file mail transport",
    async () => {
      const r = await call("post", "/auth/register", undefined, {
        name: "File mail test",
        email: "filemail@alpha.edu",
        password: pass,
      });
      assert.equal(r.status, 201);
      const { deliverMail } = await import("../src/mail.js");
      const previousDirectory = process.cwd();
      const previousMode = process.env.MAIL_MODE;
      const folder = await mkdtemp(join(tmpdir(), "safelygo-mail-test-"));
      try {
        process.chdir(folder);
        process.env.MAIL_MODE = "file";
        while ((await pool.query("SELECT 1 FROM mail_outbox")).rowCount)
          await deliverMail();
        const files = await readdir(join(folder, ".mail"));
        const messages = await Promise.all(
          files.map(async (f) =>
            JSON.parse(await readFile(join(folder, ".mail", f), "utf8")),
          ),
        );
        const mail = messages.find((m) => m.to === "filemail@alpha.edu");
        assert.ok(
          mail,
          "The verification email must be delivered, not merely queued",
        );
        assert.equal(mail.subject, "Verify your email address");
        assert.equal(
          (
            await call("post", "/auth/verify", r.body.token, {
              code: mail.body.match(/\b\d{8}\b/)[0],
            })
          ).status,
          200,
        );
      } finally {
        process.chdir(previousDirectory);
        if (previousMode === undefined) delete process.env.MAIL_MODE;
        else process.env.MAIL_MODE = previousMode;
        await rm(folder, { recursive: true, force: true });
      }
    },
  );
  await t.test(
    "invitations reach people who have not registered and require recipient acceptance",
    async () => {
      const sender = await register("invite-sender@journey.edu");
      const invitedEmail = "new-contact@journey.edu";
      assert.equal(
        (await call("post", "/contacts", sender.token, { email: invitedEmail }))
          .status,
        201,
      );
      const waiting = await call("get", "/contacts", sender.token);
      assert.equal(waiting.body[0].other_email, invitedEmail);
      const resent = await call("post", "/contacts", sender.token, {
        email: invitedEmail,
      });
      assert.equal(resent.status, 201);
      assert.equal(resent.body.id, waiting.body[0].id);
      assert.equal(
        (await call("get", "/contacts", sender.token)).body.length,
        1,
      );
      const recipient = await register(invitedEmail);
      const inbox = await call("get", "/contacts", recipient.token);
      assert.equal(inbox.body.length, 1);
      assert.equal(inbox.body[0].status, "pending");
      assert.equal(
        (
          await call("post", "/sharing", sender.token, {
            recipientIds: [recipient.user.id],
            minutes: 15,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            "post",
            "/contacts/" + inbox.body[0].id + "/accept",
            stranger.token,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            "post",
            "/contacts/" + inbox.body[0].id + "/accept",
            recipient.token,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await call("post", "/sharing", sender.token, {
            recipientIds: [recipient.user.id],
            minutes: 15,
          })
        ).status,
        201,
      );
    },
  );
  await t.test(
    "owner handover requires password and verified campus staff",
    async () => {
      const first = await register("first@personal.example.net");
      const successor = await register("successor@personal.example.org");
      const site = await campus(first.token, "Handover Campus", "handover.edu");
      await operator("approve", site.id, ...review);
      const path = "/campuses/" + site.id;
      await call("post", "/campuses/join", successor.token, {
        campusId: site.id,
        joinCode: site.join_code,
      });
      assert.equal(
        (
          await call("post", path + "/transfer-ownership", first.token, {
            memberId: successor.user.id,
            password: pass,
          })
        ).status,
        400,
      );
      await call("patch", path + "/members/" + successor.user.id, first.token, {
        role: "staff",
      });
      assert.equal(
        (
          await call("post", path + "/transfer-ownership", first.token, {
            memberId: successor.user.id,
            password: "wrong",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await call("post", path + "/transfer-ownership", first.token, {
            memberId: successor.user.id,
            password: pass,
          })
        ).status,
        200,
      );
      assert.equal(
        (await call("post", path + "/rotate-code", first.token)).status,
        403,
      );
      assert.equal(
        (await call("post", path + "/rotate-code", successor.token)).status,
        200,
      );
      assert.equal(
        (await call("delete", "/me", first.token, { password: pass })).status,
        204,
      );
    },
  );
  await t.test(
    "validation returns human guidance instead of parser internals",
    async () => {
      const r = await call("post", "/auth/register", undefined, {
        name: "",
        email: "bad",
        password: "short",
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.fields.email, "Enter a valid email address.");
      assert.ok(!r.body.error.includes("Invalid input"));
    },
  );

  await t.test(
    "platform approval is restricted and records authenticated decisions",
    async () => {
      const applicant = await register("applicant@operator.edu");
      const application = await campus(
        applicant.token,
        "Operator-reviewed campus",
        "operator.edu",
      );
      const previous = process.env.PLATFORM_OPERATOR_EMAILS;
      process.env.PLATFORM_OPERATOR_EMAILS = owner.user.email;
      try {
        assert.equal(
          (await call("get", "/platform/campuses", applicant.token)).status,
          403,
        );
        assert.equal(
          (
            await call(
              "post",
              "/platform/campuses/" + application.id + "/review",
              applicant.token,
              {
                action: "approve",
                reason: "Fake authority review",
                authorityConfirmed: true,
              },
            )
          ).status,
          403,
        );
        const queue = await call(
          "get",
          "/platform/campuses?status=pending",
          owner.token,
        );
        assert.ok(
          queue.body.some((c: { id: string }) => c.id === application.id),
        );
        assert.equal(
          (
            await call(
              "post",
              "/platform/campuses/" + application.id + "/review",
              owner.token,
              {
                action: "approve",
                reason: "TEST: institution independently verified",
                authorityConfirmed: false,
              },
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              "post",
              "/platform/campuses/" + application.id + "/review",
              owner.token,
              {
                action: "approve",
                reason: "TEST: institution independently verified",
                authorityConfirmed: true,
              },
            )
          ).status,
          200,
        );
        const records = await pool.query(
          "SELECT actor_id,operator_name,review_note FROM audit WHERE campus_id=$1 AND action='platform.approve'",
          [application.id],
        );
        assert.equal(records.rows[0].actor_id, owner.user.id);
        assert.ok(records.rows[0].review_note.includes("TEST:"));
        assert.equal(
          (
            await call(
              "post",
              "/platform/campuses/" + application.id + "/review",
              owner.token,
              {
                action: "approve",
                reason: "TEST: repeat decision rejected",
                authorityConfirmed: true,
              },
            )
          ).status,
          400,
        );
      } finally {
        if (previous === undefined) delete process.env.PLATFORM_OPERATOR_EMAILS;
        else process.env.PLATFORM_OPERATOR_EMAILS = previous;
      }
    },
  );
  await t.test(
    "campus emergency and support configuration is owner-only",
    async () => {
      const settingsOwner = await register("owner@settings.edu");
      const member = await register("member@settings.edu");
      const site = await campus(
        settingsOwner.token,
        "Configured campus",
        "settings.edu",
      );
      await operator("approve", site.id, ...review);
      await call("post", "/campuses/join", member.token, {
        campusId: site.id,
        joinCode: site.join_code,
      });
      const settings = {
        name: "Configured campus",
        website: "https://settings.edu",
        latitude: 40.73,
        longitude: -73.99,
        radiusM: 1500,
        emergencyPhone: "+1 212 555 0199",
        supportEmail: "support@settings.edu",
      };
      assert.equal(
        (await call("patch", "/campuses/" + site.id, member.token, settings))
          .status,
        403,
      );
      assert.equal(
        (
          await call(
            "patch",
            "/campuses/" + site.id,
            settingsOwner.token,
            settings,
          )
        ).status,
        200,
      );
      const profile = await call("get", "/me", member.token);
      assert.equal(
        profile.body.campuses[0].emergency_phone,
        settings.emergencyPhone,
      );
      assert.equal(
        profile.body.campuses[0].support_email,
        settings.supportEmail,
      );
    },
  );
  await t.test(
    "unverified email correction requires password, replaces codes and revokes other sessions",
    async () => {
      const oldEmail = "typo@correction.example";
      const newEmail = "correct@correction.example";
      const registered = await call("post", "/auth/register", undefined, {
        name: "Correction Test",
        email: oldEmail,
        password: pass,
      });
      assert.equal(registered.status, 201);
      const session = registered.body.token;
      const previousMail = await pool.query(
        "SELECT body FROM mail_outbox WHERE recipient=$1",
        [oldEmail],
      );
      const oldCode = previousMail.rows[0].body.match(/\b\d{8}\b/)[0];
      const secondLogin = await call("post", "/auth/login", undefined, {
        email: oldEmail,
        password: pass,
      });
      assert.equal(secondLogin.status, 200);
      assert.equal(
        (
          await call("post", "/auth/email", undefined, {
            email: newEmail,
            password: pass,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await call("post", "/auth/email", session, {
            email: newEmail,
            password: "wrong",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call("post", "/auth/email", session, {
            email: owner.user.email,
            password: pass,
          })
        ).status,
        409,
      );
      assert.equal(
        (await call("get", "/me", session)).body.user.email,
        oldEmail,
      );
      assert.equal(
        (
          await call("post", "/auth/email", session, {
            email: newEmail,
            password: pass,
          })
        ).status,
        200,
      );
      assert.equal(
        (await call("get", "/me", session)).body.user.email,
        newEmail,
      );
      assert.equal(
        (await call("get", "/me", secondLogin.body.token)).status,
        401,
      );
      assert.equal(
        (
          await pool.query("SELECT 1 FROM mail_outbox WHERE recipient=$1", [
            oldEmail,
          ])
        ).rowCount,
        0,
      );
      assert.equal(
        (await call("post", "/auth/verify", session, { code: oldCode })).status,
        400,
      );
      const newMail = await pool.query(
        "SELECT body FROM mail_outbox WHERE recipient=$1",
        [newEmail],
      );
      assert.equal(newMail.rowCount, 1);
      const newCode = newMail.rows[0].body.match(/\b\d{8}\b/)[0];
      assert.equal(
        (await call("post", "/auth/verify", session, { code: newCode })).status,
        200,
      );
      assert.equal(
        (
          await call("post", "/auth/email", session, {
            email: oldEmail,
            password: pass,
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await call("post", "/auth/login", undefined, {
            email: oldEmail,
            password: pass,
          })
        ).status,
        401,
      );
    },
  );
  await t.test(
    "campus search uses configured provider and caches explicit searches",
    async () => {
      const previous = process.env.GEOCODER_SEARCH_URL;
      delete process.env.GEOCODER_SEARCH_URL;
      assert.equal(
        (await call("get", "/places?q=Fictional%20campus", owner.token)).status,
        503,
      );
      let requests = 0;
      const provider = createServer((_req, res) => {
        requests++;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify([
            {
              display_name: "Fictional campus address",
              lat: "40.73",
              lon: "-73.99",
            },
          ]),
        );
      });
      await new Promise<void>((resolve) =>
        provider.listen(0, "127.0.0.1", resolve),
      );
      try {
        const address = provider.address();
        assert.ok(address && typeof address !== "string");
        process.env.GEOCODER_SEARCH_URL =
          "http://127.0.0.1:" + address.port + "/search";
        const first = await call(
          "get",
          "/places?q=Fictional%20campus",
          owner.token,
        );
        assert.equal(first.status, 200);
        assert.equal(first.body[0].latitude, 40.73);
        assert.equal(
          (await call("get", "/places?q=Fictional%20campus", owner.token))
            .status,
          200,
        );
        assert.equal(requests, 1);
        assert.equal(
          (
            await pool.query(
              "SELECT 1 FROM geocoder_cache WHERE expires_at>now()",
            )
          ).rowCount,
          1,
        );
        // An uncached search is throttled across users; cached results still work.
        assert.equal(
          (await call("get", "/places?q=Another%20campus", otherOwner.token))
            .status,
          429,
        );
        assert.equal(requests, 1);
        await pool.query(
          "UPDATE rate_limits SET reset_at=now()-interval '1 second' WHERE key='geocoder-global'",
        );
        assert.equal(
          (await call("get", "/places?q=Another%20campus", otherOwner.token))
            .status,
          200,
        );
        assert.equal(requests, 2);
      } finally {
        await new Promise<void>((resolve) => provider.close(() => resolve()));
        if (previous === undefined) delete process.env.GEOCODER_SEARCH_URL;
        else process.env.GEOCODER_SEARCH_URL = previous;
      }
    },
  );
  await t.test(
    "report retries are atomic, immutable and scoped to their author",
    async () => {
      const author = await register("owner@receipts.edu", "Receipt Owner");
      const second = await register("student@receipts.edu", "Receipt Student");
      const site = await campus(author.token, "Receipt Campus", "receipts.edu");
      await operator("approve", site.id, ...review);
      assert.equal(
        (
          await call("post", "/campuses/join", second.token, {
            campusId: site.id,
            joinCode: site.join_code,
          })
        ).status,
        200,
      );
      const path = "/campuses/" + site.id + "/reports";
      const input = {
        requestId: randomUUID(),
        title: "Broken campus light",
        description: "Fictional acceptance report",
        category: "lighting",
        severity: "medium",
        latitude: 40.73,
        longitude: -73.99,
      };
      const results = await Promise.all([
        call("post", path, author.token, input),
        call("post", path, author.token, input),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
      assert.equal(results[0].body.id, results[1].body.id);
      const replay = await call("post", path, author.token, input);
      assert.equal(replay.status, 200);
      assert.equal(replay.body.id, results[0].body.id);
      const changed = await call("post", path, author.token, {
        ...input,
        description: "Changed after receipt",
      });
      assert.equal(changed.status, 409);
      const isolated = await call("post", path, second.token, input);
      assert.equal(isolated.status, 201);
      assert.notEqual(isolated.body.id, results[0].body.id);
      const stored = await pool.query(
        "SELECT description FROM reports WHERE campus_id=$1 AND author_id=$2 AND client_request_id=$3",
        [site.id, author.user.id, input.requestId],
      );
      assert.equal(stored.rowCount, 1);
      assert.equal(stored.rows[0].description, input.description);
    },
  );

  await t.test(
    "regular verified emails can join campuses using invitation codes",
    async () => {
      const manager = await register("manager@personal.example.com");
      const member = await register("student@personal.example.net");
      const outsider = await register("outsider@personal.example.org");
      const site = await campus(
        manager.token,
        "Regular Email Campus",
        "ordinary-campus.edu",
      );
      await operator("approve", site.id, ...review);
      assert.equal(
        (
          await call("post", "/campuses/join", member.token, {
            campusId: site.id,
            joinCode: "wrong-code",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call("post", "/campuses/join", member.token, {
            campusId: site.id,
            joinCode: site.join_code,
          })
        ).status,
        200,
      );
      assert.equal(
        (await call("get", "/campuses/" + site.id + "/reports", member.token))
          .status,
        200,
      );
      assert.equal(
        (await call("get", "/campuses/" + site.id + "/reports", outsider.token))
          .status,
        403,
      );
      assert.equal(
        (
          await call(
            "patch",
            "/campuses/" + site.id + "/members/" + manager.user.id,
            member.token,
            { role: "staff" },
          )
        ).status,
        403,
      );
      const unverified = await call("post", "/auth/register", undefined, {
        email: "unverified@personal.example.net",
        name: "Unverified",
        password: pass,
      });
      assert.equal(unverified.status, 201);
      assert.equal(
        (
          await call("post", "/campuses/join", unverified.body.token, {
            campusId: site.id,
            joinCode: site.join_code,
          })
        ).status,
        403,
      );
    },
  );
});
