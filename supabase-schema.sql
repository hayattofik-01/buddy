-- TravelMate Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Create meetups table
create table public.meetups (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  meeting_point text,
  type text check (type in ('open', 'locked')) not null,
  max_members integer not null,
  image_url text not null,
  description text,
  is_paid boolean default false not null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.meetups enable row level security;

-- Create meetup_members table for tracking who joined which meetup
create table public.meetup_members (
  id uuid default gen_random_uuid() primary key,
  meetup_id uuid references public.meetups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(meetup_id, user_id)
);

alter table public.meetup_members enable row level security;

-- RLS Policies for profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS Policies for meetups
create policy "Meetups are viewable by everyone"
  on public.meetups for select
  using (true);

create policy "Authenticated users can create meetups"
  on public.meetups for insert
  to authenticated
  with check (auth.uid() = creator_id);

create policy "Meetup creators can update their meetups"
  on public.meetups for update
  using (auth.uid() = creator_id);

create policy "Meetup creators can delete their meetups"
  on public.meetups for delete
  using (auth.uid() = creator_id);

-- RLS Policies for meetup_members
create policy "Meetup members are viewable by everyone"
  on public.meetup_members for select
  using (true);

create policy "Authenticated users can join meetups"
  on public.meetup_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can leave meetups they joined"
  on public.meetup_members for delete
  using (auth.uid() = user_id);

-- Function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

-- Trigger to create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to count meetup members
create or replace function public.get_meetup_member_count(meetup_id uuid)
returns bigint
language sql
stable
as $$
  select count(*) from public.meetup_members where meetup_members.meetup_id = get_meetup_member_count.meetup_id;
$$;

-- Create chat messages table
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid references public.meetups(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  message_type text not null check (message_type in ('text', 'image', 'file', 'location')),
  content text not null,
  file_url text,
  file_name text,
  file_size bigint,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Add pinned column and pinned_by to track who pinned the message
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

-- Create indexes for chat performance
create index chat_messages_meetup_id_idx on public.chat_messages(meetup_id);
create index chat_messages_created_at_idx on public.chat_messages(created_at desc);
create index chat_messages_pinned_idx on public.chat_messages(meetup_id, pinned) where pinned = true;

-- RLS Policies: Only meetup members can view and send messages
create policy "Meetup members can view messages"
  on public.chat_messages
  for select
  using (
    exists (
      select 1 from public.meetup_members
      where meetup_members.meetup_id = chat_messages.meetup_id
      and meetup_members.user_id = auth.uid()
    )
  );

create policy "Meetup members can insert messages"
  on public.chat_messages
  for insert
  with check (
    exists (
      select 1 from public.meetup_members
      where meetup_members.meetup_id = chat_messages.meetup_id
      and meetup_members.user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

create policy "Users can delete their own messages"
  on public.chat_messages
  for delete
  using (user_id = auth.uid());

-- RLS Policy: Only meetup creators can pin/unpin messages
create policy "Meetup creators can update pinned status"
  on public.chat_messages
  for update
  using (
    exists (
      select 1 from public.meetups
      where meetups.id = chat_messages.meetup_id
      and meetups.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meetups
      where meetups.id = chat_messages.meetup_id
      and meetups.creator_id = auth.uid()
    )
  );

-- Enable realtime for chat
alter publication supabase_realtime add table public.chat_messages;
alter table public.chat_messages replica identity full;

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger chat_messages_updated_at
  before update on public.chat_messages
  for each row
  execute function public.handle_updated_at();

-- Storage bucket for meetup files
insert into storage.buckets (id, name, public)
values ('meetup-uploads', 'meetup-uploads', true)
on conflict (id) do nothing;

-- Storage bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies for meetup uploads
create policy "Meetup members can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'meetup-uploads' and
    auth.uid()::text = (storage.foldername(name))[2]
  );

create policy "Anyone can view meetup files"
  on storage.objects for select
  using (bucket_id = 'meetup-uploads');

-- Storage policies for avatars
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid() is not null
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.uid() is not null
  );

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
