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
- Do not work in another developer's branch unless you have very good reason to do so.

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

Husky is set up to enforce this format on branch names: Since Husky runs locally though, you'll get a warning when you checkout a branch that is named incorrectly, and you will not be able to commit or push to branches that are not named correctly. Please rename your branch to a name that follows the format above (locally and remotely) before continuing work.

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

## Merge strategy

We use merge commits only when merging pull requests.

This means pull requests should be merged using the normal merge option, and not squash merge or rebase merge.

We use merge commits because:

- They preserve the full branch history instead of collapsing a branch into a single commit.
- They make it easier to see how work moved from a working branch into `dev`, and from `dev` into `main`.
- They keep the relationship between commits and pull requests clearer.
- They make it easier to track the real development history across branches.
- They reduce the risk of losing useful commit-level context when a branch contains multiple meaningful commits.
- They make it easier to review integration history later when debugging, auditing, or preparing for demos.

## Commit messages

The format of commit messages should follow the pattern:

`<type>: <description>`

Example:

`feat: add user authentication`

Allowed commit types:

- `feat`: a new feature
- `fix`: a bug fix
- `docs`: documentation changes
- `chore`: maintenance, cleanup, or refactoring work that does not add a feature or fix a bug

Write commit messages in a clear, concise, and descriptive way.

Scopes are not allowed in commit messages.

Allowed:

- `feat: add user authentication`
- `fix: correct database health check`
- `docs: update setup instructions`
- `chore: set up repo foundation`

Not allowed:

- `feat(auth): add user authentication`
- `fix(api): correct database health check`

`Co-authored-by:` trailers are not allowed in commit messages. This helps ensure commits are attributed only to the team member who made and understands the change.

Husky and commitlint are set up to enforce this format on commit messages, so if you try to commit with a message that does not follow this format, the commit will be rejected until you fix the message.

## Documentation and code commits

Keep documentation-only changes separate from code and configuration changes.

Rules:

- If a commit includes Markdown documentation files (`.md`), the commit message type must be `docs`.
- If a commit includes Markdown documentation files, it should not include code or configuration changes.
- If a commit includes code or configuration changes, it should not include Markdown documentation changes.

Examples:

- Use `docs: update setup instructions` for changes to files such as [README.md](README.md), [GITHUB_RULES.md](GITHUB_RULES.md), or files in [docs/](docs/).
- Use `feat: add health endpoint`, `fix: correct database connection check`, or `chore: update tooling` for code, configuration, scripts, workflows, or package changes.

This separation helps keep the Git history clear and helps prevent code-related work from being ignored or misclassified by Hyperperform.

## Final note

Some of these rules are enforced locally through Husky, lint-staged, and commitlint. Other rules still depend on team discipline and careful pull request review. Everyone is expected to follow them consistently. If a situation comes up where an exception seems necessary, discuss it with the team first before proceeding.
