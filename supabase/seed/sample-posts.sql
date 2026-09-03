-- ============================================
-- SEED DATA: SAMPLE POSTS
-- ============================================
-- Creates sample posts in communities for testing

DO $$
DECLARE
    nigerian_community_id UUID;
    ghanaian_community_id UUID;
    south_african_community_id UUID;
    user_record RECORD;
    post_count INTEGER := 0;
BEGIN
    -- Get community IDs
    SELECT id INTO nigerian_community_id FROM communities WHERE slug = 'nigeria';
    SELECT id INTO ghanaian_community_id FROM communities WHERE slug = 'ghana';
    SELECT id INTO south_african_community_id FROM communities WHERE slug = 'south-africa';

    -- Create posts from Nigerian users
    FOR user_record IN 
        SELECT u.id, p.display_name 
        FROM users u 
        JOIN profiles p ON p.user_id = u.id 
        WHERE u.email LIKE '%@test.com' 
        LIMIT 20
    LOOP
        -- Skip admin users
        IF user_record.email NOT IN ('admin@datingapp.com', 'moderator@datingapp.com') THEN
            -- Create introduction post
            INSERT INTO posts (
                community_id,
                author_id,
                type,
                content,
                status,
                created_at
            ) VALUES (
                CASE 
                    WHEN user_record.display_name IN ('Ada Okafor', 'Chidi Eze', 'Ngozi Adeyemi', 'Emeka Nwosu', 'Amina Ibrahim', 'Yusuf Mohammed', 'Blessing Chukwu', 'Tunde Bakare', 'Folake Adebayo', 'Oluwaseun Ogunleye') THEN nigerian_community_id
                    WHEN user_record.display_name IN ('Kofi Mensah', 'Ama Serwaa', 'Yaw Boateng', 'Efua Asante', 'Kwame Appiah') THEN ghanaian_community_id
                    ELSE south_african_community_id
                END,
                user_record.id,
                'introduction',
                'Hello everyone! I''m ' || user_record.display_name || '. Excited to be here and looking forward to meeting new people!',
                'published',
                NOW() - (random() * INTERVAL '7 days')
            );
            post_count := post_count + 1;

            -- Create looking_for post (every other user)
            IF post_count % 2 = 0 THEN
                INSERT INTO posts (
                    community_id,
                    author_id,
                    type,
                    content,
                    status,
                    created_at
                ) VALUES (
                    CASE 
                        WHEN user_record.display_name IN ('Ada Okafor', 'Chidi Eze', 'Ngozi Adeyemi', 'Emeka Nwosu', 'Amina Ibrahim', 'Yusuf Mohammed', 'Blessing Chukwu', 'Tunde Bakare', 'Folake Adebayo', 'Oluwaseun Ogunleye') THEN nigerian_community_id
                        WHEN user_record.display_name IN ('Kofi Mensah', 'Ama Serwaa', 'Yaw Boateng', 'Efua Asante', 'Kwame Appiah') THEN ghanaian_community_id
                        ELSE south_african_community_id
                    END,
                    user_record.id,
                    'looking_for',
                    'Looking for someone who is honest, kind, and ready for a meaningful connection. If that sounds like you, let''s talk!',
                    'published',
                    NOW() - (random() * INTERVAL '5 days')
                );
                post_count := post_count + 1;
            END IF;

            -- Create discussion post (every third user)
            IF post_count % 3 = 0 THEN
                INSERT INTO posts (
                    community_id,
                    author_id,
                    type,
                    content,
                    status,
                    created_at
                ) VALUES (
                    CASE 
                        WHEN user_record.display_name IN ('Ada Okafor', 'Chidi Eze', 'Ngozi Adeyemi', 'Emeka Nwosu', 'Amina Ibrahim', 'Yusuf Mohammed', 'Blessing Chukwu', 'Tunde Bakare', 'Folake Adebayo', 'Oluwaseun Ogunleye') THEN nigerian_community_id
                        WHEN user_record.display_name IN ('Kofi Mensah', 'Ama Serwaa', 'Yaw Boateng', 'Efua Asante', 'Kwame Appiah') THEN ghanaian_community_id
                        ELSE south_african_community_id
                    END,
                    user_record.id,
                    'discussion',
                    'What''s the most important quality you look for in a partner? I''ll start: honesty and good communication are non-negotiable for me.',
                    'published',
                    NOW() - (random() * INTERVAL '3 days')
                );
                post_count := post_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- Add some comments to posts
    INSERT INTO comments (post_id, author_id, content, status, created_at)
    SELECT 
        p.id,
        u.id,
        CASE 
            WHEN random() < 0.25 THEN 'Great post! I completely agree with you.'
            WHEN random() < 0.5 THEN 'Welcome to the community! Looking forward to connecting.'
            WHEN random() < 0.75 THEN 'This is so true. Thanks for sharing!'
            ELSE 'Interesting perspective. I''d love to hear more.'
        END,
        'published',
        NOW() - (random() * INTERVAL '2 days')
    FROM posts p
    CROSS JOIN LATERAL (
        SELECT id FROM users 
        WHERE email LIKE '%@test.com' 
        AND email NOT IN ('admin@datingapp.com', 'moderator@datingapp.com')
        ORDER BY random() 
        LIMIT 1
    ) u
    WHERE p.status = 'published'
    LIMIT 50;

    -- Update post counts
    UPDATE posts p
    SET comment_count = (
        SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id
    );

    -- Update community post counts
    UPDATE communities c
    SET post_count = (
        SELECT COUNT(*) FROM posts p WHERE p.community_id = c.id
    );

    RAISE NOTICE 'Sample posts created successfully: %', post_count;
END;
$$;