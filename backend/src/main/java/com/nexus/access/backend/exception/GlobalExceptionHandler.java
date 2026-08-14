package com.nexus.access.backend.exception;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
	@ExceptionHandler(ResourceNotFoundException.class)
	ResponseEntity<Map<String, Object>> notFound(ResourceNotFoundException ex, HttpServletRequest request) { return error(HttpStatus.NOT_FOUND, ex.getMessage(), request); }
	@ExceptionHandler(DuplicateResourceException.class)
	ResponseEntity<Map<String, Object>> duplicate(DuplicateResourceException ex, HttpServletRequest request) { return error(HttpStatus.CONFLICT, ex.getMessage(), request); }
	@ExceptionHandler(InvalidCredentialsException.class)
	ResponseEntity<Map<String, Object>> credentials(InvalidCredentialsException ex, HttpServletRequest request) { return error(HttpStatus.UNAUTHORIZED, ex.getMessage(), request); }
	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException ex, HttpServletRequest request) {
		String message = ex.getBindingResult().getFieldErrors().stream().findFirst().map(e -> e.getField() + ": " + e.getDefaultMessage()).orElse("Invalid request data");
		return error(HttpStatus.BAD_REQUEST, message, request);
	}
	private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message, HttpServletRequest request) {
		Map<String, Object> body = new LinkedHashMap<>(); body.put("timestamp", OffsetDateTime.now()); body.put("status", status.value()); body.put("error", status.getReasonPhrase()); body.put("message", message); body.put("path", request.getRequestURI());
		return ResponseEntity.status(status).body(body);
	}
}
