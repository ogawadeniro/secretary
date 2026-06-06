package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.User;
import java.util.Optional;

public interface UserRepository {
    Optional<User> findByUsername(String username);

    User save(User user);
}
