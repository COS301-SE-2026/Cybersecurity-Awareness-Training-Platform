# Demo 4 Non-Functional Verification

This pack maps the quality requirements defined by the Demo 4 SRS to repeatable verification commands, measurable targets, and recorded evidence. It does not redefine the requirements or treat static inspection as proof of runtime behaviour.

## Verification Sources

- The [SRS Quality Requirements](../srs/quality-requirements.md) are authoritative for requirement IDs, scope, and response measures.
- The [SAS Quality-to-Architecture Mapping](../sas/quality-architecture-mapping.md) identifies the architectural tactics and responsible system areas.
- The [Traceability Matrix](traceability-matrix.md) maps each requirement to commands, thresholds, and evidence responsibility.
- The [Evidence Index](evidence/README.md) defines evidence metadata and links recorded verification runs.

## Verification Classes

| Class                   | Meaning                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static or deterministic | Inspects repository content, configuration, route declarations, identifiers, or documentation links. It does not prove runtime behaviour.               |
| Local runtime           | Executes backend, browser, or integration checks in a recorded local or CI test environment. Results apply only to the tested revision and environment. |
| Release candidate       | Executes build, performance, deployment, migration, routing, health, and rollback checks against the exact candidate identified by issue #573.          |

Every recorded result must identify its class. A dry-run may prove that a harness is configured, but it is not runtime performance evidence. Missing infrastructure or authentication state is recorded as unavailable rather than inferred as passing.

## Evidence

Evidence summaries live under [`evidence/`](evidence/README.md) and use a date and scope in the filename, for example:

- `YYYY-MM-DD-local-verification.md`
- `YYYY-MM-DD-release-candidate.md`

Issue #573 identifies the exact release candidate. Release-dependent evidence cannot be completed until that revision and its target environment are available.

---

Back to the [Demo 4 Documentation Home](../README.md).
