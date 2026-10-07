import { randomUUID } from "node:crypto";
import { pool, transaction } from "./db.js";
import { migrate } from "./migrate.js";
import { hashPassword } from "./security.js";
if (process.env.NODE_ENV === "production" || process.env.DEMO_SEED !== "true")
  throw new Error(
    "Demo seed is disabled. Use DEMO_SEED=true only with a local development database.",
  );
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12)
  throw new Error("Set a DEMO_PASSWORD of at least 12 characters.");
await migrate();
const hash = await hashPassword(password);
await transaction(async (db) => {
  if (
    (
      await db.query(
        "SELECT 1 FROM users WHERE email='jordan.rivera@example.com'",
      )
    ).rowCount
  )
    throw new Error("Demo already exists.");
  const campusId = randomUUID();
  const owner = randomUUID();
  const student = randomUUID();
  const friend = randomUUID();
  for (const [id, name, email] of [
    [owner, "Jordan Rivera", "jordan.rivera@example.com"],
    [student, "Alex Morgan", "alex.morgan@example.com"],
    [friend, "Taylor Chen", "taylor.chen@example.com"],
  ])
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,verified) VALUES($1,$2,$3,$4,true)",
      [id, name, email, hash],
    );
  await db.query(
    "INSERT INTO campuses(id,name,domain,website,latitude,longitude,radius_m,status,join_code) VALUES($1,'Riverside Demo Campus','example.org','https://example.org',40.7295,-73.9965,1500,'active','LOCAL-DEMO-ONLY')",
    [campusId],
  );
  for (const [id, role] of [
    [owner, "owner"],
    [student, "student"],
    [friend, "student"],
  ])
    await db.query(
      "INSERT INTO memberships(user_id,campus_id,role) VALUES($1,$2,$3)",
      [id, campusId, role],
    );
  await db.query(
    "INSERT INTO reports(id,campus_id,author_id,title,description,category,severity,latitude,longitude,status,public_summary) VALUES($1,$2,$3,'Path lighting needs repair','A lamp near the west library path is flickering.','lighting','medium',40.7302,-73.998,'reviewing','Lighting repair requested on the west library path.')",
    [randomUUID(), campusId, student],
  );
  await db.query(
    "INSERT INTO reports(id,campus_id,author_id,title,description,category,severity,latitude,longitude,status,public_summary) VALUES($1,$2,$3,'Uneven pavement','Raised pavement near the courtyard.','hazard','low',40.7288,-73.995,'submitted','Uneven pavement near the courtyard. Use the east walkway.')",
    [randomUUID(), campusId, student],
  );
  await db.query(
    "INSERT INTO emergency_contacts(id,campus_id,name,phone,description,priority) VALUES($1,$2,'Demo campus safety','+1 212 555 0100','Fictional demo number. Do not use for emergencies.',1)",
    [randomUUID(), campusId],
  );
  await db.query(
    "INSERT INTO contacts(id,requester_id,recipient_id,status) VALUES($1,$2,$3,'accepted')",
    [randomUUID(), student, friend],
  );
  await db.query(
    "INSERT INTO alerts(id,campus_id,title,body,expires_at) VALUES($1,$2,'Welcome to the demo campus','Sample content for testing. This campus is fictional.',now()+interval '7 days')",
    [randomUUID(), campusId],
  );
});
console.log(
  "Fictional demo campus created. Accounts: jordan.rivera@example.com, alex.morgan@example.com, taylor.chen@example.com. Password is the DEMO_PASSWORD you supplied.",
);
await pool.end();
