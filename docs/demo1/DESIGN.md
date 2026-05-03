# Demo 1 Design Specification

## Purpose

This document collects Demo 1 design guidance, brand direction, UI rules, learner navigation notes, and wireframe references.

## Demo 1 Design Scope

### UC-01: View Emails in Simulated Inbox

### UC-02: View Training Document

### UC-03: Complete Quiz Flow

### Base Feature Screens

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

### Login

### Learner/Employee Dashboard

### Simulated Inbox

### Simulated Email Detail

### Training Module List

### Training Material Page

The training material page should support the UC-02 learner flow by presenting assigned training content in a readable, focused layout.

Design notes:

- Show a clear page title and training content heading.
- Use readable spacing, paragraphs, and section breaks so the content is easy to scan.
- Show a loading state while the document is being retrieved.
- Show an empty or unavailable-content message if the document cannot be opened.
- Provide a clear way back to the training list or learner dashboard.
- If a linked quiz is available, present the quiz action as a clear next step without making quiz completion part of UC-02.
- Feedback messages on this page should follow the shared validation, error-state, and accessibility rules.

### Quiz Page

The quiz page should support UC-03 by allowing the learner to answer assigned quiz questions and understand what is required before submission.

Design notes:

- Show the quiz title and a brief instruction explaining that required questions must be answered.
- Present questions in a clear order with enough spacing between question groups.
- Required questions should be visually indicated and supported by text, not only colour.
- Validation messages should appear near the relevant question when an answer is missing or invalid.
- A page-level validation summary may be shown when multiple required answers are missing.
- The submit action should be clearly visible after the questions.
- The learner should be able to correct validation errors without losing existing answers.

### Quiz Submission State

The quiz submission state should make it clear that the learner’s answers are being processed.

Design notes:

- Show a loading or submitting indicator after the learner submits the quiz.
- Disable or guard the submit action while processing to prevent duplicate submissions.
- Keep the learner on the quiz page or transition state until submission completes.
- Do not show raw technical errors if submission fails.
- If submission fails, explain the issue in learner-friendly language and provide a retry path where appropriate.

### Quiz Results Page

The quiz results page should confirm that the quiz attempt was completed and provide educational feedback.

Design notes:

- Show a clear result summary after successful submission.
- Display feedback in a supportive learning tone.
- Where answer-level feedback is shown, distinguish correct and incorrect responses using text labels and visual treatment.
- Avoid relying only on colour to communicate correctness.
- Provide a clear navigation option back to the training material, module list, or learner dashboard.
- If results cannot be loaded, show a safe error message and provide a retry or back-navigation option.

### Phishing Feedback Page

## Wireframe Refinement and Polish (Connor)

### UI/UX Refinement

### Visual Consistency

### Brand and Style Alignment

### Component Spacing

### Visual Hierarchy

### Final Review Notes

## Feedback, Validation, and Accessibility UI Rules (Zoë)

These rules define supporting UI behaviour for Demo 1 validation, feedback, loading, empty, unavailable, and accessibility states. They support the learner-facing flows but do not create a separate Demo 1 use case.

The rules apply mainly to:

- UC-02: View training document
- UC-03: Complete quiz flow
- Login/Register as base feature support
- Phishing feedback only as high-level contextual support

The UI should help learners understand:

- what is required;
- what is happening;
- what succeeded;
- what failed;
- what they can do next.

### Field-Level Validation Messages

Field-level validation messages should appear close to the field, question, or input that needs attention.

Rules:

- Use field-level messages for missing required input, invalid answer format, or unsupported selections.
- Keep messages short and specific.
- Do not rely only on colour to identify the problem.
- Required-field messages should explain what the learner needs to provide.
- Quiz validation messages should appear near the relevant question where possible.
- Existing learner input should remain visible after validation fails.

Example wording:

- “Please enter your email address.”
- “Please answer this question before submitting.”
- “Choose one option for this question.”

### Page-Level Error Banners

Page-level error banners should be used when an issue affects the whole page, flow, or submission.

Rules:

- Place the banner near the top of the relevant content area.
- Use plain, learner-friendly wording.
- Explain the next safe action where possible.
- Do not show stack traces, raw exception names, or backend implementation details.
- Keep the learner on the current page when they can correct or retry the action.

Appropriate uses include:

- training document load failure;
- quiz submission failure;
- quiz results load failure;
- unavailable assigned content;
- authentication failure on login/register base screens.

### Success Messages

Success messages should confirm that the learner’s action was completed.

Rules:

- Use success messages after meaningful completed actions, such as successful quiz submission.
- Keep the message brief and calm.
- Make the next step clear.
- Avoid implying extra features outside Demo 1 scope.

Example wording:

- “Your quiz was submitted. Your results are ready.”
- “Your progress has been saved.”
- “You are signed in.”

### Warning Messages

Warning messages should be used when the learner can continue but should be aware of a limitation or state.

Rules:

- Use warnings for non-blocking issues or important context.
- Keep the tone helpful rather than alarming.
- Explain whether the learner needs to take action.
- Do not use warnings for normal required-field validation; use field-level validation instead.

Examples:

- “This training document is available, but progress may not be saved right now.”
- “This quiz is currently unavailable. Please return to the training material.”

### Empty States

Empty states should explain when there is no relevant content to show.

Rules:

- State clearly what is missing.
- Avoid making the page look broken.
- Provide a safe next step, such as returning to the dashboard.
- Keep the wording learner-friendly.

Applicable Demo 1 examples:

- no assigned training documents;
- no simulated inbox items;
- no available quiz content.

### Loading and Submitting States

Loading and submitting states should show that the system is working.

Rules:

- Use loading states when retrieving training content, quiz content, or results.
- Use submitting states when sending quiz answers or form data.
- Prevent duplicate submissions while a request is processing.
- Avoid blank pages during loading.
- Keep loading text short and understandable.

Example wording:

- “Loading training material…”
- “Submitting your quiz…”
- “Preparing your results…”

### Disabled States

Disabled states should prevent actions that are temporarily unavailable or unsafe to repeat.

Rules:

- Disable or guard submit buttons while a quiz or form is being submitted.
- Use disabled states only when the reason is clear from nearby context.
- Disabled controls should still be visually understandable and accessible.
- Do not rely only on disabled buttons for validation; show clear validation messages as well.

Applicable Demo 1 examples:

- quiz submit button while submission is processing;
- login/register submit button while authentication is processing;
- unavailable quiz action when no quiz is assigned.

### Quiz Feedback Display

Quiz feedback should help the learner understand their result and learn from the attempt.

Rules:

- Show a clear result summary after successful submission.
- Use supportive wording for incorrect answers.
- Distinguish correct and incorrect answers with text labels and visual treatment.
- Do not rely only on colour to show correctness.
- Keep feedback educational, not punitive.
- Provide a clear navigation path after the results.

Example wording:

- “Correct: This is a common sign of a suspicious link.”
- “Review: This option can be risky because the sender cannot be verified.”

### Phishing Feedback Display

Phishing feedback is high-level contextual support for Demo 1 and should not be treated as a separate core use case.

Rules:

- Keep phishing feedback focused on safe learning guidance.
- Explain suspicious email indicators in plain language.
- Link feedback to the simulated inbox context where relevant.
- Avoid expanding this into a full phishing-feedback workflow unless separately scoped.
- Do not include real credential collection, real phishing delivery, or unsafe simulation behaviour.

Example guidance areas:

- suspicious sender details;
- urgent or threatening wording;
- unexpected links or attachments;
- mismatch between sender identity and message content.

### Accessible Message Presentation

Feedback messages should be accessible and easy to perceive.

Rules:

- Place messages close to the relevant field, question, or content area.
- Use text labels in addition to colour.
- Ensure messages are readable at normal zoom levels.
- Important page-level messages should be noticeable without disrupting the whole flow.
- Learners should be able to reach recovery actions, such as retry or back navigation, using the keyboard.

### Keyboard Interaction Expectations

Learners should be able to complete the Demo 1 learner flows using keyboard navigation.

Rules:

- Interactive elements should follow a logical tab order.
- Buttons, links, quiz options, and recovery actions should be keyboard-accessible.
- Focus should not be trapped unexpectedly.
- After validation fails, the learner should be able to navigate to the relevant message or field.
- Disabled controls should not create confusion in the focus order.

### Screen-Reader Feedback Expectations

Screen-reader users should be able to understand important validation, loading, error, and success feedback.

Rules:

- Important messages should be written as meaningful text.
- Messages should identify the relevant field, question, or page state.
- Status changes such as submitting, success, or failure should be presented clearly.
- Error summaries should help the learner find what needs attention.
- Visual-only feedback, such as colour changes without text, should be avoided.

### Contrast Considerations

Validation, error, success, warning, and feedback states should meet basic readability expectations.

Rules:

- Text must remain readable against its background.
- Colour should support meaning but should not be the only way meaning is communicated.
- Error, warning, and success states should have distinguishable labels or icons where appropriate.
- Final colour choices should align with the Demo 1 brand style guide when available.

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

### API

### Testing
