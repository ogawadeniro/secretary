package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ScheduleMember {
    private Long id;
    private Long scheduleId;
    private String username;
    private LocalDateTime createdAt;
}
