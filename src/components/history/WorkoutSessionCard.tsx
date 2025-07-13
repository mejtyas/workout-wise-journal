
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Edit, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface WorkoutSession {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  workout_routines: {
    name: string;
  } | null;
  set_records: {
    id: string;
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    exercises: {
      name: string;
      muscle_group: string;
    };
  }[];
}

interface WorkoutSessionCardProps {
  session: WorkoutSession;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getPreviousRecord: (exerciseId: string, currentSessionDate: string) => any;
  getExerciseSummary: (records: WorkoutSession['set_records']) => any[];
  getComparisonIcon: (current: number, previous: number | null) => React.ReactNode;
}

export function WorkoutSessionCard({
  session,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  getPreviousRecord,
  getExerciseSummary,
  getComparisonIcon
}: WorkoutSessionCardProps) {
  const exerciseSummary = getExerciseSummary(session.set_records);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(new Date(session.date), 'MMMM d, yyyy')}
            </CardTitle>
            <CardDescription className="flex items-center gap-4 mt-1">
              {session.workout_routines?.name && (
                <span>Routine: {session.workout_routines.name}</span>
              )}
              {session.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {session.duration_minutes} min
                </span>
              )}
              <span>{exerciseSummary.length} exercises</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Workout Session</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this workout session? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" onClick={onToggleExpand}>
              {isExpanded ? 'Collapse' : 'View Details'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-6">
            {exerciseSummary.map((exercise) => {
              const maxWeight = Math.max(...exercise.records.map((r: any) => r.weight));
              const previousRecord = getPreviousRecord(exercise.records[0].exercise_id, session.date);
              
              return (
                <div key={exercise.records[0].exercise_id} className="border-l-4 border-green-500 pl-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">{exercise.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Max: {maxWeight}kg</span>
                      {getComparisonIcon(maxWeight, previousRecord?.weight || null)}
                      {previousRecord && (
                        <span className="text-xs">
                          (was {previousRecord.weight}kg)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {exercise.records
                      .sort((a: any, b: any) => a.set_number - b.set_number)
                      .map((record: any) => (
                        <div
                          key={`${record.exercise_id}-${record.set_number}`}
                          className="bg-gray-50 rounded p-2 text-sm"
                        >
                          <span className="font-medium">Set {record.set_number}:</span>
                          <span className="ml-2">
                            {record.reps} reps × {record.weight}kg
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
