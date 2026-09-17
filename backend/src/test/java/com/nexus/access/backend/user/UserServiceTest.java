package com.nexus.access.backend.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.nexus.access.backend.exception.DuplicateResourceException;
import com.nexus.access.backend.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
	@Mock private UserRepository repository;
	private UserService service;
	@BeforeEach void setUp() { service = new UserService(repository); }

	@Test void getsExistingUser() {
		UUID id = UUID.randomUUID(); User user = user("ana@nexus.pe");
		when(repository.findById(id)).thenReturn(Optional.of(user));
		UserResponseDTO result = service.get(id);
		assertEquals("Ana", result.firstName()); assertEquals("ana@nexus.pe", result.email());
	}
	@Test void failsForMissingUser() {
		UUID id = UUID.randomUUID(); when(repository.findById(id)).thenReturn(Optional.empty());
		assertThrows(ResourceNotFoundException.class, () -> service.get(id));
	}
	@Test void createsUserWhenEmailIsAvailable() {
		CreateUserRequest request = new CreateUserRequest("Ana", "Lopez", "ana@nexus.pe", "temporary-hash", "USER");
		when(repository.existsByEmailIgnoreCase(request.email())).thenReturn(false);
		when(repository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
		UserResponseDTO result = service.create(request);
		ArgumentCaptor<User> captured = ArgumentCaptor.forClass(User.class); verify(repository).save(captured.capture());
		assertEquals("Ana", result.firstName()); assertEquals("temporary-hash", captured.getValue().getPasswordHash()); assertEquals("USER", captured.getValue().getRole());
	}
	@Test void rejectsDuplicateEmailOnCreate() {
		CreateUserRequest request = new CreateUserRequest("Ana", "Lopez", "ana@nexus.pe", "hash", "USER");
		when(repository.existsByEmailIgnoreCase(request.email())).thenReturn(true);
		assertThrows(DuplicateResourceException.class, () -> service.create(request)); verify(repository, never()).save(any());
	}
	@Test void updatesExistingUserAndRejectsChangedDuplicateEmail() {
		UUID id = UUID.randomUUID(); User user = user("old@nexus.pe");
		UpdateUserRequest request = new UpdateUserRequest("Ana Maria", "Perez", "new@nexus.pe", "ADMIN", false);
		when(repository.findById(id)).thenReturn(Optional.of(user)); when(repository.existsByEmailIgnoreCase("new@nexus.pe")).thenReturn(false);
		UserResponseDTO updated = service.update(id, request);
		assertEquals("Ana Maria", updated.firstName()); assertEquals("new@nexus.pe", updated.email()); assertFalse(updated.active());
		when(repository.existsByEmailIgnoreCase("taken@nexus.pe")).thenReturn(true);
		assertThrows(DuplicateResourceException.class, () -> service.update(id, new UpdateUserRequest("Ana", "Perez", "taken@nexus.pe", "USER", true)));
	}
	private User user(String email) { User user = new User(); user.setFirstName("Ana"); user.setLastName("Lopez"); user.setEmail(email); user.setPasswordHash("hash"); user.setRole("USER"); return user; }
}
