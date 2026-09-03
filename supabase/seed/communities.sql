-- ============================================
-- SEED DATA: COMMUNITIES
-- ============================================
-- Initial communities for the dating app
-- Safe for development and testing

-- Country-level communities
INSERT INTO communities (name, slug, type, status, description, country, country_code, rules) VALUES
    ('Nigeria Dating Community', 'nigeria', 'country', 'active', 'Welcome to the Nigeria dating community! Connect with singles across Nigeria.', 'Nigeria', 'NG', ARRAY[
        'Be respectful to all members',
        'No spam or advertising',
        'No harassment or hate speech',
        'Protect your personal information',
        'Report suspicious behavior'
    ]),
    ('Ghana Dating Community', 'ghana', 'country', 'active', 'Welcome to the Ghana dating community! Connect with singles across Ghana.', 'Ghana', 'GH', ARRAY[
        'Be respectful to all members',
        'No spam or advertising',
        'No harassment or hate speech',
        'Protect your personal information',
        'Report suspicious behavior'
    ]),
    ('South Africa Dating Community', 'south-africa', 'country', 'active', 'Welcome to the South Africa dating community! Connect with singles across South Africa.', 'South Africa', 'ZA', ARRAY[
        'Be respectful to all members',
        'No spam or advertising',
        'No harassment or hate speech',
        'Protect your personal information',
        'Report suspicious behavior'
    ]),
    ('United Kingdom Dating Community', 'united-kingdom', 'country', 'active', 'Welcome to the UK dating community! Connect with singles across the United Kingdom.', 'United Kingdom', 'GB', ARRAY[
        'Be respectful to all members',
        'No spam or advertising',
        'No harassment or hate speech',
        'Protect your personal information',
        'Report suspicious behavior'
    ]),
    ('United States Dating Community', 'united-states', 'country', 'active', 'Welcome to the USA dating community! Connect with singles across the United States.', 'United States', 'US', ARRAY[
        'Be respectful to all members',
        'No spam or advertising',
        'No harassment or hate speech',
        'Protect your personal information',
        'Report suspicious behavior'
    ])
ON CONFLICT (slug) DO NOTHING;

-- State-level communities for Nigeria
INSERT INTO communities (name, slug, type, status, description, country, country_code, state, parent_id, rules) 
SELECT 
    'Lagos Dating Community', 'nigeria-lagos', 'state', 'active', 
    'Connect with singles in Lagos State, Nigeria.', 'Nigeria', 'NG', 'Lagos', 
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'nigeria'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO communities (name, slug, type, status, description, country, country_code, state, parent_id, rules) 
SELECT 
    'Rivers Dating Community', 'nigeria-rivers', 'state', 'active', 
    'Connect with singles in Rivers State, Nigeria.', 'Nigeria', 'NG', 'Rivers', 
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'nigeria'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO communities (name, slug, type, status, description, country, country_code, state, parent_id, rules) 
SELECT 
    'Abuja Dating Community', 'nigeria-abuja', 'state', 'active', 
    'Connect with singles in Abuja FCT, Nigeria.', 'Nigeria', 'NG', 'Abuja', 
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'nigeria'
ON CONFLICT (slug) DO NOTHING;

-- City-level communities for Nigeria
INSERT INTO communities (name, slug, type, status, description, country, country_code, state, city, parent_id, rules) 
SELECT 
    'Port Harcourt Dating Community', 'nigeria-rivers-port-harcourt', 'city', 'active', 
    'Connect with singles in Port Harcourt, Rivers State.', 'Nigeria', 'NG', 'Rivers', 'Port Harcourt',
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'nigeria-rivers'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO communities (name, slug, type, status, description, country, country_code, state, city, parent_id, rules) 
SELECT 
    'Ikeja Dating Community', 'nigeria-lagos-ikeja', 'city', 'active', 
    'Connect with singles in Ikeja, Lagos State.', 'Nigeria', 'NG', 'Lagos', 'Ikeja',
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'nigeria-lagos'
ON CONFLICT (slug) DO NOTHING;

-- State-level communities for Ghana
INSERT INTO communities (name, slug, type, status, description, country, country_code, state, parent_id, rules) 
SELECT 
    'Accra Dating Community', 'ghana-accra', 'state', 'active', 
    'Connect with singles in Accra, Ghana.', 'Ghana', 'GH', 'Accra', 
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'ghana'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO communities (name, slug, type, status, description, country, country_code, state, parent_id, rules) 
SELECT 
    'Kumasi Dating Community', 'ghana-kumasi', 'state', 'active', 
    'Connect with singles in Kumasi, Ghana.', 'Ghana', 'GH', 'Kumasi', 
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'ghana'
ON CONFLICT (slug) DO NOTHING;

-- State-level communities for South Africa
INSERT INTO communities (name, slug, type, status, description, country, country_code, state, parent_id, rules) 
SELECT 
    'Johannesburg Dating Community', 'south-africa-johannesburg', 'state', 'active', 
    'Connect with singles in Johannesburg, South Africa.', 'South Africa', 'ZA', 'Johannesburg', 
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'south-africa'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO communities (name, slug, type, status, description, country, country_code, state, parent_id, rules) 
SELECT 
    'Cape Town Dating Community', 'south-africa-cape-town', 'state', 'active', 
    'Connect with singles in Cape Town, South Africa.', 'South Africa', 'ZA', 'Cape Town', 
    c.id, ARRAY['Be respectful', 'No spam', 'No harassment']
FROM communities c WHERE c.slug = 'south-africa'
ON CONFLICT (slug) DO NOTHING;