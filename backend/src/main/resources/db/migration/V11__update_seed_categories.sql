-- ==============================================================================
-- V11: Update Categories and Seed Data
-- Keep only 5 core categories: Deco, Collection, Events, Sponsorship, Marketing
-- ==============================================================================

-- 1. Upsert the 5 core categories
INSERT INTO categories (name, type, description, is_active)
VALUES
    ('Deco', 'EXPENSE', 'Stage decoration, lighting, flowers, props, and banners', TRUE),
    ('Collection', 'INCOME', 'Member subscriptions, ticket collections, and participant fees', TRUE),
    ('Events', 'BOTH', 'Event management, venue bookings, tournament registrations, and prizes', TRUE),
    ('Sponsorship', 'INCOME', 'Brand sponsorships, external patron donations, and partner contributions', TRUE),
    ('Marketing', 'EXPENSE', 'Posters, social media ads, flyers, banners, and promotional merchandise', TRUE)
ON CONFLICT (name) DO UPDATE SET
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    is_active = TRUE;

-- 2. Deactivate or delete old categories not in the 5 approved categories
-- For foreign key safety, update any transactions referencing other categories before deleting
UPDATE transactions
SET category_id = (SELECT id FROM categories WHERE name = 'Events' LIMIT 1)
WHERE category_id IN (
    SELECT id FROM categories WHERE name NOT IN ('Deco', 'Collection', 'Events', 'Sponsorship', 'Marketing')
);

DELETE FROM categories
WHERE name NOT IN ('Deco', 'Collection', 'Events', 'Sponsorship', 'Marketing');
