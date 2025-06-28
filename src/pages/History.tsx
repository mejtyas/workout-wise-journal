
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

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

export default function History() {
  const { user } = useAuth();
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['workout-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workout_routines (name),
          set_records (
            exercise_id,
            set_number,
            reps,
            weight,
            exercises (
              name,
              muscle_group
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkoutSession[];
    },
    enabled: !!user?.id,
  });

  const getPreviousRecord = (exerciseId: string, currentSessionDate: string) => {
    if (!sessions) return null;
    
    const previousSessions = sessions.filter(s => s.date < currentSessionDate);
    for (const session of previousSessions) {
      const exerciseRecords = session.set_records.filter(r => r.exercise_id === exerciseId);
      if (exerciseRecords.length > 0) {
        const maxWeight = Math.max(...exerciseRecords.map(r => r.weight));
        const bestSet = exerciseRecords.find(r => r.weight === maxWeight);
        return bestSet;
      }
    }
    return null;
  };

  const getExerciseSummary = (sessionRecords: WorkoutSession['set_records']) => {
    const exerciseGroups = sessionRecords.reduce((acc, record) => {
      if (!acc[record.exercise_id]) {
        acc[record.exercise_id] = {
          name: record.exercises.name,
          records: [],
        };
      }
      acc[record.exercise_id].records.push(record);
      return acc;
    }, {} as Record<string, { name: string; records: typeof sessionRecords }>);

    return Object.values(exerciseGroups);
  };

  const getComparisonIcon = (current: number, previous: number | null) => {
    if (!previous) return <Minus className="h-3 w-3 text-gray-400" />;
    if (current > previous) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workout History</h1>
      </div>

      {sessions?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No workouts yet</h3>
            <p className="text-gray-600 text-center">
              Your workout history will appear here once you start logging sessions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions?.map((session) => {
            const isExpanded = expandedSession === session.id;
            const exerciseSummary = getExerciseSummary(session.set_records);
            
            return (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
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
                    <Button
                      variant="ghost"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                    >
                      {isExpanded ? 'Collapse' : 'View Details'}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="space-y-6">
                      {exerciseSummary.map((exercise) => {
                        const maxWeight = Math.max(...exercise.records.map(r => r.weight));
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
                                .sort((a, b) => a.set_number - b.set_number)
                                .map((record) => (
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
          })}
        </div>
      )}
    </div>
  );
}
