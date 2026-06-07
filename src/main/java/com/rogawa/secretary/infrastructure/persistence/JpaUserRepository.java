package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaUserRepository extends JpaRepository<JpaUser, Long> {

    Optional<JpaUser> findByUsername(String username);

    List<JpaUser> findByUsernameContainingIgnoreCase(String query);
}
