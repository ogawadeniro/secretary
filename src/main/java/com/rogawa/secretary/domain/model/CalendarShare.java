package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CalendarShare {
    private Long id;
    private String ownerUsername;
    private String sharedWithUsername;
    private String permission;
    private LocalDateTime createdAt;
}
