import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

export function useHistoryData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      const { error: setRecordsError } = await supabase
        .from('set_records')
        .delete()
        .eq('session_id', sessionId);

      if (setRecordsError) throw setRecordsError;

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

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
        
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
    
    event.target.value = '';
  };

  return {
    sessions: sessions || [],
    isLoading,
    deleteSession: deleteSessionMutation.mutate,
    exportToCSV,
    handleFileImport,
  };
}
