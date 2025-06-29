
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Play, Square, Timer, Scale, Utensils, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [selectedRoutine, setSelectedRoutine] = useState('');
  const [weight, setWeight] = useState('');
  const [calories, setCalories] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

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
      const { error } = await supabase
        .from('daily_logs')
        .upsert({
          user_id: user?.id,
          date: today,
          weight,
          calories
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log'] });
      toast.success('Daily log updated!');
    },
    onError: (error) => {
      toast.error('Failed to update daily log');
      console.error(error);
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

  const handleUpdateWeight = () => {
    const weightValue = parseFloat(weight);
    if (weightValue > 0) {
      updateDailyLogMutation.mutate({ weight: weightValue });
      setWeight('');
    }
  };

  const handleUpdateCalories = () => {
    const caloriesValue = parseInt(calories);
    if (caloriesValue > 0) {
      updateDailyLogMutation.mutate({ calories: caloriesValue });
      setCalories('');
    }
  };

  const handleStartWorkout = () => {
    if (selectedRoutine) {
      startWorkoutMutation.mutate(selectedRoutine);
    } else {
      toast.error('Please select a workout routine first');
    }
  };

  const handleEndWorkout = () => {
    endWorkoutMutation.mutate();
  };

  // Timer display
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

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

  return (
    <div className="px-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to your fitness journey!</h1>
        <p className="text-gray-600">Let's make today count 💪</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Workout Session Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-green-600" />
              Workout Session
            </CardTitle>
            <CardDescription>
              {activeSession ? 'Workout in progress' : 'Start your workout'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSession ? (
              <div className="text-center space-y-4">
                <div className="text-4xl font-mono font-bold text-green-600">
                  {elapsedTime}
                </div>
                <p className="text-sm text-gray-600">Workout in progress</p>
                <Button 
                  onClick={handleEndWorkout}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={endWorkoutMutation.isPending}
                >
                  <Square className="h-4 w-4 mr-2" />
                  {endWorkoutMutation.isPending ? 'Ending...' : 'End Workout'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Workout Routine</Label>
                  <Select value={selectedRoutine} onValueChange={setSelectedRoutine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a routine" />
                    </SelectTrigger>
                    <SelectContent>
                      {routines.map((routine) => (
                        <SelectItem key={routine.id} value={routine.id}>
                          {routine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleStartWorkout}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!selectedRoutine || startWorkoutMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {startWorkoutMutation.isPending ? 'Starting...' : 'Start Workout'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Tracking */}
        <div className="space-y-6">
          {/* Weight Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                Today's Weight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayData?.weight && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {todayData.weight} lbs
                  </div>
                  <p className="text-sm text-gray-600">Logged today</p>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Weight (lbs)"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <Button 
                  onClick={handleUpdateWeight}
                  size="sm"
                  disabled={updateDailyLogMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Calories Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-yellow-600" />
                Today's Calories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayData?.calories && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {todayData.calories} cal
                  </div>
                  <p className="text-sm text-gray-600">Logged today</p>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Calories"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
                <Button 
                  onClick={handleUpdateCalories}
                  size="sm"
                  disabled={updateDailyLogMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Exercise Logging Section - Only show when workout is active */}
      {activeSession && routineExercises.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Log Your Sets</CardTitle>
            <CardDescription>Record your performance for each exercise</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {routineExercises.map((routineExercise) => (
                <ExerciseLogger
                  key={routineExercise.exercise_id}
                  exercise={routineExercise.exercises}
                  setRecords={setRecords.filter(record => record.exercise_id === routineExercise.exercise_id)}
                  onAddSet={(reps, weight) => addSetMutation.mutate({ 
                    exerciseId: routineExercise.exercise_id, 
                    reps, 
                    weight 
                  })}
                  isLoading={addSetMutation.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
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

interface ExerciseLoggerProps {
  exercise: {
    id: string;
    name: string;
    muscle_group: string;
  };
  setRecords: SetRecord[];
  onAddSet: (reps: number, weight: number) => void;
  isLoading: boolean;
}

function ExerciseLogger({ exercise, setRecords, onAddSet, isLoading }: ExerciseLoggerProps) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  const handleAddSet = () => {
    const repsValue = parseInt(reps);
    const weightValue = parseFloat(weight);
    
    if (repsValue > 0 && weightValue >= 0) {
      onAddSet(repsValue, weightValue);
      setReps('');
      setWeight('');
    } else {
      toast.error('Please enter valid reps and weight');
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg">{exercise.name}</h3>
          <p className="text-sm text-gray-600">{exercise.muscle_group}</p>
        </div>
      </div>

      {/* Previous Sets */}
      {setRecords.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Completed Sets:</h4>
          <div className="space-y-1">
            {setRecords.map((record) => (
              <div key={record.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                <span>Set {record.set_number}</span>
                <span>{record.reps} reps × {record.weight} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Set */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label htmlFor={`reps-${exercise.id}`} className="text-xs">Reps</Label>
          <Input
            id={`reps-${exercise.id}`}
            type="number"
            placeholder="Reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor={`weight-${exercise.id}`} className="text-xs">Weight (lbs)</Label>
          <Input
            id={`weight-${exercise.id}`}
            type="number"
            placeholder="Weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-8"
          />
        </div>
        <Button 
          onClick={handleAddSet}
          size="sm"
          disabled={isLoading}
          className="h-8"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Set
        </Button>
      </div>
    </div>
  );
}
