# Quality Requirements

This section defines the retained Demo 4 non-functional requirements as measurable quality scenarios. It preserves the Demo 3 scenario structure while updating affected artefacts and evidence ownership for the implemented product.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- **[5. Quality Requirements](#5-quality-requirements)** &larr; _You are here_
  - [5.1 Purpose](#51-purpose)
  - [5.2 Quality Requirement Format](#52-quality-requirement-format)
  - [5.3 Demo 4 Quality Requirement Set](#53-demo-4-quality-requirement-set)
  - [5.4 Quality Scenarios](#54-quality-scenarios)
  - [5.5 Verification Ownership](#55-verification-ownership)
  - [5.6 Deferred Quality Scope](#56-deferred-quality-scope)
  - [5.7 References](#57-references)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 5. Quality Requirements

### 5.1 Purpose

Quality requirements define how well Insightful Phish must behave while satisfying its functional requirements. Demo 4 retains measurable expectations for authorisation, sensitive-data handling, accessibility, reliability, performance, traceability, auditability, and deployment repeatability.

These requirements avoid claims such as "instant", "fully secure", or "always available" that cannot be verified mechanically. Each scenario identifies the stimulus, affected product area, required response, and pass condition. Static checks are not treated as proof of runtime behaviour.

### 5.2 Quality Requirement Format

Each retained requirement records:

- **Quality attribute:** the quality being evaluated;
- **Source of stimulus:** the actor, event, or condition initiating the scenario;
- **Stimulus:** the event the system must handle;
- **Environment:** the conditions under which it is checked;
- **Affected artefact:** the product surface being evaluated;
- **Response:** the required system behaviour;
- **Response measure:** the mechanical pass condition;
- **Verification approach:** the kind of repeatable check and evidence expected;
- **Traceability:** related functional or architecture material.

### 5.3 Demo 4 Quality Requirement Set

| ID                  | Quality requirement                           | Priority | Demo 4 verification focus                                                                                                      |
| ------------------- | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `QR-AUTH-01`        | Protected access and authorisation boundaries | High     | Selected protected Demo 4 routes reject unauthenticated, unauthorised, cross-user, and cross-scope access.                     |
| `QR-DATA-01`        | Sensitive-data exclusion                      | High     | Responses, logs, AI boundaries, audit context, and evidence exclude the listed secrets and unnecessary raw sensitive context.  |
| `QR-ACCESS-01`      | Accessible selected screens                   | High     | Selected public, trainee, and administrator screens support keyboard access and have zero critical axe violations.             |
| `QR-RELIABILITY-01` | Reliable single-use and lifecycle actions     | High     | Token, notification, assignment, and lifecycle operations are single-use or idempotent where required and avoid partial state. |
| `QR-PERF-01`        | Responsive representative API requests        | Medium   | Representative authenticated requests remain within the retained p95 and error-rate threshold.                                 |
| `QR-TRACE-01`       | Documentation traceability and link integrity | Medium   | SRS/SAS identifiers and local documentation links remain internally consistent.                                                |
| `QR-AUDIT-01`       | Scoped and truthful audit records             | High     | Supported sensitive actions produce scoped, redacted records that reflect the real outcome.                                    |
| `QR-DEPLOY-01`      | Repeatable release-candidate deployment       | Medium   | The exact release candidate builds, configures, deploys, and passes recorded health checks.                                    |

### 5.4 Quality Scenarios

#### `QR-AUTH-01` Protected Access and Authorisation Boundaries

| Field                 | Scenario                                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute     | Security and access control                                                                                                                                                        |
| Source of stimulus    | Unauthenticated user, user lacking the required permission, user requesting another trainee's data, or user from another organisation                                              |
| Stimulus              | The actor requests a protected account, organisation, content, Campaign, assignment, trainee-learning, or AI endpoint                                                              |
| Environment           | Running Demo 4 backend with representative users, organisations, memberships, assignments, and resources                                                                           |
| Affected artefact     | Selected protected frontend routes and backend API routes                                                                                                                          |
| Response              | The system authenticates the request, applies role/permission and ownership/scope checks, and withholds protected data when access is invalid                                      |
| Response measure      | Selected unauthenticated, unauthorised, cross-user, and cross-scope cases return the documented denial or safe-not-found outcome; authorised same-scope cases retain normal access |
| Verification approach | Runtime access-control and negative integration checks, supported by static middleware inventory checks that are labelled as static                                                |
| Traceability          | `R1`, `R2`, `R10`-`R15`, `R18`-`R23`, `R25`-`R27`; [Architecture Overview](../sas/architecture-overview.md)                                                                        |

#### `QR-DATA-01` Sensitive-Data Exclusion

| Field                 | Scenario                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute     | Security, privacy, and data minimisation                                                                                                                                                                       |
| Source of stimulus    | A normal or failed account, AI, audit, notification, deployment, or trainee-learning operation                                                                                                                 |
| Stimulus              | The system creates a response, log entry, audit record, queued notification, AI request, or verification evidence                                                                                              |
| Environment           | Application runtime and bounded release-verification output                                                                                                                                                    |
| Affected artefact     | API responses, logs, audit metadata, AI provider boundaries, durable email records, and NFR evidence                                                                                                           |
| Response              | The system excludes passwords, raw tokens, token hashes, provider credentials, deployment secrets, unnecessary request bodies, raw trainee history, and raw organisation context not approved for the boundary |
| Response measure      | Bounded mechanical scans and focused runtime assertions find none of the prohibited values; safe response schemas expose only required fields                                                                  |
| Verification approach | Sensitive-response tests, redaction/audit tests, AI-boundary tests, and bounded evidence scanning owned by #574                                                                                                |
| Traceability          | `R1`, `R9`, `R12`, `R14`, `R21`, `R25`, `R27`; [Privacy and Data Boundaries](../sas/privacy-and-data-boundaries.md)                                                                                            |

#### `QR-ACCESS-01` Accessible Selected Screens

| Field                 | Scenario                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute     | Accessibility and operability                                                                                                                                                |
| Source of stimulus    | Keyboard or assistive-technology user                                                                                                                                        |
| Stimulus              | The user navigates selected public, trainee, and administrator workflows                                                                                                     |
| Environment           | Supported browser at the viewport and authentication state defined by the executable check                                                                                   |
| Affected artefact     | Selected account pages, trainee Campaign/learning pages, and administrator management/authoring pages                                                                        |
| Response              | Interactive controls are keyboard reachable, focus remains visible and meaningful, labels and structure are available to accessibility tooling, and content remains operable |
| Response measure      | Selected screens have zero critical axe violations and complete the documented keyboard-focus assertions                                                                     |
| Verification approach | Browser-runtime Playwright and axe checks; static markup inspection alone is insufficient                                                                                    |
| Traceability          | `R1`-`R5`, `R10`-`R14`, `R18`-`R23`; [Trainee User Manual](../user-manual.md)                                                                                                |

#### `QR-RELIABILITY-01` Reliable Single-Use and Lifecycle Actions

| Field                 | Scenario                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quality attribute     | Reliability and transactional consistency                                                                                                                                                                    |
| Source of stimulus    | User retry, duplicate request, expired/superseded token, notification failure, concurrent adaptive resolution, or failed lifecycle transition                                                                |
| Stimulus              | A state-changing operation is retried, interrupted, duplicated, or concurrently requested                                                                                                                    |
| Environment           | Running backend with its configured database and supported notification infrastructure/mocks                                                                                                                 |
| Affected artefact     | Token actions, invitations, notification-backed workflows, enrolment/assignment, content/Campaign lifecycle, Quiz submission, and adaptive resolution                                                        |
| Response              | Single-use actions complete once, idempotent actions do not create duplicate state, transactional operations avoid partial state, and concurrent first adaptive resolution converges on one persisted result |
| Response measure      | Focused runtime checks observe one valid final state, no duplicate durable record where prohibited, and truthful recoverable failure behaviour                                                               |
| Verification approach | Existing token, notification, lifecycle, assignment, Quiz, and adaptive-resolution tests                                                                                                                     |
| Traceability          | `R1`, `R6`-`R9`, `R18`-`R23`; [Architecture Overview](../sas/architecture-overview.md)                                                                                                                       |

#### `QR-PERF-01` Responsive Representative API Requests

| Field                 | Scenario                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Quality attribute     | Performance efficiency                                                                               |
| Source of stimulus    | Authenticated representative client workload                                                         |
| Stimulus              | The client sends ten requests per configured representative route at concurrency two                 |
| Environment           | Recorded release environment with the prerequisite seeded data and authentication configuration      |
| Affected artefact     | Representative authenticated Demo 4 API routes selected by the performance harness                   |
| Response              | Requests complete without exceeding the retained latency and failure thresholds                      |
| Response measure      | p95 response time is at most 2000 ms and error rate is at most 0.01                                  |
| Verification approach | Runtime performance harness; dry-run validates configuration only and does not prove latency         |
| Traceability          | Retained cross-cutting responsiveness requirement; [Deployment and Operations](../sas/deployment.md) |

#### `QR-TRACE-01` Documentation Traceability and Link Integrity

| Field                 | Scenario                                                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute     | Maintainability and traceability                                                                                                                |
| Source of stimulus    | Reviewer or maintainer follows a Demo 4 identifier or local documentation link                                                                  |
| Stimulus              | The reader navigates between SRS, SAS, use cases, manuals, NFR mapping, and evidence                                                            |
| Environment           | Repository checkout for the release candidate                                                                                                   |
| Affected artefact     | Demo 4 Markdown documentation and referenced local artefacts                                                                                    |
| Response              | Retained identifiers are unique and consistent, local links resolve, and ownership boundaries identify where checks and evidence are maintained |
| Response measure      | Deterministic validation reports no duplicate/missing retained IDs and no missing local link targets in its documented scope                    |
| Verification approach | Deterministic documentation check owned by #574 plus bounded local-link validation                                                              |
| Traceability          | This SRS, [Demo 4 SAS](../sas/README.md), and the #574-owned NFR material when present                                                          |

#### `QR-AUDIT-01` Scoped and Truthful Audit Records

| Field                 | Scenario                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute     | Auditability and security accountability                                                                                              |
| Source of stimulus    | Actor performs a supported sensitive account, organisation, permission, invitation, assignment, or lifecycle action                   |
| Stimulus              | The action succeeds or reaches a supported audited failure outcome                                                                    |
| Environment           | Running backend with audit persistence available                                                                                      |
| Affected artefact     | Supported audit records and lifecycle event timelines                                                                                 |
| Response              | The system records the real actor, target, action, outcome, timestamp, scope, and bounded context without prohibited sensitive values |
| Response measure      | Selected runtime checks find the expected scoped record and truthful outcome, while `QR-DATA-01` prohibited values remain absent      |
| Verification approach | Existing focused runtime audit tests, with static inventory checks used only as supporting evidence                                   |
| Traceability          | `R7`-`R15`, `R18`-`R23`, `R27`; [Privacy and Data Boundaries](../sas/privacy-and-data-boundaries.md)                                  |

#### `QR-DEPLOY-01` Repeatable Release-Candidate Deployment

| Field                 | Scenario                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quality attribute     | Deployability and operability                                                                                                                        |
| Source of stimulus    | Release operator promotes the exact Demo 4 release-candidate revision                                                                                |
| Stimulus              | The operator runs the documented build, configuration, deployment, migration, and health procedure                                                   |
| Environment           | The identified target environment with required owner-provided infrastructure and secrets                                                            |
| Affected artefact     | Frontend, backend, shared package, database migration state, containers, routing, and health endpoints                                               |
| Response              | The exact revision builds and deploys, services become healthy, configured routes respond, and rollback inputs remain available                      |
| Response measure      | Every documented release check records PASS for the exact revision; unavailable environment evidence is recorded as unavailable rather than inferred |
| Verification approach | Release-candidate execution and evidence owned by #573/#574; source inspection alone does not prove deployment                                       |
| Traceability          | [Deployment and Operations](../sas/deployment.md)                                                                                                    |

### 5.5 Verification Ownership

This SRS owns the final eight quality-requirement IDs and their measurable wording. Issue #574 owns the executable-check mapping, NFR traceability matrix, evidence index, and recorded results. This separation prevents requirement definitions from being mistaken for proof that runtime behaviour passed.

Where a runtime environment, authenticated browser state, deployment target, or exact release candidate is unavailable, the corresponding evidence must say so explicitly. Static or dry-run checks may validate configuration but cannot replace runtime evidence.

### 5.6 Deferred Quality Scope

The Demo 4 completion baseline does not introduce additional requirements for broad test-coverage percentages, API/Swagger completeness, real-email adaptive evidence, Live Quiz, speculative AI quality, or production-scale load beyond the retained workload. These may be considered in later scope but do not alter the eight retained IDs.

### 5.7 References

- [Functional Requirements](functional-requirements.md)
- [Use Cases](use-cases.md)
- [Demo 4 SAS](../sas/README.md)
- [Architecture Overview](../sas/architecture-overview.md)
- [Deployment and Operations](../sas/deployment.md)
- [Privacy and Data Boundaries](../sas/privacy-and-data-boundaries.md)

---

Previous section: [Use Cases](use-cases.md)

Next section: [Domain Model](domain-model.md)
