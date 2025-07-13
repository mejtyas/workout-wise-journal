import { useState, useEffect } from 'react';

export function useWorkoutTimer(sessionStartTime: Date | null) {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - sessionStartTime.getTime();
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStartTime]);

  return elapsedTime;
}