# API Contracts

## SAS Content

- [0. Home](README.md)
- [1. Introduction](introduction.md)
- [2. Architectural Requirements](architectural-requirements.md)
- [3. Architecture Overview](architecture-overview.md)
- [4. Architectural Patterns](architectural-patterns.md)
- [5. Design Patterns](design-patterns.md)
- [6. Quality-to-Architecture Mapping](quality-architecture-mapping.md)
- [7. Technology Requirements](technology-requirements.md)
- **[8. API Contracts](#8-api-contracts)** &larr; _You are here_
- [9. Deployment and Operations](deployment.md)
- [10. Privacy and Data Boundaries](privacy-and-data-boundaries.md)
- [11. Known Limitations](known-limitations.md)
- [12. Changelog](changelog.md)

---

## 8. API Contracts

### 8.1 Contract Authority and Conventions

Route modules define the mounted HTTP surface. Schemas exported by `@insightful-phish/shared` define validated path, query, request, and response shapes where available. Generated Swagger at `/api-docs` is useful for implemented annotated routes, but route and shared-schema source remains authoritative when Swagger coverage is incomplete.

Unless stated otherwise, routes below require an authenticated session. Organisation routes validate membership, Organisation ID, and the permission required by the service. Platform routes require the applicable Platform Administrator authority. Mutation endpoints validate lifecycle state and may require an `updatedAt` precondition to reject stale changes.

### 8.2 Training Document Authoring

| Method and route                                                                                            | Contract                                                              |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `POST /platform/training-documents`                                                                         | Create a platform-owned Draft.                                        |
| `POST`, `GET /organisations/:organisationId/training-documents`                                             | Create or list organisation-accessible documents.                     |
| `GET`, `PUT /platform/training-documents/:trainingDocumentId`                                               | Read or update a platform Draft.                                      |
| `GET`, `PUT /organisations/:organisationId/training-documents/:trainingDocumentId`                          | Read an accessible document or update an organisation-owned Draft.    |
| `POST .../:trainingDocumentId/activate`                                                                     | Validate and transition a Draft to `AVAILABLE`.                       |
| `POST .../:trainingDocumentId/archive` and `/unarchive`                                                     | Perform supported archive lifecycle transitions.                      |
| `POST .../:trainingDocumentId/copy`                                                                         | Copy eligible content to a fresh Draft in the requested scope.        |
| `POST /platform/training-documents/preview` and `/organisations/:organisationId/training-documents/preview` | Render current unsaved Markdown through the backend preview boundary. |

Create and update bodies use the shared Training Document Draft schemas. Platform and organisation lifecycle routes have parallel forms where shown by `...`.

### 8.3 Quiz Authoring and Trainee Attempts

| Method and route                                             | Contract                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET`, `POST /platform/quizzes`                              | List platform Quizzes or create a platform Draft.                                                                              |
| `GET`, `POST /organisations/:organisationId/quizzes`         | List organisation-accessible Quizzes or create an organisation Draft.                                                          |
| `GET`, `PUT /platform/quizzes/:quizId`                       | Read or replace an editable platform Quiz Draft.                                                                               |
| `GET`, `PUT /organisations/:organisationId/quizzes/:quizId`  | Read an accessible Quiz or replace an organisation-owned Draft.                                                                |
| `POST .../quizzes/:quizId/activate`                          | Publish a valid Quiz Draft.                                                                                                    |
| `POST .../quizzes/:quizId/copy`                              | Copy eligible Quiz content to a fresh Draft.                                                                                   |
| `GET /trainee/campaign-items/:campaignItemId/quiz`           | Return trainee-safe occurrence data, attempt limits, scoring policy, and questions without pre-submission answers or feedback. |
| `POST /trainee/campaign-items/:campaignItemId/quiz/attempts` | Start a new attempt or return the current `IN_PROGRESS` attempt.                                                               |
| `POST /quiz-attempts/:attemptId/submit`                      | Validate and submit final question and selected-option IDs.                                                                    |
| `GET /quiz-attempts/:attemptId/results`                      | Return scoring and permitted feedback only after submission.                                                                   |

Quiz Draft validation distinguishes `SINGLE_CHOICE` and `MULTIPLE_CHOICE`. Campaign occurrence contracts carry `maxAttempts` and the supported `BEST`, `LATEST`, or `AVERAGE` score policy.

### 8.4 Organisation Email and Simulated Inbox Authoring

| Method and route                                                              | Contract                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET`, `POST /organisations/:organisationId/email-library`                    | List reusable Organisation Emails or create a Draft.                     |
| `GET`, `PATCH /organisations/:organisationId/email-library/:emailId`          | Read or update an organisation-owned email.                              |
| `POST .../email-library/:emailId/activate` or `/copy`                         | Activate an email or copy it to a fresh Draft.                           |
| `GET`, `POST /organisations/:organisationId/simulated-inboxes`                | List Simulated Inboxes or create a Draft Simulation/inbox.               |
| `GET`, `PATCH /organisations/:organisationId/simulated-inboxes/:simulationId` | Read or update Draft metadata.                                           |
| `POST .../:simulationId/emails/authored`                                      | Add a newly authored email snapshot.                                     |
| `POST .../:simulationId/emails/from-library`                                  | Add a snapshot from an eligible library email.                           |
| `PATCH`, `DELETE .../:simulationId/emails/:emailId`                           | Update or remove an inbox email snapshot.                                |
| `PUT .../:simulationId/emails/order`                                          | Replace the email order.                                                 |
| `POST .../:simulationId/activate` or `/copy`                                  | Approve/activate a valid inbox or copy an active inbox to a fresh Draft. |

An Organisation Email ID is not a Campaign `SIMULATED_INBOX` content ID. Campaign eligibility requires an approved Simulation with an active Simulated Inbox.

### 8.5 Campaign Management

Organisation routes use `/organisations/:organisationId`; platform routes use `/platform`.

| Method and route suffix                                               | Contract                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /campaign-content/catalog`                                       | List scoped eligible Training Documents, Quizzes, and Simulations for Campaign composition. |
| `GET`, `POST /campaigns`                                              | List Campaigns or create a canonical Campaign Draft.                                        |
| `GET`, `PUT /campaigns/:campaignId`                                   | Read Campaign detail or replace an editable Draft.                                          |
| `POST /campaigns/:campaignId/copy`                                    | Copy an Active Campaign to a fresh validated Draft with new structural identities.          |
| `POST /campaigns/:campaignId/activate`                                | Transition a valid Draft to `ACTIVE`.                                                       |
| `POST /campaigns/:campaignId/archive`                                 | Transition an Active Campaign to `ARCHIVED`.                                                |
| `POST /campaigns/:campaignId/reactivate`                              | Transition an Archived Campaign back to `ACTIVE`.                                           |
| `GET /organisations/:organisationId/campaigns/:campaignId/statistics` | Return implemented organisation-scoped Campaign statistics.                                 |

Create, update, and detail contracts use the canonical item union:

- `COMPONENT`: one eligible content reference;
- `ADAPTIVE`: one fixed component type and exact `EASY`, `MEDIUM`, and `HARD` alternatives, with Quiz occurrence settings only for Quiz;
- `GROUP`: direct `COMPONENT` or `ADAPTIVE` children only.

The response includes stable Campaign Item identities for persisted items. Changing adaptive alternatives represents replacement occurrence identity; runtime resolutions are not part of Draft requests.

### 8.6 Assignment and Self-Enrolment

| Method and route                                                                     | Contract                                                                    |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `GET /organisations/:organisationId/campaigns/assignable`                            | List active Campaigns eligible for assignment.                              |
| `GET /organisations/:organisationId/campaign-assignment-candidates`                  | List active same-organisation trainee candidates.                           |
| `POST /organisations/:organisationId/campaign-assignments`                           | Transactionally assign selected Campaigns to selected eligible trainees.    |
| `GET /organisations/:organisationId/campaigns/:campaignId/assignments`               | List assignments for one Campaign.                                          |
| `GET /organisations/:organisationId/trainees/:traineeProfileId/campaign-assignments` | List assignments for one eligible trainee.                                  |
| `DELETE /organisations/:organisationId/campaign-assignments/:assignmentId`           | Remove one selected assignment and its associated progress transactionally. |
| `GET /trainee/platform-campaigns`                                                    | List active platform Campaigns available to an eligible individual trainee. |
| `POST /trainee/platform-campaigns/:campaignId/enrol`                                 | Self-enrol idempotently without duplicating an existing assignment.         |

Organisation assignment operations require `ASSIGN_CAMPAIGNS`; they do not use trainee tags.

### 8.7 AI Generation and Campaign Proposals

| Method and route                                                            | Contract                                                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `POST /platform/training-documents/generate`                                | Return generated Training Document Draft data.                                                                   |
| `POST /organisations/:organisationId/training-documents/generate`           | Return organisation-scoped Training Document Draft data.                                                         |
| `POST /platform/quizzes/generate`                                           | Return generated Quiz Draft data.                                                                                |
| `POST /organisations/:organisationId/quizzes/generate`                      | Return organisation-scoped Quiz Draft data.                                                                      |
| `POST /organisations/:organisationId/email-library/generate`                | Return Organisation Email Draft data, not a complete Simulated Inbox.                                            |
| `POST /organisations/:organisationId/content-variants/generate`             | Generate a supported target-difficulty variant from bounded source-concept metadata and return quality findings. |
| `POST /organisations/:organisationId/campaign-proposals/generate`           | Return a transient complete Campaign proposal.                                                                   |
| `GET /organisations/:organisationId/campaign-proposals/trainees`            | Return minimal eligible trainee selector data for Campaign managers.                                             |
| `POST /organisations/:organisationId/campaign-proposals/follow-up/generate` | Compute trainee category state on the backend and return a transient follow-up proposal.                         |

AI responses contain editable Draft/proposal data only. These endpoints do not persist or activate content, save or activate Campaigns, assign trainees, or send real email.

---

Previous section: [Technology Requirements](technology-requirements.md)

Next section: [Deployment and Operations](deployment.md)
