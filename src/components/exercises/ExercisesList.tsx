
import { ExerciseCard } from './ExerciseCard';

interface Exercise {
  id: string;
  name: string;
}

interface ExercisesListProps {
  exercises: Exercise[];
  onEdit: (exercise: Exercise) => void;
  onDelete: (exerciseId: string) => void;
}

export function ExercisesList({ exercises, onEdit, onDelete }: ExercisesListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
