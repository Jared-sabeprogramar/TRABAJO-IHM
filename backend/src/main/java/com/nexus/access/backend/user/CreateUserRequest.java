package com.nexus.access.backend.user;
import jakarta.validation.constraints.*;
public record CreateUserRequest(@NotBlank @Size(max=100) String firstName, @NotBlank @Size(max=100) String lastName, @NotBlank @Email @Size(max=255) String email, @NotBlank @Size(max=255) String passwordHash, @NotBlank @Pattern(regexp="USER|ADMIN|MUNICIPALITY") String role) { }
