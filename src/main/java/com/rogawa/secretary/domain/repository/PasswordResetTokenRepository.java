package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.PasswordResetToken;
import java.util.Optional;

public interface PasswordResetTokenRepository {
    Optional<PasswordResetToken> findByToken(String token);

    PasswordResetToken save(PasswordResetToken token);
}
