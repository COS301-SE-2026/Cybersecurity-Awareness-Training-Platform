# Insightful Phish Trainee User Manual

This manual describes the Demo 4 trainee experience. The options available to you depend on your account, organisation, and assigned Campaigns.

## Contents

1. [Account access](#account-access)
2. [Account management](#account-management)
3. [Campaigns](#campaigns)
4. [Training Documents](#training-documents)
5. [Quizzes](#quizzes)
6. [Simulated Inbox activities](#simulated-inbox-activities)
7. [Adaptive Campaign items](#adaptive-campaign-items)
8. [Troubleshooting](#troubleshooting)

## Account access

### Sign in

1. Open Insightful Phish and select **Sign In**.
2. Enter your email address and password.
3. Complete any additional verification requested for your account.
4. After successful sign-in, use **Campaigns** in the navigation to open your learning work.

If your session expires, the application returns you to sign-in. Sign in again before continuing.

### Register and verify an account

Self-registration is available from **Register** where enabled for the deployment.

1. Enter the requested account details.
2. Submit the registration form.
3. Follow the email verification instructions sent to the registered address.
4. Sign in after the address has been verified.

An organisation may instead invite you or provide a setup link. Open the invitation or setup link and complete the displayed steps. Invitation and setup links may expire or become invalid after use; request a new link from an administrator when necessary.

### Recover a password

1. Select **Forgot Password** from the sign-in page.
2. Enter the account email address.
3. Follow the reset link sent by email.
4. Choose a new password that satisfies the displayed password rules.

The application does not confirm whether an entered address belongs to an account. This protects account information.

## Account management

Open the user menu and select **Account Management**. The page contains three areas:

- **Personal Information** for profile details that your account is permitted to edit.
- **Account** for account and security settings available to you.
- **Sessions** for viewing and managing active sessions where permitted.

Some settings may be managed by your organisation. The page identifies those restrictions rather than allowing you to override them.

Use the user menu to sign out when you have finished, especially on a shared device.

## Campaigns

The **Campaigns** page is the starting point for assigned and self-enrolled learning.

### Open an assigned Campaign

1. Select **Campaigns** in the navigation.
2. Find the Campaign you want to continue.
3. Open the Campaign to view its ordered learning items.
4. Select the next available item.

A Campaign can contain individual items and groups. Items may be required or optional. An item can remain unavailable until preceding required work is complete.

Progress shown on the Campaign page is based on the learning items completed in that Campaign. Completing content in one Campaign does not imply that every occurrence of the same reusable content is complete elsewhere.

### Discover and enrol in platform Campaigns

General trainees can browse platform Campaigns made available for self-enrolment.

1. On **Campaigns**, open **Discover platform campaigns**.
2. Review the available Campaigns.
3. Select **Enrol in Campaign** for the Campaign you want to join.
4. Open or continue the Campaign from your Campaign list.

Selecting enrol more than once does not create duplicate enrolments. Organisation-managed trainees may receive Campaigns through administrator assignment instead of self-enrolment.

## Training Documents

A Training Document presents learning material inside a Campaign.

1. Open the Training Document from its Campaign.
2. Read the title, summary, and document content.
3. Use the completion action shown on the page after finishing the material.
4. Return to the Campaign to continue with the next available item.

Only the content version selected for the Campaign occurrence is shown. Trainees cannot edit or activate Training Documents.

## Quizzes

### Answer questions

Open a Quiz from its Campaign. The Quiz displays how many attempts remain for that occurrence.

- A single-choice question uses radio buttons and accepts one answer.
- A multiple-choice question uses checkboxes and can accept more than one answer.

Select an answer for every required question, then submit the attempt. The application resumes an existing in-progress attempt instead of creating another one for the same occurrence.

### Results and feedback

After submission, the results page can show:

- whether the attempt passed;
- the attempt score;
- the effective score used for the Campaign occurrence;
- attempts remaining;
- selected answers and question feedback.

The effective score follows the Campaign's configured scoring policy. It may use the latest submitted score or the best submitted score.

### Repeat a Quiz

When attempts remain, select **Retake Quiz** from the result page. A new attempt is created only after the previous attempt has been submitted. Previous submitted attempts remain recorded, while the Campaign occurrence applies its configured score policy.

When the attempt limit has been reached, the Quiz cannot be started again for that Campaign occurrence.

## Simulated Inbox activities

A Simulated Inbox is a safe learning activity containing simulated messages. It does not send a real email from the trainee interface.

### Review a message

1. Open the Simulated Inbox from its Campaign.
2. Select a message from the inbox list.
3. Inspect the sender, subject, body, and any displayed links or warning signs.

### Classify and submit

1. Choose **Safe**, **Suspicious**, or **Phishing**.
2. Select the warning signs you identified.
3. Select **Submit Answer**.

After submission, the result can show the expected classification, explanatory feedback, correctly identified warning signs, missed signs, and incorrect selections. Links inside the simulation are part of the learning activity and may record simulated interaction behaviour.

## Adaptive Campaign items

Some Campaign occurrences can have Easy, Medium, and Hard alternatives of the same content type. Insightful Phish selects one eligible alternative for your Campaign assignment using available learning evidence.

You complete the selected Training Document, Quiz, or Simulated Inbox through the same pages described above. The selected alternative remains consistent for that assigned occurrence; refreshing the page does not choose a different item.

The Campaign interface does not expose internal evidence weights, category calculations, or a manual difficulty control.

## Troubleshooting

### A Campaign item is locked

Return to the Campaign and complete the earlier required item or group shown before it. Refresh the Campaign after completing the prerequisite.

### A Quiz cannot be started

Check the attempts-remaining message. A submitted Quiz can be retaken only when the Campaign occurrence allows another attempt.

### Content does not load

1. Confirm that you are still signed in.
2. Return to **Campaigns** and reopen the item.
3. Refresh the page once.
4. If the problem continues, contact your organisation administrator and include the Campaign and item names.

### An invitation, setup, or reset link fails

The link may have expired or already been used. Request a new invitation or reset email rather than repeatedly reusing the same link.

## Data and safety notes

Insightful Phish records learning progress, Quiz attempts, and simulated interaction results required to deliver Campaigns and calculate results. Simulated Inbox activity is training content; do not enter real passwords or other secrets into it.

For the documented Demo 4 privacy and security boundaries, see [Privacy and Data Boundaries](sas/privacy-and-data-boundaries.md). Known product constraints are listed in [Known Limitations](sas/known-limitations.md).
