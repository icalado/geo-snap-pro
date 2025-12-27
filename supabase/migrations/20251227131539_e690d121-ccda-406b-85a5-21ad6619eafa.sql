-- Create track_logs table for GPS tracking sessions
CREATE TABLE public.track_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  track_id text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  points jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  distance_meters double precision DEFAULT 0,
  point_count integer DEFAULT 0,
  photo_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.track_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own track logs"
ON public.track_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own track logs"
ON public.track_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own track logs"
ON public.track_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own track logs"
ON public.track_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_track_logs_user_id ON public.track_logs(user_id);
CREATE INDEX idx_track_logs_project_id ON public.track_logs(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_track_logs_updated_at
BEFORE UPDATE ON public.track_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();