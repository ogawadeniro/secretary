package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.Shareman;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Data;

@Entity
@Data
@Table(name = "sharemen")
public class JpaShareman {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inviter_username")
    private String inviterUsername;

    @Column(name = "invitee_username")
    private String inviteeUsername;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public static JpaShareman fromDomain(Shareman shareman) {
        JpaShareman entity = new JpaShareman();
        entity.setId(shareman.getId());
        entity.setInviterUsername(shareman.getInviterUsername());
        entity.setInviteeUsername(shareman.getInviteeUsername());
        entity.setStatus(shareman.getStatus());
        entity.setCreatedAt(shareman.getCreatedAt());
        entity.setUpdatedAt(shareman.getUpdatedAt());
        return entity;
    }

    public Shareman toDomain() {
        Shareman shareman = new Shareman();
        shareman.setId(this.id);
        shareman.setInviterUsername(this.inviterUsername);
        shareman.setInviteeUsername(this.inviteeUsername);
        shareman.setStatus(this.status);
        shareman.setCreatedAt(this.createdAt);
        shareman.setUpdatedAt(this.updatedAt);
        return shareman;
    }
}
