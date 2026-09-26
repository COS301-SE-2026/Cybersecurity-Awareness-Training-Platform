# Quality-to-Architecture Mapping

This section maps the final Demo 4 quality requirements to architectural tactics, ownership areas, trade-offs, and the verification responsibility delegated to #574.

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- **[6. Quality-to-Architecture Mapping](#6-quality-to-architecture-mapping)** &larr; _You are here_
- [7. Technology Requirements](technology-requirements.md)
- [8. API Contracts](api-contracts.md)
- [9. Deployment and Operations](deployment.md)
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 6. Quality-to-Architecture Mapping

### 6.1 Purpose

Architecture contributes mechanisms and constraints; it does not prove that a quality requirement passed. This mapping explains where each requirement is carried and what kind of verification #574 must map and record.

### 6.2 Mapping Approach

Each row identifies the final SRS ID, architectural tactics, responsible implementation areas, expected verification class, and limitations. No evidence result is duplicated here. Static checks are described as static, browser checks as browser-runtime, and deployment checks as release-environment evidence.

### 6.3 Quality-to-Architecture Matrix

| Quality requirement                                                                                               | Architectural tactics                                                                                                                      | Responsible areas                                                                                                       | Verification class owned by #574                                                                        | Limits/trade-offs                                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`QR-AUTH-01`](../srs/quality-requirements.md#qr-auth-01-protected-access-and-authorisation-boundaries)           | Authentication middleware; named role/permission guards; organisation/resource scoping; minimal projections; safe-not-found where required | Express routes/middleware, controllers, services, scoped repositories, frontend route guards                            | Runtime access-control and negative integration tests; static route inventory only as support           | Middleware presence alone does not prove ownership checks; frontend guards are not security boundaries |
| [`QR-DATA-01`](../srs/quality-requirements.md#qr-data-01-sensitive-data-exclusion)                                | Safe DTOs; redacted audit metadata; hashed/secret storage boundaries; backend-owned AI context; bounded evidence scans; sanitizer policy   | Shared response schemas, account/token services, audit/email repositories, AI orchestration/provider boundary, logging  | Focused runtime response/redaction tests and bounded evidence scan                                      | A bounded scan does not prove every runtime log is clean                                               |
| [`QR-ACCESS-01`](../srs/quality-requirements.md#qr-access-01-accessible-selected-screens)                         | Semantic controls; keyboard-operable forms; visible focus; labelled validation; shared accessible components                               | React pages/features and component library                                                                              | Playwright + axe browser-runtime checks on selected public, trainee, and administrator screens          | Automated axe checks do not prove all assistive-technology usability                                   |
| [`QR-RELIABILITY-01`](../srs/quality-requirements.md#qr-reliability-01-reliable-single-use-and-lifecycle-actions) | Purpose-bound tokens; unique constraints; idempotency; transactions; durable notification state; convergent adaptive resolution            | Token/account/onboarding services, lifecycle services, assignment and Quiz services, repositories, database constraints | Focused runtime unit/integration tests for retry, stale state, concurrency, and failure                 | External delivery can fail; state must remain truthful and recoverable where supported                 |
| [`QR-PERF-01`](../srs/quality-requirements.md#qr-perf-01-responsive-representative-api-requests)                  | Bounded projections, indexes, repository queries, pagination, representative workload harness                                              | API, repositories, PostgreSQL indexes, performance script                                                               | Authenticated runtime measurement: 10 requests/route, concurrency 2, p95 <= 2000 ms, error rate <= 0.01 | Dry-run validates configuration only; local results do not prove production scale                      |
| [`QR-TRACE-01`](../srs/quality-requirements.md#qr-trace-01-documentation-traceability-and-link-integrity)         | Stable IDs; modular SRS/SAS; relative links; shared contracts; deterministic parity/link checks                                            | Demo 4 docs, shared package, #574 traceability matrix                                                                   | Deterministic ID/link/mapping validation                                                                | Documents can still become semantically stale despite valid links                                      |
| [`QR-AUDIT-01`](../srs/quality-requirements.md#qr-audit-01-scoped-and-truthful-audit-records)                     | Central audit service/repository; explicit outcomes; bounded context; lifecycle event persistence                                          | Sensitive account, organisation, permission, invitation, assignment, and lifecycle services                             | Focused runtime audit assertions plus supporting static inventory                                       | Persisted audit records do not imply a broad audit-review UI                                           |
| [`QR-DEPLOY-01`](../srs/quality-requirements.md#qr-deploy-01-repeatable-release-candidate-deployment)             | Immutable SHA images; separated environments; migration step; health checks; recorded previous revision; rollback scripts                  | Dockerfiles/Compose, deploy scripts, GHCR, PostgreSQL, Cloudflare routing, health endpoint                              | Exact #573 release-candidate build/deploy/health/rollback evidence                                      | Source/config inspection cannot prove deployment success                                               |

### 6.4 Cross-Cutting Tactics

- **Defence in depth:** route guards, service validation, and scoped repository operations protect separate boundaries.
- **Fail closed:** invalid tokens, stale lifecycle state, ineligible content, and cross-scope references do not mutate state.
- **Bounded data:** public DTOs, AI requests, audit metadata, and selector endpoints expose only required fields.
- **Stable identity:** immutable published content and Campaign occurrence identities protect historical runtime records.
- **Transactional consistency:** related persistence changes commit or fail together where partial state would be misleading.
- **Observability without secrets:** health and operational output report status without credentials or raw sensitive context.

### 6.5 Scope Boundaries

This mapping does not claim broad coverage percentages, complete API documentation, production-scale load, or release evidence. It does not add quality IDs beyond the final eight defined by #572. #574 owns executable mappings, the traceability matrix, and recorded results.

### 6.6 References

- [Demo 4 Quality Requirements](../srs/quality-requirements.md)
- [Architectural Requirements](architectural-requirements.md)
- [Architectural Patterns](architectural-patterns.md)
- [Design Patterns](design-patterns.md)
- [Deployment and Operations](deployment.md)

---

Previous section: [Design Patterns](design-patterns.md)

Next section: [Technology Requirements](technology-requirements.md)
