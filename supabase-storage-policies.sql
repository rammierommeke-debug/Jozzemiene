-- Geef volledige toegang op de uploads bucket voor iedereen (prive app)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

create policy "Iedereen mag uploaden"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'uploads');

create policy "Iedereen mag lezen"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'uploads');

create policy "Iedereen mag verwijderen"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'uploads');
