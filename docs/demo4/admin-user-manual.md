# Insightful Phish Demo 4 Administrator User Manual

## Introduction

This manual explains implemented organisation-administrator and platform-administrator workflows. It restores retained Demo 3 guidance and adds Demo 4 reusable-content creators, Campaign structure, adaptive items, AI assistance, copy-to-Draft behaviour, and current lifecycle safeguards.

Visible navigation and actions depend on account type, organisation context, explicit permissions, and resource lifecycle state.

## Contents

1. [Permission and Lifecycle Basics](#permission-and-lifecycle-basics)
2. [Organisation Information and Security](#organisation-information-and-security)
3. [Organisation Trainees](#organisation-trainees)
4. [Organisation Administrators](#organisation-administrators)
5. [Content Management](#content-management)
6. [Training Document Creator](#training-document-creator)
7. [Quiz Creator](#quiz-creator)
8. [Organisation Email Library](#organisation-email-library)
9. [Simulated Inbox Creator](#simulated-inbox-creator)
10. [Campaign Management](#campaign-management)
11. [Adaptive Campaign Items](#adaptive-campaign-items)
12. [AI Campaign Proposals](#ai-campaign-proposals)
13. [Assignment and Insights](#assignment-and-insights)
14. [Platform Administration](#platform-administration)
15. [Shared Account and Support Guidance](#shared-account-and-support-guidance)

## Permission and Lifecycle Basics

Organisation administrators do not receive every management capability automatically. Navigation and backend operations use explicit permissions, including:

- `VIEW_CAMPAIGNS` for applicable Campaign visibility;
- `MANAGE_CAMPAIGNS` for Campaign/content authoring and AI proposal actions;
- `ASSIGN_CAMPAIGNS` for direct organisation Campaign assignment/unassignment;
- dedicated trainee, administrator, permission, and security-setting permissions for their respective pages.

Campaign permission does not grant broad trainee-management access. The follow-up proposal selector uses a minimal Campaign-specific candidate endpoint.

### Current Administrator Navigation

Platform Administrators receive these sidebar destinations:

- **Platform Administrators**
- **Organisation Management**
- **Campaigns**
- **Help**

There is no separate Platform Content Management destination in the sidebar.

Organisation Administrators receive these base sidebar destinations:

- **Organisation Information**
- **Trainees**
- **Administrators**
- **Security Preferences**
- **Help**

The following Organisation Administrator destinations depend on the current Organisation context and permissions:

- **Campaigns** and **Content Management** are shown when the administrator has Campaign-viewing or Campaign-management permission.
- **Assign Training Campaigns** is shown when the administrator has Campaign-assignment permission.

Protected pages continue to enforce their required permissions even when a destination is visible or its URL is opened directly. In particular, the Trainees and Administrators pages require their corresponding view permissions.

**Help** opens the currently configured administrator-manual link in a new browser tab. The application-header account menu provides **Account Management** and **Logout**.

Lifecycle names differ by resource:

| Resource           | Editable state | Campaign-eligible state | Revision path                                          |
| ------------------ | -------------- | ----------------------- | ------------------------------------------------------ |
| Training Document  | Draft          | Available               | Archive, Unarchive to Draft, or copy where offered     |
| Quiz               | Draft          | Active                  | Copy an Active Quiz to a new Draft                     |
| Organisation Email | Draft          | Active                  | Copy an Active Email to a new Draft                    |
| Simulated Inbox    | Draft          | Active                  | Copy an Active Simulated Inbox to a new Draft          |
| Campaign           | Draft          | Active                  | Archive/reactivate or copy an Active Campaign to Draft |

AI-generated data never changes lifecycle state automatically.

## Organisation Information and Security

### Review Organisation Information

1. Select **Organisation Information** from the sidebar.
2. Review the organisation identity, lifecycle, and available contextual information.
3. Use supported actions only when the required permission and state permit them.

Organisation scope is fixed by the route and authenticated membership; administrators cannot switch the page to another organisation by changing an identifier.

![Organisation information](user-interface/organisation-admin/01-organisation-information.png)

### Update Organisation Security Preferences

1. Select **Security Preferences**.
2. Review the effective remember-session, regular-session, idle-timeout, reauthentication, and email-change controls shown.
3. Change only values enabled by your permission.
4. Save and review confirmation/errors.

Values outside platform bounds or incompatible settings are rejected without replacing the existing policy.

![Organisation security preferences](user-interface/organisation-admin/07-security-preferences.png)

### Manage Organisation AI Context

Open **Organisation Information** and select **AI Context**. Organisation context supplies approved text or example emails that can help tailor AI-generated Draft content.

1. Select **Add Context**.
2. Choose a category and either **Free Text** or **Example Email**.
3. Enter a name and the approved context text.
4. Select **Save Context**.
5. Enable **Allow this context to be used by AI** only after reviewing it.

Saving activates the context, but AI use remains off until it is enabled separately. Context can later be edited, archived, or reactivated where the displayed actions permit it. Do not add passwords, credentials, personal secrets, or unapproved sensitive information.

![Organisation AI Context](user-interface/organisation-admin/02-ai-context.png)

### Configure SMTP Details

**Who can do it:** An Organisation Administrator with the required email-provider permission.

Open **Organisation Information** and select **SMTP Details**.

1. Select **Add SMTP Profile**.
2. Enter the provider and sender configuration supplied by the organisation.
3. Save the profile.
4. Use the connection-check action to verify the SMTP connection.
5. Enable the profile when it is ready for simulations.
6. Send a test email and confirm it through the organisation's approved test mailbox.

An Active provider can be selected for real-email simulations. A profile used by a Scheduled or Running simulation cannot be disabled or removed. A successful test means the provider accepted the message; it does not prove final delivery or inbox placement. Never place real provider credentials in this manual or a screenshot.

![SMTP provider profiles](user-interface/organisation-admin/03-smtp-details.png)

## Organisation Trainees

### Invite an Organisation Trainee

1. Select **Trainees**.
2. Choose the invitation action.
3. Enter the trainee identity and email details.
4. Review the intended organisation.
5. Submit the invitation.

The invitation remains scoped to the intended recipient and organisation. Conflicting active membership or invitation state can prevent creation.

![Organisation trainee management](user-interface/organisation-admin/04-trainees.png)

### Resend or Revoke a Trainee Invitation

Use the invitation action menu from **Trainees**. Resend is available only when current state and cooldown permit it. Revocation makes the outstanding invitation unusable; it does not silently remove an already accepted active membership.

### Disable or Re-enable an Organisation Trainee

1. Open the trainee's available lifecycle action.
2. Review the target and consequence.
3. Confirm the action.

Disabled users are not valid active assignment candidates. Re-enabling membership does not fabricate removed Campaign assignments.

## Organisation Administrators

### View Administrator Permissions

1. Select **Administrators**.
2. Open an administrator entry.
3. Review role and permission information.

### Promote or Invite an Administrator

1. Choose the supported promote/invite action.
2. Select an eligible same-organisation user or enter invitation details.
3. Configure only permissions you are authorised to grant.
4. Review and submit.

### Edit Permissions or Remove Administrator Privileges

Use the administrator action menu and permission control. Protected-administrator, self-authority, and organisation-boundary rules remain enforced even when a control is visible.

![Organisation administrator management](user-interface/organisation-admin/05-administrators.png)

## Content Management

Select **Content Management** to access organisation reusable-content areas. The page provides entry points for Training Documents, Quizzes, the organisation Email library, and Simulated Inbox authoring where available.

Content becomes Campaign selectable only after its normal explicit lifecycle transition. Draft content is not eligible merely because it was generated, previewed, or saved.

Platform administrators use the corresponding platform-owned Training Document, Quiz, and Campaign pages. Organisation Email content remains organisation owned.

![Content Management](user-interface/content-management/01-simulated-inbox-list.png)

## Training Document Creator

### Create and Save a Draft

1. Open **Content Management** and choose Training Documents.
2. Select the create action.
3. Enter a title, summary, difficulty, categories, and Markdown content.
4. Use preview to inspect headings, paragraphs, lists, links, and emphasis.
5. Select **Save Draft**.

Saving creates editable reusable content. It does not activate the document or add it to a Campaign.

![Training Document Creator](user-interface/content-management/09-training-document-creator.png)

### Generate With AI

1. From the normal creator, choose **Generate with AI**.
2. Provide the supported objective, categories, difficulty, and guidance.
3. Submit once and wait for generation.
4. Review every generated field in the normal editor.
5. Edit as needed, then explicitly save.

Generated Markdown uses normal Markdown structure. Accidental HTML line-break tags are normalised at the backend generation boundary rather than changing the general renderer.

### Activate, Archive, Unarchive, or Copy

Activate a Training Document only after review. Available content is eligible for Campaign selection. Archived documents can be **Unarchived**, which restores them as editable Drafts. Where an active resource is immutable, copy it to a new Draft before revising it.

## Quiz Creator

![Quiz Creator](user-interface/content-management/11-quiz-creator.png)

### Create Quiz Metadata

1. Open Quizzes from **Content Management**.
2. Create a Draft.
3. Enter title, description, pass threshold, difficulty, and required metadata.

### Add and Edit Questions

1. Open the question editor.
2. Choose `SINGLE_CHOICE` or `MULTIPLE_CHOICE`.
3. Enter the complete question prompt.
4. Enter complete answer text for each option.
5. Review positional labels (`A`, `B`, `C`, and so on).
6. Configure correctness, feedback, categories, points, and supported selection bounds.

Single-choice correctness uses radio controls and retains exactly one correct option. Multiple-choice correctness uses checkboxes and can retain multiple correct options under its valid bounds. Switching back to single-choice clears incompatible stale correctness/bounds.

![Quiz question editor](user-interface/content-management/12-quiz-question-editor.png)

### Generate a Quiz With AI

Use **Generate with AI** from the normal Quiz Creator. Generated questions/options populate editable unsaved state. Option labels are normalised from position while `text` retains the complete human-readable answer. Review correctness and feedback before saving.

### Save and Activate

Select **Save Draft** while editing a Quiz. After validation passes, select **Activate Quiz** to make it eligible for Campaign selection. Activation does not assign the Quiz or add it to a Campaign. Copy an Active Quiz to a new Draft when revisions are required.

## Organisation Email Library

![Organisation Email Library](user-interface/content-management/05-email-library.png)

### Create an Organisation Email

1. Open **Content Management** and the Email library.
2. Begin creation.
3. Enter sender label/address, subject, preview, body, classification, categories, difficulty, and warning signs as supported.
4. Save explicitly.

Generated or manually authored HTML is validated against the supported parser-based allowlist. A system-controlled link marker cannot be replaced with a caller-controlled destination.

![Organisation Email editor](user-interface/content-management/07-email-draft-classification.png)

### Generate an Email With AI

Use the Email editor's AI action. Generation populates editable Organisation Email Draft fields and does not send a message. Review body HTML, classification, categories, warning signs, and any quality feedback before saving/activation.

### Activate or Copy

Activate a reviewed email for normal library use. Copy active content to obtain a new editable Draft. An Organisation Email is not itself a Campaign component and cannot be attached directly as a Simulated Inbox alternative.

## Simulated Inbox Creator

1. Open Simulated Inboxes from **Content Management**.
2. Create or edit the Simulated Inbox Draft.
3. Select eligible Active organisation-library emails.
4. Arrange the emails and review their controlled content.
5. Select **Save Draft**.
6. Select **Activate** after review.

An Active Simulated Inbox is eligible for Campaign selection. Active content is read-only; use the supported copy action to create a new Draft when revisions are required.

![Simulated Inbox review](user-interface/content-management/04-simulated-inbox-review.png)

## Campaign Management

### Browse and Open Campaigns

Select **Campaigns** from the organisation or platform navigation. Search/filter using controls actually present on the list, then create a Draft or open an existing Campaign.

![Organisation Campaign list](user-interface/organisation-campaigns/01-campaign-list.png)

### Build or Edit a Campaign Draft

1. Open a Draft in the existing Campaign Builder.
2. Edit Campaign metadata.
3. Select eligible reusable content from the scoped catalogue.
4. Add content to the Campaign.
5. Set required/optional state.
6. Reorder items.
7. Review the ordered structure and save changes.

Organisation Campaigns can reference eligible platform or same-organisation content. Platform Campaigns use platform-owned content.

**Screenshot:** ![Campaign Builder](user-interface/organisation-campaigns/02-campaign-builder-details.png)

The retained screenshot shows the base builder; Demo 4 additionally includes groups, Quiz occurrence settings, adaptive items, and AI proposal controls described below.

### Create and Manage Groups

1. Choose eligible top-level items to start a group.
2. Enter group metadata and completion settings.
3. Move direct `COMPONENT` or `ADAPTIVE` items into or out of the group.
4. Reorder the group and its children.

Groups cannot contain another group. Moving or dissolving a group preserves supported child identity and configuration.

![Campaign group configuration](user-interface/organisation-campaigns/06-campaign-group.png)

### Configure a Quiz Occurrence

For each normal or adaptive Quiz occurrence:

1. Set the attempt limit.
2. Choose `BEST`, `LATEST`, or `AVERAGE` score policy.
3. Set required state.

Quiz settings belong to the Campaign occurrence, not the reusable Quiz. Non-Quiz items do not carry these settings.

### Save and Manage Lifecycle

Saving updates the Draft through the canonical Campaign request. Activate only after eligible references and structure validate. Supported lifecycle controls allow archive and reactivation.

#### Activate a Campaign

Open the Campaign detail, choose activate, review validation, and confirm.

#### Archive or Reactivate a Campaign

Use the lifecycle action available for the current state. Existing history remains associated with the original Campaign.

### Copy an Active Campaign to a Draft

Use the copy action on an Active Campaign. The new Draft receives a fresh Campaign ID and fresh item/group/adaptive-alternative identities while preserving eligible content references, order, grouping, required state, and Quiz settings. Assignments, attempts, evidence, progress, and adaptive resolutions are not copied.

## Adaptive Campaign Items

### Add an Adaptive Item

1. Select **Add adaptive item** in the Campaign Builder.
2. Choose one content type: Training Document, Quiz, or Simulated Inbox.
3. Select exactly one eligible `EASY`, `MEDIUM`, and `HARD` alternative.
4. Confirm that all alternatives share the same non-empty category set.
5. Configure required state and Quiz occurrence settings when applicable.
6. Add the occurrence, then place/reorder it top-level or as a direct group child.

Changing an alternative set replaces occurrence identity on save. Changing only non-identity settings such as required state or Quiz attempts/scoring preserves the existing Campaign Item identity where valid.

![Adaptive Campaign item](user-interface/organisation-campaigns/05-adaptive-item.png)

### Generate a Missing Variant

For a missing Training Document or Quiz difficulty, use the offered AI-help action. The system selects bounded title, summary, type, and category context from a compatible selected alternative and opens the normal builder.

Review quality findings and generated Draft content. Explicitly save and activate/publish it, return to the Campaign, and manually select it. Returning never silently attaches inactive content. Whole-Simulated-Inbox AI generation is not offered.

## AI Campaign Proposals

### Complete Proposal

1. Open the AI Campaign proposal panel in organisation Campaign management.
2. Select **Complete**.
3. Enter supported proposal intent and submit.
4. Wait while duplicate submission is disabled.
5. Review proposed Campaign name, description, rationale, findings, and items.
6. Edit proposal-level fields and remove unwanted items.
7. Open generated content in its normal builder where supported.

Proposal keys are transient and are not Campaign Item or reusable-content IDs.

![AI Campaign proposal](user-interface/organisation-campaigns/03-ai-campaign-proposal.png)

### Follow-Up Proposal

1. Select **Follow-up**.
2. Choose an eligible active assignment-candidate trainee from the minimal selector.
3. Request the proposal.
4. Review/edit the transient suggestion.

The backend validates current trainee eligibility and computes category state. The browser does not send raw trainee history to AI.

### Materialisation and Lifecycle Safety

AI proposals do not create, save, activate, or assign Campaigns. Generated reusable content follows:

1. normal builder;
2. administrator review/edit;
3. explicit **Save Draft**;
4. explicit activate/publish/approve;
5. manual selection of a real eligible persisted ID;
6. ordinary Campaign save and activation.

An Organisation Email proposal must proceed through normal Simulated Inbox/Simulation authoring before a Campaign-eligible Simulation ID exists.

## Real-Email Phishing Simulations

An authorised Organisation Administrator can configure a real-email simulation from an Organisation Campaign.

Before starting, ensure that:

- the Campaign is a suitable Draft or Active Organisation Campaign;
- eligible organisation trainees have verified email addresses;
- at least one SMTP profile is Active;
- enough eligible organisation-library emails are available for the configured volume.

### Configure and Launch a Simulation

1. Open the Organisation Campaign and select its phishing-simulation action.
2. Configure the simulation identity, schedule, sending weekdays, and number of emails per recipient.
3. Select one or more Active SMTP providers.
4. Build the email pool from eligible organisation-library emails.
5. Select **Save changes**.
6. Activate the Campaign if it is still a Draft.
7. Select **Launch simulation** and confirm.

![Simulation details and schedule](user-interface/real-email-simulations/01-simulation-setup-details.png)

Launching schedules the simulation and freezes its configuration. Its lifecycle can progress through Draft, Scheduled, Running, Completed, or Stopped.

![Real-email simulation setup](user-interface/real-email-simulations/02-simulation-setup-providers-pool.png)

### Monitor or Stop a Simulation

Open the simulation to review its lifecycle, configuration, planned messages, provider-accepted messages, failures, cancellations, and recorded link requests. Provider acceptance does not confirm final delivery or inbox placement.

A Scheduled or Running simulation can be stopped by an administrator with Campaign-management permission. Stopping cancels unsent messages; messages already accepted by a provider cannot be recalled.

![Real-email simulation monitoring](user-interface/real-email-simulations/03-simulation-monitoring.png)

## Assignment and Insights

### Assign Campaigns to Organisation Trainees

1. Select **Assign Training Campaigns**.
2. Select eligible active organisation trainees.
3. Select eligible active organisation Campaigns.
4. Review the proposed assignments.
5. Confirm.

Invalid, duplicate, cross-organisation, disabled, or stale candidates are rejected safely.

![Review Campaign assignment](user-interface/organisation-campaigns/13-assignment-review.png)

### Review Campaign Insights

Open an Organisation Campaign and select its statistics or insights action. Depending on the Campaign and available evidence, the page can show:

- assigned-trainee progress and completed item counts;
- submitted Quiz averages;
- simulated-email classification results;
- adaptive-content results;
- real-email simulation outcomes;
- phishing-portal evidence.

Real-email **Provider accepted** counts do not prove final delivery or inbox placement. Portal visits, field interactions, submission attempts, and educational reveal views are separate evidence stages. Entered credential values are not displayed.

Empty sections represent an absence of recorded data; the application does not manufacture result values.

**Screenshot:** ![Campaign insights](user-interface/organisation-campaigns/09-campaign-insights-summary.png)

### Unassign a Trainee

1. Open the selected existing assignment.
2. Choose the destructive unassignment action.
3. Review the Campaign and trainee.
4. Confirm permanent removal.

Unassignment removes that assignment and dependent trainee progress transactionally. It is not a progress reset and has no undo/restore path. The bounded audit record does not retain deleted answers or interaction payloads.

## Platform Administration

### Review Organisation Registration Requests

Select **Organisation Management**, review the pending request list, and open a request for full details.

![Organisation management](user-interface/platform-admin/02-organisation-management.png)

### Approve, Reject, Mark Contacted, or Delete an Eligible Request

Use only actions available for the request's current lifecycle. Approval creates supported organisation/setup state transactionally; rejection grants no access. Contact status supports onboarding work. Deletion is limited to eligible request state.

### Review Organisation Details and Onboarding

Open request/organisation detail to review lifecycle and current onboarding state. Resend initial setup only when state and cooldown permit it.

### Organisation Lifecycle Availability

The organisation-detail page currently displays disabled **Suspend Organisation** and **Delete Organisation** controls. These lifecycle actions are not available through the current interface.

Do not treat a disabled control as confirmation that an organisation has been suspended or deleted.

![Platform Organisation detail and unavailable lifecycle controls](user-interface/platform-admin/03-organisation-detail.png)

### Understand Platform Administrator Capabilities

Normal platform administrators and the protected super-administrator see different administrator-management actions.

![Platform Administrators](user-interface/platform-admin/01-platform-administrators.png)

### Invite, Upgrade, Resend, Transfer, or Demote

Use **Platform Administrators** and the action available for the target's current state. Role transfer requires an eligible active target and preserves one accountable super-administrator. Invalid self/last-authority operations are rejected.

### Manage Platform Campaigns

Platform Campaign management uses the same canonical Campaign Builder and lifecycle concepts but only platform-owned eligible content. Active Campaigns can be copied to fresh Drafts for revision.

![Platform Campaign list](user-interface/platform-campaigns/01-platform-campaign-list.png)

## Shared Account and Support Guidance

- Use account-management guidance in the [Trainee User Manual](user-manual.md) for profile, email, password, and session actions.
- Check role, permission, organisation, and lifecycle state when an action is absent or disabled.
- Do not retry lifecycle or invitation actions rapidly; observe cooldown and stale-state messages.
- When reporting a problem, provide the page, resource name, action, and displayed error, but never provide passwords, tokens, invitation/setup links, database URLs, provider keys, or raw trainee history.
- Review [Privacy and Data Boundaries](sas/privacy-and-data-boundaries.md) and [Known Limitations](sas/known-limitations.md) for current implementation boundaries.

Back to the [Demo 4 Documentation Home](README.md).
