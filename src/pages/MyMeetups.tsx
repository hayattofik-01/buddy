import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MeetupCard from "@/components/MeetupCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Loader2 } from "lucide-react";

interface Meetup {
    id: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    meetingPoint: string;
    type: 'open' | 'locked';
    maxMembers: number;
    imageUrl: string;
    description: string;
    isPaid: boolean;
    creatorId: string;
    creatorName: string;
    currentMembers: number;
}

const MyMeetups = () => {
    const { user } = useAuth();
    const [meetups, setMeetups] = useState<Meetup[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (user) {
            fetchMyMeetups();
        }
    }, [user]);

    const fetchMyMeetups = async () => {
        try {
            setLoading(true);

            // Fetch meetups where the user is a member
            const { data, error } = await supabase
                .from('meetup_members')
                .select(`
          meetup_id,
          trips:meetup_id (
            id,
            title,
            destination,
            start_date,
            end_date,
            meeting_point,
            type,
            max_members,
            image_url,
            description,
            is_paid,
            creator_id,
            profiles:creator_id (
              name
            )
          )
        `)
                .eq('user_id', user?.id);

            if (error) throw error;

            // For each meetup, get the member count
            const meetupsWithCounts = await Promise.all(
                (data || []).map(async (item: any) => {
                    const trip = item.trips;
                    if (!trip) return null;

                    // Get member count for this meetup
                    const { count } = await supabase
                        .from('meetup_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('meetup_id', trip.id);

                    return {
                        id: trip.id,
                        title: trip.title,
                        destination: trip.destination,
                        startDate: trip.start_date,
                        endDate: trip.end_date,
                        meetingPoint: trip.meeting_point,
                        type: trip.type as 'open' | 'locked',
                        maxMembers: trip.max_members,
                        imageUrl: trip.image_url,
                        description: trip.description,
                        isPaid: trip.is_paid,
                        creatorId: trip.creator_id,
                        creatorName: trip.profiles?.name || 'Unknown',
                        currentMembers: count || 0,
                    };
                })
            );

            const validMeetups = meetupsWithCounts.filter(Boolean) as Meetup[];
            setMeetups(validMeetups);
        } catch (error: any) {
            console.error('Error fetching my meetups:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter meetups based on search query
    const filteredMeetups = useMemo(() => {
        if (!searchQuery.trim()) return meetups;

        const query = searchQuery.toLowerCase();
        return meetups.filter(meetup =>
            meetup.title.toLowerCase().includes(query) ||
            meetup.destination.toLowerCase().includes(query)
        );
    }, [meetups, searchQuery]);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8 pt-24">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-bold mb-2">My Meetups</h1>
                    <p className="text-muted-foreground mb-8">
                        Meetups you've joined and are part of
                    </p>

                    {/* Search Bar */}
                    {meetups.length > 0 && (
                        <div className="mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search your meetups..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredMeetups.length === 0 ? (
                        <div className="text-center py-16 max-w-2xl mx-auto">
                            {searchQuery ? (
                                <div className="space-y-4">
                                    <p className="text-muted-foreground text-lg mb-4">
                                        No meetups match your search
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setSearchQuery("")}
                                    >
                                        Clear search
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Calendar className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-2">No Meetups Yet</h3>
                                    <p className="text-muted-foreground text-lg mb-6">
                                        You haven't joined any meetups yet. Browse available meetups and join one to start connecting with fellow travelers!
                                    </p>
                                    <Button asChild size="lg">
                                        <Link to="/meetups">Browse Meetups</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground mb-4">
                                {filteredMeetups.length} {filteredMeetups.length === 1 ? 'meetup' : 'meetups'}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredMeetups.map((meetup) => (
                                    <MeetupCard key={meetup.id} {...meetup} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyMeetups;
