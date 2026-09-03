-- ============================================
-- MIGRATION 00002: CREATE PROFILES TABLE
-- ============================================

-- Gender enum
CREATE TYPE gender AS ENUM ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say');

-- Relationship intent enum
CREATE TYPE relationship_intent AS ENUM (
    'serious_relationship',
    'marriage',
    'casual_dating',
    'friendship',
    'long_term',
    'unsure'
);

-- Education level enum
CREATE TYPE education_level AS ENUM (
    'high_school',
    'diploma',
    'bachelors',
    'masters',
    'doctorate',
    'other'
);

-- Occupation status enum
CREATE TYPE occupation_status AS ENUM (
    'employed',
    'self_employed',
    'student',
    'unemployed',
    'retired',
    'other'
);

-- Verification badge enum
CREATE TYPE verification_badge AS ENUM ('none', 'basic', 'premium', 'vip');

-- Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    bio VARCHAR(500),
    avatar_url TEXT,
    cover_photo_url TEXT,
    gender gender,
    birth_date DATE,
    location JSONB,
    interests TEXT[] DEFAULT '{}',
    relationship_intent relationship_intent,
    education_level education_level,
    occupation VARCHAR(200),
    occupation_status occupation_status,
    height_cm INTEGER,
    languages TEXT[] DEFAULT '{}',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_badge verification_badge NOT NULL DEFAULT 'none',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT profiles_height_range CHECK (height_cm IS NULL OR (height_cm >= 100 AND height_cm <= 250)),
    CONSTRAINT profiles_display_name_length CHECK (char_length(display_name) >= 2),
    CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500),
    CONSTRAINT profiles_avatar_url_format CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://'),
    CONSTRAINT profiles_cover_photo_url_format CHECK (cover_photo_url IS NULL OR cover_photo_url ~* '^https?://'),
    CONSTRAINT profiles_birth_date_check CHECK (birth_date IS NULL OR birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_display_name ON profiles(display_name);
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_relationship_intent ON profiles(relationship_intent);
CREATE INDEX idx_profiles_location ON profiles USING GIN (location);
CREATE INDEX idx_profiles_interests ON profiles USING GIN (interests);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Profile photos table
CREATE TABLE profile_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT profile_photos_url_format CHECK (url ~* '^https?://'),
    CONSTRAINT profile_photos_thumbnail_url_format CHECK (thumbnail_url IS NULL OR thumbnail_url ~* '^https?://')
);

-- Indexes
CREATE INDEX idx_profile_photos_profile_id ON profile_photos(profile_id);
CREATE INDEX idx_profile_photos_order ON profile_photos(profile_id, "order");
CREATE INDEX idx_profile_photos_primary ON profile_photos(profile_id, is_primary);