# Railway deployment and mobile distribution

## Railway API + PostgreSQL

1. Create a Railway project and add PostgreSQL.
2. Add an API service from GitHub. Set Root Directory to `server` with Build Command `npm run build`, Start Command `npm start`, and Healthcheck Path `/health`. Railpack installs locked dependencies and builds the Node.js API. The mobile app is built separately.
3. Set API variables:
   - DATABASE_URL: Railway reference to PostgreSQL's DATABASE_URL, using private networking when both services share the project.
   - NODE_ENV=production; Railway supplies PORT automatically.
   - DATABASE_SSL=false for a private Railway connection if that connection does not use TLS; for a TLS endpoint set true and use a valid certificate. Never disable certificate verification.
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM. Use a real SMTP provider with verified sender domain. MAIL_MODE must be smtp or absent in production.
   - CORS_ORIGINS: comma-separated HTTPS web preview origins if using a hosted web build.
   - PUBLIC_URL: the generated HTTPS API URL (reserved for operational links).
4. Generate a public service domain. Check /health. Migrations run under a transaction and advisory lock before the server listens. Railway's deployment check uses /health.
5. Verify registration, real email delivery, password recovery and two independent campuses on the hosted API.
6. Configure database backups, retention, an independent uptime monitor and error/mail-queue monitoring. Railway deployment healthchecks alone do not provide ongoing monitoring.

## Campus activation

Campus owners sign up, verify their regular email, and register their campus. Pending campuses are not listed publicly and cannot take student reports or join requests. Owners can prepare the directory and map settings.

Follow [Campus operations](CAMPUS_OPERATIONS.md) for the required authority review, named reviewer, decision reason, approval verification, suspension/reactivation and ownership transfer. Campus email verification alone does not establish authority.

Source example (from `server/`):

```sh
npm run campus -- list pending
npm run campus -- show CAMPUS_UUID
npm run campus -- approve CAMPUS_UUID --operator "Operator name" --reason "REVIEW-123: institution confirmed applicant authority"
```

In the deployed Railway service, use compiled equivalents:

```sh
node dist/operator.js list pending
node dist/operator.js approve CAMPUS_UUID --operator "Operator name" --reason "REVIEW-123: institution confirmed applicant authority"
```

Platform decisions record operator/reason in audit and queue owner notifications. Trusted shell/database access grants operator authority; the operator flag only labels the audit entry.

## Native Expo builds

1. In mobile/.env set EXPO_PUBLIC_API_URL to the HTTPS API domain. Also set EXPO_PUBLIC_API_URL in the Expo/EAS build environment for each deployment profile; .env files are intentionally excluded from source uploads.
2. Android: enable Google Maps SDK for Android in your Google Cloud project. Set GOOGLE_MAPS_ANDROID_API_KEY in the EAS build environment. Restrict it to app.safelygo.mobile and the correct signing certificate SHA-1. Maps keys are embedded in binaries and must be restricted. iOS uses Apple Maps by default.
3. Review app.config.ts identifiers and branding before creating signing credentials. Run `npx eas-cli@latest login` and `npx eas-cli@latest init` from mobile, then set EAS_PROJECT_ID as needed.
4. Development: `npx eas-cli@latest build --profile development --platform android` and `npx expo start --dev-client`.
5. Judge preview: `npx eas-cli@latest build --profile preview --platform android`. Share its installation URL and test it on a physical Android phone. iOS internal distribution requires registered devices and Apple developer signing; TestFlight is another option.
6. Production: `npx eas-cli@latest build --profile production --platform all`, then follow each store's privacy, permission and distribution requirements if publishing. Store publication is not required by this competition.

EXPO_PUBLIC variables are public. Never put DATABASE_URL, SMTP_PASS, or platform operator credentials in mobile configuration. Production API and keys must be set before building; changing the public API URL requires a new bundle/build distribution.

Background sharing requires the installed native app, background location permission and device testing. Expo Go/web are useful previews but do not establish background-location readiness. Android's persistent service notification and iOS background indicator explain active sharing. Force-quit, battery restrictions, permission changes and loss of network can interrupt updates; server expiry still revokes access.

## Operations and recovery

Before launch: rehearse backup restore, approve actual campus administrators, verify every emergency number, provide a support contact, and decide report/audit retention with each institution. Current account deletion retains reports with author_id=NULL; text may still contain personal information, so staff must redact or delete under the institution's retention process. The operator can perform reviewed database retention actions. No automatic deletion of campus safety records is assumed.

Mail retries every five minutes after failures and codes expire after 15 minutes. Alert on any overdue mail queue; jobs older than one day are discarded by maintenance. Sender/provider outages need operator attention. Sessions last 30 days; recovery revokes all account sessions and sharing. Student access changes take effect on the next server request.

No external resources have been provisioned by this implementation. Deployment and signing require your accounts and credentials.

### Campus search and review configuration

Set `PUBLIC_APP_URL` to the deployed web app origin for direct `/walk` invitation links. Set `PLATFORM_SUPPORT_EMAIL` to a monitored registration-help inbox and `PLATFORM_OPERATOR_EMAILS` to the verified platform administrators. These are separate from campus-specific emergency numbers and support emails managed in Staff settings.

`GEOCODER_SEARCH_URL` accepts a self-hosted or contracted Nominatim-compatible `/search` endpoint. SafelyGo sends explicit campus/address searches through its authenticated API and caches results; the app does not perform search-as-you-type. An unset/unavailable provider leaves map selection and current-location selection available. Configure provider capacity and limits for your deployment.

The public Nominatim server is **not configured by default**. Its [usage policy](https://operations.osmfoundation.org/policies/nominatim/) requires an app-wide maximum of one request per second, an identifying User-Agent, attribution, caching, a switchable provider, and no autocomplete; it also restricts automatically generated generic geocoding services. Use a self-hosted or contracted provider for this app rather than assuming the public service is a production backend.

Navigation now uses Expo Router. Web hosting must serve the Expo app for direct routes such as `/walk`, `/reports`, `/account` and `/platform`. The `safelygo` native scheme remains configured. Email delivery still requires the production SMTP configuration described above.

For browser-only local testing, launch Expo with `EXPO_PUBLIC_WEB_API_URL=http://localhost:4000`. This overrides the API URL on web only; native builds retain `EXPO_PUBLIC_API_URL`. Do not use a computer-local localhost address as the iPhone API endpoint. A configured development tunnel must remain running, or use the deployed HTTPS API.

## Free email delivery using Resend HTTPS

Railway Free/Trial/Hobby blocks outbound SMTP; use the new HTTPS transport. Create a Resend free account, verify a sending domain using its DNS instructions, create a sending API key, and set Railway variables `MAIL_MODE=resend`, `RESEND_API_KEY`, and `MAIL_FROM=SafelyGo <notifications@YOUR-VERIFIED-DOMAIN>`. Remove the SMTP variables if using Resend. Free delivery currently allows 3,000 emails/month and 100/day. Recipients use regular emails. Verify an existing domain you control (for example a subdomain of savely.help); the domain itself may have a registration cost. Disable open/link tracking in the provider settings. Codes can expire while daily quota is exhausted; monitor quota and delivery failures.

Set `PLATFORM_OPERATOR_NAME` to the actual responsible operator/business and `PLATFORM_SUPPORT_EMAIL` to a mailbox you monitor. The server hosts `/privacy` and `/support`, accessible from Account; use these public URLs in store listings. Review the actual backup lifecycle and campus retention practice before publishing. No support response time or fictional contact is promised.

Sources: https://docs.railway.com/networking/outbound-networking and https://resend.com/pricing.

Operator: Jonathon Hurdley. Support email is optional and intentionally unset for this deployment. Public technical support links to GitHub issues; never post private account details there. Railway now deprecates Config as Code for new services: configure build/start/health settings in the dashboard instead of adding a railway.json path.
