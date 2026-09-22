package com.ticket.config;

import com.ticket.security.WaitingRoomInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final WaitingRoomInterceptor waitingRoomInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(waitingRoomInterceptor)
                .addPathPatterns(
                        "/api/orders/hold",
                        "/api/orders/confirm",
                        "/api/payments/process"
                );
    }
}
