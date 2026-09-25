# SRS Changelog

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- **[7. Changelog](#7-changelog)** &larr; _You are here_

---

## 7. Changelog

### Demo 4 Requirements Baseline

- Reconciled the SRS against implemented authentication, organisation management, reusable-content, Campaign, trainee, adaptive, and AI-assisted workflows.
- Retained and revised `R1`-`R15`, `R18`-`R23`, and `R25`-`R27`.
- Removed `R16` trainee tags, `R17` administrator organisation-context editing, `R24` progress reset, and `R28` complete real-email Campaign operations from the Demo 4 commitment set.
- Narrowed `R26` to implemented Campaign statistics and `R27` to persisted supported audit and lifecycle events.
- Defined the final eight Demo 4 quality-requirement identifiers and measurable targets while leaving check mapping, traceability, and evidence to issue #574.
- Excluded Live Quiz and avoided carrying forward dated Demo 3 evidence or screenshots.

### Demo 4 User Flows

- Reconciled user stories and use cases with implemented account, creator, Campaign, trainee, adaptive, AI-assisted, assignment, and statistics flows.
- Removed planned tag assignment, progress reset, broad reporting and audit-review, Live Quiz, and complete real-email Campaign flows.

### Demo 4 Domain and Architecture

- Replaced the planned Demo 3 domain description with current reusable-content, Campaign graph, assignment, Quiz-attempt, adaptive-resolution, and organisation relationships.
- Documented the React, shared-contract, Express, service, repository, Prisma, PostgreSQL, AI-provider, and deployment boundaries implemented for Demo 4.
- Did not carry forward stale Demo 3 rendered diagrams or unsupported Campaign lifecycle and simulation flows.

### Demo 4 API and Data Boundaries

- Replaced the Swagger-only API summary with grouped contracts verified against current route modules and shared schemas.
- Added implementation-grounded privacy and data-boundary notes without creating the Privacy Policy owned by issue #571.
- Recorded current product limitations without presenting unsupported flows as future commitments.

### Demo 4 Trainee Guidance and Navigation

- Added text-only trainee guidance for account access, Campaign participation, Training Documents, repeated Quiz attempts, Simulated Inbox activities, and user-visible adaptive behaviour.
- Added Demo 4 to the repository documentation index and reconciled SRS, SAS, and trainee-manual navigation.
- Kept the absent administrator manual, standalone Privacy Policy, and issue #574 verification material as explicit dependencies rather than linking fabricated paths.

---

Previous section: [Domain Model](domain-model.md)

Back to the [SRS Home](README.md).
