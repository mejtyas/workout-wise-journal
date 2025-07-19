
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Dumbbell, Clock } from 'lucide-react';
import CreateRoutineDialog from '@/components/CreateRoutineDialog';
import EditRoutineDialog from '@/components/EditRoutineDialog';
import { useWorkoutRoutines } from '@/hooks/useWorkoutRoutines';

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
  average_duration?: number;
}

export default function Workouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine | null>(null);

  const { data: routines, isLoading } = useWorkoutRoutines();

  const deleteRoutineMutation = useMutation({
    mutationFn: async (routineId: string) => {
      const { error } = await supabase
        .from('workout_routines')
        .delete()
        .eq('id', routineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines-with-averages'] });
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
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
          {routines?.map((routine) => {
            const exerciseCount = routine.routine_exercises?.length || 0;
            
            return (
              <Card key={routine.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{routine.name}</CardTitle>
                      <CardDescription className="space-y-1">
                        <div>{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</div>
                        {routine.average_duration && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="h-3 w-3" />
                            Avg: {formatDuration(routine.average_duration)}
                          </div>
                        )}
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
                    {routine.routine_exercises && routine.routine_exercises.length > 0 ? (
                      <>
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
                      </>
                    ) : (
                      <div className="text-sm text-gray-500 text-center">
                        No exercises added yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
