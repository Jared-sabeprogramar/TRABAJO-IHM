package com.nexus.access.backend.accessibility;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface AccessibilityProfileRepository extends JpaRepository<AccessibilityProfile,UUID>{ Optional<AccessibilityProfile> findByUserId(UUID userId); }
