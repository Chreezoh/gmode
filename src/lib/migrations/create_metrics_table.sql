-- Create metrics table for aggregated usage statistics
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_name TEXT NOT NULL,
  avg_tokens DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  count INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a unique constraint to prevent duplicate entries
-- Either for global metrics (tool_name only) or per-user metrics (user_id, tool_name)
CREATE UNIQUE INDEX IF NOT EXISTS usage_metrics_global_idx ON public.usage_metrics (tool_name) 
  WHERE user_id IS NULL AND model IS NULL;
  
CREATE UNIQUE INDEX IF NOT EXISTS usage_metrics_user_tool_idx ON public.usage_metrics (user_id, tool_name) 
  WHERE user_id IS NOT NULL AND model IS NULL;
  
CREATE UNIQUE INDEX IF NOT EXISTS usage_metrics_tool_model_idx ON public.usage_metrics (tool_name, model) 
  WHERE user_id IS NULL AND model IS NOT NULL;
  
CREATE UNIQUE INDEX IF NOT EXISTS usage_metrics_user_tool_model_idx ON public.usage_metrics (user_id, tool_name, model) 
  WHERE user_id IS NOT NULL AND model IS NOT NULL;

-- Add RLS policies to usage_metrics table
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view only their own metrics
CREATE POLICY "Users can view their own metrics"
  ON public.usage_metrics
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy to allow service role to manage all metrics
CREATE POLICY "Service role can manage all metrics"
  ON public.usage_metrics
  USING (auth.role() = 'service_role');
