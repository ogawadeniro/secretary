package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class PasswordResetToken {
    private Long id;
    private String username;
    private String token;
    private LocalDateTime expiresAt;
    private boolean used;
    private LocalDateTime createdAt;
}
