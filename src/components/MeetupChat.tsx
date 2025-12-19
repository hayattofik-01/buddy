import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, Upload, MapPin, Image, FileIcon, Loader2, Calendar } from 'lucide-react';
import { chatMessageContentSchema, validateGoogleMapsLink, extractUrls, validateFile, sanitizeText } from '@/lib/validation';
import { z } from 'zod';
import ActivityCard from '@/components/ActivityCard';
import CreateActivityDialog from '@/components/CreateActivityDialog';

interface ChatMessage {
  id: string;
  meetup_id: string;
  user_id: string;
  message_type: 'text' | 'image' | 'file' | 'location';
  content: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  profiles?: {
    username: string;
    name: string | null;
  };
}

interface Activity {
  id: string;
  meetup_id: string;
  created_by: string;
  title: string;
  description?: string;
  activity_time: string;
  location?: string;
  activity_responses: ActivityResponse[];
}

interface ActivityResponse {
  id: string;
  user_id: string;
  response: 'going' | 'not_going' | 'maybe';
  profiles?: {
    username: string;
    name: string | null;
  };
}

interface MeetupChatProps {
  meetupId: string;
  isCreator?: boolean;
}

const MeetupChat = ({ meetupId, isCreator = false }: MeetupChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles:user_id (username, name)
        `)
        .eq('meetup_id', meetupId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Unable to load messages',
        description: 'Please refresh the page',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch activities
  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('meetup_activities')
        .select(`
          *,
          activity_responses (
            *,
            profiles:user_id (username, name)
          )
        `)
        .eq('meetup_id', meetupId)
        .order('activity_time', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Unable to load activities',
        description: 'Please refresh the page',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchActivities();

    // Set up realtime subscription for messages
    const messagesChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `meetup_id=eq.${meetupId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new message with profile data
            supabase
              .from('chat_messages')
              .select(`
                *,
                profiles:user_id (username, name)
              `)
              .eq('id', payload.new.id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) {
                  setMessages((prev) => [...prev, data]);
                }
              });
          } else if (payload.eventType === 'UPDATE') {
            // Fetch updated message
            supabase
              .from('chat_messages')
              .select(`
                *,
                profiles:user_id (username, name)
              `)
              .eq('id', payload.new.id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) {
                  setMessages((prev) => prev.map(msg => msg.id === data.id ? data : msg));
                }
              });
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Set up realtime subscription for activities
    const activitiesChannel = supabase
      .channel('meetup-activities')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetup_activities',
          filter: `meetup_id=eq.${meetupId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_responses',
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [meetupId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!user) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${meetupId}/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('meetup-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meetup-uploads')
        .getPublicUrl(fileName);

      const isImage = file.type.startsWith('image/');

      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          meetup_id: meetupId,
          user_id: user.id,
          message_type: isImage ? 'image' : 'file',
          content: file.name,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
        });

      if (insertError) throw insertError;

      toast({
        title: 'File uploaded',
        description: 'Your file has been shared',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Unable to upload file',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      // Validate message content
      const validationResult = chatMessageContentSchema.safeParse({ content: newMessage });
      if (!validationResult.success) {
        toast({
          title: 'Invalid message',
          description: validationResult.error.issues[0].message,
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      const sanitizedContent = sanitizeText(newMessage);

      // Detect message type
      const urls = extractUrls(sanitizedContent);
      let messageType: 'text' | 'location' = 'text';

      if (urls.length > 0) {
        const isGoogleMaps = urls.some(url => validateGoogleMapsLink(url));
        if (isGoogleMaps) {
          messageType = 'location';
        }
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          meetup_id: meetupId,
          user_id: user.id,
          message_type: messageType,
          content: sanitizedContent,
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error);
        toast({
          title: 'Invalid message',
          description: 'Please check your message and try again',
          variant: 'destructive',
        });
      } else {
        console.error('Send message error:', error);
        toast({
          title: 'Unable to send message',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isCurrentUser = message.user_id === user?.id;

    return (
      <div
        key={message.id}
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'} space-y-1`}>
          {!isCurrentUser && (
            <span className="text-xs text-muted-foreground px-3">
              {message.profiles?.name || message.profiles?.username || 'Unknown'}
            </span>
          )}

          <div className="relative group">
            <Card
              className={`p-3 ${isCurrentUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
                }`}
            >
              {message.message_type === 'image' && message.file_url && (
                <img
                  src={message.file_url}
                  alt={message.content}
                  className="rounded-lg max-w-full mb-2"
                />
              )}

              {message.message_type === 'file' && message.file_url && (
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <FileIcon className="h-4 w-4" />
                  <span>{message.file_name || message.content}</span>
                </a>
              )}

              {message.message_type === 'location' && (
                <a
                  href={message.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  <span>View location</span>
                </a>
              )}

              {message.message_type === 'text' && (
                <p className="break-words whitespace-pre-wrap">{message.content}</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Meetup Chat</h2>
            <p className="text-sm text-muted-foreground">Connect with fellow members</p>
          </div>
          <div className="flex gap-2">
            <CreateActivityDialog meetupId={meetupId} onActivityCreated={fetchActivities} />
            {activities.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Decided Activities ({activities.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Decided Activities in this Meetup</DialogTitle>
                  </DialogHeader>
                  <div className="overflow-x-auto scrollbar-hide py-6">
                    <div className="flex gap-8 min-w-max px-4">
                      {activities.map((activity, index) => (
                        <div
                          key={activity.id}
                          className="animate-fade-in relative"
                          style={{
                            animationDelay: `${index * 0.1}s`
                          }}
                        >
                          {/* Hanging String */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-primary/60 to-transparent -mt-8" />
                          <ActivityCard
                            id={activity.id}
                            title={activity.title}
                            description={activity.description}
                            activity_time={activity.activity_time}
                            location={activity.location}
                            responses={activity.activity_responses}
                            created_by={activity.created_by}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map(msg => renderMessage(msg))
        )}
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            maxLength={5000}
            className="flex-1"
          />

          <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default MeetupChat;
