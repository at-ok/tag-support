-- Captures table for tracking player captures (tag events)
CREATE TABLE captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chaser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  runner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  capture_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_captures_chaser_id ON captures(chaser_id);
CREATE INDEX idx_captures_runner_id ON captures(runner_id);
CREATE INDEX idx_captures_capture_time ON captures(capture_time DESC);

-- Zones table for safe zones and restricted areas
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('safe', 'restricted')),
  center_latitude DOUBLE PRECISION NOT NULL,
  center_longitude DOUBLE PRECISION NOT NULL,
  center_location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(center_longitude, center_latitude), 4326)::geography
  ) STORED,
  radius_meters DOUBLE PRECISION NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zones_center_location ON zones USING GIST(center_location);
CREATE INDEX idx_zones_active ON zones(active);

-- Mission completions table for tracking individual player progress
CREATE TABLE mission_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  points_earned INTEGER NOT NULL DEFAULT 0,
  UNIQUE(mission_id, user_id)
);

CREATE INDEX idx_mission_completions_mission_id ON mission_completions(mission_id);
CREATE INDEX idx_mission_completions_user_id ON mission_completions(user_id);

-- Function to check if a player is in a zone
CREATE OR REPLACE FUNCTION is_in_zone(
  player_lat DOUBLE PRECISION,
  player_lng DOUBLE PRECISION,
  zone_type TEXT
)
RETURNS TABLE (
  zone_id UUID,
  zone_name TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    z.id AS zone_id,
    z.name AS zone_name,
    ST_Distance(
      z.center_location,
      ST_SetSRID(ST_MakePoint(player_lng, player_lat), 4326)::geography
    ) AS distance_meters
  FROM zones z
  WHERE z.active = true
    AND z.type = zone_type
    AND ST_DWithin(
      z.center_location,
      ST_SetSRID(ST_MakePoint(player_lng, player_lat), 4326)::geography,
      z.radius_meters
    )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get recent captures for a chaser
CREATE OR REPLACE FUNCTION get_chaser_captures(
  chaser_uuid UUID,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  capture_id UUID,
  runner_id UUID,
  runner_nickname TEXT,
  capture_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS capture_id,
    c.runner_id,
    u.nickname AS runner_nickname,
    c.capture_time
  FROM captures c
  JOIN users u ON c.runner_id = u.id
  WHERE c.chaser_id = chaser_uuid
  ORDER BY c.capture_time DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Row Level Security (RLS) policies
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_completions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read captures
CREATE POLICY "Authenticated users can read captures"
  ON captures FOR SELECT
  USING (auth.role() = 'authenticated');

-- Chasers can insert captures
CREATE POLICY "Chasers can insert captures"
  ON captures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'chaser'
    )
  );

-- Gamemasters can manage captures
CREATE POLICY "Gamemasters can manage captures"
  ON captures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'gamemaster'
    )
  );

-- All authenticated users can read zones
CREATE POLICY "Authenticated users can read zones"
  ON zones FOR SELECT
  USING (auth.role() = 'authenticated');

-- Gamemasters can manage zones
CREATE POLICY "Gamemasters can manage zones"
  ON zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'gamemaster'
    )
  );

-- All authenticated users can read mission completions
CREATE POLICY "Authenticated users can read mission completions"
  ON mission_completions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can insert their own mission completions
CREATE POLICY "Users can insert their own mission completions"
  ON mission_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Gamemasters can manage mission completions
CREATE POLICY "Gamemasters can manage mission completions"
  ON mission_completions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'gamemaster'
    )
  );

-- Triggers to update updated_at timestamp
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
