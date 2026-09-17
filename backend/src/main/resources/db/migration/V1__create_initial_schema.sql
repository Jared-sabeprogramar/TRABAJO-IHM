CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$;

CREATE TABLE users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	first_name VARCHAR(100) NOT NULL,
	last_name VARCHAR(100) NOT NULL,
	email VARCHAR(255) NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	role VARCHAR(20) NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_users_email UNIQUE (email),
	CONSTRAINT ck_users_role CHECK (role IN ('USER', 'ADMIN', 'MUNICIPALITY'))
);

CREATE TABLE accessibility_profiles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL,
	mobility_reduced BOOLEAN NOT NULL DEFAULT FALSE,
	wheelchair BOOLEAN NOT NULL DEFAULT FALSE,
	visual_impairment BOOLEAN NOT NULL DEFAULT FALSE,
	hearing_impairment BOOLEAN NOT NULL DEFAULT FALSE,
	cognitive_support BOOLEAN NOT NULL DEFAULT FALSE,
	high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
	large_text BOOLEAN NOT NULL DEFAULT FALSE,
	voice_navigation BOOLEAN NOT NULL DEFAULT FALSE,
	simplified_mode BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_accessibility_profiles_user UNIQUE (user_id),
	CONSTRAINT fk_accessibility_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE places (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(200) NOT NULL,
	description TEXT,
	address VARCHAR(255),
	city VARCHAR(120),
	district VARCHAR(120),
	place_type VARCHAR(80) NOT NULL,
	accessibility_score INTEGER NOT NULL DEFAULT 0,
	location GEOGRAPHY(Point, 4326) NOT NULL,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT ck_places_accessibility_score CHECK (accessibility_score BETWEEN 0 AND 100)
);

CREATE TABLE accessibility_features (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	code VARCHAR(100) NOT NULL,
	name VARCHAR(150) NOT NULL,
	description TEXT,
	category VARCHAR(100) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_accessibility_features_code UNIQUE (code)
);

CREATE TABLE place_accessibility_features (
	place_id UUID NOT NULL,
	feature_id UUID NOT NULL,
	status VARCHAR(20) NOT NULL,
	notes TEXT,
	PRIMARY KEY (place_id, feature_id),
	CONSTRAINT fk_place_accessibility_features_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE,
	CONSTRAINT fk_place_accessibility_features_feature FOREIGN KEY (feature_id) REFERENCES accessibility_features (id) ON DELETE CASCADE,
	CONSTRAINT ck_place_accessibility_features_status CHECK (status IN ('AVAILABLE', 'PARTIAL', 'UNAVAILABLE', 'UNKNOWN'))
);

CREATE TABLE reports (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL,
	place_id UUID NULL,
	category VARCHAR(80) NOT NULL,
	description TEXT NOT NULL,
	severity VARCHAR(20) NOT NULL,
	status VARCHAR(20) NOT NULL,
	location GEOGRAPHY(Point, 4326) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	resolved_at TIMESTAMPTZ NULL,
	CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
	CONSTRAINT fk_reports_place FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE SET NULL,
	CONSTRAINT ck_reports_category CHECK (category IN ('RAMP_BLOCKED', 'SIDEWALK_BLOCKED', 'STAIRS', 'ELEVATOR_OUT_OF_SERVICE', 'POOR_SIGNAGE', 'OBSTACLE', 'INACCESSIBLE_TRAFFIC_LIGHT', 'BLOCKED_PARKING', 'INACCESSIBLE_BATHROOM', 'OTHER')),
	CONSTRAINT ck_reports_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
	CONSTRAINT ck_reports_status CHECK (status IN ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'RESOLVED'))
);

CREATE TABLE report_images (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	report_id UUID NOT NULL,
	storage_key VARCHAR(512) NOT NULL,
	original_filename VARCHAR(255) NOT NULL,
	mime_type VARCHAR(100) NOT NULL,
	file_size BIGINT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_report_images_storage_key UNIQUE (storage_key),
	CONSTRAINT fk_report_images_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
	CONSTRAINT ck_report_images_file_size CHECK (file_size >= 0)
);

CREATE TABLE ai_analyses (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	report_id UUID NOT NULL,
	image_id UUID NULL,
	provider VARCHAR(100) NOT NULL,
	model VARCHAR(150) NOT NULL,
	description TEXT,
	accessibility_impact TEXT,
	confidence NUMERIC(4,3) NOT NULL,
	raw_result JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT fk_ai_analyses_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
	CONSTRAINT fk_ai_analyses_image FOREIGN KEY (image_id) REFERENCES report_images (id) ON DELETE SET NULL,
	CONSTRAINT ck_ai_analyses_confidence CHECK (confidence BETWEEN 0 AND 1)
);

CREATE TABLE routes (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL,
	origin GEOGRAPHY(Point, 4326) NOT NULL,
	destination GEOGRAPHY(Point, 4326) NOT NULL,
	distance_meters NUMERIC(12,2) NOT NULL,
	duration_seconds INTEGER NOT NULL,
	accessibility_score INTEGER NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT fk_routes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
	CONSTRAINT ck_routes_distance_meters CHECK (distance_meters >= 0),
	CONSTRAINT ck_routes_duration_seconds CHECK (duration_seconds >= 0),
	CONSTRAINT ck_routes_accessibility_score CHECK (accessibility_score BETWEEN 0 AND 100)
);

CREATE TABLE route_obstacles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	route_id UUID NOT NULL,
	report_id UUID NULL,
	obstacle_type VARCHAR(100) NOT NULL,
	severity VARCHAR(20) NOT NULL,
	location GEOGRAPHY(Point, 4326) NOT NULL,
	description TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT fk_route_obstacles_route FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE,
	CONSTRAINT fk_route_obstacles_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE SET NULL,
	CONSTRAINT ck_route_obstacles_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE TABLE notifications (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL,
	title VARCHAR(200) NOT NULL,
	message TEXT NOT NULL,
	type VARCHAR(50) NOT NULL,
	is_read BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	read_at TIMESTAMPTZ NULL,
	CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_reports_user_id ON reports (user_id);
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_severity ON reports (severity);
CREATE INDEX idx_reports_created_at ON reports (created_at);
CREATE INDEX idx_reports_location ON reports USING GIST (location);
CREATE INDEX idx_places_location ON places USING GIST (location);
CREATE INDEX idx_routes_origin ON routes USING GIST (origin);
CREATE INDEX idx_routes_destination ON routes USING GIST (destination);
CREATE INDEX idx_route_obstacles_location ON route_obstacles USING GIST (location);
CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER trg_accessibility_profiles_updated_at
BEFORE UPDATE ON accessibility_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER trg_places_updated_at
BEFORE UPDATE ON places
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();