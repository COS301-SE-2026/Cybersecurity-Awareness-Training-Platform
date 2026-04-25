# GitHub Rules

We cannot enforce branch protection directly in the repository settings, so everyone must follow the rules in this document to maintain code quality, review discipline, and branch stability.

## Branching strategy

We use short-lived branches for all work.

- `main` must always stay deployable.
- `dev` is the integration branch.
- All normal work starts on a feature, fix, docs, or chore branch created from `dev`.
- Changes must flow from feature branches into `dev`, and then from `dev` into `main`.

Do not bypass this flow.

## Branch rules

### `main`

Direct pushes to `main` are not allowed.

All changes must reach `main` through a pull request from `dev`.

Required reviewers:
- Team Lead
- At least one additional team member, depending on which part of the codebase was changed

Rules:
- `main` is the production-ready branch.
- Everything in `main` must be fully working, tested, reviewed, and ready for deployment.
- Only stable, reviewed changes from `dev` may be merged into `main`.
- Every pull request into `main` must be approved by the required reviewers before it is merged.

### `dev`

Direct pushes to `dev` are not allowed.

All changes must reach `dev` through a pull request from a working branch.

Required reviewers:
- At least two team members
- One of these should usually be the Team Lead, and the other should be someone familiar with the area of the code being changed.

Rules:
- `dev` is the integration branch where completed work is combined.
- Code merged into `dev` must be in a working state.
- Before merging, the developer must ensure the change has been tested appropriately.
- Every pull request into `dev` must be approved by at least two team members before it is merged.

### Working branches

Direct pushes to working branches are allowed for the developer responsible for that branch.

Rules:
- Working branches must be created from `dev`.
- Use working branches for features, bug fixes, documentation changes, and chore work.
- Once the work is ready and has been tested appropriately, open a pull request into `dev`.
- Do not merge a working branch into `main` directly.

## Branch naming conventions

Use the closest matching prefix for your branch name.

- Feature branches: `feature/description/developer`
  - Example: `feature/user-authentication/johan`
- Documentation branches: `docs/description/developer`
  - Example: `docs/api-documentation/johan`
- Bug fix branches: `fix/description/developer`
  - Example: `fix/login-issue/johan`
- Chore branches: `chore/description/developer`
  - Example: `chore/update-dependencies/johan`

Keep branch names short, clear, and descriptive.

## Pull request rules

Before opening a pull request:
- Make sure your branch is up to date with `dev` to minimise merge conflicts.
- Test your changes locally as appropriate.
- Remove unrelated or accidental changes.
- Make sure the scope of the pull request is clear and focused.

When opening a pull request:
- Fill in the pull request template properly.
- Link the related issue where applicable.
- Add the required reviewers manually.
- Clearly note the main files or areas that need review.

Before merging a pull request:
- Required reviewers must approve it.
- The author should resolve review comments or respond clearly to them.
- The branch should be safe to merge without knowingly breaking `dev` or `main`.

## Commit messages

If at all possible, use the format below for commit messages. This helps maintain a clear history and makes it easier to understand the purpose of each change.

`<type>: <description>`

Example:

`feat: add user authentication`

Allowed commit types:
- `feat`: a new feature
- `fix`: a bug fix
- `docs`: documentation changes
- `chore`: maintenance, cleanup, or refactoring work that does not add a feature or fix a bug

Write commit messages in a clear, concise, and descriptive way.

## Final note

Because these rules are enforced by team discipline rather than repository settings, everyone is expected to follow them consistently. If a situation comes up where an exception seems necessary, discuss it with the team first before proceeding.