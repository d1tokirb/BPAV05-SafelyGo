# SafelyGo release handoff

## Railway API and PostgreSQL

1. Push this repository to your Git host. In Railway create a project, add PostgreSQL, then deploy the repository as an API service with the `server` as its Root Directory and set Build Command `npm run build`, Start Command `npm start`, and Healthcheck Path `/health` in service settings. Railpack builds the Node.js API without a custom Dockerfile and checks `/health`.
2. Set the API service variables below. Replace placeholders; do not put server credentials in Expo variables.

```dotenv
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=false
PUBLIC_URL=https://YOUR-API-DOMAIN
CORS_ORIGINS=https://YOUR-WEB-DOMAIN
MAIL_MODE=resend
RESEND_API_KEY=YOUR-RESEND-API-KEY
MAIL_FROM=SafelyGo <YOUR-VERIFIED-SENDER>
PLATFORM_OPERATOR_NAME=YOUR-OPERATOR-NAME
PLATFORM_SUPPORT_EMAIL=support@send.savely.help
PLATFORM_OPERATOR_EMAILS=YOUR-VERIFIED-OPERATOR-EMAIL
DEMO_LOGIN=false
DEMO_SEED=false
```

The database service must actually be named Postgres for that reference. Select its DATABASE_URL using Railway's variable reference picker if it has another name. Use `DATABASE_SSL=true` when your database endpoint requires verified TLS. Railway supplies PORT. Generate a public HTTPS domain for the API and put it in PUBLIC_URL. For a native-only launch, leave CORS_ORIGINS empty; native requests do not send browser origins. Add the exact browser origin if hosting a web build. Campus address search requires GEOCODER_SEARCH_URL. This deployment uses https://nominatim.openstreetmap.org/search with the operator’s explicit approval for moderate use. Follow https://operations.osmfoundation.org/policies/nominatim/: no autocomplete or confidential queries, visible attribution, caching and a global maximum of one request per second. The server enforces a shared PostgreSQL cache (24 hours) and at most one upstream request per 1.1 seconds across replicas. Busy searches return a retry message. Switch GEOCODER_SEARCH_URL to a contracted or self-hosted compatible provider before larger-scale use. Map placement remains available if search fails.

3. Deploy. Startup applies migrations with a PostgreSQL advisory lock before accepting traffic. `/health` checks the database. Configure separate continuous uptime monitoring, backups, and a restore rehearsal. Do not run the demo seed in this project.
4. Run `npm run deployment:check -- https://YOUR-API-DOMAIN` for a read-only database health and disabled-test-login check. Check real SMTP delivery to two regular email accounts. Complete signup, campus application, operator approval, student join, report, staff update, contact invitation, walk sharing, and deletion against the deployed API. Inspect delivery failures in logs without exposing codes or credentials. Detailed campus operating commands are in DEPLOYMENT.md.

## Expo production build

Run commands from `mobile/`. Link the actual Expo project with `npx eas-cli@latest init`. Set these variables in the EAS **production** environment:

```dotenv
EXPO_PUBLIC_API_URL=https://YOUR-API-DOMAIN
EAS_PROJECT_ID=YOUR-EXPO-PROJECT-UUID
GOOGLE_MAPS_ANDROID_API_KEY=YOUR-RESTRICTED-ANDROID-MAPS-KEY
```

The production profile disables the test login and enables configuration guards. The API URL is embedded in the bundle: rebuild after changing it. Never use DATABASE_URL or SMTP credentials in the mobile environment. Restrict the Android maps key to the package and release signing certificate. Use `npx eas-cli@latest build --profile production --platform ios` (and android for Google Play). A local development environment and its VPN/tunnel settings have not been changed.

## Repeatable validation

From the repository root:

```sh
TEST_DATABASE_URL=postgresql://localhost/safelygo_acceptance_test npm run release:check
```

The database must be disposable and its name must end in `_test`; the suite clears it. This command checks types, lint, service journeys, builds the API, and exports all three mobile platforms to `/tmp/safelygo-release-export`. CI performs these checks using its own disposable PostgreSQL service. Configuration guards can be exercised with `SAFELYGO_RELEASE=true EXPO_PUBLIC_API_URL=https://YOUR-API-DOMAIN EAS_PROJECT_ID=YOUR-UUID npx expo config --type public` in mobile.

## Launch gates that still require real infrastructure/devices

- Real SMTP, hosted API/database smoke test, backups, monitoring and campus operator account.
- Signed physical iPhone/Android checks: denied location, keyboard, low connectivity, locked-screen walk updates, stop/expiry, permissions, phone dialing, relaunch and deletion.
- Published privacy/support pages, actual retention policy, App Store privacy and Google Play data safety declarations, screenshots and background-location review evidence matching the implemented behavior. Retained reports are anonymized on account deletion; do not promise that deletion erases them.
- Review outstanding Expo tooling dependency advisories before building with untrusted inputs. The runtime API dependency audit is separate from mobile CLI dependencies.

Exports and browser tests cannot certify native background execution or store approval. The Railway API and PostgreSQL are deployed; real Resend delivery to the operator’s test recipient has been confirmed. A signed native release has not yet been verified.

## Dependency audit (2026-10-07)

API production dependencies: zero reported vulnerabilities. Updated decode-uri-component to 0.5.0 with a transitive override. The remaining mobile audit reports 19 high findings propagated from two underlying advisories in build tooling: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv); neither lists a patched version. This is an outstanding build-tooling review item, not a clean audit. Do not expose Metro/Expo development servers publicly or process untrusted glob patterns/certificates. Recheck the audit before signing the production build.

## Free email delivery using Resend HTTPS

Railway Free/Trial/Hobby blocks outbound SMTP; use the new HTTPS transport. Create a Resend free account, verify a sending domain using its DNS instructions, create a sending API key, and set Railway variables `MAIL_MODE=resend`, `RESEND_API_KEY`, and `MAIL_FROM=SafelyGo <notifications@YOUR-VERIFIED-DOMAIN>`. Remove the SMTP variables if using Resend. Free delivery currently allows 3,000 emails/month and 100/day. Recipients use regular emails. Verify an existing domain you control (for example a subdomain of savely.help); the domain itself may have a registration cost. Disable open/link tracking in the provider settings. Codes can expire while daily quota is exhausted; monitor quota and delivery failures.

Set `PLATFORM_OPERATOR_NAME` to the actual responsible operator/business and `PLATFORM_SUPPORT_EMAIL` to a mailbox you monitor. The server hosts `/privacy` and `/support`, accessible from Account; use these public URLs in store listings. Review the actual backup lifecycle and campus retention practice before publishing. No support response time or fictional contact is promised.

Sources: https://docs.railway.com/networking/outbound-networking and https://resend.com/pricing.

Operator: Jonathon Hurdley. Private account, privacy and registration support: support@send.savely.help. The send.savely.help subdomain receives mail through Resend; monitor Emails → Receiving in the Resend dashboard. Public GitHub issues remain available for technical problems only; never post private account details there. Railway now deprecates Config as Code for new services: configure build/start/health settings in the dashboard instead of adding a railway.json path.

## October 8 release repair validation

Signup email correction now requires the account password, invalidates previous codes, removes queued mail to the old address and revokes other sessions. Verified addresses cannot be changed through this endpoint. Staff sections and report filters are all visible without horizontal scrolling, and radio/tab selected states are exposed to screen readers. Public support guidance no longer asks people to put account emails in public issues.

`npm run release:check` passed with 58 tests, type checking, lint, API compilation and iOS/Android/web exports. Browser checks verified corrected email verification, a real public campus address search, map boundary selection and staff navigation at phone dimensions. No physical-device background-location claim is implied by these results. API dependency audit: zero findings; mobile build tooling still has 19 high transitive findings without a safe SDK-compatible fix in the current audit.

## Support email operations

- Railway uses `PLATFORM_SUPPORT_EMAIL=support@send.savely.help`. The app’s hosted support/privacy pages read this setting, and transactional emails use it as their Reply-To address. No mobile rebuild is needed for this server setting.
- Resend receiving is enabled for `send.savely.help`. Namecheap Custom MX: host `send`, value `inbound-smtp.us-east-1.amazonaws.com`, priority `10`, TTL Automatic. Sending DKIM and return-path records remain configured separately.
- Review incoming requests in Resend → Emails → Receiving. Receiving is not forwarded to a personal mailbox. The operator must monitor the dashboard and handle requests; this setup does not promise automatic replies or an emergency response.
- Replying through Resend uses its sending API with the received message’s Message-ID as the In-Reply-To header. Resend is an email service, not a full support ticket system. Never make received messages public through the dashboard’s sharing feature.
- Validate receipt with a harmless test email to the support address after DNS verification. Check account recovery and deletion requests privately, and verify identity before making account changes.

Provider instructions: https://resend.com/docs/dashboard/receiving/manage-emails and https://resend.com/docs/dashboard/receiving/reply-to-emails.
