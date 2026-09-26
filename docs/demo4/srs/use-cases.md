# Use Cases

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- **[4. Use Cases](#4-use-cases)** &larr; _You are here_
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 4. Use Cases

The flows below describe implemented user-visible behaviour. Permission names are included where a dedicated permission is part of the product contract.

### 4.1 Authentication and Account Access Use Cases

### `AUTH-01` Register and Verify an Individual Account

- **Primary actor:** Individual Trainee.
- **Starts when:** The visitor submits valid registration details.
- **Flow:** The system creates a pending account, sends a verification link, validates the single-use token, and activates the account.
- **Exceptions:** Conflicting registrations and invalid, expired, revoked, or used tokens are rejected without exposing protected account information.
- **Ends when:** The verified trainee can log in.
- **Traceability:** User story 2.1; `R1`.

### `AUTH-02` Log In and Log Out

- **Primary actor:** Registered user.
- **Flow:** The system validates credentials and applicable account, organisation, verification, and security state, creates a session, and routes the user to the supported area; logout revokes the current session.
- **Exceptions:** Invalid credentials receive a safe generic response, and disabled or ineligible users receive no session.
- **Traceability:** User story 2.2; `R1`.

### `AUTH-03` Recover Account Access

- **Primary actor:** Account holder.
- **Flow:** The user requests a reset, receives an enumeration-safe response, presents an eligible single-use token, sets a compliant password, and has existing sessions revoked.
- **Exceptions:** Invalid, expired, superseded, revoked, or used tokens do not change credentials.
- **Traceability:** User story 2.3; `R1`.

### `AUTH-04` Manage Personal Account Security

- **Primary actor:** Authenticated user.
- **Flow:** The user updates supported profile or email data, changes the password, or reviews and revokes sessions with the required confirmation checks.
- **Exceptions:** Current-password, token, organisation-policy, and conflict failures preserve existing account state.
- **Traceability:** User stories 2.5-2.6; `R14`.

### 4.2 Training, Administration, and Authoring Use Cases

### `UC-01` Use a Simulated Inbox

- **Primary actor:** Trainee with an available Campaign item.
- **Flow:** The trainee opens the scoped inbox, reads simulated email details, classifies messages, and interacts with controlled links or attachments.
- **Result:** Supported open, classification, and link events are recorded against the assignment and item; no real mailbox is accessed.
- **Exceptions:** Cross-user, unavailable, or out-of-scope resources are denied without disclosing their content.
- **Traceability:** User stories 5.1 and 5.3; `R2`, `R3`, `R25`.

### `UC-02` Complete a Training Document

- **Primary actor:** Trainee with an available Campaign item.
- **Flow:** The trainee opens the rendered Markdown document, reads it, and completes the supported completion action.
- **Result:** Viewed and completed state is recorded idempotently and subsequent Campaign availability is refreshed.
- **Traceability:** User stories 5.1-5.2; `R2`, `R4`.

### `UC-03` Complete Repeated Quiz Attempts

- **Primary actor:** Trainee with an available Quiz occurrence.
- **Flow:** Starting resumes the same `IN_PROGRESS` attempt when present; otherwise it creates a new attempt if submitted attempts remain below `maxAttempts`. The trainee uses radio controls for single-choice questions and checkboxes for multiple-choice questions, then submits the selected option IDs.
- **Result:** The attempt becomes submitted, remains in history, and results and feedback become available. BEST, LATEST, or AVERAGE policy determines the effective occurrence score.
- **Exceptions:** Submitted attempts cannot be resubmitted, correct answers are not exposed before submission, and no new attempt is created after the limit.
- **Traceability:** User stories 5.4-5.7; `R5`.

### `UC-04` Request and Review Organisation Registration

- **Primary actors:** Organisation representative and authorised Platform Administrator.
- **Flow:** The representative submits a validated request; the administrator reviews it and approves or rejects it.
- **Result:** Approval begins the initial-administrator setup flow, while rejection grants no organisation access.
- **Traceability:** User stories 1.1-1.2; `R6`, `R7`.

### `UC-05` Complete Organisation Setup or Invitation

- **Primary actor:** Invited initial administrator, trainee, or administrator candidate.
- **Flow:** The user validates the scoped invitation or setup token, reviews the offered membership or role, and completes the supported account/setup action.
- **Exceptions:** Expired, revoked, superseded, mismatched, or used invitations do not change membership or authority.
- **Traceability:** User stories 1.3-1.4, 2.4, and 4.1; `R8`, `R9`.

### `UC-06` Manage Organisation People and Security

- **Primary actor:** Organisation Administrator with the required people, administrator, permission, or security authority.
- **Flow:** The administrator manages supported trainee invitations and membership state, administrator roles and permissions, or organisation security settings within the selected organisation.
- **Exceptions:** Cross-organisation access and operations beyond the actor's permissions are denied; protected-administrator constraints remain enforced.
- **Traceability:** User stories 6.1-6.3; `R10`, `R11`, `R13`.

### `UC-07` Manage Platform Administration and Organisation Lifecycle

- **Primary actor:** Authorised Platform Administrator or Platform Super-Administrator.
- **Flow:** The actor manages supported platform administrators or reviews an organisation and performs an available lifecycle action.
- **Result:** Platform-role invariants and organisation access effects are preserved, with supported lifecycle events recorded.
- **Traceability:** User stories 7.1-7.2 and 8.1-8.3; `R12`, `R15`, `R27`.

### `UC-16` Manage Platform Campaigns

- **Primary actor:** Platform Administrator.
- **Flow:** The administrator creates or edits a Draft, activates it, archives or reactivates it, or copies an Active Campaign into a fresh Draft.
- **Result:** The copy receives fresh Campaign and item identities while preserving eligible structure, order, settings, and reusable-content references.
- **Traceability:** User stories 7.3-7.4; `R18`, `R19`.

### `UC-17` Build an Organisation Campaign

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Flow:** The administrator creates a Draft, selects eligible platform or same-organisation content, orders items, marks required state, creates direct-child groups, and configures Quiz occurrence settings.
- **Result:** The canonical Draft is saved through the existing Campaign Builder and may later be activated through the supported lifecycle.
- **Exceptions:** Nested groups and ineligible or cross-scope content are rejected.
- **Traceability:** User stories 6.7-6.8; `R19`.

### `UC-18` Author a Training Document

- **Primary actor:** Authorised platform or organisation content creator.
- **Flow:** The creator creates or edits a Draft, previews its Markdown, explicitly saves it, and activates it when ready.
- **Result:** The document becomes Campaign-eligible when Available; supported archive, restore, and copy-to-Draft actions preserve lifecycle rules.
- **Exceptions:** Available content remains read-only where editing requires a copy.
- **Traceability:** User story 6.4; `R20`.

### `UC-19` Author a Quiz

- **Primary actor:** Authorised platform or organisation content creator.
- **Flow:** The creator edits Quiz metadata and questions, using radio controls to mark exactly one correct SINGLE_CHOICE option and checkboxes for one or more MULTIPLE_CHOICE options, then saves the Draft and publishes it.
- **Result:** Published Quiz content becomes Campaign-eligible; copying creates a new editable Draft without fabricating persisted child identities.
- **Exceptions:** Invalid option, correctness, selection-bound, category, or lifecycle state prevents the transition.
- **Traceability:** User story 6.5; `R20`.

### `UC-20` Author Organisation Emails and Simulated Inboxes

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Flow:** The creator drafts, reviews, activates, or copies reusable Organisation Emails and uses eligible emails to compose and order a Simulated Inbox through its supported lifecycle.
- **Result:** A Campaign may select a Simulation only when its parent state and inbox state satisfy Campaign eligibility.
- **Exceptions:** An Organisation Email Draft is never treated as a Campaign-eligible Simulated Inbox by itself.
- **Traceability:** User story 6.6; `R20`.

### `UC-21` Generate Editable Content with AI

- **Primary actor:** Authorised content creator.
- **Flow:** From a normal Training Document, Quiz, or Organisation Email builder, the creator supplies the supported generation intent and receives editable Draft-shaped fields in that same builder.
- **Result:** Existing unsaved content is preserved on failure; successful generated content still requires explicit review, save, and lifecycle transition.
- **Exceptions:** Generation does not publish, activate, assign, send email, or create a Campaign.
- **Traceability:** User story 6.13; `R21`.

### `UC-22` Browse and Self-Enrol in a Platform Campaign

- **Primary actor:** Eligible Individual Trainee.
- **Flow:** The trainee browses available platform Campaigns, reviews a selection, and confirms self-enrolment.
- **Result:** One enrolment grants Campaign access; a duplicate enrolment is not created.
- **Traceability:** User stories 3.1-3.2; `R22`.

### `UC-24` View Available Training Campaigns

- **Primary actor:** Individual or Organisation Trainee.
- **Flow:** The trainee opens the Campaign area and views Campaigns available through personal enrolment or same-organisation assignment, then opens an available Campaign to inspect ordered item and progress state.
- **Exceptions:** Campaigns outside the authenticated trainee's enrolments or assignments are not disclosed.
- **Traceability:** User stories 4.2 and 5.1; `R2`.

### `UC-26` Assign or Unassign an Organisation Campaign

- **Primary actor:** Organisation Administrator with `ASSIGN_CAMPAIGNS`.
- **Flow:** The administrator selects an assignable active Campaign and eligible active same-organisation trainees, confirms assignment, or removes a selected existing assignment.
- **Exceptions:** Duplicate, inactive, cross-organisation, invalid-candidate, and stale operations are rejected transactionally.
- **Traceability:** User stories 6.10-6.11; `R23`.

### `UC-31` Review Campaign Statistics

- **Primary actor:** Authorised Campaign manager in the applicable platform or organisation scope.
- **Flow:** The actor opens an existing Campaign's statistics view and reviews the implemented scoped participation and result measures.
- **Exceptions:** Cross-scope Campaign data is not returned.
- **Traceability:** User story 6.12; `R26`.

### `UC-36` Configure an Adaptive Campaign Item

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Flow:** In the existing Campaign Builder, the administrator chooses one component type and eligible EASY, MEDIUM, and HARD alternatives with the same non-empty category set, then configures required state and Quiz settings where applicable.
- **Result:** The adaptive occurrence may remain top-level or become a direct group child. At trainee runtime, one alternative is selected from backend-computed category state and persisted per assignment and item.
- **Exceptions:** Missing, incompatible, ineligible, or empty-category alternatives prevent a valid save; non-Quiz items do not carry Quiz settings.
- **Traceability:** User stories 5.8 and 6.8; `R2`, `R19`.

### `UC-37` Generate a Missing Adaptive Variant

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Flow:** The administrator requests AI help for a missing supported Training Document or Quiz difficulty using a selected same-type, same-category alternative as bounded source context. The normal builder receives the editable Draft and quality findings.
- **Result:** The administrator reviews, saves, and activates or publishes the new content before returning to select it manually in the Campaign Builder.
- **Exceptions:** No whole-Simulated-Inbox generator is implied, and generated content is never attached automatically.
- **Traceability:** User story 6.14; `R21`.

### `UC-38` Review a Complete Campaign Proposal

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Flow:** The administrator requests a proposal, reviews and edits its name and description, inspects rationale and findings, removes unwanted suggestions, and opens generated Draft data in the appropriate normal builder where supported.
- **Result:** Proposal state remains transient. Only real eligible persisted content selected by the administrator can enter the existing Campaign Builder.
- **Exceptions:** Proposal keys and generated Draft payloads are not persisted as Campaign content identifiers.
- **Traceability:** User stories 6.15 and 6.17; `R21`.

### `UC-39` Review a Follow-Up Campaign Proposal

- **Primary actor:** Organisation Administrator with `MANAGE_CAMPAIGNS`.
- **Flow:** The administrator selects an eligible active assignment candidate and requests a follow-up proposal. The backend computes category state from the trainee's supported evidence and returns an editable transient suggestion.
- **Result:** The administrator decides what eligible content enters the Campaign; no Campaign is saved, activated, or assigned automatically.
- **Exceptions:** A stale or no-longer-eligible trainee is rejected, and raw trainee history is not supplied by the browser or sent as an unrestricted AI input.
- **Traceability:** User stories 6.16-6.17; `R21`.

---

Previous section: [Functional Requirements](functional-requirements.md)

Next section: [Quality Requirements](quality-requirements.md)
