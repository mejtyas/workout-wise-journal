
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Dumbbell } from 'lucide-react';
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine | null>(null);

  const { data: routines, isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: async (): Promise<WorkoutRoutine[]> => {
      const { data, error } = await supabase
        .from('workout_routines')
        .select(`
          id,
          name,
          created_at,
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
      return data || [];
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete routine",
        variant: "destructive",
      });
    },
  });

  const handleEditRoutine = (routine: WorkoutRoutine) => {
    setSelectedRoutine(routine);
    setEditDialogOpen(true);
  };

  const handleDeleteRoutine = (routineId: string) => {
    if (confirm('Are you sure you want to delete this routine?')) {
      deleteRoutineMutation.mutate(routineId);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workout Routines</h1>
          <p className="text-gray-600 mt-2">Create and manage your workout routines</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-green-500 hover:bg-green-600">
          <Plus className="h-4 w-4 mr-2" />
          New Routine
        </Button>
      </div>

      {routines && routines.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No routines yet</h3>
          <p className="text-gray-600 mb-6">Create your first workout routine to get started</p>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-green-500 hover:bg-green-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Routine
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {routines?.map((routine) => (
            <Card key={routine.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{routine.name}</CardTitle>
                    <CardDescription>
                      {routine.routine_exercises.length} exercise{routine.routine_exercises.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRoutine(routine)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRoutine(routine.id)}
                      className="text-red-600 hover:text-red-700"
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
                    .slice(0, 4)
                    .map((routineExercise, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{routineExercise.exercises.name}</span>
                        <span className="text-gray-500 text-xs">
                          {routineExercise.exercises.muscle_group}
                        </span>
                      </div>
                    ))}
                  {routine.routine_exercises.length > 4 && (
                    <div className="text-sm text-gray-500 text-center pt-2">
                      +{routine.routine_exercises.length - 4} more exercises
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRoutineDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedRoutine && (
        <EditRoutineDialog
          routine={selectedRoutine}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  );
}
