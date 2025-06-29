
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus } from 'lucide-react';

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

interface EditWorkoutDialogProps {
  session: WorkoutSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditWorkoutDialog({ session, open, onOpenChange }: EditWorkoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedSession, setEditedSession] = useState(session);
  const [editedRecords, setEditedRecords] = useState(session.set_records);

  const { data: exercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    setEditedSession(session);
    setEditedRecords(session.set_records);
  }, [session]);

  const updateSessionMutation = useMutation({
    mutationFn: async () => {
      // Update session details
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .update({
          date: editedSession.date,
          duration_minutes: editedSession.duration_minutes,
        })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Delete existing set records
      const { error: deleteError } = await supabase
        .from('set_records')
        .delete()
        .eq('session_id', session.id);

      if (deleteError) throw deleteError;

      // Insert updated set records
      const recordsToInsert = editedRecords.map(record => ({
        session_id: session.id,
        exercise_id: record.exercise_id,
        set_number: record.set_number,
        reps: record.reps,
        weight: record.weight,
      }));

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('set_records')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      toast({
        title: "Success",
        description: "Workout session updated successfully",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update workout session",
        variant: "destructive",
      });
    },
  });

  const updateRecord = (index: number, field: string, value: any) => {
    const updated = [...editedRecords];
    updated[index] = { ...updated[index], [field]: value };
    setEditedRecords(updated);
  };

  const deleteRecord = (index: number) => {
    const updated = editedRecords.filter((_, i) => i !== index);
    setEditedRecords(updated);
  };

  const addRecord = () => {
    if (!exercises || exercises.length === 0) return;
    
    const newRecord = {
      id: `temp-${Date.now()}`,
      exercise_id: exercises[0].id,
      set_number: editedRecords.length + 1,
      reps: 10,
      weight: 0,
      exercises: {
        name: exercises[0].name,
        muscle_group: exercises[0].muscle_group,
      },
    };
    setEditedRecords([...editedRecords, newRecord]);
  };

  const exerciseGroups = editedRecords.reduce((acc, record, index) => {
    if (!acc[record.exercise_id]) {
      acc[record.exercise_id] = {
        name: record.exercises.name,
        records: [],
      };
    }
    acc[record.exercise_id].records.push({ ...record, originalIndex: index });
    return acc;
  }, {} as Record<string, { name: string; records: Array<any> }>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workout Session</DialogTitle>
          <DialogDescription>
            Modify the details of your workout session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={editedSession.date}
                onChange={(e) => setEditedSession({ ...editedSession, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={editedSession.duration_minutes || ''}
                onChange={(e) => setEditedSession({ 
                  ...editedSession, 
                  duration_minutes: e.target.value ? parseInt(e.target.value) : null 
                })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Exercises</h3>
              <Button onClick={addRecord} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Set
              </Button>
            </div>

            {Object.values(exerciseGroups).map((exerciseGroup) => (
              <Card key={exerciseGroup.records[0].exercise_id}>
                <CardHeader>
                  <CardTitle className="text-base">{exerciseGroup.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {exerciseGroup.records.map((record) => (
                      <div key={record.originalIndex} className="flex items-center gap-2">
                        <span className="w-12 text-sm">Set {record.set_number}:</span>
                        <Input
                          type="number"
                          placeholder="Reps"
                          value={record.reps}
                          onChange={(e) => updateRecord(record.originalIndex, 'reps', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm">reps ×</span>
                        <Input
                          type="number"
                          placeholder="Weight"
                          value={record.weight}
                          onChange={(e) => updateRecord(record.originalIndex, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                        <span className="text-sm">kg</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecord(record.originalIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateSessionMutation.mutate()}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
