package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaUserRepository extends JpaRepository<JpaUser, Long> {

    Optional<JpaUser> findByUsername(String username);

    Optional<JpaUser> findByEmail(String email);

    @Query("SELECT u FROM JpaUser u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<JpaUser> searchByUsernameOrDisplayName(@Param("query") String query);

    List<JpaUser> findByUsernameIn(List<String> usernames);
}
