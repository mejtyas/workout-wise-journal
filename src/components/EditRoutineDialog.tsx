
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

  useEffect(() => {
    setRoutineName(routine.name);
  }, [routine]);

  const updateRoutineMutation = useMutation({
    mutationFn: async () => {
      const { error: routineError } = await supabase
        .from('workout_routines')
        .update({ name: routineName })
        .eq('id', routine.id);

      if (routineError) throw routineError;
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
            Update your routine name. Exercise performance will be recorded during workouts.
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
            {routine.routine_exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map((exercise) => (
                <div key={exercise.exercise_id} className="border rounded-lg p-4">
                  <div className="font-medium">{exercise.exercises.name}</div>
                  <div className="text-sm text-gray-500">{exercise.exercises.muscle_group}</div>
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
