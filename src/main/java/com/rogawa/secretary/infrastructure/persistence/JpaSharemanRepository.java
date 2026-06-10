package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaSharemanRepository extends JpaRepository<JpaShareman, Long> {

    List<JpaShareman> findByInviterUsernameOrderByCreatedAtDesc(String inviterUsername);

    List<JpaShareman> findByInviteeUsernameOrderByCreatedAtDesc(String inviteeUsername);

    Optional<JpaShareman> findByInviterUsernameAndInviteeUsername(
            String inviterUsername, String inviteeUsername);

    @Query("SELECT s.inviteeUsername FROM JpaShareman s "
            + "WHERE s.inviterUsername = :username AND s.status = 'ACCEPTED'")
    List<String> findAcceptedInviteeUsernames(@Param("username") String username);

    @Query("SELECT s.inviterUsername FROM JpaShareman s "
            + "WHERE s.inviteeUsername = :username AND s.status = 'ACCEPTED'")
    List<String> findAcceptedInviterUsernames(@Param("username") String username);
}
