
-- Make muscle_group and default_weight optional in the exercises table
ALTER TABLE public.exercises ALTER COLUMN muscle_group DROP NOT NULL;
ALTER TABLE public.exercises ALTER COLUMN default_weight DROP NOT NULL;
