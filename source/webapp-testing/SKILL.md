---
name: webapp-testing
description: Test web applications using Playwright for end-to-end browser testing. Use when testing web UIs, APIs with browser interaction, or verifying frontend behavior.
argument-hint: "[url-or-project-path]"
context: fork
allowed-tools: Bash(*), Read, Glob, Grep, Write, Edit
---

# Webapp Testing

End-to-end browser testing with Playwright. All installation and test execution runs in a distrobox container — never on the Bazzite host.

## Usage

```
/webapp-testing <url-or-project-path>
```

Examples:
- `/webapp-testing http://localhost:3000` — test a running dev server
- `/webapp-testing ~/PROJECTz/my-app` — discover and run existing Playwright tests
- `/webapp-testing http://localhost:8989` — test Sonarr web UI

## Step 1: Setup Playwright in Container

Playwright runs in the `fedora-tools` distrobox container.

```bash
# Enter container:
distrobox enter fedora-tools -- bash

# Install Playwright in the project (inside container):
cd /var/home/yish/<project-path>
npm init playwright@latest --yes
# OR add to existing project:
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

If no project exists, create a minimal test directory:
```bash
mkdir -p /var/home/yish/PROJECTz/e2e-tests/<project-name>
cd /var/home/yish/PROJECTz/e2e-tests/<project-name>
npm init -y
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Start dev server if needed (comment out for external URLs):
  // webServer: {
  //   command: "npm run dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: true,
  //   timeout: 30_000,
  // },
});
```

## Step 2: Server Lifecycle

For projects that need a dev server, use the `webServer` config above. For already-running services (LiteLLM UI, Sonarr, etc.), skip `webServer` and set `BASE_URL`:

```bash
# Run tests against running service:
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/<project-path>
  BASE_URL=http://localhost:8989 npx playwright test
"
```

Wait-for-ready pattern when starting a server manually:

```bash
# Start server in background, wait for port, run tests, teardown
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/<project-path>
  npm run dev &
  SERVER_PID=\$!
  npx wait-on http://localhost:3000 --timeout 30000
  npx playwright test
  kill \$SERVER_PID
"
```

## Step 3: Test Patterns

### Navigation and page load

```typescript
import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/My App/);
  await expect(page.locator("h1")).toBeVisible();
});
```

### Form filling

```typescript
test("login form", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard");
});
```

### API response assertion

```typescript
test("API returns data", async ({ page }) => {
  const response = await page.request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty("status", "ok");
});
```

### Waiting strategies

```typescript
// Wait for element (preferred over arbitrary sleep):
await page.waitForSelector(".loaded-indicator");
await expect(page.locator(".data-table")).toBeVisible({ timeout: 10_000 });

// Wait for network idle:
await page.waitForLoadState("networkidle");

// Wait for specific URL:
await page.waitForURL("**/dashboard");
```

### Screenshots for debugging

```typescript
// On failure (auto via config), or manually:
await page.screenshot({ path: "debug-screenshot.png", fullPage: true });
```

## Step 4: Run Tests

```bash
# Run all tests (headless):
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/<project-path>
  npx playwright test
"

# Run specific test file:
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/<project-path>
  npx playwright test tests/login.spec.ts
"

# Run headed (visible browser — needs display):
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/<project-path>
  DISPLAY=:0 npx playwright test --headed
"

# Debug mode (step through):
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/<project-path>
  DISPLAY=:0 npx playwright test --debug
"
```

## Step 5: View Results

```bash
# Open HTML report:
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/<project-path>
  npx playwright show-report
"
# Report available at http://localhost:9323
```

## Common Selectors

Prefer user-facing locators over CSS/XPath:

| Pattern | Usage |
|---|---|
| `page.getByRole('button', { name: 'Submit' })` | Buttons, links by ARIA role |
| `page.getByLabel('Email')` | Form fields by label |
| `page.getByText('Welcome')` | Visible text content |
| `page.getByTestId('submit-btn')` | `data-testid` attributes |
| `page.locator('.class-name')` | CSS selector (fallback) |

## CI Integration

For running in GitHub Actions or similar pipelines, Playwright supports containerized CI natively. Add to `.github/workflows/e2e.yml`:

```yaml
- name: Run Playwright tests
  run: npx playwright test
  env:
    BASE_URL: http://localhost:3000
- name: Upload test report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

Since this project uses distrobox, CI runs inside the same `fedora-tools` container image — no separate CI environment needed.
