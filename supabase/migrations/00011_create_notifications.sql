-- ============================================
-- MIGRATION 00010: CREATE VIP SYSTEM
-- ============================================

-- VIP level enum
CREATE TYPE vip_level AS ENUM ('free', 'basic', 'premium', 'vip');

-- VIP plan status enum
CREATE TYPE vip_plan_status AS ENUM ('active', 'inactive', 'archived');

-- Transaction type enum
CREATE TYPE transaction_type AS ENUM ('purchase', 'consumption', 'refund', 'bonus', 'adjustment');

-- Transaction status enum
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- VIP accounts table
CREATE TABLE vip_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    level vip_level NOT NULL DEFAULT 'free',
    points_balance INTEGER NOT NULL DEFAULT 0,
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    total_points_spent INTEGER NOT NULL DEFAULT 0,
    plan_id UUID,
    plan_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT vip_points_balance_non_negative CHECK (points_balance >= 0),
    CONSTRAINT vip_total_earned_non_negative CHECK (total_points_earned >= 0),
    CONSTRAINT vip_total_spent_non_negative CHECK (total_points_spent >= 0)
);

-- Indexes
CREATE INDEX idx_vip_accounts_user_id ON vip_accounts(user_id);
CREATE INDEX idx_vip_accounts_level ON vip_accounts(level);

-- Trigger for updated_at
CREATE TRIGGER update_vip_accounts_updated_at
    BEFORE UPDATE ON vip_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- VIP plans table
CREATE TABLE vip_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    level vip_level NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    duration_days INTEGER NOT NULL,
    points_included INTEGER NOT NULL DEFAULT 0,
    features TEXT[] DEFAULT '{}',
    status vip_plan_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT vip_plans_price_non_negative CHECK (price >= 0),
    CONSTRAINT vip_plans_duration_positive CHECK (duration_days > 0),
    CONSTRAINT vip_plans_points_non_negative CHECK (points_included >= 0)
);

-- Indexes
CREATE INDEX idx_vip_plans_level ON vip_plans(level);
CREATE INDEX idx_vip_plans_status ON vip_plans(status);

-- Trigger for updated_at
CREATE TRIGGER update_vip_plans_updated_at
    BEFORE UPDATE ON vip_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- VIP transactions table
CREATE TABLE vip_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    points_before INTEGER NOT NULL,
    points_after INTEGER NOT NULL,
    description TEXT,
    reference_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT vip_transactions_amount_not_zero CHECK (amount != 0),
    CONSTRAINT vip_transactions_points_non_negative CHECK (points_before >= 0 AND points_after >= 0)
);

-- Indexes
CREATE INDEX idx_vip_transactions_user_id ON vip_transactions(user_id, created_at DESC);
CREATE INDEX idx_vip_transactions_type ON vip_transactions(type);
CREATE INDEX idx_vip_transactions_status ON vip_transactions(status);

-- VIP features table
CREATE TABLE vip_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cost_points INTEGER NOT NULL DEFAULT 0,
    level_required vip_level NOT NULL DEFAULT 'free',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT vip_features_cost_non_negative CHECK (cost_points >= 0)
);

-- Indexes
CREATE INDEX idx_vip_features_level ON vip_features(level_required);
CREATE INDEX idx_vip_features_active ON vip_features(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_vip_features_updated_at
    BEFORE UPDATE ON vip_features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();