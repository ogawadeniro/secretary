package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.User;
import java.util.List;
import java.util.Optional;

public interface UserRepository {
    Optional<User> findByUsername(String username);

    /** ユーザー名で部分一致検索（共有追加用） */
    List<User> searchByUsername(String query);

    User save(User user);
}
