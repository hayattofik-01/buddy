import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMeetups } from "@/contexts/MeetupsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { validateMeetup, sanitizeText } from "@/lib/validation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MessageCircle, Send, Users as UsersIcon, Instagram as InstagramIcon } from "lucide-react";
import CityAutocomplete from "@/components/CityAutocomplete";
import { validateSocialGroupLink, getPlatformIcon, getPlatformName, getPlatformColor } from "@/lib/socialValidation";

const EditMeetup = () => {
  const navigate = useNavigate();
  const { meetupId } = useParams();
  const { updateMeetup } = useMeetups();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tripType, setTripType] = useState<"open" | "locked">("open");
  const [isPaid, setIsPaid] = useState(false);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxMembers, setMaxMembers] = useState("10");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [description, setDescription] = useState("");
  const [socialGroupLink, setSocialGroupLink] = useState("");
  const [socialLinkError, setSocialLinkError] = useState("");

  useEffect(() => {
    const fetchMeetup = async () => {
      if (!meetupId || !user) return;

      try {
        const { data, error } = await supabase
          .from('meetups')
          .select('*')
          .eq('id', meetupId)
          .eq('creator_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Not authorized",
            description: "You can only edit meetups you created",
            variant: "destructive",
          });
          navigate('/meetups');
          return;
        }

        setTitle(data.title);
        setDestination(data.destination);
        setStartDate(data.start_date);
        setEndDate(data.end_date);
        setMaxMembers(data.max_members.toString());
        setMeetingPoint(data.meeting_point || "");
        setDescription(data.description || "");
        setTripType(data.type);
        setIsPaid(data.is_paid || false);
        setAmount(data.amount ? data.amount.toString() : "");
        setSocialGroupLink(data.social_group_link || "");
      } catch (error: any) {
        console.error('Error loading meetup:', error);
        toast({
          title: "Unable to load meetup",
          description: "Please try again later",
          variant: "destructive",
        });
        navigate('/meetups');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetup();
  }, [meetupId, user, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate social group link if provided
    const socialValidation = validateSocialGroupLink(socialGroupLink);
    if (!socialValidation.isValid) {
      toast({
        title: "Invalid social group link",
        description: socialValidation.error,
        variant: "destructive",
      });
      setSocialLinkError(socialValidation.error || "");
      return;
    }

    const sanitizedData = {
      title: sanitizeText(title),
      destination: sanitizeText(destination),
      startDate,
      endDate,
      maxMembers: parseInt(maxMembers) || 0,
      meetingPoint: meetingPoint ? sanitizeText(meetingPoint) : undefined,
      type: tripType,
      description: description ? sanitizeText(description) : undefined,
      isPaid,
      amount: isPaid && amount ? parseFloat(amount) : undefined,
      socialGroupLink: socialValidation.url || undefined,
    };

    const validation = validateMeetup(sanitizedData);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast({
        title: "Invalid input",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    try {
      await updateMeetup(meetupId!, sanitizedData);
      navigate(`/meetups/${meetupId}`);
    } catch (error) {
      console.error("Error updating meetup:", error);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/meetups/${meetupId}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-6">Edit Meetup</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Meetup Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Beach Day in Bali"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <CityAutocomplete
                id="destination"
                label="Destination"
                value={destination}
                onChange={setDestination}
                placeholder="Search for a city..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMembers">Max Members *</Label>
              <Input
                id="maxMembers"
                type="number"
                min="2"
                placeholder="e.g., 10"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingPoint">Meeting Point (optional)</Label>
              <Input
                id="meetingPoint"
                placeholder="e.g., Central Station, Main Square"
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Tell people about your meetup..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="socialGroupLink">Social Group Link (Optional)</Label>
              <div className="relative">
                <Input
                  id="socialGroupLink"
                  placeholder="WhatsApp, Telegram, Facebook, or Instagram group link"
                  value={socialGroupLink}
                  onChange={(e) => {
                    setSocialGroupLink(e.target.value);
                    setSocialLinkError("");
                  }}
                  className={socialLinkError ? "border-destructive" : ""}
                />
                {socialGroupLink && (() => {
                  const validation = validateSocialGroupLink(socialGroupLink);
                  if (validation.isValid && validation.platform) {
                    const Icon = validation.platform === 'whatsapp' ? MessageCircle :
                      validation.platform === 'telegram' ? Send :
                        validation.platform === 'facebook' ? UsersIcon :
                          validation.platform === 'instagram' ? InstagramIcon :
                            null;
                    return Icon ? (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Icon className={`h-5 w-5 ${getPlatformColor(validation.platform)}`} />
                      </div>
                    ) : null;
                  }
                  return null;
                })()}
              </div>
              {socialLinkError && (
                <p className="text-sm text-destructive">{socialLinkError}</p>
              )}
              {socialGroupLink && !socialLinkError && (() => {
                const validation = validateSocialGroupLink(socialGroupLink);
                return validation.isValid && validation.platform ? (
                  <p className="text-sm text-muted-foreground">
                    ✓ {getPlatformName(validation.platform)} group link detected
                  </p>
                ) : null;
              })()}
              <p className="text-xs text-muted-foreground">
                Connect your WhatsApp, Telegram, Facebook, or Instagram group for easier communication
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tripType">Private Meetup</Label>
                  <p className="text-sm text-muted-foreground">
                    Only invited members can join
                  </p>
                </div>
                <Switch
                  id="tripType"
                  checked={tripType === "locked"}
                  onCheckedChange={(checked) =>
                    setTripType(checked ? "locked" : "open")
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPaid">Paid Meetup</Label>
                  <p className="text-sm text-muted-foreground">
                    Charge members to join
                  </p>
                </div>
                <Switch
                  id="isPaid"
                  checked={isPaid}
                  onCheckedChange={setIsPaid}
                />
              </div>

              {isPaid && (
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 50.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required={isPaid}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Update Meetup
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditMeetup;
