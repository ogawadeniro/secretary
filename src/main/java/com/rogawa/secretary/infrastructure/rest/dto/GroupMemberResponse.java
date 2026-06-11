package com.rogawa.secretary.infrastructure.rest.dto;

import com.rogawa.secretary.domain.model.GroupMember;
import java.time.LocalDateTime;
import lombok.Data;

/** グループメンバーレスポンス */
@Data
public class GroupMemberResponse {
    private Long id;
    private Long groupId;
    private String username;
    private String displayName;
    private String role;
    private String status;
    private LocalDateTime createdAt;

    public static GroupMemberResponse fromDomain(GroupMember member, String displayName) {
        GroupMemberResponse res = new GroupMemberResponse();
        res.setId(member.getId());
        res.setGroupId(member.getGroupId());
        res.setUsername(member.getUsername());
        res.setDisplayName(displayName);
        res.setRole(member.getRole());
        res.setStatus(member.getStatus());
        res.setCreatedAt(member.getCreatedAt());
        return res;
    }
}
