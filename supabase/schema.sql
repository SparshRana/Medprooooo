-- Run once in the Supabase SQL editor. All private rows require authenticated access.
create table if not exists public.carely_cabinets(user_id uuid primary key references auth.users on delete cascade, medicines jsonb not null default '[]', updated_at timestamptz not null default now());
create table if not exists public.carely_family(id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users on delete cascade, recipient_email text not null check(recipient_email=lower(trim(recipient_email))), enabled boolean not null default true, unique(owner_id,recipient_email));
create table if not exists public.carely_notifications(id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users on delete cascade, body text not null check(length(body)<=2000), created_at timestamptz not null default now());
alter table public.carely_cabinets enable row level security;
alter table public.carely_family enable row level security;
alter table public.carely_notifications enable row level security;
drop policy if exists cabinet_owner on public.carely_cabinets;
create policy cabinet_owner on public.carely_cabinets for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists family_owner on public.carely_family;
create policy family_owner on public.carely_family for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists notification_owner on public.carely_notifications;
create policy notification_owner on public.carely_notifications for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists notification_recipient on public.carely_notifications;
create policy notification_recipient on public.carely_notifications for select to authenticated using(exists(select 1 from public.carely_family f where f.owner_id=carely_notifications.owner_id and f.enabled and f.recipient_email=lower(auth.jwt()->>'email')));
-- Recipient sees only their own grant. No access to the owner's cabinet.
drop policy if exists family_recipient on public.carely_family;
create policy family_recipient on public.carely_family for select to authenticated using(recipient_email=lower(auth.jwt()->>'email'));
grant select,insert,update,delete on public.carely_cabinets,public.carely_family,public.carely_notifications to authenticated;

-- Non-destructive cloud sync with optimistic revision checks.
alter table public.carely_cabinets add column if not exists revision bigint not null default 0;
create or replace function public.carely_save_cabinet(p_medicines jsonb,p_expected_revision bigint)
returns bigint language plpgsql security invoker set search_path=public as $$
declare next_revision bigint;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if jsonb_typeof(p_medicines)<>'array' or octet_length(p_medicines::text)>5000000 then raise exception 'Invalid cabinet'; end if;
 insert into public.carely_cabinets(user_id,medicines,revision) values(auth.uid(),'[]',0) on conflict(user_id) do nothing;
 update public.carely_cabinets set medicines=p_medicines,revision=revision+1,updated_at=now() where user_id=auth.uid() and revision=p_expected_revision returning revision into next_revision;
 if next_revision is null then raise exception 'Cloud cabinet changed. Load and review again.' using errcode='40001'; end if;
 return next_revision;
end $$;
revoke all on function public.carely_save_cabinet(jsonb,bigint) from public,anon;
grant execute on function public.carely_save_cabinet(jsonb,bigint) to authenticated;


-- MedPro follow-up extension. Owner-entered notes never become professional decisions.
create table if not exists public.medpro_review_workspaces(owner_id uuid primary key references auth.users on delete cascade, data jsonb not null default '[]', revision bigint not null default 0, updated_at timestamptz not null default now(), check(jsonb_typeof(data)='array' and octet_length(data::text)<=2000000));
alter table public.medpro_review_workspaces enable row level security;
drop policy if exists review_workspace_owner on public.medpro_review_workspaces;
create policy review_workspace_owner on public.medpro_review_workspaces for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
grant select,insert,update,delete on public.medpro_review_workspaces to authenticated;
create or replace function public.medpro_save_reviews(p_data jsonb,p_expected_revision bigint) returns bigint language plpgsql security invoker set search_path=public as $$
declare r bigint;
begin
 if auth.uid() is null or jsonb_typeof(p_data)<>'array' or octet_length(p_data::text)>2000000 then raise exception 'Invalid review data'; end if;
 insert into medpro_review_workspaces(owner_id) values(auth.uid()) on conflict do nothing;
 update medpro_review_workspaces set data=p_data,revision=revision+1,updated_at=now() where owner_id=auth.uid() and revision=p_expected_revision returning revision into r;
 if r is null then raise exception 'Review backup changed; reload before saving' using errcode='40001'; end if; return r;
end $$;
revoke all on function public.medpro_save_reviews(jsonb,bigint) from public,anon;
grant execute on function public.medpro_save_reviews(jsonb,bigint) to authenticated;

create table if not exists public.medpro_watches(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,product text not null check(length(product) between 2 and 500),manufacturer text not null check(length(manufacturer) between 2 and 500),batch text not null check(length(batch) between 2 and 500),enabled boolean not null default true,created_at timestamptz not null default now(),unique(owner_id,product,manufacturer,batch));
create table if not exists public.medpro_deliveries(id uuid primary key default gen_random_uuid(),watch_id uuid not null references public.medpro_watches on delete cascade,fingerprint text not null,recipient_email text not null,status text not null default 'pending' check(status in ('pending','sending','accepted','failed','needs-review')),source_url text not null,evidence jsonb not null default '{}',created_at timestamptz not null default now(),delivered_at timestamptz,acknowledged_at timestamptz,lease_until timestamptz,unique(watch_id,fingerprint,recipient_email));
alter table public.medpro_watches enable row level security;
alter table public.medpro_deliveries enable row level security;
drop policy if exists watch_owner on public.medpro_watches;
create policy watch_owner on public.medpro_watches for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists delivery_owner on public.medpro_deliveries;
create policy delivery_owner on public.medpro_deliveries for select to authenticated using(exists(select 1 from medpro_watches w where w.id=watch_id and w.owner_id=auth.uid()));
grant select,insert,update,delete on public.medpro_watches to authenticated;
grant select on public.medpro_deliveries to authenticated;
create or replace function public.medpro_acknowledge_delivery(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin update medpro_deliveries d set acknowledged_at=now() where d.id=p_id and exists(select 1 from medpro_watches w where w.id=d.watch_id and w.owner_id=auth.uid()); if not found then raise exception 'Delivery not found';end if;return true;end $$;
revoke all on function public.medpro_acknowledge_delivery(uuid) from public,anon;
grant execute on function public.medpro_acknowledge_delivery(uuid) to authenticated;
create or replace function public.medpro_claim_delivery(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 update medpro_deliveries set status='sending',lease_until=now()+interval '3 minutes' where id=p_id and status in ('pending','failed','sending') and (lease_until is null or lease_until<now()) and created_at>now()-interval '23 hours';return found;
end $$;
revoke all on function public.medpro_claim_delivery(uuid) from public,anon,authenticated;
grant execute on function public.medpro_claim_delivery(uuid) to service_role;

-- Scoped case sharing. No user can grant themselves professional verification.
create table if not exists public.medpro_shared_cases(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,pack jsonb not null,question text not null check(length(question) between 1 and 2000),created_at timestamptz not null default now());
create table if not exists public.medpro_case_grants(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.medpro_shared_cases on delete cascade,owner_id uuid not null references auth.users on delete cascade,recipient_email text not null check(recipient_email=lower(trim(recipient_email))),scopes text[] not null default array['review']::text[] check(scopes<@array['review','alerts','medicine-list']::text[] and cardinality(scopes)>0),expires_at timestamptz not null,enabled boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.medpro_verified_professionals(user_id uuid primary key references auth.users on delete cascade,registration_reference text not null,verified_at timestamptz not null default now(),enabled boolean not null default true);
create table if not exists public.medpro_professional_reviews(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.medpro_shared_cases on delete cascade,reviewer_id uuid not null references public.medpro_verified_professionals(user_id),outcome text not null check(length(outcome) between 5 and 2000),created_at timestamptz not null default now());
create table if not exists public.medpro_access_log(id uuid primary key default gen_random_uuid(),case_id uuid references public.medpro_shared_cases on delete cascade,actor_id uuid not null references auth.users on delete cascade,action text not null,created_at timestamptz not null default now());
alter table public.medpro_shared_cases enable row level security;
alter table public.medpro_case_grants enable row level security;
alter table public.medpro_verified_professionals enable row level security;
alter table public.medpro_professional_reviews enable row level security;
alter table public.medpro_access_log enable row level security;
create or replace function public.medpro_has_case_access(p_case uuid,p_scope text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from medpro_shared_cases c where c.id=p_case and c.owner_id=auth.uid()) or exists(select 1 from medpro_case_grants g where g.case_id=p_case and g.recipient_email=lower(auth.jwt()->>'email') and g.enabled and g.expires_at>now() and p_scope=any(g.scopes)); $$;
revoke all on function public.medpro_has_case_access(uuid,text) from public,anon;
grant execute on function public.medpro_has_case_access(uuid,text) to authenticated;
drop policy if exists shared_case_read on public.medpro_shared_cases;
create policy shared_case_read on public.medpro_shared_cases for select to authenticated using(public.medpro_has_case_access(id,'review'));
drop policy if exists shared_case_owner on public.medpro_shared_cases;
create policy shared_case_owner on public.medpro_shared_cases for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists case_grant_owner on public.medpro_case_grants;
create policy case_grant_owner on public.medpro_case_grants for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid() and exists(select 1 from medpro_shared_cases c where c.id=case_id and c.owner_id=auth.uid()));
drop policy if exists case_grant_recipient on public.medpro_case_grants;
create policy case_grant_recipient on public.medpro_case_grants for select to authenticated using(recipient_email=lower(auth.jwt()->>'email'));
drop policy if exists verified_professional_self on public.medpro_verified_professionals;
create policy verified_professional_self on public.medpro_verified_professionals for select to authenticated using(user_id=auth.uid());
drop policy if exists professional_review_read on public.medpro_professional_reviews;
create policy professional_review_read on public.medpro_professional_reviews for select to authenticated using(public.medpro_has_case_access(case_id,'review'));
drop policy if exists access_log_read on public.medpro_access_log;
create policy access_log_read on public.medpro_access_log for select to authenticated using(exists(select 1 from medpro_shared_cases c where c.id=case_id and c.owner_id=auth.uid()));
grant select,insert,update,delete on public.medpro_shared_cases,public.medpro_case_grants to authenticated;
grant select on public.medpro_verified_professionals,public.medpro_professional_reviews,public.medpro_access_log to authenticated;
create or replace function public.medpro_record_professional_review(p_case_id uuid,p_outcome text) returns uuid language plpgsql security definer set search_path=public as $$
declare r uuid;
begin
 if not exists(select 1 from medpro_verified_professionals where user_id=auth.uid() and enabled) or not public.medpro_has_case_access(p_case_id,'review') then raise exception 'Verified professional and active case consent required';end if;
 insert into medpro_professional_reviews(case_id,reviewer_id,outcome) values(p_case_id,auth.uid(),p_outcome) returning id into r;
 insert into medpro_access_log(case_id,actor_id,action) values(p_case_id,auth.uid(),'professional-review-recorded'); return r;
end $$;
revoke all on function public.medpro_record_professional_review(uuid,text) from public,anon;
grant execute on function public.medpro_record_professional_review(uuid,text) to authenticated;
create or replace function public.medpro_read_case(p_case_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if not public.medpro_has_case_access(p_case_id,'review') then raise exception 'Active case consent required';end if;
 select to_jsonb(c) into result from medpro_shared_cases c where id=p_case_id;
 insert into medpro_access_log(case_id,actor_id,action) values(p_case_id,auth.uid(),'case-opened'); return result;
end $$;
revoke all on function public.medpro_read_case(uuid) from public,anon;
grant execute on function public.medpro_read_case(uuid) to authenticated;

alter table public.medpro_deliveries add column if not exists evidence jsonb not null default '{}';
grant all on public.medpro_watches,public.medpro_deliveries,public.medpro_case_grants,public.medpro_shared_cases,public.medpro_verified_professionals to service_role;

-- Case grants are only available to already-confirmed accounts; a typo cannot create an email escalation recipient.
create or replace function public.medpro_validate_case_grant() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.enabled then
  if new.expires_at<=now() or new.expires_at>now()+interval '30 days' then raise exception 'Choose an expiry within 30 days';end if;
  if not exists(select 1 from auth.users u where lower(u.email)=new.recipient_email and u.email_confirmed_at is not null) then raise exception 'Recipient must have a confirmed account';end if;
 end if;return new;
end $$;
revoke all on function public.medpro_validate_case_grant() from public,anon,authenticated;
drop trigger if exists medpro_case_grant_check on public.medpro_case_grants;
create trigger medpro_case_grant_check before insert or update on public.medpro_case_grants for each row execute function public.medpro_validate_case_grant();
