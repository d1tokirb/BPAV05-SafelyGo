# SafelyGo project plan

SafelyGo serves independent campuses. React Native + Expo clients communicate with a Railway-ready Node API and PostgreSQL. Institutional email verification and campus invitation codes establish membership. Platform review establishes campus authority.

## Design

Palette: navigation blue #174CCB; ink #15294A; sky #EFF5FF; white #FFFFFF; danger #B42335; sharing green #167253. Use platform system typography, large readable headings, minimum 48-pixel controls, explicit labels, safe areas, and a restrained route-line identity. The safety map is the principal spatial tool. Emergency calls require a confirmation and show the actual directory number. Reports are not emergency dispatch.

## Milestones and accountability

The contestant owns implementation, testing, citations, and presentation. The advisor owns competition registration and confirms submission mechanics. The platform operator verifies campus authority. Campus owners maintain emergency numbers and delegate staff.

| Target       | Deliverable                                 | Acceptance                                         |
| ------------ | ------------------------------------------- | -------------------------------------------------- |
| Oct 14, 2026 | Architecture, schema, authentication        | Verification, recovery, tenant isolation tested    |
| Oct 28       | Campus registration and student onboarding  | Two independent campuses, approval and joining     |
| Nov 11       | Reports, live map, staff administration     | Submit, review, publish, resolve and audit         |
| Nov 25       | Consent-based live location sharing         | Two devices, permission denial, expiry, revocation |
| Dec 1        | Advisor registers competition entry         | Registration receipt and contestant ID             |
| Dec 9        | Real-device deployment and usability review | Android/iOS device evidence, accessibility review  |
| Dec 23       | Feature freeze and submission draft         | Screenshots, source ZIP, citations, release forms  |
| Jan 8, 2027  | Presentation rehearsal and final QA         | 10-minute demo plus 5-minute questions             |
| Jan 15       | Submit combined PDF by 11:59 p.m. Eastern   | Upload confirmation retained                       |

## Contingencies

Reserve the final week for corrections. Keep tested preview binaries and demo accounts available for judging. If SMTP fails, transactional outbox retries; monitor delivery and age of queued mail. If map networking fails, reports remain available as a list. If location permission is refused, sharing does not start. Mark stale locations explicitly; never imply uninterrupted tracking after OS termination. Back up PostgreSQL and rehearse restoring to a separate database before public launch.
