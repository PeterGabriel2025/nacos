create function public.delete_chapter_application(target_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.chapter_applications%rowtype;
begin
  if not public.current_user_has_permission('applications.review') then
    raise exception 'Not authorized to remove chapter applications' using errcode = '42501';
  end if;

  select *
    into application_row
    from public.chapter_applications
    where id = target_application_id
    for update;

  if not found then
    raise exception 'Chapter application was not found' using errcode = '22023';
  end if;

  if application_row.chapter_id is not null then
    if exists (
      select 1
      from public.chapter_applications
      where chapter_id = application_row.chapter_id
        and id <> application_row.id
    ) then
      raise exception 'Cannot delete this chapter while other applications are linked to it. Remove those applications first.' using errcode = '23503';
    end if;

    if exists (
      select 1
      from public.profiles
      where chapter_id = application_row.chapter_id
        and role = 'chapter_representative'
    ) then
      raise exception 'Cannot delete this chapter while chapter representative accounts are linked to it. Reassign or remove those accounts first.' using errcode = '23503';
    end if;

    update public.chapter_invitations
      set chapter_id = null,
          revoked_at = case
            when used_at is null then coalesce(revoked_at, now())
            else revoked_at
          end
      where chapter_id = application_row.chapter_id
        and id <> application_row.invitation_id;
  end if;

  delete from public.application_correction_invitations
    where application_id = application_row.id;

  delete from public.chapter_applications
    where id = application_row.id;

  delete from public.chapter_invitations
    where id = application_row.invitation_id;

  if application_row.chapter_id is not null then
    delete from public.chapters
      where id = application_row.chapter_id;
  end if;
end;
$$;

revoke all on function public.delete_chapter_application(uuid) from public, anon;
grant execute on function public.delete_chapter_application(uuid) to authenticated;
