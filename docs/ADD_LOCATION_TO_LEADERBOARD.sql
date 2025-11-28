-- Add location columns to user_strength table
ALTER TABLE user_strength 
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_region TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS location_iso_country_code TEXT;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_user_strength_location_country 
ON user_strength(location_country);

CREATE INDEX IF NOT EXISTS idx_user_strength_location_city 
ON user_strength(location_city);

