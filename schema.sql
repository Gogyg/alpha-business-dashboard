-- Create the voc_metrics table
CREATE TABLE IF NOT EXISTS public.voc_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the important_metrics table
CREATE TABLE IF NOT EXISTS public.important_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the team table
CREATE TABLE IF NOT EXISTS public.team_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.voc_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_data ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users to voc_metrics"
  ON public.voc_metrics FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users to important_metrics"
  ON public.important_metrics FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users to goals"
  ON public.goals FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for authenticated users to team_data"
  ON public.team_data FOR SELECT USING (auth.role() = 'authenticated');

-- Allow write access for authenticated users
CREATE POLICY "Allow write access for authenticated users to voc_metrics"
  ON public.voc_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update access for authenticated users to voc_metrics"
  ON public.voc_metrics FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow write access for authenticated users to important_metrics"
  ON public.important_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update access for authenticated users to important_metrics"
  ON public.important_metrics FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow write access for authenticated users to goals"
  ON public.goals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update access for authenticated users to goals"
  ON public.goals FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow write access for authenticated users to team_data"
  ON public.team_data FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update access for authenticated users to team_data"
  ON public.team_data FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable Realtime for all tables
alter publication supabase_realtime add table public.voc_metrics;
alter publication supabase_realtime add table public.important_metrics;
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.team_data;
