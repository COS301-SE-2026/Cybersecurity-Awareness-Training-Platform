# Demo 1 Preliminary API Contracts

## Purpose

This document collects preliminary API contracts for Sprint 1 Demo 1. Contracts should support frontend, backend, SRS, domain, and testing alignment without becoming final production specifications.

## API Contract Principles (Rudolph)

### Preliminary Contract Baseline

### Request Summary Format

### Response Summary Format

### Common Error Responses

### Domain Entity References

### Requirement and Traceability References

## Base Feature Contracts (Rudolph)

### `POST /auth/register`

### `POST /auth/login`

### General Validation and Error Responses

These validation and error-response notes are preliminary and exist only to support Demo 1 SRS/design alignment. Final route names, response structures, status codes, and backend validation behaviour remain subject to the API contract owner’s refinement.

For Demo 1, expected validation and error-response categories may include:

- missing or invalid learner input;
- unanswered required quiz questions;
- unavailable training or quiz content;
- failed training document load;
- failed quiz submission;
- duplicate quiz submission attempt;
- failed quiz results or feedback load;
- unauthorised access to assigned learner content.

These categories support frontend feedback states and should not be treated as final backend implementation detail.

## UC-01: Simulated Inbox Contracts (Rudolph)

### `GET /simulations/inbox`

### `GET /simulations/emails/:emailId`

### `POST /simulations/emails/:emailId/interactions`

## UC-02: Training Document Contracts (Rudolph)

### `GET /training/assigned`

### `GET /training/:trainingId`

### `POST /training/:trainingId/progress`

## UC-03: Quiz Flow Contracts (Rudolph)

### `GET /quizzes/:quizId`

### `POST /quizzes/:quizId/attempts`

### `POST /quiz-attempts/:attemptId/submit`

### `GET /quiz-attempts/:attemptId/results`

## Supporting Admin/Campaign Context (Rudolph)

> [!NOTE]
> The following API endpoints are **preliminary placeholder contracts** only. They are documented to establish the necessary context for campaign-managed data and are **not** required backend endpoints for the Demo 1 implementation.

### `POST /campaigns`

Creates a new training campaign.

- **Request Summary:** `POST /campaigns`
- **Purpose:** Allows an administrator to initialize a new campaign entity.
- **Request Body:** `{ "name": "Q2 Phishing Awareness", "description": "Mandatory training", "status": "DRAFT" }`
- **Response Summary:** `201 Created` with `{ "campaignId": "uuid-123", "name": "Q2 Phishing Awareness", "status": "DRAFT" }`
- **SRS Reference:** FR-ADM-01
- **API Contract ID:** API-ADM-01

### `PATCH /campaigns/:campaignId`

Updates campaign metadata or status.

- **Request Summary:** `PATCH /campaigns/:campaignId`
- **Purpose:** Transitioning campaign lifecycle states (e.g., DRAFT to ACTIVE).
- **Request Body:** `{ "status": "ACTIVE" }`
- **Response Summary:** `200 OK`
- **SRS Reference:** FR-ADM-08
- **API Contract ID:** API-ADM-04

### `POST /campaigns/:campaignId/assign`

Assigns employees to a specific campaign.

- **Request Summary:** `POST /campaigns/:campaignId/assign`
- **Purpose:** Links a list of employees to the campaign for training delivery.
- **Request Body:** `{ "employeeIds": ["emp-001", "emp-002"] }`
- **Response Summary:** `200 OK` with `{ "success": true, "assignedCount": 2 }`
- **SRS Reference:** FR-ADM-02
- **API Contract ID:** API-ADM-02

### `POST /campaigns/:campaignId/content`

Links simulations or training modules to a campaign.

- **Request Summary:** `POST /campaigns/:campaignId/content`
- **Purpose:** Attaches training content (emails, docs, quizzes) to the campaign.
- **Request Body:** `{ "itemType": "SIMULATION", "itemId": "sim-001" }`
- **Response Summary:** `200 OK` with `{ "success": true }`
- **SRS Reference:** FR-ADM-03, FR-ADM-04, FR-ADM-05
- **API Contract ID:** API-ADM-03

### `GET /admin/templates`

Retrieves a list of available simulation templates.

- **Request Summary:** `GET /admin/templates`
- **Purpose:** Allows Admins to select pre-defined content for campaigns.
- **Response Summary:** `200 OK` with `[ { "templateId": "tmpl-001", "name": "Office 365 Spoof", "category": "Phishing" } ]`
- **SRS Reference:** FR-ADM-07
- **API Contract ID:** API-ADM-05

### `GET /admin/employees`

Retrieves a list of employees for campaign assignment.

- **Request Summary:** `GET /admin/employees`
- **Purpose:** Populates the employee selection interface in the admin panel.
- **Response Summary:** `200 OK` with `[ { "id": "emp-001", "name": "John Doe", "department": "HR" } ]`
- **SRS Reference:** FR-ADM-02
- **API Contract ID:** API-ADM-06

## Cross-References

### SRS

### Domain Diagrams

### Testing

### Traceability
