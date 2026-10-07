# User journey acceptance — October 2, 2026

## Result

23 automated checks pass against the disposable `safelygo_test` PostgreSQL database. The tests now use the real operator executable for approval and exercise a fresh account through campus membership, staff actions, invitations, sharing access, deletion, ownership transfer, suspension, and reactivation. Server/mobile type checks, mobile ESLint (zero warnings), the production API build and an iOS JavaScript bundle export pass. The export checks bundling; it is not a physical-device test.

An independent web app at localhost:8082 and API at localhost:4001 used `safelygo_acceptance_test`, with fictional accounts and campus data. Neither the normal demo database nor the app's API configuration was changed. The temporary web/API processes were stopped after testing.

## Verified journeys

| Journey                          | Evidence                                                                                                                                                                                                                                                      | Result                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Fresh signup                     | Browser registration → code delivered to local file → email verification → campus search; API tests also check unverified access, code replacement/lockout and login                                                                                          | Pass                   |
| Campus registration and approval | Browser institutional-email registration → pending owner → real operator approval → searchable campus → student joins with owner-visible invitation code                                                                                                      | Pass                   |
| Operator decisions               | Missing reviewer/reason rejected; pending/active/suspended transitions enforced; decisions record operator and reason; owner notification queued                                                                                                              | Pass                   |
| Contact invitations              | Browser student sends invitation → second account sees request → accepts → contact becomes selectable; API checks wrong recipient, duplicate invitation and pre-acceptance sharing denial                                                                     | Pass                   |
| Report and staff actions         | Browser student selects map position and sends report → staff reviews it and publishes summary; directory added through UI; API tests add/edit/remove directory, announcements, role delegation/revocation, private-summary boundary and tenant isolation     | Pass                   |
| Account deletion                 | UI deletion requires password; deletion executed against isolated API; browser returns to sign-in; API tests check wrong-password rejection, owner protection, sharing revocation, related-row removal, queued-mail cleanup and retained-report anonymization | Pass                   |
| Owner offboarding                | Actual operator transfer → replacement becomes owner → former owner becomes staff → former owner can delete account; suspension/reactivation uses the real command                                                                                            | Pass                   |
| Mail transport                   | Delivered verification code read from the actual local file output and accepted by verification endpoint, not just inspected in an outbox row                                                                                                                 | Pass for file delivery |

## Fixes and operating improvements

- Account deletion now removes undelivered mail addressed to the account and performs the ownership check/deletion in one transaction.
- Operator commands require `--operator` and `--reason` for mutations. These are audit labels; access to the trusted server/database remains the authorization mechanism.
- Approve, suspend, reactivate, and transfer commit the change, audit record and notification queue entry together.
- `list pending` provides the review queue. `show` provides campus details and recent decisions without exposing invitation codes.
- Version 2 of the database schema adds operator/reason metadata to audit entries; campus staff can read those details in the app’s Audit screen.
- Mobile data loading rejects stale responses after changing campus/page, pagination resets on a new path, and location freshness updates on a timer.
- The supported review, approval, follow-up, suspension and handover process is documented in [Campus operations](CAMPUS_OPERATIONS.md).

## Run again

```sh
TEST_DATABASE_URL=postgresql://localhost:5432/safelygo_test npm test
npm run check
npm --prefix mobile run lint
npm run build:api
```

Use a disposable database ending in `_test`; the automated suite truncates its test data. Do not point it at a real campus database. CLI acceptance invokes the same operator source executable used for local administration; the compiled `node server/dist/operator.js show ...` command was also checked against the isolated UI campus.

## Remaining external checks

These results do not establish real inbox delivery or native device behavior. Real SMTP delivery, real institutional authority reviews and accurate emergency numbers require the configured provider and institution. Physical iPhone/Android acceptance remains required for native maps, permission dialogs, movement, background sharing, interrupted networking and dialing. The October 5 iteration adds a verified allowlisted platform-admin UI and password-confirmed owner handover in Staff Settings. Institutional verification remains an operator responsibility.

The mobile dependency audit reports an upstream Expo CLI/code-signing dependency advisory for node-forge (GHSA-86w9-cpqp-85rv). The suggested automatic fix downgrades Expo to version 44, so it was not applied. Resolve through a compatible upstream release before production signing. The server production-dependency audit reports zero vulnerabilities.

The report author can still see their own private report on the map; unrelated members receive only staff-approved summaries. Reports retain their written content after account deletion, so an institution's retention/redaction process must handle personal information within that text.

## October 5 follow-up

The expanded suite has 33 passing checks, including pre-registration invitations, recipient-only acceptance, invitation resend identity, app operator authorization and authority confirmation, owner handover, campus emergency/support configuration, configured-provider search and draft storage under long Unicode/rapid-edit/failure conditions. Browser evidence includes a fresh verified contact account, joining a campus, pending registration/reference, operator review controls, staff report review and audit, stale received walks, saved setup choices, report review restored after reload, recovery-code request, call confirmation cancellation and network retry.

Fictional UI test accounts/campus/report were removed after checks. Temporary operator runtime access was removed. SMTP inbox delivery and physical-device acceptance remain unverified; no perfection or 9.8 certification is implied by passing integration tests.

## October 5 pass-5 validation

The expanded suite now passes 39 checks, adding map grouping at different zoom levels and failed sharing-start cleanup. TypeScript, lint and web/iOS/Android bundle exports pass. Browser retests verify grouped map details at 320 pixels, preserved zoom on refresh, actual report timestamps and the compact system-font Home screen. Browser testing uses an optional web-only API override; native API configuration remains unchanged. Native runtime and live delivery limits above still apply.

## October 5 pass-6 follow-up

Latest expanded suite: 47 passing checks, including partial stop failures, refresh-failure guidance, stale/future/expired walk states and unknown accuracy through the API. TypeScript, lint, API build and web/iOS/Android export pass. Browser evidence includes the 320-pixel walk setup, saved review restoration, stale-position/unknown-accuracy display, expiry during API disconnection, single offline notice and automatic recovery. An earlier recovery request unexpectedly returned 404; it was not reproduced by the following run or five consecutive complete reruns, and remains an unresolved intermittent finding. See the iteration log for scope and ratings; this is not a 9.8 acceptance result.

Pass 7: 51 tests passed, including report receipt concurrency/replay/author isolation and campus location bounds. Expo Doctor passed 21/21 checks; mobile TypeScript/lint, API compilation, migrations and all-platform exports passed. Browser report drafts restore the selected location, text, category and review step after reload. Narrow Help targets measured 54–62 pixels with no horizontal overflow. Final browser screenshot capture timed out; physical-device and real inbox checks remain unverified.
