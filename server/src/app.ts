import { registerPublicPages } from "./publicPages.js";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { pool, transaction } from "./db.js";
import {
  HttpError,
  hashPassword,
  verifyPassword,
  hashToken,
  token,
  code,
} from "./security.js";
import { enqueueMail } from "./mail.js";
import { reviewCampus } from "./platform.js";
import type pg from "pg";

type Identity = { id: string; name: string; email: string; verified: boolean };
type AuthRequest = Request & {
  user: Identity;
  sessionHash: string;
  member: { role: string; campus_id: string; status: string };
};
const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase().trim());
const password = z.string().min(12, "Use at least 12 characters").max(128);
const uuid = z.uuid();
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const text = (max: number) => z.string().trim().min(1).max(max);
const campusInput = z.object({
  name: text(120),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
  website: z
    .url()
    .max(300)
    .refine((v) => new URL(v).protocol === "https:", "Use an HTTPS website"),
  latitude: lat,
  longitude: lng,
  radiusM: z.number().int().min(100).max(20000),
  emergencyPhone: z
    .string()
    .trim()
    .max(25)
    .regex(/^$|^\+?[0-9 ()-]{3,25}$/)
    .default(""),
  supportEmail: z.union([z.literal(""), email]).default(""),
});
const contactInput = z.object({
  name: text(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{3,25}$/),
  description: z.string().trim().max(300).default(""),
  priority: z.number().int().min(0).max(100).default(10),
});
const reportInput = z.object({
  requestId: uuid.optional(),
  title: text(120),
  description: text(3000),
  category: z.enum([
    "lighting",
    "hazard",
    "suspicious",
    "harassment",
    "theft",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  latitude: lat,
  longitude: lng,
});
const auth = (req: Request) => req as AuthRequest;
const pageOffset = (req: Request) =>
  z.coerce
    .number()
    .int()
    .min(0)
    .max(1000000)
    .parse(req.query.offset || 0);
const idParam = (req: Request, key = "id") => uuid.parse(req.params[key]);
const route =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = (
        process.env.CORS_ORIGINS || "http://localhost:8081"
      ).split(",").map((value) => value.trim()).filter(Boolean);
      cb(null, !origin || allowed.includes(origin));
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
registerPublicPages(app);
app.get(
  "/health",
  route(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  }),
);
// PostgreSQL counters work across Railway replicas and survive restarts.
async function countLimit(
  req: Request,
  name: string,
  hits: number,
  seconds: number,
) {
  const key = name + ":" + req.ip;
  const r = await pool.query(
    `INSERT INTO rate_limits(key,hits,reset_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.hits+1 END,reset_at=CASE WHEN rate_limits.reset_at<now() THEN excluded.reset_at ELSE rate_limits.reset_at END RETURNING hits`,
    [key, seconds],
  );
  if (r.rows[0].hits > hits)
    throw new HttpError(429, "Too many requests. Please try again later.");
}
app.use("/api", (req, res, next) => {
  countLimit(req, "api", 600, 60)
    .then(() => next())
    .catch(next);
});
app.use("/api/auth", (req, res, next) => {
  countLimit(req, "auth", 30, 900)
    .then(() => next())
    .catch(next);
});
async function createSession(db: pg.PoolClient, userId: string) {
  const value = token();
  await db.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",
    [hashToken(value), userId],
  );
  return value;
}
async function createCode(
  db: pg.PoolClient,
  user: Identity,
  purpose: "verify" | "reset",
) {
  const value = code();
  await db.query("DELETE FROM auth_codes WHERE user_id=$1 AND purpose=$2", [
    user.id,
    purpose,
  ]);
  await db.query(
    "INSERT INTO auth_codes(id,user_id,purpose,code_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '15 minutes')",
    [randomUUID(), user.id, purpose, hashToken(value)],
  );
  await enqueueMail(
    db,
    user.email,
    purpose === "verify"
      ? "Verify your email address"
      : "Reset your SafelyGo password",
    `Your SafelyGo ${purpose === "verify" ? "verification" : "password reset"} code is ${value}. It expires in 15 minutes. If you did not request this, ignore this email.`,
  );
}
async function audit(
  db: pg.PoolClient,
  req: Request,
  action: string,
  targetId: string,
  details: Record<string, unknown> = {},
) {
  await db.query(
    "INSERT INTO audit(campus_id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)",
    [
      auth(req).member.campus_id,
      auth(req).user.id,
      action,
      targetId,
      JSON.stringify(details),
    ],
  );
}
app.post(
  "/api/auth/register",
  route(async (req, res) => {
    const v = z.object({ name: text(100), email, password }).parse(req.body);
    const hash = await hashPassword(v.password);
    const result = await transaction(async (db) => {
      const u = await db.query(
        "INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email,verified",
        [randomUUID(), v.name, v.email, hash],
      );
      await createCode(db, u.rows[0], "verify");
      return { user: u.rows[0], token: await createSession(db, u.rows[0].id) };
    });
    res.status(201).json(result);
  }),
);
// Constant-work password comparison avoids a cheap missing-account timing oracle.
const dummyHash = await hashPassword(token());
// Only the explicitly enabled local demo can bypass password entry.
app.post(
  "/api/auth/demo",
  route(async (_req, res) => {
    if (
      process.env.NODE_ENV !== "development" ||
      process.env.DEMO_LOGIN !== "true"
    )
      throw new HttpError(404, "Test login is unavailable.");
    const r = await pool.query(
      "SELECT id,name,email,verified FROM users WHERE email IN ('alex.morgan@example.com','student@demo.safelygo.test') AND verified=true",
    );
    if (!r.rowCount)
      throw new HttpError(404, "The demo account has not been created.");
    res.json({
      user: r.rows[0],
      token: await transaction((db) => createSession(db, r.rows[0].id)),
    });
  }),
);
app.post(
  "/api/auth/login",
  route(async (req, res) => {
    const v = z
      .object({ email, password: z.string().max(128) })
      .parse(req.body);
    const r = await pool.query("SELECT * FROM users WHERE email=$1", [v.email]);
    const good = await verifyPassword(
      v.password,
      r.rows[0]?.password_hash || dummyHash,
    );
    if (!good || !r.rowCount)
      throw new HttpError(401, "Email or password is incorrect.");
    const user = r.rows[0];
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
      },
      token: await transaction((db) => createSession(db, user.id)),
    });
  }),
);
app.post(
  "/api/auth/forgot",
  route(async (req, res) => {
    const v = z.object({ email }).parse(req.body);
    await transaction(async (db) => {
      const r = await db.query(
        "SELECT id,name,email,verified FROM users WHERE email=$1",
        [v.email],
      );
      if (r.rowCount) await createCode(db, r.rows[0], "reset");
    });
    res.json({
      message: "If this account exists, a reset code has been emailed.",
    });
  }),
);
app.post(
  "/api/auth/reset",
  route(async (req, res) => {
    const v = z
      .object({ email, code: z.string().regex(/^\d{8}$/), password })
      .parse(req.body);
    const newHash = await hashPassword(v.password);
    const result = await transaction(async (db) => {
      const r = await db.query(
        "SELECT c.* FROM auth_codes c JOIN users u ON u.id=c.user_id WHERE u.email=$1 AND c.purpose='reset' AND c.expires_at>now() FOR UPDATE OF c",
        [v.email],
      );
      const c = r.rows[0];
      if (!c || c.attempts >= 5) return false;
      await db.query("UPDATE auth_codes SET attempts=attempts+1 WHERE id=$1", [
        c.id,
      ]);
      if (c.code_hash !== hashToken(v.code)) return false;
      await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
        newHash,
        c.user_id,
      ]);
      await db.query("DELETE FROM sessions WHERE user_id=$1", [c.user_id]);
      await db.query("DELETE FROM sharing_sessions WHERE owner_id=$1", [
        c.user_id,
      ]);
      await db.query("DELETE FROM auth_codes WHERE user_id=$1", [c.user_id]);
      return true;
    });
    if (!result)
      throw new HttpError(
        400,
        "Code is invalid, expired, or locked. Request a new code.",
      );
    res.json({ message: "Password reset. Sign in with your new password." });
  }),
);
app.use("/api", async (req, res, next) => {
  try {
    const raw = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!raw) throw new HttpError(401, "Sign in to continue.");
    const sessionHash = hashToken(raw);
    const r = await pool.query(
      "SELECT u.id,u.name,u.email,u.verified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
      [sessionHash],
    );
    if (!r.rowCount)
      throw new HttpError(401, "Your session expired. Sign in again.");
    auth(req).user = r.rows[0];
    auth(req).sessionHash = sessionHash;
    next();
  } catch (e) {
    next(e);
  }
});
app.get(
  "/api/me",
  route(async (req, res) => {
    const r = await pool.query(
      "SELECT c.*,m.role FROM memberships m JOIN campuses c ON c.id=m.campus_id WHERE m.user_id=$1 ORDER BY c.name",
      [auth(req).user.id],
    );
    res.json({
      user: auth(req).user,
      campuses: r.rows.map((c) => ({
        ...c,
        join_code: c.role === "owner" ? c.join_code : undefined,
      })),
    });
  }),
);
app.post(
  "/api/auth/logout",
  route(async (req, res) => {
    await transaction(async (db) => {
      await db.query("DELETE FROM sessions WHERE token_hash=$1", [
        auth(req).sessionHash,
      ]);
      await db.query("DELETE FROM sharing_sessions WHERE owner_id=$1", [
        auth(req).user.id,
      ]);
    });
    res.status(204).end();
  }),
);
app.post(
  "/api/auth/resend",
  route(async (req, res) => {
    if (!auth(req).user.verified)
      await transaction((db) => createCode(db, auth(req).user, "verify"));
    res.json({ message: "Verification code sent." });
  }),
);
app.post(
  "/api/auth/verify",
  route(async (req, res) => {
    const v = z.object({ code: z.string().regex(/^\d{8}$/) }).parse(req.body);
    const ok = await transaction(async (db) => {
      const r = await db.query(
        "SELECT * FROM auth_codes WHERE user_id=$1 AND purpose='verify' AND expires_at>now() FOR UPDATE",
        [auth(req).user.id],
      );
      const c = r.rows[0];
      if (!c || c.attempts >= 5) return false;
      await db.query("UPDATE auth_codes SET attempts=attempts+1 WHERE id=$1", [
        c.id,
      ]);
      if (c.code_hash !== hashToken(v.code)) return false;
      await db.query("UPDATE users SET verified=true WHERE id=$1", [c.user_id]);
      await db.query("DELETE FROM auth_codes WHERE id=$1", [c.id]);
      return true;
    });
    if (!ok)
      throw new HttpError(
        400,
        "Code is invalid, expired, or locked. Request a new code.",
      );
    res.json({ message: "Email verified." });
  }),
);
app.patch(
  "/api/me",
  route(async (req, res) => {
    const v = z.object({ name: text(100) }).parse(req.body);
    await pool.query("UPDATE users SET name=$1 WHERE id=$2", [
      v.name,
      auth(req).user.id,
    ]);
    res.json({ message: "Profile updated." });
  }),
);
app.delete(
  "/api/me",
  route(async (req, res) => {
    const v = z.object({ password: z.string().max(128) }).parse(req.body);
    await transaction(async (db) => {
      const r = await db.query(
        "SELECT password_hash,email FROM users WHERE id=$1 FOR UPDATE",
        [auth(req).user.id],
      );
      if (!r.rowCount) throw new HttpError(401, "Sign in again.");
      if (!(await verifyPassword(v.password, r.rows[0].password_hash)))
        throw new HttpError(403, "Password is incorrect.");
      if (
        (
          await db.query(
            "SELECT 1 FROM memberships WHERE user_id=$1 AND role='owner' FOR UPDATE",
            [auth(req).user.id],
          )
        ).rowCount
      )
        throw new HttpError(
          409,
          "Transfer campus ownership in Staff settings before deleting your account.",
        );
      await db.query("DELETE FROM mail_outbox WHERE recipient=$1", [
        r.rows[0].email,
      ]);
      await db.query("DELETE FROM users WHERE id=$1", [auth(req).user.id]);
    });
    res.status(204).end();
  }),
);
app.use("/api", (req, res, next) => {
  if (!auth(req).user.verified)
    return next(
      new HttpError(403, "Verify your email before using campus features."),
    );
  next();
});
app.get(
  "/api/campuses",
  route(async (req, res) => {
    const q = z
      .string()
      .max(100)
      .parse(req.query.q || "");
    const requestedDomain = z
      .string()
      .max(254)
      .parse(req.query.domain || "");
    const r = await pool.query(
      "SELECT id,name,domain,website,support_email,latitude,longitude,radius_m FROM campuses WHERE status='active' AND name ILIKE $1 AND ($3='' OR domain=$3) ORDER BY name,id LIMIT 100 OFFSET $2",
      ["%" + q + "%", pageOffset(req), requestedDomain],
    );
    res.json(r.rows);
  }),
);
app.post(
  "/api/campuses",
  route(async (req, res) => {
    const v = campusInput.parse(req.body);
    const result = await transaction(async (db) => {
      const r = await db.query(
        "INSERT INTO campuses(id,name,domain,website,latitude,longitude,radius_m,join_code,emergency_phone,support_email) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
        [
          randomUUID(),
          v.name,
          v.domain,
          v.website,
          v.latitude,
          v.longitude,
          v.radiusM,
          token().slice(0, 16),
          v.emergencyPhone,
          v.supportEmail,
        ],
      );
      await db.query(
        "INSERT INTO memberships(user_id,campus_id,role) VALUES($1,$2,'owner')",
        [auth(req).user.id, r.rows[0].id],
      );
      return r.rows[0];
    });
    res.status(201).json(result);
  }),
);
app.post(
  "/api/campuses/join",
  route(async (req, res) => {
    const v = z.object({ campusId: uuid, joinCode: text(50) }).parse(req.body);
    await transaction(async (db) => {
      const r = await db.query(
        "SELECT * FROM campuses WHERE id=$1 AND status='active' AND join_code=$2 FOR SHARE",
        [v.campusId, v.joinCode],
      );
      if (!r.rowCount)
        throw new HttpError(400, "Campus or invitation code is invalid.");
      await db.query(
        "INSERT INTO memberships(user_id,campus_id,role) VALUES($1,$2,'student') ON CONFLICT DO NOTHING",
        [auth(req).user.id, v.campusId],
      );
    });
    res.json({ message: "Campus joined." });
  }),
);
app.use("/api/campuses/:campusId", async (req, res, next) => {
  try {
    const campusId = uuid.parse(req.params.campusId);
    const r = await pool.query(
      "SELECT m.role,m.campus_id,c.status FROM memberships m JOIN campuses c ON c.id=m.campus_id WHERE m.user_id=$1 AND m.campus_id=$2",
      [auth(req).user.id, campusId],
    );
    if (!r.rowCount)
      throw new HttpError(403, "You do not belong to this campus.");
    if (r.rows[0].status === "suspended")
      throw new HttpError(403, "This campus is suspended. Contact support.");
    auth(req).member = r.rows[0];
    next();
  } catch (e) {
    next(e);
  }
});
const base = "/api/campuses/:campusId";
function staff(req: Request) {
  if (!["staff", "owner"].includes(auth(req).member.role))
    throw new HttpError(403, "Campus staff access required.");
}
function owner(req: Request) {
  if (auth(req).member.role !== "owner")
    throw new HttpError(403, "Campus owner access required.");
}
function active(req: Request) {
  if (auth(req).member.status !== "active")
    throw new HttpError(403, "Campus activation is pending review.");
}
app.patch(
  base,
  route(async (req, res) => {
    owner(req);
    const v = campusInput.omit({ domain: true }).parse(req.body);
    await transaction(async (db) => {
      await db.query(
        "UPDATE campuses SET name=$1,website=$2,latitude=$3,longitude=$4,radius_m=$5,emergency_phone=$7,support_email=$8 WHERE id=$6",
        [
          v.name,
          v.website,
          v.latitude,
          v.longitude,
          v.radiusM,
          auth(req).member.campus_id,
          v.emergencyPhone,
          v.supportEmail,
        ],
      );
      await audit(db, req, "campus.updated", auth(req).member.campus_id, {
        title: v.name,
      });
    });
    res.json({ message: "Campus updated." });
  }),
);
app.post(
  base + "/transfer-ownership",
  route(async (req, res) => {
    owner(req);
    const v = z
      .object({ memberId: uuid, password: z.string().max(128) })
      .parse(req.body);
    await transaction(async (db) => {
      const campus = await db.query(
        "SELECT * FROM campuses WHERE id=$1 FOR UPDATE",
        [auth(req).member.campus_id],
      );
      const current = await db.query(
        "SELECT u.password_hash,m.role FROM users u JOIN memberships m ON m.user_id=u.id WHERE u.id=$1 AND m.campus_id=$2 FOR UPDATE OF m",
        [auth(req).user.id, auth(req).member.campus_id],
      );
      if (current.rows[0]?.role !== "owner")
        throw new HttpError(403, "Campus owner access required.");
      if (!(await verifyPassword(v.password, current.rows[0].password_hash)))
        throw new HttpError(401, "Your password is incorrect.");
      const next = await db.query(
        "SELECT u.name,u.email,u.verified,m.role FROM users u JOIN memberships m ON m.user_id=u.id WHERE u.id=$1 AND m.campus_id=$2 FOR UPDATE OF m",
        [v.memberId, auth(req).member.campus_id],
      );
      if (
        !next.rowCount ||
        !next.rows[0].verified ||
        next.rows[0].role !== "staff"
      )
        throw new HttpError(
          400,
          "Choose a verified staff member of this campus.",
        );
      await db.query(
        "UPDATE memberships SET role='staff' WHERE user_id=$1 AND campus_id=$2",
        [auth(req).user.id, auth(req).member.campus_id],
      );
      await db.query(
        "UPDATE memberships SET role='owner' WHERE user_id=$1 AND campus_id=$2",
        [v.memberId, auth(req).member.campus_id],
      );
      await audit(db, req, "campus.owner_transferred", v.memberId, {
        title: next.rows[0].name,
      });
      await enqueueMail(
        db,
        next.rows[0].email,
        "SafelyGo campus ownership transferred",
        `${auth(req).user.name} transferred ownership of ${campus.rows[0].name} to you. You can now manage campus settings and staff access.`,
      );
    });
    res.json({ message: "Ownership transferred." });
  }),
);
app.post(
  base + "/rotate-code",
  route(async (req, res) => {
    owner(req);
    const value = token().slice(0, 16);
    await transaction(async (db) => {
      await db.query("UPDATE campuses SET join_code=$1 WHERE id=$2", [
        value,
        auth(req).member.campus_id,
      ]);
      await audit(
        db,
        req,
        "campus.invitation_rotated",
        auth(req).member.campus_id,
      );
    });
    res.json({ joinCode: value });
  }),
);
app.get(
  base + "/reports",
  route(async (req, res) => {
    const mine = req.query.mine === "true";
    const isStaff = ["staff", "owner"].includes(auth(req).member.role);
    const result = await pool.query(
      `SELECT id,campus_id,category,severity,latitude,longitude,status,created_at,updated_at,CASE WHEN $2 OR author_id=$3 THEN title ELSE public_summary END AS title,CASE WHEN $2 OR author_id=$3 THEN description ELSE public_summary END AS description,CASE WHEN $2 OR author_id=$3 THEN author_id ELSE NULL END AS author_id,public_summary,CASE WHEN $2 THEN staff_note ELSE NULL END AS staff_note FROM reports WHERE campus_id=$1 AND ($2 OR author_id=$3 OR public_summary IS NOT NULL) AND (NOT $4 OR author_id=$3) ORDER BY created_at DESC,id DESC LIMIT 200 OFFSET $5`,
      [
        auth(req).member.campus_id,
        isStaff,
        auth(req).user.id,
        mine,
        pageOffset(req),
      ],
    );
    res.json(result.rows);
  }),
);
app.post(
  base + "/reports",
  route(async (req, res) => {
    active(req);
    const v = reportInput.parse(req.body);
    const c = (
      await pool.query(
        "SELECT latitude,longitude,radius_m FROM campuses WHERE id=$1",
        [auth(req).member.campus_id],
      )
    ).rows[0];
    const rad = Math.PI / 180;
    const dlat = (v.latitude - c.latitude) * rad;
    const dlng = (v.longitude - c.longitude) * rad;
    const h =
      Math.sin(dlat / 2) ** 2 +
      Math.cos(c.latitude * rad) *
        Math.cos(v.latitude * rad) *
        Math.sin(dlng / 2) ** 2;
    const distance = 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    if (distance > c.radius_m + 1000)
      throw new HttpError(400, "Place the report on or near your campus.");
    const r = await pool.query(
      "INSERT INTO reports(id,campus_id,author_id,title,description,category,severity,latitude,longitude,client_request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(campus_id,author_id,client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING RETURNING *",
      [
        randomUUID(),
        auth(req).member.campus_id,
        auth(req).user.id,
        v.title,
        v.description,
        v.category,
        v.severity,
        v.latitude,
        v.longitude,
        v.requestId || null,
      ],
    );
    if (r.rowCount) {
      res.status(201).json(r.rows[0]);
      return;
    }
    const prior = (await pool.query(
      "SELECT * FROM reports WHERE campus_id=$1 AND author_id=$2 AND client_request_id=$3",
      [auth(req).member.campus_id, auth(req).user.id, v.requestId],
    )).rows[0];
    if (!prior) throw new HttpError(409, "Report receipt could not be checked. Reconnect and open your reports before trying again.");
    if (["title", "description", "category", "severity", "latitude", "longitude"].some((key) => prior[key] !== v[key as keyof typeof v]))
      throw new HttpError(409, "This report was already received with different details. Save and close to view the report we received.");
    res.status(200).json(prior);
  }),
);
app.patch(
  base + "/reports/:id",
  route(async (req, res) => {
    staff(req);
    active(req);
    const v = z
      .object({
        status: z.enum(["submitted", "reviewing", "resolved", "dismissed"]),
        publicSummary: z.string().trim().max(500).nullable(),
        staffNote: z.string().trim().max(2000),
      })
      .parse(req.body);
    const target = idParam(req);
    await transaction(async (db) => {
      const previous = await db.query(
        "SELECT title,status,public_summary,staff_note FROM reports WHERE id=$1 AND campus_id=$2 FOR UPDATE",
        [target, auth(req).member.campus_id],
      );
      if (!previous.rowCount) throw new HttpError(404, "Report not found.");
      const r = await db.query(
        "UPDATE reports SET status=$1,public_summary=$2,staff_note=$3,updated_at=now() WHERE id=$4 AND campus_id=$5 RETURNING id",
        [
          v.status,
          v.publicSummary || null,
          v.staffNote,
          target,
          auth(req).member.campus_id,
        ],
      );
      if (!r.rowCount) throw new HttpError(404, "Report not found.");
      const before = previous.rows[0];
      const changes: Record<string, unknown> = {};
      if (before.status !== v.status)
        changes.status = { from: before.status, to: v.status };
      if (before.public_summary !== (v.publicSummary || null))
        changes.public_summary = {
          from: before.public_summary,
          to: v.publicSummary || null,
        };
      if (before.staff_note !== v.staffNote)
        changes.staff_note = { from: before.staff_note, to: v.staffNote };
      await audit(db, req, "report.updated", target, {
        title: before.title,
        changes,
      });
    });
    res.json({ message: "Report updated." });
  }),
);
app.get(
  base + "/directory",
  route(async (req, res) => {
    const r = await pool.query(
      "SELECT * FROM emergency_contacts WHERE campus_id=$1 ORDER BY priority,name",
      [auth(req).member.campus_id],
    );
    res.json(r.rows);
  }),
);
app.post(
  base + "/directory",
  route(async (req, res) => {
    staff(req);
    const v = contactInput.parse(req.body);
    const result = await transaction(async (db) => {
      const r = await db.query(
        "INSERT INTO emergency_contacts(id,campus_id,name,phone,description,priority) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [
          randomUUID(),
          auth(req).member.campus_id,
          v.name,
          v.phone,
          v.description,
          v.priority,
        ],
      );
      await audit(db, req, "directory.created", r.rows[0].id, {
        title: v.name,
      });
      return r.rows[0];
    });
    res.status(201).json(result);
  }),
);
app.patch(
  base + "/directory/:id",
  route(async (req, res) => {
    staff(req);
    const v = contactInput.parse(req.body);
    const target = idParam(req);
    await transaction(async (db) => {
      const r = await db.query(
        "UPDATE emergency_contacts SET name=$1,phone=$2,description=$3,priority=$4 WHERE id=$5 AND campus_id=$6",
        [
          v.name,
          v.phone,
          v.description,
          v.priority,
          target,
          auth(req).member.campus_id,
        ],
      );
      if (!r.rowCount) throw new HttpError(404, "Contact not found.");
      await audit(db, req, "directory.updated", target, { title: v.name });
    });
    res.json({ message: "Contact updated." });
  }),
);
app.delete(
  base + "/directory/:id",
  route(async (req, res) => {
    staff(req);
    const target = idParam(req);
    await transaction(async (db) => {
      const r = await db.query(
        "DELETE FROM emergency_contacts WHERE id=$1 AND campus_id=$2 RETURNING name",
        [target, auth(req).member.campus_id],
      );
      if (!r.rowCount) throw new HttpError(404, "Contact not found.");
      await audit(db, req, "directory.deleted", target, {
        title: r.rows[0].name,
      });
    });
    res.status(204).end();
  }),
);
app.get(
  base + "/alerts",
  route(async (req, res) => {
    res.json(
      (
        await pool.query(
          "SELECT * FROM alerts WHERE campus_id=$1 AND expires_at>now() ORDER BY created_at DESC LIMIT 50",
          [auth(req).member.campus_id],
        )
      ).rows,
    );
  }),
);
app.post(
  base + "/alerts",
  route(async (req, res) => {
    staff(req);
    active(req);
    const v = z
      .object({
        title: text(120),
        body: text(1500),
        hours: z.number().int().min(1).max(168),
      })
      .parse(req.body);
    const target = randomUUID();
    await transaction(async (db) => {
      await db.query(
        "INSERT INTO alerts(id,campus_id,title,body,expires_at) VALUES($1,$2,$3,$4,now()+$5*interval '1 hour')",
        [target, auth(req).member.campus_id, v.title, v.body, v.hours],
      );
      await audit(db, req, "alert.created", target, { title: v.title });
    });
    res.status(201).json({ id: target });
  }),
);
app.delete(
  base + "/alerts/:id",
  route(async (req, res) => {
    staff(req);
    const target = idParam(req);
    await transaction(async (db) => {
      const r = await db.query(
        "DELETE FROM alerts WHERE id=$1 AND campus_id=$2 RETURNING title",
        [target, auth(req).member.campus_id],
      );
      if (!r.rowCount) throw new HttpError(404, "Alert not found.");
      await audit(db, req, "alert.deleted", target, { title: r.rows[0].title });
    });
    res.status(204).end();
  }),
);
app.get(
  base + "/members",
  route(async (req, res) => {
    staff(req);
    res.json(
      (
        await pool.query(
          "SELECT u.id,u.name,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.campus_id=$1 ORDER BY u.name,u.id LIMIT 500 OFFSET $2",
          [auth(req).member.campus_id, pageOffset(req)],
        )
      ).rows,
    );
  }),
);
app.patch(
  base + "/members/:id",
  route(async (req, res) => {
    owner(req);
    active(req);
    const v = z.object({ role: z.enum(["student", "staff"]) }).parse(req.body);
    const target = idParam(req);
    await transaction(async (db) => {
      const r = await db.query(
        "UPDATE memberships SET role=$1 WHERE user_id=$2 AND campus_id=$3 AND role<>'owner'",
        [v.role, target, auth(req).member.campus_id],
      );
      if (!r.rowCount)
        throw new HttpError(
          404,
          "Member not found, or owner role is protected.",
        );
      const person = await db.query("SELECT name FROM users WHERE id=$1", [
        target,
      ]);
      await audit(db, req, "member." + v.role, target, {
        title: person.rows[0].name,
      });
    });
    res.json({ message: "Role updated." });
  }),
);
app.delete(
  base + "/members/:id",
  route(async (req, res) => {
    owner(req);
    const target = idParam(req);
    await transaction(async (db) => {
      const r = await db.query(
        "DELETE FROM memberships WHERE user_id=$1 AND campus_id=$2 AND role<>'owner'",
        [target, auth(req).member.campus_id],
      );
      if (!r.rowCount)
        throw new HttpError(
          404,
          "Member not found, or owner role is protected.",
        );
      const person = await db.query("SELECT name FROM users WHERE id=$1", [
        target,
      ]);
      await audit(db, req, "member.removed", target, {
        title: person.rows[0].name,
      });
    });
    res.status(204).end();
  }),
);
app.get(
  base + "/audit",
  route(async (req, res) => {
    staff(req);
    res.json(
      (
        await pool.query(
          "SELECT a.*,u.name AS actor_name FROM audit a LEFT JOIN users u ON u.id=a.actor_id WHERE a.campus_id=$1 ORDER BY a.created_at DESC,a.id DESC LIMIT 100 OFFSET $2",
          [auth(req).member.campus_id, pageOffset(req)],
        )
      ).rows,
    );
  }),
);
const placeCache = new Map<
  string,
  {
    expires: number;
    results: { name: string; latitude: number; longitude: number }[];
  }
>();
app.get(
  "/api/places",
  route(async (req, res) => {
    const query = z.string().trim().min(3).max(160).parse(req.query.q);
    const provider = process.env.GEOCODER_SEARCH_URL;
    if (!provider)
      throw new HttpError(
        503,
        "Search is unavailable. Choose your campus on the map or use your location while on campus.",
      );
    const cached = placeCache.get(query.toLowerCase());
    if (cached && cached.expires > Date.now()) {
      res.json(cached.results);
      return;
    }
    await countLimit(req, "place-search", 15, 60);
    const url = new URL(provider);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    let response: globalThis.Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "SafelyGo/1.0 Campus setup",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new HttpError(
        503,
        "Campus search could not connect. Try again or choose the location on the map.",
      );
    }
    if (!response.ok)
      throw new HttpError(
        503,
        "Campus search is temporarily unavailable. You can choose the location on the map.",
      );
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new HttpError(
        503,
        "Campus search returned an unreadable response. Choose the location on the map.",
      );
    }
    const places = z
      .array(
        z.object({
          display_name: z.string().max(1000),
          lat: z.coerce.number().min(-90).max(90),
          lon: z.coerce.number().min(-180).max(180),
        }),
      )
      .max(20)
      .safeParse(body);
    if (!places.success)
      throw new HttpError(
        503,
        "Campus search returned an unreadable response. Choose the location on the map.",
      );
    const results = places.data.slice(0, 5).map((p) => ({
      name: p.display_name,
      latitude: p.lat,
      longitude: p.lon,
    }));
    if (placeCache.size > 100) placeCache.clear();
    placeCache.set(query.toLowerCase(), {
      results,
      expires: Date.now() + 86400000,
    });
    res.json(results);
  }),
);
function isPlatformOperator(req: Request) {
  return (
    auth(req).user.verified &&
    (process.env.PLATFORM_OPERATOR_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .includes(auth(req).user.email)
  );
}
function requirePlatformOperator(req: Request) {
  if (!isPlatformOperator(req))
    throw new HttpError(403, "Platform operator access required.");
}
app.get(
  "/api/platform/campuses",
  route(async (req, res) => {
    requirePlatformOperator(req);
    const status = z
      .enum(["pending", "active", "suspended", "all"])
      .parse(req.query.status || "pending");
    const rows = await pool.query(
      `SELECT c.*,u.name AS owner_name,u.email AS owner_email,u.verified AS owner_verified FROM campuses c JOIN memberships m ON m.campus_id=c.id AND m.role='owner' JOIN users u ON u.id=m.user_id WHERE ($1='all' OR c.status=$1) ORDER BY c.created_at LIMIT 100 OFFSET $2`,
      [status, pageOffset(req)],
    );
    res.json(rows.rows);
  }),
);
app.post(
  "/api/platform/campuses/:id/review",
  route(async (req, res) => {
    requirePlatformOperator(req);
    const input = z
      .object({
        action: z.enum(["approve", "suspend", "reactivate"]),
        reason: z.string().trim().min(10).max(1000),
        authorityConfirmed: z.boolean(),
      })
      .parse(req.body);
    if (input.action !== "suspend" && !input.authorityConfirmed)
      throw new HttpError(
        400,
        "Confirm institutional authority before activation.",
      );
    await reviewCampus({
      id: idParam(req),
      action: input.action,
      reason: input.reason,
      operator: auth(req).user.name,
      actorId: auth(req).user.id,
    });
    res.json({ message: "Campus review saved and owner notification queued." });
  }),
);
app.get(
  "/api/platform-info",
  route(async (_req, res) => {
    res.json({
      isOperator: isPlatformOperator(_req),
      supportEmail: process.env.PLATFORM_SUPPORT_EMAIL || "",
      approvalSteps: [
        "Registration received",
        "Institutional authority review",
        "Activation decision by email",
      ],
    });
  }),
);
app.get(
  "/api/contacts",
  route(async (req, res) => {
    await transaction(async (db) => {
      const pending = await db.query(
        "SELECT * FROM contact_invitations WHERE recipient_email=$1 AND expires_at>now() FOR UPDATE",
        [auth(req).user.email],
      );
      for (const invite of pending.rows) {
        if (invite.requester_id !== auth(req).user.id)
          await db.query(
            "INSERT INTO contacts(id,requester_id,recipient_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [invite.id, invite.requester_id, auth(req).user.id],
          );
        await db.query("DELETE FROM contact_invitations WHERE id=$1", [
          invite.id,
        ]);
      }
    });
    const r = await pool.query(
      `SELECT c.*,u.id AS other_id,u.name AS other_name,u.email AS other_email FROM contacts c JOIN users u ON u.id=CASE WHEN c.requester_id=$1 THEN c.recipient_id ELSE c.requester_id END WHERE c.requester_id=$1 OR c.recipient_id=$1 ORDER BY c.created_at DESC`,
      [auth(req).user.id],
    );
    const waiting = await pool.query(
      "SELECT id,requester_id,NULL::uuid AS recipient_id,'pending' AS status,NULL::uuid AS other_id,recipient_email AS other_name,recipient_email AS other_email FROM contact_invitations WHERE requester_id=$1 AND expires_at>now() ORDER BY created_at DESC",
      [auth(req).user.id],
    );
    res.json([...r.rows, ...waiting.rows]);
  }),
);
app.post(
  "/api/contacts",
  route(async (req, res) => {
    const v = z.object({ email }).parse(req.body);
    const result = await transaction(async (db) => {
      const r = await db.query(
        "SELECT id,email,name FROM users WHERE email=$1 AND verified=true",
        [v.email],
      );
      if (v.email === auth(req).user.email)
        throw new HttpError(400, "Choose someone else's email address.");
      const target = randomUUID();
      if (!r.rowCount) {
        const invitation = await db.query(
          "INSERT INTO contact_invitations(id,requester_id,recipient_email) VALUES($1,$2,$3) ON CONFLICT(requester_id,recipient_email) DO UPDATE SET expires_at=now()+interval '14 days' RETURNING id",
          [target, auth(req).user.id, v.email],
        );
        await enqueueMail(
          db,
          v.email,
          "SafelyGo trusted contact invitation",
          `${auth(req).user.name} invited you to SafelyGo. ${process.env.PUBLIC_APP_URL ? "Open " + process.env.PUBLIC_APP_URL.replace(/\/$/, "") + "/walk. " : ""}Create an account using this email address and verify it. Open Walk to accept the invitation. A campus membership is not needed to receive a shared walk. This invitation expires in 14 days. Accepting does not start location sharing.`,
        );
        return invitation.rows[0].id;
      }
      await db.query(
        "INSERT INTO contacts(id,requester_id,recipient_id) VALUES($1,$2,$3)",
        [target, auth(req).user.id, r.rows[0].id],
      );
      await enqueueMail(
        db,
        v.email,
        "SafelyGo trusted contact invitation",
        `${auth(req).user.name} invited you to be a trusted contact. Open SafelyGo and accept in the Walk tab. Accepting lets you choose to share your location with each other; it does not start sharing.`,
      );
      return target;
    });
    res.status(201).json({ id: result });
  }),
);
app.post(
  "/api/contacts/:id/accept",
  route(async (req, res) => {
    const r = await pool.query(
      "UPDATE contacts SET status='accepted' WHERE id=$1 AND recipient_id=$2",
      [idParam(req), auth(req).user.id],
    );
    if (!r.rowCount) throw new HttpError(404, "Invitation not found.");
    res.json({ message: "Trusted contact accepted." });
  }),
);
app.delete(
  "/api/contacts/:id",
  route(async (req, res) => {
    const target = idParam(req);
    await transaction(async (db) => {
      const invitation = await db.query(
        "DELETE FROM contact_invitations WHERE id=$1 AND requester_id=$2 RETURNING id",
        [idParam(req), auth(req).user.id],
      );
      if (invitation.rowCount) return;
      const r = await db.query(
        "DELETE FROM contacts WHERE id=$1 AND (requester_id=$2 OR recipient_id=$2) RETURNING requester_id,recipient_id",
        [target, auth(req).user.id],
      );
      if (!r.rowCount) throw new HttpError(404, "Contact not found.");
      const c = r.rows[0];
      await db.query(
        "DELETE FROM sharing_recipients r USING sharing_sessions s WHERE r.session_id=s.id AND ((s.owner_id=$1 AND r.user_id=$2) OR (s.owner_id=$2 AND r.user_id=$1))",
        [c.requester_id, c.recipient_id],
      );
    });
    res.status(204).end();
  }),
);
app.get(
  "/api/sharing",
  route(async (req, res) => {
    const mine = await pool.query(
      "SELECT s.*,COALESCE((SELECT json_agg(r.user_id) FROM sharing_recipients r WHERE r.session_id=s.id),'[]') AS recipients FROM sharing_sessions s WHERE owner_id=$1 AND expires_at>now() AND stopped_at IS NULL ORDER BY created_at DESC",
      [auth(req).user.id],
    );
    const incoming = await pool.query(
      "SELECT s.*,u.name AS owner_name FROM sharing_sessions s JOIN sharing_recipients r ON r.session_id=s.id JOIN users u ON u.id=s.owner_id WHERE r.user_id=$1 AND s.expires_at>now() AND s.stopped_at IS NULL",
      [auth(req).user.id],
    );
    res.json({ mine: mine.rows, incoming: incoming.rows });
  }),
);
app.post(
  "/api/sharing",
  route(async (req, res) => {
    const v = z
      .object({
        recipientIds: z.array(uuid).min(1).max(20),
        minutes: z.number().int().min(5).max(120),
      })
      .parse(req.body);
    const ids = [...new Set(v.recipientIds)];
    const result = await transaction(async (db) => {
      await db.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        auth(req).user.id,
      ]);
      for (const id of ids) {
        const r = await db.query(
          "SELECT id FROM contacts WHERE status='accepted' AND ((requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)) FOR SHARE",
          [auth(req).user.id, id],
        );
        if (!r.rowCount)
          throw new HttpError(
            403,
            "Only accepted trusted contacts can receive your location.",
          );
      }
      await db.query("DELETE FROM sharing_sessions WHERE owner_id=$1", [
        auth(req).user.id,
      ]);
      const r = await db.query(
        "INSERT INTO sharing_sessions(id,owner_id,expires_at) VALUES($1,$2,now()+$3*interval '1 minute') RETURNING *",
        [randomUUID(), auth(req).user.id, v.minutes],
      );
      for (const id of ids)
        await db.query(
          "INSERT INTO sharing_recipients(session_id,user_id) VALUES($1,$2)",
          [r.rows[0].id, id],
        );
      return r.rows[0];
    });
    res.status(201).json(result);
  }),
);
app.put(
  "/api/sharing/:id/location",
  route(async (req, res) => {
    const v = z
      .object({
        latitude: lat,
        longitude: lng,
        accuracy: z.number().min(0).max(100000).nullable().optional(),
      })
      .parse(req.body);
    const r = await pool.query(
      "UPDATE sharing_sessions SET latitude=$1,longitude=$2,accuracy=$3,updated_at=now() WHERE id=$4 AND owner_id=$5 AND expires_at>now() AND stopped_at IS NULL",
      [v.latitude, v.longitude, v.accuracy, idParam(req), auth(req).user.id],
    );
    if (!r.rowCount) throw new HttpError(410, "Sharing ended.");
    res.json({ message: "Location updated." });
  }),
);
app.delete(
  "/api/sharing/:id",
  route(async (req, res) => {
    const r = await pool.query(
      "DELETE FROM sharing_sessions WHERE id=$1 AND owner_id=$2",
      [idParam(req), auth(req).user.id],
    );
    if (!r.rowCount) throw new HttpError(404, "Sharing session not found.");
    res.status(204).end();
  }),
);
app.use((_req, _res, next) => next(new HttpError(404, "Endpoint not found.")));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError)
    return res.status(400).json({
      error: "Check the highlighted information and try again.",
      fields: Object.fromEntries(
        err.issues.map((i) => {
          const field = String(i.path[0] || "information");
          const guidance: Record<string, string> = {
            email: "Enter a valid email address.",
            password: "Use a password with 12 to 128 characters.",
            name: "Enter a name within the allowed length.",
            domain: "Enter the campus website domain, such as school.edu.",
            website: "Enter the official website starting with https://.",
            latitude: "Choose a valid campus location.",
            longitude: "Choose a valid campus location.",
            radiusM: "Choose a campus boundary between 100 m and 20 km.",
            phone: "Enter a valid telephone number.",
            code: "Enter the 8-digit code from your email.",
            emergencyPhone: "Enter a valid emergency telephone number.",
            supportEmail: "Enter a valid support email address.",
          };
          return [field, guidance[field] || "Check this value and its length."];
        }),
      ),
    });
  if (err instanceof HttpError)
    return res.status(err.status).json({ error: err.message });
  if ((err as { code?: string })?.code === "23505")
    return res
      .status(409)
      .json({ error: "This account or connection already exists." });
  if ((err as { type?: string })?.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON." });
  console.error(
    "Request failed",
    err instanceof Error ? err.message : "Unknown error",
  );
  res.status(500).json({ error: "Something went wrong. Please try again." });
});
