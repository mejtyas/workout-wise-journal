
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
import { ChevronUp, ChevronDown } from 'lucide-react';

interface RoutineExercise {
  exercise_id: string;
  order_index: number;
  default_sets: number;
  default_reps: number;
  exercises: {
    name: string;
    muscle_group: string;
  };
}

interface WorkoutRoutine {
  id: string;
  name: string;
  routine_exercises: RoutineExercise[];
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
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);

  useEffect(() => {
    setRoutineName(routine.name);
    setExercises([...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index));
  }, [routine]);

  const updateRoutineMutation = useMutation({
    mutationFn: async () => {
      // Update routine name
      const { error: routineError } = await supabase
        .from('workout_routines')
        .update({ name: routineName })
        .eq('id', routine.id);

      if (routineError) throw routineError;

      // Update exercise order
      const updatePromises = exercises.map((exercise, index) =>
        supabase
          .from('routine_exercises')
          .update({ order_index: index })
          .eq('routine_id', routine.id)
          .eq('exercise_id', exercise.exercise_id)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Routine updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update routine",
        variant: "destructive",
      });
    },
  });

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;
    
    const newExercises = [...exercises];
    const [movedExercise] = newExercises.splice(fromIndex, 1);
    newExercises.splice(toIndex, 0, movedExercise);
    setExercises(newExercises);
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
            Update your routine name and reorder exercises.
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
            <Label>Exercises in this routine</Label>
            {exercises.map((exercise, index) => (
              <div key={exercise.exercise_id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{exercise.exercises.name}</div>
                  <div className="text-sm text-gray-500">{exercise.exercises.muscle_group}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveExercise(index, index - 1)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => moveExercise(index, index + 1)}
                    disabled={index === exercises.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
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
