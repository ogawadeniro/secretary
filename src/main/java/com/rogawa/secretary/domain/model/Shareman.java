package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
import lombok.Data;

/** シェアメン関係（招待・承諾ベース） */
@Data
public class Shareman {
    private Long id;
    private String inviterUsername;
    private String inviteeUsername;
    private String status; // PENDING / ACCEPTED
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
