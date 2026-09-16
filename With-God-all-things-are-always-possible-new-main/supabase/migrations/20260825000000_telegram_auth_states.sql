-- ==============================================================================
-- TELEGRAM MTPROTO AUTH STATES MIGRATION
-- Durable, encrypted serverless persistence for Telegram MTProto login lifecycle
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_auth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    phone_code_hash TEXT NOT NULL,
    encrypted_session TEXT NOT NULL,
    stage TEXT DEFAULT 'awaiting_code' CHECK (stage IN ('awaiting_code', 'awaiting_password', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT telegram_auth_states_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_auth_states_user ON public.telegram_auth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_states_expires ON public.telegram_auth_states(expires_at);

ALTER TABLE public.telegram_auth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on telegram_auth_states"
    ON public.telegram_auth_states
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can insert their own telegram auth states"
    ON public.telegram_auth_states
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own telegram auth states"
    ON public.telegram_auth_states
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram auth states"
    ON public.telegram_auth_states
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own telegram auth states"
    ON public.telegram_auth_states
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
