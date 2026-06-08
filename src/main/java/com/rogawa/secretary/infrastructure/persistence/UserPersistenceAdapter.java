package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.User;
import com.rogawa.secretary.domain.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
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
    public Optional<User> findByEmail(String email) {
        return jpaUserRepository.findByEmail(email).map(JpaUser::toDomain);
    }

    @Override
    public List<User> searchByUsername(String query) {
        return jpaUserRepository.searchByUsernameOrDisplayName(query)
                .stream()
                .map(JpaUser::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<User> findByUsernames(List<String> usernames) {
        return jpaUserRepository.findByUsernameIn(usernames)
                .stream()
                .map(JpaUser::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public User save(User user) {
        JpaUser entity = JpaUser.fromDomain(user);
        JpaUser saved = jpaUserRepository.save(entity);
        return saved.toDomain();
    }
}
