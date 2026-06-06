package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.UserSetting;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class UserSettingPersistenceAdapter implements UserSettingRepository {

    private final JpaUserSettingRepository jpaUserSettingRepository;

    public UserSettingPersistenceAdapter(JpaUserSettingRepository jpaUserSettingRepository) {
        this.jpaUserSettingRepository = jpaUserSettingRepository;
    }

    @Override
    public Optional<UserSetting> findByUsername(String username) {
        return jpaUserSettingRepository.findByUsername(username).map(JpaUserSetting::toDomain);
    }

    @Override
    public UserSetting save(UserSetting userSetting) {
        JpaUserSetting entity = JpaUserSetting.fromDomain(userSetting);
        JpaUserSetting saved = jpaUserSettingRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public void deleteById(Long id) {
        jpaUserSettingRepository.deleteById(id);
    }
}
