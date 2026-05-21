# Demo 1 Design Specification

## Purpose

This document collects Demo 1 design guidance, brand direction, UI rules, trainee navigation notes, and wireframe references.

## Demo 1 Design Scope

Demo 1 design guidance is limited to the trainee-facing demonstration flow and the base authentication screens needed to access it. The design should support review, wireframe planning, and implementation discussion without becoming a full design system.

Base feature screens are separate from the Demo 1 core use cases. Register and Login support access to the platform, while UC-01, UC-02, and UC-03 describe the trainee journey inside Demo 1.

Future-facing or supporting ideas should be clearly labelled so they do not expand the Demo 1 implementation scope.

### UC-01: View Emails in Simulated Inbox

### UC-02: View Training Document

### UC-03: Complete Quiz Flow

### Base Feature Screens

Base feature screens include Register and Login only. These screens support Demo 1 access but should not be treated as separate Demo 1 core use cases.

Validation on base feature screens should be practical and trainee-facing. Examples include missing required fields, invalid email format, password requirements, incorrect login details, and temporary authentication errors.

## Brand Style Guide

### Colour Palette

### Typography Hierarchy

### Logo Usage

### Logo Spacing and Minimum Size

### Do's and Don'ts

### Iconography Direction

### Component Styling Principles

## First-Pass Wireframe Direction

### Register

The Register screen should present only the fields required for the Demo 1 base feature.

Required fields should be visually clear, and field-level validation should appear near the relevant field. The primary registration action should show a submitting state after selection and should prevent duplicate submission while processing.

### Login

The Login screen should support the trainee entering existing credentials and accessing Demo 1 screens.

Field-level validation should appear for missing or incorrectly formatted input before submission where possible. Authentication failure should be shown as a page-level error message because the issue may relate to the submitted credential combination rather than one field only.

### Trainee Dashboard

### Simulated Inbox

The Simulated Inbox should support UC-01 by showing simulated email summaries in a clear, scannable format.

The inbox should show enough information for the trainee to identify each simulated message, such as sender, subject, preview text, and status where applicable. Empty, loading, and error states should explain what the trainee can do next without implying real email delivery or live campaign infrastructure.

### Simulated Email Detail

The Simulated Email Detail screen should show the selected simulated email in a readable format.

The screen should support the trainee reviewing sender details, message content, links or suspicious indicators, and any relevant feedback path. Navigation back to the inbox should remain clear.

### Training Module List

The Training Module List should show available or assigned training content in a clear and scannable way.

Each item should make the topic, availability, and next action understandable. Empty, locked, unavailable, and loading states should follow the shared feedback and accessibility rules in this document.

### Training Material Page

The training material page should support the UC-02 trainee flow by presenting assigned training content in a readable, focused layout.

Design notes:

- Show a clear page title and training content heading.
- Use readable spacing, paragraphs, and section breaks so the content is easy to scan.
- Show a loading state while the document is being retrieved.
- Show an empty or unavailable-content message if the document cannot be opened.
- Provide a clear way back to the training list or trainee dashboard.
- If a linked quiz is available, present the quiz action as a clear next step without making quiz completion part of UC-02.
- Feedback messages on this page should follow the shared validation, error-state, and accessibility rules.

### Quiz Page

The quiz page should support UC-03 by allowing the trainee to answer assigned quiz questions and understand what is required before submission.

Design notes:

- Show the quiz title and a brief instruction explaining that required questions must be answered.
- Present questions in a clear order with enough spacing between question groups.
- Required questions should be visually indicated and supported by text, not only colour.
- Validation messages should appear near the relevant question when an answer is missing or invalid.
- A page-level validation summary may be shown when multiple required answers are missing.
- The submit action should be clearly visible after the questions.
- The trainee should be able to correct validation errors without losing existing answers.

### Quiz Submission State

The quiz submission state should make it clear that the trainee's answers are being processed.

Design notes:

- Show a loading or submitting indicator after the trainee submits the quiz.
- Disable or guard the submit action while processing to prevent duplicate submissions.
- Keep the trainee on the quiz page or transition state until submission completes.
- Do not show raw technical errors if submission fails.
- If submission fails, explain the issue in trainee-friendly language and provide a retry path where appropriate.

### Quiz Results Page

The quiz results page should confirm that the quiz attempt was completed and provide educational feedback.

Design notes:

- Show a clear result summary after successful submission.
- Display feedback in a supportive learning tone.
- Where answer-level feedback is shown, distinguish correct and incorrect responses using text labels and visual treatment.
- Avoid relying only on colour to communicate correctness.
- Provide a clear navigation option back to the training material, module list, or trainee dashboard.
- If results cannot be loaded, show a safe error message and provide a retry or back-navigation option.

### Phishing Feedback Page

This page is included only as high-level Demo 1 feedback context for the simulated phishing trainee experience. It should not be treated as a separate core use case or a full phishing-feedback workflow for Demo 1.

The page should summarise safe learning feedback about a simulated phishing interaction, such as suspicious sender details, urgent wording, or risky links. It should provide a clear path back to the trainee dashboard, training material, or simulated inbox where relevant.

## Wireframe Refinement and Polish

### UI/UX Refinement

### Visual Consistency

### Brand and Style Alignment

### Component Spacing

### Visual Hierarchy

### Final Review Notes

## Feedback, Validation, and Accessibility UI Rules

These rules define supporting UI behaviour for Demo 1 validation, feedback, loading, empty, unavailable, and accessibility states. They support the trainee-facing flows but do not create a separate Demo 1 use case.

The rules apply mainly to:

- UC-01: View Emails in Simulated Inbox
- UC-02: View Training Document
- UC-03: Complete Quiz Flow
- Login/Register as base feature support
- Phishing feedback only as high-level contextual support

The UI should help trainees understand:

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
- Required-field messages should explain what the trainee needs to provide.
- Quiz validation messages should appear near the relevant question where possible.
- Existing trainee input should remain visible after validation fails.

Example wording:

- “Please enter your email address.”
- “Please answer this question before submitting.”
- “Choose one option for this question.”

### Page-Level Error Banners

Page-level error banners should be used when an issue affects the whole page, flow, or submission.

Rules:

- Place the banner near the top of the relevant content area.
- Use plain, trainee-friendly wording.
- Explain the next safe action where possible.
- Do not show stack traces, raw exception names, or backend implementation details.
- Keep the trainee on the current page when they can correct or retry the action.

Appropriate uses include:

- training document load failure;
- quiz submission failure;
- quiz results load failure;
- unavailable assigned content;
- authentication failure on login/register base screens.

### Success Messages

Success messages should confirm that the trainee's action was completed.

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

Warning messages should be used when the trainee can continue but should be aware of a limitation or state.

Rules:

- Use warnings for non-blocking issues or important context.
- Keep the tone helpful rather than alarming.
- Explain whether the trainee needs to take action.
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
- Keep the wording trainee-friendly.

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

Quiz feedback should help the trainee understand their result and learn from the attempt.

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
- Trainees should be able to reach recovery actions, such as retry or back navigation, using the keyboard.

### Keyboard Interaction Expectations

Trainees should be able to complete the Demo 1 trainee flows using keyboard navigation.

Rules:

- Interactive elements should follow a logical tab order.
- Buttons, links, quiz options, and recovery actions should be keyboard-accessible.
- Focus should not be trapped unexpectedly.
- After validation fails, the trainee should be able to navigate to the relevant message or field.
- Disabled controls should not create confusion in the focus order.

### Screen-Reader Feedback Expectations

Screen-reader users should be able to understand important validation, loading, error, and success feedback.

Rules:

- Important messages should be written as meaningful text.
- Messages should identify the relevant field, question, or page state.
- Status changes such as submitting, success, or failure should be presented clearly.
- Error summaries should help the trainee find what needs attention.
- Visual-only feedback, such as colour changes without text, should be avoided.

### Contrast Considerations

Validation, error, success, warning, and feedback states should meet basic readability expectations.

Rules:

- Text must remain readable against its background.
- Colour should support meaning but should not be the only way meaning is communicated.
- Error, warning, and success states should have distinguishable labels or icons where appropriate.
- Final colour choices should align with the Demo 1 brand style guide when available.

---

## Trainee Navigation and Training Screen Behaviour

This section defines the expected trainee navigation flow and high-level screen behaviour for Demo 1 training-related screens.

The _trainee training journey_ should remain **simple**, **predictable**, and **aligned with the Demo 1 use cases and wireframes**.

The primary Demo 1 trainee flow is:

1. Login/Register (Authentication)
2. Basic Onboarding and Orientation (First-Time Trainees)
3. Trainee Dashboard
4. Training Module List
5. Training Material Page
6. Quiz Entry Point
7. Return Navigation

This section supports:

- `UC-02`: View Training Document
- `UC-03`: Complete Quiz Flow

> This section does not define detailed quiz interaction behaviour, frontend routing implementation, or administrator navigation.

### Dashboard to Training Module List

The _trainee dashboard_ acts as the primary landing page after authentication (login).

> First-time trainees may receive basic onboarding and orientation guidance before or shortly after reaching the dashboard. This guidance should help trainees understand the platform structure, available cybersecurity learning areas, and how to begin their learning journey.

The dashboard should provide clear visibility into assigned training modules and current learning activity (if learning/training activity has been started).

The trainee should be able to:

- identify available training quickly;
- continue existing learning progress where available;
- navigate into assigned training modules with minimal navigation depth.

Training modules should represent broader cybersecurity learning categories, such as “Phishing Awareness" or “Password Security".

Selecting a training module should take the trainee to a list of related training material for that topic.

For example, a phishing-awareness module may contain learning material such as:

- identifying phishing emails;
- spotting fake login pages;
- SMS phishing awareness.

Selecting a training item should open the relevant training-material page, where the trainee can read the content and continue to related quiz content where applicable.

> The dashboard should prioritise clarity and quick access to active learning tasks rather than large amounts of secondary information.

#### Trainee Orientation and Onboarding Guidance

The Demo 1 _trainee experience_ should avoid presenting the platform as an unstructured or overwhelming set of tools immediately after authentication (login).

The _trainee dashboard_ should provide basic onboarding and orientation guidance to help first-time trainees understand:

- the purpose of the platform;
- the types of cybersecurity topics available;
- how training modules are structured;
- how to begin assigned or recommended learning activities;
- how training material connects to quizzes or simulations.

Examples of supported learning areas may include:

- phishing awareness;
- password security;
- suspicious links and attachments;
- social-engineering awareness;
- safe credential and payment practices.

> For Demo 1, onboarding guidance should remain basic and informational rather than adaptive or highly personalised.

Future enhancements may expand onboarding into personalised learning paths, trainee skill assessment, or adaptive training recommendations, but those behaviours are outside current Demo 1 scope.

The trainee should understand:

- what the platform offers;
- where to begin;
- and what actions to take next after authentication (login).

### Training Module List to Training Material

The training module list should display assigned or available training modules in a clear and scannable format.

Training modules should represent broader cybersecurity learning categories, such as “Phishing Awareness" or “Password Security".

Each module item may display:

- module title;
- short summary or description;
- completion or learning progress status;
- availability state;
- navigation action to open the related training material.

Selecting a training module should open the associated training-material list for that topic.

The training-material list may contain individual learning items such as:

- identifying phishing emails;
- spotting fake login pages;
- SMS phishing awareness.

Selecting a training item should open the corresponding training-material page.

Locked, unavailable, or incomplete content states should be visually distinguishable from available content.

The trainee should be able to return to the dashboard easily without confusion or unnecessary navigation steps.

Demo 1 should avoid deeply nested training hierarchies or unnecessarily complex navigation paths.

### Training Material to Quiz Flow

The training material page supports the trainee flow for `UC-02` by presenting assigned training content in a structured and readable format.

The trainee should be able to:

- read assigned training content;
- understand the relationship between the training material and the associated quiz;
- navigate to the associated quiz flow when available;
- return safely to the module list or dashboard.

If a linked quiz exists, the training material page should present the quiz action as a clear next step within the learning flow.

The transition from training material into the quiz flow should preserve trainee context and maintain a clear relationship between the viewed material and the associated assessment.

Detailed quiz interaction behaviour remains part of `UC-03` documentation and is outside this section's scope.

### Return Navigation

Training-related screens should provide consistent and predictable return navigation.

The trainee should be able to return to:

- the trainee dashboard;
- the training module list;
- previously viewed training content where applicable.

Navigation actions should remain visible and understandable across supported screen sizes.

The trainee should not encounter dead-end flows after viewing training material or accessing quiz-related screens.

Trainees should always understand where they are in the training flow and how to return to previous screens.

### Loading, Empty, Locked, Unavailable, and Error States

Training-related screens should follow the shared validation, accessibility, loading, and feedback rules defined elsewhere in this document.

Loading states should communicate when training content, module information, or quiz-entry information is being retrieved.

Empty states should explain when:

- no training modules are assigned;
- no training content is available;
- no related quiz content exists.

Locked or unavailable states should clearly distinguish inaccessible content from available content and should explain the limitation where appropriate.

Error states should:

- avoid exposing technical implementation details;
- provide safe retry or return-navigation behaviour;
- preserve trainee orientation where possible.

Training flows should avoid blank, broken, or dead-end screens during loading or failure conditions.

### Responsive Behaviour Expectations

Demo 1 trainee flows should remain usable across desktop, tablet, and mobile layouts.

Training-related screens should prioritise:

- readable training content;
- visible primary navigation actions;
- touch-friendly interaction areas;
- clear back-navigation behaviour;
- accessible quiz-entry actions.

Training content should adapt responsively without requiring horizontal scrolling during normal reading behaviour.

Primary trainee actions should remain accessible on smaller screens without excessive navigation complexity.

## Wireframe References

### [wireframes/](./wireframes/)

## Cross-References

### SRS

### API

### Testing
