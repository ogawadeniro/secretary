package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.Schedule;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.Data;

@Entity
@Data
@Table(name = "schedules")
public class JpaSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String title;

    @NotNull
    private Boolean isAllDay;

    private LocalDateTime startDatetime;

    private LocalDateTime endDatetime;

    @NotBlank
    private String owner;

    @NotNull
    private String description;

    private LocalDateTime updateTime;

    /** 他のユーザーと共有するかどうか（デフォルト true） */
    private Boolean shared = true;

    public static JpaSchedule fromDomain(Schedule schedule) {
        JpaSchedule entity = new JpaSchedule();
        entity.setId(schedule.getId());
        entity.setTitle(schedule.getTitle());
        entity.setIsAllDay(schedule.getIsAllDay());
        entity.setStartDatetime(schedule.getStartDatetime());
        entity.setEndDatetime(schedule.getEndDatetime());
        entity.setOwner(schedule.getOwner());
        entity.setDescription(schedule.getDescription());
        entity.setUpdateTime(schedule.getUpdateTime());
        entity.setShared(schedule.getShared());
        return entity;
    }

    public Schedule toDomain() {
        Schedule schedule = new Schedule();
        schedule.setId(this.id);
        schedule.setTitle(this.title);
        schedule.setIsAllDay(this.isAllDay);
        schedule.setStartDatetime(this.startDatetime);
        schedule.setEndDatetime(this.endDatetime);
        schedule.setOwner(this.owner);
        schedule.setDescription(this.description);
        schedule.setUpdateTime(this.updateTime);
        schedule.setShared(this.shared);
        return schedule;
    }
}
