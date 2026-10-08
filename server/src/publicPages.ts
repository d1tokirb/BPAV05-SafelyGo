import type { Express } from "express";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function registerPublicPages(app: Express) {
  for (const kind of ["privacy", "support"] as const) {
    app.get("/" + kind, (_req, res) => {
      const operator = escape(
        process.env.PLATFORM_OPERATOR_NAME ||
          "SafelyGo operator (not configured)",
      );
      const address = process.env.PLATFORM_SUPPORT_EMAIL || "";
      const contact = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(address)
        ? `<a href="mailto:${escape(address)}">${escape(address)}</a>`
        : `<a href="https://github.com/d1tokirb/BPAV05-SafelyGo/issues">Technical support on GitHub</a>. Issues are public: do not include personal information, passwords or verification codes. A private privacy-request channel has not been configured; account deletion is available in the app.`;
      const privateSupport = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(
        address,
      );
      const content =
        kind === "privacy"
          ? `
        <p>Effective October 7, 2026. Operated by ${operator}. Contact: ${contact}.</p>
        <h2>Information we use</h2><p>SafelyGo stores your name, regular email address, password hash, campus memberships, trusted-contact invitations, reports and campus administration records. We use these to authenticate accounts, deliver verification and recovery emails, manage campuses and provide the features you request.</p>
        <h2>Location and visibility</h2><p>Reports include the location you submit. Full report details are available to the author and authorized campus staff. Staff may publish a separate public summary. During an active walk, your latest location and accuracy are stored and available to the recipients you selected. We do not maintain a walk route history. Optional background location updates apply only to an active time-limited sharing session. You can stop sharing, remove contacts or revoke location permissions.</p>
        <h2>Service providers</h2><p>The operator uses hosting/database, transactional email and map services to deliver the app. Email providers receive recipient addresses and message contents, including verification codes. Map providers receive map requests and the map area being viewed. Campus search may use a configured geocoding provider. These providers process information under their own service terms. SafelyGo does not include advertising or advertising trackers.</p>
        <h2>Retention and deletion</h2><p>Expired authentication records and stopped or expired sharing records are periodically removed. Undelivered email jobs are removed after one day. Report drafts remain on your device until sent or discarded. You can delete your account in Account. Owners must transfer campus ownership first. Deletion removes the account, memberships, contacts and sharing records and clears queued messages to your address. Reports and audit records may remain with the author reference removed; report text can still contain information you entered. Campus operational records have no automatic retention deadline in the current service. Backup copies follow the hosting operator's backup lifecycle.</p>
        <h2>Your requests</h2><p>${privateSupport ? `Contact ${contact} to request access, correction or deletion assistance, including removal of identifying information you entered in a retained report.` : "Manage your profile and delete your account in Account. Use account recovery if you cannot sign in. Public GitHub issues are for technical problems only; do not submit private information there. A private privacy-request channel is not currently available."} Your campus manages its reports and staff records. SafelyGo is not an emergency dispatch service.</p>`
          : `
        <p>Operated by ${operator}. Contact support: ${contact}.</p>
        <h2>Get help</h2><p>${privateSupport ? "For private account or privacy help, email support from your account address. Include your campus name, device model and a description." : "For technical issues, post your device model and a description on GitHub. Do not post your account email, report contents, location or other personal information. Private account and privacy requests cannot be handled through public issues."} Never send your password or verification code. Support is not monitored for emergencies. For immediate danger, call your local emergency number or the campus contacts listed in Help.</p>
        <h2>Delete your account</h2><p>Sign in and open Account → Delete account. If you own a campus, transfer ownership first. ${privateSupport ? "If you cannot sign in, contact support from your account email to request deletion; identity must be verified." : "If you cannot sign in, use Recover your account on the sign-in screen, then delete your account in Account. If you cannot access that email, a private assistance channel is not currently available."} Account deletion removes account access and sharing records. Reports may remain with the author reference removed, and identifying report text may require a separate removal request.</p>
        <h2>Campus registration</h2><p>Register your campus in the app. The operator reviews institutional authority before activating it. Regular email addresses are supported. Contact support for pending registration or staff access issues.</p>`;
      res
        .type("html")
        .send(
          `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SafelyGo ${kind}</title><style>body{margin:0;background:#f4f7fc;color:#18243b;font:16px/1.65 system-ui}main{max-width:720px;margin:auto;padding:32px 22px}h1{font-size:32px}h2{font-size:21px;margin-top:30px}a{color:#285cc4}nav{display:flex;gap:24px}p{overflow-wrap:anywhere}</style></head><body><main><nav><a href="/privacy">Privacy</a><a href="/support">Support</a></nav><h1>SafelyGo ${kind === "privacy" ? "privacy notice" : "support"}</h1>${content}</main></body></html>`,
        );
    });
  }
}
