# Demo 1 Design Specification

## Purpose

This document collects Demo 1 design guidance, brand direction, UI rules, learner navigation notes, and wireframe references.

## Demo 1 Design Scope

Demo 1 design guidance is limited to the learner-facing demonstration flow and the base authentication screens needed to access it. The design should support review, wireframe discussion, and implementation planning without becoming a full design system.

Base feature screens are separate from the Demo 1 core use cases. Register and Login support access to the platform, while UC-01, UC-02, and UC-03 describe the learner journey inside Demo 1.

Future-facing or supporting ideas should be clearly labelled so they do not expand the Demo 1 implementation scope.

### UC-01: View Emails in Simulated Inbox

UC-01 covers the learner viewing simulated email summaries and opening a simulated email detail screen.

The inbox UI should show clear email sender, subject, preview, and status information. Empty, loading, and error states should explain what the learner can do next without implying real email delivery or live campaign infrastructure.

### UC-02: View Training Document

UC-02 covers the learner opening and reading assigned or available training material.

Training screens should prioritise readability, progress clarity, and simple navigation to the quiz flow. Loading, empty, unavailable, and error states should be handled consistently with the shared feedback rules in this document.

### UC-03: Complete Quiz Flow

UC-03 covers the learner answering quiz questions, submitting the quiz, and viewing quiz results or feedback.

The quiz flow should make answer selection, submission status, validation, and results feedback clear. The learner should be able to understand which questions were answered, what still needs attention, when the quiz is submitting, and what feedback is shown after completion.

### Base Feature Screens

Base feature screens include Register and Login only. These screens support Demo 1 access but should not be mixed into UC-01, UC-02, or UC-03.

Validation on base feature screens should be practical and user-facing. Examples include missing required fields, invalid email format, password requirements, incorrect login details, and temporary authentication errors.

## Brand Style Guide (Connor)

### Colour Palette

### Typography Hierarchy

### Logo Usage

### Logo Spacing and Minimum Size

### Do's and Don'ts

### Iconography Direction

### Component Styling Principles

## First-Pass Wireframe Direction (Zoë)

### Register

The Register screen should present only the fields required for the Demo 1 base feature. Required fields should be visually clear, and field-level validation should appear near the relevant field.

Validation messages should explain the problem and the expected correction. For example, an invalid email field should say that a valid email address is required rather than only showing a generic error.

The primary registration action should enter a submitting state after selection. During submission, the button should prevent duplicate submission and show a clear loading label or indicator. Registration success should show a short confirmation and guide the learner toward the next step.

### Login

The Login screen should support the learner entering existing credentials and accessing Demo 1 screens.

Field-level validation should appear for missing or incorrectly formatted input before submission where possible. Authentication failure should be shown as a page-level error message because the issue may relate to the submitted credential combination rather than one field only.

The login button should enter a submitting state while the request is being processed. The learner should not be able to trigger repeated submissions while the login request is pending.

### Learner/Employee Dashboard

### Simulated Inbox

### Simulated Email Detail

### Training Module List

### Training Material Page

The Training Material Page should prioritise readability and learner progress through the material.

The screen should include a clear title, readable training content area, and a clear action to continue to the quiz when appropriate. If the content is loading, the learner should see a loading state that does not shift the layout unnecessarily.

If training material is unavailable, the screen should explain that the material cannot currently be displayed and provide a safe recovery action, such as returning to the training module list. Empty or unavailable states should not imply that the learner has completed the training.

### Quiz Page

The Quiz Page should clearly show the current quiz context, questions, answer options, and progress through the quiz.

Answer options should be easy to select with both mouse and keyboard. Required unanswered questions should be identified before submission. Validation should guide the learner to the unanswered or invalid question without using blame-based language.

The quiz should not reveal final correctness feedback before submission unless the specific quiz interaction is designed for practice feedback. For Demo 1, feedback should primarily appear after submission or on the results screen.

### Quiz Submission State

The Quiz Submission State should clearly communicate that the learner's answers are being submitted.

The submit action should be disabled while submission is in progress to prevent duplicate attempts. The UI should keep the learner on the quiz flow and show a loading or submitting message.

If submission fails, the learner should see a page-level error message explaining that the quiz could not be submitted and should be given a safe retry option. Already selected answers should remain visible where possible so the learner does not lose progress.

### Quiz Results Page

The Quiz Results Page should summarise the learner's quiz outcome in a clear and supportive way.

The results should show the overall result or score if available, followed by practical feedback. Question-level feedback should distinguish correct answers, incorrect answers, and learning explanations without overwhelming the learner.

Feedback should focus on learning and awareness rather than punishment. The results page should provide a clear next action, such as returning to training material, continuing the learner journey, or reviewing feedback.

### Phishing Feedback Page

The Phishing Feedback Page should explain the simulated phishing outcome in a calm, educational, and non-punitive tone.

Feedback should clearly state what happened in the simulation, which warning signs were relevant, and what the learner should do differently in a real situation. The page should avoid shaming language and should not display sensitive credential values or unnecessary personal data.

For Demo 1, this page should remain learner-facing and educational. Organisation-wide risk dashboards, campaign administration, and advanced reporting should be treated as future-facing or supporting material unless they are already explicitly included elsewhere in Demo 1 scope.

## Wireframe Refinement and Polish (Connor)

### UI/UX Refinement

### Visual Consistency

### Brand and Style Alignment

### Component Spacing

### Visual Hierarchy

### Final Review Notes

## Feedback, Validation, and Accessibility UI Rules (Zoë)

These rules define practical UI behaviour for Demo 1 validation, feedback states, accessibility, and learner-facing system responses. They are intended to keep the Register, Login, inbox, training, quiz, and phishing feedback screens consistent.

This section does not define a new colour palette or full component library. Visual styling, colours, and brand treatment should follow Connor's brand style guide.

### Field-Level Validation Messages

Field-level validation messages should appear close to the field they describe.

Each message should:

- State what is wrong.
- Explain how the learner can fix it.
- Use plain language.
- Avoid blame-based wording.
- Remain visible until the issue is corrected or the form is reset.

Examples:

- Use: `Enter a valid email address.`
- Use: `Password is required.`
- Avoid: `Invalid input.`
- Avoid: `You failed to complete this field.`

For Register and Login, field-level messages should be used for missing required fields, invalid email format, and basic password input requirements.

### Page-Level Error Banners

Page-level error banners should be used when an issue affects the whole page, form, or flow.

Use page-level error banners for:

- Failed login attempts.
- Failed registration submission.
- Failed quiz submission.
- Training material that cannot be loaded.
- Simulated inbox content that cannot be displayed.

A page-level error banner should appear near the top of the main content area and should describe the problem plus a recovery action where possible.

Example:
`We could not submit your quiz right now. Check your connection and try again.`

### Success Messages

Success messages should confirm that an important learner action was completed.

Use success messages for:

- Successful registration.
- Successful login transition where needed.
- Successful quiz submission.
- Saved or completed training progress if shown in Demo 1.

Success messages should be short and should point to the next action.

Example:
`Quiz submitted successfully. Your results are ready to review.`

### Warning Messages

Warning messages should alert the learner before an action or state that needs attention but is not a full error.

Use warning messages for:

- Leaving a quiz with unanswered questions.
- Training material being unavailable or locked.
- A simulated email containing suspicious indicators.
- Actions that may affect learner progress.

Warnings should explain the situation and the safe next step. They should not use alarming language unless the simulated phishing context requires clear caution.

### Empty States

Empty states should explain why no content is shown and what the learner can do next.

Use empty states for:

- No simulated emails in the inbox.
- No available training modules.
- No quiz results available yet.
- No feedback available for a selected item.

Empty states should include:

- A short title.
- One sentence of explanation.
- A clear next action where appropriate.

Example:
`No training modules are available yet. Return to the dashboard or check again later.`

### Loading and Submitting States

Loading states should show that content is being fetched or prepared.

Use loading states for:

- Loading the learner dashboard.
- Loading simulated inbox emails.
- Loading training material.
- Loading quiz questions.
- Loading quiz results.

Submitting states should show that a learner action is being processed.

Use submitting states for:

- Registering.
- Logging in.
- Submitting a quiz.

During submission, the related primary action should prevent duplicate submissions. The learner should receive clear feedback such as `Submitting quiz...` or `Signing in...`.

### Disabled States

Disabled states should only be used when an action is temporarily or logically unavailable.

A disabled action should have a clear reason nearby when the reason is not obvious. Disabled controls should not be the only way to communicate missing requirements.

Examples:

- A quiz submit button may be disabled while submission is in progress.
- A training continuation action may be disabled while material is still loading.
- A locked or unavailable training item should show a short explanation.

Disabled states should still meet contrast expectations and should remain understandable to keyboard and screen-reader users.

### Quiz Feedback Display

Quiz feedback should support learning and should be shown clearly after quiz submission or on the results page.

Quiz feedback should:

- Show the overall result or score if available.
- Identify correct and incorrect responses.
- Provide short explanations for important answers.
- Use supportive language.
- Avoid overwhelming the learner with too much text at once.

For UC-03, feedback should make it clear whether the learner has completed the quiz flow. If the learner must retry or review material, the next action should be visible.

### Phishing Feedback Display

Phishing feedback should be educational, calm, and non-punitive.

The feedback should:

- Explain what happened in the simulation.
- Highlight the relevant phishing indicators.
- Explain the safer action the learner should take in a real scenario.
- Avoid showing sensitive submitted values.
- Avoid shame-based wording.

Example:
`This message used urgency and an unfamiliar link to encourage quick action. In a real email, pause before clicking and verify the sender through a trusted channel.`

### Accessible Message Presentation

User-facing messages should not rely on colour alone.

Validation, warning, success, and error messages should use text labels, icons where appropriate, and clear placement. The same message style should be used consistently across Register, Login, training, quiz, and phishing feedback screens.

Messages should be placed near the relevant content and should not disappear before the learner has enough time to read them.

### Keyboard Interaction Expectations

All Demo 1 screens should support keyboard-friendly interaction.

Keyboard expectations:

- Interactive elements should be reachable using the keyboard.
- Focus order should follow the visual reading order.
- Selected quiz answers should be operable by keyboard.
- Primary actions such as submit, continue, and return should be reachable without a mouse.
- Focus should not be trapped unexpectedly.
- Visible focus styling should be preserved.

After a validation or submission error, focus should move to the most useful recovery point, such as the page-level error banner or the first invalid field.

### Screen-Reader Feedback Expectations

Important feedback should be understandable to screen-reader users.

Screen-reader expectations:

- Field-level errors should be associated with their fields.
- Page-level banners should be announced when they appear.
- Loading and submitting states should have text equivalents.
- Quiz results and phishing feedback should use headings and structured text.
- Icon-only messages should include text labels or accessible names.

For Demo 1 planning, the design should indicate where user-facing messages appear and what text they contain so implementation can support accessible announcements.

### Contrast Considerations

Message states should meet readable contrast expectations and should follow Connor's brand style guide.

The design should not define new colours in this document. Instead, error, warning, success, disabled, and informational states should use the approved brand palette and be checked for readability.

Colour should not be the only indicator of state. Error, warning, success, and disabled states should also use text, labels, icons, spacing, or layout treatment to make the meaning clear.

## Learner Navigation and Training Screen Behaviour (Connor)

### Dashboard to Training Module List

### Training Module List to Training Material

### Training Material to Quiz Flow

### Return Navigation

### Loading, Empty, Locked, Unavailable, and Error States

## Wireframe References

### `docs/demo1/wireframes/`

## Cross-References

### SRS

The design rules should align with the Demo 1 SRS sections for base features, UC-01, UC-02, and UC-03.

The SRS remains the source for functional scope. This design document explains how the learner-facing UI should present validation, feedback, navigation, and accessibility states for that scope.

### API

API references should remain high-level in this design document.

This document may describe learner-facing responses such as loading, success, warning, and error states, but it should not define backend error-handling logic or final API contracts.

### Testing

Testing references should focus on whether the documented UI states are visible, understandable, and aligned with Demo 1 flows.

Relevant checks include:

- Register and Login validation messages.
- Simulated inbox empty, loading, and error states.
- Training material loading, unavailable, and continuation states.
- Quiz unanswered-question validation.
- Quiz submitting and failed-submission states.
- Quiz results feedback.
- Phishing feedback clarity.
- Keyboard navigation and visible focus.
- Screen-reader-friendly message structure.
