import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WorkoutSessionCard } from '@/components/dashboard/WorkoutSessionCard';
import { WeightCard } from '@/components/dashboard/WeightCard';
import { CaloriesCard } from '@/components/dashboard/CaloriesCard';
import { ExerciseLoggingCard } from '@/components/dashboard/ExerciseLoggingCard';
import { useDashboardQueries, useRoutineExercises, useSetRecords } from '@/hooks/useDashboardQueries';
import { useDashboardMutations } from '@/hooks/useDashboardMutations';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';

interface WorkoutSession {
  id: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  routine_id: string | null;
}

export default function Dashboard() {
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Custom hooks
  const {
    routines,
    todayData,
    activeSession: currentSession
  } = useDashboardQueries();
  const {
    data: routineExercises = []
  } = useRoutineExercises(activeSession?.routine_id || null);
  const {
    data: setRecords = []
  } = useSetRecords(activeSession?.id || null);
  const elapsedTime = useWorkoutTimer(sessionStartTime);
  const {
    updateDailyLogMutation,
    startWorkoutMutation,
    endWorkoutMutation,
    addSetMutation
  } = useDashboardMutations();

  useEffect(() => {
    if (currentSession) {
      setActiveSession(currentSession);
      if (currentSession.start_time) {
        setSessionStartTime(new Date(currentSession.start_time));
      }
    }
  }, [currentSession]);

  const handleUpdateWeight = (weight: number) => {
    updateDailyLogMutation.mutate({
      weight
    });
  };

  const handleUpdateCalories = (calories: number) => {
    updateDailyLogMutation.mutate({
      calories
    });
  };

  const handleStartWorkout = (routineId: string) => {
    startWorkoutMutation.mutate(routineId);
    setActiveSession({
      id: '',
      start_time: new Date().toISOString(),
      end_time: null,
      duration_minutes: null,
      routine_id: routineId
    });
    setSessionStartTime(new Date());
  };

  const handleEndWorkout = () => {
    if (!activeSession || !sessionStartTime) return;
    endWorkoutMutation.mutate({
      activeSession,
      sessionStartTime
    });
    setActiveSession(null);
    setSessionStartTime(null);
  };

  const handleAddSet = (exerciseId: string, reps: number, weight: number) => {
    if (!activeSession?.id) return;
    addSetMutation.mutate({
      sessionId: activeSession.id,
      exerciseId,
      reps,
      weight,
      setRecords
    });
  };

  return (
    <div className="sm:px-4 space-y-6">
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
          sessionId={activeSession.id}
          routineId={activeSession.routine_id}
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
