# Demo 3 Non-Functional Verification

This section records how the Demo 3 quality requirements are checked. It connects the SRS quality requirements to repeatable commands, measurable targets, current evidence, and known follow-up work.

The NFR evidence is intentionally bounded. It records the command, environment, target, and result, but it does not include raw logs, secrets, credentials, raw tokens, rendered action links, private email addresses, or production traffic captures.

## Contents

1. [Purpose](#1-purpose)
2. [Verification Structure](#2-verification-structure)
3. [Current Evidence](#3-current-evidence)
4. [How to Read Results](#4-how-to-read-results)
5. [Related Documents](#5-related-documents)

---

## 1. Purpose

The Demo 3 NFR verification pack provides a practical assurance chain for the retained SRS quality requirements:

- `QR-AUTH-01`
- `QR-DATA-01`
- `QR-ACCESS-01`
- `QR-RELIABILITY-01`
- `QR-PERF-01`
- `QR-TRACE-01`
- `QR-AUDIT-01`
- `QR-DEPLOY-01`

Each row in the traceability matrix explains the quality target, the implemented tactic, the command or review evidence, the environment, and the current result.

## 2. Verification Structure

| Document                                                   | Purpose                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Traceability Matrix](traceability-matrix.md)              | Maps each retained QR to tactics, commands, targets, evidence, and follow-up status. |
| [Evidence Index](evidence/README.md)                       | Explains evidence retention rules and links to the current evidence summaries.       |
| [Current Evidence Summary](evidence/2026-08-21-summary.md) | Records the latest local command results and known failures for this NFR slice.      |

## 3. Current Evidence

The current evidence summary is [2026-08-21-summary.md](evidence/2026-08-21-summary.md).

At the time of this update:

- deterministic NFR checks pass;
- the performance check configuration passes dry-run validation;
- the accessibility check is executable, but currently reports one critical violation on the registration page;
- full local performance smoke was not run because it needs the frontend and backend services running.

## 4. How to Read Results

| Result   | Meaning                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| Pass     | The command or review met the defined Demo 3 target in the recorded environment.                                          |
| Fail     | The check ran and found a target miss. The failure should remain visible until the implementation or tactic is corrected. |
| Not run  | The check needs an environment, service, or data setup that was not available during this evidence pass.                  |
| Deferred | The quality topic remains important but is outside the implemented Demo 3 verification scope.                             |

## 5. Related Documents

- [SRS Quality Requirements](../srs/quality-requirements.md)
- [SAS Quality-to-Architecture Mapping](../sas/quality-architecture-mapping.md)
- [Testing Policy](../testing-policy.md)
- [Deployment and Operations](../sas/deployment.md)
- [Demo 3 Documentation Home](../README.md)

---

Back to the [Demo 3 Documentation Home](../README.md).
