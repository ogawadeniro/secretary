package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.UserSetting;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
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
    public List<UserSetting> findByUsernameIn(List<String> usernames) {
        return jpaUserSettingRepository.findByUsernameIn(usernames)
                .stream()
                .map(JpaUserSetting::toDomain)
                .collect(Collectors.toList());
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
