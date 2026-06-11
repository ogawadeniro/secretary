package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
import lombok.Data;

/** グループ */
@Data
public class Group {
    private Long id;
    private String name;
    private String ownerUsername;
    private String iconData;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
