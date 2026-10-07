alter table public.media_items
  add column storage_bucket text;

do $$
begin
  if (
    select count(*)
    from storage.buckets
    where id in ('nacos-south-east', 'nacos-docs')
  ) <> 2 then
    raise exception 'Create the nacos-south-east and nacos-docs buckets before applying this migration';
  end if;

  update storage.buckets
    set public = false,
        file_size_limit = case id
          when 'nacos-south-east' then 5242880
          when 'nacos-docs' then 10485760
        end,
        allowed_mime_types = case id
          when 'nacos-south-east' then array['image/jpeg', 'image/png', 'image/webp']::text[]
          when 'nacos-docs' then array['application/pdf']::text[]
        end
    where id in ('nacos-south-east', 'nacos-docs');
end;
$$;

alter table public.media_items
  add constraint media_items_storage_bucket_check
  check (
    storage_bucket is null
    or storage_bucket in ('nacos-south-east', 'nacos-docs')
  );

alter table public.media_items
  add constraint media_items_file_metadata_check
  check (
    (file_path is null) = (storage_bucket is null)
    and (file_path is null) = (mime_type is null)
  );

alter table public.media_items
  add constraint media_items_documents_bucket_check
  check (
    category <> 'documents'
    or (
      (storage_bucket is null or storage_bucket = 'nacos-docs')
      and not is_published
    )
  );

alter table public.media_items
  add constraint media_items_public_media_bucket_check
  check (
    category = 'documents'
    or storage_bucket is null
    or storage_bucket = 'nacos-south-east'
  );

create policy "Published media assets are readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'nacos-south-east'
    and exists (
      select 1
      from public.media_items item
      where item.storage_bucket = storage.objects.bucket_id
        and item.file_path = storage.objects.name
        and item.is_published
        and item.category <> 'documents'
    )
  );

create policy "Media managers can read stored assets"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('nacos-south-east', 'nacos-docs')
    and public.current_user_has_permission('media.manage')
  );

create policy "Media managers can upload assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('nacos-south-east', 'nacos-docs')
    and public.current_user_has_permission('media.manage')
  );

create policy "Media managers can update stored assets"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('nacos-south-east', 'nacos-docs')
    and public.current_user_has_permission('media.manage')
  )
  with check (
    bucket_id in ('nacos-south-east', 'nacos-docs')
    and public.current_user_has_permission('media.manage')
  );

create policy "Media managers can delete stored assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('nacos-south-east', 'nacos-docs')
    and public.current_user_has_permission('media.manage')
  );
