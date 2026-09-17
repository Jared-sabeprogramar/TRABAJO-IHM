INSERT INTO accessibility_features (code, name, description, category)
VALUES
	('RAMP', 'Ramp', 'Physical ramp that improves step-free access.', 'ACCESS_ENTRY'),
	('ELEVATOR', 'Elevator', 'Vertical transport that supports access between floors.', 'VERTICAL_ACCESS'),
	('ACCESSIBLE_BATHROOM', 'Accessible bathroom', 'Bathroom adapted for accessibility needs.', 'RESTROOMS'),
	('ACCESSIBLE_PARKING', 'Accessible parking', 'Parking space adapted for accessibility needs.', 'PARKING'),
	('VISUAL_SIGNAGE', 'Visual signage', 'Signage optimized for visual readability.', 'SIGNAGE'),
	('AUDIO_SIGNAGE', 'Audio signage', 'Audible informational signage.', 'SIGNAGE'),
	('TACTILE_PAVEMENT', 'Tactile pavement', 'Guiding tactile surface for orientation.', 'SURFACES'),
	('AUTOMATIC_DOOR', 'Automatic door', 'Door that opens automatically.', 'ENTRY'),
	('ACCESSIBLE_ENTRANCE', 'Accessible entrance', 'Entrance usable without accessibility barriers.', 'ENTRY'),
	('BRAILLE', 'Braille', 'Braille support for tactile reading.', 'SIGNAGE')
ON CONFLICT (code) DO NOTHING;