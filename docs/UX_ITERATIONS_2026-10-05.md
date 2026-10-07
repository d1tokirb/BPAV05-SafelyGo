# SafelyGo improvement and retest log

The baseline review remains in UX_REVIEW_2026-10-05.md. Scores use that review's harsh scale. These are judgments of tested experiences, not mathematical proof of perfection. Native location, background execution, calling, keyboard behavior and VoiceOver remain outside browser verification. The user chose browser testing for this pass.

## Pass 1: interruption recovery and information hierarchy

Implemented compact authentication, password visibility, local field validation and clear feedback on mode changes; saved report drafts, four-step report review and readable status explanations; incoming walks on Home and above setup; stale-position warnings and recipient names; searchable reports and members; collapsed directory editors; announcement preview; map legend correction and search.

Retest at measured 393 × 852: empty signup shows field guidance rather than a technical paragraph; switching to login clears feedback; fictional report title/body survive Home → Reports; resumed draft restores its step; final review lists the entered information; sending the fictional report clears the draft and produces Received status.

Scores for those verified changes: authentication 7.0; signup 7.0; report interruption recovery 8.0; report submission 7.0; history 6.5. Still below target. The location step's 330-pixel map kept Continue below the fold. Staff queue controls and large row actions still occupied too much space.

## Pass 2: campus journeys and staff operations

Added invitations for unregistered email recipients with 14-day expiry and explicit acceptance; contact-only users can enter Walk without joining a campus. Added password-confirmed handover to verified institutional staff, campus-configured emergency/support contacts, approval steps/reference, readable report audit changes, and automatic audit reload after a review save. Converted app navigation to Expo Router, allowing browser Back and direct screen URLs. Campus boundary editing uses a map and distance choices. Draft writes now serialize and use encrypted native chunks to avoid keychain payload limits.

Retest: all 26 server integration checks pass, including three new checks for invitations before registration, owner handover authorization and human validation. Browser owner review of the fictional report succeeds; Audit immediately shows the report title, status change and staff-note change without a manual refresh. Member search finds Taylor and hides other members. Directory lists names/numbers without showing all editors. Announcement preview displays entered title/body and a human expiry date. Password visibility control is present; native password keyboard is not verified.

Scores for verified staff changes: reports 7.0; directory 7.5; announcements 7.0; members 7.5; audit 7.5. Still below target. Queue controls remained too large; horizontal staff navigation hid sections; settings were too long; announcement and editor drafts needed interruption protection.

## Pass 3: density, clarity and the revised palette

Removed orange. Updated accents to sapphire and lavender with navy/white. Staff sections now use an explicit Change staff section control; queue rows are compact buttons and selected reports have a focused detail view. Shortened the reporting map, collapsed invitation/boundary settings, saved campus-registration and staff-form drafts, and exposed background-sharing choices before Start. Location tracking no longer treats a failed first position upload as a successful start. Web map markers update without recreating the map or resetting the user's pan.

Small-phone retest: measured 320 × 740, no document horizontal overflow. Retesting of full journeys continues; no 9.8 claim is made.

## Remaining evidence and work

- Browser retests now cover fresh registration/verification, contact invitations, campus registration, operator controls, staff review, received/stale walks, report interruption and connection recovery. Physical-device evidence remains separate.
- Campus location search is implemented through a configured provider. No provider is configured locally; disabled-provider fallback was checked in the browser, and a local provider fixture verifies results and caching. The map remains the fallback.
- A real platform support address, live SMTP delivery and institutional approval handling depend on deployment configuration. Do not invent addresses or response-time promises.
- Physical iPhone keyboard, permissions, native maps, background movement, offline recovery, dialing and accessibility need device testing before a 9.8 assessment of the live app would be credible.

## Pass 4: full journeys, reload recovery and operating clarity

Browser checks used 393 × 852 and 320 × 740 viewports. A fresh fictional user registered, verified with the actual file-delivered code, saw the pre-registration contact invitation, joined Riverside and registered a separate fictional campus. Registration reached pending status with review steps/reference. The operator queue showed the application and kept approval disabled until an independent-authority check and review reason were supplied. No institution was approved through the UI; the isolated API suite executed approval and handover.

Received-walk retest showed owner, expiry and stale-position warning above a 220-pixel map, with own setup collapsed. Opening own setup, choosing a trusted person/time and navigating Home → browser Back restored step three. Browser background sharing is explicitly unavailable. No real device location was requested. Help displayed call confirmation; cancellation did not dial.

Report retest found Save and close resetting the step. That was fixed and retested: title, body, category, selected position and step four survive Save and close → reload → Continue saved report. The final review now shows the selected map position with Change location. The location step uses a 200-pixel map. At 320 pixels there is no document horizontal overflow; reviewing long content still requires vertical scrolling.

API disconnection showed a single retry notice above the map. Restoring the API removed the notice and restored three public concerns automatically. A search with no matches correctly displayed an empty state and did not reveal an unrelated student's private report. Public concern statuses are readable; duplicate title/body summaries are suppressed. Home puts a collapsed campus-updates control before the primary action. Recovery request reaches the eight-digit-code/new-password form, explains expiry/newest code/Spam and clears prior feedback when returning to Sign in. A physical keyboard and actual password-change UI were not tested.

Staff drafts now finish restoration before editing. Queue filters wrap so All remains visible at 320 pixels; opening and closing the focused report editor was retested after the loading guard. Activity identifies affected contacts, announcements and members; report changes use readable statuses; invitation-code replacement is audited without the secret. Long Unicode, rapid writes, removal and failed saves are covered by four draft-storage tests. The final expanded test suite passes 33 checks; lint, TypeScript, API build and Expo bundle checks are recorded separately from usability scores.

### Current harsh scores

These are conservative judgments from the browser observations across these passes and isolated backend acceptance. They are not independent user-study results or native-device certification. A previously exercised journey is not claimed to have been fully repeated after every cosmetic edit. The requested 9.8 threshold has **not** been demonstrated.

| Area | Baseline | Current | Remaining limit |
| --- | ---: | ---: | --- |
| Sign-in | 4 | 8.5 | Native keyboard and autofill not exercised |
| Fresh signup | 3 | 8.5 | First-time comprehension not tested with new users |
| Email verification | 5 | 8 | Real inbox timing/delivery depends on configured SMTP |
| Password recovery | 4 | 8 | Native autofill and UI credential replacement unverified |
| Campus joining | 4 | 8 | Institution invitation distribution needs real operating evidence |
| Campus registration | 2 | 8 | Search provider is a deployment dependency; manual world-map fallback remains effortful |
| Approval and owner offboarding | 2 | 8.5 | Real institutional authority review and production operator setup remain |
| Home | 6 | 8.5 | Compact layout exposes secondary actions; no first-time user study |
| Navigation | 4 | 8.5 | Browser Back verified; native back and screen-reader behavior unverified |
| Map | 5 | 8.5 | Grouped markers expose every update; native interaction and real-volume field tests remain |
| Report submission | 4 | 8.5 | Long reviews scroll; native location/keyboard behavior unverified |
| Report history | 4 | 8.5 | Shows actual sent/latest-update times; full historical transition dates are unavailable |
| Contact invitations | 3 | 8.5 | Real mail delivery and two-phone acceptance remain |
| Walk setup | 5 | 8.5 | Explicit choices and restored review verified; native permission flow remains |
| Active walk | 4 | 7.5 | No physical movement, background execution or lock-screen proof |
| Received walk | 3 | 8.5 | Synthetic stale position verified; real-time two-phone movement remains |
| Help | 4 | 8 | Numbers must be institution-verified; actual dialing not performed |
| Account | 5 | 8.5 | Privacy comprehension and accessibility need users/devices |
| Account deletion | 5 | 8.5 | Backend revocation/anonymization passes; physical device draft purge unverified |
| Staff report queue | 3 | 8.5 | Search and focused review work; real-volume workload not observed |
| Staff directory | 4 | 8.5 | Collapsed editing works; real verified directory content remains |
| Staff announcements | 3 | 8 | Preview and drafts work; in-app only, no push delivery |
| Staff members | 3 | 8.5 | Search/access controls work; large institutional rosters need field use |
| Activity log | 2 | 8 | Names and report diffs are present; older events cannot gain missing history |
| Campus settings | 2 | 8 | Boundary/share/handover controls work; native share sheet and location remain |
| Visual design | 5 | 8 | System typography and compact functional layout replace the editorial treatment; aesthetic acceptance remains subjective |
| Errors and recovery | 2 | 8.5 | Disconnection/restore and drafts verified; mobile network/OS interruption remains |

Fictional test campus/account/report and synthetic sharing were cleaned up. Temporary operator runtime access was removed; existing demo accounts were preserved. Deployment SMTP/support/geocoding configuration and physical-device checks are not silently counted as completed.

## Pass 5: compact app typography, map density and truthful history

The user requested removal of editorial styling. Removed all serif display fonts, oversized greeting type, the decorative photo banner and magazine-like wording. Screens use native/system sans-serif typography and smaller headings. At 393 × 852 the student Home view displays Map, Report and Help actions above the tab bar. Decorative source assets are preserved but no longer imported by Home.

Map markers now group by visible proximity and separate when zooming in. Tapping a numbered group opens a scrollable sheet containing every selected update, with status and description separated for readability. Group labels are accessible names such as “2 nearby updates.” Retested grouping at two zoom levels, opening/closing details at 320 × 740, recentering and refreshing without resetting zoom. Tests preserve all marker records, ensure deterministic grouping, separate nearby markers at higher zoom and handle campuses near the international date line. These are source/data and browser checks; native marker gestures are not claimed verified.

Report history removes inferred Received/Reviewing/Closed milestone chips. It shows current status, actual sent time, latest update time and the staff public summary inside details. Browser retest of the existing demo report displayed its submitted time and later review time correctly. Staff section labels and report rows now use compact functional wording instead of appended article-style View arrows.

A code review found that TaskManager availability alone does not establish background support on Expo Go for iPhone. Background capability now explicitly excludes Expo Go using Expo's documented runtime helper. Foreground sharing avoids unsupported background cleanup APIs. Task cleanup attempts OS shutdown even if storage removal fails. Failed-start rollback independently attempts both server revocation and device shutdown, refreshes state and gives explicit recovery guidance when either stop cannot be confirmed. Three failure-path tests cover normal rollback, slow/failed networking and failed device cleanup. Native OS behavior still requires a physical build/device test.

Updated affected browser scores: Home 8.5; Map 8.5; Report history 8.5; visual design 8.0. Other current scores remain in the table. The 9.8 threshold remains unproven; no scores were raised merely because a build or unit test passed.

Relevant runtime references: [Expo runtime helper](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#isrunninginexpogo), [TaskManager capability limits](https://docs.expo.dev/versions/v57.0.0/sdk/task-manager/#taskmanagerisavailableasync), [native marker API](https://github.com/react-native-maps/react-native-maps/blob/v1.27.2/docs/marker.md).

Final pass-5 validation: all 39 automated checks passed (29 API journeys, four draft-storage checks, three map-grouping checks and three sharing-cleanup failure checks). TypeScript and lint passed; Expo exported web, iOS and Android bundles successfully. A first concurrent typecheck encountered generated export files being replaced; after removing the temporary export output, the source typecheck passed. Reloaded Home successfully against the local API after separating the web-only URL override from the native API setting. The phone's existing API configuration was preserved, not connectivity-certified.

## Pass 6: stopping walks, uncertain data and focused authentication

Stopped-walk cleanup now attempts device shutdown and server revocation independently, so a slow/failed DELETE cannot leave this device sending new positions. The result distinguishes unconfirmed contact access from unconfirmed device cleanup. Refresh failures cannot replace the underlying permission/stop guidance. Successful remote revocation hides the locally stopped session even when the following refresh fails; retry treats an already-removed session as stopped. A synchronous action lock prevents two rapid presses from starting duplicate requests before React renders disabled controls.

Walk status now counts minutes remaining, rejects invalid/future timestamps as evidence of a recent position, and removes expired walks locally even when the API cannot refresh. Home also filters expired walks/announcements; Map excludes expired shared positions and labels saved data during disconnection. Missing accuracy stays null through the API instead of becoming fictitious zero-meter precision. Successful foreground uploads clear old transient location errors; expiry cleanup failures provide device-specific guidance.

At 320 × 740, contact selection, duration and review were retested. Reload and sign-out/sign-in restored the chosen person/time/review step. Versions without background support show one direct keep-open explanation instead of an unusable switch plus repeated explanation. A synthetic incoming walk showed stale-location warning and unknown accuracy above the map. Its expiry was shortened, then the local API was stopped after the view loaded; the expired walk disappeared without a successful refresh. API restart restored the saved setup automatically. The synthetic database fixture was removed; no real location permission or dialing was requested.

The outage exposed three duplicate connection notices. Shared notices now suppress a duplicate already displayed by the app shell, and Walk combines contact/session retry guidance. When an initial request has never returned data, Walk explains that status is unavailable instead of incorrectly asserting there are no trusted people. Starting a new walk is disabled while the contact/session checks are failing. Browser retest confirmed a single connection warning and explicit unavailable state.

Sign-in now states the app's concrete purpose. Signup has one return action; recovery has Back to sign in, and reset adds Request a new code. These actions and form fields are disabled during a request. Recovery asks for the code before the new password. Password visibility resets between form modes. Email/password autocorrection is disabled by default, and code inputs request the documented one-time-code autofill hint. Verification clears the superseded code after resend and old errors on edits. Autofill and native keyboard behavior remain unverified. Browser checks reached code-request/reset-entry and signup validation; no password was changed through the UI.

Validation: TypeScript, lint, API compilation and final web/iOS/Android exports passed. The expanded 47-check suite adds independent stop failure paths, refresh-failure guidance, timestamp/expiry/accuracy cases and recipient-facing unknown accuracy. One validation run returned an unexplained 404 at password-recovery request and a consequent deletion failure; it was not reproduced in the next run or five consecutive complete reruns. Recovery assertions now include the error response for diagnosis. This intermittent result remains recorded rather than being claimed fixed.

Current score changes: sign-in 8.5 and signup 8.5 for reduced competing actions and explicit purpose. Recovery remains 8 because of the unreproduced acceptance failure. Walk setup and received walks remain 8.5; active walk remains 7.5 without physical-device movement/background evidence. Errors/recovery remains 8.5 while the intermittent recovery failure is unresolved. Other scores remain in the full table. No 9.8 certification is made.

References used before API changes: [SDK 57 location](https://docs.expo.dev/versions/v57.0.0/sdk/location/) and [React Native 0.86 TextInput](https://reactnative.dev/docs/0.86/textinput).

## Pass 7: functional visual hierarchy and report receipts

Home now uses a flat navy walk panel with a white primary action and one grouped Map/Report/Help list. The sapphire/white/lavender system retains compact system typography, functional icons and no orange, decorative images, serif editorial treatment, gradients or shadows. Shared input/secondary control borders have measured contrast above 3:1 against their surfaces. Keyboard focus outlines are explicit on buttons, chips, disclosures, action rows and password visibility controls. Browser Tab/Enter checks visibly selected and cleared map search.

The map precedes optional collapsed search, has three concise legend keys and gives an explicit no-match state. Reports and Help avoid asserting an empty database when initial loading failed. Report location validation now matches the server's campus-plus-surroundings bounds, including date-line campuses. Invalid points cannot advance or send. Pending report controls prevent editing and navigation during submission.

Reports preserve a UUID receipt in the per-user campus draft. A new migration adds an author/campus-scoped unique key. Concurrent identical submissions create one report; identical retries return that report, and different details using the same receipt return a conflict without overwriting it. An integration case checks concurrent submissions, replay, immutable contents and independent author scope.

Browser acceptance at 393 × 852 reached all four report steps using a fictional typed report and map-selected position, saved and reloaded it, and restored the same review details and step. No report was sent and no real location permission requested. At 320 × 740 Help had no horizontal document overflow; measured action/tab targets were 54–62 pixels tall. Account remained legible in its DOM structure. Home and Map visuals were inspected earlier in this pass. Final screenshot capture subsequently timed out repeatedly; no final screenshots or native visual acceptance are claimed.

Validation: mobile TypeScript and lint, API compilation, migrations, 51 automated tests, 21/21 Expo Doctor checks and web/iOS/Android exports passed. Native exports establish compilation only. Physical movement, background execution, actual calls, native keyboard/VoiceOver, production inbox delivery and novice comprehension remain unverified. The earlier intermittent recovery-test failure remains unresolved despite this passing run.

The conservative full-product score remains approximately 8.3/10 using the existing category table. Visual refinements are implemented, but the requested 9.8 in every category is not certified or assigned merely to end iteration. Browser recovery and accessibility evidence is stronger; device-dependent categories retain their limitations.

## Pass 8: visual guidance and regular email (October 6)

Home now has four large instructional SVG action tiles. Walk selection illustrates a phone sharing a position with people, then presents actual recipients as checkbox rows. Setup uses labeled SVG stages. Six report types are illustrated choices with border and check mark selection, rather than a text chip cluster. Privacy and sharing review use concise icon/value rows. A generated blue-hour campus path appears only on sign-in. Screens retain flat navy, sapphire, white and lavender styling.

Campus selection separates discovery from invitation entry. Campus registration derives website metadata from the official website instead of asking for an email domain. Any verified regular email can join with a valid invitation; registration, approval and ownership transfer preserve verification, authority review, membership and password controls. Two website identity tests and a regular-email integration journey were added. The full isolated API suite passed 54 tests after a remaining operator approval email-domain gate was found and removed.

Browser evidence: Home, report categories and sharing selection inspected at 393 × 852; report selection and walk stages exercised at 320 × 740. Report category selection updates aria-pressed; the 320-pixel report view has no horizontal document overflow. Native/web state semantics were repaired for checkbox, disclosure, progress and selected controls. Screenshots are saved in output/ui/iterations/*-visual-guidance.png. No report submitted, location shared or call made during this visual pass.

Validation: mobile typecheck and lint, API compilation and web/iOS/Android exports passed. Exports are compilation evidence, not native behavior verification. The full-product 9.8 target is not certified by this visual pass; native behavior and independent novice comprehension remain unverified.

## Pass 9: coherent mobile hierarchy (October 6)

The equal oversized Home illustration grid was replaced with a single walk feature, explicit setup button, compact Map/Report choices and a Help row. A restrained campus/phone/people SVG scene connects the product's sharing story across Home and walk setup; it is illustrative and never presented as measured navigation. Bottom navigation now spans the frame with a selected icon capsule instead of a floating bordered box. The header is more compact. Shared surfaces use consistent spacing and corners, and disclosure borders are lighter while text-input and button boundaries remain legible.

Setup uses connected stage markers without duplicate step text. Report categories are compact icon/label choices with an explicit selection check. Severity choices occupy one equal-width row. Report history uses a visual current-status strip derived from the server status; the details disclosure is compact and duplicated status explanations removed. Help uses distinct urgent/support icon groups and concise contact rows.

Browser acceptance: demo student sign-in, Home, Map, Help, Account, report category selection and all walk setup stages inspected. At 320 pixels Home and report categories have no horizontal document overflow; Home/account/tab touch targets are at least 54 pixels high. At 393 × 852 the screens were visually reviewed and screenshots saved as home-polished.png and walk-polished.png in output/ui/iterations. No new console warnings/errors were recorded. No location shared, report sent or phone call placed. Typecheck, lint and web/iOS/Android exports passed; native exports establish compilation only. Physical iPhone appearance, keyboard and background behavior remain unverified.

Direction: docs/design/POLISH_DIRECTION.md. This pass improves polish and visual storytelling; it does not establish 9.8 across the complete product or replace independent user comprehension testing.

## Pass 10: photographic context and unified typography (October 6)

Home now uses a photo-led walk feature with accessible interface text and a clear directional control. The generated adult campus-walk image supplies human campus context; it is illustrative, never a participating-campus photograph or a safe-route claim. The same image appears on sign-in, while the instructional phone/people SVG remains in walk setup. Secondary surfaces use quiet tints instead of heavy outlines. Canvas is white. Manrope regular, semibold, bold and extra-bold faces are bundled and loaded through Expo Font, with explicit face selection across app text and system fallback if loading fails; text-input typography is matched without altering icon fonts.

Account shows a profile identity row and compact campus identity/role/status rather than multiple status chips. Disclosure icons guide profile, campuses, privacy and deletion. Report category choices adapt to narrow viewports or larger native font scale. Browser inspection found SVGs shrinking beside long labels at 320 pixels; fixed-width icon containers and vertical narrow-screen choices correct that issue.

Validation: browser demo sign-in, Home, Account, all walk setup stages, report draft editing/restoration/category selection, Map and Help. Home and report choices have no horizontal document overflow at 320 pixels. Screenshots saved as home-photo-polish.png and account-photo-polish.png in output/ui/iterations. After the SDK patch restart, no new browser warning/error logs appeared. No report submitted, location shared, account changed or call placed. Typecheck and lint passed. Expo Doctor found four freshly released SDK 57 patches, aligned with expo install --fix (SDK remains 57), development server restarted, and 21/21 checks plus final web/iOS/Android exports passed. Native exports establish compilation, not physical iPhone verification.

Artwork and exact built-in generation prompt: mobile/assets/campus/campus-walk-v2.md. SDK references used: https://docs.expo.dev/versions/v57.0.0/sdk/font/ and https://reactnative.dev/docs/0.86/usewindowdimensions. The full-product 9.8 target remains uncertified; this pass supplies concrete visual and browser evidence rather than an invented rating.
