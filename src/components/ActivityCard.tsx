import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Check, X, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ActivityResponse {
  id: string;
  user_id: string;
  response: 'going' | 'not_going' | 'maybe';
  profiles?: {
    username: string;
  };
}

interface ActivityCardProps {
  id: string;
  title: string;
  description?: string;
  activity_time: string;
  location?: string;
  responses: ActivityResponse[];
  created_by: string;
}

const ActivityCard = ({ 
  id, 
  title, 
  description, 
  activity_time, 
  location, 
  responses,
  created_by 
}: ActivityCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const userResponse = responses.find(r => r.user_id === user?.id);
  const goingCount = responses.filter(r => r.response === 'going').length;
  const maybeCount = responses.filter(r => r.response === 'maybe').length;
  const notGoingCount = responses.filter(r => r.response === 'not_going').length;

  const handleResponse = async (response: 'going' | 'not_going' | 'maybe') => {
    if (!user || updating) return;

    setUpdating(true);
    try {
      if (userResponse) {
        // Update existing response
        const { error } = await supabase
          .from('activity_responses')
          .update({ response })
          .eq('id', userResponse.id);

        if (error) throw error;
      } else {
        // Create new response
        const { error } = await supabase
          .from('activity_responses')
          .insert({
            activity_id: id,
            user_id: user.id,
            response,
          });

        if (error) throw error;
      }

      toast({
        title: 'Response updated',
        description: `Marked as ${response === 'going' ? 'Going' : response === 'maybe' ? 'Maybe' : 'Not Going'}`,
      });
    } catch (error: any) {
      console.error('Response error:', error);
      toast({
        title: 'Unable to update response',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const isCreator = user?.id === created_by;

  return (
    <Card className="min-w-[280px] max-w-[280px] p-0 flex-shrink-0 hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-primary/30 bg-gradient-to-br from-card via-primary/5 to-card rounded-2xl overflow-hidden">
      <div className="space-y-3">
        {/* Day Badge - Christmas Ornament Top */}
        <div className="bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 py-2 px-4 text-center border-b-2 border-primary/20">
          <div className="font-bold text-lg">
            {new Date(activity_time).toLocaleDateString([], {
              weekday: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-xs text-muted-foreground font-semibold">
            {new Date(activity_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div>
            <h3 className="font-semibold text-base line-clamp-1">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{description}</p>
            )}
          </div>

          {location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {/* Response Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              <span className="font-semibold">{goingCount}</span>
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <HelpCircle className="h-3 w-3" />
              <span className="font-semibold">{maybeCount}</span>
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <X className="h-3 w-3" />
              <span className="font-semibold">{notGoingCount}</span>
            </Badge>
          </div>

          {/* Response Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant={userResponse?.response === 'going' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => handleResponse('going')}
              disabled={updating}
            >
              <Check className="h-3 w-3" />
              Going
            </Button>
            <Button
              variant={userResponse?.response === 'maybe' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => handleResponse('maybe')}
              disabled={updating}
            >
              <HelpCircle className="h-3 w-3" />
              Maybe
            </Button>
            <Button
              variant={userResponse?.response === 'not_going' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => handleResponse('not_going')}
              disabled={updating}
            >
              <X className="h-3 w-3" />
              No
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ActivityCard;
