import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMeetups } from "@/contexts/MeetupsContext";
import { useToast } from "@/hooks/use-toast";
import { validateMeetup, sanitizeText } from "@/lib/validation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Send, Users, Instagram as InstagramIcon } from "lucide-react";
import CityAutocomplete from "@/components/CityAutocomplete";
import { validateSocialGroupLink, getPlatformIcon, getPlatformName, getPlatformColor } from "@/lib/socialValidation";
import beachImage from "@/assets/destination-beach.jpg";
import mountainImage from "@/assets/destination-mountain.jpg";
import cityImage from "@/assets/destination-city.jpg";

const CreateMeetup = () => {
  const navigate = useNavigate();
  const { addMeetup } = useMeetups();
  const { toast } = useToast();
  const [tripType, setTripType] = useState<"open" | "locked">("open");
  const [isPaid, setIsPaid] = useState(false);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [noLimit, setNoLimit] = useState(false);
  const [description, setDescription] = useState("");
  const [socialGroupLink, setSocialGroupLink] = useState("");
  const [socialLinkError, setSocialLinkError] = useState("");

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
      meetingPoint: meetingPoint ? sanitizeText(meetingPoint) : undefined,
      type: tripType,
      maxMembers: noLimit ? 999999 : parseInt(maxMembers) || 0,
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
      await addMeetup({
        ...sanitizedData,
        imageUrl: getRandomImage(),
      });
      navigate("/meetups");
    } catch (error) {
      console.error('Error creating meetup:', error);
    }
  };

  const getRandomImage = () => {
    const images = [beachImage, mountainImage, cityImage];
    return images[Math.floor(Math.random() * images.length)];
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create a New Meetup</CardTitle>
            <CardDescription>
              Share your travel plans and connect with others going to the same destination
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Meetup Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Beach Lovers in Maldives"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <CityAutocomplete
                id="destination"
                label="Destination"
                placeholder="e.g., Maldives, Tokyo, Paris..."
                value={destination}
                onChange={setDestination}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    min={startDate}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meetingPoint">Meeting Point (Optional)</Label>
                <Input
                  id="meetingPoint"
                  placeholder="e.g., Hotel Lobby, Airport..."
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="noLimit"
                    checked={noLimit}
                    onCheckedChange={(checked) => {
                      setNoLimit(checked as boolean);
                      if (checked) setMaxMembers("");
                    }}
                  />
                  <Label htmlFor="noLimit" className="font-normal cursor-pointer">
                    No member limit
                  </Label>
                </div>

                {!noLimit && (
                  <div className="space-y-2">
                    <Label htmlFor="maxMembers">Maximum Members *</Label>
                    <Input
                      id="maxMembers"
                      type="number"
                      min="2"
                      placeholder="e.g., 10"
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(e.target.value)}
                      required={!noLimit}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell others about your meetup plans..."
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
                          validation.platform === 'facebook' ? Users :
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

              <div className="space-y-3">
                <Label>Meetup Type</Label>
                <RadioGroup value={tripType} onValueChange={(value: "open" | "locked") => setTripType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="open" id="open" />
                    <Label htmlFor="open" className="font-normal cursor-pointer">
                      Open - Anyone can join
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="locked" id="locked" />
                    <Label htmlFor="locked" className="font-normal cursor-pointer">
                      Locked - Requires approval
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPaid"
                  checked={isPaid}
                  onCheckedChange={(checked) => setIsPaid(checked as boolean)}
                />
                <Label htmlFor="isPaid" className="font-normal cursor-pointer">
                  This is a paid meetup
                </Label>
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
                Create Meetup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateMeetup;
