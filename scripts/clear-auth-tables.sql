-- Clear NextAuth tables to resolve OAuthAccountNotLinked error
-- Run this with: psql -U hw_user -d housewolf -f scripts/clear-auth-tables.sql

TRUNCATE TABLE accounts CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE verification_tokens CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE user_roles CASCADE;

-- Confirm
SELECT 'Auth tables cleared' AS status;
