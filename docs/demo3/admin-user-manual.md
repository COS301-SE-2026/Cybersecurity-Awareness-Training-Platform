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
  - [Invite an Organisation Trainee](#invite-an-organisation-trainee)
  - [Resend a Trainee Invitation](#resend-a-trainee-invitation)
  - [Revoke a Trainee Invitation](#revoke-a-trainee-invitation)
  - [Disable an Organisation Trainee](#disable-an-organisation-trainee)
  - [Re-enable an Organisation Trainee](#re-enable-an-organisation-trainee)
  - [View Administrator Permissions](#view-administrator-permissions)
  - [Promote an Organisation Trainee](#promote-an-organisation-trainee)
  - [Edit Administrator Permissions](#edit-administrator-permissions)
  - [Remove Administrator Privileges](#remove-administrator-privileges)
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

**Required permission:** Organisation information must be available to your role.

**Navigation:** **Organisation Information**.

**Purpose:** review the Organisation record, representative, administrators, and lifecycle history available to your role.

1. Open **Organisation Information**.
2. Use the tabs to review basic information, representative information, administrators, and timeline details.

**Expected result:** the platform shows Organisation information available to your role.

**Note:** Organisation status and timeline entries are review information. They should not be edited from this page unless the UI provides an explicit action.

**Troubleshooting:** if a tab or value is unavailable, confirm that you are viewing your own Organisation and refresh the page. Contact an Insightful Phish Admin when the Organisation record itself needs correction.

**Screenshots:**

![Organisation information](user-interface/organisation-admin/01-organisation-information.png)
![Organisation timeline](user-interface/organisation-admin/02-organisation-timeline.png)

### Update Organisation Security Preferences

**Audience:** Organisation Admin.

**Preconditions:** you are signed in and the Organisation is in a state that permits security changes.

**Required permission:** the page must show Organisation security preferences as editable for your account.

**Navigation:** **Security Preferences**.

**Purpose:** configure Organisation-wide account and session policies shown by the page.

1. Open **Security Preferences**.
2. Review any read-only message at the top of the page.
3. Change only the settings that are editable for your role.
4. Select **Update Organisation Security Preferences**.
5. Check for the success or validation message.

**Expected result:** editable settings are saved, and read-only settings remain unchanged.

**Warning:** Organisation security settings can affect user sessions and account-change permissions across the Organisation.

**Troubleshooting:** if the page says settings cannot be modified because the Organisation is suspended, inactive, or disabled, resolve the Organisation status before trying to save changes.

**Screenshot:** ![Organisation security preferences](user-interface/organisation-admin/03-security-preferences.png)

### Invite an Organisation Trainee

**Audience:** Organisation Admin.

**Preconditions:** the person is not already an active or disabled member of the Organisation, and the Organisation permits invitations.

**Required permission:** Invite Organisation Trainees.

**Navigation:** **Trainees**.

**Purpose:** send a new Organisation Trainee invitation to an eligible email address.

1. Open **Trainees**.
2. Select **Invite Trainee**.
3. Enter the trainee's email address and optional name details shown by the form.
4. Submit the invitation.
5. Check the result message before closing the modal.

**Expected result:** an actionable invitation row appears and the invitation email is queued when delivery preparation succeeds.

**Note:** a queued invitation is not proof that the email has already been delivered.

**Troubleshooting:** if the request is rejected, check whether the email belongs to an existing or disabled member, whether another actionable invitation exists, and whether the Organisation still allows invitations.

**Screenshots:**

![Organisation trainee management](user-interface/organisation-admin/04-trainee-management.png)
![Invite trainee modal](user-interface/organisation-admin/05-invite-trainee-modal.png)

### Resend a Trainee Invitation

**Audience:** Organisation Admin.

**Preconditions:** the row represents an invitation whose current lifecycle state permits resend.

**Required permission:** Invite Organisation Trainees.

**Navigation:** **Trainees** > locate the invitation row.

**Purpose:** replace an eligible invitation link and queue a fresh invitation email.

1. Find the invitation using search or the status filter.
2. Select **Resend** from the row actions when it is available.
3. Confirm the resend action.
4. Wait for the refreshed invitation state.

**Expected result:** the previous unused link is replaced and the list refreshes with the authoritative invitation state.

**Warning:** after a successful resend, the older invitation link should no longer be used.

**Troubleshooting:** resend may be unavailable during a cooldown or after the invitation becomes terminal. Refresh the list if another administrator may have changed it.

### Revoke a Trainee Invitation

**Audience:** Organisation Admin.

**Preconditions:** the row represents an invitation that is still eligible for revocation.

**Required permission:** Invite Organisation Trainees.

**Navigation:** **Trainees** > locate the invitation row.

**Purpose:** prevent an outstanding Organisation Trainee invitation from being accepted.

1. Find the invitation.
2. Select **Revoke** from its row actions.
3. Review the confirmation dialog.
4. Select **Revoke Invitation**.

**Expected result:** the invitation becomes unusable and the management list refreshes.

**Warning:** revocation invalidates the outstanding invitation link. Send a new invitation only after confirming that access should be offered again.

**Troubleshooting:** if the invitation was already accepted, completed, revoked, or changed by another administrator, refresh the list and use the actions shown for its current state.

### Disable an Organisation Trainee

**Audience:** Organisation Admin.

**Preconditions:** the row represents an active Organisation Trainee membership that is eligible for disablement.

**Required permission:** Remove Organisation Trainees.

**Navigation:** **Trainees** > locate the active membership row.

**Purpose:** suspend the existing Organisation membership without deleting or reinviting the trainee.

1. Select **Disable** on the active trainee row.
2. Review the named trainee and the access warning.
3. Enter your current administrator password.
4. Add a reason when the form provides that option.
5. Confirm the disable action.

**Expected result:** the existing membership is marked **Disabled**, active access is revoked, and the refreshed row remains a membership rather than becoming an invitation.

**Warning:** disabling a trainee revokes their active sessions and can interrupt work in progress.

**Troubleshooting:** an incorrect password, changed membership state, insufficient permission, or inactive Organisation can prevent the action. Refresh the list before retrying a conflict.

### Re-enable an Organisation Trainee

**Audience:** Organisation Admin.

**Preconditions:** the row represents an existing disabled Organisation Trainee membership that is eligible for re-enablement.

**Required permission:** Remove Organisation Trainees.

**Navigation:** **Trainees** > locate the disabled membership row.

**Purpose:** return the existing disabled membership to active status without creating another profile or invitation.

1. Select **Re-enable** on the disabled trainee row.
2. Review the membership and session warning.
3. Enter your current administrator password.
4. Select **Re-enable Trainee**.
5. Wait for the authoritative trainee list to refresh.

**Expected result:** the same membership returns to **Active** and its current disable details are cleared.

**Warning:** previously revoked sessions are not restored. The trainee must sign in again.

**Troubleshooting:** if the membership is no longer disabled, belongs to another Organisation, or your password or permission is rejected, the action will not proceed. Refresh the list to reconcile stale state.

### View Administrator Permissions

**Audience:** Organisation Admin.

**Preconditions:** you are signed in and the administrator list is available.

**Required permission:** View Organisation Admins.

**Navigation:** **Administrators**.

**Purpose:** inspect the permissions currently assigned to an Organisation Admin.

1. Open **Administrators**.
2. Search for the administrator when necessary.
3. Select **View Permissions** on the row.
4. Review the displayed permission names.

**Expected result:** the page shows the administrator's current permissions without changing them.

**Troubleshooting:** if the page or action is unavailable, confirm your view permission and Organisation context, then refresh the list.

### Promote an Organisation Trainee

**Audience:** Organisation Admin.

**Preconditions:** the target email belongs to an active Organisation Trainee in the same Organisation, and no active administrator membership or pending promotion already exists for that user.

**Required permission:** Invite Organisation Admins.

**Navigation:** **Administrators**.

**Purpose:** offer an existing Organisation Trainee an Organisation Admin role with a selected permission set.

1. Open **Administrators**.
2. Open the administrator promotion form.
3. Enter the existing trainee's email address.
4. Select at least one appropriate permission.
5. Submit the promotion.
6. Ask the trainee to review and accept the role-change invitation sent to their email address.

**Expected result:** a promotion invitation is created for the existing trainee. The user becomes an Organisation Admin only after completing the supported acceptance flow.

**Warning:** this workflow grants administrative access. Confirm the trainee's identity and select only the permissions required for their responsibilities.

**Troubleshooting:** the promotion is rejected when the email is not an active trainee in the Organisation, the user is already an active admin, or a promotion is already pending. Refresh the list before retrying stale state.

### Edit Administrator Permissions

**Audience:** Organisation Admin.

**Preconditions:** the target is an active Organisation Admin whose permissions your account is allowed to change.

**Required permission:** Change Organisation Admin Permissions.

**Navigation:** **Administrators** > locate the administrator row.

**Purpose:** adjust the administrator's Organisation permissions without changing their account identity.

1. Select **Edit Permissions**.
2. Review the administrator named in the modal.
3. Select or clear permissions according to the person's responsibilities.
4. Select **Save Permissions**.

**Expected result:** the updated authoritative permission set appears in the administrator list.

**Warning:** permissions can grant access to security settings, people management, and Campaign workflows. Do not grant broader access than the role requires.

**Troubleshooting:** protected or critical permission rules may prevent an invalid change. Refresh the list if the administrator or your own permissions changed while the modal was open.

### Remove Administrator Privileges

**Audience:** Organisation Admin.

**Preconditions:** the target is an Organisation Admin eligible for removal and is not protected by the current Organisation administration rules.

**Required permission:** Remove Organisation Admins.

**Navigation:** **Administrators** > locate the administrator row.

**Purpose:** remove Organisation Admin access from the selected user through the supported lifecycle operation.

1. Select **Remove** on the administrator row.
2. Review the named administrator and destructive-action warning.
3. Enter your current administrator password.
4. Type `REMOVE` exactly in the confirmation field.
5. Confirm the removal.

**Expected result:** the administrator privileges are removed and the authoritative administrator list refreshes.

**Warning:** this is a security-sensitive access change and can revoke the person's administrative sessions. Confirm the correct person before continuing.

**Troubleshooting:** removal can fail when the password is wrong, the target or Organisation state changed, the target is protected, or your permission is no longer valid. Refresh before retrying a conflict.

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
