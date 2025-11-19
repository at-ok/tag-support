-- Location history table for tracking player movements over time
CREATE TABLE location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES game_state(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  speed DOUBLE PRECISION, -- meters per second
  heading DOUBLE PRECISION, -- degrees (0-360)
  accuracy DOUBLE PRECISION, -- meters
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_location_history_user_id ON location_history(user_id);
CREATE INDEX idx_location_history_game_id ON location_history(game_id);
CREATE INDEX idx_location_history_timestamp ON location_history(timestamp DESC);
CREATE INDEX idx_location_history_location ON location_history USING GIST(location);

-- Composite index for user+game queries
CREATE INDEX idx_location_history_user_game ON location_history(user_id, game_id, timestamp DESC);

-- Function to get location history statistics for a user
CREATE OR REPLACE FUNCTION get_location_stats(
  target_user_id UUID,
  target_game_id UUID DEFAULT NULL,
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_distance_meters DOUBLE PRECISION,
  average_speed_mps DOUBLE PRECISION,
  max_speed_mps DOUBLE PRECISION,
  duration_seconds INTEGER,
  point_count BIGINT
) AS $$
DECLARE
  history_records RECORD;
  prev_record RECORD;
  total_dist DOUBLE PRECISION := 0;
  speed_sum DOUBLE PRECISION := 0;
  speed_count INTEGER := 0;
  max_spd DOUBLE PRECISION := 0;
  first_ts TIMESTAMPTZ;
  last_ts TIMESTAMPTZ;
BEGIN
  -- Initialize variables
  prev_record := NULL;
  first_ts := NULL;
  last_ts := NULL;

  -- Iterate through location history
  FOR history_records IN
    SELECT
      latitude,
      longitude,
      speed,
      timestamp,
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography AS loc
    FROM location_history
    WHERE user_id = target_user_id
      AND (target_game_id IS NULL OR game_id = target_game_id)
      AND (start_time IS NULL OR timestamp >= start_time)
      AND (end_time IS NULL OR timestamp <= end_time)
    ORDER BY timestamp ASC
  LOOP
    -- Track first and last timestamps
    IF first_ts IS NULL THEN
      first_ts := history_records.timestamp;
    END IF;
    last_ts := history_records.timestamp;

    -- Calculate distance if we have a previous point
    IF prev_record IS NOT NULL THEN
      total_dist := total_dist + ST_Distance(prev_record.loc, history_records.loc);
    END IF;

    -- Track speed statistics
    IF history_records.speed IS NOT NULL THEN
      speed_sum := speed_sum + history_records.speed;
      speed_count := speed_count + 1;
      max_spd := GREATEST(max_spd, history_records.speed);
    END IF;

    prev_record := history_records;
  END LOOP;

  -- Return statistics
  RETURN QUERY SELECT
    total_dist,
    CASE WHEN speed_count > 0 THEN speed_sum / speed_count ELSE 0 END,
    max_spd,
    CASE WHEN first_ts IS NOT NULL AND last_ts IS NOT NULL
         THEN EXTRACT(EPOCH FROM (last_ts - first_ts))::INTEGER
         ELSE 0 END,
    (SELECT COUNT(*) FROM location_history
     WHERE user_id = target_user_id
       AND (target_game_id IS NULL OR game_id = target_game_id)
       AND (start_time IS NULL OR timestamp >= start_time)
       AND (end_time IS NULL OR timestamp <= end_time))::BIGINT;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get recent path for replay
CREATE OR REPLACE FUNCTION get_location_path(
  target_user_id UUID,
  target_game_id UUID DEFAULT NULL,
  limit_points INTEGER DEFAULT 1000
)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lh.latitude,
    lh.longitude,
    lh.speed,
    lh.heading,
    lh.timestamp
  FROM location_history lh
  WHERE lh.user_id = target_user_id
    AND (target_game_id IS NULL OR lh.game_id = target_game_id)
  ORDER BY lh.timestamp DESC
  LIMIT limit_points;
END;
$$ LANGUAGE plpgsql STABLE;

-- Row Level Security (RLS) policies
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read location history
CREATE POLICY "Authenticated users can read location history"
  ON location_history FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can insert their own location history
CREATE POLICY "Users can insert their own location history"
  ON location_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Gamemasters can manage all location history
CREATE POLICY "Gamemasters can manage location history"
  ON location_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'gamemaster'
    )
  );

-- Auto-cleanup old location history (optional, keep last 30 days)
-- Uncomment if you want automatic cleanup
-- CREATE OR REPLACE FUNCTION cleanup_old_location_history()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM location_history
--   WHERE timestamp < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;
