# Demo 1 Architecture and Technical Requirements

## Purpose

This document collects preliminary Demo 1 architecture, quality requirements, design patterns, technical requirements, constraints, and developer workflow safeguards. It provides a technical foundation for implementing UC-01, UC-02, and UC-03, keeping guidance clear, preliminary, and useful for implementation decisions.

## Architecture Scope (Rudolph)

### UC-01: View Emails in Simulated Inbox

The architecture supports retrieving and rendering a list of simulated emails assigned to the current user. It handles the display of phishing characteristics and tracks interaction events (e.g., email opened, simulated malicious link clicked) without integrating with real email infrastructure.

### UC-02: View Training Document

The system supports fetching structured training content associated with the user's active assignments. The architecture ensures that training content is delivered reliably, with tracking for when a user views or completes reading the material.

### UC-03: Complete Quiz Flow

The architecture manages the state of a quiz attempt, including presenting questions, capturing user responses, evaluating the submission against correct answers, and persistently storing the result and score for future reporting.

### Admin/Campaign Control Plane (Preliminary Context)

The Admin Control Plane is documented as a preliminary orchestration layer to support the platform's employee-facing activities. It outlines the conceptual management of configuration and targeting for simulations and training modules.

- **Campaign Orchestration**: Conceptual logic for managing campaign states (Draft, Active) to ensure content visibility for employees.
- **Content Resolution**: A mechanism to map campaign configurations to simulation templates (UC-01) and training documents (UC-02).
- **Assignment Mapping**: Conceptual mapping between campaigns and employee groups for targeted content delivery.
- **Preliminary Telemetry (Future Scope)**: Future capability for aggregating interaction events (opens, clicks) for reporting and analytics.

## Quality Requirements (Rudolph)

### Security

- **Authentication & Authorization**: API endpoints must verify user identity (e.g., JWT) before returning simulation or training data.
- **Safe Simulated Data**: Simulated phishing content must be purely internal. No actual emails or SMS messages will be sent or received in Demo 1.
- **Data Sanitization**: All user inputs, specifically quiz answers, must be validated and sanitized to prevent injection attacks.

### Reliability

- **Graceful Error Handling**: The frontend must handle API failures gracefully, displaying user-friendly error messages (e.g., if a training document fails to load).
- **Stateless API**: The Express backend should remain stateless, relying on the database for session and progress tracking to ensure consistent request handling.

### Maintainability

- **Monorepo Structure**: The project uses a monorepo approach (e.g., pnpm workspace) separating the frontend, backend, and shared code (types, validation schemas) to improve maintainability and code reuse.
- **Clear Separation of Concerns**: Keep business logic in the backend controllers/services and pure display logic in frontend React components.

### Modularity

- **Decoupled Simulation Types**: The architecture must treat "Email Simulation" as one specific type of simulation, allowing future additions (e.g., SMS, USB drops) to be implemented without rewriting core campaign tracking logic.
- **Reusable UI Components**: Frontend components (buttons, form fields, modal dialogs) should be highly reusable across the inbox, training, and quiz views.

### Scalability

- **Event-Based Tracking**: Interaction events (opens, clicks) should be stored in a unified, append-only structure that can easily scale as the number of users and campaigns grows.
- **Database Indexing**: Ensure appropriate indexing on user assignments and campaign IDs to maintain fast read times for the employee dashboard.

### Usability and Accessibility

- **Responsive Design**: The application must be fully usable on both desktop and mobile devices.
- **Accessibility (a11y)**: All interactive elements (inbox items, quiz forms) must support keyboard navigation and screen readers.
- **Clear Feedback**: Loading spinners and success/error toasts must be utilized to keep the user informed during asynchronous operations.

### Testability

- **Component Testing**: UI components for UC-01, UC-02, and UC-03 must be written as testable, pure functions where possible.
- **API Testing**: Backend routes for fetching content and submitting quizzes must be covered by automated integration tests.
- **Mocked Data**: The architecture should support dependency injection or easy mocking of the database layer for testing purposes.

## Architectural Approach (Rudolph)

### System Overview

The platform utilizes a standard 3-tier client-server architecture consisting of a React-based frontend SPA, a Node.js/Express backend REST API, and a relational database. This split ensures a clear boundary between presentation, business logic, and data persistence without over-engineering for Demo 1.

### Frontend Boundary

- **Stack**: React (potentially via Vite) for building the user interface.
- **Responsibilities**: Routing between the simulated inbox, training view, and quiz interface; managing local UI state; rendering data fetched from the API; handling user interactions.
- **Structure**: Housed in an `apps/frontend` directory within the monorepo.

### Backend API Boundary

- **Stack**: Node.js with Express.
- **Responsibilities**: Serving RESTful endpoints for the frontend; enforcing business rules (e.g., validating a quiz submission); managing authentication contexts; interacting with the database.
- **Structure**: Housed in an `apps/backend` directory.

### Database Boundary

- **Stack**: Relational Database (e.g., PostgreSQL) managed via Prisma ORM.
- **Responsibilities**: Persistent storage of users, campaigns, simulation content, training modules, and interaction telemetry.
- **Usage**: Prisma acts as the single source of truth for the data model, generating type-safe database clients for the backend.

### Shared Types and Constants

- **Stack**: TypeScript interfaces and Zod schemas (or similar validation library).
- **Responsibilities**: A shared package (e.g., `packages/shared`) contains data transfer objects (DTOs), API response types, and validation logic. This ensures the frontend and backend are strongly typed and perfectly aligned.

## Design Patterns and Simulation Modularity (Rudolph)

### Simulation Type Modularity

The core `Simulation` entity acts as a generic wrapper. Specific simulation details are stored in specialized tables or JSON structures. This prevents the core campaign logic from becoming bloated with type-specific fields.

#### Strategy Pattern for Simulation Handling

To support diverse simulation formats cleanly, the backend will leverage a **Strategy Pattern** for handling simulation interaction logic. Rather than a massive `switch` statement across all simulation types, the core interaction controller delegates to specific strategies (e.g., `EmailSimulationStrategy`, `SmsSimulationStrategy`). Each strategy knows how to validate its specific payload and extract relevant interaction events.

#### Template/Configuration Pattern for Simulation Content

Simulation content is stored using a **Template/Configuration Pattern**. The base campaign assigns a generic "Simulation Context," which references a configurable template (e.g., an Email Template with placeholders for sender, subject, and payload links). The frontend dynamically renders this template. This avoids duplicating static content for every user while allowing campaign-specific overrides.

### Email Simulation

For Demo 1, the primary simulation type is Email. The database stores the simulated sender, subject, body, and payload links. The frontend renders this exactly as an email client would, relying on the backend to serve the precise payload configuration.

### Future Simulation Types

The modular design guarantees that adding a "Smishing" (SMS), voice, or even AI-generated simulations in the future will only require adding a new specific UI component, backend strategy, and database relation, without modifying the base campaign assignment engine. These are marked strictly as future scope.

### Training Module and Quiz Separation

Training content (reading material/videos) and Quizzes (assessments) are modeled as distinct but linkable entities. A user can complete the training module, which may optionally unlock or direct them to a related quiz. This ensures quizzes can exist independently or be attached to varied learning paths.

### Architectural Data Patterns

#### Repository/Data-Access Pattern

To maintain a clear boundary between business logic and database interactions, the backend will utilize a lightweight **Repository Pattern** around Prisma. This abstracts direct Prisma client calls out of controllers/services, improving testability and ensuring that changes to the database schema require updates only in the repository layer.

#### DTO/Shared-Type Pattern

To enforce a strong contract between the React frontend and Express backend, we employ a **DTO (Data Transfer Object) / Shared-Type Pattern**. A `packages/shared` workspace containing Zod schemas and TypeScript types serves as the single source of truth for API request/response payloads. This eliminates drift between frontend expectations and backend outputs.

### Interaction Event Tracking

A unified `InteractionEvent` pattern is used to track all user activity using **Event-Style Interaction Logging**. Instead of updating a boolean flag on an assignment, the system logs discrete events (e.g., `type: 'LINK_CLICKED', timestamp: '...'`). This append-only logging pattern creates an immutable audit trail, which is crucial for future reporting, analytics, and adaptive learning extensions.

### Progress Tracking

User progress through a campaign is derived dynamically by aggregating their `InteractionEvents` against the assigned simulations and training modules, rather than storing brittle, hard-coded progress states.

### Safe Handling of Simulated Phishing Interactions

Simulated interactions must be handled with strict boundaries. Phishing links inside `EmailSimulation` payloads must route safely back to our platform's feedback controllers. The architecture enforces that real external email infrastructures are never used, and no actual credentials are ever stored or processed during a simulated phishing exercise.

### Campaign-Simulation Linkage

Simulations and training modules are decoupled from campaigns through a linking entity. This allows the same simulation template or training document to be reused across multiple campaigns while maintaining independent tracking for each campaign instance.

## Technical Requirements and Constraints (Rudolph)

### Frontend Application

- Must be a Single Page Application (SPA) built with React, housed in `apps/frontend`.
- State management must be kept simple for Demo 1. Prefer localized component state or a lightweight data-fetching library (e.g., React Query or SWR) over heavy global state stores such as Redux.
- The frontend must consume API responses using the shared TypeScript types defined in `packages/shared` to prevent contract drift between frontend and backend.
- React Router (or equivalent) must handle client-side routing between the simulated inbox, training document, and quiz screens without full page reloads.
- The frontend must gracefully handle and display loading, empty, error, and success states for all UC-01, UC-02, and UC-03 screens.
- No real external network requests to email infrastructure, SMS gateways, or third-party AI services may be made from the frontend during Demo 1.

### Backend API

- Built with Express.js, housed in `apps/backend`.
- Must follow RESTful principles with predictable, consistent route patterns (e.g., `GET /simulations/inbox`, `GET /training/:trainingId`, `POST /quiz-attempts/:attemptId/submit`).
- A modular monolith approach within Express is sufficient and expected for Demo 1. Do not over-specify microservices or introduce message queues or event buses.
- All routes that serve UC-01, UC-02, or UC-03 data must be protected by authentication middleware. Unauthenticated requests must receive a `401 Unauthorized` response.
- Input validation must be applied at the route or service level using shared Zod schemas or equivalent, before any database interaction.
- Error responses must follow the standardized shape defined in `API.md` (General Form Validation Responses) to ensure consistent frontend error handling.

### Database and Prisma Usage

- The relational database schema is defined and managed via Prisma schema files. No direct SQL migrations may bypass Prisma's migration tooling.
- All database access from the backend must go through the Prisma client. Raw SQL queries are not permitted in Demo 1 unless Prisma does not support the required operation.
- Seed scripts must be provided to populate stable demo data for UC-01 (simulated emails), UC-02 (training documents), and UC-03 (quiz questions). Seed data must be reviewable alongside the schema.
- Schema changes must remain backward-compatible with the current seeded demo data throughout Sprint 1.

### Shared Types and Constants

- A shared package at `packages/shared` must expose TypeScript types, Zod schemas, and constants consumed by both `apps/frontend` and `apps/backend`.
- API request and response shapes for UC-01, UC-02, and UC-03 endpoints must be represented as Zod schemas or equivalent TypeScript interfaces in `packages/shared`.
- Admin and campaign-management DTOs are excluded from the shared package for Demo 1. These are future-scope concerns.
- The shared package must not import from `apps/frontend` or `apps/backend`. It must remain a pure, dependency-free utility package.

### Authentication and Base Features

- Login and registration are base features that must be implemented as foundational middleware on the backend and context providers on the frontend. They are not counted as core Demo 1 use cases (UC-01, UC-02, or UC-03).
- JWT-based token authentication (or equivalent stateless mechanism) must be used to protect all UC-01, UC-02, and UC-03 endpoints.
- Base feature flows (login, registration, validation) must be demoed as working, but their test coverage is secondary to the three core use cases.

### Automated Testing

- Foundational unit tests must be set up using Jest or Vitest for isolated logic: form validation helpers, quiz scoring helpers, and request/response mapping helpers.
- Backend integration tests must cover at minimum the happy path and one failure path for each endpoint defined in `API.md` (UC-01, UC-02, UC-03 sections).
- Frontend component tests must cover rendering, interaction, and error state behaviour for the simulated inbox (UC-01), training document (UC-02), and quiz flow (UC-03) screens.
- End-to-end test coverage is aspirational for Demo 1. If implemented, cover only the most critical demo paths: login → inbox, login → training → quiz → results.
- See `testing.md` for full test scenario planning, suggested test locations, and traceability references.

### CI and Build Expectations

- The monorepo must be buildable without errors using the existing pnpm workspace configuration. `pnpm install` and `pnpm build` (or equivalent) must succeed from the root.
- A formatting check (e.g., `pnpm format`) must pass before commits are pushed to the branch. Code style must follow the project's established Prettier/ESLint configuration.
- CI pipeline integration (e.g., GitHub Actions) is aspirational for Demo 1. At a minimum, the project must be structured so that automated checks can be added without restructuring the monorepo.
- No production build pipeline or deployment workflow is required for Demo 1.

### Safe Simulated Inbox Data

- **Constraint**: Simulated phishing emails exist solely as database records rendered by the React frontend. No actual emails may be sent to or received from any external mail server.
- Simulated email content (sender labels, subject lines, body HTML, and payload links) must be authored, seeded, and fully controlled within the project repository.
- Simulated phishing links inside email bodies must route to internal frontend feedback routes (e.g., `/phishing-feedback`) and must never point to real external URLs.
- The UI must make it clear to the Learner/Employee that the inbox is a simulated environment. Wording such as "Simulated Inbox" or equivalent must be present on the screen.

### Training Document Content

- Training document content must be stored as structured data in the database (e.g., Markdown or HTML body) and served via the `GET /training/:trainingId` endpoint.
- Content must be seeded for Demo 1 and must be directly relevant to the phishing awareness topic demonstrated in UC-01.
- Training documents must be linked to a quiz where applicable (via a `linkedQuizId` field), supporting the UC-02 → UC-03 navigation path.
- Training content must not introduce adaptive learning, gamification, progress scoring, or reporting features in Demo 1.

### Quiz Attempts and Results

- A quiz attempt is created when the Learner/Employee starts the quiz (`POST /quizzes/:quizId/attempts`) and submitted when they complete it (`POST /quiz-attempts/:attemptId/submit`).
- The backend must prevent duplicate submissions for the same attempt. A `409 Conflict` response must be returned if a submit is attempted on an already-submitted attempt.
- Quiz results must be stored persistently in the database and retrievable via `GET /quiz-attempts/:attemptId/results`.
- Score calculation must be performed server-side. The frontend must not calculate or modify scores.
- Question-level feedback (correct/incorrect + explanation) must be returned in the results response and displayed to the Learner/Employee in plain, educational language.
- Quiz content must be seeded for Demo 1 and aligned with the linked training document.

### Data Privacy and Sensitive Input Handling

- **Constraint**: No real user credentials, passwords, or sensitive personal data captured during simulated phishing interactions may be stored in the database, logged to the console, or transmitted anywhere.
- Interaction events (e.g., `EMAIL_OPENED`, `LINK_CLICKED`) must capture only the event type, timestamp, and linked entity IDs. No message content, typed input, or credential data may be stored in an event record.
- User passwords must be hashed using a standard algorithm (e.g., bcrypt) before storage. Plain-text passwords must never appear in logs or API responses.
- Future analytics or reporting features must be designed so that individual user activity cannot be exposed outside their designated administrative group. This is a constraint for future design, not an implementation requirement for Demo 1.

### Open-Source and Project Repository Expectations

- All code, documentation, diagrams, and seed data committed to the repository must be original work or clearly licensed open-source material appropriate for a university project.
- No secrets, API keys, private tokens, database connection strings, or credentials may be committed to the repository. Use environment variables and a `.env.example` template.
- The repository must include a `README.md` or equivalent entry point that explains how to install dependencies, seed the database, and start the development server.
- Branch naming and commit message conventions must follow the project team's agreed standards (e.g., `docs/feature-name/author`, commit messages referencing issue numbers).

### Demo 1 Scope Constraints

- **Constraint**: The three core Demo 1 use cases are strictly UC-01 (View Emails in Simulated Inbox), UC-02 (View Training Document), and UC-03 (Complete Quiz Flow). No other use cases may be introduced or partially implemented under Demo 1 scope.
- **Constraint**: Base features (login, registration, general form validation) are foundational prerequisites and must not be counted or presented as core Demo 1 use cases.
- **Constraint**: No real phishing delivery infrastructure (SMTP, SMS, voice) may be built or referenced as a Demo 1 implementation concern.
- **Constraint**: Simulated content (emails, training, quizzes) must remain entirely controlled within the project repository and must never connect to real external communication services.
- **Constraint**: Admin UI, campaign management screens, and reporting dashboards are out of scope for Demo 1. Campaign and simulation data must be managed via seed scripts only.
- **Constraint**: Production deployment, containerisation (Docker), and infrastructure-as-code are explicitly excluded from Demo 1 scope.

## QA and Testing Expectations

- **Reviewable Code**: All new endpoints and UI components must include unit or integration tests that validate happy paths and at least one failure mode (e.g., invalid quiz submission).
- **Test Scenarios**: QA must verify that viewing an email (UC-01) generates a database event, viewing training (UC-02) updates progress, and submitting a quiz (UC-03) records a score.

## Cross-References

### SRS

See `SRS.md` for full Demo 1 requirements and use cases.

### API

See `API.md` for specific endpoint contracts and payload shapes.

### Testing

See `testing.md` for QA strategies and test plans.

### Traceability

See `traceability.md` for tracking requirements to test cases.
