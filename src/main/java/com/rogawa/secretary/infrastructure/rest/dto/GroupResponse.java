package com.rogawa.secretary.infrastructure.rest.dto;

import com.rogawa.secretary.domain.model.Group;
import java.time.LocalDateTime;
import lombok.Data;

/** グループレスポンス */
@Data
public class GroupResponse {
    private Long id;
    private String name;
    private String ownerUsername;
    private LocalDateTime createdAt;

    public static GroupResponse fromDomain(Group group) {
        GroupResponse res = new GroupResponse();
        res.setId(group.getId());
        res.setName(group.getName());
        res.setOwnerUsername(group.getOwnerUsername());
        res.setCreatedAt(group.getCreatedAt());
        return res;
    }
}
