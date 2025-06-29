import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, TrendingUp, TrendingDown, Minus, Download, Upload, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditWorkoutDialog from '@/components/EditWorkoutDialog';

interface WorkoutSession {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  workout_routines: {
    name: string;
  } | null;
  set_records: {
    id: string;
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    exercises: {
      name: string;
      muscle_group: string;
    };
  }[];
}

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['workout-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workout_routines (name),
          set_records (
            id,
            exercise_id,
            set_number,
            reps,
            weight,
            exercises (
              name,
              muscle_group
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkoutSession[];
    },
    enabled: !!user?.id,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      // First delete all set records for this session
      const { error: setRecordsError } = await supabase
        .from('set_records')
        .delete()
        .eq('session_id', sessionId);

      if (setRecordsError) throw setRecordsError;

      // Then delete the session
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) throw sessionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      toast({
        title: "Success",
        description: "Workout session deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete workout session",
        variant: "destructive",
      });
    },
  });

  const exportToCSV = () => {
    if (!sessions || sessions.length === 0) {
      toast({
        title: "No data to export",
        description: "You don't have any workout sessions to export",
        variant: "destructive",
      });
      return;
    }

    const csvData = [];
    csvData.push(['Date', 'Routine', 'Exercise', 'Muscle Group', 'Set Number', 'Reps', 'Weight (kg)', 'Duration (min)']);

    sessions.forEach(session => {
      session.set_records.forEach(record => {
        csvData.push([
          session.date,
          session.workout_routines?.name || '',
          record.exercises.name,
          record.exercises.muscle_group,
          record.set_number.toString(),
          record.reps.toString(),
          record.weight.toString(),
          session.duration_minutes?.toString() || ''
        ]);
      });
    });

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `workout_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "Your workout history has been exported to CSV",
    });
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
        
        // Skip header row
        const dataLines = lines.slice(1).filter(line => line.trim());
        
        toast({
          title: "Import started",
          description: `Processing ${dataLines.length} records...`,
        });

        // Group by date and routine to create sessions
        const sessionGroups: { [key: string]: any[] } = {};
        
        dataLines.forEach(line => {
          const values = line.split(',').map(v => v.replace(/"/g, ''));
          const date = values[0];
          const routine = values[1];
          const key = `${date}-${routine}`;
          
          if (!sessionGroups[key]) {
            sessionGroups[key] = [];
          }
          
          sessionGroups[key].push({
            date,
            routine,
            exercise: values[2],
            muscleGroup: values[3],
            setNumber: parseInt(values[4]),
            reps: parseInt(values[5]),
            weight: parseFloat(values[6]),
            duration: values[7] ? parseInt(values[7]) : null
          });
        });

        // Create sessions and records
        for (const [key, records] of Object.entries(sessionGroups)) {
          const firstRecord = records[0];
          
          // Create session
          const { data: session, error: sessionError } = await supabase
            .from('workout_sessions')
            .insert({
              user_id: user?.id,
              date: firstRecord.date,
              duration_minutes: firstRecord.duration
            })
            .select()
            .single();

          if (sessionError) {
            console.error('Session creation error:', sessionError);
            continue;
          }

          // Create exercises if they don't exist and get their IDs
          const exerciseMap: { [name: string]: string } = {};
          
          for (const record of records) {
            if (!exerciseMap[record.exercise]) {
              const { data: existingExercise } = await supabase
                .from('exercises')
                .select('id')
                .eq('name', record.exercise)
                .eq('user_id', user?.id)
                .single();

              if (existingExercise) {
                exerciseMap[record.exercise] = existingExercise.id;
              } else {
                const { data: newExercise, error: exerciseError } = await supabase
                  .from('exercises')
                  .insert({
                    name: record.exercise,
                    muscle_group: record.muscleGroup,
                    user_id: user?.id
                  })
                  .select('id')
                  .single();

                if (!exerciseError && newExercise) {
                  exerciseMap[record.exercise] = newExercise.id;
                }
              }
            }
          }

          // Create set records
          const setRecords = records.map(record => ({
            session_id: session.id,
            exercise_id: exerciseMap[record.exercise],
            set_number: record.setNumber,
            reps: record.reps,
            weight: record.weight
          })).filter(record => record.exercise_id);

          if (setRecords.length > 0) {
            await supabase.from('set_records').insert(setRecords);
          }
        }

        queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
        toast({
          title: "Import successful",
          description: "Your workout history has been imported successfully",
        });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Import failed",
          description: "There was an error importing your workout history",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const getPreviousRecord = (exerciseId: string, currentSessionDate: string) => {
    if (!sessions) return null;
    
    const previousSessions = sessions.filter(s => s.date < currentSessionDate);
    for (const session of previousSessions) {
      const exerciseRecords = session.set_records.filter(r => r.exercise_id === exerciseId);
      if (exerciseRecords.length > 0) {
        const maxWeight = Math.max(...exerciseRecords.map(r => r.weight));
        const bestSet = exerciseRecords.find(r => r.weight === maxWeight);
        return bestSet;
      }
    }
    return null;
  };

  const getExerciseSummary = (sessionRecords: WorkoutSession['set_records']) => {
    const exerciseGroups = sessionRecords.reduce((acc, record) => {
      if (!acc[record.exercise_id]) {
        acc[record.exercise_id] = {
          name: record.exercises.name,
          records: [],
        };
      }
      acc[record.exercise_id].records.push(record);
      return acc;
    }, {} as Record<string, { name: string; records: typeof sessionRecords }>);

    return Object.values(exerciseGroups);
  };

  const getComparisonIcon = (current: number, previous: number | null) => {
    if (!previous) return <Minus className="h-3 w-3 text-gray-400" />;
    if (current > previous) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
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
        <h1 className="text-3xl font-bold text-gray-900">Workout History</h1>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('csvImport')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <input
            id="csvImport"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileImport}
          />
        </div>
      </div>

      {sessions?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No workouts yet</h3>
            <p className="text-gray-600 text-center">
              Your workout history will appear here once you start logging sessions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions?.map((session) => {
            const isExpanded = expandedSession === session.id;
            const exerciseSummary = getExerciseSummary(session.set_records);
            
            return (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {format(new Date(session.date), 'MMMM d, yyyy')}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        {session.workout_routines?.name && (
                          <span>Routine: {session.workout_routines.name}</span>
                        )}
                        {session.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {session.duration_minutes} min
                          </span>
                        )}
                        <span>{exerciseSummary.length} exercises</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSession(session)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Workout Session</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this workout session? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSessionMutation.mutate(session.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="ghost"
                        onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      >
                        {isExpanded ? 'Collapse' : 'View Details'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="space-y-6">
                      {exerciseSummary.map((exercise) => {
                        const maxWeight = Math.max(...exercise.records.map(r => r.weight));
                        const previousRecord = getPreviousRecord(exercise.records[0].exercise_id, session.date);
                        
                        return (
                          <div key={exercise.records[0].exercise_id} className="border-l-4 border-green-500 pl-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-semibold">{exercise.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Max: {maxWeight}kg</span>
                                {getComparisonIcon(maxWeight, previousRecord?.weight || null)}
                                {previousRecord && (
                                  <span className="text-xs">
                                    (was {previousRecord.weight}kg)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {exercise.records
                                .sort((a, b) => a.set_number - b.set_number)
                                .map((record) => (
                                  <div
                                    key={`${record.exercise_id}-${record.set_number}`}
                                    className="bg-gray-50 rounded p-2 text-sm"
                                  >
                                    <span className="font-medium">Set {record.set_number}:</span>
                                    <span className="ml-2">
                                      {record.reps} reps × {record.weight}kg
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editingSession && (
        <EditWorkoutDialog
          session={editingSession}
          open={!!editingSession}
          onOpenChange={(open) => !open && setEditingSession(null)}
        />
      )}
    </div>
  );
}
