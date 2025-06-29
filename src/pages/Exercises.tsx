
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Dumbbell, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Exercise {
  id: string;
  name: string;
}

export default function Exercises() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });

  // Fetch exercises
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
      
      if (error) throw error;
      return data as Exercise[];
    },
    enabled: !!user
  });

  // Create/Update exercise mutation
  const saveExerciseMutation = useMutation({
    mutationFn: async (exercise: Omit<Exercise, 'id'> & { id?: string }) => {
      if (exercise.id) {
        // Update
        const { error } = await supabase
          .from('exercises')
          .update({
            name: exercise.name
          })
          .eq('id', exercise.id);
        
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('exercises')
          .insert({
            user_id: user?.id,
            name: exercise.name
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setIsDialogOpen(false);
      setEditingExercise(null);
      setFormData({ name: '' });
      toast.success(editingExercise ? 'Exercise updated!' : 'Exercise created!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save exercise');
    }
  });

  // Delete exercise mutation
  const deleteExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercise deleted!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete exercise');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Please enter an exercise name');
      return;
    }

    saveExerciseMutation.mutate({
      id: editingExercise?.id,
      name: formData.name
    });
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (exerciseId: string) => {
    if (confirm('Are you sure you want to delete this exercise?')) {
      deleteExerciseMutation.mutate(exerciseId);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingExercise(null);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading exercises...</div>;
  }

  return (
    <div className="px-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exercises</h1>
          <p className="text-gray-600">Manage your custom exercises</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </DialogTrigger>
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
                <Button type="submit" disabled={saveExerciseMutation.isPending}>
                  {saveExerciseMutation.isPending 
                    ? 'Saving...' 
                    : editingExercise ? 'Update Exercise' : 'Create Exercise'
                  }
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {exercises.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No exercises yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first exercise to start building workout routines
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Exercise
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((exercise) => (
            <Card key={exercise.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(exercise)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(exercise.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
