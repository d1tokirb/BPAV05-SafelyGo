# API reference

Base URL: your API domain + /api. JSON request bodies. Responses are JSON except 204. Errors: {"error":"Readable message","fields":{"fieldName":"Correction guidance"}}; fields is optional. Protected requests use `Authorization: Bearer SESSION_TOKEN`. All campus routes enforce membership; mutations enforce staff/owner roles as described.

| Method           | Path                              | Purpose                                                                                     |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| POST             | /auth/register                    | name, email, password (12–128 chars); returns user and token                                |
| POST             | /auth/login                       | email, password; returns user and token                                                     |
| POST             | /auth/forgot                      | email; generic response, schedules reset email                                              |
| POST             | /auth/reset                       | email, code (8 digits), password; revokes sessions                                          |
| POST             | /auth/verify                      | code; authenticated user                                                                    |
| POST             | /auth/resend                      | resend verification                                                                         |
| POST             | /auth/logout                      | revoke current session and all owned sharing                                                |
| GET/PATCH/DELETE | /me                               | identity + campuses; edit name; delete with password                                        |
| GET              | /campuses?q=search                | active campus discovery                                                                     |
| POST             | /campuses                         | name, domain, website, latitude, longitude, radiusM; pending campus                         |
| POST             | /campuses/join                    | campusId, joinCode                                                                          |
| PATCH            | /campuses/:campusId               | owner changes name, website, latitude, longitude, radiusM                                   |
| POST             | /campuses/:campusId/rotate-code   | owner rotates student invitation                                                            |
| GET/POST         | /campuses/:campusId/reports       | list authorized reports; submit title, description, category, severity, latitude, longitude |
| PATCH            | /campuses/:campusId/reports/:id   | staff changes status, publicSummary (nullable), staffNote                                   |
| GET/POST         | /campuses/:campusId/directory     | list; staff adds name, phone, description, priority                                         |
| PATCH/DELETE     | /campuses/:campusId/directory/:id | staff edits/deletes                                                                         |
| GET/POST         | /campuses/:campusId/alerts        | active announcements; staff creates title, body, hours                                      |
| DELETE           | /campuses/:campusId/alerts/:id    | staff removes announcement                                                                  |
| GET              | /campuses/:campusId/members       | staff member list                                                                           |
| PATCH/DELETE     | /campuses/:campusId/members/:id   | owner sets role student/staff or removes membership                                         |
| GET              | /campuses/:campusId/audit         | staff audit log                                                                             |
| GET/POST         | /contacts                         | list; invite by email, including people who have not registered                                                              |
| POST             | /contacts/:id/accept              | recipient accepts                                                                           |
| DELETE           | /contacts/:id                     | either party removes; location grant revoked                                                |
| GET/POST         | /sharing                          | list mine/incoming; create recipientIds and minutes (5–120)                                 |
| PUT              | /sharing/:id/location             | owner updates latitude/longitude; accuracy may be omitted or null when unknown                                                 |
| DELETE           | /sharing/:id                      | owner stops sharing                                                                         |

Public GET /health checks database connectivity. Campus report GET supports `?mine=true` for author-owned reports. Report categories: lighting, hazard, suspicious, harassment, theft, other. Concern levels: low, medium, high. Statuses: submitted, reviewing, resolved, dismissed.

Reports, campus discovery, members and audit GET endpoints accept an offset query parameter (nonnegative integer). Page sizes are 200 reports, 100 campuses, 500 members and 100 audit events.

## Campus administration and setup additions (October 5)

- `GET /platform-info`: verified account; returns operator eligibility, configured support address and approval steps.
- `GET /platform/campuses?status=pending|active|suspended&offset=0`: verified allowlisted platform operator; review queue (100 per page).
- `POST /platform/campuses/:id/review`: operator only; `{action: "approve"|"suspend"|"reactivate", reason, authorityConfirmed}`. Activation requires independent authority confirmation and a reason of 10–1000 characters. Actor, decision and owner-email queue entry commit together.
- `POST /campuses/:campusId/transfer-ownership`: current owner; `{memberId,password}`. Successor must be a verified campus staff member. Former owner becomes staff.
- `GET /places?q=...`: verified account; explicit campus search through configured `GEOCODER_SEARCH_URL`. Returns at most five `{name,latitude,longitude}` results. Disabled or failed provider returns readable 503 with map fallback.
- Campus create/update also accepts `emergencyPhone` and `supportEmail`. Discovery accepts an optional `domain` filter for campus website metadata. Any verified regular email may join with a valid campus invitation code.
- Invitations for unregistered recipients expire in 14 days. Verified recipients claim their pending invitations when opening contacts; acceptance is still explicit. Reinviting refreshes expiry and returns the existing invitation ID.
- Staff audit records include affected names and report before/after changes. Code replacement is audited without storing invitation codes in activity details.

Report submission accepts an optional UUID `requestId`. Mobile drafts preserve this ID across reloads and retries. The first successful submission returns 201; an identical retry by the same author in the same campus returns 200 with the original report. Concurrent identical requests create one report. Reusing that ID with different report details returns 409 without changing the received report. IDs are scoped to campus and author, and do not grant access to another user's report. Older clients may omit the ID.
