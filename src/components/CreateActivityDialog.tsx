import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { activitySchema, sanitizeText } from '@/lib/validation';
import { z } from 'zod';

interface CreateActivityDialogProps {
  meetupId: string;
  onActivityCreated?: () => void;
}

const CreateActivityDialog = ({ meetupId, onActivityCreated }: CreateActivityDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activity_time: '',
    location: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || creating) return;

    setCreating(true);
    setErrors({});

    try {
      // Validate form data with sanitization
      const validated = activitySchema.parse({
        title: sanitizeText(formData.title),
        description: formData.description ? sanitizeText(formData.description) : undefined,
        activity_time: formData.activity_time,
        location: formData.location ? sanitizeText(formData.location) : undefined,
      });

      const { error } = await supabase
        .from('meetup_activities')
        .insert({
          meetup_id: meetupId,
          created_by: user.id,
          title: validated.title,
          description: validated.description || null,
          activity_time: validated.activity_time,
          location: validated.location || null,
        });

      if (error) throw error;

      toast({
        title: 'Activity created!',
        description: 'Your activity has been added to the meetup',
      });

      // Trigger callback to refetch activities
      onActivityCreated?.();

      // Reset form
      setFormData({
        title: '',
        description: '',
        activity_time: '',
        location: '',
      });
      setOpen(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Create activity error:', error);
        toast({
          title: 'Unable to create activity',
          description: 'Please try again',
          variant: 'destructive',
        });
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Activity Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Beach Volleyball"
              maxLength={100}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about the activity..."
              rows={3}
              maxLength={500}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <Label htmlFor="activity_time">Date & Time *</Label>
            <Input
              id="activity_time"
              type="datetime-local"
              value={formData.activity_time}
              onChange={(e) => setFormData({ ...formData, activity_time: e.target.value })}
              className={errors.activity_time ? 'border-destructive' : ''}
            />
            {errors.activity_time && (
              <p className="text-xs text-destructive mt-1">{errors.activity_time}</p>
            )}
          </div>

          <div>
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Main Beach, North Side"
              maxLength={200}
              className={errors.location ? 'border-destructive' : ''}
            />
            {errors.location && (
              <p className="text-xs text-destructive mt-1">{errors.location}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Activity'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateActivityDialog;
