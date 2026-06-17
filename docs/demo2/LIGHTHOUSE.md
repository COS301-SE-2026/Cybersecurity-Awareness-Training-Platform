# Lighthouse CI - Accessibility and Frontend Quality Checks

Lighthouse CI (LHCI) is integrated into our continuous integration suite to run repeatable accessibility and quality checks on the Trainee portal's public and static routes.

During **Sprint 3**, these audits run in an informational, non-blocking mode.

---

## Targeted Routes

The audit scans the following static/public routes:

- **Status Page:** `http://127.0.0.1:4173/status` (Health indicators for backend/frontend connectivity)
- **Login Page:** `http://127.0.0.1:4173/login` (Authentication portal)
- **Registration Page:** `http://127.0.0.1:4173/register` (Trainee registration)

> [!NOTE]
> Authenticated routes are currently out of scope to avoid dependencies on unstable authentication state or Playwright helpers. They will be added in a future phase once authentication states stabilize.

---

## Quality Thresholds

Configuration details are specified in [apps/frontend/lighthouserc.json](../../apps/frontend/lighthouserc.json). The starter expectations are:

| Category                 | Target Score       | Action on Failure | Rationale / Notes                                                                                                |
| ------------------------ | ------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Accessibility (a11y)** | **0.90** (90%)     | Warning (Exits 0) | Core focus. Evaluates high-contrast colors, aria-labels, semantic layout structure, and focus visibility.        |
| **Best Practices**       | **0.80** (80%)     | Warning (Exits 0) | Ensures modern coding standards, security headers, and clean APIs.                                               |
| **SEO**                  | **0.80** (80%)     | Warning (Exits 0) | Checks crawlability, meta title tag availability, structure, etc.                                                |
| **Performance**          | _Disabled_ (`off`) | None              | Performance testing on headless CI virtualization is inherently unstable. Disabled here to prevent flaky builds. |

---

## How to Review Reports

When the CI workflow finishes, audit reports are preserved as a GitHub Action artifact.

1. Go to the **Actions** tab of the repository and select the relevant **Lighthouse CI** workflow run.
2. Under the **Artifacts** section at the bottom, click **lighthouse-reports** to download the archive.
3. Extract the downloaded `.zip` file.
4. Locate the `.html` files in the extracted directory (e.g., `lhr-<hash>.html`).
5. Open these files in any web browser to view the detailed Lighthouse audit, including specific warnings, failing DOM elements, and improvement suggestions.

---

## Transitioning to a Blocking Quality Gate

To prevent accessibility regressions, the Lighthouse checks can be configured to block pull request merges in future sprints.

### Step 1: Enforce CLI Failure Exit Codes

By default, the workflow ignores failures. If we want LHCI to exit with a non-zero exit code when thresholds are missed, we modify `.github/workflows/lighthouse.yml` to set:

```yaml
- name: Run Lighthouse CI
  run: pnpm --filter @insightful-phish/frontend lighthouse
  # Remove or set to false:
  # continue-on-error: false
```

### Step 2: Configure Branch Protection Rules

1. In the GitHub Repository settings, navigate to **Branches**.
2. Click **Edit** next to the `main` or `dev` branch protection rule.
3. Check **Require status checks to pass before merging**.
4. Search for and select the **Lighthouse Audit** check.
5. Save changes.

---

## Local Audits

Developers are encouraged to run Lighthouse checks locally to audit pages before pushing code.

### Prerequisites

Make sure Google Chrome (or Chromium) is installed on your local machine.

### Execution Steps

1. Build the packages (since Lighthouse runs against compiled static files):
   ```bash
   pnpm build
   ```
2. Run the audit script:
   ```bash
   pnpm --filter @insightful-phish/frontend lighthouse
   ```
3. Locate local reports in:
   ```bash
   apps/frontend/.lighthouseci/
   ```
4. Open the generated HTML files directly in your web browser.
