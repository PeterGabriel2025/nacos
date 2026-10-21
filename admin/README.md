# NACOS South East Admin Portal

Standalone authenticated React + TypeScript + Vite admin workspace for the NACOS South East Supabase project.

## Run locally

```sh
npm install
npm run dev
```

## Current scope

The portal uses Supabase Auth to gate access. Chapter and application records, leadership profiles, and media metadata are loaded from and saved to Supabase. Image/document file upload storage has not been configured.

The general admin can invite subadmins from Team & access. A server-side Supabase Edge Function validates the caller, creates a subadmin Auth account, and sends a password-setup link. Subadmins select their own passwords. The `SUPABASE_SERVICE_ROLE_KEY` is used only by Supabase Edge Functions and must never be put in this app.

## Setup

1. Create `admin/.env.local` from `.env.example` and set the Supabase project URL, publishable/anon key, and deployed public and registration app URLs.
2. Create the first general-admin Auth account in the Supabase dashboard, then insert its `profiles` row as described in `../supabase/README.md`.
3. Add the admin portal origin and `/set-password` callback URL to Supabase Auth's redirect URL allowlist.
4. Set the Edge Function secret `ADMIN_APP_URL` to the exact admin site URL. For local development this is `http://127.0.0.1:5175`.
5. Deploy `create-subadmin`, `list-subadmins`, and `manage-subadmin` with JWT verification enabled before using team management.

## Deploy as a standalone Netlify site

Create a separate Netlify site from this repository for the admin app with these build settings:

- Base directory: `admin`
- Build command: `npm run build`
- Publish directory: `dist`

Set these Netlify environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_REGISTRATION_PORTAL_URL` — the registration Netlify site URL
- `VITE_PUBLIC_SITE_URL` — the public Netlify site URL

After Netlify assigns the admin site URL, add that origin and its `/set-password` callback URL to Supabase Auth's redirect URL allowlist. Set the Supabase Edge Function secret `ADMIN_APP_URL` to the admin site URL. Never add `SUPABASE_SERVICE_ROLE_KEY` to Netlify frontend environment variables.

The general admin can update a subadmin's permissions or deactivate/reactivate their profile from Team & access. Deactivation blocks subsequent permission-checked database operations; it does not delete the account or its audit history.

Chapter invitations create a one-time private link; email delivery is not configured. Share invitation links only with contacts you have verified.

Apply `20261005000100_storage_access.sql` after creating the `nacos-south-east` (images) and `nacos-docs` (PDFs) buckets. It sets both private, configures MIME/size limits and policies: image uploads are limited to JPEG/PNG/WebP up to 5 MB, documents to PDF up to 10 MB, and uploads require `media.manage`. Published image records are served with one-hour signed URLs; PDFs stay private and are available only to media managers through ten-minute signed links. Run the upload UI only against the database where the migration has been applied; use the access tests in `../supabase/README.md` before uploading real content.
