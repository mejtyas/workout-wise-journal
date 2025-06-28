
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create exercises table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  default_weight NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create workout routines table
CREATE TABLE public.workout_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create routine exercises junction table for ordering
CREATE TABLE public.routine_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID NOT NULL REFERENCES public.workout_routines ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  default_sets INTEGER DEFAULT 3,
  default_reps INTEGER DEFAULT 10,
  UNIQUE(routine_id, exercise_id)
);

-- Create workout sessions table
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  routine_id UUID REFERENCES public.workout_routines ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create set records table
CREATE TABLE public.set_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create daily logs table for weight and calories
CREATE TABLE public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  calories INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for exercises
CREATE POLICY "Users can view their own exercises" ON public.exercises
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own exercises" ON public.exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercises" ON public.exercises
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercises" ON public.exercises
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for workout routines
CREATE POLICY "Users can view their own routines" ON public.workout_routines
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own routines" ON public.workout_routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own routines" ON public.workout_routines
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own routines" ON public.workout_routines
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for routine exercises
CREATE POLICY "Users can view routine exercises for their routines" ON public.routine_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_routines 
      WHERE workout_routines.id = routine_exercises.routine_id 
      AND workout_routines.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create routine exercises for their routines" ON public.routine_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_routines 
      WHERE workout_routines.id = routine_exercises.routine_id 
      AND workout_routines.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update routine exercises for their routines" ON public.routine_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workout_routines 
      WHERE workout_routines.id = routine_exercises.routine_id 
      AND workout_routines.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete routine exercises for their routines" ON public.routine_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workout_routines 
      WHERE workout_routines.id = routine_exercises.routine_id 
      AND workout_routines.user_id = auth.uid()
    )
  );

-- Create RLS policies for workout sessions
CREATE POLICY "Users can view their own sessions" ON public.workout_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.workout_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.workout_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for set records
CREATE POLICY "Users can view set records for their sessions" ON public.set_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE workout_sessions.id = set_records.session_id 
      AND workout_sessions.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create set records for their sessions" ON public.set_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE workout_sessions.id = set_records.session_id 
      AND workout_sessions.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update set records for their sessions" ON public.set_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE workout_sessions.id = set_records.session_id 
      AND workout_sessions.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete set records for their sessions" ON public.set_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE workout_sessions.id = set_records.session_id 
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Create RLS policies for daily logs
CREATE POLICY "Users can view their own daily logs" ON public.daily_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own daily logs" ON public.daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily logs" ON public.daily_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own daily logs" ON public.daily_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for CSV imports/exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-data', 'workout-data', false);

-- Create storage policies
CREATE POLICY "Users can upload their own data files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workout-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own data files" ON storage.objects
  FOR SELECT USING (bucket_id = 'workout-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own data files" ON storage.objects
  FOR DELETE USING (bucket_id = 'workout-data' AND auth.uid()::text = (storage.foldername(name))[1]);
