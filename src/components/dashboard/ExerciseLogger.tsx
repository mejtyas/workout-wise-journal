
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

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
          className="h-8"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Set
        </Button>
      </div>
    </div>
  );
}
