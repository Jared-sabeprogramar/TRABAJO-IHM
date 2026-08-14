package com.nexus.access.backend.accessibility;
public record UpdateAccessibilityProfileRequest(boolean mobilityReduced, boolean wheelchair, boolean visualImpairment, boolean hearingImpairment, boolean cognitiveSupport, boolean highContrast, boolean largeText, boolean voiceNavigation, boolean simplifiedMode) { }
