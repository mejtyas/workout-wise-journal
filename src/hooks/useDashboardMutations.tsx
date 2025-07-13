import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkoutSession {
  id: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  routine_id: string | null;
}

export function useDashboardMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Update daily log mutation
  const updateDailyLogMutation = useMutation({
    mutationFn: async ({ weight, calories }: { weight?: number; calories?: number }) => {
      const today = new Date().toISOString().split('T')[0];
      
      // First try to get existing record
      const { data: existingData } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today)
        .maybeSingle();

      const updateData: any = {
        user_id: user?.id,
        date: today,
      };

      // Keep existing values and only update the provided field
      if (existingData) {
        updateData.weight = weight !== undefined ? weight : existingData.weight;
        updateData.calories = calories !== undefined ? calories : existingData.calories;
      } else {
        updateData.weight = weight;
        updateData.calories = calories;
      }

      const { error } = await supabase
        .from('daily_logs')
        .upsert(updateData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      toast.success('Daily log updated!');
    },
    onError: (error) => {
      toast.error('Failed to update daily log');
      console.error('Daily log update error:', error);
    }
  });

  // Start workout mutation
  const startWorkoutMutation = useMutation({
    mutationFn: async (routineId: string) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user?.id,
          routine_id: routineId,
          start_time: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      toast.success('Workout started! 💪');
    },
    onError: (error) => {
      toast.error('Failed to start workout');
      console.error(error);
    }
  });

  // End workout mutation
  const endWorkoutMutation = useMutation({
    mutationFn: async ({ activeSession, sessionStartTime }: { activeSession: WorkoutSession; sessionStartTime: Date | null }) => {
      const endTime = new Date();
      const duration = sessionStartTime 
        ? Math.round((endTime.getTime() - sessionStartTime.getTime()) / (1000 * 60))
        : 0;

      const { error } = await supabase
        .from('workout_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: duration
        })
        .eq('id', activeSession.id);
      
      if (error) throw error;
      return duration;
    },
    onSuccess: (duration) => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['set-records'] });
      toast.success(`Workout completed! Duration: ${duration} minutes 🎉`);
    },
    onError: (error) => {
      toast.error('Failed to end workout');
      console.error(error);
    }
  });

  // Add set record mutation
  const addSetMutation = useMutation({
    mutationFn: async ({ 
      sessionId, 
      exerciseId, 
      reps, 
      weight, 
      setRecords 
    }: { 
      sessionId: string; 
      exerciseId: string; 
      reps: number; 
      weight: number;
      setRecords: any[];
    }) => {
      // Get the next set number for this exercise
      const existingSets = setRecords.filter(record => record.exercise_id === exerciseId);
      const nextSetNumber = existingSets.length + 1;
      
      const { error } = await supabase
        .from('set_records')
        .insert({
          session_id: sessionId,
          exercise_id: exerciseId,
          set_number: nextSetNumber,
          reps,
          weight
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['set-records'] });
      toast.success('Set recorded!');
    },
    onError: (error) => {
      toast.error('Failed to record set');
      console.error(error);
    }
  });

  return {
    updateDailyLogMutation,
    startWorkoutMutation,
    endWorkoutMutation,
    addSetMutation
  };
}
