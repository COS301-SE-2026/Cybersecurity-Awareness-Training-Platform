# Use Cases

### SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- **[4. Use Cases](#4-use-cases)** &larr; _You are here_
  - [4.1 High-Level Use Case Diagrams](#41-high-level-use-case-diagrams)
    - [Authentication and Account Access]
    - [Trainee Campaign Participation]
    - [Organisation Onboarding and Invitations]
    - [Organisation Membership and Role Administration]
    - [Platform Administrator Governance]
    - [Security and Account Management]
  - [4.2 Authentication and Account Access Use Cases](#42-authentication-and-account-access-use-cases)
    - [AUTH-01 Register an Individual Account](#auth-01-register-an-individual-account)
    - [AUTH-02 Verify an Email Address](#auth-02-verify-an-email-address)
    - [AUTH-03 Log In](#auth-03-log-in)
    - [AUTH-04 Log Out](#auth-04-log-out)
    - [AUTH-05 Recover Account Access](#auth-05-recover-account-access)
    - [AUTH-06 Resend an Account Access Email](#auth-06-resend-an-account-access-email)
  - [4.3 Core and Planned Product Use Cases](#43-core-and-planned-product-use-cases)
    - [UC-01 View Emails in a Simulated Inbox](#uc-01-view-emails-in-a-simulated-inbox)
    - [UC-02 View a Training Document](#uc-02-view-a-training-document)
    - [UC-03 Complete a Quiz and View Results](#uc-03-complete-a-quiz-and-view-results)
    - [UC-04 Request Organisation Registration](#uc-04-request-organisation-registration)
    - [UC-05 Review and Manage Organisation Registrations](#uc-05-review-and-manage-organisation-registrations)
    - [UC-06 Complete First Organisation Administrator Setup](#uc-06-complete-first-organisation-administrator-setup)
    - [UC-07 Accept an Organisation Invitation or Role Change](#uc-07-accept-an-organisation-invitation-or-role-change)
    - [UC-08 Manage Organisation Employees](#uc-08-manage-organisation-employees)
    - [UC-09 Manage Organisation Administrators and Permissions](#uc-09-manage-organisation-administrators-and-permissions)
    - [UC-10 Manage Platform Administrators](#uc-10-manage-platform-administrators)
    - [UC-11 Manage Organisation Security Settings](#uc-11-manage-organisation-security-settings)
    - [UC-12 Manage Personal Account and Security Settings](#uc-12-manage-personal-account-and-security-settings)
    - [UC-13 Manage Organisation Lifecycle and Access](#uc-13-manage-organisation-lifecycle-and-access)
    - [UC-14 Manage Organisation Trainee Tags](#uc-14-manage-organisation-trainee-tags)
    - [UC-15 Manage Organisation Context](#uc-15-manage-organisation-context)
    - [UC-16 Manage Premade Campaigns](#uc-16-manage-premade-campaigns)
    - [UC-17 Manage Organisation Campaigns](#uc-17-manage-organisation-campaigns)
    - [UC-18 Manage Training Documents](#uc-18-manage-training-documents)
    - [UC-19 Manage Quizzes](#uc-19-manage-quizzes)
    - [UC-20 Manage Simulated Inboxes and Emails](#uc-20-manage-simulated-inboxes-and-emails)
    - [UC-21 Generate and Review Draft Training Content with AI Assistance](#uc-21-generate-and-review-draft-training-content-with-ai-assistance)
    - [UC-22 Browse Published Premade Campaigns](#uc-22-browse-published-premade-campaigns)
    - [UC-23 Self-enrol in Premade Campaigns](#uc-23-self-enrol-in-premade-campaigns)
    - [UC-24 View Available Training Campaigns](#uc-24-view-available-training-campaigns)
    - [UC-25 Reset a Self-Enrolled Campaign](#uc-25-reset-a-self-enrolled-campaign)
    - [UC-26 Assign Campaigns to Organisation Trainees](#uc-26-assign-campaigns-to-organisation-trainees)
    - [UC-27 Reset Organisation Campaign Progress](#uc-27-reset-organisation-campaign-progress)
    - [UC-28 Classify a Simulated Email](#uc-28-classify-a-simulated-email)
    - [UC-29 Interact with a Simulated Email Threat](#uc-29-interact-with-a-simulated-email-threat)
    - [UC-30 View Personal Campaign Progress and Results](#uc-30-view-personal-campaign-progress-and-results)
    - [UC-31 View Organisation Training Reports](#uc-31-view-organisation-training-reports)
    - [UC-32 Review Organisation Audit History](#uc-32-review-organisation-audit-history)
    - [UC-33 View Platform Usage and Lifecycle Overview](#uc-33-view-platform-usage-and-lifecycle-overview)
    - [UC-34 Review Platform Audit and Security Events](#uc-34-review-platform-audit-and-security-events)
    - [UC-35 Configure and Launch Ethical Real Email Simulation Campaigns](#uc-35-configure-and-launch-ethical-real-email-simulation-campaigns)
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)

---

# 4. Use Cases

The following use cases describe how users interact with the Insightful Phish system to achieve specific goals, including the main successful interactions and relevant flows.

## 4.1 High-Level Use Case Diagrams

The following high level use case diagrams group closely related use cases by system capability. Each grouped diagram is embedded once in this section, and is then cross-referenced from the written use cases it covers.

> [!note]
> The Use Case Diagrams below cover only use cases that are implemented or actively integrated. Planned and future use cases are excluded.

### Authentication and Account Access

![Authentication and Account Access Use Case Diagram](../diagrams/srs/use-cases/authentication-and-account-access.drawio.svg)
_Figure 4.1: Supporting authentication and account access processes covering [`AUTH-01`](#auth-01-register-an-individual-account) to [`AUTH-06`](#auth-06-resend-an-account-access-email)_

### Trainee Campaign Participation

![Trainee Campaign Access Use Case Diagram](../diagrams/srs/use-cases/trainee-campaign-participation.drawio.svg)
_Figure 4.2: Implemented trainee campaign participation processes covering [UC-01](#uc-01-view-emails-in-a-simulated-inbox), [UC-02](#uc-02-view-a-training-document) and [UC-03](#uc-03-complete-a-quiz-and-view-results)_

### Organisation Onboarding and Invitations

![Organisation Onboarding and Invitations Use Case Diagram](../diagrams/srs/use-cases/organisation-onboarding-and-invitations.drawio.svg)
_Figure 4.3: Organisation registration, onboarding, and invitation response processes covering [UC-04](#uc-04-request-organisation-registration), [UC-05](#uc-05-review-and-manage-organisation-registrations), [UC-06](#uc-06-complete-first-organisation-administrator-setup) and [UC-07](#uc-07-accept-an-organisation-invitation-or-role-change)_

### Organisation Membership and Role Administration

![Organisation Membership and Role Administration Use Case Diagram](../diagrams/srs/use-cases/organisation-membership-and-role-administration.drawio.svg)
_Figure 4.4: Organisation trainee, administrator, and permission management processes covering [UC-08](#uc-08-manage-organisation-trainees) and [UC-09](#uc-09-manage-organisation-administrators-and-permissions)_

### Platform Administrator Governance

![Platform Administrator Governance Use Case Diagram](../diagrams/srs/use-cases/platform-administrator-governance.drawio.svg)
_Figure 4.5: Platform administrator governance processes covering [UC-10](#uc-10-manage-platform-administrators)_

### Security and Account Management

![Security and Account Management Use Case Diagram](../diagrams/srs/use-cases/security-and-account-management.drawio.svg)
_Figure 4.6: Organisation security and personal account management processes covering [UC-11](#uc-11-manage-organisation-security-settings) and [UC-12](#uc-12-manage-personal-account-and-security-settings)_

## 4.2 Authentication and Account Access Use Cases

**Use Case Diagram:** [Authentication and Account Access](#authentication-and-account-access)

We have decided to include the following use cases even though they are considered to be basic authentication required for most systems.

### `AUTH-01` Register an Individual Account

**TUCBW** An Individual Trainee submits the registration form to create an independent account

**TUCEW** The Individual Trainee receives confirmation that the account has been created and must verify the registered email address before logging in

**Related Use Case Diagram:** [Authentication and Account Access](#authentication-and-account-access)

> [!Note]
> This Use Case (`AUTH-01`) is related to User Story **3.1** in [Individual Trainee Access](users-and-user-stories.md#3-individual-trainee-access) and Functional Requirements **R1.1** and **R1.6** in [Authentication and Account Access](functional-requirements.md#r1-authentication-and-account-access).

<details> <summary><strong>View more details about AUTH-01</strong></summary>

**Trigger:** The Individual Trainee submits the public account registration form

**Primary Actor:** Individual Trainee

**Supporting Actor:** External Email Delivery Provider

**Preconditions**

- The Individual Trainee can access the public registration page
- The submitted email address is not already associated with an existing account, unresolved organisation registration request, or active invitation
- The submitted password meets the platform password policy

**Postconditions**

- A pending email-verification account is created for the Individual Trainee
- An email verification token is created and sent to the registered email address
- The Individual Trainee is not granted authenticated platform access until the email address is verified

**Main Success Scenario**

1. The Individual Trainee enters their first name, last name, email address, password and password confirmation
2. The system validates the submitted registration details
3. The system checks that the email address does not conflict with an existing account, unresolved organisation request, or active invitation
4. The system creates an account in a pending email-verification state
5. The system creates a verification token for the account
6. The system sends an email verification link to the registered email address
7. The system displays a confirmation that verification is required before login

**Alternative Flows**

- If optional registration information is not provided, the system continues with the required account information
- If the verification email cannot be delivered after the account is created, the account remains pending and the user may request a new verification email

**Exception Flows**

- If required fields are invalid or missing, the system identifies the affected fields and does not create the account
- If the password and confirmation do not match, the system rejects the registration
- If the email address conflicts with an existing account, unresolved organisation request, or active invitation, the system rejects the registration with a safe explanation
- If persistence fails before the account is created, no partial account is retained

</details>

### `AUTH-02` Verify an Email Address

**TUCBW** An Account Holder opens the secure verification link sent to their registered email address

**TUCEW** The Account Holder's email address is verified and the account becomes eligible for login where all other access checks pass

**Related Use Case Diagram:** [Authentication and Account Access](#authentication-and-account-access)

> [!Note]
> This Use Case (`AUTH-02`) is related to User Story **3.1** in [Individual Trainee Access](users-and-user-stories.md#3-individual-trainee-access) and Functional Requirements **R1.1.3** to **R1.1.5** and **R1.6** in [Authentication and Account Access](functional-requirements.md#r1-authentication-and-account-access).

<details> <summary><strong>View more details about AUTH-02</strong></summary>

**Trigger:** The Account Holder opens or submits an email verification token

**Primary Actor:** Account Holder

**Supporting Actor:** None

**Preconditions**

- A pending email-verification account exists
- A verification token exists for the account and registered email address
- The token has not expired, been used, been revoked, or been superseded

**Postconditions**

- The account email address is marked as verified
- The verification token is marked as used only after verification succeeds
- The account can log in where credential, status and policy checks pass

**Main Success Scenario**

1. The Account Holder opens the verification link
2. The system validates the token value, purpose, expiry, status and account context
3. The system verifies that the token belongs to the intended account and email address
4. The system marks the account email address as verified
5. The system marks the token as used
6. The system confirms that the email address has been verified

**Alternative Flows**

- If the account was already verified through a valid earlier action, the system displays an already-completed state without duplicating the tokenised action
- If verification fails safely because the token can be resent, the system offers the appropriate resend path

**Exception Flows**

- If the token is missing, invalid, expired, revoked, used, or intended for another purpose, the system rejects the verification
- If the token does not match the intended account or email context, the system rejects the verification
- If verification cannot be completed, the token remains unused unless the intended action completed successfully

</details>

### `AUTH-03` Log In

**TUCBW** A Registered User submits credentials on the common login page

**TUCEW** The Registered User receives an authenticated session and is directed to the appropriate area for their user type and context

**Related Use Case Diagram:** [Authentication and Account Access](#authentication-and-account-access)

> [!Note]
> This Use Case (`AUTH-03`) is related to User Story **2.1** in [Authentication and Account Management](users-and-user-stories.md#2-authentication-and-account-management) and Functional Requirement **R1.2** in [Authentication and Account Access](functional-requirements.md#r1-authentication-and-account-access).

<details> <summary><strong>View more details about AUTH-03</strong></summary>

**Trigger:** The Registered User submits the login form

**Primary Actor:** Registered User

**Supporting Actor:** None

**Preconditions**

- The Registered User has an account on the platform
- The account is eligible for password-based login
- Any applicable organisation status and session policy allows access

**Postconditions**

- An authenticated session is created when login succeeds
- The user is redirected to the appropriate area of the platform
- Failed login attempts do not disclose whether the email address or password was incorrect

**Main Success Scenario**

1. The Registered User enters an email address and password
2. The Registered User selects whether to request a remembered session where the option is available
3. The system validates the credentials
4. The system verifies the account status, email verification status and applicable organisation status
5. The system applies platform and organisation session policy
6. The system creates an authenticated session
7. The system redirects the user to the appropriate platform area for their user type and context

**Alternative Flows**

- If a remembered session is requested but policy does not permit it, the system creates the permitted regular session instead or requires the user to retry according to the configured policy
- If the user has more than one permitted context, the system directs them to the default or selected context

**Exception Flows**

- If the credentials are invalid, the system displays a generic login error
- If the email address has not been verified, the system denies login and offers the appropriate verification recovery path
- If the account is disabled, the system denies login
- If the user's organisation status prohibits access, the system denies login with a safe access-denied state
- If session creation fails, the user is not authenticated

</details>

### `AUTH-04` Log Out

**TUCBW** An Authenticated User chooses to log out of the current session

**TUCEW** The current authenticated session is revoked and the user returns to a public page

**Related Use Case Diagram:** [Authentication and Account Access](#authentication-and-account-access)

> [!Note]
> This Use Case (`AUTH-04`) is related to User Story **2.2** in [Authentication and Account Management](users-and-user-stories.md#2-authentication-and-account-management) and Functional Requirement **R1.3** in [Authentication and Account Access](functional-requirements.md#r1-authentication-and-account-access).

<details> <summary><strong>View more details about AUTH-04</strong></summary>

**Trigger:** The Authenticated User selects the logout action

**Primary Actor:** Authenticated User

**Supporting Actor:** None

**Preconditions**

- The user is authenticated
- The current session can be identified

**Postconditions**

- The current authenticated session is revoked
- The current refresh token can no longer be used to obtain new access credentials
- The user is returned to a public page

**Main Success Scenario**

1. The Authenticated User selects logout
2. The system identifies the current authenticated session
3. The system revokes the current session and related refresh token access
4. The system clears the client authentication state
5. The system returns the user to a public page

**Alternative Flows**

- If the session was already revoked, the system still clears the client authentication state and returns the user to a public page
- If the user logs out from one device, other active sessions remain unchanged

**Exception Flows**

- If the current session cannot be identified, the system clears local authentication state and treats the user as unauthenticated
- If session revocation cannot be completed, the system does not claim that server-side logout succeeded

</details>

### `AUTH-05` Recover Account Access

**TUCBW** An Account Holder requests password recovery and later submits a valid password reset token with a new password

**TUCEW** The Account Holder's password is changed, existing active sessions are revoked, and a password change notification is sent

**Related Use Case Diagram:** [Authentication and Account Access](#authentication-and-account-access)

> [!Note]
> This Use Case (`AUTH-05`) is related to User Story **2.3** in [Authentication and Account Management](users-and-user-stories.md#2-authentication-and-account-management) and Functional Requirements **R1.4** and **R1.6** in [Authentication and Account Access](functional-requirements.md#r1-authentication-and-account-access).

<details> <summary><strong>View more details about AUTH-05</strong></summary>

**Trigger:** The Account Holder requests password recovery or submits a password reset form with a token

**Primary Actor:** Account Holder

**Supporting Actor:** External Email Delivery Provider

**Preconditions**

- The Account Holder can access the password recovery page
- The account is eligible for password recovery where an account exists
- A valid reset token is required before a new password can be accepted

**Postconditions**

- The account password is updated only after a valid reset token and valid new password are accepted
- Existing active sessions for the account are revoked after a successful password reset
- A password change notification email is sent to the account email address

**Main Success Scenario**

1. The Account Holder submits the email address for password recovery
2. The system returns a safe response without revealing whether the account exists
3. Where an eligible account exists, the system creates a password reset token
4. The system sends a password reset link to the account email address
5. The Account Holder opens the reset link and enters a new password and password confirmation
6. The system validates the token value, purpose, expiry, status and account context
7. The system validates the new password and confirmation
8. The system updates the account password
9. The system marks the reset token as used
10. The system revokes the account's existing active sessions
11. The system sends a password change notification email
12. The system confirms that the password has been changed

**Alternative Flows**

- If no eligible account exists for the submitted email address, the system still returns the same safe recovery-request response
- If the notification email fails after the password is changed, the password reset remains complete and the delivery attempt is recorded
- If the tokenised reset fails safely and a resend is permitted, the system offers the appropriate recovery path

**Exception Flows**

- If the reset token is missing, invalid, expired, revoked, used, or intended for another purpose, the system rejects the password reset
- If the token does not match the intended account context, the system rejects the password reset
- If the new password is invalid or does not match its confirmation, the system rejects the password reset without using the token
- If the password update fails, the token is not marked as used and existing sessions are not revoked as if the reset succeeded

</details>

### `AUTH-06` Resend an Account Access Email

**TUCBW** An eligible user or administrator requests a new verification, recovery, setup, or invitation email

**TUCEW** The eligible account access email is resent or safely acknowledged while obsolete tokens are invalidated or superseded where required

**Related Use Case Diagram:** [Authentication and Account Access](#authentication-and-account-access)

> [!Note]
> This Use Case (`AUTH-06`) is related to User Stories **2.3**, **3.1**, **6.3** and **7.3** in [Users and User Stories](users-and-user-stories.md) and Functional Requirements **R1.5** and **R1.6** in [Authentication and Account Access](functional-requirements.md#r1-authentication-and-account-access).

<details> <summary><strong>View more details about AUTH-06</strong></summary>

**Trigger:** The actor requests that an eligible account access email be sent again

**Primary Actor:** Account Holder, Organisation Administrator, or Platform Administrator

**Supporting Actor:** External Email Delivery Provider

**Preconditions**

- The actor is eligible to request the specific resend action
- The relevant account, invitation, setup, or registration context is eligible for a new email
- Any applicable resend cooldown has elapsed

**Postconditions**

- A new token or delivery attempt is created where the resend is eligible
- Obsolete tokens are invalidated or superseded where required
- The system returns an account-enumeration safe response where the existence of an account must remain private

**Main Success Scenario**

1. The actor requests a new verification, recovery, setup, or invitation email
2. The system verifies that the actor may request the selected resend action
3. The system validates the relevant account, invitation, setup, request, or organisation context
4. The system verifies that the resend cooldown has elapsed
5. The system invalidates or supersedes obsolete tokens where required
6. The system creates the new token or delivery attempt
7. The system sends the account access email
8. The system returns the appropriate safe confirmation

**Alternative Flows**

- If the submitted email address must remain private and no eligible account exists, the system returns the same safe response without sending an email
- If the existing token remains valid and the product policy allows reuse, the system may resend the existing link instead of creating a new token
- If email delivery fails after an eligible resend is recorded, the system records the delivery failure and returns the safe response defined for that resend flow

**Exception Flows**

- If the resend cooldown has not elapsed, the system rejects or delays the resend request according to policy
- If the actor is not authorised for the selected resend context, the system denies the request
- If the related invitation, setup, request, account, or organisation context is no longer eligible, the system rejects the resend without issuing a new active token
- If token creation or superseding fails, the system does not send an email that depends on the failed token state

</details>

## 4.3 Core and Planned Product Use Cases

### `UC-01` View Emails in a Simulated Inbox

**TUCBW** A trainee opens an available simulated-inbox campaign item from an assigned campaign

**TUCEW** The trainee views the selected simulated email safely

**Related Use Case Diagram:** [Trainee Campaign Participation](#trainee-campaign-participation)

> [!Note]
> This Use Case (`UC-01`) is related to User Stories **5.2** and **5.3** in [Training Campaign Participation](users-and-user-stories.md#5-training-campaign-participation), Functional Requirement **R2** in [Trainee Campaign Access](functional-requirements.md#r2-trainee-campaign-access), and Functional Requirement **R3** in [View Emails in a Simulated Inbox](functional-requirements.md#r3-view-emails-in-a-simulated-inbox).

<details> <summary><strong>View more details about UC-01</strong></summary>

**Trigger:** The trainee selects an available simulated inbox campaign item

**Primary Actor:** Trainee

**Preconditions**

- The trainee is authenticated and active
- The campaign and simulated inbox are available to the trainee
- Required preceding campaign items have been completed

**Postconditions**

- The trainee can read the selected simulated email safely
- The email open interaction is recorded where tracking succeeds
- No real mailbox is accessed

**Main Success Scenario**

1. The trainee opens an available simulated inbox campaign item
2. The system validates the trainee's campaign access and prerequisites
3. The system displays the simulated email summaries
4. The trainee selects an email
5. The system displays the controlled email content and records the open interaction
6. The trainee reads the selected simulated email

**Alternative Flows**

- If the inbox is empty, the system displays an empty state
- If the email has been opened before, the system displays it without creating duplicate progress
- After viewing an email, the trainee may return to the simulated inbox or campaign

**Exception Flows**

- If the campaign item or email is not accessible, the system denies access without exposing its content
- If interaction tracking fails after the email loads, the system still allows the trainee to read the email

</details>

### `UC-02` View a Training Document

**TUCBW** A trainee opens an available training document campaign item from an assigned campaign

**TUCEW** The trainee has read th training document and can continue with the campagin

**Related Use Case Diagram:** [Trainee Campaign Participation](#trainee-campaign-participation)

> [!Note]
> This Use Case (`UC-02`) is related to User Stories **5.2** and **5.6** in [Training Campaign Participation](users-and-user-stories.md#5-training-campaign-participation), Functional Requirement **R2** in [Trainee Campaign Access](functional-requirements.md#r2-trainee-campaign-access), and Functional Requirement **R4** in [View a Training Document](functional-requirements.md#r4-view-a-training-document).

<details> <summary><strong>View more details about UC-02</strong></summary>

**Trigger:** The trainee opens an available training document campaign item

**Primary Actor:** Trainee

**Preconditions**

- The trainee is authenticated and active
- The training document belongs to a campaign available to the trainee
- Required preceding campaign items have been completed

**Postconditions**

- The trainee can read the training document
- Viewed or completed progress is recorded where tracking succeeds
- The training document remains unmodified

**Main Success Scenario:**

1. The trainee opens an available training document campaign item
2. The system validates the trainee's campaign access and prerequisites
3. The system resolves and displays the approved document content
4. The system records that the document was viewed
5. The trainee reads the document, and where applicable, marks it as complete
6. The system displays the resulting progress and allows the trainee to continue with the campaign

**Alternative Flows**

- If the document was previously opened, the trainee continues reading it
- If the document was previously completed, the trainee may reread it without duplicating completion

**Exception Flows**

- If the document is missing, locked, or inaccessible, the system displays an unavailable state
- If progress tracking fails, the system preserves document access without recording false completion

</details>

### `UC-03` Complete a Quiz and View Results

**TUCBW** A trainee opens an available quiz campaign item from an assigned campaign

**TUCEW** The trainee recieves and views the results and permitted educational feedback for the submitted quiz

**Use Case Diagram**

**Related Use Case Diagram:** [Trainee Campaign Participation](#trainee-campaign-participation)

> [!Note]
> This Use Case (`UC-03`) is related to User Stories **5.2** and **5.7** in [Training Campaign Participation](users-and-user-stories.md#5-training-campaign-participation), Functional Requirement **R2** in [Trainee Campaign Access](functional-requirements.md#r2-trainee-campaign-access), and Functional Requirement **R5** in [Complete a Quiz and View Results](functional-requirements.md#r5-complete-a-quiz-and-view-results).

<details> <summary><strong>View more details about UC-03</strong></summary>

**Trigger:** The trainee selects an available quiz campagin item

**Primary Actor:** Trainee

**Preconditions**

- The trainee is authenticated and active
- The quiz belongs to a campaign available to the trainee
- Required preceding campaign items have been completed

**Postconditions**

- The submitted answers have been scored and the result has been stored
- The submitted attempt is read only
- The trainee can view the permitted result and educational feedback

**Main Success Scenario**

1. The trainee opens an available quiz campaign item
2. The system validates the trainee's campaign access and prerequisites
3. The system displays questions without correctness information
4. The system starts or resumes the trainee's attempt
5. The trainee answers the questions and submits the attempt
6. The system validates and scores the answers
7. The system stores the submission and displays the result and permitted feedback
8. The trainee returns to the campaign

**Alternative Flows**

- If an in-progress attempt exists, the system resumes it
- If the attempt was submitted previously, the system displays its read only result

**Exception Flows**

- If the required answers are missing or invalid, the system keeps the attempt in progress
- If the attempt belongs to another trainee or is already submitted, the system rejects the mutation
- If the result retrieval fails after submission, the attempt remains submitted and the trainee may retry loading the result

</details>

### `UC-04` Request Organisation Registration

**TUCBW** An Organisation Representative submits an organisation registration request through the public organisation registration page

**TUCEW** The Organisation Representative receives confirmation that the request has been submitted for platform review

**Related Use Case Diagram:** [Organisation Onboarding and Invitations](#organisation-onboarding-and-invitations)

> [!Note]
> This Use Case (`UC-04`) is related to User Story **1.1** in [Organisation Registration](users-and-user-stories.md#1-organisation-registration) and Functional Requirement **R6** in [Request Organisation Registration](functional-requirements.md#r6-request-organisation-registration).

<details> <summary><strong>View more details about UC-04</strong></summary>

**Trigger:** The organisation representative submits the registration request form

**Primary Actor:** Organisation Representative

**Supporting Actor:** External Email Delivery Provider

**Preconditions**

- The Organisation Representative can access the public registration page
- The organisation does not have a conflicting unresovled request
- The representative's email does not conflict with an ineligible platform or organisation account

**Postconditions**

- A pending organisation registration request is stored
- A confirmation email attempt is recorded
- No organisation or administrator account is created yet

**Main Success Scenario**

1. The representative enters the organisation and representative details
2. The system validates the submitted information
3. The system check for conflicting accounts and registration requests
4. The system creates a pending registration request
5. The system sends a submission confirmation email
6. The system confirms to the representative that the request has been submitted and requires platform review

**Alternative Flows**

- If optional information is omitted, the system submits the request using the required information
- If the confirmation email fails, the request remains pending and the delivery failure is recorded

**Exception Flows**

- If required information is invalid, the system identifies the affected fields
- If a conflicting request or account exists, the system rejects the submission with a safe explanation
- If persistence fails, no incomplete request is created

</details>

### `UC-05` Review and Manage Organisation Registrations

**TUCBW** A Platform Administrator opens organisation registration management and selects a registration management action

**TUCEW** The Platform Administrator sees the resulting request, invitation, or organisation status after the selected action is completed

**Related Use Case Diagram:** [Organisation Onboarding and Invitations](#organisation-onboarding-and-invitations)

> [!Note]
> This Use Case (`UC-05`) is related to User Stories **7.1** to **7.3** in [Platform Administration](users-and-user-stories.md#7-platform-administration) and Functional Requirement **R7** in [Review and Manage Organisation Registrations](functional-requirements.md#r7-review-and-manage-organisation-registrations).

<details> <summary><strong>View more details about UC-05</strong></summary>

**Trigger:** The Platform Administrator selects an organisation registration request or registered organisation to manage

**Primary Actor:** Platform Administrator

**Supporting Actor:** External Email Delivery Provider

**Variants**

- View or filter registrations
- Mark a request as contacted
- Approve a request
- Reject a request
- Resend an initial administrator invitation
- View approved organisation details

**Preconditions**

- The platform administrator is authenticated and active
- The selected registration request exists
- The request is eligible for the selected review action

**Postconditions**

- The request reflects the completed review action
- Approval creates an onboarding organisation and initial organisation administrator invitation
- The action and notification outcome are recorded

**Main Success Scenario**

1. The Platform Administrator selects an organisation registration request
2. The system displays the submitted organisation, representative, status and history information
3. The Platform Administrator selects the approval action
4. The system validates that the request remains eligible for approval
5. The Platform Administrator confirms the organisation and initial administrator details
6. The system creates the organisation in an onboarding state and creates the initial administrator invitation
7. The system updates the request, sends the secure setup link, and displays the resulting status

**Alternative Flows**

- **View or filter registrations:** The Platform Administrator searches, filters, sorts, or views registration requests
- **Mark as contacted:** The Platform Administrator records that contact has occurred without approving or rejecting the request
- **Reject registration:** The Platform Administrator supplies a reason and confirms rejection
- **Resend setup invitation:** The Platform Administrator resends an eligible failed or expired invitation
- **View approved organisations:** The Platfmorm Administrator views the permitted surface level organisation details

**Exception Flows**

- If another administrator has already changed the request, the system rejects the stale action
- If approval would create a duplicate organisation or invitation, the system rejects it
- If notification email delivery fails after a valid state change, the new state remains and the failure is recorded

</details>

### `UC-06` Complete First Organisation Administrator Setup

**TUCBW** The invited Initial Organisation Administrator opens the secure setup link received after the organisation is approved

**TUCEW** The Initial Organisation Administrator receives confirmation that the account is active and can proceed to log in and administer the organisation

**Related Use Case Diagram:** [Organisation Onboarding and Invitations](#organisation-onboarding-and-invitations)

> [!Note]
> This Use Case (`UC-06`) is related to User Story **6.1** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration) and Functional Requirement **R8** in [Complete Initial Organisation Administrator Setup](functional-requirements.md#r8-complete-initial-organisation-administrator-setup).

<details> <summary><strong>View more details about UC-06</strong></summary>

**Trigger:** The invited Initial Organisation Administrator opens the secure organisation setup link

**Primary Actor:** Invited Initial Organisation Administrator

**Supporting Actor:** External Email Delivery Provider

**Preconditions**

- The setup token and invitation are valid and unsused
- The organisation is in a compatible onboarding state
- The invited email does not conflict with an ineligible existing account

**Postconditions**

- The Initial Organisation Administrator account and profile are active
- The administrator has received the initial permission set
- The organisation, registration request, and invitation show that onboarding is complete
- The administrator can proceed to log in and manage the organisation

**Main Success Scenario**

1. The invited Initial Organisation Administrator opens the secure setup link
2. The system validates the token, invitation, organisation and email context
3. The system displays the organisation and invited role
4. The administrator completes or confirms their name and password information
5. The system validates the submitted information
6. The system activates the administrator account, assigns the initial permissions, and activates the organisation
7. The system completes the invitation and sends a confirmation email
8. The system confirms that setup is complete and allows the administrator to proceed to login

**Alternative Flows**

- If the user's name information was provided by the invitation, the representative can confirm or update it before completing account setup
- If an eligible replacement setup link is required, the user can follow the resend process

**Exception Flows**

- If the token is invalid, expired, used or revoked, the system blocks setup
- If the organisation is no longer eligible for onboarding, the system leaves all states unchanged
- If setup fails, the system does not create a partial account, permissions or organisation state

</details>

### `UC-07` Accept an Organisation Invitation or Role Change

**TUCBW** An invited Organisation User opens a secure invitation or role change link

**TUCEW** The invited Organisation User receives confirmation that the accepted membership or role change has been applied

**Related Use Case Diagram:** [Organisation Onboarding and Invitations](#organisation-onboarding-and-invitations)

> [!Note]
> This Use Case (`UC-07`) is related to User Stories **4.1** and **4.3** in [Organisation Trainee Membership](users-and-user-stories.md#4-organisation-trainee-membership) and Functional Requirement **R9** in [Accept an Organisation Invitation or Role Change](functional-requirements.md#r9-accept-an-organisation-invitation-or-role-change).

<details> <summary><strong>View more details about UC-07</strong></summary>

**Trigger:** The invited Organisation User opens a secure organisation invitation link

**Primary Actor:** Invited Organisation User

**Supporting Actor:** External Email Delivery Provider

**Variants**

- Accept a new trainee invitation
- Accept an administrator promotion invitation
- Reject a supported invitation

**Preconditions**

- The invitation token is valid and unused
- The organisation is eligible to apply the relevant membership or role change
- The invitation applies to the intended user and email address

**Postconditions**

- A new trainee account and membership have been created, or the existing user's accepted role change has been applied
- The invitation and token are completed consistently
- The user receives confirmation of the completed change

**Main Success Scenario**

1. The user opens the invitation link
2. The system validates the token, invitation, organisation and intended recipient
3. The system displays the organisation, invited role and consequences of acceptance
4. The user completes the required account setup or authenticates as the intended user
5. The user explicitly accepts the invitation
6. The system applies the membership or role change, including the documented account conversion policy where applicable
7. The system sends confirmation and displays the resulting access state

**Alternative Flows**

- **New trainee invitation:** A new Organisation Trainee completes account setup and accepts organisation membership
- **Administrator promotion:** An existing Organisation Trainee authenticates, reviews the effects on trainee access and progress, and accepts the administrator role and permissions
- **Invitation rejection:** The invited user rejects the invitation and the system confirms that their existing access remains unchanged

**Exception Flows**

- If the token is invalid, expired, used or revoked, the system blocks acceptance
- If the user or organisation role conflicts with the invitation, the system rejects the change
- If acceptance fails, the previous role, membership, access, and progress remain unchanged

</details>

### `UC-08` Manage Organisation Trainees

**TUCBW** An Organisation Administrator opens organisation trainee management page and selects a trainee management action

**TUCEW** The Organisation Administrator sees the resulting trainee, membership, or invitation status after the selected action is completed

**Related Use Case Diagram:** [Organisation Membership and Role Administration](#organisation-membership-and-role-administration)

> [!Note]
> This Use Case (`UC-08`) is related to User Stories **6.2** to **6.4** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration) and Functional Requirement **R10** in [Manage Organisation Employees](functional-requirements.md#r10-manage-organisation-employees).

<details> <summary><strong>View more details about UC-08</strong></summary>

**Trigger:** The Organisation Administrator selects a trainee management action

**Primary Actor:** Organisation Administrator

**Supporting Actor:** External Email Delivery Provider

**Variants**

- View trainees
- Invite a trainee
- Resend an invitation
- Revoke an invitation
- Disable a trainee
- Reactivate a trainee

**Preconditions**

- The administrator is authenticated and active
- The administrator and target trainee belong to the same organisation
- The administrator has the permissions required for the selected action

**Postconditions**

- The trainee list, invitation, or membership reflects the completed action
- Requuired sessions are revoked when a trainee is disabled
- The action and notification outcome are recorded

**Main Success Scenario**

1. The Organisation Administrator opens the trainee management page
2. The system displays the organisation's trainees and invitation statuses
3. The administrator selects the invite trainee variant
4. The system validates the email address, organisation scope and invitation eligibility
5. The system creates the invitation and sends a secure invitation link
6. The system displays the resulting invitation status

**Alternative Flows**

- **View trainees:** The Organisation Administrator views trainees and their invitation or membership statuses
- **Resend invitation:** The Organisation Administrator resends an eligible pending invitation
- **Revoke invitation:** The Organisation Administrator revokes an unaccepted invitation
- **Disable trainee:** The Organisation Administrator confirms the disablement of an active trainee
- **Reactivate trainee:** The Organisation Administrator reactivates an eligible disabled trainee

**Exception Flows**

- If the organisation administrator lacks permission, the system blocks the action
- If the email belongs to an ineligible or already active user, the system rejects the invitation
- If the target belongs to another organisation, the system denies access
- If email delivery fails, the invitation remains recorded with a failed delivery state

</details>

### `UC-09` Manage Organisation Administrators and Permissions

**TUCBW** An Organisation Administrator opens organisation administrator management and selects an administrator management action

**TUCEW** The Organisation Administrator sees the resulting administrator, permission, or promotion invitation status

**Related Use Case Diagram:** [Organisation Membership and Role Administration](#organisation-membership-and-role-administration)

> [!Note]
> This Use Case (`UC-09`) is related to User Stories **6.5** to **6.7** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration) and Functional Requirement **R11** in [Manage Organisation Administrators and Permissions](functional-requirements.md#r11-manage-organisation-administrators-and-permissions).

<details> <summary><strong>View more details about UC-09</strong></summary>

**Trigger:** The Organisation Administrator selects an administrator management action

**Primary Actor:** Organisation Administrator

**Supporting Actors:** External Email Delivery Provider

**Variants**

- View administrators and permissions
- Invite a trainee for promotion
- Resend a promotion invitation
- Change permissions
- Remove administrative privileges

**Preconditions**

- The organisation administrator is authenticated and active
- The administrator and target organisation are the same organisation
- The organisation permits the selected action
- The administrator has the permission required for the selected action

**Postconditions**

- The administrator list, promotion invitation or permission state reflects the completed action
- Critical administrator capabilities remain assigned
- The action is recorded in the audit log

**Main Success Scenario**

1. The Organisation Administrator opens organisation administrator management
2. The system displays the organisation's administrators and their permissions
3. The administrator selects the promote trainee variant, an eligible trainee, and the intended permissions
4. The system validates the target, organisation scope, actor permission, and permission dependencies
5. The system creates and sends the administrator promotion invitation
6. The system displays the pending promotion status

**Alternative Flows**

- **View permissions:** The Organisation Administrator views another administrator's assigned permissions
- **Change permissions:** The Organisation Administrator changes another administrator's permissions
- **Resend promotion:** The Organisation Administrator resends an eligible promotion invitation
- **Remove privileges:** The Organisation Administrator confirms the removal of another administrator's privileges

**Exception Flows**

- If the organisation administrator lacks permission, the system blocks the action
- If the target belongs to a different organisation, the system blocks the action
- If the target is not an eligible active trainee or already has an active promotion invitation, the system rejects the invitation
- If a change would remove the final critical administrator capability, the system preserves the previous state

</details>

### `UC-10` Manage Platform Administrators

**TUCBW** A Platform Administrator, Platform Super-Administrator, or invited user initiates the applicable platform administrator management action

**TUCEW** The initiating actor sees the resulting administrator, invitation, or role status after the selected action is completed

**Related Use Case Diagram:** [Platform Administrator Governance](#platform-administrator-governance)

> [!Note]
> This Use Case (`UC-10`) is related to User Stories **8.1** to **8.3** in [Platform Super-Administrator](users-and-user-stories.md#8-platform-super-administrator) and Functional Requirement **R12** in [Manage Insightful Phish Platform Administrators](functional-requirements.md#r12-manage-insightful-phish-platform-administrators).

<details> <summary><strong>View more details about UC-10</strong></summary>

**Trigger:** An applicable actor selects ot responds to a platform administrator management action

**Primary Actors by Variant**

- **Platform Administrator:** View the administrator list
- **Platform Super-Administrator:** Invite, resend, transfer, demote, or revoke
- **Invited User:** Accept or reject an administrator invitation or upgrade

**Supporting Actor:** External Email Delivery Provider

**Variants:**

- View platform administrators
- Invite an administrator
- Accept or reject an invitation
- Resend an invitation
- Transfer the super-administrator role
- Demote or revoke an administrator

**Preconditions**

- The initiating actor is authenticated where the selected variant requires authentication
- Only the Platform Super-Administrator may perform privileged governance actions
- The selected target is eligible for the requested action

**Postconditions**

- The platform administrator list or role state reflects the completed action
- Exactly one active Platform Super-Administrator remains after any role transfer action
- Obsolete privileged sessions are revoked

**Main Success Scenario**

1. The Platform Super-Administrator opens platform administrator management
2. The system displays the platform administrators, roles, statuses, and pending invitations
3. The super-administrator selects the invite variant and enters the target details
4. The system validates the target and determines whether new account setup or account conversion is required
5. The system creates and sends the appropriate invitation
6. The system displays the resulting invitation status

**Alternative Flows**

- **View administrators:** A normal Platform Administrator views the list in read-only mode
- **Accept or reject invitation:** The invited user reviews the invitation and any account conversion consequences before accepting or rejecting it
- **Resend invitation:** The Platform Super-Administrator resends an eligible invitation
- **Transfer super-administrator role:** The Platform Super-Administrator supplies their password and typed confirmation before transferring the role
- **Demote or revoke administrator:** The Platform Super-Administrator confirms the removal or demotion of a normal Platform Administrator

**Exception Flows**

- If a normal platform administrator attempts a restricted action, the system denies it
- If the target account has an incompatible role or organisation relationship, the system blocks the invitation
- If a transfer would not leave exactly one platform super-administrator, the system preserves the existing roles
- If confirmation fails, no role change occurs

</details>

### `UC-11` Manage Organisation Security Settings

**TUCBW** A Organisation Administrator opens the organisation's security settings to view or configure them

**TUCEW** The Organisation Administrator sees the effective security settings or confirmation that permitted changes were saved

**Use Case Diagram**

**Related Use Case Diagram:** [Security and Account Managenent](#security-and-account-management)

<details> <summary><strong>View more details about UC-11</strong></summary>

**Trigger:** An Organisation Administrator opens the organisation's security settings or submits permitted changes

**Primary Actor:** Organisation Administrator

**Variants**

- View effective settings
- Update permitted settings
- Discard unsaved changes

**Preconditions**

- The organisation administrator is authenticated and active, and belongs to the organisation
- The administrator has permission to update settings when using an editing variant

**Postconditions**

- The administrator can view the organisation's effective security settings
- Valid submitted changes are saved and displayed
- Invalid changes leave the previous settings active
- Successfuly changes are recorded in the audit log

**Main Success Scenario**

1. The Organisation Administrator opens the organisation security settings
2. The system displays the saved settings, enforcement, state, and platform limits
3. The administrator changes one or more permitted settings
4. The system validates the values, combinations, organisation scope, and actor permissions
5. The system saves and audits the valid changes
6. The system displays the saved values and explains when they take effect

**Alternative Flows**

- **Read-only viewing:** An Organisation Administrator without editing permissions views the effective settings without changing them
- **Discard changes:** The Organisation Administrator discards unsaved changes and the system restores the saved values
- **Disable enforcement:** An authorised Organisation Administrator disables organisation enforcement so eligible users can use personal preferences

**Exception Flows**

- If a value exceeds platform limits, the system rejects the change
- If settings conflict, the system preserves the previous policy
- If the actor targets another organisation or lacks permissions, the system denies the update

</details>

### `UC-12` Manage Personal Account and Security Settings

**TUCBW** An Authenticated User opens their personal account and security settings

**TUCEW** The Authenticated User sees the resulting account, security, session, or preferences state after the selected action is completed

**Related Use Case Diagram:** [Security and Account Managenent](#security-and-account-management)

> [!Note]
> This Use Case (`UC-12`) is related to User Stories **2.4** to **2.6** in [Authentication and Account Management](users-and-user-stories.md#2-authentication-and-account-management), Functional Requirement **R1** in [Authentication and Account Access](functional-requirements.md#r1-authentication-and-account-access), and Functional Requirement **R14** in [Manage Personal Account and Security Settings](functional-requirements.md#r14-manage-personal-account-and-security-settings).

<details> <summary><strong>View more details about UC-12</strong></summary>

**Trigger:** The Authenticated User selects a personal account or security management action

**Primary Actor:** Authenticated User

**Supporting Actors:** External Email Delivery Provider

**Variants**

- View account information
- Update personal information
- Change email address
- Change password
- View or revoke sessions
- Manage session preferences
- Request eligible account deletion or deactivation

**Preconditions**

- The user is authenticated and active
- The selected setting belongs to the user
- Applicable organisation policies permit the requested change

**Postconditions**

- The selected valid account, security, session or preference change is reflected in the user's account
- Required external notifications have been requested
- Sessions affected by a sensitive change have been revoked
- A completed deletion or deactivation request leaves the account in the applicable final state

**Main Success Scenario**

1. The Authenticated User opens their account and security settings
2. The system displays the user's account information, active sessions, and effective settings
3. The user selects and completes a permitted account management action
4. The system validates the action against the user's credentials and applicable platform and organisation policies
5. The system applies the valid change and any required session or notification consequences
6. The system displays the resulting account or security state

**Alternative Flows**

- **Update personal information:** The user changes their permitted name information
- **Change email address:** The user requests and verifies a new email address
- **Change password:** The user confirms their current password and supplies a valid new password
- **Manage sessions:** The user views and revokes one or more sessions belonging to their account
- **Delete or deactivate account:** An eligible user supplies their password and typed confirmation before requestion deletion or deactivation

**Exception Flows**

- If the current password or submitted information is invalid, the system rejects the change
- If organisation policy controls a setting, the system displays is as read only
- If email verification fails or the new address becomes unavailable, the current email remains active
- If the user targets another user's session, the system denies the action
- If the user is ineligible for self service deletion or deactivation, the system rejects the request and leaves the account active

</details>

### `UC-13` Manage Organisation Lifecycle and Access

**TUCBW** A Platform Administrator opens organisation lifecycle management to review or change an organisation's access state

**TUCEW** The Platform Administrator sees the resulting organisation lifecycle state and affected users receive the appropriate access behaviour

<details> <summary><strong>View more details about UC-13</strong></summary>

**Brief Description:** A Platform Administrator reviews active organisations and manages post-onboarding lifecycle actions such as suspension and reactivation.

**Primary Actor:** Platform Administrator

**Supporting Actor:** None

**Preconditions**

- The Platform Administrator is authenticated and authorised to manage platform-level organisation access
- The organisation has completed onboarding or otherwise exists as an approved organisation
- The selected lifecycle action is valid for the organisation's current state

**Postconditions**

- The organisation lifecycle state reflects the approved action
- Organisation users are granted or denied access according to the resulting organisation state
- The lifecycle action is recorded for accountability

**Related Functional Requirements:** [**R15**](functional-requirements.md#r15-manage-organisation-lifecycle-and-access)

**Related User Stories:** **7.4** in [Platform Administration](users-and-user-stories.md#7-platform-administration)

**Related Use Case Diagram:** [Platform Administrator Governance](#platform-administrator-governance)

</details>

### `UC-14` Manage Organisation Trainee Tags

**TUCBW** An Organisation Administrator opens trainee tag management for their organisation

**TUCEW** The Organisation Administrator sees the updated tag or tag membership state for the organisation

<details> <summary><strong>View more details about UC-14</strong></summary>

**Brief Description:** An Organisation Administrator creates, updates, archives, and assigns trainee tags to support grouping for campaign assignment and reporting.

**Primary Actor:** Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The Organisation Administrator is authenticated and belongs to the organisation
- The administrator has permission to manage trainee tags
- The selected trainees and tags belong to the same organisation

**Postconditions**

- Tag records or tag memberships reflect the permitted changes
- Duplicate active tag names are prevented within the organisation
- Tag changes are available for campaign assignment and reporting where applicable

**Related Functional Requirements:** [**R16**](functional-requirements.md#r16-manage-organisation-trainee-tags)

**Related User Stories:** **6.10** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** [Organisation Membership and Role Administration](#organisation-membership-and-role-administration)

</details>

### `UC-15` Manage Organisation Context

**TUCBW** An Organisation Administrator opens the organisation context settings

**TUCEW** The Organisation Administrator sees the approved context values or confirmation that permitted changes have been saved

<details> <summary><strong>View more details about UC-15</strong></summary>

**Brief Description:** An Organisation Administrator manages approved organisation context such as terminology, domains, and branding values used to present organisation-specific training.

**Primary Actor:** Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The Organisation Administrator is authenticated and belongs to the organisation
- The administrator has permission to manage organisation context
- Editable values are within the organisation's approved scope

**Postconditions**

- Valid context updates are saved for the organisation
- Invalid or unsafe context values are rejected
- Organisation-specific presentation can use the approved context where applicable

**Related Functional Requirements:** [**R17**](functional-requirements.md#r17-manage-organisation-context)

**Related User Stories:** **6.9** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-16` Manage Premade Campaigns

**TUCBW** A Platform Administrator opens premade campaign management and selects a campaign management action

**TUCEW** The Platform Administrator sees the updated premade campaign state and its availability for eligible users

<details> <summary><strong>View more details about UC-16</strong></summary>

**Brief Description:** A Platform Administrator creates, edits, publishes, unpublishes, or archives premade campaigns available for platform-level training use.

**Primary Actor:** Platform Administrator

**Supporting Actor:** None

**Preconditions**

- The Platform Administrator is authenticated and authorised to manage premade campaigns
- Required campaign details and content are available for the selected action
- The selected campaign state allows the requested change

**Postconditions**

- The premade campaign is created, updated, published, unpublished, archived, or left unchanged according to validation
- Published campaigns are discoverable by eligible individual trainees
- Existing enrolments and progress are preserved when a campaign is unpublished

**Related Functional Requirements:** [**R18**](functional-requirements.md#r18-manage-premade-campaigns)

**Related User Stories:** **7.5** and **7.6** in [Platform Administration](users-and-user-stories.md#7-platform-administration)

**Related Use Case Diagram:** [Platform Administrator Governance](#platform-administrator-governance)

</details>

### `UC-17` Manage Organisation Campaigns

**TUCBW** An Organisation Administrator opens organisation campaign management and selects a campaign action

**TUCEW** The Organisation Administrator sees the resulting organisation campaign state

<details> <summary><strong>View more details about UC-17</strong></summary>

**Brief Description:** An Organisation Administrator creates and manages campaigns belonging to their organisation.

**Primary Actor:** Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The Organisation Administrator is authenticated and belongs to the organisation
- The administrator has permission to manage organisation campaigns
- The selected campaign belongs to the organisation or can be created within it

**Postconditions**

- Valid campaign changes are saved within the organisation
- Invalid campaign dates, statuses, or item ordering are rejected
- Assigned campaign history is protected when campaign state changes

**Related Functional Requirements:** [**R19**](functional-requirements.md#r19-manage-organisation-campaigns)

**Related User Stories:** **6.11** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-18` Manage Training Documents

**TUCBW** An authorised administrator opens reusable training document management

**TUCEW** The administrator sees the resulting document state and can use approved documents in eligible campaigns

<details> <summary><strong>View more details about UC-18</strong></summary>

**Brief Description:** An authorised administrator creates and manages reusable training documents for use in campaigns.

**Primary Actor:** Platform Administrator or Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The administrator is authenticated and authorised to manage reusable campaign content
- Required document title, summary and content are provided for saving
- Organisation-owned content is scoped to the administrator's organisation

**Postconditions**

- Valid training document changes are saved
- Invalid or unsafe document content is rejected
- Published document history is preserved where a campaign already uses the document

**Related Functional Requirements:** [**R20**](functional-requirements.md#r20-manage-reusable-campaign-content)

**Related User Stories:** **6.12** and **7.5** in [Users and User Stories](users-and-user-stories.md)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-19` Manage Quizzes

**TUCBW** An authorised administrator opens reusable quiz management

**TUCEW** The administrator sees the resulting quiz state and can use approved quizzes in eligible campaigns

<details> <summary><strong>View more details about UC-19</strong></summary>

**Brief Description:** An authorised administrator creates and manages reusable quizzes, questions, answer options, marking rules, and feedback.

**Primary Actor:** Platform Administrator or Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The administrator is authenticated and authorised to manage reusable campaign content
- Required quiz details, questions, answer options and marking rules are provided
- Organisation-owned content is scoped to the administrator's organisation

**Postconditions**

- Valid quiz changes are saved
- Unsupported question structures are rejected
- Correctness information remains hidden from trainees until permitted by the quiz flow

**Related Functional Requirements:** [**R20**](functional-requirements.md#r20-manage-reusable-campaign-content)

**Related User Stories:** **6.12** and **7.5** in [Users and User Stories](users-and-user-stories.md)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-20` Manage Simulated Inboxes and Emails

**TUCBW** An authorised administrator opens simulated inbox or simulated email content management

**TUCEW** The administrator sees the resulting simulated inbox or email state and can use approved content in eligible campaigns

<details> <summary><strong>View more details about UC-20</strong></summary>

**Brief Description:** An authorised administrator creates and manages controlled simulated inboxes and simulated emails used in training campaigns.

**Primary Actor:** Platform Administrator or Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The administrator is authenticated and authorised to manage reusable campaign content
- Simulated sender, subject, body and interaction content are valid and safe
- Organisation-owned content is scoped to the administrator's organisation

**Postconditions**

- Valid simulated inbox and email content changes are saved
- Unsafe simulated content is rejected
- Simulated email content is clearly treated as controlled training material

**Related Functional Requirements:** [**R20**](functional-requirements.md#r20-manage-reusable-campaign-content)

**Related User Stories:** **6.12** and **7.5** in [Users and User Stories](users-and-user-stories.md)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-21` Generate and Review Draft Training Content with AI Assistance

**TUCBW** An authorised administrator requests AI-assisted draft content for an approved training purpose

**TUCEW** The administrator receives draft content that is clearly marked for human review before any publication or campaign use

<details> <summary><strong>View more details about UC-21</strong></summary>

**Brief Description:** An authorised administrator uses AI assistance to draft training content, which remains draft content until reviewed and approved by a human administrator.

**Primary Actor:** Platform Administrator or Organisation Administrator

**Supporting Actor:** AI Content Generation Provider

**Preconditions**

- The administrator is authenticated and authorised to use AI-assisted drafting
- The feature is available for the selected content type
- The prompt context is valid and does not request unsafe or unauthorised content

**Postconditions**

- Generated content is stored or presented as draft content only
- A human administrator must review, edit and approve the draft before publication
- Unsafe drafting requests are rejected or blocked

**Related Functional Requirements:** [**R21**](functional-requirements.md#r21-use-ai-assisted-drafting-for-training-content)

**Related User Stories:** **6.17** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-22` Browse Published Premade Campaigns

**TUCBW** An Individual Trainee opens the premade campaign discovery area

**TUCEW** The Individual Trainee sees published premade campaigns and their enrolment availability

<details> <summary><strong>View more details about UC-22</strong></summary>

**Brief Description:** An Individual Trainee browses published premade campaigns that are available for self-enrolment.

**Primary Actor:** Individual Trainee

**Supporting Actor:** None

**Preconditions**

- The Individual Trainee is authenticated and active
- Published premade campaigns are available for discovery
- Unpublished or unavailable campaigns are hidden

**Postconditions**

- The trainee can review available campaign summaries
- No enrolment is created until the trainee selects an enrolment action
- Safe empty or unavailable states are shown where no campaigns can be displayed

**Related Functional Requirements:** [**R22**](functional-requirements.md#r22-discover-and-self-enrol-in-premade-campaigns)

**Related User Stories:** **3.2** in [Individual Trainee Access](users-and-user-stories.md#3-individual-trainee-access)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-23` Self-enrol in Premade Campaigns

**TUCBW** An Individual Trainee selects an available premade campaign for self-enrolment

**TUCEW** The selected campaign becomes available in the trainee's campaign list

<details> <summary><strong>View more details about UC-23</strong></summary>

**Brief Description:** An Individual Trainee enrols in an available premade campaign so it appears in their training campaign list.

**Primary Actor:** Individual Trainee

**Supporting Actor:** None

**Preconditions**

- The Individual Trainee is authenticated and active
- The premade campaign is published and available for self-enrolment
- The trainee does not already have a duplicate active enrolment in the same campaign

**Postconditions**

- A valid self-enrolment is created for the trainee
- The campaign appears in the trainee's available campaigns
- Duplicate or ineligible enrolments are prevented

**Related Functional Requirements:** [**R22**](functional-requirements.md#r22-discover-and-self-enrol-in-premade-campaigns)

**Related User Stories:** **3.3** in [Individual Trainee Access](users-and-user-stories.md#3-individual-trainee-access)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-24` View Available Training Campaigns

**TUCBW** A trainee opens their campaign list

**TUCEW** The trainee sees available campaigns, their progress state and whether campaign items can be started

<details> <summary><strong>View more details about UC-24</strong></summary>

**Brief Description:** A trainee views the campaigns currently available to them, including assigned organisation campaigns and self-enrolled campaigns where applicable.

**Primary Actor:** Trainee

**Supporting Actor:** None

**Preconditions**

- The trainee is authenticated and active
- The trainee has access to individual or organisation-linked training campaigns
- Any organisation access restrictions have been applied

**Postconditions**

- The campaign list reflects the trainee's permitted campaign scope
- Locked, unavailable, empty and error states are shown safely
- No campaign progress changes until the trainee starts or resumes a campaign item

**Related Functional Requirements:** [**R2**](functional-requirements.md#r2-trainee-campaign-access)

**Related User Stories:** **4.2** and **5.1** in [Users and User Stories](users-and-user-stories.md)

**Related Use Case Diagram:** [Trainee Campaign Participation](#trainee-campaign-participation)

</details>

### `UC-25` Reset a Self-Enrolled Campaign

**TUCBW** An Individual Trainee selects reset for a self-enrolled campaign

**TUCEW** The selected campaign progress is reset for that trainee while unrelated progress remains unchanged

<details> <summary><strong>View more details about UC-25</strong></summary>

**Brief Description:** An Individual Trainee resets progress for a selected self-enrolled premade campaign.

**Primary Actor:** Individual Trainee

**Supporting Actor:** None

**Preconditions**

- The Individual Trainee is authenticated and active
- The campaign is self-enrolled by the trainee
- The trainee confirms the reset action

**Postconditions**

- Progress for the selected self-enrolled campaign is reset for the trainee
- Unrelated campaigns and unrelated users are not affected
- Required historical or audit information is preserved

**Related Functional Requirements:** [**R22**](functional-requirements.md#r22-discover-and-self-enrol-in-premade-campaigns)

**Related User Stories:** **3.4** in [Individual Trainee Access](users-and-user-stories.md#3-individual-trainee-access)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-26` Assign Campaigns to Organisation Trainees

**TUCBW** An Organisation Administrator selects a campaign and trainee scope for assignment

**TUCEW** Eligible trainees receive the campaign assignment and the administrator sees the assignment outcome

<details> <summary><strong>View more details about UC-26</strong></summary>

**Brief Description:** An Organisation Administrator assigns campaigns to selected trainees or eligible trainee groups within their organisation.

**Primary Actor:** Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The Organisation Administrator is authenticated and belongs to the organisation
- The administrator has permission to assign campaigns
- The selected campaign and trainee scope are valid for the organisation

**Postconditions**

- Eligible trainees in the selected scope receive the campaign assignment
- Disabled or ineligible trainees are skipped or rejected according to the assignment rules
- Duplicate active assignments are prevented

**Related Functional Requirements:** [**R23**](functional-requirements.md#r23-assign-campaigns-to-organisation-trainees)

**Related User Stories:** **6.13** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-27` Reset Organisation Campaign Progress

**TUCBW** An Organisation Administrator selects a campaign progress reset action and confirms the affected trainee scope

**TUCEW** The selected progress is reset and unrelated campaign or trainee progress remains unchanged

<details> <summary><strong>View more details about UC-27</strong></summary>

**Brief Description:** An Organisation Administrator resets progress for an explicitly selected organisation campaign and trainee scope.

**Primary Actor:** Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The Organisation Administrator is authenticated and belongs to the organisation
- The administrator has permission to reset organisation campaign progress
- The selected campaign and trainee scope belong to the organisation

**Postconditions**

- Only the selected campaign progress for the selected trainee scope is reset
- Unrelated campaign progress and unrelated trainees are not affected
- The reset outcome is recorded and displayed to the administrator

**Related Functional Requirements:** [**R24**](functional-requirements.md#r24-reset-organisation-campaign-progress)

**Related User Stories:** **6.14** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-28` Classify a Simulated Email

**TUCBW** A trainee opens an accessible simulated email classification activity

**TUCEW** The trainee's classification is recorded and the trainee receives feedback where the campaign permits it

<details> <summary><strong>View more details about UC-28</strong></summary>

**Brief Description:** A trainee classifies an accessible simulated email as safe or suspicious and receives permitted educational feedback.

**Primary Actor:** Trainee

**Supporting Actor:** None

**Preconditions**

- The trainee is authenticated and active
- The simulated email belongs to a campaign available to the trainee
- The campaign rules permit classification

**Postconditions**

- The trainee's classification and time of classification are recorded
- Feedback is displayed where available and permitted
- Duplicate final classification is prevented where the campaign rules allow only one attempt

**Related Functional Requirements:** [**R25**](functional-requirements.md#r25-classify-and-interact-with-simulated-email-threats)

**Related User Stories:** **5.4** in [Training Campaign Participation](users-and-user-stories.md#5-training-campaign-participation)

**Related Use Case Diagram:** [Trainee Campaign Participation](#trainee-campaign-participation)

</details>

### `UC-29` Interact with a Simulated Email Threat

**TUCBW** A trainee selects or submits a controlled simulated threat interaction

**TUCEW** The interaction remains inside the training environment and supported outcomes are recorded for feedback or reporting

<details> <summary><strong>View more details about UC-29</strong></summary>

**Brief Description:** A trainee interacts with controlled simulated links, attachments, or forms within a training campaign without contacting real malicious systems.

**Primary Actor:** Trainee

**Supporting Actor:** None

**Preconditions**

- The trainee is authenticated and active
- The simulated interaction belongs to a campaign available to the trainee
- The interaction is part of approved controlled training content

**Postconditions**

- The supported simulated interaction is recorded where applicable
- Real credentials, personal information, or messages are not sent to external systems
- The trainee receives the permitted safety response or educational feedback

**Related Functional Requirements:** [**R25**](functional-requirements.md#r25-classify-and-interact-with-simulated-email-threats)

**Related User Stories:** **5.5** in [Training Campaign Participation](users-and-user-stories.md#5-training-campaign-participation)

**Related Use Case Diagram:** [Trainee Campaign Participation](#trainee-campaign-participation)

</details>

### `UC-30` View Personal Campaign Progress and Results

**TUCBW** A trainee opens personal campaign progress or results

**TUCEW** The trainee sees their own permitted progress, results and feedback

<details> <summary><strong>View more details about UC-30</strong></summary>

**Brief Description:** A trainee views their own campaign progress, scores, activity and educational feedback.

**Primary Actor:** Trainee

**Supporting Actor:** None

**Preconditions**

- The trainee is authenticated and active
- The trainee has campaign progress or result records available, or an empty state can be shown
- The requested progress belongs to the trainee

**Postconditions**

- The trainee views only their own progress and results
- Safe empty or unavailable states are shown when progress data is not available
- No other trainee's personal results are exposed

**Related Functional Requirements:** [**R26**](functional-requirements.md#r26-view-progress-results-and-training-reports)

**Related User Stories:** **5.8** in [Training Campaign Participation](users-and-user-stories.md#5-training-campaign-participation)

**Related Use Case Diagram:** [Trainee Campaign Participation](#trainee-campaign-participation)

</details>

### `UC-31` View Organisation Training Reports

**TUCBW** An Organisation Administrator opens organisation training reports and selects a report scope

**TUCEW** The Organisation Administrator sees training report information for the permitted organisation scope

<details> <summary><strong>View more details about UC-31</strong></summary>

**Brief Description:** An Organisation Administrator reviews progress, completion, score and risk indicators for campaigns and trainees within their organisation.

**Primary Actor:** Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The Organisation Administrator is authenticated and belongs to the organisation
- The administrator has permission to view the selected report information
- Report filters and selected campaign or trainee scopes belong to the organisation

**Postconditions**

- The report displays data only for the permitted organisation scope
- Personal trainee detail is shown only where the administrator has the required permission
- Export is available only where permitted by role and organisation policy

**Related Functional Requirements:** [**R26**](functional-requirements.md#r26-view-progress-results-and-training-reports)

**Related User Stories:** **6.15** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

### `UC-32` Review Organisation Audit History

**TUCBW** An Organisation Administrator opens organisation audit history

**TUCEW** The Organisation Administrator sees audit records for their organisation according to their permission scope

<details> <summary><strong>View more details about UC-32</strong></summary>

**Brief Description:** An Organisation Administrator reviews audit history for accountable organisation-level changes.

**Primary Actor:** Organisation Administrator

**Supporting Actor:** None

**Preconditions**

- The Organisation Administrator is authenticated and belongs to the organisation
- The administrator has permission to review organisation audit history
- Audit records exist for the organisation or an empty state can be shown

**Postconditions**

- Audit records are displayed only for the administrator's organisation
- The audit view uses safe summary information
- Sensitive values such as passwords, raw tokens and unnecessary request data are not exposed

**Related Functional Requirements:** [**R27**](functional-requirements.md#r27-review-audit-and-platform-oversight-information)

**Related User Stories:** **6.16** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** [Security and Account Management](#security-and-account-management)

</details>

### `UC-33` View Platform Usage and Lifecycle Overview

**TUCBW** A Platform Administrator opens the platform overview dashboard

**TUCEW** The Platform Administrator sees platform-level indicators without unnecessary organisation or trainee personal detail

<details> <summary><strong>View more details about UC-33</strong></summary>

**Brief Description:** A Platform Administrator reviews aggregated platform usage, onboarding, lifecycle and security overview information.

**Primary Actor:** Platform Administrator

**Supporting Actor:** None

**Preconditions**

- The Platform Administrator is authenticated and authorised to view platform overview information
- Platform overview data is available, or safe empty and unavailable states can be shown
- Aggregation rules protect unnecessary personal detail

**Postconditions**

- Platform usage, onboarding, lifecycle and security indicators are displayed at an appropriate summary level
- Organisation or trainee details are not exposed beyond what the platform role requires
- The overview supports operational monitoring and governance decisions

**Related Functional Requirements:** [**R27**](functional-requirements.md#r27-review-audit-and-platform-oversight-information)

**Related User Stories:** **7.7** in [Platform Administration](users-and-user-stories.md#7-platform-administration)

**Related Use Case Diagram:** [Platform Administrator Governance](#platform-administrator-governance)

</details>

### `UC-34` Review Platform Audit and Security Events

**TUCBW** A Platform Administrator opens platform audit or security event review

**TUCEW** The Platform Administrator sees safe platform-level audit information for investigation and governance

<details> <summary><strong>View more details about UC-34</strong></summary>

**Brief Description:** A Platform Administrator reviews platform-level audit and security events for privileged actions and suspicious activity.

**Primary Actor:** Platform Administrator

**Supporting Actor:** None

**Preconditions**

- The Platform Administrator is authenticated and authorised to review platform audit and security events
- Audit or security records exist, or a safe empty state can be shown
- Filters or selected scopes are valid for platform-level review

**Postconditions**

- Platform audit and security events are displayed with safe summary information
- Passwords, raw tokens, token hashes and unnecessary sensitive request data are not exposed
- Relevant records can be filtered for investigation

**Related Functional Requirements:** [**R27**](functional-requirements.md#r27-review-audit-and-platform-oversight-information)

**Related User Stories:** **7.8** in [Platform Administration](users-and-user-stories.md#7-platform-administration)

**Related Use Case Diagram:** [Platform Administrator Governance](#platform-administrator-governance)

</details>

### `UC-35` Configure and Launch Ethical Real Email Simulation Campaigns

**TUCBW** An Organisation Administrator configures or launches a real email simulation campaign

**TUCEW** The campaign is launched, paused, stopped, or blocked according to approved scope and safety safeguards

<details> <summary><strong>View more details about UC-35</strong></summary>

**Brief Description:** An Organisation Administrator configures and launches real email simulation campaigns only within an approved ethical and organisational scope.

**Primary Actor:** Organisation Administrator

**Supporting Actor:** External Email Delivery Provider

**Preconditions**

- The Organisation Administrator is authenticated and belongs to the organisation
- The organisation has explicitly approved the required real email simulation scope
- The selected sending identity, domain, campaign purpose and target scope are valid

**Postconditions**

- Eligible real email simulation delivery actions are applied only within the approved organisation scope
- Unsafe or unauthorised delivery is blocked
- Delivery and interaction outcomes are preserved at an appropriate training and audit level

**Related Functional Requirements:** [**R28**](functional-requirements.md#r28-configure-ethical-real-email-simulation-campaigns)

**Related User Stories:** **6.11** and **6.13** in [Organisation Administration](users-and-user-stories.md#6-organisation-administration)

**Related Use Case Diagram:** Not shown in the current grouped diagrams

</details>

---

Previous section: [Functional Requirements](functional-requirements.md)

Next section: [Quality Requirements](quality-requirements.md)
