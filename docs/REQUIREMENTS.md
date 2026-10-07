# Competition traceability

Source: user-provided V05_Virtual_Mobile_Applications.pdf, release September 1, 2026, printed pages 71–75. The document is a competition reference, not an instruction to publish, register, or contact people automatically.

| Requirement / scoring area                   | Implementation / evidence                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| SafelyGo campus safety topic                 | Multi-campus mobile app, reports, directory, map, sharing                                         |
| External backend database                    | PostgreSQL SQL migrations, parameterized queries, Railway Docker deployment                       |
| Registration + account recovery              | Email/password, email verification, expiring one-use reset codes, session revocation              |
| Submit + view reports                        | Campus report form, own reports and staff-approved public summaries                               |
| Emergency contact directory                  | Campus-managed directory and confirmed dialing                                                    |
| Real-time location sharing                   | Opt-in expiring sessions, accepted contacts, foreground/background location task                  |
| Live campus safety map                       | Native Apple/Google maps, periodically refreshed reports and shared positions                     |
| Staff admin panel                            | Mobile-accessible staff console; reports, contacts, alerts, members, campus settings, audit       |
| External API                                 | Google Maps Android / Apple MapKit iOS native integration                                         |
| Mobile optimization / platform compliance    | Native inputs, keyboard handling, safe areas, accessible controls, device builds                  |
| Code quality / OOP / patterns                | Typed ApiClient, repository-like backend data access, transaction boundaries, reusable components |
| Secure database / functionality              | Hashed opaque sessions, scrypt passwords, parameterized SQL, tenant filters, role guards          |
| Documentation                                | README, architecture, API guide, deployment and testing guides                                    |
| Project plan / writing                       | PROJECT_PLAN.md, milestones, owner responsibilities, contingency strategies                       |
| Demonstration / logical patterns / interview | PRESENTATION.md with demo sequence and technical questions                                        |
| Copyright / AI citation                      | AI_USAGE.md, SOURCES.md, user-completed official forms required                                   |

## Submission checklist (human completion required)

- Advisor registration by December 1, 2026 at 11:59 p.m. Eastern; $10 fee per entry.
- Obtain contestant ID.
- Create one combined PDF named V05-ContestantID.pdf.
- Include a clickable URL giving judges access to a working Android/iOS app. App-store publication is not required.
- Include written project description, design concept, real application screenshots, Works Cited formatted under BPA's Style & Reference Manual, signed BPA Release Forms, and official AI Usage and Documentation Form.
- Page 72 specifies source code as a zipped root folder while the submission instructions say one combined PDF. Ask the advisor to confirm how to provide the ZIP through the upload system; include a source download link in the PDF and retain the ZIP.
- Cite all work, including your own, and secure releases for anyone whose image or work is used. Follow BPA Graphic Standards if using the organization's logo/name.
- Obtain the full Style & Reference Manual and AI policy; they were referenced but not included in the supplied PDF. Do not claim full compliance until reviewed.
- Upload by January 15, 2027 at 11:59 p.m. Eastern.
- Presentation: setup ≤3 minutes, presentation ≤10 minutes, questions ≤5 minutes.

Technical maximum: 310 points. Presentation maximum: 130 points. Following the topic and copyright/AI rules is mandatory to avoid disqualification.
