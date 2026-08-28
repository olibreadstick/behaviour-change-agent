package com.behaviourchange.backend.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class DatabaseConfig {

    private final Environment environment;
    private final DataSourceProperties localProperties;

    public DatabaseConfig(
            Environment environment,
            DataSourceProperties localProperties) {

        this.environment = environment;
        this.localProperties = localProperties;
    }

    @Bean
    @Primary
    public DataSource dataSource() {

        String databaseUrl = environment.getProperty("DATABASE_URL");

        if (databaseUrl == null || databaseUrl.isBlank()) {
            return localProperties
                    .initializeDataSourceBuilder()
                    .type(HikariDataSource.class)
                    .build();
        }

        URI uri = URI.create(databaseUrl);
        String rawUserInfo = uri.getRawUserInfo();

        if (rawUserInfo == null || !rawUserInfo.contains(":")) {
            throw new IllegalStateException(
                    "DATABASE_URL does not contain database credentials."
            );
        }

        String[] credentials = rawUserInfo.split(":", 2);

        String username = URLDecoder.decode(
                credentials[0],
                StandardCharsets.UTF_8
        );

        String password = URLDecoder.decode(
                credentials[1],
                StandardCharsets.UTF_8
        );

        int port = uri.getPort() == -1 ? 5432 : uri.getPort();
        String databasePath = uri.getPath();

        if (databasePath == null || databasePath.isBlank()) {
            throw new IllegalStateException(
                    "DATABASE_URL does not contain a database name."
            );
        }

        String jdbcUrl = String.format(
                "jdbc:postgresql://%s:%d%s?sslmode=require",
                uri.getHost(),
                port,
                databasePath
        );

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(jdbcUrl);
        dataSource.setUsername(username);
        dataSource.setPassword(password);

        // Do not block the Vercel cold start while Hikari performs its
        // initial connectivity check. The first real database operation
        // will establish a connection when needed.
        dataSource.setInitializationFailTimeout(-1);
        dataSource.setMinimumIdle(0);
        dataSource.setMaximumPoolSize(4);
        dataSource.setConnectionTimeout(5000);

        return dataSource;
    }
}
