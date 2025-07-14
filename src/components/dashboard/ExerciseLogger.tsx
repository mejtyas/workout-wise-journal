import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRestTimer } from '@/hooks/useRestTimer';
import { RestTimer } from './RestTimer';
interface SetRecord {
  id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
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
export function ExerciseLogger({
  exercise,
  setRecords,
  onAddSet,
  isLoading
}: ExerciseLoggerProps) {
  const {
    user
  } = useAuth();
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const {
    timeLeft,
    isActive,
    startTimer,
    stopTimer,
    formatTime
  } = useRestTimer();

  // Fetch previous performance for this exercise
  const {
    data: previousPerformance
  } = useQuery({
    queryKey: ['previous-performance', exercise.id],
    queryFn: async () => {
      console.log('Fetching previous performance for exercise:', exercise.id);
      const {
        data,
        error
      } = await supabase.from('set_records').select(`
          reps,
          weight,
          set_number,
          created_at,
          workout_sessions!inner (
            date,
            user_id,
            end_time
          )
        `).eq('exercise_id', exercise.id).eq('workout_sessions.user_id', user?.id).not('workout_sessions.end_time', 'is', null).order('created_at', {
        ascending: false
      }).limit(50);
      if (error) {
        console.error('Error fetching previous performance:', error);
        throw error;
      }
      console.log('Previous performance data:', data);
      return data;
    },
    enabled: !!user && !!exercise.id
  });

  // Get the last 2 sets from the most recent completed workout
  const getLastTwoSets = () => {
    if (!previousPerformance || previousPerformance.length === 0) {
      console.log('No previous performance data');
      return [];
    }

    // Group by date to get the most recent workout
    const groupedByDate = previousPerformance.reduce((acc, record) => {
      const date = record.workout_sessions.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, typeof previousPerformance>);
    const dates = Object.keys(groupedByDate).sort().reverse();
    if (dates.length === 0) return [];
    const lastWorkout = groupedByDate[dates[0]];

    // Sort by set number and get the last 2 sets
    const sortedSets = lastWorkout.sort((a, b) => b.set_number - a.set_number);
    const lastTwoSets = sortedSets.slice(0, 2).reverse(); // Reverse to show in chronological order

    const result = lastTwoSets.map(set => ({
      ...set,
      date: dates[0]
    }));
    console.log('Last two sets:', result);
    return result;
  };
  const lastTwoSets = getLastTwoSets();
  const handleAddSet = () => {
    const repsValue = parseInt(reps);
    const weightValue = parseFloat(weight);
    if (repsValue > 0 && weightValue >= 0) {
      onAddSet(repsValue, weightValue);
      setReps('');
      setWeight('');

      // Start rest timer after adding a set
      startTimer(150); // 2:30 = 150 seconds
    } else {
      toast.error('Please enter valid reps and weight');
    }
  };
  const getProgressIndicator = () => {
    if (lastTwoSets.length === 0) return null;
    const currentWeight = parseFloat(weight);
    const currentReps = parseInt(reps);
    if (!currentWeight || !currentReps) return null;

    // Compare with the last set (most recent)
    const lastSet = lastTwoSets[lastTwoSets.length - 1];
    const isProgressing = currentWeight > lastSet.weight || currentWeight === lastSet.weight && currentReps > lastSet.reps;
    return isProgressing ? <TrendingUp className="h-4 w-4 text-green-500" /> : null;
  };
  return <div className="border rounded-lg p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{exercise.name}</h3>
      </div>

      {/* Rest Timer */}
      <RestTimer timeLeft={timeLeft} isActive={isActive} formatTime={formatTime} onStop={stopTimer} />

      {/* Previous Performance - Last 2 Sets */}
      {lastTwoSets.length > 0 && <div className="text-center mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Previous Sets</div>
          <div className="space-y-1">
            {lastTwoSets.map((set, index) => <div key={index} className="font-medium">
                <span className="text-sm text-gray-500">Set {set.set_number}: </span>
                {set.weight} kg × {set.reps} reps
              </div>)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(lastTwoSets[0].date).toLocaleDateString()}
          </div>
        </div>}

      {/* Show message if no previous data */}
      {lastTwoSets.length === 0 && <div className="text-center mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600">First time doing this exercise!</div>
        </div>}

      {/* Previous Sets */}
      {setRecords.length > 0 && <div className="mb-4">
          <h4 className="font-medium mb-2">Today's Sets:</h4>
          <div className="space-y-1">
            {setRecords.map(record => <div key={record.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                <span>Set {record.set_number}</span>
                <span>{record.weight} kg × {record.reps} reps</span>
              </div>)}
          </div>
        </div>}

      {/* Add New Set */}
      <div className="flex gap-2 items-end flex-wrap">
        <div className="">
          <Label htmlFor={`weight-${exercise.id}`} className="text-xs">Weight (kg)</Label>
          <Input id={`weight-${exercise.id}`} type="number" placeholder="Weight" value={weight} onChange={e => setWeight(e.target.value)} className="h-8" />
        </div>
        <div className="max-sm:w-full">
          <Label htmlFor={`reps-${exercise.id}`} className="text-xs">Reps</Label>
          <Input id={`reps-${exercise.id}`} type="number" placeholder="Reps" value={reps} onChange={e => setReps(e.target.value)} className="h-8" />
        </div>
        <Button onClick={handleAddSet} size="sm" disabled={isLoading} className="h-8 flex items-center gap-1 max-w-sm:min-w-24 ">
          <Plus className="h-3 w-3" />
          Add Set
          {getProgressIndicator()}
        </Button>
      </div>
    </div>;
}