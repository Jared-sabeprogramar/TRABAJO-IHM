package com.nexus.access.backend;

import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Ensures Flyway remains the schema authority and runs before Hibernate validation. */
@Configuration
public class DatabaseMigrationConfig {
	@Bean(initMethod = "migrate")
	Flyway flyway(DataSource dataSource) {
		return Flyway.configure().dataSource(dataSource).locations("classpath:db/migration")
				.defaultSchema("public").validateOnMigrate(true).baselineOnMigrate(true)
				.baselineVersion("0").load();
	}
	@Bean
	static BeanFactoryPostProcessor flywayBeforeJpa() {
		return factory -> factory.getBeanDefinition("entityManagerFactory").setDependsOn("flyway");
	}
}
