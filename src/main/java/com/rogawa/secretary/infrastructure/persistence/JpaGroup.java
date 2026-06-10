package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.Group;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Data;

@Entity
@Data
@Table(name = "groups")
public class JpaGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String ownerUsername;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static JpaGroup fromDomain(Group group) {
        JpaGroup entity = new JpaGroup();
        entity.setId(group.getId());
        entity.setName(group.getName());
        entity.setOwnerUsername(group.getOwnerUsername());
        entity.setCreatedAt(group.getCreatedAt());
        entity.setUpdatedAt(group.getUpdatedAt());
        return entity;
    }

    public Group toDomain() {
        Group group = new Group();
        group.setId(this.id);
        group.setName(this.name);
        group.setOwnerUsername(this.ownerUsername);
        group.setCreatedAt(this.createdAt);
        group.setUpdatedAt(this.updatedAt);
        return group;
    }
}
