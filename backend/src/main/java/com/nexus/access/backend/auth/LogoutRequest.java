package com.nexus.access.backend.auth; import jakarta.validation.constraints.NotBlank; public record LogoutRequest(@NotBlank String refreshToken){}
