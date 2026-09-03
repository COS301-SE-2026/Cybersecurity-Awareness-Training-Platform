# Demo 3 Non-Functional Verification

This section records how the Demo 3 quality requirements are checked. It connects the SRS quality requirements to repeatable commands, measurable targets, current evidence, and known follow-up work.

## Contents

- [Demo 3 Non-Functional Verification](#demo-3-non-functional-verification)
  - [Contents](#contents)
  - [1. Purpose](#1-purpose)
  - [2. Verification Structure](#2-verification-structure)
  - [3. How to Read Results](#3-how-to-read-results)
  - [4. Related Documents](#4-related-documents)

---

## 1. Purpose

The Demo 3 NFR verification provides a practical assurance chain for the retained SRS quality requirements:

- `QR-AUTH-01`
- `QR-DATA-01`
- `QR-ACCESS-01`
- `QR-RELIABILITY-01`
- `QR-PERF-01`
- `QR-TRACE-01`
- `QR-AUDIT-01`
- `QR-DEPLOY-01`

## 2. Verification Structure

| Document                                                   | Purpose                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Traceability Matrix](traceability-matrix.md)              | Maps each retained QR to tactics, commands, targets, evidence, and follow-up status. |
| [Evidence Index](evidence/README.md)                       | Explains evidence retention rules and links to the current evidence summaries.       |
| [Current Evidence Summary](evidence/2026-08-21-summary.md) | Records the latest local command results and known failures for this NFR slice.      |

## 3. How to Read Results

| Result   | Meaning                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| Pass     | The command or review met the defined target in the recorded environment.                                                 |
| Fail     | The check ran and found a target miss. The failure should remain visible until the implementation or tactic is corrected. |
| Not run  | The check needs an environment, service, or data setup that was not available during this evidence pass.                  |
| Deferred | The quality topic remains important but is outside the implemented Demo 3 verification scope.                             |

## 4. Related Documents

- [SRS Quality Requirements](../srs/quality-requirements.md)
- [SAS Quality-to-Architecture Mapping](../sas/quality-architecture-mapping.md)
- [Testing Policy](../testing-policy.md)
- [Deployment and Operations](../sas/deployment.md)
- [Demo 3 Documentation Home](../README.md)

---

Back to the [Demo 3 Documentation Home](../README.md).
