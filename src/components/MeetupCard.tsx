import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Pencil, Lock, Share2, MessageCircle, Send, Instagram as InstagramIcon } from "lucide-react";
import { format } from "date-fns";
import { validateSocialGroupLink, getPlatformName } from "@/lib/socialValidation";
import { useToast } from "@/hooks/use-toast";

interface MeetupCardProps {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  meetingPoint?: string;
  type: 'open' | 'locked';
  currentMembers: number;
  maxMembers: number;
  imageUrl: string;
  creatorName: string;
  isPaid: boolean;
  amount?: number;
  creatorId?: string;
  socialGroupLink?: string;
}

const MeetupCard = ({
  id,
  title,
  destination,
  startDate,
  endDate,
  meetingPoint,
  type,
  currentMembers,
  maxMembers,
  imageUrl,
  creatorName,
  isPaid,
  amount,
  creatorId,
  socialGroupLink,
}: MeetupCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isCreator = user?.id === creatorId;

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/meetups/${id}/edit`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shareUrl = `${window.location.origin}/meetups/${id}`;
    const shareData = {
      title: `Join: ${title}`,
      text: `Check out this meetup in ${destination}!`,
      url: shareUrl,
    };

    try {
      // Try native share API first (works on mobile)
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully!",
          description: "Meetup link shared",
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Meetup link copied to clipboard",
        });
      }
    } catch (error) {
      // User cancelled or error occurred
      console.log('Share cancelled or failed', error);
    }
  };

  // Detect social platform if link exists
  const socialPlatform = socialGroupLink ? validateSocialGroupLink(socialGroupLink) : null;

  return (
    <Card className="overflow-hidden group hover:shadow-hover transition-smooth">
      <Link to={`/meetups/${id}`}>
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <div className="absolute top-3 right-3 flex gap-2">
            <Badge variant={type === 'open' ? 'default' : 'secondary'}>
              {type === 'locked' && <Lock className="h-3 w-3 mr-1" />}
              {type === 'open' ? 'Open' : 'Private'}
            </Badge>
            {isPaid && (
              <Badge variant="destructive">
                ${amount?.toFixed(2) || '0.00'}
              </Badge>
            )}
            {socialPlatform?.isValid && socialPlatform.platform && (
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                {socialPlatform.platform === 'whatsapp' && <MessageCircle className="h-3 w-3 mr-1" />}
                {socialPlatform.platform === 'telegram' && <Send className="h-3 w-3 mr-1" />}
                {socialPlatform.platform === 'facebook' && <Users className="h-3 w-3 mr-1" />}
                {socialPlatform.platform === 'instagram' && <InstagramIcon className="h-3 w-3 mr-1" />}
                {getPlatformName(socialPlatform.platform)}
              </Badge>
            )}
          </div>

          <div className="absolute top-3 left-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-bold text-lg mb-1 text-white drop-shadow-lg">
              {title}
            </h3>
            <div className="flex items-center gap-1 text-white/90 text-sm drop-shadow-md">
              <MapPin className="h-4 w-4" />
              <span>{destination}</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(startDate), 'MMM d')} - {format(new Date(endDate), 'MMM d, yyyy')}
            </span>
          </div>

          {meetingPoint && (
            <div className="text-sm text-muted-foreground">
              Meeting: {meetingPoint}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {currentMembers}/{maxMembers >= 999999 ? '∞' : maxMembers} members
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isCreator ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-7 gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  by {creatorName}
                </span>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-border mt-3">
            {currentMembers >= maxMembers && (
              <Card className="bg-card border-border p-2 mb-2">
                <p className="text-sm text-center">
                  Group is Full
                </p>
              </Card>
            )}
            {!isCreator && (
              <Button
                className="w-full"
                size="sm"
                disabled={currentMembers >= maxMembers}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/meetups/${id}`);
                }}
              >
                {type === 'locked' ? 'Request to Join' : 'Join Chat'}
              </Button>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
};

export default MeetupCard;
