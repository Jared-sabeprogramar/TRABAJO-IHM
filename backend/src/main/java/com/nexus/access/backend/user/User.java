package com.nexus.access.backend.user;

import java.time.OffsetDateTime;
import java.util.UUID;
import jakarta.persistence.*;
import com.nexus.access.backend.accessibility.AccessibilityProfile;

@Entity @Table(name = "users")
public class User {
	@Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
	@Column(name="first_name", nullable=false, length=100) private String firstName;
	@Column(name="last_name", nullable=false, length=100) private String lastName;
	@Column(nullable=false, unique=true, length=255) private String email;
	@Column(name="password_hash", nullable=false, length=255) private String passwordHash;
	@Column(nullable=false, length=20) private String role;
	@Column(name="is_active", nullable=false) private boolean active = true;
	@Column(name="created_at", nullable=false, updatable=false) private OffsetDateTime createdAt;
	@Column(name="updated_at", nullable=false) private OffsetDateTime updatedAt;
	@OneToOne(mappedBy="user", fetch=FetchType.LAZY) private AccessibilityProfile accessibilityProfile;
	@PrePersist void created() { createdAt=OffsetDateTime.now(); updatedAt=createdAt; }
	@PreUpdate void updated() { updatedAt=OffsetDateTime.now(); }
	public UUID getId(){return id;} public String getFirstName(){return firstName;} public void setFirstName(String v){firstName=v;} public String getLastName(){return lastName;} public void setLastName(String v){lastName=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;} public String getPasswordHash(){return passwordHash;} public void setPasswordHash(String v){passwordHash=v;} public String getRole(){return role;} public void setRole(String v){role=v;} public boolean isActive(){return active;} public void setActive(boolean v){active=v;} public OffsetDateTime getCreatedAt(){return createdAt;} public OffsetDateTime getUpdatedAt(){return updatedAt;}
}
