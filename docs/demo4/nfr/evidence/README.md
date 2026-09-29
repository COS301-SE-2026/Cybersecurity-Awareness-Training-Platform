# Demo 4 NFR Evidence Index

This directory stores small, reviewable summaries of Demo 4 NFR verification runs. No verification result is recorded by this index itself.

## Required Metadata

Every evidence summary must record:

- verification date and time zone;
- exact 40-character Git SHA and branch or release-candidate identifier;
- environment, operating context, and relevant non-secret configuration;
- exact command or release procedure;
- selected routes, screens, suites, or artefacts;
- mechanical threshold or expected result;
- observed PASS, FAIL, NOT RUN, or UNAVAILABLE result;
- limitations, blockers, skipped checks, and whether a result is static, local runtime, browser runtime, or release-environment evidence.

Evidence must not include credentials, bearer tokens, token hashes, provider responses, private keys, database URLs, cookies, raw request bodies, or unnecessary personal data. Run `pnpm nfr:security` after adding or updating evidence.

## Evidence Files

- [2026-09-28 Historical Pre-Merge Local Verification](2026-09-28-local-verification.md) - historical LOCAL / PRE-RC evidence for revision `6d6961d196d61d7d5d3732db83f5acd014c727d9`; its results and limitations apply only to that revision.
- [2026-09-28 Current-Revision Local Verification](2026-09-28-current-verification.md) - LOCAL / CURRENT-REVISION / PRE-RC evidence for revision `f37308008fb28b09b5050aba45e3f8cac647199d`; exact-RC performance and deployment remain outstanding.

Future summaries should use one of these forms:

- `YYYY-MM-DD-local-verification.md`
- `YYYY-MM-DD-release-candidate.md`

## Related Documents

- [NFR Home](../README.md)
- [Traceability Matrix](../traceability-matrix.md)
- [SRS Quality Requirements](../../srs/quality-requirements.md)
- [SAS Quality-to-Architecture Mapping](../../sas/quality-architecture-mapping.md)

---

Back to the [NFR Home](../README.md).
