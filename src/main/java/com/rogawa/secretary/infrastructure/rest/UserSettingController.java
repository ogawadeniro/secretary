package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.domain.model.UserSetting;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserSettingController {

    private final UserSettingRepository userSettingRepository;
    private final UserRepository userRepository;

    public UserSettingController(
            UserSettingRepository userSettingRepository,
            UserRepository userRepository) {
        this.userSettingRepository = userSettingRepository;
        this.userRepository = userRepository;
    }

    /** 現在のユーザーの設定を取得（なければデフォルト値を返す） */
    @GetMapping("/api/v1/settings")
    public ResponseEntity<UserSettingDto> getSettings(Authentication authentication) {
        String username = authentication.getName();
        UserSetting setting = userSettingRepository.findByUsername(username)
                .orElseGet(() -> createDefaultSetting());
        UserSettingDto dto = UserSettingDto.fromDomain(setting);
        userRepository.findByUsername(username)
                .ifPresent(u -> dto.setDisplayName(u.getDisplayName()));
        return ResponseEntity.ok(dto);
    }

    /** 設定を作成または更新 */
    @PutMapping("/api/v1/settings")
    public ResponseEntity<UserSettingDto> updateSettings(
            @RequestBody UserSettingDto request,
            Authentication authentication) {
        String username = authentication.getName();

        // 表示名の更新
        if (request.getDisplayName() != null) {
            userRepository.findByUsername(username).ifPresent(u -> {
                u.setDisplayName(request.getDisplayName());
                userRepository.save(u);
            });
        }

        UserSetting setting = userSettingRepository.findByUsername(username)
                .orElseGet(() -> {
                    UserSetting s = new UserSetting();
                    s.setUsername(username);
                    return s;
                });

        if (request.getChipBgColor() != null) {
            setting.setChipBgColor(request.getChipBgColor());
        }
        if (request.getFirstDayOfWeek() != null) {
            setting.setFirstDayOfWeek(request.getFirstDayOfWeek());
        }

        UserSetting saved = userSettingRepository.save(setting);
        UserSettingDto dto = UserSettingDto.fromDomain(saved);
        userRepository.findByUsername(username)
                .ifPresent(u -> dto.setDisplayName(u.getDisplayName()));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /** 設定を削除してデフォルトに戻す */
    @DeleteMapping("/api/v1/settings")
    public ResponseEntity<UserSettingDto> resetSettings(Authentication authentication) {
        String username = authentication.getName();
        userSettingRepository.findByUsername(username).ifPresent(s -> {
            userSettingRepository.deleteById(s.getId());
        });
        UserSettingDto dto = UserSettingDto.fromDomain(createDefaultSetting());
        userRepository.findByUsername(username)
                .ifPresent(u -> dto.setDisplayName(u.getDisplayName()));
        return ResponseEntity.ok(dto);
    }

    private UserSetting createDefaultSetting() {
        UserSetting setting = new UserSetting();
        setting.setChipBgColor("#4a90d9");
        setting.setFirstDayOfWeek(0);
        return setting;
    }
}
