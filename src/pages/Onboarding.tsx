import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Globe, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { OnboardingCard } from "@/components/OnboardingCard";
import { onboardingSchema, sanitizeText } from "@/lib/validation";

const interestsOptions = [
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

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 3;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('date_of_birth, name')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.name) {
        setName(profile.name);
      } else if (user.user_metadata?.name || user.user_metadata?.full_name) {
        setName(user.user_metadata?.name || user.user_metadata?.full_name);
      }

      if (profile?.date_of_birth && profile?.name) {
        setShouldShowOnboarding(false);
        navigate("/meetups");
      }
    };

    checkProfile();
  }, [user, navigate]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 20 ? [...prev, interest] : prev
    );
  };

  const validateStep0 = () => {
    const validation = onboardingSchema.safeParse({
      name: sanitizeText(name),
      dateOfBirth,
      interests: selectedInterests,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field === 'name' || field === 'dateOfBirth') {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!validateStep0()) {
        toast({
          title: "Validation error",
          description: errors.name || errors.dateOfBirth || "Please check your inputs",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSkip = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/meetups");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    const validation = onboardingSchema.safeParse({
      name: sanitizeText(name),
      dateOfBirth,
      interests: selectedInterests,
    });

    if (!validation.success) {
      toast({
        title: "Validation error",
        description: validation.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: validation.data.name,
          date_of_birth: validation.data.dateOfBirth,
          interests: validation.data.interests || [],
        });

      if (error) throw error;

      toast({
        title: "Profile completed!",
        description: "Welcome to WanderBuddy",
      });

      setShouldShowOnboarding(false);
      navigate("/meetups", { replace: true });
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Unable to save profile",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!shouldShowOnboarding) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary mb-4">
            <Globe className="h-8 w-8" />
            <span>WanderBuddy</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">Tell us more about yourself</p>
          <Progress value={progress} className="mt-4 h-2" />
          <p className="text-sm text-muted-foreground mt-2">Step {currentStep + 1} of {totalSteps}</p>
        </div>

        <div className="relative h-[500px]">
          {/* Step 0: Name & Date of Birth */}
          <OnboardingCard isActive={currentStep === 0} index={0} currentStep={currentStep}>
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-6 flex-1">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Let's get to know you</h2>
                  <p className="text-muted-foreground">Tell us your name and date of birth</p>
                </div>
                <div className="space-y-6 max-w-md mx-auto">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-lg">Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-lg h-12"
                      maxLength={100}
                      required
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-lg">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="text-lg h-12"
                      required
                    />
                    {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth}</p>}
                    <p className="text-xs text-muted-foreground">You must be at least 13 years old</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12"
                  disabled={!name || !dateOfBirth}
                >
                  Continue
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </OnboardingCard>

          {/* Step 1: Interests */}
          <OnboardingCard isActive={currentStep === 1} index={1} currentStep={currentStep}>
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">What do you like?</h2>
                  <p className="text-muted-foreground">Select your travel interests (max 20)</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {interestsOptions.map((interest) => (
                    <Badge
                      key={interest.label}
                      variant={selectedInterests.includes(interest.label) ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2 text-sm hover-scale"
                      onClick={() => toggleInterest(interest.label)}
                    >
                      <span className="mr-1">{interest.emoji}</span>
                      {interest.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={handleSkip} className="h-12">
                  Skip
                </Button>
                <Button onClick={handleNext} className="flex-1 h-12">
                  Continue
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </OnboardingCard>

          {/* Step 2: Summary */}
          <OnboardingCard isActive={currentStep === 2} index={2} currentStep={currentStep}>
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-6 flex-1">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
                  <p className="text-muted-foreground">Review your profile</p>
                </div>

                <div className="space-y-4 max-w-md mx-auto">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{name}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Date of Birth</p>
                    <p className="font-medium">{dateOfBirth}</p>
                  </div>
                  {selectedInterests.length > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-2">Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedInterests.map((interest) => {
                          const option = interestsOptions.find(i => i.label === interest);
                          return (
                            <Badge key={interest} variant="secondary">
                              {option?.emoji} {interest}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setCurrentStep(0)} className="h-12">
                  Edit
                </Button>
                <Button onClick={handleNext} className="flex-1 h-12" disabled={loading}>
                  {loading ? "Saving..." : "Complete Profile"}
                </Button>
              </div>
            </div>
          </OnboardingCard>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
