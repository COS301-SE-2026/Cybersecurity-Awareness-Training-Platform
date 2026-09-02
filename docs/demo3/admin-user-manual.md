# Insightful Phish Demo 3 Admin User Manual

## Introduction

This manual contains administration workflows for Organisation Admins and Insightful Phish Admins. It is separated from the normal Demo 3 User Manual so administrators can find role-specific management tasks without duplicating shared account guidance.

For sign-in, password, account management, session, invitation acceptance, and initial setup instructions, use the **[Demo 3 User Manual](user-manual.md)**.

Screenshots referenced in this manual are catalogued under [`user-interface/`](user-interface/README.md) and should use demo data that is safe to share.

## Contents

- [Introduction](#introduction)
- [Organisation Admin Tasks](#organisation-admin-tasks)
  - [Review Organisation Information](#review-organisation-information)
  - [Update Organisation Security Preferences](#update-organisation-security-preferences)
  - [Review Organisation Trainees](#review-organisation-trainees)
  - [Review Organisation Administrators](#review-organisation-administrators)
  - [Manage Campaigns](#manage-campaigns)
  - [Build or Edit a Campaign Draft](#build-or-edit-a-campaign-draft)
  - [Assign Campaigns to Organisation Trainees](#assign-campaigns-to-organisation-trainees)
  - [Review Campaign Statistics](#review-campaign-statistics)
- [Insightful Phish Admin Tasks](#insightful-phish-admin-tasks)
  - [Review Organisation Requests](#review-organisation-requests)
  - [Review Request or Organisation Details](#review-request-or-organisation-details)
  - [Manage Platform Administrators](#manage-platform-administrators)
- [Shared Account and Support Guidance](#shared-account-and-support-guidance)

## Organisation Admin Tasks

Organisation Admins manage their Organisation's information, security preferences, trainees, administrators, invitations, and Campaign workflows where their permissions allow.

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

### Manage Campaigns

**Audience:** Organisation Admins with Campaign viewing or management permission.

**Preconditions:** you are signed in as an Organisation Admin and the Campaign management area is available to your role.

**Navigation:** use the Campaign management entry point exposed by the application for your Organisation.

1. Open the Campaign management page.
2. Use **Search campaigns** or **Campaign status** to narrow the list.
3. Select **View Campaign**, **View Draft**, or **Continue Editing** for the Campaign you need to inspect.
4. Select **Create Campaign** only when the page shows the action and your role is allowed to manage Campaigns.

**Expected result:** the platform shows Campaigns in their current lifecycle state and exposes only the actions allowed for your role.

**Warning:** Campaign lifecycle actions affect trainee access to training content. Review the Campaign status, items, start date, and end date before changing it.

**Troubleshooting:** if the Campaign management entry point or action is unavailable, your account may not have the required Campaign permission or the Organisation state may not allow the action.

### Build or Edit a Campaign Draft

**Audience:** Organisation Admins with Campaign management permission.

**Preconditions:** you can open **Create Campaign** or **Continue Editing** from the Campaign management page.

**Navigation:** Campaign management > **Create Campaign** or **Continue Editing**.

1. Enter a Campaign name and optional description.
2. Choose the Campaign colour and schedule fields where the form shows them.
3. Add Campaign items from **Campaign Items**.
4. Review the Campaign order and adjust required or optional items where the builder allows it.
5. Select **Save Draft** or **Save Changes**.
6. Use **Activate Campaign** only after the draft has at least one available item and the page shows activation as available.

**Expected result:** the draft is saved with the selected items and can be activated when it meets the Campaign rules.

**Warning:** activating a Campaign can make it visible for assignment or participation. Save and review changes before activating.

**Troubleshooting:** if activation is disabled, check the message below the button. The page may require items, available source content, saved changes, or a valid schedule.

### Assign Campaigns to Organisation Trainees

**Audience:** Organisation Admins with Campaign assignment permission.

**Preconditions:** the Organisation has eligible Organisation Trainees and assignable Campaigns, and the application exposes a completed assignment entry point for your role.

**Navigation:** use the assignment action shown by the Organisation management area when that action is available.

The current Demo 3 UI includes a three-step assignment screen with **Organisation Trainee Selection**, **Training Campaign Selection**, and **Review Campaign Assignment** views. The final submit path is not presented here as a completed user workflow until it is exposed as a finished action from the application.

**Expected result:** when the completed assignment action is exposed in the integrated UI, the user should be able to select trainees, select Campaigns, review the total assignment count, and submit without resetting existing progress.

**Warning:** assignment changes who can access Campaign content. Confirm the selected trainees and Campaigns before completing an assignment in a completed flow.

**Troubleshooting:** if the assignment action is not visible, the completed flow may not be enabled for your role yet, your account may not have Campaign assignment permission, or the Organisation may not have eligible trainees and Campaigns.

### Review Campaign Statistics

**Audience:** Organisation Admins with Campaign visibility permission.

**Preconditions:** Campaign statistics must be exposed from a role-appropriate Campaign page.

**Navigation:** use the statistics or reporting action shown by the Campaign page.

The current Demo 3 UI contains Campaign management and trainee Campaign activity pages, but no separate Campaign statistics navigation label or statistics page is exposed as a normal user workflow yet.

**Expected result:** when a statistics view is added to the integrated UI, it should be reachable from the Campaign page and should show progress or outcome information without exposing private trainee data unnecessarily.

**Troubleshooting:** if you cannot find statistics, use the Campaign list and Campaign detail pages for current lifecycle and item information, then check whether the statistics feature has been enabled for your role.

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

## Shared Account and Support Guidance

Administrators use the same account, password, email, session, security, troubleshooting, and privacy workflows as other users. See the **[Demo 3 User Manual](user-manual.md)** for those shared instructions and for Organisation registration and initial Organisation Admin setup.

---

Previous section: [Demo 3 User Manual](user-manual.md)

Next section: [User Interface Screenshot Catalogue](user-interface/README.md)
