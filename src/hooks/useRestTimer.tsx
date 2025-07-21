
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RestTimer {
  id: string;
  user_id: string;
  session_id: string;
  exercise_id: string;
  start_time: string;
  duration_seconds: number;
  is_active: boolean;
}

export function useRestTimer(sessionId?: string) {
  const { user } = useAuth();
  const [activeTimer, setActiveTimer] = useState<RestTimer | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Fetch active timer for the current session
  const fetchActiveTimer = useCallback(async () => {
    if (!user || !sessionId) return;

    const { data, error } = await supabase
      .from('rest_timers')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active timer:', error);
      return;
    }

    if (data) {
      setActiveTimer(data);
      calculateTimeLeft(data);
    } else {
      setActiveTimer(null);
      setTimeLeft(0);
      setIsActive(false);
    }
  }, [user, sessionId]);

  // Calculate time left based on server timer
  const calculateTimeLeft = useCallback((timer: RestTimer) => {
    const startTime = new Date(timer.start_time).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    const remaining = Math.max(0, timer.duration_seconds - elapsed);
    
    setTimeLeft(remaining);
    setIsActive(remaining > 0);

    // If timer has expired, mark it as inactive in the database
    if (remaining === 0 && timer.is_active) {
      supabase
        .from('rest_timers')
        .update({ is_active: false })
        .eq('id', timer.id)
        .then(() => {
          setActiveTimer(null);
        });
    }
  }, []);

  // Start a new timer
  const startTimer = useCallback(async (exerciseId: string, seconds: number = 150) => {
    if (!user || !sessionId) return;

    // First, deactivate any existing active timers for this session
    await supabase
      .from('rest_timers')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .eq('is_active', true);

    // Create new timer
    const { data, error } = await supabase
      .from('rest_timers')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        exercise_id: exerciseId,
        duration_seconds: seconds,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating timer:', error);
      return;
    }

    setActiveTimer(data);
    setTimeLeft(seconds);
    setIsActive(true);
  }, [user, sessionId]);

  // Stop the current timer
  const stopTimer = useCallback(async () => {
    if (!activeTimer) return;

    const { error } = await supabase
      .from('rest_timers')
      .update({ is_active: false })
      .eq('id', activeTimer.id);

    if (error) {
      console.error('Error stopping timer:', error);
      return;
    }

    setActiveTimer(null);
    setTimeLeft(0);
    setIsActive(false);
  }, [activeTimer]);

  // Update timer every second
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeTimer && isActive && timeLeft > 0) {
      interval = setInterval(() => {
        calculateTimeLeft(activeTimer);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer, isActive, timeLeft, calculateTimeLeft]);

  // Fetch active timer on mount and when session changes
  useEffect(() => {
    fetchActiveTimer();
  }, [fetchActiveTimer]);

  // Set up real-time subscription for timer updates
  useEffect(() => {
    if (!user || !sessionId) return;

    const channel = supabase
      .channel('rest-timer-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rest_timers',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchActiveTimer();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sessionId, fetchActiveTimer]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isActive,
    startTimer,
    stopTimer,
    formatTime: formatTime(timeLeft),
    isFinished: timeLeft === 0 && !isActive,
    exerciseId: activeTimer?.exercise_id || null
  };
}
