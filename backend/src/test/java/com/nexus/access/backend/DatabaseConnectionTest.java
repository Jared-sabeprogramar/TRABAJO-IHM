package com.nexus.access.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class DatabaseConnectionTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void postgresRespondsToSelectOne() {
		Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
		assertEquals(1, result);
	}

	@Test
	void postgisVersionIsAvailable() {
		String version = jdbcTemplate.queryForObject("SELECT PostGIS_Version()", String.class);
		assertNotNull(version);
		assertTrue(version.startsWith("3.5"));
	}

	@Test
	void postgisCanCalculateDistances() {
		Double distance = jdbcTemplate.queryForObject("""
			SELECT ST_Distance(
				'SRID=4326;POINT(-58.3816 -34.6037)'::geography,
				'SRID=4326;POINT(-58.3810 -34.6030)'::geography
			)
			""", Double.class);

		Boolean withinRadius = jdbcTemplate.queryForObject("""
			SELECT ST_DWithin(
				'SRID=4326;POINT(-58.3816 -34.6037)'::geography,
				'SRID=4326;POINT(-58.3810 -34.6030)'::geography,
				200
			)
			""", Boolean.class);

		assertNotNull(distance);
		assertTrue(distance > 0);
		assertEquals(Boolean.TRUE, withinRadius);
	}
}