
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Exercise {
  id: string;
  name: string;
}

interface ExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingExercise: Exercise | null;
  onSubmit: (exerciseData: { id?: string; name: string }) => void;
  isLoading: boolean;
}

export function ExerciseDialog({ 
  isOpen, 
  onClose, 
  editingExercise, 
  onSubmit, 
  isLoading 
}: ExerciseDialogProps) {
  const [formData, setFormData] = useState({
    name: editingExercise?.name || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Please enter an exercise name');
      return;
    }

    onSubmit({
      id: editingExercise?.id,
      name: formData.name
    });
  };

  const resetForm = () => {
    setFormData({ name: '' });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingExercise ? 'Edit Exercise' : 'Add New Exercise'}
          </DialogTitle>
          <DialogDescription>
            {editingExercise 
              ? 'Update your exercise details'
              : 'Create a new exercise to add to your routines'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Exercise Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Bench Press"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? 'Saving...' 
                : editingExercise ? 'Update Exercise' : 'Create Exercise'
              }
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
