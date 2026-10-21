# NACOS South East Chapter Registration Portal

Standalone React + TypeScript + Vite app for invitation-only chapter registration.

## Run locally

```sh
npm install
npm run dev
```

The Vite dev server uses `http://127.0.0.1:5174/`.

## Supabase setup

Create `.env.local` from `.env.example` and set the same Supabase project URL and publishable/anon key used by the admin app. The database migration `20261001153500_validate_chapter_invitation.sql` must be applied before invitation links can be validated.

## Deploy to Netlify

Create a Netlify site for this repository with **Base directory** `registration`, **Build command** `npm run build`, and **Publish directory** `dist`. The included `_redirects` rule supports direct invitation URLs such as `/invite/<token>` and page refreshes.

Set these Netlify environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The admin creates random, expiring, single-use invitation links pointing to the registration site. A link is checked against Supabase before showing the registration form. Submissions are validated again by the database function, saved as pending applications, and require administrator approval before publication. The invitation's email is locked to the invited recipient. The logo picker is preview-only; registration does not upload files. Media uploads are handled in the admin app and require the `media.manage` permission.

## Preview

`/preview` is available in development only and does not submit or save records.

## Validate

```sh
npm run lint
npm run build
```
