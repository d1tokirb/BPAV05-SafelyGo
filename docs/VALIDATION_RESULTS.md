# Local validation record

Date: September 30, 2026. Environment: Node 24.14.0, Expo SDK 57, macOS, local PostgreSQL. This record distinguishes completed automated checks from launch acceptance.

Completed:

- Server and mobile TypeScript checks.
- API production compilation.
- Expo web export.
- Android and iOS JavaScript/Hermes bundle export.
- Expo Doctor: all 21 checks passed.
- Native Android/iOS configuration generation via expo prebuild --no-install; background permission declarations verified in manifests/plists.
- PostgreSQL integration suite: 15 passing tests (including the parent integration scenario). Tests cover multi-campus service flows, privacy and access boundaries, account codes/recovery, sharing revocation, pagination and membership changes.
- npm audit --omit=dev: no known vulnerabilities reported for server or mobile dependency graphs. A scoped xcode→uuid override updates the vulnerable build-tool dependency; native config generation passed with that override.

- Browser UI: student report saved, owner review saved, another student sees sanitized summary; simulated foreground location received by a second account and removed after stop; no application JavaScript errors during those flows (development server restarts briefly produced connection-refused network entries). Layout checked at 390 and 320 pixels.

Browser checks and screenshots are stored under output/playwright. They use the fictional Riverside Demo Campus. Screenshots are supplementary web-preview evidence, not real-device deployment proof.

Not completed by local verification:

- Railway production provisioning and HTTPS live API verification.
- Real SMTP deliverability and sender-domain checks.
- Android Maps API key and signing-certificate validation.
- Signed binary compilation, installation and physical-device acceptance, including background-location behavior.
- Official BPA forms, contestant ID, final source/app URLs and upload.

See TESTING.md, DEPLOYMENT.md and REQUIREMENTS.md for the remaining acceptance and submission steps.
