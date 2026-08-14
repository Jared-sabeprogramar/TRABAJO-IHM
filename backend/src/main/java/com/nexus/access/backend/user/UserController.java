package com.nexus.access.backend.user;
import java.util.UUID; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/users")
public class UserController { private final UserService service; public UserController(UserService service){this.service=service;} @GetMapping("/{id}") @PreAuthorize("#id.toString() == authentication.name") public UserResponseDTO get(@PathVariable UUID id){return service.get(id);} }
