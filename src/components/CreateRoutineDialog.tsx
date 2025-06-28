
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

interface CreateRoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRoutineDialog({ open, onOpenChange }: CreateRoutineDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [routineName, setRoutineName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  const { data: exercises } = useQuery<Exercise[]>({
    queryKey: ['exercises'],
    queryFn: async (): Promise<Exercise[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const createRoutineMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data: routine, error: routineError } = await supabase
        .from('workout_routines')
        .insert({
          name: routineName,
          user_id: user.id,
        })
        .select()
        .single();

      if (routineError) throw routineError;

      const routineExercises = selectedExercises.map((exercise, index) => ({
        routine_id: routine.id,
        exercise_id: exercise.id,
        order_index: index,
        default_sets: null,
        default_reps: null,
      }));

      const { error: exercisesError } = await supabase
        .from('routine_exercises')
        .insert(routineExercises);

      if (exercisesError) throw exercisesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      setRoutineName('');
      setSelectedExercises([]);
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Routine created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create routine",
        variant: "destructive",
      });
    },
  });

  const handleExerciseToggle = (exercise: Exercise, checked: boolean) => {
    if (checked) {
      setSelectedExercises([...selectedExercises, exercise]);
    } else {
      setSelectedExercises(selectedExercises.filter(e => e.id !== exercise.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim() || selectedExercises.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a routine name and select at least one exercise",
        variant: "destructive",
      });
      return;
    }
    createRoutineMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Routine</DialogTitle>
          <DialogDescription>
            Choose exercises for your routine. You'll record sets and reps during your workout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="routine-name">Routine Name</Label>
            <Input
              id="routine-name"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="Enter routine name"
            />
          </div>

          <div className="space-y-4">
            <Label>Select Exercises</Label>
            {exercises?.map((exercise) => {
              const isSelected = selectedExercises.some(e => e.id === exercise.id);

              return (
                <div key={exercise.id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleExerciseToggle(exercise, checked as boolean)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{exercise.name}</div>
                      <div className="text-sm text-gray-500">{exercise.muscle_group}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRoutineMutation.isPending}>
              {createRoutineMutation.isPending ? 'Creating...' : 'Create Routine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
