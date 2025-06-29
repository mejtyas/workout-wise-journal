
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Scale } from 'lucide-react';

interface DailyLog {
  weight: number | null;
  calories: number | null;
}

interface WeightCardProps {
  todayData: DailyLog | null;
  onUpdateWeight: (weight: number) => void;
  isLoading: boolean;
}

export function WeightCard({ todayData, onUpdateWeight, isLoading }: WeightCardProps) {
  const [weight, setWeight] = useState('');

  const handleUpdateWeight = () => {
    const weightValue = parseFloat(weight);
    if (weightValue > 0) {
      onUpdateWeight(weightValue);
      setWeight('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-blue-600" />
          Today's Weight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayData?.weight && (
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {todayData.weight} kg
            </div>
            <p className="text-sm text-gray-600">Logged today</p>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Weight (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Button 
            onClick={handleUpdateWeight}
            size="sm"
            disabled={isLoading}
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
