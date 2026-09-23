package com.ticket.service;

import com.ticket.exception.InvalidTokenException;
import com.ticket.model.dto.AuthRequest;
import com.ticket.model.dto.AuthResponse;
import com.ticket.model.dto.RegisterRequest;
import com.ticket.model.entity.User;
import com.ticket.model.enums.UserRole;
import com.ticket.repository.UserRepository;
import com.ticket.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final ActivityLogService activityLogService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("User with email " + request.getEmail() + " already exists.");
        }

        String userName = request.getName() != null && !request.getName().isBlank() ? request.getName().trim() : null;
        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .name(userName)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.ROLE_USER)
                .createdAt(Instant.now())
                .build();

        User savedUser = userRepository.save(user);
        String token = jwtProvider.generateAuthToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole().name());

        activityLogService.recordActivity(
                savedUser.getId(),
                savedUser.getEmail(),
                "USER_REGISTER",
                "New account created for " + savedUser.getDisplayName() + " with role " + savedUser.getRole().name(),
                "SUCCESS",
                null
        );

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .name(savedUser.getDisplayName())
                .role(savedUser.getRole().name())
                .build();
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new InvalidTokenException("Invalid email or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            activityLogService.recordActivity(
                    user.getId(),
                    user.getEmail(),
                    "LOGIN_FAILED",
                    "Failed login attempt: Invalid password",
                    "FAILED",
                    null
            );
            throw new InvalidTokenException("Invalid email or password.");
        }

        String token = jwtProvider.generateAuthToken(user.getId(), user.getEmail(), user.getRole().name());

        activityLogService.recordActivity(
                user.getId(),
                user.getEmail(),
                "USER_LOGIN",
                "User successfully authenticated as " + user.getRole().name(),
                "SUCCESS",
                null
        );

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .name(user.getDisplayName())
                .role(user.getRole().name())
                .build();
    }
}
