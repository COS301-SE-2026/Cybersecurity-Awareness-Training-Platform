# Demo 1 QA and Testing Plan

## Purpose

This document collects the Sprint 1 Demo 1 QA/testing plan for the three core use cases and required base features.

The purpose of this plan is to align implementation work with what must be demonstrated and verified during Demo 1. It supports later automated testing, manual demo readiness, and traceability between the SRS, design, API contracts, and future test coverage.

## Testing Scope (Zoë)

### UC-01: View Emails in Simulated Inbox

Covers the learner/employee viewing a simulated inbox, seeing simulated email summaries, opening a simulated email, and reviewing the email detail content.

### UC-02: View Training Document

Covers the learner/employee opening training content, reading a training document, and navigating through the training material needed for Demo 1.

### UC-03: Complete Quiz Flow

Covers the learner/employee opening a quiz, answering questions, submitting the quiz, and viewing the submission/result state.

### Base Feature: Login/Register

Covers the basic authentication screens needed to access the Demo 1 learner flow.

### Base Feature: Themes

Covers the agreed visual theme baseline and consistency across Demo 1 screens.

### Base Feature: General Form Validation

Covers common validation behaviour for login, registration, quiz submission, and other Demo 1 forms.

## UC-01 Test Planning: Simulated Inbox (Zoë)

### Success Scenarios

- The authenticated learner/employee can open the simulated inbox.
- The inbox displays a list of simulated email summaries.
- Each simulated email summary shows key information such as sender, subject, preview text, and received date/time where available.
- The user can select an email from the inbox list.
- The selected email opens in a detail view.
- The email detail view displays the simulated email content clearly.
- The user can navigate back from the email detail view to the inbox.
- The inbox and email detail screens use the agreed Demo 1 layout and theme styling.

### Negative and Error Scenarios

- The inbox contains no simulated emails.
- Simulated inbox data is still loading.
- Simulated inbox data fails to load.
- A selected email cannot be found.
- A selected email detail request fails.
- The user attempts to access the inbox without being authenticated.
- Email summary data is incomplete or missing optional fields.
- Email detail content is unavailable or malformed.
- The inbox page must not imply that real emails are being sent or received.

### Suggested Automated Test Level

- Frontend tests for inbox rendering, states, and user interaction.
- Backend integration tests for simulated inbox and email detail endpoints.
- End-to-end tests for the complete inbox-to-detail demo path.
- Manual verification for demo readiness, readability, and seeded data quality.

### Suggested Automated Test Coverage

Future automated tests should cover:

- Rendering the simulated inbox with seeded email data.
- Rendering the inbox empty state.
- Rendering the inbox loading state.
- Rendering the inbox error state.
- Opening an email detail view from the inbox list.
- Displaying the correct selected email detail content.
- Returning from email detail to inbox.
- Handling a missing or invalid email ID.
- Rejecting unauthenticated access where required.
- Confirming that simulated inbox behaviour does not depend on real email delivery.

### Manual Demo Verification Notes

Before Demo 1, manually verify that:

- Demo email data is seeded and visible.
- The inbox page is readable on the target demo screen size.
- Email summaries are clear enough for reviewers to understand the simulated inbox.
- The email detail page clearly shows the selected email content.
- Navigation between inbox and detail is smooth.
- Loading, empty, and error states do not break the demo.
- The screen wording makes it clear that the inbox is simulated.

## UC-02 Test Planning: Training Document View (Zoë)

### Success Scenarios

- The authenticated learner/employee can open the training area.
- The system displays available Demo 1 training material.
- The user can open a training document.
- The training document displays a clear title and readable body content.
- The user can navigate through or return from the training document as expected.
- The user can continue from training material toward the quiz flow where applicable.
- The training material screen uses the agreed Demo 1 layout and theme styling.

### Negative and Error Scenarios

- No training documents are available.
- Training content is still loading.
- Training content fails to load.
- The selected training document cannot be found.
- Training document content is incomplete.
- The user attempts to access training material without being authenticated.
- Long training content causes layout or readability issues.
- Training material accidentally introduces future features outside Demo 1 scope.

### Suggested Automated Test Level

- Frontend tests for training list/document rendering and screen states.
- Backend integration tests for training content endpoints.
- End-to-end tests for opening and reading a training document.
- Manual verification for content readability and demo flow alignment.

### Suggested Automated Test Coverage

Future automated tests should cover:

- Rendering available training material.
- Opening a selected training document.
- Displaying the correct training document title and content.
- Rendering loading, empty, and error states.
- Handling an invalid or missing training document ID.
- Rejecting unauthenticated access where required.
- Verifying navigation from training material to quiz entry point where applicable.
- Confirming that the training document flow does not require adaptive learning or gamification.

### Manual Demo Verification Notes

Before Demo 1, manually verify that:

- Demo training content is seeded and stable.
- The training material is readable and relevant to the quiz flow.
- The training screen layout matches the documented design baseline.
- Navigation into and out of the training document is clear.
- The flow does not imply advanced adaptive learning, reporting, or gamified progression.
- The training document supports the Demo 1 learner journey without expanding scope.

## UC-03 Test Planning: Quiz Flow (Zoë)

### Success Scenarios

- The authenticated learner/employee can open the quiz page.
- The quiz page displays questions and available answer options.
- The user can select answers.
- The user can submit the quiz once required answers are provided.
- The system shows a clear submission/loading state where applicable.
- The system displays quiz results or completion feedback.
- The user can understand that the quiz flow has been completed.
- The quiz flow uses the agreed Demo 1 layout and theme styling.

### Negative and Error Scenarios

- Quiz data is still loading.
- Quiz data fails to load.
- The quiz has no available questions.
- The user attempts to submit without answering required questions.
- The user submits invalid answer data.
- Quiz submission fails.
- Quiz result data cannot be loaded.
- The user attempts to access the quiz without being authenticated.
- The quiz flow accidentally introduces advanced scoring, gamification, or adaptive learning behaviour.

### Suggested Automated Test Level

- Unit tests for quiz validation and scoring helpers where applicable.
- Frontend tests for question rendering, answer selection, validation, submission state, and result state.
- Backend integration tests for quiz retrieval and submission endpoints.
- End-to-end tests for the complete training-to-quiz-to-results flow.
- Manual verification for demo readiness and understandable quiz feedback.

### Suggested Automated Test Coverage

Future automated tests should cover:

- Rendering quiz questions and answer options.
- Selecting and changing answers.
- Preventing submission when required questions are unanswered.
- Submitting valid quiz answers.
- Showing submission/loading state.
- Showing quiz results or completion feedback.
- Handling quiz load failure.
- Handling quiz submission failure.
- Rejecting invalid submission payloads.
- Rejecting unauthenticated access where required.
- Confirming the quiz flow stays within Demo 1 scope.

### Manual Demo Verification Notes

Before Demo 1, manually verify that:

- Demo quiz questions are seeded and stable.
- Answer selection is clear.
- Validation messages are understandable.
- Submission state is visible.
- Results or completion feedback is clear.
- The quiz can be completed reliably during the demo.
- The quiz flow does not imply advanced reporting, adaptive learning, or gamification.

## Base Feature Test Planning (Zoë)

### Login/Register

#### Success Scenarios

- A new user can register with valid information where registration is included in the Demo 1 flow.
- An existing user can log in with valid credentials.
- Successful login redirects the user to the appropriate Demo 1 learner area.
- Authenticated users can access the simulated inbox, training material, and quiz flow.
- Authentication state is handled consistently during navigation.

#### Negative and Error Scenarios

- Required fields are missing.
- Invalid field formats are entered.
- Password confirmation does not match where applicable.
- Login credentials are incorrect.
- Registration details are already in use.
- Authentication request fails.
- Unauthenticated users attempt to access protected Demo 1 pages.

#### Suggested Test Levels

- Unit tests for validation helpers where applicable.
- Frontend tests for login/register forms and validation states.
- Backend integration tests for authentication endpoints.
- End-to-end tests for login and protected-page access.

#### Suggested Automated Test Coverage

Future automated tests should cover:

- Rendering login form.
- Rendering registration form where applicable.
- Validating required login/register fields.
- Displaying field-level validation messages.
- Displaying backend authentication errors.
- Successful login using seeded demo credentials.
- Successful registration where applicable.
- Rejecting invalid login/register requests.
- Redirecting authenticated users to the Demo 1 learner area.
- Blocking or redirecting unauthenticated users from protected Demo 1 screens.

#### Manual Demo Verification Notes

Before Demo 1, manually verify that:

- Demo credentials are available and safe to use.
- Login works reliably before the demo.
- Register works only if it is part of the planned demo flow.
- Authentication errors are understandable.
- Auth screens follow the agreed visual design baseline.
- Authentication does not block the main Demo 1 learner journey.

### Themes

#### Success Scenarios

- Demo 1 screens use the agreed theme baseline.
- Theme styling is consistent across login/register, dashboard, inbox, training, quiz, feedback, and result screens.
- Text, buttons, cards, and form elements remain readable.
- Theme behaviour does not interfere with navigation or form use.
- The UI follows the agreed Demo 1 design and brand guidance.

#### Negative and Error Scenarios

- Theme styles fail to apply.
- Colours are inconsistent with the agreed design baseline.
- Text contrast is poor.
- Theme state is not preserved where persistence is expected.
- Theme changes cause layout issues.
- A screen introduces a separate or conflicting colour palette.

#### Suggested Test Levels

- Unit tests for theme utilities or theme state where applicable.
- Frontend tests for theme rendering and theme toggle behaviour where implemented.
- Manual verification for visual consistency and readability.

#### Suggested Automated Test Coverage

Future automated tests should cover:

- Rendering key Demo 1 screens with the default theme.
- Verifying theme provider or theme wrapper renders child content correctly.
- Verifying theme toggle or selection behaviour where implemented.
- Verifying persisted theme behaviour where implemented.
- Confirming major Demo 1 screens do not crash due to missing theme context.

#### Manual Demo Verification Notes

Before Demo 1, manually verify that:

- Demo 1 screens follow the documented design baseline.
- No screen introduces a new colour palette.
- Text remains readable on the target demo display.
- Buttons and forms are visually consistent.
- Theme support remains a base feature and does not become a separate Demo 1 use case.

### General Form Validation

#### Success Scenarios

- Required fields show validation when missing.
- Invalid field formats are rejected.
- Valid input allows the user to continue.
- Validation messages are clear and user-facing.
- Validation works consistently across login, register, and quiz forms.
- Backend validation errors are displayed clearly where applicable.

#### Negative and Error Scenarios

- Required fields are empty.
- Invalid email or username formats are entered where applicable.
- Password fields are invalid or mismatched where applicable.
- Quiz questions requiring answers are left unanswered.
- Invalid form payloads are submitted.
- Backend validation errors are returned.
- A user submits the same form repeatedly while a request is in progress.

#### Suggested Test Levels

- Unit tests for reusable validation helpers.
- Frontend tests for validation messages and invalid form states.
- Backend integration tests for server-side request validation.
- End-to-end coverage through login/register and quiz submission flows.

#### Suggested Automated Test Coverage

Future automated tests should cover:

- Required field validation.
- Invalid format validation.
- Password confirmation validation where applicable.
- Quiz required-answer validation.
- Clearing validation messages after correction.
- Preventing invalid form submission.
- Displaying backend validation errors.
- Disabling or safely handling repeated submissions while loading.

#### Manual Demo Verification Notes

Before Demo 1, manually verify that:

- Login/register validation is clear.
- Quiz validation prevents incomplete submission.
- Validation messages are understandable and not overly technical.
- Forms recover correctly after invalid input is corrected.
- Validation supports the Demo 1 flow without creating extra requirements.

## Suggested Test Levels

### Unit

Unit tests should be used for isolated logic that can be verified without the full application running.

Examples:

- Form validation helpers.
- Quiz answer validation.
- Quiz scoring helpers where applicable.
- Theme state utilities where applicable.
- Request/response mapping helpers where applicable.

Unit tests should stay focused and should not duplicate full user flows.

### Integration

Integration tests should verify that connected parts of the system work together correctly.

Examples:

- Backend route and service interaction.
- API request validation.
- API response shape checks.
- Authentication checks on protected routes.
- Data retrieval for simulated inbox, training material, and quiz content.

Integration tests should be used where simple unit tests cannot verify the behaviour properly.

### Frontend

Frontend tests should verify that UI screens render correctly and respond to user interaction.

Examples:

- Login/register form rendering.
- Simulated inbox list rendering.
- Simulated email detail rendering.
- Training document rendering.
- Quiz question rendering.
- Form validation messages.
- Loading, empty, error, and submission states.
- Theme rendering across key screens.

Frontend tests should support confidence that the user-visible Demo 1 flow behaves correctly.

### Backend

Backend tests should verify API behaviour, validation, authentication requirements, and error responses.

Examples:

- Authentication endpoints.
- Simulated inbox endpoints.
- Training content endpoints.
- Quiz retrieval and submission endpoints.
- Common validation and error response behaviour.

Backend tests should ensure that frontend demo flows receive predictable data and errors.

### End-to-End

End-to-end tests should cover only the most important Demo 1 paths.

Suggested future E2E paths:

- Login and access Demo 1 learner area.
- Open simulated inbox and view simulated email detail.
- Open training material and continue toward quiz.
- Complete quiz and view result/completion feedback.

E2E tests should be limited to high-value demo paths and should not become detailed implementation tickets.

## Traceability References

### SRS Requirements

QA placeholders should be linked to the relevant SRS sections once implementation and test files exist.

Suggested mapping:

| Area | SRS Reference | QA Placeholder Range |
| --- | --- | --- |
| UC-01: View Emails in Simulated Inbox | `docs/demo1/SRS.md` UC-01 section | `QA-UC01-01` to `QA-UC01-05` |
| UC-02: View Training Document | `docs/demo1/SRS.md` UC-02 section | `QA-UC02-01` to `QA-UC02-05` |
| UC-03: Complete Quiz Flow | `docs/demo1/SRS.md` UC-03 section | `QA-UC03-01` to `QA-UC03-05` |
| Login/Register | `docs/demo1/SRS.md` base features section | `QA-AUTH-01` to `QA-AUTH-05` |
| Themes | `docs/demo1/SRS.md` base features section | `QA-THEME-01` to `QA-THEME-04` |
| General Form Validation | `docs/demo1/SRS.md` base features section | `QA-VALIDATION-01` to `QA-VALIDATION-05` |

### Traceability Rows

The following rows are placeholders for later integration with actual automated tests. They do not require test files to exist as part of this documentation issue.

| QA ID | Area | Verification Focus | Suggested Future Test Location |
| --- | --- | --- | --- |
| `QA-UC01-01` | UC-01 | Simulated inbox list success path | `apps/frontend/tests/uc01-simulated-inbox` |
| `QA-UC01-02` | UC-01 | Inbox empty, loading, and error states | `apps/frontend/tests/uc01-simulated-inbox` |
| `QA-UC01-03` | UC-01 | Simulated email detail success path | `apps/frontend/tests/uc01-simulated-inbox` |
| `QA-UC01-04` | UC-01 | Missing or invalid email detail handling | `apps/backend/tests/uc01-simulated-inbox` |
| `QA-UC01-05` | UC-01 | Authenticated access to inbox flow | `apps/frontend/tests/e2e/uc01-simulated-inbox` |
| `QA-UC02-01` | UC-02 | Training material list or entry point success path | `apps/frontend/tests/uc02-training-document` |
| `QA-UC02-02` | UC-02 | Training document view success path | `apps/frontend/tests/uc02-training-document` |
| `QA-UC02-03` | UC-02 | Training loading, empty, and error states | `apps/frontend/tests/uc02-training-document` |
| `QA-UC02-04` | UC-02 | Missing or invalid training document handling | `apps/backend/tests/uc02-training-document` |
| `QA-UC02-05` | UC-02 | Training-to-quiz navigation | `apps/frontend/tests/e2e/uc02-training-document` |
| `QA-UC03-01` | UC-03 | Quiz page success path | `apps/frontend/tests/uc03-quiz-flow` |
| `QA-UC03-02` | UC-03 | Answer selection and required validation | `apps/frontend/tests/uc03-quiz-flow` |
| `QA-UC03-03` | UC-03 | Quiz submission success path | `apps/backend/tests/uc03-quiz-flow` |
| `QA-UC03-04` | UC-03 | Quiz loading and error states | `apps/frontend/tests/uc03-quiz-flow` |
| `QA-UC03-05` | UC-03 | Quiz result or completion feedback state | `apps/frontend/tests/e2e/uc03-quiz-flow` |
| `QA-AUTH-01` | Login/Register | Login success path | `apps/frontend/tests/base-auth` |
| `QA-AUTH-02` | Login/Register | Registration success path where applicable | `apps/frontend/tests/base-auth` |
| `QA-AUTH-03` | Login/Register | Login/register validation states | `apps/frontend/tests/base-auth` |
| `QA-AUTH-04` | Login/Register | Authentication error handling | `apps/backend/tests/base-auth` |
| `QA-AUTH-05` | Login/Register | Protected Demo 1 page access | `apps/frontend/tests/e2e/base-auth` |
| `QA-THEME-01` | Themes | Default theme application | `apps/frontend/tests/base-themes` |
| `QA-THEME-02` | Themes | Theme consistency across Demo 1 screens | `apps/frontend/tests/base-themes` |
| `QA-THEME-03` | Themes | Theme toggle or persistence where implemented | `apps/frontend/tests/base-themes` |
| `QA-THEME-04` | Themes | Manual readability and contrast check | Manual demo verification |
| `QA-VALIDATION-01` | General Form Validation | Required field validation | `apps/frontend/tests/base-form-validation` |
| `QA-VALIDATION-02` | General Form Validation | Invalid format validation | `apps/frontend/tests/base-form-validation` |
| `QA-VALIDATION-03` | General Form Validation | Quiz required-answer validation | `apps/frontend/tests/uc03-quiz-flow` |
| `QA-VALIDATION-04` | General Form Validation | Backend validation error display | `apps/backend/tests/base-form-validation` |
| `QA-VALIDATION-05` | General Form Validation | Repeated submission handling | `apps/frontend/tests/base-form-validation` |
