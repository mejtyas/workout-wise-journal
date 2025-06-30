
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

export function ExerciseLogger({ exercise, setRecords, onAddSet, isLoading }: ExerciseLoggerProps) {
  const { user } = useAuth();
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  // Fetch previous performance for this exercise
  const { data: previousPerformance } = useQuery({
    queryKey: ['previous-performance', exercise.id],
    queryFn: async () => {
      console.log('Fetching previous performance for exercise:', exercise.id);
      
      const { data, error } = await supabase
        .from('set_records')
        .select(`
          reps,
          weight,
          created_at,
          workout_sessions!inner (
            date,
            user_id,
            end_time
          )
        `)
        .eq('exercise_id', exercise.id)
        .eq('workout_sessions.user_id', user?.id)
        .not('workout_sessions.end_time', 'is', null)
        .order('workout_sessions.date', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching previous performance:', error);
        throw error;
      }
      
      console.log('Previous performance data:', data);
      return data;
    },
    enabled: !!user && !!exercise.id
  });

  // Get the best set from the most recent completed workout
  const getLastBestSet = () => {
    if (!previousPerformance || previousPerformance.length === 0) {
      console.log('No previous performance data');
      return null;
    }
    
    // Group by date to get the most recent workout
    const groupedByDate = previousPerformance.reduce((acc, record) => {
      const date = record.workout_sessions.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(record);
      return acc;
    }, {} as Record<string, typeof previousPerformance>);

    const dates = Object.keys(groupedByDate).sort().reverse();
    if (dates.length === 0) return null;

    const lastWorkout = groupedByDate[dates[0]];
    
    // Find the best set (highest weight, or if same weight, highest reps)
    const bestSet = lastWorkout.reduce((best, current) => {
      if (current.weight > best.weight) return current;
      if (current.weight === best.weight && current.reps > best.reps) return current;
      return best;
    });

    const result = {
      ...bestSet,
      date: dates[0]
    };
    
    console.log('Last best set:', result);
    return result;
  };

  const lastBestSet = getLastBestSet();

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

  const getProgressIndicator = () => {
    if (!lastBestSet) return null;
    
    const currentWeight = parseFloat(weight);
    const currentReps = parseInt(reps);
    
    if (!currentWeight || !currentReps) return null;
    
    const isProgressing = currentWeight > lastBestSet.weight || 
                         (currentWeight === lastBestSet.weight && currentReps > lastBestSet.reps);
    
    return isProgressing ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : null;
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{exercise.name}</h3>
      </div>

      {/* Previous Performance - Centered Display */}
      {lastBestSet && (
        <div className="text-center mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Previous Best</div>
          <div className="font-medium text-lg">
            {lastBestSet.reps} reps × {lastBestSet.weight} kg
          </div>
          <div className="text-xs text-gray-500">
            {new Date(lastBestSet.date).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Show message if no previous data */}
      {!lastBestSet && (
        <div className="text-center mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600">First time doing this exercise!</div>
        </div>
      )}

      {/* Previous Sets */}
      {setRecords.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Today's Sets:</h4>
          <div className="space-y-1">
            {setRecords.map((record) => (
              <div key={record.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                <span>Set {record.set_number}</span>
                <span>{record.reps} reps × {record.weight} kg</span>
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
          <Label htmlFor={`weight-${exercise.id}`} className="text-xs">Weight (kg)</Label>
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
          className="h-8 flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Set
          {getProgressIndicator()}
        </Button>
      </div>
    </div>
  );
}
