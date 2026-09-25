# Quality Requirements

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- **[5. Quality Requirements](#5-quality-requirements)** &larr; _You are here_
- [6. Changelog](changelog.md)

---

## 5. Quality Requirements

These eight requirements are the final Demo 4 quality-requirement set. Each defines a mechanical pass condition. Issue #574 owns the executable-check mapping, NFR traceability matrix, and recorded release evidence; this SRS does not treat a static check or dry run as proof of runtime behaviour.

### `QR-AUTH-01` Protected Access and Authorisation Boundaries

- **Scope:** Selected protected Demo 4 routes covering trainee, organisation, and platform operations.
- **Required response:** Unauthenticated requests are rejected, and authenticated requests cannot cross user, organisation, ownership, role, or permission boundaries.
- **Pass condition:** Every selected positive access case succeeds with its expected status, while every selected unauthorised or cross-scope case returns the route's defined denial or safe-not-found status and exposes no protected resource data.

### `QR-DATA-01` Sensitive-Data Exclusion

- **Scope:** API responses, application logs, audit metadata, AI request boundaries, and recorded verification evidence.
- **Required response:** These artefacts exclude passwords, submitted credentials, raw authentication or action tokens, token hashes, provider secrets, model credentials, raw trainee history, and raw organisation context not approved for that boundary.
- **Pass condition:** Bounded checks of the selected artefacts find zero instances of the listed prohibited data, and AI requests contain only the approved provider-neutral contract and backend-controlled context.

### `QR-ACCESS-01` Accessible Selected Screens

- **Scope:** Selected public, trainee, and administrator screens used in core Demo 4 journeys.
- **Required response:** Interactive controls are keyboard reachable and operable, visible focus is retained, and controls expose names and semantic roles.
- **Pass condition:** Each selected screen completes its keyboard assertions and reports zero critical axe violations in the supported browser test environment.

### `QR-RELIABILITY-01` Reliable Single-Use and Lifecycle Actions

- **Scope:** Token consumption, notification-backed workflows, and content, Campaign, assignment, and organisation lifecycle transitions that require atomicity or idempotency.
- **Required response:** A valid action completes once; duplicate, stale, invalid, or concurrent attempts do not create duplicate success state; a failed operation does not leave a falsely completed partial state.
- **Pass condition:** Selected runtime checks prove the expected final state and side-effect count for success, retry, duplicate, stale, failure, and concurrency cases applicable to each action.

### `QR-PERF-01` Responsive Representative API Requests

- **Scope:** The representative authenticated Demo 4 API route set executed against the documented seeded verification environment.
- **Required response:** Requests complete successfully within the retained workload threshold.
- **Pass condition:** Across 10 requests per route at concurrency 2, measured p95 response time is no more than 2000 ms and error rate is no more than 0.01. Configuration-only dry runs do not satisfy this requirement.

### `QR-TRACE-01` Documentation Traceability and Link Integrity

- **Scope:** Final Demo 4 SRS and SAS identifiers, navigation, references, and local Markdown links.
- **Required response:** Identifiers are unique and consistently referenced, and local links resolve to the intended repository artefacts.
- **Pass condition:** Mechanical identifier and local-link checks report zero duplicate retained identifiers, unresolved retained references, or broken local links in the final Demo 4 documentation set.

### `QR-AUDIT-01` Scoped and Truthful Audit Records

- **Scope:** Supported sensitive account, organisation, permission, invitation, assignment, and lifecycle actions.
- **Required response:** Audit records identify the action, outcome, timestamp, actor and target where applicable, and tenant scope, while retaining only compact redacted metadata. Failed or stale operations do not create false success records.
- **Pass condition:** Selected runtime action checks produce the expected scoped audit record and outcome, and prohibited sensitive values listed by `QR-DATA-01` are absent.

### `QR-DEPLOY-01` Repeatable Release-Candidate Deployment

- **Scope:** The exact Demo 4 release-candidate revision and its documented deployment environment.
- **Required response:** The revision installs from its lockfile, builds, accepts the required configuration without committed secrets, deploys through the documented process, and exposes the expected health checks.
- **Pass condition:** One recorded run identifies the exact revision and environment and shows successful build, configuration validation, deployment, and required health-check results. This requirement remains unverified until issue #573 identifies the release candidate and issue #574 records that run.

---

Previous section: [Use Cases](use-cases.md)

Next section: [Changelog](changelog.md)
