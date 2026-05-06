# Demo 1 Traceability Table

## Purpose

This document links Demo 1 user stories, use cases, functional requirements, API contracts, domain entities, design artefacts, and QA/test planning.

## Traceability Scope (Johan)

### UC-01: View Emails in Simulated Inbox

Core Demo 1 Learner/Employee flow for viewing simulated inbox content determined by campaign assignment context.

### UC-02: View Training Document

Core Demo 1 Learner/Employee flow for opening and reading assigned training material.

### UC-03: Complete Quiz Flow

Core Demo 1 Learner/Employee flow for completing an assigned quiz and viewing results or feedback.

### Base Feature: Login/Register

Supporting access feature for the Learner/Employee flows.

### Base Feature: General Form Validation

Supporting validation and feedback behaviour for forms and quiz submission.

## Traceability Table

| Area                     | User Story              | Use Case                | Functional Requirements   | API Contracts                             | Domain Entities                  | Design/Wireframes                                            | QA/Test References                       | Owner   | Status             |
| ------------------------ | ----------------------- | ----------------------- | ------------------------- | ----------------------------------------- | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------- | ------- | ------------------ |
| UC-01: Simulated Inbox   | UC-01 user story in SRS | UC-01                   | FR-UC01-01 to FR-UC01-10  | API references in SRS/API                 | DE-UC01-01 to DE-UC01-06         | `DESIGN.md` Simulated Inbox and Email Detail sections        | QA-UC01-01 to QA-UC01-05                 | Adriano | Integrated draft   |
| UC-02: Training Document | UC-02 user story in SRS | UC-02                   | FR-UC02-01 to FR-UC02-10  | API references in SRS/API                 | DE-UC02-01 to DE-UC02-05         | `DESIGN.md` Training Module List and Material sections       | QA-UC02-01 to QA-UC02-05                 | Connor  | Integrated draft   |
| UC-03: Quiz Flow         | UC-03 user story in SRS | UC-03                   | FR-UC03-01 to FR-UC03-10  | API references in SRS/API                 | DE-UC03-01 to DE-UC03-07         | `DESIGN.md` Quiz Page, Submission, and Results sections      | QA-UC03-01 to QA-UC03-05                 | Zoë     | Integrated draft   |
| Admin Context            | US-ADM-01 to US-ADM-05  | Supporting context only | FR-ADM-01 to FR-ADM-10    | Admin API placeholders                    | DE-ADM-01 to DE-ADM-03           | Supporting admin context only; no stable design ID           | Supporting/future QA placeholder only    | Rudolph | Supporting context |
| Base: Login/Register     | Base feature only       | Base feature            | SRS Base Features section | `POST /auth/register`, `POST /auth/login` | Domain model User/access context | `DESIGN.md` Register and Login sections                      | QA-AUTH references in `testing.md`       | Shared  | Supporting context |
| Base: General Validation | Base feature only       | Base feature            | SRS validation sections   | General validation/error-response notes   | Not domain-specific              | `DESIGN.md` Feedback, Validation, and Accessibility UI Rules | QA-VALIDATION references in `testing.md` | Zoë     | Supporting context |

## Integration Notes (Johan)

### SRS References

- `docs/demo1/SRS.md` is the primary integrated requirements source for UC-01, UC-02, UC-03, base features, and supporting admin/campaign context.
- SRS traceability rows should not reference design IDs unless those IDs are explicitly defined in the design document.

### API References

- `docs/demo1/API.md` contains preliminary API contracts only.
- API references should be treated as planning placeholders, not final route or schema commitments.

### Domain References

- `docs/demo1/diagrams/demo1-domain-model-(initial).drawio` is the current domain model source file.
- Domain references are conceptual and should not be treated as final database schema or Prisma model names.

### Design and Wireframe References

- `docs/demo1/DESIGN.md` contains the current design and wireframe notes.
- `docs/demo1/wireframes/` indexes first-pass wireframe coverage.
- Use section references where stable design IDs do not exist.

### Testing References

- `docs/demo1/testing.md` contains QA planning and future test placeholders for UC-01, UC-02, UC-03, and base features.
