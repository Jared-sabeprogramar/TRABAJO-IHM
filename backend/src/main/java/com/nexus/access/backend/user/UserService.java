package com.nexus.access.backend.user;
import java.util.UUID; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import com.nexus.access.backend.exception.*;
@Service @Transactional
public class UserService {
	private final UserRepository repository; public UserService(UserRepository repository){this.repository=repository;}
	@Transactional(readOnly=true) public UserResponseDTO get(UUID id){return dto(find(id));}
	public UserResponseDTO create(CreateUserRequest request){ if(repository.existsByEmailIgnoreCase(request.email())) throw new DuplicateResourceException("Email already exists"); User u=new User(); u.setFirstName(request.firstName());u.setLastName(request.lastName());u.setEmail(request.email());u.setPasswordHash(request.passwordHash());u.setRole(request.role()); return dto(repository.save(u)); }
	public UserResponseDTO update(UUID id, UpdateUserRequest r){User u=find(id); if(!u.getEmail().equalsIgnoreCase(r.email()) && repository.existsByEmailIgnoreCase(r.email())) throw new DuplicateResourceException("Email already exists");u.setFirstName(r.firstName());u.setLastName(r.lastName());u.setEmail(r.email());u.setRole(r.role());u.setActive(r.active());return dto(u);}
	private User find(UUID id){return repository.findById(id).orElseThrow(()->new ResourceNotFoundException("User not found: "+id));}
	private UserResponseDTO dto(User u){return new UserResponseDTO(u.getId(),u.getFirstName(),u.getLastName(),u.getEmail(),u.getRole(),u.isActive(),u.getCreatedAt(),u.getUpdatedAt());}
}
