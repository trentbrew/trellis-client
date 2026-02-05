# Test Helpers

## Auth Bypass

The auth bypass feature allows you to skip authentication in automated tests. This is **only enabled in dev/test environments** and will never work in production.

### Usage

#### Option 1: URL Query Parameter (Recommended for Playwright)

```typescript
import { gotoWithAuthBypass } from './helpers/auth-bypass';

test('my test', async ({ page }) => {
  await gotoWithAuthBypass(page, '/collections');
  // Your test code here
});
```

#### Option 2: Environment Variable

Set `ENABLE_TEST_AUTH_BYPASS=true` in your environment:

```bash
ENABLE_TEST_AUTH_BYPASS=true npm run test:e2e
```

#### Option 3: Manual URL

Navigate to any page with `?testAuthBypass=true`:

```
http://localhost:4444/collections?testAuthBypass=true
```

### Available Helpers

- `enableAuthBypass(page)` - Enable bypass on current page
- `disableAuthBypass(page)` - Disable bypass on current page
- `gotoWithAuthBypass(page, path)` - Navigate to path with bypass enabled
- `setupAuthBypassContext(page)` - Get helper object for managing bypass

### Example Test

```typescript
import { test, expect } from '@playwright/test';
import { gotoWithAuthBypass } from './helpers/auth-bypass';

test('can view collections with auth bypass', async ({ page }) => {
  await gotoWithAuthBypass(page, '/collections');

  // Now you can test without needing real authentication
  await expect(page.locator('h1')).toBeVisible();
});
```

### Security Notes

⚠️ **IMPORTANT**: This feature is automatically disabled in production builds. The bypass will:

- Only work when `import.meta.prod === false`
- Only work when `ENABLE_TEST_AUTH_BYPASS=true` OR `?testAuthBypass=true` is present
- Create a mock user that doesn't interact with the real database
- Skip all database operations in bypass mode

### How It Works

1. The auth middleware checks if bypass is enabled
2. If enabled, it creates a mock user instead of checking real auth
3. The InstantDB plugin returns a mock instance that doesn't connect to the real database
4. All database operations are skipped in bypass mode

This allows you to test UI components and flows without needing to set up real authentication or database connections.
