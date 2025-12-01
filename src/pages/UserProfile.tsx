import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Calendar, MapPin } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  instagram?: string;
  interests?: string[];
  date_of_birth?: string;
}

interface UserMeetup {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  image_url: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meetups, setMeetups] = useState<UserMeetup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch user's meetups
        const { data: meetupsData, error: meetupsError } = await supabase
          .from('meetup_members')
          .select(`
            meetups:meetup_id (
              id,
              title,
              destination,
              start_date,
              image_url
            )
          `)
          .eq('user_id', userId);

        if (meetupsError) throw meetupsError;
        
        const userMeetups = meetupsData
          ?.map(item => item.meetups as any)
          .filter(Boolean)
          .flat() as UserMeetup[];
        
        setMeetups(userMeetups || []);
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Unable to load profile',
          description: 'Please try again later',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, toast]);

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{profile.username}</h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-muted-foreground">
                    {profile.date_of_birth && (
                      <span className="text-sm">
                        {Math.floor((new Date().getTime() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years old
                      </span>
                    )}
                    {profile.instagram && (
                      <>
                        {profile.date_of_birth && <span>•</span>}
                        <a 
                          href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:text-primary transition-colors"
                        >
                          @{profile.instagram.replace('@', '')}
                        </a>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mt-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      Joined {new Date(profile.created_at).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
                
                {profile.bio && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Bio</h3>
                    <p className="text-muted-foreground">{profile.bio}</p>
                  </div>
                )}
                
                {profile.interests && profile.interests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* User's Meetups */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Meetups ({meetups.length})</h2>
            
            {meetups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No meetups yet
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meetups.map((meetup) => (
                  <div
                    key={meetup.id}
                    onClick={() => navigate(`/meetups/${meetup.id}`)}
                    className="group cursor-pointer rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all"
                  >
                    <div className="relative h-32">
                      <img
                        src={meetup.image_url}
                        alt={meetup.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 text-white">
                        <h3 className="font-semibold text-sm mb-1">{meetup.title}</h3>
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3" />
                          <span>{meetup.destination}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
