-- ============================================================
-- Junk Haul Calgary — initial schema
-- Run in Supabase SQL Editor (or via `supabase db push`)
-- ============================================================

-- ============================================================
-- ENABLE EXTENSIONS
-- ============================================================
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,

  -- Reference number shown to customers
  booking_ref text unique not null default
    'JH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),

  -- Customer info
  name text not null,
  phone text not null,
  email text,
  address text not null,
  unit text,
  city text default 'Calgary',
  postal_code text,
  quadrant text check (quadrant in ('NW','NE','SW','SE')),
  lat double precision,
  lng double precision,

  -- Job details
  load_size text not null check (load_size in ('single_item','quarter','half','full')),
  base_price integer not null,
  same_day boolean default false,
  same_day_fee integer default 0,
  stairs integer default 0,
  stairs_fee integer default 0,
  has_freon boolean default false,
  freon_fee integer default 0,
  total_price integer not null,
  dynamic_multiplier decimal default 1.0,

  -- Payment
  deposit_amount integer default 50,
  deposit_paid boolean default false,
  deposit_paid_at timestamp,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  balance_due integer,             -- total_price - deposit_amount

  -- Scheduling
  job_date date not null,
  job_time text not null,          -- stored as 'HH:MM' 24hr format
  job_datetime timestamp,          -- computed: job_date + job_time for easier queries

  -- Photos and AI analysis
  photos text[],                   -- array of Supabase storage URLs
  photo_skipped boolean default false,
  description_text text,           -- if customer described in text instead
  ai_load_estimate text,           -- what AI estimated
  ai_weight_estimate_kg integer,
  ai_confidence text check (ai_confidence in ('high','medium','low')),
  has_hazmat boolean default false,
  hazmat_description text,

  -- Flags
  flag_for_review boolean default false,
  flag_reason text,
  upgrade_pending boolean default false,
  suggested_load_size text,
  suggested_price integer,

  -- Source tracking
  source text default 'web' check (source in ('web','phone','kijiji','marketplace','referral','vapi')),

  -- Status
  status text default 'pending_payment' check (status in (
    'pending_payment',   -- deposit not yet paid
    'confirmed',         -- deposit paid, job scheduled
    'completed',         -- job done
    'cancelled',         -- cancelled by customer or operator
    'rescheduled',       -- moved to new date
    'no_show'            -- customer wasn't there
  )),

  -- No-show prediction
  no_show_risk_score integer default 0,  -- 0-100, flag above 50
  extra_reminder_sent boolean default false,

  -- Cancellation
  cancellation_reason text,
  cancelled_by text check (cancelled_by in ('customer','operator')),
  cancelled_at timestamp,
  refund_amount integer default 0,
  refund_processed boolean default false,
  refund_stripe_id text,

  -- Rescheduling
  original_job_date date,
  original_job_time text,
  reschedule_count integer default 0,

  -- Communications
  confirmation_sms_sent boolean default false,
  morning_reminder_sent boolean default false,
  extra_reminder_sent_at timestamp,
  review_requested boolean default false,
  review_requested_at timestamp,
  review_completed boolean default false,

  -- Notes
  notes text,
  operator_notes text,

  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists bookings_job_date_idx on bookings (job_date);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_phone_idx on bookings (phone);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists bookings_updated_at on bookings;
create trigger bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();

-- ============================================================
-- SCHEDULE TABLE
-- ============================================================
create table if not exists schedule (
  id uuid default gen_random_uuid() primary key,
  slot_date date not null,
  slot_time text not null,       -- 'HH:MM' 24hr
  day_type text check (day_type in ('thursday','sunday')),
  max_jobs integer default 5,
  jobs_booked integer default 0,
  is_available boolean default true,
  unique(slot_date, slot_time)
);

-- Helper functions for slot management
create or replace function increment_slot(p_date date, p_time text)
returns void as $$
begin
  update schedule
  set jobs_booked = jobs_booked + 1,
      is_available = (jobs_booked + 1 < max_jobs)
  where slot_date = p_date and slot_time = p_time;
end;
$$ language plpgsql;

create or replace function decrement_slot(p_date date, p_time text)
returns void as $$
begin
  update schedule
  set jobs_booked = greatest(0, jobs_booked - 1),
      is_available = true
  where slot_date = p_date and slot_time = p_time;
end;
$$ language plpgsql;

-- ============================================================
-- WAITLIST TABLE
-- ============================================================
create table if not exists waitlist (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  preferred_date date,
  preferred_day_type text check (preferred_day_type in ('thursday','sunday','either')),
  load_size text,
  address text,
  notified boolean default false,
  notified_at timestamp,
  converted_to_booking_id uuid references bookings(id),
  expires_at timestamp default (now() + interval '30 days'),
  created_at timestamp with time zone default now()
);

-- ============================================================
-- SMS MESSAGES TABLE
-- ============================================================
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id),
  direction text check (direction in ('outbound','inbound')),
  to_number text,
  from_number text,
  message_type text,      -- 'confirmation','reminder','cancellation','upgrade','review','waitlist','noshow'
  body text,
  provider_sid text,      -- Quo message id
  provider_status text,   -- 'queued','sent','delivered','failed'
  sent_at timestamp with time zone default now()
);

-- ============================================================
-- PHONE CALLS TABLE (Vapi logs)
-- ============================================================
create table if not exists phone_calls (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id),
  vapi_call_id text unique,
  caller_number text,
  direction text check (direction in ('inbound','outbound')),
  duration_seconds integer,
  cost_usd decimal(10,4),
  transcript text,
  outcome text,
  agent_type text check (agent_type in ('booking','customer_service')),
  created_at timestamp with time zone default now()
);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id),
  rating integer check (rating between 1 and 5),
  comment text,
  platform text check (platform in ('google','internal')),
  created_at timestamp with time zone default now()
);

-- ============================================================
-- DAILY STATS TABLE (for dashboard analytics)
-- ============================================================
create table if not exists daily_stats (
  id uuid default gen_random_uuid() primary key,
  stat_date date unique not null,
  total_bookings integer default 0,
  total_revenue integer default 0,
  completed_jobs integer default 0,
  cancelled_jobs integer default 0,
  no_shows integer default 0,
  average_job_value integer default 0,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
alter table bookings enable row level security;
alter table schedule enable row level security;
alter table waitlist enable row level security;
alter table messages enable row level security;
alter table phone_calls enable row level security;
alter table reviews enable row level security;
alter table daily_stats enable row level security;

-- Service role bypasses RLS automatically; these policies make intent explicit.
drop policy if exists "Service role full access" on bookings;
create policy "Service role full access" on bookings
  for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on schedule;
create policy "Service role full access" on schedule
  for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on waitlist;
create policy "Service role full access" on waitlist
  for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on messages;
create policy "Service role full access" on messages
  for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on phone_calls;
create policy "Service role full access" on phone_calls
  for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on reviews;
create policy "Service role full access" on reviews
  for all using (auth.role() = 'service_role');
drop policy if exists "Service role full access" on daily_stats;
create policy "Service role full access" on daily_stats
  for all using (auth.role() = 'service_role');

-- Public (anon) may read only slot availability, so the booking UI can render times.
drop policy if exists "Public can read schedule" on schedule;
create policy "Public can read schedule" on schedule
  for select using (true);
