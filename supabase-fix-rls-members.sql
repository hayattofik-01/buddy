-- Fix: Allow meetup creators to add members to their meetups
create policy "Meetup creators can add members to their meetups"
  on public.meetup_members for insert
  to authenticated
  with check (
    auth.uid() = user_id OR
    exists (
      select 1 from public.meetups
      where meetups.id = meetup_members.meetup_id
      and meetups.creator_id = auth.uid()
    )
  );
