# Functional Requirements

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- **[2. Functional Requirements](#2-functional-requirements)** &larr; _You are here_
- [3. Quality Requirements](quality-requirements.md)
- [4. Changelog](changelog.md)

---

## 2. Functional Requirements

These requirements describe the implemented Demo 4 product. Numbering is retained from the prior SRS where the capability remains; removed identifiers are recorded in the [changelog](changelog.md).

### `R1` Authentication and Account Access

- `R1.1` Individual trainees shall be able to register, verify their email address, log in, log out, and recover a forgotten password.
- `R1.2` Tokenised verification, recovery, setup, invitation, and email-change actions shall validate purpose, scope, expiry, revocation, and prior use before changing state.
- `R1.3` Authentication shall enforce account, organisation, email-verification, and session-security state and shall use enumeration-safe responses where account existence must remain private.

### `R2` Trainee Campaign Access

- `R2.1` A trainee shall see only Campaigns made available through a valid personal enrolment or organisation assignment.
- `R2.2` Campaign items shall be presented in configured order with required, availability, progress, and prerequisite state.
- `R2.3` Adaptive items shall resolve to one eligible alternative for the assignment and item, and the persisted resolution shall be reused.

### `R3` View Emails in a Simulated Inbox

- `R3.1` A trainee shall be able to open an assigned Simulated Inbox and inspect its simulated email summaries and details.
- `R3.2` Access shall remain scoped to the authenticated trainee's Campaign assignment and shall not connect to the trainee's real mailbox.
- `R3.3` Simulated links and attachments shall use controlled training representations.

### `R4` View a Training Document

- `R4.1` A trainee shall be able to open an available Training Document Campaign item and read its structured Markdown content.
- `R4.2` The system shall record supported viewed and completed progress without duplicate completion records.

### `R5` Complete a Quiz and View Results

- `R5.1` A trainee shall be able to answer single-choice and multiple-choice questions and submit an available Quiz attempt.
- `R5.2` The system shall score the submitted option set, record category performance, and display the supported result and feedback after submission.
- `R5.3` Campaign Quiz settings shall enforce the configured attempt limit and BEST or LATEST score policy without exposing correct answers before submission.

### `R6` Request Organisation Registration

- `R6.1` An applicant shall be able to submit a validated organisation registration request and receive the supported status communications.

### `R7` Review and Manage Organisation Registrations

- `R7.1` An authorised platform administrator shall be able to review pending organisation requests and approve or reject them.
- `R7.2` Approval shall create the supported organisation setup flow; rejection shall not grant organisation access.

### `R8` Complete Initial Organisation Administrator Setup

- `R8.1` An invited initial administrator shall be able to validate the setup link, establish account credentials, and complete organisation access once.

### `R9` Accept an Organisation Invitation or Role Change

- `R9.1` Eligible users shall be able to accept valid organisation invitations and supported role-change invitations.
- `R9.2` Expired, revoked, superseded, mismatched, or used invitations shall not change membership or permissions.

### `R10` Manage Organisation Trainees

- `R10.1` An authorised organisation administrator shall be able to list, invite, and manage trainees within the administrator's organisation.
- `R10.2` Organisation and membership boundaries shall prevent cross-organisation trainee management.

### `R11` Manage Organisation Administrators and Permissions

- `R11.1` An authorised organisation administrator shall be able to invite administrators and manage supported roles and permissions within the organisation.
- `R11.2` Permission changes shall preserve protected-administrator and organisation-scope constraints.

### `R12` Manage Platform Administrators

- `R12.1` An authorised platform administrator shall be able to list, invite, and manage platform administrators according to platform role constraints.

### `R13` Configure Organisation Security Settings

- `R13.1` An authorised organisation administrator shall be able to configure supported organisation security and session settings.
- `R13.2` Updated settings shall apply within the organisation without changing another organisation's policy.

### `R14` Manage Personal Account and Security Settings

- `R14.1` An authenticated user shall be able to update supported profile and email settings, change the password, and review or revoke sessions.
- `R14.2` Sensitive changes shall require the applicable confirmation, token, or current-password checks.

### `R15` Manage Organisation Lifecycle and Access

- `R15.1` An authorised platform administrator shall be able to review organisation details and perform supported lifecycle actions.
- `R15.2` Organisation lifecycle state shall govern access for linked users and organisation-scoped operations.

### `R18` Manage Platform Campaigns

- `R18.1` A platform administrator shall be able to create, edit, activate, archive, reactivate, and inspect platform-owned Campaigns.
- `R18.2` An Active Campaign may be copied to a new Draft with fresh Campaign and item identities while preserving eligible content, structure, settings, and order.

### `R19` Manage Organisation Campaigns

- `R19.1` An authorised organisation administrator shall be able to create and edit organisation Campaign Drafts using eligible platform or same-organisation reusable content.
- `R19.2` The Campaign Builder shall support ordered COMPONENT items and GROUP items whose direct children are COMPONENT or ADAPTIVE items; nested groups are not supported.
- `R19.3` An ADAPTIVE item shall have one fixed content type and exactly one eligible EASY, MEDIUM, and HARD alternative sharing the required category set.
- `R19.4` Required state, group placement, ordering, Quiz attempt settings, and adaptive alternatives shall survive valid edits and Active-to-Draft copy.
- `R19.5` The system shall validate referenced content eligibility when saving or copying a Campaign.

### `R20` Manage Reusable Campaign Content

- `R20.1` Authorised administrators shall manage Training Documents through Draft, Available, archived, restored, and copy workflows supported by their scope.
- `R20.2` Authorised administrators shall manage Quizzes through Draft, Published, and copy workflows, including questions, options, categories, feedback, and difficulty.
- `R20.3` Authorised organisation administrators shall manage Organisation Emails through Draft, Active, and copy workflows and compose Simulated Inboxes through their supported Draft, Approved, Active, and copy lifecycle.
- `R20.4` Active or Published reusable content shall remain immutable where the lifecycle requires editing through a new Draft or copy.

### `R21` Use AI-Assisted Drafting and Campaign Proposals

- `R21.1` An authorised administrator shall be able to request AI-generated Training Document, Quiz, and Organisation Email Draft data inside the normal reusable-content builders.
- `R21.2` Supported missing adaptive variants shall use a bounded selected source concept to generate an editable target-difficulty Draft and expose quality findings.
- `R21.3` An authorised organisation Campaign manager shall be able to request transient complete and trainee-specific follow-up Campaign proposals for review and editing.
- `R21.4` Organisation context and adaptive evidence supplied to AI shall be controlled by the backend; the browser shall not supply raw trainee history or provider configuration.
- `R21.5` AI generation shall not save or activate content, publish Quizzes, approve Simulations, save or activate Campaigns, assign trainees, or send real email.

### `R22` Discover and Self-Enrol in Platform Campaigns

- `R22.1` An eligible individual trainee shall be able to browse available platform Campaigns and self-enrol once.
- `R22.2` Self-enrolment shall not create a duplicate enrolment for the same trainee and Campaign.

### `R23` Assign Campaigns to Organisation Trainees

- `R23.1` An authorised organisation administrator shall be able to select eligible active trainees and assign an eligible organisation Campaign directly to them.
- `R23.2` The system shall prevent invalid, duplicate, cross-organisation, or otherwise ineligible assignment.
- `R23.3` An authorised administrator shall be able to unassign a selected assignment through the supported destructive flow.

### `R25` Classify and Interact with Simulated Email Threats

- `R25.1` A trainee shall be able to classify a simulated email and interact with its controlled links in the Simulated Inbox experience.
- `R25.2` Classification and link behaviour shall be recorded against the correct trainee, assignment, Campaign item, simulation, and category context.
- `R25.3` Supported adaptive category state may use classification and link evidence without treating missing evidence as failure.

### `R26` View Campaign Statistics and Insights

- `R26.1` An authorised Campaign manager shall be able to view the implemented Campaign statistics for a Campaign in the applicable platform or organisation scope.
- `R26.2` Statistics shall remain scoped to the selected Campaign and authorised tenant; broad report export is not required.

### `R27` Record Supported Audit and Lifecycle Events

- `R27.1` Supported sensitive account, organisation, permission, invitation, Campaign-assignment, and lifecycle actions shall persist truthful, scoped, redacted audit information.
- `R27.2` Supported registration and organisation setup timelines shall present persisted lifecycle events in their defined order.
- `R27.3` Demo 4 does not require a broad audit or platform-oversight user interface.

---

Previous section: [Introduction and Scope](introduction.md)

Next section: [Quality Requirements](quality-requirements.md)
