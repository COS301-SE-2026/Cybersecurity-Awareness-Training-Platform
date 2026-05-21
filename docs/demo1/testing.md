# Demo 1 QA and Testing Plan

## Purpose

This document collects the Sprint 1 Demo 1 QA/testing plan for the three core use cases and required base features.

The purpose of this plan is to align implementation work with what must be demonstrated and verified during Demo 1. It supports later automated testing, manual demo readiness, and traceability between the SRS, design, API contracts, and future test coverage.

## Testing Scope

### UC-01: View Emails in Simulated Inbox

Covers the trainee viewing a simulated inbox, seeing simulated email summaries, opening a simulated email, and reviewing the email detail content.

### UC-02: View Training Document

Covers the trainee opening training content, reading a training document, and navigating through the training material needed for Demo 1.

### UC-03: Complete Quiz Flow

Covers the trainee opening a quiz, answering questions, submitting the quiz, and viewing the submission/result state.

### Base Feature: Login/Register

Covers the basic authentication screens needed to access the Demo 1 trainee flow.

### Base Feature: Basic Themes

Covers visual consistency for the Demo 1 screens, including brand colours, typography, spacing, and component styling. This remains a base feature and does not create a separate Demo 1 use case.

### Base Feature: General Form Validation

Covers common validation behaviour for login, registration, quiz submission, and other Demo 1 forms.

## Demo 1 Manual QA Checklist

Use this as the short pre-demo smoke test for the seeded trainee campaign flow.

Route note: trainee entry is `/login`, successful login redirects to `/campaigns`, and the integrated trainee flow uses `/campaigns`, `/training/:campaignItemId`, `/quizzes/:quizId`, `/quiz-attempts/:attemptId/results`, `/trainee/campaign-items/:campaignItemId/simulated-inbox`, and `/trainee/campaign-items/:campaignItemId/simulated-emails/:emailId`.

1. Clean setup/reset/reseed
   - Start the local database with `docker compose up -d`.
   - If the schema is behind, run `pnpm --filter @insightful-phish/backend prisma:migrate:deploy`.
   - Reseed Demo 1 with `DEMO_SEED_PASSWORD="your-local-demo-password" pnpm --filter @insightful-phish/backend seed:demo1`.
   - Confirm the seed summary includes `demo.populated.trainee@example.com` and `demo.empty.trainee@example.com`.

2. Seeded trainee login
   - Sign in at `/login` as `demo.populated.trainee@example.com` using `DEMO_SEED_PASSWORD`.
   - Confirm the app redirects to `/campaigns`.
   - Repeat once with `demo.empty.trainee@example.com` to confirm the empty-state account can still authenticate and also lands on `/campaigns`.

3. Campaign assignment/access
   - In `/campaigns`, confirm the populated trainee sees only the assigned Demo 1 campaigns: `Demo 1 Phishing Awareness` and `Demo 1 Password Security`.
   - Confirm the active but unassigned `Demo 1 Advanced Phishing Defenses` campaign is not shown to the trainee.
   - Confirm the empty-state trainee sees no assigned campaigns and no content leaked from another trainee.
   - Confirm restricted or unassigned direct-link access fails gracefully instead of opening another trainee's campaign item.

4. Campaign item ordering
   - Open `Demo 1 Phishing Awareness` and confirm the seeded order is `Read phishing warning signs`, `Practice activities`, then within that group `Complete the warning signs check` and `Classify simulated emails`, followed by `Complete the safe link handling check`.
   - Open `Demo 1 Password Security` and confirm the order is `Read password security basics` followed by `Complete the password security check`.
   - Confirm `Complete the password security check` is still visible but `LOCKED`.

5. Training flow
   - From `/campaigns`, open an available training item and confirm the route is `/training/:campaignItemId`.
   - Confirm the title, summary/body, and readable content load, and that `← Back to campaigns` and `Continue` both return to `/campaigns`.
   - Use `Mark as completed` once and confirm the success state appears.
   - If backend markdown content is present, confirm headings, lists, and paragraphs render cleanly.
   - If backend content is missing, confirm the seeded fallback content still renders.

6. Quiz flow
   - From `/campaigns`, open an available quiz and confirm the route is `/quizzes/:quizId`, with the selected campaign item ID used as the route value.
   - Confirm questions load without exposing correct answers or feedback before submission.
   - Try one incomplete submission and confirm a readable validation message appears.
   - Submit one full attempt and confirm redirect to `/quiz-attempts/:attemptId/results`.

7. Quiz results/feedback
   - Confirm the results page shows pass/fail state, score, summary text, and answer-level feedback.
   - Use `Back to quiz` and confirm it returns to `/quizzes/:quizId`.
   - Confirm `Complete the password security check` remains unavailable while seeded as `LOCKED`.

8. Simulation inbox/email/classification
   - From `/campaigns`, open `Classify simulated emails` and confirm the route is `/trainee/campaign-items/:campaignItemId/simulated-inbox`.
   - Verify the inbox wording clearly states the content is simulated and the seeded messages load.
   - Open an email detail view and confirm the route is `/trainee/campaign-items/:campaignItemId/simulated-emails/:emailId`, with usable sender, subject, body/preview, and back navigation to the inbox.
   - If this build exposes classification controls, submit at least one classification and confirm the feedback is understandable. If not, note that classification submission is not exposed in the current frontend build.

9. Fallback and failure handling
   - Verify missing seed data or no assignments are handled cleanly by using the empty-state trainee.
   - Confirm campaign, training, quiz, result, inbox, and email-detail load failures show a readable error or retry state instead of a blank page.
   - Confirm unavailable items stay visibly unavailable and cannot be opened silently.

10. Sensitive interaction data

- During quiz and simulated email interactions, confirm no plain-text password or other sensitive credential value is echoed back to the trainee, logged in the UI, or intentionally persisted in visible request payloads if such an input is exercised.

11. Browser/device rehearsal

- Rehearse once in the target demo desktop browser.
- Recheck `/login`, `/campaigns`, one training route, one quiz route, one quiz results route, and one simulated inbox/email route on a narrow mobile-sized viewport.
- Record any overflow, clipped labels, or unreadable content before the demo.

12. Pass/fail notes
    - Date/build/tester:
    - Passed:
    - Failed:
    - Follow-up owners:
    - Route mismatches observed:

## UC-01 Test Planning: Simulated Inbox

### Success Scenarios

- The authenticated trainee can open the simulated inbox.
- The inbox displays a list of simulated email summaries.
- Each simulated email summary shows key information such as sender, subject, preview text, and received date/time where available.
- The trainee can select an email from the inbox list.
- The selected email opens in a detail view.
- The email detail view displays the simulated email content clearly.
- The trainee can navigate back from the email detail view to the inbox.
- The inbox and email detail screens use the agreed Demo 1 layout and visual styling.

### Negative and Error Scenarios

- The inbox contains no simulated emails.
- Simulated inbox data is still loading.
- Simulated inbox data fails to load.
- A selected email cannot be found.
- A selected email detail request fails.
- The trainee attempts to access the inbox without being authenticated.
- Email summary data is incomplete or missing optional fields.
- Email detail content is unavailable or malformed.
- The inbox page must not imply that real emails are being sent or received.

### Suggested Automated Test Level

- Frontend tests for inbox rendering, states, and trainee interaction.
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

## UC-02 Test Planning: Training Document View

### Success Scenarios

- The authenticated trainee can open the training area.
- The system displays available Demo 1 training material.
- The trainee can open a training document.
- The training document displays a clear title and readable body content.
- The trainee can navigate through or return from the training document as expected.
- The trainee can continue from training material toward the quiz flow where applicable.
- The training material screen uses the agreed Demo 1 layout and visual styling.

### Negative and Error Scenarios

- No training documents are available.
- Training content is still loading.
- Training content fails to load.
- The selected training document cannot be found.
- Training document content is incomplete.
- The trainee attempts to access training material without being authenticated.
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
- The training document supports the Demo 1 trainee journey without expanding scope.

## UC-03 Test Planning: Quiz Flow

### Success Scenarios

- The authenticated trainee can open the quiz page.
- The quiz page displays questions and available answer options.
- The trainee can select answers.
- The trainee can submit the quiz once required answers are provided.
- The system shows a clear submission/loading state where applicable.
- The system displays quiz results or completion feedback.
- The trainee can understand that the quiz flow has been completed.
- The quiz flow uses the agreed Demo 1 layout and visual styling.

### Negative and Error Scenarios

- Quiz data is still loading.
- Quiz data fails to load.
- The quiz has no available questions.
- The trainee attempts to submit without answering required questions.
- The trainee submits invalid answer data.
- Quiz submission fails.
- Quiz result data cannot be loaded.
- The trainee attempts to access the quiz without being authenticated.
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

## Base Feature Test Planning

### Login/Register

#### Success Scenarios

- A new trainee can register with valid information where registration is included in the Demo 1 flow.
- An existing trainee can log in with valid credentials.
- Successful login redirects the trainee to the appropriate Demo 1 trainee area.
- Authenticated trainees can access the simulated inbox, training material, and quiz flow.
- Authentication state is handled consistently during navigation.

#### Negative and Error Scenarios

- Required fields are missing.
- Invalid field formats are entered.
- Password confirmation does not match where applicable.
- Login credentials are incorrect.
- Registration details are already in use.
- Authentication request fails.
- Unauthenticated trainees attempt to access protected Demo 1 pages.

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
- Redirecting authenticated trainees to the Demo 1 trainee area.
- Blocking or redirecting unauthenticated trainees from protected Demo 1 screens.

#### Manual Demo Verification Notes

Before Demo 1, manually verify that:

- Demo credentials are available and safe to use.
- Login works reliably before the demo.
- Register works only if it is part of the planned demo flow.
- Authentication errors are understandable.
- Auth screens follow the agreed visual design baseline.
- Authentication does not block the main Demo 1 trainee journey.

### Basic Themes

#### Success Scenarios

- Demo 1 screens use the agreed brand colour palette consistently.
- Typography hierarchy is readable and consistent across authentication, inbox, training, quiz, and feedback screens.
- Buttons, cards, form fields, validation messages, and navigation elements follow the shared component styling direction.
- Visual styling supports the trainee flow without introducing unrelated production theming behaviour.

#### Negative and Error Scenarios

- A Demo 1 screen uses inconsistent colours, typography, or spacing.
- Feedback or validation states are styled in a way that reduces readability.
- Theme styling suggests unsupported runtime theme switching or unrelated production brand features.

#### Suggested Test Levels

- Frontend visual/component checks for shared UI styling.
- Manual review against [DESIGN.md](./DESIGN.md) brand and component guidance.

#### Suggested Automated Test Coverage

Future automated tests should cover:

- Rendering shared buttons, fields, cards, and feedback states with expected class names or design tokens where available.
- Confirming visible text remains readable against the selected background colours.
- Checking that core Demo 1 screens use the shared component styling consistently.

#### Manual Demo Verification Notes

Before Demo 1, manually verify that:

- Login/register, simulated inbox, training document, quiz, and results screens look visually consistent.
- Theme choices do not make validation, loading, success, warning, or error states hard to read.
- Basic theme work remains supporting UI polish and is not presented as a separate Demo 1 use case.

### General Form Validation

#### Success Scenarios

- Required fields show validation when missing.
- Invalid field formats are rejected.
- Valid input allows the trainee to continue.
- Validation messages are clear and trainee-facing.
- Validation works consistently across login, register, and quiz forms.
- Backend validation errors are displayed clearly where applicable.

#### Negative and Error Scenarios

- Required fields are empty.
- Invalid email or username formats are entered where applicable.
- Password fields are invalid or mismatched where applicable.
- Quiz questions requiring answers are left unanswered.
- Invalid form payloads are submitted.
- Backend validation errors are returned.
- A trainee submits the same form repeatedly while a request is in progress.

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
- Request/response mapping helpers where applicable.

Unit tests should stay focused and should not duplicate full trainee flows.

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

Frontend tests should verify that UI screens render correctly and respond to trainee interaction.

Examples:

- Login/register form rendering.
- Simulated inbox list rendering.
- Simulated email detail rendering.
- Training document rendering.
- Quiz question rendering.
- Form validation messages.
- Loading, empty, error, and submission states.

Frontend tests should support confidence that the trainee-visible Demo 1 flow behaves correctly.

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

- Login and access Demo 1 trainee area.
- Open simulated inbox and view simulated email detail.
- Open training material and continue toward quiz.
- Complete quiz and view result/completion feedback.

E2E tests should be limited to high-value demo paths and should not become detailed implementation tickets.

### Test Coverage

Test coverage is tracked to ensure critical demo paths and logic are verified.

- **Tools**: Vitest with the `v8` coverage provider.
- **Local Command**: `pnpm test:coverage`.
- **CI Integration**: Coverage is generated in the CI `tests` job and uploaded as artifacts (`coverage-backend` and `coverage-frontend`).
- **Reporting**: Reports include `text`, `html`, `lcov`, and `json-summary`.

> [!NOTE]
> During the Demo 1 sprint, coverage thresholds are not strictly enforced to avoid blocking implementation work. Coverage is used as a quality signal rather than a hard gate.

## Technical Requirements and Constraints Reference

The following constraints from [architecture.md](./architecture.md) directly affect what QA must verify for Demo 1. They are listed here to ensure testing planning remains aligned with the agreed architectural boundaries.

### Simulated Inbox Safety

- QA must confirm that no real email is sent or received during any test run or demo execution.
- QA must verify that simulated phishing links route only to internal frontend routes (e.g., `/phishing-feedback`) and do not point to real external URLs.
- QA must verify that the inbox screen clearly labels the environment as simulated.

### Training Document Content

- QA must verify that training content is correctly seeded, loads reliably, and is relevant to the phishing awareness theme.
- QA must verify that training and quiz content are made available through the relevant campaign items where applicable.
- QA must confirm that no adaptive learning, gamification, or progress scoring behaviour appears in the Demo 1 training flow.

### Quiz Attempts and Results

- QA must verify that duplicate quiz submissions are rejected with a `409 Conflict` response.
- QA must verify that quiz scores are calculated server-side and that the frontend only displays the returned result.
- QA must verify that question-level feedback is returned and rendered in plain, educational language.
- QA must confirm that quiz results are persistently stored and retrievable after submission.

### Data Privacy

- QA must confirm that no plain-text passwords appear in API responses or application logs.
- QA must verify that interaction events (e.g., `SIMULATED_EMAIL_OPENED`, `SIMULATED_EMAIL_LINK_CLICKED`) store only event type, timestamp, and linked entity IDs — no typed input, message content, or credential data.
- QA must confirm that no sensitive data is captured or stored during simulated phishing interactions.

### Scope Boundary Verification

- QA must confirm that only UC-01, UC-02, and UC-03 screens and required/supporting endpoints are reachable and functional for Demo 1.
- QA must verify that base features (login, registration, form validation) function correctly but are not presented or counted as core use cases.
- QA must confirm that trainee campaign-access endpoints may exist for content delivery, but admin campaign management endpoints, admin campaign builder screens, and reporting dashboards are not presented as Demo 1 requirements.

> [!NOTE]
> Full technical requirements and constraint definitions are in [architecture.md](./architecture.md) under the **Quality Requirements** and **System Constraints and Standards** sections. This section references those constraints for QA alignment only and does not duplicate them.

## Traceability References

### SRS Requirements

QA placeholders should be linked to the relevant SRS sections once implementation and test files exist.

Suggested mapping:

| Area                                  | SRS Reference                            | QA Placeholder Range                     |
| ------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| UC-01: View Emails in Simulated Inbox | [SRS.md](./SRS.md) UC-01 section         | `QA-UC01-01` to `QA-UC01-05`             |
| UC-02: View Training Document         | [SRS.md](./SRS.md) UC-02 section         | `QA-UC02-01` to `QA-UC02-05`             |
| UC-03: Complete Quiz Flow             | [SRS.md](./SRS.md) UC-03 section         | `QA-UC03-01` to `QA-UC03-05`             |
| Login/Register                        | [SRS.md](./SRS.md) base features section | `QA-AUTH-01` to `QA-AUTH-05`             |
| Basic Themes                          | [SRS.md](./SRS.md) base features section | `QA-THEME-01` to `QA-THEME-03`           |
| General Form Validation               | [SRS.md](./SRS.md) base features section | `QA-VALIDATION-01` to `QA-VALIDATION-05` |

### Traceability Rows

The following rows are placeholders for later integration with actual automated tests. They do not require test files to exist as part of this documentation issue.

| QA ID              | Area                    | Verification Focus                                 | Suggested Future Test Location                   |
| ------------------ | ----------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `QA-UC01-01`       | UC-01                   | Simulated inbox list success path                  | `apps/frontend/tests/uc01-simulated-inbox`       |
| `QA-UC01-02`       | UC-01                   | Inbox empty, loading, and error states             | `apps/frontend/tests/uc01-simulated-inbox`       |
| `QA-UC01-03`       | UC-01                   | Simulated email detail success path                | `apps/frontend/tests/uc01-simulated-inbox`       |
| `QA-UC01-04`       | UC-01                   | Missing or invalid email detail handling           | `apps/backend/tests/uc01-simulated-inbox`        |
| `QA-UC01-05`       | UC-01                   | Authenticated access to inbox flow                 | `apps/frontend/tests/e2e/uc01-simulated-inbox`   |
| `QA-UC02-01`       | UC-02                   | Training material list or entry point success path | `apps/frontend/tests/uc02-training-document`     |
| `QA-UC02-02`       | UC-02                   | Training document view success path                | `apps/frontend/tests/uc02-training-document`     |
| `QA-UC02-03`       | UC-02                   | Training loading, empty, and error states          | `apps/frontend/tests/uc02-training-document`     |
| `QA-UC02-04`       | UC-02                   | Missing or invalid training document handling      | `apps/backend/tests/uc02-training-document`      |
| `QA-UC02-05`       | UC-02                   | Training-to-quiz navigation                        | `apps/frontend/tests/e2e/uc02-training-document` |
| `QA-UC03-01`       | UC-03                   | Quiz page success path                             | `apps/frontend/tests/uc03-quiz-flow`             |
| `QA-UC03-02`       | UC-03                   | Answer selection and required validation           | `apps/frontend/tests/uc03-quiz-flow`             |
| `QA-UC03-03`       | UC-03                   | Quiz submission success path                       | `apps/backend/tests/uc03-quiz-flow`              |
| `QA-UC03-04`       | UC-03                   | Quiz loading and error states                      | `apps/frontend/tests/uc03-quiz-flow`             |
| `QA-UC03-05`       | UC-03                   | Quiz result or completion feedback state           | `apps/frontend/tests/e2e/uc03-quiz-flow`         |
| `QA-AUTH-01`       | Login/Register          | Login success path                                 | `apps/frontend/tests/base-auth`                  |
| `QA-AUTH-02`       | Login/Register          | Registration success path where applicable         | `apps/frontend/tests/base-auth`                  |
| `QA-AUTH-03`       | Login/Register          | Login/register validation states                   | `apps/frontend/tests/base-auth`                  |
| `QA-AUTH-04`       | Login/Register          | Authentication error handling                      | `apps/backend/tests/base-auth`                   |
| `QA-AUTH-05`       | Login/Register          | Protected Demo 1 page access                       | `apps/frontend/tests/e2e/base-auth`              |
| `QA-THEME-01`      | Basic Themes            | Shared colour, typography, and spacing consistency | `apps/frontend/tests/base-theme`                 |
| `QA-THEME-02`      | Basic Themes            | Shared component styling for Demo 1 screens        | `apps/frontend/tests/base-theme`                 |
| `QA-THEME-03`      | Basic Themes            | Readable feedback and validation visual states     | `apps/frontend/tests/base-theme`                 |
| `QA-VALIDATION-01` | General Form Validation | Required field validation                          | `apps/frontend/tests/base-form-validation`       |
| `QA-VALIDATION-02` | General Form Validation | Invalid format validation                          | `apps/frontend/tests/base-form-validation`       |
| `QA-VALIDATION-03` | General Form Validation | Quiz required-answer validation                    | `apps/frontend/tests/uc03-quiz-flow`             |
| `QA-VALIDATION-04` | General Form Validation | Backend validation error display                   | `apps/backend/tests/base-form-validation`        |
| `QA-VALIDATION-05` | General Form Validation | Repeated submission handling                       | `apps/frontend/tests/base-form-validation`       |
