
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CreateRoutineDialog from '@/components/CreateRoutineDialog';
import EditRoutineDialog from '@/components/EditRoutineDialog';

interface WorkoutRoutine {
  id: string;
  name: string;
  created_at: string;
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

export default function Workouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null);

  const { data: routines, isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_routines')
        .select(`
          *,
          routine_exercises (
            exercise_id,
            order_index,
            default_sets,
            default_reps,
            exercises (
              name,
              muscle_group
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkoutRoutine[];
    },
    enabled: !!user?.id,
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: async (routineId: string) => {
      const { error } = await supabase
        .from('workout_routines')
        .delete()
        .eq('id', routineId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      toast({
        title: "Success",
        description: "Routine deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete routine",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRoutine = (routineId: string) => {
    if (confirm('Are you sure you want to delete this routine?')) {
      deleteRoutineMutation.mutate(routineId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workout Routines</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Routine
        </Button>
      </div>

      {routines?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No routines yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first workout routine to get started with your fitness journey.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Routine
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {routines?.map((routine) => (
            <Card key={routine.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{routine.name}</CardTitle>
                    <CardDescription>
                      {routine.routine_exercises.length} exercises
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRoutine(routine)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoutine(routine.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {routine.routine_exercises
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((routineExercise, index) => (
                      <div
                        key={routineExercise.exercise_id}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="font-medium">
                          {index + 1}. {routineExercise.exercises.name}
                        </span>
                        <span className="text-gray-500">
                          {routineExercise.default_sets} × {routineExercise.default_reps}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRoutineDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {editingRoutine && (
        <EditRoutineDialog
          routine={editingRoutine}
          open={!!editingRoutine}
          onOpenChange={(open) => !open && setEditingRoutine(null)}
        />
      )}
    </div>
  );
}
