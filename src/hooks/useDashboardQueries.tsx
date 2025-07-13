import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface WorkoutRoutine {
  id: string;
  name: string;
}

interface WorkoutSession {
  id: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  routine_id: string | null;
}

interface DailyLog {
  weight: number | null;
  calories: number | null;
}

interface RoutineExercise {
  exercise_id: string;
  order_index: number;
  exercises: {
    id: string;
    name: string;
    muscle_group: string;
  };
}

interface SetRecord {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
}

export function useDashboardQueries() {
  const { user } = useAuth();

  // Fetch routines
  const routinesQuery = useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_routines')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('name');
      
      if (error) throw error;
      return data as WorkoutRoutine[];
    },
    enabled: !!user
  });

  // Fetch today's data
  const todayDataQuery = useQuery({
    queryKey: ['daily-log', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_logs')
        .select('weight, calories')
        .eq('user_id', user?.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as DailyLog | null;
    },
    enabled: !!user
  });

  // Fetch active session
  const activeSessionQuery = useQuery({
    queryKey: ['active-session'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as WorkoutSession | null;
    },
    enabled: !!user
  });

  return {
    routines: routinesQuery.data || [],
    todayData: todayDataQuery.data,
    activeSession: activeSessionQuery.data,
    isLoadingRoutines: routinesQuery.isLoading,
    isLoadingTodayData: todayDataQuery.isLoading,
    isLoadingActiveSession: activeSessionQuery.isLoading
  };
}

export function useRoutineExercises(routineId: string | null) {
  return useQuery({
    queryKey: ['routine-exercises', routineId],
    queryFn: async () => {
      if (!routineId) return [];
      
      const { data, error } = await supabase
        .from('routine_exercises')
        .select(`
          exercise_id,
          order_index,
          exercises (
            id,
            name,
            muscle_group
          )
        `)
        .eq('routine_id', routineId)
        .order('order_index');
      
      if (error) throw error;
      return data as RoutineExercise[];
    },
    enabled: !!routineId
  });
}

export function useSetRecords(sessionId: string | null) {
  return useQuery({
    queryKey: ['set-records', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('set_records')
        .select('*')
        .eq('session_id', sessionId)
        .order('exercise_id, set_number');
      
      if (error) throw error;
      return data as SetRecord[];
    },
    enabled: !!sessionId
  });
}