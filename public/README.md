# NACOS South East Public Frontend

Public NACOS South East chapters and leadership site built with React, TypeScript and Vite. Published chapters, leadership records and media metadata load from the shared Supabase project. The client only uses the public publishable/anon key and reads records permitted by Supabase row-level security.

## Run locally

```sh
npm install
npm run dev
```

## Supabase setup

Copy `.env.example` to `.env.local`, set the Supabase project URL and publishable/anon key, and set the registration portal URL. Restart the dev server after changing environment values. The database migrations must be applied to that same project. If configuration or a data request fails, the page displays an explicit error rather than substituting sample records.

The public app requests only approved, published chapters, published leadership terms/executives, and published non-document media metadata. It never requests chapter contacts, applications, profiles, invitation tokens, PDFs, or audit records. Published archive photos are loaded using one-hour signed links from the private media bucket.

## Deploy to Netlify

Create a Netlify site for this repository with **Base directory** `public`, **Build command** `npm run build`, and **Publish directory** `dist`.

Set these Netlify environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_REGISTRATION_PORTAL_URL` — `https://nacos-reg.netlify.app/`

## Validate

```sh
npm run lint
npm run build
```

## Included pages

- Overview
- Chapters directory with search and state filters
- Chapter details
- Zonal leadership archive and executive profiles
- Historical media archive with year/category filters

Chapter registration is hosted as its own app in the sibling `registration/` folder. Set `VITE_REGISTRATION_PORTAL_URL` when deploying this site to point its registration links to the portal.
