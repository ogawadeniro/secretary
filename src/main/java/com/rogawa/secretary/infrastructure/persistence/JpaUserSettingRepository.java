package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaUserSettingRepository extends JpaRepository<JpaUserSetting, Long> {

    Optional<JpaUserSetting> findByUsername(String username);

    List<JpaUserSetting> findByUsernameIn(List<String> usernames);
}
