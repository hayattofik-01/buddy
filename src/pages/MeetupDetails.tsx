import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import MeetupChat from '@/components/MeetupChat';
import PendingRequests from '@/components/PendingRequests';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, Calendar, MapPin, Users, MessageCircle, Send, Instagram as InstagramIcon } from 'lucide-react';
import { validateSocialGroupLink, getPlatformName, getPlatformColor } from '@/lib/socialValidation';

interface Meetup {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string | null;
  creator_id: string;
  max_members: number;
  type: 'open' | 'locked';
  social_group_link?: string | null;
}

interface MeetupMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    username: string;
    name: string | null;
    avatar_url?: string;
  };
}

const MeetupDetails = () => {
  const { meetupId } = useParams<{ meetupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [members, setMembers] = useState<MeetupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const isCreator = meetup?.creator_id === user?.id;

  // Generate random traveler username
  const getDisplayName = (username: string | undefined, name: string | null | undefined, userId: string): string => {
    if (name) return name;
    if (username) return username;
    // Generate consistent random number from user ID
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const randomNum = (hash % 9000) + 1000; // 4-digit number between 1000-9999
    return `traveler_${randomNum}`;
  };

  const fetchMembers = async () => {
    if (!meetupId) return;

    const { data: membersData } = await supabase
      .from('meetup_members')
      .select(`
        *,
        profiles:user_id (username, name, avatar_url)
      `)
      .eq('meetup_id', meetupId);

    setMembers(membersData || []);
    const userIsMember = membersData?.some(m => m.user_id === user?.id);
    setIsMember(!!userIsMember);
  };

  useEffect(() => {
    if (!meetupId || !user) return;

    const fetchMeetupDetails = async () => {
      try {
        // Fetch meetup details
        const { data: meetupData, error: meetupError } = await supabase
          .from('meetups')
          .select('*')
          .eq('id', meetupId)
          .maybeSingle();

        if (meetupError) throw meetupError;
        setMeetup(meetupData);

        // Fetch members with profile data
        const { data: membersData, error: membersError } = await supabase
          .from('meetup_members')
          .select(`
            *,
            profiles:user_id (username, name, avatar_url)
          `)
          .eq('meetup_id', meetupId);

        setMembers(membersData || []);

        // Check if current user is a member
        const userIsMember = membersData?.some(m => m.user_id === user.id);
        setIsMember(!!userIsMember);
      } catch (error: any) {
        console.error('Error fetching meetup:', error);
        toast({
          title: 'Unable to load meetup',
          description: 'Please try again later',
          variant: 'destructive',
        });
        navigate('/meetups');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetupDetails();
  }, [meetupId, user, navigate, toast]);

  const handleJoinMeetup = async () => {
    if (!user || !meetupId || !meetup) return;

    // Check if group is full
    if (members.length >= meetup.max_members) {
      toast({
        title: 'Group is full',
        description: 'This meetup has reached maximum capacity',
        variant: 'destructive',
      });
      return;
    }

    try {
      // If locked meetup, create or update a join request
      if (meetup.type === 'locked') {
        // First check if there's already a request
        const { data: existingRequest } = await supabase
          .from('meetup_join_requests')
          .select('id, status')
          .eq('meetup_id', meetupId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingRequest) {
          if (existingRequest.status === 'pending') {
            toast({
              title: 'Request already sent',
              description: 'Your request is awaiting approval',
            });
            return;
          }

          // Update existing rejected request to pending
          const { error } = await supabase
            .from('meetup_join_requests')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', existingRequest.id);

          if (error) throw error;
        } else {
          // Create new request
          const { error } = await supabase
            .from('meetup_join_requests')
            .insert({
              meetup_id: meetupId,
              user_id: user.id,
              status: 'pending'
            });

          if (error) throw error;
        }

        toast({
          title: 'Request sent!',
          description: 'The organizer will review your request to join',
        });
      } else {
        // If open meetup, directly add as member
        const { error } = await supabase
          .from('meetup_members')
          .insert({
            meetup_id: meetupId,
            user_id: user.id,
          });

        if (error) throw error;

        // Check if there's a social group link
        const socialValidation = meetup.social_group_link ? validateSocialGroupLink(meetup.social_group_link) : null;

        toast({
          title: 'Joined meetup!',
          description: socialValidation?.isValid && socialValidation.platform
            ? `You are now a member. Check the ${getPlatformName(socialValidation.platform)} group link below!`
            : 'You are now a member of this meetup',
        });

        setIsMember(true);

        fetchMembers();
      }
    } catch (error: any) {
      console.error('Error joining meetup:', error);
      toast({
        title: 'Unable to join',
        description: 'Something went wrong. Please try again',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!meetup) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/meetups')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Meetups
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meetup Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold">{meetup.title}</h1>
                {!isMember && (
                  <Button
                    onClick={handleJoinMeetup}
                    disabled={members.length >= meetup.max_members}
                  >
                    {meetup.type === 'locked' ? 'Request to Join' : 'Join Meetup'}
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Destination</p>
                    <p className="text-sm text-muted-foreground">{meetup.destination}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Dates</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(meetup.start_date).toLocaleDateString()} - {new Date(meetup.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {meetup.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">{meetup.description}</p>
                  </div>
                )}

                {meetup.social_group_link && isMember && (() => {
                  const validation = validateSocialGroupLink(meetup.social_group_link);
                  if (validation.isValid && validation.platform) {
                    const Icon = validation.platform === 'whatsapp' ? MessageCircle :
                      validation.platform === 'telegram' ? Send :
                        validation.platform === 'facebook' ? Users :
                          validation.platform === 'instagram' ? InstagramIcon :
                            null;
                    return (
                      <div className="pt-3 border-t">
                        <Button
                          asChild
                          variant="outline"
                          className="w-full"
                        >
                          <a href={validation.url} target="_blank" rel="noopener noreferrer">
                            {Icon && <Icon className={`h-4 w-4 mr-2 ${getPlatformColor(validation.platform)}`} />}
                            Join {getPlatformName(validation.platform)} Group
                          </a>
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </Card>

            {/* Pending Requests - Only visible to creator */}
            {isCreator && (
              <PendingRequests
                meetupId={meetupId!}
                onRequestHandled={fetchMembers}
              />
            )}

            {/* Members */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Members</h2>
                <Badge variant="secondary">{members.length}/{meetup.max_members >= 999999 ? '∞' : meetup.max_members}</Badge>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mb-3">
                    View All Members
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Meetup Members</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-3">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => navigate(`/user/${member.user_id}`)}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.profiles?.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getDisplayName(member.profiles?.username, member.profiles?.name, member.user_id)[0]?.toUpperCase() || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">
                                {getDisplayName(member.profiles?.username, member.profiles?.name, member.user_id)}
                              </p>
                              {member.role === 'organizer' && (
                                <Badge variant="default" className="text-xs">
                                  Organizer
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              @{member.profiles?.username || getDisplayName(member.profiles?.username, member.profiles?.name, member.user_id)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </Card>
          </div>

          {/* Chat */}
          <div className="lg:col-span-2">
            {isMember ? (
              <MeetupChat
                meetupId={meetupId!}
                isCreator={meetup.creator_id === user?.id}
              />
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {meetup.type === 'locked' ? 'Request to join' : 'Join to access chat'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {meetup.type === 'locked'
                    ? 'Request to join this meetup to chat with other members and share locations'
                    : 'Join this meetup to chat with other members and share locations'
                  }
                </p>
                <Button onClick={handleJoinMeetup}>
                  {meetup.type === 'locked' ? 'Request to Join' : 'Join Meetup'}
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetupDetails;
