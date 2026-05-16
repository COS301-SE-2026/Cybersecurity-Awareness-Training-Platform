# Simulated Inbox & Email APIs

This document outlines the backend implementation for UC-01 simulated inbox features, aligned with the revised modular campaign model.

## Domain Model Alignment

Simulated inboxes and emails are no longer globally owned by a user. Access is resolved through the campaign assignment chain:
`CampaignAssignment -> Campaign -> CampaignItem -> Simulation -> SimulatedInbox -> SimulatedEmail`

## Endpoints

### 1. GET /trainee/campaign-items/:campaignItemId/simulated-inbox

Returns the list of simulated emails for a specific campaign item.

- **Access**: Requires the trainee to be assigned to the campaign containing the item.
- **Filtering**: Automatically filters by the authenticated trainee's assignments.

### 2. GET /trainee/simulated-emails/:emailId

Returns the full content of a specific simulated email.

- **Access**: Validates access through campaign assignment.
- **Privacy**: Does NOT expose `expectedClassification` or `redFlags` before classification.

### 3. POST /trainee/simulated-emails/:emailId/interactions

Records interaction events for an email.

- **Event Types**: `SIMULATED_EMAIL_OPENED`, `SIMULATED_EMAIL_LINK_CLICKED`, `CREDENTIAL_SUBMISSION_ATTEMPTED`.
- **Validation**: Rejects invalid event types.

### 4. POST /trainee/simulated-emails/:emailId/classification (Optional/Future)

Records the trainee's classification of an email.

- **Creation**: Creates an `EmailClassificationResponse`.
- **Feedback**: Returns whether the classification was correct and reveals the email's red flags.

## Interaction Events

Interaction events are recorded with full campaign context:

- `traineeProfileId`
- `campaignAssignmentId`
- `campaignItemId`
- `simulatedEmailId`

## Security Measures

- **Rate Limiting**: Applied to all trainee endpoints to prevent abuse.
- **Data Isolation**: Multi-tenant access control ensures trainees only see their assigned content.
- **No Answer Leakage**: Sensitive fields like `expectedClassification` are stripped from trainee-facing responses until after classification.
