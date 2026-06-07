package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.domain.model.User;
import com.rogawa.secretary.domain.model.UserSetting;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import com.rogawa.secretary.infrastructure.rest.dto.AuthResponse;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;

    public UserController(UserRepository userRepository, UserSettingRepository userSettingRepository) {
        this.userRepository = userRepository;
        this.userSettingRepository = userSettingRepository;
    }

    /** ユーザー名で部分一致検索（共有相手追加用） */
    @GetMapping("/api/v1/users/search")
    public ResponseEntity<List<AuthResponse>> searchUsers(
            @RequestParam("q") String query,
            Authentication authentication) {
        List<User> users = userRepository.searchByUsername(query)
                .stream()
                .filter(u -> !u.getUsername().equals(authentication.getName()))
                .collect(Collectors.toList());

        Map<String, String> chipBgColorMap = loadChipBgColors(
                users.stream().map(User::getUsername).collect(Collectors.toList()));

        List<AuthResponse> result = users.stream()
                .map(u -> new AuthResponse(u.getId(), u.getUsername(), u.getDisplayName(), chipBgColorMap.get(u.getUsername())))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    private Map<String, String> loadChipBgColors(List<String> usernames) {
        if (usernames.isEmpty()) return Map.of();
        return userSettingRepository.findByUsernameIn(usernames).stream()
                .collect(Collectors.toMap(UserSetting::getUsername, UserSetting::getChipBgColor, (a, b) -> a));
    }
}
