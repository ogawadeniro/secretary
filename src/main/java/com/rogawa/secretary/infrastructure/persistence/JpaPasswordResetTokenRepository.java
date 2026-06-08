package com.rogawa.secretary.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaPasswordResetTokenRepository extends JpaRepository<JpaPasswordResetToken, Long> {

    Optional<JpaPasswordResetToken> findByToken(String token);
}
