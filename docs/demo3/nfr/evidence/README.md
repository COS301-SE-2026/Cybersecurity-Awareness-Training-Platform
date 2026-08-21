# Demo 3 NFR Evidence Index

This folder stores small, reviewable summaries for Demo 3 non-functional checks. Evidence files should explain what was run, where it was run, what target was used, and what result was observed.

## Evidence Rules

- Keep evidence bounded and readable.
- Record failed, skipped, and not-run checks honestly.
- Do not include raw logs when a short summary is enough.
- Do not include secrets, credentials, raw tokens, token hashes, rendered action links, private email addresses, SMTP credentials, cookies, auth headers, full request bodies, raw provider responses, raw database errors, or production traffic captures.
- Link large generated artefacts only when they are intentionally retained and safe.

## Evidence Summaries

| Evidence file                                  | Scope                                                 | Result summary                                                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [2026-08-21-summary.md](2026-08-21-summary.md) | Initial Demo 3 NFR tooling and documentation evidence | Deterministic checks pass; performance dry-run passes; accessibility check runs with one registration-page failure; full performance and deployment checks are not run yet. |

## Related Documents

- [NFR Home](../README.md)
- [Traceability Matrix](../traceability-matrix.md)
- [SRS Quality Requirements](../../srs/quality-requirements.md)

---

Back to the [NFR Home](../README.md).
