-- =============================================
-- Security: Audit Logs
-- Description: Tracks access to sensitive data (GDPR compliance)
-- =============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who performed the action?
    user_id UUID REFERENCES public.profiles(id),
    
    -- What happened?
    action TEXT NOT NULL, -- e.g. 'VIEW_EMPLOYEE', 'READ_NOTE', 'EXPORT_DATA'
    resource_id UUID,     -- e.g. the employee_id viewed
    resource_type TEXT,   -- e.g. 'employee', 'salary_review'
    
    -- Metadata (JSON for flexibility)
    details JSONB DEFAULT '{}'::jsonb,
    
    -- When?
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Retention policy might be needed later (auto-delete after X years)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimize for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_id);

-- RLS: Very Strict!
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Application (Server-side) can insert logs
-- Note: Often we use a service_role key for this, but if we log from client/RLS context:
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id -- Can only log your own actions (prevents spoofing)
);

-- NO UPDATE or DELETE allowed for integrity
-- (Admins might need manual SQL access to delete if required by GDPR "Right to be forgotten", but app shouldn't do it)
