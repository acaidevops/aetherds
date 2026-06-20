-- Local-development seed data for the tenancy root (A3 baseline).
--
-- Two restaurants, each with one location, to exercise tenant isolation by eye
-- during local development. The CI integration test harness (tests/integration)
-- seeds its own fixtures, so this file is not used in CI.
--
-- Idempotent: safe to re-run. Stable UUIDs so foreign keys resolve on re-runs.

insert into restaurants (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Aurora Bistro')
on conflict (id) do nothing;

insert into restaurants (id, name)
values ('22222222-2222-2222-2222-222222222222', 'Beacon Kitchen')
on conflict (id) do nothing;

insert into locations (id, restaurant_id, name, timezone, currency)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', 'Downtown', 'America/Los_Angeles', 'USD'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-2222-2222-2222-222222222222', 'Main Hall', 'America/New_York', 'USD')
on conflict (id) do nothing;
