package com.nexus.access.backend.auth; public record LoginResponse(String accessToken,String refreshToken,String tokenType,long expiresIn){}
