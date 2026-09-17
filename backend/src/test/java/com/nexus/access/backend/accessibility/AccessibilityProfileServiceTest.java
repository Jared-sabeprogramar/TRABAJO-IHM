package com.nexus.access.backend.accessibility;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.nexus.access.backend.exception.ResourceNotFoundException;
import com.nexus.access.backend.user.User;
import com.nexus.access.backend.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class AccessibilityProfileServiceTest {
	@Mock private AccessibilityProfileRepository profiles;
	@Mock private UserRepository users;
	private AccessibilityProfileService service;
	@BeforeEach void setUp() { service = new AccessibilityProfileService(profiles, users); }

	@Test void getsExistingProfile() {
		UUID userId = UUID.randomUUID(); AccessibilityProfile profile = profile(userId);
		when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));
		AccessibilityProfileResponseDTO result = service.get(userId);
		assertEquals(userId, result.userId()); assertTrue(result.wheelchair());
	}
	@Test void failsForMissingProfile() {
		UUID userId = UUID.randomUUID(); when(profiles.findByUserId(userId)).thenReturn(Optional.empty());
		assertThrows(ResourceNotFoundException.class, () -> service.get(userId));
	}
	@Test void createsProfileForExistingUser() {
		UUID userId = UUID.randomUUID(); User user = user(userId);
		when(profiles.findByUserId(userId)).thenReturn(Optional.empty()); when(users.findById(userId)).thenReturn(Optional.of(user)); when(profiles.save(any())).thenAnswer(i -> i.getArgument(0));
		AccessibilityProfileResponseDTO result = service.update(userId, new UpdateAccessibilityProfileRequest(true, true, false, false, false, true, true, false, false));
		assertEquals(userId, result.userId()); assertTrue(result.mobilityReduced()); assertTrue(result.highContrast()); verify(profiles).save(any(AccessibilityProfile.class));
	}
	@Test void updatesExistingProfileWithoutLookingUpUser() {
		UUID userId = UUID.randomUUID(); AccessibilityProfile profile = profile(userId);
		when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile)); when(profiles.save(profile)).thenReturn(profile);
		AccessibilityProfileResponseDTO result = service.update(userId, new UpdateAccessibilityProfileRequest(false, false, true, true, true, false, false, true, true));
		assertTrue(result.visualImpairment()); assertTrue(result.simplifiedMode()); verifyNoInteractions(users);
	}
	@Test void failsCreatingProfileForMissingUser() {
		UUID userId = UUID.randomUUID(); when(profiles.findByUserId(userId)).thenReturn(Optional.empty()); when(users.findById(userId)).thenReturn(Optional.empty());
		assertThrows(ResourceNotFoundException.class, () -> service.update(userId, new UpdateAccessibilityProfileRequest(false,false,false,false,false,false,false,false,false)));
		verify(profiles, never()).save(any());
	}
	private AccessibilityProfile profile(UUID userId) { AccessibilityProfile profile = new AccessibilityProfile(); profile.setUser(user(userId)); profile.setWheelchair(true); return profile; }
	private User user(UUID id) { User user = new User(); try { var field = User.class.getDeclaredField("id"); field.setAccessible(true); field.set(user, id); } catch (ReflectiveOperationException ex) { throw new RuntimeException(ex); } return user; }
}
