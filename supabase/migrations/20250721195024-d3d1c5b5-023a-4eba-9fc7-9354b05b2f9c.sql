
-- Create a table to track rest timers
CREATE TABLE public.rest_timers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.exercises(id) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER NOT NULL DEFAULT 150,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.rest_timers ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own timers
CREATE POLICY "Users can view their own rest timers" 
  ON public.rest_timers 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own timers
CREATE POLICY "Users can create their own rest timers" 
  ON public.rest_timers 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own timers
CREATE POLICY "Users can update their own rest timers" 
  ON public.rest_timers 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own timers
CREATE POLICY "Users can delete their own rest timers" 
  ON public.rest_timers 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_rest_timers_user_session ON public.rest_timers(user_id, session_id);
CREATE INDEX idx_rest_timers_active ON public.rest_timers(is_active) WHERE is_active = true;
