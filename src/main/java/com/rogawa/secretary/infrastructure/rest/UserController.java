package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.infrastructure.rest.dto.AuthResponse;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** ユーザー名で部分一致検索（共有相手追加用） */
    @GetMapping("/api/v1/users/search")
    public ResponseEntity<List<AuthResponse>> searchUsers(
            @RequestParam("q") String query,
            Authentication authentication) {
        List<AuthResponse> users = userRepository.searchByUsername(query)
                .stream()
                .filter(u -> !u.getUsername().equals(authentication.getName()))
                .map(u -> new AuthResponse(u.getId(), u.getUsername(), u.getDisplayName()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }
}
