-- ============================================
-- SEED DATA: TEST USERS
-- ============================================
-- Creates test users for development and testing
-- All passwords are: Test@123456

DO $$
DECLARE
    test_user_ids UUID[] := ARRAY[]::UUID[];
    current_user_id UUID;
    nigerian_community_id UUID;
    ghanaian_community_id UUID;
    south_african_community_id UUID;
    test_names TEXT[] := ARRAY[
        'Ada Okafor', 'Chidi Eze', 'Ngozi Adeyemi', 'Emeka Nwosu', 'Amina Ibrahim',
        'Yusuf Mohammed', 'Blessing Chukwu', 'Tunde Bakare', 'Folake Adebayo', 'Oluwaseun Ogunleye',
        'Kofi Mensah', 'Ama Serwaa', 'Yaw Boateng', 'Efua Asante', 'Kwame Appiah',
        'Thabo Ndlovu', 'Lerato Khumalo', 'Sipho Dlamini', 'Nandi Zulu', 'Bongani Mthembu'
    ];
    test_emails TEXT[] := ARRAY[
        'ada.okafor@test.com', 'chidi.eze@test.com', 'ngozi.adeyemi@test.com', 'emeka.nwosu@test.com', 'amina.ibrahim@test.com',
        'yusuf.mohammed@test.com', 'blessing.chukwu@test.com', 'tunde.bakare@test.com', 'folake.adebayo@test.com', 'oluwaseun.ogunleye@test.com',
        'kofi.mensah@test.com', 'ama.serwaa@test.com', 'yaw.boateng@test.com', 'efua.asante@test.com', 'kwame.appiah@test.com',
        'thabo.ndlovu@test.com', 'lerato.khumalo@test.com', 'sipho.dlamini@test.com', 'nandi.zulu@test.com', 'bongani.mthembu@test.com'
    ];
    test_genders TEXT[] := ARRAY[
        'female', 'male', 'female', 'male', 'female',
        'male', 'female', 'male', 'female', 'male',
        'male', 'female', 'male', 'female', 'male',
        'male', 'female', 'male', 'female', 'male'
    ];
    test_intents TEXT[] := ARRAY[
        'serious_relationship', 'marriage', 'serious_relationship', 'casual_dating', 'marriage',
        'serious_relationship', 'long_term', 'friendship', 'serious_relationship', 'marriage',
        'serious_relationship', 'marriage', 'casual_dating', 'serious_relationship', 'long_term',
        'serious_relationship', 'marriage', 'friendship', 'serious_relationship', 'casual_dating'
    ];
    i INTEGER;
BEGIN
    -- Get community IDs
    SELECT id INTO nigerian_community_id FROM communities WHERE slug = 'nigeria';
    SELECT id INTO ghanaian_community_id FROM communities WHERE slug = 'ghana';
    SELECT id INTO south_african_community_id FROM communities WHERE slug = 'south-africa';

    -- Create test users
    FOR i IN 1..20 LOOP
        -- Create auth user
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
            test_emails[i],
            crypt('Test@123456', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"test_user":true}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        ) RETURNING id INTO current_user_id;

        test_user_ids := array_append(test_user_ids, current_user_id);

        -- Create user record
        INSERT INTO users (
            id,
            email,
            role,
            status,
            verification_status,
            email_verified,
            phone_verified
        ) VALUES (
            current_user_id,
            test_emails[i],
            'user',
            'active',
            'verified',
            TRUE,
            FALSE
        );

        -- Create profile
        INSERT INTO profiles (
            user_id,
            display_name,
            bio,
            gender,
            birth_date,
            interests,
            relationship_intent,
            is_verified,
            verification_badge,
            location,
            languages
        ) VALUES (
            current_user_id,
            test_names[i],
            CASE 
                WHEN i % 3 = 0 THEN 'Looking for someone special to share life with.'
                WHEN i % 3 = 1 THEN 'Fun-loving person who enjoys good conversation and adventure.'
                ELSE 'Ready to meet new people and see where things go.'
            END,
            test_genders[i]::gender,
            CASE 
                WHEN i % 2 = 0 THEN DATE '1995-06-15'
                ELSE DATE '1992-03-20'
            END,
            CASE 
                WHEN i % 4 = 0 THEN ARRAY['Music', 'Travel', 'Food']
                WHEN i % 4 = 1 THEN ARRAY['Sports', 'Fitness', 'Reading']
                WHEN i % 4 = 2 THEN ARRAY['Art', 'Photography', 'Movies']
                ELSE ARRAY['Cooking', 'Dancing', 'Nature']
            END,
            test_intents[i]::relationship_intent,
            TRUE,
            CASE 
                WHEN i % 5 = 0 THEN 'vip'::verification_badge
                WHEN i % 3 = 0 THEN 'premium'::verification_badge
                ELSE 'basic'::verification_badge
            END,
            CASE 
                WHEN i <= 10 THEN jsonb_build_object('country', 'Nigeria', 'countryCode', 'NG', 'state', 'Lagos', 'city', 'Ikeja')
                WHEN i <= 15 THEN jsonb_build_object('country', 'Ghana', 'countryCode', 'GH', 'state', 'Accra', 'city', 'Accra')
                ELSE jsonb_build_object('country', 'South Africa', 'countryCode', 'ZA', 'state', 'Johannesburg', 'city', 'Johannesburg')
            END,
            CASE 
                WHEN i <= 10 THEN ARRAY['English', 'Igbo', 'Yoruba']
                WHEN i <= 15 THEN ARRAY['English', 'Twi', 'Ga']
                ELSE ARRAY['English', 'Zulu', 'Xhosa']
            END
        );

        -- Create VIP account
        INSERT INTO vip_accounts (
            user_id,
            level,
            points_balance,
            total_points_earned
        ) VALUES (
            current_user_id,
            CASE 
                WHEN i % 5 = 0 THEN 'vip'::vip_level
                WHEN i % 3 = 0 THEN 'premium'::vip_level
                WHEN i % 2 = 0 THEN 'basic'::vip_level
                ELSE 'free'::vip_level
            END,
            CASE 
                WHEN i % 5 = 0 THEN 5000
                WHEN i % 3 = 0 THEN 2000
                WHEN i % 2 = 0 THEN 500
                ELSE 0
            END,
            CASE 
                WHEN i % 5 = 0 THEN 5000
                WHEN i % 3 = 0 THEN 2000
                WHEN i % 2 = 0 THEN 500
                ELSE 0
            END
        );

        -- Add to community
        INSERT INTO community_members (
            community_id,
            user_id,
            role,
            joined_at
        ) VALUES (
            CASE 
                WHEN i <= 10 THEN nigerian_community_id
                WHEN i <= 15 THEN ghanaian_community_id
                ELSE south_african_community_id
            END,
            current_user_id,
            'member',
            NOW()
        );

        -- Create notification preferences
        INSERT INTO notification_preferences (
            user_id,
            type,
            channels,
            enabled
        ) VALUES 
            (current_user_id, 'match', ARRAY['in_app', 'push'], TRUE),
            (current_user_id, 'message', ARRAY['in_app', 'push'], TRUE),
            (current_user_id, 'like', ARRAY['in_app'], TRUE),
            (current_user_id, 'comment', ARRAY['in_app'], TRUE),
            (current_user_id, 'system', ARRAY['in_app'], TRUE),
            (current_user_id, 'verification', ARRAY['in_app', 'email'], TRUE),
            (current_user_id, 'vip', ARRAY['in_app', 'email'], TRUE);
    END LOOP;

    RAISE NOTICE 'Test users created successfully: %', array_length(test_user_ids, 1);
END;
$$;