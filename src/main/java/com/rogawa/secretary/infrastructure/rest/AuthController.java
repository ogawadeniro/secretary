package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.domain.model.PasswordResetToken;
import com.rogawa.secretary.domain.model.User;
import com.rogawa.secretary.domain.repository.PasswordResetTokenRepository;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.infrastructure.rest.dto.AuthResponse;
import com.rogawa.secretary.infrastructure.rest.dto.ChangePasswordRequest;
import com.rogawa.secretary.infrastructure.rest.dto.LoginRequest;
import com.rogawa.secretary.infrastructure.rest.dto.RegisterRequest;
import com.rogawa.secretary.infrastructure.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    public AuthController(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            PasswordResetTokenRepository tokenRepository,
            EmailService emailService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
    }

    /** ユーザー登録 */
    @PostMapping("/api/v1/auth/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        if (request.getEmail() != null && userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setDisplayName(request.getDisplayName());
        user.setEmail(request.getEmail());
        User saved = userRepository.save(user);
        AuthResponse res = new AuthResponse(
                saved.getId(), saved.getUsername(), saved.getDisplayName());
        res.setEmail(saved.getEmail());
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
        res.setEmail(user.getEmail());
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
        res.setEmail(user.getEmail());
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

    /** パスワード忘れ（メール送信） */
    @PostMapping("/api/v1/auth/forgot-password")
    public ResponseEntity<Void> forgotPassword(@RequestParam String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        // ユーザーがいなくても OK を返す（メールアドレス存在確認を防ぐ）
        if (user == null) {
            return ResponseEntity.ok().build();
        }

        // 既存の未使用トークンを無効化
        // 32バイトのランダムトークンを生成
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = HexFormat.of().formatHex(tokenBytes);

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUsername(user.getUsername());
        resetToken.setToken(token);
        resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        resetToken.setUsed(false);
        resetToken.setCreatedAt(LocalDateTime.now());
        tokenRepository.save(resetToken);

        String resetLink = baseUrl + "/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(email, resetLink);
        return ResponseEntity.ok().build();
    }

    /** パスワードリセット（トークン検証＋更新） */
    @PostMapping("/api/v1/auth/reset-password")
    public ResponseEntity<Void> resetPassword(
            @RequestParam String token,
            @RequestParam String newPassword) {
        PasswordResetToken stored = tokenRepository.findByToken(token).orElse(null);
        if (stored == null || stored.isUsed() || stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        stored.setUsed(true);
        tokenRepository.save(stored);

        User user = userRepository.findByUsername(stored.getUsername()).orElseThrow();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    /** パスワード変更（ログイン中） */
    @PutMapping("/api/v1/auth/password")
    public ResponseEntity<Void> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }
}
