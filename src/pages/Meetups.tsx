import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MeetupCard from "@/components/MeetupCard";
import { useMeetups } from "@/contexts/MeetupsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, X, MapPin, Calendar } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

const Meetups = () => {
  const { meetups, loading } = useMeetups();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Filter states
  const [tripTypeFilter, setTripTypeFilter] = useState<"all" | "free" | "paid">("all");
  const [minMembers, setMinMembers] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Search suggestions based on existing meetups
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return { destinations: [], titles: [] };
    
    const query = searchQuery.toLowerCase();
    
    const destinationSuggestions = Array.from(
      new Set(
        meetups
          .map(meetup => meetup.destination)
          .filter(dest => dest.toLowerCase().includes(query))
      )
    ).slice(0, 5);
    
    const titleSuggestions = Array.from(
      new Set(
        meetups
          .map(meetup => meetup.title)
          .filter(title => title.toLowerCase().includes(query))
      )
    ).slice(0, 3);
    
    return {
      destinations: destinationSuggestions,
      titles: titleSuggestions
    };
  }, [searchQuery, meetups]);

  // Check if any filters are active
  const hasActiveFilters = 
    tripTypeFilter !== "all" || 
    minMembers !== "" || 
    maxMembers !== "" || 
    dateFrom !== "" || 
    dateTo !== "";

  // Clear all filters
  const clearFilters = () => {
    setTripTypeFilter("all");
    setMinMembers("");
    setMaxMembers("");
    setDateFrom("");
    setDateTo("");
  };

  // Filter meetups based on all criteria
  const filteredMeetups = useMemo(() => {
    return meetups.filter(meetup => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          meetup.title.toLowerCase().includes(query) ||
          meetup.destination.toLowerCase().includes(query);
        
        if (!matchesSearch) return false;
      }

      // Trip type filter (paid/free)
      if (tripTypeFilter !== "all") {
        const isPaidMeetup = meetup.isPaid;
        if (tripTypeFilter === "paid" && !isPaidMeetup) return false;
        if (tripTypeFilter === "free" && isPaidMeetup) return false;
      }

      // Member count filter
      if (minMembers && meetup.maxMembers < parseInt(minMembers)) return false;
      if (maxMembers && meetup.maxMembers > parseInt(maxMembers)) return false;

      // Date range filter - show overlapping meetups using date-only comparison
      const meetupStartStr = meetup.startDate?.split('T')[0];
      const meetupEndStr = meetup.endDate?.split('T')[0];

      if (dateFrom && dateTo) {
        const filterFromStr = dateFrom;
        const filterToStr = dateTo;

        // Exclude if no overlap: meetup ends before filter starts OR meetup starts after filter ends
        if (!meetupStartStr || !meetupEndStr) return false;
        if (meetupEndStr < filterFromStr || meetupStartStr > filterToStr) return false;
      } else if (dateFrom) {
        // If only start date is set, show meetups that end on or after this date
        const filterFromStr = dateFrom;
        if (!meetupEndStr || meetupEndStr < filterFromStr) return false;
      } else if (dateTo) {
        // If only end date is set, show meetups that start on or before this date
        const filterToStr = dateTo;
        if (!meetupStartStr || meetupStartStr > filterToStr) return false;
      }

      return true;
    });
  }, [meetups, searchQuery, tripTypeFilter, minMembers, maxMembers, dateFrom, dateTo]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Join Meetups</h1>
          <p className="text-muted-foreground mb-8">
            Discover meetups to your favorite destinations and connect with travelers
          </p>

          {/* Search and Filter Bar */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by destination or title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-10"
              />
              
              {/* Search Suggestions */}
              {showSuggestions && (suggestions.destinations.length > 0 || suggestions.titles.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg overflow-hidden">
                  {suggestions.destinations.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Destinations
                      </div>
                      {suggestions.destinations.map((destination, index) => (
                        <button
                          key={`dest-${index}`}
                          className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-2"
                          onClick={() => {
                            setSearchQuery(destination);
                            setShowSuggestions(false);
                          }}
                        >
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{destination}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.titles.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                        Meetups
                      </div>
                      {suggestions.titles.map((title, index) => (
                        <button
                          key={`title-${index}`}
                          className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center gap-2"
                          onClick={() => {
                            setSearchQuery(title);
                            setShowSuggestions(false);
                          }}
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2">
                      Active
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filter Meetups</DialogTitle>
                  <DialogDescription>
                    Narrow down your search to find the perfect meetup
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Trip Type Filter */}
                  <div className="space-y-3">
                    <Label>Meetup Type</Label>
                    <RadioGroup value={tripTypeFilter} onValueChange={(value: any) => setTripTypeFilter(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all" className="font-normal cursor-pointer">All Meetups</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="free" id="free" />
                        <Label htmlFor="free" className="font-normal cursor-pointer">Free Only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="paid" id="paid" />
                        <Label htmlFor="paid" className="font-normal cursor-pointer">Paid Only</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Member Count Filter */}
                  <div className="space-y-3">
                    <Label>Number of Members</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="minMembers" className="text-xs text-muted-foreground">Min</Label>
                        <Input
                          id="minMembers"
                          type="number"
                          placeholder="Min"
                          value={minMembers}
                          onChange={(e) => setMinMembers(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxMembers" className="text-xs text-muted-foreground">Max</Label>
                        <Input
                          id="maxMembers"
                          type="number"
                          placeholder="Max"
                          value={maxMembers}
                          onChange={(e) => setMaxMembers(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="space-y-3">
                    <Label>Date Range</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">From</Label>
                        <Input
                          id="dateFrom"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateTo" className="text-xs text-muted-foreground">To</Label>
                        <Input
                          id="dateTo"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearFilters}
                    >
                      Clear All
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setFilterDialogOpen(false)}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {tripTypeFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {tripTypeFilter === "paid" ? "Paid" : "Free"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setTripTypeFilter("all")}
                  />
                </Badge>
              )}
              {minMembers && (
                <Badge variant="secondary" className="gap-1">
                  Min: {minMembers} members
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setMinMembers("")}
                  />
                </Badge>
              )}
              {maxMembers && (
                <Badge variant="secondary" className="gap-1">
                  Max: {maxMembers} members
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setMaxMembers("")}
                  />
                </Badge>
              )}
              {dateFrom && (
                <Badge variant="secondary" className="gap-1">
                  From: {new Date(dateFrom).toLocaleDateString()}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setDateFrom("")}
                  />
                </Badge>
              )}
              {dateTo && (
                <Badge variant="secondary" className="gap-1">
                  To: {new Date(dateTo).toLocaleDateString()}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setDateTo("")}
                  />
                </Badge>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMeetups.length === 0 ? (
            <div className="text-center py-16 max-w-2xl mx-auto">
              {searchQuery || hasActiveFilters ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-lg mb-4">
                    No meetups match your search criteria
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        clearFilters();
                      }}
                    >
                      Clear search and filters
                    </Button>
                    <Button asChild>
                      <Link to="/create-meetup">Create Your Meetup</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">No Meetups Yet</h3>
                  <p className="text-muted-foreground text-lg mb-6">
                    Be the first to create a meetup that fits your travel plans! When you create one, other travelers with overlapping schedules will be able to join and explore with you.
                  </p>
                  <Button asChild size="lg">
                    <a href="/create-meetup">Create Your First Meetup</a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Showing {filteredMeetups.length} {filteredMeetups.length === 1 ? 'meetup' : 'meetups'}
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

export default Meetups;
