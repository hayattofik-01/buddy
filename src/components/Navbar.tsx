import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, Plus, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

const Navbar = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <Compass className="h-6 w-6" />
            <span>WanderBuddy</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/meetups" className="text-foreground hover:text-primary transition-colors">
              Join Meetups
            </Link>
            <Link to="/my-meetups" className="text-foreground hover:text-primary transition-colors">
              My Meetups
            </Link>
            <Link to="/community" className="text-foreground hover:text-primary transition-colors">
              Community Chat
            </Link>
          </div>

          <div className="flex md:hidden items-center gap-3 flex-1 justify-center mx-4">
            <Link to="/meetups" className="text-foreground hover:text-primary transition-colors text-sm">
              Join Meetups
            </Link>
            <Link to="/community" className="text-foreground hover:text-primary transition-colors text-sm">
              Travel Chat
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                <Button variant="ghost" size="sm" asChild className="hidden md:flex">
                  <Link to="/profile">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                </Button>
                <Button size="sm" asChild className="hidden md:flex">
                  <Link to="/create-meetup">
                    <Plus className="h-4 w-4" />
                    <span>Create Meetup</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:flex">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
                <Button size="icon" asChild className="md:hidden">
                  <Link to="/create-meetup">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
                <ProfileMenu />
              </>
            ) : (
              <Button size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
