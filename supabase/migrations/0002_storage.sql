-- ============================================================
-- Storage bucket for booking photos
-- Public read (photos are non-sensitive junk pics shown on the dispatch
-- dashboard); uploads are done server-side with the service role.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('booking-photos', 'booking-photos', true)
on conflict (id) do nothing;

-- Allow public read of objects in the bucket
drop policy if exists "Public read booking photos" on storage.objects;
create policy "Public read booking photos" on storage.objects
  for select using (bucket_id = 'booking-photos');
