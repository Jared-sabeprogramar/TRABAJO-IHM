package com.nexus.access.backend.accessibility;
import java.time.OffsetDateTime; import java.util.UUID;
public record AccessibilityProfileResponseDTO(UUID id, UUID userId, boolean mobilityReduced, boolean wheelchair, boolean visualImpairment, boolean hearingImpairment, boolean cognitiveSupport, boolean highContrast, boolean largeText, boolean voiceNavigation, boolean simplifiedMode, OffsetDateTime createdAt, OffsetDateTime updatedAt) { }
