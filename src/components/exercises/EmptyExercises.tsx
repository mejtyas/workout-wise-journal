
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Plus } from 'lucide-react';

interface EmptyExercisesProps {
  onAddClick: () => void;
}

export function EmptyExercises({ onAddClick }: EmptyExercisesProps) {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No exercises yet</h3>
        <p className="text-gray-600 mb-6">
          Create your first exercise to start building workout routines
        </p>
        <Button onClick={onAddClick} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Exercise
        </Button>
      </CardContent>
    </Card>
  );
}
