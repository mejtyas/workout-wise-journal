
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { WorkoutSessionCard } from '@/components/history/WorkoutSessionCard';
import { HistoryActions } from '@/components/history/HistoryActions';
import { useHistoryData } from '@/hooks/useHistoryData';
import EditWorkoutDialog from '@/components/EditWorkoutDialog';

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

export default function History() {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);
  const { sessions, isLoading, deleteSession, exportToCSV, handleFileImport } = useHistoryData();

  const getPreviousRecord = (exerciseId: string, currentSessionDate: string) => {
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
        <HistoryActions onExport={exportToCSV} onImport={handleFileImport} />
      </div>

      {sessions.length === 0 ? (
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
          {sessions.map((session) => (
            <WorkoutSessionCard
              key={session.id}
              session={session}
              isExpanded={expandedSession === session.id}
              onToggleExpand={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
              onEdit={() => setEditingSession(session)}
              onDelete={() => deleteSession(session.id)}
              getPreviousRecord={getPreviousRecord}
              getExerciseSummary={getExerciseSummary}
              getComparisonIcon={getComparisonIcon}
            />
          ))}
        </div>
      )}

      {editingSession && (
        <EditWorkoutDialog
          session={editingSession}
          open={!!editingSession}
          onOpenChange={(open) => !open && setEditingSession(null)}
        />
      )}
    </div>
  );
}
