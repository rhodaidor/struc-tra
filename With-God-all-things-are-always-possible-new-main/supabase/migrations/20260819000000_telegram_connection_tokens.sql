-- ==============================================================================
-- TELEGRAM CONNECTION TOKENS MIGRATION
-- Durable, atomic token persistence for Telegram bot account-linking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_connection_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMPTZ
);

-- Indexes for ultra-fast lookup and tenant isolation
CREATE INDEX IF NOT EXISTS idx_telegram_connection_tokens_token ON public.telegram_connection_tokens(token);
CREATE INDEX IF NOT EXISTS idx_telegram_connection_tokens_user ON public.telegram_connection_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_connection_tokens_expires ON public.telegram_connection_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.telegram_connection_tokens ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
CREATE POLICY "Service role full access on telegram_connection_tokens"
    ON public.telegram_connection_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can create and view their own tokens
CREATE POLICY "Users can create their own telegram connection tokens"
    ON public.telegram_connection_tokens
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own telegram connection tokens"
    ON public.telegram_connection_tokens
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
