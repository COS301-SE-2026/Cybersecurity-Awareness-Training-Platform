# Demo 3 User Interface Screenshot Catalogue

## Purpose

This catalogue lists the screenshots used by the Demo 3 User Manual and Admin User Manual. Screenshots should show usable, implemented screens only.

## Capture and Privacy Rules

Use demo accounts and sample organisations only. Before committing a screenshot, check that it does not show real personal data, tokens, or credentials.

## Public and Account Flows

Screenshots in this group support the [User Manual](../user-manual.md) and cover public access, registration, verification, password recovery, and account management.

| Screenshot                                            | Manual section                              | Notes                                       |
| ----------------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `public-account/01-login-page.png`                    | Sign In                                     | Use a demo email only.                      |
| `public-account/02-registration-form.png`             | Create an individual account                | Do not show a real password.                |
| `public-account/03-email-verification.png`            | Verify your email                           | Do not show a raw verification token.       |
| `public-account/04-forgot-password.png`               | Reset a forgotten password                  | Use a sample email address.                 |
| `public-account/05-reset-password.png`                | Reset a forgotten password                  | Do not show a real reset token.             |
| `public-account/06-complete-setup.png`                | Complete account setup from invitation link | Crop or hide the setup token.               |
| `public-account/07-account-management-tabs.png`       | Open account management                     | Use demo profile data only.                 |
| `public-account/08-change-email-modal.png`            | Request an email change                     | Use sample email addresses only.            |
| `public-account/09-change-password-modal.png`         | Change your password                        | Leave password fields blank.                |
| `public-account/10-session-settings.png`              | Review Sessions                             | Avoid real device, IP, or location details. |
| `public-account/11-accept-invitation-unavailable.png` | Accept an Organisation invitation           | Uses an invalid non-secret example link.    |

## Trainee Campaign Workflows

These [User Manual](../user-manual.md) screenshots cover the integrated Campaigns page, training content, quizzes, results, simulated inbox and details page.

| Screenshot                              | Manual section                       | Notes                                    |
| --------------------------------------- | ------------------------------------ | ---------------------------------------- |
| `trainee/01-campaigns.png`              | View available or assigned Campaigns | Use demo campaigns only                  |
| `trainee/02-open-campaign.png`          | Open Campaign activities             | Show available and locked campaigns      |
| `trainee/03-training-document.png`      | Read a training document             | Do not include private training material |
| `trainee/04-quiz.png`                   | Complete a quiz                      | Use demo questions only                  |
| `trainee/05-quiz-results.png`           | Complete a quiz                      | Use sample source data only              |
| `trainee/06-simulated-inbox.png`        | Work through a simulated inbox       | Use seeded demo emails only              |
| `trainee/07-simulated-email-detail.png` | Work through a simulated inbox       | Do not show real links or credentials    |

## Organisation Admin Flows

Screenshots cover Organisation registration and initial setup in the [User Manual](../user-manual.md), plus Organisation management screens in the [Admin User Manual](../admin-user-manual.md).

| Screenshot                                                          | Manual Section                            | Notes                             |
| ------------------------------------------------------------------- | ----------------------------------------- | --------------------------------- |
| `organisation-onboarding/01-organisation-registration-step-one.png` | Request Organisation Access               | Use a sample organisation         |
| `organisation-onboarding/02-organisation-registration-step-two.png` | Request Organisation Access               | Use a representative email only   |
| `organisation-onboarding/03-organisation-registration-success.png`  | Request Organisation Access               | Avoid real submitted details      |
| `organisation-onboarding/04-initial-admin-setup.png`                | Complete initial Organisation Admin setup | Hide setup token from address bar |
| `organisation-admin/01-organisation-information.png`                | Review organisation information           | Use sample organisation data      |
| `organisation-admin/03-security-preferences.png`                    | Update security preferences               | Show editable demo settings       |
| `organisation-admin/04-trainee-management.png`                      | Review Organisation Trainees              | Use demo trainee rows only        |
| `organisation-admin/05-invite-trainee-modal.png`                    | Review Organisation Trainees              | Use sample invitation details     |
| `organisation-admin/06-trainee-lifecycle-confirmation.png`          | Disable an Organisation Trainee           | Leave the password field blank    |
| `organisation-admin/07-administrator-management.png`                | Review Organisation Admins                | Use demo administrator rows only  |
| `organisation-admin/08-promotion-permissions.png`                   | Review Organisation Admin permissions     | Use demo permission details       |

## Organisation Campaign Workflows

These [Admin User Manual](../admin-user-manual.md) screenshots cover Organisation Campaign management, assignment, and insights.

| Screenshot                                                | Manual Section                 | Notes                                   |
| --------------------------------------------------------- | ------------------------------ | --------------------------------------- |
| `organisation-campaigns/01-campaign-list.png`             | Browse and open Campaigns      | Use demo Campaigns only                 |
| `organisation-campaigns/02-campaign-builder.png`          | Build or edit a Campaign draft | Leave new Campaign fields blank         |
| `organisation-campaigns/03-campaign-detail-lifecycle.png` | Manage the Campaign lifecycle  | Show a current integrated Campaign      |
| `organisation-campaigns/04-assignment-trainees.png`       | Assign Campaigns               | Use eligible demo trainees              |
| `organisation-campaigns/05-assignment-campaigns.png`      | Assign Campaigns               | Use assignable demo Campaigns           |
| `organisation-campaigns/06-assignment-review.png`         | Review Campaign assignment     | Do not submit during screenshot capture |
| `organisation-campaigns/07-campaign-insights.png`         | Review Campaign insights       | Use demo progress data only             |

## Insightful Phish Admin Flows

These [Admin User Manual](../admin-user-manual.md) screenshots cover Organisation request review, Organisation details, onboarding timeline reviews, setup resend, and platform management screens.

| Screenshot                                                | Manual Section                                 | Notes                                                   |
| --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `platform-admin/01-organisation-management.png`           | Review organisation requests                   | Use sample organisation data                            |
| `platform-admin/02-review-request-modal.png`              | Review organisation requests                   | Avoid real representative data                          |
| `platform-admin/03-request-detail.png`                    | Review request or organisation details         | Use a seeded request                                    |
| `platform-admin/04-organisation-detail.png`               | Review request or organisation details         | Use a seeded organisation                               |
| `platform-admin/05-current-onboarding-status.png`         | Review request or organisation details         | Use safe setup status and recipient data                |
| `platform-admin/06-resend-initial-admin-setup.png`        | Review request or organisation details         | Use sample representative details and hide setup tokens |
| `platform-admin/07-platform-administrators-normal.png`    | Understand Platform Administrator capabilities | Show the read-only normal administrator view            |
| `platform-admin/08-platform-administrators-super.png`     | Understand Platform Administrator capabilities | Show eligible Super Administrator actions               |
| `platform-admin/09-invite-upgrade-flow.png`               | Invite or upgrade a Platform Administrator     | Leave invitation fields blank                           |
| `platform-admin/10-super-admin-transfer-confirmation.png` | Transfer the Super Administrator capability    | Leave password and confirmation fields blank            |
| `platform-admin/11-onboarding-timeline.png`               | Review request or organisation details         | Use safe lifecycle summaries only                       |

## Platform Campaign Workflows

These [Admin User Manual](../admin-user-manual.md) screenshots cover the integrated Platform Campaign list, builder, and lifecycle detail.

| Screenshot                                                     | Manual Section            | Notes                                  |
| -------------------------------------------------------------- | ------------------------- | -------------------------------------- |
| `platform-campaigns/01-platform-campaign-list.png`             | Manage Platform Campaigns | Use safe screenshot-only Campaign data |
| `platform-campaigns/02-platform-campaign-builder.png`          | Build a Platform Campaign | Leave new Campaign fields blank        |
| `platform-campaigns/03-platform-campaign-detail-lifecycle.png` | Manage Campaign lifecycle | Show current permitted actions         |

## Manual Reuse

When a screenshot is used please keep the same file name in this catalogue so reviewers can trace every image back to its workflow.

- **[User Manual](../user-manual.md)**
- **[Admin User Manual](../admin-user-manual.md)**
- **[Demo 3 Documentation Home](../README.md)**
