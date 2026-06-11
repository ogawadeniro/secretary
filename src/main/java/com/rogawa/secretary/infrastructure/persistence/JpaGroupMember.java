package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.GroupMember;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Data;

@Entity
@Data
@Table(name = "group_members")
public class JpaGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long groupId;

    private String username;

    private String role;

    private String status;

    private LocalDateTime createdAt;

    public static JpaGroupMember fromDomain(GroupMember member) {
        JpaGroupMember entity = new JpaGroupMember();
        entity.setId(member.getId());
        entity.setGroupId(member.getGroupId());
        entity.setUsername(member.getUsername());
        entity.setRole(member.getRole());
        entity.setStatus(member.getStatus());
        entity.setCreatedAt(member.getCreatedAt());
        return entity;
    }

    public GroupMember toDomain() {
        GroupMember member = new GroupMember();
        member.setId(this.id);
        member.setGroupId(this.groupId);
        member.setUsername(this.username);
        member.setRole(this.role);
        member.setStatus(this.status);
        member.setCreatedAt(this.createdAt);
        return member;
    }
}
