import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MeetupsProvider } from "./contexts/MeetupsContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Meetups from "./pages/Meetups";
import CreateMeetup from "./pages/CreateMeetup";
import EditMeetup from "./pages/EditMeetup";
import MeetupDetails from "./pages/MeetupDetails";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Community from "./pages/Community";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <MeetupsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/meetups" element={<ProtectedRoute><Meetups /></ProtectedRoute>} />
              <Route path="/meetups/:meetupId" element={<ProtectedRoute><MeetupDetails /></ProtectedRoute>} />
              <Route path="/meetups/:meetupId/edit" element={<ProtectedRoute><EditMeetup /></ProtectedRoute>} />
              <Route path="/create-meetup" element={<ProtectedRoute><CreateMeetup /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/community" element={<Community />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </MeetupsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
