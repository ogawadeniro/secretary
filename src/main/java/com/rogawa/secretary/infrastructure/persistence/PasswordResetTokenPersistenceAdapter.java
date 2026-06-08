package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.PasswordResetToken;
import com.rogawa.secretary.domain.repository.PasswordResetTokenRepository;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class PasswordResetTokenPersistenceAdapter implements PasswordResetTokenRepository {

    private final JpaPasswordResetTokenRepository jpaRepository;

    public PasswordResetTokenPersistenceAdapter(JpaPasswordResetTokenRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Optional<PasswordResetToken> findByToken(String token) {
        return jpaRepository.findByToken(token).map(JpaPasswordResetToken::toDomain);
    }

    @Override
    public PasswordResetToken save(PasswordResetToken token) {
        JpaPasswordResetToken entity = JpaPasswordResetToken.fromDomain(token);
        JpaPasswordResetToken saved = jpaRepository.save(entity);
        return saved.toDomain();
    }
}
