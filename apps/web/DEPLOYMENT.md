# Deployment Guide - Trellis Web App

## Overview

The Trellis web app is deployed to **Firebase Hosting** under the Trellis project.

- **Production URL**: (TBD)
- **Firebase Project**: `trellis-web` (update when provisioned)
- **Hosting Target**: `v2` → `trellis-web`

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
cd apps/web
just deploy
```

Or manually:

```bash
cd apps/web
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

Defines the Firebase project and hosting targets (update when Trellis project is provisioned):

```json
{
  "projects": {
    "default": "trellis-web"
  },
  "targets": {
    "trellis-web": {
      "hosting": {
        "v2": ["trellis-web"]
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
- `INSTANTDB_APP_ID` - InstantDB app ID

These can be set in Firebase Hosting environment or in a `.env` file before building.

## Troubleshooting

### "Not in a Firebase app directory"

Make sure you're running commands from the `apps/web` directory, not the monorepo root.

### Target not configured

Run (once project exists):

```bash
firebase target:apply hosting v2 trellis-web --project trellis-web
```

### Build fails

1. Clear the build cache: `rm -rf .output .nuxt`
2. Reinstall dependencies: `pnpm install`
3. Try building again: `pnpm build`
