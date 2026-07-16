# Demo 1 API Contract Summary

## Purpose

This document is the Demo 1 API contract summary. It does not replace the Swagger API documentation.

The API is trainee-campaign oriented. Campaigns provide access and sequencing, and campaign items resolve the training document, quiz, and simulated inbox content used by the Demo 1 frontend.

Full request schemas, response schemas, examples, status codes, and implementation-level details are maintained in the running backend Swagger/OpenAPI documentation.

## Swagger / OpenAPI Documentation

The backend API is documented through Swagger/OpenAPI for interactive inspection during development. When the backend is running locally, Swagger is typically available at:

`http://localhost:4000/api-docs`

Swagger should be treated as the full interactive implementation-level API reference. This `API.md` file summarises the Demo 1 contract, use-case traceability, and high-level frontend expectations at a stable documentation level.

## Contract Status Legend

| Status                     | Meaning                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| Demo 1 required            | Needed for one of the three Demo 1 trainee use cases                          |
| Demo 1 optional/supporting | Supports access, tracking, or usability, but is not a counted Demo 1 use case |
| Future/later-demo          | Directional only; not required for Demo 1 implementation                      |

## Base Feature Contracts

Base feature endpoints support access to the Demo 1 trainee flow.

### `POST /auth/register`

- **Purpose**: Registers a new general trainee account
- **Status**: Demo 1 optional/supporting
- **Request**: `email`, `password`, `firstName`, and `lastName`
- **Success response**: `201 Created` with a public `user` object
- **Notes**: Email is normalised by shared validation. Registration does not return a login token: The user logs in separately.

### `POST /auth/login`

- **Purpose**: Authenticates an active user
- **Status**: Demo 1 optional/supporting
- **Request**: `email` and `password`
- **Success response**: `200 OK` with public `user`, `token`, `tokenType: "Bearer"`, and `expiresAt`
- **Notes**: Invalid credentials or inactive accounts return an authentication error.

### `GET /auth/me`

- **Purpose**: Returns the current authenticated user's public identity and profile context
- **Status**: Demo 1 optional/supporting
- **Request**: Requires `Authorization: Bearer <token>`
- **Success response**: `200 OK` with `{ user }`
- **Notes**: Used by the frontend to restore authenticated user context.

## Trainee Campaign Access

Campaign access endpoints allow the trainee frontend to discover available campaigns and campaign item IDs. They do not replace the activity-specific endpoints for simulated inbox, training, or quiz content.

### `GET /trainee/campaigns`

- **Purpose**: Lists campaigns assigned or available to the authenticated trainee
- **Status**: Demo 1 required for campaign discovery
- **Access**: Requires Bearer auth and an active trainee profile
- **Response summary**: A list of campaign summaries with assignment status, access type, item counts, availability counts, and high-level progress metadata
- **Frontend use**: Populates the trainee campaign/dashboard view and allows empty-state handling

### `GET /trainee/campaigns/:campaignId`

- **Purpose**: Retrieves one accessible campaign and its ordered campaign item tree
- **Status**: Demo 1 required for campaign-item navigation
- **Access**: The authenticated trainee must have an allowed assignment for the requested campaign
- **Response summary**: Campaign metadata, assignment summary, ordered items/groups, availability status, `isOpenable`, and activity API paths for supported item types
- **Frontend use**: Builds navigation to the campaign-item scoped UC-01, UC-02, and UC-03 routes

Representative campaign item fields include:

- `campaignItemId`
- `title`
- `position`
- `itemType`
- `availabilityStatus`
- `isRequired`
- `isOpenable`
- `activityApiPath`
- Optional content summary for the placed training document, quiz, or simulation

Full campaign response schemas are maintained in Swagger/OpenAPI.

## UC-01: Simulated Inbox and Email Contracts

UC-01 covers viewing and opening controlled simulated emails in a campaign-provided simulated inbox. Email classification is future/optional unless explicitly selected for a later demo.

### `GET /trainee/campaign-items/:campaignItemId/simulated-inbox`

- **Purpose**: Retrieves the simulated inbox attached to a trainee-accessible campaign item
- **Status**: Demo 1 required
- **Access**: Campaign-item scoped: The backend resolves trainee access through campaign assignment
- **Response summary**: An `emails` array of simulated email summaries
- **Important fields**: Each summary includes `id`, `campaignAssignmentId`, `campaignItemId`, `inboxId`, `senderLabel`, `senderAddress`, `subject`, optional `preview`, `receivedAt`, `difficultyLevel`, and `isOpened`
- **Frontend use**: Renders the inbox list and unread/opened styling

> `isOpened` is derived from backend `SIMULATED_EMAIL_OPENED` interaction events for the same trainee/campaign assignment/campaign item/email context.
> The inbox summary does not expose expected classification or correct red flags before the intended feedback flow.

### `GET /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId`

- **Purpose**: Retrieves one simulated email that belongs to the campaign-item simulated inbox
- **Status**: Demo 1 required
- **Access**: The `emailId` alone is not sufficient: The email must belong to the simulated inbox placed in the accessible campaign item
- **Response summary**: Sender, subject, preview, HTML body, attachment flag, simulated link target where present, and received date
- **Security note**: Trainee-facing email responses must not expose expected classification or correct red flags before intended classification feedback

### `POST /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId/interactions`

- **Purpose**: Records a safe simulated email interaction
- **Status**: Demo 1 optional/supporting tracking
- **Request**: `{ eventType: "SIMULATED_EMAIL_OPENED" }` for the core Demo 1 opened event
- **Success response**: Confirms the interaction was recorded or already represented
- **Idempotency**: Reposting `SIMULATED_EMAIL_OPENED` for the same trainee/campaign assignment/campaign item/email context is idempotent and must not create another opened event

### `POST /trainee/campaign-items/:campaignItemId/simulated-emails/:emailId/classification`

- **Purpose**: Records a trainee classification judgement for a simulated email
- **Status**: Future/later-demo
- **Request summary**: Selected classification and optional reasoning/red-flag selections
- **Response summary**: Classification feedback, correctness, and red-flag feedback where supported
- **Scope note**: Classification remains separate from quiz attempts

## UC-02: Training Document Contracts

UC-02 covers opening and reading a campaign-item scoped training document.

### `GET /trainee/campaign-items/:campaignItemId/training-document`

- **Purpose**: Retrieves the training document placed at a trainee-accessible campaign item
- **Status**: Demo 1 required
- **Access**: Campaign-item scoped; the backend resolves trainee access through campaign assignment
- **Response summary**: `campaignItemId`, optional `campaignAssignmentId`, campaign item metadata, and `trainingDocument`
- **Training document fields**: `id`, `title`, `contentType`, `contentRef`, optional `content`, summary, estimated read time, difficulty, and status
- **Frontend use**: Renders the returned `trainingDocument.content` according to `contentType`

For Demo 1, backend-served `MARKDOWN` content is supported. `contentRef` is opaque and must not be resolved by the frontend. `content` may be `null` when the backend cannot safely resolve the reference or the content type is unsupported.

### `POST /trainee/campaign-items/:campaignItemId/training-document/viewed`

- **Purpose**: Records a `TRAINING_VIEWED` interaction for the campaign item
- **Status**: Demo 1 optional/supporting tracking
- **Request**: No body required
- **Success response**: Confirms the viewed event and related campaign item/training document IDs

### `POST /trainee/campaign-items/:campaignItemId/training-document/completed`

- **Purpose**: Records a `TRAINING_COMPLETED` interaction for the campaign item
- **Status**: Demo 1 optional/supporting
- **Request**: No body required
- **Success response**: Confirms the completed event and related campaign item/training document IDs

## UC-03: Quiz Flow Contracts

UC-03 covers quiz retrieval, attempt creation, answer submission, and result retrieval.

### `GET /trainee/campaign-items/:campaignItemId/quiz`

- **Purpose**: Retrieves quiz content placed at a trainee-accessible campaign item
- **Status**: Demo 1 required
- **Access**: Campaign-item scoped; the backend resolves trainee access through campaign assignment
- **Response summary**: Quiz metadata, questions, and answer options needed to render the quiz
- **Security note**: Pre-submission quiz retrieval must not expose correct answers, awarded points, or answer feedback

### `POST /trainee/campaign-items/:campaignItemId/quiz/attempts`

- **Purpose**: Starts a quiz attempt for the quiz placed at the campaign item, or returns the existing latest `IN_PROGRESS` attempt for the trainee if one already exists
- **Status**: Demo 1 required
- **Request**: No body required; trainee, campaign assignment, campaign item, and quiz context are resolved server-side
- **Success response**: Attempt ID, status, campaign assignment/item context, and start time
- **Idempotency**: The frontend should not assume every call creates a fresh attempt. This start-or-reuse behaviour is intentional so page load and retry flows can call the endpoint safely.

### `POST /quiz-attempts/:attemptId/submit`

- **Purpose**: Submits final answers for an existing quiz attempt
- **Status**: Demo 1 required
- **Request summary**: Submitted answers for quiz questions; exact schema is defined in Swagger/shared DTOs
- **Success response**: Submitted attempt state and backend-calculated result summary
- **Notes**: Submitted attempts become read-only. Duplicate or invalid submissions return a conflict or validation error.

### `GET /quiz-attempts/:attemptId/results`

- **Purpose**: Retrieves result and educational feedback for a submitted quiz attempt
- **Status**: Demo 1 required
- **Access**: The attempt must belong to the authenticated trainee
- **Response summary**: Score, pass/fail status, attempt summary, selected answers, correctness, and educational feedback
- **Notes**: Results are calculated server-side; the frontend displays returned result data rather than calculating the score itself

## Later-Demo Invitation Acceptance Contracts

The following contracts support Demo 2 invitation acceptance planning and are cross-referenced from the SRS. Full implementation-level schemas, request examples, and status codes remain in Swagger/OpenAPI and the related implementation issues.

### UC-07: Accept Organisation Invitation

- **Purpose**: Supports viewing safe invitation context and completing token-driven acceptance for initial organisation admin setup, organisation employee invites, and organisation admin promotion invites.
- **Status**: Future/later-demo
- **Planned API support**: Public token context and completion endpoints for token-based invitation acceptance; organisation-admin promotion invite creation remains in the organisation-admin management flow.
- **Current route terminology**: The backend setup flow currently exposes `/setup/token/:token/context` and `/setup/token/:token/complete` for invite/setup-token completion, while promotion invitations are created through organisation-admin routes and tokenised invite delivery.
- **Access**: The public invitation page is token-based and rate-limited. Acceptance succeeds only when the token is valid, the invitation purpose is supported, and the current or created account matches the invitation target identity.
- **Notes**: Backend behaviour must preserve organisation scope, single-use token consumption, hashed-token storage, invitation expiry/revocation handling, wrong-user protection, central email-service delivery, and safe error states for expired, revoked, already-used, or unsupported invitations.
- **Traceability**: `#263`, `#262`, `#264`, `#265`, `#266`, `#270`

## Later-Demo Organisation Admin Contracts

The following contracts support Demo 2 organisation-admin planning and are cross-referenced from the SRS. Full implementation-level schemas, request examples, and status codes remain in Swagger/OpenAPI and the related implementation issues.

### UC-09: Organisation Admin Management

- **Purpose**: Supports viewing organisation admins, promoting active organisation trainees to admins, changing organisation admin permissions, and removing organisation admin privileges.
- **Status**: Future/later-demo
- **Planned API support**: Organisation admin list, promotion, permission update, and removal endpoints.
- **Access**: Requires an authenticated active organisation admin in the same organisation, with the required admin-management permission for the selected action.
- **Notes**: Backend behaviour must preserve organisation scope, critical-admin safeguards, email-service invitation delivery, and audit logging.
- **Traceability**: `#273`, `#272`, `#274`, `#275`, `#276`, `#280`

### UC-11: Organisation Security Settings

- **Purpose**: Supports viewing and updating organisation-level security settings for remember-me policy, session length, idle timeout, sensitive-action reauthentication, and trainee email-change policy.
- **Status**: Future/later-demo
- **Planned API support**: Organisation security settings view/update endpoints and authentication/session policy enforcement.
- **Access**: Requires an authenticated active organisation admin in the same organisation; updates require `Change organisation-level security settings`.
- **Notes**: Backend behaviour must enforce platform limits, reject conflicting settings, audit old/new values, and explain when saved settings apply to sessions.
- **Traceability**: `#285`, `#284`, `#286`, `#287`, `#288`, `#291`

## Cross-Use-Case Tracking and Reporting Support

Interaction events support lightweight tracking across Demo 1 flows. The frontend should use the specific use-case endpoints above instead of posting arbitrary tracking events.

Tracked or trackable actions include:

- Simulated email opened
- Training document viewed
- Training document completed
- Quiz attempt started
- Quiz submitted or completed

Interaction metadata must not include real credentials, sensitive typed values, or unnecessary message content.

Future reporting summaries and risk indicators may be derived from interaction events, quiz attempts/results, and optional email classifications. Reporting APIs remain future-facing unless explicitly implemented for a later demo.

## Validation and Security Notes

- Trainee endpoints require `Authorization: Bearer <token>`
- Route parameters such as `campaignId`, `campaignItemId`, `emailId`, and `attemptId` are UUID values and are validated by the backend
- Request bodies are validated through shared DTO/Zod schemas where applicable
- Trainee access is resolved server-side through campaign assignments and active trainee context
- The frontend must not infer access from IDs alone
- Quiz retrieval hides correct answers and feedback before submission
- Simulated email retrieval hides expected classification and correct red flags before intended feedback
- `contentRef` is opaque and must not be resolved by the frontend
- Interaction metadata must not store credentials or sensitive submitted values
- Rate limiting may return `429 Too Many Requests`
- Invitation context and completion routes are public token endpoints and should not require bearer auth, but they remain rate-limited and must not expose hashed token values or internal invitation state details.
- Error responses should remain trainee-safe and must not expose stack traces or internal implementation details

---

## Appendix A: Document Change History

| Version | Date       | Author(s)                        | Sections / Area Updated               | Summary of Change                                                                    |
| ------- | ---------- | -------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| 0.1.0   | 2026-04-27 | Johan Nel                        | Initial document                      | Created the initial Demo 1 API contract document.                                    |
| 0.1.1   | 2026-04-30 | Rudolph Lamprecht                | Campaign/admin contracts              | Added early campaign/admin API contract material.                                    |
| 0.1.2   | 2026-05-03 | Zoë Joubert                      | Error responses                       | Added API error-response notes for Demo 1 validation/feedback behaviour.             |
| 0.1.3   | 2026-05-08 | Rudolph Lamprecht                | API contracts; shared DTO alignment   | Drafted substantial API contracts and linked them to architecture/shared contracts.  |
| 0.1.4   | 2026-05-09 | Adriano Jorge                    | Tracking/progress API                 | Added tracking and progress API requirements.                                        |
| 0.1.5   | 2026-05-09 | Adriano Jorge                    | Terminology                           | Aligned API terminology with domain/SRS wording.                                     |
| 0.1.6   | 2026-05-10 | Johan Nel                        | Terminology                           | Updated learner/employee terminology to trainee and aligned cross-document language. |
| 0.1.7   | 2026-05-11 | Adriano Jorge                    | Persistence/domain-backed contracts   | Updated API docs to reflect Prisma/domain schema work.                               |
| 0.1.8   | 2026-05-12 | Johan Nel                        | Auth/user DTOs                        | Updated API docs for split first-name/last-name user fields.                         |
| 0.1.19  | 2026-07-16 | Rudolph Lamprecht                | UC-07 invitation acceptance           | Added later-demo invitation acceptance API planning references.                      |
| 0.1.9   | 2026-05-16 | Johan Nel                        | Campaign-item contracts; domain model | Updated API contracts to match the revised modular campaign-item domain model.       |
| 0.1.10  | 2026-05-17 | Adriano Jorge                    | UC-02 training document API           | Documented campaign-item training-document API routes.                               |
| 0.1.11  | 2026-05-17 | Rudolph Lamprecht                | UC-01 simulated inbox/email API       | Updated simulated inbox/email routes to campaign-item scoped API standard.           |
| 0.1.12  | 2026-05-18 | Rudolph Lamprecht                | UC-03 quiz API                        | Aligned quiz attempt/result API route documentation.                                 |
| 0.1.13  | 2026-05-19 | Johan Nel                        | General API updates                   | Refined API documentation and aligned it with Demo 1 setup/scope changes.            |
| 0.1.14  | 2026-05-19 | Adriano Jorge; Rudolph Lamprecht | Trainee campaign access               | Documented trainee campaign discovery API.                                           |
| 0.1.15  | 2026-05-20 | Adriano Jorge                    | Seeded campaign notes                 | Added Demo 1 password-security seed documentation.                                   |
| 0.1.16  | 2026-05-21 | Rudolph Lamprecht                | Training content resolution           | Documented training-content resolution and markdown content delivery.                |
| 0.1.17  | 2026-05-21 | Johan Nel                        | UC-01 simulated inbox/email API       | Updated API docs for readable emails/opened-state support.                           |
| 0.1.18  | 2026-07-06 | Adriano Jorge                    | UC-09 and UC-11 API references        | Added later-demo organisation admin and security settings API planning references.   |
