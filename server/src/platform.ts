import { transaction } from "./db.js";
import { enqueueMail } from "./mail.js";
import { HttpError } from "./security.js";
export type CampusReviewAction =
  "approve" | "suspend" | "reactivate" | "transfer";
export async function reviewCampus({
  id,
  action,
  target,
  operator,
  reason,
  actorId,
}: {
  id: string;
  action: CampusReviewAction;
  target?: string;
  operator: string;
  reason: string;
  actorId?: string;
}) {
  await transaction(async (db) => {
    const result = await db.query(
      `SELECT c.id,c.name,c.domain,c.status,u.id AS owner_id,u.email AS owner_email,u.verified
           FROM campuses c JOIN memberships m ON m.campus_id=c.id AND m.role='owner'
           JOIN users u ON u.id=m.user_id WHERE c.id=$1 FOR UPDATE OF c`,
      [id],
    );
    if (!result.rowCount)
      throw new HttpError(400, "Campus or owner not found.");
    const campus = result.rows[0];
    let auditTarget = id;
    if (action === "transfer") {
      if (!target) throw new HttpError(400, "Choose a successor.");
      const member = await db.query(
        "SELECT u.id,u.email,u.verified FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.campus_id=$1 AND u.id=$2 FOR UPDATE OF u,m",
        [id, target],
      );
      if (
        !member.rowCount ||
        !member.rows[0].verified
      )
        throw new HttpError(
          400,
          "New owner must be a verified existing member of this campus.",
        );
      if (campus.owner_id === target)
        throw new HttpError(400, "This member is already the owner.");
      await db.query(
        "UPDATE memberships SET role='staff' WHERE campus_id=$1 AND role='owner'",
        [id],
      );
      await db.query(
        "UPDATE memberships SET role='owner' WHERE campus_id=$1 AND user_id=$2",
        [id, target],
      );
      auditTarget = target;
      await enqueueMail(
        db,
        member.rows[0].email,
        "SafelyGo campus ownership transferred",
        `You are now the owner of ${campus.name}. Open SafelyGo to manage campus staff and settings.`,
      );
      await enqueueMail(
        db,
        campus.owner_email,
        "SafelyGo campus ownership transferred",
        `Ownership of ${campus.name} has been transferred. Your campus role is now staff. Contact platform support if this was unexpected.`,
      );
    } else {
      const expected =
        action === "approve"
          ? "pending"
          : action === "suspend"
            ? "active"
            : "suspended";
      if (campus.status !== expected)
        throw new HttpError(
          400,
          `${action} requires status ${expected}; this campus is ${campus.status}.`,
        );
      if (
        action !== "suspend" &&
        !campus.verified
      )
        throw new HttpError(
          400,
          "Owner must have a verified email address.",
        );
      const status = action === "suspend" ? "suspended" : "active";
      await db.query("UPDATE campuses SET status=$1 WHERE id=$2", [status, id]);
      await enqueueMail(
        db,
        campus.owner_email,
        "SafelyGo campus " + status,
        status === "active"
          ? `${campus.name} is now active. Students can find it in SafelyGo. Open Staff > Settings to get your invitation code and share it through your school's usual channels.`
          : `${campus.name} has been suspended. Campus access is paused. Contact platform support for the review process.`,
      );
    }
    await db.query(
      "INSERT INTO audit(campus_id,action,target_id,operator_name,review_note,actor_id) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        "platform." + action,
        auditTarget,
        operator,
        reason,
        actorId || null,
      ],
    );
  });
}
