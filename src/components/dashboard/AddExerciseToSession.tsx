
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

interface RoutineExercise {
  exercise_id: string;
  exercises: {
    id: string;
    name: string;
    muscle_group: string;
  };
}

interface AddExerciseToSessionProps {
  routineExercises: RoutineExercise[];
  onAddExercise: (exercise: Exercise) => void;
}

export function AddExerciseToSession({ routineExercises, onAddExercise }: AddExerciseToSessionProps) {
  const { user } = useAuth();
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  // Get all user exercises
  const { data: allExercises = [] } = useQuery({
    queryKey: ['all-exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
      
      if (error) throw error;
      return data as Exercise[];
    },
    enabled: !!user
  });

  // Filter out exercises that are already in the routine
  const routineExerciseIds = routineExercises.map(re => re.exercise_id);
  const availableExercises = allExercises.filter(
    exercise => !routineExerciseIds.includes(exercise.id)
  );

  const handleAddExercise = () => {
    const selectedExercise = availableExercises.find(ex => ex.id === selectedExerciseId);
    if (selectedExercise) {
      onAddExercise(selectedExercise);
      setSelectedExerciseId('');
    }
  };

  if (availableExercises.length === 0) {
    return null; // No additional exercises available
  }

  return (
    <div className="border rounded-lg p-4 bg-blue-50">
      <h3 className="font-medium text-sm text-blue-800 mb-3">Add Additional Exercise</h3>
      <div className="flex gap-2 items-center">
        <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Choose an exercise to add" />
          </SelectTrigger>
          <SelectContent>
            {availableExercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                {exercise.name} ({exercise.muscle_group})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleAddExercise}
          disabled={!selectedExerciseId}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
