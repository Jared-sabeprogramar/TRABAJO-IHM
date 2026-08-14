package com.nexus.access.backend;

import java.util.Map;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

	private final JdbcTemplate jdbcTemplate;

	public HealthController(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<Map<String, String>> health() {
		String databaseStatus = "UP";

		try {
			Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
			if (result == null || result != 1) {
				databaseStatus = "DOWN";
			}
		} catch (DataAccessException ex) {
			databaseStatus = "DOWN";
		}

		return ResponseEntity.ok(Map.of(
				"status", "UP",
				"application", "NEXUS ACCESS",
				"database", databaseStatus
		));
	}
}