-- Optional starter data for local demo/testing

insert into public.projects (title, description, image_url, github_url, live_url, tags)
values
  (
    'Personal Portfolio',
    'A modern, fully responsive portfolio website showcasing my skills, projects and services.',
    '../assets/images/profile.png',
    '#',
    '#',
    array['HTML', 'CSS', 'JavaScript']
  ),
  (
    'Restaurant Website',
    'An elegant restaurant site with menu, reservation form and online ordering layout.',
    '../assets/images/profile.png',
    '#',
    '#',
    array['HTML', 'CSS', 'JS', 'PHP']
  ),
  (
    'Weather App',
    'Real-time weather dashboard using a public API — search any city and get live conditions.',
    '../assets/images/profile.png',
    '#',
    '#',
    array['JavaScript', 'API', 'CSS']
  )
on conflict do nothing;

insert into public.skills (name, level)
values
  ('HTML & CSS', 90),
  ('JavaScript', 85),
  ('React', 80),
  ('Node.js', 75)
on conflict do nothing;

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
