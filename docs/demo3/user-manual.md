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
- [Account Management and Security](#account-management-and-security)
  - [Open Account Management](#open-account-management)
  - [Request an Email Change](#request-an-email-change)
  - [Change Your Password](#change-your-password)
  - [Review Active Sessions](#review-active-sessions)
- [General Trainee Tasks](#general-trainee-tasks)
- [Organisation Trainee Tasks](#organisation-trainee-tasks)
- [Organisation Admin Tasks](#organisation-admin-tasks)
- [Insightful Phish Admin Tasks](#insightful-phish-admin-tasks)
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

**Screenshot:** ![Session settings](user-interface/public-account/10-session-settings.png)

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

**Screenshot:** ![Initial administrator setup](user-interface/organisation-onboarding/04-initial-admin-setup.png)

### Review Organisation Information

**Audience:** Organisation Admin.

**Preconditions:** you are signed in as an Organisation Admin.

**Navigation:** **Organisation Information**.

1. Open **Organisation Information**.
2. Use the tabs to review basic information, representative information, administrators, and timeline details.

**Expected result:** the platform shows Organisation information available to your role.

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

**Screenshots:**

![Request detail](user-interface/platform-admin/03-request-detail.png)
![Organisation detail](user-interface/platform-admin/04-organisation-detail.png)
![Onboarding timeline](user-interface/platform-admin/05-onboarding-timeline.png)
![Resend initial administrator setup](user-interface/platform-admin/06-resend-initial-admin-setup.png)

Platform Administrator management content will be verified against the integrated Demo 3 UI in a later commit before final manual completion.

## Troubleshooting

### Login Does Not Work

- Check that the email and password are entered correctly.
- If the password is forgotten, use the password reset flow.
- If the account has not been verified yet, complete email verification first.

### Verification Link Has Expired

- Use the resend option if it is shown.
- If resend is not available, request a new link from the relevant registration, setup, or invitation flow.

### Setup Link Is Invalid or Already Used

- Setup links can expire, be revoked, or be used only once. Ask the admin who sent the invitation to send a new setup link.

### A Setting Is Read-Only

- Some account or security settings may be controlled by Organisation policy.
- If a setting is read-only, follow the message shown on the page or contact an Organisation Admin.

### A Page Shows No Data

- Refresh the page and check that you are signed in with the correct role. Some pages are role-specific and only show information for users with the required access.

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
