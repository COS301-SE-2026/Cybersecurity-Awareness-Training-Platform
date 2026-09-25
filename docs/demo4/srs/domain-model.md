# Domain Model

The Demo 4 domain model describes business concepts and relationships rather than duplicating the physical Prisma schema.

## SRS Content

- [0. Home](README.md)
- [1. Introduction and Scope](introduction.md)
- [2. Users and User Stories](users-and-user-stories.md)
- [3. Functional Requirements](functional-requirements.md)
- [4. Use Cases](use-cases.md)
- [5. Quality Requirements](quality-requirements.md)
- **[6. Domain Model](#6-domain-model)** &larr; _You are here_
- [7. Changelog](changelog.md)

---

## 6. Domain Model

### 6.1 Identity, Organisation, and Access

| Concept                            | Responsibility                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| User                               | Common authenticated identity, account status, verified email, and platform user type.                                |
| Trainee Profile                    | Training identity associated with a User and used for Campaign assignments, attempts, and evidence.                   |
| Organisation                       | Tenant boundary for organisation users, content, Campaigns, assignments, settings, and audit records.                 |
| Organisation Trainee Profile       | Active or disabled membership joining a Trainee Profile to one Organisation.                                          |
| Organisation Administrator Profile | Organisation-linked administrator identity whose authority comes from explicit Organisation Permissions.              |
| Platform Administrator Profile     | Platform-level administrator identity, including the supported super-administrator distinction.                       |
| Organisation Registration Request  | Reviewable request that may create an Organisation and initial-administrator setup flow.                              |
| Invitation and Action Token        | Scoped, time-limited, single-use authority for verification, setup, recovery, invitation, and supported role changes. |

User roles are represented by associated profiles and membership records. The model does not require an obsolete inheritance hierarchy between general, organisation, and administrator users.

### 6.2 Reusable Content

| Concept            | Ownership and lifecycle                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Training Document  | Platform- or organisation-owned Markdown training content with categories and `EASY`, `MEDIUM`, or `HARD` difficulty. The authoring lifecycle uses `DRAFT`, `AVAILABLE`, `UNAVAILABLE`, and `ARCHIVED` where supported. |
| Quiz               | Platform- or organisation-owned assessment with `DRAFT`, `PUBLISHED`, and `ARCHIVED` states.                                                                                                                            |
| Quiz Question      | Ordered `SINGLE_CHOICE` or `MULTIPLE_CHOICE` question with category metadata and answer-selection rules.                                                                                                                |
| Quiz Answer Option | Ordered answer text, positional label, correctness, and feedback belonging to a question.                                                                                                                               |
| Organisation Email | Organisation-owned reusable simulated message with `DRAFT` or `ACTIVE` status, classification, categories, and difficulty.                                                                                              |
| Simulation         | Organisation- or platform-scoped simulation container. A Simulated Inbox Campaign reference requires `APPROVED` safety state.                                                                                           |
| Simulated Inbox    | Controlled collection of ordered simulated emails. Campaign eligibility requires an `ACTIVE` inbox under an approved Simulation.                                                                                        |
| Simulated Email    | Snapshot or authored message in a Simulated Inbox, optionally sourced from an Organisation Email.                                                                                                                       |

Lifecycle state makes reusable content eligible or ineligible for Campaign selection. A Draft is editable; an eligible activated or published resource is referenced by ID from Campaign items. Editing immutable active content uses the supported copy-to-Draft workflow rather than changing published history.

### 6.3 Campaign Composition

| Concept               | Responsibility                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign              | Platform `PREMADE_GENERAL` or organisation `ORGANISATION_CUSTOM` training container. The implemented management lifecycle is `DRAFT`, `ACTIVE`, and `ARCHIVED`. |
| Campaign Item         | Ordered occurrence in a Campaign with required state and one of the canonical item forms below.                                                                 |
| Campaign Prerequisite | Requires completion of another Campaign before the dependent Campaign becomes available.                                                                        |
| Campaign Assignment   | Joins one Campaign to one Trainee Profile through direct assignment or self-selection and tracks current availability and progress.                             |

The canonical Campaign graph is:

| Item form   | Structure                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COMPONENT` | References exactly one eligible `TRAINING_DOCUMENT`, `QUIZ`, or `SIMULATED_INBOX`. A Quiz occurrence also carries `maxAttempts` and `BEST`, `LATEST`, or `AVERAGE` score policy supported by the Campaign contract. |
| `ADAPTIVE`  | Fixes one component type and contains exactly one `EASY`, one `MEDIUM`, and one `HARD` alternative with the same required non-empty category set. Quiz adaptive occurrences carry the same occurrence settings.     |
| `GROUP`     | Contains at least two direct `COMPONENT` or `ADAPTIVE` children, a group type, completion rule, ordering, and required state. A group cannot contain another group.                                                 |

An Active Campaign can be copied into a fresh Draft. The copy receives new Campaign, Campaign Item, group, and adaptive-alternative identities while preserving eligible references and configuration. Assignment, attempt, progress, evidence, and adaptive-resolution history are not copied.

### 6.4 Quiz Participation

| Concept        | Responsibility                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| Quiz Attempt   | One `IN_PROGRESS` or `SUBMITTED` trainee attempt scoped to a Quiz, Campaign Assignment, and Campaign Item occurrence. |
| Attempt Answer | The option IDs selected for one question in one attempt.                                                              |
| Quiz Result    | Score, pass state, summary, and permitted post-submission feedback for a submitted attempt.                           |

Starting a Quiz reuses an existing in-progress attempt. A submitted attempt remains historical, and a new attempt may be created only while the occurrence limit allows it. The occurrence score is derived according to its supported `BEST`, `LATEST`, or `AVERAGE` policy.

### 6.5 Adaptive Learning

| Concept                      | Responsibility                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Category Evidence            | Category-specific Quiz performance and Simulated Inbox classification and link behaviour associated with the trainee. Missing evidence is not treated as zero.                    |
| Category State               | Deterministic backend result containing evidence sufficiency and selected `EASY`, `MEDIUM`, or `HARD` difficulty.                                                                 |
| Adaptive Campaign Resolution | Immutable selection for one Campaign Assignment and one adaptive Campaign Item, including selected alternative, content, difficulty, evidence status, basis, and resolution time. |

The backend computes category state and resolves an alternative. A unique assignment-item relationship makes concurrent first resolution converge on one persisted result. Later reads reuse that result instead of asking AI or recalculating a different item.

### 6.6 Activity, Statistics, and Audit

- Quiz attempts and results retain assessment activity in Campaign context.
- Email classification and controlled interaction events retain Simulated Inbox evidence in Campaign context.
- Campaign statistics aggregate the implemented scoped assignment, progress, interaction, and Quiz measures without creating a separate report-export domain.
- Audit records retain truthful actor, target, scope, outcome, timestamp, and redacted metadata for supported sensitive actions.

### 6.7 Key Relationships and Boundaries

- An Organisation owns organisation content and custom Campaigns; platform content and premade Campaigns have no Organisation owner.
- An organisation Campaign may reference eligible platform content or content owned by the same Organisation. Platform Campaigns reference platform-owned content.
- A Campaign Assignment belongs to one Campaign and one Trainee Profile and is unique for that pair.
- Campaign Items reference reusable content; they do not embed full Training Document, Quiz, or Simulation bodies.
- AI-generated Draft data and Campaign proposals are transient application data until an administrator explicitly saves through the normal lifecycle. They are not separate persisted Campaign or reusable-content entities.

---

Previous section: [Quality Requirements](quality-requirements.md)

Next section: [Changelog](changelog.md)
