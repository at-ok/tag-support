-- Enable PostGIS extension for location-based queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('runner', 'chaser', 'gamemaster')),
  team_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'captured', 'offline')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Player locations table with PostGIS support
CREATE TABLE player_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  accuracy DOUBLE PRECISION,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create spatial index for fast location queries
CREATE INDEX idx_player_locations_location ON player_locations USING GIST(location);
CREATE INDEX idx_player_locations_user_id ON player_locations(user_id);
CREATE INDEX idx_player_locations_timestamp ON player_locations(timestamp DESC);

-- Missions table
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('area_arrival', 'escape', 'rescue')),
  target_latitude DOUBLE PRECISION,
  target_longitude DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION,
  duration_seconds INTEGER,
  points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game state table
CREATE TABLE game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'finished')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to find nearby players using PostGIS
CREATE OR REPLACE FUNCTION nearby_players(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION
)
RETURNS TABLE (
  user_id UUID,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.user_id,
    ST_Distance(
      pl.location,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
    ) AS distance_meters
  FROM player_locations pl
  WHERE ST_DWithin(
    pl.location,
    ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql STABLE;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Users can read all users
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

-- Users can update their own data
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Gamemasters can update any user
CREATE POLICY "Gamemasters can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'gamemaster'
    )
  );

-- Users can insert users (registration)
CREATE POLICY "Anyone can register"
  ON users FOR INSERT
  WITH CHECK (true);

-- All authenticated users can read locations
CREATE POLICY "Authenticated users can read locations"
  ON player_locations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can insert their own locations
CREATE POLICY "Users can insert their own locations"
  ON player_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- All authenticated users can read missions
CREATE POLICY "Authenticated users can read missions"
  ON missions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Gamemasters can manage missions
CREATE POLICY "Gamemasters can manage missions"
  ON missions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'gamemaster'
    )
  );

-- All authenticated users can read game state
CREATE POLICY "Authenticated users can read game state"
  ON game_state FOR SELECT
  USING (auth.role() = 'authenticated');

-- Gamemasters can manage game state
CREATE POLICY "Gamemasters can manage game state"
  ON game_state FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'gamemaster'
    )
  );

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_game_state_updated_at
  BEFORE UPDATE ON game_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
