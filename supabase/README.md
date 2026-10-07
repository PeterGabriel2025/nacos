# NACOS South East Supabase

This folder contains the shared backend configuration and versioned SQL migrations for the public website, admin portal, and invitation-only registration portal.

## Current status

- The linked development database was up to date before the new storage migration; `20261005000100_storage_access.sql` is local and must be reviewed/applied before using the updated upload UI. No real chapter or executive data is seeded.
- No project URL, API key, database password, or service-role key is stored here.
- The registration validator is included in the migrations and is applied to the linked development database.
- The admin portal has Supabase sign-in and server-validated subadmin email invitations. Chapter invitations, application review, chapter edits, leadership records, and media metadata use Supabase.
- The three account-management Edge Functions are local source only; deploy and configure them before using subadmin management.
- `20261005000100_storage_access.sql` configures private image/PDF buckets and permission-gated uploads once applied. Public media gets short-lived signed links only when its record is published; PDFs remain private.

## Schema overview

`20261001000100_initial_schema.sql` defines:

- `chapters` — approved chapter records, visible publicly only after approval and publication.
- `chapter_contacts` — secretary name, phone number, and email address, restricted to chapter managers. The chapter president's display name is public.
- `chapter_applications` — invitation-backed submissions, visible to permitted reviewers only.
- `chapter_invitations` — one-time tokens stored as SHA-256 hashes, with expiry and revocation.
- `application_correction_invitations` — separate one-time links for representatives asked to correct an application.
- `profiles` — roles and explicit permissions associated with Supabase Auth users.
- `leadership_terms`, `executives`, and `media_items` — publishable archive records.
- `audit_log` — actor, entity, action and changed field names; it does not store old/new field values.

Public users receive read access only to published records. Application submission consumes a random one-time invitation token and requires the application email to match the invited contact. Duplicate applications for one institution are blocked while an application is active. Chapter data is copied into the public directory only by the approval function.

Chapter managers may edit approved chapter details, but cannot directly create or delete chapters, or change publication/approval status. New chapters are published through the application approval function.

If a reviewer requests more information, the application is marked `needs_information` with an admin note. A reviewer can then issue a separate correction link, valid for up to seven days. It is bound to that application and may be used once; submitting corrections returns the same application to `pending` without publishing it. The original registration invitation stays consumed. Creating a replacement correction link revokes any earlier unused correction links for that application.

Admin functions require an authenticated profile with the relevant permission. A general admin profile has all permissions. Subadmin permissions are values such as `applications.review`, `chapters.manage`, `leadership.manage`, `media.manage`, `invitations.manage`, `team.manage`, and `audit.read`.

## Important operational decisions

Confirm these decisions with NACOS before loading live records or opening the admin portal for routine use:

1. Confirm chapter identity/duplicate rules and what counts as official verification.
2. Confirm which chapter fields are public. Contact details are separated into `chapter_contacts`; public clients have no access to that table.
3. Confirm subadmin permission boundaries, the correction-link workflow, and administrator bootstrap procedure.
4. Confirm storage bucket names and access restrictions before applying the storage migration. It requires `nacos-south-east` (images) and `nacos-docs` (PDFs) to exist, and resets both to private with the app's MIME and size limits.

The first general-admin account must be created by a trusted project owner in Supabase Auth, then assigned its profile using the SQL below in the Supabase SQL Editor. Replace both example values with the new Auth user's UUID and name:

```sql
insert into public.profiles (id, full_name, role, permissions, is_active)
values ('00000000-0000-0000-0000-000000000000', 'General Admin', 'general_admin', '{}', true);
```

The general admin signs in to the admin portal with that Auth account's email and password. Subadmins are invited by email through the `create-subadmin` Edge Function and set their own password through the emailed link; the admin never creates or sees their password. The Edge Function uses the Supabase service-role key only in its server environment and verifies both the caller's session and active general-admin profile before creating an account. Never place the service-role key in a frontend app.

For admin portal setup, copy `admin/.env.example` to `admin/.env.local` and set the project URL, publishable/anon key, and registration portal URL. Copy the Supabase URL and publishable/anon key into `registration/.env.local` as well. Add the admin site origin plus its `/set-password` path to Supabase Auth's redirect URL allowlist. Deploy the functions with JWT verification enabled (do not use `--no-verify-jwt`) before using Team & access:

```sh
npx supabase secrets set ADMIN_APP_URL=http://127.0.0.1:5175
npx supabase functions deploy create-subadmin list-subadmins manage-subadmin
```

The admin portal loads chapter, application, leadership, and media metadata from Supabase. The general admin can invite subadmins, update their permission sets, and deactivate/reactivate their accounts; these account-management operations are verified by server-side Edge Functions. The storage migration enables admin-only uploads to private buckets; public photo assets are exposed only through expiring signed links after publication, while PDFs remain private. Chapter invitations create a secure one-time link but are not sent by email; the general admin must share the generated link privately.

Do not put a Supabase service-role key in any frontend app or commit credentials. Use separate development and production projects.

## Applying future migrations

For any future migration, use the Supabase CLI, confirm it is linked to the intended development project, then run a dry run and review its output before applying. Do not apply schema changes to production without a separate review.

The project reference is available in the Supabase dashboard URL/settings. The project URL and publishable key are used later in each app's local environment; they are not database passwords.

Before enabling uploads, confirm the bucket IDs are exactly `nacos-south-east` for images and `nacos-docs` for PDFs. From the repository root, check which project is linked and run `npx supabase db push --dry-run`; verify it lists only the reviewed storage migration for the intended development project. Then run `npx supabase db push` to apply it. This migration sets both buckets to private and overwrites their MIME and size settings to the documented limits. After applying, test public access and role restrictions before adding any files.

## Production release gates

The application code is not, by itself, a production deployment. Before opening the service to real users, complete and verify all of the following in the intended production project:

1. Create a separate production Supabase project; confirm the CLI is linked to it before applying reviewed migrations. Never promote development test data or keys.
2. Configure the production admin and registration origins in Supabase Auth's site URL and redirect URL allowlist. Set `ADMIN_APP_URL` to the exact deployed admin origin, then deploy `create-subadmin`, `list-subadmins`, and `manage-subadmin` with JWT verification enabled.
3. Configure and test Supabase Auth email delivery, sender/domain authentication, invite and password-reset redirect links, and delivery monitoring. Do not treat an invitation as delivered until the configured mail provider confirms it.
4. Bootstrap the first general admin through a trusted project owner. Verify sign-in, password reset, profile authorization, and subadmin invitation using designated test accounts before importing records.
5. Verify media upload policies with a media manager account and a non-media subadmin. Confirm anonymous users cannot download unpublished images or any PDF, and that published public images work using short-lived signed links.
6. Verify public anonymous access can read only published chapters, leadership, and media, and cannot read chapter contacts, applications, profiles, invitations, or audit records. Verify each subadmin permission boundary with separate test accounts.
7. Configure hosting with SPA route fallback for each app, HTTPS, production environment variables, and a rollback plan. Set only the Supabase project URL and publishable/anon key in browser apps; never expose the service-role key.
8. Configure database backups/point-in-time recovery, alerting, audit review, and a process for promptly disabling compromised admin accounts.

Until these checks pass, use the project only for controlled testing. The current media UI deliberately does not upload files, and chapter invitations are shared privately by an admin rather than sent through email.
