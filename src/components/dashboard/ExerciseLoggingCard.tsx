
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseLogger } from './ExerciseLogger';
import { AddExerciseToSession } from './AddExerciseToSession';

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

interface ExerciseLoggingCardProps {
  routineExercises: RoutineExercise[];
  setRecords: SetRecord[];
  onAddSet: (exerciseId: string, reps: number, weight: number) => void;
  isLoading: boolean;
  sessionId?: string;
  routineId?: string;
}

export function ExerciseLoggingCard({
  routineExercises,
  setRecords,
  onAddSet,
  isLoading,
  sessionId,
  routineId
}: ExerciseLoggingCardProps) {
  const [additionalExercises, setAdditionalExercises] = useState<Array<{
    id: string;
    name: string;
    muscle_group: string;
  }>>([]);

  const handleAddExercise = (exercise: { id: string; name: string; muscle_group: string }) => {
    setAdditionalExercises(prev => [...prev, exercise]);
  };

  // Combine routine exercises with additional exercises
  const allExercises = [
    ...routineExercises,
    ...additionalExercises.map(exercise => ({
      exercise_id: exercise.id,
      order_index: 999, // Put additional exercises at the end
      exercises: exercise
    }))
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Your Sets</CardTitle>
        <CardDescription>Record your performance for each exercise</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {allExercises.map((exerciseItem) => (
            <ExerciseLogger
              key={exerciseItem.exercise_id}
              exercise={exerciseItem.exercises}
              setRecords={setRecords.filter(record => record.exercise_id === exerciseItem.exercise_id)}
              onAddSet={(reps, weight) => onAddSet(exerciseItem.exercise_id, reps, weight)}
              isLoading={isLoading}
              sessionId={sessionId}
              routineId={routineId}
            />
          ))}
          
          {/* Add Exercise Component */}
          <AddExerciseToSession 
            routineExercises={routineExercises}
            onAddExercise={handleAddExercise}
          />
        </div>
      </CardContent>
    </Card>
  );
}
