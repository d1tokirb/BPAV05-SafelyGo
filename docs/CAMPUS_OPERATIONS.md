# Campus registration and operator workflow

This is the supported administration process for SafelyGo. Campus owners manage their own institution in the app. Platform operators approve campuses, suspend access, reactivate reviewed campuses, and transfer ownership through the trusted server command. There is no public platform-admin endpoint or approval button in the student app.

## Responsibilities and access

Assign a primary operator and a backup before onboarding real schools. Give them access to the API service's trusted shell and the intended database through your deployment's access controls. A campus owner's in-app role does not grant platform approval authority. `--operator` is a human audit label, not a password or an authorization mechanism; database/server access is the actual authorization boundary.

Use the API service shell configured with the correct DATABASE_URL. Never paste database credentials into the app or review notes. Read-only `list` and `show` display campus and owner contact information; keep their output internal.

Local source commands below run from `server/`. The production image contains compiled code: replace `npm run campus --` with `node dist/operator.js`. Commands automatically apply versioned migrations.

## 1. Receive and inspect a pending registration

The applicant creates and verifies their regular email address, then registers the campus. SafelyGo gives them the owner role and status `pending`. They can prepare map settings and emergency contacts; students cannot find or join the campus yet.

```sh
npm run campus -- list pending
npm run campus -- show CAMPUS_UUID
```

`show` includes owner identity and verification, domain, official website, map coordinates and radius, member/contact counts, and the last 20 platform decisions. It deliberately does not print the campus invitation code.

## 2. Verify authority and record a review

Create an internal review ticket with the campus ID. Check the official institution website independently, confirm its official website and campus location, and check for duplicate registrations. Contact the institution through a contact published on its official website to confirm the applicant's authority to represent it. Possession of a school email address alone is insufficient.

Ask the owner to prepare accurate support numbers and map boundaries. Check those against information supplied by the institution. Do not approve a fictional demo campus for public use. If information is missing or authority is not confirmed, leave the campus pending and record the follow-up in your ticket; pending campuses remain unavailable to students. A formal rejected status is not implemented.

Store a short decision summary and review ticket reference in `--reason`. Keep sensitive evidence and personal documents in the controlled review system, not in the reason: campus staff can read their campus audit entries. Review notes must contain at least 10 characters.

## 3. Approve and verify the result

```sh
npm run campus -- approve CAMPUS_UUID --operator "Operator name" --reason "REVIEW-123: institution confirmed the applicant's authority and campus details"
npm run campus -- show CAMPUS_UUID
```

Approval only accepts a pending campus with a verified owner email matching the exact campus domain. The status change, reviewer/reason audit entry, and owner notification are committed together. The owner receives an email explaining that students can join and where to get the invitation code. Email is queued through the normal outbox; the CLI success message means queued, not delivered.

Confirm `show` reports `active` and the expected audit entry. Confirm the campus appears in a verified student's search. The owner opens Staff > Settings, obtains the invitation code, and distributes it through the institution's normal channels. A student must have a verified email from the exact registered domain and the invitation code. Student subdomains or additional domains are not currently supported by one campus registration.

Check mail delivery and follow up if the owner notice is delayed. In local file-mail mode notices are saved to `.mail`; actual inbox delivery requires SMTP. For approval errors, inspect status with `show` before retrying. Repeating approval for an active campus fails without duplicating the decision or notification.

## 4. Suspend and reactivate

```sh
npm run campus -- suspend CAMPUS_UUID --operator "Operator name" --reason "INCIDENT-456: campus access paused for authority review"
npm run campus -- show CAMPUS_UUID
npm run campus -- reactivate CAMPUS_UUID --operator "Operator name" --reason "INCIDENT-456: authority reconfirmed and review closed"
```

Suspension accepts an active campus. Access to that campus is denied on the next request and it disappears from joining searches. Reactivation accepts a suspended campus and rechecks owner email verification/domain. Both actions record the reviewer/reason and queue an owner notice. Suspension does not erase reports, memberships, or campus configuration. Personal trusted-contact sharing is a separate account feature and is not automatically stopped by campus suspension.

## 5. Transfer ownership and offboard

Independently confirm the handover with the institution. The replacement must already be a verified campus member. Get the member UUID from the controlled membership records; do not substitute an email address for a UUID.

```sh
npm run campus -- transfer CAMPUS_UUID NEW_OWNER_USER_UUID --operator "Operator name" --reason "HANDOVER-789: institution authorized replacement campus owner"
npm run campus -- show CAMPUS_UUID
```

Transfer makes the replacement owner and the previous owner staff, records the reviewer/reason, and queues notices to both. The new owner should review staff access and rotate the invitation code in Staff > Settings if needed. The former owner can then delete their own account if they hold no other campus ownership. If the old representative should lose campus access entirely, the new owner removes their membership in Staff > Members.

## Common failures

| Message                                      | Action                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Invalid arguments                            | Run `npm run campus -- --help`; include a UUID, operator, and reason.                      |
| Campus or owner not found                    | Check `list`; verify the target database and campus ID.                                    |
| Requires status pending/active/suspended     | Use `show`; choose approve, suspend, or reactivate for the current state.                  |
| Owner must have a verified email             | Resolve account verification through the review process.          |
| New owner must be a verified existing member | Have the replacement verify and join the campus first.                                     |
| Database/network error                       | Reconnect, then use `show` to determine whether the transaction committed before retrying. |

Every mutation rolls back on failure. Operator identity is self-reported: protect shell/database access and preserve your review tickets. Back up the database and rehearse restoration before public onboarding.

## Operator interface

Set `PLATFORM_OPERATOR_EMAILS` to the comma-separated verified account emails authorized to administer the platform. This server-side allowlist grants access to **Account → Platform campus review** and `/platform`; campus ownership never grants this access automatically. Leave it empty to disable the interface. Keep this list limited to the people who perform institutional checks. The API rechecks the allowlist on every request.

Operators select the pending, active or suspended queue, inspect the owner and official site, independently confirm authority, and record a review reason or reference before confirming a decision. Approval/reactivation require the authority checkbox. Decisions use the same transaction and status checks as the server CLI, record the authenticated actor, and queue an owner email. Configure `PLATFORM_SUPPORT_EMAIL` with the monitored inbox used for applicant questions; pending applicants see the review steps and registration reference.

Campus owners can transfer ownership in **Staff → Settings → Transfer campus ownership**. The successor must already be verified campus staff in that campus. The current owner confirms their password; the change is atomic and audited. The former owner remains staff, then may delete their account.
