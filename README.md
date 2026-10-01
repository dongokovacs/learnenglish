# Angol jelzok

Static learning app with Vercel serverless authentication.

## Vercel setup

In the Vercel project settings, add these environment variables for Production and Preview:

- `DANI_PASSWORD`: Dani's password. Use a unique password with at least 16 characters; `123456` is not safe on a public website.
- `DEMO_PASSWORD`: password for the shared demo profile. Treat this account as public; its progress is not private.
- `SESSION_SECRET`: a random secret of at least 32 bytes. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.

Redeploy after adding or changing environment variables. The app fails closed when a profile password or the session secret is missing. The server stores a signed, seven-day, HttpOnly session cookie; passwords are never sent to browser storage.

The current learning progress remains in browser `localStorage`, separated by profile. It is not synchronized between devices or browsers yet.

## Local development

Use Vercel CLI so `/api/auth` runs as a serverless function. Put local credentials in `.env.local` (ignored by Git), then run `vercel dev`.

Run auth tests with `node --test tests/auth.test.js`.