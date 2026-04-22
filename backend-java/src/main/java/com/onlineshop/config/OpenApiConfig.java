package com.onlineshop.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        Server relative = new Server().url("/").description("Current host");
        return new OpenAPI()
                .servers(List.of(relative))
                .info(new Info()
                        .title("Online Shop Java API")
                        .version("1.0.0")
                        .description("Spring Boot port of the Go backend"));
    }
}
