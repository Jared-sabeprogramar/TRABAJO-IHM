package com.nexus.access.backend.auth; import jakarta.validation.constraints.NotBlank; public record RefreshTokenRequest(@NotBlank String refreshToken){}
