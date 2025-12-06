import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Calendar, LogOut, Menu, MessageCircle, Bell } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const ProfileMenu = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user && open) {
            fetchNotifications();
        }
    }, [user, open]);

    const fetchNotifications = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            setNotifications(data || []);
            setUnreadCount(data?.filter((n: any) => !n.is_read).length || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleNotificationClick = async (notification: any) => {
        try {
            // Mark as read
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notification.id);

            setOpen(false);

            // Navigate to the meetup if there's a meetup_id
            if (notification.meetup_id) {
                navigate(`/meetups/${notification.meetup_id}`);
            }
        } catch (error) {
            console.error('Error handling notification:', error);
        }
    };

    if (!user) return null;

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

                    {/* Notifications Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4" />
                                <span className="font-semibold text-sm">Notifications</span>
                            </div>
                            {unreadCount > 0 && (
                                <Badge variant="default" className="h-5 px-2">
                                    {unreadCount}
                                </Badge>
                            )}
                        </div>

                        {notifications.length > 0 ? (
                            <ScrollArea className="h-[150px] rounded-md border">
                                <div className="divide-y">
                                    {notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`w-full p-3 text-left hover:bg-muted/50 transition-colors text-sm ${!notification.is_read ? 'bg-primary/5' : ''
                                                }`}
                                        >
                                            <p className={`text-xs ${!notification.is_read ? 'font-semibold' : ''}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-4">
                                No notifications yet
                            </p>
                        )}
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

                        <Link to="/community" onClick={() => setOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start gap-3">
                                <MessageCircle className="h-4 w-4" />
                                Community Chat
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
