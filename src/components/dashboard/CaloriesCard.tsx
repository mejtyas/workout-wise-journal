
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Utensils } from 'lucide-react';

interface DailyLog {
  weight: number | null;
  calories: number | null;
}

interface CaloriesCardProps {
  todayData: DailyLog | null;
  onUpdateCalories: (calories: number) => void;
  isLoading: boolean;
}

export function CaloriesCard({ todayData, onUpdateCalories, isLoading }: CaloriesCardProps) {
  const [calories, setCalories] = useState('');

  const handleUpdateCalories = () => {
    const caloriesValue = parseInt(calories);
    if (caloriesValue > 0) {
      onUpdateCalories(caloriesValue);
      setCalories('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-yellow-600" />
          Today's Calories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayData?.calories && (
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {todayData.calories} cal
            </div>
            <p className="text-sm text-gray-600">Logged today</p>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Calories"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
          <Button 
            onClick={handleUpdateCalories}
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
