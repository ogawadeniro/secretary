package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.CalendarShare;
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
@Table(name = "calendar_shares")
public class JpaCalendarShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_username", nullable = false)
    private String ownerUsername;

    @Column(name = "shared_with_username", nullable = false)
    private String sharedWithUsername;

    @Column(nullable = false)
    private String permission;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static JpaCalendarShare fromDomain(CalendarShare share) {
        JpaCalendarShare entity = new JpaCalendarShare();
        entity.setId(share.getId());
        entity.setOwnerUsername(share.getOwnerUsername());
        entity.setSharedWithUsername(share.getSharedWithUsername());
        entity.setPermission(share.getPermission());
        entity.setCreatedAt(share.getCreatedAt());
        return entity;
    }

    public CalendarShare toDomain() {
        CalendarShare share = new CalendarShare();
        share.setId(this.id);
        share.setOwnerUsername(this.ownerUsername);
        share.setSharedWithUsername(this.sharedWithUsername);
        share.setPermission(this.permission);
        share.setCreatedAt(this.createdAt);
        return share;
    }
}
