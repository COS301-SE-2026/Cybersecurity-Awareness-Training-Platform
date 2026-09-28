# Functional Requirements

This section defines the externally visible and testable behaviour that Insightful Phish provides in Demo 4. It carries the detailed Demo 3 requirement baseline forward and revises only behaviour changed or removed by the implemented product.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- **[3. Functional Requirements](#3-functional-requirements)** &larr; _You are here_
  - [R1 Authentication and Account Access](#r1-authentication-and-account-access)
  - [R2 Trainee Campaign Access](#r2-trainee-campaign-access)
  - [R3 View Emails in a Simulated Inbox](#r3-view-emails-in-a-simulated-inbox)
  - [R4 View a Training Document](#r4-view-a-training-document)
  - [R5 Complete a Quiz and View Results](#r5-complete-a-quiz-and-view-results)
  - [R6 Request Organisation Registration](#r6-request-organisation-registration)
  - [R7 Review and Manage Organisation Registrations](#r7-review-and-manage-organisation-registrations)
  - [R8 Complete Initial Organisation Administrator Setup](#r8-complete-initial-organisation-administrator-setup)
  - [R9 Accept an Organisation Invitation or Role Change](#r9-accept-an-organisation-invitation-or-role-change)
  - [R10 Manage Organisation Trainees](#r10-manage-organisation-trainees)
  - [R11 Manage Organisation Administrators and Permissions](#r11-manage-organisation-administrators-and-permissions)
  - [R12 Manage Platform Administrators](#r12-manage-platform-administrators)
  - [R13 Configure Organisation Security Settings](#r13-configure-organisation-security-settings)
  - [R14 Manage Personal Account and Security Settings](#r14-manage-personal-account-and-security-settings)
  - [R15 Manage Organisation Lifecycle and Access](#r15-manage-organisation-lifecycle-and-access)
  - [R18 Manage Platform Campaigns](#r18-manage-platform-campaigns)
  - [R19 Manage Organisation Campaigns](#r19-manage-organisation-campaigns)
  - [R20 Manage Reusable Campaign Content](#r20-manage-reusable-campaign-content)
  - [R21 Use AI-Assisted Drafting and Campaign Proposals](#r21-use-ai-assisted-drafting-and-campaign-proposals)
  - [R22 Discover and Self-Enrol in Platform Campaigns](#r22-discover-and-self-enrol-in-platform-campaigns)
  - [R23 Assign Campaigns to Organisation Trainees](#r23-assign-campaigns-to-organisation-trainees)
  - [R25 Classify and Interact with Simulated Email Threats](#r25-classify-and-interact-with-simulated-email-threats)
  - [R26 View Campaign Statistics and Insights](#r26-view-campaign-statistics-and-insights)
  - [R27 Record Supported Audit and Lifecycle Events](#r27-record-supported-audit-and-lifecycle-events)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)
- [7. Changelog](changelog.md)

---

## 3. Functional Requirements

Requirements `R16`, `R17`, `R24`, and `R28` from the Demo 3 planning baseline are not Demo 4 commitments. Their removal is recorded in the [Changelog](changelog.md). Retained IDs remain stable so links and review history continue to identify the same capability areas.

## `R1` Authentication and Account Access

Related use cases: [`AUTH-01`-`AUTH-04`](use-cases.md#41-authentication-and-account-access-use-cases).

- `R1.1` The system shall allow an individual trainee to register with required identity, email, password, and confirmation details.
  - `R1.1.1` Registration data shall be validated before account creation.
  - `R1.1.2` The account shall remain pending until its email-verification token is accepted.
  - `R1.1.3` Conflicts with existing accounts, active invitations, or registration requests shall be handled without creating duplicate identity state.
- `R1.2` The system shall allow supported user types to log in through the common login flow.
  - `R1.2.1` Credentials, verification state, user status, membership state, organisation status, and applicable session policy shall be checked before access is granted.
  - `R1.2.2` A successful login shall create an authenticated session and direct the user to an appropriate area.
  - `R1.2.3` Invalid credentials shall produce an enumeration-safe response.
- `R1.3` Logout shall revoke the current session and return the user to a public route.
- `R1.4` Eligible users shall be able to request and complete password recovery.
  - `R1.4.1` The request response shall not disclose whether an account exists.
  - `R1.4.2` A valid reset token and password-policy-compliant replacement shall be required.
  - `R1.4.3` Successful reset shall revoke existing active sessions and issue the supported notification.
- `R1.5` Verification, recovery, setup, invitation, and email-change tokens shall be purpose-bound, scoped, expiring, revocable, and single-use.
  - `R1.5.1` Missing, invalid, expired, revoked, superseded, used, or mismatched tokens shall not change state.
  - `R1.5.2` Resend flows shall enforce their cooldown and supersession rules.
  - `R1.5.3` A token shall be consumed only when its intended state transition succeeds.

## `R2` Trainee Campaign Access

Related use cases: [`UC-22`](use-cases.md#uc-22-browse-and-self-enrol-in-a-platform-campaign) and [`UC-24`](use-cases.md#uc-24-view-available-training-campaigns).

- `R2.1` A trainee shall see only Campaigns made available through a valid personal enrolment or organisation assignment.
  - `R2.1.1` The Campaign list shall provide supported status, progress, and availability information.
  - `R2.1.2` An empty state shall be shown when no Campaign is available.
- `R2.2` Campaign items shall be presented in configured order with required, group, completion, and prerequisite state.
  - `R2.2.1` Locked or unavailable items shall not be opened before their conditions are satisfied.
  - `R2.2.2` Newly available items shall reflect completed prerequisites.
- `R2.3` Activity and progress shall remain scoped to the trainee, assignment, and Campaign occurrence.
  - `R2.3.1` Duplicate completion requests shall not create duplicate completion records.
  - `R2.3.2` The system shall not store submitted credentials or unnecessary sensitive content in progress records.
- `R2.4` An adaptive item shall resolve to one eligible alternative for the assignment and item.
  - `R2.4.1` The backend shall choose difficulty deterministically from supported category evidence and sufficiency rules.
  - `R2.4.2` The first resolution shall be persisted and reused rather than recalculated on each page load.
  - `R2.4.3` Concurrent first-resolution requests shall converge on the persisted resolution.

## `R3` View Emails in a Simulated Inbox

Related use case: [`UC-01`](use-cases.md#uc-01-use-a-simulated-inbox).

- `R3.1` A trainee shall be able to open an assigned and available Simulated Inbox Campaign item.
  - `R3.1.1` Access shall be verified against the authenticated trainee's Campaign assignment and occurrence.
  - `R3.1.2` The simulated inbox shall not connect to the trainee's real mailbox.
- `R3.2` The inbox shall display the supported simulated message summaries, including sender, subject, preview, and timing information where available.
- `R3.3` A trainee shall be able to open a message belonging to the accessible inbox.
  - `R3.3.1` Sender, subject, body, and controlled links or warning-sign information shall be shown in a readable form.
  - `R3.3.2` Links and other interactions shall remain controlled training representations.
- `R3.4` Supported opened and interaction events shall identify the correct trainee, assignment, Campaign item, and simulated content without fabricating completion.
- `R3.5` Loading, empty, unavailable, safe-not-found, and failure states shall not expose another trainee's content.

## `R4` View a Training Document

Related use case: [`UC-02`](use-cases.md#uc-02-complete-a-training-document).

- `R4.1` A trainee shall be able to open an available Training Document occurrence from an accessible Campaign.
  - `R4.1.1` Ownership, assignment, item type, and prerequisite conditions shall be checked.
- `R4.2` The system shall render the approved title, summary, and supported Markdown structure in a readable form.
  - `R4.2.1` Trainees shall not be able to modify reusable Training Document content.
  - `R4.2.2` Unsupported content references shall not be rendered as trusted training material.
- `R4.3` Supported viewed and completed progress shall be recorded without duplicate completion records.
  - `R4.3.1` A failed completion request shall not falsely mark the document complete.
- `R4.4` The trainee shall be able to return to the Campaign and continue to the next available item.

## `R5` Complete a Quiz and View Results

Related use case: [`UC-03`](use-cases.md#uc-03-complete-repeated-quiz-attempts).

- `R5.1` A trainee shall be able to open an assigned, available Quiz occurrence without receiving protected correct-answer data before submission.
- `R5.2` The system shall create or resume an occurrence-scoped Quiz attempt.
  - `R5.2.1` A compatible `IN_PROGRESS` attempt shall be reused.
  - `R5.2.2` A new attempt may be created after submission only when `maxAttempts` permits it.
  - `R5.2.3` Another trainee's attempt shall not be accessible.
- `R5.3` `SINGLE_CHOICE` questions shall accept exactly one selected option and `MULTIPLE_CHOICE` questions shall accept the valid configured selection set.
  - `R5.3.1` Submitted option IDs shall belong to the relevant question.
  - `R5.3.2` Invalid or incomplete answers shall not submit the attempt.
- `R5.4` The backend shall score a valid final submission and persist submitted answers and category performance atomically.
  - `R5.4.1` Duplicate final submission and further editing of a submitted attempt shall be prevented.
  - `R5.4.2` Failed validation shall preserve the in-progress attempt.
- `R5.5` The result shall show the supported pass state, attempt score, effective score, attempts remaining, and educational feedback.
  - `R5.5.1` Effective scoring shall apply the configured `BEST`, `LATEST`, or `AVERAGE` occurrence policy.
  - `R5.5.2` Previous submitted attempts shall remain recorded.

## `R6` Request Organisation Registration

Related use case: [`UC-04`](use-cases.md#uc-04-request-and-review-organisation-registration).

- `R6.1` An applicant shall be able to submit the required organisation and contact details through the public registration request flow.
- `R6.2` The system shall validate required fields, supported contact data, and duplicate/conflicting request state before persistence.
- `R6.3` A successful request shall enter the supported pending-review lifecycle and issue supported status communication.
- `R6.4` Submission failure shall not create a misleading successful request state.

## `R7` Review and Manage Organisation Registrations

Related use case: [`UC-04`](use-cases.md#uc-04-request-and-review-organisation-registration).

- `R7.1` An authorised platform administrator shall be able to list and inspect registration requests.
- `R7.2` The administrator shall be able to record supported contact state and approve or reject an eligible pending request.
  - `R7.2.1` Approval shall create the supported organisation and initial-administrator setup state transactionally.
  - `R7.2.2` Rejection shall not grant organisation access.
- `R7.3` Invalid or repeated lifecycle transitions shall be rejected without duplicating organisation or invitation state.
- `R7.4` Supported review and lifecycle actions shall produce truthful persisted lifecycle/audit information.

## `R8` Complete Initial Organisation Administrator Setup

Related use case: [`UC-05`](use-cases.md#uc-05-complete-organisation-setup-or-invitation).

- `R8.1` The invited initial administrator shall be able to inspect setup availability using the issued token.
- `R8.2` A valid setup shall require matching organisation, invitation, email, expiry, and unused-token state.
- `R8.3` Successful setup shall establish credentials, activate the supported account/membership state, and consume the setup token once.
- `R8.4` Failed or replayed setup shall not create partial or duplicate administrator authority.

## `R9` Accept an Organisation Invitation or Role Change

Related use case: [`UC-05`](use-cases.md#uc-05-complete-organisation-setup-or-invitation).

- `R9.1` An eligible user shall be able to accept a valid organisation invitation or supported role-change invitation.
- `R9.2` The invitation shall be bound to the intended recipient, organisation, role change, purpose, expiry, and current lifecycle state.
- `R9.3` Expired, revoked, superseded, mismatched, or used invitations shall not change membership or authority.
- `R9.4` Acceptance shall complete its related account/membership transition atomically and record the supported audit outcome.

## `R10` Manage Organisation Trainees

Related use case: [`UC-06`](use-cases.md#uc-06-manage-organisation-people-and-security).

- `R10.1` An administrator with the required trainee-management permission shall be able to list, inspect, invite, and perform supported management actions for trainees in the administrator's organisation.
- `R10.2` Candidate and lifecycle operations shall enforce active user, profile, membership, user-type, and organisation rules relevant to the operation.
- `R10.3` Cross-organisation and unauthorised trainee access shall be rejected without exposing protected data.
- `R10.4` Campaign-management permission alone shall not grant general trainee-management access.
- `R10.5` Supported invitation and trainee lifecycle actions shall preserve protected relationships and record truthful outcomes.

## `R11` Manage Organisation Administrators and Permissions

Related use case: [`UC-06`](use-cases.md#uc-06-manage-organisation-people-and-security).

- `R11.1` An authorised organisation administrator shall be able to list and invite administrators within the same organisation.
- `R11.2` Supported role and permission changes shall enforce the actor's own authority and protected-administrator constraints.
- `R11.3` Cross-organisation, self-escalating, or otherwise invalid permission changes shall be rejected.
- `R11.4` Invitations and permission updates shall not leave partial authority when notification or validation fails.
- `R11.5` Supported administrator and permission actions shall be audited with bounded context.

## `R12` Manage Platform Administrators

Related use case: [`UC-07`](use-cases.md#uc-07-manage-platform-administration-and-organisation-lifecycle).

- `R12.1` Authorised platform administrators shall be able to list and invite platform administrators according to platform role constraints.
- `R12.2` Protected revoke, demote, upgrade, and super-administrator transfer operations shall require the applicable authority and eligible target state.
- `R12.3` The platform shall preserve exactly one accountable super-administrator through a successful transfer.
- `R12.4` A protected administrator shall not use an operation that violates self-management or last-authority constraints.
- `R12.5` Supported changes shall revoke sessions where required, issue supported notifications, and record truthful audit outcomes.

## `R13` Configure Organisation Security Settings

Related use case: [`UC-06`](use-cases.md#uc-06-manage-organisation-people-and-security).

- `R13.1` Organisation administrators shall be able to view the security settings for their organisation; edit access shall require the relevant permission.
- `R13.2` Supported settings shall include remember-me policy, regular session length, idle timeout, sensitive-action reauthentication, and user email-change policy where implemented.
- `R13.3` Values shall be validated against platform bounds and incompatible combinations before persistence.
- `R13.4` Updated settings shall affect the intended organisation only and shall not silently alter another organisation's policy.
- `R13.5` Supported policy changes shall produce bounded audit information.

## `R14` Manage Personal Account and Security Settings

Related use case: [`AUTH-04`](use-cases.md#auth-04-manage-personal-account-security).

- `R14.1` An authenticated user shall be able to view and update supported personal profile information.
- `R14.2` Eligible users shall be able to request an email change using the required confirmation/token flow.
- `R14.3` Eligible users shall be able to change a password after the applicable current-password and password-policy checks.
- `R14.4` Users shall be able to inspect and revoke supported sessions without exposing raw session tokens.
- `R14.5` Organisation-managed restrictions shall be shown and enforced rather than overridden from personal settings.
- `R14.6` Sensitive account changes shall issue supported notifications and audit records without sensitive values.

## `R15` Manage Organisation Lifecycle and Access

Related use case: [`UC-07`](use-cases.md#uc-07-manage-platform-administration-and-organisation-lifecycle).

- `R15.1` An authorised platform administrator shall be able to inspect organisation details and onboarding/lifecycle state.
- `R15.2` Supported suspend and reactivate actions shall require valid current state, authority, and reason where required.
- `R15.3` Organisation lifecycle state shall govern linked user access and organisation-scoped operations.
- `R15.4` Reactivation shall not silently restore individually disabled users or revoked invitations.
- `R15.5` Lifecycle actions shall persist actor, reason, time, and truthful outcome in supported lifecycle/audit records.

## `R18` Manage Platform Campaigns

Related use case: [`UC-16`](use-cases.md#uc-16-manage-platform-campaigns).

- `R18.1` A platform administrator shall be able to create, inspect, and edit platform Campaign Drafts using eligible platform-owned content.
- `R18.2` A valid Draft shall be activatable; supported Active Campaigns shall be archivable and Archived Campaigns reactivatable.
- `R18.3` Available platform Campaigns shall be discoverable to eligible individual trainees according to the implemented visibility rules.
- `R18.4` An Active Campaign may be copied to a fresh Draft.
  - `R18.4.1` The copy shall receive fresh Campaign, Campaign-item, group, and adaptive-alternative identities.
  - `R18.4.2` Eligible content references, structure, ordering, required state, and Quiz/adaptive settings shall be preserved.
  - `R18.4.3` Assignments, progress, attempts, evidence, and adaptive resolutions shall not be copied.

## `R19` Manage Organisation Campaigns

Related use cases: [`UC-17`](use-cases.md#uc-17-build-an-organisation-campaign) and [`UC-36`](use-cases.md#uc-36-configure-an-adaptive-campaign-item).

- `R19.1` An administrator with `MANAGE_CAMPAIGNS` shall be able to create and edit organisation Campaign Drafts using eligible platform or same-organisation reusable content.
- `R19.2` The Campaign Builder shall support a canonical ordered graph of:
  - `COMPONENT` items referencing one eligible Training Document, Quiz, or Simulated Inbox;
  - `ADAPTIVE` items containing one fixed content type and exact `EASY`, `MEDIUM`, and `HARD` alternatives;
  - `GROUP` items containing direct `COMPONENT` or `ADAPTIVE` children, never another group.
- `R19.3` Required state, ordering, group placement, and supported group completion configuration shall be editable in a Draft.
- `R19.4` Quiz occurrences shall require `maxAttempts` and `scorePolicy`; non-Quiz items shall omit Quiz settings.
- `R19.5` Adaptive alternatives shall be Campaign-eligible, share the fixed content type, and have the same non-empty canonical category set.
- `R19.6` Changing an adaptive alternative set shall create replacement occurrence identity, while non-identity setting changes may preserve the existing Campaign Item identity.
- `R19.7` Save, activation, and Active-to-Draft copy shall revalidate ownership, lifecycle eligibility, structure, and content references.

## `R20` Manage Reusable Campaign Content

Related use cases: [`UC-18`](use-cases.md#uc-18-author-a-training-document), [`UC-19`](use-cases.md#uc-19-author-a-quiz), and [`UC-20`](use-cases.md#uc-20-author-organisation-emails-and-simulated-inboxes).

- `R20.1` Authorised administrators shall manage Training Documents through supported Draft, `AVAILABLE`, unavailable/archive, restore, and copy workflows.
  - `R20.1.1` Title, summary, Markdown, categories, difficulty, ownership, and lifecycle input shall be validated.
- `R20.2` Authorised administrators shall manage Quizzes through supported Draft, `PUBLISHED`, archive, and copy workflows.
  - `R20.2.1` Questions, positional option labels, complete option text, correctness, feedback, categories, difficulty, and selection bounds shall be validated.
  - `R20.2.2` `SINGLE_CHOICE` shall have exactly one correct option; `MULTIPLE_CHOICE` shall support its valid correct-selection set.
- `R20.3` Authorised organisation administrators shall manage reusable Organisation Emails through supported Draft, `ACTIVE`, and copy workflows.
- `R20.4` Simulated Inboxes shall be composed from eligible controlled messages and managed through the supported Simulation approval and inbox activation/copy lifecycle.
- `R20.5` Organisation-owned content shall remain organisation-scoped; Campaign eligibility shall not make it globally editable.
- `R20.6` Immutable active/published content shall be changed through a supported fresh Draft or copy rather than rewriting historical content.

## `R21` Use AI-Assisted Drafting and Campaign Proposals

Related use cases: [`UC-21`](use-cases.md#uc-21-generate-editable-content-with-ai), [`UC-37`](use-cases.md#uc-37-generate-a-missing-adaptive-variant), [`UC-38`](use-cases.md#uc-38-review-a-complete-campaign-proposal), and [`UC-39`](use-cases.md#uc-39-review-a-follow-up-campaign-proposal).

- `R21.1` An authorised administrator shall be able to request generated Training Document, Quiz, or Organisation Email Draft data inside its normal reusable-content builder.
  - `R21.1.1` Generated fields shall remain editable and shall not fabricate persisted child identities.
  - `R21.1.2` Generation failure shall preserve existing unsaved builder content.
- `R21.2` Supported missing Training Document and Quiz difficulty variants shall use the existing variant-generation orchestration.
  - `R21.2.1` Source context shall be bounded to preserved title, summary, type, and canonical categories from an appropriate selected alternative.
  - `R21.2.2` Target Draft data and quality findings shall return to the normal editable builder.
- `R21.3` An organisation Campaign manager shall be able to request a transient complete Campaign proposal and review its name, description, rationale, findings, and proposed items.
- `R21.4` A Campaign manager shall be able to request a trainee-specific follow-up proposal for an eligible active assignment candidate.
  - `R21.4.1` The backend shall compute category state and shall not accept raw trainee history from the browser.
- `R21.5` Proposal items may be removed and Draft-shaped content may be opened in its normal builder, but proposal-local keys and inactive Draft payloads shall not become Campaign content IDs.
- `R21.6` Backend-approved organisation context and provider configuration shall remain backend controlled.
- `R21.7` AI shall not save or activate content, publish a Quiz, approve a Simulation, save or activate a Campaign, assign trainees, send real email, or select adaptive difficulty.

## `R22` Discover and Self-Enrol in Platform Campaigns

Related use case: [`UC-22`](use-cases.md#uc-22-browse-and-self-enrol-in-a-platform-campaign).

- `R22.1` An eligible individual trainee shall be able to browse available platform Campaigns and view their supported summary information.
- `R22.2` The trainee shall be able to self-enrol in an eligible Campaign once.
  - `R22.2.1` Duplicate requests shall return or preserve the existing enrolment rather than create another.
  - `R22.2.2` Organisation-only or unavailable Campaigns shall not be self-enrolled.
- `R22.3` Successful enrolment shall make the Campaign available in the trainee's Campaign list.

## `R23` Assign Campaigns to Organisation Trainees

Related use case: [`UC-26`](use-cases.md#uc-26-assign-or-unassign-an-organisation-campaign).

- `R23.1` An administrator with `ASSIGN_CAMPAIGNS` shall be able to assign an eligible active organisation Campaign directly to selected eligible trainees.
- `R23.2` Eligibility shall require the canonical active assignment-candidate user, Trainee Profile, membership, type, and organisation conditions.
- `R23.3` Cross-organisation, duplicate, disabled, inactive, or otherwise ineligible assignment shall be rejected or reported as ineligible.
- `R23.4` An authorised administrator shall be able to permanently unassign one selected organisation assignment through the supported confirmed destructive flow.
  - `R23.4.1` The operation shall remove the assignment and its dependent progress records transactionally.
  - `R23.4.2` The operation shall not be represented as progress reset and shall have no undo/restore path.
  - `R23.4.3` A bounded revocation audit record shall not retain deleted answers or interaction payloads.

## `R25` Classify and Interact with Simulated Email Threats

Related use case: [`UC-01`](use-cases.md#uc-01-use-a-simulated-inbox).

- `R25.1` A trainee shall be able to classify an accessible simulated message as `SAFE`, `SUSPICIOUS`, or `PHISHING` and identify warning signs.
- `R25.2` A valid submission shall record the classification, selected warning signs, and relevant assignment/item/simulation context.
- `R25.3` The result shall provide supported expected classification, explanation, identified/missed signs, and incorrect-selection feedback.
- `R25.4` Controlled simulated-link behaviour shall be recorded without navigating to an unintended external threat or collecting real credentials.
- `R25.5` Category-specific adaptive evidence may use classification and link behaviour.
  - `R25.5.1` Evidence from an adaptive occurrence shall match either the direct component reference or the persisted selected content for the same assignment and item.
  - `R25.5.2` Repeated link events shall not inflate occurrence count.
  - `R25.5.3` Missing evidence shall not be treated as zero performance.

## `R26` View Campaign Statistics and Insights

Related use case: [`UC-31`](use-cases.md#uc-31-review-campaign-statistics).

- `R26.1` An authorised Campaign manager shall be able to view the implemented statistics and insight measures for a selected Campaign.
- `R26.2` Platform and organisation views shall remain scoped to the selected Campaign and the actor's authorised ownership/tenant context.
- `R26.3` Empty and unavailable states shall not fabricate participation or result data.
- `R26.4` Trainees shall continue to see their own Campaign progress and Quiz results through the supported trainee flows.

## `R27` Record Supported Audit and Lifecycle Events

Related use case: [`UC-07`](use-cases.md#uc-07-manage-platform-administration-and-organisation-lifecycle).

- `R27.1` Supported sensitive account, organisation, permission, invitation, assignment, and lifecycle actions shall persist truthful audit information.
  - `R27.1.1` Records shall include the supported actor, target, action, outcome, timestamp, scope, and bounded context.
  - `R27.1.2` Passwords, raw tokens, token hashes, provider credentials, deleted trainee answers, and unnecessary request bodies shall not be stored as audit context.
- `R27.2` Registration and organisation setup timelines shall present their supported persisted lifecycle events in defined order.
- `R27.3` Failed or denied actions shall not be recorded as successful outcomes.
- `R27.4` Audit persistence does not imply a broad administrator audit-review or platform-oversight interface.

---

Previous section: [Users and User Stories](users-and-user-stories.md)

Next section: [Use Cases](use-cases.md)
