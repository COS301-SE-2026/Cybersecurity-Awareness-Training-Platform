# Changelog

This changelog records meaningful SRS-level changes from the earlier demonstration baselines to Demo 4. It is not a raw Git history and does not treat planned issue scope as delivered behaviour.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- **[7. Changelog](#7-changelog)** &larr; _You are here_
  - [7.1 Purpose](#71-purpose)
  - [7.2 Revision Summary](#72-revision-summary)
  - [7.3 Baseline Retained](#73-baseline-retained)
  - [7.4 Demo 4 Additions](#74-demo-4-additions)
  - [7.5 Demo 4 Updates](#75-demo-4-updates)
  - [7.6 Removed or Reduced Scope](#76-removed-or-reduced-scope)
  - [7.7 Documentation Structure](#77-documentation-structure)
  - [7.8 References](#78-references)

---

## 7. Changelog

### 7.1 Purpose

The purpose of this changelog is to explain how the SRS evolved from the initial trainee learning slice and the broader Demo 3 baseline into the implemented Demo 4 requirements. It identifies which foundations remain valid, which behaviours were expanded, and which planned capabilities were removed or narrowed after implementation review.

### 7.2 Revision Summary

| Revision period       | Area updated                   | Summary                                                                                                                                        |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Demo 1 baseline       | Trainee learning               | Established Simulated Inbox, Training Document, and Quiz participation as the first trainee-facing slice.                                      |
| Demo 2 baseline       | Accounts and organisations     | Added modular SRS structure, account access, organisation onboarding, administration, and platform governance.                                 |
| Demo 3 baseline       | Campaign administration        | Added Campaign management, assignment, unassignment, screenshots/manuals, detailed requirements, quality scenarios, and NFR documentation.     |
| Demo 4 reconciliation | Reusable content and Campaigns | Reconciled creators, lifecycle eligibility, grouping, Quiz occurrence settings, Active-to-Draft copy, and current statistics.                  |
| Demo 4 reconciliation | Adaptive and AI assistance     | Added deterministic adaptive occurrences, reusable-content AI drafting, missing variants, and transient complete/follow-up Campaign proposals. |
| Demo 4 finalisation   | Scope and consistency          | Removed unsupported planned claims and retained eight measurable quality requirements with #574-owned verification evidence.                   |

### 7.3 Baseline Retained

The following Demo 3 foundations remain part of Demo 4:

- modular SRS navigation and stable requirement grouping;
- registration, verification, login, logout, recovery, setup, and invitations;
- organisation registration review and lifecycle administration;
- organisation trainee, administrator, permission, and security-setting management;
- platform-administrator governance;
- trainee access to ordered Campaign items;
- Simulated Inbox, Training Document, and Quiz participation;
- direct organisation Campaign assignment and confirmed destructive unassignment;
- measurable quality-scenario structure for authorisation, data handling, accessibility, reliability, performance, traceability, auditability, and deployment.

### 7.4 Demo 4 Additions

- Added detailed reusable Training Document, Quiz, Organisation Email, and Simulated Inbox authoring/lifecycle requirements.
- Added repeated Quiz attempts with occurrence `maxAttempts` and `BEST`, `LATEST`, or `AVERAGE` scoring.
- Added canonical Campaign `COMPONENT`, `ADAPTIVE`, and `GROUP` structure, including direct-child restrictions and exact category-compatible alternatives.
- Added Active-to-Draft Campaign copy with fresh structural identities and no copied trainee runtime state.
- Added deterministic category state from accepted Quiz and Simulated Inbox evidence and persisted per-assignment adaptive resolution.
- Added AI-generated editable Draft data in normal reusable-content builders.
- Added bounded missing-variant generation with quality findings and normal review/save/activation.
- Added transient complete and follow-up Campaign proposals without automatic persistence or assignment.
- Added current trainee guidance and implementation-grounded SAS/API/data-boundary material.

### 7.5 Demo 4 Updates

- Updated platform terminology from premade Campaigns to platform Campaigns where that matches the current interface and ownership model.
- Updated organisation employee wording to organisation trainee and active assignment-candidate semantics.
- Updated Campaign management to use lifecycle-eligible reusable references rather than embedded or planned content.
- Updated Quiz requirements for single-choice/multiple-choice controls, repeated attempts, positional option labels, and occurrence scoring.
- Updated simulated-threat classification to `SAFE`, `SUSPICIOUS`, and `PHISHING` with supported warning-sign and link evidence.
- Narrowed statistics to implemented Campaign-scoped measures.
- Narrowed audit requirements to supported persistence and lifecycle timelines rather than an unimplemented broad review interface.
- Retained the final eight quality-requirement IDs while updating scenarios for selected Demo 4 surfaces and release ownership.

### 7.6 Removed or Reduced Scope

- Removed `R16` because trainee tags and tag-based assignment are not implemented.
- Removed `R17` as an administrator-editable organisation-context capability; backend-controlled approved context remains an AI boundary, not a separate editor.
- Removed `R24` and self-enrolment reset wording because Campaign progress reset is not implemented.
- Removed `R28` because partial phishing-portal and real-email artifacts do not form a complete launch, scheduling, pause, send, or monitoring workflow.
- Removed Live Quiz because no Live Quiz subsystem is present.
- Removed broad report filtering/export claims and broad audit/platform-oversight UI claims.
- Avoided copying stale screenshots into Demo 4 where they no longer exactly represent the current interface.

### 7.7 Documentation Structure

- Restored the explanatory depth, detailed navigation, user-class descriptions, functional subrequirements, and measurable quality scenarios of the Demo 3 SRS baseline.
- Retained existing requirement IDs where the capability remains represented, leaving removed IDs unused rather than renumbering unrelated requirements.
- Returned user stories to the readable numbered Demo 3 style instead of introducing artificial story identifiers.
- Kept NFR executable mapping, NFR traceability, and evidence under issue #574 rather than duplicating verification results in the SRS.
- Kept formal Privacy Policy wording under issue #571 and release-candidate evidence under issues #573/#574.

### 7.8 References

- [Demo 3 SRS Home](../../demo3/srs/README.md)
- [Demo 4 Introduction and Scope](introduction.md)
- [Demo 4 Functional Requirements](functional-requirements.md)
- [Demo 4 Use Cases](use-cases.md)
- [Demo 4 Quality Requirements](quality-requirements.md)
- [Demo 4 Domain Model](domain-model.md)
- [Demo 4 SAS](../sas/README.md)

---

Previous section: [Domain Model](domain-model.md)

Back to the [SRS Home](README.md)
