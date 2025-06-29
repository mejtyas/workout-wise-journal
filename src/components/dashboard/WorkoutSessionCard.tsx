
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Timer } from 'lucide-react';

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

interface WorkoutSessionCardProps {
  activeSession: WorkoutSession | null;
  routines: WorkoutRoutine[];
  elapsedTime: string;
  onStartWorkout: (routineId: string) => void;
  onEndWorkout: () => void;
  isStarting: boolean;
  isEnding: boolean;
}

export function WorkoutSessionCard({
  activeSession,
  routines,
  elapsedTime,
  onStartWorkout,
  onEndWorkout,
  isStarting,
  isEnding
}: WorkoutSessionCardProps) {
  const [selectedRoutine, setSelectedRoutine] = useState('');

  const handleStartWorkout = () => {
    if (selectedRoutine) {
      onStartWorkout(selectedRoutine);
    }
  };

  return (
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
              onClick={onEndWorkout}
              className="bg-red-600 hover:bg-red-700"
              disabled={isEnding}
            >
              <Square className="h-4 w-4 mr-2" />
              {isEnding ? 'Ending...' : 'End Workout'}
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
              disabled={!selectedRoutine || isStarting}
            >
              <Play className="h-4 w-4 mr-2" />
              {isStarting ? 'Starting...' : 'Start Workout'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
