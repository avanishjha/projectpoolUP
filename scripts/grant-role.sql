-- ============================================================================
-- CONQR · Grant a platform role to a user by phone number (staging/prod
-- bootstrap — local dev is seeded automatically).
--
-- Usage (service-role/psql connection):
--   psql "$DB_URL" -v phone="'919800000001'" -v role="'admin'" -f scripts/grant-role.sql
--
-- Valid roles: creator · moderator · support · finance · operations · admin
-- ============================================================================

insert into authz.user_roles (user_id, role_key)
select u.id, :role
from auth.users u
where u.phone = :phone
on conflict do nothing;

select case when count(*) > 0
       then 'Granted ' || :role || ' — user now holds: ' ||
            (select string_agg(role_key, ', ') from authz.user_roles ur
             join auth.users au on au.id = ur.user_id where au.phone = :phone)
       else 'NO USER FOUND with phone ' || :phone end as result
from auth.users where phone = :phone;
