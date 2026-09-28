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

- [2026-09-28 Local Verification](2026-09-28-local-verification.md) - LOCAL / PRE-RC evidence for revision `7f218f11a55b181f790876bfb55a77d6a28dbf38`; release performance and deployment remain unverified.

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
