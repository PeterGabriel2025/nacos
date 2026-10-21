create policy "Published executive photos are readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'nacos-south-east'
    and exists (
      select 1
      from public.executives executive
      where executive.photograph_path = storage.objects.name
        and executive.is_published
    )
  );

create policy "Leadership managers can read executive photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'nacos-south-east'
    and (storage.foldername(name))[1] = 'executive-photos'
    and public.current_user_has_permission('leadership.manage')
  );

create policy "Leadership managers can upload executive photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'nacos-south-east'
    and (storage.foldername(name))[1] = 'executive-photos'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.current_user_has_permission('leadership.manage')
  );

create policy "Leadership managers can update executive photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'nacos-south-east'
    and (storage.foldername(name))[1] = 'executive-photos'
    and public.current_user_has_permission('leadership.manage')
  )
  with check (
    bucket_id = 'nacos-south-east'
    and (storage.foldername(name))[1] = 'executive-photos'
    and public.current_user_has_permission('leadership.manage')
  );

create policy "Leadership managers can delete executive photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'nacos-south-east'
    and (storage.foldername(name))[1] = 'executive-photos'
    and public.current_user_has_permission('leadership.manage')
  );
