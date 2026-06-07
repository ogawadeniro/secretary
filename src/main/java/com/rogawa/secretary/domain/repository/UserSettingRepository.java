package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.UserSetting;
import java.util.List;
import java.util.Optional;

public interface UserSettingRepository {
    Optional<UserSetting> findByUsername(String username);

    List<UserSetting> findByUsernameIn(List<String> usernames);

    UserSetting save(UserSetting userSetting);

    void deleteById(Long id);
}
