-- Add new fields to projects table
ALTER TABLE public.projects
ADD COLUMN location text,
ADD COLUMN contract text,
ADD COLUMN project_type text CHECK (project_type IN ('fauna', 'flora')),
ADD COLUMN fauna_subtype text CHECK (fauna_subtype IN ('ictiofauna', 'mastofauna', 'ornitofauna', 'herpetofauna', 'entomofauna'));

-- Add comment for clarity
COMMENT ON COLUMN public.projects.project_type IS 'Type of project: fauna or flora';
COMMENT ON COLUMN public.projects.fauna_subtype IS 'Subtype when project_type is fauna: ictiofauna, mastofauna, ornitofauna, herpetofauna, entomofauna';