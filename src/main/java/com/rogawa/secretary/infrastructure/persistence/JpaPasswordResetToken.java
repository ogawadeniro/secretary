package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.PasswordResetToken;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Data;

@Entity
@Data
@Table(name = "password_reset_tokens")
public class JpaPasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean used;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static JpaPasswordResetToken fromDomain(PasswordResetToken domain) {
        JpaPasswordResetToken entity = new JpaPasswordResetToken();
        entity.setId(domain.getId());
        entity.setUsername(domain.getUsername());
        entity.setToken(domain.getToken());
        entity.setExpiresAt(domain.getExpiresAt());
        entity.setUsed(domain.isUsed());
        entity.setCreatedAt(domain.getCreatedAt());
        return entity;
    }

    public PasswordResetToken toDomain() {
        PasswordResetToken domain = new PasswordResetToken();
        domain.setId(this.id);
        domain.setUsername(this.username);
        domain.setToken(this.token);
        domain.setExpiresAt(this.expiresAt);
        domain.setUsed(this.used);
        domain.setCreatedAt(this.createdAt);
        return domain;
    }
}
