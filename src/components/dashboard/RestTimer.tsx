
import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestTimerProps {
  timeLeft: number;
  isActive: boolean;
  formatTime: string;
  onStop: () => void;
}

export function RestTimer({ timeLeft, isActive, formatTime, onStop }: RestTimerProps) {
  // Only hide the timer if time has reached 0 AND it's not active
  // This ensures it stays visible during navigation until timer completes
  if (timeLeft === 0 && !isActive) return null;

  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-blue-600" />
        <span className="text-blue-700 font-medium">Rest Timer</span>
        <span className="text-blue-800 font-mono font-bold text-lg">
          {formatTime}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
