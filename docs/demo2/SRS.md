# Demo 1 Software Requirements Specification

## 1. Introduction

This document defines the Demo 1 Software Requirements Specification for Insightful Phish, a cybersecurity awareness training platform. Demo 1 is an early prototype increment and is not a complete final SRS for the full or final product.

Insightful Phish is intended to become a modular training platform for individual trainees, organisation-linked trainees, organisation admins, and Insightful Phish admins. The long-term direction includes campaign-based training, reusable campaign components, simulated inboxes and emails, training documents, quizzes, reports, dashboards, ethically constrained real-email simulations, AI-assisted content generation, and richer simulations. Demo 1 only implements a controlled trainee-facing subset of features.

Campaigns are the main assignment and ordering container. For Demo 1, campaign content is limited to a simulated inbox, a training document, and a quiz. The conceptual `CampaignComponent` is represented in current implementation and supporting documents as a `CampaignItem` where applicable.

### 1.1 Demo 1 Scope

Demo 1 covers three trainee-facing use cases:

- UC-01: View emails in simulated inbox
- UC-02: View training document
- UC-03: Complete quiz flow and view results

The following base features support access and usability, but are not counted as Demo 1 use cases:

- Login/register
- Basic themes
- Form validation

### 1.2 Scope Boundaries

| Capability                    | Demo 1 status                                                      | Later-demo direction                                                  |
| ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Authentication / registration | Base feature only                                                  | Production account management, password recovery, role administration |
| Basic themes                  | Base feature only                                                  | Broader design system and theming                                     |
| Form validation               | Base feature only                                                  | Shared validation patterns across workflows                           |
| Simulated inbox               | View/open seeded simulated emails                                  | Classification, richer interactions, safe links, attachments          |
| Training documents            | View seeded markdown/content and mark completion where implemented | Authoring, uploading, richer content formats                          |
| Quiz flow                     | Single-choice quiz and result display                              | Advanced question types, richer scoring, quiz authoring               |
| Admin campaign management     | Supporting/future context                                          | Campaign CRUD, assignment, scheduling, reporting                      |
| Reporting/risk dashboard      | Future-facing only                                                 | Progress, completion, risk and organisation-level dashboards          |
| Real email delivery           | Out of scope                                                       | Opt-in and ethically constrained delivery model                       |
| AI generation                 | Future-facing only                                                 | Schema-controlled, reviewed content generation                        |

Real email delivery, credential capture, punitive monitoring, adaptive learning, full reporting dashboards, final risk scoring formulas, and AI-generated simulations are not Demo 1 implementation requirements.

### 1.3 Assumptions

- Demo 1 uses seeded content for campaigns, simulated emails, training documents, and quizzes.
- The trainee is authenticated before accessing UC-01, UC-02, or UC-03.
- Admin workflows are supporting/future context and are not core Demo 1 flows.
- Domain model references are conceptual and should not be treated as final Prisma models, database tables, or migrations.
- API route details are maintained in [API.md](./API.md), not duplicated in this SRS.

## 2. User Stories and User Characteristics

### 2.1 Demo 1 Trainee-Facing User Stories

- As a trainee, I want to view assigned simulated emails in a controlled inbox so that I can practise recognising suspicious messages safely.
- As a trainee, I want to view assigned training content so that I can learn how to recognise and respond to cyber threats.
- As a trainee, I want to complete an assigned quiz and view results so that I can check my understanding of the training material.

### 2.2 Supporting and Future User Stories

The following stories provide future platform context only:

- As an organisation admin, I want to add trainees to my organisation so that organisation employees can be onboarded into cybersecurity awareness training.
- As an invited user, I want to accept my organisation invitation so that I can complete setup or role change for the organisation that invited me.
- Organisation admins may eventually add trainees manually, send onboarding emails, or configure an approved email domain so that sign-ups from that domain can be linked to the organisation.
- As an organisation admin, I want to create, edit, and delete campaigns for my organisation.
- As an organisation admin, I want to build campaigns from reusable components such as training documents, quizzes, and simulated inboxes.
- As an organisation admin, I want to drag and drop campaign components into an ordered campaign flow.
- As an organisation admin, I want to create and edit quizzes, including future support for multiple question types.
- As an organisation admin, I want to upload, create, edit, and organise training documents.
- As an organisation admin, I want to review trainee progress, campaign completion, quiz results, risky behaviour, and organisation-level risk on dashboards.
- As a trainee, I want to participate in assigned campaigns containing training documents, quizzes, and simulated inboxes.
- As a trainee not linked to an organisation, I want to access default Insightful Phish campaigns and optionally opt into extra features later.
- As the platform, I may eventually send opt-in real simulated emails to real inboxes, using safe and ethical constraints and organisation context where appropriate.
- As the platform, I may eventually use AI-assisted generation for quizzes, emails, training transformations, and company-context-aware content.

### 2.3 User Characteristics and Actors

- **Trainee:** The primary Demo 1 actor. A trainee accesses assigned campaigns which contain simulated inbox(es) with simulated emails, training content, and quizzes.
- **Invited user:** The primary UC-07 actor. An invited user opens a tokenised organisation invitation link, reviews the safe invitation context, and completes the accepted role or setup flow.
- **System:** Supports authentication, content retrieval, validation, interaction tracking, quiz submission, result calculation, and safe feedback states.
- **Email and token services:** System actors that deliver invitation messages and validate tokenised invitation links.
- **Organisation admin:** A supporting/future actor who can configure and assign campaigns and content in later demos.
- **Insightful Phish admin:** A future platform-level administrator, not a core Demo 1 actor.

## 3. Use Cases

A core overview of the Demo 1 use cases can be seen in this diagram:

[UC-Overview Diagram](./diagrams/demo1-use-cases-overview.svg)

### 3.1 UC-01: View Emails in Simulated Inbox

[UC-01 use case diagram](./diagrams/demo1-use-cases-uc01-simulated-inbox.svg)

#### User Story

As a trainee, I want to view my simulated emails in a controlled inbox rather than my own mailbox so that I can recognise potentially suspicious messages in a safe training environment.

#### Purpose

UC-01 allows a trainee to view a list of assigned simulated emails, open an email detail view, and review the content in the email. It does not access a real mailbox, send real email, capture credentials, or require email classification in Demo 1.

#### Actors

- Primary actor: Trainee
- Supporting actor: System

#### Preconditions

- The trainee is authenticated.
- The trainee has access to a campaign item containing a simulated inbox.
- Simulated emails exist as controlled platform content.

#### Postconditions

- The trainee can view assigned simulated email summaries.
- The trainee can open a selected simulated email and view its details.
- The system may record that the simulated email was opened.
- If no email is assigned or the email cannot be loaded, the trainee receives a safe empty or error state.

#### Main Flow

1. The trainee navigates to the simulated inbox.
2. The system displays simulated email summaries assigned through the campaign item.
3. The trainee selects an email.
4. The system displays sender information, subject, received date, and body content.
5. The system records a lightweight open email interaction.
6. The trainee reads the email and may return to the inbox.

#### Exceptions

- No simulated emails are assigned: Show an empty state.
- Simulated email not found or not assigned: Show a safe error state and return path.
- Inbox or email loading fails: Show a retry or navigation option.
- Interaction tracking fails: Do not block email reading where the content loaded successfully.
- Any attempted real external email access: Exclude or block the behaviour for Demo 1.

### 3.2 UC-02: View Training Document

[UC-02 use case diagram](./diagrams/demo1-use-cases-uc02-training-document.svg)

#### User Story

As a trainee, I want to view training documents assigned to me so that I can learn how to recognise and respond to cyber threats in a controlled educational environment.

#### Purpose

UC-02 allows a trainee to open and read assigned training content. It does not include training content authoring, uploading, campaign management, or quiz completion.

#### Actors

- Primary actor: Trainee
- Supporting actor: System

#### Preconditions

- The trainee is authenticated.
- The trainee has access to a campaign item containing a training document.
- Training content exists as controlled educational content.

#### Postconditions

- The trainee can open and read the assigned training document.
- The system may record that the training document was viewed or completed.
- If content is missing or unavailable, the trainee receives a safe empty or error state.

#### Main Flow

1. The trainee navigates to an assigned training item.
2. The system retrieves the training document for the campaign item.
3. The system displays the training content in a readable format.
4. The system records basic progress where available.
5. The trainee reads the content.
6. The trainee may return to the campaign view or proceed to a related quiz.

#### Exceptions

- No training document is assigned: Show an empty or unavailable state.
- Training document not found or no longer assigned: Show a safe error state.
- Training content loading fails: Show a retry or navigation option.
- Progress tracking fails: Do not block reading where content loaded successfully.

### 3.3 UC-03: Complete Quiz Flow and View Results

[UC-03 use case diagram](./diagrams/demo1-use-cases-uc03-quiz-flow.svg)

#### User Story

As a trainee, I want to complete a quiz after my training session so that I can verify my understanding of the material and receive feedback on my security knowledge.

#### Purpose

UC-03 allows a trainee to open assigned quiz content, answer supported questions, submit a quiz attempt, and view results or feedback. Demo 1 supports simple single-choice quiz questions. Quiz authoring, adaptive learning, AI-assisted generation, and full reporting dashboards are outside Demo 1 scope.

#### Actors

- Primary actor: Trainee
- Supporting actor: System

#### Preconditions

- The trainee is authenticated.
- The trainee has access to a campaign item containing a quiz.
- Quiz questions and answer options exist as controlled content.

#### Postconditions

- The system creates or uses a quiz attempt for the trainee.
- The trainee can answer and submit the quiz.
- Submitted answers are recorded against the attempt.
- The submitted attempt becomes read-only.
- The trainee can view a result summary and educational feedback where available.

#### Main Flow

1. The trainee navigates to an assigned quiz.
2. The system loads the quiz content.
3. The trainee starts or opens the quiz attempt.
4. The system displays questions and answer controls.
5. The trainee answers required questions and submits the attempt.
6. The system validates and records the submission.
7. The system calculates or retrieves the result.
8. The system displays results and educational feedback.

#### Exceptions

- Quiz not available or not assigned: Show a safe error state and return path.
- Quiz start fails: Show a retry or return option.
- Submission is incomplete or invalid: Prevent final submission and identify what must be corrected.
- Submission fails: Preserve answers where possible and allow retry.
- Results fail to load: Keep the attempt submitted and provide a retry or navigation option.

### 3.4 UC-07: Accept Organisation Invitation

#### User Story

As an invited user, I want to accept my organisation invitation so that I can complete account setup or role change for the organisation that invited me.

#### Purpose

UC-07 allows an invited user to open a tokenised invitation link, review a safe invitation context, and complete the invitation acceptance flow for one of the supported invitation purposes: initial organisation admin setup, organisation employee invite, or organisation admin promotion invite. The use case keeps invitation links token-based, organisation-scoped, and safe to reject when the token is expired, revoked, wrong-user, or already used.

#### Scope

- **TUCBW**: An invited user opens an organisation invitation link on the invitation acceptance page.
- **TUCEW**: The invited user acknowledges that the invitation has been accepted or completed successfully.

#### Actors

- Primary actor: Invited user
- Supporting actor: Organisation admin or platform admin who issued the invite
- System actor: Email and token services
- System actor: Authentication and account services

#### Preconditions

- The invited user has received a valid tokenised organisation invitation link.
- The invitation targets a known email address or account identity.
- The invitation purpose is supported by the current platform flow.
- The invitation has not expired or been revoked before the user opens it.
- The organisation and invitation remain eligible for completion according to platform policy.

#### Postconditions

- The invitation is marked as accepted and can no longer be used again.
- The invited user gains the role or organisation membership described by the invitation purpose.
- The user's account and organisation context reflect the accepted invitation.
- The system records the completion or failure state needed for audit and traceability.
- If acceptance fails, the previous invitation and account state remain unchanged.

#### RBAC Expectations

- Invitation creation is restricted to the organisation admin or platform admin workflow that owns the invite.
- Invitation acceptance does not require the invited user to already hold the destination role.
- The system only completes acceptance when the current or created account matches the invitation target identity.
- The system preserves organisation scope and does not allow the invited user to accept another organisation's invitation.
- A tokenised invitation link acts as the authorising context for the public acceptance page, but it does not bypass target-identity validation.

#### Business Rules

- The invitation link carries the raw token, while the database stores only a hashed token reference.
- The invitation token is single-use and becomes invalid after successful completion.
- The invitation context distinguishes initial organisation admin setup, organisation employee invites, and organisation admin promotion invites.
- The system uses a safe context view before completion so that the user can confirm the target email, organisation, and role.
- The system records completion only after the invitation transaction succeeds.

#### Main Flow

1. The invited user opens the organisation invitation link.
2. The system retrieves a safe invitation context for the token without exposing sensitive internal data.
3. The system validates the token state, invitation purpose, target identity, and organisation scope.
4. The system displays the invitation details, including the target email, organisation name, and accepted role or setup context.
5. The invited user confirms acceptance and continues the flow.
6. The system validates that the current or created account matches the invitation target identity.
7. The system completes the supported invitation purpose, creates or updates the linked role or profile, and consumes the token only after the transaction succeeds.
8. The system records the completion outcome for audit and traceability.
9. The system shows a success acknowledgement or the next allowed signed-in state.

#### Exceptions

- **Invalid Token**: The token is missing, malformed, or unsupported. The system shows a safe invalid-link state and does not expose privileged data.
- **Expired Invitation**: The invitation has expired. The system shows a safe expired-link state and does not complete acceptance.
- **Revoked Invitation**: The invitation has been revoked. The system shows a safe revoked-link state and does not complete acceptance.
- **Already Used Invitation**: The invitation token has already been consumed. The system shows a safe already-used state and does not complete acceptance.
- **Wrong User**: The signed-in user or provided account identity does not match the invitation target identity. The system rejects the acceptance and keeps the invitation unused.
- **Rejected or Declined Invitation**: The invited user declines or otherwise rejects the invitation. The system ends the flow without changing role or membership state.
- **Unsupported Invitation Purpose**: The token does not map to a supported invitation purpose. The system shows a safe unsupported-link state and does not complete the flow.
- **Organisation Scope Mismatch**: The invitation does not belong to the expected organisation or the organisation is no longer eligible. The system blocks completion and preserves the previous state.
- **Account Conflict**: The invitation conflicts with an existing active account role or setup state. The system rejects completion and keeps the previous state unchanged.
- **Token or Service Failure**: The token or account service cannot complete the lookup or transaction. The system shows a safe retry or return path.

#### Traceability

- SRS documentation issue: #263
- Foundation/migration issue: #262
- Frontend issue: #264
- Backend endpoint issue: #265
- Integration issue: #266
- Backend integration-test issue: #270
### 3.4 UC-05: Review and Manage Organisation Registrations

[UC-05 use case diagram](./diagrams/uc05-org-review-use-case.drawio.svg)

#### User Story

As an Insightful Phish platform admin, I want to review and manage organisation registration requests so that valid organisations can be onboarded safely and invalid requests can be rejected with traceable decisions.

#### Purpose

This use case allows a platform admin to access organisation registration requests, inspect submitted details, mark requests as contacted, approve requests, and reject requests. The use case ensures organisation onboarding actions are role-restricted, auditable, and linked to planned frontend, backend, integration, and test work.

#### Scope

- **TUCBW**: An Insightful Phish platform admin reviews organisation registration requests on the platform organisation management page.
- **TUCEW**: The platform admin acknowledges that the selected organisation registration request has been contacted, approved, rejected, or reviewed successfully.

#### Actors

- Primary actor: Insightful Phish platform admin
- Supporting actor: Email service
- System actor: Audit log

#### Preconditions

- The platform admin is authenticated.
- The platform admin has an active platform-admin profile.
- At least one organisation registration request exists or the page supports empty-state review.
- The selected registration request is available for the requested action.
- The platform admin has permission to review and manage organisation registrations.

#### Postconditions

- The platform admin sees the latest registration list and request state after the selected action.
- If marked contacted, the request reflects contacted status and timestamp.
- If approved, the organisation is created and an initial organisation-admin setup invite is issued.
- If rejected, the request reflects rejected status and reason metadata where policy requires it.
- Audit records are created for decision actions and key state transitions.
- On validation, permission, or state conflicts, no partial or unsafe state is committed.

#### Main Flow

1. The platform admin navigates to the organisation registration management page.
2. The system retrieves and displays registration requests with status and summary details.
3. The platform admin selects a registration request.
4. The system displays full request details.
5. The platform admin chooses one supported action:
   - Option A: Mark contacted
     a. The platform admin marks the request as contacted.
     b. The system validates the request state and stores contacted status.
     c. The system records the action in the audit log.
   - Option B: Approve request
     a. The platform admin approves the request.
     b. The system validates approvability and duplicate-organisation constraints.
     c. The system creates the organisation and prepares initial admin setup invite delivery.
     d. The system records the approval and onboarding action in the audit log.
   - Option C: Reject request
     a. The platform admin rejects the request.
     b. The system validates rejectability and reason requirements.
     c. The system stores the rejected state and reason metadata according to policy.
     d. The system records the rejection in the audit log.
   - Option D: View details only
     a. The platform admin reviews request detail without changing state.
     b. The system shows current request status and prior actions.
6. The system returns updated request status and feedback for the selected action.
7. The platform admin acknowledges the outcome.

#### Exceptions

- **Unauthenticated User**: The user is not signed in. The system redirects to login or returns an unauthorised response.
- **Missing Platform-Admin Role**: The actor is not a platform admin. The system denies access to organisation registration management.
- **Request Not Found**: The selected request does not exist. The system shows a safe not-found response.
- **Invalid State Transition**: The selected action is not valid for the current request state. The system rejects the action and keeps current state.
- **Duplicate Organisation Conflict**: Approval would create a conflicting organisation record. The system rejects the approval and reports conflict safely.
- **Invite Delivery Failure**: Organisation approval succeeds but invite delivery fails. The system records the delivery failure for follow-up and shows the current onboarding state.
- **Audit Logging Failure**: The system cannot record the required audit entry. The system applies audit-failure policy and does not silently hide decision actions.
- **Concurrent Update Conflict**: The request was changed by another admin. The system rejects stale updates and asks for refresh.

#### Business Rules and RBAC Expectations

- Only platform admins may list, view, contact, approve, or reject organisation registration requests.
- All state-changing actions shall be audit logged with actor, target request, decision type, and timestamp.
- Approval shall create organisation onboarding state exactly once for a request.
- Contacted, approved, and rejected transitions shall enforce allowed state transitions and prevent invalid backtracking.
- Request details and actions shall be visible only inside platform-admin management scope.

#### Traceability

- Use case: UC-05: Review and Manage Organisation Registrations.
- SRS documentation issue: #253
- Related implementation, integration, and test issues: #254, #255, #256, #257, #258, #259, #260
- Reserved Demo 1 use cases remain unchanged: UC-01, UC-02, UC-03.

### 3.5 UC-09: Manage Organisation Admins and Permissions

#### User Story

As an organisation admin with admin-management permissions, I want to view and manage organisation admins and their permissions so that my organisation can maintain controlled, traceable, and safe administrator access.

#### Purpose

This use case allows an organisation admin to view the organisation's admins, review assigned permissions, promote an active organisation trainee to an organisation admin, update another admin's permissions, and remove organisation admin privileges where permitted. The use case ensures that all admin-management actions stay within the actor's organisation, respect permission-based access control, preserve critical-admin safeguards, and record meaningful changes for audit purposes.

#### Scope

- **TUCBW**: An organisation admin manages organisation admins and permissions on the organisation admin management page.
- **TUCEW**: The organisation admin acknowledges that admin invitation, promotion, permission viewing, or permission change work has completed successfully.

#### Actors

- Primary actor: Organisation admin with admin-management permissions
- Supporting actor: Email service
- System actor: Audit log

#### Preconditions

- The organisation admin is authenticated.
- The organisation admin has an active organisation admin profile.
- The organisation admin belongs to the organisation being managed.
- The organisation exists and is not in a state that blocks the selected admin-management action.
- The organisation admin has the required permission for the selected action.

#### Postconditions

- The organisation admin list and permission state are displayed or updated according to the selected action.
- If a trainee is promoted, a pending organisation admin promotion invitation is created for an active trainee in the same organisation.
- If permissions are changed, the target admin's active permission set is updated.
- If admin privileges are removed, the target user is left in a valid non-admin organisation access state where applicable.
- The organisation is not left without an admin who can manage admin permissions or invite/manage users.
- Successful admin-management changes are recorded in the audit log.
- Failed validation, permission, or safeguard checks leave the previous admin and permission state unchanged.

#### Main Flow

1. The organisation admin navigates to the organisation admin management page.
2. The system retrieves and displays the organisation admins, their statuses, and their assigned permissions.
3. The organisation admin reviews the current admin list and chooses one of the available management actions:
   - Option A: View admin permissions
     a. The organisation admin selects an admin from the list.
     b. The system displays the selected admin's assigned permissions.
     c. The organisation admin returns to the admin list or chooses another management action.
   - Option B: Promote organisation trainee to admin
     a. The organisation admin selects the promote-admin action.
     b. The organisation admin enters or selects the active trainee to promote.
     c. The organisation admin selects the permissions that should apply after promotion.
     d. The system verifies that the trainee belongs to the same organisation and is eligible for promotion.
     e. The system creates a pending promotion invitation and queues the promotion email.
     f. The system records the promotion invitation action in the audit log.
     g. The system displays a confirmation that the promotion invitation has been created or sent.
   - Option C: Change organisation admin permissions
     a. The organisation admin selects an existing organisation admin.
     b. The organisation admin updates the selected admin's permissions.
     c. The system validates the permission selection and checks critical-admin safeguards.
     d. The system saves the updated permission set.
     e. The system records the old and new permission state in the audit log.
     f. The system displays the updated permission state.
   - Option D: Remove organisation admin privileges
     a. The organisation admin selects an existing organisation admin to remove.
     b. The system asks for confirmation and any required password or typed confirmation.
     c. The system verifies the confirmation and checks critical-admin safeguards.
     d. The system removes the target user's organisation admin privileges.
     e. The system records the removal in the audit log.
     f. The system displays a confirmation that the admin privileges were removed.
4. The organisation admin acknowledges the outcome and returns to the organisation admin management page.

#### Exceptions

- **Unauthenticated User**: The user is not signed in. The system redirects the user to login or returns an unauthorised response.
- **Inactive Organisation Admin**: The actor is not an active organisation admin. The system denies access to organisation admin management.
- **Cross-Organisation Access Attempt**: The actor attempts to manage admins for another organisation. The system denies access and does not expose the other organisation's admin data.
- **Missing Permission**: The actor lacks the permission required for the selected action. The system blocks the action and leaves the current admin state unchanged.
- **Invalid Promotion Target**: The selected trainee is not active, does not belong to the organisation, or is already an organisation admin. The system rejects the promotion request.
- **Duplicate Pending Promotion**: A pending promotion invitation already exists for the selected trainee. The system prevents a duplicate invitation and shows the current pending state.
- **Invalid Permission Selection**: The submitted permission set contains an invalid or unsupported permission. The system rejects the update and identifies the invalid selection.
- **Critical Admin Safeguard Violation**: The requested change would leave the organisation without an admin who can change admin permissions or invite/manage users. The system blocks the change and preserves the previous permission state.
- **Suspended Organisation**: The organisation is suspended. The system shows only the permitted read-only state or blocks state-changing work according to product policy.
- **Email Delivery Failure**: The promotion invitation is created but the email cannot be sent. The system records the delivery failure and shows that follow-up or resend may be required.
- **Audit Logging Failure**: The system cannot record the required audit entry. The system follows the platform's audit-failure policy and does not silently hide sensitive admin-management changes.

#### Traceability

- SRS documentation issue: #273
- Foundation/migration issue: #272
- Frontend issue: #274
- Backend endpoint issue: #275
- Integration issue: #276
- Backend integration-test issue: #280

### 3.6 UC-11: Configure Organisation Security Settings

#### User Story

As an organisation admin with security-settings permission, I want to configure organisation-level security settings so that my organisation can control session behaviour and sensitive account policies for organisation users.

#### Purpose

This use case allows an authorised organisation admin to view and update organisation-level security settings, including remember-me policy, regular session length, idle timeout, sensitive-action reauthentication, and trainee email-change policy. The use case ensures that the submitted settings stay within platform limits, conflicting combinations are rejected, changes are audit logged, and the saved policy is applied by authentication and session services according to defined enforcement timing.

#### Scope

- **TUCBW**: An organisation admin configures organisation-level security settings on the organisation security settings page.
- **TUCEW**: The organisation admin acknowledges that the organisation security settings have been saved successfully.

#### Actors

- Primary actor: Organisation admin with security-settings permission
- System actor: Authentication/session service
- System actor: Audit log

#### Preconditions

- The organisation admin is authenticated.
- The organisation admin has an active organisation admin profile.
- The organisation admin belongs to the organisation being configured.
- The organisation admin has the `Change organisation-level security settings` permission.
- The organisation exists and is in a state that allows security settings to be viewed or updated.

#### Postconditions

- Valid organisation security settings are saved for the organisation.
- Invalid settings are rejected and previous settings remain active.
- The old and new settings are recorded in the audit log.
- The saved policy is available for login, refresh, and session creation enforcement.
- The organisation admin is informed when the change applies to current sessions, future sessions, or the next refresh/login.

#### Main Flow

1. The organisation admin navigates to the organisation security settings page.
2. The system retrieves and displays the organisation's current security settings.
3. The system displays the platform limits and indicates whether the current actor may edit the settings.
4. The organisation admin reviews the current settings and changes one or more configurable options:
   - remember-me policy;
   - maximum remembered session length;
   - regular session length;
   - idle timeout;
   - sensitive-action reauthentication;
   - trainee email-change policy.
5. The organisation admin submits the updated settings.
6. The system verifies that the actor is an active organisation admin in the same organisation.
7. The system verifies that the actor has permission to change organisation-level security settings.
8. The system validates the submitted values against platform limits and setting-combination rules.
9. The system saves the updated settings.
10. The system records the old and new settings in the audit log.
11. The system displays the saved settings and explains when the changes take effect.
12. The organisation admin acknowledges the successful save.

#### Exceptions

- **Unauthenticated User**: The user is not signed in. The system redirects the user to login or returns an unauthorised response.
- **Inactive Organisation Admin**: The actor is not an active organisation admin. The system denies access to the security settings page.
- **Cross-Organisation Access Attempt**: The actor attempts to configure settings for another organisation. The system denies access and does not expose the organisation's settings.
- **Missing Security-Settings Permission**: The actor can view only the permitted read-only state, or update attempts are rejected with a permission error.
- **Suspended Organisation**: The organisation is suspended. The system shows read-only settings or blocks updates according to product policy.
- **Value Outside Platform Limits**: A submitted value exceeds the allowed minimum or maximum. The system rejects the save and shows field-level validation feedback.
- **Conflicting Settings**: The submitted combination is invalid, such as enforcing a policy without a valid required value. The system rejects the save and keeps the previous settings active.
- **Existing Sessions Still Active**: The settings are saved, but some active sessions only apply the new policy on refresh, next login, or new session creation. The system explains this timing to the admin.
- **Audit Logging Failure**: The system cannot record the required audit entry. The system follows the platform's audit-failure policy and does not silently hide sensitive settings changes.

#### Traceability

- SRS documentation issue: #285
- Foundation/migration issue: #284
- Frontend issue: #286
- Backend endpoint issue: #287
- Integration issue: #288
- Backend account/security settings integration-test issue: #291

## 4. Functional Requirements

### 4.1 Base Features

| ID         | Requirement                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-BASE-01 | The system shall support rudimentary login and registration sufficient for accessing Demo 1 trainee flows.                                                    |
| FR-BASE-02 | Required login/register fields shall be visibly identified and validated before submission.                                                                   |
| FR-BASE-03 | Authentication errors shall be trainee-friendly and shall not expose technical implementation details.                                                        |
| FR-BASE-04 | The system shall apply a consistent Demo 1 visual theme across trainee-facing screens.                                                                        |
| FR-BASE-05 | The system shall provide reusable form validation and feedback behaviour for required fields, quiz answers, loading states, success states, and error states. |

### 4.2 UC-01 Functional Requirements

#### View Emails in Simulated Inbox

| ID         | Requirement                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| FR-UC01-01 | The system shall allow a trainee to view assigned simulated email summaries.                            |
| FR-UC01-02 | The system shall allow a trainee to open a selected simulated email from the inbox list.                |
| FR-UC01-03 | The system shall display simulated email details in a readable format.                                  |
| FR-UC01-04 | The system shall clearly treat inbox content as simulated, controlled training content.                 |
| FR-UC01-05 | The system shall record a lightweight interaction event when a trainee opens a simulated email.         |
| FR-UC01-06 | The system shall display empty and error states for unavailable inboxes or emails.                      |
| FR-UC01-07 | The system shall not connect to or send messages through real external email infrastructure for Demo 1. |
| FR-UC01-08 | The system shall not collect or store sensitive credential input through the simulated inbox view.      |

### 4.3 UC-02 Functional Requirements

#### View Training Document

| ID         | Requirement                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| FR-UC02-01 | The system shall allow a trainee to open an assigned training document.                                          |
| FR-UC02-02 | The system shall present training content in a structured, readable format.                                      |
| FR-UC02-03 | The system shall record a basic viewed or completed interaction where tracking is available.                     |
| FR-UC02-04 | The system shall display empty and error states for unavailable training content.                                |
| FR-UC02-05 | The system shall allow navigation to a linked quiz where available without making quiz completion part of UC-02. |
| FR-UC02-06 | The system shall not allow trainees to modify training content.                                                  |

### 4.4 UC-03 Functional Requirements

#### Complete Quiz Flow and View Results

| ID         | Requirement                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| FR-UC03-01 | The system shall allow a trainee to open an assigned quiz.                                                                            |
| FR-UC03-02 | The system shall retrieve and display quiz questions and answer options.                                                              |
| FR-UC03-03 | The system shall create or use a quiz attempt when the trainee starts the quiz flow.                                                  |
| FR-UC03-04 | The system shall allow the trainee to answer supported quiz questions and review answers before submission.                           |
| FR-UC03-05 | The system shall validate required quiz answers before accepting final submission.                                                    |
| FR-UC03-06 | The system shall submit the trainee's quiz attempt and record final answers.                                                          |
| FR-UC03-07 | The system shall display submitted quiz results and educational feedback where available.                                             |
| FR-UC03-08 | The system shall prevent duplicate final submission or further editing of a completed quiz attempt.                                   |
| FR-UC03-09 | The system shall display safe validation and error states when quiz loading, attempt creation, submission, or result retrieval fails. |

### 4.5 UC-07 Functional Requirements

#### Accept Organisation Invitation

| ID         | Requirement                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-UC07-01 | The system shall allow an invited user to open a tokenised organisation invitation link and view a safe invitation context.                                       |
| FR-UC07-02 | The system shall validate the invitation token state and invitation purpose before showing the acceptance flow.                                                   |
| FR-UC07-03 | The system shall display the target email, organisation context, and accepted role or setup context without exposing privileged implementation details.           |
| FR-UC07-04 | The system shall support accepted invitation flows for initial organisation admin setup, organisation employee invites, and organisation admin promotion invites. |
| FR-UC07-05 | The system shall reject invitation acceptance when the current or created account does not match the invitation target identity.                                  |
| FR-UC07-06 | The system shall display safe states for expired, revoked, already-used, invalid, rejected, or unsupported invitation links.                                      |
| FR-UC07-07 | The system shall complete the invitation transaction only after the invitation state, identity match, and organisation scope checks succeed.                      |
| FR-UC07-08 | The system shall mark the invitation token as consumed after successful acceptance and prevent the same token from being used again.                              |
| FR-UC07-09 | The system shall preserve the previous account and organisation state when invitation acceptance fails.                                                           |
### 4.5 UC-05 Functional Requirements

#### Review and Manage Organisation Registrations

| ID         | Requirement                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-UC05-01 | The system shall allow only authenticated platform admins to access organisation registration review features.                                     |
| FR-UC05-02 | The system shall display a platform-admin-only list of organisation registration requests with actionable statuses.                                |
| FR-UC05-03 | The system shall allow a platform admin to view full details for a selected registration request.                                                  |
| FR-UC05-04 | The system shall allow a platform admin to mark a registration request as contacted when the state transition is valid.                            |
| FR-UC05-05 | The system shall allow a platform admin to approve a valid registration request and create organisation onboarding state.                          |
| FR-UC05-06 | The system shall allow a platform admin to reject a valid registration request and persist rejection metadata according to policy.                 |
| FR-UC05-07 | The system shall prevent invalid or duplicate state transitions for contacted, approved, and rejected actions.                                     |
| FR-UC05-08 | The system shall trigger initial organisation-admin setup invitation flow when approval succeeds.                                                  |
| FR-UC05-09 | The system shall record audit entries for review decisions and decision-related state changes.                                                     |
| FR-UC05-10 | The system shall return safe validation, conflict, and not-found feedback without exposing internal implementation details to unauthorised actors. |

### 4.6 Tracking, Progress, and Reporting Support

| ID        | Requirement                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-TRK-01 | The system shall support lightweight interaction events for Demo 1 trainee actions.                                                          |
| FR-TRK-02 | Tracked events should reference the trainee, target type, target record, campaign context, and timestamp (where available).                  |
| FR-TRK-03 | Tracking failures should not block content viewing where the requested content loaded successfully.                                          |
| FR-TRK-04 | Tracking shall avoid storing real credentials, passwords, or unnecessary sensitive personal data.                                            |
| FR-TRK-05 | Quiz attempts, answers, and results shall support the UC-03 submission and result flow.                                                      |
| FR-TRK-06 | Reporting and risk concepts are future-facing placeholders only and shall not expand Demo 1 into a dashboard or risk-scoring implementation. |

### 4.7 Future/Admin Supporting Context

Future organisation admin capabilities may include campaign CRUD, campaign assignment, content authoring, reusable simulation templates, quiz authoring, reporting dashboards, and organisation/user management. These concepts provide context for the campaign-based domain model but are not Demo 1 acceptance criteria.

## 5. API Contracts

Detailed Demo 1 route paths, request/response DTOs, validation notes, and endpoint behaviour are maintained in [API.md](./API.md). This SRS intentionally does not duplicate full payload details.

The backend API is also documented through Swagger/OpenAPI for interactive inspection during development. When the backend is running locally, the Swagger documentation can be accessed from the backend Swagger UI route, typically at:

`http://localhost:4000/api-docs`

This allows developers and reviewers to inspect available endpoints, request/response schemas, validation expectations, and example responses directly from the running backend.

At a high level:

- UC-01 uses campaign-item scoped simulated inbox, simulated email detail, and simulated email interaction endpoints.
- UC-02 uses campaign-item scoped training document and training progress endpoints.
- UC-03 uses campaign-item scoped quiz retrieval, quiz attempt creation, attempt submission, and result retrieval endpoints.
- UC-07 uses public token context and completion endpoints for invitation acceptance, with organisation-admin promotion invite creation handled by the related organisation-admin flow.
- Campaign discovery and assignment endpoints support access to trainee campaign items.

API routes and payloads remain implementation contracts documented in `API.md` and the backend Swagger/OpenAPI documentation; this SRS keeps only the requirement-level mapping.

## 6. Domain Model Description

The Demo 1 domain model provides a conceptual view of the entities required to support the trainee-facing use cases, API planning, traceability, and future database planning. It is not a final database schema and should not be treated as a direct Prisma model or migration design. Diagram sources and exports are maintained under [diagrams/](./diagrams/).

The domain model diagram can be found here: [Demo 1 domain model](./diagrams/demo1-domain-model-final.svg).

### 6.1 Core Domain Concepts

- `Healthcheck` represents a simple system health response. This is not in the Domain model diagram as it serves no business purpose.
- `User` represents the platform account and carries identity, authentication status, and user type information.
- `Trainee` is the conceptual trainee role. A trainee may be a `GeneralTrainee` with no organisation or an `OrganisationTrainee` linked to exactly one organisation.
- `OrganisationAdmin` is an organisation-linked administrator for future campaign/content setup.
- `IPAdmin` is a platform-level administrator for future platform oversight.
- `Organisation` represents an organisation using the platform. `OrganisationContext` stores future organisation-specific context such as logos, brand guidelines, security policies, approved domains, terminology, and related metadata.
- `Invitation` and `ActionToken` represent token-driven invite and setup workflows for UC-07 and related admin-management flows. `Invitation` stores recipient, purpose, status, expiry, and organisation context. `ActionToken` stores the hashed token reference while raw tokens remain in invitation URLs only.
- `Campaign` is the main assignment and ordering container. A campaign may belong to an organisation or may represent default Insightful Phish campaigns.
- `CampaignAssignment` links a `Campaign` to a `Trainee` and tracks assignment-level availability, progress, due dates, and completion.
- `CampaignItem` is the ordered campaign structure used to make content available. `CampaignComponent` and `CampaignComponentGroup` specialise campaign items; groups support one grouping level only.
- `TrainingDocumentComponent`, `QuizComponent`, and `SimulationComponent` are campaign component specialisations that link campaign placement to a `TrainingDocument`, `Quiz`, or `Simulation`.
- `TrainingDocument` is reusable readable content for UC-02.
- `Quiz`, `QuizQuestion`, `ChoiceQuestion`, `SingleChoiceQuestion`, `MultiChoiceQuestion`, `AnswerOption`, `QuizAttempt`, `AttemptAnswer`, and `QuizResult` support UC-03. Demo 1 uses simple single-choice quiz behaviour, while richer question and marking behaviour remains future-facing.
- `Simulation`, `SimulatedInbox`, and `SimulatedEmail` support UC-01. Demo 1 simulation scope is limited to viewing and opening controlled simulated emails.
- `EmailRedFlag` describes potential red flags associated with a simulated email. `EmailClassificationResponse` is future trainee judgement on a simulated email, separate from quiz attempts.
- `InteractionEvent` records lightweight trainee actions such as campaign progress, training viewed/completed, quiz activity, simulated email opened, and future simulation interactions.

### 6.2 Domain Relationships and Limits

A trainee sees Demo 1 content through campaign assignment and campaign item placement. A campaign contains ordered campaign items. A campaign component may expose a simulated inbox, training document, or quiz through its component subtype. In the current implementation, the conceptual component placement may be represented by `CampaignItem` records with component fields. Demo 1 uses seeded content and does not have admin authoring flows.

For Demo 1 simplicity, component groups support one grouping level only. A `CampaignComponentGroup` can contain `CampaignComponent` records, but not other component groups. This can be changed easily in the future if needed.

Simulated emails belong to a simulated inbox campaign component. Demo 1 requires only safe viewing/opening of these emails. Email classification, simulated links, attachments, fake login pages, richer interaction tracking, real email delivery, and AI-assisted generation will be implemented in the future.

Interaction tracking must remain safe and must not store real credentials or sensitive submitted values. Quiz answers are stored as attempt answers and may reference selected answer options; quiz results summarise submitted attempts.

## 7. Architectural Requirements

Architecture, quality drivers, deployment assumptions, layering, persistence boundaries, API standards, and technical constraints are documented in [architecture.md](./architecture.md).

At requirement level, Demo 1 should:

- Separate frontend, backend, shared DTO/validation, and persistence responsibilities;
- Use campaign-item access control consistently for trainee content;
- Keep simulation interactions inside the controlled platform boundary;
- Preserve clear contracts between frontend, backend, shared types, and database access;
- Support local development and CI validation for Demo 1 functionality.

## 8. Technology Requirements

Demo 1 uses the following technology stack:

- React, Vite, and TypeScript for the frontend
- Express and TypeScript for the backend API
- Prisma ORM for database access
- PostgreSQL for relational persistence
- a shared package for DTOs, shared types, and validation contracts
- Zod for request/DTO validation where applicable
- Vitest, Supertest, and relevant frontend testing tools for automated checks
- Docker Compose for local database support
- GitHub Actions for CI

## 9. Quality Requirements

### 9.1 Usability

- Trainee-facing flows shall use clear, non-technical wording.
- The system shall provide understandable loading, empty, unavailable, success, and error states.
- The trainee shall have a safe way to retry, go back, or continue when content cannot be loaded.

### 9.2 Accessibility

- Feedback and validation messages shall not rely only on colour.
- Primary recovery actions shall be keyboard-accessible.
- Important messages should be placed near the relevant content, field, question, or action where possible.

### 9.3 Security, Privacy, and Safety

- Demo 1 simulated inbox content shall remain controlled platform content.
- The system shall not access real trainee mailboxes for UC-01.
- Simulated interactions shall not collect or store real credentials.
- Tracking shall follow data minimisation and avoid unnecessary personal or sensitive data.
- Technical error details, stack traces, and internal exception names shall not be shown to trainees.

### 9.4 Error Handling and Resilience

- Content loading failures shall produce safe messages and recovery options.
- Interaction tracking failures should not block reading simulated emails or training documents when the content itself loaded successfully.
- Quiz submission failures should preserve answers where possible and allow retry.

### 9.5 Maintainability

- Requirements, API contracts, domain terminology, and traceability should remain aligned across this SRS, [API.md](./API.md), [architecture.md](./architecture.md), and [traceability.md](./traceability.md).
- Domain names in this SRS are conceptual unless the implementation documents define them otherwise.
- Future-facing concepts shall be marked clearly so Demo 1 scope does not expand accidentally.

### 9.6 Testability and Traceability

- Core use cases and base features should be testable through frontend, backend, integration, or manual Demo 1 verification as appropriate.
- QA planning is maintained in [testing.md](./testing.md).
- Traceability references are maintained in [traceability.md](./traceability.md).

---

## Appendix A: Document Change History

| Version | Date       | Author(s)                | Sections / Area Updated                            | Summary of Change                                                                                    |
| ------- | ---------- | ------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 0.1.0   | 2026-04-27 | Johan Nel                | Initial document                                   | Created the initial Demo 1 SRS structure.                                                            |
| 0.1.1   | 2026-04-28 | Adriano Jorge            | UC-01 simulated inbox; traceability references     | Added simulated inbox requirements and related SRS refinements.                                      |
| 0.1.2   | 2026-04-30 | Rudolph Lamprecht        | Admin/campaign context; architecture/API alignment | Added campaign/admin-related SRS content and aligned with early API/architecture thinking.           |
| 0.1.3   | 2026-04-30 | Zoë Joubert; Connor Bell | UC-03 quiz flow; traceability                      | Added quiz-flow requirements and corrected related traceability.                                     |
| 0.1.4   | 2026-04-30 | Connor Bell              | UC-02 training document                            | Added final Demo 1 training-view SRS requirements.                                                   |
| 0.1.5   | 2026-05-01 | Adriano Jorge            | Domain model alignment                             | Added SRS alignment for the initial domain model.                                                    |
| 0.1.6   | 2026-05-03 | Zoë Joubert              | Validation; feedback; phishing feedback scope      | Added validation and UI feedback requirements for Demo 1.                                            |
| 0.1.7   | 2026-05-07 | Johan Nel                | Document structure; cross-references; use cases    | Reworked SRS structure and aligned it with related Demo 1 documents.                                 |
| 0.1.8   | 2026-05-07 | Johan Nel                | Use-case diagrams                                  | Linked or referenced Demo 1 use-case diagrams from the SRS.                                          |
| 0.1.9   | 2026-05-08 | Rudolph Lamprecht        | API/architecture cross-reference                   | Added API-contract linkage and architecture-related SRS references.                                  |
| 0.1.10  | 2026-05-09 | Connor Bell              | Minor SRS amendments                               | Applied minor SRS wording/consistency updates alongside design navigation documentation.             |
| 0.1.11  | 2026-05-09 | Adriano Jorge            | Tracking; progress requirements                    | Added tracking and progress-related SRS requirements.                                                |
| 0.1.12  | 2026-05-09 | Adriano Jorge            | Domain/API terminology                             | Aligned SRS terminology with domain and API language.                                                |
| 0.1.13  | 2026-05-10 | Johan Nel                | Terminology; integration; traceability             | Performed a broad SRS integration pass, including learner/employee to trainee terminology alignment. |
| 0.1.14  | 2026-05-16 | Johan Nel                | Domain model; campaign-item model; terminology     | Updated SRS to match the revised modular campaign/domain model and trainee terminology.              |
| 0.1.15  | 2026-05-19 | Johan Nel                | Demo 1 scope; future scope                         | Clarified Demo 1 scope and later-demo planned features.                                              |
| 0.1.16  | 2026-05-21 | Johan Nel                | Headings; links; formatting                        | Cleaned headings/file links and formatted SRS as part of final domain-model documentation updates.   |
| 0.1.17  | 2026-07-16 | Rudolph Lamprecht        | UC-07 invitation acceptance                        | Added Demo 2 UC-07 invitation acceptance requirements and traceability.                              |
| Version | Date       | Author(s)                | Sections / Area Updated                            | Summary of Change                                                                                      |
| ------- | ---------- | ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0.1.0   | 2026-04-27 | Johan Nel                | Initial document                                   | Created the initial Demo 1 SRS structure.                                                              |
| 0.1.1   | 2026-04-28 | Adriano Jorge            | UC-01 simulated inbox; traceability references     | Added simulated inbox requirements and related SRS refinements.                                        |
| 0.1.2   | 2026-04-30 | Rudolph Lamprecht        | Admin/campaign context; architecture/API alignment | Added campaign/admin-related SRS content and aligned with early API/architecture thinking.             |
| 0.1.3   | 2026-04-30 | Zoë Joubert; Connor Bell | UC-03 quiz flow; traceability                      | Added quiz-flow requirements and corrected related traceability.                                       |
| 0.1.4   | 2026-04-30 | Connor Bell              | UC-02 training document                            | Added final Demo 1 training-view SRS requirements.                                                     |
| 0.1.5   | 2026-05-01 | Adriano Jorge            | Domain model alignment                             | Added SRS alignment for the initial domain model.                                                      |
| 0.1.6   | 2026-05-03 | Zoë Joubert              | Validation; feedback; phishing feedback scope      | Added validation and UI feedback requirements for Demo 1.                                              |
| 0.1.7   | 2026-05-07 | Johan Nel                | Document structure; cross-references; use cases    | Reworked SRS structure and aligned it with related Demo 1 documents.                                   |
| 0.1.8   | 2026-05-07 | Johan Nel                | Use-case diagrams                                  | Linked or referenced Demo 1 use-case diagrams from the SRS.                                            |
| 0.1.9   | 2026-05-08 | Rudolph Lamprecht        | API/architecture cross-reference                   | Added API-contract linkage and architecture-related SRS references.                                    |
| 0.1.10  | 2026-05-09 | Connor Bell              | Minor SRS amendments                               | Applied minor SRS wording/consistency updates alongside design navigation documentation.               |
| 0.1.11  | 2026-05-09 | Adriano Jorge            | Tracking; progress requirements                    | Added tracking and progress-related SRS requirements.                                                  |
| 0.1.12  | 2026-05-09 | Adriano Jorge            | Domain/API terminology                             | Aligned SRS terminology with domain and API language.                                                  |
| 0.1.13  | 2026-05-10 | Johan Nel                | Terminology; integration; traceability             | Performed a broad SRS integration pass, including learner/employee to trainee terminology alignment.   |
| 0.1.14  | 2026-05-16 | Johan Nel                | Domain model; campaign-item model; terminology     | Updated SRS to match the revised modular campaign/domain model and trainee terminology.                |
| 0.1.15  | 2026-05-19 | Johan Nel                | Demo 1 scope; future scope                         | Clarified Demo 1 scope and later-demo planned features.                                                |
| 0.1.16  | 2026-05-21 | Johan Nel                | Headings; links; formatting                        | Cleaned headings/file links and formatted SRS as part of final domain-model documentation updates.     |
| 0.1.17  | 2026-07-16 | Rudolph Lamprecht        | UC-05 use case; UC-05 functional requirements      | Added UC-05 SRS scope, actors, flows, RBAC/business rules, exceptions, and planned issue traceability. |
