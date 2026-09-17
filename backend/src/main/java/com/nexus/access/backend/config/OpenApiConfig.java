package com.nexus.access.backend.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
	@Bean
	GroupedOpenApi nexusAccessApi() {
		return GroupedOpenApi.builder().group("nexus-access").pathsToMatch("/api/**").build();
	}
}
