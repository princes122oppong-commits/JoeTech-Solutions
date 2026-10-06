-- Optional starter data for local demo/testing
-- Keep project records empty until verified work is added through the admin dashboard.

insert into public.skills (name, level)
select seed.name, seed.level
from (values
  ('HTML & CSS', 90),
  ('JavaScript', 85),
  ('React', 80),
  ('Node.js', 75)
) as seed(name, level)
where not exists (
  select 1
  from public.skills existing
  where lower(btrim(existing.name)) = lower(btrim(seed.name))
);

insert into public.services (title, description)
values
  ('Web Development', 'Complete website builds from scratch and front-end polish.'),
  ('UI/UX Design', 'Clean, user-first interfaces built for clarity and conversion.'),
  ('API Integration', 'Connect systems, data sources and third-party tools efficiently.')
on conflict do nothing;

insert into public.testimonials (name, role, quote)
values
  ('Jane Doe', 'Startup Founder', 'Joseph transformed our rough idea into a polished digital product people actually enjoy using.'),
  ('Michael Shaw', 'Marketing Lead', 'The communication, design quality and delivery speed were excellent throughout the project.')
on conflict do nothing;
