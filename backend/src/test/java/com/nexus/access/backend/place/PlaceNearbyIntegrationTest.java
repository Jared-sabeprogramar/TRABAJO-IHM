package com.nexus.access.backend.place;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.nexus.access.backend.common.LocationDTO;
import com.nexus.access.backend.user.UserRepository;

/** Integration test: it uses the configured PostgreSQL/PostGIS database, never a mock. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PlaceNearbyIntegrationTest {
	@LocalServerPort private int port;
	@Autowired private UserRepository users;
	private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
	private final HttpClient client = HttpClient.newHttpClient();

	@Test
	void nearbyUsesPostgisAndExcludesPlacesOutsideRadius() throws Exception {
		String suffix = java.util.UUID.randomUUID().toString().substring(0, 8);
		com.nexus.access.backend.auth.RegisterRequest register = new com.nexus.access.backend.auth.RegisterRequest("PostGIS", "Admin", "postgis." + suffix + "@example.com", "PasswordSegura123");
		client.send(HttpRequest.newBuilder(URI.create(url("/api/auth/register"))).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(register))).build(), HttpResponse.BodyHandlers.ofString());
		var admin = users.findByEmailIgnoreCase(register.email()).orElseThrow(); admin.setRole("ADMIN"); users.save(admin);
		com.nexus.access.backend.auth.LoginRequest login = new com.nexus.access.backend.auth.LoginRequest(register.email(), register.password());
		String accessToken = objectMapper.readTree(client.send(HttpRequest.newBuilder(URI.create(url("/api/auth/login"))).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(login))).build(), HttpResponse.BodyHandlers.ofString()).body()).get("accessToken").asText();
		CreatePlaceRequest request = new CreatePlaceRequest("PostGIS integration test", null, "Test address", "Lima", "Lima", "PUBLIC", 90, new LocationDTO(-12.0464, -77.0428), true);
		HttpResponse<String> createdResponse = client.send(HttpRequest.newBuilder(URI.create(url("/api/places"))).header("Content-Type", "application/json").header("Authorization", "Bearer " + accessToken).POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(request))).build(), HttpResponse.BodyHandlers.ofString());
		assertEquals(201, createdResponse.statusCode());
		java.util.UUID createdId = java.util.UUID.fromString(objectMapper.readTree(createdResponse.body()).get("id").asText());
		try {
			NearbyPlaceResponseDTO[] nearby = objectMapper.readValue(client.send(HttpRequest.newBuilder(URI.create(url("/api/places/nearby?latitude=-12.0465&longitude=-77.0429&radius=1000"))).header("Authorization", "Bearer " + accessToken).GET().build(), HttpResponse.BodyHandlers.ofString()).body(), NearbyPlaceResponseDTO[].class);
			assertTrue(Arrays.stream(nearby).anyMatch(p -> p.id().equals(createdId) && p.distanceMeters() > 0 && p.distanceMeters() < 1000));
			NearbyPlaceResponseDTO[] outside = objectMapper.readValue(client.send(HttpRequest.newBuilder(URI.create(url("/api/places/nearby?latitude=-12.0465&longitude=-77.0429&radius=1"))).header("Authorization", "Bearer " + accessToken).GET().build(), HttpResponse.BodyHandlers.ofString()).body(), NearbyPlaceResponseDTO[].class);
			assertFalse(Arrays.stream(outside).anyMatch(p -> p.id().equals(createdId)));
		} finally { client.send(HttpRequest.newBuilder(URI.create(url("/api/places/" + createdId))).DELETE().build(), HttpResponse.BodyHandlers.discarding()); }
	}
	private String url(String path) { return "http://localhost:" + port + path; }
}
