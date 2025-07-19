
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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

export function useWorkoutRoutines() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['routines-with-averages'],
    queryFn: async (): Promise<WorkoutRoutine[]> => {
      // First, get all routines
      const { data: routines, error: routinesError } = await supabase
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

      if (routinesError) throw routinesError;

      if (!routines || routines.length === 0) return [];

      // Get average durations for each routine
      const routineIds = routines.map(r => r.id);
      
      const { data: averages, error: averagesError } = await supabase
        .from('workout_sessions')
        .select('routine_id, duration_minutes')
        .eq('user_id', user?.id)
        .in('routine_id', routineIds)
        .not('duration_minutes', 'is', null);

      if (averagesError) throw averagesError;

      // Calculate averages
      const averageMap = new Map<string, number>();
      
      if (averages && averages.length > 0) {
        const routineGroups = averages.reduce((acc, session) => {
          if (!session.routine_id || !session.duration_minutes) return acc;
          
          if (!acc[session.routine_id]) {
            acc[session.routine_id] = [];
          }
          acc[session.routine_id].push(session.duration_minutes);
          return acc;
        }, {} as Record<string, number[]>);

        Object.entries(routineGroups).forEach(([routineId, durations]) => {
          const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
          averageMap.set(routineId, Math.round(average));
        });
      }

      // Merge routines with their averages
      return routines.map(routine => ({
        ...routine,
        average_duration: averageMap.get(routine.id) || undefined
      }));
    },
    enabled: !!user?.id,
  });
}
