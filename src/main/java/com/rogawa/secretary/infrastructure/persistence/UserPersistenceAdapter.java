package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.User;
import com.rogawa.secretary.domain.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class UserPersistenceAdapter implements UserRepository {

    private final JpaUserRepository jpaUserRepository;

    public UserPersistenceAdapter(JpaUserRepository jpaUserRepository) {
        this.jpaUserRepository = jpaUserRepository;
    }

    @Override
    public Optional<User> findByUsername(String username) {
        return jpaUserRepository.findByUsername(username).map(JpaUser::toDomain);
    }

    @Override
    public User save(User user) {
        JpaUser entity = JpaUser.fromDomain(user);
        JpaUser saved = jpaUserRepository.save(entity);
        return saved.toDomain();
    }
}
