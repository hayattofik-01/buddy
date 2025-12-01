import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Loader2 } from 'lucide-react';

interface JoinRequest {
  id: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

interface PendingRequestsProps {
  meetupId: string;
  onRequestHandled: () => void;
}

const PendingRequests = ({ meetupId, onRequestHandled }: PendingRequestsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('join-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetup_join_requests',
          filter: `meetup_id=eq.${meetupId}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetupId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('meetup_join_requests')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('meetup_id', meetupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, userId: string, approved: boolean) => {
    setProcessingId(requestId);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('meetup_join_requests')
        .update({ status: approved ? 'approved' : 'rejected' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, add user to meetup members
      if (approved) {
        const { error: insertError } = await supabase
          .from('meetup_members')
          .insert({
            meetup_id: meetupId,
            user_id: userId,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: approved ? 'Request approved' : 'Request rejected',
        description: approved
          ? 'User has been added to the meetup'
          : 'User request has been rejected',
      });

      onRequestHandled();
      fetchRequests();
    } catch (error: any) {
      console.error('Error handling request:', error);
      toast({
        title: 'Unable to process request',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Pending Requests</h2>
        <Badge variant="secondary">{requests.length}</Badge>
      </div>

      <ScrollArea className="max-h-[300px]">
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div 
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/user/${request.user_id}`)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {request.profiles?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{request.profiles?.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleRequest(request.id, request.user_id, true)}
                  disabled={processingId === request.id}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRequest(request.id, request.user_id, false)}
                  disabled={processingId === request.id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default PendingRequests;
