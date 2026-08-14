package com.nexus.access.backend.user;
import java.time.OffsetDateTime; import java.util.UUID;
public record UserResponseDTO(UUID id, String firstName, String lastName, String email, String role, boolean active, OffsetDateTime createdAt, OffsetDateTime updatedAt) { }
