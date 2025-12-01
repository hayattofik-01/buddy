import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Upload, User, MapPin, Calendar, Globe, Languages, Edit2, X, Plus, Cake, Heart, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { profileSchema, languageSchema, countrySchema, sanitizeText, validateFile, fileValidation } from '@/lib/validation';
interface Profile {
  name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string | null;
  location: string | null;
  instagram: string | null;
  languages: string[];
  countries_traveled: string[];
  interests: string[];
}

interface Meetup {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  image_url: string;
}

const interestOptions = [
  { label: "Beach", emoji: "🏖️" },
  { label: "Mountains", emoji: "⛰️" },
  { label: "City Tours", emoji: "🏙️" },
  { label: "Food & Dining", emoji: "🍽️" },
  { label: "Nightlife", emoji: "🌃" },
  { label: "Adventure Sports", emoji: "🏄" },
  { label: "Photography", emoji: "📸" },
  { label: "History & Culture", emoji: "🏛️" },
  { label: "Nature", emoji: "🌿" },
  { label: "Shopping", emoji: "🛍️" },
  { label: "Wildlife", emoji: "🦁" },
  { label: "Art & Museums", emoji: "🎨" }
];

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile>({
    name: '',
    username: '',
    avatar_url: null,
    bio: null,
    date_of_birth: null,
    location: null,
    instagram: null,
    languages: [],
    countries_traveled: [],
    interests: [],
  });
  const [editedProfile, setEditedProfile] = useState<Profile>(profile);
  const [createdMeetups, setCreatedMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');
  const [newCountry, setNewCountry] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCreatedMeetups();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const profileData = {
          name: data.name || '',
          username: data.username || '',
          avatar_url: data.avatar_url,
          bio: data.bio,
          date_of_birth: data.date_of_birth,
          location: data.location,
          instagram: data.instagram,
          languages: data.languages || [],
          countries_traveled: data.countries_traveled || [],
          interests: data.interests || [],
        };
        setProfile(profileData);
        setEditedProfile(profileData);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Unable to load profile',
        description: 'Please refresh the page',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatedMeetups = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCreatedMeetups(data || []);
    } catch (error: any) {
      console.error('Error fetching meetups:', error);
    }
  };

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateProfileCompletion = () => {
    let completed = 0;
    const total = 7;

    if (profile.name) completed++;
    if (profile.avatar_url) completed++;
    if (profile.bio) completed++;
    if (profile.date_of_birth) completed++;
    if (profile.location) completed++;
    if (profile.languages.length > 0) completed++;
    if (profile.interests.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    
    // Validate file
    const validation = validateFile(file, fileValidation.allowedImageTypes);
    if (!validation.valid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (isEditing) {
        setEditedProfile({ ...editedProfile, avatar_url: publicUrl });
      } else {
        setProfile({ ...profile, avatar_url: publicUrl });
        setEditedProfile({ ...editedProfile, avatar_url: publicUrl });
      }

      // Auto-save avatar
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      toast({
        title: 'Avatar uploaded',
        description: 'Your avatar has been uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Unable to upload avatar',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = () => {
    setEditedProfile(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
    setNewLanguage('');
    setNewCountry('');
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate profile data
    const validation = profileSchema.safeParse({
      name: sanitizeText(editedProfile.name),
      username: sanitizeText(editedProfile.username),
      bio: editedProfile.bio ? sanitizeText(editedProfile.bio) : null,
      location: editedProfile.location ? sanitizeText(editedProfile.location) : null,
      instagram: editedProfile.instagram ? sanitizeText(editedProfile.instagram) : null,
      date_of_birth: editedProfile.date_of_birth,
      languages: editedProfile.languages.map(l => sanitizeText(l)),
      countries_traveled: editedProfile.countries_traveled.map(c => sanitizeText(c)),
      interests: editedProfile.interests,
    });

    if (!validation.success) {
      toast({
        title: 'Validation error',
        description: validation.error.issues[0].message,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: validation.data.name,
          username: validation.data.username,
          avatar_url: editedProfile.avatar_url,
          bio: validation.data.bio,
          date_of_birth: validation.data.date_of_birth,
          location: validation.data.location,
          instagram: validation.data.instagram,
          languages: validation.data.languages,
          countries_traveled: validation.data.countries_traveled,
          interests: validation.data.interests,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(editedProfile);
      setIsEditing(false);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Unable to save changes',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addLanguage = () => {
    const validation = languageSchema.safeParse(newLanguage);
    if (!validation.success) {
      toast({
        title: 'Invalid language',
        description: validation.error.issues[0].message,
        variant: 'destructive',
      });
      return;
    }
    
    if (!editedProfile.languages.includes(validation.data)) {
      if (editedProfile.languages.length >= 20) {
        toast({
          title: 'Limit reached',
          description: 'Maximum 20 languages allowed',
          variant: 'destructive',
        });
        return;
      }
      setEditedProfile({ ...editedProfile, languages: [...editedProfile.languages, validation.data] });
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang: string) => {
    setEditedProfile({ ...editedProfile, languages: editedProfile.languages.filter(l => l !== lang) });
  };

  const addCountry = () => {
    const validation = countrySchema.safeParse(newCountry);
    if (!validation.success) {
      toast({
        title: 'Invalid country',
        description: validation.error.issues[0].message,
        variant: 'destructive',
      });
      return;
    }
    
    if (!editedProfile.countries_traveled.includes(validation.data)) {
      if (editedProfile.countries_traveled.length >= 200) {
        toast({
          title: 'Limit reached',
          description: 'Maximum 200 countries allowed',
          variant: 'destructive',
        });
        return;
      }
      setEditedProfile({ ...editedProfile, countries_traveled: [...editedProfile.countries_traveled, validation.data] });
      setNewCountry('');
    }
  };

  const removeCountry = (country: string) => {
    setEditedProfile({ ...editedProfile, countries_traveled: editedProfile.countries_traveled.filter(c => c !== country) });
  };

  const toggleInterest = (interest: string) => {
    if (editedProfile.interests.includes(interest)) {
      setEditedProfile({ ...editedProfile, interests: editedProfile.interests.filter(i => i !== interest) });
    } else {
      if (editedProfile.interests.length >= 20) {
        toast({
          title: 'Limit reached',
          description: 'Maximum 20 interests allowed',
          variant: 'destructive',
        });
        return;
      }
      setEditedProfile({ ...editedProfile, interests: [...editedProfile.interests, interest] });
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

  const completionPercent = calculateProfileCompletion();
  const age = calculateAge(profile.date_of_birth);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-5xl">
        {!isEditing ? (
          // VIEW MODE
          <div className="space-y-4 md:space-y-6 pb-8">
            {/* Profile Header Card */}
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
              <div className="relative p-4 md:p-8">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                  <div className="relative mx-auto md:mx-0">
                    <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback className="text-2xl md:text-3xl">
                        <User className="h-12 w-12 md:h-16 md:w-16" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2">
                      <input
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                      />
                      <Button
                        size="icon"
                        variant="secondary"
                        className="rounded-full h-8 w-8 md:h-10 md:w-10 shadow-lg"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 md:h-4 md:w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                      <div className="w-full md:w-auto">
                        <h1 className="text-2xl md:text-3xl font-bold mb-1 text-center md:text-left">{profile.name || 'Your Name'}</h1>
                        {profile.username && (
                          <p className="text-muted-foreground mb-2 text-center md:text-left">@{profile.username}</p>
                        )}
                        {profile.bio && (
                          <p className="text-foreground/80 max-w-2xl text-sm md:text-base text-center md:text-left">{profile.bio}</p>
                        )}
                      </div>
                      <Button onClick={handleEdit} size="sm" className="gap-2 w-full md:w-auto">
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 md:gap-4 mt-4 justify-center md:justify-start">
                      {age && (
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <Cake className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                          <span>{age} years old</span>
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile.instagram && (
                        <a 
                          href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs md:text-sm hover:text-primary transition-colors"
                        >
                          <Instagram className="h-3 w-3 md:h-4 md:w-4 text-pink-600" />
                          <span>@{profile.instagram.replace('@', '')}</span>
                        </a>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-500"
                            style={{ width: `${completionPercent}%` }}
                          />
                        </div>
                        <span className="text-xs md:text-sm font-medium text-primary">{completionPercent}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Profile Completion</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Interests Section */}
            {profile.interests.length > 0 && (
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <Heart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <h2 className="text-lg md:text-xl font-semibold">Interests</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => {
                    const option = interestOptions.find(i => i.label === interest);
                    return (
                      <Badge key={interest} variant="secondary" className="px-2 md:px-3 py-1 text-xs md:text-sm">
                        {option?.emoji} {interest}
                      </Badge>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Languages & Travel Section */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {profile.languages.length > 0 && (
                <Card className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <Languages className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <h2 className="text-lg md:text-xl font-semibold">Languages</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang) => (
                      <Badge key={lang} variant="outline" className="px-2 md:px-3 py-1 text-xs md:text-sm">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {profile.countries_traveled.length > 0 && (
                <Card className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <Globe className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <h2 className="text-lg md:text-xl font-semibold">Countries Visited</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.countries_traveled.map((country) => (
                      <Badge key={country} variant="outline" className="px-2 md:px-3 py-1 text-xs md:text-sm">
                        🌍 {country}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* My Created Meetups */}
            {createdMeetups.length > 0 && (
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <h2 className="text-lg md:text-xl font-semibold">My Meetups</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {createdMeetups.map((meetup) => (
                    <Link key={meetup.id} to={`/meetups/${meetup.id}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                        <img 
                          src={meetup.image_url} 
                          alt={meetup.title}
                          className="w-full h-32 md:h-40 object-cover"
                        />
                        <div className="p-3 md:p-4">
                          <h3 className="font-semibold mb-1 line-clamp-1 text-sm md:text-base">{meetup.title}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 mb-2">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {meetup.destination}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(meetup.start_date), 'MMM d')} - {format(new Date(meetup.end_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          // EDIT MODE
          <div className="space-y-4 md:space-y-6 pb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-bold">Edit Profile</h1>
              <Button variant="outline" onClick={handleCancel} size="sm" className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>

            <Card className="p-4 md:p-6 space-y-4 md:space-y-6">
              <h2 className="text-lg md:text-xl font-semibold">Basic Information</h2>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={editedProfile.username}
                  onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                  placeholder="@username"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editedProfile.bio || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={editedProfile.date_of_birth || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, date_of_birth: e.target.value })}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={editedProfile.location || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>

              {/* Instagram */}
              <div className="space-y-2">
                <Label htmlFor="instagram">
                  <Instagram className="h-4 w-4 inline mr-2 text-pink-600" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={editedProfile.instagram || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, instagram: e.target.value })}
                  placeholder="@username"
                />
                <p className="text-xs text-muted-foreground">Enter your Instagram username</p>
              </div>
            </Card>

            {/* Interests */}
            <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-xl font-semibold">Interests</h2>
              <p className="text-xs md:text-sm text-muted-foreground">Select what you love</p>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map((interest) => (
                  <Badge
                    key={interest.label}
                    variant={editedProfile.interests.includes(interest.label) ? 'default' : 'outline'}
                    className="cursor-pointer px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm"
                    onClick={() => toggleInterest(interest.label)}
                  >
                    {interest.emoji} {interest.label}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Languages */}
            <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-xl font-semibold">
                <Languages className="h-4 w-4 md:h-5 md:w-5 inline mr-2" />
                Languages
              </h2>
              <div className="flex gap-2">
                <Input
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  placeholder="Add a language"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                  className="text-sm md:text-base"
                />
                <Button onClick={addLanguage} type="button" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedProfile.languages.map((lang) => (
                  <Badge key={lang} variant="secondary" className="gap-2 px-2 md:px-3 py-1 text-xs md:text-sm">
                    {lang}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeLanguage(lang)}
                    />
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Countries */}
            <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-xl font-semibold">
                <Globe className="h-4 w-4 md:h-5 md:w-5 inline mr-2" />
                Countries Traveled
              </h2>
              <div className="flex gap-2">
                <Input
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  placeholder="Add a country"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCountry())}
                  className="text-sm md:text-base"
                />
                <Button onClick={addCountry} type="button" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedProfile.countries_traveled.map((country) => (
                  <Badge key={country} variant="secondary" className="gap-2 px-2 md:px-3 py-1 text-xs md:text-sm">
                    🌍 {country}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeCountry(country)}
                    />
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Save Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                size="lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
