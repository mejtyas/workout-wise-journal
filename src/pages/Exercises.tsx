import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExerciseDialog } from '@/components/exercises/ExerciseDialog';
import { ExercisesList } from '@/components/exercises/ExercisesList';
import { EmptyExercises } from '@/components/exercises/EmptyExercises';
import { ExerciseHistoryDialog } from '@/components/exercises/ExerciseHistoryDialog';

interface Exercise {
  id: string;
  name: string;
}

export default function Exercises() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);

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
        // Create - only include required fields
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

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsDialogOpen(true);
  };

  const handleDelete = (exerciseId: string) => {
    if (confirm('Are you sure you want to delete this exercise?')) {
      deleteExerciseMutation.mutate(exerciseId);
    }
  };

  const handleSubmit = (exerciseData: { id?: string; name: string }) => {
    saveExerciseMutation.mutate(exerciseData);
  };

  const handleAddClick = () => {
    setEditingExercise(null);
    setIsDialogOpen(true);
  };

  const handleViewHistory = (exercise: Exercise) => {
    setHistoryExercise(exercise);
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
        <Button onClick={handleAddClick} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </Button>
      </div>

      {exercises.length === 0 ? (
        <EmptyExercises onAddClick={handleAddClick} />
      ) : (
        <ExercisesList 
          exercises={exercises}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewHistory={handleViewHistory}
        />
      )}

      <ExerciseDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        editingExercise={editingExercise}
        onSubmit={handleSubmit}
        isLoading={saveExerciseMutation.isPending}
      />

      <ExerciseHistoryDialog
        exercise={historyExercise}
        isOpen={!!historyExercise}
        onClose={() => setHistoryExercise(null)}
      />
    </div>
  );
}
