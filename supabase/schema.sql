-- ====================================================================
-- NAD JARVIS — Supabase Postgres Schema & Security Policies (v1.0)
-- Conforms strictly to nadjarvisskiills.txt Sections 2.1, 2.2, 2.3, 6
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (Single Owner Profile & Preferences)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT 'Nadjibullah Uwabato',
    nickname TEXT NOT NULL DEFAULT 'Nad',
    is_owner BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Conversations Table (Chat Sessions)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Messages Table (Chat Message History & Model Routing Details)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AI Providers Table
CREATE TABLE IF NOT EXISTS public.providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    base_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AI Models Table
CREATE TABLE IF NOT EXISTS public.models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    context_window INT DEFAULT 128000,
    supports_vision BOOLEAN DEFAULT FALSE,
    supports_tools BOOLEAN DEFAULT TRUE,
    cost_per_1k_input NUMERIC(10, 6) DEFAULT 0,
    cost_per_1k_output NUMERIC(10, 6) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial providers and models
INSERT INTO public.providers (id, name, is_active, base_url)
VALUES 
    ('nvidia', 'NVIDIA NIM', TRUE, 'https://integrate.api.nvidia.com/v1'),
    ('deepseek', 'DeepSeek', TRUE, 'https://api.deepseek.com/v1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.models (id, provider_id, name, context_window, supports_vision, supports_tools)
VALUES
    ('meta/llama-3.1-70b-instruct', 'nvidia', 'Llama 3.1 70B Instruct (NVIDIA NIM)', 128000, FALSE, TRUE),
    ('deepseek-chat', 'deepseek', 'DeepSeek Chat (V3)', 64000, FALSE, TRUE),
    ('deepseek-reasoner', 'deepseek', 'DeepSeek Reasoner (R1)', 64000, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 7. Provider Usage Log Table (Latency, Tokens, Cost, Fallback Tracker)
CREATE TABLE IF NOT EXISTS public.provider_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    latency_ms INT NOT NULL DEFAULT 0,
    is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    fallback_reason TEXT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. External Connections Table (Google Workspace, Mega Storage, etc.)
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'mega', 'other')),
    account_identifier TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'expired')),
    encrypted_refresh_token TEXT,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Drive Sources Table (Nicknamed Drive Connections & Scopes)
CREATE TABLE IF NOT EXISTS public.drive_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    folder_id TEXT NOT NULL DEFAULT 'root',
    scope_granted TEXT NOT NULL DEFAULT 'drive.readonly',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Documents Table (Pointers & Metadata, NOT Full Content)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    drive_source_id UUID REFERENCES public.drive_sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    storage_path TEXT,
    mime_type TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    indexing_status TEXT NOT NULL DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'indexing', 'indexed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Memory Items Table (Durable, Owner-Approved Memory Only)
CREATE TABLE IF NOT EXISTS public.memory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Tasks Table (Background Queued Work Items)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Scheduled Jobs Table (Reminders and Recurring Jobs)
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    schedule_cron TEXT,
    next_run TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Audit Events Table (Security-Sensitive Actions)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource TEXT,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES — STRICT SINGLE-OWNER RESTRICTION
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Deny access to unauthenticated requests by default
-- Profiles policy (Owner only)
DROP POLICY IF EXISTS "Owner profile access" ON public.profiles;
CREATE POLICY "Owner profile access" ON public.profiles
    FOR ALL TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Conversations policy
DROP POLICY IF EXISTS "Owner conversations access" ON public.conversations;
CREATE POLICY "Owner conversations access" ON public.conversations
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Messages policy
DROP POLICY IF EXISTS "Owner messages access" ON public.messages;
CREATE POLICY "Owner messages access" ON public.messages
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Providers policy (Authenticated read-only)
DROP POLICY IF EXISTS "Owner read providers" ON public.providers;
CREATE POLICY "Owner read providers" ON public.providers
    FOR SELECT TO authenticated
    USING (TRUE);

-- Models policy (Authenticated read-only)
DROP POLICY IF EXISTS "Owner read models" ON public.models;
CREATE POLICY "Owner read models" ON public.models
    FOR SELECT TO authenticated
    USING (TRUE);

-- Provider Usage policy
DROP POLICY IF EXISTS "Owner provider usage access" ON public.provider_usage;
CREATE POLICY "Owner provider usage access" ON public.provider_usage
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Connections policy
DROP POLICY IF EXISTS "Owner connections access" ON public.connections;
CREATE POLICY "Owner connections access" ON public.connections
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Drive Sources policy
DROP POLICY IF EXISTS "Owner drive sources access" ON public.drive_sources;
CREATE POLICY "Owner drive sources access" ON public.drive_sources
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Documents policy
DROP POLICY IF EXISTS "Owner documents access" ON public.documents;
CREATE POLICY "Owner documents access" ON public.documents
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Memory Items policy
DROP POLICY IF EXISTS "Owner memory items access" ON public.memory_items;
CREATE POLICY "Owner memory items access" ON public.memory_items
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Tasks policy
DROP POLICY IF EXISTS "Owner tasks access" ON public.tasks;
CREATE POLICY "Owner tasks access" ON public.tasks
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Scheduled Jobs policy
DROP POLICY IF EXISTS "Owner scheduled jobs access" ON public.scheduled_jobs;
CREATE POLICY "Owner scheduled jobs access" ON public.scheduled_jobs
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Audit Events policy (Insert and Select for authenticated owner only)
DROP POLICY IF EXISTS "Owner audit events access" ON public.audit_events;
CREATE POLICY "Owner audit events access" ON public.audit_events
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Storage bucket setup for Documents (Section 2.3)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage Bucket RLS Policy (scoped to single owner's user ID folder)
DROP POLICY IF EXISTS "Owner document storage access" ON storage.objects;
CREATE POLICY "Owner document storage access" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
