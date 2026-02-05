# Deployment Guide - TRI Sandbox V2

## Overview

The v2 app is deployed to **Firebase Hosting** under the `toolkit-playground-ceecf` project.

- **Production URL**: https://toolkit-ui-v2.web.app
- **Firebase Project**: `toolkit-playground-ceecf`
- **Hosting Target**: `v2` → `toolkit-ui-v2`

## Prerequisites

1. **Firebase CLI** installed globally:

   ```bash
   npm install -g firebase-tools
   ```

2. **Authenticated** with Firebase:

   ```bash
   firebase login
   ```

3. **Just** command runner (optional but recommended):
   ```bash
   brew install just
   ```

## Quick Deploy

Using just (recommended):

```bash
cd apps/v2
just deploy
```

Or manually:

```bash
cd apps/v2
pnpm build
firebase deploy --only hosting:v2
```

## Available Commands

| Command            | Description                                         |
| ------------------ | --------------------------------------------------- |
| `just deploy`      | Build and deploy to production                      |
| `just deploy-only` | Deploy without rebuilding (uses existing `.output`) |
| `just preview`     | Create a preview channel deployment                 |
| `just build`       | Build the app for production                        |
| `just validate`    | Run lint, tests, and build validation               |

## Configuration Files

### `.firebaserc`

Defines the Firebase project and hosting targets:

```json
{
  "projects": {
    "default": "toolkit-playground-ceecf"
  },
  "targets": {
    "toolkit-playground-ceecf": {
      "hosting": {
        "v2": ["toolkit-ui-v2"]
      }
    }
  }
}
```

### `firebase.json`

Hosting configuration:

```json
{
  "hosting": {
    "target": "v2",
    "public": ".output/public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Build Output

Nuxt 3 generates static files to `.output/public/` when running:

```bash
pnpm build
```

This is configured in `nuxt.config.ts` with `ssr: false` for client-side rendering.

## Environment Variables

For production deployments, ensure these are configured:

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `INSTANT_APP_ID` - InstantDB app ID

These can be set in Firebase Hosting environment or in a `.env` file before building.

## Troubleshooting

### "Not in a Firebase app directory"

Make sure you're running commands from the `apps/v2` directory, not the monorepo root.

### Target not configured

Run:

```bash
firebase target:apply hosting v2 toolkit-ui-v2 --project toolkit-playground-ceecf
```

### Build fails

1. Clear the build cache: `rm -rf .output .nuxt`
2. Reinstall dependencies: `pnpm install`
3. Try building again: `pnpm build`
