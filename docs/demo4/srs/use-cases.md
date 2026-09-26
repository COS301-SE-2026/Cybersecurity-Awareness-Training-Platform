# Use Cases

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- **[4. Use Cases](#4-use-cases)** &larr; _You are here_
  - [4.1 Use-Case Diagrams](#41-use-case-diagrams)
  - [4.2 Authentication and Account Access](#42-authentication-and-account-access)
    - [`AUTH-01` Register and Verify an Individual Account](#auth-01-register-and-verify-an-individual-account)
    - [`AUTH-02` Log In and Log Out](#auth-02-log-in-and-log-out)
    - [`AUTH-03` Recover Account Access](#auth-03-recover-account-access)
    - [`AUTH-04` Manage Personal Account Security](#auth-04-manage-personal-account-security)
  - [4.3 Training, Administration, and Authoring](#43-training-administration-and-authoring)
    - [`UC-01` Use a Simulated Inbox](#uc-01-use-a-simulated-inbox)
    - [`UC-02` Complete a Training Document](#uc-02-complete-a-training-document)
    - [`UC-03` Complete Repeated Quiz Attempts](#uc-03-complete-repeated-quiz-attempts)
    - [`UC-04` Request and Review Organisation Registration](#uc-04-request-and-review-organisation-registration)
    - [`UC-05` Complete Organisation Setup or Invitation](#uc-05-complete-organisation-setup-or-invitation)
    - [`UC-06` Manage Organisation People and Security](#uc-06-manage-organisation-people-and-security)
    - [`UC-07` Manage Platform Administration and Organisation Lifecycle](#uc-07-manage-platform-administration-and-organisation-lifecycle)
    - [`UC-16` Manage Platform Campaigns](#uc-16-manage-platform-campaigns)
    - [`UC-17` Build an Organisation Campaign](#uc-17-build-an-organisation-campaign)
    - [`UC-18` Author a Training Document](#uc-18-author-a-training-document)
    - [`UC-19` Author a Quiz](#uc-19-author-a-quiz)
    - [`UC-20` Author Organisation Emails and Simulated Inboxes](#uc-20-author-organisation-emails-and-simulated-inboxes)
    - [`UC-21` Generate Editable Content with AI](#uc-21-generate-editable-content-with-ai)
    - [`UC-22` Browse and Self-Enrol in a Platform Campaign](#uc-22-browse-and-self-enrol-in-a-platform-campaign)
    - [`UC-24` View Available Training Campaigns](#uc-24-view-available-training-campaigns)
    - [`UC-26` Assign or Unassign an Organisation Campaign](#uc-26-assign-or-unassign-an-organisation-campaign)
    - [`UC-31` Review Campaign Statistics](#uc-31-review-campaign-statistics)
    - [`UC-36` Configure an Adaptive Campaign Item](#uc-36-configure-an-adaptive-campaign-item)
    - [`UC-37` Generate a Missing Adaptive Variant](#uc-37-generate-a-missing-adaptive-variant)
    - [`UC-38` Review a Complete Campaign Proposal](#uc-38-review-a-complete-campaign-proposal)
    - [`UC-39` Review a Follow-Up Campaign Proposal](#uc-39-review-a-follow-up-campaign-proposal)
  - [4.4 Use-Case Traceability Summary](#44-use-case-traceability-summary)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 4. Use Cases

The flows below describe implemented user-visible behaviour. Permission names are included where a dedicated permission is part of the product contract.

### 4.1 Use-Case Diagrams

The [Demo 4 Use-Case Diagrams](../diagrams/srs/use-cases/README.md) provide four current overview diagrams:

- account and organisation access;
- trainee Campaign participation;
- content and Campaign administration;
- AI-assisted administration with explicit human lifecycle actions.

The diagrams are navigation aids. The detailed cases below are authoritative for preconditions, flow, exceptions, postconditions, and requirement traceability.

### 4.2 Authentication and Account Access

### `AUTH-01` Register and Verify an Individual Account

- **Primary actor:** Individual Trainee.
- **Supporting actor:** Email delivery provider.
- **Trigger:** The visitor submits the registration form.
- **Preconditions:** The visitor is unauthenticated and the submitted identity does not conflict with protected existing state.
- **Main flow:** The system validates the details, creates a pending account, sends a verification link, validates the scoped single-use token, and activates the account.
- **Exceptions:** Conflicting registrations and invalid, expired, revoked, or used tokens are rejected without exposing protected account information.
- **Postconditions:** A verified trainee can log in; failure leaves no falsely verified account.
- **Related requirements:** [`R1`](functional-requirements.md#r1-authentication-and-account-access); user story 2.1.

### `AUTH-02` Log In and Log Out

- **Primary actor:** Registered user.
- **Trigger:** The user submits credentials or selects logout.
- **Preconditions:** Login requires an eligible account; logout requires an identifiable current client session.
- **Main flow:** The system validates credentials and applicable account, organisation, verification, and security state, creates a session, and routes the user to the supported area; logout revokes the current session.
- **Exceptions:** Invalid credentials receive a safe generic response, and disabled or ineligible users receive no session.
- **Postconditions:** Successful login creates one valid session; logout clears client authentication and revokes the current server session where identifiable.
- **Related requirements:** [`R1`](functional-requirements.md#r1-authentication-and-account-access); user story 2.2.

### `AUTH-03` Recover Account Access

- **Primary actor:** Account holder.
- **Supporting actor:** Email delivery provider.
- **Trigger:** The user requests recovery or submits a reset token and replacement password.
- **Preconditions:** A reset page is available; password replacement requires an eligible scoped token.
- **Main flow:** The user requests a reset, receives an enumeration-safe response, presents an eligible single-use token, sets a compliant password, and has existing sessions revoked.
- **Exceptions:** Invalid, expired, superseded, revoked, or used tokens do not change credentials.
- **Postconditions:** The password changes once, the token is consumed, existing sessions are revoked, and supported notification is attempted.
- **Related requirements:** [`R1`](functional-requirements.md#r1-authentication-and-account-access); user story 2.3.

### `AUTH-04` Manage Personal Account Security

- **Primary actor:** Authenticated user.
- **Trigger:** The user selects a Personal Information, Account, or Sessions action.
- **Preconditions:** The user is authenticated and the selected setting is not prohibited by organisation policy.
- **Main flow:** The user updates supported profile or email data, changes the password, or reviews and revokes sessions with the required confirmation checks.
- **Exceptions:** Current-password, token, organisation-policy, and conflict failures preserve existing account state.
- **Postconditions:** Valid changes are persisted and sensitive changes produce supported notification/audit outcomes.
- **Related requirements:** [`R14`](functional-requirements.md#r14-manage-personal-account-and-security-settings); user stories 2.5-2.6.

### 4.3 Training, Administration, and Authoring

### `UC-01` Use a Simulated Inbox

- **Primary actor:** Trainee with an available Campaign item.
- **Trigger:** The trainee opens an available Simulated Inbox occurrence.
- **Preconditions:** The authenticated trainee has an eligible assignment and the occurrence is unlocked and resolved where adaptive.
- **Main flow:** The system loads the scoped inbox; the trainee opens a simulated message, reviews its controlled content, selects a classification and warning signs, submits, and reviews feedback.
- **Alternate flow:** A controlled simulated link records the supported interaction and remains within the training boundary.
- **Exceptions:** Cross-user, unavailable, or out-of-scope resources are denied without disclosing their content.
- **Postconditions:** Supported open, classification, warning-sign, and link events are recorded against the assignment and item; no real mailbox is accessed.
- **Related requirements:** [`R2`](functional-requirements.md#r2-trainee-campaign-access), [`R3`](functional-requirements.md#r3-view-emails-in-a-simulated-inbox), and [`R25`](functional-requirements.md#r25-classify-and-interact-with-simulated-email-threats); user stories 5.1 and 5.3.

### `UC-02` Complete a Training Document

- **Primary actor:** Trainee with an available Campaign item.
- **Trigger:** The trainee selects an available Training Document occurrence.
- **Preconditions:** The assignment is accessible and item prerequisites are satisfied.
- **Main flow:** The system loads the referenced eligible document, renders its supported Markdown, records supported view activity, and accepts the explicit completion action.
- **Exceptions:** Missing, ineligible, cross-user, or unsupported references produce a safe unavailable/error state and do not fabricate completion.
- **Postconditions:** Completion is recorded idempotently and subsequent Campaign availability is refreshed.
- **Related requirements:** [`R2`](functional-requirements.md#r2-trainee-campaign-access) and [`R4`](functional-requirements.md#r4-view-a-training-document); user stories 5.1-5.2.

### `UC-03` Complete Repeated Quiz Attempts

- **Primary actor:** Trainee with an available Quiz occurrence.
- **Trigger:** The trainee opens the Quiz or chooses an allowed retake.
- **Preconditions:** The occurrence is accessible, the Quiz is eligible, and the configured attempt limit permits starting or resuming.
- **Main flow:** The system resumes the compatible `IN_PROGRESS` attempt or creates one, presents safe questions/options, validates radio/checkbox selections, scores a valid submission, and displays results.
- **Alternate flow:** After a submitted attempt, a new attempt is created only when attempts remain.
- **Exceptions:** Submitted attempts cannot be resubmitted, correct answers are not exposed before submission, and no new attempt is created after the limit.
- **Postconditions:** The submitted attempt remains historical; `BEST`, `LATEST`, or `AVERAGE` policy determines the effective occurrence score.
- **Related requirements:** [`R5`](functional-requirements.md#r5-complete-a-quiz-and-view-results); user stories 5.4-5.7.

### `UC-04` Request and Review Organisation Registration

- **Primary actor:** Organisation representative; authorised Platform Administrator during review.
- **Trigger:** A representative submits a request and a platform administrator later selects a review action.
- **Preconditions:** The request data is valid and does not conflict with protected existing state; review requires platform authority.
- **Main flow:** The system persists a pending request, presents it for review, and the administrator approves or rejects it.
- **Exceptions:** Duplicate, stale, unauthorised, or invalid lifecycle transitions are rejected without duplicate organisation state.
- **Postconditions:** Approval begins initial-administrator setup; rejection grants no organisation access; supported lifecycle events are recorded.
- **Related requirements:** [`R6`](functional-requirements.md#r6-request-organisation-registration) and [`R7`](functional-requirements.md#r7-review-and-manage-organisation-registrations); user stories 1.1-1.2.

### `UC-05` Complete Organisation Setup or Invitation

- **Primary actor:** Invited initial administrator, trainee, or administrator candidate.
- **Trigger:** The invitee opens an invitation/setup link and confirms the offered action.
- **Preconditions:** The token is valid, scoped, unused, unexpired, and matches the intended recipient and current invitation state.
- **Main flow:** The user validates the token, reviews the offered membership or role, supplies required account details, and completes the supported account/setup action.
- **Exceptions:** Expired, revoked, superseded, mismatched, or used invitations do not change membership or authority.
- **Postconditions:** The intended account/membership transition completes once and the token is consumed only after success.
- **Related requirements:** [`R8`](functional-requirements.md#r8-complete-initial-organisation-administrator-setup) and [`R9`](functional-requirements.md#r9-accept-an-organisation-invitation-or-role-change); user stories 1.3-1.4, 2.4, and 4.1.

### `UC-06` Manage Organisation People and Security

- **Primary actor:** Organisation Administrator with the required people, administrator, permission, or security authority.
- **Trigger:** The administrator selects an available people, administrator, permission, or security-setting action.
- **Preconditions:** The actor belongs to the organisation and holds the dedicated permission for the selected action.
- **Main flow:** The system loads same-organisation data, validates the target and actor authority, applies the supported invitation/membership/permission/security change, and records its outcome.
- **Exceptions:** Cross-organisation access and operations beyond the actor's permissions are denied; protected-administrator constraints remain enforced.
- **Postconditions:** Valid state changes affect only the selected organisation; failed validation preserves prior state.
- **Related requirements:** [`R10`](functional-requirements.md#r10-manage-organisation-trainees), [`R11`](functional-requirements.md#r11-manage-organisation-administrators-and-permissions), and [`R13`](functional-requirements.md#r13-configure-organisation-security-settings); user stories 6.1-6.3.

### `UC-07` Manage Platform Administration and Organisation Lifecycle

- **Primary actor:** Authorised Platform Administrator or Platform Super-Administrator.
- **Trigger:** The actor selects a supported platform-administrator or organisation-lifecycle action.
- **Preconditions:** The actor has the required platform authority and the target is in an eligible current state.
- **Main flow:** The system validates authority and invariants, performs the selected invitation/role/lifecycle operation, applies required access/session effects, and records the outcome.
- **Exceptions:** Self-escalation, last-authority violations, stale state, and unauthorised operations are rejected.
- **Postconditions:** Platform-role invariants and organisation access effects are preserved, with supported lifecycle events recorded truthfully.
- **Related requirements:** [`R12`](functional-requirements.md#r12-manage-platform-administrators), [`R15`](functional-requirements.md#r15-manage-organisation-lifecycle-and-access), and [`R27`](functional-requirements.md#r27-record-supported-audit-and-lifecycle-events); user stories 7.1-7.2 and 8.1-8.3.

### `UC-16` Manage Platform Campaigns

- **Primary actor:** Platform Administrator.
- **Trigger:** The administrator opens platform Campaign management and chooses a create, edit, lifecycle, or copy action.
- **Preconditions:** The actor has platform authority and referenced content is platform-owned and eligible for the intended transition.
- **Main flow:** The administrator creates or edits a Draft in the existing Campaign Builder, saves it, and explicitly activates, archives, reactivates, or copies it when eligible.
- **Alternate flow:** Copying an Active Campaign creates a fresh Draft with new structural identities and preserved eligible configuration.
- **Exceptions:** Invalid state, stale identity, graph, or content eligibility prevents the action without altering the source Campaign.
- **Postconditions:** The requested lifecycle state or fresh Draft exists; assignments and trainee runtime history are not copied.
- **Related requirements:** [`R18`](functional-requirements.md#r18-manage-platform-campaigns) and [`R19`](functional-requirements.md#r19-manage-organisation-campaigns); user stories 7.3-7.4.

### `UC-17` Build an Organisation Campaign

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Trigger:** The administrator creates a Campaign or edits an organisation Campaign Draft.
- **Preconditions:** The actor belongs to the organisation, has `MANAGE_CAMPAIGNS`, and the Campaign is editable.
- **Main flow:** The administrator edits metadata, selects eligible platform or same-organisation content, orders items, marks required state, creates direct-child groups, configures Quiz occurrence settings, reviews, and saves.
- **Alternate flow:** An Active Campaign is copied to a fresh Draft before changes are made.
- **Exceptions:** Nested groups and ineligible or cross-scope content are rejected.
- **Postconditions:** The canonical Draft is saved through the only Campaign graph editor and may later be activated explicitly.
- **Related requirements:** [`R19`](functional-requirements.md#r19-manage-organisation-campaigns); user stories 6.7-6.9.

### `UC-18` Author a Training Document

- **Primary actor:** Authorised platform or organisation content creator.
- **Trigger:** The creator opens a new or existing Training Document Draft.
- **Preconditions:** The actor has the required scope and the selected document is editable or is being copied to a Draft.
- **Main flow:** The creator edits title, summary, Markdown, categories, and difficulty, previews the content, explicitly saves the Draft, and activates it when ready.
- **Alternate flow:** The creator archives/restores where supported or copies immutable content into a fresh Draft.
- **Exceptions:** Available content remains read-only where editing requires a copy.
- **Postconditions:** The document becomes Campaign-eligible only when `AVAILABLE`; the normal renderer and lifecycle remain authoritative.
- **Related requirements:** [`R20`](functional-requirements.md#r20-manage-reusable-campaign-content); user story 6.4.

### `UC-19` Author a Quiz

- **Primary actor:** Authorised platform or organisation content creator.
- **Trigger:** The creator opens a new or existing Quiz Draft.
- **Preconditions:** The actor has the required scope and the Quiz is editable or is being copied.
- **Main flow:** The creator edits metadata, ordered questions, positional option labels, complete answer text, correctness, feedback, categories, difficulty, and selection rules; then saves and publishes explicitly.
- **Alternate flow:** Switching question type updates radio/checkbox correctness semantics and clears invalid stale selection bounds/correct flags.
- **Exceptions:** Invalid option, correctness, selection-bound, category, or lifecycle state prevents the transition.
- **Postconditions:** Published Quiz content becomes Campaign-eligible; copying creates a new editable Draft without fabricating persisted child identities.
- **Related requirements:** [`R20`](functional-requirements.md#r20-manage-reusable-campaign-content); user story 6.5.

### `UC-20` Author Organisation Emails and Simulated Inboxes

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Trigger:** The creator opens the organisation Email library or Simulated Inbox creator.
- **Preconditions:** The actor has `MANAGE_CAMPAIGNS` in the organisation and all selected content belongs to the allowed scope.
- **Main flow:** The creator drafts, reviews, activates, or copies reusable Organisation Emails, then selects eligible messages, orders them, configures the Simulation/Inbox, and completes supported approval/activation.
- **Alternate flow:** A copied email or inbox starts as a fresh editable Draft while the source remains unchanged.
- **Exceptions:** An Organisation Email Draft is never treated as a Campaign-eligible Simulated Inbox by itself.
- **Postconditions:** A Campaign may select a Simulation only when its parent safety state and inbox state satisfy eligibility.
- **Related requirements:** [`R20`](functional-requirements.md#r20-manage-reusable-campaign-content); user story 6.6.

### `UC-21` Generate Editable Content with AI

- **Primary actor:** Authorised content creator.
- **Trigger:** The creator selects Generate with AI in a supported normal builder.
- **Preconditions:** The actor is authorised for that builder and supplies valid generation intent; organisation context remains backend controlled.
- **Main flow:** The creator supplies guidance, requests generation, waits while duplicate submission is disabled, and receives schema-validated editable Draft-shaped fields in the same builder.
- **Alternate flow:** The creator edits or rejects any generated field before choosing whether to save.
- **Exceptions:** Generation does not publish, activate, assign, send email, or create a Campaign.
- **Postconditions:** Success changes only unsaved builder state; failure preserves the existing unsaved Draft.
- **Related requirements:** [`R21`](functional-requirements.md#r21-use-ai-assisted-drafting-and-campaign-proposals); user story 6.13.

### `UC-22` Browse and Self-Enrol in a Platform Campaign

- **Primary actor:** Eligible Individual Trainee.
- **Trigger:** The trainee opens platform Campaign discovery and selects enrolment.
- **Preconditions:** The trainee is eligible and the platform Campaign is active and available for self-enrolment.
- **Main flow:** The system lists available Campaigns, the trainee reviews one and confirms enrolment, and the system creates or returns the one valid enrolment.
- **Exceptions:** Unavailable, organisation-only, or otherwise ineligible Campaigns cannot be self-enrolled.
- **Postconditions:** One enrolment grants Campaign access; duplicate requests do not create duplicate enrolments.
- **Related requirements:** [`R22`](functional-requirements.md#r22-discover-and-self-enrol-in-platform-campaigns); user stories 3.1-3.2.

### `UC-24` View Available Training Campaigns

- **Primary actor:** Individual or Organisation Trainee.
- **Trigger:** The trainee opens **Campaigns** or selects an available Campaign.
- **Preconditions:** The trainee has a valid enrolment or assignment and an active eligible account context.
- **Main flow:** The system lists scoped Campaigns; the trainee opens one and reviews ordered items, groups, required state, completion, and availability.
- **Exceptions:** Campaigns outside the authenticated trainee's enrolments or assignments are not disclosed.
- **Postconditions:** No Campaign state changes merely by viewing; available items can be opened through their dedicated learning flow.
- **Related requirements:** [`R2`](functional-requirements.md#r2-trainee-campaign-access); user stories 4.2 and 5.1.

### `UC-26` Assign or Unassign an Organisation Campaign

- **Primary actor:** Organisation Administrator with `ASSIGN_CAMPAIGNS`.
- **Trigger:** The administrator confirms selected-trainee assignment or confirmed destructive unassignment.
- **Preconditions:** The actor has `ASSIGN_CAMPAIGNS`; the Campaign and trainee candidates satisfy same-organisation active eligibility.
- **Main flow:** For assignment, the administrator selects a Campaign and eligible trainees, reviews, and confirms. For unassignment, the administrator selects one existing assignment and confirms permanent removal.
- **Exceptions:** Duplicate, inactive, cross-organisation, invalid-candidate, and stale operations are rejected transactionally.
- **Postconditions:** Assignment creates only valid non-duplicate rows; unassignment transactionally removes the assignment and dependent progress and records bounded revocation audit context.
- **Related requirements:** [`R23`](functional-requirements.md#r23-assign-campaigns-to-organisation-trainees); user stories 6.10-6.11.

### `UC-31` Review Campaign Statistics

- **Primary actor:** Authorised Campaign manager in the applicable platform or organisation scope.
- **Trigger:** The actor opens statistics for a selected Campaign.
- **Preconditions:** The actor is authorised for that Campaign and scope.
- **Main flow:** The system validates Campaign access, calculates or loads the implemented participation/result measures, and displays them for review.
- **Exceptions:** Cross-scope Campaign data is not returned.
- **Postconditions:** Statistics are viewed without changing Campaign or trainee state; empty data is represented truthfully.
- **Related requirements:** [`R26`](functional-requirements.md#r26-view-campaign-statistics-and-insights); user story 6.12.

### `UC-36` Configure an Adaptive Campaign Item

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Trigger:** The administrator selects **Add adaptive item** or edits an existing adaptive occurrence.
- **Preconditions:** The Campaign is an editable Draft and eligible content exists for the fixed type, difficulties, and canonical category set.
- **Main flow:** The administrator chooses one component type, selects eligible `EASY`, `MEDIUM`, and `HARD` alternatives with the same non-empty category set, configures required and Quiz settings, and confirms the item.
- **Alternate flow:** The occurrence may remain top-level, move into a group, move out, or reorder while preserving its state and identity rules.
- **Exceptions:** Missing, incompatible, ineligible, or empty-category alternatives prevent a valid save; non-Quiz items do not carry Quiz settings.
- **Postconditions:** The canonical Draft contains one valid adaptive occurrence; at trainee runtime, one alternative is selected deterministically and persisted per assignment/item.
- **Related requirements:** [`R2`](functional-requirements.md#r2-trainee-campaign-access) and [`R19`](functional-requirements.md#r19-manage-organisation-campaigns); user stories 5.8 and 6.8.

### `UC-37` Generate a Missing Adaptive Variant

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Trigger:** The administrator requests AI help for a missing supported adaptive difficulty.
- **Preconditions:** A selected same-type, same-category alternative has preserved title, summary, and categories; the target is Training Document or Quiz.
- **Main flow:** The system carries bounded source metadata and target difficulty to the normal builder, invokes variant generation, and populates editable Draft data plus quality findings.
- **Alternate flow:** The administrator edits or rejects generated fields and may safely return to the Campaign without attachment.
- **Exceptions:** No whole-Simulated-Inbox generator is implied, and generated content is never attached automatically.
- **Postconditions:** Only after explicit save and activation/publication can the new content become eligible for manual selection.
- **Related requirements:** [`R21`](functional-requirements.md#r21-use-ai-assisted-drafting-and-campaign-proposals); user story 6.14.

### `UC-38` Review a Complete Campaign Proposal

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Trigger:** The administrator selects complete proposal and submits valid administrator-facing intent.
- **Preconditions:** The actor has organisation access and `MANAGE_CAMPAIGNS`; backend context and provider configuration are available.
- **Main flow:** The system generates a provider-neutral editable proposal; the administrator reviews/edits metadata, rationale and findings, removes suggestions, and may open generated Draft data in a normal builder.
- **Alternate flow:** Existing proposal state remains available where a later generation failure can be handled non-destructively.
- **Exceptions:** Proposal keys and generated Draft payloads are not persisted as Campaign content identifiers.
- **Postconditions:** Proposal state remains transient; only real eligible persisted IDs manually selected in the Campaign Builder can be saved.
- **Related requirements:** [`R21`](functional-requirements.md#r21-use-ai-assisted-drafting-and-campaign-proposals); user stories 6.15 and 6.17.

### `UC-39` Review a Follow-Up Campaign Proposal

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Trigger:** The administrator selects follow-up, chooses an eligible trainee, and requests a proposal.
- **Preconditions:** The actor has organisation access and `MANAGE_CAMPAIGNS`; the trainee still satisfies canonical active assignment-candidate eligibility.
- **Main flow:** The backend authoritatively validates the trainee, computes category state from supported evidence, requests the follow-up proposal, and returns an editable transient suggestion.
- **Alternate flow:** The administrator removes or edits suggestions and materialises content only through normal builders and lifecycle actions.
- **Exceptions:** A stale or no-longer-eligible trainee is rejected, and raw trainee history is not supplied by the browser or sent as an unrestricted AI input.
- **Postconditions:** The administrator decides what eligible content enters the Campaign; no Campaign is saved, activated, or assigned automatically.
- **Related requirements:** [`R21`](functional-requirements.md#r21-use-ai-assisted-drafting-and-campaign-proposals); user stories 6.16-6.17.

### 4.4 Use-Case Traceability Summary

| Area                                       | Use cases                   | Primary requirements |
| ------------------------------------------ | --------------------------- | -------------------- |
| Account access and security                | `AUTH-01` to `AUTH-04`      | `R1`, `R14`          |
| Trainee learning                           | `UC-01` to `UC-03`, `UC-24` | `R2` to `R5`, `R25`  |
| Organisation onboarding and administration | `UC-04` to `UC-07`          | `R6` to `R15`, `R27` |
| Campaign and content authoring             | `UC-16` to `UC-21`          | `R18` to `R21`       |
| Discovery and assignment                   | `UC-22`, `UC-26`            | `R22`, `R23`         |
| Campaign insights                          | `UC-31`                     | `R26`                |
| Adaptive Campaigns and AI proposals        | `UC-36` to `UC-39`          | `R19`, `R21`         |

Each detailed entry above records its actor, trigger, preconditions, success flow, relevant alternate or exception behaviour, postconditions, and direct functional-requirement links. Removed Demo 3 use cases are intentionally not renumbered into unrelated behaviour; the retained identifiers preserve traceability across revisions.

---

Previous section: [Functional Requirements](functional-requirements.md)

Next section: [Quality Requirements](quality-requirements.md)
