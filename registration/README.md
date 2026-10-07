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

The admin creates random, expiring, single-use invitation links. A link is checked against Supabase before showing the registration form. Submissions are validated again by the database function, saved as pending applications, and require administrator approval before publication. The invitation's email is locked to the invited recipient. Logo selection is still preview-only and no files are uploaded.

## Preview

`/preview` is available in development only and does not submit or save records.

## Validate

```sh
npm run lint
npm run build
```
