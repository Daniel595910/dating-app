-- ============================================
-- SEED DATA: ADMIN USERS
-- ============================================
-- Creates initial admin users for testing
-- IMPORTANT: Change passwords in production!

DO $$
DECLARE
    admin_user_id UUID;
    moderator_user_id UUID;
BEGIN
    -- Create super admin user (password: Admin@123456)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        uuid_generate_v4(),
        'authenticated',
        'authenticated',
        'admin@datingapp.com',
        crypt('Admin@123456', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"role":"super_admin"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO admin_user_id;

    -- Create admin user record
    INSERT INTO users (
        id,
        email,
        role,
        status,
        verification_status,
        email_verified,
        phone_verified
    ) VALUES (
        admin_user_id,
        'admin@datingapp.com',
        'super_admin',
        'active',
        'verified',
        TRUE,
        FALSE
    ) ON CONFLICT (email) DO NOTHING;

    -- Create admin profile
    INSERT INTO profiles (
        user_id,
        display_name,
        bio,
        is_verified,
        verification_badge
    ) VALUES (
        admin_user_id,
        'System Administrator',
        'Platform administrator',
        TRUE,
        'vip'
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Create VIP account for admin
    INSERT INTO vip_accounts (
        user_id,
        level,
        points_balance,
        total_points_earned
    ) VALUES (
        admin_user_id,
        'vip',
        1000000,
        1000000
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Create moderator user (password: Moderator@123456)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        uuid_generate_v4(),
        'authenticated',
        'authenticated',
        'moderator@datingapp.com',
        crypt('Moderator@123456', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"role":"moderator"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO moderator_user_id;

    -- Create moderator user record
    INSERT INTO users (
        id,
        email,
        role,
        status,
        verification_status,
        email_verified,
        phone_verified
    ) VALUES (
        moderator_user_id,
        'moderator@datingapp.com',
        'moderator',
        'active',
        'verified',
        TRUE,
        FALSE
    ) ON CONFLICT (email) DO NOTHING;

    -- Create moderator profile
    INSERT INTO profiles (
        user_id,
        display_name,
        bio,
        is_verified,
        verification_badge
    ) VALUES (
        moderator_user_id,
        'Content Moderator',
        'Platform moderator',
        TRUE,
        'premium'
    ) ON CONFLICT (user_id) DO NOTHING;

    -- Create VIP account for moderator
    INSERT INTO vip_accounts (
        user_id,
        level,
        points_balance,
        total_points_earned
    ) VALUES (
        moderator_user_id,
        'premium',
        50000,
        50000
    ) ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Admin users created successfully';
END;
$$;