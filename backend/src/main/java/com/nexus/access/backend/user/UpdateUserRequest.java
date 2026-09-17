package com.nexus.access.backend.user;
import jakarta.validation.constraints.*;
public record UpdateUserRequest(@NotBlank @Size(max=100) String firstName, @NotBlank @Size(max=100) String lastName, @NotBlank @Email @Size(max=255) String email, @NotBlank @Pattern(regexp="USER|ADMIN|MUNICIPALITY") String role, boolean active) { }
