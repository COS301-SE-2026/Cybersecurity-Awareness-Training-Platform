# Insightful Phish Demo 3 User Manual

## Introduction

This manual explains how people use the Demo 3 Insightful Phish platform. It is organised by role and task so that each user can find the part of the product that applies to them without reading the whole document.

Demo 3 documentation should describe the integrated product only. Screenshots referenced in this manual are kept under [`user-interface/`](user-interface/README.md) and will be verified or replaced during the later screenshot-focused commits for this issue.

## Contents

- [Introduction](#introduction)
- [Access and Account Basics](#access-and-account-basics)
  - [Sign In](#sign-in)
  - [Create a General Trainee Account](#create-a-general-trainee-account)
  - [Verify Your Email Address](#verify-your-email-address)
  - [Reset a Forgotten Password](#reset-a-forgotten-password)
  - [Complete Account Setup From an Invitation](#complete-account-setup-from-an-invitation)
  - [Accept an Organisation Invitation](#accept-an-organisation-invitation)
- [Account Management and Security](#account-management-and-security)
  - [Open Account Management](#open-account-management)
  - [Update Personal Information](#update-personal-information)
  - [Request an Email Change](#request-an-email-change)
  - [Change Your Password](#change-your-password)
  - [Review Active Sessions](#review-active-sessions)
  - [Update Session Settings](#update-session-settings)
- [General Trainee Tasks](#general-trainee-tasks)
- [Organisation Trainee Tasks](#organisation-trainee-tasks)
- [Organisation Admin Tasks](#organisation-admin-tasks)
- [Insightful Phish Admin Tasks](#insightful-phish-admin-tasks)
  - [Review Organisation Requests](#review-organisation-requests)
  - [Review Request or Organisation Details](#review-request-or-organisation-details)
  - [Manage Platform Administrators](#manage-platform-administrators)
- [Troubleshooting](#troubleshooting)
- [Security and Privacy](#security-and-privacy)
- [Glossary](#glossary)
- [Support](#support)

## How to Read a Task

Each task should give the user enough information to complete the workflow from a role-appropriate entry point:

- **Audience:** who the task is for.
- **Preconditions:** account state, role, permissions, or data needed before starting.
- **Navigation:** where to go in the application.
- **Steps:** what to do.
- **Expected result:** what should happen after the task succeeds.
- **Screenshot:** an image reference where it helps.
- **Note or warning:** any important security, permission, expiry, or destructive-action detail.

## Access and Account Basics

Use a modern desktop browser such as Chrome, Edge, Brave, Firefox, or Safari. The Demo 3 interface supports public visitors, General Trainees, Organisation Trainees, Organisation Admins, and Insightful Phish Admins.

### Sign In

**Audience:** all registered users.

**Preconditions:** you have an active account and know your email address and password.

**Navigation:** open the login page.

1. Enter your email address and password.
2. Select **Login**.
3. Wait for the platform to open the area available to your role.

**Expected result:** the platform signs you in and shows the appropriate signed-in navigation.

**Screenshot:** ![Login page](user-interface/public-account/01-login-page.png)

### Create a General Trainee Account

**Audience:** public visitors who are allowed to register as General Trainees.

**Preconditions:** you have an email address that is not already registered.

**Navigation:** open the registration page.

1. Enter your first name, last name, email address, password, and password confirmation.
2. Select **Register**.
3. Check your email for the verification link before using the account fully.

**Expected result:** the platform creates a pending account and asks you to verify your email address.

**Screenshot:** ![Registration form](user-interface/public-account/02-registration-form.png)

### Verify Your Email Address

**Audience:** users who have received an email verification link.

**Preconditions:** your verification link is valid and has not already been used.

**Navigation:** open the verification link from your email.

1. Open the email verification link.
2. Wait for the verification result.
3. If the link has expired and the page offers a resend action, request a new verification link.

**Expected result:** the platform verifies your email address or shows a safe message explaining why the link cannot be used.

**Screenshot:** ![Email verification result](user-interface/public-account/03-email-verification.png)

### Reset a Forgotten Password

**Audience:** users who cannot sign in because they forgot their password.

**Preconditions:** your account exists and is eligible for password reset.

**Navigation:** open **Forgot Password** from the login area.

1. Enter the email address for your account.
2. Submit the password reset request.
3. Open the reset link from your email.
4. Enter and confirm the new password.
5. Submit the change.

**Expected result:** the platform updates your password when the reset link and new password are valid.

**Warning:** reset links are sensitive. Do not share them, and do not use screenshots that reveal reset tokens.

**Screenshots:**

![Forgot password form](user-interface/public-account/04-forgot-password.png)
![Reset password form](user-interface/public-account/05-reset-password.png)

### Complete Account Setup From an Invitation

**Audience:** invited Organisation Admins or Organisation Trainees.

**Preconditions:** you have a valid invitation or setup link.

**Navigation:** open the setup link from your invitation email.

1. Review the role and Organisation shown on the setup page.
2. Enter your first name, last name, password, and password confirmation.
3. Select **Complete Setup**.
4. Sign in after the success message appears.

**Expected result:** the platform completes your invited account setup and lets you sign in with the new credentials.

**Warning:** setup links can expire, be revoked, or be used only once.

**Screenshot:** ![Complete setup page](user-interface/public-account/06-complete-setup.png)

### Accept an Organisation Invitation

**Audience:** signed-in users who have been invited to join an Organisation.

**Preconditions:** you are signed in with the account that should receive the Organisation role, and the invitation link is valid.

**Navigation:** open the invitation link from your email.

1. Review the Organisation and role shown on the invitation page.
2. Confirm that you want to accept the invitation.
3. Follow any instruction to sign in again if the page says your role or session has changed.

**Expected result:** the platform links your account to the Organisation role allowed by the invitation, or shows a safe reason why the invitation cannot be accepted.

**Warning:** invitation links are single-use and role-sensitive. Do not forward them to another person.

**Troubleshooting:** if the invitation is expired, revoked, already used, or blocked because the Organisation is suspended, ask the Organisation Admin who invited you to send a new invitation or confirm that the Organisation is active.

## Account Management and Security

Account Management contains personal details, account actions, security preferences, and session controls where they are available for the signed-in user.

### Open Account Management

**Audience:** signed-in users.

**Preconditions:** you are signed in.

**Navigation:** open the account menu in the top navigation and select **Account Management**.

1. Open the account menu.
2. Select **Account Management**.
3. Use the tabs for profile details, account settings, security preferences, and sessions.

**Expected result:** the platform shows account controls that match your role and Organisation policy.

**Screenshot:** ![Account management tabs](user-interface/public-account/07-account-management-tabs.png)

### Update Personal Information

**Audience:** signed-in users.

**Preconditions:** you are signed in and the account page has loaded successfully.

**Navigation:** **Account Management** > **Personal**.

1. Review the current first name and last name.
2. Update the fields that need to change.
3. Select the update action on the page.
4. Check the success or validation message.

**Expected result:** the platform saves the updated profile details and keeps the account email unchanged.

**Troubleshooting:** if the page cannot load, use **Retry Loading Account**. If validation fails, correct the highlighted fields and submit again.

### Request an Email Change

**Audience:** signed-in users whose policy allows email changes.

**Preconditions:** you know your current password and have access to the new email address.

**Navigation:** **Account Management** > **Account**.

1. Select **Change Email**.
2. Enter the new email address.
3. Confirm the new email address.
4. Enter your password.
5. Submit the request.
6. Follow the verification email sent to the new address.

**Expected result:** the platform records a pending email-change request and changes the account email only after verification succeeds.

**Warning:** email changes are security-sensitive and may revoke active sessions according to policy.

**Troubleshooting:** if **Change Email** is disabled, email changes are managed by Organisation policy. If the new address is already in use, use another address or contact the responsible administrator.

**Screenshot:** ![Change email modal](user-interface/public-account/08-change-email-modal.png)

### Change Your Password

**Audience:** signed-in users whose policy allows password changes.

**Preconditions:** you know your current password.

**Navigation:** **Account Management** > **Account**.

1. Select **Change Password**.
2. Enter your current password.
3. Enter and confirm the new password.
4. Submit the change.

**Expected result:** the platform updates your password and applies the configured session-revocation behaviour.

**Warning:** do not enter passwords into screenshots or share password-change confirmation messages that contain private account details.

**Troubleshooting:** if the current password is rejected, use **Forgot Password** from the login area. If the new password is rejected, follow the password rules shown in the form.

**Screenshot:** ![Change password modal](user-interface/public-account/09-change-password-modal.png)

### Review Active Sessions

**Audience:** signed-in users.

**Preconditions:** you are signed in.

**Navigation:** **Account Management** > **Sessions**.

1. Review the listed sessions and recent activity.
2. Use the available logout actions for sessions you no longer want active.
3. Confirm any security-sensitive action when prompted.

**Expected result:** the selected session is revoked, or the platform shows why the action is unavailable.

**Warning:** logging out other sessions can interrupt active work on another device.

**Troubleshooting:** if a session was already revoked or the list is stale, refresh the sessions tab and try again only if the session still appears.

**Screenshot:** ![Session settings](user-interface/public-account/10-session-settings.png)

### Update Session Settings

**Audience:** signed-in users whose Organisation policy allows session preference changes.

**Preconditions:** you are signed in and the **Sessions** tab is available.

**Navigation:** **Account Management** > **Sessions**.

1. Review **Session Preferences**.
2. Adjust the editable regular session, remember-me, or idle-timeout preferences shown by the page.
3. Select **Update Session Settings**.
4. Check the confirmation or validation message.

**Expected result:** editable session preferences are saved. Policy-controlled settings remain read-only or disabled.

**Warning:** shorter session settings may require you to sign in more often. Longer settings should only be used where Organisation policy allows them.

**Troubleshooting:** if a control says **Disabled by Policy** or cannot be changed, the Organisation policy is controlling that setting.

## General Trainee Tasks

General Trainees use the platform for their own training activity. Detailed General Trainee campaign discovery and self-enrolment instructions will be verified against the final integrated Demo 3 UI in the campaign workflow commit.

Current task areas for this role:

- sign in and manage account access;
- review available or assigned Campaigns where the UI exposes them;
- complete training, quiz, or simulation activities where assigned;
- use Account Management and Sessions where policy allows.

## Organisation Trainee Tasks

Organisation Trainees are linked to an Organisation and use the platform for Organisation-assigned awareness training.

Current task areas for this role:

- complete invited account setup;
- sign in to the Organisation-linked account;
- view assigned Campaigns;
- complete training documents, quizzes, and simulated inbox activities where available;
- use Account Management and Sessions where Organisation policy allows.

Campaign participation instructions and screenshots will be verified in the later campaign workflow commit.

## Organisation Admin Tasks

Organisation Admins manage their Organisation's information, security preferences, trainees, administrators, invitations, and Campaign workflows where their permissions allow.

### Request Organisation Access

**Audience:** public Organisation representative.

**Preconditions:** your Organisation is not already registered through the platform.

**Navigation:** open the Organisation registration request page.

1. Complete **Organisation Information**.
2. Select **Next**.
3. Complete **Representative Information**.
4. Submit the request.
5. Wait for review by an Insightful Phish Admin.

**Expected result:** the platform records the request and shows a safe confirmation message.

**Note:** the representative listed in the request is the person expected to complete the first Organisation Admin setup if the request is approved.

**Troubleshooting:** if the request cannot be submitted, correct the field errors shown on the page. If the Organisation is already registered, use the existing Organisation access path instead of submitting a duplicate request.

**Screenshots:**

![Organisation registration step one](user-interface/organisation-onboarding/01-organisation-registration-step-one.png)
![Organisation registration step two](user-interface/organisation-onboarding/02-organisation-registration-step-two.png)
![Organisation registration success](user-interface/organisation-onboarding/03-organisation-registration-success.png)

### Complete Initial Organisation Admin Setup

**Audience:** approved initial Organisation Admin.

**Preconditions:** an Insightful Phish Admin has approved the Organisation request and you have a valid setup link.

**Navigation:** open the setup link from the approval email.

1. Review the Organisation and role shown on the setup page.
2. Enter your name and password details.
3. Select **Complete Setup**.
4. Sign in after the success message appears.

**Expected result:** the platform completes the first Organisation Admin setup and activates the Organisation if the setup is still valid.

**Warning:** the setup link is single-use and should not be shared.

**Troubleshooting:** if the setup link is expired, revoked, or already used, an Insightful Phish Admin may need to resend the setup email from the Organisation detail page.

**Screenshot:** ![Initial administrator setup](user-interface/organisation-onboarding/04-initial-admin-setup.png)

### Review Organisation Information

**Audience:** Organisation Admin.

**Preconditions:** you are signed in as an Organisation Admin.

**Navigation:** **Organisation Information**.

1. Open **Organisation Information**.
2. Use the tabs to review basic information, representative information, administrators, and timeline details.

**Expected result:** the platform shows Organisation information available to your role.

**Note:** Organisation status and timeline entries are review information. They should not be edited from this page unless the UI provides an explicit action.

**Screenshots:**

![Organisation information](user-interface/organisation-admin/01-organisation-information.png)
![Organisation timeline](user-interface/organisation-admin/02-organisation-timeline.png)

### Update Organisation Security Preferences

**Audience:** Organisation Admin with the required permissions.

**Preconditions:** you are signed in as an Organisation Admin and the setting is editable for your role.

**Navigation:** **Security Preferences**.

1. Open **Security Preferences**.
2. Review any read-only message at the top of the page.
3. Change only the settings that are editable for your role.
4. Select **Update Organisation Security Preferences**.
5. Check for the success or validation message.

**Expected result:** editable settings are saved, and read-only settings remain unchanged.

**Warning:** Organisation security settings can affect user sessions and account-change permissions across the Organisation.

**Troubleshooting:** if the page says settings cannot be modified because the Organisation is suspended, inactive, or disabled, resolve the Organisation status before trying to save changes.

**Screenshot:** ![Organisation security preferences](user-interface/organisation-admin/03-security-preferences.png)

### Review Organisation Trainees

**Audience:** Organisation Admin with trainee-management permissions.

**Preconditions:** you are signed in as an Organisation Admin.

**Navigation:** **Trainees**.

1. Open **Trainees**.
2. Use search or filters to find a trainee or invitation.
3. Open the invite trainee modal when a new trainee invitation needs to be prepared.
4. Follow any confirmation prompts shown for row actions.

**Expected result:** the platform shows current trainee memberships and actionable invitations according to their lifecycle state.

**Available actions:**

- Use **Invite Trainee** when the Organisation is allowed to send a new trainee invitation.
- Use **Log Out Session** or session-related account controls from Account Management, not from the trainee table.
- Use **Disable Trainee** only when the UI shows that the action is available and you can confirm it with your password.
- Use **Revoke Invitation** for an invitation that should no longer be usable.
- Use resend actions only for invitations that still support setup or acceptance.

**Warning:** disabling a trainee can revoke active sessions. Revoking an invitation prevents that invitation link from being used.

**Troubleshooting:** if invitation actions are unavailable, check your permissions, the Organisation status, and the invitation state. Accepted or completed invitations may remain as history but should not be treated as new actionable invites.

**Screenshots:**

![Organisation trainee management](user-interface/organisation-admin/04-trainee-management.png)
![Invite trainee modal](user-interface/organisation-admin/05-invite-trainee-modal.png)

### Review Organisation Administrators

**Audience:** Organisation Admin with administrator-management permissions.

**Preconditions:** you are signed in as an Organisation Admin.

**Navigation:** **Administrators**.

1. Open **Administrators**.
2. Search or filter the administrator list.
3. Select **View Permissions** to inspect a user's visible permissions.
4. Open the invite or edit permissions modal when needed.

**Expected result:** the platform shows Organisation administrators and available invitation or permission actions.

**Available actions:**

- Use **Invite Organisation Administrator** to invite a new administrator when you have the required permission.
- Use **View Permissions** to inspect visible permissions for an administrator.
- Use **Edit Permissions** to change an administrator's permission set when the action is available.
- Use removal or disable actions only when the UI offers them and the action is appropriate for the Organisation.

**Warning:** administrator permissions can grant access to sensitive Organisation settings, invitations, and Campaign workflows. Review selected permissions before saving.

**Troubleshooting:** if the invite or edit action is hidden, your account does not have the required permission or the current Organisation state does not allow that action.

**Screenshots:**

![Organisation administrator management](user-interface/organisation-admin/06-administrator-management.png)
![Administrator permissions](user-interface/organisation-admin/07-admin-permissions-popover.png)

Campaign management, Campaign Builder, assignment, and statistics workflows for Organisation Admins will be verified and documented in the campaign workflow commit.

## Insightful Phish Admin Tasks

Insightful Phish Admins, also referred to as Platform Administrators in some interface areas, review Organisation registration requests and manage platform-level Organisation records.

### Review Organisation Requests

**Audience:** Insightful Phish Admin.

**Preconditions:** you are signed in with Insightful Phish Admin access.

**Navigation:** **Organisation Management**.

1. Open **Organisation Management**.
2. Use the search field and filters to find a request.
3. Select **Review Request** when the request is pending.
4. Review the request details before taking an approval or rejection action.

**Expected result:** the platform lets you approve, reject, or leave the request unchanged according to its current state.

**Warning:** approval can trigger the initial Organisation Admin setup process. Rejection should be used only after checking the request details.

**Available actions:**

- Use **Review Request** to inspect a pending request before deciding.
- Use **Mark As Contacted** when the representative has been contacted outside the platform.
- Use **Approve Request** only after checking the Organisation and representative information.
- Use **Reject Request** with a clear reason when the request should not continue.
- Use **Delete Request** only when the page offers it and the request should be removed from the active review queue.

**Troubleshooting:** if a request cannot be loaded or updated, close the modal, refresh the list, and check whether another admin has already changed the request.

**Screenshots:**

![Organisation management](user-interface/platform-admin/01-organisation-management.png)
![Review request modal](user-interface/platform-admin/02-review-request-modal.png)

### Review Request or Organisation Details

**Audience:** Insightful Phish Admin.

**Preconditions:** you are signed in with Insightful Phish Admin access and have opened a reachable request or Organisation detail page from the UI.

**Navigation:** **Organisation Management** > request or Organisation details.

1. Open the request or Organisation detail page from **Organisation Management**.
2. Review basic information and representative information.
3. Open the timeline tab to confirm the onboarding history.
4. Use the resend setup action only when the page shows that resend is available.

**Expected result:** the platform shows the detail record, lifecycle state, timeline, and safe actions for the selected request or Organisation.

**Warning:** setup email resend actions are security-sensitive. Do not expose private email addresses or setup links in screenshots.

**Troubleshooting:** if the setup email could not be queued during approval, open the Organisation detail page and use the resend action only when the page shows that it is available.

**Screenshots:**

![Request detail](user-interface/platform-admin/03-request-detail.png)
![Organisation detail](user-interface/platform-admin/04-organisation-detail.png)
![Onboarding timeline](user-interface/platform-admin/05-onboarding-timeline.png)
![Resend initial administrator setup](user-interface/platform-admin/06-resend-initial-admin-setup.png)

### Manage Platform Administrators

**Audience:** Insightful Phish Admins with access to Platform Administrator management.

**Preconditions:** you are signed in as an Insightful Phish Admin. Some actions, such as inviting a Platform Administrator or transferring the Super Platform Administrator role, may require elevated platform privileges.

**Navigation:** **Platform Administrators**.

1. Open **Platform Administrators**.
2. Use the search field or status filters such as **Active**, **Invited**, **Disabled**, or **Failed Invitation** to find an administrator.
3. Use **Invite Platform Administrator** when the button is available and a new administrator needs access.
4. For invited administrators, use resend or revoke actions only when the row shows that the invitation is still actionable.
5. Use **Demote Administrator Role**, **Disable Administrator**, **Re-Enable**, or **Transfer Super Administrator Role** only when the UI shows that the action is allowed.
6. Review the confirmation dialog before completing any role or status change.

**Expected result:** the platform updates the administrator list or invitation state and shows the changed status.

**Warning:** Platform Administrator actions can change who controls Organisation approvals and platform-level records. Transfer and demotion actions should be reviewed carefully before confirmation.

**Troubleshooting:** if an action is hidden or unavailable, your current platform role may not allow it, the administrator may be in the wrong lifecycle state, or the list may need to be refreshed.

## Troubleshooting

### Login Does Not Work

- Check that the email and password are entered correctly.
- If the password is forgotten, use the password reset flow.
- If the account has not been verified yet, complete email verification first.
- If you recently changed your password or email address, sign out in any open tabs and sign in again with the latest details.

### Verification Link Has Expired

- Use the resend option if it is shown.
- If resend is not available, request a new link from the relevant registration, setup, or invitation flow.
- If the link has already been used, sign in and check whether the expected account change has already completed.

### Setup Link Is Invalid or Already Used

- Setup links can expire, be revoked, or be used only once. Ask the admin who sent the invitation to send a new setup link.
- If you are already signed in with a different account, sign out before opening the setup link again.

### A Setting Is Read-Only

- Some account or security settings may be controlled by Organisation policy.
- If a setting is read-only, follow the message shown on the page or contact an Organisation Admin.

### An Action Button Is Missing or Disabled

- Check that you are signed in with the role that owns the task.
- Check whether the record is in a state that still allows the action. Completed, expired, revoked, rejected, disabled, or suspended records may limit available actions.
- Refresh the page if another administrator may have changed the record while you were viewing it.

### A Request Fails or Rate Limits

- Read the message shown on the page and correct any field-level validation errors.
- If the page says there were too many requests, wait briefly before trying again.
- If the page cannot load data, use the retry action where it is provided or sign out and sign in again.

### A Page Shows No Data

- Refresh the page and check that you are signed in with the correct role. Some pages are role-specific and only show information for users with the required access.
- If the empty state remains, there may be no current records for the selected filter.

## Security and Privacy

Do not share passwords, setup links, reset links, verification links, or private Organisation information.

When using screenshots for Demo 3, use seeded demo data or clearly fake examples. Crop the browser address bar when it contains a token. If an email address is visible, use a safe sample address rather than a real private address.

Administrators should only perform actions for Organisations and users they are responsible for. Trainees should only use their own account and assigned training activities.

## Glossary

**Campaign:** A set of training activities assigned or made available to a trainee.

**Campaign Assignment:** The process Organisation Admins use to assign Campaigns to Organisation Trainees.

**Campaign Builder:** The area Organisation Admins use to create or edit Campaign content where the integrated UI supports it.

**Campaign Statistics:** Reporting views that show Campaign progress and outcomes where the integrated UI supports them.

**General Trainee:** A trainee who uses the platform outside a managed Organisation context.

**Insightful Phish Admin:** A platform-level administrator who reviews Organisation requests and platform Organisation information.

**Initial Organisation Admin Setup:** The first setup process used by the approved Organisation representative.

**Organisation Admin:** A user who manages Organisation settings, trainees, administrators, invitations, and Campaign workflows where permitted.

**Organisation Registration Request:** A request asking Insightful Phish to create an Organisation account.

**Organisation Trainee:** A user linked to an Organisation for assigned training.

**Simulated Inbox:** A safe training inbox used for phishing awareness.

**Timeline:** A history of important onboarding events for a request or Organisation.

**Training Document:** Reading material that teaches a cybersecurity topic.

**Quiz:** A set of questions used to check understanding after training.

## Support

For Demo 3 support, use the support guidance shown in the application or contact the responsible Organisation Admin.

---

Previous section: [Testing Policy](testing-policy.md)

Next section: [User Interface Screenshot Catalogue](user-interface/README.md)
