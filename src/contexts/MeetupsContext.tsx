import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface Meetup {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  meetingPoint?: string;
  type: 'open' | 'locked';
  currentMembers: number;
  maxMembers: number;
  imageUrl: string;
  creatorName: string;
  description?: string;
  isPaid: boolean;
  amount?: number;
  creatorId?: string;
}

interface MeetupsContextType {
  meetups: Meetup[];
  addMeetup: (meetup: Omit<Meetup, 'id' | 'currentMembers' | 'creatorName'>) => Promise<void>;
  updateMeetup: (id: string, meetup: Partial<Omit<Meetup, 'id' | 'currentMembers' | 'creatorName'>>) => Promise<void>;
  loading: boolean;
}

const MeetupsContext = createContext<MeetupsContextType | undefined>(undefined);

export const MeetupsProvider = ({ children }: { children: ReactNode }) => {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMeetups();
  }, []);

  const fetchMeetups = async () => {
    try {
      const { data: meetupsData, error } = await supabase
        .from('meetups')
        .select(`
          *,
          creator:profiles!creator_id(username),
          meetup_members(count)
        `)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true });

      if (error) throw error;

      const formattedMeetups: Meetup[] = meetupsData.map((meetup: any) => ({
        id: meetup.id,
        title: meetup.title,
        destination: meetup.destination,
        startDate: meetup.start_date,
        endDate: meetup.end_date,
        meetingPoint: meetup.meeting_point,
        type: meetup.type,
        currentMembers: meetup.meetup_members[0]?.count || 0,
        maxMembers: meetup.max_members,
        imageUrl: meetup.image_url,
        creatorName: meetup.creator?.username || 'Unknown',
        description: meetup.description,
        isPaid: meetup.is_paid || false,
        amount: meetup.amount,
        creatorId: meetup.creator_id,
      }));

      // Sort by start date (closest upcoming first)
      const sortedMeetups = formattedMeetups.sort((a, b) => {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });

      setMeetups(sortedMeetups);
    } catch (error: any) {
      console.error('Error loading meetups:', error);
      toast({
        title: 'Unable to load meetups',
        description: 'Please refresh the page',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addMeetup = async (meetupData: Omit<Meetup, 'id' | 'currentMembers' | 'creatorName'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to create a meetup',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase
        .from('meetups')
        .insert({
          title: meetupData.title,
          destination: meetupData.destination,
          start_date: meetupData.startDate,
          end_date: meetupData.endDate,
          meeting_point: meetupData.meetingPoint,
          type: meetupData.type,
          max_members: meetupData.maxMembers,
          image_url: meetupData.imageUrl,
          description: meetupData.description,
          is_paid: meetupData.isPaid,
          amount: meetupData.amount,
          creator_id: user.id,
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      // Add creator as first member
      await supabase.from('meetup_members').insert({
        meetup_id: data.id,
        user_id: user.id,
      });

      await fetchMeetups();
      
      toast({
        title: 'Meetup created!',
        description: 'Your meetup has been created successfully.',
      });
    } catch (error: any) {
      console.error('Error creating meetup:', error);
      toast({
        title: 'Unable to create meetup',
        description: 'Please try again',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateMeetup = async (id: string, meetupData: Partial<Omit<Meetup, 'id' | 'currentMembers' | 'creatorName'>>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to update a meetup',
          variant: 'destructive',
        });
        return;
      }

      const updatePayload: any = {};
      if (meetupData.title) updatePayload.title = meetupData.title;
      if (meetupData.destination) updatePayload.destination = meetupData.destination;
      if (meetupData.startDate) updatePayload.start_date = meetupData.startDate;
      if (meetupData.endDate) updatePayload.end_date = meetupData.endDate;
      if (meetupData.meetingPoint !== undefined) updatePayload.meeting_point = meetupData.meetingPoint;
      if (meetupData.type) updatePayload.type = meetupData.type;
      if (meetupData.maxMembers) updatePayload.max_members = meetupData.maxMembers;
      if (meetupData.imageUrl) updatePayload.image_url = meetupData.imageUrl;
      if (meetupData.description !== undefined) updatePayload.description = meetupData.description;
      if (meetupData.isPaid !== undefined) updatePayload.is_paid = meetupData.isPaid;
      if (meetupData.amount !== undefined) updatePayload.amount = meetupData.amount;

      const { error } = await supabase
        .from('meetups')
        .update(updatePayload)
        .eq('id', id)
        .eq('creator_id', user.id);

      if (error) throw error;

      await fetchMeetups();
      
      toast({
        title: 'Meetup updated!',
        description: 'Your meetup has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error updating meetup:', error);
      toast({
        title: 'Unable to update meetup',
        description: 'Please try again',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <MeetupsContext.Provider value={{ meetups, addMeetup, updateMeetup, loading }}>
      {children}
    </MeetupsContext.Provider>
  );
};

export const useMeetups = () => {
  const context = useContext(MeetupsContext);
  if (!context) {
    throw new Error('useMeetups must be used within MeetupsProvider');
  }
  return context;
};
