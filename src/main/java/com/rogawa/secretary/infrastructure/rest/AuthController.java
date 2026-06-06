package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.domain.model.User;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.infrastructure.rest.dto.AuthResponse;
import com.rogawa.secretary.infrastructure.rest.dto.LoginRequest;
import com.rogawa.secretary.infrastructure.rest.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** ユーザー登録 */
    @PostMapping("/api/v1/auth/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());
        User saved = userRepository.save(user);
        AuthResponse res = new AuthResponse(
                saved.getId(), saved.getUsername(), saved.getDisplayName());
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    /** ログイン */
    @PostMapping("/api/v1/auth/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(), request.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // セキュリティコンテキストをセッションに保存
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext());

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow();
        AuthResponse res = new AuthResponse(
                user.getId(), user.getUsername(), user.getDisplayName());
        return ResponseEntity.ok(res);
    }

    /** 現在のユーザー情報を取得 */
    @GetMapping("/api/v1/auth/me")
    public ResponseEntity<AuthResponse> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow();
        AuthResponse res = new AuthResponse(
                user.getId(), user.getUsername(), user.getDisplayName());
        return ResponseEntity.ok(res);
    }

    /** ログアウト */
    @PostMapping("/api/v1/auth/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok().build();
    }
}
