import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plane, MapPin, Globe, Compass, ExternalLink, Copy, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isInAppBrowser, getInAppBrowserName, copyCurrentUrl } from "@/utils/browserDetection";
import heroImage from "@/assets/hero-travel.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, user } = useAuth();
  const { toast } = useToast();
  const [isInApp, setIsInApp] = useState(false);
  const [browserName, setBrowserName] = useState<string | null>(null);

  useEffect(() => {
    setIsInApp(isInAppBrowser());
    setBrowserName(getInAppBrowserName());
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/meetups");
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();

    if (error) {
      console.error('Google sign in error:', error);
      toast({
        title: "Unable to sign in with Google",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCopyUrl = async () => {
    const success = await copyCurrentUrl();
    if (success) {
      toast({
        title: "Link copied!",
        description: "Open the link in Safari or Chrome to sign in",
      });
    } else {
      toast({
        title: "Failed to copy",
        description: "Please manually copy the URL from your browser",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4">
        {/* Logo & Title */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 text-white">
            <Compass className="h-12 w-12" />
            <h1 className="text-4xl font-bold">WanderBuddy</h1>
          </div>
          <p className="text-xl text-white/90 font-medium">
            Explore the world, together
          </p>
        </div>

        {/* In-App Browser Warning */}
        {isInApp && (
          <Card className="border-yellow-500/50 bg-yellow-500/10 backdrop-blur-xl shadow-2xl p-6 mb-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-100 mb-2">
                    {browserName ? `${browserName} Browser Detected` : 'In-App Browser Detected'}
                  </h3>
                  <p className="text-yellow-100/90 text-sm mb-3">
                    Google sign-in doesn't work in in-app browsers due to security restrictions.
                    Please open this page in Safari or Chrome to continue.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleCopyUrl}
                      variant="secondary"
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      onClick={() => window.open(window.location.href, '_blank')}
                      variant="outline"
                      size="sm"
                      className="border-yellow-500/50 text-yellow-100 hover:bg-yellow-500/20"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in Browser
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Auth Card */}
        <Card className="border-white/20 bg-black/30 backdrop-blur-xl shadow-2xl text-white p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Welcome Back</h2>
              <p className="text-white/70">Sign in to continue your adventure</p>
            </div>

            {/* Google Sign In Button */}
            <Button
              type="button"
              size="lg"
              className="w-full h-14 bg-white text-gray-900 hover:bg-gray-100 font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGoogleSignIn}
              disabled={isInApp}
              title={isInApp ? "Please open in Safari or Chrome to sign in" : ""}
            >
              <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Features */}
            <div className="pt-6 space-y-3 border-t border-white/10">
              <div className="flex items-center gap-3 text-white/80">
                <Plane className="h-5 w-5 text-primary" />
                <span className="text-sm">Meet travelers worldwide</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-sm">Create & join meetups</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <Globe className="h-5 w-5 text-primary" />
                <span className="text-sm">Explore destinations together</span>
              </div>
            </div>

            {/* Terms */}
            <p className="text-xs text-white/50 text-center pt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
