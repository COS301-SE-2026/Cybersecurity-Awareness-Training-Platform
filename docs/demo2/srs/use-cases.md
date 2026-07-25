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
