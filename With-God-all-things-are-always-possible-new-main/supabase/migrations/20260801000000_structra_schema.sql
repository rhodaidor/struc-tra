-- ==============================================================================
-- STRUCTRA - PRODUCTION-READY SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Migration Version: 20260801000000
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. PROFILES TABLE (Linked to Supabase Auth auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT NOT NULL,
    avatar TEXT,
    user_type TEXT DEFAULT 'individual', -- 'individual', 'business', 'enterprise'
    company TEXT,
    phone_number TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{"theme": "system", "language": "en"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Automatic Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. WORKSPACES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    storage_limit_bytes BIGINT DEFAULT 10737418240 NOT NULL, -- 10GB default
    storage_used_bytes BIGINT DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'archived', 'suspended'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 5. WORKSPACE MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invitation_status TEXT DEFAULT 'accepted' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(workspace_id, user_id)
);

CREATE TRIGGER set_workspace_members_updated_at
    BEFORE UPDATE ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. DOCUMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT,
    supabase_storage_url TEXT,
    upload_source TEXT DEFAULT 'direct' CHECK (upload_source IN ('direct', 'gmail', 'telegram', 'api')),
    upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMPTZ,
    version_number INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. DOCUMENT METADATA TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE UNIQUE,
    title TEXT,
    category TEXT DEFAULT 'General',
    tags TEXT[] DEFAULT '{}'::TEXT[],
    ocr_text TEXT,
    ai_summary TEXT,
    keywords TEXT[] DEFAULT '{}'::TEXT[],
    language TEXT DEFAULT 'en',
    page_count INT DEFAULT 1,
    author TEXT,
    company TEXT,
    extracted_entities JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_document_metadata_updated_at
    BEFORE UPDATE ON public.document_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 8. AI EMBEDDINGS & DOCUMENT CHUNKS TABLES (pgvector support - 3072 dims for Gemini)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    embedding_vector vector(3072),
    embedding_model TEXT DEFAULT 'gemini-embedding-2-preview',
    chunk_index INT DEFAULT 0 NOT NULL,
    chunk_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    chunk_index INT DEFAULT 0 NOT NULL,
    chunk_text TEXT NOT NULL,
    page_number INT DEFAULT 1,
    embedding vector(3072),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20,
  p_user_id uuid DEFAULT NULL,
  p_document_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  user_id uuid,
  chunk_index int,
  chunk_text text,
  page_number int,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strict Tenant Isolation: p_user_id is mandatory. NULL returns zero results.
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.user_id,
    dc.chunk_index,
    dc.chunk_text,
    dc.page_number,
    dc.metadata,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM public.document_chunks dc
  WHERE
    dc.user_id = p_user_id
    AND (p_document_ids IS NULL OR dc.document_id = ANY(p_document_ids))
    AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. AI CONVERSATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    last_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_ai_conversations_updated_at
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 10. AI MESSAGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    referenced_document_ids UUID[] DEFAULT '{}'::UUID[],
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 11. FAVORITES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, document_id)
);

-- ------------------------------------------------------------------------------
-- 12. RECENT SEARCHES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recent_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    filters_used JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 13. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read_status BOOLEAN DEFAULT FALSE NOT NULL,
    target_page TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 14. INTEGRATIONS TABLE (Gmail & Telegram)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gmail', 'telegram', 'google_drive')),
    connected_account TEXT NOT NULL,
    active_mode TEXT DEFAULT 'smart_import' CHECK (active_mode IN ('smart_import', 'secure_index')),
    oauth_tokens_encrypted TEXT,
    last_sync TIMESTAMPTZ,
    status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, provider, connected_account)
);

CREATE TRIGGER set_integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 15. SYNC HISTORY TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
    sync_type TEXT DEFAULT 'manual' CHECK (sync_type IN ('manual', 'scheduled', 'webhook')),
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    finished_at TIMESTAMPTZ,
    documents_imported INT DEFAULT 0,
    documents_indexed INT DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb
);

-- ------------------------------------------------------------------------------
-- 16. STORAGE USAGE TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    storage_used BIGINT DEFAULT 0 NOT NULL,
    file_count INT DEFAULT 0 NOT NULL,
    last_calculated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, workspace_id)
);

-- ------------------------------------------------------------------------------
-- 17. SHARED DOCUMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shared_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    allow_download BOOLEAN DEFAULT TRUE NOT NULL,
    view_count INT DEFAULT 0 NOT NULL,
    download_count INT DEFAULT 0 NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_shared_documents_updated_at
    BEFORE UPDATE ON public.shared_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 18. AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'login', 'upload', 'download', 'share', 'delete', 'ai_chat', 'integration_event'
    resource_type TEXT,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 19. INDEXES FOR OPTIMAL PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON public.documents(is_deleted);
CREATE INDEX IF NOT EXISTS idx_documents_is_favorite ON public.documents(is_favorite);

CREATE INDEX IF NOT EXISTS idx_document_metadata_document ON public.document_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_document_metadata_category ON public.document_metadata(category);
CREATE INDEX IF NOT EXISTS idx_document_metadata_tags ON public.document_metadata USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_embeddings_document ON public.document_embeddings(document_id);
-- HNSW Vector Index for ultra-fast semantic search
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON public.document_embeddings USING hnsw (embedding_vector vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_searches_user ON public.recent_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_status);
CREATE INDEX IF NOT EXISTS idx_integrations_user ON public.integrations(user_id);
-- Unique index enforcing single-tenant active ownership of external accounts across all Structra users
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_unique_active_provider_account 
ON public.integrations (provider, LOWER(connected_account)) 
WHERE status NOT IN ('Disconnected', 'disconnected') AND oauth_tokens_encrypted IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_docs_token ON public.shared_documents(share_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);

-- ==============================================================================
-- 20. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS POLICIES: PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- RLS POLICIES: WORKSPACES & MEMBERS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view workspaces they own or belong to" 
    ON public.workspaces FOR SELECT 
    USING (
        auth.uid() = owner_id OR 
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = public.workspaces.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update their workspaces" 
    ON public.workspaces FOR UPDATE 
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can create workspaces" 
    ON public.workspaces FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view workspace members" 
    ON public.workspace_members FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = workspace_id AND (owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.workspace_members m WHERE m.workspace_id = workspace_id AND m.user_id = auth.uid()
            ))
        )
    );

-- ------------------------------------------------------------------------------
-- RLS POLICIES: DOCUMENTS & METADATA
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own or workspace documents" 
    ON public.documents FOR SELECT 
    USING (
        auth.uid() = owner_id OR 
        (workspace_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.workspace_members WHERE workspace_id = public.documents.workspace_id AND user_id = auth.uid()
        ))
    );

CREATE POLICY "Users can insert own documents" 
    ON public.documents FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own documents" 
    ON public.documents FOR UPDATE 
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own documents" 
    ON public.documents FOR DELETE 
    USING (auth.uid() = owner_id);

-- Document Metadata policies match document access
CREATE POLICY "Users can view document metadata" 
    ON public.document_metadata FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.documents WHERE id = document_id AND (
                owner_id = auth.uid() OR (workspace_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.workspace_members WHERE workspace_id = documents.workspace_id AND user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "Users can manage document metadata for own documents" 
    ON public.document_metadata FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.documents WHERE id = document_id AND owner_id = auth.uid())
    );

-- Embeddings policy matches document owner
CREATE POLICY "Users can view embeddings for own documents" 
    ON public.document_embeddings FOR SELECT 
    USING (
        EXISTS (SELECT 1 FROM public.documents WHERE id = document_id AND owner_id = auth.uid())
    );

CREATE POLICY "Users can insert embeddings for own documents" 
    ON public.document_embeddings FOR INSERT 
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.documents WHERE id = document_id AND owner_id = auth.uid())
    );

-- ------------------------------------------------------------------------------
-- RLS POLICIES: AI CONVERSATIONS & MESSAGES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can access own AI conversations" 
    ON public.ai_conversations FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can access AI messages in own conversations" 
    ON public.ai_messages FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
    );

-- ------------------------------------------------------------------------------
-- RLS POLICIES: FAVORITES, SEARCHES, NOTIFICATIONS, INTEGRATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage own favorites" 
    ON public.favorites FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recent searches" 
    ON public.recent_searches FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notifications" 
    ON public.notifications FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own integrations" 
    ON public.integrations FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view sync history for own integrations" 
    ON public.sync_history FOR SELECT 
    USING (
        EXISTS (SELECT 1 FROM public.integrations WHERE id = integration_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can view own storage usage" 
    ON public.storage_usage FOR ALL 
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS POLICIES: SHARED DOCUMENTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage shared document links created by them" 
    ON public.shared_documents FOR ALL 
    USING (auth.uid() = shared_by_user_id);

CREATE POLICY "Public can view valid shared documents by token" 
    ON public.shared_documents FOR SELECT 
    USING (is_revoked = FALSE AND (expires_at IS NULL OR expires_at > NOW()));

-- ------------------------------------------------------------------------------
-- RLS POLICIES: AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own audit logs" 
    ON public.audit_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert audit logs" 
    ON public.audit_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- END OF MIGRATION SCRIPT
-- ==============================================================================
