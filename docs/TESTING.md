# Verification and acceptance

Automated integration checks use a real disposable PostgreSQL database, not mocked persistence. The suite exercises registration/verification, pending activation, institution membership, cross-campus denial, geofence validation, report confidentiality, staff publication, directory permissions, announcements, role delegation, audit creation, trusted-contact acceptance, private location authorization, removal revocation, stop/expiry, recovery and single-use codes, owner deletion protection, account anonymization and malformed input.

Run `TEST_DATABASE_URL=postgresql://localhost:5432/safelygo_test npm test`. The database is truncated and must end in _test. CI supplies a separate PostgreSQL service. Type checks and production API/web bundles are also required.

## Physical-device acceptance before public launch

- Install preview builds on Android and iOS; verify maps, marker positioning, safe areas, keyboard behavior, font scaling and screen-reader labels.
- Register/verify/recover through actual SMTP. Test code expiry, resend and wrong-code lockout. Confirm sender identity and delivery timing.
- Register two institutions, approve them independently, and verify student/staff access remains separated.
- Submit reports from actual campus positions. Review, publish a non-identifying summary, resolve, and confirm another student's map updates.
- Verify directory numbers with the campus; confirm dialing displays the correct number and cancel works.
- Use two physical phones for contact invite/accept. Start foreground sharing; move, confirm timestamps and accuracy; test network loss, permission denial, permission revocation, session stop, contact removal and expiry.
- Test background sharing on installed builds with the screen locked and app backgrounded. Test force-quit, Android battery restrictions and iOS permission changes. Verify stale states never imply fresh positions.
- Stop sharing/sign out; verify recipients immediately lose server access. Verify password recovery revokes old sessions and sharing.
- Try a revoked staff account and a suspended campus. Confirm immediate server denial.
- Rehearse database restore, provider failure, email queue retry, and failed deployment rollback.

Browser UI verification and screenshots supplement native testing; they do not certify background tracking or native map credentials. Record device/OS/build identifiers, dates, results and any defects before marking acceptance complete.

## Complete journey evidence

See [Journey acceptance](JOURNEY_ACCEPTANCE.md) for the October 2, 2026 results. The suite now exercises the real operator command, named-review validation, review audit metadata, owner notifications, ownership transfer, reviewed reactivation and deletion of queued personal emails. Local file-mail delivery is also tested end to end.

The October 5 follow-up in [Journey acceptance](JOURNEY_ACCEPTANCE.md) and [UX iteration log](UX_ITERATIONS_2026-10-05.md) records the 33-check suite and browser retests. Exporting iOS/Android bundles verifies compilation only; it does not prove device permissions, background delivery, calling or accessibility behavior.
