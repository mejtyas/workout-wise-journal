
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

interface AddExerciseToRoutineProps {
  routineId: string;
  existingExerciseIds: string[];
}

export function AddExerciseToRoutine({ routineId, existingExerciseIds }: AddExerciseToRoutineProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  // Fetch available exercises
  const { data: exercises = [] } = useQuery({
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

  // Filter out exercises that are already in the routine
  const availableExercises = exercises.filter(
    exercise => !existingExerciseIds.includes(exercise.id)
  );

  const addExerciseMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      // Get the highest order_index for this routine
      const { data: existingExercises } = await supabase
        .from('routine_exercises')
        .select('order_index')
        .eq('routine_id', routineId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingExercises && existingExercises.length > 0 
        ? existingExercises[0].order_index + 1 
        : 0;

      const { error } = await supabase
        .from('routine_exercises')
        .insert({
          routine_id: routineId,
          exercise_id: exerciseId,
          order_index: nextOrderIndex,
          default_sets: 3,
          default_reps: 10
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      setSelectedExerciseId('');
      toast({
        title: "Success",
        description: "Exercise added to routine",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add exercise to routine",
        variant: "destructive",
      });
    },
  });

  const handleAddExercise = () => {
    if (!selectedExerciseId) {
      toast({
        title: "Error",
        description: "Please select an exercise to add",
        variant: "destructive",
      });
      return;
    }
    addExerciseMutation.mutate(selectedExerciseId);
  };

  if (availableExercises.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-2">
        All your exercises are already in this routine
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an exercise to add" />
          </SelectTrigger>
          <SelectContent>
            {availableExercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{exercise.name}</span>
                  {exercise.muscle_group && (
                    <span className="text-xs text-gray-500">{exercise.muscle_group}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        onClick={handleAddExercise}
        disabled={addExerciseMutation.isPending || !selectedExerciseId}
        size="sm"
        className="bg-green-600 hover:bg-green-700"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </div>
  );
}
