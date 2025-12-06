import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Calendar, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const ProfileMenu = () => {
    const { user, signOut } = useAuth();
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <User className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                    <SheetTitle>Profile Menu</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback>
                                <User className="h-6 w-6" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                                {user?.user_metadata?.name || user?.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    {/* Menu Items */}
                    <nav className="space-y-2">
                        <Link to="/profile" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start gap-3">
                                <User className="h-4 w-4" />
                                Profile
                            </Button>
                        </Link>

                        <Link to="/my-meetups" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start gap-3">
                                <Calendar className="h-4 w-4" />
                                My Meetups
                            </Button>
                        </Link>
                    </nav>

                    <Separator />

                    {/* Sign Out */}
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                        onClick={() => {
                            setOpen(false);
                            signOut();
                        }}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default ProfileMenu;
