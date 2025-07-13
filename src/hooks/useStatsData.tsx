
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface StatsData {
  date: string;
  weight: number | null;
  calories: number | null;
  workoutDuration: number;
  totalVolume: number;
}

interface OverallStats {
  totalWorkouts: number;
  totalExercises: number;
  averageDuration: number;
}

export function useStatsData(dateRange: number) {
  const { user } = useAuth();

  const statsQuery = useQuery<StatsData[]>({
    queryKey: ['stats', dateRange],
    queryFn: async (): Promise<StatsData[]> => {
      if (!user?.id) return [];
      
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);
      
      const { data: dailyLogs, error: dailyError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date');

      if (dailyError) throw dailyError;

      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          set_records (
            reps,
            weight
          )
        `)
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date');

      if (sessionsError) throw sessionsError;

      const dateRangeArray = eachDayOfInterval({ start: startDate, end: endDate });
      const statsData: StatsData[] = dateRangeArray.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dailyLog = dailyLogs?.find(log => log.date === dateStr);
        const daySession = sessions?.find(session => session.date === dateStr);
        
        let totalVolume = 0;
        if (daySession?.set_records && Array.isArray(daySession.set_records)) {
          totalVolume = daySession.set_records.reduce((sum: number, record: any) => 
            sum + (record.reps * record.weight), 0
          );
        }

        return {
          date: dateStr,
          weight: dailyLog?.weight || null,
          calories: dailyLog?.calories || null,
          workoutDuration: daySession?.duration_minutes || 0,
          totalVolume,
        };
      });

      return statsData;
    },
    enabled: !!user?.id,
  });

  const overallStatsQuery = useQuery<OverallStats>({
    queryKey: ['overall-stats'],
    queryFn: async (): Promise<OverallStats> => {
      if (!user?.id) {
        return {
          totalWorkouts: 0,
          totalExercises: 0,
          averageDuration: 0,
        };
      }

      const { count: totalWorkouts, error: workoutsError } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (workoutsError) throw workoutsError;

      const { count: totalExercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (exercisesError) throw exercisesError;

      const { data: avgDuration, error: avgError } = await supabase
        .from('workout_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .not('duration_minutes', 'is', null);

      if (avgError) throw avgError;

      const averageDuration = avgDuration && avgDuration.length > 0 
        ? avgDuration.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) / avgDuration.length
        : 0;

      return {
        totalWorkouts: totalWorkouts || 0,
        totalExercises: totalExercises || 0,
        averageDuration: Math.round(averageDuration),
      };
    },
    enabled: !!user?.id,
  });

  return {
    statsData: statsQuery.data || [],
    overallStats: overallStatsQuery.data,
    isLoading: statsQuery.isLoading,
  };
}
