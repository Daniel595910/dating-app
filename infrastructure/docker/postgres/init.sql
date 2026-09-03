-- PostgreSQL initialization script
-- This script runs when the container is first created

-- Create application database
CREATE DATABASE dating_app;

-- Create application user
CREATE USER dating_app_user WITH PASSWORD 'securepassword';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dating_app TO dating_app_user;

-- Connect to the database
\c dating_app;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO dating_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dating_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dating_app_user;