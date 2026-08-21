# Quality-to-Architecture Mapping

This section maps the retained Demo 3 SRS quality requirements to the architectural tactics, implementation areas, checks, targets, and evidence used to verify them.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- **[6. Quality-to-Architecture Mapping](#6-quality-to-architecture-mapping)** &larr; _You are here_
  - [6.1 Purpose](#61-purpose)
  - [6.2 Mapping Approach](#62-mapping-approach)
  - [6.3 Quality-to-Architecture Matrix](#63-quality-to-architecture-matrix)
  - [6.4 Scope Boundaries](#64-scope-boundaries)
  - [6.5 Related Evidence](#65-related-evidence)
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Changelog](changelog.md)

---

## 6. Quality-to-Architecture Mapping

### 6.1 Purpose

The purpose of this mapping is to show how the architecture responds to the measurable quality requirements defined in the SRS. A quality requirement is not satisfied merely because a pattern or tool exists. It must be supported by a concrete tactic, a clear implementation area, an executable check or review activity, and evidence that records the current result.

### 6.2 Mapping Approach

Each mapping row names the retained SRS quality requirement, the tactic used to address it, the architecture or implementation area that carries the responsibility, the verification activity, and the current target or evidence status. The evidence links point to the Demo 3 NFR traceability matrix and the current evidence summary so that quality claims can be checked without repeating the full evidence in the SAS.

### 6.3 Quality-to-Architecture Matrix

| Quality requirement                                                    | Implemented tactic                                                                                                                                                                                              | Architecture or implementation area                                                                                                                         | Check or tool                                                                                                                     | Target and evidence                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QR-AUTH-01` Security and access control                               | Central authentication, rate-limit, role, ownership, and organisation-scope checks protect selected sensitive API and UI paths.                                                                                 | Express route modules, `requireAuth`, role middleware, account services, organisation services, and platform services.                                      | `pnpm nfr:deterministic` plus focused backend route and integration tests for sensitive access paths.                             | Protected route wiring must include the expected guard and rate-limit middleware, with behaviour tests covering cross-user and cross-organisation denial. Current deterministic evidence is recorded in the [NFR evidence summary](../nfr/evidence/2026-08-21-summary.md#1-deterministic-nfr-checks) and the [traceability matrix](../nfr/traceability-matrix.md#1-traceability-matrix). |
| `QR-DATA-01` Sensitive data privacy                                    | Sensitive values are excluded from bounded generated evidence, safe metadata, user-facing failures, and diagnostic output.                                                                                      | Audit log repository/service, account and token workflows, email outbox records, safe error mapping, and renderer/outbox diagnostics.                       | `pnpm nfr:security`, audit unit tests, and feature-specific sensitive-metadata assertions.                                        | Scanned evidence must not contain raw passwords, raw tokens, token hashes, SMTP credentials, cookies, auth headers, full request bodies, raw provider responses, or raw database errors. Current bounded scan evidence is recorded in the [NFR evidence summary](../nfr/evidence/2026-08-21-summary.md#1-deterministic-nfr-checks).                                                      |
| `QR-ACCESS-01` Accessibility                                           | Browser-based accessibility checks scan selected core public flows and verify keyboard focus where controls are present.                                                                                        | Frontend route and page layer for login, registration, password recovery, organisation registration, and status surfaces.                                   | `pnpm nfr:accessibility` using Playwright and axe-core.                                                                           | Selected surfaces target zero critical axe violations. Current evidence records one critical registration-page ARIA violation, so this requirement is executable but not yet passing in the [accessibility evidence](../nfr/evidence/2026-08-21-summary.md#2-accessibility-check).                                                                                                       |
| `QR-RELIABILITY-01` Reliable tokenised and notification-backed actions | Purpose-scoped tokens, transactional lifecycle updates, durable email outbox state, conservative retry classification, and lease ownership checks keep lifecycle actions single-use and recoverable where safe. | Account, authentication, setup, invitation, organisation onboarding, and async email delivery services and repositories.                                    | Backend unit and database-backed integration tests, with `pnpm nfr:deterministic` covering related static route and audit checks. | Expired, revoked, superseded, repeated, or wrong-purpose attempts must fail safely, and supported recoverable outbox failures must retry without duplicate accepted sends. Current evidence is linked from the [NFR evidence summary](../nfr/evidence/2026-08-21-summary.md#1-deterministic-nfr-checks).                                                                                 |
| `QR-PERF-01` Standard local request performance                        | A small performance smoke harness measures a fixed local route set against a p95 latency target and error-rate threshold.                                                                                       | `tools/nfr/check-demo3-performance.mjs`, backend health route, and selected public frontend routes.                                                         | `pnpm nfr:performance` or `pnpm nfr:performance:dry-run`.                                                                         | Full smoke target is p95 latency at or below `2000ms` and error rate at or below `0.01` across the default route set. Current evidence records a dry-run pass only; full local smoke still needs service-backed execution in the [performance evidence](../nfr/evidence/2026-08-21-summary.md#3-performance-check).                                                                      |
| `QR-TRACE-01` Maintainable traceability                                | Stable QR identifiers, relative Markdown links, NFR traceability rows, and deterministic checks keep requirements, evidence, and SAS claims aligned.                                                            | SRS quality requirements, NFR traceability matrix, SAS quality mapping, and the NFR deterministic checker.                                                  | `pnpm nfr:traceability -- --strict`.                                                                                              | Retained QR IDs must appear consistently and local SRS quality links must resolve. Strict traceability currently passes in the [deterministic evidence](../nfr/evidence/2026-08-21-summary.md#1-deterministic-nfr-checks).                                                                                                                                                               |
| `QR-AUDIT-01` Accountable audit review                                 | Sensitive actions write scoped audit records with compact safe metadata, and failed or stale paths must not create false success milestones.                                                                    | Audit log repository/service, onboarding timeline, account security flows, organisation lifecycle flows, and invitation workflows.                          | `pnpm nfr:audit`, backend audit unit tests, and feature-specific audit integration tests.                                         | Audit sanitisation must cover sensitive key fragments, and workflow tests must assert actor, target, outcome, transaction, and redaction behaviour. Current audit deterministic evidence is recorded in the [NFR evidence summary](../nfr/evidence/2026-08-21-summary.md#1-deterministic-nfr-checks).                                                                                    |
| `QR-DEPLOY-01` Deployment readiness and reproducibility                | Deployment configuration, environment examples, health checks, and documented boundaries make the release path repeatable without storing secrets in source control.                                            | Deployment and Operations, Technology Requirements, Docker Compose files, package scripts, environment examples, and the existing host-bootstrap direction. | Docker Compose configuration checks, build/typecheck commands, deployment documentation review, and release preparation checks.   | Required configuration must be documented, secrets must stay out of source control, and operational detail must remain in deployment documentation. Current evidence records this as a manual/release check in the [deployment reproducibility evidence](../nfr/evidence/2026-08-21-summary.md#4-deployment-reproducibility-check).                                                      |

### 6.4 Scope Boundaries

This mapping records implemented or executable Demo 3 quality tactics. It does not claim completed audit-review dashboards, production-scale load testing, production traffic capture, or a completed deployment run. Deployment reproducibility is linked to the existing host-bootstrap direction and deployable configuration, while exact ports, topology, commands, and operational procedures remain in the deployment documentation.

### 6.5 Related Evidence

- [SRS Quality Requirements](../srs/quality-requirements.md)
- [Demo 3 NFR Traceability Matrix](../nfr/traceability-matrix.md)
- [Current NFR Evidence Summary](../nfr/evidence/2026-08-21-summary.md)
- [Testing Policy](../testing-policy.md)
- [Deployment and Operations](deployment.md)

---

Previous section: [Design Patterns](design-patterns.md)

Next section: [Technology Requirements](technology-requirements.md)
