package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.ScheduleMember;
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
@Table(name = "schedule_members")
public class JpaScheduleMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "schedule_id", nullable = false)
    private Long scheduleId;

    @Column(nullable = false)
    private String username;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static JpaScheduleMember fromDomain(ScheduleMember member) {
        JpaScheduleMember entity = new JpaScheduleMember();
        entity.setId(member.getId());
        entity.setScheduleId(member.getScheduleId());
        entity.setUsername(member.getUsername());
        entity.setCreatedAt(member.getCreatedAt());
        return entity;
    }

    public ScheduleMember toDomain() {
        ScheduleMember member = new ScheduleMember();
        member.setId(this.id);
        member.setScheduleId(this.scheduleId);
        member.setUsername(this.username);
        member.setCreatedAt(this.createdAt);
        return member;
    }
}
