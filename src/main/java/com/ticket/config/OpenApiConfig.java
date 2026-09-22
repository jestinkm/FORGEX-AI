package com.ticket.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("High-Concurrency Flash-Sale Ticket Booking API")
                        .version("1.0.0")
                        .description("Production-grade backend built with Java 21, Spring Boot 3, Redis, and PostgreSQL. " +
                                "Engineered to support 500K+ registered users and 100K+ concurrent flash-sale checkout sessions.")
                        .contact(new Contact().name("TicketFlow Core Engineering").email("dev@ticketflow.com")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth").addList("AdmissionTokenAuth"))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth",
                                new SecurityScheme()
                                        .name("Authorization")
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Enter your JWT token obtained from /api/auth/login"))
                        .addSecuritySchemes("AdmissionTokenAuth",
                                new SecurityScheme()
                                        .name("X-Admission-Token")
                                        .type(SecurityScheme.Type.APIKEY)
                                        .in(SecurityScheme.In.HEADER)
                                        .description("Short-lived admission token issued by Virtual Waiting Room")));
    }
}
