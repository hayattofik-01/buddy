import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Upload, MapPin, Image, FileIcon, Loader2, Globe } from 'lucide-react';
import { chatMessageContentSchema, validateFile, fileValidation, sanitizeText } from '@/lib/validation';

interface CommunityMessage {
  id: string;
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

const CommunityChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('community_messages')
        .select(`
          *,
          profiles:user_id (username, name)
        `)
        .order('created_at', { ascending: true })
        .limit(100);

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

  useEffect(() => {
    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel('community-chat')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_messages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new message with profile data
            supabase
              .from('community_messages')
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
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      const fileName = `community/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('meetup-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meetup-uploads')
        .getPublicUrl(fileName);

      const isImage = file.type.startsWith('image/');

      const { error: insertError } = await supabase
        .from('community_messages')
        .insert({
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
      // Validate and sanitize message
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

      const { error } = await supabase
        .from('community_messages')
        .insert({
          user_id: user.id,
          message_type: 'text',
          content: sanitizedContent,
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Send error:', error);
      toast({
        title: 'Unable to send message',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (message: CommunityMessage) => {
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

            <span className={`text-xs text-muted-foreground px-3 ${isCurrentUser ? 'text-right' : 'text-left'} block mt-1`}>
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Join the Community</h3>
        <p className="text-muted-foreground">
          Sign in to chat with travelers around the world
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Travelers Community Chat</h2>
            <p className="text-sm text-muted-foreground">Connect with travelers worldwide</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Be the first to say hello! 👋
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

export default CommunityChat;
