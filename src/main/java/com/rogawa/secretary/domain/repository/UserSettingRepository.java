package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.UserSetting;
import java.util.Optional;

public interface UserSettingRepository {
    Optional<UserSetting> findByUsername(String username);

    UserSetting save(UserSetting userSetting);

    void deleteById(Long id);
}
