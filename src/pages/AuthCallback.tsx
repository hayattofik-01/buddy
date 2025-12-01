import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (loading) return;
      
      if (!user) {
        navigate("/auth");
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('date_of_birth, name')
          .eq('id', user.id)
          .maybeSingle();

        // If profile is incomplete, redirect to onboarding
        if (!profile?.date_of_birth || !profile?.name) {
          navigate("/onboarding", { replace: true });
        } else {
          // Profile is complete, redirect to home/feed
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        // On error, redirect to onboarding to be safe
        navigate("/onboarding", { replace: true });
      }
    };

    checkProfileAndRedirect();
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
