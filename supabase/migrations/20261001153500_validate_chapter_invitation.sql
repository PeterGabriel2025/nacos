create function public.validate_chapter_invitation(invitation_token text)
returns table (invited_email text, chapter_id uuid, chapter_name text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.recipient_email, i.chapter_id, c.name, i.expires_at
  from public.chapter_invitations i
  left join public.chapters c on c.id = i.chapter_id
  where invitation_token ~ '^[0-9a-f]{64}$'
    and i.token_hash = extensions.digest(invitation_token, 'sha256')
    and i.used_at is null
    and i.revoked_at is null
    and i.expires_at > now();
$$;

revoke all on function public.validate_chapter_invitation(text) from public;
grant execute on function public.validate_chapter_invitation(text) to anon, authenticated;
