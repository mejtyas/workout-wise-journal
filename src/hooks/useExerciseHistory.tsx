
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ExerciseHistoryRecord {
  id: string;
  session_id: string;
  set_number: number;
  reps: number;
  weight: number;
  created_at: string;
  workout_sessions: {
    date: string;
    workout_routines: {
      name: string;
    } | null;
  };
}

export function useExerciseHistory(exerciseId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['exercise-history', exerciseId],
    queryFn: async () => {
      if (!exerciseId) return [];
      
      const { data, error } = await supabase
        .from('set_records')
        .select(`
          *,
          workout_sessions (
            date,
            workout_routines (
              name
            )
          )
        `)
        .eq('exercise_id', exerciseId)
        .order('workout_sessions(date)', { ascending: false })
        .order('set_number', { ascending: true });
      
      if (error) throw error;
      return data as ExerciseHistoryRecord[];
    },
    enabled: !!exerciseId && !!user
  });
}
