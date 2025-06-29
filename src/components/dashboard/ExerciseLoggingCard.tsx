
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExerciseLogger } from './ExerciseLogger';

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
}

export function ExerciseLoggingCard({
  routineExercises,
  setRecords,
  onAddSet,
  isLoading
}: ExerciseLoggingCardProps) {
  return (
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
              onAddSet={(reps, weight) => onAddSet(routineExercise.exercise_id, reps, weight)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
