# Use Cases

### SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- **[4. Use Cases](#4-use-cases)** &larr; _You are here_
- [5. Quality Requirements](quality-requirements.md)
- [6. Domain Model](domain-model.md)

---

# 4. Use Cases

The following use cases describe how users interact with the Insightful Phish system to achieve specific goals, including the main successful interactions and relevant flows.

## `UC-01` View Emails in a Simulated Inbox

**TUCBW** A trainee opens an available simulated-inbox campaign item from an assigned campaign.

**TUCEW** The trainee views a selected simulated email or returns to the campaign

**Use Case Diagram**

![UC-01: View Emails in a Simulated Inbox]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-01`) is related to [User Stories 5.2 and 5.3](), [Functional Requirements **R2**]() and [Functional Requirements **R3**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-01</strong></summary>

**Trigger:** The trainee selects an available simulated inbox campagin item

**Primary Actor:** Trainee

**Preconditions**

- The trainee is authenticated and active
- The campaign and simulated inbox are available to the trainee
- Required preceding campaign items have been completed

**Postconditions**

- The selected simulated email is displayed safely
- The email open interaction is recorded where tracking succeeds
- No real mailbox is accessed

**Main Success Scenario**

1. The trainee opens an available simulated inbox campaign item
2. The system validates the trainee's campaign access and prerequisites
3. The system displays the simulated email simmaries
4. The trainee selects an email
5. The system displays the controlled email content and records the open interaction
6. The trainee returns to the inbox or campaign

**Alternative Flows**

- If the inbox is empty, the system display an empty state
- If the email has been opened before, the system displays it without creating duplicate progress

**Exception Flows**

- If the campaign item or email is not accessible, the system denies access without exposing its content
- If interaction tracking fails after the email loads, the system still allows the trainee to read the email

</details>

## `UC-02` View a Training Document

**TUCBW** A trainee opens an available training document campaign items from an assigned campaign

**TUCEW** The trainee reads or completes the training document and returns to the campaign

**Use Case Diagram**

![UC-02 View a Training Document]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-02`) is related to [User Stories 5.2 and 5.6](), [Functional Requirements **R2**]() and [Functional Requirements **R4**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-02</strong></summary>

**Trigger:** The trainee opens an available training document campagin item

**Primary Actor:** Trainee

**Preconditions**

- The trainee is authenticated and active
- The training document belongs to a campaign available to the trainee
- Required preceding campaign items have been completed

**Postconditions**

- The trainee can read the training document
- Viewed or completed progress is recorded where tracking succeeds
- The document remains unmodified

**Main Success Scenario:**

1. The trainee opens an available training document campaign item
2. The system validates the trainee's campaign access and prerequisites
3. The system resolves and displays the approved document content
4. The system records that the document was viewed
5. The trainee reads and marks the document as complete
6. The trainee returns to the campaign

**Alternative Flows**

- If the document was previously opened, the trainee continues reading it
- If the document was previously completed, the trainee may reread it without duplicating completion

**Exception Flows**

- If the document is missing, locked, or inaccessible the system displays an unavailable state
- If progress tracking fails, the system preserves document access without recording false completion

</details>

## `UC-03` Complete a Quiz and View Results

**TUCBW** A trainee opens an available quiz campaign item from an assigned campaign

**TUCEW** The trainee submits the quiz and views the results and educational feedback

**Use Case Diagram**

![UC-03 Complete a Quiz and View Results]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-03`) is related to [User Stories 5.2 and 5.7](), [Functional Requirements **R2**]() and [Functional Requirements **R5**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-03</strong></summary>

**Trigger:** The trainee selects an available quiz campagin item

**Primary Actor:** Trainee

**Preconditions**

- The trainee is authenticated and active
- The quiz belongs to a campaign available to the trainee
- Required preceding campaign items have been completed

**Postconditions**

- The submitted answers are calculated by the server and the result is stored
- The submitted attempt is read only
- Permitted results and feedback are available to the trainee

**Main Success Scenario**

1. The trainee opens an available quiz campaign item
2. The system validates the trainee's campaign access and prerequisites
3. The system displays questions without correctness information
4. The system starts or resumes the trainee's attempt
5. The trainee andswers the questions and submits the attempt
6. The system validates and scores the answers
7. The system stores the submittion and displays the result and feedback
8. The trainee returns to the campaign

**Alternative Flows**

- If an in-progress attempt exists, the system resumes it
- If the attempt was submitted previously, the system displays its read only result

**Exception Flows**

- If the required answers are missing or invalid, the system keeps the attempt in progress
- If the attempt belongs to another trainee or is already submitted, the system rejects the mutation
- If the result retrieval fails after submission, the attempt remains submitted and the trainee may retry loading the result

</details>

## `UC-04` Request Organisation Registration

**TUCBW** An organisation representative submits an organisation registration request on the public organisation registration page

**TUCEW** The organisation representative acknowledges that the request has been submitted for platform review

**Use Case Diagram**

![UC-04 Request Organisation Registration]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-04`) is related to [User Storie 1.1]() and [Functional Requirements **R6**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-04</strong></summary>

**Trigger:** The organisation representative submits the registration request form

**Primary Actor:** Organisation representative

**Supporting Actor:** Email service

**Preconditions**

- The representative can access the public registration page
- The organisation does not have a conflicting unresovled request
- The representative's email does not conflict with another account

**Postconditions**

- A pending organisation registration request is stored
- A confirmation email attempt is recorded
- No organisation or administrator account is created yet

**Main Success Scenario**

1. The representative enters the organisation and representative details
2. The system validates the submitted information
3. The system check for conflicting accounts and requests
4. The system creates a pending registration request
5. The system sends a submission confirmation email
6. The system shows that platform review is required

**Alternative Flows**

- If optional information is omitted, the system submits the request using the required information
- If the confirmation email fails, the request remains pending and the delivery failure is recorded

**Exception Flows**

- If required information is invalid, the system identifies the affected fields
- If a conflicting request or account exists, the system rejects the submission with a safe explanation
- If persistence fails, no incomplete request is created

</details>

## `UC-05` Review and Approve an Organisation Registration Request

**TUCBW** A platform administrator opens the organisation registration management page and selects a registration request

**TUCEW** The platform administrator acknowledges that the selected review action has been completed

**Use Case Diagram**

![UC-05 Review and Approve an Organisation Registration Request]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-05`) is related to [User Stories 7.1 to 7.3]() and [Functional Requirements **R7**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-05</strong></summary>

**Trigger:** The platform administrator seleects an organisation registration request to review

**Primary Actor:** Platform administrator

**Supporting Actor:** Email service

**Preconditions**

- The platform administrator is authenticated and active
- The selected registration request exist
- The request is eligible for the selected review action

**Postconditions**

- The request reflects the completed review action
- Approval creates an onboarding organisation and initial organisation administrator invitation
- The action and notification outcome are recorded

**Main Success Scenario**

1. The platform administrator views and selects an organisation registration request
2. The system displays the submitted organisation and representative details
3. The platform administrator approves the trquest
4. The system validates that the request is still eligible
5. The system cretes the organisation in an onboarding state and create the initial organisation administrator invitation
6. The system updates the request and sends the secure invitation setup link
7. The system records the action and displays the resulting status

**Alternative Flows**

- The administrator marks the request as contacted without approving or rejecting it
- The administrator rejects the request and provides a rejection reason
- The administrtor resends an eligible failed or expired setup invitation
- The administrator searches, filters or views an approved organisation's surface-level details

**Exception Flows**

- If another administrator has already changed the request, the system rejects the stale action
- If approval would create a duplicate organisation or invitation, the system rejects it
- If notification email delivery fails after a valid state change, the new state remains and the failure is recorded

</details>

## `UC-06` Complete First Organisation Administrator Setup

**TUCBW** The invited initial organisation administrator opens the setup link sent to their email after their organisation has been approved

**TUCEW** The initial organisation administrator acknowledges that their organisation administrator account setup has been completed

**Use Case Diagram**

![UC-06 Complete First Organisation Administrator Setup]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-06`) is related to [User Storie6.1]() and [Functional Requirements **R8**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-06</strong></summary>

**Trigger:** The invited representative opens the organisation initial administrator setup link

**Primary Actor:** Initial Organisation Administrator

**Supporting Actor:** Email service

**Preconditions**

- The setup token and invitation are valid and unsused
- The organisation is in a compatible onboarding state
- The invited email does not conflict with another account

**Postconditions**

- The initial organisation administrator account and profile is active
- The administrator receives the initial permission set
- The organisation, request and invitation states show that onboarding has been completed

**Main Success Scenario**

1. The invited organisation representative opens the setup link in their email inbox
2. The system validates the token, invitation, organisation and email context
3. The system displays the organisation and invited role
4. The representative completes their name and password information
5. The system validates the submitted information
6. The system activates the initial organisation administrator account and grants permissions to this account, and activates the organisation
7. The system completes the invitation and sends a confirmation email

**Alternative Flows**

- If the user's name information was provided by the invitation, the representative can confirm or update it before completing account setup
- If an eligible replacement setup link is required, the user can follow the resend process

**Exception Flows**

- If the token is invalid, expired, used or revoked, the system blocks setup
- If the organisation is no longer eligible for onboarding, the system leaves all states unchaged
- If setup fails, the system does not create a partial account, permissions or organisation state

</details>

## `UC-07` Accept an Organisation Trainee Invitation

**TUCBW** An invited user opens an organisation invitation link that takes them to the accept invitation page

**TUCEW** The invited user acknowledges that the invitation or role changes has been completed successfully

**Use Case Diagram**

![UC-07 Accept an Organisation Trainee Invitation]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-07`) is related to [User Stories 4.1 and 4.3]() and [Functional Requirements **R9**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-07</strong></summary>

**Trigger:**The invited user opens a secure organisation invitation link

**Primary Actor:** Invited user

**Supporting Actor:** Email service

**Preconditions**

- The setup token and invitation are valid and unsused
- The organisation can accept the revelant membership or role change
- The invitation applies to the intended user and email address

**Postconditions**

- A new trainee account and membership is created, or the existing user's accepted role change is applied (depending on type of invitation)
- The invitation and token are completed consistently
- The user receives confirmation of the completed change

**Main Success Scenario**

1. The user opens the invitation link
2. The system validates the token, invitation, organisation and intended recipient
3. The system displays the organisation, invited role and consequences of acceptance
4. The user completes and required account setup, or completes authentication
5. The user explicitly accepts the invitation
6. The system applies the membership or role change atomically
7. The system sends confirmation and displays the resulting access state

**Alternative Flows**

- A new organisation trainee completes account setup to accept organisation membership
- An existing organisation trainee authenticates and accepts a promotion ro be an organisation administrator
- The invited user rejects or ignores the invitation, leaving their existing access unchanged

**Exception Flows**

- If the token is invalid, expired, used or revoked, the system blocks acceptance
- If the user or organisation role conflicts with the invitation, the system rejects the change
- If acceptance fails, the previous role, membership and progress remain unchanged

</details>

## `UC-08` Manage Organisation Employees

**TUCBW** An organisation administrator opens the organisation employee management page

**TUCEW** The organisation administrator acknowledges that the selected employee management action has completed

**Use Case Diagram**

![UC-08 Manage Organisation Employees]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-08`) is related to [User Stories 6.2 to 6.4]() and [Functional Requirements **R10**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-08</strong></summary>

**Trigger:** The organisation administrator selects an employee management actions

**Primary Actor:** Organisation administrator wuth the required employee management permission

**Supporting Actor:** Email service

**Preconditions**

- The administrator is authenticated and active
- The administrator and target organisation are the same organisatiob
- The administrator has the permissions required for the selected action

**Postconditions**

- The trainee list, invitation or membership reflects the completed action
- Requuired sessions are revoked after an account is disabled
- The action and notification ourcome are recorded

**Main Success Scenario**

1. The organisation administrator opens the employee management page
2. The system displays the organisation's trainees and invitation statusses
3. The administrator chooses to invite a trainee
4. The system validates the email, organisation scope and invitation eligibility
5. The system creates the invitation and sends a secure invitation link
6. The system records the action and displays the invitation status

**Alternative Flows**

- The organisation administrator resends an eligible pending invitation
- The organisation administrator recokes an unaccepted invitation
- The organisation administrator disabled an active trainee, after confirmation
- The organisation administrator reactivates an eligible disabled trainee

**Exception Flows**

- If the organisation administrator lacks permission, the system blocks the action
- If the email belongs to an ineligible or already active user, the system rejects the invitation
- If the target belongs to another organisation, the system denies access
- If email delivery fails, the invitation remains recorded with a failed delivery state

</details>

## `UC-09` Manage Organisation Administrators and Permissions

**TUCBW** An organisation administrator manages organisation administrators and permissions on the organisation administrator management page

**TUCEW** The organisation administrator acknowledges that the selected organisation administrator management action has completed successfully

**Use Case Diagram**

![UC-09 Manage Organisation Administrators and Permissions]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-09`) is related to [User Stories 6.5 to 6.7]() and [Functional Requirements **R11**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-09</strong></summary>

**Trigger:** The organisation administrator selects an administrator management action

**Primary Actor:** Organisation administrator with the required administrator management permission

**Supporting Actor:** Email service

**Preconditions**

- The organisation administrator is authenticated and active
- The administrator and target organisation are the same organisation
- The organisation permits the selected action
- The administrator has the permission required for the action

**Postconditions**

- The administrator list, promotion invitation or permission state reflects the completed action
- Critical administrator capabilities remain assigned
- The action is recorded in the audit log

**Main Success Scenario**

1. The organisation administrator opens the organisation administrator management page
2. The system displays the organisation's administrators and permissions
3. The organisation administrator selects an active trainee for promotion and chooses initial permissions for this trainee
4. The system validates the target, organisation scope and permission dependencies
5. The system creates and sends a promotion invitation via email
6. The system records the action and displays the pending promotion

**Alternative Flows**

- The organisation administrator views another administrator's permissions
- The organisation administrator changes another organisation administrator's permissions
- The organisation administrator resends an eligible role upgrade promotion invitation
- The organisation administrator removes another organisation administrator's privileges after confirmation

**Exception Flows**

- If the organisation administrator lacks permission, the system blocks the action
- If the target belongs to a different organisation, the system blocks the action
- If the target is not an eligible active trainee or already has an active promotion the system reject the invitation
- If a change would remove the final critical administrator capability, the system preserves the previous state

</details>

## `UC-10` Manage Insightful Phish Administrators

**TUCBW** A platform administrator opens the Insightful Phish administrator management page

**TUCEW** The platform administrator acknowledges that the selected platform administrator action has completed

**Use Case Diagram**

![UC-10 Manage Insightful Phish Administrators]() <!-- TODO insert appropriate link -->

> [!Note]
> This Use Case (`UC-10`) is related to [User Stories 8.1 to 8.3]() and [Functional Requirements **R12**](). <!-- TODO insert appropriate links -->

<details> <summary><strong>View more details about UC-10</strong></summary>

**Trigger:** A platform administrator selects a platfrom administrator management action

**Primary Actor:** Platform administrator (or Platform super-administrator)

**Supporting Actor:** Email service

**Preconditions**

- The platform administrator is authenticated and is an active administrator
- Mutating actions are performed only by the platform super-administrator
- The selected target is eligible for the requested action

**Postconditions**

- The platform administrator list or role state reflects the completed action
- Exactly one active platform super-administrator remains
- Obsolete privileged sessions are revoked

**Main Success Scenario**

1. The platform administrator opens the platform administrator manangement page
2. The system displays platform administrators, roles and statuses
3. The platform super-administrator selects the invite action and enters the target details
4. The system validates the target and determines whether setup or account conversion is required
5. The system creates and sends the appropriate invitation
6. The system records the action and displays the invitation status

**Alternative Flows**

- A nofmral platform administrator views the list without the ability to make changes
- The platform super-administrator resends an eligible invitation
- The platform super-administrator transfers the super-administrator role after they entered their password and a typed confirmation
- The platform super-administrator demotes or revokes a normal platform administrator after confirmation

**Exception Flows**

- If a normal platform administrator attempts a restricted action, the system denies it
- If the target account has an incompatible role or organisation relationship, the system blocks the invitation
- If a transfer would not leave exactly one platform super-administrator, the system preserves the existing roles
- If confirmation fails, no role change occurs

</details>
