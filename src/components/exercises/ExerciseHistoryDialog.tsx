
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';

interface Exercise {
  id: string;
  name: string;
}

interface ExerciseHistoryDialogProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExerciseHistoryDialog({ exercise, isOpen, onClose }: ExerciseHistoryDialogProps) {
  const { data: historyRecords = [], isLoading } = useExerciseHistory(exercise?.id || null);

  // Group records by workout session
  const groupedHistory = historyRecords.reduce((acc, record) => {
    const sessionKey = `${record.session_id}-${record.workout_sessions.date}`;
    if (!acc[sessionKey]) {
      acc[sessionKey] = {
        date: record.workout_sessions.date,
        routineName: record.workout_sessions.workout_routines?.name || 'No routine',
        records: []
      };
    }
    acc[sessionKey].records.push(record);
    return acc;
  }, {} as Record<string, { date: string; routineName: string; records: typeof historyRecords }>);

  const sessions = Object.values(groupedHistory).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getComparisonIcon = (currentWeight: number, previousWeight: number | null) => {
    if (!previousWeight) return <Minus className="h-3 w-3 text-gray-400" />;
    if (currentWeight > previousWeight) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (currentWeight < previousWeight) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getSessionStats = (records: typeof historyRecords) => {
    const totalVolume = records.reduce((sum, record) => sum + (record.reps * record.weight), 0);
    const maxWeight = Math.max(...records.map(r => r.weight));
    const totalReps = records.reduce((sum, record) => sum + record.reps, 0);
    return { totalVolume, maxWeight, totalReps, totalSets: records.length };
  };

  if (!exercise) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {exercise.name} - Exercise History
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No workout history found for this exercise.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sessions.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Max Weight</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.max(...historyRecords.map(r => r.weight))}kg
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Sets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{historyRecords.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {historyRecords.reduce((sum, r) => sum + (r.reps * r.weight), 0)}kg
                  </div>
                </CardContent>
              </Card>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {sessions.map((session, index) => {
                const stats = getSessionStats(session.records);
                const previousSession = sessions[index + 1];
                const previousMaxWeight = previousSession ? 
                  Math.max(...previousSession.records.map(r => r.weight)) : null;

                return (
                  <AccordionItem key={`${session.date}-${index}`} value={`session-${index}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex justify-between items-center w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4" />
                          <div className="text-left">
                            <div className="font-medium">
                              {format(parseISO(session.date), 'MMMM d, yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {session.routineName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{stats.totalSets} sets</span>
                          <span>{stats.totalReps} reps</span>
                          <div className="flex items-center gap-1">
                            <span>Max: {stats.maxWeight}kg</span>
                            {getComparisonIcon(stats.maxWeight, previousMaxWeight)}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-sm text-gray-600">Sets</div>
                            <div className="text-lg font-semibold">{stats.totalSets}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-sm text-gray-600">Total Reps</div>
                            <div className="text-lg font-semibold">{stats.totalReps}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-sm text-gray-600">Max Weight</div>
                            <div className="text-lg font-semibold">{stats.maxWeight}kg</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-sm text-gray-600">Total Volume</div>
                            <div className="text-lg font-semibold">{stats.totalVolume}kg</div>
                          </div>
                        </div>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Set</TableHead>
                              <TableHead>Reps</TableHead>
                              <TableHead>Weight (kg)</TableHead>
                              <TableHead>Volume (kg)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {session.records
                              .sort((a, b) => a.set_number - b.set_number)
                              .map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell className="font-medium">
                                    {record.set_number}
                                  </TableCell>
                                  <TableCell>{record.reps}</TableCell>
                                  <TableCell>{record.weight}</TableCell>
                                  <TableCell>{record.reps * record.weight}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
