-- Create meetup join requests table
create table public.meetup_join_requests (
  id uuid default gen_random_uuid() primary key,
  meetup_id uuid references public.meetups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(meetup_id, user_id)
);

alter table public.meetup_join_requests enable row level security;

-- RLS Policies for join requests
create policy "Users can view their own join requests"
  on public.meetup_join_requests for select
  using (auth.uid() = user_id);

create policy "Meetup creators can view requests for their meetups"
  on public.meetup_join_requests for select
  using (
    exists (
      select 1 from public.meetups
      where meetups.id = meetup_join_requests.meetup_id
      and meetups.creator_id = auth.uid()
    )
  );

create policy "Authenticated users can create join requests"
  on public.meetup_join_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Meetup creators can update requests for their meetups"
  on public.meetup_join_requests for update
  using (
    exists (
      select 1 from public.meetups
      where meetups.id = meetup_join_requests.meetup_id
      and meetups.creator_id = auth.uid()
    )
  );

-- Enable realtime for join requests
alter publication supabase_realtime add table public.meetup_join_requests;
alter table public.meetup_join_requests replica identity full;

-- Function to update updated_at timestamp
create trigger meetup_join_requests_updated_at
  before update on public.meetup_join_requests
  for each row
  execute function public.handle_updated_at();
