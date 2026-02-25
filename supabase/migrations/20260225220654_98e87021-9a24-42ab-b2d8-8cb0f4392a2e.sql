CREATE TABLE public.research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_ticker TEXT UNIQUE NOT NULL,
  research JSONB NOT NULL,
  steps JSONB,
  image_url TEXT,
  cache_ttl_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.research_cache FOR SELECT USING (true);
CREATE POLICY "Service write" ON public.research_cache FOR ALL USING ((current_setting('role') = 'service_role'));