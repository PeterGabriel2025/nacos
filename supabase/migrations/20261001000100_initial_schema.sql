create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  institution_name text not null,
  state text not null check (state in ('Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo')),
  institution_address text not null,
  institution_type text not null,
  established_year integer not null check (established_year between 1900 and 2100),
  president_name text not null,
  active_members integer not null default 0 check (active_members >= 0),
  description text not null,
  social_url text,
  logo_path text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  is_published boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapters_approval_publication_check
    check (not is_published or (status = 'approved' and approved_at is not null)),
  constraint chapters_social_url_protocol_check
    check (social_url is null or social_url ~* '^https?://')
);

create table public.chapter_contacts (
  chapter_id uuid primary key references public.chapters (id) on delete cascade,
  secretary_name text not null,
  contact_phone text not null,
  contact_email text not null,
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'subadmin' check (role in ('general_admin', 'subadmin', 'chapter_representative')),
  chapter_id uuid references public.chapters (id) on delete set null,
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_representative_requires_chapter
    check (role <> 'chapter_representative' or chapter_id is not null)
);

create table public.chapter_invitations (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters (id) on delete restrict,
  recipient_email text not null,
  recipient_phone text,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint invitation_expiry_after_creation check (expires_at > created_at)
);

create table public.chapter_applications (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.chapter_invitations (id) on delete restrict,
  chapter_id uuid references public.chapters (id) on delete restrict,
  chapter_name text not null,
  institution_name text not null,
  state text not null check (state in ('Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo')),
  institution_address text not null,
  institution_type text not null,
  established_year integer not null check (established_year between 1900 and 2100),
  president_name text not null,
  secretary_name text not null,
  contact_phone text not null,
  contact_email text not null,
  active_members integer not null check (active_members >= 0),
  description text not null,
  social_url text,
  logo_path text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'needs_information', 'approved', 'rejected')),
  constraint chapter_applications_social_url_protocol_check
    check (social_url is null or social_url ~* '^https?://'),
  admin_notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_correction_invitations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.chapter_applications (id) on delete restrict,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint correction_invitation_expiry_after_creation check (expires_at > created_at)
);

create table public.leadership_terms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_year integer not null check (start_year between 1900 and 2100),
  end_year integer not null check (end_year between start_year and 2101),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (start_year, end_year)
);

create table public.executives (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.leadership_terms (id) on delete restrict,
  full_name text not null,
  position text not null,
  institution text not null,
  state text not null check (state in ('Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo')),
  photograph_path text,
  biography text,
  is_published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('leadership', 'events', 'community', 'documents')),
  year integer not null check (year between 1900 and 2101),
  file_path text,
  thumbnail_path text,
  mime_type text,
  is_published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_table text not null,
  entity_id text not null,
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index chapters_public_directory_idx
  on public.chapters (state, name)
  where status = 'approved' and is_published;
create index chapter_applications_review_idx
  on public.chapter_applications (status, created_at desc);
create index application_correction_invitations_application_idx
  on public.application_correction_invitations (application_id, created_at desc);
create unique index chapter_applications_one_active_per_institution_idx
  on public.chapter_applications (lower(btrim(institution_name)))
  where status in ('pending', 'under_review', 'needs_information');
create unique index chapters_one_active_per_institution_idx
  on public.chapters (lower(btrim(institution_name)))
  where status in ('pending', 'approved');
create index executives_public_term_idx
  on public.executives (term_id, display_order)
  where is_published;
create index media_public_archive_idx
  on public.media_items (year desc, category)
  where is_published;
create index invitations_chapter_idx
  on public.chapter_invitations (chapter_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.set_chapter_approval_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'approved' and new.is_published and new.approved_at is null then
    new.approved_at := now();
  end if;
  return new;
end;
$$;

create function public.current_user_has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and (
        p.role = 'general_admin'
        or required_permission = any (p.permissions)
      )
  );
$$;

create function public.audit_record_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row jsonb;
  after_row jsonb;
  row_id text;
  changed text[];
begin
  if tg_op = 'INSERT' then
    after_row := to_jsonb(new);
    row_id := coalesce(after_row ->> 'id', after_row ->> 'chapter_id');
    changed := array(select jsonb_object_keys(after_row));
  elsif tg_op = 'UPDATE' then
    before_row := to_jsonb(old);
    after_row := to_jsonb(new);
    row_id := coalesce(after_row ->> 'id', after_row ->> 'chapter_id');
    select coalesce(array_agg(key), '{}')
      into changed
      from jsonb_object_keys(after_row) as keys(key)
      where before_row -> key is distinct from after_row -> key
        and key not in ('updated_at');
  else
    before_row := to_jsonb(old);
    row_id := coalesce(before_row ->> 'id', before_row ->> 'chapter_id');
    changed := array(select jsonb_object_keys(before_row));
  end if;

  insert into public.audit_log (actor_id, action, entity_table, entity_id, changed_fields)
  values ((select auth.uid()), tg_op, tg_table_name, row_id, coalesce(changed, '{}'));

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create function public.create_chapter_invitation(
  recipient_email text,
  recipient_phone text default null,
  target_chapter_id uuid default null,
  expires_in_hours integer default 168
)
returns table (invitation_id uuid, invite_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text;
  new_invitation_id uuid;
  invitation_expiry timestamptz;
begin
  if not public.current_user_has_permission('invitations.manage') then
    raise exception 'Not authorized to create invitations' using errcode = '42501';
  end if;

  if recipient_email is null or length(btrim(recipient_email)) < 5
     or position('@' in recipient_email) < 2 then
    raise exception 'A valid recipient email is required' using errcode = '22023';
  end if;

  if expires_in_hours < 1 or expires_in_hours > 720 then
    raise exception 'Invitation expiry must be between 1 and 720 hours' using errcode = '22023';
  end if;

  if target_chapter_id is not null and not exists (
    select 1 from public.chapters c where c.id = target_chapter_id
  ) then
    raise exception 'Chapter was not found' using errcode = '22023';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  invitation_expiry := now() + make_interval(hours => expires_in_hours);

  insert into public.chapter_invitations (
    chapter_id, recipient_email, recipient_phone, token_hash, expires_at, created_by
  )
  values (
    target_chapter_id,
    lower(btrim(recipient_email)),
    nullif(btrim(recipient_phone), ''),
    extensions.digest(raw_token, 'sha256'),
    invitation_expiry,
    (select auth.uid())
  )
  returning id into new_invitation_id;

  return query select new_invitation_id, raw_token, invitation_expiry;
end;
$$;

create function public.submit_chapter_application(invitation_token text, application jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_row public.chapter_invitations%rowtype;
  application_id uuid;
  institution_year integer;
  members_count integer;
  app_state text;
begin
  if invitation_token is null or invitation_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invitation is invalid or expired' using errcode = '22023';
  end if;

  if jsonb_typeof(application) <> 'object' then
    raise exception 'Application data must be a JSON object' using errcode = '22023';
  end if;

  select *
    into invitation_row
    from public.chapter_invitations i
    where i.token_hash = extensions.digest(invitation_token, 'sha256')
    for update;

  if not found
     or invitation_row.used_at is not null
     or invitation_row.revoked_at is not null
     or invitation_row.expires_at <= now() then
    raise exception 'Invitation is invalid or expired' using errcode = '22023';
  end if;

  if lower(btrim(coalesce(application ->> 'contact_email', '')))
      <> lower(invitation_row.recipient_email) then
    raise exception 'Application email must match the invited contact' using errcode = '22023';
  end if;

  app_state := application ->> 'state';
  if app_state is null or app_state not in ('Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo') then
    raise exception 'Select a valid South East state' using errcode = '22023';
  end if;

  if coalesce(length(btrim(application ->> 'chapter_name')), 0) = 0
     or coalesce(length(btrim(application ->> 'institution_name')), 0) = 0
     or coalesce(length(btrim(application ->> 'institution_address')), 0) = 0
     or coalesce(length(btrim(application ->> 'institution_type')), 0) = 0
     or coalesce(length(btrim(application ->> 'president_name')), 0) = 0
     or coalesce(length(btrim(application ->> 'secretary_name')), 0) = 0
     or coalesce(length(btrim(application ->> 'contact_phone')), 0) = 0
     or coalesce(length(btrim(application ->> 'description')), 0) < 20 then
    raise exception 'One or more required application fields are missing' using errcode = '22023';
  end if;

  if length(application ->> 'chapter_name') > 160
     or length(application ->> 'institution_name') > 240
     or length(application ->> 'institution_address') > 500
     or length(application ->> 'institution_type') > 100
     or length(application ->> 'president_name') > 160
     or length(application ->> 'secretary_name') > 160
     or length(application ->> 'contact_phone') > 40
     or length(application ->> 'contact_email') > 254
     or length(application ->> 'description') > 500
     or length(coalesce(application ->> 'social_url', '')) > 2048 then
    raise exception 'One or more application fields exceed the allowed length' using errcode = '22023';
  end if;

  if position('@' in application ->> 'contact_email') < 2
     or position('.' in split_part(application ->> 'contact_email', '@', 2)) < 2 then
    raise exception 'A valid contact email is required' using errcode = '22023';
  end if;

  if nullif(btrim(application ->> 'social_url'), '') is not null
     and btrim(application ->> 'social_url') !~* '^https?://' then
    raise exception 'Social media links must use http or https' using errcode = '22023';
  end if;

  if coalesce(application ->> 'established_year', '') !~ '^[0-9]{4}$'
     or coalesce(application ->> 'active_members', '') !~ '^[0-9]{1,7}$' then
    raise exception 'Year established or member count is invalid' using errcode = '22023';
  end if;

  institution_year := (application ->> 'established_year')::integer;
  members_count := (application ->> 'active_members')::integer;

  if institution_year < 1900 or institution_year > extract(year from now())::integer
     or members_count < 0 then
    raise exception 'Year established or member count is outside the allowed range' using errcode = '22023';
  end if;

  if invitation_row.chapter_id is null and exists (
    select 1 from public.chapters c
    where lower(btrim(c.institution_name)) = lower(btrim(application ->> 'institution_name'))
      and c.status in ('pending', 'approved')
  ) then
    raise exception 'A chapter already exists for this institution. Contact NACOS to update its record.' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.chapter_applications a
    where lower(btrim(a.institution_name)) = lower(btrim(application ->> 'institution_name'))
      and a.status in ('pending', 'under_review', 'needs_information')
  ) then
    raise exception 'An application for this institution is already under review.' using errcode = '23505';
  end if;

  insert into public.chapter_applications (
    invitation_id, chapter_id, chapter_name, institution_name, state,
    institution_address, institution_type, established_year, president_name,
    secretary_name, contact_phone, contact_email, active_members, description, social_url
  )
  values (
    invitation_row.id, invitation_row.chapter_id,
    btrim(application ->> 'chapter_name'),
    btrim(application ->> 'institution_name'),
    app_state,
    btrim(application ->> 'institution_address'),
    btrim(application ->> 'institution_type'),
    institution_year,
    btrim(application ->> 'president_name'),
    btrim(application ->> 'secretary_name'),
    btrim(application ->> 'contact_phone'),
    lower(btrim(application ->> 'contact_email')),
    members_count,
    btrim(application ->> 'description'),
    nullif(btrim(application ->> 'social_url'), '')
  )
  returning id into application_id;

  update public.chapter_invitations
    set used_at = now()
    where id = invitation_row.id;

  return application_id;
end;
$$;

create function public.create_application_correction_invitation(
  target_application_id uuid,
  expires_in_hours integer default 72
)
returns table (invitation_id uuid, invite_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.chapter_applications%rowtype;
  raw_token text;
  new_invitation_id uuid;
  invitation_expiry timestamptz;
begin
  if not public.current_user_has_permission('applications.review') then
    raise exception 'Not authorized to create correction invitations' using errcode = '42501';
  end if;

  if expires_in_hours < 1 or expires_in_hours > 168 then
    raise exception 'Correction invitation expiry must be between 1 and 168 hours' using errcode = '22023';
  end if;

  select *
    into application_row
    from public.chapter_applications a
    where a.id = target_application_id
    for update;

  if not found or application_row.status <> 'needs_information' then
    raise exception 'Application must be marked as needing information before a correction invitation can be created' using errcode = '22023';
  end if;

  update public.application_correction_invitations
    set revoked_at = now()
    where application_id = target_application_id
      and used_at is null
      and revoked_at is null;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  invitation_expiry := now() + make_interval(hours => expires_in_hours);

  insert into public.application_correction_invitations (
    application_id, token_hash, expires_at, created_by
  )
  values (
    target_application_id,
    extensions.digest(raw_token, 'sha256'),
    invitation_expiry,
    (select auth.uid())
  )
  returning id into new_invitation_id;

  return query select new_invitation_id, raw_token, invitation_expiry;
end;
$$;

create function public.update_chapter_application_with_correction(
  correction_token text,
  application jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  correction_row public.application_correction_invitations%rowtype;
  application_row public.chapter_applications%rowtype;
  app_state text;
  institution_year integer;
  members_count integer;
begin
  if correction_token is null or correction_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Correction link is invalid or expired' using errcode = '22023';
  end if;

  if jsonb_typeof(application) <> 'object' then
    raise exception 'Application data must be a JSON object' using errcode = '22023';
  end if;

  select *
    into correction_row
    from public.application_correction_invitations i
    where i.token_hash = extensions.digest(correction_token, 'sha256')
    for update;

  if not found
     or correction_row.used_at is not null
     or correction_row.revoked_at is not null
     or correction_row.expires_at <= now() then
    raise exception 'Correction link is invalid or expired' using errcode = '22023';
  end if;

  select *
    into application_row
    from public.chapter_applications a
    where a.id = correction_row.application_id
    for update;

  if not found or application_row.status <> 'needs_information' then
    raise exception 'This application is not awaiting corrections' using errcode = '22023';
  end if;

  if lower(btrim(coalesce(application ->> 'contact_email', '')))
      <> lower(application_row.contact_email) then
    raise exception 'The invited contact email cannot be changed through a correction link' using errcode = '22023';
  end if;

  app_state := application ->> 'state';
  if app_state is null or app_state not in ('Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo') then
    raise exception 'Select a valid South East state' using errcode = '22023';
  end if;

  if coalesce(length(btrim(application ->> 'chapter_name')), 0) = 0
     or coalesce(length(btrim(application ->> 'institution_name')), 0) = 0
     or coalesce(length(btrim(application ->> 'institution_address')), 0) = 0
     or coalesce(length(btrim(application ->> 'institution_type')), 0) = 0
     or coalesce(length(btrim(application ->> 'president_name')), 0) = 0
     or coalesce(length(btrim(application ->> 'secretary_name')), 0) = 0
     or coalesce(length(btrim(application ->> 'contact_phone')), 0) = 0
     or coalesce(length(btrim(application ->> 'description')), 0) < 20 then
    raise exception 'One or more required application fields are missing' using errcode = '22023';
  end if;

  if length(application ->> 'chapter_name') > 160
     or length(application ->> 'institution_name') > 240
     or length(application ->> 'institution_address') > 500
     or length(application ->> 'institution_type') > 100
     or length(application ->> 'president_name') > 160
     or length(application ->> 'secretary_name') > 160
     or length(application ->> 'contact_phone') > 40
     or length(application ->> 'contact_email') > 254
     or length(application ->> 'description') > 500
     or length(coalesce(application ->> 'social_url', '')) > 2048 then
    raise exception 'One or more application fields exceed the allowed length' using errcode = '22023';
  end if;

  if position('@' in application ->> 'contact_email') < 2
     or position('.' in split_part(application ->> 'contact_email', '@', 2)) < 2 then
    raise exception 'A valid contact email is required' using errcode = '22023';
  end if;

  if nullif(btrim(application ->> 'social_url'), '') is not null
     and btrim(application ->> 'social_url') !~* '^https?://' then
    raise exception 'Social media links must use http or https' using errcode = '22023';
  end if;

  if coalesce(application ->> 'established_year', '') !~ '^[0-9]{4}$'
     or coalesce(application ->> 'active_members', '') !~ '^[0-9]{1,7}$' then
    raise exception 'Year established or member count is invalid' using errcode = '22023';
  end if;

  institution_year := (application ->> 'established_year')::integer;
  members_count := (application ->> 'active_members')::integer;

  if institution_year < 1900 or institution_year > extract(year from now())::integer
     or members_count < 0 then
    raise exception 'Year established or member count is outside the allowed range' using errcode = '22023';
  end if;

  if application_row.chapter_id is null and exists (
    select 1 from public.chapters c
    where lower(btrim(c.institution_name)) = lower(btrim(application ->> 'institution_name'))
      and c.status in ('pending', 'approved')
  ) then
    raise exception 'A chapter already exists for this institution. Contact NACOS to update its record.' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.chapter_applications a
    where a.id <> application_row.id
      and lower(btrim(a.institution_name)) = lower(btrim(application ->> 'institution_name'))
      and a.status in ('pending', 'under_review', 'needs_information')
  ) then
    raise exception 'An application for this institution is already under review.' using errcode = '23505';
  end if;

  update public.chapter_applications
    set chapter_name = btrim(application ->> 'chapter_name'),
        institution_name = btrim(application ->> 'institution_name'),
        state = app_state,
        institution_address = btrim(application ->> 'institution_address'),
        institution_type = btrim(application ->> 'institution_type'),
        established_year = institution_year,
        president_name = btrim(application ->> 'president_name'),
        secretary_name = btrim(application ->> 'secretary_name'),
        contact_phone = btrim(application ->> 'contact_phone'),
        active_members = members_count,
        description = btrim(application ->> 'description'),
        social_url = nullif(btrim(application ->> 'social_url'), ''),
        status = 'pending',
        admin_notes = null,
        reviewed_by = null,
        reviewed_at = null
    where id = application_row.id;

  update public.application_correction_invitations
    set used_at = now()
    where id = correction_row.id;

  return application_row.id;
end;
$$;

create function public.approve_chapter_application(application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.chapter_applications%rowtype;
  approved_chapter_id uuid;
begin
  if not public.current_user_has_permission('applications.review') then
    raise exception 'Not authorized to approve applications' using errcode = '42501';
  end if;

  select *
    into application_row
    from public.chapter_applications a
    where a.id = application_id
    for update;

  if not found or application_row.status not in ('pending', 'under_review', 'needs_information') then
    raise exception 'Application is not available for approval' using errcode = '22023';
  end if;

  if application_row.chapter_id is null then
    insert into public.chapters (
      name, institution_name, state, institution_address, institution_type,
      established_year, president_name, active_members, description, social_url, logo_path,
      status, is_published, approved_at
    )
    values (
      application_row.chapter_name, application_row.institution_name, application_row.state,
      application_row.institution_address, application_row.institution_type,
      application_row.established_year, application_row.president_name, application_row.active_members,
      application_row.description, application_row.social_url, application_row.logo_path,
      'approved', true, now()
    )
    returning id into approved_chapter_id;
  else
    update public.chapters c
      set name = application_row.chapter_name,
          institution_name = application_row.institution_name,
          state = application_row.state,
          institution_address = application_row.institution_address,
          institution_type = application_row.institution_type,
          established_year = application_row.established_year,
          president_name = application_row.president_name,
          active_members = application_row.active_members,
          description = application_row.description,
          social_url = application_row.social_url,
          logo_path = coalesce(application_row.logo_path, c.logo_path),
          status = 'approved',
          is_published = true,
          approved_at = now()
      where c.id = application_row.chapter_id
      returning c.id into approved_chapter_id;

    if approved_chapter_id is null then
      raise exception 'Linked chapter was not found' using errcode = '22023';
    end if;
  end if;

  insert into public.chapter_contacts (
    chapter_id, secretary_name, contact_phone, contact_email
  )
  values (
    approved_chapter_id, application_row.secretary_name,
    application_row.contact_phone, application_row.contact_email
  )
  on conflict (chapter_id) do update
    set secretary_name = excluded.secretary_name,
        contact_phone = excluded.contact_phone,
        contact_email = excluded.contact_email,
        updated_at = now();

  update public.chapter_applications a
    set status = 'approved',
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where a.id = application_row.id;

  return approved_chapter_id;
end;
$$;

create function public.set_application_review_status(
  application_id uuid,
  new_status text,
  notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_has_permission('applications.review') then
    raise exception 'Not authorized to update applications' using errcode = '42501';
  end if;

  if new_status not in ('under_review', 'needs_information', 'rejected') then
    raise exception 'Use the approval action to approve an application' using errcode = '22023';
  end if;

  if new_status = 'needs_information' and coalesce(length(btrim(notes)), 0) = 0 then
    raise exception 'Add a note explaining what information is needed' using errcode = '22023';
  end if;

  update public.chapter_applications
    set status = new_status,
        admin_notes = nullif(btrim(notes), ''),
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where id = application_id
      and status in ('pending', 'under_review', 'needs_information');

  if not found then
    raise exception 'Application was not found or is already finalized' using errcode = '22023';
  end if;
end;
$$;

create function public.revoke_chapter_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_has_permission('invitations.manage') then
    raise exception 'Not authorized to revoke invitations' using errcode = '42501';
  end if;

  update public.chapter_invitations
    set revoked_at = now()
    where id = invitation_id
      and used_at is null
      and revoked_at is null;

  if not found then
    raise exception 'Invitation was not found or is already used or revoked' using errcode = '22023';
  end if;
end;
$$;

create trigger chapters_set_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();
create trigger chapters_set_approval_timestamp before insert or update on public.chapters
  for each row execute function public.set_chapter_approval_timestamp();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger chapter_contacts_set_updated_at before update on public.chapter_contacts
  for each row execute function public.set_updated_at();
create trigger chapter_applications_set_updated_at before update on public.chapter_applications
  for each row execute function public.set_updated_at();
create trigger leadership_terms_set_updated_at before update on public.leadership_terms
  for each row execute function public.set_updated_at();
create trigger executives_set_updated_at before update on public.executives
  for each row execute function public.set_updated_at();
create trigger media_items_set_updated_at before update on public.media_items
  for each row execute function public.set_updated_at();

create trigger chapters_audit after insert or update or delete on public.chapters
  for each row execute function public.audit_record_change();
create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.audit_record_change();
create trigger chapter_contacts_audit after insert or update or delete on public.chapter_contacts
  for each row execute function public.audit_record_change();
create trigger chapter_applications_audit after insert or update or delete on public.chapter_applications
  for each row execute function public.audit_record_change();
create trigger leadership_terms_audit after insert or update or delete on public.leadership_terms
  for each row execute function public.audit_record_change();
create trigger executives_audit after insert or update or delete on public.executives
  for each row execute function public.audit_record_change();
create trigger media_items_audit after insert or update or delete on public.media_items
  for each row execute function public.audit_record_change();
create trigger chapter_invitations_audit after insert or update or delete on public.chapter_invitations
  for each row execute function public.audit_record_change();
create trigger application_correction_invitations_audit after insert or update or delete on public.application_correction_invitations
  for each row execute function public.audit_record_change();

alter table public.chapters enable row level security;
alter table public.profiles enable row level security;
alter table public.chapter_contacts enable row level security;
alter table public.chapter_invitations enable row level security;
alter table public.chapter_applications enable row level security;
alter table public.application_correction_invitations enable row level security;
alter table public.leadership_terms enable row level security;
alter table public.executives enable row level security;
alter table public.media_items enable row level security;
alter table public.audit_log enable row level security;

create policy "Public can read published chapters"
  on public.chapters for select to anon, authenticated
  using (status = 'approved' and is_published);
create policy "Chapter managers can read chapters"
  on public.chapters for select to authenticated
  using (public.current_user_has_permission('chapters.manage'));
create policy "Chapter managers can update chapters"
  on public.chapters for update to authenticated
  using (
    public.current_user_has_permission('chapters.manage')
    and status = 'approved'
  )
  with check (
    public.current_user_has_permission('chapters.manage')
    and status = 'approved'
  );

create policy "Chapter managers can read private chapter contacts"
  on public.chapter_contacts for select to authenticated
  using (public.current_user_has_permission('chapters.manage'));
create policy "Chapter managers can insert private chapter contacts"
  on public.chapter_contacts for insert to authenticated
  with check (public.current_user_has_permission('chapters.manage'));
create policy "Chapter managers can update private chapter contacts"
  on public.chapter_contacts for update to authenticated
  using (public.current_user_has_permission('chapters.manage'))
  with check (public.current_user_has_permission('chapters.manage'));
create policy "Chapter managers can delete private chapter contacts"
  on public.chapter_contacts for delete to authenticated
  using (public.current_user_has_permission('chapters.manage'));

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "Team managers can read profiles"
  on public.profiles for select to authenticated
  using (public.current_user_has_permission('team.manage'));

create policy "Application reviewers can read applications"
  on public.chapter_applications for select to authenticated
  using (public.current_user_has_permission('applications.review'));

create policy "Public can read published leadership terms"
  on public.leadership_terms for select to anon, authenticated
  using (is_published);
create policy "Leadership managers can read all terms"
  on public.leadership_terms for select to authenticated
  using (public.current_user_has_permission('leadership.manage'));
create policy "Leadership managers can insert terms"
  on public.leadership_terms for insert to authenticated
  with check (public.current_user_has_permission('leadership.manage'));
create policy "Leadership managers can update terms"
  on public.leadership_terms for update to authenticated
  using (public.current_user_has_permission('leadership.manage'))
  with check (public.current_user_has_permission('leadership.manage'));
create policy "Leadership managers can delete terms"
  on public.leadership_terms for delete to authenticated
  using (public.current_user_has_permission('leadership.manage'));

create policy "Public can read published executives"
  on public.executives for select to anon, authenticated
  using (
    is_published
    and exists (
      select 1 from public.leadership_terms t
      where t.id = term_id and t.is_published
    )
  );
create policy "Leadership managers can read all executives"
  on public.executives for select to authenticated
  using (public.current_user_has_permission('leadership.manage'));
create policy "Leadership managers can insert executives"
  on public.executives for insert to authenticated
  with check (public.current_user_has_permission('leadership.manage'));
create policy "Leadership managers can update executives"
  on public.executives for update to authenticated
  using (public.current_user_has_permission('leadership.manage'))
  with check (public.current_user_has_permission('leadership.manage'));
create policy "Leadership managers can delete executives"
  on public.executives for delete to authenticated
  using (public.current_user_has_permission('leadership.manage'));

create policy "Public can read published media"
  on public.media_items for select to anon, authenticated
  using (is_published);
create policy "Media managers can read all media"
  on public.media_items for select to authenticated
  using (public.current_user_has_permission('media.manage'));
create policy "Media managers can insert media"
  on public.media_items for insert to authenticated
  with check (public.current_user_has_permission('media.manage'));
create policy "Media managers can update media"
  on public.media_items for update to authenticated
  using (public.current_user_has_permission('media.manage'))
  with check (public.current_user_has_permission('media.manage'));
create policy "Media managers can delete media"
  on public.media_items for delete to authenticated
  using (public.current_user_has_permission('media.manage'));

create policy "Audit readers can read audit log"
  on public.audit_log for select to authenticated
  using (public.current_user_has_permission('audit.read'));

revoke all on public.chapter_invitations from anon, authenticated;
revoke all on public.chapter_applications from anon, authenticated;
revoke all on public.application_correction_invitations from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;
revoke all on public.chapter_contacts from anon, authenticated;
revoke all on public.chapters from anon, authenticated;
revoke all on public.profiles from anon, authenticated;

grant select (
  id, name, institution_name, state, institution_address, institution_type,
  established_year, president_name, active_members, description, social_url, logo_path,
  status, is_published, approved_at, created_at, updated_at
) on public.chapters to anon, authenticated;
grant update (
  name, institution_name, state, institution_address, institution_type,
  established_year, president_name, active_members, description, social_url, logo_path
) on public.chapters to authenticated;
grant select, insert, update, delete on public.chapter_contacts to authenticated;
grant select on public.profiles to authenticated;
grant select on public.chapter_applications to authenticated;
grant select, insert, update, delete on public.leadership_terms to authenticated;
grant select, insert, update, delete on public.executives to authenticated;
grant select, insert, update, delete on public.media_items to authenticated;
grant select on public.audit_log to authenticated;
grant usage on schema public to anon, authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_chapter_approval_timestamp() from public, anon, authenticated;
revoke all on function public.current_user_has_permission(text) from public, anon;
grant execute on function public.current_user_has_permission(text) to authenticated;
revoke all on function public.audit_record_change() from public, anon, authenticated;

revoke all on function public.create_chapter_invitation(text, text, uuid, integer) from public, anon;
grant execute on function public.create_chapter_invitation(text, text, uuid, integer) to authenticated;
revoke all on function public.submit_chapter_application(text, jsonb) from public;
grant execute on function public.submit_chapter_application(text, jsonb) to anon, authenticated;
revoke all on function public.create_application_correction_invitation(uuid, integer) from public, anon;
grant execute on function public.create_application_correction_invitation(uuid, integer) to authenticated;
revoke all on function public.update_chapter_application_with_correction(text, jsonb) from public;
grant execute on function public.update_chapter_application_with_correction(text, jsonb) to anon, authenticated;
revoke all on function public.approve_chapter_application(uuid) from public, anon;
grant execute on function public.approve_chapter_application(uuid) to authenticated;
revoke all on function public.set_application_review_status(uuid, text, text) from public, anon;
grant execute on function public.set_application_review_status(uuid, text, text) to authenticated;
revoke all on function public.revoke_chapter_invitation(uuid) from public, anon;
grant execute on function public.revoke_chapter_invitation(uuid) to authenticated;
