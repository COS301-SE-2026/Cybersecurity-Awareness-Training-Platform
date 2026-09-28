# Demo 4 Use-Case Diagrams

These Mermaid diagrams provide the editable and repository-rendered overview for implemented Demo 4 use cases. Detailed preconditions, flows, exceptions, postconditions, and requirement links remain in the [Use Cases](../../../srs/use-cases.md).

## Account and Organisation Access

```mermaid
flowchart LR
  Visitor((Visitor)) --> Register[Register and verify]
  User((Account holder)) --> Login[Log in and out]
  User --> Recover[Recover account access]
  User --> Account[Manage account security]
  Representative((Organisation representative)) --> Request[Request organisation registration]
  PlatformAdmin((Platform administrator)) --> Review[Review registration]
  Invitee((Invitee)) --> Setup[Complete setup or invitation]
  OrgAdmin((Organisation administrator)) --> People[Manage people and security]
  PlatformAdmin --> Lifecycle[Manage organisation lifecycle]
```

## Trainee Campaign Participation

```mermaid
flowchart LR
  Trainee((Trainee)) --> Campaigns[View available Campaigns]
  Individual((Individual trainee)) --> Discover[Browse and self-enrol]
  Campaigns --> Document[Complete Training Document]
  Campaigns --> Quiz[Complete repeated Quiz attempts]
  Campaigns --> Inbox[Use Simulated Inbox]
  Quiz --> Results[Review results and feedback]
  Campaigns --> Adaptive[Receive persisted adaptive alternative]
```

## Content and Campaign Administration

```mermaid
flowchart LR
  Creator((Authorised creator)) --> Document[Author Training Document]
  Creator --> Quiz[Author Quiz]
  Creator --> Email[Author Organisation Email]
  Email --> Inbox[Compose Simulated Inbox]
  Manager((Campaign manager)) --> Build[Build Campaign]
  Build --> Group[Group and order items]
  Build --> Adaptive[Configure adaptive item]
  Build --> Copy[Copy Active Campaign to Draft]
  Assigner((Assignment administrator)) --> Assign[Assign or unassign selected trainee]
  Manager --> Stats[Review Campaign statistics]
```

## AI-Assisted Administration

```mermaid
flowchart LR
  Admin((Authorised administrator)) --> Generate[Generate editable builder Draft]
  Admin --> Variant[Generate missing difficulty variant]
  Admin --> Complete[Review complete Campaign proposal]
  Admin --> FollowUp[Review trainee follow-up proposal]
  Generate --> Review[Human review and edit]
  Variant --> Review
  Complete --> Review
  FollowUp --> Review
  Review --> Save[Explicit normal save]
  Save --> Lifecycle[Explicit activation or publication]
  Lifecycle --> Select[Manual Campaign selection]
```

Back to the [Demo 4 Use Cases](../../../srs/use-cases.md).
