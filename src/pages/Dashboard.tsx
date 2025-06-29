import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkoutSessionCard } from '@/components/dashboard/WorkoutSessionCard';
import { WeightCard } from '@/components/dashboard/WeightCard';
import { CaloriesCard } from '@/components/dashboard/CaloriesCard';
import { ExerciseLoggingCard } from '@/components/dashboard/ExerciseLoggingCard';

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

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Fetch routines
  const { data: routines = [] } = useQuery({
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
  const { data: todayData } = useQuery({
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
  const { data: currentSession } = useQuery({
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

  // Fetch routine exercises for active session
  const { data: routineExercises = [] } = useQuery({
    queryKey: ['routine-exercises', activeSession?.routine_id],
    queryFn: async () => {
      if (!activeSession?.routine_id) return [];
      
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
        .eq('routine_id', activeSession.routine_id)
        .order('order_index');
      
      if (error) throw error;
      return data as RoutineExercise[];
    },
    enabled: !!activeSession?.routine_id
  });

  // Fetch existing set records for active session
  const { data: setRecords = [] } = useQuery({
    queryKey: ['set-records', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return [];
      
      const { data, error } = await supabase
        .from('set_records')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('exercise_id, set_number');
      
      if (error) throw error;
      return data as SetRecord[];
    },
    enabled: !!activeSession?.id
  });

  useEffect(() => {
    if (currentSession) {
      setActiveSession(currentSession);
      if (currentSession.start_time) {
        setSessionStartTime(new Date(currentSession.start_time));
      }
    }
  }, [currentSession]);

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
    onSuccess: (session) => {
      setActiveSession(session);
      setSessionStartTime(new Date());
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
    mutationFn: async () => {
      if (!activeSession) return;
      
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
      setActiveSession(null);
      setSessionStartTime(null);
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
    mutationFn: async ({ exerciseId, reps, weight }: { exerciseId: string; reps: number; weight: number }) => {
      if (!activeSession?.id) return;
      
      // Get the next set number for this exercise
      const existingSets = setRecords.filter(record => record.exercise_id === exerciseId);
      const nextSetNumber = existingSets.length + 1;
      
      const { error } = await supabase
        .from('set_records')
        .insert({
          session_id: activeSession.id,
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

  // Timer display
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - sessionStartTime.getTime();
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStartTime]);

  const handleUpdateWeight = (weight: number) => {
    updateDailyLogMutation.mutate({ weight });
  };

  const handleUpdateCalories = (calories: number) => {
    updateDailyLogMutation.mutate({ calories });
  };

  const handleStartWorkout = (routineId: string) => {
    startWorkoutMutation.mutate(routineId);
  };

  const handleEndWorkout = () => {
    endWorkoutMutation.mutate();
  };

  const handleAddSet = (exerciseId: string, reps: number, weight: number) => {
    addSetMutation.mutate({ exerciseId, reps, weight });
  };

  return (
    <div className="px-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to your fitness journey!</h1>
        <p className="text-gray-600">Let's make today count 💪</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Workout Session Card */}
        <WorkoutSessionCard
          activeSession={activeSession}
          routines={routines}
          elapsedTime={elapsedTime}
          onStartWorkout={handleStartWorkout}
          onEndWorkout={handleEndWorkout}
          isStarting={startWorkoutMutation.isPending}
          isEnding={endWorkoutMutation.isPending}
        />

        {/* Daily Tracking */}
        <div className="space-y-6">
          <WeightCard
            todayData={todayData}
            onUpdateWeight={handleUpdateWeight}
            isLoading={updateDailyLogMutation.isPending}
          />

          <CaloriesCard
            todayData={todayData}
            onUpdateCalories={handleUpdateCalories}
            isLoading={updateDailyLogMutation.isPending}
          />
        </div>
      </div>

      {/* Exercise Logging Section - Only show when workout is active */}
      {activeSession && routineExercises.length > 0 && (
        <ExerciseLoggingCard
          routineExercises={routineExercises}
          setRecords={setRecords}
          onAddSet={handleAddSet}
          isLoading={addSetMutation.isPending}
        />
      )}

      {routines.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Get started by creating your first workout routine!
            </p>
            <Button asChild>
              <a href="/workouts">Create Workout Routine</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
