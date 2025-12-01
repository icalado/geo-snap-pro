-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create storage bucket for field photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-photos', 'field-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create photo_logs table
CREATE TABLE IF NOT EXISTS public.photo_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  extracted_text TEXT,
  utm_raw TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  captured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.photo_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for photo_logs
CREATE POLICY "Users can view their own photo logs"
  ON public.photo_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own photo logs"
  ON public.photo_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photo logs"
  ON public.photo_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photo logs"
  ON public.photo_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage policies for field-photos bucket
CREATE POLICY "Field photos are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'field-photos');

CREATE POLICY "Users can upload their own field photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'field-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own field photos"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'field-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own field photos"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'field-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_photo_logs_updated_at
  BEFORE UPDATE ON public.photo_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();