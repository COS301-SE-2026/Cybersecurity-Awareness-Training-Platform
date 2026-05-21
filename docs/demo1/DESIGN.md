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

- What is required
- What is happening
- What succeeded
- What failed
- What they can do next

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

- Training document load failure
- Quiz submission failure
- Quiz results load failure
- Unavailable assigned content
- Authentication failure on login/register base screens

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

- No assigned training documents
- No simulated inbox items
- No available quiz content

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

- Quiz submit button while submission is processing
- Login/register submit button while authentication is processing
- Unavailable quiz action when no quiz is assigned

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

- Suspicious sender details
- Urgent or threatening wording
- Unexpected links or attachments
- Mismatch between sender identity and message content

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

- Identify available training quickly
- Continue existing learning progress where available
- Navigate into assigned training modules with minimal navigation depth

Training modules should represent broader cybersecurity learning categories, such as “Phishing Awareness" or “Password Security".

Selecting a training module should take the trainee to a list of related training material for that topic.

For example, a phishing-awareness module may contain learning material such as:

- Identifying phishing emails
- Spotting fake login pages
- SMS phishing awareness

Selecting a training item should open the relevant training-material page, where the trainee can read the content and continue to related quiz content where applicable.

> The dashboard should prioritise clarity and quick access to active learning tasks rather than large amounts of secondary information.

#### Trainee Orientation and Onboarding Guidance

The Demo 1 _trainee experience_ should avoid presenting the platform as an unstructured or overwhelming set of tools immediately after authentication (login).

The _trainee dashboard_ should provide basic onboarding and orientation guidance to help first-time trainees understand:

- The purpose of the platform
- The types of cybersecurity topics available
- How training modules are structured
- How to begin assigned or recommended learning activities
- How training material connects to quizzes or simulations

Examples of supported learning areas may include:

- Phishing awareness
- Password security
- Suspicious links and attachments
- Social-engineering awareness
- Safe credential and payment practices

> For Demo 1, onboarding guidance should remain basic and informational rather than adaptive or highly personalised.

Future enhancements may expand onboarding into personalised learning paths, trainee skill assessment, or adaptive training recommendations, but those behaviours are outside current Demo 1 scope.

The trainee should understand:

- What the platform offers
- Where to begin
- What actions to take next after authentication (login)

### Training Module List to Training Material

The training module list should display assigned or available training modules in a clear and scannable format.

Training modules should represent broader cybersecurity learning categories, such as “Phishing Awareness" or “Password Security".

Each module item may display:

- Module title
- Short summary or description
- Completion or learning progress status
- Availability state
- Navigation action to open the related training material

Selecting a training module should open the associated training-material list for that topic.

The training-material list may contain individual learning items such as:

- Identifying phishing emails
- Spotting fake login pages
- SMS phishing awareness

Selecting a training item should open the corresponding training-material page.

Locked, unavailable, or incomplete content states should be visually distinguishable from available content.

The trainee should be able to return to the dashboard easily without confusion or unnecessary navigation steps.

Demo 1 should avoid deeply nested training hierarchies or unnecessarily complex navigation paths.

### Training Material to Quiz Flow

The training material page supports the trainee flow for `UC-02` by presenting assigned training content in a structured and readable format.

The trainee should be able to:

- Read assigned training content
- Understand the relationship between the training material and the associated quiz
- Navigate to the associated quiz flow when available
- Return safely to the module list or dashboard

If a linked quiz exists, the training material page should present the quiz action as a clear next step within the learning flow.

The transition from training material into the quiz flow should preserve trainee context and maintain a clear relationship between the viewed material and the associated assessment.

Detailed quiz interaction behaviour remains part of `UC-03` documentation and is outside this section's scope.

### Return Navigation

Training-related screens should provide consistent and predictable return navigation.

The trainee should be able to return to:

- The trainee dashboard
- The training module list
- Previously viewed training content where applicable

Navigation actions should remain visible and understandable across supported screen sizes.

The trainee should not encounter dead-end flows after viewing training material or accessing quiz-related screens.

Trainees should always understand where they are in the training flow and how to return to previous screens.

### Loading, Empty, Locked, Unavailable, and Error States

Training-related screens should follow the shared validation, accessibility, loading, and feedback rules defined elsewhere in this document.

Loading states should communicate when training content, module information, or quiz-entry information is being retrieved.

Empty states should explain when:

- No training modules are assigned
- No training content is available
- No related quiz content exists

Locked or unavailable states should clearly distinguish inaccessible content from available content and should explain the limitation where appropriate.

Error states should:

- Avoid exposing technical implementation details
- Provide safe retry or return-navigation behaviour
- Preserve trainee orientation where possible

Training flows should avoid blank, broken, or dead-end screens during loading or failure conditions.

### Responsive Behaviour Expectations

Demo 1 trainee flows should remain usable across desktop, tablet, and mobile layouts.

Training-related screens should prioritise:

- Readable training content
- Visible primary navigation actions
- Touch-friendly interaction areas
- Clear back-navigation behaviour
- Accessible quiz-entry actions

Training content should adapt responsively without requiring horizontal scrolling during normal reading behaviour.

Primary trainee actions should remain accessible on smaller screens without excessive navigation complexity.

## Wireframes and Screen Mockups

The following wireframes show the intended Demo 1 trainee-facing flow. They are design artefacts used to guide implementation and may differ slightly from the final implemented UI.

Wireframe exports are maintained in [wireframes/](./wireframes/). The editable Figma source is linked from [wireframes/README.md](./wireframes/README.md).

### Register Page

![Register page wireframe](./wireframes/Register.png)

The register page supports the base access flow. It shows the expected account-creation fields and the visual direction for form layout and validation placement.

### Login Page

![Login page wireframe](./wireframes/Login.png)

The login page provides the entry point into the Demo 1 trainee flow. It should keep credential entry simple and provide clear error feedback when authentication fails.

### Campaign / Activity Overview

![Campaign activity overview wireframe](./wireframes/TrainingModuleList.png)

This first-pass overview frame shows how available trainee activities can be listed before opening training or quiz content. The current campaign-based implementation may label this screen differently, but the layout intent is a clear, scannable activity list.

### Simulated Inbox

![Simulated inbox wireframe](./wireframes/SimulatedInbox.png)

The simulated inbox supports UC-01 by presenting campaign-provided simulated email summaries in a familiar inbox-style layout. The screen should remain clearly simulated and must not imply access to a real mailbox.

### Simulated Email Detail

![Simulated email detail wireframe](./wireframes/SimulatedEmailDetail.png)

The email detail screen lets the trainee inspect one simulated email. Sender details, subject, body content, and back navigation should remain easy to find.

### Training Document Page

![Training document page wireframe](./wireframes/TrainingMaterialPage.png)

The training document page supports UC-02 by presenting assigned training content in a focused reading layout. It also provides a clear path onward where related quiz content is available.

### Quiz Page

![Quiz page wireframe](./wireframes/QuizPage.png)

The quiz page supports UC-03 by presenting questions and answer choices clearly. Validation and submission controls should make it obvious what the trainee must complete before submitting.

### Quiz Submission State

![Quiz submission state wireframe](./wireframes/QuizSubmission.png)

The quiz submission state shows how the interface should communicate that answers are being processed. It should prevent duplicate submissions and avoid leaving the trainee on a blank or uncertain page.

### Quiz Results Page

No separate quiz results image export is currently available in the repository. Result-screen behaviour is still documented in the Quiz Results Page section above and should be exported when the next design pass produces a stable frame.

### Missing Wireframe Exports

The current repository exports do not include separate images for:

- Campaigns page / trainee campaign list
- Campaign detail or campaign item tree
- Quiz results page

These screens should be exported from the editable design source when available so the static design document fully covers the implemented Demo 1 campaign journey.

## Cross-References

### SRS

### API

### Testing

---

## Appendix A: Document Change History

| Version | Date       | Author(s)   | Sections / Area Updated                    | Summary of Change                                                    |
| ------- | ---------- | ----------- | ------------------------------------------ | -------------------------------------------------------------------- |
| 0.1.0   | 2026-04-27 | Johan Nel   | Initial design scope                       | Created/expanded initial Demo 1 design specification.                |
| 0.1.1   | 2026-05-03 | Zoë Joubert | Feedback UI; validation; phishing feedback | Added UI feedback, validation, and phishing feedback scope guidance. |
| 0.1.2   | 2026-05-07 | Johan Nel   | Design structure; cross-references         | Aligned design document structure with other Demo 1 docs.            |
| 0.1.3   | 2026-05-09 | Connor Bell | Trainee navigation; training screens       | Added navigation and training-screen behaviour documentation.        |
| 0.1.4   | 2026-05-10 | Johan Nel   | Terminology                                | Updated learner/employee wording to trainee.                         |
| 0.1.5   | 2026-05-10 | Zoë Joubert | UI feedback rules                          | Added Demo 1 feedback and accessibility UI rules.                    |
| 0.1.6   | 2026-05-21 | Johan Nel   | Headings; links                            | Cleaned headings and links during domain-model documentation update. |
