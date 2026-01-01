-- These tables were removed when the app switched to storing app data in Shopify Metaobjects.
-- Keep this migration as a safe no-op on Postgres (in case tables never existed).
DROP TABLE IF EXISTS "AppSettings";
DROP TABLE IF EXISTS "QuoteSubmission";
