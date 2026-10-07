# SafelyGo release handoff

## Railway API and PostgreSQL

1. Push this repository to your Git host. In Railway create a project, add PostgreSQL, then deploy the repository as an API service with the `server` as its Root Directory and `/server/railway.json` as its Railway Config File path. Railpack builds the Node.js API without a custom Dockerfile and checks `/health`.
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
PLATFORM_SUPPORT_EMAIL=YOUR-SUPPORT-EMAIL
PLATFORM_OPERATOR_EMAILS=YOUR-VERIFIED-OPERATOR-EMAIL
DEMO_LOGIN=false
DEMO_SEED=false
```

The database service must actually be named Postgres for that reference. Select its DATABASE_URL using Railway's variable reference picker if it has another name. Use `DATABASE_SSL=true` when your database endpoint requires verified TLS. Railway supplies PORT. Generate a public HTTPS domain for the API and put it in PUBLIC_URL. For a native-only launch, leave CORS_ORIGINS empty; native requests do not send browser origins. Add the exact browser origin if hosting a web build. Campus discovery also requires a contracted geocoder's GEOCODER_SEARCH_URL; otherwise users can enter their campus location manually.

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

Exports and browser tests cannot certify native background execution or store approval. No Railway project or signed release was created during this local preparation.

## Dependency audit (2026-10-07)

API production dependencies: zero reported vulnerabilities. Updated decode-uri-component to 0.5.0 with a transitive override. The remaining mobile audit reports 19 high findings propagated from two underlying advisories in build tooling: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv); neither lists a patched version. This is an outstanding build-tooling review item, not a clean audit. Do not expose Metro/Expo development servers publicly or process untrusted glob patterns/certificates. Recheck the audit before signing the production build.

## Free email delivery using Resend HTTPS

Railway Free/Trial/Hobby blocks outbound SMTP; use the new HTTPS transport. Create a Resend free account, verify a sending domain using its DNS instructions, create a sending API key, and set Railway variables `MAIL_MODE=resend`, `RESEND_API_KEY`, and `MAIL_FROM=SafelyGo <notifications@YOUR-VERIFIED-DOMAIN>`. Remove the SMTP variables if using Resend. Free delivery currently allows 3,000 emails/month and 100/day. Recipients use regular emails. Verify an existing domain you control (for example a subdomain of savely.help); the domain itself may have a registration cost. Disable open/link tracking in the provider settings. Codes can expire while daily quota is exhausted; monitor quota and delivery failures.

Set `PLATFORM_OPERATOR_NAME` to the actual responsible operator/business and `PLATFORM_SUPPORT_EMAIL` to a mailbox you monitor. The server hosts `/privacy` and `/support`, accessible from Account; use these public URLs in store listings. Review the actual backup lifecycle and campus retention practice before publishing. No support response time or fictional contact is promised.

Sources: https://docs.railway.com/networking/outbound-networking and https://resend.com/pricing.
