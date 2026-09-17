package com.nexus.access.backend.user;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface UserRepository extends JpaRepository<User, UUID> { boolean existsByEmailIgnoreCase(String email); Optional<User> findByEmailIgnoreCase(String email); }
