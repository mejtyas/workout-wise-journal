
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus } from 'lucide-react';

interface WorkoutRoutine {
  id: string;
  name: string;
  routine_exercises: {
    exercise_id: string;
    order_index: number;
    default_sets: number;
    default_reps: number;
    exercises: {
      name: string;
      muscle_group: string;
    };
  }[];
}

interface EditRoutineDialogProps {
  routine: WorkoutRoutine;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditRoutineDialog({ routine, open, onOpenChange }: EditRoutineDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [routineName, setRoutineName] = useState(routine.name);
  const [exercises, setExercises] = useState(routine.routine_exercises);

  useEffect(() => {
    setRoutineName(routine.name);
    setExercises(routine.routine_exercises);
  }, [routine]);

  const updateRoutineMutation = useMutation({
    mutationFn: async () => {
      // Update routine name
      const { error: routineError } = await supabase
        .from('workout_routines')
        .update({ name: routineName })
        .eq('id', routine.id);

      if (routineError) throw routineError;

      // Delete existing routine exercises
      const { error: deleteError } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('routine_id', routine.id);

      if (deleteError) throw deleteError;

      // Insert updated routine exercises
      const routineExercises = exercises.map((exercise, index) => ({
        routine_id: routine.id,
        exercise_id: exercise.exercise_id,
        order_index: index,
        default_sets: exercise.default_sets,
        default_reps: exercise.default_reps,
      }));

      const { error: insertError } = await supabase
        .from('routine_exercises')
        .insert(routineExercises);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Routine updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update routine",
        variant: "destructive",
      });
    },
  });

  const updateExercise = (exerciseId: string, field: 'default_sets' | 'default_reps', value: number) => {
    setExercises(exercises.map(e => 
      e.exercise_id === exerciseId ? { ...e, [field]: Math.max(1, value) } : e
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a routine name",
        variant: "destructive",
      });
      return;
    }
    updateRoutineMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Routine</DialogTitle>
          <DialogDescription>
            Update your routine name and exercise settings.
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
            <Label>Exercises</Label>
            {exercises.map((exercise) => (
              <div key={exercise.exercise_id} className="border rounded-lg p-4">
                <div className="flex-1 mb-3">
                  <div className="font-medium">{exercise.exercises.name}</div>
                  <div className="text-sm text-gray-500">{exercise.exercises.muscle_group}</div>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Sets:</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateExercise(exercise.exercise_id, 'default_sets', exercise.default_sets - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{exercise.default_sets}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateExercise(exercise.exercise_id, 'default_sets', exercise.default_sets + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Reps:</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateExercise(exercise.exercise_id, 'default_reps', exercise.default_reps - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{exercise.default_reps}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateExercise(exercise.exercise_id, 'default_reps', exercise.default_reps + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateRoutineMutation.isPending}>
              {updateRoutineMutation.isPending ? 'Updating...' : 'Update Routine'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
