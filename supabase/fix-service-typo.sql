-- Fix "bussines" → "business" in services (run in Supabase SQL editor if needed)
update public.services
set
  title = regexp_replace(title, '\mbussines\M', 'business', 'gi'),
  description = regexp_replace(description, '\mbussines\M', 'business', 'gi')
where title ~* '\mbussines\M'
   or description ~* '\mbussines\M';
