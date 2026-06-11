package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
import lombok.Data;

/** グループメンバー */
@Data
public class GroupMember {
    private Long id;
    private Long groupId;
    private String username;
    private String role; // OWNER / MEMBER
    private String status; // INVITED / ACCEPTED
    private LocalDateTime createdAt;
}
