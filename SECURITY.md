# Security

Please do not post passwords, verification codes, user data, database URLs, or exploitable vulnerability details in public issues.

Report vulnerabilities privately to the repository owner through GitHub private vulnerability reporting when enabled. Describe the affected feature, reproduction steps using fictional data, and potential impact. No guaranteed response time or bounty is offered.

Production deployment must disable demo access, use HTTPS, keep server credentials out of mobile bundles, and configure real operator/support details. Database migrations, tenant authorization, rate limits, mail delivery and account deletion are tested locally. Native permission behavior and hosted infrastructure require separate verification.

Known unresolved upstream mobile build-tooling advisories are recorded in `docs/RELEASE_HANDOFF.md`. API production dependencies are audited separately. Do not expose development servers to untrusted networks.
